// W21.05: Separate Haven defense test. Never changes the established arena AI.
// Raider health, structure condition, repair costs, cooldowns and wave state
// are deterministic, saveable data; main.js handles meshes, shots and sound.
import {SETTLEMENT_BY_ID} from './settlement-building.mjs';
import {countItem,spendMaterial} from './inventory.mjs';

export const RAID_SPAWNS=Object.freeze([
  Object.freeze({x:-18,z:-23}),
  Object.freeze({x:-34,z:-39}),
  Object.freeze({x:-57,z:-19})
]);
export const RAID_MAX_SECONDS=180;
export const RAID_REST_SECONDS=85;
export const GUARD_RANGE=19;
export const TURRET_RANGE=23;
export const RAID_ATTACK_RANGE=13;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;

export function settlementStructureCondition(state,id){
  return clamp(finite(state?.structureCondition?.[String(id)],100),0,100);
}
export function settlementStructureOperational(state,id){
  return settlementStructureCondition(state,id)>0;
}
export function damageSettlementStructure(state,id,damage){
  const structure=state?.structures?.find(s=>s.id===id);
  if(!structure)return {ok:false,reason:'STRUCTURE DOES NOT EXIST'};
  const before=settlementStructureCondition(state,id);
  const amount=clamp(finite(damage),0,100);
  if(!amount||!before)return {ok:false,reason:'ALREADY DESTROYED OR NO DAMAGE'};
  const after=clamp(before-amount,0,100);
  state.structureCondition??={};
  if(after===100)delete state.structureCondition[String(id)];
  else state.structureCondition[String(id)]=after;
  return {ok:true,before,after,damage:before-after,disabled:after===0};
}
export function settlementRepairCost(state,id){
  const structure=state?.structures?.find(s=>s.id===id);
  const plan=structure&&SETTLEMENT_BY_ID[structure.type];
  const before=settlementStructureCondition(state,id);
  if(!plan||before>=100)return {};
  return Object.fromEntries(Object.entries(plan.cost).map(([material,qty])=>
    [material,Math.max(1,Math.ceil(qty*(100-before)/100*.40))]));
}
export function repairSettlementStructure(state,backpack,id){
  const structure=state?.structures?.find(s=>s.id===id);
  if(!structure)return {ok:false,reason:'STRUCTURE DOES NOT EXIST'};
  const before=settlementStructureCondition(state,id);
  if(before>=100)return {ok:false,reason:'STRUCTURE IS ALREADY INTACT'};
  const cost=settlementRepairCost(state,id);
  if(Object.entries(cost).some(([material,qty])=>countItem(backpack,material)<qty))
    return {ok:false,reason:'MISSING REAL REPAIR MATERIALS',cost};
  for(const [material,qty] of Object.entries(cost))spendMaterial(backpack,material,qty);
  state.structureCondition??={};
  delete state.structureCondition[String(id)];
  return {ok:true,before,after:100,cost};
}

export function beginSettlementRaid(state){
  state.raid??={wave:0,active:false,raiders:[],elapsed:0,cooldown:0};
  if(state.raid.active)return {ok:false,reason:'RAID ALREADY IN PROGRESS'};
  if(state.raid.cooldown>0)return {ok:false,reason:'DEFENSE REST '+Math.ceil(state.raid.cooldown)+'s'};
  if(!state.structures?.length)return {ok:false,reason:'BUILD A REAL STRUCTURE FIRST'};
  const wave=Math.min(999,state.raid.wave+1);
  const raiders=RAID_SPAWNS.map((spawn,index)=>({id:'haven-'+(index+1),
    x:spawn.x,z:spawn.z,yaw:0,health:[70,85,105][index],
    maxHealth:[70,85,105][index],shotClock:1.1+index*.9}));
  state.raid={wave,active:true,elapsed:0,cooldown:0,raiders};
  return {ok:true,wave,raiders};
}
export function raidLivingEnemies(state){
  return state?.raid?.active?state.raid.raiders.filter(r=>r.health>0):[];
}
export function damageSettlementRaider(state,id,damage){
  const raider=state?.raid?.raiders?.find(r=>r.id===id);
  if(!state?.raid?.active||!raider||raider.health<=0||
    !(Number.isFinite(damage)&&damage>0))return {ok:false};
  const before=raider.health;
  raider.health=Math.max(0,before-damage);
  return {ok:true,before,after:raider.health,damage:before-raider.health,
    killed:raider.health===0};
}
export function raidTargetStructure(state,raider){
  if(!raider)return null;
  const targets=(state.structures||[]).filter(s=>settlementStructureOperational(state,s.id));
  const priority={beacon:2.8,generator:2.1,guardpost:1.7,
    turret:1.6,purifier:1.8,garden:1.5,waterpump:1.4};
  targets.sort((a,b)=>{
    const score=s=>Math.hypot(s.x-raider.x,s.z-raider.z)-
      (priority[s.type]||0);
    return score(a)-score(b)||a.id-b.id;
  });
  return targets[0]||null;
}
export function stepRaidClock(state,delta){
  const dt=clamp(finite(delta),0,4);
  state.raid??={wave:0,active:false,raiders:[],elapsed:0,cooldown:0};
  const raid=state.raid;
  if(!raid.active){raid.cooldown=Math.max(0,raid.cooldown-dt);return {ended:false};}
  raid.elapsed+=dt;
  const defeated=raid.raiders.every(r=>r.health<=0);
  const timedOut=raid.elapsed>=RAID_MAX_SECONDS;
  const noTargets=!(state.structures||[]).some(s=>settlementStructureOperational(state,s.id));
  if(defeated||timedOut||noTargets){
    raid.active=false;raid.cooldown=RAID_REST_SECONDS;
    return {ended:true,victory:defeated,withdrawn:timedOut,overrun:noTargets};
  }
  return {ended:false};
}

export function moveRaidRaider(raider,dt,target,canStand=()=>true){
  if(!raider||!target||raider.health<=0)return {moved:false};
  const dx=target.x-raider.x,dz=target.z-raider.z;
  const distance=Math.hypot(dx,dz);
  // The existing NPC root faces +Z at yaw zero after its avatar correction.
  raider.yaw=Math.atan2(dx,dz);
  if(distance<7)return {moved:false};
  const step=Math.min(.95*clamp(finite(dt),0,.06),distance-6.5);
  const x=raider.x+dx/distance*step,z=raider.z+dz/distance*step;
  if(canStand(x,z)){raider.x=x;raider.z=z;return {moved:true};}
  if(canStand(x,raider.z)){raider.x=x;return {moved:true};}
  if(canStand(raider.x,z)){raider.z=z;return {moved:true};}
  return {moved:false};
}
