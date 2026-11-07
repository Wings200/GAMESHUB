// W06.0 original RPG loot and inventory rules. Pure game-state logic.
import {ARSENAL,getWeaponSpec} from './weapons.mjs';
import {moveLootQuantity,moveAllLoot} from './loot-transfer.mjs';
import {OPTIC_MODS,compatibleOptics} from './weapon-sights.mjs?v=W20.41';
import {ARMOR_SLOTS,getArmorPiece,createLoadout,damageReductionForPoints,
  enemyArmorForRound} from './combat.mjs';
import {POWER_ARMOR_PLATES,POWER_ARMOR_SLOTS,FUSION_CORE_CAPACITY} from './power-armor.mjs?v=W20.74.1';
import {salvageWornPowerArmor} from './power-acquisition.mjs?v=W20.75';
import {CRAFTING_COMPONENTS,OPTIC_COMPONENT_RECIPES,generateComponentDrop} from './materials.mjs';
import {safeWeaponMods} from './weapon-mods.mjs';
import {discountedComponentRecipe} from './special.mjs';
import {FIELD_BACKPACK_BONUS} from './carry-weight.mjs';
// Retained only for older integrations; slot count is no longer a carry limit.
export const BACKPACK_LIMIT=30;
const MAX_SAFETY_ENTRIES=10000; // abnormal/corrupt requests must not loop forever
export function backpackSlotLimit(pack){
  const bonus=Number.isSafeInteger(pack?.slotBonus)?pack.slotBonus:0;
  return BACKPACK_LIMIT+Math.max(0,Math.min(4,bonus));
}
export const RARITIES=Object.freeze({
  common:Object.freeze({label:'COMMON',color:'#a8b7af',multiplier:1}),
  uncommon:Object.freeze({label:'UNCOMMON',color:'#8bd4a1',multiplier:1.6}),
  rare:Object.freeze({label:'RARE',color:'#86b9ff',multiplier:2.6}),
  epic:Object.freeze({label:'EPIC',color:'#d2a5fb',multiplier:4.2})
});
const cap=(n)=>Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,
  Math.floor(Number.isFinite(n)?n:0)));
export const INVENTORY_CATEGORIES=Object.freeze([
  {id:'all',label:'All Items'},
  {id:'weapon',label:'Weapons'},
  {id:'armor',label:'Armor'},
  {id:'power',label:'Power Armor'},
  {id:'clothing',label:'Clothing'},
  {id:'aid',label:'Aid'},
  {id:'materials',label:'Materials'},
  {id:'junk',label:'Junk'},
  {id:'quest',label:'Quest Items'}
]);
export function inventorySection(item){
  if(item.category==='material')return 'materials';
  if(item.category==='power-plate'||item.category==='fusion-core')return 'power';
  if(item.category==='supply')return ['medkit','rad-flush','clean-water',
    'trail-stew','dirty-water','combat-stim','focus-tonic','rad-shield']
    .includes(item.key)?'aid':'junk';
  return item.category;
}
export function displayAmmoCount(value){const n=cap(value);return n>999?'999+':String(n);}
export function ammoReserve(pack,weaponId){getWeaponSpec(weaponId);
  return cap(pack?.ammoReserves?.[weaponId]??0);
}
const idOf=(category,key)=>category+':'+key;
const templates=new Map();
const weaponWeights=Object.freeze({
  'scrap-pistol':4,'10mm-pistol':4.5,'pipe-pistol':4.1,'pipe-rifle':7.8,
  'laser-musket':8.6,'double-barrel-shotgun':11.2,
  'pump-action-shotgun':12.5,'bolt-hunting-rifle':12.8,
  'iron-revolver':5.3,'pipe-smg':8.4,'heavy-sniper':17.5
});
const zoneWeight={head:.55,chest:1.8,leftArm:.75,rightArm:.75,leftLeg:.95,rightLeg:.95};
const roundedWeight=n=>Math.round(n*10)/10;
for(const spec of ARSENAL)templates.set(idOf('weapon',spec.id),Object.freeze({
  id:idOf('weapon',spec.id),category:'weapon',key:spec.id,name:spec.name,
  rarity:spec.id==='hunting-rifle'?'rare':spec.id==='service-carbine'?'uncommon':'common',
  value:spec.kind==='rifle'?180:spec.kind==='carbine'?105:spec.kind==='shotgun'?88:55,
  weight:weaponWeights[spec.id]??8,maxStack:1}));
for(const spec of ARSENAL)templates.set(idOf('ammo',spec.id),Object.freeze({
  id:idOf('ammo',spec.id),category:'ammo',key:spec.id,
  name:spec.name+' Ammo',rarity:'common',value:2,weight:0,maxStack:180}));
for(const slot of ARMOR_SLOTS){
  for(const piece of ['scrap','ranger','militia','citadel']){
    const p=getArmorPiece(slot,piece+'-'+slot);
    const rarity=piece==='citadel'?'epic':piece==='militia'?'rare':
      piece==='ranger'?'uncommon':'common';
    templates.set(idOf('armor',p.id),Object.freeze({
      id:idOf('armor',p.id),category:'armor',key:p.id,slot,name:p.name,
      rarity,value:Math.round(p.points*(piece==='citadel'?3.1:piece==='militia'?2:
        piece==='ranger'?1.5:1)),
      weight:roundedWeight(({scrap:3,ranger:4.2,militia:5.5,citadel:7.5}[piece])*
        zoneWeight[slot]),maxStack:1}));
  }
}
// Wearables are cosmetic and separate from protective head/chest armor.
export const CLOTHING_GEAR=Object.freeze({
  'field-cap':Object.freeze({id:'clothing:field-cap',category:'clothing',
    key:'field-cap',slot:'head',name:'Wasteland Field Cap',
    rarity:'common',value:18,weight:.5,maxStack:1}),
  'field-backpack':Object.freeze({id:'clothing:field-backpack',
    category:'clothing',key:'field-backpack',slot:'back',
    name:'Canvas Field Backpack',rarity:'uncommon',value:48,weight:2.5,
    carryBonus:FIELD_BACKPACK_BONUS,maxStack:1})
});
for(const clothing of Object.values(CLOTHING_GEAR))
  templates.set(clothing.id,clothing);
// Genuine collectible parts; each copy has independent condition.
for(const slot of POWER_ARMOR_SLOTS){
  for(const tier of ['scrap','ranger','citadel','t45','t60','t01']){
    const plate=POWER_ARMOR_PLATES[tier],id='power-plate:'+tier+'-'+slot;
    templates.set(id,Object.freeze({id,category:'power-plate',key:tier+'-'+slot,
      tier,slot,name:plate.name+' · '+slot,
      rarity:tier==='t01'||tier==='citadel'?'epic':
        tier==='t60'||tier==='ranger'?'rare':'uncommon',
      value:Math.round(plate.points*2.1),
      weight:roundedWeight(({scrap:9,ranger:11,citadel:13,t45:14,t60:17,t01:20}[tier])*
        zoneWeight[slot]),maxDurability:plate.maxDurability,maxStack:1}));
  }
}
templates.set('supply:fusion-core',Object.freeze({
  id:'supply:fusion-core',category:'fusion-core',key:'fusion-core',
  name:'Fusion Core',rarity:'rare',value:220,weight:4,maxStack:1}));
templates.set('supply:medkit',Object.freeze({
  id:'supply:medkit',category:'supply',key:'medkit',name:'Field Medkit',
  rarity:'uncommon',value:35,weight:.5,maxStack:6,heal:40}));
templates.set('supply:rad-flush',Object.freeze({
  id:'supply:rad-flush',category:'supply',key:'rad-flush',name:'Radiation Flush',
  rarity:'uncommon',value:90,weight:.5,maxStack:6,radCure:300}));
// These are fully physical aid stacks with the same weight, vendor, loot,
// crafting-wallet and save rules as existing medical supplies.
for(const item of [
  {key:'clean-water',name:'Purified Field Water',value:20,weight:.5,
    rarity:'common',heal:20,maxStack:10},
  {key:'trail-stew',name:'Canned Trail Stew',value:24,weight:1,
    rarity:'common',heal:30,radDose:5,maxStack:8},
  {key:'dirty-water',name:'Contaminated Water',value:7,weight:.5,
    rarity:'common',heal:10,radDose:15,maxStack:10},
  {key:'combat-stim',name:'Combat Stimulant',value:110,weight:.2,
    rarity:'rare',effectKey:'combat-stim',effectSeconds:60,
    effectSummary:'+20% firearm damage for 60s',maxStack:6},
  {key:'focus-tonic',name:'Focus Tonic',value:95,weight:.2,
    rarity:'uncommon',effectKey:'focus-tonic',effectSeconds:75,
    effectSummary:'+12 V.A.T.S. hit chance for 75s',maxStack:6},
  {key:'rad-shield',name:'Rad Shield',value:85,weight:.2,
    rarity:'uncommon',effectKey:'rad-shield',effectSeconds:120,
    effectSummary:'35% radiation resistance for 120s',maxStack:6}
])templates.set('supply:'+item.key,Object.freeze({
  id:'supply:'+item.key,category:'supply',...item}));
templates.set('supply:salvage',Object.freeze({
  id:'supply:salvage',category:'supply',key:'salvage',name:'Salvaged Parts',
  rarity:'common',value:12,weight:1,maxStack:40}));
templates.set('supply:optic-glass',Object.freeze({
  id:'supply:optic-glass',category:'supply',key:'optic-glass',name:'Optic Glass',
  rarity:'uncommon',value:25,weight:.5,maxStack:30}));
const componentWeights=Object.freeze({
  concrete:1,steel:.3,wood:.4,lead:.4,glass:.3,ceramic:.3,gears:.3,
  aluminum:.2,copper:.2,oil:.3,rubber:.2,plastic:.1,cloth:.1,
  bone:.2,leather:.2,crystal:.1,gold:.2,silver:.2
});
for(const component of CRAFTING_COMPONENTS)
  templates.set(component.id,Object.freeze({...component,
    weight:componentWeights[component.key]??.1}));
export const ITEM_CATALOG=Object.freeze(Object.fromEntries(templates));
const itemBalance = new Map();
export function applyItemBalance(changes = {}) {
  itemBalance.clear();
  for (const [id, patch] of Object.entries(changes)) {
    if (!templates.has(id)) continue;
    const safe = {};
    for (const field of ['value', 'heal', 'buyPrice', 'sellPrice', 'maxDurability'])
      if (typeof patch[field] === 'number' && Number.isFinite(patch[field]))
        safe[field] = patch[field];
    if (Object.keys(safe).length) itemBalance.set(id, safe);
  }
}
export function getItem(id){
  const item=templates.get(id);
  if(!item)throw Error('Unknown loot item: '+id);
  const patch=itemBalance.get(id);
  return patch ? {...item, ...patch} : item;
}
export function createBackpack(){
  return {items:[],slotBonus:0,materials:{},ammoReserves:Object.fromEntries(ARSENAL.map(spec=>
    [spec.id,spec.startingReserve])),equipment:{weapon:'scrap-pistol',
    armor:createLoadout('none'),clothing:{head:'none',back:'none'},optics:{},weaponMods:{}},
    unlockedOptics:{},unlockedWeaponMods:{},nextId:1};
}
export function inventorySlotsUsed(pack){return pack.items.length;}
export function inventoryWeight(pack){
  if(!pack)return 0;
  let weight=0;
  for(const entry of pack.items||[]){
    const item=templates.get(entry.itemId);
    if(item)weight+=item.weight*cap(entry.quantity);
  }
  for(const component of CRAFTING_COMPONENTS)
    weight+=getItem(component.id).weight*cap(pack.materials?.[component.id]??0);
  for(const spec of ARSENAL)
    weight+=getItem('ammo:'+spec.id).weight*cap(pack.ammoReserves?.[spec.id]??0);
  return Math.round(weight*10)/10;
}
export function totalInventoryValue(pack){
  return pack.items.reduce((sum,entry)=>sum+getItem(entry.itemId).value*entry.quantity,0)+
    CRAFTING_COMPONENTS.reduce((sum,item)=>sum+getItem(item.id).value*countItem(pack,item.id),0);
}
export function countItem(pack,itemId){
  const item=getItem(itemId);
  if(item.category==='material')return cap(pack?.materials?.[itemId]??0);
  if(item.category==='ammo')return ammoReserve(pack,item.key);
  return pack.items.filter(e=>e.itemId===itemId).reduce((n,e)=>n+e.quantity,0);
}
export function addItem(pack,itemId,quantity=1,condition={}){
  const template=getItem(itemId);let remaining=cap(quantity);
  const addedStart=remaining;
  // Ammunition lives in the correct weapon's reserve, never a backpack slot.
  if(template.category==='ammo'){
    pack.ammoReserves??={};
    const current=cap(pack.ammoReserves[template.key]??0);
    const added=Math.min(remaining,Number.MAX_SAFE_INTEGER-current);
    pack.ammoReserves[template.key]=current+added;
    return {added,leftover:remaining-added,full:remaining>added};
  }
  if(template.category==='material'){
    pack.materials??={};
    const current=cap(pack.materials[itemId]??0);
    const added=Math.min(remaining,999999-current);
    pack.materials[itemId]=current+Math.max(0,added);
    return {added:Math.max(0,added),leftover:remaining-Math.max(0,added),full:remaining>added};
  }
  if(template.maxStack>1){
    for(const e of pack.items){
      if(e.itemId!==itemId)continue;
      const n=Math.min(remaining,template.maxStack-e.quantity);
      e.quantity+=n;remaining-=n;
      if(!remaining)break;
    }
  }
  // Encumbrance restricts movement, not picking up or storing possessions.
  while(remaining&&pack.items.length<MAX_SAFETY_ENTRIES){
    const n=Math.min(remaining,template.maxStack);
    const entry={uid:'i'+pack.nextId++,itemId,quantity:n};
    if(template.category==='power-plate')
      entry.condition=Math.max(0,Math.min(template.maxDurability,
        Number.isFinite(condition.condition)?condition.condition:template.maxDurability));
    if(template.category==='fusion-core')
      entry.charge=Math.max(0,Math.min(FUSION_CORE_CAPACITY,
        Number.isFinite(condition.charge)?condition.charge:FUSION_CORE_CAPACITY));
    pack.items.push(entry);
    remaining-=n;
  }
  return {added:addedStart-remaining,leftover:remaining,full:remaining>0};
}
export function removeItem(pack,uid,quantity=1){
  const index=pack.items.findIndex(e=>e.uid===uid);
  if(index<0)return {removed:0,itemId:null};
  const entry=pack.items[index];
  const n=Math.min(entry.quantity,cap(quantity));
  entry.quantity-=n;
  if(entry.quantity<=0)pack.items.splice(index,1);
  return {removed:n,itemId:entry.itemId,
    ...(Number.isFinite(entry.condition)?{condition:entry.condition}:{}),
    ...(Number.isFinite(entry.charge)?{charge:entry.charge}:{})};
}

export function spendMaterial(pack,itemId,quantity=1){
  const component=getItem(itemId);
  if(component.category!=='material')return {removed:0,itemId};
  const removed=Math.min(countItem(pack,itemId),cap(quantity));
  if(removed&&pack.materials){
    pack.materials[itemId]-=removed;
    if(!pack.materials[itemId])delete pack.materials[itemId];
  }
  return {removed,itemId};
}

// An attachment is paid for once, then can be swapped freely on its weapon.
// All costs come from genuine backpack material stacks.
export function installWeaponOptic(pack,weaponId,opticId,craftDiscount=0){
  getWeaponSpec(weaponId);
  if(!compatibleOptics(weaponId).includes(opticId))
    return {ok:false,reason:'incompatible'};
  const mod=OPTIC_MODS[opticId],owned=pack.unlockedOptics?.[weaponId]||[];
  const crafting=opticId!=='factory'&&!owned.includes(opticId);
  if(crafting){
    // Real materials only; virtual salvage cannot replace glass or circuitry.
    const base=OPTIC_COMPONENT_RECIPES[opticId];
    if(!base)return {ok:false,reason:'recipe'};
    const recipe=discountedComponentRecipe(base,craftDiscount);
    const missing=Object.entries(recipe).filter(([id,needed])=>countItem(pack,id)<needed)
      .map(([id,required])=>({itemId:id,required,owned:countItem(pack,id)}));
    if(missing.length)return {ok:false,reason:'materials',missing};
    for(const [id,needed] of Object.entries(recipe))spendMaterial(pack,id,needed);
    if(!pack.unlockedOptics)pack.unlockedOptics={};
    pack.unlockedOptics[weaponId]=[...owned,opticId];
  }
  if(!pack.equipment.optics)pack.equipment.optics={};
  pack.equipment.optics[weaponId]=opticId;
  return {ok:true,crafted:crafting,opticId};
}
export function installedWeaponOptic(pack,weaponId){
  const chosen=pack?.equipment?.optics?.[weaponId]||'factory';
  return compatibleOptics(weaponId).includes(chosen)&&
    (chosen==='factory'||pack?.unlockedOptics?.[weaponId]?.includes(chosen))?
    chosen:'factory';
}

export function equipFromInventory(pack,uid){
  const entry=pack.items.find(e=>e.uid===uid);
  if(!entry)return {ok:false,reason:'missing'};
  const item=getItem(entry.itemId);
  if(item.category==='weapon'){
    pack.equipment.weapon=getWeaponSpec(item.key).id;
    return {ok:true,category:'weapon',key:item.key};
  }
  if(item.category==='armor'){
    pack.equipment.armor[item.slot]=getArmorPiece(item.slot,item.key).id;
    if(item.slot==='head'&&pack.equipment.clothing)
      pack.equipment.clothing.head='none'; // helmet replaces cap
    return {ok:true,category:'armor',slot:item.slot,key:item.key};
  }
  if(item.category==='clothing'){
    pack.equipment.clothing??={head:'none',back:'none'};
    pack.equipment.clothing[item.slot]=item.key;
    if(item.slot==='head')pack.equipment.armor.head='none'; // cap replaces helmet
    return {ok:true,category:'clothing',slot:item.slot,key:item.key};
  }
  return {ok:false,reason:'not-equippable'};
}
// Removing worn armor or clothing never destroys the inventory item.
export function unequipWearable(pack,category,slot){
  if(category==='armor'&&ARMOR_SLOTS.includes(slot)){
    const previous=pack.equipment.armor[slot];
    pack.equipment.armor[slot]='none';
    return {ok:true,previous,category,slot};
  }
  if(category==='clothing'&&['head','back'].includes(slot)){
    pack.equipment.clothing??={head:'none',back:'none'};
    const previous=pack.equipment.clothing[slot];
    pack.equipment.clothing[slot]='none';
    return {ok:true,previous,category,slot};
  }
  return {ok:false,reason:'invalid-slot'};
}
export function useSupply(pack,uid,health,{injuryNeedsCare=false}={}){
  const entry=pack.items.find(e=>e.uid===uid);
  if(!entry)return {ok:false,reason:'missing'};
  const item=getItem(entry.itemId);
  if(item.id!=='supply:medkit')return {ok:false,reason:'not-medkit'};
  if(!health.alive||(health.health>=health.maxHealth&&!injuryNeedsCare))
    return {ok:false,reason:'no-healing-needed'};
  const restored=Math.min(item.heal,health.maxHealth-health.health);
  health.health+=restored;
  removeItem(pack,uid,1);
  return {ok:true,restored};
}
export function playerArmorReduction(pack,zone='chest'){
  const slot=ARMOR_SLOTS.includes(zone)?zone:'chest';
  const piece=getArmorPiece(slot,pack.equipment.armor[slot]);
  const reduction=damageReductionForPoints(piece.points);
  return {slot,points:piece.points,reduction,piece};
}
export function createLootBag(id,x,z,contents,source='world'){
  const items=[];
  for(const entry of contents||[]){
    if(!entry||!Number.isFinite(entry.quantity)||entry.quantity<=0)continue;
    getItem(entry.itemId);
    items.push({itemId:entry.itemId,quantity:cap(entry.quantity),
      ...(Number.isFinite(entry.condition)?{condition:entry.condition}:{}),
      ...(Number.isFinite(entry.charge)?{charge:entry.charge}:{})});
  }
  return {id,x,z,source,items,opened:false};
}
export function takeQuantityFromBag(pack,bag,index,quantity){
  return moveLootQuantity(bag,index,quantity,(entry,amount)=>
    addItem(pack,entry.itemId,amount,entry));
}
export function takeFromBag(pack,bag,index){
  return takeQuantityFromBag(pack,bag,index,bag?.items?.[index]?.quantity??0);
}
export function takeAllFromBag(pack,bag){
  return moveAllLoot(bag,(entry,amount)=>
    addItem(pack,entry.itemId,amount,entry));
}
export function generateEnemyLoot(enemyId,round=0,loadout=null,random=Math.random,
  visiblyEquippedPowerArmor=null){
  // Armor is rolled from the NPC's real visible loadout, but only a small
  // subset survives as loot. High-tier full suits are never guaranteed.
  const base={
    scout:[{itemId:'ammo:pipe-smg',quantity:22},
      {itemId:'supply:medkit',quantity:1},
      {itemId:'supply:salvage',quantity:2},
       {itemId:'supply:optic-glass',quantity:1}],
    raider:[{itemId:'weapon:pipe-smg',quantity:1},
      {itemId:'ammo:pipe-smg',quantity:40},
       {itemId:'supply:salvage',quantity:3},
       {itemId:'supply:optic-glass',quantity:1}],
    enforcer:[{itemId:'weapon:service-carbine',quantity:1},
      {itemId:'ammo:service-carbine',quantity:45},
      {itemId:'supply:medkit',quantity:1},
       {itemId:'supply:salvage',quantity:4},
       {itemId:'supply:optic-glass',quantity:2}]
  };
  if(!base[enemyId])throw Error('Unknown raider: '+enemyId);
  const equipped=createLoadout(loadout||enemyArmorForRound(enemyId,round));
  const worn=ARMOR_SLOTS.filter(slot=>equipped[slot]!=='none')
    .map(slot=>({itemId:'armor:'+equipped[slot],quantity:1}));
  // Scouts can yield zero or one piece, raiders one or two, and a fully
  // equipped Citadel enforcer at most one (or sometimes none).
  const roll=()=>{
    const value=Number(random());
    return Number.isFinite(value)?Math.max(0,Math.min(.999999,value)):0;
  };
  const chance=roll();
  const desired=enemyId==='scout'?(chance<.35?0:1):
    enemyId==='raider'?(chance<.75?1:2):(chance<.4?0:1);
  const count=Math.min(desired,worn.length);
  for(let i=0;i<count;i++){
    const j=i+Math.floor(roll()*(worn.length-i));
    [worn[i],worn[j]]=[worn[j],worn[i]];
  }
  const armor=worn.slice(0,count);
  for(const entry of armor)getItem(entry.itemId);
  // Field wearables are genuine loot rather than welded-on player props.
  const wearables=enemyId==='scout'?
    [{itemId:'clothing:field-cap',quantity:1}]:
    enemyId==='raider'?
    [{itemId:'clothing:field-backpack',quantity:1}]:[];
  const scrap=generateComponentDrop(enemyId,random);
  // Never award an armor part to an enemy who was not actually wearing it.
  const powerSalvage=salvageWornPowerArmor(visiblyEquippedPowerArmor,random);
  return [...base[enemyId].map(e=>({...e})),...armor,...wearables,
    ...(scrap?[scrap]:[]),...powerSalvage];
}
export function safeBackpackSnapshot(pack){
  const result=createBackpack();
  if(!pack||!Array.isArray(pack.items))return result;
  result.slotBonus=Number.isSafeInteger(pack.slotBonus)?
    Math.max(0,Math.min(4,pack.slotBonus)):0;
  // W09.8: preserve saved reserves; old saves held loose ammo as inventory
  // stacks, so the addItem loop below migrates those stacks automatically.
  for(const spec of ARSENAL){
    const saved=pack.ammoReserves?.[spec.id];
    if(Number.isSafeInteger(saved)&&saved>=0)result.ammoReserves[spec.id]=saved;
  }
  for(const component of CRAFTING_COMPONENTS){
    const saved=pack.materials?.[component.id];
    if(Number.isSafeInteger(saved)&&saved>0)addItem(result,component.id,Math.min(saved,999999));
  }
  for(const e of pack.items){
    if(!templates.has(e?.itemId))continue;
    addItem(result,e.itemId,Math.min(cap(e.quantity),180),e);
  }
  if(templates.has('weapon:'+pack.equipment?.weapon))
    result.equipment.weapon=pack.equipment.weapon;
  safeWeaponMods(result,pack);
  for(const spec of ARSENAL){
    const valid=compatibleOptics(spec.id);
    const unlocked=pack.unlockedOptics?.[spec.id];
    if(Array.isArray(unlocked)){
      result.unlockedOptics[spec.id]=[...new Set(unlocked.filter(
        id=>id!=='factory'&&valid.includes(id)))];
    }
    const selected=pack.equipment?.optics?.[spec.id];
    if(selected==='factory'||result.unlockedOptics[spec.id]?.includes(selected))
      result.equipment.optics[spec.id]=selected;
  }
  for(const slot of ARMOR_SLOTS){
    const id=pack.equipment?.armor?.[slot];
    try{
      if(id&&id!=='none'&&countItem(result,'armor:'+id)>0)
        result.equipment.armor[slot]=getArmorPiece(slot,id).id;
    }catch{}
  }
  for(const slot of ['head','back']){
    const key=pack.equipment?.clothing?.[slot];
    const piece=CLOTHING_GEAR[key];
    if(piece?.slot===slot&&countItem(result,piece.id)>0&&
        (slot!=='head'||result.equipment.armor.head==='none'))
      result.equipment.clothing[slot]=key;
  }
  return result;
}

