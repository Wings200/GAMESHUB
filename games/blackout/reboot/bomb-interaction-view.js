// BLACKOUT V0.25.6 · floor-anchored, staged defuser placement.
// Kneel/put the case down, open the hinged display, then type on its keys.
// Timing follows the trimmed 7.35-second recording: the opening noises
// precede typing. It is never a keyboard floating in front of the camera.
export const PLANT_MOTION=Object.freeze({
 placeSeconds:.55,openSeconds:.70,plantSeconds:7.35
});

const clamp01=value=>Math.min(1,Math.max(0,value));
const smooth=value=>{const t=clamp01(value);return t*t*(3-2*t);};

export function plantInteractionPhase(progress){
 const elapsed=clamp01(progress)*PLANT_MOTION.plantSeconds;
 if(elapsed<PLANT_MOTION.placeSeconds)return "placing";
 if(elapsed<PLANT_MOTION.placeSeconds+PLANT_MOTION.openSeconds)return "opening";
 return "typing";
}

export function createBombInteractionView(THREE,scene){
 const root=new THREE.Group();
 root.name="FLOOR-ANCHORED DEFUSER · PLACE / OPEN / TYPE";
 scene.add(root);
 root.visible=false;
 const resources=[];
 function mat(args){const m=new THREE.MeshStandardMaterial(args);resources.push(m);return m;}
 const caseMat=mat({color:0x243a46,metalness:.6,roughness:.43});
 const edgeMat=mat({color:0x91aeb9,metalness:.75,roughness:.3});
 const keyMat=mat({color:0x192932,metalness:.2,roughness:.6});
 const gloveMat=mat({color:0x18292d,roughness:.96});
 const sleeveMat=mat({color:0x405761,roughness:.8});
 const ledMat=new THREE.MeshBasicMaterial({color:0x68fbd4});resources.push(ledMat);
 function part(parent,name,geometry,material,x=0,y=0,z=0){
  const m=new THREE.Mesh(geometry,material);m.name=name;
  m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;
  parent.add(m);resources.push(geometry);return m;
 }

 const device=new THREE.Group();
 device.name="PORTABLE DEFUSER HARD CASE";
 root.add(device);
 part(device,"FLOOR CONTACT CASE",new THREE.BoxGeometry(.72,.10,.50),
  caseMat,0,.075,0);
 part(device,"KEYBOARD TOP FRAME",new THREE.BoxGeometry(.61,.025,.30),
  edgeMat,0,.137,.081);
 const keys=[];
 for(let r=0;r<3;r++)
  for(let c=0;c<9;c++)
   keys.push(part(device,"DEFUSER KEY "+r+"-"+c,
    new THREE.BoxGeometry(.053,.018,.053),keyMat,
    (c-4)*.065,.162,-.015+r*.078));
 // The LCD and its armored lid share a real hinge at the far side of
 // the keyboard. Folded shut, it rests over the keys; then it rotates up.
 const hinge=part(device,"REAR DISPLAY HINGE",
  new THREE.CylinderGeometry(.023,.023,.59,12),edgeMat,0,.146,-.249);
 hinge.rotation.z=Math.PI/2;
 const lid=new THREE.Group();lid.name="HINGED DEFUSER SCREEN LID";
 lid.position.set(0,.145,-.249);device.add(lid);
 part(lid,"LID EXTERIOR",new THREE.BoxGeometry(.64,.32,.038),
  caseMat,0,.157,-.019);
 part(lid,"LID EDGE",new THREE.BoxGeometry(.59,.285,.042),
  edgeMat,0,.157,-.004);
 const canvas=document.createElement("canvas");canvas.width=512;canvas.height=256;
 const ctx=canvas.getContext("2d");
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;resources.push(tex);
 const screenMat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});
 resources.push(screenMat);
 part(lid,"LIVE TYPING DEFUSER SCREEN",
  new THREE.PlaneGeometry(.555,.259),screenMat,0,.157,.022);
 for(let i=0;i<3;i++)
  part(lid,"ACTIVE DEVICE INDICATOR "+i,
   new THREE.SphereGeometry(.014,9,7),ledMat,-.23+i*.055,.278,.021);

 const hands=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();
  arm.name=side<0?"LEFT HAND PLACES AND TYPES":"RIGHT HAND PLACES AND TYPES";
  root.add(arm);
  const forearm=part(arm,"KNEELING FOREARM",
   new THREE.CylinderGeometry(.071,.092,.39,10),sleeveMat,
   side*.07,-.13,.21);
  forearm.rotation.x=-.83;forearm.rotation.z=-side*.28;
  const hand=part(arm,"ANIMATED GLOVED HAND",
   new THREE.SphereGeometry(.095,12,9),gloveMat,0,0,0);
  hand.scale.set(.87,.47,1.3);
  for(let f=0;f<3;f++){
   const finger=part(arm,"TAPPING FINGER "+f,
    new THREE.CapsuleGeometry(.017,.075,4,8),gloveMat,
    side*(-.044+f*.031),.009,-.10-f*.023);
   finger.rotation.x=Math.PI/2-.13;
  }
  hands.push({arm,side});
 }
 let clock=0,renderAge=0,currentType=null,currentPhase=null;
 function draw(type,progress,phase){
  if(!ctx)return;
  const pct=clamp01(progress);
  ctx.fillStyle="#071922";ctx.fillRect(0,0,512,256);
  ctx.strokeStyle="#3ef2c8";ctx.lineWidth=6;ctx.strokeRect(5,5,502,246);
  ctx.fillStyle=type==="plant"?"#68ffdf":"#fbd27a";
  ctx.font="bold 29px monospace";
  ctx.fillText(type==="plant"?"DEFUSER // ARMING":"DEFUSER // DISABLE",23,47);
  ctx.fillStyle="#a2bac1";ctx.font="20px monospace";
  ctx.fillText(phase==="placing"?"POSITIONING DEVICE":
   phase==="opening"?"OPENING SECURE TERMINAL":
   "SECURE AUTHENTICATION TERMINAL",23,79);
  const symbols="0123456789ABCDEF";
  const typingShare=type==="plant"?
   clamp01((pct*PLANT_MOTION.plantSeconds-
    PLANT_MOTION.placeSeconds-PLANT_MOTION.openSeconds)/
    (PLANT_MOTION.plantSeconds-PLANT_MOTION.placeSeconds-PLANT_MOTION.openSeconds)):
   pct;
  const cells=Math.floor(typingShare*40);
  ctx.font="26px monospace";ctx.fillStyle="#eafff6";
  for(let i=0;i<40;i++){
   if(i<cells)ctx.fillText(symbols[(i*7+3)%symbols.length],
    23+(i%20)*23,119+Math.floor(i/20)*38);
   else{ctx.fillStyle="#326a68";ctx.fillText("_",23+(i%20)*23,119+Math.floor(i/20)*38);ctx.fillStyle="#eafff6";}
  }
  ctx.fillStyle="#1e3b48";ctx.fillRect(23,201,468,15);
  ctx.fillStyle=type==="plant"?"#48f6b5":"#ffb45d";
  ctx.fillRect(23,201,468*pct,15);
  ctx.font="bold 19px monospace";
  ctx.fillText(Math.floor(pct*100)+"% · "+
   (phase==="typing"?"TRANSMITTING":phase==="opening"?"BOOTING":"DEPLOYING"),23,242);
  tex.needsUpdate=true;
 }
 function update(type,progress,dt=0,pose=null){
  const active=(type==="plant"||type==="disable")&&
   Number.isFinite(pose?.x)&&Number.isFinite(pose?.z);
  root.visible=active;
  if(!active){currentType=null;currentPhase=null;renderAge=0;return;}
  const delta=Math.max(0,Math.min(.05,dt||0));
  clock+=delta;renderAge+=delta;
  root.position.set(pose.x,Number.isFinite(pose.y)?pose.y:0,pose.z);
  root.rotation.set(0,Number.isFinite(pose.yaw)?pose.yaw:0,0);
  const elapsed=clamp01(progress)*PLANT_MOTION.plantSeconds;
  const phase=type==="disable"?"typing":plantInteractionPhase(progress);
  const placed=type==="disable"?1:smooth(elapsed/PLANT_MOTION.placeSeconds);
  const opened=type==="disable"?1:
   smooth((elapsed-PLANT_MOTION.placeSeconds)/PLANT_MOTION.openSeconds);
  device.position.set(0,(1-placed)*.68,(1-placed)*.43);
  device.rotation.x=-(1-placed)*.24;
  lid.rotation.x=Math.PI/2*(1-opened)+opened*.10;
  for(const {arm,side} of hands){
   const typing=phase==="typing";
   const tap=typing?Math.max(0,Math.sin(clock*30+(side+1)*Math.PI/2)):0;
   arm.position.set(side*(typing?.22:.35),
    typing?.23-tap*.031:device.position.y+.24,
    typing?.17-tap*.025:device.position.z+.12);
   arm.rotation.x=typing?tap*.09:0;
  }
  keys.forEach((k,i)=>{k.position.y=.162-
   (phase==="typing"&&i===Math.floor(clock*13)%keys.length?.010:0);});
  if(currentType!==type||currentPhase!==phase||renderAge>=.07){
   currentType=type;currentPhase=phase;renderAge=0;draw(type,progress,phase);
  }
 }
 function dispose(){
  scene.remove(root);
  for(const resource of resources)resource.dispose();
 }
 return {root,update,dispose};
}
