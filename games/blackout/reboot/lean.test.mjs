import test from "node:test";
import assert from "node:assert/strict";
import {LEAN_ROLL,LEAN_SHIFT,toggleLean,smoothLean,leanCameraPose} from "./lean.js";

test("Q/E lean persists and pressing the same key again returns upright",()=>{
 let target=toggleLean(0,-1);
 assert.equal(target,-1);
 assert.equal(toggleLean(target,-1),0);
 assert.equal(toggleLean(target,1),1);
 assert.equal(toggleLean(1,0),0);
});
test("lean eases toward the target and reverses without overshooting",()=>{
 let amt=0;
 for(let i=0;i<90;i++)amt=smoothLean(amt,-1,1/60);
 assert.ok(Math.abs(amt+1)<.001);
 amt=smoothLean(amt,1,1/60);
 assert.ok(amt>-1&&amt<1);
});
test("camera offset follows yaw; leaning rolls instead of changing shot heading",()=>{
 let left=leanCameraPose(0,-1),right=leanCameraPose(0,1);
 assert.equal(left.dx,-LEAN_SHIFT);
 assert.equal(right.dx,LEAN_SHIFT);
 assert.equal(left.dz,0);
 assert.equal(left.roll,LEAN_ROLL);
 assert.equal(right.roll,-LEAN_ROLL);
 const rotated=leanCameraPose(Math.PI/2,1);
 assert.ok(Math.abs(rotated.dx)<1e-10);
 assert.ok(Math.abs(rotated.dz+LEAN_SHIFT)<1e-10);
});
test("lean offset fits inside player radius to reduce wall-camera clipping",()=>{
 assert.ok(LEAN_SHIFT<.34);
 assert.ok(LEAN_ROLL<Math.PI/8);
 for(const amt of [-10,-1,-.5,0,.5,1,10]){
  const p=leanCameraPose(.4,amt);
  assert.ok(Math.hypot(p.dx,p.dz)<=LEAN_SHIFT+1e-9);
 }
});
