# BLACKOUT V0.26.1 original defuser audio

The two playable objective clips are fresh mixes of publicly available CC0 recordings. They contain no extracted Rainbow Six Siege or Ubisoft game audio.

## Inputs (Creative Commons CC0 1.0)

- **Keyboard recording:** `IBM M2 sound.ogg`, Anonimski, Wikimedia Commons: https://commons.wikimedia.org/wiki/File:IBM_M2_sound.ogg
- **Mechanical case and latch:** `clank1.wav`, `lightclunk1.wav`, `mechanical1.wav`, Brian MacIntosh / BMacZero, OpenGameArt: https://opengameart.org/content/mechanical-sounds

Both creators explicitly published these source recordings as CC0. Credit is optional but retained here for provenance.

## Generated in BLACKOUT

- `DefuserPlantOriginal.ogg`: opening and two latches, then filtered keyboard handling/typing; fades to the end of the existing 7.35-second plant animation.
- `DefuserDisableOriginal.ogg`: lighter tablet-unpack impact, subdued higher-frequency typing/taps, and a 7-second fade synchronized to the disable interaction.
- The arm confirmation, periodic defuser beep, shutdown, and round-end sounds are BLACKOUT-created WebAudio events in `legacy-audio.js`. They are not extracted game files.

Only one timer owns planted-device beeps. The plant and disable recordings are cancellable, and no recorded beep loop is mixed beneath them.
