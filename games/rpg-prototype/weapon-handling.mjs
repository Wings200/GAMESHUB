// W02 render-independent handling helpers, shared by any future weapon model.
// The WebGL scene renders the gun, hands, brass and flash based on these states.

export const CASING_TUNING=Object.freeze({
  gravity:11.8,
  bounce:.24,
  maxLife:7.2,
  maxVisible:38,
  drag:.85
});
const clamp01=x=>Math.min(1,Math.max(0,x));
const smooth=x=>{const t=clamp01(x);return t*t*(3-2*t);};

export function reloadVisualState(remaining,duration=1.65) {
  if(!(remaining>0))return {
    active:false,progress:1,magazineOffset:0,magazineVisible:true,
    magazineAngle:0,slideOffset:0,handX:-.2,handY:-.16,handZ:.13,
    handVisible:false,tilt:0
  };
  const p=clamp01(1-remaining/Math.max(.001,duration));
  // 0-.15 reach for magazine; .15-.43 pull; .43-.59 fresh magazine,
  // .59-.78 seat; .78-.96 rack slide; final fraction settle.
  const pull=smooth((p-.14)/.25);
  const seat=smooth((p-.58)/.22);
  const drop = p<.45?pull : p<.59?1 : 1-seat;
  const reloadHandReach=smooth(p/.16);
  const retract=smooth((p-.94)/.06);
  const rack=p>=.78&&p<.96?Math.sin(Math.PI*(p-.78)/.18)*.17:0;
  return {
    active:true,progress:p,magazineOffset:drop*.37,
    magazineVisible:true,magazineAngle:drop*.15,
    slideOffset:rack,
    handX:-.18 + rack*.4,
    handY:-.15 - drop*.36 + rack*.26,
    handZ:.15 + rack*(-.42),
    handVisible:p>.07 && p<.98,
    tilt:Math.sin(Math.PI*p)*.10
  };
}

const rise=(p,a,b)=>smooth((p-a)/(b-a));
const pulse=(p,a,b)=>p<a||p>b?0:Math.sin(Math.PI*(p-a)/(b-a));
// Distinct *mechanical* reload paths for the six guns, not the old shared
// detachable-mag hand swipe. Completion still belongs to weapons.mjs.
export function reloadPoseForWeapon(id,remaining,duration=1.65,roundCount=null){
  const base=reloadVisualState(remaining,duration);
  const pose={...base,style:id,roundVisible:false,roundIndex:-1,
    shellProgress:0,cylinderOpen:0,cylinderSpin:0,boltOffset:0,
    boltHandleLift:0,pumpOffset:0,ejector:0};
  if(!base.active)return pose;
  const p=base.progress;
  const magSwap=(a,b,c,d,size)=>{
    const down=rise(p,a,b),up=rise(p,c,d);
    return size*Math.max(0,down-up);
  };
  if(id==='scrap-pistol'){
    pose.magazineOffset=magSwap(.16,.36,.56,.73,.39);
    pose.magazineAngle=pose.magazineOffset*.32;
    pose.slideOffset=pulse(p,.80,.95)*.17;
    pose.handX=-.20+rise(p,.77,.85)*.20;
    pose.handY=-.16-pose.magazineOffset*.8+pose.slideOffset;
    pose.handZ=.12-pose.slideOffset*1.3;
    pose.tilt=.06*pulse(p,.10,.76);
  }else if(id==='iron-revolver'){
    pose.magazineVisible=false;
    pose.magazineOffset=0;pose.slideOffset=0;
    pose.cylinderOpen=rise(p,.11,.26)*(1-rise(p,.81,.94));
    const count=Math.max(1,Math.min(6,Number.isInteger(roundCount)?roundCount:6));
    pose.cylinderSpin=rise(p,.38,.79)*Math.PI*2*count/6;
    pose.ejector=pulse(p,.27,.38)*.20;
    pose.roundVisible=p>=.40&&p<.79;
    const u=clamp01((p-.40)/.39)*count;
    pose.roundIndex=Math.min(count-1,Math.floor(u));
    pose.shellProgress=u-Math.floor(u);
    pose.handX=-.27;
    pose.handY=-.16+.10*pulse(p,.39,.79);
    pose.handZ=-.08-.07*pose.cylinderOpen;
    pose.tilt=-.13*pulse(p,.11,.95);
  }else if(id==='pipe-smg'){
    pose.magazineOffset=magSwap(.12,.34,.51,.70,.46);
    pose.magazineAngle=-pose.magazineOffset*.38;
    pose.slideOffset=pulse(p,.76,.92)*.20;
    pose.handX=-.24+rise(p,.75,.82)*.25;
    pose.handY=-.22-pose.magazineOffset*.70;
    pose.handZ=.08-.30*pulse(p,.76,.92);
    pose.tilt=.11*pulse(p,.12,.76);
  }else if(id==='service-carbine'){
    pose.magazineOffset=magSwap(.17,.38,.55,.72,.34);
    pose.magazineAngle=pose.magazineOffset*.34;
    pose.boltOffset=pulse(p,.77,.91)*.15;
    pose.slideOffset=pose.boltOffset;
    pose.handX=-.17+.14*rise(p,.74,.81);
    pose.handY=-.25-pose.magazineOffset*.75+.08*pose.boltOffset;
    pose.handZ=.07-.18*pulse(p,.77,.91);
    pose.tilt=.075*pulse(p,.18,.75);
  }else if(id==='scrap-shotgun'){
    pose.magazineVisible=false;
    pose.magazineOffset=0;pose.slideOffset=0;
    pose.roundVisible=p>=.16&&p<.86;
    const count=Math.max(1,Math.min(6,Number.isInteger(roundCount)?roundCount:6));
    const rounds=clamp01((p-.16)/.70)*count;
    pose.roundIndex=Math.min(count-1,Math.floor(rounds));
    pose.shellProgress=rounds-Math.floor(rounds);
    pose.handX=-.20;
    pose.handY=-.20+.13*Math.sin(Math.PI*pose.shellProgress);
    pose.handZ=-.05-.16*pose.shellProgress;
    pose.pumpOffset=pulse(p,.86,.98)*.19;
    pose.tilt=.12*pulse(p,.12,.88);
  }else if(id==='heavy-lmg'){
    // Flip up the feed cover, swap the ammo box, lay in belt, latch it.
    pose.magazineVisible=false;
    pose.boltHandleLift=rise(p,.08,.22)*(1-rise(p,.81,.94));
    pose.magazineOffset=magSwap(.24,.43,.55,.76,.38);
    pose.boltOffset=pulse(p,.85,.97)*.17;
    pose.handX=-.27;
    pose.handY=-.18-pose.magazineOffset*.65;
    pose.handZ=-.16;
    pose.tilt=.09*pulse(p,.09,.93);
  }else if(id==='hunting-rifle'){
    pose.magazineVisible=false;
    pose.magazineOffset=0;
    pose.boltHandleLift=rise(p,.08,.18)*(1-rise(p,.84,.95));
    pose.boltOffset=.21*rise(p,.17,.29)*(1-rise(p,.81,.93));
    pose.slideOffset=pose.boltOffset;
    pose.roundVisible=p>=.30&&p<.80;
    const count=Math.max(1,Math.min(5,Number.isInteger(roundCount)?roundCount:5));
    const rounds=clamp01((p-.30)/.50)*count;
    pose.roundIndex=Math.min(count-1,Math.floor(rounds));
    pose.shellProgress=rounds-Math.floor(rounds);
    pose.handX=-.08;
    pose.handY=.02+.09*Math.sin(Math.PI*pose.shellProgress);
    pose.handZ=-.12-.12*pose.boltHandleLift;
    pose.tilt=-.08*pulse(p,.08,.95);
  }
  return pose;
}

export function slideTravel(remaining,duration=.13) {
  if(!(remaining>0))return 0;
  const p=clamp01(1-remaining/duration);
  return Math.sin(Math.PI*p)*.11;
}

export function createCasingState(origin,right,forward,random=Math.random) {
  const jitter=(random()-.5)*.5;
  return {
    x:origin.x,y:origin.y,z:origin.z,
    vx:right.x*(2.9+jitter)-forward.x*.65,
    vy:3.2+(random()-.5)*1.1,
    vz:right.z*(2.9+jitter)-forward.z*.65,
    rx:0,ry:0,rz:0,
    spin:8+(random()-.5)*7,
    age:0,settled:false
  };
}
export function stepCasing(casing,dt,groundY) {
  const delta=Math.max(0,Math.min(.05,Number.isFinite(dt)?dt:0));
  if(casing.settled||delta===0)return casing;
  casing.age+=delta;
  casing.x+=casing.vx*delta;
  casing.y+=casing.vy*delta;
  casing.z+=casing.vz*delta;
  casing.vy-=CASING_TUNING.gravity*delta;
  casing.rx+=casing.spin*delta;
  casing.ry+=casing.spin*.57*delta;
  casing.rz+=casing.spin*.8*delta;
  casing.vx*=Math.exp(-CASING_TUNING.drag*delta);
  casing.vz*=Math.exp(-CASING_TUNING.drag*delta);
  if(casing.y<=groundY+.028) {
    casing.y=groundY+.028;
    if(Math.abs(casing.vy)>.65) {
      casing.vy=Math.abs(casing.vy)*CASING_TUNING.bounce;
      casing.vx*=.6;casing.vz*=.6;
    }else{
      casing.vy=0;casing.vx=0;casing.vz=0;
      casing.settled=true;
    }
  }
  return casing;
}
