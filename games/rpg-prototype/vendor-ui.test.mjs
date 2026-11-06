import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');

test('trade terminal exposes live quotes, wallet, capacity, and both stock lists',()=>{
  for(const id of ['vendorCaps','vendorCapacity','vendorPlayerItems',
    'vendorItems','vendorPlayerSearch','vendorSearch','vendorFeedback'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/W20\.72 · VENDOR TRADING/);
  assert.match(html,/class="vendor-intro"/);
  assert.match(main,/function vendorTradeRow\(/);
  assert.match(main,/input\.addEventListener\('input',updateQuote\)/);
});

test('trade controls enforce quantity and wallet checks before backend calls',()=>{
  assert.match(main,/Number\.isSafeInteger\(quantity\)/);
  assert.match(main,/quantity<=maxQuantity/);
  assert.match(main,/price>campaignState\.caps/);
  assert.match(main,/buyFromVendor\(backpack,campaignState\.caps,/);
  assert.match(main,/sellAmmoToVendor\(backpack,campaignState\.caps,/);
  assert.match(main,/sellMaterialToVendor\(backpack,campaignState\.caps,/);
  assert.match(main,/saveVendorStock\(\)/);
});
