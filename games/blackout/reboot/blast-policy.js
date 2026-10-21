// BLACKOUT V0.18.2 · separate frag combat damage from breaching charges.
// Frag grenades still harm players/targets, but must never damage walls/boards.
// Defender Impact Grenades and C4 remain able to breach destructible surfaces.
export const STRUCTURAL_BLASTS=Object.freeze(["IMPACT","C4"]);
export function canDamageStructures(label){
 return STRUCTURAL_BLASTS.includes(label);
}
export function resolveStructuralBlast(label,{
 woodBlast=()=>0,gypsumBlast=()=>0,reinforced=false
}={}){
 if(!canDamageStructures(label))return {wood:0,gypsum:0};
 return {
  wood:woodBlast(),
  gypsum:reinforced?0:gypsumBlast()
 };
}
