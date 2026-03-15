import { Container, Graphics } from "pixi.js";

/**
 * Draw a small progress bar above an agent.
 * Color changes based on progress: yellow (<50%), blue (50-99%), green (100%).
 */
function drawProgressBar(
  parent: Container,
  x: number,
  y: number,
  progress: number,
): Container {
  const bar = new Container();
  bar.position.set(x, y);

  const totalW = 30;
  const totalH = 4;
  const radius = 2;

  const g = new Graphics();

  // Background track
  g.roundRect(0, 0, totalW, totalH, radius).fill({
    color: 0x1e293b,
    alpha: 0.6,
  });

  // Fill color based on progress
  const clamped = Math.max(0, Math.min(100, progress));
  let fillColor: number;
  if (clamped >= 100) {
    fillColor = 0x22c55e; // green
  } else if (clamped >= 50) {
    fillColor = 0x3b82f6; // blue
  } else {
    fillColor = 0xeab308; // yellow
  }

  // Fill width (min 2px when progress > 0)
  const fillW = clamped > 0 ? Math.max(2, (clamped / 100) * totalW) : 0;

  if (fillW > 0) {
    g.roundRect(0, 0, fillW, totalH, radius).fill(fillColor);
  }

  bar.addChild(g);
  parent.addChild(bar);
  return bar;
}

export { drawProgressBar };
