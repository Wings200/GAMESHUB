import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {doorCollisionAt,doorDistance,lightAperture} from '../engine/portal.js';
import {intersectsFootprint} from '../engine/collision.js';
import {EngineAudio} from '../engine/audio.js';

test('closed chamber leaf blocks the clear opening, while a fully swung leaf permits crossing',()=>{
  const shut=doorCollisionAt(0),open=doorCollisionAt(1);
  assert.equal(intersectsFootprint(0,17.5,.34,shut),true);
  assert.equal(intersectsFootprint(0,17.5,.34,open),false);
  assert.ok(shut.maxX>1.5);
  assert.ok(open.maxX< -1.3);
  assert.ok(open.maxZ>20.3);
  assert.ok(shut.maxZ<17.7);
});
test('hinge sweep and light aperture are smooth and bounded',()=>{
  assert.equal(lightAperture(0),0);
  assert.equal(lightAperture(1),1);
  assert.equal(lightAperture(.5),.5);
  assert.ok(lightAperture(.25)<.25);
  assert.equal(lightAperture(-5),0);
  assert.equal(lightAperture(7),1);
  assert.equal(doorDistance(0,17.5),0);
  assert.ok(doorDistance(0,12.2)>3.2);
  for(let step=1;step<=20;step++) {
    const previous=doorCollisionAt((step-1)/20);
    const current=doorCollisionAt(step/20);
    assert.ok(current.maxX<=previous.maxX+1e-6);
    assert.ok(current.maxZ>=previous.maxZ-1e-6);
  }
});
test('the new room is physically attached, emits light from an actual visible flood lamp, and keeps the bounce separate',()=>{
  const chamber=readFileSync(new URL('../games/engine-test/light-chamber.js',import.meta.url),'utf8');
  const room=readFileSync(new URL('../games/engine-test/room.js',import.meta.url),'utf8');
  assert.match(room,/South wall left of test door/);
  assert.match(room,/South wall right of test door/);
  assert.match(room,/South wall above test door/);
  assert.match(room,/makeLightChamber/);
  assert.match(room,/bounds:\{minX:-11\.83,maxX:11\.83,minZ:-17\.0,maxZ:31\.0\}/);
  assert.match(chamber,/Flood lamp visible warm source/);
  assert.match(chamber,/portalLight\.position\.set\(0,3\.17,16\.82\)/);
  assert.match(chamber,/portalLight\.intensity=46\*aperture/);
  assert.match(chamber,/bouncedLight\.intensity=bounceEnabled\?2\.5\*aperture:0/);
  assert.match(chamber,/portalLight\.castShadow=profile!==\x27performance\x27/);
  assert.match(chamber,/Object\.assign\(doorBarrier,doorCollisionAt\(openness\)\)/);
  assert.match(chamber,/hinge\.rotation\.y=-MAX_ANGLE\*openness/);
});
test('both laboratories have on-demand scene cubemap captures, disabled in performance mode',()=>{
  const chamber=readFileSync(new URL('../games/engine-test/light-chamber.js',import.meta.url),'utf8');
  const room=readFileSync(new URL('../games/engine-test/room.js',import.meta.url),'utf8');
  assert.match(chamber,/new THREE\.CubeCamera/);
  assert.match(chamber,/probe\.update\(renderer,scene\)/);
  assert.match(room,/new THREE\.CubeCamera/);
  assert.match(room,/mainCubeCamera\.update\(engine\.renderer,scene\)/);
  assert.match(room,/engine\.quality===\x27performance\x27/);
  assert.match(room,/setReflectionEnabled/);
  assert.match(room,/mainProbeTarget\.dispose\(\)/);
});
test('rebalanced concrete recorded steps are substantially quieter with adjustable mix and woody mid cut',()=>{
  const audio=new EngineAudio();
  assert.equal(audio.footstepMix,.6);
  audio.setFootstepMix(.25);
  const seen=[];
  audio.playClip=(name,opts)=>{seen.push({name,opts});return {};};
  audio.clips.set('footstep-concrete-0',{});
  audio.footstep({index:0,running:false});
  assert.ok(seen[0].opts.volume<.06,'quiet recorded walking step');
  assert.equal(seen[0].opts.footstepEq,true);
  audio.setFootstepMix(2);assert.equal(audio.footstepMix,1);
  audio.setFootstepMix(-1);assert.equal(audio.footstepMix,0);
  const source=readFileSync(new URL('../engine/audio.js',import.meta.url),'utf8');
  assert.match(source,/notch\.frequency\.value=430/);
  assert.match(source,/notch\.gain\.value=-7/);
  assert.match(source,/edge\.frequency\.value=3700/);
});
test('developer UI exposes E / door button, bounce, probes, and gain control without removing intro',()=>{
  const html=readFileSync(new URL('../games/engine-test/index.html',import.meta.url),'utf8');
  const app=readFileSync(new URL('../games/engine-test/main.js',import.meta.url),'utf8');
  const core=readFileSync(new URL('../engine/core.js',import.meta.url),'utf8');
  assert.match(core,/0\.1\.0-dev\.009/);
  for(const id of ['doorToggle','doorHint','reflectionStatus','reflectionToggle','bounceToggle','probeNow','footstepLevel','footstepLevelValue']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.match(app,/event\.code!==\x27KeyE\x27/);
  assert.match(app,/facility\.captureReflections\(\)/);
  assert.match(app,/audio\.setFootstepMix\(level\/100\)/);
  assert.match(app,/runIntro\(\)/);
});
