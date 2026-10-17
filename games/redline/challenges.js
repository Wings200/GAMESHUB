/*
 * REDLINE V19 — server-owned daily & weekly challenge definitions.
 * Pure functions: no client authority, purchases, timers or network calls.
 * All periods reset on UTC boundaries (daily midnight, weekly Monday).
 */
export const REDLINE_CHALLENGES=Object.freeze({
 daily:Object.freeze([
  Object.freeze({id:"daily_races",title:"Complete 3 Races",
   description:"Finish any three races, including solo runs.",
   target:3,reward:75,type:"finish"}),
  Object.freeze({id:"daily_best",title:"Beat Your Personal Best",
   description:"Improve a previously saved course record by at least 2%.",
   target:1,reward:50,type:"improvedBest"}),
  Object.freeze({id:"daily_neon",title:"Neon Night Run",
   description:"Finish two races on Neon District.",
   target:2,reward:60,type:"mapFinish",map:"neon"})
 ]),
 weekly:Object.freeze([
  Object.freeze({id:"weekly_races",title:"Finish 15 Races",
   description:"Complete 15 races on any course.",
   target:15,reward:350,type:"finish"}),
  Object.freeze({id:"weekly_wins",title:"First Across the Line",
   description:"Win five races. Solo wins count.",
   target:5,reward:200,type:"win"}),
  Object.freeze({id:"weekly_arctic",title:"Arctic Endurance",
   description:"Complete five Arctic races.",
   target:5,reward:180,type:"mapFinish",map:"arctic"})
 ])
});
export function challengeWindows(now=Date.now()){
 const d=new Date(now);
 if(!Number.isFinite(d.getTime()))throw Error("Invalid challenge clock");
 const today=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
 const monday=today-((new Date(today).getUTCDay()+6)%7)*86400000;
 return{
  daily:{key:new Date(today).toISOString().slice(0,10),
    resetAt:today+86400000},
  weekly:{key:new Date(monday).toISOString().slice(0,10),
    resetAt:monday+7*86400000}
 };
}
const safeNumber=n=>{
 const v=Number(n);return Number.isSafeInteger(v)&&v>=0?v:0;
};
function currentPeriod(stored,key){
 if(!stored||typeof stored!=="object"||stored.key!==key)
   return {key,counts:{},awarded:{}};
 return{
  key,
  counts:stored.counts&&typeof stored.counts==="object"?
    {...stored.counts}:{},
  awarded:stored.awarded&&typeof stored.awarded==="object"?
    {...stored.awarded}:{}
 };
}
function eventIncrement(def,event){
 if(def.type==="finish")return 1;
 if(def.type==="win")return event.place===1?1:0;
 if(def.type==="improvedBest")return event.improvedBest?1:0;
 if(def.type==="mapFinish")return event.map===def.map?1:0;
 return 0;
}
/* Called inside the existing REDLINE Stats Durable Object race transaction.
 * Only a valid server-confirmed finisher reaches this function. The
 * current race ID is already deduplicated at the transaction boundary.
 */
export function advanceChallenges(saved,event,now=Date.now()){
 const windows=challengeWindows(now);
 const state={};
 const awards=[];
 for(const period of ["daily","weekly"]){
  const record=currentPeriod(saved?.[period],windows[period].key);
  for(const def of REDLINE_CHALLENGES[period]){
   if(record.awarded[def.id])continue;
   const inc=eventIncrement(def,event);
   const updated=Math.min(def.target,safeNumber(record.counts[def.id])+inc);
   record.counts[def.id]=updated;
   if(updated>=def.target){
    record.awarded[def.id]=true;
    awards.push({id:def.id,title:def.title,period,reward:def.reward});
   }
  }
  state[period]=record;
 }
 return {state,awards,earned:awards.reduce((sum,a)=>sum+a.reward,0)};
}
/* Read-only normalization: missing/old period data appears as zero progress.
 * Do not change storage or cash simply because a user viewed this board.
 */
export function challengeSnapshot(saved,now=Date.now()){
 const windows=challengeWindows(now);
 const periods={};
 for(const period of ["daily","weekly"]){
  const old=currentPeriod(saved?.[period],windows[period].key);
  periods[period]={
   key:windows[period].key,
   resetAt:windows[period].resetAt,
   entries:REDLINE_CHALLENGES[period].map(def=>{
    const progress=Math.min(def.target,safeNumber(old.counts[def.id]));
    const claimed=old.awarded[def.id]===true;
    return {...def,progress,completed:claimed};
   })
  };
 }
 return {version:1,timezone:"UTC",periods};
}
