// W08.1: oversized six-slot industrial power armor and a visible pilot-entry sequence.
// Gameplay, plate ratings and persistence are owned by power-armor.mjs.
import * as THREE from 'three';
import {POWER_ARMOR_SLOTS,getPowerPlate} from './power-armor.mjs';

export function buildPowerArmorVisual(scene,position,state){
  const root=new THREE.Group();
  root.position.set(position.x,0,position.z);
  root.rotation.y=-Math.PI/2;
  scene.add(root);
  const iron=new THREE.MeshStandardMaterial({color:0x34464c,roughness:.52,metalness:.76});
  const gunmetal=new THREE.MeshStandardMaterial({color:0x17282f,roughness:.59,metalness:.74});
  const bright=new THREE.MeshStandardMaterial({color:0x9faaa0,roughness:.36,metalness:.85});
  const brass=new THREE.MeshStandardMaterial({color:0xb79b63,roughness:.45,metalness:.69});
  const rubber=new THREE.MeshStandardMaterial({color:0x111d23,roughness:.96,metalness:.08});
  const visor=new THREE.MeshStandardMaterial({color:0x102f38,roughness:.19,metalness:.63,emissive:0x17677b,emissiveIntensity:.5});
  const illuminated=new THREE.MeshBasicMaterial({color:0x88e1ce});
  const mount=(parent,x=0,y=0,z=0)=>{
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;
  };
  const mesh=(parent,geometry,material,x=0,y=0,z=0)=>{
    const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  };
  const box=(parent,w,h,d,mat,x=0,y=0,z=0)=>
    mesh(parent,new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  const cylinder=(parent,r1,r2,h,mat,x=0,y=0,z=0)=>
    mesh(parent,new THREE.CylinderGeometry(r1,r2,h,12),mat,x,y,z);
  const sphere=(parent,r,mat,x=0,y=0,z=0)=>
    mesh(parent,new THREE.SphereGeometry(r,16,12),mat,x,y,z);
  const bevel=(parent,w,h,d,mat,x=0,y=0,z=0,tip=.13)=>{
    const s=new THREE.Shape();
    s.moveTo(-w/2+tip,-h/2);s.lineTo(w/2-tip,-h/2);
    s.lineTo(w/2,-h/2+tip);s.lineTo(w/2,h/2-tip);
    s.lineTo(w/2-tip,h/2);s.lineTo(-w/2+tip,h/2);
    s.lineTo(-w/2,h/2-tip);s.lineTo(-w/2,-h/2+tip);s.closePath();
    const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,
      bevelSegments:1,steps:1,bevelThickness:.025,bevelSize:.03});
    geo.translate(0,0,-d/2);
    return mesh(parent,geo,mat,x,y,z);
  };
  const strut=(parent,a,b,r,mat)=>{
    const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);
    const diff=to.clone().sub(from);
    const shaft=mesh(parent,new THREE.CylinderGeometry(r,r,diff.length(),10),mat,
      (from.x+to.x)/2,(from.y+to.y)/2,(from.z+to.z)/2);
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());
    return shaft;
  };
  const plateMeshes=Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>[slot,[]]));
  const plating=(slot,parent,w,h,d,x,y,z,tip=.12)=>{
    const material=iron.clone();
    const piece=bevel(parent,w,h,d,material,x,y,z,tip);
    plateMeshes[slot].push(piece);return piece;
  };

  // The empty exoskeleton is 3.3m tall and almost 3m across; the person
  // entering is deliberately only 1.72m tall.
  box(root,1.50,1.29,.85,gunmetal,0,1.87,-.18);
  bevel(root,1.52,1.36,.19,iron,0,1.88,-.58,.22);
  box(root,.78,.98,.10,rubber,0,1.75,.32); // visible open cockpit, not a solid mannequin
  bevel(root,.58,.91,.08,bright,0,1.78,.38,.09); // the pilot's seat
  for(const side of [-1,1]){
    strut(root,[side*.67,1.26,-.42],[side*.75,2.61,-.42],.075,bright);
    strut(root,[side*.49,1.16,.1],[side*.56,2.45,.26],.045,brass);
    bevel(root,.31,.48,.45,iron,side*.60,1.10,-.14,.07);
    box(root,.16,.92,.12,rubber,side*.34,1.81,.45);
    cylinder(root,.13,.13,.08,brass,side*.73,2.48,-.08).rotation.z=Math.PI/2;
  }
  // Rear reactor, exhaust stacks and exposed hydraulic return lines.
  const reactor=cylinder(root,.36,.36,.18,bright,0,1.76,-.76);
  reactor.rotation.x=Math.PI/2;
  sphere(root,.24,illuminated,0,1.76,-.87);
  for(const side of [-1,1]){
    box(root,.22,.83,.24,iron,side*.54,2.00,-.71);
    cylinder(root,.11,.14,.45,gunmetal,side*.53,2.54,-.73);
    strut(root,[side*.45,2.53,-.58],[side*.79,2.30,-.30],.045,rubber);
    sphere(root,.16,brass,side*.65,1.48,-.68);
  }
  // Front armored breastplate separates at a central seam. Each panel
  // swings on a real offset hinge, revealing the human-scale entry cavity.
  const doors={left:mount(root,-.045,1.87,.47),right:mount(root,.045,1.87,.47)};
  for(const [side,key] of [[-1,'left'],[1,'right']]){
    const door=doors[key];
    const center=side*.365;
    bevel(door,.69,1.12,.17,iron,center,0,.04,.14);
    plating('chest',door,.72,1.14,.12,center,0,.18,.16);
    bevel(door,.15,1.1,.08,brass,side*.68,0,.24,.03);
    cylinder(door,.048,.048,1.2,bright,side*.04,0,-.04);
    bevel(door,.28,.22,.09,gunmetal,center,-.30,.27,.05);
  }
  // Helmet is mounted ABOVE the entry cavity, on a rear mechanical collar.
  const helmetPivot=mount(root,0,2.74,-.19);
  cylinder(helmetPivot,.29,.35,.25,gunmetal,0,.04,0);
  bevel(helmetPivot,.77,.63,.58,iron,0,.35,-.03,.19);
  bevel(helmetPivot,.64,.22,.075,visor,0,.32,.30,.08);
  plating('head',helmetPivot,.80,.43,.11,0,.57,.08,.15);
  plating('head',helmetPivot,.66,.105,.11,0,.13,.35,.025);
  for(const side of [-1,1]){
    bevel(helmetPivot,.18,.37,.36,brass,side*.40,.23,.02,.05);
    cylinder(helmetPivot,.07,.07,.23,bright,side*.33,-.04,-.08);
  }

  const armPivots=[],legPivots=[];
  for(const side of [-1,1]){
    // Massive separate shoulder housings / pauldrons carry the arm actuators.
    const arm=mount(root,side*.99,2.48,-.06);armPivots.push(arm);
    sphere(arm,.29,gunmetal,0,0,0);
    cylinder(arm,.16,.16,.24,brass,0,0,0).rotation.z=Math.PI/2;
    bevel(arm,.71,.49,.73,iron,side*.12,-.12,0,.17);
    plating(side<0?'leftArm':'rightArm',arm,.77,.54,.78,side*.13,-.14,.03,.19);
    box(arm,.35,.68,.34,gunmetal,side*.11,-.63,0);
    cylinder(arm,.16,.16,.41,bright,side*.13,-.99,0);
    bevel(arm,.48,.57,.52,iron,side*.13,-.93,.10,.10);
    plating(side<0?'leftArm':'rightArm',arm,.50,.61,.18,side*.13,-.93,.39,.10);
    for(const z of [-.23,.23]){
      strut(arm,[side*.25,-.49,z],[side*.23,-1.12,z],.055,brass);
      cylinder(arm,.08,.08,.23,bright,side*.23,-.88,z);
    }
    // Powered gauntlets with individually recognizable metal fingers.
    bevel(arm,.51,.33,.55,gunmetal,side*.13,-1.37,.06,.10);
    for(let i=-1;i<=1;i++)
      box(arm,.095,.18,.25,bright,side*.12+i*.15,-1.59,.14);
    // Hip and leg mechanisms are independently jointed.
    const leg=mount(root,side*.41,1.23,-.18);legPivots.push(leg);
    sphere(leg,.24,gunmetal,0,0,0);
    bevel(leg,.54,.63,.57,iron,0,-.30,-.04,.14);
    plating(side<0?'leftLeg':'rightLeg',leg,.60,.66,.32,0,-.33,.28,.13);
    cylinder(leg,.20,.20,.18,brass,0,-.68,0);
    bevel(leg,.61,.68,.65,iron,0,-.88,-.045,.14);
    plating(side<0?'leftLeg':'rightLeg',leg,.64,.66,.18,0,-.88,.34,.15);
    for(const x of [-.28,.28]){
      strut(leg,[x,-.25,-.14],[x,-1.09,-.19],.056,bright);
      cylinder(leg,.073,.073,.32,gunmetal,x,-.70,-.19);
    }
    bevel(leg,.67,.32,.89,gunmetal,0,-1.10,.19,.13);
    bevel(leg,.62,.12,.38,brass,0,-1.18,.52,.07);
    for(const x of [-.21,0,.21])
      box(leg,.08,.035,.18,bright,x,-1.29,.58);
  }
  // Manufacturer-like machine markings and warning bands, away from the neck.
  bevel(root,.30,.09,.045,brass,0,1.20,.28,.02);
  bevel(root,.25,.065,.04,illuminated,0,2.46,.47,.02);
  const light=new THREE.PointLight(0x69d4cf,.75,4.5,2);
  light.position.set(0,1.92,.20);root.add(light);

  // Independent unarmored human-scale pilot: seen walking up the front ramp,
  // lifting a foot into the cockpit, then being sealed inside the frame.
  const pilot=mount(root,0,0,1.86);
  const suit=new THREE.MeshStandardMaterial({color:0x59645d,roughness:.91,metalness:.12});
  const cloth=new THREE.MeshStandardMaterial({color:0x292f30,roughness:.98});
  const skin=new THREE.MeshStandardMaterial({color:0x9d7b61,roughness:.95});
  const harness=new THREE.MeshStandardMaterial({color:0xc8a665,roughness:.77});
  const hips=mount(pilot,0,.97,0);
  box(hips,.41,.17,.22,cloth,0,0,0);
  const pilotBody=mount(pilot,0,1.08,0);
  bevel(pilotBody,.51,.66,.27,suit,0,.13,0,.10);
  box(pilotBody,.10,.59,.035,harness,0,.11,.165);
  for(const side of [-1,1]){
    box(pilotBody,.22,.08,.06,cloth,side*.16,.34,.16);
  }
  const pilotHead=mount(pilotBody,0,.60,0);
  sphere(pilotHead,.155,skin,0,0,0);
  bevel(pilotHead,.28,.075,.21,cloth,0,.115,-.02,.035);
  const pilotArms=[],pilotLegs=[];
  for(const side of [-1,1]){
    const arm=mount(pilotBody,side*.32,.39,0);pilotArms.push(arm);
    box(arm,.18,.55,.18,suit,0,-.27,0);
    box(arm,.18,.12,.19,cloth,0,-.53,0);
    const leg=mount(hips,side*.13,-.06,0);pilotLegs.push(leg);
    box(leg,.21,.73,.23,suit,0,-.39,0);
    bevel(leg,.23,.14,.39,cloth,0,-.78,.09,.04);
  }
  pilot.visible=false;

  function updatePlates(currentState){
    for(const slot of POWER_ARMOR_SLOTS){
      const plate=getPowerPlate(slot,currentState.plates[slot]);
      for(const panel of plateMeshes[slot]){
        panel.visible=plate.points>0;
        panel.material.color.setHex(plate.color);
        panel.scale.setScalar(plate.points>0 ? Math.min(1.11,.96+plate.scale*.08):1);
      }
    }
  }
  const ease=(a,b,t)=>{
    const v=Math.max(0,Math.min(1,(t-a)/(b-a)));
    return v*v*(3-2*v);
  };
  function animate(phase='idle',progress=0,time=0){
    const transitioning=phase==='entering'||phase==='exiting';
    const t=Math.max(0,Math.min(1,progress));
    const open=transitioning?ease(0,.23,t)*(1-ease(.76,1,t)):0;
    doors.left.rotation.y=open*1.40;
    doors.right.rotation.y=-open*1.40;
    helmetPivot.rotation.x=-open*.58;
    armPivots[0].rotation.z=-open*.22;
    armPivots[1].rotation.z=open*.22;
    for(const leg of legPivots)leg.rotation.x=Math.sin(time*1.5)*.006;
    light.intensity=.65+open*.9;
    pilot.visible=transitioning;
    if(transitioning){
      const move=ease(.19,.81,t);
      const journey=phase==='entering'?move:1-move;
      pilot.position.z=1.86-journey*1.65;
      pilot.position.y=.29*Math.sin(Math.PI*journey);
      pilotBody.rotation.x=-.21*Math.sin(Math.PI*journey);
      pilotHead.rotation.x=.12*Math.sin(Math.PI*journey);
      const stepping=Math.sin(Math.PI*4*journey);
      pilotLegs[0].rotation.x=.45*Math.max(0,stepping);
      pilotLegs[1].rotation.x=.45*Math.max(0,-stepping);
      pilotArms[0].rotation.x=-.65*Math.sin(Math.PI*journey);
      pilotArms[1].rotation.x=-.65*Math.sin(Math.PI*journey);
      pilotArms[0].rotation.z=-.27*Math.sin(Math.PI*journey);
      pilotArms[1].rotation.z=.27*Math.sin(Math.PI*journey);
    }
  }
  updatePlates(state);
  // Exclude the human when measuring suit proportions.
  const originalYaw=root.rotation.y;
  root.rotation.y=0;root.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(root);
  const size=bounds.getSize(new THREE.Vector3());
  root.rotation.y=originalYaw;root.updateMatrixWorld(true);
  return {root,doors,helmetPivot,plateMeshes,pilot,size,updatePlates,animate};
}

// First-person visor/shoulder frame, shaped to leave the sights unobscured.
export function buildPowerArmorCockpit(camera){
  const group=new THREE.Group();camera.add(group);
  const shell=new THREE.MeshStandardMaterial({color:0x233840,roughness:.47,metalness:.79});
  const glass=new THREE.MeshBasicMaterial({color:0x82ddc4,transparent:true,opacity:.30,depthWrite:false});
  for(const side of [-1,1]){
    const beam=new THREE.Mesh(new THREE.BoxGeometry(.12,.47,.18),shell);
    beam.position.set(side*.37,-.04,-.49);beam.rotation.z=-side*.13;
    group.add(beam);
    const led=new THREE.Mesh(new THREE.BoxGeometry(.012,.19,.025),glass);
    led.position.set(side*.32,-.07,-.388);group.add(led);
  }
  const breast=new THREE.Mesh(new THREE.BoxGeometry(.80,.21,.29),shell);
  breast.position.set(0,-.48,-.67);group.add(breast);
  group.visible=false;
  return group;
}
