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
test('only the rebuilt Vault Directive is linked; discarded Foundations is absent',()=>{
 assert.equal((home.match(/href="\/games\/vault-directive\/"/g)||[]).length,1);
 assert.doesNotMatch(home,/href=["']\/games\/vault-foundations\/["']/);
 assert.match(home,/BELOW THE SURFACE · REBUILT 1\.0/);
 for(const path of ['index.html','style.css','core.js','game.js','README.md'])
  assert.ok(existsSync(new URL('../games/vault-directive/'+path,import.meta.url)),path+' exists');
 assert.equal(existsSync(new URL('../games/vault-foundations/index.html',import.meta.url)),false);
});
test('IN DEV filter exclusively hides Vault Directive from ALL and ordinary searches',()=>{
 assert.match(home,/data-filter="in-dev"/);
 assert.match(home,/href="\/games\/vault-directive\/"[\s\S]*?data-categories="in-dev strategy simulation"[\s\S]*?style="display:none"/);
 const script=[...home.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(m=>m[1]).find(x=>x.includes('function updateGames()'));
 assert.ok(script,'Homepage filtering script exists');
 const events={},input={value:'',addEventListener(name,fn){events[name]=fn;}},empty={style:{}};
 const buttons=['all','multiplayer','racing','action','in-dev'].map(filter=>({
  dataset:{filter},classList:{toggle(){}},addEventListener(_event,fn){this.click=fn;}
 }));
 const cards=[
  {dataset:{name:'redline',categories:'racing multiplayer action'},style:{}},
  {dataset:{name:'illegal chess',categories:'multiplayer strategy'},style:{}},
  {dataset:{name:'vault directive below the surface',categories:'in-dev strategy simulation'},style:{display:'none'}},
  {dataset:{name:'coming soon',categories:'action'},style:{}}
 ];
 const document={
  getElementById(id){return id==='gameSearch'?input:id==='emptyMessage'?empty:{addEventListener(){}};},
  querySelectorAll(q){return q==='.game-card'?cards:q==='.filter-button'?buttons:[];}
 };
 vm.runInNewContext(script,{document,console,fetch:async()=>({}),window:{location:{}}});
 assert.equal(cards[2].style.display,'none','development title hidden under ALL');
 input.value='vault';events.input();assert.equal(cards[2].style.display,'none','search cannot reveal it');
 input.value='';buttons.find(b=>b.dataset.filter==='in-dev').click();
 assert.equal(cards[2].style.display,'','development title appears under IN DEV');
 assert.ok([cards[0],cards[1],cards[3]].every(c=>c.style.display==='none'));
 buttons.find(b=>b.dataset.filter==='all').click();
 assert.equal(cards[2].style.display,'none','ALL excludes development title');
});
