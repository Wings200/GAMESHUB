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
2. **Movement + weapons + destruction:** stance transitions, hand/optic rigs, chamber/reload and recoil rules, penetration by material, incremental destruction, persistent openings.
3. **Complete operator gadgets:** physical place/use/pickup/counter states, animations, cameras/drones, explosions, denial and detection systems.
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
| G03 | Individual recoil patterns | PROTOTYPE |  |
| G04 | Recoil recovery and attachments | PROTOTYPE |  |
| G05 | True hipfire vs ADS accuracy | PROTOTYPE |  |
| G07 | Head, body and limb damage | PROTOTYPE |  |
| G08 | Magazine and chamber logic | PROTOTYPE |  |
| G09 | Reload and inspect animations | PROTOTYPE |  |
| G10 | Different operator weapon loadouts | PROTOTYPE |  |
| G11 | Proper muzzle flash and casings | PROTOTYPE |  |
| G12 | Reliable hit registration | PROTOTYPE |  |

### Destruction & Penetration

| ID | Feature | Status | Note |
|---|---|---|---|
| D01 | Gradual soft-wall destruction | PENDING | current soft wall supports bullet apertures and whole-panel breach; gradual holes remain |
| D02 | Small, accurate bullet holes | PROTOTYPE |  |
| D03 | Material-based penetration | PENDING |  |
| D04 | Wooden barricade damage | PROTOTYPE |  |
| D05 | Full reinforcement mechanics | PROTOTYPE |  |
| D06 | Hard-breach interaction | PROTOTYPE |  |
| D07 | Destructible floors and ceilings | PENDING |  |
| D08 | Explosion damage and fragments | PENDING |  |
| D09 | Debris and dust particles | PROTOTYPE |  |
| D10 | Real persistent openings | PROTOTYPE |  |

### Attacker Gadgets

| ID | Feature | Status | Note |
|---|---|---|---|
| A01 | Sledge hammer overhaul | PROTOTYPE |  |
| A02 | Thatcher EMP overhaul | PROTOTYPE |  |
| A03 | Ash breaching round overhaul | PROTOTYPE |  |
| A04 | Thermite exothermic overhaul | PROTOTYPE |  |
| A05 | Twitch shock drone overhaul | PROTOTYPE |  |
| A06 | Standard breach charges | PENDING |  |
| A07 | Frag and stun grenades | PENDING |  |
| A08 | Smoke grenades | PENDING |  |
| A09 | Claymores | PENDING |  |
| A10 | Secondary hard-breach gadget | PENDING |  |

### Defender Gadgets

| ID | Feature | Status | Note |
|---|---|---|---|
| E01 | Mute jammers | PROTOTYPE |  |
| E02 | Smoke gas canisters | PROTOTYPE |  |
| E03 | Castle armor panels | PROTOTYPE |  |
| E04 | Pulse heartbeat scanner | PROTOTYPE |  |
| E05 | Doc stim pistol | PROTOTYPE |  |
| E06 | Deployable shields | PROTOTYPE |  |
| E07 | Proximity alarms | PROTOTYPE |  |
| E08 | Bulletproof cameras | PENDING |  |
| E09 | Barbed wire | PENDING |  |
| E10 | Impact grenades and C4 | PENDING |  |
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
| Q01 | Automated mechanic regression tests | PROTOTYPE | repeatable sandbox tests added: node --test games/blackout/tests/sandbox.test.mjs |
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
