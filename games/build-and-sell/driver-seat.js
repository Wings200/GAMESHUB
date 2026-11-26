
import {THREE} from "../../engine/core.js";
import {animateBuilder} from "./builder-rig.js?v=3";
const UP=new THREE.Vector3(0,1,0),v=new THREE.Vector3(),q=new THREE.Quaternion(),d=new THREE.Quaternion(),parent=new THREE.Quaternion(),pos=new THREE.Vector3(),hip=new THREE.Vector3();
const seated=new WeakMap();
function aim(bone,x,y,z,yaw){if(!bone)return;bone.updateWorldMatrix(true,false);bone.getWorldQuaternion(q);v.set(x,y,z).applyAxisAngle(UP,yaw).normalize();d.setFromUnitVectors(UP.clone().applyQuaternion(q).normalize(),v);q.premultiply(d);bone.parent.getWorldQuaternion(parent).invert();bone.quaternion.copy(parent.multiply(q));bone.updateWorldMatrix(false,true);}
export function restoreSeat(builder){const s=seated.get(builder);if(!s)return;for(const [b,r] of s)b.quaternion.copy(r);seated.delete(builder);}
export function poseDriver(builder,machine,yaw,ground,dt){
 restoreSeat(builder);
 animateBuilder(builder,{x:machine.x,y:ground,z:machine.z,yaw,pitch:0,eye:1.68,crouch:false,mode:"idle",speed:0},dt);
 const model=builder.model.model,root=builder.model.root,save=[];
 function set(name,x,y,z){const b=model.getObjectByName(name);if(b){save.push([b,b.quaternion.clone()]);aim(b,x,y,z,yaw);}}
 for(const [side,sign] of [["Left",-1],["Right",1]]){set(side+"UpLeg",sign*.13,-.10,-1);set(side+"Leg",0,-1,-.18);set(side+"Foot",0,-.12,-1);set(side+"Arm",sign*.28,-.67,-.63);set(side+"ForeArm",-sign*.1,.06,-1);}
 seated.set(builder,save);
 // Anchor the skeleton pelvis to the real seat, not to the ground.
 const hips=model.getObjectByName("Hips");if(hips){root.updateWorldMatrix(true,true);hips.getWorldPosition(hip);pos.set(-.49,1.73,-.06).applyAxisAngle(UP,yaw).add(new THREE.Vector3(machine.x,ground,machine.z));root.position.add(pos.sub(hip));root.updateMatrixWorld(true);}
}
