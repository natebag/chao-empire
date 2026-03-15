import { DatabaseSync } from "node:sqlite";
import { XP_REWARDS, LEVEL_THRESHOLDS } from "./types.js";

export function getLevelTitle(level: number): string {
  let title = LEVEL_THRESHOLDS[0].title;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (level >= threshold.level) {
      title = threshold.title;
    } else {
      break;
    }
  }
  return title;
}

function calculateLevel(xp: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xp >= threshold.xp) {
      level = threshold.level;
    } else {
      break;
    }
  }
  return level;
}

export function awardXP(
  db: DatabaseSync,
  agentId: string,
  reason: keyof typeof XP_REWARDS,
  broadcast: (event: string, data: unknown) => void
): { newXP: number; newLevel: number; leveledUp: boolean } {
  const amount = XP_REWARDS[reason];

  // Increment XP
  db.prepare("UPDATE agents SET stats_xp = stats_xp + ? WHERE id = ?").run(amount, agentId);

  // Increment tasks done if applicable
  if (reason === "task_completed") {
    db.prepare("UPDATE agents SET stats_tasks_done = stats_tasks_done + 1 WHERE id = ?").run(agentId);
  }

  // Read updated agent
  const agent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId) as
    | Record<string, unknown>
    | undefined;

  if (!agent) {
    return { newXP: 0, newLevel: 1, leveledUp: false };
  }

  const newXP = agent.stats_xp as number;
  const oldLevel = agent.level as number;
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > oldLevel;

  if (leveledUp) {
    db.prepare("UPDATE agents SET level = ? WHERE id = ?").run(newLevel, agentId);

    // Re-read agent after level update for broadcast
    const leveledAgent = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId);

    broadcast("agent_status", leveledAgent);
    broadcast("agent_leveled_up", {
      agentId,
      oldLevel,
      newLevel,
      title: getLevelTitle(newLevel),
    });
  } else {
    broadcast("agent_status", agent);
  }

  return { newXP, newLevel, leveledUp };
}
