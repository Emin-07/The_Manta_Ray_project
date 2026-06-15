import { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";
import { AppContext } from "../context/AppContext.js";
import { ROLES, JOB_TITLES, PAY_TYPES, STORE_STATUSES, STORE_STATUS_LABELS, ORDER_SOURCES, ATTENDANCE_TYPES, ATTENDANCE_TYPE_COLORS, BATCH_STATUSES, DEFECT_REASONS, PAYROLL_STATUSES, CATEGORIES, UNITS, STATUSES, TASK_STATUSES, RAW_CATEGORIES, RAW_UNITS, NOTIF_TYPES, MARK_TYPES, PLAN_STATUSES, ORDER_STATUSES, ORDER_PRIORITIES, BOARD_COLUMNS, MOVEMENT_TYPES, DEBT_STATUSES, CAMERA_SOURCE_TYPES, CAMERA_SOURCE_LABELS, CAMERA_ZONES } from "../constants/index.js";
import { fmtDate, fmtShort, fmtTime, daysBetween, relTime } from "../utils/dates.js";
import { C, CC } from "../theme/colors.js";
import { I } from "../icons/Icons.jsx";
import { EthnicBorder, EthnicCorner, Badge, Btn, Inp, Sel, Txa, Modal, Confirm, Stat, Toast, TH, TD, Card, Title, PageH, SearchBox } from "../components/ui/index.jsx";

// PROFIT ANALYTICS
const ProfitAnalyticsPage = ()=>{
  const {products,tasks,taskEmployees,rawMaterials,recipes,deliveries}=useContext(AppContext);
  const ap=products.filter(p=>!p.deleted);

  // Calculate real profit per product using recipes
  const profitData=useMemo(()=>{
    return ap.map(p=>{
      const recipe=recipes.find(r=>r.productId===p.id);
      const recipeCost=recipe?recipe.items.reduce((s,it)=>{const raw=rawMaterials.find(r=>r.id===it.rawId);return s+(raw?.costPerUnit||0)*it.qty},0):p.costPrice;
      const profit=p.sellPrice-recipeCost;
      const margin=recipeCost>0?(profit/recipeCost*100):0;
      // Total produced from tasks
      const produced=tasks.filter(t=>t.productId===p.id&&(t.status==="завершено"||t.status==="просрочено")).reduce((s,t)=>s+t.quantity,0);
      const totalRevenue=produced*p.sellPrice;
      const totalCost=produced*recipeCost;
      const totalProfit=produced*profit;
      return{id:p.id,name:p.name,category:p.category,unit:p.unit,costPrice:+recipeCost.toFixed(2),sellPrice:p.sellPrice,profit:+profit.toFixed(2),margin:+margin.toFixed(1),produced,totalRevenue,totalCost,totalProfit:+totalProfit.toFixed(0),stock:p.stock};
    }).sort((a,b)=>b.totalProfit-a.totalProfit);
  },[ap,recipes,rawMaterials,tasks]);

  const totalRevAll=profitData.reduce((s,p)=>s+p.totalRevenue,0);
  const totalProfitAll=profitData.reduce((s,p)=>s+p.totalProfit,0);
  const totalCostAll=profitData.reduce((s,p)=>s+p.totalCost,0);
  const bestProduct=profitData[0];
  const totalDeliveryCost=deliveries.reduce((s,d)=>s+d.totalPrice,0);

  const chartData=profitData.filter(p=>p.totalProfit>0).slice(0,8).map(p=>({name:p.name.length>12?p.name.slice(0,12)+"\u2026":p.name,profit:p.totalProfit/1000,revenue:p.totalRevenue/1000,cost:p.totalCost/1000}));
  const marginChart=profitData.filter(p=>p.produced>0).map(p=>({name:p.name.length>12?p.name.slice(0,12)+"\u2026":p.name,margin:p.margin}));

  return(
    <div>
      <PageH title="Аналитика прибыли"/>

      {/* Financial summary cards */}
      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:22}}>
        <Stat icon={<I.chart size={18}/>} label="Общий доход" value={`${(totalRevAll/1000).toFixed(0)}т₽`} color={C.primary}/>
        <Stat icon={<I.star size={18}/>} label="Общая прибыль" value={`${(totalProfitAll/1000).toFixed(0)}т₽`} color={C.success}/>
        <Stat icon={<I.raw size={18}/>} label="Затраты (производство)" value={`${(totalCostAll/1000).toFixed(0)}т₽`} color={C.danger}/>
        <Stat icon={<I.truck size={18}/>} label="Затраты (закупки)" value={`${(totalDeliveryCost/1000).toFixed(0)}т₽`} color={C.orange}/>
      </div>

      {bestProduct&&(
        <Card s={{marginBottom:16,padding:"14px 18px",background:`linear-gradient(135deg, ${C.primary}08, ${C.success}05)`,border:`1px solid ${C.primary}25`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:`${C.primary}15`,display:"flex",alignItems:"center",justifyContent:"center",color:C.primary}}><I.star size={20}/></div>
            <div>
              <div style={{fontSize:11,color:C.muted}}>Самый прибыльный товар</div>
              <div style={{fontSize:17,fontWeight:800,color:C.text}}>{bestProduct.name}</div>
              <div style={{fontSize:12,color:C.success,fontWeight:600}}>Прибыль: {bestProduct.totalProfit.toLocaleString("ru")}₽ \u00b7 Маржа: {bestProduct.margin}%</div>
            </div>
          </div>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(340px,1fr))",gap:14,marginBottom:18}}>
        {/* Revenue vs Profit chart */}
        <Card><Title>Доход vs Прибыль (тыс. ₽)</Title>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="name" tick={{fill:C.dim,fontSize:9}}/><YAxis tick={{fill:C.dim,fontSize:10}}/>
              <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/>
              <Legend wrapperStyle={{fontSize:11}}/>
              <Bar dataKey="revenue" fill={C.info} radius={[3,3,0,0]} name="Доход"/>
              <Bar dataKey="profit" fill={C.success} radius={[3,3,0,0]} name="Прибыль"/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Margin chart */}
        <Card><Title>Маржинальность (%)</Title>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={marginChart} layout="vertical" margin={{left:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis type="number" tick={{fill:C.dim,fontSize:10}}/>
              <YAxis dataKey="name" type="category" width={100} tick={{fill:C.muted,fontSize:10}}/>
              <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}} formatter={v=>[`${v}%`]}/>
              <Bar dataKey="margin" fill={C.primary} radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Detailed profit table */}
      <Card s={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:14,fontWeight:700,color:C.text}}>Прибыльность по товарам</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>Товар</TH><TH>Себестоимость</TH><TH>Цена</TH><TH>Прибыль/ед</TH><TH>Маржа</TH><TH>Произведено</TH><TH>Общая прибыль</TH></tr></thead>
            <tbody>{profitData.map((p,i)=>(
              <tr key={p.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <TD s={{fontWeight:500}}><div style={{display:"flex",alignItems:"center",gap:6}}>
                  {i===0&&<span style={{fontSize:14}}>&#127942;</span>}
                  {p.name}
                </div></TD>
                <TD s={{color:C.muted}}>{p.costPrice}₽</TD>
                <TD>{p.sellPrice}₽</TD>
                <TD s={{fontWeight:600,color:p.profit>0?C.success:C.danger}}>{p.profit}₽</TD>
                <TD><Badge color={p.margin>=50?"success":p.margin>=20?"primary":"danger"}>{p.margin}%</Badge></TD>
                <TD>{p.produced} {p.unit}</TD>
                <TD s={{fontWeight:700,color:C.success}}>{p.totalProfit.toLocaleString("ru")}₽</TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:14,fontWeight:700,color:C.text}}>Итого:</span>
          <span style={{fontSize:16,fontWeight:800,color:C.success}}>{totalProfitAll.toLocaleString("ru")}₽</span>
        </div>
      </Card>
    </div>
  );
};


export { ProfitAnalyticsPage };
