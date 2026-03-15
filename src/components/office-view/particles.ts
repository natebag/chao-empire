import { type Container, Graphics, Text, TextStyle } from "pixi.js";

interface Particle {
  node: Container;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  spin: number;
  growth: number;
  type: string;
}

function emitSleepZzz(parent: Container, particles: Particle[], x: number, y: number): void {
  const fontSize = 6 + Math.random() * 4;
  const zzz = new Text({
    text: "z",
    style: new TextStyle({
      fontSize,
      fill: 0x94a3b8,
      fontWeight: "bold",
      fontFamily: "system-ui, sans-serif",
    }),
  });
  zzz.anchor.set(0.5, 0.5);
  zzz.position.set(x, y);
  parent.addChild(zzz);
  particles.push({
    node: zzz,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.4,
    life: 0,
    maxLife: 40 + Math.floor(Math.random() * 21),
    spin: (Math.random() - 0.5) * 0.02,
    growth: 0.005 + Math.random() * 0.005,
    type: "zzz",
  });
}

function emitSparkles(
  parent: Container,
  particles: Particle[],
  x: number,
  y: number,
  count = 8,
): void {
  const colors = [0xffd700, 0xff69b4, 0x00ffff, 0x00ff00, 0xff6347];
  for (let i = 0; i < count; i++) {
    const star = new Graphics();
    const color = colors[Math.floor(Math.random() * colors.length)];
    star.star(0, 0, 5, 3, 1.5).fill({ color, alpha: 0.9 + Math.random() * 0.1 });
    star.position.set(x, y);
    parent.addChild(star);
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
    const speed = 0.8 + Math.random() * 0.7;
    particles.push({
      node: star,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 25 + Math.floor(Math.random() * 16),
      spin: (Math.random() - 0.5) * 0.12,
      growth: 0.008 + Math.random() * 0.008,
      type: "sparkle",
    });
  }
}

function emitConfetti(
  parent: Container,
  particles: Particle[],
  x: number,
  y: number,
  count = 20,
): void {
  const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
  for (let i = 0; i < count; i++) {
    const rect = new Graphics();
    const color = colors[Math.floor(Math.random() * colors.length)];
    rect.rect(-2, -1, 4, 2).fill({ color, alpha: 0.85 + Math.random() * 0.15 });
    rect.position.set(x + (Math.random() - 0.5) * 6, y);
    parent.addChild(rect);
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.2;
    const speed = 1.2 + Math.random() * 1.5;
    particles.push({
      node: rect,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      maxLife: 50 + Math.floor(Math.random() * 31),
      spin: (Math.random() - 0.5) * 0.15,
      growth: 0,
      type: "confetti",
    });
  }
}

function emitSweatDrop(parent: Container, particles: Particle[], x: number, y: number): void {
  const drop = new Graphics();
  drop.circle(0, 2, 2.2).fill({ color: 0x87ceeb, alpha: 0.8 });
  drop.moveTo(0, -1.5).lineTo(-1.4, 1.6).lineTo(1.4, 1.6).closePath().fill({ color: 0x87ceeb, alpha: 0.8 });
  drop.position.set(x, y);
  parent.addChild(drop);
  particles.push({
    node: drop,
    vx: 0.3,
    vy: 0.8,
    life: 0,
    maxLife: 20,
    spin: 0,
    growth: 0,
    type: "sweat",
  });
}

function updateParticles(particles: Particle[]): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += 1;

    if (p.life >= p.maxLife) {
      if (!p.node.destroyed) {
        p.node.parent?.removeChild(p.node);
        p.node.destroy({ children: true });
      }
      particles.splice(i, 1);
      continue;
    }

    p.node.x += p.vx;
    p.node.y += p.vy;
    p.node.rotation += p.spin;
    p.node.scale.x += p.growth;
    p.node.scale.y += p.growth;

    if (p.type === "confetti") {
      p.vy += 0.08;
    }

    const t = p.life / p.maxLife;
    p.node.alpha = 1 - t * t;
  }
}

export {
  type Particle,
  emitSleepZzz,
  emitSparkles,
  emitConfetti,
  emitSweatDrop,
  updateParticles,
};
