# PlayCanvas foundation (experimental)

This is the **code-first game-building API** for the PlayCanvas path through
GAMESHUB. It wraps PlayCanvas 2.23.3 rather than replacing its renderer,
animation graph, or Ammo rigid-body physics. The original Three.js engine and
existing games remain untouched.

`engine/playcanvas-foundation.js` exports `PlayCanvasFoundation` and `pc`.
The browser page must make the PlayCanvas ESM package available:

```html
<script type="importmap">
{"imports":{"playcanvas":"https://cdn.jsdelivr.net/npm/playcanvas@2.23.3/+esm"}}
</script>
<script type="module" src="./game.js"></script>
```

```js
import {PlayCanvasFoundation} from '/engine/playcanvas-foundation.js';

const canvas=document.querySelector('canvas');
const world=await PlayCanvasFoundation.create(canvas,{physics:true});

world.app.scene.ambientLight.set(.3,.35,.4);
const ground=world.material('#667c87',{metalness:.08,gloss:.24});
world.box('Ground',[0,-.2,0],[24,.4,24],ground,{collidable:true});
const crate=world.box('Crate',[0,1,0],[1,1,1],ground,
  {collidable:true,mass:10});
world.light('Sun','directional',[-4,10,5],'#ffe4b5',2,{shadow:true});
world.camera('Camera',{position:[0,3,7]});

const {model,anchor,clipNames}=await world.animatedModel('/assets/human.glb',{
  name:'Human',scale:.4,yaw:-90,requiredClips:['Idle','Walk'],initialClip:'Idle'
});

const unsubscribe=world.onUpdate(dt=>{/* game-specific logic */});
// On scene exit: unsubscribe(); world.destroy();
```

## Current API

| Method | Job |
|---|---|
| `PlayCanvasFoundation.create(canvas, {physics})` | Initialize the graphics device, component systems, optional Ammo and resize handling |
| `world.material(hex, options)` | Reusable PBR/emissive material |
| `world.box(name, position, size, material, options)` | Rendered box with optional static/dynamic collider; dimensions in world units |
| `world.light(name, type, position, hex, intensity, options)` | PlayCanvas directional/omni/spot light |
| `world.camera(name, options)` | Camera entity with configurable clipping, FOV, clear color |
| `world.loadContainer(url)` | Shared GLB asset promise; repeat loads use the same asset |
| `world.animatedModel(url, options)` | Imported skinned model and assigned animation states, with a separate scale/facing anchor |
| `world.onUpdate(callback)` | Register update callback; returns unsubscribe function |
| `world.destroy()` | Unregister resize, clear cache and release the PlayCanvas app |

The default box options are `{collidable:false, mass:0}`. `collidable:true`
with `mass:0` gives a static body, while positive mass gives a dynamic body.
Rigid bodies need a world created with `{physics:true}`. Geometry `size` is in
world units, and the collision shape uses explicit half extents—not the render
scale (a common source of mismatched collisions).

## Tested reference

`games/engine-test/playcanvas-benchmark.html` is the integration test for the
API. `playcanvas-benchmark-smoke.mjs` checks initialization, GLB clip import,
walking, running, jumping, camera position, visual nonblankness and a physical
crate impulse. GitHub Actions uploads idle and interaction screenshots for
human review.

## Limits / next engine modules

- The benchmark's movement is currently a simple kinematic controller with
  ground-plane bounds, **not** a capsule body or general collision solver.
- Animation tracks are imported and blended using PlayCanvas; matching foot
  contacts and motion to arbitrary game speed still requires a proper locomotion
  controller, verified clips and authored assets.
- Sound mixing, saving, terrain, navigation, and general gameplay utilities are
  not in this PlayCanvas foundation yet. Those should be separate reusable
  modules with browser tests, rather than copied from a demo.
