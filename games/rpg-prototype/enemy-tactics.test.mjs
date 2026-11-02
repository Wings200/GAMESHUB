import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnemyBrain,stepEnemyBrain} from './enemy-ai.mjs';
import {ENEMY_PROFILES,makeEnemyTactics,resetEnemyTactics,markEnemyThreat,
  pickCoverPoint,isBehindCover,pickPeekPoint,routeAroundCrates,tickEnemyTactics,beginReload,
  attemptEnemyShot,equipEnemyWeapon,getEnemyWeapon,markEnemySuppressed} from './enemy-tactics.mjs';
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
test('Enforcer holds clear long-range angles while weaker roles must reposition',()=>{
  const b=brain(),t=makeEnemyTactics('enforcer'),far={x:16,z:43};
  tickEnemyTactics(t,b,far,.05,[]);
  assert.equal(t.phase,'suppress-long');assert.equal(t.goal,null);
  const oldX=b.x;
  stepEnemyBrain(b,far,.05,[],{combatHold:t.phase==='suppress-long'});
  assert.equal(b.x,oldX,'Enforcer should anchor instead of rushing across open ground');
  t.cooldown=0; // test immediate accuracy without the deliberate spawn delay
  const shot=attemptEnemyShot(t,30,false,()=>0);
  assert.equal(shot.fired,true);assert.ok(shot.accuracy>.4);
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
test('Distant return fire has visibly lower hit probability than mid-range fire',()=>{
  const tactics=makeEnemyTactics('enforcer');tactics.cooldown=0;
  const near=attemptEnemyShot(tactics,25,false,()=>.99);
  tactics.cooldown=0;
  const far=attemptEnemyShot(tactics,85,false,()=>.99);
  assert.equal(far.fired,true);
  assert.ok(far.accuracy<near.accuracy);
  assert.ok(far.accuracy<=.3);
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
  // The bot only strafes within its 15-metre combat range.
  const closePlayer={x:34,z:40};
  tickEnemyTactics(t,b,closePlayer,.05,[]);
  assert.equal(t.phase,'flank');
  assert.ok(Number.isFinite(t.goal.x));
  assert.ok(Number.isFinite(t.goal.z));
  markEnemyThreat(t);
  tickEnemyTactics(t,b,closePlayer,.05,[]);
  assert.equal(t.coverPoint,null);
  assert.ok(['flank','pursue'].includes(t.phase));
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
      targetVisible:true,combatGoal:t.goal,combatHold:t.phase==='hold',
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

test('A crate on the PLAYER side is not considered cover (both directions)',()=>{
  const crate={minX:40,maxX:42,minZ:39,maxZ:41,height:1.45};
  const west={x:30,z:40},east={x:51,z:40};
  const westCover=pickCoverPoint({x:45,z:43},west,[crate]);
  const eastCover=pickCoverPoint({x:37,z:43},east,[crate]);
  assert.ok(westCover&&eastCover);
  assert.ok(westCover.point.x>crate.maxX,'must shelter on east side against west player');
  assert.ok(eastCover.point.x<crate.minX,'must shelter on west side against east player');
  assert.equal(isBehindCover(west,{x:39,z:40},crate),false);
  assert.equal(isBehindCover(west,westCover.point,crate),true);
  assert.equal(isBehindCover(east,westCover.point,crate),false);
  assert.equal(isBehindCover(east,eastCover.point,crate),true);
});
test('Enemy crouches only behind a real blocker and stands when flanked',()=>{
  const crate={minX:40,maxX:42,minZ:39,maxZ:41,height:1.45};
  const t=makeEnemyTactics('raider'),b=brain();
  markEnemyThreat(t);
  let crouched=false;
  for(let i=0;i<200;i++){
    tickEnemyTactics(t,b,player,.05,[crate]);
    stepEnemyBrain(b,player,.05,[crate],{
      targetVisible:true,combatGoal:t.goal,combatHold:t.phase==='hold',
      combatFacePlayer:true,combatSpeed:ENEMY_PROFILES.raider.moveSpeed
    });
    if(t.crouching){crouched=true;break;}
  }
  assert.ok(crouched,'must eventually crouch behind the crate');
  assert.equal(t.phase,'hold');
  assert.equal(t.goal,null);
  assert.equal(isBehindCover(player,b,crate),true);
  const previous=t.coverPoint;
  const flankingPlayer={x:53,z:40};
  tickEnemyTactics(t,b,flankingPlayer,.05,[crate]);
  assert.equal(t.crouching,false,'must stand when flanked');
  assert.equal(t.phase,'cover');
  assert.notDeepEqual(t.coverPoint,previous,'must change side of crate after flank');
  assert.ok(t.coverPoint.x<crate.minX);
});
test('Very low objects are not accepted as protective crouching cover',()=>{
  const low={minX:40,maxX:42,minZ:39,maxZ:41,height:.5};
  const tall={minX:40,maxX:42,minZ:39,maxZ:41,height:1.6};
  assert.equal(pickCoverPoint(brain(),player,[low]),null);
  assert.ok(pickCoverPoint(brain(),player,[tall]));
});

test('Three enemy profiles select different genuine combat roles',()=>{
  const roles={scout:'flanker',raider:'skirmisher',enforcer:'anchor'};
  const expected={scout:'flank',raider:'strafe',enforcer:'suppress'};
  const target={x:34,z:40};
  for(const type of Object.keys(roles)){
    const t=makeEnemyTactics(type),b=brain();
    assert.equal(ENEMY_PROFILES[type].role,roles[type]);
    tickEnemyTactics(t,b,target,.05,[]);
    assert.equal(t.phase,expected[type]);
    assert.ok(t.goal&&Number.isFinite(t.goal.x));
  }
});
test('Cover peek point is OUTSIDE the crate sightline, never through crate',()=>{
  const crate={minX:40,maxX:42,minZ:39,maxZ:41,height:1.45};
  const shelter={x:42.8,z:40};
  const peek=pickPeekPoint(shelter,{x:30,z:40},[crate],0);
  assert.ok(peek,'must find an exposed corner reachable from shelter');
  assert.ok(Math.hypot(peek.x-shelter.x,peek.z-shelter.z)<4.5);
  assert.equal(isBehindCover({x:30,z:40},peek,crate),false);
});
test('Enemy ducks, advances to peek, then withdraws back behind cover',()=>{
  const crate={minX:40,maxX:42,minZ:39,maxZ:41,height:1.45};
  const target={x:30,z:40},b=brain(),t=makeEnemyTactics('raider');
  b.x=42.8;b.z=40;
  markEnemyThreat(t);
  let sawCover=false,sawPeek=false,sawReturn=false;
  for(let i=0;i<185;i++){
    tickEnemyTactics(t,b,target,.05,[crate]);
    if(t.phase==='hold'){sawCover=true;assert.equal(t.crouching,true);}
    if(t.phase==='peek'||t.phase==='peek-move'){
      sawPeek=true;assert.equal(t.crouching,false);
    }
    if(sawPeek&&t.phase==='cover')sawReturn=true;
    stepEnemyBrain(b,target,.05,[crate],{
      targetVisible:true,combatGoal:t.goal,combatHold:t.phase==='hold'||t.phase==='peek',
      combatFacePlayer:true,combatSpeed:ENEMY_PROFILES.raider.moveSpeed
    });
  }
  assert.equal(sawCover,true,'enemy must initially duck behind crate');
  assert.equal(sawPeek,true,'enemy must attempt to peek out of cover');
  assert.equal(sawReturn,true,'enemy must return behind cover after peek');
});
test('Occupied squad cover gets a crowding penalty',()=>{
  const boxes=[
    {minX:40,maxX:42,minZ:39,maxZ:41,height:1.6},
    {minX:47,maxX:49,minZ:39,maxZ:41,height:1.6}
  ];
  const target={x:30,z:40};
  const enemy={x:45,z:40};
  const baseline=pickCoverPoint(enemy,target,boxes);
  assert.ok(baseline);
  const occupied=[baseline.point];
  const reserved=pickCoverPoint(enemy,target,boxes,undefined,occupied);
  assert.ok(reserved);
  assert.notDeepEqual(reserved.point,baseline.point,
    'Second raider should avoid reserving identical crate corner');
});
test('Stuck NPC recognizes failed motion and attempts a different tactic',()=>{
  const t=makeEnemyTactics('raider'),b=brain();
  markEnemyThreat(t);
  const obstacles=[
    {minX:40,maxX:42,minZ:39,maxZ:41,height:1.45},
    {minX:48,maxX:50,minZ:38,maxZ:40,height:1.45}
  ];
  for(let i=0;i<65;i++)tickEnemyTactics(t,b,player,.05,obstacles);
  assert.ok(t.stuckEvents>0,'a bot not moving toward a goal must detect it');
  assert.ok(Number.isFinite(t.stuckSeconds));
  assert.ok(['cover','reload','hold','flank','strafe','suppress','pursue',
    'peek-move','peek'].includes(t.phase));
});


test('W09.9 NPC roles pick different movement paces and never crouch in open space',()=>{
  const target={x:34,z:40},speeds={};
  for(const role of ['scout','raider','enforcer']){
    const t=makeEnemyTactics(role),b=brain();
    tickEnemyTactics(t,b,target,.05,[]);
    assert.equal(t.crouching,false,'No cover means no protective crouch');
    assert.ok(t.pace>0,'A repositioning NPC must move');
    assert.ok(t.decisionReason.length>5,'Tactical choice explains its reason');
    speeds[role]=t.pace;
  }
  assert.ok(speeds.scout>speeds.raider);
  assert.ok(speeds.raider>speeds.enforcer);
});
test('W09.9 NPC flanks away from an occupied route instead of fixed side-stepping',()=>{
  const t=makeEnemyTactics('raider'),b=brain();
  const blockedSide={minX:44.9,maxX:45.9,minZ:44.9,maxZ:45.9,height:1.7};
  tickEnemyTactics(t,b,{x:34,z:40},.05,[blockedSide]);
  assert.equal(t.crouching,false);
  assert.equal(t.phase,'strafe');
  assert.equal(t.strafeSign,1,'AI should choose the safer available side');
  assert.ok(t.goal.z<43,'The chosen lane must avoid the blocked upper side');
  assert.ok(Number.isFinite(t.goal.x)&&Number.isFinite(t.goal.z));
});

test('W09.10 losing sight releases cover holds and really investigates last contact',()=>{
  const wall={minX:39,maxX:41,minZ:38,maxZ:42,height:2.8};
  const e=createEnemyBrain({x:45,z:40,yaw:-Math.PI/2,
    patrol:[{x:45,z:40}]}),t=makeEnemyTactics('raider');
  e.mode='chase';e.memory=24;e.spotted=true;e.lastSeen={x:43,z:40};
  markEnemyThreat(t);
  t.phase='hold';t.coverPoint={x:45,z:40};t.coverIndex=0;
  let nearest=Infinity;
  for(let frame=0;frame<80;frame++){
    tickEnemyTactics(t,e,e.lastSeen,.05,[wall],{targetVisible:false});
    assert.equal(t.goal,null,'No combat goal can override searching');
    assert.equal(t.crouching,false,'NPC must stand to investigate');
    assert.ok(['investigate','search'].includes(t.phase));
    stepEnemyBrain(e,{x:36,z:40},.05,[wall],{
      combatGoal:{x:51,z:45},combatHold:true,combatFacePlayer:true
    });
    nearest=Math.min(nearest,Math.hypot(e.x-43,e.z-40));
    if(nearest<.7)break;
  }
  assert.ok(nearest<.7,'NPC must physically check the last seen spot');
  assert.deepEqual(e.lastSeen,{x:43,z:40});
});

test('Equipped enemy guns reload to their own capacity, not generic role capacity',()=>{
  for(const [kind,weapon] of [['scout','compact-smg'],
    ['raider','raider-auto'],['enforcer','heavy-lmg']]){
    const t=makeEnemyTactics(kind);
    equipEnemyWeapon(t,weapon);
    const full=getEnemyWeapon(weapon).magazine;
    t.magazine=0;
    const previousReserve=t.reserve;
    assert.equal(beginReload(t),true);
    const brain={active:true,mode:'patrol',memory:0,x:40,z:40};
    for(let i=0;i<120;i++)tickEnemyTactics(t,brain,{x:40,z:30},.05,[],{});
    assert.equal(t.reloadRemaining,0,weapon);
    assert.equal(t.magazine,full,weapon);
    assert.equal(t.reserve,previousReserve-full,weapon);
  }
});

test('Near-miss suppression reduces fallible aim and fades when fire stops',()=>{
  const t=makeEnemyTactics('raider');
  equipEnemyWeapon(t,'raider-auto');
  t.cooldown=0;
  const accuracyFresh=attemptEnemyShot(t,8,false,()=>.99).accuracy;
  markEnemySuppressed(t,.95);
  assert.ok(t.suppression>.9&&t.threat>0);
  t.cooldown=0;
  const accuracyShaken=attemptEnemyShot(t,8,false,()=>.99).accuracy;
  assert.ok(accuracyShaken<accuracyFresh*.65);
  const brain={active:true,mode:'patrol',memory:0,x:40,z:40};
  for(let i=0;i<100;i++)tickEnemyTactics(t,brain,{x:40,z:30},.05,[],{});
  assert.equal(t.suppression,0);
});
