import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_TUNING,createEnemyBrain,alertEnemy,resetEnemyBrain,hasSight,
  visibleTargetHeight,lineIntersectsBox3D,enemyAimPitch,
  lineIntersectsBox,stepEnemyBrain,hearEnemyGunshot} from './enemy-ai.mjs';
const bot=(x=45,z=40)=>createEnemyBrain({
  x,z,yaw:-Math.PI/2,patrol:[{x:44,z:40},{x:53,z:40}]
});
test('Enemy patrols between waypoints inside test arena',()=>{
  const e=bot();
  const start=e.x;
  for(let i=0;i<120;i++)stepEnemyBrain(e,{x:-100,z:0},.05,[],{playerInArena:false});
  assert.ok(e.x!==start);
  assert.equal(e.mode,'patrol');
  assert.ok(e.x>=AI_TUNING.area.minX&&e.x<=AI_TUNING.area.maxX);
});
test('Facing west sees a nearby player and pursues but does not overlap them',()=>{
  const e=bot();
  const player={x:36,z:40};
  assert.equal(hasSight(e,player),true);
  for(let i=0;i<240;i++)stepEnemyBrain(e,player,.05);
  assert.equal(e.mode,'chase');
  assert.ok(e.x<45);
  assert.ok(Math.hypot(e.x-player.x,e.z-player.z)>=AI_TUNING.stopDistance-.2);
});
test('Facing away and crate occlusion prevent detection',()=>{
  const e=bot();
  assert.equal(hasSight({...e,yaw:Math.PI/2},{x:36,z:40}),false);
  const wall={minX:39,maxX:41,minZ:38,maxZ:42};
  assert.equal(lineIntersectsBox({x:45,z:40},{x:36,z:40},wall),true);
  assert.equal(hasSight(e,{x:36,z:40},[wall]),false);
  assert.equal(lineIntersectsBox({x:45,z:40},{x:36,z:28},wall),false);
});
test('Enemies can spot exposed long-range targets but not across cover or beyond sight range',()=>{
  const e=bot(45,40);
  assert.equal(hasSight(e,{x:12,z:40}),true);
  assert.equal(hasSight(e,{x:-2,z:40}),false);
  assert.equal(hasSight(e,{x:12,z:40},[{minX:29,maxX:31,minZ:38,maxZ:42}]),false);
});
test('A hit alerts an enemy even when their back is turned',()=>{
  const e=bot();
  e.yaw=Math.PI/2;
  alertEnemy(e,{x:36,z:40});
  assert.equal(e.mode,'chase');assert.deepEqual(e.lastSeen,{x:36,z:40});
  stepEnemyBrain(e,{x:36,z:40},.04);
  assert.equal(e.mode,'investigate');
});
test('Lost enemies investigate last seen location, search, then patrol',()=>{
  const e=bot();
  alertEnemy(e,{x:36,z:40});
  for(let i=0;i<Math.ceil((AI_TUNING.lastSeenSeconds+1)/.05);i++)
    stepEnemyBrain(e,{x:-300,z:0},.05,[],{playerInArena:false});
  assert.equal(e.mode,'search');
  for(let i=0;i<Math.ceil((AI_TUNING.searchSeconds+1)/.05);i++)
    stepEnemyBrain(e,{x:-300,z:0},.05,[],{playerInArena:false});
  assert.equal(e.mode,'patrol');
  assert.equal(e.retaliationTime,0);
});
test('Disabled/out-of-station AI pauses and reset clears state',()=>{
  const e=bot();
  stepEnemyBrain(e,{x:36,z:40},.05,[],{enabled:false});
  assert.equal(e.x,45);assert.equal(e.mode,'patrol');
  alertEnemy(e,{x:36,z:40});
  resetEnemyBrain(e);
  assert.equal(e.mode,'patrol');assert.equal(e.x,45);
  assert.equal(e.lastSeen,null);
});
test('Movement slides against crates and cannot walk out of arena',()=>{
  const e=bot();
  e.yaw=-Math.PI/2;
  const obstacle={minX:42,maxX:43,minZ:38,maxZ:42};
  for(let i=0;i<100;i++)stepEnemyBrain(e,{x:36,z:40},.05,[obstacle]);
  assert.ok(e.x>=obstacle.maxX+AI_TUNING.collisionRadius-.01);
  assert.ok(e.x>=AI_TUNING.area.minX);
});
test('Large frame time is clamped and invalid spawn is rejected',()=>{
  assert.throws(()=>createEnemyBrain({x:NaN,z:20}),/finite/);
  const e=bot();
  stepEnemyBrain(e,{x:-100,z:0},100,[],{playerInArena:false});
  assert.ok(Math.hypot(e.x-45,e.z-40)<.1);
});


test('W09.10 a hidden player cannot steer NPC turning or cancel last-known pursuit',()=>{
  const e=bot(45,40),sighting={x:43,z:40};
  const wall={minX:39,maxX:41,minZ:38,maxZ:42,height:2.8};
  alertEnemy(e,sighting);
  const hiddenA={x:36,z:39},hiddenB={x:35,z:41};
  assert.equal(hasSight(e,hiddenA,[wall]),false);
  assert.equal(hasSight(e,hiddenB,[wall]),false);
  const original=e.x;
  // A previous cover/hold order must not prevent investigation.
  stepEnemyBrain(e,hiddenA,.05,[wall],{combatHold:true});
  assert.equal(e.mode,'investigate');
  assert.deepEqual(e.lastSeen,sighting);
  assert.ok(e.x<original,'NPC must move toward its last actual sighting');
  const a=structuredClone(e),b=structuredClone(e);
  stepEnemyBrain(a,hiddenA,.05,[wall],{
    combatGoal:{x:50,z:45},combatFacePlayer:true
  });
  stepEnemyBrain(b,hiddenB,.05,[wall],{
    combatGoal:{x:50,z:45},combatFacePlayer:true
  });
  assert.deepEqual({x:a.x,z:a.z,yaw:a.yaw,mode:a.mode},
    {x:b.x,z:b.z,yaw:b.yaw,mode:b.mode},
    'Moving behind an opaque wall must never change the bot direction');
  assert.deepEqual(a.lastSeen,sighting);
});
test('W09.10 alerted NPC can inspect a last sighting beyond arena boundary',()=>{
  const e=bot(45,40);
  alertEnemy(e,{x:30,z:40});
  for(let i=0;i<115;i++)
    stepEnemyBrain(e,{x:-10,z:-10},.05,[],{
      playerInArena:false,area:AI_TUNING.navigationArea
    });
  assert.ok(e.x<AI_TUNING.area.minX-1,
    'Station 9 boundary must not stop a pursuit at an invisible line');
});


test('W09.9 NPC searches corners for 30 to 60 seconds after losing sight',()=>{
  const total=AI_TUNING.lastSeenSeconds+AI_TUNING.searchSeconds;
  assert.ok(total>=30&&total<=60,'Pursuit/search must last 30–60 seconds');
  const e=bot(45,40);
  alertEnemy(e,{x:43,z:40});
  const hidden={x:-200,z:0};
  let movedFar=false,sawSearch=false;
  for(let i=0;i<Math.ceil((total-2)/.05);i++){
    stepEnemyBrain(e,hidden,.05,[],{playerInArena:false});
    if(Math.hypot(e.x-45,e.z-40)>1.1)movedFar=true;
    if(e.mode==='search')sawSearch=true;
    assert.deepEqual(e.lastSeen,{x:43,z:40});
  }
  assert.ok(movedFar,'NPC must physically inspect nearby positions');
  assert.ok(sawSearch,'NPC should scan its last known area before relaxing');
  assert.notEqual(e.mode,'patrol','Enemy should remain alerted near 43 seconds');
  for(let i=0;i<80;i++)stepEnemyBrain(e,hidden,.05,[],{playerInArena:false});
  assert.equal(e.mode,'patrol','NPC relaxes only after the alert window');
  assert.equal(e.lastSeen,null);
});

test('W19 enemies hear nearby gunfire without cheating on hidden player position',()=>{
  const e=bot(45,40);
  e.yaw=Math.PI/2; // looking away
  assert.equal(hearEnemyGunshot(e,{x:36,z:40},[],()=>.5),true);
  assert.deepEqual(e.noiseTarget,{x:36,z:40});
  assert.equal(e.lastSeen,null);
  assert.equal(e.mode,'investigate-noise');
  const start=e.x;
  for(let i=0;i<60;i++)
    stepEnemyBrain(e,{x:58,z:49},.05,[],{playerInArena:false,
      area:AI_TUNING.navigationArea});
  assert.ok(e.x<start-1,'Sound leads to a physical investigation');
  assert.equal(e.lastSeen,null,'Noise never creates a visual sighting');
  for(let i=0;i<220;i++)
    stepEnemyBrain(e,{x:58,z:49},.05,[],{playerInArena:false,
      area:AI_TUNING.navigationArea});
  assert.equal(e.mode,'patrol','Unconfirmed sound eventually expires');
});
test('Solid walls reduce hearing distance and active sightings remain authoritative',()=>{
  const wall={minX:38,maxX:40,minZ:30,maxZ:50,height:2.8};
  const e=bot(45,40);
  assert.equal(hearEnemyGunshot(e,{x:13,z:40},[wall],()=>.5),false);
  assert.equal(hearEnemyGunshot(e,{x:18,z:40},[],()=>.5),true);
  assert.ok(e.noiseTarget);
  alertEnemy(e,{x:36,z:40});
  assert.equal(hearEnemyGunshot(e,{x:18,z:40},[],()=>.5),false);
  assert.equal(e.noiseTarget,null);
});

test('A fresh hidden gunshot redirects stale visual memory without exposing the player',()=>{
  const e=bot(45,40);
  alertEnemy(e,{x:36,z:40});
  stepEnemyBrain(e,{x:99,z:99},.05,[],{playerInArena:false,
    area:AI_TUNING.navigationArea});
  assert.equal(e.spotted,false);
  const prior=e.lastSeen;
  assert.equal(hearEnemyGunshot(e,{x:51,z:42},[],()=>.85),true);
  assert.equal(e.memory>0,true);
  assert.deepEqual(e.lastSeen,prior,'Hearing is never a new precise sighting');
  stepEnemyBrain(e,{x:-52,z:-42},.05,[],{playerInArena:false,
    area:AI_TUNING.navigationArea});
  assert.equal(e.mode,'investigate-noise');
  assert.notDeepEqual(e.noiseTarget,prior);
  for(let i=0;i<220;i++)stepEnemyBrain(e,{x:-52,z:-42},.05,[],{
    playerInArena:false,area:AI_TUNING.navigationArea});
  assert.equal(e.mode,'investigate',
    'After a sound fades, the earlier visual memory is still usable');
});


test('W20.16 a close circling player stays trackable after the guard is alerted',()=>{
  const e=bot(45,40);
  alertEnemy(e,{x:45,z:37});
  const wall={minX:44.3,maxX:44.7,minZ:38,maxZ:39,height:2.8};
  // An alerted enemy can hear an opponent stepping immediately behind them.
  e.yaw=0;
  assert.equal(hasSight(e,{x:45,z:37}),true);
  assert.equal(hasSight(e,{x:45,z:37},[wall]),true);
  assert.equal(hasSight(e,{x:44.5,z:37},[{minX:44.65,maxX:44.95,minZ:38,maxZ:39}]),false,
    'walls still fully block tracking at close range');
  // Closing distance allows a finite but faster pursuit turn.
  const target={x:45,z:37};
  stepEnemyBrain(e,target,.05,[],{combatHold:true});
  assert.ok(e.yaw>0.25&&e.yaw<.36,'guard turns rapidly without snapping 180 degrees');
  let maxLock=0;
  for(let i=0;i<22;i++){
    const angle=i*.29;
    const player={x:45+3*Math.sin(angle),z:40+3*Math.cos(angle)};
    stepEnemyBrain(e,player,.05,[],{combatHold:true});
    maxLock=Math.max(maxLock,e.aimLockSeconds);
  }
  assert.ok(maxLock>.45,'a nearby orbit does not reset every reaction windup');
});


test('W20.39 patrol turns pause naturally and actual speed reflects movement',()=>{
  const e=createEnemyBrain({x:45,z:40,patrol:[{x:45,z:40},{x:53,z:40}]});
  stepEnemyBrain(e,{x:-100,z:0},.05,[],{playerInArena:false});
  assert.equal(e.moving,false);
  assert.equal(e.actualSpeed,0);
  assert.ok(e.patrolPause>.3);
  const start=e.x;
  for(let i=0;i<25;i++)
    stepEnemyBrain(e,{x:-100,z:0},.05,[],{playerInArena:false});
  assert.ok(e.x>start+.4,'moves after a perceptible turn pause');
  assert.ok(e.actualSpeed>0&&e.actualSpeed<=AI_TUNING.patrolSpeed+.01);
  stepEnemyBrain(e,{x:-100,z:0},.05,[],{enabled:false});
  assert.equal(e.actualSpeed,0,'frozen NPCs do not play running animation');
});

test('W20.39 neighboring NPCs leave space and respect solid geometry',()=>{
  const e=createEnemyBrain({x:43,z:40,patrol:[{x:43,z:40},{x:54,z:40}]});
  const other=createEnemyBrain({x:43.15,z:40,patrol:[{x:43.15,z:40},{x:54,z:40}]});
  for(let i=0;i<50;i++){
    stepEnemyBrain(e,{x:-100,z:0},.05,[],{
      playerInArena:false,neighbors:[other]});
    stepEnemyBrain(other,{x:-100,z:0},.05,[],{
      playerInArena:false,neighbors:[e]});
  }
  const gap=Math.hypot(e.x-other.x,e.z-other.z);
  assert.ok(gap>=AI_TUNING.collisionRadius*2+.07,
    'actors should not occupy the same capsule');
  for(const npc of [e,other])
    assert.ok(Number.isFinite(npc.actualSpeed)&&npc.actualSpeed>=0);
});

test('W20.39 brief cover commitment never uses the actual hidden player position',()=>{
  const target={x:37,z:40},cover={x:48,z:43};
  const first=createEnemyBrain({x:45,z:40});
  const second=createEnemyBrain({x:45,z:40});
  for(const e of [first,second])alertEnemy(e,target);
  const opts={targetVisible:false,combatCoverCommitted:true,combatGoal:cover,
    combatFacePlayer:true,area:AI_TUNING.navigationArea};
  for(let i=0;i<30;i++){
    stepEnemyBrain(first,{x:-40,z:-45},.05,[],opts);
    stepEnemyBrain(second,{x:59,z:49},.05,[],opts);
  }
  assert.deepEqual([first.x,first.z,first.yaw],[second.x,second.z,second.yaw],
    'different unseen player positions cannot steer cover movement');
  assert.ok(Math.hypot(first.x-45,first.z-40)>1);
  assert.deepEqual(first.lastSeen,target);
});

test('W20.45 a tall power-armored target is visible above low cover',()=>{
  const guard=createEnemyBrain({x:0,z:0,yaw:0});
  const crate={minX:-1,maxX:1,minZ:4.5,maxZ:5.5,height:1.60};
  const armored={x:0,z:10,aimY:1.72,headY:2.10};
  assert.equal(hasSight(guard,armored,[crate]),true);
  assert.equal(visibleTargetHeight(guard,armored,[crate]),armored.aimY);
  const normal={x:0,z:10,aimY:1.28,headY:1.55};
  assert.equal(hasSight(guard,normal,[crate]),false);
  const wall={...crate,height:3.0};
  assert.equal(hasSight(guard,armored,[wall]),false,
    'tall opaque walls must still block actual vision');
});

test('W20.45 a guard sees an exposed helmet, but not a hidden torso',()=>{
  const guard=createEnemyBrain({x:0,z:0,yaw:0});
  const tallCover={minX:-1,maxX:1,minZ:4.8,maxZ:5.2,height:1.86};
  const target={x:0,z:10,aimY:1.5,headY:2.3};
  assert.equal(visibleTargetHeight(guard,target,[tallCover]),2.3);
  assert.equal(lineIntersectsBox3D({x:0,y:1.53,z:0},
    {x:0,y:1.5,z:10},tallCover),true);
  assert.equal(lineIntersectsBox3D({x:0,y:1.53,z:0},
    {x:0,y:2.3,z:10},tallCover),false);
});

test('W20.45 enemy aiming changes elevation for higher targets',()=>{
  const from={x:0,z:0};
  const level=enemyAimPitch(from,{x:0,z:5,y:1.43});
  const up=enemyAimPitch(from,{x:0,z:5,y:2.10});
  const down=enemyAimPitch(from,{x:0,z:5,y:.75});
  assert.equal(level,0);
  assert.ok(up>0.12&&up<.2,'barrel should visibly lift toward high armor');
  assert.ok(down<-.12,'lower targets require downward aim');
});
