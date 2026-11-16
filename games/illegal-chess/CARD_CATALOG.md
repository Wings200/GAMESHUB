# Illegal Chess — approved card catalog (26)

This records the original 26 approved concepts. Keep gameplay rules stable while adding server-side checks and UI. A card must **not** enter random draws unless the server implements it and it has tests.

## Live gameplay cards (21)

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

## Wave 2 semantics

- **Insurance Fraud:** Spend a turn protecting your non-king piece for two enemy turns. The marker is visible to both players; capture freezes the capturing piece for its next turn. The marker follows normal piece movement.
- **Prisoner Exchange:** Spend a turn returning one actually lost pawn per color to its earliest empty original pawn square. Each side benefits. Promotions do not count as lost pawns.
- **Relocation Order:** Choose a normally legal capture of an enemy non-king piece, then pick an empty original starting square of that piece. Your attacker stays put. The server excludes king-unsafe destinations.

## Wave 3 semantics

- **Delayed En Passant (Uncommon):** Bonus card to restore the legal en-passant capture on the next opportunity after missing the standard chance. The eligible pawn, adjacent capturing pawn and passed-through square must remain valid. The bonus expires after this turn; no unlimited en passant.
- **Promotion Recall (Rare):** As a pawn reaches its final rank, consume the card to remove that pawn and revive a genuinely captured friendly knight, bishop or rook on an empty original home square; this replaces the ordinary promotion.
- **Time Capsule (Epic):** Bonus action before an ordinary non-promotion move of your chosen non-king piece. The origin is visible to both players. On your next turn you can spend the turn returning that same surviving piece to its empty origin if your king remains safe, or decline and let the marker expire.

## Approved gameplay cards still awaiting implementation (4)

- **Identity Theft (Epic):** select two friendly non-king pieces; swap their *appearances only* for the opponent's next turn. Real movement/attack rules never change.
- **Objection!:** reaction to an opponent card activation, canceling that card's activation. The opponent retains their card and continues with a normal move. Requires on-page multiplayer reaction handling.
- **Classified Promotion:** the promoted piece is disguised as pawn/? for the opponent until it moves, captures, checks, or is captured. Its real identity stays hidden on the server and never leaks through allowed-move lists/UI.
- **Counterfeit (Legendary):** after opponent plays a non-reaction card, copy that ability for your following turn. The copied ability consumes Counterfeit's card slot/use and must be played instead of a normal move; if unusable, expires. No choosing which opposing ability to copy.

## Separate next milestone: The Analyst (26th card)

**The Analyst — Legendary, passive.** Grade both players' moves as **Book, Best, Excellent, Good, Inaccuracy, Mistake, Blunder, Brilliant**. The evaluator must include card hands, active effects, concealed information, off-board sniper rays, the two-shot teleport and the 20-turn control swaps. Ordinary Stockfish scores alone are not valid ground truth for card positions. Implement *after* the other gameplay cards so the full ruleset can be simulated consistently.

## Release discipline

- Keep each player session's secret cards/hidden effects server-authoritative; never leak them in an opponent's view.
- Add legality, turn-count and edge-case tests per card before enabling it in random hands.
- All confirmations and reactions stay in the GAMESHUB interface, never browser alert/prompt/confirm.
- Playtest two real browsers, including the instant post-swap turn and card ownership.
