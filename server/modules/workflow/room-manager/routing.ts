import type { RoomId } from "./types";

const TASK_TYPE_ROOM_MAP: Record<string, RoomId> = {
  coding: "desk",
  dev: "desk",
  development: "desk",
  design: "desk",
  implement: "desk",
  build: "desk",
  research: "library",
  investigate: "library",
  analyze: "library",
  analysis: "library",
  study: "library",
  deploy: "server",
  "ci-cd": "server",
  infra: "server",
  infrastructure: "server",
  devops: "server",
  learn: "gym",
  train: "gym",
  skill: "gym",
  practice: "gym",
  exercise: "gym",
  meeting: "meeting",
  standup: "meeting",
  review: "meeting",
  retro: "meeting",
  planning: "meeting",
};

const KEYWORD_ROOM_MAP: Array<{ keywords: string[]; room: RoomId }> = [
  { keywords: ["code", "develop", "design", "implement", "build", "fix", "bug", "feature", "refactor"], room: "desk" },
  { keywords: ["research", "investigate", "analyze", "study", "read", "document"], room: "library" },
  { keywords: ["deploy", "ci", "cd", "pipeline", "infra", "server", "docker", "kubernetes"], room: "server" },
  { keywords: ["learn", "train", "skill", "practice", "tutorial", "course"], room: "gym" },
  { keywords: ["meeting", "standup", "review", "retro", "planning", "discuss", "sync"], room: "meeting" },
];

function matchKeywords(text: string): RoomId | null {
  const lower = text.toLowerCase();
  for (const entry of KEYWORD_ROOM_MAP) {
    for (const keyword of entry.keywords) {
      if (lower.includes(keyword)) {
        return entry.room;
      }
    }
  }
  return null;
}

export function resolveRoom(
  taskType: string | null,
  taskTitle: string | null,
  taskDescription: string | null,
  agentStatus: string | null,
  isNight: boolean,
): RoomId {
  // 1. Try matching by task type directly
  if (taskType) {
    const normalized = taskType.toLowerCase().trim();
    const mapped = TASK_TYPE_ROOM_MAP[normalized];
    if (mapped) return mapped;
  }

  // 2. Try matching keywords in task title
  if (taskTitle) {
    const match = matchKeywords(taskTitle);
    if (match) return match;
  }

  // 3. Try matching keywords in task description
  if (taskDescription) {
    const match = matchKeywords(taskDescription);
    if (match) return match;
  }

  // 4. Idle agents: break room at night, desk during day
  if (!agentStatus || agentStatus === "idle") {
    return isNight ? "break" : "desk";
  }

  // 5. Default fallback
  return isNight ? "break" : "desk";
}
