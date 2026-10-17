# REDLINE Neon City V8 — Architecture overhaul

## Target

The existing Neon route, bridges, tunnels, shortcuts, physics, city traffic,
accounts, multiplayer Worker and working REDLINE V6 cars remain unchanged.
V8 focuses on making the skyline genuinely less repetitive.

## Actual geometry changes

The existing buildings no longer appear as single rectangular towers:
each is rendered with its original full-width ground podium and one of
five architecture profiles above it. All upper masses remain **inside**
the original building's width/depth and below its original collision top:

1. **Stepped offices** — broad lower tower with a narrower, offset crown.
2. **Residential slabs** — broad apartment tower, side mass and balcony bands.
3. **Split towers** — two asymmetric towers above the common podium.
4. **Glass hotels** — narrower upper floors and glass roof crown.
5. **Faceted crowns** — 10-sided upper tower with inset roof cap.

Each family has upper-floor trim and some architectural lighting. Selected
roof terraces and antenna masts attach to the **actual** tower instead of
hovering over an empty setback gap. The old floating generic roof cubes
were removed. Roadside podium roof decks now sit at their actual setback
height rather than the full top of a different narrower tower.

The city façade generator now has five distinct options (office, brick,
shop, residential, hotel) instead of three. Apartment textures include
balconies/railings; hotel façades use narrower window bays, cooler nighttime
tones, and a different illuminated-window pattern. Emissive textures match
the new window grids.

Inner-city skyscrapers, roadside buildings and atmospheric skyline tower
rings use the new architecture, not just storefront overlays.

## Integration and performance

- `neon-v8-architecture.js` exports the V8 massing and a shared
  `neonV8BaseRatio()` helper. The original `neon-art.js` constructs
  collision-cleared base floors and returns validated footprints.
- `game.js` builds V8 upper floors only inside `buildCity()`, without
  registering or replacing any colliders or modifying the racing surface.
- Full-height collider dimensions are unchanged from V7, including
  reserved GLB site clearance, secret shortcuts, canal and roads.
- The skyline and roadside pass now share the same five façade texture
  atlases and five matching emissive atlases. The default sky texture
  accounts for the eleventh canvas; the roadside builder no longer
  duplicates the ten building textures.
- All additional mass geometry is instanced. In a 387 inner-building,
  327 skyline and 55 roadside synthetic-map build, 22 render batches
  created around 4,000 detail instances. This is a draw-call estimate,
  **not** an in-game FPS measurement.
- `index.html` and the city-art module import use V8 URL versions to
  bypass previous cached scripts.

## Validation

**37/37 final checks passed**. Tests included a mock Three.js scene using
the actual V8 architecture and actual modified V8 backdrop/roadside
builders, valid instancing buffers, five façade families, footprint safety,
unchanged collider heights, cache-busted URLs and untouched multiplayer,
traffic, bridges and cars. Previous focused source and world checks also
passed.

**Needs a live playtest:** Neon downtown, shoreline bridges, route-side
buildings, apartment roofs and skyline, preferably with two players.
Static/mock tests cannot fully prove visual quality or live Chromebook FPS.
The parent Git commit can be restored without migrating player data.
