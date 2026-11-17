# ILLEGAL CHESS — Visual and rules roadmap

## Live in Alpha 0.9.2

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

## Full NNUE strength upgrade (Alpha 0.9)

- Official latest stable **Stockfish 19**, pinned to stockfish@19.0.1. First preference is **Full, single-threaded** 19 with its full-size NNUE network (approximately 94 MB), rather than the weaker Lite NNUE model. It is the strongest practical browser build that works on normal web pages without COOP/COEP cross-origin isolation.
- Stronger analysis: UCI max skill level, approximately 2.2 seconds per search (best and played move from same original FEN), depth cap 24, and 48 MB engine transposition hash. A legal chess move costs up to two searches, and cannot receive a fabricated result when the browser cannot run the engine.
- Degrades gracefully to Lite NNUE and then ASM.js on unsupported or slow devices, with explicit source and tier shown in the Analyst status. First-time full download is large; players on slow connections may see a noticeable engine loading state.
- Full engine's JS/WASM are allowed from the same pinned npm package via Cloudflare Pages Function or the same-origin worker shim with a direct CDN WASM hash. No server-side chess analysis credentials or remote positions. Original Stockfish engine is GPLv3; see attribution links in the game.
- UI no longer describes the Analyzer as always 'Lite'. Revalidate actual real-browser downloads after deployment: synthetic worker tests cannot prove successful full engine WebAssembly initialization or performance.

## One shared Analyst · Chromebook performance (Alpha 0.9.1)

- **One evaluation per turn, not per browser.** When the passive Analyst is active, only one connected device is elected to run Stockfish. It publishes the engine's raw best/played evaluations via an authenticated POST `/api/illegal-chess/analyst` endpoint. The server validates the UCI score shape and move, computes the label with the shared classifier, stores the final grade in the room's existing D1 match history, and exposes that same record to **both** player views. Repeated submissions are rejected.
- **Prefer the more capable player.** Both clients report coarse local capability estimates (hardware concurrency, available memory, reduced-data preference and ChromeOS detection) to elect a worker. A more capable client can preempt a weaker client. All remaining devices are viewers and never download Stockfish. The score is a scheduling hint from authenticated participants, not a security-sensitive or guaranteed hardware benchmark.
- **Automatic takeover.** The elected worker sends a lease heartbeat. The lease expires after 20 seconds without one; the other player can claim the role. Ownership is associated with authenticated player session hashes rather than board colors, so it continues through the 20-turn color swap. A short election grace period helps avoid starting the heavy engine before both devices register.
- **Chromebook fallback.** A ChromeOS device has a deliberately low capability score and only runs lightweight Stockfish if no stronger player is connected. Full NNUE remains preferred on the stronger PC; forced low-tier runs avoid the ~94 MB download. Analysis time is reduced to approximately 1.1 seconds total on Lite and 2.2 seconds total on Full, plus engine initialization.
- **Shared retry and clear errors.** One player may reset failed reviews from the in-game Retry Stockfish button, triggering a fresh election. The client never computes separate local grades; status, symbols and history always come from the server-persisted result. Both players see identical labels, though the second screen may receive the new label at the next ~1.5-second poll.
- **Trust boundary:** This is a cooperative multiplayer game, not a cryptographically attested engine. The server calculates labels from supplied UCI score fields, rejects stale/fabricated move identifiers and duplicate submissions, but cannot prove an authenticated player didn't manipulate their own engine scores. For competitive ranked play, move the engine into a trusted server job or validate analyses against a trusted engine service. This feature does **not** change chess rules or reveal concealed card choices.

## Bishop Sniper cinematic V1 · Alpha 0.9.2

- **Trigger:** only after the server accepts a real Bishop Sniper shot. Every valid shot appends a bounded, immutable-in-history public cinematic event to the same D1 room, carrying its move-count ID, shooter side, already-revealed origin and diagonal, captured target square and original victim symbol. Both players receive the same event through the existing `playerView` and 1.5-second state polling; no extra network calls or video streams are needed.
- **First shot:** a 1.55-second fullscreen, non-interactive tactical cutscene built from an original inline SVG of a chess bishop lying prone with a scoped rifle, CSS perspective chess-floor, darkening/vignette, target reticle, muzzle flash, bullet tracer and captured piece disintegration. The bishop stays off-board; its diagonal is revealed after this shot, exactly as before.
- **Second shot:** a distinct 680ms purple **shadow teleport** effect at the real chessboard destination (the server has already teleported the bishop into that capture square). No rifle firing animation or second bullet sequence. No changes to chess turn timing or sniper rules.
- **Multiplayer:** the scene is driven only by the server's committed action event. Both browsers receive identical parameters, and the client tracks the last seen event ID to avoid replay on repeated polls, UI updates, refreshes, or joining an older match. A failed/invalid shot emits no event; a secret preparatory card action emits none either, preserving secrecy.
- **Performance:** only SVG and GPU-friendly CSS opacity/transform animations; no WebGL, canvas simulation, third-party media, external sound assets or heavy 3D models. The overlay never intercepts input. `prefers-reduced-motion` reduces presentation to a brief static confirmation; any background tab silently skips a stale cutscene.
- **Testing:** gameplay and two-real-session API tests cover both shots, identical server payloads, no secret pre-shot leak, no animation on invalid shots, and deterministic helper tests for first vs. second shot, duration, event ordering, and invalid payloads. Live browser visual and performance playtesting on Chromebook remains recommended.
