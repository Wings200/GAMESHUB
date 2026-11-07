import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('./testing/bootstrap.mjs',import.meta.url),'utf8');

test('home menu is concise, with the full version history retained for 1.0',()=>{
  const menu=html.slice(html.indexOf('<div id="menu">'),html.indexOf('<div id="powerArmorPanel">'));
  assert.match(menu,/GAMESHUB \/ RPG SYSTEMS LAB \/ W20\.98/);
  assert.match(menu,/<h1>SYSTEMS<span>TESTING\.<\/span><\/h1>/);
  assert.doesNotMatch(menu,/<p><strong>W\d+(?:\.\d+)+/);
  assert.doesNotMatch(menu,/weapon-reset-notice/);
  for(const id of ['start','inventoryOpen','fieldMapOpen','specialOpen',
    'settlementStart','endDown','endUp','weaponSelect']){
    assert.equal((menu.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  }
  const archive=JSON.parse(readFileSync(new URL('./version-history.json',import.meta.url),'utf8'));
  assert.equal(archive.releaseNotesPagePlannedFor,'1.0');
  assert.ok(archive.entries.length>=48);
  assert.equal(archive.entries[0].version,'W20.98');
  assert.equal(new Set(archive.entries.map(e=>e.version)).size,archive.entries.length);
  for(const entry of archive.entries){
    assert.match(entry.version,/^W\d+\.\d+(?:\.\d+)*$/);
    assert.ok(entry.title.length>3&&entry.notes.length>20);
  }
  for(const v of ['W20.98','W20.97','W20.94','W20.88','W20.62','W20.10'])
    assert.ok(archive.entries.some(entry=>entry.version===v),v);
});

test('testing entry uses one cache-busted release version',()=>{
  assert.match(html,/bootstrap\.mjs\?v=W20\.98/);
  assert.match(bootstrap,/main\.js\?v=W20\.98/);
});

test('both field and powered HUDs expose live consumable status indicators',()=>{
  assert.match(html,/id="fieldConsumableStatus"/);
  assert.match(html,/id="visorConsumableStatus"/);
  assert.match(html,/id="inventoryPositiveEffects"/);
});
