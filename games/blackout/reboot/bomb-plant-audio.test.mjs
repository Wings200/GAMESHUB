import assert from "node:assert/strict";
import {test} from "node:test";
import {createPlantRecording,plantRecordingStage,PLANT_RECORDING} from "./bomb-plant-audio.js";
import {BOMB_RULES} from "./bomb-round.js";

function fakeAudio(){
 const events=[];
 return {events,paused:true,currentTime:0,playbackRate:1,volume:0,
  addEventListener(){},
  play(){events.push("play");this.paused=false;return Promise.resolve();},
  pause(){events.push("pause");this.paused=true;}};
}
test("only an actual hold-F planting interaction starts the recording",()=>{
 assert.equal(PLANT_RECORDING.plantSeconds,BOMB_RULES.plantSeconds);
 assert.ok(Math.abs(PLANT_RECORDING.plantSeconds-(8.65-1.30))<.001);
 const active={mode:"bomb",phase:"action"};
 assert.equal(plantRecordingStage(active,"plant"),"typing");
 assert.equal(plantRecordingStage(active,null),"off");
 assert.equal(plantRecordingStage({...active,phase:"prep"},"plant"),"off");
 assert.equal(plantRecordingStage({...active,phase:"postplant"},null),"global");
 assert.equal(plantRecordingStage({...active,phase:"ended"},null),"off");
 assert.equal(plantRecordingStage({...active,phase:"ended",
  defuser:{status:"planted"}},null),"global");
});
test("canceling F cuts sound and the next plant restarts",()=>{
 const sound=fakeAudio(),armed=fakeAudio();
 const recording=createPlantRecording(sound,armed);
 recording.sync("typing");
 assert.equal(sound.currentTime,0);
 assert.equal(sound.paused,false);
 assert.equal(armed.paused,true);
 assert.equal(sound.playbackRate,1);
 sound.currentTime=2.8;
 recording.sync("off");
 assert.equal(sound.paused,true);
 assert.equal(sound.currentTime,0);
 assert.equal(armed.paused,true);
 recording.sync("typing");
 assert.equal(sound.paused,false);
 assert.equal(sound.currentTime,0);
});
test("success immediately starts the trimmed woo-woo and beeps, never replays typing",()=>{
 const sound=fakeAudio(),armed=fakeAudio();
 const recording=createPlantRecording(sound,armed);
 recording.sync("typing");
 sound.currentTime=7.3;
 const playsBefore=sound.events.filter(event=>event==="play").length;
 recording.sync("global");
 assert.equal(sound.paused,true);
 assert.equal(sound.currentTime,0);
 assert.equal(armed.currentTime,0);
 assert.equal(armed.volume,PLANT_RECORDING.globalVolume);
 assert.equal(armed.paused,false);
 assert.equal(sound.events.filter(event=>event==="play").length,playsBefore);
 recording.sync("global");
 assert.equal(sound.events.filter(event=>event==="play").length,playsBefore);
 assert.equal(armed.events.filter(event=>event==="play").length,1);
 recording.sync("off");
 assert.equal(sound.paused,true);
 assert.equal(armed.paused,true);
});
test("pause on mouse unlock, then resume global audio without seeking",()=>{
 const sound=fakeAudio(),armed=fakeAudio(),recording=createPlantRecording(sound,armed);
 recording.sync("global");
 armed.currentTime=24;
 recording.pause();
 assert.equal(armed.paused,true);
 recording.resume();
 assert.equal(armed.paused,false);
 assert.equal(armed.currentTime,24);
});
test("ended global audio is never restarted after the recording finishes",()=>{
 const sound=fakeAudio(),armed=fakeAudio();
 let onEnded=null;
 armed.addEventListener=(name,fn)=>{if(name==="ended")onEnded=fn;};
 const recording=createPlantRecording(sound,armed);
 recording.sync("global");
 armed.currentTime=45;
 onEnded();
 armed.paused=true;
 recording.resume();
 assert.equal(armed.events.filter(event=>event==="play").length,1);
 assert.equal(armed.currentTime,45);
 recording.sync("off");
 assert.equal(armed.currentTime,0);
});
