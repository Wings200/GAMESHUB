import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPowerArmorState,setPowerPlate,plateCondition,
  POWER_ARMOR_REPAIR_RECIPES,powerRepairRequirements,repairPowerPlate
} from './power-armor.mjs';
import {generateEnemyLoot} from './inventory.mjs';
import {VENDORS} from './vendors.mjs';

const page=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');

function damagedPlate(tier,wear=50){
  const state=createPowerArmorState();
  setPowerPlate(state,'chest',tier);
  state.plateDurability.chest-=wear;
  return state;
}

test('higher power armor tiers require progressively rarer and more repair materials',()=>{
  const t45=powerRepairRequirements(damagedPlate('t45'),'chest');
  const t60=powerRepairRequirements(damagedPlate('t60'),'chest');
  const t01=powerRepairRequirements(damagedPlate('t01'),'chest');
  const sum=cost=>Object.values(cost).reduce((a,b)=>a+b,0);
  assert.ok(sum(t45)<sum(t60));
  assert.ok(sum(t60)<sum(t01));
  assert.ok(t45['material:steel']>0);
  assert.ok(t60['material:circuitry']>0);
  assert.ok(t01['material:nuclear-material']>0);
  assert.ok(t01['material:ballistic-fiber']>0);
  for(const tier of ['scrap','ranger','citadel','t45','t60','t01'])
    assert.ok(Object.keys(POWER_ARMOR_REPAIR_RECIPES[tier]).length>0);
});

test('repair cost scales with missing durability and repair discount',()=>{
  const lightlyDamaged=powerRepairRequirements(damagedPlate('t60',10),'chest');
  const broken=powerRepairRequirements(damagedPlate('t60',140),'chest');
  const discounted=powerRepairRequirements(damagedPlate('t60',140),'chest',.5);
  assert.ok(broken['material:steel']>lightlyDamaged['material:steel']);
  assert.ok(discounted['material:steel']<broken['material:steel']);
});

test('missing components reject entire repair without altering condition',()=>{
  const state=damagedPlate('t01',85),before=plateCondition(state,'chest').current;
  const cost=powerRepairRequirements(state,'chest');
  const denied=repairPowerPlate(state,'chest',{'material:steel':999});
  assert.equal(denied.ok,false);
  assert.equal(denied.reason,'materials');
  assert.ok(denied.missing.some(m=>m.itemId==='material:nuclear-material'));
  assert.equal(plateCondition(state,'chest').current,before);
  const accepted=repairPowerPlate(state,'chest',cost);
  assert.equal(accepted.ok,true);
  assert.deepEqual(accepted.cost,cost);
  assert.equal(plateCondition(state,'chest').current,plateCondition(state,'chest').max);
});

test('plates come from visibly powered opponents or reputation suppliers, not crafting',()=>{
  const lucky=generateEnemyLoot('enforcer',3,null,()=>0,
    {tier:'t45',plates:['head','chest'],coreCharge:80});
  assert.ok(lucky.some(item=>item.itemId.startsWith('power-plate:t45-')&&
    item.condition>0));
  const noFind=generateEnemyLoot('enforcer',0,null,()=>.99);
  assert.ok(!noFind.some(item=>item.itemId.startsWith('power-plate:')));
  for(const vendor of VENDORS)
    if(!vendor.faction)
      assert.ok(vendor.offers.every(offer=>!offer.itemId.startsWith('power-plate:')));
  assert.ok(VENDORS.filter(vendor=>vendor.faction).every(vendor=>
    vendor.offers.some(offer=>offer.itemId.startsWith('power-plate:t45-'))));
  assert.doesNotMatch(page,/id="powerCraftButton"/);
  assert.doesNotMatch(page,/id="powerCraftTier"/);
  assert.doesNotMatch(main,/powerCraftButton|POWER_ARMOR_RECIPES|POWER_COMPONENT_RECIPES/);
  assert.match(page,/id="powerRepairCost"/);
  assert.match(main,/powerRepairRequirements\(powerArmorState,slot,/);
});
