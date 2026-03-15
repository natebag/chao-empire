# Chao Empire Phase 4: Polish & Scale — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the office to look like a Chao Garden (SA2B-inspired), add a Chao creator UI with color/accessory/personality picker, add provider health dashboard, and optimize for 20+ agents.

**Architecture:** Replace the corporate office color palette with Chao Garden earthy/natural tones (grass greens, sky blues, warm woods). Swap tile patterns to grass textures. Add a Chao creator section to the agent form modal. Build a provider health panel into the dashboard. Optimize PixiJS rendering with container pooling and visibility culling.

**Tech Stack:** PixiJS 8, React 19, Tailwind CSS, Express 5, SQLite

**Spec:** `docs/superpowers/specs/2026-03-15-chao-empire-design.md` (Sections 2, 6, Phase 4)

---

## Chunk 1: Chao Garden Reskin

### Task 1: Replace color palettes with Chao Garden theme

**Files:**
- Modify: `src/components/office-view/themes-locale.ts`

- [ ] **Step 1: Replace OFFICE_PASTEL_LIGHT with Chao Garden colors**

Replace the light palette (lines 6-17) with earthy/garden tones:

```typescript
const OFFICE_PASTEL_LIGHT = {
  creamWhite: 0xe8f5e0,    // soft garden green (was cream)
  creamDeep: 0xd4e8c8,     // deeper garden green
  softMint: 0x8bc4a0,      // garden mint
  softMintDeep: 0x6aab82,  // deeper mint
  dustyRose: 0xdbb08a,     // warm wood
  dustyRoseDeep: 0xc49a6e, // deeper wood
  warmSand: 0xc8b890,      // sandy path
  warmWood: 0xa8906a,      // garden wood
  cocoa: 0x5a3d28,         // dark bark
  ink: 0x2a3020,           // dark forest text
  slate: 0x4a6050,         // muted forest gray-green
};
```

- [ ] **Step 2: Replace DEFAULT_CEO_THEME_LIGHT with garden gazebo theme**

```typescript
const DEFAULT_CEO_THEME_LIGHT: RoomTheme = {
  floor1: 0xc8d8a8,  // garden grass light
  floor2: 0xb8c898,  // garden grass dark
  wall: 0x7a9a5a,    // hedge green
  accent: 0x8ab040,  // vibrant garden green
};
```

- [ ] **Step 3: Replace DEFAULT_BREAK_THEME_LIGHT with garden pond theme**

```typescript
const DEFAULT_BREAK_THEME_LIGHT: RoomTheme = {
  floor1: 0xa8d0e0,  // shallow water blue
  floor2: 0x98c0d4,  // deeper water blue
  wall: 0x6a9aaa,    // pond edge
  accent: 0x40a0c0,  // clear water accent
};
```

- [ ] **Step 4: Replace DEPT_THEME_LIGHT with garden-themed departments**

```typescript
const DEPT_THEME_LIGHT: Record<string, RoomTheme> = {
  dev:        { floor1: 0xc0d8a0, floor2: 0xb0c890, wall: 0x6a8a50, accent: 0x4a8a30 },  // forest clearing
  design:     { floor1: 0xe0c8e0, floor2: 0xd4b8d4, wall: 0x8a6a8a, accent: 0xa060a0 },  // flower garden
  planning:   { floor1: 0xe8d8a8, floor2: 0xdccda0, wall: 0x9a8a60, accent: 0xc0a040 },  // sunlit meadow
  operations: { floor1: 0xa8d4b8, floor2: 0x98c8a8, wall: 0x5a8a6a, accent: 0x40a060 },  // herb garden
  qa:         { floor1: 0xe0b8a0, floor2: 0xd4a890, wall: 0x8a6a50, accent: 0xc06030 },  // autumn garden
  devsecops:  { floor1: 0xb8c8d8, floor2: 0xa8b8c8, wall: 0x6a7a8a, accent: 0x5080a0 },  // stone garden
};
```

- [ ] **Step 5: Commit**

```bash
git add src/components/office-view/themes-locale.ts
git commit -m "reskin: replace corporate palette with Chao Garden colors"
```

---

### Task 2: Replace background with garden/sky theme

**Files:**
- Modify: `src/components/office-view/buildScene-ceo-hallway.ts`

- [ ] **Step 1: Update background colors for garden outdoor feel**

Replace the background constants (around line 57-62):

```typescript
const bgFill = isDark ? 0x0a1a0e : 0xd4e8c8;         // garden green (was cream)
const bgGradFrom = isDark ? 0x0e2214 : 0xe0f0d8;      // lighter garden
const bgGradTo = isDark ? 0x081208 : 0xc8dab8;         // deeper garden
const bgStrokeInner = isDark ? 0x1a3a20 : 0xa8c098;    // garden fence
const bgStrokeOuter = isDark ? 0x142a18 : 0xb0c8a0;    // outer fence
const bgDotColor = isDark ? 0x1a3a20 : 0x90b080;       // grass specks
```

- [ ] **Step 2: Commit**

```bash
git add src/components/office-view/buildScene-ceo-hallway.ts
git commit -m "reskin: garden/nature background colors (grass green + sky)"
```

---

### Task 3: Replace tile floor with grass pattern

**Files:**
- Modify: `src/components/office-view/drawing-core.ts`

- [ ] **Step 1: Add grass detail to tile floor**

In `drawTiledFloor`, after the base tile is drawn, add subtle grass blades:

```typescript
// After the existing tile drawing, add grass detail when colors are green-ish
const isGreenish = ((c1 >> 8) & 0xff) > ((c1 >> 16) & 0xff); // green channel > red
if (isGreenish) {
  // Small grass blade marks
  for (let b = 0; b < 3; b++) {
    const bx = x + tx + 3 + b * 6 + (ty % 3);
    const by = y + ty + TILE - 2 - (b % 2) * 3;
    g.moveTo(bx, by).lineTo(bx - 1, by - 3).lineTo(bx + 1, by - 2)
      .fill({ color: isEven ? c2 : c1, alpha: 0.25 });
  }
}
```

- [ ] **Step 2: Update wall shadow colors to earthy tones**

Replace the hardcoded shadow color `0x8a7a60` with a contextual blend:

```typescript
const shadowColor = isGreenish ? 0x4a6a40 : 0x8a7a60;
```

- [ ] **Step 3: Commit**

```bash
git add src/components/office-view/drawing-core.ts
git commit -m "reskin: add grass texture to tile floors, earthy shadow tones"
```

---

### Task 4: Update special rooms with garden themes

**Files:**
- Modify: `src/components/office-view/buildScene-special-rooms.ts`

- [ ] **Step 1: Replace gym theme with Training Grounds colors**

```typescript
const GYM_THEME: RoomTheme = {
  floor1: 0xc8b888,  // sandy training ground
  floor2: 0xb8a878,  // packed dirt
  wall: 0x8a7a5a,    // wooden fence
  accent: 0xc09030,  // warm amber
};
```

- [ ] **Step 2: Replace library theme with Ancient Tree colors**

```typescript
const LIBRARY_THEME: RoomTheme = {
  floor1: 0xa0b898,  // mossy stone
  floor2: 0x90a888,  // deeper moss
  wall: 0x5a6a50,    // old bark
  accent: 0x80a060,  // leafy green
};
```

- [ ] **Step 3: Replace server room theme with Crystal Cave colors**

```typescript
const SERVER_THEME: RoomTheme = {
  floor1: 0x889cb8,  // cool crystal blue
  floor2: 0x788ca8,  // deeper crystal
  wall: 0x4a6080,    // cave wall
  accent: 0x60a0d0,  // crystal glow
};
```

- [ ] **Step 4: Update room labels to garden names**

```typescript
// Gym → "Training Grounds 💪"
// Library → "Ancient Tree 📚"
// Server Room → "Crystal Cave 🖥️"
```

- [ ] **Step 5: Commit**

```bash
git add src/components/office-view/buildScene-special-rooms.ts
git commit -m "reskin: garden-themed special rooms (Training Grounds, Ancient Tree, Crystal Cave)"
```

---

## Chunk 2: Chao Creator UI

### Task 5: Add Chao appearance constants

**Files:**
- Modify: `src/components/agent-manager/constants.ts`

- [ ] **Step 1: Add Chao color and accessory options**

```typescript
export const CHAO_COLORS = [
  { id: "blue", label: "Normal Blue", hex: "#64B5F6" },
  { id: "green", label: "Swim Green", hex: "#81C784" },
  { id: "red", label: "Power Red", hex: "#E57373" },
  { id: "yellow", label: "Fly Yellow", hex: "#FFD54F" },
  { id: "purple", label: "Run Purple", hex: "#CE93D8" },
  { id: "orange", label: "Hero Orange", hex: "#FFB74D" },
  { id: "dark", label: "Dark Chao", hex: "#455A64" },
  { id: "white", label: "Angel Chao", hex: "#F5F5F5" },
  { id: "pink", label: "Berry Pink", hex: "#F48FB1" },
  { id: "gold", label: "Chaos Gold", hex: "#FFC107" },
];

export const CHAO_ACCESSORIES = [
  { id: "none", label: "None", emoji: "" },
  { id: "hat", label: "Top Hat", emoji: "🎩" },
  { id: "glasses", label: "Glasses", emoji: "👓" },
  { id: "headphones", label: "Headphones", emoji: "🎧" },
  { id: "bowtie", label: "Bow Tie", emoji: "🎀" },
  { id: "crown", label: "Crown", emoji: "👑" },
  { id: "bandana", label: "Bandana", emoji: "🧣" },
  { id: "flower", label: "Flower", emoji: "🌸" },
];

export const CHAO_PERSONALITIES = [
  { id: "diligent", label: "Diligent", desc: "Works steadily, rarely takes breaks" },
  { id: "curious", label: "Curious", desc: "Loves research, asks lots of questions" },
  { id: "social", label: "Social", desc: "Chats often, great at collaboration" },
  { id: "perfectionist", label: "Perfectionist", desc: "Slow but thorough, high quality" },
  { id: "speedster", label: "Speedster", desc: "Fast but sometimes misses details" },
  { id: "creative", label: "Creative", desc: "Unexpected solutions, design-focused" },
];
```

- [ ] **Step 2: Add sprite_config defaults to BLANK**

```typescript
// Add to BLANK FormData:
chao_color: "blue",
chao_accessory: "none",
chao_personality: "diligent",
```

- [ ] **Step 3: Commit**

```bash
git add src/components/agent-manager/constants.ts
git commit -m "feat: add Chao color, accessory, and personality constants"
```

---

### Task 6: Add Chao creator section to AgentFormModal

**Files:**
- Modify: `src/components/agent-manager/AgentFormModal.tsx`
- Modify: `src/components/agent-manager/types.ts`

- [ ] **Step 1: Add Chao fields to FormData type**

```typescript
// In types.ts, add to FormData:
chao_color: string;
chao_accessory: string;
chao_personality: string;
```

- [ ] **Step 2: Add Chao Creator section to the form**

Add a new section before the Model Configuration details:

```tsx
{/* ── Chao Identity ── */}
<div className="space-y-3">
  <h4 className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
    Chao Identity
  </h4>

  {/* Color picker — grid of colored circles */}
  <div>
    <label className="text-xs mb-1 block">Color</label>
    <div className="flex flex-wrap gap-2">
      {CHAO_COLORS.map(c => (
        <button
          key={c.id}
          className={`w-7 h-7 rounded-full border-2 transition-all ${form.chao_color === c.id ? "border-white scale-110" : "border-transparent opacity-70 hover:opacity-100"}`}
          style={{ backgroundColor: c.hex }}
          onClick={() => setForm(f => ({ ...f, chao_color: c.id }))}
          title={c.label}
        />
      ))}
    </div>
  </div>

  {/* Accessory picker */}
  <div>
    <label className="text-xs mb-1 block">Accessory</label>
    <div className="flex flex-wrap gap-2">
      {CHAO_ACCESSORIES.map(a => (
        <button
          key={a.id}
          className={`px-2 py-1 rounded text-sm transition-all ${form.chao_accessory === a.id ? "ring-2 ring-white bg-white/10" : "opacity-70 hover:opacity-100"}`}
          onClick={() => setForm(f => ({ ...f, chao_accessory: a.id }))}
        >
          {a.emoji || "❌"} {a.label}
        </button>
      ))}
    </div>
  </div>

  {/* Personality picker */}
  <div>
    <label className="text-xs mb-1 block">Personality</label>
    <select
      className={inputCls}
      style={inputStyle}
      value={form.chao_personality}
      onChange={e => setForm(f => ({ ...f, chao_personality: e.target.value }))}
    >
      {CHAO_PERSONALITIES.map(p => (
        <option key={p.id} value={p.id}>{p.label} — {p.desc}</option>
      ))}
    </select>
  </div>
</div>
```

- [ ] **Step 3: Wire Chao fields to sprite_config on save**

In `AgentManager.tsx` handleSave, construct sprite_config:

```typescript
const sprite_config = {
  color: form.chao_color,
  accessory: form.chao_accessory,
  personality: form.chao_personality,
  evolution_stage: 1,
};
// Include in API payload
```

- [ ] **Step 4: Pre-fill Chao fields on edit**

In openEdit, extract from agent.sprite_config:

```typescript
const sc = agent.sprite_config ?? {};
chao_color: sc.color ?? "blue",
chao_accessory: sc.accessory ?? "none",
chao_personality: sc.personality ?? "diligent",
```

- [ ] **Step 5: Commit**

```bash
git add src/components/agent-manager/
git commit -m "feat: add Chao creator UI (color picker, accessories, personality)"
```

---

## Chunk 3: Provider Health Dashboard

### Task 7: Add provider health panel to Dashboard

**Files:**
- Create: `src/components/dashboard/ProviderHealthPanel.tsx`
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Create ProviderHealthPanel component**

```tsx
// src/components/dashboard/ProviderHealthPanel.tsx

import { useEffect, useState } from "react";
import * as api from "../../api";

interface ProviderHealth {
  provider: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  lastCheckAt: number | null;
  avgResponseMs: number;
  errorCount24h: number;
  lastErrorMessage: string | null;
}

const STATUS_COLORS = {
  healthy: "bg-green-500",
  degraded: "bg-yellow-500",
  down: "bg-red-500",
  unknown: "bg-gray-500",
};

const STATUS_LABELS = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  unknown: "Unknown",
};

export default function ProviderHealthPanel() {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);

  useEffect(() => {
    async function fetchHealth() {
      try {
        const res = await fetch("/api/models/health");
        const data = await res.json();
        setProviders(data.providers ?? []);
      } catch { /* non-critical */ }
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 30_000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (providers.length === 0) {
    return (
      <div className="rounded-lg p-4" style={{ background: "var(--bg-card)" }}>
        <h3 className="text-sm font-bold mb-2">Provider Health</h3>
        <p className="text-xs opacity-60">No provider data yet. Run some tasks first.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4" style={{ background: "var(--bg-card)" }}>
      <h3 className="text-sm font-bold mb-3">Provider Health</h3>
      <div className="space-y-2">
        {providers.map(p => (
          <div key={p.provider} className="flex items-center gap-3 text-xs">
            <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[p.status]}`} />
            <span className="font-medium w-24 truncate">{p.provider}</span>
            <span className="opacity-60">{STATUS_LABELS[p.status]}</span>
            <span className="opacity-40 ml-auto">
              {p.avgResponseMs > 0 ? `${p.avgResponseMs}ms avg` : "—"}
            </span>
            {p.errorCount24h > 0 && (
              <span className="text-red-400">{p.errorCount24h} errors</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add ProviderHealthPanel to Dashboard**

In `Dashboard.tsx`, import and add after the existing stats panels:

```typescript
import ProviderHealthPanel from "./dashboard/ProviderHealthPanel";

// In the JSX, add:
<ProviderHealthPanel />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/ src/components/Dashboard.tsx
git commit -m "feat: add provider health dashboard panel"
```

---

## Chunk 4: Performance & Final Polish

### Task 8: Optimize PixiJS rendering for 20+ agents

**Files:**
- Modify: `src/components/office-view/officeTicker.ts`
- Modify: `src/components/office-view/buildScene-department-agent.ts`

- [ ] **Step 1: Add visibility culling**

In `officeTicker.ts`, skip animating agents that are off-screen:

```typescript
// At start of animItems loop, skip off-screen items
const scrollY = ctx.scrollYRef?.current ?? 0;
const viewHeight = ctx.viewHeightRef?.current ?? 800;
for (const item of ctx.animItemsRef.current) {
  const agentY = item.container.position.y;
  const isVisible = agentY > scrollY - 100 && agentY < scrollY + viewHeight + 100;
  if (!isVisible) {
    // Skip expensive per-frame updates for off-screen agents
    continue;
  }
  // ... existing animation code
}
```

- [ ] **Step 2: Throttle particle emissions**

Reduce particle frequency when agent count is high:

```typescript
const agentCount = ctx.animItemsRef.current.length;
const particleThrottle = agentCount > 15 ? 120 : agentCount > 10 ? 80 : 40;

// Use particleThrottle instead of hardcoded frame intervals
if (tick % particleThrottle === 0 && agent.status === "break") {
  emitSleepZzz(...);
}
```

- [ ] **Step 3: Limit max active particles**

In `updateParticles`, add a cap:

```typescript
const MAX_PARTICLES = 100;
if (particles.length > MAX_PARTICLES) {
  // Force-kill oldest particles
  const excess = particles.length - MAX_PARTICLES;
  for (let i = 0; i < excess; i++) {
    const p = particles[i];
    if (!p.node.destroyed) {
      p.node.parent?.removeChild(p.node);
      p.node.destroy();
    }
  }
  particles.splice(0, excess);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/office-view/officeTicker.ts src/components/office-view/buildScene-department-agent.ts
git commit -m "perf: visibility culling, particle throttling, max particle cap"
```

---

### Task 9: Final Phase 4 integration test

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Vite build**

```bash
npx vite build
```

- [ ] **Step 3: Manual verification**

1. Office has green/garden color scheme (grass floors, garden tones)
2. Creating agent shows Chao creator (color circles, accessories, personality)
3. Dashboard shows provider health panel
4. Office performs smoothly with 15+ agents
5. Particles don't overwhelm with many agents

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "fix: phase 4 integration cleanup"
git push origin main
```

---

## Summary

**Phase 4 delivers:**
- **Chao Garden reskin**: grass green palette, earthy tones, garden-themed rooms (Training Grounds, Ancient Tree, Crystal Cave)
- **Background**: outdoor garden feel with green gradients and grass specks
- **Grass tiles**: subtle grass blade details on green floors
- **Chao creator**: color picker (10 colors), accessory picker (8 options), personality selector (6 types)
- **Provider health dashboard**: live status indicators, response times, error counts
- **Performance optimization**: visibility culling, particle throttling, particle cap

**Total project deliverables across all 4 phases:**
- Modular model router with fallback chains
- 7-room system with task-based routing
- Mood engine (6 moods + energy + XP/leveling)
- Inter-agent idle chat
- CEO escalation
- Day/night cycle (6hr)
- Particle effects (Zzz, sparkles, confetti, sweat)
- Desk screens + progress bars
- Agent memory system
- Chao Garden visual theme
- Chao creator UI
- Provider health dashboard
- Performance optimizations
