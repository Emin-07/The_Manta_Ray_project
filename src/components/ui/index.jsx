import { useEffect } from "react";
import { C } from "../../theme/colors.js";
import { I } from "../../icons/Icons.jsx";

export const EthnicBorder = ({color=C.primary, height=3}) => (
  <div style={{width:"100%",height,background:`repeating-linear-gradient(90deg, ${color} 0px, ${color} 8px, transparent 8px, transparent 12px, ${color}80 12px, ${color}80 16px, transparent 16px, transparent 24px)`,opacity:0.6,borderRadius:1}}/>
);

export const EthnicCorner = ({size=20,color=C.primary,position="topLeft"}) => {
  const s = {position:"absolute",width:size,height:size,opacity:0.25};
  const pos = position==="topLeft"?{top:-1,left:-1}:position==="topRight"?{top:-1,right:-1}:position==="bottomLeft"?{bottom:-1,left:-1}:{bottom:-1,right:-1};
  const rotate = position==="topLeft"?"0":position==="topRight"?"90":position==="bottomLeft"?"270":"180";
  return(
    <svg style={{...s,...pos,transform:`rotate(${rotate}deg)`}} viewBox="0 0 20 20" fill="none">
      <path d="M0 0h20v2H2v18H0V0z" fill={color}/>
      <path d="M4 4h4v2H6v2H4V4z" fill={color}/>
    </svg>
  );
};

export const Badge = ({children,color="primary",s={}}) => {
  const m={primary:{bg:C.primaryBg,c:C.primary},success:{bg:C.successBg,c:C.success},danger:{bg:C.dangerBg,c:C.danger},info:{bg:C.infoBg,c:C.info},purple:{bg:C.purpleBg,c:C.purple},cyan:{bg:C.cyanBg,c:C.cyan},pink:{bg:C.pinkBg,c:C.pink},orange:{bg:C.orangeBg,c:C.orange}};
  const v=m[color]||m.primary;
  return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:6,fontSize:12,fontWeight:600,background:v.bg,color:v.c,letterSpacing:.3,border:`1px solid ${v.c}20`,...s}}>{children}</span>;
};

export const Btn = ({children,onClick,v="primary",sz="md",disabled,style={},icon})=>{
  const base={display:"inline-flex",alignItems:"center",gap:6,border:"none",borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontWeight:600,fontFamily:"inherit",transition:"all .15s",opacity:disabled?.5:1,whiteSpace:"nowrap"};
  const sizes={sm:{padding:"5px 11px",fontSize:13},md:{padding:"8px 16px",fontSize:14},lg:{padding:"11px 22px",fontSize:15}};
  const vars={primary:{background:`linear-gradient(135deg, ${C.primary}, #A67B2E)`,color:"#1A1510",boxShadow:`0 2px 8px ${C.primary}30`},secondary:{background:C.surface2,color:C.text,border:`1px solid ${C.border}`},danger:{background:C.dangerBg,color:C.danger,border:`1px solid rgba(196,78,61,.25)`},ghost:{background:"transparent",color:C.muted},success:{background:`linear-gradient(135deg, ${C.success}, #4A8E4F)`,color:"#1A1510"}};
  return <button onClick={disabled?undefined:onClick} style={{...base,...sizes[sz],...vars[v],...style}}>{icon}{children}</button>;
};

export const Inp = ({label,error,style={},cStyle={},...r})=>(
  <div style={{marginBottom:12,...cStyle}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:500,color:C.muted,marginBottom:4}}>{label}</label>}
    <input style={{width:"100%",padding:"8px 11px",background:C.bg,border:`1px solid ${error?C.danger:C.border}`,borderRadius:7,color:C.text,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",...style}} onFocus={e=>{e.target.style.borderColor=C.primary;e.target.style.boxShadow=`0 0 0 2px ${C.primary}20`}} onBlur={e=>{e.target.style.borderColor=error?C.danger:C.border;e.target.style.boxShadow="none"}} {...r}/>
    {error&&<div style={{color:C.danger,fontSize:11,marginTop:2}}>{error}</div>}
  </div>
);

export const Sel = ({label,options,error,cStyle={},...r})=>(
  <div style={{marginBottom:12,...cStyle}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:500,color:C.muted,marginBottom:4}}>{label}</label>}
    <select style={{width:"100%",padding:"8px 11px",background:C.bg,border:`1px solid ${error?C.danger:C.border}`,borderRadius:7,color:C.text,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",appearance:"none"}} {...r}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

export const Txa = ({label,cStyle={},...r})=>(
  <div style={{marginBottom:12,...cStyle}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:500,color:C.muted,marginBottom:4}}>{label}</label>}
    <textarea style={{width:"100%",padding:"8px 11px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",resize:"vertical",minHeight:70}} {...r}/>
  </div>
);

export const Modal = ({open,onClose,title,children,width=520})=>{
  if(!open) return null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{position:"absolute",inset:0,background:"rgba(10,8,5,.8)",backdropFilter:"blur(4px)"}}/>
      <div style={{position:"relative",background:C.surface,borderRadius:14,border:`1px solid ${C.border}`,width:"100%",maxWidth:width,maxHeight:"90vh",overflow:"auto",boxShadow:`0 25px 60px rgba(0,0,0,.5), inset 0 1px 0 ${C.primary}15`}} onClick={e=>e.stopPropagation()}>
        <EthnicBorder color={C.primary} height={3}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700,color:C.text}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:4}}><I.x size={18}/></button>
        </div>
        <div style={{padding:"16px 20px"}}>{children}</div>
      </div>
    </div>
  );
};

export const Confirm = ({open,onClose,onConfirm,title,message})=>(
  <Modal open={open} onClose={onClose} title={title} width={400}>
    <p style={{color:C.muted,margin:"0 0 18px",lineHeight:1.5}}>{message}</p>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <Btn v="secondary" onClick={onClose}>Отмена</Btn>
      <Btn v="danger" onClick={onConfirm}>Подтвердить</Btn>
    </div>
  </Modal>
);

export const Stat = ({icon,label,value,color=C.primary,sub})=>(
  <div style={{background:C.surface,borderRadius:12,padding:"16px 18px",border:`1px solid ${C.border}`,flex:"1 1 180px",minWidth:160,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,right:0,width:60,height:60,background:`radial-gradient(circle at top right, ${color}08, transparent 70%)`}}/>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
      <div style={{width:36,height:36,borderRadius:9,background:`${color}15`,display:"flex",alignItems:"center",justifyContent:"center",color,border:`1px solid ${color}20`}}>{icon}</div>
      {sub&&<span style={{fontSize:11,fontWeight:600,color:sub.startsWith("+")?C.success:sub.startsWith("-")?C.danger:C.muted}}>{sub}</span>}
    </div>
    <div style={{fontSize:24,fontWeight:800,color:C.text,marginBottom:2}}>{value}</div>
    <div style={{fontSize:12,color:C.muted}}>{label}</div>
  </div>
);

export const Toast = ({message,type="success",onClose})=>{
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose]);
  const c={success:C.success,error:C.danger,info:C.info,warn:C.primary};
  return(
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:C.surface,border:`1px solid ${c[type]}40`,borderRadius:10,padding:"10px 18px",boxShadow:`0 8px 30px rgba(0,0,0,.4)`,display:"flex",alignItems:"center",gap:8,animation:"slideIn .3s ease"}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:c[type]}}/>
      <span style={{color:C.text,fontSize:13}}>{message}</span>
    </div>
  );
};

export const TH = ({children}) => <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:.5,borderBottom:`1px solid ${C.border}`,background:C.surface2}}>{children}</th>;
export const TD = ({children,s={}}) => <td style={{padding:"10px 14px",fontSize:13,color:C.text,...s}}>{children}</td>;

export const Card = ({children,s={}})=><div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:18,position:"relative",...s}}>{children}</div>;
export const Title = ({children})=><h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700,color:C.text}}>{children}</h3>;
export const PageH = ({title,children})=>(
  <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:18}}>
    <h1 style={{margin:0,fontSize:21,fontWeight:800,color:C.text}}>{title}</h1>
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{children}</div>
  </div>
);
export const SearchBox = ({value,onChange,ph="Поиск..."})=>(
  <div style={{position:"relative"}}>
    <input placeholder={ph} value={value} onChange={onChange} style={{padding:"7px 11px 7px 32px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,fontFamily:"inherit",outline:"none",width:180}}/>
    <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:C.dim}}><I.search size={15}/></span>
  </div>
);
