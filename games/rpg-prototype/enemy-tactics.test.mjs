import test from 'node:test';
import assert from 'node:assert/strict';
import {AI_TUNING,createEnemyBrain,stepEnemyBrain,lineIntersectsBox,hasSight} from './enemy-ai.mjs';
import {canEnemyFire,isEnemyAimAligned} from './player-combat.mjs';
import {squadSeparation,occupiedSquadCover} from './enemy-squad.mjs';
import {ENEMY_PROFILES,makeEnemyTactics,resetEnemyTactics,markEnemyThreat,
  pickCoverPoint,isBehindCover,pickPeekPoint,routeAroundCrates,tickEnemyTactics,beginReload,
  attemptEnemyShot,equipEnemyWeapon,getEnemyWeapon,markEnemySuppressed} from './enemy-tactics.mjs';
const box={minX:40,maxX:42,minZ:39,maxZ:41};
const player={x:30,z:40};
const brain=()=>{const b=createEnemyBrain({
  x:46,z:43,yaw:-Math.PI/2,patrol:[{x:46,z:43}]});
  b.mode='chase';b.memory=3;b.spotted=true;return b;};
test('W20.45 guards reject low cover that cannot shield an elevated shooter',()=>{
  const armored={x:0,z:0,aimY:3.5,headY:3.8};
  const spot={x:8,z:0};
  const crate={minX:4,maxX:6,minZ:-1,maxZ:1,height:1.4};
  assert.equal(isBehindCover({x:0,z:0},spot,crate),true,
    'on flat ground this rectangle looks like cover');
  assert.equal(isBehindCover(armored,spot,crate),false,
    'an elevated player can see over this cover');
  assert.equal(isBehindCover(armored,spot,{...crate,height:3}),true,
    'high, solid cover should still provide real shelter');
});
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


test('W20.39 scout flanking at the arena edge chooses a reachable movement goal',()=>{
  const e=createEnemyBrain({x:34,z:48.9,patrol:[{x:34,z:48.9}]});
  const t=makeEnemyTactics('scout');
  const player={x:30,z:42};
  e.mode='chase';e.memory=8;e.lastSeen={...player};
  tickEnemyTactics(t,e,player,.05,[],{targetVisible:true});
  assert.equal(t.phase,'flank');
  assert.ok(Math.hypot(t.goal.x-e.x,t.goal.z-e.z)>1,
    'clipping a flank to the edge must never pick the NPC own feet');
  const start={x:e.x,z:e.z};
  for(let i=0;i<40;i++){
    tickEnemyTactics(t,e,player,.05,[],{targetVisible:true});
    stepEnemyBrain(e,player,.05,[],{
      targetVisible:true,combatGoal:t.goal,combatSpeed:3.2,
      area:AI_TUNING.navigationArea});
  }
  assert.ok(Math.hypot(e.x-start.x,e.z-start.z)>1.5,
    'scout should physically relocate, rather than appear to plan while idle');
});

test('W20.39 occupied squad cover spreads raiders across different positions',()=>{
  const crates=[
    {minX:38.2,maxX:40.8,minZ:36.85,maxZ:39.15,height:1.45},
    {minX:47.6,maxX:50.4,minZ:43.3,maxZ:45.1,height:1.85},
    {minX:51.85,maxX:54.15,minZ:35.9,maxZ:38.1,height:1.6}
  ];
  const origin={x:43,z:46},threat={x:30,z:42};
  const first=pickCoverPoint(origin,threat,crates,undefined,[]);
  assert.ok(first&&isBehindCover(threat,first.point,crates[first.index]));
  const other=pickCoverPoint(origin,threat,crates,undefined,[first.point]);
  assert.ok(other&&isBehindCover(threat,other.point,crates[other.index]));
  assert.ok(Math.hypot(first.point.x-other.point.x,
    first.point.z-other.point.z)>2,'squadmates must not pack one small corner');
});

test('W20.39 a hit raider finishes retreat behind solid cover after sight breaks',()=>{
  const crate={minX:38.2,maxX:40.8,minZ:36.85,maxZ:39.15,height:1.45};
  const threat={x:30,z:42},hidden={x:-38,z:-41};
  const e=createEnemyBrain({x:43,z:46,patrol:[{x:43,z:46}]});
  const t=makeEnemyTactics('raider');
  e.mode='chase';e.memory=12;e.lastSeen={...threat};
  markEnemyThreat(t);
  tickEnemyTactics(t,e,threat,.05,[crate],{targetVisible:true});
  assert.ok(t.coverPoint&&t.coverCommit>3);
  const selected={...t.coverPoint};
  let reached=false;
  for(let i=0;i<70;i++){
    tickEnemyTactics(t,e,e.lastSeen,.05,[crate],{targetVisible:false});
    stepEnemyBrain(e,hidden,.05,[crate],{
      targetVisible:false,combatGoal:t.goal,combatHold:t.phase==='hold',
      combatCoverCommitted:t.coverCommit>0&&
        ['cover','reload','hold','peek','peek-move'].includes(t.phase),
      area:AI_TUNING.navigationArea,combatSpeed:3.0});
    assert.ok(!(e.x>crate.minX-.32&&e.x<crate.maxX+.32&&
      e.z>crate.minZ-.32&&e.z<crate.maxZ+.32),
      'retreat may not phase into a metal crate');
    if(Math.hypot(e.x-selected.x,e.z-selected.z)<.6)reached=true;
  }
  assert.ok(reached,'NPC must actually make it behind the crate');
  assert.ok(t.crouching||t.phase==='peek'||t.phase==='peek-move',
    'cover should lead to crouching or a short peek');
  assert.deepEqual(e.lastSeen,threat,
    'hidden player never silently updates last known position');
  for(let i=0;i<90;i++){
    tickEnemyTactics(t,e,e.lastSeen,.05,[crate],{targetVisible:false});
    stepEnemyBrain(e,hidden,.05,[crate],{
      targetVisible:false,area:AI_TUNING.navigationArea,
      combatGoal:t.goal,
      combatCoverCommitted:t.coverCommit>0&&
        ['cover','reload','hold','peek','peek-move'].includes(t.phase)});
  }
  assert.equal(t.coverPoint,null,'cover commitment eventually expires');
  assert.ok(['investigate','search'].includes(t.phase));
});

test('W20.39 enforcers proactively seek cover while unhurt scouts flank',()=>{
  const crate={minX:38.2,maxX:40.8,minZ:36.85,maxZ:39.15,height:1.45};
  const target={x:30,z:42};
  const enforcer=createEnemyBrain({x:43,z:46}),anchor=makeEnemyTactics('enforcer');
  const scout=createEnemyBrain({x:43,z:46}),flanker=makeEnemyTactics('scout');
  for(const e of [enforcer,scout]){
    e.mode='chase';e.memory=12;e.lastSeen={...target};
  }
  for(let i=0;i<45;i++){
    tickEnemyTactics(anchor,enforcer,target,.05,[crate],{targetVisible:true});
    tickEnemyTactics(flanker,scout,target,.05,[crate],{targetVisible:true});
  }
  assert.ok(anchor.coverPoint,'stationary exposed enforcer seeks solid cover');
  assert.ok(['cover','hold','peek-move'].includes(anchor.phase));
  assert.equal(flanker.phase,'flank','unhurt scout keeps moving to new angles');
});


test('W20.39 three-actor arena keeps independent flanks, cover and collision',()=>{
  const crates=[
    {minX:38.2,maxX:40.8,minZ:36.85,maxZ:39.15,height:1.45},
    {minX:47.6,maxX:50.4,minZ:43.3,maxZ:45.1,height:1.85},
    {minX:51.85,maxX:54.15,minZ:35.9,maxZ:38.1,height:1.6}
  ];
  const player={x:30,z:42};
  const team=[['scout',39,42],['raider',43,46],['enforcer',46,36.8]]
    .map(([id,x,z])=>({id,brain:createEnemyBrain({x,z}),
      tactics:makeEnemyTactics(id),state:{alive:true}}));
  for(const e of team){
    e.brain.mode='chase';e.brain.memory=12;e.brain.lastSeen={...player};
    if(e.id!=='scout')markEnemyThreat(e.tactics);
  }
  let flank=0,crouch=0,peek=0,movement=0;
  const coverSlots=new Set();
  for(let frame=0;frame<220;frame++){
    for(const enemy of team){
      const target=enemy.brain.lastSeen;
      const visible=!crates.some(box=>lineIntersectsBox(
        enemy.brain,target,box,.035));
      tickEnemyTactics(enemy.tactics,enemy.brain,target,.05,crates,{
        targetVisible:visible,
        occupiedCover:occupiedSquadCover(team,enemy.id),
        separation:squadSeparation(enemy.brain,team)});
      const t=enemy.tactics;
      stepEnemyBrain(enemy.brain,player,.05,crates,{
        targetVisible:visible,area:AI_TUNING.navigationArea,
        combatGoal:t.goal,combatHold:t.phase==='hold'||t.phase==='peek',
        combatCoverCommitted:t.coverCommit>0&&
          ['cover','reload','hold','peek','peek-move'].includes(t.phase),
        neighbors:team.filter(e=>e!==enemy).map(e=>e.brain),
        combatFacePlayer:true,
        combatSpeed:ENEMY_PROFILES[enemy.id].moveSpeed*t.pace});
      if(t.phase==='flank')flank++;
      if(t.crouching)crouch++;
      if(t.phase==='peek'||t.phase==='peek-move')peek++;
      if(enemy.brain.actualSpeed>.1)movement++;
      if(t.coverPoint)
        coverSlots.add(enemy.id+':'+t.coverPoint.x.toFixed(1)+':'+t.coverPoint.z.toFixed(1));
      for(const box of crates)
        assert.ok(!(enemy.brain.x>box.minX-.33&&enemy.brain.x<box.maxX+.33&&
          enemy.brain.z>box.minZ-.33&&enemy.brain.z<box.maxZ+.33),
          'no actor may walk through any obstacle');
    }
    for(let a=0;a<team.length;a++)for(let b=a+1;b<team.length;b++)
      assert.ok(Math.hypot(team[a].brain.x-team[b].brain.x,
        team[a].brain.z-team[b].brain.z)>.72,
        'the team must retain personal space');
  }
  assert.ok(flank>50&&crouch>30&&peek>5&&movement>100);
  assert.ok(coverSlots.size>=2,'raider and enforcer take separate shelter');
});

test('W20.44 close combat is a standing firefight, not perpetual retreat to a crate',()=>{
  const b=brain(),t=makeEnemyTactics('raider');
  const close={x:47,z:43},crate={minX:40,maxX:42,minZ:39,maxZ:41,height:1.45};
  markEnemyThreat(t);
  b.yaw=-Math.PI/2; // enemy initially faces AWAY from a flanking player
  for(let i=0;i<40;i++){
    const visible=hasSight(b,close,[crate]);
    tickEnemyTactics(t,b,close,.05,[crate],{targetVisible:visible});
    stepEnemyBrain(b,close,.05,[crate],{
      targetVisible:visible,combatHold:t.phase==='stand-fight',
      combatGoal:t.goal,combatFacePlayer:true
    });
    assert.equal(t.phase,'stand-fight','being rushed must override cover-seeking');
    assert.equal(t.coverPoint,null);
  }
  assert.equal(b.moving,false,'guard plants feet instead of running in circles');
  assert.ok(isEnemyAimAligned(b,close));
  assert.ok(canEnemyFire(b,close,[crate],76),
    'guard must face and be able to shoot at nearby pursuer');
  assert.ok(b.aimLockSeconds>=.4);
});
test('W20.44 combat path can move sideways while continuously turning to player',()=>{
  const b=brain(),target={x:36,z:43};
  b.yaw=Math.PI/2;
  const start={x:b.x,z:b.z};
  for(let i=0;i<40;i++)
    stepEnemyBrain(b,target,.05,[],{
      targetVisible:true,combatGoal:{x:46,z:47},combatFacePlayer:true,
      combatSpeed:2.5,area:AI_TUNING.navigationArea
    });
  assert.ok(Math.hypot(b.x-start.x,b.z-start.z)>1,
    'enemy should really strafe, not stand in place');
  assert.ok(isEnemyAimAligned(b,target),
    'movement steering must not cancel the turn toward the player');
});
test('W20.44 ranged exposure requests cover but the NPC later abandons stale shelter',()=>{
  const b=brain(),t=makeEnemyTactics('raider');
  const far={x:25,z:40};
  for(let i=0;i<30;i++)tickEnemyTactics(t,b,far,.05,[box]);
  assert.equal(t.coverPoint,null,'do not open a fight by immediately fleeing');
  for(let i=0;i<20;i++)tickEnemyTactics(t,b,far,.05,[box]);
  assert.ok(t.coverPoint,'raider seeks cover after sustained distant exposure');
  t.coverAge=6.3;
  tickEnemyTactics(t,b,far,.05,[box]);
  assert.equal(t.coverPoint,null,'stale cover must be released');
  assert.ok(t.coverCooldown>6,'cooldown prevents immediate cover loops');
  for(let i=0;i<15;i++)tickEnemyTactics(t,b,far,.05,[box]);
  assert.equal(t.coverPoint,null);
});
test('W20.44 NPC actually fires from a real peek angle and not through a crate',()=>{
  const crate={minX:40,maxX:42,minZ:39,maxZ:41,height:1.45};
  const target={x:30,z:40},b=brain(),t=makeEnemyTactics('raider');
  b.memory=24;b.lastSeen={...target};equipEnemyWeapon(t,'pipe-rifle');
  markEnemyThreat(t);
  let peekShots=0,coverShots=0,throughWall=0;
  for(let frame=0;frame<240;frame++){
    const visible=hasSight(b,target,[crate]);
    tickEnemyTactics(t,b,visible?target:b.lastSeen,.05,[crate],
      {targetVisible:visible});
    stepEnemyBrain(b,target,.05,[crate],{
      targetVisible:visible,area:AI_TUNING.navigationArea,
      combatGoal:t.goal,
      combatHold:['hold','peek','stand-fight'].includes(t.phase),
      combatCoverCommitted:t.coverCommit>0&&
        ['cover','reload','hold','peek','peek-move'].includes(t.phase),
      combatFacePlayer:true,combatSpeed:2.5*t.pace
    });
    const fireAllowed=visible&&b.aimLockSeconds>=.4&&
      !t.crouching&&t.reloadRemaining===0&&
      canEnemyFire(b,target,[crate],76);
    if(fireAllowed){
      const shot=attemptEnemyShot(t,Math.hypot(b.x-target.x,b.z-target.z),
        b.moving,()=>.5);
      if(shot.fired){
        if(['peek','peek-move'].includes(t.phase))peekShots++;
        if(['cover','hold','peek','peek-move'].includes(t.phase))coverShots++;
        if(crate&&lineIntersectsBox(b,target,crate,.035))throughWall++;
      }
    }
  }
  assert.ok(peekShots>=1,'a covered guard must emerge and fire, not just hide');
  assert.ok(coverShots>=peekShots);
  assert.equal(throughWall,0,'NPC cannot shoot through opaque cover');
});
