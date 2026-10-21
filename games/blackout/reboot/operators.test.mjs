import test from "node:test";
import assert from "node:assert/strict";
import {OPERATOR_ROSTER,OPERATOR_CAP,MOVEMENT_MULTIPLIERS,
 newOperatorSelection,operatorsForSide,operatorById,switchOperatorSide,
 pickOperator,selectedOperator,operatorLoadout,isPlayableOperator}
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
