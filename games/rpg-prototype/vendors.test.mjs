import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackpack,addItem,countItem,BACKPACK_LIMIT,getItem} from './inventory.mjs';
import {VENDORS,vendorById,vendorAccepts,vendorBuyPrice,vendorSellPrice,
  createVendorStock,safeVendorStockSnapshot,vendorStockRemaining,
  buyFromVendor,sellToVendor,sellMaterialToVendor} from './vendors.mjs';

test('four physical vendors offer real catalog items by specialty',()=>{
  assert.equal(VENDORS.length,4);
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

test('buying an item spends caps only after full inventory addition',()=>{
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
  assert.equal(buyFromVendor(full,300,'medic','supply:medkit').reason,'full-backpack');
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


