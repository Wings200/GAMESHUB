import test from 'node:test';
import assert from 'node:assert/strict';
import {reloadVisualState,slideTravel,createCasingState,stepCasing,CASING_TUNING} from './weapon-handling.mjs';

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
