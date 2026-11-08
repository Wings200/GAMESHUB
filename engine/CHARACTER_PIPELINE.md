# GAMESHUB Engine — Character asset pipeline (Build 026)

This is the first **authored skeletal animation** import path. It intentionally
replaces the idea that a game engine can generate believable character motion
from a handful of joint sine waves.

```js
import {GameEngine,createGameSession,loadCharacterAsset,
  maskClipToUpperBody,FootGrounding} from '/engine/index.js';

const engine=new GameEngine(document.querySelector('canvas'));
const session=createGameSession(engine);
const asset=await loadCharacterAsset(engine.assets,'/assets/character.glb',{
  // Optional: source names can differ among rigs.
  clipMap:{idle:'Idle',walk:'Walk',run:'Run',interact:'Use',reload:'Reload'},
  // Optionally trim a long work/interaction clip in seconds.
  maxActionSeconds:{interact:1.6}
});
const actor=asset.createInstance({height:1.85,heading:Math.PI});
engine.scene.add(actor.root);
const animator=session.addAnimator('player',actor.root,actor.clips,{
  followControls:true,fadeSeconds:.26,runThreshold:4,hysteresis:.18,
  locomotionRates:{walk:1.15,run:1.2}
});
if(actor.clips.interact){
  animator.registerUpperBody('interact',
    maskClipToUpperBody(actor.clips.interact));
  // The lower body keeps playing the walking/running cycle.
  animator.playUpperBodyOnce('interact');
}
const grounding=new FootGrounding(actor.root,actor.placement);
// Call after animation mixing and player position synchronization each frame:
// grounding.update(dt,{grounded:controls.grounded,groundHeight:feetY});
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
   controls. Tune `locomotionRates` for matching stride cadence. Speed threshold
   hysteresis and interruption-safe weight fades reduce transition popping.
5. Credit and store license/source details for all externally authored assets.

`createInstance()` uses `SkeletonUtils.clone()` so multiple actors can animate
without sharing live bone transforms. Height normalization and heading are
per-instance, and the original GLB resources are released at asset disposal.

### Current lab assets

The animation lab defaults to **Quaternius Animated Human**, a CC0 low-poly
human converted to glTF by `rana-jatin/avatar-stage`. It has real Idle, Walk,
Run, Jump, Punch and Working clips. The short Working clip drives an upper-body
interaction layer, while Punch demonstrates an upper-body combat layer. The
original CC0 RobotExpressive model remains selectable for A/B comparisons,
as does the previous diagnostic rig. Neither authored model has a reload clip.

Build 026 masks overlay clips to upper-body bone tracks, preserves effective
weights across interrupted crossfades, and adds a visual-only foot-grounding
assist. These features operate on any compatible authored rig, not just the lab.
`displayActive` reports an overlay while it plays; `active` still reports the
base locomotion animation. Missing/misnamed upper-body bones are rejected
rather than silently moving the entire body.

### Not yet implemented

- Retargeting animations between different skeletons.
- Full leg inverse kinematics, independent foot locking on slopes, and automatic
  root-motion-to-physics matching. Grounding currently provides a small,
  smoothed visual-only vertical correction; it does not eliminate sliding.
- A complete first-person authored hand/weapon animation set.
- Animation streaming, compression budgets, LOD, and network synchronization.

Do not label this a complete AAA animation pipeline until those are tested.
