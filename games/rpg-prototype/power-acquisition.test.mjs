import test from 'node:test';
import assert from 'node:assert/strict';
import {generateEnemyLoot} from './inventory.mjs';
import {POWER_ARMOR_SLOTS,plateCondition,safePowerArmorSnapshot} from './power-armor.mjs';
import {enemyPowerArmorForRound,salvageWornPowerArmor,
  ABANDONED_POWER_FRAMES,createAbandonedPowerFrame} from './power-acquisition.mjs';

test('ordinary enemies never spawn power armor loot even under favorable rolls',()=>{
  for(const type of ['scout','raider','enforcer']){
    const loot=generateEnemyLoot(type,0,null,()=>0);
    assert.equal(loot.some(entry=>entry.itemId.startsWith('power-plate:')||
      entry.itemId==='supply:fusion-core'),false);
  }
});
test('power armor loot is restricted to visibly fitted plates and original cores',()=>{
  const suit={tier:'t45',plates:['head','leftArm'],coreCharge:80};
  const salvage=salvageWornPowerArmor(suit,()=>0);
  assert.deepEqual(salvage.map(entry=>entry.itemId),[
    'power-plate:t45-head','power-plate:t45-leftArm','supply:fusion-core']);
  const enemyLoot=generateEnemyLoot('raider',5,null,()=>0,suit);
  assert.equal(enemyLoot.some(entry=>entry.itemId==='power-plate:t45-chest'),false);
  assert.equal(enemyLoot.some(entry=>entry.itemId==='power-plate:t45-head'),true);
  assert.deepEqual(salvageWornPowerArmor(null,()=>0),[]);
  assert.deepEqual(salvageWornPowerArmor({tier:'t01',plates:['fake'],coreCharge:0},()=>0),[]);
});
test('rare powered enemy waves match their displayed tier and armor loadout',()=>{
  assert.equal(enemyPowerArmorForRound('enforcer',0),null);
  assert.equal(enemyPowerArmorForRound('raider',0),null);
  assert.equal(enemyPowerArmorForRound('scout',99),null);
  assert.equal(enemyPowerArmorForRound('enforcer',3).tier,'t45');
  assert.equal(enemyPowerArmorForRound('enforcer',11).tier,'t60');
  assert.equal(enemyPowerArmorForRound('enforcer',19).tier,'t01');
  assert.deepEqual(enemyPowerArmorForRound('enforcer',3).plates,[...POWER_ARMOR_SLOTS]);
  assert.equal(enemyPowerArmorForRound('raider',5).tier,'t45');
});
test('abandoned rigs start as damaged, incomplete T-45 with a working core and survive saves',()=>{
  assert.equal(ABANDONED_POWER_FRAMES.length,3);
  for(const definition of ABANDONED_POWER_FRAMES){
    assert.ok(Math.abs(definition.x)<59&&Math.abs(definition.z)<50,
      'found frame is inside the reachable testing perimeter');
    const state=createAbandonedPowerFrame(definition);
    assert.ok(state.coreCharge>0);
    assert.ok(POWER_ARMOR_SLOTS.some(slot=>state.plates[slot]==='none'));
    for(const slot of POWER_ARMOR_SLOTS){
      const plate=plateCondition(state,slot);
      assert.ok(plate.tier==='t45'||plate.tier==='none');
      if(plate.tier==='t45')assert.ok(plate.current<plate.max&&plate.current>0);
    }
    assert.deepEqual(safePowerArmorSnapshot(JSON.parse(JSON.stringify(state))),state);
  }
});
