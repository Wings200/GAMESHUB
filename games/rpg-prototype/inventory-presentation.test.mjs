import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterAndSortInventory,discoveredMapPoints,itemInspectionFacts}
  from './inventory-presentation.mjs';
import {createBackpack,addItem,getItem,inventorySection} from './inventory.mjs';

test('item search, sorting and armor-slot selection never mutate owned stacks',()=>{
  const pack=createBackpack();pack.items=[];
  addItem(pack,'supply:medkit',3);
  addItem(pack,'supply:rad-flush',2);
  addItem(pack,'clothing:field-backpack',1);
  addItem(pack,'armor:scrap-head',1);
  addItem(pack,'armor:scrap-chest',1);
  const before=JSON.stringify(pack);
  const inputs={section:inventorySection};
  const items=filterAndSortInventory(pack.items,getItem,{
    ...inputs,query:'FIELD',sort:'name'});
  assert.deepEqual(items.map(e=>e.itemId),['clothing:field-backpack','supply:medkit']);
  const all=filterAndSortInventory(pack.items,getItem,{...inputs,sort:'value'});
  assert.ok(getItem(all[0].itemId).value>=getItem(all[1].itemId).value);
  const weight=filterAndSortInventory(pack.items,getItem,{...inputs,sort:'weight'});
  assert.ok(getItem(weight[0].itemId).weight>=getItem(weight[1].itemId).weight);
  const armor=filterAndSortInventory(pack.items,getItem,{
    ...inputs,category:'armor',slot:'head'});
  assert.deepEqual(armor.map(e=>e.itemId),['armor:scrap-head']);
  assert.equal(JSON.stringify(pack),before);
});

test('inspection describes real item values, stack weight and treatment',()=>{
  const med=getItem('supply:medkit');
  const facts=itemInspectionFacts(med,{quantity:3});
  assert.deepEqual(facts.find(f=>f[0]==='TOTAL VALUE'),['TOTAL VALUE',105+' CAPS']);
  assert.deepEqual(facts.find(f=>f[0]==='TOTAL WEIGHT'),['TOTAL WEIGHT','1.5 LB']);
  assert.deepEqual(facts.find(f=>f[0]==='HEALTH RESTORED'),['HEALTH RESTORED','+40 HP']);
  const core=itemInspectionFacts(getItem('supply:fusion-core'),{quantity:1,charge:42.1});
  assert.deepEqual(core.find(f=>f[0]==='FUSION CHARGE'),['FUSION CHARGE','43%']);
});

test('discovered places list uses fog-of-war and true coordinates',()=>{
  const points=[
    {id:'hidden',label:'Secret',x:4,z:4},
    {id:'far',label:'Far',x:20,z:0},
    {id:'near',label:'Near',x:3,z:4}
  ];
  const result=discoveredMapPoints(points,(x,z)=>x!==4,0,0);
  assert.deepEqual(result.map(p=>p.id),['near','far']);
  assert.deepEqual(result.map(p=>p.distance),[5,20]);
  assert.equal(points.length,3);
});

test('character terminal controls are actually hooked to gameplay functions',()=>{
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  for(const id of ['inventorySearch','inventorySort','inventoryInspection',
    'inventorySpecialGrid','inventoryProfileRads','inventoryProfileAP',
    'fieldMapDiscoveredList','fieldMapReturnNav']){
    assert.match(html,new RegExp('id="'+id+'"'));
    assert.match(js,new RegExp(id));
  }
  assert.match(js,/filterAndSortInventory\(backpack\.items,getItem/);
  assert.match(js,/discoveredMapPoints\(mapPoints/);
  assert.match(js,/fieldMap\.setWaypoint\(place\.x,place\.z\)/);
  assert.match(html,/id="inventoryQuestFilters"/);
  assert.match(js,/\[data-quest-filter\]/);
  assert.match(js,/if\(e\.target\.closest\?\.\('input,textarea,select/);
});
