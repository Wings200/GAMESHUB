# Untitled RPG · Mechanics Lab M01 + Forest Foundation 0.1

An isolated first-person 3D prototype for GAMESHUB. The game has no permanent name yet.

## Current priority: Movement Lab M01
At `games/rpg-prototype/testing/`. A deliberately small, flat 3D field with five stations: walk/sprint lane, low jump hurdles, collision maze, ramp, and stair-stepping. Press 1–5 to teleport, R to reset, WASD to move, Shift to sprint, Space to jump, mouse to look, and Escape to pause. Speed, motion state, and height are shown on the HUD. A quality toggle supports Chromebooks.

The test lab and the saved forest preview both import `movement.mjs` to share the exact same tuning, jump physics, collision and climbing rules. Do not duplicate their movement logic. The old forest remains visitable through `games/rpg-prototype/`; later mechanics roll into the final map only after testing.

## Forest preview already present
- Wooded, rolling landscape with a winding track, ruined houses, a Hearthguard outpost, and a distant city skyline.
- WASD movement, mouse look, Shift sprint, Space jump, tree and wall collision.
- Continuous day/night cycle (night is navigable; no horror or jump scares).
- Optional Hearthguard tutorial quest: speak with a scout, recover two supply cases, return them.
- Two lootable interiors, other houses without quest supplies; world map, quality toggle.
- Quest progress saved locally in the browser.

## Controls
Click Explore to capture the mouse; Escape to pause; E interact; M survey map.

## Not implemented yet
Combat, mutated creatures, power armor, additional factions, vehicles, large city interiors, multiplayer, final art or the main story. Do not mark these completed.

## Regression
Run: node --test games/rpg-prototype/rules.test.mjs games/rpg-prototype/movement.test.mjs

Future updates extend these files in place with tests and a bug log. REDLINE must remain separate.