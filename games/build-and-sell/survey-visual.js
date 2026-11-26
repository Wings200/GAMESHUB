
import {THREE} from "../../engine/core.js";
import {groundHeight,aimGround} from "./terrain.mjs";
import {LASER_HEIGHT,surveyReading} from "./survey-math.mjs";
const up=new THREE.Vector3(0,1,0),a=new THREE.Vector3(),b=new THREE.Vector3(),direction=new THREE.Vector3(),q=new THREE.Quaternion(),pq=new THREE.Quaternion(),delta=new THREE.Quaternion();
const alloy=new THREE.MeshStandardMaterial({color:0xb1b6b5,metalness:.55,roughness:.37}),black=new THREE.MeshStandardMaterial({color:0x282f30,roughness:.8}),yellow=new THREE.MeshStandardMaterial({color:0xe4b94c,roughness:.45}),white=new THREE.MeshStandardMaterial({color:0xf1eee2,roughness:.65}),red=new THREE.MeshStandardMaterial({color:0xaa3029,roughness:.6}),green=new THREE.MeshBasicMaterial({color:0x62ff8c}),orange=new THREE.MeshBasicMaterial({color:0xffba55});
function mesh(parent,geo,mat,x=0,y=0,z=0){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
const box=(p,w,h,d,m,x=0,y=0,z=0)=>mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
function tube(parent,r,length,mat){return mesh(parent,new THREE.CylinderGeometry(r,r,length,10),mat)}
function segment(o,from,to){direction.subVectors(to,from);o.position.copy(from).addScaledVector(direction,.5);o.scale.y=direction.length();o.quaternion.setFromUnitVectors(up,direction.normalize());}
function rigTripod(scene){const root=new THREE.Group();scene.add(root);const top=new THREE.Group();root.add(top);top.position.y=LASER_HEIGHT-.19;
 const legs=[];for(let i=0;i<3;i++){const footAngle=i*Math.PI*2/3,leg=tube(root,.023,1,alloy),inner=tube(root,.014,1,black),foot=box(root,.08,.035,.10,black);legs.push({footAngle,leg,inner,foot});}
 box(top,.22,.045,.20,black,0,-.035,0);box(top,.18,.19,.18,yellow,0,.085,0);
 for(const x of [-.097,.097])box(top,.022,.17,.18,black,x,.085,0);
 const turret=mesh(top,new THREE.CylinderGeometry(.079,.079,.07,24),black,0,.19,0);mesh(turret,new THREE.BoxGeometry(.08,.027,.034),green,.045,0,0);
 return {root,legs,turret,update(station,elapsed){root.visible=!!station;if(!station)return;const y=groundHeight(station.x,station.z);root.position.set(station.x,y,station.z);for(const l of legs){const x=Math.cos(l.footAngle)*.51,z=Math.sin(l.footAngle)*.51;const h=groundHeight(station.x+x,station.z+z)-y;const from=a.set(x*.12,LASER_HEIGHT-.22,z*.12),to=b.set(x,h+.025,z);segment(l.leg,from,to);l.inner.position.copy(l.leg.position);l.inner.quaternion.copy(l.leg.quaternion);l.inner.scale.y=l.leg.scale.y*.68;l.foot.position.set(x,h+.02,z);}turret.rotation.y=elapsed*5;}};
}
function rodModel(scene){const root=new THREE.Group();scene.add(root);
 box(root,.055,2.65,.027,white,0,1.325,0);
 for(let i=0;i<27;i++){const y=.05+i*.095;box(root,i%5===0?.049:.025,.012,.003,red,0,y,-.015);if(i%5===0)box(root,.045,.012,.003,red,0,y,.015);}
 box(root,.075,.025,.065,black,0,.015,0);const receiver=new THREE.Group();root.add(receiver);box(receiver,.10,.15,.065,black);const light=box(receiver,.052,.049,.008,orange,0,0,-.037);
 return {root,receiver,light};
}
function aimMarker(scene){const ring=mesh(scene,new THREE.RingGeometry(.20,.25,32),new THREE.MeshBasicMaterial({color:0x7deda5,side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.visible=false;return ring;}
export function makeSurveyVisual(scene,builder,{local=false}={}){
 const tripod=rigTripod(scene),rod=rodModel(scene),marker=local?aimMarker(scene):null;
 tripod.root.visible=rod.root.visible=false;
 const upper=builder.model.model.getObjectByName("RightArm"),fore=builder.model.model.getObjectByName("RightForeArm"),hand=builder.model.model.getObjectByName("RightHand");
 let before=null;
 function restore(){if(before){upper.quaternion.copy(before[0]);fore.quaternion.copy(before[1]);before=null;}}
 function pointBone(bone,v){bone.updateWorldMatrix(true,false);bone.getWorldQuaternion(q);direction.copy(up).applyQuaternion(q).normalize();delta.setFromUnitVectors(direction,v);q.premultiply(delta);bone.parent.getWorldQuaternion(pq).invert();bone.quaternion.copy(pq.multiply(q));bone.updateWorldMatrix(false,true);}
 function update(state,p,elapsed,stations,camera=null){
  tripod.update(state.station,elapsed);rod.root.visible=state.mode==="rod";if(marker)marker.visible=false;
  if(state.mode==="laser"&&camera&&marker){camera.getWorldDirection(direction);const spot=aimGround(camera.position,direction);if(spot){marker.position.set(spot.x,groundHeight(spot.x,spot.z)+.025,spot.z);marker.visible=true;}return {spot};}
  if(state.mode!=="rod")return null;
  if(upper&&fore&&hand){before=[upper.quaternion.clone(),fore.quaternion.clone()];pointBone(upper,a.set(.25,-.60,-.76).applyAxisAngle(up,p.yaw).normalize());pointBone(fore,a.set(-.06,.18,-.98).applyAxisAngle(up,p.yaw).normalize());hand.getWorldPosition(a);}else a.set(p.x+.35,p.y+1,p.z-.45);
  // Rod foot is planted directly beneath the player's grip.
  const point={x:a.x,z:a.z},height=groundHeight(point.x,point.z);rod.root.position.set(point.x,height,point.z);rod.root.rotation.y=p.yaw;
  const station=stations.filter(Boolean).reduce((best,s)=>!best||Math.hypot(s.x-point.x,s.z-point.z)<Math.hypot(best.x-point.x,best.z-point.z)?s:best,null);
  const reading=surveyReading(station,point);rod.receiver.position.y=reading?reading.rod:1.35;rod.light.material=reading?green:orange;
  return {reading};
 }
 function dispose(){restore();for(const o of [tripod.root,rod.root,marker])if(o){o.removeFromParent();o.traverse(n=>{n.geometry?.dispose();});}}
 return {restore,update,dispose};
}
