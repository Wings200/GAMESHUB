# BLACKOUT V7.0 — Floor-Correct Defender Spawns & Round Selection

First V7 tactical-round iteration, October 19, 2026. Target: **Consolate + Clubhouse** with 1F A-B and 2F Archives / Operations, while preserving SWITCHYARD and Mechanics Lab.

## Fixed user-reported bug

The user-authored map has five developer-placed defender spawn markers at Y=0. Older `ObjectiveDrill.spawnBot()` also forced all CLUBHOUSE AI to Y=0, regardless of the chosen bomb pair, and the local defender's spawn selection read those same ground-floor markers. Selecting **2F Archives / Operations** therefore put the entire defense downstairs.

V7 now calculates spawn positions from the selected **site pair and each site's own Y elevation**, verifies genuine floor-slab support and free collision space at that level, and separates teammate insertions:

- Select **CONSOLATE + CLUBHOUSE** → **2F Archives / Operations** → **Defender** → **Defend Site A** (or B).
- Human defender starts at Y=4m near the focused objective.
- All four friendly AI start on the same 2F site pair, distributed between A and B, clear of permanent walls and each other.
- If playing attacker, the five enemy AI defenders set up around that same upstairs pair, not on ground level. Defender bot Y coordinates and actual 3D model positions both match the site elevation.
- The 1F A/B pair still spawns five defenders around ground floor objectives (Y=0). The authored ground-floor markers are no longer allowed to override an upstairs bomb site.
- **The original approved map JSON has not been edited.** Insertion positions are derived from the selected map objectives instead of rewriting the user's blueprints.
- Inserting at an unsupported upstairs coordinate is rejected; there is no deliberate teleport to Y=4 in empty air.

## Attacker and preparation integrity

- The user's existing drone-only prep system remains intact. No attacker bot meshes or shootable hitboxes exist during the 45-second prep phase. The local player is parked outside the world while operating the drone.
- Only when the round transitions to action do the four attacking AI and the local operator become physical bodies at exterior attacker insertion points.
- Defender prep still has physically existing, moving defenders who can reinforce/barricade the selected floor.
- Site pair selection and focus site A/B are presented on the loadout screen. Switching the selected pair resets the round before anyone deploys, avoiding teams prepared at obsolete coordinates.

## Current scope

- **This is offline tactical training (1 human + 9 AI), not networked 5v5.**
- Implemented: floor-correct defender team preparation/insertion, actual collision and floor checks, author map's 1F/2F site selection, and regression protection for phase-only attacker materialization.
- Next V7 tasks: site-vote flow for actual human teams once multiplayer exists, per-round side rotation/score screens, spawn-exposure and runout coverage, and more complete win-condition and defuse UX.
- Browser acceptance still matters, particularly inspecting the exact 2F loadout selection and spawn positions. Automated tests are not a substitute for on-device gameplay.

## Tests

`node --test games/blackout/tests/*.test.mjs` includes `tests/round-v7.test.mjs` and a real authored-map collision integration case in `tests/clubhouse-v6.test.mjs`: all five defender positions for each of the 1F and 2F A/B pairs must be on valid floor slabs, inside playable bounds, clear of wall collisions and separated from teammates. The original tests still ensure no attacker bodies during prep, and that action spawns don't duplicate.
