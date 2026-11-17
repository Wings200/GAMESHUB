# Illegal Chess — approved card catalog (26)

This records the original 26 approved concepts. Keep gameplay rules stable while adding server-side checks and UI. A card must **not** enter random draws unless the server implements it and it has tests.

## Live gameplay cards (25) + final passive Legendary (1)

| Card | Rarity | Status |
|---|---|---|
| Pawn Sidestep | Common | Live |
| Voluntary Eviction | Common | Live |
| Colorblind Bishop | Uncommon | Live |
| Knight Exchange | Uncommon | Live |
| Parking Ticket | Rare | Live |
| Bishop Sniper | Epic | Live |
| Reserved Parking | Rare | Live |
| Ceasefire | Rare | Live |
| Double KO | Epic | Live |
| Hit and Run | Epic | Live |
| Queen's Abdication | Epic | Live |
| Black Market | Legendary | Live |
| Pawn Ram | Common | Implemented in wave 1 |
| Friendly Fire | Uncommon | Implemented in wave 1 |
| Pawn Strike | Rare | Live |
| Insurance Fraud | Uncommon | Live (wave 2) |
| Prisoner Exchange | Uncommon | Live (wave 2) |
| Relocation Order | Epic | Live (wave 2) |
| Delayed En Passant | Uncommon | Live (wave 3) |
| Promotion Recall | Rare | Live (wave 3) |
| Time Capsule | Epic | Live (wave 3) |
| Identity Theft | Epic | Live (wave 4) |
| Objection! | Rare | Live (wave 4) |
| Classified Promotion | Rare | Live (wave 4) |
| Counterfeit | Legendary | Live (wave 4) |
| The Analyst | Legendary | Live · passive (Alpha 0.7) |

## Wave 2 semantics

- **Insurance Fraud:** Spend a turn protecting your non-king piece for two enemy turns. The marker is visible to both players; capture freezes the capturing piece for its next turn. The marker follows normal piece movement.
- **Prisoner Exchange:** Spend a turn returning one actually lost pawn per color to its earliest empty original pawn square. Each side benefits. Promotions do not count as lost pawns.
- **Relocation Order:** Choose a normally legal capture of an enemy non-king piece, then pick an empty original starting square of that piece. Your attacker stays put. The server excludes king-unsafe destinations.

## Wave 3 semantics

- **Delayed En Passant (Uncommon):** Bonus card to restore the legal en-passant capture on the next opportunity after missing the standard chance. The eligible pawn, adjacent capturing pawn and passed-through square must remain valid. The bonus expires after this turn; no unlimited en passant.
- **Promotion Recall (Rare):** As a pawn reaches its final rank, consume the card to remove that pawn and revive a genuinely captured friendly knight, bishop or rook on an empty original home square; this replaces the ordinary promotion.
- **Time Capsule (Epic):** Bonus action before an ordinary non-promotion move of your chosen non-king piece. The origin is visible to both players. On your next turn you can spend the turn returning that same surviving piece to its empty origin if your king remains safe, or decline and let the marker expire.

## Wave 4 semantics — the last four gameplay cards

- **Identity Theft (Epic):** Select two friendly non-king pieces to exchange their *appearances only* for the opponent's next completed turn. Their authentic chess movement and attacks never change, and the server exposes only an apparent board to the defender.
- **Objection! (Rare):** Automatically offers an in-game reaction window when the opponent attempts a valid card. **Object** cancels the card without using it and forces the acting player to make a normal move. **Allow** commits the pending card once. The private card parameters are not sent to the defender.
- **Classified Promotion (Rare):** Bonus action only when a legal pawn promotion is immediately possible. The next move must promote the pawn, and its real type stays server-only while the opposing viewer sees a disguised pawn. The disguise ends as soon as the piece moves, captures, gives check or is captured.
- **Counterfeit (Legendary):** On your next turn after the opponent uses a nonreaction card, select Counterfeit to perform *that same card's ability* using your own choices and card. The copy costs an entire turn even when the original is a bonus action. It expires after your turn; unusable abilities cannot be copied. Copying Counterfeit or Objection! is disallowed.

## The Analyst — 26th card · upgraded Alpha 0.8 (Stockfish 19 lite)

The server's early heuristic move grades have been retired. **Normal chess moves are evaluated locally using Stockfish 19 lite**, with two UCI root searches (best move vs. played move) and a circular on-board icon displayed for one second after evaluation. Both browsers use the same engine implementation; results can differ slightly due to search time/hardware. Analysis history is derived from server-recorded board snapshots only when all active rules are representable in standard chess.

**Custom card moves, hidden information, off-board snipers and other active variant effects are labeled Custom Rule**, rather than made-up Stockfish grades. The user's private card selections/hidden pieces are never included in the Stockfish analysis payload.

All feedback icons echo the reference's black-rimmed colored circles. The icon legend includes Brilliant, Great Move, Best Move, Excellent, Good, Book Move, Inaccuracy, Mistake, Blunder and Missed Win. The first release does not award Brilliant or Great without sufficient tactical evidence: these labels are presented in the visual legend only.

The actual Stockfish.js 19.0.1 lite single-threaded JavaScript+WebAssembly files are proxied unmodified, via allowed same-origin GET requests, from the pinned jsDelivr npm package and loaded into a browser Web Worker. No engine computations run on the D1 game server. The assets are **GPL-3.0 licensed**; source: https://github.com/nmrugg/stockfish.js (and https://github.com/official-stockfish/Stockfish). The engine requires a network connection for first download. When unavailable, the UI says Stockfish Unavailable and **does not substitute heuristic grades**.

## The Analyst — 26th card · shipped Alpha 0.7

**The Analyst (Legendary, passive)** stays visible in its owner's hand and activates automatically without being spent. If either player holds an unspent Analyst, **both players' completed turns** receive a public, persisted, server-authored approximate grade: **Book, Best, Excellent, Good, Inaccuracy, Mistake, Blunder, Brilliant**. The in-match panel shows the latest grade and recent history. There is an optional private test-room mode that guarantees the Analyst in both players' hands; ordinary weighted draws still apply in normal matches.

**Important scope:** This first release uses a bounded, transparent *heuristic*; it is not Stockfish and not a mathematical proof of the optimal move. It compares true server-valid ordinary moves and sniper shots, weighs current card resources and active modifiers, king safety and the 20-turn swap, then looks ahead one immediate normal chess reply. Exotic card actions are reflected through board outcomes and card/effect values but are **not exhaustively enumerated as hypothetical alternatives**, so grades are estimates rather than definitive judgments. Grades never contain a private target or hidden sniper diagonal in their explanatory text. Objection reactions and standalone bonus actions are not scored until a completed turn exists.

## Release discipline

- Keep each player session's secret cards/hidden effects server-authoritative; never leak them in an opponent's view.
- Add legality, turn-count and edge-case tests per card before enabling it in random hands.
- All confirmations and reactions stay in the GAMESHUB interface, never browser alert/prompt/confirm.
- Playtest two real browsers, including the instant post-swap turn and card ownership.

## Alpha 0.9 · strongest practical browser engine

Official **Stockfish 19** is the latest stable release as of November 16, 2026. The
Analyst now prioritizes the **full-size NNUE Stockfish 19 single-threaded WASM**
bundle (about 94 MB for both files). It evaluates the engine-preferred root move
and the actually played move from the same standard-chess position, with deeper,
max-strength, approximately 2.2-second per-candidate UCI searches (depth cap 24).
The full-size NNUE evaluation network is significantly stronger than the small
Lite neural network used in Alpha 0.8.

The full engine loads through pinned 19.0.1 jsDelivr worker shim first;
a pinned Cloudflare Pages proxy and unpkg direct import provide two more full
NNUE choices. If the large full engine fails due to network, memory, or device
limits, the game falls back to Stockfish 19 Lite, then ASM.js. The review
shows which tier actually evaluated the move and **does not mislabel Lite as
Full NNUE**. Both players still receive chess-only reviews; special cards,
concealed positions, and off-board snipers cannot be meaningfully evaluated by
standard Stockfish and are labeled Custom Rule.

This does *not* automatically reproduce Chess.com's proprietary move grades,
or magically understand the card rules. Search time and browser hardware affect
move accuracy. Multi-threaded Stockfish requires cross-origin isolation; we use
full single-threaded to avoid interfering with GAMESHUB's other resources.
