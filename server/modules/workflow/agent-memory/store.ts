import { DatabaseSync } from "node:sqlite";
import type { AgentMemory, MemoryCategory } from "./types.js";

export interface GetMemoriesOpts {
  category?: MemoryCategory;
  limit?: number;
  minImportance?: number;
}

export function addMemory(
  db: DatabaseSync,
  agentId: string,
  memory: string,
  category: MemoryCategory,
  importance: number,
  sourceTaskId?: string
): number {
  const stmt = db.prepare(
    `INSERT INTO agent_memories (agent_id, memory, category, importance, source_task_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const result = stmt.run(agentId, memory, category, importance, sourceTaskId ?? null, Date.now());
  return Number(result.lastInsertRowid);
}

export function getMemories(
  db: DatabaseSync,
  agentId: string,
  opts?: GetMemoriesOpts
): AgentMemory[] {
  const conditions = ["agent_id = ?"];
  const params: unknown[] = [agentId];

  if (opts?.category) {
    conditions.push("category = ?");
    params.push(opts.category);
  }

  if (opts?.minImportance) {
    conditions.push("importance >= ?");
    params.push(opts.minImportance);
  }

  const limit = opts?.limit ?? 50;
  params.push(limit);

  const sql = `SELECT id, agent_id, memory, category, importance, source_task_id, created_at
    FROM agent_memories
    WHERE ${conditions.join(" AND ")}
    ORDER BY importance DESC, created_at DESC
    LIMIT ?`;

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];

  return rows.map(toAgentMemory);
}

export function getTopMemories(
  db: DatabaseSync,
  agentId: string,
  limit = 10
): AgentMemory[] {
  const rows = db.prepare(
    `SELECT id, agent_id, memory, category, importance, source_task_id, created_at
     FROM agent_memories
     WHERE agent_id = ?
     ORDER BY importance DESC, created_at DESC
     LIMIT ?`
  ).all(agentId, limit) as Record<string, unknown>[];

  return rows.map(toAgentMemory);
}

export function getRecentMemories(
  db: DatabaseSync,
  agentId: string,
  limit = 5
): AgentMemory[] {
  const rows = db.prepare(
    `SELECT id, agent_id, memory, category, importance, source_task_id, created_at
     FROM agent_memories
     WHERE agent_id = ?
     ORDER BY created_at DESC
     LIMIT ?`
  ).all(agentId, limit) as Record<string, unknown>[];

  return rows.map(toAgentMemory);
}

export function deleteMemory(db: DatabaseSync, id: number): void {
  db.prepare("DELETE FROM agent_memories WHERE id = ?").run(id);
}

export function pruneOldMemories(
  db: DatabaseSync,
  agentId: string,
  keepCount = 50
): void {
  // Count total memories for this agent
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM agent_memories WHERE agent_id = ?"
  ).get(agentId) as { cnt: number } | undefined;

  const total = row?.cnt ?? 0;
  if (total <= keepCount) return;

  const excess = total - keepCount;

  // Delete the oldest low-importance memories first
  // Keep high importance (>= 8) memories safe from pruning
  db.prepare(
    `DELETE FROM agent_memories WHERE id IN (
       SELECT id FROM agent_memories
       WHERE agent_id = ? AND importance < 8
       ORDER BY importance ASC, created_at ASC
       LIMIT ?
     )`
  ).run(agentId, excess);
}

function toAgentMemory(row: Record<string, unknown>): AgentMemory {
  return {
    id: row.id as number,
    agentId: row.agent_id as string,
    memory: row.memory as string,
    category: row.category as MemoryCategory,
    importance: row.importance as number,
    sourceTaskId: (row.source_task_id as string) ?? null,
    createdAt: row.created_at as number,
  };
}
