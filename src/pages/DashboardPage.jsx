import { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { AppContext } from "../context/AppContext.js";
import { ROLES, JOB_TITLES, PAY_TYPES, STORE_STATUSES, STORE_STATUS_LABELS, ORDER_SOURCES, ATTENDANCE_TYPES, ATTENDANCE_TYPE_COLORS, BATCH_STATUSES, DEFECT_REASONS, PAYROLL_STATUSES, CATEGORIES, UNITS, STATUSES, TASK_STATUSES, RAW_CATEGORIES, RAW_UNITS, NOTIF_TYPES, MARK_TYPES, PLAN_STATUSES, ORDER_STATUSES, ORDER_PRIORITIES, BOARD_COLUMNS, MOVEMENT_TYPES, DEBT_STATUSES, CAMERA_SOURCE_TYPES, CAMERA_SOURCE_LABELS, CAMERA_ZONES } from "../constants/index.js";
import { fmtDate, fmtShort, fmtTime, daysBetween, relTime } from "../utils/dates.js";
import { C, CC } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { EthnicBorder, EthnicCorner, Badge, Btn, Inp, Sel, Txa, Modal, Confirm, Stat, Toast, TH, TD, Card, Title, PageH, SearchBox } from "../components/ui/index.jsx";

// DASHBOARD
const DashboardPage = ()=>{
  const {products,users,currentUser,tasks,rawMaterials,deliveries,notifications,marks,setMarks,taskEmployees,recipes,clientOrders,clients,sales,productionPlans,setPage,hiddenWarnings,setHiddenWarnings,productionOutputs,addLog,batches,debts,defects,applyServerState}=useContext(AppContext);
  const ap=products.filter(p=>!p.deleted);
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const canSeeFinance=role?.name!=="worker";
  const isWorker=role?.name==="worker";
  const isAdmin=role?.name==="admin"||role?.name==="owner";
  const isManager=role?.name==="manager";
  const todayStr=new Date().toISOString().slice(0,10);
  const [selectedWarns,setSelectedWarns]=useState(new Set());
  const [showHidden,setShowHidden]=useState(false);

  // Today's production
  const todayTasks=tasks.filter(t=>t.completedAt&&t.completedAt.startsWith(todayStr));
  const todayProduced=todayTasks.reduce((s,t)=>s+t.quantity,0);

  // Active workers
  const allWorkers=users.filter(u=>u.roleId===3&&u.status==="active");
  const busyWorkerIds=new Set();
  tasks.filter(t=>t.status==="в работе").forEach(t=>(t.userIds||[]).forEach(id=>busyWorkerIds.add(id)));
  const busyCount=busyWorkerIds.size;

  // Most active employee (by produced qty)
  const bestWorker=useMemo(()=>{
    const m={};taskEmployees.filter(te=>te.status==="завершено"||te.status==="просрочено").forEach(te=>{m[te.employeeId]=(m[te.employeeId]||0)+te.producedQty});
    (productionOutputs||[]).forEach(o=>{m[o.employeeId]=(m[o.employeeId]||0)+o.quantity});
    const entries=Object.entries(m).sort((a,b)=>b[1]-a[1]);
    if(!entries.length) return null;
    const w=users.find(u=>u.id===+entries[0][0]);
    return {name:w?.name?.split(" ").slice(0,2).join(" ")||"?",produced:entries[0][1]};
  },[taskEmployees,users]);

  // Low stock warnings
  const lowRaw=rawMaterials.filter(r=>r.stock<=r.minStock*1.5);
  const criticalRaw=rawMaterials.filter(r=>r.stock<=r.minStock);
  const lowProducts=ap.filter(p=>p.stock<20);

  // Overdue tasks
  const overdueTasks=tasks.filter(t=>!t.completedAt&&new Date()>new Date(t.deadline)&&t.status!=="завершено"&&t.status!=="просрочено");

  // Absent workers today — unified: new model type:"приход", legacy markType:"присутствие"
  const todayPresence=marks.filter(m=>(m.type==="приход"||m.markType==="присутствие")&&(m.time||m.createdAt||"").startsWith(todayStr)).map(m=>m.employeeId);
  const absentWorkers=allWorkers.filter(w=>!todayPresence.includes(w.id));

  // Forecasts
  const forecasts=useMemo(()=>{
    const completedTasks=tasks.filter(t=>t.status==="завершено"&&t.completedAt);
    if(!completedTasks.length) return [];
    const daysSpan=Math.max(1,Math.ceil((Date.now()-new Date(completedTasks[completedTasks.length-1]?.createdAt||Date.now()).getTime())/(1000*60*60*24)));
    // Product consumption rate
    const prodForecasts=ap.map(p=>{
      const produced=completedTasks.filter(t=>t.productId===p.id).reduce((s,t)=>s+t.quantity,0);
      const dailyRate=produced/daysSpan;
      const daysLeft=dailyRate>0?Math.floor(p.stock/dailyRate):999;
      return{name:p.name,stock:p.stock,unit:p.unit,dailyRate:+dailyRate.toFixed(1),daysLeft,type:"product"};
    }).filter(f=>f.daysLeft<30);
    // Raw material consumption
    const rawForecasts=rawMaterials.map(r=>{
      const totalUsed=tasks.filter(t=>t.status==="завершено").reduce((s,t)=>{
        const recipe=recipes.find(rc=>rc.productId===t.productId);
        const item=recipe?.items.find(it=>it.rawId===r.id);
        return s+(item?item.qty*t.quantity:0);
      },0);
      const dailyRate=totalUsed/daysSpan;
      const daysLeft=dailyRate>0?Math.floor(r.stock/dailyRate):999;
      return{name:r.name,stock:r.stock,unit:r.unit,dailyRate:+dailyRate.toFixed(2),daysLeft,type:"raw"};
    }).filter(f=>f.daysLeft<30);
    return [...prodForecasts,...rawForecasts].sort((a,b)=>a.daysLeft-b.daysLeft);
  },[ap,rawMaterials,tasks,recipes]);

  const totalValue=ap.reduce((s,p)=>s+p.stock*p.sellPrice,0);
  const activeTasks=tasks.filter(t=>t.status==="назначено"||t.status==="в работе").length;
  const unreadNotifs=notifications.filter(n=>(n.targetAll||n.targetUsers?.includes(currentUser.id))&&!n.readBy?.includes(currentUser.id)).length;

  // Charts
  const prodByDay=useMemo(()=>{
    const m={};tasks.filter(t=>t.status==="завершено").forEach(t=>{const d=fmtShort(t.completedAt);m[d]=(m[d]||0)+t.quantity;});
    return Object.entries(m).map(([date,qty])=>({date,qty})).slice(-10);
  },[tasks]);
  const rawStockData=rawMaterials.slice(0,8).map(r=>({name:r.name.length>10?r.name.slice(0,10)+"…":r.name,stock:r.stock,min:r.minStock}));
  const workerStats=useMemo(()=>{
    return allWorkers.map(w=>{
      const fromTasks=taskEmployees.filter(te=>te.employeeId===w.id&&(te.status==="завершено"||te.status==="просрочено")).reduce((s,te)=>s+te.producedQty,0);
      const fromOutputs=(productionOutputs||[]).filter(o=>o.employeeId===w.id).reduce((s,o)=>s+o.quantity,0);
      const produced=fromTasks+fromOutputs;
      const wTasks=tasks.filter(t=>(t.userIds||[]).includes(w.id));
      const done=wTasks.filter(t=>t.status==="завершено");
      return{name:w.name.split(" ").slice(0,2).join(" "),done:done.length,total:wTasks.length,produced};
    }).sort((a,b)=>b.produced-a.produced);
  },[allWorkers,tasks,taskEmployees,productionOutputs]);

  // Collect all warnings with unique keys
  const warnings=[];
  criticalRaw.forEach(r=>warnings.push({key:`raw-${r.id}`,type:"danger",icon:<I.alert size={14}/>,text:`Сырьё: ${r.name} — осталось ${r.stock} ${r.unit} (мин. ${r.minStock})`}));
  lowProducts.forEach(p=>warnings.push({key:`prod-${p.id}`,type:"warning",icon:<I.box size={14}/>,text:`Товар: ${p.name} — осталось ${p.stock} ${p.unit}`}));
  overdueTasks.forEach(t=>{const pr=products.find(p=>p.id===t.productId);warnings.push({key:`task-${t.id}`,type:"danger",icon:<I.clock size={14}/>,text:`Просрочено задание #${t.id}: ${pr?.name||"?"} x${t.quantity}`})});
  absentWorkers.forEach(w=>warnings.push({key:`absent-${w.id}`,type:"warning",icon:<I.user size={14}/>,text:`${w.name.split(" ").slice(0,2).join(" ")} не отметил присутствие`}));
  const visibleWarnings=warnings.filter(w=>!hiddenWarnings.has(w.key));
  const hiddenWarningsList=warnings.filter(w=>hiddenWarnings.has(w.key));
  const toggleWarn=(key)=>setSelectedWarns(p=>{const n=new Set(p);n.has(key)?n.delete(key):n.add(key);return n});
  const hideSelected=()=>{setHiddenWarnings(p=>{const n=new Set(p);selectedWarns.forEach(k=>n.add(k));return n});setSelectedWarns(new Set())};
  const hideAll=()=>{setHiddenWarnings(p=>{const n=new Set(p);warnings.forEach(w=>n.add(w.key));return n});setSelectedWarns(new Set())};
  const unhideAll=()=>{setHiddenWarnings(new Set());setShowHidden(false)};

  // Budget calculations
  const budget=useMemo(()=>{
    const totalSalesIncome=sales.reduce((s,sl)=>{const p=products.find(x=>x.id===sl.productId);return s+(p?.sellPrice||0)*sl.quantity},0);
    const totalOrderIncome=clientOrders.filter(o=>o.status==="отгружен").reduce((s,o)=>s+o.total,0);
    const totalIncome=totalSalesIncome+totalOrderIncome;
    const totalExpense=deliveries.reduce((s,d)=>s+d.totalPrice,0);
    const balance=totalIncome-totalExpense;
    const monthStr=new Date().toISOString().slice(0,7);
    const mSales=sales.filter(sl=>sl.createdAt?.startsWith(monthStr)).reduce((s,sl)=>{const p=products.find(x=>x.id===sl.productId);return s+(p?.sellPrice||0)*sl.quantity},0);
    const mOrders=clientOrders.filter(o=>o.status==="отгружен"&&o.shippedAt?.startsWith(monthStr)).reduce((s,o)=>s+o.total,0);
    const mExpense=deliveries.filter(d=>d.date?.startsWith(monthStr)).reduce((s,d)=>s+d.totalPrice,0);
    const monthIncome=mSales+mOrders;
    const monthProfit=monthIncome-mExpense;
    // Pending orders value (future income)
    const pendingOrdersValue=clientOrders.filter(o=>o.status==="новый"||o.status==="в производстве"||o.status==="готов").reduce((s,o)=>s+o.total,0);
    return{totalIncome,totalExpense,balance,monthIncome,mExpense,monthProfit,pendingOrdersValue};
  },[sales,clientOrders,deliveries,products]);

  // Attendance check — unified model
  const attendanceMarked=marks.some(m=>m.employeeId===currentUser.id&&(m.type==="приход"||m.markType==="присутствие")&&(m.time||m.createdAt||"").startsWith(todayStr));
  // My active tasks (for worker view)
  const myActiveTasks=tasks.filter(t=>(t.userIds||[]).includes(currentUser.id)&&(t.status==="назначено"||t.status==="в работе")).sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
  const myTodayProduced=(productionOutputs||[]).filter(o=>o.employeeId===currentUser.id&&o.date.startsWith(todayStr)).reduce((s,o)=>s+o.quantity,0);

  // Worker-specific view
  if(isWorker){
    return(
      <div>
        <div style={{marginBottom:16}}>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.text}}>{currentUser.name.split(" ")[1]||currentUser.name}</h1>
          <p style={{margin:"2px 0 0",color:C.dim,fontSize:12}}>{fmtShort(new Date().toISOString())}</p>
        </div>
        {!attendanceMarked&&(
          <div style={{marginBottom:14,padding:"12px 16px",borderRadius:10,background:`${C.orange}18`,border:`1px solid ${C.orange}50`,display:"flex",alignItems:"center",gap:10}}>
            <I.alert size={16} style={{color:C.orange,flexShrink:0}}/>
            <span style={{fontSize:13,color:C.orange,fontWeight:600,flex:1}}>Вы не отметили присутствие сегодня</span>
            <button onClick={async()=>{
              try{
                const r=await fetch("/api/actions/attendance-mark",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({employeeId:currentUser.id,type:"приход"})});
                if(r.ok){const data=await r.json();if(data.state)applyServerState(data.state);}
              }catch(e){}
            }} style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${C.orange}50`,background:`${C.orange}20`,color:C.orange,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>Отметиться</button>
          </div>
        )}
        <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:16}}>
          <Stat icon={<I.tasks size={18}/>} label="Активных заданий" value={myActiveTasks.length} color={myActiveTasks.length>0?C.primary:C.dim}/>
          <Stat icon={<I.factory size={18}/>} label="Произведено сегодня" value={`${myTodayProduced} ед.`} color={myTodayProduced>0?C.success:C.dim}/>
        </div>
        <Card s={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <Title>Мои задания</Title>
            <button onClick={()=>setPage("tasks")} style={{fontSize:11,color:C.primary,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>все →</button>
          </div>
          {myActiveTasks.length===0&&<div style={{textAlign:"center",padding:"20px 0",color:C.dim,fontSize:13}}>Нет активных заданий</div>}
          {myActiveTasks.map(t=>{
            const prod=products.find(p=>p.id===t.productId);
            const now=Date.now();const dl=new Date(t.deadline).getTime();
            const msLeft=dl-now;const hoursLeft=Math.floor(msLeft/3600000);
            const isOverdue=msLeft<0;const isUrgent=msLeft>0&&msLeft<7200000;
            const dlColor=isOverdue?C.danger:isUrgent?C.orange:msLeft<86400000?C.primary:C.dim;
            const dlLabel=isOverdue?"просрочено":hoursLeft<1?"< 1 ч":hoursLeft<24?`${hoursLeft} ч`:fmtShort(t.deadline);
            return(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{width:4,height:40,borderRadius:2,background:t.status==="в работе"?C.info:C.primary,flexShrink:0}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{prod?.name||"—"} <span style={{fontWeight:400,color:C.muted}}>×{t.quantity}</span></div>
                  <div style={{fontSize:11,color:dlColor,marginTop:2,display:"flex",alignItems:"center",gap:4}}><I.clock size={10}/>{dlLabel}</div>
                </div>
                <Badge color={t.status==="в работе"?"info":"primary"} s={{fontSize:11}}>{t.status}</Badge>
                <button onClick={()=>setPage("tasks")} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:C.surface2,color:C.muted,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>→</button>
              </div>
            );
          })}
        </Card>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>setPage("tasks")} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:8,border:`1px solid ${C.primary}30`,background:`${C.primary}10`,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><I.tasks size={14}/>Задания</button>
          <button onClick={()=>setPage("prodOutput")} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:8,border:`1px solid ${C.success}30`,background:`${C.success}10`,color:C.success,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><I.factory size={14}/>Зафиксировать выпуск</button>
          <button onClick={()=>setPage("workerHistory")} style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",borderRadius:8,border:`1px solid ${C.info}30`,background:`${C.info}10`,color:C.info,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><I.clock size={14}/>Моя история</button>
        </div>
      </div>
    );
  }

  return(
    <div>
      <div style={{marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <h1 style={{margin:0,fontSize:20,fontWeight:800,color:C.text}}>{currentUser.name.split(" ")[1]||currentUser.name}</h1>
          <p style={{margin:"2px 0 0",color:C.dim,fontSize:12}}>{role?.label} · {fmtShort(new Date().toISOString())}</p>
        </div>
      </div>

      {/* ═══ SHIFT SNAPSHOT — micromanagement block ═══ */}
      {(isAdmin||isManager)&&(()=>{
        const now=new Date();
        const todayStr2=now.toISOString().slice(0,10);
        // Who arrived today
        const arrivedIds=new Set(marks.filter(m=>(m.type==="приход"||m.markType==="присутствие")&&(m.time||m.createdAt||"").startsWith(todayStr2)).map(m=>m.employeeId));
        // Who departed today
        const departedIds=new Set(marks.filter(m=>m.type==="уход"&&(m.time||m.createdAt||"").startsWith(todayStr2)).map(m=>m.employeeId));
        // Who was late
        const lateIds=new Set(marks.filter(m=>m.type==="опоздание"&&(m.time||m.createdAt||"").startsWith(todayStr2)).map(m=>m.employeeId));
        // Who is marked absent
        const absentIds=new Set(marks.filter(m=>m.type==="отсутствие"&&(m.time||m.createdAt||"").startsWith(todayStr2)).map(m=>m.employeeId));
        // Today's production per worker
        const todayOutputByWorker={};
        (productionOutputs||[]).filter(o=>o.date.startsWith(todayStr2)).forEach(o=>{todayOutputByWorker[o.employeeId]=(todayOutputByWorker[o.employeeId]||0)+o.quantity;});

        const prodWorkers=users.filter(u=>u.roleId===3&&u.status==="active");
        const noShowWorkers=prodWorkers.filter(w=>!arrivedIds.has(w.id)&&!absentIds.has(w.id));
        const normMissers=prodWorkers.filter(w=>arrivedIds.has(w.id)&&w.dailyNorm>0&&(todayOutputByWorker[w.id]||0)<w.dailyNorm);
        const zeroWorkers=prodWorkers.filter(w=>arrivedIds.has(w.id)&&!(todayOutputByWorker[w.id]>0));

        // Expired batches
        const expiredBatches=(batches||[]).filter(b=>b.status==="активна"&&b.expiresAt&&new Date(b.expiresAt)<now);
        // Stores with active debt
        const storesWithDebt=(debts||[]).filter(d=>d.status!=="погашен");
        const blacklistedStores=(clients||[]).filter(c=>c.status==="blacklist");
        // Today defects
        const todayDefects=(defects||[]).filter(d=>d.date===todayStr2);

        const hasCritical=noShowWorkers.length>0||expiredBatches.length>0||blacklistedStores.length>0;

        return(
          <div style={{marginBottom:16}}>
            {/* ─── Critical alerts ─── */}
            {hasCritical&&(
              <div style={{display:"grid",gap:6,marginBottom:12}}>
                {noShowWorkers.map(w=>(
                  <div key={w.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:9,background:C.dangerBg,border:`1px solid ${C.danger}30`}}>
                    <I.user size={14} style={{color:C.danger,flexShrink:0}}/>
                    <span style={{fontSize:13,color:C.danger,fontWeight:700,flex:1}}>{w.name} — не отметил приход</span>
                    <span style={{fontSize:10,color:C.dim}}>{w.jobTitle||""}</span>
                  </div>
                ))}
                {expiredBatches.map(b=>{const p=products.find(x=>x.id===b.productId);return(
                  <div key={b.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:9,background:C.dangerBg,border:`1px solid ${C.danger}30`}}>
                    <I.alert size={14} style={{color:C.danger,flexShrink:0}}/>
                    <span style={{fontSize:13,color:C.danger,fontWeight:700,flex:1}}>Просрочено: {p?.name||"?"} — {b.quantity} ед.</span>
                    <button onClick={()=>setPage("batches")} style={{fontSize:11,padding:"3px 9px",borderRadius:5,border:`1px solid ${C.danger}40`,background:`${C.danger}15`,color:C.danger,cursor:"pointer",fontFamily:"inherit"}}>Списать</button>
                  </div>
                );})}
                {blacklistedStores.map(s=>(
                  <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",borderRadius:9,background:`${C.orange}12`,border:`1px solid ${C.orange}30`}}>
                    <I.lock size={14} style={{color:C.orange,flexShrink:0}}/>
                    <span style={{fontSize:13,color:C.orange,fontWeight:700,flex:1}}>ЧС: {s.name}</span>
                    {s.blockReason&&<span style={{fontSize:11,color:C.dim}}>{s.blockReason}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* ─── Shift grid ─── */}
            <Card s={{padding:"14px 16px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:6}}>
                <div style={{fontWeight:700,fontSize:14,color:C.text,display:"flex",alignItems:"center",gap:8}}>
                  <I.clock size={15}/> Смена сегодня
                </div>
                <div style={{display:"flex",gap:10,fontSize:11,color:C.dim}}>
                  <span><span style={{color:C.success,fontWeight:700}}>{arrivedIds.size}</span> пришли</span>
                  <span><span style={{color:C.danger,fontWeight:700}}>{noShowWorkers.length}</span> не отмечено</span>
                  {zeroWorkers.length>0&&<span><span style={{color:C.orange,fontWeight:700}}>{zeroWorkers.length}</span> без выработки</span>}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:8}}>
                {prodWorkers.map(w=>{
                  const arrived=arrivedIds.has(w.id);
                  const departed=departedIds.has(w.id);
                  const late=lateIds.has(w.id);
                  const absent=absentIds.has(w.id);
                  const produced=todayOutputByWorker[w.id]||0;
                  const norm=w.dailyNorm||0;
                  const normOk=norm===0||produced>=norm;
                  const statusClr=absent?C.dim:!arrived?C.danger:late?C.orange:C.success;
                  const statusLabel=absent?"отсутствует":!arrived?"не пришёл":late?"опоздал":"пришёл";
                  return(
                    <div key={w.id} style={{padding:"9px 12px",borderRadius:9,background:C.bg,border:`1px solid ${!arrived&&!absent?C.danger+"40":arrived&&!normOk&&norm>0?C.orange+"40":C.border}`,position:"relative"}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4}}>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:C.text}}>{w.name.split(" ").slice(0,2).join(" ")}</div>
                          <div style={{fontSize:10,color:C.dim}}>{w.jobTitle||"—"}</div>
                        </div>
                        <div style={{fontSize:10,fontWeight:700,color:statusClr,textAlign:"right"}}>
                          {statusLabel}
                          {departed&&<div style={{color:C.info}}>ушёл</div>}
                        </div>
                      </div>
                      {(arrived||produced>0)&&(
                        <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                          <div style={{flex:1,height:4,background:C.surface2,borderRadius:2,overflow:"hidden"}}>
                            {norm>0&&<div style={{height:"100%",width:`${Math.min(100,Math.round(produced/norm*100))}%`,background:normOk?C.success:C.orange,borderRadius:2}}/>}
                          </div>
                          <span style={{fontSize:10,fontWeight:700,color:normOk?C.success:C.orange,whiteSpace:"nowrap"}}>
                            {produced}{norm>0?`/${norm}`:""}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {prodWorkers.length===0&&<div style={{fontSize:12,color:C.dim,padding:"8px 0"}}>Нет работников</div>}
              </div>

              {/* Mini summaries */}
              <div style={{display:"flex",flexWrap:"wrap",gap:12,marginTop:12,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
                {storesWithDebt.length>0&&(
                  <button onClick={()=>setPage("debts")} style={{fontSize:11,color:C.danger,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,padding:0}}>
                    💰 {storesWithDebt.length} магазинов в долгу
                  </button>
                )}
                {todayDefects.length>0&&(
                  <button onClick={()=>setPage("defects")} style={{fontSize:11,color:C.orange,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,padding:0}}>
                    ⚠ Брак сегодня: {todayDefects.reduce((s,d)=>s+d.quantity,0)} ед.
                  </button>
                )}
                {normMissers.length>0&&(
                  <button onClick={()=>setPage("salary")} style={{fontSize:11,color:C.orange,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:600,padding:0}}>
                    📉 {normMissers.length} не выполнили норму
                  </button>
                )}
              </div>
            </Card>
          </div>
        );
      })()}

      {/* ═══ BUDGET BLOCK ═══ */}
      {canSeeFinance&&(
        <Card s={{marginBottom:16,padding:"16px 20px",background:`linear-gradient(135deg, ${C.surface} 0%, ${C.surface2} 100%)`,border:`1px solid ${C.primary}20`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
            <div style={{width:32,height:32,borderRadius:8,background:`${C.primary}15`,display:"flex",alignItems:"center",justifyContent:"center",color:C.primary}}><I.chart size={16}/></div>
            <div style={{fontSize:15,fontWeight:800,color:C.text}}>Финансы</div>
            <span style={{fontSize:14,marginLeft:4}}>{budget.monthProfit>0?"🟢":budget.monthProfit===0?"🟡":"🔴"}</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
            <div style={{padding:"10px 14px",background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:.5}}>Баланс</div>
              <div style={{fontSize:20,fontWeight:800,color:budget.balance>=0?C.success:C.danger}}>{budget.balance>=0?"+":""}{(budget.balance/1000).toFixed(0)}т ₽</div>
            </div>
            <div style={{padding:"10px 14px",background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:.5}}>Доходы за месяц</div>
              <div style={{fontSize:18,fontWeight:700,color:C.success}}>+{(budget.monthIncome/1000).toFixed(0)}т ₽</div>
            </div>
            <div style={{padding:"10px 14px",background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:.5}}>Расходы за месяц</div>
              <div style={{fontSize:18,fontWeight:700,color:C.danger}}>-{(budget.mExpense/1000).toFixed(0)}т ₽</div>
            </div>
            <div style={{padding:"10px 14px",background:budget.monthProfit>=0?C.successBg:C.dangerBg,borderRadius:8,border:`1px solid ${budget.monthProfit>=0?C.success:C.danger}20`}}>
              <div style={{fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:.5}}>Чистая прибыль</div>
              <div style={{fontSize:18,fontWeight:700,color:budget.monthProfit>=0?C.success:C.danger}}>{budget.monthProfit>=0?"+":""}{(budget.monthProfit/1000).toFixed(0)}т ₽</div>
            </div>
          </div>
          {budget.pendingOrdersValue>0&&(
            <div style={{marginTop:10,fontSize:11,color:C.muted,display:"flex",alignItems:"center",gap:6}}>
              <I.truck size={12}/> Ожидаемый доход от заказов в работе: <span style={{fontWeight:700,color:C.primary}}>+{(budget.pendingOrdersValue/1000).toFixed(0)}т ₽</span>
            </div>
          )}
        </Card>
      )}

      {/* ═══ QUICK ACTIONS ═══ */}
      <Card s={{marginBottom:16,padding:"12px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <I.target size={15}/>
          <span style={{fontSize:13,fontWeight:700,color:C.text}}>Быстрые действия</span>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {isWorker?(<>
            <button onClick={()=>setPage("tasks")} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:8,border:`1px solid ${C.info}30`,background:`${C.info}10`,color:C.info,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><I.tasks size={14}/>Мои задания</button>
            <button onClick={()=>setPage("prodOutput")} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:8,border:`1px solid ${C.success}30`,background:`${C.success}10`,color:C.success,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><I.factory size={14}/>Зафиксировать выпуск</button>
            <button onClick={()=>setPage("marks")} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:8,border:`1px solid ${C.primary}30`,background:`${C.primary}10`,color:C.primary,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}><I.check size={14}/>Отметки</button>
          </>):(<>
            {[
              {label:"Создать задание",icon:<I.tasks size={14}/>,pg:"tasks",clr:C.primary},
              {label:"Быстрая продажа",icon:<I.truck size={14}/>,pg:"sales",clr:C.success},
              {label:"Новый заказ",icon:<I.send size={14}/>,pg:"clients",clr:C.orange},
              {label:"Добавить поставку",icon:<I.down size={14}/>,pg:"deliveries",clr:C.info},
              ...(isAdmin?[{label:"Добавить товар",icon:<I.plus size={14}/>,pg:"products",clr:C.purple}]:[]),
            ].map((a,i)=>(
              <button key={i} onClick={()=>setPage(a.pg)} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 16px",borderRadius:8,border:`1px solid ${a.clr}30`,background:`${a.clr}10`,color:a.clr,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                {a.icon}{a.label}
              </button>
            ))}
          </>)}
        </div>
      </Card>

      {/* ═══ WARNINGS with checkboxes & management ═══ */}
      {(visibleWarnings.length>0||hiddenWarningsList.length>0)&&!isWorker&&(
        <Card s={{marginBottom:16,padding:"12px 16px",borderLeft:`3px solid ${C.danger}`}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:6}}>
            <div style={{fontSize:13,fontWeight:700,color:C.danger,display:"flex",alignItems:"center",gap:6}}>
              <I.alert size={16}/> Предупреждения ({visibleWarnings.length})
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {selectedWarns.size>0&&<Btn v="ghost" sz="sm" onClick={hideSelected} style={{fontSize:11,color:C.muted}}>Скрыть выбранные ({selectedWarns.size})</Btn>}
              {visibleWarnings.length>0&&<Btn v="ghost" sz="sm" onClick={hideAll} style={{fontSize:11,color:C.dim}}>Скрыть все</Btn>}
              {hiddenWarningsList.length>0&&<Btn v="ghost" sz="sm" onClick={()=>setShowHidden(!showHidden)} style={{fontSize:11,color:C.info}}>{showHidden?"Закрыть":"Показать"} скрытые ({hiddenWarningsList.length})</Btn>}
              {hiddenWarningsList.length>0&&<Btn v="ghost" sz="sm" onClick={unhideAll} style={{fontSize:11,color:C.dim}}>Восстановить</Btn>}
            </div>
          </div>
          <div style={{display:"grid",gap:5}}>
            {visibleWarnings.map(w=>(
              <div key={w.key} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:w.type==="danger"?C.dangerBg:`${C.primary}10`,borderRadius:7,fontSize:12,color:w.type==="danger"?C.danger:C.primary}}>
                <input type="checkbox" checked={selectedWarns.has(w.key)} onChange={()=>toggleWarn(w.key)} style={{accentColor:C.primary,cursor:"pointer",flexShrink:0}}/>
                {w.icon}<span style={{flex:1}}>{w.text}</span>
                <button onClick={()=>setHiddenWarnings(p=>{const n=new Set(p);n.add(w.key);return n})} style={{background:"none",border:"none",color:C.dim,cursor:"pointer",padding:2,fontSize:14,lineHeight:1}} title="Скрыть">×</button>
              </div>
            ))}
          </div>
          {visibleWarnings.length===0&&hiddenWarningsList.length>0&&<div style={{fontSize:12,color:C.dim,padding:"4px 0"}}>Все предупреждения скрыты</div>}
          {showHidden&&hiddenWarningsList.length>0&&(
            <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
              <div style={{fontSize:11,fontWeight:600,color:C.dim,marginBottom:6}}>Скрытые:</div>
              {hiddenWarningsList.map(w=>(
                <div key={w.key} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 10px",fontSize:11,color:C.dim,opacity:.6}}>
                  {w.icon}<span style={{flex:1}}>{w.text}</span>
                  <button onClick={()=>setHiddenWarnings(p=>{const n=new Set(p);n.delete(w.key);return n})} style={{background:"none",border:"none",color:C.info,cursor:"pointer",padding:2,fontSize:10,fontFamily:"inherit"}}>показать</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* === STAT CARDS === */}
      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:22}}>
        <Stat icon={<I.check size={18}/>} label="Сегодня произведено" value={`${todayProduced} ед.`} color={C.success}/>
        <Stat icon={<I.tasks size={18}/>} label="Активные задания" value={activeTasks} color={C.info}/>
        <Stat icon={<I.users size={18}/>} label="Загрузка работников" value={`${busyCount}/${allWorkers.length}`} color={busyCount>0?C.primary:C.dim}/>
        {bestWorker&&<Stat icon={<I.star size={18}/>} label={`Лучший: ${bestWorker.name}`} value={bestWorker.produced} color={C.primary}/>}
        <Stat icon={<I.bell size={18}/>} label="Непрочитанных" value={unreadNotifs} color={unreadNotifs>0?C.danger:C.dim}/>
        {canSeeFinance&&<Stat icon={<I.box size={18}/>} label="Склад (стоимость)" value={`${(totalValue/1000).toFixed(0)}т ₽`} color={C.cyan}/>}
      </div>

      {/* === ACTIVE URGENT ORDERS === */}
      {(()=>{
        const activeOrders=clientOrders.filter(o=>o.status!=="отгружен"&&o.status!=="отменён").sort((a,b)=>{const p={срочный:0,важный:1,нормальный:2};return(p[a.priority]??2)-(p[b.priority]??2)||new Date(a.orderDate)-new Date(b.orderDate)});
        if(!activeOrders.length) return null;
        const urgent=activeOrders.filter(o=>o.priority==="срочный");
        const important=activeOrders.filter(o=>o.priority==="важный");
        return(
          <Card s={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <Title>Активные заказы</Title>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {urgent.length>0&&<Badge color="danger">{urgent.length} срочных</Badge>}
                {important.length>0&&<Badge color="orange">{important.length} важных</Badge>}
                <button onClick={()=>setPage("clients")} style={{fontSize:11,color:C.primary,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>все →</button>
              </div>
            </div>
            <div style={{display:"grid",gap:6}}>
              {activeOrders.slice(0,6).map(o=>{
                const cl=clients.find(c=>c.id===o.clientId);
                const priClr=o.priority==="срочный"?C.danger:o.priority==="важный"?C.orange:C.dim;
                const stClr=o.status==="готов"?C.purple:o.status==="в производстве"?C.primary:o.status==="сборка"?C.orange:C.info;
                return(
                  <div key={o.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:8,background:o.priority==="срочный"?`${C.danger}08`:o.priority==="важный"?`${C.orange}08`:C.bg,border:`1px solid ${o.priority==="срочный"?C.danger+"30":o.priority==="важный"?C.orange+"30":C.border}`,animation:o.priority==="срочный"?"pulseBorder 2s infinite":"none"}}>
                    <div style={{width:3,height:32,borderRadius:2,background:priClr,flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cl?.name||"—"}</div>
                      <div style={{fontSize:11,color:C.dim,marginTop:1}}>{o.items.map(it=>products.find(p=>p.id===it.productId)?.name||"?").join(", ")} · {o.total.toLocaleString("ru")} ₽</div>
                    </div>
                    <span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:4,background:stClr+"20",color:stClr,border:`1px solid ${stClr}30`,whiteSpace:"nowrap"}}>{o.status}</span>
                    <div style={{fontSize:10,color:C.dim,whiteSpace:"nowrap"}}>{fmtShort(o.orderDate)}</div>
                  </div>
                );
              })}
              {activeOrders.length>6&&<div style={{fontSize:11,color:C.dim,textAlign:"center",padding:"4px 0"}}>+{activeOrders.length-6} ещё</div>}
            </div>
          </Card>
        );
      })()}

      {/* === FORECASTS === */}
      {forecasts.length>0&&!isWorker&&(
        <Card s={{marginBottom:16}}>
          <Title>Прогноз остатков</Title>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
            {forecasts.slice(0,8).map((f,i)=>(
              <div key={i} style={{padding:"8px 12px",background:C.bg,borderRadius:8,border:`1px solid ${f.daysLeft<=3?C.danger:f.daysLeft<=7?C.primary:C.border}30`}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:12,fontWeight:500,color:C.text}}>{f.name}</span>
                  <Badge color={f.daysLeft<=3?"danger":f.daysLeft<=7?"primary":"success"} s={{fontSize:10}}>{f.daysLeft} дн.</Badge>
                </div>
                <div style={{fontSize:11,color:C.dim,marginTop:2}}>Остаток: {f.stock} {f.unit} · Расход: ~{f.dailyRate}/{f.unit} в день</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* === RAW MATERIAL LEVELS === */}
      {!isWorker&&(
        <Card s={{marginBottom:16}}>
          <Title>Остатки сырья</Title>
          <div style={{display:"grid",gap:8}}>
            {rawMaterials.slice(0,8).map(r=>{
              const pct=r.minStock>0?Math.min(100,Math.round(r.stock/r.minStock*50)):100;
              const clr=r.stock<=r.minStock?C.danger:r.stock<=r.minStock*2?C.primary:C.success;
              return(
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:12,color:C.text,width:110,flexShrink:0}}>{r.name}</span>
                  <div style={{flex:1,height:6,background:C.bg,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:clr,borderRadius:3,transition:"width .3s"}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:clr,width:70,textAlign:"right"}}>{r.stock} {r.unit}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14}}>
        <Card><Title>Производство по дням</Title>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={prodByDay}><defs><linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.primary} stopOpacity={.3}/><stop offset="95%" stopColor={C.primary} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="date" tick={{fill:C.dim,fontSize:10}}/><YAxis tick={{fill:C.dim,fontSize:10}}/>
              <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/>
              <Area type="monotone" dataKey="qty" stroke={C.primary} fill="url(#gP)" name="Кол-во"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card><Title>Остатки сырья vs минимум</Title>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={rawStockData}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="name" tick={{fill:C.dim,fontSize:9}}/><YAxis tick={{fill:C.dim,fontSize:10}}/>
              <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/>
              <Bar dataKey="stock" fill={C.info} radius={[3,3,0,0]} name="Остаток"/>
              <Bar dataKey="min" fill={C.danger} radius={[3,3,0,0]} name="Минимум"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card><Title>Эффективность сотрудников</Title>
          {workerStats.map((w,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<workerStats.length-1?`1px solid ${C.border}`:"none"}}>
              <div style={{width:26,height:26,borderRadius:7,background:`${CC[i]}15`,color:CC[i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:C.text,fontWeight:500}}>{w.name}</div>
                <div style={{fontSize:11,color:C.dim}}>Выполнено: {w.done}/{w.total}</div>
              </div>
              <div style={{fontSize:14,fontWeight:700,color:C.text}}>{w.produced}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};


export { DashboardPage };
