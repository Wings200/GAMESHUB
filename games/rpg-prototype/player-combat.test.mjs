import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnemyBrain,alertEnemy,stepEnemyBrain} from './enemy-ai.mjs';
import {PLAYER_MAX_HEALTH,ENEMY_ATTACK,createPlayerHealth,hitPlayer,
  resetPlayerHealth,canEnemyFire} from './player-combat.mjs';
test('HUD starts with 100 health and valid death/reset rules',()=>{
  const p=createPlayerHealth();
  assert.equal(p.health,PLAYER_MAX_HEALTH);assert.equal(p.maxHealth,100);
  assert.equal(p.alive,true);
  assert.equal(hitPlayer(p,7).health,93);
  assert.equal(p.hits,1);
  assert.equal(hitPlayer(p,500).health,0);
  assert.equal(p.alive,false);
  assert.equal(hitPlayer(p,10).applied,false);
  resetPlayerHealth(p);
  assert.equal(p.health,100);assert.equal(p.hits,0);assert.equal(p.alive,true);
});
test('Damage handles invalid amounts without accidentally healing',()=>{
  const p=createPlayerHealth();
  assert.equal(hitPlayer(p,NaN).damage,0);
  assert.equal(hitPlayer(p,-25).damage,0);
  assert.equal(p.health,100);
});
test('Enemies cannot shoot beyond range, while patrolling or behind cover',()=>{
  const e=createEnemyBrain({x:40,z:42,yaw:-Math.PI/2,patrol:[{x:40,z:42}]});
  const p={x:31,z:42};
  assert.equal(canEnemyFire(e,p),false);
  e.mode='chase';
  assert.equal(canEnemyFire(e,p),true);
  assert.equal(canEnemyFire(e,{x:15,z:42}),true);
  assert.equal(canEnemyFire(e,{x:-10,z:42},[],ENEMY_ATTACK.scout.range),true, 'alerted bots return fire beyond normal sight range');
  assert.equal(canEnemyFire(e,{x:-35,z:42},[],ENEMY_ATTACK.scout.range),false, 'retaliation ends at weapon range');
  assert.equal(canEnemyFire(e,{x:-10,z:42},[{minX:3,maxX:6,minZ:41,maxZ:43}],70),false,
    'distance never permits shooting through solid cover');
  assert.equal(canEnemyFire(e,{x:10,z:42},[],ENEMY_ATTACK.raider.range),true);
  assert.equal(canEnemyFire(e,p,[{minX:35,maxX:36,minZ:40,maxZ:44}]),false);
  assert.equal(canEnemyFire({...e,yaw:Math.PI/2},p),false);
  e.active=false;
  assert.equal(canEnemyFire(e,p),false);
});
test('A distant hit wakes an NPC and permits temporary line-of-sight retaliation',()=>{
  const e=createEnemyBrain({x:40,z:42,yaw:-Math.PI/2});
  const shooter={x:-20,z:42}; // 60 metres; outside routine vision
  alertEnemy(e,shooter);
  stepEnemyBrain(e,shooter,.05,[],{playerInArena:true});
  assert.equal(e.mode,'investigate');
  assert.ok(e.retaliationTime>0);
  assert.equal(canEnemyFire(e,shooter,[],ENEMY_ATTACK.scout.range),true);
  assert.equal(canEnemyFire(e,shooter,[{minX:3,maxX:6,minZ:41,maxZ:43}],ENEMY_ATTACK.scout.range),false);
  e.retaliationTime=0;
  assert.equal(canEnemyFire(e,shooter,[],ENEMY_ATTACK.scout.range),false);
});
test('Each enemy uses finite per-attack damage, timing and distance',()=>{
  for(const [name,attack] of Object.entries(ENEMY_ATTACK)){
    assert.ok(['scout','raider','enforcer'].includes(name));
    assert.ok(attack.damage>=4&&attack.damage<=12);
    assert.ok(attack.interval>=2);
    assert.ok(attack.range>=60&&attack.range<=90);
  }
});
