// W09.6: original, locally constructed NPCs. No imported character assets.
// Only the pre-existing enemy body-part hitboxes are authoritative for shots.
import * as THREE from 'three';
import {createPlayerAvatar} from './player-avatar.mjs?v=W20.92';
import {reloadPoseForWeapon} from './weapon-handling.mjs?v=W20.42';
import {createPipeRifle} from './pipe-rifle.mjs?v=W20.42';
import {WORLD_WEAPON_GRIPS} from './weapon-grip-ik.mjs?v=W20.42';
// AI yaw 0 looks toward +Z; the survivor mesh is modeled facing -Z.
// Rotate only the visual 180°, so its front and gun point where the brain aims.
export const NPC_VISUAL_YAW_OFFSET=Math.PI;

export const NPC_VISUAL_ROLES=Object.freeze({
  scout:Object.freeze({name:'Wasteland Scout',weapon:'compact-carbine',
    length:.51,color:0x77634b,metal:0x353d40,height:1.88}),
  raider:Object.freeze({name:'Scrap Raider',weapon:'pipe-rifle',
    length:.71,color:0x7c594c,metal:0x464a49,height:1.96}),
  enforcer:Object.freeze({name:'Armored Enforcer',weapon:'heavy-rifle',
    length:.82,color:0x445d70,metal:0x252f3a,height:2.01})
});
const slotNames=['head','chest','leftArm','rightArm','leftLeg','rightLeg'];
const familyMap={
  cloth:'scrap',canvas:'scrap',hide:'scrap',patchwork:'scrap',mesh:'scrap',
  road:'ranger',composite:'ranger',ceramic:'militia',
  industrial:'militia',tactical:'militia',carbon:'citadel',aegis:'citadel'
};
export function npcCosmeticArmor(loadout={}){
  const visual={};
  for(const slot of slotNames){
    const id=loadout[slot]||'none';
    if(id==='none'){visual[slot]='none';continue;}
    const prefix=id.slice(0,id.length-slot.length-1);
    const family=['scrap','ranger','militia','citadel'].includes(prefix)?
      prefix:familyMap[prefix]||'scrap';
    visual[slot]=family+'-'+slot;
  }
  return visual;
}

export function createNpcAvatar(parent,kind){
  const role=NPC_VISUAL_ROLES[kind];
  if(!role)throw Error('Unknown NPC role: '+kind);
  const avatar=createPlayerAvatar(parent,{variant:kind});
  avatar.root.name='OriginalNpc_'+kind;
  avatar.root.rotation.y=NPC_VISUAL_YAW_OFFSET;
  avatar.root.scale.multiplyScalar(kind==='scout'?.97:kind==='enforcer'?1.07:1.02);
  const mount=avatar.weaponSocket;
  const gun=new THREE.Group();
  gun.name=kind+'_animated_weapon';
  gun.position.set(.0,-.06,-.04);
  mount.add(gun);
  // The raider is the only armed NPC in the W20.42 controlled trial.
  // This is the identical authored gun geometry used by the player.
  const realPipe=kind==='raider'?
    createPipeRifle(THREE,mount,{thirdPerson:true}):null;
  let pipeRightGrip=null,pipeLeftGrip=null;
  if(realPipe){
    realPipe.root.visible=false;
    const points=WORLD_WEAPON_GRIPS['pipe-rifle'];
    pipeRightGrip=new THREE.Group();pipeLeftGrip=new THREE.Group();
    pipeRightGrip.name='NPCRealPipeTriggerGrip';
    pipeLeftGrip.name='NPCRealPipeSupportGrip';
    pipeRightGrip.position.set(...points.right);
    pipeLeftGrip.position.set(...points.left);
    realPipe.root.add(pipeRightGrip,pipeLeftGrip);
  }
  const finish=new THREE.MeshStandardMaterial({color:role.metal,roughness:.66,metalness:.25});
  const wood=new THREE.MeshStandardMaterial({color:role.color,roughness:.92});
  const black=new THREE.MeshStandardMaterial({color:0x161f23,roughness:.8});
  const highlight=new THREE.MeshStandardMaterial({color:0x9ba5a0,roughness:.56,metalness:.35});
  const ownedMaterials=[finish,wood,black,highlight];
  function piece(w,h,d,m,x,y,z){
    const g=new THREE.BoxGeometry(w,h,d),p=new THREE.Mesh(g,m);
    p.position.set(x,y,z);p.castShadow=true;gun.add(p);return p;
  }
  function tube(r,length,m,x,y,z){
    const p=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.9,length,10),m);
    p.rotation.x=Math.PI/2;p.position.set(x,y,z);p.castShadow=true;gun.add(p);return p;
  }
  // Broad shaped receivers, grip, stock and moving magazine on every weapon.
  piece(.16,.16,.32,finish,0,0,-.14);
  piece(.20,.09,role.length*.50,wood,0,.01,-.30);
  piece(.11,.23,.13,black,0,-.17,-.06).rotation.x=-.17;
  piece(.11,.16,.30,wood,0,-.045,.24);
  piece(.15,.13,.06,black,0,-.02,.37);
  tube(kind==='enforcer'?.050:.034,role.length*.7,finish,
    0,.034,-.28-role.length*.40);
  const muzzle=tube(.045,.045,highlight,0,.034,-.28-role.length*.76);
  piece(.09,.055,.04,black,0,.133,-.12);
  piece(.025,.09,.034,highlight,0,.12,-.28-role.length*.65);
  const magazine=piece(kind==='enforcer'?.19:.12,
    kind==='enforcer'?.25:.19,.16,black,0,-.18,-.22);
  if(kind==='scout'){
    piece(.13,.16,.08,wood,.12,-.08,-.40); // forward handgrip
    piece(.14,.04,.21,highlight,0,.092,-.27);
  }else if(kind==='raider'){
    // Asymmetrically repaired pipe and improvised exposed side bolts.
    piece(.035,.09,.20,wood,.12,.04,-.18);
    for(let j=0;j<3;j++)piece(.025,.03,.028,highlight,.15,.04,-.11-j*.065);
  }else{
    // Heat shield, reinforced stock and high-capacity box magazine.
    piece(.23,.16,.28,black,0,.02,-.40);
    piece(.22,.045,.18,highlight,0,.15,-.26);
    for(let j=0;j<4;j++)piece(.18,.012,.02,highlight,0,.105,-.52+j*.063);
    piece(.15,.18,.14,finish,0,-.04,.24);
  }
  // Visible variant-specific furniture. Alternate firearms are not just
  // different damage numbers: they have their own stocks, rails or magazines.
  const alternate=new THREE.Group();gun.add(alternate);
  function alternateBox(w,h,d,m,x,y,z){
    const obj=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    obj.position.set(x,y,z);obj.castShadow=true;alternate.add(obj);
    return obj;
  }
  alternateBox(.23,.14,.36,finish,0,.03,-.38);
  alternateBox(.17,.045,.33,highlight,0,.15,-.35);
  alternateBox(.14,.17,.24,wood,0,-.065,.28);
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.15,16),black);
  drum.rotation.x=Math.PI/2;drum.position.set(0,-.23,-.21);
  alternate.add(drum);
  const extraBarrel=alternateBox(.08,.08,.28,finish,0,.035,-.69);
  // The NPC weapon sits on the same torso socket as the player's rebuilt
  // guns; independent hands target actual receiver grip and wooden fore-end.
  const rightGrip=new THREE.Group(),leftGrip=new THREE.Group();
  rightGrip.name='NPCTriggerHandhold';
  leftGrip.name='NPCSupportHandhold';
  rightGrip.position.set(.075,-.19,-.025);
  leftGrip.position.set(-.085,-.055,-.285);
  gun.add(rightGrip,leftGrip);
  avatar.setWeaponGripTargets(rightGrip,leftGrip);
  let currentWeapon=role.weapon;
  let disarmed=false;
  function setWeapon(id=role.weapon){
    if(disarmed)return; // resetting NPC loadouts must not respawn legacy guns
    currentWeapon=id;
    if(realPipe){
      const authentic=id==='pipe-rifle';
      realPipe.root.visible=authentic;
      gun.visible=!authentic;
      avatar.setWeaponGripTargets(
        authentic?pipeRightGrip:rightGrip,
        authentic?pipeLeftGrip:leftGrip);
    }
    const variant=id==='scout-carbine'||id==='raider-auto'||id==='heavy-lmg';
    alternate.visible=variant;
    // Short SMGs, long rifles and heavy automatic weapons have distinct
    // silhouettes and visible feed systems.
    gun.scale.set(1,1,id==='compact-smg'?.77:
      id==='scout-carbine'?.97:id==='raider-auto'?1.03:
      id==='heavy-lmg'?1.21:id==='heavy-rifle'?1.09:1);
    magazine.visible=id!=='heavy-lmg';
    drum.visible=id==='heavy-lmg';
    extraBarrel.visible=id==='scout-carbine'||id==='raider-auto'||id==='heavy-lmg';
    magazine.scale.y=id==='raider-auto'?1.45:1;
  }
  setWeapon(role.weapon);
  const npcBolt=new THREE.Group();gun.add(npcBolt);
  npcBolt.position.set(.12,.10,-.11);
  const boltSteel=new THREE.MeshStandardMaterial({
    color:0xa0aaa4,metalness:.58,roughness:.42
  });
  ownedMaterials.push(boltSteel);
  const handle=new THREE.Mesh(new THREE.BoxGeometry(.11,.045,.08),boltSteel);
  npcBolt.add(handle);
  npcBolt.visible=false;
  const flash=new THREE.PointLight(0xffbd73,0,1.45);
  flash.position.copy(muzzle.position);
  // The tracer starts at the actual barrel tip, not the enemy's stomach.
  flash.position.z-=.08;
  gun.add(flash);
  const frontAxis=new THREE.Vector3(0,0,-1);
  const muzzlePoint=new THREE.Vector3();
  const facingVector=new THREE.Vector3();
  function getMuzzleWorldPosition(){
    const barrel=realPipe?.root.visible?realPipe.muzzleGlow:flash;
    barrel.updateWorldMatrix(true,false);
    return barrel.getWorldPosition(muzzlePoint.clone());
  }
  function getWorldForward(){
    avatar.root.updateWorldMatrix(true,false);
    return facingVector.copy(frontAxis).transformDirection(
      avatar.root.matrixWorld).clone();
  }
  let time=0,reloadClock=0,wasReloading=false,hitBlend=0,recoilBlend=0;
  let verticalAim=0,horizontalAim=0,gunRaiseBlend=0,leanBlend=0;
  let locomotionSpeed=0,alertBlend=0,suppressedBlend=0;
  let lastArmor={};
  let previousBodyYaw=null;
  function setArmor(loadout={}){
    lastArmor={...loadout};
    avatar.setArmor(npcCosmeticArmor(loadout));
  }
  function update(dt,{moving=false,speed=0,crouched=false,aiming=false,aimPitch=0,
    searchYaw=0,
    reloading=false,reloadProgress=0,recoil=0,hit=0,alive=true,
    alerted=false,suppressed=0,lateralSpeed=0,phase='patrol',
    aimYaw=0,raiseGun=0,peekLean=0,injuries=null}={}){
    const step=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0));
    time+=step;
    const parentYaw=parent.rotation.y;
    const yawDelta=previousBodyYaw===null?0:
      Math.atan2(Math.sin(parentYaw-previousBodyYaw),
        Math.cos(parentYaw-previousBodyYaw));
    previousBodyYaw=parentYaw;
    if(reloading&&!wasReloading)reloadClock=0;
    wasReloading=reloading;
    reloadClock=reloading?Math.min(4.5,reloadClock+step):0;
    const reloadStage=reloading?Math.max(0,Math.min(1,reloadProgress)):0;
    const motionWeapon=currentWeapon==='compact-smg'?'pipe-smg':
      currentWeapon==='pipe-rifle'?'pipe-rifle':
      currentWeapon==='heavy-lmg'?'heavy-lmg':'service-carbine';
    const action=reloadPoseForWeapon(motionWeapon,reloading?1-reloadStage:0,1);
    hitBlend=Math.max(hitBlend*Math.exp(-12*step),Math.min(1,Math.max(0,hit)));
    recoilBlend=Math.max(recoilBlend*Math.exp(-17*step),Math.min(1,Math.max(0,recoil)));
    // Measured ground speed drives actual footsteps and stride length.
    // The old minimum 1.7 m/s made guards moonwalk at full pace even when
    // collision left them creeping only a few centimetres per second.
    const targetSpeed=moving?Math.max(0,Number.isFinite(speed)?speed:0):0;
    locomotionSpeed+=(targetSpeed-locomotionSpeed)*(1-Math.exp(-10*step));
    alertBlend+=(Number(alerted)-alertBlend)*(1-Math.exp(-5*step));
    const wantedSuppression=Math.max(0,Math.min(1,suppressed||0));
    suppressedBlend+=(wantedSuppression-suppressedBlend)*
      (1-Math.exp(-8*step));
    const requestedPitch=aiming&&Number.isFinite(aimPitch)?
      Math.max(-.55,Math.min(.85,aimPitch)):0;
    verticalAim+=(requestedPitch-verticalAim)*(1-Math.exp(-9*step));
    const requestedYaw=aiming&&Number.isFinite(aimYaw)?
      Math.max(-.28,Math.min(.28,aimYaw)):0;
    horizontalAim+=(requestedYaw-horizontalAim)*(1-Math.exp(-12*step));
    const wantedRaise=!disarmed&&aiming?
      Math.max(.55,Math.min(1,raiseGun||0)):0;
    gunRaiseBlend+=(wantedRaise-gunRaiseBlend)*(1-Math.exp(-11*step));
    const wantedLean=!disarmed&&Number.isFinite(peekLean)?
      Math.max(-1,Math.min(1,peekLean)):0;
    leanBlend+=(wantedLean-leanBlend)*(1-Math.exp(-9*step));
    // Set the gun pose BEFORE avatar.update so the IK reads current grips.
    // This is a shoulder-held, aimable weapon; the previous fixed chest
    // socket stayed below waist-high cover even when the head could see.
    // Both physical hands follow the raised receiver through the existing IK.
    // Visual root faces opposite the AI's +Z convention: local -X is
    // world-right at yaw zero. Shift the gun toward the leaned-over shoulder.
    mount.position.set(.17-leanBlend*.18,
      .50+gunRaiseBlend*.39,-.20-gunRaiseBlend*.055);
    mount.rotation.y=horizontalAim;
    // A belt-fed LMG swaps the side drum; a pipe rifle cycles a bolt.
    mount.rotation.z=hitBlend*.12+leanBlend*.08;
    gun.rotation.x=action.tilt+recoilBlend*.15-hitBlend*.08;
    gun.rotation.y=Math.sin(time*3.1)*(.009+.005*alertBlend)+hitBlend*.09;
    gun.rotation.z=reloading?.08*Math.sin(Math.PI*reloadStage):
      Math.sin(time*2.8)*.012;
    gun.position.z=-.04+recoilBlend*.07;
    magazine.position.y=-.18-action.magazineOffset;
    magazine.rotation.z=action.magazineAngle;
    drum.position.y=-.23-action.magazineOffset*.70;
    drum.rotation.z=action.boltHandleLift*.18;
    npcBolt.visible=currentWeapon==='pipe-rifle';
    npcBolt.position.z=-.11+action.boltOffset;
    npcBolt.rotation.z=action.boltHandleLift*.55;
    flash.intensity=!disarmed&&recoilBlend>.65?2.2:0;
    if(realPipe?.root.visible){
      // Drive the same gun's box magazine, charging bolt and muzzle flash.
      realPipe.root.rotation.x=action.tilt+recoilBlend*.13-hitBlend*.08;
      realPipe.root.rotation.y=Math.sin(time*3.1)*.007;
      realPipe.root.rotation.z=reloading?.05*Math.sin(Math.PI*reloadStage):0;
      realPipe.root.position.z=.045+recoilBlend*.055;
      realPipe.magazine.position.y=realPipe.magBaseY-action.magazineOffset;
      realPipe.magazineBase.position.y=realPipe.magFootY-action.magazineOffset;
      realPipe.magazine.rotation.z=action.magazineAngle;
      realPipe.slideGroup.position.z=action.slideOffset;
      realPipe.muzzleGlow.intensity=!disarmed&&recoilBlend>.65?2.8:0;
    }
    avatar.update({dt,x:0,z:0,ground:0,yaw:NPC_VISUAL_YAW_OFFSET,
      speed:locomotionSpeed,
      sprinting:locomotionSpeed>3&&!aiming,
       crouched,aiming:aiming&&!disarmed,alive,pitch:verticalAim,
      reloading:reloading&&!disarmed,reloadProgress:reloadStage,
      recoil:disarmed?0:recoilBlend,hit:hitBlend,reloadStyle:motionWeapon,
       // Positive local X pitch lifts this -Z-facing barrel. A neutral
       // target should look level; an elevated opponent must look upward.
       weaponPitch:aiming?verticalAim:.11,
      turnRate:step>0?yawDelta/step:0,injuries});
    // Investigation is not just a straight walk toward remembered coordinates.
    // Look around corners while advancing, without swinging the whole rifle
    // or steering toward a hidden player. Hit joints follow the visible head.
    const glance=Math.max(-.72,Math.min(.72,
      Number.isFinite(searchYaw)?searchYaw:0));
    avatar.hitJoints.head.rotation.y=glance*(aiming?.16:1)+
      (alertBlend>.35&&!aiming?Math.sin(time*1.1)*.035:0);
    avatar.hitJoints.head.rotation.y+=horizontalAim*.48;
    avatar.hitJoints.torso.rotation.y+=glance*.15*(aiming?.18:1);
    // Hips and shoulders shift against lateral movement, instead of
    // swinging the legs as though every strafing step went forwards.
    const side=Math.max(-1,Math.min(1,lateralSpeed/3));
    avatar.hitJoints.torso.rotation.z+=side*.078+
      suppressedBlend*Math.sin(time*13)*.011+leanBlend*.26;
    avatar.hitJoints.head.rotation.z+=leanBlend*.12;
    if(phase==='hold'||phase==='guard-angle')
      avatar.hitJoints.head.rotation.x-=.045*alertBlend;
    if(reloading)avatar.hitJoints.head.rotation.x+=.09;

  }
  function disarm(){
    disarmed=true;
    currentWeapon='none';
    gun.visible=false;
    gun.removeFromParent();
    if(realPipe){realPipe.root.visible=false;realPipe.root.removeFromParent();}
    avatar.setWeaponGripTargets(null,null);
    flash.intensity=0;
  }
  setArmor({});
  return {
    root:avatar.root,hitJoints:avatar.hitJoints,update,setArmor,setWeapon,disarm,
     getMuzzleWorldPosition,getWorldForward,getAimPitch:()=>verticalAim,
     getAimYaw:()=>horizontalAim,getLean:()=>leanBlend,
    get metrics(){return {
      height:role.height,expectedHeight:role.height,repairs:0,
      source:'original-procedural'
    };},
    get state(){return {
      type:kind,model:avatar.root.name,weapon:currentWeapon,
      pose:avatar.metrics.pose,reloading:reloadClock>0,
      rendered:avatar.root.visible,
      equipped:{...lastArmor},armor:avatar.armor,
      armorPieces:avatar.visibleArmorPieces
    };},
    dispose(){
      gun.traverse(child=>{if(child.geometry)child.geometry.dispose();});
      if(realPipe)realPipe.root.traverse(child=>{
        if(child.geometry)child.geometry.dispose();
        if(child.material&&child.material.dispose)child.material.dispose();
      });
      ownedMaterials.forEach(m=>m.dispose());
      avatar.dispose();
    }
  };
}
