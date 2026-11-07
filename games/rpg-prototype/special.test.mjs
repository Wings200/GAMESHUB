import test from 'node:test';
import assert from 'node:assert/strict';
import {SPECIAL_ATTRIBUTES,SPECIAL_PERKS,createSpecialState,safeSpecialSnapshot,
  allocateSpecialPoint,purchaseSpecialPerk,xpForNextLevel,gainSpecialXP,
  specialBonuses,discountedMaterials,discountedComponentRecipe} from './special.mjs';

test('S.P.E.C.I.A.L. has all seven attributes with Charisma as the seventh',()=>{
  assert.deepEqual(SPECIAL_ATTRIBUTES.map(x=>x.name),
    ['STRENGTH','PERCEPTION','ENDURANCE','CHARISMA','INTELLIGENCE','AGILITY','LUCK']);
  assert.equal(SPECIAL_PERKS.length,21);
  assert.ok(SPECIAL_ATTRIBUTES.every(a=>
    SPECIAL_PERKS.filter(p=>p.stat===a.id).length===3));
  const s=createSpecialState();
  assert.equal(s.level,1);assert.equal(s.statPoints,5);assert.equal(s.perkPoints,2);
  assert.ok(Object.values(s.attributes).every(value=>value===3));
});

test('Attribute upgrades spend earned points and respect the ten-point cap',()=>{
  const s=createSpecialState();
  assert.equal(allocateSpecialPoint(s,'bad').reason,'unknown-stat');
  assert.equal(allocateSpecialPoint(s,'strength').ok,true);
  assert.equal(s.attributes.strength,4);
  assert.equal(s.statPoints,4);
  s.attributes.strength=10;
  assert.equal(allocateSpecialPoint(s,'strength').reason,'max-stat');
  s.statPoints=0;
  assert.equal(allocateSpecialPoint(s,'agility').reason,'no-stat-points');
});

test('Perk ranks have attribute prerequisites and consume perk points',()=>{
  const s=createSpecialState();
  assert.equal(purchaseSpecialPerk(s,'unknown').reason,'unknown-perk');
  assert.equal(purchaseSpecialPerk(s,'hard-hitter').reason,'stat-locked');
  assert.equal(purchaseSpecialPerk(s,'steady-grip').ok,true);
  assert.equal(purchaseSpecialPerk(s,'steady-grip').rank,2);
  assert.equal(s.perkPoints,0);
  assert.equal(purchaseSpecialPerk(s,'focused-sights').reason,'no-perk-points');
  s.perkPoints=3;
  assert.equal(purchaseSpecialPerk(s,'steady-grip').reason,'max-rank');
  s.attributes.strength=8;
  assert.equal(purchaseSpecialPerk(s,'breaker').rank,1);
  assert.equal(purchaseSpecialPerk(s,'breaker').reason,'max-rank');
});

test('Combat XP levels up, awards perks, and every fourth level grants a stat point',()=>{
  const s=createSpecialState();
  assert.equal(xpForNextLevel(1),255);
  const x=gainSpecialXP(s,1600,'combat');
  assert.equal(x.gained,1600);
  assert.equal(x.level,4);
  assert.equal(x.levels,3);
  assert.equal(s.perkPoints,5);
  assert.equal(s.statPoints,6);
  assert.ok(s.xp>=0&&s.xp<xpForNextLevel(s.level));
});

test('W20.93.1 each level requires exactly 50% more XP without resetting progress',()=>{
  for(const level of [1,4,10,25,49,50])
    assert.equal(xpForNextLevel(level),Math.round((100+70*level)*1.5));
  const saved=safeSpecialSnapshot({level:15,xp:850,statPoints:2,
    perkPoints:3,attributes:{luck:6},perks:{'lucky-shot':1}});
  assert.equal(saved.level,15);
  assert.equal(saved.xp,850);
  assert.equal(saved.perks['lucky-shot'],1);
  assert.ok(saved.xp<xpForNextLevel(saved.level));
});

test('Seven stat passives and purchased perks change real gameplay multipliers',()=>{
  const s=createSpecialState(),base=specialBonuses(s);
  assert.equal(base.speedMultiplier,1);
  assert.equal(base.recoilMultiplier,1);
  assert.equal(base.damageTakenMultiplier,1);
  s.attributes.agility=6;
  s.attributes.perception=5;
  s.attributes.intelligence=5;
  s.attributes.endurance=5;
  s.perkPoints=10;
  purchaseSpecialPerk(s,'quick-step');
  purchaseSpecialPerk(s,'focused-sights');
  purchaseSpecialPerk(s,'quick-study');
  purchaseSpecialPerk(s,'long-haul');
  const upgraded=specialBonuses(s);
  assert.ok(upgraded.speedMultiplier>base.speedMultiplier);
  assert.ok(upgraded.aimSpreadMultiplier<base.aimSpreadMultiplier);
  assert.ok(upgraded.xpMultiplier>base.xpMultiplier);
  assert.ok(upgraded.staminaDrainMultiplier<base.staminaDrainMultiplier);
  assert.ok(upgraded.damageTakenMultiplier<base.damageTakenMultiplier);
  assert.ok(gainSpecialXP(s,100,'loot').gained>100);
});

test('Intelligence discounts finite salvage and glass costs without negative amounts',()=>{
  assert.deepEqual(discountedMaterials({salvage:18,glass:4},0),{salvage:18,glass:4});
  assert.deepEqual(discountedMaterials({salvage:18,glass:4},.25),{salvage:14,glass:3});
  assert.deepEqual(discountedMaterials({salvage:2,glass:0},.5),{salvage:1,glass:0});
});

test('Reloading saved progress clamps damaged snapshots and preserves perk ranks',()=>{
  const s=createSpecialState();
  s.attributes.charisma=8;s.attributes.agility=6;
  s.perks['quick-step']=2;s.perks['silver-tongue']=1;
  s.level=9;s.xp=22;s.statPoints=1;s.perkPoints=3;
  assert.deepEqual(safeSpecialSnapshot(JSON.parse(JSON.stringify(s))),s);
  const corrupted=safeSpecialSnapshot({level:999,xp:Infinity,statPoints:-9,
    perkPoints:999,attributes:{strength:-33,luck:1000},
    perks:{'steady-grip':999,'breaker':-2,malicious:999}});
  assert.equal(corrupted.level,50);
  assert.equal(corrupted.attributes.strength,1);
  assert.equal(corrupted.attributes.luck,10);
  assert.equal(corrupted.perks['steady-grip'],2);
  assert.equal(corrupted.perks.malicious,undefined);
  assert.equal(corrupted.statPoints,0);
  assert.equal(corrupted.perkPoints,99);
});

test('W20.93 every character stat has a live mechanical bonus and legacy saves survive',()=>{
  const original=createSpecialState(),baseline=specialBonuses(original);
  const character=safeSpecialSnapshot({...original,attributes:{...original.attributes,
    strength:10,perception:10,endurance:10,charisma:10,
    intelligence:10,agility:10,luck:10}});
  const b=specialBonuses(character);
  assert.equal(b.backpackBonusSlots,3);
  assert.ok(b.recoilMultiplier<baseline.recoilMultiplier);
  assert.ok(b.aimSpreadMultiplier<baseline.aimSpreadMultiplier);
  assert.ok(b.damageTakenMultiplier<baseline.damageTakenMultiplier);
  assert.ok(b.barterBuyMultiplier<baseline.barterBuyMultiplier);
  assert.ok(b.barterSellMultiplier>baseline.barterSellMultiplier);
  assert.ok(b.xpMultiplier>baseline.xpMultiplier);
  assert.ok(b.vatsApMultiplier<baseline.vatsApMultiplier);
  assert.ok(b.vatsCritGainMultiplier>baseline.vatsCritGainMultiplier);
  character.perks['silver-tongue']=1;
  character.perks['ghost-runner']=1;
  assert.ok(specialBonuses(character).barterBuyMultiplier<b.barterBuyMultiplier);
  assert.ok(specialBonuses(character).vatsApMultiplier<b.vatsApMultiplier);
});

test('W20.93 rounded integer recipes are deterministic and never free',()=>{
  const recipe={'material:steel':5,'material:spring':3,'material:oil':1};
  assert.deepEqual(discountedComponentRecipe(recipe,0),recipe);
  assert.deepEqual(discountedComponentRecipe(recipe,.24),
    {'material:steel':4,'material:spring':2,'material:oil':1});
  assert.deepEqual(discountedComponentRecipe(recipe,.24),
    discountedComponentRecipe(recipe,.24));
  assert.deepEqual(discountedComponentRecipe(recipe,100),
    {'material:steel':3,'material:spring':2,'material:oil':1});
});

