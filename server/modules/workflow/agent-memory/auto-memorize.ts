import { DatabaseSync } from "node:sqlite";
import { addMemory } from "./store.js";

export function memorizeTaskCompletion(
  db: DatabaseSync,
  agentId: string,
  taskTitle: string,
  taskType: string,
  success: boolean,
  broadcast: (event: string, data: unknown) => void
): void {
  const memory = success
    ? `Completed '${taskTitle}' (${taskType}) successfully`
    : `Failed '${taskTitle}' (${taskType}) — need to investigate`;
  const importance = success ? 6 : 8;
  const category = "task" as const;

  addMemory(db, agentId, memory, category, importance);
  broadcast("agent_memory_added", { agentId, memory, category });
}

export function memorizeSkillLearned(
  db: DatabaseSync,
  agentId: string,
  skillName: string,
  broadcast: (event: string, data: unknown) => void
): void {
  const memory = `Learned skill: ${skillName}`;
  const category = "skill" as const;
  const importance = 7;

  addMemory(db, agentId, memory, category, importance);
  broadcast("agent_memory_added", { agentId, memory, category });
}

export function memorizeInteraction(
  db: DatabaseSync,
  agentId: string,
  ceoMessage: string,
  broadcast: (event: string, data: unknown) => void
): void {
  if (ceoMessage.length <= 20) return;

  const memory = `CEO asked about ${ceoMessage.slice(0, 100)}`;
  const category = "interaction" as const;
  const importance = 5;

  addMemory(db, agentId, memory, category, importance);
  broadcast("agent_memory_added", { agentId, memory, category });
}

export function memorizePreference(
  db: DatabaseSync,
  agentId: string,
  preference: string,
  broadcast: (event: string, data: unknown) => void
): void {
  const memory = preference;
  const category = "preference" as const;
  const importance = 6;

  addMemory(db, agentId, memory, category, importance);
  broadcast("agent_memory_added", { agentId, memory, category });
}
