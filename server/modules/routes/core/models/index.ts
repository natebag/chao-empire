import type { DatabaseSync } from "node:sqlite";
import type { Express } from "express";
import { resolveModelForAgent, getAllProviderHealth } from "../../../workflow/model-router/index.ts";

interface ModelRouteDeps {
  app: Express;
  db: DatabaseSync;
}

export function registerModelRoutes({ app, db }: ModelRouteDeps): void {
  // GET /api/models/health — provider health dashboard
  app.get("/api/models/health", (_req, res) => {
    try {
      const health = getAllProviderHealth(db);
      res.json({ providers: health });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch provider health" });
    }
  });

  // GET /api/models/resolve/:agentId — resolve model for agent (debug endpoint)
  app.get("/api/models/resolve/:agentId", (req, res) => {
    try {
      const row = db.prepare("SELECT model_config FROM agents WHERE id = ?").get(req.params.agentId) as
        | { model_config: string | null }
        | undefined;
      if (!row) return res.status(404).json({ error: "Agent not found" });

      const defaultRow = db.prepare("SELECT value FROM settings WHERE key = 'defaultModel'").get() as
        | { value: string }
        | undefined;
      const resolved = resolveModelForAgent(row.model_config, defaultRow?.value ?? null);
      res.json(resolved);
    } catch (err) {
      res.status(500).json({ error: "Failed to resolve model" });
    }
  });

  // GET /api/models/default — get system default model
  app.get("/api/models/default", (_req, res) => {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'defaultModel'").get() as
        | { value: string }
        | undefined;
      res.json(row ? JSON.parse(row.value) : { provider: "anthropic", model: "claude-opus-4-6" });
    } catch (err) {
      res.status(500).json({ error: "Failed to get default model" });
    }
  });

  // PUT /api/models/default — set system default model
  app.put("/api/models/default", (req, res) => {
    try {
      const { provider, model } = req.body;
      if (!provider || !model) return res.status(400).json({ error: "provider and model required" });

      const value = JSON.stringify({ provider, model });
      db.prepare(
        "INSERT INTO settings (key, value) VALUES ('defaultModel', ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      ).run(value, value);
      res.json({ ok: true, provider, model });
    } catch (err) {
      res.status(500).json({ error: "Failed to set default model" });
    }
  });
}
