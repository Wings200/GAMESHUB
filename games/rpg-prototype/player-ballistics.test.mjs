import test from 'node:test';
import assert from 'node:assert/strict';
import {ARMOR_SLOTS,getArmorPiece,damageReductionForPoints,ARMOR_RESISTANCE} from './combat.mjs';
import {createPowerArmorState,beginPowerArmorTransition,stepPowerArmor,powerArmorProtection,
  POWER_ARMOR_TRANSITION_SECONDS} from './power-armor.mjs';
import {ENEMY_WEAPONS} from './enemy-tactics.mjs';
import {regularBallisticReduction,calculateIncomingShot}
  from './player-ballistics.mjs';

test('incoming bullets use exactly the normal item armor percentage',()=>{
  assert.equal(ARMOR_RESISTANCE.ratingDivisor,25);
  assert.equal(ARMOR_RESISTANCE.maxReduction,.85);
  for(const points of [0,10,25,33,75,100,121,1e8,NaN]){
    assert.equal(regularBallisticReduction(points),damageReductionForPoints(points));
  }
  const bare=createPowerArmorState();
  const unarmored=calculateIncomingShot(25,0,bare);
  const half=calculateIncomingShot(25,25,bare);
  const threeQuarters=calculateIncomingShot(25,75,bare);
  assert.equal(unarmored.damage,25);
  assert.equal(half.damage,12.5);
  assert.equal(half.blocked,12.5);
  assert.equal(threeQuarters.damage,6.25);
  assert.equal(threeQuarters.regularReduction,.75);
  assert.equal(regularBallisticReduction(1e8),.85);
});
test('all six NPC guns have stronger base damage while armor still blocks a percentage',()=>{
  const bare=createPowerArmorState();
  const bestChest=getArmorPiece('chest','aegis-chest').points;
  const topSuit=createPowerArmorState();topSuit.occupied=true;
  for(const slot of ARMOR_SLOTS)topSuit.plates[slot]='citadel';
  const expected={'compact-smg':16,'scout-carbine':25,'pipe-rifle':30,
    'raider-auto':25,'heavy-rifle':32,'heavy-lmg':20};
  for(const [id,gun] of Object.entries(ENEMY_WEAPONS)){
    assert.equal(gun.damage,expected[id],id+' base damage');
    const none=calculateIncomingShot(gun.damage,0,bare);
    const top=calculateIncomingShot(gun.damage,bestChest,bare);
    const suit=calculateIncomingShot(gun.damage,bestChest,topSuit);
    assert.equal(none.damage,gun.damage);
    assert.ok(top.damage>0&&top.damage<none.damage,id+' Aegis protection');
    assert.ok(Math.abs(top.damage-
      gun.damage*(1-damageReductionForPoints(bestChest)))<1e-10,
      id+' must preserve armor percent');
    assert.ok(suit.damage>0&&suit.damage<top.damage,id+' chassis protection');
    assert.equal(suit.combinedReduction,.92);
  }
});
test('exiting power armor restores ordinary armor incoming damage',()=>{
  const state=createPowerArmorState();
  for(const slot of ARMOR_SLOTS)state.plates[slot]='citadel';
  const points=getArmorPiece('chest','aegis-chest').points;
  const before=calculateIncomingShot(17,points,state);
  state.occupied=true;
  const during=calculateIncomingShot(17,points,state);
  assert.ok(during.damage<before.damage);
  assert.equal(during.combinedReduction,.92);
  beginPowerArmorTransition(state);
  stepPowerArmor(state,POWER_ARMOR_TRANSITION_SECONDS);
  assert.equal(state.occupied,false);
  const after=calculateIncomingShot(17,points,state);
  assert.ok(Math.abs(after.damage-before.damage)<1e-10);
});
test('W20.51 decreases occupied-suit bullet damage by exactly 20 percent at each armor tier',()=>{
  for(const tier of ['none','t45','t60','citadel']){
    for(const regularPoints of [0,25,100]){
      const suit=createPowerArmorState();
      suit.occupied=true;
      for(const slot of ARMOR_SLOTS)suit.plates[slot]=tier;
      const regular=regularBallisticReduction(regularPoints);
      const plate=calculateIncomingShot(30,regularPoints,suit,'chest');
      const frameReduction=powerArmorProtection(suit,'chest',regular).frameReduction;
      const fromFrame=30*(1-Math.min(.90,
        1-(1-regular)*(1-frameReduction)));
      assert.ok(Math.abs(plate.damage-fromFrame*.8)<1e-10,
        tier+' with '+regularPoints+' regular armor points');
      suit.occupied=false;
      assert.ok(Math.abs(calculateIncomingShot(30,regularPoints,suit,'chest').damage-
        30*(1-regular))<1e-10,'Outside suit damage must remain unchanged');
    }
  }
});
test('hit zone protection depends on equipped pieces',()=>{
  const bare=createPowerArmorState();
  const helm=getArmorPiece('head','citadel-head').points;
  assert.ok(calculateIncomingShot(15,helm,bare,'head').damage<
    calculateIncomingShot(15,0,bare,'chest').damage);
  assert.equal(calculateIncomingShot(15,0,bare,'chest').damage,15);
});
test('bad damage input never heals or returns invalid damage',()=>{
  const state=createPowerArmorState();
  for(const value of [-1,NaN,Infinity,0]){
    const result=calculateIncomingShot(value,NaN,state);
    assert.equal(result.damage,0);
    assert.equal(result.blocked,0);
  }
});
