# Untitled RPG · Mechanics Lab W04.0 + Forest Foundation 0.1

An isolated first-person 3D prototype for GAMESHUB. The game has no permanent name yet.

## W04.0 — enemy AI foundation (patrol / sight / chase / search)
- **Station 9** adds a small dedicated three-bot patrol arena in the northeast of the original test lab. Press **9** to teleport there; the eight approved stations remain.
- Three test raiders (Scout / Raider / Enforcer) have inert original 3D humanoid models, patrol paths, facing directions, sight distance and field of view, line-of-sight blockage by test crates, movement collision and arena boundaries.
- Enemies detect and pursue the player when visible, remember the last seen position for a short time, investigate when sight is lost, then search and return to patrol. Shooting a raider alerts it regardless of facing. Bot movements are paused when the lab menu/armory is open or when the player leaves station 9.
- The player uses the same W02 scrap pistol raycast, bullet decals, material sounds, and W03.1 six-slot permanent armor damage model against NPC hit zones, with health labels, hit numbers and defeat reactions.
- **K** pauses/resumes AI for armor and movement comparisons; **J** resets bot health/position and patrol. Buttons and HUD explicitly state **NO ENEMY GUNFIRE YET**. Enemy weapons are placeholder 3D props, not functioning firearms in this first pass.
- Enemy brain math and state transitions live in renderer-independent `enemy-ai.mjs` with Node regression tests (vision, cover occlusion, chase, investigation, collision and reset).
- **Next W04 phases:** basic reciprocal combat and player health, then cover tactics and advanced ranged behavior—subject to this pass being approved by the user's browser playtest.

## W03.1 — full modular armor overhaul (supersedes W03 armor durability)
- W03's pooled, breakable armor has been **removed**. Armor equipment is permanent until swapped, and repeated damage never reduces armor points or protection.
- Six independently equipped armor slots: **head, chest, left arm, right arm, left leg, right leg**. A bullet uses the hit part's equipped armor points; the right arm cannot borrow points from the left arm or chest.
- Sixteen authored armor styles for **each slot**, totaling **96 equippable pieces** plus No Armor in each slot. Pieces have distinct ratings, colors, and visible 3D overlays with additional high-tier plating.
- Damage blocking follows `armorPoints / (armorPoints + 25)` capped at 85%. Higher armor yields materially greater protection; head damage 2.5x, chest 1x, arms/legs .7x remain.
- From the main menu choose **CUSTOMIZE ARMOR**, or press **B** in-game, to change all six slots on any of the three test dummies. Quick presets, selected dummy HP, individual point ratings and block percentages are visible. Changes persist via browser localStorage.
- **Y** resets dummy HP and hit reactions without changing any armor piece. T clears casings and bullet marks as before.
- Dummy damage feedback displays named exact hit zone, HP damage, armor points, and blocked amount. Existing W01–W02 shooting, recoil, bullet holes, procedural sounds and M01–M03 movement remain unchanged.
- NPC inventory, wearable player armor, power armor and final art assets are not part of this test pass. The older W03 durability design described below is historical and is no longer in use.

## W03 — historical superseded damage and durability (not current)
- Station **8** is a dedicated combat test range with three humanoid training dummies: **Unarmored (100 HP)**, **Light Vest (100 HP, 60 armor)**, **Heavy Armor (100 HP, 120 armor, helmet)**.
- Uses the existing W02 scrap pistol, 20 base damage, current raycast and ammunition rules, not a parallel shooting system. Headshots deal 2.5× damage; torso 1×; arms/legs 0.7×.
- Light vest absorbs 30% of torso damage, while the heavy armor absorbs 55% of torso and 40% of helmeted head damage. Armor durability depletes by the amount blocked and eventually breaks; uncovered parts take full damage. No damage to destroyed dummies.
- Floating health and armor bars, transient damage numbers, hit-flash/knockdown reactions, armor-broken feedback, and center hit notices help validate damage.
- Press **8** to reach dummies, **Y** to reset all dummies to full HP/armor and clear bullet holes; **T** still resets the current station and clears brass/holes.
- All stats and damage calculation live in renderer-independent `combat.mjs` with automated tests. Dummy geometry, hit zones and visual reactions live only in the lab.
- W02 pistol, recoil, animations, material sounds, movement and stamina unchanged. No enemy AI, player inventory/armor, or real-world integration claimed. Requires user visual playtest.

## W02 — advanced weapon handling
- In the same test field, the original scrap pistol has an animated top slide cycling during each successful shot and during the final part of a timed reload. A physically modeled magazine is withdrawn/reinserted with a procedural gloved-hand gesture. **No skeleton or finished character art** is claimed.
- Every successful shot ejects a small 3D brass casing with gravity, bounces, ground settling and rotation. Visible casings are capped at 38 (no GPU accumulation); T clears casings alongside bullet holes.
- Procedural muzzle-flash plane and stronger flash light at the barrel; ADS and hip position blend with calmer ADS sway. Camera stays in YXZ pitch-only recoil mode to prevent the approved permanent-lean bug.
- Accuracy factors in actual movement, crouching, sprinting and jumping. Stationary W01.3 hip/ADS spread numbers, 12/48 ammunition, 1.65-second reload, bullet-impact decals, distinct paper/wood/metal/concrete sounds and approved M01–M03 movement are unchanged.
- `weapon-handling.mjs` supplies pure render-independent reload animation and casing physics; `weapons.mjs` computes movement spread. Their automated tests run in GitHub Actions.
- **Test:** press 7, fire several shots and check brass/slide, press R after using ammo, hold RMB while walking and crouching to compare spread, and press T to clear marks and casings. Visual feel requires an in-browser playtest before approval.

## W01.3 — audible material-specific impacts
- Station 7 now has clearly labeled sample panels for WOOD, METAL and CONCRETE alongside the existing PAPER targets.
- The firing raycast reads explicit surface material tags instead of assuming every non-paper hit is concrete. Surface hit text also identifies the material.
- Web Audio impact sounds use noticeably different timbres: sharp paper tear, wooden thock, ringing metal ping, and low concrete crack/crumble. They are deliberately scheduled about 0.15–0.26 seconds after the shot, so the loud muzzle report no longer masks them.
- Effects remain procedural (no external files), respect N/mute, use the same capped bullet-hole decals and preserve W01.1 camera recoil and approved movement.
- Regression tests verify all four material routes, unique sound-frequency signatures, and delayed scheduling. Player listening test still needed.

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