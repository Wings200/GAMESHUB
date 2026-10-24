import test from 'node:test';
import assert from 'node:assert/strict';
import { canFireInput, canFirePointerDown, spendRound } from './combat-rules.mjs';

const action={screen:'game',paused:false,view:'player',phase:'action',interaction:null};

test('the first left click fires even when pointer lock is not yet active',()=>{
  assert.equal(canFirePointerDown({...action,button:0,locked:false}),true);
  assert.equal(canFirePointerDown({...action,button:0,locked:true}),true);
});
test('right/middle mouse do not fire a rifle round',()=>{
  assert.equal(canFirePointerDown({...action,button:1}),false);
  assert.equal(canFirePointerDown({...action,button:2}),false);
});
test('cannot shoot during operator selection, prep, or game pause',()=>{
  assert.equal(canFireInput({...action,phase:'selection'}),false);
  assert.equal(canFireInput({...action,phase:'preparation'}),false);
  assert.equal(canFireInput({...action,paused:true}),false);
});
test('spectators and drones cannot shoot',()=>{
  assert.equal(canFireInput({...action,view:'drone'}),false);
  assert.equal(canFireInput({...action,view:'spectator'}),false);
});
test('cannot shoot while deploying or disabling a defuser',()=>{
  assert.equal(canFireInput({...action,interaction:'plant'}),false);
  assert.equal(canFireInput({...action,interaction:'defuse'}),false);
});
test('shooting is valid during postplant and in testing action',()=>{
  assert.equal(canFireInput({...action,phase:'postplant'}),true);
  assert.equal(canFireInput({...action,phase:'action'}),true);
});
test('successful shot spends exactly one cartridge',()=>{
  assert.deepEqual(spendRound({view:'player',shotDelay:0,reloadDelay:0,ammo:30}),{fired:true,ammo:29});
});
test('cooldown, reload, and empty magazine never spend ammo',()=>{
  assert.deepEqual(spendRound({view:'player',shotDelay:.05,reloadDelay:0,ammo:29}),{fired:false,ammo:29});
  assert.deepEqual(spendRound({view:'player',shotDelay:0,reloadDelay:.9,ammo:18}),{fired:false,ammo:18});
  assert.deepEqual(spendRound({view:'player',shotDelay:0,reloadDelay:0,ammo:0}),{fired:false,ammo:0});
});
