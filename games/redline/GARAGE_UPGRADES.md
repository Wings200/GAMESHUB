# REDLINE Garage V2 — Earnable Performance Parts

## Current behavior (V18.1)

**Upgrade ownership is per car.** Prices now scale with the vehicle class and certain specialty parts; tiers and performance remain unchanged. An older Worker still sells parts at its historical base prices, and the garage recognizes the new pricing only when account stats return `upgradePriceVersion: 2`. Already-owned upgrades are never revoked or charged again.

## What changed

REDLINE no longer uses free 16-point allocations to determine speed or handling.

Players start with their chosen base car (stock). A permanent garage shop lets players purchase sequential levels of six part categories using the virtual race cash already awarded and saved by `RedlineStats`.

| Category | Base Street | Base Sport | Base Race | In-game effect |
|---|---:|---:|---:|---|
| Engine | $25 | $60 | $130 | +7.5% acceleration per level |
| Turbo | $40 | $90 | $185 | +4.5% nitro speed / +7.5% nitro acceleration per level |
| Transmission | $30 | $70 | $150 | +5.5% top speed and reduced drag per level |
| Suspension | $25 | $60 | $125 | +5.5% steering and high-speed stability per level |
| Brakes | $20 | $50 | $110 | +11% braking per level |
| Tires | $20 | $55 | $120 | +7% grip and mild drift-control gains per level |

*The table above is the original **base-price** schedule (unchanged on older Workers and for GT). Other car classes use the V18.1 multipliers below. Each price buys one sequential tier, not the cumulative total. Stock is free; Street, Sport and Race must be purchased in order. Performance formulas are in `upgrade-parts.js`.*

## Server-authoritative economy

- `worker.js` imports `games/redline/upgrade-parts.js` (the same catalog imported by the web client).
- POST `/api/garage/purchase` accepts `{accountToken,carId,category}`. The signed-in/guest user's ID is derived from the server-verified token, never trusted from request body.
- POST `/api/garage/equip` accepts `{accountToken,carId,category,tier}`. Only already owned levels 0–3 can be equipped. Switching back to stock costs nothing and does not refund previously bought parts.
- `RedlineStats` Durable Object transactions atomically validate ownership, tier, wallet balance and prices, then persist purchases to the account record.
- Account stats return `carUpgrades[carId]={owned,equipped}`, `cashBalance` and `cashSpentTotal`. Old accounts migrate prior upgrade ownership to their originally selected car once; no purchases are lost.
- The frontend does not store wallet balances or upgrade ownership locally.
- Part ownership is **per car**. Purchasing Sport tires for IRONCLAD does not grant them on PHANTOM. Every car also retains its own factory handling profile.

## Multiplayer and physics integrity

- At `ready`, the multiplayer room reads `getPlayerStats(player.accountId)` from the STATS Durable Object and snapshots the owned, equipped tiers into `player.upgrades`. This verified loadout is included with public player room state.
- `game.js` uses **only** that locked `myPlayer.upgrades` to create `activeCarSpec` through `applyCarUpgrades()`. Upgrades affect real acceleration, top speed, turbo nitro speed/force, steering, grip, drag and braking in the existing physics loop.
- Local `garage.js` and `garage-physics.js` cannot increase performance with free stats. Cosmetic paint/body controls stay available and use the preexisting visual-only network appearance path.
- Changing parts after pressing Ready cannot change the locked race spec. Purchasing between races can be equipped for the next race.
- The server protects purchases and loadout ownership. The existing movement simulation remains client-based; this is **not** a full server-authoritative racing anti-cheat implementation.

## Tier rebalancing and visible comparison (2026-10-16)

Each category now has **nonlinear, diminishing-return** bonuses. Street provides the biggest initial step, Sport adds another noticeable boost, and Race finishes the build with a smaller step. The original nonlinear-tuning update preserved the historical cash prices at that time. V18.1 changes only the cost of **future** part purchases on a newly deployed Worker and never charges for parts already owned.

| Upgrade | Street | Sport | Race | Primary effect |
|---|---:|---:|---:|---|
| Engine | +11% | +20% | +27% | Forward acceleration (reverse power also benefits) |
| Turbo | +12% | +21% | +28% | Boost top speed, nitro speed and thrust |
| Transmission | +7% | +13% | +18% | Top-speed cap and scaled high-speed resistance |
| Suspension | +9% | +16% | +22% | Steering and high-speed handling |
| Brakes | +12% | +21% | +29% | Stopping force and reverse response |
| Tires | +10% | +18% | +24% | Cornering grip and controlled drifting |

Percentages above are primary bonuses over **stock** and not additive purchase-by-purchase. Secondary bonuses vary by metric (see `UPGRADE_TUNING` and `UPGRADE_METRICS` in `upgrade-parts.js`).

The garage shows **current equipped vs hovered/focused preview tier** for each category using the same `applyCarUpgrades` physics formula used by the game. Each upgrade lists two exact numerical metrics, the percentage gained/lost from the current setup, and installed/target progress bars. Car selections trigger live preview recalculation for all nine cars. Unaffordable and still-locked tiers can be previewed without purchasing. Cash balance, ownership and purchase authorization remain controlled by the Worker.

The original physics had a fixed 42-unit high-speed resistance threshold; this previously limited the felt benefit of transmission upgrades. Now it scales with paid transmission tiers and remains precisely 42 for stock, without altering the underlying car physics for non-upgraded players.

## Testing notes

- 19 headless upgrade checks passed: tier prices, insufficient cash, tier progression, equip/revert, old-account migration, permanent ownership, real car physics changes, code parsing and multiplayer integration.
- 5 server Ready-event checks passed: trusted equipment lookup, rejection of forged tier claims, room-state export, reverting invalid equipment to stock, and no mid-race re-ready changes.
- 5 HTTP API tests passed: token-backed purchases ignoring spoofed account/price/tier, rejecting unowned equipment, free re-equip to stock, and account-isolated deductions.
- Production browser visuals, mobile scrolling, multiplayer races, and real Cloudflare auto-deployment require player playtesting.

## Deployment

Cloudflare Pages publishes the frontend, while the root `worker.js` must be deployed **separately** using `npx wrangler deploy --config wrangler.json` from the repository root, unless an existing Worker CI workflow does that automatically. The server reads the shared catalog in `games/redline/upgrade-parts.js`. Until V18.1 Worker deployment, old upgrade prices remain visible and purchases continue at the older Worker prices.

## V18.1 vehicle-dependent upgrade pricing (2026-10-17)

Every car retains its existing upgrade categories and performance boost percentages. Base part costs are multiplied by a vehicle factor, with extra specialty modifiers for particular car/category pairs (e.g., IRONCLAD engine, BAYSIDE turbo, PHANTOM boost and transmission). The result is rounded to the nearest $5. There are no retroactive charges, no reset, and no change to upgrade physics.

| Car | Vehicle baseline multiplier | Street engine | Race engine | All six categories through Race |
|---|---:|---:|---:|---:|
| REDLINE GT | 1.00× | $25 | $130 | $1,365 |
| VORTEX R | 1.15× | $30 | $150 | $1,615 |
| APEX S | 1.05× | $25 | $135 | $1,470 |
| BAYSIDE NX | 1.20× | $30 | $155 | $1,690 |
| AURORA RALLY | 1.30× | $35 | $170 | $1,815 |
| IRONCLAD 440 | 1.40× | $40 | $210 | $1,970 |
| CIRRUS GT | 1.55× | $40 | $200 | $2,155 |
| OBSIDIAN RS | 1.75× | $50 | $250 | $2,475 |
| PHANTOM XR | 2.00× | $55 | $290 | $2,910 |

The all-max cost is the sum of every Street, Sport and Race purchase across all six categories for one car. The detailed actual prices are calculated by `upgradePrice(category,tier,carId)`.

**Server-authoritative rollout:** The Worker reports `upgradePriceVersion: 2` with verified account stats; until then the upgrade shop uses the two-argument historical `upgradePrice(category,tier)` so displayed prices match the still-running old Worker. Never trust amounts from browser requests. Car upgrades already owned remain in `carUpgrades[carId]`, and current user balances are not modified by deploying new pricing.

**Tests:** Checked all nine cars × six categories × three paid tiers; validated whole-$5 costs, monotonic pricing, legacy fallback compatibility, JS parser validity and Worker/server price parity. Live production deployment and in-browser purchases require follow-up testing.
