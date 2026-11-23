# VAULT DIRECTIVE — Foundation Alpha 0.1

A single-player, browser-native underground shelter-management game inside GAMESHUB.

## What is playable

- **Build from nothing.** A battered hatch, a short excavated access tunnel, three survivors, and limited starting supplies. There are **zero constructed rooms** at the beginning.
- **Real excavations.** Select **Excavate** and drag across solid, accessible earth. Choose actual named residents in the right panel. Each walks toward reachable ground and works through the tiles, with persistent partially dug progress and individual Strength affecting speed.
- **Flexible room widths.** Once a two-row area is excavated, select a building and drag across cleared space. Confirm the crew. The builder walks there and physically constructs the room. Available foundation rooms: field generator, sleeping quarters, water treatment, and hydroponics.
- **Resource economy.** Rations, water, salvage, components, room power supply/demand, basic production, automatic resident food/water consumption, rest breaks and morale/health indicators.
- **Interactive wasteland scavenging.** Send one or two available residents to an abandoned clinic, roadside station, or freight depot. Their movement and searches are represented in a side-view building scene: click individual rooms, wait for them to move there and search/salvage, then manually order them home with loot. Each room's loot is finite and stays depleted.
- **Optional tutorial.** Starts for brand-new saves, can be skipped, reopened from the left panel, doesn't lock controls, tracks tasks in any order, and draws an animated suggested excavation outline.
- **Local save.** Periodic, on-demand, on page-hide and on exit. Settings and progress stored in the browser using \`localStorage\`. New Game uses a custom in-game confirmation panel.
- **Camera.** Drag empty space to pan, mouse wheel to zoom, use W/A/S/D or arrows to pan, plus/minus to zoom, Space to pause. The in-game UI includes play speeds and quick camera controls.

## First-day loop

1. Inspect one of your three survivors (tap them in the world or right panel).
2. Pick **Excavate** and drag a 2-high area of dirt immediately right of the existing tunnel.
3. In the order inspector choose the excavators and press **Confirm & Assign Crew**.
4. When the space is cleared, select a room type on the left. Drag across the area to plan it, and assign builders.
5. Use **Open Wasteland Map** to choose a location and team. Search individual rooms, then return with finite supplies.

The game runs entirely on static assets under \`games/vault-directive/\`. No external JavaScript frameworks, external save APIs, or GAMESHUB account writes are required. Fonts have system fallbacks.

## Important development scope

This is the **first playable foundation**, not the complete finished VAULT DIRECTIVE discussed in design. The planned higher-level systems are *not yet simulated*: true 3D character rigs, custom corridors and vertical transportation, utility pipe/cable networks, advanced rescue/cave-ins, raids, blast-door lockdowns, full surveillance, infection/feral transformations, politics/strikes, and a full combat system. Those remain design commitments for subsequent milestones. The current visuals are bespoke **2D cutaway canvas illustrations**, not finished 3D models.

The first game is intentionally listed only under **IN DEV** on the GAMESHUB homepage.

## Testing

Run \`node --test tests/vault-directive-foundation.test.mjs\` from the repository root.

Tests verify initial empty world, manual excavation, terrain clearing, room building and resource costs, interactive site exploration and return of loot, and persisted site/work-order state.

For visual verification, load \`games/vault-directive/index.html\` in a modern browser or host it as part of the static site. Check mouse and touch interactions, zoom, modal close, long-running needs simulation and save/reload.

## Safe isolation

This addition has no dependencies on REDLINE, ILLEGAL CHESS, or GAMESHUB account logic, and does not modify their game files.
