import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getItem,createBackpack,addItem,countItem,inventorySection,inventoryWeight}
  from './inventory.mjs';
import {createRadiationState,radiationHealthLimit} from './radiation.mjs';
import {VENDORS,createVendorStock,vendorAccepts,buyFromVendor}
  from './vendors.mjs';
import {CONSUMABLE_EFFECTS,createConsumableStatus,safeConsumableSnapshot,
  consumableBonuses,activeConsumableLabels,tickConsumableEffects,
  consumeSurvivalItem} from './consumables.mjs';

const itemIds=['supply:clean-water','supply:trail-stew','supply:dirty-water',
  'supply:combat-stim','supply:focus-tonic','supply:rad-shield'];
const setup=(id,health=50)=>{
  const pack=createBackpack();addItem(pack,id,2);
  const player={health,maxHealth:100,alive:true};
  return {pack,player,rads:createRadiationState(),
    effects:createConsumableStatus(),uid:pack.items[0].uid};
};

test('All six supplies have real mass, aid sections, and finite medicine stock',()=>{
  const offered=VENDORS.find(v=>v.id==='medic').offers.map(x=>x.itemId);
  const stock=createVendorStock();
  for(const id of itemIds){
    const item=getItem(id);
    assert.equal(item.category,'supply');
    assert.ok(item.weight>0&&item.value>0);
    assert.equal(inventorySection(item),'aid');
    assert.ok(offered.includes(id));
    assert.ok(stock.medic[id]>0);
    assert.equal(vendorAccepts('medic',id),true);
    assert.equal(vendorAccepts('scavenger',id),false);
  }
  const pack=createBackpack();
  const bought=buyFromVendor(pack,10000,'medic','supply:rad-shield',stock,1);
  assert.equal(bought.ok,true);
  assert.equal(countItem(bought.pack,'supply:rad-shield'),1);
  assert.ok(inventoryWeight(bought.pack)>0);
});

test('Clean water restores real HP only when wounded; no false status or rads',()=>{
  const s=setup('supply:clean-water',63);
  const used=consumeSurvivalItem(s.pack,s.uid,s.player,s.rads,s.effects);
  assert.equal(used.restored,20);
  assert.equal(s.player.health,83);
  assert.equal(s.rads.rads,0);
  assert.equal(countItem(s.pack,'supply:clean-water'),1);
  s.player.health=100;
  assert.equal(consumeSurvivalItem(s.pack,s.uid,s.player,s.rads,s.effects).reason,
    'health-full');
  assert.equal(countItem(s.pack,'supply:clean-water'),1);
});

test('Contaminated food and water heal then cause real persistent HP-cap loss',()=>{
  const s=setup('supply:trail-stew',40);
  const used=consumeSurvivalItem(s.pack,s.uid,s.player,s.rads,s.effects);
  assert.equal(used.restored,30);
  assert.equal(used.radsAdded,5);
  assert.equal(s.rads.rads,5);
  assert.equal(s.player.maxHealth,radiationHealthLimit(s.rads));
  assert.equal(s.player.health,70,'Five RADS remain saved, but the cap rounds to 100 HP');
  const d=setup('supply:dirty-water',15);
  const drank=consumeSurvivalItem(d.pack,d.uid,d.player,d.rads,d.effects);
  assert.equal(drank.restored,10);
  assert.equal(drank.radsAdded,15);
  assert.equal(d.player.maxHealth,99);
  assert.equal(d.player.health,24);
});

test('Temporary chems feed combat, VATS and radiation stats without stacking',()=>{
  const s=setup('supply:combat-stim',100);
  const effect=consumeSurvivalItem(s.pack,s.uid,s.player,s.rads,s.effects);
  assert.equal(effect.effectSeconds,60);
  assert.equal(consumableBonuses(s.effects).gunDamageMultiplier,1.2);
  assert.equal(consumeSurvivalItem(s.pack,s.uid,s.player,s.rads,s.effects).reason,
    'already-active');
  assert.equal(countItem(s.pack,'supply:combat-stim'),1);
  assert.equal(tickConsumableEffects(s.effects,59),true);
  assert.equal(Math.round(s.effects.effects['combat-stim']),1);
  tickConsumableEffects(s.effects,1);
  assert.equal(consumableBonuses(s.effects).gunDamageMultiplier,1);
  assert.equal(activeConsumableLabels(s.effects).length,0);
  const f=setup('supply:focus-tonic',100);
  consumeSurvivalItem(f.pack,f.uid,f.player,f.rads,f.effects);
  assert.equal(consumableBonuses(f.effects).vatsChanceBonus,12);
  const r=setup('supply:rad-shield',100);
  consumeSurvivalItem(r.pack,r.uid,r.player,r.rads,r.effects);
  assert.equal(consumableBonuses(r.effects).radiationProtection,.35);
  assert.ok(activeConsumableLabels(r.effects)[0].includes('120s'));
});

test('Effects survive bounded save/reload; unknown or invalid effects cannot inject buffs',()=>{
  const restored=safeConsumableSnapshot({version:0,effects:{
    'combat-stim':900,'focus-tonic':-2,'rad-shield':42,'god-mode':9999}});
  assert.deepEqual(Object.keys(restored.effects).sort(),
    ['combat-stim','rad-shield']);
  assert.equal(restored.effects['combat-stim'],CONSUMABLE_EFFECTS['combat-stim'].seconds);
  assert.equal(restored.effects['rad-shield'],42);
  assert.equal(consumableBonuses(restored).gunDamageMultiplier,1.2);
  assert.equal(tickConsumableEffects(restored,0),false);
  const reloaded=safeConsumableSnapshot(JSON.parse(JSON.stringify(restored)));
  assert.deepEqual(reloaded,restored);
});

test('Missing items, deaths and non-consumable supplies are non-mutating',()=>{
  const s=setup('supply:clean-water',45),before=JSON.stringify(s.pack);
  assert.equal(consumeSurvivalItem(s.pack,999,s.player,s.rads,s.effects).reason,'missing');
  s.player.alive=false;
  assert.equal(consumeSurvivalItem(s.pack,s.uid,s.player,s.rads,s.effects).reason,
    'player-down');
  assert.equal(JSON.stringify(s.pack),before);
  addItem(s.pack,'supply:salvage',1);
  const uid=s.pack.items.find(e=>e.itemId==='supply:salvage').uid;
  s.player.alive=true;
  assert.equal(consumeSurvivalItem(s.pack,uid,s.player,s.rads,s.effects).reason,
    'not-consumable');
  assert.equal(countItem(s.pack,'supply:salvage'),1);
});

test('Runtime wires buffs into the actual weapon hit, VATS odds and exposure',()=>{
  const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  assert.match(source,/damageThisPellet\*specialModifiers\.gunDamageMultiplier\*\s*consumableBonuses\(consumableStatus\)\.gunDamageMultiplier/);
  assert.match(source,/baseChance>0\?Math\.min\(95,baseChance\+\s*consumableBonuses\(consumableStatus\)\.vatsChanceBonus\)/);
  assert.match(source,/protection=1-\(1-armorProtection\)\*\(1-chemProtection\)/);
  assert.match(source,/tickConsumableEffects\(consumableStatus,dt\)/);
});
