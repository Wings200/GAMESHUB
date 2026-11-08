# GAMESHUB Engine — 0.1.0 development foundation

**Status: developer-only testing, not a public engine release.**

## What is actually implemented
- WebGL renderer based on Three.js, sRGB output, ACES filmic tone mapping, configurable resolution scale and shadows
- Three quality presets, with explicit pixel-ratio ceilings rather than hidden screen-grain or forced sub-resolution rendering
- Reusable first-person camera controller, sprint/jump, pointer-lock with drag fallback, circle-vs-obstacle floor collision using substeps
- Test room with 3 material exhibits, a reference industrial architectural environment, shared procedural surface textures, reflection probe, fixtures, workstations and simple rotational machine animation
- Asynchronous GLTF/texture loading, a decoded-clip audio playback API, an experimental original intro, and the recorded-sound Audio Workbench
- Basic engine diagnostics (FPS, draw calls, triangles, approximate frame time)
- Recorded CC0 concrete footsteps from Kenney (five variants), distance-based stride events, grounding checks, and visible ceiling fixtures aligned with real downward-facing spotlights are available in dev.008.\n- The GAMESHUB intro is ONLY an opt-in game startup overlay via `EngineIntro`. Do not mount it onto every app or each internal scene transition.

## What is NOT implemented or proven
- A photorealistic asset pipeline or authored AAA character/environment models
- A complete character skeletal animation graph, inverse kinematics or networking
- HDRI capture/probe blending between multiple real game spaces
- Complete collision/physics (the current resolver is horizontal 2D footprints only)
- Realistic recorded metallic Foley for the separate sound-test button (its original generated cue was rejected by user listening review; footsteps have real CC0 recordings)
- Browser screenshots, performance profiling on multiple GPUs and hardware validation

## Engine-first quality gates
1. Use materials with realistic `metalness` and `roughness`, and physically motivated lighting. No strong blue neon everywhere.
2. Create high-quality source models with bevelled edges and coherent physical dimensions. An engine cannot make placeholder spheres look like production assets.
3. Prefer **recorded** licensed or self-made sound effects. Keep license/source metadata and process them through the Audio Workbench. Never label procedural noise as recorded Foley.
4. Test user interaction, start/stop/dispose, collision and quality levels with automated regression tests **and actual browser review**.
5. Keep `main` and the currently deployed games safe: develop in a branch, test, merge, then validate the deployment.
6. Do not consider dev version increments to be release milestones. Remain in 0.x until there is an actual shippable product.
7. Preserve the site's existing maintenance/developer access gate while work is in progress.

## Cross-game integration (REDLINE and other games)
The public import surface is `engine/index.js`. New games can create a `GameEngine`, register frame callbacks and use collision/quality/motion/audio modules. Legacy games must **not** have their renderer blindly replaced: migrate one self-contained subsystem at a time in staging. For REDLINE, a safe order is renderer/material compatibility tests, diagnostics and audio helpers, then animations and scene objects. Confirm the existing tracks and multiplayer behavior after each migration.

## Expected next steps
- Real source assets and a documented import/optimization pipeline (mesh LOD, texture formats, asset budgets)
- Recorded audio catalogue with attribution, 3D positioning and mixing
- Animation playback, transitions, constraints and controller-safe input focus
- Real vertical collision and physics, multi-scene streaming, resource life cycle, asset loading/error UI
- Automated headless WebGL smoke tests and screenshots plus user-based visual and listening approval

## Build 0.1.0-dev.009 — light-transmission chamber

An adjoining chamber is accessible at the SOUTH end of the showroom. Walk
toward the warm floodlight and press E, or use the developer panel's door
button. A moving steel leaf has a matching horizontal collision obstacle.
The dark chamber has a polished sphere and a steel reflector with their own
local cubemap. The original showroom has a separate cubemap for its three
calibration exhibits; these are updated when needed, **not on every frame**. The manual refresh button captures only the player's current room; reflection passes temporarily skip shadow-map drawing for performance.
The new developer controls allow the user to compare local reflections and
approximate indirect bounce both on and off.

The chamber's real direct spotlight is anchored to the visible door floodlight,
and the actual door mesh casts shadows in balanced/quality modes. Transmitted
light is explicitly gated by aperture opening, partly because performance
mode does not have all shadows available. A small light inside the chamber
simulates *diffuse interreflection*, and is labelled an approximation; this
is **not** path tracing, virtual lightmap baking, screen-space GI, or recursive
reflection. Static RoomEnvironment is still the fallback when no local
probe has been captured.

Two additional visible light sources—the EXIT sign and workshop instrument
screen—now produce matching low-intensity localized light. Ambient fill has
been reduced so the dark chamber is meaningfully darker while closed.

The CC0 concrete footsteps have a user-adjustable volume (default 60% of
a substantially quieter gain than Build 008) and a subtractive midrange
equalizer to reduce the prior wooden knock. These are still the same
Kenney recorded samples, not newly produced or field-recorded audio.

Do not equate WebGL functional smoke tests with hardware visual approval.
Try both the balanced and quality profiles; local cube captures are disabled
in performance mode to avoid unexpected software-rendering stalls.

**Performance note (dev.009):** Cubemap reflections are OFF by default after
software-GPU QA measured extreme slowdown during scene captures. The engine's
direct PBR lighting and specular highlights remain active. Enable
"Experimental local reflections" explicitly in the developer lab and refresh
only the nearby room. The GUI tracks completed main renderer frames so capture
recovery is verifiable independently of an unreliable low-FPS display.

## Build 017 — code-first GameWorld assembly API

A reusable API for **assistant-written game code**, not a drag-and-drop editor.
Import `createGameWorld` from `/engine/index.js` and pass a configured
`GameEngine`. The world adds only its own group to the engine scene; it does
not replace the renderer, user-authored environment, or audio context.

```js
import {GameEngine,createGameWorld,FirstPersonControls,EngineAudio} from '/engine/index.js';

const engine=new GameEngine(document.querySelector('#game'));
const audio=new EngineAudio();
const world=createGameWorld(engine,{audio});

// Texture, normal-map, and roughness-map resources are shared for objects
// with identical presets and settings.
world.addMesh({
  id:'factory-floor',geometry:'box',size:{x:20,y:.2,z:15},
  position:{x:0,y:-.1,z:0},material:'concrete-poured-gray'
});
world.addMesh({
  id:'north-wall',geometry:'box',size:{x:20,y:4,z:.3},
  position:{x:0,y:2,z:-7},material:'brick-red-clay',collidable:true
});
world.addMesh({
  id:'door-panel',geometry:'box',size:{x:1.1,y:2.3,z:.12},
  position:{x:2,y:1.15,z:0},material:'metal-brushed-steel'
});
world.addLight({
  id:'overhead',kind:'point',position:{x:0,y:3,z:0},
  color:'#fff2dc',intensity:5,distance:10
});

// Game code can use the existing 2D swept-footprint collision solver.
// Keep the SAME world.colliders array reference; it updates as objects move.
const controls=new FirstPersonControls(engine.canvas,engine.camera,
  {obstacles:world.colliders});
world.onUpdate(dt=>controls.update(dt));
engine.start();

// Export validated scene specifications, not GPU objects or live audio.
const save=world.toJSON();
world.loadJSON(save);
world.setMaterial('north-wall',{id:'brick-charcoal-brick',
  settings:{color:'#50505a',roughness:.93}});
world.setTransform('door-panel',{position:{x:2.7,y:1.15,z:0}});

// Audio clips must be explicitly loaded by the caller before playback.
await audio.unlock();
await audio.loadClip('door-open','/assets/sound/door-open.ogg');
world.addSound({id:'door-cue',clip:'door-open',volume:.7});
world.playSound('door-cue');

// On leaving the game:
controls.dispose();
world.dispose(); // removes world meshes/lights, releases shared GPU resources
audio.dispose();
engine.dispose();
```

Available types: box/sphere/cylinder meshes, point/spot lights, and sound
markers. `world.colliders` currently contains **static, unrotated XZ
footprints** only; this is **not** full 3D physics or contact simulation.
Collidable meshes cannot rotate until rotated collision is implemented.
Transform collision objects through `world.setTransform`, rather than
mutating their Three.js mesh position, to keep the footprint synchronized.
Lights are physical Three.js light sources (no automatic indirect GI).
Sound markers call `EngineAudio.playClip`; **spatial audio and attenuation
are not implemented yet**, even though a marker can store a position.

Material caching uses reference-counted `MaterialPool` leases: identical
presets/settings reuse material and texture objects, and removing the last
dependent mesh frees their GPU resources. `world.toJSON` and
`world.loadJSON` use versioned schema `gameshub.world.v1` and check
unknown presets, duplicate IDs, invalid inputs, and document version
before replacing the current scene. Texture/3D resource availability and
hardware quality still require a browser validation.

This stage does **not** add a new game level, edit UI, networking, vertical
collision, reflection probes, or a player-facing scene editor.

## Build 018 — opt-in true Y position and multilevel player collision

The code-first GameWorld now puts `minY` and `maxY` on all collidable
primitive objects, updated by `world.setTransform`. Use the existing
`FirstPersonControls` with `verticalCollision:true` and a stable reference
to `world.colliders`:

```js
const controls=new FirstPersonControls(engine.canvas,engine.camera,{
  obstacles:world.colliders,verticalCollision:true,eyeHeight:1.72,
  bodyHeight:1.85,stepHeight:.35,groundY:0
});
world.onUpdate(dt=>controls.update(dt));
```

The opt-in upright capsule approximation detects body-height wall collisions,
landings on elevated floor slabs, jumping into ceilings, and walking off ledges.
Small steps up to `stepHeight` are passable when supported. The world-ground
fallback is at `groundY`; games should author floor volumes (which can be
multi-level) as ordinary `collidable:true` boxes.

**Limitations:** The collision volumes are axis-aligned (mesh rotation still
prohibited for colliders); spheres/cylinders use bounding volumes; slopes,
ladders, crouching, swimming, dynamics, rigid-body impulses, moving-platform
carrying and network prediction aren't solved by this pass. The legacy
horizontal-only controller is still the default until a new game explicitly
opts into vertical collision.

## Build 019 — spatial audio, mixing and simple occlusion

The existing `EngineAudio` playback remains available and unchanged for
legacy UI, intros and recorded footsteps. New games can call `unlock()` from a
user-initiated click, load licensed audio with `loadClip` and play positional
sounds via `playSpatialClip`.

```js
const audio=new EngineAudio();
await audio.unlock(); // call from a genuine user activation
await audio.loadClip('pump','/assets/audio/pump.ogg');
audio.setMasterVolume(.9);
audio.setBusVolume('ambience',.4);
const world=createGameWorld(engine,{audio});
world.addSound({id:'pump',clip:'pump',spatial:true,loop:true,
  position:{x:12,y:2,z:6},bus:'ambience',
  refDistance:2,maxDistance:45,rolloffFactor:1});
const playing=world.playSound('pump');
world.setTransform('pump',{position:{x:18,y:2,z:6}});
playing?.stop();
```

In spatial mode, Web Audio's real `PannerNode` uses HRTF panning and inverse
distance rolloff. `GameWorld` automatically updates the audio listener to
the engine camera, keeps playing sources in sync with emitter transforms, and
uses a throttled AABB ray test to reduce volume and low-pass cutoff when a
collidable wall lies between listener and emitter. Sound emitter settings
persist in `gameshub.world.v1` documents. Four separately adjustable buses
(`sfx`, `ambience`, `music`, `ui`) feed an adjustable master.

**Limitations:** Line-of-sight occlusion is an approximation using axis-aligned
collision boxes, not diffraction, sound transmission through materials,
reverb-convolution or acoustic path tracing. Real audio files must still be
loaded and listened to. Existing `playClip` calls keep their previous direct
output unless new game code explicitly uses spatial playback or mixer buses.
Non-spatial `world.playSound` remains backward compatible.

## Build 020 — source-linked light fixtures, shadows and effects

The `GameWorld` lighting API creates **real** Three.js point and spotlights
from scene data, with optional visible luminous lens meshes at exactly the
same XYZ coordinates. Linked lenses are visual representations; direct light
is emitted by their associated actual light objects. No fictional GI is
claimed.

```js
world.addLight({
  id:'workshop-lamp',kind:'spot',
  position:{x:2,y:4,z:-3},target:{x:2,y:0,z:-3},
  color:'#ffe4bb',intensity:24,distance:14,decay:2,
  visibleSource:true,sourceRadius:.12,
  castShadow:true,shadowSize:1024,
  shadowBias:-.0001,shadowNormalBias:.015,
  effect:{type:'flicker',frequency:2.1,amount:.07,seed:10}
});
world.addLight({
  id:'alarm',kind:'point',position:{x:0,y:2,z:4},
  color:'#ff4433',intensity:8,distance:9,visibleSource:true,
  effect:{type:'pulse',frequency:.6,amount:.65}
});
world.setLightingProfile('performance'); // 0 shadow maps
world.setLightingProfile('balanced');    // up to 2 shadow lights, 512px
world.setLightingProfile('quality');     // up to 4 shadow lights, 1024px
world.setLight('workshop-lamp',{intensity:12,color:'#ffdfaa'});
```

New lights default to physically based inverse-square attenuation (`decay:2`)
and continue to honor finite light range. Only objects with
`castShadow:true` receive eligible shadow maps; to receive those shadows,
surfaces need `receiveShadow:true`, and GameEngine's renderer must have
shadows enabled. Shadow-map budgets are deliberately limited to avoid
costly point-light six-face captures. Animations are deterministic and
frame-driven, with `pulse` and smoothly interpolated `flicker` curves.

The options serialize to the existing `gameshub.world.v1` format. Emitter
meshes follow `setTransform` and `setLight`, and are disposed when a light
is removed. Existing lights without the new options preserve their prior
look (invisible fixture lens and steady intensity).

**Limits:** This pass improves real direct lighting, basic projected
shadows, attenuation and source visuals. It does **not** implement true
multi-bounce global illumination, ray-traced reflections, automatically
light-blocked ambient environment maps, emissive mesh area lighting,
contact-hardening penumbrae or HDR postprocessing/bloom. Dark rooms need
their ambient/environment light budget configured separately; they do not
automatically become pitch-black simply because their door closes.

## Build 021 — integrated game sessions

New games should prefer one `GameSession` over wiring the controller,
scene, lighting and audio frame callbacks separately. This API is for the
assistant/programmer to create games in code; it is **not** a visual game editor.

```js
import {GameEngine,EngineAudio,createGameSession} from '/engine/index.js';
const engine=new GameEngine(document.querySelector('#game'));
const audio=new EngineAudio();
const session=createGameSession(engine,{audio});

session.world.addMesh({id:'ground-floor',geometry:'box',
  size:{x:12,y:.2,z:12},position:{x:0,y:-.1,z:0},
  material:'concrete-poured-gray',collidable:true});
session.world.addMesh({id:'upper-level',geometry:'box',
  size:{x:5,y:.25,z:5},position:{x:0,y:3,z:-6},
  material:'wood-light-oak',collidable:true});
session.world.addLight({id:'factory-lamp',kind:'spot',
  position:{x:0,y:5,z:0},target:{x:0,y:0,z:0},
  color:'#ffe6c7',intensity:28,distance:14,
  visibleSource:true,castShadow:true});
session.world.addSound({id:'machinery',clip:'factory-hum',
  position:{x:4,y:1.4,z:0},spatial:true,loop:true,bus:'ambience'});

// Browsers require audio to be unlocked from a click before sound can play.
// The caller supplies genuine licensed sound files; the engine only plays them.
await audio.unlock();
await audio.loadClip('factory-hum','/assets/audio/factory-hum.ogg');
session.world.playSound('machinery');

session.setQuality('quality'); // renderer + world shadow budget together
engine.start(); // exactly one ordered frame callback via GameSession

// When the game exits:
engine.stop();
session.dispose();
audio.dispose();
engine.dispose();
```

Each frame executes in order: **FirstPersonControls with Y-aware collision →
camera world matrix → animated lights → Web Audio listener / occlusion**.
This fixes the stale-audio-listener problem from registering movement and
audio as independent, unordered callbacks. GameSession keeps the original
`world.colliders` array connected to controls, even after save/load, and
`session.setQuality` updates both renderer shadows and light shadow budgets.

The session owns its GameWorld and FirstPersonControls and unregisters its
frame callback on disposal. Engine and EngineAudio remain owned by the caller.
`GameWorld` by itself continues its previous auto-update behavior, so
already-existing code and the showroom aren't silently changed.

This build contains a real browser integration regression test with raised
floors, wall-blocked walking, live listener tracking, 3D audio occlusion at
different heights, spot shadow rendering, quality switching, save/load and
cleanup. It doesn't add full rigid-body physics, indoor global illumination,
a game map, or recorded audio assets.
