# PROJECT BLACKOUT V0.1 — Gate 1 movement + collision QA

**Build:** 2026-10-18, Training Annex movement prototype.
**Path after GAMESHUB Pages deployment:** `/games/blackout/index.html`.
**GitHub branch:** `main`; all changes are separate from REDLINE.

## Implemented

- Self-contained first-person Three.js Training Annex: four accessible
  areas, solid perimeter and divider walls, functional doorways, S-turn
  corridor, enclosed ceiling, static props, raised platform/ramp,
  20cm-step staircase, and standing-blocked / crouch-accessible duct.
- All primary static blockers are registered in the same `box()` call
  that creates their visible mesh. No hidden obstacle-only blocker pass.
- WASD, mouse-look, Shift sprint, Ctrl/C crouch, Q/E lean with wall-aware
  head clearance, collision sliding, floor-height tracking with gravity,
  and under-roof standing checks.
- Pointer lock/ESC pause & resume, reset position, stage-1 training
  HUD, 4-zone exploration objective, minimap, F3 collider overlay and
  observed frame-rate readout. Stage 1 purposefully has **no weapon**,
  network players, bots, server, stats or account access.
- `main.js` clamps large elapsed frame time for movement stability,
  but FPS reports the actual elapsed time rather than the clamped amount.

## Executed tests (headless/mocked geometry, NOT browser rendering)

- Syntactic JavaScript module parsing: PASS.
- Model builds the intended four zones with 41 AABB colliders.
- Static test probes: player spawns outside blockers; west and range
  door openings pass; solid sections of those walls block; both
  S-turn hallway dividers block where solid and pass where open;
  outer walls block; standing cannot pass the 1.38m clearance duct,
  crouched 1.10m body can.
- Movement trials at fixed 60Hz: walking into solid west wall stops at
  x≈-7.56; walking into the open west door crosses to x≈-4.22;
  standing stops before duct at z≈4.38; crouching traverses duct to
  z≈6.94.
- Ramp checks at 0.9, 1.3, 1.8, 2.4, 3.2, 3.7s: player smoothly climbs
  and stays on the ramp/platform at floor heights 0.27, 0.44, 0.66,
  0.78, 0.78m; descends to ground after leaving the platform.
- Stair test at fixed 60Hz: four physically graded treads of
  0.20/0.39/0.58/0.78m allow player to climb onto top landing; the
  third trial is on the 0.78m landing, stepping off returns to floor.
- Reachability grid BFS at 0.5m horizontal resolution, with the
  actual colliders, standing player radius and 0.23m step limit:
  EQUIPMENT BAY, MOBILITY LAB, CROSSROUTE CORRIDOR and FIRING RANGE
  all reachable from the initial spawn. In earlier test at pre-stair
  revision, 5,570 of 7,081 sampled floor tiles were reachable; the
  subsequent stair addition was tested separately for traversal.
- One early QA test wrongly marked the ramp as failed at 3.7s after
  player had *already left the platform*; checking intermediate
  positions showed the physical floor alignment was correct.

## Still to verify in a real desktop browser

- Actual Cloudflare deployment and browser loading of Three.js CDN:
  site couldn't be fetched by the analysis environment; do not claim
  a successful live-browser run.
- Pointer lock in the user's browser, WASD/mouselook feel, rendering
  and lighting, full walk-through, no graphical gaps, 60 FPS target at
  1080p, pause/resume five times and lack of console errors.
- End-to-end input feel and camera head clearance under unusual
  corner conditions: mock tests alone are not enough.
- Stage 2 (firearm, hits, recoil) and Stage 4 (server multiplayer)
  are **not implemented**.

## Manual test

1. Open `/games/blackout/index.html` (signed in to GAMESHUB).
2. Click ENTER TRAINING; verify first-person mouse-lock and HUD.
3. Walk from EQUIPMENT BAY to the corridor through the visible door
   near its northeast side. Check you cannot clip through solid wall.
4. Navigate around the two offset barriers in the S-turn hallway.
5. Enter FIRING RANGE through its proper open doorway at south end.
6. Find MOBILITY LAB, walk up the sloped ramp and the four-step test
   staircase; attempt to walk sideways through the raised platform
   (should not teleport upward).
7. Walk into the low duct standing (blocked), hold Ctrl and pass it,
   release Ctrl while underneath it (should stay crouched), exit
   and release (standing restores).
8. Lean with Q/E next to a wall; camera should not pass through.
9. Press F3 to display real collider outlines, check they match walls.
10. Press ESC, resume, then Reset Position. Check the minimap and
    four-zone objective. Use the console to check for runtime errors.

**Gate 1 is code-and-geometry test complete; visual/browser gate pending.**
