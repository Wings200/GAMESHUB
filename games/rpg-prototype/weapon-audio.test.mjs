import test from 'node:test';
import assert from 'node:assert/strict';
import { WeaponAudio, IMPACT_MATERIALS, getImpactMaterial, footstepStrideMeters } from './weapon-audio.mjs';

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
  assert.ok(pitch.includes(67*.82)&&pitch.includes(145*.82));
  silent.setEnabled(false);
  const mutedCount=silent.context.events.length;
  silent.footstep(true);
  assert.equal(silent.context.events.length,mutedCount);
});

test('Footsteps follow human gait cadence at real movement speeds',()=>{
  const walking=4.5/footstepStrideMeters({});
  const running=7.2/footstepStrideMeters({sprinting:true});
  const crouching=2.35/footstepStrideMeters({crouched:true});
  const armoredWalking=4.5/footstepStrideMeters({powerArmor:true});
  const armoredRunning=7.2/footstepStrideMeters({sprinting:true,powerArmor:true});
  assert.ok(walking>2&&walking<2.8,'normal walk is not 6+ steps per second');
  assert.ok(running>2.7&&running<3.5,'sprint is not 8 steps per second');
  assert.ok(crouching>1.2&&crouching<2);
  assert.ok(armoredWalking<walking&&armoredRunning<running);
});

test('Long gun reports decay without the old 0.32 second noise cutoff',()=>{
  const audio=new WeaponAudio(FakeAudioContext);
  audio.gunshot('shotgun');
  assert.ok(audio.context.events.some(([event,at])=>event==='stop'&&at>10.45));
  assert.ok(audio.context.events.every(([,at])=>Number.isFinite(at)));
});

test('Power armor hydraulic cues span its real boarding animation',()=>{
  const audio=new WeaponAudio(FakeAudioContext);
  audio.powerArmorTransition(true,4.5);
  const starts=audio.context.events.filter(([event])=>event==='start').map(([,at])=>at);
  assert.ok(starts.length>=7);
  assert.ok(starts.some(at=>at>14),'late lock click matches end of boarding');
  const maxStop=Math.max(...audio.context.events.map(([,at])=>at));
  assert.ok(maxStop>14.3&&maxStop<15);
});


test('W20.16 armor entry and exit boot contacts use low thuds, never bell tones',()=>{
  for(const entering of [true,false]){
    const audio=new WeaponAudio(FakeAudioContext);
    audio.powerArmorTransition(entering,4.5);
    const pitches=audio.context.calls
      .filter(call=>call.kind==='frequency'&&call.mode==='set')
      .map(call=>call.value);
    assert.ok(pitches.length>=5,'hydraulics plus three measured footfalls');
    assert.ok(pitches.includes(69*.82),'each contact has a low boot-thud oscillator');
    assert.ok(!pitches.some(freq=>Math.abs(freq-205*.82)<.001||
      Math.abs(freq-265*.82)<.001),'no old ringing footstep tones');
    const starts=audio.context.events
      .filter(([kind])=>kind==='start').map(([,at])=>at);
    for(const fraction of (entering?[.49,.64,.81]:[.45,.60,.77])){
      assert.ok(starts.some(time=>Math.abs(time-(10.01+4.5*fraction))<.015),
        'contact is audible at '+fraction);
    }
  }
});

test('Hand-cranked laser has ratchet contacts and an electrical beam release',()=>{
  const audio=new WeaponAudio(FakeAudioContext);
  audio.laserCrank(3);
  const before=audio.context.events.length;
  assert.ok(before>=12,'three physical ratchet steps and capacitor charge');
  const lastCrank=Math.max(...audio.context.events.map(x=>x[1]));
  assert.ok(lastCrank>10.65,'charge completes near end of 0.68s turn');
  audio.laserBlast(6);
  assert.ok(audio.context.events.length>=before+8);
  const notes=audio.context.calls.filter(x=>x.kind==='frequency'&&x.mode==='set').map(x=>x.value);
  assert.ok(notes.some(x=>x>1500),'electronic discharge has a high initial pitch');
});

test('Double-barrel blast is low pitched and hinged reload sounds follow two shells',()=>{
  const gun=new WeaponAudio(FakeAudioContext);
  gun.unlock();
  gun.gunshot('double-barrel');
  assert.ok(gun.context.events.length>=8);
  const pitches=gun.context.calls.filter(c=>c.kind==='frequency'&&c.mode==='set').map(c=>c.value);
  assert.ok(pitches.includes(81*.82),'double-barrel signature must have low boom');
  const two=new WeaponAudio(FakeAudioContext);
  two.unlock();two.breakActionReload(2,2.65);
  const one=new WeaponAudio(FakeAudioContext);
  one.unlock();one.breakActionReload(1,1.95);
  assert.ok(two.context.events.length>one.context.events.length);
  const latest=audio=>Math.max(...audio.context.events.map(e=>e[1]));
  assert.ok(latest(two)>latest(one)+.45);
});

test('Pump action has distinct blast, delayed cycle clacks and timed shell loading',()=>{
  const shot=new WeaponAudio(FakeAudioContext);
  shot.unlock();shot.gunshot('pump-action');
  const pitches=shot.context.calls.filter(x=>x.kind==='frequency'&&x.mode==='set').map(x=>x.value);
  assert.ok(pitches.includes(96*.82));
  const pump=new WeaponAudio(FakeAudioContext);
  pump.unlock();pump.pumpActionCycle(.60);
  assert.ok(pump.context.events.length>=8);
  const times=pump.context.events.filter(x=>x[0]==='start').map(x=>x[1]);
  assert.ok(Math.max(...times)-Math.min(...times)>.28);
  const one=new WeaponAudio(FakeAudioContext);
  one.unlock();one.pumpActionReload(1,1.49);
  const six=new WeaponAudio(FakeAudioContext);
  six.unlock();six.pumpActionReload(6,4.24);
  assert.ok(six.context.events.length>one.context.events.length);
  assert.ok(Math.max(...six.context.events.map(e=>e[1]))-
    Math.max(...one.context.events.map(e=>e[1]))>2.2);
});

test('Hunting rifle has deep report and timed mechanical five-round top feed',()=>{
  const shot=new WeaponAudio(FakeAudioContext);
  shot.unlock();
  shot.gunshot('hunting-bolt');
  assert.ok(shot.context.events.filter(v=>v[0]==='start').length>0);
  const mech=new WeaponAudio(FakeAudioContext);mech.unlock();
  mech.boltActionCycle(.88);
  const cycleStart=mech.context.events.filter(v=>v[0]==='start').map(v=>v[1]);
  assert.ok(cycleStart.some(t=>t>10+.88*.45));
  const single=new WeaponAudio(FakeAudioContext);single.unlock();
  single.boltActionReload(1,1.51);
  const five=new WeaponAudio(FakeAudioContext);five.unlock();
  five.boltActionReload(5,3.43);
  assert.ok(five.context.events.length>single.context.events.length);
});

test('Six-Shooter report and timed shell loading sound different from pistols',()=>{
  const shot=new WeaponAudio(FakeAudioContext);shot.unlock();
  shot.gunshot('revolver');
  assert.ok(shot.context.events.length>0);
  const single=new WeaponAudio(FakeAudioContext);single.unlock();
  single.revolverReload(1,1.38);
  const full=new WeaponAudio(FakeAudioContext);full.unlock();
  full.revolverReload(6,3.48);
  assert.ok(full.context.events.length>single.context.events.length);
  const starts=full.context.events.filter(x=>x[0]==='start').map(x=>x[1]);
  assert.ok(starts.some(t=>t>10+3.48*.8));
});

test('Automatic Pipe SMG report and physical magazine reload have timed sounds',()=>{
  const shot=new WeaponAudio(FakeAudioContext);shot.unlock();
  shot.gunshot('pipe-smg');
  const shotOnsets=shot.context.events.filter(x=>x[0]==='start').length;
  assert.ok(shotOnsets>=3);
  const loading=new WeaponAudio(FakeAudioContext);loading.unlock();
  loading.pipeSMGReload(2.75);
  const onsets=loading.context.events.filter(x=>x[0]==='start').map(x=>x[1]);
  assert.ok(onsets.length>=6);
  assert.ok(onsets.some(t=>t>10+2.75*.8));
});
