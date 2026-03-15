import { Container, Graphics, Text, TextStyle } from "pixi.js";

const MOOD_COLORS: Record<string, number> = {
  happy: 0x22c55e,
  focused: 0x3b82f6,
  tired: 0xeab308,
  frustrated: 0xef4444,
  excited: 0xec4899,
  curious: 0xa855f7,
};

/**
 * Creates a floating mood indicator orb above a Chao's head.
 * Returns the container so callers can animate it.
 */
function drawMoodOrb(parent: Container, x: number, y: number, mood: string): Container {
  const color = MOOD_COLORS[mood] ?? 0x94a3b8;
  const orb = new Container();
  orb.position.set(x, y - 20);

  const g = new Graphics();
  // Outer glow
  g.circle(0, 0, 7).fill({ color, alpha: 0.2 });
  // Inner orb
  g.circle(0, 0, 4).fill({ color, alpha: 0.85 });
  g.circle(0, 0, 4).stroke({ width: 0.6, color: 0xffffff });
  // Highlight dot
  g.circle(-1.5, -1.5, 1.2).fill({ color: 0xffffff, alpha: 0.6 });
  orb.addChild(g);

  parent.addChild(orb);
  return orb;
}

/**
 * Draw a small "Lv5" badge below the agent.
 */
function drawLevelBadge(parent: Container, x: number, y: number, level: number): void {
  const g = new Graphics();
  g.roundRect(x - 10, y, 20, 10, 3).fill({ color: 0x1e293b, alpha: 0.7 });
  parent.addChild(g);

  const label = new Text({
    text: `Lv${level}`,
    style: new TextStyle({ fontSize: 7, fill: 0xe2e8f0, fontWeight: "bold" }),
  });
  label.anchor.set(0.5, 0);
  label.position.set(x, y);
  parent.addChild(label);
}

export { drawMoodOrb, drawLevelBadge };
