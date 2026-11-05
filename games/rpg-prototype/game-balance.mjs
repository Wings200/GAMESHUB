// W20.61 — All implemented item families and component variables share game rules.
import {ARSENAL} from './weapons.mjs';
import {WEAPON_MODS,MOD_SLOTS,MOD_SLOT_LABELS,updateWeaponModBlueprint} from './weapon-mods.mjs';
import {ARMOR_SLOTS,ARMOR_SLOT_LABELS,ARMOR_ITEMS} from './combat.mjs';
import {POWER_ARMOR_PLATES,updatePowerPlateBalance,getPowerPlate} from './power-armor.mjs';
import {CRAFTING_COMPONENTS} from './materials.mjs';
import {ITEM_CATALOG,getItem,applyItemBalance} from './inventory.mjs';
import {LASER_MUSKET_TUNING} from './laser-musket-mechanics.mjs';
import {validateBalanceChanges,WEAPON_BASE_FIELDS,SPECIAL_FIELDS,
  allowedVariableFields} from './balance-schema.mjs';
const weaponFields=['damage','magazineSize','reloadSeconds','recoilDegrees',
  'fireInterval','hipSpreadDegrees','adsSpreadDegrees'];
const resourceIds=new Set([...CRAFTING_COMPONENTS.map(c=>c.id),'supply:salvage']);
const itemValue=id=>getItem(id).value;
const priceFields=id=>{
  const value=itemValue(id);
  return {buyPrice:Math.max(1,Math.ceil(value*1.25)),
    sellPrice:Math.max(1,Math.floor(value*.45))};
};
const familyOfArmor=id=>id.replace(/-(?:head|chest|leftArm|rightArm|leftLeg|rightLeg)$/,'');
const sort=(list)=>list.sort((a,b)=>a.group.localeCompare(b.group)||
  (a.parentId||'').localeCompare(b.parentId||'')||
  (a.slotOrder??0)-(b.slotOrder??0)||a.name.localeCompare(b.name));

export function describeGameVariables(){
  const catalog={weapons:[],armor:[],junk:[],resources:[],consumables:[],misc:[]};
  // One visible gun family. All existing actions/receivers/barrels/magazines/
  // stocks/muzzles are navigated INSIDE that family, never a giant flat list.
  for(const spec of ARSENAL){
    const fields=Object.fromEntries(weaponFields.map(k=>[k,spec[k]]));
    fields.value=itemValue('weapon:'+spec.id);
    for(const field of SPECIAL_FIELDS[spec.id]||[])fields[field]=LASER_MUSKET_TUNING[field];
    catalog.weapons.push({id:spec.id,name:spec.name,
      group:spec.kind||'Other weapons',parentId:spec.id,
      parentName:spec.name,slot:'base',slotOrder:-1,role:'base',fields});
  }
  for(const part of Object.values(WEAPON_MODS)){
    const weapon=ARSENAL.find(w=>w.id===part.weaponId);
    const fields={
      damageBonus:part.damageBonus,magazineBonus:part.magazineBonus,
      recoilMultiplier:part.recoilMultiplier,spreadMultiplier:part.spreadMultiplier,
      reloadMultiplier:part.reloadMultiplier,fireIntervalMultiplier:part.fireIntervalMultiplier,
      valueBonus:part.valueBonus
    };
    // Show ALL 31 ingredient choices, including 0-quantity resources. Changing
    // an ingredient from 0 to N immediately changes real crafting requirements.
    for(const material of CRAFTING_COMPONENTS)
      fields['cost_'+material.key.replaceAll('-','_')]=part.cost[material.id]||0;
    catalog.weapons.push({id:part.id,name:part.name,
      group:weapon.kind||'Other weapons',parentId:part.weaponId,parentName:weapon.name,
      slot:part.slot,slotOrder:MOD_SLOTS.indexOf(part.slot),
      role:'mod',description:part.description,fields});
  }
  // All 16 authored regular armor families * 6 locations are included, even
  // when an early-test armor piece is not yet distributed by merchants.
  for(const slot of ARMOR_SLOTS){
    for(const piece of ARMOR_ITEMS[slot]){
      if(piece.id==='none')continue;
      const familyId=familyOfArmor(piece.id);
      const fields={points:piece.points};
      if(ITEM_CATALOG['armor:'+piece.id])fields.value=itemValue('armor:'+piece.id);
      catalog.armor.push({id:piece.id,name:piece.name,group:'Regular Armor',
        parentId:'regular:'+familyId,parentName:piece.name.split(' · ')[0],
        slot,slotOrder:ARMOR_SLOTS.indexOf(slot),role:'armor-piece',fields});
    }
  }
  // Complete legacy and current power-plate models, with independent real slot
  // overlays and sell values for each item. Chassis/tier base is editable too.
  for(const [tier,plate] of Object.entries(POWER_ARMOR_PLATES)){
    if(tier==='none')continue;
    const baseId='power:'+tier;
    catalog.armor.push({id:baseId,name:plate.name+' · Base model',
      group:'Power Armor',parentId:baseId,parentName:plate.name,
      slot:'base',slotOrder:-1,role:'power-base',
      fields:{points:plate.points,maxDurability:plate.maxDurability,
        value:itemValue('power-plate:'+tier+'-chest')}});
    for(const slot of ARMOR_SLOTS){
      const id=baseId+':'+slot;
      const fields={points:getPowerPlate(slot,tier).points,
        maxDurability:getPowerPlate(slot,tier).maxDurability,
        value:itemValue('power-plate:'+tier+'-'+slot)};
      catalog.armor.push({id,name:plate.name+' · '+ARMOR_SLOT_LABELS[slot],
        group:'Power Armor',parentId:baseId,parentName:plate.name,
        slot,slotOrder:ARMOR_SLOTS.indexOf(slot),role:'power-piece',fields});
    }
  }
  for(const item of CRAFTING_COMPONENTS)
    catalog.resources.push({id:item.id,name:item.name,group:'Crafting Resources',
      parentId:item.id,role:'resource',fields:priceFields(item.id)});
  catalog.resources.push({id:'supply:salvage',name:'Salvaged Parts',
    group:'Legacy Scrap Resource',parentId:'supply:salvage',role:'resource',
    fields:priceFields('supply:salvage')});
  for(const item of Object.values(ITEM_CATALOG)){
    if(item.id==='supply:medkit'||item.category==='consumable'){
      const fields={value:itemValue(item.id)};
      if(Number.isFinite(item.heal))fields.heal=getItem(item.id).heal;
      catalog.consumables.push({id:item.id,name:item.name,
        group:'Aid / Consumables',parentId:item.id,role:'consumable',fields});
      continue;
    }
    if(item.category==='junk'){
      catalog.junk.push({id:item.id,name:item.name,group:'Scrappable Objects',
        parentId:item.id,role:'junk',fields:{value:itemValue(item.id),
          ...(Number.isFinite(item.weight)?{weight:item.weight}:{})}});
      continue;
    }
    if(['weapon','armor','material','power-plate'].includes(item.category)||
      resourceIds.has(item.id))continue;
    catalog.misc.push({id:item.id,name:item.name,
      group:item.category==='ammo'?'Ammunition':
        item.category==='clothing'?'Clothing':
        item.category==='fusion-core'?'Fusion Cores':'Other',
      parentId:item.id,role:'misc',fields:{value:itemValue(item.id)}});
  }
  for(const list of Object.values(catalog))sort(list);
  return catalog;
}
// The immutable factory baseline captured before loading published settings.
export const DEFAULT_GAME_VARIABLES=describeGameVariables();
export const GAME_VARIABLE_LOOKUP=Object.freeze(Object.fromEntries(
  Object.entries(DEFAULT_GAME_VARIABLES).map(([cat,entries])=>
    [cat,Object.freeze(Object.fromEntries(entries.map(item=>[item.id,item])))])));

export function applyGameBalance(rawChanges={}){
  const changes=validateBalanceChanges(rawChanges);
  const itemChanges={};
  const setItem=(id,field,value)=>{
    if(!Object.hasOwn(ITEM_CATALOG,id))return;
    (itemChanges[id]||={})[field]=value;
  };
  for(const [id,patch] of Object.entries(changes.weapons||{}))
    if(WEAPON_MODS[id])updateWeaponModBlueprint(id,patch);
  for(const spec of ARSENAL){
    const patch=changes.weapons?.[spec.id]||{};
    for(const key of weaponFields)
      if(Object.hasOwn(patch,key))spec[key]=patch[key];
    if(Object.hasOwn(patch,'value'))setItem('weapon:'+spec.id,'value',patch.value);
    if(spec.id==='laser-musket')
      for(const key of SPECIAL_FIELDS[spec.id]||[])
        if(Object.hasOwn(patch,key))LASER_MUSKET_TUNING[key]=patch[key];
  }
  const powerPieces={};
  // Apply model-wide baseline first, then independent piece overrides.
  for(const [tier,plate] of Object.entries(POWER_ARMOR_PLATES)){
    if(tier==='none')continue;
    const base=changes.armor?.['power:'+tier]||{};
    for(const field of ['points','maxDurability'])
      if(Object.hasOwn(base,field))plate[field]=base[field];
    if(Object.hasOwn(base,'value')||Object.hasOwn(base,'maxDurability'))
      for(const slot of ARMOR_SLOTS){
        const itemId='power-plate:'+tier+'-'+slot;
        if(Object.hasOwn(base,'value'))setItem(itemId,'value',base.value);
        if(Object.hasOwn(base,'maxDurability'))
          setItem(itemId,'maxDurability',base.maxDurability);
      }
  }
  for(const slot of ARMOR_SLOTS){
    for(const piece of ARMOR_ITEMS[slot]){
      const patch=changes.armor?.[piece.id]||{};
      if(Object.hasOwn(patch,'points'))piece.points=patch.points;
      if(Object.hasOwn(patch,'value'))
        setItem('armor:'+piece.id,'value',patch.value);
    }
  }
  for(const [tier] of Object.entries(POWER_ARMOR_PLATES)){
    if(tier==='none')continue;
    for(const slot of ARMOR_SLOTS){
      const id='power:'+tier+':'+slot;
      const patch=changes.armor?.[id]||{};
      if(Object.keys(patch).length)powerPieces[id]=patch;
      for(const field of ['value','maxDurability'])
        if(Object.hasOwn(patch,field))
          setItem('power-plate:'+tier+'-'+slot,field,patch[field]);
    }
  }
  updatePowerPlateBalance(powerPieces);
  for(const category of ['resources','consumables','junk','misc'])
    for(const [id,fields] of Object.entries(changes[category]||{}))
      for(const [field,value] of Object.entries(fields))setItem(id,field,value);
  applyItemBalance(itemChanges);
}
