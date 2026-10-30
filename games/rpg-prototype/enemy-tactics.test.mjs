import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnemyBrain,stepEnemyBrain} from './enemy-ai.mjs';
import {ENEMY_PROFILES,makeEnemyTactics,resetEnemyTactics,markEnemyThreat,
  pickCoverPoint,routeAroundCrates,tickEnemyTactics,beginReload,
  attemptEnemyShot} from './enemy-tactics.mjs';
const box={minX:40,maxX:42,minZ:39,maxZ:41};
const player={x:30,z:40};
const brain=()=>{const b=createEnemyBrain({
  x:46,z:43,yaw:-Math.PI/2,patrol:[{x:46,z:43}]});
  b.mode='chase';b.memory=3;b.spotted=true;return b;};
test('Scout, Raider and Enforcer have different accuracy, magazines, reload times and mobility',()=>{
  assert.equal(Object.keys(ENEMY_PROFILES).length,3);
  assert.ok(ENEMY_PROFILES.scout.magazine<ENEMY_PROFILES.raider.magazine);
  assert.ok(ENEMY_PROFILES.raider.magazine<ENEMY_PROFILES.enforcer.magazine);
  assert.ok(ENEMY_PROFILES.scout.reloadSeconds<ENEMY_PROFILES.enforcer.reloadSeconds);
  assert.ok(ENEMY_PROFILES.scout.accuracy<ENEMY_PROFILES.raider.accuracy);
  assert.ok(ENEMY_PROFILES.raider.accuracy<ENEMY_PROFILES.enforcer.accuracy);
});
test('Magazine is consumed and reload blocks shots until completed',()=>{
  const t=makeEnemyTactics('scout');t.cooldown=0;
  const spec=ENEMY_PROFILES.scout;
  const initialReserve=t.reserve;
  for(let i=0;i<spec.magazine;i++){
    t.cooldown=0;
    assert.equal(attemptEnemyShot(t,4,false,()=>0).fired,true);
  }
  assert.equal(t.magazine,0);
  assert.ok(t.reloadRemaining>0);
  assert.equal(attemptEnemyShot(t,4,false,()=>0).reason,'reloading');
  const b=brain();
  for(let i=0;i<70;i++)tickEnemyTactics(t,b,player,.05,[box]);
  assert.equal(t.reloadRemaining,0);
  assert.equal(t.magazine,spec.magazine);
  assert.equal(t.reserve,initialReserve-spec.magazine);
});
test('Shots can hit or miss; accuracy decreases with distance and movement',()=>{
  const t=makeEnemyTactics('raider');t.cooldown=0;
  const hit=attemptEnemyShot(t,3,false,()=>0);
  assert.equal(hit.fired,true);assert.equal(hit.hit,true);
  t.cooldown=0;
  const miss=attemptEnemyShot(t,16,true,()=>.99);
  assert.equal(miss.hit,false);
  assert.ok(miss.accuracy<hit.accuracy);
  assert.equal(t.hits,1);assert.equal(t.misses,1);
  assert.equal(t.shots,2);
});
test('Threat makes an alerted enemy choose actual occluded cover',()=>{
  const t=makeEnemyTactics('raider'),b=brain();
  const cover=pickCoverPoint(b,player,[box]);
  assert.ok(cover);
  assert.ok(cover.point.x>box.maxX);
  markEnemyThreat(t);
  tickEnemyTactics(t,b,player,.05,[box]);
  assert.ok(['cover','hold'].includes(t.phase));
  assert.ok(t.coverPoint);
  assert.ok(t.goal);
});
test('No cover geometry causes safe strafing instead of broken state',()=>{
  const t=makeEnemyTactics('scout'),b=brain();
  tickEnemyTactics(t,b,player,.05,[]);
  assert.equal(t.phase,'strafe');
  assert.ok(Number.isFinite(t.goal.x));
  assert.ok(Number.isFinite(t.goal.z));
  markEnemyThreat(t);
  tickEnemyTactics(t,b,player,.05,[]);
  assert.equal(t.coverPoint,null);
  assert.ok(['strafe','pursue'].includes(t.phase));
});
test('Pausing AI freezes timers/ammo; resets restore ammo, state and counters',()=>{
  const t=makeEnemyTactics('enforcer'),b=brain();
  t.magazine=1;t.cooldown=0;beginReload(t);
  const old=t.reloadRemaining;
  tickEnemyTactics(t,b,player,100,[box],{enabled:false});
  assert.equal(t.reloadRemaining,old);
  resetEnemyTactics(t);
  assert.equal(t.magazine,ENEMY_PROFILES.enforcer.magazine);
  assert.equal(t.shots,0);
  assert.equal(t.reloadRemaining,0);
});
test('Cover candidates reject area boundaries and route avoids colliders',()=>{
  const t=makeEnemyTactics('raider');
  assert.equal(pickCoverPoint(brain(),player,[]),null);
  assert.equal(routeAroundCrates({x:33,z:40},{x:38,z:40},[]).x,38);
  assert.throws(()=>makeEnemyTactics('ghost'),/Unknown enemy/);
  assert.equal(beginReload(t),false);
});

test('Shot raider reaches an occluded cover point using the real movement brain',()=>{
  const t=makeEnemyTactics('raider'),b=brain();
  markEnemyThreat(t);
  let reached=false;
  for(let i=0;i<120;i++){
    tickEnemyTactics(t,b,player,.05,[box]);
    stepEnemyBrain(b,player,.05,[box],{
      combatGoal:t.goal,combatHold:t.phase==='hold',
      combatFacePlayer:true,combatSpeed:ENEMY_PROFILES.raider.moveSpeed
    });
    if(t.phase==='hold'){reached=true;break;}
  }
  assert.ok(reached,'Enemy should reach safe cover instead of getting stuck');
  assert.ok(Math.hypot(b.x-t.coverPoint.x,b.z-t.coverPoint.z)<.75);
});
test('Combat strafing moves NPC without crossing arena boundary',()=>{
  const t=makeEnemyTactics('scout'),b=brain();
  const original={x:b.x,z:b.z};
  for(let i=0;i<26;i++){
    tickEnemyTactics(t,b,player,.05,[box]);
    stepEnemyBrain(b,player,.05,[box],{
      combatGoal:t.goal,combatFacePlayer:true,
      combatSpeed:ENEMY_PROFILES.scout.moveSpeed
    });
  }
  assert.ok(Math.hypot(b.x-original.x,b.z-original.z)>.1);
  assert.ok(b.x>=33.6&&b.x<=58.4&&b.z>=34.9&&b.z<=49.3);
});
