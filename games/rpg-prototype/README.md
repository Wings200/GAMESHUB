## W20.43 — NPC combat frame ReferenceError fix

Fixed `liveNpcGun is not defined` from W20.42: the per-NPC weapon gate is now declared in the surrounding enemy loop, so it is available to aiming, shooting, reloading, death cleanup and the status HUD. The HUD explicitly reports that only the Raider is armed. Added regression coverage checking that the declaration precedes both the alive/dead branches and status read, and bumps the test page/module URLs to W20.43 to clear stale browser module caches. Raider Pipe Rifle trial remains otherwise unchanged.

## W20.42 — Controlled Raider Pipe Rifle live-combat trial

- Equipped **only the Raider** in Station 9 with the same authored rusted Pipe Rifle 3D model used by the player. Its duplicate legacy mesh is hidden, so the visible barrel/stock/magazine and aim points are real model geometry.
- Added two weapon-local handhold markers and retargeted the NPC avatar's existing two-arm IK to the actual grip and forward support location. The rifle follows the NPC's facing and animation; it lowers while moving, rises while aiming, and kicks when firing.
- NPC shots and tracers originate from the real Pipe Rifle muzzle transform. The gun's magazine, charging bolt, reload motion, and muzzle flash animate with enemy state rather than using the old generic rifle placeholder. NPCs keep the existing line-of-sight, cover, reaction, ammo, cooldown, friendly collision and body-armor rules.
- Raider ammunition/reload cadence now matches the rebuilt player's Pipe Rifle: 15-round magazine, 2.65-second reload, approximately 136 rounds per minute. Enemy bullet damage remains 30 for existing combat balance. The Raider keeps the Pipe Rifle on arena reset instead of silently switching to a not-yet-modeled alternate weapon.
- **Scout and Enforcer remain disarmed** in weapon-rebuild testing; their combat code and old placeholder weapons are not re-enabled. All ten player firearms and the flat mechanics testing arena remain intact. H heals, J resets NPCs, K pauses AI.
- Expanded Station 9 source-level integration assertions for the one-armed-raider gate, real player model reuse, handhold and muzzle wiring; ran all 90 Station 9 checks, all 54 enemy AI/tactics/weapon checks, and a mocked NPC avatar-construction/animation check. A full rendered WebGL visual smoke test is still pending user verification.

## W20.41 — Sniper recoil refinement

Reduced the Wasteland Heavy Sniper's default recoil by about 11% (6.6° to 5.9° before its weapon-specific profile). Aiming now kicks roughly 12.8° rather than 14.3°. It remains notably heavier than the hunting rifle, and nothing else about its accuracy, damage, scope, bolt timing, magazine or arm positioning changed. NPC weapons remain disabled until their dedicated integration stage.

## W20.40 — Heavy Sniper Rifle + genuine 6× scoped aiming

- Added **Wasteland Heavy Sniper** as rebuilt firearm #10, alongside the existing hunting rifle rather than replacing it. Its original procedural model has a full-length steel barrel, muzzle brake, vented sleeve, folded bipod, adjustable stock, detachable five-round box magazine, bolt handle, weathering, and a physically modeled optical tube with front/rear glass and adjustment turrets.
- Aim with **right mouse** to look through a circular 6× sniper scope (12° camera FOV) with thin mil-hash markings and an illuminated center dot. The sight uses the same center-zero camera ray as actual hitscan fire; aiming leaves the third-person view automatically for a usable sight picture. Hip view retains the rifle model and scope body.
- Five-round detachable magazine, high per-shot damage, 1.85-second firing interval, deliberate 1.42-second animated bolt cycle with physical brass ejection, 4.15-second magazine reload and bolt chambering, and distinct heavy recoil and firing/reload sound. This is a slow high-impact weapon, not an automatic rifle or a reskinned hunting gun.
- Sniper rests on the **right shoulder** in third-person. Two in-weapon grip markers guide the player's arms, and the support hand was moved to a reachable position so sprinting still lowers the muzzle with both hands attached.
- New named 3D geometry and bolt-cycle tests plus expanded arsenal, sight-zero, recoil, audio, inventory, physical arm-reach and Station 9 integration tests. All 220 focused tests pass under an isolated logic and source-level validation harness. No full WebGL visual smoke test has been performed in the current browser environment.
- The existing Station 9 testing arena, hunting rifle, other rebuilt weapons, player armor and AI remain available. **NPC firearms remain disabled** until the planned NPC-gun work is complete.

## W20.39 — NPC navigation, cover discipline, and motion fidelity

- Fixed combat flank planning selecting the NPC’s current location as a waypoint or repeatedly choosing a clamped, zero-distance goal at the arena boundary. Navigation now receives the actual tactical destination and computes local obstacle-safe detours.
- Raiders and enforcers look for solid cover after sustained exposure; threatened scouts will also retreat, but otherwise favor lateral flanks. Cover candidates sample multiple genuinely shielded positions rather than only a narrow pair.
- NPCs commit to a chosen cover route for a short interval after sight is broken, using their **last confirmed** player position rather than tracking the player through crates. They crouch only when sheltered, peek briefly, then return. When commitment expires, they investigate confirmed contact intel.
- Movement has finite acceleration, momentary patrol waypoint stops, nearby-actor spacing, and obstacle-aware routing. Third-person NPC animation follows measured displacement, and character facing is applied before animation updates so their turn response matches motion.
- Station 9 remains an open mechanics arena. Enemy weapons remain disabled under weapon-rebuild mode; this pass does not reinstate combat fire or add a map. Use H to heal, J to reset NPCs, K to freeze AI. Debug state exposes measured speeds, cover commitment and remaining path waypoints.
- Expanded enemy AI, tactics and station integration tests for cover retention, occlusion, flanking, personal space, movement, and version wiring. Preserves W20.38’s higher recoil and all weapon/armor work.

## W20.38 — Stronger default recoil, Strength bonus preserved

Raised each of the nine rebuilt guns' camera recoil impulse by roughly 2.2x while aiming, with stronger horizontal movement, larger first-person weapon kick and backward displacement, slower recoil return, and a more generous maximum burst climb. A 10mm sighted shot now rises about 3 degrees; a sighted hunting rifle or shotgun jumps around 9–10 degrees, while each Pipe SMG round raises the sights by roughly 1.3 degrees before recovery. Aiming and crouching still reduce the kick but do not nullify it. Bullets still fire along the optic line *before* the recoil changes view direction; manual countersteer still consumes the return debt instead of pulling the aim downward. Existing SPECIAL Strength scaling and the Steady Grip perk remain untouched for a future balancing pass. Two new tests verify minimum per-weapon impact and bounded model displacement.

## W20.37 — Nine distinct weapon recoil profiles and sustained-burst control

Replaced the in-game shared recoil behavior with authored camera and gun impulses for all nine rebuilt weapons. Each weapon has an independent vertical climb multiplier, short-lived horizontal pattern, kick/hold timing, spring-back speed and backward model displacement. Pipe weapons have more erratic recoil, shotguns and the hunting rifle hit harder, the laser musket thumps without excessive camera climb, and continuous Pipe SMG fire now builds a controllable sustained rise. The old five-degree burst ceiling and very fast rebound no longer restrict the active firing system. Recoil is applied **after** the projectile is fired from the iron-sight line, so single-shot alignment remains correct; ADS and crouching reduce recoil, while manual mouse countersteering consumes remaining kick debt to prevent the old downward aim snap. Third-person reactions use the active model impulse and the existing right-shoulder two-hand mounts remain unchanged. Dedicated pure-logic tests validate all nine profiles, first-shot direction, stance, burst climb, return, countersteering, reset and vertical camera limits. Existing weapon mechanics and NPC disarm mode are retained.

## W20.36 — Right-shoulder carry and two-handed lowered sprint pose

Corrected the previous too-centered third-person weapon position. The common torso weapon socket now sits to the right of the chest (x=.17 rather than x=.025), with each rifle/shotgun/SMG support hand placed on accessible fore-end wood closer to the receiver. Sprinting blends the whole gun nose-down by up to 0.76 radians instead of letting either hand detach; the existing two-bone arm solver drives both hands to the moving grip targets on every frame. NPC weapon mounts use the same blended pitch when armed, without restoring old guns in the deliberately unarmed rebuild test mode. Eight new geometry/sprint assertions and the existing station integration suite cover idle, sprint transitions and reach constraints.

## W20.35 — Fix floating third-person guns and disconnected character hands

Moved the shared animated weapon socket to a centered, raised chest-ready placement so the buttstocks sit against the body rather than hanging at its side. Added explicit trigger/support handholds to all nine rebuilt first-/third-person weapon variants and linked the actual avatar arm joints to those moving handholds with length-checked two-bone IK. Pistol and revolver world positions move forward into a two-handed ready stance. The same IK supports NPC weapons when they are enabled; the current weapon-rebuild testing mode still deliberately disarms NPCs, so it does not restore removed legacy weapons. The handhold contact distances are exposed as non-combat diagnostics under avatar.root.userData.weaponGripDistances. All combat hitboxes, recoil/ballistics, reload timings, armor and the power-armor boarding animation remain unchanged.

## W20.34 — First fully automatic rebuilt weapon: Pipe SMG

New authored rusted Pipe SMG model with overlapping welded steel receiver, continuous barrel, wood handguard, connected stock, side-loaded 30-round stick magazine, and animated bolt. Both first-person hands visibly touch the grip/handguard; third-person rig has the same mechanical bolt and detachable magazine. The 10.5-round/sec automatic fire uses the established held-fire cooldown loop, with a new SMG report, casing ejection on each shot, and staged side magazine swap + bolt rack. Factory iron sights are aligned to the actual 3D front tip. All eight approved guns and the NPC disarm testing mode remain untouched.

## W20.33 — Revolver two-handed grip alignment

Replaced the floating idle support-hand block with a supported two-handed revolver stance. Both glove palms now overlap the actual wood grip, with four individually modeled wrapping fingers and thumbs each, wrist cuffs, and forearms physically connected to each palm. The reload-hand choreography and first-/third-person revolver mechanics stay unchanged. Added geometry and source-level regression tests.

## W20.32 — Worn Six-Shooter

The eighth approved-weapon candidate is a new procedural revolver with an actual cylinder/yoke, connected barrel, frame, walnut grip and front/rear iron sights. Six separate chamber bores rotate during firing. The hammer cocks and falls, while reloading swings the drum out, ejects spent cases, and loads missing cartridges individually. No automatic casing ejection occurs on trigger pulls. Existing seven weapons and NPC weapon-free testing mode remain unchanged. New geometry, balance, reload, audio and source-level tests guard the behavior.

## W20.31 — Slim green-fiber hunting rifle sight

The hunting rifle’s front iron sight post is slimmer, the fiber bead is narrower and glows green through an emissive material and a short-range accent light. Rear sight posts are narrowed to leave a clearer target picture. Sight elevation and aiming calibration remain unchanged. Existing gun mechanics, audio, bolt cycle, and damage are preserved. Additional geometry and source-level tests cover the sight update.

# Untitled RPG · Mechanics Lab W20.30 + Forest Foundation 0.1

## W20.30 · Bolt-Action Hunting Rifle

- Seventh newly rebuilt player weapon: original five-round hunting rifle with a one-piece wood buttstock, connected steel receiver, full-length bedded barrel, fixed internal magazine, iron sights with physically touching tips and accurate first-/third-person models.
- Each trigger pull consumes one round, triggers a distinct slow, heavy gunshot and begins a physical lift/pull/return/lock bolt cycle. Brass casing ejection happens when the bolt reaches the rear of its stroke, never at the muzzle or instant of firing.
- R reloads by opening the action and inserting only missing cartridges through the visible top feed port. A one-round top-up takes less time than loading all five; seated rounds are usable if interrupted.
- Firing is limited by the real bolt cycle and fire interval, with high single-shot damage and excellent stationary ADS accuracy. The right-hand glove follows the bolt handle during cycling, returning to the grip afterward.
- All six approved weapons are preserved, and all NPCs stay unarmed in the mechanics-testing reset.
- Added new geometry/continuity, bolt physics, individual reload, audio timing and source-integration regression checks.

## W20.29 · Pump-Action Shotgun

- Sixth rebuilt player weapon: original rugged six-shell pump action with a joined forged receiver and walnut stock, stationary full-length barrel and magazine tube, two functioning action bars, a sliding wooden fore-end and bolt, physical bottom loading gate, real iron sights and correct first-/third-person models.
- Left-click consumes a single shell and fires eight individually raycasted pellets. The fore-end cycles backward and forward after every shot, and a spent red hull ejects only when the bolt retracts.
- R loads the actual number of missing shells individually into the fixed magazine tube; one-shell top-up is quicker than a full six-shell reload, and firing can interrupt after some shells are seated.
- Recorded pump cycling, ejection and loading sound cues match animation timing. Shotgun damage falls with distance and each pellet is independent. The existing five approved guns remain preserved; NPCs stay unarmed during staged testing.
- New dedicated geometry, cycle/falloff, reload, audio and integration regression tests.

## W20.28 · Double-Barrel Shotgun

- Fifth rebuilt player weapon: original side-by-side hunting shotgun with full-length wooden stock, connected receiver/hinge, rotating twin-barrel assembly, true front/rear iron sight heights, twin visible chambers, moving shell extractor, two-shell capacity and individual red shells.
- Left-click fires one shell (eight independently raycasted pellets), R physically breaks the barrels open, ejects spent red hulls, reloads missing shells by hand and locks the hinge shut. One-shell top-up takes 1.95 seconds; two-shell reload takes 2.65 seconds.
- Each pellet delivers 10 base damage inside 5m, smoothly tapering to a 20% floor by 24m. Clear close-range identity and no full damage across the whole map.
- First-person, third-person, power-armor compatibility and independent ammunition inventory. All previous four rebuilt firearms are preserved; NPCs stay disarmed. Weapon workbench attachments remain deferred.
- Added sight, geometry, pellet-falloff and reload/sound integration regression checks.

## W20.27 · Laser Musket damage balancing

- Reduced the Laser Musket's single-charge damage from 40 to **32** and capped six-crank damage at **96** (was 204). Intermediate charges deal 45, 58, 70 and 83.
- No changes to the crank rotation, fusion-cell consumption, reload, audio, iron sight zero, enemy hitboxes, or the 0.66-second dissolving red laser trail.
- Added charge-by-charge damage regression checks.

## W20.26 · Hand-cranked Laser Musket + lingering red beam

- Fourth rebuilt weapon: original old-world wooden musket and scavenged electrical assembly with copper barrel coils, glowing capacitor, removable six-cell power pack, and a full turnable hand crank.
- **R** rotates a real wheel with the character's hand for 0.68 seconds, consumes one fusion cell and stores one of six energy charges. Click fires the entire stored charge (32 damage at one crank; 96 at six). R reloads the cell pack when empty. Infinite ammo still requires actual cranking, but never consumes cells.
- Red energy beams spawn along the real aim ray and remain frozen in world space. The beam holds at full brightness for 0.13 seconds, then smoothly dissolves over a total **0.66-second lifetime**, including misses and hits on NPCs/world targets.
- Distinct electrical blast and ratchet audio, clean sights, compatible power-armor/third-person visual assembly, and no casing ejection from laser weapons. Existing three guns and disabled NPC weapons remain unchanged. Attachments are still reserved for the later settlement workbench.
- New model, charge economy, beam fade, and integration regressions.

## W20.25 · Pipe Rifle corrosion and salvage finish

- Reworked the Pipe Rifle as a visibly weathered scavenged weapon: deterministic multi-scale oxide patterns and tiny pit marks on receiver, barrel, shroud and fasteners; reused across first/third-person models with no external textures.
- Added attached, deeply rusted plumbing coupler threads, two bolted shroud repair clamps, offset side plates, and an iron stock repair strap. Functional iron-sight zero, reload animation, magazine, combat tuning and previous two weapons are unchanged.
- Added model checks for rust-map color variation, oxide coverage, new connected parts and unchanged sights.

## W20.24 · Third rebuilt weapon: Pipe Rifle

- Added an original semi-automatic, 15-round **Pipe Rifle** (34 damage, 0.44s between shots, 2.65s reload, 90 starting reserve) as the third unlocked weapon. Cycle with Z/X or choose in the start menu. All legacy player/NPC weapons stay disabled.
- Constructed the rifle from contiguous beveled metal shell, full-length barrel shroud, a formed wood stock and shoulder plate, real magazine well, right-side moving charging carrier, front/rear iron sights, trigger assembly and separate support/reload hands.
- Sight beads are physically zeroed at **local Y=.258** and align with the camera center during planted ADS shots; no automatic spread reduction while moving.
- Added a unique pipe-rifle gunshot signature, magazine-drop/rack reload choreography, ejected brass and muzzle effects. Infinite ammo mode applies to the new rifle; disabling the cheat restores finite reserves.
- Third-person rifle uses the same authored components at a smaller scale; the old pistols, NPC collision fixes, armor and loot are preserved.
- Added procedural model-fit, reload and sight tests plus integration smoke assertions. Workbench weapon modifiers remain intentionally disabled for a later settlement workbench phase.

## W20.23 · NPC hitbox alignment + infinite testing ammo

- Fixed headshots registering as chest shots by parenting NPC head, helmet, chest, neck, arm and leg collision meshes to their exact animated visual skeleton joints. All three role scales, crouch, lean, pose and hit reactions now transform visual meshes and hitboxes together.
- Corrected the overly tall static 2.03m head and chest overlap; face shots now hit the head zone of the visible character. Raycast world matrices refresh immediately before a shot.
- Added a **test-only infinite ammo** toggle on the main menu and **M** key while in the test field. It refills magazine capacity per shot, shows ∞/∞ in the HUD, doesn't consume reserves, and restores the original magazines/reserves when disabled. Starts OFF on every launch.
- Added direct source/regression checks for both features. No changes to the 10mm/pipe pistol visual design or regular damage and fire cadence.

## W20.22 · Iron sight and bullet alignment

- Re-zeroed the two active pistols to the **visible brass front blade tip**, not the receiver center: 10mm at .274 and pipe pistol at .247 local Y.
- Aligned the pipe pistol's two rear brass dots with the front sight tip, for a level physical sight picture.
- Grounded ADS shots still use the zero-spread camera-center ray. The weapon now visibly lines up with that ray; moving/jumping/hipfire spread remains by design.
- Added explicit sight-tip and runtime pipe pistol geometry regression tests. No changes to gun silhouettes, damage, AI, ammo or power armor.

## W20.21 · Pipe pistol joined-geometry visual polish

- Replaced the free-floating pipe-cylinder look with a joined, bevel-edged stamped receiver, angular long barrel shroud, continuous underside frame and an overlapping grip tang.
- Charging bolt now rides in an enclosed right-side channel, and both rear/front sight supports physically contact the receiver or handguard.
- Repositioned the side magazine inward to overlap a deep receiver socket, with upper and lower guide rails, so the installed magazine reads as one gun and still slides sideways during reload.
- Retuned barrel collars to overlap their housing instead of floating at near-tangent clearances. Removed decorative loose bolt rings and consolidated external details into surfaces.
- Did not alter either pistol's damage, ammunition economy, shot cadence, recoil, input controls or AI behavior. The approved 10mm remains unchanged.


## W20.20 · Second rebuilt weapon: improvised pipe pistol

- Kept the previously approved 10mm pistol untouched; players can swap between only the two rebuilt weapons with Z/X or the menu selection. All six legacy weapons remain unavailable.
- Added an original welded pipe pistol with a cylindrical receiver, rough handguard collars, exposed right charging bolt, wooden grip, factory irons and a detachable LEFT-side magazine. Its first-person and third-person meshes use shared proportions.
- Side magazine actually slides out laterally during reload; bolt racks only after replacement. The eight-round semi-automatic pistol has lower damage, slightly stronger recoil, and a distinct report compared with the 10mm.
- Saved selection of either new gun now survives reload. NPCs remain unarmed, and the original legacy guns do not spawn in loot. Weapon attachments remain deferred to settlement-only workbenches.
- New regression coverage checks side-feed geometry/animation, sight alignment and 8-round ammo economy.


## W20.19 · First new gun: 10mm pistol

- A brand-new original, heavyweight 10mm pistol is the only equipable player firearm in the testing area. Six legacy gun models and all NPC guns remain disabled and detached.
- New first-person and third-person sidearm geometry has a separate slide, muzzle, iron sights, ejection port, grip, trigger, detachable magazine, and reload hand. Casing ejection, muzzle flash, sound and recoil use the physical model's components.
- The 12-round magazine and 72-round test reserve use the existing authoritative ammo, hit detection, and staged reload state; stable ADS aligns its physical sight to the camera. F restores test ammunition.
- Weapon modifications and the optics tab stay disabled until a later settlement-only weapons-workbench phase; next planned weapons: pipe pistol, pipe rifle, laser musket and shotgun.
- The enemy AI keeps moving and detecting players but cannot use its retired guns. Nonweapon looting, armor, powered armor, and radar remain intact.


## W20.18 · Weapon-free reset before new firearm pass

- Removed all six legacy player gun viewmodels, the third-person survivor gun, and every NPC rig gun from the live test; retained dormant engine definitions for the upcoming weapon overhaul.
- Disabled player and NPC gunfire, ADS, switching, reloading and the legacy optics workbench. NPCs remain mobile for animation, navigation and armor testing but are unarmed.
- HUD and inventory display UNARMED, old weapon selection is hidden, and new world loot excludes the old weapons and ammunition. Prior saved legacy inventory objects are archived in place rather than deleted.
- Power armor, movement, enemy awareness radar, armor configuration, and nonweapon looting remain testable. Updated the source-level station smoke test to verify the weapon-reset gates.


## W20.17 · Fair hostile compass

- Red enemy markers appear only after confirmed hostile awareness or a direct player attack. Unaware patrols and enemies merely investigating distant noises remain hidden.
- Alerts persist for only three seconds after line-of-sight breaks to avoid a constantly flashing compass; death and enemy resets remove contacts.
- While in power armor, tapping E searches nearby enemy loot drops/crates; holding E still exits the frame. The prompt now shows both actions.

## W20.16 · Armor boarding, sound, enemy combat and bottom compass

- Rebuilt power-armor transition sound timing around the three real foot contacts; replaced ringing oscillators with mechanical thuds. Ordinary heavy footsteps no longer add the high-pitched overtone.
- The pilot now advances through the rear hatch to the cabin interior instead of stopping on the rear platform. A compact scaled frame retains a human-sized pilot and inverse-kinematics contact mapping.
- Frame standing clearance is 2.25 m with crouched clearance 1.88 m; power-armor camera eye lift is reduced to 0.39 m. Ceiling collisions honor equipped frame height.
- Fusion-core idle, walking and sprint drain rates are multiplied by 0.8, making each core last exactly 25% longer.
- Alerted NPCs track close circling players more effectively, with finite fast turning and a wider near-field firing cone. Cover and solid walls still block all rounds.
- Legacy mannequin limbs live exclusively on an unrendered collision layer, with one visible animated NPC rig. Floating overhead labels show only enemy name and HP, not planned tactics or reloads.
- A bottom 360-degree contact strip shows alerted hostiles as red dots in both field and power-armor modes, including targets behind the player.
- Regression tests cover fuel ratios, boarding end position, combat tracking, wall occlusion, ceiling clearance, audio cues and enemy HUD/source integrity.


## W20.15 — Remove obsolete camera-mounted cockpit LED strips

- Two narrow teal indicators were still physically parented to the first-person camera even after the HUD was redesigned, so they appeared to follow the player while wearing power armor.
- Removed only those 3D meshes, retaining the empty cockpit transform hook to avoid changing suit transitions, gait or camera animation code.
- Kept W20.14 condition silhouette and W20.13 analog visor intact. Regression tests verify that the cockpit factory attaches no visible children to the camera.

## W20.14 — Six-part power armor condition silhouette

- Add the small left-middle power-armor figure, with independently controlled head, chest, left/right arms and left/right legs.
- Each section glows amber above 30% durability, turns red at or below 30%, and is dark when destroyed or not equipped. Durability is read from the existing real plate state, so repairs, removals, equipment and combat damage update the figure without changing gameplay.
- Add pure-state boundary tests and HUD wiring checks. Visual approval remains a live-browser/player step.

## W20.13 — Minimal amber power-armor instrumentation

- Replaced the large boxed cockpit widgets with analog helmet-style dials anchored across the lower edge of the field of view: HP / RADS on the left, a working compass and tracked-objective marker in the center, CORE and AP (sprint stamina) with stacked AMMO on the right.
- HP needle follows player health, CORE needle follows fusion charge, AP follows stamina drain/recovery, ammo numerals follow loaded/reserve weapon state, and the compass rotates with camera heading.
- Retains all previous player mechanics, power-entry choreography, core depletion, inventory, recoil, and audio. RADS reads zero because the current mechanics sandbox has no radiation exposure system.
- Added source-level layout bindings and checked dynamic dial geometry / compass headings. Actual in-game visual feedback is still required.

## W20.12 — Power-armor sprint stamina HUD

- Mirrored the existing stamina percentage, exhaustion, recovery and core-offline state into the occupied visor, while keeping fusion-core charge a separate resource.

## W20.11 — Audio cadence and hydraulic timing

- Slowed walking and sprinting sound-trigger cadence to plausible footfall rates, extended abrupt synth decays, and gave power-armor entry and exit their own hydraulic sequence over the existing 4.5-second animation.



## W20.10 — Shoulder silhouette and entry-visibility corrections

- Reduced both shoulder pauldrons in width and offset to address the real-browser full-suit proportion regression, keeping the new anatomy-specific cast shells and articulated arm joints.
- During power-armor entry/exit, the combat notification and crosshair are hidden to keep the rear-step climb visible. This is a narrow QA correction, not a new map or quest expansion.
- Requires the full gameplay browser test to pass before marking the build finished.

## W20.9 — Tier-specific detail and working mask optics

- After checking actual fully equipped T-45/T-60/T-01 screenshots, removed duplicated horizontal plate badges, paired vertical vent strips on every limb, and repeated pink keels/bolts across the entire T-01 body. Each tier now uses different details on the cuirass, pauldron, mask and limb segments instead of copying one decoration to every plate.
- Added inset paired helmet eye optics, thick cast respirator housing and actual mechanical vent slats. Changed the Tier 45 stamped collar/pauldron, Tier 60 cage/vent and Tier 01 experimental ridge/fins. All remain separate, removable, structurally mounted meshes and preserve the rear-entry test path.
- The live 3D visual-probe renders bare and fully equipped fronts and rear climbing stages. Requires human evaluation of the current art after browser tests pass.

## W20.8 — Rebuilt armour silhouette after visual screenshot review

- Captured front views of fully plated T-45, T-60 and T-01 from the live browser. Those revealed a repeating square-tile shape across nearly every body region, despite the previous colour and normal-map improvements.
- Replaced paired little chest plaques with **single cast cuirass panels**, double-stacked pauldrons with broad shoulder shells, square forearms with long vambraces, and short leg plates with thigh cuisses, articulated knee caps and calf greaves. The helmet uses one continuous forged upper shell with an inset visor and jaw instead of stacked brow bars.
- Profile outlines are now warped specifically for helmet, cuirass, pauldron, vambrace, cuisse, knee and greave, in addition to the separate T-45/T-60/T-01 tier shapes. Worn alloy scrapes are much subtler. The rendered QA state exposes each role and regression tests confirm anatomy-specific assemblies.
- This continues the mechanics sandbox only; no terrain, missions, or changes to REDLINE were added. Full-suit visual approval is pending review of new WebGL screenshots.

## W20.7 — Actual two-bone hand placement on moving frame handles

- During a rear-entry transition the animated survivor now reaches for physical handhold tips computed using the actual scene transform of the hinged rails and the pilot's position/orientation. Both hand targets change with the hatch as it opens and the character turns.
- A geometric shoulder-and-elbow solver now places each palm on its assigned handle rather than raising arms through fixed pitch/roll values. The pilot's hands release the frame during the final lock sequence; arms reset correctly when leaving the frame.
- The 3D browser test reads both real wrist-to-handle distances and requires close contact during boarding, in addition to knee/ankle and platform tests. No map changes.

## W20.6 — Tread-constrained two-joint survivor leg rig

- Added pure geometric inverse kinematics for the survivor's original animated hip and knee joints. Both boots follow distinct ground, lower-step, upper-step and cabin contact targets with independent swing arcs. Root translation deliberately lags the leading foot instead of vertically lifting the entire body first; an independently solved ankle keeps each boot level on a tread.
- Stepping now starts with a real hold on the frame handholds; the pelvis transfers weight during each rise. Unit tests check leg reach, finite joint angles, each tread's two foot targets, and extreme input clamping. Real Three.js browser smoke tests check numerical reach of both legs and a third cabin boarding screenshot.
- No new map or quest expansion in this milestone. Manual player evaluation remains required to approve the visuals.

## W20.5 — Bare chassis, sculpted alloy modules and hand-assisted climbing

- New characters receive an EMPTY six-slot power frame; the old pre-fitted five T-45 modules no longer hide the base exoskeleton. Existing saved loadouts are preserved. The E configuration interface adds a non-destructive REMOVE ALL SIX MODULES action which transfers every plate (including broken pieces and durability) to the backpack when capacity allows.
- Station 8's one-time salvage cache has each T-45 slot as its own collected part plus special T-60 and T-01 modules, so all modular equipment can be examined without inventing gear on the frame.
- The plated variants use convex alloy shells with curved profiles and deterministic scraped weathering, with the structural core metal remaining visible instead of every chassis component turning the plate color. Knee guards and shin guards no longer double-stack. The articulated pilot reaches for mechanical folding handholds before stepping onto two service treads, while a supporting foot remains constrained to the prior tread on both climbing up and descending.
- Real WebGL screenshots of front/rear and both entry steps are produced by a separate CI visual-probe run. Unit tests now include the dedicated rear-entry choreography suite, plus full browser interaction tests for installing and removing modules.
- The main map remains untouched; test Stations 8 and 9 first. Visual quality remains subject to manual review, not just automated math passing.

## W20.0 — Physical power-armour boarding & facing verification (testing sandbox only)

- Power armour entry is now a four-stage climb from behind rather than a flat horizontal translation: the pilot turns to face forward, approaches the rear hatch, steps onto two physical service treads (0.22 m and 0.43 m), then mounts the internal 0.49 m foot platform. Each step moves the pilot's root vertically and lifts the correct articulated boot; the other foot remains planted. Exiting reverses the sequence while facing backward out of the suit.
- A formerly solid centre-back spinal column is now attached to the opening hatch; the two service steps extend only while the rear doors are open. The helmet, shoulder caps and greaves received a heavier industrial silhouette and dark base alloy instead of the old ivory mannequin finish. Modular T-45/T-60/T-01 loadouts, durability and fusion cores are preserved.
- The camera stays in an external view of the pilot while boarding; it never flies through the armour. Once the hatch closes, a brief dark visor handoff moves the camera to the worn-suit eye point. Crouch offsets remain active.
- Enemy awareness remains broad, but weapons can fire **only if the enemy's actual facing yaw is within 12 degrees of the player**. Enemy tracers now originate at the weapon model's muzzle, rather than an invisible chest point. Browser smoke checks validate the visible model's world forward vector matches the AI brain bearing. Original non-rendering physics hitboxes remain separate.
- This pass **does not build or replace the map**; the nine mechanics stations are still the evaluation environment. Unit tests check climb heights, alternating feet, hatch timing, direction gating and distance; browser smoke tests inspect visible step deployment, spine yaw, NPC heading and camera heights. Appearance and choreography still require player approval after browser testing.

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