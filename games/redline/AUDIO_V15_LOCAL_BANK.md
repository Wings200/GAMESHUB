# REDLINE V15 — Real recorded inline-six preview (local file workflow)

## Why local ZIP
The user acquired Skril Studio's `i6 German - Free Engine Sound Pack` via Unity Asset Store, then uploaded `i6_german_free.zip` to the conversation.

This pack is distributed under the publisher/Unity Asset Store license, **not CC0**. Raw WAV files should NOT be copied to public GitHub or offered as directly downloadable samples. Unity's EULA allows embedding licensed assets in games under its rules but forbids standalone redistribution. This V15 preview intentionally keeps the licensed samples in **the user's browser memory** and never sends them to any server.

## Test
- Open `https://redline-dnk.pages.dev/games/redline/index.html?engine=v15`
- Click **Choose File** in the V15 panel at the bottom left; select the same original ZIP (`i6_german_free.zip`).
- The panel should say `9 exterior recordings ready · ZIP stays on your PC`.
- Select the **REDLINE GT** and start a race.
- Wait for `REAL i6 ENGINE ACTIVE`, then test acceleration, throttle release, gear shifting and idle.
- Reloading the tab requires selecting the ZIP again. No persistence or upload occurs.
- Choosing another car intentionally restores the V11.2 audio, rather than mislabeling this inline-six pack as V8 or V10.

## Sound design
- **Eight sustained layers:** idle, low_off/on, med_off/on, high_off/on, maxRPM.
- Blend **adjacent genuine RPM recordings** (not one loop repeatedly pitched up).
- At each RPM band blend real **on-throttle vs off-throttle** sounds using smooth constant-power gains.
- Keep each recording's playback rate near original (0.92–1.08) so texture changes from **different recordings**, not major pitch-shifts.
- Normalize approximate levels based on measured waveform RMS, use moderate overall gain to prevent the original heavily mastered recordings from clipping the final mix.
- Replace the legacy startup sound with this pack's authentic `startup.wav` when a ZIP is selected.
- Preserve the normal game master/engine/SFX settings, physics-driven RPM/gear telemetry and V11.2 tire, collision and nitro effects.
- V11.2 engine remains a fallback while ZIP is not selected, during decode failures, or while driving a non-GT car.

## Technical inspection
- ZIP has **18 WAV files** (9 exterior, 9 interior); only exterior sounds are used.
- 44,100 Hz stereo 16-bit PCM.
- Sustained loops approximately 1.10–1.20s, idle ~4.69s, startup ~1.26s.
- Existing WAV files from the user's ZIP are **not** added to repository.
- Actual 4.6 MB ZIP Deflate archive successfully unpacked under Node's `DecompressionStream('deflate-raw')` API, validating method-8 offsets, the nine required filenames and RIFF headers.
- Mocked ZIP/file and Web Audio source tests passed start, 8-loop load, car switch to V11.2, shutdown and fallback.
- Browser quality **not yet validated**; do not claim sample mixes sound photorealistic until a user hearing test.

## Future deployment
To distribute sound to public players without needing each player's ZIP, acquire explicit appropriate permission or choose a separately redistributable audio bank, and ensure actual embedding follows licensing conditions. Never upload this user's raw Unity pack as freely downloadable GitHub blobs.
