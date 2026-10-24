import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DURATIONS,newMatch,advanceClock,nearestSite,completePlant,cancelPlant,
  completeDefuse,eliminationResult,operatorFallback,formatTime } from './rules.mjs';

test('phase durations are exactly those agreed for P0',()=>{
  assert.deepEqual(DURATIONS,{selection:30,preparation:45,action:180,postplant:45,plant:7,defuse:7,reinforce:3});
});
test('selection and preparation transition without ready buttons',()=>{
  let m=newMatch();m=advanceClock(m,30);
  assert.equal(m.phase,'preparation');assert.equal(m.remaining,45);
  m=advanceClock(m,45);assert.equal(m.phase,'action');assert.equal(m.remaining,180);
});
test('time expiration before planting awards defenders',()=>{
  let m={...newMatch(),phase:'action',remaining:1};
  m=advanceClock(m,1,false);assert.equal(m.winner,'defense');
});
test('last-second planting pauses expiration and succeeds',()=>{
  let m={...newMatch(),phase:'action',remaining:3};
  m=advanceClock(m,3,true);assert.equal(m.overtimePlant,true);
  assert.equal(m.phase,'action');assert.equal(m.winner,null);
  m=completePlant(m,'A');assert.equal(m.phase,'postplant');assert.equal(m.remaining,45);
});
test('interrupting overtime plant awards defenders',()=>{
  let m={...newMatch(),phase:'action',remaining:0,overtimePlant:true};
  m=cancelPlant(m);assert.equal(m.phase,'result');assert.equal(m.winner,'defense');
});
test('planting only allowed for attacker in action inside valid bomb site',()=>{
  const m={...newMatch('attack'),phase:'action',remaining:20};
  assert.equal(nearestSite(-8,-6)?.id,'A');assert.equal(nearestSite(8,-6)?.id,'B');
  assert.equal(nearestSite(0,8),null);
  assert.equal(completePlant(m,'C'),m);
  assert.equal(completePlant({...m,side:'defense'},'A').phase,'action');
});
test('45-second postplant ends in detonation if not defused',()=>{
  let m=completePlant({...newMatch('attack'),phase:'action'},'B');
  m=advanceClock(m,45);assert.equal(m.winner,'attack');assert.equal(m.reason,'DEFUSER DETONATED');
});
test('defenders may finish 7-second disable, attackers may not',()=>{
  const d={...newMatch('defense'),phase:'postplant',planted:true,remaining:15};
  assert.equal(completeDefuse(d).winner,'defense');
  assert.equal(completeDefuse({...d,side:'attack'}).phase,'postplant');
});
test('eliminating attackers after plant does not resolve round',()=>{
  const planted={...newMatch(),phase:'postplant',planted:true};
  assert.equal(eliminationResult(planted,'attack'),planted);
  assert.equal(eliminationResult({...planted,planted:false},'attack').winner,'defense');
  assert.equal(eliminationResult(planted,'defense').winner,'attack');
});
test('operator fallback prefers previous when available',()=>{
  assert.equal(operatorFallback('specter',['warden','specter'],()=>0),'specter');
  assert.equal(operatorFallback('specter',['warden'],()=>0),'warden');
  assert.equal(operatorFallback('specter',[]),null);
});
test('display never shows negative time',()=>{
  assert.equal(formatTime(45),'0:45');assert.equal(formatTime(0),'0:00');assert.equal(formatTime(-4),'0:00');
});
test('UI IDs referenced by controller exist in HTML',()=>{
  const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
  const source=readFileSync(new URL('./main.js',import.meta.url),'utf8');
  const ids=[...source.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]);
  const missing=[...new Set(ids)].filter(id=>!html.includes('id="'+id+'"'));
  assert.deepEqual(missing,[]);
});
