// BLACKOUT V0.16.2 · visible bouncing frag and disposal on detonation.
export function createFragView(THREE,scene,d){
 const root=new THREE.Group();root.name="BLACKOUT FRAG "+d.id;
 const body=new THREE.Mesh(new THREE.SphereGeometry(.125,10,8),
  new THREE.MeshStandardMaterial({color:0x52644b,roughness:.74,metalness:.39}));
 root.add(body);
 const stripe=new THREE.Mesh(new THREE.TorusGeometry(.12,.013,4,16),
  new THREE.MeshStandardMaterial({color:0xb1a76c,metalness:.68,roughness:.4}));
 stripe.rotation.x=Math.PI/2;root.add(stripe);
 scene.add(root);
 let removed=false;
 function sync(device){
  if(removed)return;
  if(!device?.armed){
   removed=true;scene.remove(root);
   for(const part of [body,stripe]){part.geometry.dispose();part.material.dispose();}
   return;
  }
  root.position.set(device.x,device.y,device.z);
  root.rotation.x+=.12;root.rotation.z+=.17;
 }
 sync(d);
 return {root,sync};
}
