// dayNightCycle.ts — 6-hour real-time day/night cycle with 4 phases

export type TimeOfDay = "dawn" | "day" | "dusk" | "night";

export interface DayNightState {
  phase: TimeOfDay;
  /** Progress within the current phase, 0-1 */
  progress: number;
  /** Progress through the full cycle, 0-1 */
  cycleProgress: number;
  /** Sky tint as a hex color number */
  skyTint: number;
  /** Ambient darkness overlay alpha, 0-1 */
  ambientAlpha: number;
  /** Whether the current phase is night */
  isNight: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CYCLE_DURATION_MS = 6 * 60 * 60 * 1000;

const PHASE_SKY_COLORS: Record<TimeOfDay, [number, number]> = {
  dawn: [0x2d1b4e, 0xf5a623],
  day: [0xf5a623, 0x87ceeb],
  dusk: [0x87ceeb, 0xe8651a],
  night: [0xe8651a, 0x0a0a2e],
};

const PHASE_AMBIENT_ALPHA: Record<TimeOfDay, [number, number]> = {
  dawn: [0.3, 0],
  day: [0, 0],
  dusk: [0, 0.25],
  night: [0.25, 0.35],
};

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let cycleStartTime = Date.now();
let cycleDurationMs = DEFAULT_CYCLE_DURATION_MS;

// ---------------------------------------------------------------------------
// Helpers (not exported)
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff;
  const g1 = (c1 >> 8) & 0xff;
  const b1 = c1 & 0xff;

  const r2 = (c2 >> 16) & 0xff;
  const g2 = (c2 >> 8) & 0xff;
  const b2 = c2 & 0xff;

  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));

  return (r << 16) | (g << 8) | b;
}

// ---------------------------------------------------------------------------
// Phase resolution
// ---------------------------------------------------------------------------

const PHASES: TimeOfDay[] = ["dawn", "day", "dusk", "night"];

function resolvePhase(cycleProgress: number): { phase: TimeOfDay; progress: number } {
  // dawn 0-25%, day 25-50%, dusk 50-75%, night 75-100%
  const index = Math.min(Math.floor(cycleProgress * 4), 3);
  const phase = PHASES[index];
  const progress = (cycleProgress - index * 0.25) / 0.25;
  return { phase, progress: Math.min(Math.max(progress, 0), 1) };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getDayNightState(): DayNightState {
  const elapsed = Date.now() - cycleStartTime;
  const cycleProgress = (elapsed % cycleDurationMs) / cycleDurationMs;

  const { phase, progress } = resolvePhase(cycleProgress);

  const [skyFrom, skyTo] = PHASE_SKY_COLORS[phase];
  const [alphaFrom, alphaTo] = PHASE_AMBIENT_ALPHA[phase];

  return {
    phase,
    progress,
    cycleProgress,
    skyTint: lerpColor(skyFrom, skyTo, progress),
    ambientAlpha: lerp(alphaFrom, alphaTo, progress),
    isNight: phase === "night",
  };
}

export function setCycleDuration(ms: number): void {
  cycleDurationMs = ms;
}

export function resetCycle(): void {
  cycleStartTime = Date.now();
}
