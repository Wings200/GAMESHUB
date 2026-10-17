# REDLINE ENGINE LAB — all cars unlocked / NO account effects

External URL after Pages deployment:
`https://redline-dnk.pages.dev/games/redline/engine-test.html`

This is a **separate route**. It shares REDLINE's real game.js, models, maps,
and physics, but **does not** use its live multiplayer page/controller, Worker
room WebSocket, wallet, dealership, account token, stats, or purchase scripts.

## Available features
- Nine catalog vehicles selectable for free, including all premium models.
- REDLINE factory specs/colors/models and handling, not a fake static showroom.
- Solo test drives on Neon District and Arctic (Canyon is disabled in main).
- **TEST DRIVE** launches 3D race from own mock local-only player data.
- In-race dropdowns **CAR**, **TRACK**, **RESTART TEST DRIVE**, and **TEST GARAGE**
  permit rapid experiments with no grinding.
- No genuine room code, online multiplayer, race rewards, cash changes,
  permanent garage unlocks, account or leaderboard writes.
- All test selections are ephemeral; the normal game retains its saved cars.
- Engine test has its own copy of audio.js with settings saving disabled.
- Engine bank for GT: built-in V15 real i6; all other cars: current V11.2
  placeholder (no dishonest "recorded V8" label without a real recording).
- Includes visible 'ENGINE LAB' labels so testers do not confuse it with main.

## Technical guarantees
The test page omits all seven account/multiplayer/money-adjacent scripts from
the normal page, including its inline multiplayer controller and entire Worker
API network calls. engine-test-controller.js has no WebSocket, fetch,
localStorage, sessionStorage or account-token handling. It creates a local
REDLINE_MP interface containing a single fake player, memory-only car ownership,
and NO-OP purchase/race state/finish methods.

## Test
1. Open separate URL above.
2. Confirm nine selectable cars and a big 'ENGINE TEST GARAGE' heading.
3. Choose IRONCLAD 440 (or a premium car), press **TEST DRIVE**.
4. Verify its real 3D model and high speed physics appear.
5. Use in-race **CAR** dropdown to select PHANTOM XR, then **RESTART TEST DRIVE**.
6. Use **TEST GARAGE** and choose Arctic; relaunch.
7. Open original REDLINE and verify actual garage cash, ownership, and rank
   have not changed.
8. GT should use real V15 when production `redline-gt-v15-audio.bank` exists.
   Every other model currently plays V11.2 until new licensed recordings arrive.

Note: GitHub commits were code-checked, but live Pages gameplay requires a
real browser check after deployment. Do not claim end-to-end verified yet.
