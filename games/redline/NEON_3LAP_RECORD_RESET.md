# REDLINE — Neon District three-lap records reset

Date: October 18, 2026.

## Reason

Neon District race length was changed from 1 lap to 3 laps. Earlier one-lap leaderboard times are not comparable with new three-lap times. Players also have old one-lap personal-best data from their REDLINE accounts and local solo-ghost slots.

## Scope

- Official multiplayer/public leaderboard for map `neon`: **reset logically** by introducing `NEON_RECORD_RULES_VERSION=2` in `worker.js`. `getLeaderboard('neon')` returns only version-2 entries. The first new official Neon result replaces legacy leaderboard rows in durable storage. Other maps are unaffected.
- Online account personal best for Neon: old unversioned `bestTimes.neon` reads as null. The first eligible new Neon race finish stores a version-2 three-lap personal best, with `rulesVersion:2` and a timestamp. The old value is overwritten when that account finishes a race; accounts that never rerace retain the legacy value internally for rollback but it is not exposed.
- Solo `time-trial-core.js`: Neon saves to a new per-account/per-car browser key `neon-3laps-20261018` so previous one-lap ghosts never show as a new opponent, and new three-lap records can be set. Other map keys remain unchanged. Local legacy entries are retained for optional rollback.
- Deliberately preserved: Arctic and Nevada leaderboard and personal bests, global career `racesFinished`, global placement totals, achievements/challenges, race cash, purchased cars, upgrades and earned history. The shared career counters were historically not saved per map, so subtracting Neon-only history would be unsupported and unsafe.

## Deployment requirement

The public leaderboard and account stats are backed by the separate `redline-multiplayer` **Cloudflare Worker**, not the static Pages frontend. Committing `worker.js` is **not proof that the production Worker was deployed**. From the `Wings200/GAMESHUB` repository root, deploy the new Worker using an authenticated Wrangler setup (usually `npx wrangler deploy`) before expecting public Neon leaderboard data to reset. The frontend Pages update affects local browser Time Trial ghosts after deployment of Pages. Avoid administering or resetting all Durable Object storage—only the Neon era is intentionally invalidated.

## Tests

A mocked Cloudflare Durable Object storage test with two old Neon rows and a legacy Neon player record verified that old Neon top-10 entries become invisible and personal best becomes null; the existing Arctic and Nevada leaderboards and personal records remain visible, cash and car ownership survive, and the first new Neon result creates a fresh leaderboard time and saved personal best. A separate local ghost-key test verified that Neon legacy ghosts are ignored and a new 3-lap recording is saved; Arctic and Nevada storage keys remain exactly the same. The tests do not prove the remote Worker has been deployed.
