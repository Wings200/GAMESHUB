import {THREE} from '../../engine/core.js';
import {createSurfaceLibrary} from '../../engine/surfaces.js';
import {stepPhase} from '../../engine/motion.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const PIXEL_TEXTURE = 1024;
function makeSign(title, subtitle, {background='#222b2e',color='#f2eee4',accent='#c7b182'}={}) {
  const c=document.createElement('canvas');
  c.width=PIXEL_TEXTURE*2;c.height=PIXEL_TEXTURE/2;
  const ctx=c.getContext('2d');
  ctx.fillStyle=background;ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle=accent;ctx.fillRect(76,70,8,365);
  ctx.textBaseline='middle';
  ctx.fillStyle=color;ctx.font='800 132px system-ui, sans-serif';
  ctx.fillText(title,118,228,1780);
  ctx.fillStyle=accent;ctx.font='600 53px system-ui, sans-serif';
  ctx.fillText(subtitle.toUpperCase(),118,344,1770);
  const tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=8;
  return tex;
}

function buildScene(engine) {
  const scene=engine.scene;
  const surface=createSurfaceLibrary();
  const mat=surface.materials;
  const root=new THREE.Group();
  root.name='GAMESHUB_Architectural_Test_Lab';
  scene.add(root);
  scene.background=new THREE.Color('#343a3b');
  scene.fog=new THREE.Fog('#343a3b',38,87);
  const geometries=new Map(), uniqueGeometries=new Set(), ownedMaterials=new Set(), ownedTextures=new Set();
  const fixtures=[], animated=[];
  function cube(name,dimensions,material,xyz,options={}) {
    const [w,h,d]=dimensions, r=Math.min(options.radius||0,w*.22,h*.22,d*.22);
    const key=[w,h,d,r].join(',');
    let geo=geometries.get(key);
    if(!geo) {
      geo=r>0?new RoundedBoxGeometry(w,h,d,3,r):new THREE.BoxGeometry(w,h,d);
      geometries.set(key,geo);uniqueGeometries.add(geo);
    }
    const mesh=new THREE.Mesh(geo,material);
    mesh.name=name;
    mesh.position.set(...xyz);
    mesh.castShadow=options.cast!==false;
    mesh.receiveShadow=true;
    root.add(mesh);
    return mesh;
  }
  function round(name,radius,height,material,xyz,{segments=32,topRadius=radius,cast=true}={}) {
    const key=['c',radius,topRadius,height,segments].join(',');
    let geo=geometries.get(key);
    if(!geo){geo=new THREE.CylinderGeometry(topRadius,radius,height,segments);geometries.set(key,geo);uniqueGeometries.add(geo);}
    const mesh=new THREE.Mesh(geo,material);
    mesh.name=name; mesh.position.set(...xyz);
    mesh.castShadow=cast;mesh.receiveShadow=true;root.add(mesh);
    return mesh;
  }
  function ring(name,major,tube,material,xyz,rotation=[0,0,0]) {
    const geo=new THREE.TorusGeometry(major,tube,12,56);
    uniqueGeometries.add(geo);
    const mesh=new THREE.Mesh(geo,material);
    mesh.name=name;mesh.position.set(...xyz);mesh.rotation.set(...rotation);
    mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    return mesh;
  }
  function sign(title,subtitle,xyz,size=[6.6,1.65],options={}) {
    const texture=makeSign(title,subtitle,options);
    const material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
    const geo=new THREE.PlaneGeometry(...size);
    uniqueGeometries.add(geo);ownedMaterials.add(material);ownedTextures.add(texture);
    const plaque=new THREE.Mesh(geo,material);
    plaque.name='Wall label: '+title;
    plaque.position.set(...xyz);
    root.add(plaque);
    return plaque;
  }

  // A real architectural space: neutral daylight, mineral floor, engineered
  // steel frames and believable room scale. Geometry is shared where possible.
  cube('Structural slab',[25,.36,36.2],mat.floor,[0,-.2,0],{cast:false});
  cube('Ceiling deck',[25,.27,36.2],mat.matte,[0,7.08,0],{cast:false});
  for(const z of [-17.6,17.6])
    cube('End concrete wall',[25,7,.35],mat.wall,[0,3.46,z],{cast:false});
  for(const x of [-12.35,12.35])
    cube('Side concrete wall',[.35,7,36],mat.wall,[x,3.46,0],{cast:false});

  // 280 instanced floor panels, not hundreds of materials and draw calls.
  const tileGeo=new THREE.BoxGeometry(1.68,.035,1.68);
  uniqueGeometries.add(tileGeo);
  const tiles=new THREE.InstancedMesh(tileGeo,mat.floor,14*20);
  const dummy=new THREE.Object3D();
  const tint=new THREE.Color();
  let id=0;
  for(let z=0;z<20;z++) for(let x=0;x<14;x++) {
    dummy.position.set(-11.45 + x*1.76, .013, -16.75 + z*1.76);
    dummy.updateMatrix();
    tiles.setMatrixAt(id,dummy.matrix);
    const v=0.976 + ((x*11+z*7)%9)*0.0035;
    tint.setRGB(v,v,v);
    tiles.setColorAt(id++,tint);
  }
  tiles.name='Instanced industrial floor slabs';
  tiles.receiveShadow=true;root.add(tiles);
  // Minimal seams, no fake screen-level film grain.
  for(const z of [-14,-7,0,7,14]){
    for(const x of [-12.05,12.05]) {
      cube('Vertical structural column',[.42,6.93,.56],mat.paintedMetal,[x,3.5,z],{cast:false});
      cube('Column inset',[.07,5.82,.32],mat.darkMetal,[x+(x>0?-.25:.25),3.4,z],{cast:false});
      cube('Column foot',[.74,.18,.78],mat.iron,[x,.12,z],{cast:false});
    }
    cube('Overhead steel beam',[24.3,.38,.52],mat.darkMetal,[0,6.85,z],{cast:false});
    cube('Beam flange',[24.1,.09,.82],mat.iron,[0,6.57,z],{cast:false});
  }
  for(const z of [-15,-11,-7,-3,1,5,9,13]) {
    for(const x of [-8.6,0,8.6]) {
      const housing=cube('Recessed luminaire housing',[3.7,.15,.9],mat.blackSteel,[x,6.76,z],{cast:false});
      cube('Warm diffused ceiling light',[3.35,.025,.68],mat.light,[x,6.66,z],{cast:false});
    }
  }
  // In-wall functional-looking conduit and ventilation.
  for(const x of [-11.93,11.93]){
    for(const y of [1.1,5.88])
      cube('Surface conduit',[.16,.15,32.8],mat.darkMetal,[x,y,0],{cast:false});
  }
  for(const z of [11.2,1.3,-11.1]) {
    cube('Duct housing',[1.7,.53,2.6],mat.darkMetal,[0,6.34,z],{cast:false});
    for(let s=0;s<7;s++)
      cube('Air grille vane',[1.38,.035,.10],mat.iron,[0,6.02,z-1.1+s*.34],{cast:false});
  }
  // Actual floor expansion joints with safety markings, not glowing stripes.
  for(const x of [-11.78,11.78])
    cube('Perimeter drain',[.18,.025,33.2],mat.blackSteel,[x,.045,0],{cast:false});
  for(const z of [-17,17])
    cube('Perimeter drain',[23.7,.025,.14],mat.blackSteel,[0,.045,z],{cast:false});
  // Service doorway and real-world details.
  cube('Service door frame',[3.5,4.2,.23],mat.blackSteel,[-8.55,2.1,-17.27]);
  cube('Service door',[3.1,3.82,.15],mat.paintedMetal,[-8.55,1.98,-17.10]);
  cube('Door push bar',[1.5,.12,.08],mat.darkMetal,[-8.55,1.14,-16.98]);
  sign('EXIT','AUTHORIZED STAFF',[-8.55,4.72,-17.05],[3.2,.8],{background:'#24443b',accent:'#a6dbb6'});
  cube('Back wall feature trim',[11.8,2.12,.14],mat.blackSteel,[2.8,4.69,-17.12],{cast:false});
  sign('GAMESHUB ENGINE','MATERIALS  /  LIGHTING  /  MOTION',[2.8,4.69,-17.0],[10.8,2.7],{background:'#272e30',accent:'#d5b77f'});
  // Metal-backed calibration stand: three *physical parts*, not levitating spheres.
  const specimens=[
    {x:-6.4,title:'STEEL',detail:'MACHINED / SATIN',type:'steel'},
    {x:0,title:'GLASS',detail:'OPTICAL / TRANSMISSION',type:'glass'},
    {x:6.4,title:'BRONZE',detail:'CAST / BRUSHED',type:'bronze'}
  ];
  const obstacles=[];
  for (const sp of specimens){
    const z=-8.4;
    cube('Pedestal floor pad',[3.06,.16,3.02],mat.blackSteel,[sp.x,.08,z],{radius:.04});
    cube('Pedestal housing',[2.38,1.22,2.32],mat.darkMetal,[sp.x,.75,z],{radius:.09});
    cube('Pedestal top surface',[2.62,.13,2.58],mat.paintedMetal,[sp.x,1.43,z],{radius:.03});
    const stage=round('Bearing turntable',.95,.11,mat.iron,[sp.x,1.55,z]);
    const build=new THREE.Group();
    build.position.set(sp.x,1.68,z);
    build.name=sp.title+' moving assembly';
    root.add(build);
    const part=(name,geometry,material,x,y,z,rotX=0)=>{
      uniqueGeometries.add(geometry);
      const mesh=new THREE.Mesh(geometry,material);
      mesh.name=name;mesh.position.set(x,y,z);mesh.rotation.x=rotX;
      mesh.castShadow=true;mesh.receiveShadow=true;build.add(mesh);
      return mesh;
    };
    if(sp.type==='steel'){
      part('Precision stainless housing',new THREE.CylinderGeometry(.63,.67,.52,56),mat.iron,0,.35,0);
      part('Machined shoulder',new THREE.CylinderGeometry(.49,.61,.26,56),mat.paintedMetal,0,.73,0);
      part('Central spindle',new THREE.CylinderGeometry(.17,.17,.72,32),mat.iron,0,1.2,0);
      part('Upper hub',new THREE.CylinderGeometry(.37,.37,.17,40),mat.darkMetal,0,1.55,0);
      part('Satin steel flange',new THREE.TorusGeometry(.54,.095,16,60),mat.iron,0,.56,0,Math.PI/2);
      for(let a=0;a<8;a++){
        const theta=a*Math.PI/4;
        part('Stainless bolt',new THREE.CylinderGeometry(.055,.055,.09,8),mat.blackSteel,Math.cos(theta)*.48,.79,Math.sin(theta)*.48);
      }
    } else if(sp.type==='glass'){
      const outline=[
        new THREE.Vector2(0,0),new THREE.Vector2(.38,0),new THREE.Vector2(.47,.08),new THREE.Vector2(.47,.2),
        new THREE.Vector2(.43,.27),new THREE.Vector2(.43,.91),new THREE.Vector2(.35,1.05),
        new THREE.Vector2(.27,1.19),new THREE.Vector2(.28,1.33),new THREE.Vector2(.29,1.4)
      ];
      part('Optical glass vessel',new THREE.LatheGeometry(outline,64),mat.glass,0,.12,0);
      part('Porcelain core',new THREE.CylinderGeometry(.12,.12,1.04,48),mat.ceramic,0,.83,0);
      part('Lower seal',new THREE.TorusGeometry(.42,.035,12,64),mat.rubber,0,.31,0,Math.PI/2);
      part('Upper cap',new THREE.CylinderGeometry(.3,.3,.14,48),mat.iron,0,1.59,0);
    } else {
      part('Bronze gear body',new THREE.CylinderGeometry(.56,.68,.67,48),mat.brass,0,.42,0);
      part('Cast collar',new THREE.CylinderGeometry(.39,.39,.3,48),mat.copper,0,.96,0);
      part('Central valve shaft',new THREE.CylinderGeometry(.12,.12,.68,32),mat.iron,0,1.31,0);
      part('Valve wheel',new THREE.TorusGeometry(.58,.09,14,64),mat.copper,0,1.7,0,Math.PI/2);
      for(let a=0;a<6;a++){
        const theta=a*Math.PI/3;
        const spoke=part('Radial valve spoke',new THREE.BoxGeometry(.49,.065,.09),mat.brass,
          Math.cos(theta)*.24,1.7,Math.sin(theta)*.24);
        spoke.rotation.y=-theta;
      }
      part('Valve wheel hub',new THREE.CylinderGeometry(.19,.19,.16,32),mat.iron,0,1.7,0);
    }
    animated.push({group:build,phase:sp.x*.14,base:build.rotation.y});
    sign(sp.title,sp.detail,[sp.x,1.01,-7.1],[2.14,.535],{background:'#28343a',accent:'#d7bc89'});
    obstacles.push({minX:sp.x-1.6,maxX:sp.x+1.6,minZ:-10.05,maxZ:-6.9});
  }
  // Functional-looking maintenance workstation.
  const deskZ=7.9, deskX=9.8;
  cube('Workshop steel table top',[3.5,.19,1.63],mat.wood,[deskX,1.17,deskZ],{radius:.035});
  for(const x of [deskX-1.45,deskX+1.45]) for(const z of [deskZ-.62,deskZ+.62])
    cube('Workshop leg',[.12,1.14,.12],mat.blackSteel,[x,.57,z]);
  cube('Instrument rack',[2.3,1.42,.29],mat.darkMetal,[deskX,2.05,8.55],{radius:.04});
  cube('Control screen',[1.68,.91,.028],mat.screen,[deskX,2.17,8.36]);
  for(let k=0;k<4;k++) round('Bench control knob',.095,.075,mat.brass,[deskX-0.74+k*.48,1.32,7.25],{segments:16});
  cube('Technician tool case',[.73,.35,.38],mat.paintedMetal,[deskX-.94,1.47,7.85],{radius:.035});
  for(let k=0;k<4;k++){
    cube('Tool-box latch',[.14,.045,.04],mat.blackSteel,[deskX-1.17+k*.18,1.51,7.64]);
  }
  obstacles.push({minX:7.9,maxX:11.8,minZ:6.7,maxZ:8.9});

  // Shelving, structural storage and believable scale references.
  for(const y of [.18,1.6,3.0,4.4]) cube('Shelf beam',[1.73,.1,4.48],mat.darkMetal,[-10.66,y,5.5]);
  for(const z of [3.35,7.65]) for(const x of [-11.4,-9.9])
    cube('Steel upright',[.12,4.65,.12],mat.blackSteel,[x,2.3,z]);
  for (const [x,y,z,w,h,d] of [
    [-10.65,.67,4.2,.92,.88,.8],[-10.68,.72,5.43,1.2,.97,1.1],
    [-10.7,2.11,4.5,1.03,.78,.87],[-10.7,3.54,6.2,.93,.78,.95]
  ]) cube('Supply crate',[w,h,d],mat.wood,[x,y,z],{radius:.02});
  obstacles.push({minX:-11.85,maxX:-9.6,minZ:3.1,maxZ:7.8});
  // Safety paint and anchored guard rails.
  for(const x of [-11.62,11.62]) {
    for(const z of [-1.5,1.5]){
      cube('Safety bollard',[.25,1.0,.25],mat.brass,[x,.5,z],{radius:.04});
      cube('Bollard base',[.46,.08,.46],mat.blackSteel,[x,.06,z]);
    }
  }

  // White-balanced area fill, a directional shadow caster and true light
  // emitting surfaces. Environment probes make metals legible, not black.
  let environmentTarget=null, pmrem=null, environmentScene=null;
  try {
    pmrem=new THREE.PMREMGenerator(engine.renderer);
    environmentScene=new RoomEnvironment();
    environmentTarget=pmrem.fromScene(environmentScene,.04);
    scene.environment=environmentTarget.texture;
  } catch(error) {
    console.warn('GAMESHUB: environment reflections unavailable; direct lighting retained.',error);
  } finally {
    pmrem?.dispose();
    environmentScene?.dispose();
  }
  const ambient=new THREE.HemisphereLight(0xe8eef1,0x484a49,1.75);
  scene.add(ambient);fixtures.push(ambient);
  const key=new THREE.DirectionalLight(0xfff3e0,2.7);
  key.position.set(-8.5,13.5,7.5);
  key.castShadow=true;
  key.shadow.camera.left=-18;key.shadow.camera.right=18;
  key.shadow.camera.top=24;key.shadow.camera.bottom=-24;
  key.shadow.camera.near=.5;key.shadow.camera.far=50;
  key.shadow.mapSize.set(1024,1024);
  key.shadow.normalBias=.023;
  scene.add(key,key.target);fixtures.push(key,key.target);
  const fill=new THREE.DirectionalLight(0xc2dce9,.72);
  fill.position.set(10,7,-6);
  scene.add(fill);fixtures.push(fill);
  for(const x of [-8.6,0,8.6]) for(const z of [-9,4,12]) {
    const light=new THREE.PointLight(0xffe5bf,x===0?20:15,11,2);
    light.position.set(x,6.25,z);
    scene.add(light);fixtures.push(light);
  }
  const focus=new THREE.SpotLight(0xe8f4ff,105,22,.53,.76,1.6);
  focus.position.set(-4,6.5,-2.2);
  focus.target.position.set(0,1.6,-8.4);
  scene.add(focus,focus.target);fixtures.push(focus,focus.target);

  const setShadowQuality=(profile)=>{
    const size=profile==='quality'?2048:profile==='performance'?512:1024;
    key.shadow.mapSize.set(size,size);
    key.shadow.map?.dispose();
    key.shadow.map=null;
    key.castShadow=profile!=='performance';
    engine.renderer.shadowMap.needsUpdate=true;
  };
  let animate=true, phase=0;
  const removeFrame=engine.onFrame((dt,time)=>{
    if(animate) phase=stepPhase(phase,.24,dt);
    for(const [index,model] of animated.entries())
      model.group.rotation.y=model.base + phase*(index%2===0?1:-1);
  });
  engine.camera.position.set(0,1.72,12.2);
  const quality=engine.quality;
  setShadowQuality(quality);
  return {
    root,key,ambient,obstacles,bounds:{minX:-11.83,maxX:11.83,minZ:-17.0,maxZ:17.0},
    setMotion(value){animate=Boolean(value);},
    getMotion(){return animate;},
    setShadowQuality,
    dispose(){
      removeFrame();
      root.removeFromParent();
      for(const object of fixtures) object.removeFromParent();
      scene.environment=null;
      environmentTarget?.dispose();
      for(const geo of uniqueGeometries) geo.dispose();
      for(const m of ownedMaterials) m.dispose();
      for(const t of ownedTextures) t.dispose();
      surface.dispose();
    }
  };
}
export const createTestRoom=buildScene;
