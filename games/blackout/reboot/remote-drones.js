// Server-authoritative attacker drones inside the ORIGINAL 3D house.
// Local drones keep their separate camera/physics controller.
import {createDroneView} from "./drone-view.js";

export function createRemoteDrones(THREE,scene){
 const peers=new Map();
 function remove(key){
  const item=peers.get(key);if(!item)return;
  item.view.dispose();peers.delete(key);
 }
 function sync(players,selfId){
  const present=new Set();
  for(const player of players||[]){
   if(String(player.id)===String(selfId)||player.side!=="attacker")continue;
   (player.drones||[]).forEach((drone,index)=>{
    if(!drone?.deployed)return;
    const owner=String(player.id),key=owner+":"+index;
    present.add(key);
    let item=peers.get(key);
    if(!item){
     const view=createDroneView(THREE,scene);
     for(const mesh of view.shootables)mesh.userData.onlineDroneOwnerId=owner;
     view.place(drone);
     item={view,current:{...drone},target:drone};peers.set(key,item);
    }
    item.target=drone;
   });
  }
  for(const key of peers.keys())if(!present.has(key))remove(key);
 }
 function tick(dt){
  const alpha=Math.min(1,Math.max(0,dt)*16);
  for(const item of peers.values()){
   const c=item.current,t=item.target;
   for(const axis of ["x","y","z"])c[axis]+=(t[axis]-c[axis])*alpha;
   const difference=Math.atan2(Math.sin(t.yaw-c.yaw),Math.cos(t.yaw-c.yaw));
   c.yaw+=difference*alpha;
   c.deployed=Boolean(t.deployed);
   item.view.update(c,dt);
  }
 }
 function shootables(){
  return [...peers.values()].filter(x=>x.view.root.visible)
   .flatMap(x=>x.view.shootables);
 }
 function clear(){for(const key of [...peers.keys()])remove(key)}
 return {sync,tick,shootables,clear};
}
