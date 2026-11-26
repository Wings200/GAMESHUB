
import {THREE} from "../../engine/core.js";
import {groundHeight} from "./terrain.mjs";
const m=(color,metalness=0)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.65}),yellow=m(0xe5ab2f),black=m(0x282d2c),metal=m(0x78817d,.65),red=m(0xaa3b28),rubber=m(0x383a36);
const up=new THREE.Vector3(0,1,0),v=new THREE.Vector3(),q=new THREE.Quaternion(),dq=new THREE.Quaternion(),pq=new THREE.Quaternion();
function box(g,w,h,d,mat,x,y,z){const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;g.add(a);return a;}
function rod(g,a,b,r,mat){const d=b.clone().sub(a),o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),12),mat);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(up,d.normalize());o.castShadow=true;g.add(o);}
export function makePlate(scene){
 const root=new THREE.Group(),motor=new THREE.Group();root.add(motor);scene.add(root);root.visible=false;
 box(root,.67,.08,.84,metal,0,.05,0);box(root,.66,.07,.11,metal,0,.11,-.39);box(root,.58,.13,.64,yellow,0,.15,0);
 box(motor,.44,.33,.43,black,0,.37,-.04);box(motor,.32,.14,.34,red,0,.60,-.02);box(motor,.12,.035,.13,black,.09,.69,-.04);
 for(let i=0;i<6;i++)box(motor,.025,.18,.27,metal,.23,.36,-.04+i*.006);
 box(motor,.11,.19,.17,metal,-.26,.39,-.04);box(motor,.055,.11,.10,black,-.31,.46,-.07);
 for(const x of [-.23,.23])rod(root,new THREE.Vector3(x,.23,.22),new THREE.Vector3(x,1.05,.65),.027,metal);
 rod(root,new THREE.Vector3(-.27,1.05,.65),new THREE.Vector3(.27,1.05,.65),.034,rubber);
 const dust=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.035,0),new THREE.MeshBasicMaterial({color:0xc3bba9,transparent:true,opacity:.42,depthWrite:false}),22);scene.add(dust);dust.frustumCulled=false;dust.visible=false;const obj=new THREE.Object3D();
 return {update(p,active,working,t,visible=true){root.visible=visible;dust.visible=visible&&active&&working;if(!visible)return;const y=groundHeight(p.x,p.z);root.position.set(p.x,y,p.z);root.rotation.y=p.yaw;motor.position.y=active?Math.sin(t*.095)*.013:0;motor.rotation.z=active?Math.sin(t*.11)*.015:0;if(dust.visible){for(let i=0;i<22;i++){const f=(t*.0016+i/22)%1,a=i*2.399;obj.position.set(p.x+Math.cos(a)*(.2+f*.57),y+.07+f*.24,p.z+Math.sin(a)*(.2+f*.57));obj.scale.setScalar(1.8*(1-f)+.1);obj.updateMatrix();dust.setMatrixAt(i,obj.matrix);}dust.instanceMatrix.needsUpdate=true;}}};
}
function aim(b,d){if(!b)return;b.updateWorldMatrix(true,false);b.getWorldQuaternion(q);v.copy(up).applyQuaternion(q).normalize();dq.setFromUnitVectors(v,d.normalize());q.premultiply(dq);b.parent.getWorldQuaternion(pq).invert();b.quaternion.copy(pq.multiply(q));b.updateWorldMatrix(false,true);}
export function makePushPose(builder){const bones=[];for(const side of ["Left","Right"])for(const name of ["Arm","ForeArm"]){const b=builder.model.model.getObjectByName(side+name);if(b)bones.push({b,side,name});}let saved=[];return {restore(){for(const [b,r] of saved)b.quaternion.copy(r);saved=[];},update(p){for(const {b,side,name} of bones){saved.push([b,b.quaternion.clone()]);const s=side==="Left"?-1:1;aim(b,new THREE.Vector3(name==="Arm"?s*.25:-s*.12,name==="Arm"?-.72:.02,name==="Arm"?-.7:-1).applyAxisAngle(up,p.yaw));}}};}
