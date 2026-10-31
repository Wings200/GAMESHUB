import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { stepMovement, requestJump, toggleCrouch, resetMotion, MOVE_TUNING, setEndurance, maximumStamina, ENDURANCE_TUNING, staminaRecoveryRate } from '../movement.mjs';
import { SCRAP_PISTOL, ARSENAL, ARSENAL_IDS, getWeaponSpec, createArsenalStates,
  createWeaponState, setWeaponAim, startWeaponReload, updateWeapon, fireWeapon,
  createViewRecoilState, kickViewRecoil, recoverViewRecoil,
  shotSpreadDegrees } from '../weapons.mjs';
import { reloadVisualState, slideTravel, createCasingState, stepCasing, CASING_TUNING } from '../weapon-handling.mjs';
import { sightMount, adsWeaponPosition, sightForOptic, OPTIC_MODS,
  compatibleOptics } from '../weapon-sights.mjs';
import { WeaponAudio, getImpactMaterial } from '../weapon-audio.mjs';
import {POWER_ARMOR_SLOTS,POWER_ARMOR_PLATES,createPowerArmorState,
  setPowerPlate,beginPowerArmorTransition,stepPowerArmor,
  POWER_ARMOR_TRANSITION_SECONDS,powerArmorProtection,safePowerArmorSnapshot} from '../power-armor.mjs';
import {buildPowerArmorVisual,buildPowerArmorCockpit} from '../power-armor-visual.mjs';
import { createEnemyBrain, stepEnemyBrain, alertEnemy, resetEnemyBrain } from '../enemy-ai.mjs';
import { ENEMY_PROFILES, makeEnemyTactics, resetEnemyTactics,
  markEnemyThreat, tickEnemyTactics, attemptEnemyShot } from '../enemy-tactics.mjs';
import {createSquadIntel,clearSquadIntel,reportSquadContact,
  stepSquadIntel,shareSquadContact,squadSeparation,
  occupiedSquadCover} from '../enemy-squad.mjs';
import { createPlayerHealth, hitPlayer, resetPlayerHealth, canEnemyFire,
  ENEMY_ATTACK } from '../player-combat.mjs';
import { isArenaActive,shouldRaycastEnemy,combatRuntimeStatus } from '../arena-activation.mjs';
import {BACKPACK_LIMIT,RARITIES,getItem,createBackpack,addItem,removeItem,
  equipFromInventory,useSupply,playerArmorReduction,createLootBag,
  takeFromBag,takeAllFromBag,generateEnemyLoot,safeBackpackSnapshot,
  totalInventoryValue,installWeaponOptic,installedWeaponOptic,countItem} from '../inventory.mjs';
import { ARMOR_SLOTS, ARMOR_SLOT_LABELS, ARMOR_ITEMS, getArmorPiece, createLoadout,
  createDummy, equipArmor, armorPointsForSlot, damageReductionForPoints,
  enemyArmorForRound,
  applyDamage, resetDummy } from '../combat.mjs';

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
// Prefer the standard WebGL 2 context so browsers may choose their own GPU
// or software-backed implementation. Retry with fewer framebuffer demands
// on systems where multisampling or the preferred adapter is unavailable.
let renderer;
let reducedRenderer=false;
try{
  renderer=new THREE.WebGLRenderer({
    canvas,antialias:true,powerPreference:'default',
    failIfMajorPerformanceCaveat:false
  });
}catch(primaryError){
  try{
    renderer=new THREE.WebGLRenderer({
      canvas,antialias:false,powerPreference:'low-power',
      failIfMajorPerformanceCaveat:false
    });
    reducedRenderer=true;
  }catch(fallbackError){
    throw new Error('WebGL 2 context unavailable in this browser (hardware or software). '
      +(fallbackError?.message||primaryError?.message||'Context creation failed'));
  }
}
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,reducedRenderer?1:1.6));
renderer.shadowMap.enabled = !reducedRenderer;
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
  {title:'07 · Weapon firing lane',info:'W02: aim, move and crouch to compare accuracy; fire to watch brass eject; R reloads the animated magazine and slide. F restocks. Targets and material sounds remain.',x:-52,z:-42,tag:'07 / WEAPONS',color:0xd39e63},
  {title:'08 · Modular armor & power suit',info:'W08.0: inspect the real hydraulic exoskeleton, press P nearby to enter or exit, O to fit all six power armor plates. Existing training dummies still use B and Y.',x:-52,z:-12,tag:'08 / ARMOR',color:0xe2b078},
  {title:'09 · Live enemy arena',info:'W04.1: 3 visible enemies directly ahead. They patrol, chase and fire when they see you. Watch your HP. H heals, J resets bots, K freezes AI.',x:30,z:42,tag:'09 / AI TEST',color:0xe77d68}
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
// Solid optics bench next to Station 7, reachable with E.
const opticBench={x:-55,z:-43};
box(opticBench.x,.47,opticBench.z,2,.94,.82,dark);
box(opticBench.x,.99,opticBench.z,2.2,.12,1.04,mat(0x886e54,.65));
textSign('OPTICS BENCH · E',-61,-39,0xe4c38b);
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
function markBulletHole(hit,isPaper,followSurface=false){
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
  if(followSurface){
    const worldRotation=hit.object.getWorldQuaternion(new THREE.Quaternion());
    hit.object.worldToLocal(mesh.position);
    mesh.quaternion.premultiply(worldRotation.invert());
    hit.object.add(mesh);
  } else scene.add(mesh);
  impactMarks.push(mesh);
  if(impactMarks.length>IMPACT_MARK_LIMIT){
    const oldest=impactMarks.shift();
    oldest.parent?.remove(oldest);
  }
}
function clearBulletHoles(){
  for(const mesh of impactMarks)mesh.parent?.remove(mesh);
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


// W03.1 modular armor lab. Six independently raycastable and equipable slots.
const dummies=new Map(),dummyHitMeshes=[],damagePopups=[];
const dummyKinds=[
  {id:'none',label:'UNARMORED',x:-28,z:-8.7,body:0x7e6e55},
  {id:'light',label:'FIELD KIT',x:-9,z:-15.2,body:0x6b795b},
  {id:'heavy',label:'CITADEL',x:12,z:-9,body:0x495a69}
];
const popupsMax=16;
function makeDummyLabel(dummy){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false});
  const sprite=new THREE.Sprite(material);
  sprite.position.set(dummy.position.x,2.96,dummy.position.z);
  sprite.scale.set(3.2,1.02,1);
  scene.add(sprite);
  return {canvas,ctx,texture,sprite};
}
function updateDummyLabel(dummy){
  const {ctx,canvas,texture}=dummy.labelVisual,s=dummy.state;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(9,23,28,.91)';ctx.fillRect(4,4,504,151);
  ctx.strokeStyle=s.alive?'#bfcdba':'#d25f53';ctx.lineWidth=5;ctx.strokeRect(4,4,504,151);
  ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.font='bold 29px system-ui';ctx.fillStyle='#f1d9ac';
  ctx.fillText(dummy.title,22,33);
  ctx.font='bold 25px system-ui';ctx.fillStyle=s.alive?'#e9f6df':'#e98d7a';
  ctx.fillText(s.alive?Math.ceil(s.health)+' / '+s.maxHealth+' HP':'DOWN · Y RESET',22,73);
  ctx.fillStyle='#273b39';ctx.fillRect(21,95,470,17);
  ctx.fillStyle=s.health>40?'#93c89c':'#cb7567';
  ctx.fillRect(21,95,470*s.health/s.maxHealth,17);
  const rating=ARMOR_SLOTS.reduce((sum,slot)=>sum+armorPointsForSlot(s,slot),0);
  ctx.font='bold 21px system-ui';ctx.fillStyle='#cbd3df';
  ctx.fillText('EQUIPPED RATING: '+rating+' AP · NO WEAR',22,136);
  texture.needsUpdate=true;
}
function makeDummy(entry){
  const group=new THREE.Group();
  group.position.set(entry.x,0,entry.z);
  group.rotation.y=-Math.PI/2;
  scene.add(group);
  const dummy={id:entry.id,title:entry.label,state:createDummy(entry.id),group,
    position:{x:entry.x,z:entry.z},pieces:[],armorMeshes:[],
    flash:0,impulse:0};
  const wooden=new THREE.MeshStandardMaterial({color:entry.body,roughness:.85});
  const darkJoint=new THREE.MeshStandardMaterial({color:0x343c3d,roughness:.94});
  function part(geometry,material,x,y,z,slot,armor=false){
    const mesh=new THREE.Mesh(geometry,material.clone());
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData={dummyId:dummy.id,hitZone:slot,
      impactMaterial:armor?'metal':'wood'};
    group.add(mesh);
    dummy.pieces.push(mesh);dummyHitMeshes.push(mesh);
    if(armor)dummy.armorMeshes.push(mesh);
    return mesh;
  }
  dummy.part=part;
  part(new THREE.BoxGeometry(.64,.80,.32),wooden,0,1.34,0,'chest');
  part(new THREE.BoxGeometry(.12,.16,.15),darkJoint,0,1.83,0,'chest');
  part(new THREE.SphereGeometry(.217,16,12),wooden,0,2.07,0,'head');
  for(const [side,sideName] of [[-1,'left'],[1,'right']]){
    part(new THREE.BoxGeometry(.19,.73,.22),wooden,side*.49,1.39,0,sideName+'Arm');
    part(new THREE.CylinderGeometry(.12,.14,1.01,10),wooden,side*.20,.52,0,sideName+'Leg');
  }
  const base=box(entry.x,.07,entry.z,1.55,.14,1.25,dark);
  base.userData.impactMaterial='metal';
  bounds.push({minX:entry.x-.39,maxX:entry.x+.39,minZ:entry.z-.39,maxZ:entry.z+.39});
  dummy.labelVisual=makeDummyLabel(dummy);
  dummies.set(dummy.id,dummy);
  rebuildDummyArmor(dummy);
  updateDummyLabel(dummy);
  return dummy;
}
function rebuildDummyArmor(dummy){
  for(const mesh of dummy.armorMeshes){
    mesh.parent?.remove(mesh);
    const partIndex=dummy.pieces.indexOf(mesh);
    if(partIndex!==-1)dummy.pieces.splice(partIndex,1);
    const hitIndex=dummyHitMeshes.indexOf(mesh);
    if(hitIndex!==-1)dummyHitMeshes.splice(hitIndex,1);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  dummy.armorMeshes.length=0;
  for(const slot of ARMOR_SLOTS){
    const item=getArmorPiece(slot,dummy.state.loadout[slot]);
    if(item.points===0)continue;
    const p=item.points/110;
    const metallic=['plate','shell','mesh'].includes(item.style);
    const base=new THREE.MeshStandardMaterial({color:item.color,
      metalness:metallic?.73:.18,roughness:metallic?.53:.87});
    const dark=new THREE.MeshStandardMaterial({color:0x232e34,
      metalness:.35,roughness:.76});
    const side=slot.startsWith('left')?-1:1;
    if(slot==='chest'){
      dummy.part(new THREE.BoxGeometry(.70+p*.12,.69+p*.13,.35+p*.13),
        base,0,1.37,.07,'chest',true);
      // Higher-tier chest pieces have an extra central reinforcement plate.
      if(p>.3)dummy.part(new THREE.BoxGeometry(.23,.49,.06),
        dark,0,1.40,.30+p*.065,'chest',true);
      if(p>.55)for(const s of [-1,1])dummy.part(new THREE.BoxGeometry(.18,.21,.10),
        base,s*.22,1.64,.23,'chest',true);
    }else if(slot==='head'){
      dummy.part(new THREE.SphereGeometry(.225+p*.06,14,10,0,Math.PI*2,
        0,Math.PI*.67),base,0,2.10,0,'head',true);
      if(p>.28)dummy.part(new THREE.BoxGeometry(.35,.11,.15),
        dark,0,2.10,.21+p*.02,'head',true);
      if(p>.6)dummy.part(new THREE.BoxGeometry(.28,.07,.12),
        base,0,2.27,.07,'head',true);
    }else if(slot.endsWith('Arm')){
      dummy.part(new THREE.BoxGeometry(.22+p*.13,.57+p*.10,.27+p*.12),
        base,side*.49,1.39,.04,slot,true);
      if(p>.43)dummy.part(new THREE.BoxGeometry(.24+p*.10,.16,.30),
        dark,side*.49,1.69,.08,slot,true);
    }else{
      dummy.part(new THREE.CylinderGeometry(.135+p*.042,.145+p*.06,
        .81+p*.1,10),base,side*.20,.52,.02,slot,true);
      if(p>.36)dummy.part(new THREE.BoxGeometry(.25,.18,.26+p*.11),
        dark,side*.20,.83,.06,slot,true);
    }
  }
  updateDummyLabel(dummy);
}
dummyKinds.forEach(makeDummy);

// W08.1: a redesigned, oversized 3D powered chassis at Station 8, independent of
// normal player armor and of the static test-dummy equipment.
const powerArmorBay={x:-49,z:-12};
let powerArmorState=createPowerArmorState();
try{
  const raw=JSON.parse(localStorage.getItem('rpg-lab-powered-chassis')||'null');
  if(raw)powerArmorState=safePowerArmorSnapshot(raw);
}catch{}
const poweredSuit=buildPowerArmorVisual(scene,powerArmorBay,powerArmorState);
textSign('POWER SUIT · P TO ENTER',-55,-6,0x8fbba4);
const poweredCockpit=buildPowerArmorCockpit(camera);
poweredSuit.root.visible=!powerArmorState.occupied;
poweredCockpit.visible=powerArmorState.occupied;
let poweredArmorTime=0,powerUIOpen=false,powerUIFromField=false;
let powerCinematic=null;
const powerCameraUp=new THREE.Vector3(0,1,0);
function powerEase(a,b,value){
  const v=Math.min(1,Math.max(0,(value-a)/(b-a)));
  return v*v*(3-2*v);
}
// See the human-scale pilot climb inside from a cinematic third-person camera.
// Restore the normal first-person camera only after the hatch latches.
function updatePowerCinematic(progress){
  if(!powerCinematic)return;
  const p=Math.min(1,Math.max(0,progress));
  const framing=powerEase(0,.17,p)*(1-powerEase(.81,1,p));
  const heroPosition=poweredSuit.root.localToWorld(new THREE.Vector3(3.15,2.63,4.85));
  const focalPoint=poweredSuit.root.localToWorld(new THREE.Vector3(0,1.74,.54));
  const route=powerCinematic.from.clone().lerp(powerCinematic.to,p);
  camera.position.copy(route).lerp(heroPosition,framing);
  const look=new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(heroPosition,focalPoint,powerCameraUp));
  camera.quaternion.copy(powerCinematic.fromRotation)
    .slerp(powerCinematic.toRotation,p)
    .slerp(look,framing);
}
function savePowerArmor(){
  try{localStorage.setItem('rpg-lab-powered-chassis',JSON.stringify(powerArmorState));}catch{}
}
function nearPoweredSuit(){
  return Math.hypot(player.x-poweredSuit.root.position.x,
    player.z-poweredSuit.root.position.z)<3.8;
}
function refreshPowerArmorHUD(){
  const status=$('powerArmorStatus');
  status.textContent=powerArmorState.phase==='entering'?'ENTERING CHASSIS…':
    powerArmorState.phase==='exiting'?'EXITING CHASSIS…':
    powerArmorState.occupied?'POWER ARMOR ACTIVE':'FRAME PARKED · P TO ENTER';
  const fitted=POWER_ARMOR_SLOTS.filter(s=>powerArmorState.plates[s]!=='none').length;
  $('powerArmorDetail').textContent=fitted+' / 6 POWER PLATES · '+
    (powerArmorState.occupied?'FRAME PROTECTION ONLINE':'FRAME AT STATION 8');
}
function refreshPowerArmorUI(){
  for(const slot of POWER_ARMOR_SLOTS){
    $('power-'+slot).value=powerArmorState.plates[slot];
    const p=POWER_ARMOR_PLATES[powerArmorState.plates[slot]];
    $('power-rating-'+slot).textContent=p.points+' PLATE AP · '+p.name.toUpperCase();
  }
  $('powerArmorControl').textContent=powerArmorState.occupied?
    'EXIT THE FRAME · P':'ENTER THE FRAME NEAR STATION 8 · P';
  refreshPowerArmorHUD();
}
function openPowerArmorBay(){
  powerUIFromField=controls.isLocked;
  if(powerUIFromField)controls.unlock();
  powerUIOpen=true;
  $('powerArmorPanel').classList.remove('hidden');
  $('menu').classList.add('hidden');
  refreshPowerArmorUI();
}
function closePowerArmorBay(){
  powerUIOpen=false;$('powerArmorPanel').classList.add('hidden');
  if(powerUIFromField){powerUIFromField=false;controls.lock();}
  else $('menu').classList.remove('hidden');
}
function togglePoweredSuit(){
  if(powerArmorState.phase!=='idle')return;
  if(!powerArmorState.occupied&&!nearPoweredSuit()){
    showShotNotice('GET CLOSER TO THE POWER ARMOR FRAME AT STATION 8');return;
  }
  const exiting=powerArmorState.occupied;
  if(exiting){
    // The shell is worn at the player location and then parks there.
    poweredSuit.root.position.set(player.x,0,player.z);
    poweredSuit.root.rotation.y=camera.rotation.y+Math.PI;
    poweredSuit.root.visible=true;
  }
  const result=beginPowerArmorTransition(powerArmorState);
  if(!result.ok)return;
  const offset=exiting?2.32:0;
  const target=poweredSuit.root.localToWorld(new THREE.Vector3(0,0,offset));
  const destY=groundHeight(target.x,target.z)+player.eyeHeight;
  const endPosition=new THREE.Vector3(target.x,destY,target.z);
  const endingRotation=exiting?new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(endPosition,
      poweredSuit.root.localToWorld(new THREE.Vector3(0,1.7,.1)),powerCameraUp)):
    camera.quaternion.clone();
  powerCinematic={from:camera.position.clone(),fromRotation:camera.quaternion.clone(),
    to:endPosition,toRotation:endingRotation};
  keys.clear();triggerHeld=false;changeAim(false);
  weaponVisuals.get(activeWeaponId).root.visible=false;
  sound.reload('rifle',1.65);
  showShotNotice(result.phase==='entering'?'HYDRAULICS OPEN · ENTERING CHASSIS':
    'RELEASING LOCKS · EXITING CHASSIS');
  refreshPowerArmorHUD();
}
for(const slot of POWER_ARMOR_SLOTS){
  const picker=$('power-'+slot);
  for(const p of Object.values(POWER_ARMOR_PLATES)){
    const option=document.createElement('option');
    option.value=p.id;option.textContent=p.name+' · '+p.points+' AP';
    picker.append(option);
  }
  picker.addEventListener('change',()=>{
    const update=setPowerPlate(powerArmorState,slot,picker.value);
    if(!update.ok)return;
    poweredSuit.updatePlates(powerArmorState);
    savePowerArmor();refreshPowerArmorUI();
    showShotNotice('POWER '+slot.toUpperCase()+' · '+POWER_ARMOR_PLATES[picker.value].name.toUpperCase());
  });
}
$('powerBayOpen').addEventListener('click',openPowerArmorBay);
$('powerBayClose').addEventListener('click',closePowerArmorBay);
$('powerArmorControl').addEventListener('click',()=>{
  closePowerArmorBay();
  if(!powerArmorState.occupied&&!nearPoweredSuit())
    resetPlayer(7); // place the tester near the power-armor bay
  if(!controls.isLocked)controls.lock();
  togglePoweredSuit();
});
refreshPowerArmorHUD();
function resetAllDummies(){
  for(const dummy of dummies.values()){
    resetDummy(dummy.state);dummy.impulse=0;dummy.flash=0;dummy.group.rotation.z=0;
    for(const mesh of dummy.pieces)mesh.material.emissive.setHex(0);
    updateDummyLabel(dummy);
  }
  clearBulletHoles();
  $('damageReport').textContent='ALL DUMMIES RESET · ARMOR LOADOUTS PRESERVED';
  showShotNotice('DUMMIES RESET · EQUIPMENT UNCHANGED');
}
function spawnDamagePopup(point,result){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.font='bold 55px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='#081011';ctx.shadowBlur=10;
  ctx.lineWidth=7;ctx.strokeStyle='#09151c';
  const text=(result.critical?'★ ':'')+'-'+Math.ceil(result.damage);
  ctx.strokeText(text,128,60);
  ctx.fillStyle=result.critical?'#f6cf7b':result.blocked>0?'#a5d7f3':'#e8f3eb';
  ctx.fillText(text,128,60);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false});
  const sprite=new THREE.Sprite(material);
  sprite.position.copy(point).add(new THREE.Vector3(0,.45,0));
  sprite.scale.set(1.0,.5,1);
  scene.add(sprite);
  damagePopups.push({sprite,texture,material,age:0});
  if(damagePopups.length>popupsMax)removeDamagePopup(damagePopups.shift());
}
function removeDamagePopup(popup){
  scene.remove(popup.sprite);popup.material.dispose();popup.texture.dispose();
}
function updateCombatVisuals(dt){
  for(const dummy of dummies.values()){
    const target=dummy.state.alive?0:-1.22;
    const shake=dummy.state.alive?Math.sin(dummy.flash*29)*dummy.impulse*.08:0;
    dummy.group.rotation.z+=(target+shake-dummy.group.rotation.z)*(1-Math.exp(-9*dt));
    dummy.impulse=Math.max(0,dummy.impulse-dt*3);
    dummy.flash=Math.max(0,dummy.flash-dt);
    if(dummy.flash===0){
      for(const mesh of dummy.pieces)mesh.material.emissive.setHex(0);
    }
  }
  for(let i=damagePopups.length-1;i>=0;i--){
    const p=damagePopups[i];p.age+=dt;
    p.sprite.position.y+=dt*.6;
    p.material.opacity=Math.max(0,1-p.age/.9);
    if(p.age>=.9){damagePopups.splice(i,1);removeDamagePopup(p);}
  }
}

// W03.1 armory UI: change all six independent parts on any dummy.
// Open from the pause menu or press B in the lab. No drag-and-drop needed.
let armoryFromField=false;
function selectedDummy(){return dummies.get($('armoryDummy').value);}
function refreshArmory(){
  const dummy=selectedDummy();
  if(!dummy)return;
  let total=0;
  for(const slot of ARMOR_SLOTS){
    const item=getArmorPiece(slot,dummy.state.loadout[slot]);
    $('armor-'+slot).value=item.id;
    $('rating-'+slot).textContent=item.points+' AP · '+
      Math.round(damageReductionForPoints(item.points)*100)+'% blocked';
    total+=item.points;
  }
  $('armoryTotal').textContent=total+' AP equipped · no armor durability / no breakage';
  $('armoryHP').textContent=Math.ceil(dummy.state.health)+' / '+dummy.state.maxHealth+' HP';
}
function openArmory(){
  armoryFromField=controls.isLocked;
  if(controls.isLocked)controls.unlock();
  $('armory').classList.remove('hidden');
  refreshArmory();
}
function closeArmory(){
  $('armory').classList.add('hidden');
  if(armoryFromField){
    armoryFromField=false;controls.lock();
  }
}
for(const dummy of dummyKinds){
  const opt=document.createElement('option');opt.value=dummy.id;
  opt.textContent=dummy.label;$('armoryDummy').append(opt);
}
$('armoryDummy').addEventListener('change',refreshArmory);
function saveArmorLoadouts(){
  try{
    localStorage.setItem('rpg-lab-armor-loadouts',
      JSON.stringify(Object.fromEntries([...dummies].map(([id,d])=>[id,d.state.loadout]))));
  }catch{}
}
try{
  const saved=JSON.parse(localStorage.getItem('rpg-lab-armor-loadouts')||'{}');
  for(const [id,dummy] of dummies){
    if(saved[id]){
      dummy.state.loadout=createLoadout(saved[id]);
      rebuildDummyArmor(dummy);
    }
  }
}catch{ /* Ignore malformed or blocked storage. */ }
for(const slot of ARMOR_SLOTS){
  const control=$('armor-'+slot);
  for(const item of ARMOR_ITEMS[slot]){
    const opt=document.createElement('option');opt.value=item.id;
    opt.textContent=item.name+' — '+item.points+' AP';
    control.append(opt);
  }
  control.addEventListener('change',()=>{
    const dummy=selectedDummy();
    equipArmor(dummy.state,slot,control.value);
    clearBulletHoles();
    rebuildDummyArmor(dummy);
    saveArmorLoadouts();
    refreshArmory();
    $('damageReport').textContent=dummy.title+' · '+ARMOR_SLOT_LABELS[slot].toUpperCase()+
      ' · '+getArmorPiece(slot,control.value).points+' AP · PERMANENT';
  });
}
$('armoryOpen').addEventListener('click',openArmory);
$('armoryClose').addEventListener('click',closeArmory);
$('armoryReset').addEventListener('click',()=>{
  const dummy=selectedDummy();
  const preset=$('armoryPreset').value;
  dummy.state.loadout=createLoadout(preset);
  clearBulletHoles();
  rebuildDummyArmor(dummy);
  saveArmorLoadouts();
  refreshArmory();
});


// W04.0: an isolated, deliberately modest test arena in the northeast.
// Patrol/spot/chase/search is separate from cover/fire/AI-player-damage passes.
const aiObstacles=[];
function aiCrate(x,z,w,d,h,material){
  const mesh=box(x,h/2,z,w,h,d,material);
  mesh.userData.impactMaterial='metal';
  const collider={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,height:h};
  aiObstacles.push(collider);bounds.push(collider);
  return mesh;
}
const rustySteel=mat(0x62686b,.74);
aiCrate(39.5,38.0,2.6,2.3,1.45,rustySteel);
aiCrate(49.0,44.2,2.8,1.8,1.85,dark);
aiCrate(53.0,37.0,2.3,2.2,1.6,rustySteel);
for(let x=34;x<=57;x+=4.6)box(x,.08,33.6,.14,.16,.8,orange);
const enemies=new Map(),enemyHitMeshes=[];
const lootBags=new Map();
let lootSerial=0,selectedLootId=null,lootOverlayFromField=false;
let inventoryOpen=false,lootOpen=false,workbenchOpen=false,workbenchFromField=false;
let backpack=createBackpack();
try{
  const saved=JSON.parse(localStorage.getItem('rpg-lab-player-inventory')||'null');
  if(saved)backpack=safeBackpackSnapshot(saved);
}catch{ /* Storage may be unavailable or corrupted. */ }
let enemyAIEnabled=true;
const squadIntel=createSquadIntel();
const enemySpecs=[
  {id:'scout',label:'SCOUT',x:39,z:42,
    color:0x8d7761,patrol:[{x:39,z:42},{x:44,z:42}]},
  {id:'raider',label:'RAIDER',x:43,z:46,
    color:0x66775c,patrol:[{x:43,z:46},{x:47,z:46}]},
  {id:'enforcer',label:'ENFORCER',x:46,z:36.8,
    color:0x4d6075,patrol:[{x:46,z:36.8},{x:51,z:37}]}
];
// Unmissable station-9 locator: visible from the teleport spawn even if
// individual low-poly characters are hidden by a browser graphics issue.
const locatorCanvas=document.createElement('canvas');
locatorCanvas.width=768;locatorCanvas.height=160;
const locatorCtx=locatorCanvas.getContext('2d');
const locatorTex=new THREE.CanvasTexture(locatorCanvas);
locatorTex.colorSpace=THREE.SRGBColorSpace;
const locator=new THREE.Sprite(new THREE.SpriteMaterial({
  map:locatorTex,transparent:true,depthTest:true,depthWrite:false}));
locator.position.set(39,4.2,42);
locator.scale.set(6.1,1.28,1);
scene.add(locator);
function updateArenaSign(){
  const alive=[...enemies.values()].filter(e=>e.state.alive).length;
  locatorCtx.clearRect(0,0,locatorCanvas.width,locatorCanvas.height);
  locatorCtx.fillStyle='rgba(22,31,37,.92)';
  locatorCtx.fillRect(0,0,768,160);
  locatorCtx.strokeStyle='#ffa65f';locatorCtx.lineWidth=9;
  locatorCtx.strokeRect(4,4,760,152);
  locatorCtx.font='bold 58px system-ui';locatorCtx.fillStyle='#ffdb93';
  locatorCtx.fillText('RAIDERS ALIVE · '+alive+' / '+enemies.size,27,99);
  locatorTex.needsUpdate=true;
}
// The old permanent orange spawn pads stayed behind after a kill.
// Each living enemy now owns its own ground marker, which disappears on death.
function enemyMaterial(color,metallic=false){
  return new THREE.MeshStandardMaterial({color,
    roughness:metallic?.45:.88,metalness:metallic?.67:.05});
}
function createEnemy(spec){
  const brain=createEnemyBrain({x:spec.x,z:spec.z,
    yaw:-Math.PI/2,patrol:spec.patrol});
  const root=new THREE.Group();root.position.set(spec.x,0,spec.z);
  scene.add(root);
  // Crouching lowers the ACTUAL head/torso/arm hitboxes. It is not
  // just a cosmetic mesh squash; the player's raycaster uses these meshes.
  const upperBody=new THREE.Group();root.add(upperBody);
  const state=createDummy(enemyArmorForRound(spec.id,0));
  const enemy={id:spec.id,label:spec.label,brain,root,state,
    meshes:[],limbs:[],armorMeshes:new Map(),flash:0,shake:0,walkPhase:0,statusText:'',
    tactics:makeEnemyTactics(spec.id),gunGlow:0,
    deathTimer:0,upperBody,crouchBlend:0,combatPose:0,reloadPose:0,
    recoilPose:0};
  const flesh=enemyMaterial(spec.color);
  const darkCloth=enemyMaterial(0x29353b);
  function part(parent,geometry,material,x,y,z,slot,armored=false){
    const mesh=new THREE.Mesh(geometry,material.clone());
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData={enemyId:spec.id,hitZone:slot,
      impactMaterial:armored?'metal':'wood'};
    parent.add(mesh);enemy.meshes.push(mesh);enemyHitMeshes.push(mesh);
    return mesh;
  }
  part(upperBody,new THREE.BoxGeometry(.57,.72,.35),flesh,0,1.34,0,'chest');
  part(upperBody,new THREE.SphereGeometry(.225,14,10),flesh,0,2.03,0,'head');
  // Fill the former gap between chest and skull with a physical neck.
  // Treat this as chest damage so helmets keep their existing balance.
  part(upperBody,new THREE.CylinderGeometry(.13,.15,.28,10),
    flesh,0,1.76,0,'chest');
  // Build all six armor meshes once, then show/hide and recolor them
  // from the same actual loadout used by damage and loot rules.
  enemy.armorMeshes.set('chest',part(upperBody,new THREE.BoxGeometry(.65,.63,.43),
    enemyMaterial(0x647363,true),0,1.37,.055,'chest',true));
  enemy.armorMeshes.set('head',part(upperBody,
    new THREE.SphereGeometry(.241,14,10,0,Math.PI*2,0,Math.PI*.68),
    enemyMaterial(0x647363,true),0,2.075,0,'head',true));
  for(const side of [-1,1]){
    const name=side<0?'left':'right';
    const armPivot=new THREE.Group();
    armPivot.position.set(side*.43,1.65,0);upperBody.add(armPivot);
    enemy.limbs.push({pivot:armPivot,side,kind:'arm'});
    part(armPivot,new THREE.BoxGeometry(.20,.68,.23),
      flesh,0,-.35,0,name+'Arm');
    enemy.armorMeshes.set(name+'Arm',part(armPivot,new THREE.BoxGeometry(.25,.54,.30),
      enemyMaterial(0x647363,true),0,-.32,.02,name+'Arm',true));
    const legPivot=new THREE.Group();
    legPivot.position.set(side*.19,.97,0);root.add(legPivot);
    enemy.limbs.push({pivot:legPivot,side,kind:'leg'});
    part(legPivot,new THREE.CylinderGeometry(.135,.15,.9,10),
      darkCloth,0,-.46,0,name+'Leg');
    enemy.armorMeshes.set(name+'Leg',part(legPivot,new THREE.CylinderGeometry(.16,.17,.75,10),
      enemyMaterial(0x647363,true),0,-.45,.025,name+'Leg',true));
  }
  // Original game-world scrap-rifle silhouette (visual prop only in W04.0).
  const rifle=new THREE.Group();rifle.position.set(.19,1.38,.33);
  upperBody.add(rifle);
  const stock=new THREE.Mesh(new THREE.BoxGeometry(.10,.15,.48),rustySteel);
  rifle.add(stock);
  const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.56,8),darkCloth);
  muzzle.rotation.x=Math.PI/2;muzzle.position.z=.32;rifle.add(muzzle);
  const muzzleLight=new THREE.PointLight(0xffa65f,0,2.2);
  muzzleLight.position.set(.19,1.38,.68);
  upperBody.add(muzzleLight);enemy.muzzleLight=muzzleLight;
  // High-contrast visible identification beacons, even when the character
  // model is small or fogged against the scenery.
  const beacon=new THREE.Mesh(new THREE.TorusGeometry(.55,.065,6,22),
    new THREE.MeshBasicMaterial({color:0xf19668,depthTest:true,depthWrite:true}));
  beacon.rotation.x=-Math.PI/2;
  beacon.position.y=.085;root.add(beacon);enemy.beacon=beacon;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=132;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const labelMesh=new THREE.Sprite(new THREE.SpriteMaterial({
    map:texture,transparent:true,depthTest:true,depthWrite:false}));
  labelMesh.scale.set(2.7,.72,1);
  labelMesh.position.set(spec.x,2.84,spec.z);
  scene.add(labelMesh);
  enemy.billboard={canvas,ctx,texture,mesh:labelMesh};
  enemies.set(spec.id,enemy);
  refreshEnemyArmorVisuals(enemy);
  refreshEnemyLabel(enemy,'PATROL');
  return enemy;
}
function refreshEnemyArmorVisuals(enemy){
  for(const slot of ARMOR_SLOTS){
    const mesh=enemy.armorMeshes.get(slot);
    const piece=getArmorPiece(slot,enemy.state.loadout[slot]);
    mesh.visible=piece.points>0;
    if(piece.points)mesh.material.color.setHex(piece.color);
  }
}
function refreshEnemyLabel(enemy,mode){
  const t=enemy.tactics;
  const magazine=t.magazine+'/'+ENEMY_PROFILES[t.kind].magazine;
  const loading=t.reloadRemaining>0?'RELOADING '+t.reloadRemaining.toFixed(1)+'s':
    magazine+' AMMO';
  const current=enemy.label+'-'+mode+'-'+Math.ceil(enemy.state.health)+'-'+loading;
  if(current===enemy.statusText)return;
  enemy.statusText=current;
  const {ctx,canvas,texture}=enemy.billboard;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(10,20,28,.92)';ctx.fillRect(3,3,506,126);
  ctx.strokeStyle=enemy.state.alive?'#d7a77d':'#df685d';
  ctx.lineWidth=4;ctx.strokeRect(3,3,506,126);
  ctx.fillStyle='#f3dec0';ctx.textAlign='left';
  ctx.font='bold 26px system-ui';ctx.fillText(enemy.label,18,37);
  ctx.fillStyle=mode==='CHASE'?'#f89176':mode==='INVESTIGATE'?'#f3c47c':'#abcbd2';
  ctx.fillText(mode,265,37);
  ctx.fillStyle='#f4e2cf';ctx.font='bold 21px system-ui';
  ctx.fillText(Math.ceil(enemy.state.health)+' HP · '+loading,18,76);
  ctx.fillStyle='#263c47';ctx.fillRect(18,93,480,14);
  ctx.fillStyle='#a6c58e';ctx.fillRect(18,93,480*enemy.state.health/100,14);
  texture.needsUpdate=true;
}
let arenaRound=-1;
enemySpecs.forEach(createEnemy);
updateArenaSign();
$('engineStatus').textContent='ENGINE READY · '+enemies.size+' RAIDERS LOADED';
$('engineStatus').style.color='#abddb2';
function resetEnemies(){
  arenaRound++;
  clearBulletHoles();clearSquadIntel(squadIntel);
  // Each J round produces fresh, singular loot drops. Inventory persists.
  for(const drop of lootBags.values()){
    scene.remove(drop.mesh);
    disposeLootMarker(drop.mesh);
  }
  lootBags.clear();selectedLootId=null;
  if(lootOpen)closeLootOverlay();
  for(const enemy of enemies.values()){
    enemy.state.loadout=enemyArmorForRound(enemy.id,arenaRound);
    resetDummy(enemy.state);resetEnemyBrain(enemy.brain);
    refreshEnemyArmorVisuals(enemy);
    enemy.root.position.set(enemy.brain.x,0,enemy.brain.z);
    enemy.root.rotation.set(0,enemy.brain.yaw,0);
    enemy.root.visible=true;enemy.billboard.mesh.visible=true;
    enemy.beacon.visible=true;
    enemy.deathTimer=0;enemy.crouchBlend=0;enemy.upperBody.position.y=0;
    enemy.upperBody.rotation.set(0,0,0);
    enemy.combatPose=0;enemy.reloadPose=0;enemy.recoilPose=0;
    for(const {pivot,kind,side} of enemy.limbs){
      if(kind==='leg'){pivot.position.y=.97;pivot.scale.y=1;}
      pivot.rotation.x=0;
    }
    enemy.flash=0;enemy.shake=0;enemy.statusText='';
    resetEnemyTactics(enemy.tactics);
    enemy.gunGlow=0;enemy.muzzleLight.intensity=0;
    for(const mesh of enemy.meshes)mesh.material.emissive.setHex(0);
    refreshEnemyLabel(enemy,'PATROL');
  }
  updateArenaSign();
  $('damageReport').textContent='AI BOTS RESET · NEW MIXED ARMOR LOADOUTS';
  showShotNotice('ENEMIES RESET · PATROL RESTARTED');
}
// World loot is independent of the enemy corpse. A downed bot fades after
// 0.7s, but its searchable bag remains until looted or J resets the arena.
function disposeLootMarker(root){
  root.traverse(obj=>{
    if(obj.isMesh){obj.geometry.dispose();obj.material.dispose();}
    if(obj.isSprite){obj.material.map?.dispose();obj.material.dispose();}
  });
}
function makeLootMarker(bag){
  const group=new THREE.Group();
  group.position.set(bag.x,0,bag.z);
  const rarest=bag.items.reduce((a,b)=>
    (['common','uncommon','rare','epic'].indexOf(getItem(b.itemId).rarity)>
     ['common','uncommon','rare','epic'].indexOf(a)?getItem(b.itemId).rarity:a),'common');
  const tint={common:0xaba991,uncommon:0x71c68d,rare:0x80b4ee,epic:0xc498f3}[rarest];
  const base=new THREE.Mesh(new THREE.BoxGeometry(.65,.38,.47),
    new THREE.MeshStandardMaterial({color:0x3f4c44,roughness:.88,
      emissive:tint,emissiveIntensity:.12}));
  base.position.y=.3;group.add(base);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(.67,.075,.48),
    new THREE.MeshBasicMaterial({color:tint}));
  strip.position.y=.44;group.add(strip);
  const sign=document.createElement('canvas');sign.width=256;sign.height=64;
  const ctx=sign.getContext('2d');
  ctx.fillStyle='rgba(7,18,27,.93)';ctx.fillRect(0,0,256,64);
  ctx.font='bold 24px system-ui';ctx.fillStyle='#f4e7cb';
  ctx.textAlign='center';ctx.fillText('LOOT · E TO SEARCH',128,40);
  const texture=new THREE.CanvasTexture(sign);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
    map:texture,depthTest:true,transparent:true}));
  sprite.position.y=1.18;sprite.scale.set(2.45,.61,1);group.add(sprite);
  scene.add(group);
  return group;
}
function spawnWorldLoot(contents,x,z,source='world'){
  const bag=createLootBag('bag-'+(++lootSerial),x,z,contents,source);
  if(!bag.items.length)return null;
  const marker=makeLootMarker(bag);
  lootBags.set(bag.id,{...bag,mesh:marker});
  return bag.id;
}
function spawnEnemyLoot(enemy){
  return spawnWorldLoot(generateEnemyLoot(enemy.id,arenaRound,enemy.state.loadout),enemy.brain.x,
    enemy.brain.z,'enemy-'+enemy.id);
}
function markEnemyDefeated(enemy){
  enemy.brain.active=false;
  enemy.deathTimer=0;
  enemy.flash=0;enemy.shake=0;
  for(const mesh of enemy.meshes)mesh.material.emissive.setHex(0);
  enemy.beacon.visible=false;
  enemy.billboard.mesh.visible=false;
  enemy.muzzleLight.intensity=0;
  enemy.gunGlow=0;
  spawnEnemyLoot(enemy);
  updateArenaSign();
}
function discardEmptyLootBags(){
  for(const [id,bag] of lootBags){
    if(bag.items.length)continue;
    scene.remove(bag.mesh);disposeLootMarker(bag.mesh);
    lootBags.delete(id);
    if(selectedLootId===id)selectedLootId=null;
  }
}
function nearestLootBag(){
  let best=null,meters=2.7;
  for(const bag of lootBags.values()){
    const d=Math.hypot(player.x-bag.x,player.z-bag.z);
    if(d<meters){meters=d;best=bag;}
  }
  return best;
}
function saveBackpack(){
  try{localStorage.setItem('rpg-lab-player-inventory',JSON.stringify(backpack));}catch{}
}
function inventoryLine(item){
  const row=document.createElement('div');
  row.className='loot-entry';
  row.style.borderLeftColor=RARITIES[item.rarity].color;
  const summary=document.createElement('div');summary.className='loot-description';
  const name=document.createElement('strong');name.textContent=item.name;
  name.style.color=RARITIES[item.rarity].color;
  const detail=document.createElement('small');
  detail.textContent=RARITIES[item.rarity].label+' · '+item.category.toUpperCase()+
    ' · '+item.value+' CAPS';
  summary.append(name,detail);row.append(summary);
  return row;
}
function lootButton(row,label,callback){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.className='loot-action';b.addEventListener('click',callback);row.append(b);
  return b;
}
function refreshInventoryUI(){
  $('inventoryCapacity').textContent=backpack.items.length+' / '+BACKPACK_LIMIT+' SLOTS';
  $('inventoryValue').textContent=totalInventoryValue(backpack)+' CAPS VALUE';
  $('inventoryWeapon').textContent=getWeaponSpec(backpack.equipment.weapon).name;
  const ordinary=playerArmorReduction(backpack,'chest');
  const powered=powerArmorProtection(powerArmorState,'chest',ordinary.reduction);
  $('inventoryArmor').textContent='CHEST '+ordinary.points+' AP · '+
    Math.round(powered.combinedReduction*100)+'% DAMAGE BLOCK'+
    (powerArmorState.occupied?' · POWER ARMOR ACTIVE':'');
  const area=$('inventoryItems');area.replaceChildren();
  if(!backpack.items.length){
    const empty=document.createElement('p');
    empty.textContent='BACKPACK EMPTY · DEFEAT A RAIDER AND SEARCH ITS LOOT (E).';
    area.append(empty);
  }
  const copyNumbers=new Map();
  for(const entry of backpack.items){
    const item=getItem(entry.itemId),row=inventoryLine(item);
    const count=document.createElement('span');
    const duplicateCount=(item.category==='weapon'||item.category==='armor')?
      countItem(backpack,item.id):0;
    const copy=(copyNumbers.get(item.id)||0)+1;
    copyNumbers.set(item.id,copy);
    count.textContent=duplicateCount>1?'COPY '+copy+' / '+duplicateCount:
      '×'+entry.quantity;
    count.className='loot-quantity';row.append(count);
    if(item.category==='armor'||item.category==='weapon'){
      lootButton(row,'EQUIP',()=>{
        const r=equipFromInventory(backpack,entry.uid);
        if(!r.ok)return;
        if(r.category==='weapon')selectWeapon(r.key);
        saveBackpack();refreshInventoryUI();
      });
    }
    if(item.category==='ammo'||item.id==='supply:medkit'){
      lootButton(row,item.category==='ammo'?'LOAD RESERVE':'USE',()=>{
        if(item.category==='ammo'){
          const amount=entry.quantity;
          removeItem(backpack,entry.uid,amount);
          arsenalStates[item.key].reserve+=amount;
          showShotNotice('+'+amount+' '+getWeaponSpec(item.key).name.toUpperCase()+' AMMO');
        }else{
          const used=useSupply(backpack,entry.uid,playerHealth);
          if(!used.ok){showShotNotice('MEDKIT · HEALTH MUST BE BELOW 100');return;}
          refreshPlayerHealth();showShotNotice('HEALED · +'+Math.ceil(used.restored)+' HP');
        }
        saveBackpack();refreshInventoryUI();refreshWeaponHUD();
      });
    }
    lootButton(row,'DROP',()=>{
      const dropped=removeItem(backpack,entry.uid,1);
      if(!dropped.removed)return;
      const item=getItem(dropped.itemId);
      if(item.category==='weapon'&&
        backpack.equipment.weapon===item.key&&
        !backpack.items.some(e=>e.itemId===item.id)){
        backpack.equipment.weapon='scrap-pistol';selectWeapon('scrap-pistol');
      }
      if(item.category==='armor'&&backpack.equipment.armor[item.slot]===item.key&&
         !backpack.items.some(e=>e.itemId===item.id))
        backpack.equipment.armor[item.slot]='none';
      spawnWorldLoot([{itemId:dropped.itemId,quantity:1}],
        player.x+Math.sin(camera.rotation.y)*.8,player.z-.8,'player-drop');
      saveBackpack();refreshInventoryUI();
    });
    area.append(row);
  }
}
function refreshLootUI(){
  const bag=lootBags.get(selectedLootId),area=$('lootItems');
  area.replaceChildren();
  $('lootTitle').textContent=bag?'SEARCH · '+bag.source.toUpperCase():'LOOT BAG EMPTY';
  if(!bag){const p=document.createElement('p');p.textContent='NO ITEMS REMAINING';area.append(p);return;}
  for(let i=0;i<bag.items.length;i++){
    const entry=bag.items[i],item=getItem(entry.itemId),row=inventoryLine(item);
    const count=document.createElement('span');count.textContent='×'+entry.quantity;
    count.className='loot-quantity';row.append(count);
    lootButton(row,'TAKE',()=>{
      const result=takeFromBag(backpack,bag,i);
      if(!result.added){
        $('lootFeedback').textContent='BACKPACK FULL · '+backpack.items.length+
          ' / '+BACKPACK_LIMIT+' SLOTS. DROP SOMETHING TO MAKE ROOM.';
        return;
      }
      const total=countItem(backpack,entry.itemId);
      $('lootFeedback').textContent='TAKEN · '+item.name.toUpperCase()+
        ' ×'+result.added+' · NOW OWN '+total+
        (total===1?' COPY':' COPIES');
      saveBackpack();discardEmptyLootBags();
      refreshLootUI();refreshInventoryUI();
    });
    area.append(row);
  }
}
function beginLootOverlay(id=null){
  const fromField=controls.isLocked;
  if(fromField)controls.unlock();
  lootOverlayFromField=fromField;
  if(id){
    selectedLootId=id;lootOpen=true;inventoryOpen=false;
    $('lootFeedback').textContent='DUPLICATE WEAPONS AND ARMOR ARE ALLOWED · 30 SLOTS MAX';
    $('inventoryPanel').classList.add('hidden');
    $('lootPanel').classList.remove('hidden');
    refreshLootUI();
  }else{
    lootOpen=false;inventoryOpen=true;
    $('lootPanel').classList.add('hidden');
    $('inventoryPanel').classList.remove('hidden');
    refreshInventoryUI();
  }
  $('menu').classList.add('hidden');
}
function closeLootOverlay(){
  lootOpen=false;inventoryOpen=false;selectedLootId=null;
  $('inventoryPanel').classList.add('hidden');
  $('lootPanel').classList.add('hidden');
  if(lootOverlayFromField){
    lootOverlayFromField=false;controls.lock();
  }else $('menu').classList.remove('hidden');
}
$('inventoryOpen').addEventListener('click',()=>beginLootOverlay());
$('inventoryClose').addEventListener('click',closeLootOverlay);
$('lootClose').addEventListener('click',closeLootOverlay);
$('lootTakeAll').addEventListener('click',()=>{
  const bag=lootBags.get(selectedLootId);if(!bag)return;
  const result=takeAllFromBag(backpack,bag);
  $('lootFeedback').textContent=result.remaining?
    'BACKPACK FULL · '+result.remaining+' ITEMS LEFT IN BAG · DROP ITEMS FOR SPACE':
    'TAKEN ALL · DUPLICATE GEAR KEPT AS SEPARATE INVENTORY COPIES';
  saveBackpack();discardEmptyLootBags();refreshLootUI();refreshInventoryUI();
});


function benchWithinReach(){return Math.hypot(player.x-opticBench.x,player.z-opticBench.z)<3.8;}
function refreshWorkbenchUI(){
  const weaponId=$('benchWeapon').value;
  const attached=installedWeaponOptic(backpack,weaponId);
  $('benchMaterials').textContent='SALVAGED PARTS '+countItem(backpack,'supply:salvage')+
    ' · OPTIC GLASS '+countItem(backpack,'supply:optic-glass');
  const area=$('benchOptics');area.replaceChildren();
  for(const id of compatibleOptics(weaponId)){
    const mod=OPTIC_MODS[id],row=document.createElement('div');
    row.className='loot-entry';
    const detail=document.createElement('div');detail.className='loot-description';
    const title=document.createElement('strong');title.textContent=mod.name;
    const owned=id==='factory'||backpack.unlockedOptics?.[weaponId]?.includes(id);
    const requirements=document.createElement('small');
    requirements.textContent=owned?'OWNED · NO MATERIAL COST':
      'CRAFT · '+mod.cost.salvage+' SALVAGED PARTS + '+mod.cost.glass+' OPTIC GLASS';
    detail.append(title,requirements);row.append(detail);
    if(id===attached){
      const equipped=document.createElement('strong');equipped.textContent='INSTALLED';
      equipped.style.color='#a8e9bd';row.append(equipped);
    }else{
      lootButton(row,owned?'INSTALL':'CRAFT + INSTALL',()=>{
        const outcome=installWeaponOptic(backpack,weaponId,id);
        if(!outcome.ok){
          showShotNotice(outcome.reason==='materials'?'NOT ENOUGH WORKBENCH MATERIALS':
            'SIGHT INCOMPATIBLE');return;
        }
        // Rebuild only this weapon's 3D optic; everything else stays mounted.
        if(weaponId!=='scrap-pistol'){
          const old=weaponVisuals.get(weaponId);
          camera.remove(old.root);
          const replacement=buildArsenalView(getWeaponSpec(weaponId));
          replacement.root.visible=weaponId===activeWeaponId;
          weaponVisuals.set(weaponId,replacement);
          if(weaponId===activeWeaponId&&aimHeld)alignActiveSight();
        }
        saveBackpack();refreshWorkbenchUI();refreshInventoryUI();refreshWeaponHUD();
        showShotNotice((outcome.crafted?'CRAFTED + INSTALLED · ':'INSTALLED · ')+
          mod.name.toUpperCase());
      });
    }
    area.append(row);
  }
}
function beginWorkbench(){
  if(inventoryOpen||lootOpen)closeLootOverlay();
  workbenchFromField=controls.isLocked;
  if(workbenchFromField)controls.unlock();
  workbenchOpen=true;
  $('benchWeapon').value=activeWeaponId;
  refreshWorkbenchUI();
  $('workbenchPanel').classList.remove('hidden');
  $('menu').classList.add('hidden');
}
function closeWorkbench(){
  workbenchOpen=false;$('workbenchPanel').classList.add('hidden');
  if(workbenchFromField){workbenchFromField=false;controls.lock();}
  else $('menu').classList.remove('hidden');
}
for(const spec of ARSENAL){
  const option=document.createElement('option');
  option.value=spec.id;option.textContent=spec.name;
  $('benchWeapon').append(option);
}
$('benchWeapon').addEventListener('change',refreshWorkbenchUI);
$('workbenchOpen').addEventListener('click',beginWorkbench);
$('benchClose').addEventListener('click',closeWorkbench);

// Combat is available in Station 9 AND when physically entering the
// arena on foot from another station. Keep Station 9 alive on roaming.
function inAIArena(){return isArenaActive(stationIndex,player);}
const playerHealth=createPlayerHealth();
let playerHitFlash=0;
const enemyTracers=[];
const tracerMat=new THREE.LineBasicMaterial({color:0xffa760,transparent:true,opacity:.92});
function enemyTracer(from,to){
  const geo=new THREE.BufferGeometry().setFromPoints([from,to]);
  const line=new THREE.Line(geo,tracerMat);scene.add(line);
  enemyTracers.push({line,time:.15});
  if(enemyTracers.length>12){
    const old=enemyTracers.shift();scene.remove(old.line);old.line.geometry.dispose();
  }
}
function refreshPlayerHealth(){
  const fraction=playerHealth.health/playerHealth.maxHealth;
  $('healthReadout').textContent=Math.ceil(playerHealth.health)+' / '+playerHealth.maxHealth+' HP';
  $('healthFill').style.width=(fraction*100).toFixed(1)+'%';
  $('healthFill').classList.toggle('low',fraction<=.35);
  $('healthStatus').textContent=!playerHealth.alive?'DOWN · H TO RESPAWN':
    fraction<=.35?'CRITICAL · H TO HEAL':'H TO HEAL / RESET';
}
function healPlayer(){
  resetPlayerHealth(playerHealth);playerHitFlash=0;
  refreshPlayerHealth();
  if(inAIArena())resetPlayer(8);
  showShotNotice('HEALTH RESTORED · 100 HP');
}
refreshPlayerHealth();
function updateEnemies(dt){
  // A confirmed hit outside the arena wakes combat while the enemy still
  // remembers the shooter. Otherwise other mechanics stations stay safe.
  const active=inAIArena()||[...enemies.values()].some(e=>
    e.state.alive&&e.brain.memory>0);
  const ticking=active&&controls.isLocked&&enemyAIEnabled;
  // Patrol, hit reactions and death cleanup update even at long range.
  // Actual attacks remain inside an active arena encounter.
  const simulating=controls.isLocked&&enemyAIEnabled;
  const statuses=[];
  let aliveCount=0;
  stepSquadIntel(squadIntel,dt,ticking&&playerHealth.alive);
  for(const enemy of enemies.values()){
    // Keep living NPCs rendered across the lab. On death show only a brief
    // collapse, then remove every body part; J restores the original actor.
    enemy.root.visible=enemy.state.alive||enemy.deathTimer<.7;
    enemy.billboard.mesh.visible=enemy.state.alive;
    enemy.beacon.visible=enemy.state.alive;
    if(active&&enemy.state.alive)aliveCount++;
    if(enemy.state.alive){
      const wasSpotted=enemy.brain.spotted;
      tickEnemyTactics(enemy.tactics,enemy.brain,player,dt,aiObstacles,
        {enabled:simulating&&playerHealth.alive,
          lowHealth:enemy.state.health<35,
          occupiedCover:occupiedSquadCover([...enemies.values()],enemy.id),
          separation:squadSeparation(enemy.brain,[...enemies.values()])});
      const tactic=enemy.tactics;
      stepEnemyBrain(enemy.brain,{x:player.x,z:player.z},dt,aiObstacles,
        {enabled:simulating&&playerHealth.alive,playerInArena:active,
          combatGoal:tactic.goal,
          combatHold:tactic.phase==='hold'||tactic.phase==='peek'||
            tactic.phase==='suppress-long',
          combatFacePlayer:true,
          combatSpeed:ENEMY_PROFILES[enemy.id].moveSpeed});
      if(ticking&&playerHealth.alive&&enemy.brain.spotted&&!wasSpotted)
        reportSquadContact(squadIntel,enemy.id,player);
      enemy.root.position.x=enemy.brain.x;enemy.root.position.z=enemy.brain.z;
      // Visibly duck behind low cover, with consistent LOWERED hitboxes.
      // ~0.82 m of crouch travel keeps the head under the 1.45 m crate.
      const wantedCrouch=enemy.tactics.crouching?1:0;
      enemy.crouchBlend+=(wantedCrouch-enemy.crouchBlend)*
        (1-Math.exp(-13*dt));
      enemy.upperBody.position.y=-.82*enemy.crouchBlend;
      // Animated ready pose, short lean while peeking, rifle dip while
      // reloading, and a quick shoulder kick after actual shots.
      const shouldAim=enemy.brain.mode==='chase'&&
        !enemy.tactics.crouching&&enemy.tactics.reloadRemaining===0;
      enemy.combatPose+=(Number(shouldAim)-enemy.combatPose)*
        (1-Math.exp(-7*dt));
      enemy.reloadPose+=(Number(enemy.tactics.reloadRemaining>0)-enemy.reloadPose)*
        (1-Math.exp(-10*dt));
      enemy.recoilPose=Math.max(0,enemy.recoilPose-dt*6);
      const peeking=enemy.tactics.phase==='peek'||enemy.tactics.phase==='peek-move';
      enemy.upperBody.rotation.z+=( (peeking?.11*enemy.tactics.strafeSign:0)-
        enemy.upperBody.rotation.z)*(1-Math.exp(-8*dt));
      enemy.upperBody.rotation.x=-.16*enemy.reloadPose+
        .08*enemy.recoilPose;
      enemy.walkPhase+=dt*(enemy.brain.moving?9:0);
      const move=enemy.brain.moving?1:0;
      for(const {pivot,side,kind} of enemy.limbs){
        pivot.rotation.x=Math.sin(enemy.walkPhase+side*Math.PI/2)*
          (kind==='leg'?.38:.23)*move+
          (kind==='arm'?(.20*enemy.combatPose-.38*enemy.reloadPose):0);
        if(kind==='leg'){
          pivot.position.y=.97-.30*enemy.crouchBlend;
          pivot.scale.y=1-.34*enemy.crouchBlend;
          pivot.rotation.z=side*.25*enemy.crouchBlend;
        }
      }
      enemy.root.rotation.y=enemy.brain.yaw;
      enemy.root.rotation.z=Math.sin(enemy.flash*30)*enemy.shake*.045;
      enemy.shake=Math.max(0,enemy.shake-dt*3);
      enemy.flash=Math.max(0,enemy.flash-dt);
      if(enemy.flash===0)for(const mesh of enemy.meshes)mesh.material.emissive.setHex(0);
      const attack=ENEMY_ATTACK[enemy.id];
      if(ticking&&playerHealth.alive){
        // A shot is only attempted when the NPC can see the player and has
        // a clear trajectory; mags, reloads and accuracy are authoritative.
        if(canEnemyFire(enemy.brain,player,aiObstacles,attack.range)&&
          !['cover','hold','peek-move','reload'].includes(enemy.tactics.phase)){
          const shot=attemptEnemyShot(enemy.tactics,
            Math.hypot(enemy.brain.x-player.x,enemy.brain.z-player.z),
            enemy.brain.moving,Math.random);
          if(shot.fired){
            enemy.gunGlow=.11;enemy.recoilPose=1;
            sound.gunshot();
            const origin=new THREE.Vector3(enemy.brain.x,1.43,enemy.brain.z);
            const target=new THREE.Vector3(player.x,1.52+player.jump,player.z);
            if(!shot.hit){
              // Miss tracers visibly pass beside the player rather than
              // striking the exact position yet dealing zero damage.
              const side=enemy.tactics.strafeSign;
              target.x+=side*(1.8+(1-shot.accuracy)*2.0);
              target.y+=.4;
              target.z+=side*.9;
            }
            enemyTracer(origin,target);
            if(shot.hit){
              const bodySlots=['chest','chest','chest','head','leftArm',
                'rightArm','leftLeg','rightLeg'];
              const zone=bodySlots[Math.floor(Math.random()*bodySlots.length)];
              const armor=playerArmorReduction(backpack,zone);
              const powered=powerArmorProtection(powerArmorState,zone,armor.reduction);
              const result=hitPlayer(playerHealth,
                attack.damage*(1-powered.combinedReduction));
              if(result.applied){
                if(!playerHealth.alive)keys.clear();
                refreshPlayerHealth();playerHitFlash=.48;
                showShotNotice(playerHealth.alive?
                  enemy.label+' HIT · -'+result.damage+' HP':
                  'YOU ARE DOWN · PRESS H TO RESPAWN');
              }
            }
          }
        }
      }
    }else{
      enemy.deathTimer+=dt;
      // One short fall, then despawn: no permanent corpse/ring clutter.
      enemy.root.rotation.z+=(-1.18-enemy.root.rotation.z)*(1-Math.exp(-10*dt));
      if(enemy.deathTimer>=.7)enemy.root.visible=false;
    }
    enemy.gunGlow=Math.max(0,enemy.gunGlow-dt);
    enemy.muzzleLight.intensity=enemy.gunGlow>0?5:0;
    const mode=!enemy.state.alive?'DOWN':
      !enemyAIEnabled?'PAUSED':!playerHealth.alive?'PLAYER DOWN':
        enemy.tactics.reloadRemaining>0?'RELOAD':
        enemy.tactics.crouching?'CROUCHED':
        enemy.tactics.phase==='peek'?'PEEK & FIRE':
        enemy.tactics.phase==='peek-move'?'PEEKING':
        enemy.tactics.phase==='cover'?'SEEK COVER':
        enemy.tactics.phase==='flank'?'FLANKING':
        enemy.tactics.phase==='suppress-long'?'LONG-RANGE SUPPRESSION':
        enemy.tactics.phase==='suppress'?'SUPPRESSING':
        enemy.tactics.phase==='strafe'?'STRAFE':
        enemy.brain.mode.toUpperCase();
    refreshEnemyLabel(enemy,mode);
    enemy.billboard.mesh.position.set(enemy.brain.x,
      2.86-.78*enemy.crouchBlend,enemy.brain.z);
    statuses.push(enemy.label+': '+mode+' ['+
      enemy.tactics.magazine+'/'+ENEMY_PROFILES[enemy.id].magazine+']');
  }
  if(ticking&&playerHealth.alive)
    shareSquadContact(squadIntel,[...enemies.values()],aiObstacles,player);
  for(let i=enemyTracers.length-1;i>=0;i--){
    const t=enemyTracers[i];t.time-=dt;
    if(t.time<=0){scene.remove(t.line);t.line.geometry.dispose();enemyTracers.splice(i,1);}
  }
  playerHitFlash=Math.max(0,playerHitFlash-dt);
  $('playerDamageFlash').style.opacity=(playerHitFlash*.52).toFixed(2);
  $('enemyHud').classList.toggle('hidden',!active);
  if(active){
    const surviving=[...enemies.values()].filter(e=>e.state.alive);
    const nearest=surviving.length?Math.min(...surviving.map(e=>
      Math.hypot(e.brain.x-player.x,e.brain.z-player.z))):null;
    $('enemyCount').textContent=aliveCount+' / '+enemies.size+' RAIDERS ALIVE'+
      (nearest===null?' · ALL ELIMINATED':' · NEAREST '+nearest.toFixed(1)+' m');
    $('enemyList').textContent=statuses.join('  ·  ');
    $('enemyMode').textContent=combatRuntimeStatus({
      active,locked:controls.isLocked,aiEnabled:enemyAIEnabled,
      playerAlive:playerHealth.alive,aliveCount
    });
  }
}

// Recognisable first-person makeshift pistol rather than a HUD-only crosshair.
// All meshes are viewmodel geometry; the shared weapons.mjs owns the rules.
const arsenalStates=createArsenalStates();
let activeWeaponId=SCRAP_PISTOL.id;
let activeSpec=SCRAP_PISTOL;
let weaponState=arsenalStates[activeWeaponId];
let triggerHeld=false,aimHeld=false;
// The dry-fire click is a trigger-edge event, NOT a frame-loop sound.
let emptyClickLatched=false;
let dryFireClicks=0;
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
// Narrow rear notch: the front blade is framed, not lost between wide posts.
for(const side of [-1,1])gunPart(new THREE.BoxGeometry(.018,.055,.035),
  sights,.043*side,.1795,.10,slideGroup);
const pistolFrontSight=gunPart(new THREE.BoxGeometry(.028,.060,.040),
  sights,0,.177,-.42,slideGroup);
pistolFrontSight.userData.sightReference=true;
// Layered slide, detailed grip and ejection port, keeping W02 animations.
gunPart(new THREE.BoxGeometry(.205,.026,.31),metal,0,.119,-.13,slideGroup);
for(const side of [-1,1]){
  gunPart(new THREE.BoxGeometry(.013,.085,.26),rust,side*.11,.036,-.10);
  gunPart(new THREE.BoxGeometry(.011,.21,.095),wood,side*.081,-.25,.155).rotation.x=-.17;
  for(let z=-.29;z<-.18;z+=.038)
    gunPart(new THREE.BoxGeometry(.007,.05,.009),sights,side*.115,.12,z,slideGroup);
}
gunPart(new THREE.BoxGeometry(.017,.045,.102),sights,.109,.102,-.115,slideGroup);
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
muzzleFlare.visible=false;muzzleFlare.userData.ignoreSightProbe=true;
pistol.add(muzzleFlare);

// Six visually distinct 3D models; the approved pistol model stays intact.
// Each non-pistol model owns a muzzle, moving magazine and reload hand.
const weaponVisuals=new Map();
weaponVisuals.set(SCRAP_PISTOL.id,{
  root:pistol,slideGroup,magazine,magazineBase,reloadHand,muzzleGlow,muzzleFlare,
  magBaseY:-.34,magFootY:-.445,flashScale:1,defaultX:.32,
  sightLocal:new THREE.Vector3(0,.207,-.16),
  ejectionLocal:new THREE.Vector3(.12,.12,-.115)
});
// W05.1: upgraded original low-poly procedural weapon models.
// All mounted sights are ACTUAL in-world geometry using weapon-sights.mjs.
// The optic center is exactly on the camera -Z firing ray during ADS.
function buildArsenalView(spec){
  const mount=sightMount(spec.id);
  const opticKind=sightForOptic(spec.id,installedWeaponOptic(backpack,spec.id)).optic;
  const root=new THREE.Group();camera.add(root);
  root.position.set(.29,-.27,-.77);
  const rifle=['carbine','rifle','shotgun'].includes(spec.kind);
  const revolver=spec.kind==='revolver',smg=spec.kind==='smg';
  const shotgun=spec.kind==='shotgun',scoped=spec.kind==='rifle';
  const length=scoped?.85:shotgun?.79:spec.kind==='carbine'?.72:smg?.51:.40;
  const base=mat(spec.kind==='carbine'?0x414f53:spec.kind==='rifle'?0x5b5650:
    spec.kind==='shotgun'?0x50575a:smg?0x596363:0x696059,.59);
  const steel=mat(0x2a363b,.43),oxide=mat(0x8c7660,.79),
    walnut=mat(0x6b4c35,.84),trim=mat(0xa09b85,.5),
    polymer=mat(0x34413e,.76),black=mat(0x101b20,.3);
  const part=(geometry,material,x,y,z,parent=root)=>{
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);mesh.castShadow=false;
    parent.add(mesh);return mesh;
  };
  const box=(w,h,d,material,x,y,z,parent=root)=>part(
    new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);
  const cylinder=(radius,depth,material,x,y,z,parent=root)=>{
    const mesh=part(new THREE.CylinderGeometry(radius,radius,depth,12),
      material,x,y,z,parent);mesh.rotation.x=Math.PI/2;return mesh;
  };
  // Extruded, chamfered receiver silhouette — unlike the previous plain box,
  // this produces a stepped, shaped housing with angled shoulders.
  function receiver(points,width,material){
    const outline=new THREE.Shape();
    outline.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)outline.lineTo(points[i][0],points[i][1]);
    outline.closePath();
    const geo=new THREE.ExtrudeGeometry(outline,{depth:width,
      steps:1,bevelEnabled:true,bevelSize:.009,bevelThickness:.007,
      bevelSegments:1,curveSegments:2});
    const mesh=part(geo,material,width/2,0,0);
    mesh.rotation.y=-Math.PI/2;
    return mesh;
  }
  receiver([[-.36,.10],[-.31,.145],[-.09,.145],[.12,.11],
    [.15,-.085],[-.13,-.08],[-.34,-.04]],rifle?.19:.16,base);
  // Different grip angles and grip scales create legible silhouettes.
  const grip=box(.125,.33,.165,revolver?walnut:polymer,0,-.18,.13);
  grip.rotation.x=-.27;
  for(const side of [-1,1]){
    box(.009,.20,.13,revolver?oxide:black,side*.07,-.19,.145);
    const screw=part(new THREE.CylinderGeometry(.012,.012,.007,8),
      trim,side*.078,-.17,.14);
    screw.rotation.z=Math.PI/2;
  }
  const trigger=part(new THREE.TorusGeometry(.087,.011,7,16,Math.PI*1.25),
    steel,0,-.14,-.01);
  trigger.rotation.z=-.35;
  const triggerBlade=box(.016,.095,.028,trim,0,-.13,-.065);
  triggerBlade.rotation.x=.25;
  // Long-gun stocks do not attach to thin pistol grips like a generic block.
  if(rifle){
    receiver([[.10,.03],[.28,.028],[.43,-.025],[.43,-.17],
      [.17,-.18],[.10,-.09]],.16,scoped||shotgun?walnut:polymer);
    box(.18,.16,.032,black,0,-.08,.44);
  }else if(smg){
    box(.14,.10,.29,steel,0,.005,.31);
    box(.17,.18,.04,polymer,0,-.035,.46);
  }else{
    box(.12,.15,.12,walnut,0,-.22,.20);
  }
  // Barrel, fore-end and distinct furniture, shaped per archetype.
  let pumpGrip=null,cylinderBody=null;
  const boreY=.045;
  const barrelZ=-.27-length*.38,barrelEnd=-.27-length*.84;
  cylinder(shotgun?.052:scoped?.037:revolver?.052:.036,
    length*.78,black,0,boreY,barrelZ);
  cylinder(shotgun?.057:scoped?.043:.044,.04,trim,0,boreY,barrelEnd);
  if(shotgun){
    cylinder(.028,length*.72,oxide,0,-.025,barrelZ);
    pumpGrip=box(.24,.125,.25,walnut,0,.012,-.34);
    pumpGrip.rotation.x=.02;
    for(const side of [-1,1])for(let z=-.43;z<-.24;z+=.042)
      box(.008,.05,.016,black,side*.124,.012,z);
  }else if(scoped){
    box(.205,.125,.30,walnut,0,.055,-.33);
    for(const side of [-1,1]){
      box(.018,.018,.26,trim,side*.106,.12,-.32);
      for(let z=-.42;z<-.20;z+=.073)box(.018,.04,.017,steel,side*.105,.073,z);
    }
    const bolt=box(.10,.038,.06,trim,.11,.084,-.035);
    bolt.rotation.z=.14;
    const knob=part(new THREE.SphereGeometry(.037,9,7),black,.19,.045,-.02);
  }else if(spec.kind==='carbine'){
    const handguard=box(.25,.18,.39,polymer,0,.06,-.41);
    for(const side of [-1,1]){
      for(let z=-.54;z<-.25;z+=.072)
        box(.015,.06,.037,black,side*.13,.075,z);
      box(.021,.025,.29,trim,side*.125,.15,-.41);
    }
    box(.20,.035,.48,steel,0,.17,-.28);
    for(let z=-.55;z<.03;z+=.085)box(.14,.013,.035,black,0,.189,z);
  }else if(smg){
    const guard=box(.21,.17,.26,steel,0,.075,-.22);
    for(let z=-.32;z<-.11;z+=.065)
      box(.15,.016,.022,oxide,0,.166,z);
    box(.10,.12,.14,polymer,0,-.04,-.35);
  }else if(revolver){
    // Cylinder axis is along the barrel (-Z), not across the frame (X).
    const drum=cylinder(.099,.182,oxide,0,.036,-.10);
    cylinderBody=drum;
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      const stud=part(new THREE.SphereGeometry(.017,8,6),black,
        Math.sin(a)*.069,.036+Math.cos(a)*.069,-.201);
    }
    // The old .065-high top button peaked at y=.1645 (the ADS sight is
    // y=.165) and completely blocked the notch. Real low top-strap here.
    box(.15,.035,.25,trim,0,.106,-.23);
    // Put the cylinder release latch to the left of the sight line.
    box(.028,.044,.058,steel,-.126,.12,-.055);
  }
  for(const side of [-1,1]){
    // Ejection-port and asymmetrical bolt panels.
    if(side===1&& !revolver)box(.014,.055,.12,black,.108,.087,-.035);
    if(rifle||smg)box(.016,.028,.18,oxide,side*.109,-.01,-.16);
  }
  const slideGroup=new THREE.Group();root.add(slideGroup);
  if(!revolver)box(.12,.022,.095,trim,0,.124,-.055,slideGroup);
  // Actual optic centres have the exact calibrated y from SIGHT_MOUNTS.
  // No tall fake scopes or rotated ring planes.
  if(opticKind==='scope'){
    // Hollow scope tube: open at BOTH ends so the player can see through.
    const scopeBody=part(new THREE.CylinderGeometry(.069,.069,.40,18,1,true),
      new THREE.MeshStandardMaterial({color:0x202d33,metalness:.45,
        roughness:.46,side:THREE.DoubleSide}),0,mount.y,mount.z);
    scopeBody.rotation.x=Math.PI/2;
    for(const z of [mount.z+.198,mount.z-.198]){
      part(new THREE.TorusGeometry(.069,.014,9,22),black,0,mount.y,z);
      part(new THREE.TorusGeometry(.052,.005,6,22),trim,0,mount.y,z);
    }
    // Two very low scope clamps, not a 30cm tall scope mount.
    for(const z of [mount.z+.11,mount.z-.11]){
      box(.10,.046,.028,steel,0,mount.y-.085,z);
      box(.17,.018,.038,black,0,mount.y-.113,z);
    }
    // Four thin semi-transparent reticle arms. The old 0.026 m center
    // gap swallowed distant targets. New 0.006 m gap stays zeroed without
    // covering the exact point of impact.
    const crosshair=new THREE.MeshBasicMaterial({
      color:0xcbe2d6,transparent:true,opacity:.66,depthWrite:false
    });
    for(const side of [-1,1]){
      const horizontal=box(.034,.0018,.001,crosshair,
        side*.020,mount.y,mount.z-.197);
      const vertical=box(.0018,.034,.001,crosshair,
        0,mount.y+side*.020,mount.z-.197);
      horizontal.userData.sightReference=true;
      vertical.userData.sightReference=true;
    }
  }else if(opticKind==='holo'||opticKind==='reflex'){
    const holo=opticKind==='holo';
    box(holo?.13:.105,.035,.15,black,0,mount.y-.074,mount.z);
    for(const x of [-.065,.065])box(.013,.11,.043,steel,x,mount.y-.008,mount.z);
    // Front and rear aperture aligned on camera ray; no giant high optic.
    part(new THREE.TorusGeometry(holo?.069:.052,.009,8,22),
      trim,0,mount.y,mount.z-.07);
    const redDot=part(new THREE.SphereGeometry(.008,8,8),
      new THREE.MeshBasicMaterial({color:0xea5e42,depthTest:true}),
      0,mount.y,mount.z-.073);
    redDot.userData.sightReference=true;
  }else{
    // Matched-height iron front and rear sights.
    // Open notch with the front blade tip precisely at the ADS line.
    // Rear posts never overlap x=0; the centre stays clear.
    box(.11,.022,.038,steel,0,mount.y-.041,.115);
    for(const side of [-1,1])
      box(.017,.055,.032,trim,side*.042,mount.y-.0275,.115);
    const frontBlade=box(.025,.052,.026,trim,0,
      mount.y-.026,barrelEnd-.02,slideGroup);
    frontBlade.userData.sightReference=true;
    // Iron front tip and rear notch are at equal world-space height.
  }
  // Revolvers use a cylinder and shotguns feed through a tube, not a
  // pistol-style bottom box magazine. Keep an animated shell/loader prop
  // for the shared reload UI while hiding the irrelevant mag assembly.
  const enclosed=revolver||shotgun;
  const magBaseY=enclosed?-.235:-.275;
  const magFootY=magBaseY-.132;
  const magLength=scoped?.15:smg?.31:.24;
  const magZ=smg?-.01:.03;
  const magazine=box(.126,magLength,.13,oxide,0,magBaseY,magZ);
  const magazineBase=box(.145,.028,.15,black,0,magFootY,magZ);
  magazine.visible=!enclosed;
  magazineBase.visible=!enclosed;
  const reloadHand=new THREE.Group();root.add(reloadHand);
  part(new THREE.SphereGeometry(.094,10,8),glove,0,0,0,reloadHand);
  box(.12,.15,.14,glove,-.045,-.09,.04,reloadHand);
  reloadHand.visible=false;
  // A visible cylinder release (revolver) or shell-port (shotgun) moves
  // during reload; firearm-specific rather than a floating pistol mag.
  const reloadAction=new THREE.Group();root.add(reloadAction);
  if(revolver){
    const reloadDrum=part(new THREE.CylinderGeometry(.102,.102,.19,12),
      oxide,0,.037,-.10,reloadAction);
    reloadDrum.rotation.x=Math.PI/2;
    reloadAction.visible=false;
  }else if(shotgun){
    const loadingShell=part(new THREE.CylinderGeometry(.023,.023,.09,9),
      oxide,.065,-.075,-.12,reloadAction);
    loadingShell.rotation.x=Math.PI/2;
    reloadAction.visible=false;
  }
  const muzzleGlow=new THREE.PointLight(0xffa55a,0,2,2);
  muzzleGlow.position.set(0,boreY,barrelEnd-.02);root.add(muzzleGlow);
  const modelFlare=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),
    muzzleFlare.material.clone());
  modelFlare.position.set(0,boreY,barrelEnd-.036);
  modelFlare.visible=false;modelFlare.userData.ignoreSightProbe=true;
  root.add(modelFlare);
  root.visible=false;
  return {root,slideGroup,magazine,magazineBase,reloadHand,
    muzzleGlow,muzzleFlare:modelFlare,magBaseY,magFootY,
    flashScale:shotgun?1.65:scoped?1.25:1,
    defaultX:rifle?.23:.34,reloadAction,pumpGrip,cylinderBody,
    ejectionLocal:new THREE.Vector3(revolver?.11:.14,.08,-.08),
    sightLocal:new THREE.Vector3(mount.x,mount.y,mount.z)};
}

for(const spec of ARSENAL)if(spec.id!==SCRAP_PISTOL.id)
  weaponVisuals.set(spec.id,buildArsenalView(spec));
// ADS is calibrated to the actual sight, never an approximate common offset.
function alignActiveSight(){
  const anchor=adsWeaponPosition(activeWeaponId);
  const visual=weaponVisuals.get(activeWeaponId);
  visual.root.position.set(anchor.x,anchor.y,anchor.z);
  visual.root.rotation.set(0,0,0);
}
function changeAim(enabled){
  aimHeld=!!enabled;
  setWeaponAim(weaponState,aimHeld);
  if(aimHeld&&weaponState.reloadRemaining<=0)alignActiveSight();
}
// These values must exist BEFORE restoring a saved non-default weapon.
// selectWeapon() updates recoil, notice and HUD state during page startup.
let lastShotDebug=null;
let totalHits=0,shotNoticeTime=0,recoilKick=0,mouseSway=0,muzzleFlash=0;
let slideCycle=0,handlingTime=0,weaponMotion={speed:0},reloadAnimWasActive=false;
function selectWeapon(id){
  const spec=getWeaponSpec(id);
  if(id===activeWeaponId)return;
  weaponVisuals.get(activeWeaponId).root.visible=false;
  activeWeaponId=id;activeSpec=spec;
  weaponState=arsenalStates[id];
  setWeaponAim(weaponState,aimHeld);
  weaponVisuals.get(id).root.visible=true;
  backpack.equipment.weapon=id;
  saveBackpack();
  if(aimHeld&&weaponState.reloadRemaining<=0)alignActiveSight();
  $('weaponSelect').value=id;
  // Weapon switch prevents a held mouse from continuing its old burst.
  triggerHeld=false;emptyClickLatched=false;
  slideCycle=0;muzzleFlash=0;recoilKick=0;
  showShotNotice('EQUIPPED · '+spec.name.toUpperCase());
  refreshWeaponHUD();
}
function cycleWeapon(direction){
  const i=ARSENAL_IDS.indexOf(activeWeaponId);
  selectWeapon(ARSENAL_IDS[(i+direction+ARSENAL_IDS.length)%ARSENAL_IDS.length]);
}
for(const spec of ARSENAL){
  const option=document.createElement('option');option.value=spec.id;
  option.textContent=spec.name+' · '+spec.damage+' DMG'+
    ((spec.pellets||1)>1?' × '+spec.pellets:'');
  $('weaponSelect').append(option);
}
$('weaponSelect').value=activeWeaponId;
$('weaponSelect').addEventListener('change',()=>{
  selectWeapon($('weaponSelect').value);
  backpack.equipment.weapon=activeWeaponId;
  saveBackpack();
});
if(backpack.equipment.weapon!=='scrap-pistol'){
  selectWeapon(backpack.equipment.weapon);
}

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
  // Brass comes from the *equipped receiver*, never a universal pistol
  // position in camera coordinates. Revolvers keep spent brass until reload.
  if(activeSpec.kind==='revolver')return;
  const visual=weaponVisuals.get(activeWeaponId);
  visual.root.updateWorldMatrix(true,false);
  casingOrigin.copy(visual.ejectionLocal).applyMatrix4(visual.root.matrixWorld);
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
// Runtime ADS sanity check: only raycast against the visible viewmodel,
// ignoring intentionally centered front blades and reticle dots.
const sightProbe=new THREE.Raycaster();
sightProbe.near=.05;sightProbe.far=2.5;
const sightProbeOrigin=new THREE.Vector3();
const sightProbeDirection=new THREE.Vector3();
let sightProbeTime=0;
function inspectSightClearance(){
  const visual=weaponVisuals.get(activeWeaponId);
  camera.updateWorldMatrix(true,true);
  camera.getWorldPosition(sightProbeOrigin);
  camera.getWorldDirection(sightProbeDirection);
  sightProbe.set(sightProbeOrigin,sightProbeDirection);
  const hits=sightProbe.intersectObject(visual.root,true);
  const obstruction=hits.find(h=>!h.object.userData.sightReference&&
    !h.object.userData.ignoreSightProbe);
  const output=$('weaponSightCheck');
  output.textContent=obstruction?'ADS BLOCKED · MODEL OBSTRUCTION':'ADS SIGHT LINE CLEAR';
  output.style.color=obstruction?'#ffa27d':'#abd8ae';
}
const shotVector=new THREE.Vector3();

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
  $('weaponName').textContent=activeSpec.name.toUpperCase();
  $('weaponStats').textContent=activeSpec.damage+' DAMAGE'+
    ((activeSpec.pellets||1)>1?' × '+activeSpec.pellets+' PELLETS':'')+
    ' · '+(activeSpec.automatic?'AUTOMATIC':'SEMI-AUTO')+
    ' · '+(1/activeSpec.fireInterval).toFixed(1)+' ROUNDS/SEC';
  $('weaponOptic').textContent='SIGHT · '+OPTIC_MODS[installedWeaponOptic(backpack,activeWeaponId)].name.toUpperCase();
  $('weaponAccuracy').textContent='SPREAD '+shotSpreadDegrees(activeSpec,
    weaponState.aiming,weaponMotion).toFixed(2)+'°'+
    (weaponMotion.airborne?' · AIRBORNE':weaponMotion.crouched?' · CROUCHED':
      weaponMotion.speed>2?' · MOVING':' · STEADY');
  $('reloadProgress').style.width=(weaponState.reloadRemaining>0?
    100*(1-weaponState.reloadRemaining/activeSpec.reloadSeconds):0).toFixed(1)+'%';
}
function shoot(){
  const result=fireWeapon(weaponState,activeSpec,Math.random,weaponMotion);
  if(result.status==='empty'){
    // Automatic guns call shoot() every animation frame while the trigger
    // is held. Without this latch, sound.dryFire() was called 60+ times
    // per second, creating the reported loud continuous buzzing.
    if(!emptyClickLatched){
      emptyClickLatched=true;
      dryFireClicks++;
      sound.dryFire();
      showShotNotice('EMPTY · PRESS R');
    }
    return;
  }
  if(result.status!=='fired')return;
  emptyClickLatched=false;
  sound.gunshot(activeSpec.kind||'pistol');
  recoilKick=Math.min(.55,recoilKick+.12*activeSpec.recoilDegrees/1.25);
  muzzleFlash=.085;
  slideCycle=.13;
  ejectCasing();
  // Determine the projectile direction from the pre-recoil sight orientation.
  // Applying recoil before raycasting incorrectly shifts the bullet off target.
  let enemyDamageHits=0;
  let totalEnemyDamage=0;
  for(const pellet of result.directions){
    // Sight and shot are both derived from the camera's current world-space
    // orientation, including the same yaw and pitch used to render the reticle.
    camera.updateWorldMatrix(true,false);
    shotVector.set(pellet.spreadX,pellet.spreadY,-1)
      .normalize().applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
  firingRaycaster.set(camera.position,shotVector);
  // Downed dummies remain visible but no longer block shots behind them.
  const livingParts=dummyHitMeshes.filter(mesh=>dummies.get(mesh.userData.dummyId).state.alive);
  // NEVER remove enemy hitboxes based on a stale station selection.
  // The old condition made enemies invulnerable when approaching on foot.
  const enemyParts=enemyHitMeshes.filter(mesh=>mesh.visible&&
    shouldRaycastEnemy(enemies.get(mesh.userData.enemyId)));
  const hits=firingRaycaster.intersectObjects(
    [...worldGeometry,...targetMeshes,...livingParts,...enemyParts],false);
  const first=hits[0];
  if(new URLSearchParams(location.search).get('smoke')==='1'){
    lastShotDebug={
      when:performance.now(),selectedWeapon:activeSpec.id,
      ray:{x:shotVector.x,y:shotVector.y,z:shotVector.z},
      origin:{x:camera.position.x,y:camera.position.y,z:camera.position.z},
      first:first?{distance:first.distance,id:first.object.userData.enemyId||null,
        target:first.object.userData.targetId||null,
        material:first.object.userData.impactMaterial||null,
        point:{x:first.point.x,y:first.point.y,z:first.point.z}}:null,
      hits:hits.slice(0,5).map(h=>({
        distance:h.distance,enemyId:h.object.userData.enemyId||null,
        targetId:h.object.userData.targetId||null,
        point:{x:h.point.x,y:h.point.y,z:h.point.z}
      }))
    };
  }
  let impactMaterial=null;
  if(first){
    impactMaterial=getImpactMaterial(first);
    const isPaper=impactMaterial==='paper';
    markBulletHole(first,isPaper,
      !!(first.object.userData.dummyId||first.object.userData.enemyId));
    // AudioContext scheduling creates an audible gap after the gunshot.
    // A little extra distance adds a subtle travel-time effect.
    sound.impact(impactMaterial,.15+Math.min(.11,first.distance*.0017));
  }
  if(first&&first.object.userData.enemyId){
    const enemy=enemies.get(first.object.userData.enemyId);
    const hit=applyDamage(enemy.state,activeSpec.damage,first.object.userData.hitZone);
    if(hit.applied){
      enemyDamageHits++;
      totalEnemyDamage+=hit.damage;
      enemy.flash=.22;enemy.shake=1;
      for(const mesh of enemy.meshes)mesh.material.emissive.setHex(0x633724);
      if(hit.killed){
        markEnemyDefeated(enemy);
      }else{
        alertEnemy(enemy.brain,{x:player.x,z:player.z});
        markEnemyThreat(enemy.tactics);
        reportSquadContact(squadIntel,enemy.id,player);
      }
      enemy.statusText='';
      refreshEnemyLabel(enemy,hit.killed?'DOWN':enemy.brain.mode.toUpperCase());
      spawnDamagePopup(first.point,hit);
      $('damageReport').textContent=enemy.label+' · '+ARMOR_SLOT_LABELS[hit.zone].toUpperCase()+
        ' · '+Math.ceil(hit.damage)+' HP · '+hit.points+' AP · '+
        Math.ceil(hit.blocked)+' BLOCKED'+(hit.killed?' · DOWN':'');
      showShotNotice(hit.killed?'ENEMY DOWN · '+enemy.label:
        'ENEMY HIT · '+ARMOR_SLOT_LABELS[hit.zone].toUpperCase()+
        ' · -'+Math.ceil(hit.damage)+' HP');
    }
  }else if(first&&first.object.userData.dummyId){
    const dummy=dummies.get(first.object.userData.dummyId);
    const result=applyDamage(dummy.state,activeSpec.damage,first.object.userData.hitZone);
    if(result.applied){
      dummy.flash=.2;dummy.impulse=1;
      for(const mesh of dummy.pieces)mesh.material.emissive.setHex(0x553d20);
      updateDummyLabel(dummy);
      spawnDamagePopup(first.point,result);
      $('damageReport').textContent=dummy.title+' · '+ARMOR_SLOT_LABELS[result.zone].toUpperCase()+
        ' · '+Math.ceil(result.damage)+' HP'+
        (result.blocked>0?' · '+Math.ceil(result.blocked)+' BLOCKED':'')+
        ' · '+result.points+' AP · '+Math.round(result.reduction*100)+'% REDUCTION'+
        (result.killed?' · DOWN':'');
      showShotNotice(result.killed?'DUMMY DOWN · '+dummy.title:
        (result.critical?'HEADSHOT':'HIT '+ARMOR_SLOT_LABELS[result.zone].toUpperCase())+
        ' · -'+Math.ceil(result.damage)+' HP'+
        (result.blocked>0?' · '+Math.ceil(result.blocked)+' BLOCKED':''));
      if($('armory').classList.contains('hidden')===false)refreshArmory();
    }
  } else if(first&&first.object.userData.targetId){
    const target=targetData.get(first.object.userData.targetId);
    target.hits++;totalHits++;
    target.back.material.emissive.setHex(0x956c2f);
    target.back.material.emissiveIntensity=.75;
    target.back.userData.flash=.22;
    showShotNotice('TARGET HIT · +'+result.damage+' DAMAGE · PAPER');
  } else if(first)showShotNotice(impactMaterial.toUpperCase()+' IMPACT');
  else showShotNotice('MISS');
  } // all projectiles from one round
  // Shotguns fire eight pellets: the LAST pellet might miss even after a
  // previous pellet dealt damage, so never announce a false overall MISS.
  if(enemyDamageHits>0){
    showShotNotice('AI DAMAGE CONFIRMED · '+enemyDamageHits+
      ' HIT'+(enemyDamageHits!==1?'S':'')+' · -'+
      Math.ceil(totalEnemyDamage)+' HP');
  }
  // Vertical recoil only. Yaw and roll are never touched.
  camera.rotation.x=kickViewRecoil(viewRecoil,camera.rotation.x,result.recoilDegrees);
  refreshWeaponHUD();
}
function reload(){
  if(startWeaponReload(weaponState,activeSpec)){
    emptyClickLatched=false;
    slideCycle=0;
    sound.reload(activeSpec.kind||'pistol',activeSpec.reloadSeconds);
    showShotNotice('RELOADING');refreshWeaponHUD();
  }
}
function resupply(){
  const fresh=createWeaponState(activeSpec);
  Object.assign(weaponState,fresh);
  emptyClickLatched=false;
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
let stationIndex=0,qualityHigh=!reducedRenderer;
$('quality').textContent='QUALITY: '+(qualityHigh?'HIGH':'LOW');
function resetPlayer(i){
  const previousStation=stationIndex;
  stationIndex=i;const s=stations[i];
  if(i===8&&previousStation!==8){
    enemyAIEnabled=true;
    resetPlayerHealth(playerHealth);
    refreshPlayerHealth();
    // Ensure a clear, repeatable view of every enemy on first entry.
    resetEnemies();
  }
  player.x=s.x;player.z=s.z;player.jump=0;player.vertical=0;player.supported=false;
  resetMotion(player);
  // Reset both the view direction and the unrecovered weapon kick.
  viewRecoil.unrecovered=0;
  // Face the enemy rather than relying on a hard-coded lab bearing.
  // Three.js camera forward after yaw is (-sin(yaw), 0, -cos(yaw)).
  // Snap toward the scout on station 9, even if future spawns move.
  const scout=enemies.get('scout');
  const lookYaw=i===8&&scout?
    Math.atan2(-(scout.brain.x-player.x),-(scout.brain.z-player.z)):
    -Math.PI/2;
  camera.rotation.set(0,lookYaw,0);
  $('stationName').textContent=s.title;$('stationInfo').textContent=s.info;
  camera.position.set(player.x,groundHeight(player.x,player.z)+player.eyeHeight,player.z);
}
resetPlayer(0);
if(new URLSearchParams(location.search).get('station')==='9')resetPlayer(8);
// Read-only smoke instrumentation. Active ONLY with ?smoke=1 so CI can
// check actual Three.js gameplay rather than matching code strings.
if(new URLSearchParams(location.search).get('smoke')==='1'){
  // CI-only ammo fixture: makes the empty-trigger regression test fast on
  // software WebGL, without wasting many slow render frames on a full mag.
  window.__rpgSmokeTeleportToPowerBay=()=>{
    resetPlayer(7);
    return nearPoweredSuit();
  };
  window.__rpgSmokePowerTransition=()=>togglePoweredSuit();
  window.__rpgSmokeSetPowerProgress=(fraction)=>{
    if(powerArmorState.phase!=='idle')
      powerArmorState.elapsed=Math.min(POWER_ARMOR_TRANSITION_SECONDS-.01,
        Math.max(0,fraction*POWER_ARMOR_TRANSITION_SECONDS));
  };
  window.__rpgSmokePowerVisual=()=>({
    chestOpenAngle:poweredSuit.doors.left.rotation.y,
    helmetOpenAngle:poweredSuit.helmetPivot.rotation.x,
    visiblePlates:Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>
      [slot,poweredSuit.plateMeshes[slot].filter(mesh=>mesh.visible).length])),
    pilotVisible:poweredSuit.pilot.visible,
    pilotDepth:poweredSuit.pilot.position.z,
    chassisHeight:poweredSuit.size.y,
    chassisWidth:poweredSuit.size.x,
    cinematic:powerCinematic!==null,
    cameraDistanceToHero:camera.position.distanceTo(
      poweredSuit.root.localToWorld(new THREE.Vector3(3.15,2.63,4.85)))
  });
  window.__rpgSmokeCompletePowerTransition=()=>{
    if(powerArmorState.phase!=='idle')
      powerArmorState.elapsed=POWER_ARMOR_TRANSITION_SECONDS-.001;
  };
  window.__rpgSmokeGiveBenchMaterials=()=>{
    addItem(backpack,'supply:salvage',30);
    addItem(backpack,'supply:optic-glass',15);
    saveBackpack();return true;
  };
  window.__rpgSmokeAimAtScout=()=>{
    const target=enemies.get('scout');
    const dx=target.brain.x-camera.position.x;
    const dz=target.brain.z-camera.position.z;
    camera.rotation.y=Math.atan2(-dx,-dz);
    // Sight a real solid chest hitbox, avoiding the narrow gap between
    // the chest and head at the player's default 1.7 m eye height.
    camera.rotation.x=-Math.atan2(camera.position.y-1.34,Math.hypot(dx,dz));
    viewRecoil.unrecovered=0;
  };
  window.__rpgSmokeFinishReload=()=>{
    // Run the real reload-completion path on the next update, without
    // waiting for 60 slow software-WebGL animation frames in CI.
    if(weaponState.reloadRemaining>0)weaponState.reloadRemaining=.001;
  };
  window.__rpgSmokeSetMagazine=(count)=>{
    weaponState.magazine=Math.max(0,Math.min(activeSpec.magazineSize,
      Math.floor(Number.isFinite(count)?count:0)));
    weaponState.cooldown=0;
  };
  window.__rpgSmokeSpawnLoot=(enemyId='scout')=>{
    // CI-only fixture exercises the very same spawn routine used by an
    // actual enemy death, without another 30 seconds of headless shooting.
    return spawnEnemyLoot(enemies.get(enemyId));
  };
  window.__rpgSmokeNeckHit=()=>{
    const enemy=enemies.get('scout');
    const origin=new THREE.Vector3(enemy.brain.x,1.76,enemy.brain.z+3);
    const ray=new THREE.Raycaster(origin,new THREE.Vector3(0,0,-1),0,6);
    scene.updateMatrixWorld(true);
    return ray.intersectObjects(enemy.meshes,false)[0]?.object.userData.hitZone||null;
  };
  window.__rpgSmokeMoveOutsideArena=()=>{
    stationIndex=0;player.x=8;player.z=8;
    camera.position.set(8,player.eyeHeight,8);
    return !inAIArena();
  };
  window.__rpgSmokeDownEnemy=(id='scout')=>{
    const enemy=enemies.get(id);
    const hit=applyDamage(enemy.state,100000,'chest');
    if(hit.killed)markEnemyDefeated(enemy);
    return hit.killed;
  };
  window.__rpgSmokeLongRangeEngage=()=>{
    resetEnemies();
    stationIndex=0;player.x=16;player.z=46;
    resetMotion(player);camera.position.set(16,1.7,46);
    const raider=enemies.get('raider');
    alertEnemy(raider.brain,{x:player.x,z:player.z});
    raider.tactics.cooldown=0; // CI fixture skips initial no-fire grace period
    return {distance:Math.hypot(raider.brain.x-player.x,raider.brain.z-player.z),
      insideArena:inAIArena(),memory:raider.brain.memory};
  };
  window.__rpgSmokeApproachLoot=()=>{
    const bag=[...lootBags.values()][0];
    if(!bag)return false;
    player.x=bag.x+.75;player.z=bag.z+.25;
    camera.position.x=player.x;camera.position.z=player.z;
    return !!nearestLootBag();
  };
  window.__rpgSmokeState=()=>({
    stationIndex,arenaActive:inAIArena(),locked:controls.isLocked,
    shot: lastShotDebug,weaponShots:weaponState.shotsFired,
    weapon:{id:activeSpec.id,magazine:weaponState.magazine,
      reserve:weaponState.reserve,reloadRemaining:weaponState.reloadRemaining,
      cooldown:weaponState.cooldown},
    triggerHeld,emptyClickLatched,dryFireClicks,
    squad:{remaining:squadIntel.remaining,source:squadIntel.source,
      alerts:squadIntel.alerts},
    workbenchOpen,optic:installedWeaponOptic(backpack,activeWeaponId),
    scopedFOV:camera.fov,
    powerArmor:{occupied:powerArmorState.occupied,phase:powerArmorState.phase,
      plates:{...powerArmorState.plates},visible:poweredSuit.root.visible,
      cockpit:poweredCockpit.visible},
    inventory:{slots:backpack.items.length,
      items:backpack.items.map(e=>({...e})),
      armor:{...backpack.equipment.armor},
      equippedWeapon:backpack.equipment.weapon},
    loot:[...lootBags.values()].map(b=>({id:b.id,x:b.x,z:b.z,
      source:b.source,items:b.items.map(i=>({...i}))})),
    lootOpen,inventoryOpen,
    camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z,
      yaw:camera.rotation.y,pitch:camera.rotation.x},
    aiEnabled:enemyAIEnabled,playerHealth:playerHealth.health,
    player:{x:player.x,z:player.z},
    enemies:[...enemies.values()].map(e=>({
      id:e.id,x:e.brain.x,z:e.brain.z,
      mode:e.brain.mode,health:e.state.health,alive:e.state.alive,
      visible:e.root.visible,deathTimer:e.deathTimer,flash:e.flash,
      armor:{...e.state.loadout},
      armorVisible:Object.fromEntries([...e.armorMeshes].map(([slot,mesh])=>[slot,mesh.visible])),
      tacticalPhase:e.tactics.phase,enemyShots:e.tactics.shots,
      crouching:e.tactics.crouching,
      coverPoint:e.tactics.coverPoint,stuckEvents:e.tactics.stuckEvents
    }))
  });
}
$('enterAI').addEventListener('click',()=>{
  resetPlayer(8);
  sound.unlock();
  controls.lock();
});
$('start').addEventListener('click',()=>{
  // The audio engine is unlocked only after the player initiates playback.
  sound.unlock();
  controls.lock();
});
canvas.addEventListener('click',()=>{if(!$('menu').classList.contains('hidden'))return;controls.lock();});
controls.addEventListener('lock',()=>{$('menu').classList.add('hidden');});
controls.addEventListener('unlock',()=>{
  if(!inventoryOpen&&!lootOpen&&!workbenchOpen&&!powerUIOpen)$('menu').classList.remove('hidden');
  keys.clear();
  triggerHeld=false;emptyClickLatched=false;
  changeAim(false);
});
$('quality').addEventListener('click',()=>{
  qualityHigh=!qualityHigh;
  renderer.setPixelRatio(Math.min(devicePixelRatio,qualityHigh?1.6:1));
  sun.castShadow=qualityHigh;
  renderer.shadowMap.enabled=qualityHigh;
  $('quality').textContent='QUALITY: '+(qualityHigh?'HIGH':'LOW');
});
window.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&powerUIOpen){closePowerArmorBay();return;}
  if(e.code==='Escape'&&workbenchOpen){closeWorkbench();return;}
  if(e.code==='Escape'&&(inventoryOpen||lootOpen)){closeLootOverlay();return;}
  if(e.code==='KeyI'&&!e.repeat){
    if(inventoryOpen||lootOpen)closeLootOverlay();
    else beginLootOverlay();
    return;
  }
  if(powerUIOpen||workbenchOpen||inventoryOpen||lootOpen)return;
  if(e.code==='KeyO'&&!e.repeat&&controls.isLocked){openPowerArmorBay();return;}
  if(e.code==='KeyP'&&!e.repeat&&controls.isLocked){togglePoweredSuit();return;}
  if(e.code==='KeyU'&&!e.repeat&&controls.isLocked){beginWorkbench();return;}
  if(e.code==='KeyE'&&!e.repeat&&controls.isLocked){
    const bag=nearestLootBag();
    if(bag)beginLootOverlay(bag.id);
    else if(benchWithinReach())beginWorkbench();
    else if(!powerArmorState.occupied&&nearPoweredSuit())togglePoweredSuit();
    else showShotNotice('NO LOOT OR WORKBENCH WITHIN REACH');
    return;
  }
  if(e.code==='BracketLeft'||e.code==='BracketRight'){
    e.preventDefault();if(!e.repeat)adjustEndurance(e.code==='BracketRight'?1:-1);return;
  }
  if(e.code==='KeyZ'&&!e.repeat&&controls.isLocked){cycleWeapon(-1);return;}
  if(e.code==='KeyX'&&!e.repeat&&controls.isLocked){cycleWeapon(1);return;}
  if(e.code==='KeyN'&&!e.repeat){
    toggleSound();return;
  }
  if(e.code==='KeyC'&&!e.repeat&&controls.isLocked){toggleCrouch(player);return;}
  if(e.code==='Space'&&e.repeat){e.preventDefault();return;}
  if(e.code.startsWith('Digit')&&Number(e.code.slice(5))>=1&&Number(e.code.slice(5))<=9){
    resetPlayer(Number(e.code.slice(5))-1);return;
  }
  if(e.code==='KeyR'&&!e.repeat&&controls.isLocked){reload();return;}
  if(e.code==='KeyF'&&!e.repeat&&controls.isLocked){resupply();return;}
  if(e.code==='KeyY'&&!e.repeat&&controls.isLocked){resetAllDummies();return;}
  if(e.code==='KeyB'&&!e.repeat&&controls.isLocked){openArmory();return;}
  if(e.code==='KeyJ'&&!e.repeat&&controls.isLocked){resetEnemies();return;}
  if(e.code==='KeyH'&&!e.repeat&&controls.isLocked){healPlayer();return;}
  if(e.code==='KeyK'&&!e.repeat&&controls.isLocked){
    enemyAIEnabled=!enemyAIEnabled;
    showShotNotice(enemyAIEnabled?'ENEMY AI RESUMED':'ENEMY AI FROZEN');
    return;
  }
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
  if(e.button===0&&powerArmorState.phase==='idle'){triggerHeld=true;shoot();}
  if(e.button===2)changeAim(true);
});
window.addEventListener('mouseup',e=>{
  if(e.button===0){triggerHeld=false;emptyClickLatched=false;}
  if(e.button===2)changeAim(false);
});
window.addEventListener('mousemove',e=>{
  if(controls.isLocked)mouseSway=Math.max(-.08,Math.min(.08,mouseSway+e.movementX*.00025));
});
window.addEventListener('blur',()=>{
  keys.clear();triggerHeld=false;emptyClickLatched=false;changeAim(false);
});
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
  for(const spec of ARSENAL)updateWeapon(arsenalStates[spec.id],dt,spec);
  // Ease camera pitch back to the player's original view. This applies in
  // YXZ space, so mouse-look cannot leave the camera permanently tilted.
  if(viewRecoil.unrecovered>0){
    camera.rotation.x=recoverViewRecoil(viewRecoil,camera.rotation.x,dt);
  }
  recoilKick*=Math.exp(-11*dt);
  mouseSway*=Math.exp(-9*dt);
  muzzleFlash=Math.max(0,muzzleFlash-dt);
  slideCycle=Math.max(0,slideCycle-dt);
  const visual=weaponVisuals.get(activeWeaponId);
  visual.muzzleGlow.intensity=muzzleFlash>0?5.5:0;
  visual.muzzleFlare.visible=muzzleFlash>0;
  if(visual.muzzleFlare.visible){
    const q=muzzleFlash/.085;
    visual.muzzleFlare.scale.setScalar((.65+q*.8)*visual.flashScale);
    visual.muzzleFlare.material.opacity=q;
  }
  const handling=reloadVisualState(weaponState.reloadRemaining,activeSpec.reloadSeconds);
  visual.slideGroup.position.z=slideTravel(slideCycle)+handling.slideOffset;
  visual.magazine.position.y=visual.magBaseY-handling.magazineOffset;
  visual.magazineBase.position.y=visual.magFootY-handling.magazineOffset;
  visual.magazine.rotation.z=handling.magazineAngle;
  visual.magazineBase.rotation.z=handling.magazineAngle;
  visual.reloadHand.visible=handling.handVisible;
  visual.reloadHand.position.set(handling.handX,handling.handY,handling.handZ);
  if(visual.pumpGrip)
    visual.pumpGrip.position.z=-.34+slideTravel(slideCycle)*1.5;
  if(visual.reloadAction){
    const action=visual.reloadAction;
    action.visible=handling.active&&
      (activeSpec.kind==='revolver'||activeSpec.kind==='shotgun');
    if(activeSpec.kind==='revolver'){
      // Cylinder swings out and returns, instead of dropping a box mag.
      action.position.x=.17*Math.sin(Math.PI*handling.progress);
      action.rotation.y=.40*Math.sin(Math.PI*handling.progress);
    }else{
      // A shell dips toward the loading port and slides back.
      action.position.y=-.09*Math.sin(Math.PI*handling.progress);
      action.position.z=.17*Math.sin(Math.PI*handling.progress);
    }
    visual.reloadHand.visible=false;
    visual.magazine.visible=false;visual.magazineBase.visible=false;
    if(visual.cylinderBody)visual.cylinderBody.visible=!handling.active;
  }
  // Distinct idle/ADS movement sway, with substantially steadier sights in ADS.
  handlingTime+=dt;
  const moving=Math.min(1,(weaponMotion.speed||0)/4.5);
  const steadiness=weaponState.aiming?.22:1;
  const swayX=Math.sin(handlingTime*(2.1+moving*6))*(.0035+moving*.011)*steadiness;
  const swayY=Math.cos(handlingTime*(2.7+moving*5))*(.0025+moving*.008)*steadiness;
  if(weaponState.aiming&&!handling.active){
    // The actual optic is centered on the camera's -Z hitscan line.
    // No procedural sway or rotation may shift it during ADS.
    alignActiveSight();
  }else{
    const desired=new THREE.Vector3(visual.defaultX,-.31,-.77);
    desired.x+=swayX;desired.y+=swayY;
    if(weaponMotion.sprinting)desired.y-=.10;
    if(handling.active){desired.x+=.045;desired.y-=.04;}
    visual.root.position.lerp(desired,1-Math.exp(-16*dt));
    visual.root.rotation.x=recoilKick+handling.tilt;
    visual.root.rotation.y=mouseSway*steadiness;
    visual.root.rotation.z=mouseSway*.28*steadiness;
  }
  const targetFOV=weaponState.aiming?
    sightForOptic(activeWeaponId,installedWeaponOptic(backpack,activeWeaponId)).fov:76;
  camera.fov+=(targetFOV-camera.fov)*(1-Math.exp(-16*dt));
  camera.updateProjectionMatrix();
  $('crosshair').classList.toggle('hidden',weaponState.aiming);
  const sightCheck=$('weaponSightCheck');
  sightCheck.style.display=weaponState.aiming&&!handling.active?'block':'none';
  sightProbeTime-=dt;
  if(sightCheck.style.display==='block'&&sightProbeTime<=0){
    inspectSightClearance();
    sightProbeTime=.20;
  }
  for(const {back} of targetData.values()){
    const flash=back.userData.flash||0;
    if(flash>0){
      back.userData.flash=Math.max(0,flash-dt);
      if(back.userData.flash===0)back.material.emissiveIntensity=0;
    }
  }
  if(shotNoticeTime>0){shotNoticeTime-=dt;if(shotNoticeTime<=0)$('shotNotice').classList.remove('visible');}
  updateCasings(dt);
  updateCombatVisuals(dt);
  if(controls.isLocked&&triggerHeld&&activeSpec.automatic&&powerArmorState.phase==='idle')
    shoot();
  refreshWeaponHUD();
  // Entrance / exit is a physical, timed chest-door and hydraulic animation.
  poweredArmorTime+=dt;
  const powerStep=stepPowerArmor(powerArmorState,dt);
  poweredSuit.animate(powerStep.phase,powerStep.progress,poweredArmorTime);
  poweredSuit.root.visible=powerArmorState.phase!=='idle'||!powerArmorState.occupied;
  poweredCockpit.visible=powerArmorState.occupied&&powerArmorState.phase==='idle';
  if(powerStep.phase!=='idle')updatePowerCinematic(powerStep.progress);
  poweredCockpit.position.y=powerArmorState.occupied?
    Math.sin(poweredArmorTime*(3+weaponMotion.speed*1.5))*.0035:0;
  if(powerStep.completed){
    if(powerCinematic){
      player.x=powerCinematic.to.x;player.z=powerCinematic.to.z;
      player.jump=0;player.vertical=0;resetMotion(player);
      camera.position.copy(powerCinematic.to);
      camera.quaternion.copy(powerCinematic.toRotation);
      powerCinematic=null;
    }
    weaponVisuals.get(activeWeaponId).root.visible=true;
    savePowerArmor();refreshPowerArmorHUD();refreshInventoryUI();
    showShotNotice(powerArmorState.occupied?'POWER ARMOR LOCKED · READY':
      'POWER ARMOR PARKED · STEP CLEAR');
  }
  if(controls.isLocked&&powerArmorState.phase==='idle'){
    controls.getDirection(forward);
    const info=stepMovement(player,keys,{x:forward.x,z:forward.z},dt,{boxes:bounds,trees:[],ceilings,groundHeight});
    weaponMotion={speed:info.speed,sprinting:info.sprinting,airborne:info.airborne,crouched:info.crouched};
    camera.position.set(player.x,info.ground+info.eyeHeight+info.cameraBob+player.jump,player.z);
    updateHUD(info);
  }
  updateEnemies(dt);
  refreshPowerArmorHUD();
  // Loot prompt follows world-space proximity; it does not require
  // the target enemy body to stay rendered after defeat.
  const nearby=nearestLootBag();
  $('lootPrompt').classList.toggle('hidden',
    !controls.isLocked||inventoryOpen||lootOpen||!nearby);
  if(nearby)$('lootPrompt').textContent='E · SEARCH '+nearby.source.toUpperCase()+
    ' · '+nearby.items.length+' ITEM TYPES';
  renderer.render(scene,camera);
}
frame();
