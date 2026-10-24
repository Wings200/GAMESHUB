# BLACKOUT 2.0 — Bug and Risk Log

The log starts with P0. A passing unit test is **not** a visual or multiplayer
acceptance. Mark fixes as **Fixed — unverified** until a human browser playtest
validates the repair, and reopen anything that recurs.

## Confirmed bugs

| ID | First seen (ET) | Build/commit | Reproduction | Expected vs actual | Root cause | Risk | Status | Fix | Regression | Verified build |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BUG-001 | 2026-10-24 ET | V2 P0 | Click once to fire after entering action; ammo stays at 30 | First click fires and costs 1 round; actual only requested pointer lock | Early `return` after `requestPointerLock()` prevented shot | Critical | Fixed — unverified | First click requests lock **and** triggers shooting; hold-to-auto-fire also added | `combat.test.mjs` click/fire/ammo tests; browser pending | P0.1 candidate |
| BUG-002 | 2026-10-24 ET | V2 P0 | Fire/reload and observe lifeless block gun | Visible recoil, muzzle flash, shells and reload; none rendered | V2 created a static primitive weapon and unused `flash` state | High | Fixed — unverified | Reuse original V1 BX-7 model and animation module | Import/dependency checks; visual QA pending | P0.1 candidate |
| BUG-003 | 2026-10-24 ET | V2 P0 | Testing mode has nothing alive to shoot | Damageable practice target | Enter-game code intentionally hid the only bot | High | Fixed — unverified | Target stays alive, cannot shoot back, respawns after defeat | Source review; browser pending | P0.1 candidate |
| BUG-004 | 2026-10-24 ET | V2 P0 | Bot moves toward A as defender; can cross solid geometry | AI observes collisions | Defender bot position updated directly without `_move` | High | Fixed — unverified | Defender movement uses shared collision resolver | Source review; browser pending | P0.1 candidate |
| BUG-005 | 2026-10-24 ET | V2 P0 | Hold F to plant/defuse; only progress bar changes | Player kneels and interacts with animated physical device | V2 rendered no bomb interaction model or sound | High | Fixed — unverified | Reuse V1 hinged defuser/typing and counter-defuse tablet, original foley and timed postplant beeps | Asset existence confirmed; browser/timing pending | P0.1 candidate |
| BUG-006 | 2026-10-24 ET | V2 P0 | Defender presses F by wall in action phase, no prompt | Defender may reinforce during action | Interaction gate limited to prep only | Medium | Fixed — unverified | Permit reinforcement in prep or action | Source review; browser pending | P0.1 candidate |
| BUG-007 | 2026-10-24 ET | V2 P0 | Operators remain rigid while moving | Visible walking and idle motion | Operator limbs lacked articulated joints | High | Fixed — unverified | Basic limb pivot animation, weapon sway/bob | Visual QA pending; quality below final target | P0.1 candidate |
| BUG-008 | 2026-10-24 ET | V2 P0 | Finish a round and wait | Automatic next operator selection, first to 4 | Result screen only offers manual restart; score model counts sides | High | Open | Requires team-based score and 7-round flow | None | — |
| BUG-009 | 2026-10-24 ET | V2 P0 | Compare live V1 and V2 maps, menu and operators | At least V1 presentation quality | V2 was built as sparse low-poly replacement | Critical | Open | Dedicated visual art and UX milestone, compare side-by-side on browser and Chromebook | None | — |
| BUG-010 | 2026-10-24 ET | V2 P0 | Reinforce a wall next to an already-reinforced wall | Nearest available wall gets reinforced; no fake prompt | `reinforceClosest` could choose an already reinforced wall while `nearWall` used a different eligibility check | Medium | Fixed — unverified | Both paths ignore reinforced/exterior-ineligible walls | Source review; browser pending | P0.1 candidate |
| BUG-011 | 2026-10-24 ET | V2 P0 | Die as attacker after planting; camera remains on corpse | Spectate an active subject while defuser continues | Spectator mode reused dead player coordinates | Medium | Fixed — unverified | Spectator camera now follows surviving defender/defuser | Source review; browser pending | P0.1 candidate |

## Known P0 limitations and risks (not yet confirmed defects)

| ID | Concern | Severity | Mitigation / verification | Status |
| --- | --- | --- | --- | --- |
| RISK-001 | Browser rendering may differ on Chromebooks | High | Measure FPS and inspect textures, shadows and text at 1366×768 on actual Chromebook | Unverified |
| RISK-002 | Real 5v5 and co-op AI are not connected | Critical for multiplayer milestone | Build one authoritative shared match service, then test two real clients before expansion | Planned |
| RISK-003 | Prototype bot has basic navigation/combat only | High for eventual AI 5v5 | Pathfinding/LOS cover tests, individual behavior tests | Planned |
| RISK-004 | P0 timing is browser-local | High for multiplayer | Switch to server timestamps when implementing multiplayer; test interruption/overtime with two clients | Planned |
| RISK-005 | Menu art quality may exceed in-game presentation if changed later | Medium | Use identical operator mesh; card imagery generated from actual scene | Guarded |
| RISK-006 | V1 reused graphics/audio modules may regress V2 on low-end devices | Medium | Measure first-person FPS and asset load on real Chromebook; keep V1 unchanged | Pending playtest |
| RISK-007 | Missing 5v5, custom match and real remote drone synchronization | Critical for full game | Shared server match state, one code path per feature across modes; test with 2 then 10 clients | Not implemented |

## New issue template

```
ID: BUG-00X
Date/time (America/New_York):
Build/commit:
Device/browser:
Mode/phase:
Steps to reproduce:
Expected:
Actual:
Frequency:
Severity: Critical / High / Medium / Low
Affected systems:
Suspected cause (clearly label as hypothesis):
Confirmed root cause:
Fix commit:
Regression test:
Verification performed by/when:
Verified build:
Status: Open / Investigating / Fixed-Unverified / Verified / Reopened
```

Recovery requires a known-good Git commit/tag or deployment version. The log
alone cannot roll back code. Preserve BLACKOUT 1.0 and never force-update main.
