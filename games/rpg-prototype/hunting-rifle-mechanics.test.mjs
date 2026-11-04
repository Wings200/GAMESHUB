import test from 'node:test';
import assert from 'node:assert/strict';
import {HUNTING_RIFLE_TUNING,huntingBoltCyclePose,huntingRifleReloadSeconds} from './hunting-rifle-mechanics.mjs';
test('Five-round rifle uses an 880ms lift-pull-eject-seat-lock sequence',()=>{
  assert.equal(HUNTING_RIFLE_TUNING.capacity,5);
  assert.equal(HUNTING_RIFLE_TUNING.cycleSeconds,.88);
  assert.equal(huntingBoltCyclePose(0).active,false);
  const at=p=>huntingBoltCyclePose(HUNTING_RIFLE_TUNING.cycleSeconds*(1-p));
  assert.ok(at(.19).handleLift>.25);
  assert.ok(at(.40).boltOffset>.05);
  assert.equal(at(.40).ejectNow,false);
  assert.equal(at(.48).ejectNow,true);
  assert.ok(at(.51).boltOffset>.20);
  assert.ok(at(.74).boltOffset<at(.51).boltOffset);
  assert.ok(at(.96).handleLift<.01);
  assert.ok(at(.99).boltOffset<.01);
});
test('Reload scales with missing cartridges, not a fixed detached magazine',()=>{
  assert.equal(huntingRifleReloadSeconds(1),1.51);
  assert.ok(Math.abs(huntingRifleReloadSeconds(5)-3.43)<1e-9);
  assert.ok(huntingRifleReloadSeconds(2)<huntingRifleReloadSeconds(5));
  assert.equal(huntingRifleReloadSeconds(0),huntingRifleReloadSeconds(1));
  assert.equal(huntingRifleReloadSeconds(12),huntingRifleReloadSeconds(5));
});