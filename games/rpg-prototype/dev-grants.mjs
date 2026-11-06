// Developer inventory grants share the actual item catalog with gameplay.
// Never accept arbitrary names, IDs, quantities or wallet values from clients.
import {ITEM_CATALOG,addItem} from './inventory.mjs';
import {MOD_WEAPON_IDS} from './weapon-mods.mjs';

export const MAX_DEV_CAPS=100000000;
export const MAX_DEV_GRANT_QUANTITY=999;
const implementedWeapons=new Set(MOD_WEAPON_IDS);
export const DEV_ITEM_CATALOG=Object.freeze(Object.values(ITEM_CATALOG)
  .filter(item=>item.category!=='weapon'&&item.category!=='ammo'||
    implementedWeapons.has(item.key))
  .map(item=>Object.freeze({id:item.id,name:item.name,category:item.category,
    maxStack:item.maxStack||1}))
  .sort((a,b)=>a.name.localeCompare(b.name)));
const lookup=new Map(DEV_ITEM_CATALOG.map(item=>[item.id,item]));

export function validateDeveloperGrant(body){
  if(!body||typeof body!=='object'||Array.isArray(body))
    throw Error('Invalid developer request.');
  if(body.action==='item'){
    const item=lookup.get(body.itemId);
    if(!item)throw Error('Unknown or unavailable item.');
    if(!Number.isSafeInteger(body.quantity)||body.quantity<1||
      body.quantity>MAX_DEV_GRANT_QUANTITY)
      throw Error('Quantity must be between 1 and 999.');
    return {action:'item',itemId:item.id,quantity:body.quantity};
  }
  if(body.action==='caps'){
    if(!Number.isSafeInteger(body.amount)||body.amount<1||body.amount>MAX_DEV_CAPS)
      throw Error('Caps amount must be between 1 and 100,000,000.');
    return {action:'caps',amount:body.amount};
  }
  throw Error('Unknown developer action.');
}

export function applyDeveloperGrant(pack,caps,request){
  const grant=validateDeveloperGrant(request);
  if(grant.action==='caps'){
    if(!Number.isSafeInteger(caps)||caps<0||caps>MAX_DEV_CAPS)
      throw Error('Invalid current wallet.');
    const added=Math.min(grant.amount,MAX_DEV_CAPS-caps);
    return {ok:added>0,added,caps:caps+added,pack,reason:added?'':'wallet-full'};
  }
  const next=JSON.parse(JSON.stringify(pack));
  const result=addItem(next,grant.itemId,grant.quantity);
  return {ok:result.added>0,added:result.added,leftover:result.leftover,
    caps,pack:next,reason:result.added?'':'inventory-full',itemId:grant.itemId};
}
