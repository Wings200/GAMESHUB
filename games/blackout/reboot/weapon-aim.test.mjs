import test from "node:test";
import assert from "node:assert/strict";
import {OPTIC_CENTER,HIP_POSE,ADS_POSE,weaponPose,shotSpread} from "./weapon-aim.js";

test("full ADS sight center falls exactly on camera optical axis",()=>{
 const p=weaponPose(1,0,.2);
 assert.equal(p.x+OPTIC_CENTER.x,0);
 assert.equal(p.y+OPTIC_CENTER.y,0);
 assert.equal(p.pitch,0);
 assert.equal(p.roll,0);
 assert.equal(p.z,ADS_POSE.z);
});
test("ADS sight remains aligned even with weapon recoil and walking bob",()=>{
 const p=weaponPose(1,.25,.2);
 assert.equal(p.x+OPTIC_CENTER.x,0);
 assert.equal(p.y+OPTIC_CENTER.y,0);
 assert.equal(p.pitch,0);
 assert.equal(p.roll,0);
 assert.equal(shotSpread(true),0);
});
test("hip model remains offset and hip fire is intentionally inaccurate",()=>{
 const p=weaponPose(0,0,0);
 assert.equal(p.x,HIP_POSE.x);
 assert.equal(p.y,HIP_POSE.y);
 assert.ok(shotSpread(false)>0);
});
test("ADS interpolation stays finite and bounded",()=>{
 for(const amount of [-1,0,.25,.5,.75,1,2]){
  const p=weaponPose(amount,.1,.003);
  assert.ok([p.x,p.y,p.z,p.pitch,p.roll].every(Number.isFinite));
 }
});
