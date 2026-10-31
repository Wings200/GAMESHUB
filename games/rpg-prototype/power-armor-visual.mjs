// W08.3: a compact, fully armored industrial exosuit. Original procedural art.
// Slot visuals, pilot, hinged entry and cockpit remain independent of gameplay.
import * as THREE from 'three';
import {POWER_ARMOR_SLOTS,getPowerPlate} from './power-armor.mjs';

export function buildPowerArmorVisual(scene,position,state){
  const root=new THREE.Group();
  root.position.set(position.x,0,position.z);
  root.rotation.y=-Math.PI/2;
  scene.add(root);
  const steel=new THREE.MeshStandardMaterial({color:0x55636a,metalness:.69,roughness:.48});
  const armor=new THREE.MeshStandardMaterial({color:0x556b64,metalness:.55,roughness:.64});
  const shaded=new THREE.MeshStandardMaterial({color:0x32464c,metalness:.65,roughness:.60});
  const edge=new THREE.MeshStandardMaterial({color:0x9aa7a2,metalness:.82,roughness:.39});
  const joint=new THREE.MeshStandardMaterial({color:0x111c20,metalness:.25,roughness:.92});
  const brass=new THREE.MeshStandardMaterial({color:0xa58c62,metalness:.76,roughness:.47});
  const orange=new THREE.MeshStandardMaterial({color:0xbb874e,metalness:.5,roughness:.59});
  const visor=new THREE.MeshStandardMaterial({
    color:0x182f34,metalness:.61,roughness:.22,emissive:0x3a967e,emissiveIntensity:.34
  });
  const glow=new THREE.MeshBasicMaterial({color:0x8bcbb4});
  const makeGroup=(parent,x=0,y=0,z=0)=>{
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;
  };
  const mesh=(parent,geometry,material,x=0,y=0,z=0)=>{
    const m=new THREE.Mesh(geometry,material);
    m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;
    parent.add(m);return m;
  };
  const box=(parent,w,h,d,material,x=0,y=0,z=0)=>
    mesh(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);
  const cyl=(parent,rTop,rBottom,h,material,x=0,y=0,z=0,n=12)=>
    mesh(parent,new THREE.CylinderGeometry(rTop,rBottom,h,n),material,x,y,z);
  const ball=(parent,r,material,x=0,y=0,z=0)=>
    mesh(parent,new THREE.SphereGeometry(r,14,10),material,x,y,z);
  const ellipsoid=(parent,xr,yr,zr,material,x=0,y=0,z=0)=>{
    const m=ball(parent,1,material,x,y,z);m.scale.set(xr,yr,zr);return m;
  };
  // Contoured armor shell: a softened eight-point forged plate with a
  // beveled thickness, not a flat box suspended in front of the body.
  const forged=(parent,w,h,d,material,x=0,y=0,z=0,cut=.15)=>{
    const shape=new THREE.Shape();
    const a=w/2,b=h/2,c=Math.min(cut,a*.50,b*.50);
    shape.moveTo(-a+c,-b);
    shape.lineTo(a-c,-b);shape.lineTo(a,-b+c);
    shape.lineTo(a,b-c);shape.lineTo(a-c,b);
    shape.lineTo(-a+c,b);shape.lineTo(-a,b-c);
    shape.lineTo(-a,-b+c);shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{
      depth:d,bevelEnabled:true,bevelThickness:.022,bevelSize:.025,
      bevelSegments:2,steps:1,curveSegments:2
    });
    geo.translate(0,0,-d/2);
    return mesh(parent,geo,material,x,y,z);
  };
  const rod=(parent,a,b,r,material)=>{
    const one=new THREE.Vector3(...a),two=new THREE.Vector3(...b);
    const v=two.clone().sub(one);
    const m=cyl(parent,r,r,v.length(),material,
      (one.x+two.x)/2,(one.y+two.y)/2,(one.z+two.z)/2,10);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
    return m;
  };
  // Curved metal hoses are independent from movable armor.
  const hose=(parent,points,r,material)=>{
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return mesh(parent,new THREE.TubeGeometry(curve,18,r,7,false),material);
  };
  const plateMeshes=Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>[slot,[]]));
  const plate=(slot,parent,w,h,d,x,y,z,cut=.12)=>{
    const shell=forged(parent,w,h,d,armor.clone(),x,y,z,cut);
    plateMeshes[slot].push(shell);
    return shell;
  };
  const bolt=(parent,x,y,z)=>{
    const m=cyl(parent,.027,.027,.012,brass,x,y,z,8);
    m.rotation.x=Math.PI/2;
    return m;
  };

  // Human-scale cavity, encased by side rails and a rear spine.
  // No solid 1.5m-wide cuboid behind the hinged breastplates.
  const spine=forged(root,.75,1.11,.21,shaded,0,1.83,-.42,.16);
  forged(root,.87,.24,.39,steel,0,1.29,-.13,.07); // pelvic harness
  ellipsoid(root,.46,.30,.37,joint,0,1.41,-.13);
  for(const side of [-1,1]){
    rod(root,[side*.43,1.30,-.29],[side*.55,2.46,-.29],.073,edge);
    rod(root,[side*.33,1.33,.10],[side*.56,2.24,.09],.051,steel);
    forged(root,.22,.49,.28,shaded,side*.48,1.52,-.27,.06);
    hose(root,[[side*.52,1.48,-.35],[side*.60,1.75,-.49],
      [side*.55,2.18,-.37],[side*.48,2.31,-.31]],.046,joint);
  }
  // Compact backpack reactor, vent banks and luminous power-core iris.
  const reactor=makeGroup(root,0,1.90,-.60);
  cyl(reactor,.34,.34,.21,steel,0,0,0).rotation.x=Math.PI/2;
  cyl(reactor,.255,.255,.025,joint,0,0,-.125).rotation.x=Math.PI/2;
  cyl(reactor,.135,.135,.027,glow,0,0,-.149).rotation.x=Math.PI/2;
  for(let i=0;i<8;i++){
    const a=2*Math.PI*i/8;
    const vane=box(reactor,.058,.118,.032,brass,
      Math.cos(a)*.20,Math.sin(a)*.20,-.154);
    vane.rotation.z=a;
  }
  for(const side of [-1,1]){
    const tank=forged(root,.23,.72,.33,steel,side*.52,1.99,-.52,.06);
    for(let i=0;i<4;i++)box(root,.245,.038,.11,joint,side*.52,
      1.77+i*.145,-.714);
    hose(root,[[side*.52,2.23,-.53],[side*.75,2.34,-.48],
      [side*.79,2.22,-.23]],.055,joint);
  }
  // Waist protection remains part of the fixed frame, even without plates.
  for(const side of [-1,1]){
    forged(root,.41,.28,.43,steel,side*.44,1.27,.08,.10);
    forged(root,.27,.26,.14,shaded,side*.56,1.16,.18,.06);
  }

  // Wing doors now visually resemble two sculpted halves of a breastplate.
  const doors={left:makeGroup(root,-.68,1.93,.33),
    right:makeGroup(root,.68,1.93,.33)};
  for(const [side,key] of [[-1,'left'],[1,'right']]){
    const door=doors[key];
    const cx=-side*.33;
    forged(door,.67,1.01,.19,steel,cx,0,.055,.17);
    plate('chest',door,.67,.85,.115,cx,.06,.18,.16);
    forged(door,.51,.18,.16,shaded,cx,-.34,.23,.06);
    // Upper and lower reinforcement ribs cross the chest without becoming
    // an uninterrupted square slab.
    forged(door,.39,.12,.08,edge,cx,.33,.265,.045);
    box(door,.065,.55,.041,joint,cx+side*.16,-.01,.276);
    forged(door,.21,.16,.065,orange,cx,-.17,.282,.04);
    for(const y of [-.39,.38])bolt(door,cx+side*.18,y,.29);
    cyl(door,.047,.047,1.07,brass,-side*.02,0,-.08);
  }
  // Helmet: armored jaw, brow ridge, horizontal illuminated eye band,
  // dual cheek filters and respirator; no floating rectangular robot head.
  const helmetPivot=makeGroup(root,0,2.36,-.08);
  ellipsoid(helmetPivot,.38,.35,.38,joint,0,.10,0);
  forged(helmetPivot,.69,.47,.51,steel,0,.21,.025,.18);
  forged(helmetPivot,.66,.16,.18,edge,0,.37,.23,.055);
  forged(helmetPivot,.56,.12,.095,visor,0,.19,.306,.035);
  forged(helmetPivot,.45,.16,.19,shaded,0,.055,.29,.05);
  forged(helmetPivot,.24,.20,.12,steel,0,-.035,.39,.05);
  plate('head',helmetPivot,.68,.22,.13,0,.43,.08,.075);
  plate('head',helmetPivot,.57,.13,.095,0,-.12,.27,.045);
  for(const side of [-1,1]){
    ellipsoid(helmetPivot,.17,.19,.20,steel,side*.34,.04,.15);
    cyl(helmetPivot,.11,.11,.07,joint,side*.32,-.045,.345).rotation.x=Math.PI/2;
    for(let i=0;i<3;i++)box(helmetPivot,.15,.018,.037,edge,
      side*.32,-.087+i*.039,.383);
    hose(root,[[side*.35,2.36,.19],[side*.53,2.24,.07],
      [side*.62,2.04,-.21]],.04,joint);
  }
  // Neck seal and bolted shoulder collar.
  cyl(root,.28,.34,.22,joint,0,2.31,-.14,12);
  forged(root,.91,.17,.47,steel,0,2.36,-.24,.05);

  const armPivots=[],legPivots=[];
  for(const side of [-1,1]){
    const armName=side<0?'leftArm':'rightArm';
    const legName=side<0?'leftLeg':'rightLeg';
    // Broad but rounded shoulder cups with segmented biceps, black rubber
    // elbow gap, forged forearm guards, and articulated mechanical hands.
    const arm=makeGroup(root,side*.86,2.26,-.11);armPivots.push(arm);
    ball(arm,.25,joint);
    cyl(arm,.16,.16,.26,edge,0,0,0).rotation.z=Math.PI/2;
    ellipsoid(arm,.43,.30,.38,steel,side*.07,-.09,.0);
    plate(armName,arm,.69,.33,.37,side*.08,-.13,.27,.13);
    forged(arm,.33,.52,.33,shaded,side*.07,-.53,.04,.09);
    rod(arm,[side*.20,-.26,-.12],[side*.18,-.79,-.12],.055,edge);
    rod(arm,[side*.07,-.29,.23],[side*.07,-.79,.22],.043,brass);
    ellipsoid(arm,.20,.21,.20,joint,side*.08,-.85,.04);
    forged(arm,.42,.52,.46,steel,side*.08,-1.10,.08,.10);
    plate(armName,arm,.43,.48,.15,side*.08,-1.08,.32,.10);
    for(let i=-1;i<=1;i++){
      const finger=forged(arm,.106,.23,.18,steel,
        side*.08+i*.112,-1.46,.20,.038);
      finger.rotation.x=.10;
      box(arm,.075,.032,.155,joint,
        side*.08+i*.112,-1.57,.22);
    }
    // Legs: visible hip pistons, armored quads, recessed knee pivots,
    // shin shells and broad planted boots.
    const leg=makeGroup(root,side*.41,1.27,-.16);legPivots.push(leg);
    ball(leg,.23,joint);
    ellipsoid(leg,.26,.37,.27,shaded,0,-.31,.04);
    plate(legName,leg,.45,.49,.25,0,-.33,.285,.105);
    rod(leg,[side*.23,-.11,-.10],[side*.22,-.70,-.10],.051,edge);
    rod(leg,[-side*.17,-.10,.21],[-side*.17,-.67,.21],.043,brass);
    ellipsoid(leg,.21,.18,.21,joint,0,-.71,.06);
    cyl(leg,.13,.13,.14,brass,0,-.71,.24).rotation.x=Math.PI/2;
    ellipsoid(leg,.29,.35,.31,steel,0,-1.02,.045);
    plate(legName,leg,.49,.56,.19,0,-1.03,.32,.115);
    for(const x of [-.20,.20]){
      rod(leg,[x,-.79,-.08],[x,-1.25,-.07],.047,edge);
    }
    const boot=forged(leg,.64,.24,.78,shaded,0,-1.28,.21,.095);
    forged(leg,.57,.095,.20,steel,0,-1.37,.50,.035);
    for(const x of [-.20,0,.20])box(leg,.095,.035,.13,edge,x,-1.40,.56);
  }
  // Stencil markings on the front face of the machine.
  const badgeCanvas=document.createElement('canvas');badgeCanvas.width=256;badgeCanvas.height=96;
  const ctx=badgeCanvas.getContext('2d');
  ctx.fillStyle='#27383a';ctx.fillRect(0,0,256,96);
  ctx.strokeStyle='#bd995f';ctx.lineWidth=4;ctx.strokeRect(6,6,244,84);
  ctx.font='bold 47px monospace';ctx.fillStyle='#ddceb2';ctx.textAlign='center';
  ctx.fillText('PWR-09',128,62);
  const badgeTexture=new THREE.CanvasTexture(badgeCanvas);
  badgeTexture.colorSpace=THREE.SRGBColorSpace;
  const badgeMesh=mesh(root,new THREE.PlaneGeometry(.47,.175),
    new THREE.MeshBasicMaterial({map:badgeTexture,side:THREE.DoubleSide}),
    0,1.21,.19);
  const warningLight=new THREE.PointLight(0x7bdac6,.45,3,2);
  warningLight.position.set(0,2.31,.25);root.add(warningLight);

  // Articulated human pilot is much smaller than the armor: visible during
  // the existing approach/climb/exit choreography, not a second armored bot.
  const pilot=makeGroup(root,0,0,1.72);
  const uniform=new THREE.MeshStandardMaterial({color:0x657166,roughness:.93});
  const fabric=new THREE.MeshStandardMaterial({color:0x30383a,roughness:1});
  const skin=new THREE.MeshStandardMaterial({color:0x9f8065,roughness:.96});
  const belt=new THREE.MeshStandardMaterial({color:0x9c8e69,roughness:.82});
  const hips=makeGroup(pilot,0,.98,0);
  ellipsoid(hips,.23,.13,.14,fabric,0,0,0);
  const pilotBody=makeGroup(pilot,0,1.06,0);
  ellipsoid(pilotBody,.28,.39,.18,uniform,0,.16,0);
  box(pilotBody,.075,.58,.032,belt,0,.12,.184);
  const pilotHead=makeGroup(pilotBody,0,.65,0);
  ellipsoid(pilotHead,.15,.18,.16,skin);
  forged(pilotHead,.30,.09,.28,fabric,0,.17,-.015,.04);
  const pilotArms=[],pilotLegs=[];
  for(const side of [-1,1]){
    const arm=makeGroup(pilotBody,side*.30,.42,0);pilotArms.push(arm);
    ellipsoid(arm,.11,.30,.10,uniform,0,-.28,0);
    ellipsoid(arm,.09,.095,.09,fabric,0,-.56,.01);
    const leg=makeGroup(hips,side*.14,-.06,0);pilotLegs.push(leg);
    ellipsoid(leg,.125,.38,.13,uniform,0,-.40,0);
    ellipsoid(leg,.13,.075,.21,fabric,0,-.77,.065);
  }
  pilot.visible=false;

  function updatePlates(currentState){
    for(const slot of POWER_ARMOR_SLOTS){
      const entry=getPowerPlate(slot,currentState.plates[slot]);
      for(const shell of plateMeshes[slot]){
        shell.visible=entry.points>0;
        shell.material.color.setHex(entry.color);
        shell.scale.setScalar(entry.points>0?Math.min(1.10,.95+entry.scale*.09):1);
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
    doors.left.rotation.y=-open*1.56;
    doors.right.rotation.y=open*1.56;
    helmetPivot.rotation.x=-open*.46;
    armPivots[0].rotation.z=-open*.16;
    armPivots[1].rotation.z=open*.16;
    for(const leg of legPivots)leg.rotation.x=Math.sin(time*1.2)*.004;
    warningLight.intensity=.45+open*.9;
    pilot.visible=transitioning;
    if(transitioning){
      const move=ease(.19,.81,t);
      const journey=phase==='entering'?move:1-move;
      pilot.position.z=1.72-journey*2.04;
      const climb=ease(.25,.65,journey);
      pilot.position.y=.16*climb+.18*Math.sin(Math.PI*journey);
      pilotBody.rotation.x=-.31*Math.sin(Math.PI*journey);
      pilotHead.rotation.x=.14*Math.sin(Math.PI*journey);
      const stepping=Math.sin(Math.PI*3.5*journey);
      pilotLegs[0].rotation.x=.63*Math.max(0,stepping);
      pilotLegs[1].rotation.x=.63*Math.max(0,-stepping);
      pilotArms[0].rotation.x=-.90*Math.sin(Math.PI*journey);
      pilotArms[1].rotation.x=-.90*Math.sin(Math.PI*journey);
      pilotArms[0].rotation.z=-.38*Math.sin(Math.PI*journey);
      pilotArms[1].rotation.z=.38*Math.sin(Math.PI*journey);
    }
  }
  updatePlates(state);
  // Measure in suit-local orientation, not the bay's -90-degree yaw.
  const originalYaw=root.rotation.y;
  const pilotWasVisible=pilot.visible;
  pilot.visible=false;root.rotation.y=0;root.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  root.rotation.y=originalYaw;root.updateMatrixWorld(true);
  pilot.visible=pilotWasVisible;
  return {root,doors,helmetPivot,plateMeshes,pilot,size,updatePlates,animate};
}

// The full helmet is a world model; the first-person visor is a very slim
// visual hint, not two giant panels crossing the firing line.
export function buildPowerArmorCockpit(camera){
  const group=new THREE.Group();camera.add(group);
  const dark=new THREE.MeshBasicMaterial({color:0x263d40,transparent:true,opacity:.82});
  const indicator=new THREE.MeshBasicMaterial({color:0x8ad5b0,transparent:true,opacity:.38,depthWrite:false});
  for(const side of [-1,1]){
    const strip=new THREE.Mesh(new THREE.BoxGeometry(.017,.14,.024),dark);
    strip.position.set(side*.83,-.25,-1.08);group.add(strip);
    const led=new THREE.Mesh(new THREE.BoxGeometry(.010,.073,.015),indicator);
    led.position.set(side*.81,-.25,-1.05);group.add(led);
  }
  group.visible=false;
  return group;
}
