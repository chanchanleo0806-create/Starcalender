import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("calendar.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    location TEXT,
    date TEXT NOT NULL
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/events", (req, res) => {
    const events = db.prepare("SELECT * FROM events").all();
    res.json(events);
  });

  app.post("/api/events", (req, res) => {
    const { id, title, description, startTime, endTime, location, date } = req.body;
    const insert = db.prepare(`
      INSERT INTO events (id, title, description, startTime, endTime, location, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run(id, title, description, startTime, endTime, location, date);
    res.status(201).json({ success: true });
  });

  app.delete("/api/events/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM events WHERE id = ?").run(id);
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
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
