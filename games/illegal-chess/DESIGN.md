# ILLEGAL CHESS — Visual and rules roadmap

## Live in Alpha 0.8.1

- All actions that need choices or confirmations use the on-page `#modalShade` dialog. No `window.prompt`, `window.confirm` or `window.alert`.
- Every implemented card has original SVG illustration displayed in **both** hands. Used cards remain displayed under a prominent crossed-out USED overlay.
- **Bonus actions:** Parking Ticket, Reserved Parking and Ceasefire apply before the player's ordinary move. They do not consume the turn, but each card can be used only once.
- **Bishop Sniper:** place one bishop completely off-board in one of four directions (NE/NW/SE/SW). The diagonal stays secret before the first shot. **First shot:** capture the first unobstructed enemy piece without moving the bishop; reveal the diagonal to the defender. **Second shot:** capture the next first unobstructed enemy piece, then teleport the bishop onto its captured square, ending sniper mode. A friendly or enemy piece blocks everything behind it; the off-board firing ray counts for checks and king safety before the second shot. Each shot uses one chess turn.
- **Card expansion wave 1:** Pawn Ram (Common), Friendly Fire (Uncommon), and Pawn Strike (Rare) are now playable with their original accepted rules, custom illustrations, and regression coverage. Pawn Strike is a bonus action that blocks both players' pawn *forward* moves for the acting turn and next reply while keeping diagonal captures legal. Friendly Fire honors king safety and cannot target a friendly king.
- **Card expansion wave 2:** Insurance Fraud, Prisoner Exchange and Relocation Order have server-side validation, original artwork, in-game selection, and automated tests. Insurance markers are visible to both players. Relocation Order allows the user to select only king-safe original home squares.
- **Card expansion wave 3:** Delayed En Passant extends a single en-passant opportunity using server-side history; Promotion Recall spends the promoting pawn to revive a previously captured friendly minor/major piece at its home square; Time Capsule visibly marks and temporarily tracks a real piece, with an on-board return button next turn. All three use the in-game UI and validate king safety.
- **Final gameplay cards:** Identity Theft swaps only enemy-visible appearances. Classified Promotion conceals the actual promoted piece type. Objection! gives the opponent a server-validated in-site reaction before card resolution, and Counterfeit clones the most recent nonreaction enemy card at the cost of a full turn. These include multiplayer secrecy and reaction regression tests.
- **The Analyst is the 26th card.** Legendary passive: records standard legal chess moves without server-side grading and offers those moves to an isolated client-side Stockfish 19 lite single-threaded UCI engine. Grades compare the engine's preferred root move to the played move at bounded depth/time. On-board feedback coins appear above the moved piece for **1000ms** only after analysis completes, with a matching color/icon history and legend. In custom-rule positions, no FEN or Stockfish job is emitted to avoid leaking concealed information or pretending Stockfish knows chess-card rules. Previous heuristic grades are labeled as historical estimates. Engine files are served unmodified from an allowlisted pinned CDN via the same-origin function; their GPL-3.0 source/license link is in the UI. No runtime external opening books or Chess.com accuracy models are used.
- **Approved catalog:** See [CARD_CATALOG.md](./CARD_CATALOG.md) for all 26 original approved concepts, remaining rules and the separate Analyzer milestone.
- **Optional sniper test match** gives *both* players Bishop Sniper plus two random other cards. Standard games keep three random rarity-weighted draws. Test matches are unranked like the rest of Alpha.

## Future: cinematic Bishop Sniper shot

Concept suggested by the game's creator: when a shot lands, briefly transition into a stylized **3D cinematic** showing a bishop lying prone, aiming and firing a bullet down the diagonal; the projectile impacts the enemy chess piece.

Important constraints:

1. **Preserve hidden information.** Before a shot, the defender cannot learn the direction or off-board position. During/after a shot, decide explicitly whether the shot reveals the sniper's position. The first shot reveals the firing diagonal to both players. Before shot one, the defender must not see it. Cinematics before that reveal must preserve secrecy.
2. **Server decides outcomes.** The cinematic only plays *after* the authorized card capture is validated and committed. No client-side physics result can change a match.
3. **Short, skippable, accessible.** Aim for roughly 1–2 seconds, allow skip, and support reduced-motion/static impact graphics. Don't lock the opponent out of a legitimate turn on a slow client.
4. **Trigger from a structured match event.** Store a safe public `sniper-shot` event with target square, result, and sequence number; keep private direction on the shooter's side. Do not rely on parsing descriptive match-log text for animation.
5. **Performance fallback.** A lightweight 2D impact effect should work on mobile or if WebGL / 3D assets cannot load.

## Color swaps and game end

- Every 20 turn-consuming player actions (20 half-moves), the players swap control of White and Black; chess pieces, turn order, active effects and off-board snipers stay with their board colors. Each player keeps their unused cards. The server rotates authentication ownership; the browser follows the returned current color. Bonus cards do not advance the counter.
- Checkmate, stalemate and other terminal results stop actions and show a prominent victory/defeat/draw banner, with the server-provided winner deciding the result. A game that just ended does not swap owners.

## Further engineering

- Add the other approved cards (not currently shuffled into playable hands); card-specific server-authoritative checks are essential.
- The Legendary Analyst would need an evaluator that understands off-board bishops and other cards; ordinary Stockfish alone cannot correctly score Illegal Chess moves.
- Multiplayer currently polls room state from Cloudflare D1 about every 1.5 seconds. Real-time WebSockets, reconnect/room expiry, match timers, replays, and accessibility audits should be considered before a large public release.
- Rebalance rarity and card combination effects after two-player playtesting.

## Stockfish startup resilience (Alpha 0.8.1)

- The browser tries the original same-origin Cloudflare Pages Function engine route first. If the worker fails to boot, it next tries a same-origin static classic-worker shim that imports the pinned Stockfish 19.0.1 lite script and supplies its matching WASM URL from jsDelivr, then unpkg. If WebAssembly fails entirely, it attempts the official Stockfish 19 ASM.js (JavaScript-only) build as a last resort. The shim loads only official pinned engine files, and all position data remains inside the browser.
- The Pages Function's JS/WASM proxy also falls back to unpkg if jsDelivr is unavailable.
- Both failure type and source are visible in the Analyst panel. An in-game **Retry Stockfish** button disposes the failed worker and rechecks pending turns without breaking the multiplayer session. Previous failed requests cannot overwrite a later retry.
- Live browser loading still needs a real deployment smoke test; local tests emulate UCI messages and network/worker failures. No homemade rating fallback is allowed.
