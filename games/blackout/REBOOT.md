# BLACKOUT — Clean Reboot V0.13

**2026-10-20 — Scope: BLACKOUT only.** REDLINE, GAMESHUB, saved garage/account data and production Cloudflare Worker are left untouched.

## Decision

User requested starting again from the beginning, without more incremental repairs to BLACKOUT V1–V8. The live `games/blackout/index.html` is now a **new build**: it imports only `reboot/main.js` → `reboot/physics.js`, not the old operator, weapon, gadget, building editor, AI, or network code.

The old game is preserved in Git commit history. Its working-tree files have been retired or removed; the old shared Worker imports remain as unused compatibility files until REDLINE's shared Worker can be safely separated. **Do not treat these compatibility files as active BLACKOUT V0.1 features.** No existing player data has been reset.

## Current playable contract

**2026-10-20 / V0.13 · Attacker/Defender operator selection foundation (user approved V0.12.2):**
- User confirmed **all five V0.12.2 in-browser drone tests passed**. This makes V0.12.2 the latest regression baseline. User chose a small **12-character roster** for a future 5v5 game (six attackers + six defenders), **ALL completed operators unlocked/free**, with distinctive signature gadgets for ten specialists and mirrored foundational **Striker** (attacker) and **Sentry** (defender) generalists that each get **two secondary gadget slots instead of a signature gadget**.
- A responsive operator selection screen is now in the pause/start menu, with working attacker/defender tabs, actual selected operator state, two playable generalists, their real 2-speed/2-armor profiles, a three-pip stat representation, and the two slot categories. Selecting a side updates the HUD and operator-based movement multiplier. Both generalists intentionally have balanced 1.0x movement. Real 1/2/3 speed-class multiplier plumbing and deterministic movement tests are added to the existing physics foundation. Stat labels show ARMOR; this range is INVULNERABLE, so there is no functioning combat damage/health system yet.
- The ten original specialists (VOLT, RELAY, TRACE, CUTTER, FLARE, BASTION, SPECTER, ANCHOR, TRIPWIRE, STATIC) are **design concepts, marked IN DEVELOPMENT; they are neither paywalled nor selectable** until their signature gadgets actually work. Ten signatures are defined as proposed roles, not gameplay abilities. No nonexistent gadget buttons. Striker and Sentry currently have **two actual loadout-slot records each** labeled UNASSIGNED: slots are prepared, and equipment activation/selection is a later separate stage. Future specialists will have exactly one signature plus one secondary slot.
- Selecting an operator while paused can exit a drone feed safely; opening the range resumes normal player input. All stable systems from V0.9 through V0.12.2 must remain intact: wooden barricades, soft-wall cutouts, 3-second steel reinforcement, BX-7 shooting and ADS/recoil/sounds, 5 view-only camera key, 6 two physical range throws, drone boost/jump/persistent two-drone feed switching.
- **Do not start gadgets, maps, phases, operators beyond the first two, or multiplayer before user browser confirmation.** Automated test success is necessary but not a substitute for real browser screenshots/gameplay.



**2026-10-20 / V0.12.2 · Corrected drone camera / throwable rules after user browser feedback:**
- User confirmed original V0.12 drone could drive, jump and use boost charges, but pointed out two mistakes in the V0.12.1 workflow: the self-drone body obstructed the first-person camera, and **5 must NEVER deploy or throw a drone**. Only **6 throws**; **5 views already-deployed cameras**. This version is a *bugfix stage*, not an authorization to start new mechanics.
- Testing Range starts with **TWO carried, throwable drones and ZERO deployed cameras**. The live 6 HUD displays **DRONES 2** at startup, then 1, then 0 as 6 throws one real drone at a time. The 5 HUD displays the number of physically deployed drones (0, 1, 2). Pressing 5 at 0 never creates one; it shows **NO DRONES DEPLOYED · PRESS 6 TO THROW**. 6 stays a physically thrown drone and does not automatically connect to camera.
- After a 6 throw, press **5** to open that real deployed feed; 5/X closes it. Throw a second drone with 6 from player mode and use Q/E in camera mode to select the already-deployed feed. Both drones retain independent positions, jump cooldowns and Shift boost charges.
- The 3D model of **only the currently viewed drone** is hidden from its own camera to avoid seeing its own case/wheels through the camera lens. The second drone remains visible. Exit cameras or switch feeds and the previous device is visible again. A targeted mock-Three regression protects the intended rendering state.
- Match mode (future-only pure roster contract): one drone is usable during prep phase and **one remaining throwable spare after prep/action begins**, with phase gating. There is no actual match prep phase or attacker/defender game loop in this training build; never falsely claim it is working yet.
- V0.9 wooden barricade, V0.10 drywall, V0.11 steel reinforcement, V0.12 drone collision/jumps/three regenerating Shift charges and original firearms are preserved. CI must pass; the user must verify the fixed 5/6 keys, counts and camera clipping in-browser before any next stage.



**2026-10-20 / V0.12.1 · Correct Siege-like drone equipment and keybinds — V0.12 user feedback:**
- User reported the V0.12 drone drives and works, **but requested genuine throw-then-camera flow** and actual keybinds: **5 = open drone cameras**, **6 = throw one spare drone only after preparation** in real matches. The standalone range has no phase system, so the spare is deliberately unlocked for testing; the future match phase must gate 6 during preparation.
- Press **5** in range player mode: if no drones have been deployed, physically throw the primary reconnaissance drone with a brief gravity/forward-flight arc, then automatically take its actual low camera feed. If a drone exists, 5 reconnects to a real deployed camera without spawning or replenishing anything. Press 5 again (or X) to return to the stationary operator.
- Press **6** in operator mode to physically **throw the one spare**. 6 does not force remote camera mode; press 5 to view the available drones. The first drone and spare are separate persistent physical devices and preserve independent positions, boosts and jump cooldowns. One primary plus one spare is the maximum; the equipment HUD displays the real deployed-camera count and spare count.
- If two drones exist, **Q/E cycle between actual camera feeds**. With one drone, Q/E remain optional steering inputs; mouse still steers the currently selected drone. Other movement and firing keybinds are unchanged.
- Replace the basic Q/E/Z tutorial icons from the *bottom player quick-action bar* with a compact **5 CAMERAS / 6 SPARE** equipment pair and live quantities. The camera HUD now displays its selected index/total. It uses the existing V0.12 movement, cooldown, and 3 rechargeable Shift boost systems.
- A new pure roster/phase contract and throw-physics tests protect against invented cameras, extra spares, phase misuse, instant ground teleportation and bouncing through walls. All original V0.9/V0.10/V0.11 systems must still pass CI. No 5v5 gameplay, prep-round flow or combat camera/spectator mechanics have been implemented.
- **Stage gate:** user confirmation required before new mechanics; test 5 auto-throw, 6 separate spare, switching Q/E between both deployed feeds, operator reconnection, HUD quantity updates and previous game regression.



**2026-10-20 / V0.12 · Playable R-1 recon drone — previous V0.11 user playtest approved:**
- The user confirmed **V0.11 metal reinforcements work in-browser**. Keep stable V0.9 wood barricades, V0.10 gypsum and V0.11 reinforcement, including player weapon ballistics, scope, audio, collisions and test-only Y/T controls. This release introduces only a recon drone (no new map, operator, AI, explosive, spectator mode or multiplayer).
- Press **6** while controlling the player to deploy an original four-wheel R-1 drone at the operator's feet/front, then hand the *actual camera* to its low forward lens. Press **X** to exit the feed, return to the stationary operator and his original weapon HUD; 6 re-enters the **same physical drone** with the same position and remaining charges. No duplicate free drones are spawned. Operator shooting/reloading/interactions are unavailable while controlling the drone.
- Drone controls: **WASD** forward/back/strafing, **mouse** to steer and look, **Q/E** alternate heading adjustments, **SPACE** jumps with a 1.8-second cooldown even after landing, **SHIFT** triggers a 0.72-second boost and consumes one of **three charges**. Charges regenerate sequentially after a seven-second delay per available charge. The exact charge timing is a BLACKOUT prototype balancing choice, not a claim that these numbers are identical to Siege.
- Separate pure `drone-physics.js` simulates drone momentum, radius/height-specific contact, jump gravity/cooldown, bounce-free wall sliding and finite arena boundaries. It uses the current physically present barricade boards, cut gypsum and metal reinforcement collision data. The world drone keeps recharging, landing and slowing when not actively controlled (while player gameplay runs). Drone visuals include a dark original shell, rolling wheels, camera lens and small LEDs.
- Existing `drone-hud` is now real: low-camera feed, live simplified range minimap with actual drone position, three charge pip indicators, numeric boost recharge timer, jump status and controls. The previously planned spectator/security-camera HUD **remains hidden/inactive**.
- Regression suite tests all three boosts and sequential recharge, jump cooldown, obstacle collisions, driving through a real soft-wall cutout but not metal armor, persistent drone model and POV, and unchanged old mechanics. GitHub CI passing **does not imply visual/browser playtest completion**.
- User's strict stage gate remains: **STOP after V0.12. Do not start hard-breaching, AI, match maps or other new systems until explicit user confirmation following in-browser drone playtesting.**



**2026-10-20 / V0.11 · Metal reinforcement, soft-wall browser tests passed:**
- User confirmed **all six V0.10 soft-wall playtests passed**, establishing V0.10 as stable. This stage implements only metal wall reinforcements; no breaching, explosives, multiplayer or new maps.
- At the east gypsum station (X +7, Z +3), stand still beside the wall and **hold F for three uninterrupted seconds**. A double-faced, riveted armored steel panel visually rises from the ground. Installation cancels on release, movement or stepping away. Proximity and overlap checks prevent completing a reinforcement over a player inside the wall.
- Once installed, the full-height steel plate becomes a proper Three.js bullet raycast mesh AND a solid player collision AABB. Gun rounds stop with a brief spark instead of carving a steel hole. It blocks both sides, including any holes already shot into the drywall; existing soft-wall geometry and removed-cell count are not modified.
- For repeating tests, **Y** near the steel removes *only the armor*, revealing previously created gypsum holes; **T** resets the gypsum; **F** near the west wooden barricade still rebuilds the wood. No other controls changed.
- Each functionality has focused pure deterministic and mock-Three visual tests plus all earlier regression tests. CI is necessary but **not sufficient** for final browser visual correctness. Stop after V0.11 and require the user's explicit in-browser confirmation before implementing anything else.



**2026-10-20 / V0.10 · True soft-wall penetration (feature gate):**
- User confirmed **all six V0.9 wooden barricade browser checks passed**, establishing the locked-in stability baseline. This stage introduces soft-wall mechanics ONLY; reinforcement, operator equipment, explosives, AI, online play and new building maps remain prohibited until another explicit user playtest.
- East test station at X +7 / Z +3 comprises 32×20 individually hittable plaster cells, each **12 cm square**, modeled by **one dynamic THREE.InstancedMesh** with visible thickness and a procedural plaster texture. A bullet removes only the exact struck instance, forming a real square-edged perforation through both faces instead of painting a deceptive black decal on intact collision. Repeated rounds through a removed cell continue downrange to other real raycast targets/surfaces. The entire wall does **not** collapse from arbitrary accumulated damage.
- Each update rebuilds only the active instance matrices and the actual movement AABB collision strips derived from the same pure `soft-wall.js` state. One tiny hole lets bullets pass but cannot fit the player; carve a sufficiently wide/tall cluster and the player can crouch/crawl/walk through. Support posts and header remain solid. Full view-side geometry/raycast data and physical collision are synchronized.
- **T** restores all cut-out cells and full collision, unless the player is currently intersecting the wall's footprint; the action does not reset wood, ammunition, real bullet holes, or the player. HUD shows live removed cells and area name; the minimap marks the east station. Gypsum fragments are short lived and capped. Original 710 RPM gun, ADS reticle, ballistic audio, barricade behavior and existing true wall/box decals are unaffected.
- Automated tests verify tile removal and instance ID compaction, 3D representation, reset safety, actual movement passage, no whole-wall HP, and old game regression. These tests are **not proof of actual browser visual behavior**. User must complete an explicit browser checklist before work on wall reinforcement.



**2026-10-20 / V0.9 · Wooden barricades ONLY — explicit feature gate:**
- User requires **every stage tested in-browser before starting another mechanic**. V0.9 implements only the first wooden barricade. Soft-wall holes, wall reinforcement, breaching, AI and map building are *not* started.
- A signed physical door-testing frame is at `x=-7,z=3`. Six individually hittable, original procedural-textured wood boards, each requiring two bullet hits to break. First strike shows a small bullet hole parented to the actual plank; second strike removes just that plank and plays small-lived physical wood shards. Frame posts/header stay solid. Original firearm shot recoil, impacts and wall bullet holes are unchanged.
- A single pure `barricade.js` state produces both the bullet-state and **actual height-specific player collision primitives**, used in `stepPlayer(...,[...TEST_OBSTACLES,...barricade.blockers()])`. Destroying the lower four boards opens prone clearance; the lower five permit walking. Frame corners stay solid even when the door is open.
- **F hold 2.2s** while close to a damaged barricade reconstructs the six planks, clears board-local impact marks, and restores collisions. The action cancels when F is released or user moves away; prohibited inside the opening to avoid trapping the player. HUD prompt displays progress and 6/6 condition; minimap shows the actual test station location.
- Pure logic tests cover independent damage, partial collision clearances, real walking through after breaking, no phantom rebuilding, and proximity. CI parsing and existing weapon / ballistics / audio regression remain required. The **user must confirm in-browser functionality** before V0.10 or soft-wall stage. GitHub CI cannot verify actual visuals/audio.
- Separate match HUD remains future-only. Drone/camera HUD templates stay hidden. REDLINE, shared accounts, worker, original multiplayer remain untouched.



**2026-10-20 / V0.8.1 · Follow-up screenshots of real Siege player, drone, and security-camera displays:**
- Adjusted active player HUD toward the user's new in-game photos: compact bottom-left performance meter, 125/125 training-only (invulnerable) health, actual Q/E/Z shortcuts rather than invented gadget availability, compact utility unavailable markings, and tight lower-right stacked ammo/weapon treatment.
- Added two complete but **hidden** DOM/CSS device HUD profiles from the photos: drone left-middle blue site/camera navigation strip with Q/E and bottom-right 7/X/Z icon row; camera/spectator bottom-right eye/crossed-eye and CTRL panel with camera status strip. These have original BLACKOUT visuals and contain **no buttons that pretend to control a drone/camera**.
- The main runtime sets `data-hud-profile="player"` only when controlling the real player and `"menu"` when paused. Device HUDs are deliberately not exposed until matching simulated drone/camera entities, switching and spectator logic exist.
- Existing weapon, audio, bullet-hole, movement, collision and FPS HUD mechanics remain intact. No operator selection, 5v5, drone mechanics or fake multiplayer introduced.


**2026-10-20 / V0.8 · User-requested close-to-Siege drill HUD:**
- Replaced the large V0.7.x BLACKOUT prototype diagnostics dashboard with the user's precise UI reference screen composition: light upper-left "Eliminate 0/4 targets in TEST RANGE" rectangular objective with tickbox; small map below it; compact operator-like original B/O crest and real 60-minute countdown centered at the very top; FPS and tiny training tips upper-right.
- Bottom: white 110/110 *training placeholder* health readout and segmented health bar bottom-left (no damage system exists, clearly labeled DAMAGE DISABLED), minimal quick-access key hints left of the compass, live location and circular compass centered bottom, and large contrasting active-primary ammo strip / secondary locked row / utility placeholders bottom-right.
- All HUD values with working backing systems are live. Timer counts only while pointer locked and training (not during pause); ammo and reserve use original weapon; 4-target objective counts unique dummy IDs (and marks completed only when all four are struck), compass uses camera yaw; training-area names use actual test object locations; minimap draws physical collision stations, target positions, and moving/rotating player position; FPS based on frame timings. No fake multiplayer, team, CPU/GPU or network telemetry.
- Kept current gun model, firing timing, original layered audio, Q/E leaning, movement, physics, decals, target hits, and B diagnostic overlay. Top navigation hides during the range. No Siege logos/copyrighted icon assets were imported; this is original BLACKOUT-themed UI with near-reference layout proportions, made from CSS/SVG.
- V0.8 live values and layout tested in source/CI; actual in-browser visual feedback still required. Does not add real health/damage, equipment, alternate guns, objectives, multiplayer, or map buildings.


**2026-10-20 / V0.7.4 · Missing small-box bullet holes in 35s user video:**
- User clarified previous video was specifically demonstrating **no marks on test boxes**. Review of exact captured frames shows BOX-TWO did get visible holes while BOX-ONE displayed `SHOT BLOCKED · BOX-ONE` without visible marks. The old response misinterpreted this as only a wall hole quality issue.
- Root cause found in main source: the same `raycaster.intersectObjects([...shootableSolids,...targetGroups],true)` recursively raycast against **decorative LineSegments made from EdgesGeometry** under every obstacle. Three.js uses a default raycaster line threshold of **1 world unit**. That can intercept a shot at/near the outline of a 2.3m crate before the solid triangle and yields a **faceless hit**. `firstHitType()` climbs the hierarchy, labels `SHOT BLOCKED · BOX-ONE`, but `impactDecals.mark()` rejects hits without `hit.face.normal`, so nothing appears.
- Added `combat-raycast.js` to raycast solid meshes **non-recursively** and target dummy groups recursively, require actual face normals, then sort by true distance. Used by both real firing and passive B live-aim probe.
- Added **per-box InstancedMesh impact pools** as real *children* of BOX-ONE and BOX-TWO, with decal matrices stored in each box's local coordinates. These layers follow the actual surface directly and avoid scene-space registration issues; generic wall/floor decal pool retained. Each box pool is capped at 160 holes; old box holes are replaced on overflow. V clears all pools. B debug can show box object ID, face and number of stored holes.
- Regression tests cover decorative-line exclusion and proximity ordering; front/top/side box hits from BOX-ONE/BOX-TWO; and V clearing and pool reuse. Gun firing, recoil, gun sounds and map layout are unchanged. Real browser verification still required.


**2026-10-20 / V0.7.3 · User screenshot: decal circles rising above wall top:**
- Latest user screenshot shows multiple prominent bullet-hole sprites half above the top edge of a pale box/wall, while the crosshair points at the vertical face. Thus the previous decal implementation (surface placement and visibility) was visually faulty.
- Place marks in the struck **mesh's local geometry coordinates** using `object.worldToLocal(hit.point)` and `hit.face.normal`, clamp their in-plane centers to the actual `BoxGeometry` bounding extents with radius padding, shift 8mm outward from the face, then premultiply the entire instance transform by `object.matrixWorld`. This preserves correct geometry face orientation and prevents circle quads from hanging into the sky at wall edges. The visible impact diameter is slightly smaller than in the last build. Any direct shot onto the horizontal TOP is still horizontal; the B debug overlay shows `SURFACE TOP / FRONT / LEFT / RIGHT / BACK / BOTTOM` and world-space Y height to distinguish recoil and face hits.
- Extended tests for hitting a vertical face center, clipping hits at the top edge, actual horizontal top-face impact, and 90-degree rotated wall. Existing 400 persistent impact ring and single instanced draw remain intact.
- A future browser screenshot is still needed to confirm GPU texture orientation and depth rendering. Do not claim graphics visually verified from source-only tests. No changes to BLACKOUT weapon firing, recoil, SFX, old map, networking, REDLINE, or shared data.


**2026-10-20 / V0.7.2 · User reports wall bullet holes disappearing (46-second screen recording):**
- Observed visible dark bullet marks on the pale wall around 15–21s, but earlier holes disappeared or became hard to discern. The prior `createShotEffects()` explicitly deleted impact discs after **9 seconds** and discarded the oldest after **75 impacts**, which with 710 RPM automatic firing is under 7s of continuous fire. Tiny black circle geometry had insufficient visual detail, and depth/coplanar rendering could obscure marks from some angles.
- Replaced old per-hit temporary circle geometry with `reboot/impact-decals.js`: **one GPU-instanced mesh**, shared procedurally generated soot/chipped-edge transparent texture, double-sided material with depth bias, actual world-space hit-face orientation, and a 14mm outward surface offset for stable wall visibility. The mesh disables frustum culling because instances span the whole arena. No time expiration. Recycles the oldest impact only after 400 hits to avoid unbounded memory/draw calls.
- Target dummies temporarily hide/respawn when hit, so they intentionally do not leave a static world-space decal floating in their absence. Walls, crates and floors keep theirs. **V** explicitly clears decals for repeat testing. Recoil, sound, shooting ray, ammo, cover collision, and ADS alignment remain unchanged. REDLINE and shared infrastructure untouched.
- Added tests that check face-normal position offset, material depth settings, capacity recycling and persistence across very long simulated time. Browser visual test still required.


**2026-10-20 / V0.7.1 · 50-second user video follow-up:**
- Reviewed the actual uploaded V0.7 gameplay recording. The target hit counter rises to 16, verifying some successful target intersections and hit registration; other shots display `SHOT BLOCKED · BOX-ONE` or `SHOT MISSED`. The green/yellow wire lines sweeping across the sight are the *old debug visualization*: long-lived world-space lines with `depthTest:false` stay in place as the camera moves. They were mistaken for bullets shooting sideways.
- Removed world-space debug shot lines entirely. Regular impact decals remain where bullets actually land. **B** now displays two independent readouts: `LIVE SIGHT` (nearest collision under the optic on the current frame, updated ~11x/sec using a separate raycaster) and `LAST SHOT` (actual last bullet result, surface/target/head, distance and optic/camera source). The live probe never fires, expends ammo, changes recoil or mutates targets.
- Preserved the original BLACKOUT recoil pattern, chamber/ammo rules, rate of fire, gunshot and reload sound, 3D gun, and physical collision. Source import and CSS cache versions are bumped to `reboot-009`. No REDLINE or shared Worker changes.
- Browser playtest remains necessary: compare `LIVE SIGHT: TARGET ... HEAD` with `LAST SHOT: HEADSHOT` during stationary single shots to isolate possible remaining accuracy issues. Movement and recoil can shift the optic between successive automatic rounds.


**2026-10-20 / V0.7 · Third-pass aim fix after user reports V0.6.1 still misses:**
- Discovered an integration issue: the previous firing flow updated the gun's 3D transform *after* calculating its raycast. In V0.7, the camera and physically mounted optic are updated *before* invoking historical weapon firing, with the real optic's world-space dot projected back into camera NDC to control the shot direction. During ADS entrance before the reticle is visible, the weapon shoots through screen center; when fully visible, **the exact rendered dot is the ray origin on-screen**. Hipfire still retains original wide cone.
- Separated four unchanged-geometry solid wall/box collision stations into side bays instead of allowing physical props between the camera and dummy heads. All four head positions were tested to have clear lines of sight from spawn and the observed 2026-10-20 recording location. This avoids false "bad aim" when actual world geometry intercepts a visible target.
- **B = ballistic debug toggle**. Every shot while on generates a short world-space line from the camera eye to the true hit/miss endpoint, colored by target/blocked/miss, and a HUD label containing hit type, optic/camera source, NDC and impact range. Exposes runtime evidence rather than guessing from decals.
- Resolved potentially stale-cache module imports: the live HTML now cache-busts `main.js` and `style.css` as `reboot-008`, the active main imports newly changed `physics.js` and `weapon-view.js` as `reboot-008`, and the view imports updated `weapon-model.js` as `reboot-008`. Old query-string reuse could mix V0.5 and V0.6 code (particularly missing casing/reload methods), so this matters for live functionality.
- Original BLACKOUT V8 firing sound, 710RPM, recoil and ammo model remain unchanged; REDLINE and shared Worker remain untouched. Requires real browser validation, beyond automated tests.


**2026-10-20 / V0.6.1 · Recorded ADS mismatch and blocked dummy head:**
- Reviewed a 36-second user recording, particularly seconds 32–34: the physical holographic sight was held on a yellow dummy head, but the hit counter did not increase; there was also an existing left-block impact mark. This is not proof every mark was caused by the same shot.
- Confirmed that old V8 shooting was still using wide 0.18 hipfire spread during the V0.6 ADS animation until `aimMix>=.995`. Now `aimState(aimHeld,aimMix).accurate` zeroes bullets whenever ADS is held; physical sight reticle remains hidden until centered, hipfire remains wide without RMB.
- Verified the old orange/yellow target [13,-23] head from the recorded eye position (~1.1,1.65,-3.2) was actually occluded by `wall-two`. Moved it to [7,-25], with a pure 3D segment/AABB line-of-sight regression asserting its head is now exposed from that position. Other movement walls stay unchanged.
- Shots use the same actual perspective camera `raycaster.setFromCamera` as the optic, with nearest-hit classification. A hit on solid wall reports `SHOT BLOCKED · WALL-TWO` (or its obstacle ID), while actual target heads produce `HEADSHOT` feedback. These messages help distinguish spread, blocked lanes, and misses.
- No REDLINE files, shared Worker, old BLACKOUT map, AI or online code affected. Automated unit tests verify math and integration, but actual screenshot-level aiming still needs user playtesting.



**2026-10-20 / V0.6 · Original BLACKOUT shooting/audio restoration:**
- Retrieved original V8.1 source from Git commit `ca9800d2d7b225fb94471ec7ea80d7639319b18a`: `src/weapons.js`, `src/material-ballistics.js`, and `src/audio.js`. Their historical weapon class, recoil pattern, and procedural sound mixer are preserved in `reboot/legacy-weapons.js`, `reboot/legacy-ballistics.js`, and `reboot/legacy-audio.js` (with only local dependency import rewritten). These are **actively imported** by the clean reboot; legacy map/bot/network modules are not.
- 710 RPM, 30+1 chambered rounds, 120 spare rounds, 2.25s tactical reload and 2.69s empty reload. Automatic fire follows the original scheduled gun cycle with up to three catch-up shots after slow frames. Historical repeatable recoil changes the actual camera pitch/yaw and gradually recovers.
- `GameAudio.play("fire")` restores the original multilayer pressure crack, low punch, body, and tail. `reload`, `click` and `impact` use the historical procedural events. Starts on Enter Test Range user gesture. Footsteps remain separate.
- Original 0.18 hip spread is modified by movement/crouch/prone. After full sight alignment, ADS is zeroed directly through the modern physical sight. The old visual brass-ejection and magazine motion are adapted for the new BX-7 Mk II model.
- Scope remains offline range-only; no V8 map, operator, bot AI, online networking, or shared Worker changes. Source-level checks are not a visual/audio browser playtest. `reboot/weapon.js` is retained for rollback only and no longer used by `main.js`.


**2026-10-20 / V0.5 (video review and repairs):**
- From the 21-second gameplay recording, the holographic reticle was below the real camera-center ray. ADS now uses a shared `OPTIC_CENTER` reference and centered `weaponPose(1)` with zero weapon pitch/roll; while aimed, the ballistics use exactly camera-forward direction with **zero spread**. The scope reticle is hidden during interpolation and visible only when fully calibrated, and the regular crosshair stays up until then.
- **Q toggles left lean, E toggles right lean**; repeating the same key recenters. Lean persists while moving and ADS. The eye shifts at most 0.16m within the 0.34m player collision radius, while camera roll eases to +/-0.19 radians. The aim ray begins at this displaced camera so bullets respond consistently to peeking.
- Upgraded the earlier placeholder BX-7 into an original Mk II multi-mesh carbine: chamfered receiver, magazine, handguard vents, muzzle, grip, adjustable stock, hardware and mounted optic. This remains a handcrafted procedural test model, **not** a finished imported high-poly production gun asset.
- Source-only tests and CI cover lean logic and optic alignment. Real in-browser screenshot and control playtesting still needed. REDLINE, shared worker, and player data untouched.



**2026-10-20 / V0.4:** Browser Ctrl+W cannot reliably be overridden: prone is now **tap Ctrl to toggle** or **tap Z to toggle**, then release Ctrl before walking forward. C remains hold-to-crouch. Release prone by tapping Ctrl or Z again. Jump is blocked while prone, and overhead collision safety remains.

**Weapon prototype:** Original BX-7 3D model is attached to the first-person camera with a physical holographic sight and reticle. Hold RMB to ADS and hide the regular hip crosshair, hold LMB to fire raycast shots with hip spread / accurate ADS. Gun consumes 30-round magazines from 90 spare rounds; R reloads over 1.85s; P resets position. Four hit-reactive training dummies respawn. Impact marks and synthetic firing audio are local effects. NO AI or multiplayer is claimed.

**Testing limits:** We verified source-level movement/weapon/footstep regression logic but still require a hands-on WebGL / browser audio / pointing playtest.


**2026-10-20 / V0.3:** C is now hold-to-crouch, while Left/Right Ctrl is hold-to-prone. Prone has its own slow crawl speed (1.1 m/s), low collision height (0.62m), .44m viewpoint, and soft crawl sounds. Prone prevents jumping and sprinting; leaving a low ceiling cannot force an invalid taller stance. Posture priority: Ctrl/prone over C/crouch. Prone only starts on the ground.

**2026-10-20 / V0.2:** Movement-driven procedural footsteps added. Walk, sprint and crouch use different pace/timbre; landing plays a heavier impact. Audio starts after ENTER TEST RANGE (user gesture), and M toggles mute. Footsteps follow actual displacement: blocked and airborne travel make no footsteps. No external audio downloads or backend changes.

- Desktop first-person camera, pointer lock and Escape to pause.
- Normalized WASD movement (4.2m/s walk), Shift sprint (6.3m/s), hold C crouch (2.4m/s), tap Ctrl or Z to toggle prone (1.1m/s).
- Jumping, gravity and landing.
- Swept circle-versus-AABB collision with wall sliding, world boundary.
- One flat test surface and four simple collision objects. No maps/buildings.
- Minimal clean HUD for position, motion state, speed, grounding.
- Synthesized, displacement-driven footsteps, crawling shuffles and landing sounds (M to mute).
- R to reload carbine and P to reset player position.
- Offline solo movement and weapon test with original BLACKOUT firing/audio. No AI or multiplayer representation.

## Rules for subsequent stages

1. **Movement first**: user tests camera sensitivity, jump, crouch, speed, wall collision, comfort. Only change one mechanic family at a time.
2. Weapons: implement a single original physically mounted model, muzzle, one reliable sight, bullet/raycast and impacts **only after movement passes hands-on testing**.
3. Destruction and gadgets: introduce each with an isolated test and regression gate.
4. Map/editor: create a custom editor and a real building only after movement, weapons, and collision work. Never generate several unfinished maps at once.
5. Real multiplayer: separate BLACKOUT-specific backend, authoritative room and movement, and live two-browser smoke-test. Never claim AI are networked humans.
6. Keep GAMESHUB and REDLINE unaffected. No changes to shared `worker.js` or `wrangler.json` without an explicit, separately verified release.

## Testing

`node --test games/blackout/reboot/*.test.mjs`

CI in `.github/workflows/blackout-regression.yml` is reset to these V0.6 tests, not tests for removed V1–V8 gameplay. The workflow checks JavaScript syntax and collision/movement behavior. **A passing CI result is not a browser playtest.**

## Rollback

History still contains the full V8.1 implementation. Git can recover the older files if the user explicitly requests it. We do **not** delete Git history or touch REDLINE.
