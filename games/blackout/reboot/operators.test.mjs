import test from "node:test";
import assert from "node:assert/strict";
import {OPERATOR_ROSTER,OPERATOR_CAP,MOVEMENT_MULTIPLIERS,
 newOperatorSelection,operatorsForSide,operatorById,switchOperatorSide,
 pickOperator,selectedOperator,operatorLoadout,isPlayableOperator,canUseReinforcement,canUseReconDrones}
 from "./operators.js";

test("exactly 12 original free-availability roster entries, 6 per 5v5 side",()=>{
 assert.equal(OPERATOR_ROSTER.length,12);
 assert.equal(new Set(OPERATOR_ROSTER.map(o=>o.id)).size,12);
 assert.equal(operatorsForSide("attack").length,OPERATOR_CAP.attack);
 assert.equal(operatorsForSide("defend").length,OPERATOR_CAP.defend);
 assert.equal(operatorsForSide("invalid").length,0);
 assert.ok(OPERATOR_ROSTER.every(o=>o.speed>=1&&o.speed<=3&&o.armor>=1&&o.armor<=3));
 assert.ok(OPERATOR_ROSTER.every(o=>!o.price&&!o.unlockLevel&&!o.purchaseCost));
});
test("Striker and Sentry are playable mirrored generalists with two slots, no signature",()=>{
 const striker=operatorById("striker"),sentry=operatorById("sentry");
 for(const op of [striker,sentry]){
  assert.equal(op.playable,true);assert.equal(op.signature,null);
  assert.equal(op.speed,2);assert.equal(op.armor,2);
  const loadout=operatorLoadout(op);
  assert.equal(loadout.speedMultiplier,1);
  assert.equal(loadout.slots.length,2);
  assert.ok(loadout.slots.every(s=>s.type==="secondary"&&!s.implemented));
 }
 assert.equal(striker.side,"attack");assert.equal(sentry.side,"defend");
 assert.equal(isPlayableOperator("striker"),true);
 assert.equal(isPlayableOperator("sentry"),true);
});
test("ten specialists each reserve a unique signature slot and one secondary slot",()=>{
 const specialists=OPERATOR_ROSTER.filter(o=>!o.playable);
 assert.equal(specialists.length,10);
 for(const op of specialists){
  assert.equal(op.secondarySlots,1);
  assert.ok(op.signature);
  assert.deepEqual(operatorLoadout(op).slots.map(s=>s.type),["signature","secondary"]);
  assert.equal(isPlayableOperator(op.id),false,
   "operator cannot be playable until its unique gadget is real");
 }
});
test("tab change selects corresponding side, cannot select other faction or unreleased design",()=>{
 let s=newOperatorSelection();
 assert.equal(selectedOperator(s).id,"striker");
 const same=pickOperator(s,"volt");assert.equal(same,s);
 assert.equal(pickOperator(s,"sentry"),s);
 s=switchOperatorSide(s,"defend");
 assert.equal(selectedOperator(s).id,"sentry");
 assert.equal(pickOperator(s,"bastion"),s);
 s=pickOperator(s,"sentry");
 assert.equal(selectedOperator(s).side,"defend");
 s=switchOperatorSide(s,"attack");
 assert.equal(selectedOperator(s).id,"striker");
 assert.equal(switchOperatorSide(s,"unknown"),s);
});
test("operator speed multipliers describe actual real movement classes, not fake HP",()=>{
 assert.ok(MOVEMENT_MULTIPLIERS[1]<MOVEMENT_MULTIPLIERS[2]);
 assert.ok(MOVEMENT_MULTIPLIERS[2]<MOVEMENT_MULTIPLIERS[3]);
 assert.equal(operatorLoadout(operatorById("striker")).speedMultiplier,1);
 assert.equal(operatorLoadout(operatorById("sentry")).speedMultiplier,1);
 assert.equal(operatorLoadout(null),null);
});

import {initialPlayer,stepPlayer,TEST_OBSTACLES} from "./physics.js";
test("speed classes change REAL movement while preserving legacy 2/2 movement",()=>{
 const simulate=multiplier=>{
  let p=initialPlayer();
  for(let i=0;i<60;i++)
   p=stepPlayer(p,{forward:1,speedMultiplier:multiplier},1/60,TEST_OBSTACLES);
  return p;
 };
 const slow=simulate(MOVEMENT_MULTIPLIERS[1]);
 const standard=simulate(MOVEMENT_MULTIPLIERS[2]);
 const fast=simulate(MOVEMENT_MULTIPLIERS[3]);
 const legacy=simulate(undefined);
 assert.ok(slow.z>standard.z&&standard.z>fast.z);
 assert.ok(Math.abs(standard.z-legacy.z)<1e-8);
 assert.ok(slow.z<8&&fast.z<8);
});

test("reinforcement belongs exclusively to playable defenders",()=>{
 assert.equal(canUseReinforcement(operatorById("striker")),false,
  "attacker Striker cannot build or remove steel");
 assert.equal(canUseReinforcement(operatorById("sentry")),true,
  "defender Sentry is still allowed to reinforce");
 assert.equal(canUseReinforcement(operatorById("bastion")),false,
  "unimplemented specialist cannot activate utility");
 assert.equal(canUseReinforcement(undefined),false);
 assert.equal(canUseReinforcement({side:"attack",playable:true}),false);
});

test("only playable attackers have R-1 drones; never defenders or unfinished specialists",()=>{
 const striker=operatorById("striker"),sentry=operatorById("sentry");
 assert.equal(canUseReconDrones(striker),true);
 assert.equal(canUseReconDrones(sentry),false);
 assert.equal(canUseReconDrones(operatorById("volt")),false,
  "unimplemented attacker specialist is not playable");
 assert.equal(canUseReconDrones(operatorById("specter")),false);
 assert.equal(canUseReconDrones(null),false);
 assert.equal(canUseReconDrones({side:"defend",playable:true}),false);
 assert.equal(canUseReconDrones({side:"attack",playable:true}),true);
 assert.equal(canUseReinforcement(striker),false);
 assert.equal(canUseReinforcement(sentry),true);
});
test("switching sides changes only permissions, never grants defender attacker inventory",()=>{
 let selection=newOperatorSelection();
 assert.equal(canUseReconDrones(selectedOperator(selection)),true);
 selection=switchOperatorSide(selection,"defend");
 assert.equal(selectedOperator(selection).id,"sentry");
 assert.equal(canUseReconDrones(selectedOperator(selection)),false);
 assert.equal(canUseReinforcement(selectedOperator(selection)),true);
 selection=switchOperatorSide(selection,"attack");
 assert.equal(selectedOperator(selection).id,"striker");
 assert.equal(canUseReconDrones(selectedOperator(selection)),true);
});
