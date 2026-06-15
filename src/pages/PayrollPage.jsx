import { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { AppContext } from "../context/AppContext.js";
import { ROLES, JOB_TITLES, PAY_TYPES, STORE_STATUSES, STORE_STATUS_LABELS, ORDER_SOURCES, ATTENDANCE_TYPES, ATTENDANCE_TYPE_COLORS, BATCH_STATUSES, DEFECT_REASONS, PAYROLL_STATUSES, CATEGORIES, UNITS, STATUSES, TASK_STATUSES, RAW_CATEGORIES, RAW_UNITS, NOTIF_TYPES, MARK_TYPES, PLAN_STATUSES, ORDER_STATUSES, ORDER_PRIORITIES, BOARD_COLUMNS, MOVEMENT_TYPES, DEBT_STATUSES, CAMERA_SOURCE_TYPES, CAMERA_SOURCE_LABELS, CAMERA_ZONES } from "../constants/index.js";
import { fmtDate, fmtShort, fmtTime, daysBetween, relTime } from "../utils/dates.js";
import { C, CC } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { EthnicBorder, EthnicCorner, Badge, Btn, Inp, Sel, Txa, Modal, Confirm, Stat, Toast, TH, TD, Card, Title, PageH, SearchBox } from "../components/ui/index.jsx";

// PAYROLL PAGE — Расчёт оплаты
const PayrollPage = ()=>{
  const {users,productionOutputs,employeeHistory,baseSalaries,setBaseSalaries,payrollRecords,setPayrollRecords,currentUser,addLog,tasks,taskEmployees}=useContext(AppContext);
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isAdmin=role?.name==="admin"||role?.name==="owner";

  const getMonday=(date)=>{const d=new Date(date);d.setDate(d.getDate()-d.getDay()+1);return d.toISOString().slice(0,10);};
  const [week,setWeek]=useState(()=>getMonday(new Date()));
  const [statusModal,setStatusModal]=useState(null);
  const [toast,setToast]=useState(null);
  const [baseModal,setBaseModal]=useState(null);
  const [baseFrm,setBaseFrm]=useState({amount:""});

  const weekStart=new Date(week+"T00:00:00");
  const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+6);
  const weekEndStr=weekEnd.toISOString().slice(0,10);
  const weekDays=Array.from({length:7},(_,i)=>{const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);return d.toISOString().slice(0,10);});

  const prevWeek=()=>{const d=new Date(week);d.setDate(d.getDate()-7);setWeek(d.toISOString().slice(0,10));};
  const nextWeek=()=>{const d=new Date(week);d.setDate(d.getDate()+7);setWeek(d.toISOString().slice(0,10));};

  const workers=users.filter(u=>u.status==="active"&&u.roleId!==4);

  const workerStats=useMemo(()=>{
    return workers.map(w=>{
      const outputs=(productionOutputs||[]).filter(o=>o.employeeId===w.id&&o.date.slice(0,10)>=week&&o.date.slice(0,10)<=weekEndStr);
      // Backward compat: old completed tasks that predate the single-output-per-task fix.
      // Key: "taskId:employeeId" — so a partially-covered task (only some workers have outputs)
      // still falls back correctly for the uncovered workers.
      const coveredPairs=new Set((productionOutputs||[]).filter(o=>o.taskId).map(o=>`${o.taskId}:${o.employeeId}`));
      const legacyUnits=tasks.filter(t=>
        t.status==="завершено"&&
        t.completedAt&&t.completedAt.slice(0,10)>=week&&t.completedAt.slice(0,10)<=weekEndStr&&
        (t.userIds||[]).includes(w.id)&&
        !coveredPairs.has(`${t.id}:${w.id}`)
      ).reduce((s,t)=>{
        const te=taskEmployees.find(te=>te.taskId===t.id&&te.employeeId===w.id);
        return s+(te?.producedQty||0);
      },0);
      const hist=(employeeHistory||[]).filter(h=>h.employeeId===w.id&&weekDays.includes(h.date));
      const daysWorked=hist.filter(h=>h.attendance==="present"||h.attendance==="late"||h.producedQty>0).length;
      const totalUnits=outputs.reduce((s,o)=>s+o.quantity,0)+legacyUnits;

      const baseMonthly=baseSalaries[w.id]||0;
      const pieceRate=w.pieceRate||0;
      const fixedDayRate=w.fixedDayRate||0;   // ₽/день (денежная ставка)
      const normPerDay=w.dailyNorm||0;         // ед./день (производственная норма)
      const weeklyNorm=normPerDay*5;           // норма за рабочую неделю (5 дней)

      let piecePay=0,basePay=0;
      if(w.payType==="сдельная"){
        piecePay=pieceRate*totalUnits;
      } else if(w.payType==="фиксированная"){
        basePay=baseMonthly>0?Math.round(baseMonthly/4.33):fixedDayRate*daysWorked;
      } else {
        basePay=fixedDayRate*daysWorked;
        piecePay=pieceRate*totalUnits;
      }
      const total=+(basePay+piecePay).toFixed(2);

      // Норма выполнена? (для сдельщиков — по выработке, для остальных — по дням)
      const normMet=w.payType==="сдельная"
        ?(weeklyNorm===0||totalUnits>=weeklyNorm)
        :(daysWorked>=5);
      const normShortfall=w.payType==="сдельная"?Math.max(0,weeklyNorm-totalUnits):0;

      const rec=(payrollRecords||[]).find(r=>r.employeeId===w.id&&r.weekStart===week)||{
        id:null,employeeId:w.id,weekStart:week,basePay,piecePay,total,status:total>0?"начислено":"—",comment:""
      };
      return{w,daysWorked,totalUnits,basePay,piecePay,total,rec,weeklyNorm,normMet,normShortfall};
    });
  },[workers,productionOutputs,employeeHistory,baseSalaries,payrollRecords,week,weekEndStr]);

  const payStatusColor=s=>{
    if(s==="подтверждено к выплате")return"primary";
    if(s==="причина подтверждена")return"success";
    if(s==="удержано")return"danger";
    if(s==="перенесено")return"orange";
    return"info";
  };

  const setStatus=(emp,rec,status,comment)=>{
    const now=new Date().toISOString();
    if(rec.id){
      setPayrollRecords(p=>p.map(r=>r.id===rec.id?{...r,status,comment,updatedBy:currentUser.id,updatedAt:now}:r));
    } else {
      setPayrollRecords(p=>[...(p||[]),{id:Date.now(),employeeId:emp.id,weekStart:week,basePay:rec.basePay,piecePay:rec.piecePay,total:rec.total,status,comment,createdBy:currentUser.id,createdAt:now}]);
    }
    addLog(`Расчёт: ${emp.name.split(" ")[0]} — ${status}`);
    setToast({message:"Статус обновлён",type:"success"});
    setStatusModal(null);
  };

  const saveBase=()=>{
    if(!baseModal) return;
    const sal=+baseFrm.amount;
    if(sal>0) setBaseSalaries(p=>({...p,[baseModal.id]:sal}));
    else setBaseSalaries(p=>{const n={...p};delete n[baseModal.id];return n;});
    addLog(`Ставка: ${baseModal.name.split(" ")[0]} — ${sal}₽/мес`);
    setToast({message:"Ставка обновлена",type:"success"});
    setBaseModal(null);
  };

  const totalAll=workerStats.reduce((s,ws)=>s+ws.total,0);
  const weekLabel=`${fmtShort(week)} — ${fmtShort(weekEndStr)}`;
  const confirmed=workerStats.filter(ws=>ws.rec.status==="подтверждено к выплате").reduce((s,ws)=>s+ws.total,0);

  return(
    <div>
      <PageH title="Расчёт оплаты">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={prevWeek} style={{padding:"6px 10px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,cursor:"pointer",fontFamily:"inherit",fontSize:15,lineHeight:1}}>‹</button>
          <span style={{fontSize:13,fontWeight:600,color:C.text,minWidth:170,textAlign:"center"}}>{weekLabel}</span>
          <button onClick={nextWeek} style={{padding:"6px 10px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,cursor:"pointer",fontFamily:"inherit",fontSize:15,lineHeight:1}}>›</button>
        </div>
        <button onClick={()=>setWeek(getMonday(new Date()))} style={{padding:"6px 10px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.dim,cursor:"pointer",fontFamily:"inherit",fontSize:12}}>Тек. неделя</button>
      </PageH>

      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:16}}>
        <Stat icon={<I.chart size={18}/>} label="К выплате (неделя)" value={totalAll.toLocaleString("ru")+"₽"} color={C.primary}/>
        <Stat icon={<I.check size={18}/>} label="Подтверждено" value={confirmed.toLocaleString("ru")+"₽"} color={C.success}/>
        <Stat icon={<I.people size={18}/>} label="Сотрудников" value={workers.length} color={C.info}/>
      </div>

      <div style={{display:"grid",gap:10}}>
        {workerStats.map(({w,daysWorked,totalUnits,basePay,piecePay,total,rec,weeklyNorm,normMet,normShortfall})=>{
          const clr=payStatusColor(rec.status);
          const borderClr=!normMet&&total>0?C.orange:C[clr];
          return(
            <Card key={w.id} s={{borderLeft:`3px solid ${borderClr}`}}>
              <div style={{display:"flex",flexWrap:"wrap",gap:14,alignItems:"center"}}>
                <div style={{flex:"1 1 180px"}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{w.name}</div>
                  <div style={{fontSize:11,color:C.dim}}>{w.jobTitle||"—"} · {w.payType||"—"}</div>
                  {weeklyNorm>0&&(
                    <div style={{fontSize:10,marginTop:2}}>
                      <span style={{color:C.dim}}>Норма: </span>
                      <span style={{color:normMet?C.success:C.orange,fontWeight:700}}>{totalUnits}</span>
                      <span style={{color:C.dim}}>/{weeklyNorm} ед.</span>
                      {!normMet&&normShortfall>0&&<span style={{color:C.orange,fontWeight:600}}> (−{normShortfall})</span>}
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-end"}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:700,color:C.text}}>{daysWorked}</div>
                    <div style={{fontSize:10,color:C.dim}}>дней</div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:700,color:normMet||weeklyNorm===0?C.text:C.orange}}>{totalUnits}</div>
                    <div style={{fontSize:10,color:C.dim}}>единиц</div>
                  </div>
                  {basePay>0&&(
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:15,fontWeight:600,color:C.muted}}>{basePay.toLocaleString("ru")}₽</div>
                      <div style={{fontSize:10,color:C.dim}}>фикс</div>
                    </div>
                  )}
                  {piecePay>0&&(
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:15,fontWeight:600,color:C.muted}}>{piecePay.toLocaleString("ru")}₽</div>
                      <div style={{fontSize:10,color:C.dim}}>сдельно</div>
                    </div>
                  )}
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:22,fontWeight:800,color:total>0?C.success:C.dim}}>{total.toLocaleString("ru")}₽</div>
                    <div style={{fontSize:10,color:C.dim}}>итого</div>
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {!normMet&&weeklyNorm>0&&<Badge color="orange" s={{fontSize:10}}>норма не выполнена</Badge>}
                  <Badge color={clr} s={{fontSize:10}}>{rec.status}</Badge>
                  {isAdmin&&(
                    <div style={{display:"flex",gap:4}}>
                      <Btn v="ghost" sz="sm" onClick={()=>setStatusModal({rec,emp:w})} icon={<I.clip size={13}/>}/>
                      <Btn v="ghost" sz="sm" onClick={()=>{setBaseModal(w);setBaseFrm({amount:baseSalaries[w.id]||""});}} icon={<I.edit size={13}/>}/>
                    </div>
                  )}
                </div>
              </div>
              {rec.comment&&<div style={{marginTop:6,fontSize:11,color:C.dim,fontStyle:"italic",paddingTop:6,borderTop:`1px solid ${C.border}`}}>{rec.comment}</div>}
            </Card>
          );
        })}
        {workerStats.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim}}>Нет активных сотрудников</div>}
      </div>

      <Modal open={!!statusModal} onClose={()=>setStatusModal(null)} title="Статус выплаты" width={380}>
        {statusModal&&(
          <div>
            <div style={{marginBottom:12,padding:"10px 14px",background:C.surface2,borderRadius:8}}>
              <div style={{fontWeight:700,color:C.text}}>{statusModal.emp.name}</div>
              <div style={{fontSize:12,color:C.muted}}>Итого: <strong style={{color:C.success}}>{statusModal.rec.total.toLocaleString("ru")}₽</strong> · неделя {week}</div>
            </div>
            <div style={{display:"grid",gap:6,marginBottom:12}}>
              {PAYROLL_STATUSES.map(s=>{
                const active=statusModal.rec.status===s;
                const c=payStatusColor(s);
                return(
                  <button key={s} onClick={()=>{
                    const comment=statusModal.rec.comment||"";
                    setStatus(statusModal.emp,statusModal.rec,s,comment);
                  }} style={{padding:"10px 14px",background:active?`${C[c]}20`:C.bg,border:`1px solid ${active?C[c]:C.border}`,borderRadius:8,color:active?C[c]:C.muted,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:active?700:400,textAlign:"left"}}>
                    {s}
                  </button>
                );
              })}
            </div>
            <Txa label="Комментарий" value={statusModal.rec.comment||""} onChange={e=>setStatusModal(m=>({...m,rec:{...m.rec,comment:e.target.value}}))} placeholder="Примечание..."/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
              <Btn v="secondary" onClick={()=>setStatusModal(null)}>Закрыть</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!baseModal} onClose={()=>setBaseModal(null)} title="Базовая ставка (₽/мес)" width={360}>
        {baseModal&&(
          <div>
            <div style={{marginBottom:10,fontSize:13,color:C.muted}}>Сотрудник: <strong style={{color:C.text}}>{baseModal.name}</strong></div>
            <Inp label="Сумма (₽/месяц)" type="number" min="0" value={baseFrm.amount} onChange={e=>setBaseFrm({amount:e.target.value})} placeholder="0 = не задана"/>
            <div style={{fontSize:11,color:C.dim,marginTop:4}}>Для расчёта недели делится на 4.33. При сдельной оплате не используется.</div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}>
              <Btn v="secondary" onClick={()=>setBaseModal(null)}>Отмена</Btn>
              <Btn onClick={saveBase}>Сохранить</Btn>
            </div>
          </div>
        )}
      </Modal>

      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};


export { PayrollPage };
