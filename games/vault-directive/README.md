# VAULT DIRECTIVE: BELOW THE SURFACE — Rebuilt 1.1

A new, original, single-player underground settlement simulation for GAMESHUB. The two older prototypes were retired, not incorporated. The active game lives at /games/vault-directive/ and appears exclusively in the IN DEV filter.

## Original art / inspiration

This is an original underground cutaway game. It shares general simulation conventions with other shelter-management games but does NOT reproduce Bethesda's Fallout Shelter art, characters, audio, interface, dialogue, exact room layouts, or proprietary content. All rooms, residents, textures, and sprites use original HTML/CSS artwork; the game does not rely on Canvas rendering.

## Playable game systems

- Begin with one hatch and visible on-screen Overseer. No resources, no residents, no prebuilt rooms or income.
- SCAVENGE five surface locations. Farther sites are riskier; scavenging takes time and yields real supplies.
- DIG connected dirt, producing stone and research. Unsupported deep tunnels can cave in.
- SUPPORT tunnels with physical timber frames; research stone arches and steel shoring.
- BUILD two-tile rooms on reinforced, accessible foundations. Living quarters, power reactors, hydroponic gardens, water purifiers, storage, common rooms, medical wards and security posts.
- LIFT shafts access deeper floors.
- VISITORS randomly appear and knock. Review skills, backstory, traits and health; optional background checks can return inaccurate information.
- Assign residents to rooms. Residents have skills, hunger, thirst, health, mood, energy and loyalty. Day/night shifts change room activity.
- Staffed production rooms produce clickable power, food and water resource yields. Settlers consume supplies and can die permanently.
- Weapons, armor, security posts and automatic raid responses. Severe low loyalty may result in rebel recruitment.
- A tech tree unlocks new room and tunnel designs rather than instantly upgrading existing buildings.
- A guided first-time tutorial, auto-save, pause, 1-3x speed, zoom, in-game dialogs and event journal.
- New localStorage save key: gameshub-vault-directive-rebuild-v3. Previous saves are not automatically loaded.


## Upgrade 1.1 — Routine, UI, exploration and tutorial repair pass

- **Resident location and work share one authoritative routine:** A day-shift worker actually goes to bed at night, and a night-shift worker sleeps by day. Neither produces resources while asleep. Sick people visit medical facilities, diners take meal breaks, and guards wake up for alarms.
- **One resident = one on-screen sprite.** Persistent sprite nodes follow actual walkable paths between the hatch, rooms and lifts. No duplicate character in a bedroom and workplace at the same time, no diagonal travel through intact dirt.
- **Staffing understands emergencies and blocked corridors.** If a cave-in cuts the corridor to a room, it stops functioning until the route is restored.
- **An explorable overworld map** shows five original locations. Your Overseer marker travels from the hatch to the site, searches, and returns, with three visible expedition phases and salvage reports. Materials are not delivered instantly on button click.
- **Dedicated panels** for GUIDE, BUILD, PEOPLE, SUPPLIES, EXPLORE, SECURITY, RESEARCH and EVENTS. Build cards are condensed and context-specific; the resource HUD is simpler, sidebar scroll position stays put, and stable DOM prevents constant sprite/room animation restarts.
- **A persistent tutorial coach** gives a contextual objective and SHOW ME action during the first eight steps. It can be hidden and restored.
- **Cafeteria** added as an optional staffed room for staggered meals and morale improvement.
- **Additional fixes:** Clicking an existing room with REMOVE now actually dismantles it; production harvest no longer disappears at storage capacity; residents will not take an impossible food break if no food exists; shift/pause buttons stay in sync; first-time visitor click is actionable.
- **Regression coverage:** simulation, routing, sleep, night shifts, illness, emergency responses, multiple-stage expeditions, storage caps, visual DOM click-through, demolition and panel navigation.

The 1.1 update preserves the existing version-3 save format and does not erase old progress.

## First 7 actions
1. SCAVENGE Deadwood Grove.
2. DIG two neighboring bays right of the hatch.
3. Install one TIMBER SUPPORT in the excavation.
4. BUILD Living Quarters by clicking the left tile.
5. Admit the survivor who approaches your hatch.
6. Dig, reinforce and build Power, Food and Water facilities.
7. Assign people to work and collect resources by clicking glowing bubbles over productive rooms.

## Future expansion, not part of Rebuilt 1.0

A finished full-sized title would still need deeper AI locomotion, social relationships, faction diplomacy, tactical room-by-room raids, richer inventories and illnesses, full rebellion/exile/reconquest systems, original sound design, and considerably more art polish. This release is a playable systems foundation, not a content-complete copy of another game.

## Smoke tests

Run: node --test tests/vault-directive.test.mjs tests/vault-directive-ui.test.mjs tests/vault-directive-routines.test.mjs tests/public-library.test.mjs

The app is static: index.html + style.css + core.js + game.js. The retired Alpha 0.2 and Foundations versions remain recoverable through Git history rather than current site files.
