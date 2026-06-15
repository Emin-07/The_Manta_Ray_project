import { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import { AppContext } from "../../context/AppContext.js";
import { ROLES } from "../../constants/index.js";
import { C } from "../../theme/colors.js";
import { I } from "../../icons/Icons.jsx";
import { Badge, Btn, Modal, Card } from "../../components/ui/index.jsx";

// NOTIFICATION BELL (Header Dropdown)
const NotificationBell = ({onGoToPage})=>{
  const {notifications,setNotifsL,currentUser,users}=useContext(AppContext);
  const [open,setOpen]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[]);

  const visible=useMemo(()=>{
    return notifications.filter(n=>n.targetAll||n.targetUsers?.includes(currentUser.id)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },[notifications,currentUser]);

  const unread=visible.filter(n=>!n.readBy?.includes(currentUser.id)).length;

  // markRead / markAllRead go through dedicated action endpoints so workers
  // (who have no write access to dk_notifications) can still mark their own
  // readBy entries. Server returns the updated list; we apply it locally via
  // setNotifsL to avoid a redundant POST to /api/state/dk_notifications.
  const markRead=async(id)=>{
    try{
      const r=await fetch("/api/actions/notifications/read",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({notificationId:id}),
      });
      if(!r.ok) return;
      const data=await r.json();
      if(data?.dk_notifications) setNotifsL(data.dk_notifications);
    }catch{}
  };
  const markAllRead=async()=>{
    try{
      const r=await fetch("/api/actions/notifications/read-all",{method:"POST"});
      if(!r.ok) return;
      const data=await r.json();
      if(data?.dk_notifications) setNotifsL(data.dk_notifications);
    }catch{}
  };

  const nColor=t=>t==="ошибка"?C.danger:t==="предупреждение"?C.primary:C.info;
  const nIcon=t=>t==="ошибка"?<I.alert size={14}/>:t==="предупреждение"?<I.alert size={14}/>:<I.bell size={14}/>;

  return(
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{position:"relative",background:"none",border:"none",cursor:"pointer",padding:6,color:C.muted}}>
        <I.bell size={20}/>
        {unread>0&&<div style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:C.danger,color:"#fff",fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center"}}>{unread>9?"9+":unread}</div>}
      </button>
      {open&&(
        <div style={{position:"absolute",right:0,top:"100%",marginTop:6,width:380,maxHeight:480,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 15px 50px rgba(0,0,0,.5)",zIndex:1001,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:14,fontWeight:700,color:C.text}}>Уведомления {unread>0&&<Badge color="danger" s={{marginLeft:6}}>{unread}</Badge>}</span>
            <div style={{display:"flex",gap:6}}>
              {unread>0&&<button onClick={markAllRead} style={{background:"none",border:"none",color:C.info,fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Прочитать все</button>}
              <button onClick={()=>{setOpen(false);onGoToPage("notifications")}} style={{background:"none",border:"none",color:C.primary,fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Все</button>
            </div>
          </div>
          <div style={{flex:1,overflow:"auto"}}>
            {visible.length===0?<div style={{padding:30,textAlign:"center",color:C.dim,fontSize:13}}>Нет уведомлений</div>:
            visible.slice(0,10).map(n=>{
              const isRead=n.readBy?.includes(currentUser.id);
              return(
                <div key={n.id} onClick={()=>{if(!isRead)markRead(n.id)}} style={{padding:"10px 16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:isRead?"transparent":`${C.primary}06`,transition:"background .15s"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                    <div style={{width:28,height:28,borderRadius:7,background:`${nColor(n.type)}15`,color:nColor(n.type),display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>{nIcon(n.type)}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
                        <span style={{fontSize:13,fontWeight:isRead?500:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.title}</span>
                        {!isRead&&<div style={{width:6,height:6,borderRadius:"50%",background:C.primary,flexShrink:0}}/>}
                      </div>
                      <div style={{fontSize:12,color:C.muted,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.content}</div>
                      <div style={{fontSize:10,color:C.dim,marginTop:3}}>{relTime(n.createdAt)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};


export { NotificationBell };
