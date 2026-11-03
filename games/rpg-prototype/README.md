# Untitled RPG · Mechanics Lab W19.4 + Forest Foundation 0.1

## W19.4 — Combat Comfort, Protective Gear, and Low-FPS Cleanup

- Sustained view recoil is capped at approximately five degrees, individual shot kicks are softened, and both camera recovery and weapon model return use real elapsed time. This prevents the gun or aim from hanging at an exaggerated offset at low frame rates while retaining distinct heavy-weapon recoil.
- Every rotating Scout, Raider, and Enforcer outfit now has an actual helmet. The formerly helmetless Scout variant has a Ranger helmet; two 38-damage revolver headshots no longer kill a fresh NPC just because of its randomized outfit. Each helmet remains a real visible armor mesh with matching damage reduction.
- Dead enemies fade on real time rather than slowed physics ticks. Browser smoke tests poll expensive state snapshots less often; QA assertions were updated to use the current reload and timing behavior.

## W19.3 — Weapon Reload Fidelity and Interruption

- Shotgun, hunting rifle and six-shooter now **seat ammunition round by round at the same points their mechanical reload animation shows it**. Starting a reload with one missing shell takes less time than loading an empty weapon. Magazine-fed pistol, SMG and service carbine remain complete magazine swaps.
- Pulling the trigger can interrupt an unfinished shell/cylinder/bolt reload once at least one round is loaded. Switching weapons cancels an in-progress reload and keeps already inserted rounds; no reserve ammo is duplicated or silently refilled. Ammo capacity and damage values are unchanged.
- First- and third-person animations use the real number of shells being loaded rather than showing six phantom insertions every time. HUD progress, sound timing and reload speed perks use the actual duration. Regression tests cover cancellation, partial loads, top-ups, frame-step consistency, and preservation of magazine reload behavior.

## W19.2 — Frontier Rebuild (mission, model, AI and terrain quality pass)

- Added **Haven's First Light**, a persistent four-step main quest: diagnose the Haven Junction generator, repair its bus with salvaged parts, defend the work crew from the Raider, and decide who controls the repaired grid. The choice changes faction reputation and rewards. Completing it physically lights the generator and its station.
- Added **The Last Broadcast**, a three-stage side story with evidence collection, corroboration against Dominion orders, and a publish-or-bury choice. Original four quests and existing saved progress remain compatible.
- Mission dialogue reacts to your progress and past choices rather than repeating one line. The restored electrical bus visibly lights Haven Junction, including its overhead cable and street lamp; the relay also changes faction color after Dead Signals.
- Three key campaign contacts now have in-world articulated survivor models and idle/turn reactions. Contacts retain their usable stations, but the old always-visible floating name sprites are gone; nearby interaction prompts remain. Relay, courier, water and generator stations have distinct mechanical detailing.
- Quest contact stations were moved out of the live weapon and sprint test lanes to prevent scenery from stealing hits or blocking movement. Tracked mission objectives display approximate distance to the next location, refreshing while exploring. The journal still uses Q, conversations E, and all rewards and decisions are saved locally.
- Built original tiled cracked-ground material and hid the development grid by default (toggle with F3), while keeping the collision, station markers and existing scrap scenery.
- AI now investigates a *new audible gunshot* even with old last-seen memory. Hearing does not grant perfect sight; after the noise fades, NPCs resume their earlier search. Character step phase now follows distance traveled so idle or slow movement does not animate impossible running legs.
- Expanded campaign, AI, animation, source and real 3D browser smoke checks. Existing shooting, loot, power armor, faction saves, and REDLINE are unchanged in their authoritative mechanics.

## W08.0 — real powered exoskeleton and six-slot suit

- Station 8 now contains a visible, original low-poly hydraulic power armor chassis with a mechanical rib frame, opening chest doors, hinged helmet, arm and leg servos, pistons, and a glowing power core.
- Six independently fitted panels—helmet, torso, both arms and both legs—visually change or disappear with the loadout. The editor offers an empty frame plus Salvaged Steel, Ranger Composite and Citadel Reinforced plates.
- Walk up to the frame and press **P** to enter it; press **P** again to exit. Entry and exit are timed (1.65 seconds), with the suit visibly opening and closing. **O** opens the power armor editor; the main menu has a direct Power Armor Bay button.
- While inside, a first-person mechanical cockpit appears and incoming NPC hits use normal armor plus the chassis and the equipped power plate on the struck body area. The chassis protects even if all its plates are removed.
- The suit is parked in the game world when exited, not left permanently equipped. Plate settings and occupancy survive page reloads; interrupted animations are safely discarded on load.
- The first pass supplies QA plates through the editor rather than enemy loot; Fusion Cores, powered locomotion, durability, and merchant access are later milestones. Unit and real 3D browser tests cover state, damage, plate visibility, opening doors, entering/exiting, and save/reload.


## W07.1 — cleaner scope reticle and clearer duplicate loot

- The hunting-rifle and compatible marksman scopes retain their real 3D reticles, but the four fine arms have a smaller 0.006 m center gap instead of 0.026 m. Their pale lines are 66% opaque to keep heads visible through the center.
- Weapons and armor have always been eligible to drop in multiple copies; each non-stackable copy occupies one of the 30 backpack slots. W07.1 labels copies separately (COPY 1 / 2, etc.) and shows the exact owned quantity immediately after pickup.
- The loot panel reports when the 30-slot backpack is full, so a denied pickup is explained rather than showing an invisible notice behind the overlay.
- A browser gameplay test now loots two identical Pipe SMGs from separate raider bags, sees the duplicate count, and confirms both survive a full reload. Pure inventory tests cover three copies and dropping one without losing the rest.


## W07.0 — optics workbench and reliable aim

- At Station 7, approach the physical optics bench and press **E**, or press **U** in the field. You can also use **WEAPONS WORKBENCH** from the menu.
- Scavenge **Salvaged Parts** and **Optic Glass** from enemy loot bags. Craft compatible Holo A/B sights or 2×, 4× and 6× magnified rifle scopes. The hunting rifle supports all of them. You only pay for each sight once per weapon; owned optics can be switched freely.
- Installing a sight rebuilds that weapon's actual first-person optic geometry. Scoped ADS changes the real camera field of view, not merely a HUD reticle. Weapon-specific selections survive reloads.
- Standing still while aiming now zeros the center projectile for every single-projectile firearm; shotguns center one pellet while keeping seven scattered pellets. Hipfire, walking, jumping and sprinting still affect precision. The firing ray is computed from the same camera-space sight line.
- Unit tests cover sight compatibility, crafting material consumption, persistence and zeroed ADS. A headless 3D browser test also crafts a 4× scope, reloads and measures the magnified FOV.


## W06.7 — longer-range enemy sight and return fire

- NPCs can detect exposed targets up to 45 m instead of 22 m. Combat ranges are Scout 32 m, Raider 37 m and Enforcer 42 m instead of 13–14 m.
- Shots that land from outside the arena activate an alert engagement. Enemies return fire while they see or remember the attacker, but cannot attack from other stations without first being provoked.
- Enforcers suppress from clear 16–35 m sightlines instead of rushing blindly, while faster Scouts/Raiders keep closing and maneuvering.
- Accuracy remains distance- and movement-dependent; obstacles still interrupt visibility, and ammo/reload rules remain active.
- Added unit and real 3D browser checks for long-range sight, cover, firing, and aggression after a distant hit.

## W06.6 — remove misplaced orange collar marker

- Removed the bright orange shoulder identification strip that crossed the neck/chest and looked like a floating bar.
- Kept the solid neck hitbox, modular armor meshes, loot drops and ground beacons unchanged.
- Loot is now limited to a random subset of equipped armor: Scouts drop zero or one piece, Raiders one or two, Enforcers zero or one. A fully suited Citadel enemy no longer drops all six pieces.
- The actual 3D NPC armor is still the source of eligible drops; no invisible or unworn armor appears in the bag.
- Added regression coverage for the orange strip and partial armor drops, including a browser loot/equip/save test.

## W06.5 — varied, visible, lootable armor equipment

- Every enemy now spawns with a role-appropriate, six-slot modular armor outfit. Press J to rotate prebuilt outfits for consistent testing, including a lone leg plate and a complete armored suit.
- Meshes for helmets, chest plates, both arms and both legs reflect the actual equipped armor. Unworn plates are invisible and cannot intercept bullet rays; armor colors match material types.
- Loot bags can contain armor pieces from the enemy's real outfit, plus weapons, ammo and supplies. W06.6 limits how many pieces survive as loot. The pieces remain equippable and affect their body zones.
- Both inventory and browser tests verify visible equipment, changes on reset and matching dropped contents. The previous W06.4 distant-body and neck fixes remain.

## W06.4 — distant AI updates, death cleanup and neck hitbox

- NPC patrol and hit reactions continue outside the arena; enemy attacks remain limited to an active encounter to keep other mechanics stations safe.
- Defeated enemies immediately clear the red damage flash, collapse for 0.7 seconds and despawn without requiring the player to approach. Loot bags remain searchable.
- A solid neck collider connects the chest and head geometry. It uses chest damage and armor to preserve helmet balance.
- Source-level and real 3D browser regressions check distant patrol, defeat cleanup and neck shots.

## W06.3 — saved weapon startup crash
- Fixed a user-reported error: "Cannot access 'slideCycle' before initialization". A returning player with a saved non-default weapon triggered `selectWeapon()` during startup, before the `let` declarations for slide/recoil/shot-notice/HUD state, so JavaScript stopped loading before the 3D field appeared.
- Initialize all weapon visual, announcement and HUD values before restoring the selected weapon from the persistent backpack. The new real Chromium smoke test equips the Pipe SMG from looted gear, reloads the full page with the saved inventory, and confirms that the correct weapon and armor restore without an error overlay. Source-level tests also pin this initialization order.
- No changes to software WebGL fallback, recoil tuning, NPC armor, loot transactions or forest exploration.

## W06.2 — startup compatibility and truthful browser diagnostics
- The user's normal Edge browser displayed a generic WebGL failure. Previously, *any* JavaScript error or rejected promise displayed the same "could not initialize WebGL" banner, even when the real issue was unrelated. The fatal panel now shows the reported startup error and asks for the first Console error.
- The 3D Mechanics Lab now requests a standard WebGL 2 renderer with no mandatory high-performance adapter or major-performance-caveat failure; if that fails, it retries without multisampling using low-power preference. On fallback it starts at 1x pixel ratio, with shadows disabled and UI quality marked LOW to reduce software-rendering load.
- Hardware acceleration is **not** required by application logic, but this Three.js version still needs the browser to provide a WebGL 2 context, including any supported software backend. It cannot render if the browser disables WebGL 2 entirely. No gameplay or forest-world behavior changed.

## W06.1 — upward camera recoil + enemy helmet balancing
- User-reported bug fix: `kickViewRecoil` previously subtracted camera pitch, which points DOWN in Three.js YXZ view coordinates. Gunfire now adds positive pitch to kick the aim upward; the same capped, damped recoil naturally recovers down to the original viewing angle without affecting yaw or roll. Regression tests assert the correct direction, restoration, rapid-fire cap and upper pitch limit.
- Scouts now wear Scrap Iron head protection and Raiders wear Ranger Guard helmets, while Enforcers keep full Citadel armor. NPC loadouts are independent of the intentionally bare/light/heavy armory dummies. Existing helmet geometry is automatically rendered and matched to the raycast head damage zone. Two 38-damage revolver headshots can no longer defeat any of the three enemies, while headshots still outdamage torso hits.
- No changes to the player's inventory, weapon base damage, armor damage formula, enemy AI behavior or forest exploration. W06.1 awaits user gameplay confirmation.

An isolated first-person 3D prototype for GAMESHUB. The game has no permanent name yet.

## W06.0 — world loot, 30-slot player backpack, armor, ammo and supplies
- User approved a full RPG Loot & Inventory first pass. Every NPC defeated in Station 9 spawns an independent glowing world loot crate that persists after the 0.7s corpse despawn. E within 2.7m opens a searchable loot UI with per-item TAKE or TAKE ALL; partial fills leave the uncollected items inside. J resets enemy rounds and cleans up leftover bags but does not wipe the player backpack.
- I opens a 30-slot saved backpack (`localStorage`), showing item quantities, rarity tiers (common, uncommon, rare, epic) and cap values; stacks use finite caps and overflowing quantities stay in the loot bag. DROP creates an interactable ground bag. All items are validated against the same catalog when restoring saves.
- Loot includes original weapon catalog entries (actual weapon model via EQUIP), ammo stacks that transfer into their real weapon reserves, medkits restoring 40 HP up to maximum, salvaged supplies, and six-slot armor items matching existing `combat.mjs` armor piece IDs. Equipped player armor reduces enemy chest shots using the same armor reduction formula used on practice dummies.
- Existing six test weapons remain unrestricted to avoid removing approved combat testing. B is still the separate dummy armor sandbox; the new player inventory equipment is a genuine new system, not a replacement.
- Drop tables: Scout gives SMG ammo, medkit and salvage; Raider gives Pipe SMG, ammo and ranger chest armor; Enforcer gives Service Carbine, ammo, militia chest armor and medkit. Deterministic drops allow reproducible W06.0 tests; random rarity-based loot is a future tuning phase.
- New `inventory.mjs` pure, render-free catalog and transaction module, independent item quantities and equipment; the browser suite tests actual 3D loot bag generation, approach, search, TAKE ALL, equipped weapon and armor while preserving existing AI, damage and empty-trigger smoke checks.
- W06.0 remains awaiting user visual and gameplay approval.

## W05.4 — coordinated enemy AI with cover peeking and role-based combat
- The next priority after W05.3.1 was user-approved enemy AI overhaul. Scout is now a wide flanker, Raider a medium-range skirmisher, and Enforcer a steadier supporting anchor. Their movement goals use distinct offsets, speeds and reload/accuracy profiles, with separation forces to prevent stacking.
- New `enemy-squad.mjs` broadcasts **last known player positions** to nearby allies when an enemy first sees or takes damage from the player. Allies investigate but may not fire without their own verified line of sight. Intel expires and freezes while AI is paused; J resets it.
- NPCs reserve cover positions from teammates to avoid three characters piling up behind the same crate. Cover AI detects failed movement/stuck paths and temporarily tries a different obstacle.
- NPCs who crouch behind protective cover may now **stand, peek around a real exposed corner, shoot if unobstructed, retreat and crouch again**. Sightlines, collision, movement bounds, reload limits, and real moved body hitboxes are retained. Player flanking still invalidates stale cover.
- Visible ready/aim, peeking lean, reload weapon dip and brief weapon recoil poses help communicate enemy behavior. NPC labels include FLANKING, SUPPRESSING, PEEKING and PEEK & FIRE.
- New deterministic squad and tactical simulations test role differences, cover selection, crowding, peek/return sequence and stuck detection, in addition to existing headless browser tests verifying the 3D scene loads, enemies move, gunshot reduces enemy HP and empty-fire buzz is gone.
- Approval requires manual browser playtest; the tactical AI remains arena-scale (not yet production navmesh, animated skeletal characters, or multiplayer).

## W05.3.1 — one dry-fire click per empty-magazine trigger pull
- Fixes user-reported loud buzzing when holding down the trigger on an empty automatic gun. Previously `frame()` called `shoot()` every animation frame for the SMG and carbine, and every empty result called `sound.dryFire()`, stacking dozens of high-pitched audio pulses per second.
- Add an `emptyClickLatched` trigger-edge guard in live game code. The first attempted empty shot sounds once; no repeated empty sounds occur until the player releases and pulls the trigger again. Reloading, weapon switching, restocking and pointer-lock cancellation clear the latch. Genuine fired rounds still clear it and behave normally.
- Extend the actual headless Chrome gameplay test: start the SMG with a one-round CI-only test fixture and hold through the final shot, verify exactly one dry-fire event despite extra hold time, verify a second intentional trigger pull sounds once, then reload and confirm firing resumes. Existing AI movement and bullet-damage browser checks remain.
- All six weapon profiles, sound synthesis, armor, AI, 3D models and ADS unchanged. Manual browser test still required for final approval.

## W05.3 — fix inactive arena AI and enemy damage, with real browser smoke tests
- After W05.2, user reports guns shoot but AI never takes damage and bots do not function. Root cause found in shared station-gating: `inAIArena()` only checked `stationIndex===8`. Enemies are always rendered and may be approached on foot or via the W05.2 direct Station 7 link, but their AI was disabled and enemy meshes omitted from player raycasts outside station ID 9.
- Introduce `arena-activation.mjs` containing pure, testable physical-zone detection plus persistence of existing Station 9 behavior. The in-game AI simulation engages when the player actually enters arena coordinates, regardless of previously selected test station.
- Every living and visible NPC now remains in the weapon raycast hit list independent of station mode. Dead bodies are still excluded. Existing line-of-sight, cover behavior, armor and finite ammo stay intact.
- Add a plain-language `enemyMode` status showing AI ACTIVE, paused pointer lock, frozen via K, player down, all enemies down, or not in arena; so in-game bugs are easier to diagnose.
- Shotgun multi-pellet impacts now summarize confirmed damage after all pellets are processed rather than displaying the **last pellet MISS** and obscuring earlier successful damage.
- Add a **real headless Chrome WebGL gameplay smoke test** (local Three.js, real game page, pointer lock, enemy movement and pistol damage) and run it as a blocking GitHub Actions job alongside existing unit tests. Read-only smoke instrumentation exists only with `?smoke=1`.
- Manual live Cloudflare Pages browser confirmation still required. W05.2 weapon model fidelity is not considered separately approved.

## W05.2 — comprehensive weapon QA, sight obstruction and model consistency
- User reports the Iron Six-Shooter has a button on top obstructing ADS, and requests fixes across **all six guns, including the Worn Scrap Pistol**. W05.1 remains unapproved pending direct visual retest.
- **Revolver optics/cylinder**: lowered its raised top strap from top y≈0.1645 (essentially identical to sight y=0.165) to y≈0.1235; relocates cylinder-release latch off the centerline; rotates the cylinder along the muzzle direction instead of across the frame; corrects visible chambers. Retains an unobstructed rear notch and front blade geometry.
- **Pistol irons**: narrows the far-too-wide rear notch so the front blade is properly framed, and marks the precisely centred front sight as an intentional alignment reference.
- **All weapon ADS QA**: a camera-centred raycaster inspects only the currently equipped first-person model while aiming; the weapon HUD reports `ADS SIGHT LINE CLEAR` or `ADS BLOCKED · MODEL OBSTRUCTION`. Only the intended optical reticle or front-sight tip is excluded from obstruction detection; flashlight/muzzle particles are ignored. This is a runtime diagnostic and still requires real browser QA.
- **Reload visuals corrected**: revolver and pump shotgun do not display fake detachable box magazines; revolver exposes a swing-out cylinder during reload and shotgun displays shell-feeding motion plus an animated pump. Existing timed ammo mechanics and animations remain intact.
- **Brass ejection**: previously all guns spawned casings from a hard-coded pistol camera offset, even on rifles. Now uses each equipped viewmodel's local receiver ejection port transformed into world space; revolver brass is retained during firing.
- **Sound variety**: firearm archetypes have distinct synthesised gunshot envelopes and reload cues time against their real weapon reload duration instead of the pistol's fixed duration.
- Preserves the original pistol weapon parameters, six-weapon selection and independent ammo states, ADS math, 8-pellet shotgun damage, player HP, armor, enemy systems and other stations. Adds regression tests for viewmodel geometry and behavior, the ADS clearance HUD, shell ejection and sound signatures.
- Manual browser visual confirmation is required; do not mark W05.2 as approved based on CI alone.

## W05.1 — weapon viewmodel quality, lower optics and calibrated ADS
- Fixes user playtest complaints: the six W05.0 weapons were too blocky, optical sights sat very high above the receiver, and ADS did not match the actual bullet trajectory. The prior shared ADS offset (x=0, y=-.176) was wrong for optics mounted at different y positions and the rifle scope tube was solid.
- Adds `weapon-sights.mjs`: six explicitly calibrated 3D sight mounts with their actual x/y/z positions and per-optic ADS FOV; `adsWeaponPosition()` makes the physically modelled sight center x=0,y=0 in camera space. Each weapon enters ADS at this exact position, with recoil recovery tracked by the camera rather than shifting the optic off center.
- Gun sway and root rotation are disabled while aiming (outside reload). This ensures an optically centered iron sight, holo/red-dot or rifle scope corresponds to the center of the same camera-ray used by the firing raycaster. For the hunting rifle and carbine, base ADS dispersion is reduced so aimed shots more closely track sight center; shotgun still shoots realistic multi-pellet scatter.
- Hunting-rifle optic is now a hollow, open-ended tube with correctly oriented front/rear rings in the camera-facing XY plane, a low mount, and center reticle. Carbine and SMG use small low-profile holographic/reflex frames, while revolver/pistol/shotgun use physically matched-height iron sights. All optics are model geometry rather than a fake UI overlay.
- Replaces the five W05.0 additional gun constructions with custom extruded/chamfered receiver profiles and identifiable handguards, furniture, barrel groups, metal accents, magazine/grip/trigger details. Pistol gets extra metal slide and grip detailing while keeping its proven animations.
- All existing six weapon types, firing modes, separate magazine states, pistol/shotgun damage, six-slot armor, AI arena, controls and testing stations remain. W05.1 is not approved until the user's in-browser evaluation of actual model quality and sight picture.
- Unit tests assert per-weapon ADS mounts truly center their geometry, optic heights are bounded and the hunting rifle/carbine maintain low ADS dispersion. Source integration tests ensure the real mounts and hollow scopes are wired correctly.

## W05.0 — six-weapon selectable arsenal, weapon variety priority
- The user reports that current enemies still feel weak and there's only one weapon. This milestone prioritizes a **meaningful arsenal** over more unapproved enemy tweaks; a deeper AI overhaul will follow user playtesting.
- Adds six playable weapon archetypes: original Worn Scrap Pistol (unchanged defaults), Iron Six-Shooter revolver, Pipe SMG, Service Carbine, Scrap Pump Shotgun and Wasteland Hunting Rifle. The roster is authored in shared `weapons.mjs`, each with unique damage, magazine, reserve, rate of fire, recoil, hipfire/ADS spread and reload.
- Add a weapons selector on the launch menu plus **Z/X to cycle in game**; HUD displays selected name, fire mode, DPS-related stats and ammo. A separate state per weapon prevents ammo and reload from carrying across switches.
- SMG and carbine fire automatically while mouse button is held; pistol, revolver, shotgun and hunting rifle use semi-auto fire. Shotgun fires **eight independently spread pellet raycasts for one consumed shell** with actual armor/damage by hit zone.
- Create five new first-person 3D procedural models with independent receiver, barrel, sights, grips, stocks, magazines and muzzle lights. Original pistol model is preserved. All views use sway/ADS/reload/flash and player movement, and the former per-weapon reload duration now drives each animation.
- W04.2.1 enemies, modular armor, projectile effects, and other RPG test stations remain intact. W05.0 is not considered approved until user browser-tests model switching, automatic bursts, shotgun pellets, reloads, and distinct damage.

## W04.2.1 — cover on the far side of crates + actual enemy crouching
- Fixes user playtest feedback: raiders sometimes chose the face of a crate toward the player and had no crouch ability. The cover sampler now checks each candidate is on the **opposite side of the obstacle from the player** and the player-to-destination line intersects the crate's **interior**, not merely a grazed corner.
- On each tactical update, the existing cover location is revalidated against the **player's current position**. If the player flanks around the crate, the enemy exits crouch, selects a new sheltered side and repositions.
- Enemies now actually **crouch on arriving at sheltered cover**: 3D chest/head/arm meshes are under a moveable upper-body group that sinks by ~0.82 m, leg pivots bend and compress, rifle/shoulder markers follow the upper body, and label position follows stance. The raycast uses these same moved head/torso/limb meshes, so crouching behind a 1.45 m-high crate shields their hitboxes instead of merely changing the label.
- Low or unsuitable objects cannot qualify as true crouch cover. The W04.2 reload, strafe, damage, permanent armor and death/respawn systems remain; **J** resets crouch fully. Tests cover player-side vs far-side shelter, flanking reacquisition, low cover rejection, real movement and lowering of hitbox geometry.
- Versioned client script is **W04.2.1**; manual browser playtest is required.

## W04.2 — advanced tactical combat, cover, repositioning, magazines, accuracy
- Station 9's Scout, Raider and Enforcer now use `enemy-tactics.mjs`, a deterministic and independently tested tactical combat layer. Their different magazines, reload duration, movement speeds, shot intervals, distance-dependent hit chance and side-to-side repositioning can be tuned separately.
- **Finite ammo magazines**: every NPC shot removes one round. At zero it automatically begins a timed reload, during which the NPC cannot shoot. Reserve ammunition is tracked. Reload timers pause with **K** or when the arena is paused. **J** resets ammo, reload state, health, AI and accuracy counters.
- **Cover system**: being shot makes an enemy seek the back side of a real arena crate, with cover candidates tested for line-of-sight occlusion and collision. Reloading enemies also favor cover. A basic corner detour guides around solid obstacles. NPCs briefly stay in cover and then reposition when the threat wears off.
- **Combat movement**: hostile NPCs alternate lateral strafes to avoid standing still, with speed dependent on NPC type. The existing AI brain accepts optional combat movement/hold goals without changing station 1–8 movement, patrols, chase/search rules or visibility fixes.
- **Accuracy & player health**: each shot now makes a real accuracy roll; distance and movement lower hit chance, and missed tracers visibly pass the player without reducing health. Shots still require a valid range and clear view. Enemies show STRAFE, SEEK COVER, IN COVER or RELOAD and magazine ammo in floating labels and the combat HUD.
- All prior W01–W04.1.2 systems are preserved: six-slot permanent armor, pistol/recoil, player HP, dead raider cleanup, depth-correct rings/labels, and separate RPG forest scene. Enemy combat remains a controlled test arena, not final animation/navmesh AI. Manual browser testing required for approval.

## W04.1.2 — enemy elimination cleanup and proper wall occlusion
- Responds to visual browser feedback showing 0 HP raiders piled into permanent geometry, plus orange rings, nameplates and the arena locator drawing through concrete walls.
- On a lethal pistol hit the NPC is immediately marked inactive, stops shooting, hides its orange torus, shoulder indicator and independent world-space health/nameplate sprite. A short **0.7-second** collapse runs, then the entire body group is hidden. Dead hitboxes are still excluded from pistol raycast, and no kill-spawn debris or permanent static spawn pads remain. Press **J** to completely restore every character, hit zone, marker, full HP and patrol state.
- The old ground pads were unrelated to enemy lives and could not be removed when their owner died. Those static pads are deleted; each living NPC has its own marker, which hides immediately on death.
- Previously the enemy torus, shoulder stripe, nameplates and arena sprite all used `depthTest:false`, making them draw through walls. These now explicitly enable depth testing; world-space damage popups and stationary dummy labels are also occluded correctly. No scene-world overlay bypasses depth testing.
- The arena sign and HUD now show the **actual number of raiders alive**, decreasing with each kill and restoring on J. Cached JS version advanced to **W04.1.2**. CI integration smoke assertions cover exact death cleanup wiring, depth testing and reset behavior. Manual browser test is required for visual approval.

## W04.1.1 — reliable station 9 entry and visibility diagnosis
- Second user report confirms enemies are still not seen even after W04.1. The Three.js source contains all three enemy groups, but we cannot verify the Cloudflare browser render from GitHub CI alone. This pass adds explicit debug affordances rather than calling the problem resolved without browser confirmation.
- NPC groups and their nameplates are **always rendered in the 3D scene**, independently of which station is selected. Their AI still runs only in station 9, avoiding any behavior change in stations 1–8. Direct **ENTER ENEMY ARENA DIRECTLY** action resets position, faces the scout using computed camera bearing, and engages pointer lock with no keyboard shortcut required.
- A large bright 3D "3 RAIDERS · LIVE" sign marks the arena, with orange foot pads. The in-game enemy HUD shows live NPC count and distance to nearest enemy.
- Menu shows **ENGINE READY · 3 RAIDERS LOADED** only after all three NPC models and scene have initialized. If user sees "WAITING FOR 3D ENGINE", browser loaded HTML but did not finish the JS initialization.
- Script URL uses `main.js?v=W04.1.1` to force new asset retrieval after Pages deploy. Optional `?station=9` loads directly into station 9 on page entry (click ENTER TEST FIELD afterward). Unit smoke tests verify visibility gates removed, camera faces NPCs and direct entry + diagnostics stay wired. Actual browser playtest still needed.

## W04.1 — enemy visibility fix and live player health
- Fixes W04.0 testing report of no visible enemies. Station 9 visibility is now controlled by the **selected station** rather than also requiring the player to remain inside a small world-coordinate box; enemies cannot disappear when you move across the station. All three initial spawns are now closer and in the intended forward view, with orange floor rings, shoulder identifiers, name/HP sprites and explicit 3/3 enemy counter.
- Player receives a real persistent on-screen **100 HP** health bar in the lab. A simple enemy-hit system reduces health, triggers a red damage vignette and hit notice, and can knock the player down. Press **H** to heal/respawn.
- Enemy basic test fire happens only while spotted, in range and unobstructed by station-9 crates, with per-enemy damage and cooldown. Basic enemy tracers and muzzle flashes show where damage originates. **This is not yet advanced cover tactics or a fully simulated weapon inventory/reload system.**
- Entering station 9 from another test station initializes HP and bot positions; **J** resets enemies, **K** still pauses AI and all enemy attacks, and switching stations suspends enemy visibility and updates.
- The player’s previous pistol, 96 permanent modular armor pieces, bullet effects, sounds, stamina and earlier stations are preserved. Player armor integration follows later; the current health tests use unarmored player HP.
- New render-independent player-combat.mjs and tests cover HP, death/respawn, occlusion, angle and range checks. Manual WebGL playtest is still required.

## W04.0 — enemy AI foundation (patrol / sight / chase / search)
- **Station 9** adds a small dedicated three-bot patrol arena in the northeast of the original test lab. Press **9** to teleport there; the eight approved stations remain.
- Three test raiders (Scout / Raider / Enforcer) have inert original 3D humanoid models, patrol paths, facing directions, sight distance and field of view, line-of-sight blockage by test crates, movement collision and arena boundaries.
- Enemies detect and pursue the player when visible, remember the last seen position for a short time, investigate when sight is lost, then search and return to patrol. Shooting a raider alerts it regardless of facing. Bot movements are paused when the lab menu/armory is open or when the player leaves station 9.
- The player uses the same W02 scrap pistol raycast, bullet decals, material sounds, and W03.1 six-slot permanent armor damage model against NPC hit zones, with health labels, hit numbers and defeat reactions.
- **K** pauses/resumes AI for armor and movement comparisons; **J** resets bot health/position and patrol. Buttons and HUD explicitly state **NO ENEMY GUNFIRE YET**. Enemy weapons are placeholder 3D props, not functioning firearms in this first pass.
- Enemy brain math and state transitions live in renderer-independent `enemy-ai.mjs` with Node regression tests (vision, cover occlusion, chase, investigation, collision and reset).
- **Next W04 phases:** basic reciprocal combat and player health, then cover tactics and advanced ranged behavior—subject to this pass being approved by the user's browser playtest.

## W03.1 — full modular armor overhaul (supersedes W03 armor durability)
- W03's pooled, breakable armor has been **removed**. Armor equipment is permanent until swapped, and repeated damage never reduces armor points or protection.
- Six independently equipped armor slots: **head, chest, left arm, right arm, left leg, right leg**. A bullet uses the hit part's equipped armor points; the right arm cannot borrow points from the left arm or chest.
- Sixteen authored armor styles for **each slot**, totaling **96 equippable pieces** plus No Armor in each slot. Pieces have distinct ratings, colors, and visible 3D overlays with additional high-tier plating.
- Damage blocking follows `armorPoints / (armorPoints + 25)` capped at 85%. Higher armor yields materially greater protection; head damage 2.5x, chest 1x, arms/legs .7x remain.
- From the main menu choose **CUSTOMIZE ARMOR**, or press **B** in-game, to change all six slots on any of the three test dummies. Quick presets, selected dummy HP, individual point ratings and block percentages are visible. Changes persist via browser localStorage.
- **Y** resets dummy HP and hit reactions without changing any armor piece. T clears casings and bullet marks as before.
- Dummy damage feedback displays named exact hit zone, HP damage, armor points, and blocked amount. Existing W01–W02 shooting, recoil, bullet holes, procedural sounds and M01–M03 movement remain unchanged.
- NPC inventory, wearable player armor, power armor and final art assets are not part of this test pass. The older W03 durability design described below is historical and is no longer in use.

## W03 — historical superseded damage and durability (not current)
- Station **8** is a dedicated combat test range with three humanoid training dummies: **Unarmored (100 HP)**, **Light Vest (100 HP, 60 armor)**, **Heavy Armor (100 HP, 120 armor, helmet)**.
- Uses the existing W02 scrap pistol, 20 base damage, current raycast and ammunition rules, not a parallel shooting system. Headshots deal 2.5× damage; torso 1×; arms/legs 0.7×.
- Light vest absorbs 30% of torso damage, while the heavy armor absorbs 55% of torso and 40% of helmeted head damage. Armor durability depletes by the amount blocked and eventually breaks; uncovered parts take full damage. No damage to destroyed dummies.
- Floating health and armor bars, transient damage numbers, hit-flash/knockdown reactions, armor-broken feedback, and center hit notices help validate damage.
- Press **8** to reach dummies, **Y** to reset all dummies to full HP/armor and clear bullet holes; **T** still resets the current station and clears brass/holes.
- All stats and damage calculation live in renderer-independent `combat.mjs` with automated tests. Dummy geometry, hit zones and visual reactions live only in the lab.
- W02 pistol, recoil, animations, material sounds, movement and stamina unchanged. No enemy AI, player inventory/armor, or real-world integration claimed. Requires user visual playtest.

## W02 — advanced weapon handling
- In the same test field, the original scrap pistol has an animated top slide cycling during each successful shot and during the final part of a timed reload. A physically modeled magazine is withdrawn/reinserted with a procedural gloved-hand gesture. **No skeleton or finished character art** is claimed.
- Every successful shot ejects a small 3D brass casing with gravity, bounces, ground settling and rotation. Visible casings are capped at 38 (no GPU accumulation); T clears casings alongside bullet holes.
- Procedural muzzle-flash plane and stronger flash light at the barrel; ADS and hip position blend with calmer ADS sway. Camera stays in YXZ pitch-only recoil mode to prevent the approved permanent-lean bug.
- Accuracy factors in actual movement, crouching, sprinting and jumping. Stationary W01.3 hip/ADS spread numbers, 12/48 ammunition, 1.65-second reload, bullet-impact decals, distinct paper/wood/metal/concrete sounds and approved M01–M03 movement are unchanged.
- `weapon-handling.mjs` supplies pure render-independent reload animation and casing physics; `weapons.mjs` computes movement spread. Their automated tests run in GitHub Actions.
- **Test:** press 7, fire several shots and check brass/slide, press R after using ammo, hold RMB while walking and crouching to compare spread, and press T to clear marks and casings. Visual feel requires an in-browser playtest before approval.

## W01.3 — audible material-specific impacts
- Station 7 now has clearly labeled sample panels for WOOD, METAL and CONCRETE alongside the existing PAPER targets.
- The firing raycast reads explicit surface material tags instead of assuming every non-paper hit is concrete. Surface hit text also identifies the material.
- Web Audio impact sounds use noticeably different timbres: sharp paper tear, wooden thock, ringing metal ping, and low concrete crack/crumble. They are deliberately scheduled about 0.15–0.26 seconds after the shot, so the loud muzzle report no longer masks them.
- Effects remain procedural (no external files), respect N/mute, use the same capped bullet-hole decals and preserve W01.1 camera recoil and approved movement.
- Regression tests verify all four material routes, unique sound-frequency signatures, and delayed scheduling. Player listening test still needed.

## W01.2 — bullet impact decals and weapon sound
- W01 test-lab bullets now make dark scorch/impact marks at the actual first raycast hit, whether the surface is a paper target or a solid wall, floor, obstacle or range prop.
- Decals orient to the surface normal with a small depth offset, are excluded from hit detection, and are capped at 140 visible marks for performance. Press T to reset your station and clear the marks.
- Procedural Web Audio gunshot, paper/concrete impact, reload mechanical clicks and empty-magazine dry click. Sound is synthesised only on user interaction and requires no remote audio files. N or the Sound button mutes/unmutes it; audio is unlocked by Enter Test Field.
- Shooting still uses the corrected YXZ pitch-only camera recoil and preserved W01 ammo rules. Sound synthesis is tested with a mocked AudioContext, and manual browser/WebGL playtest remains necessary.

## W01.1 — camera recoil correction
- Camera rotation is now YXZ, matching `PointerLockControls` instead of mixing XYZ pitch with mouse-look yaw. This prevents unintended sideways camera tilt when shooting while turned.
- First-person camera kick is pitch-only, capped, and smoothly recovered; the pistol viewmodel still kicks independently.
- Raycast direction is measured **before** applying recoil, so shot direction corresponds to the current sights/crosshair.
- Regression tests verify a single shot and rapid shots return the camera to its pre-shot pitch. Browser playtest remains required.

## W01 — weapon range (first weapon pass)
- The existing testing facility now includes station 7, a clear lane of five shootable geometric targets (press 7).
- Adds one original worn scrap pistol, with a real camera-relative 3D model built from metal and wood components, muzzle flash, sight posts, smooth aim transitions, viewmodel recoil, and shots calculated from the camera.
- Primary mouse click fires one semi-auto shot; hold right mouse button for aimed-down-sights (narrower spread and zoom); press R to reload and F to refill **test-only** ammunition. Press T to reset the current test station (was R).
- Finite 12-round magazine and 48 rounds in reserve; reload 1.65 seconds, .24-second shot cooldown. No shooting through solid world geometry to hit targets.
- `weapons.mjs` is renderer-independent and holds authoritative ammo, cooldown, ADS spread, recoil, and reload rules. It is exercised by `weapons.test.mjs` and will be imported into the real RPG world as weapon mechanics roll out.
- Real range target hits and damage indication work. Enemy health, humanoid animations, third-person weapon models, inventory, crafting and combat AI **do not** exist yet.
- Existing movement and forest preview preserved; do not accidentally introduce weapon combat into the forest until tested.

## M03 — advanced movement testing
- Uses the exact shared `movement.mjs` controller in the lab and the preserved forest preview.
- Hold Left/Right Ctrl to crouch, or press C to toggle crouch. Crouch speed is 2.35 m/s and disables sprint and jumping.
- Standing is physically forbidden under low ceilings; the player remains crouched after releasing C until they exit.
- Walking and sprinting ease into full speed and ease out when released, with near-instant collision slide response and no endless momentum.
- Shared procedural first-person camera uses a smooth crouching eye height and subtle, grounded head bob.
- Test station 6 offers a physical low tunnel with a collidable roof; press 6 to teleport to it. Stations 1–5 and the previous mechanics remain.
- No humanoid skeleton or third-person character animation rig has been implemented in this milestone.

## Endurance and stamina (Movement Lab M02)
- Shared `movement.mjs` stamina controller is used in the test field and the forest.
- Endurance is an RPG skill from 1 to 10: max continuous sprint = 3 + Endurance seconds, from 4 seconds at E1 to 13 at E10 (half the prior sprint time).
- Sprint drains one stamina unit per second *while actually moving*. Holding Shift against a wall or stationary does not drain it.
- After 0.55 seconds without sprinting, stamina regenerates according to Endurance: 0.225 × (Endurance + 1) units/second (E1 0.45/s, E3 0.9/s, E10 2.475/s). High-Endurance characters refill their entire bar faster despite having a larger pool. An exhausted player walks until 30% has returned, even when Shift remains held.
- M02's testing control (menu +/- or in-game [ / ]) temporarily changes Endurance and refills the bar; it is **not** a skill-point award system. A future level-up/perk system will supply the earned Endurance value.
- Stamina is visible in the lab and forest HUD; no power armor or combat endurance drain is implemented yet.

## Current priority: Movement Lab M01
At `games/rpg-prototype/testing/`. A deliberately small, flat 3D field with five stations: walk/sprint lane, low jump hurdles, collision maze, ramp, and stair-stepping. Press 1–5 to teleport, R to reset, WASD to move, Shift to sprint, Space to jump, mouse to look, and Escape to pause. Speed, motion state, and height are shown on the HUD. A quality toggle supports Chromebooks.

The test lab and the saved forest preview both import `movement.mjs` to share the exact same tuning, jump physics, collision and climbing rules. Do not duplicate their movement logic. The old forest remains visitable through `games/rpg-prototype/`; later mechanics roll into the final map only after testing.

## Forest preview already present
- Wooded, rolling landscape with a winding track, ruined houses, a Hearthguard outpost, and a distant city skyline.
- WASD movement, mouse look, Shift sprint, Space jump, tree and wall collision.
- Continuous day/night cycle (night is navigable; no horror or jump scares).
- Optional Hearthguard tutorial quest: speak with a scout, recover two supply cases, return them.
- Two lootable interiors, other houses without quest supplies; world map, quality toggle.
- Quest progress saved locally in the browser.

## Controls
Click Explore to capture the mouse; Escape to pause; E interact; M survey map.

## Not implemented yet
Combat, mutated creatures, power armor, additional factions, vehicles, large city interiors, multiplayer, final art or the main story. Do not mark these completed.

## Regression
Run: node --test games/rpg-prototype/rules.test.mjs games/rpg-prototype/movement.test.mjs games/rpg-prototype/weapons.test.mjs

Future updates extend these files in place with tests and a bug log. REDLINE must remain separate.