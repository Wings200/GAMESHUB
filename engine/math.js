export function clampDelta(seconds) {
  return Number.isFinite(seconds) ? Math.min(Math.max(seconds, 0), 0.05) : 0;
}

export function moveVector(keys, yaw) {
  const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
  if (!forward && !strafe) return {x: 0, z: 0};
  const length = Math.hypot(forward, strafe) || 1;
  return {
    x: (-Math.sin(yaw) * forward + Math.cos(yaw) * strafe) / length,
    z: (-Math.cos(yaw) * forward - Math.sin(yaw) * strafe) / length
  };
}
