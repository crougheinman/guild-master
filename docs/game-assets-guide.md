# Tiny Swords asset guide

How this project uses the Tiny Swords pixel-art pack (`public/game-assets/`), and the real conventions behind it. Source: [official tilemap devlog](https://pixelfrog-assets.itch.io/tiny-swords/devlog/1138989/tilemap-guide).

## Tile grid fundamentals

`Terrain/Tileset/Tilemap_color*.png` atlases are built on a **64×64px grid**. Building a full terrain scene layers, bottom to top:

1. BG color (background fill)
2. Water foam (animated, overlaps tile edges)
3. Flat ground — lowest walkable terrain, adjacent to water
4. Shadow + elevated ground — repeated per elevation level; shadow sits one 64px row below its elevated tile to fake height

Stairs connect elevations: one center piece when adjacent to walkable ground, two pieces (top + cliff face) when adjacent to a cliff. `color1`–`color5` are palette swaps of the same layout — pick one per scene, don't mix.

**We only use Flat Ground.** The combat lane is single-elevation — no cliffs, stairs, or water — so it needs one tileable grass tile, repeated horizontally via `PIXI.TilingSprite`.

Verified-good crop in `Tilemap_color1.png`: **`(x: 64, y: 64, w: 64, h: 64)`** — clean tileable grass, no scalloped/fringe edge. (An earlier crop at `(384, 320)` was a plain stone cliff-face tile, not grass — cropped and visually confirmed before fixing.)

## Sprite-strip convention (units, particles)

Every animation is a horizontal filmstrip of uniform square frames. Frame size and count vary per clip — read them off config, never assume:

| Source | Frame size | Frame count varies |
|---|---|---|
| Most units (Warrior, Archer, Monk, Pawn) | 192px | per clip, see `unitAnims()` |
| Lancer | 320px | per clip, see `unitAnims()` |
| Dust particle | 64px | 10 |
| Explosion particle | 192px | 8 |

Reference implementation for slicing a strip: `components/CombatVisualizer.tsx` → `sliceStrip()`/`sliceClip()`. Each frame is `Rectangle(i * size, 0, size, size)`; every texture gets `scaleMode: "nearest"` for crisp pixels (no smoothing on pixel art).

## `components/assets.ts` map

| Export | Covers | Consumed by |
|---|---|---|
| `ICONS` | 8 UI icons — gold, organics, minerals, botanicals, power, fortitude, speed, forge | `app/page.tsx` (Treasury), `Tavern.tsx`, `Forge.tsx`, `Market.tsx` |
| `DUNGEON_ART` | Per-dungeon building art (Red Tower, Red Barracks) | `Dungeons.tsx` |
| `unitAnims(team, job)` | Per-job animation clips (idle/attacks/guard) for 5 jobs × 2 teams | `CombatVisualizer.tsx` |
| `PARTICLES` | Dust + explosion FX strips | `CombatVisualizer.tsx` |
| `BACKDROP` | Combat-stage scenery — tilemap ground, clouds, tower, bush, rocks | `CombatVisualizer.tsx` |
| `avatarFor(heroId)` | Deterministic hero portrait (1 of 25, hashed from id) | `Tavern.tsx`, `RightPanel.tsx` |

`app/globals.css` also has a standalone `.sprite-idle` CSS `steps()` animation over `Warrior_Idle.png` (192×192, 8 frames) — a fallback, not driven by `assets.ts`.

Everywhere except `CombatVisualizer.tsx` renders assets as plain `<img>` tags with a `.pixel` class (`image-rendering: pixelated`) — no `next/image` (its resampling blurs pixel art).

## Used vs. unused — what's spare capacity

Actively used: Blue/Red unit teams (5 jobs each), Blue/Red building Tower + Barracks + Castle, Icons 01–08, all 25 Human Avatars, Dust_02 + Explosion_01, Clouds_01/02, Bushe1, Rock1/2, Tilemap_color1.

Untouched, available for future work:
- **Black/Yellow/Purple** unit teams and building colors (same structure as Blue/Red)
- `Units/.../Enemies/Orc`
- Alternate particles: Fire_01–03, Explosion_02, Dust_01, Water Splash
- Resource sprites: Wood (trees, logs), Meat (sheep), Tools
- Tilemap_color2–5 (palette swaps)
- UI Banners, Buttons, Bars, Cursors, Papers, Ribbons, Swords, Wood Table
