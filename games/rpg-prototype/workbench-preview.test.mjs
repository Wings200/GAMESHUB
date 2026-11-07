import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {getWeaponSpec} from './weapons.mjs';
import {effectiveWeaponSpec,weaponModOptions} from './weapon-mods.mjs';
import {previewWeaponSpec} from './workbench-preview.mjs';

const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');

test('workbench preview calculates changes without crafting or changing saved pack',()=>{
  const weaponId='10mm-pistol',base=getWeaponSpec(weaponId);
  const receiver=weaponModOptions(weaponId,'receiver')[0];
  const pack={materials:{'material:steel':300},unlockedWeaponMods:{},
    equipment:{weaponMods:{[weaponId]:{receiver:'factory',barrel:'factory'}}}};
  const original=JSON.stringify(pack);
  const modified=previewWeaponSpec(pack,base,'receiver',receiver.id);
  assert.ok(modified.damage>effectiveWeaponSpec(base,pack).damage);
  assert.equal(JSON.stringify(pack),original);
  assert.equal(previewWeaponSpec(pack,base,'barrel',receiver.id),null);
});

test('preview respects already-installed other slot modifications',()=>{
  const weaponId='10mm-pistol',base=getWeaponSpec(weaponId);
  const receiver=weaponModOptions(weaponId,'receiver')[0];
  const barrel=weaponModOptions(weaponId,'barrel')[0];
  const pack={unlockedWeaponMods:{[weaponId]:[receiver.id]},
    equipment:{weaponMods:{[weaponId]:{receiver:receiver.id,barrel:'factory'}}}};
  const preview=previewWeaponSpec(pack,base,'barrel',barrel.id);
  assert.ok(preview.damage>effectiveWeaponSpec(base,pack).damage);
  assert.equal(pack.equipment.weaponMods[weaponId].barrel,'factory');
});

test('workbench has a single selected-part install button after cost and stats review',()=>{
  for(const id of ['benchWeaponList','benchSlots','benchPreviewName',
    'benchPreviewDescription','benchPreviewStats','benchPreviewMaterials','benchPreviewAction'])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/W20\.73 · WEAPON WORKBENCH/);
  assert.match(main,/function renderWorkbenchPreview\(\)/);
  assert.match(main,/action\.disabled=chosen\.installed\|\|missing/);
  assert.match(main,/action\.onclick=chosen\.onChoose/);
  assert.match(main,/PREVIEWING .*NO MATERIALS SPENT/);
});

test('weapons can only be configured at a physical Haven settlement workbench',()=>{
  assert.match(main,/const opticBench=\{x:-33,z:-21\}/);
  assert.match(main,/for\(const site of HAVEN_JUNK_SITES\)registerHavenJunk\(site\)/);
  assert.match(main,/visibleHavenJunk\.has\('original-weapon-bench'\)/);
  assert.match(main,/function benchWithinReach\(\)/);
  assert.match(main,/function beginWorkbench\(\)\{\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*if\(!controls\.isLocked\|\|!benchWithinReach\(\)\)/);
  assert.match(main,/settlementBuildState\.structures\.some\(s=>s\.type==='weaponbench'/);
  assert.match(main,/function interactSettlementWorkshop\(workshop\)/);
  assert.match(main,/if\(workshop\.type==='weaponbench'\)\{\s*beginWorkbench\(\)/);
  assert.match(main,/interactSettlementWorkshop\(nearestSettlementWorkshop\(\)\)/);
  assert.doesNotMatch(main,/e\.code==='KeyU'/);
  assert.doesNotMatch(main,/\$\('workbenchOpen'\)\.addEventListener/);
  assert.doesNotMatch(html,/id="workbenchOpen"/);
  assert.doesNotMatch(html,/WORKBENCH \/ U|OR U FROM THE FIELD/);
  assert.match(html,/HAVEN SETTLEMENT \/ PHYSICAL WEAPON WORKBENCH/);
});
