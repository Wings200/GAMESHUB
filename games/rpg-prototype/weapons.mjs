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
export const ARSENAL=Object.freeze([
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
    cooldown: 0, reloadRemaining: 0, aiming: false, shotsFired: 0,
    recoil: 0 };
}
// Three.js YXZ camera pitch is POSITIVE when looking up. Gun recoil
// must therefore ADD pitch; subtracting it shoved the player's aim down.
// No fixed roll or yaw offset is ever added by firing.
export function createViewRecoilState() { return {unrecovered: 0}; }
export function kickViewRecoil(state, pitch, degrees) {
  const limit=Math.PI/2-.035;
  const maximumUnrecovered=.14; // cap rapid shots at about 8° total kick
  const requested=Math.max(0,degrees)*Math.PI/180;
  const allowed=Math.min(requested, Math.max(0,maximumUnrecovered-state.unrecovered));
  const next=Math.max(-limit,Math.min(limit,pitch+allowed));
  state.unrecovered+=next-pitch;
  return next;
}
export function recoverViewRecoil(state, pitch, dt) {
  if(state.unrecovered<=0)return pitch;
  const limit=Math.PI/2-.035;
  const step=state.unrecovered*(1-Math.exp(-11*Math.max(0,dt)));
  const next=Math.max(-limit,Math.min(limit,pitch-step));
  state.unrecovered=Math.max(0,state.unrecovered-(pitch-next));
  if(state.unrecovered<1e-6)state.unrecovered=0;
  return next;
}

export function setWeaponAim(state, aiming) {
  state.aiming = !!aiming;
}
export function startWeaponReload(state, spec = SCRAP_PISTOL) {
  if (state.reloadRemaining > 0 || state.magazine >= spec.magazineSize ||
      state.reserve <= 0) return false;
  state.reloadRemaining = spec.reloadSeconds;
  return true;
}
export function updateWeapon(state, dt, spec = SCRAP_PISTOL) {
  const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
  state.cooldown = Math.max(0, state.cooldown - step);
  if (state.reloadRemaining > 0) {
    state.reloadRemaining = Math.max(0, state.reloadRemaining - step);
    if (state.reloadRemaining === 0) {
      const needed = spec.magazineSize - state.magazine;
      const loaded = Math.min(Math.max(0, needed), state.reserve);
      state.magazine += loaded;
      state.reserve -= loaded;
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
  if (state.reloadRemaining > 0) return { status: 'reloading' };
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
