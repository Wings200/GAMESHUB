# BLACKOUT V0.26.2 original rhythmic defuser audio

All six objective sounds are original BLACKOUT renders and/or new mixes of publicly available CC0 recordings. **No Rainbow Six Siege / Ubisoft recording, extracted game file, or original waveform was used.**

## Inputs (Creative Commons CC0 1.0)

- **Keyboard recording:** `IBM M2 sound.ogg`, Anonimski, Wikimedia Commons: https://commons.wikimedia.org/wiki/File:IBM_M2_sound.ogg
- **Mechanical case and latch:** `clank1.wav`, `lightclunk1.wav`, `mechanical1.wav`, Brian MacIntosh / BMacZero, OpenGameArt: https://opengameart.org/content/mechanical-sounds
- **Human keypresses:** `human/vel-008.wav`, `generated/007_irregular.wav`, and `keypress/004.wav`, `keypress/021.wav` from *Keyboard Soundpack 1 (Typing and Single Keystrokes)*, unicaegames, OpenGameArt: https://opengameart.org/content/keyboard-soundpack-1-typing-and-single-keystrokes

All three source sets are published as CC0. Credit is optional but retained here for provenance.

## Generated in BLACKOUT

- `DefuserPlantV2.ogg`: opening clack and two latches, followed by real human typing and distinct final confirmation keys; length about 7.31 seconds (plant action: 7.35 seconds).
- `DefuserDisableV2.ogg`: tablet unfold with uneven touchscreen-like input and a final disconnect key; length 7.00 seconds (disable action: 7 seconds).
- `DefuserArmV2.ogg`: two separate pitched ascending/descending woo-woo confirmations plus a mechanical click; length 0.77 seconds.
- `DefuserTickV2.ogg`: a discrete, rounded pitched pulse with tactile click; length 0.17 seconds.
- `DefuserTickUrgentV2.ogg`: brighter but otherwise similar pulse; length 0.17 seconds.
- `DefuserShutdownV2.ogg`: two descending disarm notes with a case click; length 0.88 seconds.
- `defuser-cue-render.mjs` deterministically generates the four original cue waveform inputs; they are mastered with CC0 case/key textures to produce the four cue OGGs above. Legacy procedural events remain as **fallback only** if an asset fails.

Only one clock owns post-plant beeps: ~0.94 seconds apart initially, quickening near the end. The arm confirmation finishes before the first beep. Planting/disable playback is cancellable; defender success immediately stops the repeating beeps before the shutdown sound. The beep is globally audible, not doubled by a second background layer.
