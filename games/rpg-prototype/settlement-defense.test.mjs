import test from 'node:test';
import assert from 'node:assert/strict';
import {createBackpack,addItem,countItem} from './inventory.mjs';
import {initialSettlementBuildState,safeSettlementBuildSnapshot,
  calculateSettlementStats} from './settlement-building.mjs';
import {craftWithWorkshop} from './workshop-junk.mjs';
import {RAID_SPAWNS,beginSettlementRaid,raidLivingEnemies,
  damageSettlementRaider,damageSettlementStructure,
  settlementStructureCondition,settlementStructureOperational,
  settlementRepairCost,repairSettlementStructure,raidTargetStructure,
  moveRaidRaider,stepRaidClock,RAID_REST_SECONDS,RAID_MAX_SECONDS}
  from './settlement-defense.mjs';

function haven(){
  const state=initialSettlementBuildState();
  state.structures=[
    {id:1,type:'generator',x:-42,z:-21,rotation:0},
    {id:2,type:'turret',x:-44,z:-25,rotation:0},
    {id:3,type:'bed',x:-36,z:-19,rotation:0},
    {id:4,type:'garden',x:-33,z:-27,rotation:0}
  ];
  state.nextId=5;
  return state;
}

test('a raid is a controlled three-body wave and never duplicates itself',()=>{
  const state=haven();
  const begun=beginSettlementRaid(state);
  assert.equal(begun.ok,true);
  assert.equal(begun.wave,1);
  assert.equal(raidLivingEnemies(state).length,3);
  for(let i=0;i<3;i++){
    assert.equal(state.raid.raiders[i].id,'haven-'+(i+1));
    assert.equal(state.raid.raiders[i].x,RAID_SPAWNS[i].x);
  }
  assert.equal(beginSettlementRaid(state).ok,false);
});

test('raid requires real buildings and cannot be spammed through cooldown',()=>{
  const state=initialSettlementBuildState();
  assert.equal(beginSettlementRaid(state).ok,false);
  state.structures.push({id:1,type:'bed',x:-38,z:-24,rotation:0});
  beginSettlementRaid(state);
  state.raid.raiders.forEach(r=>{r.health=0;});
  const end=stepRaidClock(state,.01);
  assert.equal(end.ended,true);
  assert.equal(end.victory,true);
  assert.equal(beginSettlementRaid(state).ok,false);
  stepRaidClock(state,RAID_REST_SECONDS);
  assert.equal(state.raid.cooldown,RAID_REST_SECONDS-4);
  for(let n=0;n<22;n++)stepRaidClock(state,4);
  assert.equal(beginSettlementRaid(state).wave,2);
});

test('raider damage applies to real health and defeated bodies no longer targetable',()=>{
  const state=haven();beginSettlementRaid(state);
  assert.equal(damageSettlementRaider(state,'haven-2',25).after,60);
  const dead=damageSettlementRaider(state,'haven-2',1000);
  assert.equal(dead.killed,true);
  assert.equal(dead.after,0);
  assert.equal(raidLivingEnemies(state).length,2);
  assert.equal(damageSettlementRaider(state,'haven-2',1).ok,false);
  assert.equal(damageSettlementRaider(state,'wrong-id',1).ok,false);
});

test('disabled buildings stop contributing production, beds and powered defense',()=>{
  const state=haven();
  const original=calculateSettlementStats(state);
  assert.equal(original.beds,1);
  assert.ok(original.power>=8);
  assert.ok(original.defense>=8);
  assert.equal(damageSettlementStructure(state,3,100).disabled,true);
  assert.equal(damageSettlementStructure(state,1,100).disabled,true);
  assert.equal(damageSettlementStructure(state,2,100).disabled,true);
  const damaged=calculateSettlementStats(state);
  assert.equal(damaged.beds,0);
  assert.equal(damaged.power,0);
  assert.equal(damaged.defense,0);
  assert.equal(settlementStructureOperational(state,2),false);
});

test('repair costs scale with damage and spend real inventory components',()=>{
  const state=haven(),pack=createBackpack();
  damageSettlementStructure(state,1,50);
  const cost=settlementRepairCost(state,1);
  assert.ok(Object.keys(cost).length>=2);
  for(const [id,qty] of Object.entries(cost))addItem(pack,id,qty);
  const restored=repairSettlementStructure(state,pack,1);
  assert.equal(restored.ok,true);
  assert.equal(restored.before,50);
  assert.equal(settlementStructureCondition(state,1),100);
  assert.deepEqual(settlementRepairCost(state,1),{});
  for(const id of Object.keys(cost))assert.equal(countItem(pack,id),0);
});

test('failed repairs are atomic and workshop materials can fund actual repairs',()=>{
  const state=haven(),pack=createBackpack();
  damageSettlementStructure(state,4,28);
  const cost=settlementRepairCost(state,4);
  const failed=repairSettlementStructure(state,pack,4);
  assert.equal(failed.ok,false);
  assert.equal(settlementStructureCondition(state,4),72);
  for(const [id,qty] of Object.entries(cost))state.workshopMaterials[id]=qty;
  const repaired=craftWithWorkshop(pack,state,cost,(newPack,newState)=>
    repairSettlementStructure(newState,newPack,4));
  assert.equal(repaired.ok,true);
  assert.equal(settlementStructureCondition(state,4),100);
  for(const id of Object.keys(cost))assert.equal(state.workshopMaterials[id]||0,0);
});

test('live wave position, health and condition survive strict save sanitization',()=>{
  const state=haven();beginSettlementRaid(state);
  damageSettlementRaider(state,'haven-1',13);
  damageSettlementStructure(state,1,44);
  state.raid.raiders[0].x=-26.25;
  state.raid.raiders[0].shotClock=2.75;
  const restored=safeSettlementBuildSnapshot(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.version,8);
  assert.equal(restored.raid.active,true);
  assert.equal(restored.raid.raiders.length,3);
  assert.equal(restored.raid.raiders[0].health,57);
  assert.equal(restored.raid.raiders[0].x,-26.25);
  assert.equal(restored.raid.raiders[0].shotClock,2.75);
  assert.equal(restored.structureCondition['1'],56);
});

test('invalid raid coordinates and forged building damage are rejected on load',()=>{
  const state=haven();beginSettlementRaid(state);
  state.raid.raiders[0].x=999;
  state.structureCondition['999']=0;
  state.structureCondition['3']=-999;
  const restored=safeSettlementBuildSnapshot(state);
  assert.equal(restored.raid.active,false);
  assert.equal(restored.structureCondition['999'],undefined);
  assert.equal(restored.structureCondition['3'],undefined);
});

test('raiders navigate toward in-range structures but cannot phase through obstacles',()=>{
  const state=haven();beginSettlementRaid(state);
  const raider=state.raid.raiders[0];
  const target=raidTargetStructure(state,raider);
  assert.ok(target);
  const start={x:raider.x,z:raider.z};
  assert.equal(moveRaidRaider(raider,.05,target,()=>false).moved,false);
  assert.deepEqual({x:raider.x,z:raider.z},start);
  assert.equal(moveRaidRaider(raider,.05,target,()=>true).moved,true);
  assert.notDeepEqual({x:raider.x,z:raider.z},start);
});

test('a prolonged battle times out, ending damage while starting rest period',()=>{
  const state=haven();beginSettlementRaid(state);
  for(let elapsed=0;elapsed<RAID_MAX_SECONDS;elapsed+=4)stepRaidClock(state,4);
  assert.equal(state.raid.active,false);
  assert.equal(state.raid.cooldown,RAID_REST_SECONDS);
  assert.equal(raidLivingEnemies(state).length,0);
});
