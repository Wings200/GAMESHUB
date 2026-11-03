import test from 'node:test';
import assert from 'node:assert/strict';
import {solveBoardingLeg} from './boarding-ik.mjs';
import {powerEntryPose} from './power-entry-animation.mjs';

test('two joint hinge solver reaches standing, stepping and crouching targets',()=>{
  for(const [y,z] of [[-.62,0],[-.59,.17],[-.48,-.25],[-.45,.3],
    [-.40,0],[-.57,-.02]]){
    const p=solveBoardingLeg(y,z);
    assert.ok(p.error<.002,JSON.stringify(p));
    assert.ok(Math.abs(p.resultingY-y)<.002);
    assert.ok(Math.abs(p.resultingZ-z)<.002);
    assert.ok(Number.isFinite(p.hip)&&Number.isFinite(p.knee));
    assert.ok(p.knee<0,'the knee must bend back, not break forward');
    assert.ok(Math.abs(p.hip+p.knee+p.ankle)<.000001);
  }
});
test('unreachable or invalid stride clamps without producing a wild joint',()=>{
  const far=solveBoardingLeg(-2,2);
  assert.ok(far.unreachable);
  assert.ok(far.error>1);
  for(const p of [solveBoardingLeg(0,0),
    solveBoardingLeg(Infinity,NaN),solveBoardingLeg(-4,0)])
    assert.ok([p.hip,p.knee,p.ankle,p.resultingY,p.resultingZ].every(Number.isFinite));
});
test('every entry and exit tread is reached by two separate foot targets',()=>{
  for(const phase of ['entering','exiting']){
    for(let i=0;i<=1000;i++){
      const t=i/1000;
      const pose=powerEntryPose(phase,t);
      if(!pose.footTargets)continue;
      assert.equal(pose.footTargets.length,2);
      for(const foot of pose.footTargets){
        assert.ok(Number.isFinite(foot.y)&&Number.isFinite(foot.z));
        assert.ok(foot.y>=-.00001&&foot.y<=.67);
      }
      assert.ok(Math.abs(pose.footTargets[0].z-pose.footTargets[1].z)<.52,
        'leg stride should be within a single stair');
    }
  }
});
