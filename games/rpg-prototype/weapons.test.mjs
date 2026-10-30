import test from 'node:test';
import assert from 'node:assert/strict';
import {SCRAP_PISTOL,createWeaponState,setWeaponAim,startWeaponReload,updateWeapon,fireWeapon,createViewRecoilState,kickViewRecoil,recoverViewRecoil} from './weapons.mjs';

test('Scrap pistol begins with a full magazine and fixed ammo reserve',()=>{
  const w=createWeaponState();
  assert.equal(w.magazine,12);
  assert.equal(w.reserve,48);
  assert.equal(w.reloadRemaining,0);
});
test('One shot consumes one round and cooldown stops extra rounds',()=>{
  const w=createWeaponState();
  assert.equal(fireWeapon(w,SCRAP_PISTOL,()=>.5).status,'fired');
  assert.equal(w.magazine,11);
  assert.equal(fireWeapon(w).status,'cooldown');
  assert.equal(w.magazine,11);
  updateWeapon(w,SCRAP_PISTOL.fireInterval);
  assert.equal(fireWeapon(w).status,'fired');
  assert.equal(w.magazine,10);
});
test('Empty pistol cannot shoot or magically create ammunition',()=>{
  const w=createWeaponState();w.magazine=0;w.reserve=0;
  assert.equal(fireWeapon(w).status,'empty');
  assert.equal(startWeaponReload(w),false);
  assert.equal(w.magazine,0);
});
test('Reload must complete and transfers only available reserve ammo',()=>{
  const w=createWeaponState();w.magazine=4;w.reserve=3;
  assert.equal(startWeaponReload(w),true);
  assert.equal(startWeaponReload(w),false);
  assert.equal(fireWeapon(w).status,'reloading');
  updateWeapon(w,1);
  assert.equal(w.magazine,4);
  updateWeapon(w,.66);
  assert.equal(w.magazine,7);assert.equal(w.reserve,0);
});
test('Cannot reload a full magazine or an already reloading weapon',()=>{
  const w=createWeaponState();
  assert.equal(startWeaponReload(w),false);
  w.magazine=11;
  assert.equal(startWeaponReload(w),true);
  assert.equal(startWeaponReload(w),false);
  updateWeapon(w,2);
  assert.equal(w.magazine,12);
  assert.equal(w.reserve,47);
});
test('Aiming down sights produces tighter spread than hipfiring',()=>{
  const hip=createWeaponState(),ads=createWeaponState();
  setWeaponAim(ads,true);
  const rng=()=>.5;
  const a=fireWeapon(hip,SCRAP_PISTOL,rng);
  const b=fireWeapon(ads,SCRAP_PISTOL,rng);
  assert.equal(a.status,'fired');assert.equal(b.status,'fired');
  assert.ok(Math.hypot(a.spreadX,a.spreadY)>Math.hypot(b.spreadX,b.spreadY));
});
test('Time-step cannot become negative or duplicate completed reload',()=>{
  const w=createWeaponState();w.magazine=5;
  startWeaponReload(w);
  updateWeapon(w,10);
  assert.equal(w.magazine,12);assert.equal(w.reserve,41);
  updateWeapon(w,10);
  assert.equal(w.reserve,41);
  assert.equal(w.reloadRemaining,0);
  assert.equal(w.cooldown,0);
});
test('Firing sequence cannot exceed current magazine capacity',()=>{
  const w=createWeaponState();let fired=0;
  for(let i=0;i<20;i++){
    if(fireWeapon(w).status==='fired')fired++;
    updateWeapon(w,.25);
  }
  assert.equal(fired,12);
  assert.equal(w.magazine,0);
  assert.equal(w.shotsFired,12);
});

test('Camera pitch-only recoil recovers to the original aim after one shot',()=>{
  const recoil=createViewRecoilState();const before=.2;
  let pitch=kickViewRecoil(recoil,before,SCRAP_PISTOL.recoilDegrees);
  assert.ok(pitch<before);
  for(let i=0;i<180;i++)pitch=recoverViewRecoil(recoil,pitch,1/60);
  assert.ok(Math.abs(pitch-before)<.00001);
  assert.equal(recoil.unrecovered,0);
});
test('Repeated rapid shots cannot create a permanent camera offset',()=>{
  const recoil=createViewRecoilState();const before=-.12;
  let pitch=before;
  for(let i=0;i<12;i++){
    pitch=kickViewRecoil(recoil,pitch,SCRAP_PISTOL.recoilDegrees);
    pitch=recoverViewRecoil(recoil,pitch,.08);
  }
  assert.ok(recoil.unrecovered>0 && recoil.unrecovered<=.14000001);
  for(let i=0;i<240;i++)pitch=recoverViewRecoil(recoil,pitch,1/60);
  assert.ok(Math.abs(pitch-before)<.00001);
  assert.equal(recoil.unrecovered,0);
});
test('Recoil handles extreme pitch without flipping the view and ignores bad delta time',()=>{
  const recoil=createViewRecoilState();const almostUp=-Math.PI/2+.035;
  const kicked=kickViewRecoil(recoil,almostUp,1.25);
  assert.equal(kicked,almostUp);assert.equal(recoil.unrecovered,0);
  assert.equal(recoverViewRecoil(recoil,almostUp,-1),almostUp);
});
