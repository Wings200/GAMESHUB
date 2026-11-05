// W20.56: test-field merchants. All transactions use existing inventory items
// and campaign caps; there is no second wallet or phantom equipment system.
import {getItem,addItem,removeItem} from './inventory.mjs';

export const VENDORS=Object.freeze([
  Object.freeze({id:'arms',name:'MARA',title:'ARMS DEALER',specialty:'Firearms & ammunition',
    x:-35,z:9,color:0xd7a26e,offers:Object.freeze([
      {itemId:'weapon:10mm-pistol',quantity:1},
      {itemId:'weapon:pipe-pistol',quantity:1},
      {itemId:'weapon:pipe-rifle',quantity:1},
      {itemId:'ammo:10mm-pistol',quantity:24},
      {itemId:'ammo:pipe-pistol',quantity:24},
      {itemId:'ammo:pipe-rifle',quantity:30}
    ])}),
  Object.freeze({id:'armor',name:'BRIGGS',title:'ARMORER',specialty:'Protective gear & chassis plates',
    x:-25,z:9,color:0x96b4cf,offers:Object.freeze([
      {itemId:'armor:scrap-chest',quantity:1},
      {itemId:'armor:ranger-head',quantity:1},
      {itemId:'armor:ranger-chest',quantity:1},
      {itemId:'armor:militia-chest',quantity:1},
      {itemId:'power-plate:t45-chest',quantity:1}
    ])}),
  Object.freeze({id:'medic',name:'DOC VALE',title:'FIELD MEDIC',specialty:'First aid & medical supplies',
    x:-15,z:9,color:0x9ad0a9,offers:Object.freeze([
      {itemId:'supply:medkit',quantity:1}
    ])}),
  Object.freeze({id:'scavenger',name:'WREN',title:'SALVAGE TRADER',specialty:'Parts, optics, clothing & cores',
    x:-5,z:9,color:0xdfc18c,offers:Object.freeze([
      {itemId:'supply:salvage',quantity:5},
      {itemId:'supply:optic-glass',quantity:2},
      {itemId:'clothing:field-cap',quantity:1},
      {itemId:'clothing:field-backpack',quantity:1},
      {itemId:'supply:fusion-core',quantity:1}
    ])})
]);

export const VENDOR_TEST_CREDIT=300;
const MAX_CAPS=100000000;
const copy=state=>JSON.parse(JSON.stringify(state));
const cap=n=>Number.isSafeInteger(n)&&n>=0?Math.min(MAX_CAPS,n):0;

export function vendorById(id){return VENDORS.find(v=>v.id===id)||null;}
export function vendorAccepts(vendorId,itemId){
  const vendor=vendorById(vendorId);
  if(!vendor)return false;
  let item;try{item=getItem(itemId);}catch{return false;}
  if(vendorId==='arms')return item.category==='weapon'||item.category==='ammo';
  if(vendorId==='armor')return item.category==='armor'||item.category==='power-plate';
  if(vendorId==='medic')return item.id==='supply:medkit';
  if(vendorId==='scavenger')return item.category==='clothing'||
    item.category==='fusion-core'||(item.category==='supply'&&item.key!=='medkit');
  return false;
}

export function vendorBuyPrice(itemId,quantity=1){
  if(!Number.isSafeInteger(quantity)||quantity<=0)return 0;
  return Math.max(1,Math.ceil(getItem(itemId).value*quantity*1.25));
}
export function vendorSellPrice(itemId,quantity=1){
  if(!Number.isSafeInteger(quantity)||quantity<=0)return 0;
  return Math.max(1,Math.floor(getItem(itemId).value*quantity*.45));
}

export function buyFromVendor(pack,caps,vendorId,itemId){
  const vendor=vendorById(vendorId);
  const offer=vendor?.offers.find(o=>o.itemId===itemId);
  if(!offer)return{ok:false,reason:'not-stocked'};
  const price=vendorBuyPrice(itemId,offer.quantity);
  if(cap(caps)<price)return{ok:false,reason:'insufficient-caps',price};
  const next=copy(pack);
  const added=addItem(next,itemId,offer.quantity);
  if(added.added!==offer.quantity)return{ok:false,reason:'full-backpack'};
  return{ok:true,pack:next,caps:cap(caps)-price,price,
    itemId,quantity:offer.quantity};
}

export function isEquippedItem(pack,entry){
  if(!entry)return false;
  const item=getItem(entry.itemId),gear=pack.equipment||{};
  const remaining=pack.items.filter(e=>e.itemId===entry.itemId)
    .reduce((total,e)=>total+e.quantity,0);
  if(remaining>entry.quantity)return false; // another identical copy remains
  if(item.category==='weapon')return gear.weapon===item.key;
  if(item.category==='armor')return gear.armor?.[item.slot]===item.key;
  if(item.category==='clothing')return gear.clothing?.[item.slot]===item.key;
  return false;
}

export function sellToVendor(pack,caps,vendorId,uid,quantity=1){
  const entry=pack.items.find(e=>e.uid===uid);
  if(!entry)return{ok:false,reason:'not-owned'};
  if(!vendorAccepts(vendorId,entry.itemId))return{ok:false,reason:'wrong-merchant'};
  if(!Number.isSafeInteger(quantity)||quantity<1||quantity>entry.quantity)
    return{ok:false,reason:'invalid-quantity'};
  if(isEquippedItem(pack,entry)&&quantity===entry.quantity)
    return{ok:false,reason:'equipped'};
  const price=vendorSellPrice(entry.itemId,quantity);
  if(cap(caps)>MAX_CAPS-price)return{ok:false,reason:'wallet-full'};
  const next=copy(pack);
  const sold=removeItem(next,uid,quantity);
  if(sold.removed!==quantity)return{ok:false,reason:'not-owned'};
  return{ok:true,pack:next,caps:cap(caps)+price,price,
    itemId:entry.itemId,quantity};
}

export function claimVendorTestCredit(caps,claimed){
  if(claimed)return{ok:false,reason:'already-claimed'};
  if(cap(caps)>MAX_CAPS-VENDOR_TEST_CREDIT)return{ok:false,reason:'wallet-full'};
  return{ok:true,caps:cap(caps)+VENDOR_TEST_CREDIT};
}
