// BLACKOUT V0.9 — original playable tactical operators with distinct passives.
const make=(id,name,side,speed,armor,health,walk,sprint,specialty,passive,description,sigil,accent,kit)=>Object.freeze({
  id,name,side,speed,armor,health,walk,sprint,
  specialty,passive,description,sigil,accent,kit:Object.freeze(kit)
});
export const OPERATORS=Object.freeze({
  sledge:make("sledge","SLEDGE","attacker",1,3,125,2.85,4.65,
    "SOFT BREACH","CABER HAMMER","Break soft walls and barricades at close range.","⚒","#d9b68d",{breach:0,scan:2,special:14}),
  thatcher:make("thatcher","THATCHER","attacker",2,2,110,3.35,5.5,
    "ELECTRONICS","EMP GRENADE","Disable enemy electronic gadgets within the EMP radius.","ϟ","#8acbda",{breach:1,scan:2,special:3}),
  ash:make("ash","ASH","attacker",3,1,100,3.90,6.30,
    "RANGED BREACH","BREACHING ROUND","Launch a breaching round at soft walls and barricades.","➤","#e5b083",{breach:0,scan:2,special:3}),
  thermite:make("thermite","THERMITE","attacker",2,2,110,3.35,5.50,
    "HARD BREACH","EXOTHERMIC CHARGE","Open reinforced walls with special charges.","▥","#edb788",{breach:0,scan:2,special:2}),
  twitch:make("twitch","TWITCH","attacker",3,1,100,3.90,6.30,
    "DRONE CONTROL","SHOCK DRONE","Use an electrified reconnaissance drone.","⌁","#8ab7e6",{breach:1,scan:2,special:3}),
  smoke:make("smoke","SMOKE","defender",1,3,125,2.85,4.65,
    "AREA DENIAL","REMOTE GAS","Deploy canisters to deny routes to attackers.","☣","#d8bd84",{shield:1,sensor:1,reinforce:2,special:3}),
  mute:make("mute","MUTE","defender",2,2,110,3.35,5.50,
    "SIGNAL DENIAL","SIGNAL JAMMER","Place jammers to disrupt hostile recon drones.","⊘","#a1b5ca",{shield:1,sensor:1,reinforce:2,special:4}),
  castle:make("castle","CASTLE","defender",3,1,100,3.90,6.30,
    "FORTIFICATION","ARMOR PANEL","Fortify openings with tougher armor barricades.","▤","#d6a885",{shield:1,sensor:1,reinforce:2,special:4}),
  pulse:make("pulse","PULSE","defender",1,3,125,2.85,4.65,
    "INTELLIGENCE","HEARTBEAT SENSOR","Reveal nearby operators with a short-range scan.","◎","#94d2d9",{shield:1,sensor:1,reinforce:2,special:99}),
  doc:make("doc","DOC","defender",2,2,110,3.35,5.50,
    "SUPPORT","STIM PISTOL","Heal yourself or injured friendly operators.","+","#9ed3b8",{shield:1,sensor:1,reinforce:2,special:3}),
});
export function defaultOperator(side){return side==="defender"?OPERATORS.mute:OPERATORS.sledge;}
export function operatorsForSide(side){return Object.values(OPERATORS).filter(o=>o.side===side);}
