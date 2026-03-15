import { Container, Graphics } from "pixi.js";

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<string, number> = {
  blue: 0x64b5f6,
  green: 0x81c784,
  red: 0xe57373,
  yellow: 0xffd54f,
  purple: 0xce93d8,
  orange: 0xffb74d,
  dark: 0x455a64,
  white: 0xeceff1,
  pink: 0xf48fb1,
  gold: 0xffc107,
};

const DEFAULT_COLOR = 0x64b5f6;

// ---------------------------------------------------------------------------
// Tiny color helpers (avoid external deps)
// ---------------------------------------------------------------------------

function lighten(c: number, amount: number): number {
  let r = (c >> 16) & 0xff;
  let g = (c >> 8) & 0xff;
  let b = c & 0xff;
  r = Math.min(255, r + Math.round((255 - r) * amount));
  g = Math.min(255, g + Math.round((255 - g) * amount));
  b = Math.min(255, b + Math.round((255 - b) * amount));
  return (r << 16) | (g << 8) | b;
}

function darken(c: number, amount: number): number {
  let r = (c >> 16) & 0xff;
  let g = (c >> 8) & 0xff;
  let b = c & 0xff;
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return (r << 16) | (g << 8) | b;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Draw a Chao character programmatically using PixiJS Graphics.
 *
 * The character is anchored at bottom-center: feet sit at y = 0,
 * body extends upward into negative y.
 *
 * @param color      – color id from CHAO_COLORS (e.g. "blue", "red", "dark")
 * @param accessory  – accessory id from CHAO_ACCESSORIES
 * @param direction  – "D" (front), "L" (left profile), "R" (right profile)
 * @param frame      – animation frame 1 | 2 | 3 (walk cycle)
 * @param size       – target height in pixels (default 52, matching TARGET_CHAR_H)
 */
export function drawChaoCharacter(
  color: string,
  accessory: string,
  direction: "D" | "L" | "R" = "D",
  frame: number = 1,
  size: number = 52,
): Container {
  const container = new Container();
  const s = size / 52; // universal scale factor (design at 52px)

  const baseColor = COLOR_MAP[color] ?? DEFAULT_COLOR;
  const lightColor = lighten(baseColor, 0.35);
  const darkColor = darken(baseColor, 0.2);

  // ------------------------------------------------------------------
  // Coordinate reference (design space at size=52, y grows downward)
  //   feet at y=0, body center around y=-22, head top around y=-38
  // ------------------------------------------------------------------

  const bodyR = 16 * s;       // body radius
  const bodyCX = 0;
  const bodyCY = -20 * s;     // body center

  // ── Feet ──────────────────────────────────────────────────────────
  drawFeet(container, s, darkColor, direction, frame);

  // ── Body ──────────────────────────────────────────────────────────
  const body = new Graphics();
  body.ellipse(bodyCX, bodyCY, bodyR, bodyR * 1.05).fill(baseColor);
  container.addChild(body);

  // Body highlight (3D-ish sheen)
  const hl = new Graphics();
  hl.ellipse(bodyCX - 5 * s, bodyCY - 5 * s, bodyR * 0.5, bodyR * 0.45).fill({
    color: 0xffffff,
    alpha: 0.3,
  });
  container.addChild(hl);

  // ── Wing nubs ─────────────────────────────────────────────────────
  drawWings(container, s, bodyCY, lightColor, direction);

  // ── Face ──────────────────────────────────────────────────────────
  drawFace(container, s, bodyCY, direction);

  // ── Emotion ball (head ball) ──────────────────────────────────────
  drawHeadBall(container, s, lightColor);

  // ── Accessory ─────────────────────────────────────────────────────
  drawAccessory(container, s, bodyCY, accessory, direction);

  return container;
}

// ---------------------------------------------------------------------------
// Sub-drawing functions
// ---------------------------------------------------------------------------

function drawFeet(
  parent: Container,
  s: number,
  footColor: number,
  direction: "D" | "L" | "R",
  frame: number,
) {
  const g = new Graphics();

  // Walk offsets: frame 1 = neutral, frame 2 = left forward, frame 3 = right forward
  let leftDx = 0;
  let rightDx = 0;
  if (frame === 2) {
    leftDx = -2 * s;
    rightDx = 2 * s;
  } else if (frame === 3) {
    leftDx = 2 * s;
    rightDx = -2 * s;
  }

  const footW = 6 * s;
  const footH = 3.5 * s;
  const spread = 7 * s;

  if (direction === "D") {
    // Front-facing: two feet visible
    g.ellipse(-spread + leftDx, -footH / 2, footW, footH).fill(footColor);
    g.ellipse(spread + rightDx, -footH / 2, footW, footH).fill(footColor);
  } else if (direction === "L") {
    g.ellipse(-3 * s + leftDx, -footH / 2, footW, footH).fill(footColor);
    g.ellipse(3 * s + rightDx, -footH / 2, footW * 0.7, footH).fill(footColor);
  } else {
    // R — mirror of L
    g.ellipse(3 * s + rightDx, -footH / 2, footW, footH).fill(footColor);
    g.ellipse(-3 * s + leftDx, -footH / 2, footW * 0.7, footH).fill(footColor);
  }

  parent.addChild(g);
}

function drawWings(
  parent: Container,
  s: number,
  bodyCY: number,
  wingColor: number,
  direction: "D" | "L" | "R",
) {
  const g = new Graphics();
  const wingY = bodyCY - 2 * s;
  const wingSize = 6 * s;

  const drawNub = (cx: number, flip: number) => {
    g.moveTo(cx, wingY - wingSize * 0.5)
      .lineTo(cx + flip * wingSize * 1.2, wingY)
      .lineTo(cx, wingY + wingSize * 0.5)
      .fill({ color: wingColor, alpha: 0.85 });
  };

  if (direction === "D") {
    drawNub(-16 * s, -1);
    drawNub(16 * s, 1);
  } else if (direction === "L") {
    // Only right nub visible on left-facing
    drawNub(14 * s, 1);
  } else {
    drawNub(-14 * s, -1);
  }

  parent.addChild(g);
}

function drawFace(
  parent: Container,
  s: number,
  bodyCY: number,
  direction: "D" | "L" | "R",
) {
  const g = new Graphics();
  const eyeColor = 0x1a1a2e;
  const highlightColor = 0xffffff;

  if (direction === "D") {
    // ── Two eyes ──
    const eyeY = bodyCY - 2 * s;
    const eyeSpread = 6 * s;
    const eyeW = 3.2 * s;
    const eyeH = 4 * s;

    // Left eye
    g.ellipse(-eyeSpread, eyeY, eyeW, eyeH).fill(eyeColor);
    g.circle(-eyeSpread + 1 * s, eyeY - 1.2 * s, 1.2 * s).fill(highlightColor);

    // Right eye
    g.ellipse(eyeSpread, eyeY, eyeW, eyeH).fill(eyeColor);
    g.circle(eyeSpread + 1 * s, eyeY - 1.2 * s, 1.2 * s).fill(highlightColor);

    // ── Mouth (small smile arc) ──
    const mouthY = bodyCY + 5 * s;
    g.moveTo(-3 * s, mouthY)
      .quadraticCurveTo(0, mouthY + 3 * s, 3 * s, mouthY)
      .stroke({ width: 1.2 * s, color: eyeColor, alpha: 0.6 });
  } else {
    // Profile: one visible eye
    const flip = direction === "L" ? -1 : 1;
    const eyeX = flip * 3 * s;
    const eyeY = bodyCY - 2 * s;
    const eyeW = 3 * s;
    const eyeH = 4 * s;

    g.ellipse(eyeX, eyeY, eyeW, eyeH).fill(eyeColor);
    g.circle(eyeX + 1 * s, eyeY - 1.2 * s, 1.2 * s).fill(highlightColor);

    // Profile mouth
    const mouthY = bodyCY + 5 * s;
    const mx = flip * 6 * s;
    g.moveTo(mx - flip * 2 * s, mouthY)
      .quadraticCurveTo(mx, mouthY + 2 * s, mx + flip * 1 * s, mouthY)
      .stroke({ width: 1.2 * s, color: eyeColor, alpha: 0.6 });
  }

  parent.addChild(g);
}

function drawHeadBall(parent: Container, s: number, ballColor: number) {
  const g = new Graphics();

  const ballRadius = 3 * s;
  const stalkTopY = -40 * s;
  const stalkBottomY = -35 * s;

  // Thin stalk line
  g.moveTo(0, stalkBottomY)
    .lineTo(0, stalkTopY)
    .stroke({ width: 0.8 * s, color: 0x999999, alpha: 0.6 });

  // Emotion ball
  g.circle(0, stalkTopY - ballRadius * 0.3, ballRadius).fill(ballColor);

  // Tiny highlight on the ball
  g.circle(-0.8 * s, stalkTopY - ballRadius * 0.3 - 1 * s, ballRadius * 0.35).fill({
    color: 0xffffff,
    alpha: 0.5,
  });

  parent.addChild(g);
}

// ---------------------------------------------------------------------------
// Accessories
// ---------------------------------------------------------------------------

function drawAccessory(
  parent: Container,
  s: number,
  bodyCY: number,
  accessory: string,
  direction: "D" | "L" | "R",
) {
  if (accessory === "none" || !accessory) return;

  const g = new Graphics();
  const headTop = bodyCY - 16 * s; // approximate top of head

  switch (accessory) {
    case "hat": {
      // Top hat
      const hatW = 10 * s;
      const hatH = 9 * s;
      const brimW = 14 * s;
      const brimH = 2.5 * s;
      const hatX = -hatW / 2;
      const hatY = headTop - hatH;

      g.rect(hatX, hatY, hatW, hatH).fill(0x2c2c2c);
      g.rect(-brimW / 2, headTop - brimH / 2, brimW, brimH).fill(0x1a1a1a);
      // Ribbon
      g.rect(hatX, hatY + hatH * 0.6, hatW, 2 * s).fill(0xc62828);
      break;
    }
    case "glasses": {
      // Two circles connected by line across eyes
      const eyeY = bodyCY - 2 * s;
      const spread = 6 * s;
      const glassR = 4.5 * s;

      g.circle(-spread, eyeY, glassR).stroke({ width: 1 * s, color: 0x333333 });
      g.circle(spread, eyeY, glassR).stroke({ width: 1 * s, color: 0x333333 });
      // Bridge
      g.moveTo(-spread + glassR, eyeY)
        .lineTo(spread - glassR, eyeY)
        .stroke({ width: 0.8 * s, color: 0x333333 });
      // Temples (arms)
      if (direction === "D") {
        g.moveTo(-spread - glassR, eyeY)
          .lineTo(-spread - glassR - 3 * s, eyeY)
          .stroke({ width: 0.8 * s, color: 0x333333 });
        g.moveTo(spread + glassR, eyeY)
          .lineTo(spread + glassR + 3 * s, eyeY)
          .stroke({ width: 0.8 * s, color: 0x333333 });
      }
      break;
    }
    case "headphones": {
      // Arc across top + circles on sides
      const hpY = bodyCY - 8 * s;
      const arcTop = headTop - 4 * s;
      const padR = 4 * s;
      const padX = 16 * s;

      // Band arc
      g.moveTo(-padX, hpY)
        .quadraticCurveTo(0, arcTop - 6 * s, padX, hpY)
        .stroke({ width: 2 * s, color: 0x444444 });
      // Ear pads
      g.circle(-padX, hpY, padR).fill(0x555555);
      g.circle(padX, hpY, padR).fill(0x555555);
      g.circle(-padX, hpY, padR * 0.55).fill(0x777777);
      g.circle(padX, hpY, padR * 0.55).fill(0x777777);
      break;
    }
    case "bowtie": {
      // Butterfly shape below face
      const btY = bodyCY + 10 * s;
      const btW = 6 * s;
      const btH = 4 * s;

      // Left wing
      g.moveTo(0, btY)
        .lineTo(-btW, btY - btH)
        .lineTo(-btW, btY + btH)
        .fill(0xe53935);
      // Right wing
      g.moveTo(0, btY)
        .lineTo(btW, btY - btH)
        .lineTo(btW, btY + btH)
        .fill(0xe53935);
      // Center knot
      g.circle(0, btY, 1.5 * s).fill(0xb71c1c);
      break;
    }
    case "crown": {
      // Three-pointed crown
      const crownY = headTop - 2 * s;
      const crownW = 12 * s;
      const crownH = 8 * s;

      g.moveTo(-crownW / 2, crownY)
        .lineTo(-crownW / 2, crownY - crownH * 0.6)
        .lineTo(-crownW / 4, crownY - crownH * 0.3)
        .lineTo(0, crownY - crownH)
        .lineTo(crownW / 4, crownY - crownH * 0.3)
        .lineTo(crownW / 2, crownY - crownH * 0.6)
        .lineTo(crownW / 2, crownY)
        .fill(0xffc107);

      // Gems
      g.circle(0, crownY - 2 * s, 1.2 * s).fill(0xe53935);
      g.circle(-crownW / 3.5, crownY - 1.5 * s, 0.8 * s).fill(0x42a5f5);
      g.circle(crownW / 3.5, crownY - 1.5 * s, 0.8 * s).fill(0x42a5f5);
      break;
    }
    case "bandana": {
      // Angled rectangle across forehead
      const bandY = bodyCY - 10 * s;
      const bandW = 18 * s;
      const bandH = 4 * s;

      g.rect(-bandW / 2, bandY - bandH / 2, bandW, bandH).fill(0xd32f2f);
      g.rect(-bandW / 2, bandY - bandH / 2, bandW, bandH).stroke({
        width: 0.5 * s,
        color: 0xb71c1c,
      });

      // Tail knot on the side
      const knotX = direction === "L" ? bandW / 2 : -bandW / 2;
      const knotDir = direction === "L" ? 1 : -1;
      g.moveTo(knotX, bandY)
        .lineTo(knotX + knotDir * 5 * s, bandY - 3 * s)
        .stroke({ width: 1.5 * s, color: 0xd32f2f });
      g.moveTo(knotX, bandY)
        .lineTo(knotX + knotDir * 4 * s, bandY + 2 * s)
        .stroke({ width: 1.5 * s, color: 0xd32f2f });
      break;
    }
    case "flower": {
      // Small flower on top-right of head
      const fx = 8 * s;
      const fy = headTop - 2 * s;
      const petalR = 2.5 * s;
      const petalCount = 5;

      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2;
        const px = fx + Math.cos(angle) * petalR;
        const py = fy + Math.sin(angle) * petalR;
        g.circle(px, py, petalR * 0.75).fill(0xf06292);
      }
      // Center
      g.circle(fx, fy, 1.5 * s).fill(0xffd54f);
      break;
    }
    default:
      break;
  }

  parent.addChild(g);
}
