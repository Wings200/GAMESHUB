// BLACKOUT V0.17 · actual throwable model and very short light burst.
export function createFlashView(THREE,scene,d){
 const root=new THREE.Group();root.name="BLACKOUT FLASH "+d.id;
 const metal=new THREE.MeshStandardMaterial({color:0xa6b5ae,roughness:.38,metalness:.74});
 const band=new THREE.MeshStandardMaterial({color:0xeae6bb,roughness:.52,metalness:.34});
 const body=new THREE.Mesh(new THREE.CylinderGeometry(.092,.095,.25,10),metal);
 root.add(body);
 const collar=new THREE.Mesh(new THREE.CylinderGeometry(.097,.097,.035,10),band);
 collar.position.y=.11;root.add(collar);
 const pin=new THREE.Mesh(new THREE.TorusGeometry(.062,.013,5,12),metal);
 pin.position.set(.12,.13,0);root.add(pin);
 scene.add(root);
 let removed=false;
 function sync(device){
  if(removed)return;
  if(!device?.armed){
   removed=true;scene.remove(root);
   for(const part of [body,collar,pin])part.geometry.dispose();
   for(const mat of [metal,band])mat.dispose();
   return;
  }
  root.position.set(device.x,device.y,device.z);
  if(!device.resting){root.rotation.x+=.08;root.rotation.z+=.11;}
 }
 sync(d);
 return {root,sync};
}
export function createFlashBurst(THREE,scene,burst){
 const root=new THREE.Group();root.name="BLACKOUT FLASH DETONATION";
 root.position.set(burst.x,burst.y,burst.z);
 const light=new THREE.PointLight(0xffffff,7,14);root.add(light);
 const geometry=new THREE.SphereGeometry(.45,12,8);
 const material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75,depthWrite:false});
 const core=new THREE.Mesh(geometry,material);root.add(core);
 scene.add(root);let elapsed=0,disposed=false;
 return {tick(dt){
  if(disposed)return false;
  elapsed+=Math.max(0,dt);
  const t=Math.min(1,elapsed/.22);
  core.scale.setScalar(1+t*4);material.opacity=.8*(1-t);
  light.intensity=7*(1-t);
  if(t>=1){
   disposed=true;scene.remove(root);geometry.dispose();material.dispose();return false;
  }
  return true;
 }};
}
