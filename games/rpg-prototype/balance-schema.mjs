// W20.61 — One authoritative, server-validated variable schema.
// Never accept client-supplied paths: IDs and fields must exist in game data.
import {ARSENAL} from './weapons.mjs';
import {WEAPON_MODS} from './weapon-mods.mjs';
import {ARMOR_ITEMS,ARMOR_SLOTS} from './combat.mjs';
import {POWER_ARMOR_PLATES} from './power-armor.mjs';
import {CRAFTING_COMPONENTS} from './materials.mjs';
import {ITEM_CATALOG} from './inventory.mjs';

const range=(min,max,step,label)=>Object.freeze([min,max,step,label]);
const PRICE=range(0,1000000,1,'Base value (caps)');
const materialIds=CRAFTING_COMPONENTS.map(c=>c.id);
export const MOD_VARIABLE_FIELDS=Object.freeze({
  damageBonus:range(0,500,1,'Additional damage'),
  magazineBonus:range(0,500,1,'Additional magazine capacity'),
  recoilMultiplier:range(.05,3,.01,'Recoil multiplier'),
  spreadMultiplier:range(.05,3,.01,'Accuracy / spread multiplier'),
  reloadMultiplier:range(.2,4,.01,'Reload time multiplier'),
  fireIntervalMultiplier:range(.3,3,.01,'Time between shots multiplier'),
  valueBonus:range(0,100000,1,'Added item value'),
  ...Object.fromEntries(materialIds.map(id=>
    ['cost_'+id.slice(9).replaceAll('-','_'),
      range(0,9999,1,'Recipe · '+id.slice(9).replaceAll('-',' '))]))
});
export const VARIABLE_FIELDS=Object.freeze({
  weapons:Object.freeze({
    ...MOD_VARIABLE_FIELDS,
    damage:range(0,2000,1,'Damage'),
    magazineSize:range(1,500,1,'Magazine capacity'),
    reloadSeconds:range(.1,30,.05,'Reload time (seconds)'),
    recoilDegrees:range(0,30,.05,'Recoil (degrees)'),
    fireInterval:range(.03,10,.01,'Time between shots (seconds)'),
    hipSpreadDegrees:range(0,45,.05,'Hip-fire spread'),
    adsSpreadDegrees:range(0,30,.01,'Aim-down-sights spread'),
    value:PRICE,
    maxCharges:range(1,20,1,'Maximum crank charges'),
    crankSeconds:range(.1,10,.05,'Seconds per crank'),
    damagePerExtraCharge:range(0,3,.05,'Extra damage per charge')
  }),
  armor:Object.freeze({
    points:range(0,1000,1,'Armor rating'),
    maxDurability:range(1,5000,1,'Maximum durability'),
    value:PRICE
  }),
  junk:Object.freeze({value:PRICE,weight:range(0,1000,.01,'Weight')}),
  resources:Object.freeze({
    buyPrice:range(0,1000000,1,'Buy cost (caps)'),
    sellPrice:range(0,1000000,1,'Sell price (caps)')
  }),
  consumables:Object.freeze({
    heal:range(0,1000,1,'Health restored'),
    value:PRICE
  }),
  misc:Object.freeze({value:PRICE})
});
export const VARIABLE_CATEGORIES=Object.freeze([
  ['weapons','Weapons'],['armor','Armor / Power Armor'],
  ['junk','Junk'],['resources','Resources'],
  ['consumables','Consumables'],['misc','Misc']
]);
export const SPECIAL_FIELDS=Object.freeze({
  'laser-musket':['maxCharges','crankSeconds','damagePerExtraCharge']
});
export const WEAPON_BASE_FIELDS=Object.freeze([
  'damage','magazineSize','reloadSeconds','recoilDegrees','fireInterval',
  'hipSpreadDegrees','adsSpreadDegrees','value'
]);
const itemIds=new Set(Object.keys(ITEM_CATALOG));
const weaponIds=new Set(ARSENAL.map(s=>s.id));
const armorIds=new Set(ARMOR_SLOTS.flatMap(slot=>
  ARMOR_ITEMS[slot].filter(p=>p.id!=='none').map(p=>p.id)));
const powerIds=new Set(Object.keys(POWER_ARMOR_PLATES)
  .filter(t=>t!=='none').flatMap(tier=>[
    'power:'+tier,
    ...ARMOR_SLOTS.map(slot=>'power:'+tier+':'+slot)
  ]));
const resourceIds=new Set([...materialIds,'supply:salvage']);
const consumableIds=new Set(['supply:medkit']);
const junkIds=new Set(Object.values(ITEM_CATALOG).filter(x=>x.category==='junk').map(x=>x.id));
const miscIds=new Set(Object.values(ITEM_CATALOG).filter(item=>
  !['weapon','armor','material','power-plate','junk'].includes(item.category)&&
  !resourceIds.has(item.id)&&!consumableIds.has(item.id)).map(x=>x.id));
const idRegex=/^[a-z0-9][a-z0-9:_-]{0,119}$/;
const MAX_ENTRIES=3000;

export function allowedVariableFields(category,id){
  if(!idRegex.test(id))return [];
  if(category==='weapons'){
    if(WEAPON_MODS[id])return Object.keys(MOD_VARIABLE_FIELDS);
    return weaponIds.has(id)?
      [...WEAPON_BASE_FIELDS,...(SPECIAL_FIELDS[id]||[])]:[];
  }
  if(category==='armor'){
    if(armorIds.has(id))return itemIds.has('armor:'+id)?['points','value']:['points'];
    if(powerIds.has(id))return ['points','maxDurability','value'];
    return [];
  }
  if(category==='resources')return resourceIds.has(id)?['buyPrice','sellPrice']:[];
  if(category==='consumables')return consumableIds.has(id)?['heal','value']:[];
  if(category==='junk')return junkIds.has(id)?['value','weight']:[];
  if(category==='misc')return miscIds.has(id)?['value']:[];
  return [];
}
// Migration from W20.58/59 persisted category names and single item-value
// pricing. Only previous, known names are accepted; arbitrary keys still fail.
export function migrateLegacyBalanceChanges(input){
  if(!input||typeof input!=='object'||Array.isArray(input))return input;
  const migrated={};
  for(const [original,entries] of Object.entries(input)){
    const category=original==='scrap'?'resources':
      original==='healing'?'consumables':
      original==='miscellaneous'?'misc':original;
    if(!entries||typeof entries!=='object'||Array.isArray(entries)){
      migrated[category]=entries;continue;
    }
    const out=migrated[category]||={};
    for(const [id,values] of Object.entries(entries)){
      if(original==='scrap'&&values&&typeof values==='object'&&
        Number.isFinite(values.value)){
        out[id]={
          buyPrice:Math.max(1,Math.ceil(values.value*1.25)),
          sellPrice:Math.max(1,Math.floor(values.value*.45))
        };
      }else out[id]=values;
    }
  }
  return migrated;
}
export function validateBalanceChanges(raw){
  const input=migrateLegacyBalanceChanges(raw);
  if(!input||typeof input!=='object'||Array.isArray(input))
    throw Error('Settings must be a category object.');
  const cleaned={};let entries=0;
  for(const [category,items] of Object.entries(input)){
    if(!Object.hasOwn(VARIABLE_FIELDS,category)||!items||
      typeof items!=='object'||Array.isArray(items))
      throw Error('Invalid variable category.');
    const out={};
    for(const [id,patch] of Object.entries(items)){
      if(++entries>MAX_ENTRIES||!idRegex.test(id)||!patch||
        typeof patch!=='object'||Array.isArray(patch))
        throw Error('Invalid variable entry.');
      const accepted=allowedVariableFields(category,id);
      if(!accepted.length)throw Error('Unknown item: '+category+'/'+id);
      const fields={};
      for(const [field,value] of Object.entries(patch)){
        const r=VARIABLE_FIELDS[category][field];
        if(!accepted.includes(field)||!r||typeof value!=='number'||
          !Number.isFinite(value)||value<r[0]||value>r[1]||
          (r[2]===1&&!Number.isInteger(value)))
          throw Error('Invalid value for '+category+'/'+id+'/'+field);
        fields[field]=value;
      }
      if(Object.keys(fields).length)out[id]=fields;
    }
    if(Object.keys(out).length)cleaned[category]=out;
  }
  return cleaned;
}
