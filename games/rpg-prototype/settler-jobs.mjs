// W21.04: Worker assignment and finite settlement resource production.
// Uses the existing build structures, actual workshop component stash and saved
// physical junk sites. No infinite generic scavenger resource faucet.
import {HAVEN_JUNK_SITES,SETTLEMENT_BY_ID} from './settlement-building.mjs';

export const SETTLER_JOB_TYPES=Object.freeze({
  farmer:Object.freeze({label:'Farmer',category:'FOOD'}),
  water:Object.freeze({label:'Water Worker',category:'WATER'}),
  guard:Object.freeze({label:'Guard',category:'DEFENSE'}),
  scavenger:Object.freeze({label:'Scavenger',category:null})
});
export const JOB_OUTPUT_INTERVAL=16;
const MAX_PROVISIONS=240;
const finite=n=>Number.isFinite(n)?n:0;

export function validSettlerJob(state,settlerId,job,structureId=null){
  const id=String(settlerId);
  if(!Number.isInteger(Number(settlerId))||Number(settlerId)<1||
     Number(settlerId)>state.population)return {ok:false,reason:'NO SUCH SETTLER'};
  if(job==='unassigned')return {ok:true};
  const type=SETTLER_JOB_TYPES[job];
  if(!type)return {ok:false,reason:'UNKNOWN JOB'};
  if(job==='scavenger')return {ok:true};
  const structure=state.structures.find(s=>s.id===Number(structureId));
  const plan=structure&&SETTLEMENT_BY_ID[structure.type];
  if(!structure||!plan||plan.category!==type.category||
    (job==='guard'&&structure.type!=='guardpost')||
    (job==='water'&&!(plan.stats?.water>0))||
    (job==='farmer'&&!(plan.stats?.food>0)))
    return {ok:false,reason:'THIS STRUCTURE CANNOT SUPPORT THAT JOB'};
  if(Object.entries(state.workerJobs||{}).some(([key,value])=>key!==id&&
      value?.structureId===structure.id))
    return {ok:false,reason:'THIS STATION ALREADY HAS A WORKER'};
  return {ok:true,structure};
}

export function assignSettlerJob(state,settlerId,job,structureId=null){
  const check=validSettlerJob(state,settlerId,job,structureId);
  if(!check.ok)return check;
  const id=String(settlerId);
  state.workerJobs??={};state.workerProgress??={};
  if(job==='unassigned')delete state.workerJobs[id];
  else state.workerJobs[id]={job,...(check.structure?{structureId:check.structure.id}:{})};
  state.workerProgress[id]=0;
  return {ok:true,job,structure:check.structure||null};
}

export function reconcileSettlerJobs(state){
  state.workerJobs??={};state.workerProgress??={};
  const used=new Set();let removed=0;
  for(const [id,value] of Object.entries(state.workerJobs)){
    const check=validSettlerJob({...state,workerJobs:{}},Number(id),
      value?.job,value?.structureId);
    if(!check.ok||(check.structure&&used.has(check.structure.id))){
      delete state.workerJobs[id];delete state.workerProgress[id];removed++;
    }else if(check.structure)used.add(check.structure.id);
  }
  return removed;
}

export function staffedSettlementJobs(state){
  const result={farmers:0,waterWorkers:0,guards:0,scavengers:0,
    foodCapacity:0,waterCapacity:0,guardDefense:0,assigned:0};
  for(const assignment of Object.values(state.workerJobs||{})){
    if(!SETTLER_JOB_TYPES[assignment?.job])continue;
    const structure=state.structures.find(s=>s.id===assignment.structureId);
    const plan=structure&&SETTLEMENT_BY_ID[structure.type];
    if(assignment.job!=='scavenger'&&(!plan||
      (state.structureCondition?.[String(structure.id)]??100)<=0))continue;
    result.assigned++;
    if(assignment.job==='farmer'){
      result.farmers++;result.foodCapacity+=plan.stats?.food||0;
    }else if(assignment.job==='water'){
      result.waterWorkers++;result.waterCapacity+=plan.stats?.water||0;
    }else if(assignment.job==='guard'){
      result.guards++;result.guardDefense+=2;
    }else result.scavengers++;
  }
  return result;
}

export function nextScavengingSite(state,availableIds=null){
  return HAVEN_JUNK_SITES.find(site=>!site.id.startsWith('original-')&&
    (!availableIds||availableIds.includes(site.id))&&
    !(state.scrappedJunk||[]).includes(site.id))||null;
}

export function settlerWorkLocation(state,assignment,availableIds=null){
  if(!assignment)return null;
  if(assignment.job==='scavenger'){
    const site=nextScavengingSite(state,availableIds);
    return site?{x:site.x,z:site.z,siteId:site.id,
      width:Math.max(1,...site.parts.map(p=>Math.abs(p.x)*2+p.w)),
      depth:Math.max(1,...site.parts.map(p=>Math.abs(p.z)*2+p.d))}:null;
  }
  const structure=state.structures.find(s=>s.id===assignment.structureId);
  const plan=structure&&SETTLEMENT_BY_ID[structure.type];
  return structure?{x:structure.x,z:structure.z,structureId:structure.id,
    width:structure.rotation%2?plan.depth:plan.width,
    depth:structure.rotation%2?plan.width:plan.depth}:null;
}

export function advanceSettlerJobs(state,dt,{workingIds=[],availableSiteIds=null}={}){
  const seconds=Math.max(0,Math.min(4,finite(dt)));
  state.workerJobs??={};state.workerProgress??={};
  state.provisions??={food:0,water:0};
  state.provisionConsumerClock=Math.max(0,finite(state.provisionConsumerClock));
  const produced={food:0,water:0,materials:{},scavenged:[]};
  if(!seconds)return produced;
  const ready=new Set(workingIds.map(String));
  for(const [id,assignment] of Object.entries(state.workerJobs)){
    if(!ready.has(id))continue;
    const location=settlerWorkLocation(state,assignment,availableSiteIds);
    if(!location)continue;
    if(assignment.structureId&&
      (state.structureCondition?.[String(assignment.structureId)]??100)<=0)continue;
    if(assignment.job==='water'){
      const plan=SETTLEMENT_BY_ID[state.structures.find(s=>s.id===assignment.structureId)?.type];
      if(plan?.stats?.powerDraw>0){
        const powered=state.structures.reduce((n,s)=>n+(SETTLEMENT_BY_ID[s.type]?.stats?.power||0),0)>=
          state.structures.reduce((n,s)=>n+(SETTLEMENT_BY_ID[s.type]?.stats?.powerDraw||0),0);
        if(!powered)continue;
      }
    }
    const progress=Math.min(JOB_OUTPUT_INTERVAL,state.workerProgress[id]||0)+seconds;
    if(progress<JOB_OUTPUT_INTERVAL){state.workerProgress[id]=progress;continue;}
    state.workerProgress[id]=progress-JOB_OUTPUT_INTERVAL;
    if(assignment.job==='farmer'||assignment.job==='water'){
      const resource=assignment.job==='farmer'?'food':'water';
      if(state.provisions[resource]>=MAX_PROVISIONS)continue;
      const room=MAX_PROVISIONS-state.provisions[resource];
      const gained=Math.min(room,1);
      state.provisions[resource]+=gained;produced[resource]+=gained;
    }else if(assignment.job==='scavenger'){
      const site=nextScavengingSite(state,availableSiteIds);
      if(!site)continue;
      const materials=state.workshopMaterials||(state.workshopMaterials={});
      if(Object.entries(site.materials).some(([item,n])=>(materials[item]||0)+n>999999))
        continue;
      for(const [item,n] of Object.entries(site.materials)){
        materials[item]=(materials[item]||0)+n;
        produced.materials[item]=(produced.materials[item]||0)+n;
      }
      (state.scrappedJunk||(state.scrappedJunk=[])).push(site.id);
      produced.scavenged.push(site.id);
    }
    // Guard posts already contribute passive defense; a staffed one adds
    // true defense in calculateSettlementStats but does not mint supplies.
  }
  state.provisionConsumerClock+=seconds;
  if(state.provisionConsumerClock>=80){
    state.provisionConsumerClock-=80;
    const need=Math.max(0,Math.floor(state.population||0));
    const available=Math.min(state.provisions.food,state.provisions.water);
    const eaten=Math.min(need,available);
    state.provisions.food-=eaten;state.provisions.water-=eaten;
    state.provisionShortfall=need-eaten;
  }
  return produced;
}

export function withdrawSettlerProvisions(state,resource,quantity=1){
  if(!['food','water'].includes(resource)||!Number.isSafeInteger(quantity)||
     quantity<1||(state.provisions?.[resource]||0)<quantity)
    return {ok:false,reason:'NOT ENOUGH STORED PROVISIONS'};
  state.provisions[resource]-=quantity;
  return {ok:true,itemId:resource==='food'?'supply:trail-stew':'supply:clean-water',
    quantity};
}
