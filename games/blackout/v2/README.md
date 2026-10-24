# BLACKOUT 2.0 — P0.1 Repair Candidate

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
- Shared V1 detailed BX-7 firearm, animated recoil/ADS/magazine/shells/muzzle flash,
  automatic fire while held, correct ammo consumption and bullet impact marks.
- Simple operator walking movement and V1's animated physical planting/defusing devices,
  typing audio and timed post-plant beep cues.
- A damageable practice target in Testing, which automatically respawns.
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
- Operator limbs are only *basic* procedural animation. The map, full-body motion,
  UI scale and first-person presentation still fail the agreed V1-quality bar.
- Round result still requires a manual restart; automatic best-of-7 is open (BUG-008).
- The Testing route is a free training environment, not a full match.
- Matchmaking mode cards are disabled rather than pretending to work.

## Controls

Click the 3D game view to capture the mouse. That same first click now also
shoots if the phase allows it. Hold left mouse for automatic fire. `ESC` pauses/releases the mouse.

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

0. Start `PLAY → TESTING`. Shoot once immediately: ammo must read 29, muzzle
   flash/recoil/brass should appear; hold fire to empty the magazine, reload with R,
   and verify the target takes damage and respawns. Repeat while aiming with RMB.
1. Open `PLAY → AI 5V5`, choose Attack, enter operator selection.
2. Adjust the sight/barrel, confirm, and observe that the selection timer advances
   to prep without everyone clicking a manual ready button.
3. Drive the prep drone; the 45-second timer should advance to Action.
4. Traverse a doorway to either Storage A or Server B and hold F for seven seconds.
   Watch the device/hand motion and listen for typing while the character kneels.
5. Protect the defuser during the 45-second post-plant period, or eliminate the bot.
6. See Round Won/Lost with a specific reason and an option to restart.
7. Repeat on Defense and test three-second reinforcement in prep and action,
   AI planting and animated seven-second counter-defusing with a handheld tablet.
8. Verify `../` still opens the unchanged legacy BLACKOUT.

## Automated checks

```sh
node --check main.js
node --check world.mjs
node --test *.test.mjs
```

## Design rule

Do not extend this into separate Training, Custom and Online copies of the game.
All future modes must share a single match state machine and compatible gameplay
systems. Real network authority and cross-client verification are prerequisites
before a feature can be called multiplayer-complete.

These repairs have passed static checks and 20 pure unit tests, **not yet human
browser verification**. They must remain labeled *Fixed — unverified* until tested.
