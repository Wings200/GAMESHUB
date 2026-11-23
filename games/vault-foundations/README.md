# VAULT DIRECTIVE: FOUNDATIONS

A separate playable phase-one experiment. The original Vault Directive Alpha 0.2 and its save are untouched.

**Launch:** GAMESHUB → Games → IN DEV → VAULT DIRECTIVE: FOUNDATIONS

## Agreed scope
- Start with only a sealed entrance and one open underground tile. No settlers, rooms, stockpiles or passive income.
- Your Overseer is a visible little character with a shovel, **without** personal hunger or thirst meters.
- Click reachable adjacent dirt/rubble. The Overseer walks automatically to an accessible position and digs or clears it.
- Excavate tunnels, construct actual timber supports, and place physical room modules in completed 2×2 foundations.
- Deeper tunnels risk collapses; unsupported tiles can turn to rubble and must be dug clear.
- Earn research points from digging, building and scavenging; unlocking stone and steel tunnel designs lets you **construct** them, not instantly improve existing frames.
- Click sites outside the entrance to scavenge repeatable wood, scrap and stone. Farther areas are more hazardous.
- Resident management, production, guards, illnesses, loyalty, rebellion, etc. are for later phases — **not** included here.

## First playable tutorial
1. Search SCRUBLAND and SERVICE ROAD until you have 8 wood and 2 scrap.
2. Return UNDERGROUND.
3. Dig the four highlighted tiles right of the entrance.
4. Reinforce at least two of those tiles with TIMBER FRAME (2 wood, 1 stone each).
5. Build LIVING QUARTERS (4 wood, 2 scrap) on the supported 2×2 space.
6. Unlock STONE SHORING for 9 research points.

## Controls
- SURFACE/UNDERGROUND switches view.
- Click a surface location to send your Overseer to gather supplies.
- Select SHOVEL, supports, room modules, INSPECT or DISMANTLE before clicking underground.
- The **upper-left tile** is the point of placement for a 2×2 room module.
- Keyboard shortcuts 1–8 select digging, supports or common buildings.
- SAVE stores only this prototype in browser localStorage key gameshub-vault-foundations-v1. Old Alpha 0.2 saves stay separate.
- TESTS: node --test tests/vault-foundations.test.mjs tests/public-library.test.mjs

This is a gameplay-foundation test with original Canvas 2D drawings, not the final art, economy or story.
