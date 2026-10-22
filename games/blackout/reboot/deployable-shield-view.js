// BLACKOUT V0.24.0 · bulletproof 3D cover with protected transparent
// vision slits. Shared full-face raycast collider stays opaque to bullets.
import {DEPLOYABLE_SHIELD,shieldCollider,shieldCandidate,canPlaceShield}
 from "./deployable-shield.js?v=reboot-052";
export function createShieldView(THREE,scene,device){
 const root=new THREE.Group();
 root.name="BLACKOUT REAL BULLETPROOF SHIELD "+device.id;
 root.position.set(device.x,0,device.z);root.rotation.y=device.yaw;
 const armor=new THREE.MeshStandardMaterial({color:0x31444a,metalness:.82,roughness:.33});
 const rim=new THREE.MeshStandardMaterial({color:0x121f28,metalness:.68,roughness:.43});
 const glass=new THREE.MeshPhysicalMaterial({color:0x8fe7eb,transparent:true,
  opacity:.34,metalness:.3,roughness:.14,depthWrite:false,side:THREE.DoubleSide});
 const visorRim=new THREE.MeshStandardMaterial({color:0x99adac,metalness:.7,roughness:.25});
 const parts=[];
 function box(label,w,h,d,x,y,z,mat){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.name=label;mesh.position.set(x,y,z);mesh.castShadow=true;
  mesh.receiveShadow=true;root.add(mesh);parts.push(mesh);return mesh;
 }
 const W=DEPLOYABLE_SHIELD.width,H=DEPLOYABLE_SHIELD.height;
 // Thick steel framing with multiple clearly transparent viewing panels.
 box("SOLID BALLISTIC LOWER PLATE",W,.62,.15,0,.31,0,armor);
 box("SOLID TOP PLATE",W,.14,.15,0,H-.07,0,armor);
 for(const x of [-W/2+.075,W/2-.075])
  box("REINFORCED EDGE",.15,H,.16,x,H/2,0,rim);
 for(const x of [-.3,.3])
  box("WINDOW SEPARATOR",.08,.53,.14,x,.92,0,visorRim);
 for(const x of [-.58,0,.58])
  box("TRANSPARENT BULLETPROOF VIEWING WINDOW",.47,.46,.035,x,.925,-.008,glass);
 for(const x of [-.57,.57]){
  box("FRONT SUPPORT LEG",.14,.15,.36,x,.075,.11,rim);
  box("FLOOR GRIP",.25,.038,.4,x,.019,.07,armor);
 }
 // This simple invisible solid is the SINGLE authoritative shootable hit
 // target for the entire shield (including its bulletproof windows).
 const ballistic=new THREE.Mesh(new THREE.BoxGeometry(W,H,DEPLOYABLE_SHIELD.depth),
  new THREE.MeshBasicMaterial({transparent:true,opacity:0,
   depthWrite:false,side:THREE.DoubleSide}));
 ballistic.position.y=H/2;
 ballistic.name="SHIELD BALLISTIC COLLISION · WINDOWS BULLETPROOF";
 ballistic.userData.deployableShieldId=device.id;
 ballistic.userData.deployableShieldBallistic=true;
 root.add(ballistic);
 const pickupTarget=new THREE.Mesh(new THREE.BoxGeometry(W+.2,H+.15,.59),
  new THREE.MeshBasicMaterial({transparent:true,opacity:0,
   depthWrite:false,side:THREE.DoubleSide}));
 pickupTarget.position.y=H/2;
 pickupTarget.userData.deployableShieldPickupId=device.id;
 root.add(pickupTarget);scene.add(root);
 let disposed=false;
 function dispose(){
  if(disposed)return;disposed=true;scene.remove(root);
  for(const p of [...parts,ballistic,pickupTarget])p.geometry.dispose();
  ballistic.material.dispose();pickupTarget.material.dispose();
  for(const m of [armor,rim,glass,visorRim])m.dispose();
 }
 return {root,ballistic,pickupTarget,dispose};
}
export function createShieldPlacementPreview(THREE,scene){
 const group=new THREE.Group();
 group.name="GREEN/RED REAL SHIELD PLACEMENT PREVIEW";
 const validMat=new THREE.MeshBasicMaterial({color:0x3df2aa,
  transparent:true,opacity:.24,depthWrite:false,depthTest:true});
 const edgesMat=new THREE.LineBasicMaterial({color:0x48ffbb,
  transparent:true,opacity:.95});
 const geometry=new THREE.BoxGeometry(
  DEPLOYABLE_SHIELD.width,DEPLOYABLE_SHIELD.height,DEPLOYABLE_SHIELD.depth);
 const ghost=new THREE.Mesh(geometry,validMat);
 ghost.position.y=DEPLOYABLE_SHIELD.height/2;group.add(ghost);
 const edgeGeometry=new THREE.EdgesGeometry(geometry);
 const edges=new THREE.LineSegments(edgeGeometry,edgesMat);
 edges.position.copy(ghost.position);group.add(edges);
 scene.add(group);group.visible=false;
 function update(player,state,obstacles){
  const p=shieldCandidate(player);
  if(!p){group.visible=false;return {ok:false};}
  const check=canPlaceShield(state,player,obstacles);
  group.position.set(p.x,0,p.z);group.rotation.y=p.yaw;
  const color=check.ok?0x48ffbb:0xff5555;
  validMat.color.setHex(color);edgesMat.color.setHex(color);
  group.visible=true;return check;
 }
 function hide(){group.visible=false;}
 function dispose(){
  scene.remove(group);geometry.dispose();edgeGeometry.dispose();
  validMat.dispose();edgesMat.dispose();
 }
 return {group,update,hide,dispose};
}
