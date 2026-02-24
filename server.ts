import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("travel.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT DEFAULT '我的旅行'
  );
  CREATE TABLE IF NOT EXISTS day_dates (
    day INTEGER PRIMARY KEY,
    date TEXT
  );
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day INTEGER,
    time TEXT,
    location TEXT,
    category TEXT,
    content TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Initialize day dates if not exist
for (let i = 1; i <= 7; i++) {
  db.prepare("INSERT OR IGNORE INTO day_dates (day, date) VALUES (?, ?)").run(i, "");
}

// Ensure there's at least one trip
const trip = db.prepare("SELECT * FROM trips LIMIT 1").get();
if (!trip) {
  db.prepare("INSERT INTO trips (name) VALUES (?)").run("我的旅行");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/trip", (req, res) => {
    const trip = db.prepare("SELECT * FROM trips LIMIT 1").get();
    res.json(trip);
  });

  app.put("/api/trip", (req, res) => {
    const { name } = req.body;
    db.prepare("UPDATE trips SET name = ? WHERE id = (SELECT id FROM trips LIMIT 1)").run(name);
    res.json({ success: true });
  });

  app.get("/api/day_dates", (req, res) => {
    const dates = db.prepare("SELECT * FROM day_dates").all();
    res.json(dates);
  });

  app.put("/api/day_dates/:day", (req, res) => {
    const { date } = req.body;
    db.prepare("UPDATE day_dates SET date = ? WHERE day = ?").run(date, req.params.day);
    res.json({ success: true });
  });

  app.get("/api/entries", (req, res) => {
    const entries = db.prepare("SELECT * FROM entries ORDER BY day ASC, time ASC").all();
    res.json(entries);
  });

  app.post("/api/entries", (req, res) => {
    const { day, time, location, category, content, image_url } = req.body;
    const result = db.prepare(
      "INSERT INTO entries (day, time, location, category, content, image_url) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(day, time, location, category, content, image_url);
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/entries/:id", (req, res) => {
    const { time, location, category, content, image_url } = req.body;
    db.prepare(
      "UPDATE entries SET time = ?, location = ?, category = ?, content = ?, image_url = ? WHERE id = ?"
    ).run(time, location, category, content, image_url, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/entries/:id", (req, res) => {
    db.prepare("DELETE FROM entries WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
