// BLACKOUT 2.0 P0 — isolated, deterministic round rules.
// No rendering, network code, DOM access, or timing side effects belong here.
export const DURATIONS = Object.freeze({
  selection: 30,
  preparation: 45,
  action: 180,
  postplant: 45,
  plant: 7,
  defuse: 7,
  reinforce: 3
});

export const SITES = Object.freeze([
  { id: 'A', label: 'STORAGE', x: -8, z: -6, radius: 4.1 },
  { id: 'B', label: 'SERVER', x: 8, z: -6, radius: 4.1 }
]);

export function formatTime(seconds) {
  const n = Math.max(0, Math.ceil(seconds));
  return Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
}

export function newMatch(side = 'attack', mode = 'ai') {
  if (!['attack', 'defense'].includes(side)) throw new Error('Invalid team');
  return { side, mode, phase: 'selection', remaining: DURATIONS.selection,
    overtimePlant: false, planted: false, plantedSite: null, winner: null, reason: '' };
}

export function nearestSite(x, z) {
  return SITES.find(site => Math.hypot(x - site.x, z - site.z) <= site.radius) || null;
}

export function advanceClock(current, delta, planting = false) {
  if (!Number.isFinite(delta) || delta < 0) throw new Error('Invalid time step');
  const next = { ...current };
  if (next.phase === 'result') return next;
  next.remaining = Math.max(0, next.remaining - delta);
  if (next.remaining > 0) return next;
  if (next.phase === 'selection') {
    next.phase = 'preparation'; next.remaining = DURATIONS.preparation;
  } else if (next.phase === 'preparation') {
    next.phase = 'action'; next.remaining = DURATIONS.action;
  } else if (next.phase === 'action') {
    if (planting && next.side === 'attack') {
      next.overtimePlant = true;
    } else {
      next.phase = 'result'; next.winner = 'defense'; next.reason = 'TIME EXPIRED';
    }
  } else if (next.phase === 'postplant') {
    next.phase = 'result'; next.winner = 'attack'; next.reason = 'DEFUSER DETONATED';
  }
  return next;
}

export function completePlant(current, siteId) {
  if (current.side !== 'attack' || current.phase !== 'action') return current;
  if (!SITES.some(site => site.id === siteId)) return current;
  return { ...current, phase: 'postplant', remaining: DURATIONS.postplant,
    planted: true, plantedSite: siteId, overtimePlant: false };
}

export function cancelPlant(current) {
  if (!current.overtimePlant || current.phase !== 'action') return current;
  return { ...current, phase: 'result', winner: 'defense', reason: 'PLANT INTERRUPTED', overtimePlant: false };
}

export function completeDefuse(current) {
  if (current.side !== 'defense' || current.phase !== 'postplant') return current;
  return { ...current, phase: 'result', winner: 'defense', reason: 'DEFUSER DISABLED' };
}

export function eliminationResult(current, eliminatedTeam) {
  if (current.phase === 'result') return current;
  if (eliminatedTeam === 'attack' && !current.planted) {
    return { ...current, phase: 'result', winner: 'defense', reason: 'ATTACKERS ELIMINATED' };
  }
  if (eliminatedTeam === 'defense') {
    return { ...current, phase: 'result', winner: 'attack', reason: 'DEFENDERS ELIMINATED' };
  }
  // Attackers eliminated AFTER planting does not end the round.
  return current;
}

export function operatorFallback(previous, available, rng = Math.random) {
  if (!Array.isArray(available) || available.length === 0) return null;
  if (available.includes(previous)) return previous;
  return available[Math.min(available.length - 1, Math.floor(rng() * available.length))];
}
