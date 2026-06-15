import { useState, useEffect } from "react";
import { C } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { EthnicBorder, Btn, Inp } from "../components/ui/index.jsx";

// LOGIN
const DEMO_ACCOUNTS=[
  {label:"Директор",email:"director@factory.ru",pw:"director123",color:"danger"},
  {label:"Менеджер",email:"manager@factory.ru",pw:"manager123",color:"info"},
  {label:"Владелец",email:"owner@factory.ru",pw:"owner123",color:"purple"},
  {label:"Лепщица 1",email:"lep1@factory.ru",pw:"worker123",color:"primary"},
  {label:"Фасовщица",email:"packer@factory.ru",pw:"worker123",color:"cyan"},
  {label:"Курьер",email:"courier@factory.ru",pw:"worker123",color:"orange"},
];

const LoginPage = ({onLogin})=>{
  const [email,setEmail]=useState("director@factory.ru");
  const [pw,setPw]=useState("director123");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [apiOk,setApiOk]=useState(null); // null=checking, true=ok, false=down

  useEffect(()=>{
    let mounted=true;
    const check=()=>{
      fetch("/api/health",{cache:"no-store"})
        .then(r=>{ if(mounted) setApiOk(r.ok); })
        .catch(()=>{ if(mounted) setApiOk(false); });
    };
    check();
    const t=setInterval(check,5000);
    return()=>{ mounted=false; clearInterval(t); };
  },[]);

  const go=async()=>{
    if(loading) return;
    setLoading(true);setErr("");
    try{
      const r=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:pw})});
      if(!r.ok){const data=await r.json();setErr(data.error||"Ошибка входа");return;}
      const data=await r.json();
      onLogin(data);
    }catch{setErr("Сервер недоступен. Запустите: npm run dev");}
    finally{setLoading(false);}
  };
  const colorMap={danger:C.danger,info:C.info,purple:C.purple,primary:C.primary,cyan:C.cyan,orange:C.orange};
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`radial-gradient(ellipse at 30% 20%, #2A2218 0%, ${C.bg} 70%)`,padding:20}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,padding:0,boxShadow:`0 20px 60px rgba(0,0,0,.4), 0 0 80px ${C.primary}08`,overflow:"hidden",marginBottom:16}}>
          <EthnicBorder color={C.primary} height={4}/>
          <div style={{padding:"34px 34px 30px"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{width:56,height:56,borderRadius:14,background:`linear-gradient(135deg, ${C.primary}20, ${C.primary}08)`,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12,color:C.primary,border:`2px solid ${C.primary}30`,boxShadow:`0 4px 20px ${C.primary}15`}}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.text,letterSpacing:1}}>Dikanish</h1>
              <p style={{margin:"5px 0 0",color:C.muted,fontSize:13}}>Система управления производством v7</p>
              <div style={{marginTop:10}}><EthnicBorder color={C.primary} height={2}/></div>
            </div>
            {apiOk===false&&<div style={{background:C.dangerBg,border:`1px solid rgba(196,78,61,.3)`,borderRadius:7,padding:"8px 12px",marginBottom:14,color:C.danger,fontSize:12}}><div style={{display:"flex",alignItems:"center",gap:7,fontWeight:700,marginBottom:2}}><I.alert size={15}/>Backend не запущен</div><div style={{color:C.muted}}>Запустите: <code style={{color:C.primary}}>npm run dev</code> или <code style={{color:C.primary}}>npm run dev:api</code></div></div>}
    {err&&<div style={{background:C.dangerBg,border:`1px solid rgba(196,78,61,.25)`,borderRadius:7,padding:"8px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:7,color:C.danger,fontSize:12}}><I.alert size={15}/>{err}</div>}
            <Inp label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} disabled={loading}/>
            <Inp label="Пароль" type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} disabled={loading}/>
            <Btn onClick={go} style={{width:"100%",justifyContent:"center",padding:11,marginTop:4}} sz="lg" disabled={loading}>{loading?"Вход...":"Войти"}</Btn>
          </div>
        </div>
        {/* Demo accounts block */}
        <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:"14px 16px"}}>
          <div style={{fontSize:11,fontWeight:600,color:C.dim,marginBottom:10,letterSpacing:.5,textTransform:"uppercase"}}>Демо-аккаунты (быстрый вход)</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
            {DEMO_ACCOUNTS.map(a=>(
              <button key={a.email} onClick={()=>{setEmail(a.email);setPw(a.pw)}} style={{background:`${colorMap[a.color]}12`,border:`1px solid ${colorMap[a.color]}30`,borderRadius:7,padding:"6px 4px",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:700,color:colorMap[a.color]}}>{a.label}</div>
                <div style={{fontSize:9,color:C.dim,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.email.split("@")[0]}</div>
              </button>
            ))}
          </div>
          <div style={{fontSize:10,color:C.dim,marginTop:8,textAlign:"center"}}>Нажмите на карточку — данные подставятся автоматически</div>
        </div>
      </div>
    </div>
  );
};


export { LoginPage };
