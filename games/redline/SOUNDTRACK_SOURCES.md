# REDLINE soundtrack sources

## Nevada Run — Hot Roadway

- Artist: **MintoDog**
- Title: **Hot Roadway** (original, 160 BPM)
- Source: https://opengameart.org/content/hot-roadway
- Published: 2023-01-26
- License shown on source page: **Creative Commons Zero (CC0)**
- Audio file: https://opengameart.org/sites/default/files/hot_roadway_bpm160_0.ogg
- Usage: Stream the original looping OGG in Nevada Run (`canyon` internal map ID), through the existing REDLINE music player and volume settings. No altered/remixed copy has been uploaded to this repository.
- Music defaults to 78% of the race-music volume slider, to leave headroom for engine sounds.
- **Deployment note:** The track is remotely hosted. It requires an internet connection and continued availability/hotlink permission from OpenGameArt; browser playback of the live Cloudflare deployment has not yet been tested. For production reliability, self-host a licensed copy under `assets/audio/` when binary asset upload is available and change `music.js` to reference it.

## Neon District — 3-lap configuration

`game.js` now specifies `TRACKS.neon.laps = 3`. The existing gameplay checkpoint tracker increments each lap, shows `LAP n / 3` in the HUD, and reports local lap progress in multiplayer packets. The Durable Object Worker accepts lap numbers up to 100 and records the `race_finish` event from the local client. Arctic and Nevada lap counts remain unchanged.
