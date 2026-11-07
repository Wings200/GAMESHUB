// W20.85: Radiation is persistent world exposure, not a decorative visor dial.
// All math is independent of the renderer, so it can be tested deterministically.
export const MAX_RADIATION=1000;
export const RADIATION_SOURCES=Object.freeze([
  Object.freeze({id:'east-spill',name:'Irradiated Spill',x:39,z:-29,
    radius:6.5,peakRadsPerSecond:17})
]);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

export function createRadiationState(){return {version:1,rads:0};}
export function safeRadiationSnapshot(raw){
  return {version:1,rads:clamp(Number.isFinite(raw?.rads)?raw.rads:0,
    0,MAX_RADIATION)};
}
export function radiationHealthLimit(state,baseHealth=100){
  const base=Number.isFinite(baseHealth)&&baseHealth>0?baseHealth:100;
  return Math.max(1,Math.round(base*(1-clamp(state?.rads||0,0,MAX_RADIATION)/MAX_RADIATION)));
}
export function radiationExposureAt(x,z,sources=RADIATION_SOURCES){
  if(!Number.isFinite(x)||!Number.isFinite(z))return 0;
  return sources.reduce((total,source)=>{
    const distance=Math.hypot(x-source.x,z-source.z);
    if(distance>=source.radius)return total;
    const fraction=1-distance/source.radius;
    return total+source.peakRadsPerSecond*Math.pow(fraction,.7);
  },0);
}
export function syncRadiationHealth(state,health,baseMax=100){
  const next=radiationHealthLimit(state,baseMax);
  health.maxHealth=next;
  health.health=clamp(health.health,0,next);
  health.alive=health.health>0;
  return next;
}
export function applyRadiationExposure(state,health,rate,seconds,
  {protection=0,baseMax=100}={}){
  const before=state.rads;
  const safeRate=Number.isFinite(rate)?Math.max(0,rate):0;
  const safeSeconds=Number.isFinite(seconds)?clamp(seconds,0,1):0;
  const reduction=clamp(Number.isFinite(protection)?protection:0,0,.95);
  state.rads=clamp(before+safeRate*safeSeconds*(1-reduction),0,MAX_RADIATION);
  const maximum=syncRadiationHealth(state,health,baseMax);
  return {added:state.rads-before,rads:state.rads,maxHealth:maximum};
}
export function treatRadiation(state,health,amount=300,baseMax=100){
  if(!Number.isFinite(state?.rads)||state.rads<=0)return {ok:false,reason:'no-radiation'};
  if(!Number.isFinite(amount)||amount<=0)return {ok:false,reason:'invalid-treatment'};
  const before=state.rads;
  state.rads=Math.max(0,before-amount);
  const maximum=syncRadiationHealth(state,health,baseMax);
  return {ok:true,removed:before-state.rads,rads:state.rads,maxHealth:maximum};
}
