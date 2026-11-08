// Distinct construction techniques for fabric and carpet. Pure/periodic: a
// material's identity comes from its weave, loops, nap or pile—not its tint.
// Height and roughness are returned by this exact same structural generator,
// keeping albedo, normal maps and roughness maps aligned.
const TAU = Math.PI * 2;
const fract = n => n - Math.floor(n);
const wrap = (n,period) => (n % period + period) % period;
const smooth = t => t*t*(3-2*t);
const saturate = n => Math.min(1,Math.max(0,n));
const limit = n => Math.max(.02,Math.min(.98,n));
function hash(x,y,seed){
  let n=(Math.imul(x+seed,374761393)^Math.imul(y+seed,668265263))|0;
  n=Math.imul(n^(n>>>13),1274126177);
  return ((n^(n>>>16))>>>0)/4294967295;
}
function noise(u,v,seed,freq) {
  const x=u*freq,y=v*freq;
  const ix=Math.floor(x),iy=Math.floor(y);
  const fx=smooth(fract(x)),fy=smooth(fract(y));
  const a=hash(wrap(ix,freq),wrap(iy,freq),seed),b=hash(wrap(ix+1,freq),wrap(iy,freq),seed);
  const c=hash(wrap(ix,freq),wrap(iy+1,freq),seed),d=hash(wrap(ix+1,freq),wrap(iy+1,freq),seed);
  return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
}
const signed = n => n*2-1;
const cycles = (count,density) => Math.max(2,Math.round(count*density));
function grid(u,v,countX,countY,seed) {
  const x=u*countX,y=v*countY;
  const col=wrap(Math.floor(x),countX),row=wrap(Math.floor(y),countY);
  return {x:fract(x),y:fract(y),col,row,seeded:hash(col,row,seed)*2-1};
}
function basis(u,v,countX,countY,seed) {
  const sx=Math.cos(TAU*u*countX),sy=Math.cos(TAU*v*countY);
  const wave=Math.sin(TAU*u*countX)*Math.sin(TAU*v*countY);
  const fuzz=signed(noise(u,v,seed+91,cycles(54,1)));
  return {sx,sy,wave,fuzz};
}

export function getTextileConstruction(preset) {
  const name=(preset?.name||'').toLowerCase();
  if(preset?.category==='fabric'){
    if(/velvet/.test(name))return 'velvet-nap';
    if(/felt/.test(name))return 'felted';
    if(/denim|twill/.test(name))return 'diagonal-twill';
    if(/wool/.test(name))return 'wool-knit';
    if(/canvas|forest cloth|charcoal weave/.test(name))return 'basket-weave';
    if(/linen/.test(name))return 'linen-plain';
    return 'cotton-plain';
  }
  if(preset?.category==='carpet'){
    if(/shag/.test(name))return 'shag-pile';
    if(/berber/.test(name))return 'berber-loop';
    if(/office loop|commercial/.test(name))return 'commercial-loop';
    if(/woven rug/.test(name))return 'rug-flatweave';
    if(/entry mat/.test(name))return 'entry-ribbed';
    if(/heather/.test(name))return 'heather-cut';
    if(/plush|cut pile|wool pile/.test(name))return 'plush-cut';
    if(/low pile/.test(name))return 'low-pile';
    return 'fine-cut';
  }
  return null;
}
export function sampleTextileStructure(preset,u,v,density=1){
  const type=getTextileConstruction(preset);
  if(!type)return null;
  u=fract(u); v=fract(v);
  const d=Math.max(.25,Math.min(12,Number(density)||1)),seed=preset.seed;
  const low=signed(noise(u,v,seed+11,cycles(7,d)));
  const medium=signed(noise(u,v,seed+12,cycles(19,d)));
  const micro=signed(noise(u,v,seed+13,cycles(84,d)));
  const count=cycles(26,d),thick=cycles(13,d);
  const sine=(n,k)=>Math.sin(TAU*n*k);
  let color=0,height=.5,roughness=.93;
  switch(type){
    case 'linen-plain':{
      // Thick, uneven plain weave with long natural slubs.
      const warp=sine(u,count),weft=sine(v,count),cross=warp*weft;
      const slubs=signed(noise(u,v,seed+101,cycles(5,d)))*Math.abs(warp);
      color=warp*8.8+weft*8+cross*4.3+slubs*9+medium*4.5;
      height=.50+warp*.079+weft*.070+cross*.053+slubs*.055+micro*.016;
      roughness=.94+slubs*.040+cross*.035+medium*.017;
      break;
    }
    case 'basket-weave':{
      // Thick two-by-two crossed ribbons, unlike linen's fine plain weave.
      const x=Math.cos(TAU*u*thick),y=Math.cos(TAU*v*thick);
      const ribbon=Math.pow(Math.abs(x),1.8)-Math.pow(Math.abs(y),1.8);
      const checker=Math.cos(TAU*u*thick)*Math.cos(TAU*v*thick);
      color=ribbon*13+checker*12+medium*3.5;
      height=.5+ribbon*.11+checker*.095+medium*.02+micro*.018;
      roughness=.92+checker*.06+medium*.024;
      break;
    }
    case 'diagonal-twill':{
      // Continuous diagonally advancing ribs; both frequencies are integers.
      const xCount=cycles(18,d),yCount=cycles(12,d);
      const diagonal=sine(u,xCount)+0.35*sine(v,yCount);
      const ribs=Math.sin(TAU*(u*xCount+v*yCount));
      color=ribs*18+diagonal*4.5+low*3;
      height=.5+ribs*.135+diagonal*.033+micro*.017;
      roughness=.91+ribs*.07+medium*.025;
      break;
    }
    case 'velvet-nap':{
      // Continuous, soft directional nap with broad sheen variation; no grid.
      const nap=signed(noise(u,v,seed+107,cycles(46,d)));
      const direction=Math.sin(TAU*(u*cycles(3,d)+v*cycles(2,d)));
      color=direction*9.2+low*15+nap*2.7;
      height=.5+low*.055+nap*.032+medium*.015;
      roughness=.89+low*.075+nap*.017;
      break;
    }
    case 'felted':{
      // Non-woven entangled fibers: isotropic mottled fibers, no warp/weft.
      const flecks=signed(noise(u,v,seed+108,cycles(94,d)));
      color=low*7+medium*7+flecks*12+micro*4;
      height=.5+flecks*.07+medium*.045+micro*.023;
      roughness=.97+flecks*.019+low*.012;
      break;
    }
    case 'wool-knit':{
      // Soft interlocking loops instead of a straight woven checkerboard.
      const xCount=cycles(18,d),yCount=cycles(14,d);
      const g=grid(u,v,xCount,yCount,seed);
      const x=g.x-.5,y=g.y-.5;
      const ring=Math.exp(-Math.pow((Math.hypot(x/.44,y/.52)-.85)*4.6,2));
      const yarn=sine(v,yCount)*sine(u,xCount);
      color=ring*22+yarn*5+low*5+micro*2;
      height=.42+ring*.23+yarn*.047+medium*.034;
      roughness=.96+medium*.023+ring*.018;
      break;
    }
    case 'cotton-plain':{
      // Tight, small even thread intersections with restrained slubs.
      const n=cycles(43,d),w=sine(u,n),h=sine(v,n);
      const cross=w*h;
      color=w*6.5+h*6.5+cross*5.5+micro*3;
      height=.5+w*.047+h*.047+cross*.057+micro*.016;
      roughness=.93+cross*.042+medium*.025;
      break;
    }
    case 'berber-loop':{
      // Raised loop rings: rounded yarn circles in offset rows.
      const n=cycles(22,d),g=grid(u,v,n,n,seed);
      const shift=(g.row%2)*.5;
      const px=fract(g.x+shift)-.5,py=g.y-.5;
      const ring=Math.exp(-Math.pow((Math.hypot(px,py)-.29)*11,2));
      const inner=Math.exp(-Math.pow(Math.hypot(px,py)*8,2));
      const variation=g.seeded*5;
      color=ring*25-inner*9+low*4+variation+micro*3;
      height=.36+ring*.34-inner*.075+medium*.035;
      roughness=.95+ring*.025+medium*.022;
      break;
    }
    case 'commercial-loop':{
      // Tight repeated short loop channels, like office-grade broadloom.
      const stripes=sine(u,cycles(42,d));
      const shortLoop=sine(v,cycles(27,d))*Math.cos(TAU*u*cycles(42,d));
      color=stripes*13+shortLoop*10+medium*3.5;
      height=.49+stripes*.104+shortLoop*.095+micro*.016;
      roughness=.94+stripes*.039+medium*.025;
      break;
    }
    case 'shag-pile':{
      // Wide, irregular tufts with a dominant strand direction.
      const strands=sine(u,cycles(37,d)+0)*.5+
        Math.sin(TAU*(u*cycles(57,d)+v*cycles(3,d)))*.5;
      const clumps=signed(noise(u,v,seed+111,cycles(13,d)));
      color=strands*13+clumps*19+micro*4.8;
      height=.48+strands*.155+clumps*.132+micro*.033;
      roughness=.97+clumps*.018+micro*.012;
      break;
    }
    case 'rug-flatweave':{
      // Flat, clearly visible woven warp + large transverse weft ribs.
      const x=sine(u,cycles(32,d)),y=sine(v,cycles(15,d));
      const cross=x*y;
      const band=sine(v,cycles(5,d));
      color=x*10+y*14+cross*8+band*6+low*3;
      height=.5+x*.068+y*.097+cross*.073+band*.033;
      roughness=.93+cross*.047+medium*.026;
      break;
    }
    case 'entry-ribbed':{
      // Heavy industrial ribbed carpet; parallel grooves are intentional.
      const ribs=Math.cos(TAU*u*cycles(13,d));
      const chips=signed(noise(u,v,seed+114,cycles(73,d)));
      color=ribs*22+chips*10+low*4;
      height=.49+ribs*.17+chips*.04+medium*.02;
      roughness=.93+ribs*.047+chips*.034;
      break;
    }
    case 'heather-cut':{
      // Several fiber tones interspersed at multiple spatial scales.
      const flecks=signed(noise(u,v,seed+115,cycles(110,d)));
      const mediumF=signed(noise(u,v,seed+116,cycles(37,d)));
      color=low*10+flecks*15+mediumF*10+micro*4;
      height=.5+flecks*.065+mediumF*.067+low*.050;
      roughness=.96+flecks*.024+low*.020;
      break;
    }
    case 'low-pile':{
      const short=sine(u,cycles(72,d))*sine(v,cycles(56,d));
      color=short*7+low*6+medium*5+micro*3;
      height=.5+short*.054+medium*.03+micro*.025;
      roughness=.95+medium*.025+short*.016;
      break;
    }
    case 'plush-cut':
    case 'fine-cut':
    default:{
      // Stochastic cut fibers, soft clustered nap—not regular woven grid.
      const fine=signed(noise(u,v,seed+118,cycles(type==='fine-cut'?86:62,d)));
      const tuft=signed(noise(u,v,seed+119,cycles(24,d)));
      const nap=signed(noise(u,v,seed+120,cycles(7,d)));
      const a=type==='plush-cut'?1.3:1;
      color=nap*11+tuft*10+fine*11+micro*3;
      height=.5+a*(nap*.057+tuft*.082+fine*.060)+micro*.025;
      roughness=.965+nap*.016+fine*.018;
    }
  }
  return {type,albedo:Math.max(-45,Math.min(45,color)),height:limit(height),
    roughness:Math.max(.72,Math.min(1,roughness))};
}
