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
