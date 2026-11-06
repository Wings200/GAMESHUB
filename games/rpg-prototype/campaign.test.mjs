import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialCampaignState,startCampaignQuest,resolveCampaignQuest,
  trackedCampaignObjective
} from './campaign.mjs';

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
