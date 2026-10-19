// BLACKOUT V4.2 — preparation/deployment rules shared by the sandbox and future maps.
// Spawn locations are OUTSIDE bomb sites, with no attacker operator present during prep.
// Real multiplayer still requires server-authoritative spawn & damage checks.
export const ATTACK_INSERTIONS=Object.freeze({
  south:Object.freeze({x:0,z:19,yaw:0,label:"SOUTH APPROACH"}),
  west:Object.freeze({x:-15,z:17,yaw:0,label:"WEST FLANK APPROACH"}),
  east:Object.freeze({x:15,z:17,yaw:0,label:"EAST FLANK APPROACH"})
});
export const ATTACK_SQUAD_SPAWNS=Object.freeze([
  Object.freeze({x:-5,z:19,site:"A"}),
  Object.freeze({x:5,z:19,site:"B"}),
  Object.freeze({x:-15,z:16,site:"A"}),
  Object.freeze({x:15,z:16,site:"B"})
]);
export const ENEMY_ATTACK_SPAWNS=Object.freeze([
  Object.freeze({x:0,z:19,site:"A"}),
  Object.freeze({x:-7,z:20,site:"A"}),
  Object.freeze({x:7,z:20,site:"B"}),
  Object.freeze({x:-15,z:16,site:"A"}),
  Object.freeze({x:15,z:16,site:"B"})
]);
export function attackSpawnFor(id){return ATTACK_INSERTIONS[id]||ATTACK_INSERTIONS.south;}
export function canDeployAttackers(phase){return phase==="attack"||phase==="guard"||phase==="planted";}
