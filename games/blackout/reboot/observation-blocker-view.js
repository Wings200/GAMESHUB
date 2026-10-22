// BLACKOUT V0.22.0 · camera-only electronic curtain (real depth blocking)
// and independently shootable/pickable hardware. No camera HUD trick image.
import {OBS_BLOCKER,projectorCurtain,blockerScreenVisible}
 from "./observation-blocker.js?v=reboot-049";
export function createObservationBlockerView(THREE,scene,device){
 const root=new THREE.Group();
 root.name="BLACKOUT OBSERVATION BLOCKER "+device.id;
 root.position.set(device.x,0,device.z);
 root.rotation.y=device.yaw;
 const shell=new THREE.MeshStandardMaterial({color:0x283b4a,metalness:.55,roughness:.53});
 const edge=new THREE.MeshStandardMaterial({color:0x6ab7c2,metalness:.48,roughness:.43});
 const lensMat=new THREE.MeshBasicMaterial({color:0x44ecfc});
 const parts=[],hardware=[];
 function box(name,w,h,d,x,y,z,material,shootable=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  m.name=name;m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;
  root.add(m);parts.push(m);
  if(shootable){
   m.userData.observationBlockerId=device.id;
   hardware.push(m);
  }
  return m;
 }
 box("projector case",.48,.20,.30,0,.13,0,shell);
 box("projector rim",.43,.05,.22,0,.255,0,edge);
 for(const x of [-.16,0,.16])
  box("transmitter",.085,.065,.042,x,.27,-.13,lensMat);
 for(const x of [-.21,.21])box("projector foot",.08,.045,.28,x,.035,0,shell);
 const pickupTarget=new THREE.Mesh(new THREE.BoxGeometry(.73,.53,.62),
  new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,
   side:THREE.DoubleSide}));
 pickupTarget.name="F PICKUP OBSERVATION BLOCKER";
 pickupTarget.position.y=.16;
 pickupTarget.userData.observationBlockerPickupId=device.id;
 root.add(pickupTarget);
 scene.add(root);
 const curtain=projectorCurtain(device);
 const screenGroup=new THREE.Group();
 screenGroup.name="BLACKOUT OBSERVATION BLOCKER CAMERA FIELD "+device.id;
 screenGroup.position.set(curtain.x,
  (curtain.bottom+curtain.top)/2,curtain.z);
 screenGroup.rotation.y=device.yaw;
 const screenMat=new THREE.MeshBasicMaterial({color:0x122c43,side:THREE.DoubleSide,
  depthTest:true,depthWrite:true});
 const screen=new THREE.Mesh(new THREE.PlaneGeometry(
  OBS_BLOCKER.screenWidth,OBS_BLOCKER.screenHeight),screenMat);
 screen.name="DRONE-ONLY OPAQUE SIGNAL CURTAIN";
 screenGroup.add(screen);
 const barMat=new THREE.LineBasicMaterial({color:0x35d9f0,transparent:true,
  opacity:.38,depthTest:true,depthWrite:false});
 const linePoints=[];
 for(let y=-OBS_BLOCKER.screenHeight/2+.11;y<OBS_BLOCKER.screenHeight/2;y+=.19){
  linePoints.push(-OBS_BLOCKER.screenWidth/2,y,.012,
   OBS_BLOCKER.screenWidth/2,y,.012);
 }
 const scanlines=new THREE.LineSegments(
  new THREE.BufferGeometry().setAttribute("position",
   new THREE.Float32BufferAttribute(linePoints,3)),barMat);
 screenGroup.add(scanlines);
 const rimMaterial=new THREE.LineBasicMaterial({color:0x5cf7ff,transparent:true,opacity:.8});
 const rimGeo=new THREE.EdgesGeometry(new THREE.PlaneGeometry(
  OBS_BLOCKER.screenWidth,OBS_BLOCKER.screenHeight));
 const rim=new THREE.LineSegments(rimGeo,rimMaterial);
 rim.position.z=.012;
 screenGroup.add(rim);
 screenGroup.visible=false;scene.add(screenGroup);
 let disposed=false;
 function setMode(mode,state=device){
  if(disposed)return;
  root.visible=Boolean(state?.hp>0);
  screenGroup.visible=blockerScreenVisible(state,mode);
 }
 function dispose(){
  if(disposed)return;disposed=true;
  scene.remove(root);scene.remove(screenGroup);
  for(const m of [...parts,pickupTarget])m.geometry.dispose();
  pickupTarget.geometry.dispose();
  pickupTarget.material.dispose();
  screen.geometry.dispose();screenMat.dispose();
  scanlines.geometry.dispose();barMat.dispose();
  rimGeo.dispose();rimMaterial.dispose();
  for(const mat of [shell,edge,lensMat])mat.dispose();
 }
 return {root,pickupTarget,hardware,screenGroup,setMode,dispose};
}
