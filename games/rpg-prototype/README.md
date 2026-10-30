# Untitled RPG · Mechanics Lab W01 + Forest Foundation 0.1

An isolated first-person 3D prototype for GAMESHUB. The game has no permanent name yet.

## W01.2 — bullet impact decals and weapon sound
- W01 test-lab bullets now make dark scorch/impact marks at the actual first raycast hit, whether the surface is a paper target or a solid wall, floor, obstacle or range prop.
- Decals orient to the surface normal with a small depth offset, are excluded from hit detection, and are capped at 140 visible marks for performance. Press T to reset your station and clear the marks.
- Procedural Web Audio gunshot, paper/concrete impact, reload mechanical clicks and empty-magazine dry click. Sound is synthesised only on user interaction and requires no remote audio files. N or the Sound button mutes/unmutes it; audio is unlocked by Enter Test Field.
- Shooting still uses the corrected YXZ pitch-only camera recoil and preserved W01 ammo rules. Sound synthesis is tested with a mocked AudioContext, and manual browser/WebGL playtest remains necessary.

## W01.1 — camera recoil correction
- Camera rotation is now YXZ, matching `PointerLockControls` instead of mixing XYZ pitch with mouse-look yaw. This prevents unintended sideways camera tilt when shooting while turned.
- First-person camera kick is pitch-only, capped, and smoothly recovered; the pistol viewmodel still kicks independently.
- Raycast direction is measured **before** applying recoil, so shot direction corresponds to the current sights/crosshair.
- Regression tests verify a single shot and rapid shots return the camera to its pre-shot pitch. Browser playtest remains required.

## W01 — weapon range (first weapon pass)
- The existing testing facility now includes station 7, a clear lane of five shootable geometric targets (press 7).
- Adds one original worn scrap pistol, with a real camera-relative 3D model built from metal and wood components, muzzle flash, sight posts, smooth aim transitions, viewmodel recoil, and shots calculated from the camera.
- Primary mouse click fires one semi-auto shot; hold right mouse button for aimed-down-sights (narrower spread and zoom); press R to reload and F to refill **test-only** ammunition. Press T to reset the current test station (was R).
- Finite 12-round magazine and 48 rounds in reserve; reload 1.65 seconds, .24-second shot cooldown. No shooting through solid world geometry to hit targets.
- `weapons.mjs` is renderer-independent and holds authoritative ammo, cooldown, ADS spread, recoil, and reload rules. It is exercised by `weapons.test.mjs` and will be imported into the real RPG world as weapon mechanics roll out.
- Real range target hits and damage indication work. Enemy health, humanoid animations, third-person weapon models, inventory, crafting and combat AI **do not** exist yet.
- Existing movement and forest preview preserved; do not accidentally introduce weapon combat into the forest until tested.

## M03 — advanced movement testing
- Uses the exact shared `movement.mjs` controller in the lab and the preserved forest preview.
- Hold Left/Right Ctrl to crouch, or press C to toggle crouch. Crouch speed is 2.35 m/s and disables sprint and jumping.
- Standing is physically forbidden under low ceilings; the player remains crouched after releasing C until they exit.
- Walking and sprinting ease into full speed and ease out when released, with near-instant collision slide response and no endless momentum.
- Shared procedural first-person camera uses a smooth crouching eye height and subtle, grounded head bob.
- Test station 6 offers a physical low tunnel with a collidable roof; press 6 to teleport to it. Stations 1–5 and the previous mechanics remain.
- No humanoid skeleton or third-person character animation rig has been implemented in this milestone.

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
Run: node --test games/rpg-prototype/rules.test.mjs games/rpg-prototype/movement.test.mjs games/rpg-prototype/weapons.test.mjs

Future updates extend these files in place with tests and a bug log. REDLINE must remain separate.