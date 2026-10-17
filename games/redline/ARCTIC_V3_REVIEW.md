# Arctic Relay V3 — Procedural alpine scenery rework

This pass rebuilds Arctic's scenery around its **existing race route**. Racing and multiplayer remain on the same `TRACKS.arctic.controlPoints`, `checkpoints`, `ramps`, `pickups`, `boosts` and collision-backed cave opening.

## Visual changes

- **Sculpted mountains:** Replaced the stacked radial cone mountains and separate cone snowcaps with finely subdivided irregular rock faces, split secondary ridges, realistic snow-line vertex-color shading, and distinct peaks.
- **Sculpted landscape:** New approximately 19k-vertex continuous alpine ground rises naturally away from every road segment. It is level along the route and secret launch/landing corridors, and it stays low under the existing frozen lake.
- **Backdrops:** Scenery expands into up to 32 additional distant mountain masses, each omitted unless its entire foot stays clear of the track.
- **Forest:** Hundreds of layered pines assembled using GPU instancing, with trunks, three tiers of dark foliage, and snowy boughs. Distribution avoids the asphalt, lane margins, frozen lake, and signature cave jump corridor. Accessible trunks receive inexpensive cylinder-like collision approximations.
- **Glacial rock field:** 300+ GPU-instanced boulders on terrain off the roadway, with limited nearby collision.
- **Snow-packed roads:** Worn wheel ruts, sculpted snowbanks beside the shoulders, and reflector posts following the spline rather than cutting corners. Asphalt, checkpoints and driving physics are unchanged.
- **Tunnel roofs:** Both mountain tunnels now use overlapping, raised, irregular rocky roof segments that avoid the old boxy gaps. Ice icicles, tunnel-wall colliders, and checkpoint ramp geometry remain.
- **Tunnel entrances:** Rock-and-ice arch portals with their support posts.
- **Bridge details:** Short curved metal parapets and support posts with matching collision rails, deliberately located outside all three Arctic secret jump approaches, registered *after* the original barrier pass.
- **Expedition bases:** More metal research huts, snowy flat roofs, lit windows, and antennas with physical footprints.
- **Arctic atmosphere:** Organic three-layer aurora curtains replace large flat planes. One lightweight GPU-point snowfall system drifts around the local car, follows checkpoint respawns, hides under tunnel roofs, and disposes on race restart. The effects are cosmetic only.

## Compatibility / safety

- Arctic's primary track, collision route, ramp strengths, checkpoint order and placements, ice pickup definitions, multiplayer, and timer logic did not change.
- `buildArcticV3Art()` runs only on Arctic, **after** `buildBarriers()` clears and rebuilds its collisions.
- `createArcticSnowfall()` creates one buffer of 380 points; it does not affect physics. It is torn down with the world and never runs on Neon.
- Neon weather, City traffic, all multiplayer results and cash payout paths, and Wreckfest-style engine/tire/brake purchases were untouched.
- Many scenery objects are GPU instanced to protect Chromebook performance. Per-frame processing is limited to the 380 local snow points and the pre-existing game loop.
- Because mountain terrain is procedurally generated, actual visual quality and frame rate must still be checked in the deployed browser before calling the rework final.

## QA

- Arctic geometry built successfully using a Three.js API-compatible headless scene harness: ~19,177 terrain vertices, hundreds of pines, 310 rock instances, mountain peaks, rails and colliders; no instance overflow.
- Snow system passed 8 headless behavior checks: initialization, particle drift, renderer buffer updates, entering/leaving a tunnel and teleport-follow.
- JavaScript parsing and current-vs-previous-commit integration comparisons must remain green.

## Live playtest

1. Allow Cloudflare Pages to publish main, then hard-refresh REDLINE.
2. Choose Arctic, drive from Base Camp through North Pass. Check continuous tunnel roofs and that snow disappears inside.
3. Inspect glacier valley and lake shore from both sides, especially whether the old low-poly look is gone.
4. Take the cave-mouth secret jump at t≈0.528. It must still clear the mountain hole and land correctly.
5. Take the ravine skip at t≈0.228 and the ridgeline gap at t≈0.785. Guardrails must **not** block either.
6. Race multiplayer on Arctic: check ghost cars, cash credits, and second-race return to lobby.
7. Check frame rate on a Chromebook/low-end PC. If it drops, reduce extra pine density or distant peak count first.
