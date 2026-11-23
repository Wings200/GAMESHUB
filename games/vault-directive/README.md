# VAULT DIRECTIVE: BELOW THE SURFACE

A GAMESHUB original browser-based, single-player underground settlement simulation.

**State:** Alpha 0.1, development review. Game files live in games/vault-directive/.

## Quick start
Open /games/vault-directive/ from GAMESHUB after this branch is deployed, or serve the repository as static files. Select Standard, Hardcore, or Sandbox mode and start a new vault. Progress saves in browser localStorage; no account or server integration is required.

## Play loop
- Select connected earth compartments to build a new room. Scrapping and credits are required.
- Click constructed rooms to upgrade, repair, seal/unseal, or manage the sector.
- Select residents from the lower roster, then assign them to a room in the inspector.
- Food and water are consumed by residents, and power by infrastructure. Rooms provide production based on assignments, structural condition, and upgrades.
- Residents have personality traits, health, a personal bond, and loyalty. Bond dynamics, traits, shortages, and threats influence loyalty.
- Outbreaks can spread through open adjacent rooms; sealing restricts spread while removing that room's production.
- Internal rebels and outside raiders capture sectors. They can expand to adjacent unsealed rooms.
- Occupied food, water, and medical rooms give hostile factions greater endurance. Sealed hostile rooms lose resistance faster; assaults and negotiation can recapture sectors.
- If command and territory are lost, Standard and Sandbox offer recovery, diplomacy, or founding a new vault. Hardcore ends the playthrough.

## Controls
Click a room / excavatable compartment to open sector actions. Click a resident in the roster and then a friendly sector to assign a job. The top right buttons pause, adjust speed, and save. The lower-right scenario buttons force an uprising, raider breach, or outbreak for alpha testing. In normal play, events can also arise from colony conditions over time.

## Development notes
- Self-contained vanilla HTML/CSS/JS. Rooms and residents use original procedural Canvas 2D drawings, not third-party game art.
- Simulated days last 2.2 real seconds at 1x. Time does not advance while the page is closed.
- Save format is localStorage key gameshub-vault-directive-v1.
- Original rooms have limited interactive detail, individual missions/exploration and inter-vault diplomacy are **not** implemented yet. The exile flow is a first playable system, not the final campaign.
- Alpha scenario buttons are intentionally exposed for QA and can be hidden in a later build.
- Test with node --test tests/vault-directive.test.mjs tests/public-library.test.mjs

## Design direction
Grow this into a richer survival narrative with staff specialization, friendships and rivalries, multiple enemy factions, diplomacy, story arcs, infrastructure topology, and optional hardcore defeat. Gameplay is designed to be original rather than reproducing a specific franchise.
