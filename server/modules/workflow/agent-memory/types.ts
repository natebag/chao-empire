export type MemoryCategory = "personality" | "skill" | "task" | "interaction" | "preference";

export interface AgentMemory {
  id: number;
  agentId: string;
  memory: string;
  category: MemoryCategory;
  importance: number; // 1-10
  sourceTaskId: string | null;
  createdAt: number;
}
