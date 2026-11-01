import test from 'node:test';
import assert from 'node:assert/strict';
import {createEnemyBrain,alertEnemy,stepEnemyBrain} from './enemy-ai.mjs';
import {createSquadDirector,resetSquadDirector,planSquadOrders}
  from './enemy-squad-director.mjs';

const unit=(id,kind,x,z,contact={x:37,z:40})=>{
  const brain=createEnemyBrain({x,z,yaw:-Math.PI/2,patrol:[{x,z}]});
  alertEnemy(brain,contact);
  return {id,brain,tactics:{kind,magazine:10,reserve:25},
    state:{health:100,alive:true},visible:false};
};
const kinds=['scout','raider','enforcer'];
const teamOf=n=>Array.from({length:n},(_,i)=>
  unit('bot-'+String(i).padStart(2,'0'),kinds[i%3],
    44+(i%4)*1.5,38+Math.floor(i/4)*1.5));

test('Solo NPC must investigate instead of waiting for imagined backup',()=>{
  const director=createSquadDirector(),roster=teamOf(1);
  const orders=planSquadOrders(director,roster,.05);
  assert.equal(orders.size,1);
  assert.equal(orders.get(roster[0].id).type,'investigate');
  resetSquadDirector(director);
  assert.equal(director.orders.size,0);
});
test('Three enemies choose distinct guard, flank and investigator orders',()=>{
  const director=createSquadDirector(),roster=teamOf(3);
  const orders=planSquadOrders(director,roster,.05);
  assert.deepEqual([...orders.values()].map(o=>o.type).sort(),
    ['flank','investigate','watch']);
  const scout=roster.find(u=>u.tactics.kind==='scout');
  const enforcer=roster.find(u=>u.tactics.kind==='enforcer');
  assert.equal(orders.get(scout.id).type,'flank');
  assert.equal(orders.get(enforcer.id).type,'watch');
  assert.notDeepEqual(orders.get(scout.id).goal,scout.brain.lastSeen);
  assert.ok(orders.get(scout.id).goal,'Flanker needs a real side approach');
});
test('Ten enemies divide into manageable teams and do not all camp one corner',()=>{
  const director=createSquadDirector(),roster=teamOf(10);
  const orders=planSquadOrders(director,roster,.05);
  assert.equal(orders.size,10);
  const counts={};
  for(const order of orders.values())counts[order.type]=(counts[order.type]||0)+1;
  assert.ok(counts.watch>=1&&counts.watch<=3);
  assert.ok(counts.flank>=2);
  assert.ok(counts.investigate>=3);
  assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),10);
  const stable=planSquadOrders(director,roster,.05);
  assert.deepEqual([...stable],[...orders],'Orders should persist, not jitter every frame');
});
test('Guards leave held angles after a short delay and resume searching',()=>{
  const director=createSquadDirector(),roster=teamOf(3);
  const first=planSquadOrders(director,roster,.05);
  const guard=[...first].find(([,o])=>o.type==='watch')[0];
  for(let i=0;i<85;i++)planSquadOrders(director,roster,.05);
  const later=planSquadOrders(director,roster,.05);
  assert.equal(later.get(guard).type,'investigate');
});
test('Reacquiring the player clears old orders instead of preserving stale flanks',()=>{
  const director=createSquadDirector(),roster=teamOf(3);
  planSquadOrders(director,roster,.05);
  roster[0].visible=true;
  const next=planSquadOrders(director,roster,.05);
  assert.equal(next.has(roster[0].id),false);
  assert.equal(director.orders.has(roster[0].id),false);
});
test('Dead, unalerted and distant enemies are not given clairvoyant orders',()=>{
  const director=createSquadDirector(),roster=teamOf(3);
  roster[0].state.alive=false;
  roster[1].brain.lastSeen=null;
  const orders=planSquadOrders(director,roster,.05);
  assert.deepEqual([...orders.keys()],[roster[2].id]);
  assert.equal(orders.get(roster[2].id).type,'investigate');
});
test('World obstacles invalidate unsafe flank waypoints',()=>{
  const roster=teamOf(3);
  const first=planSquadOrders(createSquadDirector(),roster,.05);
  const flank=[...first].find(([,o])=>o.type==='flank');
  const point=flank[1].goal;
  const wall={minX:point.x-.5,maxX:point.x+.5,
    minZ:point.z-.5,maxZ:point.z+.5};
  const next=planSquadOrders(createSquadDirector(),roster,.05,[wall]);
  const newGoal=next.get(flank[0]).goal;
  assert.ok(!newGoal||Math.hypot(newGoal.x-point.x,newGoal.z-point.z)>1);
});
test('NPC reaction delay resets on lost sight and does not follow hidden motion',()=>{
  const e=createEnemyBrain({x:45,z:40,yaw:0,patrol:[{x:45,z:40}]});
  const last={x:45,z:36},hiddenLeft={x:36,z:36},hiddenRight={x:53,z:45};
  stepEnemyBrain(e,last,.05,[],{targetVisible:true,combatHold:true});
  assert.equal(e.aimLockSeconds,.05);
  assert.ok(Math.abs(e.yaw)<.2,'NPC head should not snap a quarter turn in one frame');
  alertEnemy(e,last);
  const a=structuredClone(e),b=structuredClone(e);
  const order={type:'watch',contact:last};
  stepEnemyBrain(a,hiddenLeft,.05,[],{targetVisible:false,lostContactOrder:order});
  stepEnemyBrain(b,hiddenRight,.05,[],{targetVisible:false,lostContactOrder:order});
  assert.equal(a.aimLockSeconds,0);
  assert.deepEqual({yaw:a.yaw,x:a.x,z:a.z,lastSeen:a.lastSeen},
    {yaw:b.yaw,x:b.x,z:b.z,lastSeen:b.lastSeen});
});

test('In actual brain steps one guard holds while others move to different goals',()=>{
  const director=createSquadDirector(),roster=teamOf(3);
  const orders=planSquadOrders(director,roster,.05);
  const initial=new Map(roster.map(u=>[u.id,{x:u.brain.x,z:u.brain.z}]));
  for(let frame=0;frame<16;frame++){
    const latest=planSquadOrders(director,roster,.05);
    for(const unit of roster){
      stepEnemyBrain(unit.brain,{x:-33,z:33},.05,[],{
        targetVisible:false,area:undefined,lostContactOrder:latest.get(unit.id)
      });
    }
  }
  const guard=roster.find(u=>orders.get(u.id).type==='watch');
  const scout=roster.find(u=>orders.get(u.id).type==='flank');
  const investigator=roster.find(u=>orders.get(u.id).type==='investigate');
  assert.ok(Math.hypot(guard.brain.x-initial.get(guard.id).x,
    guard.brain.z-initial.get(guard.id).z)<.01,'Guard holds the known angle');
  for(const unit of [scout,investigator]){
    assert.ok(Math.hypot(unit.brain.x-initial.get(unit.id).x,
      unit.brain.z-initial.get(unit.id).z)>.2,'Search roles must physically move');
  }
});
