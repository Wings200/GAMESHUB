# REDLINE V11.2 — nitro tone / engine masking fix

## Diagnosis from 2026-10-17 user recording

The provided 74-second Arctic screen recording was inspected with the
music muted. The captured stereo AAC track was reduced to a 16 kHz mono
analysis stream (no changes were made to the recording itself).

A near-stationary **369–371 Hz line** appeared repeatedly during moving/
boosting intervals (e.g. 17s, 27s, 37s, 60s and 67s), sometimes accounting
for roughly **30–40% of the measured power** in a short analysis window.
This matches the V11.1 soundscape's persistent
`boostTone.frequency = boost ? 370 : 260` sine oscillator. While nitro
was engaged, its direct connection to the SFX bus masked the sampled
engine. The same frequency persisted despite different road speeds.

## Change

- Remove the entire continuous nitro `boostTone` and `boostGain` signal
  path. The existing short, pitched `eventTone("boost")` on boost
  activation stays. Holding nitro never creates a constant-pitch tone.
- Lower the auxiliary turbo whistle from `.009` to `.0035` gain,
  and tire sine from `.015` to `.009`, to prioritize the two
  recorded engine WAVs.
- Preserve the original constant-power engine crossfade, all nine car
  profiles, saved Master/Engine/SFX settings, exhaust/impact/shift cues,
  and procedural tonal fallback for unavailable WAVs.
- Refresh the module version in `audio.js` and the `index.html`
  audio script URL so browsers cannot load the old 370 Hz oscillator
  from cache.

## Test results and limitations

- A mocked Web Audio lifecycle test passed **12/12** assertions:
  two persistent engine samples; four rather than five continuous tone
  oscillators; no fixed 370 Hz tone; a *single* brief event during three
  seconds of holding boost; re-trigger upon release/re-press; no
  additional steady-state source allocations; safe race cleanup/restart.
- Static syntax, integration and unchanged gameplay/Worker validation
  were also performed.

This fix addresses a **concrete cause shown by the audio capture**, but
the actual samples are still two older 1000/2000 RPM WAV assets. If the
engine continues to sound low-quality after this release, replacing those
source recordings is preferable to adding more synthesized layers.
Live headphone testing remains necessary; the Web Audio tests do not
measure subjective realism.
