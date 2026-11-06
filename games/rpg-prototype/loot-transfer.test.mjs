import test from 'node:test';
import assert from 'node:assert/strict';
import {moveLootQuantity,moveAllLoot} from './loot-transfer.mjs';

test('partial takes conserve quantities and keep the remaining case inventory',()=>{
  const bag={items:[{itemId:'supply:medkit',quantity:7}],opened:false};
  let owned=0;
  const result=moveLootQuantity(bag,0,3,(entry,amount)=>{
    owned+=amount;return {added:amount};
  });
  assert.equal(result.added,3);
  assert.equal(owned+bag.items[0].quantity,7);
  assert.equal(bag.items[0].quantity,4);
  assert.equal(bag.opened,true);
});

test('capacity rejection preserves the container without marking it emptied',()=>{
  const bag={items:[{itemId:'armor:sample',quantity:2}],opened:false};
  const result=moveLootQuantity(bag,0,2,()=>({added:0}));
  assert.equal(result.added,0);
  assert.equal(result.leftover,2);
  assert.equal(result.full,true);
  assert.equal(bag.items.length,1);
  assert.equal(bag.opened,false);
});

test('partial capacity accepts only what fits and never duplicates items',()=>{
  const bag={items:[{itemId:'ammo:sample',quantity:10}],opened:false};
  let owned=0;
  const result=moveLootQuantity(bag,0,9,(_,amount)=>{
    const added=Math.min(amount,4);owned+=added;return {added};
  });
  assert.deepEqual([owned,bag.items[0].quantity],[4,6]);
  assert.equal(result.full,true);
  assert.equal(result.leftover,6);
});

test('empty or invalid takes do not mutate the bag',()=>{
  const bag={items:[{itemId:'supply:salvage',quantity:1}],opened:false};
  assert.equal(moveLootQuantity(bag,0,-1,()=>{throw Error('not called')}).added,0);
  assert.equal(moveLootQuantity(bag,8,1,()=>{throw Error('not called')}).added,0);
  assert.equal(moveLootQuantity(bag,0,1,()=>({added:1})).added,1);
  assert.equal(bag.items.length,0);
  assert.equal(bag.opened,true);
});

test('Take All skips full gear but still picks up later slotless supplies',()=>{
  const bag={items:[
    {itemId:'armor:sample',quantity:2},
    {itemId:'ammo:sample',quantity:7},
    {itemId:'supply:salvage',quantity:3}
  ],opened:false};
  const owned={};
  const result=moveAllLoot(bag,(entry,amount)=>{
    if(entry.itemId==='armor:sample')return {added:0};
    owned[entry.itemId]=(owned[entry.itemId]||0)+amount;
    return {added:amount};
  });
  assert.equal(result.added,10);
  assert.equal(result.remaining,2);
  assert.equal(bag.items.length,1);
  assert.equal(bag.items[0].itemId,'armor:sample');
  assert.deepEqual(owned,{'ammo:sample':7,'supply:salvage':3});
});
