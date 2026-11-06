// W20.65: finite merchant stock with browser-local persistence. Trades use
// existing inventory items and campaign caps, never a second wallet.
import {getItem,addItem,removeItem,countItem,spendMaterial} from './inventory.mjs';
import {CRAFTING_COMPONENTS} from './materials.mjs';

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
  Object.freeze({id:'scavenger',name:'WREN',title:'SALVAGE TRADER',specialty:'31 components, optics, clothing & cores',
    x:-5,z:9,color:0xdfc18c,offers:Object.freeze([
      ...CRAFTING_COMPONENTS.map(item=>({itemId:item.id,quantity:item.rarity==='epic'?1:item.rarity==='rare'?2:5})),
      {itemId:'supply:salvage',quantity:5},
      {itemId:'supply:optic-glass',quantity:2},
      {itemId:'clothing:field-cap',quantity:1},
      {itemId:'clothing:field-backpack',quantity:1},
      {itemId:'supply:fusion-core',quantity:1}
    ])})
]);

const MAX_CAPS=100000000;
const MAX_STOCK=100000;
const copy=state=>JSON.parse(JSON.stringify(state));
const cap=n=>Number.isSafeInteger(n)&&n>=0?Math.min(MAX_CAPS,n):0;
const stockBundles=Object.freeze({weapon:2,ammo:8,armor:2,
  'power-plate':1,supply:6,'fusion-core':3,material:10,clothing:2});

export function createVendorStock(){
  return Object.fromEntries(VENDORS.map(vendor=>[vendor.id,
    Object.fromEntries(vendor.offers.map(offer=>[
      offer.itemId,Math.min(MAX_STOCK,offer.quantity*
        (stockBundles[getItem(offer.itemId).category]??4))]))]));
}
export function safeVendorStockSnapshot(saved){
  const stock=createVendorStock();
  if(!saved||typeof saved!=='object'||Array.isArray(saved))return stock;
  for(const vendor of VENDORS){
    for(const offer of vendor.offers){
      const value=saved[vendor.id]?.[offer.itemId];
      if(Number.isSafeInteger(value)&&value>=0)
        stock[vendor.id][offer.itemId]=Math.min(MAX_STOCK,value);
    }
  }
  return stock;
}
export function vendorStockRemaining(stock,vendorId,itemId){
  const vendor=vendorById(vendorId);
  if(!vendor?.offers.some(offer=>offer.itemId===itemId))return 0;
  const value=stock?.[vendorId]?.[itemId];
  return Number.isSafeInteger(value)&&value>=0?Math.min(MAX_STOCK,value):0;
}
function adjustStock(stock,vendorId,itemId,amount){
  const next=safeVendorStockSnapshot(stock);
  if(Object.hasOwn(next[vendorId]||{},itemId))
    next[vendorId][itemId]=Math.max(0,Math.min(MAX_STOCK,
      next[vendorId][itemId]+amount));
  return next;
}

export function vendorById(id){return VENDORS.find(v=>v.id===id)||null;}
export function vendorAccepts(vendorId,itemId){
  const vendor=vendorById(vendorId);
  if(!vendor)return false;
  let item;try{item=getItem(itemId);}catch{return false;}
  if(vendorId==='arms')return item.category==='weapon'||item.category==='ammo';
  if(vendorId==='armor')return item.category==='armor'||item.category==='power-plate';
  if(vendorId==='medic')return item.id==='supply:medkit';
  if(vendorId==='scavenger')return item.category==='clothing'||
    item.category==='fusion-core'||item.category==='material'||
    (item.category==='supply'&&item.key!=='medkit');
  return false;
}

export function vendorBuyPrice(itemId,quantity=1){
  if(!Number.isSafeInteger(quantity)||quantity<=0)return 0;
  const item=getItem(itemId);
  return Math.max(1,Math.ceil((item.buyPrice??item.value*1.25)*quantity));
}
export function vendorSellPrice(itemId,quantity=1){
  if(!Number.isSafeInteger(quantity)||quantity<=0)return 0;
  const item=getItem(itemId);
  return Math.max(1,Math.floor((item.sellPrice??item.value*.45)*quantity));
}

export function buyFromVendor(pack,caps,vendorId,itemId,
  stock=createVendorStock(),requestedQuantity=null){
  const vendor=vendorById(vendorId);
  const offer=vendor?.offers.find(o=>o.itemId===itemId);
  if(!offer)return{ok:false,reason:'not-stocked'};
  const available=vendorStockRemaining(stock,vendorId,itemId);
  if(available===0)return{ok:false,reason:'out-of-stock'};
  // Existing callers still purchase one offer bundle by default. The trade
  // terminal can request an exact quantity from the same finite stock.
  const quantity=requestedQuantity===null?
    Math.min(offer.quantity,available):requestedQuantity;
  if(!Number.isSafeInteger(quantity)||quantity<1)
    return{ok:false,reason:'invalid-quantity'};
  if(quantity>available)return{ok:false,reason:'out-of-stock'};
  const price=vendorBuyPrice(itemId,quantity);
  if(cap(caps)<price)return{ok:false,reason:'insufficient-caps',price};
  const next=copy(pack);
  const added=addItem(next,itemId,quantity);
  if(added.added!==quantity)return{ok:false,reason:'full-backpack'};
  return{ok:true,pack:next,caps:cap(caps)-price,price,
    stock:adjustStock(stock,vendorId,itemId,-quantity),
    itemId,quantity};
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

export function sellToVendor(pack,caps,vendorId,uid,quantity=1,
  stock=createVendorStock()){
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
    stock:adjustStock(stock,vendorId,entry.itemId,quantity),
    itemId:entry.itemId,quantity};
}

export function sellMaterialToVendor(pack,caps,vendorId,itemId,quantity=1,
  stock=createVendorStock()){
  let material;try{material=getItem(itemId);}catch{return{ok:false,reason:'not-owned'};}
  if(material.category!=='material'||!vendorAccepts(vendorId,itemId))
    return{ok:false,reason:'wrong-merchant'};
  if(!Number.isSafeInteger(quantity)||quantity<1||countItem(pack,itemId)<quantity)
    return{ok:false,reason:'invalid-quantity'};
  const price=vendorSellPrice(itemId,quantity);
  if(cap(caps)>MAX_CAPS-price)return{ok:false,reason:'wallet-full'};
  const next=copy(pack);
  if(spendMaterial(next,itemId,quantity).removed!==quantity)
    return{ok:false,reason:'not-owned'};
  return{ok:true,pack:next,caps:cap(caps)+price,price,
    stock:adjustStock(stock,vendorId,itemId,quantity),itemId,quantity};
}

// Ammunition uses reserves rather than inventory slots. Selling reserve
// rounds never affects the weapon's loaded magazine or an equipped item.
export function sellAmmoToVendor(pack,caps,vendorId,itemId,quantity=1,
  stock=createVendorStock()){
  let item;try{item=getItem(itemId);}catch{return{ok:false,reason:'not-owned'};}
  if(item.category!=='ammo'||!vendorAccepts(vendorId,itemId))
    return{ok:false,reason:'wrong-merchant'};
  if(!Number.isSafeInteger(quantity)||quantity<1||
     countItem(pack,itemId)<quantity)
    return{ok:false,reason:'invalid-quantity'};
  const price=vendorSellPrice(itemId,quantity);
  if(cap(caps)>MAX_CAPS-price)return{ok:false,reason:'wallet-full'};
  const next=copy(pack);
  next.ammoReserves[item.key]-=quantity;
  return{ok:true,pack:next,caps:cap(caps)+price,price,
    stock:adjustStock(stock,vendorId,itemId,quantity),itemId,quantity};
}

// A barter offer is only committed if every buy and sale succeeds. Run the
// offer against copied game state, then return one final snapshot. The same
// function can be used to preview the deal without changing live state.
export function executeVendorBarter(pack,caps,vendorId,stock,offer){
  if(!vendorById(vendorId))return{ok:false,reason:'wrong-merchant'};
  const sells=offer?.sells,buys=offer?.buys;
  if(!Array.isArray(sells)||!Array.isArray(buys)||
     (!sells.length&&!buys.length))
    return{ok:false,reason:'empty-trade'};
  let statePack=pack,stateCaps=caps,stateStock=stock;
  let paid=0,earned=0;
  const trades=[];
  for(const line of sells){
    let result;
    if(line?.type==='inventory')
      result=sellToVendor(statePack,stateCaps,vendorId,line.uid,
        line.quantity,stateStock);
    else if(line?.type==='material')
      result=sellMaterialToVendor(statePack,stateCaps,vendorId,line.itemId,
        line.quantity,stateStock);
    else if(line?.type==='ammo')
      result=sellAmmoToVendor(statePack,stateCaps,vendorId,line.itemId,
        line.quantity,stateStock);
    else return{ok:false,reason:'invalid-trade'};
    if(!result.ok)return{ok:false,reason:result.reason};
    statePack=result.pack;stateCaps=result.caps;stateStock=result.stock;
    earned+=result.price;
    trades.push({kind:'sell',itemId:result.itemId,quantity:result.quantity,
      price:result.price});
  }
  for(const line of buys){
    const result=buyFromVendor(statePack,stateCaps,vendorId,line?.itemId,
      stateStock,line?.quantity);
    if(!result.ok)return{ok:false,reason:result.reason};
    statePack=result.pack;stateCaps=result.caps;stateStock=result.stock;
    paid+=result.price;
    trades.push({kind:'buy',itemId:result.itemId,quantity:result.quantity,
      price:result.price});
  }
  return{ok:true,pack:statePack,caps:stateCaps,stock:stateStock,
    paid,earned,net:paid-earned,trades};
}


