// Physical, distance-attenuated foley for OTHER players' active objective jobs.
// All start/end times come from the multiplayer Worker; the local player keeps
// their own original defuser recordings and post-plant beeps.
export function createRemoteObjectiveAudio(assets,makeAudio=src=>new Audio(src)){
 const live=new Map();
 const MAX_DISTANCE=18;
 function stop(id){
  const entry=live.get(id);if(!entry)return;
  entry.media.pause();live.delete(id);
 }
 function clear(){for(const id of [...live.keys()])stop(id)}
 function sync(snapshot,listener,now=Date.now()){
  if(snapshot?.mode!=="active"||!listener){clear();return;}
  const active=new Set();
  for(const [id,job] of Object.entries(snapshot.world?.interactions||{})){
   if(String(id)===String(snapshot.id)||!["plant","disable"].includes(job?.kind)||
      !Number.isFinite(job.endsAt)||job.endsAt<=now)continue;
   const distance=Math.hypot(Number(job.x)-listener.x,
      (Number(job.y||0)-listener.y)*1.6,Number(job.z)-listener.z);
   if(!Number.isFinite(distance)||distance>=MAX_DISTANCE)continue;
   active.add(id);
   let entry=live.get(id);
   if(entry&&entry.kind!==job.kind){stop(id);entry=null;}
   if(!entry){
    const media=makeAudio(assets[job.kind]);
    media.preload="auto";media.loop=false;
    media.volume=Math.max(0,Math.min(1,Math.pow(1-distance/MAX_DISTANCE,1.5)*.95));
    // Join a running recording at its server-authoritative elapsed time.
    const started=Number(job.startedAt)>0?Number(job.startedAt):
      Number(job.endsAt)-(job.kind==="plant"?7350:7000);
    const offset=Math.max(0,(now-started)/1000);
    const seek=()=>{
     try{if(Number.isFinite(media.duration)&&media.duration>0)
       media.currentTime=Math.min(offset,Math.max(0,media.duration-.1));}catch{}
    };
    media.addEventListener?.("loadedmetadata",seek,{once:true});seek();
    try{const play=media.play();play?.catch?.(()=>{});}catch{}
    entry={kind:job.kind,media};live.set(id,entry);
   }
   entry.media.volume=Math.max(0,Math.min(1,Math.pow(1-distance/MAX_DISTANCE,1.5)*.95));
  }
  for(const id of [...live.keys()])if(!active.has(id))stop(id);
 }
 return {sync,clear};
}
