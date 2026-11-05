// W20.26: laser-musket charging independent of detachable-mag reloads.
// A real crank burns exactly one fusion cell, then locks that charge in the
// capacitor. Pulling the trigger releases every stored charge in one beam.
import {shotSpreadDegrees} from './weapons.mjs';
export const LASER_MUSKET_TUNING=({
  maxCharges:6,crankSeconds:.68,beamSeconds:.66,beamHoldSeconds:.13,damagePerExtraCharge:.40
});
export function ensureLaserState(state){
  if(!Number.isInteger(state.laserCharge))state.laserCharge=0;
  if(!Number.isFinite(state.crankRemaining))state.crankRemaining=0;
  if(!Number.isFinite(state.crankDuration))state.crankDuration=0;
  if(!Number.isInteger(state.crankPending))state.crankPending=0;
  if(typeof state.crankWasInfinite!=='boolean')state.crankWasInfinite=false;
  return state;
}
export function startLaserCrank(state,{infiniteAmmo=false}={}){
  ensureLaserState(state);
  if(state.reloadRemaining>0)return {status:'reloading'};
  if(state.crankRemaining>0)return {status:'cranking'};
  if(state.laserCharge>=LASER_MUSKET_TUNING.maxCharges)return {status:'fully-charged'};
  if(!infiniteAmmo&&state.magazine<1)return {status:'no-cells'};
  if(!infiniteAmmo)state.magazine--;
  state.crankPending=1;state.crankWasInfinite=!!infiniteAmmo;
  state.crankDuration=LASER_MUSKET_TUNING.crankSeconds;
  state.crankRemaining=state.crankDuration;
  return {status:'started',level:state.laserCharge+1};
}
export function cancelLaserCrank(state,{refund=true}={}){
  ensureLaserState(state);
  const active=state.crankRemaining>0;
  if(active&&refund&&state.crankPending&&!state.crankWasInfinite)state.magazine++;
  state.crankRemaining=0;state.crankDuration=0;state.crankPending=0;
  state.crankWasInfinite=false;
  return active;
}
export function updateLaserCrank(state,dt){
  ensureLaserState(state);
  if(state.crankRemaining<=0)return {completed:false,charge:state.laserCharge};
  const step=Math.max(0,Number.isFinite(dt)?dt:0);
  state.crankRemaining=Math.max(0,state.crankRemaining-step);
  if(state.crankRemaining>0)return {completed:false,charge:state.laserCharge};
  state.laserCharge=Math.min(LASER_MUSKET_TUNING.maxCharges,
    state.laserCharge+state.crankPending);
  state.crankRemaining=0;state.crankDuration=0;state.crankPending=0;
  state.crankWasInfinite=false;
  return {completed:true,charge:state.laserCharge};
}
export function laserCrankProgress(state){
  ensureLaserState(state);
  return state.crankRemaining>0?
    Math.max(0,Math.min(1,1-state.crankRemaining/state.crankDuration)):0;
}
export function fireChargedLaser(state,spec,random=Math.random,motion={}){
  ensureLaserState(state);
  if(state.reloadRemaining>0)return {status:'reloading'};
  if(state.crankRemaining>0)return {status:'cranking'};
  if(state.cooldown>1e-7)return {status:'cooldown'};
  if(state.laserCharge===0)return {status:'uncharged'};
  const chargeLevel=state.laserCharge;
  state.laserCharge=0;
  state.shotsFired++;
  state.cooldown=spec.fireInterval;
  state.recoil=Math.min(1.5,state.recoil+.7);
  const spreadDegrees=shotSpreadDegrees(spec,state.aiming,motion);
  const radius=Math.sqrt(Math.max(0,Math.min(1,random())));
  const theta=random()*Math.PI*2;
  const spread=Math.tan(spreadDegrees*Math.PI/180);
  const scatter={spreadX:Math.cos(theta)*radius*spread,
    spreadY:Math.sin(theta)*radius*spread};
  return {status:'fired',chargeLevel,
    damage:Math.round(spec.damage*(1+LASER_MUSKET_TUNING.damagePerExtraCharge*(chargeLevel-1))),
    recoilDegrees:spec.recoilDegrees+chargeLevel*.25,
    spreadDegrees,spreadX:scatter.spreadX,spreadY:scatter.spreadY,
    directions:[scatter],magazine:state.magazine};
}
