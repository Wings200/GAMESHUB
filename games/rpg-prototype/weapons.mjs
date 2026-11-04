// Shared RPG weapon mechanics. Rendering and target geometry live in scenes,
// but aiming spread, ammo, reload, and fire cadence do not.
export const SCRAP_PISTOL = Object.freeze({
  id: 'scrap-pistol',
  name: 'Worn Scrap Pistol',
  magazineSize: 12,
  startingReserve: 48,
  fireInterval: .24,
  reloadSeconds: 1.65,
  damage: 20,
  hipSpreadDegrees: 2.65,
  adsSpreadDegrees: .12,
  recoilDegrees: 1.25
});

// W05.0 arsenal: authored, genuinely different test weapons. The original
// Worn Scrap Pistol is preserved unchanged as the default for regression tests.
export const TEN_MM_PISTOL=Object.freeze({
  id:'10mm-pistol',name:'10mm Pistol',kind:'pistol',
  magazineSize:12,startingReserve:72,fireInterval:.26,reloadSeconds:2.05,
  damage:29,hipSpreadDegrees:2.45,adsSpreadDegrees:.14,
  recoilDegrees:1.85,pellets:1,automatic:false
});
// New weapons come first. Six old definitions are retained for legacy tests,
// but cannot be equipped in the active weapon-rebuild runtime.
export const PIPE_PISTOL=Object.freeze({
  id:'pipe-pistol',name:'Pipe Pistol',kind:'pistol',
  magazineSize:8,startingReserve:64,fireInterval:.33,reloadSeconds:2.35,
  damage:17,hipSpreadDegrees:3.35,adsSpreadDegrees:.24,
  recoilDegrees:2.35,pellets:1,automatic:false
});
export const PIPE_RIFLE=Object.freeze({
  id:'pipe-rifle',name:'Pipe Rifle',kind:'carbine',
  magazineSize:15,startingReserve:90,fireInterval:.44,reloadSeconds:2.65,
  damage:34,hipSpreadDegrees:3.15,adsSpreadDegrees:.13,
  recoilDegrees:2.85,pellets:1,automatic:false
});
export const LASER_MUSKET=Object.freeze({
  id:'laser-musket',name:'Laser Musket',kind:'carbine',
  magazineSize:6,startingReserve:84,fireInterval:.85,reloadSeconds:2.70,
  damage:32,hipSpreadDegrees:3.25,adsSpreadDegrees:.12,
  recoilDegrees:2.9,pellets:1,automatic:false
});
export const DOUBLE_BARREL_SHOTGUN=Object.freeze({
  id:'double-barrel-shotgun',name:'Double-Barrel Shotgun',kind:'shotgun',
  magazineSize:2,startingReserve:48,fireInterval:.62,reloadSeconds:2.65,
  damage:10,hipSpreadDegrees:8.0,adsSpreadDegrees:4.8,
  recoilDegrees:4.7,pellets:8,automatic:false
});
export const PUMP_ACTION_SHOTGUN=Object.freeze({
  id:'pump-action-shotgun',name:'Pump-Action Shotgun',kind:'shotgun',
  magazineSize:6,startingReserve:72,fireInterval:.94,reloadSeconds:4.24,
  damage:9,hipSpreadDegrees:7.2,adsSpreadDegrees:4.1,
  recoilDegrees:4.9,pellets:8,automatic:false
});
export const BOLT_HUNTING_RIFLE=Object.freeze({
  id:'bolt-hunting-rifle',name:'Hunting Rifle',kind:'rifle',
  magazineSize:5,startingReserve:50,fireInterval:1.25,reloadSeconds:3.43,
  damage:55,hipSpreadDegrees:4.0,adsSpreadDegrees:.042,
  recoilDegrees:4.5,pellets:1,automatic:false
});
export const ARSENAL=Object.freeze([
  TEN_MM_PISTOL,
  PIPE_PISTOL,
  PIPE_RIFLE,
  LASER_MUSKET,
  DOUBLE_BARREL_SHOTGUN,
  PUMP_ACTION_SHOTGUN,
  BOLT_HUNTING_RIFLE,
  SCRAP_PISTOL,
  Object.freeze({id:'iron-revolver',name:'Iron Six-Shooter',kind:'revolver',
    magazineSize:6,startingReserve:42,fireInterval:.44,reloadSeconds:2.6,
    damage:38,hipSpreadDegrees:2.2,adsSpreadDegrees:.16,recoilDegrees:3.5,
    pellets:1,automatic:false}),
  Object.freeze({id:'pipe-smg',name:'Pipe SMG',kind:'smg',
    magazineSize:30,startingReserve:150,fireInterval:.095,reloadSeconds:2.1,
    damage:11,hipSpreadDegrees:4.5,adsSpreadDegrees:.34,recoilDegrees:.64,
    pellets:1,automatic:true}),
  Object.freeze({id:'service-carbine',name:'Service Carbine',kind:'carbine',
    magazineSize:24,startingReserve:120,fireInterval:.17,reloadSeconds:2.45,
    damage:19,hipSpreadDegrees:3.0,adsSpreadDegrees:.10,recoilDegrees:1.45,
    pellets:1,automatic:true}),
  Object.freeze({id:'scrap-shotgun',name:'Scrap Pump Shotgun',kind:'shotgun',
    magazineSize:6,startingReserve:36,fireInterval:.92,reloadSeconds:2.7,
    damage:8,hipSpreadDegrees:7.4,adsSpreadDegrees:4.0,recoilDegrees:5.2,
    pellets:8,automatic:false}),
  Object.freeze({id:'hunting-rifle',name:'Wasteland Hunting Rifle',kind:'rifle',
    magazineSize:5,startingReserve:35,fireInterval:1.1,reloadSeconds:2.85,
    damage:54,hipSpreadDegrees:3.7,adsSpreadDegrees:.035,recoilDegrees:4.1,
    pellets:1,automatic:false})
]);
export const ARSENAL_IDS=Object.freeze(ARSENAL.map(w=>w.id));
export function getWeaponSpec(id){
  const weapon=ARSENAL.find(w=>w.id===id);
  if(!weapon)throw Error('Unknown weapon: '+id);
  return weapon;
}
export function createArsenalStates(){
  return Object.fromEntries(ARSENAL.map(w=>[w.id,createWeaponState(w)]));
}

export function createWeaponState(spec = SCRAP_PISTOL) {
  return { magazine: spec.magazineSize, reserve: spec.startingReserve,
    cooldown: 0, reloadRemaining: 0, reloadDuration: 0,
    reloadRounds: 0, reloadLoaded: 0,
    aiming: false, shotsFired: 0, recoil: 0 };
}
// Three.js YXZ camera pitch is POSITIVE when looking up. Gun recoil
// must therefore ADD pitch; subtracting it shoved the player's aim down.
// No fixed roll or yaw offset is ever added by firing.
export function createViewRecoilState() { return {unrecovered: 0}; }
export function kickViewRecoil(state, pitch, degrees) {
  const limit=Math.PI/2-.035;
  const maximumUnrecovered=.085; // limit view climb to ~5° during a burst
  const requested=Math.max(0,degrees)*Math.PI/180*.65;
  const allowed=Math.min(requested, Math.max(0,maximumUnrecovered-state.unrecovered));
  const next=Math.max(-limit,Math.min(limit,pitch+allowed));
  state.unrecovered+=next-pitch;
  return next;
}
export function recoverViewRecoil(state, pitch, dt) {
  if(state.unrecovered<=0)return pitch;
  const limit=Math.PI/2-.035;
  const step=state.unrecovered*(1-Math.exp(-15*Math.max(0,dt)));
  const next=Math.max(-limit,Math.min(limit,pitch-step));
  state.unrecovered=Math.max(0,state.unrecovered-(pitch-next));
  if(state.unrecovered<1e-6)state.unrecovered=0;
  return next;
}

export function setWeaponAim(state, aiming) {
  state.aiming = !!aiming;
}
const individualReload=spec=>['revolver','shotgun','rifle'].includes(spec.kind);
export function cancelWeaponReload(state){
  const wasReloading=state.reloadRemaining>0;
  // Rounds already seated in a cylinder, tube or chamber stay usable.
  state.reloadRemaining=0;state.reloadDuration=0;
  state.reloadRounds=0;state.reloadLoaded=0;
  return wasReloading;
}
export function startWeaponReload(state, spec = SCRAP_PISTOL) {
  if (state.reloadRemaining > 0 || state.magazine >= spec.magazineSize ||
      state.reserve <= 0) return false;
  const missing=Math.min(spec.magazineSize-state.magazine,state.reserve);
  const perRound=individualReload(spec);
  state.reloadRounds=perRound?missing:0;
  state.reloadLoaded=0;
  // A one-shell top-up is faster than filling an empty tube or cylinder.
  const timing={revolver:[.74,.31],shotgun:[.64,.34],rifle:[.80,.41]}[spec.kind];
  state.reloadDuration=spec.id==='double-barrel-shotgun'?
    (missing===1?1.95:2.65):
    spec.id==='pump-action-shotgun'?(.94+.55*missing):
    spec.id==='bolt-hunting-rifle'?(1.03+.48*missing):
    perRound&&timing?Math.min(spec.reloadSeconds,timing[0]+timing[1]*missing):
    spec.reloadSeconds;
  state.reloadRemaining=state.reloadDuration;
  return true;
}
export function updateWeapon(state, dt, spec = SCRAP_PISTOL, options = {}) {
  const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
  state.cooldown = Math.max(0, state.cooldown - step);
  if (state.reloadRemaining > 0) {
    const reloadRate = Number.isFinite(options.reloadSpeedMultiplier) ?
      Math.max(.85, Math.min(1.6, options.reloadSpeedMultiplier)) : 1;
    state.reloadRemaining = Math.max(0, state.reloadRemaining - step * reloadRate);
    if(state.reloadRounds>0){
      const duration=Math.max(.001,state.reloadDuration||spec.reloadSeconds);
      const progress=Math.max(0,Math.min(1,1-state.reloadRemaining/duration));
      // Match the physical insertion window of each animated action: first
      // open the cylinder/bolt or reach the tube; only then seat live rounds.
      const interval=spec.id==='double-barrel-shotgun'?[.42,.79]:
        spec.id==='pump-action-shotgun'?[.23,.85]:
        spec.id==='bolt-hunting-rifle'?[.35,.79]:
        ({revolver:[.40,.79],shotgun:[.16,.86],rifle:[.30,.80]}[spec.kind]||[0,1]);
      const inserted=Math.max(0,Math.min(1,
        (progress-interval[0])/(interval[1]-interval[0])));
      const due=Math.min(state.reloadRounds,
        Math.floor(inserted*state.reloadRounds+1e-7));
      const add=Math.min(Math.max(0,due-state.reloadLoaded),
        state.reserve,Math.max(0,spec.magazineSize-state.magazine));
      if(add>0){
        state.magazine+=add;state.reserve-=add;state.reloadLoaded+=add;
      }
    }else if(state.reloadRemaining===0){
      // Detachable magazines remain an atomic swap at the end of the action.
      const needed = spec.magazineSize - state.magazine;
      const loaded = Math.min(Math.max(0, needed), state.reserve);
      state.magazine += loaded;
      state.reserve -= loaded;
    }
    if(state.reloadRemaining===0){
      state.reloadDuration=0;state.reloadRounds=0;state.reloadLoaded=0;
    }
  }
  state.recoil *= Math.exp(-10 * step);
}
// Advanced handling factors movement into shot spread, without changing the
// approved stationary hipfire/ADS precision or ammo economy.
export function shotSpreadDegrees(spec = SCRAP_PISTOL, aiming = false, motion = {}) {
  const speed = Math.min(8, Math.max(0, Number.isFinite(motion.speed) ? motion.speed : 0));
  // The first shot while ADS and planted must travel through the exact
  // center of the visual sight. Moving, jumping and hipfire still disperse.
  const stableADS=aiming&&speed<.65&&!motion.sprinting&&!motion.airborne;
  if(stableADS&&(spec.pellets||1)===1)return 0;
  const movingPenalty = aiming ? speed * .065 : speed * .30;
  const sprintPenalty = motion.sprinting ? 1.25 : 0;
  const airbornePenalty = motion.airborne ? 2.5 : 0;
  const stanceMultiplier = motion.crouched && !motion.airborne ? .78 : 1;
  return Math.max(.025,
    ((aiming ? spec.adsSpreadDegrees : spec.hipSpreadDegrees) +
      movingPenalty + sprintPenalty + airbornePenalty) * stanceMultiplier);
}

export function fireWeapon(state, spec = SCRAP_PISTOL, random = Math.random, motion = {}) {
  if(state.reloadRemaining>0){
    if(state.reloadRounds>0&&state.magazine>0)cancelWeaponReload(state);
    else return {status:'reloading'};
  }
  if (state.cooldown > 1e-7) return { status: 'cooldown' };
  if (state.magazine <= 0) return { status: 'empty' };

  state.magazine -= 1;
  state.cooldown = spec.fireInterval;
  state.shotsFired += 1;
  state.recoil = Math.min(1.5, state.recoil + .7);
  // Uniform shot distribution over a cone projected onto the sight plane.
  const r = Math.sqrt(Math.max(0, Math.min(1, random())));
  const theta = random() * Math.PI * 2;
  const spreadDegrees=shotSpreadDegrees(spec,state.aiming,motion);
  const spread = Math.tan(spreadDegrees * Math.PI / 180);
  // A carefully aimed shotgun has one center pellet; its seven remaining
  // pellets preserve their characteristic scatter and damage distribution.
  const centerPellet=state.aiming&&
    (Number.isFinite(motion.speed)?motion.speed:0)<.65&&
    !motion.sprinting&&!motion.airborne;
  const directions=[{spreadX:centerPellet?0:Math.cos(theta)*r*spread,
    spreadY:centerPellet?0:Math.sin(theta)*r*spread}];
  // One shell consumes one round; each pellet independently samples spread.
  for(let i=1;i<(spec.pellets||1);i++){
    const radius=Math.sqrt(Math.max(0,Math.min(1,random())));
    const angle=random()*Math.PI*2;
    directions.push({spreadX:Math.cos(angle)*radius*spread,
      spreadY:Math.sin(angle)*radius*spread});
  }
  return { status: 'fired', spreadX: directions[0].spreadX,
    spreadY: directions[0].spreadY, directions,
    recoilDegrees: spec.recoilDegrees, damage: spec.damage,
    spreadDegrees, magazine: state.magazine };
}
