import assert from "node:assert/strict";
import {test} from "node:test";
import {createPlantRecording,createDefuseRecording,createDefuserCuePlayer,plantRecordingStage,
 PLANT_RECORDING} from "./bomb-plant-audio.js";
import {BOMB_RULES} from "./bomb-round.js";

function fakeAudio(){
 const events=[],listeners={};
 return {events,listeners,paused:true,ended:false,currentTime:0,playbackRate:1,volume:0,
  addEventListener(event,fn){listeners[event]=fn;},
  play(){events.push("play");this.paused=false;return Promise.resolve();},
  pause(){events.push("pause");this.paused=true;}};
}

test("original foley duration matches actual round planting and independent clock",()=>{
 assert.equal(PLANT_RECORDING.plantSeconds,BOMB_RULES.plantSeconds);
 assert.ok(PLANT_RECORDING.typingVolume>.7);
 assert.ok(PLANT_RECORDING.disablingVolume>.6);
 const active={mode:"bomb",phase:"action"};
 assert.equal(plantRecordingStage(active,"plant"),"typing");
 assert.equal(plantRecordingStage(active,null),"off");
 assert.equal(plantRecordingStage({...active,phase:"prep"},"plant"),"off");
 assert.equal(plantRecordingStage({...active,phase:"postplant"},null),"global");
 assert.equal(plantRecordingStage({...active,phase:"ended"},null),"off");
 assert.equal(plantRecordingStage({...active,phase:"ended",
  defuser:{status:"planted"}},null),"global");
 assert.equal(plantRecordingStage({...active,phase:"ended",winner:"defend",
  defuser:{status:"planted"}},null),"off");
});

test("cancelling a plant stops recorded foley, resets seek and permits retry",()=>{
 const media=fakeAudio(),audio=createPlantRecording(media);
 audio.sync("typing");
 assert.equal(audio.stage,"typing");
 assert.equal(media.paused,false);
 assert.equal(media.volume,PLANT_RECORDING.typingVolume);
 media.currentTime=2.8;
 audio.sync("off");
 assert.equal(media.paused,true);
 assert.equal(media.currentTime,0);
 audio.sync("typing");
 assert.equal(media.paused,false);
 assert.equal(media.events.filter(e=>e==="play").length,2);
});

test("plant success stops typing; global state does NOT start another MP3",()=>{
 const media=fakeAudio(),audio=createPlantRecording(media);
 audio.sync("typing");
 media.currentTime=7.30;
 audio.sync("global");
 assert.equal(media.paused,true);
 assert.equal(media.currentTime,0);
 assert.equal(audio.stage,"global");
 audio.sync("global");
 audio.resume();
 assert.equal(media.events.filter(e=>e==="play").length,1,
  "beeps and arm confirmation come only from game-clock events");
});

test("pointer lock pause/resume affects typing only, not post-plant clock",()=>{
 const media=fakeAudio(),audio=createPlantRecording(media);
 audio.sync("typing");
 media.currentTime=3.4;
 audio.pause();
 assert.equal(media.paused,true);
 audio.resume();
 assert.equal(media.paused,false);
 assert.equal(media.currentTime,3.4);
 audio.sync("global");
 audio.resume();
 assert.equal(media.paused,true);
});

test("counter-defuse tablet foley starts, cancels and cuts at defender victory",()=>{
 const media=fakeAudio(),audio=createDefuseRecording(media);
 audio.sync(true);
 assert.equal(audio.active,true);
 assert.equal(media.paused,false);
 assert.equal(media.volume,PLANT_RECORDING.disablingVolume);
 media.currentTime=5.1;
 audio.sync(false);
 assert.equal(audio.active,false);
 assert.equal(media.paused,true);
 assert.equal(media.currentTime,0);
 audio.sync(true);
 assert.equal(media.events.filter(e=>e==="play").length,2);
 audio.sync(false);
});

test("already completed counter-defuse clip never spontaneously restarts",()=>{
 const media=fakeAudio(),audio=createDefuseRecording(media);
 audio.sync(true);
 media.ended=true;media.paused=true;
 audio.resume();
 assert.equal(media.events.filter(e=>e==="play").length,1);
});

test("missing CC0 recording sets fallback flag without crashing gameplay",()=>{
 const media=fakeAudio(),audio=createDefuseRecording(media);
 media.listeners.error();
 assert.equal(audio.failed,true);
 audio.sync(true);
 assert.equal(media.events.filter(e=>e==="play").length,0);
});

test("independent recorded device cues create beats without synthesizer overlap",()=>{
 const arm=fakeAudio(),tick=fakeAudio(),urgent=fakeAudio(),shutdown=fakeAudio();
 const cues=createDefuserCuePlayer({arm,tick,urgent,shutdown});
 assert.equal(cues.play("arm"),true);
 assert.equal(arm.events.filter(e=>e==="play").length,1);
 assert.equal(cues.play("tick"),true);
 assert.equal(tick.paused,false);
 assert.equal(urgent.paused,true);
 tick.currentTime=.13;
 assert.equal(cues.play("tick"),true);
 assert.equal(tick.events.filter(e=>e==="play").length,2);
 assert.equal(tick.currentTime,0,"each beat restarts exactly at the attack");
 assert.equal(cues.play("urgent"),true);
 assert.equal(tick.paused,true,"urgency never doubles the device beep");
 assert.equal(urgent.paused,false);
 assert.equal(cues.play("shutdown"),true);
 assert.equal(arm.paused,true);
 assert.equal(urgent.paused,true);
 assert.equal(shutdown.paused,false);
 cues.reset();
 assert.equal(shutdown.paused,true);
});

test("missing rhythm sample falls back independently from all other recorded cues",()=>{
 const arm=fakeAudio(),tick=fakeAudio(),urgent=fakeAudio(),shutdown=fakeAudio();
 const cues=createDefuserCuePlayer({arm,tick,urgent,shutdown});
 tick.listeners.error();
 assert.equal(cues.failed("tick"),true);
 assert.equal(cues.play("tick"),false);
 assert.equal(cues.play("arm"),true);
 assert.equal(cues.play("urgent"),true);
 assert.equal(cues.play("shutdown"),true);
});
