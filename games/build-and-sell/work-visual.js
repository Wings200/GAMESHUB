
import {THREE} from "../../engine/core.js";
import {WORK_LABELS,workPulse} from "./work-activity.mjs?v=98";
export function makePeerWork(scene,builder){
 const model=builder.model.model,arm=model.getObjectByName("RightArm"),fore=model.getObjectByName("RightForeArm"),left=model.getObjectByName("LeftArm"),leftFore=model.getObjectByName("LeftForeArm");
 const bones=[arm,fore,left,leftFore],up=new THREE.Vector3(0,1,0),q=new THREE.Quaternion(),parent=new THREE.Quaternion(),delta=new THREE.Quaternion(),v=new THREE.Vector3();
 let saved=null,label="";
 const canvas=document.createElement("canvas");canvas.width=512;canvas.height=96;const ctx=canvas.getContext("2d"),tex=new THREE.CanvasTexture(canvas);
 const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:true,depthWrite:false}));tag.position.y=2.35;tag.scale.set(1.45,.27,1);tag.visible=false;builder.model.root.add(tag);
 function aim(b,x,y,z,yaw){if(!b||!b.parent)return;b.updateWorldMatrix(true,false);b.getWorldQuaternion(q);v.set(x,y,z).applyAxisAngle(up,yaw).normalize();delta.setFromUnitVectors(up.clone().applyQuaternion(q).normalize(),v);q.premultiply(delta);b.parent.getWorldQuaternion(parent).invert();b.quaternion.copy(parent.multiply(q));b.updateWorldMatrix(false,true);}
 function restore(){if(saved){bones.forEach((b,i)=>{if(b&&saved[i])b.quaternion.copy(saved[i]);});saved=null;}}
 function update(work,p,elapsed,gesture=true){
  tag.visible=!!work;
  if(!work)return 0;
  const next=WORK_LABELS[work.tool]||"Working";
  if(next!==label){label=next;ctx.clearRect(0,0,512,96);ctx.fillStyle="#182532e8";ctx.fillRect(0,0,512,96);ctx.fillStyle="#ffc24f";ctx.fillRect(0,0,9,96);ctx.font="bold 37px system-ui";ctx.fillStyle="#f7f6f0";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,262,48,468);tex.needsUpdate=true;}
  const phase=workPulse(work,elapsed);
  if(!gesture||!arm||!fore)return phase;
  saved=bones.map(b=>b?.quaternion.clone());
  const low=["floor","landscape","furniture"].includes(work.tool),high=work.tool==="roof",paint=work.tool==="paint"||work.tool==="finish";
  const y=low?-.85:high?.30:paint?-.20+phase*.65:-.30+phase*.2;
  aim(arm,.18,y,-.75,p.yaw);aim(fore,-.10,y+.20+phase*.18,-.94,p.yaw);
  if(["drywall","joinery","roof","furniture","fixture","heater","floor","landscape"].includes(work.tool)){aim(left,-.23,y,-.64,p.yaw);aim(leftFore,.08,y+.24,-.84,p.yaw);}
  return phase;
 }
 return {restore,update,dispose(){restore();tag.removeFromParent();tag.material.dispose();tex.dispose();}};
}
