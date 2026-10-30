// W06.0 original RPG loot and inventory rules. Pure game-state logic.
import {ARSENAL,getWeaponSpec} from './weapons.mjs';
import {ARMOR_SLOTS,getArmorPiece,createLoadout,damageReductionForPoints} from './combat.mjs';
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
  for(const piece of ['ranger','militia','citadel']){
    const p=getArmorPiece(slot,piece+'-'+slot);
    const rarity=piece==='citadel'?'epic':piece==='militia'?'rare':'uncommon';
    templates.set(idOf('armor',p.id),Object.freeze({
      id:idOf('armor',p.id),category:'armor',key:p.id,slot,name:p.name,
      rarity,value:Math.round(p.points*(piece==='citadel'?3.1:piece==='militia'?2:1.5)),
      maxStack:1}));
  }
}
templates.set('supply:medkit',Object.freeze({
  id:'supply:medkit',category:'supply',key:'medkit',name:'Field Medkit',
  rarity:'uncommon',value:35,maxStack:6,heal:40}));
templates.set('supply:salvage',Object.freeze({
  id:'supply:salvage',category:'supply',key:'salvage',name:'Salvaged Parts',
  rarity:'common',value:12,maxStack:40}));
export const ITEM_CATALOG=Object.freeze(Object.fromEntries(templates));
export function getItem(id){
  const item=templates.get(id);
  if(!item)throw Error('Unknown loot item: '+id);
  return item;
}
export function createBackpack(){
  return {items:[],equipment:{weapon:'scrap-pistol',armor:createLoadout('none')},
    nextId:1};
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
  return {ok:false,reason:'not-equippable'};
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
export function generateEnemyLoot(enemyId,deathNumber=0){
  // Deterministic, testable first-kill drops with varying rarities.
  // A reset creates a new test round rather than duplicating a corpse.
  const base={
    scout:[{itemId:'ammo:pipe-smg',quantity:22},
      {itemId:'supply:medkit',quantity:1},
      {itemId:'supply:salvage',quantity:2}],
    raider:[{itemId:'weapon:pipe-smg',quantity:1},
      {itemId:'ammo:pipe-smg',quantity:40},
      {itemId:'armor:ranger-chest',quantity:1}],
    enforcer:[{itemId:'weapon:service-carbine',quantity:1},
      {itemId:'ammo:service-carbine',quantity:45},
      {itemId:'armor:militia-chest',quantity:1},
      {itemId:'supply:medkit',quantity:1}]
  };
  if(!base[enemyId])throw Error('Unknown raider: '+enemyId);
  return base[enemyId].map(e=>({...e}));
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
  for(const slot of ARMOR_SLOTS){
    const id=pack.equipment?.armor?.[slot];
    try{
      if(id&&id!=='none'&&countItem(result,'armor:'+id)>0)
        result.equipment.armor[slot]=getArmorPiece(slot,id).id;
    }catch{}
  }
  return result;
}
