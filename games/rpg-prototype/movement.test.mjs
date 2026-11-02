import test from 'node:test';
import assert from 'node:assert/strict';
import { stepMovement, requestJump, MOVE_TUNING, ENDURANCE_TUNING, setEndurance, maximumStamina, staminaRecoveryRate, toggleCrouch, resetMotion } from './movement.mjs';

const env={boxes:[],trees:[],groundHeight:()=>0};
const p=(x=0,z=0)=>({x,z,jump:0,vertical:0});
const near=(actual,expected,epsilon=.00001)=>assert.ok(Math.abs(actual-expected)<epsilon,actual+' != '+expected);

test('W walks forward at the shared authored speed',()=>{
  const player=p();
  const s=stepMovement(player,new Set(['KeyW']),{x:1,z:0},.1,env);
  near(player.x,MOVE_TUNING.walk*.1*(1-Math.exp(-MOVE_TUNING.acceleration*.1)));near(player.z,0);
  assert.ok(s.speed>0&&s.speed<MOVE_TUNING.walk);
});
test('Shift sprints; diagonal speed is normalized',()=>{
  const forward=p(),diagonal=p();
  stepMovement(forward,new Set(['KeyW','ShiftLeft']),{x:0,z:-1},.1,env);
  stepMovement(diagonal,new Set(['KeyW','KeyD','ShiftLeft']),{x:0,z:-1},.1,env);
  // M03 eases into sprint instead of snapping to full speed on frame one.
  const expected=MOVE_TUNING.sprint*.1*(1-Math.exp(-MOVE_TUNING.acceleration*.1));
  near(Math.hypot(forward.x,forward.z),expected);
  near(Math.hypot(diagonal.x,diagonal.z),expected);
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

test('Holding W while jumping across a hurdle never freezes horizontal motion',()=>{
  const hurdle={minX:1,maxX:2.6,minZ:-3.5,maxZ:3.5,top:.75};
  const player=p(-.3,0);
  const e={...env,boxes:[hurdle]};
  requestJump(player);
  let stalled=0,landedOnTop=false;
  for(let i=0;i<90;i++){
    const result=stepMovement(player,new Set(['KeyW']),{x:1,z:0},1/60,e);
    if(result.speed<.01)stalled++;
    landedOnTop ||= !!player.supported;
  }
  assert.equal(stalled,0,'forward must keep moving during and after hurdle landing');
  assert.ok(landedOnTop,'a short barrier provides a landing surface');
  assert.ok(player.x>hurdle.maxX+2,'holding W carried the player completely past it');
  near(player.jump,0);
});
test('A player can jump again from the top of a short hurdle',()=>{
  const player={...p(1.8,0),jump:1,vertical:-2};
  const e={...env,boxes:[{minX:1,maxX:2.6,minZ:-1,maxZ:1,top:.75}]};
  for(let i=0;i<30;i++)stepMovement(player,new Set(),{x:1,z:0},1/60,e);
  assert.equal(player.supported,true);
  assert.equal(requestJump(player),true);
  assert.equal(player.supported,false);
  stepMovement(player,new Set(),{x:1,z:0},1/60,e);
  assert.ok(player.jump>.79);
});

test('Endurance controls full-speed running duration and uses a 1–10 scale',()=>{
  assert.equal(maximumStamina(1),4);
  assert.equal(maximumStamina(3),6);
  assert.equal(maximumStamina(10),13);
  assert.equal(maximumStamina(0),4);
  assert.equal(maximumStamina(99),13);
  assert.equal(maximumStamina(undefined),6);
});
test('Stamina depletes while moving and forces walking when exhausted',()=>{
  const runner=p();
  setEndurance(runner,1);
  let last;
  // Run within a distant, unobstructed map while holding Shift and W.
  for(let n=0;n<40;n++)last=stepMovement(runner,new Set(['KeyW','ShiftLeft']),{x:0,z:-1},.1,env);
  near(runner.stamina,0);
  assert.equal(runner.exhausted,true);
  last=stepMovement(runner,new Set(['KeyW','ShiftLeft']),{x:0,z:-1},.1,env);
  assert.ok(last.speed>=MOVE_TUNING.walk&&last.speed<MOVE_TUNING.sprint);
  for(let i=0;i<10;i++)last=stepMovement(runner,new Set(['KeyW','ShiftLeft']),{x:0,z:-1},.1,env);
  near(last.speed,MOVE_TUNING.walk,1e-4);
  assert.equal(last.sprinting,false);
  assert.equal(last.exhausted,true);
});
test('More Endurance means longer sprint at same movement speed',()=>{
  const low=p(),high=p();
  setEndurance(low,1);setEndurance(high,10);
  for(let i=0;i<90;i++){
    stepMovement(low,new Set(['KeyW','ShiftLeft']),{x:1,z:0},.1,env);
    stepMovement(high,new Set(['KeyW','ShiftLeft']),{x:1,z:0},.1,env);
  }
  assert.equal(low.exhausted,true);
  assert.equal(high.exhausted,false);
  assert.ok(high.stamina>0);
});
test('Walking replenishes stamina after a delay and unlocks sprint at threshold',()=>{
  const runner=p();setEndurance(runner,1);
  for(let i=0;i<40;i++)stepMovement(runner,new Set(['KeyW','ShiftLeft']),{x:0,z:-1},.1,env);
  assert.equal(runner.exhausted,true);
  const empty=runner.stamina;
  for(let i=0;i<4;i++)stepMovement(runner,new Set(['KeyW']),{x:0,z:-1},.1,env);
  near(runner.stamina,empty);
  for(let i=0;i<40;i++)stepMovement(runner,new Set(['KeyW']),{x:0,z:-1},.1,env);
  assert.ok(runner.stamina>=maximumStamina(1)*ENDURANCE_TUNING.resumeFraction);
  assert.equal(runner.exhausted,false);
  const next=stepMovement(runner,new Set(['KeyW','ShiftLeft']),{x:0,z:-1},.1,env);
  assert.equal(next.sprinting,true);
});
test('Standing still or pushing against walls does not spend stamina',()=>{
  const runner=p();setEndurance(runner,1);
  for(let i=0;i<20;i++)stepMovement(runner,new Set(['ShiftLeft']),{x:1,z:0},.1,env);
  near(runner.stamina,maximumStamina(1));
  const wall={minX:1,maxX:3,minZ:-5,maxZ:5};
  runner.x=.5;
  for(let i=0;i<20;i++)stepMovement(runner,new Set(['KeyW','ShiftLeft']),{x:1,z:0},.1,{...env,boxes:[wall]});
  near(runner.stamina,maximumStamina(1));
});
test('Changing Endurance in lab resets stamina for a fair comparison',()=>{
  const runner=p();setEndurance(runner,1);
  for(let i=0;i<30;i++)stepMovement(runner,new Set(['KeyW','ShiftLeft']),{x:0,z:-1},.1,env);
  assert.ok(runner.stamina<maximumStamina(1));
  assert.equal(setEndurance(runner,10),10);
  near(runner.stamina,maximumStamina(10));
  assert.equal(runner.exhausted,false);
});

test('Recovery rate scales with Endurance and halves the old default recovery rate',()=>{
  near(staminaRecoveryRate(1),.45);
  near(staminaRecoveryRate(3),.9);
  near(staminaRecoveryRate(10),2.475);
  assert.ok(staminaRecoveryRate(10)>staminaRecoveryRate(3));
  assert.ok(staminaRecoveryRate(3)>staminaRecoveryRate(1));
});
test('Higher Endurance fully regenerates faster even with a larger stamina pool',()=>{
  const elapsedToFull=endurance=>{
    const runner=p();
    setEndurance(runner,endurance);
    runner.stamina=0;
    runner.exhausted=true;
    runner.staminaCooldown=0;
    for(let i=1;i<300;i++){
      stepMovement(runner,new Set(),{x:0,z:-1},.1,env);
      if(runner.stamina>=maximumStamina(endurance)-1e-8)return i*.1;
    }
    throw Error('did not refill');
  };
  const low=elapsedToFull(1),mid=elapsedToFull(3),high=elapsedToFull(10);
  assert.ok(high<mid&&mid<low, 'higher Endurance shortens complete recovery time');
});
test('Regeneration waits for the new half-second cooldown after sprinting',()=>{
  const runner=p();setEndurance(runner,3);
  stepMovement(runner,new Set(['KeyW','ShiftLeft']),{x:0,z:-1},.1,env);
  const afterSprint=runner.stamina;
  for(let i=0;i<4;i++)stepMovement(runner,new Set(['KeyW']),{x:0,z:-1},.1,env);
  near(runner.stamina,afterSprint);
  for(let i=0;i<3;i++)stepMovement(runner,new Set(['KeyW']),{x:0,z:-1},.1,env);
  assert.ok(runner.stamina>afterSprint);
});
test('Endurance updates the recovery rate while the lab stays on the same character',()=>{
  const runner=p();setEndurance(runner,1);
  const e1=stepMovement(runner,new Set(),{x:0,z:-1},.1,env);
  setEndurance(runner,10);
  const e10=stepMovement(runner,new Set(),{x:0,z:-1},.1,env);
  assert.ok(e10.recoveryPerSecond>e1.recoveryPerSecond);
});

test('C toggles crouch, Ctrl holds it, and release returns to standing',()=>{
  const player=p();resetMotion(player);
  assert.equal(toggleCrouch(player),true);
  let state=stepMovement(player,new Set(['KeyW','ShiftLeft']),{x:1,z:0},.1,env);
  assert.equal(state.crouched,true);
  assert.equal(state.sprinting,false);
  assert.ok(state.speed<MOVE_TUNING.walk);
  assert.ok(state.eyeHeight<MOVE_TUNING.eyeHeight);
  assert.equal(toggleCrouch(player),false);
  state=stepMovement(player,new Set(['KeyW','ControlLeft']),{x:1,z:0},.1,env);
  assert.equal(state.crouched,true);
  state=stepMovement(player,new Set(['KeyW']),{x:1,z:0},.1,env);
  assert.equal(state.crouched,false);
});
test('Walking under a roof requires crouching; releasing C cannot stand up inside',()=>{
  const tunnel={minX:2,maxX:8,minZ:-2,maxZ:2,bottom:1.3};
  const e={...env,ceilings:[tunnel]};
  const player=p(0,0);resetMotion(player);
  for(let i=0;i<30;i++)stepMovement(player,new Set(['KeyW']),{x:1,z:0},1/60,e);
  assert.ok(player.x<2-.49, 'standing character cannot enter the low roof');
  toggleCrouch(player);
  for(let i=0;i<120;i++)stepMovement(player,new Set(['KeyW']),{x:1,z:0},1/60,e);
  assert.ok(player.x>2&&player.x<8,'crouched player traverses the passage');
  toggleCrouch(player);
  const under=stepMovement(player,new Set(['KeyW']),{x:1,z:0},1/60,e);
  assert.equal(under.crouched,true,'cannot stand inside roof');
  for(let i=0;i<150;i++)stepMovement(player,new Set(['KeyW']),{x:1,z:0},1/60,e);
  assert.ok(player.x>8.5);
  const outside=stepMovement(player,new Set(),{x:1,z:0},1/60,e);
  assert.equal(outside.crouched,false,'automatically stands after clearing ceiling');
});
test('Crouching prevents jumping and never drains stamina even with Shift held',()=>{
  const player=p();setEndurance(player,1);resetMotion(player);
  toggleCrouch(player);
  stepMovement(player,new Set(['KeyW','ShiftLeft']),{x:1,z:0},.1,env);
  assert.equal(requestJump(player),false);
  for(let i=0;i<100;i++)stepMovement(player,new Set(['KeyW','ShiftLeft']),{x:1,z:0},.04,env);
  near(player.stamina,maximumStamina(1));
});
test('Acceleration eases in and release eases out instead of snapping',()=>{
  const player=p();resetMotion(player);
  const first=stepMovement(player,new Set(['KeyW']),{x:1,z:0},1/60,env);
  assert.ok(first.speed>0&&first.speed<MOVE_TUNING.walk);
  for(let i=0;i<40;i++)stepMovement(player,new Set(['KeyW']),{x:1,z:0},1/60,env);
  const steady=stepMovement(player,new Set(['KeyW']),{x:1,z:0},1/60,env);
  assert.ok(Math.abs(steady.speed-MOVE_TUNING.walk)<.05);
  const release=stepMovement(player,new Set(),{x:1,z:0},1/60,env);
  assert.ok(release.speed<steady.speed&&release.speed>0);
  for(let i=0;i<80;i++)stepMovement(player,new Set(),{x:1,z:0},1/60,env);
  assert.ok(player.velocityX===0,'no endless drift');
});
test('Camera movement settles at idle and interpolates smoothly into crouch',()=>{
  const player=p();resetMotion(player);
  let moving;
  for(let i=0;i<30;i++)moving=stepMovement(player,new Set(['KeyW']),{x:1,z:0},1/60,env);
  assert.ok(Number.isFinite(moving.cameraBob));
  toggleCrouch(player);
  const first=stepMovement(player,new Set(),{x:1,z:0},1/60,env);
  assert.ok(first.eyeHeight<MOVE_TUNING.eyeHeight);
  assert.ok(first.eyeHeight>MOVE_TUNING.crouchEyeHeight);
  for(let i=0;i<90;i++)moving=stepMovement(player,new Set(),{x:1,z:0},1/60,env);
  assert.ok(Math.abs(moving.cameraBob)<1e-4);
  assert.ok(Math.abs(moving.eyeHeight-MOVE_TUNING.crouchEyeHeight)<.01);
});

test('An unpowered chassis crawls and cannot sprint despite Shift being held',()=>{
  const normal=p(),limping=p();
  const n=stepMovement(normal,new Set(['KeyW','ShiftLeft']),{x:1,z:0},.1,env);
  const l=stepMovement(limping,new Set(['KeyW','ShiftLeft']),{x:1,z:0},.1,
    {...env,speedMultiplier:.23,allowSprint:false});
  assert.equal(l.sprinting,false);
  near(l.requestedSpeed,MOVE_TUNING.walk*.23);
  assert.ok(l.speed<n.speed*.3);
  near(limping.x,normal.x*(MOVE_TUNING.walk*.23/MOVE_TUNING.sprint));
});
