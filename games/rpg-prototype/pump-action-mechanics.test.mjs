import test from 'node:test';
import assert from 'node:assert/strict';
import {PUMP_ACTION_TUNING,pumpCyclePose,pumpReloadSeconds,pumpPelletDamage} from './pump-action-mechanics.mjs';
import {PUMP_ACTION_SHOTGUN,createWeaponState,fireWeapon,startWeaponReload,updateWeapon,setWeaponAim} from './weapons.mjs';
test('Pump fully retracts after firing and returns bolt before next shot',()=>{
  const at=p=>pumpCyclePose(.60*(1-p));
  assert.equal(PUMP_ACTION_TUNING.capacity,6);
  assert.equal(PUMP_ACTION_TUNING.pellets,8);
  assert.equal(at(.05).forendOffset,0);
  assert.ok(at(.43).forendOffset>.23);
  assert.ok(at(.43).boltOffset>.14);
  assert.equal(at(.30).ejectNow,false);
  assert.equal(at(.45).ejectNow,true);
  assert.ok(at(.72).forendOffset<at(.43).forendOffset);
  assert.ok(at(.88).forendOffset<.001);
  assert.equal(pumpCyclePose(0).active,false);
  assert.equal(pumpCyclePose(0).forendOffset,0);
});
test('Pump shotgun damage is close-range focused and weaker per shell than double-barrel',()=>{
  assert.equal(pumpPelletDamage(9,0),9);
  assert.equal(pumpPelletDamage(9,7),9);
  assert.ok(pumpPelletDamage(9,14)<9);
  assert.equal(pumpPelletDamage(9,30),2);
  assert.equal(pumpPelletDamage(9,120),2);
  let last=9;
  for(let distance=7;distance<=30;distance+=.25){
    const next=pumpPelletDamage(9,distance);
    assert.ok(next<=last);last=next;
  }
});
test('Tube holds six shells; one trigger pull fires eight pellets and costs one shell',()=>{
  const gun=PUMP_ACTION_SHOTGUN,state=createWeaponState(gun);
  assert.equal(gun.magazineSize,6);
  setWeaponAim(state,true);
  const first=fireWeapon(state,gun,Math.random);
  assert.equal(first.status,'fired');
  assert.equal(first.directions.length,8);
  assert.equal(first.damage,9);
  assert.equal(state.magazine,5);
  assert.equal(fireWeapon(state,gun).status,'cooldown');
  updateWeapon(state,gun.fireInterval,gun);
  assert.equal(fireWeapon(state,gun).status,'fired');
  assert.equal(state.magazine,4);
});
test('Individual tube loading uses actual missing count and preserves seated shells',()=>{
  const gun=PUMP_ACTION_SHOTGUN,state=createWeaponState(gun);
  state.magazine=0;const reserve=state.reserve;
  assert.equal(pumpReloadSeconds(6),4.24);
  assert.equal(pumpReloadSeconds(1),1.49);
  assert.equal(startWeaponReload(state,gun),true);
  assert.equal(state.reloadDuration,4.24);
  assert.equal(state.reloadRounds,6);
  updateWeapon(state,.91,gun);assert.equal(state.magazine,0);
  updateWeapon(state,.57,gun);assert.equal(state.magazine,1);
  assert.equal(state.reserve,reserve-1);
  assert.equal(fireWeapon(state,gun,()=>.5).status,'fired',
    'shooting after the first shell should interrupt the unfinished load');
  assert.equal(state.magazine,0);
  assert.equal(state.reloadRemaining,0);
  state.magazine=5;
  assert.equal(startWeaponReload(state,gun),true);
  assert.equal(state.reloadDuration,1.49);
  updateWeapon(state,1.50,gun);
  assert.equal(state.magazine,6);
  assert.equal(state.reserve,reserve-2);
});
