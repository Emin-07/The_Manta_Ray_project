import { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area } from "recharts";

const AppContext = createContext();
const hashPassword = (p) => btoa(p + "_hashed_salt_2024");

const ROLES = [
  { id: 1, name: "admin",    label: "Администратор"  },
  { id: 2, name: "manager",  label: "Менеджер"       },
  { id: 3, name: "worker",   label: "Сотрудник цеха" },
  { id: 4, name: "owner",    label: "Владелец"       },
];
const CATEGORIES = ["Пельмени","Котлеты","Вареники","Блинчики","Манты","Хинкали","Чебуреки","Голубцы"];
const UNITS = ["кг","шт","уп"];
const STATUSES = ["в производстве","готов","снят с производства"];
const TASK_STATUSES = ["назначено","в работе","завершено","просрочено"];
const RAW_CATEGORIES = ["Мясо","Тесто","Овощи","Специи","Масло","Молочные","Мука","Прочее"];
const RAW_UNITS = ["кг","л","шт","г"];
const NOTIF_TYPES = ["информация","предупреждение","ошибка"];
const MARK_TYPES = ["присутствие","выполненный заказ"];

const fmtDate = (d) => { if(!d) return "\u2014"; const dt=new Date(d); return dt.toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"})+" "+dt.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}); };
const fmtShort = (d) => { if(!d) return "\u2014"; return new Date(d).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"}); };
const fmtTime = (d) => { if(!d) return "\u2014"; return new Date(d).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}); };
const daysBetween = (a,b) => Math.round((new Date(b)-new Date(a))/(1000*60*60*24));
const relTime = (d) => { const diff=Date.now()-new Date(d).getTime(); const m=Math.floor(diff/60000); if(m<1)return "только что"; if(m<60)return `${m} мин назад`; const h=Math.floor(m/60); if(h<24)return `${h}ч назад`; return fmtShort(d); };

// ── Initial Data ──
const INIT_USERS = [
  { id:1, name:"Иванов Иван Иванович", email:"admin@factory.ru", password:hashPassword("admin123"), roleId:1, status:"active", createdAt:"2024-01-15T10:00:00" },
  { id:2, name:"Петрова Мария Сергеевна", email:"manager@factory.ru", password:hashPassword("manager123"), roleId:2, status:"active", createdAt:"2024-02-20T09:00:00" },
  { id:3, name:"Сидоров Алексей Дмитриевич", email:"worker@factory.ru", password:hashPassword("worker123"), roleId:3, status:"active", createdAt:"2024-03-10T08:00:00" },
  { id:4, name:"Козлова Анна Петровна", email:"worker2@factory.ru", password:hashPassword("worker123"), roleId:3, status:"active", createdAt:"2024-03-15T08:00:00" },
  { id:5, name:"Морозов Дмитрий Олегович", email:"worker3@factory.ru", password:hashPassword("worker123"), roleId:3, status:"active", createdAt:"2024-04-01T08:00:00" },
  { id:6, name:"Усманов Рустам Ахмедович", email:"owner@factory.ru",  password:hashPassword("owner123"),  roleId:4, status:"active", createdAt:"2024-01-01T08:00:00" },
];

const INIT_PRODUCTS = [
  { id:1, name:"Пельмени Домашние", category:"Пельмени", description:"Классические с говядиной и бараниной", costPrice:280, sellPrice:450, stock:150, unit:"кг", status:"готов", createdAt:"2024-01-20T10:00:00", updatedAt:"2024-06-01T12:00:00", deleted:false, techCard:["Подготовить тесто пельменное (замес 20 мин)","Подготовить фарш: говядина + баранина + лук + специи","Раскатать тесто, нарезать кружки","Лепка пельменей (ручная или автомат)","Заморозка при -18°C (2 часа)","Упаковка и маркировка"] },
  { id:2, name:"Котлеты По-киевски", category:"Котлеты", description:"Куриные котлеты с маслом", costPrice:320, sellPrice:520, stock:80, unit:"шт", status:"в производстве", createdAt:"2024-02-15T09:00:00", updatedAt:"2024-06-02T14:00:00", deleted:false, techCard:["Отбить куриное филе","Завернуть сливочное масло в филе","Панировка: мука → яйцо → сухари","Обжарка 3 мин с каждой стороны","Доготовка в духовке 15 мин при 180°C","Охлаждение и упаковка"] },
  { id:3, name:"Вареники с картошкой", category:"Вареники", description:"С картофелем и жареным луком", costPrice:200, sellPrice:350, stock:200, unit:"кг", status:"готов", createdAt:"2024-03-01T11:00:00", updatedAt:"2024-06-03T10:00:00", deleted:false, techCard:["Приготовить тесто","Сварить и размять картофель","Обжарить лук, добавить в начинку","Раскатать тесто, вырезать кружки","Лепка вареников","Заморозка и упаковка"] },
  { id:4, name:"Блинчики с мясом", category:"Блинчики", description:"Тонкие блинчики с мясной начинкой", costPrice:250, sellPrice:400, stock:60, unit:"шт", status:"готов", createdAt:"2024-03-15T08:00:00", updatedAt:"2024-06-04T09:00:00", deleted:false, techCard:["Приготовить блинное тесто","Выпечка блинов на сковороде","Приготовить мясную начинку","Завернуть начинку в блины","Обжарка блинчиков","Охлаждение и упаковка"] },
  { id:5, name:"Манты Узбекские", category:"Манты", description:"Традиционные с бараниной", costPrice:350, sellPrice:550, stock:40, unit:"шт", status:"в производстве", createdAt:"2024-04-01T10:00:00", updatedAt:"2024-06-05T11:00:00", deleted:false, techCard:["Подготовить тесто (тонкое раскатывание)","Нарезать баранину и лук кубиками","Добавить специи и курдючный жир","Лепка мантов (классическая форма)","Варка на пару 45 мин","Охлаждение и упаковка"] },
];

const INIT_RAW_MATERIALS = [
  { id:1, name:"Говядина", category:"Мясо", unit:"кг", stock:500, minStock:100, costPerUnit:650, updatedAt:"2024-06-01T10:00:00" },
  { id:2, name:"Телятина", category:"Мясо", unit:"кг", stock:400, minStock:80, costPerUnit:550, updatedAt:"2024-06-01T10:00:00" },
  { id:3, name:"Курица (филе)", category:"Мясо", unit:"кг", stock:300, minStock:60, costPerUnit:380, updatedAt:"2024-06-01T10:00:00" },
  { id:4, name:"Баранина", category:"Мясо", unit:"кг", stock:150, minStock:50, costPerUnit:800, updatedAt:"2024-06-01T10:00:00" },
  { id:5, name:"Тесто пельменное", category:"Тесто", unit:"кг", stock:600, minStock:150, costPerUnit:120, updatedAt:"2024-06-01T10:00:00" },
  { id:6, name:"Тесто блинное", category:"Тесто", unit:"кг", stock:200, minStock:50, costPerUnit:90, updatedAt:"2024-06-01T10:00:00" },
  { id:7, name:"Картофель", category:"Овощи", unit:"кг", stock:800, minStock:200, costPerUnit:45, updatedAt:"2024-06-01T10:00:00" },
  { id:8, name:"Лук репчатый", category:"Овощи", unit:"кг", stock:300, minStock:80, costPerUnit:35, updatedAt:"2024-06-01T10:00:00" },
  { id:9, name:"Масло сливочное", category:"Масло", unit:"кг", stock:100, minStock:30, costPerUnit:900, updatedAt:"2024-06-01T10:00:00" },
  { id:10, name:"Специи (микс)", category:"Специи", unit:"кг", stock:50, minStock:10, costPerUnit:1200, updatedAt:"2024-06-01T10:00:00" },
  { id:11, name:"Соль", category:"Специи", unit:"кг", stock:100, minStock:20, costPerUnit:30, updatedAt:"2024-06-01T10:00:00" },
];

const INIT_RECIPES = [
  { id:1, productId:1, items:[{rawId:1,qty:0.3,unit:"кг"},{rawId:2,qty:0.3,unit:"кг"},{rawId:5,qty:0.4,unit:"кг"},{rawId:8,qty:0.05,unit:"кг"},{rawId:10,qty:0.01,unit:"кг"},{rawId:11,qty:0.02,unit:"кг"}], createdAt:"2024-01-20T10:00:00", updatedAt:"2024-01-20T10:00:00" },
  { id:2, productId:2, items:[{rawId:3,qty:0.15,unit:"кг"},{rawId:9,qty:0.03,unit:"кг"},{rawId:10,qty:0.005,unit:"кг"},{rawId:11,qty:0.01,unit:"кг"}], createdAt:"2024-02-15T09:00:00", updatedAt:"2024-02-15T09:00:00" },
  { id:3, productId:3, items:[{rawId:5,qty:0.4,unit:"кг"},{rawId:7,qty:0.5,unit:"кг"},{rawId:8,qty:0.08,unit:"кг"},{rawId:9,qty:0.02,unit:"кг"},{rawId:11,qty:0.01,unit:"кг"}], createdAt:"2024-03-01T11:00:00", updatedAt:"2024-03-01T11:00:00" },
  { id:4, productId:4, items:[{rawId:1,qty:0.1,unit:"кг"},{rawId:2,qty:0.1,unit:"кг"},{rawId:6,qty:0.2,unit:"кг"},{rawId:8,qty:0.03,unit:"кг"},{rawId:10,qty:0.005,unit:"кг"}], createdAt:"2024-03-15T08:00:00", updatedAt:"2024-03-15T08:00:00" },
  { id:5, productId:5, items:[{rawId:4,qty:0.25,unit:"кг"},{rawId:5,qty:0.35,unit:"кг"},{rawId:8,qty:0.1,unit:"кг"},{rawId:10,qty:0.015,unit:"кг"},{rawId:11,qty:0.02,unit:"кг"}], createdAt:"2024-04-01T10:00:00", updatedAt:"2024-04-01T10:00:00" },
];

const INIT_TASKS = [
  { id:1, productId:1, userIds:[3], quantity:50, status:"завершено", createdAt:"2024-06-01T08:00:00", deadline:"2024-06-01T18:00:00", completedAt:"2024-06-01T16:30:00", note:"Утренняя партия" },
  { id:2, productId:2, userIds:[4], quantity:100, status:"завершено", createdAt:"2024-06-01T08:00:00", deadline:"2024-06-01T18:00:00", completedAt:"2024-06-01T17:00:00", note:"" },
  { id:3, productId:3, userIds:[5], quantity:75, status:"завершено", createdAt:"2024-06-02T08:00:00", deadline:"2024-06-02T18:00:00", completedAt:"2024-06-02T15:00:00", note:"" },
  { id:4, productId:1, userIds:[3,4], quantity:60, status:"завершено", createdAt:"2024-06-03T08:00:00", deadline:"2024-06-03T18:00:00", completedAt:"2024-06-03T19:30:00", note:"Просрочено на 1.5ч" },
  { id:5, productId:4, userIds:[4,5], quantity:120, status:"завершено", createdAt:"2024-06-04T08:00:00", deadline:"2024-06-05T18:00:00", completedAt:"2024-06-04T17:00:00", note:"" },
  { id:6, productId:5, userIds:[3,4,5], quantity:40, status:"завершено", createdAt:"2024-06-05T08:00:00", deadline:"2024-06-05T18:00:00", completedAt:"2024-06-05T16:00:00", note:"" },
  { id:7, productId:1, userIds:[3,5], quantity:80, status:"в работе", createdAt:"2024-06-10T08:00:00", deadline:"2024-06-10T20:00:00", completedAt:null, note:"Крупная партия" },
  { id:8, productId:2, userIds:[4], quantity:60, status:"назначено", createdAt:"2024-06-12T08:00:00", deadline:"2024-06-13T18:00:00", completedAt:null, note:"" },
  { id:9, productId:3, userIds:[3,5], quantity:90, status:"назначено", createdAt:"2024-06-12T08:00:00", deadline:"2024-06-14T18:00:00", completedAt:null, note:"" },
];

// task_employees: individual contribution tracking
const INIT_TASK_EMPLOYEES = [
  { id:1, taskId:1, employeeId:3, producedQty:50, status:"завершено", createdAt:"2024-06-01T08:00:00" },
  { id:2, taskId:2, employeeId:4, producedQty:100, status:"завершено", createdAt:"2024-06-01T08:00:00" },
  { id:3, taskId:3, employeeId:5, producedQty:75, status:"завершено", createdAt:"2024-06-02T08:00:00" },
  { id:4, taskId:4, employeeId:3, producedQty:35, status:"завершено", createdAt:"2024-06-03T08:00:00" },
  { id:5, taskId:4, employeeId:4, producedQty:25, status:"завершено", createdAt:"2024-06-03T08:00:00" },
  { id:6, taskId:5, employeeId:4, producedQty:70, status:"завершено", createdAt:"2024-06-04T08:00:00" },
  { id:7, taskId:5, employeeId:5, producedQty:50, status:"завершено", createdAt:"2024-06-04T08:00:00" },
  { id:8, taskId:6, employeeId:3, producedQty:15, status:"завершено", createdAt:"2024-06-05T08:00:00" },
  { id:9, taskId:6, employeeId:4, producedQty:15, status:"завершено", createdAt:"2024-06-05T08:00:00" },
  { id:10, taskId:6, employeeId:5, producedQty:10, status:"завершено", createdAt:"2024-06-05T08:00:00" },
  { id:11, taskId:7, employeeId:3, producedQty:0, status:"в работе", createdAt:"2024-06-10T08:00:00" },
  { id:12, taskId:7, employeeId:5, producedQty:0, status:"в работе", createdAt:"2024-06-10T08:00:00" },
  { id:13, taskId:8, employeeId:4, producedQty:0, status:"назначено", createdAt:"2024-06-12T08:00:00" },
  { id:14, taskId:9, employeeId:3, producedQty:0, status:"назначено", createdAt:"2024-06-12T08:00:00" },
  { id:15, taskId:9, employeeId:5, producedQty:0, status:"назначено", createdAt:"2024-06-12T08:00:00" },
];

// employee_history: daily activity log
const INIT_EMPLOYEE_HISTORY = [
  { id:1, employeeId:3, date:"2024-06-01", attendance:"present", tasksCompleted:1, producedQty:50, workStart:"09:00", workEnd:"16:30", comment:"Пришёл вовремя" },
  { id:2, employeeId:4, date:"2024-06-01", attendance:"present", tasksCompleted:1, producedQty:100, workStart:"09:00", workEnd:"17:00", comment:"" },
  { id:3, employeeId:5, date:"2024-06-01", attendance:"present", tasksCompleted:0, producedQty:0, workStart:"09:02", workEnd:"18:00", comment:"Опоздание 2 мин" },
  { id:4, employeeId:3, date:"2024-06-02", attendance:"present", tasksCompleted:0, producedQty:0, workStart:"08:50", workEnd:"18:00", comment:"" },
  { id:5, employeeId:4, date:"2024-06-02", attendance:"present", tasksCompleted:0, producedQty:0, workStart:"09:00", workEnd:"18:00", comment:"" },
  { id:6, employeeId:5, date:"2024-06-02", attendance:"present", tasksCompleted:1, producedQty:75, workStart:"09:00", workEnd:"15:00", comment:"Отлично" },
  { id:7, employeeId:3, date:"2024-06-03", attendance:"present", tasksCompleted:1, producedQty:35, workStart:"08:45", workEnd:"19:30", comment:"Задание просрочено" },
  { id:8, employeeId:4, date:"2024-06-03", attendance:"present", tasksCompleted:1, producedQty:25, workStart:"09:00", workEnd:"19:30", comment:"" },
  { id:9, employeeId:5, date:"2024-06-03", attendance:"absent", tasksCompleted:0, producedQty:0, workStart:"", workEnd:"", comment:"Больничный" },
  { id:10, employeeId:4, date:"2024-06-04", attendance:"present", tasksCompleted:1, producedQty:70, workStart:"09:00", workEnd:"17:00", comment:"" },
  { id:11, employeeId:5, date:"2024-06-04", attendance:"present", tasksCompleted:1, producedQty:50, workStart:"09:00", workEnd:"17:00", comment:"" },
  { id:12, employeeId:3, date:"2024-06-05", attendance:"present", tasksCompleted:1, producedQty:15, workStart:"09:00", workEnd:"16:00", comment:"" },
  { id:13, employeeId:4, date:"2024-06-05", attendance:"present", tasksCompleted:1, producedQty:15, workStart:"09:00", workEnd:"16:00", comment:"" },
  { id:14, employeeId:5, date:"2024-06-05", attendance:"present", tasksCompleted:1, producedQty:10, workStart:"09:00", workEnd:"16:00", comment:"" },
];

// production_plans
const INIT_PRODUCTION_PLANS = [
  { id:1, productId:1, plannedQty:200, completedQty:120, productionDate:"2024-06-10", employeeIds:[3,4], createdBy:1, createdAt:"2024-06-08T10:00:00", status:"в процессе" },
  { id:2, productId:2, plannedQty:150, completedQty:150, productionDate:"2024-06-11", employeeIds:[4,5], createdBy:2, createdAt:"2024-06-09T09:00:00", status:"выполнен" },
  { id:3, productId:3, plannedQty:100, completedQty:0, productionDate:"2024-06-12", employeeIds:[3,5], createdBy:2, createdAt:"2024-06-10T08:00:00", status:"запланирован" },
  { id:4, productId:5, plannedQty:80, completedQty:40, productionDate:"2024-06-12", employeeIds:[3,4,5], createdBy:1, createdAt:"2024-06-10T08:30:00", status:"в процессе" },
  { id:5, productId:1, plannedQty:300, completedQty:0, productionDate:"2024-06-15", employeeIds:[3,4], createdBy:2, createdAt:"2024-06-12T09:00:00", status:"запланирован" },
  { id:6, productId:4, plannedQty:200, completedQty:0, productionDate:"2024-06-16", employeeIds:[4,5], createdBy:2, createdAt:"2024-06-12T09:30:00", status:"запланирован" },
];
const PLAN_STATUSES = ["запланирован","в процессе","выполнен","отменён"];

// Clients
const INIT_CLIENTS = [
  { id:1, name:'Магазин "Халяль"', contact:"Ахмед Магомедов", phone:"+7(928)100-20-30", email:"halal@shop.ru", address:"ул. Ленина 15", comment:"Постоянный клиент", createdAt:"2024-02-01T10:00:00" },
  { id:2, name:'Кафе "Домашнее"', contact:"Марина Иванова", phone:"+7(928)200-30-40", email:"home@cafe.ru", address:"пр. Мира 42", comment:"Заказ каждую неделю", createdAt:"2024-03-10T09:00:00" },
  { id:3, name:'Супермаркет "Свежесть"', contact:"Олег Петров", phone:"+7(928)300-40-50", email:"fresh@market.ru", address:"ул. Победы 8", comment:"Крупные партии", createdAt:"2024-04-15T11:00:00" },
];
const ORDER_STATUSES = ["новый","сборка","в производстве","готов","отгружен","отменён"];
const ORDER_PRIORITIES = ["нормальный","важный","срочный"];
const BOARD_COLUMNS = [
  {id:"новый",          label:"Новые"},
  {id:"сборка",         label:"Сборка"},
  {id:"в производстве", label:"В производстве"},
  {id:"готов",          label:"Готово ✓"},
];
const INIT_CLIENT_ORDERS = [
  { id:1, clientId:1, items:[{productId:1,qty:100},{productId:2,qty:50}], orderDate:"2024-06-01T10:00:00", status:"отгружен", total:67000, note:"", priority:"нормальный", statusChangedAt:"2024-06-02T14:00:00", shippedAt:"2024-06-02T14:00:00", shippedBy:2 },
  { id:2, clientId:2, items:[{productId:3,qty:50},{productId:4,qty:80}], orderDate:"2024-06-05T09:00:00", status:"отгружен", total:49500, note:"Срочный заказ", priority:"срочный", statusChangedAt:"2024-06-06T10:00:00", shippedAt:"2024-06-06T10:00:00", shippedBy:2 },
  { id:3, clientId:1, items:[{productId:1,qty:200},{productId:5,qty:40}], orderDate:"2024-06-10T10:00:00", status:"в производстве", total:112000, note:"", priority:"важный", statusChangedAt:"2024-06-10T11:00:00", shippedAt:null, shippedBy:null },
  { id:4, clientId:3, items:[{productId:1,qty:300},{productId:2,qty:100},{productId:3,qty:150}], orderDate:"2024-06-12T08:00:00", status:"новый", total:239500, note:"Большой заказ", priority:"нормальный", statusChangedAt:"2024-06-12T08:00:00", shippedAt:null, shippedBy:null },
];

// Sales (quick sales)
const INIT_SALES = [
  { id:1, productId:1, quantity:50, clientId:1, soldBy:2, createdAt:"2024-06-03T11:00:00" },
  { id:2, productId:2, quantity:30, clientId:null, soldBy:2, createdAt:"2024-06-04T15:00:00" },
  { id:3, productId:3, quantity:20, clientId:2, soldBy:2, createdAt:"2024-06-06T12:00:00" },
];

// Inventory movements journal
const MOVEMENT_TYPES = {production:"Производство",output:"Выпуск (ручной)",sale:"Продажа",order_shipment:"Отгрузка заказа",manual_adjustment:"Коррекция"};
const INIT_INVENTORY_MOVEMENTS = [
  { id:1, productId:1, type:"production", quantity:50, balance:200, refId:"task-1", createdAt:"2024-06-01T16:30:00" },
  { id:2, productId:2, type:"production", quantity:100, balance:180, refId:"task-2", createdAt:"2024-06-01T17:00:00" },
  { id:3, productId:1, type:"order_shipment", quantity:-100, balance:100, refId:"order-1", createdAt:"2024-06-02T14:00:00" },
  { id:4, productId:1, type:"sale", quantity:-50, balance:50, refId:"sale-1", createdAt:"2024-06-03T11:00:00" },
  { id:5, productId:3, type:"order_shipment", quantity:-50, balance:150, refId:"order-2", createdAt:"2024-06-06T10:00:00" },
];

const INIT_SUPPLIERS = [
  { id:1, name:"МясоТорг", contact:"+7(495)123-45-67", email:"info@myasotorg.ru" },
  { id:2, name:"ТестоПром", contact:"+7(495)234-56-78", email:"sales@testoprom.ru" },
  { id:3, name:"АгроФерма", contact:"+7(495)345-67-89", email:"zakaz@agro.ru" },
  { id:4, name:"СпецМикс", contact:"+7(495)456-78-90", email:"opt@specmix.ru" },
];

const INIT_DELIVERIES = [
  { id:1, supplierId:1, rawId:1, quantity:200, pricePerUnit:630, totalPrice:126000, date:"2024-06-01T10:00:00", userId:2 },
  { id:2, supplierId:1, rawId:2, quantity:150, pricePerUnit:530, totalPrice:79500, date:"2024-06-01T10:00:00", userId:2 },
  { id:3, supplierId:2, rawId:5, quantity:300, pricePerUnit:110, totalPrice:33000, date:"2024-06-02T09:00:00", userId:2 },
  { id:4, supplierId:3, rawId:7, quantity:500, pricePerUnit:40, totalPrice:20000, date:"2024-06-03T11:00:00", userId:2 },
  { id:5, supplierId:3, rawId:8, quantity:200, pricePerUnit:30, totalPrice:6000, date:"2024-06-03T11:00:00", userId:2 },
  { id:6, supplierId:4, rawId:10, quantity:20, pricePerUnit:1100, totalPrice:22000, date:"2024-06-05T14:00:00", userId:2 },
  { id:7, supplierId:1, rawId:3, quantity:100, pricePerUnit:360, totalPrice:36000, date:"2024-06-07T10:00:00", userId:2 },
];

const INIT_RAW_MOVEMENTS = [
  { id:1, rawId:1, type:"in", quantity:200, reason:"Поставка #1", date:"2024-06-01T10:00:00" },
  { id:2, rawId:2, type:"in", quantity:150, reason:"Поставка #2", date:"2024-06-01T10:00:00" },
  { id:3, rawId:1, type:"out", quantity:15, reason:"Задание #1: Пельмени 50кг", date:"2024-06-01T16:30:00" },
  { id:4, rawId:5, type:"in", quantity:300, reason:"Поставка #3", date:"2024-06-02T09:00:00" },
  { id:5, rawId:7, type:"in", quantity:500, reason:"Поставка #4", date:"2024-06-03T11:00:00" },
];

const INIT_NOTIFICATIONS = [
  { id:1, title:"Система запущена", type:"информация", content:"Система управления производством успешно запущена.", createdBy:1, createdAt:"2024-06-01T08:00:00", readBy:[1], targetAll:true, targetUsers:[] },
  { id:2, title:"Низкий остаток: Специи (микс)", type:"предупреждение", content:"Остаток специй приближается к минимальному уровню. Текущий запас: 50 кг при минимуме 10 кг.", createdBy:0, createdAt:"2024-06-03T09:00:00", readBy:[], targetAll:true, targetUsers:[] },
  { id:3, title:"Задание #1 выполнено", type:"информация", content:"Сидоров А.Д. завершил задание: Пельмени Домашние x50 кг.", createdBy:0, createdAt:"2024-06-01T16:30:00", readBy:[1,2], targetAll:true, targetUsers:[] },
  { id:4, title:"Задание #4 просрочено", type:"ошибка", content:"Сидоров А.Д. просрочил задание #4: Пельмени Домашние x60 кг на 1.5 часа.", createdBy:0, createdAt:"2024-06-03T19:30:00", readBy:[1], targetAll:true, targetUsers:[] },
  { id:5, title:"Новая поставка от МясоТорг", type:"информация", content:"Получена поставка: Говядина 200 кг, Телятина 150 кг.", createdBy:0, createdAt:"2024-06-01T10:00:00", readBy:[1,2], targetAll:true, targetUsers:[] },
  { id:6, title:"Пропущена отметка присутствия", type:"предупреждение", content:"Козлова А.П. не отметилась на смене 2024-06-05.", createdBy:0, createdAt:"2024-06-05T10:00:00", readBy:[], targetAll:false, targetUsers:[1,2,4] },
  { id:7, title:"Обновление системы", type:"информация", content:"Добавлены модули: управление поставками, KPI сотрудников, рецептуры.", createdBy:1, createdAt:"2024-06-10T08:00:00", readBy:[1], targetAll:true, targetUsers:[] },
];

const INIT_MARKS = [
  { id:1, employeeId:3, markType:"присутствие", relatedTaskId:null, createdBy:2, createdAt:"2024-06-01T07:55:00", comment:"Пришёл вовремя" },
  { id:2, employeeId:4, markType:"присутствие", relatedTaskId:null, createdBy:2, createdAt:"2024-06-01T07:58:00", comment:"" },
  { id:3, employeeId:5, markType:"присутствие", relatedTaskId:null, createdBy:2, createdAt:"2024-06-01T08:02:00", comment:"Опоздание 2 мин" },
  { id:4, employeeId:3, markType:"выполненный заказ", relatedTaskId:1, createdBy:2, createdAt:"2024-06-01T16:30:00", comment:"Выполнено качественно" },
  { id:5, employeeId:4, markType:"выполненный заказ", relatedTaskId:2, createdBy:2, createdAt:"2024-06-01T17:00:00", comment:"" },
  { id:6, employeeId:3, markType:"присутствие", relatedTaskId:null, createdBy:2, createdAt:"2024-06-02T07:50:00", comment:"" },
  { id:7, employeeId:4, markType:"присутствие", relatedTaskId:null, createdBy:2, createdAt:"2024-06-02T08:00:00", comment:"" },
  { id:8, employeeId:5, markType:"выполненный заказ", relatedTaskId:3, createdBy:2, createdAt:"2024-06-02T15:00:00", comment:"Отлично" },
  { id:9, employeeId:3, markType:"присутствие", relatedTaskId:null, createdBy:2, createdAt:"2024-06-03T07:45:00", comment:"" },
  { id:10, employeeId:3, markType:"выполненный заказ", relatedTaskId:4, createdBy:1, createdAt:"2024-06-03T19:30:00", comment:"Задание просрочено на 1.5ч" },
];

// ── Production Outputs initial data ──
const INIT_PRODUCTION_OUTPUTS = [];

// Debts: { id, userId, amount, remaining, description, date, dueDate, status, comment, payments, createdAt }
// status: "активен" | "частично погашен" | "погашен"
const INIT_DEBTS = [];
const DEBT_STATUSES = ["активен","частично погашен","погашен"];

// ── Cameras ──
// Supported browser-native types (no backend required):
//   demo    — animated CSS placeholder (always works)
//   iframe  — any URL in an iframe (web NVR, WebRTC gateways, camera web-UI)
//   image   — JPEG snapshot polled every N seconds via <img src>
//   mjpeg   — MJPEG stream via <img src> (browser handles the multipart stream)
//   mp4     — HTML5 <video> with mp4 source
//   hls     — HLS .m3u8 (native Safari; Chrome needs hls.js — shows advisory)
// NOT supported directly (requires proxy/gateway):
//   rtsp    — RTSP is not a browser protocol; needs WebRTC or HLS gateway
const CAMERA_SOURCE_TYPES = ["demo","iframe","image","mjpeg","mp4","hls","rtsp"];
const CAMERA_SOURCE_LABELS = {demo:"Демо (заглушка)",iframe:"iframe / Web UI",image:"JPEG snapshot",mjpeg:"MJPEG поток",mp4:"MP4 видео",hls:"HLS (.m3u8)",rtsp:"RTSP (не поддержан)"};
const CAMERA_ZONES = ["Цех","Склад","Вход","Офис","Улица","Прочее"];
const INIT_CAMERAS = [
  {id:1, name:"Цех — линия 1",      zone:"Цех",    type:"demo", url:"", enabled:true,  description:"Производственная линия №1", refreshSec:5},
  {id:2, name:"Склад готовой продукции", zone:"Склад",  type:"demo", url:"", enabled:true,  description:"Зона хранения",           refreshSec:5},
  {id:3, name:"Вход в здание",       zone:"Вход",   type:"demo", url:"", enabled:true,  description:"Главный вход",              refreshSec:5},
  {id:4, name:"Офис менеджера",      zone:"Офис",   type:"demo", url:"", enabled:true,  description:"Рабочее место менеджера",   refreshSec:5},
];

// Bonus threshold rules: find highest fromQty ≤ employee's qty → bonusPercent
const INIT_BONUS_RULES = [
  { id:1, fromQty:0,   bonusPercent:0,  label:"Стандарт"     },
  { id:2, fromQty:100, bonusPercent:5,  label:"Хорошо"       },
  { id:3, fromQty:250, bonusPercent:10, label:"Отлично"      },
  { id:4, fromQty:500, bonusPercent:15, label:"Топ результат"},
  { id:5, fromQty:800, bonusPercent:20, label:"Рекорд"       },
];

// baseSalaries: { [userId]: number } — optional, stored separately from users
const INIT_BASE_SALARIES = {};

// ── useLocalStorage: device-local persistent state (no server sync) ──
function useLocalStorage(key, init) {
  const [val, setValRaw] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : (typeof init === "function" ? init() : init);
    } catch { return typeof init === "function" ? init() : init; }
  });
  const setVal = useCallback((updater) => {
    setValRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [key]); // eslint-disable-line
  return [val, setVal];
}

// ── usePersisted: API-backed state with polling sync between users ──
const POLL_INTERVAL = 6000; // ms between sync checks

function usePersisted(key, init) {
  const initVal = typeof init === "function" ? init() : init;
  const [val, setValRaw] = useState(initVal);
  const lastSaved = useRef(null); // stringified last known server value

  // On mount: load from server
  useEffect(() => {
    fetch(`/api/state/${key}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data !== null) {
          lastSaved.current = JSON.stringify(data);
          setValRaw(data);
        }
      })
      .catch(() => {});
  }, [key]); // eslint-disable-line

  // Polling: sync from server every POLL_INTERVAL ms
  useEffect(() => {
    const id = setInterval(() => {
      fetch(`/api/state/${key}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data !== null) {
            const serialized = JSON.stringify(data);
            if (serialized !== lastSaved.current) {
              lastSaved.current = serialized;
              setValRaw(data);
            }
          }
        })
        .catch(() => {});
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [key]); // eslint-disable-line

  const setVal = useCallback((updater) => {
    setValRaw(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const serialized = JSON.stringify(next);
      lastSaved.current = serialized;
      fetch(`/api/state/${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: serialized,
      }).catch(() => {});
      return next;
    });
  }, [key]); // eslint-disable-line

  return [val, setVal];
}

// ── Icons ──
const Ic = ({d,size=20}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
const I = {
  home: (p)=><Ic {...p} d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10"/>,
  users: (p)=><Ic {...p} d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"/>,
  box: (p)=><Ic {...p} d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12"/>,
  tool: (p)=><Ic {...p} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>,
  chart: (p)=><Ic {...p} d="M18 20V10 M12 20V4 M6 20v-6"/>,
  file: (p)=><Ic {...p} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"/>,
  search: (p)=><Ic {...p} d="M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z M21 21l-4.35-4.35"/>,
  plus: (p)=><Ic {...p} d="M12 5v14 M5 12h14"/>,
  edit: (p)=><Ic {...p} d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>,
  trash: (p)=><Ic {...p} d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>,
  x: (p)=><Ic {...p} d="M18 6L6 18 M6 6l12 12"/>,
  menu: (p)=><Ic {...p} d="M3 12h18 M3 6h18 M3 18h18"/>,
  out: (p)=><Ic {...p} d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9"/>,
  lock: (p)=><Ic {...p} d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4"/>,
  unlock: (p)=><Ic {...p} d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 9.9-1"/>,
  alert: (p)=><Ic {...p} d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01"/>,
  clock: (p)=><Ic {...p} d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6v6l4 2"/>,
  check: (p)=><Ic {...p} d="M20 6L9 17l-5-5"/>,
  truck: (p)=><Ic {...p} d="M1 3h15v13H1z M16 8h4l3 3v5h-7V8z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>,
  raw: (p)=><Ic {...p} d="M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5"/>,
  tasks: (p)=><Ic {...p} d="M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>,
  star: (p)=><Ic {...p} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>,
  target: (p)=><Ic {...p} d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>,
  recipe: (p)=><Ic {...p} d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>,
  down: (p)=><Ic {...p} d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3"/>,
  eye: (p)=><Ic {...p} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>,
  bell: (p)=><Ic {...p} d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0"/>,
  clip: (p)=><Ic {...p} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 M9 14l2 2 4-4"/>,
  user: (p)=><Ic {...p} d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>,
  mail: (p)=><Ic {...p} d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6"/>,
  send: (p)=><Ic {...p} d="M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z"/>,
  chevDown: (p)=><Ic {...p} d="M6 9l6 6 6-6"/>,
  factory: (p)=><Ic {...p} d="M2 20h20 M5 20V10l4-6h6l4 6v10 M9 20v-4h6v4 M9 10h6"/>,
  warehouse: (p)=><Ic {...p} d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35z M6 18h12 M6 14h12 M11 10h2"/>,
  people: (p)=><Ic {...p} d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>,
  analytics: (p)=><Ic {...p} d="M21 12h-4l-3 9L9 3l-3 9H2"/>,
  gear: (p)=><Ic {...p} d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>,
};

// ── Chechen-inspired Color Palette ──
const C = {
  bg:"#1A1510",surface:"#231E17",surface2:"#2E271E",border:"#3D3428",text:"#F0E8DD",muted:"#A89882",dim:"#6B5D4D",
  primary:"#C8963E",primaryBg:"rgba(200,150,62,0.12)",
  success:"#5A9E5F",successBg:"rgba(90,158,95,0.12)",
  danger:"#C44E3D",dangerBg:"rgba(196,78,61,0.12)",
  info:"#5B8DB5",infoBg:"rgba(91,141,181,0.12)",
  purple:"#8B6FAE",purpleBg:"rgba(139,111,174,0.12)",
  cyan:"#4E9E9A",cyanBg:"rgba(78,158,154,0.12)",
  pink:"#B86B8A",pinkBg:"rgba(184,107,138,0.12)",
  orange:"#D4823A",orangeBg:"rgba(212,130,58,0.12)",
  accent1:"#7B8F3E",accent1Bg:"rgba(123,143,62,0.12)",
};
const CC = ["#C8963E","#5A9E5F","#5B8DB5","#C44E3D","#8B6FAE","#B86B8A","#4E9E9A","#D4823A"];

// Decorative SVG pattern for ethnic border
const EthnicBorder = ({color=C.primary, height=3}) => (
  <div style={{width:"100%",height,background:`repeating-linear-gradient(90deg, ${color} 0px, ${color} 8px, transparent 8px, transparent 12px, ${color}80 12px, ${color}80 16px, transparent 16px, transparent 24px)`,opacity:0.6,borderRadius:1}}/>
);

const EthnicCorner = ({size=20,color=C.primary,position="topLeft"}) => {
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

// ── UI Components ──
const Badge = ({children,color="primary",s={}}) => {
  const m={primary:{bg:C.primaryBg,c:C.primary},success:{bg:C.successBg,c:C.success},danger:{bg:C.dangerBg,c:C.danger},info:{bg:C.infoBg,c:C.info},purple:{bg:C.purpleBg,c:C.purple},cyan:{bg:C.cyanBg,c:C.cyan},pink:{bg:C.pinkBg,c:C.pink},orange:{bg:C.orangeBg,c:C.orange}};
  const v=m[color]||m.primary;
  return <span style={{display:"inline-flex",alignItems:"center",padding:"3px 10px",borderRadius:6,fontSize:12,fontWeight:600,background:v.bg,color:v.c,letterSpacing:.3,border:`1px solid ${v.c}20`,...s}}>{children}</span>;
};

const Btn = ({children,onClick,v="primary",sz="md",disabled,style={},icon})=>{
  const base={display:"inline-flex",alignItems:"center",gap:6,border:"none",borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontWeight:600,fontFamily:"inherit",transition:"all .15s",opacity:disabled?.5:1,whiteSpace:"nowrap"};
  const sizes={sm:{padding:"5px 11px",fontSize:13},md:{padding:"8px 16px",fontSize:14},lg:{padding:"11px 22px",fontSize:15}};
  const vars={primary:{background:`linear-gradient(135deg, ${C.primary}, #A67B2E)`,color:"#1A1510",boxShadow:`0 2px 8px ${C.primary}30`},secondary:{background:C.surface2,color:C.text,border:`1px solid ${C.border}`},danger:{background:C.dangerBg,color:C.danger,border:`1px solid rgba(196,78,61,.25)`},ghost:{background:"transparent",color:C.muted},success:{background:`linear-gradient(135deg, ${C.success}, #4A8E4F)`,color:"#1A1510"}};
  return <button onClick={disabled?undefined:onClick} style={{...base,...sizes[sz],...vars[v],...style}}>{icon}{children}</button>;
};

const Inp = ({label,error,style={},cStyle={},...r})=>(
  <div style={{marginBottom:12,...cStyle}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:500,color:C.muted,marginBottom:4}}>{label}</label>}
    <input style={{width:"100%",padding:"8px 11px",background:C.bg,border:`1px solid ${error?C.danger:C.border}`,borderRadius:7,color:C.text,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",...style}} onFocus={e=>{e.target.style.borderColor=C.primary;e.target.style.boxShadow=`0 0 0 2px ${C.primary}20`}} onBlur={e=>{e.target.style.borderColor=error?C.danger:C.border;e.target.style.boxShadow="none"}} {...r}/>
    {error&&<div style={{color:C.danger,fontSize:11,marginTop:2}}>{error}</div>}
  </div>
);

const Sel = ({label,options,error,cStyle={},...r})=>(
  <div style={{marginBottom:12,...cStyle}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:500,color:C.muted,marginBottom:4}}>{label}</label>}
    <select style={{width:"100%",padding:"8px 11px",background:C.bg,border:`1px solid ${error?C.danger:C.border}`,borderRadius:7,color:C.text,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",appearance:"none"}} {...r}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Txa = ({label,cStyle={},...r})=>(
  <div style={{marginBottom:12,...cStyle}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:500,color:C.muted,marginBottom:4}}>{label}</label>}
    <textarea style={{width:"100%",padding:"8px 11px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:14,fontFamily:"inherit",outline:"none",boxSizing:"border-box",resize:"vertical",minHeight:70}} {...r}/>
  </div>
);

const Modal = ({open,onClose,title,children,width=520})=>{
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

const Confirm = ({open,onClose,onConfirm,title,message})=>(
  <Modal open={open} onClose={onClose} title={title} width={400}>
    <p style={{color:C.muted,margin:"0 0 18px",lineHeight:1.5}}>{message}</p>
    <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
      <Btn v="secondary" onClick={onClose}>Отмена</Btn>
      <Btn v="danger" onClick={onConfirm}>Подтвердить</Btn>
    </div>
  </Modal>
);

const Stat = ({icon,label,value,color=C.primary,sub})=>(
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

const Toast = ({message,type="success",onClose})=>{
  useEffect(()=>{const t=setTimeout(onClose,3000);return()=>clearTimeout(t)},[onClose]);
  const c={success:C.success,error:C.danger,info:C.info,warn:C.primary};
  return(
    <div style={{position:"fixed",top:20,right:20,zIndex:9999,background:C.surface,border:`1px solid ${c[type]}40`,borderRadius:10,padding:"10px 18px",boxShadow:`0 8px 30px rgba(0,0,0,.4)`,display:"flex",alignItems:"center",gap:8,animation:"slideIn .3s ease"}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:c[type]}}/>
      <span style={{color:C.text,fontSize:13}}>{message}</span>
    </div>
  );
};

const TH = ({children}) => <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",letterSpacing:.5,borderBottom:`1px solid ${C.border}`,background:C.surface2}}>{children}</th>;
const TD = ({children,s={}}) => <td style={{padding:"10px 14px",fontSize:13,color:C.text,...s}}>{children}</td>;

const Card = ({children,s={}})=><div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:18,position:"relative",...s}}>{children}</div>;
const Title = ({children})=><h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700,color:C.text}}>{children}</h3>;
const PageH = ({title,children})=>(
  <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:18}}>
    <h1 style={{margin:0,fontSize:21,fontWeight:800,color:C.text}}>{title}</h1>
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{children}</div>
  </div>
);
const SearchBox = ({value,onChange,ph="Поиск..."})=>(
  <div style={{position:"relative"}}>
    <input placeholder={ph} value={value} onChange={onChange} style={{padding:"7px 11px 7px 32px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:13,fontFamily:"inherit",outline:"none",width:180}}/>
    <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:C.dim}}><I.search size={15}/></span>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════
const LoginPage = ({onLogin})=>{
  const [email,setEmail]=useState("admin@factory.ru");
  const [pw,setPw]=useState("admin123");
  const [err,setErr]=useState("");
  const {users}=useContext(AppContext);
  const go=()=>{
    const u=users.find(x=>x.email===email);
    if(!u) return setErr("Пользователь не найден");
    if(u.password!==hashPassword(pw)) return setErr("Неверный пароль");
    if(u.status==="blocked") return setErr("Аккаунт заблокирован");
    setErr(""); onLogin(u);
  };
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`radial-gradient(ellipse at 30% 20%, #2A2218 0%, ${C.bg} 70%)`,padding:20}}>
      <div style={{width:"100%",maxWidth:400,background:C.surface,borderRadius:16,border:`1px solid ${C.border}`,padding:0,boxShadow:`0 20px 60px rgba(0,0,0,.4), 0 0 80px ${C.primary}08`,overflow:"hidden"}}>
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
          {err&&<div style={{background:C.dangerBg,border:`1px solid rgba(196,78,61,.25)`,borderRadius:7,padding:"8px 12px",marginBottom:14,display:"flex",alignItems:"center",gap:7,color:C.danger,fontSize:12}}><I.alert size={15}/>{err}</div>}
          <Inp label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)}/>
          <Inp label="Пароль" type="password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()}/>
          <Btn onClick={go} style={{width:"100%",justifyContent:"center",padding:11,marginTop:4}} sz="lg">Войти</Btn>
          <div style={{marginTop:18,padding:12,background:C.bg,borderRadius:7,fontSize:11,color:C.dim,lineHeight:1.6,border:`1px solid ${C.border}`}}>
            <strong style={{color:C.muted}}>Демо:</strong><br/>admin@factory.ru / admin123<br/>manager@factory.ru / manager123<br/>worker@factory.ru / worker123<br/>owner@factory.ru / owner123
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION BELL (Header Dropdown)
// ═══════════════════════════════════════════════════════════════
const NotificationBell = ({onGoToPage})=>{
  const {notifications,setNotifications,currentUser,users}=useContext(AppContext);
  const [open,setOpen]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h)},[]);

  const visible=useMemo(()=>{
    return notifications.filter(n=>n.targetAll||n.targetUsers?.includes(currentUser.id)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },[notifications,currentUser]);

  const unread=visible.filter(n=>!n.readBy?.includes(currentUser.id)).length;

  const markRead=(id)=>{
    setNotifications(p=>p.map(n=>n.id===id?{...n,readBy:[...(n.readBy||[]).filter(x=>x!==currentUser.id),currentUser.id]}:n));
  };
  const markAllRead=()=>{
    setNotifications(p=>p.map(n=>{
      if((n.targetAll||n.targetUsers?.includes(currentUser.id))&&!n.readBy?.includes(currentUser.id)){
        return {...n,readBy:[...(n.readBy||[]),currentUser.id]};
      }
      return n;
    }));
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

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
const DashboardPage = ()=>{
  const {products,users,currentUser,tasks,rawMaterials,deliveries,notifications,marks,taskEmployees,recipes,clientOrders,sales,productionPlans,setPage,hiddenWarnings,setHiddenWarnings,productionOutputs}=useContext(AppContext);
  const ap=products.filter(p=>!p.deleted);
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const canSeeFinance=role?.name!=="worker";
  const isWorker=role?.name==="worker";
  const isAdmin=role?.name==="admin";
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

  // Absent workers today
  const todayPresence=marks.filter(m=>m.markType==="присутствие"&&m.createdAt.startsWith(todayStr)).map(m=>m.employeeId);
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

  return(
    <div>
      <div style={{marginBottom:20}}>
        <h1 style={{margin:0,fontSize:23,fontWeight:800,color:C.text}}>Добро пожаловать, {currentUser.name.split(" ")[1]||currentUser.name}</h1>
        <p style={{margin:"3px 0 0",color:C.muted,fontSize:13}}>{role?.label} · {fmtShort(new Date().toISOString())}</p>
      </div>

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

// ═══════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════
const UsersPage = ()=>{
  const {users,setUsers,addLog,currentUser,baseSalaries,setBaseSalaries}=useContext(AppContext);
  const [modal,setModal]=useState(false);
  const [edit,setEdit]=useState(null);
  const [search,setSearch]=useState("");
  const [toast,setToast]=useState(null);
  const [form,setForm]=useState({name:"",email:"",password:"",roleId:2,status:"active",baseSalary:""});
  const [errs,setErrs]=useState({});

  const filtered=users.filter(u=>u.name.toLowerCase().includes(search.toLowerCase())||u.email.toLowerCase().includes(search.toLowerCase()));
  const openNew=()=>{setEdit(null);setForm({name:"",email:"",password:"",roleId:2,status:"active",baseSalary:""});setErrs({});setModal(true)};
  const openEdit=u=>{setEdit(u);setForm({name:u.name,email:u.email,password:"",roleId:u.roleId,status:u.status,baseSalary:baseSalaries[u.id]||""});setErrs({});setModal(true)};
  const validate=()=>{const e={};if(!form.name.trim())e.name="!";if(!form.email.trim())e.email="!";else if(!/\S+@\S+\.\S+/.test(form.email))e.email="Email";if(!edit&&!form.password)e.password="!";setErrs(e);return!Object.keys(e).length};
  const save=()=>{
    if(!validate())return;
    const sal=form.baseSalary?+form.baseSalary:0;
    if(edit){
      setUsers(p=>p.map(u=>u.id===edit.id?{...u,name:form.name,email:form.email,roleId:+form.roleId,status:form.status,...(form.password?{password:hashPassword(form.password)}:{})}:u));
      if(sal>0) setBaseSalaries(p=>({...p,[edit.id]:sal}));
      else setBaseSalaries(p=>{const n={...p};delete n[edit.id];return n;});
      addLog(`Обновлён: ${form.name}`);setToast({message:"Обновлён",type:"success"});
    }else{
      const newId=Date.now();
      setUsers(p=>[...p,{id:newId,name:form.name,email:form.email,password:hashPassword(form.password),roleId:+form.roleId,status:form.status,createdAt:new Date().toISOString()}]);
      if(sal>0) setBaseSalaries(p=>({...p,[newId]:sal}));
      addLog(`Создан: ${form.name}`);setToast({message:"Создан",type:"success"});
    }
    setModal(false);
  };
  const toggleBlock=u=>{const ns=u.status==="active"?"blocked":"active";setUsers(p=>p.map(x=>x.id===u.id?{...x,status:ns}:x));addLog(`${ns==="blocked"?"Заблок.":"Разблок."}: ${u.name}`);setToast({message:ns==="blocked"?"Заблокирован":"Разблокирован",type:ns==="blocked"?"error":"success"})};

  return(
    <div>
      <PageH title="Пользователи"><SearchBox value={search} onChange={e=>setSearch(e.target.value)}/><Btn onClick={openNew} icon={<I.plus size={15}/>}>Добавить</Btn></PageH>
      <Card s={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>ФИО</TH><TH>Email</TH><TH>Роль</TH><TH>Статус</TH><TH>Создан</TH><TH></TH></tr></thead>
          <tbody>{filtered.map(u=>{const role=ROLES.find(r=>r.id===u.roleId);return(
            <tr key={u.id} style={{borderBottom:`1px solid ${C.border}`}}>
              <TD s={{fontWeight:500}}>{u.name}</TD><TD s={{color:C.muted}}>{u.email}</TD>
              <TD><Badge color={u.roleId===1?"danger":u.roleId===2?"info":"primary"}>{role?.label}</Badge></TD>
              <TD><Badge color={u.status==="active"?"success":"danger"}>{u.status==="active"?"Активен":"Заблокирован"}</Badge></TD>
              <TD s={{color:C.dim,fontSize:12}}>{fmtShort(u.createdAt)}</TD>
              <TD><div style={{display:"flex",gap:4}}><Btn v="ghost" sz="sm" onClick={()=>openEdit(u)} icon={<I.edit size={14}/>}/>{u.id!==currentUser.id&&<Btn v="ghost" sz="sm" onClick={()=>toggleBlock(u)} icon={u.status==="active"?<I.lock size={14}/>:<I.unlock size={14}/>}/>}</div></TD>
            </tr>)})}</tbody>
        </table></div></Card>
      <Modal open={modal} onClose={()=>setModal(false)} title={edit?"Редактировать":"Новый пользователь"}>
        <Inp label="ФИО" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} error={errs.name}/>
        <Inp label="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} error={errs.email}/>
        <Inp label={edit?"Новый пароль":"Пароль"} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} error={errs.password}/>
        <Sel label="Роль" value={form.roleId} onChange={e=>setForm({...form,roleId:+e.target.value})} options={ROLES.map(r=>({value:r.id,label:r.label}))}/>
        <Sel label="Статус" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={[{value:"active",label:"Активен"},{value:"blocked",label:"Заблокирован"}]}/>
        <Inp label="Базовая ставка (₽, необязательно)" type="number" min="0" value={form.baseSalary} onChange={e=>setForm({...form,baseSalary:e.target.value})} style={{}} placeholder="Например: 50000"/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn><Btn onClick={save}>{edit?"Сохранить":"Создать"}</Btn></div>
      </Modal>
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// RECIPE EDITOR COMPONENT
// ═══════════════════════════════════════════════════════════════
const RecipeEditor = ({recipeItems, setRecipeItems, rawMaterials, showCostCalc=true}) => {
  const addItem = () => {
    setRecipeItems([...recipeItems, {rawId: rawMaterials[0]?.id || "", qty: "", unit: rawMaterials[0]?.unit || "кг"}]);
  };
  const removeItem = (idx) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== idx));
  };
  const updateItem = (idx, field, value) => {
    const updated = recipeItems.map((item, i) => {
      if (i !== idx) return item;
      if (field === "rawId") {
        const raw = rawMaterials.find(r => r.id === +value);
        return { ...item, rawId: +value, unit: raw?.unit || "кг" };
      }
      return { ...item, [field]: value };
    });
    setRecipeItems(updated);
  };

  const calcCost = useMemo(() => {
    return recipeItems.reduce((sum, item) => {
      if (!item.rawId || !item.qty || +item.qty <= 0) return sum;
      const raw = rawMaterials.find(r => r.id === +item.rawId);
      return sum + (raw?.costPerUnit || 0) * +item.qty;
    }, 0);
  }, [recipeItems, rawMaterials]);

  return (
    <div style={{marginTop:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <I.recipe size={16}/>
          <span style={{fontSize:13,fontWeight:700,color:C.text}}>Рецептура</span>
        </div>
        <Btn v="secondary" sz="sm" onClick={addItem} icon={<I.plus size={13}/>}>Ингредиент</Btn>
      </div>

      {recipeItems.length === 0 && (
        <div style={{textAlign:"center",padding:"16px 0",color:C.dim,fontSize:12,border:`1px dashed ${C.border}`,borderRadius:8}}>
          Нажмите «Ингредиент» чтобы добавить состав
        </div>
      )}

      {recipeItems.map((item, idx) => {
        const raw = rawMaterials.find(r => r.id === +item.rawId);
        const itemCost = raw && item.qty ? (raw.costPerUnit * +item.qty) : 0;
        return (
          <div key={idx} style={{display:"flex",gap:8,alignItems:"flex-end",marginBottom:8,padding:10,background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
            <div style={{flex:"2 1 120px"}}>
              {idx===0&&<label style={{display:"block",fontSize:11,fontWeight:500,color:C.dim,marginBottom:3}}>Сырьё</label>}
              <select value={item.rawId} onChange={e=>updateItem(idx,"rawId",e.target.value)} style={{width:"100%",padding:"7px 8px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,fontFamily:"inherit",appearance:"none"}}>
                <option value="">Выберите</option>
                {rawMaterials.map(r=><option key={r.id} value={r.id}>{r.name} ({r.costPerUnit}₽/{r.unit})</option>)}
              </select>
            </div>
            <div style={{flex:"1 1 70px"}}>
              {idx===0&&<label style={{display:"block",fontSize:11,fontWeight:500,color:C.dim,marginBottom:3}}>Кол-во на ед.</label>}
              <input type="number" step="0.001" value={item.qty} onChange={e=>updateItem(idx,"qty",e.target.value)} placeholder="0.00" style={{width:"100%",padding:"7px 8px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{flex:"0 0 40px",textAlign:"center"}}>
              {idx===0&&<label style={{display:"block",fontSize:11,fontWeight:500,color:C.dim,marginBottom:3}}>Ед.</label>}
              <span style={{fontSize:12,color:C.muted,lineHeight:"32px"}}>{item.unit}</span>
            </div>
            <div style={{flex:"0 0 70px",textAlign:"right"}}>
              {idx===0&&<label style={{display:"block",fontSize:11,fontWeight:500,color:C.dim,marginBottom:3}}>Стоимость</label>}
              <span style={{fontSize:12,fontWeight:600,color:C.primary,lineHeight:"32px"}}>{itemCost.toFixed(1)}₽</span>
            </div>
            <button onClick={()=>removeItem(idx)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",padding:4,marginBottom:2,flexShrink:0}}>
              <I.x size={14}/>
            </button>
          </div>
        );
      })}

      {showCostCalc && recipeItems.length > 0 && (
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:`${C.primary}10`,borderRadius:8,border:`1px solid ${C.primary}25`,marginTop:6}}>
          <span style={{fontSize:13,fontWeight:600,color:C.text}}>Себестоимость по рецепту:</span>
          <span style={{fontSize:16,fontWeight:800,color:C.primary}}>{calcCost.toFixed(2)}₽</span>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════
const ProductsPage = ()=>{
  const {products,setProducts,addLog,currentUser,recipes,setRecipes,rawMaterials}=useContext(AppContext);
  const [modal,setModal]=useState(false);
  const [recipeModal,setRecipeModal]=useState(null);
  const [editRecipeModal,setEditRecipeModal]=useState(null);
  const [edit,setEdit]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [search,setSearch]=useState("");
  const [fCat,setFCat]=useState("all");
  const [fStat,setFStat]=useState("all");
  const [toast,setToast]=useState(null);
  const [errs,setErrs]=useState({});
  const empty={name:"",category:CATEGORIES[0],description:"",costPrice:"",sellPrice:"",stock:"",unit:"кг",status:"в производстве"};
  const [form,setForm]=useState(empty);
  const [recipeItems,setRecipeItems]=useState([]);
  const [editRecipeItems,setEditRecipeItems]=useState([]);
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const canEdit=role?.name==="admin"||role?.name==="manager";
  const isAdmin=role?.name==="admin";
  const isWorker=role?.name==="worker";

  // Calculate cost from recipe
  const recipeCost = useMemo(() => {
    return recipeItems.reduce((sum, item) => {
      if (!item.rawId || !item.qty || +item.qty <= 0) return sum;
      const raw = rawMaterials.find(r => r.id === +item.rawId);
      return sum + (raw?.costPerUnit || 0) * +item.qty;
    }, 0);
  }, [recipeItems, rawMaterials]);

  // Auto-update costPrice when recipe changes
  useEffect(() => {
    if (recipeItems.length > 0 && recipeCost > 0) {
      setForm(f => ({...f, costPrice: recipeCost.toFixed(2)}));
    }
  }, [recipeCost, recipeItems.length]);

  const list=useMemo(()=>{
    let l=products.filter(p=>!p.deleted);
    if(search)l=l.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
    if(fCat!=="all")l=l.filter(p=>p.category===fCat);
    if(fStat!=="all")l=l.filter(p=>p.status===fStat);
    return l.sort((a,b)=>a.name.localeCompare(b.name));
  },[products,search,fCat,fStat]);

  const openNew=()=>{setEdit(null);setForm(empty);setRecipeItems([]);setErrs({});setModal(true)};
  const openEdit=p=>{
    setEdit(p);
    setForm({name:p.name,category:p.category,description:p.description,costPrice:p.costPrice,sellPrice:p.sellPrice,stock:p.stock,unit:p.unit,status:p.status});
    const recipe = recipes.find(r=>r.productId===p.id);
    setRecipeItems(recipe ? recipe.items.map(it=>({rawId:it.rawId,qty:it.qty,unit:it.unit||rawMaterials.find(r=>r.id===it.rawId)?.unit||"кг"})) : []);
    setErrs({});
    setModal(true);
  };
  const validate=()=>{const e={};if(!form.name.trim())e.name="!";if(!form.costPrice||+form.costPrice<=0)e.costPrice="!";if(!form.sellPrice||+form.sellPrice<=0)e.sellPrice="!";if(form.stock===""||+form.stock<0)e.stock="!";setErrs(e);return!Object.keys(e).length};

  const save=()=>{
    if(!validate())return;
    const now=new Date().toISOString();
    if(edit){
      setProducts(p=>p.map(x=>x.id===edit.id?{...x,name:form.name,category:form.category,description:form.description,costPrice:+form.costPrice,sellPrice:+form.sellPrice,stock:+form.stock,unit:form.unit,status:form.status,updatedAt:now}:x));
      // Update or create recipe
      if(recipeItems.length > 0 && isAdmin) {
        const validItems = recipeItems.filter(it=>it.rawId && it.qty && +it.qty > 0).map(it=>({rawId:+it.rawId,qty:+it.qty,unit:it.unit}));
        const existingRecipe = recipes.find(r=>r.productId===edit.id);
        if(existingRecipe) {
          setRecipes(p=>p.map(r=>r.productId===edit.id?{...r,items:validItems,updatedAt:now}:r));
        } else {
          setRecipes(p=>[...p,{id:Date.now(),productId:edit.id,items:validItems,createdAt:now,updatedAt:now}]);
        }
      } else if(recipeItems.length === 0 && isAdmin) {
        setRecipes(p=>p.filter(r=>r.productId!==edit.id));
      }
      addLog(`Обновлён товар: ${form.name}`);
      setToast({message:"Обновлён",type:"success"});
    } else {
      const newId = Date.now();
      setProducts(p=>[...p,{id:newId,...form,costPrice:+form.costPrice,sellPrice:+form.sellPrice,stock:+form.stock,createdAt:now,updatedAt:now,deleted:false}]);
      // Create recipe if items added
      if(recipeItems.length > 0) {
        const validItems = recipeItems.filter(it=>it.rawId && it.qty && +it.qty > 0).map(it=>({rawId:+it.rawId,qty:+it.qty,unit:it.unit}));
        if(validItems.length > 0) {
          setRecipes(p=>[...p,{id:Date.now()+1,productId:newId,items:validItems,createdAt:now,updatedAt:now}]);
        }
      }
      addLog(`Добавлен товар: ${form.name}`);
      setToast({message:"Добавлен",type:"success"});
    }
    setModal(false);
  };

  const del=p=>{setConfirm({title:"Удалить?",message:`Удалить "${p.name}"?`,onConfirm:()=>{setProducts(prev=>prev.map(x=>x.id===p.id?{...x,deleted:true}:x));setRecipes(prev=>prev.filter(r=>r.productId!==p.id));addLog(`Удалён: ${p.name}`);setToast({message:"Удалён",type:"error"});setConfirm(null)}})};
  const updateStatus=(p,s)=>{setProducts(prev=>prev.map(x=>x.id===p.id?{...x,status:s,updatedAt:new Date().toISOString()}:x));addLog(`Статус "${p.name}": ${s}`);setToast({message:"Обновлён",type:"success"})};
  const sc=s=>s==="готов"?"success":s==="в производстве"?"primary":"danger";

  // Edit recipe modal handlers
  const openEditRecipe = (productId) => {
    const recipe = recipes.find(r=>r.productId===productId);
    setEditRecipeItems(recipe ? recipe.items.map(it=>({rawId:it.rawId,qty:it.qty,unit:it.unit||rawMaterials.find(r=>r.id===it.rawId)?.unit||"кг"})) : []);
    setEditRecipeModal(productId);
  };

  const saveEditRecipe = () => {
    if(!editRecipeModal) return;
    const now = new Date().toISOString();
    const validItems = editRecipeItems.filter(it=>it.rawId && it.qty && +it.qty > 0).map(it=>({rawId:+it.rawId,qty:+it.qty,unit:it.unit}));
    const existingRecipe = recipes.find(r=>r.productId===editRecipeModal);

    if(validItems.length > 0) {
      if(existingRecipe) {
        setRecipes(p=>p.map(r=>r.productId===editRecipeModal?{...r,items:validItems,updatedAt:now}:r));
      } else {
        setRecipes(p=>[...p,{id:Date.now(),productId:editRecipeModal,items:validItems,createdAt:now,updatedAt:now}]);
      }
      // Update product cost
      const newCost = validItems.reduce((sum, it) => {
        const raw = rawMaterials.find(r=>r.id===it.rawId);
        return sum + (raw?.costPerUnit||0)*it.qty;
      }, 0);
      setProducts(p=>p.map(x=>x.id===editRecipeModal?{...x,costPrice:+newCost.toFixed(2),updatedAt:now}:x));
    } else if(existingRecipe) {
      setRecipes(p=>p.filter(r=>r.productId!==editRecipeModal));
    }
    addLog(`Рецептура обновлена: ${products.find(p=>p.id===editRecipeModal)?.name}`);
    setToast({message:"Рецептура сохранена",type:"success"});
    setEditRecipeModal(null);
  };

  return(
    <div>
      <PageH title="Товары">
        <SearchBox value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={fCat} onChange={e=>setFCat(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}><option value="all">Все категории</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <select value={fStat} onChange={e=>setFStat(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}><option value="all">Все статусы</option>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>
        {canEdit&&<Btn onClick={openNew} icon={<I.plus size={15}/>}>Добавить</Btn>}
      </PageH>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12}}>
        {list.map(p=>{
          const recipe=recipes.find(r=>r.productId===p.id);
          const recipeCostVal = recipe ? recipe.items.reduce((s,it)=>{const raw=rawMaterials.find(r=>r.id===it.rawId);return s+(raw?.costPerUnit||0)*it.qty},0) : null;
          return(
          <Card key={p.id} s={{display:"flex",flexDirection:"column",gap:8,overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0}}><EthnicBorder color={sc(p.status)==="success"?C.success:sc(p.status)==="primary"?C.primary:C.danger} height={2}/></div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",paddingTop:4}}>
              <div><div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:2}}>{p.name}</div><Badge color="purple">{p.category}</Badge></div>
              <Badge color={sc(p.status)}>{p.status}</Badge>
            </div>
            {p.description&&<div style={{fontSize:12,color:C.muted,lineHeight:1.4}}>{p.description}</div>}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:"auto"}}>
              {(isWorker
                ? [["Склад",`${p.stock} ${p.unit}`,p.stock<20?C.danger:C.text],["Статус",p.status,C.primary]]
                : [["Себестоимость",`${p.costPrice}₽`,C.text],["Цена",`${p.sellPrice}₽`,C.success],["Склад",`${p.stock} ${p.unit}`,p.stock<20?C.danger:C.text],["Маржа",`${((p.sellPrice-p.costPrice)/p.costPrice*100).toFixed(0)}%`,C.primary]]
              ).map(([l,v,c],i)=>(
                <div key={i} style={{background:C.bg,borderRadius:7,padding:"6px 8px"}}><div style={{fontSize:10,color:C.dim}}>{l}</div><div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div></div>
              ))}
            </div>
            {recipe&&<div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:11,color:C.muted,cursor:"pointer",textDecoration:"underline",flex:1}} onClick={()=>setRecipeModal(p.id)}>
                <I.recipe size={12}/> Рецептура ({recipe.items.length} комп.)
              </span>
              {isAdmin&&<Btn v="ghost" sz="sm" onClick={()=>openEditRecipe(p.id)} icon={<I.edit size={12}/>} style={{fontSize:11,padding:"3px 6px"}}>Ред.</Btn>}
            </div>}
            {!recipe&&isAdmin&&<Btn v="ghost" sz="sm" onClick={()=>openEditRecipe(p.id)} icon={<I.plus size={12}/>} style={{fontSize:11}}>Добавить рецептуру</Btn>}
            <div style={{display:"flex",gap:5,marginTop:2}}>
              {isWorker&&<select value={p.status} onChange={e=>updateStatus(p,e.target.value)} style={{flex:1,padding:"6px 8px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</select>}
              {canEdit&&<><Btn v="secondary" sz="sm" onClick={()=>openEdit(p)} icon={<I.edit size={13}/>}>Ред.</Btn><Btn v="danger" sz="sm" onClick={()=>del(p)} icon={<I.trash size={13}/>}/></>}
            </div>
          </Card>
        )})}
      </div>
      {list.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim}}><I.box size={36}/><p style={{marginTop:10}}>Не найдено</p></div>}

      {/* Create/Edit Product Modal with Recipe */}
      <Modal open={modal} onClose={()=>setModal(false)} title={edit?"Редактировать товар":"Новый товар"} width={640}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Название" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} error={errs.name} cStyle={{gridColumn:"1/3"}}/>
          <Sel label="Категория" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} options={CATEGORIES.map(c=>({value:c,label:c}))}/>
          <Sel label="Ед. изм." value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} options={UNITS.map(u=>({value:u,label:u}))}/>
          <Inp label="Себестоимость" type="number" value={form.costPrice} onChange={e=>setForm({...form,costPrice:e.target.value})} error={errs.costPrice}/>
          <Inp label="Цена продажи" type="number" value={form.sellPrice} onChange={e=>setForm({...form,sellPrice:e.target.value})} error={errs.sellPrice}/>
          <Inp label="Склад" type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} error={errs.stock}/>
          <Sel label="Статус" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={STATUSES.map(s=>({value:s,label:s}))}/>
          <Txa label="Описание" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} cStyle={{gridColumn:"1/3"}}/>
        </div>

        {/* Recipe section in product form (admin only) */}
        {isAdmin && (
          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,marginTop:6}}>
            <RecipeEditor recipeItems={recipeItems} setRecipeItems={setRecipeItems} rawMaterials={rawMaterials}/>
          </div>
        )}

        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12}}><Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn><Btn onClick={save}>{edit?"Сохранить":"Добавить"}</Btn></div>
      </Modal>

      {/* View Recipe Modal */}
      <Modal open={!!recipeModal} onClose={()=>setRecipeModal(null)} title="Рецептура" width={450}>
        {recipeModal&&(()=>{
          const recipe=recipes.find(r=>r.productId===recipeModal);
          const prod=products.find(p=>p.id===recipeModal);
          if(!recipe) return <p style={{color:C.muted}}>Рецептура не задана</p>;
          const totalCost = recipe.items.reduce((s,it)=>{const raw=rawMaterials.find(r=>r.id===it.rawId);return s+(raw?.costPerUnit||0)*it.qty},0);
          return(<div>
            <p style={{color:C.muted,fontSize:13,marginBottom:12}}>Состав на 1 {prod?.unit} «{prod?.name}»:</p>
            {recipe.items.map((it,i)=>{const raw=rawMaterials.find(r=>r.id===it.rawId);const cost=(raw?.costPerUnit||0)*it.qty;return(
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.text,fontSize:13}}>{raw?.name||"?"}</span>
                <div style={{display:"flex",gap:16,alignItems:"center"}}>
                  <span style={{color:C.muted,fontSize:12}}>{cost.toFixed(1)}₽</span>
                  <span style={{color:C.primary,fontWeight:600,fontSize:13}}>{it.qty} {it.unit||raw?.unit}</span>
                </div>
              </div>
            )})}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",marginTop:6}}>
              <span style={{fontSize:14,fontWeight:700,color:C.text}}>Итого себестоимость:</span>
              <span style={{fontSize:14,fontWeight:800,color:C.primary}}>{totalCost.toFixed(2)}₽</span>
            </div>
            {recipe.updatedAt&&<div style={{fontSize:11,color:C.dim,marginTop:8}}>Обновлено: {fmtDate(recipe.updatedAt)}</div>}
          </div>);
        })()}
      </Modal>

      {/* Edit Recipe Standalone Modal */}
      <Modal open={!!editRecipeModal} onClose={()=>setEditRecipeModal(null)} title={`Рецептура: ${products.find(p=>p.id===editRecipeModal)?.name||""}`} width={600}>
        {editRecipeModal&&(
          <div>
            <RecipeEditor recipeItems={editRecipeItems} setRecipeItems={setEditRecipeItems} rawMaterials={rawMaterials}/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:14}}>
              <Btn v="secondary" onClick={()=>setEditRecipeModal(null)}>Отмена</Btn>
              <Btn onClick={saveEditRecipe}>Сохранить рецептуру</Btn>
            </div>
          </div>
        )}
      </Modal>

      {confirm&&<Confirm open onClose={()=>setConfirm(null)} {...confirm}/>}
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════
const TasksPage = ()=>{
  const {tasks,setTasks,taskEmployees,setTaskEmployees,products,setProducts,users,rawMaterials,setRawMaterials,recipes,setRawMovements,addLog,currentUser,addNotification,employeeHistory,setEmployeeHistory}=useContext(AppContext);
  const [modal,setModal]=useState(false);
  const [completeModal,setCompleteModal]=useState(null);
  const [toast,setToast]=useState(null);
  const [errs,setErrs]=useState({});
  const [filter,setFilter]=useState("all");
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isWorker=role?.name==="worker";
  const canCreate=role?.name==="admin"||role?.name==="manager";

  const ap=products.filter(p=>!p.deleted);
  const workers=users.filter(u=>u.roleId===3&&u.status==="active");
  const [form,setForm]=useState({productId:ap[0]?.id||"",userIds:[],quantity:"",deadline:"",note:""});
  const [rawCheck,setRawCheck]=useState(null);
  const [empQtys,setEmpQtys]=useState({});

  const filtered=useMemo(()=>{
    let l=isWorker?tasks.filter(t=>(t.userIds||[]).includes(currentUser.id)):[...tasks];
    if(filter!=="all") l=l.filter(t=>t.status===filter);
    return l.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },[tasks,filter,isWorker,currentUser]);

  const checkRaw=(productId,qty)=>{
    const recipe=recipes.find(r=>r.productId===+productId);
    if(!recipe) return {ok:true,items:[]};
    const items=recipe.items.map(it=>{
      const raw=rawMaterials.find(r=>r.id===it.rawId);
      const needed=it.qty*qty;
      return {rawId:it.rawId,name:raw?.name||"?",needed:+needed.toFixed(3),available:raw?.stock||0,unit:raw?.unit||"",enough:raw?raw.stock>=needed:false};
    });
    return {ok:items.every(i=>i.enough),items};
  };

  const toggleUser=(uid)=>{
    setForm(f=>({...f,userIds:f.userIds.includes(uid)?f.userIds.filter(x=>x!==uid):[...f.userIds,uid]}));
  };

  const openNew=()=>{
    setForm({productId:ap[0]?.id||"",userIds:[],quantity:"",deadline:new Date(Date.now()+86400000).toISOString().slice(0,16),note:""});
    setRawCheck(null);setErrs({});setModal(true);
  };

  useEffect(()=>{
    if(modal&&form.productId&&form.quantity&&+form.quantity>0){
      setRawCheck(checkRaw(form.productId,+form.quantity));
    }else{setRawCheck(null)}
  },[form.productId,form.quantity,modal]);

  const validate=()=>{const e={};if(!form.productId)e.productId="!";if(!form.userIds.length)e.userIds="!";if(!form.quantity||+form.quantity<=0)e.quantity="!";if(!form.deadline)e.deadline="!";setErrs(e);return!Object.keys(e).length};

  const save=()=>{
    if(!validate())return;
    const rc=checkRaw(form.productId,+form.quantity);
    if(!rc.ok){setToast({message:"Недостаточно сырья!",type:"error"});return}
    const now=new Date().toISOString();
    const taskId=Date.now();
    const task={id:taskId,productId:+form.productId,userIds:form.userIds,quantity:+form.quantity,status:"назначено",createdAt:now,deadline:form.deadline,completedAt:null,note:form.note};
    setTasks(p=>[...p,task]);
    // Create task_employees entries
    const newTEs=form.userIds.map((uid,i)=>({id:taskId+i+1,taskId,employeeId:uid,producedQty:0,status:"назначено",createdAt:now}));
    setTaskEmployees(p=>[...p,...newTEs]);
    const pName=products.find(p=>p.id===+form.productId)?.name;
    const names=form.userIds.map(uid=>users.find(u=>u.id===uid)?.name?.split(" ").slice(0,2).join(" ")).join(", ");
    addLog(`Задание: ${pName} x${form.quantity} \u2192 ${names}`);
    addNotification({title:`Новое задание: ${pName}`,type:"информация",content:`Назначено: ${pName} x${form.quantity} \u2192 ${names}. Срок: ${fmtDate(form.deadline)}`,targetUsers:form.userIds});
    setToast({message:"Задание создано",type:"success"});setModal(false);
  };

  const openComplete=(t)=>{
    const initial={};
    (t.userIds||[]).forEach(uid=>{
      const eq=Math.floor(t.quantity/(t.userIds||[]).length);
      initial[uid]=eq;
    });
    // Adjust remainder to first user
    const remainder=t.quantity-Object.values(initial).reduce((s,v)=>s+v,0);
    if(remainder>0&&(t.userIds||[]).length>0) initial[(t.userIds||[])[0]]+=remainder;
    setEmpQtys(initial);
    setCompleteModal(t);
  };

  const doComplete=()=>{
    const t=completeModal;if(!t)return;
    const totalAssigned=Object.values(empQtys).reduce((s,v)=>s+(+v||0),0);
    if(totalAssigned!==t.quantity){setToast({message:`Сумма (${totalAssigned}) должна равняться ${t.quantity}`,type:"error"});return}
    const now=new Date().toISOString();
    const recipe=recipes.find(r=>r.productId===t.productId);
    if(recipe){
      recipe.items.forEach(it=>{
        const needed=it.qty*t.quantity;
        setRawMaterials(p=>p.map(r=>r.id===it.rawId?{...r,stock:+(r.stock-needed).toFixed(3),updatedAt:now}:r));
        setRawMovements(p=>[...p,{id:Date.now()+Math.random(),rawId:it.rawId,type:"out",quantity:+needed.toFixed(3),reason:`Задание #${t.id}`,date:now}]);
      });
    }
    setProducts(p=>p.map(x=>x.id===t.productId?{...x,stock:x.stock+t.quantity,updatedAt:now}:x));
    const isLate=new Date(now)>new Date(t.deadline);
    setTasks(p=>p.map(x=>x.id===t.id?{...x,status:isLate?"просрочено":"завершено",completedAt:now}:x));
    // Update task_employees with individual produced quantities
    Object.entries(empQtys).forEach(([uid,qty])=>{
      setTaskEmployees(p=>p.map(te=>te.taskId===t.id&&te.employeeId===+uid?{...te,producedQty:+qty,status:isLate?"просрочено":"завершено"}:te));
    });
    // Update employee_history
    const dateStr=now.slice(0,10);
    Object.entries(empQtys).forEach(([uid,qty])=>{
      setEmployeeHistory(p=>{
        const existing=p.find(h=>h.employeeId===+uid&&h.date===dateStr);
        if(existing){
          return p.map(h=>h.id===existing.id?{...h,tasksCompleted:h.tasksCompleted+1,producedQty:h.producedQty+(+qty)}:h);
        }
        return [...p,{id:Date.now()+Math.random(),employeeId:+uid,date:dateStr,attendance:"present",tasksCompleted:1,producedQty:+qty,workStart:"09:00",workEnd:fmtTime(now),comment:""}];
      });
    });
    const pName=products.find(p=>p.id===t.productId)?.name;
    const names=(t.userIds||[]).map(uid=>users.find(u=>u.id===uid)?.name?.split(" ").slice(0,2).join(" ")).join(", ");
    addLog(`Завершено: ${pName} x${t.quantity}${isLate?" (просрочено)":""} \u2192 ${names}`);
    addNotification({title:`Задание ${isLate?"просрочено":"выполнено"}: ${pName}`,type:isLate?"ошибка":"информация",content:`${names} ${isLate?"просрочили":"завершили"}: ${pName} x${t.quantity}`,targetAll:true});
    rawMaterials.forEach(r=>{
      const cur=r.stock-(recipe?.items.find(x=>x.rawId===r.id)?.qty||0)*t.quantity;
      if(cur<=r.minStock){addNotification({title:`Низкий остаток: ${r.name}`,type:"предупреждение",content:`${r.name}: остаток ${cur.toFixed(1)} ${r.unit} при минимуме ${r.minStock} ${r.unit}`,targetAll:true})}
    });
    setToast({message:isLate?"Завершено с опозданием":"Завершено!",type:isLate?"warn":"success"});
    setCompleteModal(null);
  };

  const startTask=(t)=>{
    setTasks(p=>p.map(x=>x.id===t.id?{...x,status:"в работе"}:x));
    setTaskEmployees(p=>p.map(te=>te.taskId===t.id?{...te,status:"в работе"}:te));
    addLog(`Начато: задание #${t.id}`);
    setToast({message:"Задание начато",type:"info"});
  };

  const tColor=s=>s==="завершено"?"success":s==="в работе"?"info":s==="просрочено"?"danger":"primary";

  return(
    <div>
      <PageH title="Производственные задания">
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {["all",...TASK_STATUSES].map(s=>(
            <button key={s} onClick={()=>setFilter(s)} style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${filter===s?C.primary:C.border}`,background:filter===s?C.primaryBg:C.surface,color:filter===s?C.primary:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{s==="all"?"Все":s}</button>
          ))}
        </div>
        {canCreate&&<Btn onClick={openNew} icon={<I.plus size={15}/>}>Новое задание</Btn>}
      </PageH>

      <div style={{display:"grid",gap:10}}>
        {filtered.map(t=>{
          const prod=products.find(p=>p.id===t.productId);
          const tWorkers=(t.userIds||[]).map(uid=>users.find(u=>u.id===uid));
          const tEmps=taskEmployees.filter(te=>te.taskId===t.id);
          const isOverdue=!t.completedAt&&new Date()>new Date(t.deadline)&&t.status!=="завершено"&&t.status!=="просрочено";
          const canAct=isWorker?(t.userIds||[]).includes(currentUser.id):true;
          return(
            <Card key={t.id} s={{display:"flex",flexDirection:"column",gap:10,padding:"14px 18px",borderLeft:`3px solid ${isOverdue?C.danger:t.status==="завершено"?C.success:t.status==="в работе"?C.info:C.primary}`}}>
              <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:14}}>
                <div style={{flex:"1 1 200px"}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.text}}>{prod?.name||"\u2014"} <span style={{fontWeight:400,color:C.muted}}>x{t.quantity}</span></div>
                  <div style={{fontSize:12,color:C.dim,marginTop:2}}>Создано: {fmtShort(t.createdAt)} \u00b7 Срок: {fmtShort(t.deadline)}</div>
                  {t.completedAt&&<div style={{fontSize:11,color:C.dim}}>Завершено: {fmtDate(t.completedAt)}</div>}
                  {t.note&&<div style={{fontSize:11,color:C.dim,fontStyle:"italic",marginTop:2}}>{t.note}</div>}
                </div>
                <Badge color={isOverdue?"danger":tColor(t.status)}>{isOverdue?"просрочено":t.status}</Badge>
                <div style={{display:"flex",gap:5}}>
                  {t.status==="назначено"&&canAct&&<Btn sz="sm" v="info" onClick={()=>startTask(t)} style={{background:C.infoBg,color:C.info,border:`1px solid ${C.info}30`}}>Начать</Btn>}
                  {t.status==="в работе"&&canAct&&<Btn sz="sm" v="success" onClick={()=>openComplete(t)}>Завершить</Btn>}
                </div>
              </div>
              {/* Employees list */}
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                <span style={{fontSize:11,color:C.dim,lineHeight:"24px"}}>Исполнители:</span>
                {tWorkers.map((w,i)=>{
                  const te=tEmps.find(e=>e.employeeId===w?.id);
                  return w?<Badge key={i} color={te?.producedQty>0?"success":"info"} s={{fontSize:11}}>
                    {w.name.split(" ").slice(0,2).join(" ")}{te?.producedQty>0?` — ${te.producedQty}`:""}
                  </Badge>:null;
                })}
              </div>
              {/* Tech card */}
              {prod?.techCard&&prod.techCard.length>0&&(
                <details style={{fontSize:12,color:C.muted}}>
                  <summary style={{cursor:"pointer",fontWeight:600,color:C.primary,fontSize:11,padding:"4px 0"}}>Технологическая карта</summary>
                  <ol style={{margin:"6px 0 0 16px",padding:0,lineHeight:1.8}}>
                    {prod.techCard.map((step,i)=><li key={i} style={{color:C.text,fontSize:12}}>{step}</li>)}
                  </ol>
                </details>
              )}
            </Card>
          );
        })}
      </div>
      {filtered.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim}}><I.tasks size={36}/><p style={{marginTop:10}}>Нет заданий</p></div>}

      {/* Create task modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Новое задание" width={540}>
        <Sel label="Товар" value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})} error={errs.productId} options={[{value:"",label:"Выберите"},...ap.map(p=>({value:p.id,label:`${p.name} (${p.category})`}))]}/>
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:12,fontWeight:500,color:C.muted,marginBottom:6}}>Исполнители {errs.userIds&&<span style={{color:C.danger}}>(выберите хотя бы одного)</span>}</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {workers.map(w=>{
              const sel=form.userIds.includes(w.id);
              return <button key={w.id} onClick={()=>toggleUser(w.id)} style={{padding:"6px 12px",borderRadius:7,border:`1px solid ${sel?C.primary:C.border}`,background:sel?C.primaryBg:C.surface2,color:sel?C.primary:C.muted,fontSize:12,fontWeight:sel?600:400,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:14,height:14,borderRadius:4,border:`2px solid ${sel?C.primary:C.border}`,background:sel?C.primary:"transparent",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{sel&&<I.check size={10}/>}</span>
                {w.name.split(" ").slice(0,2).join(" ")}
              </button>;
            })}
          </div>
        </div>
        <Inp label="Количество" type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} error={errs.quantity}/>
        <Inp label="Срок выполнения" type="datetime-local" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} error={errs.deadline}/>
        <Txa label="Примечание" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/>
        {rawCheck&&(
          <div style={{background:rawCheck.ok?C.successBg:C.dangerBg,border:`1px solid ${rawCheck.ok?"rgba(90,158,95,.2)":"rgba(196,78,61,.2)"}`,borderRadius:8,padding:12,marginTop:8}}>
            <div style={{fontSize:13,fontWeight:600,color:rawCheck.ok?C.success:C.danger,marginBottom:6}}>{rawCheck.ok?"\u2705 Сырья достаточно":"\u274c Недостаточно сырья"}</div>
            {rawCheck.items.map((it,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,padding:"2px 0",color:it.enough?C.text:C.danger}}>
                <span>{it.name}</span><span>{it.needed} / {it.available} {it.unit} {it.enough?"\u2713":"\u2717"}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10}}>
          <Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn>
          <Btn onClick={save} disabled={rawCheck&&!rawCheck.ok}>Создать</Btn>
        </div>
      </Modal>

      {/* Complete task modal — distribute quantities */}
      <Modal open={!!completeModal} onClose={()=>setCompleteModal(null)} title="Завершение задания" width={480}>
        {completeModal&&(()=>{
          const t=completeModal;
          const prod=products.find(p=>p.id===t.productId);
          const total=Object.values(empQtys).reduce((s,v)=>s+(+v||0),0);
          const isValid=total===t.quantity;
          return(<div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:700,color:C.text}}>{prod?.name} — {t.quantity} {prod?.unit}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:4}}>Распределите количество между исполнителями:</div>
            </div>
            {(t.userIds||[]).map(uid=>{
              const w=users.find(u=>u.id===uid);
              return(
                <div key={uid} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:10,background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
                  <div style={{flex:1,fontSize:13,fontWeight:500,color:C.text}}>{w?.name?.split(" ").slice(0,2).join(" ")}</div>
                  <input type="number" min="0" value={empQtys[uid]||""} onChange={e=>setEmpQtys({...empQtys,[uid]:+e.target.value||0})} style={{width:80,padding:"6px 8px",background:C.surface2,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:13,fontFamily:"inherit",textAlign:"right"}}/>
                  <span style={{fontSize:12,color:C.dim,width:30}}>{prod?.unit}</span>
                </div>
              );
            })}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:`1px solid ${C.border}`,marginTop:6}}>
              <span style={{fontSize:13,fontWeight:600,color:C.text}}>Итого:</span>
              <span style={{fontSize:14,fontWeight:800,color:isValid?C.success:C.danger}}>{total} / {t.quantity} {prod?.unit}</span>
            </div>
            {!isValid&&<div style={{fontSize:12,color:C.danger,marginBottom:8}}>Сумма должна равняться {t.quantity}</div>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}>
              <Btn v="secondary" onClick={()=>setCompleteModal(null)}>Отмена</Btn>
              <Btn v="success" onClick={doComplete} disabled={!isValid}>Завершить</Btn>
            </div>
          </div>);
        })()}
      </Modal>
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// RAW MATERIALS
// ═══════════════════════════════════════════════════════════════
const RawMaterialsPage = ()=>{
  const {rawMaterials,setRawMaterials,rawMovements,addLog}=useContext(AppContext);
  const [modal,setModal]=useState(false);
  const [histModal,setHistModal]=useState(null);
  const [edit,setEdit]=useState(null);
  const [toast,setToast]=useState(null);
  const [search,setSearch]=useState("");
  const [errs,setErrs]=useState({});
  const empty={name:"",category:RAW_CATEGORIES[0],unit:"кг",stock:"",minStock:"",costPerUnit:""};
  const [form,setForm]=useState(empty);

  const filtered=rawMaterials.filter(r=>r.name.toLowerCase().includes(search.toLowerCase()));
  const openNew=()=>{setEdit(null);setForm(empty);setErrs({});setModal(true)};
  const openEdit=r=>{setEdit(r);setForm({name:r.name,category:r.category,unit:r.unit,stock:r.stock,minStock:r.minStock,costPerUnit:r.costPerUnit});setErrs({});setModal(true)};
  const validate=()=>{const e={};if(!form.name.trim())e.name="!";if(form.stock===""||+form.stock<0)e.stock="!";if(!form.costPerUnit||+form.costPerUnit<=0)e.costPerUnit="!";setErrs(e);return!Object.keys(e).length};
  const save=()=>{if(!validate())return;const now=new Date().toISOString();if(edit){setRawMaterials(p=>p.map(r=>r.id===edit.id?{...r,...form,stock:+form.stock,minStock:+form.minStock,costPerUnit:+form.costPerUnit,updatedAt:now}:r));addLog(`Сырьё обновлено: ${form.name}`);setToast({message:"Обновлено",type:"success"})}else{setRawMaterials(p=>[...p,{id:Date.now(),...form,stock:+form.stock,minStock:+form.minStock,costPerUnit:+form.costPerUnit,updatedAt:now}]);addLog(`Сырьё добавлено: ${form.name}`);setToast({message:"Добавлено",type:"success"})}setModal(false)};

  return(
    <div>
      <PageH title="Склад сырья"><SearchBox value={search} onChange={e=>setSearch(e.target.value)}/><Btn onClick={openNew} icon={<I.plus size={15}/>}>Добавить</Btn></PageH>
      <Card s={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>Название</TH><TH>Категория</TH><TH>Остаток</TH><TH>Мин.</TH><TH>Цена/ед</TH><TH>Стоимость</TH><TH></TH></tr></thead>
          <tbody>{filtered.map(r=>{const low=r.stock<=r.minStock;return(
            <tr key={r.id} style={{borderBottom:`1px solid ${C.border}`,background:low?C.dangerBg:"transparent"}}>
              <TD s={{fontWeight:500}}>{r.name} {low&&<Badge color="danger" s={{marginLeft:6}}>!</Badge>}</TD>
              <TD><Badge color="purple">{r.category}</Badge></TD>
              <TD s={{fontWeight:600,color:low?C.danger:C.text}}>{r.stock} {r.unit}</TD>
              <TD s={{color:C.dim}}>{r.minStock}</TD>
              <TD s={{color:C.muted}}>{r.costPerUnit}₽</TD>
              <TD s={{fontWeight:600,color:C.success}}>{(r.stock*r.costPerUnit).toLocaleString("ru")}₽</TD>
              <TD><div style={{display:"flex",gap:4}}>
                <Btn v="ghost" sz="sm" onClick={()=>setHistModal(r.id)} icon={<I.clock size={14}/>}/>
                <Btn v="ghost" sz="sm" onClick={()=>openEdit(r)} icon={<I.edit size={14}/>}/>
              </div></TD>
            </tr>)})}</tbody>
        </table></div></Card>

      <Modal open={modal} onClose={()=>setModal(false)} title={edit?"Редактировать":"Новое сырьё"}>
        <Inp label="Название" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} error={errs.name}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Sel label="Категория" value={form.category} onChange={e=>setForm({...form,category:e.target.value})} options={RAW_CATEGORIES.map(c=>({value:c,label:c}))}/>
          <Sel label="Ед. изм." value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} options={RAW_UNITS.map(u=>({value:u,label:u}))}/>
          <Inp label="Остаток" type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} error={errs.stock}/>
          <Inp label="Мин. остаток" type="number" value={form.minStock} onChange={e=>setForm({...form,minStock:e.target.value})}/>
          <Inp label="Цена за ед." type="number" value={form.costPerUnit} onChange={e=>setForm({...form,costPerUnit:e.target.value})} error={errs.costPerUnit} cStyle={{gridColumn:"1/3"}}/>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn><Btn onClick={save}>{edit?"Сохранить":"Добавить"}</Btn></div>
      </Modal>

      <Modal open={!!histModal} onClose={()=>setHistModal(null)} title="История движения" width={480}>
        {histModal&&(()=>{
          const moves=rawMovements.filter(m=>m.rawId===histModal).sort((a,b)=>new Date(b.date)-new Date(a.date));
          const raw=rawMaterials.find(r=>r.id===histModal);
          return(<div>
            <p style={{color:C.muted,fontSize:13,marginBottom:10}}>{raw?.name}</p>
            {moves.length===0?<p style={{color:C.dim}}>Нет записей</p>:moves.map((m,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                <Badge color={m.type==="in"?"success":"danger"}>{m.type==="in"?"+":"-"}{m.quantity}</Badge>
                <div style={{flex:1}}><div style={{fontSize:12,color:C.text}}>{m.reason}</div><div style={{fontSize:11,color:C.dim}}>{fmtDate(m.date)}</div></div>
              </div>
            ))}
          </div>);
        })()}
      </Modal>
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DELIVERIES
// ═══════════════════════════════════════════════════════════════
const DeliveriesPage = ()=>{
  const {deliveries,setDeliveries,suppliers,setSuppliers,rawMaterials,setRawMaterials,setRawMovements,addLog,currentUser,addNotification}=useContext(AppContext);
  const [modal,setModal]=useState(false);
  const [supModal,setSupModal]=useState(false);
  const [toast,setToast]=useState(null);
  const [errs,setErrs]=useState({});
  const [tab,setTab]=useState("deliveries");
  const [form,setForm]=useState({supplierId:"",rawId:"",quantity:"",pricePerUnit:""});
  const [supForm,setSupForm]=useState({name:"",contact:"",email:""});

  const openNew=()=>{setForm({supplierId:suppliers[0]?.id||"",rawId:rawMaterials[0]?.id||"",quantity:"",pricePerUnit:""});setErrs({});setModal(true)};
  const validate=()=>{const e={};if(!form.supplierId)e.supplierId="!";if(!form.rawId)e.rawId="!";if(!form.quantity||+form.quantity<=0)e.quantity="!";if(!form.pricePerUnit||+form.pricePerUnit<=0)e.pricePerUnit="!";setErrs(e);return!Object.keys(e).length};

  const save=()=>{
    if(!validate())return;
    const now=new Date().toISOString();
    const total=+form.quantity*+form.pricePerUnit;
    const del={id:Date.now(),supplierId:+form.supplierId,rawId:+form.rawId,quantity:+form.quantity,pricePerUnit:+form.pricePerUnit,totalPrice:total,date:now,userId:currentUser.id};
    setDeliveries(p=>[...p,del]);
    setRawMaterials(p=>p.map(r=>r.id===+form.rawId?{...r,stock:+(r.stock+ +form.quantity).toFixed(3),updatedAt:now}:r));
    setRawMovements(p=>[...p,{id:Date.now(),rawId:+form.rawId,type:"in",quantity:+form.quantity,reason:`Поставка от ${suppliers.find(s=>s.id===+form.supplierId)?.name}`,date:now}]);
    const rawName=rawMaterials.find(r=>r.id===+form.rawId)?.name;
    const supName=suppliers.find(s=>s.id===+form.supplierId)?.name;
    addLog(`Поставка: ${rawName} x${form.quantity}`);
    addNotification({title:`Новая поставка: ${rawName}`,type:"информация",content:`Получено ${form.quantity} ед. ${rawName} от ${supName} на сумму ${total.toLocaleString("ru")}₽`,targetAll:true});
    setToast({message:"Поставка записана",type:"success"});setModal(false);
  };

  const saveSup=()=>{
    if(!supForm.name.trim()){setToast({message:"Укажите название",type:"error"});return}
    setSuppliers(p=>[...p,{id:Date.now(),name:supForm.name,contact:supForm.contact,email:supForm.email}]);
    addLog(`Поставщик: ${supForm.name}`);
    setToast({message:"Добавлен",type:"success"});setSupModal(false);setSupForm({name:"",contact:"",email:""});
  };

  const sorted=[...deliveries].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const supStats=useMemo(()=>{
    const m={};deliveries.forEach(d=>{if(!m[d.supplierId])m[d.supplierId]={count:0,total:0};m[d.supplierId].count++;m[d.supplierId].total+=d.totalPrice});
    return suppliers.map(s=>({...s,...(m[s.id]||{count:0,total:0})})).sort((a,b)=>b.total-a.total);
  },[suppliers,deliveries]);

  return(
    <div>
      <PageH title="Поставки">
        <div style={{display:"flex",gap:5}}>
          {[["deliveries","Поставки"],["suppliers","Поставщики"],["analytics","Аналитика"]].map(([id,lb])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${tab===id?C.primary:C.border}`,background:tab===id?C.primaryBg:C.surface,color:tab===id?C.primary:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{lb}</button>
          ))}
        </div>
        {tab==="deliveries"&&<Btn onClick={openNew} icon={<I.plus size={15}/>}>Новая поставка</Btn>}
        {tab==="suppliers"&&<Btn onClick={()=>setSupModal(true)} icon={<I.plus size={15}/>}>Добавить</Btn>}
      </PageH>
      {tab==="deliveries"&&<Card s={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>Дата</TH><TH>Поставщик</TH><TH>Сырьё</TH><TH>Кол-во</TH><TH>Цена/ед</TH><TH>Сумма</TH></tr></thead>
          <tbody>{sorted.map(d=>{const sup=suppliers.find(s=>s.id===d.supplierId);const raw=rawMaterials.find(r=>r.id===d.rawId);return(
            <tr key={d.id} style={{borderBottom:`1px solid ${C.border}`}}>
              <TD s={{fontSize:12}}>{fmtDate(d.date)}</TD><TD s={{fontWeight:500}}>{sup?.name||"\u2014"}</TD><TD>{raw?.name||"\u2014"}</TD>
              <TD s={{fontWeight:600}}>{d.quantity} {raw?.unit}</TD><TD s={{color:C.muted}}>{d.pricePerUnit}₽</TD>
              <TD s={{fontWeight:700,color:C.primary}}>{d.totalPrice.toLocaleString("ru")}₽</TD>
            </tr>)})}</tbody>
        </table></div></Card>}
      {tab==="suppliers"&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
        {supStats.map(s=><Card key={s.id}><div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:6}}>{s.name}</div><div style={{fontSize:12,color:C.muted}}>{s.contact}</div><div style={{fontSize:12,color:C.dim,marginBottom:8}}>{s.email}</div><div style={{display:"flex",gap:8}}><Badge color="info">{s.count} поставок</Badge><Badge color="success">{s.total.toLocaleString("ru")}₽</Badge></div></Card>)}
      </div>}
      {tab==="analytics"&&<Card><Title>Объёмы закупок</Title>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={supStats.map(s=>({name:s.name,total:s.total/1000}))}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.dim,fontSize:11}}/><YAxis tick={{fill:C.dim,fontSize:10}}/><Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}} formatter={v=>[`${v}т₽`]}/><Bar dataKey="total" fill={C.info} radius={[4,4,0,0]}/></BarChart>
        </ResponsiveContainer>
      </Card>}
      <Modal open={modal} onClose={()=>setModal(false)} title="Новая поставка">
        <Sel label="Поставщик" value={form.supplierId} onChange={e=>setForm({...form,supplierId:e.target.value})} error={errs.supplierId} options={[{value:"",label:"Выберите"},...suppliers.map(s=>({value:s.id,label:s.name}))]}/>
        <Sel label="Сырьё" value={form.rawId} onChange={e=>setForm({...form,rawId:e.target.value})} error={errs.rawId} options={[{value:"",label:"Выберите"},...rawMaterials.map(r=>({value:r.id,label:`${r.name} (${r.unit})`}))]}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Количество" type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} error={errs.quantity}/>
          <Inp label="Цена за ед." type="number" value={form.pricePerUnit} onChange={e=>setForm({...form,pricePerUnit:e.target.value})} error={errs.pricePerUnit}/>
        </div>
        {form.quantity&&form.pricePerUnit&&<div style={{fontSize:14,fontWeight:700,color:C.primary,textAlign:"right"}}>Итого: {(+form.quantity*+form.pricePerUnit).toLocaleString("ru")}₽</div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}><Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn><Btn onClick={save}>Записать</Btn></div>
      </Modal>
      <Modal open={supModal} onClose={()=>setSupModal(false)} title="Новый поставщик" width={420}>
        <Inp label="Название" value={supForm.name} onChange={e=>setSupForm({...supForm,name:e.target.value})}/>
        <Inp label="Контакт" value={supForm.contact} onChange={e=>setSupForm({...supForm,contact:e.target.value})}/>
        <Inp label="Email" value={supForm.email} onChange={e=>setSupForm({...supForm,email:e.target.value})}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn v="secondary" onClick={()=>setSupModal(false)}>Отмена</Btn><Btn onClick={saveSup}>Добавить</Btn></div>
      </Modal>
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE STATISTICS / KPI
// ═══════════════════════════════════════════════════════════════
const EmployeeStatsPage = ()=>{
  const {users,tasks,marks,taskEmployees,productionOutputs}=useContext(AppContext);
  const workers=users.filter(u=>u.roleId===3);

  const stats=useMemo(()=>workers.map(w=>{
    const wTEs=taskEmployees.filter(te=>te.employeeId===w.id);
    const doneTEs=wTEs.filter(te=>te.status==="завершено"||te.status==="просрочено");
    const wTasks=tasks.filter(t=>(t.userIds||[]).includes(w.id));
    const done=wTasks.filter(t=>t.status==="завершено"||t.status==="просрочено");
    const onTime=done.filter(t=>t.status==="завершено"&&new Date(t.completedAt)<=new Date(t.deadline));
    const fromTasks=doneTEs.reduce((s,te)=>s+te.producedQty,0);
    const fromOutputs=(productionOutputs||[]).filter(o=>o.employeeId===w.id).reduce((s,o)=>s+o.quantity,0);
    const totalProduced=fromTasks+fromOutputs;
    const avgTime=done.length?done.reduce((s,t)=>{const hrs=(new Date(t.completedAt)-new Date(t.createdAt))/(1000*60*60);return s+hrs},0)/done.length:0;
    const activeDays=new Set(done.map(t=>fmtShort(t.completedAt))).size||1;
    const presenceMarks=marks.filter(m=>m.employeeId===w.id&&m.markType==="присутствие").length;
    return{
      id:w.id,name:w.name,shortName:w.name.split(" ").slice(0,2).join(" "),
      total:wTasks.length,done:done.length,pending:wTasks.filter(t=>t.status==="назначено"||t.status==="в работе").length,
      onTime:onTime.length,onTimePct:done.length?(onTime.length/done.length*100).toFixed(0):0,
      produced:totalProduced,avgTime:avgTime.toFixed(1),
      completionPct:wTasks.length?(done.length/wTasks.length*100).toFixed(0):0,
      perDay:(totalProduced/activeDays).toFixed(0),
      rating:done.length?(onTime.length/done.length*50+totalProduced/Math.max(1,wTasks.length)*50).toFixed(0):0,
      presenceMarks,
    };
  }).sort((a,b)=>b.rating-a.rating),[workers,tasks,marks,taskEmployees,productionOutputs]);

  const chartData=stats.map(s=>({name:s.shortName,План:s.total,Факт:s.done,Произведено:s.produced}));

  return(
    <div>
      <PageH title="Статистика сотрудников"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14,marginBottom:18}}>
        <Card><Title>План vs Факт</Title>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="name" tick={{fill:C.dim,fontSize:10}}/><YAxis tick={{fill:C.dim,fontSize:10}}/>
              <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/>
              <Legend wrapperStyle={{fontSize:12}}/>
              <Bar dataKey="План" fill={C.info} radius={[3,3,0,0]}/>
              <Bar dataKey="Факт" fill={C.success} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card><Title>Рейтинг сотрудников</Title>
          {stats.map((s,i)=>{const pct=Math.min(100,+s.rating);return(
            <div key={s.id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:24,height:24,borderRadius:6,background:`${CC[i]}15`,color:CC[i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{i+1}</div>
                  <span style={{fontSize:13,color:C.text,fontWeight:500}}>{s.shortName}</span>
                </div>
                <span style={{fontSize:13,fontWeight:700,color:C.primary}}>{s.rating}</span>
              </div>
              <div style={{height:5,background:C.bg,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:CC[i],borderRadius:3,transition:"width .5s"}}/>
              </div>
            </div>
          );})}
        </Card>
      </div>
      <Card s={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
          <TH>Сотрудник</TH><TH>Заданий</TH><TH>Выполнено</TH><TH>% вып.</TH><TH>В срок</TH><TH>Произведено</TH><TH>Ср. время</TH><TH>В день</TH><TH>Присутствие</TH><TH>Рейтинг</TH>
        </tr></thead>
          <tbody>{stats.map((s,i)=>(
            <tr key={s.id} style={{borderBottom:`1px solid ${C.border}`}}>
              <TD s={{fontWeight:500}}><div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:24,height:24,borderRadius:6,background:`${CC[i]}15`,color:CC[i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700}}>{i+1}</div>
                {s.shortName}
              </div></TD>
              <TD>{s.total}</TD>
              <TD s={{fontWeight:600}}>{s.done}</TD>
              <TD><Badge color={+s.completionPct>=80?"success":+s.completionPct>=50?"primary":"danger"}>{s.completionPct}%</Badge></TD>
              <TD><Badge color={+s.onTimePct>=80?"success":+s.onTimePct>=50?"primary":"danger"}>{s.onTimePct}%</Badge></TD>
              <TD s={{fontWeight:700,color:C.success}}>{s.produced}</TD>
              <TD s={{color:C.muted}}>{s.avgTime}ч</TD>
              <TD s={{fontWeight:600}}>{s.perDay}</TD>
              <TD><Badge color="purple">{s.presenceMarks} дн.</Badge></TD>
              <TD><span style={{fontSize:15,fontWeight:800,color:C.primary}}>{s.rating}</span></TD>
            </tr>
          ))}</tbody>
        </table></div></Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS PAGE
// ═══════════════════════════════════════════════════════════════
const NotificationsPage = ()=>{
  const {notifications,setNotifications,users,currentUser,addLog}=useContext(AppContext);
  const [modal,setModal]=useState(false);
  const [edit,setEdit]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [toast,setToast]=useState(null);
  const [search,setSearch]=useState("");
  const [fType,setFType]=useState("all");
  const [errs,setErrs]=useState({});
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isAdmin=role?.name==="admin";

  const empty={title:"",type:"информация",content:"",targetAll:true,targetUsers:[]};
  const [form,setForm]=useState(empty);

  const visible=useMemo(()=>{
    let list=isAdmin?[...notifications]:notifications.filter(n=>n.targetAll||n.targetUsers?.includes(currentUser.id));
    if(search)list=list.filter(n=>n.title.toLowerCase().includes(search.toLowerCase())||n.content.toLowerCase().includes(search.toLowerCase()));
    if(fType!=="all")list=list.filter(n=>n.type===fType);
    return list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },[notifications,search,fType,isAdmin,currentUser]);

  const markRead=(id)=>{
    setNotifications(p=>p.map(n=>n.id===id?{...n,readBy:[...(n.readBy||[]).filter(x=>x!==currentUser.id),currentUser.id]}:n));
  };

  const openNew=()=>{setEdit(null);setForm(empty);setErrs({});setModal(true)};
  const openEdit=n=>{setEdit(n);setForm({title:n.title,type:n.type,content:n.content,targetAll:n.targetAll,targetUsers:n.targetUsers||[]});setErrs({});setModal(true)};
  const validate=()=>{const e={};if(!form.title.trim())e.title="!";if(!form.content.trim())e.content="!";setErrs(e);return!Object.keys(e).length};

  const save=()=>{
    if(!validate())return;
    if(edit){
      setNotifications(p=>p.map(n=>n.id===edit.id?{...n,title:form.title,type:form.type,content:form.content,targetAll:form.targetAll,targetUsers:form.targetUsers}:n));
      addLog(`Уведомление обновлено: ${form.title}`);
      setToast({message:"Обновлено",type:"success"});
    }else{
      setNotifications(p=>[...p,{id:Date.now(),title:form.title,type:form.type,content:form.content,createdBy:currentUser.id,createdAt:new Date().toISOString(),readBy:[currentUser.id],targetAll:form.targetAll,targetUsers:form.targetUsers}]);
      addLog(`Уведомление создано: ${form.title}`);
      setToast({message:"Создано",type:"success"});
    }
    setModal(false);
  };

  const del=n=>{setConfirm({title:"Удалить уведомление?",message:`Удалить «${n.title}»?`,onConfirm:()=>{setNotifications(p=>p.filter(x=>x.id!==n.id));addLog(`Удалено уведомление: ${n.title}`);setToast({message:"Удалено",type:"error"});setConfirm(null)}})};

  const nColor=t=>t==="ошибка"?"danger":t==="предупреждение"?"orange":"info";
  const nIcon=t=>t==="ошибка"?<I.alert size={16}/>:t==="предупреждение"?<I.alert size={16}/>:<I.bell size={16}/>;

  return(
    <div>
      <PageH title="Уведомления">
        <SearchBox value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={fType} onChange={e=>setFType(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}><option value="all">Все типы</option>{NOTIF_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
        {isAdmin&&<Btn onClick={openNew} icon={<I.plus size={15}/>}>Создать</Btn>}
      </PageH>
      <div style={{display:"grid",gap:10}}>
        {visible.map(n=>{
          const isRead=n.readBy?.includes(currentUser.id);
          const author=n.createdBy===0?"Система":users.find(u=>u.id===n.createdBy)?.name?.split(" ").slice(0,2).join(" ")||"Система";
          return(
            <Card key={n.id} s={{padding:"14px 18px",borderLeft:`3px solid ${n.type==="ошибка"?C.danger:n.type==="предупреждение"?C.orange:C.info}`,opacity:isRead?.85:1}}>
              <div style={{display:"flex",flexWrap:"wrap",alignItems:"flex-start",gap:12}}>
                <div style={{width:34,height:34,borderRadius:8,background:`${n.type==="ошибка"?C.danger:n.type==="предупреждение"?C.orange:C.info}15`,color:n.type==="ошибка"?C.danger:n.type==="предупреждение"?C.orange:C.info,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{nIcon(n.type)}</div>
                <div style={{flex:1,minWidth:200}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                    <span style={{fontSize:14,fontWeight:isRead?500:700,color:C.text}}>{n.title}</span>
                    {!isRead&&<div style={{width:7,height:7,borderRadius:"50%",background:C.primary}}/>}
                    <Badge color={nColor(n.type)}>{n.type}</Badge>
                  </div>
                  <div style={{fontSize:13,color:C.muted,lineHeight:1.5,marginBottom:4}}>{n.content}</div>
                  <div style={{fontSize:11,color:C.dim,display:"flex",gap:12,flexWrap:"wrap"}}>
                    <span>{fmtDate(n.createdAt)}</span>
                    <span>Автор: {author}</span>
                    {n.targetAll?<span>Для всех</span>:<span>Для: {n.targetUsers?.map(uid=>users.find(u=>u.id===uid)?.name?.split(" ")[0]).join(", ")}</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0}}>
                  {!isRead&&<Btn v="ghost" sz="sm" onClick={()=>markRead(n.id)}>Прочитано</Btn>}
                  {isAdmin&&<Btn v="ghost" sz="sm" onClick={()=>openEdit(n)} icon={<I.edit size={13}/>}/>}
                  {isAdmin&&<Btn v="ghost" sz="sm" onClick={()=>del(n)} icon={<I.trash size={13}/>}/>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      {visible.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim}}><I.bell size={36}/><p style={{marginTop:10}}>Нет уведомлений</p></div>}

      <Modal open={modal} onClose={()=>setModal(false)} title={edit?"Редактировать":"Новое уведомление"} width={520}>
        <Inp label="Заголовок" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} error={errs.title}/>
        <Sel label="Тип" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={NOTIF_TYPES.map(t=>({value:t,label:t}))}/>
        <Txa label="Содержание" value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/>
        <div style={{marginBottom:12}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:C.text}}>
            <input type="checkbox" checked={form.targetAll} onChange={e=>setForm({...form,targetAll:e.target.checked,targetUsers:e.target.checked?[]:form.targetUsers})} style={{accentColor:C.primary}}/>
            Для всех пользователей
          </label>
        </div>
        {!form.targetAll&&(
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:12,fontWeight:500,color:C.muted,marginBottom:6}}>Выберите получателей</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {users.map(u=>{
                const sel=form.targetUsers.includes(u.id);
                return <button key={u.id} onClick={()=>setForm({...form,targetUsers:sel?form.targetUsers.filter(x=>x!==u.id):[...form.targetUsers,u.id]})} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${sel?C.primary:C.border}`,background:sel?C.primaryBg:C.surface,color:sel?C.primary:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:sel?600:400}}>{u.name.split(" ").slice(0,2).join(" ")}</button>;
              })}
            </div>
          </div>
        )}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn><Btn onClick={save}>{edit?"Сохранить":"Создать"}</Btn></div>
      </Modal>
      {confirm&&<Confirm open onClose={()=>setConfirm(null)} {...confirm}/>}
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MARKS PAGE
// ═══════════════════════════════════════════════════════════════
const MarksPage = ()=>{
  const {marks,setMarks,users,tasks,products,currentUser,addLog}=useContext(AppContext);
  const [modal,setModal]=useState(false);
  const [edit,setEdit]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [toast,setToast]=useState(null);
  const [search,setSearch]=useState("");
  const [fType,setFType]=useState("all");
  const [fEmployee,setFEmployee]=useState("all");
  const [errs,setErrs]=useState({});
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isAdmin=role?.name==="admin";
  const isManager=role?.name==="manager";
  const isWorker=role?.name==="worker";
  const canCreate=isAdmin||isManager;
  const canEditDel=isAdmin;

  const workers=users.filter(u=>u.roleId===3);
  const completedTasks=tasks.filter(t=>t.status==="завершено"||t.status==="просрочено");
  const empty={employeeId:workers[0]?.id||"",markType:"присутствие",relatedTaskId:"",comment:""};
  const [form,setForm]=useState(empty);

  const visible=useMemo(()=>{
    let list=isWorker?marks.filter(m=>m.employeeId===currentUser.id):[...marks];
    if(search){const s=search.toLowerCase();list=list.filter(m=>{const emp=users.find(u=>u.id===m.employeeId);return emp?.name.toLowerCase().includes(s)||m.comment?.toLowerCase().includes(s)})}
    if(fType!=="all")list=list.filter(m=>m.markType===fType);
    if(fEmployee!=="all")list=list.filter(m=>m.employeeId===+fEmployee);
    return list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },[marks,search,fType,fEmployee,isWorker,currentUser]);

  const openNew=()=>{setEdit(null);setForm(empty);setErrs({});setModal(true)};
  const openEdit=m=>{setEdit(m);setForm({employeeId:m.employeeId,markType:m.markType,relatedTaskId:m.relatedTaskId||"",comment:m.comment||""});setErrs({});setModal(true)};
  const validate=()=>{const e={};if(!form.employeeId)e.employeeId="!";setErrs(e);return!Object.keys(e).length};

  const save=()=>{
    if(!validate())return;
    const empName=users.find(u=>u.id===+form.employeeId)?.name?.split(" ").slice(0,2).join(" ");
    if(edit){
      setMarks(p=>p.map(m=>m.id===edit.id?{...m,employeeId:+form.employeeId,markType:form.markType,relatedTaskId:form.relatedTaskId?+form.relatedTaskId:null,comment:form.comment}:m));
      addLog(`Отметка обновлена: ${empName}`);
      setToast({message:"Обновлено",type:"success"});
    }else{
      setMarks(p=>[...p,{id:Date.now(),employeeId:+form.employeeId,markType:form.markType,relatedTaskId:form.relatedTaskId?+form.relatedTaskId:null,createdBy:currentUser.id,createdAt:new Date().toISOString(),comment:form.comment}]);
      addLog(`Отметка: ${form.markType} — ${empName}`);
      setToast({message:"Отметка создана",type:"success"});
    }
    setModal(false);
  };

  const del=m=>{const empName=users.find(u=>u.id===m.employeeId)?.name?.split(" ").slice(0,2).join(" ");setConfirm({title:"Удалить отметку?",message:`Удалить отметку для ${empName}?`,onConfirm:()=>{setMarks(p=>p.filter(x=>x.id!==m.id));addLog(`Удалена отметка: ${empName}`);setToast({message:"Удалено",type:"error"});setConfirm(null)}})};

  const mtColor=t=>t==="присутствие"?"success":"info";
  const mtIcon=t=>t==="присутствие"?<I.user size={14}/>:<I.check size={14}/>;

  const todayPresent=marks.filter(m=>m.markType==="присутствие"&&fmtShort(m.createdAt)===fmtShort(new Date().toISOString())).map(m=>m.employeeId);
  const markPresence=(wId)=>{
    if(todayPresent.includes(wId)) return;
    setMarks(p=>[...p,{id:Date.now(),employeeId:wId,markType:"присутствие",relatedTaskId:null,createdBy:currentUser.id,createdAt:new Date().toISOString(),comment:""}]);
    const empName=users.find(u=>u.id===wId)?.name?.split(" ").slice(0,2).join(" ");
    addLog(`Присутствие: ${empName}`);
    setToast({message:`${empName} — отмечен`,type:"success"});
  };

  return(
    <div>
      <PageH title="Отметки сотрудников">
        <SearchBox value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={fType} onChange={e=>setFType(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}><option value="all">Все типы</option>{MARK_TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select>
        {!isWorker&&<select value={fEmployee} onChange={e=>setFEmployee(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}><option value="all">Все сотрудники</option>{workers.map(w=><option key={w.id} value={w.id}>{w.name.split(" ").slice(0,2).join(" ")}</option>)}</select>}
        {canCreate&&<Btn onClick={openNew} icon={<I.plus size={15}/>}>Новая отметка</Btn>}
      </PageH>

      {canCreate&&(
        <Card s={{marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <I.user size={16}/>
            <span style={{fontSize:14,fontWeight:700,color:C.text}}>Присутствие сегодня</span>
            <span style={{fontSize:12,color:C.dim}}>{fmtShort(new Date().toISOString())}</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {workers.map(w=>{
              const present=todayPresent.includes(w.id);
              return(
                <button key={w.id} onClick={()=>markPresence(w.id)} disabled={present} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:`1px solid ${present?C.success+"40":C.border}`,background:present?C.successBg:C.surface2,color:present?C.success:C.text,cursor:present?"default":"pointer",fontFamily:"inherit",fontSize:13,fontWeight:500,opacity:present?.8:1,transition:"all .15s"}}>
                  {present?<I.check size={14}/>:<I.user size={14}/>}
                  {w.name.split(" ").slice(0,2).join(" ")}
                  {present&&<span style={{fontSize:10,marginLeft:2}}>\u2713</span>}
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card s={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>
          <TH>Дата/Время</TH><TH>Сотрудник</TH><TH>Тип</TH><TH>Заказ</TH><TH>Автор</TH><TH>Комментарий</TH>{canEditDel&&<TH></TH>}
        </tr></thead>
          <tbody>{visible.map(m=>{
            const emp=users.find(u=>u.id===m.employeeId);
            const author=users.find(u=>u.id===m.createdBy);
            const task=m.relatedTaskId?tasks.find(t=>t.id===m.relatedTaskId):null;
            const prod=task?products.find(p=>p.id===task.productId):null;
            return(
              <tr key={m.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <TD s={{fontSize:12,whiteSpace:"nowrap"}}>{fmtDate(m.createdAt)}</TD>
                <TD s={{fontWeight:500}}>{emp?.name?.split(" ").slice(0,2).join(" ")||"\u2014"}</TD>
                <TD><Badge color={mtColor(m.markType)}>{mtIcon(m.markType)} <span style={{marginLeft:4}}>{m.markType}</span></Badge></TD>
                <TD s={{color:C.muted,fontSize:12}}>{task?`#${task.id} ${prod?.name||""} x${task.quantity}`:"\u2014"}</TD>
                <TD s={{color:C.dim,fontSize:12}}>{author?.name?.split(" ").slice(0,2).join(" ")||"\u2014"}</TD>
                <TD s={{color:C.muted,fontSize:12,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.comment||"\u2014"}</TD>
                {canEditDel&&<TD><div style={{display:"flex",gap:4}}>
                  <Btn v="ghost" sz="sm" onClick={()=>openEdit(m)} icon={<I.edit size={13}/>}/>
                  <Btn v="ghost" sz="sm" onClick={()=>del(m)} icon={<I.trash size={13}/>}/>
                </div></TD>}
              </tr>
            );
          })}</tbody>
        </table></div></Card>
      {visible.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim}}><I.clip size={36}/><p style={{marginTop:10}}>Нет отметок</p></div>}

      <Modal open={modal} onClose={()=>setModal(false)} title={edit?"Редактировать отметку":"Новая отметка"}>
        <Sel label="Сотрудник" value={form.employeeId} onChange={e=>setForm({...form,employeeId:e.target.value})} error={errs.employeeId} options={[{value:"",label:"Выберите"},...workers.map(w=>({value:w.id,label:w.name}))]}/>
        <Sel label="Тип отметки" value={form.markType} onChange={e=>setForm({...form,markType:e.target.value})} options={MARK_TYPES.map(t=>({value:t,label:t}))}/>
        {form.markType==="выполненный заказ"&&(
          <Sel label="Связанный заказ" value={form.relatedTaskId} onChange={e=>setForm({...form,relatedTaskId:e.target.value})} options={[{value:"",label:"Без привязки"},...completedTasks.filter(t=>(t.userIds||[]).includes(+form.employeeId)).map(t=>{const p=products.find(x=>x.id===t.productId);return{value:t.id,label:`#${t.id} ${p?.name||""} x${t.quantity}`}})]}/>
        )}
        <Txa label="Комментарий" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn><Btn onClick={save}>{edit?"Сохранить":"Создать"}</Btn></div>
      </Modal>
      {confirm&&<Confirm open onClose={()=>setConfirm(null)} {...confirm}/>}
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════
const ReportsPage = ()=>{
  const {products,tasks,rawMaterials,deliveries,rawMovements}=useContext(AppContext);
  const [tab,setTab]=useState("stock");
  const ap=products.filter(p=>!p.deleted);
  const tabs=[{id:"stock",l:"Продукция"},{id:"raw",l:"Сырьё"},{id:"production",l:"Производство"},{id:"purchases",l:"Закупки"},{id:"profit",l:"Прибыль"}];

  const prodData=useMemo(()=>{
    const m={};tasks.filter(t=>t.status==="завершено").forEach(t=>{const p=products.find(x=>x.id===t.productId);const k=p?.name||"?";m[k]=(m[k]||0)+t.quantity});
    return Object.entries(m).map(([name,qty])=>({name:name.length>14?name.slice(0,14)+"\u2026":name,qty})).sort((a,b)=>b.qty-a.qty);
  },[tasks,products]);

  const rawConsumption=useMemo(()=>{
    const m={};rawMovements.filter(x=>x.type==="out").forEach(x=>{const r=rawMaterials.find(rr=>rr.id===x.rawId);const k=r?.name||"?";m[k]=(m[k]||0)+x.quantity});
    return Object.entries(m).map(([name,qty])=>({name:name.length>14?name.slice(0,14)+"\u2026":name,qty:+qty.toFixed(1)})).sort((a,b)=>b.qty-a.qty);
  },[rawMovements,rawMaterials]);

  return(
    <div>
      <PageH title="Отчёты"/>
      <div style={{display:"flex",gap:5,marginBottom:18,flexWrap:"wrap"}}>
        {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${tab===t.id?C.primary:C.border}`,background:tab===t.id?C.primaryBg:C.surface,color:tab===t.id?C.primary:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{t.l}</button>)}
      </div>
      {tab==="stock"&&<Card><Title>Остатки готовой продукции</Title>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={ap.map(p=>({name:p.name.length>14?p.name.slice(0,14)+"\u2026":p.name,stock:p.stock}))} layout="vertical" margin={{left:10}}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis type="number" tick={{fill:C.dim,fontSize:10}}/><YAxis dataKey="name" type="category" width={120} tick={{fill:C.muted,fontSize:11}}/>
            <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/><Bar dataKey="stock" fill={C.primary} radius={[0,4,4,0]}/>
          </BarChart>
        </ResponsiveContainer>
        <div style={{marginTop:14,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>Товар</TH><TH>Категория</TH><TH>Остаток</TH><TH>Цена</TH><TH>Стоимость</TH></tr></thead>
          <tbody>{ap.sort((a,b)=>b.stock-a.stock).map(p=>(
            <tr key={p.id} style={{borderBottom:`1px solid ${C.border}`}}><TD s={{fontWeight:500}}>{p.name}</TD><TD><Badge color="purple">{p.category}</Badge></TD><TD s={{fontWeight:600,color:p.stock<20?C.danger:C.text}}>{p.stock} {p.unit}</TD><TD s={{color:C.muted}}>{p.sellPrice}₽</TD><TD s={{fontWeight:600,color:C.success}}>{(p.stock*p.sellPrice).toLocaleString("ru")}₽</TD></tr>
          ))}</tbody></table></div>
      </Card>}
      {tab==="raw"&&<Card><Title>Склад сырья</Title>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rawMaterials.map(r=>({name:r.name.length>12?r.name.slice(0,12)+"\u2026":r.name,stock:r.stock,min:r.minStock}))}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.dim,fontSize:9}}/><YAxis tick={{fill:C.dim,fontSize:10}}/><Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/><Legend wrapperStyle={{fontSize:11}}/><Bar dataKey="stock" fill={C.info} radius={[3,3,0,0]} name="Остаток"/><Bar dataKey="min" fill={C.danger} radius={[3,3,0,0]} name="Минимум"/></BarChart>
        </ResponsiveContainer>
      </Card>}
      {tab==="production"&&<Card><Title>Производство по товарам</Title>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={prodData}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.dim,fontSize:10}}/><YAxis tick={{fill:C.dim,fontSize:10}}/><Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/><Bar dataKey="qty" fill={C.success} radius={[4,4,0,0]} name="Произведено"/></BarChart>
        </ResponsiveContainer>
        {rawConsumption.length>0&&<><Title>Расход сырья</Title>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rawConsumption}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.dim,fontSize:10}}/><YAxis tick={{fill:C.dim,fontSize:10}}/><Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/><Bar dataKey="qty" fill={C.danger} radius={[4,4,0,0]} name="Расход"/></BarChart>
          </ResponsiveContainer></>}
      </Card>}
      {tab==="purchases"&&<Card><Title>Закупки</Title>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>Дата</TH><TH>Сырьё</TH><TH>Кол-во</TH><TH>Цена</TH><TH>Сумма</TH></tr></thead>
          <tbody>{[...deliveries].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(d=>{const raw=rawMaterials.find(r=>r.id===d.rawId);return(
            <tr key={d.id} style={{borderBottom:`1px solid ${C.border}`}}><TD s={{fontSize:12}}>{fmtShort(d.date)}</TD><TD s={{fontWeight:500}}>{raw?.name}</TD><TD>{d.quantity} {raw?.unit}</TD><TD s={{color:C.muted}}>{d.pricePerUnit}₽</TD><TD s={{fontWeight:700,color:C.primary}}>{d.totalPrice.toLocaleString("ru")}₽</TD></tr>
          )})}</tbody></table></div>
        <div style={{marginTop:12,textAlign:"right",fontSize:15,fontWeight:700,color:C.primary}}>Итого: {deliveries.reduce((s,d)=>s+d.totalPrice,0).toLocaleString("ru")}₽</div>
      </Card>}
      {tab==="profit"&&<Card><Title>Прибыль по товарам</Title>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={ap.map(p=>({name:p.name.length>14?p.name.slice(0,14)+"\u2026":p.name,profit:(p.sellPrice-p.costPrice)*p.stock})).sort((a,b)=>b.profit-a.profit)}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.dim,fontSize:10}}/><YAxis tick={{fill:C.dim,fontSize:10}}/><Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/><Bar dataKey="profit" fill={C.success} radius={[4,4,0,0]} name="Прибыль"/></BarChart>
        </ResponsiveContainer>
        <div style={{marginTop:14,overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><TH>Товар</TH><TH>Себестоимость</TH><TH>Цена</TH><TH>Маржа</TH><TH>Прибыль</TH></tr></thead>
          <tbody>{ap.sort((a,b)=>(b.sellPrice-b.costPrice)*b.stock-(a.sellPrice-a.costPrice)*a.stock).map(p=>(
            <tr key={p.id} style={{borderBottom:`1px solid ${C.border}`}}><TD s={{fontWeight:500}}>{p.name}</TD><TD s={{color:C.muted}}>{p.costPrice}₽</TD><TD>{p.sellPrice}₽</TD><TD><Badge color="primary">{((p.sellPrice-p.costPrice)/p.costPrice*100).toFixed(0)}%</Badge></TD><TD s={{fontWeight:700,color:C.success}}>{((p.sellPrice-p.costPrice)*p.stock).toLocaleString("ru")}₽</TD></tr>
          ))}</tbody></table></div>
      </Card>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// WORKER HISTORY PAGE
// ═══════════════════════════════════════════════════════════════
const WorkerHistoryPage = ()=>{
  const {users,tasks,taskEmployees,employeeHistory,marks,currentUser,products,productionOutputs}=useContext(AppContext);
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isWorker=role?.name==="worker";
  const workers=users.filter(u=>u.roleId===3);
  const [selectedWorker,setSelectedWorker]=useState(isWorker?currentUser.id:(workers[0]?.id||""));
  const [monthFilter,setMonthFilter]=useState("");

  const worker=users.find(u=>u.id===+selectedWorker);
  const wTEs=taskEmployees.filter(te=>te.employeeId===+selectedWorker);
  const doneTEs=wTEs.filter(te=>te.status==="завершено"||te.status==="просрочено");
  const fromTasks=doneTEs.reduce((s,te)=>s+te.producedQty,0);
  const fromOutputs=(productionOutputs||[]).filter(o=>o.employeeId===+selectedWorker).reduce((s,o)=>s+o.quantity,0);
  const totalProduced=fromTasks+fromOutputs;
  const wTasks=tasks.filter(t=>(t.userIds||[]).includes(+selectedWorker));
  const doneTasks=wTasks.filter(t=>t.status==="завершено"||t.status==="просрочено");
  const onTimeTasks=doneTasks.filter(t=>t.status==="завершено"&&new Date(t.completedAt)<=new Date(t.deadline));

  const history=useMemo(()=>{
    let h=[...employeeHistory.filter(eh=>eh.employeeId===+selectedWorker)];
    if(monthFilter){
      h=h.filter(eh=>eh.date.startsWith(monthFilter));
    }
    return h.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[employeeHistory,selectedWorker,monthFilter]);

  // Generate month options from history
  const months=useMemo(()=>{
    const s=new Set();
    employeeHistory.filter(eh=>eh.employeeId===+selectedWorker).forEach(eh=>{s.add(eh.date.slice(0,7))});
    return [...s].sort().reverse();
  },[employeeHistory,selectedWorker]);

  return(
    <div>
      <PageH title="История работников">
        {!isWorker&&<select value={selectedWorker} onChange={e=>setSelectedWorker(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}>
          {workers.map(w=><option key={w.id} value={w.id}>{w.name.split(" ").slice(0,2).join(" ")}</option>)}
        </select>}
        <select value={monthFilter} onChange={e=>setMonthFilter(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}>
          <option value="">Все месяцы</option>
          {months.map(m=><option key={m} value={m}>{m}</option>)}
        </select>
      </PageH>

      {/* Worker profile header */}
      {worker&&(
        <Card s={{marginBottom:16,padding:"18px 20px"}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:20,alignItems:"center"}}>
            <div style={{width:50,height:50,borderRadius:12,background:`linear-gradient(135deg, ${C.primary}25, ${C.primary}10)`,display:"flex",alignItems:"center",justifyContent:"center",color:C.primary,fontWeight:800,fontSize:20,border:`2px solid ${C.primary}30`}}>{worker.name.charAt(0)}</div>
            <div style={{flex:"1 1 200px"}}>
              <div style={{fontSize:17,fontWeight:700,color:C.text}}>{worker.name}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:2}}>{ROLES.find(r=>r.id===worker.roleId)?.label} \u00b7 {worker.email}</div>
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              <div style={{background:C.bg,borderRadius:8,padding:"8px 14px",textAlign:"center",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:18,fontWeight:800,color:C.primary}}>{doneTasks.length}</div>
                <div style={{fontSize:10,color:C.dim}}>Выполнено</div>
              </div>
              <div style={{background:C.bg,borderRadius:8,padding:"8px 14px",textAlign:"center",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:18,fontWeight:800,color:C.success}}>{totalProduced}</div>
                <div style={{fontSize:10,color:C.dim}}>Произведено</div>
              </div>
              <div style={{background:C.bg,borderRadius:8,padding:"8px 14px",textAlign:"center",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:18,fontWeight:800,color:doneTasks.length?(onTimeTasks.length/doneTasks.length*100)>=80?C.success:C.danger:C.dim}}>{doneTasks.length?(onTimeTasks.length/doneTasks.length*100).toFixed(0):0}%</div>
                <div style={{fontSize:10,color:C.dim}}>В срок</div>
              </div>
              <div style={{background:C.bg,borderRadius:8,padding:"8px 14px",textAlign:"center",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:18,fontWeight:800,color:C.info}}>{marks.filter(m=>m.employeeId===+selectedWorker&&m.markType==="присутствие").length}</div>
                <div style={{fontSize:10,color:C.dim}}>Присутствие</div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* History table */}
      <Card s={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <TH>Дата</TH><TH>Статус</TH><TH>Задания</TH><TH>Произведено</TH><TH>Время</TH><TH>Комментарий</TH>
            </tr></thead>
            <tbody>
              {history.map(h=>(
                <tr key={h.id} style={{borderBottom:`1px solid ${C.border}`,background:h.attendance==="absent"?C.dangerBg:"transparent"}}>
                  <TD s={{fontWeight:500,whiteSpace:"nowrap"}}>{h.date}</TD>
                  <TD><Badge color={h.attendance==="present"?"success":"danger"}>{h.attendance==="present"?"Был":"Отсутствовал"}</Badge></TD>
                  <TD s={{fontWeight:600}}>{h.attendance==="present"?h.tasksCompleted:"\u2014"}</TD>
                  <TD s={{fontWeight:600,color:C.primary}}>{h.attendance==="present"&&h.producedQty>0?h.producedQty:"\u2014"}</TD>
                  <TD s={{color:C.muted,fontSize:12}}>{h.attendance==="present"&&h.workStart?`${h.workStart}\u2013${h.workEnd}`:"\u2014"}</TD>
                  <TD s={{color:C.dim,fontSize:12,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.comment||"\u2014"}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {history.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim}}><I.clock size={36}/><p style={{marginTop:10}}>Нет записей</p></div>}

      {/* Task contributions */}
      <Card s={{marginTop:16}}>
        <Title>Вклад по заданиям</Title>
        <div style={{display:"grid",gap:8}}>
          {doneTEs.slice(0,20).map(te=>{
            const task=tasks.find(t=>t.id===te.taskId);
            const prod=task?products.find(p=>p.id===task.productId):null;
            return(
              <div key={te.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <div style={{flex:1}}>
                  <span style={{fontSize:13,fontWeight:500,color:C.text}}>{prod?.name||"\u2014"}</span>
                  <span style={{fontSize:11,color:C.dim,marginLeft:8}}>Задание #{te.taskId}</span>
                </div>
                <Badge color={te.status==="завершено"?"success":"danger"}>{te.producedQty} {prod?.unit||""}</Badge>
                <span style={{fontSize:11,color:C.dim}}>{task?fmtShort(task.completedAt):""}</span>
              </div>
            );
          })}
        </div>
        {doneTEs.length===0&&<div style={{textAlign:"center",padding:20,color:C.dim,fontSize:13}}>Нет выполненных заданий</div>}
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CLIENTS & ORDERS
// ═══════════════════════════════════════════════════════════════
const ClientsPage = ()=>{
  const {clients,setClients,clientOrders,setClientOrders,products,setProducts,addLog,currentUser,users,sales,inventoryMovements,setInventoryMovements,addNotification}=useContext(AppContext);
  const [tab,setTab]=useState("clients");
  const [modal,setModal]=useState(false);
  const [orderModal,setOrderModal]=useState(false);
  const [toast,setToast]=useState(null);
  const [errs,setErrs]=useState({});
  const [selectedClient,setSelectedClient]=useState(null);
  const [historyOrder,setHistoryOrder]=useState(null);
  const [form,setForm]=useState({name:"",contact:"",phone:"",email:"",address:"",comment:""});
  const ap=products.filter(p=>!p.deleted);
  const [orderForm,setOrderForm]=useState({clientId:"",items:[{productId:ap[0]?.id||"",qty:""}],note:""});
  const role=ROLES.find(r=>r.id===currentUser.roleId);

  // Calculate reserved quantities (orders in non-final status)
  const reserved=useMemo(()=>{
    const m={};
    clientOrders.filter(o=>o.status==="новый"||o.status==="в производстве"||o.status==="готов").forEach(o=>{
      o.items.forEach(it=>{m[it.productId]=(m[it.productId]||0)+it.qty});
    });
    return m;
  },[clientOrders]);

  const getAvailable=(productId)=>{
    const p=products.find(x=>x.id===productId);
    return (p?.stock||0)-(reserved[productId]||0);
  };

  const openNewClient=()=>{setForm({name:"",contact:"",phone:"",email:"",address:"",comment:""});setErrs({});setModal(true)};
  const saveClient=()=>{
    if(!form.name.trim()){setErrs({name:"!"});return}
    setClients(p=>[...p,{id:Date.now(),name:form.name,contact:form.contact,phone:form.phone,email:form.email,address:form.address,comment:form.comment,createdAt:new Date().toISOString()}]);
    addLog(`Клиент: ${form.name}`);setToast({message:"Клиент добавлен",type:"success"});setModal(false);
  };

  const addOrderItem=()=>setOrderForm(f=>({...f,items:[...f.items,{productId:ap[0]?.id||"",qty:""}]}));
  const removeOrderItem=(i)=>setOrderForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}));
  const updateOrderItem=(i,field,val)=>setOrderForm(f=>({...f,items:f.items.map((it,idx)=>idx===i?{...it,[field]:val}:it)}));

  const openNewOrder=()=>{setOrderForm({clientId:clients[0]?.id||"",items:[{productId:ap[0]?.id||"",qty:""}],note:"",priority:"нормальный"});setErrs({});setOrderModal(true)};

  const saveOrder=()=>{
    if(!orderForm.clientId){setErrs({clientId:"!"});return}
    const validItems=orderForm.items.filter(it=>it.productId&&it.qty&&+it.qty>0);
    if(!validItems.length){setToast({message:"Добавьте товары",type:"error"});return}
    // Check stock
    for(const it of validItems){
      const avail=getAvailable(+it.productId);
      const pName=products.find(p=>p.id===+it.productId)?.name;
      if(+it.qty>avail){setToast({message:`Недостаточно: ${pName} (доступно ${avail})`,type:"error"});return}
    }
    const total=validItems.reduce((s,it)=>{const p=products.find(x=>x.id===+it.productId);return s+(p?p.sellPrice*+it.qty:0)},0);
    const now=new Date().toISOString();
    setClientOrders(p=>[...p,{id:Date.now(),clientId:+orderForm.clientId,items:validItems.map(it=>({productId:+it.productId,qty:+it.qty})),orderDate:now,status:"новый",total,note:orderForm.note,priority:orderForm.priority||"нормальный",statusChangedAt:now,shippedAt:null,shippedBy:null,history:[{from:null,to:"новый",userId:currentUser.id,userName:currentUser.name,at:now}]}]);
    addLog(`Заказ: ${clients.find(c=>c.id===+orderForm.clientId)?.name} — ${total.toLocaleString("ru")} ₽`);
    setToast({message:"Заказ создан (товар зарезервирован)",type:"success"});setOrderModal(false);
  };

  const updateOrderStatus=(order,newStatus)=>{
    const now=new Date().toISOString();
    setClientOrders(p=>p.map(o=>o.id===order.id?{...o,status:newStatus,statusChangedAt:now,history:[...(o.history||[]),{from:o.status,to:newStatus,userId:currentUser.id,userName:currentUser.name,at:now}]}:o));
    setToast({message:"Статус обновлён",type:"success"});
  };

  // SHIP ORDER — deduct stock
  const shipOrder=(order)=>{
    const now=new Date().toISOString();
    // Check stock availability
    for(const it of order.items){
      const p=products.find(x=>x.id===it.productId);
      if(!p||p.stock<it.qty){
        setToast({message:`Недостаточно: ${p?.name||"?"} (на складе ${p?.stock||0}, нужно ${it.qty})`,type:"error"});return;
      }
    }
    // Deduct stock and log movements
    order.items.forEach(it=>{
      setProducts(prev=>prev.map(p=>{
        if(p.id!==it.productId) return p;
        const newStock=p.stock-it.qty;
        return {...p,stock:newStock,updatedAt:now};
      }));
      const p=products.find(x=>x.id===it.productId);
      setInventoryMovements(prev=>[...prev,{id:Date.now()+Math.random(),productId:it.productId,type:"order_shipment",quantity:-it.qty,balance:(p?.stock||0)-it.qty,refId:`order-${order.id}`,createdAt:now}]);
    });
    setClientOrders(prev=>prev.map(o=>o.id===order.id?{...o,status:"отгружен",shippedAt:now,shippedBy:currentUser.id,history:[...(o.history||[]),{from:o.status,to:"отгружен",userId:currentUser.id,userName:currentUser.name,at:now}]}:o));
    const cName=clients.find(c=>c.id===order.clientId)?.name;
    addLog(`Отгрузка заказа #${order.id} для ${cName}`);
    addNotification({title:`Заказ #${order.id} отгружен`,type:"информация",content:`Заказ для ${cName} отгружен`,targetAll:true});
    setToast({message:"Заказ отгружен, товар списан со склада",type:"success"});
  };

  const clientStats=clients.map(c=>{
    const orders=clientOrders.filter(o=>o.clientId===c.id);
    return{...c,orderCount:orders.length,totalSpent:orders.reduce((s,o)=>s+o.total,0)};
  });

  const stIco=(s)=>s==="отгружен"?"success":s==="отменён"?"danger":s==="готов"?"purple":"info";

  return(
    <div>
      <PageH title="Клиенты и заказы">
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          {[["clients","Клиенты"],["orders","Заказы"]].map(([id,lb])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${tab===id?C.primary:C.border}`,background:tab===id?C.primaryBg:C.surface,color:tab===id?C.primary:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{lb}</button>
          ))}
          <button onClick={()=>window.open(window.location.href.split("?")[0]+"?board=1","_blank")} style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${C.border}`,background:C.surface,color:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>⬡ Панель</button>
        </div>
        {tab==="clients"&&<Btn onClick={openNewClient} icon={<I.plus size={15}/>}>Новый клиент</Btn>}
        {tab==="orders"&&<Btn onClick={openNewOrder} icon={<I.plus size={15}/>}>Новый заказ</Btn>}
      </PageH>

      {tab==="clients"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:12}}>
          {clientStats.map(c=>(
            <Card key={c.id} s={{cursor:"pointer"}} onClick={()=>setSelectedClient(selectedClient===c.id?null:c.id)}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div style={{fontSize:15,fontWeight:700,color:C.text}}>{c.name}</div>
                <Badge color="info">{c.orderCount} зак.</Badge>
              </div>
              <div style={{fontSize:12,color:C.muted}}>{c.contact} · {c.phone}</div>
              {c.address&&<div style={{fontSize:11,color:C.dim}}>{c.address}</div>}
              <div style={{marginTop:8}}><Badge color="success">{c.totalSpent.toLocaleString("ru")} ₽</Badge></div>
              {selectedClient===c.id&&(
                <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.text,marginBottom:6}}>История заказов:</div>
                  {clientOrders.filter(o=>o.clientId===c.id).sort((a,b)=>new Date(b.orderDate)-new Date(a.orderDate)).map(o=>(
                    <div key={o.id} style={{padding:"6px 0",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:12,color:C.text}}>{o.items.map(it=>{const p=products.find(x=>x.id===it.productId);return`${p?.name||"?"} x${it.qty}`}).join(", ")}</div>
                        <div style={{fontSize:10,color:C.dim}}>{fmtShort(o.orderDate)} {o.shippedAt?`· Отгружен: ${fmtShort(o.shippedAt)}`:""}</div>
                      </div>
                      <Badge color={stIco(o.status)} s={{fontSize:10}}>{o.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab==="orders"&&(
        <Card s={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>#</TH><TH>Дата</TH><TH>Клиент</TH><TH>Товары</TH><TH>Сумма</TH><TH>Статус</TH><TH>Отгрузка</TH><TH></TH><TH></TH></tr></thead>
            <tbody>{[...clientOrders].sort((a,b)=>new Date(b.orderDate)-new Date(a.orderDate)).map(o=>{
              const cl=clients.find(c=>c.id===o.clientId);
              const shipper=o.shippedBy?users.find(u=>u.id===o.shippedBy):null;
              return(
                <tr key={o.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <TD s={{fontWeight:600,color:C.dim}}>#{o.id}</TD>
                  <TD s={{fontSize:12,whiteSpace:"nowrap"}}>{fmtShort(o.orderDate)}</TD>
                  <TD s={{fontWeight:500}}>{cl?.name||"—"}</TD>
                  <TD s={{fontSize:12}}>{o.items.map(it=>{const p=products.find(x=>x.id===it.productId);return`${p?.name||"?"} x${it.qty}`}).join(", ")}</TD>
                  <TD s={{fontWeight:700,color:C.primary}}>{o.total.toLocaleString("ru")} ₽</TD>
                  <TD>
                    {o.status!=="отгружен"&&o.status!=="отменён"?
                      <select value={o.status} onChange={e=>updateOrderStatus(o,e.target.value)} style={{padding:"4px 6px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,fontSize:11,fontFamily:"inherit"}}>
                        {ORDER_STATUSES.filter(s=>s!=="отгружен").map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                      :<Badge color={stIco(o.status)}>{o.status}</Badge>
                    }
                  </TD>
                  <TD s={{fontSize:11,color:C.dim}}>
                    {o.shippedAt?<span>{fmtShort(o.shippedAt)}<br/>{shipper?.name?.split(" ").slice(0,2).join(" ")}</span>:"—"}
                  </TD>
                  <TD>
                    {(o.status==="готов")&&<Btn sz="sm" v="success" onClick={()=>shipOrder(o)} icon={<I.truck size={13}/>}>Отгрузить</Btn>}
                  </TD>
                  <TD>
                    {(o.history||[]).length>0&&<button onClick={()=>setHistoryOrder(o)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:11,padding:"2px 6px",borderRadius:4,textDecoration:"underline",fontFamily:"inherit"}} title="История изменений">История</button>}
                  </TD>
                </tr>
              );
            })}</tbody>
          </table>
        </div></Card>
      )}

      {/* New Client Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Новый клиент" width={480}>
        <Inp label="Название компании" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} error={errs.name}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Контактное лицо" value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/>
          <Inp label="Телефон" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/>
          <Inp label="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
          <Inp label="Адрес" value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/>
        </div>
        <Txa label="Комментарий" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}><Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn><Btn onClick={saveClient}>Добавить</Btn></div>
      </Modal>

      {/* New Order Modal with stock check */}
      <Modal open={orderModal} onClose={()=>setOrderModal(false)} title="Новый заказ" width={560}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Sel label="Клиент" value={orderForm.clientId} onChange={e=>setOrderForm({...orderForm,clientId:e.target.value})} error={errs.clientId} options={[{value:"",label:"Выберите"},...clients.map(c=>({value:c.id,label:c.name}))]}/>
          <Sel label="Приоритет" value={orderForm.priority||"нормальный"} onChange={e=>setOrderForm({...orderForm,priority:e.target.value})} options={ORDER_PRIORITIES.map(p=>({value:p,label:p}))}/>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <label style={{fontSize:12,fontWeight:500,color:C.muted}}>Товары</label>
            <Btn v="secondary" sz="sm" onClick={addOrderItem} icon={<I.plus size={12}/>}>Добавить</Btn>
          </div>
          {orderForm.items.map((it,i)=>{
            const avail=it.productId?getAvailable(+it.productId):0;
            const shortage=it.qty&&+it.qty>avail;
            return(
              <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-end"}}>
                <div style={{flex:2}}>
                  <select value={it.productId} onChange={e=>updateOrderItem(i,"productId",e.target.value)} style={{width:"100%",padding:"7px 8px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,fontFamily:"inherit"}}>
                    {ap.map(p=><option key={p.id} value={p.id}>{p.name} — {p.sellPrice} ₽ (дост: {getAvailable(p.id)})</option>)}
                  </select>
                </div>
                <div style={{flex:1}}>
                  <input type="number" placeholder="Кол-во" value={it.qty} onChange={e=>updateOrderItem(i,"qty",e.target.value)} style={{width:"100%",padding:"7px 8px",background:C.bg,border:`1px solid ${shortage?C.danger:C.border}`,borderRadius:6,color:shortage?C.danger:C.text,fontSize:12,fontFamily:"inherit",boxSizing:"border-box"}}/>
                </div>
                {shortage&&<span style={{fontSize:10,color:C.danger,flexShrink:0}}>мало!</span>}
                {orderForm.items.length>1&&<button onClick={()=>removeOrderItem(i)} style={{background:"none",border:"none",color:C.danger,cursor:"pointer",padding:4}}><I.x size={14}/></button>}
              </div>
            );
          })}
          {(()=>{const t=orderForm.items.reduce((s,it)=>{const p=products.find(x=>x.id===+it.productId);return s+(p&&it.qty?p.sellPrice*(+it.qty):0)},0);return t>0?<div style={{textAlign:"right",fontSize:14,fontWeight:700,color:C.primary,marginTop:6}}>Итого: {t.toLocaleString("ru")} ₽</div>:null})()}
        </div>
        <Txa label="Примечание" value={orderForm.note} onChange={e=>setOrderForm({...orderForm,note:e.target.value})}/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}><Btn v="secondary" onClick={()=>setOrderModal(false)}>Отмена</Btn><Btn onClick={saveOrder}>Создать заказ</Btn></div>
      </Modal>

      {/* Order history modal */}
      <Modal open={!!historyOrder} onClose={()=>setHistoryOrder(null)} title={`История заказа #${historyOrder?.id}`} width={420}>
        {historyOrder&&(
          <div>
            {(historyOrder.history||[]).length===0
              ? <div style={{color:C.dim,fontSize:13,textAlign:"center",padding:"16px 0"}}>История не записана</div>
              : (historyOrder.history||[]).map((h,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"8px 0",borderBottom:i<(historyOrder.history.length-1)?`1px solid ${C.border}`:"none"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:C.primary,marginTop:5,flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:12,color:C.text}}>
                      {h.from?<><span style={{color:C.dim}}>{h.from}</span>{" → "}<span style={{fontWeight:600}}>{h.to}</span></>:<span style={{fontWeight:600}}>Создан: {h.to}</span>}
                    </div>
                    <div style={{fontSize:11,color:C.dim,marginTop:2}}>{h.userName} · {h.at?new Date(h.at).toLocaleString("ru",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}):""}</div>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </Modal>
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// QUICK SALES
// ═══════════════════════════════════════════════════════════════
const SalesPage = ()=>{
  const {products,setProducts,clients,users,sales,setSales,inventoryMovements,setInventoryMovements,addLog,currentUser}=useContext(AppContext);
  const [modal,setModal]=useState(false);
  const [toast,setToast]=useState(null);
  const ap=products.filter(p=>!p.deleted);
  const [form,setForm]=useState({productId:ap[0]?.id||"",quantity:"",clientId:""});

  const sell=()=>{
    if(!form.productId||!form.quantity||+form.quantity<=0){setToast({message:"Укажите товар и количество",type:"error"});return}
    const p=products.find(x=>x.id===+form.productId);
    if(!p||p.stock<+form.quantity){setToast({message:`Недостаточно: ${p?.name||"?"} (на складе ${p?.stock||0})`,type:"error"});return}
    const now=new Date().toISOString();
    const saleId=Date.now();
    setSales(prev=>[...prev,{id:saleId,productId:+form.productId,quantity:+form.quantity,clientId:form.clientId?+form.clientId:null,soldBy:currentUser.id,createdAt:now}]);
    const newStock=p.stock-+form.quantity;
    setProducts(prev=>prev.map(x=>x.id===+form.productId?{...x,stock:newStock,updatedAt:now}:x));
    setInventoryMovements(prev=>[...prev,{id:Date.now()+Math.random(),productId:+form.productId,type:"sale",quantity:-+form.quantity,balance:newStock,refId:`sale-${saleId}`,createdAt:now}]);
    const revenue=p.sellPrice*+form.quantity;
    addLog(`Продажа: ${p.name} x${form.quantity} = ${revenue.toLocaleString("ru")} ₽`);
    setToast({message:`Продано: ${p.name} x${form.quantity}`,type:"success"});
    setForm({productId:ap[0]?.id||"",quantity:"",clientId:""});setModal(false);
  };

  // Stock indicator
  const stockInd=(p)=>{
    if(p.stock<=10) return {color:C.danger,label:"Критически"};
    if(p.stock<=30) return {color:C.primary,label:"Мало"};
    return {color:C.success,label:"Достаточно"};
  };

  return(
    <div>
      <PageH title="Продажи">
        <Btn onClick={()=>setModal(true)} icon={<I.plus size={15}/>}>Быстрая продажа</Btn>
      </PageH>

      {/* Stock overview with indicators */}
      <Card s={{marginBottom:16}}>
        <Title>Склад готовой продукции</Title>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
          {ap.map(p=>{
            const ind=stockInd(p);
            return(
              <div key={p.id} style={{padding:"10px 14px",background:C.bg,borderRadius:8,border:`1px solid ${ind.color}25`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:13,fontWeight:600,color:C.text}}>{p.name}</span>
                  <span style={{width:8,height:8,borderRadius:"50%",background:ind.color}}/>
                </div>
                <div style={{fontSize:18,fontWeight:800,color:ind.color}}>{p.stock} <span style={{fontSize:12,fontWeight:400}}>{p.unit}</span></div>
                <div style={{fontSize:10,color:C.dim}}>{ind.label} · {p.sellPrice} ₽/{p.unit}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Sales history */}
      <Card s={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:14,fontWeight:700,color:C.text}}>История продаж</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>Дата</TH><TH>Товар</TH><TH>Кол-во</TH><TH>Сумма</TH><TH>Клиент</TH><TH>Продавец</TH></tr></thead>
            <tbody>{[...sales].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(s=>{
              const p=products.find(x=>x.id===s.productId);
              const cl=s.clientId?clients.find(c=>c.id===s.clientId):null;
              const seller=users.find(u=>u.id===s.soldBy);
              return(
                <tr key={s.id} style={{borderBottom:`1px solid ${C.border}`}}>
                  <TD s={{fontSize:12}}>{fmtShort(s.createdAt)}</TD>
                  <TD s={{fontWeight:500}}>{p?.name||"—"}</TD>
                  <TD s={{fontWeight:600}}>{s.quantity} {p?.unit}</TD>
                  <TD s={{fontWeight:700,color:C.primary}}>{((p?.sellPrice||0)*s.quantity).toLocaleString("ru")} ₽</TD>
                  <TD s={{color:C.muted}}>{cl?.name||"Розница"}</TD>
                  <TD s={{color:C.dim,fontSize:12}}>{seller?.name?.split(" ").slice(0,2).join(" ")||"—"}</TD>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={()=>setModal(false)} title="Быстрая продажа" width={420}>
        <Sel label="Товар" value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})} options={ap.map(p=>({value:p.id,label:`${p.name} (${p.stock} ${p.unit})`}))}/>
        {form.productId&&(()=>{const p=products.find(x=>x.id===+form.productId);const ind=p?stockInd(p):{color:C.dim};return p?<div style={{fontSize:12,color:ind.color,marginBottom:8,marginTop:-8}}>На складе: {p.stock} {p.unit} · Цена: {p.sellPrice} ₽/{p.unit}</div>:null})()}
        <Inp label="Количество" type="number" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/>
        <Sel label="Клиент (опционально)" value={form.clientId} onChange={e=>setForm({...form,clientId:e.target.value})} options={[{value:"",label:"Розничная продажа"},...clients.map(c=>({value:c.id,label:c.name}))]}/>
        {form.productId&&form.quantity&&+form.quantity>0&&(()=>{const p=products.find(x=>x.id===+form.productId);const total=p?(p.sellPrice*+form.quantity):0;return<div style={{fontSize:15,fontWeight:700,color:C.primary,textAlign:"right"}}>Итого: {total.toLocaleString("ru")} ₽</div>})()}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10}}><Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn><Btn v="success" onClick={sell}>Продать</Btn></div>
      </Modal>
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// INVENTORY MOVEMENTS JOURNAL
// ═══════════════════════════════════════════════════════════════
const InventoryJournalPage = ()=>{
  const {inventoryMovements,products}=useContext(AppContext);
  const [fProduct,setFProduct]=useState("all");
  const [fType,setFType]=useState("all");
  const ap=products.filter(p=>!p.deleted);

  const filtered=useMemo(()=>{
    let list=[...inventoryMovements];
    if(fProduct!=="all") list=list.filter(m=>m.productId===+fProduct);
    if(fType!=="all") list=list.filter(m=>m.type===fType);
    return list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },[inventoryMovements,fProduct,fType]);

  return(
    <div>
      <PageH title="Движение товаров">
        <select value={fProduct} onChange={e=>setFProduct(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}>
          <option value="all">Все товары</option>
          {ap.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={fType} onChange={e=>setFType(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}>
          <option value="all">Все типы</option>
          {Object.entries(MOVEMENT_TYPES).map(([k,v])=><option key={k} value={k}>{v}</option>)}
        </select>
      </PageH>
      <Card s={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><TH>Дата</TH><TH>Товар</TH><TH>Операция</TH><TH>Количество</TH><TH>Остаток</TH><TH>Ссылка</TH></tr></thead>
          <tbody>{filtered.map(m=>{
            const p=products.find(x=>x.id===m.productId);
            const isPlus=m.quantity>0;
            return(
              <tr key={m.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <TD s={{fontSize:12,whiteSpace:"nowrap"}}>{fmtDate(m.createdAt)}</TD>
                <TD s={{fontWeight:500}}>{p?.name||"—"}</TD>
                <TD><Badge color={isPlus?"success":"danger"}>{MOVEMENT_TYPES[m.type]||m.type}</Badge></TD>
                <TD s={{fontWeight:700,color:isPlus?C.success:C.danger}}>{isPlus?"+":""}{m.quantity} {p?.unit||""}</TD>
                <TD s={{fontWeight:600}}>{m.balance} {p?.unit||""}</TD>
                <TD s={{color:C.dim,fontSize:11}}>{m.refId}</TD>
              </tr>
            );
          })}</tbody>
        </table>
      </div></Card>
      {filtered.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim}}><I.file size={36}/><p style={{marginTop:10}}>Нет записей</p></div>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTION PLANNING
// ═══════════════════════════════════════════════════════════════
const ProductionPlanPage = ()=>{
  const {productionPlans,setProductionPlans,products,users,rawMaterials,recipes,addLog,currentUser,addNotification}=useContext(AppContext);
  const [modal,setModal]=useState(false);
  const [toast,setToast]=useState(null);
  const [errs,setErrs]=useState({});
  const [viewMode,setViewMode]=useState("week"); // day, week, month
  const [dateOffset,setDateOffset]=useState(0);
  const ap=products.filter(p=>!p.deleted);
  const workers=users.filter(u=>u.roleId===3&&u.status==="active");
  const [form,setForm]=useState({productId:ap[0]?.id||"",plannedQty:"",productionDate:"",employeeIds:[]});

  const today=new Date();
  const baseDate=new Date(today);baseDate.setDate(baseDate.getDate()+dateOffset*7);

  // Get date range for current view
  const dateRange=useMemo(()=>{
    const d=new Date(baseDate);
    if(viewMode==="day") return [d.toISOString().slice(0,10)];
    if(viewMode==="week"){
      const mon=new Date(d);mon.setDate(mon.getDate()-mon.getDay()+1);
      return Array.from({length:7},(_,i)=>{const x=new Date(mon);x.setDate(x.getDate()+i);return x.toISOString().slice(0,10)});
    }
    // month
    const first=new Date(d.getFullYear(),d.getMonth(),1);
    const last=new Date(d.getFullYear(),d.getMonth()+1,0);
    const days=[];for(let x=new Date(first);x<=last;x.setDate(x.getDate()+1)) days.push(new Date(x).toISOString().slice(0,10));
    return days;
  },[baseDate,viewMode]);

  const plansInRange=productionPlans.filter(p=>dateRange.includes(p.productionDate)).sort((a,b)=>a.productionDate.localeCompare(b.productionDate));

  // Daily summary
  const dailySummary=useMemo(()=>{
    const m={};plansInRange.forEach(p=>{
      if(!m[p.productionDate]) m[p.productionDate]={planned:0,completed:0,plans:0};
      m[p.productionDate].planned+=p.plannedQty;
      m[p.productionDate].completed+=p.completedQty;
      m[p.productionDate].plans++;
    });
    return m;
  },[plansInRange]);

  // Worker load
  const workerLoad=useMemo(()=>{
    const m={};plansInRange.forEach(p=>{
      (p.employeeIds||[]).forEach(uid=>{
        if(!m[uid]) m[uid]={plans:0,totalQty:0};
        m[uid].plans++;m[uid].totalQty+=p.plannedQty;
      });
    });
    return m;
  },[plansInRange]);

  const toggleEmp=(uid)=>setForm(f=>({...f,employeeIds:f.employeeIds.includes(uid)?f.employeeIds.filter(x=>x!==uid):[...f.employeeIds,uid]}));

  const openNew=()=>{setForm({productId:ap[0]?.id||"",plannedQty:"",productionDate:new Date().toISOString().slice(0,10),employeeIds:[]});setErrs({});setModal(true)};

  const validate=()=>{const e={};if(!form.productId)e.productId="!";if(!form.plannedQty||+form.plannedQty<=0)e.plannedQty="!";if(!form.productionDate)e.productionDate="!";if(!form.employeeIds.length)e.employeeIds="!";setErrs(e);return !Object.keys(e).length};

  const save=()=>{
    if(!validate())return;
    const plan={id:Date.now(),productId:+form.productId,plannedQty:+form.plannedQty,completedQty:0,productionDate:form.productionDate,employeeIds:form.employeeIds,createdBy:currentUser.id,createdAt:new Date().toISOString(),status:"запланирован"};
    setProductionPlans(p=>[...p,plan]);
    const pName=products.find(p=>p.id===+form.productId)?.name;
    addLog(`План: ${pName} x${form.plannedQty} на ${form.productionDate}`);
    addNotification({title:`Новый план: ${pName}`,type:"информация",content:`План на ${form.productionDate}: ${pName} x${form.plannedQty}`,targetUsers:form.employeeIds});
    setToast({message:"План создан",type:"success"});setModal(false);
  };

  const updateStatus=(plan,newStatus)=>{
    setProductionPlans(p=>p.map(x=>x.id===plan.id?{...x,status:newStatus}:x));
    addLog(`План #${plan.id}: статус → ${newStatus}`);
    setToast({message:"Статус обновлён",type:"success"});
  };

  const updateCompleted=(plan,qty)=>{
    setProductionPlans(p=>p.map(x=>x.id===plan.id?{...x,completedQty:Math.min(+qty,x.plannedQty)}:x));
  };

  const pctColor=(pct)=>pct>=100?C.success:pct>=50?C.primary:C.danger;
  const navLabel=viewMode==="day"?baseDate.toLocaleDateString("ru-RU"):viewMode==="week"?`Неделя ${dateRange[0]?.slice(5)} — ${dateRange[6]?.slice(5)}`:`${baseDate.toLocaleDateString("ru-RU",{month:"long",year:"numeric"})}`;

  return(
    <div>
      <PageH title="Планирование производства">
        <div style={{display:"flex",gap:5}}>
          {[["day","День"],["week","Неделя"],["month","Месяц"]].map(([id,lb])=>(
            <button key={id} onClick={()=>{setViewMode(id);setDateOffset(0)}} style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${viewMode===id?C.primary:C.border}`,background:viewMode===id?C.primaryBg:C.surface,color:viewMode===id?C.primary:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{lb}</button>
          ))}
        </div>
        <Btn onClick={openNew} icon={<I.plus size={15}/>}>Новый план</Btn>
      </PageH>

      {/* Date navigation */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
        <Btn v="ghost" sz="sm" onClick={()=>setDateOffset(d=>d-1)}>\u25c0</Btn>
        <span style={{fontSize:14,fontWeight:600,color:C.text,minWidth:180,textAlign:"center"}}>{navLabel}</span>
        <Btn v="ghost" sz="sm" onClick={()=>setDateOffset(d=>d+1)}>\u25b6</Btn>
        <Btn v="ghost" sz="sm" onClick={()=>setDateOffset(0)}>Сегодня</Btn>
      </div>

      {/* Worker load summary */}
      {Object.keys(workerLoad).length>0&&<Card s={{marginBottom:14,padding:"12px 16px"}}>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:8}}>Загрузка сотрудников:</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {Object.entries(workerLoad).map(([uid,data])=>{
            const w=users.find(u=>u.id===+uid);
            return <Badge key={uid} color="info" s={{fontSize:11}}>{w?.name?.split(" ").slice(0,2).join(" ")} — {data.plans} пл. / {data.totalQty}</Badge>;
          })}
        </div>
      </Card>}

      {/* Plans table */}
      <Card s={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><TH>Дата</TH><TH>Товар</TH><TH>План</TH><TH>Выполнено</TH><TH>Прогресс</TH><TH>Сотрудники</TH><TH>Статус</TH><TH></TH></tr></thead>
          <tbody>{plansInRange.map(plan=>{
            const prod=products.find(p=>p.id===plan.productId);
            const pct=plan.plannedQty>0?Math.round(plan.completedQty/plan.plannedQty*100):0;
            return(
              <tr key={plan.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <TD s={{fontWeight:500,whiteSpace:"nowrap"}}>{plan.productionDate}</TD>
                <TD s={{fontWeight:500}}>{prod?.name||"\u2014"}</TD>
                <TD>{plan.plannedQty} {prod?.unit}</TD>
                <TD>
                  {plan.status!=="выполнен"&&plan.status!=="отменён"?
                    <input type="number" value={plan.completedQty} onChange={e=>updateCompleted(plan,e.target.value)} style={{width:60,padding:"4px 6px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,fontSize:12,fontFamily:"inherit"}}/>
                    :<span style={{fontWeight:600}}>{plan.completedQty}</span>
                  } {prod?.unit}
                </TD>
                <TD>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1,height:5,background:C.bg,borderRadius:3,overflow:"hidden",minWidth:50}}>
                      <div style={{height:"100%",width:`${pct}%`,background:pctColor(pct),borderRadius:3,transition:"width .3s"}}/>
                    </div>
                    <span style={{fontSize:11,fontWeight:600,color:pctColor(pct)}}>{pct}%</span>
                  </div>
                </TD>
                <TD>
                  <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                    {(plan.employeeIds||[]).map(uid=>{const w=users.find(u=>u.id===uid);return w?<span key={uid} style={{fontSize:10,color:C.muted,background:C.bg,padding:"2px 6px",borderRadius:4}}>{w.name.split(" ")[0]}</span>:null})}
                  </div>
                </TD>
                <TD>
                  <select value={plan.status} onChange={e=>updateStatus(plan,e.target.value)} style={{padding:"4px 6px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:5,color:C.text,fontSize:11,fontFamily:"inherit"}}>
                    {PLAN_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </TD>
                <TD s={{color:C.dim,fontSize:11}}>{dailySummary[plan.productionDate]?`${dailySummary[plan.productionDate].plans} пл.`:""}</TD>
              </tr>
            );
          })}</tbody>
        </table>
      </div></Card>
      {plansInRange.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim}}><I.tasks size={36}/><p style={{marginTop:10}}>Нет планов на этот период</p></div>}

      <Modal open={modal} onClose={()=>setModal(false)} title="Новый план производства" width={520}>
        <Sel label="Товар" value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})} error={errs.productId} options={[{value:"",label:"Выберите"},...ap.map(p=>({value:p.id,label:`${p.name} (${p.category})`}))]}/>
        <Inp label="Количество" type="number" value={form.plannedQty} onChange={e=>setForm({...form,plannedQty:e.target.value})} error={errs.plannedQty}/>
        <Inp label="Дата производства" type="date" value={form.productionDate} onChange={e=>setForm({...form,productionDate:e.target.value})} error={errs.productionDate}/>
        <div style={{marginBottom:12}}>
          <label style={{display:"block",fontSize:12,fontWeight:500,color:C.muted,marginBottom:6}}>Сотрудники {errs.employeeIds&&<span style={{color:C.danger}}>(выберите)</span>}</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {workers.map(w=>{const sel=form.employeeIds.includes(w.id);return(
              <button key={w.id} onClick={()=>toggleEmp(w.id)} style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${sel?C.primary:C.border}`,background:sel?C.primaryBg:C.surface2,color:sel?C.primary:C.muted,fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:sel?600:400,display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:12,height:12,borderRadius:3,border:`2px solid ${sel?C.primary:C.border}`,background:sel?C.primary:"transparent",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{sel&&<I.check size={8}/>}</span>
                {w.name.split(" ").slice(0,2).join(" ")}
              </button>
            )})}
          </div>
        </div>
        {/* Raw material check */}
        {form.productId&&form.plannedQty&&+form.plannedQty>0&&(()=>{
          const recipe=recipes.find(r=>r.productId===+form.productId);
          if(!recipe) return null;
          const items=recipe.items.map(it=>{const raw=rawMaterials.find(r=>r.id===it.rawId);const needed=it.qty*(+form.plannedQty);return{name:raw?.name||"?",needed:+needed.toFixed(2),available:raw?.stock||0,unit:raw?.unit||"",ok:(raw?.stock||0)>=needed}});
          const allOk=items.every(i=>i.ok);
          return(
            <div style={{background:allOk?C.successBg:C.dangerBg,border:`1px solid ${allOk?"rgba(90,158,95,.2)":"rgba(196,78,61,.2)"}`,borderRadius:8,padding:10,marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:600,color:allOk?C.success:C.danger,marginBottom:4}}>{allOk?"\u2705 Сырья достаточно":"\u26a0 Недостаточно сырья"}</div>
              {items.map((it,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:it.ok?C.text:C.danger,padding:"1px 0"}}><span>{it.name}</span><span>{it.needed}/{it.available} {it.unit}</span></div>)}
            </div>
          );
        })()}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
          <Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn>
          <Btn onClick={save}>Создать</Btn>
        </div>
      </Modal>
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PROCUREMENT (Auto-calculated purchase recommendations)
// ═══════════════════════════════════════════════════════════════
const ProcurementPage = ()=>{
  const {productionPlans,products,rawMaterials,recipes}=useContext(AppContext);

  // Only future/active plans
  const activePlans=productionPlans.filter(p=>p.status==="запланирован"||p.status==="в процессе");

  // Calculate total raw materials needed
  const procurement=useMemo(()=>{
    const needs={};
    activePlans.forEach(plan=>{
      const recipe=recipes.find(r=>r.productId===plan.productId);
      if(!recipe) return;
      const remaining=plan.plannedQty-plan.completedQty;
      if(remaining<=0) return;
      recipe.items.forEach(it=>{
        if(!needs[it.rawId]) needs[it.rawId]={needed:0,rawId:it.rawId};
        needs[it.rawId].needed+=it.qty*remaining;
      });
    });
    return Object.values(needs).map(n=>{
      const raw=rawMaterials.find(r=>r.id===n.rawId);
      const needed=+n.needed.toFixed(2);
      const available=raw?.stock||0;
      const toOrder=Math.max(0,+(needed-available).toFixed(2));
      const estCost=toOrder*(raw?.costPerUnit||0);
      return{rawId:n.rawId,name:raw?.name||"?",category:raw?.category||"",unit:raw?.unit||"",needed,available,toOrder,estCost,shortage:toOrder>0};
    }).sort((a,b)=>b.toOrder-a.toOrder);
  },[activePlans,recipes,rawMaterials]);

  const totalCost=procurement.reduce((s,p)=>s+p.estCost,0);
  const shortages=procurement.filter(p=>p.shortage);

  // Breakdown by plan
  const planBreakdown=activePlans.map(plan=>{
    const prod=products.find(p=>p.id===plan.productId);
    const recipe=recipes.find(r=>r.productId===plan.productId);
    const remaining=plan.plannedQty-plan.completedQty;
    const items=recipe?recipe.items.map(it=>{const raw=rawMaterials.find(r=>r.id===it.rawId);return{name:raw?.name||"?",qty:+(it.qty*remaining).toFixed(2),unit:raw?.unit||""};}):[];
    return{id:plan.id,product:prod?.name||"?",date:plan.productionDate,remaining,items,unit:prod?.unit||""};
  });

  return(
    <div>
      <PageH title="Рекомендации по закупкам"/>

      {/* Alerts */}
      {shortages.length>0&&(
        <div style={{background:C.dangerBg,border:`1px solid rgba(196,78,61,.2)`,borderRadius:10,padding:"12px 16px",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><I.alert size={16}/><span style={{fontSize:14,fontWeight:700,color:C.danger}}>Нужно заказать ({shortages.length} позиций):</span></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {shortages.map(s=><Badge key={s.rawId} color="danger">{s.name} — {s.toOrder} {s.unit}</Badge>)}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:18}}>
        <Stat icon={<I.tasks size={18}/>} label="Активных планов" value={activePlans.length} color={C.info}/>
        <Stat icon={<I.raw size={18}/>} label="Позиций сырья" value={procurement.length} color={C.primary}/>
        <Stat icon={<I.alert size={18}/>} label="Нехватка" value={shortages.length} color={shortages.length>0?C.danger:C.success}/>
        <Stat icon={<I.star size={18}/>} label="Ориент. стоимость" value={`${(totalCost/1000).toFixed(0)}т₽`} color={C.cyan}/>
      </div>

      {/* Main procurement table */}
      <Card s={{padding:0,overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontSize:14,fontWeight:700,color:C.text}}>Сводная таблица закупок</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>Сырьё</TH><TH>Категория</TH><TH>Нужно</TH><TH>На складе</TH><TH>Заказать</TH><TH>Ориент. цена</TH></tr></thead>
            <tbody>{procurement.map(p=>(
              <tr key={p.rawId} style={{borderBottom:`1px solid ${C.border}`,background:p.shortage?C.dangerBg:"transparent"}}>
                <TD s={{fontWeight:500}}>{p.name} {p.shortage&&<Badge color="danger" s={{marginLeft:4}}>!</Badge>}</TD>
                <TD><Badge color="purple">{p.category}</Badge></TD>
                <TD s={{fontWeight:600}}>{p.needed} {p.unit}</TD>
                <TD s={{color:p.shortage?C.danger:C.text}}>{p.available} {p.unit}</TD>
                <TD s={{fontWeight:700,color:p.shortage?C.danger:C.success}}>{p.toOrder>0?p.toOrder:"\u2713"} {p.toOrder>0?p.unit:""}</TD>
                <TD s={{color:C.muted}}>{p.estCost>0?`${p.estCost.toLocaleString("ru")}₽`:"\u2014"}</TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>

      {/* Plan breakdown */}
      <Card>
        <Title>Расход по планам</Title>
        {planBreakdown.map(pb=>(
          <div key={pb.id} style={{marginBottom:14,padding:12,background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:600,color:C.text}}>{pb.product} — {pb.remaining} {pb.unit}</span>
              <span style={{fontSize:11,color:C.dim}}>{pb.date}</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {pb.items.map((it,i)=><Badge key={i} color="info" s={{fontSize:11}}>{it.name}: {it.qty} {it.unit}</Badge>)}
            </div>
          </div>
        ))}
        {planBreakdown.length===0&&<div style={{textAlign:"center",padding:20,color:C.dim,fontSize:13}}>Нет активных планов</div>}
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PROFIT ANALYTICS
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// LOGS
// ═══════════════════════════════════════════════════════════════
const LogsPage = ()=>{
  const {logs}=useContext(AppContext);
  const [search,setSearch]=useState("");
  const filtered=logs.filter(l=>l.message.toLowerCase().includes(search.toLowerCase())||l.userName.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>new Date(b.date)-new Date(a.date));
  return(
    <div>
      <PageH title="Журнал действий"><SearchBox value={search} onChange={e=>setSearch(e.target.value)} ph="Поиск в логах..."/></PageH>
      <Card s={{maxHeight:600,overflow:"auto"}}>
        {filtered.length===0?<div style={{textAlign:"center",padding:50,color:C.dim}}>Нет записей</div>:
        filtered.map((l,i)=>(
          <div key={l.id} style={{padding:"10px 0",borderBottom:i<filtered.length-1?`1px solid ${C.border}`:"none",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:32,height:32,borderRadius:8,background:C.primaryBg,color:C.primary,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><I.clock size={14}/></div>
            <div style={{flex:1}}><div style={{fontSize:13,color:C.text}}>{l.message}</div><div style={{fontSize:11,color:C.dim}}>{l.userName} \u00b7 {fmtDate(l.date)}</div></div>
          </div>
        ))}
      </Card>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DEBTS PAGE
// ═══════════════════════════════════════════════════════════════
const DebtsPage = ()=>{
  const {debts,setDebts,users,currentUser,addLog}=useContext(AppContext);
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isOwner=role?.name==="owner";

  // ── State ──
  const [tab,setTab]=useState(isOwner?"all":"my"); // "my" | "all" (owner only)
  const [modal,setModal]=useState(false);
  const [payModal,setPayModal]=useState(null); // debt object for partial payment
  const [edit,setEdit]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [toast,setToast]=useState(null);
  const [search,setSearch]=useState("");
  const [fStatus,setFStatus]=useState("all");
  const [fUser,setFUser]=useState("all");
  const [errs,setErrs]=useState({});
  const [payErrs,setPayErrs]=useState({});

  const emptyForm={
    amount:"", description:"", date:new Date().toISOString().slice(0,10),
    dueDate:"", status:"активен", comment:""
  };
  const [form,setForm]=useState(emptyForm);
  const [payForm,setPayForm]=useState({amount:"",date:new Date().toISOString().slice(0,10),note:""});

  // Debts the current user is allowed to see
  const myDebts=useMemo(()=>
    (debts||[]).filter(d=>d.userId===currentUser.id).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
  ,[debts,currentUser]);

  const allDebts=useMemo(()=>{
    let l=[...(debts||[])];
    if(fUser!=="all") l=l.filter(d=>d.userId===+fUser);
    if(fStatus!=="all") l=l.filter(d=>d.status===fStatus);
    if(search){
      const s=search.toLowerCase();
      l=l.filter(d=>{
        const u=users.find(x=>x.id===d.userId);
        return d.description.toLowerCase().includes(s)||u?.name.toLowerCase().includes(s)||d.comment?.toLowerCase().includes(s);
      });
    }
    return l.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  },[debts,fUser,fStatus,search,users]);

  // Owner summary
  const ownerSummary=useMemo(()=>{
    const byUser={};
    (debts||[]).filter(d=>d.status!=="погашен").forEach(d=>{
      if(!byUser[d.userId]) byUser[d.userId]={userId:d.userId,active:0,count:0};
      byUser[d.userId].active+=d.remaining;
      byUser[d.userId].count++;
    });
    return Object.values(byUser).sort((a,b)=>b.active-a.active);
  },[debts]);

  const totalActive=(debts||[]).filter(d=>d.status!=="погашен").reduce((s,d)=>s+d.remaining,0);

  // ── CRUD ──
  const validate=()=>{
    const e={};
    if(!form.amount||+form.amount<=0) e.amount="Укажите сумму > 0";
    if(!form.description.trim()) e.description="Обязательное поле";
    if(!form.date) e.date="!";
    setErrs(e);return!Object.keys(e).length;
  };

  const openNew=()=>{setEdit(null);setForm(emptyForm);setErrs({});setModal(true)};
  const openEdit=d=>{
    setEdit(d);
    setForm({amount:d.amount,description:d.description,date:d.date,dueDate:d.dueDate||"",status:d.status,comment:d.comment||""});
    setErrs({});setModal(true);
  };

  const save=()=>{
    if(!validate()) return;
    const now=new Date().toISOString();
    if(edit){
      setDebts(p=>(p||[]).map(d=>d.id===edit.id?{
        ...d,
        amount:+form.amount,
        remaining:d.remaining+(+form.amount-d.amount), // adjust remaining by delta
        description:form.description,
        date:form.date,
        dueDate:form.dueDate||null,
        status:form.status,
        comment:form.comment,
        updatedAt:now,
      }:d));
      addLog(`Долг обновлён: ${form.description}`);
      setToast({message:"Обновлено",type:"success"});
    } else {
      const id=Date.now();
      setDebts(p=>[...(p||[]),{
        id,userId:currentUser.id,amount:+form.amount,remaining:+form.amount,
        description:form.description,date:form.date,dueDate:form.dueDate||null,
        status:"активен",comment:form.comment,payments:[],createdAt:now,
      }]);
      addLog(`Долг добавлен: ${form.description} ${form.amount}₽`);
      setToast({message:"Долг записан",type:"success"});
    }
    setModal(false);
  };

  const doDelete=d=>{
    setDebts(p=>(p||[]).filter(x=>x.id!==d.id));
    addLog(`Долг удалён: ${d.description}`);
    setToast({message:"Удалено",type:"error"});
    setConfirm(null);
  };

  // ── Partial payment ──
  const openPay=d=>{setPayModal(d);setPayForm({amount:"",date:new Date().toISOString().slice(0,10),note:""});setPayErrs({});};
  const savePay=()=>{
    const e={};
    if(!payForm.amount||+payForm.amount<=0) e.amount="Укажите сумму > 0";
    if(+payForm.amount>payModal.remaining) e.amount=`Не больше остатка (${payModal.remaining}₽)`;
    setPayErrs(e);if(Object.keys(e).length) return;
    const now=new Date().toISOString();
    setDebts(p=>(p||[]).map(d=>{
      if(d.id!==payModal.id) return d;
      const newRemaining=+(d.remaining-+payForm.amount).toFixed(2);
      const newStatus=newRemaining<=0?"погашен":newRemaining<d.amount?"частично погашен":"активен";
      return{...d,remaining:newRemaining,status:newStatus,payments:[...(d.payments||[]),{id:Date.now(),amount:+payForm.amount,date:payForm.date,note:payForm.note}],updatedAt:now};
    }));
    addLog(`Погашение долга: ${payModal.description} −${payForm.amount}₽`);
    setToast({message:"Платёж записан",type:"success"});
    setPayModal(null);
  };

  const statusColor=s=>s==="погашен"?"success":s==="частично погашен"?"orange":"danger";
  const dueBadge=d=>{
    if(!d.dueDate||d.status==="погашен") return null;
    const days=Math.ceil((new Date(d.dueDate)-new Date())/(1000*60*60*24));
    if(days<0) return <Badge color="danger" s={{fontSize:10}}>Просрочен на {-days}д</Badge>;
    if(days<=3) return <Badge color="orange" s={{fontSize:10}}>Срок через {days}д</Badge>;
    return null;
  };

  const DebtCard=({d,canEdit:ce})=>{
    const pct=d.amount>0?Math.round((1-d.remaining/d.amount)*100):100;
    const owner=users.find(u=>u.id===d.userId);
    return(
      <Card s={{borderLeft:`3px solid ${C[statusColor(d.status)]}`}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"flex-start"}}>
          {isOwner&&owner&&(
            <div style={{display:"flex",alignItems:"center",gap:8,minWidth:130}}>
              <div style={{width:32,height:32,borderRadius:8,background:`${C.primary}15`,color:C.primary,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14}}>{owner.name.charAt(0)}</div>
              <div style={{fontSize:12,fontWeight:600,color:C.text}}>{owner.name.split(" ").slice(0,2).join(" ")}</div>
            </div>
          )}
          <div style={{flex:"1 1 180px"}}>
            <div style={{fontSize:14,fontWeight:700,color:C.text}}>{d.description}</div>
            <div style={{fontSize:11,color:C.dim,marginTop:2}}>Добавлен: {fmtShort(d.createdAt)}{d.dueDate&&` · Срок: ${fmtShort(d.dueDate)}`}</div>
            {d.comment&&<div style={{fontSize:11,color:C.muted,marginTop:2,fontStyle:"italic"}}>{d.comment}</div>}
          </div>
          <div style={{textAlign:"right",minWidth:110}}>
            <div style={{fontSize:20,fontWeight:800,color:d.status==="погашен"?C.success:C.danger}}>{d.remaining.toLocaleString("ru")}₽</div>
            {d.remaining!==d.amount&&<div style={{fontSize:11,color:C.dim}}>из {d.amount.toLocaleString("ru")}₽</div>}
            <Badge color={statusColor(d.status)} s={{marginTop:4,fontSize:10}}>{d.status}</Badge>
            {dueBadge(d)&&<div style={{marginTop:4}}>{dueBadge(d)}</div>}
          </div>
          {ce&&(
            <div style={{display:"flex",gap:4,flexDirection:"column"}}>
              {d.status!=="погашен"&&<Btn sz="sm" v="success" onClick={()=>openPay(d)} icon={<I.check size={13}/>}>Погасить</Btn>}
              <div style={{display:"flex",gap:4}}>
                <Btn v="ghost" sz="sm" onClick={()=>openEdit(d)} icon={<I.edit size={13}/>}/>
                <Btn v="ghost" sz="sm" onClick={()=>setConfirm({title:"Удалить долг?",message:`Удалить "${d.description}"?`,onConfirm:()=>doDelete(d)})} icon={<I.trash size={13}/>}/>
              </div>
            </div>
          )}
        </div>
        {/* Progress bar */}
        {d.amount>0&&d.status!=="активен"&&(
          <div style={{marginTop:10}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.dim,marginBottom:2}}>
              <span>Погашено: {pct}%</span><span>Остаток: {d.remaining.toLocaleString("ru")}₽</span>
            </div>
            <div style={{height:4,background:C.bg,borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:C.success,borderRadius:2,transition:"width .4s"}}/>
            </div>
          </div>
        )}
        {/* Payment history */}
        {(d.payments||[]).length>0&&(
          <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,color:C.dim,marginBottom:4}}>История погашений:</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {(d.payments||[]).map(p=>(
                <div key={p.id} style={{padding:"3px 9px",background:C.successBg,borderRadius:6,border:`1px solid ${C.success}20`,fontSize:11}}>
                  <span style={{fontWeight:700,color:C.success}}>−{p.amount.toLocaleString("ru")}₽</span>
                  <span style={{color:C.dim,marginLeft:5}}>{fmtShort(p.date)}{p.note&&` · ${p.note}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  };

  const tabStyle=active=>({padding:"7px 16px",borderRadius:7,border:`1px solid ${active?C.primary:C.border}`,background:active?C.primaryBg:C.surface,color:active?C.primary:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"});

  return(
    <div>
      <PageH title={isOwner?"Долги сотрудников":"Мои долги"}>
        {isOwner&&(
          <div style={{display:"flex",gap:5}}>
            <button onClick={()=>setTab("all")} style={tabStyle(tab==="all")}>Все долги</button>
            <button onClick={()=>setTab("my")} style={tabStyle(tab==="my")}>Мои долги</button>
          </div>
        )}
        {tab==="my"&&<Btn onClick={openNew} icon={<I.plus size={15}/>}>Добавить долг</Btn>}
      </PageH>

      {/* Owner summary view */}
      {isOwner&&tab==="all"&&(
        <>
          {/* Filters */}
          <Card s={{marginBottom:16,padding:"12px 16px"}}>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
              <SearchBox value={search} onChange={e=>setSearch(e.target.value)} ph="Поиск..."/>
              <select value={fUser} onChange={e=>setFUser(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}>
                <option value="all">Все сотрудники</option>
                {users.filter(u=>u.status==="active").map(u=><option key={u.id} value={u.id}>{u.name.split(" ").slice(0,2).join(" ")}</option>)}
              </select>
              <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}>
                <option value="all">Все статусы</option>
                {DEBT_STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </Card>

          {/* Summary stats */}
          <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:16}}>
            <Stat icon={<I.alert size={18}/>} label="Общий долг (активные)" value={`${totalActive.toLocaleString("ru")}₽`} color={C.danger}/>
            <Stat icon={<I.users size={18}/>} label="Должников" value={ownerSummary.length} color={C.orange}/>
            <Stat icon={<I.file size={18}/>} label="Всего записей" value={(debts||[]).length} color={C.info}/>
          </div>

          {/* Per-user summary */}
          {ownerSummary.length>0&&(
            <Card s={{marginBottom:16}}>
              <Title>Долги по сотрудникам</Title>
              <div style={{display:"grid",gap:6}}>
                {ownerSummary.map(s=>{
                  const u=users.find(x=>x.id===s.userId);
                  return(
                    <div key={s.userId} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                      <div style={{width:28,height:28,borderRadius:7,background:`${C.danger}15`,color:C.danger,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{u?.name.charAt(0)||"?"}</div>
                      <span style={{flex:1,fontSize:13,fontWeight:500,color:C.text}}>{u?.name.split(" ").slice(0,2).join(" ")||"—"}</span>
                      <Badge color="primary" s={{fontSize:11}}>{s.count} долг{s.count===1?"":"а"}</Badge>
                      <span style={{fontWeight:700,color:C.danger,fontSize:14}}>{s.active.toLocaleString("ru")}₽</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* All debts list */}
          <div style={{display:"grid",gap:10}}>
            {allDebts.map(d=><DebtCard key={d.id} d={d} canEdit={false}/>)}
            {allDebts.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim,fontSize:13}}><I.check size={32}/><p style={{marginTop:10}}>Долгов не найдено</p></div>}
          </div>
        </>
      )}

      {/* My debts view (all non-owner users + owner "my" tab) */}
      {tab==="my"&&(
        <>
          <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:16}}>
            <Stat icon={<I.alert size={18}/>} label="Активный долг" value={`${myDebts.filter(d=>d.status!=="погашен").reduce((s,d)=>s+d.remaining,0).toLocaleString("ru")}₽`} color={C.danger}/>
            <Stat icon={<I.file size={18}/>} label="Всего записей" value={myDebts.length} color={C.info}/>
            <Stat icon={<I.check size={18}/>} label="Погашено" value={myDebts.filter(d=>d.status==="погашен").length} color={C.success}/>
          </div>
          <div style={{display:"grid",gap:10}}>
            {myDebts.map(d=><DebtCard key={d.id} d={d} canEdit={true}/>)}
            {myDebts.length===0&&(
              <div style={{textAlign:"center",padding:50,color:C.dim,fontSize:13}}>
                <I.check size={32}/><p style={{marginTop:10}}>Долгов нет. Нажмите «Добавить долг».</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add/Edit modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title={edit?"Редактировать долг":"Новый долг"} width={480}>
        <Inp label="Сумма (₽)" type="number" min="1" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} error={errs.amount} placeholder="Например: 5000"/>
        <Inp label="Описание / причина" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} error={errs.description} placeholder="Например: Аванс за январь"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Дата возникновения" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} error={errs.date}/>
          <Inp label="Срок погашения (необязательно)" type="date" value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/>
        </div>
        {edit&&(
          <Sel label="Статус" value={form.status} onChange={e=>setForm({...form,status:e.target.value})} options={DEBT_STATUSES.map(s=>({value:s,label:s}))}/>
        )}
        <Txa label="Комментарий (необязательно)" value={form.comment} onChange={e=>setForm({...form,comment:e.target.value})} placeholder="Дополнительные сведения"/>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}>
          <Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn>
          <Btn v={edit?"primary":"danger"} onClick={save}>{edit?"Сохранить":"Добавить долг"}</Btn>
        </div>
      </Modal>

      {/* Partial payment modal */}
      <Modal open={!!payModal} onClose={()=>setPayModal(null)} title="Погашение долга" width={400}>
        {payModal&&(
          <>
            <div style={{padding:"8px 12px",background:C.dangerBg,borderRadius:8,border:`1px solid ${C.danger}20`,marginBottom:14,fontSize:13}}>
              <span style={{color:C.muted}}>{payModal.description} · </span>
              <span style={{fontWeight:700,color:C.danger}}>Остаток: {payModal.remaining.toLocaleString("ru")}₽</span>
            </div>
            <Inp label="Сумма погашения (₽)" type="number" min="1" max={payModal.remaining} value={payForm.amount} onChange={e=>setPayForm({...payForm,amount:e.target.value})} error={payErrs.amount} placeholder={`До ${payModal.remaining}₽`}/>
            <Inp label="Дата платежа" type="date" value={payForm.date} onChange={e=>setPayForm({...payForm,date:e.target.value})}/>
            <Inp label="Примечание (необязательно)" value={payForm.note} onChange={e=>setPayForm({...payForm,note:e.target.value})} placeholder="Например: наличными"/>
            {payForm.amount&&+payForm.amount>0&&+payForm.amount<=payModal.remaining&&(
              <div style={{padding:"8px 12px",background:C.successBg,borderRadius:8,border:`1px solid ${C.success}20`,marginBottom:12,fontSize:12,color:C.success}}>
                После погашения останется: <strong>{(payModal.remaining-+payForm.amount).toLocaleString("ru")}₽</strong>
                {+payForm.amount===payModal.remaining&&" — долг будет закрыт"}
              </div>
            )}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}>
              <Btn v="secondary" onClick={()=>setPayModal(null)}>Отмена</Btn>
              <Btn v="success" onClick={savePay} icon={<I.check size={14}/>}>Записать платёж</Btn>
            </div>
          </>
        )}
      </Modal>

      {confirm&&<Confirm open={!!confirm} onClose={()=>setConfirm(null)} title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm}/>}
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SALARY & BONUS STATS PAGE
// ═══════════════════════════════════════════════════════════════
const SalaryStatsPage = ()=>{
  const {users,tasks,taskEmployees,productionOutputs,products,bonusRules,setBonusRules,baseSalaries,setBaseSalaries,currentUser,addLog}=useContext(AppContext);
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isAdmin=role?.name==="admin";
  const workers=users.filter(u=>u.roleId===3&&u.status==="active");

  // ── Period ──
  const [period,setPeriod]=useState("month");
  const [customFrom,setCustomFrom]=useState(()=>new Date().toISOString().slice(0,10));
  const [customTo,setCustomTo]=useState(()=>new Date().toISOString().slice(0,10));
  const [sortBy,setSortBy]=useState("qty_desc");
  const [tab,setTab]=useState("stats"); // stats | rules
  const [toast,setToast]=useState(null);

  const getPeriodDates=()=>{
    const today=new Date();
    const todayStr=today.toISOString().slice(0,10);
    if(period==="today") return[todayStr,todayStr];
    if(period==="week"){
      const d=new Date(today);const day=d.getDay()||7;d.setDate(d.getDate()-day+1);
      const mon=d.toISOString().slice(0,10);
      const sun=new Date(d);sun.setDate(sun.getDate()+6);
      return[mon,sun.toISOString().slice(0,10)];
    }
    if(period==="month"){
      return[todayStr.slice(0,7)+"-01",todayStr];
    }
    return[customFrom,customTo];
  };
  const[fromDate,toDate]=getPeriodDates();

  // ── Per-worker calculation ──
  const workerStats=useMemo(()=>{
    return workers.map(w=>{
      const byProduct={};
      // from completed tasks
      taskEmployees.filter(te=>te.employeeId===w.id&&(te.status==="завершено"||te.status==="просрочено")).forEach(te=>{
        const task=tasks.find(t=>t.id===te.taskId);
        if(!task?.completedAt) return;
        const d=task.completedAt.slice(0,10);
        if(d<fromDate||d>toDate) return;
        const pname=products.find(p=>p.id===task.productId)?.name||"?";
        byProduct[pname]=(byProduct[pname]||0)+te.producedQty;
      });
      // from manual outputs
      (productionOutputs||[]).filter(o=>o.employeeId===w.id).forEach(o=>{
        const d=o.date.slice(0,10);
        if(d<fromDate||d>toDate) return;
        const pname=products.find(p=>p.id===o.productId)?.name||"?";
        byProduct[pname]=(byProduct[pname]||0)+o.quantity;
      });
      const totalQty=Object.values(byProduct).reduce((s,v)=>s+v,0);
      // bonus rule: highest fromQty ≤ totalQty
      const sortedRules=[...(bonusRules||[])].sort((a,b)=>b.fromQty-a.fromQty);
      const rule=sortedRules.find(r=>totalQty>=r.fromQty)||sortedRules[sortedRules.length-1]||{bonusPercent:0,label:"—",fromQty:0};
      const nextRule=sortedRules.find(r=>r.fromQty>totalQty&&r.fromQty>rule.fromQty)||null;
      const bonusPercent=rule.bonusPercent||0;
      const baseSalary=baseSalaries[w.id]||0;
      const bonusAmount=baseSalary>0?Math.round(baseSalary*bonusPercent/100):0;
      const toNext=nextRule?nextRule.fromQty-totalQty:0;
      return{w,totalQty,byProduct,bonusPercent,bonusLabel:rule.label,bonusFromQty:rule.fromQty,bonusAmount,baseSalary,toNext,nextRule};
    });
  },[workers,tasks,taskEmployees,productionOutputs,products,bonusRules,baseSalaries,fromDate,toDate]);

  const sorted=useMemo(()=>{
    const s=[...workerStats];
    if(sortBy==="qty_desc") s.sort((a,b)=>b.totalQty-a.totalQty);
    else if(sortBy==="qty_asc") s.sort((a,b)=>a.totalQty-b.totalQty);
    else if(sortBy==="bonus_desc") s.sort((a,b)=>b.bonusPercent-a.bonusPercent);
    else s.sort((a,b)=>a.w.name.localeCompare(b.w.name));
    return s;
  },[workerStats,sortBy]);

  // ── Daily trend data (all workers combined) ──
  const trendData=useMemo(()=>{
    const m={};
    taskEmployees.filter(te=>te.status==="завершено"||te.status==="просрочено").forEach(te=>{
      if(!workers.find(w=>w.id===te.employeeId)) return;
      const task=tasks.find(t=>t.id===te.taskId);
      if(!task?.completedAt) return;
      const d=task.completedAt.slice(0,10);
      if(d<fromDate||d>toDate) return;
      m[d]=(m[d]||0)+te.producedQty;
    });
    (productionOutputs||[]).forEach(o=>{
      if(!workers.find(w=>w.id===o.employeeId)) return;
      const d=o.date.slice(0,10);
      if(d<fromDate||d>toDate) return;
      m[d]=(m[d]||0)+o.quantity;
    });
    return Object.entries(m).sort(([a],[b])=>a.localeCompare(b)).map(([date,qty])=>({date:date.slice(5),qty}));
  },[taskEmployees,productionOutputs,tasks,workers,fromDate,toDate]);

  const barData=sorted.map(s=>({name:s.w.name.split(" ").slice(0,2).join(" "),qty:s.totalQty,bonus:s.bonusPercent}));
  const totalAll=workerStats.reduce((s,w)=>s+w.totalQty,0);
  const avgQty=workers.length?Math.round(totalAll/workers.length):0;
  const topWorker=sorted[0];

  // ── Bonus Rules Editor ──
  const [ruleForm,setRuleForm]=useState({fromQty:"",bonusPercent:"",label:""});
  const [ruleEdit,setRuleEdit]=useState(null);
  const [ruleErrs,setRuleErrs]=useState({});

  const saveRule=()=>{
    const e={};
    if(ruleForm.fromQty===""||+ruleForm.fromQty<0) e.fromQty="!";
    if(ruleForm.bonusPercent===""||+ruleForm.bonusPercent<0||+ruleForm.bonusPercent>100) e.bonusPercent="0–100";
    if(!ruleForm.label.trim()) e.label="!";
    setRuleErrs(e);if(Object.keys(e).length) return;
    if(ruleEdit){
      setBonusRules(p=>p.map(r=>r.id===ruleEdit.id?{...r,fromQty:+ruleForm.fromQty,bonusPercent:+ruleForm.bonusPercent,label:ruleForm.label}:r));
      setToast({message:"Правило обновлено",type:"success"});
    } else {
      setBonusRules(p=>[...p,{id:Date.now(),fromQty:+ruleForm.fromQty,bonusPercent:+ruleForm.bonusPercent,label:ruleForm.label}]);
      setToast({message:"Правило добавлено",type:"success"});
    }
    setRuleEdit(null);setRuleForm({fromQty:"",bonusPercent:"",label:""});
  };
  const deleteRule=id=>{
    if((bonusRules||[]).length<=1){setToast({message:"Нельзя удалить последнее правило",type:"error"});return;}
    setBonusRules(p=>p.filter(r=>r.id!==id));
    setToast({message:"Удалено",type:"error"});
  };
  const startEditRule=r=>{setRuleEdit(r);setRuleForm({fromQty:r.fromQty,bonusPercent:r.bonusPercent,label:r.label});};
  const sortedRules=[...(bonusRules||[])].sort((a,b)=>a.fromQty-b.fromQty);

  const periodLabel={today:"Сегодня",week:"Эта неделя",month:"Этот месяц",custom:"Период"}[period];
  const tabStyle=active=>({padding:"7px 16px",borderRadius:7,border:`1px solid ${active?C.primary:C.border}`,background:active?C.primaryBg:C.surface,color:active?C.primary:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"});

  return(
    <div>
      <PageH title="Статистика выработки и премии">
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[["stats","Статистика"],["rules","Правила премий"]].map(([t,l])=>(
            (t==="rules"&&!isAdmin)?null:
            <button key={t} onClick={()=>setTab(t)} style={tabStyle(tab===t)}>{l}</button>
          ))}
        </div>
      </PageH>

      {tab==="stats"&&(<>
        {/* Period selector */}
        <Card s={{marginBottom:16,padding:"12px 16px"}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
            <span style={{fontSize:12,color:C.muted,fontWeight:600}}>Период:</span>
            {[["today","Сегодня"],["week","Неделя"],["month","Месяц"],["custom","Произвольный"]].map(([v,l])=>(
              <button key={v} onClick={()=>setPeriod(v)} style={tabStyle(period===v)}>{l}</button>
            ))}
            {period==="custom"&&(<>
              <input type="date" value={customFrom} onChange={e=>setCustomFrom(e.target.value)} style={{padding:"6px 8px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,fontFamily:"inherit"}}/>
              <span style={{color:C.dim}}>—</span>
              <input type="date" value={customTo} onChange={e=>setCustomTo(e.target.value)} style={{padding:"6px 8px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,fontFamily:"inherit"}}/>
            </>)}
            <span style={{marginLeft:"auto",fontSize:11,color:C.dim}}>{fromDate} → {toDate}</span>
            <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:"6px 8px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,fontSize:12,fontFamily:"inherit"}}>
              <option value="qty_desc">↓ По выработке</option>
              <option value="qty_asc">↑ По выработке</option>
              <option value="bonus_desc">↓ По премии</option>
              <option value="name">По имени</option>
            </select>
          </div>
        </Card>

        {/* Summary stats */}
        <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:16}}>
          <Stat icon={<I.factory size={18}/>} label={`Выработка (${periodLabel})`} value={`${totalAll} ед.`} color={C.success}/>
          <Stat icon={<I.people size={18}/>} label="Среднее на сотрудника" value={`${avgQty} ед.`} color={C.info}/>
          {topWorker&&<Stat icon={<I.star size={18}/>} label={`Лидер: ${topWorker.w.name.split(" ")[1]||topWorker.w.name}`} value={`${topWorker.totalQty} ед.`} color={C.primary}/>}
          {topWorker&&<Stat icon={<I.chart size={18}/>} label="Макс. премия" value={`+${topWorker.bonusPercent}%`} color={C.success}/>}
        </div>

        {/* Charts row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:14,marginBottom:16}}>
          <Card>
            <Title>Выработка по сотрудникам</Title>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                <XAxis type="number" tick={{fill:C.dim,fontSize:10}}/>
                <YAxis type="category" dataKey="name" tick={{fill:C.text,fontSize:11}} width={80}/>
                <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}} formatter={(v,n)=>[v, n==="qty"?"Выработка":"Премия %"]}/>
                <Bar dataKey="qty" fill={C.success} radius={[0,4,4,0]} name="qty"/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <Title>Выработка по дням</Title>
            {trendData.length>0?(
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData}>
                  <defs><linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.success} stopOpacity={.3}/><stop offset="95%" stopColor={C.success} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
                  <XAxis dataKey="date" tick={{fill:C.dim,fontSize:10}}/>
                  <YAxis tick={{fill:C.dim,fontSize:10}}/>
                  <Tooltip contentStyle={{background:C.surface2,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}} formatter={v=>[v,"Выработка"]}/>
                  <Area type="monotone" dataKey="qty" stroke={C.success} fill="url(#gS)" name="Выработка"/>
                </AreaChart>
              </ResponsiveContainer>
            ):<div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center",color:C.dim,fontSize:13}}>Нет данных за период</div>}
          </Card>
        </div>

        {/* Worker cards */}
        <div style={{display:"grid",gap:12}}>
          {sorted.map((s,i)=>{
            const breakdown=Object.entries(s.byProduct).sort((a,b)=>b[1]-a[1]);
            const bonusClr=s.bonusPercent>=15?C.success:s.bonusPercent>=10?C.primary:s.bonusPercent>=5?C.orange:C.dim;
            return(
              <Card key={s.w.id} s={{borderLeft:`3px solid ${bonusClr}`}}>
                <div style={{display:"flex",flexWrap:"wrap",gap:14,alignItems:"flex-start"}}>
                  {/* Avatar + name */}
                  <div style={{display:"flex",alignItems:"center",gap:10,minWidth:160}}>
                    <div style={{width:40,height:40,borderRadius:10,background:`${CC[i%CC.length]}15`,color:CC[i%CC.length],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:17,border:`2px solid ${CC[i%CC.length]}30`,flexShrink:0}}>
                      {s.w.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:C.text}}>{s.w.name.split(" ").slice(0,2).join(" ")}</div>
                      <div style={{fontSize:11,color:C.dim}}>#{i+1} по выработке</div>
                    </div>
                  </div>

                  {/* Qty */}
                  <div style={{textAlign:"center",minWidth:80}}>
                    <div style={{fontSize:26,fontWeight:800,color:C.text}}>{s.totalQty}</div>
                    <div style={{fontSize:11,color:C.dim}}>единиц</div>
                  </div>

                  {/* Bonus */}
                  <div style={{padding:"8px 14px",background:`${bonusClr}12`,borderRadius:10,border:`1px solid ${bonusClr}25`,minWidth:120}}>
                    <div style={{fontSize:22,fontWeight:800,color:bonusClr}}>+{s.bonusPercent}%</div>
                    <div style={{fontSize:11,fontWeight:600,color:bonusClr,marginTop:1}}>{s.bonusLabel}</div>
                    <div style={{fontSize:10,color:C.dim,marginTop:2}}>от {s.bonusFromQty}+ ед.</div>
                  </div>

                  {/* Salary calc */}
                  <div style={{minWidth:140}}>
                    {s.baseSalary>0?(
                      <div style={{padding:"8px 14px",background:C.bg,borderRadius:8,border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:11,color:C.dim}}>Базовая ставка</div>
                        <div style={{fontSize:14,fontWeight:600,color:C.text}}>{s.baseSalary.toLocaleString("ru")} ₽</div>
                        {s.bonusPercent>0&&<>
                          <div style={{fontSize:11,color:C.dim,marginTop:4}}>Премия</div>
                          <div style={{fontSize:14,fontWeight:700,color:C.success}}>+{s.bonusAmount.toLocaleString("ru")} ₽</div>
                          <div style={{height:1,background:C.border,margin:"6px 0"}}/>
                          <div style={{fontSize:13,fontWeight:800,color:C.text}}>{(s.baseSalary+s.bonusAmount).toLocaleString("ru")} ₽</div>
                        </>}
                      </div>
                    ):(
                      <div style={{fontSize:11,color:C.dim,padding:"8px 0"}}>Ставка не указана<br/><span style={{color:C.info}}>Задайте в Пользователях</span></div>
                    )}
                  </div>

                  {/* To next level */}
                  {s.toNext>0&&s.nextRule&&(
                    <div style={{fontSize:11,color:C.muted,padding:"8px 0",maxWidth:140}}>
                      <div>До уровня <strong style={{color:C.primary}}>{s.nextRule.label}</strong>:</div>
                      <div style={{fontWeight:700,color:C.primary,fontSize:13}}>{s.toNext} ед.</div>
                      <div style={{color:C.dim}}>(+{s.nextRule.bonusPercent}% премия)</div>
                    </div>
                  )}

                  {/* Product breakdown */}
                  {breakdown.length>0&&(
                    <div style={{flex:"1 1 160px"}}>
                      <div style={{fontSize:11,color:C.dim,marginBottom:6}}>По продуктам:</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {breakdown.map(([name,qty])=>(
                          <div key={name} style={{padding:"3px 9px",background:C.bg,borderRadius:6,border:`1px solid ${C.border}`,fontSize:11}}>
                            <span style={{color:C.muted}}>{name.length>12?name.slice(0,12)+"…":name}</span>
                            <span style={{fontWeight:700,color:C.text,marginLeft:5}}>{qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress to next level */}
                {s.nextRule&&s.totalQty>0&&(
                  <div style={{marginTop:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.dim,marginBottom:3}}>
                      <span>{s.bonusLabel} ({s.bonusFromQty} ед.)</span>
                      <span>{s.nextRule.label} ({s.nextRule.fromQty} ед.)</span>
                    </div>
                    <div style={{height:4,background:C.bg,borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.min(100,Math.round((s.totalQty-s.bonusFromQty)/(s.nextRule.fromQty-s.bonusFromQty)*100))}%`,background:bonusClr,borderRadius:2,transition:"width .4s"}}/>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
          {sorted.length===0&&<div style={{textAlign:"center",padding:50,color:C.dim,fontSize:13}}>Нет активных сотрудников</div>}
        </div>
      </>)}

      {tab==="rules"&&isAdmin&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,alignItems:"start"}}>
          {/* Rules table */}
          <Card s={{padding:0,overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <Title>Пороги премий</Title>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><TH>От (ед.)</TH><TH>Премия %</TH><TH>Название уровня</TH><TH></TH></tr></thead>
              <tbody>
                {sortedRules.map((r,i)=>{
                  const next=sortedRules[i+1];
                  return(
                    <tr key={r.id} style={{borderBottom:`1px solid ${C.border}`}}>
                      <TD s={{fontWeight:700,color:C.primary}}>{r.fromQty}+{next?` (до ${next.fromQty-1})`:""}</TD>
                      <TD><Badge color={r.bonusPercent>=15?"success":r.bonusPercent>=10?"primary":r.bonusPercent>=5?"orange":"info"}>+{r.bonusPercent}%</Badge></TD>
                      <TD s={{fontWeight:500}}>{r.label}</TD>
                      <TD><div style={{display:"flex",gap:4}}>
                        <Btn v="ghost" sz="sm" onClick={()=>startEditRule(r)} icon={<I.edit size={13}/>}/>
                        <Btn v="ghost" sz="sm" onClick={()=>deleteRule(r.id)} icon={<I.trash size={13}/>}/>
                      </div></TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{padding:"10px 16px",borderTop:`1px solid ${C.border}`,fontSize:11,color:C.dim}}>
              Логика: находится наибольший порог ≤ выработки сотрудника → применяется его %.
            </div>
          </Card>

          {/* Rule form */}
          <Card>
            <Title>{ruleEdit?"Редактировать правило":"Новое правило"}</Title>
            <Inp label="От (количество единиц)" type="number" min="0" value={ruleForm.fromQty} onChange={e=>setRuleForm({...ruleForm,fromQty:e.target.value})} error={ruleErrs.fromQty} placeholder="напр. 100"/>
            <Inp label="Процент премии (%)" type="number" min="0" max="100" value={ruleForm.bonusPercent} onChange={e=>setRuleForm({...ruleForm,bonusPercent:e.target.value})} error={ruleErrs.bonusPercent} placeholder="напр. 10"/>
            <Inp label="Название уровня" value={ruleForm.label} onChange={e=>setRuleForm({...ruleForm,label:e.target.value})} error={ruleErrs.label} placeholder="напр. Отлично"/>
            <div style={{display:"flex",gap:8,marginTop:6}}>
              {ruleEdit&&<Btn v="secondary" onClick={()=>{setRuleEdit(null);setRuleForm({fromQty:"",bonusPercent:"",label:""});}}>Отмена</Btn>}
              <Btn v={ruleEdit?"primary":"success"} onClick={saveRule}>{ruleEdit?"Сохранить":"Добавить правило"}</Btn>
            </div>

            <div style={{marginTop:20,padding:"12px 14px",background:`${C.primary}08`,borderRadius:8,border:`1px solid ${C.primary}20`}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:8}}>Пример расчёта</div>
              {sortedRules.map((r,i)=>{
                const qty=r.fromQty+(sortedRules[i+1]?Math.floor((sortedRules[i+1].fromQty-r.fromQty)/2):100);
                return(
                  <div key={r.id} style={{fontSize:11,color:C.muted,marginBottom:3}}>
                    Выработка {qty} ед. → <strong style={{color:C.text}}>{r.label}</strong> → <span style={{color:C.success}}>+{r.bonusPercent}%</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTION OUTPUT PAGE
// ═══════════════════════════════════════════════════════════════
const ProductionOutputPage = ()=>{
  const {productionOutputs,setProductionOutputs,products,setProducts,inventoryMovements,setInventoryMovements,employeeHistory,setEmployeeHistory,productionPlans,setProductionPlans,users,currentUser,addLog,addNotification}=useContext(AppContext);
  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isWorker=role?.name==="worker";
  const workers=users.filter(u=>u.roleId===3&&u.status==="active");
  const ap=products.filter(p=>!p.deleted);

  const [modal,setModal]=useState(false);
  const [edit,setEdit]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [toast,setToast]=useState(null);
  const [search,setSearch]=useState("");
  const [fEmp,setFEmp]=useState("all");
  const [errs,setErrs]=useState({});

  const emptyForm={
    employeeId:isWorker?currentUser.id:(workers[0]?.id||""),
    productId:ap[0]?.id||"",
    quantity:"",
    date:new Date().toISOString().slice(0,16),
    comment:""
  };
  const [form,setForm]=useState(emptyForm);

  const list=useMemo(()=>{
    let l=[...(productionOutputs||[])];
    if(fEmp!=="all") l=l.filter(o=>o.employeeId===+fEmp);
    if(search){
      const s=search.toLowerCase();
      l=l.filter(o=>{
        const p=products.find(x=>x.id===o.productId);
        const u=users.find(x=>x.id===o.employeeId);
        return p?.name.toLowerCase().includes(s)||u?.name.toLowerCase().includes(s)||o.comment?.toLowerCase().includes(s);
      });
    }
    return l.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[productionOutputs,fEmp,search,products,users]);

  const openNew=()=>{setEdit(null);setForm(emptyForm);setErrs({});setModal(true)};
  const openEdit=(o)=>{
    setEdit(o);
    setForm({employeeId:o.employeeId,productId:o.productId,quantity:o.quantity,date:o.date.slice(0,16),comment:o.comment||""});
    setErrs({});setModal(true);
  };

  const validate=()=>{
    const e={};
    if(!form.employeeId) e.employeeId="!";
    if(!form.productId) e.productId="!";
    if(!form.quantity||+form.quantity<=0) e.quantity="Укажите > 0";
    if(!form.date) e.date="!";
    setErrs(e);return!Object.keys(e).length;
  };

  const revertOutput=(out)=>{
    setProducts(p=>p.map(x=>x.id===out.productId?{...x,stock:Math.max(0,x.stock-out.quantity),updatedAt:new Date().toISOString()}:x));
    setInventoryMovements(p=>p.filter(m=>m.refId!==`output-${out.id}`));
    const ds=out.date.slice(0,10);
    setEmployeeHistory(p=>p.map(h=>h.employeeId===out.employeeId&&h.date===ds?{...h,producedQty:Math.max(0,h.producedQty-out.quantity)}:h));
    setProductionPlans(p=>p.map(pl=>{
      if(pl.productId===out.productId&&pl.productionDate===ds&&pl.status!=="отменён"){
        const nc=Math.max(0,pl.completedQty-out.quantity);
        return{...pl,completedQty:nc,status:nc>=pl.plannedQty?"выполнен":nc>0?"в процессе":"запланирован"};
      }return pl;
    }));
  };

  const applyOutput=(out,stockBefore)=>{
    const newBalance=stockBefore+out.quantity;
    setProducts(p=>p.map(x=>x.id===out.productId?{...x,stock:x.stock+out.quantity,updatedAt:new Date().toISOString()}:x));
    setInventoryMovements(p=>[...p,{id:out.id+0.1,productId:out.productId,type:"output",quantity:out.quantity,balance:newBalance,refId:`output-${out.id}`,createdAt:out.date}]);
    const ds=out.date.slice(0,10);
    setEmployeeHistory(p=>{
      const ex=p.find(h=>h.employeeId===out.employeeId&&h.date===ds);
      if(ex) return p.map(h=>h.id===ex.id?{...h,producedQty:h.producedQty+out.quantity}:h);
      return [...p,{id:Date.now()+Math.random(),employeeId:out.employeeId,date:ds,attendance:"present",tasksCompleted:0,producedQty:out.quantity,workStart:"09:00",workEnd:"18:00",comment:""}];
    });
    setProductionPlans(p=>p.map(pl=>{
      if(pl.productId===out.productId&&pl.productionDate===ds&&pl.status!=="отменён"){
        const nc=Math.min(pl.plannedQty,pl.completedQty+out.quantity);
        return{...pl,completedQty:nc,status:nc>=pl.plannedQty?"выполнен":"в процессе"};
      }return pl;
    }));
  };

  const save=()=>{
    if(!validate()) return;
    const qty=+form.quantity;const productId=+form.productId;const employeeId=+form.employeeId;
    const now=new Date().toISOString();
    const curStock=products.find(p=>p.id===productId)?.stock||0;
    const prod=products.find(p=>p.id===productId);
    const emp=users.find(u=>u.id===employeeId);
    if(edit){
      const stockBefore=edit.productId===productId?Math.max(0,curStock-edit.quantity):curStock;
      revertOutput(edit);
      const newOut={...edit,productId,employeeId,quantity:qty,date:new Date(form.date).toISOString(),comment:form.comment,updatedAt:now};
      setProductionOutputs(p=>p.map(o=>o.id===edit.id?newOut:o));
      applyOutput(newOut,stockBefore);
      addLog(`Выпуск изменён: ${prod?.name} x${qty} → ${emp?.name?.split(" ").slice(0,2).join(" ")}`);
      setToast({message:"Запись обновлена",type:"success"});
    } else {
      const id=Date.now();
      const newOut={id,productId,employeeId,quantity:qty,date:new Date(form.date).toISOString(),comment:form.comment,createdAt:now,createdBy:currentUser.id};
      setProductionOutputs(p=>[...(p||[]),newOut]);
      applyOutput(newOut,curStock);
      addLog(`Выпуск: ${prod?.name} x${qty} → ${emp?.name?.split(" ").slice(0,2).join(" ")}`);
      addNotification({title:`Выпуск: ${prod?.name} x${qty}`,type:"информация",content:`${emp?.name?.split(" ").slice(0,2).join(" ")} зафиксировал выпуск ${prod?.name} — ${qty} ${prod?.unit}`,targetAll:true});
      setToast({message:"Выпуск зафиксирован!",type:"success"});
    }
    setModal(false);
  };

  const doDelete=(o)=>{
    revertOutput(o);
    setProductionOutputs(p=>(p||[]).filter(x=>x.id!==o.id));
    const prod=products.find(p=>p.id===o.productId);
    addLog(`Выпуск удалён: ${prod?.name} x${o.quantity}`);
    setToast({message:"Запись удалена",type:"error"});
    setConfirm(null);
  };

  const totalQty=(productionOutputs||[]).reduce((s,o)=>s+o.quantity,0);
  const todayStr=new Date().toISOString().slice(0,10);
  const todayQty=(productionOutputs||[]).filter(o=>o.date.startsWith(todayStr)).reduce((s,o)=>s+o.quantity,0);
  const selectedProd=ap.find(p=>p.id===+form.productId);

  return(
    <div>
      <PageH title="Выпуск готовой продукции">
        <SearchBox value={search} onChange={e=>setSearch(e.target.value)} ph="Поиск..."/>
        {!isWorker&&(
          <select value={fEmp} onChange={e=>setFEmp(e.target.value)} style={{padding:"7px 9px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,fontSize:12,fontFamily:"inherit"}}>
            <option value="all">Все сотрудники</option>
            {workers.map(w=><option key={w.id} value={w.id}>{w.name.split(" ").slice(0,2).join(" ")}</option>)}
          </select>
        )}
        <Btn onClick={openNew} icon={<I.plus size={15}/>}>Добавить выпуск</Btn>
      </PageH>

      <div style={{display:"flex",flexWrap:"wrap",gap:12,marginBottom:16}}>
        <Stat icon={<I.factory size={18}/>} label="Всего выпущено" value={`${totalQty} ед.`} color={C.success}/>
        <Stat icon={<I.check size={18}/>} label="Сегодня" value={`${todayQty} ед.`} color={C.primary}/>
        <Stat icon={<I.file size={18}/>} label="Записей всего" value={(productionOutputs||[]).length} color={C.info}/>
      </div>

      <Card s={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr><TH>Дата</TH><TH>Сотрудник</TH><TH>Продукт</TH><TH>Кол-во</TH><TH>Комментарий</TH><TH></TH></tr></thead>
            <tbody>
              {list.map(o=>{
                const prod=products.find(p=>p.id===o.productId);
                const emp=users.find(u=>u.id===o.employeeId);
                return(
                  <tr key={o.id} style={{borderBottom:`1px solid ${C.border}`}}>
                    <TD s={{fontSize:12,whiteSpace:"nowrap"}}>{fmtDate(o.date)}</TD>
                    <TD s={{fontWeight:500}}>{emp?.name?.split(" ").slice(0,2).join(" ")||"—"}</TD>
                    <TD>{prod?.name||"—"}</TD>
                    <TD s={{fontWeight:700,color:C.success}}>+{o.quantity} {prod?.unit||""}</TD>
                    <TD s={{color:C.dim,fontSize:12,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.comment||"—"}</TD>
                    <TD><div style={{display:"flex",gap:4}}>
                      <Btn v="ghost" sz="sm" onClick={()=>openEdit(o)} icon={<I.edit size={14}/>}/>
                      <Btn v="ghost" sz="sm" onClick={()=>setConfirm({title:"Удалить выпуск?",message:`Удалить запись "${prod?.name} x${o.quantity}"? Остаток склада будет скорректирован.`,onConfirm:()=>doDelete(o)})} icon={<I.trash size={14}/>}/>
                    </div></TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      {list.length===0&&(
        <div style={{textAlign:"center",padding:50,color:C.dim}}>
          <I.factory size={36}/><p style={{marginTop:10,fontSize:13}}>Нет записей о выпуске.<br/>Нажмите «Добавить выпуск».</p>
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)} title={edit?"Редактировать выпуск":"Новый выпуск продукции"}>
        <Sel label="Сотрудник" value={form.employeeId}
          onChange={e=>setForm({...form,employeeId:e.target.value})}
          error={errs.employeeId}
          options={[{value:"",label:"Выберите"},...workers.map(w=>({value:w.id,label:w.name.split(" ").slice(0,2).join(" ")}))]}/>
        <Sel label="Продукт" value={form.productId}
          onChange={e=>setForm({...form,productId:e.target.value})}
          error={errs.productId}
          options={[{value:"",label:"Выберите"},...ap.map(p=>({value:p.id,label:`${p.name} (на складе: ${p.stock} ${p.unit})`}))]}/>
        <Inp label="Количество" type="number" min="1" step="1" value={form.quantity}
          onChange={e=>setForm({...form,quantity:e.target.value})} error={errs.quantity}/>
        <Inp label="Дата и время" type="datetime-local" value={form.date}
          onChange={e=>setForm({...form,date:e.target.value})} error={errs.date}/>
        <Txa label="Комментарий (необязательно)" value={form.comment}
          onChange={e=>setForm({...form,comment:e.target.value})} placeholder="Например: утренняя партия"/>
        {selectedProd&&form.quantity&&+form.quantity>0&&(
          <div style={{padding:"10px 14px",background:`${C.success}10`,borderRadius:8,border:`1px solid ${C.success}25`,marginBottom:12,fontSize:13}}>
            <span style={{color:C.muted}}>Склад после сохранения: </span>
            <span style={{fontWeight:700,color:C.success}}>
              {selectedProd.stock} → {selectedProd.stock+(edit&&edit.productId===+form.productId?-edit.quantity:0)+(+form.quantity)} {selectedProd.unit}
            </span>
          </div>
        )}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}>
          <Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn>
          <Btn v="success" onClick={save}>{edit?"Сохранить":"Зафиксировать выпуск"}</Btn>
        </div>
      </Modal>

      {confirm&&<Confirm open={!!confirm} onClose={()=>setConfirm(null)} title={confirm.title} message={confirm.message} onConfirm={confirm.onConfirm}/>}
      {toast&&<Toast {...toast} onClose={()=>setToast(null)}/>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CAMERAS
// ═══════════════════════════════════════════════════════════════

// Animated demo "camera feed" — no external dependencies
const DemoCameraFeed = ({camId, name}) => {
  const palettes = [
    ["#0a2010","#0a1020"],["#201008","#100a20"],["#10200a","#202010"],["#0a1020","#200a10"],
    ["#101820","#081018"],["#180808","#080818"],
  ];
  const [a,b] = palettes[camId % palettes.length];
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t+1), 1000); return () => clearInterval(id); }, []);
  const ts = new Date().toLocaleTimeString("ru-RU", {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const ds = new Date().toLocaleDateString("ru-RU", {day:"2-digit",month:"2-digit",year:"numeric"});
  // Simulate subtle motion: slight gradient shift per tick
  const shift = (tick % 10) * 3;
  return (
    <div style={{width:"100%",height:"100%",background:`linear-gradient(${135+shift}deg, ${a}, ${b})`,position:"relative",overflow:"hidden"}}>
      {/* CRT scanlines */}
      <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,.07) 3px,rgba(0,0,0,.07) 4px)",pointerEvents:"none",zIndex:1}}/>
      {/* Noise overlay */}
      <div style={{position:"absolute",inset:0,opacity:.04,backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,pointerEvents:"none",zIndex:2}}/>
      {/* Center icon */}
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:3}}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.5">
          <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      </div>
      {/* Demo label */}
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",zIndex:4,flexDirection:"column",gap:4}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.18)",fontFamily:"monospace",letterSpacing:2,marginTop:40}}>ДЕМО РЕЖИМ</div>
      </div>
      {/* REC dot */}
      <div style={{position:"absolute",top:8,left:10,display:"flex",alignItems:"center",gap:5,zIndex:5}}>
        <div style={{width:7,height:7,borderRadius:"50%",background:"#ff3a3a",animation:"pulseGlow 1s infinite"}}/>
        <span style={{fontSize:10,color:"rgba(255,255,255,0.6)",fontFamily:"monospace",letterSpacing:1}}>REC</span>
      </div>
      {/* Camera ID top-right */}
      <div style={{position:"absolute",top:8,right:10,fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:"monospace",zIndex:5}}>CAM{String(camId).padStart(2,"0")}</div>
      {/* Timestamp */}
      <div style={{position:"absolute",bottom:8,left:10,zIndex:5}}>
        <div style={{fontSize:11,color:"rgba(0,255,80,0.7)",fontFamily:"monospace",letterSpacing:1}}>{ts}</div>
        <div style={{fontSize:9,color:"rgba(0,255,80,0.4)",fontFamily:"monospace"}}>{ds}</div>
      </div>
    </div>
  );
};

// Renders the actual camera feed based on source type
const CameraFeed = ({cam}) => {
  const [imgKey, setImgKey] = useState(0);
  const [errored, setErrored] = useState(false);

  // Refresh snapshot periodically for "image" type
  useEffect(() => {
    if(cam.type !== "image" || !cam.url) return;
    const sec = Math.max(2, cam.refreshSec || 5);
    const id = setInterval(() => { setImgKey(k => k+1); setErrored(false); }, sec * 1000);
    return () => clearInterval(id);
  }, [cam.type, cam.url, cam.refreshSec]);

  if(!cam.enabled) return (
    <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f0c09",flexDirection:"column",gap:6}}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
      <span style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>Камера отключена</span>
    </div>
  );

  if(cam.type === "demo" || !cam.url) return <DemoCameraFeed camId={cam.id} name={cam.name}/>;

  if(cam.type === "iframe") return (
    <iframe
      src={cam.url}
      title={cam.name}
      style={{width:"100%",height:"100%",border:"none",display:"block"}}
      sandbox="allow-scripts allow-same-origin allow-forms"
      allowFullScreen
      onError={()=>setErrored(true)}
    />
  );

  if(cam.type === "image" || cam.type === "mjpeg") {
    if(errored) return (
      <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#1a0a0a",flexDirection:"column",gap:8}}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C44E3D" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span style={{fontSize:11,color:"#C44E3D"}}>Источник недоступен</span>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.2)",maxWidth:160,textAlign:"center",wordBreak:"break-all"}}>{cam.url}</span>
        <button onClick={()=>{setErrored(false);setImgKey(k=>k+1)}} style={{fontSize:10,color:"#C8963E",background:"none",border:"1px solid #C8963E40",borderRadius:4,padding:"3px 10px",cursor:"pointer",marginTop:4}}>Повторить</button>
      </div>
    );
    return (
      <img
        key={`${imgKey}`}
        src={cam.type==="image"?`${cam.url}${cam.url.includes("?")?"&":"?"}_t=${imgKey}`:cam.url}
        alt={cam.name}
        style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}
        onError={()=>setErrored(true)}
        onLoad={()=>setErrored(false)}
      />
    );
  }

  if(cam.type === "mp4" || cam.type === "hls") return (
    <video
      key={cam.url}
      src={cam.url}
      autoPlay muted loop playsInline
      style={{width:"100%",height:"100%",objectFit:"cover",display:"block",background:"#000"}}
      onError={()=>setErrored(true)}
    >
      {cam.type==="hls"&&<source src={cam.url} type="application/x-mpegURL"/>}
      {cam.type==="mp4"&&<source src={cam.url} type="video/mp4"/>}
    </video>
  );

  if(cam.type === "rtsp") return (
    <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",background:"#0f0c09",flexDirection:"column",gap:8,padding:16}}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E8A838" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span style={{fontSize:12,color:"#E8A838",fontWeight:600}}>RTSP не поддерживается</span>
      <span style={{fontSize:10,color:"rgba(255,255,255,0.3)",textAlign:"center",lineHeight:1.5}}>Браузер не воспроизводит RTSP напрямую. Используйте WebRTC-шлюз (напр. go2rtc, MediaMTX) и выберите тип "iframe" или "HLS".</span>
    </div>
  );

  return <DemoCameraFeed camId={cam.id} name={cam.name}/>;
};

// Camera tile: feed + overlay label
const CameraTile = ({cam, onFullscreen}) => {
  const isAvailable = cam.enabled && cam.type !== "rtsp";
  return (
    <div
      style={{position:"relative",background:"#080604",borderRadius:10,overflow:"hidden",border:`1px solid ${isAvailable?"rgba(255,255,255,0.08)":"rgba(196,78,61,0.2)"}`,cursor:"pointer",aspectRatio:"16/9"}}
      onDoubleClick={()=>onFullscreen(cam)}
    >
      <CameraFeed cam={cam}/>
      {/* Bottom overlay */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.75))",padding:"20px 10px 8px",pointerEvents:"none"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:"#fff",lineHeight:1.2}}>{cam.name}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>{cam.zone}</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:isAvailable?"#52C97A":"#C44E3D",boxShadow:isAvailable?"0 0 5px #52C97A":"none"}}/>
            <span style={{fontSize:9,color:isAvailable?"rgba(82,201,122,0.8)":"rgba(196,78,61,0.8)"}}>{isAvailable?"ONLINE":"OFFLINE"}</span>
          </div>
        </div>
      </div>
      {/* Fullscreen hint */}
      <div style={{position:"absolute",top:8,right:8,opacity:0,transition:"opacity .2s",pointerEvents:"none"}} className="cam-fs-hint">
        <div style={{background:"rgba(0,0,0,0.6)",borderRadius:4,padding:"3px 6px",fontSize:9,color:"rgba(255,255,255,0.6)"}}>2× клик — полный экран</div>
      </div>
    </div>
  );
};

// Camera page
const CameraPage = () => {
  const {cameras, setCameras, currentUser} = useContext(AppContext);
  const role = ROLES.find(r => r.id === currentUser.roleId);
  const canManage = role?.name === "admin" || role?.name === "owner";
  const [tab, setTab] = useState("view");
  const [layout, setLayout] = useState(4); // 1, 4, 9
  const [fullscreenCam, setFullscreenCam] = useState(null);
  const [modal, setModal] = useState(false);
  const [editCam, setEditCam] = useState(null);
  const [form, setForm] = useState({name:"",zone:"Цех",type:"demo",url:"",description:"",enabled:true,refreshSec:5});
  const [errs, setErrs] = useState({});

  const activeCams = cameras.filter(c => c.enabled || tab === "manage");
  const displayCams = cameras.filter(c => c.enabled);

  const openAdd = () => {
    setEditCam(null);
    setForm({name:"",zone:"Цех",type:"demo",url:"",description:"",enabled:true,refreshSec:5});
    setErrs({});
    setModal(true);
  };

  const openEdit = (cam) => {
    setEditCam(cam);
    setForm({name:cam.name,zone:cam.zone||"Цех",type:cam.type,url:cam.url||"",description:cam.description||"",enabled:cam.enabled,refreshSec:cam.refreshSec||5});
    setErrs({});
    setModal(true);
  };

  const saveCamera = () => {
    if(!form.name.trim()) { setErrs({name:"Введите название"}); return; }
    if(form.type !== "demo" && form.type !== "rtsp" && !form.url.trim()) { setErrs({url:"Укажите URL"}); return; }
    if(editCam) {
      setCameras(p => p.map(c => c.id === editCam.id ? {...c,...form,id:c.id} : c));
    } else {
      setCameras(p => [...p, {...form, id:Date.now()}]);
    }
    setModal(false);
  };

  const deleteCamera = (id) => setCameras(p => p.filter(c => c.id !== id));
  const toggleCamera = (id) => setCameras(p => p.map(c => c.id === id ? {...c, enabled:!c.enabled} : c));

  // Grid columns based on layout
  const gridCols = layout === 1 ? 1 : layout === 4 ? 2 : 3;

  // Fullscreen overlay
  if(fullscreenCam) return (
    <div style={{position:"fixed",inset:0,background:"#000",zIndex:9999,display:"flex",flexDirection:"column"}}>
      <div style={{flexShrink:0,padding:"8px 16px",background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div>
          <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>{fullscreenCam.name}</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginLeft:10}}>{fullscreenCam.zone}</span>
        </div>
        <button onClick={()=>setFullscreenCam(null)} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:6,color:"#fff",cursor:"pointer",padding:"5px 14px",fontSize:12,fontFamily:"inherit"}}>✕ Закрыть</button>
      </div>
      <div style={{flex:1,overflow:"hidden"}}>
        <CameraFeed cam={fullscreenCam}/>
      </div>
    </div>
  );

  return (
    <div>
      <PageH title="Камеры">
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {canManage && [["view","Просмотр"],["manage","Управление"]].map(([id,lb]) => (
            <button key={id} onClick={()=>setTab(id)} style={{padding:"6px 14px",borderRadius:7,border:`1px solid ${tab===id?C.primary:C.border}`,background:tab===id?C.primaryBg:C.surface,color:tab===id?C.primary:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{lb}</button>
          ))}
          {tab==="view" && [1,4,9].map(n => (
            <button key={n} onClick={()=>setLayout(n)} style={{padding:"5px 12px",borderRadius:7,border:`1px solid ${layout===n?C.primary:C.border}`,background:layout===n?C.primaryBg:C.surface,color:layout===n?C.primary:C.muted,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              {n===1?"1×1":n===4?"2×2":"3×3"}
            </button>
          ))}
        </div>
        {tab==="manage"&&canManage&&<Btn onClick={openAdd} icon={<I.plus size={15}/>}>Добавить камеру</Btn>}
      </PageH>

      {/* View tab */}
      {tab==="view" && (
        <>
          {displayCams.length===0 ? (
            <Card><div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{opacity:.3,marginBottom:12}}><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              <div style={{fontSize:14}}>Нет активных камер</div>
              {canManage&&<div style={{fontSize:12,marginTop:6,color:C.dim}}>Добавьте камеры на вкладке «Управление»</div>}
            </div></Card>
          ) : (
            <div style={{display:"grid",gridTemplateColumns:`repeat(${gridCols},1fr)`,gap:12}}>
              {displayCams.slice(0, layout).map(cam => (
                <CameraTile key={cam.id} cam={cam} onFullscreen={setFullscreenCam}/>
              ))}
              {/* Empty slots to fill grid */}
              {displayCams.length < layout && Array.from({length: layout - displayCams.length}).map((_,i) => (
                <div key={`empty-${i}`} style={{background:"rgba(255,255,255,0.015)",borderRadius:10,border:"1px dashed rgba(255,255,255,0.06)",aspectRatio:"16/9",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:11,color:"rgba(255,255,255,0.1)"}}>—</span>
                </div>
              ))}
            </div>
          )}
          {displayCams.length > layout && (
            <div style={{marginTop:10,fontSize:12,color:C.dim,textAlign:"center"}}>
              Показано {layout} из {displayCams.length} активных. Переключите сетку выше.
            </div>
          )}
          <div style={{marginTop:12,padding:"8px 14px",background:C.surface,borderRadius:8,border:`1px solid ${C.border}`,fontSize:11,color:C.dim}}>
            💡 Двойной клик на камере — полный экран. Конфигурация хранится в localStorage этого браузера.
          </div>
        </>
      )}

      {/* Manage tab */}
      {tab==="manage"&&canManage && (
        <Card s={{padding:0,overflow:"hidden"}}>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr><TH>Камера</TH><TH>Зона</TH><TH>Тип</TH><TH>URL</TH><TH>Статус</TH><TH></TH></tr></thead>
              <tbody>{cameras.map(cam => (
                <tr key={cam.id} style={{borderBottom:`1px solid ${C.border}`,opacity:cam.enabled?1:0.5}}>
                  <TD s={{fontWeight:600}}>
                    <div>{cam.name}</div>
                    {cam.description&&<div style={{fontSize:11,color:C.dim,fontWeight:400}}>{cam.description}</div>}
                  </TD>
                  <TD><Badge color="info">{cam.zone}</Badge></TD>
                  <TD><code style={{fontSize:11,color:C.primary,background:C.primaryBg,padding:"2px 6px",borderRadius:4}}>{CAMERA_SOURCE_LABELS[cam.type]||cam.type}</code></TD>
                  <TD s={{fontSize:11,color:C.dim,maxWidth:200}}>
                    <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cam.url||<span style={{opacity:.4}}>—</span>}</div>
                  </TD>
                  <TD>
                    <button onClick={()=>toggleCamera(cam.id)} style={{padding:"3px 10px",borderRadius:5,border:`1px solid ${cam.enabled?"rgba(82,201,122,0.3)":"rgba(196,78,61,0.3)"}`,background:cam.enabled?"rgba(82,201,122,0.08)":"rgba(196,78,61,0.08)",color:cam.enabled?"#52C97A":"#C44E3D",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>
                      {cam.enabled?"Вкл":"Выкл"}
                    </button>
                  </TD>
                  <TD>
                    <div style={{display:"flex",gap:4}}>
                      <Btn v="secondary" sz="sm" onClick={()=>openEdit(cam)} icon={<I.edit size={12}/>}>Ред.</Btn>
                      <Btn v="danger" sz="sm" onClick={()=>deleteCamera(cam.id)} icon={<I.trash size={12}/>}/>
                    </div>
                  </TD>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit camera modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editCam?"Редактировать камеру":"Добавить камеру"} width={520}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px"}}>
          <Inp label="Название" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} error={errs.name}/>
          <Sel label="Зона" value={form.zone} onChange={e=>setForm({...form,zone:e.target.value})} options={CAMERA_ZONES.map(z=>({value:z,label:z}))}/>
          <Sel label="Тип источника" value={form.type} onChange={e=>setForm({...form,type:e.target.value,url:""})} options={CAMERA_SOURCE_TYPES.map(t=>({value:t,label:CAMERA_SOURCE_LABELS[t]}))}/>
          {form.type==="image"&&<Inp label="Обновл. (сек)" value={form.refreshSec} onChange={e=>setForm({...form,refreshSec:+e.target.value})} type="number" min={1} max={60}/>}
        </div>
        {form.type==="rtsp"&&(
          <div style={{padding:"8px 12px",background:"rgba(232,168,56,0.08)",border:"1px solid rgba(232,168,56,0.25)",borderRadius:7,fontSize:11,color:"#E8A838",marginBottom:8}}>
            ⚠ RTSP не воспроизводится браузером напрямую. Настройте WebRTC-шлюз (go2rtc / MediaMTX) и выберите тип "iframe" с URL шлюза.
          </div>
        )}
        {form.type==="hls"&&(
          <div style={{padding:"8px 12px",background:"rgba(91,141,181,0.08)",border:"1px solid rgba(91,141,181,0.2)",borderRadius:7,fontSize:11,color:C.info,marginBottom:8}}>
            ℹ HLS (.m3u8) воспроизводится нативно в Safari. В Chrome/Firefox требуется прокси с поддержкой HLS или конвертация.
          </div>
        )}
        {form.type!=="demo"&&form.type!=="rtsp"&&(
          <Inp label="URL потока / источника" value={form.url} onChange={e=>setForm({...form,url:e.target.value})} error={errs.url}/>
        )}
        <Inp label="Описание (необязательно)" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <input type="checkbox" id="cam-enabled" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})} style={{accentColor:C.primary}}/>
          <label htmlFor="cam-enabled" style={{fontSize:13,color:C.muted,cursor:"pointer"}}>Камера активна</label>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:6}}>
          <Btn v="secondary" onClick={()=>setModal(false)}>Отмена</Btn>
          <Btn onClick={saveCamera}>{editCam?"Сохранить":"Добавить"}</Btn>
        </div>
      </Modal>
    </div>
  );
};
const BOARD_COL_COLORS = {
  "новый":          {bg:"rgba(20,32,52,0.9)",  border:"rgba(74,144,226,0.3)",  dot:"#4A90E2", title:"#7BB8F5"},
  "сборка":         {bg:"rgba(38,28,10,0.9)",  border:"rgba(232,168,56,0.3)",  dot:"#E8A838", title:"#F0C060"},
  "в производстве": {bg:"rgba(32,20,8,0.9)",   border:"rgba(200,150,62,0.3)",  dot:"#C8963E", title:"#E8B060"},
  "готов":          {bg:"rgba(8,36,14,0.9)",   border:"rgba(82,201,122,0.3)",  dot:"#52C97A", title:"#80E8A0"},
};

const fmtElapsed=(since,now)=>{
  if(!since) return "";
  const ms=now-new Date(since).getTime();
  if(ms<0) return "0с";
  const s=Math.floor(ms/1000);
  if(s<60) return `${s}с`;
  const m=Math.floor(s/60);
  if(m<60) return `${m}мин`;
  const h=Math.floor(m/60);
  return `${h}ч ${m%60}м`;
};

const elapsedColor=(since,now)=>{
  if(!since) return "#A89882";
  const m=(now-new Date(since).getTime())/60000;
  if(m<30) return "#52C97A";
  if(m<90) return "#E8A838";
  return "#E85050";
};

const BoardOrderCard=({order,clients,products,now})=>{
  const client=clients.find(c=>c.id===order.clientId);
  const refTime=order.statusChangedAt||order.orderDate;
  const elapsed=fmtElapsed(refTime,now);
  const eColor=elapsedColor(refTime,now);
  const isDelayed=(now-new Date(refTime).getTime())>90*60000;
  const isCrit=order.priority==="срочный";
  const isImp=order.priority==="важный";
  return (
    <div style={{background:isDelayed?"rgba(232,80,80,0.06)":"rgba(255,255,255,0.03)",border:`1px solid ${isCrit?"rgba(232,80,80,0.4)":isDelayed?"rgba(232,80,80,0.2)":"rgba(255,255,255,0.07)"}`,borderRadius:10,padding:"12px 14px",marginBottom:8,position:"relative",animation:isCrit?"pulseBorder 2s infinite":"none"}}>
      {(isCrit||isImp)&&<div style={{position:"absolute",top:0,left:0,bottom:0,width:3,borderRadius:"10px 0 0 10px",background:isCrit?"#E85050":"#E8A838"}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,paddingLeft:(isCrit||isImp)?6:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontSize:22,fontWeight:800,color:"#C8963E",letterSpacing:-1}}>#{order.id}</span>
          {isCrit&&<span style={{fontSize:10,fontWeight:700,background:"rgba(232,80,80,0.2)",color:"#E85050",border:"1px solid rgba(232,80,80,0.35)",borderRadius:4,padding:"2px 6px",letterSpacing:0.5}}>СРОЧНО</span>}
          {isImp&&!isCrit&&<span style={{fontSize:10,fontWeight:700,background:"rgba(232,168,56,0.15)",color:"#E8A838",border:"1px solid rgba(232,168,56,0.3)",borderRadius:4,padding:"2px 6px"}}>ВАЖНЫЙ</span>}
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:20,fontWeight:800,color:eColor,fontVariantNumeric:"tabular-nums"}}>{elapsed}</div>
          <div style={{fontSize:9,color:"#6B5D4D",letterSpacing:0.3}}>в статусе</div>
        </div>
      </div>
      <div style={{fontSize:16,fontWeight:700,color:"#F0E8DD",marginBottom:8,paddingLeft:(isCrit||isImp)?6:0}}>{client?.name||"—"}</div>
      <div style={{paddingLeft:(isCrit||isImp)?6:0}}>
        {order.items.map((it,i)=>{
          const p=products.find(x=>x.id===it.productId);
          return <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:13,color:"#A89882",padding:"3px 0",borderTop:i>0?"1px solid rgba(255,255,255,0.04)":"none"}}><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8}}>{p?.name||"?"}</span><span style={{fontWeight:700,color:"#F0E8DD",flexShrink:0}}>{it.qty} {p?.unit||""}</span></div>;
        })}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.05)",paddingLeft:(isCrit||isImp)?6:0}}>
        <div style={{fontSize:11,color:"#6B5D4D"}}>{order.orderDate?new Date(order.orderDate).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})+" / "+new Date(order.orderDate).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit"}):"—"}</div>
        <div style={{fontSize:14,fontWeight:700,color:"#C8963E"}}>{(order.total||0).toLocaleString("ru")} ₽</div>
      </div>
      {order.note&&<div style={{marginTop:6,fontSize:11,color:"#A89882",fontStyle:"italic",background:"rgba(255,255,255,0.03)",borderRadius:5,padding:"4px 8px"}}>{order.note}</div>}
    </div>
  );
};

const BoardColumns=({orders,products,clients,now})=>(
  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,height:"100%",overflow:"hidden"}}>
    {BOARD_COLUMNS.map(col=>{
      const colOrders=[...orders].filter(o=>o.status===col.id).sort((a,b)=>{
        const pa=a.priority==="срочный"?0:a.priority==="важный"?1:2;
        const pb=b.priority==="срочный"?0:b.priority==="важный"?1:2;
        if(pa!==pb) return pa-pb;
        return new Date(a.orderDate)-new Date(b.orderDate);
      });
      const cc=BOARD_COL_COLORS[col.id]||{bg:"rgba(30,25,18,0.9)",border:"rgba(255,255,255,0.1)",dot:"#A89882",title:"#A89882"};
      const totalVal=colOrders.reduce((s,o)=>s+(o.total||0),0);
      const hasDelayed=colOrders.some(o=>(now-new Date(o.statusChangedAt||o.orderDate).getTime())>90*60000);
      return (
        <div key={col.id} style={{background:cc.bg,borderRadius:12,border:`1px solid ${cc.border}`,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
          <div style={{padding:"12px 14px",borderBottom:`1px solid ${cc.border}`,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:cc.dot,boxShadow:`0 0 8px ${cc.dot}90`}}/>
                <span style={{fontSize:13,fontWeight:700,color:"#fff",letterSpacing:0.4}}>{col.label.toUpperCase()}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                {hasDelayed&&<span style={{fontSize:13,color:"#E85050"}} title="Есть задержанные">⚠</span>}
                <span style={{fontSize:26,fontWeight:800,color:cc.dot,lineHeight:1}}>{colOrders.length}</span>
              </div>
            </div>
            {colOrders.length>0&&<div style={{fontSize:11,color:cc.title,marginTop:3}}>{totalVal.toLocaleString("ru")} ₽</div>}
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"8px"}}>
            {colOrders.length===0
              ?<div style={{textAlign:"center",color:"rgba(255,255,255,0.15)",fontSize:12,paddingTop:24}}>нет заказов</div>
              :colOrders.map(o=><BoardOrderCard key={o.id} order={o} clients={clients} products={products} now={now}/>)
            }
          </div>
        </div>
      );
    })}
  </div>
);

const OrdersBoardStandalone=()=>{
  const [orders,setOrders]=useState([]);
  const [products,setProducts]=useState(INIT_PRODUCTS);
  const [now,setNow]=useState(Date.now());
  const [lastSync,setLastSync]=useState(null);
  const [syncing,setSyncing]=useState(false);

  useEffect(()=>{
    const poll=async()=>{
      setSyncing(true);
      try{
        const [o,p]=await Promise.all([
          fetch("/api/state/dk_client_orders").then(r=>r.ok?r.json():null),
          fetch("/api/state/dk_products").then(r=>r.ok?r.json():null),
        ]);
        if(Array.isArray(o)) setOrders(o);
        if(Array.isArray(p)) setProducts(p);
        setLastSync(Date.now());
      }catch(e){}
      setSyncing(false);
    };
    poll();
    const id=setInterval(poll,6000);
    return()=>clearInterval(id);
  },[]);

  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);

  const activeOrders=orders.filter(o=>!["отгружен","отменён"].includes(o.status));
  const urgentCount=activeOrders.filter(o=>o.priority==="срочный").length;
  const timeStr=new Date(now).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const dateStr=new Date(now).toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"});

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:"#0F0C09",overflow:"hidden",color:"#F0E8DD"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Noto Sans',sans-serif;background:#0F0C09;overflow:hidden}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
        @keyframes pulseBorder{0%,100%{box-shadow:0 0 0 1px rgba(232,80,80,0.3)}50%{box-shadow:0 0 0 3px rgba(232,80,80,0.6)}}
        @keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:0.3}}
        option{background:#1A1510;color:#F0E8DD}
      `}</style>
      <div style={{padding:"8px 20px",borderBottom:"1px solid rgba(255,255,255,0.05)",background:"rgba(0,0,0,0.4)",flexShrink:0,display:"flex",alignItems:"center",gap:20}}>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:180}}>
          <div style={{width:34,height:34,borderRadius:9,background:"rgba(200,150,62,0.15)",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(200,150,62,0.3)",fontSize:20,color:"#C8963E"}}>⬡</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:"#F0E8DD",letterSpacing:1}}>ПАНЕЛЬ ЗАКАЗОВ</div>
            <div style={{fontSize:9,color:"#6B5D4D",letterSpacing:0.5}}>DIKANISH · ПРОИЗВОДСТВО</div>
          </div>
        </div>
        <div style={{flex:1,textAlign:"center"}}>
          <div style={{fontSize:36,fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums",letterSpacing:3,lineHeight:1}}>{timeStr}</div>
          <div style={{fontSize:11,color:"#A89882",textTransform:"capitalize",marginTop:2}}>{dateStr}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:180,justifyContent:"flex-end"}}>
          {urgentCount>0&&(
            <div style={{background:"rgba(232,80,80,0.12)",border:"1px solid rgba(232,80,80,0.3)",borderRadius:8,padding:"6px 14px",textAlign:"center",animation:"pulseBorder 2s infinite"}}>
              <div style={{fontSize:24,fontWeight:800,color:"#E85050",lineHeight:1}}>{urgentCount}</div>
              <div style={{fontSize:9,color:"#E85050",letterSpacing:0.5}}>СРОЧНЫХ</div>
            </div>
          )}
          <div style={{background:"rgba(200,150,62,0.08)",border:"1px solid rgba(200,150,62,0.2)",borderRadius:8,padding:"6px 14px",textAlign:"center"}}>
            <div style={{fontSize:24,fontWeight:800,color:"#C8963E",lineHeight:1}}>{activeOrders.length}</div>
            <div style={{fontSize:9,color:"#A89882",letterSpacing:0.5}}>АКТИВНЫХ</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:syncing?"#E8A838":"#52C97A",animation:syncing?"pulseGlow 1s infinite":"none"}}/>
              <span style={{fontSize:9,color:"#6B5D4D"}}>{syncing?"синхр...":lastSync?"синхр.":""}</span>
            </div>
            <button onClick={()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:5,color:"#6B5D4D",cursor:"pointer",fontSize:10,padding:"3px 9px",fontFamily:"inherit"}}>⛶ полный экран</button>
            <a href="/" style={{fontSize:9,color:"rgba(255,255,255,0.2)",textDecoration:"none"}}>← система</a>
          </div>
        </div>
      </div>
      <div style={{flex:1,padding:14,minHeight:0,overflow:"hidden"}}>
        <BoardColumns orders={orders} products={products} clients={INIT_CLIENTS} now={now}/>
      </div>
      <div style={{padding:"3px 20px",borderTop:"1px solid rgba(255,255,255,0.03)",flexShrink:0,display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.1)"}}>Синхронизация через backend API (каждые 6с). Разные устройства — через сервер. Вкладки одного браузера — мгновенно.</span>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.1)"}}>🟢 &lt;30мин · 🟡 30–90мин · ⚠ &gt;90мин</span>
      </div>
    </div>
  );
};

const OrdersBoardPage=()=>{
  const {clientOrders,products,clients}=useContext(AppContext);
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(id);},[]);
  const openBoard=()=>window.open(window.location.href.split("?")[0]+"?board=1","_blank");
  const activeOrders=clientOrders.filter(o=>!["отгружен","отменён"].includes(o.status));
  const urgentCount=activeOrders.filter(o=>o.priority==="срочный").length;
  return (
    <div>
      <PageH title="Доска заказов">
        <Btn onClick={openBoard} icon={<I.eye size={15}/>}>Открыть полный экран</Btn>
      </PageH>
      <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <Stat icon={<I.tasks size={18}/>} label="Активных заказов" value={activeOrders.length} color={C.primary}/>
        {urgentCount>0&&<Stat icon={<I.alert size={18}/>} label="Срочных" value={urgentCount} color={C.danger}/>}
        <Stat icon={<I.check size={18}/>} label="Готово к отгрузке" value={clientOrders.filter(o=>o.status==="готов").length} color={C.success}/>
      </div>
      <div style={{height:"calc(100vh - 260px)",minHeight:420,overflow:"hidden"}}>
        <BoardColumns orders={clientOrders} products={products} clients={clients} now={now}/>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App(){
  const [currentUser,setCurrentUser]=useState(null);
  const [users,setUsers]=useState(INIT_USERS);
  const [products,setProducts]=usePersisted("dk_products",INIT_PRODUCTS);
  const [tasks,setTasks]=useState(INIT_TASKS);
  const [rawMaterials,setRawMaterials]=useState(INIT_RAW_MATERIALS);
  const [recipes,setRecipes]=useState(INIT_RECIPES);
  const [taskEmployees,setTaskEmployees]=usePersisted("dk_task_emps",INIT_TASK_EMPLOYEES);
  const [employeeHistory,setEmployeeHistory]=usePersisted("dk_emp_hist",INIT_EMPLOYEE_HISTORY);
  const [productionPlans,setProductionPlans]=usePersisted("dk_prod_plans",INIT_PRODUCTION_PLANS);
  const [clients,setClients]=useState(INIT_CLIENTS);
  const [clientOrders,setClientOrders]=usePersisted("dk_client_orders",INIT_CLIENT_ORDERS);
  const [sales,setSales]=useState(INIT_SALES);
  const [inventoryMovements,setInventoryMovements]=usePersisted("dk_inv_move",INIT_INVENTORY_MOVEMENTS);
  const [productionOutputs,setProductionOutputs]=usePersisted("dk_prod_outputs",INIT_PRODUCTION_OUTPUTS);
  const [bonusRules,setBonusRules]=usePersisted("dk_bonus_rules",INIT_BONUS_RULES);
  const [baseSalaries,setBaseSalaries]=usePersisted("dk_base_salaries",INIT_BASE_SALARIES);
  const [debts,setDebts]=usePersisted("dk_debts",INIT_DEBTS);
  const [cameras,setCameras]=useLocalStorage("dk_cameras",INIT_CAMERAS);
  const [suppliers,setSuppliers]=useState(INIT_SUPPLIERS);
  const [deliveries,setDeliveries]=useState(INIT_DELIVERIES);
  const [rawMovements,setRawMovements]=useState(INIT_RAW_MOVEMENTS);
  const [notifications,setNotifications]=useState(INIT_NOTIFICATIONS);
  const [marks,setMarks]=useState(INIT_MARKS);
  const [logs,setLogs]=useState([
    {id:1,userId:1,userName:"Иванов И.И.",message:"Система запущена",date:"2024-06-01T08:00:00"},
  ]);
  const [page,setPage]=useState("dashboard");
  const [sideOpen,setSideOpen]=useState(false);
  const [openGroups,setOpenGroups]=useState(()=>new Set(["main"]));
  const [hiddenWarnings,setHiddenWarnings]=useState(new Set());
  const [isMobile,setIsMobile]=useState(()=>typeof window!=="undefined"&&window.innerWidth<=768);
  const [serverOnline,setServerOnline]=useState(true);
  useEffect(()=>{
    const check=()=>{fetch("/api/ping",{cache:"no-store"}).then(()=>setServerOnline(true)).catch(()=>setServerOnline(false))};
    check();const t=setInterval(check,15000);return()=>clearInterval(t);
  },[]);
  useEffect(()=>{
    const h=()=>setIsMobile(window.innerWidth<=768);
    window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);
  },[]);

  const addLog=useCallback(msg=>{
    if(!currentUser) return;
    setLogs(p=>[...p,{id:Date.now(),userId:currentUser.id,userName:currentUser.name.split(" ").map((n,i)=>i===0?n:n[0]+".").join(" "),message:msg,date:new Date().toISOString()}]);
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

  const handleLogin=u=>{setCurrentUser(u);setPage("dashboard");setTimeout(()=>{setLogs(p=>[...p,{id:Date.now(),userId:u.id,userName:u.name.split(" ").map((n,i)=>i===0?n:n[0]+".").join(" "),message:"Вход в систему",date:new Date().toISOString()}])},100)};
  const handleLogout=()=>{if(currentUser)addLog("Выход");setCurrentUser(null);setPage("dashboard")};

  const production = tasks.filter(t=>t.status==="завершено").map(t=>({id:t.id,productId:t.productId,userIds:t.userIds||[],quantity:t.quantity,date:t.completedAt,note:t.note}));

  const ctx=useMemo(()=>({
    users,setUsers,products,setProducts,tasks,setTasks,rawMaterials,setRawMaterials,recipes,setRecipes,
    taskEmployees,setTaskEmployees,employeeHistory,setEmployeeHistory,
    productionPlans,setProductionPlans,
    clients,setClients,clientOrders,setClientOrders,
    sales,setSales,inventoryMovements,setInventoryMovements,
    suppliers,setSuppliers,deliveries,setDeliveries,rawMovements,setRawMovements,
    notifications,setNotifications,marks,setMarks,
    logs,setLogs,addLog,addNotification,currentUser,production,
    setPage,hiddenWarnings,setHiddenWarnings,
    productionOutputs,setProductionOutputs,
    bonusRules,setBonusRules,baseSalaries,setBaseSalaries,
    debts,setDebts,
    cameras,setCameras,
  }),[users,products,tasks,rawMaterials,recipes,taskEmployees,employeeHistory,productionPlans,clients,clientOrders,sales,inventoryMovements,suppliers,deliveries,rawMovements,notifications,marks,logs,addLog,addNotification,currentUser,production,page,hiddenWarnings,productionOutputs,bonusRules,baseSalaries,debts,cameras]);

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

  if(!currentUser) return(
    <AppContext.Provider value={ctx}><style>{globalStyles}</style><LoginPage onLogin={handleLogin}/></AppContext.Provider>
  );

  const role=ROLES.find(r=>r.id===currentUser.roleId);
  const isAdmin=role?.name==="admin";
  const isManager=role?.name==="manager";
  const isWorker=role?.name==="worker";
  const isOwner=role?.name==="owner";

  // ── Grouped Navigation ──
  const navGroups = [
    { id:"main", label:"Главная", icon:I.home, items:[
      {id:"dashboard",label:"Главная",ok:true},
    ]},
    { id:"production", label:"Производство", icon:I.factory, items:[
      {id:"tasks",label:"Задания",ok:true},
      {id:"products",label:"Товары",ok:true},
      {id:"prodOutput",label:"Выпуск",ok:true},
      {id:"planning",label:"Планирование",ok:isAdmin||isManager},
    ]},
    { id:"warehouse", label:"Склад", icon:I.warehouse, items:[
      {id:"raw",label:"Сырьё",ok:isAdmin||isManager},
      {id:"deliveries",label:"Поставки",ok:isAdmin||isManager},
      {id:"procurement",label:"Закупки",ok:isAdmin||isManager},
    ]},
    { id:"sales", label:"Торговля", icon:I.truck, items:[
      {id:"clients",label:"Клиенты",ok:isAdmin||isManager},
      {id:"sales",label:"Продажи",ok:isAdmin||isManager},
      {id:"inventory",label:"Движение",ok:isAdmin||isManager},
      {id:"ordersBoard",label:"Доска заказов",ok:isAdmin||isManager},
    ]},
    { id:"staff", label:"Персонал", icon:I.people, items:[
      {id:"empstats",label:"KPI",ok:isAdmin||isManager},
      {id:"salary",label:"Премии",ok:isAdmin||isManager},
      {id:"workerHistory",label:"История",ok:true},
      {id:"marks",label:"Отметки",ok:true},
      {id:"users",label:"Пользователи",ok:isAdmin},
    ]},
    { id:"analytics", label:"Аналитика", icon:I.analytics, items:[
      {id:"reports",label:"Отчёты",ok:isAdmin||isManager},
      {id:"profitAnalytics",label:"Прибыль",ok:isAdmin||isManager},
      {id:"logs",label:"Журнал",ok:isAdmin},
    ]},
    { id:"system", label:"Система", icon:I.gear, items:[
      {id:"notifications",label:"Уведомления",ok:true},
      {id:"debts",label:isOwner?"Долги сотрудников":"Мои долги",ok:true},
      {id:"cameras",label:"Камеры",ok:true},
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
      case "planning":return(isAdmin||isManager)?<ProductionPlanPage/>:<DashboardPage/>;
      case "raw":return(isAdmin||isManager)?<RawMaterialsPage/>:<DashboardPage/>;
      case "deliveries":return(isAdmin||isManager)?<DeliveriesPage/>:<DashboardPage/>;
      case "procurement":return(isAdmin||isManager)?<ProcurementPage/>:<DashboardPage/>;
      case "clients":return(isAdmin||isManager)?<ClientsPage/>:<DashboardPage/>;
      case "sales":return(isAdmin||isManager)?<SalesPage/>:<DashboardPage/>;
      case "inventory":return(isAdmin||isManager)?<InventoryJournalPage/>:<DashboardPage/>;
      case "ordersBoard":return(isAdmin||isManager)?<OrdersBoardPage/>:<DashboardPage/>;
      case "empstats":return(isAdmin||isManager)?<EmployeeStatsPage/>:<DashboardPage/>;
      case "salary":return(isAdmin||isManager)?<SalaryStatsPage/>:<DashboardPage/>;
      case "workerHistory":return <WorkerHistoryPage/>;
      case "notifications":return <NotificationsPage/>;
      case "debts":return <DebtsPage/>;
      case "marks":return <MarksPage/>;
      case "reports":return(isAdmin||isManager)?<ReportsPage/>:<DashboardPage/>;
      case "profitAnalytics":return(isAdmin||isManager)?<ProfitAnalyticsPage/>:<DashboardPage/>;
      case "users":return isAdmin?<UsersPage/>:<DashboardPage/>;
      case "logs":return isAdmin?<LogsPage/>:<DashboardPage/>;
      case "cameras":return <CameraPage/>;
      default:return <DashboardPage/>;
    }
  };

  return(
    <AppContext.Provider value={ctx}>
      <style>{globalStyles}</style>

      {sideOpen&&<div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:998}}/>}
      {!serverOnline&&<div style={{position:"fixed",top:0,left:0,right:0,zIndex:1001,background:C.danger,color:"#fff",padding:"5px 16px",fontSize:12,fontWeight:600,textAlign:"center",letterSpacing:.3}}>Нет соединения с сервером — изменения не сохраняются</div>}

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
          {(isAdmin||isManager)&&(()=>{
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
          <Badge color={isAdmin?"danger":isManager?"info":"primary"}>{role?.label}</Badge>
        </header>
        <main style={{padding:20,maxWidth:1200}}>{renderPage()}</main>
      </div>
    </AppContext.Provider>
  );
}
