// BLACKOUT V0.22.1 · wide 5.25m electronic recon exclusion zone,
// three genuine camera-opaque depth planes + accurate defender hologram.
import {OBS_BLOCKER,projectorCoverage,blockerScreenVisible}
 from "./observation-blocker.js?v=reboot-050";

// All overlay geometry shares the projection's exact near/far bounds.
// Unlike camera curtains this outline is only a see-through VISUAL GUIDE.
function coverageOutline(THREE){
 const near=OBS_BLOCKER.screenNearOffset,far=OBS_BLOCKER.screenOffset;
 const n=OBS_BLOCKER.screenNearWidth/2,f=OBS_BLOCKER.screenWidth/2;
 const bottom=OBS_BLOCKER.screenBottom,top=bottom+OBS_BLOCKER.screenHeight;
 const coords=[];
 const line=(x,y,z,a,b,c)=>coords.push(x,y,z,a,b,c);
 for(const [half,depth] of [[n,near],[f,far]]){
  for(const y of [bottom,top])line(-half,y,-depth,half,y,-depth);
  for(const x of [-half,half])line(x,bottom,-depth,x,top,-depth);
 }
 for(const side of [-1,1]){
  line(side*n,bottom,-near,side*f,bottom,-far);
  line(side*n,top,-near,side*f,top,-far);
 }
 for(let i=1;i<4;i++){
  const t=i/4,depth=near+(far-near)*t,half=n+(f-n)*t;
  line(-half,bottom, -depth,half,bottom,-depth);
 }
 // Ground projection is visible from standing height while remaining
 // 100% intangible; doesn't enter projectile or physical collision tests.
 const floorVertices=[
  -n,.015,-near, n,.015,-near, -f,.015,-far,
  n,.015,-near, f,.015,-far, -f,.015,-far
 ];
 const floorGeo=new THREE.BufferGeometry();
 floorGeo.setAttribute("position",new THREE.Float32BufferAttribute(floorVertices,3));
 floorGeo.computeVertexNormals();
 const floorMat=new THREE.MeshBasicMaterial({color:0x25dded,transparent:true,
  opacity:.075,side:THREE.DoubleSide,depthWrite:false,depthTest:true});
 const floor=new THREE.Mesh(floorGeo,floorMat);
 floor.name="DEFENDER PROJECTED COVERAGE FOOTPRINT";
 const wireGeo=new THREE.BufferGeometry();
 wireGeo.setAttribute("position",new THREE.Float32BufferAttribute(coords,3));
 const wireMat=new THREE.LineBasicMaterial({color:0x5df7ff,transparent:true,
  opacity:.75,depthTest:true,depthWrite:false});
 const wire=new THREE.LineSegments(wireGeo,wireMat);
 wire.name="DEFENDER RANGE OUTLINE — 7.2M WIDE / 5.25M FORWARD";
 const group=new THREE.Group();group.add(floor,wire);
 function setValid(valid){
  wireMat.color.setHex(valid?0x5df7ff:0xff6b67);
  floorMat.color.setHex(valid?0x25dded:0xff4d4d);
 }
 function dispose(){
  floorGeo.dispose();wireGeo.dispose();floorMat.dispose();wireMat.dispose();
 }
 return {group,setValid,dispose};
}

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
 const outline=coverageOutline(THREE);
 root.add(outline.group);
 scene.add(root);
 const screenGroup=new THREE.Group();
 screenGroup.name="BLACKOUT OBSERVATION BLOCKER CAMERA FIELD "+device.id;
 screenGroup.position.set(device.x,0,device.z);
 screenGroup.rotation.y=device.yaw;
 const screenMat=new THREE.MeshBasicMaterial({color:0x122c43,side:THREE.DoubleSide,
  depthTest:true,depthWrite:true});
 const scanMat=new THREE.LineBasicMaterial({color:0x35d9f0,transparent:true,
  opacity:.34,depthTest:true,depthWrite:false});
 const scanChildren=[];
 const levels=projectorCoverage(device);
 const middle=(OBS_BLOCKER.screenNearOffset+OBS_BLOCKER.screenOffset)/2;
 for(const stage of levels){
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(
   stage.width,OBS_BLOCKER.screenHeight),screenMat);
  screen.position.set(0,(stage.bottom+stage.top)/2,-stage.distance);
  screen.name="DRONE-ONLY OPAQUE SIGNAL CURTAIN "+stage.distance.toFixed(2)+"M";
  screenGroup.add(screen);scanChildren.push(screen);
  const stripes=[];
  for(let y=stage.bottom+.11;y<stage.top;y+=.21){
   stripes.push(-stage.width/2,y,-stage.distance+.012,
    stage.width/2,y,-stage.distance+.012);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(stripes,3));
  const scan=new THREE.LineSegments(geo,scanMat);
  screenGroup.add(scan);scanChildren.push(scan);
 }
 screenGroup.visible=false;scene.add(screenGroup);
 let disposed=false;
 function setMode(mode,state=device,side="defend"){
  if(disposed)return;
  root.visible=Boolean(state?.hp>0);
  outline.group.visible=Boolean(state?.hp>0&&mode==="player"&&side==="defend");
  screenGroup.visible=blockerScreenVisible(state,mode);
 }
 function dispose(){
  if(disposed)return;disposed=true;
  scene.remove(root);scene.remove(screenGroup);
  for(const m of parts)m.geometry.dispose();
  pickupTarget.geometry.dispose();pickupTarget.material.dispose();
  for(const m of scanChildren)m.geometry.dispose();
  outline.dispose();screenMat.dispose();scanMat.dispose();
  for(const mat of [shell,edge,lensMat])mat.dispose();
 }
 return {root,pickupTarget,hardware,screenGroup,coverageGroup:outline.group,setMode,dispose};
}

// PRE-PLACEMENT view uses exactly the same coverage geometry as deployed
// projectors. Hold G/MMB to inspect it; release to commit only if valid.
export function createObservationPlacementPreviewView(THREE,scene){
 const outline=coverageOutline(THREE),root=outline.group;
 root.name="OBSERVATION BLOCKER PRE-PLACEMENT COVERAGE";
 root.visible=false;scene.add(root);
 let disposed=false;
 function update(position,valid){
  if(disposed||!position){hide();return;}
  root.position.set(position.x,0,position.z);
  root.rotation.y=position.yaw;
  outline.setValid(valid);
  root.visible=true;
 }
 function hide(){root.visible=false;}
 function dispose(){
  if(disposed)return;disposed=true;hide();scene.remove(root);outline.dispose();
 }
 return {root,update,hide,dispose};
}
