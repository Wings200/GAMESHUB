# REDLINE V21 — Nevada Run (Blacksite Desert)

## Status
Implemented in the existing REDLINE main branch as the third playable track; no production Worker changes are required to recognize its identifier. Live browser visual/physics testing remains necessary after Cloudflare Pages deployment.

**Player-visible track name:** NEVADA RUN
**Canonical internal identifier:** `canyon`. This ID is already allowed by the existing Cloudflare Worker (`VALID_MAPS`), is part of its race results/leaderboard data, and avoids disrupting saved multiplayer or requiring an immediate Worker rollout. The formerly disabled Dustfall Canyon slot has been repurposed for Nevada Run. Neon District and Arctic Relay are untouched.

## Route and atmosphere

- Nearly **4,000 m** of closed-loop route based on 22 nonintersecting control points, sampled at 900 curve points.
- **20 ordered checkpoints**, 1 complete lap, grade up to approximately 12% between control points.
- Six Nevada-themed sectors: open desert highway; Red Rock Canyon; sandy dry lakebed; fictional restricted blacksite perimeter; an active testing airstrip; elevated downhill canyon return.
- Day transitions **sunset → dusk → illuminated night** over about 145 seconds from the shared race start.
- Sandstone procedural eroded mesa geometry (not cones), canyon walls, 3D embankment/fill alongside elevated road, colored desert terrain, floodlights, watchtowers, radar dishes, military hangars, fences and roadside warnings.
- Road itself follows the 3D route; camera, physics ground height, ramp landings, respawns, and gravity follow the same altitude.
- Particle dust, desert scrub, power poles, road signage, warning signs and lakebed cracks.
- Per-race weather/light changes apply to Nevada only; Neon weather and Arctic snowfall are preserved.

## Active obstacles with driving consequences

All hazard geometry is part of `nevada-run.js`, updated from `REDLINE_MP.serverNow` when connected (falling back to Date.now when local). Hazards have physical collision and/or vehicle-handling effects. They are not purely decorative:

| Hazard | Gameplay |
|---|---|
| Military convoys and fuel tanker | Traverse stretches of raceway with moving vehicle mesh; timed road collision adds impact, bounce, slowdown |
| Security gates | Periodically open/close; closed arms stop and jolt the car |
| Sweeping searchlights | Spotlights patrol the restricted sector; detection triggers visible warning and minor nitro penalty |
| Dust devils | Moving debris vortex, repeated sideways force and reduced stability; demands countersteering |
| Airstrip aircraft | Large moving aircraft cross active racing lanes, with crash collision |
| Loose debris/tires | Mobile road clutter with contact slowdown |
| Lakebed cracks | Visible crust fractures with reduced grip, steering and acceleration plus increased drag |
| Timed blast doors | Metal industrial barriers close on a clock; physical collisions while closed |

The simulation has 27 moving hazards, three searchlights, 5 floodlight arrays and actual static colliders for hangars, rocks, towers, tunnel walls and fencing. Same Worker clock keeps motion phase consistent across network clients. Each racer computes their own contact forces with the game's existing local physics (the server is not running authoritative car physics).

## Hidden routes and racing features

- Four rendered drivable alternate road links (drainage channel, underground service tunnel, hangar maintenance road, cave/ridge passage). All fall inside existing sequential checkpoint intervals to avoid making a shortcut invalidate the lap.
- Service tunnel/cave links have roof geometry and physical side wall colliders.
- A separate broken-fence/blacksite jump and second hangar-side jump use REDLINE's existing secret ramp system and speed thresholds.
- An abandoned research outpost is placed beside the ridge with service-road detail.
- Discovering a secret side passage grants a small **nitro boost** locally and displays its name. These discoveries **do not award saved cash**, to avoid client-controlled account money.
- Six existing functioning nitro/overdrive collectible pickups on dangerous racing lines.
- **Cash pickups were deferred:** Persistent REDLINE money must be credited and deduplicated by the Worker after validating a real pickup. The existing client-only positional check cannot securely mint account cash. No fake on-screen cash credits were added. These require a separate account-safe Worker update.

## Cross-mode compatibility
- Online map selection: `canyon` is a Worker-supported map and now renders Nevada Run.
- V20 local solo Time Trial and PB ghost: `canyon` added to local track validation and menu; ghosts remain locally stored per account/map/car.
- Online `canyon` leaderboard already exists, visible with the Nevada Run name. Note existing historical canyon records (if any) may remain associated with this reused server ID.
- Existing per-car upgrades, gameplay physics, camera and music continue as before.
- Neon/Arctic map data, Worker, saved accounts, real race result logic, race cash economy and challenge definitions are **unchanged** by V21.

## Verification performed
- JavaScript syntax tests for the new environment and patched game/trial files.
- Standalone mock Three.js scene construction test: world built without runtime exceptions; colliders registered; hazards ticked with a simulated player.
- Route validation from 22 control points: about 3,975 m of route (straight-line segment approximation), 0 straight-segment self intersections, grade up to ~12%, 20 monotonically ordered checkpoints.
- Four secret routes kept within adjacent checkpoint windows, not spanning a required sequential gate.
- Worker source checked to already accept the internal `canyon` map ID.
- Frontend selectors, module URLs and local ghost storage map list checked.
- **Not done:** live Cloudflare/browser rendering, multiple real cars in multiplayer, live sound/pacing, visual QA for vehicle-to-hazard collision, and persistent cash pickups. Tester feedback remains the next source for adjustments.

## Quick test
1. Open https://redline-dnk.pages.dev/games/redline/index.html
2. Create a multiplayer room and select `Nevada Run · Blacksite Desert`. Verify friends load it.
3. Alternatively choose `TIME TRIAL` → `NEVADA RUN` and drive with a starter or owned car.
4. Drive through the six sectors and challenge the gates, convoys and aircraft. Countersteer through dust devils.
5. Explore alternate service corridors, the broken fence, ridgeline cave and outpost.
6. Finish: normal multiplayer race rewards work as before; a local Time Trial stores the Nevada personal best.
7. Revisit Neon and Arctic to confirm no changes to their original physics/geometry.

## V21.1 recording-driven rebuild — October 17, 2026

A 77-second user gameplay recording revealed Nevada Run looked severely unfinished: earth-color geometric sheets swallowed asphalt edges, ground appeared to end in elevated slabs, landmarks were sparse, and hazards did not behave consistently. Previous "code pass" reporting was insufficient; **a static syntax test cannot validate actual visual quality.** These issues were acknowledged as release defects.

Changes committed after studying video frames:
- Removed the seven-band mesh that ran across the middle of the roadway and generated large triangles on turns. Replaced it with two separate bands beginning **outside the painted road** and graded down to the desert floor. This removes the direct cause of earth strips appearing over asphalt.
- Connected the outer bands to the real low terrain height rather than leaving artificial 20-meter-high shelves. Moved canyon cliff geometry farther from the drivable shoulder.
- Darkened asphalt and brightened edge stripes so racing lanes contrast with sandstone at sunset.
- Fixed a serious hazard update early `return` inside a for-loop: if any barrier was open, later aircraft, gates, dust and the spotlight detection skipped their update that frame. It is now `continue`.
- Replaced floating collision arms with visible rising/lowering security arms. Their closed height now matches vehicle bumper/windshield, and industrial blast doors lift out of the road instead of simply disappearing.
- Added marked fictional runway surface and runway lighting by the blacksite, plus real collision boxes for the abandoned outpost shacks.
- Added guarded desert initialization/update failure handling so scenery exceptions don't break the central race loop.
- Fresh module/script versions in HTML and `game.js` to bypass stale browser caches.

**Verification:** JavaScript parsing was checked and new scenery instantiated/updated in a Three.js-compatible simulated scene; 27 hazards and four shortcuts were present, late-stage aircraft and dust moved after an earlier gate changed state, 79 static box colliders were registered, and contact with a simulated convoy slowed the vehicle. The actual WebGL output in a user's browser has **not yet** been visually confirmed for V21.1; video-based visual QA of the repaired build is required before calling the map polished.

**Remaining quality work:** high-detail runway and facility modeling, believable road material/weather blending, dynamic hazard fairness at multiplayer latency, user-driving validation of all shortcuts, and server-authorized cash collectibles. No claim that these are finished.

## V21.2 — second recording review and systemic fixes (October 17, 2026)

A follow-up 181.65-second player recording showed Nevada still suffered from excessive bugs and a disjointed driving environment. Rather than claiming the scene was ready, we reviewed terrain placement, obstacle lifecycle, vehicle hazard contact, shortcut floor height and road readability.

**Fixes shipped in the latest main branch:**
- Unified all road embankments into a continuous terrain-height function; embankments now begin just beyond the 9.2m shoulder and end at the existing valley floor. The outer bank width shrank to ~32m to reduce ribbon folding around tight bends.
- Grounded signs, fences, radar dishes, watchtowers, hangars, the runway, roadside dust, rock cliffs, and outpost structures on that same height model instead of leaving them floating at roadway elevation.
- Raised hangar collision-box world min/max heights to match their actual elevated or low-lying placement; fixed fence collider heights.
- Exposed terrain height to `game.js`, which now uses it for off-road vehicle support.
- Brought the alternate paved passages' actual rendered height and the car's calculated support height into agreement; trial ghosts continue recording real car transforms on the new ground. The short side-road physics zones carry start/end elevation for continuous interpolation.
- Changed gates and blast doors from road-spanning unavoidables to **single-lane hazards**, with the other lane open. Collision is applied only once a moving arm/door has descended to a height that can physically strike the car.
- Changed convoy motion from teleporting back to its beginning every cycle to smooth path oscillation and legal turnarounds. Dynamic hazards continue updating after open gates.
- Reoriented roadside and shortcut signs to face approaching cars; moved sector signposts to the raised-road shoulder so drivers can see them.
- Added physical collision to roadside power poles and warning signs, while retaining collision on hangars, perimeter fences, cliffs, and abandoned outposts.
- All changes gated to Nevada (`canyon`) apart from the shared, conditional physics ground-height function. The existing Worker and permanent money/ownership systems were not changed.

**QA performed:** JavaScript and HTML inline-script parsing; mocked Three.js environment creation and animation; 27 dynamic hazards found, 4 shortcut paths found, convoy collision slowed the test vehicle, and later hazards kept animating. Static roadside colliders are registered. These checks are not a replacement for a visual playthrough in a real browser. Specifically, 3D asset/model realism, minor road artifact clipping, balancing obstacle difficulty and complete multiplayer live testing remain open, not verified as complete.

**Cash collectibles:** Not implemented because a server-authoritative and deduplicated pickup event is required to pay persistent in-game cash safely.

**Current page:** https://redline-dnk.pages.dev/games/redline/index.html?v=nevada-road-fixes-21-11

## V21.3–V21.5 track repair pass — October 17, 2026

The second recording showed defects too serious to call Nevada release-ready. Continued edits were made **directly on main**, without changing the Worker, accounts, money, or the other maps.

- **V21.3 road geometry:** Added a guard against outside embankment triangles covering unrelated road sections at switchbacks. Used the displaced shortcut centerline (not the neighboring highway heading) to orient side-road pavement, tunnel roof sections, and wall colliders.
- **V21.3 support physics:** When several shortcut surface zones overlap, support height now comes from the closest relevant side path and prefers the main asphalt while the car is actually on it. Nevada boost pads now require correct height rather than triggering on a nearby overpass. Rail collision crossing checks account for Nevada grade differences. If dynamic hazard updates fail, the terrain support provider is retained so cars do not fall off-road.
- **V21.4 hazards and secrets:** Fast vehicles now use a previous-position crossing test against lowered gates and blast doors; solid barriers push drivers back to the approach side even during hit cooldown, rather than allowing them to drive through during the 1.25-second effect debounce. Side-road secret discovery height is anchored to the actual passage floor instead of main-road altitude.
- **V21.5 blacksite fencing:** Replaced 29 short widely spaced fence objects (with colliders on every third fence) with 120 sampled intervals per side. The new fence panels join into a continuous run where safe, and each retained section has a collider. Explicit openings preserve the service tunnel, maintenance route, and broken-fence jump. Where a fence would interfere with a distinct roadway, it is omitted. This is a geometric/functional correction, not a claim of photorealistic art.
- **Cache refresh:** Browser module URL is now `nevada-v21-5-fencing` in both the HTML page and the game’s Nevada module import. Players must still receive the new Cloudflare Pages deployment; updating GitHub itself does not verify that deployment.

### Verification performed for this pass

- JavaScript syntax parsing passed for `nevada-run.js` and `game.js` (after stripping ES module imports/exports for parser-only checks).
- A mock Three.js scene constructed and advanced its moving hazards. It registered **27 hazards, 4 side paths, 250 static box colliders (179 perimeter fences), and 38 circle colliders** in the test fixture.
- Reproduced a simulated high-speed attempt to cross a closed gate: the driver was returned to the approaching side (~2.49 m in front of the barrier), with one impact event.
- Cache version strings match between the HTML entrypoint and game module.

**Limitations:** This is a simulated construction/contact smoke test, **not actual browser WebGL visual QA**, player-paced route completion, deployed Cloudflare verification, or multiplayer load testing. Road seams, concrete/asphalt appearance, correct tunnel clearance on a real curve, nighttime lighting, scenery realism, hazard balance and server-validated persistent cash pickups remain open for recording-based validation. Future work should prioritize any reproducible browser defects over decorative additions.

## V22 — recording-driven track rescue (October 17, 2026)

**Evidence:** User video `Screen Recording 2026-10-17 225307.mp4`, 112 seconds at 2560×1440. The recording showed a huge desert mountain visually covering the road around the 1:04–1:08 mark, mostly featureless black asphalt, large sparse terrain, visually underwhelming hazards, and a miniature dust devil that barely affected handling. Players also reported unreliable scenery and trap collisions. These observations are defects, not polish requests.

### Terrain and visual repairs

- All 92 candidate distant mesas now undergo X/Z road and secret-route clearance before being created. The test uses the stretched mesh footprint, not just its nominal radius. A polyline-only diagnostic identified **five previous candidate meshes overlapping the road envelope**; the actual curved road clearance is tested at the game's 900 track samples. Collision is attached to each retained mesa.
- Nearby canyon cliffs, hangars, watchtowers, radar installations and the abandoned outpost avoid overlapping other raceway segments. The full 168m runway is relocated outward until its footprint clears the sampled road.
- Sandstone mesas use 15 layers × 36 radial vertices for smoother strata and more natural erosion. Valley and embankments receive repeatable gravel textures with matching world-space UVs, preventing seam and frequency mismatch.
- 210 possible instanced desert rocks (210 registered in the linear-route fixture) add dimensional foreground detail without hundreds of draw calls; each has a physical circular collider.
- Sunset lighting now includes a warm directional light fading toward night and a mild amber sky fill. Canyon-specific asphalt now has a brighter, weathered desert texture, not the old dark-blue/black multiply. Guardrails on both high-exposure edges are galvanized-looking, fitted with posts/reflectors, and graded fences match underlying slopes.
- Hangars have roof ribs, vents, door seams and painted markings instead of plain single-box fronts.

### Physical collision and hazard repairs

- Added swept static-box and circular collision tests in `game.js` (gated to Nevada). A player whose center moves from one side of a thin pole/fence to the other within a single frame no longer phases through it.
- Added swept moving-hazard circle tests for aircraft, debris and convoys. Security gates and blast doors already had continuous barrier-crossing checks, and now gate support posts also have physical collision.
- 27 dynamic hazards remain in place, including two aircraft, three convoys/tankers, three security gates, two blast doors, 14 debris pieces and three dust devils. Aircraft face across the runway when crossing.
- The three dust devils now use tall translucent layered funnels with animated spiral dust. The wind radius increased to 10.8m; the vortex adds significant tangential and outward momentum, visible camera disturbance, slight vehicle yaw and an 0.85s reduced-grip effect. The previous ~3.2 m/s² imperceptible side shove was removed.
- Watchtower spotlight beams now genuinely sweep along with the light instead of a vertical cone spinning without visible motion. Detection deducts nitro and enforces a 2.4-second boost jammer.
- Closed-gate/blastdoor collision is matched to the actual moving mesh height. Warning beacon lamps flash. Rock, runway light and floodlight colliders are registered at realistic vertical limits.
- Nevada off-road ledges now transition to airborne gravity rather than instantly snapping downward to terrain altitude. Neon/Arctic height logic otherwise remains unchanged.

### Load-time improvement and tests

- Replaced repeated linear road scans per bank face with 28m spatial buckets. On the same V8 mock scene harness, elapsed scene construction went from approximately 1,319ms to 225ms (synthetic browser-independent timing, **not a device performance benchmark**).
- Latest mock check parsed both JavaScript entrypoints and built the Nevada world from a 22-control-point linear route approximation: **27 hazards, 4 shortcuts, 250 static box colliders and 370 circle colliders**, including 87 retained mesas and 210 boulders in that fixture.
- Dust vortex altered velocity, set the reduced-grip timer and triggered visible camera impact. Separate swept collision checks passed against a thin box fence and a pole by stopping a high-speed car before it could cross.
- All commits are on `main`. Cache tag: `nevada-v22-final-pass-1017`, shared by `index.html` and `game.js` Nevada import.

**Important limits:** This remains a code-validated release candidate. The mocked Three.js checks do **not** establish real WebGL visual correctness, obstacle balancing across a complete timed lap, cloud deployment state, sound design, multiplayer state/latency correctness, or every shortcut's driveability. The Cloudflare Pages URL could not be reached from the available verification tools. The next QA must be a real V22 driving recording and should report location/time of any new clipping or intangible obstacle; any proven bug should be fixed before marketing Nevada as finished. Permanent cash pickups still require secure Worker validation and were not modified in this pass.

## V22.1 — concealed routes and actual open approaches (October 17, 2026)

Player report: most “secret” branches were advertised openly by highway billboards or were obstructed by physical guardrail and fence segments.

- Defined all four hidden branch routes once in `NEVADA_TRACK.secretRoutes`, consumed consistently by side-road meshes, tunnel supports, spatial terrain cutouts, fence openings and `game.js` guardrail openings.
- Completely omit branch-side guardrails **including visual beams/posts/reflectors AND `barriers[]` collision records**, for the entrance–exit span plus 0.005 track-parameter margin. Also geometrically skip rails on adjacent road legs when they cross the branch. The rest of the guarded canyon remains.
- Remove any fence panels/colliders whose geometry overlaps the alternate path, supplementing the aligned restricted-area fence gaps.
- Trim embankment meshes away from each 7.2m-wide side-road pavement strip. Spatial buckets avoid quadratic construction cost.
- Removed large roadside billboards naming secret corridors. Identification signs now appear only inside the passage.
- Converted exposed concrete arches and warehouse paths to partially roofed, thematic underground culvert, utility service, hangar maintenance and sandstone-cave corridors. Physically collidable supports are only placed away from the public main-road lanes; camouflage boulders sit outside the 7.2m driveway.
- Increased actual discovery reward to 24 nitro and a 1.0s speed boost; only driving into the route earns it. Kept 20 normal checkpoint sequence intact. Lakebed reduced-grip behavior no longer overrides paved side-road traction.
- Forced new client asset version `nevada-v22-1-hidden-routes` for both `game.js` and the Nevada module.

**Verification**: Both files pass JavaScript parsing. Numerical guardrail test showed **zero opposing-side physical rails** at `t=.834,.839,.844,.850,.857` and retained the outside barrier at `t=.890`. Mock Three.js world construction passed with 27 hazards, four shortcuts, 205 box colliders and 370 circular colliders. For each of four branches, **15/15 centerline positions clear**, no perimeter fence collision and no sampled static collision in the mock. This does not constitute a real rendered browser or multiplayer driving test, and the mock control-point interpolation is approximate.

## V22.1 rollback / V22 recovery (October 17, 2026)

**Regression reported by player immediately after V22.1:** the whole game became broken and extremely laggy. Do not ship the V22.1 secret-path redesign again without browser/performance regression testing.

- Restored `nevada-run.js`, `game.js` and `index.html` to the last V22 code from commit `69467edf28c9913f850c47145076a2e18b59c40c`. This reverts V22.1's bank cutouts, extra covered shortcut geometry, portal-sweep guards, and modified route discovery.
- Applied *isolated performance fixes only* to the restored Nevada module. Converted 80 separate dust-gust mesh draws and 144 individual spinning dust puff meshes into four `THREE.InstancedMesh` batches (three tornadoes + one ambient dust field). Retained physics/dust-force handling, 27 hazards, four unchanged road shortcuts, 250 registered static boxes and 370 registered circles. Mock build comparison: 1,755 → 1,535 scene meshes, a reduction of 220 meshes/draw submissions. Mock tests, not real GPU FPS measurements.
- Reduced per-fragment active dynamic lights (3 tower spotlights to 1, up to 5 floodlight point sources to 2); emissive fixture meshes and spotlight-trigger logic remain.
- Cache version `nevada-v22-stable-recovery-1017` on both the main game module and Nevada import, to avoid reusing V22.1 JavaScript in browsers.
- The missing secret-path openings reported before V22.1 are **not solved** in this rollback. Resolve them later with a small, precisely measured change, and test a complete lap/performance before applying any major shortcut redesign.

**QA limits:** Script parse checks and mocked scene construction/update passed. Live Cloudflare URL could not be opened via our web tool, so actual deployed build, real browser FPS, graphics and network multiplayer still need user gameplay confirmation.

## V22.2b — Flight 51 and two tunnel approaches

Player reported a hangar visibly inside Flight 51's runway, an unrelated secret jump pad by the service tunnel, and an invisible wall at the second off-road tunnel.

- `NEVADA_TRACK.ramps`: removed the unrelated `t=.536` secret ramp. Preserved the drive-through Restricted Service Tunnel and the separately located `t=.735` secret jump.
- `createNevadaWorld`: relocate candidate Flight 51 hangars or omit them if road/runway footprints overlap. Checks the complete 30 m × 168 m runway, including rotated corners and extra buffer. Watchtower and radar candidates also avoid the runway.
- Enclosed tunnel geometry: keep both ends open by starting structural walls farther inside (`k=6..steps-6`); widen the portal interior; only create colliders when their corresponding visible walls can fit clear of the main highway. Colliders match wall transforms and vertical ranges.
- Ridge cave off-road junction (`t≈.834–.858`): removed **both beam geometry and physics collision** from the left-side descent rail over `t=.829–.863`. All other canyon guardrails remain. This is a single constant-time Nevada-only branch, not the expensive V22.1 geometry rewrite.
- Validations: JS syntax passed; sampled runway bounds show Aircraft Storage **20.3 m** clear of the airstrip pavement in the Catmull-Rom approximation, with all four retained buildings clear. Sampled tunnel center/side approach found **zero registered static blockers** for either enclosed tunnel. Guardrail simulation found no left-side rails at `t=.832,.834,.839,.845,.851,.858`, and rail returned by `t=.864`. All 27 hazards and 4 alternate routes remained in scene-construction test. Live browser driving, real FPS and Cloudflare deployment have not been independently verified.

Latest browser module cache marker: `nevada-v22-2b-runway-tunnel-clear`.
