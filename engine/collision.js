// GAMESHUB Engine — collision primitives shared by prototype games.
// XZ capsule approximation: move a circle through static axis-aligned footprints.
// Small substeps prevent tunneling through thin railings at sprint speed.
export const PLAYER_RADIUS = 0.34;
export function intersectsFootprint(x, z, radius, obstacle) {
  const px = Math.max(obstacle.minX, Math.min(x, obstacle.maxX));
  const pz = Math.max(obstacle.minZ, Math.min(z, obstacle.maxZ));
  const dx = x - px, dz = z - pz;
  return dx * dx + dz * dz < radius * radius - 1e-10;
}
export function resolveXZ(position, delta, obstacles = [], bounds = null, radius = PLAYER_RADIUS, maxStep = 0.12) {
  if (![position?.x, position?.z, delta?.x, delta?.z, radius, maxStep].every(Number.isFinite) || radius <= 0 || maxStep <= 0) throw new TypeError('Invalid collision movement');
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.z) / maxStep));
  const stepX = delta.x / steps, stepZ = delta.z / steps;
  let x = position.x, z = position.z, blockedX = false, blockedZ = false;
  const canStand = (px,pz) => !obstacles.some(o => intersectsFootprint(px,pz,radius,o));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  for (let i = 0; i < steps; i++) {
    const nextX = bounds ? clamp(x + stepX, bounds.minX, bounds.maxX) : x + stepX;
    if (canStand(nextX,z)) { if (nextX !== x+stepX) blockedX = true; x = nextX; }
    else blockedX = true;
    const nextZ = bounds ? clamp(z + stepZ, bounds.minZ, bounds.maxZ) : z + stepZ;
    if (canStand(x,nextZ)) { if (nextZ !== z+stepZ) blockedZ = true; z = nextZ; }
    else blockedZ = true;
  }
  return {x,z,blockedX,blockedZ};
}