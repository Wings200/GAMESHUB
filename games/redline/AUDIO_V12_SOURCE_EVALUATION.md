# REDLINE V12 — Real engine audio source evaluation

## Status

**Listening lab only. No game audio has been replaced.** V11.2 remains the
active audio baseline while genuine engine recordings are evaluated.

Live listening page (after Cloudflare Pages deployment):
`/games/redline/audio-v12-lab.html`.

## Candidate licenses and credits

Three real-car recordings are streamed without alteration from Wikimedia
Commons. The audio lab explicitly links the original pages and licenses:

| Candidate | What was recorded | Author / license / original |
| --- | --- | --- |
| A: Maserati GranTurismo S Exhaust | V8 starting, idling, revving; ~66s | **lmartins** — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [source](https://commons.wikimedia.org/wiki/File:Maserati_GranTurismo_S_Exhaust.ogg) |
| B: Ferrari 250 GTO, Engine Sound | Real classic Ferrari engine; ~60s | **Provo rossi** — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [source](https://commons.wikimedia.org/wiki/File:Ferrari_250_GTO,_Engine_Sound.ogg) |
| C: Ferrari 458 Italia | High-revving Ferrari pulling away; ~12s | **Edvvc** — [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), [source](https://commons.wikimedia.org/wiki/File:Ferrari_458_Italia.ogg) |

The 458 recording has a moving-car approach/departure and therefore may not
work as a sustained engine loop. Its CC BY-SA license also requires checking
ShareAlike compatibility if redistributed in modified form. Each candidate
should be assessed separately for crowd/background noise, realistic exhaust
timbre, recording stability, and suitable clean sustained sections.

The preview uses public original file URLs from Wikimedia Commons; it does not
download/store these licensed sound recordings into the REDLINE repository or
modify the originals. External source availability cannot be guaranteed.
Users can follow the source-page links if a browser blocks direct playback.

## Why we are doing this

Earlier V11 mixes made a user-recorded car sound like sandpaper because of
broadband-noise generators and excessive playback rates. V11.2 removed a
sustained fixed 370 Hz nitro sine heard clearly in a user recording, but
two weak low-RPM WAV loops remain the only native engine sources.

Simply adding more EQ or pitching those two loops harder has not produced
convincing racing-engine audio. V12 should prioritize better recorded
material with a real load/RPM timbral progression.

## Proposed engine-bank design (not live)

1. After listening, select suitable recordings with straightforward
   redistribution licenses and good signal/noise ratio.
2. Find and crop clean sustained idling, low, middle and high RPM sections.
   Normalize loudness and create click-free cyclic loops; do not loop the
   complete passing-car recording. Test whether clips are steady enough.
3. Export short optimized Ogg/MP3 files to this repository, with exact
   attribution, license link and a modification statement. Prefer
   **multiple genuinely different RPM segments**, not merely pitch-shifted
   copies of a single take.
4. Use weighted, smooth crossfades by the local car's RPM/load with narrow
   playback-rate corrections. Map each car to an appropriate recording
   family, keeping proper master/engine/SFX volume controls.
5. Test the bank in a separate live-browser preview with music muted and
   check idle, acceleration, high speed, shifts, nitro, and restart.
6. Only once the audible preview gets user approval should the working
   V11.2 mixer be swapped for the V12 bank.

### What is not claimed

- A source being a real car recording does **not** automatically make it
  a high-quality looping race audio sample.
- This initial V12 step does **not** implement separate 4-RPM sound banks,
  change racing audio, or measure what the candidates sound like to users.
- The audio originals were not pulled into this environment for waveform
  auditing; the candidate list is based on source descriptions and licenses.
