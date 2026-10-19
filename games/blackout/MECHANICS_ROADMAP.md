# BLACKOUT — Approved Mechanics Roadmap (139 selections)

**Source:** User-selected, October 2026. This file is the authoritative backlog for the mechanics-first rebuild. Do not substitute assistant-invented features for these selections.

## Status rules
- **STAGE 1** = present in the new open sandbox and verified by code-level tests (not a claim of complete AAA functionality).
- **PROTOTYPE** = some existing implementation; required polish, edge cases, audiovisual fidelity, and full tests are unfinished.
- **PENDING** = not yet implemented to the selected standard.
- A feature is **not finished** without appropriate regression tests and a live-browser smoke test. GitHub commits are not deployment confirmation.
- Real multiplayer must never be represented as the existing offline 5v5 AI simulation.

## Development milestones
1. **Sandbox foundation (current):** remove enclosed map/roof; separate stations, full-room A/B zones, target/cover tests, selectable roles/spawns, safe collision and timed vault.
2. **Movement + weapons + destruction (in progress):** Stage 2A added shared throw physics, remote Smoke, and chambered reloads. **Stage 2B/V3.2** adds four material profiles, penetrating rounds with different damage loss, accumulated wall erosion that eventually opens a traversable collider, deterministic recoil patterns, moving magazine/hand/charging-handle animations and impact debris. Next: detailed material layering, ballistic ricochets, destructible vertical floors, operator-specific firearms.
3. **Complete operator gadgets (V3.3 underway):** Stage 3A adds frag/stun timers, C4 remote, laser claymores with installation, contact-detonated impacts, physical bounce, visible blast/flash, bullet counters and blast cover checks. Remaining: full per-operator equipment restrictions, barbed wire, volumetric smoke grenades, gadget pickup, realistic destruction and multiplayer replication.
4. **Competitive round and bots:** accurate two-site rules, 45s prep, shared intel, purpose-driven 5v5 attacks and retakes, tactical difficulty.
5. **Presentation + performance:** reliable counters/HUD, high-quality original visuals, spatial acoustics, automated + browser QA.
6. **Network architecture:** true multiplayer server authority, private lobbies, replication, reconnects and protections.

## Selected features and truthful current status

### Testing Sandbox

| ID | Feature | Status | Note |
|---|---|---|---|
| F01 | Modular wall-testing station | PROTOTYPE | five stand-alone panels; one resets reinforced, four soft |
| F02 | Door and barricade testing station | PROTOTYPE | ten separate door/window frames and individual wooden boards |
| F03 | Two simplified bomb-site zones | STAGE 1 | A/B legal planting rectangles on flat floor, no enclosed map |
| F04 | AI cover-testing arena | PROTOTYPE | eight physical cover props plus open AI lanes; advanced cover tactics pending |
| F06 | Spawn as attacker or defender | STAGE 1 | existing attack/defense choice and approach spawn selection |

### Movement & Controls

| ID | Feature | Status | Note |
|---|---|---|---|
| M01 | Full walk / sprint / slow-walk | PROTOTYPE |  |
| M02 | Crouch and prone transitions | PROTOTYPE |  |
| M03 | Persistent Q/E leaning | PROTOTYPE |  |
| M04 | Leaning while ADS | PROTOTYPE |  |
| M05 | Improved vaulting | PROTOTYPE | 640ms vault interpolation and landing collision checks; hand animation pending |
| M06 | Movement acceleration and inertia | PROTOTYPE |  |
| M07 | Accurate collision capsule | PROTOTYPE |  |
| M08 | Moving while reloading | PROTOTYPE |  |
| M09 | Melee with proper animation | PENDING |  |
| M10 | Rappel training structure | PENDING |  |
| M11 | Footstep posture system | PROTOTYPE |  |

### Guns, ADS & Shooting

| ID | Feature | Status | Note |
|---|---|---|---|
| G01 | Real gun-mounted optics | PROTOTYPE |  |
| G02 | Multiple optic choices | PROTOTYPE |  |
| G03 | Individual recoil patterns | PROTOTYPE | V3.2: repeatable rifle/pistol vertical and lateral recoil that resets after pausing fire; recoil still needs operator/attachment tuning |
| G04 | Recoil recovery and attachments | PROTOTYPE |  |
| G05 | True hipfire vs ADS accuracy | PROTOTYPE |  |
| G07 | Head, body and limb damage | PROTOTYPE |  |
| G08 | Magazine and chamber logic | PROTOTYPE | Stage 2A: 30+1/15+1 chamber; tactical reload retains +1; empty reload 440ms longer; reserve preserved. Animation polish still needed |
| G09 | Reload and inspect animations | PROTOTYPE | V3.2: first-person magazines and support hands move during reload; empty reload pulls rifle bolt/pistol slide; weapon inspection still pending |
| G10 | Different operator weapon loadouts | PROTOTYPE |  |
| G11 | Proper muzzle flash and casings | PROTOTYPE |  |
| G12 | Reliable hit registration | PROTOTYPE |  |

### Destruction & Penetration

| ID | Feature | Status | Note |
|---|---|---|---|
| D01 | Gradual soft-wall destruction | PROTOTYPE | V3.2: localized damage accumulates into larger opening; after sufficient impacts, creates a human-sized open passage. Per-voxel exact damage not yet implemented |
| D02 | Small, accurate bullet holes | PROTOTYPE |  |
| D03 | Material-based penetration | PROTOTYPE | V3.2: drywall ~70%, plywood ~48%, glass ~88% through-damage; reinforced steel blocks rifle shots. More materials, thickness, range and ricochet pending |
| D04 | Wooden barricade damage | PROTOTYPE |  |
| D05 | Full reinforcement mechanics | PROTOTYPE |  |
| D06 | Hard-breach interaction | PROTOTYPE |  |
| D07 | Destructible floors and ceilings | PENDING |  |
| D08 | Explosion damage and fragments | PENDING |  |
| D09 | Debris and dust particles | PROTOTYPE |  |
| D10 | Real persistent openings | PROTOTYPE | V3.2: wall opening removes full-panel collider and replaces it with side/top colliders; AI path cache invalidated; reset restores continuous wall |

### Attacker Gadgets

| ID | Feature | Status | Note |
|---|---|---|---|
| A01 | Sledge hammer overhaul | PROTOTYPE |  |
| A02 | Thatcher EMP overhaul | PROTOTYPE |  |
| A03 | Ash breaching round overhaul | PROTOTYPE |  |
| A04 | Thermite exothermic overhaul | PROTOTYPE |  |
| A05 | Twitch shock drone overhaul | PROTOTYPE |  |
| A06 | Standard breach charges | PENDING |  |
| A07 | Frag and stun grenades | PROTOTYPE | V3.3: X throw, gravity and collision, separate fuses, AoE damage or blindness, cover blocks effects; advanced flash directional exposure pending |
| A08 | Smoke grenades | PENDING |  |
| A09 | Claymores | PROTOTYPE | V3.3: timed first-person placement, 1.15s arming, visible red laser trip zone, enemy-triggered explosion, damage/shootable destruction |
| A10 | Secondary hard-breach gadget | PENDING |  |

### Defender Gadgets

| ID | Feature | Status | Note |
|---|---|---|---|
| E01 | Mute jammers | PROTOTYPE |  |
| E02 | Smoke gas canisters | PROTOTYPE | Stage 2A: G physically throws/bounces, arms on rest, B remotely detonates, shootable before use; 10s real gas damage; live-browser polish pending |
| E03 | Castle armor panels | PROTOTYPE |  |
| E04 | Pulse heartbeat scanner | PROTOTYPE |  |
| E05 | Doc stim pistol | PROTOTYPE |  |
| E06 | Deployable shields | PROTOTYPE |  |
| E07 | Proximity alarms | PROTOTYPE |  |
| E08 | Bulletproof cameras | PENDING |  |
| E09 | Barbed wire | PENDING |  |
| E10 | Impact grenades and C4 | PROTOTYPE | V3.3: physical impact grenade on collision; C4 thrown and arms on landing, B remote detonator with LOS damage; bullets can disable placed charges |
| E11 | Reinforcement animation | PROTOTYPE |  |
| E12 | Gadget pickup and redeployment | PENDING |  |

### Drones, Cameras & Intel

| ID | Feature | Status | Note |
|---|---|---|---|
| R01 | Accurate drone driving | PROTOTYPE |  |
| R02 | 45-second drone preparation | PROTOTYPE |  |
| R03 | Physical drone detection | PROTOTYPE |  |
| R04 | Defender security cameras | PENDING |  |
| R05 | Correct scanning and pinging | PROTOTYPE |  |
| R06 | Drone preservation into action | PROTOTYPE |  |
| R07 | Droning leaves operator vulnerable | PROTOTYPE |  |
| R08 | Camera access after death | PROTOTYPE |  |
| R09 | Attacker repick after scouting | PENDING | attacker repick after drone prep not built yet |
| R10 | Team intel sharing | PROTOTYPE |  |

### Smarter Attacking AI

| ID | Feature | Status | Note |
|---|---|---|---|
| T01 | Coordinated 5-person attack | PROTOTYPE |  |
| T02 | Room-clearing intelligence | PROTOTYPE |  |
| T03 | AI-controlled scouting drones | PENDING |  |
| T04 | Cover, peeking and suppressive fire | PROTOTYPE |  |
| T05 | Dynamic breaching routes | PROTOTYPE |  |
| T06 | Real objective planting | PROTOTYPE |  |
| T07 | Carrier recovery | PROTOTYPE |  |
| T08 | Post-plant defense | PROTOTYPE |  |
| T09 | Realistic enemy awareness | PROTOTYPE |  |
| T10 | Difficulty levels | PENDING |  |

### Smarter Defending AI

| ID | Feature | Status | Note |
|---|---|---|---|
| V01 | Complete 45-second site setup | PROTOTYPE |  |
| V02 | Site anchors and active roamers | PROTOTYPE |  |
| V03 | Actual operator gadget usage | PROTOTYPE |  |
| V04 | Defensive patrol routes | PROTOTYPE |  |
| V05 | Camera and alarm reactions | PROTOTYPE |  |
| V06 | Organized defuser retake | PROTOTYPE |  |
| V07 | Coordinated crossfires | PROTOTYPE |  |
| V08 | Smarter repositioning | PROTOTYPE |  |
| V09 | Communication between bots | PROTOTYPE |  |
| V10 | Humanlike aiming and reactions | PROTOTYPE |  |

### Bomb Mode & Match Rules

| ID | Feature | Status | Note |
|---|---|---|---|
| B01 | Proper two-site bomb rules | PROTOTYPE |  |
| B02 | Plant anywhere legal in site | PROTOTYPE |  |
| B03 | 45-second preparation phase | PROTOTYPE |  |
| B04 | Detailed planting animation | PROTOTYPE |  |
| B05 | Detailed defusing animation | PROTOTYPE |  |
| B06 | Correct round win conditions | PROTOTYPE |  |
| B07 | Real 5v5 team status | PROTOTYPE | current five-vs-five counters are AI-driven, not online players |
| B08 | Operator and spawn selection | PROTOTYPE |  |
| B09 | Attack/defense side switching | PROTOTYPE |  |
| B10 | Defuser timer and sound escalation | PROTOTYPE |  |

### UI & Player Feedback

| ID | Feature | Status | Note |
|---|---|---|---|
| U01 | High-quality Siege-inspired HUD | PROTOTYPE |  |
| U02 | Full operator selection screen | PROTOTYPE |  |
| U03 | Detailed weapon HUD | PROTOTYPE |  |
| U04 | Drone interface | PROTOTYPE |  |
| U05 | Accurate team status bar | PROTOTYPE |  |
| U06 | Compass and directional pings | PROTOTYPE |  |
| U07 | Kill feed and hit feedback | PROTOTYPE |  |
| U08 | Spectator interface | PROTOTYPE |  |
| U09 | Full settings and keybinds | PROTOTYPE |  |
| U10 | Preparation and round-end screens | PROTOTYPE |  |

### Animations, Audio & Graphics

| ID | Feature | Status | Note |
|---|---|---|---|
| S01 | Complete first-person weapon rig | PROTOTYPE |  |
| S02 | Third-person movement animations | PROTOTYPE |  |
| S03 | All gadget deployment animations | PROTOTYPE |  |
| S04 | Better weapon audio | PROTOTYPE |  |
| S05 | Directional sound and occlusion | PENDING |  |
| S06 | Footsteps by movement and surface | PROTOTYPE |  |
| S07 | Explosions, dust and sparks | PROTOTYPE |  |
| S08 | Camera shake and damage feedback | PROTOTYPE |  |
| S09 | Reload and hand interaction detail | PROTOTYPE |  |
| S10 | Consistent rendering performance | PROTOTYPE |  |

### Multiplayer & Team Features

| ID | Feature | Status | Note |
|---|---|---|---|
| N01 | Real online 5v5 multiplayer | PENDING | requires a real network/server architecture; current teams are offline AI |
| N02 | Private custom match lobbies | PENDING |  |
| N03 | 1v1, 2v2, 3v3 and 5v5 | PENDING |  |
| N04 | Server-authoritative hit detection | PENDING |  |
| N05 | Replicated destruction and gadgets | PENDING |  |
| N06 | Teammate pings and shared intel | PENDING |  |
| N07 | Text and voice team chat | PENDING |  |
| N08 | Reconnect and spectator support | PENDING |  |
| N09 | Operator pick and ban | PENDING |  |
| N10 | Latency diagnostics and protections | PENDING |  |

### Testing & Polish

| ID | Feature | Status | Note |
|---|---|---|---|
| Q01 | Automated mechanic regression tests | PROTOTYPE | Added ordnance-stage33.test.mjs for fuses, blind/LOS, C4, claymores, impact and resets. Existing sandbox, smoke and destruction suites remain; live browser verification still pending |
| Q02 | AI scenario testing | PROTOTYPE |  |
| Q03 | Collision diagnostics | PENDING |  |
| Q04 | Frame-time and memory profiler | PENDING |  |
| Q05 | Gadget interaction matrix | PENDING |  |
| Q06 | Live combat/debug overlay | PROTOTYPE |  |
| Q07 | Reliable round reset | PROTOTYPE |  |
| Q08 | Recorded scenario replay | PENDING |  |
| Q09 | Browser gameplay smoke tests | PENDING | live browser test has not been performed or claimed |
| Q10 | Feature-by-feature quality checklist | PROTOTYPE |  |


## Stage-1 executable tests

From the repository root run `node --test games/blackout/tests/sandbox.test.mjs`. These are source-level simulations, not actual visual/interaction/browser QA. Before marking any feature complete, reproduce a full round in the deployed browser on both attack and defense, test from different spawn positions, and inspect F3 AI diagnostics.

### Don't regress
The open floor must have **no enclosing structural walls and no roof**. Preserve independent, actually collidable test stations; real world interaction for A/B planting; distinctive soft/reinforced test panels; collision-aware individual barricade planks; player capsule and aiming; 45s drone prep; 5v5 offline bot squads. Existing game authentication and the REDLINE game must not be modified.

## Stage 2A — Smoke throw / remote activation and magazine mechanics

- **Smoke primary ability:** Select Smoke on defense. Tap **G** to begin a visible ~0.43s throw animation; a canister then flies, hits real colliders, bounces, and arms when resting (green LED). The gas is **inactive until B is pressed**, at which point all landed armed canisters remotely emit toxic gas for ~10 seconds. You can pre-place multiple canisters; shot canisters are destroyed without gas. **X** remains the separate proximity-sensor control. Charges reset each round. Enemy AI Smoke gas remains automatic and independent.
- **Shared throw physics:** `src/throw-physics.js` uses deterministic substeps, gravity, solid collider impact and damping. It's designed for future frag, stun and EMP throwables, but those follow-up mechanics are **not yet complete**.
- **Weapon magazine model:** Rifle loads 30+1, pistol 15+1. Tactical reload retains a chambered round while replenishing from reserve. Empty reload adds a 440ms animation/action delay and loads a 30/15-round magazine without +1 until another tactical reload. This is a first pass; full eject-mag and charging-handle animations remain incomplete.
- **Source regression tests:** `node --test games/blackout/tests/*.test.mjs`. `tests/smoke-stage2.test.mjs` covers throw/landing, inactive-before-trigger, remote damage/expiry, shooting canisters, physics collisions, round reset and magazine states.
- **Unfinished:** detailed hand model / lever throws, true obscuring volumetric smoke, authentic environmental occlusion and destruction materials, multiple gun-specific attachment animations, actual live-browser smoke test, real multiplayer synchronization.

## Stage 2B / BLACKOUT V3.2 — destruction and gunplay prototype

- Five freestanding test panels: 2 drywall, 1 plywood, 1 laminated-glass *gameplay approximation*, 1 reinforced steel. A rifle bullet can pierce unreinforced material with a material-dependent damage multiplier. Steel reinforcement and physical metal frames stop bullets.
- Sustained impacts form an expanding aperture instead of destroying the entire panel. When a sufficiently tall/wide opening exists, the wall's full-width collider is replaced with left/right/top sections, enabling player movement and AI pathfinding. The opening and its surviving braces must agree with the visible geometry; reset clears holes and restores collisions.
- Rifle and pistol recoil trajectories are learnable, distinct patterns with a pause-reset, not per-shot random lateral displacement. True weapon-specific attachments, stance-independent spray analysis and competitive recoil calibration are still pending.
- First-person magazines, replacement magazines, supporting hands and empty-reload bolt/slide motion added. These are procedural meshes, not motion-captured Siege animations.
- Test: `node --test games/blackout/tests/*.test.mjs` includes `destruction-stage3.test.mjs`. Code-level mock simulations passed during implementation. Full Node runner in this connector environment and live-browser rendering/deployment have **not** been independently verified.

## Stage 3A — BLACKOUT V3.3 advanced equipment

- **Selectable secondary loadout, X:** Attackers can test recon pulse, frag grenade, flashbang, or claymore. Defenders can test proximity sensor, thrown C4, or impact grenade. This sandbox allows team-wide loadout selection for testing; authentic operator-by-operator loadout restrictions remain **pending**.
- **Thrown grenades:** Real existing collider physics, visible first-person throw motion, distinct frag (3.2s) and stun (2.25s) fuses; impact grenades detonate on world collision. Explosions affect bots/player with distance falloff and line-of-sight cover blocking. Flashbangs blind affected AI and temporarily white-out affected player views.
- **C4:** X throw; wait until the device lands and arms; B detonates landed, armed C4 remotely. Shooting a device disables it before detonation. Smoke still uses G for special gas canisters, and B can detonate armed Smoke and C4 together if both are equipped in this experimental sandbox.
- **Claymore:** X begins ~1.15s physical placement; lasers arm ~1.15s later. Enemy AI crossing the laser zone triggers an explosion. Undetonated devices may be shot and disabled.
- **Feedback and cleanup:** Detailed secondary selector, ammo counts, remote armed-C4 count, WebAudio blast/flash/throw effects, brief explosion mesh and player flash overlay. All active/pending ordnance, hit targets, and effects are cleared on round reset.
- **Tests:** `tests/ordnance-stage33.test.mjs` adds deterministic source-level cases for role loadouts, delayed fuses, blast and sight occlusion, C4 remote arming, claymore triggers, impact explosions, shootable counters and cleanup. Isolated JS integration simulations were executed. Not yet proven with a full deployed-browser playthrough.
- **Still pending:** authentic operator-restricted utility lists, real grenade hand meshes/cooking/fuse details, true post-flash deafness and view-direction exposure, throw trajectories through glass, server-authoritative sync, full barbed wire, floor/wall destruction polish and browser capture regression.
