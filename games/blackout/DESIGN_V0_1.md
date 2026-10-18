# PROJECT BLACKOUT — Design and First Playable Contract (V0.1)

**Status:** Design approved for planning. No playable game has been implemented yet.
**Game:** Original browser-based, tactical attacker-vs-defender FPS for GAMESHUB.
**Working title:** PROJECT BLACKOUT.
**Art direction:** Contemporary tactical realism with selected near-future experimental electronics.
**Production rule:** The REDLINE game, Worker, account/garage, and deployed service must remain untouched.

## 1. North star

BLACKOUT's signature is **control of a building's security infrastructure**.
The attackers and defenders compete over information and physical access to
cameras, door controllers, alarms, and power circuits. Each gadget should have
meaningful counterplay and telegraphing. Shooting and player movement must
be responsive, intelligible, and consistent across matches.

This is an original IP: do not reproduce Rainbow Six Siege operators, exact
maps, character appearances, names, art, sound or proprietary UI.

## 2. Intended full game (NOT V0.1 scope)

- PC-browser tactical 5v5, distinct attacker/defender roles.
- Team-based rounds with no respawns; eventual 3-minute action phase.
- Main objective **Data Extraction**: attackers must access a guarded terminal
  and maintain extraction while defenders deny or interrupt it.
- Two-story facility maps with cameras, real interiors, breachable selected
  sections, meaningful entry/exit routes, and sound propagation.
- Operators / loadouts balanced by information, mobility, denial and counterplay.
- Ranked, matchmaking, persistence, cosmetics and full 5v5 servers only when the
  foundation and server authority are proven.

## 3. V0.1: FIRST CONTACT — fixed scope

**Playable loop:** Load /games/blackout/index.html -> click Start Training ->
mouse pointer lock -> walk an enclosed test facility -> ADS and shoot stationary
and pop-up targets -> see hit feedback, health target and weapon ammo readout ->
reload -> exit to menu safely.

A. **Map: BLACKOUT TRAINING ANNEX**: One SMALL, coherent interior, roughly
48 x 36 meters, with four areas: spawn/instruction bay; an L-shaped corridor
with corners; training range with near/mid/far targets; and a movement-test room
containing a low ramp and a staircase-sized obstacle. Doors/windows/walls have
actual colliders. Roof and ground must be closed; room scale is believable.
Static material variants: concrete, rubberized floor, brushed metal and glass.
No random boxes or fake decorative doorways.

B. **Movement:** WASD walk, Shift sprint, Ctrl crouch, Q/E lean, mouse-look,
collision slide, gravity/grounding, stairs or ramp traversal, and smooth camera
transition (not excessive camera bob). Collision capsule must not clip doors,
windows, walls or ceiling. Disable leaning if the camera would penetrate a wall.

C. **Weapon:** One fictional 'Kestrel AR' training rifle, 30-round magazine,
90 rounds in reserve, single hitscan damage model, ADS, limited recoil and
recoil recovery, fire interval, 2.1s reload, dry-fire feedback, muzzle flash,
tracers / decals bounded by pooled object limits, shell ejection only if FPS
budget allows. All values provisional, tune through tests; avoid false realism.

D. **Targets and feedback:** At least five targets at different ranges/angles.
Clear damage feedback, timed target reset, hit/damage UI, shots hit/fired
and range score. Bullets stop on concrete walls rather than passing through
without intentional penetrability. Weapon ray and visible reticle align.

E. **HUD / usability:** Crosshair changes for ADS, ammo counter, training score,
control hint overlay, framerate and collision debug toggle, pause/unlock cursor,
music/FX volume independent from REDLINE settings. Treat sound initialization as
a user-gesture requirement. A short playable reload/exit flow must work.

F. **V0.1 is OFFLINE SINGLE-PLAYER training**; no fake multiplayer,
no bot combat AI, no operator roster, no destruction simulation, no voice
chat, no anti-cheat claims, no ranking and no player data mutations.

**Stretch only after the must-have checks pass:** One F-key interactable
security power breaker that switches a selected room between normal and
emergency lighting. This demonstrates the future network system but cannot
delay movement, weapons, and collision milestones.

## 4. Input convention

| Input | Action |
|---|---|
| Mouse | Look |
| Left mouse | Fire |
| Right mouse | Aim down sights |
| WASD | Move |
| Shift | Sprint (ADS off during sprint) |
| Ctrl | Hold crouch |
| Q / E | Lean left / right (collision aware) |
| R | Reload |
| F | Use test switch (stretch) |
| Escape | Exit pointer lock / pause |
| F3 | FPS and collision diagnostics |

Keep bindings centralized to make remapping possible later.

## 5. Architecture

- **Frontend**: isolate under `games/blackout/`; own index and CSS.
  Modular ES files: `main.js`, `src/config.js`, `src/world.js`,
  `src/physics.js`, `src/player.js`, `src/weapon.js`,
  `src/targets.js`, `src/ui.js`, `src/audio.js`.
- **Rendering**: Three.js, using measured draw batching / texture limits.
  Follow REDLINE's working browser deployment style but do not import
  REDLINE's racing-specific game code.
- **Collision**: Rapier JS capsule / kinematic character controller is the
  proposed baseline; test stepping, slopes and rigid walls first. Physics
  and visuals use the SAME level dimensions and object transforms.
- **Later networking**: Create a SEPARATE Cloudflare Worker, Durable Object
  namespace and config file (for example `blackout-worker.js` and
  `wrangler.blackout.json`), never overwrite `worker.js`,
  `wrangler.json` or REDLINE rooms/stats.
  Future server must own HP, ammo, hit decisions, round phases, team assignment
  and objectives. Clients send inputs rather than authoritative kills or
  unrestricted positions. Implement client prediction/interpolation only
  after correctness tests. Evaluate the Cloudflare WebSocket APIs and runtime
  timing/cost before choosing tick rates.
- **Assets**: original/appropriately licensed models, textures and audio;
  track attribution/license. No external hotlinks without availability checks.
- **Deployment**: Create a separate public path under GAMESHUB only after
  it passes local and browser smoke tests. Do not expose a broken front-page
  link; keep it initially as a direct private/test path.

## 6. First playable acceptance checklist

1. Cold-load, Start Training and Esc / re-enter pointer lock all work.
2. No console errors and no missing static assets on a fresh browser load.
3. Collision trial: walk into EACH perimeter wall, all door frames, corners
   and range dividers; no clipping, falling, teleporting or infinite bouncing.
4. Ramp/steps trial: normal walk, crouch and sprint are stable, no camera jumps.
5. Lean beside the wall: head/camera cannot peek through the geometry.
6. ADS: crosshair and ray align; the same target is hit on centre-screen.
7. Rifle: firing rate/30 rounds/reload/reserve all behave, and concrete
   occludes targets behind it. Reload cannot create infinite ammunition.
8. Targets reset and HUD counters accurately report hits and attempts.
9. Replay Start -> shoot -> reload -> Exit -> Start at least five times,
   no doubled input handlers, runaway SFX or leaked scene meshes.
10. On target desktop hardware, sustained 60 FPS at 1080p with a reasonable
    graphics setting and no major frame spikes; this is a TARGET, not a
    benchmark claim until tested in a browser.
11. REDLINE gameplay, garage, multiplayer, racing stats and web page remain
    unaffected.
12. All claims of actual performance and visuals require actual browser
    validation; source parses and headless object mocks are not substitutes.

## 7. Stage gates / milestones

**Gate 0 — Design:** Document this scope; confirm style and acceptance criteria.
**Gate 1 — Controller:** Implement map and collisions only; pass all wall/corner,
slope, crouch and lean tests.
**Gate 2 — Gunplay:** Implement ADS, firing, reload, hit validation, targets,
FX audio, HUD; pass weapon invariants in automated and browser testing.
**Gate 3 — Playability:** Optimize, QA on desktop, fix severe geometry bugs;
record and review real footage before claiming a release.
**Gate 4 — Next vertical slice (later):** 2-client local multiplayer room,
server-validated hit and damage, movement smoothing, one security-network
interaction. Do NOT jump directly to five-player matches.

## 8. Reasons to say no to new scope

No map expansion until collision is clean. No additional firearms until
the first feels correct. No AI/operator cosmetics until target hit detection
is consistent. No multiplayer until reliable local gameplay; no 5v5 until
server-authoritative 2-client matches pass desync and packet-loss tests.
This is meant to avoid repeating REDLINE's patch-on-patch problems.

## References

- Rapier JS character controller:
  https://rapier.rs/docs/user_guides/javascript/character_controller/
- Cloudflare Durable Objects WebSockets:
  https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- Three.js installation:
  https://threejs.org/manual/pages/installation.html
