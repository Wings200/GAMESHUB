import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../games/vault-directive/game.js',import.meta.url),'utf8');
class FakeElement{
 constructor(id){this.id=id;this.listeners={};this.children=[];this.style={};this.classList={add(){},remove(){},toggle(){}};this.textContent='';this.value='VAULT-TEST';this.width=1200;this.height=720;this.hidden=false;this.disabled=false;}
 addEventListener(type,handler){this.listeners[type]=handler;}
 click(event){this.listeners.click?.(event||{clientX:0,clientY:0});}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
 closest(){return this;}
 getBoundingClientRect(){return {left:0,top:0,width:1200,height:720};}
 getContext(){const noop=()=>{};return new Proxy({}, {get(_obj,key){if(key==='createLinearGradient'||key==='createRadialGradient')return ()=>({addColorStop:noop});return noop;},set(){return true;}});}
}
function harness(store={},mode='standard'){
 const elements={};const document={
  getElementById(id){return elements[id]??(elements[id]=new FakeElement(id));},
  createElement(tag){return new FakeElement(tag);},
  querySelector(){return {value:mode};}
 };
 let nextFrame=null,t=0;
 const localStorage={getItem(key){return store[key]??null;},setItem(key,value){store[key]=value;}};
 vm.runInNewContext(source,{document,localStorage,performance:{now:()=>0},requestAnimationFrame(fn){nextFrame=fn;},setTimeout(){return 1;},clearTimeout(){},confirm(){return true;},console});
 const el=id=>document.getElementById(id);
 const get=()=>JSON.parse(store['gameshub-vault-directive-v1']);
 const frames=n=>{for(let i=0;i<n;i++){t+=151;const cb=nextFrame;assert.ok(cb,'frame callback registered');cb(t);}};
 const visit=(root,pred)=>{if(pred(root))return root;for(const child of root.children){const match=visit(child,pred);if(match)return match;}return null;};
 return {el,get,frames,store,visit,clickRoom(i){const col=i%5,row=Math.floor(i/5);el('vaultCanvas').click({clientX:110+col*196+35,clientY:193+row*100+35});}};
}
test('a new vault has working core facilities, unique residents, and persistent resources',()=>{
 const h=harness();h.el('startBtn').click();const s=h.get();
 assert.equal(s.phase,'vault');assert.equal(s.day,1);assert.equal(s.people.length,16);
 assert.equal(s.rooms.filter(Boolean).length,9);assert.equal(new Set(s.people.map(p=>p.id)).size,16);
 assert.ok(s.people.every(p=>p.trait&&typeof p.loyalty==='number'));
 assert.equal(s.rooms[0].type,'command');
});
test('construction costs resources and only works adjacent to connected rooms',()=>{
 const h=harness();h.el('startBtn').click();h.clickRoom(5);
 const option=h.visit(h.el('inspectorBody'),e=>e.className==='build-option'&&e.children[1]?.children[0]?.textContent==='Power Reactor');
 assert.ok(option);assert.equal(option.disabled,false);
 const old=h.get();option.click();const s=h.get();
 assert.equal(s.rooms[5].type,'power');assert.equal(s.resources.scrap,old.resources.scrap-40);
 assert.equal(s.resources.credits,old.resources.credits-25);
 h.clickRoom(24);
 const far=h.visit(h.el('inspectorBody'),e=>e.className==='build-option');
 assert.equal(far.disabled,true);
});
test('hostile occupations and outbreaks are actionable, with sealing supported',()=>{
 const h=harness();h.el('startBtn').click();
 h.el('revoltBtn').click();let s=h.get();
 const rebel=s.rooms.findIndex(r=>r?.owner==='rebels');assert.ok(rebel>0);
 h.clickRoom(rebel);
 const seal=h.visit(h.el('inspectorBody'),e=>e.tagName==='button'&&e.textContent==='SEAL / BESIEGE');
 // DOM mock uses ids instead of tagName; inspect button text directly
 const actual=seal||h.visit(h.el('inspectorBody'),e=>e.textContent==='SEAL / BESIEGE');
 assert.ok(actual);actual.click();s=h.get();assert.equal(s.rooms[rebel].sealed,true);
 h.el('raidBtn').click();s=h.get();assert.equal(s.rooms.filter(r=>r?.owner==='raiders').length,1);
 h.el('outbreakBtn').click();s=h.get();assert.equal(Object.keys(s.outbreaks).length,1);
});
test('the simulation advances resources, relationships, and siege pressure',()=>{
 const h=harness();h.el('startBtn').click();const start=h.get();
 h.el('revoltBtn').click();const occupied=h.get().rooms.findIndex(r=>r?.owner==='rebels');
 h.clickRoom(occupied);
 h.visit(h.el('inspectorBody'),e=>e.textContent==='SEAL / BESIEGE').click();
 h.frames(45);const after=h.get();
 assert.ok(after.day>=3);
 assert.ok(after.resources.food!==start.resources.food);
 assert.ok(after.people.every(p=>p.loyalty>=0&&p.loyalty<=98));
 assert.ok(after.rooms[occupied]?.owner==='vault'||after.rooms[occupied]?.resistance<80);
});
test('overthrow triggers exile in Standard, and permanent defeat in Hardcore',()=>{
 for(const mode of ['standard','hardcore']){
  const first=harness({},mode);first.el('startBtn').click();const store=first.store;const broken=first.get();
  broken.rooms.forEach(r=>{if(r)r.owner='raiders';});
  store['gameshub-vault-directive-v1']=JSON.stringify(broken);
  const reloaded=harness(store,mode);reloaded.el('continueBtn').click();reloaded.frames(16);
  const s=reloaded.get();assert.equal(s.phase,mode==='hardcore'?'gameover':'exile');
  if(mode==='standard'){
   const rebuild=reloaded.visit(reloaded.el('exileActions'),e=>e.id==='button'&&e.children[0]?.textContent==='FOUND A NEW VAULT');
   assert.ok(rebuild);rebuild.click();const next=reloaded.get();
   assert.equal(next.phase,'vault');assert.equal(next.number,2);assert.ok(next.history.length>=1);
  }
 }
});
