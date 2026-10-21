// BLACKOUT V0.20.0 · steel-capable heavy explosive with animated clamps,
// arming LED and a real center-screen F pickup collider.
export function createHardBreachView(THREE,scene,device){
 const root=new THREE.Group();
 root.name="BLACKOUT HARD BREACH "+device.id;
 root.position.set(device.x,device.y,device.z+device.side*.22);
 const housing=new THREE.MeshStandardMaterial({color:0x343a43,metalness:.76,roughness:.38});
 const trim=new THREE.MeshStandardMaterial({color:0xd2b660,metalness:.51,roughness:.36});
 const dark=new THREE.MeshStandardMaterial({color:0x172329,metalness:.65,roughness:.55});
 const lamp=new THREE.MeshBasicMaterial({color:0xffa43e});
 const pieces=[];
 function part(name,width,height,depth,x,y,z,material){
  const m=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material);
  m.name=name;m.position.set(x,y,z);root.add(m);pieces.push(m);return m;
 }
 const panel=part("reinforcement-cutting pad",.74,.61,.15,0,0,0,housing);
 part("armor-facing chassis",.6,.48,.055,0,0,device.side*.102,dark);
 part("top cutting bar",.69,.067,.07,0,.215,device.side*.11,trim);
 part("bottom cutting bar",.69,.067,.07,0,-.215,device.side*.11,trim);
 part("left cutting clamp",.065,.4,.085,-.295,0,device.side*.12,trim);
 part("right cutting clamp",.065,.4,.085,.295,0,device.side*.12,trim);
 const indicator=part("remote detonation status",.15,.055,.027,0,0,device.side*.145,lamp);
 const pickupTarget=new THREE.Mesh(new THREE.BoxGeometry(.87,.76,.16),
  new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
 pickupTarget.position.z=device.side*.075;
 pickupTarget.userData.hardBreachPickupId=device.id;
 root.add(pickupTarget);scene.add(root);
 let disposed=false;
 function sync(d){
  if(disposed)return;
  if(!d?.armed){dispose();return;}
  const progress=Math.min(1,Math.max(.02,d.progress/1.45));
  for(const m of pieces)m.scale.y=progress;
  lamp.color.setHex(d.countdown!==null?0xff3b3b:
   d.installed?0x64ff91:0xffa43e);
  indicator.visible=d.countdown===null||Math.floor(d.countdown*12)%2===0;
  panel.visible=true;
 }
 function dispose(){
  if(disposed)return;disposed=true;
  scene.remove(root);
  for(const m of [...pieces,pickupTarget]){
   m.geometry.dispose();m.material.dispose();
  }
 }
 sync(device);
 return {root,pickupTarget,sync,dispose};
}
