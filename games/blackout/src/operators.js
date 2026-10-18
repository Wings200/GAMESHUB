// BLACKOUT V0.5 — fixed-speed/armor operator training profiles.
// Original operator names; damage/health values are gameplay prototypes.
const make=(id,name,side,speed,armor,health,walk,sprint)=>Object.freeze({
  id,name,side,speed,armor,health,walk,sprint
});
export const OPERATORS=Object.freeze({
  orion:make("orion","ORION","attacker",1,3,125,2.85,4.65),
  kestrel:make("kestrel","KESTREL","attacker",2,2,110,3.35,5.5),
  phantom:make("phantom","PHANTOM","attacker",3,1,100,3.9,6.3),
  bulwark:make("bulwark","BULWARK","defender",1,3,125,2.85,4.65),
  atlas:make("atlas","ATLAS","defender",2,2,110,3.35,5.5),
  swift:make("swift","SWIFT","defender",3,1,100,3.9,6.3)
});
export function defaultOperator(side){return side==="defender"?OPERATORS.atlas:OPERATORS.kestrel;}
export function operatorsForSide(side){return Object.values(OPERATORS).filter(o=>o.side===side);}
