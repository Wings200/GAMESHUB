import test from 'node:test';
import assert from 'node:assert/strict';
import { WeaponAudio, IMPACT_MATERIALS, getImpactMaterial } from './weapon-audio.mjs';

class Parameter {
  constructor(calls,kind){this.calls=calls;this.kind=kind;}
  setValueAtTime(value,time){this.calls.push({kind:this.kind,mode:'set',value,time});}
  exponentialRampToValueAtTime(value,time){this.calls.push({kind:this.kind,mode:'ramp',value,time});}
}
class Node {
  constructor(events,calls) {
    this.events=events;
    this.gain=new Parameter(calls,'gain');
    this.frequency=new Parameter(calls,'frequency');
  }
  connect() {return this;}
  start(at) {this.events.push(['start',at]);}
  stop(at) {this.events.push(['stop',at]);}
}
class FakeAudioContext {
  constructor() {
    this.state='suspended';
    this.sampleRate=8000;
    this.currentTime=10;
    this.destination={};
    this.events=[];
    this.calls=[];
    this.buffers=0;
  }
  resume(){this.state='running';return Promise.resolve();}
  createBuffer(channels,length) {
    this.buffers++;
    assert.equal(channels,1);
    return {getChannelData:()=>new Float32Array(length)};
  }
  createGain(){return new Node(this.events,this.calls);}
  createBiquadFilter(){return new Node(this.events,this.calls);}
  createBufferSource(){return new Node(this.events,this.calls);}
  createOscillator(){return new Node(this.events,this.calls);}
}
test('Sounds do not create an AudioContext before the first user action',()=>{
  const audio=new WeaponAudio(FakeAudioContext);
  assert.equal(audio.context,null);
  assert.equal(audio.ready,false);
  assert.equal(audio.unlock(),true);
  assert.equal(audio.ready,true);
});
test('Gunshot, paper impact, empty click and reload schedule audio nodes',()=>{
  const audio=new WeaponAudio(FakeAudioContext);
  audio.unlock();
  audio.gunshot();
  const count=audio.context.events.length;
  assert.ok(count>=8);
  audio.impact('paper');
  audio.impact('concrete');
  audio.dryFire();
  audio.reload();
  assert.ok(audio.context.events.length>count+10);
  assert.equal(audio.context.buffers,1,'reuse one generated noise buffer');
  assert.ok(audio.context.events.every(([action,time]) =>
    ['start','stop'].includes(action) && time>=10));
});
test('Muted audio does not schedule sound; unmuting restores it',()=>{
  const audio=new WeaponAudio(FakeAudioContext);
  audio.unlock();
  assert.equal(audio.setEnabled(false),false);
  assert.equal(audio.ready,false);
  const count=audio.context.events.length;
  audio.gunshot();audio.impact();audio.reload();audio.dryFire();
  assert.equal(audio.context.events.length,count);
  assert.equal(audio.setEnabled(true),true);
  audio.gunshot();
  assert.ok(audio.context.events.length>count);
});
test('AudioContext initialization failures do not crash firing',()=>{
  const audio=new WeaponAudio(class BadContext { constructor(){throw Error('audio blocked');} });
  assert.equal(audio.unlock(),false);
  assert.doesNotThrow(()=>{audio.gunshot();audio.impact();audio.reload();audio.dryFire();});
});

test('Every material sample routes through its own impact type',()=>{
  assert.deepEqual(IMPACT_MATERIALS,['paper','wood','metal','concrete']);
  for(const type of IMPACT_MATERIALS){
    assert.equal(getImpactMaterial({object:{userData:{impactMaterial:type}}}),type);
  }
  assert.equal(getImpactMaterial({object:{userData:{targetId:42}}}),'paper');
  assert.equal(getImpactMaterial({object:{userData:{impactMaterial:'unknown'}}}),'concrete');
  assert.equal(getImpactMaterial({object:{}}),'concrete');
  assert.equal(getImpactMaterial(null),null);
});
test('Paper, wood, metal and concrete produce different audio signatures',()=>{
  const audio=new WeaponAudio(FakeAudioContext);
  audio.unlock();
  const signatures=new Map();
  for(const type of IMPACT_MATERIALS){
    const start=audio.context.calls.length;
    const beforeEvents=audio.context.events.length;
    audio.impact(type,.22);
    const params=audio.context.calls.slice(start)
      .filter(x=>x.kind==='frequency'&&x.mode==='set').map(x=>x.value);
    signatures.set(type,params.join(','));
    assert.ok(params.length>=3,'frequency envelope defined for '+type);
    const events=audio.context.events.slice(beforeEvents).filter(e=>e[0]==='start');
    assert.ok(events.length>=2,'impact scheduled at least two sounds for '+type);
    assert.ok(events.every(e=>e[1]>=10.22),'impact happens after firing for '+type);
  }
  assert.equal(new Set(signatures.values()).size,4,'materials have distinct timbres');
});

test('All six weapon archetypes have distinct gunshot synthesis',()=>{
  const audio=new WeaponAudio(FakeAudioContext);
  audio.unlock();
  const signatures=[];
  for(const kind of ['pistol','revolver','smg','carbine','shotgun','rifle']){
    const before=audio.context.calls.length;
    audio.gunshot(kind);
    const frequencies=audio.context.calls.slice(before)
      .filter(c=>c.kind==='frequency'&&c.mode==='set')
      .map(c=>c.value).join(',');
    signatures.push(frequencies);
  }
  assert.equal(new Set(signatures).size,6,
    'Every weapon type should have a distinct pitched gunshot signature');
});
test('Reload cues follow each weapon reload duration instead of fixed pistol timing',()=>{
  const pistol=new WeaponAudio(FakeAudioContext);
  pistol.unlock();pistol.reload('pistol',1.65);
  const slow=new WeaponAudio(FakeAudioContext);
  slow.unlock();slow.reload('rifle',2.85);
  const latest=audio=>Math.max(...audio.context.events.map(e=>e[1]));
  assert.ok(latest(slow)>latest(pistol)+.7);
  const revolver=new WeaponAudio(FakeAudioContext);
  revolver.unlock();revolver.reload('revolver',2.6);
  assert.ok(revolver.context.events.length>6);
});

test('Steps have distinct normal and power-armor weight without autoplay',()=>{
  const silent=new WeaponAudio(FakeAudioContext);
  silent.footstep();assert.equal(silent.context,null);
  silent.unlock();
  silent.footstep(false);
  const count=silent.context.events.length;
  assert.ok(count>=4);
  silent.footstep(true);
  assert.ok(silent.context.events.length>count);
  const pitch=silent.context.calls.filter(c=>c.kind==='frequency'&&c.mode==='set').map(c=>c.value);
  assert.ok(pitch.includes(75)&&pitch.includes(175));
  silent.setEnabled(false);
  const mutedCount=silent.context.events.length;
  silent.footstep(true);
  assert.equal(silent.context.events.length,mutedCount);
});
