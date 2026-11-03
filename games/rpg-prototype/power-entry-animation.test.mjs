import test from 'node:test';
import assert from 'node:assert/strict';
import {powerEntryPose,POWER_BOARDING} from './power-entry-animation.mjs';

test('pilot stands behind, turns to face +Z, then climbs actual treads',()=>{
  const origin={x:.4,z:-2.7,yaw:0};
  const at=t=>powerEntryPose('entering',t,origin);
  assert.equal(at(0).z,origin.z);
  assert.equal(at(0).y,0);
  assert.ok(at(.18).hatch>.7);
  assert.ok(Math.abs(at(.20).yaw-Math.PI)<1e-6);
  for(const [t,expectedZ,expectedY] of [
    [.49,POWER_BOARDING.low.z,POWER_BOARDING.low.y],
    [.64,POWER_BOARDING.high.z,POWER_BOARDING.high.y],
    [.81,POWER_BOARDING.cabin.z,POWER_BOARDING.cabin.y]
  ]){
    const pose=at(t);
    assert.ok(Math.abs(pose.z-expectedZ)<1e-7,JSON.stringify(pose));
    assert.ok(Math.abs(pose.y-expectedY)<1e-7,JSON.stringify(pose));
    assert.ok(pose.hatch>.98,'hatch must be open while stepping');
  }
  assert.equal(at(1).hatch,0);
});
test('entry never slides through the shut rear hatch or drops under a tread',()=>{
  for(let i=0;i<=1000;i++){
    const t=i/1000,p=powerEntryPose('entering',t,{x:.85,z:-3.2,yaw:.35});
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(p.y));
    assert.ok(p.y>=0&&p.y<=POWER_BOARDING.cabin.y);
    assert.ok(p.z>=-3.2&&p.z<=POWER_BOARDING.cabin.z);
    if(p.z>-1.9&&t<.87)assert.ok(p.hatch>.99,'moving into frame requires open hatch at t='+t);
    assert.ok(p.footLifts.every(v=>v>=0&&v<=.241));
  }
});
test('exit walks FORWARD toward -Z, descends both steps and clears hatch',()=>{
  const at=t=>powerEntryPose('exiting',t);
  assert.equal(at(0).y,POWER_BOARDING.cabin.y);
  assert.ok(Math.abs(at(.23).yaw)<.00001);
  for(const [t,z,y] of [[.45,POWER_BOARDING.high.z,POWER_BOARDING.high.y],
    [.60,POWER_BOARDING.low.z,POWER_BOARDING.low.y],[.77,-1.93,0],
    [1,POWER_BOARDING.rearExit,0]]){
    assert.ok(Math.abs(at(t).z-z)<1e-7,'z '+t);
    assert.ok(Math.abs(at(t).y-y)<1e-7,'y '+t);
  }
  assert.equal(at(1).yaw,0);
  assert.equal(at(1).walking,false);
});
test('separate legs lift for each step and planted foot stays down',()=>{
  for(const [t,index] of [[.41,0],[.56,1],[.72,0]]){
    const p=powerEntryPose('entering',t);
    assert.ok(p.footLifts[index]>.05);
    assert.equal(p.footLifts[1-index],0);
    assert.ok(p.walking);
  }
});
test('invalid time is bounded and idle pose stays inside cabin',()=>{
  const p=powerEntryPose('entering',Infinity);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z));
  assert.equal(powerEntryPose('idle',.5).seated,true);
  assert.equal(powerEntryPose('idle',.5).hatch,0);
});
