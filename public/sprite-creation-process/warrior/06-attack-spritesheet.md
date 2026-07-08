Intended use:
Create a 10-frame 5x2 spritesheet for a top-down 2D game character attack animation.

Input images:
Image 1 is the identity anchor for Vito, Warrior. Preserve the exact character identity, outfit, proportions, prop placement, silhouette, palette, and {DIRECTION}-facing direction.
Image 2 is the 5x2 spritesheet layout/style guide. Use it only as a layout guide for ten equal cells across a 2560x1024 sheet.

Primary request:
Generate Vito performing a {DIRECTION}-facing sword slash. The character faces {DIRECTION_DESCRIPTION} for every frame. The attack effect is dynamic, but the character remains on a stable foot baseline.

Canvas and layout:
- 2560x1024 PNG spritesheet
- 5 columns by 2 rows
- ten equal 512x512 cells
- frame order left to right across top row, then left to right across bottom row
- character fully visible in each cell, including both feet
- consistent character scale, camera, and ground baseline across all frames
- simple solid chroma background if a flat background is needed

Frame sequence:
Frame 1: neutral ready stance, shield up, sword still sheathed, feet planted.
Frame 2: begins the attack, sword hand draws back, body still facing {DIRECTION}.
Frame 3: anticipation pose, sword raised behind shoulder for the swing.
Frame 4: small steel-white blade-flash glint appears along the sword edge.
Frame 5: sword arcs forward, a bright motion-trail follows the blade, not obscuring body or feet.
Frame 6: release frame, full swing extends forward across the character's front, following the blade's arc.
Frame 7: follow-through, blade trail fades with a short streak; character recoils slightly from the swing's momentum.
Frame 8: recoil peak, residual blade-flash fades.
Frame 9: settles back toward neutral, sword lowering, only a faint glint remains.
Frame 10: return to calm ready stance, sword back at rest, no active effect.

Style:
- high-resolution pixel-art-inspired game sprite
- clean fantasy/action RPG animation frames
- crisp edges
- consistent lighting and palette
- readable silhouette

Constraints:
- no direction change
- no camera angle change
- no extra characters
- no props beyond existing gear
- no scenery, UI, labels, text, watermark, or visible grid lines
- do not crop feet, hair, props, arms, or effect
- do not merge cells or create comic panels
- do not recenter the character differently per frame

---
Run once per direction, swapping {DIRECTION} / {DIRECTION_DESCRIPTION} as in 04. {ATTACK_TRAVEL_DIRECTION} always reads "forward across the character's front, following the blade's arc" — it's the swing path, not a literal projectile, so it doesn't change per direction.
