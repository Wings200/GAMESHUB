# REDLINE Garage connection recovery (Worker version 8)

## Identified from the October 16 screen recording

The website loaded the Garage, but the cash HUD showed **Balance unavailable**,
the dealership showed **Garage unavailable: Failed to fetch**, and the upgrade
shop showed **Could not load upgrades: Failed to fetch**. These are network /
backend failures, not evidence of lost wallet money.

The original frontend sent separate cross-origin, authenticated POST requests
for the wallet, dealership and six-part upgrade shop. Cloudflare Pages and the
REDLINE Multiplayer Worker may be deployed independently; the website can
load while the Worker is unavailable or on an older release.

## Safeguards implemented

- Account requests prefer the new SAME-ORIGIN Pages Function:
  `/api/redline/api/stats/me`, `/api/redline/api/garage/purchase`,
  `/api/redline/api/garage/equip`, and
  `/api/redline/api/dealership/purchase`. The function forwards to the
  REDLINE Worker via optional **REDLINE_WORKER** Pages service binding
  (preferred) or the existing published Worker endpoint (fallback).
- If Pages cannot reach the Worker, the relay sends useful JSON 503 errors
  instead of a browser's generic `TypeError: Failed to fetch`. Read-only stats
  can also fall back to the original direct Worker when the relay is unavailable.
- All three widgets share a deduplicated in-flight account-stats read and a
  short cache. Completing a purchase invalidates the shared cache.
- Mutating purchases are NEVER transparently retried, because a network error
  after the Worker receives an upgrade request could otherwise double-charge
  for the next tier.
- The Garage overlay displays explicit Online / Offline messaging and a
  **RETRY CONNECTION** control.
- The Worker wraps account-storage failures in safe JSON errors (no stack trace).
  A temporary stats outage allows Ready with any of the three permanently
  free starter vehicles at STOCK performance. Purchased vehicles and paid parts
  are NEVER assumed owned while the account storage is offline.
- The selected race vehicle label changes only after a trusted multiplayer
  room_state confirms the vehicle. Local clicks cannot falsely confirm it.

## Required deployment / smoke test

**Deploy BOTH services**. A GitHub commit may auto-deploy Cloudflare Pages,
but it does not by itself guarantee the separate Worker was deployed.

1. Deploy the root Worker using the existing `wrangler.json`, e.g. from the
   repository root: `npx wrangler deploy --config wrangler.json`. This must
   be done from a trusted environment with Cloudflare access.
2. Deploy the Pages website from this same commit.
3. Prefer configuring a Cloudflare Pages service binding named
   `REDLINE_WORKER` targeting the `redline-multiplayer` Worker. The relay
   also has a fallback to the public workers.dev address when unbound.
4. Check `https://redline-multiplayer.guestuseonly0173.workers.dev/health`.
   It must return JSON with `version:8` and `features.perCarGarage:true`.
5. While signed into GAMESHUB, open
   `https://redline-dnk.pages.dev/api/redline/health`. This same-site
   route must also return Worker health JSON. An HTML response or JSON 503
   indicates a Pages routing or upstream Worker connectivity problem.
6. Open REDLINE, enter a car-selection room, open GO TO GARAGE. The banner
   should be Online, showing real cash. Purchase a part for one owned vehicle,
   switch vehicles, verify that other vehicle remains stock.
7. Test a race with two browsers: both Ready, countdown only when both
   confirmed. Test Garage downtime against the three stock starter cars.

## Test scope

- Worker two-player Ready tests and per-car isolation passed in previous
  release (14/14) plus stock-starter fallback outage tests (9/9).
- Frontend API fallback / deduplication tests (7/7) and same-origin relay
  allowlist / JSON errors (5/5) passed in simulations.
- Live Cloudflare routing, Pages service binding, and real internet reachability
  cannot be verified through GitHub. These require a production smoke test.
