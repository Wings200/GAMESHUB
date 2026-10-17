# REDLINE — Neon City V7: Streetscape and Night Lighting

This update improves the existing **Neon District** without reshaping the
course, bridges, shortcut ramps, canal, racing physics, or multiplayer.

## Improvements

- Street-facing buildings gain recessed warm-lit storefronts, dark reflective
  glazing, awning lips, doorways, columns and colored neon fascia strips.
- Some warehouse facades use shutters and loading-dock treatment instead of
  identical retail windows.
- Rooftops gain HVAC boxes, condenser cowls, ducts and antenna masts;
  selected taller buildings gain compact fire-escape landings.
- V7 ambient street segments have modest edge paint, road studs, staggered
  asphalt repair patches and short dashed lane marks. They are placed ONLY
  on road segments already cleared by the existing city street builder.
- Four carefully limited colored PointLights ground the nighttime storefronts
  instead of adding hundreds of expensive dynamic lights. Other illumination
  comes from shared instanced emissive materials.
- Existing ad posters are moved upward so they no longer cut through the
  new street-level glazing and awnings.

## Integration and gameplay invariants

- `game.js` imports `neon-v7-streetscape.js` and calls its scenery builder
  inside `buildCity()`, immediately after the existing roadside architecture.
- Placement input: the SAME collision-validated `buildingSpecs` already
  used by `addEnvironmentBoxCollider`, plus `cityLayout.trafficRoads`
  generated after streets were clipped to avoid the competition track,
  real buildings, and central waterway.
- The new module registers **no colliders** and introduces no gameplay events,
  physics changes, racing state, network packets, account changes, or saved
  data migrations.
- Original `neon-infrastructure.js` bridges, supports and collision logic,
  `neon-traffic.js`, Cloudflare Worker, Garage, cars and upgrades are unchanged.
- The added artwork uses batches of instanced meshes with shared geometries
  and materials. Invalid/missing input data is filtered, and empty city
  content returns safely.

## Automated validation

- 50/50 scene construction, mock mesh-batch, integration, source and
  safety checks passed after storefront geometry correction.
- 76/76 final syntax, integration, no-regression, advertisement-clearance
  and source checks passed, including zero modifications to the Worker,
  traffic, car models, front-end account code, or bridge geometry.
- Example 60-building/14-street synthetic scene created 48 storefronts,
  20 instanced material batches and four local point lights.

The release has NOT been visually tested in a live browser or against real
Cloudflare Pages on low-end hardware. After deployment, test at night in
Neon in a two-player room, especially downtown signage, street junctions,
canal bridges, overhead signs, and nearby storefront clipping. Rollback can
restore the prior main commit without affecting player data.
