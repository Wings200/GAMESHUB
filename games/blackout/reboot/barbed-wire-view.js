// BLACKOUT V0.15 · physical 3D defensive wire model and firearm raycast face.
// A low, crisscrossed coil of metal wire on the floor, not an invisible slow
// zone; its rectangular steel base is the damageable raycast surface.
import {WIRE} from "./barbed-wire.js?v=reboot-028";
export function createWireView(THREE,scene,device){
 const root=new THREE.Group();
 root.name="BLACKOUT BARBED WIRE "+device.id;
 root.position.set(device.x,0,device.z);root.rotation.y=device.yaw;
 const steel=new THREE.MeshStandardMaterial({color:0x899da2,
  metalness:.8,roughness:.4,side:THREE.DoubleSide});
 const steelDark=new THREE.MeshStandardMaterial({color:0x485860,
  metalness:.88,roughness:.44,side:THREE.DoubleSide});
 const low=new THREE.MeshStandardMaterial({color:0x26343b,
  metalness:.8,roughness:.62,transparent:true,opacity:.22});
 const box=(w,h,d,x,y,z,material)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);mesh.castShadow=true;
  root.add(mesh);return mesh;
 };
 // The solid steel weave base presents a real face to the gun raycaster.
 const hitbox=box(1.43,.15,1.43,0,.12,0,low);
 hitbox.name="physical wire mesh";
 hitbox.userData.wireId=device.id;
 hitbox.userData.physicsObstacleId="barbed-wire-"+device.id;
 // Spiked crossed strands and loop coils, not a placeholder decal.
 for(let i=-3;i<=3;i++){
  const off=i*.195;
  const diag=box(1.68,.025,.025,0,.20,off,steel);
  diag.rotation.y=.19;
  const cross=box(.025,.025,1.68,off,.205,0,steelDark);
  cross.rotation.y=-.19;
 }
 for(const x of [-.57,.57])for(const z of [-.57,.57]){
  const post=box(.055,.20,.055,x,.16,z,steelDark);
  post.name="barbed wire anchor";
 }
 const barbGeo=new THREE.ConeGeometry(.052,.14,4);
 for(let z=-.63;z<=.64;z+=.26){
  for(let x=-.63;x<=.64;x+=.26){
   const barb=new THREE.Mesh(barbGeo,steel);
   barb.position.set(x,.30,z);barb.rotation.z=((Math.round(x*100)+Math.round(z*100))%2)*.5;
   root.add(barb);
  }
 }
 // Circular wire loops sit above and beneath crossed strands.
 const coilGeo=new THREE.TorusGeometry(.56,.014,5,48);
 for(const y of [.115,.27]){
  const coil=new THREE.Mesh(coilGeo,steel);
  coil.rotation.x=-Math.PI/2;coil.position.y=y;
  root.add(coil);
 }
 scene.add(root);
 function sync(state){
  root.visible=Boolean(state?.hp>0);
  if(!root.visible){
   root.traverse(object=>{
    if(object.isMesh)object.geometry?.dispose();
   });
   scene.remove(root);
  }
 }
 return {root,hitbox,sync};
}
