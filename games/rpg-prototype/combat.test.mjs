import test from 'node:test';
import assert from 'node:assert/strict';
import {ARMOR_SLOTS,ARMOR_ITEMS,ARMOR_STYLES,ARMOR_PRESETS,ENEMY_ARMOR_PRESETS,createLoadout,
  getArmorPiece,armorPointsForSlot,damageReductionForPoints,
  ENEMY_ARMOR_VARIANTS,enemyArmorForRound,
  createDummy,equipArmor,applyDamage,resetDummy,HIT_ZONES} from './combat.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8, a+' != '+b);
test('Six independent armor slots each have sixteen distinct pieces and an unequipped option',()=>{
  assert.deepEqual(ARMOR_SLOTS,['head','chest','leftArm','rightArm','leftLeg','rightLeg']);
  assert.equal(ARMOR_STYLES.length,16);
  assert.equal(ARMOR_SLOTS.reduce((n,s)=>n+ARMOR_ITEMS[s].length-1,0),96);
  for(const slot of ARMOR_SLOTS){
    assert.equal(ARMOR_ITEMS[slot].length,17);
    assert.equal(new Set(ARMOR_ITEMS[slot].map(p=>p.id)).size,17);
    assert.equal(ARMOR_ITEMS[slot][0].points,0);
    assert.ok(ARMOR_ITEMS[slot][16].points>ARMOR_ITEMS[slot][1].points);
  }
});
test('Three default dummies are bare, partially equipped, and fully protected',()=>{
  const bare=createDummy('none'),light=createDummy('light'),heavy=createDummy('heavy');
  assert.equal(bare.health,100);assert.equal(armorPointsForSlot(bare,'rightArm'),0);
  assert.equal(armorPointsForSlot(light,'head'),0);
  assert.ok(armorPointsForSlot(light,'rightLeg')>0);
  assert.ok(armorPointsForSlot(heavy,'head')>0);
  assert.ok(armorPointsForSlot(heavy,'chest')>armorPointsForSlot(light,'chest'));
  assert.equal(ARMOR_PRESETS.heavy.rightArm,'citadel-rightArm');
});
test('All three enemy roles have visible protective head armor and distinct survivability',()=>{
  const scout=createDummy(ENEMY_ARMOR_PRESETS.scout);
  const raider=createDummy(ENEMY_ARMOR_PRESETS.raider);
  const enforcer=createDummy(ENEMY_ARMOR_PRESETS.enforcer);
  assert.ok(armorPointsForSlot(scout,'head')>0);
  assert.ok(armorPointsForSlot(raider,'head')>armorPointsForSlot(scout,'head'));
  assert.ok(armorPointsForSlot(enforcer,'head')>armorPointsForSlot(raider,'head'));
  // The 38-damage revolver must no longer two-tap Scout or Raider heads.
  for(const enemy of [scout,raider,enforcer]){
    assert.equal(applyDamage(enemy,38,'head').killed,false);
    assert.equal(applyDamage(enemy,38,'head').killed,false);
    assert.ok(enemy.health>0);
  }
  // But headshots still do appreciably more than protected torso hits.
  const first=createDummy(ENEMY_ARMOR_PRESETS.raider);
  const head=applyDamage(first,20,'head').damage;
  const chest=applyDamage(createDummy(ENEMY_ARMOR_PRESETS.raider),20,'chest').damage;
  assert.ok(head>chest);
});
test('W06.5 modular enemy outfits range from one leg piece to a full suit',()=>{
  const single=enemyArmorForRound('scout',1);
  assert.deepEqual(ARMOR_SLOTS.filter(slot=>single[slot]!=='none'),['leftLeg']);
  const complete=enemyArmorForRound('enforcer',0);
  assert.equal(ARMOR_SLOTS.filter(slot=>complete[slot]!=='none').length,6);
  for(const id of Object.keys(ENEMY_ARMOR_VARIANTS)){
    const variants=ENEMY_ARMOR_VARIANTS[id];
    for(let round=0;round<variants.length;round++){
      const armor=enemyArmorForRound(id,round);
      for(const slot of ARMOR_SLOTS)getArmorPiece(slot,armor[slot]);
    }
    assert.deepEqual(enemyArmorForRound(id,0),enemyArmorForRound(id,variants.length));
  }
  assert.throws(()=>enemyArmorForRound('unknown'),/Unknown enemy/);
});
test('Headshot, body and limb base damage apply even without armor',()=>{
  close(applyDamage(createDummy(),20,'head').damage,50);
  close(applyDamage(createDummy(),20,'chest').damage,20);
  close(applyDamage(createDummy(),20,'rightArm').damage,14);
  close(applyDamage(createDummy(),20,'leftLeg').damage,14);
});
test('Right arm armor only protects the right arm, not the left or legs',()=>{
  const d=createDummy();
  equipArmor(d,'rightArm','aegis-rightArm');
  const right=applyDamage(d,20,'rightArm');
  const left=applyDamage(d,20,'leftArm');
  const leg=applyDamage(d,20,'rightLeg');
  assert.ok(right.damage<left.damage);
  assert.ok(right.blocked>0);
  close(left.damage,14);close(leg.damage,14);
  assert.equal(d.loadout.leftArm,'none');
});
test('Ratings produce meaningful, stable non-breakable damage reductions',()=>{
  const d=createDummy('heavy',1000);
  const rating=armorPointsForSlot(d,'chest');
  const first=applyDamage(d,20,'chest');
  assert.ok(first.reduction>.7);
  assert.ok(first.damage<6);
  for(let i=0;i<25;i++){
    const next=applyDamage(d,20,'chest');
    close(next.damage,first.damage);
    close(next.points,rating);
  }
  close(armorPointsForSlot(d,'chest'),rating);
  assert.equal(Object.hasOwn(d,'armor'),false);
  assert.equal(Object.hasOwn(d,'maxArmor'),false);
});
test('Equipping and removing one piece preserves HP and every other slot',()=>{
  const d=createDummy('light');
  applyDamage(d,20,'leftLeg');
  const hp=d.health,arm=d.loadout.leftArm;
  equipArmor(d,'head','ceramic-head');
  assert.equal(d.loadout.leftArm,arm);
  close(d.health,hp);
  equipArmor(d,'head','none');
  close(armorPointsForSlot(d,'head'),0);
  resetDummy(d);
  assert.equal(d.health,100);
  assert.equal(d.loadout.head,'none');
  assert.equal(d.loadout.leftArm,arm);
});
test('Invalid IDs cannot equip armor to the wrong slot',()=>{
  const d=createDummy();
  assert.throws(()=>getArmorPiece('foot','none'),/Invalid armor slot/);
  assert.throws(()=>equipArmor(d,'rightLeg','ceramic-leftLeg'),/Invalid armor piece/);
  assert.throws(()=>createLoadout('godmode'),/Unknown armor preset/);
  assert.throws(()=>applyDamage(d,20,'limb'),/Invalid hit zone/);
  assert.ok(HIT_ZONES.head>HIT_ZONES.chest);
});
test('Dead targets cannot take additional damage until reset',()=>{
  const d=createDummy();
  applyDamage(d,20,'head');const last=applyDamage(d,20,'head');
  assert.equal(last.killed,true);
  const extra=applyDamage(d,20,'head');
  assert.equal(extra.applied,false);
  close(d.health,0);
  resetDummy(d);assert.equal(d.health,100);assert.equal(d.hits,0);
});
test('Armor reduction has no negative values or immunity',()=>{
  close(damageReductionForPoints(-100),0);
  close(damageReductionForPoints(25),.5);
  close(damageReductionForPoints(75),.75);
  assert.ok(damageReductionForPoints(10000)<=.85);
  close(applyDamage(createDummy(),NaN).damage,0);
});
