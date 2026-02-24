import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const db = new Database("travel.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS trips (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT DEFAULT '我的旅行');
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day INTEGER, time TEXT, location TEXT, category TEXT, content TEXT, image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.get("/api/trip", (req, res) => res.json(db.prepare("SELECT * FROM trips LIMIT 1").get()));
  app.put("/api/trip", (req, res) => {
    db.prepare("UPDATE trips SET name = ? WHERE id = 1").run(req.body.name);
    res.json({ success: true });
  });
  app.get("/api/entries", (req, res) => res.json(db.prepare("SELECT * FROM entries ORDER BY day ASC, time ASC").all()));
  app.post("/api/entries", (req, res) => {
    const { day, time, location, category, content, image_url } = req.body;
    const result = db.prepare("INSERT INTO entries (day, time, location, category, content, image_url) VALUES (?, ?, ?, ?, ?, ?)").run(day, time, location, category, content, image_url);
    res.json({ id: result.lastInsertRowid });
  });
  app.delete("/api/entries/:id", (req, res) => {
    db.prepare("DELETE FROM entries WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
  app.listen(3000, "0.0.0.0", () => console.log("Server running on http://localhost:3000"));
}
startServer();
