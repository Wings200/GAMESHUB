import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FootstepSequencer} from '../engine/footsteps.js';
import {luminairePositions,ceilingLightingProfile,LUMINAIRE_PANEL_Y,LUMINAIRE_EMITTER_Y} from '../engine/lighting.js';
import {EngineAudio} from '../engine/audio.js';

test('all 24 ceiling panels own a correctly centered, lower real emitter',()=>{
  const lights=luminairePositions();
  assert.equal(lights.length,24);
  assert.equal(new Set(lights.map(v=>v.x+','+v.z)).size,24);
  assert.ok(LUMINAIRE_EMITTER_Y<LUMINAIRE_PANEL_Y);
  assert.ok(lights.every(l=>l.panelY===LUMINAIRE_PANEL_Y && l.emitterY===LUMINAIRE_EMITTER_Y));
  assert.equal(ceilingLightingProfile('performance').shadowSamples,0);
  assert.equal(ceilingLightingProfile('quality').shadowSamples,3);
  const scene=readFileSync(new URL('../games/engine-test/room.js',import.meta.url),'utf8');
  assert.match(scene,/for\(const \{x,z,panelY\} of luminaireGrid\)/);
  assert.match(scene,/for\(const \{x,z,emitterY\} of luminaireGrid\)/);
  assert.match(scene,/light\.position\.set\(x,emitterY,z\)/);
  assert.match(scene,/light\.target\.position\.set\(x,\.05,z\)/);
  assert.doesNotMatch(scene,/new THREE\.PointLight/);
});
test('actual horizontal travel plays steps; standing still and blocked movement never trigger',()=>{
  const hits=[], steps=new FootstepSequencer(x=>hits.push(x));
  steps.advance({distance:0});
  steps.advance({distance:.5});
  assert.equal(hits.length,0);
  steps.advance({distance:.16});
  assert.equal(hits.length,1);
  steps.advance({distance:2.2});
  assert.equal(hits.length,2);
  steps.advance({distance:0});
  steps.advance({distance:0});
  assert.equal(hits.length,2);
  steps.advance({distance:.7});
  assert.equal(hits.length,3);
});
test('footsteps pause during air time, disabled state, and resume naturally',()=>{
  const hits=[], steps=new FootstepSequencer(x=>hits.push(x));
  steps.advance({distance:1,grounded:false});
  steps.advance({distance:10,enabled:false});
  assert.equal(hits.length,0);
  steps.advance({distance:.7,grounded:true});
  assert.equal(hits.length,1);
  steps.advance({distance:0,grounded:false});
  steps.advance({distance:.1});
  assert.equal(hits.length,1);
});
test('running uses a distinct stride and does not generate an idle sound loop',()=>{
  const hits=[], steps=new FootstepSequencer(x=>hits.push(x));
  steps.advance({distance:5.9,running:true});
  assert.ok(hits.length>=2 && hits.every(x=>x.running===true));
  const count=hits.length;
  for(let i=0;i<30;i++)steps.advance({distance:0});
  assert.equal(hits.length,count);
});
test('every bundled footstep is an actual original OGG file, not a synthesized tone',()=>{
  for(let i=0;i<5;i++){
    const path=new URL('../games/engine-test/assets/audio/footstep_concrete_'+String(i).padStart(3,'0')+'.ogg',import.meta.url);
    const bytes=readFileSync(path);
    assert.equal(bytes.subarray(0,4).toString(),'OggS');
    assert.ok(bytes.length>2000 && bytes.length<80000);
  }
  const license=readFileSync(new URL('../games/engine-test/assets/audio/KENNEY_LICENSE.txt',import.meta.url),'utf8');
  assert.match(license,/kenney/i);
  assert.match(license,/CC0/i);
});
test('footstep playback selects real licensed clips, varies left/right and never plays oscillator fallback',()=>{
  const audio=new EngineAudio();
  const calls=[];
  audio.tone=()=>{throw Error('synthetic footsteps forbidden')};
  audio.playClip=(key,settings)=>{calls.push({key,settings});return {}};
  assert.equal(audio.footstep({index:3}),null,'missing clip should be silent');
  for(let i=0;i<5;i++)audio.clips.set('footstep-concrete-'+i,{});
  audio.footstep({index:3,foot:'right',running:true});
  audio.footstep({index:4,foot:'left',running:false});
  assert.deepEqual(calls.map(c=>c.key),['footstep-concrete-3','footstep-concrete-4']);
  assert.ok(calls[0].settings.volume>calls[1].settings.volume);
  assert.ok(calls[0].settings.pan>0&&calls[1].settings.pan<0);
});
