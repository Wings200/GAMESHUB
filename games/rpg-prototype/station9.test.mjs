// Source-level integration smoke assertions for the Three.js station, which
// cannot be exercised by the pure Node AI tests alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
const page=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');

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
  assert.match(source,/updateEnemies\(dt\);\s*renderer\.render\(scene,camera\)/);
});
test('Health and enemies have real connected HUD elements',()=>{
  const ids=['playerHealthHud','healthReadout','healthFill','healthStatus',
    'playerDamageFlash','enemyHud','enemyCount','enemyMode','enemyList'];
  for(const id of ids){
    assert.ok(page.includes('id="'+id+'"'),'Missing HUD element '+id);
    if(id!=='playerHealthHud')assert.ok(source.includes("'"+id+"'"),'Missing scene wiring '+id);
  }
  assert.match(source,/hitPlayer\(playerHealth,attack\.damage\)/);
  assert.match(source,/resetPlayerHealth\(playerHealth\)/);
  assert.match(source,/canEnemyFire\(enemy\.brain,player,aiObstacles,attack\.range\)/);
});
test('Direct enter button, engine status and cache version are wired',()=>{
  assert.match(page,/id="enterAI"/);
  assert.match(page,/id="engineStatus"/);
  assert.match(source,/\$\('enterAI'\)\.addEventListener\('click'/);
  assert.match(source,/RAIDERS LOADED/);
  assert.match(source,/new URLSearchParams\(location\.search\)\.get\('station'\)==='9'/);
  assert.match(page,/main\.js\?v=W05\.3\.1/);
  assert.match(source,/RAIDERS ALIVE · /);
});
test('Dead NPC bodies and indicators despawn, then J restores them',()=>{
  assert.match(source,/enemy\.deathTimer\+=dt/);
  assert.match(source,/if\(enemy\.deathTimer>=\.7\)enemy\.root\.visible=false/);
  assert.match(source,/enemy\.beacon\.visible=enemy\.state\.alive/);
  assert.match(source,/enemy\.shoulderMark\.visible=enemy\.state\.alive/);
  assert.match(source,/enemy\.billboard\.mesh\.visible=enemy\.state\.alive/);
  assert.match(source,/if\(hit\.killed\)\{/);
  assert.match(source,/enemy\.brain\.active=false/);
  assert.match(source,/enemy\.deathTimer=0/);
  assert.match(source,/enemy\.root\.visible=true;enemy\.billboard\.mesh\.visible=true/);
  assert.match(source,/enemy\.beacon\.visible=true;enemy\.shoulderMark\.visible=true/);
  assert.match(source,/updateArenaSign\(\)/);
  assert.match(source,/function resetEnemies\(\)/);
  assert.match(source,/KeyJ/);
});
test('3D world markers, hit labels and arena sign respect obstacle occlusion',()=>{
  assert.doesNotMatch(source,/depthTest:false/);
  assert.match(source,/color:0xf19668,depthTest:true/);
  assert.match(source,/color:0xf2ad66,depthTest:true/);
  assert.match(source,/map:texture,transparent:true,depthTest:true,depthWrite:false/);
  assert.match(source,/map:locatorTex,transparent:true,depthTest:true,depthWrite:false/);
  assert.doesNotMatch(source,/for\(const \[x,z\] of \[\[39,42\],\[43,46\],\[46,36\.8\]\]\)/);
});
test('Advanced AI cover, reload, accuracy and visual behavior are wired',()=>{
  assert.match(source,/tickEnemyTactics\(enemy\.tactics,enemy\.brain,player,dt,aiObstacles/);
  assert.match(source,/attemptEnemyShot\(enemy\.tactics/);
  assert.match(source,/markEnemyThreat\(enemy\.tactics\)/);
  assert.match(source,/resetEnemyTactics\(enemy\.tactics\)/);
  assert.match(source,/if\(shot\.hit\)\{/);
  assert.match(source,/if\(!shot\.hit\)\{/);
  assert.match(source,/combatGoal:tactic\.goal/);
  assert.match(source,/combatHold:tactic\.phase==='hold'/);
  assert.match(source,/ENEMY_PROFILES\[enemy\.id\]\.moveSpeed/);
  assert.match(source,/enemy\.tactics\.reloadRemaining>0\?'RELOAD'/);
  assert.match(page,/AI \+ ENEMY DAMAGE CHECK/);
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
  assert.match(page,/AI \+ ENEMY DAMAGE CHECK/);
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
  assert.match(source,/for\(const spec of ARSENAL\)updateWeapon\(arsenalStates\[spec\.id\],dt,spec\)/);
  assert.match(source,/if\(controls\.isLocked&&triggerHeld&&activeSpec\.automatic\)/);
  assert.match(source,/if\(e\.button===0\)\{triggerHeld=true;shoot\(\);\}/);
  assert.match(source,/if\(e\.button===0\)triggerHeld=false/);
  assert.match(source,/new THREE\.CylinderGeometry/);
});

test('W05.1 sight mounts are actually used for stable camera-space ADS',()=>{
  assert.match(source,/import \{ sightMount, adsWeaponPosition \} from '\.\.\/weapon-sights\.mjs'/);
  assert.match(source,/const mount=sightMount\(spec\.id\)/);
  assert.match(source,/function alignActiveSight\(\)\{/);
  assert.match(source,/const anchor=adsWeaponPosition\(activeWeaponId\)/);
  assert.match(source,/visual\.root\.position\.set\(anchor\.x,anchor\.y,anchor\.z\)/);
  assert.match(source,/visual\.root\.rotation\.set\(0,0,0\)/);
  assert.match(source,/if\(weaponState\.aiming&&!handling\.active\)\{/);
  assert.match(source,/alignActiveSight\(\)/);
  assert.doesNotMatch(source,/const desired=weaponState\.aiming\?/);
  assert.match(source,/const targetFOV=weaponState\.aiming\?sightMount\(activeWeaponId\)\.fov:76/);
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
  assert.match(page,/AI \+ ENEMY DAMAGE CHECK/);
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
  assert.match(source,/if\(controls\.isLocked&&triggerHeld&&activeSpec\.automatic\)/);
  assert.match(source,/triggerHeld=false;emptyClickLatched=false/);
  assert.match(source,/if\(startWeaponReload\(weaponState,activeSpec\)\)\{\s*emptyClickLatched=false/);
});
