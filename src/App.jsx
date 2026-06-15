import { useState, useEffect, useCallback, useMemo } from "react";
import { AppContext } from "./context/AppContext.js";
import { ROLES } from "./constants/index.js";
import { INIT_USERS, INIT_PRODUCTS, INIT_RAW_MATERIALS, INIT_RECIPES, INIT_TASKS, INIT_TASK_EMPLOYEES, INIT_EMPLOYEE_HISTORY, INIT_PRODUCTION_PLANS, INIT_CLIENTS, INIT_CLIENT_ORDERS, INIT_SALES, INIT_INVENTORY_MOVEMENTS, INIT_SUPPLIERS, INIT_DELIVERIES, INIT_RAW_MOVEMENTS, INIT_NOTIFICATIONS, INIT_MARKS, INIT_PRODUCTION_OUTPUTS, INIT_DEBTS, INIT_BATCHES, INIT_DEFECTS, INIT_CAMERAS, INIT_BONUS_RULES, INIT_BASE_SALARIES } from "./data/initState.js";
import { C } from "./theme/colors.js";
import { I } from "./icons/Icons.jsx";
import { usePersisted } from "./hooks/usePersisted.js";
import { setUnauthorizedHandler, setWriteErrorHandler } from "./api/client.js";
import { apiFetch } from "./api/client.js";
import { EthnicBorder, Badge, Btn } from "./components/ui/index.jsx";


// Pages and components
import { LoginPage } from "./pages/LoginPage.jsx";
import { NotificationBell } from "./components/layout/NotificationBell.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { UsersPage } from "./pages/UsersPage.jsx";
import { ProductsPage } from "./pages/ProductsPage.jsx";
import { TasksPage } from "./pages/TasksPage.jsx";
import { RawMaterialsPage } from "./pages/RawMaterialsPage.jsx";
import { DeliveriesPage } from "./pages/DeliveriesPage.jsx";
import { EmployeeStatsPage } from "./pages/EmployeeStatsPage.jsx";
import { NotificationsPage } from "./pages/NotificationsPage.jsx";
import { MarksPage } from "./pages/MarksPage.jsx";
import { ReportsPage } from "./pages/ReportsPage.jsx";
import { WorkerHistoryPage } from "./pages/WorkerHistoryPage.jsx";
import { ClientsPage } from "./pages/ClientsPage.jsx";
import { SalesPage } from "./pages/SalesPage.jsx";
import { InventoryJournalPage } from "./pages/InventoryJournalPage.jsx";
import { ProductionPlanPage } from "./pages/ProductionPlanPage.jsx";
import { ProcurementPage } from "./pages/ProcurementPage.jsx";
import { ProfitAnalyticsPage } from "./pages/ProfitAnalyticsPage.jsx";
import { LogsPage } from "./pages/LogsPage.jsx";
import { DebtsPage } from "./pages/DebtsPage.jsx";
import { PayrollPage } from "./pages/PayrollPage.jsx";
import { ProductionOutputPage } from "./pages/ProductionOutputPage.jsx";
import { CameraPage } from "./pages/CameraPage.jsx";
import { OrdersBoardStandalone, OrdersBoardPage } from "./pages/OrdersBoardPage.jsx";
import { BatchesPage } from "./pages/BatchesPage.jsx";
import { DefectsPage } from "./pages/DefectsPage.jsx";

// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App(){
  // Session is server-side. On mount we check /api/auth/me to restore the session.
  // localStorage only stores {id, name, roleId} as a UI hint to avoid flicker — never password.
  const [currentUser,setCurrentUser]=useState(()=>{
    try{const s=localStorage.getItem("dk_session_hint");return s?JSON.parse(s):null;}catch{return null;}
  });
  const [sessionChecked,setSessionChecked]=useState(false);
  // Check session on mount and every 2 minutes.
  // This catches: role changes, account blocking, session expiry.
  useEffect(()=>{
    let mounted=true;
    const checkMe=()=>{
      fetch("/api/auth/me")
        .then(r=>r.ok?r.json():null)
        .then(user=>{
          if(!mounted) return;
          if(user){
            const hint={id:user.id,name:user.name,roleId:user.roleId};
            localStorage.setItem("dk_session_hint",JSON.stringify(hint));
            setCurrentUser(prev=>{
              // Only update if something actually changed (prevents re-renders)
              if(!prev||prev.id!==user.id||prev.roleId!==user.roleId||prev.status!==user.status) return user;
              return prev;
            });
          } else {
            localStorage.removeItem("dk_session_hint");
            setCurrentUser(null);
          }
        })
        .catch(()=>{/* server offline — keep current state */})
        .finally(()=>{if(mounted) setSessionChecked(true);});
    };
    checkMe();
    const t=setInterval(checkMe,2*60*1000); // re-check every 2 min
    return()=>{mounted=false;clearInterval(t);};
  },[]);
  const [users,setUsers]=usePersisted("dk_users",INIT_USERS);
  const [products,setProducts,setProductsL]=usePersisted("dk_products",INIT_PRODUCTS);
  const [tasks,setTasks,setTasksL]=usePersisted("dk_tasks",INIT_TASKS);
  const [rawMaterials,setRawMaterials,setRawMatsL]=usePersisted("dk_raw_mats",INIT_RAW_MATERIALS);
  const [recipes,setRecipes]=usePersisted("dk_recipes",INIT_RECIPES);
  const [taskEmployees,setTaskEmployees,setTaskEmpL]=usePersisted("dk_task_emps",INIT_TASK_EMPLOYEES);
  const [employeeHistory,setEmployeeHistory,setEmpHistL]=usePersisted("dk_emp_hist",INIT_EMPLOYEE_HISTORY);
  const [productionPlans,setProductionPlans,setPlansL]=usePersisted("dk_prod_plans",INIT_PRODUCTION_PLANS);
  const [clients,setClients]=usePersisted("dk_clients",INIT_CLIENTS);
  const [clientOrders,setClientOrders]=usePersisted("dk_client_orders",INIT_CLIENT_ORDERS);
  const [sales,setSales]=usePersisted("dk_sales",INIT_SALES);
  const [inventoryMovements,setInventoryMovements,setInvMoveL]=usePersisted("dk_inv_move",INIT_INVENTORY_MOVEMENTS);
  const [productionOutputs,setProductionOutputs,setOutputsL]=usePersisted("dk_prod_outputs",INIT_PRODUCTION_OUTPUTS);
  const [bonusRules,setBonusRules]=usePersisted("dk_bonus_rules",INIT_BONUS_RULES);
  const [baseSalaries,setBaseSalaries]=usePersisted("dk_base_salaries",INIT_BASE_SALARIES);
  const [debts,setDebts]=usePersisted("dk_debts",INIT_DEBTS);
  const [batches,setBatches,setBatchesL]=usePersisted("dk_batches",INIT_BATCHES);
  const [defects,setDefects]=usePersisted("dk_defects",INIT_DEFECTS);
  const [payrollRecords,setPayrollRecords]=usePersisted("dk_payroll",[]);
  const [cameras,setCameras]=usePersisted("dk_cameras",INIT_CAMERAS);
  const [suppliers,setSuppliers]=usePersisted("dk_suppliers",INIT_SUPPLIERS);
  const [deliveries,setDeliveries]=usePersisted("dk_deliveries",INIT_DELIVERIES);
  const [rawMovements,setRawMovements,setRawMovsL]=usePersisted("dk_raw_movements",INIT_RAW_MOVEMENTS);
  const [notifications,setNotifications,setNotifsL]=usePersisted("dk_notifications",INIT_NOTIFICATIONS);
  const [marks,setMarks]=usePersisted("dk_marks",INIT_MARKS);
  const [logs,setLogs,setLogsL]=usePersisted("dk_logs",[]);
  const [page,setPage]=useState("dashboard");
  const [sideOpen,setSideOpen]=useState(false);
  const [openGroups,setOpenGroups]=useState(()=>new Set(["main"]));
  const [hiddenWarnings,setHiddenWarnings]=useState(new Set());
  const [isMobile,setIsMobile]=useState(()=>typeof window!=="undefined"&&window.innerWidth<=768);
  const [serverOnline,setServerOnline]=useState(true);
  const [saveError,setSaveError]=useState(null); // {key,status,ts}
  useEffect(()=>{
    const check=()=>{fetch("/api/ping",{cache:"no-store"}).then(()=>setServerOnline(true)).catch(()=>setServerOnline(false))};
    check();const t=setInterval(check,15000);return()=>clearInterval(t);
  },[]);
  // Toast auto-dismiss for write errors
  useEffect(()=>{
    if(!saveError) return;
    const t=setTimeout(()=>setSaveError(null),4000);
    return()=>clearTimeout(t);
  },[saveError]);
  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<=768);
    window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);
  },[]);

  // Applies state returned by action endpoints directly to local React state,
  // without triggering server POSTs. Prevents 403 on manager-only keys for workers.
  const applyServerState=useCallback((state)=>{
    if(state.dk_tasks)          setTasksL(state.dk_tasks);
    if(state.dk_task_emps)      setTaskEmpL(state.dk_task_emps);
    if(state.dk_prod_outputs)   setOutputsL(state.dk_prod_outputs);
    if(state.dk_batches)        setBatchesL(state.dk_batches);
    if(state.dk_products)       setProductsL(state.dk_products);
    if(state.dk_raw_mats)       setRawMatsL(state.dk_raw_mats);
    if(state.dk_raw_movements)  setRawMovsL(state.dk_raw_movements);
    if(state.dk_inv_move)       setInvMoveL(state.dk_inv_move);
    if(state.dk_emp_hist)       setEmpHistL(state.dk_emp_hist);
    if(state.dk_prod_plans)     setPlansL(state.dk_prod_plans);
    if(state.dk_notifications)  setNotifsL(state.dk_notifications);
    if(state.dk_logs)           setLogsL(state.dk_logs);
  },[setTasksL,setTaskEmpL,setOutputsL,setBatchesL,setProductsL,setRawMatsL,setRawMovsL,setInvMoveL,setEmpHistL,setPlansL,setNotifsL,setLogsL]);

  const addLog=useCallback(msg=>{
    if(!currentUser) return;
    apiFetch("/api/actions/log",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message:String(msg)}),
    }).catch(()=>{});
  },[currentUser]);

  const addNotification=useCallback((data)=>{
    setNotifications(p=>[...p,{
      id:Date.now()+Math.random(),
      title:data.title||"Уведомление",
      type:data.type||"информация",
      content:data.content||"",
      createdBy:currentUser?.id||0,
      createdAt:new Date().toISOString(),
      readBy:currentUser?[currentUser.id]:[],
      targetAll:data.targetAll||false,
      targetUsers:data.targetUsers||[],
    }]);
  },[currentUser]);

  // ── Single source of truth for production output ──
  // Called by BOTH task completion and manual entry in ProductionOutputPage.
  // Creates: stock+, inventoryMovements, rawMaterials-, rawMovements, employeeHistory, productionPlans, batch.
  const applyOutput=useCallback((out,stockBefore)=>{
    const newBalance=stockBefore+out.quantity;
    setProducts(p=>p.map(x=>x.id===out.productId?{...x,stock:x.stock+out.quantity,updatedAt:new Date().toISOString()}:x));
    setInventoryMovements(p=>[...(p||[]),{id:out.id+0.1,productId:out.productId,type:"output",quantity:out.quantity,balance:newBalance,refId:`output-${out.id}`,createdAt:out.date}]);
    const recipe=recipes.find(r=>r.productId===out.productId);
    if(recipe?.items?.length){
      setRawMaterials(prev=>prev.map(rm=>{
        const item=recipe.items.find(i=>i.rawId===rm.id);
        if(!item) return rm;
        return{...rm,stock:Math.max(0,+(rm.stock-item.qty*out.quantity).toFixed(4)),updatedAt:new Date().toISOString()};
      }));
      setRawMovements(prev=>[...(prev||[]),...recipe.items.map(item=>({
        id:Date.now()+Math.random(),rawId:item.rawId,type:"расход",quantity:+(item.qty*out.quantity).toFixed(4),
        refId:`output-${out.id}`,note:`Выпуск: ${out.quantity} ед. #${out.productId}`,createdAt:out.date
      }))]);
    }
    const ds=out.date.slice(0,10);
    setEmployeeHistory(p=>{
      const ex=p.find(h=>h.employeeId===out.employeeId&&h.date===ds);
      if(ex) return p.map(h=>h.id===ex.id?{...h,producedQty:h.producedQty+out.quantity}:h);
      return[...p,{id:Date.now()+Math.random(),employeeId:out.employeeId,date:ds,attendance:"present",tasksCompleted:0,producedQty:out.quantity,comment:""}];
    });
    setProductionPlans(p=>p.map(pl=>{
      if(pl.productId===out.productId&&pl.productionDate===ds&&pl.status!=="отменён"){
        const nc=Math.min(pl.plannedQty,pl.completedQty+out.quantity);
        return{...pl,completedQty:nc,status:nc>=pl.plannedQty?"выполнен":"в процессе"};
      }return pl;
    }));
    // NOTE: batch is NOT created here. It is created once by the caller:
    //   - doComplete creates 1 batch for the whole task (all workers summed)
    //   - save() in ProductionOutputPage creates 1 batch for a manual entry
    // This prevents N batches when N workers share one task.
  },[recipes,setProducts,setInventoryMovements,setRawMaterials,setRawMovements,setEmployeeHistory,setProductionPlans]);

  // Fully reverses an applyOutput call (stock, movements, raw, history, plans).
  // For task-outputs: only the LAST worker's revert also removes the shared batch (via out.batchId).
  // For manual outputs: out.batchId === out.id + 0.5.
  const revertOutput=useCallback((out)=>{
    setProducts(p=>p.map(x=>x.id===out.productId?{...x,stock:Math.max(0,x.stock-out.quantity),updatedAt:new Date().toISOString()}:x));
    setInventoryMovements(p=>(p||[]).filter(m=>m.refId!==`output-${out.id}`));
    const recipe=recipes.find(r=>r.productId===out.productId);
    if(recipe?.items?.length){
      setRawMaterials(prev=>prev.map(rm=>{
        const item=recipe.items.find(i=>i.rawId===rm.id);
        if(!item) return rm;
        return{...rm,stock:+(rm.stock+item.qty*out.quantity).toFixed(4),updatedAt:new Date().toISOString()};
      }));
      setRawMovements(prev=>(prev||[]).filter(m=>m.refId!==`output-${out.id}`));
    }
    // Remove associated batch (each output carries batchId set at creation time)
    if(out.batchId) setBatches(prev=>(prev||[]).filter(b=>b.id!==out.batchId));
    const ds=out.date.slice(0,10);
    setEmployeeHistory(p=>p.map(h=>h.employeeId===out.employeeId&&h.date===ds?{...h,producedQty:Math.max(0,h.producedQty-out.quantity)}:h));
    setProductionPlans(p=>p.map(pl=>{
      if(pl.productId===out.productId&&pl.productionDate===ds&&pl.status!=="отменён"){
        const nc=Math.max(0,pl.completedQty-out.quantity);
        return{...pl,completedQty:nc,status:nc>=pl.plannedQty?"выполнен":nc>0?"в процессе":"запланирован"};
      }return pl;
    }));
  },[recipes,setProducts,setInventoryMovements,setRawMaterials,setRawMovements,setBatches,setEmployeeHistory,setProductionPlans]);

  const handleLogin=u=>{
    // Store only safe hint (no password) for UI restore on page reload
    const hint={id:u.id,name:u.name,roleId:u.roleId};
    localStorage.setItem("dk_session_hint",JSON.stringify(hint));
    setCurrentUser(u);setPage("dashboard");
    apiFetch("/api/actions/log",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message:"Вход в систему"}),
    }).catch(()=>{});
  };
  const handleLogout=()=>{
    if(currentUser)addLog("Выход");
    fetch("/api/auth/logout",{method:"POST"}).catch(()=>{});
    localStorage.removeItem("dk_session_hint");
    setCurrentUser(null);setPage("dashboard");
  };

  // Register global 401 handler so any usePersisted 401 forces logout
  useEffect(()=>{
    setUnauthorizedHandler(()=>{
      localStorage.removeItem("dk_session_hint");
      setCurrentUser(null);setPage("dashboard");
    });
    return()=>setUnauthorizedHandler(null);
  },[]);

  // Register global write-error handler so any usePersisted save failure
  // surfaces as a visible toast instead of silently rolling back on the next poll.
  useEffect(()=>{
    setWriteErrorHandler((info)=>setSaveError({...info,ts:Date.now()}));
    return()=>setWriteErrorHandler(null);
  },[]);

  const production = tasks.filter(t=>t.status==="завершено").map(t=>({id:t.id,productId:t.productId,userIds:t.userIds||[],quantity:t.quantity,date:t.completedAt,note:t.note}));

  const ctx=useMemo(()=>({
    users,setUsers,products,setProducts,tasks,setTasks,rawMaterials,setRawMaterials,recipes,setRecipes,
    taskEmployees,setTaskEmployees,employeeHistory,setEmployeeHistory,
    productionPlans,setProductionPlans,
    clients,setClients,clientOrders,setClientOrders,
    sales,setSales,inventoryMovements,setInventoryMovements,
    suppliers,setSuppliers,deliveries,setDeliveries,rawMovements,setRawMovements,
    notifications,setNotifications,setNotifsL,marks,setMarks,
    logs,setLogs,addLog,addNotification,currentUser,production,
    setPage,hiddenWarnings,setHiddenWarnings,
    productionOutputs,setProductionOutputs,
    bonusRules,setBonusRules,baseSalaries,setBaseSalaries,
    debts,setDebts,
    batches,setBatches,defects,setDefects,
    payrollRecords,setPayrollRecords,
    cameras,setCameras,
    applyOutput,revertOutput,applyServerState,
  }),[users,products,tasks,rawMaterials,recipes,taskEmployees,employeeHistory,productionPlans,clients,clientOrders,sales,inventoryMovements,suppliers,deliveries,rawMovements,notifications,marks,logs,addLog,addNotification,currentUser,production,page,hiddenWarnings,productionOutputs,bonusRules,baseSalaries,debts,batches,defects,payrollRecords,cameras,applyOutput,revertOutput,applyServerState]);

  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Noto Sans',-apple-system,sans-serif;background:${C.bg};color:${C.text}}
    input,select,textarea,button{font-family:'Noto Sans',-apple-system,sans-serif}
    ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
    @keyframes slideIn{from{transform:translateX(80px);opacity:0}to{transform:translateX(0);opacity:1}}
    @keyframes fadeUp{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
    @keyframes pulseBorder{0%,100%{box-shadow:0 0 0 1px rgba(232,80,80,0.3)}50%{box-shadow:0 0 0 3px rgba(232,80,80,0.6)}}
    @keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:0.3}}
    option{background:${C.surface};color:${C.text}}
    @media(max-width:640px){
      main{padding:10px !important}
      table{font-size:11px}
      .hide-mobile{display:none !important}
    }
  `;

  // Board mode: no login required — kitchen display screen
  if(new URLSearchParams(window.location.search).get("board")==="1"){
    return <OrdersBoardStandalone/>;
  }

  // While checking server session — show nothing to avoid login flash
  if(!sessionChecked){
    return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><style>{globalStyles}</style><div style={{color:C.dim,fontSize:13}}>...</div></div>;
  }

  if(!currentUser) return(
    <AppContext.Provider value={ctx}><style>{globalStyles}</style><LoginPage onLogin={handleLogin}/></AppContext.Provider>
  );

  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isAdmin=role?.name==="admin";
  const isManager=role?.name==="manager";
  const isWorker=role?.name==="worker";
  const isOwner=role?.name==="owner";
  const isSuperAdmin=isAdmin||isOwner; // admin (roleId 1) and owner (roleId 4) see everything
  const isManagerLike=isSuperAdmin||isManager; // admin + owner + manager

  // ── Grouped Navigation ──
  const navGroups = [
    { id:"main", label:"Главная", icon:I.home, items:[
      {id:"dashboard",label:"Главная",ok:true},
    ]},
    { id:"production", label:"Производство", icon:I.factory, items:[
      {id:"tasks",label:"Задания",ok:true},
      {id:"products",label:"Товары",ok:true},
      {id:"prodOutput",label:"Выпуск",ok:true},
      {id:"planning",label:"Планирование",ok:isManagerLike},
      {id:"batches",label:"Партии",ok:isManagerLike},
      {id:"defects",label:"Брак",ok:isManagerLike},
    ]},
    { id:"warehouse", label:"Склад", icon:I.warehouse, items:[
      {id:"raw",label:"Сырьё",ok:isManagerLike},
      {id:"deliveries",label:"Поставки",ok:isManagerLike},
      {id:"procurement",label:"Закупки",ok:isManagerLike},
    ]},
    { id:"sales", label:"Торговля", icon:I.truck, items:[
      {id:"clients",label:"Магазины",ok:isManagerLike},
      {id:"sales",label:"Продажи",ok:isManagerLike},
      {id:"inventory",label:"Движение",ok:isManagerLike},
      {id:"ordersBoard",label:"Доска заказов",ok:isManagerLike},
      {id:"debts",label:"Долги магазинов",ok:isManagerLike},
    ]},
    { id:"staff", label:"Персонал", icon:I.people, items:[
      {id:"empstats",label:"KPI",ok:isManagerLike},
      {id:"salary",label:"Расчёт оплаты",ok:isManagerLike},
      {id:"workerHistory",label:"История",ok:true},
      {id:"marks",label:"Посещаемость",ok:true},
      {id:"users",label:"Пользователи",ok:isSuperAdmin},
    ]},
    { id:"analytics", label:"Аналитика", icon:I.analytics, items:[
      {id:"reports",label:"Отчёты",ok:isManagerLike},
      {id:"profitAnalytics",label:"Прибыль",ok:isManagerLike},
      {id:"logs",label:"Журнал",ok:isSuperAdmin},
    ]},
    { id:"system", label:"Система", icon:I.gear, items:[
      {id:"notifications",label:"Уведомления",ok:true},
      {id:"cameras",label:"Камеры",ok:isManagerLike},
    ]},
  ].map(g=>({...g,items:g.items.filter(i=>i.ok)})).filter(g=>g.items.length>0);

  // Find which group the current page belongs to
  let activeGroupId = "main";
  for(const g of navGroups){
    if(g.items.some(i=>i.id===page)){ activeGroupId=g.id; break; }
  }

  // A group is open if user toggled it open OR it contains the active page
  const isGroupOpen = (gid) => gid===activeGroupId || openGroups.has(gid);

  const toggleGroup=(gid)=>{
    setOpenGroups(prev=>{
      const next=new Set(prev);
      // If it's the active group, always keep it open
      if(gid===activeGroupId) return prev;
      if(next.has(gid)) next.delete(gid); else next.add(gid);
      return next;
    });
  };

  const unreadCount=notifications.filter(n=>(n.targetAll||n.targetUsers?.includes(currentUser.id))&&!n.readBy?.includes(currentUser.id)).length;

  const renderPage=()=>{
    switch(page){
      case "dashboard":return <DashboardPage/>;
      case "tasks":return <TasksPage/>;
      case "products":return <ProductsPage/>;
      case "prodOutput":return <ProductionOutputPage/>;
      case "planning":return isManagerLike?<ProductionPlanPage/>:<DashboardPage/>;
      case "batches":return isManagerLike?<BatchesPage/>:<DashboardPage/>;
      case "defects":return isManagerLike?<DefectsPage/>:<DashboardPage/>;
      case "raw":return isManagerLike?<RawMaterialsPage/>:<DashboardPage/>;
      case "deliveries":return isManagerLike?<DeliveriesPage/>:<DashboardPage/>;
      case "procurement":return isManagerLike?<ProcurementPage/>:<DashboardPage/>;
      case "clients":return isManagerLike?<ClientsPage/>:<DashboardPage/>;
      case "sales":return isManagerLike?<SalesPage/>:<DashboardPage/>;
      case "inventory":return isManagerLike?<InventoryJournalPage/>:<DashboardPage/>;
      case "ordersBoard":return isManagerLike?<OrdersBoardPage/>:<DashboardPage/>;
      case "empstats":return isManagerLike?<EmployeeStatsPage/>:<DashboardPage/>;
      case "salary":return isManagerLike?<PayrollPage/>:<DashboardPage/>;
      case "workerHistory":return <WorkerHistoryPage/>;
      case "notifications":return <NotificationsPage/>;
      case "debts":return isManagerLike?<DebtsPage/>:<DashboardPage/>;
      case "marks":return <MarksPage/>;
      case "reports":return isManagerLike?<ReportsPage/>:<DashboardPage/>;
      case "profitAnalytics":return isManagerLike?<ProfitAnalyticsPage/>:<DashboardPage/>;
      case "users":return isSuperAdmin?<UsersPage/>:<DashboardPage/>;
      case "logs":return isSuperAdmin?<LogsPage/>:<DashboardPage/>;
      case "cameras":return isManagerLike?<CameraPage/>:<DashboardPage/>;
      default:return <DashboardPage/>;
    }
  };

  return(
    <AppContext.Provider value={ctx}>
      <style>{globalStyles}</style>

      {sideOpen&&<div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:998}}/>}
      {!serverOnline&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:1001,background:C.danger,color:"#fff",padding:"5px 16px",fontSize:12,fontWeight:600,textAlign:"center",letterSpacing:.3}}>Нет соединения с сервером — изменения не сохраняются</div>}
      {saveError&&serverOnline&&<div style={{position:"fixed",top:serverOnline?0:26,left:0,right:0,zIndex:1001,background:C.danger,color:"#fff",padding:"5px 16px",fontSize:12,fontWeight:600,textAlign:"center",letterSpacing:.3}}>Изменение не сохранено{saveError.status?` (${saveError.status})`:""} — нет прав или ошибка сервера. Страница будет пересинхронизирована.</div>}

      <aside style={{position:"fixed",top:0,left:0,bottom:0,width:220,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",transition:"transform .3s",zIndex:999,transform:isMobile&&!sideOpen?"translateX(-100%)":"translateX(0)"}}>
        <div style={{padding:"16px 14px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:34,height:34,borderRadius:9,background:`linear-gradient(135deg, ${C.primary}25, ${C.primary}10)`,display:"flex",alignItems:"center",justifyContent:"center",color:C.primary,border:`1px solid ${C.primary}30`}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div><div style={{fontSize:15,fontWeight:800,color:C.text,letterSpacing:.5}}>Dikanish</div><div style={{fontSize:10,color:C.dim}}>v7.0</div></div>
          </div>
        </div>
        <EthnicBorder color={C.primary} height={2}/>
        <nav style={{flex:1,padding:"8px 8px",overflowY:"auto"}}>
          {navGroups.map(group=>{
            const GIco=group.icon;
            const isOpen=isGroupOpen(group.id);
            const groupHasActive=group.items.some(i=>i.id===page);
            const isSingle=group.items.length===1;
            const showBadgeOnGroup=group.id==="system"&&unreadCount>0;

            // Single-item group: render as direct link, no accordion
            if(isSingle){
              const item=group.items[0];
              const active=page===item.id;
              return(
                <button key={group.id} onClick={()=>{setPage(item.id);setSideOpen(false)}} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",border:"none",borderRadius:7,background:active?C.primaryBg:"transparent",color:active?C.primary:C.muted,fontSize:13,fontWeight:active?700:500,cursor:"pointer",fontFamily:"inherit",marginBottom:2,textAlign:"left",borderLeft:active?`3px solid ${C.primary}`:"3px solid transparent",transition:"all .15s"}}>
                  <GIco size={16}/>{group.label}
                  {showBadgeOnGroup&&<span style={{marginLeft:"auto",minWidth:18,height:18,borderRadius:9,background:C.danger,color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px"}}>{unreadCount>9?"9+":unreadCount}</span>}
                </button>
              );
            }

            // Multi-item group: accordion
            return(
              <div key={group.id} style={{marginBottom:4}}>
                <button onClick={()=>toggleGroup(group.id)} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"9px 11px",border:"none",borderRadius:7,background:groupHasActive&&!isOpen?C.primaryBg:"transparent",color:groupHasActive?C.primary:C.muted,fontSize:13,fontWeight:groupHasActive?700:500,cursor:"pointer",fontFamily:"inherit",textAlign:"left",transition:"all .15s"}}>
                  <GIco size={16}/>
                  <span style={{flex:1}}>{group.label}</span>
                  {showBadgeOnGroup&&<span style={{minWidth:18,height:18,borderRadius:9,background:C.danger,color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 5px",marginRight:4}}>{unreadCount>9?"9+":unreadCount}</span>}
                  <span style={{transition:"transform .2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)",opacity:.5,flexShrink:0,display:"flex",alignItems:"center"}}><I.chevDown size={14}/></span>
                </button>
                <div style={{overflow:"hidden",maxHeight:isOpen?`${group.items.length*36+4}px`:"0px",transition:"max-height .25s ease",marginLeft:0}}>
                  {group.items.map(item=>{
                    const active=page===item.id;
                    const showItemBadge=item.id==="notifications"&&unreadCount>0;
                    return(
                      <button key={item.id} onClick={()=>{setPage(item.id);setSideOpen(false)}} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"7px 11px 7px 38px",border:"none",borderRadius:6,background:active?C.primaryBg:"transparent",color:active?C.primary:C.dim,fontSize:12,fontWeight:active?600:400,cursor:"pointer",fontFamily:"inherit",marginBottom:1,textAlign:"left",borderLeft:active?`3px solid ${C.primary}`:"3px solid transparent",transition:"all .15s"}}>
                        {item.label}
                        {showItemBadge&&<span style={{marginLeft:"auto",minWidth:16,height:16,borderRadius:8,background:C.danger,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{unreadCount>9?"9+":unreadCount}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}>
            <div style={{width:30,height:30,borderRadius:7,background:`linear-gradient(135deg, ${C.primary}25, ${C.primary}10)`,display:"flex",alignItems:"center",justifyContent:"center",color:C.primary,fontWeight:800,fontSize:13,border:`1px solid ${C.primary}25`}}>{currentUser.name.charAt(0)}</div>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{currentUser.name.split(" ").slice(0,2).join(" ")}</div><div style={{fontSize:10,color:C.dim}}>{role?.label}</div></div>
          </div>
          <Btn v="secondary" sz="sm" onClick={handleLogout} icon={<I.out size={13}/>} style={{width:"100%",justifyContent:"center"}}>Выйти</Btn>
        </div>
      </aside>

      <div style={{marginLeft:isMobile?0:220,minHeight:"100vh"}}>
        <header style={{padding:"10px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,background:C.surface}}>
          <button onClick={()=>setSideOpen(!sideOpen)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",padding:3}}><I.menu size={20}/></button>
          {/* ── Budget indicator ── */}
          {isManagerLike&&(()=>{
            const totalIncome=sales.reduce((s,sl)=>{const p=products.find(x=>x.id===sl.productId);return s+(p?.sellPrice||0)*sl.quantity},0)+clientOrders.filter(o=>o.status==="отгружен").reduce((s,o)=>s+o.total,0);
            const totalExpense=deliveries.reduce((s,d)=>s+d.totalPrice,0);
            const balance=totalIncome-totalExpense;
            const monthStr=new Date().toISOString().slice(0,7);
            const monthIncome=sales.filter(sl=>sl.createdAt?.startsWith(monthStr)).reduce((s,sl)=>{const p=products.find(x=>x.id===sl.productId);return s+(p?.sellPrice||0)*sl.quantity},0)+clientOrders.filter(o=>o.status==="отгружен"&&o.shippedAt?.startsWith(monthStr)).reduce((s,o)=>s+o.total,0);
            const monthExpense=deliveries.filter(d=>d.date?.startsWith(monthStr)).reduce((s,d)=>s+d.totalPrice,0);
            const monthProfit=monthIncome-monthExpense;
            const emoji=monthProfit>0?"🟢":monthProfit===0?"🟡":"🔴";
            return(
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 12px",background:C.bg,borderRadius:8,border:`1px solid ${C.border}`,cursor:"pointer"}} onClick={()=>setPage("profitAnalytics")} title="Подробная аналитика">
                <span style={{fontSize:12}}>{emoji}</span>
                <div style={{lineHeight:1.2}}>
                  <div style={{fontSize:11,fontWeight:700,color:balance>=0?C.success:C.danger}}>{balance>=0?"+":""}{(balance/1000).toFixed(0)}т ₽</div>
                  <div style={{fontSize:9,color:C.dim}}>мес: {monthProfit>=0?"+":""}{(monthProfit/1000).toFixed(0)}т</div>
                </div>
              </div>
            );
          })()}
          <div style={{flex:1}}/>
          <NotificationBell onGoToPage={setPage}/>
          <Badge color={isSuperAdmin?"danger":isManager?"info":"primary"}>{role?.label}</Badge>
        </header>
        <main style={{padding:20,maxWidth:1200}}>{renderPage()}</main>
      </div>
    </AppContext.Provider>
  );
}
