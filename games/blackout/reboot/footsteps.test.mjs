import test from "node:test";
import assert from "node:assert/strict";
import {newFootstepTracker,advanceFootsteps,STEP_LENGTH,FootstepAudio} from "./footsteps.js";

function at(x,overrides={}){return {x,z:0,grounded:true,crouched:false,sprinting:false,vy:0,...overrides};}
test("footsteps trigger from actual displacement and alternate feet",()=>{
 let tracker=newFootstepTracker(),r=advanceFootsteps(tracker,at(0),at(.07));
 assert.deepEqual(r.events,[{type:"step",gait:"walk",foot:0}]);tracker=r.tracker;
 r=advanceFootsteps(tracker,at(.07),at(.07+STEP_LENGTH.walk+.05));
 assert.deepEqual(r.events,[{type:"step",gait:"walk",foot:1}]);
});
test("stopping or pushing against a wall never creates repeated footsteps",()=>{
 let r=advanceFootsteps(newFootstepTracker(),at(0),at(.1));
 for(let i=0;i<100;i++){
  r=advanceFootsteps(r.tracker,at(.1),at(.1));
  assert.deepEqual(r.events,[]);
 }
 assert.equal(r.tracker.active,false);
});
test("crouch and sprint use separate strides",()=>{
 let p=at(0),s=at(.1,{sprinting:true}),r=advanceFootsteps(newFootstepTracker(),p,s);
 assert.equal(r.events[0].gait,"sprint");
 assert.ok(STEP_LENGTH.sprint>STEP_LENGTH.walk);
 r=advanceFootsteps(newFootstepTracker(),p,at(.1,{crouched:true}));
 assert.equal(r.events[0].gait,"crouch");
});
test("prone crawling uses a quieter separate gait without interrupting crouch footsteps",()=>{
 const p=at(0),crawl=at(.1,{prone:true});
 const r=advanceFootsteps(newFootstepTracker(),p,crawl);
 assert.deepEqual(r.events,[{type:"step",gait:"prone",foot:0}]);
 assert.ok(STEP_LENGTH.prone<STEP_LENGTH.crouch);
 const next=advanceFootsteps(r.tracker,crawl,at(.2,{crouched:true}));
 assert.equal(next.events.length,0,"switching stances does not fake a step");
});
test("airborne movement is silent; landing generates one thump",()=>{
 let r=advanceFootsteps(newFootstepTracker(),at(0),at(.1,{grounded:false,vy:4}));
 assert.deepEqual(r.events,[]);
 r=advanceFootsteps(r.tracker,at(.1,{grounded:false,vy:-5}),at(.2));
 assert.equal(r.events.length,1);
 assert.equal(r.events[0].type,"land");
 r=advanceFootsteps(r.tracker,at(.2),at(.2));
 assert.deepEqual(r.events,[]);
});
test("audio object does not instantiate AudioContext until user interaction",()=>{
 const audio=new FootstepAudio();
 assert.equal(audio.context,null);
 assert.equal(audio.toggleMute(),true);
 assert.equal(audio.toggleMute(),false);
});
