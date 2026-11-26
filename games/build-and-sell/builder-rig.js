
import {THREE} from "../../engine/core.js";
import {AnimationController} from "../../engine/animation.js";
import {clamp,STAND,CROUCH} from "./movement.mjs";
export const CHARACTER_HEADING=-Math.PI/2;
export const CHARACTER_HEIGHT=1.78;
const euler=new THREE.Euler(0,0,0,"YXZ"),worldQ=new THREE.Quaternion(),parentQ=new THREE.Quaternion();
function hideHead(instance){
 const owned=[];
 instance.model.traverse(mesh=>{
  if(!mesh.isSkinnedMesh)return;
  const source=mesh.geometry,indices=source.getIndex(),joints=source.getAttribute("skinIndex"),weights=source.getAttribute("skinWeight");
  if(!indices||!joints||!weights)return;
  const headIds=new Set(mesh.skeleton.bones.map((b,i)=>/^(Head|HeadTop_End)$/i.test(b.name)?i:-1).filter(i=>i>=0));
  if(!headIds.size)throw Error("Character head bone missing");
  const masked=new Uint8Array(joints.count);
  for(let i=0;i<joints.count;i++){let weight=0;for(let k=0;k<4;k++){const j=joints.getComponent(i,k);if(headIds.has(j))weight+=weights.getComponent(i,k);}if(weight>.12)masked[i]=1;}
  const filtered=[];
  for(let i=0;i<indices.count;i+=3){const a=indices.getX(i),b=indices.getX(i+1),c=indices.getX(i+2);if(!masked[a]&&!masked[b]&&!masked[c])filtered.push(a,b,c);}
  if(!filtered.length||filtered.length===indices.count)throw Error("Could not isolate local head geometry");
  const geo=source.clone();geo.setIndex(filtered);geo.clearGroups();mesh.geometry=geo;owned.push(geo);
 });
 if(!owned.length)throw Error("No skinned body geometry to display");
 return owned;
}
export function createBuilder(asset,scene,{local=false}={}){
 const model=asset.createInstance({height:CHARACTER_HEIGHT,heading:CHARACTER_HEADING});
 let anim,owned=[];
 try{
  if(local)owned=hideHead(model);
  anim=new AnimationController(model.root,{clips:model.clips,fadeSeconds:.16});
  anim.playLoop("idle");
  const head=model.model.getObjectByName("Head");
  if(!head?.isBone)throw Error("Head rig missing");
  scene.add(model.root);
  return {model,anim,head,local,baseHead:head.quaternion.clone(),lastHead:null,dispose(){anim.dispose();for(const g of owned)g.dispose();model.dispose();}};
 }catch(e){anim?.dispose();for(const g of owned)g.dispose();model.dispose();throw e;}
}
export function animateBuilder(a,p,dt){
 const r=a.model.root;r.position.set(p.x,p.y,p.z);r.rotation.y=p.yaw;
 const goal=a.local?clamp((p.eye||STAND)/STAND,CROUCH/STAND,1):p.crouch?CROUCH/STAND:1;
 r.scale.y+=(goal-r.scale.y)*(1-Math.exp(-16*dt));
 const mode0=p.mode==="crouchWalk"?"walk":p.mode==="crouch"?"idle":p.mode;
 const mode=a.anim.has(mode0)?mode0:"idle";
 // Restore the unmodified animated pose before updating the mixer.
 if(a.lastHead)a.head.quaternion.copy(a.lastHead);
 a.anim.playLoop(mode,{speed:mode==="walk"?(p.crouch?.55:clamp(p.speed/3.25,.6,1.4)):1});
 a.anim.update(dt);
 a.lastHead=a.head.quaternion.clone();
 // The rig's Head bone faces local +Z, unlike the camera's local -Z.
 // Use world-space camera yaw/pitch to drive that bone, not its arbitrary local axes.
 r.updateWorldMatrix(true,true);
 a.head.parent.getWorldQuaternion(parentQ).invert();
 euler.set(-clamp(p.pitch,-1.44,1.44),p.yaw+Math.PI,0,"YXZ");
 worldQ.setFromEuler(euler);
 a.head.quaternion.copy(parentQ.multiply(worldQ));
 a.head.updateMatrixWorld(true);
}
