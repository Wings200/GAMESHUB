import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackpack,addItem,countItem,BACKPACK_LIMIT,getItem} from './inventory.mjs';
import {VENDORS,vendorById,vendorAccepts,vendorBuyPrice,vendorSellPrice,
  createVendorStock,safeVendorStockSnapshot,vendorStockRemaining,
  buyFromVendor,sellToVendor,sellMaterialToVendor,sellAmmoToVendor,
  executeVendorBarter,vendorReputationAccess} from './vendors.mjs';

test('six physical vendors offer real catalog items by specialty',()=>{
  assert.equal(VENDORS.length,6);
  for(const vendor of VENDORS){
    assert.equal(vendorById(vendor.id),vendor);
    for(const offer of vendor.offers){
      assert.ok(getItem(offer.itemId));
      assert.ok(vendorAccepts(vendor.id,offer.itemId));
      assert.ok(vendorBuyPrice(offer.itemId,offer.quantity)>0);
    }
  }
  assert.equal(vendorAccepts('medic','weapon:pipe-rifle'),false);
});

test('power armor suppliers require reputation, never formal membership',()=>{
  const military='dominion-quartermaster',raider='vultures-armorer';
  assert.equal(vendorReputationAccess(military,{dominion:34}).ok,false);
  assert.equal(vendorReputationAccess(military,{dominion:35}).ok,true);
  assert.equal(vendorReputationAccess(raider,{vultures:35}).ok,true);
  assert.equal(vendorReputationAccess(raider,{vultures:34}).ok,false);
  assert.equal(vendorReputationAccess(military,{dominion:60},'power-plate:t60-chest').ok,false);
  assert.equal(vendorReputationAccess(military,{dominion:65},'power-plate:t60-chest').ok,true);
  assert.equal(vendorAccepts('armor','power-plate:t45-chest'),false);
  assert.equal(vendorStockRemaining(createVendorStock(),'scavenger','supply:fusion-core'),0);
  const stock=createVendorStock(),pack=createBackpack();
  assert.equal(buyFromVendor(pack,10000,military,'power-plate:t45-head',stock,1,
    {dominion:34}).reason,'reputation');
  const trade={sells:[],buys:[{itemId:'power-plate:t45-head',quantity:1}]};
  assert.equal(executeVendorBarter(pack,10000,military,stock,trade,{dominion:34}).ok,false);
  const bought=executeVendorBarter(pack,10000,military,stock,trade,{dominion:35});
  assert.equal(bought.ok,true);
  assert.equal(countItem(bought.pack,'power-plate:t45-head'),1);
  assert.equal(vendorStockRemaining(stock,military,'power-plate:t45-head'),1);
  assert.equal(vendorStockRemaining(bought.stock,military,'power-plate:t45-head'),0);
});

test('buying items spends caps atomically even when overloaded',()=>{
  const pack=createBackpack();
  const unavailable=buyFromVendor(pack,0,'medic','supply:medkit');
  assert.equal(unavailable.reason,'insufficient-caps');
  const bought=buyFromVendor(pack,300,'medic','supply:medkit');
  assert.equal(bought.ok,true);
  assert.equal(countItem(bought.pack,'supply:medkit'),1);
  assert.equal(countItem(pack,'supply:medkit'),0);
  assert.equal(bought.caps,300-vendorBuyPrice('supply:medkit',1));
  assert.equal(buyFromVendor(pack,300,'medic','weapon:pipe-rifle').ok,false);
  const full=createBackpack();
  for(let i=0;i<BACKPACK_LIMIT;i++)addItem(full,'weapon:pipe-pistol',1);
  const overloaded=buyFromVendor(full,300,'medic','supply:medkit');
  assert.equal(overloaded.ok,true);
  assert.equal(countItem(overloaded.pack,'supply:medkit'),1);
  assert.equal(countItem(full,'supply:medkit'),0);
});

test('ammunition vendor purchases land in reserves, not inventory slots',()=>{
  const pack=createBackpack();
  const before=countItem(pack,'ammo:10mm-pistol');
  const result=buyFromVendor(pack,300,'arms','ammo:10mm-pistol');
  assert.equal(result.ok,true);
  assert.equal(countItem(result.pack,'ammo:10mm-pistol'),before+24);
  assert.equal(result.pack.items.length,0);
});

test('selling is merchant-specific, pays caps, and protects equipped gear',()=>{
  const pack=createBackpack();
  addItem(pack,'armor:ranger-chest',1);
  const uid=pack.items[0].uid;
  assert.equal(sellToVendor(pack,20,'arms',uid).reason,'wrong-merchant');
  const sold=sellToVendor(pack,20,'armor',uid);
  assert.equal(sold.ok,true);
  assert.equal(sold.caps,20+vendorSellPrice('armor:ranger-chest'));
  assert.equal(pack.items.length,1);
  pack.equipment.armor.chest='ranger-chest';
  assert.equal(sellToVendor(pack,20,'armor',uid).reason,'equipped');
});

test('merchant stock falls after purchases and cannot be bought indefinitely',()=>{
  let stock=createVendorStock(),pack=createBackpack(),caps=10000;
  const start=vendorStockRemaining(stock,'arms','weapon:10mm-pistol');
  assert.equal(start,2);
  for(let n=0;n<start;n++){
    const bought=buyFromVendor(pack,caps,'arms','weapon:10mm-pistol',stock);
    assert.equal(bought.ok,true);
    pack=bought.pack;caps=bought.caps;stock=bought.stock;
    assert.equal(vendorStockRemaining(stock,'arms','weapon:10mm-pistol'),start-n-1);
  }
  const unavailable=buyFromVendor(pack,caps,'arms','weapon:10mm-pistol',stock);
  assert.equal(unavailable.reason,'out-of-stock');
  assert.equal(unavailable.pack,undefined);
  assert.equal(countItem(pack,'weapon:10mm-pistol'),2);
  assert.equal(stock['arms']['weapon:10mm-pistol'],0);
});

test('stock is counted in units and final partial ammo bundles can be purchased',()=>{
  const stock=createVendorStock();
  stock.arms['ammo:10mm-pistol']=5;
  const before=createBackpack();
  const result=buyFromVendor(before,10000,'arms','ammo:10mm-pistol',stock);
  assert.equal(result.ok,true);
  assert.equal(result.quantity,5);
  assert.equal(result.price,vendorBuyPrice('ammo:10mm-pistol',5));
  assert.equal(result.stock.arms['ammo:10mm-pistol'],0);
  assert.equal(stock.arms['ammo:10mm-pistol'],5,'Caller stock is not mutated');
  assert.equal(countItem(result.pack,'ammo:10mm-pistol'),
    countItem(before,'ammo:10mm-pistol')+5);
});

test('stock persists through safe reloads and player sales replenish offered goods',()=>{
  const first=createVendorStock();
  first.medic['supply:medkit']=0;
  const restored=safeVendorStockSnapshot(JSON.parse(JSON.stringify(first)));
  assert.equal(vendorStockRemaining(restored,'medic','supply:medkit'),0);
  const invalid=safeVendorStockSnapshot({medic:{'supply:medkit':-20},
    arms:{'weapon:10mm-pistol':999999999},hacker:{'weapon:fake':100}});
  assert.equal(vendorStockRemaining(invalid,'medic','supply:medkit'),6);
  assert.ok(vendorStockRemaining(invalid,'arms','weapon:10mm-pistol')<=100000);
  assert.equal(invalid.hacker,undefined);
  const pack=createBackpack();addItem(pack,'supply:medkit',1);
  const sold=sellToVendor(pack,0,'medic',pack.items[0].uid,1,restored);
  assert.equal(sold.ok,true);
  assert.equal(sold.stock.medic['supply:medkit'],1);
  const bought=buyFromVendor(sold.pack,sold.caps+1000,'medic','supply:medkit',sold.stock);
  assert.equal(bought.ok,true);
  assert.equal(bought.stock.medic['supply:medkit'],0);
});

test('selling salvage components replenishes the associated trader stock',()=>{
  const pack=createBackpack();addItem(pack,'material:steel',4);
  const stock=createVendorStock();stock.scavenger['material:steel']=0;
  const sold=sellMaterialToVendor(pack,10,'scavenger','material:steel',2,stock);
  assert.equal(sold.ok,true);
  assert.equal(sold.stock.scavenger['material:steel'],2);
  assert.equal(countItem(sold.pack,'material:steel'),2);
});

test('exact-quantity buying is atomic and respects remaining stock',()=>{
  const stock=createVendorStock(),pack=createBackpack();
  const before=vendorStockRemaining(stock,'arms','ammo:10mm-pistol');
  const bought=buyFromVendor(pack,10000,'arms','ammo:10mm-pistol',stock,7);
  assert.equal(bought.ok,true);
  assert.equal(bought.quantity,7);
  assert.equal(bought.price,vendorBuyPrice('ammo:10mm-pistol',7));
  assert.equal(bought.stock.arms['ammo:10mm-pistol'],before-7);
  assert.equal(vendorStockRemaining(stock,'arms','ammo:10mm-pistol'),before);
  assert.equal(countItem(bought.pack,'ammo:10mm-pistol'),
    countItem(pack,'ammo:10mm-pistol')+7);
  assert.equal(buyFromVendor(pack,10000,'arms','ammo:10mm-pistol',stock,0).reason,
    'invalid-quantity');
  assert.equal(buyFromVendor(pack,10000,'arms','ammo:10mm-pistol',stock,before+1).reason,
    'out-of-stock');
});

test('ammo sales debit reserves and never mutate the source inventory',()=>{
  const pack=createBackpack(),stock=createVendorStock();
  const before=countItem(pack,'ammo:10mm-pistol');
  const amount=Math.min(before,8);
  assert.ok(amount>0);
  const result=sellAmmoToVendor(pack,0,'arms','ammo:10mm-pistol',amount,stock);
  assert.equal(result.ok,true);
  assert.equal(countItem(result.pack,'ammo:10mm-pistol'),before-amount);
  assert.equal(countItem(pack,'ammo:10mm-pistol'),before);
  assert.equal(result.caps,vendorSellPrice('ammo:10mm-pistol',amount));
  assert.equal(sellAmmoToVendor(pack,0,'armor','ammo:10mm-pistol',1,stock).reason,
    'wrong-merchant');
  assert.equal(sellAmmoToVendor(pack,0,'arms','ammo:10mm-pistol',before+1,stock).reason,
    'invalid-quantity');
});

test('barter can fund a purchase from a sale and commits only the final snapshot',()=>{
  const pack=createBackpack(),stock=createVendorStock();
  addItem(pack,'armor:ranger-chest',1);
  const uid=pack.items[0].uid;
  const offer={sells:[{type:'inventory',uid,quantity:1}],
    buys:[{itemId:'armor:scrap-chest',quantity:1}]};
  const startingCaps=Math.max(0,vendorBuyPrice('armor:scrap-chest',1)-
    vendorSellPrice('armor:ranger-chest',1));
  const result=executeVendorBarter(pack,startingCaps,'armor',stock,offer);
  assert.equal(result.ok,true);
  assert.equal(countItem(pack,'armor:ranger-chest'),1,'original is untouched');
  assert.equal(countItem(result.pack,'armor:ranger-chest'),0);
  assert.equal(countItem(result.pack,'armor:scrap-chest'),1);
  assert.equal(result.caps,startingCaps+result.earned-result.paid);
  assert.equal(stock.armor['armor:scrap-chest'],
    vendorStockRemaining(stock,'armor','armor:scrap-chest'));
});

test('barter rejects an entire offer when any line cannot complete',()=>{
  const pack=createBackpack(),stock=createVendorStock();
  const before=JSON.stringify({pack,stock});
  const result=executeVendorBarter(pack,0,'armor',stock,{
    sells:[{type:'inventory',uid:'missing',quantity:1}],
    buys:[{itemId:'armor:scrap-chest',quantity:1}]});
  assert.equal(result.ok,false);
  assert.equal(JSON.stringify({pack,stock}),before);
  assert.equal(executeVendorBarter(pack,0,'armor',stock,{
    sells:[],buys:[{itemId:'armor:scrap-chest',quantity:1}]}).reason,
    'insufficient-caps');
});

test('W20.93 Charisma prices match the real buy/sell and atomic barter totals',()=>{
  const modifiers={barterBuyMultiplier:.8,barterSellMultiplier:1.2};
  const stock=createVendorStock(),pack=createBackpack();
  addItem(pack,'armor:ranger-chest',1);
  const uid=pack.items.find(x=>x.itemId==='armor:ranger-chest').uid;
  const offer={sells:[{type:'inventory',uid,quantity:1}],
    buys:[{itemId:'armor:scrap-chest',quantity:1}]};
  const expectedBuy=vendorBuyPrice('armor:scrap-chest',1,modifiers);
  const expectedSell=vendorSellPrice('armor:ranger-chest',1,modifiers);
  assert.ok(expectedBuy<vendorBuyPrice('armor:scrap-chest'));
  assert.ok(expectedSell>vendorSellPrice('armor:ranger-chest'));
  const preview=executeVendorBarter(pack,1000,'armor',stock,offer,{},modifiers);
  assert.equal(preview.ok,true);
  assert.equal(preview.paid,expectedBuy);
  assert.equal(preview.earned,expectedSell);
  assert.equal(preview.caps,1000+expectedSell-expectedBuy);
  assert.equal(countItem(pack,'armor:ranger-chest'),1,'preview never spends real gear');
  const tooPoor=executeVendorBarter(createBackpack(),expectedBuy-1,'armor',stock,
    {sells:[],buys:offer.buys},{},modifiers);
  assert.equal(tooPoor.reason,'insufficient-caps');
});



