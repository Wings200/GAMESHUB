// BLACKOUT V0.16.1 · a small physical thrown defender impact grenade.
export function createImpactView(THREE,scene,d){
 const root=new THREE.Group();root.name="BLACKOUT IMPACT "+d.id;
 const body=new THREE.Mesh(new THREE.SphereGeometry(.105,12,8),
  new THREE.MeshStandardMaterial({color:0x344b53,metalness:.7,roughness:.4}));
 root.add(body);
 const stripe=new THREE.Mesh(new THREE.TorusGeometry(.098,.017,5,24),
  new THREE.MeshStandardMaterial({color:0xffb059,metalness:.55,roughness:.6}));
 stripe.rotation.x=Math.PI/2;root.add(stripe);
 scene.add(root);
 function sync(device){
  if(!device?.armed){
   scene.remove(root);root.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
   return;
  }
  root.position.set(device.x,device.y,device.z);
  root.rotation.x+=.15;root.rotation.z+=.17;
 }
 sync(d);
 return {root,sync};
}
