# PlayCanvas foundation (experimental)

This is the **code-first game-building API** for the PlayCanvas path through
GAMESHUB. It wraps PlayCanvas 2.23.3 rather than replacing its renderer,
animation graph, or Ammo rigid-body physics. The original Three.js engine and
existing games remain untouched.

`engine/playcanvas-foundation.js` exports `PlayCanvasFoundation` and `pc`.
`engine/playcanvas-character-controller.js` exports the reusable
`PlayCanvasCharacterMotor` and `PlayCanvasOrbitFollowCamera` classes.
The browser page must make the PlayCanvas ESM package available:

```html
<script type="importmap">
{"imports":{"playcanvas":"https://cdn.jsdelivr.net/npm/playcanvas@2.23.3/+esm"}}
</script>
<script type="module" src="./game.js"></script>
```

```js
import {PlayCanvasFoundation,pc} from '/engine/playcanvas-foundation.js';

const canvas=document.querySelector('canvas');
const world=await PlayCanvasFoundation.create(canvas,{physics:true});

world.app.scene.ambientLight.set(.3,.35,.4);
const ground=world.material('#667c87',{metalness:.08,gloss:.24});
world.box('Ground',[0,-.2,0],[24,.4,24],ground,{collidable:true});
const crate=world.box('Crate',[0,1,0],[1,1,1],ground,
  {collidable:true,mass:10});
world.light('Sun','directional',[-4,10,5],'#ffe4b5',2,{shadow:true});
const camera=world.camera('Camera',{position:[0,3,7]});
const player=new pc.Entity('Player');
world.app.root.addChild(player);

const {model,anchor,clipNames}=await world.animatedModel('/assets/human.glb',{
  name:'Human',parent:player,scale:.4,yaw:-90,
  requiredClips:['Idle','Walk'],initialClip:'Idle'
});

const unsubscribe=world.onUpdate(dt=>{/* game-specific logic */});
// On scene exit: unsubscribe(); world.destroy();
```

## Build 3: motor and follow camera

```js
import {PlayCanvasCharacterMotor,PlayCanvasOrbitFollowCamera}
  from '/engine/playcanvas-character-controller.js';

const motor=new PlayCanvasCharacterMotor({entity:player,avatar:model});
const follow=new PlayCanvasOrbitFollowCamera({camera,target:player});

world.onUpdate(dt=>{
  motor.setInput({x:inputX,z:inputZ,run:shiftHeld,cameraYaw:follow.yaw});
  motor.update(dt);
  follow.update(dt);
});

// On key press: motor.requestJump();
// On mouse drag: follow.orbit(deltaX,deltaY);
```

`motor.state` is `Idle`, `Walk`, `Run` or `Jump`. The state controller uses
independent acceleration and deceleration, turn smoothing, speed-dependent
animation cadence and **hysteresis** to prevent the walk/run threshold from
flickering. Walk-to-run and run-to-walk fades pass the source clip's normalized
foot-cycle progress to PlayCanvas, so they start at matching phases rather than
always restarting at frame zero. Ground elevation can be provided using
`groundHeightAt(x,z)`. The follow camera owns its orbit angles and interpolates
from one finite world-space position to another.

The browser benchmark verifies the actual state changes, phase offset, jump
height and landing, idle stability, camera orbit and physics. Pure movement math
has a separate Node test: `tests/engine-playcanvas-locomotion.test.mjs`.

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

- The Build 3 motor uses kinematic movement and configurable ground height,
  **not** a capsule body or a general collision solver. Scene walls, stairs and
  slopes still require a physics-aware controller before building games on it.
- Phase matching and cadence reduce transition pops and skating, but do not
  guarantee planted feet if the source clip itself contains poor foot motion.
  Higher-quality authored animations and contact-aware foot correction are
  separate follow-up tasks.
- Sound mixing, saving, terrain, navigation, and general gameplay utilities are
  not in this PlayCanvas foundation yet. Those should be separate reusable
  modules with browser tests, rather than copied from a demo.
