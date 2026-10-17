# REDLINE — Neon District V3 engineering review

**Scope:** Neon-only track geography, drivable grades, canal, bridge geometry, city streets, surface rendering, environment collision and performance. The multiplayer Worker, Durable Objects, accounts, stats and leaderboard systems were **not changed**.

## Pass 1 — Road geography and elevations
- Closed loop: approximately **1,737 m** using 26 control points, 520 drivable samples and 16 ordered checkpoints.
- Canal runs north-south between world **X=127** and **X=213**, and has **two distinct bridge crossings**.
- North crossing road elevation: approximately **7.5–12.0 m** over water.
- South crossing road elevation: approximately **7.4–12.0 m** over water.
- Measured maximum grade: approximately **11.8%**. Both uphill and downhill stretches are present.
- Maximum adjacent sampled road gap: approximately **3.34 m**.
- Removed minor negative Catmull-Rom undershoot so otherwise flat city streets cannot sink below the local ground.

## Pass 2 — Bridge and canal scene-build test
- Built the waterfront and raised-road module with a mock Three.js runtime using Neon V3 control points.
- Verified **105 elevated deck sample spans**, built in **four GPU-instanced structural material batches**.
- Verified **210 continuous guardrail spans** and **12 structural support piers**, distributed across north and south.
- Verified **8 dock/warehouse collider registrations**, vertical quay walls and normal-mapped animated canal water.
- Vehicle bridge deck is real supporting geometry *under* the actual graded drivable road ribbon.

## Pass 3 — Neighborhood/backdrop collision and visual placement
- Tested city-block generation with the real route coordinates in a mock rendering context.
- Created **379 neighborhood building instances** and **327 distant towers**.
- Registered **706 distant/secondary building footprints** for collision.
- **Zero** secondary buildings appear in the carved shipping channel.
- Nearest secondary-building centerline distance to the race course: about **25.8 m**.
- Removed the thin, repetitive gray "street lot" slabs and the giant translucent ground glow; grid roads are instead clipped at the quay.
- Moved actual glTF buildings from the deep background to visible trackside sites, reserving their footprints among the procedural structures.

## Pass 4 — Five simulated road traversals
The 520-sample route was numerically traversed five times at lateral offsets of **−3.1 m, −1.5 m, 0 m, +1.5 m and +3.1 m**. Simulated car height was compared against interpolated bridge/road Y at each point.

| Traverse | Lane offset | Max height discrepancy | Discontinuities over 0.45 m |
| --- | --- | --- | --- |
| 1 | −3.1 m | 0.075 m | 0 |
| 2 | −1.5 m | 0.036 m | 0 |
| 3 | 0 m | 0.000 m | 0 |
| 4 | +1.5 m | 0.081 m | 0 |
| 5 | +3.1 m | 0.167 m | 0 |

The water-edge height lookup returns **−0.40 m** where the car is off the elevated roadway. Falling into the shipping canal triggers a return to the last checkpoint. Jump landing, drifting, boost and pickup height checks now distinguish elevated roadway from ground/water.

## Pass 5 — Syntax, compatibility and regressions
- `game.js`, `neon-art.js`, `neon-infrastructure.js` and the browser multiplayer script all parsed successfully.
- Worker SHA remains the known-good **`2082a7502cf9b453685f913b739f2da9b17d9ce5`**.
- Multiplayer room source SHA remains **`269af83b5b219cc33ca445e1d72fd37fa7fc7c2d`**.
- The Three.js loader import map and Arctic mountain cave shortcut were preserved.
- World objects that require elevated Y include road, curb, road markings, lights, checkpoints, obstacles, boosts, pickups, camera, collision barriers and the local player.

**Important limitation:** The five traversals are **numerical/simulated checks**, not five real browser playthroughs or a screenshot-based visual review. The map **must still be tested interactively** for final visual judgment, camera comfort, road surface quality, performance and multiplayer with two players. These checks reduce risks but do not establish that the map is perfect.


## Follow-up — browser recording review (2026-10-16)

A 77.8-second gameplay recording exposed visual/runtime issues that the numerical route checks could not catch:
- Ordinary road rails overlapped bridge-specific rails and some segments were not aligned to the grade.
- Roadwork obstacles rendered as plain grey boxes.
- Some street props, district-gate supports, tunnel walls and canal quays lacked collision coverage.
- The UNDERPASS fascia sat too close to the follow camera.
- Neon road/building lighting was too dim, and pickup diamonds did not read clearly as collectibles.

Corrective changes committed to the main branch:
- Raised-road sections now use the dedicated bridge rail system without duplicate ordinary rails; remaining rail segments follow the road grade.
- Nearby-track crossing filtering is enabled for Neon as well as Arctic, with a vertical-separation check for bridges.
- Neon roadwork obstacles use marked concrete-barrier geometry.
- Added collision registration for streetlights, billboards, traffic-light supports, district gates, tunnel walls/portals, utility cabinets, hydrants, the landmark tower and canal quay walls.
- Raised and resized overhead district signs; corrected their text texture aspect ratio.
- Increased Neon exposure/ambient fill, added emissive window maps, brightened fallback asphalt/concrete textures, and increased street-light pool coverage.
- Added ground rings and soft beacons to nitro/overdrive pickups.

## Post-fix validation

Five focused static review passes were completed: (1) syntax, (2) road/guardrail generation, (3) collision registration, (4) visual readability changes, and (5) isolation from Arctic-specific behavior. All three modified JavaScript modules passed a syntax parse, and the targeted source invariants passed.

**Limitation:** The fixes have not yet been verified in a second interactive browser recording. The next user playtest is still needed to confirm final visual appearance and real driving/collision behavior.


## Second recording — 00:58:11 (73-second browser capture, 2026-10-16)

A second interactive recording highlighted the following still-open faults:
- Near 00:24, overlapping road rails and apparent elevated roadside pieces close to the Metro turn.
- Near 00:39, an ordinary ramp looked like a large solid flat block and the car overshot into the off-road space after jumping.
- Near 00:48–01:00, the player became trapped against rails while negotiating the last sharp turn toward UNDERPASS.
- Giant white checkpoint overhead frames made city corners look structurally cluttered.
- Neon office façades remain too repetitive and unrealistically uniform; that broader art-quality task is not solved by this geometry patch.

**Root cause traced in the source:** The earlier buildRaisedRoads logic made a full bridge structure at *every* road altitude >1m. The western neighborhood's modest uphill/downhill grading was therefore being constructed as a floating bridge with pier-like supports and parapets, although there is no canal beneath it.

Changes committed following this recording:
- Build true parapets/decks/piers only along the north and south shipping-canal crossings; graded streets elsewhere receive a solid recessed roadbed, not bridge parapets.
- Remove ordinary/bridge rail segments whose geometry would cut across the sampled drivable lane. Visual parapets and their collision segments are filtered together.
- Replace Neon checkpoint overhead gantries with low roadside bollards, preserving checkpoint scoring/HUD. Arctic keeps its existing gates.
- Use wedge geometry for Neon ramps and lower the three non-secret launch strengths to keep airborne cars closer to the road at racing speed. Arctic/cave ramps and secret jumps retain their logic.

**Validation:** 3 modified modules passed JS syntax parsing; 8 additional code invariants passed. A GitHub diff comparison confirmed that the changes only touched the game source, Neon infrastructure, and review notes; the multiplayer Worker and room client were not edited.

**Pending:** Interactive visual/physics retest in a real browser after deployment; lighter facade textures and more varied buildings need their own subsequent art overhaul.


## Neon city clearance + dark-art overhaul (2026-10-16)

The user supplied another recording and identified five remaining problems: guardrails obstructing the route, intersecting decorative roads, buildings crossing the asphalt, blue instead of dark city architecture, and too few neon posters.

**Implemented on the main branch:**
- No ordinary street rails are generated for Neon; the canal-specific structural module still places physical bridge guardrails with lane-clearance filtering.
- Roadside building locations account for the full width/depth footprint, sidewalk width and extra corner/turn clearance; move candidates outward and reject remaining overlaps with the race route, neighboring buildings, secret-flight corridors, or reserved authored-model sites.
- Backdrop block positions are compared to the entire interpolated road centerline and their complete footprints. The previous every-fourth-sample estimate was too coarse for corners.
- Secondary city-grid roads are no longer enormous full-length slabs. They are merged into clipped, contiguous off-track runs, avoiding all racing roads, canal water, and building footprints.
- Imported GLTF building skins are tinted dark charcoal while preserving construction-prop colors. Generated facades, podiums, shutters, roofs and skyline towers now use dark neutral asphalt/graphite materials with sparse lit windows.
- New decorative neon advertising module uses 18 shared poster designs in varied neon colors, attaches wall boards and rooftop signs to roadside architecture, and adds 16 sector-specific billboard locations.
- No multiplayer, Worker, race scoring, checkpoint physics, car handling, or Arctic racing logic was edited in this pass.

**Verification:**
- Static JS syntax passed for game.js, neon-art.js, and neon-infrastructure.js.
- 12 targeted source invariant checks passed (road/guardrail settings, building clearance, clipped streets, GLTF materials, posters, and multiplayer preservation).
- Numerical mock scene-build with an approximate sampled route: 367 backdrop buildings, 327 skyline towers, 115 clipped decorative street runs, 489 lane markers, and zero intersections between generated city-block/street footprints and the sampled racing corridor.
- Mock neon advertising on 46 buildings generated 92 wall posters, 10 rooftop signs and 18 distinct designs.
- Separate mock bridge pass generated 134 physical rail segments with zero sampled lane intrusions.

**Limitations:** Numerical geometry was modeled from a sampled approximation of the spline, not an actual browser playthrough. Screenshots, camera line of sight, lighting appearance, multiplayer behavior and real-world FPS must still be assessed in a fresh deployed build.


## Road grade seams and turn-radius correction (2026-10-16)

A new player clip was submitted with complaints about rectangles across uphill/downhill stretches, visually odd road intersections, and sharp 90-degree-feeling turns. The provided video displays NEON DISTRICT at LAP 1/3; the current Neon V3 config is one lap, so this capture likely predates the current branch. Changes were made in the current source and require a fresh deployed playtest.

### Changes
- New Neon-only two-pass Chaikin corner subdivision (ratios .22 and .18) yields smooth curved route transitions while preserving one canonical route spline for checkpoints, visuals, physics, signs and collision. Arctic route and handling are unchanged.
- Neon drivable sample count increased from 520 to 640, improving curvature and elevation mesh fidelity.
- Removed independent rectangular center-support box instances from graded roads and canal bridge decks.
- Replaced them with two continuous triangular BufferGeometry meshes: recessed connected road supports and sloped embankments for ground-backed hills; recessed joined bridge decks over the canal.
- Preserved canal bridge-specific side rails and real pier structures; rail collision and rendered parapet now share the same lateral offset (sidewalkOuter + .04).
- Increased separation between background decorative city-grid streets and the circuit, and removed decorative road stubs shorter than 32 meters.
- Reduced the size of repeating center-line marker meshes around the updated curves.
- No multiplayer Worker, server, garage or login changes.

### Verification
- The modified game.js, neon-art.js and neon-infrastructure.js modules passed a JavaScript syntax parse.
- The simulated smoothed 640-point Neon circuit yielded around 1,646 meters of track length, a maximum climb/descent grade of approximately 11.1%, and no widely separated same-grade track-point pairs closer than 18 meters.
- A Neon infrastructure scene-build simulation generated two continuous support meshes comprising 1,986 triangles, 132 graded street support segments and 199 elevated bridge deck segments.
- The same simulation found zero physical bridge rail segments intruding into the driving corridor with matching rendered/physics offsets.

### Still pending
This is a numerical mock build, not a live browser playtest. Visual quality, road feel, performance on Chromebooks, correct placement of ramps/pickups and multiplayer with multiple clients still require real in-game testing.


## Guardrail and curb continuity repair (2026-10-16)

The latest full-resolution screenshot circled detached gray guardrail blocks at an uphill right-hand bend, with a new recording showing repeated slotted road edges around curves.

**Root causes:**
- Raised Neon bridge parapets and coping were still constructed as independent pitched instanced box meshes, each positioned from its local road chord instead of anchoring both endpoints to the sampled outer road edge. Their rotations and end caps did not meet on curves; an underslung girder was also generated as a separate box strip.
- Neon roadside curb and gutter strips were separate three-sample box instances. The reflective studs were shifted INWARD toward the driving lane and some bridge-level fixtures added unnecessary clutter.

**Fixes pushed:**
- Replace bridge wall and coping box instances with two continuous buffer meshes using road-sample normals at each end; wall top and coping bottom meet with no vertical gap. Skip the old separate box girder.
- Generate collision rail line segments from the same road-edge offset as the visible parapet; preserve bridge-only guardrails and elevated pier supports.
- Build curb and gutter as connected sample-to-sample surface strips, with a guarded wraparound at the circuit seam. Move studs outward behind curb and prevent raised bridge cabinets, hydrants and studs.

**Validation:** All three game-related modules parsed as valid JS. A mocked 640-sample rounded track produced 2 new road-edge meshes, 2 continuous guardrail meshes, and finite coordinates across all support meshes. The same test found zero rail collision segments intruding into the lane under the sampled 7.6m clearance check. Static/browser screenshot confirmation and frame-rate measurements still require playtesting after deployment. Multiplayer source was not touched.


## Neon ambient traffic — initial release (2026-10-16)

**Files:** game.js, neon-art.js, newly added neon-traffic.js.

**Design and boundaries:**
- The existing Neon city backdrop exposes only secondary streets that actually passed its building, canal and racing-road exclusion rules, rather than inventing a second traffic route that could cross the track.
- A separate client-only traffic controller drives up to 26 visible civilian vehicles. Vehicles use seven instanced geometry components (body, glass, roof, wheels, headlights, taillights and selected taxi signs) rather than constructing scores of separate meshes per car.
- Autos travel along two-way neighborhood lanes, accelerate/brake, stop at timed red intersections, and keep distance from same-direction traffic. They fade into/out of decorative road endpoints; no traffic crosses the competitive track.
- Up to 20 geometric side-street intersections get visually synchronized red/green light posts, rendered in just three additional instanced batches.
- Press T during racing to toggle local ambient traffic visibility and simulation. This does not change room settings or other players' display.
- Civilian traffic is strictly cosmetic. No collisions with racers, race timer changes, checkpoint changes, or multiplayer/network packets. Because vehicles are local-only and non-colliding, they need not synchronize between connected players.
- Rebuilding Neon instantiates a fresh traffic controller; world teardown disposes its geometry. Arctic has no civilian traffic.

**Validation (no live browser or Chromebook playtest yet):**
- The actual Neon street generator returned 67 eligible secondary street stretches in a simulated map build; 26 traffic cars were spawned and updated for 40 simulated seconds without invalid positions or speeds.
- Sixteen focused headless checks passed: road eligibility, real perpendicular road intersections, exclusive crossing signals, red-light stopping, green-light acceleration, follower spacing, instanced vehicle visuals, visible stoplights, sustained movement, valid world positions, distinct directional lanes, pause/resume toggle, network isolation, Arctic isolation, and preservation of the original street exclusion rules.
- Browser rendering and live multiplayer regression must still be verified after deployment.



## Dynamic Neon weather release (2026-10-16)

### Delivery order confirmed
1. Dynamic Neon weather (this release)
2. Custom car garage and cosmetics
3. Multiplayer quality-of-life and race improvements
4. Arctic Relay visual/layout rework

The remaining three stages are the agreed roadmap, not implemented by this weather commit.

### Implementation
- New separate game module: games/redline/neon-weather.js.
- The weather cycle is based on UTC wall clock, so automatic conditions follow the same broad stages in different clients with no additional multiplayer packets. Y selects a local override: Auto, Clear, Drizzle, Storm. Existing W acceleration and T traffic toggle are preserved.
- Single camera-following draw call for rain streaks: 460 pooled line segments, dynamically limited by intensity.
- Wet visual treatment updates the existing Neon asphalt PBR material's roughness/metalness and adds 142 small instanced translucent reflection decals anchored to the racing spline. No physically ray-traced reflections are claimed.
- Car tire spray uses 62 reusable pooled particles; emits only when the local car drives fast enough on wet roads, and excludes airborne cars.
- Storm effect adds visibility fog and occasional local lightning flashes. Clear weather gradually dries the road; exiting Neon restores fog, light exposure and original asphalt material values.
- The compact HUD shows active weather and the Y key hint; it is hidden on Arctic.
- Weather is visual-only: no changes to grip, road-surface physics, checkpoints, leaderboards, car upgrades, networking, or authoritative multiplayer state.

### Verification
- A headless mock Three.js weather simulation passed 16 targeted checks, covering deterministic weather transitions, finite bounded effects pools, wet road appearance, drizzle/storm levels, fog, valid particle buffers, mode cycling, drying, following the camera, and full map-switch cleanup.
- The existing game and art modules continued to parse correctly after weather integration.
- Live browser appearance and performance, especially Chromebook GPU performance and synchronized client views, still require a deployed playtest.
