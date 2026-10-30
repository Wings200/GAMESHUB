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
export function fireWeapon(state, spec = SCRAP_PISTOL, random = Math.random) {
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
  const spread = Math.tan((state.aiming ? spec.adsSpreadDegrees : spec.hipSpreadDegrees)
    * Math.PI / 180);
  return { status: 'fired', spreadX: Math.cos(theta) * r * spread,
    spreadY: Math.sin(theta) * r * spread,
    recoilDegrees: spec.recoilDegrees, damage: spec.damage,
    magazine: state.magazine };
}
