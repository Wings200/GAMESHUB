import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import vm from 'node:vm';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('paused projects stay unlisted, but their files are retained',()=>{
 assert.doesNotMatch(home,/href=["'][^"']*\/games\/(?:rpg-prototype|engine-test)(?:\/|["'?#])/i);
 for(const slug of ['rpg-prototype','engine-test'])
  assert.ok(existsSync(new URL('../games/'+slug+'/index.html',import.meta.url)));
});
test('REDLINE and Illegal Chess remain in the public game library',()=>{
 assert.match(home,/href=["']\/games\/redline\/["']/);
 assert.match(home,/href=["']\/games\/illegal-chess\/["']/);
});
test('Vault Directive is retired from the public library while it is redesigned',()=>{
 assert.doesNotMatch(home,/href=["']\/games\/vault-directive\//i);
 assert.doesNotMatch(home,/VAULT DIRECTIVE/);
 assert.equal(existsSync(new URL('../games/vault-directive/index.html',import.meta.url)),false);
 assert.equal(existsSync(new URL('../games/vault-foundations/index.html',import.meta.url)),false);
});

test('development filter remains available for future releases',()=>{
 assert.match(home,/data-filter="in-dev"/);
});
