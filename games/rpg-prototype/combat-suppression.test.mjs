import test from 'node:test';
import assert from 'node:assert/strict';
import {projectileNearMiss} from './combat-suppression.mjs';
test('W19 bullets suppress only actors inside the actual projectile corridor',()=>{
  const origin={x:0,y:1.6,z:0},direction={x:1,y:0,z:0};
  assert.equal(projectileNearMiss(origin,direction,{x:12,y:1.25,z:.55}),true);
  assert.equal(projectileNearMiss(origin,direction,{x:12,y:1.25,z:4}),false);
  assert.equal(projectileNearMiss(origin,direction,{x:-12,y:1.25,z:.5}),false);
  assert.equal(projectileNearMiss(origin,direction,{x:96,y:1.25,z:0}),false);
});
test('Walls and actors block near-miss effects behind their first impact',()=>{
  const origin={x:0,y:1.6,z:0},direction={x:1,y:0,z:0};
  const target={x:11,y:1.4,z:.3};
  assert.equal(projectileNearMiss(origin,direction,target,{blockDistance:5}),false);
  assert.equal(projectileNearMiss(origin,direction,target,{blockDistance:17}),true);
  assert.equal(projectileNearMiss(origin,direction,target,{blockDistance:11}),false);
});
test('Invalid data and zero-length directions cannot trigger suppression',()=>{
  const p={x:0,y:0,z:0};
  assert.equal(projectileNearMiss(p,{x:0,y:0,z:0},p),false);
  assert.equal(projectileNearMiss(p,{x:NaN,y:0,z:1},p),false);
  assert.equal(projectileNearMiss(p,{x:1,y:0,z:0},p,{radius:NaN}),false);
});
