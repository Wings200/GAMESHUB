# BLACKOUT V5.2 — SWITCHYARD multi-floor alpha
Date: October 19, 2026

## V5.3.1 interactive interior correction — October 19, 2026
The first SWITCHYARD alpha had mostly non-interactive concrete walls and did not register its room openings with the reinforcement/barricade gameplay systems. **That was a genuine missing part of the requested map**, not a visual-only problem.

Implemented:
- 12 original, in-place soft/plywood wall panels across the ground and upper floors (6 per level) integrated into the building partitions and exterior entry bays
- Physically collidable walls that receive bullet holes; clustered sustained shots can open a traversable area using the existing material damage profile; soft breach charges remove the whole panel collider
- Defender 3-second wall reinforcement on actual map panels, with animated and permanently visible raised steel plates; Thermite can remove the protection with a hard breach
- 10 actual framed door/window openings (five per floor) using the existing install/remove/break-board barricade interactions; wood collision and bullet hitboxes match the visible boards, and floor height prevents cross-floor interaction
- Map switching reconfigures barricades and panel physics without leaving ghost boards in the separate Mechanics Lab
- Defender AI now gets actual assigned prep tasks to approach walls, reinforce for three seconds, and install doorway barricades

Automated tests include actual wall hitboxes, reinforcement, breach collider removal, upper-floor placement, map switching and AI preparation. Browser acceptance and visual polish are still necessary.

**Limit:** Twelve designated soft sections, not universal per-tile destructibility. The remaining structural concrete walls and roof supports intentionally stay solid. Some unfinished room layout and visual issues from the uploaded V5 recording may still need separate fixes.

## Delivered
- First original tactical building **SWITCHYARD** selectable in the in-game loadout; original flat **MECHANICS LAB** remains selectable and its colliders, target props and barricade hitboxes restore upon return.
- Three physically separate accessible elevations: ground (Y=0), upper operations (Y=4), rooftop control deck (Y=8), joined by two genuine exterior flights of stairs and rail/landing geometry. Player collision/floor sampling knows the operator's current height; it cannot simply teleport upward inside the same X/Z footprint.
- Procedural original architecture with floor plates, enclosed rooms, window glass, exterior compound walls, concrete and metal materials, control cabinets, roof equipment, cover props, hanging conduits, lighting, floor signage and exterior attacker approaches.
- Three selectable **bomb site PAIRS** in the menu. Each pair relocates the two actual 3D bomb units and their world collider to the correct floor, and updates legal plant areas and defuser elevation:
  - Ground: SWITCHROOM / DISPATCH
  - Upper: CONTROL CENTER / SERVER OPERATIONS
  - Roof: RELAY ARRAY / RADIO CONTROL
- 3D AI line of sight, layered pathfinding linked by physical stair waypoints, retained routes during ascent and actual AI avatar vertical positioning.
- Recon drones start at the selected exterior attacker insertion, follow stair floor heights, remain shootable and can see operators upstairs.
- Attackers remain unspawned through the 45-second preparation phase; defender setup is active. Exterior attacker spawns start away from the bomb sites, with physical yard sight blockers.
- Existing single-player offline 1-human + 9-AI match round simulation preserved. No claim of online matchmaking or multiplayer authority.

## Code/test QA
- Automated source and simulation tests: 47 passed, 0 failed, on GitHub Actions before the final URL/cache bump.
- Specific checks: original sandbox isolation/return, three-floor sampling, continuous player stair climbing, vertical AI route and descent, physical AI movement to roof objective, site pair selectors, weapon/drone/ordnance regressions.
- These tests are **not** browser-rendered visual or full human gameplay acceptance. Live playtests, collision inspections, performance on actual devices and room-by-room polish are still required.

## Known alpha gaps — not concealed
- Geometry is original procedural blockout/detailing, not a photorealistic final map or a licensed Rainbow Six Siege map.
- SWITCHYARD now has 12 integrated soft-wall modules and 10 real door/window openings, though it does **not** have universal destructibility for every structural surface.
- Vertical gadget effects, operator-specific detailed model/animation polishing, robust sound occlusion across floors, full drone observation UI and all 3D bot combat edge cases need further hands-on acceptance.
- Defender AI on SWITCHYARD patrols during prep rather than silently installing gadgets at the old sandbox coordinates. Proper room-aware defender deployment is a next map iteration.
- Real multiplayer, server-authoritative damage/spawns/site voting/replication and actual matchmaking are not built.

## Next acceptance test (browser)
1. Start BLACKOUT -> PLAY -> OPERATORS -> LOADOUT. Choose SWITCHYARD, attacker, GROUND site pair, deploy. Verify 45s drone phase and no physical attacker body, then action insertion behind yard cover.
2. Try GROUND Site A/B and hold F while stationary on the corresponding physical floor. Move upstairs and confirm no accidental ground-site plant from above.
3. Choose UPPER and ROOF site pairs in the loadout; choose defender and verify defender player/operator bodies spawn on the selected level.
4. Walk both exterior stair flights without teleporting, clipping through walls, suddenly falling, or encountering phantom blockers.
5. Drive a recon drone along stairs and verify defenders can shoot it when in LOS.
6. Switch to MECHANICS LAB; verify original wall panel holes, barricades, C4/smoke, site bounds, optics, AI, and collisions still work.
7. Share a screen recording noting visible positions/timestamps of collisions or stuck operators. Fix the alpha issues before expanding to map 2.

This document is factual release status; do not label SWITCHYARD production-ready until browser QA passes.
