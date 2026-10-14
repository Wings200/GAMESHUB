# Neon District art overhaul — asset sources

This file records the third-party visual assets used by `neon-art.js`. No changes to the REDLINE multiplayer Worker, player accounts, race scoring, or checkpoint logic are part of the art overhaul.

## Real surface materials
Photographic PBR albedo, normal and roughness maps are fetched from the publicly accessible source assets in [AetherRadar/operation-steel-tide](https://github.com/AetherRadar/operation-steel-tide/tree/main/assets/textures):

- Poly Haven **Asphalt 03** — `asphalt_03_diff_1k.jpg`, `asphalt_03_normal_1k.jpg`, `asphalt_03_rough_1k.jpg`
- Poly Haven **Concrete Floor** — `concrete_floor_diff_1k.jpg`, `concrete_floor_normal_1k.jpg`, `concrete_floor_rough_1k.jpg`

[Poly Haven license](https://polyhaven.com/license): **CC0**.

## Real glTF models
A handful of GLB models for important buildings and street props are fetched as scene decorations from the same public repository's `assets/models/` folder:

- Quaternius Buildings Pack: `building2-small.glb`, `building3-small.glb`, `building4.glb`
- Kenney City Kit Industrial: `building-i.glb`
- Kenney City Kit Roads: `dumpster.glb`, `construction-fence.glb`, `construction-cone.glb`

Source collection states the model kits are freely usable and identifies original authors. The [Quaternius asset terms](https://quaternius.github.io/license.html) permit incorporation into games; [Kenney](https://kenney.nl/) releases these City Kits under CC0. These GLBs are decorative; collision and racing logic are unaffected.

## Fallback and performance notes
- PBR textures and GLB files load asynchronously. Browser caching reduces repeat transfers; if the external source is unavailable the track remains playable using generated fallback visuals.
- New skyline, background blocks, curbs and reflective surfaces use GPU instancing, camera fog and texture atlases rather than a separate draw call for each building.
- Roadside building model placement is reserved in the backdrop so large geometry does not overlap key imported buildings.
- Future production polish should vendor/localize the files to remove the external source dependency once visual approval is complete.
