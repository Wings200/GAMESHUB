// W03: renderer-independent damage and armor rules for the RPG.
// Targets in the lab are deliberately inert; no combat AI is implied here.
export const HIT_ZONES=Object.freeze({
  head:2.5, torso:1, limb:.7
});
export const ARMOR_TYPES=Object.freeze({
  none:Object.freeze({label:'Unarmored',durability:0,torsoReduction:0,headReduction:0}),
  light:Object.freeze({label:'Light Vest',durability:60,torsoReduction:.30,headReduction:0}),
  heavy:Object.freeze({label:'Heavy Armor',durability:120,torsoReduction:.55,headReduction:.40})
});
export const DUMMY_HEALTH=100;

export function createDummy(armorType='none',maximumHealth=DUMMY_HEALTH){
  if(!Object.hasOwn(ARMOR_TYPES,armorType))throw Error('Unknown armor type: '+armorType);
  const maxHealth=Number.isFinite(maximumHealth)&&maximumHealth>0?maximumHealth:DUMMY_HEALTH;
  return {
    armorType,health:maxHealth,maxHealth,
    armor:ARMOR_TYPES[armorType].durability,
    maxArmor:ARMOR_TYPES[armorType].durability,
    alive:true,hits:0
  };
}
export function resetDummy(dummy){
  Object.assign(dummy,createDummy(dummy.armorType,dummy.maxHealth));
  return dummy;
}
export function applyDamage(dummy,baseDamage,zone='torso'){
  if(!Object.hasOwn(HIT_ZONES,zone))throw Error('Unknown hit zone: '+zone);
  if(!dummy.alive)return {
    applied:false,damage:0,blocked:0,killed:false,armorBroken:false,zone,
    health:dummy.health,armor:dummy.armor
  };
  const initialHealth=dummy.health;
  const raw=Math.max(0,Number.isFinite(baseDamage)?baseDamage:0)*HIT_ZONES[zone];
  const type=ARMOR_TYPES[dummy.armorType];
  const resistance=zone==='torso'?type.torsoReduction:zone==='head'?type.headReduction:0;
  const hadArmor=dummy.armor>0;
  // Armor absorbs damage instead of magically negating it forever. Once armor
  // is depleted, subsequent hits reach flesh without protection.
  const blocked=hadArmor?Math.min(dummy.armor,raw*resistance):0;
  dummy.armor=Math.max(0,dummy.armor-blocked);
  const damage=Math.min(initialHealth,Math.max(0,raw-blocked));
  dummy.health=Math.max(0,initialHealth-damage);
  dummy.hits++;
  dummy.alive=dummy.health>0;
  return {
    applied:true,zone,critical:zone==='head',raw,damage,blocked,
    killed:!dummy.alive,armorBroken:hadArmor&&dummy.armor<=0,
    health:dummy.health,armor:dummy.armor,hitCount:dummy.hits
  };
}
