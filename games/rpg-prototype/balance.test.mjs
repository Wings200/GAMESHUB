import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBalanceChanges,VARIABLE_CATEGORIES,
  allowedVariableFields,migrateLegacyBalanceChanges} from './balance-schema.mjs';
import {DEFAULT_GAME_VARIABLES,applyGameBalance} from './game-balance.mjs';
import {getWeaponSpec,createWeaponState,startWeaponReload} from './weapons.mjs';
import {getArmorPiece,ARMOR_STYLES,ARMOR_SLOTS} from './combat.mjs';
import {getPowerPlate,POWER_ARMOR_PLATES} from './power-armor.mjs';
import {getItem,createBackpack,addItem} from './inventory.mjs';
import {vendorBuyPrice,vendorSellPrice} from './vendors.mjs';
import {LASER_MUSKET_TUNING} from './laser-musket-mechanics.mjs';
import {WEAPON_MODS,weaponModOptions,effectiveWeaponSpec,
  craftWeaponMod} from './weapon-mods.mjs';

test('six clean categories, and ALL implemented gun and armor families',()=>{
  assert.deepEqual(VARIABLE_CATEGORIES.map(x=>x[0]),
    ['weapons','armor','junk','resources','consumables','misc']);
  assert.equal(DEFAULT_GAME_VARIABLES.junk.length,0,
    'We have no modeled desk fans or junk objects yet; never invent item rows.');
  assert.equal(DEFAULT_GAME_VARIABLES.resources.length,32);
  assert.equal(DEFAULT_GAME_VARIABLES.consumables.length,1);
  assert.equal(DEFAULT_GAME_VARIABLES.armor.filter(i=>i.role==='armor-piece').length,
    ARMOR_STYLES.length*ARMOR_SLOTS.length);
  assert.equal(DEFAULT_GAME_VARIABLES.armor.filter(i=>i.role==='power-piece').length,
    (Object.keys(POWER_ARMOR_PLATES).length-1)*ARMOR_SLOTS.length);
  const gun=DEFAULT_GAME_VARIABLES.weapons.filter(i=>i.parentId==='pipe-smg');
  assert.ok(gun.some(i=>i.role==='base'&&i.id==='pipe-smg'));
  for(const slot of ['receiver','barrel','magazine','stock','muzzle'])
    assert.ok(gun.some(i=>i.slot===slot&&i.role==='mod'));
  assert.ok(!gun.some(i=>i.slot==='optic'),'optics excluded from variable variants');
  assert.deepEqual(Object.keys(DEFAULT_GAME_VARIABLES.resources[0].fields),
    ['buyPrice','sellPrice']);
});
test('server validation rejects nonimplemented junk and mismatched item fields',()=>{
  assert.throws(()=>validateBalanceChanges({weapons:{'10mm-pistol':{damage:-1}}}));
  assert.throws(()=>validateBalanceChanges({weapons:{'10mm-pistol':{maxCharges:20}}}));
  assert.throws(()=>validateBalanceChanges({resources:{'material:steel':{buyPrice:Infinity}}}));
  assert.throws(()=>validateBalanceChanges({junk:{'junk:desk-fan':{value:1}}}));
  assert.throws(()=>validateBalanceChanges({hidden:{all:{value:1}}}));
  assert.throws(()=>validateBalanceChanges({armor:{'unmodeled-chest':{points:1}}}));
  assert.throws(()=>validateBalanceChanges({weapons:{'mod:fake:barrel:test':{damageBonus:1}}}));
  assert.deepEqual(validateBalanceChanges({weapons:{'10mm-pistol':{damage:30,value:70}}}),
    {weapons:{'10mm-pistol':{damage:30,value:70}}});
  assert.deepEqual(migrateLegacyBalanceChanges({scrap:{'material:steel':{value:20}}}),
    {resources:{'material:steel':{buyPrice:25,sellPrice:9}}});
  assert.deepEqual(allowedVariableFields('resources','material:steel'),
    ['buyPrice','sellPrice']);
});
test('base weapon damage, capacity, recoil, reload and price affect live gameplay',()=>{
  const base=getWeaponSpec('pump-action-shotgun');
  const state=createWeaponState(base);
  state.magazine=2;
  assert.ok(startWeaponReload(state,base));
  const duration=state.reloadDuration;
  const old=base.reloadSeconds;
  applyGameBalance({weapons:{'pump-action-shotgun':{
    damage:19,magazineSize:10,recoilDegrees:2.1,reloadSeconds:old/2,value:130
  }}});
  const spec=getWeaponSpec('pump-action-shotgun');
  const newState=createWeaponState(spec);newState.magazine=6;
  assert.ok(startWeaponReload(newState,spec));
  assert.equal(spec.damage,19);
  assert.equal(spec.magazineSize,10);
  assert.equal(spec.recoilDegrees,2.1);
  assert.ok(Math.abs(newState.reloadDuration-duration/2)<.00001);
  assert.equal(getItem('weapon:pump-action-shotgun').value,130);
  assert.equal(vendorBuyPrice('weapon:pump-action-shotgun'),163);
});
test('all regular armor and per-slot powered plate overrides affect protection',()=>{
  applyGameBalance({
    armor:{
      'scrap-chest':{points:74,value:205},
      'power:t45':{points:61,maxDurability:150,value:320},
      'power:t45:head':{points:92,maxDurability:220,value:710}
    },
    resources:{'material:steel':{buyPrice:48,sellPrice:24}},
    consumables:{'supply:medkit':{heal:90,value:58}},
    weapons:{'laser-musket':{
      maxCharges:9,crankSeconds:.4,damagePerExtraCharge:.5}}
  });
  assert.equal(getArmorPiece('chest','scrap-chest').points,74);
  assert.equal(getItem('armor:scrap-chest').value,205);
  assert.equal(getPowerPlate('chest','t45').points,61);
  assert.equal(getPowerPlate('chest','t45').maxDurability,150);
  assert.equal(getPowerPlate('head','t45').points,92);
  assert.equal(getPowerPlate('head','t45').maxDurability,220);
  assert.equal(getItem('power-plate:t45-head').value,710);
  assert.equal(getItem('power-plate:t45-head').maxDurability,220);
  assert.equal(getItem('power-plate:t45-chest').value,320);
  assert.equal(vendorBuyPrice('material:steel'),48);
  assert.equal(vendorSellPrice('material:steel'),24);
  assert.equal(getItem('supply:medkit').heal,90);
  assert.equal(LASER_MUSKET_TUNING.maxCharges,9);
  assert.equal(LASER_MUSKET_TUNING.crankSeconds,.4);
  assert.equal(LASER_MUSKET_TUNING.damagePerExtraCharge,.5);
});
test('direct part tuning changes every fitted weapon and its real recipe',()=>{
  const drum='mod:pipe-smg:magazine:drum';
  const blueprint=DEFAULT_GAME_VARIABLES.weapons.find(i=>i.id===drum);
  assert.ok(blueprint);
  assert.equal(Object.keys(blueprint.fields).filter(x=>x.startsWith('cost_')).length,31);
  assert.equal(blueprint.fields.cost_steel,4);
  assert.equal(blueprint.fields.cost_crystal,0);
  const patch={weapons:{[drum]:{
    magazineBonus:80,cost_steel:9,cost_crystal:3
  }}};
  assert.deepEqual(validateBalanceChanges(patch),patch);
  applyGameBalance(patch);
  assert.equal(blueprint.fields.magazineBonus,45,'original factory defaults stay captured');
  assert.equal(WEAPON_MODS[drum].magazineBonus,80);
  assert.equal(WEAPON_MODS[drum].cost['material:steel'],9);
  assert.equal(WEAPON_MODS[drum].cost['material:crystal'],3);
  const pack=createBackpack();
  for(const [material,quantity] of Object.entries(WEAPON_MODS[drum].cost))
    addItem(pack,material,quantity);
  assert.equal(craftWeaponMod(pack,'pipe-smg',drum).ok,true);
  assert.equal(effectiveWeaponSpec(getWeaponSpec('pipe-smg'),pack).magazineSize,
    getWeaponSpec('pipe-smg').magazineSize+80);
});
