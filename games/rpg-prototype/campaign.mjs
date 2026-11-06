// W19.2 — persistent faction campaign, with settlement defense and political consequences.
export const CAMPAIGN_FACTIONS=Object.freeze({
  settlers:{name:'Free Settlements',color:'#9fd9b4',
    description:'Independent survivors rebuilding towns without military rule.'},
  dominion:{name:'Iron Dominion',color:'#b7c6d8',
    description:'Military remnants who believe security requires central command.'},
  vultures:{name:'Rust Vultures',color:'#e9a47a',
    description:'Competing raider bands who live by salvage and territorial strength.'},
  directorate:{name:'The Directorate',color:'#c9b0f0',
    description:'Engineers and scientists collecting dangerous lost technology.'}
});
export const CAMPAIGN_QUESTS=Object.freeze({
  'dead-signals':{
    id:'dead-signals',type:'main',title:'Dead Signals',
    description:'A buried relay is transmitting records from before the ceasefire. Decide who deserves its secrets.',
    giver:'dispatch',xp:160,caps:85,
    stages:[
      {event:'relay-scanned',node:'relay',text:'Investigate the damaged relay terminal near Station 6.'},
      {event:'dispatch-turnin',node:'dispatch',text:'Return to Relay Dispatch at Station 7 and choose who receives the records.'}
    ],
    outcomes:{
      settlers:{label:'Give the records to the Free Settlements',reputation:{settlers:18,dominion:-7,directorate:-4}},
      dominion:{label:'Deliver the records to the Iron Dominion',reputation:{dominion:18,settlers:-7,directorate:-4}}
    }
  },
  'water-debt':{
    id:'water-debt',type:'side',title:'Water Debt',
    description:'A settlement purifier is failing. Salvaged machine parts can bring clean water back.',
    giver:'water',xp:90,caps:45,
    stages:[
      {event:'pump-repaired',node:'pump',text:'Use 2 salvaged parts to repair the pump at Station 2.'},
      {event:'water-return',node:'water',text:'Return to the water coordinator at Station 1.'}
    ],
    outcomes:{
      help:{label:'Give the repaired purifier to the settlement',reputation:{settlers:12}},
      charge:{label:'Demand extra caps for the repair',reputation:{settlers:-4},caps:55}
    }
  },
  'border-watch':{
    id:'border-watch',type:'faction',title:'Border Watch',
    description:'The Iron Dominion wants a dangerous Raider removed before the next supply convoy.',
    giver:'dominion',xp:130,caps:65,
    stages:[
      {event:'raider-defeated',node:'arena',text:'Defeat the Raider in the Station 9 combat arena.'},
      {event:'border-return',node:'dominion',text:'Report to the Dominion field officer at Station 4.'}
    ],
    outcomes:{report:{label:'File a successful patrol report',reputation:{dominion:14,vultures:-9}}}
  },
  'lost-courier':{
    id:'lost-courier',type:'side',title:'The Missing Courier',
    description:'A courier vanished carrying encrypted infrastructure plans. Their distress beacon is still active.',
    giver:'courier',xp:110,caps:60,
    stages:[
      {event:'courier-evidence',node:'relay',text:'Recover the courier transmission at the relay near Station 6.'},
      {event:'courier-turnin',node:'courier',text:'Return to the distress beacon and decide who receives the plans.'}
    ],
    outcomes:{
      settlers:{label:'Share the plans with the Free Settlements',reputation:{settlers:10,directorate:-5}},
      directorate:{label:'Sell the plans to the Directorate',reputation:{directorate:16,settlers:-8},caps:80}
    }
  },
  'haven-first-light':{
    id:'haven-first-light',type:'main',title:"Haven's First Light",
    description:'Haven Junction can survive the winter if its generator comes online. Survey the damage, rebuild its electrical bus, protect the work crew, then decide who controls the power.',
    giver:'foreman',xp:240,caps:120,
    stages:[
      {event:'power-surveyed',node:'generator',text:'Inspect the scorched generator and identify what failed.'},
      {event:'power-repaired',node:'generator',text:'Rebuild its power bus using 4 salvaged parts.'},
      {event:'haven-defense',node:'arena',text:'Stop the Raider threatening Haven’s repair crew in the eastern combat zone.'},
      {event:'haven-return',node:'foreman',text:'Return to Haven Junction and decide who gets electricity.'}
    ],
    outcomes:{
      settlers:{label:'Keep the lights under community control',reputation:{settlers:22,dominion:-8,directorate:4}},
      dominion:{label:'Accept Dominion guards and their control of the grid',reputation:{dominion:18,settlers:-12},caps:65}
    }
  },
  'last-broadcast':{
    id:'last-broadcast',type:'side',title:'The Last Broadcast',
    description:'A courier claims the old military network carries evidence of an atrocity. Verify it before deciding whether the region deserves to hear it.',
    giver:'courier',xp:165,caps:75,
    stages:[
      {event:'blackout-log',node:'relay',text:'Recover the scrambled pre-war broadcast from the signal relay.'},
      {event:'orders-verified',node:'dominion',text:'Cross-check the message against the Dominion officer’s old orders.'},
      {event:'broadcast-return',node:'courier',text:'Return to the courier beacon and decide whether to publish the evidence.'}
    ],
    outcomes:{
      publish:{label:'Transmit the evidence to every settlement',reputation:{settlers:16,dominion:-15,directorate:5}},
      bury:{label:'Sell the evidence to the Directorate and silence the signal',reputation:{directorate:20,settlers:-10},caps:85}
    }
  }
});
export const CAMPAIGN_NODES=Object.freeze([
  {id:'dispatch',name:'RELAY DISPATCH',x:-54,z:-47,faction:'settlers',color:0x73c9a9},
  {id:'relay',name:'SIGNAL RELAY',x:-59,z:42,faction:'directorate',color:0x9f91d4},
  {id:'water',name:'WATER COORDINATOR',x:-49,z:-18,faction:'settlers',color:0x71b5cb},
  {id:'pump',name:'BROKEN PURIFIER',x:-51,z:2,faction:'settlers',color:0xd8b77e},
  {id:'dominion',name:'DOMINION OFFICER',x:13,z:-18,faction:'dominion',color:0xb0c7dc},
  {id:'courier',name:'COURIER BEACON',x:-56,z:34,faction:'directorate',color:0xb99bd2},
  {id:'foreman',name:'HAVEN FOREMAN',x:-38,z:-18,faction:'settlers',color:0xd9bd75},
  {id:'generator',name:'HAVEN GENERATOR',x:-25,z:-16,faction:'settlers',color:0xe8b65b}
]);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const validNumber=(value,otherwise=0)=>Number.isFinite(value)?value:otherwise;
const clone=state=>({
  version:1,quests:Object.fromEntries(Object.entries(state.quests).map(([id,q])=>
    [id,{status:q.status,stage:q.stage,outcome:q.outcome||null}])),
  reputation:{...state.reputation},caps:state.caps,tracked:state.tracked
});
export function initialCampaignState(){
  return {version:1,quests:{},
    reputation:Object.fromEntries(Object.keys(CAMPAIGN_FACTIONS).map(id=>[id,0])),
    caps:0,tracked:null};
}
export function safeCampaignSnapshot(saved){
  const state=initialCampaignState();
  if(!saved||typeof saved!=='object')return state;
  for(const id of Object.keys(CAMPAIGN_FACTIONS))
    state.reputation[id]=clamp(Math.round(validNumber(saved.reputation?.[id])),-100,100);
  state.caps=clamp(Math.floor(validNumber(saved.caps)),0,100000000);
  for(const [id,definition] of Object.entries(CAMPAIGN_QUESTS)){
    const entry=saved.quests?.[id];
    if(!entry||!['active','completed'].includes(entry.status))continue;
    const completed=entry.status==='completed';
    const outcome=completed&&Object.hasOwn(definition.outcomes,entry.outcome)?
      entry.outcome:null;
    if(completed&&!outcome)continue;
    state.quests[id]={status:entry.status,
      stage:completed?definition.stages.length:
        clamp(Math.floor(validNumber(entry.stage)),0,definition.stages.length-1),
      outcome};
  }
  if(typeof saved.tracked==='string'&&state.quests[saved.tracked]?.status==='active')
    state.tracked=saved.tracked;
  else state.tracked=Object.keys(state.quests)
    .find(id=>state.quests[id].status==='active')||null;
  return state;
}
export function startCampaignQuest(current,id){
  const state=safeCampaignSnapshot(current),definition=CAMPAIGN_QUESTS[id];
  if(!definition||state.quests[id])return {state,changed:false};
  state.quests[id]={status:'active',stage:0,outcome:null};
  state.tracked=id;
  return {state,changed:true,questId:id,type:'started'};
}
export function advanceCampaignEvent(current,event){
  const state=safeCampaignSnapshot(current),advanced=[];
  for(const [id,progress] of Object.entries(state.quests)){
    if(progress.status!=='active')continue;
    const definition=CAMPAIGN_QUESTS[id];
    if(definition.stages[progress.stage]?.event!==event)continue;
    // The final objective is resolved through a conversation choice, never
    // silently completed by visiting a location.
    if(progress.stage>=definition.stages.length-1)continue;
    progress.stage++;advanced.push(id);
  }
  return {state,changed:advanced.length>0,advanced};
}
export function resolveCampaignQuest(current,id,outcome){
  const state=safeCampaignSnapshot(current),definition=CAMPAIGN_QUESTS[id];
  const progress=state.quests[id];
  if(!definition||!progress||progress.status!=='active'||
    progress.stage!==definition.stages.length-1||
    !Object.hasOwn(definition.outcomes,outcome))
    return {state,changed:false};
  const decision=definition.outcomes[outcome];
  progress.status='completed';progress.stage=definition.stages.length;
  progress.outcome=outcome;
  for(const [faction,change] of Object.entries(decision.reputation||{}))
    state.reputation[faction]=clamp((state.reputation[faction]||0)+change,-100,100);
  const caps=definition.caps+(decision.caps||0);
  state.caps=clamp(state.caps+caps,0,100000000);
  if(state.tracked===id)state.tracked=Object.keys(state.quests)
    .find(other=>state.quests[other].status==='active')||null;
  return {state,changed:true,questId:id,type:'completed',xp:definition.xp,
    caps,outcome,reputation:{...decision.reputation}};
}
export function trackCampaignQuest(current,id){
  const state=safeCampaignSnapshot(current);
  if(state.quests[id]?.status!=='active')return {state,changed:false};
  state.tracked=id;return {state,changed:true};
}
// HUD objective markers are quest-only. A discovered place is still a location,
// but an available or completed quest must never create a quest objective.
export function trackedCampaignObjective(current){
  const state=safeCampaignSnapshot(current);
  const id=state.tracked;
  const progress=state.quests[id];
  if(!id||progress?.status!=='active')return null;
  const stage=CAMPAIGN_QUESTS[id]?.stages[progress.stage];
  return stage?{questId:id,node:stage.node,text:stage.text}:null;
}
export function campaignJournal(current){
  const state=safeCampaignSnapshot(current);
  return Object.values(CAMPAIGN_QUESTS).map(quest=>{
    const progress=state.quests[quest.id];
    const status=progress?.status||'available';
    return {id:quest.id,title:quest.title,type:quest.type,
      description:quest.description,status,stage:progress?.stage??0,
      objective:status==='completed'?'COMPLETED · '+quest.outcomes[progress.outcome].label:
        status==='active'?quest.stages[progress.stage].text:
        'Not accepted · Speak to '+CAMPAIGN_NODES.find(n=>n.id===quest.giver)?.name,
      tracked:state.tracked===quest.id,
      reward:quest.xp+' XP · '+quest.caps+'+ CAPS'};
  });
}
