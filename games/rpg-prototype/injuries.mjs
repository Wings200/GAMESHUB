// W20.89: Per-limb trauma drives real movement, aiming and stamina penalties.
// No DOM or renderer dependencies; legacy saves with no injuries start healthy.
export const PLAYER_LIMBS=Object.freeze([
  'head','chest','leftArm','rightArm','leftLeg','rightLeg'
]);
export const LIMB_LABELS=Object.freeze({
  head:'HEAD',chest:'TORSO',leftArm:'LEFT ARM',rightArm:'RIGHT ARM',
  leftLeg:'LEFT LEG',rightLeg:'RIGHT LEG'
});
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function createInjuryState(){
  return {version:1,condition:Object.fromEntries(PLAYER_LIMBS.map(slot=>[slot,100]))};
}
export function safeInjurySnapshot(raw){
  const clean=createInjuryState();
  for(const slot of PLAYER_LIMBS){
    const value=raw?.condition?.[slot];
    if(Number.isFinite(value))clean.condition[slot]=clamp(value,0,100);
  }
  return clean;
}
export function damagePlayerLimb(state,slot,actualHpDamage){
  if(!PLAYER_LIMBS.includes(slot)||!Number.isFinite(actualHpDamage)||actualHpDamage<=0)
    return {applied:false,crippled:false,condition:state?.condition?.[slot]??100};
  const before=clamp(state.condition[slot],0,100);
  const after=clamp(before-actualHpDamage*2.25,0,100);
  state.condition[slot]=after;
  return {applied:after<before,condition:after,crippled:after<=25,
    newlyCrippled:before>25&&after<=25};
}
export function hasPlayerInjury(state){
  return PLAYER_LIMBS.some(slot=>(state?.condition?.[slot]??100)<99.9);
}
export function healWorstLimb(state,amount=65){
  if(!Number.isFinite(amount)||amount<=0)return {ok:false,reason:'invalid'};
  const slot=PLAYER_LIMBS.reduce((worst,next)=>
    state.condition[next]<state.condition[worst]?next:worst,PLAYER_LIMBS[0]);
  const before=state.condition[slot];
  if(before>=99.9)return {ok:false,reason:'healthy'};
  state.condition[slot]=clamp(before+amount,0,100);
  return {ok:true,slot,restored:state.condition[slot]-before};
}
export function resetInjuries(state){
  for(const slot of PLAYER_LIMBS)state.condition[slot]=100;
  return state;
}
export function injuryEffects(state){
  const condition=slot=>clamp(state?.condition?.[slot]??100,0,100);
  const impaired=slot=>condition(slot)<=25 ? 1 : condition(slot)<=50 ? .45 : 0;
  const weakLegs=impaired('leftLeg')+impaired('rightLeg');
  const weakArms=impaired('leftArm')+impaired('rightArm');
  const weakHead=impaired('head');
  return {
    speedMultiplier:clamp(1-.26*weakLegs,.48,1),
    aimSpreadMultiplier:1+.36*weakArms+.28*weakHead,
    recoilMultiplier:1+.20*weakArms,
    staminaDrainMultiplier:1+.4*impaired('chest'),
    canSprint:weakLegs<2,
    crippled:PLAYER_LIMBS.filter(slot=>condition(slot)<=25)
  };
}
export function injuryStatus(state){
  const damaged=PLAYER_LIMBS.filter(slot=>(state?.condition?.[slot]??100)<99.9)
    .sort((a,b)=>state.condition[a]-state.condition[b]);
  if(!damaged.length)return 'NO LIMB INJURIES';
  return damaged.slice(0,3).map(slot=>
    LIMB_LABELS[slot]+' '+Math.round(state.condition[slot])+'%'+
    (state.condition[slot]<=25?' · CRIPPLED':'' )).join(' / ');
}
