# REDLINE — Neon District V3 engineering review

**Scope:** Neon-only track geography, drivable grades, canal, bridge geometry, city streets, surface rendering, environment collision and performance. The multiplayer Worker, Durable Objects, accounts, stats and leaderboard systems were **not changed**.

## Pass 1 — Road geography and elevations
- Closed loop: approximately **1,737 m** using 26 control points, 520 drivable samples and 16 ordered checkpoints.
- Canal runs north-south between world **X=127** and **X=213**, and has **two distinct bridge crossings**.
- North crossing road elevation: approximately **7.5–12.0 m** over water.
- South crossing road elevation: approximately **7.4–12.0 m** over water.
- Measured maximum grade: approximately **11.8%**. Both uphill and downhill stretches are present.
- Maximum adjacent sampled road gap: approximately **3.34 m**.
- Removed minor negative Catmull-Rom undershoot so otherwise flat city streets cannot sink below the local ground.

## Pass 2 — Bridge and canal scene-build test
- Built the waterfront and raised-road module with a mock Three.js runtime using Neon V3 control points.
- Verified **105 elevated deck sample spans**, built in **four GPU-instanced structural material batches**.
- Verified **210 continuous guardrail spans** and **12 structural support piers**, distributed across north and south.
- Verified **8 dock/warehouse collider registrations**, vertical quay walls and normal-mapped animated canal water.
- Vehicle bridge deck is real supporting geometry *under* the actual graded drivable road ribbon.

## Pass 3 — Neighborhood/backdrop collision and visual placement
- Tested city-block generation with the real route coordinates in a mock rendering context.
- Created **379 neighborhood building instances** and **327 distant towers**.
- Registered **706 distant/secondary building footprints** for collision.
- **Zero** secondary buildings appear in the carved shipping channel.
- Nearest secondary-building centerline distance to the race course: about **25.8 m**.
- Removed the thin, repetitive gray "street lot" slabs and the giant translucent ground glow; grid roads are instead clipped at the quay.
- Moved actual glTF buildings from the deep background to visible trackside sites, reserving their footprints among the procedural structures.

## Pass 4 — Five simulated road traversals
The 520-sample route was numerically traversed five times at lateral offsets of **−3.1 m, −1.5 m, 0 m, +1.5 m and +3.1 m**. Simulated car height was compared against interpolated bridge/road Y at each point.

| Traverse | Lane offset | Max height discrepancy | Discontinuities over 0.45 m |
| --- | --- | --- | --- |
| 1 | −3.1 m | 0.075 m | 0 |
| 2 | −1.5 m | 0.036 m | 0 |
| 3 | 0 m | 0.000 m | 0 |
| 4 | +1.5 m | 0.081 m | 0 |
| 5 | +3.1 m | 0.167 m | 0 |

The water-edge height lookup returns **−0.40 m** where the car is off the elevated roadway. Falling into the shipping canal triggers a return to the last checkpoint. Jump landing, drifting, boost and pickup height checks now distinguish elevated roadway from ground/water.

## Pass 5 — Syntax, compatibility and regressions
- `game.js`, `neon-art.js`, `neon-infrastructure.js` and the browser multiplayer script all parsed successfully.
- Worker SHA remains the known-good **`2082a7502cf9b453685f913b739f2da9b17d9ce5`**.
- Multiplayer room source SHA remains **`269af83b5b219cc33ca445e1d72fd37fa7fc7c2d`**.
- The Three.js loader import map and Arctic mountain cave shortcut were preserved.
- World objects that require elevated Y include road, curb, road markings, lights, checkpoints, obstacles, boosts, pickups, camera, collision barriers and the local player.

**Important limitation:** The five traversals are **numerical/simulated checks**, not five real browser playthroughs or a screenshot-based visual review. The map **must still be tested interactively** for final visual judgment, camera comfort, road surface quality, performance and multiplayer with two players. These checks reduce risks but do not establish that the map is perfect.
