import * as pc from 'playcanvas';
import {PlayCanvasFoundation} from '../../engine/playcanvas-foundation.js';
import {PlayCanvasCharacterMotor,PlayCanvasOrbitFollowCamera}
  from '../../engine/playcanvas-character-controller.js';

// A deliberately separate test of an established engine's built-in systems.
// This does not import or replace the GAMESHUB/Three.js game engine.
const $=id=>document.getElementById(id);
const canvas=$('application');
const keys=new Set();
let foundation,app,player,avatar,crate,camera,motor,orbitCamera;
let ready=false,started=false,physicsReady=false;
let fps=0,frames=0,fpsTime=0,noticeTime=0,noticeText='';

function fail(error){
  console.error('PlayCanvas foundation benchmark:',error);
  $('loadStatus').textContent=String(error?.message||error);
  $('errorMessage').textContent=String(error?.message||error);
  $('error').hidden=false;
  $('start').disabled=false;
  started=false;
  foundation?.destroy();
}
function message(value){
  noticeText=value;noticeTime=3;
  $('notice').textContent=value;
  $('notice').classList.add('show');
}
function material(hex,{metalness=0,gloss=.45,emissive=0}={}){
  return foundation.material(hex,{metalness,gloss,emissive});
}
function box(name,pos,size,mat,{collidable=false,mass=0}={}){
  return foundation.box(name,pos,size,mat,{collidable,mass});
}
function light(name,type,pos,color,intensity,{shadow=false,range=28}={}){
  return foundation.light(name,type,pos,color,intensity,{shadow,range});
}
function buildEnvironment(){
  app.scene.ambientLight=new pc.Color(.26,.34,.44);
  app.scene.exposure=1.16;
  app.scene.toneMapping=pc.TONEMAP_ACES2;
  const floor=material('#647a82',{gloss:.21,metalness:.08});
  const steel=material('#172b38',{gloss:.47,metalness:.58});
  const dark=material('#13232d',{gloss:.29,metalness:.2});
  const accent=material('#e4ad6e',{gloss:.55,metalness:.32});
  const turquoise=material('#5cb9cb',{gloss:.4,emissive:.95});
  const amber=material('#f3b666',{gloss:.4,emissive:1.1});

  box('Physical floor',[0,-.2,0],[34,.4,34],floor,{collidable:true});
  // The stage is intentionally art-directed rather than a default gray grid.
  for(let n=-15;n<=15;n+=3){
    box('Inlaid line X',[n,.007,0],[.035,.012,30],steel);
    box('Inlaid line Z',[0,.009,n],[30,.012,.035],steel);
  }
  for(const x of [-16,16]){
    box('Side wall',[x,2,0],[.6,4,34],dark);
    box('Wall light rail',[x>0?15.63:-15.63,2.8,0],[.06,.05,29],turquoise);
  }
  box('Back wall',[0,3,-16],[33,6,.7],dark);
  box('Back header',[0,4.2,-15.5],[15,.18,.22],amber);
  box('Front low wall',[0,.65,16],[33,1.3,.7],steel);
  for(const x of [-10,-5,5,10]){
    box('Monolith base',[x,.55,-9.3],[1.5,1.1,1.5],steel);
    box('Monolith edge',[x,1.12,-9.3],[1.7,.08,1.7],accent);
    box('Monolith lamp',[x,1.22,-9.3],[1.05,.04,1.05],turquoise);
  }
  box('Raised presentation platform',[0,.25,-9],[7,.5,5],steel,{collidable:true});
  box('Platform illuminated edge',[0,.54,-6.55],[7.1,.06,.09],amber);
  box('Interaction kiosk',[4,.73,-1.6],[1.7,1.46,1.1],steel,{collidable:true});
  box('Kiosk screen',[4,1.11,-1.02],[1.35,.7,.06],turquoise);
  crate=box('Physical impulse crate',[0,.85,-2.8],[1.1,1.1,1.1],accent,
    {collidable:true,mass:12});

  const sun=light('Key directional sun','directional',[-6,12,8],'#fff2d8',2.55,
    {shadow:true});
  sun.setEulerAngles(49,28,0);
  light('Cool rim','omni',[7,4,-5],'#63aacc',13,{range:16});
  light('Warm entry','omni',[-6,3,6],'#e9ad6f',9,{range:13});
}
function setAnimation(name){
  motor?.forceState(name);
}
function playerNearCrate(){
  if(!crate||!player)return false;
  const a=player.getPosition(),b=crate.getPosition();
  return Math.hypot(a.x-b.x,a.z-b.z)<3.0;
}
function pushCrate(){
  if(!physicsReady||!crate?.rigidbody){message('Physics not available.');return false;}
  if(!playerNearCrate()){message('Move near the gold crate, then press E.');return false;}
  const a=player.getPosition(),b=crate.getPosition();
  let dx=b.x-a.x,dz=b.z-a.z;
  const distance=Math.hypot(dx,dz)||1;
  dx/=distance;dz/=distance;
  crate.rigidbody.applyImpulse(dx*19,5,dz*19);
  message('Impulse applied by Ammo rigid-body physics.');
  return true;
}
function onKeyDown(event){
  if(!ready)return;
  if(['INPUT','SELECT','TEXTAREA'].includes(event.target?.tagName))return;
  if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space','KeyE'].includes(event.code))
    event.preventDefault();
  keys.add(event.code);
  if(event.repeat)return;
  if(event.code==='Space')motor?.requestJump();
  if(event.code==='KeyE')pushCrate();
}
function bindInput(){
  window.addEventListener('keydown',onKeyDown);
  window.addEventListener('keyup',event=>keys.delete(event.code));
  window.addEventListener('blur',()=>keys.clear());
  let dragging=false,lastX=0,lastY=0;
  canvas.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    dragging=true;lastX=event.clientX;lastY=event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointerup',()=>dragging=false);
  canvas.addEventListener('pointermove',event=>{
    if(!dragging)return;
    orbitCamera?.orbit(event.clientX-lastX,event.clientY-lastY);
    lastX=event.clientX;lastY=event.clientY;
  });
}
function update(dt){
  if(!ready)return;
  dt=Math.min(dt,.05);
  const inputX=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  const inputZ=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
  const wantsRun=keys.has('ShiftLeft')||keys.has('ShiftRight');
  motor.setInput({x:inputX,z:inputZ,run:wantsRun,cameraYaw:orbitCamera.yaw});
  motor.update(dt);
  orbitCamera.update(dt);

  frames++;fpsTime+=dt;
  if(fpsTime>=.6){fps=Math.round(frames/fpsTime);fpsTime=0;frames=0;}
  $('speed').textContent=motor.speed.toFixed(1);
  $('fps').textContent=String(fps||'--');
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').classList.remove('show');}
}
async function initialize(){
  if(started)return;
  started=true;
  $('start').disabled=true;
  $('loadStatus').textContent='Loading PlayCanvas and rigid-body physics…';
  try{
    foundation=await PlayCanvasFoundation.create(canvas,{physics:true});
    app=foundation.app;
    physicsReady=foundation.physicsReady;
    buildEnvironment();
    player=new pc.Entity('PlayerController');
    player.setPosition(0,0,4.3);
    app.root.addChild(player);
    camera=foundation.camera('ThirdPersonCamera');
    camera.setPosition(0,3.3,9.5);

    $('loadStatus').textContent='Importing Quaternius human and authored clips…';
    const {model,anchor:visualRoot,clipNames:imported}=await foundation.animatedModel(
      './assets/quaternius-animated-human.glb',{
        name:'Animated Human',parent:player,scale:.34,yaw:-90,
        requiredClips:['Idle','Walk','Run','Jump'],initialClip:'Idle'
      });
    avatar=model;
    motor=new PlayCanvasCharacterMotor({entity:player,avatar});
    motor.onStateChange=state=>{$('motion').textContent=state.toUpperCase();};
    orbitCamera=new PlayCanvasOrbitFollowCamera({camera,target:player});
    $('motion').textContent='IDLE';
    $('physics').textContent='PHYSICS: AMMO RIGID BODIES';
    bindInput();
    foundation.onUpdate(update);
    ready=true;
    $('launch').hidden=true;
    $('hud').hidden=false;
    $('controls').hidden=false;
    window.__pcBenchmark={
      get ready(){return ready;},get physicsReady(){return physicsReady;},
      get animation(){return motor.state;},get speed(){return motor.speed;},
      get grounded(){return motor.grounded;},get fps(){return fps;},
      get clips(){return imported;},foundation,app,player,avatar,crate,camera,
      motor,orbitCamera,pushCrate,playState:setAnimation,visualRoot,
      get crateVelocity(){return crate.rigidbody.linearVelocity.clone();}
    };
  }catch(error){fail(error);}
}
$('start').addEventListener('click',initialize);
