import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveCapsule3D,BODY_HEIGHT,EYE_HEIGHT} from '../engine/collision-3d.js';

const at=(x,y=EYE_HEIGHT,z=0)=>({x,y,z});
const delta=(x=0,y=0,z=0)=>({x,y,z});
const box=(minX,maxX,minY,maxY,minZ=-2,maxZ=2)=>
  ({minX,maxX,minY,maxY,minZ,maxZ});

test('player cannot tunnel through a tall wall at high horizontal speed',()=>{
  const result=resolveCapsule3D(at(-3),delta(12),[box(0,1,0,4)]);
  assert.ok(result.blockedX);
  assert.ok(result.x<-0.33 && result.x> -0.5);
  assert.equal(result.y,EYE_HEIGHT);
});
test('an elevated wall no longer blocks somebody walking underneath',()=>{
  const overpass=box(-1,1,3.4,4);
  const result=resolveCapsule3D(at(-3),delta(6),[overpass]);
  assert.equal(result.blockedX,false);
  assert.ok(result.x>2.9);
});
test('falling lands on the top of an elevated slab, not the world ground',()=>{
  const slab=box(-2,2,1.7,2);
  const result=resolveCapsule3D(at(0,4.8),delta(0,-4),[slab]);
  assert.equal(result.y,2+EYE_HEIGHT);
  assert.equal(result.grounded,true);
  assert.equal(result.hitFloor,true);
});
test('walking off a high platform begins falling to ground',()=>{
  const slab=box(-1,1,1.7,2);
  const first=resolveCapsule3D(at(0,2+EYE_HEIGHT),delta(2,0),[slab]);
  assert.equal(first.grounded,false);
  const second=resolveCapsule3D(at(first.x,first.y,first.z),delta(0,-3),[slab]);
  assert.equal(second.y,EYE_HEIGHT);
  assert.equal(second.grounded,true);
});
test('jumping into a ceiling stops vertical motion without clipping',()=>{
  const roof=box(-3,3,3,3.35);
  const result=resolveCapsule3D(at(0),delta(0,5),[roof]);
  assert.equal(result.y,3-BODY_HEIGHT+EYE_HEIGHT);
  assert.equal(result.hitCeiling,true);
  assert.equal(result.grounded,false);
});
test('walk up a short step but remain blocked by tall platform',()=>{
  const short=box(.45,2,0,.2);
  const stepped=resolveCapsule3D(at(0),delta(1,0),[short]);
  assert.equal(stepped.blockedX,false);
  assert.ok(Math.abs(stepped.y-(EYE_HEIGHT+.2))<1e-5);
  assert.equal(stepped.grounded,true);
  const tall=resolveCapsule3D(at(0),delta(1),[box(.45,2,0,.7)]);
  assert.equal(tall.blockedX,true);
});
test('a player above a tall platform can land but walking into its side fails',()=>{
  const slab=box(.5,2,1,2);
  const atSide=resolveCapsule3D(at(0),delta(1),[slab]);
  assert.equal(atSide.blockedX,true);
  const above=resolveCapsule3D(at(1,3+EYE_HEIGHT),delta(0,-3),[slab]);
  assert.equal(above.y,2+EYE_HEIGHT);
});
test('vertical collision validates three-dimensional bounds',()=>{
  assert.throws(()=>resolveCapsule3D(at(0),delta(1),[
    {minX:0,maxX:1,minZ:0,maxZ:1}]),/min\/max X, Y and Z/);
  assert.throws(()=>resolveCapsule3D(at(0),delta(1),[box(2,1,0,1)]),/inverted/);
  assert.throws(()=>resolveCapsule3D(at(0),delta(NaN)),/Invalid 3D/);
});
