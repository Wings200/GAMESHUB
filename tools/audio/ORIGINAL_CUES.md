# GAMESHUB Engine original intro sounds — build 005

The first intro and sound-test cue were designed here, end to end, with an
original reproducible signal-processing script. No other generative AI, manual
audio workbench interaction, or third-party sound recordings were involved.

The design is a dark airy approach followed by three spatially separated
metallic locking sounds, a heavy inharmonic strike at 1.43 seconds (matching
the logo impact animation), a low pressure thump, and a diffused room tail.
The shorter test cue is a distinct pair of small metal latch impacts.

Regenerate locally from the repository root:

```bash
python tools/audio/design_intro.py /tmp/gameshub-logo-intro.wav /tmp/gameshub-test-cue.wav
ffmpeg -i /tmp/gameshub-logo-intro.wav -codec:a libmp3lame -b:a 160k /tmp/gameshub-logo-intro.mp3
ffmpeg -i /tmp/gameshub-test-cue.wav -codec:a libmp3lame -b:a 160k /tmp/gameshub-test-cue.mp3
```

The encoded MP3 files are packaged in `engine/generated-sounds.js` so they can
be decoded and played by the existing browser engine without binary Git asset
support. `EngineAudio.intro()` and `.ping()` use these assets, replacing their
old oscillator-only placeholder sounds. Skipping an intro stops playback.

Signal QA: both outputs are stereo 48 kHz, peaks are limited to approximately
0.9, and the logo file fades toward silence before the logo hold ends.

These are **first-pass original designed sounds**. Their file format, timing,
and playback flow can be tested automatically, but their perceived realism and
quality still require listening in a real browser. If a cue sounds artificial,
iterate on the sound design or use recorded Foley; do not label it polished.
