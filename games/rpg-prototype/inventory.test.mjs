import test from 'node:test';
import assert from 'node:assert/strict';
import {ARSENAL} from './weapons.mjs';
import {ARMOR_SLOTS,enemyArmorForRound} from './combat.mjs';
import {BACKPACK_LIMIT,RARITIES,ITEM_CATALOG,getItem,createBackpack,
  inventorySlotsUsed,totalInventoryValue,countItem,addItem,removeItem,
  equipFromInventory,unequipWearable,useSupply,playerArmorReduction,createLootBag,
  takeFromBag,takeAllFromBag,generateEnemyLoot,safeBackpackSnapshot,
  installWeaponOptic,installedWeaponOptic,INVENTORY_CATEGORIES,inventorySection,
  ammoReserve,displayAmmoCount} from './inventory.mjs';
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
test('W09.8 ammunition auto-routes into per-weapon reserves without occupying slots',()=>{
  const pack=createBackpack();
  const initial=ammoReserve(pack,'pipe-smg');
  assert.deepEqual(addItem(pack,'ammo:pipe-smg',200),{added:200,leftover:0,full:false});
  assert.equal(inventorySlotsUsed(pack),0);
  assert.equal(countItem(pack,'ammo:pipe-smg'),initial+200);
  for(let i=0;i<BACKPACK_LIMIT;i++)addItem(pack,'weapon:iron-revolver',1);
  assert.equal(pack.items.length,BACKPACK_LIMIT);
  const r=addItem(pack,'weapon:pipe-smg',1);
  assert.equal(r.added,0);assert.equal(r.leftover,1);
  assert.equal(addItem(pack,'ammo:pipe-smg',900).added,900);
  assert.equal(displayAmmoCount(ammoReserve(pack,'pipe-smg')),'999+');
  assert.equal(pack.items.length,BACKPACK_LIMIT,'Ammo never consumes a slot');
  assert.ok(totalInventoryValue(pack)>0);
});
test('Enemy drops are deterministic, searchable and no duplication on TAKE ALL',()=>{
  const pack=createBackpack();
  const bag=createLootBag('raider-1',43,46,generateEnemyLoot('raider',0,null,()=>.5));
  const expected=bag.items.reduce((sum,e)=>sum+e.quantity,0);
  const r=takeAllFromBag(pack,bag);
  assert.equal(r.added,expected);
  assert.equal(r.remaining,0);
  assert.equal(bag.items.length,0);
  assert.equal(takeAllFromBag(pack,bag).added,0);
  assert.equal(countItem(pack,'weapon:pipe-smg'),1);
  assert.equal(pack.items.filter(i=>i.itemId.startsWith('armor:')).length,1);
});
test('W06.6 armor drops are random subsets of gear actually worn',()=>{
  for(const role of ['scout','raider','enforcer']){
    for(let round=0;round<8;round++){
      const outfit=enemyArmorForRound(role,round);
      const equipped=ARMOR_SLOTS.map(slot=>outfit[slot]).filter(id=>id!=='none');
      for(const roll of [0,.2,.5,.8,.99]){
        const loot=generateEnemyLoot(role,round,outfit,()=>roll);
        const drops=loot.filter(e=>e.itemId.startsWith('armor:'))
          .map(e=>e.itemId.slice(6));
        assert.equal(new Set(drops).size,drops.length,'Never duplicate armor');
        assert.ok(drops.every(id=>equipped.includes(id)),
          'Never drop an armor piece the NPC did not wear');
        assert.ok(drops.length<=(role==='raider'?2:1));
        if(role==='enforcer')assert.ok(drops.length<equipped.length,
          'Full Citadel suits must not drop in one kill');
      }
    }
  }
  assert.equal(generateEnemyLoot('scout',1,null,()=>0)
    .filter(e=>e.itemId.startsWith('armor:')).length,0);
  assert.deepEqual(generateEnemyLoot('scout',1,null,()=>.6)
    .filter(e=>e.itemId.startsWith('armor:')),
    [{itemId:'armor:ranger-leftLeg',quantity:1}]);
  assert.equal(generateEnemyLoot('raider',0,null,()=>.99)
    .filter(e=>e.itemId.startsWith('armor:')).length,2);
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
test('Dropping a supply stack uses an independent item and never duplicates IDs',()=>{
  const pack=createBackpack();
  addItem(pack,'supply:salvage',12);
  const uid=pack.items[0].uid;
  assert.deepEqual(removeItem(pack,uid,7),{removed:7,itemId:'supply:salvage'});
  assert.equal(countItem(pack,'supply:salvage'),5);
  addItem(pack,'supply:medkit',1);
  assert.equal(pack.items.length,2);
  assert.notEqual(pack.items[0].uid,pack.items[1].uid);
});
test('Three enemy profiles award different items and rarities',()=>{
  const a=generateEnemyLoot('scout',0,null,()=>.9),
    b=generateEnemyLoot('raider',0,null,()=>.9),
    c=generateEnemyLoot('enforcer',0,null,()=>.9);
  assert.notDeepEqual(a,b);assert.notDeepEqual(b,c);
  assert.ok(c.some(e=>['rare','epic'].includes(getItem(e.itemId).rarity)));
  assert.throws(()=>generateEnemyLoot('ghost'));
});

test('Optics consume real materials once, persist and stay weapon-specific',()=>{
  const pack=createBackpack();
  assert.deepEqual(installWeaponOptic(pack,'hunting-rifle','scope-4x'),
    {ok:false,reason:'materials',missing:['supply:salvage','supply:optic-glass']});
  addItem(pack,'supply:salvage',20);
  addItem(pack,'supply:optic-glass',10);
  const installed=installWeaponOptic(pack,'hunting-rifle','scope-4x');
  assert.deepEqual(installed,{ok:true,crafted:true,opticId:'scope-4x'});
  assert.equal(countItem(pack,'supply:salvage'),14);
  assert.equal(countItem(pack,'supply:optic-glass'),7);
  assert.equal(installedWeaponOptic(pack,'hunting-rifle'),'scope-4x');
  assert.equal(installedWeaponOptic(pack,'service-carbine'),'factory');
  assert.equal(installWeaponOptic(pack,'hunting-rifle','factory').ok,true);
  assert.equal(installWeaponOptic(pack,'hunting-rifle','scope-4x').crafted,false);
  assert.equal(countItem(pack,'supply:salvage'),14,'Reinstall costs nothing');
  assert.equal(installWeaponOptic(pack,'scrap-pistol','scope-4x').reason,'incompatible');
  const restored=safeBackpackSnapshot(JSON.parse(JSON.stringify(pack)));
  assert.equal(installedWeaponOptic(restored,'hunting-rifle'),'scope-4x');
  assert.deepEqual(restored.unlockedOptics['hunting-rifle'],['scope-4x']);
});

test('Repeated identical weapon and armor pickups keep separate sellable copies',()=>{
  const pack=createBackpack();
  for(let i=0;i<3;i++){
    const bag=createLootBag('raider-'+i,43,46,[
      {itemId:'weapon:pipe-smg',quantity:1},
      {itemId:'armor:ranger-leftLeg',quantity:1}
    ]);
    const result=takeAllFromBag(pack,bag);
    assert.equal(result.added,2);
    assert.equal(result.remaining,0);
  }
  assert.equal(countItem(pack,'weapon:pipe-smg'),3);
  assert.equal(countItem(pack,'armor:ranger-leftLeg'),3);
  assert.equal(pack.items.length,6,'Gear has one inventory slot per copy');
  assert.equal(new Set(pack.items.map(i=>i.uid)).size,6,'Each copy needs its own UID');
  const saved=safeBackpackSnapshot(JSON.parse(JSON.stringify(pack)));
  assert.equal(countItem(saved,'weapon:pipe-smg'),3,'All guns survive reloading a save');
  assert.equal(countItem(saved,'armor:ranger-leftLeg'),3);
  assert.equal(removeItem(saved,saved.items[0].uid,1).removed,1);
  assert.equal(countItem(saved,'weapon:pipe-smg'),2,'Dropping one keeps the other copies');
});

test('W09.7 starts with no worn helmet, field cap, backpack or armor',()=>{
  const pack=createBackpack();
  assert.equal(pack.equipment.armor.head,'none');
  assert.equal(pack.equipment.armor.chest,'none');
  assert.deepEqual(pack.equipment.clothing,{head:'none',back:'none'});
  assert.equal(pack.items.length,0);
});

test('W09.7 hats and backpacks are real loot and correctly persist',()=>{
  const pack=createBackpack();
  assert.equal(generateEnemyLoot('scout',0,null,()=>.5).some(
    e=>e.itemId==='clothing:field-cap'),true);
  assert.equal(generateEnemyLoot('raider',0,null,()=>.5).some(
    e=>e.itemId==='clothing:field-backpack'),true);
  addItem(pack,'clothing:field-cap',1);
  addItem(pack,'clothing:field-backpack',1);
  addItem(pack,'armor:citadel-head',1);
  const cap=pack.items.find(e=>e.itemId==='clothing:field-cap');
  const backpack=pack.items.find(e=>e.itemId==='clothing:field-backpack');
  const helmet=pack.items.find(e=>e.itemId==='armor:citadel-head');
  assert.equal(equipFromInventory(pack,cap.uid).ok,true);
  assert.equal(equipFromInventory(pack,backpack.uid).ok,true);
  assert.deepEqual(pack.equipment.clothing,
    {head:'field-cap',back:'field-backpack'});
  // Head armor replaces cap so gear is never equipped but invisible.
  assert.equal(equipFromInventory(pack,helmet.uid).ok,true);
  assert.equal(pack.equipment.clothing.head,'none');
  assert.equal(pack.equipment.armor.head,'citadel-head');
  assert.equal(equipFromInventory(pack,cap.uid).ok,true);
  assert.equal(pack.equipment.armor.head,'none');
  const restored=safeBackpackSnapshot(pack);
  assert.deepEqual(restored.equipment.clothing,
    {head:'field-cap',back:'field-backpack'});
  assert.equal(unequipWearable(restored,'clothing','back').ok,true);
  assert.equal(restored.equipment.clothing.back,'none');
  assert.equal(countItem(restored,'clothing:field-backpack'),1,
    'Unequipping must not delete a wearable item');
  assert.equal(unequipWearable(restored,'clothing','head').ok,true);
  assert.equal(restored.equipment.clothing.head,'none');
  assert.equal(equipFromInventory(restored,restored.items.find(
    e=>e.itemId==='armor:citadel-head').uid).ok,true);
  assert.equal(unequipWearable(restored,'armor','head').ok,true);
  assert.equal(restored.equipment.armor.head,'none');
});

test('W09.7 never restores headwear that was dropped from inventory',()=>{
  const pack=createBackpack();
  addItem(pack,'clothing:field-cap',1);
  const uid=pack.items[0].uid;
  equipFromInventory(pack,uid);
  removeItem(pack,uid);
  assert.equal(safeBackpackSnapshot(pack).equipment.clothing.head,'none');
});


test('W09.8 category navigation maps supplies, equipment and future quests',()=>{
  assert.deepEqual(INVENTORY_CATEGORIES.map(c=>c.id),
    ['all','weapon','armor','power','clothing','aid','junk','quest']);
  assert.equal(inventorySection(getItem('supply:salvage')),'junk');
  assert.equal(inventorySection(getItem('supply:optic-glass')),'junk');
  assert.equal(inventorySection(getItem('supply:medkit')),'aid');
  assert.equal(inventorySection(getItem('armor:ranger-chest')),'armor');
  assert.equal(inventorySection(getItem('clothing:field-cap')),'clothing');
  assert.equal(displayAmmoCount(998),'998');
  assert.equal(displayAmmoCount(999),'999');
  assert.equal(displayAmmoCount(1000),'999+');
  assert.equal(displayAmmoCount(2500),'999+');
});

test('W09.8 ammo routes on TAKE and TAKE ALL, saves and migrates old loose stacks',()=>{
  const pack=createBackpack();
  const initial=ammoReserve(pack,'service-carbine');
  const bag=createLootBag('ammo-drop',0,0,[
    {itemId:'ammo:service-carbine',quantity:1200},
    {itemId:'supply:medkit',quantity:1}
  ]);
  assert.equal(takeFromBag(pack,bag,0).added,1200);
  assert.equal(ammoReserve(pack,'service-carbine'),initial+1200);
  assert.equal(pack.items.length,0);
  assert.equal(takeAllFromBag(pack,bag).added,1);
  assert.equal(pack.items.length,1);
  const restored=safeBackpackSnapshot(JSON.parse(JSON.stringify(pack)));
  assert.equal(ammoReserve(restored,'service-carbine'),initial+1200);
  assert.equal(restored.items.filter(e=>e.itemId.startsWith('ammo:')).length,0);
  const old=safeBackpackSnapshot({
    items:[{itemId:'ammo:pipe-smg',quantity:180},
      {itemId:'ammo:pipe-smg',quantity:30}],
    equipment:{weapon:'scrap-pistol'}
  });
  assert.equal(ammoReserve(old,'pipe-smg'),ARSENAL.find(w=>w.id==='pipe-smg').startingReserve+210);
  assert.equal(old.items.length,0);
  assert.equal(displayAmmoCount(998),'998');
});
test('Power-armor loot preserves individual broken plate condition and core charge',()=>{
  const pack=createBackpack();
  const found=createLootBag('power-salvage',2,4,[
    {itemId:'power-plate:t60-head',quantity:1,condition:0},
    {itemId:'power-plate:t45-rightArm',quantity:1,condition:55},
    {itemId:'supply:fusion-core',quantity:1,charge:37.5},
    {itemId:'supply:fusion-core',quantity:1,charge:100}
  ]);
  assert.equal(inventorySection(getItem('power-plate:t60-head')),'power');
  assert.equal(inventorySection(getItem('supply:fusion-core')),'power');
  assert.equal(takeAllFromBag(pack,found).added,4);
  assert.equal(found.items.length,0);
  const broken=pack.items.find(i=>i.itemId==='power-plate:t60-head');
  assert.equal(broken.condition,0,'Broken piece remains a real item');
  assert.equal(pack.items.find(i=>i.itemId==='power-plate:t45-rightArm').condition,55);
  assert.deepEqual(pack.items.filter(i=>i.itemId==='supply:fusion-core')
    .map(i=>i.charge).sort((a,b)=>a-b),[37.5,100]);
  const restored=safeBackpackSnapshot(JSON.parse(JSON.stringify(pack)));
  assert.equal(restored.items.find(i=>i.itemId==='power-plate:t60-head').condition,0);
  assert.equal(restored.items.find(i=>i.itemId==='supply:fusion-core').charge,37.5);
  const removed=removeItem(pack,broken.uid,1);
  assert.equal(removed.condition,0);
  assert.equal(removed.itemId,'power-plate:t60-head');
  assert.equal(pack.items.some(i=>i.uid===broken.uid),false);
  const plain=addItem(pack,'armor:ranger-head',1);
  assert.equal(plain.added,1);
  assert.equal(Object.hasOwn(pack.items.find(i=>i.itemId==='armor:ranger-head'),
    'condition'),false,'Normal armor still has no durability');
});
