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
test("the win and loss stingers are original synthesized tones",()=>{
 const win=cue("round-win"),loss=cue("round-loss");
 assert.ok(win.filter(event=>event.kind==="tone").length>=4);
 assert.ok(loss.filter(event=>event.kind==="tone").length>=3);
 assert.notDeepEqual(win,loss);
});
test("proximity alert has two synthesized bursts within its retrigger window",()=>{
 const prox=cue("proximity"),tones=prox.filter(event=>event.kind==="tone");
 assert.equal(tones.length,8);
 assert.ok(prox.every(event=>["tone","noise"].includes(event.kind)));
 assert.ok(tones.every(event=>event.args[4]<3.25));
 assert.ok(tones.some(event=>event.args[4]>1.8));
});
