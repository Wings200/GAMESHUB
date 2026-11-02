// W12.0: original ivory-steel exoskeleton with a rear-entry cage, mechanical limbs and a modular shell.
// Slot visuals, pilot, hinged entry and cockpit remain independent of gameplay.
import * as THREE from 'three';
import {POWER_ARMOR_SLOTS,getPowerPlate,plateCondition,hasFusionPower} from './power-armor.mjs';

export function buildPowerArmorVisual(scene,position,state){
  const root=new THREE.Group();
  root.position.set(position.x,0,position.z);
  root.rotation.y=-Math.PI/2;
  scene.add(root);
  const steel=new THREE.MeshStandardMaterial({color:0xaeb8af,metalness:.65,roughness:.53});
  const armor=new THREE.MeshStandardMaterial({color:0x556b64,metalness:.55,roughness:.64});
  const shaded=new THREE.MeshStandardMaterial({color:0x425157,metalness:.63,roughness:.61});
  const edge=new THREE.MeshStandardMaterial({color:0xdee0cd,metalness:.72,roughness:.43});
  const joint=new THREE.MeshStandardMaterial({color:0x263138,metalness:.33,roughness:.86});
  const brass=new THREE.MeshStandardMaterial({color:0xa58c62,metalness:.76,roughness:.47});
  const orange=new THREE.MeshStandardMaterial({color:0xaa523b,metalness:.62,roughness:.52});
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
  // Structural pistons, joints and rails remain; every decorative armor shell
  // belongs to a physical slot and vanishes when that slot is empty.
  const moduleMeshes=Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>[slot,[]]));
  const modulePart=(slot,part)=>{moduleMeshes[slot].push(part);return part;};
  // Each collected model changes the silhouette of its own plate, not the
  // whole frame. T-45 has cast ribs, T-60 gets double raised armor channels,
  // and T-01 has a faceted prototype chevron and vents.
  const plate=(slot,parent,w,h,d,x,y,z,cut=.12)=>{
    const shell=forged(parent,w,h,d,armor.clone(),x,y,z,cut);
    shell.userData.modelDetails={};
    function styling(tier,draw){
      const detail=makeGroup(shell,0,0,d/2+.045);
      detail.name=tier.toUpperCase()+'_'+slot+'_details';
      draw(detail);detail.visible=false;
      shell.userData.modelDetails[tier]=detail;
    }
    styling('t45',group=>{
      forged(group,w*.72,h*.13,.047,edge,0,-h*.19,0,.025);
      for(const sign of [-1,1]){
        const rivet=cyl(group,.027,.027,.027,brass,sign*w*.31,h*.23,.04,8);
        rivet.rotation.x=Math.PI/2;
      }
    });
    styling('t60',group=>{
      for(const sign of [-1,1]){
        forged(group,w*.15,h*.78,.09,edge,sign*w*.27,0,0,.018);
        forged(group,w*.08,h*.60,.045,shaded,sign*w*.27,0,.06,.012);
      }
      forged(group,w*.55,h*.13,.08,brass,0,h*.30,.02,.025);
    });
    styling('t01',group=>{
      forged(group,w*.56,h*.27,.12,shaded,0,h*.13,.01,.085);
      forged(group,w*.35,h*.14,.08,edge,0,-h*.11,.08,.045);
      for(let i=-1;i<=1;i++)
        forged(group,w*.09,h*.12,.10,brass,i*w*.19,-h*.27,.06,.02);
    });
    plateMeshes[slot].push(shell);
    return shell;
  };
  const bolt=(parent,x,y,z)=>{
    const m=cyl(parent,.027,.027,.012,brass,x,y,z,8);
    m.rotation.x=Math.PI/2;
    return m;
  };

  // The solid torso block is gone: a ribcage, sternum, waist bellows and
  // two rear upright rails form a continuous, back-accessible exoskeleton.
  const frameFeatures={torsoRibs:0,armLinks:0,legLinks:0,rearHatch:true};
  for(const side of [-1,1]){
    rod(root,[side*.36,1.36,-.39],[side*.43,2.48,-.43],.085,steel);
    rod(root,[side*.43,2.46,-.43],[side*.68,2.31,-.16],.08,edge);
    rod(root,[side*.66,2.28,.03],[side*.39,1.80,.29],.071,steel);
    rod(root,[side*.39,1.80,.29],[side*.26,1.42,.17],.058,edge);
    frameFeatures.torsoRibs+=2;
  }
  forged(root,.87,.24,.39,steel,0,1.29,-.13,.07);
  ellipsoid(root,.46,.25,.33,joint,0,1.40,-.13);
  rod(root,[0,2.36,.10],[0,1.74,.29],.09,edge);
  forged(root,.34,.38,.17,steel,0,2.05,.21,.07);
  for(const side of [-1,1]){
    rod(root,[0,2.29,.17],[side*.54,2.41,.04],.063,edge);
    rod(root,[side*.51,2.27,.12],[side*.24,1.84,.34],.056,steel);
    const brace=ellipsoid(root,.17,.20,.14,orange,side*.35,1.78,.28);
    brace.rotation.z=side*.25;
    cyl(root,.09,.09,.18,joint,side*.35,1.78,.40).rotation.x=Math.PI/2;
  }
  for(let i=0;i<5;i++){
    const rib=cyl(root,.31-i*.013,.32-i*.012,.067,i%2?shaded:joint,
      0,1.44+i*.078,-.16,18);
    rib.scale.z=.72;
  }
  const neckRing=mesh(root,new THREE.TorusGeometry(.31,.073,9,24),edge,0,2.56,-.14);
  neckRing.rotation.x=Math.PI/2;
  for(const side of [-1,1]){
    ellipsoid(root,.14,.16,.18,orange,side*.66,2.29,-.16);
    cyl(root,.082,.082,.16,brass,side*.66,2.28,.01).rotation.x=Math.PI/2;
  }
  for(const side of [-1,1]){
    rod(root,[side*.43,1.30,-.29],[side*.55,2.46,-.29],.073,edge);
    rod(root,[side*.33,1.33,.10],[side*.56,2.24,.09],.051,steel);
    forged(root,.22,.49,.28,shaded,side*.48,1.52,-.27,.06);
    hose(root,[[side*.52,1.48,-.35],[side*.60,1.75,-.49],
      [side*.55,2.18,-.37],[side*.48,2.31,-.31]],.046,joint);
  }
  // Compact backpack reactor, vent banks and luminous power-core iris.
  const reactor=makeGroup(root,.67,1.95,-.63);
  cyl(reactor,.34,.34,.21,steel,0,0,0).rotation.x=Math.PI/2;
  cyl(reactor,.255,.255,.025,joint,0,0,-.125).rotation.x=Math.PI/2;
  const coreLight=cyl(reactor,.135,.135,.027,glow.clone(),0,0,-.149);
  coreLight.rotation.x=Math.PI/2;
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

  // Chest armor remains mounted at the FRONT while the back opens for entry.
  const chestMounts={left:makeGroup(root,-.68,1.93,.33),
    right:makeGroup(root,.68,1.93,.33)};
  for(const [side,key] of [[-1,'left'],[1,'right']]){
    const door=chestMounts[key];
    const cx=-side*.33;
    modulePart('chest',forged(door,.67,1.01,.19,steel,cx,0,.055,.17));
    plate('chest',door,.67,.85,.115,cx,.06,.18,.16);
    modulePart('chest',forged(door,.51,.18,.16,shaded,cx,-.34,.23,.06));
    // Upper and lower reinforcement ribs cross the chest without becoming
    // an uninterrupted square slab.
    modulePart('chest',forged(door,.39,.12,.08,edge,cx,.33,.265,.045));
    modulePart('chest',box(door,.065,.55,.041,joint,cx+side*.16,-.01,.276));
    modulePart('chest',forged(door,.21,.16,.065,orange,cx,-.17,.282,.04));
    for(const y of [-.39,.38])modulePart('chest',bolt(door,cx+side*.18,y,.29));
    cyl(door,.047,.047,1.07,brass,-side*.02,0,-.08);
  }
  // Swinging rear-cage halves and red hinges are part of the bare frame.
  const doors={left:makeGroup(root,-.50,1.89,-.43),
    right:makeGroup(root,.50,1.89,-.43)};
  for(const [side,key] of [[-1,'left'],[1,'right']]){
    const hatch=doors[key],inner=-side*.24;
    rod(hatch,[0,.54,-.04],[inner,.42,-.13],.052,edge);
    rod(hatch,[inner,.42,-.13],[inner,-.39,-.14],.061,steel);
    rod(hatch,[inner,-.39,-.14],[0,-.53,-.05],.051,edge);
    forged(hatch,.25,.27,.085,steel,inner,.02,-.15,.05);
    for(const h of [-.44,.42])
      cyl(hatch,.095,.095,.16,orange,0,h,-.03).rotation.x=Math.PI/2;
  }
  // Helmet: armored jaw, brow ridge, horizontal illuminated eye band,
  // dual cheek filters and respirator; no floating rectangular robot head.
  const helmetPivot=makeGroup(root,0,2.36,-.08);
  modulePart('head',ellipsoid(helmetPivot,.38,.35,.38,joint,0,.10,0));
  modulePart('head',forged(helmetPivot,.69,.47,.51,steel,0,.21,.025,.18));
  modulePart('head',forged(helmetPivot,.66,.16,.18,edge,0,.37,.23,.055));
  modulePart('head',forged(helmetPivot,.56,.12,.095,visor,0,.19,.306,.035));
  modulePart('head',forged(helmetPivot,.45,.16,.19,shaded,0,.055,.29,.05));
  modulePart('head',forged(helmetPivot,.24,.20,.12,steel,0,-.035,.39,.05));
  plate('head',helmetPivot,.68,.22,.13,0,.43,.08,.075);
  plate('head',helmetPivot,.57,.13,.095,0,-.12,.27,.045);
  for(const side of [-1,1]){
    modulePart('head',ellipsoid(helmetPivot,.17,.19,.20,steel,side*.34,.04,.15));
    const cheekFilter=modulePart('head',
      cyl(helmetPivot,.11,.11,.07,joint,side*.32,-.045,.345));
    cheekFilter.rotation.x=Math.PI/2;
    for(let i=0;i<3;i++)modulePart('head',box(helmetPivot,.15,.018,.037,edge,
      side*.32,-.087+i*.039,.383));
    hose(root,[[side*.35,2.36,.19],[side*.53,2.24,.07],
      [side*.62,2.04,-.21]],.04,joint);
  }
  // Open neck ring and bolted shoulder clips remain without the helmet.
  cyl(root,.25,.28,.12,joint,0,2.31,-.14,12);
  for(const side of [-1,1]){
    forged(root,.26,.15,.42,steel,side*.43,2.39,-.23,.05);
    rod(root,[side*.48,2.37,-.35],[side*.83,2.30,-.12],.08,edge);
  }

  const armPivots=[],legPivots=[];
  // Shoulder yokes extend from the chest cage into the upper arm pivots.
  for(const side of [-1,1]){
    rod(root,[side*.49,2.37,-.22],[side*.88,2.33,-.13],.09,edge);
    rod(root,[side*.54,2.25,-.35],[side*.84,2.20,-.27],.065,steel);
    cyl(root,.15,.15,.12,orange,side*.84,2.25,-.12).rotation.z=Math.PI/2;
  }
  for(const side of [-1,1]){
    const armName=side<0?'leftArm':'rightArm';
    const legName=side<0?'leftLeg':'rightLeg';
    // Broad but rounded shoulder cups with segmented biceps, black rubber
    // elbow gap, forged forearm guards, and articulated mechanical hands.
    const arm=makeGroup(root,side*.86,2.26,-.11);armPivots.push(arm);
    ball(arm,.25,joint);
    cyl(arm,.16,.16,.26,edge,0,0,0).rotation.z=Math.PI/2;
    // Even an unarmored arm is a continuous mechanical shoulder-to-finger
    // assembly; its wrist and palm cannot float below the elbow anymore.
    rod(arm,[side*.04,-.05,-.20],[side*.05,-.81,-.22],.067,steel);
    rod(arm,[side*.21,-.09,.02],[side*.20,-.80,.04],.047,brass);
    const shoulderRam=cyl(arm,.10,.10,.31,orange,side*.22,-.40,-.04);
    shoulderRam.rotation.z=side*.15;
    frameFeatures.armLinks+=3;
    modulePart(armName,ellipsoid(arm,.43,.30,.38,steel,side*.07,-.09,.0));
    plate(armName,arm,.69,.33,.37,side*.08,-.13,.27,.13);
    modulePart(armName,forged(arm,.33,.52,.33,shaded,side*.07,-.53,.04,.09));
    rod(arm,[side*.20,-.26,-.12],[side*.18,-.79,-.12],.055,edge);
    rod(arm,[side*.07,-.29,.23],[side*.07,-.79,.22],.043,brass);
    ellipsoid(arm,.20,.21,.20,joint,side*.08,-.85,.04);
    cyl(arm,.18,.18,.14,orange,side*.08,-.84,.04).rotation.z=Math.PI/2;
    rod(arm,[side*.03,-.88,-.13],[side*.03,-1.34,-.13],.073,edge);
    rod(arm,[side*.22,-.86,.11],[side*.19,-1.36,.12],.063,steel);
    rod(arm,[side*.08,-.92,.23],[side*.08,-1.29,.24],.039,brass);
    cyl(arm,.13,.13,.10,joint,side*.08,-1.38,.07,12);
    forged(arm,.39,.19,.28,steel,side*.08,-1.43,.13,.055);
    forged(arm,.17,.27,.18,shaded,side*.08+side*.24,-1.45,.18,.04);
    frameFeatures.armLinks+=6;
    modulePart(armName,forged(arm,.42,.52,.46,steel,side*.08,-1.10,.08,.10));
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
    cyl(leg,.20,.20,.16,orange,0,-.08,-.02).rotation.z=Math.PI/2;
    rod(leg,[-.17,-.12,-.14],[-.17,-.69,-.13],.071,steel);
    rod(leg,[.17,-.12,-.14],[.17,-.69,-.13],.071,steel);
    rod(leg,[0,-.15,.10],[0,-.64,.12],.057,brass);
    frameFeatures.legLinks+=3;
    modulePart(legName,ellipsoid(leg,.26,.37,.27,shaded,0,-.31,.04));
    plate(legName,leg,.45,.49,.25,0,-.33,.285,.105);
    rod(leg,[side*.23,-.11,-.10],[side*.22,-.70,-.10],.051,edge);
    rod(leg,[-side*.17,-.10,.21],[-side*.17,-.67,.21],.043,brass);
    ellipsoid(leg,.21,.18,.21,joint,0,-.71,.06);
    cyl(leg,.16,.16,.20,orange,0,-.71,.24).rotation.x=Math.PI/2;
    for(const x of [-.19,.19]){
      rod(leg,[x,-.77,-.12],[x,-1.28,-.10],.069,steel);
      rod(leg,[x,-.78,.17],[x,-1.27,.18],.052,edge);
      frameFeatures.legLinks+=2;
    }
    forged(leg,.32,.12,.29,edge,0,-1.25,.06,.038);
    modulePart(legName,ellipsoid(leg,.29,.35,.31,steel,0,-1.02,.045));
    plate(legName,leg,.49,.56,.19,0,-1.03,.32,.115);
    for(const x of [-.20,.20]){
      rod(leg,[x,-.79,-.08],[x,-1.25,-.07],.047,edge);
    }
    const boot=forged(leg,.64,.24,.78,shaded,0,-1.28,.21,.095);
    cyl(leg,.13,.13,.13,orange,0,-1.29,-.17).rotation.x=Math.PI/2;
    forged(leg,.41,.14,.36,steel,0,-1.35,.32,.06);
    modulePart(legName,forged(leg,.57,.095,.20,steel,0,-1.37,.50,.035));
    for(const x of [-.20,0,.20])modulePart(legName,box(leg,.095,.035,.13,edge,x,-1.40,.56));
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
  const pilot=makeGroup(root,0,0,-1.93);
  const fallbackPilot=makeGroup(pilot);
  const uniform=new THREE.MeshStandardMaterial({color:0x657166,roughness:.93});
  const fabric=new THREE.MeshStandardMaterial({color:0x30383a,roughness:1});
  const skin=new THREE.MeshStandardMaterial({color:0x9f8065,roughness:.96});
  const belt=new THREE.MeshStandardMaterial({color:0x9c8e69,roughness:.82});
  const hips=makeGroup(fallbackPilot,0,.98,0);
  ellipsoid(hips,.23,.13,.14,fabric,0,0,0);
  const pilotBody=makeGroup(fallbackPilot,0,1.06,0);
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
      const condition=plateCondition(currentState,slot);
      for(const part of moduleMeshes[slot])part.visible=entry.points>0;
      for(const shell of plateMeshes[slot]){
        // A broken plate is still physically attached and visible. Its rating
        // is zero until repaired, but its mesh and inventory identity survive.
        shell.visible=entry.points>0;
        shell.material.color.setHex(condition.broken?0x594e49:entry.color);
        shell.scale.setScalar(entry.points>0?Math.min(1.10,.95+entry.scale*.09):1);
        for(const [tier,detail] of Object.entries(shell.userData.modelDetails||{}))
          detail.visible=entry.model===tier;
      }
    }
  }
  function updateCore(currentState){
    const powered=hasFusionPower(currentState);
    coreLight.material.color.setHex(powered?0x8bcbb4:0xb26b3e);
    coreLight.material.needsUpdate=true;
  }
  const ease=(a,b,t)=>{
    const v=Math.max(0,Math.min(1,(t-a)/(b-a)));
    return v*v*(3-2*v);
  };
  function animate(phase='idle',progress=0,time=0){
    const transitioning=phase==='entering'||phase==='exiting';
    const t=Math.max(0,Math.min(1,progress));
    const open=transitioning?ease(0,.23,t)*(1-ease(.76,1,t)):0;
    doors.left.rotation.y=open*1.48;
    doors.right.rotation.y=-open*1.48;
    helmetPivot.rotation.x=-open*.12;
    armPivots[0].rotation.z=-open*.16;
    armPivots[1].rotation.z=open*.16;
    for(const leg of legPivots)leg.rotation.x=Math.sin(time*1.2)*.004;
    warningLight.intensity=.45+open*.9;
    pilot.visible=transitioning;
    if(transitioning){
      const move=ease(.19,.81,t);
      const journey=phase==='entering'?move:1-move;
      pilot.position.z=-1.93+journey*1.65;
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
  updatePlates(state);updateCore(state);
  // Measure in suit-local orientation, not the bay's -90-degree yaw.
  const originalYaw=root.rotation.y;
  const pilotWasVisible=pilot.visible;
  pilot.visible=false;root.rotation.y=0;root.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  root.rotation.y=originalYaw;root.updateMatrixWorld(true);
  pilot.visible=pilotWasVisible;
  return {root,doors,helmetPivot,plateMeshes,moduleMeshes,pilot,size,frameFeatures,updatePlates,updateCore,animate,
    useOriginalPilot(){fallbackPilot.visible=false;}};
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
