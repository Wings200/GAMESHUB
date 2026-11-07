# GAMESHUB Wasteland RPG — gameplay fidelity contract

**Status:** Full-system redesign specification, begun after release W20.84.
**Direction:** Match the *structure, interlocking systems, physical logic, pace and player freedom* of Fallout 4 as closely as feasible in a browser while keeping an original setting, characters, art, dialogue, quests and audio. This is not a request to reproduce Bethesda's copyrighted world or game assets.

**Implementation checkpoints after the original W20.84 audit:**
- W20.85–W20.88: Persistent radiation exposure, real HP damage, medicine,
  fixed-width HP bars and a separate responsive 0–6 live exposure gauge.
- W20.89: Six persistent limb conditions tied to the actual struck damage zone;
  injuries affect movement, sprinting, aim, recoil and stamina. One real
  medkit treats the most damaged limb and can be used at full HP if injured.
  New UI indicators are linked to these same values, not placeholders.
- W20.90: Initial real-time assisted targeting uses six physical enemy hit zones,
  the actual shared stamina/AP reserve, cover-aware hit percentages, real ammo
  and weapon cooldown, and a hit-earned critical meter. Keyboard selection
  retains pointer lock; NPC simulation and player movement continue at normal
  speed so future multiplayer never requires global or per-client time scaling.
- W20.91: Real-time queued V.A.T.S. attacks reserve AP and ammo at selection,
  then fire through normal weapon timing and physical collision. A target behind
  cover or out of view is skipped rather than receiving scripted damage. Enemies
  still move and shoot while the queue executes, with no slow-motion or pause.
- W20.92: Real hit-zone damage now wounds NPC limbs. Leg damage slows tactical,
  patrol and search movement and gives the shared actor rig a visible limp;
  arm/head/chest trauma reduces live weapon accuracy. Enemy round reset clears
  these conditions. Player injuries now influence walking animation and a
  restrained first-person camera bob. V.A.T.S. shows crippled targets.
- W20.93: Character mechanics integration. Strength upgrades add up to three
  extra real backpack slots above the existing thirty; Charisma and Silver
  Tongue change exact vendor quotes, cart previews and paid/earned caps;
  Resourceful discounts both gunsmith recipes and optic recipes using one
  rounded ingredient list for UI, validation and spending. Agility and Ghost
  Runner reduce AP cost for real queued V.A.T.S. shots, while Luck speeds
  critical-charge generation from real hits. Existing saves and earned perks
  retain their IDs and unlocked status. This is an incremental integration,
  not a finished carry-weight, dialogue-skill-check or perk-tree overhaul.
- W20.94: XP requirements increased 50% at every level without rewriting saved
  level, XP or unlocked perks. Real-time target scanner projects six actual
  visible animated enemy body-part hitboxes onto the viewport, displaying
  chance, selected and queued shots, target health, range, crippled limbs and
  power-armor tier. Lost line of sight hides pins; the camera, AI and weapon
  simulation are never slowed. These are presentation improvements only;
  multiplayer server validation is still a separate future milestone.
- W20.95: Replaced equipment-slot carry limits with per-unit mass on all
  physical inventory categories and every crafting component. Normal-mode ammo
  remains weightless, as in the reference game's standard difficulty. Base
  allowance is 200 + 10 per Strength, with a field-backpack bonus and the
  effective Strength-11 power-frame boost. Loot and vendors can carry players
  over their allowance without deleting items; actual movement loses sprint
  and jump, slows down and drains real stamina/AP. Regular and powered HUDs,
  inventory, loot and vendors share the calculated mass and capacity. Old
  saves load without truncating above the previous 30/34-entry slots.
- W20.96: Six additional physical supplies expand the original medical-aid
  catalog with food, clean and contaminated water, and three timed chems.
  Food and water use real health and radiation rules; irradiated provisions
  reduce effective maximum HP through the same saved radiation state. Combat
  stimulant modifies the actual damage calculation, focus tonic modifies
  cover-validated V.A.T.S. hit chances, and Rad Shield reduces world radiation
  entering the same dose/HP pipeline. Active effects cannot be stacked, count
  down only while playing, survive reloads and clear on death. DOC VALE
  buys/sells these supplies from finite stock; HUD and status screens present
  the single active-effects state. This is normal-mode aid behavior; separate
  hunger/thirst survival difficulty is not implemented yet.
- W20.97: Eight original, weight-bearing junk objects now have predictable
  component breakdowns and arrive via enemy loot and WREN's finite trade
  inventory. At Haven Junction the inventory Junk tab transfers objects to
  a settlement stash, permits withdrawal and manual scrapping, and holds
  separated components without increasing player carry weight. Local weapon,
  optic, settlement-building and power-armor repair recipes may automatically
  break down stored junk through a common transactional crafting operation.
  Failed recipes have no effect on inventory, stored resources or buildings;
  successful crafts retain unused yielded parts in the workshop. Stash saves
  migrate from existing settlement version 5 without resetting other state.
  Distinct custom in-world item meshes and a dedicated physical workshop
  container are still needed in the later presentation/world pass.
- W20.98: The character terminal now inspects actual inventory stacks and
  crafting yields, sorts and searches without mutating the backpack, and
  displays live SPECIAL, level XP, radiation-reduced health cap, AP, and armor.
  Journal filters use the actual active/completed campaign states and preserve
  quest tracking. The existing explored map gains a discovered-places roster
  with real saved waypoint controls and return navigation to the terminal;
  unexplored points remain hidden. The world map is still a testing-field
  map, not a completed original open world.
- Remaining Phase 1 work: visual QA and polish for targeting presentation,
  multiplayer-authoritative validation when networking is implemented,
  scenario-based visual verification,
  fuller injury reactions and world art polish.

## Non-negotiable design rules

1. **Systems must be real.** Never show a gauge, perk, object, settlement stat, companion, NPC animation or quest choice as a working feature if it is only decorative. Prototypes must be labeled as such in developer-facing testing, not disguised in gameplay.
2. **One unified RPG.** Exploration, loot, crafting, combat, character growth, dialogue, factions, settlements, power armor and quests share the same persisted character and world state. No parallel simplified version of a mechanic for another screen.
3. **Physical consistency.** Visible terrain, rooms, doors, buildings, furniture, weapons, walls, rooftops and cover match the colliders and interaction points. AI cannot see or shoot through an opaque obstruction. A gun fires from its muzzle; an animated body carries and aims that gun.
4. **Keep player choices.** Any object that can be stored, scrapped, equipped, sold, upgraded or broken must actually change game state and be recoverable according to its rules. Quest decisions have persistent consequences.
5. **No unrelated additions.** Before adding a mechanic or location, identify its role in the exploration → encounter → loot → repair/craft → progression → quest/settlement loop. Prioritize missing core gameplay over novelty.
6. **Testing is separate from the world.** Keep the existing systems lab as a feature-test space. The campaign is a coherent authored region, not an arena full of tutorial placards and isolated demonstrations.
7. **Save compatibility and performance.** Older character, inventory, power armor, vendor, faction and settlement saves must migrate. No destructive save reset. Keep the browser target usable on modest hardware.
8. **Art direction.** Grounded, modular, layered, weathered retro-industrial wasteland construction. Proportions come from physically sized kits and common attachment points. No featureless cubes standing in for finished models.
9. **Honest status.** Mark features as implemented, incomplete or absent based on running behavior and tests. Do not call a feature finished solely because its UI or data model exists.

## Core gameplay contract

| System | Final expected behavior | Current audit as of W20.84 | Required follow-up |
| --- | --- | --- | --- |
| World and exploration | Connected, authored wasteland with realistic traversal, unique neighborhoods, interiors, ruins, wilderness, lootable and unlootable buildings, weather/daylight, discovery and fast travel | Testing range and Haven workshop plus procedural set dressing; field map and discovery exist | Author one dense, navigable vertical-slice region before adding a huge map. All doors, containers and discoverable places need persistent states |
| Character progression | Seven SPECIAL attributes, meaningful multi-rank perks, XP/leveling, derived stats, action points, character decisions | W20.93 ties the seven stats and twenty-one existing perks to implemented sandbox systems; deeper skill checks, rank variety and broader game interactions remain incomplete | Extend checks to dialogue, settlements and world activities as those systems mature |
| Health, radiation and injuries | Incoming damage, armor resistance, healing, radiation pressure and treatment, limb condition, consistent death/respawn | Health/armor/death exist; **power-armor radiation gauge is forced to zero** in `testing/main.js` | Implement physical radiation exposure and treatment and connect it to max-health, items, save data and both HUDs; then injuries |
| Combat and VATS-like targeting | Responsive movement, stamina/AP, weapon handling, distinct firing modes, damage zones, criticals, target selection with AP cost | Gunplay, recoil, aiming and enemy damage exist; no integrated VATS-like targeting subsystem identified | Create a standalone, testable targeting/AP mechanic only after health/ammo/weapon foundations agree |
| Enemy AI and animation | Perception based on sight/sound and memory; believable search, cover, corner peeks, muzzle alignment, navigation, reactions and animation transitions | Squad/cover/aim modules exist; visual and physical quality varies with scenario | Add scenario regression maps and tests, especially chest-high cover, doorways, rocks and coordinated movement |
| Equipment and loot | Categorized inventory, weight/capacity, clothing/armor slots, ammo, junk components, inspection, equipment effects, container transfers | W20.97 adds weight-bearing junk objects, exact recipes and saved workshop deposit/scrap/withdraw transactions on top of W20.95. Full junk-object 3D meshes and deeper inspection are still incomplete | Add unique item meshes and a physical workshop storage interface; audit crafting and carry weight in actual play |
| Crafting and workbenches | Salvage junk into individual components; weapon/armor mod benches, upgrades with real stats, repair and recipe dependencies | Weapon workbench and material recipes exist; power armor service exists | Tie workbench objects to usable crafting categories; prove models, upgrade effects and scarcity end to end |
| Power armor | Persistent physical frame, six replaceable plates, fusion-core charge, entry/exit, heavy movement, armor condition, damage resistance, servicing, last-worn frame map tracking | Many mechanics exist; animation/model quality still needs visual QA | Test entry/exit and station docking with and without plates, different frame positions, broken limbs and depleted cores |
| Settlements | Workshop radius; categorized construction; floor-wall-roof fitting; scrap and store; grid/edge snapping; resources, jobs, wires, residents, attacks, happiness, storage and recruitment | Build catalog, object storage/scrap, snapping, basic production and happiness already exist | Add electricity wiring and assignment of actual settlers; tie production/happiness to jobs and time; add settlement attack and repair loops |
| Vendors and economy | Named physical vendors, goods and finite stocks, barter with clear confirmation, merchant schedules/roles, prices tied to character/faction | Vendor actors, finite stock and barter UI exist in lab | Connect merchant availability to the world, factions and authored locations; remove placeholder stalls when real models exist |
| Dialogue and quests | Conversation with NPCs, choice, skill checks and quest flags; branching main/faction/side quests with real world actions and consequences | Persistent faction journal and station-based quests exist | Build one multi-stage quest with original conversations, explorable location, combat/noncombat solution, permanent changes, rewards and companion reaction |
| Companions and settlers | Followers with movement, dialogue, combat help, inventory, commands and relationships; settlers have jobs and routines | No complete companion lifecycle found in audited files | Build a single reliable companion before introducing a roster |
| Presentation and audio | Cohesive contextual HUD, readable inventory/status/quests/map, expressive animations, believable ambient/spatial audio and transitions | Multiple working UI panels and many custom visuals, still visibly prototype-like | Define an interface style sheet and verify each world-to-menu transition in live play |

### Acceptance gates, not feature labels

Every system passes these five gates before it is marked **implemented**:

1. **Behavior:** feature operates in the world through normal player input; no admin shortcuts required.
2. **Visual:** visible object, animation, UI and physical dimensions correspond to the behavior.
3. **Integration:** the feature affects inventory, combat, quests, economy, AI or settlements where appropriate.
4. **Persistence:** save/reload and death/respawn produce intended outcomes without duplication or data loss.
5. **Verification:** deterministic module tests and at least one documented in-game scenario. User playtesting feedback is recorded as a failing case when it identifies a defect.

## Delivery order

### Phase 0 — Existing-game audit and preservation (current)

- Capture a release baseline, unit test suite and feature inventory. Identify present-but-fake indicators, broken cross-system links, inconsistent controls and placeholder visuals.
- Keep W20.84 and user saves intact. Do not rewrite or delete the whole RPG without a validated replacement.
- Convert the most serious known bugs into reproducing tests.

### Phase 1 — Player and combat foundation

- Complete health, radiation, healing, injuries, AP/stamina, armor and carry systems with coherent HUD effects.
- Audit SPECIAL/perk effects and weapon/ammo/mod costs. Finish target selection and critical mechanics.
- Improve character/weapon animations and AI collision, cover, sights, physical aiming and death.

### Phase 2 — Usable world and interaction

- Build an authored small playable region with traversable roads, terrain, interiors, scavengable locations and interaction prompts.
- Link map discovery, quest routing, NPC travel, containers, combat encounters and fast travel to that region.
- Replace test-station presentation with diegetic world objects; retain separate systems testing.

### Phase 3 — Settlement and economy simulation

- Bring construction pieces onto one dimensional grid, improve model quality and workshop controls.
- Connect real power wiring, assignment of people to crops/water/defense/shops, supply and happiness changes, recruitment, storage and attacks.
- Tie junk components, shops, crafting stations, power armor resources and quest rewards to the same economy.

### Phase 4 — Faction campaign and followers

- Write original dialogue and build multi-solution questlines with real local/world changes.
- Add one polished follower and meaningful faction behaviors; expand only after persistent quest/relationship tests pass.

### Phase 5 — Visual/audio/world polish and release QA

- Replace scaffolding geometry and placeholders; tune world atmosphere, animation blending, ambient sounds and contextual interfaces.
- Performance profile in the browser and complete save migration, progression and interaction regression runs.

## Immediate priority decisions

- **Stop adding new decorative menu categories or unrelated objects** while radiation, interaction, world integration and NPC behavior have known gaps.
- **Do not enlarge the map yet.** Improve one believable region where all core systems connect.
- **Keep the existing game and W20.84 save data.** Refactor modules and visuals incrementally with migration tests.
- **Use Fallout 4 as a mechanical/interaction reference, not a source of copied meshes, dialogue, map layouts, characters or quests.** The game retains an original identity.

