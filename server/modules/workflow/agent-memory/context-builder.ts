import { DatabaseSync } from "node:sqlite";
import { getTopMemories, getMemories } from "./store.js";
import type { AgentMemory } from "./types.js";

export function buildMemoryContext(
  db: DatabaseSync,
  agentId: string,
  taskContext?: string
): string {
  const topMemories = getTopMemories(db, agentId, 10);

  // If taskContext is provided, also fetch task-category memories matching keywords
  let taskMemories: AgentMemory[] = [];
  if (taskContext) {
    const allTaskMemories = getMemories(db, agentId, { category: "task", limit: 20 });
    const keywords = taskContext
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    taskMemories = allTaskMemories.filter((m) => {
      const lower = m.memory.toLowerCase();
      return keywords.some((kw) => lower.includes(kw));
    });
  }

  // Merge and deduplicate by id
  const seen = new Set<number>();
  const merged: AgentMemory[] = [];

  for (const m of topMemories) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      merged.push(m);
    }
  }
  for (const m of taskMemories) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      merged.push(m);
    }
  }

  if (merged.length === 0) return "";

  const lines = merged.map(
    (m) => `- [${m.category}] ${m.memory} (importance: ${m.importance})`
  );

  return `## Your Memories\n${lines.join("\n")}`;
}
