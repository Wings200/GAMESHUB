import * as pc from 'playcanvas';

// A deliberately separate test of an established engine's built-in systems.
// This does not import or replace the GAMESHUB/Three.js game engine.
const $=id=>document.getElementById(id);
const canvas=$('application');
const keys=new Set();
let app,player,avatar,crate,camera,ready=false,started=false,physicsReady=false;
let horizontalSpeed=0,jumpVelocity=0,jumpHeight=0,grounded=true,animation='Idle';
let facing=0,cameraYaw=0,cameraPitch=.15,cameraDistance=5.4;
let fps=0,frames=0,fpsTime=0,noticeTime=0,noticeText='';
const velocity=new pc.Vec3(),cameraPosition=new pc.Vec3(),lookTarget=new pc.Vec3();
const scratch=new pc.Vec3();

function fail(error){
  console.error('PlayCanvas foundation benchmark:',error);
  $('loadStatus').textContent=String(error?.message||error);
  $('errorMessage').textContent=String(error?.message||error);
  $('error').hidden=false;
  $('start').disabled=false;
  app?.destroy?.();
}
function message(value){
  noticeText=value;noticeTime=3;
  $('notice').textContent=value;
  $('notice').classList.add('show');
}
function material(hex,{metalness=0,gloss=.45,emissive=0}={}){
  const m=new pc.StandardMaterial();
  m.diffuse=new pc.Color().fromString(hex);
  m.metalness=metalness;
  m.useMetalness=metalness>0;
  m.gloss=gloss;
  if(emissive){
    m.emissive=new pc.Color().fromString(hex);
    m.emissiveIntensity=emissive;
  }
  m.update();
  return m;
}
function box(name,pos,size,mat,{collidable=false,mass=0}={}){
  const entity=new pc.Entity(name);
  entity.addComponent('render',{type:'box',material:mat,castShadows:true,receiveShadows:true});
  entity.setLocalScale(size[0],size[1],size[2]);
  entity.setPosition(pos[0],pos[1],pos[2]);
  if(collidable){
    entity.addComponent('collision',{type:'box',halfExtents:new pc.Vec3(
      size[0]/2,size[1]/2,size[2]/2)});
    entity.addComponent('rigidbody',{type:mass>0?'dynamic':'static',mass,
      friction:.65,restitution:.08});
  }
  app.root.addChild(entity);
  return entity;
}
function light(name,type,pos,color,intensity,{shadow=false,range=28}={}){
  const entity=new pc.Entity(name);
  entity.addComponent('light',{type,color:new pc.Color().fromString(color),intensity,
    range,castShadows:shadow,shadowResolution:1024,shadowBias:.14,
    normalOffsetBias:.03});
  entity.setPosition(...pos);
  app.root.addChild(entity);
  return entity;
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
  if(!avatar||animation===name)return;
  if(!avatar.anim.baseLayer.states.includes(name))return;
  animation=name;
  avatar.anim.baseLayer.transition(name,name==='Jump'?.11:.23);
  $('motion').textContent=name.toUpperCase();
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
  if(event.code==='Space'&&grounded){
    jumpVelocity=5.7;grounded=false;setAnimation('Jump');
  }
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
    cameraYaw-=(event.clientX-lastX)*.006;
    cameraPitch=pc.math.clamp(cameraPitch+(event.clientY-lastY)*.004,-.12,.65);
    lastX=event.clientX;lastY=event.clientY;
  });
}
function update(dt){
  if(!ready)return;
  dt=Math.min(dt,.05);
  const inputX=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  const inputZ=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));
  const magnitude=Math.hypot(inputX,inputZ)||1;
  const wantsRun=keys.has('ShiftLeft')||keys.has('ShiftRight');
  const targetSpeed=(inputX||inputZ)?(wantsRun?5.1:2.6):0;
  const smoothing=1-Math.exp(-dt*10);
  const sin=Math.sin(cameraYaw),cos=Math.cos(cameraYaw);
  const targetX=(inputX*cos-inputZ*sin)/magnitude*targetSpeed;
  const targetZ=(inputZ*cos+inputX*sin)/magnitude*targetSpeed;
  velocity.x+=(targetX-velocity.x)*smoothing;
  velocity.z+=(targetZ-velocity.z)*smoothing;
  horizontalSpeed=Math.hypot(velocity.x,velocity.z);

  const p=player.getPosition();
  const nx=pc.math.clamp(p.x+velocity.x*dt,-14.7,14.7);
  const nz=pc.math.clamp(p.z+velocity.z*dt,-14.7,14.7);
  if(!grounded){
    jumpVelocity-=15*dt;
    jumpHeight=Math.max(0,jumpHeight+jumpVelocity*dt);
    if(jumpHeight===0){grounded=true;jumpVelocity=0;}
  }
  player.setPosition(nx,jumpHeight,nz);
  if(horizontalSpeed>.18){
    const goalAngle=Math.atan2(velocity.x,-velocity.z)*180/Math.PI;
    const difference=((goalAngle-facing+540)%360)-180;
    facing+=difference*Math.min(1,dt*13);
    player.setEulerAngles(0,facing,0);
  }
  if(!grounded)setAnimation('Jump');
  else setAnimation(horizontalSpeed>3.7?'Run':horizontalSpeed>.15?'Walk':'Idle');
  if(avatar?.anim){
    // The old lab played a full walking cycle even at 0.5 m/s. Scale cadence
    // with actual travel speed to reduce visible foot skating on deceleration.
    avatar.anim.speed=grounded&&animation==='Walk'?
      pc.math.clamp(horizontalSpeed/2.6,.13,1.2):
      grounded&&animation==='Run'?pc.math.clamp(horizontalSpeed/5.1,.75,1.25):1;
  }
  const playerPos=player.getPosition();
  lookTarget.set(playerPos.x,playerPos.y+1.37,playerPos.z);
  const a=Math.cos(cameraPitch)*cameraDistance;
  scratch.set(playerPos.x+Math.sin(cameraYaw)*a,
    playerPos.y+2.45+Math.sin(cameraPitch)*cameraDistance,
    playerPos.z+Math.cos(cameraYaw)*a);
  cameraPosition.lerp(scratch,1-Math.exp(-dt*8));
  camera.setPosition(cameraPosition);
  camera.lookAt(lookTarget);

  frames++;fpsTime+=dt;
  if(fpsTime>=.6){fps=Math.round(frames/fpsTime);fpsTime=0;frames=0;}
  $('speed').textContent=horizontalSpeed.toFixed(1);
  $('fps').textContent=String(fps||'--');
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').classList.remove('show');}
}
async function initialize(){
  if(started)return;
  started=true;
  $('start').disabled=true;
  $('loadStatus').textContent='Loading PlayCanvas and rigid-body physics…';
  try{
    pc.WasmModule.setConfig('Ammo',{
      glueUrl:'https://developer.playcanvas.com/assets/modules/ammo/ammo.wasm.js',
      wasmUrl:'https://developer.playcanvas.com/assets/modules/ammo/ammo.wasm.wasm',
      fallbackUrl:'https://developer.playcanvas.com/assets/modules/ammo/ammo.js'
    });
    await Promise.race([
      new Promise(resolve=>pc.WasmModule.getInstance('Ammo',resolve)),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Ammo physics timed out')),22000))
    ]);
    physicsReady=true;
    const device=await pc.createGraphicsDevice(canvas,{deviceTypes:[pc.DEVICETYPE_WEBGL2]});
    const options=new pc.AppOptions();
    options.graphicsDevice=device;
    options.componentSystems=[pc.RenderComponentSystem,pc.CameraComponentSystem,
      pc.LightComponentSystem,pc.AnimComponentSystem,pc.CollisionComponentSystem,
      pc.RigidBodyComponentSystem];
    options.resourceHandlers=[pc.TextureHandler,pc.ContainerHandler];
    app=new pc.AppBase(canvas);
    app.init(options);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.start();
    window.addEventListener('resize',()=>app.resizeCanvas());
    buildEnvironment();
    player=new pc.Entity('PlayerController');
    player.setPosition(0,0,4.3);
    app.root.addChild(player);
    camera=new pc.Entity('ThirdPersonCamera');
    camera.addComponent('camera',{clearColor:new pc.Color(.043,.083,.12),farClip:120,
      nearClip:.08,fov:68});
    app.root.addChild(camera);
    cameraPosition.set(0,3.3,9.5);
    camera.setPosition(cameraPosition);

    $('loadStatus').textContent='Importing Quaternius human and authored clips…';
    const asset=new pc.Asset('Quaternius CC0 Human','container',{
      url:'./assets/quaternius-animated-human.glb'
    });
    app.assets.add(asset);
    await new Promise((resolve,reject)=>{
      asset.ready(()=>resolve());
      asset.on('error',error=>reject(error));
      app.assets.load(asset);
    });
    avatar=asset.resource.instantiateRenderEntity({castShadows:true});
    avatar.name='Animated Human';
    // The model's animation paths remain beneath this entity. The player
    // controller rotates and moves the parent independently of skeleton pose.
    player.addChild(avatar);
    avatar.setLocalEulerAngles(0,180,0);
    avatar.addComponent('anim',{activate:true});
    const imported=[];
    for(const clip of asset.resource.animations){
      const name=clip.resource.name;
      avatar.anim.assignAnimation(name,clip.resource,undefined,1,name!=='Jump');
      imported.push(name);
    }
    if(!imported.includes('Idle')||!imported.includes('Walk')||
      !imported.includes('Run')||!imported.includes('Jump'))
      throw new Error('The human model is missing required movement clips');
    avatar.anim.baseLayer.transition('Idle',0);
    animation='Idle';
    $('motion').textContent='IDLE';
    $('physics').textContent='PHYSICS: AMMO RIGID BODIES';
    bindInput();
    app.on('update',update);
    ready=true;
    $('launch').hidden=true;
    $('hud').hidden=false;
    $('controls').hidden=false;
    window.__pcBenchmark={
      get ready(){return ready;},get physicsReady(){return physicsReady;},
      get animation(){return animation;},get speed(){return horizontalSpeed;},
      get grounded(){return grounded;},get fps(){return fps;},
      get clips(){return imported;},app,player,avatar,crate,camera,
      pushCrate,playState:setAnimation,
      get crateVelocity(){return crate.rigidbody.linearVelocity.clone();}
    };
  }catch(error){fail(error);}
}
$('start').addEventListener('click',initialize);
