// W06.0 original RPG loot and inventory rules. Pure game-state logic.
import {ARSENAL,getWeaponSpec} from './weapons.mjs';
import {OPTIC_MODS,compatibleOptics} from './weapon-sights.mjs';
import {ARMOR_SLOTS,getArmorPiece,createLoadout,damageReductionForPoints,
  enemyArmorForRound} from './combat.mjs';
export const BACKPACK_LIMIT=30;
export const RARITIES=Object.freeze({
  common:Object.freeze({label:'COMMON',color:'#a8b7af',multiplier:1}),
  uncommon:Object.freeze({label:'UNCOMMON',color:'#8bd4a1',multiplier:1.6}),
  rare:Object.freeze({label:'RARE',color:'#86b9ff',multiplier:2.6}),
  epic:Object.freeze({label:'EPIC',color:'#d2a5fb',multiplier:4.2})
});
const cap=(n)=>Math.max(0,Math.floor(Number.isFinite(n)?n:0));
const idOf=(category,key)=>category+':'+key;
const templates=new Map();
for(const spec of ARSENAL)templates.set(idOf('weapon',spec.id),Object.freeze({
  id:idOf('weapon',spec.id),category:'weapon',key:spec.id,name:spec.name,
  rarity:spec.id==='hunting-rifle'?'rare':spec.id==='service-carbine'?'uncommon':'common',
  value:spec.kind==='rifle'?180:spec.kind==='carbine'?105:spec.kind==='shotgun'?88:55,
  maxStack:1}));
for(const spec of ARSENAL)templates.set(idOf('ammo',spec.id),Object.freeze({
  id:idOf('ammo',spec.id),category:'ammo',key:spec.id,
  name:spec.name+' Ammo',rarity:'common',value:2,maxStack:180}));
for(const slot of ARMOR_SLOTS){
  for(const piece of ['scrap','ranger','militia','citadel']){
    const p=getArmorPiece(slot,piece+'-'+slot);
    const rarity=piece==='citadel'?'epic':piece==='militia'?'rare':
      piece==='ranger'?'uncommon':'common';
    templates.set(idOf('armor',p.id),Object.freeze({
      id:idOf('armor',p.id),category:'armor',key:p.id,slot,name:p.name,
      rarity,value:Math.round(p.points*(piece==='citadel'?3.1:piece==='militia'?2:
        piece==='ranger'?1.5:1)),
      maxStack:1}));
  }
}
// Wearables are cosmetic and separate from protective head/chest armor.
export const CLOTHING_GEAR=Object.freeze({
  'field-cap':Object.freeze({id:'clothing:field-cap',category:'clothing',
    key:'field-cap',slot:'head',name:'Wasteland Field Cap',
    rarity:'common',value:18,maxStack:1}),
  'field-backpack':Object.freeze({id:'clothing:field-backpack',
    category:'clothing',key:'field-backpack',slot:'back',
    name:'Canvas Field Backpack',rarity:'uncommon',value:48,maxStack:1})
});
for(const clothing of Object.values(CLOTHING_GEAR))
  templates.set(clothing.id,clothing);
templates.set('supply:medkit',Object.freeze({
  id:'supply:medkit',category:'supply',key:'medkit',name:'Field Medkit',
  rarity:'uncommon',value:35,maxStack:6,heal:40}));
templates.set('supply:salvage',Object.freeze({
  id:'supply:salvage',category:'supply',key:'salvage',name:'Salvaged Parts',
  rarity:'common',value:12,maxStack:40}));
templates.set('supply:optic-glass',Object.freeze({
  id:'supply:optic-glass',category:'supply',key:'optic-glass',name:'Optic Glass',
  rarity:'uncommon',value:25,maxStack:30}));
export const ITEM_CATALOG=Object.freeze(Object.fromEntries(templates));
export function getItem(id){
  const item=templates.get(id);
  if(!item)throw Error('Unknown loot item: '+id);
  return item;
}
export function createBackpack(){
  return {items:[],equipment:{weapon:'scrap-pistol',
    armor:createLoadout('none'),clothing:{head:'none',back:'none'},optics:{}},
    unlockedOptics:{},nextId:1};
}
export function inventorySlotsUsed(pack){return pack.items.length;}
export function totalInventoryValue(pack){
  return pack.items.reduce((sum,entry)=>sum+getItem(entry.itemId).value*entry.quantity,0);
}
export function countItem(pack,itemId){
  return pack.items.filter(e=>e.itemId===itemId).reduce((n,e)=>n+e.quantity,0);
}
export function addItem(pack,itemId,quantity=1){
  const template=getItem(itemId);let remaining=cap(quantity);
  const addedStart=remaining;
  if(template.maxStack>1){
    for(const e of pack.items){
      if(e.itemId!==itemId)continue;
      const n=Math.min(remaining,template.maxStack-e.quantity);
      e.quantity+=n;remaining-=n;
      if(!remaining)break;
    }
  }
  while(remaining&&pack.items.length<BACKPACK_LIMIT){
    const n=Math.min(remaining,template.maxStack);
    pack.items.push({uid:'i'+pack.nextId++,itemId,quantity:n});
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
  return {removed:n,itemId:entry.itemId};
}

// An attachment is paid for once, then can be swapped freely on its weapon.
// All costs come from genuine backpack material stacks.
export function installWeaponOptic(pack,weaponId,opticId){
  getWeaponSpec(weaponId);
  if(!compatibleOptics(weaponId).includes(opticId))
    return {ok:false,reason:'incompatible'};
  const mod=OPTIC_MODS[opticId],owned=pack.unlockedOptics?.[weaponId]||[];
  const crafting=opticId!=='factory'&&!owned.includes(opticId);
  if(crafting){
    const missing=[];
    for(const [material,needed] of Object.entries(mod.cost)){
      const itemId=material==='glass'?'supply:optic-glass':'supply:salvage';
      if(countItem(pack,itemId)<needed)missing.push(itemId);
    }
    if(missing.length)return {ok:false,reason:'materials',missing};
    for(const [material,needed] of Object.entries(mod.cost)){
      let remaining=needed;
      const itemId=material==='glass'?'supply:optic-glass':'supply:salvage';
      for(const entry of [...pack.items]){
        if(entry.itemId!==itemId||!remaining)continue;
        remaining-=removeItem(pack,entry.uid,remaining).removed;
      }
    }
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
    return {ok:true,category:'armor',slot:item.slot,key:item.key};
  }
  if(item.category==='clothing'){
    pack.equipment.clothing??={head:'none',back:'none'};
    pack.equipment.clothing[item.slot]=item.key;
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
export function useSupply(pack,uid,health){
  const entry=pack.items.find(e=>e.uid===uid);
  if(!entry)return {ok:false,reason:'missing'};
  const item=getItem(entry.itemId);
  if(item.id!=='supply:medkit')return {ok:false,reason:'not-medkit'};
  if(!health.alive||health.health>=health.maxHealth)return {ok:false,reason:'no-healing-needed'};
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
    items.push({itemId:entry.itemId,quantity:cap(entry.quantity)});
  }
  return {id,x,z,source,items,opened:false};
}
export function takeFromBag(pack,bag,index){
  const entry=bag?.items?.[index];if(!entry)return {added:0,leftover:0};
  const result=addItem(pack,entry.itemId,entry.quantity);
  entry.quantity=result.leftover;
  if(entry.quantity===0)bag.items.splice(index,1);
  bag.opened=true;
  return {...result,itemId:entry.itemId};
}
export function takeAllFromBag(pack,bag){
  let added=0;
  for(let i=0;i<bag.items.length;){
    const r=takeFromBag(pack,bag,i);
    added+=r.added;
    if(r.leftover)i++; // inventory full, but later item might stack
  }
  return {added,remaining:bag.items.reduce((n,e)=>n+e.quantity,0)};
}
export function generateEnemyLoot(enemyId,round=0,loadout=null,random=Math.random){
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
  return [...base[enemyId].map(e=>({...e})),...armor,...wearables];
}
export function safeBackpackSnapshot(pack){
  const result=createBackpack();
  if(!pack||!Array.isArray(pack.items))return result;
  for(const e of pack.items){
    if(!templates.has(e?.itemId))continue;
    addItem(result,e.itemId,Math.min(cap(e.quantity),180));
  }
  if(templates.has('weapon:'+pack.equipment?.weapon))
    result.equipment.weapon=pack.equipment.weapon;
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
    if(piece?.slot===slot&&countItem(result,piece.id)>0)
      result.equipment.clothing[slot]=key;
  }
  return result;
}
