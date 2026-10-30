import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { stepMovement, requestJump, toggleCrouch, resetMotion, MOVE_TUNING, setEndurance, maximumStamina, ENDURANCE_TUNING, staminaRecoveryRate } from '../movement.mjs';
import { SCRAP_PISTOL, createWeaponState, setWeaponAim, startWeaponReload, updateWeapon, fireWeapon, createViewRecoilState, kickViewRecoil, recoverViewRecoil, shotSpreadDegrees } from '../weapons.mjs';
import { reloadVisualState, slideTravel, createCasingState, stepCasing, CASING_TUNING } from '../weapon-handling.mjs';
import { WeaponAudio, getImpactMaterial } from '../weapon-audio.mjs';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa4c0cb);
scene.fog = new THREE.Fog(0xa4c0cb, 60, 165);
const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, .08, 270);
// PointerLockControls uses YXZ yaw/pitch. Keep the camera's Euler in that
// same order: an XYZ pitch applied at non-zero yaw causes sideways tilt/roll.
camera.rotation.order = 'YXZ';
scene.add(camera); // the held weapon is a camera-relative 3D child
const controls = new PointerLockControls(camera, document.body);
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
scene.add(new THREE.HemisphereLight(0xdaf6ff,0x647269,2.2));
const sun = new THREE.DirectionalLight(0xffebc3,3.0);
sun.position.set(-34,60,18);
sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left = -80;sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;sun.shadow.camera.bottom = -80;
sun.shadow.normalBias = .025;
scene.add(sun);
function mat(color,roughness=.9){return new THREE.MeshStandardMaterial({color,roughness});}
const concrete=mat(0x26353d), floorPaint=mat(0x516a74), pale=mat(0xe7c588), dark=mat(0x13242e), orange=mat(0xc1784f), blue=mat(0x468fa8), green=mat(0x6b9b77);
const worldGeometry=[];
const targetMeshes=[];
function box(x,y,z,w,h,d,material,receive=true){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  o.position.set(x,y,z);
  o.castShadow=true;o.receiveShadow=receive;scene.add(o);worldGeometry.push(o);return o;
}
const floor=box(0,-.35,0,124,.7,106,concrete);
const grid = new THREE.GridHelper(124,62,0x45626d,0x3c5059);
grid.position.y=.015;scene.add(grid);
const bounds=[];
function collider(x,z,w,d,material=dark,height=2.8){
  box(x,height/2,z,w,height,d,material);
  bounds.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
}
collider(0,-53,124,1.7);collider(0,53,124,1.7);
collider(-62,0,1.7,106);collider(62,0,1.7,106);
for(let x=-58;x<60;x+=6){box(x,.05,-50,.15,.1,2,pale);box(x,.05,50,.15,.1,2,pale);}
const stations=[
  {title:'01 · Sprint lane',info:'Walk with W, then hold Shift. Read your actual speed, and test diagonal movement.',x:-51,z:-25,tag:'01 / SPEED',color:0xe7c588},
  {title:'02 · Jump hurdles',info:'Jump with Space to clear the low concrete barriers. Collision should stop you if you walk into one.',x:-45,z:0,tag:'02 / JUMP',color:0xc1784f},
  {title:'03 · Collision maze',info:'Press against walls and corners. Movement should slide along obstacles and never pass through them.',x:-47,z:26,tag:'03 / COLLISION',color:0x468fa8},
  {title:'04 · Ramp ascent',info:'Walk and sprint uphill, then back down. Watch the ground-height readout.',x:15,z:-27,tag:'04 / SLOPES',color:0x6b9b77},
  {title:'05 · Stairs and steps',info:'Walk up each short step and turn around. Check for snagging, jumping, or floating.',x:15,z:16,tag:'05 / STEPS',color:0xe7c588},
  {title:'06 · Low-clearance tunnel',info:'Press C to crouch, then walk under the roof. Try standing inside, and check whether you stand back up after leaving.',x:-52,z:42,tag:'06 / CROUCH',color:0x9ba5bf},
  {title:'07 · Weapon firing lane',info:'W02: aim, move and crouch to compare accuracy; fire to watch brass eject; R reloads the animated magazine and slide. F restocks. Targets and material sounds remain.',x:-52,z:-42,tag:'07 / WEAPONS',color:0xd39e63}
];
function markLane(z,accent){
  box(0,.03,z-6,110,.06,.12,accent);box(0,.03,z+6,110,.06,.12,accent);
}
function textSign(label,x,z,color){
  const c=document.createElement('canvas');c.width=512;c.height=160;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#13232c';ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillRect(0,0,12,160);
  ctx.fillStyle='#e8f0e8';ctx.font='bold 45px Arial';ctx.fillText(label,34,94);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(8,2.5),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));
  mesh.position.set(x,3,z);scene.add(mesh);
  box(x,1.4,z,.1,2.8,.1,dark);
}
for(const s of stations)textSign(s.tag,s.x+5,s.z-8,s.color);
markLane(-25,pale);
for(let x=-47;x<55;x+=5){
  box(x,.065,-25,.14,.13,4,floorPaint);
  if((x+47)%20===0)box(x,.07,-25,.35,.14,9,pale);
}
box(0,.085,-25,112,.04,.06,pale);
markLane(0,orange);
for(let i=0;i<5;i++){
  const x=-31+i*13,h=.65+(i%3)*.11;
  box(x,h/2,0,1.6,h,7,orange);
  bounds.push({minX:x-.8,maxX:x+.8,minZ:-3.5,maxZ:3.5,top:h});
}
markLane(26,blue);
const maze=[
  [-25,19,2,9],[-18,32,2,9],[-9,21,2,8],
  [0,32,2,9],[11,21,2,8],[-15,25,8,1.5],
  [-1,27,8,1.5],[20,31,2,10]
];
for(const a of maze)collider(a[0],a[1],a[2],a[3],blue,2.5);
// Dedicated crouch station: a real low ceiling that blocks upright bodies.
const ceilings=[{minX:-43,maxX:-12,minZ:36,maxZ:46,bottom:1.32}];
box(-27.5,1.48,41,31,.32,10,blue); // roof underside at 1.32 metres
collider(-27.5,41-4.95,31,.3,dark,1.3);
collider(-27.5,41+4.95,31,.3,dark,1.3);
for(const x of [-42.7,-12.3]){
  box(x,.72,36.2,.35,1.44,.35,pale);
  box(x,.72,45.8,.35,1.44,.35,pale);
}

// West-to-east ramp: level ground to a raised platform, then a descending run.
const rampStart=22,rampEnd=43,rampTop=2.3;
function rampHeight(x,z){
  if(z<-34||z>-18||x<rampStart||x>56)return 0;
  if(x<=rampEnd)return (x-rampStart)/(rampEnd-rampStart)*rampTop;
  if(x<=49)return rampTop;
  return Math.max(0,rampTop*(56-x)/7);
}
function rampSurface(x0,x1,z0,z1){
  const h0=rampHeight(x0,(z0+z1)/2),h1=rampHeight(x1,(z0+z1)/2);
  const verts=new Float32Array([x0,h0,z0,x1,h1,z0,x1,h1,z1,x0,h0,z0,x1,h1,z1,x0,h0,z1]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(verts,3));g.computeVertexNormals();
  const surface=green.clone();surface.side=THREE.DoubleSide;const m=new THREE.Mesh(g,surface);m.receiveShadow=true;scene.add(m);
}
rampSurface(22,43,-34,-18);rampSurface(43,49,-34,-18);rampSurface(49,56,-34,-18);
box(39,.045,-18,34,.09,.2,pale);box(39,.045,-34,34,.09,.2,pale);
// Stair height uses the same piecewise rise as the visible mesh.
const stairStart=22,stairWidth=2.8,stairCount=8,stairRise=.25;
function stairsHeight(x,z){
  if(z<9||z>23||x<stairStart||x>stairStart+stairWidth*stairCount+7)return 0;
  if(x<stairStart+stairWidth*stairCount){
    return Math.min(stairCount,Math.floor((x-stairStart)/stairWidth)+1)*stairRise;
  }
  return 2;
}
for(let n=0;n<stairCount;n++){
  const x=stairStart+n*stairWidth+stairWidth/2;
  const top=(n+1)*stairRise;
  box(x,top/2,16,stairWidth,top,13,floorPaint);
  box(stairStart+n*stairWidth+.025,top+.014,16,.05,.025,12,pale);
}
box(22+stairWidth*stairCount+3,1,16,6,2,13,floorPaint);

// Weapons test lane: five original targets spaced across a clear firing lane.
// All meshes are real raycastable geometry, not screen-space hitboxes.
const targetData=new Map();
const sound=new WeaponAudio();
function soundCaption(){
  $('soundToggle').textContent=sound.enabled?'SOUND: ON · N TO MUTE':'SOUND: MUTED · N TO UNMUTE';
  $('soundToggle').setAttribute('aria-pressed',String(sound.enabled));
}
function toggleSound(){
  sound.setEnabled(!sound.enabled);
  soundCaption();
}
$('soundToggle').addEventListener('click',toggleSound);
soundCaption();

// Small, persistent raycast decals. Decal meshes are NOT included in the
// raycast array, so consecutive shots can still hit the surface beneath them.
const impactMarks=[];
const IMPACT_MARK_LIMIT=140;
const impactGeometry=new THREE.PlaneGeometry(1,1);
const impactNormalMatrix=new THREE.Matrix3();
const impactWorldNormal=new THREE.Vector3();
const decalFacing=new THREE.Vector3(0,0,1);
function impactTexture(paperSurface){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  const cx=64,cy=64;
  const ring=ctx.createRadialGradient(cx,cy,5,cx,cy,57);
  ring.addColorStop(0,paperSurface?'rgba(28,25,23,1)':'rgba(10,13,13,1)');
  ring.addColorStop(.20,'rgba(18,20,21,1)');
  ring.addColorStop(.32,paperSurface?'rgba(93,73,53,.95)':'rgba(58,54,48,.95)');
  ring.addColorStop(.57,paperSurface?'rgba(156,126,89,.55)':'rgba(51,51,50,.50)');
  ring.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ring;
  ctx.beginPath();ctx.arc(cx,cy,57,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=paperSurface?'rgba(70,49,33,.6)':'rgba(20,19,18,.8)';
  ctx.lineWidth=2.5;
  for(let k=0;k<12;k++){
    const angle=k*Math.PI*2/12;
    const inner=16+(k%3)*3;
    const outer=24+(k%4)*4;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(angle)*inner,cy+Math.sin(angle)*inner);
    ctx.lineTo(cx+Math.cos(angle+.06)*outer,cy+Math.sin(angle+.06)*outer);
    ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
const impactMaterials={
  paper:new THREE.MeshBasicMaterial({
    map:impactTexture(true),transparent:true,alphaTest:.035,
    depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2
  }),
  solid:new THREE.MeshBasicMaterial({
    map:impactTexture(false),transparent:true,alphaTest:.035,
    depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2
  })
};
function markBulletHole(hit,isPaper){
  if(!hit.face)return;
  hit.object.updateWorldMatrix(true,false);
  impactNormalMatrix.getNormalMatrix(hit.object.matrixWorld);
  impactWorldNormal.copy(hit.face.normal).applyMatrix3(impactNormalMatrix).normalize();
  if(impactWorldNormal.dot(shotVector)>0)impactWorldNormal.negate();
  const mesh=new THREE.Mesh(impactGeometry,isPaper?impactMaterials.paper:impactMaterials.solid);
  const size=isPaper?.22:.16;
  mesh.scale.set(size,size,1);
  mesh.position.copy(hit.point).addScaledVector(impactWorldNormal,.022);
  mesh.quaternion.setFromUnitVectors(decalFacing,impactWorldNormal);
  mesh.renderOrder=2;
  scene.add(mesh);
  impactMarks.push(mesh);
  if(impactMarks.length>IMPACT_MARK_LIMIT)scene.remove(impactMarks.shift());
}
function clearBulletHoles(){
  for(const mesh of impactMarks)scene.remove(mesh);
  impactMarks.length=0;
}

const paper=mat(0xe9e2c8), black=mat(0x202c2e), bull=mat(0xd85e51);
function makeTarget(id,x,z){
  const support=box(x,.82,z,.16,1.65,.19,dark);
  support.userData.impactMaterial='metal';
  const stand=box(x,.07,z,1.1,.14,.8,floorPaint);
  stand.userData.impactMaterial='concrete';
  const group=new THREE.Group();
  group.position.set(x,1.82,z);
  group.rotation.y=-Math.PI/2; // face the player looking along +X
  scene.add(group);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.35),paper.clone());
  back.material.side=THREE.DoubleSide;
  back.userData.targetId=id;
  back.userData.impactMaterial='paper';
  back.material.emissive=new THREE.Color(0x000000);
  group.add(back);
  targetMeshes.push(back);
  const disk=(radius,color,zdepth)=>{
    const mesh=new THREE.Mesh(new THREE.CircleGeometry(radius,32),color.clone());
    mesh.position.z=zdepth;mesh.userData.targetId=id;
    mesh.userData.impactMaterial='paper';
    mesh.material.side=THREE.DoubleSide;group.add(mesh);targetMeshes.push(mesh);
  };
  disk(.68,black,.015);disk(.43,paper,.025);disk(.18,bull,.036);
  targetData.set(id,{back,hits:0});
}
const targetPositions=[[-27,-42],[-12,-39],[4,-44],[20,-40],[36,-46]];
targetPositions.forEach(([x,z],i)=>makeTarget(i+1,x,z));

// Three distinct material samples along the edge of station 7. All three
// have collider geometry and explicit impact tags, so the player can compare
// sounds without having to guess what a random scenery prop is made from.
const materialSamples=[
  {name:'WOOD',x:-25,material:mat(0x866447),impact:'wood'},
  {name:'METAL',x:-8,material:mat(0x6b7e8b,.38),impact:'metal'},
  {name:'CONCRETE',x:9,material:concrete,impact:'concrete'}
];
for(const sample of materialSamples){
  const z=-48.2;
  const plate=box(sample.x,1.33,z,2.65,2.5,.42,sample.material);
  plate.userData.impactMaterial=sample.impact;
  bounds.push({minX:sample.x-1.325,maxX:sample.x+1.325,minZ:z-.21,maxZ:z+.21});
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#101d23';ctx.fillRect(0,0,512,128);
  ctx.font='bold 52px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#e8d5ad';ctx.fillText(sample.name,256,68);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.6),
    new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  label.position.set(sample.x,2.89,z+.29);
  scene.add(label);
}

// Recognisable first-person makeshift pistol rather than a HUD-only crosshair.
// All meshes are viewmodel geometry; the shared weapons.mjs owns the rules.
const weaponState=createWeaponState();
const viewRecoil=createViewRecoilState();
const pistol=new THREE.Group();
camera.add(pistol);
pistol.position.set(.32,-.31,-.77);
const metal=mat(0x676b65,.52),receiver=mat(0x38464a,.5),
  rust=mat(0x855b45,.87),wood=mat(0x75583e,.86),sights=mat(0x111a1e,.55);
function gunPart(geometry,material,x,y,z,parent=pistol){
  const part=new THREE.Mesh(geometry,material);
  part.position.set(x,y,z);parent.add(part);return part;
}
gunPart(new THREE.BoxGeometry(.19,.14,.37),receiver,0,.015,.02);
// The entire top slide and its sights move when the action cycles.
const slideGroup=new THREE.Group();pistol.add(slideGroup);
gunPart(new THREE.BoxGeometry(.21,.105,.24),metal,0,.097,-.065,slideGroup);
const barrel=gunPart(new THREE.CylinderGeometry(.043,.053,.43,12),rust,0,.057,-.35);
barrel.rotation.x=-Math.PI/2;
const muzzle=gunPart(new THREE.TorusGeometry(.050,.012,8,16),sights,0,.057,-.57);
gunPart(new THREE.BoxGeometry(.14,.27,.12),wood,0,-.19,.16).rotation.x=-.18;
gunPart(new THREE.TorusGeometry(.08,.014,8,20),metal,0,-.12,.017);
for(const side of [-1,1])gunPart(new THREE.BoxGeometry(.026,.055,.035),sights,.078*side,.178,.10,slideGroup);
gunPart(new THREE.BoxGeometry(.035,.060,.040),sights,0,.172,-.42,slideGroup);
gunPart(new THREE.BoxGeometry(.13,.065,.13),rust,.005,.065,.19);
gunPart(new THREE.BoxGeometry(.09,.06,.12),wood,.14,-.19,.14);
// Visible inserted magazine and procedural gloved hands (no skeletal rig yet).
const magazine=gunPart(new THREE.BoxGeometry(.10,.19,.095),metal,0,-.34,.17);
const magazineBase=gunPart(new THREE.BoxGeometry(.125,.025,.115),sights,0,-.445,.17);
const glove=mat(0x313b40,.95),seam=mat(0x69716b,.92);
gunPart(new THREE.BoxGeometry(.165,.175,.18),glove,.09,-.26,.21);
gunPart(new THREE.BoxGeometry(.09,.035,.16),seam,.135,-.18,.21);
const reloadHand=new THREE.Group();pistol.add(reloadHand);
gunPart(new THREE.SphereGeometry(.095,10,8),glove,0,0,0,reloadHand);
gunPart(new THREE.BoxGeometry(.11,.14,.17),glove,-.07,-.075,.06,reloadHand);
reloadHand.visible=false;
const muzzleGlow=new THREE.PointLight(0xffaa58,0,1.8,2);
muzzleGlow.position.set(0,.057,-.57);pistol.add(muzzleGlow);
// Screen-facing, textured flare at the actual 3D barrel tip.
const flareCanvas=document.createElement('canvas');
flareCanvas.width=flareCanvas.height=128;
const flareCtx=flareCanvas.getContext('2d');
const flareGradient=flareCtx.createRadialGradient(64,64,4,64,64,63);
flareGradient.addColorStop(0,'rgba(255,255,235,1)');
flareGradient.addColorStop(.22,'rgba(255,230,116,.95)');
flareGradient.addColorStop(.55,'rgba(255,128,31,.62)');
flareGradient.addColorStop(1,'rgba(255,90,0,0)');
flareCtx.fillStyle=flareGradient;flareCtx.fillRect(0,0,128,128);
const flareTex=new THREE.CanvasTexture(flareCanvas);
flareTex.colorSpace=THREE.SRGBColorSpace;
const muzzleFlare=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),
  new THREE.MeshBasicMaterial({map:flareTex,transparent:true,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
muzzleFlare.position.set(0,.057,-.595);
muzzleFlare.visible=false;pistol.add(muzzleFlare);
// Reusable low-poly brass casing geometry and limited world-space physics.
const casingGeometry=new THREE.CylinderGeometry(.029,.029,.105,8);
const casingCapGeometry=new THREE.CylinderGeometry(.031,.031,.008,8);
const brass=mat(0xc9a559,.36),brassCap=mat(0x86682e,.6);
const casings=[];
const casingRight=new THREE.Vector3(),casingForward=new THREE.Vector3(),
  casingOrigin=new THREE.Vector3(),worldAxis=new THREE.Vector3();
function clearCasings(){
  while(casings.length)scene.remove(casings.pop().mesh);
}
function ejectCasing(){
  camera.updateMatrixWorld(true);
  casingOrigin.set(.18,-.08,-.47).applyMatrix4(camera.matrixWorld);
  casingRight.set(1,0,0).applyQuaternion(camera.quaternion);
  casingForward.set(0,0,-1).applyQuaternion(camera.quaternion);
  const state=createCasingState(casingOrigin,casingRight,casingForward);
  const body=new THREE.Group();
  body.add(new THREE.Mesh(casingGeometry,brass));
  const cap=new THREE.Mesh(casingCapGeometry,brassCap);
  cap.position.y=.055;body.add(cap);
  body.position.copy(casingOrigin);body.rotation.z=Math.PI/2;
  scene.add(body);
  casings.push({mesh:body,state});
  if(casings.length>CASING_TUNING.maxVisible)scene.remove(casings.shift().mesh);
}
function updateCasings(dt){
  for(let i=casings.length-1;i>=0;i--){
    const {state,mesh}=casings[i];
    const floorLevel=groundHeight(state.x,state.z);
    stepCasing(state,dt,floorLevel);
    mesh.position.set(state.x,state.y,state.z);
    if(!state.settled)mesh.rotation.set(state.rx,state.ry,state.rz);
    if(state.age>CASING_TUNING.maxLife){
      scene.remove(mesh);casings.splice(i,1);
    }
  }
}
const firingRaycaster=new THREE.Raycaster();
firingRaycaster.far=105;
const shotVector=new THREE.Vector3();
let totalHits=0,shotNoticeTime=0,recoilKick=0,mouseSway=0,muzzleFlash=0;
let slideCycle=0,handlingTime=0,weaponMotion={speed:0},reloadAnimWasActive=false;
function showShotNotice(message){
  $('shotNotice').textContent=message;
  $('shotNotice').classList.add('visible');
  shotNoticeTime=.8;
}
function refreshWeaponHUD(){
  $('weaponAmmo').textContent=weaponState.magazine+' / '+weaponState.reserve;
  $('weaponState').textContent=weaponState.reloadRemaining>0?'RELOADING':
    weaponState.magazine===0?'EMPTY · R TO RELOAD':weaponState.aiming?'AIMING':'READY';
  $('targetHits').textContent=totalHits;
  $('weaponAccuracy').textContent='SPREAD '+shotSpreadDegrees(SCRAP_PISTOL,
    weaponState.aiming,weaponMotion).toFixed(2)+'°'+
    (weaponMotion.airborne?' · AIRBORNE':weaponMotion.crouched?' · CROUCHED':
      weaponMotion.speed>2?' · MOVING':' · STEADY');
  $('reloadProgress').style.width=(weaponState.reloadRemaining>0?
    100*(1-weaponState.reloadRemaining/SCRAP_PISTOL.reloadSeconds):0).toFixed(1)+'%';
}
function shoot(){
  const result=fireWeapon(weaponState,SCRAP_PISTOL,Math.random,weaponMotion);
  if(result.status==='empty'){
    sound.dryFire();showShotNotice('EMPTY · PRESS R');return;
  }
  if(result.status!=='fired')return;
  sound.gunshot();
  recoilKick=Math.min(.30,recoilKick+.14);
  muzzleFlash=.085;
  slideCycle=.13;
  ejectCasing();
  // Determine the projectile direction from the pre-recoil sight orientation.
  // Applying recoil before raycasting incorrectly shifts the bullet off target.
  shotVector.set(result.spreadX,result.spreadY,-1).normalize().applyQuaternion(camera.quaternion);
  firingRaycaster.set(camera.position,shotVector);
  const hits=firingRaycaster.intersectObjects([...worldGeometry,...targetMeshes],false);
  const first=hits[0];
  let impactMaterial=null;
  if(first){
    impactMaterial=getImpactMaterial(first);
    const isPaper=impactMaterial==='paper';
    markBulletHole(first,isPaper);
    // AudioContext scheduling creates an audible gap after the gunshot.
    // A little extra distance adds a subtle travel-time effect.
    sound.impact(impactMaterial,.15+Math.min(.11,first.distance*.0017));
  }
  if(first&&first.object.userData.targetId){
    const target=targetData.get(first.object.userData.targetId);
    target.hits++;totalHits++;
    target.back.material.emissive.setHex(0x956c2f);
    target.back.material.emissiveIntensity=.75;
    target.back.userData.flash=.22;
    showShotNotice('TARGET HIT · +'+result.damage+' DAMAGE · PAPER');
  } else if(first)showShotNotice(impactMaterial.toUpperCase()+' IMPACT');
  else showShotNotice('MISS');
  // Vertical recoil only. Yaw and roll are never touched.
  camera.rotation.x=kickViewRecoil(viewRecoil,camera.rotation.x,result.recoilDegrees);
  refreshWeaponHUD();
}
function reload(){
  if(startWeaponReload(weaponState)){
    slideCycle=0;
    sound.reload();
    showShotNotice('RELOADING');refreshWeaponHUD();
  }
}
function resupply(){
  const fresh=createWeaponState();
  Object.assign(weaponState,fresh);
  showShotNotice('TEST AMMO RESTOCKED');
  // Do not leave the old reload hand suspended if F is used mid-reload.
  slideCycle=0;
  refreshWeaponHUD();
}
refreshWeaponHUD();
function groundHeight(x,z){return Math.max(rampHeight(x,z),stairsHeight(x,z));}
const player={x:stations[0].x,z:stations[0].z,jump:0,vertical:0};
let labEndurance=ENDURANCE_TUNING.defaultPoints;
try{const last=Number(localStorage.getItem('rpg-lab-endurance'));if(last>=1&&last<=10)labEndurance=Math.round(last);}catch{}
setEndurance(player,labEndurance);
function adjustEndurance(change){
  labEndurance=setEndurance(player,labEndurance+change);
  $('enduranceValue').textContent=String(labEndurance);
  $('enduranceHUD').textContent=String(labEndurance);
  $('sprintTime').textContent=maximumStamina(labEndurance)+' sec sprint · '+(maximumStamina(labEndurance)/staminaRecoveryRate(labEndurance)).toFixed(1)+' sec full recovery';
  $('staminaFill').style.width='100%';
  $('staminaNumber').textContent='100%';
  try{localStorage.setItem('rpg-lab-endurance',String(labEndurance));}catch{}
}
$('endDown').addEventListener('click',()=>adjustEndurance(-1));
$('endUp').addEventListener('click',()=>adjustEndurance(1));
adjustEndurance(0);
const keys=new Set();
const forward=new THREE.Vector3();
const clock=new THREE.Clock();
let stationIndex=0,qualityHigh=true;
function resetPlayer(i){
  stationIndex=i;const s=stations[i];
  player.x=s.x;player.z=s.z;player.jump=0;player.vertical=0;player.supported=false;
  resetMotion(player);
  // Reset both the view direction and the unrecovered weapon kick.
  viewRecoil.unrecovered=0;
  // Reset location only, not stamina. Press [ or ] to refill for a test. 
  camera.rotation.set(0,-Math.PI/2,0);
  $('stationName').textContent=s.title;$('stationInfo').textContent=s.info;
  camera.position.set(player.x,groundHeight(player.x,player.z)+player.eyeHeight,player.z);
}
resetPlayer(0);
$('start').addEventListener('click',()=>{
  // The audio engine is unlocked only after the player initiates playback.
  sound.unlock();
  controls.lock();
});
canvas.addEventListener('click',()=>{if(!$('menu').classList.contains('hidden'))return;controls.lock();});
controls.addEventListener('lock',()=>{$('menu').classList.add('hidden');});
controls.addEventListener('unlock',()=>{
  $('menu').classList.remove('hidden');keys.clear();
  setWeaponAim(weaponState,false);
});
$('quality').addEventListener('click',()=>{
  qualityHigh=!qualityHigh;
  renderer.setPixelRatio(Math.min(devicePixelRatio,qualityHigh?1.6:1));
  sun.castShadow=qualityHigh;
  renderer.shadowMap.enabled=qualityHigh;
  $('quality').textContent='QUALITY: '+(qualityHigh?'HIGH':'LOW');
});
window.addEventListener('keydown',e=>{
  if(e.code==='BracketLeft'||e.code==='BracketRight'){
    e.preventDefault();if(!e.repeat)adjustEndurance(e.code==='BracketRight'?1:-1);return;
  }
  if(e.code==='KeyN'&&!e.repeat){
    toggleSound();return;
  }
  if(e.code==='KeyC'&&!e.repeat&&controls.isLocked){toggleCrouch(player);return;}
  if(e.code==='Space'&&e.repeat){e.preventDefault();return;}
  if(e.code.startsWith('Digit')&&Number(e.code.slice(5))>=1&&Number(e.code.slice(5))<=7){
    resetPlayer(Number(e.code.slice(5))-1);return;
  }
  if(e.code==='KeyR'&&!e.repeat&&controls.isLocked){reload();return;}
  if(e.code==='KeyF'&&!e.repeat&&controls.isLocked){resupply();return;}
  if(e.code==='KeyT'&&!e.repeat){
    clearBulletHoles();
    clearCasings();
    resetPlayer(stationIndex);return;
  }
  if(e.code==='Space'){e.preventDefault();if(controls.isLocked)requestJump(player);}
  keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('mousedown',e=>{
  if(!controls.isLocked)return;
  if(e.button===0)shoot();
  if(e.button===2)setWeaponAim(weaponState,true);
});
window.addEventListener('mouseup',e=>{
  if(e.button===2)setWeaponAim(weaponState,false);
});
window.addEventListener('mousemove',e=>{
  if(controls.isLocked)mouseSway=Math.max(-.08,Math.min(.08,mouseSway+e.movementX*.00025));
});
window.addEventListener('blur',()=>{keys.clear();setWeaponAim(weaponState,false);});
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
function updateHUD(info){
  $('speed').textContent=info.speed.toFixed(1)+' m/s';
  $('state').textContent=info.airborne?'JUMP':info.crouched?'CROUCH':info.moving?(info.sprinting?'SPRINT':'WALK'):'IDLE';
  $('height').textContent=(info.ground+player.jump).toFixed(1)+' m';
  $('staminaFill').style.width=(info.staminaFraction*100).toFixed(1)+'%';
  $('staminaNumber').textContent=Math.round(info.staminaFraction*100)+'%';
  $('staminaState').textContent=info.exhausted?'EXHAUSTED':info.sprinting?'DRAINING':info.recovering?'RECOVERING':'READY';
  $('staminaFill').classList.toggle('empty',info.exhausted);
}
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(.036,clock.getDelta());
  updateWeapon(weaponState,dt);
  // Ease camera pitch back to the player's original view. This applies in
  // YXZ space, so mouse-look cannot leave the camera permanently tilted.
  if(viewRecoil.unrecovered>0){
    camera.rotation.x=recoverViewRecoil(viewRecoil,camera.rotation.x,dt);
  }
  recoilKick*=Math.exp(-11*dt);
  mouseSway*=Math.exp(-9*dt);
  muzzleFlash=Math.max(0,muzzleFlash-dt);
  slideCycle=Math.max(0,slideCycle-dt);
  muzzleGlow.intensity=muzzleFlash>0?5.5:0;
  muzzleFlare.visible=muzzleFlash>0;
  if(muzzleFlare.visible){
    const q=muzzleFlash/.085;
    muzzleFlare.scale.setScalar(.65+q*.8);
    muzzleFlare.material.opacity=q;
  }
  const handling=reloadVisualState(weaponState.reloadRemaining,SCRAP_PISTOL.reloadSeconds);
  slideGroup.position.z=slideTravel(slideCycle)+handling.slideOffset;
  magazine.position.y=-.34-handling.magazineOffset;
  magazineBase.position.y=-.445-handling.magazineOffset;
  magazine.rotation.z=handling.magazineAngle;
  magazineBase.rotation.z=handling.magazineAngle;
  reloadHand.visible=handling.handVisible;
  reloadHand.position.set(handling.handX,handling.handY,handling.handZ);
  // Distinct idle/ADS movement sway, with substantially steadier sights in ADS.
  handlingTime+=dt;
  const moving=Math.min(1,(weaponMotion.speed||0)/4.5);
  const steadiness=weaponState.aiming?.22:1;
  const swayX=Math.sin(handlingTime*(2.1+moving*6))*(.0035+moving*.011)*steadiness;
  const swayY=Math.cos(handlingTime*(2.7+moving*5))*(.0025+moving*.008)*steadiness;
  const desired=weaponState.aiming?new THREE.Vector3(0,-.176,-.61):
    new THREE.Vector3(.32,-.31,-.77);
  desired.x+=swayX;desired.y+=swayY;
  if(weaponMotion.sprinting)desired.y-=.10;
  if(handling.active){desired.x+=.045;desired.y-=.04;}
  pistol.position.lerp(desired,1-Math.exp(-16*dt));
  pistol.rotation.x=recoilKick+handling.tilt;
  pistol.rotation.y=mouseSway*steadiness;
  pistol.rotation.z=mouseSway*.28*steadiness;
  camera.fov+=( (weaponState.aiming?58:76)-camera.fov)*(1-Math.exp(-13*dt));
  camera.updateProjectionMatrix();
  $('crosshair').classList.toggle('hidden',weaponState.aiming);
  for(const {back} of targetData.values()){
    const flash=back.userData.flash||0;
    if(flash>0){
      back.userData.flash=Math.max(0,flash-dt);
      if(back.userData.flash===0)back.material.emissiveIntensity=0;
    }
  }
  if(shotNoticeTime>0){shotNoticeTime-=dt;if(shotNoticeTime<=0)$('shotNotice').classList.remove('visible');}
  updateCasings(dt);
  refreshWeaponHUD();
  if(controls.isLocked){
    controls.getDirection(forward);
    const info=stepMovement(player,keys,{x:forward.x,z:forward.z},dt,{boxes:bounds,trees:[],ceilings,groundHeight});
    weaponMotion={speed:info.speed,sprinting:info.sprinting,airborne:info.airborne,crouched:info.crouched};
    camera.position.set(player.x,info.ground+info.eyeHeight+info.cameraBob+player.jump,player.z);
    updateHUD(info);
  }
  renderer.render(scene,camera);
}
frame();
