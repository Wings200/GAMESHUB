# GAMESHUB Engine Audio Workbench — Build 003

Developer-only page: `/games/engine-test/audio-builder.html`

This is an **audio production pipeline**, not a tone synthesizer. It processes
real recorded assets. The old oscillator-based intro and test ping have **not**
yet been replaced; they remain known placeholders until approved recordings are
ready. Never claim those old placeholder sounds are realistic.

## Repeatable authoring process

1. Select recordings we made or legitimately licensed. Keep attribution and
   license information alongside third-party source files.
2. Import the recorded components as separate layers. Use identifiable source
   filenames so the saved recipe can be reproduced.
3. Trim recordings to the needed transient and tail. Adjust each layer's gain,
   pitch, start delay, stereo position, fades and high-cut filter.
4. Preview the mix on headphones and speakers. Reject harsh clipping, buzzing,
   unintentional silence, masking and artificial sounding pitch shifts.
5. Export both `sound-name.wav` and `sound-name-recipe.json` to preserve an
   editable source record. Store the source recordings separately.
6. Check the exported WAV in its actual gameplay context at realistic volume.
   Only then use `EngineAudio.loadClip(name, url)` and `playClip(name, options)`
   in a game. Listen again while moving in the 3D environment.

## Quality rules

- Use actual recordings for recognizable real-world effects. Filters and
  oscillators alone cannot create convincing impacts, footsteps, machinery,
  weapon effects or environments.
- Mix quiet and loud layers with headroom; don't solve weak sounds by simply
  maximizing every track.
- Keep the initial workbench limited to 12 layers and 30 seconds per mix.
  Longer music and ambiance require a separate streaming pipeline.
- Use source recordings at the appropriate sample rate. The WAV export is
  stereo 16-bit PCM at 48 kHz; it is not a lossless archive of original stems.
- Never ship unlicensed assets. A saved recipe references local source names
  and does **not** include or grant rights to those recordings.
- Keep new sound implementation behind the developer gate until it has been
  heard and approved in a game build.

## Current limits

The first workbench supports multi-layer mixing, trimming, delay, gain,
pitch, stereo pan, low-pass filtering, fades, preview, a dynamics compressor
and WAV/JSON export. It does not yet provide convolution reverb, a spatial
3D audition room, multitrack waveform automation, a licensed sample library,
or automatic replacement of any game's existing sound effects.
