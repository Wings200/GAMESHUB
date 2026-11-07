import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSettlementBuildState,safeSettlementBuildSnapshot,
  calculateSettlementStats,HAVEN_JUNK_SITES} from './settlement-building.mjs';
import {assignSettlerJob,reconcileSettlerJobs,staffedSettlementJobs,
  settlerWorkLocation,nextScavengingSite,advanceSettlerJobs,
  withdrawSettlerProvisions} from './settler-jobs.mjs';
import {createNpcRoutine,stepNpcRoutine} from './npc-routines.mjs';

const structure=(id,type,x=-45,z=-22)=>({id,type,x,z,rotation:0});
const progress=(state,seconds,ids,options={})=>{
  let output;
  for(let i=0;i<seconds;i+=4)
    output=advanceSettlerJobs(state,Math.min(4,seconds-i),
      {workingIds:ids,...options});
  return output;
};

test('only real residents can be assigned, and one physical station has one worker',()=>{
  const state=initialSettlementBuildState();state.population=3;
  state.structures=[structure(1,'garden'),structure(2,'waterpump',-40),
    structure(3,'guardpost',-35)];
  assert.equal(assignSettlerJob(state,4,'farmer',1).ok,false);
  assert.equal(assignSettlerJob(state,1,'farmer',2).ok,false);
  assert.equal(assignSettlerJob(state,1,'farmer',1).ok,true);
  assert.equal(assignSettlerJob(state,2,'water',1).ok,false);
  assert.equal(assignSettlerJob(state,2,'farmer',1).ok,false);
  assert.equal(assignSettlerJob(state,2,'water',2).ok,true);
  assert.equal(assignSettlerJob(state,3,'guard',3).ok,true);
  assert.deepEqual(staffedSettlementJobs(state),{
    farmers:1,waterWorkers:1,guards:1,scavengers:0,foodCapacity:3,
    waterCapacity:3,guardDefense:2,assigned:3});
  const stats=calculateSettlementStats(state);
  assert.equal(stats.staffedFood,3);assert.equal(stats.staffedWater,3);
  assert.equal(stats.defense,5,'staffed post improves actual defense');
});

test('unattended stations never mint supplies, while on-duty workers fill finite stock',()=>{
  const state=initialSettlementBuildState();state.population=2;
  state.structures=[structure(1,'garden'),structure(2,'waterpump',-41)];
  assignSettlerJob(state,1,'farmer',1);
  assignSettlerJob(state,2,'water',2);
  progress(state,64,[]);
  assert.deepEqual(state.provisions,{food:0,water:0});
  state.provisionConsumerClock=0;
  progress(state,16,['1','2']);
  assert.deepEqual(state.provisions,{food:1,water:1});
  progress(state,64,['1','2']);
  assert.deepEqual(state.provisions,{food:3,water:3},
    'workers produce supplies while a two-person settlement consumes them');
  state.provisions.food=240;
  progress(state,16,['1']);
  assert.ok(state.provisions.food<=240);
});

test('powered water purifiers refuse output when draw exceeds available power',()=>{
  const state=initialSettlementBuildState();state.population=1;
  state.structures=[structure(1,'purifier')];
  assignSettlerJob(state,1,'water',1);
  progress(state,64,[1]);
  assert.equal(state.provisions.water,0);
  state.structures.push(structure(2,'generator',-40));
  progress(state,16,[1]);
  assert.equal(state.provisions.water,1);
});

test('scavenging consumes physical non-fixture debris once, adding exact real components',()=>{
  const state=initialSettlementBuildState();state.population=1;
  assignSettlerJob(state,1,'scavenger');
  const eligible=HAVEN_JUNK_SITES.filter(s=>!s.id.startsWith('original-'));
  const visible=eligible.map(s=>s.id);
  assert.equal(nextScavengingSite(state,visible).id,eligible[0].id);
  const target=settlerWorkLocation(state,state.workerJobs[1],visible);
  assert.equal(target.siteId,eligible[0].id);
  const output=progress(state,16,['1'],{availableSiteIds:visible});
  assert.deepEqual(output.scavenged,[eligible[0].id]);
  assert.deepEqual(state.workshopMaterials,eligible[0].materials);
  assert.deepEqual(state.scrappedJunk,[eligible[0].id]);
  progress(state,16,['1'],{availableSiteIds:[eligible[0].id]});
  assert.deepEqual(state.workshopMaterials,eligible[0].materials,
    'an already removed object can never be harvested again');
  assert.equal(nextScavengingSite(state,[eligible[0].id]),null);
  assert.ok(nextScavengingSite(state).id!==eligible[0].id);
});

test('consumption, hunger and withdrawal use actual finite provision balances',()=>{
  const state=initialSettlementBuildState();state.population=4;
  state.provisions={food:2,water:3};
  progress(state,80,[]);
  assert.deepEqual(state.provisions,{food:0,water:1});
  assert.equal(state.provisionShortfall,2);
  assert.equal(withdrawSettlerProvisions(state,'water',2).ok,false);
  assert.deepEqual(withdrawSettlerProvisions(state,'water',1),{
    ok:true,itemId:'supply:clean-water',quantity:1});
  assert.equal(state.provisions.water,0);
  assert.equal(withdrawSettlerProvisions(state,'wood',1).ok,false);
});

test('old saves migrate unchanged and new worker jobs, materials and stocks sanitize',()=>{
  const state=initialSettlementBuildState();state.population=3;
  state.structures=[structure(1,'garden'),structure(2,'waterpump',-41),
    structure(3,'guardpost',-37)];
  assignSettlerJob(state,1,'farmer',1);
  assignSettlerJob(state,2,'water',2);
  assignSettlerJob(state,3,'scavenger');
  state.workerProgress['1']=8;state.provisions={food:13,water:4};
  const restored=safeSettlementBuildSnapshot(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.version,7);
  assert.deepEqual(restored.workerJobs,state.workerJobs);
  assert.deepEqual(restored.provisions,{food:13,water:4});
  assert.equal(restored.workerProgress['1'],8);
  const old=safeSettlementBuildSnapshot({version:6,population:2,
    structures:state.structures});
  assert.deepEqual(old.workerJobs,{});
  assert.deepEqual(old.provisions,{food:0,water:0});
  restored.structures=restored.structures.filter(s=>s.id!==1);
  assert.equal(reconcileSettlerJobs(restored),1);
  assert.equal(restored.workerJobs['1'],undefined);
  const corrupt=safeSettlementBuildSnapshot({...state,population:3,
    workerJobs:{'1':{job:'guard',structureId:1},'2':{job:'water',structureId:2},
      '3':{job:'scavenger'},'4':{job:'scavenger'}},
    provisions:{food:999999,water:-20}});
  assert.equal(corrupt.workerJobs['1'],undefined);
  assert.deepEqual(corrupt.provisions,{food:240,water:0});
});

test('assigned NPCs can physically walk beyond the old home-radius leash',()=>{
  const home={x:-47,z:-16,yaw:0},target={x:-34,z:-20};
  let npc=createNpcRoutine('settler-1',home);
  for(let i=0;i<460;i++){
    npc=stepNpcRoutine(npc,.05,{home,jobTarget:target}).state;
  }
  assert.ok(Math.hypot(npc.x-target.x,npc.z-target.z)<.75);
  const restored=createNpcRoutine('settler-1',home,npc,true);
  assert.ok(Math.hypot(restored.x-target.x,restored.z-target.z)<.75);
  const unassigned=createNpcRoutine('settler-1',home,npc,false);
  assert.deepEqual({x:unassigned.x,z:unassigned.z},{x:home.x,z:home.z});
});
