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
  const foot=joint(knee,'RigFoot'+name,0,-.47,0);
  part(foot,'Boot'+name,.27,.22,.43,M.boot,0,-.04,-.075,.07);
  return {hip,knee,foot};
}
export function createDiagnosticCharacter(){
  const root=new THREE.Group();root.name='DiagnosticCharacter';
  const pelvis=joint(root,'RigPelvis',0,0,0);
  const torso=joint(root,'RigTorso',0,1.05,0);
  part(torso,'ChestSuit',.67,.74,.32,M.suit,0,.24,0,.14);
  part(torso,'ChestPlate',.59,.5,.355,M.armor,0,.27,-.015,.09);
  part(torso,'ChestBand',.39,.055,.383,M.trim,0,.08,-.018,.018);
  part(pelvis,'Waist',.52,.25,.34,M.joints,0,1.03,0,.075);
  part(pelvis,'Belt',.57,.11,.38,M.armor,0,1.0,0,.02);
  const head=joint(torso,'RigHead',0,.70,0);
  part(head,'Neck',.18,.15,.19,M.suit,0,-.035,0,.04);
  part(head,'Helmet',.40,.36,.42,M.armor,0,.19,0,.1);
  part(head,'FaceShield',.34,.13,.04,M.visor,0,.19,-.224,.035);
  part(head,'HelmetRidge',.22,.05,.44,M.trim,0,.39,0,.018);
  const arms=[limb(torso,'L',.42,.4,-1),limb(torso,'R',.42,.4,1)];
  const legs=[leg(pelvis,'L',-1),leg(pelvis,'R',1)];
  // Neutral hand-held calibration tool: geometry only, not a weapon asset.
  const tool=joint(arms[1].elbow,'TrainingDevice',0,-.38,-.11);
  part(tool,'DeviceBody',.14,.13,.42,M.weapon,0,-.01,-.18,.025);
  part(tool,'DeviceGrip',.12,.23,.12,M.glove,0,-.17,-.07,.02);
  part(tool,'DeviceTip',.09,.1,.09,M.trim,0,-.01,-.43,.012);
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
  'RigPelvis.position[y]','RigPelvis.rotation[z]','RigPelvis.rotation[y]',
  'RigTorso.position[y]','RigTorso.rotation[x]','RigTorso.rotation[y]','RigTorso.rotation[z]',
  'RigHead.rotation[x]','RigHead.rotation[z]',
  'RigArmL.rotation[x]','RigArmR.rotation[x]',
  'RigArmL.rotation[z]','RigArmR.rotation[z]',
  'RigElbowL.rotation[x]','RigElbowR.rotation[x]',
  'RigLegL.rotation[x]','RigLegR.rotation[x]',
  'RigKneeL.rotation[x]','RigKneeR.rotation[x]',
  'RigFootL.rotation[x]','RigFootR.rotation[x]'
];
function pose({bob=0,pelvisY=0,hipRoll=0,hipTwist=0,lean=0,twist=0,roll=0,
  head=0,headRoll=0,armL=0,armR=0,armRollL=0,armRollR=0,
  elbowL=-.12,elbowR=-.12,legL=0,legR=0,kneeL=0,kneeR=0,
  footL=0,footR=0}={}){
  return [pelvisY,hipRoll,hipTwist,1.05+bob,lean,twist,roll,head,headRoll,
    armL,armR,armRollL,armRollR,elbowL,elbowR,legL,legR,kneeL,kneeR,footL,footR];
}
function makeClip(name,duration,sampler,samples=36){
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
  const idle=makeClip('idle',2.6,t=>({
    bob:Math.sin(t*2*Math.PI)*.007,
    lean:Math.sin(t*2*Math.PI)*.009,
    head:Math.sin(t*2*Math.PI+.5)*.014,
    armL:-.055,armR:-.11,armRollL:-.09,armRollR:.09,
    elbowL:-.16,elbowR:-.2
  }));
  const gait=(t,run)=>{
    const phase=t*2*Math.PI;
    const wave=Math.sin(phase),double=Math.cos(phase*2);
    const stride=run?.66:.43;
    const lift=run?.64:.4;
    const cadence=run?1:.66;
    return {
      // The double-frequency vertical pulse gives a real weight transfer
      // on each footfall; pelvis and shoulders counter-rotate.
      bob:(double-1)*(run?.016:.009),
      pelvisY:-Math.abs(wave)*(run?.022:.01),
      hipRoll:wave*(run?.075:.05),
      hipTwist:wave*(run?.085:.05),
      lean:run?.135:.025,
      twist:-wave*(run?.09:.055),
      roll:-wave*(run?.045:.028),
      head:-.03-(run?.04:.012)*double,
      headRoll:wave*.025,
      armL:-wave*(run?.6:.39)-.12,
      armR:wave*(run?.6:.39)-.12,
      armRollL:-.14-(run?.05:0),
      armRollR:.14+(run?.05:0),
      elbowL:-.32-.12*cadence*Math.max(0,wave),
      elbowR:-.32-.12*cadence*Math.max(0,-wave),
      legL:wave*stride,
      legR:-wave*stride,
      kneeL:Math.max(0,-wave)*lift+.09*(1-double),
      kneeR:Math.max(0,wave)*lift+.09*(1-double),
      footL:-wave*(run?.18:.12)-Math.max(0,-wave)*.14,
      footR:wave*(run?.18:.12)-Math.max(0,wave)*.14
    };
  };
  return {
    idle,walk:makeClip('walk',.66,t=>gait(t,false)),
    run:makeClip('run',.48,t=>gait(t,true)),
    jump:makeClip('jump',.38,t=>actionPose([
      {bob:-.055,lean:.15,kneeL:.28,kneeR:.28,armL:-.23,armR:-.23},
      {bob:.025,lean:-.10,kneeL:.42,kneeR:.37,footL:-.2,footR:-.2,
        armL:.4,armR:.32,elbowL:-.42,elbowR:-.42},
      {bob:.04,lean:-.085,kneeL:.38,kneeR:.31,footL:-.1,footR:-.1,
        armL:.48,armR:.37,elbowL:-.35,elbowR:-.35}
    ],t)),
    fall:makeClip('fall',.42,t=>actionPose([
      {lean:-.06,kneeL:.32,kneeR:.25,armL:.4,armR:.33},
      {lean:.08,kneeL:.19,kneeR:.25,footL:-.18,footR:-.18,
        armL:.62,armR:.57,armRollL:-.17,armRollR:.17},
      {lean:.14,kneeL:.26,kneeR:.27,footL:-.1,footR:-.1,
        armL:.53,armR:.51}
    ],t)),
    interact:makeClip('interact',1.05,t=>actionPose([
      {armR:-.12,armL:-.055,elbowR:-.2},
      {armR:.65,armL:.18,elbowR:-.7,elbowL:-.35,head:.08,lean:.045},
      {armR:1.16,armL:.28,elbowR:-.45,elbowL:-.45,head:.12,lean:.075},
      {armR:1.08,armL:.24,elbowR:-.43,elbowL:-.45,head:.12,lean:.075},
      {armR:-.12,armL:-.055,elbowR:-.2}
    ],t)),
    reload:makeClip('reload',1.35,t=>actionPose([
      {armR:-.12,armL:-.055,elbowR:-.2,elbowL:-.16},
      {armR:.5,armL:.61,elbowR:-.6,elbowL:-.96,head:.15,lean:.035},
      {armR:.65,armL:.88,elbowR:-.7,elbowL:-1.25,head:.19,lean:.07},
      {armR:.6,armL:.96,elbowR:-.76,elbowL:-1.34,head:.19,lean:.07},
      {armR:.4,armL:.62,elbowR:-.54,elbowL:-1.0,head:.12,lean:.04},
      {armR:-.12,armL:-.055,elbowR:-.2,elbowL:-.16}
    ],t)),
    land:makeClip('land',.3,t=>actionPose([
      {bob:-.09,lean:.16,kneeL:.52,kneeR:.52,armL:.32,armR:.32,footL:-.12,footR:-.12},
      {bob:-.065,lean:.10,kneeL:.42,kneeR:.42,armL:.17,armR:.17},
      {bob:0,lean:0,kneeL:0,kneeR:0,armL:-.055,armR:-.11,
        elbowL:-.16,elbowR:-.2}
    ],t))
  };
}

export function createFirstPersonHands(){
  const root=new THREE.Group();root.name='DiagnosticFirstPersonHands';
  root.position.set(.0,-.41,-.72);
  const sleeve=material('#293e4e'),gloves=material('#172630');
  const left=joint(root,'ViewArmL',-.28,-.09,.10);
  const right=joint(root,'ViewArmR',.23,-.09,.04);
  part(left,'LeftSleeve',.20,.48,.24,sleeve,0,-.13,-.16,.055);
  part(right,'RightSleeve',.20,.46,.24,sleeve,0,-.13,-.16,.055);
  part(left,'LeftHand',.18,.19,.20,gloves,0,.09,-.33,.045);
  part(right,'RightHand',.18,.19,.20,gloves,0,.09,-.33,.045);
  const device=joint(right,'ViewDevice',0,.09,-.39);
  part(device,'HeldTrainingDevice',.24,.18,.57,M.weapon,-.045,0,-.1,.04);
  part(device,'HeldIndicator',.12,.055,.08,M.trim,-.05,.12,-.27,.018);
  const tracks=['ViewArmL.rotation[x]','ViewArmR.rotation[x]','ViewArmL.rotation[z]',
    'ViewArmR.rotation[z]','ViewDevice.rotation[x]','ViewArmL.position[y]','ViewArmR.position[y]'];
  const sample=(name,duration,keyframes)=>new THREE.AnimationClip(name,duration,
    tracks.map((path,i)=>new THREE.NumberKeyframeTrack(path,
      keyframes.map((_,j)=>duration*j/(keyframes.length-1)),keyframes.map(p=>p[i]))));
  const clips={
    idle:sample('idle',1.8,[[.47,.48,-.07,.07,0,0,0],[.46,.49,-.065,.065,0,.008,.008],[.47,.48,-.07,.07,0,0,0]]),
    walk:sample('walk',.66,[[.47,.48,-.07,.07,0,0,0],[.33,.61,-.08,.08,.015,-.02,.018],[.47,.48,-.07,.07,0,0,0],[.6,.35,-.055,.055,-.015,.016,-.02],[.47,.48,-.07,.07,0,0,0]]),
    run:sample('run',.48,[[.24,.24,-.065,.065,.10,-.075,-.075],[.32,.18,-.08,.08,.14,-.06,-.065],[.24,.24,-.065,.065,.10,-.075,-.075],[.18,.32,-.06,.06,.09,-.06,-.065],[.24,.24,-.065,.065,.10,-.075,-.075]]),
    jump:sample('jump',.38,[[.36,.34,-.08,.08,.06,-.025,-.025],[.66,.6,-.08,.08,-.03,.04,.04],[.62,.56,-.08,.08,-.02,.025,.025]]),
    fall:sample('fall',.42,[[.62,.56,-.08,.08,-.02,.025,.025],[.49,.48,-.06,.06,.04,0,0],[.52,.5,-.06,.06,.02,.01,.01]]),
    interact:sample('interact',1.05,[[.47,.48,-.07,.07,0,0,0],[.52,1.02,-.05,-.1,-.12,-.01,.11],[.51,1.08,-.05,-.1,-.12,-.01,.12],[.49,.92,-.05,-.1,-.09,0,.08],[.47,.48,-.07,.07,0,0,0]]),
    reload:sample('reload',1.35,[[.47,.48,-.07,.07,0,0,0],[.9,.58,-.4,.06,-.18,-.03,.07],[1.13,.64,-.54,.06,-.3,-.04,.08],[1.07,.64,-.48,.06,-.24,-.02,.08],[.8,.55,-.26,.06,-.1,0,.04],[.47,.48,-.07,.07,0,0,0]]),
    land:sample('land',.3,[[.58,.57,-.08,.08,.08,-.05,-.05],[.55,.54,-.075,.075,.06,-.03,-.03],[.47,.48,-.07,.07,0,0,0]])
  };
  return {root,clips};
}
