// BLACKOUT V0.9 — original playable tactical operators with distinct passives.
const make=(id,name,side,speed,armor,health,walk,sprint,specialty,passive,description,sigil,accent,kit)=>Object.freeze({
  id,name,side,speed,armor,health,walk,sprint,
  specialty,passive,description,sigil,accent,kit:Object.freeze(kit)
});
export const OPERATORS=Object.freeze({
  orion:make("orion","ORION","attacker",1,3,125,2.85,4.65,
    "FRONTLINE","EXTRA CHARGES","Heavy breach lead with an additional wall charge.","◆","#f3bf75",{breach:3,scan:1}),
  kestrel:make("kestrel","KESTREL","attacker",2,2,110,3.35,5.5,
    "OBJECTIVE","FAST PLANT","Plants the defuser 20% faster than other attackers.","⌁","#7de5de",{breach:2,scan:2}),
  phantom:make("phantom","PHANTOM","attacker",3,1,100,3.90,6.30,
    "RECON","DEEP SCAN","Extra recon pulse for locating opposition.","◈","#b29cff",{breach:1,scan:4}),
  breaker:make("breaker","BREAKER","attacker",2,2,110,3.35,5.50,
    "BREACH","DEMO EXPERT","Additional wall charge and quick entry capability.","✕","#ff9c71",{breach:4,scan:1}),
  cipher:make("cipher","CIPHER","attacker",3,1,100,3.90,6.30,
    "INTEL","RECON LOADOUT","Additional scan pulse for information gathering.","◎","#8ecaff",{breach:1,scan:4}),
  bulwark:make("bulwark","BULWARK","defender",1,3,125,2.85,4.65,
    "ANCHOR","EXTRA REINFORCEMENTS","Extra reinforced wall and deployable shield.","⬡","#f4b878",{shield:3,sensor:1,reinforce:3}),
  atlas:make("atlas","ATLAS","defender",2,2,110,3.35,5.50,
    "SUPPORT","FAST DISABLE","Disables the planted device 20% faster.","▣","#85e0d1",{shield:2,sensor:2,reinforce:2}),
  swift:make("swift","SWIFT","defender",3,1,100,3.90,6.30,
    "ROAMER","EXTRA SENSOR","Carries an additional proximity detector.","⌁","#b19fff",{shield:1,sensor:3,reinforce:2}),
  bastion:make("bastion","BASTION","defender",1,3,125,2.85,4.65,
    "FORTIFY","HARDENED SITE","Carries more shields and reinforcements.","⬢","#f0af73",{shield:3,sensor:1,reinforce:4}),
  sonar:make("sonar","SONAR","defender",2,2,110,3.35,5.50,
    "INTEL","WIDE SENSOR KIT","Carries more proximity sensors for doorway coverage.","◉","#88c9ff",{shield:1,sensor:4,reinforce:2})
});
export function defaultOperator(side){return side==="defender"?OPERATORS.atlas:OPERATORS.kestrel;}
export function operatorsForSide(side){return Object.values(OPERATORS).filter(o=>o.side===side);}
