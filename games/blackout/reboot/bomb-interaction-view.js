// BLACKOUT V0.25.4 · original first-person 3D defuser interaction.
// A camera-mounted device, animated gloved hands and real updating code
// on its screen; only visible while holding F in a valid objective zone.
export function createBombInteractionView(THREE,camera){
 const root=new THREE.Group();
 root.name="FIRST-PERSON DEFUSER · KNEEL AND TYPE";
 camera.add(root);
 // Keep the case above the physical floor even when the player kneels and
 // the interaction camera points down. The old -.47/-.79 mount sank through it.
 root.position.set(0,-.27,-.64);
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
  m.position.set(x,y,z);parent.add(m);resources.push(geometry);return m;
 }
 const device=new THREE.Group();
 device.name="HANDHELD DEFUSER KEYBOARD AND LIVE SCREEN";
 root.add(device);
 part(device,"MILITARY DEFUSER HARD CASE",
  new THREE.BoxGeometry(.70,.10,.47),caseMat,0,-.11,-.04);
 part(device,"KEYBOARD KEY PLATE",
  new THREE.BoxGeometry(.59,.032,.26),edgeMat,0,-.048,.038);
 const keys=[];
 for(let r=0;r<3;r++){
  for(let c=0;c<9;c++){
   const k=part(device,"DEFUSER KEY "+r+"-"+c,
    new THREE.BoxGeometry(.052,.018,.051),keyMat,
    (c-4)*.065,-.020,-.036+r*.078);
   keys.push(k);
  }
 }
 // A raised, forward-facing bright actual-text LCD—not an unchanging icon.
 part(device,"DEFUSER SCREEN RIM",new THREE.BoxGeometry(.60,.30,.045),
  caseMat,0,.116,-.255);
 const canvas=document.createElement("canvas");canvas.width=512;canvas.height=256;
 const ctx=canvas.getContext("2d");
 const tex=new THREE.CanvasTexture(canvas);
 tex.colorSpace=THREE.SRGBColorSpace;
 resources.push(tex);
 const screenMat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});
 resources.push(screenMat);
 const screen=part(device,"LIVE TYPING DEFUSER SCREEN",
  new THREE.PlaneGeometry(.55,.255),screenMat,0,.115,-.226);
 // LCD tilted backwards slightly so the operator can read it while kneeling.
 screen.rotation.x=-.20;
 const screenBack=part(device,"DEFUSER BACK PANEL",
  new THREE.BoxGeometry(.57,.02,.06),edgeMat,0,.258,-.24);
 screenBack.rotation.x=-.15;
 for(let i=0;i<3;i++)
  part(device,"ACTIVE DEVICE INDICATOR "+i,
   new THREE.SphereGeometry(.018,9,7),ledMat,-.23+i*.055,.23,-.21);
 const hands=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();
  arm.name=side<0?"LEFT HAND TYPES DEFUSER":"RIGHT HAND TYPES DEFUSER";
  arm.position.set(side*.29,-.10,.17);
  root.add(arm);
  const forearm=part(arm,"SLEEVE / KNEELING ARM",
   new THREE.CylinderGeometry(.071,.095,.38,10),sleeveMat,
   side*.09,-.20,.19);
  forearm.rotation.x=-.86;forearm.rotation.z=-side*.32;
  const hand=part(arm,"ANIMATED GLOVED HAND",
   new THREE.SphereGeometry(.095,12,9),gloveMat,0,.03,-.025);
  hand.scale.set(.87,.42,1.3);
  for(let f=0;f<3;f++){
   const finger=part(arm,"TAPPING FINGER "+f,
    new THREE.CapsuleGeometry(.017,.075,4,8),gloveMat,
    side*(-.044+f*.031),.032,-.095-f*.026);
   finger.rotation.x=Math.PI/2-.13;
  }
  hands.push(arm);
 }
 let clock=0,renderAge=0,currentType=null;
 function draw(type,progress){
  if(!ctx)return;
  const pct=Math.max(0,Math.min(1,progress));
  ctx.fillStyle="#071922";ctx.fillRect(0,0,512,256);
  ctx.strokeStyle="#3ef2c8";ctx.lineWidth=6;ctx.strokeRect(5,5,502,246);
  ctx.fillStyle=type==="plant"?"#68ffdf":"#fbd27a";
  ctx.font="bold 29px monospace";
  ctx.fillText(type==="plant"?"DEFUSER // ARMING":"DEFUSER // DISABLE",23,47);
  ctx.fillStyle="#a2bac1";ctx.font="20px monospace";
  ctx.fillText("SECURE AUTHENTICATION TERMINAL",23,79);
  const symbols="0123456789ABCDEF";
  const cells=Math.floor(pct*40);
  ctx.font="26px monospace";ctx.fillStyle="#eafff6";
  for(let i=0;i<40;i++){
   if(i<cells)ctx.fillText(symbols[(i*7+3)%symbols.length],
    23+(i%20)*23,119+Math.floor(i/20)*38);
   else{ctx.fillStyle="#326a68";ctx.fillText("_",23+(i%20)*23,119+Math.floor(i/20)*38);ctx.fillStyle="#eafff6";}
  }
  ctx.fillStyle="#1e3b48";ctx.fillRect(23,201,468,15);
  ctx.fillStyle=type==="plant"?"#48f6b5":"#ffb45d";
  ctx.fillRect(23,201,468*pct,15);
  ctx.font="bold 19px monospace";ctx.fillText(Math.floor(pct*100)+"% · "+(type==="plant"?"TRANSMITTING":"DECRYPTING"),23,242);
  tex.needsUpdate=true;
 }
 function update(type,progress,dt=0){
  const active=type==="plant"||type==="disable";
  root.visible=active;
  if(!active){currentType=null;renderAge=0;return;}
  const delta=Math.max(0,Math.min(.05,dt||0));
  clock+=delta;renderAge+=delta;
  // Each alternating pair of fingers visibly reaches down toward the
  // keys, rather than just shaking the whole device.
  hands.forEach((arm,i)=>{
   const pulse=Math.max(0,Math.sin(clock*30+i*Math.PI));
   arm.position.y=-.10-pulse*.047;
   arm.position.z=.17-pulse*.031;
   arm.rotation.x=pulse*.09;
  });
  keys.forEach((k,i)=>{k.position.y=-.02-(i===Math.floor(clock*12)%keys.length?.013:0);});
  device.rotation.x=-.055+Math.sin(clock*9)*.008;
  if(currentType!==type||renderAge>=.07){
   currentType=type;renderAge=0;draw(type,progress);
  }
 }
 function dispose(){
  camera.remove(root);
  for(const r of resources)r.dispose();
 }
 return {root,update,dispose};
}
