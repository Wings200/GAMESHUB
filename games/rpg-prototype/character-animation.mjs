// W15.0: deterministic pose blending for procedural humanoids.
// Shared by survivors and NPCs; cosmetic only, never changes hitboxes.
const clamp=(n,low,high)=>Math.max(low,Math.min(high,n));
const toward=(current,target,rate,dt)=>current+(target-current)*(1-Math.exp(-rate*dt));
export function createCharacterAnimation(){
  return {phase:0,move:0,sprint:0,crouch:0,aim:0,death:0,
    jump:0,land:0,brace:0,reload:0,reloadClock:0,recoil:0,hit:0,
    wasAirborne:false,stride:0,bob:0,pose:'idle'};
}
export function stepCharacterAnimation(state,dt,action={}){
  const t=clamp(Number.isFinite(dt)?dt:0,0,.05);
  const speed=clamp(Number.isFinite(action.speed)?action.speed:0,0,12);
  const alive=action.alive!==false;
  const moving=alive&&speed>.11;
  state.move=toward(state.move,moving?clamp(speed/4.4,0,1):0,11,t);
  state.sprint=toward(state.sprint,moving&&action.sprinting?1:0,9,t);
  state.crouch=toward(state.crouch,action.crouched?1:0,12,t);
  state.aim=toward(state.aim,action.aiming&&alive?1:0,15,t);
  state.brace=toward(state.brace,action.bracing&&alive?1:0,14,t);
  state.death=toward(state.death,alive?0:1,7,t);
  const airborne=!!action.airborne&&alive;
  if(state.wasAirborne&&!airborne)state.land=1;
  state.wasAirborne=airborne;
  state.jump=toward(state.jump,airborne?1:0,11,t);
  state.land=Math.max(0,state.land-t*3.9);
  state.phase+=t*(4.3+Math.min(speed,7)*1.1)*state.move;
  state.stride=Math.sin(state.phase)*(.43+.34*state.sprint)*state.move;
  state.bob=Math.abs(Math.sin(state.phase))*.024*state.move*
    (1-.55*state.crouch)-.085*state.land;
  const reloading=!!action.reloading&&alive;
  if(reloading){
    state.reloadClock+=t;
    state.reload=toward(state.reload,1,16,t);
  }else{
    state.reloadClock=0;
    state.reload=toward(state.reload,0,17,t);
  }
  state.recoil=Math.max(state.recoil*Math.exp(-17*t),
    clamp(Number.isFinite(action.recoil)?action.recoil:0,0,1));
  state.hit=Math.max(state.hit*Math.exp(-12*t),
    clamp(Number.isFinite(action.hit)?action.hit:0,0,1));
  state.pose=!alive?'down':airborne?'jump':reloading?'reload':
    action.aiming?'aim':action.crouched?'crouch':
    !moving?'idle':action.sprinting?'sprint':'walk';
  return state;
}
