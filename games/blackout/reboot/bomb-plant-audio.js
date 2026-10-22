// BLACKOUT V0.25.4 · a single recording bridges planting and post-plant.
// Timings are tunable against the supplied Defuse.mp3 without touching rules.
export const PLANT_RECORDING=Object.freeze({
 startSeconds:1.5,confirmationSeconds:8.5,plantSeconds:7,
 typingVolume:.56,globalVolume:.96
});

export function plantRecordingStage(state,interaction){
 if(state?.mode!=="bomb"||state.phase==="ended")return "off";
 if(state.phase==="postplant")return "global";
 return state.phase==="action"&&interaction==="plant"?"typing":"off";
}

export function createPlantRecording(audio,config=PLANT_RECORDING){
 let stage="off",failed=false;
 audio.preload="auto";
 audio.volume=config.typingVolume;
 audio.addEventListener?.("error",()=>{failed=true;});
 function seek(seconds){
  try{audio.currentTime=seconds;}catch(error){
   // Some browsers defer seeks until metadata has loaded.
   audio.addEventListener?.("loadedmetadata",()=>{
    try{audio.currentTime=seconds;}catch{}
   },{once:true});
  }
 }
 function play(){
  if(failed)return;
  try{
   const pending=audio.play();
   if(pending?.catch)pending.catch(error=>{
    failed=true;
    console.warn("BLACKOUT planting recording unavailable",error);
   });
  }catch(error){failed=true;console.warn("BLACKOUT planting recording unavailable",error);}
 }
 function sync(next){
  if(next===stage)return;
  const previous=stage;
  stage=next;
  if(next==="typing"){
   audio.pause();
   seek(config.startSeconds);
   audio.playbackRate=(config.confirmationSeconds-config.startSeconds)/config.plantSeconds;
   audio.volume=config.typingVolume;
   play();
  }else if(next==="global"){
   // On a successful plant the same recording continues at the confirmation
   // sound, then the long post-plant beeps are heard map-wide at full volume.
   if(previous!=="typing"){
    audio.pause();
    seek(config.confirmationSeconds);
   }else if(audio.currentTime<config.confirmationSeconds){
    seek(config.confirmationSeconds);
   }
   audio.playbackRate=1;
   audio.volume=config.globalVolume;
   if(audio.paused)play();
  }else{
   // Releasing F before the timed plant or ending the round stops
   // everything immediately. The next attempt starts at the beginning.
   audio.pause();
   audio.playbackRate=1;
   seek(config.startSeconds);
  }
 }
 function pause(){audio.pause();}
 function resume(){if(stage==="global"&&audio.paused)play();}
 return {sync,pause,resume,get stage(){return stage;},get failed(){return failed;}};
}
