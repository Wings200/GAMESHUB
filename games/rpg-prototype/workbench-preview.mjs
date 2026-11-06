// W20.73 — Non-mutating firearm assembly preview. Selecting a candidate part
// must never unlock mods, subtract materials, or save a player's equipment.
import {effectiveWeaponSpec,MOD_SLOTS,WEAPON_MODS} from './weapon-mods.mjs';

export function previewWeaponSpec(pack,baseSpec,slot,partId){
  if(!baseSpec||!MOD_SLOTS.includes(slot))return null;
  const part=WEAPON_MODS[partId];
  if(partId!=='factory'&&
     (part?.weaponId!==baseSpec.id||part?.slot!==slot))return null;
  const weaponId=baseSpec.id;
  const choices={...(pack?.equipment?.weaponMods?.[weaponId]||{}),[slot]:partId};
  const unlocked=[...(pack?.unlockedWeaponMods?.[weaponId]||[])];
  if(partId!=='factory'&&!unlocked.includes(partId))unlocked.push(partId);
  return effectiveWeaponSpec(baseSpec,{
    equipment:{weaponMods:{[weaponId]:choices}},
    unlockedWeaponMods:{[weaponId]:unlocked}
  });
}
