// BLACKOUT V0.16 · compact tactical remote charge and brief volumetric detonation.
// All THREE geometry is sandbox-original; each C4 mesh tracks its pure flight.
import {NITRO} from "./nitro.js?v=reboot-032";
export function createNitroView(THREE,scene,device){
 const group=new THREE.Group();group.name="BLACKOUT C4 "+device.id;
 const caseMat=new THREE.MeshStandardMaterial({color:0x2a4243,roughness:.77,metalness:.16});
 const trim=new THREE.MeshStandardMaterial({color:0x0f2227,roughness:.7,metalness:.56});
 const indicator=new THREE.MeshBasicMaterial({color:0x56efca});
 const box=(w,h,d,x,y,z,mat)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);
 };
 box(.35,.20,.45,0,0,0,caseMat);
 box(.35,.055,.38,0,.127,0,trim);
 box(.12,.018,.055,0,.165,-.08,indicator);
 for(const x of [-.13,.13]){
  box(.023,.075,.39,x,-.107,0,trim);
 }
 scene.add(group);
 function sync(d){
  if(!d?.armed){
   group.visible=false;scene.remove(group);
   group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
   return;
  }
  group.position.set(d.x,d.y,d.z);
  group.rotation.set(d.stuck?0:.38, d.age*2, d.stuck?0:.27);
 }
 sync(device);
 return {group,sync};
}
export function createNitroBlast(THREE,scene,blast){
 const group=new THREE.Group();group.name="BLACKOUT C4 short blast";
 group.position.set(blast.x,blast.y,blast.z);
 const light=new THREE.PointLight(0xffaf6b,4.5,9);
 group.add(light);
 const mat=new THREE.MeshBasicMaterial({color:0xffa255,transparent:true,opacity:.6,
  depthWrite:false,side:THREE.DoubleSide});
 const sphere=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),mat);
 group.add(sphere);scene.add(group);
 let elapsed=0;
 return {tick(dt){
  elapsed+=dt;
  const t=Math.min(1,elapsed/.35);
  sphere.scale.setScalar(Math.max(.1,blast.radius*t));
  mat.opacity=.55*(1-t);
  light.intensity=4*(1-t);
  if(elapsed>=.35){
   scene.remove(group);sphere.geometry.dispose();mat.dispose();return false;
  }
  return true;
 }};
}
