import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('paused Weapon Lab RPG and GAMESHUB Engine stay unlisted', () => {
  assert.doesNotMatch(home, /href\s*=\s*["'][^"']*\/games\/(?:rpg-prototype|engine-test)(?:\/|["'?#])/i);
  for (const slug of ['rpg-prototype', 'engine-test']) {
    assert.ok(existsSync(new URL('../games/' + slug + '/index.html', import.meta.url)), slug + ' files must be retained');
  }
});

test('active GAMESHUB games remain accessible from the library', () => {
  assert.match(home, /href=["']\/games\/redline\/["']/);
  assert.match(home, /href=["']\/games\/illegal-chess\/["']/);
});

test('Vault Directive alpha is listed and its playable assets exist', () => {
  assert.match(home, /href=["']\/games\/vault-directive\/["']/);
  for (const path of ['index.html','style.css','game.js']) {
    assert.ok(existsSync(new URL('../games/vault-directive/' + path, import.meta.url)), path + ' must exist');
  }
});
