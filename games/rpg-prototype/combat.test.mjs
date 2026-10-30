import test from 'node:test';
import assert from 'node:assert/strict';
import {HIT_ZONES,ARMOR_TYPES,createDummy,applyDamage,resetDummy} from './combat.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);

test('All targets begin with 100 health and configured armor pool',()=>{
  const raw=createDummy('none'),light=createDummy('light'),heavy=createDummy('heavy');
  assert.equal(raw.health,100);assert.equal(raw.armor,0);
  assert.equal(light.armor,60);assert.equal(heavy.armor,120);
  assert.deepEqual(Object.keys(HIT_ZONES),['head','torso','limb']);
  assert.throws(()=>createDummy('godmode'),/Unknown armor type/);
});
test('Unarmored pistol body damage, headshot and limb damage',()=>{
  near(applyDamage(createDummy('none'),20,'torso').damage,20);
  near(applyDamage(createDummy('none'),20,'head').damage,50);
  near(applyDamage(createDummy('none'),20,'limb').damage,14);
});
test('Light vest reduces torso damage but leaves head and limbs unprotected',()=>{
  const light=createDummy('light');
  const chest=applyDamage(light,20,'torso');
  near(chest.blocked,6);near(chest.damage,14);near(light.armor,54);
  near(applyDamage(light,20,'head').damage,50);
  near(applyDamage(light,20,'limb').damage,14);
});
test('Heavy armor protects the chest and also has a helmet',()=>{
  const heavy=createDummy('heavy');
  let chest=applyDamage(heavy,20,'torso');
  near(chest.blocked,11);near(chest.damage,9);
  let helmet=applyDamage(heavy,20,'head');
  near(helmet.blocked,20);near(helmet.damage,30);
  near(heavy.armor,89);
});
test('Armor depletes and future hits become full damage',()=>{
  const d=createDummy('light',500);
  let broke=false;
  for(let i=0;i<12;i++)broke ||=applyDamage(d,20,'torso').armorBroken;
  assert.equal(broke,true);near(d.armor,0);
  near(applyDamage(d,20,'torso').damage,20);
});
test('Damage cannot take HP negative, and dead targets are immune until reset',()=>{
  const d=createDummy();
  const shot=applyDamage(d,20,'head');
  assert.equal(shot.killed,false);
  const lethal=applyDamage(d,20,'head');
  assert.equal(lethal.killed,true);near(lethal.health,0);
  const ignored=applyDamage(d,20,'head');
  assert.equal(ignored.applied,false);assert.equal(ignored.killed,false);
  assert.equal(d.hits,2);
  resetDummy(d);
  assert.equal(d.alive,true);near(d.health,100);assert.equal(d.hits,0);
});
test('Armor cannot absorb more damage than its remaining capacity',()=>{
  const d=createDummy('heavy',300);d.armor=3;
  const result=applyDamage(d,20,'head');
  near(result.blocked,3);near(result.damage,47);
  assert.equal(result.armorBroken,true);near(d.armor,0);
});
test('Bad damage values never heal and zone validation is explicit',()=>{
  const d=createDummy();
  assert.equal(applyDamage(d,-100).damage,0);
  assert.equal(applyDamage(d,NaN).damage,0);
  near(d.health,100);
  assert.throws(()=>applyDamage(d,20,'foot'),/Unknown hit zone/);
  assert.ok(ARMOR_TYPES.heavy.torsoReduction>ARMOR_TYPES.light.torsoReduction);
});
