# GAMESHUB Engine — Character asset pipeline (Build 025)

This is the first **authored skeletal animation** import path. It intentionally
replaces the idea that a game engine can generate believable character motion
from a handful of joint sine waves.

```js
import {GameEngine,createGameSession,loadCharacterAsset} from '/engine/index.js';

const engine=new GameEngine(document.querySelector('canvas'));
const session=createGameSession(engine);
const asset=await loadCharacterAsset(engine.assets,'/assets/character.glb',{
  // Optional: source names can differ among rigs.
  clipMap:{idle:'Idle',walk:'Walk',run:'Run',interact:'Use',reload:'Reload'}
});
const actor=asset.createInstance({height:1.85,heading:Math.PI});
engine.scene.add(actor.root);
const animator=session.addAnimator('player',actor.root,actor.clips,{
  followControls:true,fadeSeconds:.2,runThreshold:4
});
engine.start();

// When the scene exits, release in this order:
session.dispose();
actor.dispose();
asset.dispose();
engine.dispose();
```

### Asset requirements

1. Export **glTF 2.0 `.glb`** with a skinned mesh, a skeleton, and animations.
2. Bind the mesh and all animation clips to the **same skeleton**. The loader
   does not silently retarget clips made for unrelated bone hierarchies.
3. Include Idle, Walk and Run clips (names can be overridden with `clipMap`).
   Jump, Fall, Land, Interact and Reload are optional, but missing states are
   reported; the engine does not invent an animation and pretend it exists.
4. Prefer in-place walk/run cycles; character translation belongs to gameplay
   controls. Author a stride distance that matches the controller speed to
   minimize foot sliding.
5. Credit and store license/source details for all externally authored assets.

`createInstance()` uses `SkeletonUtils.clone()` so multiple actors can animate
without sharing live bone transforms. Height normalization and heading are
per-instance, and the original GLB resources are released at asset disposal.

### Current lab asset

The animation lab defaults to the CC0 RobotExpressive sample, bundled locally
under `games/engine-test/assets/`. It includes Idle, Walking, Running, Jump,
and Wave (mapped to `interact`). Build 025 optionally splits the full Jump
motion into ascent, descent and landing clips. It does **not** have a reload
animation. The prior diagnostic rig remains available for an A/B comparison.

### Not yet implemented

- Retargeting animations between different skeletons.
- Foot inverse kinematics, slope-aware foot placement, or root-motion matching.
- A complete first-person authored hand/weapon animation set.
- Animation streaming, compression budgets, LOD, and network synchronization.

Do not label this a complete AAA animation pipeline until those are tested.
