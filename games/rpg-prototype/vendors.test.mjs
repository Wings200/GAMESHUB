import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackpack,addItem,countItem,BACKPACK_LIMIT,getItem} from './inventory.mjs';
import {VENDORS,vendorById,vendorAccepts,vendorBuyPrice,vendorSellPrice,
  buyFromVendor,sellToVendor,claimVendorTestCredit} from './vendors.mjs';

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

test('training caps credit is once-only and never negative',()=>{
  assert.deepEqual(claimVendorTestCredit(50,false),{ok:true,caps:350});
  assert.equal(claimVendorTestCredit(50,true).reason,'already-claimed');
  assert.equal(claimVendorTestCredit(100000000,false).reason,'wallet-full');
});
