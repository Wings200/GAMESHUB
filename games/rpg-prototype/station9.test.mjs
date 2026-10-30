// Source-level integration smoke assertions for the Three.js station, which
// cannot be exercised by the pure Node AI tests alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
const page=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');

test('Station nine has 3 declared enemies ahead of a west-facing player',()=>{
  const section=source.slice(source.indexOf('const enemySpecs=['),source.indexOf('function enemyMaterial'));
  assert.ok(section.includes("id:'scout'"));
  assert.ok(section.includes("id:'raider'"));
  assert.ok(section.includes("id:'enforcer'"));
  const points=[...section.matchAll(/label:'[^']+',x:(\d+),z:([\d.]+)/g)]
    .map(v=>({x:Number(v[1]),z:Number(v[2])}));
  assert.equal(points.length,3);
  assert.ok(points.every(p=>p.x>30 && p.x<50 && p.z>35 && p.z<49));
  assert.match(source,/x:30,z:42,tag:'09 \/ AI TEST'/);
});
test('Enemy visibility depends on station selection, not a small walk box',()=>{
  assert.match(source,/function inAIArena\(\)\{return stationIndex===8;\}/);
  assert.match(source,/enemy\.root\.visible=active/);
  assert.match(source,/enemy\.billboard\.mesh\.visible=active/);
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
test('Existing armor and pistol systems remain in the same script',()=>{
  assert.match(source,/rebuildDummyArmor/);
  assert.match(source,/fireWeapon\(weaponState,SCRAP_PISTOL/);
  assert.match(source,/markBulletHole/);
  assert.match(source,/updateCombatVisuals\(dt\)/);
});
