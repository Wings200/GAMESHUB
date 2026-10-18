# REDLINE V19 — Race Rewards, Daily & Weekly Challenges

## Rollout status

Frontend and server code are committed to `main`, **not proof of deployment**.
Cloudflare Pages serves the frontend. The REDLINE Multiplayer Worker runs from the root `worker.js` with `wrangler.json`, and must be deployed separately. Until Worker V18 is deployed the dealership intentionally displays **actual legacy prices** instead of higher frontend-only sticker prices. The wallet labels legacy rewards. When stats return `economyVersion:18`, the storefront and wallet switch to V18 display.

Deployment from repository root using an authorized Cloudflare account:
```sh
npx wrangler deploy --config wrangler.json
```
Do **not** create a new Worker or reset Durable Objects. This deploy updates the existing `redline-multiplayer` Worker in-place.

## Car prices

| Model | Legacy price | V18 price |
|---|---:|---:|
| REDLINE GT | $0 | $0 |
| VORTEX R | $0 | $0 |
| APEX S | $0 | $0 |
| BAYSIDE NX | $65 | $165 |
| AURORA RALLY | $85 | $245 |
| IRONCLAD 440 | $110 | $365 |
| CIRRUS GT | $160 | $550 |
| OBSIDIAN RS | $235 | $850 |
| PHANTOM XR | $380 | $1,250 |

All prices are whole **in-game** REDLINE dollars. The server imports the same canonical `car-catalog.js` and charges via authenticated transactional `purchaseCar`. No client-supplied price is trusted. Already purchased cars and old wallet balances are preserved. The three starter cars stay free. An older Worker still charges old prices and displays them accurately through a deliberate fallback.

## V18 base payouts (whole dollars)

| Entrants at countdown | 1st | 2nd | 3rd | 4th–8th |
|---:|---:|---:|---:|---:|
| Solo | $35 | — | — | — |
| 2 | $40 | $20 | — | — |
| 3 | $60 | $30 | $20 | — |
| 4 | $80 | $40 | $27 | $12 |
| 5 | $100 | $50 | $33 | $12 |
| 6 | $120 | $60 | $40 | $12 |
| 7 | $140 | $70 | $47 | $12 |
| 8 | $160 | $80 | $53 | $12 |

Formula: solo $35; multiplayer winner $20 per distinct entrant up to 8 ($160 max); second gets half; third gets one third, rounded; all other actual finishers $12.

### V19 daily and weekly challenges replace career milestones
The previous **+$60 every 5th finished race** payment and corresponding career progress HUD were retired. Past purchases, cash, race counts and best times remain unchanged.

V19 tracks three daily and three weekly challenges in each player's existing REDLINE Stats Durable Object. Challenges are awarded and saved in the **same transaction as the verified race finish and normal race payout**. The browser cannot submit or claim completion.

Daily challenges (reset midnight UTC):
- Finish 3 races — +$75.
- Improve an already saved track personal best by at least 2% — +$50.
- Finish 2 Neon District races — +$60.

Weekly challenges (reset Monday midnight UTC):
- Finish 15 races — +$350.
- Win 5 races, including solo wins — +$200.
- Finish 5 Arctic races — +$180.

One reward per challenge per reset period. Rewards auto-credit as soon as the server records the triggering verified race; no separate manual claim. Progress is per account and per UTC period. The read-only challenge board is available from the homepage and race car-selection screen. An empty or older player record starts at zero progress without migration or balance changes.

### Personal record bonus
**+$15** for the first valid completion on each course, or for a later finish at least **2% quicker** than that course's stored best before the current race. The normal stored best time still updates for *any* improvement; this 2% rule applies only to bonus money. One PB award max per completed race. Courses are tracked independently.

Challenge and personal-best bonuses stack with the base payout and are included in `cashEarned`. Results identify challenge rewards separately. The wallet's old milestone bar is removed, replaced by the V19 challenge board.

## Transaction and anti-duplicate rules

- Money and car ownership are server-owned; the browser cannot mint cash.
- The room captures distinct participant identities at countdown and the server computes placements. Only actual valid finishers receive cash.
- Race results, latest rewards and personal-best records commit inside the existing Durable Object storage transaction.
- Recent `raceId` suppression prevents paying a recorded race more than once. Duplicate account results inside one race are skipped.
- Legacy account records with absent `lastCashBreakdown`, `challenges`, or `lastChallengeAwards` remain readable; all new fields are optional/backward compatible. `challengeVersion:1` and `challenges` are read-only normalized response fields, while actual progress is stored server-side. `economyVersion:18` and `carPrices` remain backwards compatible.
- The server never recomputes old purchases and never adjusts or resets saved balances.

## QA

2026-10-17 source checks:
- JS parsing passed for the Worker, catalog, dealership, wallet and results.
- Payout arithmetic checked for 1–8 entrants, invalid sizes/places and rounding.
- Bonuses checked for first-course completion, 2%-improvement threshold, non-PB finishes and invalid times.
- V19 verified a six-challenge completion sequence, one-time award totals, daily UTC rollover, Monday UTC weekly rollover, and default zero progress for legacy accounts.
- The five-race milestone bonus and progress UI were removed. Existing racesFinished history remains intact.
- Confirmed old Worker/frontend coexistence uses legacy prices until V18 stats become available.
- These are **source and unit checks only**. Production Worker deployment, Cloudflare API response and a live end-to-end race/purchase must still be verified by a tester.

### Deployment
The frontend commits deploy to Pages. The root multiplayer `worker.js` and its `challenges.js` import **must also deploy to the existing REDLINE Worker**. Run from the repo root with authorized Cloudflare access:
```sh
npx wrangler deploy --config wrangler.json
```
Until that deploy, the challenge board explicitly shows that V19 isn't live. An older Worker may still have the old milestone payout enabled; removing it from the frontend alone does not remove an undeployed server rule.

### Future features
Personal ghost time trials, additional race formats, or rotating challenge pools are possible next features, but are **not** included in V19.
