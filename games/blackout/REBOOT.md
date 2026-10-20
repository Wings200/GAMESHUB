# BLACKOUT — Clean Reboot V0.4

**2026-10-20 — Scope: BLACKOUT only.** REDLINE, GAMESHUB, saved garage/account data and production Cloudflare Worker are left untouched.

## Decision

User requested starting again from the beginning, without more incremental repairs to BLACKOUT V1–V8. The live `games/blackout/index.html` is now a **new build**: it imports only `reboot/main.js` → `reboot/physics.js`, not the old operator, weapon, gadget, building editor, AI, or network code.

The old game is preserved in Git commit history. Its working-tree files have been retired or removed; the old shared Worker imports remain as unused compatibility files until REDLINE's shared Worker can be safely separated. **Do not treat these compatibility files as active BLACKOUT V0.1 features.** No existing player data has been reset.

## Current playable contract

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
- R to reset player position.
- Offline solo movement and weapon test. No AI or multiplayer representation.

## Rules for subsequent stages

1. **Movement first**: user tests camera sensitivity, jump, crouch, speed, wall collision, comfort. Only change one mechanic family at a time.
2. Weapons: implement a single original physically mounted model, muzzle, one reliable sight, bullet/raycast and impacts **only after movement passes hands-on testing**.
3. Destruction and gadgets: introduce each with an isolated test and regression gate.
4. Map/editor: create a custom editor and a real building only after movement, weapons, and collision work. Never generate several unfinished maps at once.
5. Real multiplayer: separate BLACKOUT-specific backend, authoritative room and movement, and live two-browser smoke-test. Never claim AI are networked humans.
6. Keep GAMESHUB and REDLINE unaffected. No changes to shared `worker.js` or `wrangler.json` without an explicit, separately verified release.

## Testing

`node --test games/blackout/reboot/*.test.mjs`

CI in `.github/workflows/blackout-regression.yml` is reset to these V0.4 tests, not tests for removed V1–V8 gameplay. The workflow checks JavaScript syntax and collision/movement behavior. **A passing CI result is not a browser playtest.**

## Rollback

History still contains the full V8.1 implementation. Git can recover the older files if the user explicitly requests it. We do **not** delete Git history or touch REDLINE.
