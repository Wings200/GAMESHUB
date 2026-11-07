import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPlayerHealth} from './player-combat.mjs';
import {VENDORS,vendorAccepts} from './vendors.mjs';
import {getItem,inventorySection} from './inventory.mjs';
import {createRadiationState,safeRadiationSnapshot,
  radiationHealthLimit,radiationExposureAt,radiationThreatLevel,applyRadiationExposure,
  treatRadiation,syncRadiationHealth,radiationHealthBar,RADIATION_SOURCES}
  from './radiation.mjs';

test('environmental radiation exists only within physical marked sources',()=>{
  const site=RADIATION_SOURCES[0];
  assert.ok(radiationExposureAt(site.x,site.z)>15);
  assert.equal(radiationExposureAt(site.x+site.radius,site.z),0);
  assert.equal(radiationExposureAt(0,0),0);
});
test('live RAD dial reads zero in safety and intensity levels one through six',()=>{
  const site=RADIATION_SOURCES[0];
  assert.equal(radiationThreatLevel(0),0);
  assert.equal(radiationThreatLevel(.01),0);
  assert.equal(radiationThreatLevel(0.1),1);
  assert.equal(radiationThreatLevel(17/6),1);
  assert.equal(radiationThreatLevel(3.0),2);
  assert.equal(radiationThreatLevel(17),6);
  assert.equal(radiationThreatLevel(100),6);
  assert.equal(radiationThreatLevel(radiationExposureAt(site.x,site.z)),6);
  assert.equal(radiationThreatLevel(radiationExposureAt(0,0)),0);
  const halfWay=radiationThreatLevel(radiationExposureAt(site.x+site.radius/2,site.z));
  assert.ok(halfWay>=2&&halfWay<=5);
  assert.ok(radiationThreatLevel(17*.15)<radiationThreatLevel(17),
    'armor protection reduces the measured radiation intensity');
});
test('the waste site has visible floor clearance, usable cover and no giant hazard billboard',()=>{
  const site=RADIATION_SOURCES[0];
  // The real testing ramp covers x 22..56 and z -34..-18. The previous
  // radiation drums were swallowed by that ramp and barely appeared.
  assert.ok(site.z+site.radius<-34,
    'entire irradiated site must clear the ramp, not be buried beneath it');
  assert.ok(site.x+site.radius<60 && site.z-site.radius>-51,
    'hazard and debris stay within walkable testing ground');
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  assert.doesNotMatch(main,/textSign\(['"]RAD HAZARD['"]/);
  assert.doesNotMatch(main,/const surface=green\.clone\(\)/,
    'test slope must not be a giant solid-green plane');
  for(const fragment of ['IrradiatedWasteDepot_',
    'wastePuddle(dump','warningLabel','wasteCollider(spill.x+x',
    'worldShotObstacles.push(b)','worldMovementObstacles.push(b)',
    "g.setAttribute('uv'",'rampMaterial'])
    assert.ok(main.includes(fragment),`missing visible hazard detail: ${fragment}`);
});
test('exposure lowers actual max HP and clamps current HP',()=>{
  const state=createRadiationState(),health=createPlayerHealth();
  const exposure=applyRadiationExposure(state,health,250,2);
  assert.equal(exposure.rads,250,'1-second safety cap prevents giant tab-resume doses');
  assert.equal(exposure.maxHealth,75);
  assert.equal(health.health,75);
  assert.equal(exposure.healthDamage,25);
  assert.equal(radiationHealthLimit(state),75);
});
test('radiation hurts current HP even when the player was already wounded',()=>{
  const state=createRadiationState();
  const health={health:60,maxHealth:100,alive:true,hits:0};
  const result=applyRadiationExposure(state,health,250,1);
  assert.equal(result.healthDamage,25);
  assert.equal(health.maxHealth,75);
  assert.equal(health.health,35,'real HP must drop, not only the health cap');
  assert.equal(state.rads,250,'the RAD counter independently tracks exposure');
  assert.deepEqual(radiationHealthBar(state,health),{
    currentPercent:35,radiationPercent:25,emptyPercent:40,limit:75,base:100
  });
  treatRadiation(state,health,300);
  assert.equal(health.health,35,'radiation medicine cannot act as a medkit');
  assert.equal(health.maxHealth,100);
  assert.equal(radiationHealthBar(state,health).radiationPercent,0);
});
test('radiation can actually kill and never overfills or underflows the HP bar',()=>{
  const state=createRadiationState();
  const health={health:6,maxHealth:100,alive:true};
  applyRadiationExposure(state,health,80,1);
  assert.equal(health.health,0);
  assert.equal(health.alive,false);
  assert.equal(radiationHealthBar(state,health).currentPercent,0);
  assert.equal(radiationHealthBar({rads:1000},{health:100}).radiationPercent,99);
});
test('power armor resistance mitigates exposure, never negates it entirely',()=>{
  const unprotected=createRadiationState(),protectedState=createRadiationState();
  applyRadiationExposure(unprotected,createPlayerHealth(),20,1);
  applyRadiationExposure(protectedState,createPlayerHealth(),20,1,{protection:.8});
  assert.ok(protectedState.rads>0&&protectedState.rads<unprotected.rads);
});
test('radiation treatment removes accumulated rads but does not heal HP',()=>{
  const state={version:1,rads:420},health={health:45,maxHealth:58,alive:true};
  const result=treatRadiation(state,health,300);
  assert.equal(result.ok,true);assert.equal(state.rads,120);
  assert.equal(health.maxHealth,88);assert.equal(health.health,45);
  assert.equal(treatRadiation(state,health,300).removed,120);
  assert.equal(treatRadiation(state,health).ok,false);
});
test('invalid treatment cannot reduce radiation or consume a medicine effect',()=>{
  const state={version:1,rads:200},health=createPlayerHealth();
  assert.equal(treatRadiation(state,health,0).ok,false);
  assert.equal(state.rads,200);
  assert.equal(treatRadiation(state,health,Number.NaN).ok,false);
});
test('saved radiation is bounded and reapplied after respawn',()=>{
  const state=safeRadiationSnapshot({rads:1500});
  assert.equal(state.rads,1000);
  const valid=safeRadiationSnapshot({rads:183.5});
  const health=createPlayerHealth();
  assert.equal(syncRadiationHealth(valid,health),82);
  assert.equal(health.health,82);
  assert.deepEqual(safeRadiationSnapshot(null),createRadiationState());
});

test('radiation treatment is real Aid sold by the medic, not a free HUD button',()=>{
  const cure=getItem('supply:rad-flush');
  assert.equal(cure.radCure,300);
  assert.equal(inventorySection(cure),'aid');
  assert.equal(vendorAccepts('medic',cure.id),true);
  assert.equal(vendorAccepts('scavenger',cure.id),false);
  assert.ok(VENDORS.find(v=>v.id==='medic').offers.some(o=>o.itemId===cure.id));
});

test('the field and power armor both display live radiation, and world exposure is saved',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  const html=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');
  for(const fragment of ['radiationExposureAt(player.x,player.z)',
    'applyRadiationExposure(radiationState,playerHealth',
    "beginPlayerDeath('RADIATION','EXPOSURE')",
    'radiationHealthBar(radiationState,playerHealth,PLAYER_MAX_HEALTH)',
    'radiationThreatLevel(receivedRadiationRate)',
    "setVisorDial('rads',currentRadiationLevel/6*100)",
    'levelChanged||(inRadiation&&refreshDisplay)',
    "$('fieldRadiationBlock').style.width=bar.radiationPercent",
    "$('healthRadiationBlock').style.width=bar.radiationPercent",
    'saveRadiation();','syncRadiationHealth(radiationState,playerHealth)',
    "treatRadiation(radiationState,playerHealth,item.radCure)",
    "plateCondition(powerArmorState,slot)"])
    assert.ok(main.includes(fragment),fragment);
  for(const element of ['id="fieldRadStatus"','id="fieldMaxHealth"',
    'id="visorRadsNumber"','id="visorRadsGauge"',
    'id="fieldRadiationBlock"','id="healthRadiationBlock"'])
    assert.ok(html.includes(element),element);
  assert.doesNotMatch(main,/playerHealth\.health\/playerHealth\.maxHealth/,
    'shrinking maximum HP must not keep the visible HP bar full');
  assert.match(main,/buildVisorDial\('rads','visorRadsGauge',\{tickCount:6,majorEvery:1,maxValue:6/);
  assert.match(main,/\.\.\/inventory\.mjs\?v=W20\.89/,
    'updated medical supplies must not use the previous cached module');
  assert.match(main,/\.\.\/vendors\.mjs\?v=W20\.85/,
    'updated merchant stock must not use the previous cached module');
  assert.doesNotMatch(main,/Radiation gameplay is not implemented yet/);
});
