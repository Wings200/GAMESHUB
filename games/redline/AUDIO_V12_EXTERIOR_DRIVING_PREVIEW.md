> **Superseded for playback by V12.1:** The first version described below used a Cloudflare 502-prone media proxy and automatic 2.5-second loop search. See [V12.1 direct browser playback and proxy fix](AUDIO_V12_1_PROXY_502_FIX.md). The real preview now streams the full original directly from Wikimedia using an HTMLAudioElement, with V11.2 fallback.

# REDLINE V12 — Exterior V8 *in-game* audio preview (opt-in)

## Chosen recording

User delegated sample choice after disliking muffled/cabin-like V12
audition recordings. This experimental candidate is the long exterior
**Trophy Truck and American V8s** recording by **Edvvc / Ed Pond**, made
at Goodwood Festival of Speed in 2009.

- **Original:** https://commons.wikimedia.org/wiki/File:Trophy_Truck_and_American_V8s.ogg
- **License:** Creative Commons Attribution–ShareAlike 3.0 Unported,
  https://creativecommons.org/licenses/by-sa/3.0/
- **Modification in preview:** The browser searches for a comparatively
  steady 2.5-second section, repeats it as a driving loop, adjusts its
  playback rate with game RPM, changes its volume with throttle, and
  filters it gently. The adapted audio should be considered CC BY-SA 3.0
  under the same terms as the original.
- **Original length:** about 82 seconds; approximately 1.9 MB.

The source credit is available in the preview's visible in-game badge.

## How to test

After Cloudflare Pages deploys:

**V12 exterior test:**
https://redline-dnk.pages.dev/games/redline/index.html?engine=v12

**Normal V11.2 game:**
https://redline-dnk.pages.dev/games/redline/index.html

Or start from the `audio-v12-lab.html` listening lab and click
**Drive REDLINE with exterior V8 audio**.

Normal REDLINE always loads the existing V11.2 mixer. V12 is only
enabled by the explicit `engine=v12` query string. The game's scripts
are cache-busted so the preview becomes available without replacing
the production car-audio behavior.

The bottom-left V12 indicator shows:
- `EXTERIOR V8 · ACTIVE`: original was fetched, decoded and the
  selected loop was started.
- `FALLBACK TO V11.2`: the external recording is missing, decoding
  failed, or it contained no suitable stable section.

## Technical architecture and scope

- `functions/api/redline/engine-audio.js`: a fixed allowlisted,
  same-origin public-audio Pages Function relay. There are no user
  arbitrary remote URLs or redirects to user-supplied destinations.
  Account API and multiplayer Worker routes are not modified.
- `engine-v12-exterior-preview.js`: creates a buffer source on the
  *existing* shared Web Audio context, scans a bounded part of the
  source for an audible, approximately steady 2.5-second window,
  chooses near-zero loop boundaries, starts it with a gentle ramp,
  and smoothly reduces the V11.2 engine loop. V11.2 SFX continue.
  Rate stays under 1.48x; no continuous additive white noise.
- `audio.js`: chooses preview mixer only for query `engine=v12`;
  otherwise uses the original stable V11.2 soundscape.
- `index.html`: browser module cache-bust only.
- `audio-v12-lab.html`: single click preview shortcut.

No car physics, track geometry, checkpoints, map scenery, upgrades,
dealership, accounts, music configuration or multiplayer are touched.

## Limitations

**This is not the final V12 engine bank.** The source contains mixed
outdoor engines, and the scanner may select crowd/background noise or a
nonrepeatable section. No completed idle/low/mid/high recorded RPM bank
has been produced. Some pitch adjustment remains necessary, and a short
loop from a long live event recording may still sound artificial. We
have not listened to the live Cloudflare Pages playback.

If the user prefers this to V11.2, the next step is *manually auditioned*
and edited loops with multiple authentic load/RPM takes, plus
attribution-preserving file hosting rather than streaming live Commons
media. If it is worse, close the preview link and continue on normal
REDLINE. Do not deploy it as the default audio until approved.
