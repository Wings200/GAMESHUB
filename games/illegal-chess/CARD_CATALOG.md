# Illegal Chess — approved card catalog (26)

This records the original 26 approved concepts. Keep gameplay rules stable while adding server-side checks and UI. A card must **not** enter random draws unless the server implements it and it has tests.

## Live gameplay cards (15)

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
| Pawn Strike | Rare | Implemented in wave 1 |

## Approved gameplay cards still awaiting implementation (10)

- **Delayed En Passant:** allow one additional turn to en-passant if the relevant pawns remain in position. Ensure both pawns and the capture square are validated before use.
- **Promotion Recall:** on a pawn reaching the promotion rank, remove that pawn instead of normal promotion and revive a captured knight/bishop/rook on an empty original starting square.
- **Insurance Fraud (Uncommon):** insure a selected friendly piece for two opponent turns; if an enemy captures it, the capturing piece cannot move on its owner's following turn. Opponent sees marker.
- **Identity Theft (Epic):** select two friendly non-king pieces; swap their *appearances only* for the opponent's next turn. Real movement/attack rules never change.
- **Relocation Order (Epic):** target an enemy non-king piece that one of your pieces could normally capture; instead relocate the target to an empty one of its original starting squares. Attacker stays. Uses turn.
- **Prisoner Exchange (Uncommon):** if both colors have lost a pawn, revive one captured pawn on each color's empty original starting square, simultaneously; consumes turn.
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
