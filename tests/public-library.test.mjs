import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('paused Weapon Lab RPG and GAMESHUB Engine are not linked from the public library', () => {
  for (const slug of ['rpg-prototype', 'engine-test']) {
    const publicLink = new RegExp('\\bhref\\s*=\\s*["\\\'][^"\\\']*\\/games\\/' + slug + '(?:\\/|["\\\'?#])', 'i');
    assert.doesNotMatch(home, publicLink, slug + ' must remain unlisted');
    assert.ok(existsSync(new URL('../games/' + slug + '/index.html', import.meta.url)), slug + ' files must be retained');
  }
});

test('active GAMESHUB games remain accessible from the library', () => {
  assert.match(home, /href=["']\/games\/redline\/["']/);
  assert.match(home, /href=["']\/games\/illegal-chess\/["']/);
});
