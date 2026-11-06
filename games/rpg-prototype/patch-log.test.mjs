import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('./testing/bootstrap.mjs',import.meta.url),'utf8');

test('systems testing splash shows the newest loot update first',()=>{
  const log=html.slice(html.indexOf('<div id="menu">'),html.indexOf('<div class="endurance-picker">'));
  assert.match(log,/GAMESHUB \/ RPG SYSTEMS LAB \/ W20\.70\.1/);
  assert.match(log,/<strong>W20\.70 · LOOT CASE GLOW:<\/strong>/);
  assert.match(log,/floating LOOT labels/);
  assert.ok(log.indexOf('W20.70 · LOOT CASE GLOW')<log.indexOf('W20.69.3 · ALWAYS-ON COMPASS'));
});

test('testing entry uses one cache-busted release version',()=>{
  assert.match(html,/bootstrap\.mjs\?v=W20\.70\.1/);
  assert.match(bootstrap,/main\.js\?v=W20\.70\.1/);
});
