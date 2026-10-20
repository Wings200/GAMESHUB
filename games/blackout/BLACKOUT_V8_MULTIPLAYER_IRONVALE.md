# BLACKOUT V8.1 — IRONVALE tactical map + first REAL multiplayer rooms

Status: **implemented in GitHub, source/bundle tests passing; Worker deployment and live browser acceptance still required.** Do not advertise this as public online matchmaking or finished Siege-equivalent multiplayer.

## Operator selection bug fixed

Previously `setRole()` always called `chooseOperator(defaultOperator(role).id)` after map changes, silently overriding the user's selected operator. It now preserves the current valid specialist and also remembers the chosen operator separately for Attack and Defense. Selecting IRONVALE or switching the bomb sites no longer replaces a chosen attacking or defending operator with the first roster entry.

## New authored map: IRONVALE · Operations Complex

**56 × 40 metres**, a two-storey operations campus with 4m storey heights, two actual stair flights and roof-edge rappel access.

- 549 original map-editor pieces: 68 floor slabs, 231 hard-wall sections, 59 soft/reinforceable walls, 92 proper door openings, 38 window frames, 26 cover pieces, two stairs, 16 exterior rappel ropes, seven outside attacker insertions, ten 1F/2F defender markers.
- 70 named sector/room spaces, two floors with a full central hall and corridors, utility and loading rooms, reception and offices, storage and network equipment, upstairs operations and encrypted vault facilities.
- First-floor Server Vault / Plant Control site pair; second-floor Operations Center / Encrypted Vault pair.
- The playable map loader derives room boundaries from real floor pieces rather than the original small CLUBHOUSE rectangle. Actual soft-wall destruction, barricades, legal bomb zones, upstairs stairs and the existing rappel movement apply to IRONVALE.
- Room-type floor materials, server racks, desks, departmental cover, high-contrast door-frame wayfinding, wall room signs, illuminated ceiling fixtures, and a second-storey roof added procedurally.
- Actual 1F/2F defender spawn planning and offline AI navigation extend across the IRONVALE map rather than using small testing bounds.

**Map acceptance:** `tests/ironvale-runtime-v8.test.mjs` verifies genuine playable floor geometry and collision, five safe defender starts on each site/floor, all 16 rooftop windows, and a valid AI approach path from outside to the bomb room. This is automated—not a claim that every room has passed hand-play testing.

## First actual multiplayer layer

BLACKOUT now has a distinct **Private Online Room** entry in Play and working client/server source logic. It does **not** use REDLINE's racing rooms or substitute AI for network participants.

- Create a 6-character invite code or join the code a friend sends.
- Up to ten actual WebSocket connections, maximum five attackers and five defenders. A team slot exists only when a real connected browser occupies it.
- Side-specific operator selection. The Worker's server maintains its own player roster and refuses incorrect-side operators.
- Only the room host can launch a round; at least one real attacker and one real defender must be connected before it starts.
- Server sends authoritative operator positions, health, live team rosters and winner events. Client renders separate actual-player 3D avatars, not simulated AI members.
- Online PvP uses client input to request movement/shots, then the Worker enforces rate/velocity, wall/path sweeps, floor support, shot cadence, line-of-sight and health/damage. Target browsers cannot simply announce kills or health values.
- Attackers get up to 2.3s insertion protection on the server, lost when they move farther than 3m or shoot.
- Server declares a round won when the other team is eliminated, broadcasts the result and allows the host to start another round. Roster state and match phase are persisted across Durable Object hibernation.
- Offline first-to-four match/AI training is still a separate mode.

### What this multiplayer build is *not* yet

- Not public automatic matchmaking or ranked playlists.
- Not yet a fully synchronized bomb/defuser mode, team-site votes, reinforcement destruction, gadget physics, drones or dynamic doors. Those remain OFFLINE and are deliberately disabled/unavailable as online controls until server-authoritative replication exists.
- Not yet account-authenticated; possession of the room code is the invitation. There is no chat moderation layer or reconnect credential system.
- No full client prediction/reconciliation, lag compensation or anti-cheat guarantee. This is a usable design for real human-room testing, not a production security certification.
- The large room-layout is structured original geometry, not a textured, professionally art-directed environment. It still needs browser playtests, visual feedback and bug fixing.

## How to start a two-browser test *after deployment*

1. Reload BLACKOUT (**Ctrl + Shift + R**), choose **Play → Private Online Room → Select Operator → Loadout**.
2. Both players select attacking or defending operators. One creates a private room; the other enters its 6-character code and clicks Join.
3. The room roster shows the actual connections. The host presses **HOST: START ROUND**.
4. Both players deploy to IRONVALE. After taking damage/shooting one player to zero HP, verify the same round result appears on both tabs; the host may start another.
5. Try to change maps mid-room, spoof upper-floor positions or fire rapidly; server should reject invalid movements/shots.

## Production deployment — explicit manual opt-in, because REDLINE shares the Worker

GitHub workflow `.github/workflows/blackout-worker-release.yml` continuously **dry-run bundles** the Worker on code changes without deploying. It uses the existing `wrangler.json` with a new independent `BLACKOUT_ROOMS` SQLite Durable Object class.

Before publishing, the repository owner needs to configure GitHub Actions secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` with permission to deploy **redline-multiplayer**. Keep these private; never paste the token into a chat or source file.

In GitHub → **Actions → BLACKOUT multiplayer Worker — verify and optional deploy → Run workflow**, explicitly enable **publish_shared_worker**. Only this opt-in deploy job runs `npx wrangler deploy` and checks that the BLACKOUT room route responds. The Worker is shared with REDLINE and deployments can affect both games—watch its health after publishing. No production deploy was performed as part of this GitHub code iteration.

If deploying locally instead, in a properly configured local Cloudflare development environment run `npx wrangler deploy` at repository root (see Cloudflare developer docs). The deployed Worker is currently expected at `redline-multiplayer.guestuseonly0173.workers.dev`; if its hostname changes, update `src/network-client.js`.

If you click Create Room before deployment, **ONLINE CONNECTION FAILED** is the expected result. That is not proof of working live multiplayer.
