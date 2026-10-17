# REDLINE ARCTIC RELAY V4 — Alpine Realism

## Goal

Bring the Arctic map closer to Neon V8's visual quality without changing its
working **race course, ramps, mountain collisions, tunnel openings, shortcut
flight paths, checkpoints, car physics or multiplayer**.

## Changes

- **Shared alpine terrain sampler:** V3 now exposes the exact original
  terrain height, road distance, shortcut distance and frozen-lake center,
  plus mountain references. V4 uses those samplers to place ground scenery;
  it does not create or modify physics heightfields.
- **Snow and cliff surface detail:** One lightweight deterministic canvas
  microtexture adds fine frost and wind-grain to the sculpted terrain and
  subtle bump breakup to the existing rocky mountains. Rugged mountain
  geometry now includes UVs for those bumps; the original snow-line vertex
  color and shape remain.
- **More varied forests:** Hundreds of secondary forest trees include
  different pine sizes, snowy upper branches and occasional bare snags.
  They remain visual-only, outside the road and secret shortcut corridor.
  Existing V3 trees and their limited physical trunks remain unchanged.
- **Windblown snow and scree:** Small drift shapes and rounded rocky debris
  follow the same terrain height sampler, outside the existing road. They
  cannot introduce invisible collider blocks.
- **Frozen lake:** Irregular fractured-ice hairline details add visible
  lake texture outside the drivable crossing.
- **North Pass / Glacier Core / Ice Vault:** Low-cost illuminated wall guide
  strips and portal markers run along the original curved cave paths.
  Nothing blocks the cave opening or changes the physical wall layout.

## Safety and performance

- V4 is a new `arctic-v4-scenery.js` **rendering-only** module called
  immediately after `buildArcticV3Art()`, and only in the Arctic branch.
- It changes no player account data, backend Durable Objects, networking,
  upgrades, Garage, ice shortcut geometry, track curve, barriers, or
  collisions. The existing `arctic-caves.js`, `worker.js`, all Neon art
  and cars remain exactly the same.
- The new scenic elements are batched into roughly **10 instanced mesh
  groups** plus one ice-crack line object. A synthetic test generated
  **380 forest sites, 470 drift shapes, 174 rock pieces, 540 crack segments,
  144 cave guide-lights, and 12 cave portal markers**. Numbers may differ
  in the real track due to clearance and mountain footprints.
- Terrain and mountain detail share **one 256px canvas texture**. No extra
  external image downloads or glTF model libraries are required.
- `index.html` uses a versioned Arctic V4 game module URL so cached V8/V3
  scripts should not mask this release.

## Tests and caveats

- V4 construction tests: **15/15** mock scene checks passed, including safe
  forest/drift placement, mountain-texture wiring, tunnel lighting and no
  terrain height changes.
- Final integration and geometry tests: **32/32** passed for mountain UV
  indices, JavaScript parsing, the Arctic-only hook, unmodified cave/Neon/
  Worker/economy files, and UI scripts.
- **Live testing remains necessary.** Check the North Pass, Glacier Core,
  Ice Vault, Frozen Lake, tunnel approaches and secret cave jump. Confirm
  there is no flickering lighting, clipping near the road, or unexpected FPS
  drop on Chromebook / multiplayer. The parent main commit can be restored
  without changing account storage.
