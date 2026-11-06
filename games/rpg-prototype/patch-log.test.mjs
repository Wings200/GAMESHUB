import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('./testing/bootstrap.mjs',import.meta.url),'utf8');

test('systems testing splash shows barter confirmation release first',()=>{
  const log=html.slice(html.indexOf('<div id="menu">'),html.indexOf('<div class="endurance-picker">'));
  assert.match(log,/GAMESHUB \/ RPG SYSTEMS LAB \/ W20\.72\.1/);
  assert.match(log,/<strong>W20\.72\.1 · BARTER CONFIRMATION:<\/strong>/);
  assert.match(log,/<strong>W20\.72 · VENDOR TRADING:<\/strong>/);
  assert.match(log,/<strong>W20\.71 · LOOT TRANSFERS:<\/strong>/);
  assert.match(log,/<strong>W20\.70 · LOOT CASE GLOW:<\/strong>/);
  assert.match(log,/floating LOOT labels/);
  assert.ok(log.indexOf('W20.72.1 · BARTER CONFIRMATION')<log.indexOf('W20.72 · VENDOR TRADING'));
});

test('testing entry uses one cache-busted release version',()=>{
  assert.match(html,/bootstrap\.mjs\?v=W20\.72\.1/);
  assert.match(bootstrap,/main\.js\?v=W20\.72\.1/);
});
