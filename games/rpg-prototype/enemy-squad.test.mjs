import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnemyBrain} from './enemy-ai.mjs';
import {createSquadIntel,reportSquadContact,stepSquadIntel,
  shareSquadContact,squadSeparation,occupiedSquadCover,clearSquadIntel,
  reactToAllyDown
} from './enemy-squad.mjs';
const mk=(id,x,z)=>({id,brain:createEnemyBrain({x,z,
  yaw:-Math.PI/2,patrol:[{x,z}]}),state:{alive:true},tactics:{coverPoint:null}});
test('Sighted raider can alert nearby allies to investigate LAST KNOWN position',()=>{
  const team=[mk('scout',36,40),mk('raider',45,40),mk('enforcer',49,44)];
  const intel=createSquadIntel();
  assert.equal(reportSquadContact(intel,'scout',{x:30,z:40}),true);
  const blocked=[{minX:38,maxX:43,minZ:35,maxZ:46}];
  const notifications=shareSquadContact(intel,team,blocked,{x:30,z:40});
  assert.equal(notifications,2);
  assert.equal(team[1].brain.mode,'chase');
  assert.deepEqual(team[2].brain.lastSeen,{x:30,z:40});
  assert.notEqual(team[2].brain.spotted,true);
  assert.equal(team[0].brain.mode,'patrol');
});
test('Intel expires and prevents wallhack pursuit indefinitely',()=>{
  const intel=createSquadIntel();
  reportSquadContact(intel,'scout',{x:31,z:39});
  for(let i=0;i<100;i++)stepSquadIntel(intel,.05);
  assert.equal(intel.lastKnown,null);
  assert.equal(intel.remaining,0);
  const team=[mk('raider',45,40)];
  assert.equal(shareSquadContact(intel,team,[],{x:30,z:40}),0);
  assert.equal(team[0].brain.mode,'patrol');
});
test('Frozen AI freezes squad alert timers and reset wipes state',()=>{
  const intel=createSquadIntel();
  assert.equal(reportSquadContact(intel,'scout',{x:NaN,z:3}),false);
  reportSquadContact(intel,'scout',{x:34,z:36});
  const old=intel.remaining;
  stepSquadIntel(intel,500,false);
  assert.equal(intel.remaining,old);
  clearSquadIntel(intel);
  assert.equal(intel.alerts,0);
  assert.equal(intel.lastKnown,null);
});
test('Teammate spacing pushes away from crowd without affecting distant bots',()=>{
  const target=mk('scout',45,42),near=mk('raider',45.3,42),
    far=mk('enforcer',53,42);
  const push=squadSeparation(target.brain,[target,near,far]);
  assert.ok(push.x<0);
  assert.equal(push.z,0);
  near.brain.x=50;
  assert.deepEqual(squadSeparation(target.brain,[target,near,far]),{x:0,z:0});
});
test('Two enemies can reserve different cover points',()=>{
  const team=[mk('scout',40,45),mk('raider',45,40),mk('enforcer',49,39)];
  team[0].tactics.coverPoint={x:45,z:38};
  team[2].tactics.coverPoint={x:52,z:42};
  assert.deepEqual(occupiedSquadCover(team,'raider'),[
    {x:45,z:38},{x:52,z:42}
  ]);
  assert.deepEqual(occupiedSquadCover(team,'scout'),[{x:52,z:42}]);
});

test('W20.50 a fallen teammate prompts nearby allies to investigate without a wallhack',()=>{
  const team=[mk('scout',40,40),mk('raider',45,40),
    mk('enforcer',80,40)];
  team[0].state.alive=false;
  const wall={minX:42,maxX:43,minZ:37,maxZ:43,height:3};
  assert.equal(reactToAllyDown(team,team[0],[wall],()=>.5),1);
  const witness=team[1].brain;
  assert.equal(witness.mode,'investigate-noise');
  assert.equal(witness.spotted,false);
  assert.equal(witness.lastSeen,null,
    'an ally death cannot report the shooter as directly seen');
  assert.ok(witness.noiseTime>0&&witness.memory>0);
  assert.notDeepEqual(witness.noiseTarget,{x:40,z:40});
  assert.equal(team[2].brain.mode,'patrol','distant bot does not learn remotely');
});

test('W20.50 confirmed target engagement takes priority over a casualty search',()=>{
  const team=[mk('scout',40,40),mk('raider',45,40)];
  team[0].state.alive=false;
  team[1].brain.spotted=true;
  team[1].brain.mode='chase';
  assert.equal(reactToAllyDown(team,team[0],[],()=>.5),0);
  assert.equal(team[1].brain.mode,'chase');
});
