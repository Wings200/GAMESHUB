import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_TUNING,createEnemyBrain,alertEnemy,resetEnemyBrain,hasSight,
  lineIntersectsBox,stepEnemyBrain} from './enemy-ai.mjs';
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
