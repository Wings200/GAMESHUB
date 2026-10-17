/*
 * REDLINE — NEON CITY AMBIENT TRAFFIC
 *
 * Client-side scenery simulation only. Cars occupy already-built, cleared
 * background street runs; they never enter the competitive raceway, register
 * player collisions, or send/receive multiplayer packets.
 *
 * Deterministic stoplights, following distance and road-end despawning;
 * instanced geometries keep the draw-call count small on school Chromebooks.
 */

const COLORS=[0x3b4658,0xb4b4aa,0x9c2b3c,0x1b5661,0xc3a64b,
  0x53505d,0x35617b,0x4f574a,0x272b35,0x856048];

export function buildTrafficRoadNetwork(roadSegments, trackSamples=[]) {
  const roads=(roadSegments||[])
    .filter(r=>r && (r.axis==="x"||r.axis==="z") &&
      Number.isFinite(r.centerX) && Number.isFinite(r.centerZ) &&
      Number.isFinite(r.length) && r.length>=56)
    .map((r,i)=>({
      id:i, axis:r.axis, x:r.centerX,z:r.centerZ,
      length:r.length,
      min:(r.axis==="z"?r.centerZ:r.centerX)-r.length/2,
      max:(r.axis==="z"?r.centerZ:r.centerX)+r.length/2,
      intersections:[],score:Infinity
    }));

  // Crossings are genuine overlaps of both decorative road meshes.
  // Never infer a junction from only the visual city grid pattern.
  for(let i=0;i<roads.length;i++){
    const a=roads[i];
    for(let j=i+1;j<roads.length;j++){
      const b=roads[j];
      if(a.axis===b.axis)continue;
      const xRoad=a.axis==="x"?a:b;
      const zRoad=a.axis==="z"?a:b;
      const x=zRoad.x, z=xRoad.z;
      if(x<xRoad.min+9||x>xRoad.max-9||
         z<zRoad.min+9||z>zRoad.max-9)continue;
      const signal={x,z,phase:(Math.abs(Math.round(x*7+z*11))%5)*2.2};
      a.intersections.push({distance:(a.axis==="x"?x:z)-a.min,
        signal});
      b.intersections.push({distance:(b.axis==="x"?x:z)-b.min,
        signal});
    }
  }
  for(const road of roads){
    road.intersections.sort((a,b)=>a.distance-b.distance);
    if(trackSamples.length){
      // Visual interest near the player, but traffic cannot cross the
      // actual track because the street generator already cleared it.
      let score=Infinity;
      for(let k=0;k<trackSamples.length;k+=12) {
        const p=trackSamples[k].point;
        const px=road.axis==="x"
          ?Math.max(road.min,Math.min(road.max,p.x)):road.x;
        const pz=road.axis==="z"
          ?Math.max(road.min,Math.min(road.max,p.z)):road.z;
        score=Math.min(score,Math.hypot(px-p.x,pz-p.z));
      }
      road.score=score;
    } else road.score=0;
  }
  roads.sort((a,b)=>a.score-b.score || b.length-a.length);
  return roads;
}

export function trafficLightIsGreen(signal,axis,elapsed) {
  // One axis green at a time; yellow/all-red transition every cycle.
  // Opposing lanes on the same street get the same signal.
  const t=((elapsed+signal.phase)%30+30)%30;
  return axis==="x" ? t>=1.5&&t<13.4 : t>=16.2&&t<28.2;
}

function makeCarPopulation(roads,maxCars) {
  const usable=roads.filter(r=>r.length>=68);
  const chosen=usable.length?usable:roads;
  if(!chosen.length)return [];
  const count=Math.min(maxCars,chosen.length*2);
  const cars=[];
  for(let i=0;i<count;i++){
    const road=chosen[i%chosen.length];
    const direction=(i%2===0)?1:-1;
    const seed=(i*0.618033988749895)%1;
    const progress=road.length*(.14+.69*seed);
    cars.push({
      id:i,road,dir:direction,progress,
      desiredSpeed:7.3+(i*19%9)*.63,
      speed:5.2+(i%5)*.45,
      // A fixed local-right offset naturally flips sides on opposite headings.
      laneOffset:-1.45,
      paint:COLORS[(i*7)%COLORS.length],
      taxi:i%9===0,
      size:i%6===0?1.11:1,
      visibleSize:1
    });
  }
  return cars;
}

// Exposed for deterministic headless regression tests; contains NO Three.js.
export function updateTrafficCars(cars, delta, elapsed) {
  if(!cars.length)return;
  const dt=Math.max(0,Math.min(.05,Number(delta)||0));
  if(dt===0)return;
  // Capture original positions before advancing to avoid update-order bias.
  const before=cars.map(c=>c.progress);
  for(let i=0;i<cars.length;i++){
    const c=cars[i],road=c.road;
    let target=c.desiredSpeed;
    const length=road.length;
    const remaining=length-c.progress;
    // Smoothly stop before red street crossings, rather than driving
    // through them. Yellow and all-red periods are treated as red.
    for(const intersection of road.intersections){
      const along=c.dir===1
        ?intersection.distance:length-intersection.distance;
      const gap=along-c.progress-5.2;
      if(gap < -1.1 || gap>28)continue;
      if(!trafficLightIsGreen(intersection.signal,road.axis,elapsed)) {
        const brakeSpeed=Math.sqrt(2*5.0*Math.max(0,gap));
        target=Math.min(target,brakeSpeed);
      }
    }
    // Car following: preserve ~8m safe distance to the vehicle ahead,
    // and never occupy the same spot on the same directed lane.
    let leaderDist=Infinity;
    for(let j=0;j<cars.length;j++){
      const other=cars[j];
      if(j===i||other.road!==road||other.dir!==c.dir)continue;
      const gap=before[j]-before[i];
      if(gap>0 && gap<leaderDist)leaderDist=gap;
    }
    if(leaderDist<22)target=Math.min(target,
      Math.max(0,(leaderDist-7.8)*1.8));
    // Never accelerate through a dead end; the vehicle disappears into
    // the ambient street and re-enters at the opposite end.
    if(remaining<8)target=Math.min(target,Math.max(2.5,remaining*1.5));
    const accel=target<c.speed?8.8:3.4;
    c.speed+=Math.max(-accel*dt,Math.min(accel*dt,target-c.speed));
    c.progress=Math.min(length,c.progress+c.speed*dt);
    if(c.progress>=length-.18) {
      c.progress=0;
      c.speed=Math.min(c.desiredSpeed,3.5);
    }
    const edge=Math.min(c.progress,length-c.progress);
    c.visibleSize=Math.max(.001,Math.min(1,edge/8));
  }
}

function createCarMeshes(THREE,group,cars) {
  const carCount=cars.length;
  const dark=new THREE.MeshStandardMaterial({color:0x0e1825,
    roughness:.48,metalness:.22});
  const roof=new THREE.MeshStandardMaterial({color:0x131a23,
    roughness:.60,metalness:.20});
  const paint=new THREE.MeshStandardMaterial({
    color:0xffffff,roughness:.52,metalness:.23
  });
  const tires=new THREE.MeshStandardMaterial({
    color:0x101115,roughness:.96
  });
  const lamp=new THREE.MeshBasicMaterial({
    color:0xffeace,toneMapped:false
  });
  const red=new THREE.MeshBasicMaterial({
    color:0xff304c,toneMapped:false
  });
  const taxiMat=new THREE.MeshBasicMaterial({
    color:0xffd763,toneMapped:false
  });
  const unitBox=new THREE.BoxGeometry(1,1,1);
  const wheelGeo=new THREE.CylinderGeometry(1,1,1,10);
  const components=[
    {name:"body",geo:unitBox,mat:paint,perCar:1,offsets:[[0,.72,0]],size:[1.8,.62,3.85]},
    {name:"glass",geo:unitBox,mat:dark,perCar:1,offsets:[[0,1.17,-.25]],size:[1.51,.55,2.15]},
    {name:"roof",geo:unitBox,mat:roof,perCar:1,offsets:[[0,1.48,-.25]],size:[1.53,.08,2.12]},
    {name:"wheels",geo:wheelGeo,mat:tires,perCar:4,
      offsets:[[-.95,.47,-1.15],[.95,.47,-1.15],[-.95,.47,1.15],[.95,.47,1.15]],
      size:[.42,.18,.42],wheel:true},
    {name:"headlights",geo:unitBox,mat:lamp,perCar:2,
      offsets:[[-.6,.79,1.94],[.6,.79,1.94]],size:[.42,.18,.07]},
    {name:"taillights",geo:unitBox,mat:red,perCar:2,
      offsets:[[-.62,.76,-1.94],[.62,.76,-1.94]],size:[.43,.16,.07]},
    {name:"taxi",geo:unitBox,mat:taxiMat,perCar:1,
      offsets:[[0,1.63,-.18]],size:[.84,.20,.48],onlyTaxi:true}
  ];
  for(const component of components){
    const mesh=new THREE.InstancedMesh(
      component.geo,component.mat,carCount*component.perCar);
    mesh.frustumCulled=false;
    if(component.name==="body"){
      cars.forEach((car,i)=>mesh.setColorAt(i,new THREE.Color(car.paint)));
      if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    }
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(mesh);
    component.mesh=mesh;
  }
  return components;
}

/*
 * Compact intersection signals which visually match the same phase the
 * AI uses to stop. One pair per junction and only for nearby intersections.
 * Poles are visual only, placed on the outside corners of cleared streets.
 */
function createIntersectionLights(THREE,root,roads) {
  const unique=new Set(),junctions=[];
  for(const road of roads) {
    for(const entry of road.intersections) {
      if(unique.has(entry.signal))continue;
      unique.add(entry.signal);
      junctions.push({...entry.signal,signal:entry.signal,
        priority:road.score});
    }
  }
  junctions.sort((a,b)=>a.priority-b.priority);
  const sites=junctions.slice(0,20);
  if(!sites.length)return {count:0,refresh(){}};
  const count=sites.length*2;
  const make=(geo,material)=>{
    const mesh=new THREE.InstancedMesh(geo,material,count);
    mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(mesh);
    return mesh;
  };
  const pole=make(new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0x323943,roughness:.87}));
  const housing=make(new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0x11141a,roughness:.62}));
  const lens=make(new THREE.SphereGeometry(1,8,6),
    new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}));
  const dummy=new THREE.Object3D();
  for(let i=0;i<sites.length;i++){
    const site=sites[i];
    for(let axis=0;axis<2;axis++){
      const j=i*2+axis;
      // Two traffic posts beyond the outside corners of an intersection.
      const x=site.x+(axis===0?-4.1:4.1);
      const z=site.z+(axis===0?4.1:-4.1);
      dummy.position.set(x,1.48,z);
      dummy.rotation.set(0,0,0);
      dummy.scale.set(.11,2.96,.11);
      dummy.updateMatrix();pole.setMatrixAt(j,dummy.matrix);
      dummy.position.set(x,2.88,z);
      dummy.scale.set(.49,.74,.36);
      dummy.updateMatrix();housing.setMatrixAt(j,dummy.matrix);
      dummy.position.set(x,2.89,z+.21);
      dummy.scale.set(.15,.15,.15);
      dummy.updateMatrix();lens.setMatrixAt(j,dummy.matrix);
    }
  }
  for(const mesh of [pole,housing,lens])mesh.instanceMatrix.needsUpdate=true;
  const red=new THREE.Color(0xff304c),green=new THREE.Color(0x36f39a);
  function refresh(elapsed){
    for(let i=0;i<sites.length;i++){
      const signal=sites[i].signal;
      lens.setColorAt(2*i,trafficLightIsGreen(signal,"x",elapsed)?green:red);
      lens.setColorAt(2*i+1,trafficLightIsGreen(signal,"z",elapsed)?green:red);
    }
    if(lens.instanceColor)lens.instanceColor.needsUpdate=true;
  }
  refresh(0);
  return {count:sites.length,refresh};
}

export function createNeonTraffic({
  THREE,worldGroup,roadSegments,trackSamples,maxCars=26
}) {
  const roads=buildTrafficRoadNetwork(roadSegments,trackSamples);
  const cars=makeCarPopulation(roads,Math.max(0,Math.min(32,maxCars)));
  let elapsed=0,enabled=true;
  if(!cars.length) {
    return {count:0,roadCount:roads.length,
      update(){},setEnabled(){},get enabled(){return false;}};
  }
  const root=new THREE.Group();
  root.name="REDLINE_AMBIENT_TRAFFIC";
  worldGroup.add(root);
  const components=createCarMeshes(THREE,root,cars);
  const junctionLights=createIntersectionLights(THREE,root,roads);
  let lightTick=0;
  const dummy=new THREE.Object3D();
  dummy.rotation.order="YXZ";
  function applyCar(car,component,j) {
    const road=car.road;
    const axis=road.axis;
    const along=car.dir===1
      ?road.min+car.progress : road.max-car.progress;
    const centerX=axis==="x"?along:road.x;
    const centerZ=axis==="z"?along:road.z;
    const yaw=axis==="x"
      ?(car.dir===1?Math.PI/2:-Math.PI/2)
      :(car.dir===1?0:Math.PI);
    const sin=Math.sin(yaw),cos=Math.cos(yaw);
    const part=component.offsets[j];
    // Positive local X is the vehicle's right side. Two-way lanes have
    // disjoint lateral offsets, staying inside each 7m decorative street.
    const lx=part[0]+car.laneOffset, lz=part[2];
    dummy.position.set(centerX+lx*cos+lz*sin,
      part[1],centerZ-lx*sin+lz*cos);
    dummy.rotation.set(0,yaw,component.wheel?Math.PI/2:0);
    const scale=component.onlyTaxi && !car.taxi
      ? .001 : car.visibleSize*car.size;
    dummy.scale.set(component.size[0]*scale,
      component.size[1]*scale,component.size[2]*scale);
    dummy.updateMatrix();
    component.mesh.setMatrixAt(car.id*component.perCar+j,dummy.matrix);
  }
  function draw(){
    for(const component of components){
      for(const car of cars){
        for(let j=0;j<component.perCar;j++)applyCar(car,component,j);
      }
      component.mesh.instanceMatrix.needsUpdate=true;
    }
  }
  draw();
  return {
    count:cars.length,roadCount:roads.length,
    junctionCount:junctionLights.count,
    update(delta){
      if(!enabled)return;
      elapsed+=Math.max(0,Math.min(.05,delta));
      updateTrafficCars(cars,delta,elapsed);
      draw();
      lightTick+=delta;
      if(lightTick>=.25){
        junctionLights.refresh(elapsed);
        lightTick=0;
      }
    },
    setEnabled(value){
      enabled=Boolean(value);
      root.visible=enabled;
    },
    get enabled(){return enabled;},
    // Readonly local diagnostics (not multiplayer state).
    get cars(){return cars;},
    get roads(){return roads;}
  };
}
