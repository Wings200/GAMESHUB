# REDLINE Garage V4 — Per-car performance and Ready-safe selection

## New layout

The standard car-select screen is intentionally short: race cash, selected car
name, **GO TO GARAGE**, and the original server-verified **LOCK IN** button.

GO TO GARAGE opens a full-height scrollable overlay containing the owned-car
selector, four car-stat bars, the nine-car dealership, six performance part
categories, and the visual appearance editor. **BACK TO RACE** closes it.
A Ready acknowledgement, countdown or race phase also closes the overlay.

## Independent car parts

The Worker saves `carUpgrades[carId]={owned,equipped}`, not one shared garage.
Each vehicle has its own six categories. Each category supports Stock (0),
Street (1), Sport (2), and Race (3). Prices and nonlinear performance effects
still come from `upgrade-parts.js`. Cars have distinct base physics, so they
have different possible **max top speed, acceleration, grip, handling**, even
when each has all six Race-tier parts.

The two garage API calls now include the targeted `carId`:
- `POST /api/garage/purchase` with accountToken, carId and category.
- `POST /api/garage/equip` with accountToken, carId, category and tier.

Purchases check server-verified account identity, permanent car ownership,
server price, available funds and sequential tier ownership transactionally.
Equipping an unowned tier is denied. An unowned car cannot be upgraded.
The client disables the purchase controls until the upgraded Worker returns
a `carUpgrades` map from `/api/stats/me`.

**Previous purchases:** the legacy shared paid `garage` record migrates to the
previously saved `carGarage.selected` car on the first following server write.
Other cars start at Stock. This prevents old purchases being erased while
also preventing one set of paid parts being cloned to nine vehicles for free.
The first write persists `carUpgrades`, so changing cars cannot reassign them.

On multiplayer Ready, `player.upgrades` is created exclusively from the
chosen car's saved, server-validated equipment tiers; the existing physics
engine uses that signed-in-room snapshot without trusting browser-selected
parts. Mid-race purchase or equip changes cannot alter an existing race
loadout.

## Release checklist

Deploy Worker and Pages from the same main branch version.

1. Use a legacy account with paid upgrades; verify those upgrades exist only
   on the last-selected owned vehicle, even after switching away and back.
2. Buy a car, customize and upgrade it, switch to an old owned car and verify
   it has separate parts.
3. Reject inadequate wallet funds, unowned cars, invalid IDs, out-of-order
   purchase tiers and unowned equip tiers.
4. Open and close Garage in a multiplayer room; lock in on two different
   accounts and verify the correct 3D model / per-car physics loadout.
5. Refresh browser after buying and verify ownership, equipment and cash persist.
6. Confirm overlay scrolling on a mobile viewport and that countdown closes it.

Static parsing checks and simulated Durable Object transaction tests have been
performed; live production browser/race/deployment checks are still required.

## V4 multiplayer Ready safety (October 16, 2026)

- The Worker initializes every racer with their last saved **owned** car during
  `start_car_select`. The free GT is the safe fallback when profile lookup is
  temporarily unavailable. Players do not start with `car:null`.
- A compatibility one-shot GT selector request is retained for older Worker
  deployments that still send `car:null`. It does not fire if the server has
  already selected a car, and never locally marks a player Ready.
- The multiplayer controller tracks `pendingCarSelection` until room_state
  confirms the requested car. Ready remains disabled while changing cars.
  Error responses clear the pending state and show the server error rather
  than leaving the UI incorrectly marked LOCKED IN.
- Legacy cosmetic editor code no longer writes `lockInBtn.disabled` or changes
  the Ready label. The multiplayer controller exclusively controls Ready.
- All account-backed per-car upgrade purchase checks remain in place, and a
  missing `carUpgrades` property on older Workers disables upgrades safely
  without blocking a race.

### Verification

- Simulated 2-player Worker race flow: 14/14 assertions passed, including
  saved-car default, GT fallback, unowned selection rejection, both Ready
  events, countdown after everyone Ready, and per-car loadout isolation.
- Simulated purchased-car transactions: 16/16 assertions passed in V3,
  including legacy upgrade migration, isolated car purchases, ownership and
  cash validation. V4 did not change these transaction methods.
- Browser source checks and Ready acknowledgement simulation: 28/28 passed
  before adding the backward-compatible GT fallback. A fresh final parse and
  source check should be completed before promoting this branch to main.
- Real Cloudflare Worker deployment, client browser view, and two actual
  human-operated racers must still be tested after release. The Worker and
  Cloudflare Pages may have separate deployment pipelines.
