// W20.59 — Crafted firearm assemblies. Pure, save-safe game rules.
// Every cost is a physical component, not an arbitrary currency deduction.
// Values are mutable only through the server-validated developer balance layer.
import {ARSENAL} from './weapons.mjs';
import {CRAFTING_COMPONENTS} from './materials.mjs';

export const MOD_WEAPON_IDS=Object.freeze([
  '10mm-pistol','pipe-pistol','pipe-rifle','laser-musket',
  'double-barrel-shotgun','pump-action-shotgun','bolt-hunting-rifle',
  'iron-revolver','pipe-smg','heavy-sniper'
]);
export const MOD_SLOT_LABELS=Object.freeze({
  receiver:'RECEIVER / ACTION',barrel:'BARREL / EMITTER',
  magazine:'MAGAZINE / CHAMBER',stock:'STOCK / GRIP',
  muzzle:'MUZZLE / FOCUSER'
});
export const MOD_SLOTS=Object.freeze(Object.keys(MOD_SLOT_LABELS));
const MATERIAL_IDS=new Set(CRAFTING_COMPONENTS.map(c=>c.id));
const weaponTable=new Map(ARSENAL.map(s=>[s.id,s]));
const weaponVariants=new Map();
export const WEAPON_MODS=Object.create(null);
const mat=(...pairs)=>Object.fromEntries(pairs.map(([key,n])=>['material:'+key,n]));
const add=(weapon,slot,slug,name,description,changes,cost)=>{
  if(!MOD_WEAPON_IDS.includes(weapon.id))throw Error('Unsupported weapon mod');
  for(const key of Object.keys(cost))if(!MATERIAL_IDS.has(key))
    throw Error('Missing real scrap component: '+key);
  const id='mod:'+weapon.id+':'+slot+':'+slug;
  const part={id,weaponId:weapon.id,slot,slug,name,description,
    damageBonus:0,magazineBonus:0,recoilMultiplier:1,spreadMultiplier:1,
    reloadMultiplier:1,fireIntervalMultiplier:1,valueBonus:0,
    ...changes,cost:{...cost}};
  WEAPON_MODS[id]=part;
  weaponVariants.get(weapon.id)[slot].push(part);
};
for(const id of MOD_WEAPON_IDS){
  const w=weaponTable.get(id);
  const energy=id==='laser-musket',pistol=['pistol','revolver'].includes(w.kind);
  const shotgun=w.kind==='shotgun',smg=id==='pipe-smg';
  const sniper=id==='heavy-sniper',bolt=id==='bolt-hunting-rifle';
  const frame=weaponVariants.set(id,Object.fromEntries(MOD_SLOTS.map(s=>[s,[]]))).get(id);
  add(w,'receiver','reinforced',energy?'Reinforced capacitor':'Reinforced receiver',
    energy?'Hardened copper windings handle a stronger pulse.':'Stronger chamber and tuned firing pin.',
    {damageBonus:energy?10:shotgun?2:sniper?15:7,valueBonus:28},
    energy?mat(['copper',4],['circuitry',2],['adhesive',2],['ceramic',2]):
      mat(['steel',4],['screw',3],['spring',2],['oil',1]));
  add(w,'receiver','calibrated',energy?'High-output capacitor':'Calibrated action',
    energy?'Precision crystal focusing and a stronger current path.':'Close-tolerance mechanics improve grouping and cyclic action.',
    {damageBonus:energy?19:shotgun?3:12,spreadMultiplier:.82,
      fireIntervalMultiplier:energy?1:.93,valueBonus:60},
    energy?mat(['circuitry',5],['copper',4],['crystal',2],['nuclear-material',1]):
      mat(['aluminum',4],['steel',3],['screw',4],['gears',2],['adhesive',2]));
  add(w,'barrel','long',energy?'Long focusing emitter':'Long barrel',
    energy?'A longer emitter focuses the beam.':'Longer rifled/tubed steel improves precision.',
    {damageBonus:energy?7:shotgun?1:5,spreadMultiplier:.70,valueBonus:34},
    energy?mat(['copper',4],['glass',2],['adhesive',2],['fiber-optics',1]):
      mat(['steel',5],['screw',3],['adhesive',2]));
  add(w,'barrel','ported',energy?'Ventilated emitter':'Ported barrel',
    energy?'A cooled emitter with insulated electronic rails.':'Machined ports vent gas and soften muzzle climb.',
    {recoilMultiplier:.70,spreadMultiplier:.93,valueBonus:40},
    energy?mat(['aluminum',4],['circuitry',3],['rubber',2],['oil',2]):
      mat(['aluminum',3],['steel',3],['screw',2],['oil',2]));
  if(energy){
    add(w,'magazine','expanded','Expanded fusion-cell capacitor',
      'Additional circuitry stores more fusion-cell energy.',
      {magazineBonus:3,reloadMultiplier:1.12,valueBonus:50},
      mat(['circuitry',3],['copper',3],['glass',2],['adhesive',2]));
    add(w,'magazine','overcharged','Overcharged cell bank',
      'High-density crystal and nuclear material support a large energy reserve.',
      {magazineBonus:6,reloadMultiplier:1.18,valueBonus:110},
      mat(['circuitry',6],['copper',5],['crystal',3],['nuclear-material',2]));
  }else if(shotgun){
    add(w,'magazine','extended',id==='double-barrel-shotgun'?'Quick-load double chamber':'Extended magazine tube',
      id==='double-barrel-shotgun'?'A polished extract-and-load assembly shortens loading; it does not add a third barrel.':'Extended tube stores more shells.',
      {magazineBonus:id==='double-barrel-shotgun'?0:2,reloadMultiplier:.85,valueBonus:42},
      mat(['steel',3],['spring',3],['screw',3],['oil',1]));
    if(id!=='double-barrel-shotgun')
      add(w,'magazine','large','Long eight-plus shell tube',
        'Extended magazine tube and extra spring keep shells feeding.',
        {magazineBonus:4,reloadMultiplier:1.14,valueBonus:64},
        mat(['steel',6],['aluminum',3],['spring',4],['screw',4]));
  }else if(w.kind==='revolver'){
    add(w,'magazine','speed-loader','Speed-loader cylinder',
      'Machined cylinder charge and organized cartridges cut reload time.',
      {reloadMultiplier:.69,valueBonus:42},
      mat(['steel',3],['spring',2],['screw',2],['oil',1]));
  }else if(bolt||sniper){
    add(w,'magazine','extended','Extended internal magazine',
      'Reworked floor plate and spring provide extra rifle rounds.',
      {magazineBonus:sniper?3:2,reloadMultiplier:1.05,valueBonus:40},
      mat(['steel',4],['spring',3],['screw',3],['adhesive',1]));
  }else{
    add(w,'magazine','extended','Extended magazine',
      'Deeper magazine box, tougher follower, longer spring.',
      {magazineBonus:smg?15:8,reloadMultiplier:1.08,valueBonus:44},
      mat(['steel',4],['spring',3],['screw',2],['adhesive',1]));
    add(w,'magazine','drum','High-capacity drum',
      'A geared rotary feed requires real springs, gears and a reinforced housing.',
      {magazineBonus:smg?45:20,reloadMultiplier:1.3,valueBonus:95},
      mat(['aluminum',7],['steel',4],['gears',3],['spring',5],['screw',4]));
  }
  add(w,'stock','stabilized',pistol?'Ergonomic grip':'Stabilized stock',
    pistol?'Leather wrapping and a shaped wood grip reduce hand shock.':'Rigid stock with rubber recoil pad.',
    {recoilMultiplier:.76,spreadMultiplier:.88,valueBonus:30},
    pistol?mat(['wood',2],['leather',2],['adhesive',2]):
      mat(['wood',4],['screw',3],['rubber',2],['adhesive',2]));
  add(w,'stock','tactical',pistol?'Heavy combat grip':'Reinforced recoil stock',
    pistol?'Steel-backed rubber grip mitigates sharp recoil.':'Aluminum brace and counterweight improve sustained aiming.',
    {recoilMultiplier:.58,spreadMultiplier:.79,valueBonus:62},
    pistol?mat(['steel',3],['rubber',3],['screw',3],['adhesive',2]):
      mat(['aluminum',5],['steel',3],['rubber',3],['screw',3]));
  add(w,'muzzle','brake',energy?'Beam collimator':'Muzzle brake',
    energy?'Crystal collimator straightens the laser.':'Gas-baffled steel redirector damps muzzle rise.',
    {recoilMultiplier:.78,spreadMultiplier:energy?.82:1,valueBonus:36},
    energy?mat(['copper',2],['crystal',2],['circuitry',2],['glass',1]):
      mat(['steel',3],['screw',2],['oil',1]));
  add(w,'muzzle','precision',energy?'Precision laser focuser':shotgun?'Compensated choke':'Precision suppressor',
    energy?'Fiber-optic lens narrows the beam.':shotgun?'Precision bored choke tightens the pellet pattern.':'Insulated baffle can reduces recoil and shot dispersion.',
    {recoilMultiplier:.65,spreadMultiplier:.65,valueBonus:78},
    energy?mat(['fiber-optics',3],['copper',3],['crystal',3],['adhesive',2]):
    shotgun?mat(['steel',5],['screw',3],['oil',2]):
      mat(['steel',5],['fiberglass',3],['rubber',3],['adhesive',3]));
}
export function weaponModOptions(weaponId,slot){
  return weaponVariants.get(weaponId)?.[slot]||[];
}
export function weaponModSlots(weaponId){
  if(!weaponVariants.has(weaponId))return [];
  return MOD_SLOTS.filter(slot=>weaponModOptions(weaponId,slot).length);
}
export function selectedWeaponMod(pack,weaponId,slot){
  const id=pack?.equipment?.weaponMods?.[weaponId]?.[slot];
  return WEAPON_MODS[id]?.weaponId===weaponId&&WEAPON_MODS[id].slot===slot&&
    pack?.unlockedWeaponMods?.[weaponId]?.includes(id)?id:'factory';
}
export function modOwned(pack,weaponId,modId){
  return !!WEAPON_MODS[modId]&&WEAPON_MODS[modId].weaponId===weaponId&&
    pack?.unlockedWeaponMods?.[weaponId]?.includes(modId);
}
export function missingModMaterials(pack,modId){
  const part=WEAPON_MODS[modId];
  if(!part)throw Error('Unknown modification');
  return Object.entries(part.cost).filter(([id,quantity])=>
    Math.max(0,Math.floor(Number(pack?.materials?.[id]||0)))<quantity)
    .map(([id,required])=>({itemId:id,required,owned:Math.max(0,Math.floor(Number(pack?.materials?.[id]||0)))}));
}
export function craftWeaponMod(pack,weaponId,modId){
  const part=WEAPON_MODS[modId];
  if(!weaponVariants.has(weaponId)||modId!=='factory'&&part?.weaponId!==weaponId)
    return {ok:false,reason:'incompatible'};
  if(modId==='factory'){
    const slot=arguments[3];
    if(!MOD_SLOTS.includes(slot))return {ok:false,reason:'slot'};
    pack.equipment??={};
    pack.equipment.weaponMods??={};
    (pack.equipment.weaponMods[weaponId]??={})[slot]='factory';
    return {ok:true,crafted:false,installed:'factory',slot};
  }
  const slot=part.slot,owned=modOwned(pack,weaponId,modId);
  if(!owned){
    const missing=missingModMaterials(pack,modId);
    if(missing.length)return {ok:false,reason:'materials',missing};
    // Atomic: no component stack is touched before every ingredient passes.
    for(const [id,quantity] of Object.entries(part.cost)){
      pack.materials[id]-=quantity;
      if(!pack.materials[id])delete pack.materials[id];
    }
    pack.unlockedWeaponMods??={};
    (pack.unlockedWeaponMods[weaponId]??=[]).push(modId);
  }
  pack.equipment??={};pack.equipment.weaponMods??={};
  (pack.equipment.weaponMods[weaponId]??={})[slot]=modId;
  return {ok:true,crafted:!owned,installed:modId,slot};
}
export function safeWeaponMods(pack,saved){
  pack.unlockedWeaponMods={};
  pack.equipment.weaponMods={};
  for(const weaponId of MOD_WEAPON_IDS){
    const original=saved?.unlockedWeaponMods?.[weaponId];
    const unlocked=Array.isArray(original)?original.filter(id=>
      typeof id==='string'&&WEAPON_MODS[id]?.weaponId===weaponId):[];
    pack.unlockedWeaponMods[weaponId]=[...new Set(unlocked)];
    const choices=saved?.equipment?.weaponMods?.[weaponId]||{};
    pack.equipment.weaponMods[weaponId]={};
    for(const slot of MOD_SLOTS){
      const id=choices[slot];
      pack.equipment.weaponMods[weaponId][slot]=id==='factory'||(
        typeof id==='string'&&WEAPON_MODS[id]?.weaponId===weaponId&&
        WEAPON_MODS[id]?.slot===slot&&unlocked.includes(id))?id:'factory';
    }
  }
}
export function effectiveWeaponSpec(base,pack){
  if(!base||!weaponVariants.has(base.id))return base;
  const spec={...base};
  let bonusDamage=0,bonusMagazine=0;
  let recoil=1,spread=1,reload=1,rate=1,value=0;
  for(const slot of MOD_SLOTS){
    const item=WEAPON_MODS[selectedWeaponMod(pack,base.id,slot)];
    if(!item)continue;
    bonusDamage+=item.damageBonus;bonusMagazine+=item.magazineBonus;
    recoil*=item.recoilMultiplier;spread*=item.spreadMultiplier;
    reload*=item.reloadMultiplier;rate*=item.fireIntervalMultiplier;
    value+=item.valueBonus;
  }
  spec.damage=Math.max(0,Math.round((base.damage+bonusDamage)*100)/100);
  spec.magazineSize=Math.max(1,Math.round(base.magazineSize+bonusMagazine));
  spec.recoilDegrees=Math.max(0,Math.round(base.recoilDegrees*recoil*1000)/1000);
  spec.adsSpreadDegrees=Math.max(0,base.adsSpreadDegrees*spread);
  spec.hipSpreadDegrees=Math.max(0,base.hipSpreadDegrees*spread);
  spec.reloadSeconds=Math.max(.1,base.reloadSeconds*reload);
  spec.fireInterval=Math.max(.03,base.fireInterval*rate);
  spec.modValueBonus=value;
  return spec;
}
export function describeWeaponMod(part){
  return [
    part.damageBonus?'DMG +'+part.damageBonus:null,
    part.magazineBonus?'CAP +'+part.magazineBonus:null,
    part.recoilMultiplier!==1?'RECOIL '+Math.round(part.recoilMultiplier*100)+'%':null,
    part.spreadMultiplier!==1?'SPREAD '+Math.round(part.spreadMultiplier*100)+'%':null,
    part.reloadMultiplier!==1?'RELOAD '+Math.round(part.reloadMultiplier*100)+'%':null,
    part.fireIntervalMultiplier!==1?'FIRE DELAY '+Math.round(part.fireIntervalMultiplier*100)+'%':null
  ].filter(Boolean).join('  ·  ')||'COSMETIC / HANDLING';
}
export function updateWeaponModBlueprint(id,patch){
  const part=WEAPON_MODS[id];if(!part)throw Error('Unknown weapon modification');
  for(const [key,value] of Object.entries(patch)){
    if(key.startsWith('cost_')){
      const materialId='material:'+key.slice(5).replaceAll('_','-');
      if(!MATERIAL_IDS.has(materialId))throw Error('Unknown material cost');
      if(!Number.isInteger(value)||value<0||value>9999)throw Error('Invalid cost');
      if(value===0)delete part.cost[materialId];
      else part.cost[materialId]=value;
    }else if(['damageBonus','magazineBonus','recoilMultiplier','spreadMultiplier',
      'reloadMultiplier','fireIntervalMultiplier','valueBonus'].includes(key)){
      if(!Number.isFinite(value))throw Error('Invalid mod value');
      part[key]=value;
    }else throw Error('Unknown mod setting');
  }
}
