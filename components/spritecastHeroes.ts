// Hero combat sprites generated with SpriteCast (https://github.com/sunghwan0112/spritecast).
//
// EMPTY BY DEFAULT — nothing changes until a job has an entry. A job with one or
// more entries uses them instead of the LPC sheets (heroCombatAnims in
// assets.ts); with several, each hero gets a stable pick by id, same as the
// LPC recolor variants. Jobs without entries keep the LPC sheets.
//
// Only the RIGHT-facing (east) strips are needed: heroes always face the
// enemy on the right, and the stage mirrors enemies, not heroes. Put files under
// public/game-assets/SpriteCast/<Job>/ and reference them by URL path.
//
// Each entry is a JobAnims (see assets.ts). Fill it from the character's
// character.json:
//   size           frame HEIGHT in px — drives on-screen scale (frame height is
//                  drawn at the same on-screen height as a 64px LPC cell, so a
//                  frame with lots of empty padding will look small: lower
//                  `size` to scale the character up)
//   clip.width     frame WIDTH in px when the cell isn't square (e.g. 165)
//   clip.frames    frames in the strip (8 for SpriteCast walk/idle)
//   clip.anchor    { x, y } — the `anchor` fraction from character.json (feet)
//   idle           the idle-east strip
//   attacks        one or more action strips (slash / shoot); one is picked
//                  at random per swing
//
// Example (hypothetical numbers):
//   Warrior: [
//     {
//       size: 96,
//       idle: {
//         url: "/game-assets/SpriteCast/Warrior/idle-east.png",
//         frames: 8, width: 64, anchor: { x: 0.5, y: 0.92 },
//       },
//       attacks: [
//         {
//           url: "/game-assets/SpriteCast/Warrior/slash-east.png",
//           frames: 8, width: 64, anchor: { x: 0.5, y: 0.92 },
//         },
//       ],
//     },
//   ],
import type { Job } from "@/store/useGuildStore";
import type { JobAnims } from "@/components/assets";

export const SPRITECAST_HEROES: Partial<Record<Job, JobAnims[]>> = {};
