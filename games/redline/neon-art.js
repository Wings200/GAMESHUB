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
    const texture = loader.load(
        SOURCE_ROOT + "textures/" + name,
        () => {
          if (!sceneRoot.parent) return;
          material[slots[i]] = texture;
          // Use texture albedo without an arbitrary grey multiplier.
          material.color.set(0xffffff);
          material.bumpMap = null;
          material.roughness = kind === "asphalt" ? 0.82 : 0.94;
          material.metalness = kind === "asphalt" ? 0.018 : 0.0;
          material.normalScale = new THREE.Vector2(0.30, 0.30);
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
  });
}

export function facadeMap(THREE, type = "office") {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const g = canvas.getContext("2d");
  const brick = type === "brick";
  const shop = type === "shop";
  const base = brick ? "#211b20" : shop ? "#171c22" : "#111721";
  const mortar = brick ? "#44363a" : "#303640";
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
      const lit = noise01(r * 131 + col * 17 + (brick ? 11 : 3)) > (shop ? .65 : .79);
      g.fillStyle = brick ? "#46373b" : "#29323b";
      g.fillRect(x - 3, y - 3, w + 6, h + 6);
      g.fillStyle = "#080d12";
      g.fillRect(x, y, w, h);
      const grad = g.createLinearGradient(x, y, x + w, y + h);
      grad.addColorStop(0, lit ? "#493e44" : "#101820");
      grad.addColorStop(.62, lit ? "#776452" : "#0a1119");
      grad.addColorStop(1, lit ? "#987a62" : "#050b11");
      g.fillStyle = grad;
      g.fillRect(x + 3, y + 3, w - 6, h - 6);
      g.globalAlpha = lit ? .22 : .40;
      g.fillStyle = lit ? "#ffe6b4" : "#17232d";
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

export function facadeEmissiveMap(THREE, type = "office") {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const g = canvas.getContext("2d");
  g.fillStyle = "#000000";
  g.fillRect(0, 0, canvas.width, canvas.height);
  const brick = type === "brick";
  const shop = type === "shop";
  const cols = shop ? 5 : 6;
  const rows = brick ? 12 : 16;
  const cx = canvas.width / cols;
  const cy = canvas.height / rows;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cx + (brick ? 17 : 10);
      const y = r * cy + (brick ? 11 : 7);
      const w = cx - (brick ? 34 : 20);
      const h = cy - (brick ? 22 : 14);
      const lit = noise01(r * 131 + col * 17 + (brick ? 11 : 3)) > (shop ? .65 : .79);
      if (!lit) continue;
      const cool = noise01(r * 29 + col * 83 + (shop ? 17 : 5)) > .80;
      g.fillStyle = cool ? "#83d8ff" : (brick ? "#ffd08a" : "#ffe0a1");
      g.fillRect(x + 3, y + 3, w - 6, h - 6);
      g.globalAlpha = .42;
      g.fillStyle = "#ffffff";
      g.fillRect(x + 4, y + 4, 5, h - 8);
      g.globalAlpha = 1;
    }
  }
  return canvasTexture(THREE, canvas);
}

function skyTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#01040b");
  grad.addColorStop(.35, "#030712");
  grad.addColorStop(.62, "#060c1a");
  grad.addColorStop(.80, "#0b1325");
  grad.addColorStop(.89, "#141525");
  grad.addColorStop(1, "#070a13");
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);

  // Tiny subdued stars above the urban haze.
  for (let i = 0; i < 250; i++) {
    const x = noise01(i * 97 + 19) * 1024;
    const y = noise01(i * 107 + 11) * 212;
    const a = 0.03 + noise01(i * 29 + 3) * .22;
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
                                 getFrameAt, registerBuilding }) {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1160, 52, 26),
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
  const glowAtlas = [
    facadeEmissiveMap(THREE, "office"),
    facadeEmissiveMap(THREE, "brick"),
    facadeEmissiveMap(THREE, "shop")
  ];
  const mats = atlas.map((map, i) => new THREE.MeshStandardMaterial({
    color: i === 1 ? 0xa79c9d : 0xa8b0b7,
    map,
    emissive: 0xffffff,
    emissiveMap: glowAtlas[i],
    emissiveIntensity: .55,
    roughness: i === 0 ? .48 : .82,
    metalness: i === 0 ? .20 : .04,
    bumpMap: map, bumpScale: .018
  }));

  // Continuous point-to-segment distance, not every fourth spline point.
  // This avoids placing a footprint on a curved road between samples.
  const distRoad = (x, z) => {
    let nearestSq = Infinity;
    for (let i = 0; i < trackSamples.length; i++) {
      const a = trackSamples[i].point;
      const b = trackSamples[(i + 1) % trackSamples.length].point;
      const dx = b.x - a.x, dz = b.z - a.z;
      const t = Math.max(0, Math.min(1,
        ((x-a.x)*dx + (z-a.z)*dz) / (dx*dx + dz*dz || 1)));
      const px=x-a.x-t*dx,pz=z-a.z-t*dz;
      const ds=px*px+pz*pz;
      if (ds < nearestSq) nearestSq=ds;
    }
    return Math.sqrt(nearestSq);
  };
  const occupiesRaceway = (x,z,w,d,margin=3) => {
    const pad=9.2+margin;
    for(const sample of trackSamples) {
      if(Math.abs(x-sample.point.x)<w/2+pad &&
         Math.abs(z-sample.point.z)<d/2+pad) return true;
    }
    return false;
  };

  const reservedBuildings = [
    [.07,.23,.48,.64,.81],
    [.10,.30,.58,.77,.96],
    [.16,.40,.70,.89],
    [.26,.55,.75]
  ].flatMap((progresses, modelIndex) => {
    const offsets = [31,30,31,29];
    return progresses.map((t,i) => {
      const f = getFrameAt(t);
      const side = (i + modelIndex) % 2 === 0 ? 1 : -1;
      return f.point.clone().addScaledVector(f.normal, side*offsets[modelIndex]);
    });
  });

  const cityBlocks = [[], [], []];
  const rooftop = [];
  const podiums = [];
  for (let gx = -440; gx <= 440; gx += 34) {
    for (let gz = -350; gz <= 350; gz += 34) {
      const x = gx + (noise01(gx * 2 + gz * 7) - .5) * 4;
      const z = gz + (noise01(gz * 11 - gx * 2) - .5) * 4;
      const roadD = distRoad(x, z);
      const outerEdge = Math.max(Math.abs(x) / 450, Math.abs(z) / 355);
      // Compute the actual block dimensions before checking clearance.
      const type = Math.floor(noise01(gx * 17 + gz * 23) * 3);
      const height = (outerEdge > .7 ? 21 : 30) +
        noise01(gx * 3 - gz * 13) * (outerEdge > .7 ? 50 : 72);
      const w = 13 + noise01(gx * 7 + gz * 3) * 12;
      const d = 12 + noise01(gx * 9 + gz * 7) * 14;
      // Road exclusion includes pavement, turning-room and the building
      // footprint, rather than testing only the building's center.
      if(roadD < 9.2 + Math.hypot(w,d)/2 + 4 ||
         occupiesRaceway(x,z,w,d,3) ||
         noise01(gx * 67 + gz * 41) < .09) continue;
      if(x+w/2>117 && x-w/2<222 && Math.abs(z)<424) continue;
      if(reservedBuildings.some(p=>
           Math.hypot(p.x-x,p.z-z)<Math.hypot(w,d)/2+13)) continue;
      cityBlocks[type].push({x, y: height / 2, z, w, h: height, d});
      // The same footprint and height as the rendered city building.
      if (registerBuilding) registerBuilding(
        new THREE.Vector3(x, 0, z), w, d, 0, height
      );
      const top = height + 2 + noise01(gx - gz) * 5;
      rooftop.push({x: x + w * .18, y: top * .5 + height * .5,
        z: z - d * .15, w: w * .42, h: top - height, d: d * .35});
      if (roadD > 34 && roadD < 80 && noise01(x * .1 + z) > .38) {
        podiums.push({x, y: 2.0, z, w: w + 2, h: 4, d: d + 2});
      }
    }
  }

  // Secondary city roads are clipped to the actual neighborhoods.
  // Previously full-length grid slabs crossed the race track and even
  // buildings at arbitrary angles. Those were the "intersecting roads".
  const streetMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b1e24, roughness: .95, metalness: .004
  });
  const roadGeo = new THREE.BoxGeometry(1,1,1);
  const parallelRoads=[], laneCenters=[];
  const allBlocks=cityBlocks.flat();
  function clearStreetCell(x,z,w,d) {
    if(x+w/2>123 && x-w/2<217 && Math.abs(z)<406) return false;
    // Keep neighborhood traffic lanes away from curved course edges.
    // A larger no-road buffer prevents accidental-looking joins with
    // the racing line and leaves room for sidewalk/poster dressing.
    if(occupiesRaceway(x,z,w,d,15)) return false;
    // Decorative road slabs must not pass through physical city blocks.
    for(const b of allBlocks) {
      if(Math.abs(x-b.x)<(w+b.w)/2+.9 &&
         Math.abs(z-b.z)<(d+b.d)/2+.9) return false;
    }
    return true;
  }
  function clippedStreet(axis,fixed,begin,end) {
    const step=8;
    let runStart=null,runEnd=null;
    const flush=()=>{
      // Tiny isolated asphalt fragments looked like broken intersecting
      // roads. Only keep coherent full block-length street runs.
      if(runStart===null || runEnd-runStart<32) return;
      const middle=(runStart+runEnd)/2;
      const len=runEnd-runStart;
      const obj=axis==="z"
        ?{x:fixed,y:-.012,z:middle,w:7.0,h:.025,d:len}
        :{x:middle,y:-.012,z:fixed,w:len,h:.025,d:7.0};
      parallelRoads.push(obj);
      for(let tick=runStart+9;tick<runEnd-3;tick+=24){
        laneCenters.push(axis==="z"
          ?{x:fixed,y:.016,z:tick,w:.11,h:.013,d:2.4}
          :{x:tick,y:.016,z:fixed,w:2.4,h:.013,d:.11});
      }
    };
    for(let k=begin;k<end;k+=step) {
      const lo=k,hi=Math.min(end,k+step),m=(lo+hi)/2;
      const ok=axis==="z"
        ?clearStreetCell(fixed,m,7.0,hi-lo)
        :clearStreetCell(m,fixed,hi-lo,7.0);
      if(ok) {
        if(runStart===null)runStart=lo;
        runEnd=hi;
      } else {
        flush();runStart=null;runEnd=null;
      }
    }
    flush();
  }
  for(let x=-423;x<=423;x+=68){
    if(x>117&&x<223) continue;
    clippedStreet("z",x,-368,368);
  }
  for(let z=-333;z<=333;z+=68) {
    clippedStreet("x",z,-432,119);
    clippedStreet("x",z,223,433);
  }
  instantiate(THREE,worldGroup,roadGeo,streetMaterial,parallelRoads);
  instantiate(THREE,worldGroup,roadGeo,
    new THREE.MeshBasicMaterial({color:0x53575d}),laneCenters);

  const buildingGeo = new THREE.BoxGeometry(1,1,1);
  cityBlocks.forEach((list, i) =>
    instantiate(THREE, worldGroup, buildingGeo, mats[i], list));

  const capMat = new THREE.MeshStandardMaterial({
    color: 0x171a22, roughness: .90, metalness: .06
  });
  instantiate(THREE, worldGroup, buildingGeo, capMat, rooftop);
  instantiate(THREE, worldGroup, buildingGeo,
    new THREE.MeshStandardMaterial({color:0x20232b, roughness:.86}), podiums);

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
      if (registerBuilding) registerBuilding(
        new THREE.Vector3(x, 0, z), w, d, 0, h
      );
      if (i % 11 === 0 && ring < 2) {
        antennas.push({x, y:h + 9, z, w:.9, h:18, d:.9});
      }
    }
  }
  distant.forEach((list, i) =>
    instantiate(THREE, worldGroup, buildingGeo,
      new THREE.MeshStandardMaterial({
        color: i === 0 ? 0x858b94 : i === 1 ? 0x737881 : 0x626670,
        map: atlas[i === 2 ? 0 : i],
        emissive: 0xffffff,
        emissiveMap: glowAtlas[i === 2 ? 0 : i],
        emissiveIntensity: .40,
        roughness:.8, metalness:.08
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

  // No giant transparent ground glow plane: it tinted the entire canal
  // pink and made the water and streets look like cardboard.

  // Expose only the decorative streets that were actually built and
  // collision-cleared, for local ambient NPC traffic. These are never
  // the competitive racing road or canal bridge lanes.
  const trafficRoads = parallelRoads.filter(road =>
    Math.max(road.w,road.d)>=56).map(road => ({
      axis: road.d>road.w ? "z" : "x",
      centerX: road.x, centerZ: road.z,
      length: Math.max(road.w,road.d), width: Math.min(road.w,road.d)
    }));
  return { cityBuildings: cityBlocks.reduce((n,b)=>n+b.length,0),
    skylineTowers: distant.reduce((n,b)=>n+b.length,0),
    trafficRoads };
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
  const glowAtlas = [
    facadeEmissiveMap(THREE, "office"),
    facadeEmissiveMap(THREE, "brick"),
    facadeEmissiveMap(THREE, "shop")
  ];
  const materials=atlas.map((map,i)=>new THREE.MeshStandardMaterial({
    color: i===1 ? 0xaaa0a0 : 0x9299a4,
    map, bumpMap:map, bumpScale:.024,
    roughness: i===0 ? .56 : .9,
    metalness: i===0 ? .17 : .04,
    emissive: 0xffffff,
    emissiveMap: glowAtlas[i],
    emissiveIntensity: .56
  }));
  groups.forEach((group,i)=>instantiate(THREE,worldGroup,shellGeo,materials[i],group));
  instantiate(THREE,worldGroup,shellGeo,new THREE.MeshStandardMaterial({
    color:0x20232a,roughness:.86
  }),roofs);
  instantiate(THREE,worldGroup,shellGeo,new THREE.MeshStandardMaterial({
    color:0x1b2029,roughness:.78
  }),parapets);
  instantiate(THREE,worldGroup,shellGeo,new THREE.MeshStandardMaterial({
    color:0x242b33,roughness:.65,metalness:.15
  }),awnings);
  instantiate(THREE,worldGroup,shellGeo,new THREE.MeshStandardMaterial({
    color:0x171d24,roughness:.8,metalness:.05
  }),shutters);
}

/**
 * Pools of warm/cool light under existing street lamps. This fakes diffuse
 * bounced illumination cheaply, without dozens of expensive point lights.
 */

/**
 * Curated Neon District advertising. Uses a small shared set of canvas
 * atlases, mounted on real building facades. No billboard can block the
 * driving lane because the building layout is clearance-tested upstream.
 * All ads are decorative and do not affect collision or race logic.
 */
export function buildNeonAdvertising({THREE,worldGroup,buildings}) {
  const brands=[
    ["NIGHT CITY","OPEN ALL NIGHT","#ff4b9e"],
    ["SYNTH//88","LIVE MUSIC","#34dbff"],
    ["TOKYO NOIR","AFTER DARK","#af79ff"],
    ["PIXEL ARCADE","HIGH SCORES","#30f0d4"],
    ["RAMEN 24","HOT AND FAST","#ff9c57"],
    ["NEON DRIVE","MIDNIGHT RUN","#5c95ff"],
    ["CYBER CAFE","24 HOURS","#ff5abd"],
    ["RETRO WAVE","DANCE FLOOR","#2ff0ed"],
    ["BLACKOUT","NIGHT CLUB","#dd61ff"],
    ["VOLT ENERGY","STAY AWAKE","#fcd467"],
    ["VOID MARKET","STREET STYLE","#ff5c87"],
    ["ZERO GRAVITY","ROOFTOP BAR","#68b4ff"],
    ["APEX MOTORS","CUSTOM GARAGE","#ff8850"],
    ["BYTE DISTRICT","NEXT LEVEL","#55e7dd"],
    ["DREAM SIGNAL","RADIO 99.4","#ff4fab"],
    ["METRO 7","LAST TRAIN","#9f8dff"],
    ["KAIRO TECH","UPGRADE NOW","#4ef2cb"],
    ["NOVA PIZZA","DELIVERY 24H","#f2bf52"]
  ];
  function makeAdCanvas(name,sub,color,portrait,seed) {
    const c=document.createElement("canvas");
    c.width=portrait?256:512;
    c.height=portrait?448:256;
    const ctx=c.getContext("2d"),w=c.width,h=c.height;
    const bg=ctx.createLinearGradient(0,0,w,h);
    bg.addColorStop(0,"#080911");
    bg.addColorStop(.55,seed%3===0?"#190f28":"#0a111c");
    bg.addColorStop(1,"#05060c");
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    // Lit framing, circuit lines and subtle diagonal ad graphics.
    ctx.strokeStyle=color;ctx.lineWidth=7;ctx.globalAlpha=.88;
    ctx.strokeRect(8,8,w-16,h-16);
    ctx.lineWidth=2;ctx.globalAlpha=.27;
    for(let i=0;i<9;i++){
      ctx.beginPath();
      ctx.moveTo(-w*.2+i*w/7,0);
      ctx.lineTo(i*w/7,h);
      ctx.stroke();
    }
    ctx.globalAlpha=1;
    ctx.fillStyle=color;
    ctx.fillRect(18,18,portrait?w*.25:w*.16,5);
    ctx.fillRect(w*.73,h-24,w*.19,4);
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.shadowColor=color;ctx.shadowBlur=22;
    const maxWidth=w-24;
    const fontSize=portrait?42:57;
    ctx.fillStyle="#ffffff";
    ctx.font="900 "+fontSize+"px Arial, sans-serif";
    // Native canvas maxWidth keeps even long names inside the frame.
    if(portrait){
      const words=name.split(" ");
      const rows=words.length===1?[name]:words.length===2?words:
        [words.slice(0,2).join(" "),words.slice(2).join(" ")];
      rows.forEach((line,i)=>ctx.fillText(line,w/2,h*.32+(i-(rows.length-1)/2)*61,maxWidth));
    }else{
      ctx.fillText(name,w/2,h*.43,maxWidth);
    }
    ctx.shadowBlur=11;ctx.fillStyle=color;
    ctx.font="800 "+(portrait?23:25)+"px Arial, sans-serif";
    ctx.fillText(sub,w/2,portrait?h*.70:h*.76,maxWidth);
    ctx.shadowBlur=0;
    const texture=new THREE.CanvasTexture(c);
    texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=4;
    texture.minFilter=THREE.LinearMipmapLinearFilter;
    return texture;
  }
  // Each material is reused on dozens of signs, keeping draw calls bounded.
  const posters=brands.map(([name,sub,color],i)=>{
    const portrait=i%3!==0;
    return {
      portrait,
      material:new THREE.MeshBasicMaterial({
        map:makeAdCanvas(name,sub,color,portrait,i),
        side:THREE.FrontSide,
        toneMapped:false
      }),
      frame:new THREE.MeshBasicMaterial({color:new THREE.Color(color),
        toneMapped:false})
    };
  });
  const darkFrame=new THREE.MeshStandardMaterial({
    color:0x101116,roughness:.51,metalness:.52
  });
  const posterGeometry=new THREE.PlaneGeometry(1,1);
  const frameGeometry=new THREE.BoxGeometry(1,1,.10);
  let boards=0,rooftops=0;
  for(let i=0;i<buildings.length;i++){
    const b=buildings[i];
    if(b.height<7)continue;
    // One or two ads per facade, distributed over multiple street levels.
    const count=b.height>13 ? 2 : 1;
    for(let slot=0;slot<count;slot++){
      const ad=posters[(i*7+slot*11)%posters.length];
      const height=ad.portrait?3.65:2.35;
      const width=Math.min(ad.portrait?2.25:5.5,b.depth*.67);
      // V7 ground floors have real storefront glazing and canopies.
      // Keep the existing poster atlas on UPPER facade panels instead
      // of cutting directly through the new shop doors and awnings.
      const y=Math.min(b.height-2.15,5.35+slot*5.4+(i%3)*.55);
      if(y-height/2<3.45)continue;
      const point=b.position.clone().addScaledVector(
        b.normal,-b.side*(b.width/2+.19)
      );
      point.addScaledVector(b.tangent,
        slot===0?-b.depth*.16:b.depth*.16);
      point.y=y;
      const faceRotation=b.rotationY+(b.side===1?Math.PI/2:-Math.PI/2);
      const sign=new THREE.Mesh(posterGeometry,ad.material);
      sign.position.copy(point);sign.rotation.y=faceRotation;
      sign.scale.set(width,height,1);
      worldGroup.add(sign);
      const border=new THREE.Mesh(frameGeometry,darkFrame);
      border.position.copy(point).addScaledVector(b.normal,b.side*.10);
      border.rotation.y=faceRotation;
      border.scale.set(width+.20,height+.20,1);
      worldGroup.add(border);
      // Three strip-lights give the posters a 3D neon rim without bloom.
      const line=new THREE.Mesh(
        new THREE.BoxGeometry(width+.16,.055,.055),ad.frame);
      line.position.copy(point);
      line.position.y+=height/2+.07;
      line.rotation.y=faceRotation;
      worldGroup.add(line);
      boards++;
    }
    // High vertical roof signs create a recognizable lit city skyline.
    if(i%5===0 && b.height>17){
      const ad=posters[(i*3+2)%posters.length];
      const roofSign=new THREE.Mesh(posterGeometry,ad.material);
      roofSign.position.copy(b.position).addScaledVector(
        b.normal,-b.side*(b.width/2+.34));
      roofSign.position.y=b.height+2.3;
      roofSign.rotation.y=b.rotationY+(b.side===1?Math.PI/2:-Math.PI/2);
      roofSign.scale.set(Math.min(6.5,b.depth*.8),3.4,1);
      worldGroup.add(roofSign);
      rooftops++;
    }
  }
  return {posters:boards,roofSigns:rooftops,designs:brands.length};
}

export function addStreetLighting({THREE, worldGroup, trackSamples, sampleCount,
                                   roadHalf}) {
  const canvas=document.createElement("canvas");
  canvas.width=256;canvas.height=256;
  const g=canvas.getContext("2d");
  const gradient=g.createRadialGradient(128,128,4,128,128,120);
  gradient.addColorStop(0,"rgba(255,255,245,.56)");
  gradient.addColorStop(.18,"rgba(255,246,225,.28)");
  gradient.addColorStop(.52,"rgba(255,232,195,.10)");
  gradient.addColorStop(1,"rgba(255,223,170,0)");
  g.fillStyle=gradient;g.fillRect(0,0,256,256);
  const texture=canvasTexture(THREE,canvas);
  const mat=new THREE.MeshBasicMaterial({
    map:texture,transparent:true,depthWrite:false,
    blending:THREE.AdditiveBlending,opacity:.95,
    side:THREE.DoubleSide,fog:true
  });
  const geo=new THREE.PlaneGeometry(24,32);
  geo.rotateX(-Math.PI/2);
  const instances=[];
  for(let i=0;i<sampleCount;i+=12){
    const s=trackSamples[i];
    if(!s)continue;
    for(const side of [-1,1]){
      const p=s.point.clone().addScaledVector(s.normal,side*(roadHalf+2.9));
      instances.push({x:p.x,y:s.point.y+.10,z:p.z,w:1,h:1,d:1,rotation:s.rotationY});
    }
  }
  instantiate(THREE,worldGroup,geo,mat,instances);
}

/** Proper sidewalk lip, gutter, reflective studs and drains. No collider edits. */
export function addStreetSurfaceDetails({THREE,worldGroup,trackSamples, sampleCount,
                                         getFrameAt, roadHalf, sidewalkOuter, registerCollider}) {
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
  const curbFaces=[],gutterFaces=[],studs=[],drains=[],bolts=[],cabinets=[],hydrants=[];
  const addQuad=(dest,a,b,c,d)=>{
    for(const p of [a,b,c,a,c,d]) dest.push(p.x,p.y,p.z);
  };
  function curbSurface(a,b,side,offset,width,minHeight,maxHeight,buffer) {
    const vertex=(sample,lateral,up)=>new THREE.Vector3(
      sample.point.x+sample.normal.x*lateral,
      sample.point.y+up,
      sample.point.z+sample.normal.z*lateral
    );
    const center=side*offset,lo=center-width/2,hi=center+width/2;
    const a0=vertex(a,lo,minHeight),a1=vertex(a,hi,minHeight);
    const a2=vertex(a,lo,maxHeight),a3=vertex(a,hi,maxHeight);
    const b0=vertex(b,lo,minHeight),b1=vertex(b,hi,minHeight);
    const b2=vertex(b,lo,maxHeight),b3=vertex(b,hi,maxHeight);
    addQuad(buffer,a2,b2,b3,a3);
    addQuad(buffer,a0,b0,b2,a2);
    addQuad(buffer,b1,a1,a3,b3);
  }
  function renderCurb(buffer,mat) {
    if(!buffer.length)return;
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.Float32BufferAttribute(buffer,3));
    geometry.computeVertexNormals();
    const meshMat=mat.clone();
    meshMat.side=THREE.DoubleSide;
    worldGroup.add(new THREE.Mesh(geometry,meshMat));
  }
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
      const h=(a.point.y+b.point.y)*.5;
      // Connect each consecutive sample pair with shared end vertices.
      // The old straight box instances detached at tight uphill bends.
      for(let j=0;j<Math.min(3,sampleCount-i);j++){
        const one=trackSamples[i+j];
        const two=trackSamples[(i+j+1)%sampleCount];
        curbSurface(one,two,side,roadHalf+.18,.20,.04,.26,curbFaces);
        curbSurface(one,two,side,roadHalf+.44,.28,.055,.070,gutterFaces);
      }
      if(i%12===0 && h<1.0){
        // Reflectors belong OUTSIDE the asphalt, never in the racing lane.
        studs.push({x:x+side*a.normal.x*.55,y:h+.115,
          z:z+side*a.normal.z*.55,w:.17,h:.07,d:.43,rotation});
      }
      if(i%30===0) {
        drains.push({x:x+side*a.normal.x*.49,y:h+.072,
          z:z+side*a.normal.z*.49,w:.42,h:.05,d:.80,rotation});
      }
      if(i%51===0 && h<1.0){
        const px=x+side*a.normal.x*3.65,pz=z+side*a.normal.z*3.65;
        cabinets.push({x:px,y:h+.58,z:pz,w:.72,h:1.16,d:.54,rotation});
        bolts.push({x:px,y:h+1.2,z:pz,w:.75,h:.10,d:.6,rotation});
      }
      if(i%87===0 && h<1.0) {
        const px=x+side*a.normal.x*3.65,pz=z+side*a.normal.z*3.65;
        hydrants.push({x:px,y:h+.44,z:pz,w:.42,h:.84,d:.42,rotation});
      }
    }
  }
  if (registerCollider) {
    for (const item of cabinets) {
      registerCollider(
        new THREE.Vector3(item.x, item.y, item.z),
        item.w / 2, item.d / 2, item.rotation,
        { minY: item.y - item.h / 2, maxY: item.y + item.h / 2, tag: "STREET CABINET" }
      );
    }
    for (const item of hydrants) {
      registerCollider(
        new THREE.Vector3(item.x, item.y, item.z),
        item.w / 2, item.d / 2, item.rotation,
        { minY: item.y - item.h / 2, maxY: item.y + item.h / 2, tag: "HYDRANT" }
      );
    }
  }
  const box=new THREE.BoxGeometry(1,1,1);
  renderCurb(curbFaces,curbMat);
  renderCurb(gutterFaces,concrete);
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
export async function loadAuthoredModels({
  THREE, worldGroup, getFrameAt, registerBuilding, trackSamples = [],
  sidewalkOuter = 9.2
}) {
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
    ["quaternius_buildings_pack/building2-small.glb",[.07,.23,.48,.64,.81],31],
    ["quaternius_buildings_pack/building3-small.glb",[.10,.30,.58,.77,.96],30],
    ["quaternius_buildings_pack/building4.glb",[.16,.40,.70,.89],31],
    ["kenney_city_kit_industrial/building-i.glb",[.26,.55,.75],29],
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
          // Imported kits use bright blues by default. Desaturate only
          // BUILDINGS into gunmetal charcoal, retaining prop colors,
          // glazing textures and geometry detail.
          if(!prop) mesh.traverse(part=>{
            if(!part.isMesh || !part.material) return;
            const darken=original=>{
              const m=original.clone();
              if(m.color)m.color.setHex(0x34373d);
              if(m.emissive) {
                m.emissive.setHex(0x060508);
                m.emissiveIntensity=.12;
              }
              if("roughness" in m)m.roughness=.78;
              if("metalness" in m)m.metalness=.13;
              return m;
            };
            part.material=Array.isArray(part.material)
              ?part.material.map(darken):darken(part.material);
          });
          const radius = Math.hypot(size.x,size.z)*baseScale/2;
          // Check the FULL loaded model bounds. Skip assets that intrude
          // on the raceway even when their placement marker is outside.
          if (trackSamples.some(sample =>
              Math.hypot(mesh.position.x-sample.point.x,
                         mesh.position.z-sample.point.z) <
              sidewalkOuter+3.2+radius)) return;
          if (mesh.position.x+radius>116 && mesh.position.x-radius<222 &&
              Math.abs(mesh.position.z)<414) return;
          root.add(mesh);
          if (registerBuilding) {
            // GLB bounds at actual model scale, not generic road circles.
            registerBuilding(
              mesh.position.clone(),
              Math.max(.4, size.x * baseScale),
              Math.max(.4, size.z * baseScale),
              mesh.rotation.y,
              Math.max(1, size.y * baseScale)
            );
          }
        });
        resolve();
      },undefined,()=>resolve()
    );
  });
  await Promise.all(specs.map((s,i)=>loadOne(...s,i)));
}


function tunnelConcreteMap(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width=512;canvas.height=512;
  const g=canvas.getContext("2d");
  const grad=g.createLinearGradient(0,0,512,512);
  grad.addColorStop(0,"#858a8b");grad.addColorStop(.6,"#999a98");
  grad.addColorStop(1,"#6c7479");
  g.fillStyle=grad;g.fillRect(0,0,512,512);
  // Cast concrete shutter joints, granular aggregate and rain stains.
  for(let y=0;y<=512;y+=128) {
    g.fillStyle="rgba(18,28,34,.18)";g.fillRect(0,y,512,3);
    g.fillStyle="rgba(239,236,223,.08)";g.fillRect(0,y+3,512,1);
  }
  for(let x=0;x<=512;x+=256){
    g.fillStyle="rgba(20,27,30,.12)";g.fillRect(x,0,2,512);
  }
  for(let i=0;i<10000;i++){
    const x=noise01(i*3+47)*512,y=noise01(i*11+2)*512;
    g.fillStyle=noise01(i*13)>.5?"#152028":"#e0dcd3";
    g.globalAlpha=.018+noise01(i*5)*.075;
    g.fillRect(x,y,1+noise01(i)*4,1+noise01(i*19)*3);
  }
  g.globalAlpha=1;
  for(let i=0;i<50;i++){
    const x=noise01(i*29+11)*512;
    const y=noise01(i*17+33)*512;
    g.fillStyle="rgba(19,29,34,.038)";
    g.fillRect(x,y,4+noise01(i*31)*13,24+noise01(i*41)*120);
  }
  return canvasTexture(THREE,canvas);
}

/**
 * Rectangular urban expressway / metro-tunnel kit.
 *
 * This is a modelled structural shell, not the Arctic cave's old egg shape.
 * All overhead spans are taller than the cars, have side walls outside the
 * asphalt, and follow the road curve. No game colliders are touched.
 */
export function buildMetroTunnel({THREE,worldGroup,getFrameAt,start,end,sidewalkOuter,
                                  theme="metro",registerWallCollider}) {
  const colored=theme === "metro" ? 0x94ceff : 0xffbf7f;
  const concreteTile=tunnelConcreteMap(THREE);
  const concrete = new THREE.MeshStandardMaterial({
    color:0xc9cbd0,roughness:.89,metalness:.02,
    map:concreteTile, bumpMap:concreteTile,bumpScale:.035
  });
  const black = new THREE.MeshStandardMaterial({
    color:0x2b3036,metalness:.28,roughness:.72
  });
  const steel = new THREE.MeshStandardMaterial({
    color:0x717982,metalness:.53,roughness:.44
  });
  const light = new THREE.MeshBasicMaterial({color:colored});
  const warning = new THREE.MeshBasicMaterial({color:0xf2cb55});
  const laneWidth=sidewalkOuter+1.6;
  const intervals=28;

  const portal=(t)=>{
    const f=getFrameAt(t);
    const arch = new THREE.Group();
    arch.position.copy(f.point);
    arch.rotation.y=f.rotationY;
    // Tall, vertical, rectilinear portals with chamfered headers.
    for(const s of [-1,1]){
      const pillar=new THREE.Mesh(new THREE.BoxGeometry(1.45,8.3,1.6),concrete);
      pillar.position.set(s*laneWidth,4.15,0);
      arch.add(pillar);
      if(registerWallCollider) {
        const center=f.point.clone().addScaledVector(f.normal,-s*laneWidth);
        registerWallCollider(center,.725,1.3,f.rotationY,{
          minY:f.point.y-.1,maxY:f.point.y+8.4,tag:"TUNNEL PORTAL"
        });
      }
      const foundation=new THREE.Mesh(new THREE.BoxGeometry(2.9,.55,2.6),black);
      foundation.position.set(s*laneWidth,.25,0);
      arch.add(foundation);
      const reflector=new THREE.Mesh(new THREE.BoxGeometry(.08,.35,1.2),warning);
      reflector.position.set(s*(laneWidth-.75),1.13,0);
      arch.add(reflector);
    }
    const lintel=new THREE.Mesh(
      new THREE.BoxGeometry(laneWidth*2+3.2,1.8,1.7),concrete);
    lintel.position.y=8.05;
    arch.add(lintel);
    const fascia=new THREE.Mesh(
      new THREE.BoxGeometry(laneWidth*2+1.4,.22,.12),light);
    fascia.position.set(0,7.02,-.88);
    arch.add(fascia);

    for(const x of [-laneWidth+1.4,laneWidth-1.4]){
      const chevron=new THREE.Mesh(new THREE.BoxGeometry(.40,.23,.1),warning);
      chevron.position.set(x,7.53,-.92); chevron.rotation.z=.38;
      arch.add(chevron);
    }
    worldGroup.add(arch);
  };
  portal(start);
  portal(end);

  for(let k=0;k<=intervals;k++){
    const t=start+(end-start)*(k/intervals);
    const f=getFrameAt(t);
    const next=getFrameAt(Math.min(end,t+(end-start)/intervals));
    const depth=Math.max(.7,Math.hypot(next.point.x-f.point.x,
                                     next.point.z-f.point.z)+.3);
    const g=new THREE.Group();
    g.position.copy(f.point);
    g.rotation.y=f.rotationY;

    // Side panels and overhead ceiling enclose space, but are not egg-shaped.
    const ceiling=new THREE.Mesh(
      new THREE.BoxGeometry(laneWidth*2+.9,.47,depth+.2),black);
    ceiling.position.y=8.73;g.add(ceiling);

    for(const side of [-1,1]){
      const wall=new THREE.Mesh(
        new THREE.BoxGeometry(.38,8.2,depth+.2),concrete);
      wall.position.set(side*laneWidth,4.1,0);g.add(wall);
      if(registerWallCollider) {
        const center=f.point.clone().addScaledVector(f.normal,-side*laneWidth);
        registerWallCollider(center,.19,(depth+.2)/2,f.rotationY,{
          minY:f.point.y-.1,maxY:f.point.y+8.3,tag:"TUNNEL WALL"
        });
      }

      // Real wall panelling, horizontal shoulder rail, black base.
      const base=new THREE.Mesh(
        new THREE.BoxGeometry(.47,1.1,depth+.2),black);
      base.position.set(side*(laneWidth-.05),.55,0);g.add(base);
      const strip=new THREE.Mesh(
        new THREE.BoxGeometry(.12,.12,depth+.2),steel);
      strip.position.set(side*(laneWidth-.30),1.25,0);g.add(strip);
      const edge=new THREE.Mesh(
        new THREE.BoxGeometry(.12,.065,depth+.2),light);
      edge.position.set(side*(laneWidth-.32),5.95,0);g.add(edge);

      if(k%5===0) {
        const door=new THREE.Mesh(new THREE.BoxGeometry(.12,3.2,1.15),black);
        door.position.set(side*(laneWidth-.34),2.95,0);g.add(door);
        const doorLamp=new THREE.Mesh(
          new THREE.BoxGeometry(.13,.20,.5),warning);
        doorLamp.position.set(side*(laneWidth-.43),5.1,0);g.add(doorLamp);
      }
    }

    // Overhead service pipes / ventilation cable runs.
    for(const side of [-1,1]){
      const pipe=new THREE.Mesh(
        new THREE.CylinderGeometry(.18,.18,depth+.35,8),steel);
      pipe.rotation.x=Math.PI/2;
      pipe.position.set(side*(laneWidth-1.1),8.04,0);
      g.add(pipe);
    }
    if(k%2===0) {
      const lamp=new THREE.Mesh(
        new THREE.BoxGeometry(2.1,.10,1.3),light);
      lamp.position.y=8.40;g.add(lamp);
    }
    if(k%4===0){
      const truss=new THREE.Mesh(
        new THREE.BoxGeometry(laneWidth*2+.7,.35,.28),steel);
      truss.position.y=8.42;g.add(truss);
    }
    worldGroup.add(g);
  }
}
