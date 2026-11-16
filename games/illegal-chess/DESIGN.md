# ILLEGAL CHESS — Visual and rules roadmap

## Live in Alpha 0.2

- All actions that need choices or confirmations use the on-page `#modalShade` dialog. No `window.prompt`, `window.confirm` or `window.alert`.
- Every implemented card has original SVG illustration displayed in **both** hands. Used cards remain displayed under a prominent crossed-out USED overlay.
- **Bonus actions:** Parking Ticket, Reserved Parking and Ceasefire apply before the player's ordinary move. They do not consume the turn, but each card can be used only once.
- **Bishop Sniper:** place one bishop completely off-board in one of four directions (NE/NW/SE/SW). Only the deploying player sees the selected direction. The bishop stays off-board; each subsequent shot costs a chess turn and captures only the first enemy piece in its inward diagonal. Any friendly or enemy piece in front of another stops the shot. This means a pawn between the off-board bishop and a queen protects that queen. The attack ray is considered for king safety and check.
- **Optional sniper test match** gives *both* players Bishop Sniper plus two random other cards. Standard games keep three random rarity-weighted draws. Test matches are unranked like the rest of Alpha.

## Future: cinematic Bishop Sniper shot

Concept suggested by the game's creator: when a shot lands, briefly transition into a stylized **3D cinematic** showing a bishop lying prone, aiming and firing a bullet down the diagonal; the projectile impacts the enemy chess piece.

Important constraints:

1. **Preserve hidden information.** Before a shot, the defender cannot learn the direction or off-board position. During/after a shot, decide explicitly whether the shot reveals the sniper's position. Until that design decision is made, only the firing player sees a camera angle showing the bishop's location; the defender sees a local impact cinematic without the firing origin.
2. **Server decides outcomes.** The cinematic only plays *after* the authorized card capture is validated and committed. No client-side physics result can change a match.
3. **Short, skippable, accessible.** Aim for roughly 1–2 seconds, allow skip, and support reduced-motion/static impact graphics. Don't lock the opponent out of a legitimate turn on a slow client.
4. **Trigger from a structured match event.** Store a safe public `sniper-shot` event with target square, result, and sequence number; keep private direction on the shooter's side. Do not rely on parsing descriptive match-log text for animation.
5. **Performance fallback.** A lightweight 2D impact effect should work on mobile or if WebGL / 3D assets cannot load.

## Further engineering

- Add the other approved cards (not currently shuffled into playable hands); card-specific server-authoritative checks are essential.
- The Legendary Analyst would need an evaluator that understands off-board bishops and other cards; ordinary Stockfish alone cannot correctly score Illegal Chess moves.
- Multiplayer currently polls room state from Cloudflare D1 about every 1.5 seconds. Real-time WebSockets, reconnect/room expiry, match timers, replays, and accessibility audits should be considered before a large public release.
- Rebalance rarity and card combination effects after two-player playtesting.
