import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBackpack,addItem,countItem,inventoryWeight,spendMaterial,
  getItem,createLootBag,takeAllFromBag,generateEnemyLoot,safeBackpackSnapshot}
  from './inventory.mjs';
import {JUNK_ITEMS,junkYield,junkYieldText} from './junk.mjs';
import {VENDORS,vendorAccepts} from './vendors.mjs';
import {initialSettlementBuildState,safeSettlementBuildSnapshot}
  from './settlement-building.mjs';
import {storeWorkshopJunk,takeWorkshopJunk,scrapWorkshopJunk,takeWorkshopMaterial,
  workshopJunkTotal,previewWorkshopRecipe,craftWithWorkshop} from './workshop-junk.mjs';

const setup=()=>({pack:createBackpack(),state:initialSettlementBuildState()});
function deposit(pack,state,id,quantity=1){
  addItem(pack,id,quantity);
  const entry=pack.items.find(x=>x.itemId===id);
  return storeWorkshopJunk(pack,state,entry.uid,quantity);
}

test('Eight unique junk types are real inventory, loot and finite trader items',()=>{
  const wren=VENDORS.find(v=>v.id==='scavenger');
  assert.equal(JUNK_ITEMS.length,8);
  for(const junk of JUNK_ITEMS){
    assert.ok(junk.weight>0&&junk.value>0);
    assert.equal(getItem(junk.id).category,'junk');
    assert.ok(wren.offers.some(o=>o.itemId===junk.id));
    assert.ok(Object.values(junk.breakdown).every(n=>n>0));
    assert.equal(vendorAccepts('scavenger',junk.id),true);
    assert.equal(vendorAccepts('medic',junk.id),false);
  }
  assert.deepEqual(junkYield('junk:desk-fan',2),{
    'material:steel':4,'material:gears':4,'material:screw':4});
  assert.ok(junkYieldText('junk:desk-fan').includes('SCREW'));
  const pack=createBackpack();
  const bag=createLootBag('fan',0,0,[{itemId:'junk:desk-fan',quantity:1}]);
  assert.equal(takeAllFromBag(pack,bag).added,1);
  assert.equal(countItem(pack,'junk:desk-fan'),1);
  assert.equal(bag.items.length,0);
  assert.ok(generateEnemyLoot('raider',0,null,()=>.5)
    .some(entry=>entry.itemId.startsWith('junk:')));
});

test('Depositing junk changes carry weight and is recoverable without duplication',()=>{
  const {pack,state}=setup();
  addItem(pack,'junk:typewriter',3);
  const before=inventoryWeight(pack);
  const uid=pack.items[0].uid;
  assert.equal(storeWorkshopJunk(pack,state,uid,2).ok,true);
  assert.equal(workshopJunkTotal(state),2);
  assert.equal(countItem(pack,'junk:typewriter'),1);
  assert.equal(inventoryWeight(pack),before-18);
  assert.equal(takeWorkshopJunk(pack,state,'junk:typewriter',2).ok,true);
  assert.equal(countItem(pack,'junk:typewriter'),3);
  assert.equal(workshopJunkTotal(state),0);
  assert.equal(inventoryWeight(pack),before);
  assert.equal(takeWorkshopJunk(pack,state,'junk:typewriter',1).ok,false);
});

test('Scrapping yields real workshop components, not free carried components',()=>{
  const {pack,state}=setup();
  deposit(pack,state,'junk:desk-fan',2);
  const savedWeight=inventoryWeight(pack);
  const result=scrapWorkshopJunk(state,'junk:desk-fan',1);
  assert.equal(result.ok,true);
  assert.deepEqual(result.materials,junkYield('junk:desk-fan',1));
  assert.equal(workshopJunkTotal(state),1);
  assert.equal(state.workshopMaterials['material:screw'],2);
  assert.equal(countItem(pack,'material:screw'),0);
  assert.equal(inventoryWeight(pack),savedWeight);
  assert.equal(takeWorkshopMaterial(pack,state,'material:screw',1).ok,true);
  assert.equal(state.workshopMaterials['material:screw'],1);
  assert.equal(countItem(pack,'material:screw'),1);
});

test('Automatic scrapping consumes only useful stored junk and preserves leftovers',()=>{
  const {pack,state}=setup();
  deposit(pack,state,'junk:desk-fan',1);
  deposit(pack,state,'junk:coffee-mug',1);
  const recipe={'material:screw':1};
  const plan=previewWorkshopRecipe(pack,state,recipe);
  assert.equal(plan.ok,true);
  assert.deepEqual(plan.selected,{'junk:desk-fan':1});
  const result=craftWithWorkshop(pack,state,recipe,draft=>{
    assert.equal(countItem(draft,'material:screw'),2);
    assert.equal(spendMaterial(draft,'material:screw',1).removed,1);
    return {ok:true,crafted:true};
  });
  assert.equal(result.ok,true);
  assert.equal(workshopJunkTotal(state),1);
  assert.equal(state.workshopJunk['junk:coffee-mug'],1);
  assert.equal(state.workshopMaterials['material:screw'],1);
  assert.equal(state.workshopMaterials['material:gears'],2);
  assert.equal(state.workshopMaterials['material:steel'],2);
  assert.equal(countItem(pack,'material:screw'),0);
});

test('A failed craft, impossible plan or invalid callback cannot consume inventory',()=>{
  const {pack,state}=setup();
  deposit(pack,state,'junk:desk-fan',1);
  const before=JSON.stringify({pack,state});
  const lacking=craftWithWorkshop(pack,state,{'material:nuclear-material':1},
    ()=>({ok:true}));
  assert.equal(lacking.ok,false);
  assert.equal(lacking.missing[0].short,1);
  const rejected=craftWithWorkshop(pack,state,{'material:screw':2},draft=>{
    spendMaterial(draft,'material:screw',2);
    return {ok:false,reason:'invalid-placement'};
  });
  assert.equal(rejected.reason,'invalid-placement');
  assert.equal(JSON.stringify({pack,state}),before);
  const thrown=craftWithWorkshop(pack,state,{'material:screw':1},()=>{
    throw Error('test failure');
  });
  assert.equal(thrown.reason,'craft-error');
  assert.equal(JSON.stringify({pack,state}),before);
});

test('Workshop pooled components spend after the player pouch without charging twice',()=>{
  const {pack,state}=setup();
  addItem(pack,'material:steel',1);
  state.workshopMaterials['material:steel']=3;
  const result=craftWithWorkshop(pack,state,{'material:steel':3},draft=>{
    assert.equal(countItem(draft,'material:steel'),4);
    spendMaterial(draft,'material:steel',3);
    return {ok:true};
  });
  assert.equal(result.ok,true);
  assert.equal(countItem(pack,'material:steel'),0);
  assert.equal(state.workshopMaterials['material:steel'],1);
});

test('Old saves migrate and new workshop stock round-trips with strict allowlists',()=>{
  const old=safeSettlementBuildSnapshot({version:5,scrappedJunk:[]});
  assert.deepEqual(old.workshopJunk,{});
  assert.deepEqual(old.workshopMaterials,{});
  const saved=safeSettlementBuildSnapshot({version:6,
    workshopJunk:{'junk:desk-fan':2,'junk:invalid':100000,'junk:typewriter':-8},
    workshopMaterials:{'material:screw':9,'material:fake':9999}});
  assert.deepEqual(saved.workshopJunk,{'junk:desk-fan':2});
  assert.deepEqual(saved.workshopMaterials,{'material:screw':9});
  assert.deepEqual(safeSettlementBuildSnapshot(JSON.parse(JSON.stringify(saved))).workshopJunk,
    saved.workshopJunk);
  const pack=createBackpack();addItem(pack,'junk:desk-fan',1);
  assert.equal(countItem(safeBackpackSnapshot(JSON.parse(JSON.stringify(pack))),
    'junk:desk-fan'),1);
});

test('UI uses workshop transactions for building and both firearm bench types',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  assert.match(main,/storeWorkshopJunk\(backpack,settlementBuildState/);
  assert.match(main,/scrapWorkshopJunk\(settlementBuildState/);
  assert.match(main,/craftWithWorkshop\(backpack,settlementBuildState/);
  assert.match(main,/draft=>craftWeaponMod\(draft/);
  assert.match(main,/draft=>installWeaponOptic\(draft/);
  assert.match(main,/draftPack,draftState\)=>placeSettlementStructure\(draftState,draftPack/);
  assert.match(main,/craftWithWorkshop\(backpack,settlementBuildState,needed,repairWithMaterials\)/);
});
