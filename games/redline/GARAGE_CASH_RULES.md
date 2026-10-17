# REDLINE Garage Cash Economy

## Prize table (whole dollars)

| Racers at race start | 1st | 2nd | 3rd | 4th–8th |
|---:|---:|---:|---:|---:|
| 1 | $5 | — | — | — |
| 2 | $20 | $10 | — | — |
| 3 | $30 | $15 | $10 | — |
| 4 | $40 | $20 | $13 | $5 |
| 5 | $50 | $25 | $17 | $5 |
| 6 | $60 | $30 | $20 | $5 |
| 7 | $70 | $35 | $23 | $5 |
| 8 | $80 | $40 | $27 | $5 |

Payouts are rounded to the **nearest whole dollar** with JavaScript `Math.round`.

## Award rules

- The count of distinct account identities is captured when the server starts the race countdown, not after disconnections.
- Only actual race finishers earn a reward. Ranks 4–8 get the flat $5 finish reward.
- The server computes the awards from its own finishing order and captured entrant count; clients cannot supply a cash amount.
- Winnings are stored per account ID inside the existing `RedlineStats` Durable Object. Cash and race records commit in a single Durable Object storage transaction.
- Duplicate `raceId` recordings are ignored. The same account cannot collect two placements from one race.
- Historical stats are backward-compatible (missing wallet fields default to zero).
- The results screen displays confirmed awards, while the live car-selection screen fetches the server-confirmed balance using the established account token handshake.
- Cash is **currency for the future cosmetics store**, not real money or a payout in real-world dollars.
- **Prices and purchasing are not implemented yet**, because item prices have not been specified. Existing race physics, cosmetic prototypes, and multiplayer lobby remain unchanged.

## Deployment note

`index.html`, `cash-wallet.js`, `style.css`, `results.js`, and related frontend files publish with Cloudflare Pages. The backend cash award logic is in the top-level `worker.js`, configured by the root `wrangler.json`. It must be separately deployed to the REDLINE Multiplayer Worker (for example, `npx wrangler deploy --config wrangler.json` from the repository root) unless the Worker has an automatic deployment pipeline.

**Do not claim real cash earnings are live until both the Pages frontend and the Worker are on the new version.** Earlier Worker versions do not return wallet fields or grant prizes.

## Verification

- 18 focused Worker award/account tests passed: eight race-size brackets, invalid input, 8-player awards, account persistence, same-race duplicate suppression, solo/duo updates, account uniqueness, and historical-account migration.
- 12 simulated end-to-end checks passed: server room completion, placement order, wallet credit, saved results, results broadcast, duplicate completion suppression, live car-selector binding, authentication bridge, and JavaScript parsing.
- Actual production Cloudflare Worker and Pages integration cannot be tested by static code checks.
