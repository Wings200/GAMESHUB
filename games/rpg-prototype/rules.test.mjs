import test from 'node:test';
import assert from 'node:assert/strict';
import {LANDMARKS,groundHeight,collision,movePoint,
  initialQuest,questStage,beginQuest,collectCase,finishQuest} from './rules.mjs';
test('terrain is finite and consistent across landmarks',()=>{
  for(const {x,z} of Object.values(LANDMARKS)) {
    assert.ok(Number.isFinite(groundHeight(x,z)));
    assert.equal(groundHeight(x,z),groundHeight(x,z));
  }
});
test('walls and trees block while the player can slide',()=>{
  const boxes=[{minX:0,maxX:1,minZ:-5,maxZ:5}];
  assert.equal(collision(-.2,0,boxes),true);
  assert.equal(collision(3,3,[],[{x:3,z:3,r:.25}]),true);
  assert.equal(collision(165,0),true);
  const moved=movePoint({x:-.9,z:0},.7,2,boxes,[]);
  assert.equal(moved.x,-.9);
  assert.equal(moved.z,2);
});
test('quest cannot reward early or twice',()=>{
  const start=initialQuest();
  assert.equal(questStage(start),'unknown');
  assert.deepEqual(finishQuest(start),start);
  let q=beginQuest(start);
  q=collectCase(q);
  assert.equal(questStage(q),'collect');
  q=collectCase(q);
  q=collectCase(q);
  assert.equal(q.collected,2);
  assert.equal(questStage(q),'return');
  q=finishQuest(q);
  assert.equal(questStage(q),'finished');
  assert.equal(finishQuest(q).credits,20);
});