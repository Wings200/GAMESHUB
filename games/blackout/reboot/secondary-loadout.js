// BLACKOUT V0.14 · pure, side-locked TWO-SLOT SECONDARY GADGET PLAN.
// This is a PREVIEW selection system. No gadgets below are field-ready yet:
// never mark one equipped, grant ammunition, or create placeholder effects.
// Future mechanics unlock each gadget individually only after testing.
export const SECONDARY_GADGETS=Object.freeze([
 {id:"frag",name:"Frag Grenades",side:"attack",role:"Timed explosive",implemented:false},
 {id:"flash",name:"Flashbangs",side:"attack",role:"Sight disruption",implemented:false},
 {id:"smoke",name:"Smoke Grenades",side:"attack",role:"Vision cover",implemented:false},
 {id:"soft-breach",name:"Soft Breach Charge",side:"attack",role:"Soft wall destruction",implemented:false},
 {id:"hard-breach",name:"Hard Breach Charge",side:"attack",role:"Reinforced wall breach (unprotected)",implemented:false},
 {id:"claymore",name:"Claymores",side:"attack",role:"Directional trap",implemented:false},
 {id:"c4",name:"C4 / Nitro Cell",side:"defend",role:"Remote explosive",implemented:false},
 {id:"impact",name:"Impact Grenades",side:"defend",role:"Impact destruction",implemented:false},
 {id:"observation-blocker",name:"Observation Blockers",side:"defend",role:"Camera vision denial",implemented:false},
 {id:"barbed-wire",name:"Barbed Wire",side:"defend",role:"Movement slowing",implemented:false},
 {id:"proximity-alarm",name:"Proximity Alarms",side:"defend",role:"Entry warning",implemented:false},
 {id:"deployable-shield",name:"Deployable Shields",side:"defend",role:"Portable cover",implemented:false}
].map(g=>Object.freeze(g)));

export const SECONDARY_SLOT_COUNT=2;
export function gadgetById(id){return SECONDARY_GADGETS.find(g=>g.id===id)||null;}
export function secondaryOptions(side){
 return SECONDARY_GADGETS.filter(g=>g.side===side);
}
export function newSecondaryPlans(){
 // Session-only operator-specific PLANS. Do not call these actual loadouts.
 return Object.freeze({});
}
export function plannedSecondaries(plans,operator){
 if(!operator||!operator.playable)return Object.freeze([]);
 const stored=plans?.[operator.id];
 const result=Array.from({length:operator.secondarySlots},(_,i)=>{
  const id=stored?.[i];
  return gadgetById(id)?.side===operator.side?id:null;
 });
 return Object.freeze(result);
}
export function planSecondary(plans,operator,slot,id){
 if(!operator?.playable||!["attack","defend"].includes(operator.side)||
   !Number.isInteger(slot)||slot<0||slot>=operator.secondarySlots)return plans;
 if(id!==null&&(!gadgetById(id)||gadgetById(id).side!==operator.side))
  return plans;
 const chosen=plannedSecondaries(plans,operator);
 if(chosen[slot]===id)return plans;
 // A unique gadget cannot occupy BOTH utility slots in a single operator plan.
 if(id!==null&&chosen.includes(id))return plans;
 const next=[...chosen];
 next[slot]=id;
 return Object.freeze({...plans,[operator.id]:Object.freeze(next)});
}
export function planIsFieldReady(plans,operator){
 const ids=plannedSecondaries(plans,operator).filter(Boolean);
 // Deliberately NEVER pretend the currently proposed gadgets can be deployed.
 return ids.length>0&&ids.every(id=>gadgetById(id)?.implemented===true);
}
