# BLACKOUT V0.26.3 original rhythmic defuser audio

All six objective sounds are original BLACKOUT renders and/or new mixes of publicly available CC0 recordings. **No Rainbow Six Siege / Ubisoft recording, extracted game file, or original waveform was used.**

## Inputs (Creative Commons CC0 1.0)

- **Keyboard recording:** `IBM M2 sound.ogg`, Anonimski, Wikimedia Commons: https://commons.wikimedia.org/wiki/File:IBM_M2_sound.ogg
- **Mechanical case and latch:** `clank1.wav`, `lightclunk1.wav`, `mechanical1.wav`, Brian MacIntosh / BMacZero, OpenGameArt: https://opengameart.org/content/mechanical-sounds
- **Human keypresses:** `human/vel-008.wav`, `generated/007_irregular.wav`, and `keypress/004.wav`, `keypress/021.wav` from *Keyboard Soundpack 1 (Typing and Single Keystrokes)*, unicaegames, OpenGameArt: https://opengameart.org/content/keyboard-soundpack-1-typing-and-single-keystrokes
- **Real electronic timer beep:** *Setting Electronic Timer 1 Beep*, Rudmer_Rotteveel, Freesound: https://freesound.org/people/Rudmer_Rotteveel/sounds/536422/ — CC0 acoustic recording. The version used is based on the published high-quality preview.

All four source sets are published as CC0. Credit is optional but retained here for provenance.

## Generated in BLACKOUT

- `DefuserPlantV2.ogg`: opening clack and two latches, followed by real human typing and distinct final confirmation keys; length about 7.31 seconds (plant action: 7.35 seconds).
- `DefuserDisableV2.ogg`: tablet unfold with uneven touchscreen-like input and a final disconnect key; length 7.00 seconds (disable action: 7 seconds).
- `DefuserArmV3.ogg`: paired original arming sweeps, CC0 recorded device beeps, and mechanical clicks; length 0.77 seconds.
- `DefuserTickV3.ogg`: a physically recorded electronic-timer beep, isolated, lightly equalized and mixed with a quiet device click; length 0.207 seconds.
- `DefuserTickUrgentV3.ogg`: brighter processing of the same actual timer recording; length 0.207 seconds.
- `DefuserShutdownV3.ogg`: descending original shutdown swell, a real beep and a closing click; length 0.88 seconds.
- `defuser-cue-render.mjs` is the reproducible source for the original arming/shutdown waveform layers. Legacy procedural events remain as **fallback only** if an asset fails.

Only one clock owns post-plant beeps. Analysis of the user-supplied reference found a stable **0.235-second period** throughout the active-device portion, which this version reproduces as an abstract rhythm only (never by copying the reference samples). The prior 0.94-to-0.19-second acceleration was the largest mismatch. This version preserves fractional time across 60fps frames to avoid drift. The arm confirmation finishes before the first beep. Planting/disable playback is cancellable; defender success immediately stops the repeating beeps before the shutdown sound. The beep is globally audible, not doubled by a second background layer.
