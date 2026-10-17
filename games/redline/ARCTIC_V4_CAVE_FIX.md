# ARCTIC V4 — Floating mountains, cave tunnels and shortcut cliff repair

Based on the user's October 16 Arctic V3 gameplay recording, in which mountains appeared disconnected from the snow, North Pass/Glacier Core/Ice Vault appeared as dark roof slabs on repeated round boulders, and the elevated cave shortcut looked like a small prefabricated prop rather than a mountain.

## Changes

### Grounded mountains

`arctic-v3-art.js` now roots both the original route-side mountains and new distant peaks to **the same height sampler as the actual terrain mesh**. It adjusts the first 39% of the vertical ring positions to the terrain elevation at **each ring vertex's world X/Z coordinate**, burying the outer foot 5.2 world units before smoothly fading the correction into the original alpine ridge. This avoids the original center-only placement error and fixes the appearance of cliff triangles hovering over adjacent slopes.

The existing mountain mesh list is passed to the terrain generator for this correction. Mount point collision ranges were extended vertically to match their rooted terrain heights; original X/Z collision boundaries did not change.

### Continuous carved cave system

New `arctic-caves.js` exports `createContinuousCave()`:
- A **single, continuous, road-following solid rock shell**, with mountain shoulders, steep rock slopes and a hollow high arch as its actual cross-section
- Fully joined along 34 longitudinal steps, with triangulated rock faces around the open cave portals
- The real interior has no fake floor over the asphalt, roof slabs, giant spherical rocks or visible gaps between prefab pieces
- The cavity has >13m half-width clearance at its lower walls and approximately 16m of peak roof clearance above road altitude
- Collision boxes run along both rock walls; there are no collision boxes across the central drivable passage
- The existing three tunnel intervals, official road, race timing, checkpoint gates, and shortcut ramp physics stay exactly in place

The former repeated `IcosahedronGeometry` egg boulders and individually roofed sections have been removed. The previous disconnected decorative entrance hoops from Arctic V3 were also removed.

### Real mountain around the airborne cave shortcut

`createShortcutMassif()` builds **one pierced rock body** via a single extruded mountain shape with an actual through-hole. The opening stays 14.5m wide at its original 18m center height (bottom 13.75m, top 22.25m), matching the existing proven flight/landing calculation. The arch is irregular and the exterior rock surfaces have sculpted relief, so they do not look like separate vertical pillars and a bridge roof. The rock mass reaches down into the snow; optional flanking rock collisions are skipped wherever another drivable track section gets too close.

The shortcut's start/target progress, launch strength, exact flight path, and existing central collision aperture remain unchanged.

## Validation and deployment

- Test harness generated the continuous cave mesh (~1,000 linked cross-section vertices), registered 68 wall collider segments, and confirmed no wall collider reaches the center road corridor.
- Shortcut geometry test confirmed there is exactly one actual through-hole, centered on the original flight altitude.
- Terrain test generated ~19,000 terrain vertices and 31 distant mountain masses. Original mountain root vertices now follow the local terrain slope rather than sharing one flat world height; instancing limits passed.
- Full project JavaScript/module parsing and a comparison of race spline, shortcuts, rewards, multiplayer and weather should be checked before deploying.
- The changes require a **real Cloudflare Pages auto-deploy and in-game inspection**, not just static/unit tests. The game has not been rendered in a real browser by these tests.

## Manual QA checkpoints

1. Start Arctic and look along both snowy roadsides: **no rock mountains suspended above the snowfield**.
2. Drive the North Pass around `t=0.178–0.218`, Glacier Core around `t=0.605–0.648` and Ice Vault around `t=0.855–0.892`. Confirm one connected cave ceiling and sidewalls, no giant dark balls or open roof gaps.
3. Take the signature cave jump from `t≈0.528` towards the target at `t≈0.565`. The car must pass through the **unchanged elevated cutout**, without hitting a fake rock panel.
4. Finish an Arctic race and return to the garage, then start again; check no scene duplication, cash-loss, upgrade-loss, or multiplayer regressions.
5. Check FPS on Chromebook/low-end hardware. The new caves use ~34 section loops and one primary mesh each, in place of dozens of old mesh-per-boulder objects.
