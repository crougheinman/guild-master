Animate this single character into a simple {DIRECTION}-facing in-place walk cycle for a top-down 2D game.

The character must face {DIRECTION_DESCRIPTION} for the entire clip.
Preserve the exact identity, sprite-like pixelated look, proportions, palette, costume, and silhouette from the input image.
Do not turn toward any other direction.
Do not pivot, rotate, or show a quarter-turn view.
Do not change body orientation at any point.

Keep the camera fixed and centered.
Keep the framing unchanged.
Keep the character centered on the same flat neutral background.
Do not turn the background into a floor, room, horizon, outdoor scene, perspective grid, shadow plane, or environment.

Motion:
- low-fidelity, readable, game-sprite reference motion
- small looping in-place walk
- subtle vertical bobbing
- alternating leg steps
- light robe/sash sway
- minimal arm swing
- feet remain visible
- character does not translate across the frame

One character only.
No scene.
No extra props.
No labels.
No arrows.
No camera movement.
No zoom.
No attack animation.
No weapon swing.
No magic, fireball, spell effects, smoke, particles, glow, trails, or impacts.

---
Run once per direction anchor from 04 (SOUTH/NORTH/EAST/WEST), swapping {DIRECTION} / {DIRECTION_DESCRIPTION} the same way.
