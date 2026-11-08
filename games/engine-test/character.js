import {THREE,GameEngine,createGameSession,loadCharacterAsset} from '../../engine/index.js';
import {createDiagnosticCharacter,createFirstPersonHands} from './character-rig.js';

const $=id=>document.getElementById(id);
let engine=null,session=null,character=null,viewAnimator=null,animator=null;
let characterAsset=null,characterSource='diagnostic',loadWarning='';
let viewRig=null,thirdCamera=null,mode='third',started=false,actionCount=0;
let lastHudAt=0,consoleNear=false,disposed=false,wasGrounded=true;
const eventCleanups=[];
const stageObjects=[];
const scratch=new THREE.Vector3();
const cameraRay=new THREE.Ray(),cameraBox=new THREE.Box3();
const cameraHit=new THREE.Vector3(),cameraTarget=new THREE.Vector3();
const cameraGoal=new THREE.Vector3(),cameraDirection=new THREE.Vector3();

function failure(error){
  console.error('Character animation test failed:',error);
  $('launch').hidden=true;
  $('status').hidden=false;
  $('errorText').textContent=error?.message||'Could not initialize the WebGL renderer.';
  cleanup();
}

function mesh(name,geometry,material,position,cast=true){
  const item=new THREE.Mesh(geometry,material);
  item.name=name;
  item.position.set(...position);
  item.castShadow=cast;
  item.receiveShadow=true;
  engine.scene.add(item);
  stageObjects.push(item);
  return item;
}
function makeLabel(text,{color='#f2c18b',background='#17252d'}={}){
  const canvas=document.createElement('canvas');
  canvas.width=600;canvas.height=130;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle=color;ctx.font='800 33px system-ui, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,300,65,548);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false});
  const geo=new THREE.PlaneGeometry(3.8,.83);
  const sign=mesh('Lab label '+text,geo,mat,[0,3,0],false);
  return sign;
}
function buildRoom(){
  engine.scene.background=new THREE.Color('#15222d');
  engine.scene.fog=new THREE.FogExp2('#15222d',.017);
  engine.scene.add(new THREE.HemisphereLight(0xe2edff,0x263a42,1.85));
  const ambient=new THREE.AmbientLight('#d2e4ef',.21);
  engine.scene.add(ambient);
  // Existing GameWorld material + collision API: a floor, safe perimeter,
  // and jumpable platforms, all shared by the actual player controls.
  const world=session.world;
  const concrete={id:'concrete-poured-gray',settings:{repeat:.7,detailStrength:.72}};
  const steel={id:'metal-brushed-steel',settings:{repeat:.65,detailStrength:.55}};
  world.addMesh({id:'arena-floor',type:'mesh',geometry:'box',
    size:{x:36,y:.35,z:36},position:{x:0,y:-.175,z:0},
    material:concrete,collidable:true,castShadow:false});
  for(const [id,position,size] of [
    ['perimeter-left',[-18,2.5,0],[.5,5,36]],
    ['perimeter-right',[18,2.5,0],[.5,5,36]],
    ['perimeter-back',[0,2.5,-18],[36,5,.5]],
    ['perimeter-front',[0,2.5,18],[36,5,.5]]
  ]){
    world.addMesh({id,geometry:'box',size:{x:size[0],y:size[1],z:size[2]},
      position:{x:position[0],y:position[1],z:position[2]},material:steel,
      collidable:true});
  }
  for(const [id,pos,dimensions] of [
    ['step-one',[6,.15,-5.4],[3,.3,3.2]],
    ['step-two',[6,.42,-8.3],[3,.84,3.2]],
    ['platform',[6,.85,-11.2],[3,1.7,3.2]]
  ]){
    world.addMesh({id,geometry:'box',
      size:{x:dimensions[0],y:dimensions[1],z:dimensions[2]},
      position:{x:pos[0],y:pos[1],z:pos[2]},material:concrete,collidable:true});
  }
  world.addLight({id:'key-light',kind:'spot',
    position:{x:-3,y:7,z:-1},target:{x:0,y:0,z:0},
    color:'#fff0da',intensity:65,distance:28,angle:.7,penumbra:.7,
    castShadow:true,visibleSource:true,sourceRadius:.19,shadowSize:1024});
  world.addLight({id:'back-light',kind:'spot',
    position:{x:9,y:6,z:-8},target:{x:5,y:0,z:-7},
    color:'#8dbed8',intensity:51,distance:23,angle:.77,penumbra:.75,
    castShadow:false,visibleSource:true,sourceRadius:.16});
  world.addLight({id:'accent-light',kind:'point',
    position:{x:0,y:2.3,z:-5},color:'#ecb372',intensity:7.5,distance:8,
    visibleSource:true,sourceRadius:.07});
  const grid=new THREE.GridHelper(35,35,0x586b77,0x344652);
  grid.position.y=.019;engine.scene.add(grid);stageObjects.push(grid);
  const deck=new THREE.MeshStandardMaterial({color:'#24343f',metalness:.46,roughness:.65});
  const amber=new THREE.MeshStandardMaterial({color:'#d9a567',emissive:'#8b4c22',
    emissiveIntensity:.4,metalness:.52,roughness:.47});
  const lamp=new THREE.MeshBasicMaterial({color:'#9de3eb',toneMapped:false});
  const station=mesh('Interaction console',
    new THREE.BoxGeometry(1.75,1.08,.8),deck,[0,.54,-4.9]);
  mesh('Console display',
    new THREE.BoxGeometry(1.4,.63,.045),lamp,[0,.74,-4.46],false);
  mesh('Console accent',
    new THREE.BoxGeometry(1.83,.07,.9),amber,[0,1.11,-4.9],false);
  // Physical AABB for console, matching the decorative proxy's dimensions.
  world.addMesh({id:'interaction-console-collider',geometry:'box',
    size:{x:1.75,y:1.08,z:.8},position:{x:0,y:.54,z:-4.9},
    material:steel,collidable:true});
  // Hide only the collidable proxy visually; the real decorative console is
  // the same size and the real collision resolver still sees its AABB.
  world.get('interaction-console-collider').visible=false;
  const sign=makeLabel('E  •  INTERACT / R  •  RELOAD');
  sign.position.set(0,2.2,-5.05);
  const stripeMat=new THREE.MeshBasicMaterial({color:'#b78a56',toneMapped:false});
  for(let x of [-12,-6,0,6,12]){
    const strip=mesh('Training lane mark',new THREE.BoxGeometry(.055,.012,7.5),
      stripeMat,[x,.023,9],false);
    strip.castShadow=false;
  }
  // Visible jump-test route sign.
  const jumpLabel=makeLabel('JUMP / LANDING TEST',{color:'#addde6'});
  jumpLabel.position.set(6,2.85,-12.9);
  jumpLabel.scale.set(.72,.72,.72);
  // Keep a reference to decorative objects for lifecycle cleanup.
  return station;
}

function switchView(next){
  if(!started||!['first','third'].includes(next))return;
  mode=next;
  engine.renderCamera=mode==='third'?thirdCamera:null;
  character.root.visible=mode==='third';
  viewRig.visible=mode==='first';
  $('reticle').hidden=mode!=='first';
  $('thirdPerson').classList.toggle('selected',mode==='third');
  $('firstPerson').classList.toggle('selected',mode==='first');
  $('thirdPerson').setAttribute('aria-pressed',String(mode==='third'));
  $('firstPerson').setAttribute('aria-pressed',String(mode==='first'));
  engine.resize();
  $('feedback').textContent=mode==='third'?'Third-person: inspect full-body poses.':
    'First-person: inspect arm motion and action timing.';
}

function setCharacterSource(source){
  if(!['authored','diagnostic'].includes(source))return false;
  if(source==='authored'&&!characterAsset)return false;
  // A swap is a new actor state, not a continuation of a one-shot action
  // from the previous rig. Clear the first-person overlay action too.
  viewAnimator?.stop();
  if(animator){session.removeAnimator('lab-character');animator=null;}
  character?.dispose();
  character=source==='authored'?
    characterAsset.createInstance({height:1.85,heading:Math.PI}):
    createDiagnosticCharacter();
  characterSource=source;
  engine.scene.add(character.root);
  character.root.visible=mode==='third';
  animator=session.addAnimator('lab-character',character.root,character.clips,{
    followControls:true,fadeSeconds:source==='authored'?0.2:0.19,runThreshold:3.8,
    // Match in-place authored stride cycles to the lab's physical speeds.
    locomotionRates:source==='authored'?{walk:1.55,run:1.8}:{}
  });
  $('characterSource').value=source;
  $('reloadButton').disabled=!animator.has('reload');
  $('feedback').textContent=source==='authored'?
    'Authored skeletal clips loaded. This sample has no reload animation.':
    'Original diagnostic rig loaded for comparison.';
  return true;
}

function triggerAction(kind){
  if(!started||!['reload','interact'].includes(kind))return false;
  if(!animator.has(kind)){
    $('feedback').textContent='This character has no authored '+kind+
      ' clip. Switch to the diagnostic rig or import a matching animation.';
    return false;
  }
  if(animator.oneShot || viewAnimator.oneShot){
    $('feedback').textContent='Wait for the current animation to finish.';
    return false;
  }
  actionCount++;
  animator.playOnce(kind,{
    onFinish:()=>{$('feedback').textContent=kind==='reload'?
      'Reload completed — returned to movement.':
      'Interaction completed — returned to movement.';}
  });
  viewAnimator.playOnce(kind);
  $('feedback').textContent=kind==='reload'?'Reload animation playing…':
    'Interaction animation playing…';
  return true;
}
function onKeyDown(event){
  if(!started||event.repeat)return;
  const tag=event.target?.tagName;
  if(['INPUT','TEXTAREA','SELECT'].includes(tag)||event.target?.isContentEditable)return;
  if(event.code==='KeyV'){event.preventDefault();switchView(mode==='third'?'first':'third');}
  if(event.code==='KeyR'){event.preventDefault();triggerAction('reload');}
  if(event.code==='KeyE'){
    event.preventDefault();
    if(consoleNear)triggerAction('interact');
    else $('feedback').textContent='Approach the glowing console to interact, or use the panel button.';
  }
}

function syncView(dt){
  if(!started)return;
  const controls=session.controls,camera=engine.camera;
  // Ground contact drives a short recoverable landing clip. The old room
  // jumped immediately from a frozen fall pose into idle, which snapped.
  if(!wasGrounded && controls.grounded && animator.has('land') &&
    !animator.oneShot && !viewAnimator.oneShot){
    animator.playOnce('land',{fade:.085});
    viewAnimator.playOnce('land',{fade:.085});
  }
  wasGrounded=controls.grounded;
  const feetY=camera.position.y-controls.eyeHeight;
  character.root.position.set(camera.position.x,feetY,camera.position.z);
  character.root.rotation.y=controls.yaw;
  cameraTarget.set(camera.position.x,camera.position.y-.24,camera.position.z);
  const behind=3.35;
  cameraGoal.set(
    camera.position.x+Math.sin(controls.yaw)*behind,
    camera.position.y+.35-Math.sin(controls.pitch)*.32,
    camera.position.z+Math.cos(controls.yaw)*behind
  );
  // Keep the chase camera in front of solid geometry; previously it passed
  // through the room perimeter and jump platforms while the player moved.
  cameraDirection.subVectors(cameraGoal,cameraTarget);
  let distance=cameraDirection.length();
  cameraRay.set(cameraTarget,cameraDirection.normalize());
  for(const box of session.world.colliders){
    cameraBox.set(new THREE.Vector3(box.minX,box.minY,box.minZ),
      new THREE.Vector3(box.maxX,box.maxY,box.maxZ));
    if(cameraRay.intersectBox(cameraBox,cameraHit)){
      const hitDistance=cameraHit.distanceTo(cameraTarget);
      if(hitDistance<distance)distance=Math.max(.65,hitDistance-.22);
    }
  }
  cameraGoal.copy(cameraTarget).addScaledVector(cameraRay.direction,distance);
  // Move in immediately when geometry blocks the view; only ease out.
  const currentDistance=thirdCamera.position.distanceTo(cameraTarget);
  thirdCamera.position.lerp(cameraGoal,
    distance<currentDistance?1:Math.min(1,dt*10));
  thirdCamera.lookAt(cameraTarget);
  const consoleDistance=Math.hypot(camera.position.x,camera.position.z+4.9);
  consoleNear=consoleDistance<3.1 && Math.abs(feetY)<1.6;
  $('interactionHint').hidden=!consoleNear;
  const now=performance.now();
  if(now-lastHudAt<85)return;
  lastHudAt=now;
  $('animationState').textContent=(animator.active??'idle').toUpperCase();
  const velocity=controls.velocity;
  $('speedValue').innerHTML=Math.hypot(velocity.x,velocity.z).toFixed(1)+' <small>m/s</small>';
  $('groundedState').textContent=controls.grounded?'GROUNDED':'AIRBORNE';
  $('fpsValue').textContent=(engine.fps||'--')+' FPS';
  document.body.dataset.animation=(animator.active??'idle');
  document.body.dataset.view=mode;
}

function cleanup(){
  if(disposed)return;
  disposed=true;
  for(const cleanupFn of eventCleanups)cleanupFn();
  engine?.stop();
  session?.dispose();
  character?.dispose();
  characterAsset?.dispose();
  viewRig?.removeFromParent();
  for(const object of stageObjects){
    object.removeFromParent?.();
    object.geometry?.dispose?.();
    if(Array.isArray(object.material))object.material.forEach(m=>m?.dispose?.());
    else object.material?.dispose?.();
  }
  engine?.dispose();
}

async function launch(){
  if(started||disposed)return;
  $('launchButton').disabled=true;
  $('launchButton').textContent='LOADING ANIMATION ASSETS…';
  try{
    engine=new GameEngine($('game'));
    engine.setQuality('balanced');
    session=createGameSession(engine,{controls:{
      walkSpeed:2.8,runSpeed:5.0,groundY:0,bounds:{
        minX:-17.4,maxX:17.4,minZ:-17.4,maxZ:17.4
      }
    }});
    session.controls.camera.position.set(0,session.controls.eyeHeight,6);
    engine.scene.add(engine.camera);
    buildRoom();
    try{
      characterAsset=await loadCharacterAsset(engine.assets,
        './assets/robot-expressive.glb',{splitJump:true});
    }catch(error){
      loadWarning='Authored model unavailable; showing the original rig. '+
        (error?.message||'');
      console.warn(loadWarning);
      $('characterSource').querySelector('[value="authored"]').disabled=true;
    }
    setCharacterSource(characterAsset?'authored':'diagnostic');
    const hands=createFirstPersonHands();
    viewRig=hands.root;
    engine.camera.add(viewRig);
    viewAnimator=session.addAnimator('first-person-hands',viewRig,hands.clips,
      {followControls:true,fadeSeconds:.16,runThreshold:3.8});
    thirdCamera=new THREE.PerspectiveCamera(engine.camera.fov,
      engine.camera.aspect,.08,250);
    thirdCamera.position.set(0,3.2,10);
    thirdCamera.lookAt(0,1.2,5);
    started=true;
    $('launch').hidden=true;
    for(const id of ['topbar','help','panel'])$(id).hidden=false;
    switchView('third');
    const unregister=engine.onFrame(syncView);
    eventCleanups.push(unregister);
    const handle=event=>onKeyDown(event);
    window.addEventListener('keydown',handle);
    eventCleanups.push(()=>window.removeEventListener('keydown',handle));
    const bind=(id,fn)=>{
      const el=$(id);el.addEventListener('click',fn);
      eventCleanups.push(()=>el.removeEventListener('click',fn));
    };
    bind('thirdPerson',()=>switchView('third'));
    bind('firstPerson',()=>switchView('first'));
    bind('interactButton',()=>triggerAction('interact'));
    bind('reloadButton',()=>triggerAction('reload'));
    const characterChange=()=>setCharacterSource($('characterSource').value);
    $('characterSource').addEventListener('change',characterChange);
    eventCleanups.push(()=>$('characterSource').removeEventListener('change',characterChange));
    const qualityChange=()=>{
      const selection=$('quality').value;
      session.setQuality(selection);
      $('qualityIndicator').textContent=selection.toUpperCase();
    };
    $('quality').addEventListener('change',qualityChange);
    eventCleanups.push(()=>$('quality').removeEventListener('change',qualityChange));
    engine.start();
    if(loadWarning)$('feedback').textContent=loadWarning;
    // Diagnostic read-only-ish developer handle used by automated tests.
    // This page is already under GAMESHUB's existing developer access gate.
    window.__characterLab={
      get ready(){return started&&!disposed;},
      get mode(){return mode;},
      get active(){return animator.active;},
      get actions(){return actionCount;},
      get source(){return characterSource;},
      get missing(){return characterAsset?.missing||[];},
      get animator(){return animator;},
      get character(){return character;},
      engine,session,viewAnimator,viewRig,
      switchView,setCharacterSource,triggerAction,
      get status(){return $('feedback').textContent;}
    };
  }catch(error){failure(error);}
}
$('launchButton').addEventListener('click',launch);
window.addEventListener('pagehide',cleanup,{once:true});
