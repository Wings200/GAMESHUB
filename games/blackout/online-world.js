// BLACKOUT · shared, server-authoritative room interaction primitives.
// Both online and custom rooms use these same world-state rules.
import {roundSiteAt} from "./reboot/bomb-round.js";

export const PREP_SECONDS=45, ACTION_SECONDS=180, PLANT_SECONDS=7.35, DISABLE_SECONDS=7;
export function createOnlineWorld(map,players,now=Date.now()){
 const carrier=players.find(p=>p.side==="attacker")?.id||null;
 return {sitePair:map.sitePairs?.[0]?.id||null,barricades:{},walls:{},
  charges:[],interactions:{},nextCharge:1,
  bomb:{phase:carrier?"carried":"unassigned",carrierId:carrier,
   site:null,position:null,plantedAt:0,expiresAt:0},createdAt:now};
}
export function wallParts(map,world){
 const output=[];
 for(const p of map.elements){
  if(p.type==="softWall"){
   const state=world?.walls?.[p.id];
   if(state==="open")continue;
   if(state==="reinforced"){output.push({...p,type:"reinforcedWall"});continue;}
  }
  output.push(p);
  if((p.type==="door"||p.type==="window")&&(world?.barricades?.[p.id]||0)>0)
   output.push({...p,id:"barricade:"+p.id,type:"hardWall",
    position:{...p.position,y:p.position.y+.34},
    size:{...p.size,y:Math.max(1.1,p.size.y-.34)}});
 }
 return output;
}
export function droneObstacles(map,world){
 const result=[];
 for(const p of wallParts(map,world)){
  if(!["hardWall","softWall","reinforcedWall","cover","railing","floor","stairs"].includes(p.type))continue;
  // The original house stair is a sloped walkable surface, not a solid
  // three-metre wall. Its height is resolved by houseFloorAt in the Worker.
  if(map.id==="blackout-original-house"&&p.type==="stairs")continue;
  const a=(p.rotationY||0)*Math.PI/180;
  const sideways=Math.abs(Math.sin(a))>.7;
  const width=sideways?p.size.z:p.size.x,depth=sideways?p.size.x:p.size.z;
  const bottom=p.type==="floor"?p.position.y-p.size.y:p.position.y;
  const top=p.type==="floor"?p.position.y:p.position.y+p.size.y;
  result.push({x:p.position.x,z:p.position.z,width,depth,bottom,height:top});
 }
 return result;
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function nearestPart(map,world,p,types,max=2.5){
 let selected=null,score=Infinity;
 for(const item of map.elements){
  if(!types.includes(item.type))continue;
  const d=dist(p,item.position);
  const close=d-Math.max(item.size.x,item.size.z)/2;
  const height=Math.abs((p.y||0)-item.position.y);
  if(height>1.6||close>max)continue;
  const dx=item.position.x-p.x,dz=item.position.z-p.z;
  const sight=(-Math.sin(p.yaw)*dx-Math.cos(p.yaw)*dz)/Math.max(.01,d);
  if(d>1.1&&sight<.12)continue;
  if(d<score){score=d;selected=item;}
 }
 return selected;
}
const groundPair=(map,world)=>map.sitePairs?.find(p=>p.id===world.sitePair)||map.sitePairs?.[0];
export function nearBombSite(map,world,p){
 // The original house enforces exact room bounds and floor height.
 // The circular site marker alone would permit planting from the corridor
 // or through the upstairs floor near a bomb.
 if(map.id==="blackout-original-house")return roundSiteAt(p,"house")?.id||null;
 const pair=groundPair(map,world);
 if(!pair)return null;
 for(const site of ["A","B"]){
  const point=pair[site];
  if(Math.abs(p.y-point.y)<1.5&&dist(p,point)<=(point.plantRadius||3))return site;
 }
 return null;
}
export function interactStart(map,world,p,players,now=Date.now()){
 if(!p.alive)return "NOT ALIVE";
 const b=world.bomb;
 if(p.side==="attacker"){
  if(b.phase==="dropped"&&b.position&&dist(p,b.position)<1.8&&
    Math.abs(p.y-b.position.y)<1.5){
   b.phase="carried";b.carrierId=p.id;b.position=null;return "DEFUSER PICKED UP";
  }
  const site=b.carrierId===p.id&&b.phase==="carried"?nearBombSite(map,world,p):null;
  if(site){world.interactions[p.id]={kind:"plant",site,endsAt:now+PLANT_SECONDS*1000,
    x:p.x,y:p.y,z:p.z};return "PLANTING · HOLD F";}
 }else{
  if(b.phase==="planted"&&b.position&&dist(p,b.position)<2.25&&
    Math.abs(p.y-b.position.y)<1.4){
   world.interactions[p.id]={kind:"disable",endsAt:now+DISABLE_SECONDS*1000,
    x:p.x,y:p.y,z:p.z};return "DISABLING · HOLD F";
  }
  const door=nearestPart(map,world,p,["door","window"],2.0);
  if(door){
   const old=world.barricades[door.id]||0;
   world.interactions[p.id]={kind:old?"remove-barricade":"barricade",
    target:door.id,endsAt:now+(old?1200:2500),x:p.x,y:p.y,z:p.z};
   return old?"REMOVING BARRICADE · HOLD F":"BARRICADING · HOLD F";
  }
  const wall=nearestPart(map,world,p,["softWall"],2);
  if(wall&&!(world.walls[wall.id])){
   world.interactions[p.id]={kind:"reinforce",target:wall.id,endsAt:now+3000,
    x:p.x,y:p.y,z:p.z};return "REINFORCING · HOLD F";
  }
 }
 return "NO INTERACTION IN RANGE";
}
export function interactStop(world,id){if(world.interactions[id])delete world.interactions[id];}
export function resolveInteractions(map,world,players,now=Date.now()){
 let completed=[];
 for(const [id,job] of Object.entries(world.interactions)){
  if(now<job.endsAt)continue;
  delete world.interactions[id];
  const p=players.find(x=>x.id===id);
  if(!p||!p.alive||dist(p,job)>1.35||Math.abs(p.y-job.y)>1.25)continue;
  if(job.kind==="plant"){
   if(world.bomb.phase!=="carried"||world.bomb.carrierId!==id||
      nearBombSite(map,world,p)!==job.site)continue;
   world.bomb={phase:"planted",carrierId:null,site:job.site,
    position:{x:p.x,y:p.y,z:p.z},plantedAt:now,expiresAt:now+45000};
   completed.push({kind:"planted",from:id});
  }else if(job.kind==="disable"){
   if(world.bomb.phase!=="planted"||!world.bomb.position||
      dist(p,world.bomb.position)>2.25)continue;
   world.bomb.phase="disabled";world.bomb.expiresAt=0;
   completed.push({kind:"disabled",from:id,winner:"defender"});
  }else if(job.kind==="barricade"){
   const part=map.elements.find(e=>e.id===job.target);
   if(part&&!(world.barricades[part.id])){world.barricades[part.id]=3;completed.push({kind:"barricaded",from:id})}
  }else if(job.kind==="remove-barricade"){
   delete world.barricades[job.target];completed.push({kind:"removed",from:id});
  }else if(job.kind==="reinforce"){
   const part=map.elements.find(e=>e.id===job.target);
   if(part&&!(world.walls[part.id])){world.walls[part.id]="reinforced";completed.push({kind:"reinforced",from:id})}
  }
 }
 return completed;
}
export function meleeWorld(map,world,p){
 const part=nearestPart(map,world,p,["door","window"],2);
 if(!part||(world.barricades[part.id]||0)<1)return null;
 const next=--world.barricades[part.id];
 if(next<=0)delete world.barricades[part.id];
 return {kind:next>0?"barricade-hit":"barricade-destroyed",target:part.id,health:Math.max(0,next)};
}
export function placeCharge(map,world,p){
 if(p.side!=="attacker"||!p.alive)return null;
 const part=nearestPart(map,world,p,["softWall"],2.1);
 if(!part||world.walls[part.id]==="open")return null;
 if(world.walls[part.id]==="reinforced"&&p.operator!=="thermite")return null;
 const deployed=world.charges.filter(c=>c.owner===p.id).length;
 if(deployed>=2||world.charges.some(c=>!c.detonated&&c.target===part.id))return null;
 const id="charge-"+world.nextCharge++;
 const charge={id,owner:p.id,target:part.id,position:{...part.position},detonated:false};
 world.charges.push(charge);return charge;
}
export function detonateCharge(map,world,p){
 const charge=world.charges.find(c=>c.owner===p.id&&!c.detonated);
 if(!charge)return null;
 charge.detonated=true;
 world.walls[charge.target]="open";
 return {kind:"breach",target:charge.target,from:p.id};
}
export function dropDefuser(world,p){
 if(world.bomb.phase!=="carried"||world.bomb.carrierId!==p.id)return false;
 world.bomb.phase="dropped";world.bomb.carrierId=null;
 world.bomb.position={x:p.x,y:p.y,z:p.z};return true;
}
export function ensureCarrier(world,players){
 if(world.bomb.phase!=="unassigned")return;
 const holder=players.find(p=>p.side==="attacker"&&p.alive);
 if(holder){world.bomb.phase="carried";world.bomb.carrierId=holder.id;}
}
