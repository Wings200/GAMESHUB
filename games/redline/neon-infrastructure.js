/*
 * REDLINE Neon V3 — waterway, graded highway and supporting terrain.
 * Visual geometry only; gameplay integration is handled by game.js.
 *
 * Geographically coherent city: a north-south commercial shipping canal
 * with real northern/southern vehicle bridge crossings. NO infinite slab
 * beneath the water, NO horizontal deck masquerading as an elevated road.
 */
const CANAL_WEST = 127;
const CANAL_EAST = 213;
const CANAL_LENGTH = 800;
const CANAL_MID_X = (CANAL_WEST + CANAL_EAST) / 2;

function matte(THREE,color,roughness=.94) {
  return new THREE.MeshStandardMaterial({color,roughness,metalness:.012});
}
function tileCanvas(THREE) {
  const c=document.createElement("canvas");
  c.width=512;c.height=512;
  const g=c.getContext("2d");
  g.fillStyle="#45494a";g.fillRect(0,0,512,512);
  let seed=2037;
  const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  // Non-grid mottled gravel and actual tiny expansion cracks.
  for(let i=0;i<18500;i++){
    const v=45+Math.floor(rnd()*52);
    g.fillStyle="rgba("+v+","+v+","+v+","+(0.07+rnd()*.10)+")";
    g.fillRect(rnd()*512,rnd()*512,.5+rnd()*2,.5+rnd()*2);
  }
  for(let i=0;i<12;i++){
    const x=rnd()*512,y=rnd()*512;
    g.lineWidth=.45+rnd()*.7;
    g.strokeStyle="rgba(18,23,25,.10)";
    g.beginPath();g.moveTo(x,y);
    g.lineTo(x+15+rnd()*35,y+rnd()*18);
    g.stroke();
  }
  const tex=new THREE.CanvasTexture(c);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=4;
  return tex;
}
function makePlane(THREE,group,width,depth,x,z,y,mat){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),mat);
  m.rotation.x=-Math.PI/2;m.position.set(x,y,z);
  group.add(m);return m;
}
function addBox(THREE,parent,sizes,position,mat){
  const m=new THREE.Mesh(new THREE.BoxGeometry(...sizes),mat);
  m.position.set(...position);parent.add(m);return m;
}
function distance2D(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function distanceToRail2D(point,a,b) {
  const vx=b.x-a.x,vz=b.z-a.z;
  const q=Math.max(0,Math.min(1,
    ((point.x-a.x)*vx+(point.z-a.z)*vz)/Math.max(.0001,vx*vx+vz*vz)));
  return Math.hypot(point.x-a.x-vx*q,point.z-a.z-vz*q);
}
function bridgeRailWouldCrossLane(a,b,side,roadHalf,sidewalkOuter,trackSamples,height,THREE) {
  const offset=side*(sidewalkOuter+.04);
  const start=a.point.clone().addScaledVector(a.normal,offset);
  const end=b.point.clone().addScaledVector(b.normal,offset);
  // Tight downhill hairpins and road connectors may cut across a
  // bridge's outer parapet. Do not generate a hard wall through asphalt.
  for (const sample of trackSamples) {
    if(Math.abs(sample.point.y-height)>2.4) continue;
    if(distanceToRail2D(sample.point,start,end)<roadHalf+1.0) return true;
  }
  return false;
}

function waterNormalTexture(THREE) {
  // Tangent-space normal map built from several overlapping wind waves.
  // Repeats along the commercial canal instead of presenting flat plastic.
  const canvas=document.createElement("canvas");
  canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext("2d");
  const pixels=ctx.createImageData(256,256);
  for(let y=0;y<256;y++){
    for(let x=0;x<256;x++){
      const tx=x/256,ty=y/256;
      const phase=tx*35+ty*14;
      const u=.17*Math.sin(phase*1.1)+.08*Math.sin(tx*95-ty*21);
      const v=.20*Math.sin(phase*.78)+.09*Math.sin(ty*79+tx*12);
      const i=(y*256+x)*4;
      pixels.data[i]=Math.max(0,Math.min(255,128+u*115));
      pixels.data[i+1]=Math.max(0,Math.min(255,128+v*115));
      pixels.data[i+2]=246;
      pixels.data[i+3]=255;
    }
  }
  ctx.putImageData(pixels,0,0);
  const tex=new THREE.CanvasTexture(canvas);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(4,15);
  tex.anisotropy=4;
  return tex;
}

/* Ground broken into actual riverbanks. Wide river trench means no
   "cardboard concrete" plane under the water. */
export function buildWaterfront({
  THREE,worldGroup,
  sceneWidth=2480,sceneDepth=2320,
  registerBuilding
}) {
  const landTexture=tileCanvas(THREE);
  const bankMaterial=matte(THREE,0xb6bac0);
  const darkLand=matte(THREE,0x3a3f45);
  darkLand.map=landTexture;
  const landWest=(CANAL_WEST+sceneWidth/2);
  const landEast=(sceneWidth/2-CANAL_EAST);
  makePlane(THREE,worldGroup,landWest,sceneDepth,
    (CANAL_WEST-sceneWidth/2)/2,0,-.027,darkLand);
  makePlane(THREE,worldGroup,landEast,sceneDepth,
    (CANAL_EAST+sceneWidth/2)/2,0,-.027,darkLand);

  // Water terminates in the harbor beyond the visible built-up blocks.
  // Shore banks are vertical concrete quays, with a top edge/pedestrian route.
  const waterMaterial=new THREE.MeshPhysicalMaterial({
    color:0x0a2636,roughness:.21,metalness:.12,
    transparent:false,clearcoat:.58,clearcoatRoughness:.17,
    normalMap:waterNormalTexture(THREE),
    normalScale:new THREE.Vector2(.33,.33),
    side:THREE.DoubleSide
  });
  const water=makePlane(THREE,worldGroup,
    CANAL_EAST-CANAL_WEST,CANAL_LENGTH,CANAL_MID_X,0,-.40,waterMaterial);
  water.renderOrder=-1;
  water.onBeforeRender=()=>{
    if(water.material.normalMap){
      water.material.normalMap.offset.y=(performance.now()*.000011)%1;
    }
  };

  // Land continues north/south of the water channel as a separate peninsula.
  const endLength=(sceneDepth-CANAL_LENGTH)/2;
  for(const s of [-1,1]){
    makePlane(THREE,worldGroup,CANAL_EAST-CANAL_WEST,endLength,
      CANAL_MID_X,s*(CANAL_LENGTH/2+endLength/2),-.027,darkLand);
  }
  for(const x of [CANAL_WEST,CANAL_EAST]){
    const sign=x===CANAL_WEST?-1:1;
    addBox(THREE,worldGroup,[1.9,1.35,CANAL_LENGTH],
      [x,.05,0],matte(THREE,0x5d636a));
    addBox(THREE,worldGroup,[3.7,.17,CANAL_LENGTH],
      [x+sign*2,.16,0],bankMaterial);
    // The quay wall is a real low collision boundary at ground level;
    // its height intentionally stays below the elevated bridge deck.
    if(registerBuilding) {
      registerBuilding(new THREE.Vector3(x,0,0),1.9,CANAL_LENGTH,0,1.4,"CANAL QUAY");
    }
    // Waterfront streetlights/rails do not block elevated bridge.
    for(let z=-365;z<365;z+=30){
      addBox(THREE,worldGroup,[.21,1.1,.21],
        [x+sign*1.75,.86,z],matte(THREE,0x424c55));
      addBox(THREE,worldGroup,[.13,.12,23],
        [x+sign*1.75,1.40,z+11.5],matte(THREE,0x68747f));
    }
  }
  // Low harbor pier buildings, cargo sheds, cranes and dock edge equipment.
  const cargo=matte(THREE,0x3a4953);
  for(const side of [-1,1]){
    const x=side===-1?CANAL_WEST-23:CANAL_EAST+23;
    for(let z=-280;z<280;z+=94){
      if (Math.abs(z-173)<38||Math.abs(z+152)<38) continue;
      const dock=addBox(THREE,worldGroup,[21,.6,40],[x,-.20,z],bankMaterial);
      const warehouse=addBox(THREE,worldGroup,[16,6.5,27],
        [x,3.55,z],cargo);
      const roof=addBox(THREE,worldGroup,[17,.4,28],[x,7,z],
        matte(THREE,0x67747c));
      for(let i=-1;i<=1;i++) {
        addBox(THREE,worldGroup,[2.1,2.8,.1],
          [x+side*8.1,2.8,z+i*7.2],
          matte(THREE,0x1a2730));
      }
      if(registerBuilding) {
        registerBuilding(new THREE.Vector3(x,0,z),16,27,0,7.5);
      }
    }
  }
  return {west:CANAL_WEST,east:CANAL_EAST};
}

/**
 * Continuous side-skirts for graded pavement and continuous bridge decks.
 * Replaces the old stack of independent rectangular boxes at every uphill
 * sample (whose exposed end-caps looked like cross-road rectangles).
 *
 * The top is sunk beneath the driveable ribbon; the skirt extends to
 * natural ground (or the bridge's soffit) without horizontal seams.
 */
function buildContinuousRoadSupport({
  THREE, worldGroup, trackSamples, sampleCount, sidewalkOuter
}) {
  const groundFaces=[];
  const bridgeFaces=[];
  const addQuad=(buffer,a,b,c,d)=>{
    for(const p of [a,b,c,a,c,d]) buffer.push(p.x,p.y,p.z);
  };
  const at=(sample,offset,y)=>new THREE.Vector3(
    sample.point.x+sample.normal.x*offset,
    y,
    sample.point.z+sample.normal.z*offset
  );
  const onBridge=(a,b)=>{
    const x=(a.point.x+b.point.x)*.5;
    const z=(a.point.z+b.point.z)*.5;
    return (x>=65 && x<=280 && z>=75 && z<=240) ||
           (x>=65 && x<=280 && z>=-235 && z<=-75);
  };
  let gradeSections=0, bridgeSections=0;
  for(let i=0;i<sampleCount;i++){
    const a=trackSamples[i], b=trackSamples[(i+1)%sampleCount];
    if(!a||!b||distance2D(a.point,b.point)>20)continue;
    const h=(a.point.y+b.point.y)/2;
    if(h<.27)continue;
    const bridge=onBridge(a,b);
    const faces=bridge?bridgeFaces:groundFaces;
    const w=sidewalkOuter+(bridge?.34:.32);
    const topA=Math.max(.005,a.point.y-(bridge?.20:.14));
    const topB=Math.max(.005,b.point.y-(bridge?.20:.14));
    const baseA=bridge ? a.point.y-.77 : -.10;
    const baseB=bridge ? b.point.y-.77 : -.10;
    const spreadA=bridge ? w : w+1.1+Math.min(13,a.point.y*1.13);
    const spreadB=bridge ? w : w+1.1+Math.min(13,b.point.y*1.13);
    const upperLeftA=at(a,-w,topA),upperRightA=at(a,w,topA);
    const upperLeftB=at(b,-w,topB),upperRightB=at(b,w,topB);
    const lowerLeftA=at(a,-spreadA,baseA),lowerRightA=at(a,spreadA,baseA);
    const lowerLeftB=at(b,-spreadB,baseB),lowerRightB=at(b,spreadB,baseB);
    // The road top is the continuous raceway ribbon built by game.js.
    // This solid surface lives slightly below it and fills all gaps.
    addQuad(faces,upperLeftA,upperRightA,upperRightB,upperLeftB);
    addQuad(faces,upperLeftA,upperLeftB,lowerLeftB,lowerLeftA);
    addQuad(faces,upperRightB,upperRightA,lowerRightA,lowerRightB);
    if(bridge)bridgeSections++;else gradeSections++;
  }
  const draw=(buffer,color)=>{
    if(!buffer.length)return;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.Float32BufferAttribute(buffer,3));
    geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
      color,metalness:.02,roughness:.97,side:THREE.DoubleSide
    }));
    worldGroup.add(mesh);
  };
  draw(groundFaces,0x252a31);
  draw(bridgeFaces,0x4d565f);
  return {gradeSections,bridgeSections};
}

/**
 * Deck, edge parapets, structural girders and concrete piers. Driveable
 * surface stays the original dynamically sampled road ribbon in game.js.
 * Geometric bridge deck hangs under that surface and follows its 3D pitch.
 * Returns 2D rail segments for the game's normal barrier physics.
 */
export function buildRaisedRoads({
  THREE,worldGroup,trackSamples,sampleCount,
  roadHalf,sidewalkOuter,addRail,addPierCollider
}) {
  const deckMaterial=matte(THREE,0x555d63,.88);
  const girderMaterial=matte(THREE,0x2e363f,.62);
  const concrete=matte(THREE,0x929496,.92);
  const coping=matte(THREE,0x747a83,.75);
  const supportStats=buildContinuousRoadSupport({
    THREE,worldGroup,trackSamples,sampleCount,sidewalkOuter
  });

  // Bridge parapets and piers are still batched to limit draw calls.
  // Instance matrices preserve each road span's slope, yaw and dimensions.
  const batches=new Map();
  const makeSegment=(a,b,offset,width,height,material,up=0)=>{
    const dx=b.x-a.x, dz=b.z-a.z,dy=b.y-a.y;
    const horizontal=Math.hypot(dx,dz);
    if(horizontal<.01) return;
    const nx=-dz/horizontal,nz=dx/horizontal;
    if(!batches.has(material)) batches.set(material,[]);
    batches.get(material).push({
      x:(a.x+b.x)*.5+nx*offset,
      y:(a.y+b.y)*.5+up,
      z:(a.z+b.z)*.5+nz*offset,
      yaw:Math.atan2(dx,dz),
      pitch:-Math.atan2(dy,horizontal),
      width,height,length:Math.hypot(horizontal,dy)+.28
    });
  };


  let bridgeCount=0,piers=0;
  for(let i=0;i<sampleCount;i+=2){
    const a=trackSamples[i],b=trackSamples[(i+2)%sampleCount];
    if(!a||!b)continue;
    const high=(a.point.y+b.point.y)/2;
    if(high<1.0)continue;
    if(distance2D(a.point,b.point)>40)continue;

    // An elevated altitude does NOT automatically mean a bridge.
    // Only the two actual shipping canal crossings need piers and
    // bridge parapets. The western graded streets are ground-backed.
    const x=(a.point.x+b.point.x)/2;
    const z=(a.point.z+b.point.z)/2;
    const northBridge = x>=65 && x<=280 && z>=75 && z<=240;
    const southBridge = x>=65 && x<=280 && z>=-235 && z<=-75;
    if(!northBridge && !southBridge) {
      // Ordinary uphill city streets use continuous sloped embankments;
      // no more rectangular roadbed boxes or bridge parapets.
      continue;
    }

    // Main deck is now one connected continuous ribbon, not discrete boxes.
    for(const side of [-1,1]){
      const railCrossesLane=bridgeRailWouldCrossLane(
        a,b,side,roadHalf,sidewalkOuter,trackSamples,high,THREE);
      // Still draw the underside girders, but never place raised guard
      // parapets (or their physical segments) across the usable road.
      if(!railCrossesLane) makeSegment(a.point,b.point,side*(sidewalkOuter+.04),
        .32,.85,concrete,.38);
      if(!railCrossesLane) makeSegment(a.point,b.point,side*(sidewalkOuter+.13),
        .15,.16,coping,1.05);
      makeSegment(a.point,b.point,side*(sidewalkOuter-1.0),
        .25,.28,girderMaterial,-.72);
      if(addRail && !railCrossesLane) {
        // Physics must use precisely the same offset as the
        // clearance-tested, rendered parapet, not a nearer parallel rail.
        const nx=a.normal.x*side*(sidewalkOuter+.04);
        const nz=a.normal.z*side*(sidewalkOuter+.04);
        const mx=b.normal.x*side*(sidewalkOuter+.04);
        const mz=b.normal.z*side*(sidewalkOuter+.04);
        addRail(
          new THREE.Vector2(a.point.x+nx,a.point.z+nz),
          new THREE.Vector2(b.point.x+mx,b.point.z+mz),
          (a.point.y+b.point.y)/2
        );
      }
    }
    // Heavy piers sit on ground or riverbed, safely below the road deck.
    if(i%12===0 && high>2.8){
      const water =
        a.point.x>CANAL_WEST&&a.point.x<CANAL_EAST &&
        Math.abs(a.point.z)<CANAL_LENGTH/2;
      const base=water?-.40:0;
      const h=Math.max(.2,high-base-.60);
      addBox(THREE,worldGroup,[2.8,h,2.8],
        [a.point.x,base+h/2,a.point.z],concrete);
      addBox(THREE,worldGroup,[4,.5,4],
        [a.point.x,base+.25,a.point.z],coping);
      if(addPierCollider) addPierCollider(
        new THREE.Vector3(a.point.x,base,a.point.z),
        1.4,1.4,Math.max(base,base+h-.65)
      );
      piers++;
    }
    bridgeCount++;
  }
  for(const [material,entries] of batches) {
    if(!entries.length) continue;
    const mesh=new THREE.InstancedMesh(
      new THREE.BoxGeometry(1,1,1),
      material,entries.length
    );
    const dummy=new THREE.Object3D();
    for(let i=0;i<entries.length;i++) {
      const e=entries[i];
      dummy.position.set(e.x,e.y,e.z);
      dummy.rotation.order="YXZ";
      dummy.rotation.y=e.yaw;
      dummy.rotation.x=e.pitch;
      dummy.scale.set(e.width,e.height,e.length);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
    worldGroup.add(mesh);
  }

  return {segments:bridgeCount,piers,batches:batches.size,
    gradeSections:supportStats.gradeSections,
    continuousBridgeSections:supportStats.bridgeSections};
}
