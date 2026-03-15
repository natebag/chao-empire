# Chao Empire Phase 3: Living Office — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 6-hour day/night cycle with smooth sky color transitions and behavioral effects, a particle system (Zzz, sparkles, confetti, sweat), and visual feedback showing task output on agent desks.

**Architecture:** Create a day/night cycle module that computes the current phase (dawn/day/dusk/night) from a timer and interpolates background colors per-frame in the ticker. Build a reusable particle emitter for various effects (sleep Zs, celebration sparkles, error sweat). Add a mini-terminal overlay on working agents' desks showing the last few lines of CLI output.

**Tech Stack:** PixiJS 8 (Graphics, Text, Container, ticker), TypeScript, WebSocket

**Spec:** `docs/superpowers/specs/2026-03-15-chao-empire-design.md` (Sections 4, 7)

---

## Chunk 1: Day/Night Cycle

### Task 1: Create day/night cycle module

**Files:**
- Create: `src/components/office-view/dayNightCycle.ts`

- [ ] **Step 1: Create the cycle module**

```typescript
// src/components/office-view/dayNightCycle.ts

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export interface DayNightState {
  phase: TimeOfDay;
  progress: number;       // 0-1 within current phase
  cycleProgress: number;  // 0-1 across full cycle
  skyTint: number;        // hex color for background tint
  ambientAlpha: number;   // 0-1 darkness overlay alpha
  isNight: boolean;
}

const CYCLE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours default

// Phase boundaries (fraction of full cycle)
const PHASES: Array<{ phase: TimeOfDay; start: number; end: number }> = [
  { phase: "dawn",  start: 0.0,   end: 0.25  },
  { phase: "day",   start: 0.25,  end: 0.5   },
  { phase: "dusk",  start: 0.5,   end: 0.75  },
  { phase: "night", start: 0.75,  end: 1.0   },
];

// Sky colors per phase boundary
const SKY_COLORS = {
  dawn_start:  0x2d1b4e,  // deep purple (end of night)
  dawn_end:    0xf5a623,  // warm orange sunrise
  day_start:   0xf5a623,  // warm orange
  day_end:     0x87ceeb,  // clear sky blue
  dusk_start:  0x87ceeb,  // sky blue
  dusk_end:    0xe8651a,  // sunset orange
  night_start: 0xe8651a,  // sunset
  night_end:   0x0a0a2e,  // deep navy
};

// Ambient overlay alpha (darkness level)
const AMBIENT_ALPHA = {
  dawn:  { start: 0.3,  end: 0.0  },
  day:   { start: 0.0,  end: 0.0  },
  dusk:  { start: 0.0,  end: 0.25 },
  night: { start: 0.25, end: 0.35 },
};

let cycleStartTime = Date.now();
let cycleDurationMs = CYCLE_DURATION_MS;

export function setCycleDuration(ms: number): void {
  cycleDurationMs = ms;
}

export function resetCycle(): void {
  cycleStartTime = Date.now();
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return (r << 16) | (g << 8) | b;
}

export function getDayNightState(): DayNightState {
  const elapsed = (Date.now() - cycleStartTime) % cycleDurationMs;
  const cycleProgress = elapsed / cycleDurationMs;

  for (const p of PHASES) {
    if (cycleProgress >= p.start && cycleProgress < p.end) {
      const phaseLength = p.end - p.start;
      const progress = (cycleProgress - p.start) / phaseLength;

      const colorKey = p.phase;
      const startColor = SKY_COLORS[`${colorKey}_start` as keyof typeof SKY_COLORS];
      const endColor = SKY_COLORS[`${colorKey}_end` as keyof typeof SKY_COLORS];
      const skyTint = lerpColor(startColor, endColor, progress);

      const alphaRange = AMBIENT_ALPHA[colorKey];
      const ambientAlpha = lerp(alphaRange.start, alphaRange.end, progress);

      return {
        phase: p.phase,
        progress,
        cycleProgress,
        skyTint,
        ambientAlpha,
        isNight: p.phase === "night" || (p.phase === "dusk" && progress > 0.7),
      };
    }
  }

  return { phase: "day", progress: 0.5, cycleProgress: 0.375, skyTint: 0x87ceeb, ambientAlpha: 0, isNight: false };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/office-view/dayNightCycle.ts
git commit -m "feat: add day/night cycle module (6hr, 4 phases, color interpolation)"
```

---

### Task 2: Add ambient overlay to office scene

**Files:**
- Modify: `src/components/office-view/buildScene-ceo-hallway.ts`
- Modify: `src/components/office-view/buildScene.ts`

- [ ] **Step 1: Create ambient overlay in buildScene-ceo-hallway.ts**

After the background is drawn (after the `app.stage.addChild(bg)` line), add a semi-transparent overlay for day/night dimming:

```typescript
import { getDayNightState } from "./dayNightCycle";

// After bg is added to stage:
const dayNightOverlay = new Graphics();
const dnState = getDayNightState();
dayNightOverlay.rect(0, 0, OFFICE_W, totalH).fill({ color: dnState.skyTint, alpha: dnState.ambientAlpha });
app.stage.addChild(dayNightOverlay);
```

Store the overlay reference so the ticker can update it per frame. Pass it back via a ref or return value.

- [ ] **Step 2: Add overlay ref to buildScene context**

In `buildScene.ts`, add a `dayNightOverlayRef` to the context and pass it through.

- [ ] **Step 3: Commit**

```bash
git add src/components/office-view/buildScene-ceo-hallway.ts src/components/office-view/buildScene.ts
git commit -m "feat: add day/night ambient overlay to office background"
```

---

### Task 3: Update day/night overlay per-frame in ticker

**Files:**
- Modify: `src/components/office-view/officeTicker.ts`

- [ ] **Step 1: Import and update overlay each frame**

At the top of `runOfficeTickerStep`, add:

```typescript
import { getDayNightState } from "./dayNightCycle";

// In runOfficeTickerStep, every 30 frames (twice per second):
if (tick % 30 === 0 && ctx.dayNightOverlayRef?.current) {
  const dnState = getDayNightState();
  const overlay = ctx.dayNightOverlayRef.current;
  overlay.clear();
  overlay.rect(0, 0, ctx.officeWRef.current, ctx.totalHRef.current).fill({
    color: dnState.skyTint,
    alpha: dnState.ambientAlpha,
  });
}
```

- [ ] **Step 2: Add time-of-day indicator to CEO office**

Add a small text in the CEO office showing current phase:

```typescript
if (tick % 120 === 0 && ctx.timeDisplayRef?.current) {
  const dnState = getDayNightState();
  const icons = { dawn: "🌅", day: "☀️", dusk: "🌇", night: "🌙" };
  ctx.timeDisplayRef.current.text = icons[dnState.phase];
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/office-view/officeTicker.ts
git commit -m "feat: update day/night overlay per-frame in ticker"
```

---

## Chunk 2: Particle System

### Task 4: Create reusable particle emitter

**Files:**
- Create: `src/components/office-view/particles.ts`

- [ ] **Step 1: Create particle system**

```typescript
// src/components/office-view/particles.ts

import { Container, Graphics, Text, TextStyle } from "pixi.js";

export interface Particle {
  node: Container;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  spin: number;
  growth: number;
  type: string;
}

/**
 * Emit floating "Zzz" particles above sleeping agents.
 */
export function emitSleepZzz(
  parent: Container,
  particles: Particle[],
  x: number,
  y: number,
): void {
  const z = new Text({
    text: "z",
    style: new TextStyle({
      fontSize: 6 + Math.random() * 4,
      fill: 0x94a3b8,
      fontWeight: "bold",
      fontFamily: "system-ui, sans-serif",
    }),
  });
  z.anchor.set(0.5);
  z.position.set(x + (Math.random() - 0.5) * 8, y);
  parent.addChild(z);
  particles.push({
    node: z, vx: (Math.random() - 0.5) * 0.3, vy: -0.4 - Math.random() * 0.3,
    life: 0, maxLife: 40 + Math.random() * 20, spin: 0.02, growth: 0.008, type: "zzz",
  });
}

/**
 * Emit sparkle/star particles for celebrations (task complete, level up).
 */
export function emitSparkles(
  parent: Container,
  particles: Particle[],
  x: number,
  y: number,
  count: number = 8,
): void {
  const colors = [0xffd700, 0xff69b4, 0x00ffff, 0x7fff00, 0xff6347];
  for (let i = 0; i < count; i++) {
    const star = new Graphics();
    const color = colors[Math.floor(Math.random() * colors.length)];
    star.star(0, 0, 5, 3, 1.5).fill({ color, alpha: 0.9 });
    star.position.set(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 10);
    parent.addChild(star);
    const angle = (Math.PI * 2 * i) / count;
    particles.push({
      node: star, vx: Math.cos(angle) * 1.2, vy: Math.sin(angle) * 1.2 - 0.5,
      life: 0, maxLife: 25 + Math.random() * 15, spin: 0.1, growth: 0.01, type: "sparkle",
    });
  }
}

/**
 * Emit confetti burst for big celebrations (project shipped).
 */
export function emitConfetti(
  parent: Container,
  particles: Particle[],
  x: number,
  y: number,
  count: number = 20,
): void {
  const colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff];
  for (let i = 0; i < count; i++) {
    const piece = new Graphics();
    const color = colors[Math.floor(Math.random() * colors.length)];
    piece.rect(-2, -1, 4, 2).fill({ color, alpha: 0.85 });
    piece.position.set(x, y);
    parent.addChild(piece);
    particles.push({
      node: piece,
      vx: (Math.random() - 0.5) * 4,
      vy: -2 - Math.random() * 3,
      life: 0, maxLife: 50 + Math.random() * 30,
      spin: (Math.random() - 0.5) * 0.2,
      growth: 0,
      type: "confetti",
    });
  }
}

/**
 * Emit sweat drop for frustrated/error agents.
 */
export function emitSweatDrop(
  parent: Container,
  particles: Particle[],
  x: number,
  y: number,
): void {
  const drop = new Graphics();
  drop.circle(0, 0, 2).fill({ color: 0x87ceeb, alpha: 0.8 });
  drop.moveTo(0, -3).lineTo(-1.5, 0).lineTo(1.5, 0).closePath().fill({ color: 0x87ceeb, alpha: 0.7 });
  drop.position.set(x + 8, y - 5);
  parent.addChild(drop);
  particles.push({
    node: drop, vx: 0.3, vy: 0.8,
    life: 0, maxLife: 20, spin: 0, growth: 0, type: "sweat",
  });
}

/**
 * Update all particles: move, age, fade, destroy dead ones.
 */
export function updateParticles(particles: Particle[]): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life++;
    p.node.position.x += p.vx;
    p.node.position.y += p.vy;
    p.node.rotation += p.spin;
    p.node.scale.set(p.node.scale.x + p.growth);

    // Gravity for confetti
    if (p.type === "confetti") p.vy += 0.08;

    // Alpha decay
    const lifeRatio = p.life / p.maxLife;
    p.node.alpha = Math.max(0, 1 - lifeRatio * lifeRatio);

    if (p.life >= p.maxLife) {
      if (!p.node.destroyed) {
        p.node.parent?.removeChild(p.node);
        p.node.destroy();
      }
      particles.splice(i, 1);
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/office-view/particles.ts
git commit -m "feat: add reusable particle system (Zzz, sparkles, confetti, sweat)"
```

---

### Task 5: Wire particles into office ticker

**Files:**
- Modify: `src/components/office-view/officeTicker.ts`

- [ ] **Step 1: Import particle functions**

```typescript
import { emitSleepZzz, emitSweatDrop, updateParticles, type Particle } from "./particles";
```

- [ ] **Step 2: Add particle array to ticker context**

Add a `chaoParticlesRef` to the ticker context type. Initialize as empty array.

- [ ] **Step 3: Emit particles based on agent state**

In the animItems loop (where agent sprites are processed), add:

```typescript
// Every 40 frames, emit Zzz for sleeping/break agents
if (tick % 40 === 0 && agent.status === "break") {
  emitSleepZzz(item.container.parent, ctx.chaoParticlesRef.current, agentX, agentY - 30);
}

// Every 60 frames, emit sweat for frustrated agents
if (tick % 60 === 0 && agent.mood === "frustrated") {
  emitSweatDrop(item.container.parent, ctx.chaoParticlesRef.current, agentX, agentY - 20);
}
```

- [ ] **Step 4: Update particles each frame**

At the end of `runOfficeTickerStep`:

```typescript
updateParticles(ctx.chaoParticlesRef.current);
```

- [ ] **Step 5: Commit**

```bash
git add src/components/office-view/officeTicker.ts
git commit -m "feat: wire Zzz and sweat particles into office ticker"
```

---

## Chunk 3: Visual Feedback

### Task 6: Add mini-terminal on working agent desks

**Files:**
- Create: `src/components/office-view/drawing-desk-screen.ts`

- [ ] **Step 1: Create desk screen drawing function**

```typescript
// src/components/office-view/drawing-desk-screen.ts

import { Container, Graphics, Text, TextStyle } from "pixi.js";

/**
 * Draw a mini terminal/screen on an agent's desk showing recent output.
 * Returns the text node so it can be updated by the ticker.
 */
export function drawDeskScreen(
  parent: Container,
  x: number,
  y: number,
  outputText: string,
  isActive: boolean,
): { container: Container; textNode: Text } {
  const container = new Container();
  container.position.set(x, y);

  const screenW = 42;
  const screenH = 22;

  // Monitor frame
  const frame = new Graphics();
  frame.roundRect(-screenW / 2, -screenH, screenW, screenH, 2)
    .fill({ color: isActive ? 0x1a1a2e : 0x2a2a3a, alpha: 0.9 });
  frame.roundRect(-screenW / 2, -screenH, screenW, screenH, 2)
    .stroke({ width: 1, color: isActive ? 0x3b82f6 : 0x4a4a5a, alpha: 0.6 });
  container.addChild(frame);

  // Screen glow when active
  if (isActive) {
    const glow = new Graphics();
    glow.roundRect(-screenW / 2 - 2, -screenH - 2, screenW + 4, screenH + 4, 3)
      .fill({ color: 0x3b82f6, alpha: 0.08 });
    container.addChild(glow);
  }

  // Truncate output to fit
  const maxChars = 20;
  const lines = outputText.split("\n").slice(-2);
  const displayText = lines.map(l => l.slice(0, maxChars)).join("\n") || (isActive ? "working..." : "");

  const textNode = new Text({
    text: displayText,
    style: new TextStyle({
      fontSize: 5,
      fill: isActive ? 0x4ade80 : 0x6b7280,
      fontFamily: "monospace",
      lineHeight: 6,
    }),
  });
  textNode.anchor.set(0.5, 1);
  textNode.position.set(0, -2);
  container.addChild(textNode);

  parent.addChild(container);
  return { container, textNode };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/office-view/drawing-desk-screen.ts
git commit -m "feat: add mini-terminal desk screen drawing function"
```

---

### Task 7: Wire desk screens into department agent rendering

**Files:**
- Modify: `src/components/office-view/buildScene-department-agent.ts`

- [ ] **Step 1: Import desk screen**

```typescript
import { drawDeskScreen } from "./drawing-desk-screen";
```

- [ ] **Step 2: Add desk screen for working agents**

After the desk is drawn (after `drawDesk` call), add:

```typescript
// Mini terminal screen on desk for working agents
if (isWorking) {
  const lastOutput = (agent as any).lastOutput ?? "";
  drawDeskScreen(room, ax, deskY - 2, lastOutput, true);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/office-view/buildScene-department-agent.ts
git commit -m "feat: render mini-terminal screens on working agents' desks"
```

---

### Task 8: Add progress bar above working agents

**Files:**
- Create: `src/components/office-view/drawing-progress.ts`

- [ ] **Step 1: Create progress bar drawing function**

```typescript
// src/components/office-view/drawing-progress.ts

import { Container, Graphics } from "pixi.js";

/**
 * Draw a small progress bar above an agent.
 * progress: 0-1
 */
export function drawProgressBar(
  parent: Container,
  x: number,
  y: number,
  progress: number,
): Container {
  const container = new Container();
  container.position.set(x, y);

  const barW = 30;
  const barH = 4;

  // Background
  const bg = new Graphics();
  bg.roundRect(-barW / 2, 0, barW, barH, 2).fill({ color: 0x1e293b, alpha: 0.6 });
  container.addChild(bg);

  // Fill
  if (progress > 0) {
    const fill = new Graphics();
    const fillW = Math.max(2, barW * Math.min(1, progress));
    const color = progress >= 1 ? 0x22c55e : progress > 0.5 ? 0x3b82f6 : 0xeab308;
    fill.roundRect(-barW / 2 + 1, 1, fillW - 2, barH - 2, 1).fill({ color, alpha: 0.85 });
    container.addChild(fill);
  }

  parent.addChild(container);
  return container;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/office-view/drawing-progress.ts
git commit -m "feat: add progress bar drawing function for working agents"
```

---

### Task 9: Handle celebration events (sparkles on task complete)

**Files:**
- Modify: `src/app/useRealtimeSync.ts`

- [ ] **Step 1: Handle agent_leveled_up with celebration state**

In `useRealtimeSync.ts`, the `agent_leveled_up` event is already in WSEventType. Add handler:

```typescript
on("agent_leveled_up", (payload: unknown) => {
  const p = payload as { agentId: string; newLevel: number };
  // Mark agent for celebration animation (office view will emit sparkles)
  setAgents((prev) => prev.map(a =>
    a.id === p.agentId ? { ...a, _celebrating: true, level: p.newLevel } : a
  ));
  // Clear celebration flag after 3 seconds
  setTimeout(() => {
    setAgents((prev) => prev.map(a =>
      a.id === p.agentId ? { ...a, _celebrating: false } : a
    ));
  }, 3000);
}),
```

- [ ] **Step 2: Commit**

```bash
git add src/app/useRealtimeSync.ts
git commit -m "feat: handle agent_leveled_up event with celebration state"
```

---

### Task 10: Final Phase 3 integration test

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Vite build**

```bash
npx vite build
```

- [ ] **Step 3: Manual verification**

1. Day/night overlay tints the background over time (fast-test: set cycle to 2 minutes)
2. Sleeping agents in break room show floating "z" particles
3. Frustrated agents show sweat drops
4. Working agents have mini-terminal screens on desks
5. Level-up triggers sparkle effect

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "fix: phase 3 integration cleanup"
git push origin main
```

---

## Summary

**Phase 3 delivers:**
- Day/night cycle: 6hr real-time, 4 phases (dawn/day/dusk/night), smooth color interpolation
- Ambient overlay: per-frame sky tint + darkness alpha
- Time-of-day indicator: emoji in CEO office
- Particle system: Zzz (sleep), sparkles (celebrate), confetti (ship), sweat (error)
- Mini-terminal: working agents show last output on desk screens
- Progress bars: visual task completion indicator
- Level-up celebrations: sparkle burst on XP milestone

**Next:** Phase 4 plan (Chao Garden reskin, custom sprites, Chao creator, sound effects)
