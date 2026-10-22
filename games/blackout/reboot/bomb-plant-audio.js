// BLACKOUT V0.26.2 · rhythmic CC0 foley and original device confirmations.
// The game clock owns ALL post-plant beeps, not a long pre-recorded track.
export const PLANT_RECORDING=Object.freeze({
 plantSeconds:7.35,typingVolume:1,disablingVolume:1
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
  if(failed)return false;
  try{
   const pending=media.play();
   if(pending?.catch)pending.catch(error=>{
    failed=true;console.warn("BLACKOUT original defuser foley unavailable",error);
   });
   return true;
  }catch(error){failed=true;console.warn("BLACKOUT original defuser foley unavailable",error);return false;}
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

// Short recorded cues are played *on timer events*, never on top of synth
// fallback. Stop the previous beep before the next, and silence both variants
// the instant an objective ends. Each cue has a distinct physical beginning
// and ending, avoiding the continuous oscillator buzz of earlier versions.
export function createDefuserCuePlayer(media){
 const clips={};
 for(const name of ["arm","tick","urgent","shutdown"]){
  if(!media[name])throw new TypeError("Missing defuser cue "+name);
  clips[name]=cancellableClip(media[name],1);
 }
 function stopBeep(){clips.tick.stop();clips.urgent.stop();}
 return {
  play(name){
   const clip=clips[name];
   if(!clip)return false;
   if(name==="tick"||name==="urgent")stopBeep();
   if(name==="shutdown"){
    stopBeep();clips.arm.stop();
   }
   clip.stop();
   return clip.play();
  },
  stopBeep,
  reset(){for(const clip of Object.values(clips))clip.stop();},
  failed(name){return Boolean(clips[name]?.failed);}
 };
}
