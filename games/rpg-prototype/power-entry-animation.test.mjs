import test from 'node:test';
import assert from 'node:assert/strict';
import {powerEntryPose} from './power-entry-animation.mjs';

test('Power armor entry turns the real survivor toward the suit front',()=>{
  const origin={x:1,z:-2.8,yaw:0};
  const start=powerEntryPose('entering',0,origin);
  const turn=powerEntryPose('entering',.17,origin);
  const board=powerEntryPose('entering',.64,origin);
  const finish=powerEntryPose('entering',1,origin);
  assert.equal(start.x,1);assert.equal(start.z,-2.8);
  assert.ok(Math.abs(turn.yaw-Math.PI)<.00001);
  assert.equal(board.yaw,Math.PI);
  assert.ok(board.walking&&board.z>-1.94&&board.z<-.28);
  assert.equal(finish.z,-.28);assert.equal(finish.walking,false);
  assert.equal(finish.hatch,0);
});
test('Pilot never floats: root feet remain at floor level throughout entry and exit',()=>{
  for(const phase of ['entering','exiting'])
    for(let i=0;i<=100;i++){
      const pose=powerEntryPose(phase,i/100,{x:.8,z:-3,yaw:.5});
      assert.equal(pose.y,0);
      assert.ok(Number.isFinite(pose.x)&&Number.isFinite(pose.z));
      assert.ok(pose.hatch>=0&&pose.hatch<=1);
    }
});
test('Exit faces the rear before walking out, then ends behind the hatch',()=>{
  const early=powerEntryPose('exiting',.08),turn=powerEntryPose('exiting',.19);
  const mid=powerEntryPose('exiting',.50),end=powerEntryPose('exiting',1);
  assert.ok(early.yaw>0&&early.yaw<Math.PI);
  assert.ok(Math.abs(turn.yaw)<.001);
  assert.ok(mid.walking&&mid.z<-.28&&mid.z>-2.35);
  assert.equal(end.z,-2.35);assert.equal(end.yaw,0);
});
test('No motion in idle phase and invalid progress remains bounded',()=>{
  assert.deepEqual(powerEntryPose('idle',.5),{x:0,y:0,z:-.28,yaw:Math.PI,
    walking:false,walkSpeed:0,step:0,hatch:0,brace:0,seated:true});
  const pose=powerEntryPose('entering',Infinity);
  assert.ok(Number.isFinite(pose.z)&&Number.isFinite(pose.yaw));
});

test('Boarding steps advance with world-space distance and never lift the body root',()=>{
  const origin={x:.4,z:-2.75,yaw:0};
  const first=powerEntryPose('entering',.41,origin);
  const later=powerEntryPose('entering',.66,origin);
  assert.ok(first.walking&&later.walking);
  assert.ok(later.distance>first.distance);
  assert.ok(later.footPhase>first.footPhase);
  assert.ok(Math.abs((later.footPhase-first.footPhase)-
    (later.distance-first.distance)*Math.PI*2/.84)<.000001);
  assert.equal(first.y,0);assert.equal(later.y,0);
  const exit=powerEntryPose('exiting',.57);
  assert.ok(exit.footPhase>0&&exit.walking);
});
