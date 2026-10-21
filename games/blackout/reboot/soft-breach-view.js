// BLACKOUT V0.19.0 · wall-mounted breaching charge with progress animation
// and real center-ray collider for looking at it and pressing F to recover.
export function createSoftBreachView(THREE,scene,device){
 const root=new THREE.Group();root.name="BLACKOUT SOFT BREACH "+device.id;
 root.position.set(device.x,device.y,device.z+device.side*.145);
 const caseMat=new THREE.MeshStandardMaterial({color:0x343f3e,metalness:.52,roughness:.56});
 const plateMat=new THREE.MeshStandardMaterial({color:0x90836c,metalness:.38,roughness:.65});
 const warningMat=new THREE.MeshBasicMaterial({color:0xe9a73d});
 const pad=new THREE.Mesh(new THREE.BoxGeometry(.62,.45,.095),caseMat);
 root.add(pad);
 const plate=new THREE.Mesh(new THREE.BoxGeometry(.48,.34,.018),plateMat);
 plate.position.z=device.side*.057;root.add(plate);
 const label=new THREE.Mesh(new THREE.BoxGeometry(.32,.045,.022),warningMat);
 label.position.set(0,.09,device.side*.071);root.add(label);
 const stripeA=new THREE.Mesh(new THREE.BoxGeometry(.055,.31,.022),warningMat);
 stripeA.position.set(-.19,0,device.side*.071);root.add(stripeA);
 const stripeB=new THREE.Mesh(new THREE.BoxGeometry(.055,.31,.022),warningMat);
 stripeB.position.set(.19,0,device.side*.071);root.add(stripeB);
 const ledMat=new THREE.MeshBasicMaterial({color:0xf9a745});
 const led=new THREE.Mesh(new THREE.SphereGeometry(.033,8,6),ledMat);
 led.position.set(0,-.105,device.side*.085);root.add(led);
 // Invisible pickup collider is slightly closer than actual charge and wall.
 const pickupTarget=new THREE.Mesh(new THREE.BoxGeometry(.74,.64,.13),
  new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
 pickupTarget.position.z=device.side*.035;
 pickupTarget.userData.softBreachPickupId=device.id;
 root.add(pickupTarget);
 scene.add(root);
 let disposed=false;
 function sync(d){
  if(disposed)return;
  if(!d?.armed){dispose();return;}
  const pct=Math.max(.02,Math.min(1,d.progress/.9));
  pad.scale.y=pct;plate.scale.y=pct;label.scale.y=pct;
  stripeA.scale.y=pct;stripeB.scale.y=pct;
  led.visible=d.installed;
  ledMat.color.setHex(d.installed?0x64ff91:0xf9a745);
 }
 function dispose(){
  if(disposed)return;
  disposed=true;scene.remove(root);
  for(const m of [pad,plate,label,stripeA,stripeB,led,pickupTarget]){
   m.geometry.dispose();m.material.dispose();
  }
 }
 sync(device);
 return {root,pickupTarget,sync,dispose};
}
