// BLACKOUT V0.19.0 · real attached soft-breach charges; pick up before detonation.
import {SOFT_WALL,softWallIndex} from "./soft-wall.js?v=reboot-016";
import {BARRICADE,boardBounds} from "./barricade.js?v=reboot-029";

export const SOFT_BREACH=Object.freeze({
 charges:2,range:2.75,pickupRange:2.7,installSeconds:.9,
 radiusSoft:1.55,radiusWood:2.7,blastDamage:150,lethalRadius:1.0
});
export function newSoftBreachState(){
 return {charges:SOFT_BREACH.charges,nextId:1,devices:[]};
}
const validPlayer=p=>p&&[p.x,p.y,p.z,p.yaw,p.pitch].every(Number.isFinite);
function faceHit(player,z){
 const cy=Math.cos(player.yaw),cp=Math.cos(player.pitch);
 const dz=-cy*cp;
 if(Math.abs(dz)<.00001)return null;
 const eyeY=player.y+(player.prone?.44:player.crouched?1.08:1.65);
 const t=(z-player.z)/dz;
 if(t<.2||t>SOFT_BREACH.range)return null;
 return {x:player.x-Math.sin(player.yaw)*cp*t,
  y:eyeY+Math.sin(player.pitch)*t,
  z,t,side:player.z>z?1:-1};
}
function hitTarget(player,context={}){
 if(!validPlayer(player))return {target:null,reason:"INVALID PLACEMENT AIM"};
 const candidates=[];
 const soft=faceHit(player,SOFT_WALL.z);
 if(soft&&soft.y>=.15&&soft.y<=SOFT_WALL.rows*SOFT_WALL.cell-.14&&
  Math.abs(soft.x-SOFT_WALL.x)<SOFT_WALL.columns*SOFT_WALL.cell/2-.16){
  if(context.reinforced)return {target:null,reason:"REINFORCED WALL · SOFT BREACH BLOCKED"};
  const col=Math.floor((soft.x-(SOFT_WALL.x-SOFT_WALL.columns*SOFT_WALL.cell/2))/SOFT_WALL.cell);
  const row=Math.floor(soft.y/SOFT_WALL.cell),index=softWallIndex(col,row);
  if(index>=0&&context.softState?.solid?.[index])candidates.push({...soft,type:"soft",index});
 }
 const wood=faceHit(player,BARRICADE.z);
 if(wood&&Math.abs(wood.x-BARRICADE.x)<BARRICADE.openingWidth/2-.12&&
  wood.y>=.13&&wood.y<=BARRICADE.openingHeight-.07){
  const board=Array.from({length:BARRICADE.boardCount},(_,i)=>i).find(i=>{
   const b=boardBounds(i);
   return wood.y>=b.bottom&&wood.y<=b.top&&context.barricadeState?.boards?.[i]>0;
  });
  if(board!==undefined)candidates.push({...wood,type:"wood",index:board});
 }
 candidates.sort((a,b)=>a.t-b.t);
 if(!candidates.length)return {target:null,reason:"AIM AT AN INTACT SOFT WALL OR WOODEN BARRICADE WITHIN 2.75M"};
 return {target:candidates[0],reason:"READY TO PLANT"};
}
export function placeSoftBreach(state,player,context={}){
 if(!state||state.charges<=0)return {state,device:null,reason:"NO SOFT BREACH CHARGES LEFT"};
 if(state.devices.some(d=>d.armed))
  return {state,device:null,reason:"DETONATE OR PICK UP THE ACTIVE BREACH FIRST"};
 const result=hitTarget(player,context);
 if(!result.target)return {state,device:null,reason:result.reason};
 const target=result.target;
 const d={id:state.nextId,type:target.type,x:target.x,y:target.y,z:target.z,
  side:target.side,index:target.index,armed:true,progress:0,installed:false};
 return {state:{...state,nextId:state.nextId+1,charges:state.charges-1,
  devices:[...state.devices,d]},device:d,reason:"PLANTING SOFT BREACH · 0.9S"};
}
export function tickSoftBreach(state,dt){
 if(!state||!Number.isFinite(dt)||dt<=0)return state;
 const step=Math.min(.05,Math.max(0,dt));
 return {...state,devices:state.devices.map(d=>{
  if(!d.armed||d.installed)return d;
  const progress=Math.min(SOFT_BREACH.installSeconds,d.progress+step);
  return {...d,progress,installed:progress+1e-8>=SOFT_BREACH.installSeconds};
 })};
}
export function pickupSoftBreach(state,id,player){
 const d=state?.devices?.find(d=>d.id===id&&d.armed);
 if(!d)return {state,device:null,reason:"NO ACTIVE BREACH CHARGE"};
 if(!player||![player.x,player.y,player.z].every(Number.isFinite))
  return {state,device:null,reason:"INVALID PICKUP LOCATION"};
 const eyeY=player.y+(player.prone?.44:player.crouched?1.08:1.65);
 if(Math.hypot(player.x-d.x,eyeY-d.y,player.z-d.z)>SOFT_BREACH.pickupRange)
  return {state,device:null,reason:"MOVE CLOSER TO BREACH CHARGE"};
 return {state:{...state,charges:Math.min(SOFT_BREACH.charges,state.charges+1),
  devices:state.devices.filter(v=>v.id!==id)},device:d,
  reason:"SOFT BREACH RECOVERED · +1 CHARGE"};
}
export function detonateSoftBreach(state){
 const active=state?.devices?.find(d=>d.armed);
 if(!active)return {state,blast:null,reason:"PLANT SOFT BREACH FIRST"};
 if(!active.installed)return {state,blast:null,reason:"BREACH PLACEMENT IN PROGRESS"};
 const radius=active.type==="wood"?SOFT_BREACH.radiusWood:SOFT_BREACH.radiusSoft;
 return {state:{...state,devices:state.devices.filter(d=>d.id!==active.id)},
  blast:{id:active.id,type:active.type,x:active.x,y:active.y,z:active.z,
   radius,damage:SOFT_BREACH.blastDamage,fullDamageRadius:.35,
   lethalRadius:SOFT_BREACH.lethalRadius},reason:"SOFT BREACH DETONATED"};
}
