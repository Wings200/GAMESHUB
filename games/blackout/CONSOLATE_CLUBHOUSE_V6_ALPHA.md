# BLACKOUT V6.3 — Consolate + Clubhouse (Approved Authored Map)

## V6.5 — Rappel usability and movement fix (October 19, 2026)
Reported issue: **rappelling did not work reliably in actual play**. Original attachment required an unmarked 1.9m radius around extremely thin rope, provided no nearby HUD prompt, had no guidance for aligning with a second-floor window and tested only one of the nine anchors.

Corrections:
- Every authored rope now has a visible **turquoise ground-level attachment ring**. When on attack, the match HUD announces distance and **PRESS T** as the operator approaches (up to 8m awareness, attach within 2.85m).
- Attachment tests the actual intervening wall colliders and refuses to pull players through the building from indoors; a blocked attempt explains to approach from outside.
- On the rope, the HUD reports the upstairs window's vertical offset and tells the operator when to hold **W** to climb or **S** to descend, when **SPACE** can enter, and when the window is barricaded.
- All nine ropes support climb/descent to the second floor. Window entry searches several safe positions across the actual aperture, checks the authored walkable slab and collision, honors barricades, performs the first-person vault, then detaches. On successful entry, the window pane disappears until the next round.
- A reset restores the panes. Rope updates do not simultaneously invoke grounded walking/gravity. Defender rappelling remains disabled.
- Simulated player movement tests on **both stairs** and end-to-end attach/climb/enter tests for **all nine anchors**, plus wall blocking, distance messages and barricade rejection, are part of the regression suite.

**How to test V6.5:** Refresh BLACKOUT with Ctrl+Shift+R → choose **CONSOLATE + CLUBHOUSE** on ATTACK → finish drone preparation → walk toward any turquoise ground rope base outside the building → watch the HUD → press **T** within 2.85m → hold **W** to climb to the window at **4m**, not all the way to the 7.75m roof hook → press **SPACE** at the upper window when it is unbarricaded. **S** descends; **T** releases. If entry is blocked, the on-screen prompt explains why.

Limitations: roof rope hooks still do not have a playable rooftop or horizontal swing mechanic. This pass focuses on reliable attachment and 2F window access for offline training. Browser playtesting is still necessary; automated success is not a substitute.

---

Author approval: October 19, 2026. This release is an **offline playable-map alpha** built from the user's approved BLACKOUT Dev Map Studio export.

## Original source of truth

`games/blackout/maps/consolate-clubhouse.blackout-map.json` contains the approved original 178-piece layout, not a newly guessed recreation:

- Two connected playable elevations: ground Y=0, upper Y=4m, including the original upper floor slabs and both user-placed stair flights
- 75 hard wall pieces, 27 reinforceable/breachable soft wall pieces, 23 doors, 14 windows, 11 cover objects, 5 upper/ground floor slabs, 2 stairs, 9 rooftop rappel hooks, and five attacker + five defender insertion markers
- Ground bomb pair **1F A-B** and additional **2F ARCHIVES / OPERATIONS** pair, with every original individually sized 3D plant box and each bomb's own `defuseRange`
- Owner-authored first floor, attacker placements and defender setup positions remain intact. No existing element was replaced.

## Integrated offline game behaviors

- New **CONSOLATE + CLUBHOUSE** option in the game's Loadout → Select Environment list, alongside SWITCHYARD and MECHANICS LAB.
- Source map JSON is loaded as an asset on the BLACKOUT page and converted to geometry by `src/clubhouse-runtime.js`. Physical hard-wall, window-sill, frame, crate and rail AABBs block players and AI. Doors and upper windows are real apertures, not flat painted-on walls.
- Existing soft-wall bullet holes, reinforcement animation, steel protection and breaching code are bound to all 27 authored soft walls. Door/window opening colliders support the same real barricade system as the Mechanics Lab. Windows may be vaulted from either axis.
- Floor sampler uses authored surface slabs and both stair flights; a player on ground does not automatically teleport to the overlapping upper slab.
- The authored site pair selector relocates actual bomb stations. Legal planting uses the **union of the independent rectangular 3D plant zones** and rejects the gaps between them. Disarming uses each authored bomb's custom defuser-interaction range.
- Five actual attacker exterior insertion markers, and five defender markers, are used for player spawn selection and 1-human + 9-AI offline rounds. No attacker body exists in the game during the drone preparation stage.
- Custom AI grid spans the large western exterior insertion and both floor elevations. A* navigates around actual authored obstacles and uses smooth stair connector waypoints to reach upstairs objective areas.
- Nine exterior anchors are rendered as physical cable markers. **T** near one of the ropes attaches or releases an attacker. **W/S** climbs or descends within cable length, and **SPACE** at the correct height can enter a nearby upstairs window when its landing is supported and barricades are removed. Rappelling ends on successful vault.

## How to test

1. Refresh BLACKOUT (Ctrl+Shift+R), then go to Play → Operators → Loadout → **CONSOLATE + CLUBHOUSE**.
2. Choose either **1F A-B** or **2F ARCHIVES / OPERATIONS**, an attacker or defender operator, and an authored insertion/defender position.
3. Enter a local training match. Walk through the first floor, up each stair flight, and check hard/soft-wall collisions and barricaded doors.
4. On attack, locate an exterior turquoise rappel rope near an upstairs window. Press **T** to attach, **W** to ascend, **S** to descend, **SPACE** to vault through a clear upper window, **T** to release. An intact barricade must prevent window entry.
5. Test defending on both floors: reinforce soft walls and place barricades. Test attacking with a breaching gadget.
6. Switch between the 1F and 2F bomb pairs, plant only within the colored site-box areas by holding F, and verify 2F planting is impossible from ground directly below.
7. Switch to SWITCHYARD and MECHANICS LAB and confirm the previous gameplay remains unchanged.
8. Report precise timestamps of any stuck bot, invisible collision, unreachable window, stair landing issue, or incorrect room boundary.

## Automated acceptance

GitHub Actions runs `games/blackout/tests/*.test.mjs`; at V6.3 it checks the exact 178-piece export, real walls and hitboxes, 14 windows, 23 doors, nine rappel cables, 2 real staircase heights, both bomb pairs, stair-crossing AI routing **and full simulated AI traversal**, and successful rappel-to-upstairs-window interaction. Existing BLACKOUT regression tests remain enabled.

## Remaining alpha work — no false production claims

- No real multiplayer, server-authoritative map/collision replication, site voting or online matchmaking. Games remain local AI training.
- Pathfinding is prototype grid A* and can be temporarily delayed by narrow corners, destructible changes, or AI combat priorities.
- Window/rappel animation is first-person controller movement with a procedural rope, not a bespoke motion-captured animation set.
- Live browser walkthrough, per-room sightline/collision acceptance, animation/audio polish, high-fidelity structural materials, soft-wall geometry edge cases and FPS profiling have not yet been confirmed. They should be fixed before declaring this a finished competitive map.
- The Dev Map Studio remains developer-only and stores its authoring drafts locally; its export JSON is now the canonical asset for this imported map. Editing a draft does not automatically change the committed live map.

Preserve the approved author geometry; do not overwrite the original map file during later QA fixes without explicit user instruction.
