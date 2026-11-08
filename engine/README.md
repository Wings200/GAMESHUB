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
