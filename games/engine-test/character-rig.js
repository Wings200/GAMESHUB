import {THREE} from '../../engine/core.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Lightweight diagnostic actor for testing the REAL AnimationMixer. These
// clips are intentionally authored here, rather than presented as polished
// motion-captured character animation or a finished gameplay character.
const material=(color,metalness=.05,roughness=.7)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const M={
  suit:material('#233848'),armor:material('#4a6678',.28,.43),
  trim:material('#e7aa6b',.53,.45),glove:material('#1b2731'),
  boot:material('#171d26'),visor:material('#9ce7ff',.22,.26),
  joints:material('#27313a',.16,.58),weapon:material('#38414d',.52,.43)
};
const createdGeometries=new Set();
function rounded(w,h,d,r=.05){
  const geo=new RoundedBoxGeometry(w,h,d,3,Math.min(r,w*.22,h*.22,d*.22));
  createdGeometries.add(geo);
  return geo;
}
function part(parent,name,w,h,d,mat,x=0,y=0,z=0,r=.05){
  const mesh=new THREE.Mesh(rounded(w,h,d,r),mat);
  mesh.name=name;mesh.position.set(x,y,z);
  mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
  return mesh;
}
function joint(parent,name,x,y,z){
  const node=new THREE.Group();node.name=name;node.position.set(x,y,z);parent.add(node);return node;
}
function limb(parent,name,upperLength,lowerLength,side){
  const top=joint(parent,'RigArm'+name,side*.36,.47,0);
  part(top,'Sleeve'+name,.19,upperLength,.22,M.suit,0,-upperLength/2,0,.07);
  part(top,'ShoulderArmor'+name,.235,.24,.28,M.armor,0,-.12,-.01,.075);
  const elbow=joint(top,'RigElbow'+name,0,-upperLength,0);
  part(elbow,'Forearm'+name,.18,lowerLength,.19,M.suit,0,-lowerLength/2,0,.06);
  part(elbow,'Glove'+name,.2,.15,.23,M.glove,0,-lowerLength+.025,-.015,.05);
  return {top,elbow};
}
function leg(parent,name,side){
  const hip=joint(parent,'RigLeg'+name,side*.18,1.03,0);
  part(hip,'Thigh'+name,.27,.48,.32,M.suit,0,-.24,0,.08);
  part(hip,'ThighPlate'+name,.25,.31,.33,M.armor,0,-.23,-.04,.05);
  const knee=joint(hip,'RigKnee'+name,0,-.49,0);
  part(knee,'Shin'+name,.23,.48,.27,M.suit,0,-.25,0,.07);
  part(knee,'Boot'+name,.27,.22,.43,M.boot,0,-.50,-.075,.07);
  return {hip,knee};
}
export function createDiagnosticCharacter(){
  const root=new THREE.Group();root.name='DiagnosticCharacter';
  const torso=joint(root,'RigTorso',0,1.05,0);
  part(torso,'ChestSuit',.67,.74,.32,M.suit,0,.24,0,.14);
  part(torso,'ChestPlate',.59,.5,.355,M.armor,0,.27,-.015,.09);
  part(torso,'ChestBand',.39,.055,.383,M.trim,0,.08,-.018,.018);
  part(root,'Waist',.52,.25,.34,M.joints,0,1.03,0,.075);
  part(root,'Belt',.57,.11,.38,M.armor,0,1.0,0,.02);
  const head=joint(torso,'RigHead',0,.70,0);
  part(head,'Neck',.18,.15,.19,M.suit,0,-.035,0,.04);
  part(head,'Helmet',.40,.36,.42,M.armor,0,.19,0,.1);
  part(head,'FaceShield',.34,.13,.04,M.visor,0,.19,-.224,.035);
  part(head,'HelmetRidge',.22,.05,.44,M.trim,0,.39,0,.018);
  const arms=[limb(torso,'L',.42,.4,-1),limb(torso,'R',.42,.4,1)];
  const legs=[leg(root,'L',-1),leg(root,'R',1)];
  // Neutral hand-held calibration tool: geometry only, not a weapon asset.
  const tool=joint(arms[1].elbow,'TrainingDevice',0,-.38,-.11);
  part(tool,'DeviceBody',.14,.13,.42,M.weapon,0,-.01,-.18,.025);
  part(tool,'DeviceGrip',.12,.23,.12,M.glove,0,-.17,-.07,.02);
  part(tool,'DeviceTip',.09,.1,.09,M.trim,0,-.01,-.43,.012);
  const owned=[root];
  return {
    root,
    clips:makeCharacterClips(),
    dispose(){
      root.removeFromParent();
      // Per-character geometry uses its own groups. Shared preset materials
      // live until the testing room exits, not every animation transition.
      for(const geometry of createdGeometries)geometry.dispose();
    }
  };
}
const ROOT_ANIMATION_CHANNELS=[
  'RigTorso.position[y]','RigTorso.rotation[x]',
  'RigHead.rotation[x]','RigArmL.rotation[x]','RigArmR.rotation[x]',
  'RigElbowL.rotation[x]','RigElbowR.rotation[x]',
  'RigLegL.rotation[x]','RigLegR.rotation[x]',
  'RigKneeL.rotation[x]','RigKneeR.rotation[x]'
];
function pose({bob=0,lean=0,head=0,armL=0,armR=0,elbowL=0,elbowR=0,
  legL=0,legR=0,kneeL=0,kneeR=0}={}){
  return [1.05+bob,lean,head,armL,armR,elbowL,elbowR,legL,legR,kneeL,kneeR];
}
function makeClip(name,duration,sampler,samples=12){
  const times=Array.from({length:samples+1},(_,i)=>duration*i/samples);
  const frames=times.map(t=>pose(sampler(t/duration)));
  const tracks=ROOT_ANIMATION_CHANNELS.map((path,i)=>
    new THREE.NumberKeyframeTrack(path,times,frames.map(frame=>frame[i])));
  return new THREE.AnimationClip(name,duration,tracks);
}
function actionPose(keyframes,t){
  const n=keyframes.length-1;
  const at=t*n,index=Math.min(n-1,Math.floor(at)),blend=at-index;
  const a=keyframes[index],b=keyframes[index+1],mix={};
  for(const key of Object.keys({...a,...b}))
    mix[key]=(a[key]??0)+((b[key]??0)-(a[key]??0))*blend;
  return mix;
}
function makeCharacterClips(){
  const idle=makeClip('idle',2,t=>({bob:Math.sin(t*2*Math.PI)*.013,
    armL:-.04,armR:-.04,elbowL:-.1,elbowR:-.1,head:Math.sin(t*2*Math.PI)*.025}));
  const gait=(t,run)=>{
    const wave=Math.sin(t*2*Math.PI),wave2=Math.sin(t*2*Math.PI+Math.PI);
    const gain=run?.73:.43;
    return {
      bob:Math.abs(wave)* (run?.07:.035),
      lean:run?.15:.045,
      armL:-wave*gain*.84-.08,
      armR:wave*gain*.84-.08,
      elbowL:-.28-(run?.16:.04)*Math.abs(wave),
      elbowR:-.28-(run?.16:.04)*Math.abs(wave2),
      legL:wave*gain,
      legR:wave2*gain,
      kneeL:Math.max(0,-wave)*(run?.62:.34),
      kneeR:Math.max(0,-wave2)*(run?.62:.34)
    };
  };
  return {
    idle,walk:makeClip('walk',.92,t=>gait(t,false)),
    run:makeClip('run',.63,t=>gait(t,true)),
    jump:makeClip('jump',.75,t=>({bob:0,lean:-.07,
      armL:.4,armR:.38,elbowL:-.25,elbowR:-.25,
      legL:.25,legR:-.18,kneeL:.62,kneeR:.55})),
    fall:makeClip('fall',.75,t=>({lean:.1,armL:.55,armR:.55,
      elbowL:-.23,elbowR:-.23,legL:.15,legR:-.15,kneeL:.26,kneeR:.2})),
    interact:makeClip('interact',1.05,t=>actionPose([
      {armR:-.06,elbowR:-.1},
      {armR:1.35,elbowR:-.32,head:.15,lean:.08},
      {armR:1.32,elbowR:-.3,head:.15,lean:.08},
      {armR:-.04,elbowR:-.1}
    ],t)),
    reload:makeClip('reload',1.25,t=>actionPose([
      {armR:-.04,armL:-.04,elbowL:-.1,elbowR:-.1},
      {armR:.85,armL:.93,elbowL:-1.28,elbowR:-.64,head:.21,lean:.1},
      {armR:.9,armL:1.05,elbowL:-1.45,elbowR:-.72,head:.2,lean:.1},
      {armR:-.04,armL:-.04,elbowL:-.1,elbowR:-.1}
    ],t))
  };
}

export function createFirstPersonHands(){
  const root=new THREE.Group();root.name='DiagnosticFirstPersonHands';
  root.position.set(.0,-.41,-.72);
  const sleeve=material('#293e4e'),gloves=material('#172630');
  const left=joint(root,'ViewArmL',-.31,-.08,.08);
  const right=joint(root,'ViewArmR',.25,-.09,.04);
  part(left,'LeftSleeve',.18,.48,.22,sleeve,0,-.11,-.17,.045);
  part(right,'RightSleeve',.18,.46,.22,sleeve,0,-.12,-.16,.045);
  part(left,'LeftHand',.18,.19,.19,gloves,0,.08,-.32,.035);
  part(right,'RightHand',.18,.19,.19,gloves,0,.07,-.32,.035);
  const device=joint(right,'ViewDevice',0,.09,-.39);
  part(device,'HeldTrainingDevice',.24,.18,.57,M.weapon,-.045,0,-.1,.04);
  part(device,'HeldIndicator',.12,.055,.08,M.trim,-.05,.12,-.27,.018);
  const tracks=['ViewArmL.rotation[x]','ViewArmR.rotation[x]','ViewArmL.rotation[z]',
    'ViewArmR.rotation[z]','ViewDevice.rotation[x]','ViewArmL.position[y]','ViewArmR.position[y]'];
  const sample=(name,duration,keyframes)=>new THREE.AnimationClip(name,duration,
    tracks.map((path,i)=>new THREE.NumberKeyframeTrack(path,
      keyframes.map((_,j)=>duration*j/(keyframes.length-1)),keyframes.map(p=>p[i]))));
  const clips={
    idle:sample('idle',1,[[.55,.4,0,0,0,0,0],[.54,.41,0,0,0,.006,.008],[.55,.4,0,0,0,0,0]]),
    walk:sample('walk',.7,[[.55,.4,0,0,0,0,0],[.38,.64,0,0,.02,-.024,.024],[.55,.4,0,0,0,0,0],[.66,.29,0,0,-.01,.024,-.024],[.55,.4,0,0,0,0,0]]),
    run:sample('run',.5,[[.24,.17,0,0,.11,-.09,-.09],[.25,.18,.01,-.01,.12,-.06,-.06],[.24,.17,0,0,.11,-.09,-.09]]),
    jump:sample('jump',.7,[[.7,.62,0,0,0,0,0],[.7,.62,0,0,0,.02,.02]]),
    fall:sample('fall',.7,[[.48,.4,0,0,.06,0,0],[.48,.4,0,0,.06,0,0]]),
    interact:sample('interact',1.05,[[.55,.4,0,0,0,0,0],[.5,1.1,0,-.08,-.1,0,.1],[.5,1.1,0,-.08,-.1,0,.1],[.55,.4,0,0,0,0,0]]),
    reload:sample('reload',1.25,[[.55,.4,0,0,0,0,0],[1.12,.65,-.42,.05,-.24,-.04,.06],[1.2,.68,-.52,.05,-.25,-.01,.08],[.55,.4,0,0,0,0,0]])
  };
  return {root,clips};
}
