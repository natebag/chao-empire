import { DatabaseSync } from "node:sqlite";
import type { ChaoMood, MoodChange } from "./types.js";

export type MoodTrigger =
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "meeting_started"
  | "meeting_ended"
  | "break_started"
  | "error_occurred"
  | "skill_learned"
  | "leveled_up";

const TRIGGER_MOODS: Record<MoodTrigger, ChaoMood> = {
  task_started: "focused",
  task_completed: "happy",
  task_failed: "frustrated",
  meeting_started: "curious",
  meeting_ended: "happy",
  break_started: "happy",
  error_occurred: "frustrated",
  skill_learned: "excited",
  leveled_up: "excited",
};

const ENERGY_ADJUSTMENTS: Partial<Record<MoodTrigger, number>> = {
  task_started: -10,
  task_completed: -5,
  task_failed: -15,
  break_started: 30,
  error_occurred: -10,
};

export function drainEnergy(db: DatabaseSync, agentId: string, amount: number): void {
  db.exec("SELECT 1"); // ensure db is open
  const stmt = db.prepare(
    "UPDATE agents SET energy = MAX(0, energy - ?) WHERE id = ?"
  );
  stmt.run(amount, agentId);
}

export function restoreEnergy(db: DatabaseSync, agentId: string, amount: number): void {
  const stmt = db.prepare(
    "UPDATE agents SET energy = MIN(100, energy + ?) WHERE id = ?"
  );
  stmt.run(amount, agentId);
}

export function applyMoodTrigger(
  db: DatabaseSync,
  agentId: string,
  trigger: MoodTrigger,
  broadcast: (event: string, data: unknown) => void
): MoodChange | null {
  // Get current agent state
  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as
    | Record<string, unknown>
    | undefined;

  if (!agent) return null;

  const previousMood = agent.mood as ChaoMood;

  // Apply energy adjustment if applicable
  const energyDelta = ENERGY_ADJUSTMENTS[trigger];
  if (energyDelta !== undefined) {
    if (energyDelta < 0) {
      drainEnergy(db, agentId, Math.abs(energyDelta));
    } else {
      restoreEnergy(db, agentId, energyDelta);
    }
  }

  // Re-read agent to get updated energy
  const updatedAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as
    | Record<string, unknown>
    | undefined;

  if (!updatedAgent) return null;

  const currentEnergy = updatedAgent.energy as number;

  // Determine new mood: low energy overrides to tired
  let newMood: ChaoMood;
  if (currentEnergy <= 20) {
    newMood = "tired";
  } else {
    newMood = TRIGGER_MOODS[trigger];
  }

  // Update mood in DB
  db.prepare("UPDATE agents SET mood = ? WHERE id = ?").run(newMood, agentId);

  // Read final agent state for broadcast
  const finalAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId);

  broadcast("agent_status", finalAgent);

  if (newMood === previousMood) return null;

  return {
    agentId,
    previousMood,
    newMood,
    reason: trigger,
  };
}
