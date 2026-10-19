# BLACKOUT — Next major stage: original multi-floor tactical maps
Updated: October 19, 2026. **PLANNED, NOT YET BUILT.** Start after V4.2 live gameplay acceptance.

## User requirements
- Replace the temporary flat mechanics sandbox with playable, believable, detailed *original* tactical bomb maps.
- Real stacked floors (basement / ground / second floor at minimum), stairwells, different room layouts, roofs, doors and windows, exterior approaches, team spawn protection and functional interiors.
- Defender chooses an available bomb-site configuration before preparation (offline: player's choice; multiplayer: vote/rotation). Both bomb units for the chosen site pairing must occupy legal planting floors/rooms.
- Make drone navigation and camera/AI combat work *across floors* instead of using same-height flat ground heuristics.
- Do not simply copy Siege maps, names, operator art, sounds, proprietary layouts or visuals.
- Future multiplayer: server-authoritative phase/spawn ownership, visibility, bullet damage, gadgets, objective and defuser states; private session synchronization before public matchmaking.

## First original map: BLACKOUT // SWITCHYARD
An industrial communications / logistics compound with distinctive sightlines and material layers.
- **B1 / SERVICE:** transformer bays, cable access tunnel, maintenance stairs, storage, breakable overhead floor panels where structurally appropriate
- **1F / OPERATIONS:** delivery court, security lobby, central switchroom, loading docks and warehouse lanes; a credible road and external approach
- **2F / CONTROL:** administration corridor, glassed-in control room, mezzanine overlooking an interior loading section, two staircase connections
- **Roof / exterior:** restricted roof access, hard cover, mechanical fixtures and no free spawn-to-site line of sight

### Bomb-site pairs selected at start
- SERVICE / TRANSFORMER ROOM (B1)
- SWITCHROOM / SERVER OPERATIONS (1F)
- CONTROL ROOM / RECORDS (2F)
- LOADING OFFICE / SORTING FLOOR (1F + 2F split) — only if cross-floor plant rules are correctly validated

In a real round the selected pair is active; hide/disable nonselected bombs. Recon knowledge must be earned; no omniscient objective markers revealing defender selection to attackers before spotting.

## Implementation order
1. Map registry, load/destroy lifecycle, ground/floor collision graph, floorAt support and level-specific spawn sets; keep sandbox as a **separate MECHANICS LAB option** for regressions
2. Full blockout with stairs (not teleporters), windows/doorframes, vertical vaulting, ceilings, floors, sightlines, collision and AI-breachable pathways
3. Readable material textures and authored architectural detailing; no uncollidable decorative walls or flat cardboard buildings
4. Site-selection UI: defend-side site picker, legal plant volumes, spawn selection, operator draft and pre-round staging
5. Per-level tactical navigation graph and 3D LOS; attackers only materialize during action, defender prep is live; drone is a physical shootable object
6. Anti-spawn-peek site lines: outdoor attacker insertions behind opaque geometry with multiple exits, no direct spawn-to-site shooting rays; no player actors in playfield during drone prep; for network play validate all deployment server-side
7. Vertical soft floor/ceiling breach tests, reinforcement restrictions, stair collisions, correct debris and sound occlusion; include regression route checks for each site pair
8. Live browser walkthrough for every site, floor, stair, window, bomb area and spawn in both roles; fix blockers before adding additional maps.

## Release gates
- 0 illegal pre-prep attacker spawns or attacker bodies
- 0 direct defender LOS to attacker initial spawn pads through the level's usable cover/geometry
- 5v5 bots navigate each site with 3D-floor waypoints and can physically plant/disable
- Every stairwell connects floors by collision, with no invisible walls or fatal drops
- Site selection controls actual bomb activation, allowed plant volumes, and game HUD
- All damage/shots use actual obstructing geometry and team ownership
- End-of-round cleanup of bots, drones, bullets, destructibles, cameras and active effects
- Dedicated multiplayer milestone must still implement authority and replication. An offline AI test is not a real matchmade game.

V4.2 is *not* a multi-floor map release; this file specifies the next deliverable.
