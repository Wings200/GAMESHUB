import test from 'node:test';
import assert from 'node:assert/strict';
import {ARENA_BOUNDS,isPhysicallyInArena,isArenaActive,
  shouldRaycastEnemy,combatRuntimeStatus} from './arena-activation.mjs';
test('Station 9 stays active as before',()=>{
  assert.equal(isArenaActive(8,{x:0,z:0}),true);
  assert.equal(isArenaActive(6,{x:-52,z:-42}),false);
});
test('Entering arena by walking from a different station activates AI',()=>{
  assert.equal(isArenaActive(6,{x:39,z:42}),true);
  assert.equal(isArenaActive(0,{x:45,z:39}),true);
  assert.equal(isArenaActive(7,{x:28,z:30}),true);
  assert.equal(isArenaActive(7,{x:60,z:51}),true);
  assert.equal(isPhysicallyInArena({x:60.1,z:51}),false);
  assert.equal(isPhysicallyInArena({x:29,z:52}),false);
  assert.deepEqual(ARENA_BOUNDS,{minX:28,maxX:60,minZ:30,maxZ:51});
});
test('Enemy hitboxes are available even when Station 9 is not selected',()=>{
  const enemy={root:{visible:true},state:{alive:true}};
  assert.equal(shouldRaycastEnemy(enemy),true);
  enemy.root.visible=false;
  assert.equal(shouldRaycastEnemy(enemy),false);
  enemy.root.visible=true;enemy.state.alive=false;
  assert.equal(shouldRaycastEnemy(enemy),false);
  assert.equal(shouldRaycastEnemy(null),false);
});
test('Combat UI explains why AI cannot currently attack',()=>{
  const base={active:true,locked:true,aiEnabled:true,playerAlive:true,aliveCount:3};
  assert.match(combatRuntimeStatus(base),/AI ACTIVE/);
  assert.match(combatRuntimeStatus({...base,active:false}),/ENTER STATION 9/);
  assert.match(combatRuntimeStatus({...base,locked:false}),/CLICK PLAY/);
  assert.match(combatRuntimeStatus({...base,aiEnabled:false}),/PRESS K/);
  assert.match(combatRuntimeStatus({...base,playerAlive:false}),/PRESS H/);
  assert.match(combatRuntimeStatus({...base,aliveCount:0}),/PRESS J/);
});
