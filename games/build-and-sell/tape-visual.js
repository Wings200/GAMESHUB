
import {THREE} from "../../engine/core.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";
import {MAX_TAPE,tapeDistances,groundTarget} from "./tape-math.mjs?v=5";
import {groundHeight} from "./terrain.mjs";
const up=new THREE.Vector3(0,1,0),axis=new THREE.Vector3(0,1,0),dir=new THREE.Vector3(),side=new THREE.Vector3(),normal=new THREE.Vector3(),basis=new THREE.Matrix4(),parentQ=new THREE.Quaternion(),q=new THREE.Quaternion(),delta=new THREE.Quaternion(),current=new THREE.Vector3(),target=new THREE.Vector3(),temp=new THREE.Vector3(),camDir=new THREE.Vector3();
const rubber=new THREE.MeshStandardMaterial({color:0x262d2d,roughness:.83}),yellow=new THREE.MeshStandardMaterial({color:0xeab839,roughness:.48}),steel=new THREE.MeshStandardMaterial({color:0xaab3b4,metalness:.78,roughness:.35});
const markerMat=new THREE.MeshBasicMaterial({color:0xf4c65d,transparent:true,opacity:.85,depthWrite:false});
const aimMat=new THREE.MeshBasicMaterial({color:0xf4dd92,transparent:true,opacity:.75,depthWrite:false});
function markedTexture(metric){
 const c=document.createElement("canvas");c.width=128;c.height=1024;const g=c.getContext("2d");g.fillStyle="#edc14a";g.fillRect(0,0,128,1024);g.fillStyle="#29291d";const divisions=metric?100:96;
 for(let i=0;i<divisions;i++){const major=metric?i%10===0:i%8===0,medium=metric?i%5===0:i%4===0,y=i/divisions*1024;g.fillRect(0,y,major?64:medium?40:22,major?4:2);g.fillRect(128-(major?64:medium?40:22),y,major?64:medium?40:22,major?4:2);}
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapT=THREE.RepeatWrapping;tex.anisotropy=4;return tex;
}
let textures=null;
function box(parent,w,h,d,mat,x=0,y=0,z=0,r=0){const geometry=r?new RoundedBoxGeometry(w,h,d,3,r):new THREE.BoxGeometry(w,h,d);const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh}
function ring(scene,material){const o=new THREE.Mesh(new THREE.RingGeometry(.065,.085,28),material);o.rotation.x=-Math.PI/2;o.visible=false;scene.add(o);return o}
export function makeTapeVisual(scene,builder,{local=false}={}){
 const group=new THREE.Group();scene.add(group);group.visible=false;
 // Compact survey-tape case, held on the existing rig's right hand.
 box(group,.091,.088,.048,rubber,0,0,0,.013);box(group,.082,.078,.051,yellow,0,0,0,.010);
 box(group,.052,.054,.056,rubber,0,0,0,.009);box(group,.032,.012,.039,steel,0,-.038,-.028,.003);box(group,.035,.014,.015,rubber,0,.044,0,.003);
 if(!textures)textures={metric:markedTexture(true),imperial:markedTexture(false)};
 const stripMat=new THREE.MeshStandardMaterial({map:textures.imperial.clone(),side:THREE.DoubleSide,roughness:.65,metalness:.13});stripMat.map.needsUpdate=true;
 const strip=new THREE.Mesh(new THREE.PlaneGeometry(.026,1),stripMat);strip.visible=false;scene.add(strip);
 const hook=new THREE.Group();box(hook,.043,.018,.025,steel,0,.012,0);scene.add(hook);hook.visible=false;
 const endMark=ring(scene,markerMat),anchorMark=ring(scene,markerMat),aim=local?ring(scene,aimMat):null;
 const hand=builder.model.model.getObjectByName("RightHand"),arm=builder.model.model.getObjectByName("RightArm"),fore=builder.model.model.getObjectByName("RightForeArm");
 if(!hand||!arm||!fore)throw Error("Tape hand rig missing");
 let savedArm=null,savedFore=null,lastUnits="imperial";
 const end=new THREE.Vector3(),origin=new THREE.Vector3();
 function restore(){if(savedArm){arm.quaternion.copy(savedArm);fore.quaternion.copy(savedFore);savedArm=savedFore=null;}}
 // Use the rig's true limb bones, not separate first-person arms. Reorient
 // the existing animation's bone direction without changing lengths or twist.
 function pointBone(bone,v){
  bone.updateWorldMatrix(true,false);bone.getWorldQuaternion(q);current.copy(axis).applyQuaternion(q).normalize();
  delta.setFromUnitVectors(current,v);q.premultiply(delta);bone.parent.getWorldQuaternion(parentQ).invert();bone.quaternion.copy(parentQ.multiply(q));bone.updateWorldMatrix(false,true);
 }
 function hold(p){
  savedArm=arm.quaternion.clone();savedFore=fore.quaternion.clone();
  // Arms remain in the actual animated body; right elbow down and forward,
  // forearm raised into a working position visible when looking at the tool.
  target.set(.16,-.67,-.72).applyAxisAngle(up,p.yaw).normalize();pointBone(arm,target);
  target.set(-.12,.24,-.96).applyAxisAngle(up,p.yaw).normalize();pointBone(fore,target);
  hand.updateWorldMatrix(true,false);hand.getWorldPosition(end);hand.getWorldQuaternion(q);
  // Palm centre, a short distance beyond wrist along the finger axis.
  end.addScaledVector(temp.copy(axis).applyQuaternion(q),.055);
  group.position.copy(end);group.rotation.set(.05,p.yaw,0,"YXZ");
  end.add(temp.set(0,-.038,-.030).applyAxisAngle(up,p.yaw));
 }
 function update(state,p,camera=null){
  group.visible=state.equipped;strip.visible=hook.visible=endMark.visible=anchorMark.visible=false;if(aim)aim.visible=false;
  if(!state.equipped)return null;
  hold(p);
  let candidate=null;
  if(camera&&!state.anchor){camera.getWorldDirection(camDir);candidate=groundTarget(camera.position,camDir);if(candidate&&aim){aim.position.set(candidate.x,groundHeight(candidate.x,candidate.z)+.039,candidate.z);aim.visible=true;}}
  if(!state.anchor)return {candidate};
  const a=state.anchor;origin.set(a.x,groundHeight(a.x,a.z)+.025,a.z);
  const dist=tapeDistances(a,end);
  if(dist.length>MAX_TAPE+.001)return {dist,over:true};
  if(dist.length>.001){
   dir.subVectors(end,origin).normalize();side.crossVectors(dir,up);if(side.lengthSq()<.00001)side.set(1,0,0);else side.normalize();
   normal.crossVectors(side,dir).normalize();basis.makeBasis(side,dir,normal);
   strip.quaternion.setFromRotationMatrix(basis);strip.position.copy(origin).add(end).multiplyScalar(.5);strip.scale.y=dist.length;strip.visible=true;
   if(lastUnits!==state.units){stripMat.map.dispose();stripMat.map=textures[state.units].clone();stripMat.map.needsUpdate=true;stripMat.needsUpdate=true;lastUnits=state.units;}
   stripMat.map.repeat.y=dist.length/(state.units==="metric"?1:.3048);stripMat.map.offset.y=0;
  }
  hook.position.copy(origin);hook.visible=true;anchorMark.position.set(a.x,groundHeight(a.x,a.z)+.039,a.z);anchorMark.visible=true;endMark.position.set(end.x,groundHeight(end.x,end.z)+.039,end.z);endMark.visible=true;
  return {dist};
 }
 function dispose(){restore();for(const o of [group,strip,hook,endMark,anchorMark,aim])if(o){o.removeFromParent();o.traverse(n=>n.geometry?.dispose());}stripMat.map.dispose();stripMat.dispose();}
 return {update,restore,dispose};
}
