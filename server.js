import express from "express";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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

// ── App ──
const app = express();
app.use(express.json({ limit: "10mb" }));

// Serve built React app
const distDir = join(__dirname, "dist");
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

// ── API: get state by key ──
app.get("/api/state/:key", (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM state WHERE key = ?").get(req.params.key);
    if (row) {
      res.json(JSON.parse(row.value));
    } else {
      res.status(404).json(null);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: save state by key ──
app.post("/api/state/:key", (req, res) => {
  try {
    const value = JSON.stringify(req.body);
    db.prepare(`
      INSERT INTO state (key, value, updated_at) VALUES (?, ?, unixepoch())
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()
    `).run(req.params.key, value);
    // Log update timestamp for polling
    db.prepare("INSERT INTO state_log (key) VALUES (?)").run(req.params.key);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── API: get last update timestamps (for polling sync) ──
app.get("/api/updates", (req, res) => {
  try {
    const sinceRaw = parseInt(req.query.since) || 0;
    // JS Date.now() is ms; SQLite unixepoch() is seconds — normalize
    const since = sinceRaw > 1e10 ? Math.floor(sinceRaw / 1000) : sinceRaw;
    const rows = db.prepare("SELECT key, MAX(updated_at) as ts FROM state WHERE updated_at > ? GROUP BY key").all(since);
    res.json(rows);
  } catch (e) {
    res.status(500).json([]);
  }
});

// ── API: health ──
app.get("/api/ping", (_, res) => res.json({ ok: true, time: Date.now() }));

// ── SPA fallback ──
app.get("*", (req, res) => {
  if (fs.existsSync(join(distDir, "index.html"))) {
    res.sendFile(join(distDir, "index.html"));
  } else {
    res.status(503).send("App not built yet. Run: npm run build");
  }
});

app.listen(PORT, () => {
  console.log(`Dikanish server running on port ${PORT}`);
});
