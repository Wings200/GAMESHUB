import test from 'node:test';
import assert from 'node:assert/strict';
import {ARMOR_SLOTS,getArmorPiece} from './combat.mjs';
import {createPowerArmorState,beginPowerArmorTransition,stepPowerArmor,
  POWER_ARMOR_TRANSITION_SECONDS} from './power-armor.mjs';
import {ENEMY_WEAPONS} from './enemy-tactics.mjs';
import {regularBallisticReduction,calculateIncomingShot}
  from './player-ballistics.mjs';

test('regular armor remains useful but no longer makes bullets negligible',()=>{
  assert.equal(regularBallisticReduction(0),0);
  assert.ok(regularBallisticReduction(33)>.20);
  assert.ok(regularBallisticReduction(121)>.58);
  assert.ok(regularBallisticReduction(121)<.62);
  assert.equal(regularBallisticReduction(Infinity),0);
  assert.ok(regularBallisticReduction(1e8)<=.62);
});
test('all six guns threaten top regular armor while power armor remains toughest',()=>{
  const bare=createPowerArmorState();
  const bestChest=getArmorPiece('chest','aegis-chest').points;
  const topSuit=createPowerArmorState();topSuit.occupied=true;
  for(const slot of ARMOR_SLOTS)topSuit.plates[slot]='citadel';
  for(const [id,gun] of Object.entries(ENEMY_WEAPONS)){
    const none=calculateIncomingShot(gun.damage,0,bare);
    const top=calculateIncomingShot(gun.damage,bestChest,bare);
    const suit=calculateIncomingShot(gun.damage,bestChest,topSuit);
    assert.ok(none.damage>=8&&none.damage<=20,id+' raw damage');
    assert.ok(top.damage>=2.5&&top.damage<=8,id+' Aegis protection');
    assert.ok(suit.damage>0&&suit.damage<top.damage,id+' chassis protection');
    assert.equal(none.damage,gun.damage);
    assert.equal(suit.combinedReduction,.90);
  }
});
test('exiting power armor restores ordinary armor incoming damage',()=>{
  const state=createPowerArmorState();
  for(const slot of ARMOR_SLOTS)state.plates[slot]='citadel';
  const points=getArmorPiece('chest','aegis-chest').points;
  const before=calculateIncomingShot(17,points,state);
  state.occupied=true;
  const during=calculateIncomingShot(17,points,state);
  assert.ok(during.damage<before.damage*.35);
  beginPowerArmorTransition(state);
  stepPowerArmor(state,POWER_ARMOR_TRANSITION_SECONDS);
  assert.equal(state.occupied,false);
  const after=calculateIncomingShot(17,points,state);
  assert.ok(Math.abs(after.damage-before.damage)<1e-10);
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
