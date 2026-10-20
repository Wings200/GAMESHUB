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

---

## V7.1 — Tactical Match Series, Side Switching & Spawn-peek Mitigation

The single-player tactical match is a **first-to-four, maximum seven-round offline series**. The scoreboard tracks **YOUR SQUAD vs. OPPOSING AI** regardless of which side is attacking.

- After **Round 3**, the next round automatically switches your operator's team between attack and defense. All accompanying AI team affiliations, selected default operator and attacker-drone/defender-setup states are rebuilt for the new side. The user confirms advancing by pressing **Enter** on the round result overlay; pressing **Esc** still opens the menu.
- If the score reaches 3–3, **Round 7** is a tiebreaker with the side rotated back to the starting side. The match ends as soon as either side earns four wins. **Enter** on the final match result starts a new series with a fresh scoreboard.
- The intermission overlay shows **ROUND VICTORY/DEFEAT**, persistent squad score, completed-round W/L pips, and explicit next-round side. The compact in-game HUD also labels the score as **YOU vs. AI** so it remains meaningful through halftime.
- Training configuration changes—manual side selection, a new map, a different site pair, or the Reset Training Round button—start a fresh match series. The author-approved original maps and physical site geometry remain untouched.

### Anti-spawn-peek logic

- **Attackers do not physically exist during preparation**. Physical local/AI attacker bodies appear only at the action transition, preserving the existing drone-phase rule.
- For the first **2.3 seconds** after action begins, an attacking operator within **3m** of their *real exterior insertion point* is protected from defender gunfire. This applies to both human and attacking AI targets and checks the actual action timestamp. The grace period ends early when an attacker fires or moves out of the insertion radius; it never applies to defenders or later in the round.
- The protection is a **temporary offline safety rule**, not a networking/anti-cheat replacement. Full multiplayer will require authoritative spawn and damage validation rather than trusting a browser client.
- Existing defender runout detection remains in place.

### Verification

`tests/match-v71.test.mjs` covers first-to-four scoring, duplicate-result rejection, halftime side rotation, 3–3 decider, final-match resets, action-only temporary insertion safety and gameplay/HUD wiring. All original movement, 1F/2F defender positions, bomb setup, AI, drones and weapon regression suites remain active.

**Known limits:** The round summary is keyboard driven with Enter while in pointer-lock play; match scoreboard and side rotations are local training only. Live browser testing is still necessary, especially for side swapping mid-session.
