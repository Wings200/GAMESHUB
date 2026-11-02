// Source-level integration smoke assertions for the Three.js station, which
// cannot be exercised by the pure Node AI tests alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
const page=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const npcAvatar=readFileSync(new URL('./npc-avatar.mjs',import.meta.url),'utf8');
const armorVisual=readFileSync(new URL('./power-armor-visual.mjs',import.meta.url),'utf8');
const playerAvatar=readFileSync(new URL('./player-avatar.mjs',import.meta.url),'utf8');
const remoteAvatar=readFileSync(new URL('./remote-avatar.mjs',import.meta.url),'utf8');

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
  assert.match(source,/updateEnemies\(dt\);[\s\S]*renderer\.render\(scene,camera\)/);
});
test('W06.4 distant NPCs continue moving and deaths finish outside the arena',()=>{
  assert.match(source,/const simulating=controls\.isLocked&&enemyAIEnabled/);
  assert.match(source,/enabled:simulating&&playerHealth\.alive/);
  assert.doesNotMatch(source,/if\(!active\)continue/);
  assert.match(source,/function markEnemyDefeated\(enemy\)/);
  assert.match(source,/enemy\.flash=0;enemy\.shake=0/);
});
test('W06.4 neck hitbox overlaps the chest and head geometry',()=>{
  const match=source.match(/new THREE\.CylinderGeometry\(\.13,\.15,([\d.]+),10\),\s*flesh,0,([\d.]+),0,'chest'/);
  assert.ok(match,'A solid neck hitbox must be present');
  const height=Number(match[1]),center=Number(match[2]);
  assert.ok(center-height/2<1.34+.72/2,'Neck must overlap chest');
  assert.ok(center+height/2>2.03-.225,'Neck must overlap head');
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
  assert.match(source,/new THREE\.CylinderGeometry\(\.13,\.15,\.28,10\)/);
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
  assert.match(page,/main\.js\?v=W09\.15/);
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
  assert.match(source,/enemy\.deathTimer\+=dt/);
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
  assert.match(source,/part\(upperBody,new THREE.BoxGeometry\(\.57,\.72,\.35\)/);
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
  assert.match(source,/for\(const spec of ARSENAL\)if\(spec\.id!==SCRAP_PISTOL\.id\)/);
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
  assert.match(source,/applyDamage\(enemy\.state,activeSpec\.damage/);
  assert.match(source,/applyDamage\(dummy\.state,activeSpec\.damage/);
  assert.match(source,/startWeaponReload\(weaponState,activeSpec\)/);
  assert.match(source,/createWeaponState\(activeSpec\)/);
  assert.match(source,/updateWeapon\(state,dt,spec\)/);
  assert.match(source,/if\(ammoSpentOnReload\)saveBackpack\(\)/);
  assert.ok(source.includes("controls.isLocked&&triggerHeld&&activeSpec.automatic&&powerArmorState.phase==='idle'"));
  assert.ok(source.includes("if(e.button===0&&powerArmorState.phase==='idle'){triggerHeld=true;shoot();}"));
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
  assert.match(source,/const drum=cylinder\(\.099,\.182,oxide,0,\.036,-\.10\)/);
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
  assert.match(source,/if\(visual\.cylinderBody\)visual\.cylinderBody\.visible=!handling\.active/);
  assert.match(source,/visual\.pumpGrip\.position\.z=-\.34\+slideTravel\(slideCycle\)\*1\.5/);
  assert.match(source,/visual\.reloadHand\.visible=false/);
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
  assert.match(source,/sound\.gunshot\(activeSpec\.kind\|\|'pistol'\)/);
  assert.match(source,/sound\.reload\(activeSpec\.kind\|\|'pistol',activeSpec\.reloadSeconds\)/);
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
  assert.match(source,/if\(result\.status!=='fired'\)return;\s*emptyClickLatched=false/);
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
  assert.match(source,/occupiedCover:occupiedSquadCover\(\[\.\.\.enemies\.values\(\)\],enemy\.id\)/);
  assert.match(source,/separation:squadSeparation\(enemy\.brain,\[\.\.\.enemies\.values\(\)\]\)/);
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
  assert.match(source,/spawnWorldLoot\(\[\{itemId:dropped\.itemId,quantity:dropped\.removed\}\]/);
  assert.match(source,/dropAmount\.max=String\(entry\.quantity\)/);
  assert.match(source,/Number\.isSafeInteger\(amount\)/);
  assert.match(source,/playerArmorReduction\(backpack,'chest'\)/);
  assert.ok(source.includes('calculateIncomingShot(attack.damage,armor.points,'));
  assert.match(source,/if\(e\.code==='KeyE'&&!e\.repeat&&controls\.isLocked\)/);
  assert.match(source,/if\(e\.code==='KeyI'&&!e\.repeat\)/);
});
test('W06.0 loot modal, game pause and persistence have a browser gameplay check',()=>{
  assert.match(page,/E SEARCH LOOT · I BACKPACK/);
  assert.match(page,/main\.js\?v=W09\.15/);
  assert.match(source,/function beginLootOverlay\(id=null\)/);
  assert.match(source,/if\(fromField\)controls\.unlock\(\)/);
  assert.ok(source.includes("if(!inventoryOpen&&!lootOpen&&!workbenchOpen&&!powerUIOpen)$('menu').classList.remove('hidden')"));
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
    "e.code==='KeyP'","e.code==='KeyO'",
    'window.__rpgSmokePowerVisual='])
    assert.ok(source.includes(phrase),phrase);
  assert.ok(page.includes('W08.3'));
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
  assert.match(page,/main\.js\?v=W09\.15/);
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
  assert.match(source,/reloading:enemy\.tactics\.reloadRemaining>0/);
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
  assert.match(page,/main\.js\?v=W09\.15/);
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
  assert.match(page,/main\.js\?v=W09\.15/);
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
  assert.match(page,/W09\.7/);
});


test('W09.8 uses real inventory sections and automatic weapon ammo pickup',()=>{
  assert.match(page,/id="inventoryCategories"/);
  assert.match(page,/id="inventorySectionTitle"/);
  assert.match(page,/id="inventoryAmmo"/);
  assert.match(source,/INVENTORY_CATEGORIES\.map\(category=>/);
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
  assert.match(source,/const shouldAim=directlyVisible&&/);
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
  assert.match(page,/main\.js\?v=W09\.15/);
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
  assert.match(source,/hitPlayer\(playerHealth,incoming\.damage\)/);
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
