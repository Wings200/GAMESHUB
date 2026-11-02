// W19.0 — authored procedural wasteland art. Decorative geometry never
// participates in player/enemy hitboxes unless explicitly promoted to cover.
// All positions, textures and layouts are local: no asset download required.
export function buildWastelandSet(scene,THREE,{highQuality=true}={}){
  const world=new THREE.Group();world.name='W19_ScrapBuiltFrontier';scene.add(world);
  const pbr=(color,metalness=0,roughness=.9,emissive=0,emissiveIntensity=0)=>
    new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity});
  const rust=pbr(0x7d5544,.57,.82),rustDark=pbr(0x493b36,.53,.89),
    sheet=pbr(0x68716c,.64,.73),blue=pbr(0x476571,.58,.76),
    chalk=pbr(0xbbb49b,.21,.83),wood=pbr(0x67513b,.03,.94),
    rubber=pbr(0x24292b,.05,.96),glass=pbr(0x203e46,.10,.24),
    brass=pbr(0xac8053,.69,.51),tar=pbr(0x313e42,.02,.95),
    ember=pbr(0xffb66d,.05,.52,0xff8b3d,1.1);
  // Gradient sky with dusty haze, replacing the previous flat cyan void.
  const skyCanvas=document.createElement('canvas');
  skyCanvas.width=64;skyCanvas.height=512;
  const skyContext=skyCanvas.getContext('2d');
  const skyGradient=skyContext.createLinearGradient(0,0,0,512);
  skyGradient.addColorStop(0,'#344b60');
  skyGradient.addColorStop(.46,'#7b8b89');
  skyGradient.addColorStop(.72,'#c8a17d');
  skyGradient.addColorStop(1,'#655d51');
  skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,64,512);
  const skyTexture=new THREE.CanvasTexture(skyCanvas);
  skyTexture.colorSpace=THREE.SRGBColorSpace;
  const sky=new THREE.Mesh(new THREE.SphereGeometry(215,32,16),
    new THREE.MeshBasicMaterial({map:skyTexture,side:THREE.BackSide,
      depthWrite:false,fog:false}));
  sky.name='SmokyWastelandSky';world.add(sky);
  const boxGeometry=new THREE.BoxGeometry(1,1,1);
  const cylinderGeometry=new THREE.CylinderGeometry(.5,.5,1,12);
  const sphereGeometry=new THREE.SphereGeometry(1,12,9);
  let meshCount=0,shackCount=0,wreckCount=0;
  const lamps=[],flags=[];
  function part(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1){
    const m=new THREE.Mesh(geometry,material);
    m.position.set(x,y,z);m.scale.set(sx,sy,sz);
    // Outskirt set dressing uses PBR light but avoids hundreds of dynamic
    // shadow casters on software GPUs.
    m.castShadow=false;m.receiveShadow=true;
    parent.add(m);meshCount++;return m;
  }
  const block=(g,m,x,y,z,w,h,d)=>part(g,boxGeometry,m,x,y,z,w,h,d);
  const pipe=(g,m,a,b,r)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
    const delta=end.clone().sub(start);
    const tube=part(g,cylinderGeometry,m,
      (start.x+end.x)/2,(start.y+end.y)/2,(start.z+end.z)/2,r*2,delta.length(),r*2);
    tube.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    return tube;
  };
  const orb=(g,m,x,y,z,sx,sy,sz)=>part(g,sphereGeometry,m,x,y,z,sx,sy,sz);
  function group(x,z,angle=0,scale=1){
    const g=new THREE.Group();
    g.position.set(x,0,z);g.rotation.y=angle;g.scale.setScalar(scale);
    world.add(g);return g;
  }
  function rivets(g,axis,value,range,other,qty=5){
    for(let i=0;i<qty;i++){
      const offset=(i-(qty-1)/2)*range/(qty-1);
      const pos=axis==='x'?[offset,value,other]:[value,offset,other];
      orb(g,brass,...pos,.027,.027,.022);
    }
  }
  function scrapShack(x,z,angle=0,s=1,skin=0){
    const g=group(x,z,angle,s);g.name='SettlerScrapShack';
    const plate=skin%2?blue:rust;
    block(g,tar,0,.14,0,4.4,.28,3.4);
    for(const sx of [-1,1])for(const sz of [-1,1])
      block(g,rustDark,sx*1.99,1.37,sz*1.52,.16,2.50,.16);
    // Asymmetric sheet cladding, patched seams and exposed steel ribs.
    for(const side of [-1,1]){
      for(let i=0;i<5;i++){
        const panel=block(g,(i+skin)%3?sheet:plate,
          side*2.08,1.22,-1.34+i*.64,.075,2.02,.61);
        panel.rotation.y=(i%2?1:-1)*.018;
        block(g,rustDark,side*2.135,.83,-1.33+i*.64,.031,.065,.59);
      }
    }
    for(let i=0;i<5;i++){
      const isDoor=i===2;
      if(isDoor){
        block(g,rustDark,-1.68+i*.79,1.13,1.71,.79,2.02,.08);
        block(g,glass,-1.68+i*.79,1.48,1.78,.40,.56,.09);
      }else{
        block(g,i%2?plate:sheet,-1.69+i*.84,1.18,1.72,.80,2.10,.09);
        rivets(g,'y',1.2,.87,-1.69+i*.84,3);
      }
    }
    // Entrance reads from the front with a threshold and patched door leaf.
    block(g,rustDark,-1.10,1.08,-1.72,.84,1.90,.12);
    block(g,wood,-1.10,1.09,-1.79,.65,1.70,.08);
    block(g,brass,-.85,1.12,-1.88,.075,.10,.055);
    for(let i=0;i<5;i++){
      const roof=block(g,i%2?sheet:plate,-1.72+i*.88,2.62+i*.035,0,
        .91,.10,4.04);
      roof.rotation.z=-.045;
      for(const edge of [-1,1])block(g,rustDark,-1.72+i*.88,2.67+i*.035,
        edge*1.87,.80,.022,.09);
    }
    pipe(g,rustDark,[1.40,2.71,.22],[1.40,4.10,.22],.095);
    pipe(g,brass,[1.33,4.10,.22],[1.54,4.17,.22],.12);
    // Tyre, boards and wiring make the silhouette visibly salvaged.
    for(let i=0;i<3;i++)block(g,wood,-1.4+i*.21,.19,-1.93,.15,.28,1.6)
      .rotation.y=.08*i;
    for(const yy of [.82,1.10,1.38])
      pipe(g,brass,[2.15,yy,-1.25],[2.15,yy,.48],.018);
    shackCount++;
    return g;
  }
  function wreckCar(x,z,angle=0,s=1){
    const g=group(x,z,angle,s);g.name='OxidizedRoadWreck';
    block(g,rustDark,0,.52,0,1.87,.44,4.0);
    block(g,rust,0,.77,-1.15,1.85,.29,1.50);
    block(g,sheet,0,.76,1.40,1.75,.27,.83);
    const cab=block(g,rust,0,1.19,.16,1.53,.65,1.66);
    cab.rotation.x=-.07;
    for(const side of [-1,1]){
      const window=block(g,glass,side*.78,1.31,.12,.039,.40,1.16);
      window.rotation.z=side*.08;
      block(g,wood,side*.94,.93,.10,.06,.05,1.35);
      for(const zz of [-1.23,1.25]){
        const wheel=part(g,cylinderGeometry,rubber,side*.91,.40,zz,.61,.23,.61);
        wheel.rotation.z=Math.PI/2;
        const hub=part(g,cylinderGeometry,brass,side*1.03,.40,zz,.22,.25,.22);
        hub.rotation.z=Math.PI/2;
      }
      block(g,rustDark,side*.83,.53,-1.61,.14,.24,.63);
      orb(g,brass,side*.56,.78,-1.99,.20,.16,.055);
    }
    // Bent hood and missing panels: not a pristine duplicated car mesh.
    const hood=block(g,sheet,-.31,.97,-1.18,.90,.055,1.46);
    hood.rotation.x=.23;hood.rotation.z=.10;
    block(g,tar,0,.46,-2.04,1.95,.17,.18);
    block(g,rustDark,0,.48,2.04,1.9,.13,.16);
    for(let i=0;i<4;i++)block(g,tar,-.57+i*.38,.53,2.01,.14,.09,.06);
    wreckCount++;return g;
  }
  function tankTower(x,z,s=1){
    const g=group(x,z,0,s);g.name='ImprovisedWaterTower';
    for(const xx of [-.77,.77])for(const zz of [-.74,.74]){
      pipe(g,rustDark,[xx,0,zz],[xx*.84,4.1,zz*.84],.095);
      pipe(g,brass,[xx,1.22,zz],[0,2.34,0],.026);
    }
    const drum=part(g,cylinderGeometry,blue,0,4.58,0,2.15,1.49,2.15);
    drum.rotation.y=.22;
    for(const y of [3.97,4.70,5.20])
      part(g,cylinderGeometry,rust,0,y,0,2.20,.075,2.20);
    block(g,wood,0,3.68,0,2.48,.16,2.44);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      pipe(g,brass,[Math.cos(a)*.98,4.00,Math.sin(a)*.98],
        [Math.cos(a)*.98,5.19,Math.sin(a)*.98],.027);
    }
    pipe(g,rustDark,[.50,3.91,0],[.95,.37,0],.13);
    pipe(g,brass,[.99,.43,0],[1.41,.43,0],.09);
    for(let i=0;i<8;i++)block(g,wood,-1.06,.45+i*.42,.85,.09,.07,.90);
    return g;
  }
  function radioMast(x,z,s=1){
    const g=group(x,z,0,s);g.name='PatchworkRadioMast';
    for(const a of [0,Math.PI*2/3,Math.PI*4/3]){
      pipe(g,sheet,[Math.cos(a)*1.05,0,Math.sin(a)*1.05],[0,9.7,0],.085);
    }
    for(let k=1;k<=7;k++){
      const y=k*1.13;
      for(const a of [0,Math.PI*2/3,Math.PI*4/3]){
        pipe(g,rustDark,[Math.cos(a)*(.96-k*.10),y,Math.sin(a)*(.96-k*.10)],
          [Math.cos(a+2*Math.PI/3)*(.96-k*.10),y,Math.sin(a+2*Math.PI/3)*(.96-k*.10)],.028);
      }
    }
    pipe(g,brass,[0,9.4,0],[0,12.2,0],.065);
    const lamp=orb(g,ember,0,12.0,0,.16,.16,.16);
    lamps.push({mesh:lamp,base:1,phase:x*.2+z*.06});
    for(const [sx,sz] of [[-1,-1],[1,-1],[-1,1],[1,1]])
      pipe(g,rustDark,[0,8.1,0],[sx*4,0,sz*4],.018);
    const dish=part(g,sphereGeometry,sheet,.77,7.0,.25,.75,.75,.11);
    dish.rotation.y=-.65;
    pipe(g,brass,[.77,7,.20],[1.5,7.0,.12],.04);
    return g;
  }
  function generator(x,z,angle=0){
    const g=group(x,z,angle,1);g.name='SalvageFusionGenerator';
    block(g,tar,0,.20,0,2.0,.39,1.3);
    const core=part(g,cylinderGeometry,rust,0,.82,0,1.18,1.15,1.18);
    core.rotation.z=Math.PI/2;
    for(let i=0;i<8;i++)block(g,sheet,-.55+i*.158,.86,0,.07,1.07,1.21);
    pipe(g,brass,[-.63,.67,-.30],[-1.0,1.28,-.44],.055);
    pipe(g,brass,[-1.0,1.28,-.44],[-1.0,1.94,-.44],.055);
    block(g,rustDark,.84,1.10,0,.50,1.19,.9);
    block(g,glass,.855,1.42,-.46,.36,.20,.025);
    for(let i=0;i<3;i++)orb(g,ember,.73+i*.11,1.12,-.48,.034,.034,.034);
    return g;
  }
  function scrapBarricade(x,z,angle=0){
    const g=group(x,z,angle,1);g.name='TarpAndPlateBarricade';
    for(let i=0;i<4;i++){
      const h=.78+(i%3)*.25;
      const p=block(g,i%2?rust:blue,-1.39+i*.90,h*.54,0,
        .87,h,.13);
      p.rotation.z=(i%2?-.06:.09);
      block(g,wood,-1.4+i*.9,.17,.19,.72,.23,.42);
      orb(g,brass,-1.6+i*.9,h-.12,-.074,.04,.04,.035);
    }
    return g;
  }
  // Original hand-painted signs, reused as world-space emissive panels.
  function paintedSign(label,x,y,z,width=4,angle=0,color='#f0cd97'){
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=160;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#242d2e';ctx.fillRect(0,0,640,160);
    ctx.fillStyle='#62483b';ctx.fillRect(0,0,640,13);
    ctx.fillStyle='#9c8062';ctx.fillRect(0,146,640,14);
    ctx.strokeStyle='rgba(241,219,172,.23)';ctx.lineWidth=7;
    for(let i=0;i<14;i++){
      ctx.beginPath();ctx.moveTo(i*49,0);ctx.lineTo(i*49-21,160);ctx.stroke();
    }
    ctx.fillStyle=color;ctx.font='bold 47px monospace';ctx.textAlign='center';
    ctx.fillText(label,320,95,590);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(width,width*.25),
      new THREE.MeshStandardMaterial({map:tex,emissive:0x665039,
        emissiveIntensity:.3,roughness:.95,side:THREE.DoubleSide}));
    face.position.set(x,y,z);face.rotation.y=angle;world.add(face);
    meshCount++;return face;
  }
  // Structures sit just outside the training lanes and solid boundary;
  // their geometry never gives enemies invisible cover or blocks a quest NPC.
  scrapShack(-67,-25,-Math.PI/2,1.35,0);
  scrapShack(-67,8,-Math.PI/2,1.12,1);
  scrapShack(67,-13,Math.PI/2,1.42,2);
  scrapShack(66,28,Math.PI/2,1.20,3);
  scrapShack(8,-59,0,1.50,1);
  scrapShack(33,59,Math.PI,1.35,0);
  scrapShack(-23,60,Math.PI,1.17,2);
  wreckCar(-56,54,.23,1.0);
  wreckCar(55,-56,Math.PI*.9,1.2);
  wreckCar(-33,-57,.14,.85);
  tankTower(-68,-37,1.2);
  tankTower(69,45,.9);
  radioMast(-67,40,.95);
  radioMast(66,-41,.72);
  generator(-56,-49,Math.PI*.55);
  generator(54,55,Math.PI*.12);
  scrapBarricade(-57,51,-.15);
  scrapBarricade(58,-47,.25);
  scrapBarricade(-32,51,.25);
  paintedSign('HAVEN JUNCTION',-58,4.2,-24,4.1,Math.PI/2);
  paintedSign('DEAD FREQUENCY',-58,3.5,39,4.3,Math.PI/2,'#b7ccc3');
  paintedSign('FRONTIER SECURITY',57,4.0,41,4.8,-Math.PI/2,'#e9a68a');
  paintedSign('REDLINE · 07',0,4.9,-52,4.8,0,'#e9ad80');
  // Instanced dirt, cracked pavement and oxidation patches: one draw call
  // per material rather than hundreds of unrelated scene meshes.
  const rand=(()=>{let seed=0x5edc129;return ()=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;};})();
  const scatter=(material,count,sizeX,sizeZ,avoid=[])=>{
    const geometry=new THREE.BoxGeometry(1,1,1);
    const inst=new THREE.InstancedMesh(geometry,material,count);
    const dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){
      let x,z,attempts=0;
      do{x=(rand()-.5)*119;z=(rand()-.5)*100;attempts++;}
      while(attempts<8&&avoid.some(p=>
        Math.abs(x-p[0])<p[2]&&Math.abs(z-p[1])<p[3]));
      dummy.position.set(x,.023+rand()*.012,z);
      dummy.rotation.set(0,rand()*Math.PI*2,0);
      dummy.scale.set(sizeX*(.42+rand()*1.1),.008,sizeZ*(.35+rand()*1.2));
      dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
    }
    inst.receiveShadow=true;inst.frustumCulled=false;world.add(inst);
    return inst;
  };
  scatter(pbr(0x3d4846,.1,.99),highQuality?260:125,1.75,1.05);
  scatter(pbr(0x5a5650,.13,.98),highQuality?175:85,.88,.64);
  scatter(pbr(0x795c4a,.25,.96),highQuality?120:60,.32,.75);
  // Far skyline, broken roofline and chimneys create distance beyond fog.
  const skyline=group(0,0,0,1);
  for(let i=0;i<46;i++){
    const side=i%2===0?-1:1;
    const x=side*(78+rand()*17),z=(rand()-.5)*170;
    const h=7+rand()*16;
    const slab=block(skyline,i%4?tar:rustDark,x,h*.5-.3,z,4+rand()*7,h,3+rand()*5);
    slab.castShadow=false;
    if(i%3===0)block(skyline,rustDark,x+1.0,h+1.6,z,1.1,3.2,1.2);
  }
  // Suspended fabric and motes add subtle life without gameplay collisions.
  for(const [x,z,a] of [[-60,-10,0],[-60,20,.4],[60,-20,.2],[60,17,.1]]){
    const flag=block(world,x<0?blue:rust,x,4.1,z,1.2,.67,.04);
    flag.rotation.y=a;flags.push({mesh:flag,x,phase:z*.15});
    pipe(world,sheet,[x,3.0,z],[x,5.1,z],.04);
  }
  const dustGeometry=new THREE.BufferGeometry();
  const dustCount=highQuality?360:135;
  const dustPositions=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){
    dustPositions[i*3]=(rand()-.5)*122;
    dustPositions[i*3+1]=.6+rand()*5.3;
    dustPositions[i*3+2]=(rand()-.5)*105;
  }
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({
    color:0xe6c19b,size:.095,transparent:true,opacity:.38,
    depthWrite:false,blending:THREE.NormalBlending}));
  dust.frustumCulled=false;world.add(dust);
  // Two true dynamic practical lights; small emissive rivets handle the rest.
  const hazardLights=[];
  for(const [x,y,z,color] of [[-58,3.5,-42,0xfbb86d],[57,3.7,43,0xff9860]]){
    const light=new THREE.PointLight(color,.9,10,2);
    light.position.set(x,y,z);world.add(light);hazardLights.push(light);
  }
  let elapsed=0;
  function update(dt){
    const step=Math.max(0,Math.min(.06,Number.isFinite(dt)?dt:0));
    elapsed+=step;
    dust.position.x=Math.sin(elapsed*.13)*.85;
    dust.position.z=Math.cos(elapsed*.10)*.75;
    for(const f of flags){
      f.mesh.rotation.z=Math.sin(elapsed*1.6+f.phase)*.12;
      f.mesh.rotation.y=Math.sin(elapsed*.7+f.phase)*.14;
    }
    for(let i=0;i<hazardLights.length;i++){
      const wave=.81+.14*Math.sin(elapsed*(i+1)*3.2);
      const blink=(Math.sin(elapsed*(3.8+i)+i*2)> .94)?.48:1;
      hazardLights[i].intensity=wave*blink;
    }
  }
  function setQuality(high){
    dust.visible=!!high;
    for(const light of hazardLights)light.visible=!!high;
  }
  setQuality(highQuality);
  return {root,update,setQuality,metrics:{
    shacks:shackCount,wrecks:wreckCount,radioMasts:2,
    waterTowers:2,signs:4,individualMeshes:meshCount,
    groundInstances:(highQuality?260+175+120:125+85+60),
    animatedFlags:flags.length,dustCount
  }};
}
