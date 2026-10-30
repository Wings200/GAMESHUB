import test from 'node:test';
import assert from 'node:assert/strict';
import { stepMovement, requestJump, MOVE_TUNING } from './movement.mjs';

const env={boxes:[],trees:[],groundHeight:()=>0};
const p=(x=0,z=0)=>({x,z,jump:0,vertical:0});
const near=(actual,expected,epsilon=.00001)=>assert.ok(Math.abs(actual-expected)<epsilon,actual+' != '+expected);

test('W walks forward at the shared authored speed',()=>{
  const player=p();
  const s=stepMovement(player,new Set(['KeyW']),{x:1,z:0},.1,env);
  near(player.x,MOVE_TUNING.walk*.1);near(player.z,0);
  near(s.speed,MOVE_TUNING.walk);
});
test('Shift sprints; diagonal speed is normalized',()=>{
  const forward=p(),diagonal=p();
  stepMovement(forward,new Set(['KeyW','ShiftLeft']),{x:0,z:-1},.1,env);
  stepMovement(diagonal,new Set(['KeyW','KeyD','ShiftLeft']),{x:0,z:-1},.1,env);
  near(Math.hypot(forward.x,forward.z),MOVE_TUNING.sprint*.1);
  near(Math.hypot(diagonal.x,diagonal.z),MOVE_TUNING.sprint*.1);
});
test('Solid walls stop forward motion and allow lateral sliding',()=>{
  const e={...env,boxes:[{minX:1,maxX:2,minZ:-3,maxZ:3}]};
  const player=p(.45,0);
  stepMovement(player,new Set(['KeyW','KeyD']),{x:1,z:0},.1,e);
  assert.ok(player.x<=.5,'player cannot enter wall radius');
  assert.notEqual(player.z,0,'perpendicular movement should slide');
});
test('Jump starts only once until the player touches down',()=>{
  const player=p();assert.equal(requestJump(player),true);
  assert.equal(requestJump(player),false);
  let peak=0;
  for(let i=0;i<90;i++){stepMovement(player,new Set(),{x:0,z:-1},1/60,env);peak=Math.max(peak,player.jump);}
  assert.ok(peak>.8,'jump clears a modest obstacle');
  near(player.jump,0);near(player.vertical,0);
  assert.equal(requestJump(player),true);
});
test('Low hurdle blocks walking but permits jumping over the top',()=>{
  const hurdle={minX:1,maxX:1.8,minZ:-1,maxZ:1,top:.6};
  const player=p(.45,0),e={...env,boxes:[hurdle]};
  stepMovement(player,new Set(['KeyW']),{x:1,z:0},.1,e);
  near(player.x,.45);
  player.jump=.75;
  stepMovement(player,new Set(['KeyW']),{x:1,z:0},.1,e);
  assert.ok(player.x>.5);
});
test('Terrain allows gradual ramps and short steps, rejects abrupt walls',()=>{
  const player=p(0,0);
  const oneStep={...env,groundHeight:(x)=>x<.2?0:.25};
  stepMovement(player,new Set(['KeyW']),{x:1,z:0},.1,oneStep);
  assert.ok(player.x>.2,'walks onto quarter-metre step');
  const cliff=p(0,0);
  stepMovement(cliff,new Set(['KeyW']),{x:1,z:0},.1,{...env,groundHeight:x=>x<.2?0:2});
  near(cliff.x,0);
});
