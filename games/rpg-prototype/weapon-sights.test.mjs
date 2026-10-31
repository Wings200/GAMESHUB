import test from 'node:test';
import assert from 'node:assert/strict';
import {ARSENAL} from './weapons.mjs';
import {SIGHT_MOUNTS,sightMount,adsWeaponPosition,alignedSightPosition,
  isAlignedToBore,OPTIC_MODS,compatibleOptics,sightForOptic} from './weapon-sights.mjs';
test('Every playable weapon has a dedicated real-world sight reference',()=>{
  assert.equal(Object.keys(SIGHT_MOUNTS).length,ARSENAL.length);
  for(const w of ARSENAL){
    const s=sightMount(w.id);
    assert.ok(Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.z));
    assert.ok(s.adsZ<-.5&&s.adsZ>-.9);
    assert.ok(s.y>=.15&&s.y<=.23,'optic must be mounted low on the receiver');
    assert.ok(s.fov>=45&&s.fov<=66);
  }
  assert.equal(sightMount('hunting-rifle').optic,'scope');
  assert.equal(sightMount('service-carbine').optic,'holo');
  assert.throws(()=>sightMount('missing'),/Unknown weapon sight/);
});
test('ADS anchors physically center the actual sight on the camera ray',()=>{
  for(const w of ARSENAL){
    const position=adsWeaponPosition(w.id);
    const sight=alignedSightPosition(w.id,position);
    assert.ok(isAlignedToBore(w.id));
    assert.equal(sight.x,0);
    assert.equal(sight.y,0);
    assert.ok(sight.z<0,'sight must sit in front of camera');
  }
});
test('Offsetting a rifle sight independently of the camera must fail alignment',()=>{
  const p=adsWeaponPosition('hunting-rifle');
  assert.equal(isAlignedToBore('hunting-rifle',{...p,y:p.y+.11}),false);
  assert.equal(isAlignedToBore('hunting-rifle',{...p,x:p.x-.04}),false);
});
test('Pistol iron sights, carbine optic and rifle scope align at different heights',()=>{
  const p=sightMount('scrap-pistol'),c=sightMount('service-carbine'),
    r=sightMount('hunting-rifle');
  assert.ok(p.y<c.y&&c.y<.24);
  assert.ok(r.y<.24);
  assert.ok(r.fov<c.fov&&c.fov<p.fov);
});

test('Scoped and open sights have intentionally low ADS dispersion',()=>{
  const specs=Object.fromEntries(ARSENAL.map(w=>[w.id,w]));
  assert.ok(specs['hunting-rifle'].adsSpreadDegrees<=.04);
  assert.ok(specs['service-carbine'].adsSpreadDegrees<=.12);
  assert.ok(specs['scrap-pistol'].adsSpreadDegrees<=.12);
  assert.ok(specs['scrap-shotgun'].adsSpreadDegrees>3,
    'shotgun pellet scatter must remain even while aiming');
});

test('Modular sights give real increasing magnification and respect weapons',()=>{
  const rifle=compatibleOptics('hunting-rifle');
  for(const id of ['factory','holo-a','holo-b','scope-2x','scope-4x','scope-6x'])
    assert.ok(rifle.includes(id));
  assert.deepEqual(compatibleOptics('scrap-pistol'),['factory']);
  assert.equal(sightForOptic('scrap-pistol','scope-6x').optic,'iron');
  assert.equal(sightForOptic('hunting-rifle','scope-6x').optic,'scope');
  assert.ok(sightForOptic('hunting-rifle','scope-6x').fov<
    sightForOptic('hunting-rifle','scope-4x').fov);
  assert.ok(sightForOptic('hunting-rifle','scope-4x').fov<
    sightForOptic('hunting-rifle','scope-2x').fov);
  assert.equal(sightForOptic('service-carbine','holo-a').optic,'reflex');
  assert.equal(sightForOptic('service-carbine','holo-b').optic,'holo');
  assert.ok(OPTIC_MODS['scope-6x'].cost.glass>OPTIC_MODS['holo-a'].cost.glass);
});
