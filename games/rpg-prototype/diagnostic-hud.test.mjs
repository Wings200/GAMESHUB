import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');

test('diagnostics no longer reveal a persistent keyboard cheat sheet',()=>{
  assert.doesNotMatch(html,/id="keys"/);
  assert.doesNotMatch(html,/#keys\b/);
  assert.doesNotMatch(html,/class="field-controls"/);
  assert.doesNotMatch(html,/WASD MOVE · SHIFT SPRINT/);
  assert.doesNotMatch(html,/K FREEZE \/ UNFREEZE · J RESET ENEMIES/);
  assert.match(html,/id="stationName"/,'station diagnostics remain');
});

test('F3 still controls diagnostics without showing shortcut instructions',()=>{
  assert.match(main,/e\.code==='F3'&&!e\.repeat/);
  assert.match(main,/document\.body\.classList\.toggle\('debug-hud'\)/);
  assert.match(main,/grid\.visible=document\.body\.classList\.contains\('debug-hud'\)/);
  assert.doesNotMatch(main,/LAB DIAGNOSTICS SHOWN · F3 TO HIDE/);
  assert.match(html,/id="fieldCompassTicks"/);
  assert.match(html,/id="visorCompassTicks"/);
});

test('debug panels show health and sound state without keyboard prompts',()=>{
  assert.match(main,/CRITICAL · MEDICAL AID NEEDED/);
  assert.match(main,/SOUND: MUTED/);
  assert.doesNotMatch(main,/H TO HEAL \/ RESET/);
  assert.doesNotMatch(main,/N TO UNMUTE/);
});

test('no public keyboard shortcuts trigger diagnostic cheats',()=>{
  const start=main.indexOf("window.addEventListener('keydown',e=>{");
  const end=main.indexOf("window.addEventListener('keyup',e=>{",start);
  const handler=main.slice(start,end);
  assert.ok(start>0&&end>start);
  for(const key of ['KeyH','KeyJ','KeyK','KeyY'])
    assert.doesNotMatch(handler,new RegExp("e\\.code==='"+key+"'"),key+' still has a cheat shortcut');
  assert.match(handler,/e\.code==='KeyT'[\s\S]*?openVats\(\)/,
    'T now opens real-time combat targeting, not a cheat action');
  assert.match(handler,/e\.code==='KeyB'[\s\S]*?toggleSettlementBuildMode\(/,
    'B now opens the legitimate settlement workshop, not a cheat action');
  assert.doesNotMatch(handler,/e\.code\.startsWith\('Digit'\)/);
  assert.match(handler,/e\.code==='KeyI'/,'inventory remains accessible');
  assert.match(handler,/e\.code==='F3'/,'read-only diagnostics remain accessible');
});

test('player menus do not offer free teleporting or spawn/testing actions',()=>{
  for(const id of ['enterAI','enterVendors','armoryOpen','powerBayOpen']){
    assert.doesNotMatch(html,new RegExp('id="'+id+'"'),id+' still appears in menu');
    assert.doesNotMatch(main,new RegExp("\\$\\('"+id+"'\\)\\.addEventListener"));
  }
  assert.doesNotMatch(main,/get\('station'\)==='9'/,'public URL should not teleport');
  assert.match(main,/location\.hostname==='localhost'/,'testing fixtures must be local-only');
  assert.match(main,/registerPowerFrame\(definition\.id/,'found power-armor frames remain');
});
