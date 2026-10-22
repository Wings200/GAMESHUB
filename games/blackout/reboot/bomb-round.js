// BLACKOUT V0.25.0 · deterministic solo bomb-round rules.
// Explicit defuser ownership: carrying vs ground. Never automatically
// assign a dropped/left package or pretend an absent teammate collected it.
export const BOMB_RULES=Object.freeze({
 prepSeconds:45,actionSeconds:180,defuserSeconds:45,
 plantSeconds:4,disableSeconds:7,dropHoldSeconds:.7,
 pickupRadius:2.3,plantRadius:2.5,disableRadius:2.3,
 sites:Object.freeze([
  Object.freeze({id:"A",x:-6,z:-13,radius:3.4}),
  Object.freeze({id:"B",x:6,z:-13,radius:3.4})
 ]),
 attackerDrop:Object.freeze({x:0,z:8})
});
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const freshDefuser=choice=>({
 status:choice==="leave"?"ground":"carried",
 carrier:choice==="leave"?null:"local",
 x:BOMB_RULES.attackerDrop.x,z:BOMB_RULES.attackerDrop.z,site:null
});
export function newBombRound({choice="carry",score={attack:0,defend:0},round=1}={}){
 return {mode:"bomb",round,score:{attack:score.attack||0,defend:score.defend||0},
  phase:"prep",time:BOMB_RULES.prepSeconds,winner:null,reason:"",
  defuser:freshDefuser(choice),plantProgress:0,disableProgress:0,
  dropProgress:0,selectedSite:null,events:[]};
}
export function newFollowingRound(state,choice="carry"){
 return newBombRound({choice,score:state?.score||{attack:0,defend:0},
  round:(state?.round||0)+1});
}
export function roundSiteAt(position){
 if(!finite(position))return null;
 return BOMB_RULES.sites.find(s=>dist(s,position)<=s.radius)||null;
}
export function nearbyDefuser(state,side,position){
 return Boolean(state?.phase!=="ended"&&side==="attack"&&
  state.defuser.status==="ground"&&finite(position)&&
  dist(state.defuser,position)<=BOMB_RULES.pickupRadius);
}
export function pickupRoundDefuser(state,side,position){
 if(!nearbyDefuser(state,side,position))
  return {state,ok:false,reason:"NO DROPPED DEFUSER IN PICKUP RANGE"};
 return {state:{...state,defuser:{...state.defuser,status:"carried",
  carrier:"local"},dropProgress:0},ok:true,reason:"DEFUSER PICKED UP · HOLD X TO DROP"};
}
export function dropRoundDefuser(state,position,reason="DEFUSER DROPPED"){
 if(!state||state.defuser.status!=="carried"||!finite(position))
  return {state,ok:false,reason:"NOT CARRYING DEFUSER"};
 return {state:{...state,defuser:{status:"ground",carrier:null,
  x:position.x,z:position.z,site:null},dropProgress:0,
  plantProgress:0},ok:true,reason};
}
export function endBombRound(state,winner,reason){
 if(state.phase==="ended"||!["attack","defend"].includes(winner))
  return state;
 return {...state,phase:"ended",winner,reason,time:0,plantProgress:0,
  disableProgress:0,dropProgress:0,
  score:{...state.score,[winner]:state.score[winner]+1}};
}
export function bombPrompt(state,side,position){
 if(!state)return "SELECT BOMB ROUND";
 if(state.phase==="ended")return state.reason+" · N FOR NEXT ROUND";
 if(state.phase==="prep")return side==="defend"?
  "PREPARATION · REINFORCE / SET DEFENSE GADGETS":
  "PREPARATION · 5 DRONE / 6 DEPLOY DRONE · SPAWN LOCKED";
 if(state.phase==="postplant")return side==="defend"?
  (finite(position)&&dist(position,state.defuser)<=BOMB_RULES.disableRadius?
   "HOLD F TO DISABLE DEFUSER":"LOCATE THE ACTIVE DEFUSER"):
  "DEFUSER ACTIVE · DEFEND UNTIL DETONATION";
 if(side==="attack"){
  if(nearbyDefuser(state,side,position))return "DEFUSER ON FLOOR · PRESS F TO PICK UP";
  if(state.defuser.status==="ground")return "DEFUSER ON FLOOR · LEFT FOR TEAMMATE";
  const site=roundSiteAt(position);
  if(site&&state.defuser.status==="carried")return "BOMB SITE "+site.id+" · HOLD F TO PLANT";
  return state.defuser.status==="carried"?"CARRYING DEFUSER · HOLD X TO DROP":
   "FIND AND PICK UP THE DEFUSER";
 }
 return "DEFEND SITES A AND B · PREVENT THE PLANT";
}
// Advances with actual elapsed seconds and explicit local actor input.
// No autonomous/fictitious teammate and no networked match assertions.
export function stepBombRound(state,dt,{
 side="attack",position=null,holdingF=false,holdingX=false,alive=true
}={}){
 if(!state||state.phase==="ended")return {state,events:[]};
 const step=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0));
 if(!step)return {state,events:[]};
 const events=[];
 let next={...state,time:Math.max(0,state.time-step),events:[]};
 const actor=finite(position)?position:null;
 // Death drops the package: never despawn or hand it to another player.
 if(!alive&&side==="attack"&&next.defuser.status==="carried"&&actor){
  next=dropRoundDefuser(next,actor,"DEFUSER DROPPED ON ELIMINATION").state;
  events.push("dropped");
 }
 if(next.phase==="prep"){
  // X works during attacker preparation too: players can surrender the
  // package at spawn before the action clock, as well as later in-round.
  let dropProgress=0;
  if(alive&&side==="attack"&&actor&&next.defuser.status==="carried"&&holdingX){
   dropProgress=next.dropProgress+step;
   if(dropProgress>=BOMB_RULES.dropHoldSeconds-1e-8){
    next=dropRoundDefuser(next,actor).state;
    events.push("dropped");dropProgress=0;
   }
  }
  next={...next,dropProgress};
  if(next.time<=1e-8){next={...next,phase:"action",time:BOMB_RULES.actionSeconds};
   events.push("action");}
  return {state:next,events};
 }
 if(next.phase==="action"){
  let dropProgress=0,plantProgress=0;
  if(alive&&side==="attack"&&actor&&next.defuser.status==="carried"){
   if(holdingX){
    dropProgress=next.dropProgress+step;
    if(dropProgress>=BOMB_RULES.dropHoldSeconds-1e-8){
     next=dropRoundDefuser(next,actor).state;
     events.push("dropped");dropProgress=0;
    }
   }
   const site=roundSiteAt(actor);
   if(site&&holdingF&&next.defuser.status==="carried"&&!holdingX){
    plantProgress=next.plantProgress+step;
    if(plantProgress>=BOMB_RULES.plantSeconds-1e-8){
     const planted={status:"planted",carrier:null,
      x:actor.x,z:actor.z,site:site.id};
     next={...next,phase:"postplant",time:BOMB_RULES.defuserSeconds,
      defuser:planted,selectedSite:site.id,plantProgress:0,dropProgress:0};
     events.push("planted");
    }
   }
  }
  if(next.phase==="action"){
   next={...next,dropProgress,plantProgress};
   if(next.time<=1e-8){next=endBombRound(next,"defend","TIME EXPIRED · DEFENDERS WIN");
    events.push("ended");}
  }
 }else if(next.phase==="postplant"){
  let disableProgress=0;
  if(alive&&side==="defend"&&actor&&holdingF&&
     dist(actor,next.defuser)<=BOMB_RULES.disableRadius){
   disableProgress=next.disableProgress+step;
   if(disableProgress>=BOMB_RULES.disableSeconds-1e-8){
    next=endBombRound(next,"defend","DEFUSER DISABLED · DEFENDERS WIN");
    events.push("disabled","ended");
   }
  }
  if(next.phase==="postplant"){
   next={...next,disableProgress};
   if(next.time<=1e-8){next=endBombRound(next,"attack","BOMB DETONATED · ATTACKERS WIN");
    events.push("detonated","ended");}
  }
 }
 return {state:next,events};
}
