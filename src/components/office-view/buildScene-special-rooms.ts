import type { MutableRefObject } from "react";
import { Container, Graphics, Text, TextStyle, type Application } from "pixi.js";
import { BREAK_ROOM_H, type WallClockVisual } from "./model";
import type { SupportedLocale } from "./themes-locale";
import {
  contrastTextColor,
  drawCeilingLight,
  drawRoomAtmosphere,
  drawTiledFloor,
  drawWallClock,
} from "./drawing-core";
import { drawDesk, drawPlant } from "./drawing-furniture-a";
import { drawBookshelf } from "./drawing-furniture-b";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface BuildSpecialRoomsParams {
  app: Application;
  activeLocale: SupportedLocale;
  isDark: boolean;
  specialRoomsY: number;
  OFFICE_W: number;
  wallClocksRef: MutableRefObject<WallClockVisual[]>;
}

interface SpecialRoomTheme {
  floor1: number;
  floor2: number;
  wall: number;
  accent: number;
}

/* ================================================================== */
/*  Room themes                                                        */
/* ================================================================== */

const GYM_THEME: SpecialRoomTheme = {
  floor1: 0xc8b888,
  floor2: 0xb8a878,
  wall: 0x8a7a5a,
  accent: 0xc09030,
};

const LIBRARY_THEME: SpecialRoomTheme = {
  floor1: 0xa0b898,
  floor2: 0x90a888,
  wall: 0x5a6a50,
  accent: 0x80a060,
};

const SERVER_THEME: SpecialRoomTheme = {
  floor1: 0x889cb8,
  floor2: 0x788ca8,
  wall: 0x4a6080,
  accent: 0x60a0d0,
};

/* ================================================================== */
/*  Custom furniture drawing helpers                                   */
/* ================================================================== */

function drawTreadmill(parent: Container, x: number, y: number): void {
  const g = new Graphics();
  // Base / belt platform
  g.roundRect(x, y + 10, 28, 8, 2).fill(0x2a2a2a);
  g.roundRect(x + 1, y + 11, 26, 6, 1).fill(0x3a3a3a);
  // Belt surface (dark rubber)
  g.roundRect(x + 2, y + 12, 24, 4, 0.5).fill(0x1a1a1a);
  // Belt tread lines
  for (let i = 0; i < 6; i++) {
    g.moveTo(x + 4 + i * 4, y + 12.5)
      .lineTo(x + 4 + i * 4, y + 15.5)
      .stroke({ width: 0.3, color: 0x555555, alpha: 0.4 });
  }
  // Upright handles (left and right)
  g.rect(x + 2, y, 2, 12).fill(0x666666);
  g.rect(x + 24, y, 2, 12).fill(0x666666);
  // Top handlebar
  g.moveTo(x + 3, y)
    .lineTo(x + 25, y)
    .stroke({ width: 2, color: 0x888888 });
  // Display panel
  g.roundRect(x + 10, y + 1, 8, 4, 1).fill(0x1e2e40);
  g.roundRect(x + 11, y + 2, 6, 2, 0.5).fill({ color: 0x44dd66, alpha: 0.5 });
  parent.addChild(g);
}

function drawWeightRack(parent: Container, x: number, y: number): void {
  const g = new Graphics();
  // Vertical stand
  g.rect(x + 8, y, 2, 20).fill(0x777777);
  g.rect(x + 20, y, 2, 20).fill(0x777777);
  // Horizontal bar
  g.rect(x, y + 6, 30, 2).fill(0x999999);
  g.rect(x, y + 12, 30, 2).fill(0x999999);
  // Weights on top bar (circles)
  g.circle(x + 4, y + 7, 3).fill(0x444444);
  g.circle(x + 4, y + 7, 3).stroke({ width: 0.5, color: 0x666666 });
  g.circle(x + 26, y + 7, 3).fill(0x444444);
  g.circle(x + 26, y + 7, 3).stroke({ width: 0.5, color: 0x666666 });
  // Weights on bottom bar
  g.circle(x + 4, y + 13, 2.5).fill(0x555555);
  g.circle(x + 4, y + 13, 2.5).stroke({ width: 0.5, color: 0x777777 });
  g.circle(x + 26, y + 13, 2.5).fill(0x555555);
  g.circle(x + 26, y + 13, 2.5).stroke({ width: 0.5, color: 0x777777 });
  // Base
  g.rect(x + 4, y + 20, 22, 2).fill(0x666666);
  parent.addChild(g);
}

function drawPunchingBag(parent: Container, x: number, y: number): void {
  const g = new Graphics();
  // Ceiling mount line
  g.moveTo(x, y)
    .lineTo(x, y + 6)
    .stroke({ width: 1.5, color: 0x888888 });
  // Chain links
  g.moveTo(x, y + 6)
    .lineTo(x, y + 10)
    .stroke({ width: 1, color: 0xaaaaaa });
  // Bag body (oval)
  g.roundRect(x - 5, y + 10, 10, 18, 4).fill(0x8b3a3a);
  g.roundRect(x - 5, y + 10, 10, 18, 4).stroke({ width: 0.6, color: 0x6a2a2a });
  // Highlight stripe
  g.roundRect(x - 3, y + 12, 2, 14, 1).fill({ color: 0xffffff, alpha: 0.08 });
  // Bottom strap
  g.rect(x - 4, y + 26, 8, 1.5).fill(0x666666);
  parent.addChild(g);
}

function drawServerRack(
  parent: Container,
  x: number,
  y: number,
): { greenLeds: { x: number; y: number }[]; redLeds: { x: number; y: number }[] } {
  const g = new Graphics();
  const greenLeds: { x: number; y: number }[] = [];
  const redLeds: { x: number; y: number }[] = [];

  // Rack body (tall rectangle)
  g.roundRect(x, y, 18, 32, 2).fill(0x2a2a2a);
  g.roundRect(x, y, 18, 32, 2).stroke({ width: 1, color: 0x444444 });
  // Inner panel
  g.roundRect(x + 1, y + 1, 16, 30, 1).fill(0x1e1e1e);

  // Server units (4 rows)
  for (let i = 0; i < 4; i++) {
    const sy = y + 3 + i * 7;
    // Server unit
    g.roundRect(x + 2, sy, 14, 5, 0.5).fill(0x333333);
    g.roundRect(x + 2, sy, 14, 5, 0.5).stroke({ width: 0.3, color: 0x555555 });
    // Ventilation lines
    for (let v = 0; v < 3; v++) {
      g.moveTo(x + 4 + v * 3, sy + 1.5)
        .lineTo(x + 4 + v * 3, sy + 3.5)
        .stroke({ width: 0.3, color: 0x555555, alpha: 0.4 });
    }
    // LED dots (green and red)
    const greenX = x + 13;
    const greenY = sy + 1.5;
    g.circle(greenX, greenY, 0.8).fill({ color: 0x44dd66, alpha: 0.8 });
    greenLeds.push({ x: greenX, y: greenY });

    const redX = x + 15;
    const redY = sy + 1.5;
    g.circle(redX, redY, 0.6).fill({ color: 0xff4444, alpha: 0.5 });
    redLeds.push({ x: redX, y: redY });
  }

  // Bottom ventilation panel
  g.roundRect(x + 3, y + 28, 12, 2, 0.5).fill(0x2e2e2e);
  for (let v = 0; v < 5; v++) {
    g.moveTo(x + 4 + v * 2.5, y + 28.5)
      .lineTo(x + 4 + v * 2.5, y + 29.5)
      .stroke({ width: 0.3, color: 0x444444, alpha: 0.5 });
  }

  parent.addChild(g);
  return { greenLeds, redLeds };
}

/* ================================================================== */
/*  Wall text helper                                                   */
/* ================================================================== */

function drawWallText(parent: Container, cx: number, y: number, text: string, color: number): void {
  const wallTxt = new Text({
    text,
    style: new TextStyle({
      fontSize: 8,
      fill: color,
      fontWeight: "bold",
      fontFamily: "system-ui, sans-serif",
      letterSpacing: 2,
    }),
  });
  wallTxt.anchor.set(0.5, 0.5);
  wallTxt.position.set(cx, y);
  wallTxt.alpha = 0.25;
  parent.addChild(wallTxt);
}

/* ================================================================== */
/*  Room sign helper (matches break room style)                        */
/* ================================================================== */

function drawRoomSign(
  parent: Container,
  cx: number,
  y: number,
  label: string,
  signW: number,
  accent: number,
  isDark: boolean,
): void {
  const signBg = new Graphics();
  signBg.roundRect(cx - signW / 2 + 1, y - 3, signW, 18, 4).fill({ color: 0x000000, alpha: 0.12 });
  signBg.roundRect(cx - signW / 2, y - 4, signW, 18, 4).fill(accent);
  parent.addChild(signBg);

  const signTextColor = isDark ? 0xffffff : contrastTextColor(accent);
  const signTxt = new Text({
    text: label,
    style: new TextStyle({
      fontSize: 9,
      fill: signTextColor,
      fontWeight: "bold",
      fontFamily: "system-ui, sans-serif",
      dropShadow: isDark ? { alpha: 0.6, blur: 2, distance: 1, color: 0x000000 } : undefined,
    }),
  });
  signTxt.anchor.set(0.5, 0.5);
  signTxt.position.set(cx, y + 5);
  parent.addChild(signTxt);
}

/* ================================================================== */
/*  Build individual rooms                                             */
/* ================================================================== */

function buildGymRoom(
  room: Container,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  isDark: boolean,
  wallClocksRef: MutableRefObject<WallClockVisual[]>,
): void {
  const theme = GYM_THEME;

  // Floor
  const floor = new Graphics();
  drawTiledFloor(floor, rx, ry, rw, rh, theme.floor1, theme.floor2);
  room.addChild(floor);

  // Wall atmosphere
  drawRoomAtmosphere(room, rx, ry, rw, rh, theme.wall, theme.accent);

  // Border
  const border = new Graphics();
  border.roundRect(rx, ry, rw, rh, 3).stroke({ width: 2, color: theme.wall });
  border.roundRect(rx - 1, ry - 1, rw + 2, rh + 2, 4).stroke({ width: 1, color: theme.accent, alpha: 0.25 });
  room.addChild(border);

  // Ceiling light
  drawCeilingLight(room, rx + rw / 2, ry + 6, theme.accent);

  // Wall clock
  wallClocksRef.current.push(drawWallClock(room, rx + rw - 20, ry + 18));

  // Room sign
  drawRoomSign(room, rx + rw / 2, ry, "Training Grounds \u{1F4AA}", 110, theme.accent, isDark);

  // Wall text
  drawWallText(room, rx + rw / 2, ry + 24, "TRAINING", theme.accent);

  // Furniture
  const baseX = rx + 8;
  drawTreadmill(room, baseX, ry + 32);
  drawTreadmill(room, baseX + 34, ry + 32);
  drawWeightRack(room, baseX + 68, ry + 34);
  drawPunchingBag(room, rx + rw - 20, ry + 38);

  // Plants in corners
  drawPlant(room, rx + 8, ry + rh - 14, 0);
  drawPlant(room, rx + rw - 10, ry + rh - 14, 3);
}

function buildLibraryRoom(
  room: Container,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  isDark: boolean,
  wallClocksRef: MutableRefObject<WallClockVisual[]>,
): void {
  const theme = LIBRARY_THEME;

  // Floor
  const floor = new Graphics();
  drawTiledFloor(floor, rx, ry, rw, rh, theme.floor1, theme.floor2);
  room.addChild(floor);

  // Wall atmosphere
  drawRoomAtmosphere(room, rx, ry, rw, rh, theme.wall, theme.accent);

  // Border
  const border = new Graphics();
  border.roundRect(rx, ry, rw, rh, 3).stroke({ width: 2, color: theme.wall });
  border.roundRect(rx - 1, ry - 1, rw + 2, rh + 2, 4).stroke({ width: 1, color: theme.accent, alpha: 0.25 });
  room.addChild(border);

  // Ceiling light
  drawCeilingLight(room, rx + rw / 2, ry + 6, theme.accent);

  // Wall clock
  wallClocksRef.current.push(drawWallClock(room, rx + rw - 20, ry + 18));

  // Room sign
  drawRoomSign(room, rx + rw / 2, ry, "Ancient Tree \u{1F4DA}", 100, theme.accent, isDark);

  // Wall text
  drawWallText(room, rx + rw / 2, ry + 24, "LIBRARY", theme.accent);

  // Bookshelves along back wall
  const shelfBaseX = rx + 8;
  drawBookshelf(room, shelfBaseX, ry + 30);
  drawBookshelf(room, shelfBaseX + 34, ry + 30);
  drawBookshelf(room, shelfBaseX + 68, ry + 30);

  // Reading desks
  drawDesk(room, rx + 14, ry + 58, false);
  drawDesk(room, rx + rw - 62, ry + 58, false);

  // Plants
  drawPlant(room, rx + 8, ry + rh - 14, 2);
  drawPlant(room, rx + rw - 10, ry + rh - 14, 1);
}

function buildServerRoom(
  room: Container,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  isDark: boolean,
  wallClocksRef: MutableRefObject<WallClockVisual[]>,
): { ledPositions: { x: number; y: number; color: "green" | "red" }[] } {
  const theme = SERVER_THEME;
  const ledPositions: { x: number; y: number; color: "green" | "red" }[] = [];

  // Floor
  const floor = new Graphics();
  drawTiledFloor(floor, rx, ry, rw, rh, theme.floor1, theme.floor2);
  room.addChild(floor);

  // Wall atmosphere
  drawRoomAtmosphere(room, rx, ry, rw, rh, theme.wall, theme.accent);

  // Border
  const border = new Graphics();
  border.roundRect(rx, ry, rw, rh, 3).stroke({ width: 2, color: theme.wall });
  border.roundRect(rx - 1, ry - 1, rw + 2, rh + 2, 4).stroke({ width: 1, color: theme.accent, alpha: 0.25 });
  room.addChild(border);

  // Ceiling light
  drawCeilingLight(room, rx + rw / 2, ry + 6, theme.accent);

  // Wall clock
  wallClocksRef.current.push(drawWallClock(room, rx + rw - 20, ry + 18));

  // Room sign
  drawRoomSign(room, rx + rw / 2, ry, "Crystal Cave \u{1F5A5}\u{FE0F}", 100, theme.accent, isDark);

  // Wall text
  drawWallText(room, rx + rw / 2, ry + 24, "CRYSTAL", theme.accent);

  // Server racks
  const rackBaseX = rx + 10;
  const rackSpacing = 24;
  for (let i = 0; i < 3; i++) {
    const rackX = rackBaseX + i * rackSpacing;
    const rackResult = drawServerRack(room, rackX, ry + 30);
    for (const led of rackResult.greenLeds) {
      ledPositions.push({ x: led.x, y: led.y, color: "green" });
    }
    for (const led of rackResult.redLeds) {
      ledPositions.push({ x: led.x, y: led.y, color: "red" });
    }
  }

  // Monitoring desk
  drawDesk(room, rx + rw - 58, ry + 58, true);

  return { ledPositions };
}

/* ================================================================== */
/*  Main export                                                        */
/* ================================================================== */

export function buildSpecialRooms(params: BuildSpecialRoomsParams): { totalHeight: number } {
  const { app, activeLocale, isDark, specialRoomsY, OFFICE_W, wallClocksRef } = params;

  const roomH = BREAK_ROOM_H;
  const padding = 4;
  const innerW = OFFICE_W - padding * 2;
  const roomW = Math.floor(innerW / 3);

  const specialRoomsContainer = new Container();

  // ── Gym (left third) ──
  const gymX = padding;
  const gymY = specialRoomsY;
  buildGymRoom(specialRoomsContainer, gymX, gymY, roomW, roomH, isDark, wallClocksRef);

  // ── Library (middle third) ──
  const libX = padding + roomW;
  const libY = specialRoomsY;
  buildLibraryRoom(specialRoomsContainer, libX, libY, roomW, roomH, isDark, wallClocksRef);

  // ── Server Room (right third) ──
  const srvX = padding + roomW * 2;
  const srvY = specialRoomsY;
  const srvW = innerW - roomW * 2; // absorb any rounding remainder
  buildServerRoom(specialRoomsContainer, srvX, srvY, srvW, roomH, isDark, wallClocksRef);

  app.stage.addChild(specialRoomsContainer);

  return { totalHeight: roomH };
}
