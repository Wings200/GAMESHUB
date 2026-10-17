# REDLINE Garage V2 — Earnable Performance Parts

## What changed

REDLINE no longer uses free 16-point allocations to determine speed or handling.

Players start with their chosen base car (stock). A permanent garage shop lets players purchase sequential levels of six part categories using the virtual race cash already awarded and saved by `RedlineStats`.

| Category | Street | Sport | Race | In-game effect |
|---|---:|---:|---:|---|
| Engine | $25 | $60 | $130 | +7.5% acceleration per level |
| Turbo | $40 | $90 | $185 | +4.5% nitro speed / +7.5% nitro acceleration per level |
| Transmission | $30 | $70 | $150 | +5.5% top speed and reduced drag per level |
| Suspension | $25 | $60 | $125 | +5.5% steering and high-speed stability per level |
| Brakes | $20 | $50 | $110 | +11% braking per level |
| Tires | $20 | $55 | $120 | +7% grip and mild drift-control gains per level |

*Each listed price is the cost to buy that level, not cumulative. Stock is free. Street, Sport and Race must be purchased in order. All performance formulas are in `upgrade-parts.js`.*

## Server-authoritative economy

- `worker.js` imports `games/redline/upgrade-parts.js` (the same catalog imported by the web client).
- POST `/api/garage/purchase` accepts `{accountToken,category}`. The signed-in/guest user's ID is derived from the server-verified token, never trusted from request body.
- POST `/api/garage/equip` accepts `{accountToken,category,tier}`. Only already owned levels 0–3 can be equipped. Switching back to stock costs nothing and does not refund previously bought parts.
- `RedlineStats` Durable Object transactions atomically validate ownership, tier, wallet balance and prices, then persist purchases to the account record.
- `/api/stats/me` returns `stats.garage={owned,equipped}`, `cashBalance` and `cashSpentTotal`; old accounts default to stock with zero spending.
- The frontend does not store wallet balances or upgrade ownership locally.
- Part ownership is currently account-wide, shared when you change cars. Each car still retains its original stock handling characteristics.

## Multiplayer and physics integrity

- At `ready`, the multiplayer room reads `getPlayerStats(player.accountId)` from the STATS Durable Object and snapshots the owned, equipped tiers into `player.upgrades`. This verified loadout is included with public player room state.
- `game.js` uses **only** that locked `myPlayer.upgrades` to create `activeCarSpec` through `applyCarUpgrades()`. Upgrades affect real acceleration, top speed, turbo nitro speed/force, steering, grip, drag and braking in the existing physics loop.
- Local `garage.js` and `garage-physics.js` cannot increase performance with free stats. Cosmetic paint/body controls stay available and use the preexisting visual-only network appearance path.
- Changing parts after pressing Ready cannot change the locked race spec. Purchasing between races can be equipped for the next race.
- The server protects purchases and loadout ownership. The existing movement simulation remains client-based; this is **not** a full server-authoritative racing anti-cheat implementation.

## Testing notes

- 19 headless upgrade checks passed: tier prices, insufficient cash, tier progression, equip/revert, old-account migration, permanent ownership, real car physics changes, code parsing and multiplayer integration.
- 5 server Ready-event checks passed: trusted equipment lookup, rejection of forged tier claims, room-state export, reverting invalid equipment to stock, and no mid-race re-ready changes.
- 5 HTTP API tests passed: token-backed purchases ignoring spoofed account/price/tier, rejecting unowned equipment, free re-equip to stock, and account-isolated deductions.
- Production browser visuals, mobile scrolling, multiplayer races, and real Cloudflare auto-deployment require player playtesting.

## Deployment

The existing Cloudflare auto-deployment must include both the Pages frontend and the root multiplayer Worker. The Worker imports the new parts catalog from `games/redline/upgrade-parts.js`. Until the new Worker is deployed, purchase endpoints will not exist.
