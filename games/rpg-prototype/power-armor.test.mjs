import test from 'node:test';
import assert from 'node:assert/strict';
import {POWER_ARMOR_SLOTS,POWER_ARMOR_PLATES,POWER_ARMOR_TRANSITION_SECONDS,
  createPowerArmorState,getPowerPlate,setPowerPlate,beginPowerArmorTransition,
  stepPowerArmor,powerArmorProtection,powerArmorEyeHeight,safePowerArmorSnapshot} from './power-armor.mjs';

test('Power armor has its own chassis and six independently removable visible slots',()=>{
  const state=createPowerArmorState();
  assert.equal(POWER_ARMOR_SLOTS.length,6);
  assert.equal(state.plates.chest,'scrap');
  assert.equal(state.plates.head,'none');
  assert.equal(getPowerPlate('head','none').points,0);
  assert.equal(setPowerPlate(state,'head','citadel').ok,true);
  assert.equal(state.plates.head,'citadel');
  assert.equal(state.plates.chest,'scrap');
  assert.equal(setPowerPlate(state,'missing','citadel').ok,false);
  assert.equal(setPowerPlate(state,'head','fake').ok,false);
  assert.ok(POWER_ARMOR_PLATES.citadel.points>POWER_ARMOR_PLATES.ranger.points);
});

test('Entering and exiting take long enough for a visible climbing sequence',()=>{
  assert.ok(POWER_ARMOR_TRANSITION_SECONDS>=3,
    'Pilot needs time to approach, step into the shell and latch the doors');
});
test('Entering and exiting take time, reject repeat actions and preserve state',()=>{
  const state=createPowerArmorState();
  assert.deepEqual(beginPowerArmorTransition(state),{ok:true,phase:'entering'});
  assert.equal(beginPowerArmorTransition(state).reason,'busy');
  const half=stepPowerArmor(state,POWER_ARMOR_TRANSITION_SECONDS/2);
  assert.equal(half.completed,false);
  assert.ok(half.progress>.49&&half.progress<.51);
  assert.equal(state.occupied,false,'Suit is not equipped until animation ends');
  const full=stepPowerArmor(state,POWER_ARMOR_TRANSITION_SECONDS/2);
  assert.equal(full.completed,true);
  assert.equal(state.occupied,true);
  assert.equal(state.phase,'idle');
  assert.equal(beginPowerArmorTransition(state).phase,'exiting');
  stepPowerArmor(state,POWER_ARMOR_TRANSITION_SECONDS);
  assert.equal(state.occupied,false);
});

test('Powered frame and six plate tiers reduce damage only when occupied',()=>{
  const state=createPowerArmorState();
  const normal=powerArmorProtection(state,'chest',.2);
  assert.equal(normal.combinedReduction,.2);
  beginPowerArmorTransition(state);
  stepPowerArmor(state,POWER_ARMOR_TRANSITION_SECONDS);
  const withChassis=powerArmorProtection(state,'head',.2);
  assert.ok(withChassis.combinedReduction>=.6,
    'Unplated powered armor must protect every zone significantly better than street clothes');
  for(const zone of POWER_ARMOR_SLOTS){
    const powered=powerArmorProtection(state,zone,.12);
    assert.ok(powered.combinedReduction>.12,
      zone+' must never increase incoming damage');
  }
  const chest=powerArmorProtection(state,'chest',.2);
  assert.ok(chest.combinedReduction>withChassis.combinedReduction);
  assert.ok(withChassis.combinedReduction>.2,'Bare chassis grants some protection');
  setPowerPlate(state,'head','citadel');
  const upgraded=powerArmorProtection(state,'head',.2);
  assert.ok(upgraded.combinedReduction>chest.combinedReduction);
  assert.ok(upgraded.combinedReduction<=.9);
});

test('Saved plates and occupied state restore, malformed or interrupted input rejected',()=>{
  const state=createPowerArmorState();
  state.occupied=true;state.phase='exiting';state.elapsed=.8;
  state.plates.leftLeg='ranger';
  const restored=safePowerArmorSnapshot(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.occupied,true);
  assert.equal(restored.phase,'idle');
  assert.equal(restored.elapsed,0);
  assert.equal(restored.plates.leftLeg,'ranger');
  const corrupted=safePowerArmorSnapshot({occupied:'true',plates:{
    head:'admin',chest:'citadel',leftArm:null}});
  assert.equal(corrupted.occupied,false);
  assert.equal(corrupted.plates.head,'none');
  assert.equal(corrupted.plates.chest,'citadel');
});

test('Power armor standing and crouch heights follow player movement',()=>{
  const state=createPowerArmorState();
  assert.equal(powerArmorEyeHeight(state,1.70),1.70);
  beginPowerArmorTransition(state);
  stepPowerArmor(state,POWER_ARMOR_TRANSITION_SECONDS);
  assert.ok(Math.abs(powerArmorEyeHeight(state,1.70)-1.80)<.00001);
  assert.ok(Math.abs(powerArmorEyeHeight(state,1.03)-1.13)<.00001);
  assert.ok(powerArmorEyeHeight(state,1.70)-powerArmorEyeHeight(state,1.03)>.60);
});
