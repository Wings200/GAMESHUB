import test from 'node:test';
import assert from 'node:assert/strict';
import {ARSENAL} from './weapons.mjs';
import {ARMOR_SLOTS,enemyArmorForRound} from './combat.mjs';
import {BACKPACK_LIMIT,RARITIES,ITEM_CATALOG,getItem,createBackpack,
  inventorySlotsUsed,totalInventoryValue,countItem,addItem,removeItem,
  equipFromInventory,useSupply,playerArmorReduction,createLootBag,
  takeFromBag,takeAllFromBag,generateEnemyLoot,safeBackpackSnapshot} from './inventory.mjs';
test('Catalog includes all real guns, ammunition, six armor slots and rarity/value',()=>{
  for(const gun of ARSENAL){
    assert.equal(getItem('weapon:'+gun.id).category,'weapon');
    assert.equal(getItem('ammo:'+gun.id).category,'ammo');
  }
  for(const slot of ARMOR_SLOTS)assert.ok(getItem('armor:militia-'+slot).value>0);
  assert.equal(Object.keys(RARITIES).length,4);
  assert.ok(Object.keys(ITEM_CATALOG).length>=32);
  assert.throws(()=>getItem('weapon:unknown'));
});
test('Loot stacks ammo, enforces thirty slots and never loses overflow',()=>{
  const pack=createBackpack();
  assert.deepEqual(addItem(pack,'ammo:pipe-smg',200),{added:200,leftover:0,full:false});
  assert.equal(inventorySlotsUsed(pack),2);
  assert.equal(countItem(pack,'ammo:pipe-smg'),200);
  assert.equal(pack.items[0].quantity,180);
  for(let i=0;i<28;i++)addItem(pack,'weapon:iron-revolver',1);
  assert.equal(pack.items.length,BACKPACK_LIMIT);
  const r=addItem(pack,'weapon:pipe-smg',1);
  assert.equal(r.added,0);assert.equal(r.leftover,1);
  assert.equal(addItem(pack,'ammo:pipe-smg',20).added,20);
  assert.ok(totalInventoryValue(pack)>0);
});
test('Enemy drops are deterministic, searchable and no duplication on TAKE ALL',()=>{
  const pack=createBackpack();
  const bag=createLootBag('raider-1',43,46,generateEnemyLoot('raider'));
  const expected=bag.items.reduce((sum,e)=>sum+e.quantity,0);
  const r=takeAllFromBag(pack,bag);
  assert.equal(r.added,expected);
  assert.equal(r.remaining,0);
  assert.equal(bag.items.length,0);
  assert.equal(takeAllFromBag(pack,bag).added,0);
  assert.equal(countItem(pack,'weapon:pipe-smg'),1);
  assert.equal(countItem(pack,'armor:ranger-chest'),1);
});
test('W06.5 armor drops match visible equipped pieces across rounds',()=>{
  for(const role of ['scout','raider','enforcer']){
    for(let round=0;round<6;round++){
      const outfit=enemyArmorForRound(role,round);
      const loot=generateEnemyLoot(role,round,outfit);
      const armorDrops=loot.filter(e=>e.itemId.startsWith('armor:'))
        .map(e=>e.itemId.slice(6)).sort();
      const equipped=ARMOR_SLOTS.map(slot=>outfit[slot])
        .filter(id=>id!=='none').sort();
      assert.deepEqual(armorDrops,equipped,role+' round '+round);
    }
  }
  const single=generateEnemyLoot('scout',1);
  assert.deepEqual(single.filter(e=>e.itemId.startsWith('armor:')),
    [{itemId:'armor:ranger-leftLeg',quantity:1}]);
  assert.equal(getItem('armor:scrap-head').category,'armor');
});
test('Full backpack leaves uncollected contents in world loot bag',()=>{
  const pack=createBackpack();
  addItem(pack,'weapon:iron-revolver',30);
  const bag=createLootBag('a',0,0,[{itemId:'weapon:hunting-rifle',quantity:1}]);
  assert.equal(takeFromBag(pack,bag,0).leftover,1);
  assert.equal(bag.items[0].quantity,1);
  removeItem(pack,pack.items[0].uid,1);
  assert.equal(takeFromBag(pack,bag,0).added,1);
  assert.equal(bag.items.length,0);
});
test('Equip real weapon and looted armor; player gets actual damage reduction',()=>{
  const pack=createBackpack();
  assert.equal(playerArmorReduction(pack,'chest').reduction,0);
  addItem(pack,'weapon:service-carbine',1);
  addItem(pack,'armor:militia-chest',1);
  assert.equal(equipFromInventory(pack,pack.items[0].uid).key,'service-carbine');
  assert.equal(equipFromInventory(pack,pack.items[1].uid).slot,'chest');
  assert.equal(pack.equipment.weapon,'service-carbine');
  const protection=playerArmorReduction(pack,'chest');
  assert.ok(protection.points>40&&protection.reduction>.6);
});
test('Medkits heal real player state, only when wounded, and are consumed',()=>{
  const pack=createBackpack(),health={health:45,maxHealth:100,alive:true};
  addItem(pack,'supply:medkit',2);
  const uid=pack.items[0].uid;
  assert.equal(useSupply(pack,uid,health).restored,40);
  assert.equal(health.health,85);
  assert.equal(countItem(pack,'supply:medkit'),1);
  assert.equal(useSupply(pack,uid,health).restored,15);
  assert.equal(useSupply(pack,uid,health).ok,false);
});
test('Reconstructed saves reject unknown items and unowned armor',()=>{
  const pack=safeBackpackSnapshot({
    items:[{itemId:'hack:invalid',quantity:99999},
      {itemId:'weapon:pipe-smg',quantity:1},
      {itemId:'armor:ranger-chest',quantity:1}],
    equipment:{weapon:'pipe-smg',armor:{chest:'citadel-chest'}}
  });
  assert.equal(pack.equipment.weapon,'pipe-smg');
  assert.equal(pack.equipment.armor.chest,'none');
  assert.equal(pack.items.length,2);
});
test('Dropping a stack uses an independent item and never duplicates IDs',()=>{
  const pack=createBackpack();
  addItem(pack,'ammo:service-carbine',12);
  const uid=pack.items[0].uid;
  assert.deepEqual(removeItem(pack,uid,7),{removed:7,itemId:'ammo:service-carbine'});
  assert.equal(countItem(pack,'ammo:service-carbine'),5);
  addItem(pack,'supply:medkit',1);
  assert.equal(pack.items.length,2);
  assert.notEqual(pack.items[0].uid,pack.items[1].uid);
});
test('Three enemy profiles award different items and rarities',()=>{
  const a=generateEnemyLoot('scout'),b=generateEnemyLoot('raider'),c=generateEnemyLoot('enforcer');
  assert.notDeepEqual(a,b);assert.notDeepEqual(b,c);
  assert.ok(c.some(e=>['rare','epic'].includes(getItem(e.itemId).rarity)));
  assert.throws(()=>generateEnemyLoot('ghost'));
});
