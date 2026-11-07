import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {benchPartStatus,benchPartMatches,benchMaterialRows,benchStatChange,
  BENCH_PART_FILTERS} from './workbench-presentation.mjs';

test('workbench part statuses distinguish installed, reusable, craftable and blocked',()=>{
  assert.equal(benchPartStatus({installed:true,owned:true}),'installed');
  assert.equal(benchPartStatus({owned:true,recipeOk:false}),'owned');
  assert.equal(benchPartStatus({recipeOk:true}),'craftable');
  assert.equal(benchPartStatus({recipeOk:false}),'missing');
  assert.deepEqual(BENCH_PART_FILTERS,['all','ready','owned','missing']);
  for(const kind of ['installed','owned','craftable','missing'])
    assert.equal(benchPartMatches(kind,'all'),true);
  assert.equal(benchPartMatches('installed','owned'),true);
  assert.equal(benchPartMatches('owned','ready'),false);
  assert.equal(benchPartMatches('craftable','ready'),true);
  assert.equal(benchPartMatches('missing','missing'),true);
  assert.equal(benchPartMatches('missing','all-invalid'),false);
});

test('workbench material ledger accounts for carried, stored, and auto-scrapped pieces',()=>{
  const rows=benchMaterialRows({'material:steel':5,'material:screw':3},
    {'material:steel':2,'material:screw':1},
    {'material:steel':1,'material:screw':1},
    {'material:steel':2});
  assert.deepEqual(rows[0],{id:'material:steel',required:5,carried:2,stored:1,
    recovered:2,available:5,missing:0,filled:100});
  assert.equal(rows[1].missing,1);
  assert.equal(rows[1].filled,67);
  assert.deepEqual(benchMaterialRows({}, {}, {}, {}),[]);
});

test('workbench stat comparisons respect lower-is-better handling stats',()=>{
  assert.equal(benchStatChange(20,30,true),'better');
  assert.equal(benchStatChange(30,20,true),'worse');
  assert.equal(benchStatChange(3,2,false),'better');
  assert.equal(benchStatChange(2,3,false),'worse');
  assert.equal(benchStatChange(2,2,false),'same');
});

test('workbench UI retains real crafting and provides the new inspection controls',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  assert.match(main,/previewWorkshopRecipe\(backpack,settlementBuildState/);
  assert.match(main,/craftWithWorkshop\(backpack,settlementBuildState/);
  assert.match(main,/benchPartMatches\(/);
  assert.match(main,/benchMaterialRows\(/);
  assert.match(html,/id="benchPartFilter"/);
  assert.match(html,/id="benchRecipeLedger"/);
  assert.match(html,/id="benchRecipeScrap"/);
});
