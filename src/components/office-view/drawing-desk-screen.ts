import { Container, Graphics, Text, TextStyle } from "pixi.js";

/**
 * Draw a mini terminal/monitor on an agent's desk.
 * Returns the container and the text node for later updates.
 */
function drawDeskScreen(
  parent: Container,
  x: number,
  y: number,
  outputText: string,
  isActive: boolean,
): { container: Container; textNode: Text } {
  const screen = new Container();
  screen.position.set(x, y);

  const g = new Graphics();

  const frameW = 42;
  const frameH = 22;
  const frameR = 3;

  // Screen glow when active
  if (isActive) {
    g.roundRect(-2, -2, frameW + 4, frameH + 4, frameR + 1).fill({
      color: 0x3b82f6,
      alpha: 0.08,
    });
  }

  // Monitor frame
  const fillColor = isActive ? 0x1a1a2e : 0x2a2a3a;
  const borderColor = isActive ? 0x3b82f6 : 0x4a4a5a;
  g.roundRect(0, 0, frameW, frameH, frameR).fill(fillColor);
  g.roundRect(0, 0, frameW, frameH, frameR).stroke({
    width: 1,
    color: borderColor,
  });

  screen.addChild(g);

  // Prepare display text: last 2 lines, max 20 chars each
  let display: string;
  if (isActive && !outputText) {
    display = "working...";
  } else {
    display = outputText;
  }

  const lines = display
    .split("\n")
    .map((l) => (l.length > 20 ? l.slice(0, 20) : l))
    .slice(-2)
    .join("\n");

  const textColor = isActive ? 0x4ade80 : 0x888888;
  const style = new TextStyle({
    fontFamily: "monospace",
    fontSize: 5,
    fill: textColor,
    align: "center",
  });

  const textNode = new Text({ text: lines, style });
  textNode.anchor.set(0.5, 1);
  textNode.position.set(frameW / 2, frameH - 3);
  screen.addChild(textNode);

  parent.addChild(screen);
  return { container: screen, textNode };
}

export { drawDeskScreen };
