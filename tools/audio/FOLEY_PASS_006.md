# GAMESHUB Engine — sound-design pass 006

User listening notes after build 005: the test button sounded like a doorbell, while the intro was decent but not sufficiently metallic.

Build 006 preserves the original intro clip and its visual timing, adding a separate, synchronized metallic impact overlay. The test button instead plays a short 0.92s single heavy mechanical hit with irregular bounce, grind, body, and reflections. Both authored sounds are deterministic stereo 48 kHz PCM generated once during audio initialization and cached for replay. There are no new network downloads or third-party sound dependencies.

Implementation: `engine/foley.js` exports `renderMechanicalTestCue`, `renderIntroMetalOverlay`, and `installPolishedFoley`. The initial MP3 source remains the main intro. Skip/replay stops both active sources. Settings and the development-mode gate are unaffected.

These sounds are **procedural Foley-style designs**, not actual field recordings. Realistic quality cannot be proven by automated tests; listening review in an actual browser is still required. If the new cue still sounds artificial, the next pass should use self-recorded mechanical material with proper editing/cleanup rather than adding pitched oscillators.
