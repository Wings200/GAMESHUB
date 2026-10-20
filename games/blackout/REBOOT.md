# BLACKOUT — Clean Reboot V0.6

**2026-10-20 — Scope: BLACKOUT only.** REDLINE, GAMESHUB, saved garage/account data and production Cloudflare Worker are left untouched.

## Decision

User requested starting again from the beginning, without more incremental repairs to BLACKOUT V1–V8. The live `games/blackout/index.html` is now a **new build**: it imports only `reboot/main.js` → `reboot/physics.js`, not the old operator, weapon, gadget, building editor, AI, or network code.

The old game is preserved in Git commit history. Its working-tree files have been retired or removed; the old shared Worker imports remain as unused compatibility files until REDLINE's shared Worker can be safely separated. **Do not treat these compatibility files as active BLACKOUT V0.1 features.** No existing player data has been reset.

## Current playable contract

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
