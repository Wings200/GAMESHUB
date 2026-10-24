# BLACKOUT 2.0 — P0 First Playable

An **isolated, protected** browser-game prototype intended for
`/games/blackout/v2/` within the existing GAMESHUB Cloudflare Pages project.
It is built alongside — and does **not replace** — BLACKOUT 1.0.

## What is actually implemented

- Left-aligned homepage, military-inspired title typography, black/gray/blue palette.
- Home operator preview uses the same procedural character models as gameplay.
- Vertical mode list with card backgrounds captured from actual prototype scenes.
- Settings, FAQ, Credits, and Bug Fixes panels; consistent open/close transitions.
- Mode setup, team choice, 30-second operator selection and local saved sight/barrel choices.
- 45-second preparation with attacker-controlled drone or defender reinforcement.
- One connected 3D training map with two plantable sites, first-person movement, aiming,
  shooting, one simple AI opponent, 7-second plant/defuse and 45-second post-plant clock.
- Last-second plant overtime, round wins/losses, and cinematic result presentation.
- P0-only phase skip/reset controls, kept separate from the main HUD.
- A pure, testable rules module with regression tests.

## Scope limits — please do not mistake these for finished features

- **No live online 5v5, parties, Cloudflare multiplayer sync, or Custom Game lobbies.**
- **No real 5v5 AI team.** AI 5v5 currently offers a one-opponent playable slice.
- Geometric character models, basic bot intelligence and compact map are placeholders
  for evaluating mechanics and presentation, not final art quality.
- Loadout persistence is per browser (`localStorage`) rather than account-backed.
- Drone visibility synchronization, camera spectating and the full gadget roster
  are not implemented in this local-only slice.
- The Testing route is a free training environment, not a full match.
- Matchmaking mode cards are disabled rather than pretending to work.

## Controls

Click the 3D game view to capture the mouse. `ESC` pauses/releases the mouse.

| Action | Control |
| --- | --- |
| Move / Sprint | WASD / Shift |
| Aim / Shoot | Right mouse / Left mouse |
| Crouch / Reload | C / R |
| Lean toggle | Q / E |
| Reinforce / Plant / Defuse | Hold F for the displayed duration |
| Drone drive / Jump | WASD / Space |
| Drone enemy scan / Yellow ping | E / Middle mouse |
| Fast-forward phases | P0 TEST TOOLS panel (upper right) |

## Manual acceptance path

1. Open `PLAY → AI 5V5`, choose Attack, enter operator selection.
2. Adjust the sight/barrel, confirm, and observe that the selection timer advances
   to prep without everyone clicking a manual ready button.
3. Drive the prep drone; the 45-second timer should advance to Action.
4. Traverse a doorway to either Storage A or Server B and hold F for seven seconds.
5. Protect the defuser during the 45-second post-plant period, or eliminate the bot.
6. See Round Won/Lost with a specific reason and an option to restart.
7. Repeat on Defense and test three-second reinforcement, AI planting and disabling.
8. Verify `../` still opens the unchanged legacy BLACKOUT.

## Automated checks

```sh
node --check main.js
node --check world.mjs
node --test rules.test.mjs
```

## Design rule

Do not extend this into separate Training, Custom and Online copies of the game.
All future modes must share a single match state machine and compatible gameplay
systems. Real network authority and cross-client verification are prerequisites
before a feature can be called multiplayer-complete.
