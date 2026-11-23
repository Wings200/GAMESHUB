# VAULT DIRECTIVE — Survival Alpha 0.3

VAULT DIRECTIVE is an original, browser-based post-apocalyptic underground survival simulation inside GAMESHUB. The player begins with an **abandoned access hatch, three survivors, limited salvage and no constructed rooms**.

The game is inspired by the broad resource/room/population management genre, but diverges strongly from Fallout Shelter through physical excavation and builder movement, manual rescue assignments, independent security doors, persistent scavenging sites, and player-defined work shifts. No Fallout assets or branding are copied.

## Start playing

Open \`/games/vault-directive/\`. The first-day tutorial is optional, does not restrict other actions, and highlights only the next task.

- **Inspect** a resident to learn their needs, skills, health and equipment.
- **Excavate** a two-tile-tall accessible stretch of earth and **assign a specific resident**. They walk there and physically clear it. Excavation progress is persistent.
- **Build** a generator in the cleared space. The builder physically reaches and constructs it; the facility starts with an idle emergency output and generates more when staffed. Generators consume fuel.
- Expand with **sleeping quarters** (beds), **water treatment** and **hydroponics**. Open advanced facilities when you're ready: medbay, radio beacon, security, storage, ventilation, training and workshop.
- **Open the Wasteland Map** to send scavengers into actual rooms at persistent locations. Choose search/salvage, fight or retreat if hostiles are present, and return home to unload finite supplies. Scouts can discover additional sites.
- **Manage residents** by assigning room jobs and shifts, boosting skills, treating health/infection, equipping defenders, welcoming refugees, or starting family plans in powered quarters.
- **Survive crises** including fires, vermin, fuel shortages, radiation-like infection, raider incursions and occupation, cave-ins, low oxygen, strikes, and possible total defeat. You can place physical blast doors, configure lockdowns, and order manual rescues.

## Controls

| Action | Control |
|---|---|
| Inspect/select | Click a person, room, work order or blast door |
| Excavate | Select Excavation, drag across accessible solid terrain |
| Build | Choose a facility, drag sideways across two rows of excavated space |
| Blast door / ladder | Choose tool, click a valid cleared corridor/shaft tile |
| Pan camera | Drag empty space with Inspect, or W/A/S/D and arrow keys |
| Zoom | Mouse wheel, plus/minus keys, on-screen plus/minus |
| Pause | Space or pause button |
| Select speed | 1×, 2× or 4× on the top bar |
| Save / tutorial | Buttons on left sidebar |

The original vault hatch is the first ladder. Additional shaft tiles require excavating and installing ladder segments. Rooms must connect to physically accessible passages; residents cannot walk through sealed blast doors.

## Resource mechanics

- **Power is a live supply/demand network.** Every non-generator room consumes electricity, including living quarters and storage, plus an essential entrance circuit. Generators burn finite fuel and gain output with skilled staff. Power priorities matter under deficit.
- **Food and water are continuous stock drains**, displayed to one decimal with per-minute net rates. Production requires powered rooms and staff with appropriate attributes.
- **Air quality** falls with poor power/ventilation; isolated sealed sectors also lose room air until routes reopen or they have powered air-handling capacity.
- **Materials** are gathered through actual scavenging/salvage and used in construction, door chambers, repairs, medical supplies and workshop recipes.
- **Room levels 1–3** can be improved by assigned builders; rushing staffed resource rooms accelerates production at calculated incident risk.

## Emergency controls

The Safety & Crises screen shows raiders, fires/vermin, captured/damaged rooms, door states, trapped residents, auto-lockdown, and ration/overtime policies. Select specific defenders, keep doors closed, repair breaches, assign rescue crews, and give trapped residents conserve-air/self-clear orders when appropriate.

## Population

Refugees wait at the hatch for your explicit approval. Capacity equals the initial three emergency spaces plus powered/constructed sleeping quarters. Radio staffing attracts additional people, rescuing civilians at the relay station brings people to the admission queue, and family plans can add dependent residents who grow into adult workers.

## Save and compatibility

The game saves locally in the browser every 14 seconds, on page-hide/exit and on demand. The New Game confirmation removes only the VAULT DIRECTIVE save. Version 1 foundation saves are migrated to v2 data fields on load without deleting the old settlement.

## Testing and limitations

Run \`node --test tests/vault-directive-foundation.test.mjs\` to exercise the real simulation in a mocked DOM/canvas harness. Syntax checks and tests are also configured in the GitHub workflow.

This is **an expanded playable survival alpha, not full feature parity or final visual quality**. Animated 3D residents, complete collapse/reinforcement systems, independent raider actors, very large campaign maps and extended quests remain planned. See [MECHANICS_AND_TEST_AUDIT.md](./MECHANICS_AND_TEST_AUDIT.md) for actual implemented features versus still-open scope.

All code remains isolated under \`games/vault-directive/\`, its test and workflow. REDLINE, ILLEGAL CHESS and other GAMESHUB games are untouched.
