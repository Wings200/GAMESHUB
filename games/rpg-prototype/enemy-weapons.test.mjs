import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_WEAPONS,chooseEnemyWeapon,equipEnemyWeapon,
  weaponForTactics,makeEnemyTactics,attemptEnemyShot,
  tickEnemyTactics} from './enemy-tactics.mjs';
import {createEnemyBrain} from './enemy-ai.mjs';
test('six genuine firearms rotate by enemy role and test round',()=>{
  assert.equal(Object.keys(ENEMY_WEAPONS).length,6);
  for(const type of ['scout','raider','enforcer']){
    const first=chooseEnemyWeapon(type,0),second=chooseEnemyWeapon(type,1);
    assert.notEqual(first.id,second.id);
    assert.equal(first.kind,type);
    assert.equal(second.kind,type);
  }
});
test('automatic fire consumes a timed burst, pauses, then starts again',()=>{
  const t=makeEnemyTactics('scout');
  equipEnemyWeapon(t,'compact-smg');
  const spec=weaponForTactics(t);t.cooldown=0;
  for(let i=0;i<spec.burstSize;i++){
    assert.equal(attemptEnemyShot(t,5,false,()=>0).fired,true);
    if(i<spec.burstSize-1){
      assert.equal(t.cooldown,spec.shotInterval);
      t.cooldown=0;
    }
  }
  assert.equal(t.cooldown,spec.burstPause);
  assert.equal(t.magazine,spec.magazine-spec.burstSize);
  assert.equal(attemptEnemyShot(t,5,false,()=>0).fired,false);
  const brain=createEnemyBrain({x:40,z:40,patrol:[{x:40,z:40}]});
  for(let i=0;i<30;i++)tickEnemyTactics(t,brain,{x:40,z:37},.05,[],{targetVisible:true});
  assert.ok(t.cooldown===0);
  assert.equal(attemptEnemyShot(t,5,false,()=>0).fired,true);
});
test('semi-automatic pipe rifle stays single-shot and reloads its own magazine',()=>{
  const t=makeEnemyTactics('raider');
  equipEnemyWeapon(t,'pipe-rifle');t.cooldown=0;
  assert.equal(attemptEnemyShot(t,5,false,()=>0).fired,true);
  assert.equal(t.cooldown,ENEMY_WEAPONS['pipe-rifle'].shotInterval);
  assert.equal(t.burstCount,0);
  assert.throws(()=>equipEnemyWeapon(t,'heavy-lmg'),/Incompatible/);
});
test('different firearms have meaningful damage, audio and capacity',()=>{
  const a=ENEMY_WEAPONS['compact-smg'],b=ENEMY_WEAPONS['heavy-lmg'];
  assert.ok(b.magazine>a.magazine);
  assert.ok(b.reloadSeconds>a.reloadSeconds);
  assert.ok(a.shotInterval<b.shotInterval);
  assert.notEqual(a.soundKind,b.soundKind);
  assert.ok(a.damage<b.damage);
});
