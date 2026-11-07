import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBackpack,addItem,countItem} from './inventory.mjs';
import {HAVEN_BUILD_AREA,SETTLEMENT_BLUEPRINTS,SETTLEMENT_BY_ID,
  initialSettlementBuildState,safeSettlementBuildSnapshot,
  snappedBuildPosition,buildWorldBoxes,validateBuildPlacement,
  missingBuildingMaterials,placeSettlementStructure,storeSettlementStructure,
  undoLastSettlementStructure}
  from './settlement-building.mjs';

const placement=(type,x=-40,z=-26,rotation=0)=>({type,x,z,rotation});
const fundedPack=()=>{
  const pack=createBackpack();
  for(const plan of SETTLEMENT_BLUEPRINTS)for(const [id,n] of Object.entries(plan.cost))
    addItem(pack,id,n*3);
  return pack;
};

test('Haven has seven authored blueprints with nonzero genuine component costs',()=>{
  assert.equal(SETTLEMENT_BLUEPRINTS.length,7);
  assert.ok(HAVEN_BUILD_AREA.minX< -30&&HAVEN_BUILD_AREA.maxZ> -20);
  for(const plan of SETTLEMENT_BLUEPRINTS){
    assert.ok(plan.parts.length>0&&plan.width>0&&plan.depth>0);
    assert.ok(Object.values(plan.cost).every(n=>Number.isInteger(n)&&n>0));
    assert.ok(Object.keys(plan.cost).every(key=>key.startsWith('material:')));
  }
});

test('free placement is precise; grid snap is opt-in and rotation turns colliders',()=>{
  assert.deepEqual(snappedBuildPosition(-39.63,-25.26,true),{x:-39.5,z:-25.5});
  assert.deepEqual(snappedBuildPosition(-39.63,-25.26,false),{x:-39.63,z:-25.26});
  const across=buildWorldBoxes(placement('wall',-40,-26,0),{onlySolid:true})[0];
  const turned=buildWorldBoxes(placement('wall',-40,-26,1),{onlySolid:true})[0];
  assert.ok(across.maxX-across.minX>across.maxZ-across.minZ);
  assert.ok(turned.maxZ-turned.minZ>turned.maxX-turned.minX);
});

test('construction spends salvage only after a valid placement',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState(),plan=SETTLEMENT_BY_ID.wall;
  const before=Object.fromEntries(Object.keys(plan.cost).map(id=>[id,countItem(pack,id)]));
  const placed=placeSettlementStructure(state,pack,placement('wall'));
  assert.equal(placed.ok,true);
  assert.equal(state.structures.length,1);
  for(const [id,cost] of Object.entries(plan.cost))
    assert.equal(countItem(pack,id),before[id]-cost);
  const blocked=placeSettlementStructure(state,pack,placement('wall'));
  assert.equal(blocked.ok,false);
  assert.equal(state.structures.length,1);
  for(const [id,cost] of Object.entries(plan.cost))
    assert.equal(countItem(pack,id),before[id]-cost);
});

test('missing materials, out-of-area and fixed geometry cannot be bypassed',()=>{
  const state=initialSettlementBuildState();
  const empty=createBackpack();
  assert.ok(missingBuildingMaterials(empty,'bed').length>0);
  assert.equal(placeSettlementStructure(state,empty,placement('bed')).ok,false);
  assert.equal(state.structures.length,0);
  assert.match(validateBuildPlacement(state,placement('wall',60,60)).reason,/OUTSIDE/);
  const fixed={minX:-41,maxX:-39,minZ:-27,maxZ:-25,bottom:0,top:2.7};
  assert.match(validateBuildPlacement(state,placement('wall'),[fixed]).reason,/OVERLAP/);
  assert.match(validateBuildPlacement(state,placement('wall'),[],{x:-40,z:-26}).reason,/MOVE OUT/);
});

test('foundations can carry walls, but duplicate floors and unsupported roofs fail',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  assert.equal(placeSettlementStructure(state,pack,placement('roof')).ok,false);
  assert.equal(placeSettlementStructure(state,pack,placement('foundation')).ok,true);
  assert.match(validateBuildPlacement(state,placement('foundation')).reason,/FOUNDATION/);
  assert.equal(placeSettlementStructure(state,pack,placement('wall')).ok,true);
  assert.equal(placeSettlementStructure(state,pack,placement('roof')).ok,true);
  assert.equal(state.structures.length,3);
});

test('doorway remains physically passable between its two posts',()=>{
  const boxes=buildWorldBoxes(placement('doorway'),{onlySolid:true});
  assert.equal(boxes.length,3);
  const center=boxes.filter(b=>b.minX< -40&&b.maxX> -40&&b.bottom<1.7);
  assert.equal(center.length,0,'lower door center must not have an invisible solid wall');
});

test('store last returns the full cost and saves restore only validated structures',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  const first=placement('bed',-43,-26),plan=SETTLEMENT_BY_ID.bed;
  const counts=Object.fromEntries(Object.keys(plan.cost).map(id=>[id,countItem(pack,id)]));
  assert.equal(placeSettlementStructure(state,pack,first).ok,true);
  const snapshot=JSON.parse(JSON.stringify(state));
  const restored=safeSettlementBuildSnapshot(snapshot);
  assert.deepEqual(restored.structures,state.structures);
  const undo=undoLastSettlementStructure(state,pack);
  assert.equal(undo.ok,true);assert.equal(state.structures.length,0);
  for(const id of Object.keys(plan.cost))assert.equal(countItem(pack,id),counts[id]);
  snapshot.structures.push({id:999,type:'unknown',x:0,z:0,rotation:0});
  snapshot.structures.push({id:1000,type:'wall',x:Infinity,z:0,rotation:0});
  assert.equal(safeSettlementBuildSnapshot(snapshot).structures.length,1);
});

test('store a selected earlier piece without removing later structures',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  const first=placeSettlementStructure(state,pack,placement('bed',-43,-26));
  const second=placeSettlementStructure(state,pack,placement('barricade',-34,-27));
  assert.ok(first.ok&&second.ok);
  const result=storeSettlementStructure(state,pack,first.structure.id);
  assert.equal(result.ok,true);
  assert.deepEqual(state.structures.map(s=>s.id),[second.structure.id]);
});

test('storing a supporting wall cannot strand a floating roof',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  const wall=placeSettlementStructure(state,pack,placement('wall'));
  assert.equal(wall.ok,true);
  assert.equal(placeSettlementStructure(state,pack,placement('roof')).ok,true);
  assert.match(storeSettlementStructure(state,pack,wall.structure.id).reason,/ROOF/);
  assert.equal(state.structures.length,2);
});

test('field build mode integrates persistent world collisions and uses no free grants',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  assert.match(main,/rpg-haven-construction-v1/);
  assert.match(main,/registerSettlementStructure\(result\.structure\)/);
  assert.match(main,/enemySightObstacles\.push\(b\)/);
  assert.match(main,/enemyMovementObstacles\.push\(b\)/);
  assert.match(main,/undoLastSettlementStructure\(settlementBuildState,backpack\)/);
  assert.match(main,/storeSettlementStructure\(settlementBuildState,backpack,id\)/);
  assert.match(main,/saveSettlementBuild\(\);saveBackpack\(\)/);
  assert.match(html,/id="settlementBuildHud"/);
  assert.match(html,/W20\.78 · HAVEN JUNCTION WORKSHOP BUILDING/);
});
