import test from 'node:test';
import assert from 'node:assert/strict';
import {DOUBLE_BARREL_TUNING,doubleBarrelDamageFactor,doubleBarrelPelletDamage} from './double-barrel-ballistics.mjs';
import {DOUBLE_BARREL_SHOTGUN,createWeaponState,fireWeapon,updateWeapon,startWeaponReload,setWeaponAim} from './weapons.mjs';

test('Shotgun stays lethal only at close range with smooth, monotone falloff',()=>{
  assert.equal(DOUBLE_BARREL_TUNING.barrels,2);
  assert.equal(DOUBLE_BARREL_TUNING.pellets,8);
  assert.equal(doubleBarrelDamageFactor(0),1);
  assert.equal(doubleBarrelDamageFactor(5),1);
  assert.equal(doubleBarrelDamageFactor(24),.2);
  assert.equal(doubleBarrelDamageFactor(100),.2);
  assert.equal(doubleBarrelDamageFactor(-4),1);
  let previous=1;
  for(let d=5;d<=24;d+=.25){
    const factor=doubleBarrelDamageFactor(d);
    assert.ok(factor<=previous+1e-10);
    previous=factor;
  }
  assert.equal(doubleBarrelPelletDamage(10,3),10);
  assert.ok(doubleBarrelPelletDamage(10,12)<10);
  assert.equal(doubleBarrelPelletDamage(10,100),2);
});
test('Two independent shells fire eight independent rays per trigger pull',()=>{
  const gun=DOUBLE_BARREL_SHOTGUN,state=createWeaponState(gun);
  const fire=()=>fireWeapon(state,gun,Math.random);
  const first=fire();
  assert.equal(first.status,'fired');
  assert.equal(first.directions.length,8);
  assert.equal(first.damage,10);
  assert.equal(state.magazine,1);
  assert.equal(fire().status,'cooldown');
  updateWeapon(state,gun.fireInterval,gun);
  assert.equal(fire().status,'fired');
  assert.equal(state.magazine,0);
  updateWeapon(state,gun.fireInterval,gun);
  assert.equal(fire().status,'empty');
  setWeaponAim(state,true);
  assert.equal(gun.automatic,false);
  assert.ok(gun.adsSpreadDegrees<gun.hipSpreadDegrees);
});
test('Reload opens the hinge, inserts shells sequentially and respects reserve',()=>{
  const gun=DOUBLE_BARREL_SHOTGUN,state=createWeaponState(gun);
  state.magazine=0;
  assert.equal(startWeaponReload(state,gun),true);
  assert.equal(state.reloadDuration,2.65);
  assert.equal(state.reloadRounds,2);
  const reserveStart=state.reserve;
  updateWeapon(state,2.65*.41,gun);
  assert.equal(state.magazine,0,'no shell loads while hinge is opening');
  updateWeapon(state,2.65*.29,gun);
  assert.equal(state.magazine,1,'first hand-inserted shell is seated');
  assert.equal(state.reserve,reserveStart-1);
  updateWeapon(state,2.65*.31,gun);
  assert.equal(state.magazine,2);
  assert.equal(state.reserve,reserveStart-2);
  assert.equal(state.reloadRemaining,0);
  assert.equal(state.reloadRounds,0);
  state.magazine=1;
  assert.equal(startWeaponReload(state,gun),true);
  assert.equal(state.reloadDuration,1.95);
  assert.equal(state.reloadRounds,1);
  updateWeapon(state,1.96,gun);
  assert.equal(state.magazine,2);
  assert.equal(state.reserve,reserveStart-3);
  assert.equal(startWeaponReload(state,gun),false);
});
