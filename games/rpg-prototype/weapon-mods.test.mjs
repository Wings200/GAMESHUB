import test from 'node:test';
import assert from 'node:assert/strict';
import {ARSENAL,getWeaponSpec,createWeaponState,fireWeapon,startWeaponReload} from './weapons.mjs';
import {createBackpack,addItem,safeBackpackSnapshot} from './inventory.mjs';
import {MOD_WEAPON_IDS,MOD_SLOTS,WEAPON_MODS,weaponModOptions,craftWeaponMod,
  missingModMaterials,effectiveWeaponSpec,selectedWeaponMod} from './weapon-mods.mjs';

test('all ten rebuilt weapons expose meaningful slot-specific recipes',()=>{
  assert.equal(MOD_WEAPON_IDS.length,10);
  for(const id of MOD_WEAPON_IDS)for(const slot of MOD_SLOTS){
    const choices=weaponModOptions(id,slot);
    assert.ok(choices.length>=1,id+' '+slot);
    for(const part of choices)for(const [material,quantity] of Object.entries(part.cost)){
      assert.match(material,/^material:/);
      assert.ok(Number.isInteger(quantity)&&quantity>0);
    }
  }
});
test('crafting fails atomically, then removes exact components and installs the part',()=>{
  const id='pipe-smg',option=weaponModOptions(id,'magazine').find(x=>x.slug==='drum');
  const pack=createBackpack();
  const before=JSON.stringify(pack);
  const failed=craftWeaponMod(pack,id,option.id);
  assert.equal(failed.reason,'materials');
  assert.equal(JSON.stringify(pack),before,'no partial spending or modification on failure');
  for(const [material,quantity] of Object.entries(option.cost))addItem(pack,material,quantity+1);
  assert.deepEqual(missingModMaterials(pack,option.id),[]);
  const crafted=craftWeaponMod(pack,id,option.id);
  assert.equal(crafted.crafted,true);
  for(const [material] of Object.entries(option.cost))assert.equal(pack.materials[material],1);
  const spec=effectiveWeaponSpec(getWeaponSpec(id),pack);
  assert.equal(spec.magazineSize,getWeaponSpec(id).magazineSize+45);
  assert.equal(spec.reloadSeconds,getWeaponSpec(id).reloadSeconds*1.3);
  const repeat=craftWeaponMod(pack,id,option.id);
  assert.equal(repeat.crafted,false,'once unlocked, reinstall is free');
  assert.equal(pack.unlockedWeaponMods[id].length,1);
});
test('different weapon materials describe the actual engineering',()=>{
  const laser=weaponModOptions('laser-musket','receiver')[0];
  const shotgun=weaponModOptions('pump-action-shotgun','magazine')[0];
  const rifle=weaponModOptions('bolt-hunting-rifle','barrel')[0];
  assert.ok(laser.cost['material:circuitry']&&laser.cost['material:copper']);
  assert.ok(shotgun.cost['material:spring']&&shotgun.cost['material:steel']);
  assert.ok(rifle.cost['material:screw']&&rifle.cost['material:steel']);
  assert.equal(weaponModOptions('double-barrel-shotgun','magazine').some(x=>x.slug==='large'),false);
});
test('real ballistics, cadence, recoil and reload see the assembled weapon spec',()=>{
  const pack=createBackpack(),base=getWeaponSpec('10mm-pistol');
  for(const part of [
    weaponModOptions(base.id,'receiver').find(x=>x.slug==='calibrated'),
    weaponModOptions(base.id,'stock').find(x=>x.slug==='tactical')]){
    for(const [material,quantity] of Object.entries(part.cost))addItem(pack,material,quantity);
    assert.equal(craftWeaponMod(pack,base.id,part.id).ok,true);
  }
  const spec=effectiveWeaponSpec(base,pack);
  assert.ok(spec.damage>base.damage&&spec.recoilDegrees<base.recoilDegrees);
  assert.ok(spec.fireInterval<base.fireInterval);
  const state=createWeaponState(spec);
  const shot=fireWeapon(state,spec,()=>.5,{});
  assert.equal(shot.damage,spec.damage);
  state.magazine=1;
  assert.ok(startWeaponReload(state,spec));
  assert.ok(state.reloadDuration>0);
});
test('unlocked mods and equipped slots persist and unsafe saved IDs are rejected',()=>{
  const id='pipe-rifle',part=weaponModOptions(id,'muzzle')[0];
  const pack=createBackpack();
  for(const [material,quantity] of Object.entries(part.cost))addItem(pack,material,quantity);
  assert.equal(craftWeaponMod(pack,id,part.id).ok,true);
  const restored=safeBackpackSnapshot(JSON.parse(JSON.stringify(pack)));
  assert.equal(selectedWeaponMod(restored,id,'muzzle'),part.id);
  restored.equipment.weaponMods[id].receiver='mod:pipe-smg:receiver:reinforced';
  const sanitized=safeBackpackSnapshot(restored);
  assert.equal(selectedWeaponMod(sanitized,id,'receiver'),'factory');
  assert.equal(craftWeaponMod(pack,'10mm-pistol',part.id).reason,'incompatible');
});
