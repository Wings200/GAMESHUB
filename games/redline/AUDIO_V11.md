# REDLINE V11 — Racing audio overhaul

## Player-facing changes

- **Continuous engine crossfade:** the existing `engine-1000.wav` and
  `engine-2000.wav` recordings both play continuously and blend over an
  RPM range, instead of swapping abruptly and causing 50 ms dead air.
- **Nine engine characters:** the existing three starter cars and six
  dealership cars use different pitch, harmonic edge, and low-end rumble.
  Ironclad emphasizes bass; Obsidian and Phantom emphasize higher revs.
- **Real physics-driven audio:** `game.js` sends only the local driver's
  RPM, gear, speed, throttle, brake, handbrake, lateral slip, track surface,
  nitro/boost, airborne state, and impact intensity to the audio layer.
  Remote cars remain ghosted and do not produce local audio traffic.
- **New effects:** shifts/exhaust burbles, pitch-following turbo whistle,
  boost/nitro wind-up and whoosh, filtered tire friction and squeal, speed
  wind, and short collision thumps. Ice and snow produce quieter tire
  screeches than asphalt.
- **Audio fallback:** if one or both engine WAV loops fail to download or
  decode, a continuously running synthesized engine layer remains audible.
  The original startup WAV still plays where available.
- **Existing settings work:** the same three saved volumes—Master, Engine,
  SFX—control both the sampled engine and new procedural sounds.
- **Race lifecycle safety:** only the START gesture initializes WebAudio;
  a double-click cannot create two racing contexts while samples decode.
  Stopping a race fades and tears down looping sources. New races reuse
  the same context. Hidden tabs still suspend audio as before.
- **Browser refresh:** versioned `game.js` and `audio.js` URLs ensure
  that cached V10.2/Arctic builds don't hide the V11 changes.

## Files

- Added `audio-v11-soundscape.js`: modular procedural/sampled audio mixer
  built from Web Audio nodes with no external libraries.
- Updated `audio.js`: integrates the V11 mixer into existing settings,
  start/stop/menu visibility hooks; original startup and legacy fallback stay.
- Updated `game.js`: sends *only* a compact audio telemetry snapshot at
  the end of the existing local car update. Physics is unchanged.
- Updated `index.html`: cache-busts the new game and audio scripts.

## Validation

- **33/33** final syntax, source-integration and baseline regression checks.
- **12/12** end-to-end mocked audio lifecycle checks passed: context
  initialization, audio start/stop/restart, sampled startup, car-specific
  telemetry, engine RPM, volume settings and shared AudioContext.
- Separate mock tests covered all nine sound profiles, hundreds of driving
  frames, missing sample fallback and source shutdown. These are not
  listening tests.

## Live testing checklist

1. With the Engine volume at 70–100% and SFX at 60–80%, drive GT,
   Ironclad and Phantom. Pitch, rumble and acceleration should differ.
2. Accelerate through multiple gears: the engine should not pause or snap
   silent at the low/high recording transition.
3. Drift on asphalt versus Arctic snow, boost with Shift, and gently hit
   a guardrail. Verify tires, boost and impact are audible but not harsh.
4. Enter Garage, start a second race and change the Engine/SFX sliders.
   Confirm that engine layers aren't doubled or stuck playing after exit.
5. Test on Chromebook or a low-end PC with music enabled. If performance
   or audio quality regresses, the last main commit can be restored without
   changing cars, cash or backend data.

**Note:** Tests ran against mocked Web Audio and source checks, not
a real browser speaker/headset. A real gameplay/listening test is still
required before declaring the new mix finalized.
