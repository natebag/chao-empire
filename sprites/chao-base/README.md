# Chao Sprite System

## Current State
Using Claw Empire's default numbered sprites (1-14) with directional frames.
Chao-inspired replacements are planned — see `sprites/references/` for design references.

## Sprite Format
- Filename: `{number}-{direction}-{frame}.png`
- Directions: D (down), L (left), R (right)
- Frames: 1, 2, 3 (walk cycle animation)
- Size: original sprites are ~26x52px, rendered at 1x

## Future: Chao Replacements
When custom Chao sprites are ready:
1. Replace files in `public/sprites/` matching the same naming convention
2. Each Chao variant gets a unique sprite number
3. Mood overlays are rendered separately via drawing-mood.ts
4. Color tinting can be applied via PixiJS sprite.tint for quick variants
