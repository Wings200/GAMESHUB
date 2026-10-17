# REDLINE V14 — Physically simulated engine audio (experimental)

## Motivation
The uploaded 37.8-second V13 gameplay recording and user report confirm the core defect: changing oscillator frequency produces a sustained synthetic note, rather than multiple distinct engine sounds and realistic exhaust texture. V12's Wikimedia field recording also contained unrelated voices and pre-recorded acceleration.

V14 is an **opt-in experiment only**. Production V11.2 and V13 previews are preserved.
- Test: `/games/redline/index.html?engine=v14`
- Original default: `/games/redline/index.html`
- Previous V13: `/games/redline/index.html?engine=v13`

## Physical model
V14 integrates third-party browser WebAssembly engine simulation from [pbonnard/engine-sound](https://github.com/pbonnard/engine-sound) (MIT declared in `Cargo.toml` and `js/package.json`, derived from Ange Yaghi's engine-sim). The worklet models firing/cylinder pressure, valve timing, intake and exhaust flow and a muffler response. This is not a real-car recording and **no claim of photorealistic output is made**.

A fixed upstream Git commit `3bb78e6477c992aee8baabee16a890a7a2f92a6e` is used for JS and WASM over jsDelivr. External delivery is **only attempted if** `?engine=v14` was explicitly requested. Failure to load JS/WASM or create an AudioWorklet leaves the normal V11.2 sampled engine running and displays a fallback error in the test badge.

## REDLINE integration
- One physical engine voice uses the local player's RPM and throttle from `game.js` via `REDLINE_AUDIO.updateTelemetry`. Its built-in drivetrain is set to neutral so it does not fight authoritative REDLINE car physics.
- Different purchased cars select different simulated layouts: inline-4, flat-4, inline-6, crossplane V8, flat-plane V8, and V10. Several also vary intake/crank dimensions, jitter and exhaust brightness.
- The physical engine voice routes into existing master/engine-volume buses.
- Existing V11.2 tire, impacts, shifts, turbo effects and startup sounds remain on the SFX bus; V11.2 engine only fades while simulation runs successfully.
- No changes to multiplayer, car physics, purchases, garage, menus or maps.
- The engine graph is disposed between races. A failed WASM load automatically returns the V11.2 engine.

## Validation
- JavaScript parses.
- Mocked AudioWorklet engine startup, update for 2 car families, a car-model swap, stop/dispose, and an async load after stop were exercised.
- **Browser playback, live upstream CDN delivery, actual ear-level timbre, and performance on Chromebooks have not yet been verified.** Please audition on desktop first.

## Feedback to collect
1. Does the badge show `PHYSICAL ENGINE ACTIVE` or a fallback/loading error?
2. Does the V8 sound like a firing engine rather than a changing electronic tone?
3. Does the engine naturally respond to RPM drop, gear shifts, throttle lift, and full-throttle acceleration?
4. Compare IRONCLAD (crossplane V8), OBSIDIAN (flat-plane V8) and PHANTOM (V10).
5. Test another race to check that engines do not overlap.

If it still sounds simulated, the next candidate should be a professional, licensed bank of **genuine isolated recordings** with idle / low / medium / high RPM and acceleration/deceleration load variants. It is not credible to imply that merely adding more oscillator layers or a concert field recording guarantees realism.
