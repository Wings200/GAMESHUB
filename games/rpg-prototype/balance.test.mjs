import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBalanceChanges, VARIABLE_CATEGORIES} from './balance-schema.mjs';
import {DEFAULT_GAME_VARIABLES, applyGameBalance} from './game-balance.mjs';
import {getWeaponSpec, createWeaponState, startWeaponReload} from './weapons.mjs';
import {getArmorPiece} from './combat.mjs';
import {getPowerPlate} from './power-armor.mjs';
import {getItem, createBackpack, addItem, totalInventoryValue} from './inventory.mjs';
import {vendorBuyPrice} from './vendors.mjs';
import {LASER_MUSKET_TUNING} from './laser-musket-mechanics.mjs';

test('developer variables are organized in the five requested nested groups', () => {
  assert.deepEqual(VARIABLE_CATEGORIES.map(x => x[0]),
    ['weapons','armor','scrap','healing','miscellaneous']);
  assert.ok(DEFAULT_GAME_VARIABLES.weapons.some(x => x.id === 'laser-musket'));
  assert.ok(DEFAULT_GAME_VARIABLES.armor.some(x => x.id === 'scrap-chest'));
  assert.ok(DEFAULT_GAME_VARIABLES.scrap.length >= 31);
  assert.equal(DEFAULT_GAME_VARIABLES.healing[0].id,'supply:medkit');
});

test('invalid server settings are rejected instead of affecting game balance', () => {
  assert.throws(() => validateBalanceChanges({weapons:{'10mm-pistol':{damage:-1}}}));
  assert.throws(() => validateBalanceChanges({weapons:{'10mm-pistol':{maxCharges:20}}}));
  assert.throws(() => validateBalanceChanges({scrap:{'material:steel':{value:Infinity}}}));
  assert.throws(() => validateBalanceChanges({hidden:{all:{value:1}}}));
  assert.deepEqual(validateBalanceChanges({weapons:{'10mm-pistol':{damage:30,value:70}}}),
    {weapons:{'10mm-pistol':{damage:30,value:70}}});
});

test('published changes affect real weapon damage, magazine, recoil and reload timing', () => {
  const defaultSpec = getWeaponSpec('pump-action-shotgun');
  const baseline = createWeaponState(defaultSpec);
  baseline.magazine = 2;
  assert.ok(startWeaponReload(baseline,defaultSpec));
  const oldDuration = baseline.reloadDuration;
  const oldReloadStat=defaultSpec.reloadSeconds;
  applyGameBalance({weapons:{'pump-action-shotgun':{
    damage:19,magazineSize:10,recoilDegrees:2.1,reloadSeconds:oldReloadStat/2,value:130
  }}});
  const active = getWeaponSpec('pump-action-shotgun');
  const adjusted = createWeaponState(active);
  adjusted.magazine = 6;
  assert.ok(startWeaponReload(adjusted,active));
  assert.equal(active.damage,19);
  assert.equal(active.magazineSize,10);
  assert.equal(active.recoilDegrees,2.1);
  // Both cases load four shells; edited reload time halves the action duration.
  assert.ok(Math.abs(adjusted.reloadDuration - oldDuration / 2) < .00001);
  assert.equal(getItem('weapon:pump-action-shotgun').value,130);
  assert.equal(vendorBuyPrice('weapon:pump-action-shotgun'),163);
});

test('armor, power plates, salvage, medicine and special laser variables apply', () => {
  applyGameBalance({
    armor:{
      'scrap-chest':{points:74,value:205},
      'power:t45':{points:61,maxDurability:150,value:320}
    },
    scrap:{'material:steel':{value:22}},
    healing:{'supply:medkit':{heal:90,value:58}},
    weapons:{'laser-musket':{maxCharges:9,crankSeconds:0.4,damagePerExtraCharge:0.5}}
  });
  assert.equal(getArmorPiece('chest','scrap-chest').points,74);
  assert.equal(getItem('armor:scrap-chest').value,205);
  assert.equal(getItem('power-plate:t45-chest').value,320);
  assert.equal(getPowerPlate('chest','t45').points,61);
  assert.equal(getPowerPlate('chest','t45').maxDurability,150);
  assert.equal(getItem('material:steel').value,22);
  assert.equal(getItem('supply:medkit').heal,90);
  assert.equal(LASER_MUSKET_TUNING.maxCharges,9);
  assert.equal(LASER_MUSKET_TUNING.crankSeconds,.4);
  assert.equal(LASER_MUSKET_TUNING.damagePerExtraCharge,.5);
  const pack=createBackpack();
  addItem(pack,'material:steel',3);
  assert.equal(totalInventoryValue(pack),66);
});
