# REDLINE V13 — Clean RPM-locked engine experiment

## Why V12 was retired
The V12 Goodwood field recording had audible voices/crowd and unrelated pre-recorded speed changes. Changing HTML media playbackRate based on game RPM could not remove those existing recording events or make separate car engines.

## Current test
- Opt-in **V13**: `/games/redline/index.html?engine=v13`
- Default game: `/games/redline/index.html` (**unchanged V11.2**)
- Old `?engine=v12` safely uses V11.2, not the noisy Wikimedia file.
- No network fetch, voice source, external media, or license attribution is needed in V13; the waveform is generated from deterministic harmonic combustion pulse cycles in browser Web Audio.
- Distinct factory profiles for all nine cars. I4, inline six, V8, and V10 vary pulse cadence, low end, firing roughness, brightness, and optional quiet turbo tone.
- Frequency follows the carState.rpm telemetry already computed by `game.js`. Gear shifts follow transmission changes; throttle changes harmonic emphasis and perceived load.
- V11.2 engine content is suppressed only while experimental V13 runs; V11.2 tyre, nitro, impact and shift SFX are retained. If a browser cannot create the V13 graph, engine audio falls back to V11.2.
- Saved master/engine/SFX settings remain on the existing buses, unchanged.
- No changes to race driving, car visuals, purchase economy, accounts or multiplayer.

## Developer mock QA
- Script syntax parsed.
- Started synth and drove telemetry for all nine profiles.
- Exercised gear/RPM/throttle updates.
- Stopped and restarted synth without errors.
- Simulated unsupported periodic waves; V11.2 fallback engaged.
- Browser-audible sound quality **cannot** be established by mocks. This is an experiment, **not** a claim that the engine sounds photorealistic.

## Listening checklist
1. Start at idle with music off and listen for a steady, clean motor note (no speech).
2. Drive from 0 to top speed: pitch should track HUD RPM and drop at gear changes.
3. Let off throttle: intake brightness should drop while RPM coasts down.
4. Compare IRONCLAD 440's V8 low growl, BAYSIDE NX's turbo four, and PHANTOM XR's V10.
5. Exit race and restart: the previous tone must stop (no overlapping engines).

If synthetic timbre is still not convincing, a proper multi-RPM bank of **isolated, clean, licensed** engine loops will be required, and those should be audited by listening before shipping.
