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
    assert.ok(s.adsZ<-.5&&s.adsZ>-1.3);
    assert.ok(s.y>=.15&&s.y<=.29,'optics and pistol irons must clear the receiver top');
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
  assert.equal(sightForOptic('service-carbine','holo-a').optic,'holo');
  assert.equal(sightForOptic('service-carbine','holo-a').variant,'holo-a');
  assert.equal(sightForOptic('service-carbine','holo-b').variant,'holo-b');
  assert.equal(sightForOptic('service-carbine','holo-a').fov,
    sightForOptic('service-carbine','holo-b').fov);
  assert.equal(sightForOptic('service-carbine','holo-b').optic,'holo');
  assert.ok(OPTIC_MODS['scope-6x'].cost.glass>OPTIC_MODS['holo-a'].cost.glass);
});

test('New 10mm fixed iron sights zero the center of the camera ray',()=>{
  const irons=sightMount('10mm-pistol');
  assert.equal(irons.optic,'iron');
  assert.ok(irons.y>.23);
  assert.deepEqual(compatibleOptics('10mm-pistol'),['factory']);
  assert.ok(isAlignedToBore('10mm-pistol'));
  assert.equal(sightForOptic('10mm-pistol','scope-6x').optic,'iron');
});

test('Pipe pistol iron sight and factory-only optics stay centered on bore',()=>{
  const mount=sightMount('pipe-pistol');
  assert.equal(mount.optic,'iron');
  assert.ok(mount.fov>60);
  assert.deepEqual(compatibleOptics('pipe-pistol'),['factory']);
  assert.ok(isAlignedToBore('pipe-pistol'));
  assert.equal(sightForOptic('pipe-pistol','scope-4x').optic,'iron');
});

test('Actual 10mm and pipe pistol bead TIPS are on the firing ray in ADS',()=>{
  // Geometry is the top of the visible brass bead in each authored model.
  // Checking just the model's old receiver-center anchor missed the mismatch:
  // a few centimetres at the muzzle become serious vertical error at distance.
  const tips=[
    ['10mm-pistol',.267,.014],
    ['pipe-pistol',.239,.016]
  ];
  for(const [id,beadY,beadHeight] of tips){
    const mount=sightMount(id);
    const tipY=beadY+beadHeight/2;
    assert.ok(Math.abs(mount.y-tipY)<1e-8,id+' front blade tip is not zeroed');
    const ads=adsWeaponPosition(id);
    assert.ok(Math.abs(ads.y+tipY)<1e-8,id+' ADS camera misses front tip');
    assert.ok(isAlignedToBore(id,ads));
  }
});

test('Pipe rifle front tip is truly zeroed for first-person ADS',()=>{
  const s=sightMount('pipe-rifle');
  assert.equal(s.optic,'iron');
  assert.equal(s.y,.258);
  assert.ok(s.adsZ<=-1,'long stock must not sit behind camera');
  assert.deepEqual(compatibleOptics('pipe-rifle'),['factory']);
  assert.equal(sightForOptic('pipe-rifle','scope-4x').optic,'iron');
  const anchor=adsWeaponPosition('pipe-rifle');
  assert.equal(anchor.y,-.258);
  assert.ok(isAlignedToBore('pipe-rifle',anchor));
});

test('Laser musket keeps factory irons and zeroed front blade',()=>{
  const sight=sightMount('laser-musket');
  assert.equal(sight.y,.263);
  assert.equal(sight.adsZ,-1.20);
  assert.deepEqual(compatibleOptics('laser-musket'),['factory']);
  assert.equal(sightForOptic('laser-musket','scope-6x').optic,'iron');
  assert.ok(isAlignedToBore('laser-musket'));
});

test('Double-barrel iron sight is aligned with the two muzzle bores',()=>{
  const mount=sightMount('double-barrel-shotgun');
  assert.equal(mount.optic,'iron');
  assert.equal(mount.y,.270);
  assert.deepEqual(compatibleOptics('double-barrel-shotgun'),['factory']);
  assert.equal(sightForOptic('double-barrel-shotgun','scope-6x').optic,'iron');
  assert.ok(isAlignedToBore('double-barrel-shotgun'));
});

test('Pump action shotgun iron bead aligns with center ray and cannot equip optics yet',()=>{
  const s=sightMount('pump-action-shotgun');
  assert.equal(s.y,.270);
  assert.equal(s.z,-.19);
  assert.equal(s.optic,'iron');
  assert.deepEqual(compatibleOptics('pump-action-shotgun'),['factory']);
  assert.ok(isAlignedToBore('pump-action-shotgun'));
});

test('Hunting rifle iron sights align exactly to the real receiver bead at .290m',()=>{
  const sight=sightMount('bolt-hunting-rifle');
  assert.equal(sight.y,.290);
  assert.equal(sight.z,-.239);
  assert.equal(sight.optic,'iron');
  assert.deepEqual(compatibleOptics('bolt-hunting-rifle'),['factory']);
  assert.ok(isAlignedToBore('bolt-hunting-rifle'));
});
