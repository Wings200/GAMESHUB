import test from 'node:test';
import assert from 'node:assert/strict';
import {deathCameraPose,DEATH_KNEE_END,DEATH_FALL_START,
  DEATH_GROUND_IMPACT,DEATH_SCREEN_TIME} from './death-camera.mjs';

test('the first-person fall sinks onto both knees before tipping forward',()=>{
  const options={startEye:1.68,startPitch:.08,startYaw:.4};
  const start=deathCameraPose(0,options);
  const kneel=deathCameraPose(DEATH_KNEE_END,options);
  const pause=deathCameraPose(DEATH_FALL_START,options);
  const falling=deathCameraPose(1.45,options);
  const impact=deathCameraPose(DEATH_GROUND_IMPACT,options);

  assert.equal(start.eyeHeight,1.68);
  assert.equal(start.pitch,.08);
  assert.equal(start.yaw,.4);
  assert.ok(kneel.eyeHeight<1.02&&kneel.eyeHeight>.90);
  assert.ok(Math.abs(kneel.eyeHeight-pause.eyeHeight)<.001);
  assert.ok(falling.eyeHeight<pause.eyeHeight);
  assert.ok(falling.pitch<-.16);
  assert.ok(impact.eyeHeight>=.13&&impact.eyeHeight<=.17);
  assert.ok(impact.pitch<-1.4);
  assert.ok(impact.roll>.15);
});

test('ground contact happens before YOU DIED appears; camera never enters terrain',()=>{
  assert.ok(DEATH_GROUND_IMPACT<DEATH_SCREEN_TIME);
  assert.equal(deathCameraPose(DEATH_GROUND_IMPACT-.01).impacted,false);
  assert.equal(deathCameraPose(DEATH_GROUND_IMPACT).impacted,true);
  assert.equal(deathCameraPose(DEATH_SCREEN_TIME-.01).showDeathScreen,false);
  assert.equal(deathCameraPose(DEATH_SCREEN_TIME).showDeathScreen,true);
  for(let step=0;step<320;step++){
    const pose=deathCameraPose(step/100,{startEye:.7,startYaw:2});
    assert.ok(pose.eyeHeight>=.13,`eye clipped at ${step/100}`);
    assert.ok(pose.veilOpacity>=0&&pose.veilOpacity<=1);
  }
  assert.ok(deathCameraPose(DEATH_SCREEN_TIME).veilOpacity>.9);
});
