import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../games/vault-directive/',import.meta.url);
const source=readFileSync(new URL('core.js',root),'utf8');
function setup(){
 const context={window:{},Math,Date};vm.runInNewContext(source,context);
 const D=context.window.VDCore;return {D,s:D.create('TEST VAULT')};
}
const passTime=(D,s,n)=>{for(let i=0;i<n;i++)D.simulate(s,1);};
function task(D,s,type,i,meta){
 const started=D.start(s,type,i,meta);
 assert.equal(started.ok,true,started.message);
 passTime(D,s,12);
 assert.equal(s.task,null,'task completed');
}
function buildStarter(D,s){
 task(D,s,'scavenge',null,'grove');
 task(D,s,'dig',5);task(D,s,'dig',6);
 task(D,s,'support',5,'timber');
 task(D,s,'room',5,'quarters');
}
test('new game begins with a single hatch and no prebuilt rooms or people',()=>{
 const {D,s}=setup();
 assert.equal(s.grid.filter(c=>c.kind==='open').length,1);
 assert.equal(s.rooms.length,0);assert.equal(s.people.length,0);
 for(const k of ['wood','stone','scrap','power','food','water'])assert.equal(s.res[k],0);
});
test('scavenging, connected digging, support and room placement work',()=>{
 const {D,s}=setup();
 assert.equal(D.canDig(s,8),false);
 buildStarter(D,s);
 assert.equal(s.rooms[0].type,'quarters');
 assert.equal(s.rooms[0].cells[0],5);
 assert.equal(s.grid[5].kind,'room');
 assert.equal(D.capacity(s),4);
 assert.ok(s.visitors.length>0,'survivor arrives automatically');
 assert.ok(s.tutorial>=4);
});
test('residents arrive by knocking, need beds and can be assigned',()=>{
 const {D,s}=setup();
 D.visitor(s);
 assert.equal(D.accept(s,s.visitors[0].id).ok,false,'cannot enter without beds');
 buildStarter(D,s);
 const p=s.visitors[0];assert.ok(D.accept(s,p.id).ok);
 assert.equal(s.people.length,1);
 assert.equal(D.assign(s,p.id,999).ok,false);
});
test('working reactors produce collectible power',()=>{
 const {D,s}=setup();buildStarter(D,s);
 const p=s.visitors[0];D.accept(s,p.id);
 for(const site of ['grove','road','road','grove','road'])task(D,s,'scavenge',null,site);
 task(D,s,'dig',7);task(D,s,'dig',8);task(D,s,'support',7,'timber');
 task(D,s,'room',7,'power');
 const r=s.rooms.find(r=>r.type==='power');
 assert.ok(D.assign(s,p.id,r.id).ok);
 passTime(D,s,20);assert.ok(r.ready);
 assert.ok(D.collect(s,r.id).ok);assert.ok(s.res.power>0);
});
test('dehydration matters, residents have shifts, equipment and loyalty',()=>{
 const {D,s}=setup();buildStarter(D,s);
 const p=s.visitors[0];D.accept(s,p.id);
 s.res.food=0;s.res.water=0;const h=p.hunger,w=p.thirst;
 passTime(D,s,16);
 assert.ok(p.hunger<h&&p.thirst<w);
 assert.ok(D.shift(s,p.id).ok);assert.equal(p.shift,'night');
 s.res.scrap=20;
 assert.ok(D.equip(s,p.id,'weapon').ok);
 assert.ok(p.weapon>=1);assert.equal(typeof p.loyalty,'number');
});
test('background checks are not guaranteed and research does not upgrade existing rooms',()=>{
 const {D,s}=setup();buildStarter(D,s);
 s.res.scrap+=6;
 const p=s.visitors[0];assert.ok(D.check(s,p.id).ok);
 assert.equal(p.checks,1);
 const frame=s.grid[4].support;
 s.research+=15;assert.ok(D.research(s,'stone').ok);
 assert.equal(s.grid[4].support,frame);
});
test('room dismantling leaves usable excavation and saves serialize',()=>{
 const {D,s}=setup();buildStarter(D,s);
 task(D,s,'remove',5);
 assert.equal(s.rooms.length,0);
 assert.equal(s.grid[5].kind,'open');
 const copy=JSON.parse(JSON.stringify(s));
 assert.ok(D.valid(copy));assert.equal(D.valid({version:2}),false);
});
test('no Canvas boot path; new cutaway assets and controls exist',()=>{
 const html=readFileSync(new URL('index.html',root),'utf8');
 const ui=readFileSync(new URL('game.js',root),'utf8');
 const css=readFileSync(new URL('style.css',root),'utf8');
 for(const file of ['core.js','game.js','style.css','index.html'])assert.ok(existsSync(new URL(file,root)));
 assert.match(html,/src="\.\/core\.js\?v=routines-110"/);
 assert.match(html,/id="earth"/);assert.match(html,/id="roomLayer"/);
 assert.match(html,/id="outsidePeople"/);assert.match(html,/id="powerCount"/);
 assert.doesNotMatch(ui,/getContext\(/);
 assert.match(css,/\.room\.food/);assert.match(css,/\.dweller\.walk/);
});
