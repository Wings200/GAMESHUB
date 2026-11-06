import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('./testing/bootstrap.mjs',import.meta.url),'utf8');

test('systems testing splash shows death and power armor recovery first',()=>{
  const log=html.slice(html.indexOf('<div id="menu">'),html.indexOf('<div class="endurance-picker">'));
  assert.match(log,/GAMESHUB \/ RPG SYSTEMS LAB \/ W20\.76/);
  assert.match(log,/<strong>W20\.76 · DEATH & POWER ARMOR RECOVERY:<\/strong>/);
  assert.match(log,/<strong>W20\.75\.2 · SETTLEMENT WEAPON WORKBENCH:<\/strong>/);
  assert.match(log,/<strong>W20\.75\.1 · READ-ONLY DIAGNOSTICS:<\/strong>/);
  assert.match(log,/<strong>W20\.75 · FACTION POWER ARMOR & FOUND FRAMES:<\/strong>/);
  assert.match(log,/<strong>W20\.74\.1 · POWER ARMOR REPAIRS:<\/strong>/);
  assert.match(log,/<strong>W20\.74 · POWER ARMOR CONFIGURATION:<\/strong>/);
  assert.match(log,/<strong>W20\.73 · WEAPON WORKBENCH:<\/strong>/);
  assert.match(log,/<strong>W20\.72\.1 · BARTER CONFIRMATION:<\/strong>/);
  assert.match(log,/<strong>W20\.72 · VENDOR TRADING:<\/strong>/);
  assert.match(log,/<strong>W20\.71 · LOOT TRANSFERS:<\/strong>/);
  assert.match(log,/<strong>W20\.70 · LOOT CASE GLOW:<\/strong>/);
  assert.match(log,/floating LOOT labels/);
  assert.ok(log.indexOf('W20.76 · DEATH & POWER ARMOR RECOVERY')<
    log.indexOf('W20.75.2 · SETTLEMENT WEAPON WORKBENCH'));
  assert.ok(log.indexOf('W20.75.2 · SETTLEMENT WEAPON WORKBENCH')<
    log.indexOf('W20.75.1 · READ-ONLY DIAGNOSTICS'));
  assert.ok(log.indexOf('W20.75.1 · READ-ONLY DIAGNOSTICS')<
    log.indexOf('W20.75 · FACTION POWER ARMOR'));
  assert.ok(log.indexOf('W20.75 · FACTION POWER ARMOR')<
    log.indexOf('W20.74.1 · POWER ARMOR REPAIRS'));
});

test('testing entry uses one cache-busted release version',()=>{
  assert.match(html,/bootstrap\.mjs\?v=W20\.76/);
  assert.match(bootstrap,/main\.js\?v=W20\.76/);
});
