import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vatsScreenPoint,vatsTargetFrame,vatsHealthPercent}
  from './vats-presentation.mjs';

test('W20.94 world projections map to visible screen percentages',()=>{
  assert.deepEqual(vatsScreenPoint({x:0,y:0,z:0}),{left:50,top:50});
  assert.deepEqual(vatsScreenPoint({x:-1,y:1,z:0}),{left:0,top:0});
  for(const bad of [null,{x:NaN,y:0,z:0},{x:0,y:0,z:2},
    {x:1.1,y:0,z:0},{x:0,y:-1.1,z:0}])
    assert.equal(vatsScreenPoint(bad),null);
});

test('W20.94 lock brackets surround on-screen joints and remain inside viewport',()=>{
  const frame=vatsTargetFrame([{left:44,top:30},{left:51,top:58},
    {left:49,top:72}]);
  assert.ok(frame.left<=44&&frame.top<=30);
  assert.ok(frame.left+frame.width>=51);
  assert.ok(frame.top+frame.height>=72);
  for(const edge of [[{left:1,top:1}],[{left:99,top:99}]]){
    const result=vatsTargetFrame(edge);
    assert.ok(result.left>=0&&result.top>=0);
    assert.ok(result.left+result.width<=100&&result.top+result.height<=100);
  }
  assert.equal(vatsTargetFrame([]),null);
  assert.equal(vatsTargetFrame([{left:Infinity,top:12}]),null);
});

test('W20.94 target health is computed from real health and clamped safely',()=>{
  assert.equal(vatsHealthPercent(70,140),50);
  assert.equal(vatsHealthPercent(200,100),100);
  assert.equal(vatsHealthPercent(-10,100),0);
  assert.equal(vatsHealthPercent(NaN,100),0);
  assert.equal(vatsHealthPercent(70,0),0);
});

test('W20.94 scanner follows real hitboxes without interrupting live gameplay',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  for(const snippet of ['vatsZonePoint(enemy.id,zone)',
    'vatsTargetChance(enemy,zone)','vatsScreenPoint(point.clone().project(camera))',
    'vatsTargetFrame(framePoints)','vatsHealthPercent(enemy.state.health',
    'id="vatsZonePins"','id="vatsTargetBox"','id="vatsTargetHpFill"'])
    assert.ok(main.includes(snippet)||html.includes(snippet),snippet);
  const opened=main.slice(main.indexOf('function openVats(){'),
    main.indexOf('function closeVats(){'));
  assert.doesNotMatch(opened,/controls\.(?:unlock|lock)\(/);
  assert.match(html,/#vatsPanel\{[^}]*pointer-events:none/);
  assert.match(html,/\.vats-zone-pin\{[^}]*pointer-events:none|#vatsZonePins\{[^}]*pointer-events:none/);
});
