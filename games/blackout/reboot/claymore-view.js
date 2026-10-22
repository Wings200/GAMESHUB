// BLACKOUT V0.21.0 · physical attacker claymore, three bright trip rays,
// pickup collider and armed indicator. No invisible fake trap.
export function createClaymoreView(THREE,scene,device){
 const root=new THREE.Group();
 root.name="BLACKOUT CLAYMORE "+device.id;
 root.position.set(device.x,0,device.z);
 root.rotation.y=device.yaw;
 const shell=new THREE.MeshStandardMaterial({color:0x344c4b,metalness:.56,roughness:.53});
 const steel=new THREE.MeshStandardMaterial({color:0x142627,metalness:.68,roughness:.5});
 const gold=new THREE.MeshStandardMaterial({color:0xd4aa4c,metalness:.6,roughness:.36});
 const lit=new THREE.MeshBasicMaterial({color:0xffb245});
 const materials=[shell,steel,gold,lit];
 const meshes=[];
 function box(w,h,d,x,y,z,mat){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
  root.add(mesh);meshes.push(mesh);return mesh;
 }
 box(.47,.23,.26,0,.17,0,shell);
 box(.40,.055,.19,0,.30,-.02,steel);
 box(.32,.03,.035,0,.34,-.095,gold);
 for(const x of [-.2,.2]){
  box(.07,.06,.25,x,.036,0,steel);
  box(.04,.12,.045,x,.18,-.14,gold);
 }
 const led=box(.075,.025,.055,0,.342,-.01,lit);
 const pickupTarget=new THREE.Mesh(new THREE.BoxGeometry(.76,.53,.65),
  new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 pickupTarget.position.y=.24;
 pickupTarget.userData.claymorePickupId=device.id;
 root.add(pickupTarget);scene.add(root);
 const beamMat=new THREE.LineBasicMaterial({color:0xff304b,transparent:true,
  opacity:.96,depthTest:true,depthWrite:false});
 const beams=[];
 // World coordinates inside local claymore rotation: each endpoint is
 // transformed from projected world point, then rotated by -device.yaw.
 for(let i=0;i<3;i++){
  const line=new THREE.Line(new THREE.BufferGeometry(),beamMat);
  line.name="LIVE TRIP LASER "+i;
  root.add(line);beams.push(line);
 }
 let signature="",disposed=false;
 function sync(next,endpoints=[]){
  if(disposed)return;
  if(!next?.armed){dispose();return;}
  const armed=next.armAge>=.7;
  lit.color.setHex(armed?0x6affab:0xffb245);
  const vector=new THREE.Vector3();
  const key=endpoints.map(p=>[p.x.toFixed(3),p.z.toFixed(3)].join(",")).join("|");
  if(signature!==key){
   signature=key;
   endpoints.slice(0,3).forEach((p,i)=>{
    const dx=p.x-device.x,dz=p.z-device.z;
    const c=Math.cos(device.yaw),sn=Math.sin(device.yaw);
    // Inverse of THREE's positive Y-axis rotation.
    const localX=c*dx-sn*dz,localZ=sn*dx+c*dz;
    const newGeometry=new THREE.BufferGeometry().setFromPoints([
     new THREE.Vector3(0,.19,-.15),
     new THREE.Vector3(localX,.19,localZ)]);
    beams[i].geometry.dispose();beams[i].geometry=newGeometry;
   });
  }
  for(const l of beams)l.visible=armed;
 }
 function dispose(){
  if(disposed)return;disposed=true;
  scene.remove(root);
  for(const m of [...meshes,pickupTarget])m.geometry.dispose();
  pickupTarget.material.dispose();
  for(const l of beams)l.geometry.dispose();
  beamMat.dispose();
  for(const material of materials)material.dispose();
 }
 sync(device,[]);
 return {root,pickupTarget,sync,dispose};
}
