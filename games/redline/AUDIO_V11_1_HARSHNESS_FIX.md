# REDLINE V11.1 — Fix abrasive / sandpaper engine sounds

## What went wrong in V11

A player's listening test reported that engines sounded like sandpaper.
The source audit uncovered several likely contributors:

- V11 ran **four separate white-noise loops** through the tire, wind,
  turbo and boost effect layers at all times (plus additional short
  noise bursts on shifts and impacts).
- The recorded 1000-RPM / 2000-RPM samples could be pitched up to
  **2.65× and 3.65×**, respectively, producing harsh high frequencies.
- Gear changes already had a short shift envelope; the old audio loop
  also applied a second 900-RPM pitch drop, doubling the effect.

## Corrective V11.1 design

- Keep the existing sampled engine WAV recordings as the main sound.
  The low- and high-RPM samples play continuously through separate
  gentle **2100Hz / 2750Hz low-pass filters** with constant-power blending.
- Limit playback rates to roughly **0.82×–1.72×** rather than
  excessively overcranking the recording.
- Remove **all always-running noise generators** from the driving
  soundscape. No broadband wind or tires at idle.
- Add very quiet, smooth sine/triangle tonal support beneath the
  recordings, with louder tonal fallback only when both WAV files
  are unavailable.
- Gear changes and impacts use short pitched envelopes rather than
  random-white-noise bursts. Tire squeal is subtle and only plays
  during actual drifting/handbraking; boost is quiet and conditional.
- Preserve individual RPM/pitch characters for all nine cars, including
  low-pitched Ironclad V8 and high-pitched Phantom.
- Preserve the existing `REDLINE_AUDIO` volume API and saved engine,
  SFX and master settings.
- Stop applying the legacy audio-loop shift RPM drop when the new mixer
  is running, preventing the double shift sound.
- Cache-bust the soundscape import and the page's `audio.js` URL to
  ensure browsers load the revised audio rather than cached V11 code.

## Scope and tests

Only `audio-v11-soundscape.js`, `audio.js`, `index.html` and this
document are changed. All multiplayer, Garage, accounts, track geometry,
Arctic V4, Neon V8, cars, upgrades and race physics remain unchanged.

- **27/27 final parsing, structure and no-regression checks passed**.
- A mocked Web Audio stress test verified two simultaneously playing
  WAV sources, stable playback rates, all nine pitch profiles, 300
  steady driving frames without additional sound node allocations,
  clean stops/restarts, and a missing-WAV tonal fallback.
- This is a code-level audio-quality correction, **not a live listening
  test**. Actual engine-recording quality is limited by the current
  two low-RPM WAV files. Better multiband recordings will ultimately
  be needed for convincingly realistic high-RPM engine audio.

After deploying, hard-refresh REDLINE, turn music down, and test the
Ironclad, Phantom, acceleration, shifts, drifting and nitro. Compare
against V11's abrasive sound. If still harsh, replace/re-record the
underlying WAV samples rather than layer more synthetic noise.
