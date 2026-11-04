import test from 'node:test';
import assert from 'node:assert/strict';
import {reloadVisualState,reloadPoseForWeapon,slideTravel,createCasingState,stepCasing,CASING_TUNING} from './weapon-handling.mjs';

test('Inactive reload has a fully inserted magazine and no hand animation',()=>{
  const idle=reloadVisualState(0);
  assert.equal(idle.active,false);
  assert.equal(idle.magazineOffset,0);
  assert.equal(idle.slideOffset,0);
  assert.equal(idle.handVisible,false);
});
test('Reload removes magazine, inserts it and racks the slide in order',()=>{
  const at=p=>reloadVisualState(1.65*(1-p));
  const a=at(.1),b=at(.4),c=at(.7),d=at(.87),e=at(.99);
  assert.ok(a.magazineOffset<b.magazineOffset);
  assert.ok(b.magazineOffset>c.magazineOffset,'magazine returns on insertion');
  assert.ok(c.magazineOffset>e.magazineOffset);
  assert.ok(d.slideOffset>.08,'slide racks near the end');
  assert.equal(e.slideOffset,0,'slide fully returns to battery');
  assert.equal(e.magazineOffset,0,'magazine is seated');
  assert.equal(d.handVisible,true);
});
test('Slide cycles and settles after firing, even at zero/negative time',()=>{
  assert.equal(slideTravel(0),0);
  assert.equal(slideTravel(-1),0);
  assert.ok(slideTravel(.065)>.10);
  assert.ok(Math.abs(slideTravel(.13))<1e-9);
});
test('Ejected brass arcs rightward, bounces and comes to rest on floor',()=>{
  const origin={x:0,y:1.7,z:0};
  const brass=createCasingState(origin,{x:1,z:0},{x:0,z:-1},()=>.5);
  assert.ok(brass.vx>2);
  assert.ok(brass.vy>0);
  let peak=origin.y;
  for(let i=0;i<360;i++){stepCasing(brass,1/60,0);peak=Math.max(peak,brass.y);}
  assert.ok(peak>origin.y+.12);
  assert.equal(brass.settled,true);
  assert.ok(Math.abs(brass.y-.028)<.0001);
  assert.ok(brass.x>0);
});
test('Casing step clamps unusual deltas to prevent physics explosions',()=>{
  const b=createCasingState({x:0,y:1,z:0},{x:1,z:0},{x:0,z:1},()=>.5);
  stepCasing(b,-10,0);
  assert.equal(b.age,0);
  stepCasing(b,10,0);
  assert.ok(b.age<=.05);
  assert.equal(CASING_TUNING.maxVisible,38);
});

test('Six guns have different reload trajectories appropriate to their actions',()=>{
  const ids=['scrap-pistol','iron-revolver','pipe-smg','service-carbine',
    'scrap-shotgun','hunting-rifle'];
  const poses=ids.map(id=>reloadPoseForWeapon(id,.5,1));
  assert.equal(new Set(poses.map(p=>p.style)).size,6);
  assert.ok(poses[0].magazineOffset>0&&poses[0].cylinderOpen===0);
  assert.ok(poses[1].cylinderOpen>.8&&poses[1].magazineVisible===false);
  assert.ok(poses[2].magazineOffset>poses[3].magazineOffset);
  assert.equal(poses[4].magazineVisible,false);
  assert.ok(poses[4].roundVisible&&poses[4].roundIndex>=0);
  assert.ok(poses[5].boltOffset>.05&&poses[5].roundVisible);
});
test('Revolver opens cylinder, loads individual rounds, then closes',()=>{
  const at=p=>reloadPoseForWeapon('iron-revolver',1-p,1);
  assert.equal(at(.05).cylinderOpen,0);
  assert.ok(at(.5).cylinderOpen>.9);
  assert.equal(at(.5).roundVisible,true);
  assert.ok(at(.65).roundIndex>at(.43).roundIndex);
  assert.ok(at(.98).cylinderOpen<.01);
});
test('Shotgun shells load sequentially; hunting rifle cycles its bolt',()=>{
  const shot=p=>reloadPoseForWeapon('scrap-shotgun',1-p,1);
  const rifle=p=>reloadPoseForWeapon('hunting-rifle',1-p,1);
  assert.equal(shot(.5).roundVisible,true);
  assert.ok(shot(.7).roundIndex>shot(.3).roundIndex);
  assert.ok(shot(.93).pumpOffset>.05);
  assert.ok(rifle(.45).boltOffset>.1&&rifle(.45).boltHandleLift>.9);
  assert.ok(rifle(.75).roundIndex>rifle(.37).roundIndex);
  assert.equal(rifle(.99).boltOffset,0);
});
test('Reload endpoints settle all moving parts without affecting ammo',()=>{
  for(const id of ['scrap-pistol','iron-revolver','pipe-smg',
      'service-carbine','scrap-shotgun','hunting-rifle']){
    const pose=reloadPoseForWeapon(id,0,2);
    assert.equal(pose.active,false);
    assert.equal(pose.magazineOffset,0);
    assert.equal(pose.cylinderOpen,0);
    assert.equal(pose.boltOffset,0);
    assert.equal(pose.pumpOffset,0);
    assert.equal(pose.roundVisible,false);
  }
});

test('Ammo presentation respects an actual two-shell top-up instead of six phantom shells',()=>{
  const pose=reloadPoseForWeapon('scrap-shotgun',.25,1,2);
  assert.equal(pose.roundVisible,true);
  assert.ok(pose.roundIndex>=0&&pose.roundIndex<2);
  const rifle=reloadPoseForWeapon('hunting-rifle',.50,1,2);
  assert.ok(rifle.roundIndex>=0&&rifle.roundIndex<2);
  const revolver=reloadPoseForWeapon('iron-revolver',.50,1,1);
  assert.ok(revolver.roundIndex>=0&&revolver.roundIndex<1);
  assert.ok(revolver.cylinderSpin<Math.PI,
    'A one-cartridge top-up does not spin the whole cylinder twice');
});

test('Pipe pistol reload removes its side magazine before pulling charging bolt',()=>{
  const at=p=>reloadPoseForWeapon('pipe-pistol',1-p,1);
  assert.equal(at(.04).magazineOffset,0);
  assert.ok(at(.40).magazineOffset>.2);
  assert.ok(at(.70).magazineOffset<at(.40).magazineOffset);
  assert.ok(at(.87).slideOffset>.05);
  assert.equal(at(.99).magazineOffset,0);
  assert.equal(at(.99).slideOffset,0);
});
