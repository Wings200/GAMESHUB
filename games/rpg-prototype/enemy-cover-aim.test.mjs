import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseClearPeekSide,projectedPeekSide,lineIntersectsBox3D,visibleTargetHeight,
  enemyAimPitch} from './enemy-ai.mjs';

const main=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
const avatar=readFileSync(new URL('./npc-avatar.mjs',import.meta.url),'utf8');

test('an enemy sees a head above cover but its low muzzle cannot shoot through the rock',()=>{
  const rock={minX:-.5,maxX:.5,minZ:-.5,maxZ:.5,height:1.45};
  const enemy={x:1.8,z:0,eyeY:1.92};
  const player={x:-1.8,z:0,aimY:1.12,headY:1.69};
  assert.equal(visibleTargetHeight(enemy,player,[rock]),1.69);
  const lowMuzzle={x:1.8,y:1.18,z:0};
  assert.equal(lineIntersectsBox3D(lowMuzzle,
    {x:player.x,y:player.headY,z:player.z},rock,.035),true);
  const raisedMuzzle={...lowMuzzle,y:1.95};
  assert.equal(lineIntersectsBox3D(raisedMuzzle,
    {x:player.x,y:player.headY,z:player.z},rock,.035),false);
  assert.ok(enemyAimPitch(enemy,{...player,y:player.headY},raisedMuzzle.y)<0,
    'weapon pitch must be recalculated after lifting the barrel');
});

test('shoulder peek chooses a genuinely clear side, never a blocked wall shot',()=>{
  const rock={minX:-.5,maxX:.5,minZ:-.5,maxZ:.5,height:2};
  const enemy={x:.65,y:1.2,z:-1};
  const target={x:-1.5,y:1.8,z:0};
  assert.ok(lineIntersectsBox3D(enemy,target,rock,.035));
  assert.equal(chooseClearPeekSide(enemy,target,-Math.PI/2,[rock]),-1);
  const blocked={x:2,y:1.2,z:0};
  assert.equal(chooseClearPeekSide(blocked,target,-Math.PI/2,[rock]),0,
    'leaning a shoulder width must not allow fire through solid cover');
});

test('right and left peek directions remain correct at every compass heading',()=>{
  const center={x:0,z:0};
  for(const [yaw,right,left] of [
    [0,{x:1,z:0},{x:-1,z:0}],
    [Math.PI/2,{x:0,z:-1},{x:0,z:1}],
    [Math.PI,{x:-1,z:0},{x:1,z:0}],
    [-Math.PI/2,{x:0,z:1},{x:0,z:-1}]
  ]){
    assert.equal(projectedPeekSide(center,right,yaw),1);
    assert.equal(projectedPeekSide(center,left,yaw),-1);
  }
  assert.equal(projectedPeekSide(center,center,0),0,
    'forward-only movement must not invent a sideways lean');
});

test('an equally clear corner honors the chosen side rather than always leaning right',()=>{
  const muzzle={x:0,y:1.5,z:0},target={x:0,y:1.5,z:4};
  assert.equal(chooseClearPeekSide(muzzle,target,0,[],.32,-1),-1);
  assert.equal(chooseClearPeekSide(muzzle,target,0,[],.32,1),1);
});

test('rendered NPC head drives sight and the real muzzle drives shots',()=>{
  assert.match(main,/rigged\?\.hitJoints\?\.head/);
  assert.match(main,/getMuzzleWorldPosition\(\)/);
  assert.match(main,/firstSolidHit\(muzzle,targetPoint,enemySightObstacles\)/);
  assert.match(main,/aiming:shouldAim,aimPitch,aimYaw,raiseGun,peekLean/);
  assert.match(main,/chooseClearPeekSide\(muzzle,targetPoint/);
  assert.match(main,/enemy\.tacticalLeanPoint!==enemy\.tactics\.peekPoint/);
  assert.match(main,/enemy\.tacticalLeanSide=clearSide\|\|plannedPeekSide/);
  assert.match(main,/firstSolidHit\(origin,target,enemySightObstacles\)/);
});

test('animated cover pose lifts weapon and tilts actual visible head and torso',()=>{
  assert.match(avatar,/gunRaiseBlend\*\.39/);
  assert.match(avatar,/mount\.position\.set\(\.17-leanBlend\*\.18/);
  assert.match(avatar,/avatar\.hitJoints\.torso\.rotation\.z\+=[\s\S]*?leanBlend\*\.26/);
  assert.match(avatar,/avatar\.hitJoints\.head\.rotation\.z\+=leanBlend\*\.12/);
  assert.match(avatar,/avatar\.setWeaponGripTargets\(/);
});
