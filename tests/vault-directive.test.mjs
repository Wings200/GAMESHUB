import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../games/vault-directive/game.js', import.meta.url), 'utf8');

class FakeElement {
  constructor(id) {
    this.id = id; this.children = []; this.listeners = {}; this.style = {};
    this.className = ''; this.classList = {add(){},remove(){},toggle(){}};
    this.textContent = ''; this.value = 'VAULT-TEST';
    this.width = 1200; this.height = 720; this.hidden = false; this.disabled = false;
  }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  click(event) { if (!this.disabled) this.listeners.click?.(event || {clientX:0,clientY:0}); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  closest() { return this; }
  focus() {}
  getBoundingClientRect() { return {left:0, top:0, width:1200, height:720}; }
  getContext() {
    const noop = () => {};
    return new Proxy({}, {
      get(_obj, key) {
        return key === 'createLinearGradient' || key === 'createRadialGradient'
          ? () => ({addColorStop:noop}) : noop;
      },
      set() { return true; }
    });
  }
}
function harness(store={},mode='standard'){
  const elements = {};
  const document = {
    getElementById(id){return elements[id]??(elements[id]=new FakeElement(id));},
    createElement(tag){return new FakeElement(tag);},
    querySelector(){return {value:mode};}
  };
  let nextFrame = null, t=0;
  const localStorage = {
    getItem(key){return store[key]??null;},
    setItem(key, value){store[key]=value;}
  };
  vm.runInNewContext(source, {
    document, localStorage, performance:{now:()=>0},
    requestAnimationFrame(fn){nextFrame=fn;},
    setTimeout(){return 1;}, clearTimeout(){}, confirm(){return true;}, console
  });
  const el=id=>document.getElementById(id);
  const get=()=>JSON.parse(store['gameshub-vault-directive-v1']);
  const frames=n=>{for(let i=0;i<n;i++){t+=151;assert.ok(nextFrame);nextFrame(t);}};
  const visit=(root,pred)=>{
    if(pred(root))return root;
    for(const child of root.children){const found=visit(child,pred);if(found)return found;}
    return null;
  };
  const clickRoom=i=>el('vaultCanvas').click({clientX:120+(i%5)*196,clientY:220+Math.floor(i/5)*100});
  const findButton=(root,label)=>visit(el(root),e=>e.id==='button'&&e.textContent===label);
  const build=(i,name)=>{
    clickRoom(i);
    const b=visit(el('inspectorBody'),e=>e.className==='build-option'&&e.children[1]?.children[0]?.textContent===name);
    assert.ok(b,'Missing construction blueprint '+name);
    assert.equal(b.disabled,false,'Blueprint disabled: '+name);
    b.click();
  };
  return {el,get,frames,store,visit,clickRoom,findButton,build};
}

test('new Standard, Hardcore and Sandbox vaults start with 2 rooms, zero settlers, and a tutorial',()=>{
  for(const mode of ['standard','hardcore','sandbox']){
    const h=harness({},mode);h.el('startBtn').click();const s=h.get();
    assert.equal(s.version,2);assert.equal(s.phase,'vault');assert.equal(s.day,1);
    assert.equal(s.rooms.filter(Boolean).length,2);
    assert.equal(s.rooms[0].type,'command');assert.equal(s.rooms[1].type,'power');
    assert.equal(s.people.length,0);
    assert.equal(s.tutorial.enabled,true);assert.equal(s.tutorial.step,0);
    assert.equal(s.research.level,1);assert.equal(s.research.points,1);
    assert.equal(h.el('tutorialTitle').textContent,'A PLACE TO REST');
    assert.equal(h.el('tutorialPanel').hidden,false);
    assert.equal(h.el('intakeBtn').disabled,true);
  }
});

test('tutorial runs end-to-end: build essential rooms, recruit, staff, buy skill',()=>{
  const h=harness();h.el('startBtn').click();
  h.build(5,'Living Quarters');assert.equal(h.get().tutorial.step,1);
  h.build(6,'Water Works');assert.equal(h.get().tutorial.step,2);
  h.build(7,'Hydroponics');assert.equal(h.get().tutorial.step,3);
  assert.equal(h.get().people.length,0,'building rooms does not magically spawn settlers');
  assert.equal(h.el('intakeBtn').disabled,false);
  h.el('intakeBtn').click();
  assert.equal(h.get().people.length,1);
  assert.equal(h.get().tutorial.step,4);
  const resident=h.visit(h.el('roster'),e=>e.id==='button'&&String(e.className).startsWith('resident'));
  assert.ok(resident);resident.click();
  h.clickRoom(6);
  const assign=h.visit(h.el('inspectorBody'),e=>e.id==='button'&&e.textContent.startsWith('ASSIGN'));
  assert.ok(assign);assign.click();
  assert.equal(h.get().people[0].job,6);
  assert.equal(h.get().tutorial.step,5);
  h.el('skillsBtn').click();
  const skill=h.findButton('skillsList','UNLOCK · 1 POINT');
  assert.ok(skill);skill.click();
  const final=h.get();
  assert.equal(final.tutorial.enabled,false);
  assert.equal(final.tutorial.finished,true);
  assert.equal(final.tutorial.step,6);
  assert.equal(h.el('tutorialPanel').hidden,true);
  assert.ok(final.research.unlocked.length>0);
  assert.ok(final.resources.scrap>=20);
});

test('skill dependencies and output modifiers work and skills persist',()=>{
  const h=harness();h.el('startBtn').click();
  h.build(5,'Living Quarters');h.build(6,'Water Works');h.build(7,'Hydroponics');
  const before=Number(h.el('d-power').textContent.split(' ')[0]);
  const water=h.visit(h.el('skillsList'),e=>e.id==='button'&&e.textContent==='LOCKED');
  assert.ok(water,'Dependent skills should be locked');
  const grid=h.visit(h.el('skillsList'),e=>e.id==='button'&&e.textContent==='UNLOCK · 1 POINT');
  assert.ok(grid);grid.click();
  const after=Number(h.el('d-power').textContent.split(' ')[0]);
  assert.ok(after>before,'Efficient Grid should boost live power production');
  assert.ok(h.get().research.unlocked.includes('grid'));
  const resumed=harness(h.store);resumed.el('continueBtn').click();
  assert.ok(resumed.get().research.unlocked.includes('grid'));
  assert.ok(resumed.get().research.level>=2,'Constructing rooms should earn research experience');
});

test('unconnected construction is disabled, and quarters allow future recruitment',()=>{
  const h=harness();h.el('startBtn').click();
  h.clickRoom(24);
  const far=h.visit(h.el('inspectorBody'),e=>e.className==='build-option');
  assert.ok(far);assert.equal(far.disabled,true);
  h.build(5,'Living Quarters');
  assert.equal(h.get().rooms[5].type,'quarters');
  assert.equal(h.get().resources.scrap,160-28);
  assert.equal(h.el('intakeBtn').disabled,true,'water and food must exist before recruitment');
});

test('existing alpha 0.1 saves migrate without losing their inhabitants or rooms',()=>{
  const h=harness();h.el('startBtn').click();
  h.build(5,'Living Quarters');h.build(6,'Water Works');h.build(7,'Hydroponics');
  h.el('intakeBtn').click();
  const previous=h.get();
  previous.version=1;delete previous.research;delete previous.tutorial;
  h.store['gameshub-vault-directive-v1']=JSON.stringify(previous);
  const upgraded=harness(h.store);upgraded.el('continueBtn').click();
  upgraded.el('saveBtn').click();
  const now=upgraded.get();
  assert.equal(now.version,2);assert.equal(now.people.length,1);
  assert.equal(now.rooms.filter(Boolean).length,5);
  assert.equal(now.tutorial.enabled,false,'returning users keep their old progress');
  assert.equal(now.research.points,1);
});

test('raiders, rebels and outbreaks can be tested after training; siege remains functional',()=>{
  const h=harness();h.el('startBtn').click();
  assert.equal(h.el('raidBtn').disabled,true,'training should start without random combat');
  assert.equal(h.el('revoltBtn').disabled,true);
  h.el('skipTutorialBtn').click();
  h.el('raidBtn').click();
  let s=h.get();
  const raider=s.rooms.findIndex(r=>r?.owner==='raiders');
  assert.ok(raider>=0);
  h.clickRoom(raider);
  const seal=h.findButton('inspectorBody','SEAL / BESIEGE');
  assert.ok(seal);seal.click();s=h.get();
  assert.equal(s.rooms[raider].sealed,true);
  h.el('outbreakBtn').click();
  assert.ok(Object.keys(h.get().outbreaks).length>=1);
  h.build(5,'Living Quarters');h.build(6,'Water Works');h.build(7,'Hydroponics');
  for(let i=0;i<4;i++)h.el('intakeBtn').click();
  assert.ok(h.get().people.length>=4);
  h.el('revoltBtn').click();
  assert.ok(h.get().rooms.some(r=>r?.owner==='rebels'));
});

test('simulated time advances resources and research XP without hiring settlers',()=>{
  const h=harness();h.el('startBtn').click();
  const before=h.get();h.frames(45);const after=h.get();
  assert.ok(after.day>=3);
  assert.ok(after.resources.power!==before.resources.power);
  assert.equal(after.people.length,0);
  assert.ok(after.research.xp>before.research.xp);
  assert.equal(after.rooms.filter(Boolean).length,2);
});

test('overthrow triggers exile in Standard, permanent defeat in Hardcore',()=>{
  for(const mode of ['standard','hardcore']){
    const h=harness({},mode);h.el('startBtn').click();
    const previous=h.get();previous.rooms.forEach(r=>{if(r){r.owner='raiders';r.resistance=70;}});
    h.store['gameshub-vault-directive-v1']=JSON.stringify(previous);
    const reloaded=harness(h.store,mode);reloaded.el('continueBtn').click();reloaded.frames(16);
    const s=reloaded.get();
    assert.equal(s.phase,mode==='hardcore'?'gameover':'exile');
    if(mode==='standard'){
      const rebuild=reloaded.visit(reloaded.el('exileActions'),e=>e.id==='button'&&e.children[0]?.textContent==='FOUND A NEW VAULT');
      assert.ok(rebuild);rebuild.click();
      const next=reloaded.get();assert.equal(next.phase,'vault');assert.equal(next.number,2);
      assert.ok(next.history.length>=1);
      assert.equal(next.people.length,0,'no survivors were loyal in this synthetic lost-vault case');
    }
  }
});
