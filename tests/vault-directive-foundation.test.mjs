/* VAULT DIRECTIVE / Gameplay regression tests.
   Run: node --test tests/vault-directive-foundation.test.mjs
   Tests execute the real engine and survival module in a minimal DOM/canvas harness.
*/
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gameSource=readFileSync(new URL('../games/vault-directive/game.js',import.meta.url),'utf8');
const systemsSource=readFileSync(new URL('../games/vault-directive/systems.js',import.meta.url),'utf8');
const htmlSource=readFileSync(new URL('../games/vault-directive/index.html',import.meta.url),'utf8');

function harness(){
  const objects=new Map();
  const graphics=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{
    get(target,key){return key in target?target[key]:()=>{};},
    set(target,key,value){target[key]=value;return true;}
  });
  function element(id){
    if(!objects.has(id)){
      const classes=new Set(id.endsWith('Modal')||id==='toast'?['hidden']:[]);
      objects.set(id,{
        id,dataset:{},style:{},innerHTML:'',textContent:'',width:760,height:225,
        classList:{
          add(...n){n.forEach(x=>classes.add(x));},
          remove(...n){n.forEach(x=>classes.delete(x));},
          toggle(n,v){(v??!classes.has(n))?classes.add(n):classes.delete(n);},
          contains(n){return classes.has(n);}
        },
        addEventListener(k,fn){(this.handlers??={})[k]=fn;},
        getBoundingClientRect(){return {left:0,top:0,width:800,height:500};},
        getContext(){return graphics;},
        hasPointerCapture(){return false;},
        setPointerCapture(){},
        releasePointerCapture(){}
      });
    }
    return objects.get(id);
  }
  const document={
    getElementById:element,addEventListener(){},
    querySelectorAll(q){
      const data=q==='.tool'?['inspect','dig','door','ladder'].map(tool=>({tool})):
        q==='.build-choice'?
          ['generator','bunks','water','garden','medbay','radio','security','storage','ventilation','training','workshop'].map(room=>({room})):
          q==='.speed'?[1,2,4].map(speed=>({speed})):[];
      return data.map(d=>Object.assign(element(q+JSON.stringify(d)),{dataset:d}));
    }
  };
  const window={devicePixelRatio:1,addEventListener(){}};
  new Function('window',systemsSource)(window);
  const stored=new Map(),localStorage={
    getItem(k){return stored.get(k)||null;},
    setItem(k,v){stored.set(k,v);},
    removeItem(k){stored.delete(k);}
  };
  // The IIFE is intentionally instrumented only in tests. Real source remains unchanged.
  const instrument=gameSource.replace('(() => {','return (() => {')
    .replace(/\}\)\(\);\s*$/, 'return {get state(){return state}, markZone, placeRoom, chooseWorker, startProject,'+
      'tick, powerData, drawScene, openExpedition, launchExpedition, exploreRoom, recallExpedition,'+
      'saveGame, renderInspector, renderSecurity, setTool, guideDoor, guideLadder, guideNext,'+
      'startSurvey, fightExpedition, retreatExpedition, requestUpgrade, bfs };})();');
  function boot(){return new Function('document','window','localStorage','requestAnimationFrame','performance',
    'clearTimeout','setTimeout',instrument)(document,window,localStorage,()=>{},{now:()=>100},()=>{},()=>4);}
  const app=boot();
  return {app,systems:window.VDSystems,document,element,stored,boot};
}
function runUntil(app,predicate,limit=3000){
  for(let n=0;n<limit&&!predicate();n++)app.tick(.05);
  assert.ok(predicate(),'simulated task did not finish within '+(limit*.05)+' seconds');
}
function advance(app,seconds){
  for(let n=0;n<seconds*20;n++)app.tick(.05);
}
function digThenBuild(app,type='generator',x=13){
  app.markZone({x,y:6},{x:x+3,y:7});
  const excavation=app.state.projects.at(-1);
  app.chooseWorker(1);app.startProject(excavation.id);
  runUntil(app,()=>excavation.status==='done');
  app.setTool('build',type);
  app.placeRoom({x,y:6},{x:x+3,y:6});
  const building=app.state.projects.at(-1);
  assert.equal(building.kind,'build');
  app.chooseWorker(1);app.startProject(building.id);
  runUntil(app,()=>building.status==='done');
  return app.state.rooms.at(-1);
}
function crewInput(element,id='2'){
  element('expeditionContent').handlers.change({target:{closest(selector){
    return selector==='[data-crew]'?{dataset:{crew:id},checked:true}:null;
  }}});
}

test('boots an empty underground shelter with three named residents',()=>{
  const {app}=harness();
  assert.equal(app.state.rooms.length,0);
  assert.equal(app.state.survivors.length,3);
  assert.equal(app.state.terrain[7][8],0);
  assert.equal(app.state.terrain[7][13],1);
  assert.equal(app.state.tutorialEnabled,true);
  assert.equal(app.powerData().demand,1); // hatch / essential air pump
  assert.doesNotThrow(()=>app.drawScene(100));
});
test('rations and water deplete visibly over elapsed real time (no duplicate consumption)',()=>{
  const {app}=harness();
  const food=app.state.resources.food,water=app.state.resources.water;
  advance(app,30);
  assert.ok(app.state.resources.food<food-.2);
  assert.ok(app.state.resources.water<water-.3);
  assert.equal(app.state.resourceRate.food,-.6);
  assert.equal(app.state.resourceRate.water,-.8);
  assert.ok(app.state.resources.food>11.6); // no accidental double charge
});
test('digging is a real work order, requiring workers and clearing only accessible earth',()=>{
  const {app}=harness();
  app.markZone({x:13,y:6},{x:16,y:7});
  const job=app.state.projects.at(-1);
  assert.equal(job.kind,'dig');
  assert.equal(job.cells.length,8);
  advance(app,3);
  assert.equal(job.status,'planned');
  app.chooseWorker(1);app.startProject(job.id);
  assert.equal(app.state.tutorialFlags.assign,true);
  runUntil(app,()=>job.status==='done');
  assert.ok(job.cells.every(c=>app.state.terrain[c.y][c.x]===0));
});
test('rooms require excavation, assigned builders and real materials',()=>{
  const {app}=harness();
  app.setTool('build','generator');
  app.placeRoom({x:13,y:6},{x:16,y:6});
  assert.equal(app.state.projects.length,0);
  const room=digThenBuild(app);
  assert.equal(room.type,'generator');
  assert.equal(app.state.resources.scrap,10);
  assert.equal(app.state.resources.parts,2);
  assert.ok(Number.isFinite(room.air)&&room.air>70&&room.air<=95);
  assert.equal(app.state.tutorialFlags.build,true);
  assert.ok(Number.isFinite(room.integrity));
});
test('generator actually burns fuel, room demand is counted, and staffing changes supply',()=>{
  const {app,systems}=harness();
  const room=digThenBuild(app);
  assert.equal(app.powerData().generation,3); // emergency idle output
  assert.equal(app.powerData().demand,1); // only essential entrance circuit; generator itself burns fuel
  assert.equal(systems.assignment(app.state,1,room.id,{}).ok,true);
  assert.equal(app.powerData().generation,3); // worker must physically arrive
  runUntil(app,()=>app.state.survivors[0].state==='working',700);
  assert.equal(app.powerData().generation,9);
  const fuel=app.state.resources.fuel;
  advance(app,20);
  assert.ok(app.state.resources.fuel<fuel);
  app.state.resources.fuel=0;
  assert.equal(app.powerData().generation,0);
});
test('power consumption is defined in only one canonical model',()=>{
  const {systems}=harness();
  for(const entry of Object.values(systems.ROOMS)){
    assert.ok(Number.isFinite(entry.draw),'Every room must have a numeric draw value');
  }
  assert.equal(systems.ROOMS.bunks.draw,1);
  assert.equal(systems.ROOMS.water.draw,2);
  assert.equal(systems.ROOMS.generator.draw,0); // it generates electricity but consumes fuel
  assert.ok(!/ROOM_TYPES\[[^\]]+\]\.(power|use)/.test(gameSource));
});
test('visitors wait for player admission; empty bunks determine population capacity',()=>{
  const {app,systems}=harness();
  const visitor=systems.createArrival(app.state,'refugee');
  assert.equal(systems.admit(app.state,visitor.id,{}).ok,false);
  app.state.rooms.push({id:101,type:'bunks',x:17,y:6,width:4,integrity:100,air:95});
  assert.ok(systems.capacity(app.state)>=4);
  const res=systems.admit(app.state,visitor.id,{});
  assert.equal(res.ok,true);
  assert.equal(app.state.survivors.length,4);
  assert.equal(app.state.arrivals.length,0);
  assert.equal(app.state.tutorialFlags.recruit,true);
});
test('door chambers cost resources and block physical travel when closed',()=>{
  const {app,systems}=harness();
  const d=systems.door(app.state,10,7,{});
  assert.equal(d.ok,true);
  assert.equal(app.state.doors.length,1);
  assert.equal(app.bfs({x:8,y:7},{x:12,y:7})?.length,4);
  assert.equal(systems.toggleDoor(app.state,d.door.id,{}).ok,true);
  assert.equal(app.bfs({x:8,y:7},{x:12,y:7}),null);
  assert.equal(systems.toggleDoor(app.state,d.door.id,{}).ok,true);
  assert.equal(app.bfs({x:8,y:7},{x:12,y:7})?.length,4);
});
test('cave-in rescue is not automatic: build a rescue order and assign rescuers',()=>{
  const {app,systems}=harness();
  app.markZone({x:13,y:6},{x:16,y:7});
  let j=app.state.projects.at(-1);app.chooseWorker(1);app.startProject(j.id);
  runUntil(app,()=>j.status==='done');
  app.state.terrain[7][13]=2;
  const trapped=systems.trap(app.state,2,13,7,{});
  assert.equal(app.state.survivors[1].trapped,true);
  const order=systems.rescue(app.state,trapped.id,{});
  assert.equal(order.ok,true);
  advance(app,2);
  assert.equal(order.job.status,'planned');
  app.chooseWorker(1);app.startProject(order.job.id);
  runUntil(app,()=>order.job.status==='done');
  assert.equal(app.state.terrain[7][13],0);
  assert.equal(app.state.survivors[1].trapped,false);
  assert.equal(trapped.rescued,true);
});
test('scavenging preserves finite loot, medicine and environmental infections',()=>{
  const {app,element}=harness();
  app.openExpedition();crewInput(element);
  app.launchExpedition();
  runUntil(app,()=>app.state.expedition?.phase==='exploring',200);
  app.exploreRoom(1);
  runUntil(app,()=>app.state.sites[0].rooms[1].searched,350);
  assert.equal(app.state.expedition.loot.meds,2);
  app.exploreRoom(2);
  runUntil(app,()=>app.state.sites[0].rooms[2].searched,350);
  assert.ok(app.state.survivors[1].infection>0);
  app.recallExpedition();
  runUntil(app,()=>!app.state.expedition,250);
  assert.ok(app.state.resources.meds>=4);
  assert.equal(app.state.sites[0].rooms[1].searched,true);
});
test('exploring hostile rooms offers fight and retreat rather than hidden instant loot',()=>{
  const {app,element}=harness();
  app.openExpedition();
  element('expeditionContent').handlers.click({target:{closest(selector){
    return selector==='[data-site]'?{dataset:{site:'station'}}:null;
  }}});
  crewInput(element);
  app.launchExpedition();
  runUntil(app,()=>app.state.expedition?.phase==='exploring',200);
  app.exploreRoom(2);
  runUntil(app,()=>app.state.expedition?.action?.phase==='combat',300);
  assert.equal(app.state.sites.find(s=>s.id==='station').rooms[2].searched,false);
  app.fightExpedition();
  runUntil(app,()=>app.state.sites.find(s=>s.id==='station').rooms[2].searched,600);
  assert.ok(app.state.expedition.loot.fuel>=3);
});
test('rescuing a stranded person sends them to the admission queue on return',()=>{
  const {app,element}=harness();
  app.openExpedition();
  element('expeditionContent').handlers.click({target:{closest(selector){
    return selector==='[data-site]'?{dataset:{site:'relay'}}:null;
  }}});
  crewInput(element);
  app.launchExpedition();
  runUntil(app,()=>app.state.expedition?.phase==='exploring',200);
  app.exploreRoom(3);
  runUntil(app,()=>app.state.sites.find(s=>s.id==='relay').rooms[3].searched,300);
  assert.equal(app.state.expedition.rescued,1);
  app.recallExpedition();
  runUntil(app,()=>!app.state.expedition,200);
  assert.ok(app.state.arrivals.some(a=>a.candidate.source==='rescue'));
});
test('a scout discovers persistent new locations without granting instant loot',()=>{
  const {app}=harness();
  const before=app.state.resources.food;
  app.startSurvey();
  assert.ok(app.state.discovery);
  assert.ok(app.state.resources.food<before);
  runUntil(app,()=>!app.state.discovery,600);
  assert.equal(app.state.discoveredSites.length,1);
  assert.equal(app.state.sites.length,5);
  assert.ok(app.state.sites[4].rooms.every(r=>!r.searched));
});
test('incident response, raid combat and door lockdown are simulated',()=>{
  const {app,systems}=harness();
  const room=digThenBuild(app);
  const incident=systems.triggerFire(app.state,{},'fire');
  assert.ok(incident);
  assert.equal(incident.roomId,room.id);
  assert.equal(systems.assignment(app.state,2,room.id,{}).ok,true);
  runUntil(app,()=>app.state.incidents.length===0,1600);
  assert.equal(app.state.incidents.length,0);
  const door=systems.door(app.state,10,7,{});
  assert.equal(door.ok,true);
  systems.toggleDoor(app.state,door.door.id,{});
  assert.equal(systems.createRaid(app.state,{}),true);
  advance(app,8);
  assert.equal(app.state.threat.phase,'blocked');
  assert.ok(app.state.threat.x>=8 && app.state.threat.x<10,'Raiders must stop before the sealed door');
  assert.ok(door.door.hp<100);
});
test('fair negotiation can end a strike and medical bay can revive the injured',()=>{
  const {app,systems}=harness();
  const r=app.state.survivors[0];
  r.striking=true;r.state='strike';r.morale=4;r.loyalty=7;
  const negotiated=systems.negotiate(app.state,r.id,{});
  assert.equal(negotiated.ok,true);
  assert.equal(r.striking,false);
  assert.ok(r.morale>25);
  app.state.rooms.push({id:102,type:'medbay',x:17,y:6,width:4,integrity:100,air:95});
  app.state.rooms.push({id:103,type:'generator',x:22,y:6,width:4,integrity:100,air:95});
  app.state.resources.meds=5;
  r.dead=true;r.health=0;
  const revived=systems.revive(app.state,r.id,{});
  assert.equal(revived.ok,true);
  assert.equal(r.dead,false);
});
test('saving and migrating v1 progress do not erase existing worlds',()=>{
  const {app,boot,stored}=harness();
  app.markZone({x:13,y:6},{x:13,y:7});
  app.saveGame();
  const saved=JSON.parse(stored.values().next().value);
  saved.version=1;
  saved.survivors.forEach(r=>{delete r.skills;delete r.shift;});
  stored.set(stored.keys().next().value,JSON.stringify(saved));
  const recovered=boot();
  assert.equal(recovered.state.version,2);
  assert.equal(recovered.state.projects.length,1);
  assert.equal(recovered.state.survivors.length,3);
  assert.ok(recovered.state.survivors[0].skills);
});
test('render surfaces and permanent UI bindings do not reference missing elements',()=>{
  const {app}=harness();
  assert.doesNotThrow(()=>app.drawScene(1000));
  const permanentIDs=[...new Set([...gameSource.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]))];
  const dynamic=new Set(['expeditionScene','travelProgress','expeditionMessage','familyParentA','familyParentB']);
  const missing=permanentIDs.filter(id=>!dynamic.has(id)&&!htmlSource.includes('id="'+id+'"'));
  assert.deepEqual(missing,[]);
});


test('constructed rooms can be upgraded by real builders and improve their output',()=>{
  const {app}=harness();
  const gen=digThenBuild(app);
  const before=app.powerData().generation;
  app.state.resources.scrap+=25;app.state.resources.parts+=5;
  app.requestUpgrade(gen.id);
  const order=app.state.projects.at(-1);
  assert.equal(order.kind,'upgrade');
  assert.equal(order.status,'planned');
  app.chooseWorker(1);app.startProject(order.id);
  runUntil(app,()=>order.status==='done',800);
  assert.equal(gen.level,2);
  assert.ok(app.powerData().generation>before);
  assert.equal(gen.integrity,100);
});
test('powered residential quarters enable voluntary family growth and dependent maturation',()=>{
  const {app,systems}=harness();
  app.state.rooms.push({id:101,type:'generator',x:13,y:6,width:4,integrity:100,level:1,air:95});
  app.state.rooms.push({id:102,type:'bunks',x:18,y:6,width:4,integrity:100,level:1,air:95});
  app.state.nextIncident=Infinity;app.state.nextRaid=Infinity;app.state.nextArrival=Infinity;
  const result=systems.startFamily(app.state,1,2,{});
  assert.equal(result.ok,true);
  assert.equal(app.state.familyPlans.length,1);
  runUntil(app,()=>app.state.familyPlans.length===0,2700);
  const baby=app.state.survivors.find(r=>r.child);
  assert.ok(baby,'family planning should create a dependent');
  assert.equal(systems.assignment(app.state,baby.id,101,{}).ok,false);
  assert.equal(systems.defend(app.state,baby.id,{}).ok,false);
  assert.doesNotThrow(()=>app.drawScene(800));
  runUntil(app,()=>!baby.child,4800);
  assert.equal(baby.age,18);
  assert.equal(baby.role,'Resident');
});
test('a closed blast door can starve an isolated sector of breathable air',()=>{
  const {app,systems}=harness();
  const gen=digThenBuild(app);
  const barrier=systems.door(app.state,10,7,{});
  assert.equal(barrier.ok,true);
  systems.toggleDoor(app.state,barrier.door.id,{});
  const air=gen.air;
  advance(app,22);
  assert.ok(gen.air<air,'isolation should actually reduce room air');
  assert.equal(app.bfs({x:8,y:7},{x:15,y:7}),null);
});
test('death and complete settlement loss render without mutating canvas from needs code',()=>{
  const {app}=harness();
  app.state.survivors.forEach(r=>{r.health=0;});
  assert.doesNotThrow(()=>app.tick(.05));
  assert.ok(app.state.survivors.every(r=>r.dead));
  assert.ok(app.state.loss);
  assert.doesNotThrow(()=>app.drawScene(1200));
  assert.doesNotThrow(()=>app.tick(.05));
});
test('rush production has explicit risk and triggers either rewards or a contained emergency',()=>{
  const {app,systems}=harness();
  app.state.rooms.push({id:201,type:'generator',x:13,y:6,width:4,integrity:100,level:1,air:95});
  app.state.rooms.push({id:202,type:'garden',x:18,y:6,width:4,integrity:100,level:1,air:95});
  const gardener=app.state.survivors[0];
  gardener.jobRoom=202;gardener.state='working';gardener.x=19;gardener.y=7;
  const attempted=systems.rush(app.state,202,{});
  assert.equal(attempted.ok,true);
  assert.ok(typeof attempted.success==='boolean');
  assert.ok(app.state.rooms[1].rushAttempts>0);
  assert.ok(attempted.success?app.state.resources.food>12:app.state.incidents.length>0);
});

test('trapped residents can conserve oxygen and self-excavate when strong enough',()=>{
  const {app,systems}=harness();
  const strong=app.state.survivors[0];
  app.state.terrain[7][13]=2;
  const trapped=systems.trap(app.state,strong.id,13,7,{});
  assert.equal(systems.trappedOrder(app.state,trapped.id,'conserve',{}).ok,true);
  advance(app,14);
  assert.ok(trapped.air>98);
  assert.equal(systems.trappedOrder(app.state,trapped.id,'clear',{}).ok,true);
  runUntil(app,()=>trapped.rescued,1600);
  assert.equal(strong.trapped,false);
  assert.equal(app.state.terrain[7][13],0);
});
test('rationing and overtime policies are controllable and reflected in resource rates',()=>{
  const {app,systems}=harness();
  assert.equal(systems.setPolicy(app.state,'rationing',true,{}).ok,true);
  advance(app,12);
  const rationed=app.state.resourceRate.food;
  assert.equal(systems.setPolicy(app.state,'rationing',false,{}).ok,true);
  advance(app,12);
  assert.ok(app.state.resourceRate.food<rationed);
  assert.equal(systems.setPolicy(app.state,'overtime',true,{}).ok,true);
  assert.equal(app.state.policy.overtime,true);
});
