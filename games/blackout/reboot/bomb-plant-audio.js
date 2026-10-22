// BLACKOUT V0.25.5 · synchronize two parts of the supplied recording.
// The original recording has ~1.3s of leading near-silence. Its typing
// section is pre-trimmed at 1.30s and split at the 8.65s confirmation onset.
// Separate files avoid inaccurate currentTime seeks on an unloaded MP3.
export const PLANT_RECORDING=Object.freeze({
 plantSeconds:7.35,typingVolume:.56,globalVolume:.96
});

export function plantRecordingStage(state,interaction){
 if(state?.mode!=="bomb"||state.phase==="ended")return "off";
 if(state.phase==="postplant")return "global";
 return state.phase==="action"&&interaction==="plant"?"typing":"off";
}

export function createPlantRecording(typingAudio,armedAudio,config=PLANT_RECORDING){
 let stage="off",failed=false;
 for(const clip of [typingAudio,armedAudio]){
  clip.preload="auto";
  clip.addEventListener?.("error",()=>{failed=true;});
 }
 typingAudio.volume=config.typingVolume;
 armedAudio.volume=config.globalVolume;
 // The postplant timer is 45s and the confirmation clip is over 50s.
 function stop(clip){
  clip.pause();
  try{clip.currentTime=0;}catch{}
 }
 function play(clip){
  if(failed)return;
  try{
   const pending=clip.play();
   if(pending?.catch)pending.catch(error=>{
    failed=true;
    console.warn("BLACKOUT defuser audio unavailable",error);
   });
  }catch(error){failed=true;console.warn("BLACKOUT defuser audio unavailable",error);}
 }
 function sync(next){
  if(next===stage)return;
  stage=next;
  if(next==="typing"){
   stop(armedAudio);
   stop(typingAudio);
   play(typingAudio);
  }else if(next==="global"){
   // Finish the typing and immediately start at woo-woo, never from silence.
   stop(typingAudio);
   stop(armedAudio);
   play(armedAudio);
  }else{
   // Cancelling the plant or ending the round stops everything.
   stop(typingAudio);
   stop(armedAudio);
  }
 }
 function pause(){typingAudio.pause();armedAudio.pause();}
 function resume(){if(stage==="global"&&armedAudio.paused)play(armedAudio);}
 return {sync,pause,resume,get stage(){return stage;},get failed(){return failed;}};
}
