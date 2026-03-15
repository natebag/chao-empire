export type ChaoMood = "happy" | "focused" | "tired" | "frustrated" | "excited" | "curious";

export interface MoodChange {
  agentId: string;
  previousMood: ChaoMood;
  newMood: ChaoMood;
  reason: string;
}

export const XP_REWARDS = {
  task_completed: 25,
  task_failed: 5,
  meeting_attended: 10,
  skill_learned: 15,
} as const;

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: "Intern" },
  { level: 5, xp: 100, title: "Junior" },
  { level: 15, xp: 500, title: "Senior" },
  { level: 30, xp: 1500, title: "Lead" },
] as const;
