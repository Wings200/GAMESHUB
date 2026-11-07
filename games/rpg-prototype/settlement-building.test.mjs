import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBackpack,addItem,countItem} from './inventory.mjs';
import {HAVEN_BUILD_AREA,SETTLEMENT_BLUEPRINTS,SETTLEMENT_BY_ID,SETTLEMENT_CATEGORIES,
  initialSettlementBuildState,safeSettlementBuildSnapshot,
  snappedBuildPosition,buildWorldBoxes,validateBuildPlacement,
  missingBuildingMaterials,placeSettlementStructure,storeSettlementStructure,
  undoLastSettlementStructure,settlementCategoryBlueprints,
  calculateSettlementStats,advanceSettlement,RECRUITMENT_INTERVAL,
  HAVEN_JUNK_SITES,HAVEN_JUNK_BY_ID,scrapHavenJunk}
  from './settlement-building.mjs';

const placement=(type,x=-40,z=-26,rotation=0)=>({type,x,z,rotation});
const fundedPack=()=>{
  const pack=createBackpack();
  for(const plan of SETTLEMENT_BLUEPRINTS)for(const [id,n] of Object.entries(plan.cost))
    addItem(pack,id,n*3);
  return pack;
};

test('Haven has a browsable settlement catalog with nonzero genuine component costs',()=>{
  assert.ok(SETTLEMENT_BLUEPRINTS.length>=25);
  assert.equal(SETTLEMENT_CATEGORIES.length,8);
  assert.ok(HAVEN_BUILD_AREA.minX< -30&&HAVEN_BUILD_AREA.maxZ> -20);
  const ids=new Set();
  for(const plan of SETTLEMENT_BLUEPRINTS){
    assert.ok(!ids.has(plan.id));ids.add(plan.id);
    assert.ok(SETTLEMENT_CATEGORIES.some(category=>category.id===plan.category));
    assert.ok(plan.parts.length>0&&plan.width>0&&plan.depth>0);
    assert.ok(Object.values(plan.cost).every(n=>Number.isInteger(n)&&n>0));
    assert.ok(Object.keys(plan.cost).every(key=>key.startsWith('material:')));
  }
  for(const category of SETTLEMENT_CATEGORIES){
    const plans=settlementCategoryBlueprints(category.id);
    assert.ok(plans.length>=2&&plans.length<=7,
      `${category.id} must fit the 1–7 selection controls`);
  }
  assert.deepEqual(settlementCategoryBlueprints('WORKSHOP').map(plan=>plan.id),
    ['weaponbench','powerstation','scrapbench']);
});

test('all real Haven debris sites are unique, inside the workshop and yield materials',()=>{
  assert.equal(HAVEN_JUNK_SITES.length,8);
  assert.equal(new Set(HAVEN_JUNK_SITES.map(site=>site.id)).size,HAVEN_JUNK_SITES.length);
  for(const site of HAVEN_JUNK_SITES){
    assert.equal(HAVEN_JUNK_BY_ID[site.id],site);
    assert.ok(site.x>=HAVEN_BUILD_AREA.minX&&site.x<=HAVEN_BUILD_AREA.maxX);
    assert.ok(site.z>=HAVEN_BUILD_AREA.minZ&&site.z<=HAVEN_BUILD_AREA.maxZ);
    assert.ok(site.parts.some(piece=>piece.solid));
    assert.ok(Object.entries(site.materials).length>0);
    for(const [id,quantity] of Object.entries(site.materials)){
      assert.ok(id.startsWith('material:'));
      assert.ok(Number.isInteger(quantity)&&quantity>0);
    }
  }
});

test('scavenging world junk awards its precise yield once and survives reload',()=>{
  const backpack=createBackpack(),state=initialSettlementBuildState();
  const site=HAVEN_JUNK_SITES[0];
  const before=Object.fromEntries(Object.keys(site.materials).map(id=>
    [id,countItem(backpack,id)]));
  const result=scrapHavenJunk(state,backpack,site.id);
  assert.equal(result.ok,true);
  assert.deepEqual(result.materials,site.materials);
  assert.deepEqual(state.scrappedJunk,[site.id]);
  for(const [id,n] of Object.entries(site.materials))
    assert.equal(countItem(backpack,id),before[id]+n);
  const duplicate=scrapHavenJunk(state,backpack,site.id);
  assert.equal(duplicate.ok,false);
  assert.match(duplicate.reason,/ALREADY/);
  const invalid=scrapHavenJunk(state,backpack,'outside-the-workshop');
  assert.equal(invalid.ok,false);
  for(const [id,n] of Object.entries(site.materials))
    assert.equal(countItem(backpack,id),before[id]+n,
      'duplicate interactions must not grant a second copy');
  const restored=safeSettlementBuildSnapshot(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.scrappedJunk,[site.id]);
  assert.equal(scrapHavenJunk(restored,backpack,site.id).ok,false);
  assert.deepEqual(safeSettlementBuildSnapshot({version:2}).scrappedJunk,[],
    'older saves without junk records remain loadable');
  assert.deepEqual(safeSettlementBuildSnapshot({scrappedJunk:[site.id,site.id,
    'injected-scrap-id']}).scrappedJunk,[site.id]);
});

test('a full component stack cannot consume a world object without payment',()=>{
  const state=initialSettlementBuildState(),backpack=createBackpack();
  const site=HAVEN_JUNK_SITES[0];
  const materialId=Object.keys(site.materials)[0];
  backpack.materials[materialId]=999999;
  assert.match(scrapHavenJunk(state,backpack,site.id).reason,/STORAGE FULL/);
  assert.deepEqual(state.scrappedJunk,[]);
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
  assert.match(html,/id="settlementStart"/);
  assert.match(html,/id="settlementHappiness"/);
  assert.match(html,/id="settlementBuildCategories"/);
  assert.match(main,/!settlementBuildMode&&!thirdPersonActive/);
  assert.match(main,/ownedActiveGun=playerGunEnabled\(\)&&!settlementBuildMode/);
  assert.match(main,/document\.body\.classList\.toggle\('settlement-building',next\)/);
  assert.match(main,/settlementTestRequested=true/);
  assert.match(main,/cycleSettlementCategory\(e\.shiftKey\?-1:1\)/);
  for(const id of ['settlementPopulation','settlementFood','settlementWater',
    'settlementDefense','settlementBeds','settlementPower','settlementRecruitment'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(main,/advanceSettlement\(settlementBuildState,dt\)/);
  assert.match(main,/for\(const site of HAVEN_JUNK_SITES\)registerHavenJunk\(site\)/);
  assert.match(main,/unregisterHavenJunk\(aimed\.id\)/);
  assert.match(main,/scrapHavenJunk\(settlementBuildState,backpack,aimed\.id\)/);
  assert.match(main,/function nearestSettlementWorkshop\(\)/);
  assert.match(main,/interactSettlementWorkshop\(nearestSettlementWorkshop\(\)\)/);
  assert.match(main,/frameDistance>4/);
  assert.match(html,/id="settlementScrapCount"/);
  assert.match(html,/W20\.80 · PLACEABLE WORKBENCHES & WORLD SALVAGE/);
});

test('population, food, water, beds, power draw and defense come from built objects',()=>{
  const state=initialSettlementBuildState();
  state.structures=['bed','bunk','corn','waterpump','generator','beacon',
    'turret','barricade'].map((type,id)=>({type,id:id+1,x:-40,z:-20,rotation:0}));
  const stats=calculateSettlementStats(state);
  assert.equal(stats.population,0);
  assert.equal(stats.beds,3);
  assert.equal(stats.food,4);
  assert.equal(stats.water,3);
  assert.equal(stats.power,8);
  assert.equal(stats.powerDraw,4);
  assert.equal(stats.defense,9);
  assert.equal(stats.beacons,1);
  assert.equal(stats.recruiting,true);
});

test('beacon recruitment is timed and requires power, spare beds, food, water',()=>{
  const state=initialSettlementBuildState();
  state.structures=['beacon','bed','garden','waterpump'].map((type,id)=>
    ({type,id:id+1,x:-40,z:-20,rotation:0}));
  assert.equal(calculateSettlementStats(state).recruiting,false);
  for(let i=0;i<20;i++)advanceSettlement(state,4);
  assert.equal(state.population,0,'an unpowered beacon cannot recruit');
  state.structures.push({id:5,type:'generator',x:-38,z:-20,rotation:0});
  let arrivals=0;
  for(let i=0;i<Math.ceil(RECRUITMENT_INTERVAL/4)+1;i++)
    arrivals+=advanceSettlement(state,4).recruited;
  assert.equal(arrivals,1);assert.equal(state.population,1);
  assert.equal(calculateSettlementStats(state).recruiting,false,
    'a second settler needs an additional bed');
  const snapshot=safeSettlementBuildSnapshot(JSON.parse(JSON.stringify(state)));
  assert.equal(snapshot.population,1);
  assert.ok(snapshot.happiness>=0&&snapshot.happiness<=100);
});

test('unpowered purifiers and turrets stop contributing their stats',()=>{
  const state=initialSettlementBuildState();
  state.structures=['purifier','turret','beacon'].map((type,id)=>
    ({type,id:id+1,x:-40,z:-20,rotation:0}));
  const initial=calculateSettlementStats(state);
  assert.equal(initial.water,0);assert.equal(initial.defense,0);
  assert.equal(initial.powered,false);
  state.structures.push({id:4,type:'generator',x:-38,z:-20,rotation:0});
  const restored=calculateSettlementStats(state);
  assert.equal(restored.water,8);assert.equal(restored.defense,8);
  assert.equal(restored.powered,true);
});
