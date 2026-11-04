import test from 'node:test';
import assert from 'node:assert/strict';
import {LASER_MUSKET,createWeaponState,startWeaponReload,updateWeapon} from './weapons.mjs';
import {sightMount,adsWeaponPosition} from './weapon-sights.mjs';
import {ensureLaserState,startLaserCrank,cancelLaserCrank,updateLaserCrank,
  laserCrankProgress,fireChargedLaser,LASER_MUSKET_TUNING} from './laser-musket-mechanics.mjs';

function finishCrank(state){updateLaserCrank(state,LASER_MUSKET_TUNING.crankSeconds+.01);}
test('One press of R winds one cell and only a fully turned crank stores charge',()=>{
  const state=ensureLaserState(createWeaponState(LASER_MUSKET));
  assert.equal(fireChargedLaser(state,LASER_MUSKET).status,'uncharged');
  assert.equal(startLaserCrank(state).status,'started');
  assert.equal(state.magazine,5,'crank consumes one actual fusion cell');
  assert.equal(startLaserCrank(state).status,'cranking');
  assert.equal(fireChargedLaser(state,LASER_MUSKET).status,'cranking');
  updateLaserCrank(state,.30);
  assert.ok(laserCrankProgress(state)>.4&&laserCrankProgress(state)<.5);
  assert.equal(state.laserCharge,0,'no free charge before wheel completes');
  finishCrank(state);
  assert.equal(state.laserCharge,1);
  const shot=fireChargedLaser(state,LASER_MUSKET,()=>.5);
  assert.equal(shot.status,'fired');
  assert.equal(shot.damage,32);
  assert.equal(shot.chargeLevel,1);
  assert.equal(state.magazine,5,'trigger does not double-spend stored energy');
  assert.equal(state.laserCharge,0,'laser discharges all stored energy');
});

test('Six full manual cranks multiply beam damage and use six cells',()=>{
  const state=ensureLaserState(createWeaponState(LASER_MUSKET));
  for(let i=0;i<6;i++){
    assert.equal(startLaserCrank(state).status,'started');
    finishCrank(state);
  }
  assert.equal(startLaserCrank(state).status,'fully-charged');
  assert.equal(state.magazine,0);
  assert.equal(state.laserCharge,6);
  const shot=fireChargedLaser(state,LASER_MUSKET,()=>.5);
  assert.equal(shot.damage,96);
  assert.equal(shot.directions.length,1);
  assert.equal(state.laserCharge,0);
  assert.equal(startLaserCrank(state).status,'no-cells');
  assert.equal(startWeaponReload(state,LASER_MUSKET),true);
  updateWeapon(state,LASER_MUSKET.reloadSeconds+.01,LASER_MUSKET);
  assert.equal(state.magazine,6);
  assert.equal(state.reserve,78,'cell-pack exchange consumes six reserve cells');
});

test('Cancelling an unfinished crank refunds only a paid cell',()=>{
  const state=ensureLaserState(createWeaponState(LASER_MUSKET));
  startLaserCrank(state);
  assert.equal(cancelLaserCrank(state),true);
  assert.equal(state.magazine,6);
  assert.equal(state.laserCharge,0);
  assert.equal(cancelLaserCrank(state),false);
  startLaserCrank(state,{infiniteAmmo:true});
  assert.equal(state.magazine,6);
  assert.equal(cancelLaserCrank(state),true);
  assert.equal(state.magazine,6);
});

test('Six-charge infinite-ammo mode still requires R and honors cooldown',()=>{
  const state=ensureLaserState(createWeaponState(LASER_MUSKET));
  for(let i=0;i<6;i++){
    startLaserCrank(state,{infiniteAmmo:true});
    finishCrank(state);
  }
  assert.equal(state.magazine,6);
  assert.equal(fireChargedLaser(state,LASER_MUSKET).status,'fired');
  assert.equal(fireChargedLaser(state,LASER_MUSKET).status,'cooldown');
  updateWeapon(state,.95,LASER_MUSKET);
  assert.equal(fireChargedLaser(state,LASER_MUSKET).status,'uncharged');
});

test('Laser Musket front/rear iron sights lie on the world fire ray',()=>{
  const mount=sightMount(LASER_MUSKET.id);
  const anchor=adsWeaponPosition(LASER_MUSKET.id);
  assert.equal(mount.y,.263);
  assert.ok(Math.abs(anchor.y+mount.y)<1e-9);
  assert.equal(mount.optic,'iron');
});

test('All crank levels increase smoothly without exceeding the 96 damage cap',()=>{
  const expected=[32,45,58,70,83,96];
  for(let index=0;index<expected.length;index++){
    const state=ensureLaserState(createWeaponState(LASER_MUSKET));
    for(let k=0;k<=index;k++){
      assert.equal(startLaserCrank(state).status,'started');
      finishCrank(state);
    }
    const result=fireChargedLaser(state,LASER_MUSKET,()=>.5);
    assert.equal(result.damage,expected[index]);
    assert.ok(result.damage<=96);
  }
});
