// W08.0 original low-poly powered exoskeleton visual kit.
// Rendering only: the damage, slot and entry rules live in power-armor.mjs.
import * as THREE from 'three';
import {POWER_ARMOR_SLOTS,getPowerPlate} from './power-armor.mjs';
export function buildPowerArmorVisual(scene,position,state){
  const root=new THREE.Group();root.position.set(position.x,0,position.z);
  root.rotation.y=-Math.PI/2;scene.add(root);
  const metal=new THREE.MeshStandardMaterial({color:0x344750,roughness:.55,metalness:.73});
  const dark=new THREE.MeshStandardMaterial({color:0x18292f,roughness:.64,metalness:.7});
  const trim=new THREE.MeshStandardMaterial({color:0xb5a889,roughness:.42,metalness:.68});
  const glow=new THREE.MeshBasicMaterial({color:0x8ad3bd});
  const joint=new THREE.MeshStandardMaterial({color:0x74817d,roughness:.45,metalness:.8});
  const group=(parent,x=0,y=0,z=0)=>{
    const node=new THREE.Group();node.position.set(x,y,z);parent.add(node);return node;
  };
  const part=(parent,g,m,x=0,y=0,z=0)=>{
    const a=new THREE.Mesh(g,m);a.position.set(x,y,z);
    a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;
  };
  const block=(parent,w,h,d,m,x=0,y=0,z=0)=>
    part(parent,new THREE.BoxGeometry(w,h,d),m,x,y,z);
  const ball=(parent,r,m,x=0,y=0,z=0)=>
    part(parent,new THREE.SphereGeometry(r,12,9),m,x,y,z);
  const bar=(parent,r1,r2,h,m,x,y,z)=>
    part(parent,new THREE.CylinderGeometry(r1,r2,h,10),m,x,y,z);
  const plateMeshes=Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>[slot,[]]));
  const armor=(slot,parent,geometry,x,y,z)=>{
    const material=new THREE.MeshStandardMaterial({color:0x747c73,roughness:.48,metalness:.76});
    const mesh=part(parent,geometry,material,x,y,z);
    plateMeshes[slot].push(mesh);return mesh;
  };
  // The chassis remains fully recognisable with every plate removed.
  block(root,.72,.91,.40,dark,0,1.55,0);
  block(root,.54,.71,.49,metal,0,1.55,-.025);
  for(const side of [-1,1]){
    block(root,.085,.80,.34,trim,side*.34,1.57,-.01);
    bar(root,.038,.038,.77,joint,side*.35,1.56,.18);
    ball(root,.16,dark,side*.62,1.90,0);
    ball(root,.09,joint,side*.64,1.9,.01);
  }
  // Front half-doors swing outward during entry and exit, leaving an
  // actual opening instead of making the pilot clip through a closed suit.
  const doors={
    left:group(root,-.055,1.59,.23),
    right:group(root,.055,1.59,.23)
  };
  for(const [side,key] of [[-1,'left'],[1,'right']]){
    const door=doors[key];
    block(door,.29,.65,.12,metal,side*.145,0,.06);
    armor('chest',door,new THREE.BoxGeometry(.32,.67,.12),
      side*.145,0,.15);
    block(door,.045,.65,.15,trim,side*.29,0,.11);
  }
  const helmetPivot=group(root,0,1.97,-.02);
  ball(helmetPivot,.22,dark,0,.21,0);
  block(helmetPivot,.43,.18,.38,metal,0,.27,-.025);
  block(helmetPivot,.34,.11,.065,glow,0,.22,.205);
  armor('head',helmetPivot,new THREE.SphereGeometry(.274,16,12,
    0,Math.PI*2,0,Math.PI*.68),0,.23,0);
  armor('head',helmetPivot,new THREE.BoxGeometry(.38,.11,.08),0,.20,.255);
  // Neck cable and armored hip cage.
  bar(root,.095,.08,.18,dark,0,1.97,0);
  block(root,.67,.25,.42,metal,0,.97,0);
  for(const side of [-1,1]){
    const arm=group(root,side*.63,1.86,0);
    ball(arm,.14,joint,0,0,0);
    bar(arm,.075,.075,.62,metal,side*.025,-.37,0);
    block(arm,.16,.10,.20,trim,0,-.72,0);
    armor(side<0?'leftArm':'rightArm',arm,
      new THREE.BoxGeometry(.30,.68,.32),side*.025,-.35,.06);
    armor(side<0?'leftArm':'rightArm',arm,
      new THREE.BoxGeometry(.34,.20,.36),0,-.04,.075);
    const leg=group(root,side*.28,.95,0);
    ball(leg,.15,joint,0,0,0);
    bar(leg,.092,.108,.76,dark,0,-.43,0);
    // Two exposed piston rods on the side of each shin.
    for(const z of [-.09,.10]){
      bar(leg,.021,.021,.69,trim,side*.13,-.45,z);
      bar(leg,.037,.037,.20,metal,side*.13,-.70,z);
    }
    block(leg,.32,.14,.50,metal,0,-.91,.13);
    armor(side<0?'leftLeg':'rightLeg',leg,
      new THREE.BoxGeometry(.34,.79,.37),0,-.46,.085);
    armor(side<0?'leftLeg':'rightLeg',leg,
      new THREE.BoxGeometry(.38,.18,.46),0,-.81,.13);
    if(side===-1){root.userData.leftArm=arm;root.userData.leftLeg=leg;}
    else {root.userData.rightArm=arm;root.userData.rightLeg=leg;}
  }
  const core=bar(root,.14,.14,.12,trim,0,1.33,-.25);
  core.rotation.x=Math.PI/2;
  const coreLight=ball(root,.09,glow,0,1.33,-.34);
  const lamp=new THREE.PointLight(0x8de0bb,.6,2.5,2);
  lamp.position.set(0,1.35,-.35);root.add(lamp);
  function updatePlates(currentState){
    for(const slot of POWER_ARMOR_SLOTS){
      const piece=getPowerPlate(slot,currentState.plates[slot]);
      for(const mesh of plateMeshes[slot]){
        mesh.visible=piece.points>0;
        mesh.material.color.setHex(piece.color);
        mesh.scale.setScalar(Math.max(.1,piece.scale));
      }
    }
  }
  function animate(phase='idle',progress=0,time=0){
    const opening=phase==='entering'||phase==='exiting'?
      Math.sin(Math.PI*Math.max(0,Math.min(1,progress))):0;
    doors.left.rotation.y=-opening*.95;
    doors.right.rotation.y=opening*.95;
    helmetPivot.rotation.x=-opening*.65;
    root.userData.leftArm.rotation.z=-opening*.35+
      Math.sin(time*1.65)*.008;
    root.userData.rightArm.rotation.z=opening*.35-
      Math.sin(time*1.65)*.008;
    for(const leg of [root.userData.leftLeg,root.userData.rightLeg])
      leg.rotation.x=Math.sin(time*1.3)*.008;
    coreLight.scale.setScalar(1+Math.sin(time*5)*.06);
    lamp.intensity=.55+opening*.85;
  }
  updatePlates(state);
  return {root,doors,helmetPivot,plateMeshes,updatePlates,animate};
}
// Small 3D cockpit silhouettes at the margins, leaving the optic clear.
export function buildPowerArmorCockpit(camera){
  const group=new THREE.Group();camera.add(group);
  const shell=new THREE.MeshStandardMaterial({color:0x233c43,roughness:.47,metalness:.75});
  const glass=new THREE.MeshBasicMaterial({color:0x8dcbb2,transparent:true,opacity:.35,depthWrite:false});
  for(const side of [-1,1]){
    const beam=new THREE.Mesh(new THREE.BoxGeometry(.084,.42,.13),shell);
    beam.position.set(side*.35,-.03,-.47);beam.rotation.z=-side*.11;
    group.add(beam);
    const led=new THREE.Mesh(new THREE.BoxGeometry(.009,.17,.02),glass);
    led.position.set(side*.31,-.045,-.392);group.add(led);
  }
  const breast=new THREE.Mesh(new THREE.BoxGeometry(.72,.19,.25),shell);
  breast.position.set(0,-.45,-.63);group.add(breast);
  group.visible=false;
  return group;
}
