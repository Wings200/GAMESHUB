import test from "node:test";
import assert from "node:assert/strict";
import {newWireState,placeWire,damageWire} from "./barbed-wire.js";
import {GameAudio} from "./legacy-audio.js";
import {newWireSoundTracker,nearestEnemyWire,stepWireSounds,wirePunchSound,
 WIRE_AUDIO} from "./wire-sound.js";
const player={x:0,y:0,z:8,yaw:0,grounded:true};
const wire=placeWire(newWireState(),player,[]).state;
const at={...player,z:6.35};
const before={...at,z:6.50};
test("walking into hostile wire produces ONE immediate localized rattle",()=>{
 const r=stepWireSounds(newWireSoundTracker(),wire,before,at,"attack",.016);
 assert.equal(r.event.type,"wire-rattle");
 assert.equal(r.event.id,1);
 assert.deepEqual([r.event.x,r.event.z],[0,6.35]);
 assert.equal(r.tracker.wireId,1);
 assert.ok(WIRE_AUDIO.rattleInterval>.25);
});
test("remaining on wire rattles at bounded spacing, not every render frame",()=>{
 let tracker=newWireSoundTracker(),n=0;
 for(let i=0;i<180;i++){
  const r=stepWireSounds(tracker,wire,before,at,"attack",1/60);
  tracker=r.tracker;
  if(r.event)n++;
 }
 assert.ok(n>=7&&n<=11,"3 seconds of movement should make a modest number of rattles");
});
test("standing still, leaving, jumping, switching to defender, and broken wire stop cues",()=>{
 const active=stepWireSounds(newWireSoundTracker(),wire,before,at,"attack",.016);
 const stationary=stepWireSounds(active.tracker,wire,at,at,"attack",.4);
 assert.equal(stationary.event,null);
 assert.equal(stationary.tracker.wireId,null);
 const away=stepWireSounds(active.tracker,wire,at,{...at,z:10},"attack",.5);
 assert.equal(away.event,null);assert.equal(away.tracker.elapsed,0);
 assert.equal(stepWireSounds(active.tracker,wire,before,{...at,y:.5},"attack",.5).event,null);
 assert.equal(stepWireSounds(active.tracker,wire,before,at,"defend",.5).event,null);
 const gone=damageWire(damageWire(wire,1,2).state,1,2).state;
 assert.equal(nearestEnemyWire(gone,at,"attack"),null);
 assert.equal(stepWireSounds(active.tracker,gone,before,at,"attack",.5).event,null);
});
test("melee strike emits punch-only crunch; final punch emits louder destruction cue",()=>{
 assert.deepEqual(wirePunchSound(false,wire.devices[0]),
  {type:"wire-strike",id:1,x:0,z:6.35});
 assert.deepEqual(wirePunchSound(true,wire.devices[0]),
  {type:"wire-destroy",id:1,x:0,z:6.35});
 assert.equal(wirePunchSound(false,null),null);
});
test("nearest device selection returns actual source position for positional audio",()=>{
 const w2=placeWire(wire,{...player,x:4},[]).state;
 const near={...at,x:4};
 assert.equal(nearestEnemyWire(w2,near,"attack").id,2);
 assert.equal(nearestEnemyWire(w2,at,"attack").id,1);
 assert.equal(nearestEnemyWire(w2,near,"defend"),null);
});

test("all three wire sound types have distinct procedural metallic recipes",()=>{
 const audio=new GameAudio(),events=[];
 audio.noise=(...a)=>events.push({kind:"noise",a});
 audio.tone=(...a)=>events.push({kind:"tone",a});
 let counts=[];
 for(const name of ["wire-rattle","wire-strike","wire-destroy"]){
  events.length=0;
  audio.playEvent(name);
  counts.push(events.length);
  assert.ok(events.some(e=>e.kind==="noise"),name+" should include textured scrape");
  assert.ok(events.some(e=>e.kind==="tone"),name+" should include resonant steel");
 }
 assert.ok(counts[1]>counts[0]-1);
 assert.ok(counts[2]>counts[1],"destruction should have more independent clatters");
});
test("sound engine localizes emitted wire events without needing sound samples",()=>{
 const audio=new GameAudio();
 audio.ctx={state:"running"};audio.enabled=true;
 const bus={gain:{gain:{value:0}},panner:{pan:{value:0}}};
 audio.spatialBuses=[bus];
 const heard=[];
 audio.play=name=>heard.push({name,connected:audio.spatialBus===bus.gain,
   pan:bus.panner.pan.value,volume:bus.gain.gain.value});
 audio.playAt("wire-strike",4,0,0,0,0);
 audio.playAt("wire-destroy",-4,0,0,0,0);
 assert.deepEqual(heard.map(e=>e.name),["wire-strike","wire-destroy"]);
 assert.ok(heard.every(e=>e.connected&&e.volume>0&&e.volume<=1));
 assert.ok(heard[0].pan>0&&heard[1].pan<0);
 assert.equal(audio.spatialBus,null);
});
