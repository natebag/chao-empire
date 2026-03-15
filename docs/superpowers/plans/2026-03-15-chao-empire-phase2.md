# Chao Empire Phase 2: Chao Identity — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic pixel agents with Chao-inspired sprites, add a mood system with visual indicators, implement XP/leveling, add inter-agent chat, and build CEO escalation when agents are stuck.

**Architecture:** Extend the existing PixiJS sprite system (which loads numbered PNGs with directional frames) to support Chao-themed sprites with mood overlays. Add backend mood engine that triggers mood changes on task lifecycle events. Wire inter-agent chat through the existing message system. Leverage the existing CEO office call system for escalation.

**Tech Stack:** PixiJS 8 (sprites, Graphics), Express 5, SQLite, WebSocket, React 19

**Spec:** `docs/superpowers/specs/2026-03-15-chao-empire-design.md` (Sections 2, 5)

---

## Chunk 1: Mood Engine (Backend)

### Task 1: Create mood engine service

**Files:**
- Create: `server/modules/workflow/mood-engine/types.ts`
- Create: `server/modules/workflow/mood-engine/triggers.ts`
- Create: `server/modules/workflow/mood-engine/xp.ts`
- Create: `server/modules/workflow/mood-engine/index.ts`

- [ ] **Step 1: Create mood types**

```typescript
// server/modules/workflow/mood-engine/types.ts

export type ChaoMood = "happy" | "focused" | "tired" | "frustrated" | "excited" | "curious";

export interface MoodChange {
  agentId: string;
  previousMood: ChaoMood;
  newMood: ChaoMood;
  reason: string;
}

export const XP_REWARDS = {
  task_completed: 25,
  task_failed: 5,       // still get some XP for trying
  meeting_attended: 10,
  skill_learned: 15,
} as const;

export const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: "Intern" },
  { level: 5, xp: 100, title: "Junior" },
  { level: 15, xp: 500, title: "Senior" },
  { level: 30, xp: 1500, title: "Lead" },
] as const;
```

- [ ] **Step 2: Create mood trigger logic**

```typescript
// server/modules/workflow/mood-engine/triggers.ts

import type { DatabaseSync } from "node:sqlite";
import type { ChaoMood, MoodChange } from "./types.ts";

type MoodTrigger = "task_started" | "task_completed" | "task_failed" | "meeting_started"
  | "meeting_ended" | "break_started" | "error_occurred" | "skill_learned" | "leveled_up";

const TRIGGER_MOOD_MAP: Record<MoodTrigger, ChaoMood> = {
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

export function applyMoodTrigger(
  db: DatabaseSync,
  agentId: string,
  trigger: MoodTrigger,
  broadcast: (type: string, payload: unknown) => void,
): MoodChange | null {
  const agent = db.prepare("SELECT mood, energy FROM agents WHERE id = ?").get(agentId) as
    | { mood: string; energy: number } | undefined;
  if (!agent) return null;

  const previousMood = agent.mood as ChaoMood;
  const newMood = TRIGGER_MOOD_MAP[trigger];
  if (previousMood === newMood) return null;

  // Energy adjustments
  let energyDelta = 0;
  if (trigger === "task_started") energyDelta = -10;
  if (trigger === "task_completed") energyDelta = -5;
  if (trigger === "task_failed") energyDelta = -15;
  if (trigger === "break_started") energyDelta = 30;
  if (trigger === "error_occurred") energyDelta = -10;

  const newEnergy = Math.max(0, Math.min(100, agent.energy + energyDelta));

  // Low energy overrides mood to tired
  const effectiveMood = newEnergy <= 20 ? "tired" : newMood;

  db.prepare("UPDATE agents SET mood = ?, energy = ? WHERE id = ?")
    .run(effectiveMood, newEnergy, agentId);

  const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId);
  broadcast("agent_status", updated);

  return { agentId, previousMood, newMood: effectiveMood, reason: trigger };
}

export function drainEnergy(
  db: DatabaseSync,
  agentId: string,
  amount: number,
): void {
  db.prepare("UPDATE agents SET energy = MAX(0, energy - ?) WHERE id = ?")
    .run(amount, agentId);
}

export function restoreEnergy(
  db: DatabaseSync,
  agentId: string,
  amount: number,
): void {
  db.prepare("UPDATE agents SET energy = MIN(100, energy + ?) WHERE id = ?")
    .run(amount, agentId);
}
```

- [ ] **Step 3: Create XP and leveling logic**

```typescript
// server/modules/workflow/mood-engine/xp.ts

import type { DatabaseSync } from "node:sqlite";
import { XP_REWARDS, LEVEL_THRESHOLDS } from "./types.ts";

export function awardXP(
  db: DatabaseSync,
  agentId: string,
  reason: keyof typeof XP_REWARDS,
  broadcast: (type: string, payload: unknown) => void,
): { newXP: number; newLevel: number; leveledUp: boolean } {
  const xpAmount = XP_REWARDS[reason];

  db.prepare(
    "UPDATE agents SET stats_xp = stats_xp + ?, stats_tasks_done = stats_tasks_done + CASE WHEN ? = 'task_completed' THEN 1 ELSE 0 END WHERE id = ?"
  ).run(xpAmount, reason, agentId);

  const agent = db.prepare("SELECT stats_xp, level FROM agents WHERE id = ?").get(agentId) as
    | { stats_xp: number; level: number } | undefined;
  if (!agent) return { newXP: 0, newLevel: 1, leveledUp: false };

  // Calculate new level
  let newLevel = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (agent.stats_xp >= threshold.xp) newLevel = threshold.level;
  }

  const leveledUp = newLevel > agent.level;
  if (leveledUp) {
    db.prepare("UPDATE agents SET level = ? WHERE id = ?").run(newLevel, agentId);
  }

  const updated = db.prepare("SELECT * FROM agents WHERE id = ?").get(agentId);
  broadcast("agent_status", updated);

  if (leveledUp) {
    broadcast("agent_leveled_up", { agentId, newLevel, newXP: agent.stats_xp });
  }

  return { newXP: agent.stats_xp, newLevel, leveledUp };
}

export function getLevelTitle(level: number): string {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (level >= LEVEL_THRESHOLDS[i].level) return LEVEL_THRESHOLDS[i].title;
  }
  return "Intern";
}
```

- [ ] **Step 4: Create barrel export**

```typescript
// server/modules/workflow/mood-engine/index.ts

export { applyMoodTrigger, drainEnergy, restoreEnergy } from "./triggers.ts";
export { awardXP, getLevelTitle } from "./xp.ts";
export { XP_REWARDS, LEVEL_THRESHOLDS } from "./types.ts";
export type { ChaoMood, MoodChange } from "./types.ts";
```

- [ ] **Step 5: Commit**

```bash
git add server/modules/workflow/mood-engine/
git commit -m "feat: add mood engine service (triggers, energy, XP, leveling)"
```

---

### Task 2: Wire mood triggers into task lifecycle

**Files:**
- Modify: `server/modules/workflow/orchestration/run-complete-handler.ts`
- Modify: `server/modules/routes/core/tasks/execution-run.ts`
- Modify: `server/modules/workflow/orchestration/meetings/presence.ts`
- Modify: `server/modules/lifecycle.ts`

- [ ] **Step 1: Import mood engine in run-complete-handler.ts**

Add at top:
```typescript
import { applyMoodTrigger, awardXP } from "../../workflow/mood-engine/index.ts";
```

Find where task completes successfully (agent goes idle after done). Add:
```typescript
applyMoodTrigger(db, agentId, "task_completed", broadcast);
awardXP(db, agentId, "task_completed", broadcast);
```

Find where task fails. Add:
```typescript
applyMoodTrigger(db, agentId, "task_failed", broadcast);
awardXP(db, agentId, "task_failed", broadcast);
```

- [ ] **Step 2: Wire mood on task start in execution-run.ts**

Add at top:
```typescript
import { applyMoodTrigger } from "../../../workflow/mood-engine/index.ts";
```

After the agent is set to working status, add:
```typescript
applyMoodTrigger(db, agentId, "task_started", broadcast);
```

- [ ] **Step 3: Wire mood on meeting events in presence.ts**

Add at top:
```typescript
import { applyMoodTrigger, awardXP } from "../../mood-engine/index.ts";
```

In `callLeadersToCeoOffice`, after assigning to meeting room:
```typescript
applyMoodTrigger(db, leader.id, "meeting_started", broadcast);
```

In `dismissLeadersFromCeoOffice`, after returning to desk:
```typescript
applyMoodTrigger(db, leader.id, "meeting_ended", broadcast);
awardXP(db, leader.id, "meeting_attended", broadcast);
```

- [ ] **Step 4: Wire mood on break rotation in lifecycle.ts**

Add at top:
```typescript
import { applyMoodTrigger, restoreEnergy } from "./workflow/mood-engine/index.ts";
```

In `rotateBreaks()`, after setting agent to break:
```typescript
applyMoodTrigger(db, pick.id, "break_started", broadcast);
restoreEnergy(db, pick.id, 20);
```

- [ ] **Step 5: Commit**

```bash
git add server/modules/workflow/orchestration/ server/modules/routes/core/tasks/ server/modules/lifecycle.ts
git commit -m "feat: wire mood triggers into task lifecycle (start, complete, fail, meeting, break)"
```

---

## Chunk 2: Mood Visuals (Frontend)

### Task 3: Add mood indicator overlay to PixiJS agents

**Files:**
- Modify: `src/components/office-view/buildScene-department-agent.ts`
- Create: `src/components/office-view/drawing-mood.ts`

- [ ] **Step 1: Create mood drawing module**

```typescript
// src/components/office-view/drawing-mood.ts

import { Container, Graphics, Text, TextStyle } from "pixi.js";

const MOOD_COLORS: Record<string, number> = {
  happy: 0x22c55e,       // green
  focused: 0x3b82f6,     // blue
  tired: 0xeab308,       // yellow
  frustrated: 0xef4444,  // red
  excited: 0xec4899,     // pink
  curious: 0xa855f7,     // purple
};

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊",
  focused: "🎯",
  tired: "😴",
  frustrated: "😤",
  excited: "🤩",
  curious: "🤔",
};

/**
 * Draw a floating mood orb above a Chao's head.
 * Returns the container for animation ticker to bob up and down.
 */
export function drawMoodOrb(
  parent: Container,
  x: number,
  y: number,
  mood: string,
): Container {
  const container = new Container();
  container.position.set(x, y - 20); // float above head

  const color = MOOD_COLORS[mood] ?? 0x888888;

  // Outer glow
  const glow = new Graphics();
  glow.circle(0, 0, 7).fill({ color, alpha: 0.2 });
  container.addChild(glow);

  // Inner orb
  const orb = new Graphics();
  orb.circle(0, 0, 4).fill({ color, alpha: 0.85 });
  orb.circle(0, 0, 4).stroke({ width: 1, color: 0xffffff, alpha: 0.4 });
  container.addChild(orb);

  // Highlight dot
  const highlight = new Graphics();
  highlight.circle(-1.5, -1.5, 1.2).fill({ color: 0xffffff, alpha: 0.6 });
  container.addChild(highlight);

  parent.addChild(container);
  return container;
}

/**
 * Draw an XP/level badge near an agent.
 */
export function drawLevelBadge(
  parent: Container,
  x: number,
  y: number,
  level: number,
): void {
  const badge = new Graphics();
  badge.roundRect(x - 10, y, 20, 10, 3).fill({ color: 0x1e293b, alpha: 0.7 });
  badge.roundRect(x - 10, y, 20, 10, 3).stroke({ width: 0.5, color: 0x64748b, alpha: 0.5 });
  parent.addChild(badge);

  const text = new Text({
    text: `Lv${level}`,
    style: new TextStyle({
      fontSize: 7,
      fill: 0xe2e8f0,
      fontWeight: "bold",
      fontFamily: "system-ui, sans-serif",
    }),
  });
  text.anchor.set(0.5, 0);
  text.position.set(x, y + 1);
  parent.addChild(text);
}
```

- [ ] **Step 2: Integrate mood orb into department agent rendering**

In `buildScene-department-agent.ts`, after the agent sprite is placed (around line 82-100):

Add import:
```typescript
import { drawMoodOrb, drawLevelBadge } from "./drawing-mood";
```

After agent sprite is positioned, add:
```typescript
// Mood indicator orb
const mood = agent.mood ?? "happy";
drawMoodOrb(agentContainer, agentX, agentY - TARGET_CHAR_H / 2, mood);

// Level badge
const level = agent.level ?? 1;
if (level > 1) {
  drawLevelBadge(agentContainer, agentX, agentY + 8, level);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/office-view/drawing-mood.ts src/components/office-view/buildScene-department-agent.ts
git commit -m "feat: add mood orb and level badge visuals to Chao agents"
```

---

### Task 4: Add mood orb animation to office ticker

**Files:**
- Modify: `src/components/office-view/officeTicker.ts`

- [ ] **Step 1: Read officeTicker.ts to understand animation loop**

Find the main ticker function and existing animation patterns (agent bounce, sub-clone wave, etc.)

- [ ] **Step 2: Add mood orb floating animation**

Mood orbs should gently bob up and down. In the ticker loop, find where `animItemsRef` are processed and add:

```typescript
// Mood orb floating animation
// Each mood orb container has position.y that oscillates
// Use: orb.position.y = baseY + Math.sin(elapsed * 2) * 2
```

The exact integration depends on how anim items are tracked. Follow the existing pattern of `AnimItem` or `BreakAnimItem` to add mood orbs to the animation loop.

- [ ] **Step 3: Commit**

```bash
git add src/components/office-view/officeTicker.ts
git commit -m "feat: add mood orb floating animation in office ticker"
```

---

## Chunk 3: Inter-Agent Chat

### Task 5: Create inter-agent chat service (backend)

**Files:**
- Create: `server/modules/workflow/agent-chat/index.ts`

- [ ] **Step 1: Create the agent chat service**

```typescript
// server/modules/workflow/agent-chat/index.ts

import type { DatabaseSync } from "node:sqlite";

const IDLE_CHAT_MESSAGES = [
  "nice commit! 🎉",
  "coffee break? ☕",
  "this test is tricky...",
  "shipped it! 🚀",
  "lgtm 👍",
  "need a code review?",
  "that bug was sneaky 🐛",
  "let's pair on this",
  "almost done!",
  "taking a breather",
  "learned something new today!",
  "who wants coffee? ☕",
  "that refactor was clean ✨",
  "standup in 5?",
  "great progress today!",
];

const MOOD_CHAT_MESSAGES: Record<string, string[]> = {
  happy: ["feeling great today! 😊", "love this team!", "on a roll! 🎯"],
  frustrated: ["ugh, this is tough 😤", "need help with this...", "almost got it..."],
  tired: ["*yawn* 😴", "need more coffee...", "long day..."],
  excited: ["just leveled up!! 🤩", "new skill unlocked! 🔓", "this is awesome!"],
  curious: ["hmm, interesting approach 🤔", "what if we try...", "checking the docs..."],
};

/**
 * Maybe generate a spontaneous inter-agent chat message.
 * Called periodically from the lifecycle ticker.
 * Returns true if a message was sent.
 */
export function maybeGenerateIdleChat(
  db: DatabaseSync,
  broadcast: (type: string, payload: unknown) => void,
): boolean {
  // 10% chance per tick (~every 60 seconds from lifecycle)
  if (Math.random() > 0.10) return false;

  // Get idle agents in the same room
  const idleAgents = db.prepare(
    `SELECT a.id, a.name, a.mood, a.avatar_emoji, r.room
     FROM agents a
     LEFT JOIN room_assignments r ON r.agent_id = a.id
     WHERE a.status IN ('idle', 'break') AND a.name != ''
     LIMIT 20`
  ).all() as Array<{ id: string; name: string; mood: string; avatar_emoji: string; room: string | null }>;

  if (idleAgents.length < 2) return false;

  // Pick sender and receiver (preferably same room)
  const sender = idleAgents[Math.floor(Math.random() * idleAgents.length)];
  const sameRoom = idleAgents.filter(a => a.id !== sender.id && a.room === sender.room);
  const receiver = sameRoom.length > 0
    ? sameRoom[Math.floor(Math.random() * sameRoom.length)]
    : idleAgents.filter(a => a.id !== sender.id)[Math.floor(Math.random() * (idleAgents.length - 1))];

  if (!receiver) return false;

  // Pick message based on mood or generic
  const moodMessages = MOOD_CHAT_MESSAGES[sender.mood] ?? [];
  const allMessages = [...IDLE_CHAT_MESSAGES, ...moodMessages];
  const message = allMessages[Math.floor(Math.random() * allMessages.length)];

  // Store in agent_chats table
  db.prepare(
    "INSERT INTO agent_chats (from_agent_id, to_agent_id, message, created_at) VALUES (?, ?, ?, ?)"
  ).run(sender.id, receiver.id, message, Date.now());

  // Broadcast as a new_message for the chat panel
  broadcast("new_message", {
    id: `agent-chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender_type: "agent",
    sender_id: sender.id,
    sender_name: sender.name,
    sender_avatar: sender.avatar_emoji,
    receiver_type: "agent",
    receiver_id: receiver.id,
    content: message,
    message_type: "chat",
    task_id: null,
    created_at: Date.now(),
  });

  // Also broadcast for speech bubble in office view
  broadcast("agent_chat_bubble", {
    agentId: sender.id,
    agentName: sender.name,
    targetAgentId: receiver.id,
    message,
    timestamp: Date.now(),
  });

  return true;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/modules/workflow/agent-chat/
git commit -m "feat: add inter-agent idle chat service with mood-aware messages"
```

---

### Task 6: Wire inter-agent chat into lifecycle ticker

**Files:**
- Modify: `server/modules/lifecycle.ts`

- [ ] **Step 1: Import and call idle chat**

Add at top:
```typescript
import { maybeGenerateIdleChat } from "./workflow/agent-chat/index.ts";
```

In `rotateBreaks()` or a similar periodic function (called every ~60s), add at the end:
```typescript
// Spontaneous inter-agent chat
maybeGenerateIdleChat(db, broadcast);
```

- [ ] **Step 2: Commit**

```bash
git add server/modules/lifecycle.ts
git commit -m "feat: wire inter-agent idle chat into lifecycle ticker"
```

---

### Task 7: Add speech bubble rendering for agent chat in PixiJS

**Files:**
- Modify: `src/app/useRealtimeSync.ts`
- Modify: `src/components/office-view/buildScene-department-agent.ts` or `officeTicker.ts`

- [ ] **Step 1: Handle agent_chat_bubble WebSocket event**

In `src/types/index.ts`, add to WSEventType:
```typescript
| "agent_chat_bubble"
| "agent_leveled_up"
```

In `src/app/useRealtimeSync.ts`, add handler:
```typescript
on("agent_chat_bubble", (payload: unknown) => {
  const p = payload as { agentId: string; message: string; timestamp: number };
  // Store temporarily for office view to render as speech bubble
  // Use a ref or state with auto-expiry (5 seconds)
  setChatBubbles((prev) => {
    const next = [...prev, { ...p, expiresAt: Date.now() + 5000 }];
    return next.slice(-10); // max 10 active bubbles
  });
}),
```

Note: `setChatBubbles` needs to be added to the params and state. If this is too invasive, an alternative is to pass chat bubbles through the existing `crossDeptDeliveries` or `ceoOfficeCalls` pattern.

- [ ] **Step 2: Render speech bubbles in office view**

Add a simple speech bubble renderer to the office ticker or a new drawing function. When `agent_chat_bubble` events arrive, draw a rounded rectangle with text near the agent's position, fading out after 5 seconds.

This is best implemented as a new entry in `animItemsRef` that auto-removes after the TTL.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/app/useRealtimeSync.ts
git commit -m "feat: render inter-agent chat speech bubbles in office view"
```

---

## Chunk 4: CEO Escalation

### Task 8: Add escalation when agent is blocked

**Files:**
- Modify: `server/modules/routes/core/tasks/execution-run.ts`
- Modify: `server/modules/workflow/orchestration/run-complete-handler.ts`

- [ ] **Step 1: Detect blocked state and escalate**

When a task fails or an agent hits an error, check if the agent should escalate to CEO. In `run-complete-handler.ts`, when a task fails:

```typescript
import { assignRoom } from "../../workflow/room-manager/index.ts";

// When task fails and agent has no fallback:
assignRoom(db, agentId, "ceo");
broadcast("room_change", { agentId, room: "ceo", reason: "escalation", timestamp: Date.now() });
broadcast("ceo_office_call", {
  from_agent_id: agentId,
  action: "escalation",
  message: `I'm stuck on "${task.title}" — can you help?`,
  task_id: task.id,
  timestamp: Date.now(),
});
applyMoodTrigger(db, agentId, "error_occurred", broadcast);
```

- [ ] **Step 2: Auto-return from CEO office after response**

In the direct chat handler (`server/modules/routes/collab/direct-chat-handlers.ts`), after CEO responds to an agent that's in the CEO room:

```typescript
import { getAgentRoom, assignRoom } from "../../../workflow/room-manager/index.ts";

// After sending CEO reply to agent:
const currentRoom = getAgentRoom(db, agent.id);
if (currentRoom === "ceo") {
  assignRoom(db, agent.id, "desk");
  broadcast("room_change", { agentId: agent.id, room: "desk", reason: "escalation_resolved", timestamp: Date.now() });
}
```

- [ ] **Step 3: Commit**

```bash
git add server/modules/workflow/orchestration/ server/modules/routes/collab/
git commit -m "feat: add CEO escalation — agents walk to CEO office when stuck"
```

---

### Task 9: Add Chao sprite references to project

**Files:**
- Create: `sprites/references/` (copy user's reference images)
- Create: `sprites/chao-base/README.md`

- [ ] **Step 1: Set up sprite directories**

```bash
mkdir -p sprites/chao-base sprites/accessories sprites/effects
```

- [ ] **Step 2: Create sprite README**

```markdown
# Chao Sprite System

## Current State
Using Claw Empire's default numbered sprites (1-14) with directional frames.
Chao-inspired replacements are planned — see `sprites/references/` for design references.

## Sprite Format
- Filename: `{number}-{direction}-{frame}.png`
- Directions: D (down), L (left), R (right)
- Frames: 1, 2, 3 (walk cycle animation)
- Size: original sprites are ~26x52px, rendered at 1x

## Future: Chao Replacements
When custom Chao sprites are ready:
1. Replace files in `public/sprites/` matching the same naming convention
2. Each Chao variant gets a unique sprite number
3. Mood overlays are rendered separately via drawing-mood.ts
```

- [ ] **Step 3: Copy reference images**

Move the user's saved reference images from `f:/coding/scrum/sprites/references/` into `sprites/references/` in the chao-empire project.

```bash
cp -r f:/coding/scrum/sprites/references/* sprites/references/ 2>/dev/null || echo "Copy manually"
```

- [ ] **Step 4: Commit**

```bash
git add sprites/
git commit -m "feat: add sprite system docs and Chao reference images"
```

---

### Task 10: Final Phase 2 integration test

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 2: Vite build**

```bash
npx vite build
```
Expected: build succeeds

- [ ] **Step 3: Manual verification**

Start the app and verify:
1. Create an agent — mood orb appears above them in office view
2. Assign a task — mood changes to "focused" (blue orb)
3. Task completes — mood changes to "happy" (green orb), XP increases
4. Wait ~60 seconds — inter-agent chat bubbles appear occasionally
5. Agent edit modal shows model config + mood/energy fields
6. Level badge shows for agents above Lv1

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "fix: phase 2 integration cleanup"
git tag -a v0.2.0 -m "Phase 2: Chao Identity — mood, XP, inter-agent chat, escalation"
git push origin main --tags
```

---

## Summary

**Phase 2 delivers:**
- Mood engine: 6 moods (happy/focused/tired/frustrated/excited/curious) with automatic triggers
- Energy system: drains on work, restores on break, low energy → tired mood
- XP & leveling: earn XP for tasks/meetings/skills, level up through intern→junior→senior→lead
- Mood orb: floating color-coded indicator above each Chao's head
- Level badge: "Lv5" badge shown for agents above level 1
- Inter-agent chat: spontaneous messages between idle Chao in same room
- CEO escalation: stuck agents walk to CEO office and ask for help
- Sprite system docs: ready for Chao sprite replacements

**Next:** Phase 3 plan (day/night cycle, particle effects, visual feedback)
