import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialCampaignState,startCampaignQuest,resolveCampaignQuest,
  advanceCampaignEvent,trackedCampaignObjective,toggleCampaignQuestTracking,safeCampaignSnapshot,
  campaignJournal
} from './campaign.mjs';

test('Vultures can earn supplier reputation through quests without joining',()=>{
  let state=startCampaignQuest(initialCampaignState(),'salvage-rights').state;
  assert.equal(trackedCampaignObjective(state).node,'arena');
  state=advanceCampaignEvent(state,'enforcer-defeated').state;
  assert.equal(trackedCampaignObjective(state).node,'vultures');
  state=resolveCampaignQuest(state,'salvage-rights','report').state;
  assert.equal(state.reputation.vultures,40);
  assert.equal(state.quests['salvage-rights'].status,'completed');
  assert.equal(trackedCampaignObjective(state),null);
});

test('HUD has no quest objective when no quest is active',()=>{
  assert.equal(trackedCampaignObjective(initialCampaignState()),null);
  // A stale tracked ID must not make an available quest appear active.
  assert.equal(trackedCampaignObjective({...initialCampaignState(),tracked:'water-debt'}),null);
});

test('HUD shows the objective only for an accepted active quest',()=>{
  const {state}=startCampaignQuest(initialCampaignState(),'water-debt');
  assert.deepEqual(trackedCampaignObjective(state),{
    questId:'water-debt',node:'pump',
    text:'Use 2 salvaged parts to repair the pump at Station 2.'
  });
});

test('HUD hides objectives after the last quest is completed',()=>{
  const {state}=startCampaignQuest(initialCampaignState(),'border-watch');
  state.quests['border-watch'].stage=1;
  const completed=resolveCampaignQuest(state,'border-watch','report');
  assert.equal(completed.changed,true);
  assert.equal(trackedCampaignObjective(completed.state),null);
});

test('Accepted quest can be tracked, untracked and tracked again across reloads',()=>{
  const {state}=startCampaignQuest(initialCampaignState(),'water-debt');
  const off=toggleCampaignQuestTracking(state,'water-debt');
  assert.equal(off.changed,true);
  assert.equal(off.state.tracked,null);
  const reloaded=safeCampaignSnapshot(JSON.parse(JSON.stringify(off.state)));
  assert.equal(reloaded.tracked,null);
  assert.equal(trackedCampaignObjective(reloaded),null);
  assert.equal(campaignJournal(reloaded).find(quest=>quest.id==='water-debt').status,'active');
  const on=toggleCampaignQuestTracking(reloaded,'water-debt');
  assert.equal(on.state.tracked,'water-debt');
  assert.equal(trackedCampaignObjective(on.state).node,'pump');
});

test('Completed and unaccepted quests cannot be added to the HUD',()=>{
  const empty=toggleCampaignQuestTracking(initialCampaignState(),'dead-signals');
  assert.equal(empty.changed,false);
  const {state}=startCampaignQuest(initialCampaignState(),'border-watch');
  state.quests['border-watch'].stage=1;
  const done=resolveCampaignQuest(state,'border-watch','report');
  const toggled=toggleCampaignQuestTracking(done.state,'border-watch');
  assert.equal(toggled.changed,false);
  assert.equal(toggled.state.tracked,null);
});

