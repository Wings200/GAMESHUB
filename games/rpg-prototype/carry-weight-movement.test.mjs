import test from 'node:test';
import assert from 'node:assert/strict';
import {stepMovement,maximumStamina} from './movement.mjs';
import {encumbranceEffects} from './carry-weight.mjs';

function simulate(weight){
  const player={x:0,z:0,jump:0,vertical:0,endurance:3,
    stamina:maximumStamina(3),staminaCooldown:0,exhausted:false};
  const keys=new Set(['KeyW','ShiftLeft']);
  const load=encumbranceEffects(weight,230);
  let last=null;
  for(let i=0;i<100;i++){
    const dt=.016;
    last=stepMovement(player,keys,{x:0,z:-1},dt,{
      boxes:[],trees:[],groundHeight:()=>0,
      speedMultiplier:load.speedMultiplier,allowSprint:load.canSprint});
    if(load.overloaded&&last.moving){
      player.stamina=Math.max(0,player.stamina-load.movingApDrain*dt);
      player.staminaCooldown=Math.max(player.staminaCooldown,.55);
    }
  }
  return {player,last};
}

test('W20.95 actual movement physics slow overloaded actors and spend shared AP',()=>{
  const normal=simulate(200),overloaded=simulate(270);
  assert.ok(Math.abs(normal.player.z)>Math.abs(overloaded.player.z)*2);
  assert.equal(overloaded.last.sprinting,false);
  assert.ok(overloaded.player.stamina<normal.player.stamina);
  assert.ok(overloaded.player.stamina<maximumStamina(3));
});
