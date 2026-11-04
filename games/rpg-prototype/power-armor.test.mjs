import test from 'node:test';
import assert from 'node:assert/strict';
import {POWER_ARMOR_SLOTS,POWER_ARMOR_PLATES,POWER_ARMOR_TRANSITION_SECONDS,
  createPowerArmorState,getPowerPlate,setPowerPlate,beginPowerArmorTransition,
  removePowerPlate,
  plateCondition,repairPowerPlate,damagePowerPlate,installFusionCore,ejectFusionCore,
  stepFusionCore,powerArmorMobility,hasFusionPower,POWER_ARMOR_RECIPES,
  stepPowerArmor,powerArmorProtection,powerArmorEyeHeight,safePowerArmorSnapshot,
  FUSION_CORE_DRAIN,POWER_ARMOR_INDICATOR_CRITICAL_PERCENT,
  powerArmorIndicatorStatus} from './power-armor.mjs';

test('Power armor has its own chassis and six independently removable visible slots',()=>{
  const state=createPowerArmorState();
  assert.equal(POWER_ARMOR_SLOTS.length,6);
  assert.equal(state.plates.chest,'none');
  assert.equal(state.plates.head,'none');
  assert.equal(state.plates.rightArm,'none');
  assert.equal(getPowerPlate('head','none').points,0);
  assert.equal(setPowerPlate(state,'head','citadel').ok,true);
  assert.equal(state.plates.head,'citadel');
  assert.equal(state.plates.chest,'none');
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
  setPowerPlate(state,'head','none');
  setPowerPlate(state,'chest','t45');
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
  assert.ok(Math.abs(powerArmorEyeHeight(state,1.70)-2.50)<.00001);
  assert.ok(Math.abs(powerArmorEyeHeight(state,1.03)-1.83)<.00001);
  assert.ok(powerArmorEyeHeight(state,1.70)-powerArmorEyeHeight(state,1.03)>.60);
});

test('Three unique armor families can mix by slot and retain broken pieces',()=>{
  const rig=createPowerArmorState();
  setPowerPlate(rig,'head','t60',18);
  setPowerPlate(rig,'chest','t45',100);
  setPowerPlate(rig,'rightLeg','t01',75);
  assert.equal(rig.plates.head,'t60');
  assert.equal(rig.plates.chest,'t45');
  assert.equal(rig.plates.rightLeg,'t01');
  assert.equal(plateCondition(rig,'head').current,18);
  rig.occupied=true;
  const first=powerArmorProtection(rig,'head',0).points;
  const hit=damagePowerPlate(rig,'head',100);
  assert.equal(hit.broken,true);
  assert.equal(rig.plates.head,'t60','Broken plate is not deleted');
  assert.equal(plateCondition(rig,'head').current,0);
  const after=powerArmorProtection(rig,'head',0).points;
  assert.ok(after<first,'Broken plate loses protection but stays mounted');
  rig.occupied=false;
  assert.deepEqual(repairPowerPlate(rig,'head',0).reason,'materials');
  const price=Math.ceil(POWER_ARMOR_PLATES.t60.maxDurability/25);
  const repaired=repairPowerPlate(rig,'head',price);
  assert.equal(repaired.ok,true);
  assert.equal(repaired.cost,price);
  assert.equal(plateCondition(rig,'head').current,POWER_ARMOR_PLATES.t60.maxDurability);
  const removed=removePowerPlate(rig,'head');
  assert.equal(removed.tier,'t60');
  assert.equal(removed.current,POWER_ARMOR_PLATES.t60.maxDurability);
  assert.equal(rig.plates.head,'none');
  assert.ok(POWER_ARMOR_RECIPES.t01.salvage>POWER_ARMOR_RECIPES.t45.salvage);
});
test('Fusion cores power a chassis, drain with movement, and can be ejected',()=>{
  const rig=createPowerArmorState();
  assert.equal(hasFusionPower(rig),false);
  assert.equal(installFusionCore(rig,60).ok,true);
  assert.equal(installFusionCore(rig,100).reason,'occupied-slot');
  rig.occupied=true;
  assert.equal(powerArmorMobility(rig).factor,1);
  assert.equal(ejectFusionCore(rig).reason,'in-use');
  const idle=stepFusionCore(rig,1,{moving:false});
  const walking=stepFusionCore(rig,1,{moving:true});
  const sprint=stepFusionCore(rig,1,{moving:true,sprinting:true});
  assert.equal(idle.drained,FUSION_CORE_DRAIN.idle);
  assert.equal(walking.drained,FUSION_CORE_DRAIN.walking);
  assert.equal(sprint.drained,FUSION_CORE_DRAIN.sprinting);
  stepFusionCore(rig,100000,{moving:true});
  assert.equal(rig.coreCharge,0);
  assert.equal(hasFusionPower(rig),false);
  assert.ok(powerArmorMobility(rig).factor<.3);
  assert.equal(powerArmorMobility(rig).canSprint,false);
  assert.equal(powerArmorMobility(rig).canJump,false);
  assert.equal(powerArmorMobility(rig).canFastTravel,false);
  rig.occupied=false;
  assert.equal(ejectFusionCore(rig).charge,0);
  assert.equal(installFusionCore(rig,0).reason,'spent-core');
  assert.equal(installFusionCore(rig,80).ok,true);
  assert.equal(safePowerArmorSnapshot(rig).coreCharge,80);
});
test('Old saves acquire full condition without inventing fusion cores',()=>{
  const old=safePowerArmorSnapshot({occupied:false,plates:{head:'citadel',
    chest:'scrap',rightArm:'none'}});
  assert.equal(plateCondition(old,'head').current,POWER_ARMOR_PLATES.citadel.maxDurability);
  assert.equal(plateCondition(old,'chest').current,POWER_ARMOR_PLATES.scrap.maxDurability);
  assert.equal(old.coreCharge,null);
  const damaged=safePowerArmorSnapshot({plates:{head:'t60'},
    plateDurability:{head:0},coreCharge:23.5});
  assert.equal(plateCondition(damaged,'head').broken,true);
  assert.equal(damaged.coreCharge,23.5);
});

test('W20.14 six-part armor indicator changes per-slot at 30%, destruction and removal',()=>{
  const state=createPowerArmorState();
  assert.equal(POWER_ARMOR_INDICATOR_CRITICAL_PERCENT,30);
  for(const slot of POWER_ARMOR_SLOTS)
    assert.deepEqual(powerArmorIndicatorStatus(state,slot),
      {slot,status:'empty',percentage:0,tier:'none'});
  setPowerPlate(state,'head','t45',100);
  setPowerPlate(state,'chest','t60',45);
  setPowerPlate(state,'leftArm','t45',30);
  setPowerPlate(state,'rightArm','t45',29);
  setPowerPlate(state,'leftLeg','t45',0);
  assert.equal(powerArmorIndicatorStatus(state,'head').status,'healthy');
  assert.equal(powerArmorIndicatorStatus(state,'chest').status,'healthy');
  assert.equal(powerArmorIndicatorStatus(state,'leftArm').status,'critical');
  assert.equal(powerArmorIndicatorStatus(state,'rightArm').status,'critical');
  assert.equal(powerArmorIndicatorStatus(state,'leftLeg').status,'empty');
  assert.equal(powerArmorIndicatorStatus(state,'rightLeg').status,'empty');
  assert.equal(powerArmorIndicatorStatus(state,'leftArm').percentage,30);
  setPowerPlate(state,'leftArm','none');
  assert.equal(powerArmorIndicatorStatus(state,'leftArm').status,'empty');
});
