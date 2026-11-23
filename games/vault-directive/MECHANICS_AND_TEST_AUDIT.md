# VAULT DIRECTIVE — Research, Systems Map, and QA Audit

Updated: 2026-11-23. Version: Survival Alpha 0.3.
This file is an implementation audit for the GAMESHUB version of VAULT DIRECTIVE.

## Reference research

We studied the broad structure of **Fallout Shelter**, not its source code or proprietary visual materials.

- Bethesda official game page: https://fallout.bethesda.net/en/games/fallout-shelter — vault creation, residents, rooms, equipment, training, and radio recruitment.
- Official Steam storefront: https://store.steampowered.com/app/588430/Fallout_Shelter/ — vault construction, room management, Wasteland exploration, weapons, outfits, training, and simulation.
- Bethesda support: https://help.bethesda.net/app/answers/detail/a_id/29951/ — standalone vault management game.
- Bethesda quest incident support: https://help.bethesda.net/app/answers/detail/a_id/42077/ — quests and active incidents interact in the original game's management loop.
- Bethesda official app description: https://play.google.com/store/apps/details?id=com.bethsoft.falloutshelter — radio recruitment and family population growth.

We also considered recurring player concerns in online discussions: early scarcity, meaningful resident assignment, threats that actually penetrate the base, and progression beyond a single "click-to-scavenge" action. Community guides are supplemental, not authoritative.

**Copyright and design boundary:** VAULT DIRECTIVE is a separate original game. The general *ideas* of constructing and managing a shelter can inform design, but Fallout art, Vault-Tec branding, characters, proprietary texts, sounds, and exact user-interface trade dress are not reused. Gameplay systems differ through physical excavation, manual work/rescue, configurable security chambers, power-dependent rooms, and persistent interactive scavenging locations.

## Scope at this checkpoint

| Design area | Working gameplay as of Alpha 0.3 | Incomplete / future depth |
|---|---|---|
| Opening | 3 named residents, hatch, short tunnel, no constructed rooms | Expanded narrative sequence |
| Camera and world | 2D sectional canvas, pan/zoom, terrain layers, day/night | Final 2.5D graphics/animated 3D residents, atmosphere |
| Excavation | Rectangular selections, reachable digging, strength-dependent speed, persistent partial work | Rich geology, advance risk notices, shoring, collapse severity |
| Rooms | Flexible 3–8 tile width, 2 tile height, builder travel, 11 facilities | Advanced furniture layouts, full electrical/pipe network |
| Upgrades | Levels 1–3; upgraded output and demand; physical builder order | Upgrade visual variants and wear/maintenance models |
| Resources | Continuous ration/water consumption; generator burns fuel; room loads calculated; live net rates | More detailed manufacturing and trade economy |
| Room staffing | Player assigns residents; physical walking; stat-based production; work shifts | More lifelike daily routines/relationships |
| Residents | Health, energy, needs, morale, loyalty, levels, equipment, jobs, shifts, training | Full social behavior and nuanced resident dialogue |
| Population | Manual admit/reject of visitors; beds; radio attraction; rescue; family plans and dependent maturation | Multi-generation relationships and migration events |
| Scavenging | Four fixed sites, new sites discovered by scouts, finite persistent room loot, search/salvage, encounters | Large variety of building geometry and encounter AI |
| Combat | Raiders/feral threats, defensive assignments, injuries, gear upgrades, enemy occupation | Individually modeled combatants, tactical missions, many enemy types |
| Incidents | Fire, vermin, infection spread, low air, starvation, damage, possible settlement loss | Incident visuals and deeper damage/rescue systems |
| Blast doors | Physical corridor checkpoints, manual and automatic lockdown, durability and breach, actual path blocking | Full industrial room animations and mechanical network systems |
| Cave-ins | Deep excavation risk, trapped survivors, condition-based oxygen loss, manual crew rescue, self-help orders | Multi-stage collapse simulation, structural reinforcements and multiple route planning |
| Policy | Rationing, overtime, unrest, strikes, negotiation, departures | Collective petitions, promises, organized factions |
| Learning | Optional skippable tutorial; one highlighted step at a time; out-of-order progress | Contextual animated demonstrations |
| Save/game over | Auto/local save, migrations from v1, custom reset, deaths, loss, revive with medbay | Server-side cross-device save and richer endgame |

**This is NOT yet full 1:1 feature parity with Fallout Shelter.** That would also imply many further systems (e.g., extended quests, full equipment inventories, detailed room/upgrade art, robot helpers, collectibles, multiple tactical encounter varieties) and original art and QA. The test results below validate the implemented slice, not the entire aspirational game.

## Architecture and ownership

- \`games/vault-directive/index.html\` — page structure, navigation, low-friction menus, modals and tutorial panels.
- \`games/vault-directive/style.css\` — responsive appearance, resource feedback, inspector, expedition, security, tutorial.
- \`games/vault-directive/systems.js\` — **canonical** power demand/priority, supply consumption/production, staffing effects, recruitment, populations, needs, infection, raiders, incidents, construction policy, family systems, self-rescue, and upgrade/rush calculations.
- \`games/vault-directive/game.js\` — canvas drawing, physical excavation and pathfinding, player clicks/tools, project completion, resident movement, site interactions and DOM orchestration.
- \`tests/vault-directive-foundation.test.mjs\` — isolated real-engine regression tests.
- \`.github/workflows/vault-directive.yml\` — syntax and regression tests on relevant pushes/PRs.

No changes are made to REDLINE or ILLEGAL CHESS internals. No GAMESHUB account tokens are required and game saves remain local.

## Cross-system collision audit

1. **Power definitions:** Removed conflicting display-side numeric \`use\` / \`power\` fields. Only \`VDSystems.ROOMS\` defines actual per-room demand. The generator consumes **fuel** rather than electrical power.
2. **Resource double-charge:** Food/water stocks decrease continuously in one simulation step. Resident eating/drinking satisfies personal meters but does not remove a second whole unit from stocks.
3. **Pathfinding:** Closed physical doors are impassable. Raider threat AI can check hypothetical routes to identify and attack a blocking door but never teleports through the barrier or solid earth. Raw vertical holes do not provide ladder movement.
4. **Room overlap:** Construction checks for solid terrain, existing rooms, active orders, doors and ladder segments, rejecting overlaps.
5. **Work overlap:** Manual excavation/rescue/construction assignments supersede room jobs. Residents leaving old jobs are removed from old work crews. Crew selection clears when a project finishes.
6. **Crash on death:** Removed drawing instructions that had accidentally entered the needs simulation. Corpses are drawn by the canvas renderer only. Added a death/render regression test.
7. **Room air:** Normalized all old/new room instances to a finite air meter; avoid displaying 95% when air is actually zero.
8. **Recruitment:** Existing local saves migrate without resetting terrain or residents. Admissions only happen by player decision and only within available residential capacity.
9. **Scavenging:** Every room has persistent searched state. New surface sites are *discovered* first; clicking Survey does not magically award salvage.
10. **Infection/rescue:** Infection and low-oxygen systems affect actual survivors. Rescue must have an assigned team unless an able-bodied trapped resident succeeds from inside.
11. **Single source of time:** Simulation speed and pausing use one engine clock. Old passive production timers were removed to avoid parallel producers.
12. **Power and room integrity:** Loss of fuel disables output, damaged/occupied rooms stop normal production, and priority determines which rooms stay powered under shortfall.

## Test results and caveats

- Regression suite has been exercised with the current source and a DOM/canvas test harness (24 tests passed at this checkpoint).
- CI runs syntax and Node test checks on the matching GitHub branch and pull requests.
- Tests cover startup, stock drain, dig/build, staffing, low power, beds/admissions, doors, rescue, scavenging/infection, hostile encounters, stranded survivor extraction, surveying, raids, incidents, negotiation/revival, local save migration, rendering, room upgrades, family maturation, isolation, total loss, rush, self-rescue and policies.
- **Not a browser visual test.** The mock canvas proves the renderer does not throw in tested scenarios; it does not guarantee polished visuals or catch all pointer-device issues. A real browser pass is necessary after the Pages deployment is available.
- Long-duration balancing and the full design specification remain ongoing work.

## Known gameplay constraints

- Graphics remain painterly procedural **2D** rather than finished 2.5D/3D.
- Raiders are currently represented by a coordinated hostile group rather than independent animated invaders.
- Rescue hazards are functional but lack the extensive graded-collapse warnings and reinforcement mechanics from design.
- Locations are individual four-room sectional sites rather than unrestricted walkable open world.
- Internal room architecture and utility cables/pipes are simplified models.
- Full parity with every Fallout Shelter quest, unlock, item and collectible has not been implemented.

## How to verify

From the repository root:

\`\`\`bash
node --check games/vault-directive/systems.js
node --check games/vault-directive/game.js
node --test tests/vault-directive-foundation.test.mjs
\`\`\`

Open \`/games/vault-directive/\` on the deployed static site to check pointer controls, readability, tutorial guidance and actual save/reload behavior. A player can reload an old v1 foundation save without losing their existing excavation or rooms.
