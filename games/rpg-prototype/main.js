import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { WORLD, LANDMARKS, groundHeight, movePoint, collision,
  initialQuest, questStage, beginQuest, collectCase, finishQuest, revealNearby } from './rules.mjs';

const $ = id => document.getElementById(id);
const canvas = $('view');
const scene = new THREE.Scene();
const daylightSky = new THREE.Color(0x8dafa6);
const nightSky = new THREE.Color(0x162b3b);
scene.background = daylightSky.clone();
scene.fog = new THREE.FogExp2(daylightSky, 0.006);
const camera = new THREE.PerspectiveCamera(73, 1, 0.1, 420);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference:'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
let lowQuality = false;
function resize() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowQuality ? .8 : 1.4));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize);
resize();
$('qualityButton').addEventListener('click', () => {
  lowQuality = !lowQuality;
  $('qualityButton').textContent = lowQuality ? 'QUALITY: CHROMEBOOK' : 'QUALITY: HIGH';
  resize();
});

const hemi = new THREE.HemisphereLight(0xc4d8dc, 0x303b24, 2.2);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe3a9, 2.3);
sun.position.set(90,120,60);
scene.add(sun);
const moon = new THREE.DirectionalLight(0xa4bfdc,.1);
moon.position.set(-70,90,-50);
scene.add(moon);

const grass = new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1});
const terrainGeo = new THREE.PlaneGeometry(WORLD,WORLD,136,136);
terrainGeo.rotateX(-Math.PI/2);
const verts = terrainGeo.attributes.position;
const colors = new Float32Array(verts.count*3);
const grassColor = new THREE.Color();
for(let i=0;i<verts.count;i++){
  const x=verts.getX(i),z=verts.getZ(i),y=groundHeight(x,z);
  verts.setY(i,y);
  const variation=Math.sin(x*.29+z*.17)*.025 + Math.cos(z*.37-x*.11)*.035;
  grassColor.setHSL(.28+variation, .23+Math.max(0,y)*.006,.23+variation*.4+Math.max(0,y)*.009);
  colors[i*3]=grassColor.r;colors[i*3+1]=grassColor.g;colors[i*3+2]=grassColor.b;
}
terrainGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
terrainGeo.computeVertexNormals();
const ground=new THREE.Mesh(terrainGeo,grass);
scene.add(ground);

const mats={
  earth:new THREE.MeshStandardMaterial({color:0x8a795b,roughness:1}),
  road:new THREE.MeshStandardMaterial({color:0x6e604a,roughness:1,side:THREE.DoubleSide}),
  oldWood:new THREE.MeshStandardMaterial({color:0x807b69,roughness:1}),
  oldWood2:new THREE.MeshStandardMaterial({color:0x686e63,roughness:1}),
  stone:new THREE.MeshStandardMaterial({color:0x777d72,roughness:1}),
  roof:new THREE.MeshStandardMaterial({color:0x514f4b,roughness:1}),
  rust:new THREE.MeshStandardMaterial({color:0x865b45,roughness:1}),
  dark:new THREE.MeshStandardMaterial({color:0x242d2b,roughness:1}),
  tent:new THREE.MeshStandardMaterial({color:0x5e6b55,roughness:1,side:THREE.DoubleSide}),
  glow:new THREE.MeshStandardMaterial({color:0xe7b777,emissive:0xb67635,emissiveIntensity:.65}),
  supply:new THREE.MeshStandardMaterial({color:0x9b7744,roughness:1}),
  blue:new THREE.MeshStandardMaterial({color:0x4e7476,roughness:1})
};
const solids=[];
const treeSolids=[];
const interactables=[];
function box(w,h,d,x,y,z,mat,parent=scene,solid=false){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z);
  parent.add(m);
  if(solid)solids.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2});
  return m;
}
function groundBox(w,h,d,x,z,mat,offset=0,solid=false){
  return box(w,h,d,x,groundHeight(x,z)+h/2+offset,z,mat,scene,solid);
}
const trail=[[-109,-93],[-94,-77],[-72,-56],[-48,-38],[-30,-18],[-8,12],[15,26],[38,44],[55,60],[78,83]];
function ribbon(points,width,material){
  const line=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)));
  const pos=[],uv=[],indices=[];
  for(let i=0;i<=110;i++){
    const t=i/110,p=line.getPoint(t),tangent=line.getTangent(t);
    const length=Math.hypot(tangent.x,tangent.z)||1;
    const ox=-tangent.z/length*width/2,oz=tangent.x/length*width/2;
    for(const sign of [-1,1]){
      const x=p.x+ox*sign,z=p.z+oz*sign;
      pos.push(x,groundHeight(x,z)+.065,z);
      uv.push(i/8,sign);
    }
    if(i){const k=(i-1)*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(indices);geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo,material));
}
ribbon(trail,4.8,mats.road);
ribbon([[0,-12],[18,-19],[39,-23],[63,-34]],3.1,mats.earth);

// A deliberately composed rural landscape: uneven tree groups, clearings,
// dirt trails and named ruins. Deterministic placement prevents map reshuffles.
let seed=73162;
const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
function nearRoad(x,z){
  for(let i=0;i<trail.length-1;i++){
    const [ax,az]=trail[i],[bx,bz]=trail[i+1],dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
    if(Math.hypot(x-(ax+t*dx),z-(az+t*dz))<7)return true;
  }
  return false;
}
function nearLandmark(x,z) {
  return Object.values(LANDMARKS).some(l=>Math.hypot(x-l.x,z-l.z)<l.r+5);
}
function placeInstance(mesh,dummy,i,x,y,z,sx,sy,sz,rotation){
  dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);
  dummy.rotation.set(0,rotation,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
}
const trunkMat=new THREE.MeshStandardMaterial({color:0x514737,roughness:1});
const pineMat=new THREE.MeshStandardMaterial({color:0x294b3d,roughness:1});
const pineMat2=new THREE.MeshStandardMaterial({color:0x355744,roughness:1});
const trunkGeo=new THREE.CylinderGeometry(.18,.29,1,6);
const crownGeo=new THREE.ConeGeometry(1,2.75,7);
const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,340);
const crowns=new THREE.InstancedMesh(crownGeo,pineMat,340);
const upperCrowns=new THREE.InstancedMesh(crownGeo,pineMat2,340);
const dummy=new THREE.Object3D();
let count=0,tries=0;
while(count<310&&tries++<3000){
  const x=(rand()-.5)*(WORLD-22),z=(rand()-.5)*(WORLD-22);
  if(nearRoad(x,z)||nearLandmark(x,z))continue;
  const clump=.5+.5*Math.sin(x*.028+z*.045)*Math.cos(z*.04);
  if(rand()>.38+.55*clump)continue;
  const h=2.3+rand()*2.7,r=.9+rand()*.8,y=groundHeight(x,z);
  placeInstance(trunks,dummy,count,x,y+h/2,z,1,h,1,rand()*6.28);
  placeInstance(crowns,dummy,count,x,y+h+1.2,z,r,1.2+rand()*.5,r,rand()*6.28);
  placeInstance(upperCrowns,dummy,count,x,y+h+2.35,z,r*.65,.9,r*.65,rand()*6.28);
  treeSolids.push({x,z,r:.25});count++;
}
for(const m of [trunks,crowns,upperCrowns]){m.count=count;m.instanceMatrix.needsUpdate=true;scene.add(m);}

// Ground cover is cheap instancing, rather than hundreds of independent draws.
const rockGeo=new THREE.IcosahedronGeometry(1,0);
const rockMat=new THREE.MeshStandardMaterial({color:0x6d746e,roughness:1});
const rocks=new THREE.InstancedMesh(rockGeo,rockMat,135);
for(let i=0;i<135;i++){
  const x=(rand()-.5)*(WORLD-16),z=(rand()-.5)*(WORLD-16);
  const sc=.24+rand()*.85;
  placeInstance(rocks,dummy,i,x,groundHeight(x,z)+sc*.25,z,sc,sc*.43,sc,rand()*6.28);
}
rocks.instanceMatrix.needsUpdate=true;scene.add(rocks);

function ruin(name,x,z,w,d,wallMat,broken=false) {
  const y=groundHeight(x,z),h=3.9,t=.42;
  box(w,.16,d,x,y+.07,z,mats.stone);
  box(w,h,t,x-w/2+t/2,y+h/2,z,wallMat,scene,true);
  box(w,h,t,x+w/2-t/2,y+h/2,z,wallMat,scene,true);
  box(w,h,t,x,y+h/2,z+d/2-t/2,wallMat,scene,true);
  const door=3;
  const side=(w-door)/2;
  box(side,h,t,x-(door+side)/2,y+h/2,z-d/2+t/2,wallMat,scene,true);
  box(side,h,t,x+(door+side)/2,y+h/2,z-d/2+t/2,wallMat,scene,true);
  box(door,.7,t,x,y+h-.35,z-d/2+t/2,wallMat);
  if(!broken){
    const a=box(w/2+.5,.25,d+1,x-w/4,y+h+.5,z,mats.roof);
    a.rotation.z=-.13;
    const b=box(w/2+.5,.25,d+1,x+w/4,y+h+.5,z,mats.roof);
    b.rotation.z=.13;
  }else{
    const remaining=box(w*.56,.26,d*.64,x+w*.18,y+h+.1,z+d*.16,mats.roof);
    remaining.rotation.z=.2;
  }
  // Doorstep and characteristic front-yard debris.
  groundBox(3.8,.16,1.7,x,z-d/2-1,mats.stone);
  for(let i=0;i<4;i++){
    const rx=x+(rand()-.5)*(w+7),rz=z+(rand()-.5)*(d+7);
    groundBox(.4+rand()*.9,.2,.5,rx,rz,mats.rust);
  }
}
ruin('OLD CABIN',-48,-37,11,10,mats.oldWood,true);
ruin('HILLSIDE COTTAGE',-7,11,12,11,mats.oldWood2,false);
ruin('FARMHOUSE',39,-23,15,12,mats.stone,true);
ruin('REPAIR GARAGE',54,59,15,12,mats.oldWood,false);

function supplyCase(id,x,z){
  const y=groundHeight(x,z);
  const caseMesh=box(1.2,.65,.85,x,y+.44,z,mats.supply);
  box(1.24,.12,.17,x,y+.48,z,mats.dark);
  const m=box(.22,.17,.13,x,y+.7,z-.46,mats.glow);
  interactables.push({id,type:'case',x,z,label:'Collect sealed supply case',meshes:[caseMesh,m],used:false});
}
supplyCase('cabin',-49,-35);
supplyCase('cottage',-7,13);

// The settlement has a few surviving signs of daily life, not only loot.
function camp(){
  const x=LANDMARKS.camp.x,z=LANDMARKS.camp.z,y=groundHeight(x,z);
  groundBox(9,.13,9,x+1,z+2,mats.earth);
  const tent=new THREE.Mesh(new THREE.ConeGeometry(4,3.2,4),mats.tent);
  tent.position.set(x+6,y+1.6,z+4);tent.rotation.y=Math.PI/4;scene.add(tent);
  const fire=box(.9,.25,.9,x+2,y+.22,z-2,mats.rust);
  const flame=new THREE.Mesh(new THREE.ConeGeometry(.43,1.2,6),mats.glow);
  flame.position.set(x+2,y+.85,z-2);scene.add(flame);
  const light=new THREE.PointLight(0xffa34b,4,16,2);
  light.position.set(x+2,y+1.4,z-2);scene.add(light);
  // A readable, harmless placeholder character model.
  const scoutX=x-2,scoutZ=z;
  box(.72,1.15,.4,scoutX,y+.95,scoutZ,mats.blue);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.28,10,8),new THREE.MeshStandardMaterial({color:0xb88d6d}));
  head.position.set(scoutX,y+1.74,scoutZ);scene.add(head);
  interactables.push({id:'scout',type:'scout',x:scoutX,z:scoutZ,label:'Talk to Scout Mara'});
}
camp();

// A distant skyline gives the player a believable long-term direction, not a
// fake accessible city in this first small build.
const skylineMat=new THREE.MeshStandardMaterial({color:0x515b59,roughness:1});
for(let i=0;i<17;i++){
  const x=89+i*4.3+(rand()-.5)*2,z=134+(rand()-.5)*9,h=10+rand()*37;
  box(3+rand()*3,h,4+rand()*4,x,groundHeight(x,z)+h/2,z,skylineMat);
}

const controls=new PointerLockControls(camera,renderer.domElement);
const keys=new Set();
const eye=1.7;
const player={x:-102,z:-89,jump:0,vertical:0};
camera.position.set(player.x,groundHeight(player.x,player.z)+eye,player.z);
camera.rotation.order='YXZ';
camera.rotation.y=Math.PI;
let gameStarted=false,showMap=false,dayPhase=.15,last=performance.now();
let quest=initialQuest();
let collected=new Set();
const fogGrid=36;
const visited=new Set();
let fogDirty=true;
try{
  const saved=JSON.parse(localStorage.getItem('rpg-foundation-01')||'null');
  if(saved&&Array.isArray(saved.taken)&&saved.quest){
    collected=new Set(saved.taken.filter(x=>x==='cabin'||x==='cottage'));
    quest={...initialQuest(),...saved.quest,collected:collected.size};
  }
  if(saved&&Array.isArray(saved.explored)){
    for(const cell of saved.explored){
      if(Number.isInteger(cell)&&cell>=0&&cell<fogGrid*fogGrid)visited.add(cell);
    }
  }
}catch{}
for(const obj of interactables)if(obj.type==='case'&&collected.has(obj.id)){
  obj.used=true;for(const m of obj.meshes)m.visible=false;
}
function save(){
  try{localStorage.setItem('rpg-foundation-01',JSON.stringify({
    quest,taken:[...collected],explored:[...visited]
  }));}catch{}
}
function refreshObjective(){
  const stage=questStage(quest);
  $('objectiveText').textContent=stage==='unknown'?'Find the Hearthguard scout by the campfire.':
    stage==='collect'?'Recover supplies from the abandoned homes ('+quest.collected+' / 2).':
    stage==='return'?'Return both supply cases to Scout Mara.':
    'Supplies delivered · Explore freely. Next missions are in development.';
  $('supplies').textContent=quest.collected+' / 2 cases · '+quest.credits+' credits';
}
refreshObjective();
let toastTimer=0;
function toast(message){
  $('toast').textContent=message;$('toast').classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4600);
}
function closestInteraction(){
  let best=null,dist=3.5;
  for(const o of interactables){
    if(o.used)continue;
    const d=Math.hypot(player.x-o.x,player.z-o.z);
    if(d<dist){dist=d;best=o;}
  }
  return best;
}
function interact(){
  const obj=closestInteraction();if(!obj)return;
  if(obj.type==='case'){
    obj.used=true;collected.add(obj.id);quest=collectCase(quest);
    for(const m of obj.meshes)m.visible=false;
    toast('Recovered one sealed supply case. '+quest.collected+' of 2 found.');
  }else if(!quest.started){
    quest=beginQuest(quest);
    toast('Scout Mara: Two medical cases went missing near the abandoned homes. Bring them back and I can pay you.');
  }else if(quest.collected>=2&&!quest.finished){
    quest=finishQuest(quest);
    toast('Scout Mara: That is everything. The settlement owes you. +20 trade credits.');
  }else if(quest.finished){
    toast('Scout Mara: Stay alert out there. Hearthguard patrols cannot be everywhere.');
  }else{
    toast('Scout Mara: Check the abandoned homes along the old road. Not every building has supplies.');
  }
  save();refreshObjective();
}
function setMenu(visible){
  $('menu').classList.toggle('hidden',!visible);
  $('startButton').textContent=gameStarted?'RESUME EXPLORING':'EXPLORE THE WOODLANDS';
}
controls.addEventListener('lock',()=>{gameStarted=true;setMenu(false);});
controls.addEventListener('unlock',()=>{keys.clear();setMenu(true);});
$('startButton').addEventListener('click',()=>controls.lock());
renderer.domElement.addEventListener('click',()=>{if(gameStarted&&!controls.isLocked)controls.lock();});
window.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.repeat&&['KeyE','KeyM'].includes(e.code))return;
  keys.add(e.code);
  if(e.code==='KeyE'&&controls.isLocked&&!showMap)interact();
  if(e.code==='KeyM'&&controls.isLocked){showMap=!showMap;$('map').classList.toggle('visible',showMap);}
  if(e.code==='Space'&&controls.isLocked&&!showMap&&player.jump===0)player.vertical=6.4;
});
window.addEventListener('keyup',e=>keys.delete(e.code));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&controls.isLocked)controls.unlock();});

function worldToMap(x,z){
  const s=600/WORLD;return {x:300+x*s,y:300+z*s};
}
// Map exploration is persistent: only nearby cells become visible.
const fogCanvas=document.createElement('canvas');
fogCanvas.width=600;fogCanvas.height=600;
const fogCtx=fogCanvas.getContext('2d');
function markExplored(){
  if(revealNearby(visited,player.x,player.z,fogGrid)){fogDirty=true;save();}
}
function rebuildFog(){
  fogCtx.globalCompositeOperation='source-over';
  fogCtx.clearRect(0,0,600,600);
  fogCtx.fillStyle='rgba(4,13,13,.99)';
  fogCtx.fillRect(0,0,600,600);
  fogCtx.globalCompositeOperation='destination-out';
  const cell=WORLD/fogGrid;
  for(const key of visited){
    const x=key%fogGrid,z=Math.floor(key/fogGrid);
    const p=worldToMap(-WORLD/2+(x+.5)*cell,-WORLD/2+(z+.5)*cell);
    const g=fogCtx.createRadialGradient(p.x,p.y,21,p.x,p.y,43);
    g.addColorStop(0,'rgba(0,0,0,1)');
    g.addColorStop(.7,'rgba(0,0,0,.94)');
    g.addColorStop(1,'rgba(0,0,0,0)');
    fogCtx.fillStyle=g;
    fogCtx.fillRect(p.x-43,p.y-43,86,86);
  }
  fogCtx.globalCompositeOperation='source-over';
  fogDirty=false;
}
function drawMap(){
  const ctx=$('mapCanvas').getContext('2d');ctx.clearRect(0,0,600,600);
  ctx.fillStyle='#1c3c31';ctx.fillRect(0,0,600,600);
  for(let i=0;i<100;i++){
    const x=(i*97%600),y=(i*211%600);
    ctx.fillStyle=i%2?'#28483a':'#335342';
    ctx.beginPath();ctx.arc(x,y,9+i%16,0,Math.PI*2);ctx.fill();
  }
  ctx.strokeStyle='#9a8869';ctx.lineWidth=7;ctx.lineCap='round';
  ctx.beginPath();trail.forEach(([x,z],i)=>{const p=worldToMap(x,z);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();
  const signs=[['H',LANDMARKS.camp],['C',LANDMARKS.cabin],['H',LANDMARKS.cottage],['F',LANDMARKS.farmhouse],['G',LANDMARKS.garage]];
  ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const [letter,p] of signs){
    const m=worldToMap(p.x,p.z);ctx.fillStyle='#e3d3a4';ctx.fillRect(m.x-13,m.y-13,26,26);
    ctx.fillStyle='#273a2f';ctx.fillText(letter,m.x,m.y+1);
  }
  if(fogDirty)rebuildFog();
  ctx.drawImage(fogCanvas,0,0);
  const p=worldToMap(player.x,player.z);
  ctx.fillStyle='#f3ba67';ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#fff4d0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,11,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#c6d3c8';ctx.font='bold 14px system-ui';ctx.fillText('N',300,18);
}
function updateClock(dt){
  dayPhase=(dayPhase+dt/560)%1;
  const angle=dayPhase*Math.PI*2;
  const sunHeight=Math.sin(angle);
  const light=Math.max(0,sunHeight);
  const nightBlend=1-Math.min(1,Math.max(0,(sunHeight+.11)/.55));
  scene.background.copy(daylightSky).lerp(nightSky,nightBlend);
  scene.fog.color.copy(scene.background);
  scene.fog.density=.0058+nightBlend*.0018;
  hemi.intensity=.52+light*1.9;
  sun.intensity=light*2.6;
  moon.intensity=.24+nightBlend*.85;
  sun.position.set(Math.cos(angle)*120,Math.max(5,sunHeight*145),90);
  let part='Night';
  if(dayPhase<.18)part='Morning';
  else if(dayPhase<.43)part='Daylight';
  else if(dayPhase<.58)part='Evening';
  else if(dayPhase<.78)part='Night';
  $('clock').textContent=part;
}
const direction=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3();
function updateMovement(dt){
  if(!controls.isLocked||showMap)return;
  const f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);
  const r=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
  controls.getDirection(forward);forward.y=0;forward.normalize();
  right.crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
  direction.copy(forward).multiplyScalar(f).addScaledVector(right,r);
  if(direction.lengthSq()>1)direction.normalize();
  const speed=keys.has('ShiftLeft')||keys.has('ShiftRight')?7.2:4.5;
  const dx=direction.x*speed*dt,dz=direction.z*speed*dt;
  const next=movePoint(player,dx,dz,solids,treeSolids);
  const oldGround=groundHeight(player.x,player.z),newGround=groundHeight(next.x,next.z);
  // Avoid walking up implausibly steep changes between frames.
  if(newGround-oldGround<.65||player.jump>.2){player.x=next.x;player.z=next.z;}
  player.vertical-=17*dt;
  player.jump=Math.max(0,player.jump+player.vertical*dt);
  if(player.jump===0)player.vertical=0;
  camera.position.set(player.x,groundHeight(player.x,player.z)+eye+player.jump,player.z);
}
function refreshInteraction(){
  const obj=closestInteraction();
  const p=$('interact');
  if(!obj||!controls.isLocked||showMap){p.style.display='none';return;}
  p.style.display='block';
  p.innerHTML='<strong>E</strong>'+obj.label;
}
let mapUpdate=0;
function tick(now){
  const dt=Math.min(.045,(now-last)/1000||0);last=now;
  updateClock(dt);updateMovement(dt);markExplored();refreshInteraction();
  if(showMap&&(mapUpdate+=dt)>.18){drawMap();mapUpdate=0;}
  renderer.render(scene,camera);requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
toast('Foundation 0.1 loaded. Talk to Scout Mara, or explore the forest.');