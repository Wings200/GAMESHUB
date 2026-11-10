import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {damp,shortestAngleDegrees,cyclePhase,locomotionState}
  from '../engine/locomotion-math.mjs';

test('damping is stable across equivalent frame subdivisions',()=>{
  const one=damp(0,5,9,.04);
  const two=damp(damp(0,5,9,.02),5,9,.02);
  assert.ok(Math.abs(one-two)<1e-10);
  assert.equal(damp(3,7,9,0),3);
  assert.throws(()=>damp(0,1,4,-.01),RangeError);
});

test('shortest turn crosses 180 degrees in the correct direction',()=>{
  assert.equal(shortestAngleDegrees(179,-179),2);
  assert.equal(shortestAngleDegrees(-179,179),-2);
  assert.equal(shortestAngleDegrees(0,90),90);
});

test('running has hysteresis so intermediate speeds do not flicker',()=>{
  assert.equal(locomotionState(0,'Idle'),'Idle');
  assert.equal(locomotionState(2.6,'Idle'),'Walk');
  assert.equal(locomotionState(3.7,'Walk'),'Walk');
  assert.equal(locomotionState(3.9,'Walk'),'Run');
  assert.equal(locomotionState(3.7,'Run'),'Run');
  assert.equal(locomotionState(3.3,'Run'),'Walk');
  assert.equal(locomotionState(4,'Run',false),'Jump');
});

test('gait phase stays normalized between walk and run clips',()=>{
  assert.ok(Math.abs(cyclePhase(1.4)-.4)<1e-10);
  assert.ok(Math.abs(cyclePhase(-.3)-.7)<1e-10);
  assert.equal(cyclePhase(Number.NaN),0);
});
