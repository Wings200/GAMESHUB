import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dialoguePage,charismaCheck,negotiatedTradeModifiers,VENDOR_CONVERSATIONS}
  from './dialogue-presentation.mjs';
import {VENDORS,vendorBuyPrice,vendorSellPrice} from './vendors.mjs';

test('every physical vendor has authored greeting and topic text',()=>{
  for(const vendor of VENDORS){
    assert.ok(VENDOR_CONVERSATIONS[vendor.id]?.greeting.length>25,vendor.id);
    assert.ok(VENDOR_CONVERSATIONS[vendor.id]?.topic.length>25,vendor.id);
  }
});

test('dialogue pages preserve every quest branch within three numbered options',()=>{
  const actions=['A','B','C','D','E','F','G'];
  const pages=[dialoguePage(actions,0),dialoguePage(actions,1),dialoguePage(actions,2)];
  assert.deepEqual(pages.flatMap(page=>page.options),actions);
  assert.deepEqual(pages.map(page=>page.options.length),[3,3,1]);
  assert.equal(pages[0].hasPrevious,false);
  assert.equal(pages[1].hasNext,true);
  assert.equal(pages[2].hasNext,false);
  assert.equal(dialoguePage([],9).page,0);
});

test('Charisma check has a deterministic threshold and no random retries',()=>{
  assert.deepEqual(charismaCheck(5,6),{passed:false,actual:5,required:6});
  assert.deepEqual(charismaCheck(6,6),{passed:true,actual:6,required:6});
  assert.equal(charismaCheck(NaN,6).passed,false);
});

test('negotiated bonus improves actual buy and sell calculations with safe caps',()=>{
  const base={barterBuyMultiplier:.95,barterSellMultiplier:1.05};
  const enhanced=negotiatedTradeModifiers(base,.08);
  assert.ok(vendorBuyPrice('weapon:10mm-pistol',5,enhanced)<
    vendorBuyPrice('weapon:10mm-pistol',5,base));
  assert.ok(vendorSellPrice('weapon:10mm-pistol',5,enhanced)>
    vendorSellPrice('weapon:10mm-pistol',5,base));
  assert.deepEqual(base,{barterBuyMultiplier:.95,barterSellMultiplier:1.05});
  assert.equal(negotiatedTradeModifiers({},99).barterBuyMultiplier,.88);
});

test('live dialogue, vendor preview and commit use the same negotiated rates',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  assert.match(main,/openVendorConversation\(trader\)/);
  assert.match(main,/activeTradeModifiers\(\)/);
  assert.match(main,/vendorBarterOffer\(\),campaignState.reputation,activeTradeModifiers\(\)/);
  assert.match(main,/vendorBuyPrice\(itemId,1,activeTradeModifiers\(\)\)/);
  assert.match(html,/id="campaignDialoguePage"/);
  assert.match(html,/id="campaignDialogueChoices"/);
  assert.match(html,/#campaignDialogue\.hidden\{display:none\}/);
  assert.match(main,/if\(index===3\)closeCampaignDialogue\(\)/);
  assert.match(main,/closeCampaignDialogue\(\{resume:false,keepNegotiation:true\}\)/);
  assert.match(main,/if\(!keepNegotiation\)vendorNegotiation=null/);
  assert.match(main,/vendorNegotiation=null; \/\/ This deal covers one confirmed exchange/);
});
