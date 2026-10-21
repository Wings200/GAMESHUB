// BLACKOUT V0.20.0 · hard breach opens steel separately, then gypsum; frags stay wood-only.
// Impact Grenades and C4 can destroy both wood and unreinforced soft walls.
// HP damage, target damage, reinforced steel and thrown physics are independent.
export const BARRICADE_BLASTS=Object.freeze(["FRAG","IMPACT","C4","SOFT BREACH"]);
export const SOFT_WALL_BLASTS=Object.freeze(["IMPACT","C4","SOFT BREACH","HARD BREACH"]);
export function canDamageBarricades(label){
 return BARRICADE_BLASTS.includes(label);
}
export function canDamageSoftWalls(label){
 return SOFT_WALL_BLASTS.includes(label);
}
export function resolveStructuralBlast(label,{
 woodBlast=()=>0,gypsumBlast=()=>0,reinforced=false
}={}){
 return {
  wood:canDamageBarricades(label)?woodBlast():0,
  gypsum:!reinforced&&canDamageSoftWalls(label)?gypsumBlast():0
 };
}
