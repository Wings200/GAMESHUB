// BLACKOUT V0.4 · isolated, deterministic weapon prototype.
// Gameplay state is independent of WebGL so firing/reload can be regression tested.
export const WEAPON_SPEC=Object.freeze({
 name:"BX-7 TEST CARBINE",magazine:30,reserve:90,
 fireInterval:.105,reloadSeconds:1.85
});
export function newWeaponState(){
 return {ammo:WEAPON_SPEC.magazine,reserve:WEAPON_SPEC.reserve,
   cooldown:0,reloading:0,aiming:false,recoil:0,shotsFired:0};
}
export function stepWeapon(previous,input={},dt=1/60){
 const state={...previous},events={shots:0,reloadStarted:false,reloadFinished:false};
 const elapsed=Math.min(.05,Math.max(0,Number.isFinite(dt)?dt:0));
 state.aiming=Boolean(input.ads);
 state.recoil=Math.max(0,state.recoil-elapsed*3.1);
 const reloadingAtStart=state.reloading>0;
 if(reloadingAtStart){
  state.reloading=Math.max(0,state.reloading-elapsed);
  if(state.reloading===0){
   const count=Math.min(WEAPON_SPEC.magazine-state.ammo,state.reserve);
   state.ammo+=count;state.reserve-=count;events.reloadFinished=true;
  }
 }
 if(input.reload&&!reloadingAtStart&&state.reloading===0&&
    state.ammo<WEAPON_SPEC.magazine&&state.reserve>0){
  state.reloading=WEAPON_SPEC.reloadSeconds;events.reloadStarted=true;
 }
 state.cooldown=Math.max(-WEAPON_SPEC.fireInterval,state.cooldown-elapsed);
 if(input.fire&&state.reloading===0&&state.ammo>0){
  while(state.cooldown<=0&&state.ammo>0&&events.shots<3){
   state.ammo--;
   state.shotsFired++;
   events.shots++;
   state.recoil=Math.min(.25,state.recoil+.085);
   state.cooldown+=WEAPON_SPEC.fireInterval;
  }
 }else if(!input.fire){
  state.cooldown=Math.max(0,state.cooldown);
 }
 return {state,events};
}
