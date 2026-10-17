# REDLINE V5 — Factory Cars and Distinct Performance

## Design intent

The car you buy is the **exact vehicle you race**, including the correct body,
factory color, 3D parts, handling and per-car upgrade levels.

- Removed the old local appearance/paint/body editor (`garage.js`) entirely.
- Removed client-side `localStorage` cosmetic overrides in `game.js`.
- Race-car meshes are created from `REDLINE_CAR_CATALOG[confirmedRoomCar].spec`.
- Other racers (ghost cars) use the server-confirmed `player.car` and the
  same factory model, instead of trusting a cosmetic appearance packet.
- The Garage, dealership, Ready/Lock In, cash, server purchases, and independent
  0–3 upgrade tiers remain intact.

## Factory vehicles — original prices unchanged

| Vehicle | Cash | Factory speed cap | Specialty |
|---|---:|---:|---|
| REDLINE GT | Free | 123 mph | Starter all-rounder |
| VORTEX R | Free | 157 mph | Fast on straights, less corner grip |
| APEX S | Free | 113 mph | Starter agility |
| BAYSIDE NX | $65 | 137 mph | Tuner launch and street drift |
| AURORA RALLY | $85 | 130 mph | Outstanding rally grip, braking and elevated body |
| IRONCLAD 440 | $110 | 159 mph | V8-style surge and long straight speed, heavy handling |
| CIRRUS GT | $160 | 169 mph | Balanced fast grand tourer |
| OBSIDIAN RS | $235 | 186 mph | High-acceleration, high-grip GT track special |
| PHANTOM XR | $380 | 211 mph | Fast flagship hypercar |

Factory caps are the simulation's `spec.topSpeed * 2.45`, rounded,
not guarantees for every track/road surface. Nitro/boost caps are higher.
Each car has an individual `softLimiterStart`; transmission upgrades
scale that **car's** base threshold rather than overwriting it at 42.

Factory model differences now include street-tuner aero and exhausts,
rally roof gear and bullbar, muscle-car supercharger and raised haunches,
grand-tourer glasshouse and chrome, dual-plane track aero, and hypercar
central fin/twin channels. Dealership cards have differentiated silhouettes,
backdrops, specialty descriptions, and numeric factory performance.

## Upgrade persistence and multiplayer safety

Prices and ownership IDs were not changed. Existing purchases, account cash,
vehicle ownership, equipped tiers and race stats persist. Per-car part upgrades
continue to use the server's saved `carUpgrades[carId]` state.

No `worker.js` or Worker API changes were required for this update. A Pages
deployment updates client models and physics, while an existing deployed Worker
still validates room car ownership and purchase prices unchanged.

## Verification

- Source/integration checks: 43/43 passed (script parsing, owned-car mappings,
  unchanged IDs/prices, original visual specs, upgrade isolation, Ready logic).
- Dedicated model-build checks: 13/13 passed (all six paid models generate meshes,
  four wheels, lighting, boost effects and mutually distinct geometry).
- A basic one-dimensional 12-second straight-line simulation indicates the
  more expensive speed-focused cars have meaningfully higher reachable speeds,
  while AURORA's advantages are traction and braking, not outright speed.
- Live Cloudflare deploy, visual quality on a Chromebook and real two-player
  racing still require checking in the published website.

Note: `garage.js` remains recoverable through Git history; it is no longer
loaded or present in the current source tree.
