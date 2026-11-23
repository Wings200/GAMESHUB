import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../games/vault-directive/game.js', import.meta.url), 'utf8');

function harness() {
  const elements = new Map();
  const fakeContext = new Proxy({ createLinearGradient: () => ({ addColorStop() {} }) }, {
    get(obj, prop) { return prop in obj ? obj[prop] : () => {}; },
    set(obj, prop, value) { obj[prop] = value; return true; }
  });
  function element(id) {
    if (!elements.has(id)) {
      const classes = new Set(id.endsWith('Modal') || id === 'toast' ? ['hidden'] : []);
      const el = {
        id, dataset: {}, style: {}, textContent: '', innerHTML: '',
        width: 760, height: 225,
        classList: {
          add(...names) { names.forEach(n => classes.add(n)); },
          remove(...names) { names.forEach(n => classes.delete(n)); },
          toggle(name, value) { if (value ?? !classes.has(name)) classes.add(name); else classes.delete(name); },
          contains(name) { return classes.has(name); }
        },
        addEventListener(type, callback) { (this.handlers ??= {})[type] = callback; },
        getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 500 }; },
        getContext() { return fakeContext; },
        hasPointerCapture() { return false; }
      };
      elements.set(id, el);
    }
    return elements.get(id);
  }
  const document = {
    getElementById: element, addEventListener() {},
    querySelectorAll(selector) {
      const choices = selector === '.tool' ? ['inspect','dig'].map(tool => ({tool}))
        : selector === '.build-choice' ? ['generator','bunks','water','garden'].map(room => ({room}))
        : selector === '.speed' ? [1,2,4].map(speed => ({speed})) : [];
      return choices.map(data => Object.assign(element(selector + JSON.stringify(data)), { dataset:data }));
    }
  };
  const window = { devicePixelRatio:1, addEventListener() {} };
  const storage = { entries:new Map(), getItem(k) { return this.entries.get(k) || null; },
    setItem(k,v) { this.entries.set(k,v); }, removeItem(k) { this.entries.delete(k); } };
  const modified = source.replace('(() => {','return (() => {')
    .replace(/\}\)\(\);\s*$/, 'return { get state(){return state}, markZone, placeRoom, chooseWorker, startProject, tick, powerData, launchExpedition, exploreRoom, recallExpedition, drawScene, openExpedition, setTool, saveGame };})();');
  function boot() {
    return new Function('document','window','localStorage','requestAnimationFrame','performance',modified)(
      document,window,storage,()=>{}, { now:()=>100 }
    );
  }
  return { boot, element, storage };
}
function simulate(app, until, limit=3500) {
  for(let i=0;i<limit&&!until();i++)app.tick(.05);
  assert.ok(until(), 'Simulation did not reach the expected state');
}

test('starts with only a hatch, three survivors and no rooms', () => {
  const { boot }=harness(),app=boot();
  assert.equal(app.state.rooms.length,0);
  assert.equal(app.state.survivors.length,3);
  assert.equal(app.state.terrain[7][8],0);
  assert.equal(app.state.terrain[7][13],1);
  assert.equal(app.state.tutorialEnabled,true);
  assert.doesNotThrow(()=>app.drawScene(100));
});
test('excavation requires manual crew assignment and preserves real terrain changes', () => {
  const { boot }=harness(),app=boot();
  app.markZone({x:13,y:6},{x:16,y:7});
  const job=app.state.projects.at(-1);
  assert.equal(job.cells.length,8);
  assert.equal(job.status,'planned');
  for(let i=0;i<30;i++)app.tick(.05);
  assert.equal(job.status,'planned');
  app.chooseWorker(1);app.startProject(job.id);
  assert.equal(job.status,'active');
  assert.equal(app.state.tutorialFlags.assign,true);
  simulate(app,()=>job.status==='done');
  assert.equal(job.cells.filter(c=>app.state.terrain[c.y][c.x]===0).length,8);
});
test('a room can be built only after excavation and costs real supplies',()=>{
  const {boot}=harness(),app=boot();
  app.setTool('build','generator');app.placeRoom({x:13,y:6},{x:16,y:6});
  assert.equal(app.state.projects.length,0);
  app.markZone({x:13,y:6},{x:16,y:7});
  const dig=app.state.projects.at(-1);
  app.chooseWorker(1);app.startProject(dig.id);
  simulate(app,()=>dig.status==='done');
  app.setTool('build','generator');app.placeRoom({x:13,y:7},{x:16,y:7});
  const build=app.state.projects.at(-1);
  assert.equal(build.kind,'build');
  app.chooseWorker(1);app.startProject(build.id);
  simulate(app,()=>build.status==='done');
  assert.equal(app.state.rooms.length,1);
  assert.equal(app.powerData().generation,7);
  assert.equal(app.state.tutorialFlags.build,true);
  assert.equal(app.state.resources.parts,2);
  assert.equal(app.state.resources.scrap,10);
});
test('scavengers explore rooms, return supplies and deplete real locations',()=>{
  const {boot,element}=harness(),app=boot();
  app.openExpedition();
  element('expeditionContent').handlers.change({target:{
    closest(selector){return selector==='[data-crew]'?{dataset:{crew:'2'},checked:true}:null;}
  }});
  app.launchExpedition();
  simulate(app,()=>app.state.expedition?.phase==='exploring',200);
  app.exploreRoom(0);
  simulate(app,()=>app.state.sites[0].rooms[0].searched,450);
  assert.equal(app.state.expedition.loot.food,2);
  app.exploreRoom(0);
  assert.equal(app.state.expedition.action,null);
  app.recallExpedition();
  simulate(app,()=>!app.state.expedition,200);
  assert.equal(app.state.resources.food,14);
  assert.equal(app.state.survivors[1].state,'idle');
  assert.equal(app.state.tutorialFlags.scavenge,true);
});
test('local save retains work orders and depleted scavenging locations',()=>{
  const {boot,storage}=harness(),app=boot();
  app.markZone({x:13,y:6},{x:13,y:7});
  app.state.sites[0].rooms[0].searched=true;
  app.saveGame();
  assert.ok(storage.entries.size>0);
  const loaded=boot();
  assert.equal(loaded.state.projects.length,1);
  assert.equal(loaded.state.sites[0].rooms[0].searched,true);
});
