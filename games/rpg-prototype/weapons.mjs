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
  adsSpreadDegrees: .38,
  recoilDegrees: 1.25
});

export function createWeaponState(spec = SCRAP_PISTOL) {
  return { magazine: spec.magazineSize, reserve: spec.startingReserve,
    cooldown: 0, reloadRemaining: 0, aiming: false, shotsFired: 0,
    recoil: 0 };
}
// Only adjusts vertical pitch; camera Euler order MUST be YXZ in the scene.
// No fixed roll or yaw offset is ever added by firing.
export function createViewRecoilState() { return {unrecovered: 0}; }
export function kickViewRecoil(state, pitch, degrees) {
  const limit=Math.PI/2-.035;
  const maximumUnrecovered=.14; // cap rapid shots at about 8° total kick
  const requested=Math.max(0,degrees)*Math.PI/180;
  const allowed=Math.min(requested, Math.max(0,maximumUnrecovered-state.unrecovered));
  const next=Math.max(-limit,Math.min(limit,pitch-allowed));
  state.unrecovered+=pitch-next;
  return next;
}
export function recoverViewRecoil(state, pitch, dt) {
  if(state.unrecovered<=0)return pitch;
  const limit=Math.PI/2-.035;
  const step=state.unrecovered*(1-Math.exp(-11*Math.max(0,dt)));
  const next=Math.max(-limit,Math.min(limit,pitch+step));
  state.unrecovered=Math.max(0,state.unrecovered-(next-pitch));
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
  const movingPenalty = aiming ? speed * .19 : speed * .30;
  const sprintPenalty = motion.sprinting ? 1.25 : 0;
  const airbornePenalty = motion.airborne ? 2.5 : 0;
  const stanceMultiplier = motion.crouched && !motion.airborne ? .78 : 1;
  return Math.max(.12,
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
  return { status: 'fired', spreadX: Math.cos(theta) * r * spread,
    spreadY: Math.sin(theta) * r * spread,
    recoilDegrees: spec.recoilDegrees, damage: spec.damage,
    spreadDegrees, magazine: state.magazine };
}
