import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {carryCapacity,encumbranceEffects,formatCarryWeight}
  from './carry-weight.mjs';

test('W20.95 Strength and physical frame change real carry capacity',()=>{
  assert.equal(carryCapacity({strength:3}),230);
  assert.equal(carryCapacity({strength:10}),300);
  assert.equal(carryCapacity({strength:3,powerArmor:true}),310);
  assert.equal(carryCapacity({strength:3,fieldBackpack:true}),255);
  assert.equal(carryCapacity({strength:3,powerArmor:true,fieldBackpack:true}),335);
  assert.equal(carryCapacity({strength:99}),300,'player attributes never exceed ten');
});

test('W20.95 exceeding carry capacity removes sprint and drains real AP on movement',()=>{
  const normal=encumbranceEffects(229.9,230),edge=encumbranceEffects(230,230);
  assert.equal(normal.overloaded,false);
  assert.equal(edge.canSprint,true);
  assert.equal(edge.movingApDrain,0);
  const heavy=encumbranceEffects(231,230),veryHeavy=encumbranceEffects(400,230);
  assert.equal(heavy.overloaded,true);
  assert.equal(heavy.excess,1);
  assert.equal(heavy.canSprint,false);
  assert.ok(heavy.speedMultiplier<1&&heavy.speedMultiplier>0);
  assert.ok(heavy.movingApDrain>0);
  assert.ok(veryHeavy.speedMultiplier<heavy.speedMultiplier);
  assert.ok(veryHeavy.movingApDrain>=heavy.movingApDrain);
  assert.equal(encumbranceEffects(NaN,0).overloaded,false);
});

test('W20.95 carry display is stable and rounded',()=>{
  assert.equal(formatCarryWeight(23.45),'23.4 LB');
  assert.equal(formatCarryWeight(0),'0.0 LB');
  assert.equal(formatCarryWeight(-10),'0.0 LB');
});

test('W20.95 live controller, power suit and every player panel share capacity',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  for(const snippet of ['function currentCarry(){','inventoryWeight(backpack)',
    'powerArmor:powerArmorState.occupied','load.speedMultiplier',
    '&&load.canSprint','load.movingApDrain*dt','!currentCarry().overloaded',
    'id="fieldCarry"','id="visorCarry"','id="inventoryCapacity"',
    'id="vendorCapacity"','id="lootCarryCapacity"'])
    assert.ok(main.includes(snippet)||html.includes(snippet),snippet);
  assert.doesNotMatch(html,/30 SLOTS/);
  assert.doesNotMatch(main,/backpack\.items\.length>=backpackSlotLimit/);
});
