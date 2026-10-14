/*
 * REDLINE / NEON DISTRICT — art-only rendering module.
 *
 * Contains no race, checkpoint, physics, matchmaking or socket logic.
 * Public-domain source assets:
 * - Poly Haven asphalt_03 and concrete_floor (CC0)
 * - Kenney City Kit Industrial / Roads (CC0)
 * - Quaternius Buildings pack (asset collection marked CC0)
 * See NEON_ASSET_SOURCES.md.
 */

const SOURCE_ROOT =
  "https://raw.githubusercontent.com/AetherRadar/operation-steel-tide/main/assets/";

const MATERIALS = {
  asphalt: ["asphalt_03_diff_1k.jpg", "asphalt_03_normal_1k.jpg", "asphalt_03_rough_1k.jpg"],
  concrete: ["concrete_floor_diff_1k.jpg", "concrete_floor_normal_1k.jpg", "concrete_floor_rough_1k.jpg"]
};

function noise01(n) {
  let x = Math.sin(n * 127.1 + 41.7) * 43758.5453;
  return x - Math.floor(x);
}

function colorHex(hex) {
  return "#" + hex.toString(16).padStart(6, "0");
}

function canvasTexture(THREE, canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const textureCache = new Map();

/**
 * Real PBR textures load independently and may fail without hiding the existing
 * procedurally generated fallback. Never blocks the track or multiplayer.
 */
export function applyPbr({ THREE, renderer, sceneRoot, material, kind,
                           repeatX = 1, repeatY = 1 }) {
  const files = MATERIALS[kind];
  if (!files) return;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");

  const slots = ["map", "normalMap", "roughnessMap"];
  files.forEach((name, i) => {
    const key = kind + ":" + i + ":" + repeatX + ":" + repeatY;
    let texture = textureCache.get(key);

    if (!texture) {
      texture = loader.load(
        SOURCE_ROOT + "textures/" + name,
        () => {
          if (!sceneRoot.parent) return;
          material[slots[i]] = texture;
          material.color.set(0xc6ccd0);
          material.bumpMap = null;
          material.roughness = kind === "asphalt" ? 0.86 : 0.96;
          material.metalness = kind === "asphalt" ? 0.018 : 0.0;
          material.normalScale = new THREE.Vector2(0.45, 0.45);
          material.needsUpdate = true;
        },
        undefined,
        () => { /* Keep procedural fallback. */ }
      );
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (i === 0) texture.colorSpace = THREE.SRGBColorSpace;
      textureCache.set(key, texture);
    } else if (texture.image && sceneRoot.parent) {
      material[slots[i]] = texture;
      material.color.set(0xc6ccd0);
      material.bumpMap = null;
      material.roughness = kind === "asphalt" ? 0.86 : 0.96;
      material.metalness = 0.018;
      material.normalScale = new THREE.Vector2(0.45, 0.45);
      material.needsUpdate = true;
    }
  });
}

export function facadeMap(THREE, type = "office") {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const g = canvas.getContext("2d");
  const brick = type === "brick";
  const shop = type === "shop";
  const base = brick ? "#6a5550" : shop ? "#505f67" : "#334250";
  const mortar = brick ? "#9a8781" : "#526373";
  g.fillStyle = base;
  g.fillRect(0, 0, 768, 1024);

  // Stone/concrete or brick course patterns, photograph-like surface grain.
  for (let i = 0; i < (brick ? 65 : 30); i++) {
    const y = i * (brick ? 16 : 35);
    g.fillStyle = mortar;
    g.globalAlpha = brick ? 0.20 : 0.09;
    g.fillRect(0, y, 768, brick ? 2 : 1);
  }
  if (brick) {
    for (let i = 0; i < 900; i++) {
      const x = noise01(i * 3 + 2) * 768;
      const y = noise01(i * 11 + 5) * 1024;
      g.globalAlpha = 0.08;
      g.fillStyle = noise01(i) > .5 ? "#f4c5ab" : "#242322";
      g.fillRect(x, y, 4 + noise01(i + 1) * 25, 1 + noise01(i + 4) * 7);
    }
  }
  g.globalAlpha = 1;

  // Architectural frames and window depth: a complete facade atlas.
  const cols = shop ? 5 : 6;
  const rows = brick ? 12 : 16;
  const cx = 768 / cols;
  const cy = 1024 / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cx + (brick ? 17 : 10);
      const y = r * cy + (brick ? 11 : 7);
      const w = cx - (brick ? 34 : 20);
      const h = cy - (brick ? 22 : 14);
      const lit = noise01(r * 131 + col * 17 + (brick ? 11 : 3)) > .58;
      g.fillStyle = brick ? "#b09c91" : "#647687";
      g.fillRect(x - 3, y - 3, w + 6, h + 6);
      g.fillStyle = "#121f2a";
      g.fillRect(x, y, w, h);
      const grad = g.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, lit ? "#62707a" : "#213848");
      grad.addColorStop(.62, lit ? "#aa9276" : "#112635");
      grad.addColorStop(1, lit ? "#cab390" : "#0a1925");
      g.fillStyle = grad;
      g.fillRect(x + 3, y + 3, w - 6, h - 6);
      g.globalAlpha = lit ? .22 : .40;
      g.fillStyle = lit ? "#fff1bb" : "#7f9eb5";
      g.fillRect(x + 4, y + 4, 5, h - 8);
      g.fillRect(x + 6, y + 4, w * .18, 3);
      g.globalAlpha = 1;
      g.fillStyle = "#17212c";
      g.fillRect(x + w * .50 - 2, y, 4, h);
      g.fillRect(x, y + h * .56 - 2, w, 3);
      if (brick && r % 3 === 0) {
        g.fillStyle = "#bb9c8a";
        g.fillRect(x - 10, y + h + 1, w + 20, 4);
      }
    }
  }
  // Atlas features: soot, grime, and chipped wall staining.
  for (let i = 0; i < 4200; i++) {
    const x = noise01(i * 17 + 8) * 768;
    const y = noise01(i * 19 + 21) * 1024;
    g.fillStyle = noise01(i * 3) > .5 ? "#e3d8c9" : "#080c14";
    g.globalAlpha = .018 + noise01(i * 7) * .035;
    g.fillRect(x, y, 1 + noise01(i + 3) * 4, 1 + noise01(i + 7) * 4);
  }
  g.globalAlpha = 1;
  return canvasTexture(THREE, canvas);
}

function skyTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#020814");
  grad.addColorStop(.35, "#071326");
  grad.addColorStop(.62, "#152039");
  grad.addColorStop(.80, "#293044");
  grad.addColorStop(.89, "#403544");
  grad.addColorStop(1, "#101522");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);

  // Tiny subdued stars above the urban haze.
  for (let i = 0; i < 250; i++) {
    const x = noise01(i * 97 + 19) * 1024;
    const y = noise01(i * 107 + 11) * 212;
    const a = 0.08 + noise01(i * 29 + 3) * .31;
    g.fillStyle = "rgba(205,220,240," + a + ")";
    g.fillRect(x, y, i % 13 === 0 ? 2 : 1, 1);
  }
  const t = canvasTexture(THREE, canvas);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

function projectToDistance(point, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const f = Math.max(0, Math.min(1,
    ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(point.x - a.x - f * dx, point.z - a.z - f * dz);
}

function instantiate(THREE, worldGroup, geometry, material, instances) {
  if (!instances.length) return;
  const mesh = new THREE.InstancedMesh(geometry, material, instances.length);
  const dummy = new THREE.Object3D();
  instances.forEach((item, i) => {
    dummy.position.set(item.x, item.y, item.z);
    dummy.rotation.set(0, item.rotation || 0, 0);
    dummy.scale.set(item.w, item.h, item.d);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (item.color !== undefined) mesh.setColorAt(i, new THREE.Color(item.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  worldGroup.add(mesh);
  return mesh;
}

/**
 * Surround the complete track rather than simply duplicating houses beside
 * it. Three tiers: real second/third city blocks, mid-rise districts,
 * enormous atmospheric skyscraper skyline.
 */
export function buildBackdrop({ THREE, worldGroup, trackSamples, sampleCount,
                                 getFrameAt }) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1420, 52, 26),
    new THREE.MeshBasicMaterial({
      map: skyTexture(THREE), side: THREE.BackSide,
      depthWrite: false, fog: false
    })
  );
  sky.position.y = -45;
  sky.renderOrder = -10;
  worldGroup.add(sky);

  const atlas = [facadeMap(THREE, "office"), facadeMap(THREE, "brick"),
                 facadeMap(THREE, "shop")];
  const mats = atlas.map((map, i) => new THREE.MeshStandardMaterial({
    color: i === 1 ? 0xc2acaa : 0xcbd4df, map,
    roughness: i === 0 ? .48 : .82, metalness: i === 0 ? .20 : .04,
    bumpMap: map, bumpScale: .018
  }));

  const livePoints = trackSamples.filter((v, i) => i % 4 === 0);
  const distRoad = (x, z) => {
    let nearest = 9999;
    for (const sample of livePoints) {
      const dx = x - sample.point.x, dz = z - sample.point.z;
      const ds = dx * dx + dz * dz;
      if (ds < nearest) nearest = ds;
    }
    return Math.sqrt(nearest);
  };

  const cityBlocks = [[], [], []];
  const rooftop = [];
  const podiums = [];
  const streetLots = [];
  for (let gx = -440; gx <= 440; gx += 34) {
    for (let gz = -350; gz <= 350; gz += 34) {
      const x = gx + (noise01(gx * 2 + gz * 7) - .5) * 4;
      const z = gz + (noise01(gz * 11 - gx * 2) - .5) * 4;
      const roadD = distRoad(x, z);
      const outerEdge = Math.max(Math.abs(x) / 450, Math.abs(z) / 355);
      if (roadD < 27 || (noise01(gx * 67 + gz * 41) < .09)) continue;
      const type = (Math.floor(noise01(gx * 17 + gz * 23) * 3));
      const height = (outerEdge > .7 ? 21 : 30) +
        noise01(gx * 3 - gz * 13) * (outerEdge > .7 ? 50 : 72);
      const w = 13 + noise01(gx * 7 + gz * 3) * 12;
      const d = 12 + noise01(gx * 9 + gz * 7) * 14;
      cityBlocks[type].push({x, y: height / 2, z, w, h: height, d});
      const top = height + 2 + noise01(gx - gz) * 5;
      rooftop.push({x: x + w * .18, y: top * .5 + height * .5,
        z: z - d * .15, w: w * .42, h: top - height, d: d * .35});
      if (roadD > 34 && roadD < 80 && noise01(x * .1 + z) > .38) {
        podiums.push({x, y: 2.0, z, w: w + 2, h: 4, d: d + 2});
      }
      if (roadD < 80) streetLots.push({x, y: .005, z, w: 29, h: .01, d: 29});
    }
  }

  // Secondary streets and asphalt/pavement pads tie buildings together.
  const streetMaterial = new THREE.MeshStandardMaterial({
    color: 0x202b34, roughness: .98, metalness: .01
  });
  instantiate(THREE, worldGroup, new THREE.BoxGeometry(1,1,1), streetMaterial, streetLots);

  const buildingGeo = new THREE.BoxGeometry(1,1,1);
  cityBlocks.forEach((list, i) =>
    instantiate(THREE, worldGroup, buildingGeo, mats[i], list));

  const capMat = new THREE.MeshStandardMaterial({
    color: 0x303b46, roughness: .90, metalness: .06
  });
  instantiate(THREE, worldGroup, buildingGeo, capMat, rooftop);
  instantiate(THREE, worldGroup, buildingGeo,
    new THREE.MeshStandardMaterial({color:0x343d45, roughness:.82}), podiums);

  // Horizon: three staggered non-identical rings of office towers.
  const distant = [[], [], []];
  const antennas = [];
  for (let ring = 0; ring < 3; ring++) {
    const radius = 610 + ring * 175;
    const count = ring === 0 ? 95 : 116;
    for (let i = 0; i < count; i++) {
      const theta = (i + (ring % 2) * .38) / count * Math.PI * 2;
      const variation = noise01(i * 71 + ring * 17);
      const x = Math.cos(theta) * (radius + (variation - .5) * 60);
      const z = Math.sin(theta) * (radius + (variation - .5) * 60);
      const h = 55 + Math.pow(noise01(i * 19 + ring * 31), 2) * 150;
      const w = 17 + noise01(i * 43 + ring * 7) * 38;
      const d = 17 + noise01(i * 61 + ring * 13) * 33;
      distant[ring].push({x, y:h*.5, z, w, h, d,
        color: ring === 0 ? 0x9babb9 : ring === 1 ? 0x718499 : 0x515f77});
      if (i % 11 === 0 && ring < 2) {
        antennas.push({x, y:h + 9, z, w:.9, h:18, d:.9});
      }
    }
  }
  distant.forEach((list, i) =>
    instantiate(THREE, worldGroup, buildingGeo,
      new THREE.MeshStandardMaterial({
        color: i === 0 ? 0xc0c9d4 : i === 1 ? 0xa1aabb : 0x8b96ae,
        map: atlas[i === 2 ? 0 : i], roughness:.75, metalness:.08
      }), list));
  instantiate(THREE, worldGroup, buildingGeo, capMat, antennas);

  // Distant elevated highways have believable structural depth.
  const roadMat = new THREE.MeshStandardMaterial({
    color:0x444b53, roughness:.92, metalness:.06
  });
  const highway = [
    {x:0,y:14,z:-446,w:970,h:2.1,d:14},
    {x:0,y:14,z:445,w:970,h:2.1,d:14}
  ];
  instantiate(THREE, worldGroup, buildingGeo, roadMat, highway);

  const pylons=[];
  for (let x=-450;x<=450;x+=45) {
    pylons.push({x,y:7,z:-446,w:1.7,h:14,d:2.0});
    pylons.push({x,y:7,z:445,w:1.7,h:14,d:2.0});
  }
  instantiate(THREE,worldGroup,buildingGeo,capMat,pylons);

  // Low fog/glow halo near the actual city center, not a glowing globe.
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1160,1160),
    new THREE.MeshBasicMaterial({
      color:0x4e5485, transparent:true, opacity:.08,
      depthWrite:false, blending:THREE.AdditiveBlending
    }));
  glow.rotation.x = -Math.PI/2;
  glow.position.y = -.05;
  worldGroup.add(glow);

  return { cityBuildings: cityBlocks.reduce((n,b)=>n+b.length,0),
    skylineTowers: distant.reduce((n,b)=>n+b.length,0) };
}

/** Replace the cheap one-color office faces with tiled facades + storefronts. */
export function buildRoadsideArchitecture({ THREE, worldGroup, buildings }) {
  const shellGeo = new THREE.BoxGeometry(1,1,1);
  const atlas = [
    facadeMap(THREE, "office"),
    facadeMap(THREE, "brick"),
    facadeMap(THREE, "shop")
  ];
  const groups = [[],[],[]], roofs=[], parapets=[], awnings=[], shutters=[];
  for(const b of buildings) {
    const type = b.index % 3;
    groups[type].push({x:b.position.x,y:b.height*.5,z:b.position.z,
      w:b.width,h:b.height,d:b.depth,rotation:b.rotationY});
    roofs.push({x:b.position.x,y:b.height+.20,z:b.position.z,
      w:b.width+.7,h:.38,d:b.depth+.7,rotation:b.rotationY});
    if(b.height>22) {
      parapets.push({x:b.position.x,y:b.height+1.1,z:b.position.z,
        w:b.width*.74,h:1.4,d:b.depth*.74,rotation:b.rotationY});
    }
    const at = b.position.clone().addScaledVector(b.normal, -b.side*(b.width*.5+.12));
    if(b.index%2===0) {
      awnings.push({x:at.x,y:3.35,z:at.z,w:1.8,h:.22,
        d:Math.min(6,b.depth*.65),rotation:b.rotationY});
    }
    if(b.index%4===0) {
      shutters.push({x:at.x,y:1.45,z:at.z,w:.12,h:2.5,
        d:Math.min(5,b.depth*.55),rotation:b.rotationY});
    }
  }
  const materials=atlas.map((map,i)=>new THREE.MeshStandardMaterial({
    color: i===1 ? 0xd4c4bd : 0xe1e8ed, map, bumpMap:map,
    bumpScale:.024,roughness: i===0 ? .47 : .85,
    metalness: i===0 ? .22 : .04
  }));
  groups.forEach((group,i)=>instantiate(THREE,worldGroup,shellGeo,materials[i],group));
  instantiate(THREE,worldGroup,shellGeo,new THREE.MeshStandardMaterial({
    color:0x4b5661,roughness:.84
  }),roofs);
  instantiate(THREE,worldGroup,shellGeo,new THREE.MeshStandardMaterial({
    color:0x334451,roughness:.74
  }),parapets);
  instantiate(THREE,worldGroup,shellGeo,new THREE.MeshStandardMaterial({
    color:0x547183,roughness:.55,metalness:.25
  }),awnings);
  instantiate(THREE,worldGroup,shellGeo,new THREE.MeshStandardMaterial({
    color:0x293542,roughness:.78,metalness:.08
  }),shutters);
}

/** Proper sidewalk lip, gutter, reflective studs and drains. No collider edits. */
export function addStreetSurfaceDetails({THREE,worldGroup,trackSamples, sampleCount,
                                         getFrameAt, roadHalf, sidewalkOuter}) {
  const curbMat = new THREE.MeshStandardMaterial({
    color:0x92979a,roughness:.90,metalness:0
  });
  const concrete = new THREE.MeshStandardMaterial({
    color:0x3f4951,roughness:.91
  });
  const reflector = new THREE.MeshStandardMaterial({
    color:0xe3cf9e,roughness:.36,metalness:.10,
    emissive:0x483e26,emissiveIntensity:.12
  });
  const curb=[],gutters=[],studs=[],drains=[],bolts=[],cabinets=[],hydrants=[];
  for(let i=0;i<sampleCount;i+=3) {
    const a=trackSamples[i], b=trackSamples[(i+3)%sampleCount];
    if(!a||!b)continue;
    const length=Math.hypot(b.point.x-a.point.x,b.point.z-a.point.z);
    if(length>25)continue;
    for(const side of [-1,1]){
      const x=(a.point.x+b.point.x)*.5+
        (a.normal.x+b.normal.x)*.5*side*(roadHalf+.18);
      const z=(a.point.z+b.point.z)*.5+
        (a.normal.z+b.normal.z)*.5*side*(roadHalf+.18);
      const rotation=Math.atan2(b.point.x-a.point.x,b.point.z-a.point.z);
      curb.push({x,y:.15,z,w:.20,h:.22,d:length+.18,rotation});
      gutters.push({x:x+side*a.normal.x*.26,y:.062,z:z+side*a.normal.z*.26,
        w:.28,h:.015,d:length+.2,rotation});
      if(i%12===0){
        studs.push({x:x-side*a.normal.x*.55,y:.101,
          z:z-side*a.normal.z*.55,w:.17,h:.07,d:.43,rotation});
      }
      if(i%30===0) {
        drains.push({x:x+side*a.normal.x*.49,y:.072,
          z:z+side*a.normal.z*.49,w:.42,h:.05,d:.80,rotation});
      }
      if(i%51===0){
        const px=x+side*a.normal.x*2.2,pz=z+side*a.normal.z*2.2;
        cabinets.push({x:px,y:.58,z:pz,w:.72,h:1.16,d:.54,rotation});
        bolts.push({x:px,y:1.2,z:pz,w:.75,h:.10,d:.6,rotation});
      }
      if(i%87===0) {
        const px=x+side*a.normal.x*2.3,pz=z+side*a.normal.z*2.3;
        hydrants.push({x:px,y:.44,z:pz,w:.42,h:.84,d:.42,rotation});
      }
    }
  }
  const box=new THREE.BoxGeometry(1,1,1);
  instantiate(THREE,worldGroup,box,curbMat,curb);
  instantiate(THREE,worldGroup,box,concrete,gutters);
  instantiate(THREE,worldGroup,box,reflector,studs);
  instantiate(THREE,worldGroup,box,new THREE.MeshStandardMaterial({
    color:0x151d24,metalness:.6,roughness:.58
  }),drains);
  instantiate(THREE,worldGroup,box,new THREE.MeshStandardMaterial({
    color:0x435360,metalness:.55,roughness:.52
  }),cabinets);
  instantiate(THREE,worldGroup,box,curbMat,bolts);
  instantiate(THREE,worldGroup,box,new THREE.MeshStandardMaterial({
    color:0xb63b35,roughness:.38,metalness:.20
  }),hydrants);
}

/** Actual glTF models (not boxes) are optional art dressing.
 * If any CDN fails the nearby textured procedural scenery remains. */
export async function loadAuthoredModels({THREE, worldGroup, getFrameAt}) {
  const root=worldGroup;
  let GLTFLoader;
  try {
    ({GLTFLoader}=await import(
      "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js"
    ));
  } catch(err) {
    console.warn("Neon real-model loader unavailable",err);
    return;
  }
  if(!root.parent)return;
  const loader=new GLTFLoader();
  const specs=[
    ["quaternius_buildings_pack/building2-small.glb",[.07,.23,.48,.64,.81],44],
    ["quaternius_buildings_pack/building3-small.glb",[.10,.30,.58,.77,.96],47],
    ["quaternius_buildings_pack/building4.glb",[.16,.40,.70,.89],53],
    ["kenney_city_kit_industrial/building-i.glb",[.26,.55,.75],57],
    ["kenney_city_kit_roads/dumpster.glb",[.08,.34,.50,.76,.91],11.4],
    ["kenney_city_kit_roads/construction-fence.glb",[.69,.73,.77],12.0],
    ["kenney_city_kit_roads/construction-cone.glb",[.66,.68,.70,.72,.74],10.5]
  ];
  const loadOne=(file,ts,offset,modelIndex)=>new Promise(resolve=>{
    loader.load(SOURCE_ROOT+"models/"+file,
      gltf=>{
        if(!root.parent){resolve();return;}
        const source=gltf.scene;
        source.updateMatrixWorld(true);
        const bounds=new THREE.Box3().setFromObject(source);
        const size=bounds.getSize(new THREE.Vector3());
        const maxGround=Math.max(size.x,size.z,.1);
        // Props sized independently, buildings scale uniformly to fit city blocks.
        const prop = file.includes("dumpster") || file.includes("fence") || file.includes("cone");
        const target=prop? (file.includes("cone")? .8:file.includes("dumpster")?2:4.4) : 16;
        const baseScale=Math.min(15,Math.max(.01,target/maxGround));
        const lowest=bounds.min.y*baseScale;
        ts.forEach((t,i)=>{
          const f=getFrameAt(t);
          const mesh=source.clone(true);
          mesh.scale.setScalar(baseScale);
          const side=(i+modelIndex)%2===0?1:-1;
          mesh.position.copy(f.point).addScaledVector(f.normal, side*offset);
          mesh.position.y=-lowest + .015;
          mesh.rotation.y=f.rotationY+(side===1?Math.PI:0);
          root.add(mesh);
        });
        resolve();
      },undefined,()=>resolve()
    );
  });
  await Promise.all(specs.map((s,i)=>loadOne(...s,i)));
}
