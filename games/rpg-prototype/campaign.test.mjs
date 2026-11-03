import test from 'node:test';
import assert from 'node:assert/strict';
import {initialCampaignState,safeCampaignSnapshot,startCampaignQuest,
  advanceCampaignEvent,resolveCampaignQuest,trackCampaignQuest,
  campaignJournal,CAMPAIGN_QUESTS,CAMPAIGN_NODES} from './campaign.mjs';

test('Campaign has the original missions plus connected settlement and broadcast quests',()=>{
  assert.equal(Object.keys(CAMPAIGN_QUESTS).length,6);
  assert.equal(CAMPAIGN_QUESTS['dead-signals'].type,'main');
  assert.ok(CAMPAIGN_NODES.length>=8);
  assert.equal(campaignJournal(initialCampaignState())
    .filter(entry=>entry.status==='available').length,6);
});
test('Dead Signals starts, scans, resolves a real faction choice and cannot pay twice',()=>{
  let state=initialCampaignState();
  assert.equal(advanceCampaignEvent(state,'relay-scanned').changed,false);
  let result=startCampaignQuest(state,'dead-signals');
  assert.equal(result.changed,true);state=result.state;
  assert.equal(campaignJournal(state).find(q=>q.tracked).id,'dead-signals');
  assert.equal(resolveCampaignQuest(state,'dead-signals','settlers').changed,false);
  state=advanceCampaignEvent(state,'relay-scanned').state;
  result=resolveCampaignQuest(state,'dead-signals','settlers');
  assert.equal(result.changed,true);assert.equal(result.xp,160);
  assert.equal(result.caps,85);
  state=result.state;
  assert.equal(state.quests['dead-signals'].status,'completed');
  assert.equal(state.reputation.settlers,18);
  assert.equal(state.reputation.dominion,-7);
  assert.equal(state.caps,85);
  assert.equal(state.tracked,null);
  assert.equal(resolveCampaignQuest(state,'dead-signals','dominion').changed,false);
  assert.equal(startCampaignQuest(state,'dead-signals').changed,false);
});
test('Side quests track separate objective events and have meaningful outcomes',()=>{
  let state=initialCampaignState();
  state=startCampaignQuest(state,'water-debt').state;
  state=startCampaignQuest(state,'border-watch').state;
  state=startCampaignQuest(state,'lost-courier').state;
  assert.equal(trackCampaignQuest(state,'water-debt').state.tracked,'water-debt');
  state=advanceCampaignEvent(state,'raider-defeated').state;
  assert.equal(state.quests['border-watch'].stage,1);
  assert.equal(state.quests['water-debt'].stage,0);
  state=advanceCampaignEvent(state,'pump-repaired').state;
  state=advanceCampaignEvent(state,'courier-evidence').state;
  state=resolveCampaignQuest(state,'border-watch','report').state;
  state=resolveCampaignQuest(state,'water-debt','charge').state;
  const courier=resolveCampaignQuest(state,'lost-courier','directorate');
  assert.equal(courier.changed,true);
  state=courier.state;
  assert.equal(state.quests['lost-courier'].outcome,'directorate');
  assert.equal(state.reputation.dominion,14);
  assert.equal(state.reputation.settlers,-12);
  assert.equal(state.reputation.directorate,16);
  assert.equal(state.caps,65+45+55+60+80);
});
test('Snapshots reject fabricated completion, unknown quests and out-of-range reputation',()=>{
  const forged={caps:Infinity,reputation:{settlers:800,dominion:-200},
    quests:{'dead-signals':{status:'completed',outcome:'admin',stage:99},
      'water-debt':{status:'active',stage:999},fake:{status:'completed',outcome:'xx'}},
    tracked:'fake'};
  const state=safeCampaignSnapshot(forged);
  assert.equal(state.caps,0);
  assert.equal(state.reputation.settlers,100);
  assert.equal(state.reputation.dominion,-100);
  assert.equal(state.quests['dead-signals'],undefined);
  assert.equal(state.quests.fake,undefined);
  assert.equal(state.quests['water-debt'].stage,1);
  assert.equal(state.tracked,'water-debt');
});

test('Haven First Light requires survey, parts and defense before political choice',()=>{
  let state=initialCampaignState();
  state=startCampaignQuest(state,'haven-first-light').state;
  assert.equal(resolveCampaignQuest(state,'haven-first-light','settlers').changed,false);
  assert.equal(advanceCampaignEvent(state,'haven-defense').changed,false,
    'A kill before surveying and repairing cannot skip the quest');
  for(const event of ['power-surveyed','power-repaired','haven-defense']){
    const advanced=advanceCampaignEvent(state,event);
    assert.equal(advanced.changed,true,event);state=advanced.state;
  }
  const answer=resolveCampaignQuest(state,'haven-first-light','settlers');
  assert.equal(answer.changed,true);assert.equal(answer.xp,240);
  assert.equal(answer.caps,120);
  assert.equal(answer.state.reputation.settlers,22);
  assert.equal(answer.state.quests['haven-first-light'].status,'completed');
  assert.equal(resolveCampaignQuest(answer.state,'haven-first-light','dominion').changed,false);
  assert.equal(safeCampaignSnapshot(answer.state).quests['haven-first-light'].outcome,'settlers');
});
test('Last Broadcast requires corroboration and supports opposite faction outcomes',()=>{
  let state=startCampaignQuest(initialCampaignState(),'last-broadcast').state;
  assert.equal(advanceCampaignEvent(state,'orders-verified').changed,false);
  state=advanceCampaignEvent(state,'blackout-log').state;
  state=advanceCampaignEvent(state,'orders-verified').state;
  assert.equal(campaignJournal(state).find(q=>q.id==='last-broadcast').stage,2);
  const published=resolveCampaignQuest(state,'last-broadcast','publish');
  const buried=resolveCampaignQuest(state,'last-broadcast','bury');
  assert.equal(published.changed,true);assert.equal(buried.changed,true);
  assert.ok(published.state.reputation.settlers>buried.state.reputation.settlers);
  assert.ok(buried.state.caps>published.state.caps);
  assert.equal(published.state.reputation.dominion,-15);
});
