# Illegal Chess — approved card catalog (26)

This records the original 26 approved concepts. Keep gameplay rules stable while adding server-side checks and UI. A card must **not** enter random draws unless the server implements it and it has tests.

## Live gameplay cards (18)

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

## Wave 2 semantics

- **Insurance Fraud:** Spend a turn protecting your non-king piece for two enemy turns. The marker is visible to both players; capture freezes the capturing piece for its next turn. The marker follows normal piece movement.
- **Prisoner Exchange:** Spend a turn returning one actually lost pawn per color to its earliest empty original pawn square. Each side benefits. Promotions do not count as lost pawns.
- **Relocation Order:** Choose a normally legal capture of an enemy non-king piece, then pick an empty original starting square of that piece. Your attacker stays put. The server excludes king-unsafe destinations.

## Approved gameplay cards still awaiting implementation (7)

- **Delayed En Passant:** allow one additional turn to en-passant if the relevant pawns remain in position. Ensure both pawns and the capture square are validated before use.
- **Promotion Recall:** on a pawn reaching the promotion rank, remove that pawn instead of normal promotion and revive a captured knight/bishop/rook on an empty original starting square.
- **Identity Theft (Epic):** select two friendly non-king pieces; swap their *appearances only* for the opponent's next turn. Real movement/attack rules never change.
- **Objection!:** reaction to an opponent card activation, canceling that card's activation. The opponent retains their card and continues with a normal move. Requires on-page multiplayer reaction handling.
- **Classified Promotion:** the promoted piece is disguised as pawn/? for the opponent until it moves, captures, checks, or is captured. Its real identity stays hidden on the server and never leaks through allowed-move lists/UI.
- **Time Capsule (Epic):** before moving a non-king piece, mark its starting square. On the user's next turn, optionally spend that turn returning the same surviving piece to the marked square, only if empty and king-safe; otherwise marker expires. Opponent sees marker and can occupy its square.
- **Counterfeit (Legendary):** after opponent plays a non-reaction card, copy that ability for your following turn. The copied ability consumes Counterfeit's card slot/use and must be played instead of a normal move; if unusable, expires. No choosing which opposing ability to copy.

## Separate next milestone: The Analyst (26th card)

**The Analyst — Legendary, passive.** Grade both players' moves as **Book, Best, Excellent, Good, Inaccuracy, Mistake, Blunder, Brilliant**. The evaluator must include card hands, active effects, concealed information, off-board sniper rays, the two-shot teleport and the 20-turn control swaps. Ordinary Stockfish scores alone are not valid ground truth for card positions. Implement *after* the other gameplay cards so the full ruleset can be simulated consistently.

## Release discipline

- Keep each player session's secret cards/hidden effects server-authoritative; never leak them in an opponent's view.
- Add legality, turn-count and edge-case tests per card before enabling it in random hands.
- All confirmations and reactions stay in the GAMESHUB interface, never browser alert/prompt/confirm.
- Playtest two real browsers, including the instant post-swap turn and card ownership.
