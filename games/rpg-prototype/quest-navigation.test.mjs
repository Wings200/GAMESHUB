import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialCampaignState,startCampaignQuest,toggleCampaignQuestTracking,
  trackedCampaignObjective,resolveCampaignQuest} from './campaign.mjs';

const source=readFileSync(new URL('./testing/main.js',import.meta.url),'utf8');
const page=readFileSync(new URL('./testing/index.html',import.meta.url),'utf8');

test('Both HUD compasses display the same active quest, including offscreen targets',()=>{
  assert.match(page,/id="fieldCompassQuest" class="compass-waypoint"/);
  assert.match(page,/id="visorCompassWaypoint" class="compass-waypoint"/);
  assert.match(source,/for\(const id of \['fieldCompassQuest','visorCompassWaypoint'\]\)/);
  assert.match(source,/positionNavigationMarker\(marker,target\.x,target\.z,heading,true\)/);
  assert.match(source,/fieldMap\.setQuestTarget\(/);
});

test('Only an active tracked quest has a HUD or map navigation objective',()=>{
  let state=startCampaignQuest(initialCampaignState(),'border-watch').state;
  assert.ok(trackedCampaignObjective(state));
  state=toggleCampaignQuestTracking(state,'border-watch').state;
  assert.equal(trackedCampaignObjective(state),null);
  state=toggleCampaignQuestTracking(state,'border-watch').state;
  state.quests['border-watch'].stage=1;
  state=resolveCampaignQuest(state,'border-watch','report').state;
  assert.equal(trackedCampaignObjective(state),null);
  assert.match(source,/marker\.style\.display='none';marker\.removeAttribute\('title'\)/);
  assert.match(source,/\$\('questTracker'\)\.classList\.toggle\('hidden',!tracked\)/);
});

test('Navigation HUD rejects NPCs and merchants; combat radar is not always on',()=>{
  assert.match(source,/type:\['relay','pump','courier','generator'\]\.includes\(n\.id\)\?'location':'person'/);
  assert.match(source,/\.\.\.VENDORS\.map\(v=>\(\{id:v\.id,label:v\.title,x:v\.x,z:v\.z,type:'person'\}\)\)/);
  assert.match(source,/\.filter\(point=>point\.type==='world-location'\)/);
  assert.match(source,/playerHealth\.alive&&combatContacts\.size>0/);
  assert.match(source,/const alerted=combatContacts\.has\(enemy\.id\)/);
});

test('The compass always stays visible while its optional markers can be absent',()=>{
  assert.match(page,/#questTracker\.hidden\{display:none!important\}/);
  assert.match(page,/class="field-compass nav-compass" id="fieldCompass"/);
  assert.match(page,/class="armor-compass nav-compass" id="visorCompass"/);
  assert.doesNotMatch(page,/#fieldCompass\.hidden,#visorCompass\.hidden/);
  assert.doesNotMatch(source,/\$\('fieldCompass'\)\.classList\.toggle\('hidden'/);
  assert.doesNotMatch(source,/\$\('visorCompass'\)\.classList\.toggle\('hidden'/);
});
