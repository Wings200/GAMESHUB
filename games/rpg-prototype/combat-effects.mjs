// W19.1 — GPU-batched physical hit sparks and dust. No raycast meshes or
// per-shot allocations; thousands of impacts reuse a small bounded pool.
export function createImpactEffects(scene,THREE,{capacity=190}={}){
  const size=Math.max(32,Math.min(380,Math.floor(capacity)));
  const positions=new Float32Array(size*3);
  const colors=new Float32Array(size*3);
  const particles=Array.from({length:size},()=>({
    x:0,y:-999,z:0,vx:0,vy:0,vz:0,life:0,total:1
  }));
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
  const material=new THREE.PointsMaterial({size:.108,
    vertexColors:true,transparent:true,opacity:.88,depthWrite:false,
    blending:THREE.AdditiveBlending,sizeAttenuation:true});
  const cloud=new THREE.Points(geometry,material);
  cloud.name='PooledProjectileImpacts';
  cloud.frustumCulled=false;scene.add(cloud);
  let cursor=0,spawned=0;
  const palettes={
    metal:[[1,.76,.39],[1,.92,.61],[.94,.48,.22]],
    concrete:[[.67,.63,.54],[.47,.44,.39],[.88,.78,.59]],
    wood:[[.66,.42,.24],[.43,.31,.20],[.79,.56,.31]],
    paper:[[.83,.76,.61],[.63,.58,.48]],
    flesh:[[.68,.24,.20],[.48,.16,.15],[.86,.38,.26]]
  };
  function spawn(point,type='concrete'){
    if(!point||![point.x,point.y,point.z].every(Number.isFinite))return false;
    const palette=palettes[type]||palettes.concrete;
    const count=type==='metal'?9:type==='concrete'?8:type==='flesh'?6:5;
    for(let k=0;k<count;k++){
      const i=cursor++%size,particle=particles[i];
      const a=Math.random()*Math.PI*2;
      const speed=.65+Math.random()*2.0;
      particle.x=point.x;particle.y=point.y;particle.z=point.z;
      particle.vx=Math.cos(a)*speed;
      particle.vy=(type==='metal'?1.45:.75)+Math.random()*1.3;
      particle.vz=Math.sin(a)*speed;
      particle.life=particle.total=.18+Math.random()*
        (type==='metal'?.34:.58);
      const tint=palette[k%palette.length];
      positions[i*3]=particle.x;positions[i*3+1]=particle.y;
      positions[i*3+2]=particle.z;
      colors[i*3]=tint[0];colors[i*3+1]=tint[1];colors[i*3+2]=tint[2];
    }
    geometry.attributes.position.needsUpdate=true;
    geometry.attributes.color.needsUpdate=true;
    spawned++;
    return true;
  }
  function update(dt){
    const step=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
    if(step===0)return;
    for(let i=0;i<size;i++){
      const p=particles[i];
      if(p.life<=0)continue;
      p.life=Math.max(0,p.life-step);
      p.vy-=4.8*step;
      const drag=Math.exp(-2.4*step);
      p.vx*=drag;p.vz*=drag;
      p.x+=p.vx*step;p.y+=p.vy*step;p.z+=p.vz*step;
      positions[i*3]=p.x;
      positions[i*3+1]=p.life>0?p.y:-999;
      positions[i*3+2]=p.z;
      const fade=p.life/p.total;
      colors[i*3]*=Math.max(.0,1-step*(1.0+(1-fade)*2));
      colors[i*3+1]*=Math.max(.0,1-step*(1.0+(1-fade)*2));
      colors[i*3+2]*=Math.max(.0,1-step*(1.0+(1-fade)*2));
    }
    geometry.attributes.position.needsUpdate=true;
    geometry.attributes.color.needsUpdate=true;
  }
  return {cloud,spawn,update,get metrics(){return {
    capacity:size,emissions:spawned,active:particles.filter(p=>p.life>0).length
  };}};
}
