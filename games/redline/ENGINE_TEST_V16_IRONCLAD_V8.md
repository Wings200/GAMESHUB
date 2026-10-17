# IRONCLAD 440 — Engine Lab V16 Recorded Flathead V8

## Status / links

The live production REDLINE game and Worker were **not modified**.

Engine Test Lab:
https://redline-dnk.pages.dev/games/redline/engine-test.html

Audio bank is a separate **binary asset that the owner must upload**:
`games/redline/assets/audio/redline-ironclad-v16-audio.bank`

The audio uploader (GitHub) does not accept WAV/OGG through the text-only editing connector. Without that bank, the lab still runs and IRONCLAD uses the safe V11.2 fallback. The lab UI explicitly reports V16 bank status.

## Recorded sources and attribution (required)

Two authentic 1951 Mercury 255-cubic-inch flathead V8 recordings by **lonemonk**, on Freesound, **Creative Commons Attribution 4.0**:
- `1951 Mercury-Warm start and idle.wav`: https://freesound.org/people/lonemonk/sounds/62564/
- `1951 Mercury-Idle and Throttle 2.wav`: https://freesound.org/people/lonemonk/sounds/62567/
- License: https://creativecommons.org/licenses/by/4.0/

Attribution: "V8 engine audio adapted from 1951 Mercury Warm Start and Idle and Idle and Throttle 2 by lonemonk (Freesound), licensed CC BY 4.0. Edited into RPM loops, high-pass filtered, crossfaded, leveled, and compressed to Ogg Vorbis for REDLINE."

The Engine Lab page contains clickable, visible credit links. Carry this attribution forward if audio is ever promoted to production.

## Source inspection and limitations

Original audio: two 44.1kHz stereo 16-bit WAV files, 32.674s and 50.708s. The warm-start take has a usable crank/idle. The throttle take has short idle, several distinct throttle blips and longer rising revs between approximately 20–40s. Some unwanted human voices occur near the very end, so the selected segments stop at 40.38s.

These are **stationary free-rev recordings**, not dedicated RPM/load bank captures from a dynamometer or a running racecar. We built eight distinctive loop layers and one startup sound, but calling these independent true engine load recordings would be inaccurate. Expect differences from a professionally recorded multiband, on/off-throttle engine bank (especially during long sustained acceleration).

## V16 game-audio implementation

- `engine-test-v8-soundscape.js`: standalone recorded V8 soundscape with source decoder, eight simultaneous RPM layers, throttle-dependent blends and V11.2 fallback.
- `engine-test-audio.js`: test-only audio mixer wraps V11.2 in V16, then V15 GT, with selected-car-specific startup sounds.
- `engine-test-controller.js`: test garage shows V16 label, bank readiness and on-page CC BY credits; all cars stay free and offline.
- `engine-test.html`: separate lab entrypoint.
- Bank built as 9 Ogg Vorbis streams inside `RDL16V8!` version-1 custom game container. Bank contains eight loopable stereo clips and one startup; about 240 KiB.
- Loop seams crossfaded over 120 ms; 38 Hz high-pass to remove mic rumble; levels normalized without distorting the original engine.
- IRONCLAD 440 only uses V16 when bank is loaded. GT still uses V15 recorded inline-six. Seven other cars use V11.2 until separate real engine recordings arrive.
- No modifications to production `index.html`, `audio.js`, `game.js`, purchase catalog, multiplayer Worker, or account data.

## Testing

1. Upload `redline-ironclad-v16-audio.bank` to `games/redline/assets/audio/` through GitHub's native upload control and commit to main.
2. Visit the Engine Test Lab page; select IRONCLAD 440. It should say **V16 · recorded Mercury V8 ready**. If it says fallback, verify file path and Cloudflare deploy.
3. Start a drive. Listen to the engine at idle, mid-RPM, high RPM, throttle release and during gear changes.
4. Switch to GT and verify that the existing real i6 sound still plays.
5. Switch to another car and confirm original V11.2.
6. Open normal REDLINE and confirm no test changes to garage ownership, cash or live V15 GT sound.

Tests performed: both WAVs probed/visually inspected and short segments listened to; nine Ogg layers individually recognized and decoded by ffprobe; custom bank header/list/length validated; Web Audio engine factory mock tested (8 layers on V8 car, V11.2 fallback on non-V8, safe shutdown). Actual live browser playback **has not yet been validated** by user.

## Recording selections in seconds

| Layer | Source | Range |
|---|---|---|
| idle | warm start | 13.40–16.45 |
| low_off | idle/throttle | 23.05–24.54 |
| low_on | idle/throttle | 24.95–26.62 |
| med_off | idle/throttle | 29.42–30.82 |
| med_on | idle/throttle | 27.18–28.57 |
| high_off | idle/throttle | 39.07–40.38 |
| high_on | idle/throttle | 36.62–38.08 |
| maxRPM | idle/throttle | 38.00–39.04 |
| startup | warm start | 0.00–2.62 |
