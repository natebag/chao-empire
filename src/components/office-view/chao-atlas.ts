// ---------------------------------------------------------------------------
// Chao Spritesheet Atlas Configuration
// ---------------------------------------------------------------------------
// Maps named Chao types to frame rectangles within chao-atlas.png (340x388px).
// The sheet contains rows of Chao sprites from a community sprite sheet.
// Each sprite is approximately 24x28px with ~2px padding between them.
// ---------------------------------------------------------------------------

export interface ChaoAtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ChaoAtlasEntry {
  /** 3 frames for walk animation per direction */
  D: [ChaoAtlasFrame, ChaoAtlasFrame, ChaoAtlasFrame]; // front
  L: [ChaoAtlasFrame, ChaoAtlasFrame, ChaoAtlasFrame]; // left
  R: [ChaoAtlasFrame, ChaoAtlasFrame, ChaoAtlasFrame]; // right (mirrors L at render time)
}

// ---------------------------------------------------------------------------
// Frame helper — builds 3 frames at a given row Y offset
// ---------------------------------------------------------------------------

const FRAME_W = 24;
const FRAME_H = 28;
const STRIDE_X = 26; // ~24px sprite + 2px gap

function rowFrames(rowY: number): [ChaoAtlasFrame, ChaoAtlasFrame, ChaoAtlasFrame] {
  return [
    { x: 4, y: rowY, w: FRAME_W, h: FRAME_H },
    { x: 4 + STRIDE_X, y: rowY, w: FRAME_W, h: FRAME_H },
    { x: 4 + STRIDE_X * 2, y: rowY, w: FRAME_W, h: FRAME_H },
  ];
}

// ---------------------------------------------------------------------------
// Atlas entries per Chao type
// ---------------------------------------------------------------------------
// Row 1 (y~2):   Normal blue Chao — front-facing poses
// Row 2 (y~58):  Hero/yellow Chao with bow ties
// Row 3 (y~112): White/angel Chao
// Row 4 (y~168): Dark Chao variants
//
// For L and R directions we reuse the D frames since the sheet primarily
// contains front-facing sprites. R is rendered by mirroring L at draw time.
// ---------------------------------------------------------------------------

export const CHAO_ATLAS: Record<string, ChaoAtlasEntry> = {
  normal: {
    D: rowFrames(2),
    L: rowFrames(2),
    R: rowFrames(2),
  },
  hero: {
    D: rowFrames(58),
    L: rowFrames(58),
    R: rowFrames(58),
  },
  angel: {
    D: rowFrames(112),
    L: rowFrames(112),
    R: rowFrames(112),
  },
  dark: {
    D: rowFrames(168),
    L: rowFrames(168),
    R: rowFrames(168),
  },
};

// ---------------------------------------------------------------------------
// Color → atlas entry mapping
// ---------------------------------------------------------------------------
// Colors that don't have their own row are mapped to the closest base type
// and tinted at render time.
// ---------------------------------------------------------------------------

export const COLOR_TO_ATLAS: Record<string, keyof typeof CHAO_ATLAS> = {
  blue: "normal",
  green: "normal",   // tinted
  red: "normal",     // tinted
  yellow: "hero",
  purple: "normal",  // tinted
  orange: "hero",    // tinted
  dark: "dark",
  white: "angel",
  pink: "normal",    // tinted
  gold: "hero",      // tinted
};

// ---------------------------------------------------------------------------
// Tint colors for Chao that share a base sprite row
// ---------------------------------------------------------------------------
// Only colors that need tinting are listed. If a color is absent the sprite
// is drawn untinted (0xffffff).
// ---------------------------------------------------------------------------

export const ATLAS_TINT: Record<string, number> = {
  green: 0x81c784,
  red: 0xe57373,
  purple: 0xce93d8,
  orange: 0xffb74d,
  pink: 0xf48fb1,
  gold: 0xffc107,
};

// ---------------------------------------------------------------------------
// Public accessor
// ---------------------------------------------------------------------------

export function getChaoFrames(color: string): ChaoAtlasEntry {
  const key = COLOR_TO_ATLAS[color] ?? "normal";
  return CHAO_ATLAS[key];
}
