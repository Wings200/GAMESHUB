import test from 'node:test';
import assert from 'node:assert/strict';
import {CRAFTING_COMPONENTS,generateComponentDrop,OPTIC_COMPONENT_RECIPES} from './materials.mjs';
import {BACKPACK_LIMIT,createBackpack,addItem,countItem,spendMaterial,
  inventorySlotsUsed,safeBackpackSnapshot,totalInventoryValue,createLootBag,
  takeAllFromBag,generateEnemyLoot,installWeaponOptic} from './inventory.mjs';
import {VENDORS,buyFromVendor,sellMaterialToVendor,vendorSellPrice} from './vendors.mjs';

test('all 31 distinct Fallout 4 crafting resources are registered without duplicate IDs',()=>{
  assert.equal(CRAFTING_COMPONENTS.length,31);
  assert.equal(new Set(CRAFTING_COMPONENTS.map(c=>c.id)).size,31);
  const required=['steel','wood','adhesive','circuitry','nuclear-material','fiber-optics',
    'ballistic-fiber','oil','screw','spring','aluminum'];
  for(const key of required)assert.ok(CRAFTING_COMPONENTS.some(c=>c.key===key));
});

test('component pouch does not consume gear slots and persists across saves',()=>{
  const pack=createBackpack();
  for(let i=0;i<BACKPACK_LIMIT;i++)addItem(pack,'weapon:pipe-pistol',1);
  const taken=addItem(pack,'material:steel',50);
  assert.deepEqual(taken,{added:50,leftover:0,full:false});
  assert.equal(inventorySlotsUsed(pack),BACKPACK_LIMIT);
  assert.equal(countItem(pack,'material:steel'),50);
  assert.ok(totalInventoryValue(pack)>=50*4);
  const saved=safeBackpackSnapshot(JSON.parse(JSON.stringify(pack)));
  assert.equal(countItem(saved,'material:steel'),50);
  assert.equal(inventorySlotsUsed(saved),BACKPACK_LIMIT);
  assert.equal(spendMaterial(saved,'material:steel',3).removed,3);
  assert.equal(countItem(saved,'material:steel'),47);
  assert.equal(countItem(pack,'material:steel'),50);
});

test('component loot piles stack into the pouch even when the backpack is full',()=>{
  const pack=createBackpack();
  for(let i=0;i<BACKPACK_LIMIT;i++)addItem(pack,'weapon:pipe-pistol',1);
  const bag=createLootBag('test',0,0,CRAFTING_COMPONENTS.map(item=>
    ({itemId:item.id,quantity:5})));
  const result=takeAllFromBag(pack,bag);
  assert.equal(result.remaining,0);
  assert.equal(result.added,155);
  assert.equal(inventorySlotsUsed(pack),BACKPACK_LIMIT);
  for(const item of CRAFTING_COMPONENTS)assert.equal(countItem(pack,item.id),5);
});

test('Wren sells all 31 resources and can buy pouch stock without mutating the original pack',()=>{
  const offers=VENDORS.find(v=>v.id==='scavenger').offers;
  for(const material of CRAFTING_COMPONENTS)
    assert.equal(offers.filter(o=>o.itemId===material.id).length,1);
  const pack=createBackpack();
  const purchased=buyFromVendor(pack,200,'scavenger','material:steel');
  assert.equal(purchased.ok,true);
  assert.equal(countItem(purchased.pack,'material:steel'),5);
  assert.equal(purchased.pack.items.length,0);
  assert.equal(countItem(pack,'material:steel'),0);
  assert.equal(sellMaterialToVendor(purchased.pack,purchased.caps,'arms',
    'material:steel').reason,'wrong-merchant');
  const sold=sellMaterialToVendor(purchased.pack,purchased.caps,'scavenger',
    'material:steel',2);
  assert.equal(sold.ok,true);
  assert.equal(sold.caps,purchased.caps+vendorSellPrice('material:steel',2));
  assert.equal(countItem(sold.pack,'material:steel'),3);
  assert.equal(countItem(purchased.pack,'material:steel'),5);
});

test('enemy loot includes component drops and optics can consume component recipes',()=>{
  for(const id of ['scout','raider','enforcer']){
    assert.ok(generateEnemyLoot(id,0,null,()=>.4).some(e=>e.itemId.startsWith('material:')));
    assert.ok(generateComponentDrop(id,()=>.8).itemId.startsWith('material:'));
  }
  const pack=createBackpack();
  const recipe=OPTIC_COMPONENT_RECIPES['holo-a'];
  for(const [id,qty] of Object.entries(recipe))addItem(pack,id,qty);
  const attached=installWeaponOptic(pack,'service-carbine','holo-a');
  assert.equal(attached.ok,true);
  assert.equal(attached.crafted,true);
  for(const id of Object.keys(recipe))assert.equal(countItem(pack,id),0);
});
