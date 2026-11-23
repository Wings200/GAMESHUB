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
 remove(){this.removed=true;}
 get lastElementChild(){return this.children.at(-1)||null;}
}
function runUI(){
 const window={},elements=new Map(),actions=['dig','timber','build','inspect','demolish'].map(name=>{
  const e=new FakeElement('action');e.dataset.tool=name;return e;
 });
 vm.runInNewContext(core,{window,Math,Date});
 const el=id=>{if(!elements.has(id))elements.set(id,new FakeElement(id));return elements.get(id);};
 const document={
  getElementById:el,createElement:id=>new FakeElement(id),
  querySelectorAll:q=>q==='.action[data-tool]'?actions:[],
  querySelector:q=>q==='.surface-scene'?el('surface-scene'):null,
  addEventListener(k,fn){this['on'+k]=fn;}
 };
 let now=0,interval=null;
 const files={};
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
 return {el,actions,step,command,clickTile,state,errors};
}
test('browser UI boots, draws 63 real HTML sectors, scavenges and builds first room',()=>{
 const h=runUI();
 assert.equal(h.el('continueRun').hidden,true);
 h.el('newRun').click();
 assert.equal(h.state().rooms.length,0);
 assert.equal((h.el('earth').innerHTML.match(/data-index=/g)||[]).length,63);
 assert.ok(h.el('sideContent').innerHTML.includes('SCAVENGE'));
 h.command('search','','grove');h.step(4);
 assert.equal(h.state().scavenges,1);
 h.clickTile(5);h.step(2);h.clickTile(6);h.step(2);
 h.actions[1].click();h.clickTile(5);h.step(2);
 h.actions[2].click();h.clickTile(5);h.step(3);
 assert.equal(h.state().rooms.length,1);
 assert.equal(h.state().rooms[0].type,'quarters');
 assert.equal(h.state().visitors.length,1);
 assert.ok(h.el('roomLayer').innerHTML.includes('Living Quarters'.toUpperCase()));
 assert.deepEqual(h.errors,[]);
});
