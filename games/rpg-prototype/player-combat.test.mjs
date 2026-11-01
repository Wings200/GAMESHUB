import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnemyBrain,alertEnemy,stepEnemyBrain} from './enemy-ai.mjs';
import {PLAYER_MAX_HEALTH,ENEMY_ATTACK,createPlayerHealth,hitPlayer,
  resetPlayerHealth,canEnemyFire,firstSolidHit} from './player-combat.mjs';
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


test('W09.9 wall hit clips enemy bullets before the player and prevents damage',()=>{
  const enemy={x:40,y:1.43,z:42},player={x:28,y:1.52,z:42};
  const wall={minX:34,maxX:36,minZ:39,maxZ:45,height:2.8};
  const hit=firstSolidHit(enemy,player,[wall]);
  assert.ok(hit&&hit.t>0&&hit.t<1);
  assert.ok(hit.point.x>=36&&hit.point.x<36.1);
  assert.equal(firstSolidHit(enemy,player,[]),null);
  assert.equal(firstSolidHit(enemy,{x:39,y:1.52,z:42},[wall]),null,
    'A wall behind the target does not block the player');
});

test('W09.9 bullet collision uses actual obstacle height, not just a 2D shadow',()=>{
  const from={x:40,y:1.43,z:42},to={x:28,y:1.52,z:42};
  const low={minX:34,maxX:36,minZ:39,maxZ:45,height:.7};
  const tall={minX:34,maxX:36,minZ:39,maxZ:45,height:2.8};
  assert.equal(firstSolidHit(from,to,[low]),null,'A shot can pass over low cover');
  assert.ok(firstSolidHit(from,to,[tall]),'A standing wall must block a bullet');
  assert.equal(firstSolidHit({x:40,y:3.2,z:42},{x:28,y:3.2,z:42},[tall]),null,
    'A bullet above the wall must not hit it');
  assert.ok(firstSolidHit(from,{x:20,y:1.5,z:44},[tall]),
    'An angled missed tracer must still clip against a wall');
});

test('W09.9 solid wall checking uses the same colliders as enemy sight',()=>{
  const enemy=createEnemyBrain({x:40,z:42,yaw:-Math.PI/2});
  enemy.mode='chase';
  const player={x:28,z:42};
  const worldWalls=[{minX:34,maxX:36,minZ:39,maxZ:45,height:2.8}];
  assert.equal(canEnemyFire(enemy,player,worldWalls,70),false);
  assert.ok(firstSolidHit({x:40,y:1.43,z:42},{x:28,y:1.52,z:42},worldWalls));
});
