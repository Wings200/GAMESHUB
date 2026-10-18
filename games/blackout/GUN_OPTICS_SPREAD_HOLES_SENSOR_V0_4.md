# BLACKOUT V0.4 — Real 3D gun optics, hipfire accuracy, smaller holes, sensor alarm

Updated in GitHub on 2026-10-18. Standalone offline BLACKOUT flat mechanics lab.
No REDLINE changes, no backend/Worker deployment changes.

## Changes requested after review of 51-second 2560×1440 user recording

### Sight actually attached to gun

- Removed the fake HTML/CSS ADS scope graphic entirely.
- Added `src/weapon-optics.js`: Holo A, Holo B, Red Dot and Iron are **distinct 3D gun-mounted models** using Three.js meshes. Their reticle marks are emissive 3D geometry, not a floating 2D sprite or UI picture.
- Optics are child objects of the player's `gunModel` in camera space. Each selected sight shares the firearm's position/movement and is zeroed at the physical optical origin.
- ADS smoothly brings this actual 3D sight to the camera optical center. Rifle and smaller pistol viewmodel scale are accounted for in `aimPosition(slotScale)`.
- Select from menu or cycle with V. The hipfire crosshair disappears when ADS begins and returns on RMB release. The old sight-overlay DOM/CSS is removed.

### Hipfire cone versus sight-accurate ADS

- Primary hipfire spread: `0.18` normalized camera-coordinate radius.
- Sidearm hipfire spread: `0.23` normalized camera-coordinate radius.
- Sampling uses a random-angle, square-root radius disk rather than a tight rectangular jitter; aim is scattered around center across a broad cone while hipfiring.
- Walking expands the shot cone 1.35×; crouching/prone tighten it.
- Once the physical ADS alignment completes (blend >= .93), shots use exact camera center `(0,0)` with no random spread. Before alignment completes, hipfire accuracy still applies. The shooting ray updates the camera world matrix first.
- A dynamic hipfire circle visually indicates wide inaccuracy.
- This is a tuning prototype; weapon handling should be calibrated through user playtests, not described as finalized realism.

### Smaller wall holes

- Wall hole radius changed from **0.115m** to **0.018m** (diameter **23cm → 3.6cm**, about 6.4× smaller).
- The 2D texture is now 1024×1024 per panel (was 512×512) so the small cutouts are not lost to texture resolution.
- Holes remain physical see-through alpha cutouts of the soft-surface render plane; the ballistic hit test shares the same hole coordinates.
- Soft panels remain standing regardless of ordinary bullet count; reinforced panels still stop rounds; a designated standard breach charge still removes an unreinforced panel.

### Beep-beep-BEEP proximity sound

- Proximity sensor re-entry event is now `ping(null,"proximity-beep")` instead of a "detected" text toast.
- WebAudio creates three pitched beeps: **720Hz 110ms**, **720Hz 110ms** and **1080Hz 300ms**, starting at ~0, .19 and .40 seconds; final beep louder.
- Sensor arms when the player leaves its radius, sounds once when they enter, and must be exited again before replaying.
- Browser sound uses the existing user-gesture AudioContext created/resumed upon entering the training range; audio will not play if the user/browser mutes site audio.

## Verification executed

- Source integrity: all current GitHub files exist and JS modules parse; no floating `adsOptic` DOM/CSS and no retained references.
- 3D optic unit tests using a lightweight Three-like scene mock: gun-parent attachment, separate models for all four styles, selection exclusivity, calculated aim origin at `(0,0)` for gun scales 1 and .78. Passed.
- Weapons unit tests: broad primary/secondary hipfire spread and zero-variance ADS, with fire rate unchanged. Passed.
- WebAudio mock: exactly three notes, first pair short/equal, final longer/higher/louder with distinct gaps. Passed.
- Note: these tests are structural/simulated. Actual visual alignment, live browser performance, audible mix and gameplay footage must be validated by the user on their computer.

## Manual test checklist

1. Hard-refresh `/games/blackout/index.html?v=optic-on-gun-spread-alarm-04`; choose Holo A and start.
2. Hold RMB and release several times: a **physical sight attached to gun** must align with the center when ADS, without a giant separate UI scope graphic.
3. Press V for Holo B, Red Dot and Iron. Each sight should change **on the gun**, not on the HUD. Pistol model uses the same test viewmodel scaled smaller (not a finished pistol).
4. Stand about 15–25m from a target. Hipfire repeatedly: shots should land around the reticle, not perfectly centered. ADS and wait ~.25 seconds: shots should follow the mounted reticle exactly.
5. Shoot a soft panel: the panel should stay intact, with much smaller real cutout holes. A head/body target aligned behind a panel can be hit through the cutouts. Test reinforcement immunity.
6. Select Defender, place a sensor with X, step outside its detection radius and then enter: listen for **beep-beep-BEEP!** with no old text notification.
7. Press Esc, change roles, reset, and repeat to verify previous 3-second reinforcement and other gadgets still work.

All scope geometry and sound are procedural, without external binary/audio downloads.
