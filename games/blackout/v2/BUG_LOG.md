# BLACKOUT 2.0 — Bug and Risk Log

The log starts with P0. A passing unit test is **not** a visual or multiplayer
acceptance. Never mark a bug fixed without a regression test and a human playtest
for observable issues.

## Confirmed bugs

| ID | First seen (ET) | Build/commit | Reproduction | Expected vs actual | Root cause | Risk | Status | Fix | Regression | Verified build |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | No P0 browser playtest completed yet | — | — | — | Awaiting playtest | — | — | — |

## Known P0 limitations and risks (not yet confirmed defects)

| ID | Concern | Severity | Mitigation / verification | Status |
| --- | --- | --- | --- | --- |
| RISK-001 | Browser rendering may differ on Chromebooks | High | Measure FPS and inspect textures, shadows and text at 1366×768 on actual Chromebook | Unverified |
| RISK-002 | Real 5v5 and co-op AI are not connected | Critical for multiplayer milestone | Build one authoritative shared match service, then test two real clients before expansion | Planned |
| RISK-003 | Prototype bot has basic navigation/combat only | High for eventual AI 5v5 | Pathfinding/LOS cover tests, individual behavior tests | Planned |
| RISK-004 | P0 timing is browser-local | High for multiplayer | Switch to server timestamps when implementing multiplayer; test interruption/overtime with two clients | Planned |
| RISK-005 | Menu art quality may exceed in-game presentation if changed later | Medium | Use identical operator mesh; card imagery generated from actual scene | Guarded |

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
