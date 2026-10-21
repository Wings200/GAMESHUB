// BLACKOUT V0.20.0 · Hard Breach: placed on real unprotected reinforced
// steel or unreinforced gypsum, remote 1.1s countdown, F recovery while armed.
import {SOFT_WALL,softWallIndex} from "./soft-wall.js?v=reboot-016";
import {REINFORCEMENT} from "./reinforcement.js?v=reboot-045";

export const HARD_BREACH=Object.freeze({
 charges:2,range:2.8,pickupRange:2.8,installSeconds:1.45,
 detonationDelay:1.1,radius:2.65,damage:165,lethalRadius:.85
});
export function newHardBreachState(){return {charges:HARD_BREACH.charges,nextId:1,devices:[]};}
function placement(player,context){
 if(!player||![player.x,player.y,player.z,player.yaw,player.pitch].every(Number.isFinite))
  return {point:null,reason:"INVALID AIM"};
 const cp=Math.cos(player.pitch),dz=-Math.cos(player.yaw)*cp;
 if(Math.abs(dz)<.000001)return {point:null,reason:"AIM AT THE REINFORCED WALL"};
 const t=(SOFT_WALL.z-player.z)/dz;
 if(t<.2||t>HARD_BREACH.range)
  return {point:null,reason:"MOVE CLOSE TO THE REINFORCED OR SOFT WALL"};
 const eye=player.y+(player.prone?.44:player.crouched?1.08:1.65);
 const x=player.x-Math.sin(player.yaw)*cp*t;
 const y=eye+Math.sin(player.pitch)*t;
 const half=SOFT_WALL.columns*SOFT_WALL.cell/2;
 if(Math.abs(x-SOFT_WALL.x)>half-.2||y<.32||y>SOFT_WALL.rows*SOFT_WALL.cell-.18)
  return {point:null,reason:"AIM AT THE MIDDLE OF THE WALL"};
 const reinforcement=context?.reinforcementState;
 if(reinforcement?.installed&&reinforcement.electrified)
  return {point:null,reason:"ELECTRIFIED STEEL · HARD BREACH BLOCKED"};
 const inExistingHole=reinforcement?.installed&&reinforcement.breach&&
  x>reinforcement.breach.left&&x<reinforcement.breach.right&&
  y<reinforcement.breach.top;
 if(inExistingHole)
  return {point:null,reason:"STEEL ALREADY BREACHED · AIM AT INTACT PANEL"};
 const col=Math.floor((x-(SOFT_WALL.x-half))/SOFT_WALL.cell);
 const row=Math.floor(y/SOFT_WALL.cell);
 const idx=softWallIndex(col,row);
 if(idx<0)return {point:null,reason:"NO WALL SURFACE"};
 if(!reinforcement?.installed&&!context?.softState?.solid?.[idx])
  return {point:null,reason:"GYPSUM ALREADY OPEN · NO SURFACE"};
 return {point:{x,y,z:SOFT_WALL.z,side:player.z>SOFT_WALL.z?1:-1,
  onSteel:Boolean(reinforcement?.installed),index:idx},
  reason:"HARD BREACH PLACEMENT READY"};
}
export function placeHardBreach(state,player,context={}){
 if(!state||state.charges<=0)
  return {state,device:null,reason:"NO HARD BREACH CHARGES LEFT"};
 if(state.devices.some(d=>d.armed))
  return {state,device:null,reason:"DETONATE OR RECOVER THE EXISTING CHARGE"};
 const p=placement(player,context);
 if(!p.point)return {state,device:null,reason:p.reason};
 const d={id:state.nextId,...p.point,armed:true,installed:false,
  progress:0,countdown:null};
 return {state:{...state,charges:state.charges-1,nextId:state.nextId+1,
  devices:[...state.devices,d]},device:d,
  reason:"HARD BREACH PLANTING · 1.45S"};
}
export function armHardBreach(state){
 const d=state?.devices?.find(d=>d.armed);
 if(!d)return {state,ok:false,reason:"PLANT A HARD BREACH FIRST"};
 if(!d.installed)return {state,ok:false,reason:"HARD BREACH STILL INSTALLING"};
 if(d.countdown!==null)return {state,ok:false,reason:"HARD BREACH ALREADY COUNTING DOWN"};
 return {state:{...state,devices:state.devices.map(item=>
  item.id===d.id?{...item,countdown:HARD_BREACH.detonationDelay}:item)},
  ok:true,reason:"HARD BREACH ACTIVATED · 1.1S TO DETONATION"};
}
export function tickHardBreach(state,dt){
 const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
 if(!state||!step)return {state,blasts:[]};
 const blasts=[];
 const devices=state.devices.flatMap(d=>{
  if(!d.armed)return [];
  if(!d.installed){
   const progress=Math.min(HARD_BREACH.installSeconds,d.progress+step);
   return [{...d,progress,installed:progress+1e-8>=HARD_BREACH.installSeconds}];
  }
  if(d.countdown===null)return [d];
  const countdown=d.countdown-step;
  if(countdown>1e-8)return [{...d,countdown}];
  blasts.push({id:d.id,x:d.x,y:d.y,z:d.z,radius:HARD_BREACH.radius,
   damage:HARD_BREACH.damage,fullDamageRadius:.25,
   lethalRadius:HARD_BREACH.lethalRadius,onSteel:d.onSteel});
  return [];
 });
 return {state:{...state,devices},blasts};
}
export function pickupHardBreach(state,id,player){
 const d=state?.devices?.find(d=>d.id===id&&d.armed);
 if(!d)return {state,device:null,reason:"NO ARMED HARD BREACH CHARGE"};
 if(!player||![player.x,player.y,player.z].every(Number.isFinite))
  return {state,device:null,reason:"INVALID PICKUP POSITION"};
 const eye=player.y+(player.prone?.44:player.crouched?1.08:1.65);
 if(Math.hypot(player.x-d.x,eye-d.y,player.z-d.z)>HARD_BREACH.pickupRange)
  return {state,device:null,reason:"GET CLOSER TO HARD BREACH"};
 return {state:{...state,charges:Math.min(HARD_BREACH.charges,state.charges+1),
  devices:state.devices.filter(x=>x.id!==id)},device:d,
  reason:"HARD BREACH RECOVERED · +1 CHARGE"};
}
