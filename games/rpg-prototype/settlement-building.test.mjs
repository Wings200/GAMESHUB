import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBackpack,addItem,countItem} from './inventory.mjs';
import {HAVEN_BUILD_AREA,SETTLEMENT_BLUEPRINTS,SETTLEMENT_BY_ID,SETTLEMENT_CATEGORIES,
  initialSettlementBuildState,safeSettlementBuildSnapshot,
  snappedBuildPosition,snapWallToJunction,snapRoofToSupport,wallJunctionAllowed,
  buildWorldBoxes,validateBuildPlacement,
  missingBuildingMaterials,placeSettlementStructure,storeSettlementStructure,
  scrapSettlementStructure,storedStructureCount,
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
    ['weaponbench','powerstation']);
  assert.equal(SETTLEMENT_BY_ID.scrapbench.legacy,true,
    'the old sorting table must remain valid for existing save data');
  assert.ok(SETTLEMENT_BY_ID.powerstation.parts.filter(part=>
    part.material==='gantry').length>=8);
  assert.ok(SETTLEMENT_BY_ID.powerstation.parts.some(part=>part.material==='chain'));
  assert.ok(SETTLEMENT_BY_ID.powerstation.parts.some(part=>Math.abs(part.tiltZ)>.3));
});

test('all real Haven debris sites are unique, inside the workshop and yield materials',()=>{
  assert.equal(HAVEN_JUNK_SITES.length,12);
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
  for(const id of ['original-weapon-bench','shack-floor','shack-walls','shack-roof'])
    assert.ok(HAVEN_JUNK_BY_ID[id],`${id} is a persistent, scrappable fixture`);
});

test('legacy salvage table stays in existing saves but cannot be constructed again',()=>{
  const state=initialSettlementBuildState(),pack=fundedPack();
  assert.match(placeSettlementStructure(state,pack,placement('scrapbench')).reason,
    /NO LONGER PLACEABLE/);
  const restored=safeSettlementBuildSnapshot({structures:[{
    id:14,type:'scrapbench',x:-39,z:-23,rotation:0}]});
  assert.equal(restored.structures.length,1);
  assert.equal(restored.structures[0].type,'scrapbench');
  assert.equal(storeSettlementStructure(restored,pack,14).ok,true);
  assert.deepEqual(settlementCategoryBlueprints('WORKSHOP',restored).map(p=>p.id),
    ['weaponbench','powerstation','scrapbench']);
  const reused=placeSettlementStructure(restored,pack,placement('scrapbench',-39,-23));
  assert.equal(reused.ok,true);
  assert.equal(reused.fromStorage,true);
  assert.equal(storedStructureCount(restored,'scrapbench'),0);
  assert.deepEqual(settlementCategoryBlueprints('WORKSHOP',restored).map(p=>p.id),
    ['weaponbench','powerstation']);
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

test('every registered pre-existing settlement fixture is scrappable exactly once',()=>{
  const state=initialSettlementBuildState(),pack=createBackpack();
  for(const site of HAVEN_JUNK_SITES){
    const first=scrapHavenJunk(state,pack,site.id);
    assert.equal(first.ok,true,site.id+' must support X to scrap');
    assert.equal(scrapHavenJunk(state,pack,site.id).ok,false,
      site.id+' must not respawn or pay materials twice');
  }
  const restored=safeSettlementBuildSnapshot(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.scrappedJunk.length,HAVEN_JUNK_SITES.length);
  for(const site of HAVEN_JUNK_SITES)
    assert.equal(scrapHavenJunk(restored,pack,site.id).ok,false);
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

test('two perpendicular walls can form a flush L corner and persist after reload',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  const first=placeSettlementStructure(state,pack,placement('wall',-40,-26,0));
  assert.equal(first.ok,true);
  const corner=placement('wall',-38.5,-24.5,1);
  assert.equal(wallJunctionAllowed(corner,first.structure),true);
  assert.equal(validateBuildPlacement(state,corner).ok,true);
  assert.equal(placeSettlementStructure(state,pack,corner).ok,true);
  const restored=safeSettlementBuildSnapshot(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.structures.length,2,'legal corners must not vanish on reload');
  assert.deepEqual(restored.structures[1].rotation,1);
});

test('wall ends snap together even from a slightly misaligned reticle',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  assert.equal(placeSettlementStructure(state,pack,
    placement('wall',-40,-26,0)).ok,true);
  const raw=placement('wall',-38.0,-24.0,1);
  const snapped=snapWallToJunction(state,raw);
  assert.deepEqual(snapped,placement('wall',-38.5,-24.5,1));
  assert.equal(validateBuildPlacement(state,snapped).ok,true);
  state.snap=false;
  assert.deepEqual(snapWallToJunction(state,raw),raw,
    'G / free placement must bypass the magnetic corner snap');
});

test('foundation edges snap walls to the correct rotation and perimeter',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  assert.equal(placeSettlementStructure(state,pack,
    placement('foundation',-40,-26)).ok,true);
  assert.deepEqual(snapWallToJunction(state,placement('wall',-39.7,-24.8,0)),
    placement('wall',-40,-24.5,0));
  assert.deepEqual(snapWallToJunction(state,placement('doorway',-38.2,-26.2,1)),
    placement('doorway',-38.5,-26,1));
});

test('every placeable roof matches the 3m foundation and wall-module scale',()=>{
  const roofs=SETTLEMENT_BLUEPRINTS.filter(plan=>plan.needsSupport);
  assert.deepEqual(roofs.map(plan=>plan.id),['roof','pitchedroof']);
  for(const roof of roofs){
    assert.equal(roof.width,3);
    assert.equal(roof.depth,3);
    const roofBoxes=buildWorldBoxes(placement(roof.id),{onlySolid:true});
    assert.ok(roofBoxes.length>0);
    assert.ok(roofBoxes.every(box=>box.bottom>=2.70&&box.top<=3.7),
      'roof collision height must fit walls and not become an invisible slab');
    assert.ok(roofBoxes.every(box=>box.minX>=-41.51&&box.maxX<=-38.49&&
      box.minZ>=-27.51&&box.maxZ<=-24.49),
    'roof geometry cannot overhang more than its 3m module');
  }
  assert.ok(SETTLEMENT_BY_ID.pitchedroof.parts.some(piece=>
    Math.abs(piece.tiltZ)>.35&&piece.solid),'gabled roof must have real pitched panels');
  assert.ok(SETTLEMENT_BY_ID.roof.parts.filter(piece=>piece.material==='roof').length>=2,
    'corrugated roof must render as individual sheets');
});

test('roof placement snaps onto the bay, not directly on top of the supporting wall',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  const floor=placeSettlementStructure(state,pack,placement('foundation'));
  const wall=placeSettlementStructure(state,pack,placement('wall',-40,-24.5));
  assert.ok(floor.ok&&wall.ok);
  const projected=placement('pitchedroof',-39.4,-25.5);
  assert.deepEqual(snapRoofToSupport(state,projected),placement('pitchedroof'));
  assert.equal(validateBuildPlacement(state,snapRoofToSupport(state,projected)).ok,true);
  assert.match(validateBuildPlacement(state,placement('pitchedroof',-40,-24.5)).reason,/ROOF/);
  assert.match(validateBuildPlacement(state,placement('roof',-39.6,-25.5)).reason,/ROOF/);
  state.snap=false;
  assert.deepEqual(snapRoofToSupport(state,projected),projected);
  assert.equal(placeSettlementStructure(state,pack,placement('pitchedroof')).ok,true);
  assert.match(validateBuildPlacement(state,placement('roof')).reason,/OVERLAP/);
});

test('roof can snap to a wall-defined bay without a foundation',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  assert.equal(placeSettlementStructure(state,pack,
    placement('doorway',-38.5,-26,1)).ok,true);
  assert.deepEqual(snapRoofToSupport(state,placement('roof',-40.7,-25.5)),
    placement('roof',-40,-26));
  assert.equal(validateBuildPlacement(state,placement('roof',-40,-26)).ok,true);
});

test('old roofs centered incorrectly on walls are migrated into supported bays',()=>{
  const oldSave={version:4,snap:true,structures:[
    {id:1,...placement('wall')},{id:2,...placement('roof')}],
    storedStructures:{},population:0,happiness:50,scrappedJunk:[]};
  const migrated=safeSettlementBuildSnapshot(oldSave);
  assert.equal(migrated.version,8);
  assert.equal(migrated.structures.length,2);
  assert.equal(migrated.structures[1].type,'roof');
  assert.equal(migrated.structures[1].x,-40);
  assert.equal(Math.abs(migrated.structures[1].z+26),1.5);
  assert.equal(validateBuildPlacement({structures:migrated.structures.slice(0,1)},
    migrated.structures[1]).ok,true);
});

test('corner joints are legal, but crossed walls, duplicate walls and rocks are blocked',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  const first=placeSettlementStructure(state,pack,placement('wall',-40,-26));
  assert.ok(first.ok);
  assert.equal(wallJunctionAllowed(placement('wall',-40,-26,1),first.structure),false);
  assert.match(validateBuildPlacement(state,placement('wall',-40,-26,1)).reason,/OVERLAP/);
  assert.match(validateBuildPlacement(state,placement('wall',-40,-26,0)).reason,/OVERLAP/);
  const corner=placement('wall',-38.5,-24.5,1);
  const rock={minX:-38.65,maxX:-38.35,minZ:-26.1,maxZ:-25.8,bottom:0,top:1.8};
  assert.match(validateBuildPlacement(state,corner,[rock]).reason,/OVERLAP/,
    'valid wall joints must never ignore actual static obstacles');
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
  assert.equal(placeSettlementStructure(state,pack,placement('wall',-40,-24.5)).ok,true);
  assert.equal(placeSettlementStructure(state,pack,placement('roof')).ok,true);
  assert.equal(state.structures.length,3);
});

test('doorway remains physically passable between its two posts',()=>{
  const boxes=buildWorldBoxes(placement('doorway'),{onlySolid:true});
  assert.equal(boxes.length,3);
  const center=boxes.filter(b=>b.minX< -40&&b.maxX> -40&&b.bottom<1.7);
  assert.equal(center.length,0,'lower door center must not have an invisible solid wall');
});

test('storing the last structure retains the object and saves restore valid structures',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  const first=placement('bed',-43,-26),plan=SETTLEMENT_BY_ID.bed;
  const counts=Object.fromEntries(Object.keys(plan.cost).map(id=>[id,countItem(pack,id)]));
  assert.equal(placeSettlementStructure(state,pack,first).ok,true);
  const snapshot=JSON.parse(JSON.stringify(state));
  const restored=safeSettlementBuildSnapshot(snapshot);
  assert.deepEqual(restored.structures,state.structures);
  const undo=undoLastSettlementStructure(state,pack);
  assert.equal(undo.ok,true);assert.equal(state.structures.length,0);
  for(const [id,cost] of Object.entries(plan.cost))
    assert.equal(countItem(pack,id),counts[id]-cost,
      'storing must not return materials because the object is intact');
  assert.equal(storedStructureCount(state,'bed'),1);
  assert.equal(undo.storedCount,1);
  assert.equal(safeSettlementBuildSnapshot(JSON.parse(JSON.stringify(state)))
    .storedStructures.bed,1);
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
  const wall=placeSettlementStructure(state,pack,placement('wall',-40,-24.5));
  assert.equal(wall.ok,true);
  assert.equal(placeSettlementStructure(state,pack,placement('roof')).ok,true);
  assert.match(storeSettlementStructure(state,pack,wall.structure.id).reason,/ROOF/);
  assert.equal(state.structures.length,2);
});

test('X scrapping a constructed workbench removes it permanently and gives partial materials',()=>{
  const backpack=fundedPack(),state=initialSettlementBuildState();
  const plan=SETTLEMENT_BY_ID.weaponbench;
  const before=Object.fromEntries(Object.keys(plan.cost).map(id=>
    [id,countItem(backpack,id)]));
  const placed=placeSettlementStructure(state,backpack,placement('weaponbench'));
  assert.equal(placed.ok,true);
  const scrapped=scrapSettlementStructure(state,backpack,placed.structure.id);
  assert.equal(scrapped.ok,true);
  assert.equal(state.structures.length,0);
  for(const [id,cost] of Object.entries(plan.cost)){
    const returned=Math.max(1,Math.floor(cost*.5));
    assert.equal(scrapped.materials[id],returned);
    assert.equal(countItem(backpack,id),before[id]-cost+returned);
  }
  assert.equal(scrapSettlementStructure(state,backpack,placed.structure.id).ok,false,
    'a second scrap must not give extra materials');
  assert.equal(safeSettlementBuildSnapshot(JSON.parse(JSON.stringify(state)))
    .structures.length,0,'the scrapped item must not return after loading');
});

test('F stores the intact object without material refunds; X respects roof supports',()=>{
  const pack=fundedPack(),state=initialSettlementBuildState();
  const before=countItem(pack,'material:steel');
  const bench=placeSettlementStructure(state,pack,placement('weaponbench',-43,-22));
  assert.equal(bench.ok,true);
  assert.equal(storeSettlementStructure(state,pack,bench.structure.id).ok,true);
  assert.equal(countItem(pack,'material:steel'),before-
    SETTLEMENT_BY_ID.weaponbench.cost['material:steel']);
  assert.equal(storedStructureCount(state,'weaponbench'),1);
  const wall=placeSettlementStructure(state,pack,placement('wall',-40,-24.5));
  assert.equal(wall.ok,true);
  assert.equal(placeSettlementStructure(state,pack,placement('roof',-40,-24.5)).ok,false);
  assert.equal(placeSettlementStructure(state,pack,placement('roof')).ok,true);
  assert.match(scrapSettlementStructure(state,pack,wall.structure.id).reason,/ROOF FIRST/);
  assert.equal(state.structures.length,2);
  assert.equal(scrapSettlementStructure(state,pack,state.structures.at(-1).id).ok,true);
  pack.materials['material:wood']=999999;
  assert.match(scrapSettlementStructure(state,pack,wall.structure.id).reason,
    /STORAGE FULL/);
  assert.equal(state.structures.length,1,'an unpayable scrap must not delete the piece');
});

test('storing adds a visible unit count and replacing consumes the object, not components',()=>{
  const state=initialSettlementBuildState(),pack=fundedPack();
  const first=placeSettlementStructure(state,pack,placement('wall',-45,-27));
  const second=placeSettlementStructure(state,pack,placement('wall',-39,-27));
  assert.ok(first.ok&&second.ok);
  assert.equal(storeSettlementStructure(state,pack,first.structure.id).storedCount,1);
  assert.equal(storeSettlementStructure(state,pack,second.structure.id).storedCount,2);
  const saved=safeSettlementBuildSnapshot(JSON.parse(JSON.stringify(state)));
  assert.equal(storedStructureCount(saved,'wall'),2);
  for(const id of Object.keys(SETTLEMENT_BY_ID.wall.cost))pack.materials[id]=0;
  assert.ok(missingBuildingMaterials(pack,'wall').length>0);
  assert.equal(placeSettlementStructure(saved,pack,placement('wall',-42,-25)).fromStorage,true);
  assert.equal(storedStructureCount(saved,'wall'),1);
  assert.equal(placeSettlementStructure(saved,pack,placement('wall',-36,-25)).fromStorage,true);
  assert.equal(storedStructureCount(saved,'wall'),0);
  assert.equal(placeSettlementStructure(saved,pack,placement('wall',-33,-25)).ok,false,
    'third placement needs actual materials again');
  assert.equal(countItem(pack,'material:steel'),0);
});

test('failed placement does not consume a stored item, and corrupted counts are sanitized',()=>{
  const state=initialSettlementBuildState(),pack=createBackpack();
  state.storedStructures.bed=1;
  assert.equal(placeSettlementStructure(state,pack,placement('bed',88,88)).ok,false);
  assert.equal(storedStructureCount(state,'bed'),1);
  assert.equal(placeSettlementStructure(state,pack,placement('bed',-41,-23)).ok,true);
  assert.equal(storedStructureCount(state,'bed'),0);
  assert.deepEqual(safeSettlementBuildSnapshot({version:3}).storedStructures,{},
    'previous saves begin with empty object storage');
  const sanitized=safeSettlementBuildSnapshot({storedStructures:{
    wall:3,bed:-2,turret:2.3,unknown:99,roof:100000000}});
  assert.equal(storedStructureCount(sanitized,'wall'),3);
  assert.equal(storedStructureCount(sanitized,'bed'),0);
  assert.equal(storedStructureCount(sanitized,'turret'),0);
  assert.equal(storedStructureCount(sanitized,'unknown'),0);
  assert.equal(storedStructureCount(sanitized,'roof'),120-3);
});

test('field build mode integrates persistent world collisions and uses no free grants',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  assert.match(main,/rpg-haven-construction-v1/);
  assert.match(main,/registerSettlementStructure\(result\.structure\)/);
  assert.match(main,/builtSettlementShotBoxRefs\.add\(b\)/);
  assert.match(main,/enemySightObstacles\.filter\(box=>!builtSettlementShotBoxRefs\.has\(box\)\)/);
  assert.match(main,/snapWallToJunction\(settlementBuildState/);
  assert.match(main,/snapRoofToSupport\(settlementBuildState/);
  assert.match(main,/enemySightObstacles\.push\(b\)/);
  assert.match(main,/enemyMovementObstacles\.push\(b\)/);
  assert.match(main,/undoLastSettlementStructure\(settlementBuildState,backpack\)/);
  assert.match(main,/storeSettlementStructure\(settlementBuildState,backpack,id\)/);
  assert.match(main,/saveSettlementBuild\(\);saveBackpack\(\)/);
  assert.match(html,/id="settlementBuildHud"/);
  const history=JSON.parse(readFileSync(new URL('./version-history.json',import.meta.url),'utf8'));
  assert.ok(history.entries.some(entry=>entry.version==='W20.78'&&
    entry.title==='HAVEN JUNCTION WORKSHOP BUILDING'));
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
  assert.match(main,/scrapSettlementStructure\(settlementBuildState,backpack,aimed\.id\)/);
  assert.match(main,/KeyX'&&!e\.repeat\)\{\s*e\.preventDefault\(\);scrapAimedSettlementTarget\(\)/);
  assert.match(main,/KeyF'&&!e\.repeat\)\{\s*e\.preventDefault\(\);storeAimedSettlementStructure\(\)/);
  assert.match(main,/function nearestSettlementWorkshop\(\)/);
  assert.match(main,/visibleHavenJunk\.has\('original-weapon-bench'\)/);
  assert.match(main,/interactSettlementWorkshop\(nearestSettlementWorkshop\(\)\)/);
  assert.match(main,/frameDistance>4/);
  assert.match(main,/storedStructureCount\(settlementBuildState,plan\.id\)/);
  assert.match(main,/STORED \('/);
  assert.match(main,/PLACED FROM STORAGE/);
  assert.match(html,/id="settlementScrapCount"/);
  assert.ok(history.entries.some(entry=>entry.version==='W20.80'&&
    entry.title==='PLACEABLE WORKBENCHES & WORLD SALVAGE'));
  assert.ok(history.entries.some(entry=>entry.version==='W20.81'&&
    entry.title==='TRUE SETTLEMENT SCRAP & POWER ARMOR GANTRY'));
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
