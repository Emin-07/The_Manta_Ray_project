import express from "express";
import Database from "better-sqlite3";
import session from "express-session";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { pbkdf2Sync, randomBytes } from "crypto";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// ── Database ──
const dataDir = join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(join(dataDir, "dikanish.sqlite"));
db.exec(`
  CREATE TABLE IF NOT EXISTS state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS state_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  );
`);

// ── Password helpers ──
// New format: "pbkdf2:<salt>:<hash>"
// Legacy format (btoa): anything that doesn't start with "pbkdf2:"
const LEGACY_PREFIX = "_hashed_salt_2024";

function hashPassword(plain) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(plain, salt, 100000, 32, "sha256").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

function verifyPassword(plain, stored) {
  if (stored.startsWith("pbkdf2:")) {
    const [, salt, hash] = stored.split(":");
    const attempt = pbkdf2Sync(plain, salt, 100000, 32, "sha256").toString("hex");
    // Constant-time compare
    const a = Buffer.from(attempt, "hex");
    const b = Buffer.from(hash, "hex");
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }
  // Legacy: btoa(plain + "_hashed_salt_2024")
  const legacy = Buffer.from(plain + LEGACY_PREFIX).toString("base64");
  return legacy === stored;
}

// ── Access control map ──
// "public"  — accessible without login (board mode only, GET only)
// "all"     — any authenticated user
// "manager" — manager, admin, owner
// "admin"   — admin, owner only
// Note: dk_client_orders and dk_products used to be "public" for board mode,
// but generic /api/state/:key returns the full JSON blob — which leaked
// financial fields (costPrice, sellPrice), tech cards, internal notes, etc.
// Board mode now reads via dedicated /api/board/* endpoints that return
// sanitized DTOs. Public read is no longer allowed on these keys.
// Worker writes are routed through /api/actions/* (task-complete, task-start,
// output-record, attendance-mark, notifications/read, log). Those helpers call
// writeState() directly, which bypasses KEY_ACCESS — so tightening the write
// levels below does NOT break worker flows, only generic /api/state writes.
const KEY_ACCESS = {
  dk_client_orders:   { read: "manager", write: "manager" },
  dk_products:        { read: "all",     write: "manager" },
  dk_tasks:           { read: "all",    write: "manager" },
  dk_task_emps:       { read: "all",    write: "manager" },
  dk_marks:           { read: "all",    write: "manager" },
  dk_notifications:   { read: "all",    write: "manager" },
  dk_prod_outputs:    { read: "all",    write: "manager" },
  dk_batches:         { read: "all",    write: "manager" },
  dk_emp_hist:        { read: "all",    write: "manager" },
  dk_prod_plans:      { read: "manager",write: "manager" },
  dk_defects:         { read: "manager",write: "manager" },
  dk_raw_mats:        { read: "manager",write: "manager" },
  dk_raw_movements:   { read: "manager",write: "manager" },
  dk_recipes:         { read: "manager",write: "manager" },
  dk_deliveries:      { read: "manager",write: "manager" },
  dk_suppliers:       { read: "manager",write: "manager" },
  dk_clients:         { read: "manager",write: "manager" },
  dk_sales:           { read: "manager",write: "manager" },
  dk_inv_move:        { read: "manager",write: "manager" },
  dk_debts:           { read: "manager",write: "manager" },
  dk_payroll:         { read: "manager",write: "manager" },
  dk_base_salaries:   { read: "admin",  write: "admin"   },
  dk_users:           { read: "all",    write: "admin"   },
  dk_logs:            { read: "admin",  write: "admin"   },
  dk_bonus_rules:     { read: "manager",write: "admin"   },
  dk_cameras:         { read: "manager",write: "manager" },
};

// Role hierarchy: which level satisfies which requirement
function roleLevel(roleId) {
  // 1=admin, 2=manager, 3=worker, 4=owner
  if (roleId === 1 || roleId === 4) return "admin";
  if (roleId === 2) return "manager";
  return "worker"; // roleId === 3
}

function satisfies(userRoleId, required) {
  if (required === "public") return true;
  if (!userRoleId) return false;
  const level = roleLevel(userRoleId);
  if (required === "all") return true;
  if (required === "manager") return level === "manager" || level === "admin";
  if (required === "admin") return level === "admin";
  return false;
}

// ── App ──
const app = express();
app.use(express.json({ limit: "10mb" }));

const SESSION_SECRET = process.env.SESSION_SECRET || "dikanish-factory-secret-2024";
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 12 * 60 * 60 * 1000, // 12 hours
    // secure: true  // enable when HTTPS is configured
  },
}));

// Serve built React app
const distDir = join(__dirname, "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// ── Board mode: check via query param ──
// Board requests carry ?board=1 — server grants them read-only access to orders only.
function isBoardRequest(req) {
  return req.query.board === "1";
}

// ── Auth middleware ──
function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  res.status(401).json({ error: "Не авторизован" });
}

function checkKeyAccess(req, res, next) {
  const key = req.params.key;
  const access = KEY_ACCESS[key];

  // Unknown key: only admin can access
  const required = access
    ? (req.method === "GET" ? access.read : access.write)
    : "admin";

  // Board mode: only GET on dk_client_orders (public)
  if (isBoardRequest(req)) {
    if (req.method === "GET" && required === "public") return next();
    return res.status(403).json({ error: "Доступ запрещён" });
  }

  // Normal authenticated access
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Не авторизован" });
  }

  if (!satisfies(req.session.roleId, required)) {
    return res.status(403).json({ error: "Недостаточно прав" });
  }

  // Extra: dk_users GET — strip password field before sending
  req._stripPasswords = (key === "dk_users" && req.method === "GET" && roleLevel(req.session.roleId) !== "admin");

  next();
}

// ── AUTH ENDPOINTS ──

// POST /api/auth/login
app.post("/api/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Укажите email и пароль" });

    const row = db.prepare("SELECT value FROM state WHERE key = 'dk_users'").get();
    if (!row) return res.status(401).json({ error: "Пользователи не найдены" });

    const users = JSON.parse(row.value);
    const user = users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: "Неверный email или пароль" });
    if (user.status === "blocked") return res.status(403).json({ error: "Аккаунт заблокирован" });
    if (!verifyPassword(password, user.password)) return res.status(401).json({ error: "Неверный email или пароль" });

    // Lazy migration: if legacy password, upgrade to pbkdf2 on successful login
    if (!user.password.startsWith("pbkdf2:")) {
      const newHash = hashPassword(password);
      const updated = users.map(u => u.id === user.id ? { ...u, password: newHash } : u);
      db.prepare("UPDATE state SET value = ?, updated_at = unixepoch() WHERE key = 'dk_users'").run(JSON.stringify(updated));
    }

    // Store only what's needed in session — never the password
    req.session.userId = user.id;
    req.session.roleId = user.roleId;

    // Return safe user object (no password)
    const { password: _pw, ...safeUser } = user;
    res.json(safeUser);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me — returns current user from session (no password)
app.get("/api/auth/me", (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: "Не авторизован" });
  try {
    const row = db.prepare("SELECT value FROM state WHERE key = 'dk_users'").get();
    if (!row) return res.status(404).json({ error: "Данные не найдены" });
    const users = JSON.parse(row.value);
    const user = users.find(u => u.id === req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: "Пользователь не найден" });
    }
    if (user.status === "blocked") {
      req.session.destroy(() => {});
      return res.status(403).json({ error: "Аккаунт заблокирован" });
    }
    // Sync role from DB in case it was changed by admin
    if (user.roleId !== req.session.roleId) {
      req.session.roleId = user.roleId;
    }
    const { password: _pw, ...safeUser } = user;
    res.json(safeUser);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/change-password — admin only
app.post("/api/auth/change-password", requireAuth, (req, res) => {
  if (roleLevel(req.session.roleId) !== "admin") {
    return res.status(403).json({ error: "Только для администратора" });
  }
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: "Укажите userId и пароль (мин. 4 символа)" });
    }
    const row = db.prepare("SELECT value FROM state WHERE key = 'dk_users'").get();
    if (!row) return res.status(404).json({ error: "Пользователи не найдены" });
    const users = JSON.parse(row.value);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return res.status(404).json({ error: "Пользователь не найден" });
    users[idx].password = hashPassword(newPassword);
    db.prepare("UPDATE state SET value = ?, updated_at = unixepoch() WHERE key = 'dk_users'").run(JSON.stringify(users));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── DB helpers ──
function readState(key) {
  const row = db.prepare("SELECT value FROM state WHERE key = ?").get(key);
  return row ? JSON.parse(row.value) : null;
}
function writeState(key, value) {
  db.prepare(`
    INSERT INTO state (key, value, updated_at) VALUES (?, ?, unixepoch())
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()
  `).run(key, JSON.stringify(value));
  db.prepare("INSERT INTO state_log (key) VALUES (?)").run(key);
}

// ── Server-side applyOutput (mirrors frontend applyOutput logic) ──
// Mutates state object in-place and returns it.
function serverApplyOutput(state, out) {
  const { productId, employeeId, quantity, date, id } = out;
  const ds = date.slice(0, 10);

  // 1. Update product stock
  state.dk_products = (state.dk_products || []).map(p =>
    p.id === productId ? { ...p, stock: p.stock + quantity, updatedAt: new Date().toISOString() } : p
  );
  const newBalance = (state.dk_products.find(p => p.id === productId)?.stock) || 0;

  // 2. Inventory movement
  state.dk_inv_move = [...(state.dk_inv_move || []), {
    id: id + 0.1, productId, type: "output", quantity, balance: newBalance,
    refId: `output-${id}`, createdAt: date,
  }];

  // 3. Raw material deduction
  const recipe = (state.dk_recipes || []).find(r => r.productId === productId);
  if (recipe?.items?.length) {
    state.dk_raw_mats = (state.dk_raw_mats || []).map(rm => {
      const item = recipe.items.find(i => i.rawId === rm.id);
      if (!item) return rm;
      return { ...rm, stock: Math.max(0, +(rm.stock - item.qty * quantity).toFixed(4)), updatedAt: new Date().toISOString() };
    });
    state.dk_raw_movements = [...(state.dk_raw_movements || []), ...recipe.items.map(item => ({
      id: Date.now() + Math.random(), rawId: item.rawId, type: "расход",
      quantity: +(item.qty * quantity).toFixed(4),
      refId: `output-${id}`, note: `Выпуск: ${quantity} ед. #${productId}`, createdAt: date,
    }))];
  }

  // 4. Employee history (upsert by employeeId+date)
  const empHist = state.dk_emp_hist || [];
  const ex = empHist.find(h => h.employeeId === employeeId && h.date === ds);
  state.dk_emp_hist = ex
    ? empHist.map(h => h.id === ex.id ? { ...h, producedQty: h.producedQty + quantity } : h)
    : [...empHist, { id: Date.now() + Math.random(), employeeId, date: ds, attendance: "present", tasksCompleted: 0, producedQty: quantity, comment: "" }];

  // 5. Production plans progress
  state.dk_prod_plans = (state.dk_prod_plans || []).map(pl => {
    if (pl.productId === productId && pl.productionDate === ds && pl.status !== "отменён") {
      const nc = Math.min(pl.plannedQty, pl.completedQty + quantity);
      return { ...pl, completedQty: nc, status: nc >= pl.plannedQty ? "выполнен" : "в процессе" };
    }
    return pl;
  });

  return state;
}

// ── ACTION ENDPOINTS ──
// These allow workers to trigger complex multi-key updates atomically on the server,
// bypassing the per-key write restrictions that exist in /api/state/:key.

// POST /api/actions/task-complete
// Any authenticated user assigned to the task can complete it.
// Workers: must be in task.userIds. Manager/admin: any task.
app.post("/api/actions/task-complete", requireAuth, (req, res) => {
  const { taskId, quantities } = req.body;
  // quantities: { [userId: string]: number }
  if (!taskId || !quantities || typeof quantities !== "object") {
    return res.status(400).json({ error: "Укажите taskId и quantities" });
  }

  try {
    const result = db.transaction(() => {
      const tasks = readState("dk_tasks") || [];
      const taskEmps = readState("dk_task_emps") || [];
      const prodOutputs = readState("dk_prod_outputs") || [];
      const batches = readState("dk_batches") || [];

      // Validate task
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw { status: 404, message: "Задание не найдено" };
      if (task.status === "завершено" || task.status === "просрочено") {
        throw { status: 409, message: "Задание уже завершено" };
      }
      if (prodOutputs.some(o => o.taskId === taskId)) {
        throw { status: 409, message: "Выпуск для этого задания уже создан" };
      }

      // Worker authorization: must be assigned to this task
      const isWorkerRole = roleLevel(req.session.roleId) === "worker";
      if (isWorkerRole && !(task.userIds || []).includes(req.session.userId)) {
        throw { status: 403, message: "Вы не назначены на это задание" };
      }

      // Validate quantities: all UIDs must be on the task, sum must match
      const qEntries = Object.entries(quantities)
        .map(([uid, qty]) => [+uid, +qty])
        .filter(([, qty]) => qty > 0);
      const totalQty = qEntries.reduce((s, [, q]) => s + q, 0);
      if (Math.abs(totalQty - task.quantity) > 0.001) {
        throw { status: 400, message: `Сумма ${totalQty} должна равняться ${task.quantity}` };
      }
      for (const [uid] of qEntries) {
        if (!(task.userIds || []).includes(uid)) {
          throw { status: 400, message: `Пользователь ${uid} не назначен на задание` };
        }
      }

      const now = new Date().toISOString();
      const isLate = new Date(now) > new Date(task.deadline);
      const newStatus = isLate ? "просрочено" : "завершено";

      // Update task and taskEmployee statuses
      const updatedTasks = tasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus, completedAt: now } : t
      );
      const updatedTaskEmps = taskEmps.map(te => {
        if (te.taskId !== taskId) return te;
        const qty = quantities[String(te.employeeId)];
        return { ...te, producedQty: qty != null ? +qty : te.producedQty, status: newStatus };
      });

      // Create one batch for the whole task
      const sharedBatchId = taskId + 0.5;
      const expiresAt = new Date(new Date(now).getTime() + 7 * 24 * 3600 * 1000).toISOString();
      const newBatch = {
        id: sharedBatchId, productId: task.productId, quantity: task.quantity,
        producedAt: now, expiresAt, createdBy: req.session.userId,
        status: "активна", note: task.note || "", taskId,
      };

      // Create one productionOutput per worker + apply derived state
      const newOutputs = [];
      let firstWorker = true;
      let state = {
        dk_products:       readState("dk_products")       || [],
        dk_inv_move:       readState("dk_inv_move")       || [],
        dk_raw_mats:       readState("dk_raw_mats")       || [],
        dk_raw_movements:  readState("dk_raw_movements")  || [],
        dk_emp_hist:       readState("dk_emp_hist")       || [],
        dk_prod_plans:     readState("dk_prod_plans")     || [],
        dk_recipes:        readState("dk_recipes")        || [],
      };

      for (const [uid, qty] of qEntries) {
        const outId = Date.now() + Math.random();
        const out = {
          id: outId, productId: task.productId, employeeId: uid, quantity: qty,
          date: now, taskId, source: "task",
          batchId: firstWorker ? sharedBatchId : null,
          comment: task.note || "", createdAt: now, createdBy: req.session.userId,
        };
        newOutputs.push(out);
        state = serverApplyOutput(state, out);
        firstWorker = false;
      }

      // Notifications and log
      const users = readState("dk_users") || [];
      const product = state.dk_products.find(p => p.id === task.productId) || {};
      const actor = users.find(u => u.id === req.session.userId);
      const actorName = actor?.name?.split(" ").slice(0, 2).join(" ") || "Работник";
      const workerNames = qEntries.map(([uid]) =>
        users.find(u => u.id === uid)?.name?.split(" ").slice(0, 2).join(" ") || "?"
      ).join(", ");

      const notifications = readState("dk_notifications") || [];
      const logs = readState("dk_logs") || [];
      const newNotif = {
        id: Date.now() + Math.random(),
        title: `Задание ${isLate ? "просрочено" : "выполнено"}: ${product.name || ""}`,
        type: isLate ? "ошибка" : "информация",
        content: `${workerNames} ${isLate ? "просрочили" : "завершили"}: ${product.name || ""} x${task.quantity}`,
        createdBy: req.session.userId, createdAt: now,
        readBy: [req.session.userId], targetAll: true, targetUsers: [],
      };
      const newLog = {
        id: Date.now(), userId: req.session.userId, userName: actorName,
        message: `Завершено: ${product.name || ""} x${task.quantity}${isLate ? " (просрочено)" : ""}`,
        date: now,
      };

      const finalOutputs = [...prodOutputs, ...newOutputs];
      const finalBatches = [...batches, newBatch];
      const finalNotifs = [...notifications, newNotif];
      const finalLogs = [...logs, newLog];

      // Write all atomically
      writeState("dk_tasks",         updatedTasks);
      writeState("dk_task_emps",     updatedTaskEmps);
      writeState("dk_prod_outputs",  finalOutputs);
      writeState("dk_batches",       finalBatches);
      writeState("dk_products",      state.dk_products);
      writeState("dk_inv_move",      state.dk_inv_move);
      writeState("dk_raw_mats",      state.dk_raw_mats);
      writeState("dk_raw_movements", state.dk_raw_movements);
      writeState("dk_emp_hist",      state.dk_emp_hist);
      writeState("dk_prod_plans",    state.dk_prod_plans);
      writeState("dk_notifications", finalNotifs);
      writeState("dk_logs",          finalLogs);

      return {
        dk_tasks:         updatedTasks,
        dk_task_emps:     updatedTaskEmps,
        dk_prod_outputs:  finalOutputs,
        dk_batches:       finalBatches,
        dk_products:      state.dk_products,
        dk_raw_mats:      state.dk_raw_mats,
        dk_emp_hist:      state.dk_emp_hist,
        dk_prod_plans:    state.dk_prod_plans,
        dk_notifications: finalNotifs,
        dk_logs:          finalLogs,
      };
    })();

    res.json({ ok: true, state: result });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error("[task-complete]", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/actions/output-record
// Record a manual production output.
// Workers: can only record for themselves (employeeId enforced server-side).
app.post("/api/actions/output-record", requireAuth, (req, res) => {
  const { productId, employeeId, quantity, date, comment } = req.body;
  if (!productId || !employeeId || !quantity || +quantity <= 0) {
    return res.status(400).json({ error: "Укажите productId, employeeId, quantity > 0" });
  }

  // Worker can only record for themselves
  const isWorkerRole = roleLevel(req.session.roleId) === "worker";
  if (isWorkerRole && +employeeId !== req.session.userId) {
    return res.status(403).json({ error: "Вы можете записывать выпуск только за себя" });
  }

  try {
    const result = db.transaction(() => {
      const now = new Date().toISOString();
      const id = Date.now() + Math.random();
      const batchId = id + 0.5;
      const outDate = date ? new Date(date).toISOString() : now;
      const expiresAt = new Date(new Date(outDate).getTime() + 7 * 24 * 3600 * 1000).toISOString();

      const out = {
        id, productId: +productId, employeeId: +employeeId, quantity: +quantity,
        date: outDate, comment: comment || "", source: "manual",
        taskId: null, batchId, createdAt: now, createdBy: req.session.userId,
      };
      const newBatch = {
        id: batchId, productId: +productId, quantity: +quantity,
        producedAt: outDate, expiresAt, createdBy: req.session.userId,
        status: "активна", note: comment || "", taskId: null,
      };

      let state = {
        dk_products:       readState("dk_products")       || [],
        dk_inv_move:       readState("dk_inv_move")       || [],
        dk_raw_mats:       readState("dk_raw_mats")       || [],
        dk_raw_movements:  readState("dk_raw_movements")  || [],
        dk_emp_hist:       readState("dk_emp_hist")       || [],
        dk_prod_plans:     readState("dk_prod_plans")     || [],
        dk_recipes:        readState("dk_recipes")        || [],
      };
      state = serverApplyOutput(state, out);

      const prodOutputs = readState("dk_prod_outputs") || [];
      const batches     = readState("dk_batches")      || [];
      const users       = readState("dk_users")        || [];
      const notifications = readState("dk_notifications") || [];
      const logs        = readState("dk_logs")         || [];

      const product  = state.dk_products.find(p => p.id === +productId) || {};
      const actor    = users.find(u => u.id === req.session.userId);
      const actorName = actor?.name?.split(" ").slice(0, 2).join(" ") || "Работник";

      const newNotif = {
        id: Date.now() + Math.random(),
        title: `Выпуск: ${product.name || ""} x${quantity}`,
        type: "информация",
        content: `${actorName} зафиксировал выпуск ${product.name || ""} — ${quantity} ${product.unit || ""}`,
        createdBy: req.session.userId, createdAt: now,
        readBy: [req.session.userId], targetAll: true, targetUsers: [],
      };
      const newLog = {
        id: Date.now(), userId: req.session.userId, userName: actorName,
        message: `Выпуск: ${product.name || ""} x${quantity} → ${actorName}`, date: now,
      };

      const finalOutputs = [...prodOutputs, out];
      const finalBatches = [...batches, newBatch];
      const finalNotifs  = [...notifications, newNotif];
      const finalLogs    = [...logs, newLog];

      writeState("dk_prod_outputs",  finalOutputs);
      writeState("dk_batches",       finalBatches);
      writeState("dk_products",      state.dk_products);
      writeState("dk_inv_move",      state.dk_inv_move);
      writeState("dk_raw_mats",      state.dk_raw_mats);
      writeState("dk_raw_movements", state.dk_raw_movements);
      writeState("dk_emp_hist",      state.dk_emp_hist);
      writeState("dk_prod_plans",    state.dk_prod_plans);
      writeState("dk_notifications", finalNotifs);
      writeState("dk_logs",          finalLogs);

      return {
        dk_prod_outputs:  finalOutputs,
        dk_batches:       finalBatches,
        dk_products:      state.dk_products,
        dk_raw_mats:      state.dk_raw_mats,
        dk_emp_hist:      state.dk_emp_hist,
        dk_prod_plans:    state.dk_prod_plans,
        dk_notifications: finalNotifs,
        dk_logs:          finalLogs,
      };
    })();

    res.json({ ok: true, state: result });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error("[output-record]", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/actions/notifications/read
// Any authenticated user can mark a notification as read for themselves.
// This is the safe path for workers — they no longer need write access
// to dk_notifications to toggle their own readBy entry.
app.post("/api/actions/notifications/read", requireAuth, (req, res) => {
  const { notificationId } = req.body || {};
  if (notificationId == null) {
    return res.status(400).json({ error: "Укажите notificationId" });
  }
  try {
    const result = db.transaction(() => {
      const list = readState("dk_notifications") || [];
      const uid = req.session.userId;
      let changed = false;
      const updated = list.map(n => {
        if (n.id !== notificationId) return n;
        const readBy = Array.isArray(n.readBy) ? n.readBy : [];
        if (readBy.includes(uid)) return n;
        changed = true;
        return { ...n, readBy: [...readBy, uid] };
      });
      if (changed) writeState("dk_notifications", updated);
      return updated;
    })();
    res.json({ ok: true, dk_notifications: result });
  } catch (e) {
    console.error("[notifications/read]", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/actions/notifications/read-all
// Mark every notification targeting this user as read.
app.post("/api/actions/notifications/read-all", requireAuth, (req, res) => {
  try {
    const result = db.transaction(() => {
      const list = readState("dk_notifications") || [];
      const uid = req.session.userId;
      let changed = false;
      const updated = list.map(n => {
        const targets = n.targetAll || (Array.isArray(n.targetUsers) && n.targetUsers.includes(uid));
        if (!targets) return n;
        const readBy = Array.isArray(n.readBy) ? n.readBy : [];
        if (readBy.includes(uid)) return n;
        changed = true;
        return { ...n, readBy: [...readBy, uid] };
      });
      if (changed) writeState("dk_notifications", updated);
      return updated;
    })();
    res.json({ ok: true, dk_notifications: result });
  } catch (e) {
    console.error("[notifications/read-all]", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/actions/log
// Append-only audit log. Any authenticated user can write their own entry.
// The userId/userName are enforced server-side from the session — client
// cannot forge identity. Fire-and-forget from the client side.
app.post("/api/actions/log", requireAuth, (req, res) => {
  const { message } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Укажите message" });
  }
  try {
    db.transaction(() => {
      const logs = readState("dk_logs") || [];
      const users = readState("dk_users") || [];
      const actor = users.find(u => u.id === req.session.userId);
      const actorName = actor?.name?.split(" ").slice(0, 2).join(" ") || "Пользователь";
      const entry = {
        id: Date.now() + Math.random(),
        userId: req.session.userId,
        userName: actorName,
        message: message.slice(0, 500),
        date: new Date().toISOString(),
      };
      writeState("dk_logs", [...logs, entry]);
    })();
    res.json({ ok: true });
  } catch (e) {
    console.error("[actions/log]", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/actions/task-start
// Worker or manager starts a task. Worker must be assigned to the task.
// Updates task.status → "в работе" and sets startedAt.
app.post("/api/actions/task-start", requireAuth, (req, res) => {
  const { taskId } = req.body || {};
  if (taskId == null) return res.status(400).json({ error: "Укажите taskId" });
  try {
    const result = db.transaction(() => {
      const tasks = readState("dk_tasks") || [];
      const taskEmps = readState("dk_task_emps") || [];
      const task = tasks.find(t => t.id === taskId);
      if (!task) throw { status: 404, message: "Задание не найдено" };
      if (task.status === "завершено" || task.status === "просрочено") {
        throw { status: 409, message: "Задание уже закрыто" };
      }

      const isWorkerRole = roleLevel(req.session.roleId) === "worker";
      if (isWorkerRole && !(task.userIds || []).includes(req.session.userId)) {
        throw { status: 403, message: "Вы не назначены на это задание" };
      }

      const now = new Date().toISOString();
      const updatedTasks = tasks.map(t =>
        t.id === taskId
          ? { ...t, status: "в работе", startedAt: t.startedAt || now }
          : t
      );
      const updatedTaskEmps = taskEmps.map(te =>
        te.taskId === taskId && te.status !== "завершено"
          ? { ...te, status: "в работе", startedAt: te.startedAt || now }
          : te
      );

      const users = readState("dk_users") || [];
      const logs = readState("dk_logs") || [];
      const actor = users.find(u => u.id === req.session.userId);
      const actorName = actor?.name?.split(" ").slice(0, 2).join(" ") || "Работник";
      const products = readState("dk_products") || [];
      const product = products.find(p => p.id === task.productId) || {};
      const newLog = {
        id: Date.now() + Math.random(),
        userId: req.session.userId,
        userName: actorName,
        message: `Начато: ${product.name || ""} x${task.quantity}`,
        date: now,
      };

      writeState("dk_tasks", updatedTasks);
      writeState("dk_task_emps", updatedTaskEmps);
      writeState("dk_logs", [...logs, newLog]);

      return {
        dk_tasks: updatedTasks,
        dk_task_emps: updatedTaskEmps,
        dk_logs: [...logs, newLog],
      };
    })();
    res.json({ ok: true, state: result });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error("[task-start]", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/actions/attendance-mark
// Worker marks their own attendance. Manager/admin can mark anyone.
// Mirrors the existing dk_marks schema (append-only events with type/time).
const ATTENDANCE_TYPES = ["приход", "уход", "опоздание", "отсутствие"];
app.post("/api/actions/attendance-mark", requireAuth, (req, res) => {
  const { employeeId, type, time, reason, comment } = req.body || {};
  const eid = +employeeId;
  if (!eid || !type) {
    return res.status(400).json({ error: "Укажите employeeId и type" });
  }
  if (!ATTENDANCE_TYPES.includes(type)) {
    return res.status(400).json({ error: "Недопустимый тип отметки" });
  }
  const isWorkerRole = roleLevel(req.session.roleId) === "worker";
  if (isWorkerRole && eid !== req.session.userId) {
    return res.status(403).json({ error: "Вы можете отметить только себя" });
  }
  try {
    const result = db.transaction(() => {
      const marks = readState("dk_marks") || [];
      const now = new Date().toISOString();
      const when = time ? new Date(time).toISOString() : now;
      const entry = {
        id: Date.now() + Math.random(),
        employeeId: eid,
        type,
        time: when,
        reason: reason || "",
        comment: comment || "",
        createdBy: req.session.userId,
        createdAt: now,
      };
      const updated = [...marks, entry];

      const users = readState("dk_users") || [];
      const logs = readState("dk_logs") || [];
      const actor = users.find(u => u.id === req.session.userId);
      const actorName = actor?.name?.split(" ").slice(0, 2).join(" ") || "Работник";
      const target = users.find(u => u.id === eid);
      const targetName = target?.name?.split(" ")[0] || `#${eid}`;
      const newLog = {
        id: Date.now() + Math.random(),
        userId: req.session.userId,
        userName: actorName,
        message: `${type}: ${targetName}`,
        date: now,
      };

      writeState("dk_marks", updated);
      writeState("dk_logs", [...logs, newLog]);

      return { dk_marks: updated, dk_logs: [...logs, newLog] };
    })();
    res.json({ ok: true, state: result });
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    console.error("[attendance-mark]", e);
    res.status(500).json({ error: e.message });
  }
});

// ── BOARD ENDPOINTS (public, sanitized DTOs) ──
// These are the ONLY public read paths. Board mode (/?board=1) uses them
// instead of /api/state/:key?board=1 so we can whitelist fields and keep
// costPrice/sellPrice/techCard/history/address snapshots on the server.

function toBoardOrderDTO(o) {
  return {
    id: o.id,
    status: o.status,
    priority: o.priority,
    orderDate: o.orderDate,
    statusChangedAt: o.statusChangedAt,
    clientId: o.clientId,
    items: Array.isArray(o.items)
      ? o.items.map(it => ({ productId: it.productId, qty: it.qty }))
      : [],
    note: typeof o.note === "string" ? o.note.slice(0, 200) : "",
    total: typeof o.total === "number" ? o.total : 0,
  };
}

function toBoardProductDTO(p) {
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    unit: p.unit,
  };
}

app.get("/api/board/orders", (_req, res) => {
  try {
    const orders = readState("dk_client_orders") || [];
    const active = orders
      .filter(o => !["отгружен", "отменён"].includes(o.status))
      .map(toBoardOrderDTO);
    res.json(active);
  } catch (e) {
    res.status(500).json([]);
  }
});

app.get("/api/board/products", (_req, res) => {
  try {
    const products = readState("dk_products") || [];
    const visible = products
      .filter(p => !p.deleted)
      .map(toBoardProductDTO);
    res.json(visible);
  } catch (e) {
    res.status(500).json([]);
  }
});

// ── STATE ENDPOINTS (protected) ──

app.get("/api/state/:key", checkKeyAccess, (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM state WHERE key = ?").get(req.params.key);
    if (!row) return res.status(404).json(null);

    let data = JSON.parse(row.value);

    // Strip password from dk_users for non-admin readers
    if (req._stripPasswords && Array.isArray(data)) {
      data = data.map(u => { const { password: _p, ...rest } = u; return rest; });
    }

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/state/:key", checkKeyAccess, (req, res) => {
  try {
    const value = JSON.stringify(req.body);
    db.prepare(`
      INSERT INTO state (key, value, updated_at) VALUES (?, ?, unixepoch())
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()
    `).run(req.params.key, value);
    db.prepare("INSERT INTO state_log (key) VALUES (?)").run(req.params.key);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── UPDATES POLLING (requires auth or board mode) ──
app.get("/api/updates", (req, res) => {
  if (!req.session?.userId && !isBoardRequest(req)) {
    return res.status(401).json([]);
  }
  try {
    const sinceRaw = parseInt(req.query.since) || 0;
    const since = sinceRaw > 1e10 ? Math.floor(sinceRaw / 1000) : sinceRaw;
    const rows = db.prepare("SELECT key, MAX(updated_at) as ts FROM state WHERE updated_at > ? GROUP BY key").all(since);

    // Filter updates by what the current user can read
    const roleId = req.session?.roleId;
    const filtered = rows.filter(row => {
      const access = KEY_ACCESS[row.key];
      if (!access) return roleLevel(roleId) === "admin";
      const required = access.read;
      if (isBoardRequest(req)) return required === "public";
      return satisfies(roleId, required);
    });

    res.json(filtered);
  } catch (e) {
    res.status(500).json([]);
  }
});

// ── HEALTH ──
app.get("/api/ping", (_, res) => res.json({ ok: true, time: Date.now() }));

// ── SPA fallback ──
app.get("*", (_req, res) => {
  if (fs.existsSync(join(distDir, "index.html"))) {
    res.sendFile(join(distDir, "index.html"));
  } else {
    res.status(503).send("App not built yet. Run: npm run build");
  }
});

app.listen(PORT, () => {
  console.log(`Dikanish server running on port ${PORT}`);
});
