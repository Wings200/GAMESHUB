# REDLINE V20 — Solo Time Trial & Personal Best Ghost

## Rollout
Normal game URL: https://redline-dnk.pages.dev/games/redline/index.html

Frontend-only feature; commits on `main` deploy through the existing Cloudflare Pages pipeline. **No Worker deployment or Durable Object migration is needed.** Normal room multiplayer is unchanged.

## How to play
1. On the REDLINE homepage choose **TIME TRIAL · RACE YOUR GHOST**.
2. Pick Neon District or Arctic, and choose one of your genuinely owned cars. The normal account stats API supplies owned cars and that car's equipped upgrades. If account storage can't be reached, the three free starter cars remain available without online rewards.
3. Start the Time Trial. Same map, three laps, car handling and factory 3D model as online racing, but **no lobby and no room creation**.
4. Finish once to create a personal ghost for that account/car/map on the current browser. On later attempts the ghost follows your exact recorded course path and shows a live **ahead/behind** time comparison based on checkpoint-course progress.
5. Press **G** or use the visible checkbox to hide/show the non-colliding ghost.
6. On finishing, see the time and whether a new PB was recorded, then race again or go home.
7. **EXIT SOLO RUN** aborts the attempt cleanly and never saves a partial run.

## Design
- `time-trial-core.js`: pure validated car/track/account-specific record storage, 100ms trace interpolation and time comparison.
- `time-trial.js`: solo modal, account-owned car selection, upgrade configuration, read-only official race leaderboard, replay settings, result overlay, and local save.
- `game.js`: uses original world, physics, checkpoints and factory vehicles; chooses a local countdown and never sends a multiplayer finish in solo mode; records 3D position/rotation/progress, builds one low-detail translucent non-colliding ghost, draws every frame but computes expensive progress time delta at only 5 Hz.
- `index.html` and `style.css`: time-trial entry point, ghost controls, and responsive HUD.

## Exact server and privacy boundaries
- Time Trials **never** submit race finishes to the Worker, award credits, fulfill daily/weekly challenges, or update the official server rankings.
- Personal ghosts are stored in browser localStorage under a key scoped to the account ID, map ID, and car ID. A different account using that computer has its own ghosts. The data is not sent to REDLINE or another service.
- The Time Trial menu also displays the **existing official race leaderboard for each map** via its public read-only endpoint. That leaderboard is clearly labeled as the existing server-verified multiplayer racing leaderboard, **not a Time Trial leaderboard**.
- If browser storage is disabled, solo driving still functions but results cannot persist.
- No guest can unlock paid cars in multiplayer; time trial only uses server-confirmed owned car IDs, with starter fallback on stats failures.
- Ghosts are purely visual. They are never registered for collisions, checkpoints, car-to-car physics, or Worker WebSockets.
- No changes to `worker.js`, user wallets, cars, account identity, or garage upgrades were required.

## Limits and future improvements
- Personal-best ghosts remain on that one browser/device. Clearing site data erases them. Cloud-synced ghosts would require a new authenticated server endpoint, explicit data retention policy, and anti-cheat evaluation.
- Existing leaderboard records are for server-verified multiplayer races. A separate verified Time Trial leaderboard is not included, since accepting client-submitted elapsed times without server validation would make rankings trivially cheat-able.
- Runs over 13 minutes or invalid/oversized recordings do not overwrite prior local bests.
- The V20 source has been statically validated and replay/storage functions unit-tested; user browser playback and track completion still require live manual testing.

## QA checklist
- Open solo mode directly from home without joining a room.
- Verify only owned cars appear, including purchased cars if signed in.
- Run Neon in GT, finish and see NEW PERSONAL BEST.
- Retry and observe translucent saved GT ghost (with G toggle).
- Check red/green delta sign when ahead/behind ghost.
- Exit mid-race: physics and engine audio stop, old personal best unchanged.
- Finish slower: local best unchanged. Finish faster: ghost replaced.
- Change map/car/account: no ghost leakage across selections.
- Normal multiplayer room payouts, daily/weekly challenges, and upgrades remain unchanged.
