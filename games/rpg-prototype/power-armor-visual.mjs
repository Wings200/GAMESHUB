// W20.8: distinct cast cuirass, pauldron, vambrace, greave and helmet silhouettes.
// Slot visuals, pilot, hinged entry and cockpit remain independent of gameplay.
import * as THREE from 'three';
import {POWER_ARMOR_SLOTS,getPowerPlate,plateCondition,hasFusionPower} from './power-armor.mjs';
import {powerEntryPose} from './power-entry-animation.mjs';

export function buildPowerArmorVisual(scene,position,state){
  const root=new THREE.Group();
  root.position.set(position.x,0,position.z);
  root.rotation.y=-Math.PI/2;
  scene.add(root);
  const steel=new THREE.MeshStandardMaterial({color:0x677675,metalness:.76,roughness:.48});
  const armor=new THREE.MeshStandardMaterial({color:0x384b4e,metalness:.65,roughness:.56});
  const shaded=new THREE.MeshStandardMaterial({color:0x26343a,metalness:.70,roughness:.55});
  const edge=new THREE.MeshStandardMaterial({color:0x9aabac,metalness:.78,roughness:.41});
  const joint=new THREE.MeshStandardMaterial({color:0x263138,metalness:.33,roughness:.86});
  const brass=new THREE.MeshStandardMaterial({color:0xa58c62,metalness:.76,roughness:.47});
  const orange=new THREE.MeshStandardMaterial({color:0xb36937,metalness:.64,roughness:.51});
  const visor=new THREE.MeshStandardMaterial({
    color:0x132226,metalness:.63,roughness:.19,emissive:0xc49343,emissiveIntensity:.32
  });
  const glow=new THREE.MeshBasicMaterial({color:0xf4bd69});
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
  const modulePart=(slot,part)=>{
    // Clone paint per physical piece: changing a T-60 arm must never recolor
    // the T-45 leg or any shared metal on the underlying frame.
    if([steel,shaded,edge].includes(part.material)){
      part.material=part.material.clone();
      part.userData.moduleBaseColor=part.material.color.getHex();
    }
    moduleMeshes[slot].push(part);return part;
  };
  // Small authored weathering maps multiply the actual alloy pigment.
  // All three styles keep their own scrapes and oxidation rather than
  // looking like smooth, flat plastic rectangles.
  function wornMetalTexture(seed){
    const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
    const ctx=canvas.getContext('2d');
    let state=seed>>>0;
    const next=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;
      return state/4294967296;};
    ctx.fillStyle='#e4e5df';ctx.fillRect(0,0,96,96);
    for(let i=0;i<92;i++){
      const x=next()*96,y=next()*96;
      ctx.fillStyle=next()>.35?'rgba(34,36,35,.09)':'rgba(255,250,232,.20)';
      ctx.fillRect(x,y,1+next()*4,.4+next()*2.3);
    }
    for(let i=0;i<14;i++){
      ctx.strokeStyle=next()>.48?'rgba(42,39,31,.34)':'rgba(255,255,240,.52)';
      ctx.lineWidth=.55+next()*.9;
      const x=next()*96,y=next()*96;
      ctx.beginPath();ctx.moveTo(x,y);
      ctx.lineTo(x+4+next()*23,y-2+next()*6);ctx.stroke();
    }
    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.RepeatWrapping;
    tex.anisotropy=2;
    return tex;
  }
  const tierPaint={
    t45:new THREE.MeshStandardMaterial({color:0xb1a48b,
      map:wornMetalTexture(71),metalness:.48,roughness:.69}),
    t60:new THREE.MeshStandardMaterial({color:0x4f7585,
      map:wornMetalTexture(105),metalness:.71,roughness:.46}),
    t01:new THREE.MeshStandardMaterial({color:0x694781,
      map:wornMetalTexture(117),metalness:.69,roughness:.39})
  };
  const protoTrim=new THREE.MeshStandardMaterial({color:0xb8aed5,metalness:.72,roughness:.34});
  // These are three DISTINCT forged outlines, rather than three paints
  // applied to one old slab: T-45 round cast, T-60 flared heavy shoulders,
  // and a sharply peaked T-01 prototype.
  const profilePlate=(parent,w,h,d,material,outline,bulge=.06)=>{
    const shape=new THREE.Shape();
    for(let i=0;i<outline.length;i++){
      const [u,v]=outline[i];
      if(i===0)shape.moveTo(u*w,v*h);else shape.lineTo(u*w,v*h);
    }
    shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{
      depth:d,bevelEnabled:true,bevelThickness:.018,bevelSize:.02,
      bevelSegments:2,steps:1
    });
    geo.translate(0,0,-d/2);
    // Convex cast armour: the centre stands forward of the borders.
    // This creates a proper curved silhouette from side and 3/4 views,
    // not a pile of rectangular extrusions stuck onto a mannequin.
    const pos=geo.getAttribute('position');
    for(let i=0;i<pos.count;i++){
      const nx=Math.min(1,Math.abs(pos.getX(i))/(w*.62));
      const ny=Math.min(1,Math.abs(pos.getY(i))/(h*.65));
      const dome=bulge*Math.max(0,1-nx*nx)*Math.max(0,1-ny*ny);
      pos.setZ(i,pos.getZ(i)+dome);
    }
    pos.needsUpdate=true;geo.computeVertexNormals();
    return mesh(parent,geo,material.clone());
  };
  const profiles={
    t45:[[-.28,-.50],[.28,-.50],[.39,-.45],[.48,-.31],
      [.51,-.05],[.49,.18],[.39,.40],[.24,.52],
      [-.24,.52],[-.39,.40],[-.49,.18],[-.51,-.05],
      [-.48,-.31],[-.39,-.45]],
    t60:[[-.32,-.50],[.32,-.50],[.43,-.39],[.56,-.20],
      [.64,.23],[.47,.46],[.26,.52],[-.26,.52],
      [-.47,.46],[-.64,.23],[-.56,-.20],[-.43,-.39]],
    t01:[[-.25,-.50],[.25,-.50],[.42,-.38],[.59,-.19],
      [.66,.16],[.45,.33],[0,.58],[-.45,.33],
      [-.66,.16],[-.59,-.19],[-.42,-.38]]
  };
  // Geometry is authored for the BODY REGION. A shoulder shell is a
  // winged pauldron; a breastplate wraps the rib cage; a greave tapers
  // into the ankle. Simply repeating a hexagon had produced the old
  // checkerboard/stack-of-tiles silhouette.
  const contourFor=(tier,role)=>{
    const outline=profiles[tier];
    return outline.map(([u,v])=>{
      let width=1,up=v;
      if(role==='cuirass'){
        width=.80+.41*Math.max(0,v+.5);
        up=v+(.48-Math.abs(u))*.055;
      }else if(role==='pauldron'){
        width=.79+.40*Math.max(0,v+.5);
        up=v+.055*Math.max(0,Math.abs(u)-.20);
      }else if(role==='vambrace'){
        width=.76+.30*(v+.5);
      }else if(role==='cuisse'){
        width=.82+.24*(v+.5);
      }else if(role==='greave'){
        width=.66+.37*(v+.5);
        up=v+.07*Math.abs(u);
      }else if(role==='helmet'){
        width=.74+.35*(v+.5);
        up=v+.035*Math.max(0,.4-Math.abs(u));
      }else if(role==='knee'){
        width=.85+.08*(v+.5);
      }
      return [u*width,up];
    });
  };
  const plate=(slot,parent,w,h,d,x,y,z,cut=.12,role=slot)=>{
    const shell=forged(parent,w,h,d,armor.clone(),x,y,z,cut);
    shell.userData.modelDetails={};
    shell.userData.tierFaces={};
    shell.userData.profileOutlines=profiles;
    shell.userData.plateRole=role;
    function styling(tier,draw){
      const detail=makeGroup(shell,0,0,d/2+.055);
      detail.name=tier.toUpperCase()+'_'+slot+'_profile';
      const face=profilePlate(detail,w,h,d*.45,tierPaint[tier],
        contourFor(tier,role),
        tier==='t45' ? .115 : tier==='t60' ? .075 : .045);
      face.userData.plateRole=role;
      shell.userData.tierFaces[tier]=face;
      draw(detail);detail.visible=false;
      shell.userData.modelDetails[tier]=detail;
    }
    styling('t45',group=>{
      forged(group,w*.73,h*.12,.047,edge,0,-h*.22,.065,.025);
      for(const sign of [-1,1]){
        const rivet=cyl(group,.032,.032,.027,brass,sign*w*.31,h*.26,.08,8);
        rivet.rotation.x=Math.PI/2;
      }
    });
    styling('t60',group=>{
      for(const sign of [-1,1]){
        forged(group,w*.16,h*.82,.09,edge,sign*w*.31,0,.07,.018);
        forged(group,w*.08,h*.64,.045,shaded,sign*w*.31,0,.12,.012);
        forged(group,w*.13,h*.18,.09,brass,sign*w*.44,h*.30,.09,.025);
      }
      forged(group,w*.51,h*.13,.075,steel,0,h*.32,.11,.025);
    });
    styling('t01',group=>{
      const ridge=forged(group,w*.24,h*.65,.16,protoTrim,0,h*.01,.11,.075);
      ridge.rotation.z=.04;
      for(const sign of [-1,1]){
        const wing=forged(group,w*.24,h*.42,.14,shaded,sign*w*.33,h*.035,.08,.045);
        wing.rotation.z=-sign*.30;
        forged(group,w*.08,h*.23,.13,protoTrim,sign*w*.34,-h*.25,.13,.025);
      }
      for(let i=-1;i<=1;i++)
        forged(group,w*.08,h*.10,.10,brass,i*w*.22,-h*.36,.14,.02);
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

  // Cast-metal rib cage with open spaces for the pilot, reinforced sternum,
  // and a dorsal shock spine. None of this disappears with an armor module.
  for(const side of [-1,1]){
    for(let i=0;i<4;i++){
      const y=1.62+i*.17;
      hose(root,[[side*.18,y+.09,.24],[side*.41,y+.02,.24],
        [side*.56,y-.035,.045],[side*.48,y+.07,-.31]],.037,edge);
      const tether=rod(root,[side*.21,y+.08,.20],
        [side*.41,y+.015,.14],.018,brass);
      frameFeatures.torsoRibs+=2;
    }
    const shoulderLoop=mesh(root,new THREE.TorusGeometry(.26,.048,8,19),
      steel,side*.52,2.35,-.19);
    shoulderLoop.rotation.y=Math.PI/2;
    forged(root,.24,.27,.18,joint,side*.46,1.46,-.37,.05);
    for(const yy of [1.61,1.87,2.13])
      ball(root,.045,orange,side*.45,yy,-.39);
  }
  // The central dorsal spine used to be a fixed, SOLID wall behind the
  // pilot. It is now attached to the outward-swinging hatch below, so the
  // entrance is open before the pilot sets foot on a stair.
  const waistDial=cyl(root,.21,.21,.11,joint,0,1.37,.29,18);
  waistDial.rotation.x=Math.PI/2;
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    ball(root,.022,brass,Math.sin(a)*.16,1.37+Math.cos(a)*.16,.36);
  }
  // A thin pilot seat and retaining struts are inside the open cage;
  // the rear half remains visibly unobstructed for boarding.
  const cradle=forged(root,.36,.37,.12,joint,0,1.49,.025,.09);
  cradle.rotation.x=.12;
  for(const side of [-1,1]){
    rod(root,[side*.16,1.22,-.22],[side*.33,1.52,-.26],.048,steel);
    forged(root,.16,.12,.23,brass,side*.24,1.19,-.13,.035);
  }

  // Split breastplates: exposed centre sternum and rib gaps make even a
  // fully fitted suit read as an exoskeleton, never a huge rectangular box.
  const chestMounts={left:makeGroup(root,-.68,1.93,.33),
    right:makeGroup(root,.68,1.93,.33)};
  for(const [side,key] of [[-1,'left'],[1,'right']]){
    const carrier=chestMounts[key],cx=-side*.33;
    // A curved clavicle cap and under-rib skirt ride on separate rails.
    const clavicle=modulePart('chest',forged(carrier,.48,.19,.16,
      steel,cx+side*.025,.43,.06,.075));
    clavicle.rotation.z=side*.12;
    // One large formed breastplate per side: the old four little badges
    // made the torso look like stacked luggage rather than heavy armour.
    const cuirass=plate('chest',carrier,.67,.70,.20,
      cx+side*.01,.02,.22,.20,'cuirass');
    cuirass.rotation.z=side*.085;
    const skirt=modulePart('chest',forged(carrier,.41,.13,.14,
      shaded,cx-side*.04,-.44,.19,.075));
    skirt.rotation.z=-side*.11;
    const waistFin=modulePart('chest',forged(carrier,.20,.23,.13,
      steel,cx-side*.18,-.36,.18,.075));
    waistFin.rotation.z=side*.20;
    // Reinforced lateral edge; no broad backing slab blocks the pilot cage.
    const rail=modulePart('chest',forged(carrier,.105,.71,.12,
      edge,cx+side*.24,0,.02,.04));
    rail.rotation.z=side*.14;
    modulePart('chest',forged(carrier,.20,.14,.10,orange,
      cx-side*.035,-.015,.19,.055));
    for(const y of [-.35,.34]){
      modulePart('chest',bolt(carrier,cx+side*.16,y,.26));
      modulePart('chest',ball(carrier,.041,brass,cx-side*.13,y,.24));
    }
    // This carrier spindle is permanent even with the armor removed.
    rod(carrier,[0,-.49,-.13],[0,.49,-.13],.045,brass);
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
  // Two low service steps deploy behind the suit when the hatch unlocks.
  // Top faces match POWER_BOARDING's .22 / .43 / .49 foot-contact heights.
  const steps=makeGroup(root);
  const industrialGrip=new THREE.MeshStandardMaterial({
    color:0x6c7771,metalness:.58,roughness:.69
  });
  const hazardEdge=new THREE.MeshStandardMaterial({
    color:0xd7a461,metalness:.58,roughness:.44,
    emissive:0x47220b,emissiveIntensity:.21
  });
  const tread=(z,height,depth)=>{
    const assembly=makeGroup(steps,0,0,z);
    forged(assembly,.89,.095,depth,industrialGrip,0,height-.048,0,.07);
    for(let n=-3;n<=3;n++)
      box(assembly,.08,.010,depth*.75,brass,n*.105,height+.006,0);
    // Painted front edges are visible while the pilot climbs instead of
    // disappearing into black mechanics in the exterior cinematic.
    forged(assembly,.86,.065,.060,hazardEdge,0,height-.025,
      -depth*.50,.035);
    for(const sign of [-1,1]){
      forged(assembly,.08,.16,depth,shaded,sign*.45,height-.078,0,.035);
      // Welded triangular gusset makes each tread read as load-bearing.
      rod(assembly,[sign*.35,height-.045,-depth*.28],
        [sign*.35,Math.max(.045,height-.22),depth*.34],.035,steel);
      ball(assembly,.042,orange,sign*.35,height-.045,-depth*.28);
    }
    return assembly;
  };
  const lowerTread=tread(-1.47,.22,.43);
  const upperTread=tread(-1.07,.43,.39);
  const cabinTread=tread(-.60,.49,.54);
  frameFeatures.boardingSteps=2;
  // The old fixed dorsal column is now a hinged service bulkhead. It swings
  // WITH the left hatch instead of allowing the pilot to ghost through it.
  const spineHatch=makeGroup(doors.left,.50,-.20,.04);
  for(let i=0;i<6;i++){
    const localY=1.46+i*.17-1.69;
    const rib=forged(spineHatch,.23,.095,.17,i%2?steel:shaded,
      0,localY,0,.032);
    rib.rotation.x=.06;
    box(spineHatch,.16,.036,.09,brass,0,localY,-.105);
  }
  frameFeatures.dorsalHatch=true;
  // Hinge-mounted rear handholds stow upright against the back while parked
  // and swing out with the hatch BEFORE the pilot lifts a boot. The player's
  // animated shoulders/elbows now reach toward these real frame components.
  const serviceHandles=[];
  for(const sign of [-1,1]){
    const hinge=makeGroup(root,sign*.65,1.62,-.50);
    ball(hinge,.073,orange);
    rod(hinge,[0,0,0],[0,-.055,-.81],.043,edge);
    forged(hinge,.17,.11,.17,brass,0,-.05,-.83,.04);
    rod(hinge,[sign*.08,-.05,-.84],[-sign*.12,-.05,-.84],.035,steel);
    serviceHandles.push(hinge);
  }
  frameFeatures.handholds=serviceHandles.length;

  // Helmet: armored jaw, brow ridge, horizontal illuminated eye band,
  // dual cheek filters and respirator; no floating rectangular robot head.
  const helmetPivot=makeGroup(root,0,2.36,-.08);
  // Smaller formed skull cradle: the original oversized oval made an
  // empty frame read like a toy robot instead of a wearable harness.
  modulePart('head',forged(helmetPivot,.46,.28,.22,joint,0,.14,.015,.095));
  modulePart('head',forged(helmetPivot,.69,.47,.51,steel,0,.21,.025,.18));
  modulePart('head',forged(helmetPivot,.66,.16,.18,edge,0,.37,.23,.055));
  modulePart('head',forged(helmetPivot,.56,.12,.095,visor,0,.19,.306,.035));
  modulePart('head',forged(helmetPivot,.45,.16,.19,shaded,0,.055,.29,.05));
  modulePart('head',forged(helmetPivot,.24,.20,.12,steel,0,-.035,.39,.05));
  const helmetShell=plate('head',helmetPivot,.84,.48,.22,0,.24,.17,.15,'helmet');
  helmetShell.rotation.x=-.08;
  modulePart('head',forged(helmetPivot,.55,.14,.16,
    shaded,0,-.09,.36,.055));
  // Front-facing vision band set into the forged helmet, not a floating box.
  modulePart('head',forged(helmetPivot,.72,.14,.13,shaded,0,.25,.34,.06));
  modulePart('head',forged(helmetPivot,.58,.08,.09,visor,0,.26,.417,.025));
  for(const side of [-1,1]){
    const temple=modulePart('head',forged(helmetPivot,.22,.28,.19,
      steel,side*.36,.13,.22,.055));
    temple.rotation.z=side*.16;
  }
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

  // True servo skeleton. Armor plates are attached to the segment that
  // moves; neither an elbow nor a knee is painted onto a rigid limb anymore.
  const armPivots=[],legPivots=[];
  const rig={arms:[],legs:[],actuators:[]};
  const upAxis=new THREE.Vector3(0,1,0);
  function telescopingActuator(aGroup,aPoint,bGroup,bPoint,side,thick=.055){
    const jacket=cyl(root,thick,thick,1,shaded,0,0,0,12);
    const shaft=cyl(root,thick*.56,thick*.56,1,brass,0,0,0,12);
    const capA=ball(aGroup,thick*1.35,orange,...aPoint);
    const capB=ball(bGroup,thick*1.25,brass,...bPoint);
    // Geometry is rooted in the frame and spans the two articulated segments
    // after their matrices update. The brass piston actually extends.
    const setSpan=(m,from,to)=>{
      const vector=to.clone().sub(from),length=vector.length();
      m.position.copy(from).add(to).multiplyScalar(.5);
      m.quaternion.setFromUnitVectors(upAxis,vector.multiplyScalar(1/Math.max(length,.0001)));
      m.scale.y=Math.max(length,.001);
    };
    const actuator={jacket,shaft,capA,capB,update(){
      const a=root.worldToLocal(aGroup.localToWorld(new THREE.Vector3(...aPoint)));
      const b=root.worldToLocal(bGroup.localToWorld(new THREE.Vector3(...bPoint)));
      const d=b.clone().sub(a);
      setSpan(jacket,a,a.clone().addScaledVector(d,.62));
      setSpan(shaft,a.clone().addScaledVector(d,.42),b);
    }};
    rig.actuators.push(actuator);frameFeatures.hydraulics++;
    return actuator;
  }
  frameFeatures.elbows=2;frameFeatures.wrists=2;
  frameFeatures.knees=2;frameFeatures.ankles=2;
  frameFeatures.fingerHinges=16;frameFeatures.hydraulics=0;
  // Stiff shoulder yokes carry the load into the movable upper arms.
  for(const side of [-1,1]){
    rod(root,[side*.45,2.39,-.20],[side*.84,2.30,-.13],.095,edge);
    rod(root,[side*.50,2.24,-.39],[side*.87,2.20,-.28],.066,steel);
    const servo=cyl(root,.18,.18,.14,orange,side*.84,2.26,-.13,16);
    servo.rotation.z=Math.PI/2;
    const bearing=cyl(root,.12,.12,.17,joint,side*.84,2.26,-.13,16);
    bearing.rotation.z=Math.PI/2;
    for(let i=0;i<6;i++){
      const theta=i*Math.PI/3;
      ball(root,.023,brass,side*.91,2.26+Math.cos(theta)*.11,
        -.13+Math.sin(theta)*.11);
    }
  }
  for(const side of [-1,1]){
    const armName=side<0?'leftArm':'rightArm';
    const legName=side<0?'leftLeg':'rightLeg';

    // SHOULDER -> ELBOW -> WRIST -> PALM -> PHALANGES.
    const shoulder=makeGroup(root,side*.86,2.26,-.11);
    armPivots.push(shoulder);
    ball(shoulder,.235,joint);
    const shoulderHub=cyl(shoulder,.18,.18,.19,edge,0,0,0,16);
    shoulderHub.rotation.z=Math.PI/2;
    for(const sx of [-.18,.18]){
      rod(shoulder,[sx,-.10,-.14],[sx,-.59,-.12],.056,steel);
      rod(shoulder,[sx,-.09,.14],[sx,-.55,.12],.038,brass);
      frameFeatures.armLinks+=2;
    }
    forged(shoulder,.23,.41,.17,shaded,side*.22,-.34,-.08,.065);
    // Triangular bearer plate and exposed pivot, not the former round
    // balloon shoulder. The swappable pauldron remains a separate shell.
    modulePart(armName,forged(shoulder,.58,.18,.26,steel,side*.06,.02,.08,.075));
    const crossRail=modulePart(armName,forged(shoulder,.12,.33,.20,edge,
      side*.31,-.26,-.07,.055));
    crossRail.rotation.z=side*.16;
    // Single pauldron follows the shoulder hinge, not two identical badges.
    const pauldron=plate(armName,shoulder,.83,.59,.25,
      side*.13,-.18,.28,.16,'pauldron');
    pauldron.rotation.z=side*.15;
    const undercut=modulePart(armName,forged(shoulder,.43,.10,.17,
      shaded,side*.09,-.50,.24,.035));
    undercut.rotation.z=-side*.09;
    const outerLip=modulePart(armName,forged(shoulder,.14,.43,.24,
      shaded,side*.48,-.15,.16,.055));
    outerLip.rotation.z=side*.19;
    modulePart(armName,forged(shoulder,.28,.38,.28,shaded,side*.04,-.39,.11,.08));

    const elbow=makeGroup(shoulder,side*.065,-.68,.025);
    ball(elbow,.205,joint);
    const elbowDrum=cyl(elbow,.164,.164,.27,orange,0,0,0,16);
    elbowDrum.rotation.z=Math.PI/2;
    for(const x of [-.18,.18]){
      const pin=cyl(elbow,.078,.078,.033,brass,x,0,0,12);
      pin.rotation.z=Math.PI/2;
    }
    // Distinct forearm segment with a protective lattice but no glued elbow.
    for(const x of [-.15,.15]){
      rod(elbow,[x,-.07,-.13],[x*.88,-.48,-.11],.065,edge);
      rod(elbow,[x,-.07,.15],[x*.90,-.46,.17],.043,steel);
      frameFeatures.armLinks+=2;
    }
    const forearmRam=forged(elbow,.28,.42,.22,joint,0,-.27,.035,.045);
    forearmRam.rotation.z=side*.025;
    modulePart(armName,forged(elbow,.48,.48,.36,steel,0,-.25,.09,.12));
    // Continuous forearm vambrace, tapered toward the wrist.
    const vambrace=plate(armName,elbow,.54,.64,.20,0,-.30,.30,.15,'vambrace');
    vambrace.rotation.z=-side*.035;
    modulePart(armName,forged(elbow,.23,.39,.18,edge,side*.22,-.23,.05,.05));
    const wrist=makeGroup(elbow,0,-.55,.015);
    ball(wrist,.15,joint);
    const wristCollar=cyl(wrist,.15,.15,.18,brass,0,-.035,0,14);
    wristCollar.rotation.z=Math.PI/2;
    forged(wrist,.34,.12,.31,steel,0,-.09,.07,.035);

    const palm=makeGroup(wrist,0,-.12,.08);
    forged(palm,.42,.22,.25,steel,0,-.09,.025,.075);
    forged(palm,.33,.12,.09,shaded,0,-.15,.17,.035);
    const fingerJoints=[];
    for(let i=0;i<4;i++){
      const x=(i-1.5)*.106;
      const digit=makeGroup(palm,x,-.19,.10);
      cyl(digit,.039,.045,.18,edge,0,-.09,0,8);
      ball(digit,.048,brass,0,-.17,0);
      const tip=makeGroup(digit,0,-.18,0);
      forged(tip,.092,.15,.13,steel,0,-.07,.015,.023);
      fingerJoints.push({digit,tip});
    }
    const thumb=makeGroup(palm,side*.255,-.085,.13);
    ball(thumb,.065,orange);
    rod(thumb,[0,0,0],[side*.06,-.18,.07],.046,edge);
    const thumbTip=makeGroup(thumb,side*.06,-.18,.07);
    forged(thumbTip,.105,.13,.13,steel,0,-.055,.015,.025);
    frameFeatures.armLinks+=8;
    rig.arms.push({side,shoulder,elbow,wrist,palm,fingerJoints,thumb,thumbTip});

    // HIP -> KNEE -> ANKLE -> TARSUS -> TOES. The boot has a genuine
    // ankle pivot, so the foot can stay flat when the knee compresses.
    const hip=makeGroup(root,side*.43,1.30,-.11);
    legPivots.push(hip);
    ball(hip,.25,joint);
    const hipHub=cyl(hip,.21,.21,.20,orange,0,-.05,-.02,16);
    hipHub.rotation.z=Math.PI/2;
    for(const x of [-.18,.18]){
      rod(hip,[x,-.11,-.13],[x,-.57,-.12],.078,steel);
      rod(hip,[x,-.08,.13],[x,-.56,.16],.045,brass);
      frameFeatures.legLinks+=2;
    }
    // Both leg housings now show twin external linear actuators rather
    // than big rounded solid limbs that never look like a frame.
    modulePart(legName,forged(hip,.26,.51,.23,shaded,0,-.30,.045,.075));
    const cuisse=plate(legName,hip,.59,.68,.26,0,-.29,.29,.17,'cuisse');
    cuisse.rotation.z=-side*.027;
    modulePart(legName,forged(hip,.21,.40,.24,steel,side*.22,-.30,-.035,.065));

    const knee=makeGroup(hip,0,-.61,.035);
    ball(knee,.215,joint);
    const kneeDrum=cyl(knee,.168,.168,.28,orange,0,0,0,16);
    kneeDrum.rotation.z=Math.PI/2;
    const kneeGuard=forged(knee,.39,.20,.22,edge,0,.015,.23,.07);
    kneeGuard.rotation.x=-.18;
    for(const x of [-.17,.17]){
      rod(knee,[x,-.07,-.125],[x*.89,-.39,-.11],.072,steel);
      rod(knee,[x,-.07,.135],[x*.85,-.38,.16],.044,brass);
      frameFeatures.legLinks+=2;
    }
    modulePart(legName,forged(knee,.30,.48,.24,steel,0,-.25,.005,.085));
    // Distinct small patella and long protective greave.
    plate(legName,knee,.46,.18,.21,0,.08,.32,.085,'knee');
    const heavyShin=plate(legName,knee,.62,.62,.27,0,-.28,.27,.16,'greave');
    heavyShin.rotation.x=-.07;
    for(const sign of [-1,1])
      modulePart(legName,forged(knee,.105,.52,.16,shaded,
        sign*.30,-.24,.12,.04));
    modulePart(legName,forged(knee,.24,.31,.25,shaded,side*.20,-.24,-.035,.06));

    const ankle=makeGroup(knee,0,-.44,-.02);
    ball(ankle,.17,joint);
    const ankleAxle=cyl(ankle,.145,.145,.24,brass,0,0,0,14);
    ankleAxle.rotation.z=Math.PI/2;
    const foot=makeGroup(ankle,0,-.02,.03);
    // Ground contact: the outsole sits at frame-local y approximately zero.
    const sole=forged(foot,.67,.22,.84,joint,0,-.12,.25,.10);
    forged(foot,.58,.20,.60,steel,0,-.08,.22,.09);
    forged(foot,.38,.13,.25,edge,0,-.07,-.035,.05);
    modulePart(legName,forged(foot,.57,.095,.29,steel,0,-.01,.52,.035));
    const toeHinge=makeGroup(foot,0,-.125,.52);
    forged(toeHinge,.56,.10,.31,shaded,0,0,.105,.05);
    for(const x of [-.21,0,.21]){
      forged(toeHinge,.125,.09,.24,edge,x,.045,.13,.03);
      ball(toeHinge,.031,brass,x,.075,-.03);
    }
    for(const x of [-.23,.23]){
      rod(foot,[x,-.05,-.02],[x,-.15,.31],.036,brass);
      frameFeatures.legLinks++;
    }
    rig.legs.push({side,hip,knee,ankle,foot,toeHinge});
    telescopingActuator(shoulder,[side*.22,-.19,-.13],elbow,
      [side*.16,-.20,-.16],side,.052);
    telescopingActuator(elbow,[side*.13,-.12,.18],wrist,
      [side*.10,.02,.16],side,.039);
    telescopingActuator(hip,[side*.23,-.13,-.14],knee,
      [side*.22,-.10,-.15],side,.067);
    telescopingActuator(knee,[side*.19,-.11,.17],ankle,
      [side*.16,.025,.15],side,.047);
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
  const warningLight=new THREE.PointLight(0xf4b96a,.55,3,2);
  warningLight.position.set(0,2.31,.25);root.add(warningLight);
  // Narrow workshop inspection spots reveal the silhouette and the
  // footholds in a dark test field without brightening the entire map.
  const workshopKey=new THREE.PointLight(0xffebcf,2.2,6.2,2);
  workshopKey.position.set(2.2,3.25,-2.65);root.add(workshopKey);
  const workshopRim=new THREE.PointLight(0x88bec7,1.15,5.5,2);
  workshopRim.position.set(-1.8,2.8,-1.5);root.add(workshopRim);

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
      const tone=new THREE.Color(entry.color);
      for(const part of moduleMeshes[slot]){
        part.visible=entry.points>0;
        if(part.userData.moduleBaseColor!==undefined){
          part.material.color.setHex(part.userData.moduleBaseColor);
          part.material.color.lerp(tone,.15);
          if(condition.broken)part.material.color.multiplyScalar(.45);
        }
      }
      for(const shell of plateMeshes[slot]){
        // 0 durability makes a shell battered/dark, never invisible or deleted.
        shell.visible=entry.points>0;
        shell.material.color.setHex(condition.broken?0x493d3d:entry.color);
        shell.material.color.multiplyScalar(.65);
        shell.scale.setScalar(entry.points>0?Math.min(1.10,.95+entry.scale*.09):1);
        for(const [tier,detail] of Object.entries(shell.userData.modelDetails||{}))
          detail.visible=entry.model===tier;
        for(const [tier,face] of Object.entries(shell.userData.tierFaces||{})){
          face.material.color.copy(tierPaint[tier].color);
          if(condition.broken)face.material.color.setHex(0x544644);
        }
      }
    }
  }
  function updateCore(currentState){
    const powered=hasFusionPower(currentState);
    coreLight.material.color.setHex(powered?0xf4bd69:0x6d5348);
    coreLight.material.needsUpdate=true;
  }
  const ease=(a,b,t)=>{
    const v=Math.max(0,Math.min(1,(t-a)/(b-a)));
    return v*v*(3-2*v);
  };
  function animate(phase='idle',progress=0,time=0,origin=null){
    const transitioning=phase==='entering'||phase==='exiting';
    const pose=powerEntryPose(phase,progress,origin||undefined);
    const open=pose.hatch;
    const load=pose.brace;
    doors.left.rotation.y=open*1.55;
    doors.right.rotation.y=-open*1.55;
    for(const handle of serviceHandles)
      handle.rotation.x=(1-open)*Math.PI*.49;
    // Ramps never retract under a moving foot: both treads are fully deployed
    // from t=.20 until the pilot has cleared the last step.
    lowerTread.position.z=-.87-.60*open;
    upperTread.position.z=-.72-.35*open;
    lowerTread.rotation.x=-.95*(1-open);
    upperTread.rotation.x=-.55*(1-open);
    cabinTread.visible=true;
    helmetPivot.rotation.x=-open*.13+load*.05;
    for(const segment of rig.arms){
      const {side,shoulder,elbow,wrist,palm,fingerJoints,thumb,thumbTip}=segment;
      // Servo shoulders unlock and raise the elbow assemblies, then the
      // wrists and hand digits uncurl to receive the entering pilot.
      shoulder.rotation.z=side*(.026+open*.23);
      shoulder.rotation.x=-.045*open+.035*load;
      elbow.rotation.x=-.12-.36*open+.18*load;
      elbow.rotation.z=side*(.025+.045*open);
      wrist.rotation.x=.11+.19*open-.08*load;
      wrist.rotation.z=-side*.045*load;
      palm.rotation.y=side*.045*open;
      fingerJoints.forEach(({digit,tip},i)=>{
        digit.rotation.x=.17+open*.21+load*.08+i*.012;
        tip.rotation.x=.28+open*.18-load*.09;
      });
      thumb.rotation.z=-side*(.22+open*.22);
      thumbTip.rotation.x=.12+open*.20;
    }
    for(const segment of rig.legs){
      const {side,hip,knee,ankle,foot,toeHinge}=segment;
      const servoHum=Math.sin(time*2.15+side)*.0025;
      hip.rotation.x=.006+servoHum+open*.027-load*.015;
      hip.rotation.z=side*(.008+open*.012);
      knee.rotation.x=.022+open*.085+load*.018;
      ankle.rotation.x=-.65*(hip.rotation.x+knee.rotation.x);
      ankle.rotation.z=-hip.rotation.z*.85;
      toeHinge.rotation.x=Math.max(0,load*.07-open*.025);
      foot.rotation.y=side*.008*open;
    }
    // Each exposed piston is re-solved against both actual joint transforms.
    // No cylinder remains hovering when an elbow or knee bends.
    root.updateMatrixWorld(true);
    for(const actuator of rig.actuators)actuator.update();
    warningLight.intensity=.44+open*.85+load*.4;
    pilot.visible=transitioning;
    pilot.userData.entryPose=pose;
    if(transitioning){
      // The pilot uses the survivor's own hip/knee/elbow animation rig.
      // Its parent stays at floor height throughout the whole operation.
      pilot.position.set(pose.x,pose.y,pose.z);
      pilot.rotation.y=pose.yaw;
      pilotBody.rotation.x=-.12*load;
      pilotHead.rotation.x=.08*load;
      pilotLegs[0].rotation.x=.40*pose.step;
      pilotLegs[1].rotation.x=-.40*pose.step;
      pilotArms[0].rotation.x=-.8*load+.28*pose.step;
      pilotArms[1].rotation.x=-.8*load-.28*pose.step;
      pilotArms[0].rotation.z=-.22*load;
      pilotArms[1].rotation.z=.22*load;
    }
  }
  updatePlates(state);updateCore(state);animate('idle',0,0);
  // Measure in suit-local orientation, not the bay's -90-degree yaw.
  const originalYaw=root.rotation.y;
  const pilotWasVisible=pilot.visible;
  pilot.visible=false;root.rotation.y=0;root.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  root.rotation.y=originalYaw;root.updateMatrixWorld(true);
  pilot.visible=pilotWasVisible;
  return {root,doors,helmetPivot,plateMeshes,moduleMeshes,pilot,size,frameFeatures,rig,
    steps:{lowerTread,upperTread,cabinTread},spineHatch,serviceHandles,
    updatePlates,updateCore,animate,
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
