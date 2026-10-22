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
 assert.equal(PLANT_RECORDING.confirmationSeconds-PLANT_RECORDING.startSeconds,
  BOMB_RULES.plantSeconds);
 const active={mode:"bomb",phase:"action"};
 assert.equal(plantRecordingStage(active,"plant"),"typing");
 assert.equal(plantRecordingStage(active,null),"off");
 assert.equal(plantRecordingStage({...active,phase:"prep"},"plant"),"off");
 assert.equal(plantRecordingStage({...active,phase:"postplant"},null),"global");
 assert.equal(plantRecordingStage({...active,phase:"ended"},null),"off");
});
test("canceling F cuts sound and the next plant restarts",()=>{
 const sound=fakeAudio(),recording=createPlantRecording(sound);
 recording.sync("typing");
 assert.equal(sound.currentTime,PLANT_RECORDING.startSeconds);
 assert.equal(sound.paused,false);
 assert.equal(sound.playbackRate,1); // Typing now takes seven natural seconds.
 recording.sync("off");
 assert.equal(sound.paused,true);
 assert.equal(sound.currentTime,PLANT_RECORDING.startSeconds);
 recording.sync("typing");
 assert.equal(sound.paused,false);
 assert.equal(sound.currentTime,PLANT_RECORDING.startSeconds);
});
test("success rolls into full-volume global beeps without restarting audio",()=>{
 const sound=fakeAudio(),recording=createPlantRecording(sound);
 recording.sync("typing");
 sound.currentTime=8.4;
 const playsBefore=sound.events.filter(event=>event==="play").length;
 recording.sync("global");
 assert.equal(sound.currentTime,PLANT_RECORDING.confirmationSeconds);
 assert.equal(sound.playbackRate,1);
 assert.equal(sound.volume,PLANT_RECORDING.globalVolume);
 assert.equal(sound.paused,false);
 assert.equal(sound.events.filter(event=>event==="play").length,playsBefore);
 recording.sync("global");
 assert.equal(sound.events.filter(event=>event==="play").length,playsBefore);
 recording.sync("off");
 assert.equal(sound.paused,true);
});
test("pause on mouse unlock, then resume global audio without seeking",()=>{
 const sound=fakeAudio(),recording=createPlantRecording(sound);
 recording.sync("global");
 sound.currentTime=24;
 recording.pause();
 assert.equal(sound.paused,true);
 recording.resume();
 assert.equal(sound.paused,false);
 assert.equal(sound.currentTime,24);
});
