import test from 'node:test';
import assert from 'node:assert/strict';
import {planNavigationRoute,pathClear} from './enemy-navigation.mjs';
import {createEnemyBrain,stepEnemyBrain,alertEnemy} from './enemy-ai.mjs';
const area={minX:0,maxX:30,minZ:0,maxZ:30};
const boxes=[{minX:10,maxX:13,minZ:10,maxZ:14,height:2}];
test('cover route uses stable waypoints beyond the obstacle',()=>{
  const origin={x:6,z:12},goal={x:18,z:12};
  const route=planNavigationRoute(origin,goal,boxes,area);
  assert.ok(route.length>=2);
  let point=origin;
  for(const next of route){
    assert.ok(pathClear(point,next,boxes),'Each waypoint segment must clear cover');
    point=next;
  }
  assert.deepEqual(route.at(-1),goal);
});
test('combatant can actually navigate around cover instead of stuck walking',()=>{
  const brain=createEnemyBrain({x:6,z:12,yaw:0,patrol:[{x:6,z:12}]});
  const target={x:18,z:12};
  alertEnemy(brain,{x:17,z:12});
  let closest=Infinity;
  for(let i=0;i<260;i++){
    stepEnemyBrain(brain,{x:17,z:12},.05,boxes,{
      targetVisible:true,area,combatGoal:target,combatSpeed:2.8
    });
    closest=Math.min(closest,Math.hypot(brain.x-target.x,brain.z-target.z));
  }
  assert.ok(closest<.65,'Enemy must reach opposite side of wall');
  assert.ok(brain.x>13);
});
test('unreachable cover does not allow walking through a wall',()=>{
  const wall={minX:14,maxX:16,minZ:0,maxZ:30};
  assert.deepEqual(planNavigationRoute({x:7,z:15},{x:24,z:15},[wall],area),[]);
});
