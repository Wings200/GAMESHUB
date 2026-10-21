// BLACKOUT V0.13 · original free operator roster, independent of a match.
// A concept is NOT a playable operator until its unique gadget is functional.
// Striker/Sentry are mirror 2-speed / 2-armor generalists with TWO utility slots.
export const OPERATOR_ROSTER=Object.freeze([
 {id:"striker",name:"STRIKER",side:"attack",role:"Versatile Assault",speed:2,armor:2,
  playable:true,signature:null,secondarySlots:2,portrait:"S"},
 {id:"volt",name:"VOLT",side:"attack",role:"Electronic Intelligence",speed:3,armor:1,
  playable:false,signature:"Signal disruption",secondarySlots:1,portrait:"V"},
 {id:"relay",name:"RELAY",side:"attack",role:"Squad Support",speed:2,armor:2,
  playable:false,signature:"Team utility",secondarySlots:1,portrait:"R"},
 {id:"trace",name:"TRACE",side:"attack",role:"Reconnaissance",speed:3,armor:1,
  playable:false,signature:"Information gathering",secondarySlots:1,portrait:"T"},
 {id:"cutter",name:"CUTTER",side:"attack",role:"Structural Breaching",speed:1,armor:3,
  playable:false,signature:"Hard-breach equipment",secondarySlots:1,portrait:"C"},
 {id:"flare",name:"FLARE",side:"attack",role:"Area Screening",speed:2,armor:2,
  playable:false,signature:"Vision control",secondarySlots:1,portrait:"F"},
 {id:"sentry",name:"SENTRY",side:"defend",role:"Versatile Defense",speed:2,armor:2,
  playable:true,signature:null,secondarySlots:2,portrait:"S"},
 {id:"bastion",name:"BASTION",side:"defend",role:"Fortification",speed:1,armor:3,
  playable:false,signature:"Area reinforcement",secondarySlots:1,portrait:"B"},
 {id:"specter",name:"SPECTER",side:"defend",role:"Surveillance",speed:3,armor:1,
  playable:false,signature:"Remote observation",secondarySlots:1,portrait:"S"},
 {id:"anchor",name:"ANCHOR",side:"defend",role:"Site Protection",speed:1,armor:3,
  playable:false,signature:"Defensive cover",secondarySlots:1,portrait:"A"},
 {id:"tripwire",name:"TRIPWIRE",side:"defend",role:"Early Warning",speed:2,armor:2,
  playable:false,signature:"Perimeter detection",secondarySlots:1,portrait:"T"},
 {id:"static",name:"STATIC",side:"defend",role:"Electronic Defense",speed:2,armor:2,
  playable:false,signature:"Device countermeasures",secondarySlots:1,portrait:"S"}
].map(operator=>Object.freeze(operator)));

export const SIDES=Object.freeze(["attack","defend"]);
export const MOVEMENT_MULTIPLIERS=Object.freeze({1:.87,2:1,3:1.13});
export const ARMOR_LABELS=Object.freeze({1:"LIGHT",2:"STANDARD",3:"HEAVY"});
export const OPERATOR_CAP=Object.freeze({attack:6,defend:6});
export function operatorById(id){return OPERATOR_ROSTER.find(o=>o.id===id)||null;}
export function operatorsForSide(side){
 return SIDES.includes(side)?OPERATOR_ROSTER.filter(o=>o.side===side):[];
}
export function newOperatorSelection(){
 return {side:"attack",attack:"striker",defend:"sentry"};
}
export function selectedOperator(state){
 return operatorById(state[state.side]);
}
export function switchOperatorSide(state,side){
 if(!SIDES.includes(side))return state;
 return {...state,side};
}
export function pickOperator(state,id){
 const op=operatorById(id);
 if(!op||!op.playable||op.side!==state.side)return state;
 return {...state,[state.side]:id};
}
export function operatorLoadout(operator){
 if(!operator)return null;
 const slots=[];
 if(operator.signature){
  slots.push({type:"signature",label:operator.signature,implemented:false});
 }
 for(let i=0;i<operator.secondarySlots;i++)
  slots.push({type:"secondary",label:"UTILITY SLOT "+(i+1),implemented:false});
 return {operatorId:operator.id,side:operator.side,
  speed:operator.speed,armor:operator.armor,
  speedMultiplier:MOVEMENT_MULTIPLIERS[operator.speed],
  slots};
}
export function isPlayableOperator(id){
 return Boolean(operatorById(id)?.playable);
}
