# REDLINE MOTOR COMPANY — dealership and personal garage

## Vehicles and pricing

Three original starter cars remain **permanently free** for both new players and old accounts, preserving compatibility with previously selected cars and multiplayer ghosts.

| Vehicle | Type | Cost (virtual race cash) |
|---|---|---:|
| REDLINE GT | Balanced sport coupe | Free |
| VORTEX R | High-speed supercar | Free |
| APEX S | Agile track coupe | Free |
| BAYSIDE NX | Tuned street coupe | $65 |
| AURORA RALLY | Rally-inspired AWD coupe | $85 |
| IRONCLAD 440 | Classic V8 muscle | $110 |
| CIRRUS GT | Long-distance grand tourer | $160 |
| OBSIDIAN RS | Mid-engine track supercar | $235 |
| PHANTOM XR | Experimental hypercar | $380 |

All names and 3D models are original REDLINE creations inspired by general real-world vehicle categories, without using licensed vehicle branding or third-party models.

The `car-catalog.js` module defines the exact vehicle physics, prices, starter list, model IDs, and server-supported IDs. `dealer-models.js` builds six distinct authored THREE.js body designs with different roof profiles, wheelbases, wings and visual details; `game.js` uses those models for local and multiplayer ghost cars.

## Purchases and ownership

`worker.js` exposes **POST `/api/dealership/purchase`** with `{accountToken,carId}`. The account ID comes only from REDLINE's existing token verification. A `RedlineStats` Durable Object transaction:

1. Verifies the car is a paid catalog item and the authenticated account does not already own it.
2. Checks the actual saved cash balance against the **server-defined** price.
3. Debits the wallet, records the car's permanent ownership, updates lifetime car spending, and saves the selected car in the same transaction.

Duplicate purchases of owned cars fail. Insufficient funds and invalid IDs fail without charging. Older profiles get three free starter cars automatically. Owned vehicles, last selected car, `cashBalance`, `cashSpentOnCars`, and existing performance upgrades all live in the same existing account storage.

The **WebSocket `select_car` message also verifies permanent ownership on the server** before updating the player's room car. On pressing Ready, the Worker checks the owned car again and loads the already-existing server-verified performance-upgrade loadout. Never accept a claimed price, balance, or owned car from the browser.

## Website

- `dealership.js` shows the car catalog, live wallet, each car's four driving-stat bars, vehicle preview, Buy/Select buttons, and **MY CARS** filter.
- Purchased cars appear in the existing car-select grid, using delegated selection click handlers. The usual multiplayer Ready, ghost rendering, countdown, finish, and reward flows remain unchanged.
- The last selected, owned car can be restored automatically on entering a new car-selection round.
- New car body shapes remain visible even when changing color via the previous cosmetic editor; existing base cars retain their existing body appearance options.
- Shared paid engine/brake/tire upgrades still apply across owned vehicles; cars have different *base* physics before those parts.
- The catalog is immediately usable for free starter cars. Buying the first additional car takes $65 in virtual race cash, or 13 solo $5 wins (fewer in multiplayer).

## Testing

- 15 backend account and room tests: valid wallet deductions, insufficient funds, duplicate purchases, invalid IDs, ownership on saved account, guest/legacy defaults, price/account forgery rejection, server-validated selection, and Ready on purchased cars.
- 12 original model-construction checks: six unique vehicles each build with four wheels, head/tail lamps, nitro flames, and custom geometry.
- Browser-side simulated dealership test: nine showroom items, starter selector state, authenticated wallet display, purchase, new selectable card, room selection message, cash update, and My Cars filter.
- JavaScript parsing/regression checks for game, Worker, modules, and existing in-page scripts.

**Live testing is still needed:** Cloudflare Pages and Worker must auto-deploy the new main-branch commits. Try purchasing a car, selecting it, starting an Arctic or Neon race, then refresh and check the purchase remains. Actual frame rate, 3D aesthetics and multiple-client sync are not proven by static/simulated tests.
