import { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { AppContext } from "../context/AppContext.js";
import { ROLES, JOB_TITLES, PAY_TYPES, STORE_STATUSES, STORE_STATUS_LABELS, ORDER_SOURCES, ATTENDANCE_TYPES, ATTENDANCE_TYPE_COLORS, BATCH_STATUSES, DEFECT_REASONS, PAYROLL_STATUSES, CATEGORIES, UNITS, STATUSES, TASK_STATUSES, RAW_CATEGORIES, RAW_UNITS, NOTIF_TYPES, MARK_TYPES, PLAN_STATUSES, ORDER_STATUSES, ORDER_PRIORITIES, BOARD_COLUMNS, MOVEMENT_TYPES, DEBT_STATUSES, CAMERA_SOURCE_TYPES, CAMERA_SOURCE_LABELS, CAMERA_ZONES } from "../constants/index.js";
import { fmtDate, fmtShort, fmtTime, daysBetween, relTime } from "../utils/dates.js";
import { C, CC } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { EthnicBorder, EthnicCorner, Badge, Btn, Inp, Sel, Txa, Modal, Confirm, Stat, Toast, TH, TD, Card, Title, PageH, SearchBox } from "../components/ui/index.jsx";

// LOGS
const LogsPage = ()=>{
  const {logs,users}=useContext(AppContext);
  const [search,setSearch]=useState("");
  const [fUser,setFUser]=useState("all");
  const workers=users.filter(u=>u.status==="active");
  const filtered=logs.filter(l=>{
    const matchSearch=!search||l.message.toLowerCase().includes(search.toLowerCase())||l.userName.toLowerCase().includes(search.toLowerCase());
    const matchUser=fUser==="all"||l.userId===+fUser;
    return matchSearch&&matchUser;
  }).sort((a,b)=>new Date(b.date)-new Date(a.date));

  // Group by day
  const groups=[];
  let lastDay="";
  for(const l of filtered){
    const day=l.date?l.date.slice(0,10):"";
    if(day!==lastDay){groups.push({day,items:[]});lastDay=day;}
    groups[groups.length-1].items.push(l);
  }

  const dayLabel=d=>{
    const today=new Date().toISOString().slice(0,10);
    const yest=new Date(Date.now()-86400000).toISOString().slice(0,10);
    if(d===today) return"Сегодня";
    if(d===yest) return"Вчера";
    return fmtShort(d+"T00:00:00");
  };

  const timeOf=iso=>{
    try{return new Date(iso).toLocaleTimeString("ru",{hour:"2-digit",minute:"2-digit"});}catch{return"";}
  };

  return(
    <div>
      <PageH title="Журнал">
        <SearchBox value={search} onChange={e=>setSearch(e.target.value)} ph="Что искать..."/>
        <select value={fUser} onChange={e=>setFUser(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}>
          <option value="all">Все</option>
          {workers.map(u=><option key={u.id} value={u.id}>{u.name.split(" ")[0]}</option>)}
        </select>
      </PageH>
      {filtered.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim}}>Нет записей</div>}
      {groups.map(g=>(
        <div key={g.day} style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:C.dim,textTransform:"uppercase",letterSpacing:1,marginBottom:6,paddingLeft:4}}>{dayLabel(g.day)}</div>
          <Card s={{padding:0}}>
            {g.items.map((l,i)=>(
              <div key={l.id} style={{padding:"9px 14px",borderBottom:i<g.items.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:11,color:C.dim,minWidth:38,textAlign:"right",flexShrink:0}}>{timeOf(l.date)}</div>
                <div style={{flex:1,fontSize:13,color:C.text}}>{l.message}</div>
                <div style={{fontSize:11,color:C.muted,flexShrink:0}}>{l.userName?.split(" ")[0]||"—"}</div>
              </div>
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
};


export { LogsPage };
