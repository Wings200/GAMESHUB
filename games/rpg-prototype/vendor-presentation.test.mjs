import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBackpack,getItem} from './inventory.mjs';
import {getWeaponSpec} from './weapons.mjs';
import {matchesVendorFilter,vendorItemCategory,vendorComparisonFacts,TRADE_CATEGORIES}
  from './vendor-presentation.mjs';

test('vendor filters use real item category, name and rarity',()=>{
  assert.equal(vendorItemCategory(getItem('supply:medkit')),'aid');
  assert.equal(vendorItemCategory(getItem('supply:fusion-core')),'power');
  assert.equal(vendorItemCategory(getItem('ammo:10mm-pistol')),'ammo');
  assert.equal(vendorItemCategory(getItem('junk:desk-fan')),'junk');
  assert.equal(matchesVendorFilter(getItem('supply:medkit'),'aid','MEDKIT'),true);
  assert.equal(matchesVendorFilter(getItem('supply:medkit'),'weapon',''),false);
  assert.equal(matchesVendorFilter(getItem('junk:desk-fan'),'junk','mystery'),false);
  assert.equal(new Set(TRADE_CATEGORIES.map(c=>c.id)).size,TRADE_CATEGORIES.length);
});

test('vendor armor comparison shows real per-slot improvement',()=>{
  const pack=createBackpack();pack.equipment.armor.chest='scrap-chest';
  const details=vendorComparisonFacts(getItem('armor:militia-chest'),pack);
  const armor=Number(details.find(([name])=>name==='ARMOR POINTS')[1]);
  const delta=Number(details.find(([name])=>name==='VS EQUIPPED')[1].split(' ')[0]);
  assert.ok(armor>0&&delta>0);
});

test('vendor firearm comparison reads actual damage and equipped model',()=>{
  const pack=createBackpack();pack.equipment.weapon='10mm-pistol';
  const item=getItem('weapon:pipe-rifle');
  const details=vendorComparisonFacts(item,pack);
  assert.equal(Number(details.find(([name])=>name==='DAMAGE')[1]),
    getWeaponSpec('pipe-rifle').damage);
  assert.ok(details.find(([name])=>name==='VS EQUIPPED'));
});

test('vendor screen wires category filters, inspection and wallet into the same barter',()=>{
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  for(const id of ['vendorMerchantCaps','vendorPlayerCategory','vendorStockCategory',
    'vendorInspectName','vendorInspectRarity','vendorInspectFacts']){
    assert.match(html,new RegExp('id="'+id+'"'));
    assert.match(main,new RegExp(id));
  }
  assert.match(main,/vendorWallets=result\.wallets/);
  assert.match(main,/saveVendorStock\(\);saveVendorWallets\(\)/);
  assert.match(main,/matchesVendorFilter\(getItem/);
  assert.match(main,/vendorComparisonFacts\(item,backpack\)/);
});
