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

test('trade controls only stage items; an explicit confirmation executes the barter',()=>{
  assert.match(main,/Number\.isSafeInteger\(quantity\)/);
  assert.match(main,/quantity<=maxQuantity/);
  assert.match(main,/stageVendorBuy\(offer\.itemId,quantity\)/);
  assert.match(main,/stageVendorSell\('inventory',entry\.itemId,entry\.uid,quantity\)/);
  assert.match(main,/stageVendorSell\('material',material\.id,null,amount\)/);
  assert.match(main,/stageVendorSell\('ammo',itemId,null,amount\)/);
  assert.match(main,/function confirmVendorBarter\(\)/);
  assert.match(main,/executeVendorBarter\(backpack,campaignState\.caps,/);
  assert.match(main,/\$\('vendorCartConfirm'\)\.addEventListener\('click',confirmVendorBarter\)/);
  assert.match(main,/saveVendorStock\(\)/);
});

test('barter review shows each side, net price, cancel and explicit confirmation',()=>{
  for(const id of ['vendorCartSellItems','vendorCartBuyItems','vendorCartNet',
    'vendorCartBalance','vendorCartStatus','vendorCartConfirm','vendorCartClear'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/W20\.72\.1 · BARTER CONFIRMATION/);
  assert.match(html,/NOTHING IS EXCHANGED UNTIL YOU CONFIRM/);
  assert.match(html,/CONFIRM TRADE/);
  assert.match(main,/vendorCartBuys\.clear\(\);vendorCartSells\.clear\(\)/);
  assert.match(main,/\$\('vendorCartConfirm'\)\.disabled=!preview\.ok/);
});
