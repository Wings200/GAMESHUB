import test from "node:test";
import assert from "node:assert/strict";
import {aimState,firstHitType} from "./aim-resolver.js";
import {legacyShotCone} from "./legacy-shooting.js";

test("holding right mouse gives precise zero-spread bullets even during first ADS frames",()=>{
 for(const blend of [0,.1,.5,.8,.994,.995,1]){
  const stance=aimState(true,blend);
  assert.equal(stance.accurate,true);
  assert.deepEqual(legacyShotCone({spread:.18},{aligned:stance.accurate},()=>.27),
   {x:0,y:0,spread:0});
  assert.equal(stance.reticleVisible,blend>=.995);
 }
});
test("hipfire remains inaccurate and visible when RMB is released",()=>{
 for(const blend of [0,.5,1]){
  const state=aimState(false,blend);
  assert.equal(state.accurate,false);
  assert.equal(state.reticleVisible,false);
  assert.equal(state.hipCrosshairVisible,true);
  assert.ok(legacyShotCone({spread:.18},{aligned:state.accurate},()=>.5).spread>0);
 }
});
test("a nearer solid wall blocks the target even if the target is behind it",()=>{
 const wall={object:{userData:{physicsObstacleId:"box-one"}}};
 const target={object:{userData:{targetId:"dummy-4"}}};
 const state=firstHitType([wall,target],[{id:"dummy-4"}]);
 assert.equal(state.kind,"blocked");
 assert.equal(state.obstacle,"box-one");
});
test("actual hit mesh or its child takes priority when closest",()=>{
 const obj={userData:{},parent:{userData:{targetId:"dummy-1"}}};
 const target={id:"dummy-1"};
 const state=firstHitType([{object:obj},{object:{userData:{physicsObstacleId:"wall-one"}}}],[target]);
 assert.equal(state.kind,"target");
 assert.equal(state.target,target);
 assert.equal(firstHitType([],[]).kind,"miss");
});
