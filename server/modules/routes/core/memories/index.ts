import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";

// Import will resolve once agent-memory service is created
import { getMemories, getTopMemories, addMemory, deleteMemory, pruneOldMemories } from "../../../workflow/agent-memory/index.ts";
import type { MemoryCategory } from "../../../workflow/agent-memory/index.ts";

interface MemoryRouteDeps {
  app: Express;
  db: DatabaseSync;
}

const VALID_CATEGORIES: MemoryCategory[] = ["personality", "skill", "task", "interaction", "preference"];

export function registerMemoryRoutes({ app, db }: MemoryRouteDeps): void {
  // GET /api/memories/:agentId — get agent's memories
  app.get("/api/memories/:agentId", (req, res) => {
    try {
      const { category, limit, minImportance } = req.query;
      const memories = getMemories(db, req.params.agentId, {
        category: VALID_CATEGORIES.includes(category as MemoryCategory) ? (category as MemoryCategory) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        minImportance: minImportance ? parseInt(minImportance as string, 10) : undefined,
      });
      res.json({ memories });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  // GET /api/memories/:agentId/top — get top memories for context
  app.get("/api/memories/:agentId/top", (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const memories = getTopMemories(db, req.params.agentId, limit);
      res.json({ memories });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch top memories" });
    }
  });

  // POST /api/memories/:agentId — add a memory manually
  app.post("/api/memories/:agentId", (req, res) => {
    try {
      const { memory, category, importance } = req.body;
      if (!memory || !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: "memory and valid category required" });
      }
      const id = addMemory(db, req.params.agentId, memory, category, importance ?? 5);
      res.json({ ok: true, id });
    } catch (err) {
      res.status(500).json({ error: "Failed to add memory" });
    }
  });

  // DELETE /api/memories/:id — delete a specific memory
  app.delete("/api/memories/:id", (req, res) => {
    try {
      deleteMemory(db, parseInt(req.params.id, 10));
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  // POST /api/memories/:agentId/prune — prune old low-importance memories
  app.post("/api/memories/:agentId/prune", (req, res) => {
    try {
      const keepCount = req.body.keepCount ?? 50;
      pruneOldMemories(db, req.params.agentId, keepCount);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to prune memories" });
    }
  });
}
