// BLACKOUT V0.26.1 · original CC0 defuser foley; no Ubisoft game recordings.
// The game clock owns ALL post-plant beeps, not a long pre-recorded track.
export const PLANT_RECORDING=Object.freeze({
 plantSeconds:7.35,typingVolume:.88,disablingVolume:.76
});

export function plantRecordingStage(state,interaction){
 if(state?.mode!=="bomb")return "off";
 // Defender success silences the device; other winners retain global state.
 if(state.phase==="ended"){
  if(state.winner==="defend"&&state.defuser?.status==="planted")return "off";
  return state.defuser?.status==="planted"?"global":"off";
 }
 if(state.phase==="postplant")return "global";
 return state.phase==="action"&&interaction==="plant"?"typing":"off";
}

function cancellableClip(media,volume){
 let failed=false;
 media.preload="auto";
 media.volume=volume;
 media.addEventListener?.("error",()=>{failed=true;});
 function stop(){
  media.pause();
  try{media.currentTime=0;}catch{}
 }
 function play(){
  if(failed)return;
  try{
   const pending=media.play();
   if(pending?.catch)pending.catch(error=>{
    failed=true;console.warn("BLACKOUT original defuser foley unavailable",error);
   });
  }catch(error){failed=true;console.warn("BLACKOUT original defuser foley unavailable",error);}
 }
 return {stop,play,pause(){media.pause();},
  resume(){if(media.paused&&!media.ended)play();},get failed(){return failed;}};
}

export function createPlantRecording(typingAudio,config=PLANT_RECORDING){
 const clip=cancellableClip(typingAudio,config.typingVolume);
 let stage="off";
 return {
  sync(next){
   if(stage===next)return;
   stage=next;
   clip.stop();
   // Successful planting switches to procedural confirmation + timer-driven
   // beeps; no copyrighted or duplicate long armed recording exists.
   if(next==="typing")clip.play();
  },
  pause(){clip.pause();},resume(){if(stage==="typing")clip.resume();},
  get stage(){return stage;},get failed(){return clip.failed;}
 };
}

export function createDefuseRecording(disablingAudio,config=PLANT_RECORDING){
 const clip=cancellableClip(disablingAudio,config.disablingVolume);
 let active=false;
 return {
  sync(next){
   const enabled=Boolean(next);
   if(active===enabled)return;
   active=enabled;
   clip.stop();
   if(active)clip.play();
  },
  pause(){clip.pause();},resume(){if(active)clip.resume();},
  get active(){return active;},get failed(){return clip.failed;}
 };
}
