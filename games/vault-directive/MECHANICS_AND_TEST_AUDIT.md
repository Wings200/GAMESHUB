# VAULT DIRECTIVE — Design decisions and code audit, cutaway reboot

This document tracks specific commitments from the user and prevents repeating the old implementation's problems.

## Source-reference scope

Fallout Shelter reference: room-based cutaway simulation, visible production/collection loops, limited-power prioritization, SPECIAL-linked jobs, training, room upgrades, rushing, housing/recruitment, exploring outside, and hostile incidents. Sources consulted during the rebuild:

- [Fallout Shelter game and room references](https://fallout.fandom.com/wiki/Fallout_Shelter_rooms)
- [Fallout Shelter residents and SPECIAL](https://fallout.fandom.com/wiki/Vault_dwellers_(Fallout_Shelter))
- [Fallout Shelter in-game UI/help excerpts](https://fallout.fandom.com/wiki/Fallout_Shelter_localization)
- [Bethesda official gameplay help](https://help.bethesda.net/app/answers/detail/a_id/29959)

**Originality:** Fallout Shelter's source code, branded graphics, audio, proprietary visual assets and exact UI are not part of this project. We implemented familiar *genre systems* using new rules and original graphics.

## User-driven rules and this build

| Requirement | Implemented here | Remaining gap |
|---|---|---|
| Actual 2D cutaway that looks like a lived-in place | Detailed three-tile-high illustrated interiors, residents, machinery, lighting, debris, earth strata, city skyline and construction animation | Final 3D/depth and high-quality hand-authored animation art |
| Start with nothing built | Three survivors, hatch, tiny original access corridor, no constructed rooms | More cinematic introductory story |
| Physically excavate rooms | Player marks earth, real worker routes, hardness/depth, physical progress, deep collapse risk | Soil supports, complex rock physics and detailed collapse warnings |
| Build physically, no magic placements | Workers walk to rooms and finish actual build/upgrade/door/repair orders | Material hauling visuals |
| All facilities take power | Every room except generators draws electrical power; generator burns finite fuel; demand/supply/priority used | Fully laid-out pipe/wire material networks |
| Rations and water visibly go down | Single continuous simulation clock and tenths display plus per-minute rates | Complex nutrition recipes and logistics |
| Manage residents and acquire new ones | SPECIAL-like attributes, individuals/needs, shifts, training, assignments, medical care, equipment, arrivals, admission queue, housing capacity, family plans | Deeper personality system and dynamic social storytelling |
| Raider/feral threats and losing vault | Raiders route through actual cleared space, attack occupants, capture room, damage structures; defeat possible | Independently animated multi-unit tactics and enemy variety |
| Seal sectors ONLY if doors were built | Dedicated physically built blast-door chambers; real path blocking; power and air consequences | Complex ventilation bypass ducts and autonomous response presets |
| See captured areas depending on surveillance | Captured room obscures until a staffed powered security office provides visibility | Camera installation per individual room |
| Infection turns people feral | Infection exposure/progression, contagion requiring a route, treatment, quarantine wards, feral threats | Infection diagnostics and advanced stages |
| Cave-in rescues are physical | Victim air timer, manual rescuer project, conserve air/self-help, deaths if left trapped | Shoring alternate access and multi-stage digging |
| Scavenging not just a progress button | Real location selection, four visible room interiors per site, moving scavengers, search/salvage, encounters/retreat, limited loot and site persistence | Large free-roaming towns and sophisticated environmental puzzles |
| No overwhelming menus | Full-screen vault, small bottom toolbar/roster, hidden build tray, contextual inspector and optional one-next-step tutorial | Usability studies with real players |
| Don't confuse code passing with game quality | 37+ regression checks and explicit known gaps, separate from browser playtest | Real-device playtesting and final visual art direction |

## Overlap and softlock audit

- Replaced three competing engines with one \`model.js\`. No inactive v0.3 scripts are loaded.
- Unified hunger/water drains with stock-level rates and on-screen bars.
- Starting slots allow early basic facilities without prebuilding rooms.
- All construction is drawn and takes time. Material refunds return on cancellation of incomplete orders.
- Doors are physical objects and are impossible to close without first constructing them.
- Residents route through carved corridors and ladder shafts; closed blast doors and solid earth block paths.
- Electrical supply and room breathable air depend on actually connected routes. Captured-room monitoring requires a staff-operated powered security room.
- Trapped people can conserve oxygen or self-excavate (only with sufficient strength), but proper rescues need a route and manual work.
- Empty exploration locations stay empty; discovering new locations takes a scout trip. When starving, a high-risk survey remains possible, avoiding a resource softlock.
- Residents don't automatically consume extra whole food/water units outside the central economy tick.
- Workers rest and return to their previous projects rather than silently deleting tasks.
- Work teams detach from abandoned/finished jobs; deceased and striking residents are not automatically assigned to new work.
- Fire and infection don't magically cross sealed doors.
- A separate v4 localStorage save key protects previous alpha progress.

## Test scope

\`tests/vault-directive-v4.test.mjs\` covers progression, simulation, rendering, input boot and physical containment. Tests executed against the development branch with all cases passing at final source audit; review live browser separately.

**Important limitation:** Test mocks do not validate actual aesthetic quality, browser frame rate, all input-device edge cases or fun. A working logic model is not evidence of a complete 1:1 production game.

## What is not yet implemented

- All original Fallout Shelter game features, content, quests, currencies, helpers and collectible varieties.
- Fully individualized raiders and full quest combat navigation.
- True modeled 3D resident animations and fully authored textures.
- Spatial water/power pipes and security camera deployment into individual areas.
- Full diplomacy/promise-driven political factions and complex collapse reinforcement.
- Extensive balancing, accessibility and device-level visual QA.

These items must not be described as finished in release messaging.
