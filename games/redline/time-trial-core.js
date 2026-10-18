/*
 * REDLINE V20 — locally stored personal-best time-trial traces.
 * Never posts times or player trajectories to the multiplayer Worker.
 * Deliberately scoped to a car and track; original online leaderboards
 * remain server-authoritative and unmodified.
 */
export const TRIAL_MAPS=Object.freeze(["neon","arctic"]);
export const TRIAL_MAX_SAMPLES=7800; // 13 minutes at a 100ms capture interval
const allowedCars=new Set(["gt","vortex","apex","bayside","aurora","ironclad","cirrus","obsidian","phantom"]);
const validNumber=(n,min,max)=>typeof n==="number"&&Number.isFinite(n)&&n>=min&&n<=max;
export const trialStorageKey=(map,car)=>"redline:time-trial:v20:"+map+":"+car;
export function validTrace(record,map,car){
 if(!TRIAL_MAPS.includes(map)||!allowedCars.has(car))return false;
 if(!record||record.version!==1||record.map!==map||record.car!==car||
    !validNumber(record.time,1000,780000)||
    !Array.isArray(record.frames)||record.frames.length<5||
    record.frames.length>TRIAL_MAX_SAMPLES)return false;
 let previous=-1;
 for(const f of record.frames){
  if(!Array.isArray(f)||f.length!==9||
     !validNumber(f[0],0,780000)||f[0]<=previous||
     !validNumber(f[1],-15000,15000)||
     !validNumber(f[2],-1000,3000)||
     !validNumber(f[3],-15000,15000)||
     !validNumber(f[4],-50,50)||
     !validNumber(f[5],-50,50)||
     !validNumber(f[6],-50,50)||
     !validNumber(f[7],0,1000000)||
     !validNumber(f[8],0,300))return false;
  previous=f[0];
 }
 return previous<=record.time+500;
}
export function readPersonalGhost(store,map,car){
 try{
  const raw=store.getItem(trialStorageKey(map,car));
  if(!raw||raw.length>1300000)return null;
  const record=JSON.parse(raw);
  return validTrace(record,map,car)?record:null;
 }catch{return null}
}
export function savePersonalGhost(store,record){
 const {map,car}=record||{};
 if(!validTrace(record,map,car))return {ok:false,reason:"invalid"};
 const existing=readPersonalGhost(store,map,car);
 if(existing&&existing.time<=record.time)return {ok:true,personalBest:false,best:existing.time};
 try{
  store.setItem(trialStorageKey(map,car),JSON.stringify(record));
  return {ok:true,personalBest:true,best:record.time};
 }catch(e){return {ok:false,reason:"storage",best:existing?.time??null}}
}
export function sampleGhost(frames,time){
 if(!Array.isArray(frames)||frames.length<2)return null;
 const t=Math.max(0,Number(time)||0);
 if(t<=frames[0][0])return frames[0];
 const last=frames[frames.length-1];
 if(t>=last[0])return last;
 let lo=0,hi=frames.length-1;
 while(lo+1<hi){
  const m=(lo+hi)>>1;
  if(frames[m][0]<=t)lo=m;else hi=m;
 }
 const a=frames[lo],b=frames[hi];
 const f=(t-a[0])/Math.max(1,b[0]-a[0]);
 const result=[t];
 for(let i=1;i<=8;i++){
  if(i>=4&&i<=6){
   const angle=Math.atan2(Math.sin(b[i]-a[i]),Math.cos(b[i]-a[i]));
   result.push(a[i]+angle*f);
  }else result.push(a[i]+(b[i]-a[i])*f);
 }
 return result;
}
// Match where the player currently is on the checkpoint-based course
// rather than comparing only speeds at the same elapsed time.
export function ghostTimeAtProgress(frames,progress){
 if(!Array.isArray(frames)||frames.length<2||!Number.isFinite(progress))return null;
 let closest=frames[0],error=Infinity;
 for(const frame of frames){
  const d=Math.abs(frame[7]-progress);
  if(d<error){error=d;closest=frame}
 }
 return error>1.5?null:closest[0];
}
export function trialTimeLabel(ms){
 const n=Math.max(0,Math.floor(ms||0));
 return String(Math.floor(n/60000)).padStart(2,"0")+":"+
   String(Math.floor(n%60000/1000)).padStart(2,"0")+"."+
   String(n%1000).padStart(3,"0");
}
