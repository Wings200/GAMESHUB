import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root=new URL('../games/vault-directive/',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
const core=read('core.js'),ui=read('game.js');
class FakeElement{
 constructor(id){
  this.id=id;this.tagName='DIV';this.dataset={};this.style={};this.hidden=false;
  this.children=[];this.listeners={};this.innerHTML='';this.textContent='';
  this.value=id==='vaultName'?'TEST HORIZON':'';this.clientWidth=950;
  const set=new Set();
  this.classList={
   add:k=>set.add(k),remove:k=>set.delete(k),contains:k=>set.has(k),
   toggle:(k,f)=>{if(f===undefined)f=!set.has(k);f?set.add(k):set.delete(k);}
  };
 }
 addEventListener(k,fn){this.listeners[k]=fn;}
 click(){this.listeners.click?.({target:this});}
 prepend(n){this.children.unshift(n);this.children=this.children.slice(0,4);}
 appendChild(n){this.children.push(n);n.parent=this;}
 remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 get lastElementChild(){return this.children.at(-1)||null;}
}
function runUI(initialFiles={}){
 const window={},elements=new Map(),panels=['tutorial','build','roster','supplies','explore','security','research','journal'].map(name=>{const b=new FakeElement('tab');b.dataset.panel=name;return b;}),actions=['dig','timber','build','inspect','demolish'].map(name=>{
  const e=new FakeElement('action');e.dataset.tool=name;return e;
 });
 vm.runInNewContext(core,{window,Math,Date});
 const el=id=>{if(!elements.has(id))elements.set(id,new FakeElement(id));return elements.get(id);};
 const document={
  getElementById:el,createElement:id=>new FakeElement(id),
  querySelectorAll:q=>q==='.action[data-tool]'?actions:q==='.panel-tab'?panels:[],
  querySelector:q=>q==='.surface-scene'?el('surface-scene'):null,
  addEventListener(k,fn){this['on'+k]=fn;}
 };
 let now=0,interval=null;
 const files={...initialFiles};
 const storage={getItem:k=>files[k]??null,setItem:(k,v)=>files[k]=v};
 const errors=[];
 vm.runInNewContext(ui,{
  window,document,localStorage:storage,performance:{now:()=>now},
  setInterval:fn=>{interval=fn;},setTimeout:()=>0,
  console:{error(...a){errors.push(a.join(' '));}}
 });
 const state=()=>JSON.parse(files['gameshub-vault-directive-rebuild-v3']);
 const step=seconds=>{for(let i=0;i<seconds*5;i++){now+=200;interval();}};
 const command=(name,id='',value='')=>{
  const n={dataset:{command:name,id,value}};
  document.onclick({target:{closest:q=>q==='[data-command]'?n:null},preventDefault(){},stopPropagation(){}});
 };
 const clickTile=i=>{
  const n={dataset:{index:String(i)}};
  document.onclick({target:{closest:q=>q==='.sector[data-index]'?n:null},preventDefault(){},stopPropagation(){}});
 };
 const panel=name=>{
  const b=panels.find(x=>x.dataset.panel===name);
  document.onclick({target:{closest:q=>q==='[data-panel]'?b:null},preventDefault(){},stopPropagation(){}});
 };
 return {el,actions,step,command,clickTile,state,errors,panel,panels};
}
test('browser UI boots, draws 63 real HTML sectors, scavenges and builds first room',()=>{
 const h=runUI();
 assert.equal(h.el('continueRun').hidden,true);
 h.el('newRun').click();
 assert.equal(h.state().rooms.length,0);
 assert.equal((h.el('earth').innerHTML.match(/data-index=/g)||[]).length,63);
 assert.ok(h.el('sideContent').innerHTML.includes('SCAVENGE'));
 h.command('search','','grove');h.step(10);
 assert.equal(h.state().scavenges,1);
 h.clickTile(5);h.step(2);h.clickTile(6);h.step(2);
 h.actions[1].click();h.clickTile(5);h.step(2);
 h.actions[2].click();h.clickTile(5);h.step(3);
 assert.equal(h.state().rooms.length,1);
 assert.equal(h.state().rooms[0].type,'quarters');
 assert.equal(h.state().visitors.length,1);
 assert.ok(h.el('roomLayer').innerHTML.includes('Living Quarters'.toUpperCase()));
 const visitor=h.state().visitors[0];
 h.command('accept',visitor.id);
 assert.equal(h.state().people.length,1);
 assert.equal(h.el('peopleLayer').children.length,1,'resident rendered once');
 assert.equal(h.el('roomLayer').innerHTML.includes('room-people"><span class="dweller'),false,'rooms do not duplicate sprites');
 h.panel('supplies');assert.ok(h.el('sideTitle').textContent.includes('STOCKPILE'));
 h.panel('security');assert.ok(h.el('sideTitle').textContent.includes('SECURITY'));
 h.panel('research');assert.ok(h.el('sideTitle').textContent.includes('RESEARCH'));
 h.panel('explore');assert.ok(h.el('sideTitle').textContent.includes('EXPLORATION'));
 assert.deepEqual(h.errors,[]);
});

test('overworld visibly tracks outbound travel, searching, return and salvage report',()=>{
 const h=runUI();h.el('newRun').click();
 h.el('surfaceBtn').click();
 assert.equal(h.el('surfaceLayer').classList.contains('hidden'),false);
 assert.equal((h.el('surfaceSites').innerHTML.match(/class="site-pin/g)||[]).length,5);
 h.command('search','','grove');
 h.step(2);
 assert.match(h.el('travelStage').textContent,/TRAVELING OUTBOUND/);
 const first=h.el('travelAvatar').style.left;
 h.step(2);
 assert.match(h.el('travelStage').textContent,/SEARCHING/);
 assert.notEqual(h.el('travelAvatar').style.left,first,'Overseer should move across the map');
 h.step(3);
 assert.match(h.el('travelStage').textContent,/RETURNING/);
 h.step(3);
 assert.equal(h.state().scavenges,1);
 assert.equal(h.state().expeditionHistory.length,1);
 assert.ok(h.el('surfaceDetails').innerHTML.includes('LAST RETURN'));
 h.el('returnVaultBtn').click();
 assert.equal(h.el('surfaceLayer').classList.contains('hidden'),true);
 assert.deepEqual(h.errors,[]);
});

test('night and day routines move the same resident sprite instead of duplicating them',()=>{
 const w={};vm.runInNewContext(core,{window:w,Math,Date});
 const D=w.VDCore,s=D.create('SHIFT TEST');
 s.grid[5]={kind:'room',room:20,support:'timber'};
 s.grid[6]={kind:'room',room:20,support:null};
 s.grid[7]={kind:'room',room:21,support:'timber'};
 s.grid[8]={kind:'room',room:21,support:null};
 s.rooms=[
  {id:20,type:'quarters',cells:[5,6],workers:[],progress:0,ready:false,cycles:0,health:100},
  {id:21,type:'power',cells:[7,8],workers:[],progress:0,ready:false,cycles:0,health:100}
 ];
 s.nextId=22;
 const p=D.actor('Alex Test',s);p.sick=false;p.hunger=90;p.thirst=90;
 s.people=[p];s.rooms[1].workers=[p.id];p.job=21;s.clock=20*60+53;
 const h=runUI({'gameshub-vault-directive-rebuild-v3':JSON.stringify(s)});
 h.el('continueRun').click();
 const layer=h.el('peopleLayer');
 assert.equal(layer.children.length,1);
 const node=layer.children[0];
 assert.ok(node.className.includes('walk'),'day worker is awake');
 assert.equal(node.dataset.state.includes('On duty'),true);
 assert.equal(node.style.left,'997px','worker appears in reactor not living quarters');
 h.step(3);
 assert.equal(layer.children.length,1,'still a single sprite');
 assert.ok(node.className.includes('sleep'),'day-shift worker goes to bed at night');
 assert.ok(node.dataset.state.includes('Sleeping'));
 assert.equal(node.style.left,'721px','same DOM node now appears in quarters');
 assert.deepEqual(h.errors,[]);
});
