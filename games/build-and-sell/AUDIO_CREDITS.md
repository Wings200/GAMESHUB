# Build & Sell sound sources

- Kenney CC0 recorded footsteps: existing /games/engine-test/assets/audio/footstep_concrete_*.ogg, license in that directory. Temporary surface match for dirt.
- Joseph Sardin / BigSoundBank, CC0: [Wind in the Trees](https://bigsoundbank.com/forest-wind-in-the-trees-s0904.html), [Excavator engine](https://bigsoundbank.com/excavator-engine-s2147.html), [Gavel, 1 blow](https://bigsoundbank.com/gavel-1-blow-s1588.html). External media URLs use site's published /UPLOAD/mp3/ ID convention. Network/decoding and listening not yet verified; no REDLINE engine fallback, wind fallback is low-pass noise, placement fallback is a recorded impact-like step.
- themightyglider / RavenWolfProds, [Shovel Sound](https://opengameart.org/content/shovel-sound), CC0, direct .ogg asset. Short soil contact cue.

Browser autoplay is unlocked on input. External sources should be vendored locally after audition; direct downloads were not available to the developer in this session. Do not claim real recorded machinery quality until auditioned.

- [Excavator, displacement](https://bigsoundbank.com/excavator-displacement-s2149.html), Joseph Sardin / BigSoundBank, CC0: moving tracks layer.

## Plate compactor (11.1)
- T. Voekler, [PLATE VIBRATING RAMMER.ogg](https://commons.wikimedia.org/wiki/File:PLATE_VIBRATING_RAMMER.ogg), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Original recording of a plate vibrating rammer in operation, 6.772 seconds. The unchanged original file is streamed from Wikimedia Commons and played as a loop at its native speed with distance-based volume and short gain fades. Source: https://upload.wikimedia.org/wikipedia/commons/8/8c/PLATE_VIBRATING_RAMMER.ogg. Audio credit also appears on the game menu. No pitch shifting or car-engine fallback. Source page and license verified; live browser playback and audio quality not verified. If unavailable, compactor is silent rather than using incorrect engine sounds.

- Concrete pump: [WWS Pneumaticpump.ogg](https://commons.wikimedia.org/wiki/File:WWS_Pneumaticpump.ogg), Boštjan Troha / Work With Sounds / Technical Museum of Slovenia, CC BY 4.0. Actual shotcrete pump recording used as a proxy for slab pump, original audio looped at native rate. External playback not auditioned. No REDLINE fallback.

## v101 additional recorded effects
- Joseph Sardin / BigSoundBank (CC0): [Stapler on wood](https://bigsoundbank.com/stapler-on-wood-s1580.html) for fastening feedback; [Hammer fall on concrete](https://bigsoundbank.com/hammer-fall-on-concrete-s1108.html) as a metal-contact proxy; [Thermostat #2](https://bigsoundbank.com/thermostat-2-s2192.html) as a mechanical click proxy. Source descriptions and CC0 license confirmed; streaming URLs follow the existing BigSoundBank ID convention. These are recorded foley proxies, not recordings of every specific construction tool. Media availability and in-game listening remain unverified. No substitute car engine sounds.

## Surface footsteps
- Kenney Impact Sounds (CC0), [source pack](https://kenney.nl/assets/impact-sounds), [sample mirror](https://cc0-sounds.exi.software/collection/kenney_impactsounds/): five variants each of wood, grass, carpet and snow. Concrete uses existing local files. Dirt uses grass as a temporary proxy; gravel uses snow crunch as a temporary proxy, tile uses concrete and vinyl uses wood. External samples fall back to local concrete on failure. Actual browser playback has not been verified.
