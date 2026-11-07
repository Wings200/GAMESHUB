import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNpcRoutine,npcShift,npcCanStand,npcBodyBounds,
  stepNpcRoutine,safeNpcRoutineSnapshot,npcRoutineSnapshot} from './npc-routines.mjs';
import {movePoint} from './rules.mjs';

const home={x:0,z:0,yaw:.8};

test('existing NPCs have a deterministic work, patrol and rest shift',()=>{
  assert.equal(npcShift(0),'working');
  assert.equal(npcShift(17),'patrolling');
  assert.equal(npcShift(31),'resting');
  assert.equal(npcShift(48),'working');
  const a=createNpcRoutine('contact-foreman',home);
  assert.deepEqual(createNpcRoutine('contact-foreman',home),a);
  assert.equal(a.x,0);assert.equal(a.z,0);
  assert.equal(a.yaw,.8);
});

test('patrolling moves the real character and uses an animated speed',()=>{
  const a={...createNpcRoutine('contact-foreman',home),phase:20};
  const result=stepNpcRoutine(a,.06,{home});
  assert.equal(result.mode,'patrolling');
  assert.ok(result.state.x>0&&result.state.z>0);
  assert.ok(result.speed>1);
  assert.equal(a.x,0); // Pure: never mutate saved prior state.
});

test('collision and neighbor clearance block NPCs from phasing through objects',()=>{
  const wall={minX:.05,maxX:.4,minZ:-.3,maxZ:.4,top:2};
  assert.equal(npcCanStand(.09,0,{obstacles:[wall]}),false);
  assert.equal(npcCanStand(0,0,{neighbors:[{x:.1,z:0}]}),false);
  assert.equal(npcCanStand(0,0,{player:{x:0,z:.7}}),false);
  assert.equal(npcCanStand(-59.6,0),false);
  assert.deepEqual(npcBodyBounds({x:4,z:5}),
    {minX:3.62,maxX:4.38,minZ:4.62,maxZ:5.38,bottom:0,top:1.85});
  assert.deepEqual(movePoint({x:0,z:0},.2,0,
    [npcBodyBounds({x:1,z:0})],[]),{x:0,z:0});
  const a={...createNpcRoutine('test',home),phase:20};
  const blocked=stepNpcRoutine(a,.06,{home,obstacles:[wall]});
  assert.equal(blocked.state.x,0);
  assert.equal(blocked.state.z,0);
  assert.equal(blocked.speed,0);
});

test('speaking freezes walking and smoothly turns the actual avatar to the player',()=>{
  const a={...createNpcRoutine('contact-foreman',home),yaw:1,phase:20};
  const result=stepNpcRoutine(a,.06,
    {home,dialogue:true,player:{x:0,z:-2}});
  assert.equal(result.mode,'talking');
  assert.equal(result.speed,0);
  assert.equal(result.state.x,a.x);
  assert.ok(result.state.yaw<a.yaw);
});

test('nearby real gunfire starts a bounded panic, and the same shot cannot retrigger',()=>{
  const a={...createNpcRoutine('settler-1',home),phase:21};
  const shot={id:14,x:2,z:0,age:.1};
  const first=stepNpcRoutine(a,.06,{home,threat:shot});
  assert.equal(first.mode,'alarmed');
  assert.ok(first.state.x<0);
  assert.equal(first.state.alarm,5.5);
  const second=stepNpcRoutine(first.state,.06,{home,threat:{...shot,age:.3}});
  assert.ok(second.state.alarm<first.state.alarm);
  const far=stepNpcRoutine(a,.06,{home,threat:{...shot,x:30}});
  assert.notEqual(far.mode,'alarmed');
  const merchant=stepNpcRoutine(a,.06,{home,threat:shot,stationary:true});
  assert.equal(merchant.state.x,0);
  assert.equal(merchant.speed,0);
  assert.equal(merchant.crouched,true);
});

test('NPC schedules and positions survive save/load while corrupt positions reset',()=>{
  const anchors=new Map([['contact-foreman',home],
    ['settler-1',{x:15,z:18,yaw:.3}]]);
  const fresh=safeNpcRoutineSnapshot(null,anchors);
  const stepped=stepNpcRoutine({...fresh.get('contact-foreman'),phase:20},
    .06,{home});
  fresh.set('contact-foreman',stepped.state);
  const snapshot=npcRoutineSnapshot(fresh);
  const reloaded=safeNpcRoutineSnapshot(snapshot,anchors);
  assert.equal(reloaded.get('contact-foreman').x,stepped.state.x);
  assert.equal(reloaded.get('contact-foreman').phase,stepped.state.phase);
  assert.equal(reloaded.get('settler-1').z,18);
  snapshot.actors['contact-foreman'].x=123456;
  assert.equal(safeNpcRoutineSnapshot(snapshot,anchors).get('contact-foreman').x,0);
  assert.equal(safeNpcRoutineSnapshot({version:8,actors:snapshot.actors},anchors).size,2);
});

test('production connects gunfire, dynamic body collision, animations and saves',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  assert.match(main,/signalNpcGunfire\(player\.x,player\.z\)/);
  assert.match(main,/signalNpcGunfire\(enemy\.brain\.x,enemy\.brain\.z\)/);
  assert.match(main,/boxes:\[\.\.\.bounds,\.\.\.npcDynamicBodies\]/);
  assert.match(main,/stepNpcRoutine\(previous,dt,\{home,player/);
  assert.match(main,/speed:step\.speed,crouched:step\.crouched/);
  assert.match(main,/rpg-lab-npc-routines-v1/);
  assert.match(main,/saveNpcRoutines\(\)/);
});
