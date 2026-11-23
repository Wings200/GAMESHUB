import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../games/vault-directive/core.js',import.meta.url),'utf8');
function setup(){
 const context={window:{},Math,Date};
 vm.runInNewContext(source,context);
 const D=context.window.VDCore,s=D.create('ROUTINE CHECK');
 s.grid[5]={kind:'room',room:20,support:'timber'};
 s.grid[6]={kind:'room',room:20,support:null};
 s.grid[7]={kind:'room',room:21,support:'timber'};
 s.grid[8]={kind:'room',room:21,support:null};
 const beds={id:20,type:'quarters',cells:[5,6],workers:[],progress:0,ready:false,cycles:0,health:100};
 const reactor={id:21,type:'power',cells:[7,8],workers:[],progress:0,ready:false,cycles:0,health:100};
 s.rooms=[beds,reactor];s.nextId=22;
 const p=D.actor('Taylor Reeves',s);p.sick=false;p.hunger=90;p.thirst=90;p.energy=90;
 s.people.push(p);
 assert.ok(D.assign(s,p.id,reactor.id).ok);
 return {D,s,p,beds,reactor};
}
const tick=(D,s,n)=>{for(let i=0;i<n;i++)D.simulate(s,1);};
test('day-shift worker appears exclusively at work during the day and exclusively in bed at night',()=>{
 const {D,s,p,beds,reactor}=setup();
 s.clock=12*60;
 assert.equal(D.routine(s,p).phase,'working');
 assert.equal(D.workersOnDuty(s,reactor).length,1);
 assert.equal(D.residentsIn(s,reactor).length,1);
 assert.equal(D.residentsIn(s,beds).length,0);
 s.clock=23*60;
 assert.equal(D.routine(s,p).phase,'sleep');
 assert.equal(D.workersOnDuty(s,reactor).length,0);
 assert.equal(D.residentsIn(s,beds).length,1);
 assert.equal(D.residentsIn(s,reactor).length,0);
 const before=reactor.progress;
 tick(D,s,6);
 assert.equal(reactor.progress,before,'production must stop during sleep');
});
test('night shift worker works at night and sleeps during daylight',()=>{
 const {D,s,p,beds,reactor}=setup();
 assert.ok(D.shift(s,p.id).ok);
 s.clock=12*60;
 assert.equal(D.routine(s,p).phase,'sleep');
 assert.equal(D.residentsIn(s,beds).length,1);
 s.clock=23*60;
 assert.equal(D.routine(s,p).phase,'working');
 assert.equal(D.workersOnDuty(s,reactor).length,1);
 const before=reactor.progress;
 tick(D,s,4);
 assert.ok(reactor.progress>before,'night worker must advance production');
});
test('sick residents stop working, armed residents wake to defend, and no resident occupies multiple rooms',()=>{
 const {D,s,p,beds,reactor}=setup();
 s.clock=12*60;p.sick=true;
 assert.equal(D.routine(s,p).phase,'sick');
 assert.equal(D.workersOnDuty(s,reactor).length,0);
 assert.equal(D.residentsIn(s,beds).length,1);
 p.sick=false;p.weapon=1;
 s.clock=23*60;s.threat={name:'SURFACE RAIDERS',force:6,created:s.elapsed};
 assert.equal(D.routine(s,p).phase,'guarding','armed guard must respond even if asleep');
 assert.equal(D.residentsIn(s,beds).length,0);
 assert.equal(D.workersOnDuty(s,reactor).length,0,'emergency takes priority over work');
 const placed=s.rooms.flatMap(r=>D.residentsIn(s,r).map(x=>x.person.id));
 assert.equal(placed.length,new Set(placed).size,'resident can never appear in two rooms');
});
test('hungry worker takes food break when food exists but avoids starvation deadlock',()=>{
 const {D,s,p,reactor}=setup();
 s.clock=12*60;p.hunger=10;s.res.food=3;
 assert.equal(D.routine(s,p).phase,'meal');
 assert.equal(D.workersOnDuty(s,reactor).length,0);
 s.res.food=0;
 assert.equal(D.routine(s,p).phase,'working','when no food exists, essential production can continue');
});
test('expedition visibly progresses outbound, searching, returning and records actual materials',()=>{
 const {D,s}=setup();
 assert.ok(D.start(s,'scavenge',null,'grove').ok);
 assert.equal(s.task.phase,'outbound');
 tick(D,s,4);assert.equal(s.task.phase,'searching');
 tick(D,s,3);assert.equal(s.task.phase,'returning');
 tick(D,s,3);assert.equal(s.task,null);
 assert.equal(s.scavenges,1);
 assert.equal(s.lastExpedition.siteId,'grove');
 assert.ok(s.lastExpedition.loot.wood>0);
 assert.equal(s.expeditionHistory.length,1);
 assert.ok(s.log.some(x=>x.message.includes('Reached Deadwood Grove')));
 assert.ok(s.log.some(x=>x.message.includes('Returning to the vault')));
});
test('collecting from full storage never consumes a ready production cycle',()=>{
 const {D,s,reactor}=setup();
 s.res.power=D.caps(s).power;
 reactor.ready=true;reactor.progress=100;
 const result=D.collect(s,reactor.id);
 assert.equal(result.ok,false);
 assert.equal(reactor.ready,true);
 assert.equal(reactor.progress,100);
 assert.equal(s.res.power,D.caps(s).power);
});
test('resident paths follow open corridors, and a collapsed passage isolates the workplace',()=>{
 const {D,s,p,reactor}=setup();
 s.clock=12*60;
 const route=Array.from(D.path(s,D.START,reactor.cells[0]));
 assert.deepEqual(route,[4,5,6,7], 'no diagonal travel through dirt');
 assert.equal(D.workersOnDuty(s,reactor).length,1);
 s.grid[6].kind='rubble';
 assert.equal(D.path(s,D.START,reactor.cells[0]),null);
 assert.equal(D.routine(s,p).phase,'stranded');
 assert.equal(D.workersOnDuty(s,reactor).length,0,'power production must stop when the worksite is isolated');
 assert.equal(D.assign(s,p.id,reactor.id).ok,false,'cannot assign to a cut-off worksite');
});

test('pause, resume and resource consumption leave state coherent',()=>{
 const {D,s,p}=setup();
 s.res.food=10;s.res.water=10;
 s.clock=12*60;
 const before=s.elapsed;
 s.speed=0;tick(D,s,15);
 assert.equal(s.elapsed,before);
 s.speed=1;tick(D,s,15);
 assert.ok(s.elapsed>before);
 assert.ok(s.res.food>=0&&s.res.water>=0);
 assert.ok(p.health>0);
});

test('multi-day simulation stress: inventories, health, logs and scheduled staffing remain bounded',()=>{
 const {D,s,p,beds,reactor}=setup();
 s.res.food=30;s.res.water=35;s.res.power=30;
 p.weapon=1;p.armor=1;p.sick=false;
 const another=D.actor('Alex Vale',s);another.sick=false;
 s.people.push(another);assert.ok(D.assign(s,another.id,reactor.id).ok);
 const initial=s.day;
 for(let i=0;i<720;i++){
  D.simulate(s,1);
  if(reactor.ready)D.collect(s,reactor.id);
  for(const resource of Object.values(s.res))assert.ok(Number.isFinite(resource)&&resource>=0);
  for(const resident of s.people){
   for(const value of [resident.health,resident.hunger,resident.thirst,resident.energy,resident.mood,resident.loyalty])
    assert.ok(Number.isFinite(value)&&value>=0&&value<=100);
   const placed=s.rooms.flatMap(r=>D.residentsIn(s,r).filter(x=>x.person.id===resident.id));
   assert.ok(placed.length<=1,'one resident cannot physically occupy two facilities');
  }
  assert.ok(s.visitors.length<=3);
  assert.ok(s.log.length<=90);
  assert.ok(s.clock>=0&&s.clock<1440);
 }
 assert.ok(s.day>initial,'day/night cycle continues across multiple days');
});
