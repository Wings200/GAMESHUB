# REDLINE V12.1 — Fix HTTP 502 exterior-engine preview fallback

## User report

`V12 ENGINE TEST · FALLBACK TO V11.2 · fallback: V12 exterior recording HTTP 502`

The opt-in V12 mixer was trying to fetch a 1.9 MB Ogg file via a
Cloudflare Pages Function and decode it as an AudioBuffer. The Pages
Function returned HTTP 502 rather than the recording. The underlying
Commons original exists and is playable via its source page, but we
could not view live Cloudflare Worker logs to identify the precise
upstream subrequest failure.

## Root workaround / revised playback path

Previously:
`V12 browser fetch → /api/redline/engine-audio → Cloudflare fetch → Commons CDN → ArrayBuffer decode → browser audio`

Now:
`User clicks START → HTMLAudioElement.play() → Commons CDN directly`

- The V12.1 preview plays **directly from Wikimedia Commons** using the
  ordinary browser media player (without setting the `crossOrigin`
  property or trying to read the raw remote bytes in JavaScript).
- Media playback is **unlocked synchronously by the real START button
  click**, not after downloading and decoding V11.2 engine recordings.
- The existing V11.2 Web Audio engine/SFX mixer continues to run and is
  faded down in preview mode when the new media has actually started.
  That ensures full V11.2 fallback if the new audio isn't available.
- The browser media's volume respects the existing saved Master and
  Engine sliders. Playback speed changes conservatively with vehicle
  RPM, using browser pitch preservation controls where supported.
- For this *test-only* mode, the entire original exterior field
  recording plays through rather than looping a falsely advertised
  "automatically clean 2.5-second segment" selected from noise/crowd.
  This is explicitly not a finished multiband engine pack.
- The obsolete Pages Function is now a **fixed 302 redirect** to the
  verified Commons original and no longer makes Cloudflare subrequests,
  so users opening that legacy URL will no longer get a server-side
  proxy HTTP 502 from that code path.

## Links

Opt-in V12.1 direct audio preview:
https://redline-dnk.pages.dev/games/redline/index.html?engine=v12

Normal V11.2 sound (untouched):
https://redline-dnk.pages.dev/games/redline/index.html

Original recording: Edvvc (Ed Pond), *Trophy Truck and American V8s*
at Goodwood (2009), Creative Commons Attribution-ShareAlike 3.0:
https://commons.wikimedia.org/wiki/File:Trophy_Truck_and_American_V8s.ogg

The V12 indicator shows `EXTERIOR V8 · ACTIVE` on successful direct
playback or an explicit fallback reason if browser media playback is
blocked/unavailable. The creator and licensing link remain visible
inside the in-game preview badge.

## Scope

Changed:
- `engine-v12-exterior-preview.js` (new direct browser media backend)
- `audio.js` (user gesture priming + mixer settings integration)
- `index.html` (cache bust)
- `functions/api/redline/engine-audio.js` (fixed redirect only)

Unchanged:
- `game.js` driving, maps and multiplayer telemetry
- `audio-v11-soundscape.js` baseline mixer
- Garage, purchases, car catalog, Cloudflare multiplayer Worker,
  account API, results and player stats

## Test caveat

Automated browser-API mocks can establish start/stop/unlock, volume,
fallback behavior and that no Pages-proxy request remains in the new
player. They cannot establish whether the actual Commons CDN supports
direct streaming for a specific user/browser/location or whether this
field recording sounds good. Test using the opt-in link and report
whether the indicator reads `EXTERIOR V8 · ACTIVE` after clicking
START. If it still falls back, browser-side network/media errors will
be shown instead of a proxy 502; the long-term reliable solution is to
host an edited and properly credited engine asset in the game.
