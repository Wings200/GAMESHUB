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
export function sampleMaterialPattern(preset,u,v,scale=1){
  // A larger scale increases the amount of *unique* pattern across this
  // whole texture. Unlike WebGL's texture.repeat, it does not duplicate one
  // image in four or sixteen identical quadrants.
  u=fract(u);v=fract(v);
  const density=Math.max(.25,Math.min(12,Number(scale)||1));
  const cycles=n=>Math.max(1,Math.round(n*density));
  const evenCycles=n=>Math.max(2,Math.round(n*density/2)*2);
  const {pattern,seed}=preset;
  const fine=signed(periodicNoise(u,v,seed+12,cycles(32)));
  const broad=signed(periodicNoise(u,v,seed+6,cycles(6)));
  let shade=(broad*.72+fine*.28)*11;
  if(pattern==='glass'||pattern==='paint') return shade*.12;
  if(pattern==='plastic')return shade*.22;
  if(pattern==='concrete')return shade+signed(periodicNoise(u,v,seed+90,cycles(64)))*5;
  if(pattern==='plaster')return shade*1.25+signed(periodicNoise(u,v,seed+91,cycles(64)))*7;
  if(pattern==='leather')return shade+signed(periodicNoise(u,v,seed+92,cycles(48)))*9;
  if(pattern==='ground')return shade*1.7+signed(periodicNoise(u,v,seed+93,cycles(64)))*14;
  if(pattern==='metal'){
    const brushing=Math.sin(TAU*(v*cycles(80)+Math.sin(TAU*u*cycles(2))*.015));
    return shade*.42+brushing*3;
  }
  if(pattern==='wood'){
    if(pattern==='stone'){
    // Hand-cut stone blocks: recessed seams, gently uneven stone faces,
    // sparse hairline fissures and mineral variation. Matches albedo layout.
    const rows=Math.max(2,Math.round(6*density/2)*2),cols=cycles(3);
    const ry=v*rows+Math.sin(TAU*u*cycles(3)+seed)*.055;
    const row=Math.floor(ry);
    const cx=u*cols-(wrap(row,rows)%2)*.5+Math.sin(TAU*v*cycles(2)+seed)*.06;
    const joint=Math.max(closeToGrid(ry,.028),closeToGrid(cx,.028));
    const block=signed(hash(wrap(Math.floor(cx),cols),wrap(row,rows),seed+190))*.06;
    const mineral=signed(periodicNoise(u,v,seed+191,cycles(11)));
    const vein=Math.pow(Math.max(0,1-Math.abs(
      periodicNoise(u,v,seed+192,cycles(9))-.52)*28),3);
    return {
      height:Math.max(.08,Math.min(.91,.57+block+medium*.072+fine*.028-joint*.36-vein*.042)),
      roughness:Math.max(.72,Math.min(1,.88+mineral*.066+fine*.034+joint*.12))
    };
  }
  if(pattern==='tile'){
    // Thin, smooth glazed faces with genuinely lower grout channels.
    const rows=cycles(4),cols=cycles(4);
    const ux=u*cols,vy=v*rows;
    const grout=Math.max(closeToGrid(ux,.025),closeToGrid(vy,.025));
    const bevel=Math.max(closeToGrid(ux,.09),closeToGrid(vy,.09));
    const glaze=signed(periodicNoise(u,v,seed+193,cycles(19)));
    return {
      height:Math.max(.10,Math.min(.84,.67+glaze*.014+fine*.008-bevel*.045-grout*.39)),
      roughness:Math.max(.64,Math.min(1,.79+glaze*.049+fine*.027+grout*.18))
    };
  }
  if(pattern==='metal'){
    // Fine directional brushing/scratches rather than cratered metal.
    // Polish variants are naturally subtler than aged or brushed alloys.
    const polished=/polished|chrome|gold finish/i.test(preset.name||'');
    const aged=/aged|oxidized|corten|patina/i.test(preset.name||'');
    const brush=Math.sin(TAU*(v*cycles(72)+Math.sin(TAU*u*cycles(2))*.018));
    const scratch=signed(periodicNoise(u,v,seed+194,cycles(96)));
    const wear=signed(periodicNoise(u,v,seed+195,cycles(11)));
    const amplitude=polished?.35:aged?1.25:1;
    return {
      height:Math.max(.31,Math.min(.69,.5+amplitude*(brush*.037+scratch*.018+fine*.01))),
      roughness:Math.max(.52,Math.min(1,
        (polished?.88:aged?.95:.9)+(brush*.048+wear*.075+fine*.035)*amplitude))
    };
  }
  if(pattern==='roof'){
    // Staggered rows and a raised front lip suggest overlapping shingles.
    // These are shading normals, not actual overlapping mesh geometry.
    const rows=Math.max(2,Math.round(8*density/2)*2),cols=cycles(4);
    const ry=v*rows,row=Math.floor(ry),cx=u*cols-(row%2)*.5;
    const seam=Math.max(closeToGrid(ry,.035),closeToGrid(cx,.021));
    const upperEdge=1-fract(ry);
    const face=signed(hash(wrap(Math.floor(cx),cols),wrap(row,rows),seed+196))*.035;
    return {
      height:Math.max(.07,Math.min(.95,.42+upperEdge*.28+face+medium*.032+fine*.018-seam*.24)),
      roughness:Math.max(.72,Math.min(1,.87+medium*.066+fine*.038+seam*.11))
    };
  }
  const weave=v*cycles(27)+Math.sin(TAU*u*cycles(2)+seed)*.26+
      Math.sin(TAU*u*cycles(5))*.09;
    // Both harmonics use integer frequencies; fractional cycles create an
    // otherwise subtle but straight seam at the repeated image boundary.
    let grain=Math.sin(TAU*weave)*5+
      Math.cos(TAU*(v*cycles(14)+Math.sin(TAU*u*cycles(2))*.13))*2;
    // Seed a different occasional knot in each section, not the same two
    // knots repeated in every UV quadrant.
    const cells=cycles(2),cx=Math.floor(u*cells),cy=Math.floor(v*cells);
    if(hash(cx,cy,seed+77)>.48){
      const localX=fract(u*cells),localY=fract(v*cells);
      const kx=.32+hash(cx,cy,seed+78)*.36;
      const ky=.32+hash(cx,cy,seed+79)*.36;
      const ring=Math.hypot((localX-kx)/.13,(localY-ky)/.05);
      grain-=5*Math.exp(-Math.pow((ring-1)*2,2));
    }
    return shade*.7+grain;
  }
  if(pattern==='fabric'){
    const weave=Math.sin(TAU*u*cycles(64))*Math.sin(TAU*v*cycles(64));
    return shade*.4+weave*6;
  }
  if(pattern==='tile'){
    const rows=cycles(4),cols=cycles(4);
    const mortar=Math.max(closeToGrid(u*cols,.025),closeToGrid(v*rows,.025));
    const cellShade=signed(hash(wrap(Math.floor(u*cols),cols),wrap(Math.floor(v*rows),rows),seed))*2.2;
    return shade*.28+cellShade-mortar*47;
  }
  if(pattern==='brick'){
    const rows=evenCycles(8),cols=cycles(4);
    const ry=v*rows,row=Math.floor(ry),stagger=(row%2)*.5;
    const cx=u*cols-stagger,col=wrap(Math.floor(cx),cols);
    const mortar=Math.max(closeToGrid(ry,.035),closeToGrid(cx,.032));
    const brickShade=signed(hash(col,wrap(row,rows),seed))*7;
    return shade*.8+brickShade-mortar*43;
  }
  if(pattern==='roof'){
    const rows=evenCycles(8),cols=cycles(4);
    const ry=v*rows,row=Math.floor(ry),cx=u*cols-(row%2)*.5;
    const joints=Math.max(closeToGrid(ry,.035),closeToGrid(cx,.021));
    return shade*.8-12*fract(ry)-joints*32;
  }
  if(pattern==='stone'){
    const rows=evenCycles(6),cols=cycles(3);
    // Warping both dimensions with integer-frequency functions keeps the
    // hand-cut appearance and preserves continuity at the UV boundaries.
    const ry=v*rows+Math.sin(TAU*u*cycles(3)+seed)*.055;
    const row=Math.floor(ry),cx=u*cols-(wrap(row,rows)%2)*.5+
      Math.sin(TAU*v*cycles(2)+seed)*.06;
    const joints=Math.max(closeToGrid(ry,.028),closeToGrid(cx,.028));
    const block=signed(hash(wrap(Math.floor(cx),cols),wrap(row,rows),seed))*8;
    return shade*1.15+block-joints*34;
  }
  return shade;
}

// Physical detail for seven construction families. Height is a
// dimensionless relief field (not geometry displacement); roughness is a
// multiplier used by Three.js's PBR roughness map. Both tile seamlessly.
export function sampleMaterialRelief(preset,u,v,scale=1){
  const {pattern,seed}=preset;
  if(!['concrete','brick','wood','stone','tile','metal','roof'].includes(pattern))return null;
  u=fract(u);v=fract(v);
  const density=Math.max(.25,Math.min(12,Number(scale)||1));
  const cycles=n=>Math.max(1,Math.round(n*density));
  const fine=signed(periodicNoise(u,v,seed+151,cycles(48)));
  const medium=signed(periodicNoise(u,v,seed+152,cycles(16)));
  if(pattern==='concrete'){
    const grain=signed(periodicNoise(u,v,seed+153,cycles(80)));
    return {
      height:.5+medium*.095+fine*.054+grain*.018,
      roughness:Math.max(.73,Math.min(1,.9+medium*.045+grain*.035))
    };
  }
  if(pattern==='brick'){
    const rows=Math.max(2,Math.round(8*density/2)*2),cols=cycles(4);
    const ry=v*rows,row=Math.floor(ry),cx=u*cols-(row%2)*.5;
    const mortar=Math.max(closeToGrid(ry,.035),closeToGrid(cx,.032));
    const faceShade=signed(hash(wrap(Math.floor(cx),cols),wrap(row,rows),seed+154))*.045;
    return {
      height:.62+faceShade+fine*.035-mortar*.43,
      roughness:Math.min(1,.83+medium*.045+mortar*.17)
    };
  }
  const weave=v*cycles(27)+Math.sin(TAU*u*cycles(2)+seed)*.26+
    Math.sin(TAU*u*cycles(5))*.09;
  const ridges=Math.sin(TAU*weave);
  const cells=cycles(2),cx=Math.floor(u*cells),cy=Math.floor(v*cells);
  let knot=0;
  if(hash(cx,cy,seed+77)>.48){
    const localX=fract(u*cells),localY=fract(v*cells);
    const kx=.32+hash(cx,cy,seed+78)*.36;
    const ky=.32+hash(cx,cy,seed+79)*.36;
    const ring=Math.hypot((localX-kx)/.13,(localY-ky)/.05);
    knot=Math.exp(-Math.pow((ring-1)*2,2));
  }
  return {
    height:.51+ridges*.074+fine*.025-knot*.095,
    roughness:Math.max(.62,Math.min(1,.82-ridges*.07+fine*.035+knot*.06))
  };
}
