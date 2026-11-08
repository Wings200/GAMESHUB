# GAMESHUB Engine — Assistant Audio Builder (dev build 004)

This is the **assistant-side production tool**. The existing Audio Workbench
is an optional visual mixer for developers; it is not required to build audio.

The assistant writes a small JSON recipe, supplies actual recorded clips,
and runs one command:

```bash
node tools/audio/build.mjs tools/audio/recipes/engine-intro.json
```

It automatically renders a stereo 48 kHz/16-bit WAV and an adjacent `.report.json`
containing output duration, input layer count, peak, loudness approximation
(RMS), safety attenuation, and warnings. Changes to any layer are repeatable:
edit JSON, rerun the command, compare and listen. No UI clicking or manual
editing of each sound is required.

## Recipe format

The example `recipes/engine-intro.template.json` defines the *planned* logo
sound. It is deliberately a **template**, not a completed sound. Three missing
recordings are required before it will build: a metallic assembly sound, a
low impact, and a rumbling ambience. Only use recordings we own or are licensed
to redistribute. Never misrepresent oscillator/noise placeholders as these
recordings.

Layer settings:

| Setting | Purpose | Default |
| --- | --- | --- |
| `source` | WAV recording path, relative to recipe | Required |
| `start` | Layer start in seconds | 0 |
| `trimStart`, `trimEnd` | Select part of recording | Whole file |
| `gainDb` | Layer volume in decibels | 0 |
| `pitchSemitones` | Playback speed/pitch change, -12 to +12 | 0 |
| `pan` | Stereo position, -1 to +1 | 0 |
| `fadeIn`, `fadeOut` | Fade durations, seconds | 0.01, 0.12 |
| `lowpassHz` | Optional high-frequency reduction | 20000 |

Global settings: `sampleRate` (22050–96000), `masterGainDb` (-48 to +12),
`output` (WAV path). Maximum 12 layers and 30 seconds to keep engine effects
small. The CLI accepts PCM WAV and float WAV recordings, mono or stereo. Convert
MP3/OGG in an editor or a trusted converter before using them. Unlike the
visual Workbench, the assistant builder intentionally has no browser/audio
format dependencies.

## Quality and release process

1. Collect/record authentic source effects and retain licenses. Prefer separate
   impact, mechanics, and room-tail sounds over synthetic beeps.
2. Put sources under `assets/audio/sources/<sound>/`, then copy the template to
   an actual recipe and point it at those recordings.
3. Build WAV + report with the command above. Check peak attenuation, warnings,
   and length. Iterate deterministically by editing the recipe.
4. Listen to the exported WAV on speakers and headphones, then preview it in
   GAMESHUB Engine with `EngineAudio.loadClip` and `playClip`.
5. Replace an existing oscillator effect **only after** the recorded cue passes
   user listening and timing tests. Keep original stems and recipe editable.

This tool automates arranging, processing, mixing, exporting, and reporting.
It **does not generate original realistic recordings**, locate sound licenses,
or guarantee subjective sound quality by itself. It is meant to remove tedious
editing while keeping the audio source and final listening check honest.
