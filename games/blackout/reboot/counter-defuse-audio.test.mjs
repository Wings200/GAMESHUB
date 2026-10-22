import test from "node:test";
import assert from "node:assert/strict";
import {GameAudio} from "./legacy-audio.js";

function cue(name){
 const audio=new GameAudio(),events=[];
 audio.tone=(...args)=>events.push({kind:"tone",args});
 audio.noise=(...args)=>events.push({kind:"noise",args});
 audio.playEvent(name);
 return events;
}

test("repeating defender tablet touches are mechanical, never a second beep",()=>{
 const taps=cue("defuse-key");
 assert.ok(taps.length>=2);
 assert.ok(taps.every(event=>event.kind==="noise"));
 assert.ok(cue("defuser-tick").some(event=>event.kind==="tone"),
  "the planted device owns the one repeating electronic beep");
});
test("counter-defuse has a distinct pickup and shutdown cue",()=>{
 assert.ok(cue("defuser-disabling").some(event=>event.kind==="noise"));
 assert.ok(cue("defuse").some(event=>event.kind==="noise"));
});
