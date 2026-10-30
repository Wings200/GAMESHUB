# Untitled RPG · Mechanics Lab M01 + Forest Foundation 0.1

An isolated first-person 3D prototype for GAMESHUB. The game has no permanent name yet.

## Endurance and stamina (Movement Lab M02)
- Shared `movement.mjs` stamina controller is used in the test field and the forest.
- Endurance is an RPG skill from 1 to 10: max continuous sprint = 3 + Endurance seconds, from 4 seconds at E1 to 13 at E10 (half the prior sprint time).
- Sprint drains one stamina unit per second *while actually moving*. Holding Shift against a wall or stationary does not drain it.
- After 0.55 seconds without sprinting, stamina regenerates according to Endurance: 0.225 × (Endurance + 1) units/second (E1 0.45/s, E3 0.9/s, E10 2.475/s). High-Endurance characters refill their entire bar faster despite having a larger pool. An exhausted player walks until 30% has returned, even when Shift remains held.
- M02's testing control (menu +/- or in-game [ / ]) temporarily changes Endurance and refills the bar; it is **not** a skill-point award system. A future level-up/perk system will supply the earned Endurance value.
- Stamina is visible in the lab and forest HUD; no power armor or combat endurance drain is implemented yet.

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