# REDLINE ENGINE LAB V17 — LONG MERCURY V8 TAKES

## Why V17 exists
The owner's listening test of V16 confirmed recorded V8 playback was active, but the 1.2–1.5 second loops repeated audibly without convincing transition. V17 addresses this source/crossfade limitation; it does not claim the stationary recordings are a professional multiband dyno set.

## Licensed source, credits
- Two original 1951 Mercury recordings by lonemonk, Freesound, CC BY 4.0.
- https://freesound.org/people/lonemonk/sounds/62564/
- https://freesound.org/people/lonemonk/sounds/62567/
- https://creativecommons.org/licenses/by/4.0/
- Edited source recording ranges and audio processing listed in the local generated build_ironclad_v17.py and redline-ironclad-v17-segments.json files.

## Binary bank — 10 Ogg clips, 668,560 bytes
Upload path for public automatic testing (not needed for local bank loading):
`games/redline/assets/audio/redline-ironclad-v17-audio.bank`

Alternative immediate local test, with zero GitHub upload:
1. Download the generated `redline-ironclad-v17-audio.bank` into your PC.
2. Open https://redline-dnk.pages.dev/games/redline/engine-test.html?v=v17
3. In the bottom-left engine panel select the bank using **LOAD V17 .BANK FILE FROM YOUR PC**.
4. Choose IRONCLAD 440 and click TEST DRIVE.
5. Confirm **V17 ACTIVE · REAL LONG V8 TAKES**.
6. Compare using **A/B: HEAR V16 SHORT LOOPS** and **A/B: HEAR ORIGINAL**.

If public GitHub bank is absent, V16 remains fallback; GT retains V15, other cars keep V11.2.

## Longer segment bank details
- idleA: throttle file 1.15–9.55 (8.40s)
- idleB: throttle file 10.15–18.62 (8.47s)
- pullA: throttle 24.72–30.36 (5.64s)
- pullB: throttle 31.05–35.44 (4.39s)
- pullC: throttle 35.24–39.79 (4.55s)
- liftA: throttle 28.76–30.88 (2.12s)
- liftB: throttle 38.86–41.20 (2.34s)
- blipA: throttle 19.82–21.57 (1.75s)
- blipB: throttle 21.66–23.57 (1.91s)
- startup: warm start 0–2.62 (2.62s)
- All Ogg Vorbis quality 4.8 stereo with high-pass filtering, peak balancing and short endpoint fades.
- Source near the unwanted voices at ~47 seconds deliberately excluded.

## Runtime
- New independent `engine-test-v17-long-takes.js` imported **only** by `engine-test-audio.js`.
- Audio output routes `V17 => V16 => GT V15 => V11.2`.
- Two long idle captures alternate and crossfade around every 7s.
- Three multi-second genuine acceleration runs cycle on throttle starts, gear shifts and near the previous take's end; crossfade overlap is ~700ms.
- Separate throttle-lift and gentle rev blip takes trigger on input transitions.
- Only mild time-varying playback-rate correction; no resynthesis of engine waveform.
- Soundscape exposes debug: bank loaded/decoding, voice count, chosen recording, A/B modes.
- V11.2 and old V16 are still independently audible via test panel A/B controls.

## Verification
- All 10 compressed Ogg clips decoded correctly with ffprobe from the generated bank.
- JS syntax and mock Web Audio tests passed including multi-second throttle sequence and A/B routing.
- Browser listening quality remains subjective and is **not yet verified** by owner.
- Live REDLINE `index.html` / `audio.js` / Worker and garage ownership, wallet, leaderboard unaffected.

## Limitation
These are *real engine samples* but the originals are stationary throttle revs, not full RPM-by-load recordings. Additional recordings at sustained load will be needed for fully realistic long-drive acceleration.
