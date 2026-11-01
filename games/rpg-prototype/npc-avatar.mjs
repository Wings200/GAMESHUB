// W09.6: original, locally constructed NPCs. No imported character assets.
// Only the pre-existing enemy body-part hitboxes are authoritative for shots.
import * as THREE from 'three';
import {createPlayerAvatar} from './player-avatar.mjs';

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
  avatar.root.scale.multiplyScalar(kind==='scout'?.97:kind==='enforcer'?1.07:1.02);
  const mount=avatar.weaponSocket;
  const gun=new THREE.Group();
  gun.name=kind+'_animated_weapon';
  gun.position.set(.0,-.06,-.04);
  mount.add(gun);
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
  const flash=new THREE.PointLight(0xffbd73,0,1.45);
  flash.position.copy(muzzle.position);
  gun.add(flash);
  let time=0;
  let lastArmor={};
  function setArmor(loadout={}){
    lastArmor={...loadout};
    avatar.setArmor(npcCosmeticArmor(loadout));
  }
  function update(dt,{moving=false,speed=0,crouched=false,aiming=false,
    reloading=false,recoil=0,alive=true}={}){
    time+=Math.min(.05,Math.max(0,dt));
    avatar.update({dt,x:0,z:0,ground:0,yaw:0,
      speed:moving?Math.max(1.7,speed):0,sprinting:!!moving,
      crouched,aiming,alive,pitch:0});
    // Torso socket follows crouch and movement, while the gun reacts to
    // actual AI states. The empty-mag animation is a magazine drop and tilt.
    mount.rotation.x=aiming?-.15:.11;
    gun.rotation.x=(reloading?-.48:0)+recoil*.15;
    gun.rotation.z=reloading?.24:Math.sin(time*2.8)*.012;
    magazine.position.y=-.18-(reloading?.12:0);
    flash.intensity=recoil>.7?2.2:0;
  }
  setArmor({});
  return {
    root:avatar.root,update,setArmor,
    get metrics(){return {
      height:role.height,expectedHeight:role.height,repairs:0,
      source:'original-procedural'
    };},
    get state(){return {
      type:kind,model:avatar.root.name,weapon:role.weapon,
      rendered:avatar.root.visible,
      equipped:{...lastArmor},armor:avatar.armor,
      armorPieces:avatar.visibleArmorPieces
    };},
    dispose(){
      gun.traverse(child=>{if(child.geometry)child.geometry.dispose();});
      ownedMaterials.forEach(m=>m.dispose());
      avatar.dispose();
    }
  };
}
