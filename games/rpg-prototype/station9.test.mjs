// Source-level integration smoke assertions for the Three.js station, which
// cannot be exercised by the pure Node AI tests alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
const page=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const npcAvatar=readFileSync(new URL('./npc-avatar.mjs',import.meta.url),'utf8');
const armorVisual=readFileSync(new URL('./power-armor-visual.mjs',import.meta.url),'utf8');
const powerArmor=readFileSync(new URL('./power-armor.mjs',import.meta.url),'utf8');
const playerAvatar=readFileSync(new URL('./player-avatar.mjs',import.meta.url),'utf8');
const remoteAvatar=readFileSync(new URL('./remote-avatar.mjs',import.meta.url),'utf8');
const characterAnimation=readFileSync(new URL('./character-animation.mjs',import.meta.url),'utf8');
const powerEntryAnimation=readFileSync(new URL('./power-entry-animation.mjs',import.meta.url),'utf8');

test('Station nine has 3 declared enemies in front of an east-facing player',()=>{
  const section=source.slice(source.indexOf('const enemySpecs=['),source.indexOf('function enemyMaterial'));
  assert.ok(section.includes("id:'scout'"));
  assert.ok(section.includes("id:'raider'"));
  assert.ok(section.includes("id:'enforcer'"));
  const points=[...section.matchAll(/label:'[^']+',x:(\d+),z:([\d.]+)/g)]
    .map(v=>({x:Number(v[1]),z:Number(v[2])}));
  assert.equal(points.length,3);
  assert.ok(points.every(p=>p.x>30 && p.x<50 && p.z>35 && p.z<49));
  assert.match(source,/x:30,z:42,tag:'09 \/ AI TEST'/);
  const yaw=Math.atan2(-(points[0].x-30),-(points[0].z-42));
  const forwardX=-Math.sin(yaw),forwardZ=-Math.cos(yaw);
  assert.ok(points.every(p=>(p.x-30)*forwardX+(p.z-42)*forwardZ>0),
    'Every enemy must appear ahead of the player on teleport');
  assert.match(source,/camera\.rotation\.set\(0,lookYaw,0\)/);
});
test('Enemy render visibility is never gated by the station selector',()=>{
  assert.match(source,/function inAIArena\(\)\{return isArenaActive\(stationIndex,player\);\}/);
  assert.match(source,/enemy\.root\.visible=enemy\.state\.alive\|\|enemy\.deathTimer<\.7/);
  assert.match(source,/enemy\.billboard\.mesh\.visible=enemy\.state\.alive/);
  assert.doesNotMatch(source,/enemy\.root\.visible=active/);
  assert.match(source,/Number\(e\.code\.slice\(5\)\)<=9/);
  assert.match(source,/updateEnemies\(dt,elapsed\);[\s\S]*renderer\.render\(scene,camera\)/);
});
test('W06.4 distant NPCs continue moving and deaths finish outside the arena',()=>{
  assert.match(source,/const simulating=controls\.isLocked&&enemyAIEnabled/);
  assert.match(source,/enabled:simulating&&playerHealth\.alive/);
  assert.doesNotMatch(source,/if\(!active\)continue/);
  assert.match(source,/function markEnemyDefeated\(enemy\)/);
  assert.match(source,/enemy\.flash=0;enemy\.shake=0/);
});
test('W20.23 neck collider remains continuous between animated chest and head',()=>{
  const neck=source.match(/new THREE\.CylinderGeometry\(\.13,\.15,([\d.]+),10\)/);
  assert.ok(neck,'neck collider must exist');
  const height=Number(neck[1]);
  const torsoChestTop=.33+.74/2;
  const neckBase=.66+.02-height/2;
  const neckTop=.66+.02+height/2;
  const headBottom=.66+.18+.035-.225;
  assert.ok(neckBase<torsoChestTop,'neck joins the torso');
  assert.ok(neckTop>headBottom,'neck joins the face');
  assert.ok(headBottom>torsoChestTop-.1,'chest must not envelop the head');
  assert.match(source,/remountHitbox\(hitParts\.neck,joints\.neck,0,\.02,0\)/);
});
test('W06.5 visible armor and loot share the same six-slot NPC outfit',()=>{
  assert.match(source,/enemyArmorForRound\(enemy\.id,arenaRound\)/);
  assert.match(source,/refreshEnemyArmorVisuals\(enemy\)/);
  assert.match(source,/mesh\.userData\.equipped=piece\.points>0/);
  assert.match(source,/mesh\.material\.color\.setHex\(piece\.color\)/);
  assert.match(source,/mesh\.userData\.equipped!==false&&\s*shouldRaycastEnemy/);
  assert.match(source,/generateEnemyLoot\(enemy\.id,arenaRound,enemy\.state\.loadout\)/);
  assert.match(source,/armorVisible:Object\.fromEntries/);
});
test('W06.6 neck remains hittable without an orange chest strip',()=>{
  assert.doesNotMatch(source,/shoulderMark/);
  assert.doesNotMatch(source,/new THREE\.BoxGeometry\(\.7,\.11,\.075\)/);
  assert.match(source,/new THREE\.CylinderGeometry\(\.13,\.15,\.16,10\)/);
});
test('W06.7 distant hits activate combat and long-range suppression',()=>{
  assert.match(source,/e\.state\.alive&&e\.brain\.memory>0/);
  assert.match(source,/tactic\.phase==='suppress-long'/);
  assert.match(source,/LONG-RANGE SUPPRESSION/);
  assert.match(source,/window\.__rpgSmokeLongRangeEngage/);
  assert.match(source,/enemyShots:e\.tactics\.shots/);
});
test('Health and enemies have real connected HUD elements',()=>{
  const ids=['playerHealthHud','healthReadout','healthFill','healthStatus',
    'playerDamageFlash','enemyHud','enemyCount','enemyMode','enemyList'];
  for(const id of ids){
    assert.ok(page.includes('id="'+id+'"'),'Missing HUD element '+id);
    if(id!=='playerHealthHud')assert.ok(source.includes("'"+id+"'"),'Missing scene wiring '+id);
  }
  assert.ok(source.includes('calculateIncomingShot(attack.damage,armor.points,'));
  assert.match(source,/resetPlayerHealth\(playerHealth\)/);
  assert.match(source,/canEnemyFire\(enemy\.brain,player,bounds,attack\.range\)/);
});
test('Direct enter button, engine status and cache version are wired',()=>{
  assert.match(page,/id="enterAI"/);
  assert.match(page,/id="engineStatus"/);
  assert.match(source,/\$\('enterAI'\)\.addEventListener\('click'/);
  assert.match(source,/RAIDERS LOADED/);
  assert.match(source,/new URLSearchParams\(location\.search\)\.get\('station'\)==='9'/);
  assert.match(page,/main\.js\?v=W20\.42/);
  assert.match(source,/RAIDERS ALIVE · /);
});
test('WebGL startup accepts software contexts and reports actual errors',()=>{
  assert.match(source,/powerPreference:'default'/);
  assert.match(source,/powerPreference:'low-power'/);
  assert.match(source,/failIfMajorPerformanceCaveat:false/);
  assert.match(source,/antialias:false/);
  assert.match(source,/reducedRenderer\?1:1\.6/);
  assert.doesNotMatch(page,/This testing browser could not initialize WebGL/);
  assert.match(page,/event\.error\?\.message\|\|event\.message/);
  assert.match(page,/event\.reason\?\.message/);
});
test('A returning player restores weapon state only after all HUD/recoil variables initialize',()=>{
  const restore=source.indexOf("if(backpack.equipment.weapon!=='scrap-pistol')");
  assert.ok(restore>0);
  for(const key of ['let lastShotDebug=null','let totalHits=0','let slideCycle=0']){
    const declaration=source.indexOf(key);
    assert.ok(declaration>0&&declaration<restore,
      key+' must initialize before saved weapon restoration');
  }
  assert.match(source,/selectWeapon\(backpack\.equipment\.weapon\)/);
});
test('Dead NPC bodies and indicators despawn, then J restores them',()=>{
  assert.match(source,/enemy\.deathTimer\+=Math\.max\(0,elapsed\)/);
  assert.match(source,/if\(enemy\.deathTimer>=\.7\)enemy\.root\.visible=false/);
  assert.match(source,/enemy\.beacon\.visible=enemy\.state\.alive/);
  assert.match(source,/enemy\.billboard\.mesh\.visible=enemy\.state\.alive/);
  assert.match(source,/if\(hit\.killed\)\{/);
  assert.match(source,/enemy\.brain\.active=false/);
  assert.match(source,/enemy\.deathTimer=0/);
  assert.match(source,/enemy\.root\.visible=true;enemy\.billboard\.mesh\.visible=true/);
  assert.match(source,/enemy\.beacon\.visible=true/);
  assert.match(source,/updateArenaSign\(\)/);
  assert.match(source,/function resetEnemies\(\)/);
  assert.match(source,/KeyJ/);
});
test('3D world markers, hit labels and arena sign respect obstacle occlusion',()=>{
  assert.doesNotMatch(source,/depthTest:false/);
  assert.match(source,/color:0xf19668,depthTest:true/);
  assert.doesNotMatch(source,/color:0xf2ad66,depthTest:true/);
  assert.match(source,/map:texture,transparent:true,depthTest:true,depthWrite:false/);
  assert.match(source,/map:locatorTex,transparent:true,depthTest:true,depthWrite:false/);
  assert.doesNotMatch(source,/for\(const \[x,z\] of \[\[39,42\],\[43,46\],\[46,36\.8\]\]\)/);
});
test('Advanced AI cover, reload, accuracy and visual behavior are wired',()=>{
  assert.match(source,/tickEnemyTactics\(enemy\.tactics,enemy\.brain,tacticalTarget,dt,aiObstacles/);
  assert.match(source,/attemptEnemyShot\(enemy\.tactics/);
  assert.match(source,/markEnemyThreat\(enemy\.tactics\)/);
  assert.match(source,/resetEnemyTactics\(enemy\.tactics\)/);
  assert.match(source,/if\(shot\.hit&&!obstruction\)\{/);
  assert.match(source,/if\(!shot\.hit\)\{/);
  assert.match(source,/combatGoal:tactic\.goal/);
  assert.match(source,/combatHold:tactic\.phase==='hold'/);
  assert.match(source,/ENEMY_PROFILES\[enemy\.id\]\.moveSpeed/);
  assert.match(source,/enemy\.tactics\.reloadRemaining>0\?'RELOAD'/);
  assert.match(page,/SEARCHABLE LOOT \+ INVENTORY/);
});
test('NPC cover crouch lowers real mesh hitboxes and resets on respawn',()=>{
  assert.match(source,/const upperBody=new THREE.Group\(\);root\.add\(upperBody\)/);
  assert.match(source,/hitParts\.chest=part\(upperBody,new THREE.BoxGeometry\(\.70,\.74,\.46\)/);
  assert.match(source,/part\(upperBody,new THREE.SphereGeometry\(\.225,14,10\)/);
  assert.match(source,/armPivot\.position\.set\(side\*\.43,1\.65,0\);upperBody\.add\(armPivot\)/);
  assert.match(source,/enemy\.upperBody\.position\.y=-\.82\*enemy\.crouchBlend/);
  assert.match(source,/enemy\.tactics\.crouching\?'CROUCHED'/);
  assert.match(source,/enemy\.billboard\.mesh\.position\.set\(enemy\.brain\.x,/);
  assert.match(source,/enemy\.deathTimer=0;enemy\.crouchBlend=0;enemy\.upperBody\.position\.y=0/);
  assert.match(source,/const collider=\{minX:.*height:h\}/);
});
test('Existing armor and pistol systems remain in the same script',()=>{
  assert.match(source,/rebuildDummyArmor/);
  assert.match(source,/fireWeapon\(weaponState,activeSpec/);
  assert.match(source,/markBulletHole/);
  assert.match(source,/updateCombatVisuals\(dt\)/);
});

test('Six selectable unique models and independent weapon states are wired',()=>{
  assert.match(page,/id="weaponSelect"/);
  assert.match(page,/id="weaponName"/);
  assert.match(page,/id="weaponStats"/);
  assert.match(page,/SEARCHABLE LOOT \+ INVENTORY/);
  assert.match(source,/const arsenalStates=createArsenalStates\(\)/);
  assert.match(source,/const weaponVisuals=new Map\(\)/);
  assert.match(source,/weaponVisuals\.set\(PIPE_PISTOL\.id,pipePistolVisual\)/);
  assert.match(source,/REBUILT_WEAPON_IDS\.includes\(spec\.id\)/);
  assert.match(source,/function buildArsenalView\(spec\)/);
  assert.match(source,/function selectWeapon\(id\)/);
  assert.match(source,/function cycleWeapon\(direction\)/);
  assert.match(source,/weaponVisuals\.get\(activeWeaponId\)\.root\.visible=false/);
  assert.match(source,/weaponVisuals\.get\(id\)\.root\.visible=true/);
  assert.match(source,/if\(e\.code==='KeyZ'/);
  assert.match(source,/if\(e\.code==='KeyX'/);
  assert.match(source,/getWeaponSpec\(id\)/);
});
test('Automatic shooting, shotgun pellet traces and independent reloading use selected weapon',()=>{
  assert.match(source,/fireWeapon\(weaponState,activeSpec,Math\.random,weaponMotion\)/);
  assert.match(source,/for\(const pellet of result\.directions\)/);
  assert.match(source,/applyDamage\(enemy\.state,boostedDamage/);
  assert.match(source,/applyDamage\(dummy\.state,damageThisPellet/);
  assert.match(source,/startWeaponReload\(weaponState,activeSpec\)/);
  assert.match(source,/createWeaponState\(activeSpec\)/);
  assert.match(source,/updateWeapon\(state,dt,spec,\{reloadSpeedMultiplier:specialModifiers\.reloadSpeedMultiplier\}\)/);
  assert.match(source,/if\(ammoSpentOnReload\)saveBackpack\(\)/);
  assert.ok(source.includes("controls.isLocked&&triggerHeld&&activeSpec.automatic&&powerArmorState.phase==='idle'"));
  assert.ok(source.includes("else {triggerHeld=true;shoot();}"));
  assert.match(source,/if\(e\.button===0\)\{triggerHeld=false;emptyClickLatched=false;\}/);
  assert.match(source,/new THREE\.CylinderGeometry/);
});

test('W05.1 sight mounts are actually used for stable camera-space ADS',()=>{
  assert.ok(source.includes("import { sightMount, adsWeaponPosition, sightForOptic"));
  assert.match(source,/const mount=sightMount\(spec\.id\)/);
  assert.match(source,/function alignActiveSight\(\)\{/);
  assert.match(source,/const anchor=adsWeaponPosition\(activeWeaponId\)/);
  assert.match(source,/visual\.root\.position\.set\(anchor\.x,anchor\.y,anchor\.z\)/);
  assert.match(source,/visual\.root\.rotation\.set\(0,0,0\)/);
  assert.match(source,/if\(weaponState\.aiming&&!handling\.active\)\{/);
  assert.match(source,/alignActiveSight\(\)/);
  assert.doesNotMatch(source,/const desired=weaponState\.aiming\?/);
  assert.ok(source.includes("sightForOptic(activeWeaponId,installedWeaponOptic(backpack,activeWeaponId)).fov:76"));
});
test('W05.1 3D optics are lowered, hollow, and centered on the actual sight',()=>{
  assert.match(source,/const scopeBody=part\(new THREE\.CylinderGeometry\(\.069,\.069,\.40,18,1,true\)/);
  assert.match(source,/0,mount\.y,mount\.z\)/);
  assert.match(source,/scopeBody\.rotation\.x=Math\.PI\/2/);
  assert.match(source,/new THREE\.TorusGeometry\(\.069,\.014,9,22\)/);
  assert.match(source,/new THREE\.TorusGeometry\(holo\?\.069:\.052,\.009,8,22\)/);
  assert.match(source,/new THREE\.SphereGeometry\(\.008,8,8\)/);
  assert.match(source,/new THREE\.ExtrudeGeometry\(outline/);
  assert.match(source,/sightLocal:new THREE\.Vector3\(0,\.207,-\.16\)/);
  assert.match(page,/SEARCHABLE LOOT \+ INVENTORY/);
});

test('W05.2 fixes six-shooter sight obstruction and pistol notch geometry',()=>{
  assert.match(source,/box\(\.15,\.035,\.25,trim,0,\.106,-\.23\)/);
  assert.match(source,/box\(\.028,\.044,\.058,steel,-\.126,\.12,-\.055\)/);
  assert.match(source,/cylinderSpinGroup=new THREE\.Group\(\)/);
  assert.doesNotMatch(source,/box\(\.15,\.065,\.31,trim,0,\.132,-\.23\)/);
  assert.match(source,/sights,\.043\*side,\.1795,\.10,slideGroup/);
  assert.match(source,/sights,0,\.177,-\.42,slideGroup/);
  assert.match(source,/pistolFrontSight\.userData\.sightReference=true/);
  assert.match(source,/frontBlade\.userData\.sightReference=true/);
  assert.match(source,/redDot\.userData\.sightReference=true/);
});
test('Shotgun and revolver have no fake visible mags and have real moving actions',()=>{
  assert.match(source,/const enclosed=revolver\|\|shotgun/);
  assert.match(source,/magazine\.visible=!enclosed/);
  assert.match(source,/magazineBase\.visible=!enclosed/);
  assert.match(source,/reloadAction\.visible=false/);
  assert.match(source,/visual\.cylinderYoke\.rotation\.y=opening\*1\.12/);
  assert.match(source,/visual\.pumpGrip\.position\.z=-\.34\+cycling\*1\.5\+handling\.pumpOffset/);
  assert.match(source,/visual\.reloadHand\.visible=handling\.handVisible/);
});
test('Shell casings eject from actual selected gun and revolvers retain spent cases',()=>{
  assert.match(source,/if\(activeSpec\.kind==='revolver'\)return;/);
  assert.match(source,/visual\.root\.updateWorldMatrix\(true,false\)/);
  assert.match(source,/casingOrigin\.copy\(visual\.ejectionLocal\)\.applyMatrix4\(visual\.root\.matrixWorld\)/);
  assert.doesNotMatch(source,/casingOrigin\.set\(\.18,-\.08,-\.47\)\.applyMatrix4\(camera\.matrixWorld\)/);
});
test('Actual ADS viewmodel ray diagnostic is available per weapon',()=>{
  assert.match(page,/id="weaponSightCheck"/);
  assert.match(source,/function inspectSightClearance\(\)\{/);
  assert.match(source,/sightProbe\.intersectObject\(visual\.root,true\)/);
  assert.match(source,/!h\.object\.userData\.sightReference/);
  assert.match(source,/ADS BLOCKED · MODEL OBSTRUCTION/);
  assert.match(source,/ADS SIGHT LINE CLEAR/);
  assert.match(source,/sightCheck\.style\.display=weaponState\.aiming&&!handling\.active/);
});
test('Player weapon sound/reload select the actual weapon profile',()=>{
  assert.match(source,/sound\.gunshot\(activeWeaponId===PIPE_SMG\.id\?'pipe-smg':\s*activeWeaponId===HEAVY_SNIPER\.id\?'heavy-sniper':\s*activeWeaponId===BOLT_HUNTING_RIFLE\.id\?'hunting-bolt':/);
  assert.ok(source.includes("sound.reload(activeWeaponId===TEN_MM_PISTOL.id?'10mm':"));
});

test('W05.3 damage hitboxes do not depend on previously selected station',()=>{
  assert.match(source,/const enemyParts=enemyHitMeshes\.filter\(mesh=>/);
  assert.match(source,/shouldRaycastEnemy\(enemies\.get\(mesh\.userData\.enemyId\)\)/);
  assert.doesNotMatch(source,/const enemyParts=inAIArena\(\)\?/);
  assert.match(source,/combatRuntimeStatus\(\{/);
  assert.match(source,/AI DAMAGE CONFIRMED · /);
  assert.match(source,/enemyDamageHits\+\+/);
  assert.match(source,/if\(new URLSearchParams\(location\.search\)\.get\('smoke'\)==='1'\)/);
});

test('W05.3.1 limits empty automatic dry fire to one click per trigger pull',()=>{
  assert.match(source,/let emptyClickLatched=false/);
  assert.match(source,/if\(result\.status==='empty'\)\{\s*\/\/ Automatic guns/);
  assert.match(source,/if\(!emptyClickLatched\)\{/);
  assert.match(source,/emptyClickLatched=true;\s*dryFireClicks\+\+;\s*sound\.dryFire\(\)/);
  assert.match(source,/if\(result\.status!=='fired'\)return;/);
  assert.match(source,/emptyClickLatched=false;\s*if\(laserActive\)sound\.laserBlast/);
  assert.match(source,/if\(e\.button===0\)\{triggerHeld=false;emptyClickLatched=false;\}/);
  assert.ok(source.includes("controls.isLocked&&triggerHeld&&activeSpec.automatic&&powerArmorState.phase==='idle'"));
  assert.match(source,/triggerHeld=false;emptyClickLatched=false/);
  assert.match(source,/if\(startWeaponReload\(weaponState,activeSpec\)\)\{\s*emptyClickLatched=false/);
});

test('W05.4 actual arena AI integrates shared squad sightings and distinct roles',()=>{
  assert.match(source,/import \{createSquadIntel,clearSquadIntel,reportSquadContact,/);
  assert.match(source,/const squadIntel=createSquadIntel\(\)/);
  assert.match(source,/stepSquadIntel\(squadIntel,dt,ticking&&playerHealth\.alive\)/);
  assert.match(source,/shareSquadContact\(squadIntel,\[\.\.\.enemies\.values\(\)\],bounds,player\)/);
  assert.match(source,/reportSquadContact\(squadIntel,enemy\.id,player\)/);
  assert.match(source,/occupiedCover:occupiedSquadCover\(roster,enemy\.id\)/);
  assert.match(source,/separation:squadSeparation\(enemy\.brain,roster\)/);
  assert.match(source,/clearSquadIntel\(squadIntel\)/);
  assert.match(source,/enemy\.tactics\.phase==='flank'\?'FLANKING'/);
  assert.match(source,/enemy\.tactics\.phase==='suppress'\?'SUPPRESSING'/);
  assert.match(source,/enemy\.tactics\.phase==='peek'\?'PEEK & FIRE'/);
});
test('W05.4 enemy 3D animation and shooting respond to stance and peek',()=>{
  assert.match(source,/enemy\.combatPose\+=/);
  assert.match(source,/enemy\.reloadPose\+=/);
  assert.match(source,/enemy\.recoilPose=1/);
  assert.match(source,/enemy\.upperBody\.rotation\.z\+=/);
  assert.match(source,/enemy\.upperBody\.rotation\.x=/);
  assert.match(source,/combatHold:tactic\.phase==='hold'\|\|tactic\.phase==='peek'/);
  assert.match(source,/!\['cover','hold','peek-move','reload'\]\.includes\(enemy\.tactics\.phase\)/);
  assert.match(source,/enemy\.upperBody\.rotation\.set\(0,0,0\)/);
  assert.match(source,/stuckEvents:e\.tactics\.stuckEvents/);
});

test('W06.0 world loot follows actual enemy death, not corpse visibility',()=>{
  assert.match(source,/function spawnEnemyLoot\(enemy\)\{/);
  assert.match(source,/spawnEnemyLoot\(enemy\);/);
  assert.match(source,/createLootBag\('bag-'\+\(\+\+lootSerial\)/);
  assert.match(source,/lootBags\.set\(bag\.id,\{\.\.\.bag,mesh:marker\}\)/);
  assert.match(source,/function nearestLootBag\(\)\{/);
  assert.match(source,/if\(bag\)beginLootOverlay\(bag\.id\)/);
  assert.match(source,/scene\.remove\(drop\.mesh\)/);
  assert.match(source,/disposeLootMarker\(drop\.mesh\)/);
});
test('W06.0 inventory is real player equipment, not dummy-only armor editor',()=>{
  assert.match(page,/id="inventoryPanel"/);
  assert.match(page,/id="lootPanel"/);
  assert.match(page,/id="inventoryItems"/);
  assert.match(page,/id="lootItems"/);
  assert.match(page,/id="lootTakeAll"/);
  assert.match(page,/id="inventoryOpen"/);
  assert.match(page,/id="lootPrompt"/);
  assert.match(source,/let backpack=createBackpack\(\)/);
  assert.match(source,/safeBackpackSnapshot\(saved\)/);
  assert.match(source,/localStorage\.setItem\('rpg-lab-player-inventory'/);
  assert.match(source,/equipFromInventory\(backpack,entry\.uid\)/);
  assert.match(source,/if\(item\.category==='ammo'\)syncAmmoToWeapons\(\)/);
  assert.match(source,/function syncAmmoToWeapons\(\)/);
  assert.match(source,/useSupply\(backpack,entry\.uid,playerHealth\)/);
  assert.match(source,/spawnWorldLoot\(\[\{itemId:dropped\.itemId,quantity:dropped\.removed,/);
  assert.match(source,/dropAmount\.max=String\(entry\.quantity\)/);
  assert.match(source,/Number\.isSafeInteger\(amount\)/);
  assert.match(source,/playerArmorReduction\(backpack,'chest'\)/);
  assert.ok(source.includes('calculateIncomingShot(attack.damage,armor.points,'));
  assert.match(source,/if\(e\.code==='KeyE'&&!e\.repeat&&controls\.isLocked\)/);
  assert.match(source,/if\(e\.code==='KeyI'&&!e\.repeat\)/);
});
test('W06.0 loot modal, game pause and persistence have a browser gameplay check',()=>{
  assert.match(page,/E SEARCH LOOT · I BACKPACK/);
  assert.match(page,/main\.js\?v=W20\.42/);
  assert.match(source,/function beginLootOverlay\(id=null\)/);
  assert.match(source,/if\(fromField\)controls\.unlock\(\)/);
  assert.ok(source.includes("!questPanelOpen&&!dialogueOpen)$('menu').classList.remove('hidden')"),
    'Pointer unlock keeps the pause menu hidden while quest overlays are open');
  assert.match(source,/function closeLootOverlay\(\)/);
  assert.match(source,/if\(lootOverlayFromField\)\{/);
  assert.match(source,/function discardEmptyLootBags\(\)/);
  assert.match(source,/selectedLootId=null/);
  assert.match(source,/window\.__rpgSmokeSpawnLoot=/);
});

test('W07.0 workbench and all-weapon ADS zeroing are wired',()=>{
  assert.match(page,/id="workbenchPanel"/);
  assert.match(page,/id="benchMaterials"/);
  assert.match(page,/id="weaponOptic"/);
  for(const expected of ['installWeaponOptic(backpack,weaponId,id)',
    'function beginWorkbench()','function benchWithinReach()',
    'camera.getWorldQuaternion','installedWeaponOptic(backpack,activeWeaponId)']){
    assert.ok(source.includes(expected),expected);
  }
});

test('W07.1 scope reticle has four fine semi-transparent arms near center',()=>{
  assert.match(source,/const crosshair=new THREE\.MeshBasicMaterial/);
  assert.match(source,/color:0xcbe2d6,transparent:true,opacity:\.66,depthWrite:false/);
  assert.match(source,/side\*\.020,mount\.y,mount\.z-\.197/);
  assert.match(source,/0,mount\.y\+side\*\.020,mount\.z-\.197/);
  assert.match(source,/horizontal\.userData\.sightReference=true/);
  assert.match(source,/vertical\.userData\.sightReference=true/);
  assert.match(page,/id="lootFeedback"/);
  assert.match(source,/NOW OWN /);
});

test('W08.3 real powered suit has six removable meshes and timed entry controls',()=>{
  for(const id of ['powerArmorPanel','powerArmorStatus','powerArmorDetail',
    'powerBayOpen','powerArmorControl','power-head','power-chest',
    'power-leftArm','power-rightArm','power-leftLeg','power-rightLeg'])
    assert.ok(page.includes('id="'+id+'"'),id);
  for(const phrase of ['buildPowerArmorVisual(scene,powerArmorBay,powerArmorState)',
    'buildPowerArmorCockpit(camera)','poweredSuit.updatePlates(powerArmorState)',
    'beginPowerArmorTransition(powerArmorState)','stepPowerArmor(powerArmorState,dt)',
    'calculateIncomingShot(attack.damage,armor.points,',
    'beginPowerHold()','finishPowerHold()',
    'window.__rpgSmokePowerVisual='])
    assert.ok(source.includes(phrase),phrase);
});

test('W08.3 uses crouch-aware camera heights instead of the old fixed 2.82m',()=>{
  assert.match(source,/powerArmorEyeHeight\(powerArmorState,info\.eyeHeight\)/);
  assert.doesNotMatch(source,/powerArmorState\.occupied\?2\.82:info\.eyeHeight/);
  assert.match(source,/crouched:!!player\.crouched/);
});

test('W09.6 uses three original pixel-textured enemy designs, not imported GLBs',()=>{
  assert.match(npcAvatar,/export function createNpcAvatar\(parent,kind\)/);
  assert.match(npcAvatar,/scout:Object\.freeze/);
  assert.match(npcAvatar,/raider:Object\.freeze/);
  assert.match(npcAvatar,/enforcer:Object\.freeze/);
  assert.match(npcAvatar,/createPlayerAvatar\(parent,\{variant:kind\}\)/);
  assert.match(playerAvatar,/variant==='scout'/);
  assert.match(playerAvatar,/variant==='raider'/);
  assert.match(playerAvatar,/variant==='enforcer'/);
  assert.match(playerAvatar,/THREE\.NearestFilter/);
  assert.doesNotMatch(source,/mountRiggedCharacter\(root/);
  assert.match(source,/enemy\.rigged=createNpcAvatar\(root,spec\.id\)/);
  assert.match(source,/mesh\.material\.visible=false/);
  assert.match(source,/enemy\.rifleVisual\.visible=false/);
  assert.match(source,/modelStatus:'original'/);
  assert.match(page,/main\.js\?v=W20\.42/);
});
test('W09.6 original enemies match gameplay armor and animate held guns',()=>{
  for(const slot of ['head','chest','leftArm','rightArm','leftLeg','rightLeg'])
    assert.ok(npcAvatar.includes("'"+slot+"'"),'Missing '+slot+' armor slot');
  for(const family of ['scrap','ranger','militia','citadel'])
    assert.ok(npcAvatar.includes("'"+family+"'"),'Missing '+family+' armor mapping');
  assert.match(npcAvatar,/avatar\.setArmor\(npcCosmeticArmor\(loadout\)\)/);
  assert.match(npcAvatar,/avatar\.weaponSocket/);
  assert.match(npcAvatar,/gun\.rotation\.x=/);
  assert.match(npcAvatar,/magazine\.position\.y=/);
  assert.match(npcAvatar,/avatar\.update\(\{dt,x:0,z:0,ground:0,yaw:NPC_VISUAL_YAW_OFFSET/);
  assert.match(source,/enemy\.rigged\?\.setArmor\(enemy\.state\.loadout\)/);
  assert.match(source,/enemy\.rigged\?\.update\(dt,\{/);
  assert.match(source,/reloading:liveNpcGun&&enemy\.tactics\.reloadRemaining>0/);
  assert.match(source,/recoil:enemy\.recoilPose/);
  assert.match(source,/originalVisual:e\.rigged\?\.state/);
  assert.match(source,/modelHeight:e\.rigged\?\.metrics\.height/);
  assert.match(source,/enemy\.root\.visible=enemy\.state\.alive\|\|enemy\.deathTimer<\.7/);
  assert.match(source,/generateEnemyLoot\(enemy\.id,arenaRound,enemy\.state\.loadout\)/);
});
test('W09.3 builds an original pixel-textured player and a separate third-person preview',()=>{
  assert.match(playerAvatar,/export function createPlayerAvatar\(scene,/);
  assert.match(playerAvatar,/CanvasTexture/);
  assert.match(playerAvatar,/THREE\.NearestFilter/);
  assert.match(playerAvatar,/OriginalPixelSurvivor/);
  assert.match(playerAvatar,/const arms=\[\],legs=\[\]/);
  assert.match(playerAvatar,/crouchBlend/);
  assert.doesNotMatch(playerAvatar,/GLTFLoader|mountRiggedCharacter/);
  assert.match(source,/createPlayerAvatar\(scene\)/);
  assert.match(source,/e\.code==='KeyV'/);
  assert.match(source,/thirdPersonRay\.intersectObjects\(worldGeometry,false\)/);
  assert.match(source,/playerAvatar\.update\(\{dt/);
  assert.match(source,/renderer\.render\(scene,thirdPersonCamera\)/);
  assert.match(source,/else renderer\.render\(scene,camera\)/);
  assert.match(source,/playerVisual:\{thirdPersonEnabled,thirdPersonActive/);
  assert.match(page,/V THIRD PERSON/);
});

test('W09.4 armor slots visibly mount to the survivor and its power-suit pilot',()=>{
  for(const slot of ['head','chest','leftArm','rightArm','leftLeg','rightLeg'])
    assert.ok(playerAvatar.includes("'"+slot+"'"),'Missing '+slot+' visual armor');
  for(const kind of ['scrap','ranger','militia','citadel'])
    assert.ok(playerAvatar.includes(kind+':{main:pixelFabric'),'Missing '+kind+' armor material');
  assert.match(playerAvatar,/function setArmor\(loadout=\{\}\)/);
  assert.match(playerAvatar,/armorLayer\('chest',kind,torso/);
  assert.match(playerAvatar,/armorLayer\(armSlot,kind,elbow/);
  assert.match(playerAvatar,/armorLayer\(legSlot,kind,knee/);
  assert.match(source,/playerAvatar\.setArmor\(backpack\.equipment\.armor\)/);
  assert.match(source,/pilotAvatar\.setArmor\(backpack\.equipment\.armor\)/);
  assert.match(source,/pilotAvatar\.update\(\{dt/);
  assert.match(source,/pilotModel:pilotAvatar\.root\.name/);
  assert.match(page,/main\.js\?v=W20\.42/);
});

test('W09.5 second survivor stays rendered independently of local V camera',()=>{
  assert.match(source,/createRemotePlayerVisual\(scene,'station8-preview'\)/);
  assert.match(source,/remotePreview\.sync\(\{\.\.\.remotePreviewPose,armor:remotePreviewArmor\},dt\)/);
  assert.match(source,/remotePreview:remotePreview\.state/);
  assert.match(source,/playerAvatar\.root\.visible=thirdPersonActive/);
  assert.match(remoteAvatar,/export function createRemotePlayerVisual\(scene,playerId\)/);
  assert.match(remoteAvatar,/avatar\.root\.visible=snapshot\.connected!==false/);
  assert.doesNotMatch(remoteAvatar,/thirdPersonEnabled|thirdPersonActive|KeyV/);
  assert.match(playerAvatar,/edge:pixelFabric/);
  assert.match(playerAvatar,/Matching front AND back plates|silhouette from BEHIND/);
  assert.match(page,/main\.js\?v=W20\.42/);
});

test('W09.7 survivor starts in plain clothes; only real equipment adds hat, pack and armor',()=>{
  assert.match(playerAvatar,/const plainSurvivor=variant==='survivor'/);
  assert.match(playerAvatar,/if\(plainSurvivor\)/);
  assert.match(playerAvatar,/if\(!plainSurvivor\)for\(let k=0;k<3;k\+\+\)/);
  assert.match(playerAvatar,/clothCap\.visible=false/);
  assert.match(playerAvatar,/clothBackpack\.visible=false/);
  assert.match(playerAvatar,/function setClothing\(loadout=\{\}\)/);
  assert.match(playerAvatar,/clothCap\.visible=clothingSlots\.head==='field-cap'/);
  assert.match(playerAvatar,/setArmor,setClothing,weaponSocket/);
  assert.match(source,/playerAvatar\.setClothing\(backpack\.equipment\.clothing\)/);
  assert.match(source,/pilotAvatar\.setClothing\(backpack\.equipment\.clothing\)/);
  assert.match(source,/unequipWearable\(backpack,item\.category,item\.slot\)/);
  assert.match(source,/item\.category==='clothing'/);
  assert.match(source,/visibleClothing:playerAvatar\.visibleClothing/);
  assert.match(page,/id="inventoryClothing"/);
});


test('W09.8 uses real inventory sections and automatic weapon ammo pickup',()=>{
  assert.match(page,/id="inventoryCategories"/);
  assert.match(page,/id="inventorySectionTitle"/);
  assert.match(page,/id="inventoryAmmo"/);
  assert.match(source,/INVENTORY_CATEGORIES\.filter\(category=>category\.id!=='weapon'\)/);
  assert.match(source,/inventorySection\(getItem\(entry\.itemId\)\)/);
  assert.match(source,/displayAmmoCount\(weaponState\.reserve\)/);
  assert.match(source,/if\(item\.category==='ammo'\)syncAmmoToWeapons\(\)/);
  assert.doesNotMatch(source,/LOAD RESERVE/);
});

test('W09.9 all solid lab walls block NPC vision, hits and tracers',()=>{
  assert.match(source,/stepEnemyBrain\(enemy\.brain,\{x:player\.x,z:player\.z\},dt,bounds/);
  assert.match(source,/canEnemyFire\(enemy\.brain,player,bounds,attack\.range\)/);
  assert.match(source,/const obstruction=firstSolidHit\(origin,target,bounds\)/);
  assert.match(source,/if\(shot\.hit&&!obstruction\)/);
  assert.match(source,/enemyTracer\(origin,endpoint\)/);
  assert.match(source,/window\.__rpgSmokeShotBlock=/);
});


test('W09.9 investigating NPCs use last seen or radio intel, never hidden live coordinates',()=>{
  assert.match(source,/const perceptions=new Map\(roster\.map\(e=>/);
  assert.match(source,/hasSight\(e\.brain,player,bounds\)/);
  assert.match(source,/const directlyVisible=perceptions\.get\(enemy\.id\)/);
  assert.match(source,/const tacticalTarget=directlyVisible\?player:/);
  assert.match(source,/enemy\.brain\.lastSeen\|\|\{x:enemy\.brain\.x,z:enemy\.brain\.z\}/);
  assert.match(source,/tickEnemyTactics\(enemy\.tactics,enemy\.brain,tacticalTarget,dt,aiObstacles/);
  assert.match(source,/targetVisible:directlyVisible/);
  assert.match(source,/area:AI_TUNING\.navigationArea/);
  assert.match(source,/const shouldAim=liveNpcGun&&directlyVisible&&/);
  assert.match(source,/window\.__rpgSmokeOccludedPursuit=/);
  assert.match(source,/shareSquadContact\(squadIntel,\[\.\.\.enemies\.values\(\)\],bounds,player\)/);
});


test('W09.9 NPC combat uses adaptive pace, meaningful roles and physical cover',()=>{
  assert.match(source,/combatSpeed:ENEMY_PROFILES\[enemy\.id\]\.moveSpeed\*enemy\.tactics\.pace/);
  assert.match(source,/decision:e\.tactics\.decisionReason/);
  assert.match(source,/const tacticalTarget=directlyVisible\?player:/);
});

test('W09.12 integrates squad orders, fair reacquisition, and visible tactical reasons',()=>{
  assert.match(source,/import \{createSquadDirector,resetSquadDirector,planSquadOrders\}/);
  assert.match(source,/const squadDirector=createSquadDirector\(\)/);
  assert.match(source,/resetSquadDirector\(squadDirector\)/);
  assert.match(source,/const lostContactOrders=planSquadOrders\(squadDirector/);
  assert.match(source,/lostContactOrder,combatGoal:tactic\.goal/);
  assert.match(source,/reactionSeconds/);
  assert.match(source,/squadOrder:squadDirector\.orders\.get\(e\.id\)/);
  assert.match(source,/enemy\.tactics\.phase==='guard-angle'\?'HOLDING LAST ANGLE'/);
  assert.match(page,/main\.js\?v=W20\.42/);
});

test('W09.14 NPCs render exactly one avatar and reserve all old body geometry for hits',()=>{
  assert.match(source,/mesh\.visible=false;mesh\.castShadow=false;mesh\.receiveShadow=false/);
  assert.match(source,/mesh\.material\.visible=false;mesh\.material\.colorWrite=false/);
  assert.match(source,/mesh\.userData\.equipped=piece\.points>0/);
  assert.match(source,/e\.meshes\.filter\(m=>m\.visible\|\|/);
  assert.match(source,/avatarRoots:e\.root\.children\.filter/);
  assert.match(source,/mesh\.userData\.equipped!==false&&/);
});

test('W09.14 NPC damage uses the real gun and wearable armor points',()=>{
  assert.match(source,/import \{calculateIncomingShot\} from '\.\.\/player-ballistics\.mjs'/);
  assert.match(source,/calculateIncomingShot\(attack\.damage,armor\.points,/);
  assert.match(source,/hitPlayer\(playerHealth,incoming\.damage\*specialModifiers\.damageTakenMultiplier\)/);
  assert.match(source,/window\.__rpgSmokeIncomingDamage=/);
  assert.match(source,/100,ordinary\.points,powerArmorState,'chest'/);
});

test('W09.15 NPCs show one body and face the same direction as their gunfire',()=>{
  assert.match(npcAvatar,/export const NPC_VISUAL_YAW_OFFSET=Math\.PI/);
  assert.match(npcAvatar,/avatar\.root\.rotation\.y=NPC_VISUAL_YAW_OFFSET/);
  assert.match(npcAvatar,/yaw:NPC_VISUAL_YAW_OFFSET/);
  assert.match(source,/upperBody\.visible=false/);
  assert.match(source,/enemy\.rifleVisual\.visible=false/);
  assert.match(source,/enemy\.root\.rotation\.y=enemy\.brain\.yaw/);
});

test('W10.0 power armor uses owned modular pieces, local repair and real core fuel',()=>{
  for(const id of ['powerCoreStatus','powerCoreChoice','powerInsertCore',
    'powerEjectCore','powerCraftTier','powerCraftSlot','powerCraftButton',
    'powerServiceFeedback','power-repair-head','power-repair-rightArm'])
    assert.ok(page.includes('id="'+id+'"'),id+' control is required');
  assert.match(source,/spawnWorldLoot\(powerCacheContents,-53,-9,'power-cache'\)/);
  assert.match(source,/takeFromBag\(backpack,bag,i\)/);
  assert.match(source,/removeItem\(backpack,owned\.uid,1\)/);
  assert.match(source,/setPowerPlate\(powerArmorState,slot,item\.tier,taken\.condition\)/);
  assert.match(source,/repairPowerPlate\(powerArmorState,slot,available,specialModifiers\.repairDiscount\)/);
  assert.match(source,/installFusionCore\(powerArmorState,entry\.charge\)/);
  assert.match(source,/ejectFusionCore\(powerArmorState\)/);
  assert.match(source,/damagePowerPlate\(powerArmorState,zone,attack\.damage\)/);
  assert.match(source,/stepFusionCore\(powerArmorState,dt,/);
  assert.match(source,/speedMultiplier:mobility\.factor\*specialModifiers\.speedMultiplier,\s*staminaDrainMultiplier:specialModifiers\.staminaDrainMultiplier,\s*allowSprint:mobility\.canSprint/);
  assert.match(source,/window\.__rpgSmokeApproachPowerCache=/);
});

test('W11.0 has one exposed modular frame, tap-E service, and hold-E entry',()=>{
  assert.match(source,/const POWER_HOLD_MS=650/);
  assert.match(source,/powerHoldTimer=setTimeout/);
  assert.match(source,/if\(e\.code==='KeyE'&&!e\.repeat&&controls\.isLocked\)/);
  assert.match(source,/beginPowerHold\(\);return/);
  assert.match(source,/if\(e\.code==='KeyE'&&finishPowerHold\(\)\)/);
  assert.match(source,/powerArmorState\.occupied\?\s*'HOLD E · EXIT POWER ARMOR'/);
  assert.doesNotMatch(source,/e\.code==='KeyP'/);
  assert.doesNotMatch(source,/e\.code==='KeyO'/);
  assert.match(armorVisual,/const moduleMeshes=Object\.fromEntries/);
  assert.match(armorVisual,/for\(const part of moduleMeshes\[slot\]\)\{\s*part\.visible=entry\.points>0/);
  assert.match(page,/TAP E AT FRAME TO CONFIGURE/);
  assert.match(page,/HOLD E TO ENTER\/EXIT/);
});

test('W12.0 bare power frame is mechanically connected and entered from behind',()=>{
  for(const phrase of [
    'const frameFeatures={torsoRibs:0,armLinks:0,legLinks:0,rearHatch:true}',
    'frameFeatures.armLinks+=2','frameFeatures.legLinks+=2',
    'const neckRing=mesh(root,new THREE.TorusGeometry(',
    'const chestMounts={left:makeGroup(root,',
    'const doors={left:makeGroup(root,-.50,1.89,-.43)',
    'pilot.position.set(pose.x,pose.y,pose.z)',
    'doors.left.rotation.y=open*1.55'])
    assert.ok(armorVisual.includes(phrase),phrase);
  assert.match(source,/function nearRearHatch\(\)/);
  assert.match(source,/if\(!powerArmorState\.occupied&&!nearRearHatch\(\)\)/);
  assert.match(source,/const offset=exiting\?-2\.32:0/);
  assert.match(source,/new THREE\.Vector3\(1\.55,1\.95,-3\.70\)/);
  assert.match(source,/rearHatchOpenAngle:poweredSuit\.doors\.left\.rotation\.y/);
  assert.match(page,/id="powerArmorHud" class="hidden"/);
  assert.match(page,/#powerArmorHud\.hidden\{display:none\}/);
  assert.doesNotMatch(source,/textContent=fitted\+' \/ 6 PLATES/);
  assert.match(page,/REAR HATCH/);
});

test('W13.0 normal field HUD and power visor are separate live displays',()=>{
  for(const id of ['fieldHud','fieldHealth','fieldHealthFill','fieldStamina',
    'fieldStaminaFill','fieldAmmo','fieldWeaponName','fieldHeading','fieldThreat',
    'powerVisorHud','visorCoreNumber','visorCoreFill','visorIntegrity',
    'visorIntegrityFill','visorHealth','visorAmmo','visorWarning'])
    assert.ok(page.includes('id="'+id+'"'),id);
  assert.match(page,/body class="hud-modern"/);
  assert.match(page,/#fieldHud\.hidden,#powerVisorHud\.hidden\{display:none!important\}/);
  assert.match(page,/#powerVisorHud \.armor-dial\{/);
  assert.match(source,/document\.body\.classList\.toggle\('in-power-armor',visorActive\)/);
  assert.match(source,/\$\('fieldHud'\)\.classList\.toggle\('hidden',visorActive\|\|cinematic\)/);
  assert.match(source,/\$\('powerVisorHud'\)\.classList\.toggle\('hidden',!visorActive\)/);
  assert.match(source,/\$\('visorCoreFill'\)\.style\.width=charge\+'%'/);
  assert.match(source,/\$\('fieldHealthFill'\)\.style\.width=/);
  assert.match(source,/\$\('fieldStaminaFill'\)\.style\.width=/);
  assert.match(source,/\$\('visorAmmo'\)\.textContent=loaded/);
  assert.match(source,/if\(e\.code==='F3'&&!e\.repeat\)/);
});
test('W20.13 analog helmet HUD matches reference layout and live gauge data',()=>{
  for(const id of ['visorHpGauge','visorRadsGauge','visorCoreGauge',
    'visorApGauge','visorCompassTicks','visorCompassWaypoint','visorAmmoLoaded','visorAmmoReserve',
    'visorStamina','visorStaminaFill','visorStaminaTrack','visorStaminaState'])
    assert.ok(page.includes('id="'+id+'"'),id);
  assert.match(page,/class="armor-dial armor-hp"/);
  assert.match(page,/class="armor-dial armor-rads"/);
  assert.match(page,/class="armor-dial armor-core"/);
  assert.match(page,/class="armor-dial armor-ap"/);
  assert.match(page,/class="armor-compass"/);
  assert.doesNotMatch(page,/class="visor-panel visor-left"/);
  assert.doesNotMatch(page,/class="visor-top"/);
  assert.match(page,/id="visorStaminaTrack" class="sr-only" role="progressbar"/);
  assert.match(source,/buildVisorDial\('hp','visorHpGauge'/);
  assert.match(source,/buildVisorDial\('rads','visorRadsGauge'/);
  assert.match(source,/buildVisorDial\('core','visorCoreGauge'/);
  assert.match(source,/buildVisorDial\('ap','visorApGauge'/);
  assert.match(source,/setVisorDial\('hp',fraction\*100\)/);
  assert.match(source,/setVisorDial\('core',charge\)/);
  assert.match(source,/setVisorDial\('ap',staminaPct\)/);
  assert.match(source,/updateVisorCompass\(bearing\)/);
  assert.match(source,/updateVisorObjectiveMarker\(bearing\)/);
  assert.match(source,/\$\('visorAmmoLoaded'\)\.textContent=/);
  assert.match(source,/\$\('visorAmmoReserve'\)\.textContent=/);
  assert.match(source,/\$\('visorStaminaTrack'\)\.setAttribute\('aria-valuenow',String\(staminaPct\)\)/);
  // No radiation system exists yet; the instrument must not fabricate exposure.
  assert.match(source,/setVisorDial\('rads',0\)/);
});
test('W20.14 armor status figure has six independently driven sections',()=>{
  for(const slot of ['head','chest','leftArm','rightArm','leftLeg','rightLeg'])
    assert.ok(page.includes('id="visorArmor-'+slot+'"'),slot);
  assert.match(page,/id="visorArmorIndicator" class="armor-indicator"/);
  assert.match(page,/#powerVisorHud \.armor-indicator\{/);
  assert.match(page,/#powerVisorHud \.armor-segment\.critical \.armor-shell\{/);
  assert.match(page,/#powerVisorHud \.armor-segment\.empty \.armor-shell\{/);
  assert.match(source,/powerArmorIndicatorStatus\(powerArmorState,slot\)/);
  assert.match(source,/visualClass='armor-segment '\+part\.status/);
  assert.match(source,/id="visorArmorIndicator"|indicatorDescriptions\.join\(', '\)/);
  assert.match(page,/main\.js\?v=W20\.42/);
});
test('W13.0 T-45, T-60, T-01 use different pigments and silhouettes',()=>{
  assert.match(armorVisual,/const profiles=\{/);
  assert.match(armorVisual,/const profilePlate=\(parent,w,h,d,material,outline,bulge=\.06\)=>/);
  assert.match(armorVisual,/new THREE\.ExtrudeGeometry\(shape/);
  assert.match(armorVisual,/pos\.setZ\(i,pos\.getZ\(i\)\+dome\)/);
  assert.match(armorVisual,/function wornMetalTexture\(seed\)/);
  assert.match(armorVisual,/const contourFor=\(tier,role\)=>/);
  assert.match(armorVisual,/const cuirass=plate\('chest'/);
  assert.match(armorVisual,/const pauldron=plate\(armName/);
  assert.match(armorVisual,/const helmetShell=plate\('head'/);
  assert.match(armorVisual,/shell\.userData\.tierFaces=\{\}/);
  assert.match(armorVisual,/shell\.userData\.profileOutlines=profiles/);
  assert.match(armorVisual,/part\.material\.color\.lerp\(tone,\.15\)/);
  assert.match(armorVisual,/if\(condition\.broken\)face\.material\.color\.setHex/);
  for(const color of ['0xb1a48b','0x4f7585','0x694781'])
    assert.ok(powerArmor.includes(color),color);
  assert.match(source,/plateAppearance:Object\.fromEntries/);
  assert.match(source,/modelContours:\{\.\.\.poweredSuit\.plateMeshes\.head\[0\]\.userData\.profileOutlines\}/);
});

test('W14.0 SPECIAL skill tree is wired to movement, survival and combat',()=>{
  for(const id of ['specialPanel','specialGrid','specialClose','specialOpen',
    'specialLevel','specialXp','specialXpFill','specialStatPoints',
    'specialPerkPoints','specialFeedback','fieldLevel'])
    assert.ok(page.includes('id="'+id+'"'),id);
  assert.match(page,/\.special-grid\{display:grid/);
  assert.match(page,/S\.P\.E\.C\.I\.A\.L\./);
  assert.match(page,/main\.js\?v=W20\.42/);
  assert.match(source,/from '\.\.\/special\.mjs'/);
  assert.match(source,/safeSpecialSnapshot\(saved\)/);
  assert.match(source,/gainSpecialXP\(specialState,amount,source\)/);
  assert.match(source,/allocateSpecialPoint\(specialState,a\.id\)/);
  assert.match(source,/purchaseSpecialPerk\(specialState,p\.id\)/);
  assert.match(source,/awardSpecialExperience\(\(\{scout:45,raider:70,enforcer:105\}\)/);
  assert.match(source,/specialModifiers\.gunDamageMultiplier/);
  assert.match(source,/specialModifiers\.aimSpreadMultiplier/);
  assert.match(source,/specialModifiers\.damageTakenMultiplier/);
  assert.match(source,/specialModifiers\.staminaDrainMultiplier/);
  assert.match(source,/specialModifiers\.speedMultiplier/);
  assert.match(source,/specialModifiers\.reloadSpeedMultiplier/);
  assert.match(source,/discountedMaterials\(recipe,specialModifiers\.craftDiscount\)/);
  assert.match(source,/if\(e\.code==='KeyL'&&!e\.repeat\)/);
  assert.match(source,/localStorage\.setItem\('rpg-lab-special-v1'/);
});

test('W15.0 original characters use blended locomotion and visible weapon animation',()=>{
  assert.match(page,/main\.js\?v=W20\.42/);
  assert.match(page,/W20\.10.*REAR ENTRY & SUIT SILHOUETTE/);
  assert.match(characterAnimation,/export function createCharacterAnimation\(/);
  assert.match(characterAnimation,/export function stepCharacterAnimation\(/);
  assert.match(characterAnimation,/state\.land=/);
  assert.match(characterAnimation,/state\.recoil=/);
  assert.match(playerAvatar,/from '\.\/character-animation\.mjs'/);
  assert.match(playerAvatar,/const heldWeapon=plainSurvivor&&heldWeaponEnabled/);
  assert.match(playerAvatar,/function setHeldWeapon\(/);
  assert.match(playerAvatar,/heldWeapon\.rotation\.x=/);
  assert.match(playerAvatar,/pose\.stride/);
  assert.match(playerAvatar,/pose\.jump/);
  assert.match(npcAvatar,/reloadStage/);
  assert.match(npcAvatar,/magazine\.rotation\.z=/);
  assert.match(source,/playerAvatar\.setHeldWeapon\(WEAPON_REBUILD_MODE\?null:activeWeaponId\)/);
  assert.match(source,/airborne:Math\.abs\(player\.jump\)/);
  assert.match(source,/reloading:weaponState\.reloadRemaining>0/);
  assert.match(source,/enemy\.rigged\?\.update\(dt,\{alive:false/);
  assert.match(source,/poweredCockpit\.rotation\.z=poweredGait/);
});

test('W16.0 entry faces forward, stays grounded and uses a rear-only lane',()=>{
  assert.match(powerEntryAnimation,/export function powerEntryPose\(/);
  assert.match(powerEntryAnimation,/POWER_BOARDING/);
  assert.match(armorVisual,/pilot\.rotation\.y=pose\.yaw/);
  assert.match(armorVisual,/pilot\.position\.set\(pose\.x,pose\.y,pose\.z\)/);
  assert.match(armorVisual,/pilot\.userData\.entryPose=pose/);
  assert.match(source,/function nearRearHatch\(\)/);
  assert.match(source,/local\.z<=-1\.30&&local\.z>=-3\.55/);
  assert.match(source,/origin,to:endPosition,toRotation:endingRotation/);
  assert.match(source,/poweredSuit\.animate\(powerStep\.phase,powerStep\.progress,poweredArmorTime,/);
  assert.match(source,/pilotFloorHeight:poweredSuit\.pilot\.position\.y/);
  assert.match(source,/pilotFacing:poweredSuit\.pilot\.rotation\.y/);
});
test('W16.0 reload has real six-gun actions and synced NPC hands',()=>{
  assert.match(source,/reloadPoseForWeapon\(activeWeaponId,/);
  assert.match(source,/visual\.cylinderSpinGroup\.rotation\.z=/);
  assert.match(source,/visual\.boltHandle\.position\.z=/);
  assert.match(source,/visual\.pumpGrip\.position\.z=/);
  assert.match(source,/action\.visible=handling\.roundVisible/);
  assert.match(source,/reloadStyle:activeWeaponId/);
  assert.match(npcAvatar,/reloadPoseForWeapon\(motionWeapon/);
  assert.match(npcAvatar,/npcBolt\.position\.z=/);
  assert.match(npcAvatar,/drum\.position\.y=/);
  assert.match(playerAvatar,/reloadPoseForWeapon\(heldWeaponId/);
});

test('W17.0 frame is a hierarchical skeleton with driven cylinders',()=>{
  for(const phrase of [
    'const elbow=makeGroup(shoulder,',
    'const wrist=makeGroup(elbow,',
    'const knee=makeGroup(hip,',
    'const ankle=makeGroup(knee,',
    'const toeHinge=makeGroup(foot,',
    'const fingerJoints=[]',
    'function telescopingActuator(',
    'for(const actuator of rig.actuators)actuator.update()'])
    assert.ok(armorVisual.includes(phrase),phrase);
  assert.match(armorVisual,/frameFeatures\.elbows=2/);
  assert.match(armorVisual,/frameFeatures\.knees=2/);
  assert.match(armorVisual,/frameFeatures\.hydraulics\+\+/);
  assert.match(playerAvatar,/if\(boardingPose\)\{/);
  assert.match(playerAvatar,/pilotHandholdTarget|elbowPoint/);
  assert.match(powerEntryAnimation,/const footPhase=stride\*Math\.PI\*2\/\.84/);
  assert.match(source,/boardingPose:powerStep\.phase!=='idle'/);
});

test('W18.0 includes persistent quests, reputation, and in-world contacts',()=>{
  const page=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  assert.ok(page.includes('main.js?v=W20.42'));
  for(const marker of ['id="campaignPanel"','id="campaignDialogue"','id="campaignReputation"','id="questTracker"'])assert.ok(page.includes(marker),marker);
  for(const marker of ['initialCampaignState()','campaignJournal(campaignState)','recordCampaignObjective(\'raider-defeated\')','nearCampaignNode()',"e.code==='KeyQ'"])assert.ok(source.includes(marker),marker);
  const contactFirst=source.indexOf("const contact=nearCampaignNode();",source.indexOf("if(e.code==='KeyE'"));
  const suitHold=source.indexOf("beginPowerHold();return;",source.indexOf("if(e.code==='KeyE'"));
  assert.ok(contactFirst>0&&suitHold>contactFirst,'Quest contacts work inside power armor');
});

test('W19.0 loads scrap-built scenery, proper firearm reloads and suppression',()=>{
  const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const scene=readFileSync(new URL('./wasteland-setdress.mjs',import.meta.url),'utf8');
  const tactics=readFileSync(new URL('./enemy-tactics.mjs',import.meta.url),'utf8');
  assert.ok(source.includes('buildWastelandSet(scene,THREE'));
  assert.ok(source.includes('wastelandArt.update(dt)'));
  assert.ok(source.includes('projectileNearMiss(camera.position,shotVector'));
  assert.ok(tactics.includes('gun.magazine-tactics.magazine'));
  for(const prop of ['SettlerScrapShack','OxidizedRoadWreck',
    'PatchworkRadioMast','ImprovisedWaterTower'])
    assert.ok(scene.includes(prop),prop);
});

test('W19.3 has jointed gait, physical first-person hands, impacts and sound awareness',()=>{
  const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const avatar=readFileSync(new URL('./player-avatar.mjs',import.meta.url),'utf8');
  const animation=readFileSync(new URL('./character-animation.mjs',import.meta.url),'utf8');
  const npc=readFileSync(new URL('./npc-avatar.mjs',import.meta.url),'utf8');
  const ai=readFileSync(new URL('./enemy-ai.mjs',import.meta.url),'utf8');
  assert.ok(source.includes('createImpactEffects(scene,THREE)'));
  assert.ok(source.includes('const supportHand=new THREE.Group()'));
  assert.ok(source.includes('sound.footstep(powerArmorState.occupied)'));
  assert.ok(source.includes('hearEnemyGunshot(enemy.brain'));
  assert.ok(avatar.includes('leg.foot.position.y=-.25+'));
  assert.ok(animation.includes('state.footLift='));
  assert.ok(npc.includes('turnRate:step>0?yawDelta/step:0'));
  assert.ok(ai.includes("enemy.mode='investigate-noise'"));
});

test('W19.3 turns new story choices into physical world outcomes and grounded NPCs',()=>{
  const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const campaign=readFileSync(new URL('./campaign.mjs',import.meta.url),'utf8');
  assert.ok(source.includes('QuestResident_'));
  assert.ok(source.includes('havenPowerLamp.intensity=powered'));
  assert.ok(source.includes('havenStreetLamp.intensity=powered'));
  assert.ok(source.includes('campaignConversationText(node)'));
  assert.ok(source.includes("recordCampaignObjective('haven-defense')"));
  assert.ok(source.includes('questNavigationClock'));
  assert.ok(campaign.includes("id:'haven-first-light'"));
  assert.ok(campaign.includes("id:'last-broadcast'"));
});

test('W19.3 ammo loading matches physical round motion and interrupts on weapon switch',()=>{
  const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const weapons=readFileSync(new URL('./weapons.mjs',import.meta.url),'utf8');
  const hands=readFileSync(new URL('./weapon-handling.mjs',import.meta.url),'utf8');
  assert.ok(source.includes('cancelWeaponReload(weaponState)'));
  assert.ok(source.includes('weaponState.reloadRounds||null'));
  assert.ok(weapons.includes('const individualReload='));
  assert.ok(weapons.includes('const inserted='));
  assert.ok(hands.includes('roundCount=null'));
});

test('W20.15 removes the two legacy teal camera-locked cockpit bars',()=>{
  const position=armorVisual.indexOf('export function buildPowerArmorCockpit(camera){');
  assert.ok(position>0,'power-armor cockpit factory exists');
  const cockpit=armorVisual.slice(position);
  assert.doesNotMatch(cockpit,/BoxGeometry|MeshBasicMaterial|group\.add\(/);
  assert.match(source,/power-armor-visual\.mjs\?v=W20\.16/);
  assert.match(page,/main\.js\?v=W20\.42/);
  class FakeGroup{
    constructor(){this.children=[];this.visible=true;}
    add(child){this.children.push(child);}
  }
  const camera={children:[],add(child){this.children.push(child);}};
  const factory=new Function('THREE',cockpit.replace('export ','')+
    '\nreturn buildPowerArmorCockpit;')({Group:FakeGroup});
  const group=factory(camera);
  assert.equal(camera.children.length,1);
  assert.equal(camera.children[0],group);
  assert.equal(group.children.length,0,'no strips or LEDs attached to camera');
  assert.equal(group.visible,false);
});


test('W20.17 hostile radar reveals only alerted enemies, never undiscovered patrols',()=>{
  assert.match(page,/id="enemyRadarTrack"/);
  assert.match(source,/function updateEnemyRadar\(\)/);
  assert.match(source,/for\(const enemy of enemies\.values\(\)\)/);
  assert.match(source,/const alerted=enemy\.state\.alive&&enemy\.radarAlertSeconds>0/);
  assert.match(source,/dot\.style\.display=alerted/);
  assert.match(source,/if\(enemyAIEnabled&&enemy\.brain\.spotted\)enemy\.radarAlertSeconds=3/);
  assert.match(source,/enemy\.radarAlertSeconds=0/);
  const overhead=source.slice(source.indexOf('function refreshEnemyLabel'),
    source.indexOf('let arenaRound=-1'));
  assert.doesNotMatch(overhead,/ctx\.fillText\(mode/);
  assert.doesNotMatch(overhead,/ctx\.fillText\(.*loading/);
  assert.match(source,/upperBody\.traverse\(object=>object\.layers\.set\(ENEMY_COLLISION_LAYER\)\)/);
  assert.match(source,/firingRaycaster\.layers\.enable\(ENEMY_COLLISION_LAYER\)/);
  assert.match(source,/mesh\.layers\.set\(ENEMY_COLLISION_LAYER\)/);
});


test('W20.17 tap E searches nearby enemy drops and crates while suited; hold E exits',()=>{
  const hold=source.slice(source.indexOf('function finishPowerHold()'),
    source.indexOf('let powerCinematic=null'));
  assert.match(hold,/const bag=nearestLootBag\(\)/);
  assert.match(hold,/if\(bag\)\{beginLootOverlay\(bag\.id\);return true;\}/);
  assert.match(hold,/if\(powerArmorState\.occupied\)showShotNotice/);
  const controls=source.slice(source.indexOf("if(e.code==='KeyE'&&!e.repeat"),
    source.indexOf("if(e.code==='BracketLeft'"));
  assert.match(controls,/beginPowerHold\(\);return/);
  assert.match(source,/TAP E · SEARCH/);
});


test('W20.42 keeps ten rebuilt guns active during sniper rollout',()=>{
  const tenModel=readFileSync(new URL('./tenmm-pistol.mjs',import.meta.url),'utf8');
  const pipeModel=readFileSync(new URL('./pipe-pistol.mjs',import.meta.url),'utf8');
  const weaponRules=readFileSync(new URL('./weapons.mjs',import.meta.url),'utf8');
  const handling=readFileSync(new URL('./weapon-handling.mjs',import.meta.url),'utf8');
  assert.match(page,/W20\.42 · RAIDER PIPE RIFLE TRIAL/);
  assert.match(page,/EQUIP REBUILT WEAPON · 10 AVAILABLE/);
  assert.match(source,/const WEAPON_REBUILD_MODE=true/);
  assert.match(source,/const REBUILT_WEAPON_IDS=Object\.freeze\(\[TEN_MM_PISTOL\.id,PIPE_PISTOL\.id,PIPE_RIFLE\.id,LASER_MUSKET\.id,DOUBLE_BARREL_SHOTGUN\.id,PUMP_ACTION_SHOTGUN\.id,BOLT_HUNTING_RIFLE\.id,IRON_REVOLVER\.id,PIPE_SMG\.id,HEAVY_SNIPER\.id\]\)/);
  assert.match(source,/if\(REBUILT_WEAPON_IDS\.includes\(id\)\)continue/);
  assert.match(source,/visual\.root\.removeFromParent\(\)/);
  assert.match(source,/enemy\.rigged\.disarm\(\)/);
  assert.match(npcAvatar,/function disarm\(\)/);
  assert.match(source,/createTenMillimeterPistol\(THREE,camera/);
  assert.match(source,/createPipePistol\(THREE,camera/);
  assert.match(source,/createTenMillimeterPistol\(THREE,playerAvatar\.weaponSocket/);
  assert.match(source,/createPipePistol\(THREE,playerAvatar\.weaponSocket/);
  assert.match(pipeModel,/name='PipePistolChargingBolt'/);
  assert.match(pipeModel,/magBaseX:-\.211/);
  assert.match(pipeModel,/ejectionLocal:new THREE\.Vector3/);
  assert.match(pipeModel,/name='JoinedReceiverShell'/);
  assert.match(pipeModel,/name='JoinedBarrelShroud'/);
  assert.match(pipeModel,/name='FrontSightPedestal'/);
  assert.match(pipeModel,/name='MagazineSocket'/);
  assert.match(tenModel,/name='TenMMSlide'/);
  assert.match(weaponRules,/export const TEN_MM_PISTOL/);
  assert.match(weaponRules,/export const PIPE_PISTOL/);
  assert.match(handling,/if\(id==='pipe-pistol'\)/);
  assert.match(source,/activeWeaponId===PIPE_PISTOL\.id/);
  assert.match(source,/visual\.magazine\.position\.x=visual\.magBaseX-handling\.magazineOffset/);
  assert.match(source,/if\(ticking&&playerHealth\.alive&&liveNpcGun\)/);
  assert.match(source,/if\(WEAPON_REBUILD_MODE&&!playerGunEnabled\(\)\)return;[\s\S]*?const result=laserActive/);
  assert.match(source,/function refreshInventoryUI\(\)/);
  assert.match(source,/function updateEnemyRadar\(\)/);
});

test('The live weapon view aims each rebuilt front tip through the camera ray',()=>{
  assert.match(source,/import \{ sightMount, adsWeaponPosition, sightForOptic/);
  assert.match(source,/function alignActiveSight\(\)\{[\s\S]*?adsWeaponPosition\(activeWeaponId\)/);
  assert.match(source,/camera\.updateWorldMatrix\(true,false\)/);
  assert.match(source,/firingRaycaster\.set\(camera\.position,shotVector\)/);
  assert.match(source,/weapon-sights\.mjs\?v=W20\.42/);
  assert.match(source,/tenmm-pistol\.mjs\?v=W20\.23/);
  assert.match(source,/pipe-pistol\.mjs\?v=W20\.23/);
});

test('W20.23 NPC head and armor hitboxes follow animated joints',()=>{
  assert.match(playerAvatar,/hitJoints:\{torso,neck,head,arms,legs\}/);
  assert.match(npcAvatar,/hitJoints:avatar\.hitJoints/);
  const mount=source.slice(source.indexOf('const joints=enemy.rigged.hitJoints'),
    source.indexOf('if(WEAPON_REBUILD_MODE)enemy.rigged.disarm()'));
  assert.match(mount,/remountHitbox\(hitParts\.head,joints\.head,0,\.035,0\)/);
  assert.match(mount,/remountHitbox\(hitParts\.chest,joints\.torso,0,\.33,0\)/);
  assert.match(mount,/remountHitbox\(enemy\.armorMeshes\.get\('head'\),joints\.head/);
  assert.match(mount,/arm\.shoulder/);
  assert.match(mount,/leg\.hip/);
  assert.match(source,/enemy\.rigged\?\.root\.updateWorldMatrix\(true,true\)/);
  for(const roleScale of [.97,1.02,1.07]){
    const scale=.80*roleScale;
    const visibleHeadCenter=(.99+.14+.66+.18+.035)*scale;
    const chestTop=(.99+.14+.33+.74/2)*scale;
    assert.ok(visibleHeadCenter-chestTop>.10);
    assert.ok(visibleHeadCenter<1.75);
  }
});

test('W20.23 infinite ammo toggles without spending normal ammo',()=>{
  assert.match(page,/id="infiniteAmmoToggle"/);
  assert.match(page,/id="infiniteAmmoStatus"/);
  assert.match(source,/if\(e\.code==='KeyM'/);
  assert.match(source,/if\(infiniteAmmo&&result\.status==='fired'\)/);
  const start=source.indexOf('function toggleInfiniteAmmo()');
  const end=source.indexOf("$('infiniteAmmoToggle').addEventListener",start);
  assert.ok(start>0&&end>start);
  const toggleSource=source.slice(start,end);
  const script=[
    "const REBUILT_WEAPON_IDS=['10mm-pistol','pipe-pistol','pipe-rifle','laser-musket','double-barrel-shotgun','pump-action-shotgun'];",
    "const arsenalStates={'10mm-pistol':{magazine:2,reserve:14,reloadRemaining:1},'pipe-pistol':{magazine:0,reserve:8,reloadRemaining:0},'pipe-rifle':{magazine:4,reserve:90,reloadRemaining:0},'laser-musket':{magazine:3,reserve:84,reloadRemaining:0,laserCharge:2},'double-barrel-shotgun':{magazine:1,reserve:48,reloadRemaining:0},'pump-action-shotgun':{magazine:4,reserve:72,reloadRemaining:0}};",
    "const preInfiniteAmmo=new Map();",
    "const LASER_MUSKET={id:'laser-musket'};",
    "const cancelLaserCrank=()=>false;",
    "const ensureLaserState=state=>state;",
    "let infiniteAmmo=false,emptyClickLatched=true,shotgunPendingEjections=0,pumpPendingEjection=false;",
    "let notice='',refreshes=0;",
    "const getWeaponSpec=id=>({magazineSize:id==='10mm-pistol'?12:id==='pipe-rifle'?15:id==='laser-musket'?6:id==='double-barrel-shotgun'?2:id==='pump-action-shotgun'?6:8});",
    "const cancelWeaponReload=state=>{state.reloadRemaining=0;};",
    "const refreshWeaponHUD=()=>refreshes++;",
    "const showShotNotice=s=>notice=s;",
    toggleSource,
    "toggleInfiniteAmmo();",
    "assert.equal(infiniteAmmo,true);",
    "assert.equal(arsenalStates['10mm-pistol'].magazine,12);",
    "assert.equal(arsenalStates['pipe-pistol'].magazine,8);",
    "assert.equal(arsenalStates['pipe-rifle'].magazine,15);",
    "assert.equal(arsenalStates['laser-musket'].magazine,6);",
    "assert.equal(arsenalStates['double-barrel-shotgun'].magazine,2);",
    "assert.equal(arsenalStates['pump-action-shotgun'].magazine,6);",
    "assert.equal(arsenalStates['10mm-pistol'].reserve,14);",
    "assert.equal(emptyClickLatched,false);",
    "toggleInfiniteAmmo();",
    "assert.equal(infiniteAmmo,false);",
    "assert.equal(arsenalStates['10mm-pistol'].magazine,2);",
    "assert.equal(arsenalStates['10mm-pistol'].reserve,14);",
    "assert.equal(arsenalStates['pipe-pistol'].magazine,0);",
    "assert.equal(arsenalStates['pipe-pistol'].reserve,8);",
    "assert.equal(arsenalStates['pipe-rifle'].magazine,4);",
    "assert.equal(arsenalStates['pipe-rifle'].reserve,90);",
    "assert.equal(arsenalStates['laser-musket'].magazine,3);",
    "assert.equal(arsenalStates['laser-musket'].laserCharge,2);",
    "assert.equal(arsenalStates['double-barrel-shotgun'].magazine,1);",
    "assert.equal(arsenalStates['pump-action-shotgun'].magazine,4);",
    "assert.equal(preInfiniteAmmo.size,0);",
    "assert.equal(refreshes,2);",
    "return notice;"
  ].join('\n');
  const testRun=new Function('assert',script);
  assert.match(testRun(assert),/NORMAL AMMO RESTORED/);
});

test('W20.24 pipe rifle is selectable and really rendered in first/third person',()=>{
  const model=readFileSync(new URL('./pipe-rifle.mjs',import.meta.url),'utf8');
  const weapons=readFileSync(new URL('./weapons.mjs',import.meta.url),'utf8');
  const handling=readFileSync(new URL('./weapon-handling.mjs',import.meta.url),'utf8');
  assert.match(weapons,/export const PIPE_RIFLE=Object\.freeze/);
  assert.match(weapons,/id:'pipe-rifle',name:'Pipe Rifle',kind:'carbine'/);
  assert.match(source,/PIPE_PISTOL, PIPE_RIFLE, LASER_MUSKET, DOUBLE_BARREL_SHOTGUN, PUMP_ACTION_SHOTGUN, BOLT_HUNTING_RIFLE, IRON_REVOLVER, PIPE_SMG, HEAVY_SNIPER, ARSENAL/);
  assert.match(source,/createPipeRifle\(THREE,camera,\{flareTexture:flareTex\}\)/);
  assert.match(source,/weaponVisuals\.set\(PIPE_RIFLE\.id,pipeRifleVisual\)/);
  assert.match(source,/createPipeRifle\(THREE,playerAvatar\.weaponSocket,\{thirdPerson:true\}\)/);
  assert.match(source,/heldPipeRifle\.root\.visible=activeWeaponId===PIPE_RIFLE\.id/);
  assert.match(source,/activeWeaponId===PIPE_RIFLE\.id\?'pipe-rifle'/);
  assert.match(source,/activeWeaponId===PIPE_RIFLE\.id\?\.23/);
  assert.match(handling,/if\(id==='pipe-rifle'\)/);
  assert.match(source,/pipe-rifle\.mjs\?v=W20\.25/);
  assert.match(source,/visual\.defaultZ\?\?-\.77/);
  assert.match(model,/name='PipeRifleStockBody'/);
  assert.match(model,/name='PipeRifleHandguardShell'/);
  assert.match(model,/name='PipeRifleReceiverShell'/);
  assert.match(model,/name='PipeRifleFrontSightTip'/);
  assert.match(page,/10 AVAILABLE/);
  assert.match(page,/PIPE RIFLE/);
});

test('W20.26 hand-cranked Laser Musket is playable in both views with lasting beams',()=>{
  const gun=readFileSync(new URL('./laser-musket.mjs',import.meta.url),'utf8');
  const math=readFileSync(new URL('./laser-musket-mechanics.mjs',import.meta.url),'utf8');
  const trails=readFileSync(new URL('./laser-musket-trails.mjs',import.meta.url),'utf8');
  const specs=readFileSync(new URL('./weapons.mjs',import.meta.url),'utf8');
  const sights=readFileSync(new URL('./weapon-sights.mjs',import.meta.url),'utf8');
  assert.match(specs,/export const LASER_MUSKET=Object.freeze/);
  assert.match(source,/weaponVisuals.set\(LASER_MUSKET.id,laserMusketVisual\)/);
  assert.match(source,/createLaserMusket\(THREE,playerAvatar.weaponSocket,\{thirdPerson:true\}\)/);
  assert.match(source,/heldLaserMusket.root.visible=activeWeaponId===LASER_MUSKET.id/);
  assert.match(source,/startLaserCrank\(weaponState,\{infiniteAmmo\}\)/);
  assert.match(source,/fireChargedLaser\(weaponState,activeSpec/);
  assert.match(source,/sound.laserCrank\(action.level\)/);
  assert.match(source,/sound.laserBlast\(result.chargeLevel\)/);
  assert.match(source,/laserTrails.spawn\(origin,destination,result.chargeLevel\)/);
  assert.match(source,/laserTrails.update\(dt\)/);
  assert.match(source,/else if\(!laserActive&&activeWeaponId!==DOUBLE_BARREL_SHOTGUN.id&&activeWeaponId!==IRON_REVOLVER.id\)ejectCasing\(\)/);
  assert.match(source,/const boostedDamage=damageThisPellet\*/);
  assert.match(gun,/name='LaserMusketRotatingCrank'/);
  assert.match(gun,/name='LaserMusketChargeCrystal'/);
  assert.match(math,/crankSeconds:\.68,beamSeconds:\.66,beamHoldSeconds:\.13/);
  assert.match(trails,/function laserTrailOpacity/);
  assert.match(sights,/'laser-musket':Object.freeze\(\{x:0,y:\.263/);
  assert.match(page,/EQUIP REBUILT WEAPON · 10 AVAILABLE/);
  assert.match(page,/Pump-Action Shotgun/);
  assert.match(page,/main\.js\?v=W20\.42/);
});

test('W20.28 double barrel operates as a real twin-bore break action in both views',()=>{
  const gun=readFileSync(new URL('./double-barrel-shotgun.mjs',import.meta.url),'utf8');
  const rules=readFileSync(new URL('./weapons.mjs',import.meta.url),'utf8');
  const ballistics=readFileSync(new URL('./double-barrel-ballistics.mjs',import.meta.url),'utf8');
  const handling=readFileSync(new URL('./weapon-handling.mjs',import.meta.url),'utf8');
  const sound=readFileSync(new URL('./weapon-audio.mjs',import.meta.url),'utf8');
  const sights=readFileSync(new URL('./weapon-sights.mjs',import.meta.url),'utf8');
  assert.match(page,/EQUIP REBUILT WEAPON · 10 AVAILABLE/);
  assert.match(page,/RAIDER PIPE RIFLE TRIAL/);
  assert.match(source,/DOUBLE_BARREL_SHOTGUN\.id,doubleBarrelVisual/);
  assert.match(source,/createDoubleBarrelShotgun\(THREE,camera,\{flareTexture:flareTex\}\)/);
  assert.match(source,/createDoubleBarrelShotgun\(THREE,playerAvatar\.weaponSocket,\{thirdPerson:true\}\)/);
  assert.match(source,/heldDoubleBarrel\.hingeGroup\.rotation\.x/);
  assert.match(source,/const chamberY=-\.065\+\.138\*Math\.cos\(a\)/);
  assert.match(source,/const chamberZ=-\.427-\.138\*Math\.sin\(a\)/);
  assert.match(source,/i>=2-weaponState\.magazine/);

  assert.match(source,/visual\.hingeGroup\.rotation\.x=-handling\.breakAngle/);
  assert.match(source,/ejectDoubleBarrelHulls\(shotgunPendingEjections\)/);
  assert.match(source,/doubleBarrelPelletDamage\(result\.damage,first\?\.distance/);
  assert.match(source,/sound\.gunshot\(activeWeaponId===PIPE_SMG\.id\?'pipe-smg':\s*activeWeaponId===HEAVY_SNIPER\.id\?'heavy-sniper':\s*activeWeaponId===BOLT_HUNTING_RIFLE\.id\?'hunting-bolt':/);
  assert.match(source,/sound\.breakActionReload\(missing/);
  assert.match(source,/else if\(!laserActive&&activeWeaponId!==DOUBLE_BARREL_SHOTGUN\.id&&activeWeaponId!==IRON_REVOLVER\.id\)ejectCasing\(\)/);
  assert.match(rules,/id:'double-barrel-shotgun',name:'Double-Barrel Shotgun'/);
  assert.match(rules,/pellets:8,automatic:false/);
  assert.match(rules,/missing===1\?1\.95:2\.65/);
  assert.match(gun,/DoubleBarrelHingedBarrels/);
  assert.match(gun,/DoubleBarrelJoinedTopRib/);
  assert.match(gun,/DoubleBarrelFullWoodStock/);
  assert.match(gun,/DoubleBarrelFrontSightTip/);
  assert.match(handling,/pose\.breakAngle=1\.02\*open/);
  assert.match(ballistics,/doubleBarrelDamageFactor/);
  assert.match(sound,/breakActionReload\(rounds=2,duration=2\.65\)/);
  assert.match(sights,/'double-barrel-shotgun':Object\.freeze\(\{x:0,y:\.270/);
  assert.match(source,/double-barrel-ballistics\.mjs\?v=W20\.28/);
  assert.match(page,/main\.js\?v=W20\.42/);
});

test('W20.29 pump-action gun is a six-shell tube-fed weapon with synchronized cycling',()=>{
  const model=readFileSync(new URL('./pump-action-shotgun.mjs',import.meta.url),'utf8');
  const math=readFileSync(new URL('./pump-action-mechanics.mjs',import.meta.url),'utf8');
  const specs=readFileSync(new URL('./weapons.mjs',import.meta.url),'utf8');
  const sights=readFileSync(new URL('./weapon-sights.mjs',import.meta.url),'utf8');
  const handling=readFileSync(new URL('./weapon-handling.mjs',import.meta.url),'utf8');
  const audio=readFileSync(new URL('./weapon-audio.mjs',import.meta.url),'utf8');
  assert.match(page,/W20\.42 · RAIDER PIPE RIFLE TRIAL/);
  assert.match(page,/EQUIP REBUILT WEAPON · 10 AVAILABLE/);
  assert.match(source,/createPumpActionShotgun\(THREE,camera,\{flareTexture:flareTex\}\)/);
  assert.match(source,/weaponVisuals\.set\(PUMP_ACTION_SHOTGUN.id,pumpActionVisual\)/);
  assert.match(source,/createPumpActionShotgun\(THREE,playerAvatar\.weaponSocket,\{thirdPerson:true\}\)/);
  assert.match(source,/heldPumpShotgun\.root\.visible=activeWeaponId===PUMP_ACTION_SHOTGUN.id/);
  assert.match(source,/pumpCyclePose\(slideCycle\)/);
  assert.match(source,/visual\.pumpGroup\.position\.z=pump\.forendOffset/);
  assert.match(source,/visual\.boltGroup\.position\.z=pump\.boltOffset/);
  assert.match(source,/pumpPendingEjection&&\(pump\.ejectNow\|\|slideCycle===0\)/);
  assert.match(source,/ejectPumpActionHull\(\)/);
  assert.match(source,/pumpPelletDamage\(result\.damage,first\?\.distance/);
  assert.match(source,/sound\.pumpActionCycle\(PUMP_ACTION_TUNING\.cycleSeconds\)/);
  assert.match(source,/sound\.pumpActionReload\(missing/);
  assert.match(source,/TUBE LOADING/);
  assert.match(source,/if\(slideCycle>\.001\)/);
  assert.match(specs,/id:'pump-action-shotgun',name:'Pump-Action Shotgun',kind:'shotgun'/);
  assert.match(specs,/magazineSize:6,startingReserve:72,fireInterval:\.94/);
  assert.match(specs,/spec\.id==='pump-action-shotgun'\?\(\.94\+\.55\*missing\)/);
  assert.match(specs,/spec\.id==='pump-action-shotgun'\?\[\.23,\.85\]/);
  assert.match(model,/name='PumpSlidingForend'/);
  assert.match(model,/name='PumpFixedMagazineTube'/);
  assert.match(model,/name='PumpReceiverActionBar'/);
  assert.match(model,/name='PumpBottomLoadingGate'/);
  assert.match(model,/name='PumpFrontSightTip'/);
  assert.match(handling,/if\(id==='pump-action-shotgun'\)/);
  assert.match(audio,/pumpActionCycle\(duration=\.60\)/);
  assert.match(audio,/pumpActionReload\(rounds=1,duration=1\.49\)/);
  assert.match(sights,/'pump-action-shotgun':Object\.freeze\(\{x:0,y:\.270/);
  assert.match(math,/export function pumpCyclePose\(/);
  assert.match(math,/export function pumpPelletDamage\(/);
  assert.match(source,/pump-action-shotgun\.mjs\?v=W20\.29/);
  assert.match(page,/main\.js\?v=W20\.42/);
});

test('W20.30 hunting rifle uses a five-round animated bolt and individual top-loaded brass',()=>{
  const gun=readFileSync(new URL('./hunting-rifle.mjs',import.meta.url),'utf8');
  const math=readFileSync(new URL('./hunting-rifle-mechanics.mjs',import.meta.url),'utf8');
  const rules=readFileSync(new URL('./weapons.mjs',import.meta.url),'utf8');
  const sight=readFileSync(new URL('./weapon-sights.mjs',import.meta.url),'utf8');
  const hands=readFileSync(new URL('./weapon-handling.mjs',import.meta.url),'utf8');
  const audio=readFileSync(new URL('./weapon-audio.mjs',import.meta.url),'utf8');
  for(const piece of ['HuntingFullWoodStock','HuntingFullLengthBarrel',
      'HuntingRotatingSlidingBolt','HuntingBoltHandleStem',
      'HuntingBoltHandleKnob' ,'HuntingReceiverOpenFeedPort'])assert.ok(gun.includes(piece),piece);
  assert.match(source,/createHuntingRifle\(THREE,camera,\{flareTexture:flareTex\}\)/);
  assert.match(source,/weaponVisuals\.set\(BOLT_HUNTING_RIFLE\.id,huntingRifleVisual\)/);
  assert.match(source,/createHuntingRifle\(THREE,playerAvatar\.weaponSocket,\{thirdPerson:true\}\)/);
  assert.match(source,/heldHuntingRifle\.root\.visible=activeWeaponId===BOLT_HUNTING_RIFLE\.id/);
  assert.match(source,/visual\.boltAssembly\.rotation\.z=lift/);
  assert.match(source,/visual\.boltAssembly\.position\.z=\(visual\.boltBaseZ\?\?-\.135\)\+offset/);
  assert.match(source,/huntingPendingEjection&&\(cycle\.ejectNow\|\|slideCycle===0\)/);
  assert.match(source,/ejectHuntingRifleCasing\(\)/);
  assert.match(source,/sound\.boltActionCycle\(HUNTING_RIFLE_TUNING\.cycleSeconds\)/);
  assert.match(source,/sound\.boltActionReload\(missing/);
  assert.match(source,/BOLT OPEN · INSERTING/);
  assert.match(source,/huntingBoltCyclePose\(slideCycle\)/);
  assert.match(source,/hunting-rifle\.mjs\?v=W20\.31/);
  assert.match(source,/hunting-rifle-mechanics\.mjs\?v=W20\.30/);
  assert.match(math,/capacity:5,cycleSeconds:\.88/);
  assert.match(rules,/id:'bolt-hunting-rifle',name:'Hunting Rifle'/);
  assert.match(rules,/magazineSize:5,startingReserve:50,fireInterval:1\.25/);
  assert.match(rules,/spec\.id==='bolt-hunting-rifle'\?\(1\.03\+\.48\*missing\)/);
  assert.match(sight,/'bolt-hunting-rifle':Object\.freeze\(\{x:0,y:\.290/);
  assert.match(hands,/id==='bolt-hunting-rifle'/);
  assert.match(audio,/boltActionCycle\(duration=\.88\)/);
  assert.match(audio,/boltActionReload\(rounds=1,duration=1\.51\)/);
  assert.match(page,/W20\.42 · RAIDER PIPE RIFLE TRIAL/);
  assert.match(page,/EQUIP REBUILT WEAPON · 10 AVAILABLE/);
});

test('W20.31 green glowing thin hunting rifle sight is narrower without changing ADS origin',()=>{
  const gun=readFileSync(new URL('./hunting-rifle.mjs',import.meta.url),'utf8');
  assert.match(gun,/box\(\.026,\.115,\.052,iron,0,\.229,-1\.592\)/);
  assert.match(gun,/box\(\.010,\.012,\.016,greenFiber,0,\.284,-1\.592\)/);
  assert.match(gun,/emissive:0x25ff5c,emissiveIntensity:1\.65/);
  assert.match(gun,/HuntingFrontSightGlow/);
  assert.match(gun,/sightLocal:new THREE\.Vector3\(0,\.290,-\.239\)/);
  assert.match(source,/hunting-rifle\.mjs\?v=W20\.31/);
  assert.match(page,/main\.js\?v=W20\.42/);
});

test('W20.32 Six-Shooter is an eight-weapon real-cylinder rebuild',()=>{
  const gun=readFileSync(new URL('./worn-revolver.mjs',import.meta.url),'utf8');
  const spec=readFileSync(new URL('./weapons.mjs',import.meta.url),'utf8');
  const handling=readFileSync(new URL('./weapon-handling.mjs',import.meta.url),'utf8');
  const sight=readFileSync(new URL('./weapon-sights.mjs',import.meta.url),'utf8');
  const audio=readFileSync(new URL('./weapon-audio.mjs',import.meta.url),'utf8');
  for(const part of ['RevolverForgedFrame','RevolverContinuousBarrel',
      'RevolverSolidWalnutGrip','RevolverIndexedSixChamberCylinder',
      'RevolverMovingEjectorStar','RevolverPivotingHammer',
      'RevolverFrontSightTip'])assert.ok(gun.includes(part),part);
  assert.match(source,/createWornRevolver\(THREE,camera,\{flareTexture:flareTex\}\)/);
  assert.match(source,/weaponVisuals\.set\(IRON_REVOLVER.id,wornRevolverVisual\)/);
  assert.match(source,/createWornRevolver\(THREE,playerAvatar\.weaponSocket,\{thirdPerson:true\}\)/);
  assert.match(source,/heldWornRevolver\.root\.visible=activeWeaponId===IRON_REVOLVER\.id/);
  assert.match(source,/visual\.cylinderYoke\.rotation\.y=opening\*1\.12/);
  assert.match(source,/visual\.ejectorGroup\.position\.z=handling\.ejector/);
  assert.match(source,/revolverPendingEjections>0&&handling\.progress>\.32/);
  assert.match(source,/ejectRevolverCasings\(revolverPendingEjections\)/);
  assert.match(source,/activeWeaponId!==IRON_REVOLVER\.id\)ejectCasing\(\)/);
  assert.match(source,/sound\.revolverReload\(missing/);
  assert.match(source,/CYLINDER OPEN · LOADING/);
  assert.match(source,/worn-revolver\.mjs\?v=W20\.33/);
  assert.match(spec,/export const IRON_REVOLVER=Object\.freeze/);
  assert.match(spec,/magazineSize:6,startingReserve:48,fireInterval:\.46/);
  assert.match(spec,/spec\.id==='iron-revolver'\?\(0\.96\+\.42\*missing\)/);
  assert.match(handling,/id==='iron-revolver'/);
  assert.match(sight,/'iron-revolver':Object\.freeze\(\{x:0,y:\.275/);
  assert.match(audio,/revolverReload\(rounds=6,duration=3\.48\)/);
  assert.match(page,/W20\.42 · RAIDER PIPE RIFLE TRIAL/);
  assert.match(page,/EQUIP REBUILT WEAPON · 10 AVAILABLE/);
});

test('W20.33 resting revolver hands clasp the actual grip without floating',()=>{
  const model=readFileSync(new URL('./worn-revolver.mjs',import.meta.url),'utf8');
  assert.match(model,/RevolverStrongHandPalmOnGrip/);
  assert.match(model,/RevolverSupportHandPalmOnGrip/);
  assert.match(model,/RevolverStrongFingerWrappingGrip/);
  assert.match(model,/RevolverSupportFingerWrappingGrip/);
  assert.match(model,/RevolverAttachedStrongForearm/);
  assert.match(model,/RevolverAttachedSupportForearm/);
  assert.match(model,/box\(\.126,\.175,\.160,glove,\.106,-\.256,\.223,gripHand\)/);
  assert.match(model,/box\(\.125,\.167,\.151,glove,-\.105,-\.262,\.223,supportHand\)/);
  assert.match(source,/visual\.gripHand\.visible=!handling\.active/);
  assert.match(source,/visual\.supportHand\.visible=!handling\.handVisible/);
  assert.match(source,/worn-revolver\.mjs\?v=W20\.33/);
  assert.match(page,/main\.js\?v=W20\.42/);
});

test('W20.34 Pipe SMG is the ninth rebuilt gun and the first fully automatic',()=>{
  const gun=readFileSync(new URL('./pipe-smg.mjs',import.meta.url),'utf8');
  const spec=readFileSync(new URL('./weapons.mjs',import.meta.url),'utf8');
  const sight=readFileSync(new URL('./weapon-sights.mjs',import.meta.url),'utf8');
  const audio=readFileSync(new URL('./weapon-audio.mjs',import.meta.url),'utf8');
  const handling=readFileSync(new URL('./weapon-handling.mjs',import.meta.url),'utf8');
  for(const piece of ['SMGWeldedReceiverShell','SMGContinuousGunBarrel',
      'SMGConnectedWoodForearm','SMGStockSupportRail',
      'SMGThirtyRoundMagazineBody','SMGConnectedMagazineDock',
      'SMGReciprocatingBoltAssembly','SMGRightPalmOnPistolGrip',
      'SMGLeftPalmOnWoodForearm'])
    assert.ok(gun.includes(piece),piece);
  assert.match(source,/createPipeSMG\(THREE,camera,\{flareTexture:flareTex\}\)/);
  assert.match(source,/weaponVisuals\.set\(PIPE_SMG\.id,pipeSMGVisual\)/);
  assert.match(source,/createPipeSMG\(THREE,playerAvatar\.weaponSocket,\{thirdPerson:true\}\)/);
  assert.match(source,/heldPipeSMG\.root\.visible=activeWeaponId===PIPE_SMG\.id/);
  assert.match(source,/controls\.isLocked&&triggerHeld&&activeSpec\.automatic/);
  assert.match(source,/activeWeaponId===PIPE_SMG\.id\?'pipe-smg'/);
  assert.match(source,/activeWeaponId===PIPE_SMG\.id\?\.095/);
  assert.match(source,/visual\.magazine\.position\.set\(visual\.magBaseX-travel\*\.72/);
  assert.match(source,/sound\.pipeSMGReload\(weaponState\.reloadDuration/);
  assert.match(source,/SIDE MAGAZINE · RELEASE \/ INSERT \/ CHARGE/);
  assert.match(source,/pipe-smg\.mjs\?v=W20\.34/);
  assert.match(spec,/export const PIPE_SMG=Object\.freeze/);
  assert.match(spec,/magazineSize:30,startingReserve:150,fireInterval:\.095/);
  assert.match(spec,/pellets:1,automatic:true/);
  assert.match(sight,/'pipe-smg':Object\.freeze\(\{x:0,y:\.285,z:\.029/);
  assert.match(audio,/pipeSMGReload\(duration=2\.75\)/);
  assert.match(handling,/id==='pipe-smg'/);
  assert.match(page,/W20\.42 · RAIDER PIPE RIFLE TRIAL/);
  assert.match(page,/EQUIP REBUILT WEAPON · 10 AVAILABLE/);
});

test('W20.35 third-person avatars physically grip nine world-held guns, including NPC mounts',()=>{
  const grip=readFileSync(new URL('./weapon-grip-ik.mjs',import.meta.url),'utf8');
  const npc=readFileSync(new URL('./npc-avatar.mjs',import.meta.url),'utf8');
  const avatar=readFileSync(new URL('./player-avatar.mjs',import.meta.url),'utf8');
  for(const id of ['10mm-pistol','pipe-pistol','pipe-rifle','laser-musket',
    'double-barrel-shotgun','pump-action-shotgun','bolt-hunting-rifle',
    'iron-revolver','pipe-smg'])
    assert.ok(grip.includes("'"+id+"':Object.freeze"),id);
  assert.match(grip,/export function solveWeaponArmReach/);
  assert.match(avatar,/const weaponSocket=group\(torso,\.17,\.50,-\.20\)/);
  assert.match(avatar,/function setWeaponGripTargets\(right=null,left=null\)/);
  assert.match(avatar,/if\(!boardingPose&&alive&&weaponGripTargets\)/);
  assert.match(avatar,/marker\.getWorldPosition\(new THREE\.Vector3\(\)\)/);
  assert.match(avatar,/solveWeaponArmReach\(/);
  assert.match(avatar,/arm\.shoulder\.quaternion\.copy\(shoulderAim\)/);
  assert.match(avatar,/arm\.elbow\.quaternion\.copy\(elbowAim\)/);
  assert.match(avatar,/root\.userData\.weaponGripDistances=/);
  assert.match(source,/const heldWorldModels=new Map\(/);
  assert.match(source,/const heldWorldGrips=new Map\(\)/);
  assert.match(source,/model\.root\.add\(right,left\)/);
  assert.match(source,/const grips=heldWorldGrips\.get\(activeWeaponId\)/);
  assert.match(source,/playerAvatar\.setWeaponGripTargets\(grips\?\.right,grips\?\.left\)/);
  assert.match(source,/weapon-grip-ik\.mjs\?v=W20\.42/);
  assert.match(npc,/rightGrip\.name='NPCTriggerHandhold'/);
  assert.match(npc,/leftGrip\.name='NPCSupportHandhold'/);
  assert.match(npc,/avatar\.setWeaponGripTargets\(rightGrip,leftGrip\)/);
  assert.match(npc,/avatar\.setWeaponGripTargets\(null,null\)/);
  assert.match(npc,/aiming:aiming&&!disarmed/);
  assert.ok(npc.indexOf('gun.rotation.x=action.tilt')<npc.indexOf('avatar.update({dt'));
  assert.match(npc,/weaponPitch:aiming\?-.15:.11/);
  assert.match(source,/if\(WEAPON_REBUILD_MODE&&spec\.id!==NPC_GUN_TRIAL_ROLE\)enemy\.rigged\.disarm\(\)/);
  assert.match(page,/W20\.42 · RAIDER PIPE RIFLE TRIAL/);
  assert.match(page,/main\.js\?v=W20\.42/);
});

test('W20.36 right-side carry remains two-handed while sprint tilts each weapon down',()=>{
  const grip=readFileSync(new URL('./weapon-grip-ik.mjs',import.meta.url),'utf8');
  const npc=readFileSync(new URL('./npc-avatar.mjs',import.meta.url),'utf8');
  const avatar=readFileSync(new URL('./player-avatar.mjs',import.meta.url),'utf8');
  assert.match(avatar,/const weaponSocket=group\(torso,\.17,\.50,-\.20\)/);
  assert.match(avatar,/weaponSocket\.rotation\.x=\(Number\.isFinite\(weaponPitch\)/);
  assert.match(avatar,/-\.76\*pose\.sprint/);
  assert.match(avatar,/function setWeaponGripTargets\(right=null,left=null\)/);
  assert.match(avatar,/arm\.shoulder\.quaternion\.copy\(shoulderAim\)/);
  assert.match(avatar,/arm\.elbow\.quaternion\.copy\(elbowAim\)/);
  assert.match(npc,/weaponPitch:aiming\?-.15:.11/);
  assert.match(npc,/sprinting:!!moving&&!aiming&&speed>3/);
  assert.match(npc,/leftGrip\.position\.set\(-\.085,-\.055,-\.285\)/);
  assert.match(source,/player-avatar\.mjs\?v=W20\.36/);
  assert.match(source,/npc-avatar\.mjs\?v=W20\.42/);
  assert.match(source,/weapon-grip-ik\.mjs\?v=W20\.42/);
  assert.match(grip,/'pipe-smg':Object\.freeze/);
  assert.match(grip,/'pump-action-shotgun':Object\.freeze/);
  assert.match(page,/W20\.42 · RAIDER PIPE RIFLE TRIAL/);
  assert.match(page,/main\.js\?v=W20\.42/);
  // Existing NPC gun-removal testing mode must remain honored.
  assert.match(source,/if\(WEAPON_REBUILD_MODE&&spec\.id!==NPC_GUN_TRIAL_ROLE\)enemy\.rigged\.disarm\(\)/);
});

test('W20.37 nine per-weapon recoil curves affect firing, mouse compensation, ADS and third person',()=>{
  const recoil=readFileSync(new URL('./weapon-recoil.mjs',import.meta.url),'utf8');
  assert.match(source,/from '\.\.\/weapon-recoil\.mjs\?v=W20\.42'/);
  assert.match(source,/const viewRecoil=createWeaponRecoilState\(\)/);
  assert.match(source,/applyWeaponRecoil\(viewRecoil,camera\.rotation\.x,camera\.rotation\.y/);
  assert.match(source,/stepWeaponRecoil\(viewRecoil,camera\.rotation\.x,camera\.rotation\.y/);
  assert.match(source,/countersteerWeaponRecoil\(viewRecoil,e\.movementX,e\.movementY\)/);
  assert.match(source,/visual\.root\.position\.z\+=viewRecoil\.modelBack/);
  assert.match(source,/desired\.z\+=viewRecoil\.modelBack/);
  assert.match(source,/viewRecoil\.modelPitch\/\.16/);
  assert.match(recoil,/export function weaponRecoilProfile/);
  for(const id of ['10mm-pistol','pipe-pistol','pipe-rifle','laser-musket',
    'double-barrel-shotgun','pump-action-shotgun','bolt-hunting-rifle',
    'iron-revolver','pipe-smg'])
    assert.ok(recoil.includes("'"+id+"'"),id);
  assert.match(page,/main\.js\?v=W20\.42/);
});

test('W20.38 stronger default recoil preserves bullets-first shots and existing SPECIAL perks',()=>{
  const recoil=readFileSync(new URL('./weapon-recoil.mjs',import.meta.url),'utf8');
  const special=readFileSync(new URL('./special.mjs',import.meta.url),'utf8');
  assert.match(recoil,/const BASE_CAMERA_KICK=2\.0/);
  assert.match(recoil,/const MODEL_PUNCH=1\.65/);
  assert.match(recoil,/const RECOVERY_SLOWDOWN=\.74/);
  assert.match(source,/from '\.\.\/weapon-recoil\.mjs\?v=W20\.42'/);
  assert.match(source,/multiplier:specialModifiers\.recoilMultiplier/);
  assert.match(source,/const kick=applyWeaponRecoil/);
  assert.match(special,/perk\('steady-grip','strength'/);
  assert.match(page,/W20\.42 · RAIDER PIPE RIFLE TRIAL/);
  assert.match(page,/main\.js\?v=W20\.42/);
});


test('W20.39 NPC cover planning drives real paths and measured animation',()=>{
  assert.match(source,/from '\.\.\/enemy-ai\.mjs\?v=W20\.39'/);
  assert.match(source,/from '\.\.\/enemy-tactics\.mjs\?v=W20\.42'/);
  assert.match(source,/combatCoverCommitted:tactic\.coverCommit>0/);
  assert.match(source,/neighbors:roster\.filter\(other=>other\.id!==enemy\.id/);
  assert.match(source,/speed:enemy\.brain\.actualSpeed/);
  assert.match(source,/enemy\.root\.rotation\.y=enemy\.brain\.yaw;\s*enemy\.rigged\?\.update/);
  assert.match(source,/measuredSpeed:e\.brain\.actualSpeed/);
  assert.match(source,/coverGoal:e\.tactics\.coverPoint/);
  assert.match(source,/WEAPON_REBUILD_MODE&&/);
  assert.match(page,/W20\.42 · RAIDER PIPE RIFLE TRIAL/);
  assert.match(page,/main\.js\?v=W20\.42/);
});


test('W20.40 heavy sniper has authored 3D scope, real zoom and bolt cycle',()=>{
 const model=readFileSync(new URL('./heavy-sniper.mjs',import.meta.url),'utf8');
 const cycle=readFileSync(new URL('./heavy-sniper-mechanics.mjs',import.meta.url),'utf8');
 assert.match(model,/SniperSixPowerScopeTube/);
 assert.match(model,/SniperObjectiveLens/);
 assert.match(model,/SniperOcularLens/);
 assert.match(model,/SniperElevationTurret/);
 assert.match(model,/SniperRotatingBoltAssembly/);
 assert.match(model,/SniperFiveRoundMagazine/);
 assert.match(cycle,/cycleSeconds:1\.42/);
 assert.match(source,/heldHeavySniper=createHeavySniper/);
 assert.match(source,/HEAVY_SNIPER\.id,heldHeavySniper/);
 assert.match(source,/heavySniperBoltCyclePose\(slideCycle\)/);
 assert.match(source,/HEAVY_SNIPER_TUNING\.cycleSeconds/);
 assert.match(source,/id===HEAVY_SNIPER\.id&&weaponState\.aiming/);
 assert.match(source,/\$\('sniperScope'\)\.classList\.toggle\('active',throughSniperScope\)/);
 assert.match(page,/id="sniperScope"/);
 assert.match(page,/scope-reticle/);
 assert.match(page,/6× SCOPE/);
 assert.match(page,/main\.js\?v=W20\.42/);
});


test('W20.42 equips exactly one raider with the real player Pipe Rifle',()=>{
 const tactics=readFileSync(new URL('./enemy-tactics.mjs',import.meta.url),'utf8');
 assert.match(source,/const NPC_GUN_TRIAL_ROLE='raider'/);
 assert.match(source,/WEAPON_REBUILD_MODE&&spec\.id!==NPC_GUN_TRIAL_ROLE/);
 assert.match(source,/WEAPON_REBUILD_MODE&&enemy\.id===NPC_GUN_TRIAL_ROLE\?'pipe-rifle'/);
 assert.match(source,/const liveNpcGun=!WEAPON_REBUILD_MODE\|\|/);
 assert.match(source,/enemy\.id===NPC_GUN_TRIAL_ROLE&&enemy\.tactics\.weaponId==='pipe-rifle'/);
 assert.match(npcAvatar,/createPipeRifle\(THREE,mount,\{thirdPerson:true\}\)/);
 assert.match(npcAvatar,/realPipe\.root\.visible=authentic/);
 assert.match(npcAvatar,/avatar\.setWeaponGripTargets\(/);
 assert.match(npcAvatar,/realPipe\?\.root\.visible\?realPipe\.muzzleGlow:flash/);
 assert.match(npcAvatar,/realPipe\.magazine\.position\.y=realPipe\.magBaseY-action\.magazineOffset/);
 assert.match(tactics,/automatic:false,magazine:15,reserve:90,reloadSeconds:2\.65/);
 assert.match(tactics,/rpm:136,shotInterval:60\/136,damage:30/);
});
