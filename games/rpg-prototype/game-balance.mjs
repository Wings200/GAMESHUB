// W20.58 — Bridges the developer variables to the ACTUAL combat and trade catalogs.
import {ARSENAL} from './weapons.mjs';
import {ARMOR_SLOTS, ARMOR_ITEMS} from './combat.mjs';
import {POWER_ARMOR_PLATES} from './power-armor.mjs';
import {CRAFTING_COMPONENTS} from './materials.mjs';
import {ITEM_CATALOG, getItem, applyItemBalance} from './inventory.mjs';
import {LASER_MUSKET_TUNING} from './laser-musket-mechanics.mjs';
import {validateBalanceChanges, WEAPON_BASE_FIELDS, SPECIAL_FIELDS} from './balance-schema.mjs';

const weaponFields = ['damage','magazineSize','reloadSeconds','recoilDegrees',
  'fireInterval','hipSpreadDegrees','adsSpreadDegrees'];
const armorFields = ['points'];
const otherItem = id => getItem(id).value;

export function describeGameVariables() {
  const catalog = {weapons:[],armor:[],scrap:[],healing:[],miscellaneous:[]};
  for (const spec of ARSENAL) {
    const fields = {};
    for (const key of weaponFields) fields[key] = spec[key];
    fields.value = otherItem('weapon:' + spec.id);
    if (SPECIAL_FIELDS[spec.id]) {
      for (const key of SPECIAL_FIELDS[spec.id])
        fields[key] = LASER_MUSKET_TUNING[key];
    }
    catalog.weapons.push({id:spec.id, name:spec.name, group:spec.kind || 'Pistols', fields});
  }
  for (const slot of ARMOR_SLOTS) {
    for (const piece of ARMOR_ITEMS[slot]) {
      if (piece.id === 'none') continue;
      const itemId = 'armor:' + piece.id;
      const fields = {points:piece.points};
      if (ITEM_CATALOG[itemId]) fields.value = otherItem(itemId);
      catalog.armor.push({id:piece.id, name:piece.name, group:'Regular armor', fields});
    }
  }
  for (const [tier, plate] of Object.entries(POWER_ARMOR_PLATES)) {
    if (tier === 'none') continue;
    catalog.armor.push({id:'power:' + tier, name:plate.name, group:'Power armor',
      fields:{points:plate.points,maxDurability:plate.maxDurability,
        value:otherItem('power-plate:' + tier + '-chest')}});
  }
  for (const component of CRAFTING_COMPONENTS)
    catalog.scrap.push({id:component.id, name:component.name,
      group:'Crafting components', fields:{value:otherItem(component.id)}});
  catalog.scrap.push({id:'supply:salvage',name:'Salvaged Parts',
    group:'Loose scrap',fields:{value:otherItem('supply:salvage')}});
  const medkit = getItem('supply:medkit');
  catalog.healing.push({id:medkit.id,name:medkit.name,
    group:'Medical supplies',fields:{heal:medkit.heal,value:medkit.value}});
  for (const item of Object.values(ITEM_CATALOG)) {
    if (['weapon','armor','material'].includes(item.category) ||
        ['supply:medkit','supply:salvage'].includes(item.id)) continue;
    catalog.miscellaneous.push({id:item.id,name:item.name,
      group:item.category === 'ammo'?'Ammunition':
        item.category === 'clothing'?'Clothing':
        item.category === 'power-plate'?'Power armor parts':'Other items',
      fields:{value:item.value}});
  }
  for (const entries of Object.values(catalog))
    entries.sort((a,b)=>a.group.localeCompare(b.group)||a.name.localeCompare(b.name));
  return catalog;
}

// Capture pristine values once, before applying any downloaded overrides.
export const DEFAULT_GAME_VARIABLES = describeGameVariables();

export function applyGameBalance(rawChanges = {}) {
  const changes = validateBalanceChanges(rawChanges);
  const itemChanges = {};
  const setItem = (id,field,value) => {
    if (!Object.hasOwn(ITEM_CATALOG,id)) return;
    (itemChanges[id] ||= {})[field] = value;
  };
  for (const spec of ARSENAL) {
    const patch = changes.weapons?.[spec.id] || {};
    for (const field of weaponFields)
      if (Object.hasOwn(patch,field)) spec[field] = patch[field];
    if (Object.hasOwn(patch,'value')) setItem('weapon:' + spec.id,'value',patch.value);
    if (spec.id === 'laser-musket')
      for (const key of SPECIAL_FIELDS['laser-musket'])
        if (Object.hasOwn(patch,key)) LASER_MUSKET_TUNING[key] = patch[key];
  }
  for (const slot of ARMOR_SLOTS) for (const piece of ARMOR_ITEMS[slot]) {
    const patch = changes.armor?.[piece.id] || {};
    for (const field of armorFields)
      if (Object.hasOwn(patch,field)) piece[field] = patch[field];
    if (Object.hasOwn(patch,'value')) setItem('armor:' + piece.id,'value',patch.value);
  }
  for (const [tier, plate] of Object.entries(POWER_ARMOR_PLATES)) {
    const patch = changes.armor?.['power:' + tier] || {};
    for (const field of ['points','maxDurability'])
      if (Object.hasOwn(patch,field)) plate[field] = patch[field];
    if (Object.hasOwn(patch,'value')) for (const slot of ARMOR_SLOTS)
      setItem('power-plate:' + tier + '-' + slot,'value',patch.value);
  }
  for (const category of ['scrap','healing','miscellaneous'])
    for (const [id, fields] of Object.entries(changes[category] || {}))
      for (const [field,value] of Object.entries(fields)) setItem(id,field,value);
  applyItemBalance(itemChanges);
}
