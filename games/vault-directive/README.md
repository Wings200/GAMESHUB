# VAULT DIRECTIVE — Cutaway Reboot

**A new, original underground-survival game inside GAMESHUB.** It starts with an abandoned hatch, three named survivors, and a short passage. **There are zero built rooms at the beginning.**

This is a ground-up replacement of the previous prototype, with its own rendering system, controller, and simulation. The code and artwork are original. The Fallout Shelter cutaway style and broad gameplay systems inform this design, but Fallout Shelter assets, characters, interfaces, audio, and proprietary material have not been copied.

## Open and play

Visit \`/games/vault-directive/\`. Choose **Begin the First Day** and use the optional field guide. The old Alpha 0.3 browser save is retained under its original key; the reboot uses \`gameshub.vault-directive.cutaway.v4\`.

- **Inspect** a survivor. The roster along the bottom exposes each individual. You can click a survivor and click a room to assign them; the inspector also offers job assignments and work shifts.
- **Excavate** real dirt (including room ceilings and corridor floors). Click and drag a rectangular work zone beside the starting tunnel; a free resident is automatically assigned and must physically reach the site.
- **Build a generator** in a cleared, three-row chamber that is 3–6 tiles wide. Build jobs reserve real materials and require a moving builder. Assign a resident to increase production.
- **Construct water treatment and a canteen**, staff them, and collect ready production batches by clicking their floating icons. Food and water are always consumed by the population.
- **Grow the settlement** by building living quarters, welcoming refugees, and improving rooms.
- **Explore the wasteland** using the map: choose a real named location, assemble one or two available adults, wait for travel, then enter a four-room sectional building. Select specific rooms to search or salvage; if hostiles are present, fight or retreat. All loot is finite per location. Surveying discovers further unique locations without instantly awarding loot.
- **Survive security incidents**: raiders, feral infections, fires, infestations, deep cave-ins and rescue missions. Build real blast-door chambers between corridors; you may seal them manually to stop raiders, but that can cut electricity, access and fresh air. Staff a powered security room to monitor captured sectors. A powered quarantine ward can isolate an infected resident.
- **Manage your community** with individual attributes, level progression, morale, fuel, food, water, medicine, defensive equipment, shifts, training, upgrading, medical care, housing and family growth. All rooms except generators draw electricity; generators consume fuel.

## Controls

| Control | Effect |
|---|---|
| Click a resident | Inspect stats, health, assignment, gear, needs and shift |
| Select resident, then click room | Assign directly to that room |
| EXCAVATE + drag | Mark accessible solid ground for manual excavation |
| BUILD ROOM + select type + drag | Place a 3–6-wide room inside three rows of excavated space |
| LADDER + click | Add a segment vertically connected to an existing shaft |
| BLAST DOOR + click | Order construction of a secured corridor checkpoint |
| Click a built room | Inspect, collect output, assign crew, rush, upgrade, repair |
| Click a blast door | Manually close or reopen it; inspect durability |
| W/A/S/D or arrow keys | Pan camera |
| Wheel, +, − | Zoom camera |
| Space | Pause or resume |
| 1×, 2×, 4× | Adjust simulation speed |
| WASTELAND | Open the location map and active scavenging team |
| ⚙ Options | Save, tutorial, policies, reset confirmation |

**No browser confirm popups** are used for gameplay. The interface is inside the game. The field guide can be skipped, hidden and reopened without preventing free play.

## Architecture

- \`index.html\`: clean full-screen game shell
- \`v4.css\`: responsive in-world UI
- \`model.js\`: **single source of truth** for terrain, physics/pathfinding, power, resources, residents, jobs, quests, raids, incidents, rescues, scouting, arrivals and save data
- \`art.js\`: original 2D cutaway terrain, stylized room furnishings and people, illumination, machinery, dust, rubble, raids and construction rendering
- \`game-v4.js\`: user input, canvas camera, tutorial, roster, room inspector, modals, resource displays and save lifecycle
- \`tests/vault-directive-v4.test.mjs\`: regression coverage using the real simulation and a mocked canvas/DOM

Run from repo root:
\`\`\`bash
node --check games/vault-directive/model.js
node --check games/vault-directive/art.js
node --check games/vault-directive/game-v4.js
node --test tests/vault-directive-v4.test.mjs
\`\`\`

## Design differences and still-open work

The gameplay **is not a pixel-for-pixel or full 1:1 implementation of Fallout Shelter**. The simulation and procedural 2D art are original. Our physical digging, ladders, engineering projects, site-specific scavenging, rescue operations, and containment rules deliberately differ from that game.

The reboot covers a substantial playable first-to-middle-game slice, but extensive story quests, broad equipment inventory/crafting variety, fully independent raider actors, sophisticated faction politics, final 3D rigs/cinematic animations, mobile polish, audio, elaborate staged collapse engineering and long-form campaign balancing still need future development.

The included test harness checks logic and non-throwing renderer/controller behavior. It is **not a substitute for a real-browser visual playtest**, which remains necessary before claiming release-grade polish.

The previous Alpha 0.3 source is preserved at Git branch \`backup/vault-directive-alpha-0.3-before-reboot\`; other GAMESHUB games are untouched.
