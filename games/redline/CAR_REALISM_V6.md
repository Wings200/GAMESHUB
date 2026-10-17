# REDLINE V6 — Car realism and lightweight multiplayer models

This is a **car rendering-only** update. The nine factory car IDs, paid prices,
account ownership, per-car upgrades, acceleration/speed/grip physics, racing
maps, multiplayer Worker, Ready flow, and Garage controls are unchanged.

## What changed

- Added `car-realism.js`, a self-contained procedural exterior-detail layer
  for all nine factory cars using their saved `car-catalog.js` model + colors.
- Replaced flat/simple tire-and-hub geometry with wheel assemblies including
  cylindrical tires, shoulders, alloys, five-to-seven spokes, brakes, and caps.
  Original steering, wheel rotation, and wheel pivot references are preserved.
- Added sculpted trim, rockers, side mirrors, door seams, bright lamp strips,
  grilles, rear lighting, exhausts, rear diffuser, and wheel-arch surrounds.
- Model-specific detailing:
  - AURORA: rally roof lamps and skid plate
  - IRONCLAD: vented muscle hood
  - CIRRUS: premium chrome and light-bar trim
  - OBSIDIAN: canards and diffuser fins
  - PHANTOM: split intakes, hypercar exhaust, and aero blade
  - BAYSIDE: tuner skirt and trim
  - VORTEX/APEX/GT: factory-appropriate exterior accents
- Factory paint on all nine body shells now uses glossy clearcoat
  `MeshPhysicalMaterial`; glass uses a glossy physical material for the six
  dealership cars.
- Local vehicles use the full detail. Translucent multiplayer ghosts use a
  low-detail version preserving silhouettes, factory lights, wheels, and the
  same verified car IDs.

## Performance / safety

The full vehicle model uses roughly 114–139 meshes in mock Three.js traversal;
multiplayer ghosts use roughly 46–61. That is a **substantial reduction** vs
reproducing all the local close-up trim on eight remote ghost vehicles.

The ghost LOD only reduces presentation geometry: both local and remote
vehicles still have four wheels, steering attachment points, brake lights,
nitro flame anchors and the correct vehicle model. Neither the authoritative
account backend nor racing math was touched.

## Verification

- **60/60** static, parsing, mock geometry, and integration assertions passed,
  including construction for each of the nine car variants with both detail
  levels, wheel steering/brake/nitro pivot wiring, lower ghost mesh budgets,
  matching factory identity, and unchanged game economics / Worker files.
- No browser or real multiplayer playtest was performed in these checks.
  Test after Cloudflare Pages deploy, especially a two-player race on a
  Chromebook and a look at premium models from the chase camera.
- If required, previous renderer can be restored from the parent Git commit
  without changing any account data.
