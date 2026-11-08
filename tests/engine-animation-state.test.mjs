import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseLocomotionClip} from '../engine/animation-state.mjs';

const all=new Set(['idle','walk','run','jump','fall']);

test('idle, walking, sprinting, jumping and falling select distinct reusable clips',()=>{
  assert.equal(chooseLocomotionClip({speed:0},all),'idle');
  assert.equal(chooseLocomotionClip({speed:.2},all),'walk');
  assert.equal(chooseLocomotionClip({speed:4.9},all),'walk');
  assert.equal(chooseLocomotionClip({speed:5},all),'run');
  assert.equal(chooseLocomotionClip({speed:0,grounded:false,verticalSpeed:3},all),'jump');
  assert.equal(chooseLocomotionClip({speed:7,grounded:false,verticalSpeed:-1},all),'fall');
  assert.equal(chooseLocomotionClip({speed:0,grounded:false,verticalSpeed:0},all),'fall');
});

test('available clips gracefully fall back for partial rigs',()=>{
  assert.equal(chooseLocomotionClip({speed:7},['idle','walk']),'walk');
  assert.equal(chooseLocomotionClip({speed:0,grounded:false,verticalSpeed:2},['idle']),'idle');
  assert.equal(chooseLocomotionClip({speed:0,grounded:false,verticalSpeed:-2},['jump']),'jump');
  assert.equal(chooseLocomotionClip({speed:7},[]),null);
});

test('locomotion thresholds can be customized without changing the controller',()=>{
  assert.equal(chooseLocomotionClip({speed:2},all,{walkThreshold:.1,runThreshold:1.5}),'run');
  assert.equal(chooseLocomotionClip({speed:1.2},all,{walkThreshold:.5,runThreshold:3}),'walk');
});

test('bad speeds, thresholds and airborne data fail before changing animation actions',()=>{
  assert.throws(()=>chooseLocomotionClip({speed:NaN},all),/Invalid locomotion/);
  assert.throws(()=>chooseLocomotionClip({speed:-1},all),/Invalid locomotion/);
  assert.throws(()=>chooseLocomotionClip({grounded:'yes'},all),/grounded/);
  assert.throws(()=>chooseLocomotionClip({speed:1},all,{walkThreshold:5,runThreshold:2}),/Invalid locomotion/);
  assert.throws(()=>chooseLocomotionClip({verticalSpeed:Infinity},all),/Invalid locomotion/);
});
