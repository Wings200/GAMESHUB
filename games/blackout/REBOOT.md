# BLACKOUT — Clean Reboot V0.7.3

**2026-10-20 — Scope: BLACKOUT only.** REDLINE, GAMESHUB, saved garage/account data and production Cloudflare Worker are left untouched.

## Decision

User requested starting again from the beginning, without more incremental repairs to BLACKOUT V1–V8. The live `games/blackout/index.html` is now a **new build**: it imports only `reboot/main.js` → `reboot/physics.js`, not the old operator, weapon, gadget, building editor, AI, or network code.

The old game is preserved in Git commit history. Its working-tree files have been retired or removed; the old shared Worker imports remain as unused compatibility files until REDLINE's shared Worker can be safely separated. **Do not treat these compatibility files as active BLACKOUT V0.1 features.** No existing player data has been reset.

## Current playable contract

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
