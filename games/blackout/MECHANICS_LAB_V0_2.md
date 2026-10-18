# PROJECT BLACKOUT — V0.2 THE LAB: Mechanics Before Maps

**Status:** Browser-accessible test build committed on `main`; real PC visual/gameplay verification pending.
**Location:** `/games/blackout/index.html`.
**Role:** Isolated single-player simulation to tune tactical FPS movement, guns, and gadgets. No multiplayer server or ranking systems.
**Supersedes:** The V0.1 Training Annex as the current test scene. V0.1 source and design notes remain as history.

## Flat-ground mandate

Remove the four-room Annex *entirely* from the live BLACKOUT scene. The V0.2 world is a flat 240m
floor with 5m grid markings, 12 range dummy targets at different distances, and two
standalone wall test panels. The two panels are **test fixtures**, not a map. They
provide an isolated target for breach vs reinforcement mechanics. No corridors,
buildings, doorways, terrain, rooftops, props pretending to be a level, or map expansion.

## V0.2 implemented (local sandbox)

- First-person WASD/mouse input with the corrected camera/movement orientation
  from V0.1.1; sprint, crouch, prone toggle, Q/E leaning, pause/pointer lock.
- User sliders for walk speed (2.0–5.0m/s), sprint speed (4.0–8.0m/s),
  and mouse sensitivity (0.4x–2.5x).
- Two weapons: Kestrel MK1 (30/120, 710 RPM, 2.25s reload) and Vigil P9
  (15/60, 375 RPM, 1.55s reload). ADS zoom, lower ADS spread, fire rate,
  magazine capacity, reload reserves, limited recoil, target hit zones,
  100 HP shooting dummies, body/head damage, hitmarker, kills, accuracy,
  FPS and ammo readouts.
- Simplified original procedural weapon geometry, muzzle light and test-only
  procedural gunshot audio. The audio/models are placeholders, not an
  assertion of finished production-level weapon sound/design.
- Two standalone physical wall test panels (220 HP):
  regular bullets destroy soft panels; reinforcement makes them immune to
  standard firearm damage and a standard charge. A breached panel is removed
  from collision and raycast queries until reset.
- **Attacker:** G plants a 1.5-second timed soft-panel charge within 7m
  (limited stock); X triggers a 4.5-second recon pulse showing test dummy
  markers (limited stock).
- **Defender:** F reinforces a targeted wall panel within 5.3m (limited stock);
  G places a physical deployable shield with bullet interception and movement
  collider (limited stock); X places a proximity sensor which alerts on
  leaving and re-entering its 5m circle (limited stock).
- Role selection in the pause menu; RESET LAB restores equipment, panels,
  target health and gadgets. F3 shows performance / world diagnostics.
- Single-player weapons, gadget counts and kills are local to the browser
  scene. No actual player enemy combat, server authority, inventory economy,
  persistent statistics, network synchronization or AI.

## Input map (PC mouse + keyboard)

| Control | Function |
|---|---|
| W / A / S / D | Forward, strafe left, back, strafe right |
| Mouse | Camera look; adjustable sensitivity |
| Shift | Sprint when moving forward |
| Ctrl / C | Hold crouch |
| Z | Toggle prone |
| Q / E | Lean left / right |
| Left / Right mouse | Fire / aim down sights |
| 1 / 2 | Carbine / pistol |
| R | Reload |
| G | Primary gadget for selected side |
| X | Secondary gadget for selected side |
| F | Defender reinforcement while aiming at soft test panel |
| F3 | Developer diagnostics |
| Escape | Release mouse / pause / select side / change speed / reset |

## Planned BLACKOUT mechanics (not yet built)

**Combat and mobility**
- Walk/sprint/crouch/prone transitions with realistic animation; tactical vaulting,
  contextual climbing/rappelling on actual future building structures, deployable
  cover vaulting, collision-accurate camera/leaning, melee, sound propagation,
  footsteps by material, rifle optics, muzzle attachments, customizable firearms,
  recoil/bullet ballistics and calibrated penetration.
- Multiple damage zones, armor, down-but-not-out state, revival, elimination
  and spectator/kill-cam policy; team indicators / friendly-fire policy.

**Attacker phase**
- Prep-phase recon vehicles, scouting/marking, observation camera takeover,
  data terminal hacking/extraction, barricade removal and rope entry,
  soft/selected hard breach gadgets, flash/smoke/disruption tools,
  electronic countermeasures, gadgets with limited charges and destructible
  enemy electronics.

**Defender phase**
- Prep-phase cameras and information-sharing, door/window barricades,
  limited reinforcements, deployable shields, proximity/alert traps,
  signal denial, power systems, lockdown doors, motion tracking and
  electronic defense with counterplay.

**Objectives/network/game modes**
- 5v5 team allocation, preparation vs action round phases, a **Data Extraction**
  plant/hold/deny objective, round win conditions, death/spectating,
  weapon/gadget replication, server-validated shooting and damage,
  lobby/join/reconnect, rematches, cosmetics/progression/ranked later.
- Fully modeled maps **only after** grounded movement, gunplay, gadgets,
  collision and server authority are reliable.

## Engineering order

1. **V0.2:** Flat lab / basic gunplay / prone, lean and role gadgets (**committed**).
2. **V0.3:** Tune recoil/spread and sound; fix shooter/UI/controller issues from
   real gameplay video; add original camera/drone and barricade tests.
3. **V0.4:** Gadget counters, breakable materials, penetration rules, simple
   training bot and stronger animation.
4. **V0.5:** Separate BLACKOUT Worker / Durable Object; true two-player
   server-authoritative movement, ammo and damage tests.
5. **V0.6+:** Round prep/action, objective prototype, defending/attacking
   flow with multiple clients, then 5v5, then a designed map.

This is a plan rather than a promise every item has been implemented.

## Redline isolation

No modifications to `games/redline/`, REDLINE `worker.js`,
`wrangler.json`, its garage, accounts or multiplayer stats.
BLACKOUT currently needs only its own static files.

## Browser validation still required

- Hard reload and verify the V0.2 menu appears.
- Walk/sprint/crouch/prone/lean controls; monitor velocity changes
  from menu sliders; no inverted camera input.
- Fire at center target: ray/reticle alignment, bullets, headshots,
  ammo depletion, reload, swap to pistol, ADS spread and recoil.
- Move near a standalone panel and charge it with Attacker G;
  verify after 1.5s it disappears physically and no longer absorbs shots.
- With Defender F, reinforce a panel and confirm normal bullets and
  ordinary charge cannot breach it; Defender G shield stops bullets/movement.
- Defender X sensor: leave its circle and return to trigger once.
- Attacker X pulse: reveal markers, expire correctly.
- After multiple side switches / lab resets, no leftover shields, phantom
  hitboxes, duplicate input handlers or unexplained FPS drops.
- Actual 1080p performance and aesthetic review remain unmeasured here.
