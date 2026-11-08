// Frame-rate-independent animation helpers. No timer tied to the display rate.
export function approach(current, target, sharpness, dt) {
  if (![current,target,sharpness,dt].every(Number.isFinite)) throw new TypeError('Invalid motion parameters');
  return current + (target-current)*(1-Math.exp(-Math.max(0,sharpness)*Math.max(0,dt)));
}
export function hingedOpen(progress, targetOpen, dt, speed=4) {
  return approach(progress, targetOpen ? 1 : 0, speed, dt);
}
export function stepPhase(phase, speed, dt) {
  if (![phase,speed,dt].every(Number.isFinite)) throw new TypeError('Invalid animation parameters');
  return ((phase + speed*Math.max(0,dt)) % (2*Math.PI)+2*Math.PI)%(2*Math.PI);
}