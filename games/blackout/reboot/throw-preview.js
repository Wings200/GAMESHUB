// BLACKOUT V0.18.1 · aim-while-held trajectory preview, same live throwable physics.
// This never consumes inventory or spawns actual devices. It predicts using
// the exact corresponding throw() and tick() functions for each gadget.
export const THROW_PREVIEW_IDS=Object.freeze(["frag","flash","smoke","impact","c4"]);
export function canPreviewThrow(id,charges,hasArmedC4=false){
 return THROW_PREVIEW_IDS.includes(id)&&Number.isFinite(charges)&&charges>0&&
  !(id==="c4"&&hasArmedC4);
}
export function traceThrownGadget({makeState,thrower,stepper,player,obstacles=[]}, {
 dt=.05,maxSeconds=4.5
}={}){
 if(typeof makeState!=="function"||typeof thrower!=="function"||
    typeof stepper!=="function")return null;
 const created=thrower(makeState(),player);
 if(!created?.device)return null;
 let state=created.state;
 const id=created.device.id;
 const points=[{x:created.device.x,y:created.device.y,z:created.device.z}];
 let endKind="limit",time=0;
 const frame=Math.max(.01,Math.min(.05,Number.isFinite(dt)?dt:.05));
 const limit=Math.max(frame,Math.min(5,Number.isFinite(maxSeconds)?maxSeconds:4.5));
 for(let i=0;i<Math.ceil(limit/frame);i++){
  const result=stepper(state,frame,obstacles);
  state=result?.state||result;
  time+=(frame);
  const device=state.devices?.find(d=>d.id===id);
  // Impact explodes as soon as it makes contact with solid cover or floor.
  // Other grenades terminate at their fuse, and C4 sticks on contact.
  const event=(result?.blasts||result?.bursts||result?.spawned||[])
   .find(e=>e.id===id);
  // Smoke blooms ABOVE the landed canister. Mark the real projectile
  // endpoint, not the visually centered world cloud.
  const end=event?.projectileY!==undefined?
   {...event,y:event.projectileY}:event||device;
  if(end&&[end.x,end.y,end.z].every(Number.isFinite)){
   const last=points[points.length-1];
   if(Math.hypot(last.x-end.x,last.y-end.y,last.z-end.z)>1e-5)
    points.push({x:end.x,y:end.y,z:end.z});
  }
  if(event){endKind="detonate";break;}
  if(device?.stuck){endKind="land";break;}
  if(!device||!device.armed){endKind="finish";break;}
 }
 return {points,end:points[points.length-1],endKind,time};
}
