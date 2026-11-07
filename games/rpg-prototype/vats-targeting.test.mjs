import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VATS_ZONES,vatsApCost,vatsChance,vatsApAvailable,vatsSpendAp,
  vatsCriticalGain,vatsCriticalReady,vatsQueueSlots} from './vats-targeting.mjs';

test('every player and enemy armor slot can be independently targeted',()=>{
  assert.deepEqual([...VATS_ZONES],
    ['head','chest','leftArm','rightArm','leftLeg','rightLeg']);
});
test('hit chances obey distance, cover, perception and the selected limb',()=>{
  const body=vatsChance({distance:10,zone:'chest'});
  assert.ok(body>vatsChance({distance:10,zone:'head'}));
  assert.ok(body>vatsChance({distance:35,zone:'chest'}));
  assert.ok(vatsChance({distance:10,zone:'head',perception:10})>
    vatsChance({distance:10,zone:'head',perception:1}));
  assert.ok(vatsChance({distance:10,zone:'chest',accuracyPenalty:1.8})<body);
  assert.equal(vatsChance({distance:10,zone:'head',visible:false}),0);
  assert.equal(vatsChance({distance:60,zone:'chest'}),0);
  assert.equal(vatsChance({distance:5,zone:'fake'}),0);
});
test('VATS consumes the same stamina/AP pool as sprinting, never free AP',()=>{
  const player={stamina:6,staminaCooldown:0};
  const cost=vatsApCost({kind:'pistol',fireInterval:.23});
  assert.ok(cost>=18&&cost<=55);
  assert.equal(vatsApAvailable(player.stamina,6),100);
  assert.equal(vatsSpendAp(player,cost,6),true);
  assert.equal(vatsApAvailable(player.stamina,6),100-cost);
  for(let n=0;n<10;n++)vatsSpendAp(player,cost,6);
  assert.equal(vatsSpendAp(player,cost,6),false);
  assert.ok(player.stamina>=0);
  assert.equal(vatsApAvailable(0,6),0);
});
test('critical charge is earned by genuine hits and spent only when ready',()=>{
  assert.equal(vatsCriticalReady(99),false);
  assert.equal(vatsCriticalReady(vatsCriticalGain(90,20)),true);
  assert.equal(vatsCriticalGain(25,0),25);
});
test('targeting UI is connected to actual enemy hitboxes, shots, cover and ammo',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  for(const snippet of ['openVats()','renderVats()','fireVatsShot({',
    'vatsApAvailable(player.stamina','vatsSpendAp(player,','enemyHitMeshes.find(',
    'firstSolidHit(camera.position,','vatsTarget?.critical',
    'shoot({vatsTarget:','id="vatsPanel"']){
    assert.ok(main.includes(snippet)||html.includes(snippet),snippet);
  }
});
test('multiplayer-style targeting never pauses the world or releases pointer lock',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  const opening=main.slice(main.indexOf('function openVats(){'),
    main.indexOf('function closeVats(){'));
  assert.ok(opening.includes("$('vatsPanel').classList.remove('hidden')"));
  assert.doesNotMatch(opening,/controls\.(?:unlock|lock)\(/);
  assert.match(main,/updateEnemies\(dt,elapsed,refreshDisplay\);\s*if\(vatsState.active\)/);
  assert.match(main,/if\(vatsState.active\)\{\s*if\(e.button===0\)queueVatsShot\(\)/);
  assert.match(main,/keys\.add\(e\.code\)/);
  assert.match(main,/vatsState\.zone=VATS_ZONES\[Number\(e\.code\.slice\(-1\)\)-1\]/);
  assert.match(main,/hit:useCritical\|\|Math\.random\(\)\*100<chance/);
  assert.match(main,/!chargedCriticalThisRound/);
  assert.match(html,/#vatsPanel\{[^}]*pointer-events:none/);
  assert.match(html,/REAL-TIME COMBAT · ENEMIES KEEP MOVING/);
  assert.match(html,/HOSTILES · TAB TO CYCLE/);
});

test('live VATS queue never reserves more AP or ammo than available',()=>{
  assert.equal(vatsQueueSlots({ap:100,cost:25,ammo:6}),4);
  assert.equal(vatsQueueSlots({ap:100,cost:25,ammo:6,queuedCost:50,queuedShots:2}),2);
  assert.equal(vatsQueueSlots({ap:100,cost:25,ammo:2}),2);
  assert.equal(vatsQueueSlots({ap:100,cost:25,ammo:2,queuedCost:50,queuedShots:2}),0);
  assert.equal(vatsQueueSlots({ap:19,cost:20,ammo:30}),0);
  assert.equal(vatsQueueSlots({ap:100,cost:25,ammo:0,infiniteAmmo:true}),4);
  assert.equal(vatsQueueSlots({ap:NaN,cost:20,ammo:10}),0);
  assert.equal(vatsQueueSlots({ap:100,cost:0,ammo:10}),0);
});
test('queued attacks fire through real weapon timing without pausing combat',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  for(const snippet of ['function queueVatsShot(){','function stepVatsQueue(dt){',
    'stepVatsQueue(dt);','startVatsQueue();','undoVatsShot();',
    'vatsQueueSlots({ap,cost,queuedCost','shoot({vatsTarget:',
    "if(e.button===0)queueVatsShot();",'vatsState.queue.shift();',
    "result.status==='lost'",'id="vatsQueue"']){
    assert.ok(main.includes(snippet)||html.includes(snippet),snippet);
  }
  assert.match(main,/vatsQueueClock=result.status==='fired'\?Math\.max/);
  assert.doesNotMatch(main.slice(main.indexOf('function startVatsQueue(){'),
    main.indexOf('controls.addEventListener(\'lock\'')),
    /controls\.(?:unlock|lock)\(/);
});
