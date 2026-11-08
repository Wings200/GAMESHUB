import {
  THREE,GameEngine,EngineAudio,createGameSession,FootstepSequencer
} from '../../engine/index.js';
import {createTrainingCharacter,createFirstPersonViewModel} from './character-rig.js';

const $=id=>document.getElementById(id);
let engine=null,session=null,audio=null;
let avatar=null,showcase=null,viewModel=null;
let thirdCamera=null,mode='third',launched=false,sceneReady=false;
let lastStepPosition=new THREE.Vector3(),stepSequencer=null;
let consoleActive=false,toastTimeout=0;
const owned=[];
const spawn={x:0,y:1.72,z:8};

function notify(message){
  const toast=$('toast');
  toast.textContent=message;
  toast.hidden=false;
  clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>{toast.hidden=true;},2300);
}
function fail(error){
  console.error('Character Animation Lab failed:',error);
  $('launch').hidden=true;
  $('hud').hidden=true;
  $('readout').hidden=true;
  $('actions').hidden=true;
  $('controls').hidden=true;
  $('errorMessage').textContent=error?.message||'Could not initialize the browser renderer.';
  $('error').hidden=false;
  cleanup();
}
function cleanup(){
  sceneReady=false;
  clearTimeout(toastTimeout);
  session?.dispose();
  session=null;
  avatar?.dispose();showcase?.dispose();viewModel?.dispose();
  avatar=null;showcase=null;viewModel=null;
  for(const disposable of owned.splice(0))disposable.dispose?.();
  audio?.dispose();audio=null;
  engine?.dispose();engine=null;
  launched=false;
}
function makeRoom(){
  const world=session.world;
  engine.scene.background=new THREE.Color('#17232b');
  engine.scene.fog=new THREE.Fog('#17232b',30,90);
  const sky=new THREE.HemisphereLight('#d6e7ef','#252d34',1.9);
  engine.scene.add(sky);owned.push({dispose:()=>sky.removeFromParent()});

  const mat={
    ground:'concrete-poured-gray',metal:'metal-brushed-steel',
    brick:'brick-red-clay',wood:'wood-light-oak'
  };
  const add=(id,size,position,material,options={})=>
    world.addMesh({id,geometry:'box',size:{x:size[0],y:size[1],z:size[2]},
      position:{x:position[0],y:position[1],z:position[2]},
      material,collidable:options.collidable===true,
      castShadow:options.castShadow!==false});

  // Everything structural uses the real world/material/collision API.
  add('training-floor',[24,.3,29],[0,-.15,-2],mat.ground,{collidable:true,castShadow:false});
  add('far-wall',[24,6,.35],[0,3,-16.5],mat.brick,{collidable:true});
  add('west-wall',[.35,6,29],[-12,3,-2],mat.metal,{collidable:true});
  add('east-wall',[.35,6,29],[12,3,-2],mat.metal,{collidable:true});
  add('front-wall',[24,6,.35],[0,3,12.4],mat.brick,{collidable:true});
  add('left-platform',[4,.64,4],[-6.5,.32,-6],mat.metal,{collidable:true});
  add('step-one',[2.15,.23,2.2],[-3.45,.115,-6],mat.ground,{collidable:true});
  add('platform-stripe',[3.6,.035,.18],[-6.5,.66,-4.1],mat.wood);
  add('console-pedestal',[1.55,1.05,.8],[3.7,.525,-4.95],mat.metal,{collidable:true});
  add('console-screen',[1.27,.7,.105],[3.7,1.36,-5.17],mat.metal);
  add('showcase-stage',[4,.28,4],[6.8,.14,-10.15],mat.metal,{collidable:true});
  add('showcase-stripe',[3.6,.055,.13],[6.8,.33,-8.35],mat.wood);
  add('partition',[.3,2.8,3.5],[-9.15,1.4,1.2],mat.brick,{collidable:true});
  add('range-cube',[1.6,1,1.6],[-7,.5,4],mat.metal,{collidable:true});
  add('far-bench',[4,.18,.85],[-.5,.6,-12],mat.wood);
  for(let i=0;i<5;i++){
    const x=-10.5+i*5.25;
    add('ceiling-girder-'+i,[.18,.16,27],[x,5.72,-2],mat.metal);
  }
  for(const x of [-10.4,10.4]){
    for(const z of [-13,-5,3,10]){
      const name='edge-column-'+(x<0?'W':'E')+'-'+(z+20);
      add(name,[.42,5.7,.42],[x,2.85,z],mat.metal,{collidable:true});
    }
  }

  const grid=new THREE.GridHelper(23.3,24,0x50646b,0x35434a);
  grid.position.set(0,.015,-2);grid.material.transparent=true;
  grid.material.opacity=.23;engine.scene.add(grid);
  owned.push({dispose:()=>{grid.removeFromParent();grid.geometry.dispose();grid.material.dispose();}});

  world.addLight({id:'overhead-A',kind:'spot',position:{x:-5,y:5.3,z:1},
    target:{x:-5,y:0,z:1},color:'#e8f4ec',intensity:56,distance:15,
    angle:.8,penumbra:.8,decay:2,castShadow:true,shadowSize:1024,
    visibleSource:true,sourceRadius:.14});
  world.addLight({id:'overhead-B',kind:'spot',position:{x:4,y:5.3,z:-6},
    target:{x:4,y:0,z:-6},color:'#d9ecf2',intensity:59,distance:16,
    angle:.82,penumbra:.75,decay:2,castShadow:true,shadowSize:1024,
    visibleSource:true,sourceRadius:.14});
  world.addLight({id:'backlight',kind:'spot',position:{x:0,y:5.1,z:-13},
    target:{x:0,y:0,z:-11},color:'#e6cba1',intensity:30,distance:11,
    angle:.65,penumbra:.8,decay:2,visibleSource:true,sourceRadius:.14});
  world.addLight({id:'console-light',kind:'point',position:{x:3.7,y:1.9,z:-5},
    color:'#72c2d1',intensity:5,distance:4,visibleSource:true,sourceRadius:.065,
    effect:{type:'pulse',frequency:.55,amount:.12}});
  world.addLight({id:'stage-light',kind:'spot',position:{x:7,y:5.2,z:-9.9},
    target:{x:7,y:0,z:-9.9},color:'#f5cda9',intensity:35,distance:12,
    angle:.6,penumbra:.8,visibleSource:true,sourceRadius:.1});

  // Signage is ordinary Three.js presentation geometry; structural assets
  // are authored through GameWorld so collision and materials remain shared.
  function sign(name,lines,position,size=[4.5,.95],color='#c9e3e5'){
    const canvas=document.createElement('canvas');
    canvas.width=1024;canvas.height=256;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#172730';ctx.fillRect(0,0,1024,256);
    ctx.fillStyle='#6b99a4';ctx.fillRect(29,25,5,202);
    ctx.fillStyle=color;ctx.font='800 68px system-ui';
    ctx.fillText(lines[0],59,105,905);
    ctx.fillStyle='#829eaa';ctx.font='600 33px system-ui';
    ctx.fillText(lines[1]||'',61,171,905);
    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});
    const geometry=new THREE.PlaneGeometry(...size);
    const mesh=new THREE.Mesh(geometry,material);
    mesh.name=name;mesh.position.set(...position);
    engine.scene.add(mesh);
    owned.push({dispose:()=>{mesh.removeFromParent();geometry.dispose();material.dispose();tex.dispose();}});
  }
  sign('Main room sign',['CHARACTER MOTION','GAIT  /  INTERACTIONS  /  CAMERA'],[0,3.35,-16.2],[7.3,1.6]);
  sign('Platform sign',['VERTICAL MOVEMENT','SPACE TO JUMP / REAL Y COLLISION'],[-6.5,2.35,-16.17],[4.5,1.05]);
  sign('Console screen',['INTERACTION BAY','PRESS E NEAR CONSOLE'],[3.7,1.39,-5.25],[1.05,.58],'#7ce9ef');
  sign('Showcase placard',['ANIMATION TARGET','NPC STATE MACHINE / VIEW'],[6.8,2.5,-16.18],[4.3,1]);
}
function addCharacters(){
  avatar=createTrainingCharacter({variant:'pilot'});
  engine.scene.add(avatar.root);
  avatar.animator=session.addAnimator('player',avatar.root,avatar.clips,{
    followControls:true,fadeSeconds:.17
  });
  showcase=createTrainingCharacter({variant:'showcase'});
  engine.scene.add(showcase.root);
  showcase.root.position.set(6.8,.28,-10.15);
  showcase.animator=session.addAnimator('showcase',showcase.root,showcase.clips,{
    fadeSeconds:.22
  });
  showcase.animator.playLoop('idle');

  engine.scene.add(engine.camera);
  viewModel=createFirstPersonViewModel(engine.camera);
  viewModel.animator=session.addAnimator('viewmodel',viewModel.root,viewModel.clips,{
    followControls:true,fadeSeconds:.12
  });
  thirdCamera=new THREE.PerspectiveCamera(
    engine.camera.fov,engine.camera.aspect,engine.camera.near,engine.camera.far
  );
  engine.setRenderCamera(thirdCamera);
  lastStepPosition.copy(engine.camera.position);
}
async function initAudio(){
  audio=new EngineAudio();
  // Audio unlock is attempted from the real start button gesture.
  const unlocked=await audio.unlock().catch(()=>false);
  if(!unlocked)return;
  const recordings=await Promise.allSettled(Array.from({length:5},(_,i)=>
    audio.loadClip('footstep-concrete-'+i,
      new URL('./assets/audio/footstep_concrete_'+String(i).padStart(3,'0')+'.ogg',import.meta.url)
    )
  ));
  const loaded=recordings.filter(x=>x.status==='fulfilled').length;
  if(loaded<5)console.warn('Recorded footsteps available:',loaded,'of 5');
  audio.setFootstepMix(.42);
}
function setMode(next){
  if(!engine)return;
  mode=next==='first'?'first':'third';
  engine.setRenderCamera(mode==='first'?engine.camera:thirdCamera);
  avatar.root.visible=mode!=='first';
  viewModel.root.visible=mode==='first';
  $('modeButton').innerHTML=mode==='first'?'FIRST PERSON <kbd>V</kbd>':'THIRD PERSON <kbd>V</kbd>';
  $('viewLabel').textContent=mode==='first'?'FIRST PERSON':'THIRD PERSON';
  $('crosshair').hidden=mode!=='first';
}
function changeMode(){setMode(mode==='first'?'third':'first');}
function interact(){
  if(!sceneReady)return;
  avatar.animator.playOnce('interact');
  viewModel.animator.playOnce('interact');
  const p=engine.camera.position;
  const near=Math.hypot(p.x-3.7,p.z+4.95)<3.1;
  if(near){
    consoleActive=!consoleActive;
    session.world.setLight('console-light',{
      color:consoleActive?'#f5bb70':'#72c2d1',
      intensity:consoleActive?12:5,
      effect:{type:consoleActive?'flicker':'pulse',frequency:1.4,amount:.18,seed:3}
    });
    notify(consoleActive?'TRAINING CONSOLE ACTIVATED':'TRAINING CONSOLE STANDBY');
  }else notify('INTERACTION ANIMATION · PLAYING');
  audio?.tone({frequency:360,endFrequency:510,duration:.12,volume:.035});
}
function reload(){
  if(!sceneReady)return;
  avatar.animator.playOnce('reload');
  viewModel.animator.playOnce('reload');
  notify('TOOL RELOAD ANIMATION · PLAYING');
  audio?.tone({frequency:175,endFrequency:110,duration:.14,volume:.025});
}
function reset(){
  if(!sceneReady)return;
  session.controls.camera.position.set(spawn.x,spawn.y,spawn.z);
  session.controls.camera.rotation.set(0,0,0);
  session.controls.yaw=0;session.controls.pitch=0;
  session.controls.velocity.set(0,0,0);
  session.controls.verticalSpeed=0;
  lastStepPosition.copy(session.controls.camera.position);
  avatar.root.position.set(0,0,spawn.z);
  avatar.root.rotation.y=0;
  notify('POSITION RESET');
}
function updateScene(dt,elapsed){
  const controls=session.controls;
  const player=engine.camera.position;
  avatar.root.position.set(player.x,player.y-controls.eyeHeight,player.z);
  avatar.root.rotation.y=controls.yaw;

  // A second actor provides an independent NPC animation check.
  if(showcase.animator.oneShot===null && Math.sin(elapsed*.28)>.95)
    showcase.animator.setLocomotion({speed:1.4,grounded:true});
  else if(showcase.animator.oneShot===null)
    showcase.animator.setLocomotion({speed:0,grounded:true});

  if(mode==='third'){
    const forward=new THREE.Vector3();
    engine.camera.getWorldDirection(forward);
    const target=new THREE.Vector3(player.x,player.y-.22,player.z);
    const desired=target.clone().addScaledVector(forward,-4.2).add(
      new THREE.Vector3(0,1.13,0)
    );
    // Avoid the third-person camera travelling through solid lab walls.
    const direction=desired.clone().sub(target);
    const distance=direction.length();
    direction.normalize();
    const ray=new THREE.Raycaster(target,direction,.1,distance);
    const collidable=[...session.world.items.values()]
      .filter(item=>item.collider).map(item=>item.node);
    const hit=ray.intersectObjects(collidable,false)[0];
    if(hit)desired.copy(target).addScaledVector(direction,
      Math.max(.5,hit.distance-.28));
    if(thirdCamera.position.lengthSq()===0)thirdCamera.position.copy(desired);
    const blend=1-Math.exp(-11*Math.max(0,dt));
    thirdCamera.position.lerp(desired,blend);
    thirdCamera.lookAt(target);
    thirdCamera.updateMatrixWorld(true);
  }

  const distance=Math.hypot(player.x-lastStepPosition.x,player.z-lastStepPosition.z);
  if(stepSequencer){
    stepSequencer.advance({
      distance,grounded:controls.grounded,
      running:controls.keys.has('ShiftLeft')||controls.keys.has('ShiftRight'),
      enabled:controls.enabled&&!!audio&&!audio.muted
    });
  }
  lastStepPosition.copy(player);
  $('state').firstChild.textContent=(avatar.animator.active||'idle').toUpperCase()+' ';
  const speed=Math.hypot(controls.velocity.x,controls.velocity.z);
  $('speed').textContent=speed.toFixed(1)+' m/s';
  $('speedBar').style.width=Math.min(100,100*speed/controls.runSpeed)+'%';
  $('grounded').textContent=controls.grounded?'GROUNDED':'AIRBORNE';
  $('nearPrompt').hidden=Math.hypot(player.x-3.7,player.z+4.95)>=3.1;
}
function onKey(event){
  if(!sceneReady || event.repeat)return;
  const node=event.target;
  if(['INPUT','TEXTAREA','SELECT'].includes(node?.tagName)||node?.isContentEditable)return;
  if(event.code==='KeyV'){event.preventDefault();changeMode();}
  if(event.code==='KeyE'){event.preventDefault();interact();}
  if(event.code==='KeyR'){event.preventDefault();reload();}
  if(event.code==='Home'){event.preventDefault();reset();}
}
function installEvents(){
  $('modeButton').addEventListener('click',changeMode);
  $('interactButton').addEventListener('click',interact);
  $('reloadButton').addEventListener('click',reload);
  $('resetButton').addEventListener('click',reset);
  $('quality').addEventListener('change',()=>{
    session.setQuality($('quality').value);
    $('qualityLabel').textContent=$('quality').value.toUpperCase();
  });
  document.addEventListener('keydown',onKey);
}
async function start(){
  if(launched)return;
  launched=true;
  $('launchButton').disabled=true;
  try{
    engine=new GameEngine($('game'),{fov:73});
    engine.camera.far=120;
    engine.camera.updateProjectionMatrix();
    engine.setQuality('balanced');
    engine.camera.position.set(spawn.x,spawn.y,spawn.z);
    // EngineAudio is initialized without holding up the renderer if a
    // browser blocks playback or a recording is temporarily unavailable.
    const audioSetup=initAudio().catch(error=>console.warn('Audio unavailable:',error));
    session=createGameSession(engine,{
      audio:null,controls:{
        walkSpeed:4.1,runSpeed:7.2,eyeHeight:1.72,
        bounds:{minX:-11.45,maxX:11.45,minZ:-15.95,maxZ:11.85}
      }
    });
    makeRoom();
    addCharacters();
    setMode('third');
    stepSequencer=new FootstepSequencer(event=>audio?.footstep(event));
    session.world.addSound({id:'lab-speaker',clip:'footstep-concrete-0',
      position:{x:3.7,y:1.6,z:-5.2},spatial:true,bus:'sfx',volume:.13});
    engine.onFrame(updateScene);
    installEvents();
    $('launch').hidden=true;
    for(const id of ['hud','readout','actions','controls'])$(id).hidden=false;
    sceneReady=true;
    engine.start();
    window.__characterLab={
      get ready(){return sceneReady;},
      get engine(){return engine;},
      get session(){return session;},
      get avatar(){return avatar;},
      get viewModel(){return viewModel;},
      get mode(){return mode;},
      switchMode:changeMode,interact,reload,reset,
      setQuality(value){$('quality').value=value;$('quality').dispatchEvent(new Event('change'));}
    };
    // Audio loading continues while gameplay is already responsive.
    void audioSetup;
  }catch(error){fail(error);}
}
$('launchButton').addEventListener('click',start);
$('retryButton').addEventListener('click',()=>location.reload());
window.addEventListener('pagehide',cleanup,{once:true});
