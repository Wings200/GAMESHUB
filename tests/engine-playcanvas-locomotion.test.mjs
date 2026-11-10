import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {cameraRelativeDirection,damp,shortestAngleDegrees,
  headingForVelocity,cyclePhase,locomotionState}
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

test('the character faces its velocity on all four movement axes',()=>{
  const cases=[
    {velocity:[0,-1],yaw:0},
    {velocity:[1,0],yaw:-90},
    {velocity:[0,1],yaw:180},
    {velocity:[-1,0],yaw:90}
  ];
  for(const {velocity:[x,z],yaw} of cases){
    const actual=headingForVelocity(x,z);
    assert.ok(Math.abs(shortestAngleDegrees(actual,yaw))<1e-8,
      `Velocity (${x}, ${z}) faced ${actual} instead of ${yaw}`);
    const radians=actual*Math.PI/180;
    assert.ok(-Math.sin(radians)*x-Math.cos(radians)*z>.999);
  }
  assert.throws(()=>headingForVelocity(NaN,0),TypeError);
});

test('WASD follows the camera view at every orbit quadrant',()=>{
  const almost=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,
    `Expected ${expected}, got ${actual}`);
  for(const yaw of [0,Math.PI/4,Math.PI/2,Math.PI,-Math.PI/2]){
    const sin=Math.sin(yaw),cos=Math.cos(yaw);
    const expected={
      W:[-sin,-cos],S:[sin,cos],D:[cos,-sin],A:[-cos,sin]
    };
    for(const [key,[x,z]] of Object.entries(expected)){
      const inputs={W:[0,-1],S:[0,1],D:[1,0],A:[-1,0]};
      const direction=cameraRelativeDirection(...inputs[key],yaw);
      almost(direction.x,x);
      almost(direction.z,z);
    }
    const diagonal=cameraRelativeDirection(1,-1,yaw);
    almost(Math.hypot(diagonal.x,diagonal.z),1);
  }
  assert.deepEqual(cameraRelativeDirection(0,0,Math.PI/3),{x:0,z:0});
  assert.throws(()=>cameraRelativeDirection(1,0,Infinity),TypeError);
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
