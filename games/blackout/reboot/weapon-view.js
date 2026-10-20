// BLACKOUT V0.5 · refined BX-7 Mk II model, calibrated ADS and target range.
import {buildBX7Model} from "./weapon-model.js?v=reboot-005";
import {weaponPose} from "./weapon-aim.js?v=reboot-005";
import {TARGET_POSITIONS} from "./range-layout.js?v=reboot-007";

export function createWeaponView(THREE,camera,scene){
 const root=new THREE.Group();
 root.name="BX-7 Mk II original camera-mounted carbine";
 camera.add(root);
 scene.add(camera);
 const parts=buildBX7Model(THREE,root);
 let flashLeft=0,reload=null;
 const shells=[];
 const brass=new THREE.MeshStandardMaterial({color:0xb99a58,metalness:.88,roughness:.24});
 function flash(){flashLeft=.045;}
 function eject(){
  // Restored from the old BLACKOUT: spent casings eject from the bolt.
  const shell=new THREE.Mesh(new THREE.CylinderGeometry(.014,.016,.049,8),brass);
  shell.rotation.x=Math.PI/2;
  shell.position.set(.135,-.035,-.31);
  root.add(shell);
  shells.push({shell,xv:.7+Math.random()*.55,yv:.45+Math.random()*.22,
    zv:.15+Math.random()*.3,age:0});
  while(shells.length>22){
   const old=shells.shift();root.remove(old.shell);old.shell.geometry.dispose();
  }
 }
 function beginReload(now,durationMs,type="tactical"){
  reload={at:now,duration:Math.max(100,durationMs),type};
 }
 function update(dt,aimMix,recoil,moving,now=performance.now()){
  const bob=moving?Math.sin(now*.012)*.003:0;
  const pose=weaponPose(aimMix,recoil,bob);
  root.position.set(pose.x,pose.y,pose.z);
  root.rotation.set(pose.pitch,0,pose.roll);
  parts.reticle.visible=aimMix>=.995;
  flashLeft=Math.max(0,flashLeft-dt);
  parts.flash.visible=flashLeft>0;
  if(parts.flash.visible)parts.flash.scale.setScalar(.8+Math.random()*.9);
  parts.magazine.position.y=-.307;
  parts.magazine.rotation.x=-.12;
  if(reload){
   const t=(now-reload.at)/reload.duration;
   if(t>=1)reload=null;
   else{
    const pull=t<.36?Math.sin(Math.min(1,t/.36)*Math.PI/2):
      t<.58?1:Math.max(0,1-(t-.58)/.30);
    parts.magazine.position.y-=pull*.21;
    parts.magazine.rotation.x=-.12+pull*.24;
   }
  }
  // Legacy casing motion in first-person gun-space with gravity and spin.
  for(let i=shells.length-1;i>=0;i--){
   const s=shells[i];s.age+=dt;s.yv-=2.7*dt;
   s.shell.position.x+=s.xv*dt;s.shell.position.y+=s.yv*dt;
   s.shell.position.z+=s.zv*dt;s.shell.rotation.z+=dt*14;
   if(s.age>1.2){
    root.remove(s.shell);s.shell.geometry.dispose();shells.splice(i,1);
   }
  }
 }
 return {root,update,flash,eject,beginReload,reticle:parts.reticle};
}

export function createTargetRange(THREE,scene){
 const green=new THREE.MeshStandardMaterial({color:0x3a9b87,roughness:.78});
 const orange=new THREE.MeshStandardMaterial({color:0xf2a74e,roughness:.76});
 const dark=new THREE.MeshStandardMaterial({color:0x24323b,roughness:.83});
 const white=new THREE.MeshStandardMaterial({color:0xd4e5e8,roughness:.83});
 const stand=new THREE.MeshStandardMaterial({color:0x536675,metalness:.4,roughness:.64});
 const positions=TARGET_POSITIONS;
 const targets=[];
 for(let i=0;i<positions.length;i++){
  const group=new THREE.Group();
  const id="dummy-"+(i+1);
  group.position.set(positions[i][0],0,positions[i][1]);
  const base=new THREE.Mesh(new THREE.BoxGeometry(.8,.09,.6),stand);
  base.position.y=.05;group.add(base);
  const pole=new THREE.Mesh(new THREE.BoxGeometry(.06,1.18,.06),stand);
  pole.position.y=.72;group.add(pole);
  const torso=new THREE.Mesh(new THREE.BoxGeometry(.74,1.02,.22),i%2?green:orange);
  torso.position.y=1.25;torso.userData.targetId=id;
  group.add(torso);
  const chest=new THREE.Mesh(new THREE.CircleGeometry(.16,24),dark);
  chest.position.set(0,1.28,.122);chest.userData.targetId=id;group.add(chest);
  const bullseye=new THREE.Mesh(new THREE.CircleGeometry(.072,24),white);
  bullseye.position.set(0,1.28,.128);bullseye.userData.targetId=id;group.add(bullseye);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.233,12,10),i%2?green:orange);
  head.position.set(0,1.99,0);head.userData.targetId=id;head.userData.hitZone="head";group.add(head);
  scene.add(group);
  targets.push({id,group,downTime:0,hits:0});
 }
 return targets;
}

export function createShotEffects(THREE,scene){
 const impacts=[];
 const black=new THREE.MeshBasicMaterial({color:0x0a151a,polygonOffset:true,
  polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 const hitMat=new THREE.MeshBasicMaterial({color:0x8bffd8,polygonOffset:true,
  polygonOffsetFactor:-1,polygonOffsetUnits:-1});
 return {
  mark(hit,target=false){
   const normal=hit.face?.normal?.clone().transformDirection(hit.object.matrixWorld)||
      new THREE.Vector3(0,0,1);
   const disc=new THREE.Mesh(new THREE.CircleGeometry(target?.055:.028,10),
     target?hitMat:black);
   disc.position.copy(hit.point).addScaledVector(normal,.015);
   disc.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);
   disc.renderOrder=2;
   scene.add(disc);
   impacts.push({disc,age:0});
   if(impacts.length>75){
    const old=impacts.shift();scene.remove(old.disc);old.disc.geometry.dispose();
   }
  },
  tick(dt){
   for(let i=impacts.length-1;i>=0;i--){
    impacts[i].age+=dt;
    if(impacts[i].age>9){
     const old=impacts.splice(i,1)[0];
     scene.remove(old.disc);old.disc.geometry.dispose();
    }
   }
  }
 };
}

export class WeaponAudio{
 constructor(){this.context=null;this.buffer=null;}
 connect(context){
  if(!context)return;
  this.context=context;
  if(!this.buffer){
   const b=context.createBuffer(1,Math.ceil(context.sampleRate*.22),context.sampleRate);
   const d=b.getChannelData(0);
   let seed=0x8d7d291;
   for(let i=0;i<d.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    d[i]=(seed/2147483648)-1;
   }
   this.buffer=b;
  }
 }
 fire(){
  const ctx=this.context;
  if(!ctx||ctx.state!=="running"||!this.buffer)return;
  const now=ctx.currentTime;
  const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
  src.buffer=this.buffer;
  filter.type="lowpass";filter.frequency.setValueAtTime(2800,now);
  filter.frequency.exponentialRampToValueAtTime(430,now+.18);
  gain.gain.setValueAtTime(.26,now);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.195);
  src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);
  src.start(now,Math.random()*.012,.20);
 }
}
