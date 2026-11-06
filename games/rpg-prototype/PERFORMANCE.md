# W20.64 — Chromebook Performance and Combat QA Pass

## What changed

- Browsers reporting at most 4 GB of memory or 4 logical CPU threads now
  start in low graphics. Manual **QUALITY** selection remains available.
- A sustained frame rate below 28 FPS across two three-second windows
  automatically reduces high graphics to low. Isolated stutters, background
  tabs and manually chosen quality do not trigger an automatic change.
- Low graphics uses at most 1x device pixel ratio, disables shadow rendering,
  skips small decorative rivets, dust and optional practical lights.
- Continuously changing HUD elements update around ten times per second
  instead of once per rendered frame. Weapons and combat simulation still
  tick on each game frame.
- The power-armor service rig and hidden pilot no longer solve every joint
  every frame while the player is not boarding or exiting. Active transitions
  remain full-frame, including the final settled pose.
- Unchanged clothing/armor appearance no longer triggers repetitive avatar
  updates. Camera projection matrices only update when field of view changes.
- Press **F3** to show the debug weapon HUD, including measured FPS, GPU draw
  calls, triangles and actual render pixel ratio. Wait a second for values.

## Verification and known limitations

`node --test games/rpg-prototype/render-performance.test.mjs` verifies
low-spec selection, sustained slow-frame detection, stutter handling and
manual-quality behavior. The browser smoke fixture now explicitly gives its
test-only character owned firearms, because new player saves correctly start
unarmed.

Measured Chromebook frame rates and GPU timing still require testing on the
actual Chromebook; automated desktop/software-WebGL tests are not a substitute.
This is the first targeted audit of the expensive game loop, not a claim that
all existing gameplay issues or legacy automated test failures are resolved.
