import test from 'node:test';
import assert from 'node:assert/strict';
import {enemyFacingError,enemyFacingTarget,enemyShotTarget}
  from './enemy-fire-control.mjs';
import {makeEnemyTactics,attemptEnemyShot}
  from './enemy-tactics.mjs';
import {readFileSync} from 'node:fs';

test('a stationary target is aimed at directly; there is no artificial lead',()=>{
  const origin={x:0,y:1.4,z:0};
  const target={x:0,y:1.36,z:12};
  assert.deepEqual(enemyShotTarget(origin,target,{hit:true}),target);
  assert.deepEqual(enemyShotTarget(origin,target,{hit:true,rng:()=>.9}),target);
  const right=enemyShotTarget(origin,target,{rng:()=>0,accuracy:.55});
  const left=enemyShotTarget(origin,target,{rng:()=>.5,accuracy:.55});
  assert.ok(right.x<-.5&&left.x>.5,'misses fall on opposite sides of the player');
  assert.ok(Math.abs(right.x+left.x)<1e-8,'no preferred leading direction');
  assert.equal(right.z,12);
  assert.equal(left.z,12);
  const up=enemyShotTarget(origin,target,{rng:()=>.25});
  const down=enemyShotTarget(origin,target,{rng:()=>.75});
  assert.ok(up.y>target.y+.3&&down.y<target.y-.3);
});

test('only a visually aligned NPC is ready to shoot at any compass seam',()=>{
  const guard={x:3,z:4,yaw:0};
  assert.ok(enemyFacingTarget(guard,{x:3,z:12}));
  assert.ok(!enemyFacingTarget(guard,{x:10,z:4}));
  assert.ok(enemyFacingError({...guard,yaw:Math.PI-.01},
    {x:3.08,z:-12})<.05);
  assert.ok(!enemyFacingTarget(guard,{x:10,z:12},10));
});

test('steady aim rewards watching a still player without giving perfect accuracy',()=>{
  const ready=makeEnemyTactics('raider');ready.cooldown=0;
  const unsettled=attemptEnemyShot(ready,12,false,()=>.99);
  const focused=makeEnemyTactics('raider');focused.cooldown=0;
  const settled=attemptEnemyShot(focused,12,false,()=>.99,
    {aimSeconds:1.6,targetSpeed:0});
  const running=makeEnemyTactics('raider');running.cooldown=0;
  const moving=attemptEnemyShot(running,12,false,()=>.99,
    {aimSeconds:1.6,targetSpeed:4.5});
  assert.ok(settled.accuracy>unsettled.accuracy);
  assert.ok(moving.accuracy<settled.accuracy);
  assert.ok(settled.accuracy<.91,'stationary players must still be able to survive a miss');
});

test('the game fires from the authentic muzzle using current player coordinates',()=>{
  const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
  assert.match(main,/enemyFacingTarget\(enemy\.brain,player/);
  assert.match(main,/enemyShotTarget\(origin,/);
  assert.match(main,/getMuzzleWorldPosition\(\)/);
  assert.doesNotMatch(main,/target\.x\+=side\*\(1\.8/);
  assert.match(main,/targetSpeed:weaponMotion\.speed/);
  assert.match(main,/phase:enemy\.tactics\.phase/);
});

test('NPC animation uses measured walking speed instead of full-speed foot sliding',()=>{
  const source=readFileSync(new URL('./npc-avatar.mjs',import.meta.url),'utf8');
  assert.match(source,/locomotionSpeed\+=\(targetSpeed-locomotionSpeed\)/);
  assert.match(source,/speed:locomotionSpeed/);
  assert.doesNotMatch(source,/Math\.max\(1\.7,speed\)/);
  assert.match(source,/suppressedBlend/);
  assert.match(source,/lateralSpeed/);
});
