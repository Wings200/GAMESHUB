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
    color:0x0b2834,roughness:.26,metalness:.24,
    transparent:false,clearcoat:.34,clearcoatRoughness:.22,
    side:THREE.DoubleSide
  });
  const water=makePlane(THREE,worldGroup,
    CANAL_EAST-CANAL_WEST,CANAL_LENGTH,CANAL_MID_X,0,-.40,waterMaterial);
  water.renderOrder=-1;

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
  const lineMat=new THREE.MeshBasicMaterial({color:0xa8b5bc});

  const makeSegment=(a,b,offset,width,height,material,up=0)=>{
    const dx=b.x-a.x, dz=b.z-a.z,dy=b.y-a.y;
    const horizontal=Math.hypot(dx,dz);
    if(horizontal<.01) return;
    const mesh=new THREE.Mesh(
      new THREE.BoxGeometry(width,height,Math.hypot(horizontal,dy)+.28),
      material
    );
    mesh.rotation.order="YXZ";
    mesh.rotation.y=Math.atan2(dx,dz);
    mesh.rotation.x=-Math.atan2(dy,horizontal);
    const nx=-dz/horizontal,nz=dx/horizontal;
    mesh.position.set((a.x+b.x)*.5+nx*offset,
      (a.y+b.y)*.5+up,
      (a.z+b.z)*.5+nz*offset);
    worldGroup.add(mesh);
  };

  let bridgeCount=0,piers=0;
  for(let i=0;i<sampleCount;i+=2){
    const a=trackSamples[i],b=trackSamples[(i+2)%sampleCount];
    if(!a||!b)continue;
    const high=(a.point.y+b.point.y)/2;
    if(high<1.0)continue;
    if(distance2D(a.point,b.point)>40)continue;

    // The concrete bridge extends beneath sidewalk / curb edges.
    makeSegment(a.point,b.point,0,sidewalkOuter*2+.7,.45,deckMaterial,-.27);
    for(const side of [-1,1]){
      makeSegment(a.point,b.point,side*(sidewalkOuter+.04),
        .32,.85,concrete,.38);
      makeSegment(a.point,b.point,side*(sidewalkOuter+.13),
        .15,.16,coping,1.05);
      makeSegment(a.point,b.point,side*(sidewalkOuter-1.0),
        .25,.28,girderMaterial,-.72);
      if(addRail) {
        const nx=a.normal.x*side*(sidewalkOuter+.02);
        const nz=a.normal.z*side*(sidewalkOuter+.02);
        const mx=b.normal.x*side*(sidewalkOuter+.02);
        const mz=b.normal.z*side*(sidewalkOuter+.02);
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
  return {segments:bridgeCount,piers};
}
