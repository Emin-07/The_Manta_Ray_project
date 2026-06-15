import { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { AppContext } from "../context/AppContext.js";
import { ROLES, JOB_TITLES, PAY_TYPES, STORE_STATUSES, STORE_STATUS_LABELS, ORDER_SOURCES, ATTENDANCE_TYPES, ATTENDANCE_TYPE_COLORS, BATCH_STATUSES, DEFECT_REASONS, PAYROLL_STATUSES, CATEGORIES, UNITS, STATUSES, TASK_STATUSES, RAW_CATEGORIES, RAW_UNITS, NOTIF_TYPES, MARK_TYPES, PLAN_STATUSES, ORDER_STATUSES, ORDER_PRIORITIES, BOARD_COLUMNS, MOVEMENT_TYPES, DEBT_STATUSES, CAMERA_SOURCE_TYPES, CAMERA_SOURCE_LABELS, CAMERA_ZONES } from "../constants/index.js";
import { fmtDate, fmtShort, fmtTime, daysBetween, relTime } from "../utils/dates.js";
import { C, CC } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { EthnicBorder, EthnicCorner, Badge, Btn, Inp, Sel, Txa, Modal, Confirm, Stat, Toast, TH, TD, Card, Title, PageH, SearchBox } from "../components/ui/index.jsx";

// MARKS PAGE
const MarksPage = ()=>{
  const {marks,setMarks,users,productionOutputs,currentUser,addLog,applyServerState}=useContext(AppContext);
  const [modal,setModal]=useState(false);
  const [confirm,setConfirm]=useState(null);
  const [toast,setToast]=useState(null);
  const [search,setSearch]=useState("");
  const [fDate,setFDate]=useState(()=>new Date().toISOString().slice(0,10));
  const [fType,setFType]=useState("all");
  const [fEmployee,setFEmployee]=useState("all");
  const [errs,setErrs]=useState({});
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isAdmin=role?.name==="admin"||role?.name==="owner";
  const isManager=role?.name==="manager";
  const isWorker=role?.name==="worker";
  const canManage=isAdmin||isManager;

  const workers=users.filter(u=>u.status==="active");
  const todayStr=new Date().toISOString().slice(0,10);

  const emptyForm={employeeId:isWorker?currentUser.id:(workers[0]?.id||""),type:"приход",time:new Date().toISOString().slice(0,16),reason:"",comment:""};
  const [form,setForm]=useState(emptyForm);

  // Records for selected date
  const dateMarks=useMemo(()=>{
    let l=isWorker?marks.filter(m=>m.employeeId===currentUser.id):marks;
    l=l.filter(m=>(m.time||m.createdAt||"").slice(0,10)===fDate);
    if(fType!=="all") l=l.filter(m=>m.type===fType||m.markType===fType);
    if(search){const s=search.toLowerCase();l=l.filter(m=>{const emp=users.find(u=>u.id===m.employeeId);return emp?.name.toLowerCase().includes(s)||m.comment?.toLowerCase().includes(s)});}
    return l.sort((a,b)=>new Date(a.time||a.createdAt)-new Date(b.time||b.createdAt));
  },[marks,fDate,fType,search,isWorker,currentUser]);

  // Today's attendance status per worker
  const todayByWorker=useMemo(()=>{
    const today=marks.filter(m=>(m.time||m.createdAt||"").slice(0,10)===todayStr);
    const byW={};
    workers.forEach(w=>{
      const wm=today.filter(m=>m.employeeId===w.id);
      const arrived=wm.find(m=>m.type==="приход"||m.markType==="присутствие");
      const left=wm.find(m=>m.type==="уход");
      const late=wm.find(m=>m.type==="опоздание");
      const absent=wm.find(m=>m.type==="отсутствие");
      byW[w.id]={arrived,left,late,absent,produced:(productionOutputs||[]).filter(o=>o.employeeId===w.id&&(o.date||"").slice(0,10)===todayStr).reduce((s,o)=>s+o.quantity,0)};
    });
    return byW;
  },[marks,workers,todayStr,productionOutputs]);

  const postAttendance=async(employeeId,type,extra={})=>{
    try{
      const r=await fetch("/api/actions/attendance-mark",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({employeeId,type,...extra}),
      });
      if(!r.ok){
        const err=await r.json().catch(()=>({}));
        setToast({message:err.error||"Не удалось отметить",type:"error"});
        return false;
      }
      const data=await r.json();
      if(data.state)applyServerState(data.state);
      return true;
    }catch(e){
      setToast({message:"Нет связи с сервером",type:"error"});
      return false;
    }
  };

  const markSelf=async(type)=>{
    if(await postAttendance(currentUser.id,type)){
      setToast({message:`${type} отмечен`,type:"success"});
    }
  };

  const quickMark=async(wId,type)=>{
    const empName=users.find(u=>u.id===wId)?.name?.split(" ")[0]||"";
    if(await postAttendance(wId,type)){
      setToast({message:`${empName} — ${type}`,type:"success"});
    }
  };

  const saveModal=()=>{
    const e={};if(!form.employeeId)e.employeeId="!";if(!form.type)e.type="!";
    setErrs(e);if(Object.keys(e).length)return;
    const now=new Date().toISOString();
    setMarks(p=>[...p,{id:Date.now(),employeeId:+form.employeeId,type:form.type,time:form.time?new Date(form.time).toISOString():now,reason:form.reason,comment:form.comment,createdBy:currentUser.id,createdAt:now}]);
    const empName=users.find(u=>u.id===+form.employeeId)?.name?.split(" ")[0]||"";
    addLog(`${form.type}: ${empName} (${form.comment||"—"})`);
    setToast({message:"Отметка добавлена",type:"success"});setModal(false);
  };

  const delMark=m=>{setConfirm({title:"Удалить отметку?",message:"Это действие нельзя отменить",onConfirm:()=>{setMarks(p=>p.filter(x=>x.id!==m.id));setToast({message:"Удалено",type:"error"});setConfirm(null)}})};

  return(
    <div>
      <PageH title="Посещаемость / Смена">
        <input type="date" value={fDate} onChange={e=>setFDate(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}/>
        <select value={fType} onChange={e=>setFType(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}>
          <option value="all">Все типы</option>
          {ATTENDANCE_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
        </select>
        {canManage&&<Btn onClick={()=>{setForm(emptyForm);setErrs({});setModal(true)}} icon={<I.plus size={15}/>}>Добавить</Btn>}
      </PageH>

      {/* Worker self-service */}
      {isWorker&&fDate===todayStr&&(
        <Card s={{marginBottom:16,padding:"14px 16px"}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Моя смена сегодня</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {!todayByWorker[currentUser.id]?.arrived&&!todayByWorker[currentUser.id]?.absent&&(
              <button onClick={()=>markSelf("приход")} style={{padding:"10px 20px",borderRadius:8,border:`1px solid ${C.success}40`,background:`${C.success}15`,color:C.success,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>✅ Отметить приход</button>
            )}
            {todayByWorker[currentUser.id]?.arrived&&!todayByWorker[currentUser.id]?.left&&(
              <button onClick={()=>markSelf("уход")} style={{padding:"10px 20px",borderRadius:8,border:`1px solid ${C.info}40`,background:`${C.info}15`,color:C.info,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>🚪 Отметить уход</button>
            )}
            {todayByWorker[currentUser.id]?.arrived&&<div style={{padding:"10px 14px",borderRadius:8,background:`${C.success}10`,border:`1px solid ${C.success}30`,fontSize:12,color:C.success}}>✓ Пришёл в {fmtTime(todayByWorker[currentUser.id].arrived.time)}</div>}
            {todayByWorker[currentUser.id]?.left&&<div style={{padding:"10px 14px",borderRadius:8,background:`${C.info}10`,border:`1px solid ${C.info}30`,fontSize:12,color:C.info}}>🚪 Ушёл в {fmtTime(todayByWorker[currentUser.id].left.time)}</div>}
          </div>
        </Card>
      )}

      {/* Manager today overview */}
      {canManage&&fDate===todayStr&&(
        <Card s={{marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:12}}>Сводка на сегодня — {fmtShort(todayStr)}</div>
          <div style={{display:"grid",gap:6}}>
            {workers.map(w=>{
              const ws=todayByWorker[w.id]||{};
              const status=ws.absent?"отсутствует":ws.arrived?ws.left?"завершил смену":"на смене":"не отмечен";
              const statusColor=ws.absent?C.danger:ws.arrived?ws.left?C.info:C.success:C.dim;
              return(
                <div key={w.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 10px",borderRadius:8,background:C.surface2,border:`1px solid ${C.border}`}}>
                  <div style={{width:32,height:32,borderRadius:8,background:`${statusColor}20`,color:statusColor,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>{w.name.charAt(0)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.text}}>{w.name.split(" ").slice(0,2).join(" ")}</div>
                    <div style={{fontSize:11,color:C.dim}}>{w.jobTitle||ROLES.find(r=>r.id===w.roleId)?.label}</div>
                  </div>
                  <div style={{fontSize:12,color:statusColor,fontWeight:600,minWidth:90,textAlign:"right"}}>{status}</div>
                  {ws.arrived&&<div style={{fontSize:11,color:C.dim,whiteSpace:"nowrap"}}>↑{fmtTime(ws.arrived.time)}{ws.left?` ↓${fmtTime(ws.left.time)}`:""}</div>}
                  {ws.produced>0&&<Badge color="success" s={{fontSize:10}}>{ws.produced} ед.</Badge>}
                  {!ws.arrived&&!ws.absent&&(
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>quickMark(w.id,"приход")} style={{fontSize:11,padding:"3px 8px",borderRadius:5,border:`1px solid ${C.success}40`,background:`${C.success}10`,color:C.success,cursor:"pointer",fontFamily:"inherit"}}>↑Пришёл</button>
                      <button onClick={()=>quickMark(w.id,"отсутствие")} style={{fontSize:11,padding:"3px 8px",borderRadius:5,border:`1px solid ${C.danger}40`,background:`${C.danger}10`,color:C.danger,cursor:"pointer",fontFamily:"inherit"}}>Нет</button>
                    </div>
                  )}
                  {ws.arrived&&!ws.left&&<button onClick={()=>quickMark(w.id,"уход")} style={{fontSize:11,padding:"3px 8px",borderRadius:5,border:`1px solid ${C.info}40`,background:`${C.info}10`,color:C.info,cursor:"pointer",fontFamily:"inherit"}}>↓Ушёл</button>}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Records table */}
      <Card s={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><TH>Время</TH><TH>Сотрудник</TH><TH>Событие</TH><TH>Причина</TH><TH>Комментарий</TH>{canManage&&<TH></TH>}</tr></thead>
          <tbody>{dateMarks.map(m=>{
            const emp=users.find(u=>u.id===m.employeeId);
            const type=m.type||m.markType||"—";
            const typeClr=ATTENDANCE_TYPE_COLORS[type]||"info";
            return(
              <tr key={m.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <TD s={{fontSize:12,whiteSpace:"nowrap",color:C.muted}}>{fmtTime(m.time||m.createdAt)}</TD>
                <TD s={{fontWeight:500}}>{emp?.name?.split(" ").slice(0,2).join(" ")||"—"}</TD>
                <TD><Badge color={typeClr}>{type}</Badge></TD>
                <TD s={{fontSize:12,color:C.muted}}>{m.reason||"—"}</TD>
                <TD s={{fontSize:12,color:C.dim,maxWidth:180}}>{m.comment||"—"}</TD>
                {canManage&&<TD><Btn v="ghost" sz="sm" onClick={()=>delMark(m)} icon={<I.trash size={13}/>}/></TD>}
              </tr>
            );
          })}
          {dateMarks.length===0&&<tr><td colSpan={6} style={{textAlign:"center",padding:40,color:C.dim,fontSize:13}}>Нет отметок за {fmtShort(fDate)}</td></tr>}
          </tbody>
        </table>
      </div></Card>

      <Modal open={modal} onClose={()=>setModal(false)} title="Добавить отметку" width={440}>
        <Sel label="Сотрудник" value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})} error={errs.employeeId} options={[{value:"",label:"Выберите"},...workers.map(w=>({value:w.id,label:w.name.split(" ").slice(0,2).join(" ")}))]}/>
        <Sel label="Событие" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={ATTENDANCE_TYPES.map(t=>({value:t,label:t}))}/>
        <Inp label="Время (факт)" type="datetime-local" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/>
        {(form.type==="опоздание"||form.type==="отсутствие")&&<Inp label="Причина" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} placeholder="Болезнь, семейные обстоятельства..."/>}
        <Txa label="Комментарий" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn><Btn onClick={saveModal}>Добавить</Btn></div>
      </Modal>
      {confirm&&<Confirm open onClose={()=>setConfirm(null)} {...confirm}/>}
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};


export { MarksPage };
