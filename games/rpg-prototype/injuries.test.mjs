import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {useSupply} from './inventory.mjs';
import {createInjuryState,safeInjurySnapshot,damagePlayerLimb,
  hasPlayerInjury,healWorstLimb,resetInjuries,injuryEffects,injuryStatus}
  from './injuries.mjs';

test('old or corrupt limb saves load with healthy, bounded conditions',()=>{
  assert.deepEqual(safeInjurySnapshot(null),createInjuryState());
  const state=safeInjurySnapshot({condition:{leftLeg:-50,head:250,chest:NaN}});
  assert.equal(state.condition.leftLeg,0);
  assert.equal(state.condition.head,100);
  assert.equal(state.condition.chest,100);
});
test('hits to physical zones reduce only that limb condition',()=>{
  const state=createInjuryState();
  assert.equal(damagePlayerLimb(state,'leftLeg',20).condition,55);
  assert.equal(state.condition.rightLeg,100);
  assert.equal(damagePlayerLimb(state,'invalid',30).applied,false);
  const hit=damagePlayerLimb(state,'leftLeg',20);
  assert.equal(hit.newlyCrippled,true);
  assert.equal(hit.condition,10);
  assert.ok(hasPlayerInjury(state));
});
test('crippled legs slow travel, arms affect aiming, torso affects stamina',()=>{
  const state=createInjuryState();
  const normal=injuryEffects(state);
  assert.equal(normal.speedMultiplier,1);
  assert.equal(normal.aimSpreadMultiplier,1);
  assert.equal(normal.canSprint,true);
  for(const slot of ['leftLeg','rightLeg','head','leftArm','chest'])
    state.condition[slot]=0;
  const injured=injuryEffects(state);
  assert.ok(injured.speedMultiplier<.6);
  assert.equal(injured.canSprint,false);
  assert.ok(injured.aimSpreadMultiplier>1.6);
  assert.ok(injured.recoilMultiplier>1);
  assert.ok(injured.staminaDrainMultiplier>1);
  assert.match(injuryStatus(state),/CRIPPLED/);
});
test('medical care restores the worst limb, not all limbs for free',()=>{
  const state=createInjuryState();
  state.condition.head=35;state.condition.leftLeg=0;
  const heal=healWorstLimb(state,65);
  assert.deepEqual(heal,{ok:true,slot:'leftLeg',restored:65});
  assert.equal(state.condition.head,35);
  assert.equal(healWorstLimb(state,0).ok,false);
  resetInjuries(state);
  assert.equal(hasPlayerInjury(state),false);
  assert.equal(healWorstLimb(state).ok,false);
});
test('one medkit is consumed for limb treatment even when HP is already full',()=>{
  const pack={items:[{uid:'one-medkit',itemId:'supply:medkit',quantity:2}]};
  const health={health:100,maxHealth:100,alive:true};
  const wounds=createInjuryState();wounds.condition.leftArm=0;
  const refused=useSupply(pack,'one-medkit',health);
  assert.equal(refused.ok,false);
  assert.equal(pack.items[0].quantity,2);
  const consumed=useSupply(pack,'one-medkit',health,
    {injuryNeedsCare:hasPlayerInjury(wounds)});
  assert.equal(consumed.ok,true);
  assert.equal(consumed.restored,0);
  assert.equal(pack.items[0].quantity,1);
  assert.equal(healWorstLimb(wounds).slot,'leftArm');
  assert.equal(wounds.condition.leftArm,65);
});
test('player hits, medkits, movement, aiming, recoil, HUD and saves share the limb state',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  for(const token of ['damagePlayerLimb(injuryState,zone,result.damage)',
    'healWorstLimb(injuryState)',"saveInjuries()",'injuryEffects(injuryState)',
    'injuryStatus(injuryState)','rpg-player-limbs-v1'])
    assert.ok(main.includes(token),token);
  for(const token of ['id="fieldInjuryStatus"','id="visorInjuryStatus"'])
    assert.ok(html.includes(token),token);
});
