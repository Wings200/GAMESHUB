// Seamless material generation. All patterns operate on a periodic [0,1)
// domain: opposing edges sample the same noise and same masonry joints.
// Keeping this pure also lets us test every material without WebGL.
const TAU=Math.PI*2;
const fract=x=>x-Math.floor(x);
const wrap=(n,size)=>(n%size+size)%size;
const smooth=t=>t*t*(3-2*t);
const hash=(x,y,seed)=>{
  let n=(Math.imul(x+seed,374761393)^Math.imul(y+seed,668265263))|0;
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
};
const closeToGrid=(position,width)=>{
  const d=Math.min(fract(position),1-fract(position));
  const t=Math.max(0,Math.min(1,(d-width)/(width*.7)));
  return 1-smooth(t);
};
const signed=(n)=>n*2-1;

// Repeatable value noise. Interpolation wraps the lattice at the edges, so
// the broad and fine structures have no start/end discontinuity.
function periodicNoise(u,v,seed,frequency){
  const x=u*frequency,y=v*frequency;
  const ix=Math.floor(x),iy=Math.floor(y);
  const tx=smooth(fract(x)),ty=smooth(fract(y));
  const a=hash(wrap(ix,frequency),wrap(iy,frequency),seed);
  const b=hash(wrap(ix+1,frequency),wrap(iy,frequency),seed);
  const c=hash(wrap(ix,frequency),wrap(iy+1,frequency),seed);
  const d=hash(wrap(ix+1,frequency),wrap(iy+1,frequency),seed);
  return (a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty;
}
function torusDistance(a,b){
  const d=Math.abs(fract(a)-fract(b));
  return Math.min(d,1-d);
}

export function sampleMaterialPattern(preset,u,v){
  // Using fractional UVs ensures exact periodicity at all integer multiples,
  // including 2x, 4x and fractional texture scales.
  u=fract(u);v=fract(v);
  const {pattern,seed}=preset;
  const fine=signed(periodicNoise(u,v,seed+12,32));
  const broad=signed(periodicNoise(u,v,seed+6,6));
  let shade=(broad*.72+fine*.28)*11;
  if(pattern==='glass'||pattern==='paint') return shade*.12;
  if(pattern==='plastic')return shade*.22;
  if(pattern==='concrete')return shade+signed(periodicNoise(u,v,seed+90,64))*5;
  if(pattern==='plaster')return shade*1.25+signed(periodicNoise(u,v,seed+91,64))*7;
  if(pattern==='leather')return shade+signed(periodicNoise(u,v,seed+92,48))*9;
  if(pattern==='ground')return shade*1.7+signed(periodicNoise(u,v,seed+93,64))*14;
  if(pattern==='metal'){
    const brushing=Math.sin(TAU*(v*80+Math.sin(TAU*u*2)*.015));
    return shade*.42+brushing*3;
  }
  if(pattern==='wood'){
    const weave=v*27+Math.sin(TAU*u*2+seed)*.26+Math.sin(TAU*u*5)*.09;
    // Both harmonics use integer frequencies; fractional cycles create an
    // otherwise subtle but straight seam at the repeated image boundary.
    let grain=Math.sin(TAU*weave)*5+Math.cos(TAU*(v*14+Math.sin(TAU*u*2)*.13))*2;
    for(let i=0;i<2;i++){
      const kx=hash(i,7,seed),ky=hash(i,8,seed);
      const dx=torusDistance(u,kx)/.09,dy=torusDistance(v,ky)/.027;
      const ring=Math.sqrt(dx*dx+dy*dy);
      grain-=4*Math.exp(-Math.pow((ring-1)*2,2));
    }
    return shade*.7+grain;
  }
  if(pattern==='fabric'){
    const weave=Math.sin(TAU*u*64)*Math.sin(TAU*v*64);
    return shade*.4+weave*6;
  }
  if(pattern==='tile'){
    const rows=4,cols=4;
    const mortar=Math.max(closeToGrid(u*cols,.025),closeToGrid(v*rows,.025));
    const cellShade=signed(hash(wrap(Math.floor(u*cols),cols),wrap(Math.floor(v*rows),rows),seed))*2.2;
    return shade*.28+cellShade-mortar*47;
  }
  if(pattern==='brick'){
    const rows=8,cols=4;
    const ry=v*rows,row=Math.floor(ry),stagger=(row%2)*.5;
    const cx=u*cols-stagger,col=wrap(Math.floor(cx),cols);
    const mortar=Math.max(closeToGrid(ry,.035),closeToGrid(cx,.032));
    const brickShade=signed(hash(col,wrap(row,rows),seed))*7;
    return shade*.8+brickShade-mortar*43;
  }
  if(pattern==='roof'){
    const rows=8,cols=4;
    const ry=v*rows,row=Math.floor(ry),cx=u*cols-(row%2)*.5;
    const joints=Math.max(closeToGrid(ry,.035),closeToGrid(cx,.021));
    return shade*.8-12*fract(ry)-joints*32;
  }
  if(pattern==='stone'){
    const rows=6,cols=3;
    // Warping both dimensions with integer-frequency functions keeps the
    // hand-cut appearance and preserves continuity at the UV boundaries.
    const ry=v*rows+Math.sin(TAU*u*3+seed)*.055;
    const row=Math.floor(ry),cx=u*cols-(wrap(row,rows)%2)*.5+
      Math.sin(TAU*v*2+seed)*.06;
    const joints=Math.max(closeToGrid(ry,.028),closeToGrid(cx,.028));
    const block=signed(hash(wrap(Math.floor(cx),cols),wrap(row,rows),seed))*8;
    return shade*1.15+block-joints*34;
  }
  return shade;
}
