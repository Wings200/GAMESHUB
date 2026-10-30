import test from 'node:test';
import assert from 'node:assert/strict';
import { WeaponAudio } from './weapon-audio.mjs';

class Parameter {
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class Node {
  constructor(events) {
    this.events=events;
    this.gain=new Parameter();
    this.frequency=new Parameter();
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
    this.buffers=0;
  }
  resume(){this.state='running';return Promise.resolve();}
  createBuffer(channels,length) {
    this.buffers++;
    assert.equal(channels,1);
    return {getChannelData:()=>new Float32Array(length)};
  }
  createGain(){return new Node(this.events);}
  createBiquadFilter(){return new Node(this.events);}
  createBufferSource(){return new Node(this.events);}
  createOscillator(){return new Node(this.events);}
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
