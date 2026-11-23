import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const js=readFileSync(new URL('../games/vault-foundations/game.js', import.meta.url),'utf8');
const html=readFileSync(new URL('../games/vault-foundations/index.html', import.meta.url),'utf8');

class FakeElement{
 constructor(id){
  this.id=id;this.tagName=id.toUpperCase();this.dataset={};this.className='';
  this.children=[];this.listeners={};this.style={};this.value='TEST-VAULT';
  this.width=1130;this.height=700;this.hidden=false;this.disabled=false;
  const classes=new Set(id==='startOverlay'?[]:['hidden']);
  this.classList={
   contains:k=>classes.has(k),
   add:k=>classes.add(k),
   remove:k=>classes.delete(k),
   toggle:(k,flag)=>{if(flag===undefined)flag=!classes.has(k);flag?classes.add(k):classes.delete(k);}
  };
 }
 addEventListener(k,fn){this.listeners[k]=fn;}
 click(event){if(!this.disabled)this.listeners.click?.(event??{});}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(){}
 focus(){}
 getBoundingClientRect(){return{left:0,top:0,width:1130,height:700};}
 getContext(){
  const noop=()=>{};
  return new Proxy({},{get(_o,key){return key==='createLinearGradient'||key==='createRadialGradient'
   ?()=>({addColorStop:noop}):noop;},set(){return true;}});
 }
}
function harness(stored={},fakeMath=Math){
 const elements=new Map(),tools={};
 for(const name of ['dig','inspect','timber','stone','steel','remove','quarters','storage','water','farm']){
  const button=new FakeElement('button');button.dataset.tool=name;tools[name]=button;
 }
 const el=id=>{if(!elements.has(id))elements.set(id,new FakeElement(id));return elements.get(id);};
 const document={
  getElementById:el,
  createElement:id=>new FakeElement(id),
  querySelectorAll:query=>query==='[data-tool]'?Object.values(tools):[],
  addEventListener(){},
  activeElement:null
 };
 let cb=null,now=0;
 const localStorage={getItem:key=>stored[key]??null,setItem:(key,v)=>{stored[key]=v;}};
 vm.runInNewContext(js,{
  document,localStorage,performance:{now:()=>now},
  requestAnimationFrame:fn=>{cb=fn;},
  confirm:()=>true,
  Math:fakeMath
 });
 const state=()=>JSON.parse(stored['gameshub-vault-foundations-v1']);
 const frames=n=>{for(let i=0;i<n;i++){now+=95;assert.ok(cb);cb(now);}};
 const target=(x,y)=>el('world').click({clientX:134+x*45+22,clientY:217+y*45+22});
 const surface=site=>{el('world').click({clientX:60+site*264,clientY:330});frames(40);};
 const dig=(x,y)=>{target(x,y);frames(36);};
 const equip=name=>tools[name].click();
 const scavengeBase=()=>{el('surfaceBtn').click();surface(0);surface(0);surface(1);el('undergroundBtn').click();};
 const excavateTutorial=()=>{equip('dig');for(const [x,y] of [[10,0],[11,0],[10,1],[11,1]])dig(x,y);};
 const buildQuarters=()=>{
  equip('timber');target(10,0);frames(30);target(11,1);frames(30);
  equip('quarters');target(10,0);frames(35);
 };
 return {el,tools,frames,state,target,surface,dig,equip,stored,scavengeBase,excavateTutorial,buildQuarters};
}
test('the game starts at one entrance only with no resources, rooms, or settlers',()=>{
 const h=harness();
 // The first browser frame runs BEFORE the player starts; rendering must not crash.
 h.frames(2);
 h.el('startBtn').click();h.frames(3);
 const g=h.state();
 assert.equal(g.cells.filter(c=>c.kind==='open').length,1);
 assert.equal(g.cells[9].support,'steel');
 assert.equal(g.rooms.length,0);
 assert.equal(g.wood,0);assert.equal(g.scrap,0);assert.equal(g.stone,0);
 assert.equal(g.tutorial.step,0);assert.equal(g.tutorial.done,false);
 assert.equal(g.digs,0);assert.equal(g.scavenges,0);
 assert.equal(h.el('tutTitle').textContent,'SCAVENGE FOR SUPPLIES');
});
test('the animation loop is alive before and after starting, and when entering the surface',()=>{
 const h=harness();
 h.frames(5); // Open start overlay: must draw background safely with no active game
 h.el('startBtn').click();
 h.frames(5); // Underground grid and Overseer
 h.el('surfaceBtn').click();
 h.frames(5); // Scavenge destination cards
 h.surface(0);
 assert.equal(h.state().scavenges,1);
 h.frames(5); // Render still alive after scavenging
 h.el('undergroundBtn').click();
 h.frames(5);
 assert.equal(h.state().cells.length,190);
});
test('surface scavenging is an actual action and first excavations require a connected path',()=>{
 const h=harness();h.el('startBtn').click();
 h.target(18,9);h.frames(20);assert.equal(h.state().digs,0,'far dirt is not reachable');
 h.el('surfaceBtn').click();h.surface(0);
 const g=h.state();assert.ok(g.wood>=5);assert.equal(g.scavenges,1);
 assert.equal(g.digs,0);assert.ok(g.research>=2);
 h.el('undergroundBtn').click();h.dig(10,0);
 assert.equal(h.state().digs,1);
 assert.equal(h.state().cells[10].kind,'open');
 assert.equal(h.state().stone,1);
});
test('first playable tutorial is completable and requires supports for rooms',()=>{
 const h=harness();h.el('startBtn').click();
 h.scavengeBase();
 assert.equal(h.state().tutorial.step,2,'surface-to-underground tutorial progressed');
 h.excavateTutorial();
 assert.equal(h.state().tutorial.step,3);
 assert.equal(h.state().digs,4);
 h.equip('quarters');h.target(10,0);h.frames(20);
 assert.equal(h.state().rooms.length,0,'unframed dirt is not buildable');
 h.equip('timber');h.target(10,0);h.frames(30);
 h.equip('quarters');h.target(10,0);h.frames(20);
 assert.equal(h.state().rooms.length,0,'a single support is insufficient');
 h.equip('timber');h.target(11,1);h.frames(30);
 assert.equal(h.state().tutorial.step,4);
 h.equip('quarters');h.target(10,0);h.frames(35);
 assert.equal(h.state().tutorial.step,5);
 assert.equal(h.state().rooms[0].type,'quarters');
 assert.equal(h.state().cells[10].kind,'room');
 h.el('techBtn').click();
 const stone=h.el('techList').children[0].children[2];
 assert.equal(stone.disabled,false);
 stone.click();
 assert.equal(h.state().tutorial.done,true);
 assert.ok(h.state().tech.includes('stone'));
 assert.equal(h.state().cells[10].support,'timber','tech did not silently upgrade old tunnels');
});
test('research gating, genuine construction costs, and save continuity work',()=>{
 const old='gameshub-vault-directive-v1',olderSave='{"version":2,"legacy":true}';
 const store={[old]:olderSave};
 const h=harness(store);h.el('startBtn').click();
 const starting=h.state();h.equip('stone');
 assert.equal(h.state().tech.length,0,'locked tool cannot place advanced structures');
 h.equip('timber');h.target(9,0);h.frames(30);
 assert.equal(h.state().cells[9].support,'steel','entrance frame cannot be replaced');
 h.scavengeBase();h.excavateTutorial();
 const before=h.state().wood;
 h.equip('timber');h.target(10,0);h.frames(30);
 assert.equal(h.state().wood,before-2);
 const fresh=harness(store);fresh.el('continueBtn').click();
 assert.equal(fresh.state().wood,h.state().wood);
 assert.equal(fresh.state().cells[10].support,'timber');
 assert.equal(store[old],olderSave,'older Alpha 0.2 game is untouched');
});
test('a hazardous salvage route may lose loot without introducing overseer health stats',()=>{
 const predictable=Object.create(Math);
 predictable.random=()=>0;
 const h=harness({},predictable);h.el('startBtn').click();
 h.el('surfaceBtn').click();h.surface(2);
 const s=h.state();
 assert.ok(s.scavenges===1);
 assert.ok(s.scrap>=0&&s.scrap<=4);
 assert.ok(s.log.some(event=>event.text.includes('hazardous encounter')));
 assert.equal(Object.hasOwn(s,'health'),false);
});
test('tutorial can be skipped without summoning settlers or replacing the older game',()=>{
 const h=harness();h.el('startBtn').click();h.el('skipBtn').click();
 assert.equal(h.state().tutorial.skipped,true);
 assert.equal(h.el('tutorialPanel').hidden,true);
 assert.equal(h.state().rooms.length,0);
 assert.equal(h.state().cells.length,190);
 assert.equal(html.includes('id="surfaceBtn"'),true);
 assert.equal(html.includes('id="techOverlay"'),true);
});
