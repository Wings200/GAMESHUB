// BLACKOUT V0.23.0 · physical Proximity Alarm floor/wall model,
// defender-only 4.35m radius, shootable hardware and center-ray F pickup.
import {PROXIMITY} from "./proximity-alarm.js?v=reboot-051";
export function createProximityView(THREE,scene,device){
 const root=new THREE.Group();
 root.name="BLACKOUT PROXIMITY ALARM "+device.id;
 root.position.set(device.x,device.y,device.z);
 root.rotation.y=device.normalYaw||0;
 const bodyMat=new THREE.MeshStandardMaterial({color:0x303c42,metalness:.65,roughness:.41});
 const steelMat=new THREE.MeshStandardMaterial({color:0x8c8e83,metalness:.77,roughness:.32});
 const litMat=new THREE.MeshBasicMaterial({color:0x5effc1});
 const warningMat=new THREE.MeshBasicMaterial({color:0xffa12f});
 const meshes=[],hardware=[];
 function cube(w,h,d,x,y,z,mat,name){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.name=name;m.position.set(x,y,z);
  m.castShadow=true;root.add(m);meshes.push(m);
  m.userData.proximityAlarmId=device.id;hardware.push(m);
  return m;
 }
 const onWall=device.mount==="wall";
 // Floor device is low and flat; wall unit is a slim vertical sensor.
 if(onWall){
  cube(.37,.33,.11,0,0,0,bodyMat,"WALL PROXIMITY SENSOR");
  cube(.27,.17,.025,0,0,-.071,steelMat,"WALL MOUNT ANTENNA");
  cube(.11,.07,.028,0,.095,-.089,litMat,"WALL PROXIMITY LED");
 }else{
  cube(.42,.16,.34,0,0,0,bodyMat,"FLOOR PROXIMITY SENSOR");
  cube(.27,.038,.22,0,.093,0,steelMat,"FLOOR ANTENNA");
  cube(.12,.025,.055,0,.12,-.05,litMat,"FLOOR PROXIMITY LED");
 }
 const pickupTarget=new THREE.Mesh(new THREE.BoxGeometry(
  onWall?.64:.68,onWall?.60:.48,onWall?.42:.65),
  new THREE.MeshBasicMaterial({transparent:true,opacity:0,
    depthWrite:false,side:THREE.DoubleSide}));
 pickupTarget.userData.proximityPickupId=device.id;
 pickupTarget.name="F PICKUP PROXIMITY ALARM";
 root.add(pickupTarget);scene.add(root);
 // This indicator is not a physical detector/collider. It uses world x/z
 // for a precise radius, even for wall-mounted sensors.
 const indicator=new THREE.Group();
 indicator.name="DEFENDER-ONLY PROXIMITY ALARM DETECTION RANGE";
 indicator.position.set(device.x,.045,device.z);
 const points=[];
 for(let i=0;i<=96;i++){
  const theta=i/96*Math.PI*2;
  points.push(new THREE.Vector3(Math.cos(theta)*PROXIMITY.range,0,
   Math.sin(theta)*PROXIMITY.range));
 }
 const ringMat=new THREE.LineBasicMaterial({color:0x47f5c9,
  transparent:true,opacity:.62,depthTest:true,depthWrite:false});
 const ring=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),ringMat);
 ring.name="PROXIMITY RANGE EXACT "+PROXIMITY.range+"M";
 indicator.add(ring);
 const spokeMat=new THREE.LineBasicMaterial({color:0x47f5c9,
  transparent:true,opacity:.2,depthTest:true,depthWrite:false});
 const spokes=[];
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  spokes.push(0,0,0,Math.cos(a)*PROXIMITY.range,0,Math.sin(a)*PROXIMITY.range);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(spokes,3));
 const spokeLines=new THREE.LineSegments(geometry,spokeMat);
 indicator.add(spokeLines);
 indicator.visible=false;scene.add(indicator);
 let disposed=false;
 function sync(current,mode,side){
  if(disposed)return;
  if(!current||current.hp<=0){dispose();return;}
  indicator.visible=mode==="player"&&side==="defend";
  litMat.color.setHex(current.triggered?0xffaa3e:0x5effc1);
  ringMat.color.setHex(current.triggered?0xffa546:0x47f5c9);
  ringMat.opacity=current.triggered?.89:.62;
 }
 function dispose(){
  if(disposed)return;disposed=true;
  scene.remove(root);scene.remove(indicator);
  for(const m of meshes)m.geometry.dispose();
  pickupTarget.geometry.dispose();pickupTarget.material.dispose();
  ring.geometry.dispose();ringMat.dispose();
  geometry.dispose();spokeMat.dispose();
  bodyMat.dispose();steelMat.dispose();litMat.dispose();warningMat.dispose();
 }
 sync(device,"player","defend");
 return {root,pickupTarget,hardware,indicator,sync,dispose};
}
