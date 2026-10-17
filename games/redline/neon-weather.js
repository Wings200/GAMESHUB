/*
 * REDLINE Neon City dynamic weather
 * Visual-only and local: no grip/handling modifiers and no network traffic.
 * Automatic cycle uses wall clock so lobby clients see the same general
 * conditions without a new multiplayer protocol or server dependency.
 */

const WEATHER_CYCLE=[
  {mode:"drizzle",duration:90},
  {mode:"storm",duration:85},
  {mode:"drizzle",duration:75},
  {mode:"clear",duration:100}
];
export const WEATHER_MODES=["auto","clear","drizzle","storm"];
const RAIN_COUNT=460;
const SPRAY_COUNT=62;
const TAU=Math.PI*2;
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
const mix=(a,b,t)=>a+(b-a)*t;
const hash=n=>{
  const x=Math.sin(n*127.1+78.23)*43758.5453123;
  return x-Math.floor(x);
};

export function weatherForTimestamp(epochMs) {
  const duration=WEATHER_CYCLE.reduce((s,x)=>s+x.duration,0);
  let second=((Math.floor(epochMs/1000)%duration)+duration)%duration;
  for(const segment of WEATHER_CYCLE){
    if(second<segment.duration)return segment.mode;
    second-=segment.duration;
  }
  return "clear";
}
export function desiredWeatherLevels(mode) {
  switch(mode){
    case "storm":return {rain:1,wet:1,storm:1};
    case "drizzle":return {rain:.42,wet:.72,storm:0};
    default:return {rain:0,wet:0,storm:0};
  }
}
function makePuddleTexture(THREE) {
  const canvas=document.createElement("canvas");
  canvas.width=128;canvas.height=256;
  const ctx=canvas.getContext("2d");
  const g=ctx.createRadialGradient(64,125,12,64,125,119);
  g.addColorStop(0,"rgba(52,92,122,0.44)");
  g.addColorStop(.52,"rgba(25,67,91,0.18)");
  g.addColorStop(1,"rgba(18,39,68,0)");
  ctx.fillStyle=g;ctx.fillRect(0,0,128,256);
  // Broken reflections of neon signage; staggered segments rather than
  // fake mirror panels or a huge solid cyan road overlay.
  for(let i=0;i<35;i++){
    const y=18+hash(i*13)*215,x=25+hash(i*43)*75;
    const color=["#29bcd8","#d453b7","#5e82f9","#f1b56c"][i%4];
    ctx.globalAlpha=.045+hash(i*7)*.16;
    ctx.fillStyle=color;
    ctx.fillRect(x,y,1.3+hash(i*11)*5,5+hash(i*17)*45);
  }
  ctx.globalAlpha=1;
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=2;
  return tex;
}
function createRoadReflections(THREE,worldGroup,trackSamples) {
  const puddleMat=new THREE.MeshBasicMaterial({
    map:makePuddleTexture(THREE),
    transparent:true,
    opacity:0,
    depthWrite:false,
    polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide,
    toneMapped:false
  });
  const geom=new THREE.PlaneGeometry(1,1);
  geom.rotateX(-Math.PI/2);
  const samples=trackSamples.filter((_,i)=>i%9===0);
  const puddles=new THREE.InstancedMesh(geom,puddleMat,samples.length*2);
  puddles.frustumCulled=false;
  const dummy=new THREE.Object3D();
  let k=0;
  for(let i=0;i<samples.length;i++){
    const frame=samples[i];
    for(const side of [-1,1]){
      const shift=side*(1.7+hash(i*31+side)*2.6);
      dummy.position.copy(frame.point).addScaledVector(frame.normal,shift);
      dummy.position.y+=.094;
      dummy.rotation.set(0,frame.rotationY,0);
      dummy.scale.set(1.25+hash(i*31+5)*2.8,1,6.2+hash(i*17+6)*9.2);
      // Geometry was rotated into X/Z; scale.z is the road length.
      dummy.updateMatrix();
      puddles.setMatrixAt(k++,dummy.matrix);
    }
  }
  puddles.instanceMatrix.needsUpdate=true;
  worldGroup.add(puddles);
  return {material:puddleMat,count:k};
}

function createRain(THREE,worldGroup) {
  // One moving draw call, with short vertical streaks that stay near the
  // player's camera. No global city-sized transparent particle cloud.
  const positions=new Float32Array(RAIN_COUNT*6);
  const seeds=new Float32Array(RAIN_COUNT*4);
  for(let i=0;i<RAIN_COUNT;i++){
    const a=i*4;
    seeds[a]=(hash(i*21+1)-.5)*49;
    seeds[a+1]=(hash(i*71+2)-.5)*58;
    seeds[a+2]=-4+hash(i*67+4)*23;
    seeds[a+3]=18+hash(i*51+9)*17;
  }
  const geom=new THREE.BufferGeometry();
  const attr=new THREE.BufferAttribute(positions,3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geom.setAttribute("position",attr);
  geom.setDrawRange(0,0);
  const material=new THREE.LineBasicMaterial({
    color:0xb4d7f9,transparent:true,opacity:0,depthWrite:false,
    fog:false,toneMapped:false
  });
  const cloud=new THREE.LineSegments(geom,material);
  cloud.frustumCulled=false;
  cloud.renderOrder=11;
  worldGroup.add(cloud);
  const update=(dt,intensity,camera)=>{
    if(intensity<.025) {
      cloud.visible=false;
      return;
    }
    cloud.visible=true;
    cloud.position.copy(camera.position);
    const n=Math.max(0,Math.min(RAIN_COUNT,Math.round(RAIN_COUNT*intensity)));
    geom.setDrawRange(0,n*2);
    material.opacity=.16+.30*intensity;
    for(let i=0;i<n;i++){
      const o=i*4,p=i*6;
      seeds[o+2]-=seeds[o+3]*dt;
      seeds[o]+=dt*(1.9+.9*intensity);
      if(seeds[o+2]<-5)seeds[o+2]=18+hash(i*11+Math.floor(seeds[o]))*3;
      if(seeds[o]>25)seeds[o]=-25;
      const y=seeds[o+2],x=seeds[o],z=seeds[o+1];
      const length=.4+intensity*.75;
      positions[p]=x;positions[p+1]=y;positions[p+2]=z;
      positions[p+3]=x+.14;positions[p+4]=y-length;positions[p+5]=z+.035;
    }
    attr.needsUpdate=true;
  };
  return {update,cloud};
}

function createTireSpray(THREE,worldGroup) {
  const pos=new Float32Array(SPRAY_COUNT*3);
  const particles=Array.from({length:SPRAY_COUNT},()=>({
    x:0,y:-100,z:0,vx:0,vy:0,vz:0,life:0,maxLife:1
  }));
  pos.fill(-1000);
  const geom=new THREE.BufferGeometry();
  const attr=new THREE.BufferAttribute(pos,3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geom.setAttribute("position",attr);
  const material=new THREE.PointsMaterial({
    color:0xc4dcf5,size:.19,transparent:true,opacity:.24,
    depthWrite:false,sizeAttenuation:true,fog:false
  });
  const mesh=new THREE.Points(geom,material);
  mesh.frustumCulled=false;
  worldGroup.add(mesh);
  let cursor=0,accumulator=0,seed=0;
  function update(dt,wet,player) {
    const car=player?.car,carState=player?.carState;
    const velocity=carState?.velocity;
    const speed=velocity?.length?.()||0;
    const emit=car && !carState?.airborne && speed>5 && wet>.18;
    const count=emit ? Math.min(70,Math.max(0,(speed-4)*1.3))*wet : 0;
    accumulator+=dt*count;
    const yaw=car?.rotation?.y||0;
    while(accumulator>=1){
      accumulator-=1;
      const side=seed++%2===0?-1:1;
      const lateral=side*.75;
      const backward=-1.65;
      const p=particles[cursor];
      p.x=car.position.x+lateral*Math.cos(yaw)+backward*Math.sin(yaw);
      p.z=car.position.z-lateral*Math.sin(yaw)+backward*Math.cos(yaw);
      p.y=car.position.y+.25;
      p.vx=-velocity.x*.16+(hash(seed*13)-.5)*2.7;
      p.vz=-velocity.z*.16+(hash(seed*17)-.5)*2.7;
      p.vy=1.1+hash(seed*7)*1.6;
      p.maxLife=.25+hash(seed*19)*.32;
      p.life=p.maxLife;
      cursor=(cursor+1)%SPRAY_COUNT;
    }
    for(let i=0;i<SPRAY_COUNT;i++){
      const p=particles[i],j=i*3;
      if(p.life>0){
        p.life-=dt;
        p.x+=p.vx*dt;p.z+=p.vz*dt;
        p.y+=p.vy*dt;p.vy-=7.0*dt;
        pos[j]=p.x;pos[j+1]=p.y;pos[j+2]=p.z;
      }else{
        pos[j]=pos[j+1]=pos[j+2]=-1000;
      }
    }
    material.opacity=.12+.32*wet;
    attr.needsUpdate=true;
    mesh.visible=wet>.15;
  }
  return {mesh,update,particleCount:SPRAY_COUNT};
}

export function createNeonWeather({
  THREE,worldGroup,scene,renderer,camera,roadMaterial,
  trackSamples,getPlayer,startingOverride="auto"
}) {
  const initialFogNear=scene.fog?.near;
  const initialFogFar=scene.fog?.far;
  const initialExposure=renderer.toneMappingExposure;
  const baseRoughness=roadMaterial?.roughness??.82;
  const baseMetalness=roadMaterial?.metalness??.02;
  const rain=createRain(THREE,worldGroup);
  const spray=createTireSpray(THREE,worldGroup);
  const reflections=createRoadReflections(THREE,worldGroup,trackSamples);
  const lightning=new THREE.PointLight(0xc8e4ff,0,110);
  worldGroup.add(lightning);
  let override=WEATHER_MODES.includes(startingOverride)?startingOverride:"auto";
  let wetness=0,rainLevel=0,stormLevel=0,flash=0,lastBucket=-1;
  let elapsed=0;
  function mode(now=Date.now()) {
    return override==="auto"?weatherForTimestamp(now):override;
  }
  function update(delta,now=Date.now()){
    const dt=clamp(Number(delta)||0,0,.05);
    const state=desiredWeatherLevels(mode(now));
    const smooth=(current,target,seconds)=>
      mix(current,target,1-Math.exp(-dt/Math.max(.001,seconds)));
    rainLevel=smooth(rainLevel,state.rain,2.5);
    stormLevel=smooth(stormLevel,state.storm,4);
    // Pavement wets quickly under rain, but takes longer to dry afterward.
    wetness=smooth(wetness,state.wet,state.wet>wetness?8:31);
    elapsed+=dt;
    rain.update(dt,rainLevel,camera);
    reflections.material.opacity=.67*wetness;
    if(roadMaterial){
      // PBR asset callbacks may load asynchronously; refreshing this
      // every frame ensures weather survives texture swaps.
      roadMaterial.roughness=mix(.82,.19,wetness);
      roadMaterial.metalness=mix(.018,.12,wetness);
    }
    const player=getPlayer?.();
    spray.update(dt,wetness,player);
    if(scene.fog && initialFogFar!=null){
      scene.fog.near=mix(initialFogNear,initialFogNear*.57,stormLevel);
      scene.fog.far=mix(initialFogFar,initialFogFar*.46,stormLevel);
    }
    const bucket=Math.floor(now/18000);
    if(stormLevel>.55 && bucket!==lastBucket){
      if(hash(bucket*7.5)>.41)flash=.9+hash(bucket*13)*.6;
    }
    lastBucket=bucket;
    flash=Math.max(0,flash-dt*5.7);
    const intensity=flash*stormLevel;
    lightning.intensity=17*intensity;
    lightning.position.copy(camera.position);
    lightning.position.y+=33;
    lightning.position.x+=24;
    renderer.toneMappingExposure=initialExposure+intensity*.16;
  }
  function cycleOverride(){
    const index=WEATHER_MODES.indexOf(override);
    override=WEATHER_MODES[(index+1)%WEATHER_MODES.length];
    return override;
  }
  function setOverride(value){
    if(!WEATHER_MODES.includes(value))return false;
    override=value;
    return true;
  }
  function dispose(){
    if(scene.fog && initialFogFar!=null){
      scene.fog.near=initialFogNear;scene.fog.far=initialFogFar;
    }
    renderer.toneMappingExposure=initialExposure;
    if(roadMaterial){
      roadMaterial.roughness=baseRoughness;
      roadMaterial.metalness=baseMetalness;
    }
  }
  return {
    update,dispose,cycleOverride,setOverride,
    get override(){return override;},
    get mode(){return mode();},
    get wetness(){return wetness;},
    get rainLevel(){return rainLevel;},
    get stormLevel(){return stormLevel;},
    get puddleCount(){return reflections.count;},
    get rainParticleCount(){return RAIN_COUNT;},
    get sprayParticleCount(){return spray.particleCount;}
  };
}
