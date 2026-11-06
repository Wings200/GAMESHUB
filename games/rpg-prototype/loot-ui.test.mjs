import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');

test('loot panel compares container contents with current backpack',()=>{
  for(const id of ['lootItems','lootCount','lootCarryItems','lootCarryCapacity',
    'lootCarryStores','lootTakeAll','lootFeedback']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(html,/class="loot-transfer-grid"/);
  assert.match(main,/function refreshLootCarryUI\(\)/);
  assert.match(main,/function refreshLootUI\(\)/);
});

test('quantity takes recheck the original entry and empty cases disappear',()=>{
  assert.match(main,/const index=bag\.items\.indexOf\(entry\)/);
  assert.match(main,/takeQuantityFromBag\(backpack,bag,index,amount\)/);
  assert.match(main,/discardEmptyLootBags\(\)/);
  assert.match(main,/\$\('lootTakeAll'\)\.disabled=!bag\|\|!bag\.items\.length/);
  assert.match(html,/W20\.71 · FIELD SCAVENGING/);
});
