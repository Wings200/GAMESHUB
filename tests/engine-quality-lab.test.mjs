import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveXZ, intersectsFootprint} from '../engine/collision.js';
import {QUALITY_PRESETS,qualitySettings,clampScale} from '../engine/quality.js';
import {approach,hingedOpen,stepPhase} from '../engine/motion.js';
import {readFileSync} from 'node:fs';

test('swept XZ collision stops high-speed tunneling through a thin rail',()=>{
  const rail=[{minX:-1,maxX:1,minZ:-.025,maxZ:.025}];
  const m=resolveXZ({x:0,z:2},{x:0,z:-4},rail);
  assert.ok(m.blockedZ);
  assert.ok(m.z>=.364, `must stop before rail at ${m.z}`);
});
test('XZ collision slides along wall without penetrating it',()=>{
  const wall=[{minX:-.1,maxX:.1,minZ:-5,maxZ:5}];
  const m=resolveXZ({x:-.8,z:0},{x:1.3,z:1.6},wall);
  assert.ok(m.x<=-.439, `must not enter wall: ${m.x}`);
  assert.ok(m.z>1.4, `should slide freely: ${m.z}`);
  assert.equal(m.blockedX,true);
});
test('broad-phase corner contact avoids false block',()=>{
  const pillar={minX:0,maxX:1,minZ:0,maxZ:1};
  assert.equal(intersectsFootprint(-.3,-.3,.34,pillar),false);
  assert.equal(intersectsFootprint(-.1,-.1,.34,pillar),true);
});
test('boundaries clamp position, and bad inputs are rejected',()=>{
  const m=resolveXZ({x:1,z:1},{x:20,z:-20},[],{minX:-2,maxX:2,minZ:-2,maxZ:2});
  assert.deepEqual({x:m.x,z:m.z},{x:2,z:-2});
  assert.throws(()=>resolveXZ({x:0,z:0},{x:NaN,z:2}),TypeError);
});
test('quality modes remain predictable and offer unclipped high-quality render scales',()=>{
  assert.deepEqual(Object.keys(QUALITY_PRESETS),['performance','balanced','quality']);
  assert.equal(qualitySettings('quality',2.5).effectivePixelRatio,2);
  assert.equal(qualitySettings('balanced',2.5).effectivePixelRatio,1.5);
  assert.equal(qualitySettings('performance',2).effectivePixelRatio,.85);
  assert.equal(qualitySettings('bogus').profile,'balanced');
  assert.equal(clampScale(''),.5);
  assert.equal(clampScale(NaN),1);
});
test('motion interpolation is monotonic, time-step invariant enough and never overshoots',()=>{
  const a=approach(0,1,6,.016), b=approach(0,1,6,.032);
  assert.ok(a>0&&a<b&&b<1);
  assert.ok(Math.abs(approach(a,1,6,.016)-b)<1e-10);
  assert.ok(hingedOpen(.3,true,.016)>.3);
  assert.ok(hingedOpen(.3,false,.016)<.3);
  assert.ok(stepPhase(6.27,1,.2)<.3);
});
test('the engine test references matching build modules and required controls',()=>{
  const html=readFileSync(new URL('../games/engine-test/index.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../games/engine-test/main.js',import.meta.url),'utf8');
  const room=readFileSync(new URL('../games/engine-test/room.js',import.meta.url),'utf8');
  const engine=readFileSync(new URL('../engine/core.js',import.meta.url),'utf8');
  assert.match(engine,/0\.1\.0-dev\.009/);
  assert.match(html,/build009/);
  assert.match(app,/build009/);
  assert.match(html,/id="quality"/);
  assert.match(html,/id="motion"/);
  assert.match(app,/facility\.setShadowQuality/);
  assert.match(room,/createSurfaceLibrary/);
  assert.match(room,/environmentTarget\?\.dispose/);
});
