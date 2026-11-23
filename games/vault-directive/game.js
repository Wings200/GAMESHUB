(() => {
'use strict';
const COLS=5, ROWS=5, COUNT=COLS*ROWS, X=109, Y=192, W=188, H=92, GAP=8, SAVE_KEY='gameshub-vault-directive-v1';
const TYPES={
 command:{name:'Command Center',label:'COMMAND',color:'#bca274',icon:'⌘',scrap:70,credits:40,desc:'The seat of your authority. Protect it at all costs.'},
 power:{name:'Power Reactor',label:'POWER',color:'#82b9b0',icon:'⚡',scrap:40,credits:25,desc:'Produces energy for rooms and critical systems.'},
 water:{name:'Water Works',label:'WATER',color:'#68aeb9',icon:'◈',scrap:42,credits:25,desc:'Purifies water for every resident.'},
 farm:{name:'Hydroponics',label:'HYDROPONICS',color:'#8cb36d',icon:'✿',scrap:42,credits:25,desc:'Supplies the vault with fresh food.'},
 quarters:{name:'Living Quarters',label:'QUARTERS',color:'#c0aa83',icon:'⌂',scrap:28,credits:15,desc:'Houses up to ten residents per level.'},
 medbay:{name:'Medical Bay',label:'MEDICAL',color:'#c4aaa8',icon:'✚',scrap:38,credits:25,desc:'Produces medicine and helps contain outbreaks.'},
 security:{name:'Security Station',label:'SECURITY',color:'#9baec4',icon:'⬡',scrap:45,credits:30,desc:'Strengthens assaults and protects nearby sectors.'},
 workshop:{name:'Salvage Workshop',label:'WORKSHOP',color:'#c4a36f',icon:'⚒',scrap:35,credits:20,desc:'Recovers scrap and earns small amounts of credits.'}
};
const INITIAL={0:'command',1:'power'};
const SKILLS=[
 {id:'grid',group:'ENGINEERING',icon:'⚡',title:'Efficient Grid',desc:'+25% power generation.',requires:[]},
 {id:'recycling',group:'ENGINEERING',icon:'◈',title:'Water Recycling',desc:'+30% purified water production.',requires:['grid']},
 {id:'harvest',group:'ENGINEERING',icon:'✿',title:'Nutrient Farming',desc:'+30% hydroponics food output.',requires:[]},
 {id:'salvage',group:'ENGINEERING',icon:'⚒',title:'Salvage Teams',desc:'+40% scrap production.',requires:[]},
 {id:'economy',group:'CIVILIZATION',icon:'¤',title:'Efficient Construction',desc:'Build rooms for 20% less scrap and credits.',requires:['salvage']},
 {id:'community',group:'CIVILIZATION',icon:'♥',title:'Community Outreach',desc:'Residents gain extra loyalty, including when recruited.',requires:[]},
 {id:'housing',group:'CIVILIZATION',icon:'⌂',title:'Modular Quarters',desc:'+5 resident beds per quarters level.',requires:['community']},
 {id:'triage',group:'CIVILIZATION',icon:'✚',title:'Advanced Triage',desc:'+30% medical production and better recovery.',requires:['community']},
 {id:'tactics',group:'SECURITY',icon:'⬡',title:'Tactical Training',desc:'+15% chance to retake a hostile room by assault.',requires:[]},
 {id:'siege',group:'SECURITY',icon:'⛨',title:'Pressure Seals',desc:'Sealed hostile rooms lose resistance 50% faster.',requires:['tactics']}
];
const TUTORIAL=[
 {title:'A PLACE TO REST',desc:'Your vault starts with only a Command Center and an automated Power Reactor—and nobody lives here yet. Click an adjacent + EXCAVATE sector, then build Living Quarters.',action:'FIND BUILD SITE',type:'quarters'},
 {title:'SECURE CLEAN WATER',desc:'Residents will need clean drinking water. Select another adjoining + EXCAVATE sector and build Water Works.',action:'FIND BUILD SITE',type:'water'},
 {title:'GROW YOUR OWN FOOD',desc:'Build a Hydroponics farm. Your water and food systems produce supplies even before they are fully staffed.',action:'FIND BUILD SITE',type:'farm'},
 {title:'WELCOME A SURVIVOR',desc:'Now you have housing, food, and water. Click + SURVIVOR above the vault to invite your first resident. Nobody joins automatically during training.',action:'SHOW INTAKE',type:'recruit'},
 {title:'GIVE THEM A JOB',desc:'Select a resident in the roster below, then choose Water Works or Hydroponics and click ASSIGN. Workers increase room production.',action:'SELECT WORKPLACE',type:'assign'},
 {title:'UNLOCK YOUR FIRST SKILL',desc:'Open SKILLS above the vault. Spend your starting skill point on a permanent upgrade, then earn more research XP through gameplay.',action:'OPEN SKILL TREE',type:'skills'}
];
const FIRST=['Mara','Elias','Ava','Tobin','Soren','Jules','Nina','Rhea','Cato','Milo','Iris','Orin','Vera','Kira','Ezra','Noel','Dax','Mina','Lena','Cass','Sam','Eden'];
const LAST=['Vale','Rowan','Hale','Morrow','Briar','Stone','Voss','Mercer','Finn','Kade','Marsh','Wells','Reed','Dane'];
const TRAITS=['Determined','Inventive','Cautious','Optimistic','Skeptical','Compassionate','Ambitious','Protective','Independent','Idealistic','Restless'];
const canvas=document.getElementById('vaultCanvas'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let game=null,selected=0,selectedResident=null,speed=1,elapsed=0,lastStep=performance.now(),frame=0,saveNotice=0;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const sample=a=>a[Math.floor(Math.random()*a.length)];
const money=n=>Math.floor(n||0).toLocaleString();
const positions=i=>({c:i%COLS,r:Math.floor(i/COLS),x:X+(i%COLS)*(W+GAP),y:Y+Math.floor(i/COLS)*(H+GAP)});
const adjacent=i=>[i%COLS>0?i-1:-1,i%COLS<COLS-1?i+1:-1,i>=COLS?i-COLS:-1,i<COUNT-COLS?i+COLS:-1].filter(x=>x>=0);
const owned=r=>r&&r.owner==='vault';
const hostile=r=>r&&(r.owner==='rebels'||r.owner==='raiders');
const secs=()=>game?.rooms.filter(r=>r&&r.owner==='vault').length||0;
function room(type){return {type,owner:'vault',sealed:false,level:1,hp:100,resistance:0};}
function pushLog(text,alarm=false){if(!game)return;game.events.unshift({day:game.day,text,alarm});game.events=game.events.slice(0,55);}
function resident(n,job,all) {
 const id=n,trait=TRAITS[(n*7+3)%TRAITS.length];
 return {id,name:FIRST[n%FIRST.length]+' '+LAST[(n*3+1)%LAST.length],trait,loyalty:clamp(64+(n*17)%27-(trait==='Restless'?22:trait==='Ambitious'?12:0),27,96),health:100,job,bond:all.length?all[Math.floor(Math.random()*all.length)].id:null};
}
function fresh(name,mode,number=1){
 const rooms=Array(COUNT).fill(null);Object.entries(INITIAL).forEach(([i,t])=>rooms[+i]=room(t));
 const people=[];
 const sandbox=mode==='sandbox';
 return {version:2,name:name.trim().slice(0,28)||'VAULT-01',number,mode,phase:'vault',day:1,rooms,people,
 resources:{power:sandbox?220:55,food:sandbox?220:42,water:sandbox?220:42,meds:sandbox?80:24,scrap:sandbox?800:160,credits:sandbox?800:130},
 research:{level:1,xp:0,points:1,unlocked:[]},tutorial:{enabled:true,step:0,finished:false},
 factions:{rebels:{morale:70,leader:''},raiders:{morale:80,leader:'The Marauders'}},outbreaks:{},events:[{day:1,text:'The hatch is secure. Your new vault is empty. Build shelter and begin welcoming survivors.',alarm:false}],history:[],lastProduction:null};
}
function goodGame(s){
 return s&&(s.version===1||s.version===2)&&Array.isArray(s.rooms)&&s.rooms.length===COUNT&&Array.isArray(s.people)&&s.resources&&s.factions&&s.outbreaks&&Array.isArray(s.events)&&['vault','exile','gameover'].includes(s.phase)&&['standard','hardcore','sandbox'].includes(s.mode);
}
function saved(){
 try{
  const s=JSON.parse(localStorage.getItem(SAVE_KEY));
  if(!goodGame(s))return null;
  // Upgrade existing alpha saves in place without deleting residents or buildings.
  if(!s.research||!Array.isArray(s.research.unlocked))s.research={level:1,xp:0,points:1,unlocked:[]};
  if(!s.tutorial)s.tutorial={enabled:false,step:TUTORIAL.length,finished:true};
  s.version=2;
  return s;
 }catch{return null;}
}
function persist(){if(!game)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(game));}catch{}}
function begin(name,mode){
 game=fresh(name,mode);selected=0;selectedResident=null;speed=1;elapsed=0;lastStep=performance.now();$('startOverlay').classList.add('hidden');$('exileOverlay').classList.add('hidden');pushLog('Overseer authority granted. Construct, assign, and defend.',false);persist();render();
}
function resume(s){
 game=s;selected=0;selectedResident=null;speed=1;elapsed=0;lastStep=performance.now();
 $('startOverlay').classList.add('hidden');$('exileOverlay').classList.toggle('hidden',game.phase==='vault');
 render();if(game.phase!=='vault')renderExile();
}
function hasSkill(id){return !!game?.research?.unlocked.includes(id);}
function earnXP(amount,reason){
 if(!game||amount<=0)return;
 const progress=game.research;progress.xp+=amount;
 let threshold=55+(progress.level-1)*20;
 while(progress.xp>=threshold){
  progress.xp-=threshold;progress.level++;progress.points++;
  pushLog('DIRECTIVE LEVEL '+progress.level+': +1 skill point. Open SKILLS to spend it.');
  threshold=55+(progress.level-1)*20;
 }
}
function buildCost(t){
 return {scrap:Math.ceil(t.scrap*(hasSkill('economy')?.8:1)),
  credits:Math.ceil(t.credits*(hasSkill('economy')?.8:1))};
}
function tutorialDone(){
 const t=game.tutorial;if(!t?.enabled)return;
 while(t.step<TUTORIAL.length){
  const objective=TUTORIAL[t.step].type;
  const complete=objective==='quarters'?has('quarters'):objective==='water'?has('water'):
   objective==='farm'?has('farm'):objective==='recruit'?game.people.length>0:
   objective==='assign'?game.people.some(p=>['water','farm'].includes(game.rooms[p.job]?.type)):
   game.research.unlocked.length>0;
  if(!complete)break;
  t.step++;
  if(t.step<TUTORIAL.length)pushLog('Tutorial complete: '+TUTORIAL[t.step-1].title+'. Next: '+TUTORIAL[t.step].title+'.');
 }
 if(t.step>=TUTORIAL.length){
  t.enabled=false;t.finished=true;game.resources.scrap+=20;game.resources.credits+=15;
  pushLog('OVERSEER TRAINING COMPLETE! +20 scrap and +15 credits. Your vault now operates independently.');
 }
}
function inviteSurvivor(){
 if(!game||game.phase!=='vault')return;
 const beds=capacity(),first=game.people.length===0,cost=first?0:12;
 if(game.people.length>=beds||!has('quarters')||!has('water')||!has('farm')
  ||game.resources.food<5||game.resources.water<5||game.resources.credits<cost)return;
 const i=game.rooms.findIndex(r=>owned(r)&&!r.sealed&&r.type==='quarters');
 if(i<0)return;
 const n=Math.max(-1,...game.people.map(p=>p.id))+1;
 const person=resident(n,i,game.people);
 if(hasSkill('community'))person.loyalty=clamp(person.loyalty+8,0,100);
 game.resources.credits-=cost;game.resources.food-=3;game.resources.water-=3;
 game.people.push(person);
 pushLog('NEW ARRIVAL: '+person.name+' joined your vault. Select them in RESIDENTS to assign a job.');
 earnXP(15,'recruit');
 tutorialDone();commit();
}
function unlockSkill(id){
 if(!game||game.phase!=='vault')return;
 const skill=SKILLS.find(item=>item.id===id);
 if(!skill||game.research.points<1||hasSkill(id)||skill.requires.some(req=>!hasSkill(req)))return;
 game.research.points--;game.research.unlocked.push(id);
 pushLog('SKILL UNLOCKED: '+skill.title+'. '+skill.desc);
 tutorialDone();commit();
}
function renderSkills(){
 if(!game)return;
 const progress=game.research,threshold=55+(progress.level-1)*20;
 $('researchLevel').textContent=progress.level;
 $('researchPoints').textContent=progress.points;
 $('skillPointsChip').textContent=progress.points;
 $('researchXP').textContent=Math.floor(progress.xp)+' / '+threshold;
 $('researchXPBar').style.width=(Math.min(100,progress.xp/threshold*100))+'%';
 const root=$('skillsList');root.replaceChildren();
 for(const group of ['ENGINEERING','CIVILIZATION','SECURITY']){
  const section=elem('section','skill-branch');
  section.append(elem('div','skill-branch-title',group));
  const tiles=elem('div','skill-tiles');
  SKILLS.filter(skill=>skill.group===group).forEach(skill=>{
   const learned=hasSkill(skill.id);
   const blocked=skill.requires.some(req=>!hasSkill(req));
   const card=elem('article','skill-card'+(learned?' learned':blocked?' blocked':''));
   const badge=elem('span','skill-icon',skill.icon);
   const detail=elem('div','skill-detail');
   detail.append(elem('strong','',skill.title),elem('p','',skill.desc));
   if(skill.requires.length)detail.append(elem('small','', 'REQUIRES: '+skill.requires.map(req=>SKILLS.find(s=>s.id===req)?.title||req).join(', ')));
   const button=action(learned?'UNLOCKED':blocked?'LOCKED':progress.points>0?'UNLOCK · 1 POINT':'NEED 1 POINT',
    ()=>unlockSkill(skill.id),learned||blocked||progress.points<1||game.phase!=='vault');
   card.append(badge,detail,button);tiles.append(card);
  });
  section.append(tiles);root.append(section);
 }
}
function renderTutorial(){
 const t=game.tutorial,show=game.phase==='vault'&&t?.enabled&&t.step<TUTORIAL.length;
 $('tutorialPanel').hidden=!show;
 if(!show)return;
 const step=TUTORIAL[t.step];
 $('tutorialCounter').textContent=(t.step+1)+' / '+TUTORIAL.length;
 $('tutorialTitle').textContent=step.title;
 $('tutorialDescription').textContent=step.desc;
 $('tutorialFocusBtn').textContent=step.action+' →';
 $('tutorialProgress').style.width=Math.round(t.step/TUTORIAL.length*100)+'%';
}
function focusTutorial(){
 if(!game?.tutorial?.enabled)return;
 const task=TUTORIAL[game.tutorial.step]?.type;
 if(['quarters','water','farm'].includes(task)){
  const i=game.rooms.findIndex((r,j)=>!r&&canBuild(j));if(i>=0){selected=i;renderInspector();}
 }else if(task==='recruit'){$('intakeBtn').focus?.();}
 else if(task==='assign'){
  selected=game.rooms.findIndex(r=>owned(r)&&r.type==='water');
  if(selected<0)selected=game.rooms.findIndex(r=>owned(r)&&r.type==='farm');
  selectedResident=game.people[0]?.id??null;renderInspector();renderResidents();
 }else if(task==='skills'){$('skillsOverlay').classList.remove('hidden');renderSkills();}
}
function averageLoyalty(){return game?.people.length?Math.round(game.people.reduce((n,p)=>n+p.loyalty,0)/game.people.length):0;}
function staff(i){return game.people.filter(p=>p.job===i&&p.health>10).length;}
function production(){
 const d={power:0,food:0,water:0,meds:0,scrap:0,credits:0};
 let active=0;
 game.rooms.forEach((r,i)=>{
  if(!owned(r)||r.sealed||r.hp<=0)return;
  active++;const factor=(.45+.24*staff(i))*r.level*(r.hp/100);
  if(r.type==='power')d.power+=18*factor*(hasSkill('grid')?1.25:1);
  if(r.type==='water')d.water+=14*factor*(hasSkill('recycling')?1.3:1);
  if(r.type==='farm')d.food+=14*factor*(hasSkill('harvest')?1.3:1);
  if(r.type==='medbay')d.meds+=3.4*factor*(hasSkill('triage')?1.3:1);
  if(r.type==='workshop'){d.scrap+=3.2*factor*(hasSkill('salvage')?1.4:1);d.credits+=1.7*factor;}
  if(r.type==='command')d.credits+=2.3*factor;
 });
 d.power-=active*1.25+game.people.length*.12;
 d.food-=game.people.length*.56;
 d.water-=game.people.length*.57;
 d.meds-=game.people.length*.065;
 return d;
}
function capacity(){return game.rooms.reduce((n,r)=>n+(owned(r)&&!r.sealed&&r.type==='quarters'?(hasSkill('housing')?15:10)*r.level:0),0);}
function has(type,owner='vault'){return game.rooms.some(r=>r&&r.owner===owner&&r.type===type);}
function setResource(key,n){game.resources[key]=clamp(game.resources[key]+n,0,9999);}
function applyProduction(){
 const prod=production();game.lastProduction=prod;
 const shortages=['power','food','water'].filter(key=>game.resources[key]+prod[key]<0.01);
 Object.entries(prod).forEach(([key,amount])=>setResource(key,amount));
 const crowd=game.people.length>capacity();
 game.people.forEach(p=>{
  const sheltered=owned(game.rooms[p.job])&&!game.rooms[p.job].sealed;
  const risk=(shortages.length?2.8*shortages.length:0)+(crowd?1.1:0)+(sheltered?0:1.3)+(p.health<35?.5:0);
  const friend=game.people.find(other=>other.id===p.bond);
  const social=friend?clamp((friend.loyalty-p.loyalty)*.014,-.38,.38)+(owned(game.rooms[friend.job])?0:-.2):0;
  const traitEffect=p.trait==='Skeptical'&&shortages.length?-.65:p.trait==='Optimistic'?.17:p.trait==='Protective'&&sheltered&&game.rooms[p.job]?.type==='security'?.22:p.trait==='Compassionate'&&sheltered&&game.rooms[p.job]?.type==='medbay'?.18:p.trait==='Ambitious'&&game.rooms[p.job]?.type==='quarters'?-.10:0;
  p.loyalty=clamp(p.loyalty+(risk?-risk:.28)+social+traitEffect+(hasSkill('community')?.25:0),0,98);
  if(shortages.length)p.health=clamp(p.health-1.2*shortages.length,0,100);
  else if(game.resources.meds>1&&has('medbay'))p.health=clamp(p.health+(hasSkill('triage')?.8:.55),0,100);
 });
 if(shortages.length&&(game.day%3===0))pushLog('Supply crisis: '+shortages.join(', ').toUpperCase()+' depleted. Resident loyalty is falling.',true);
 if(crowd&&game.day%4===0)pushLog('Overcrowding has increased unrest. Build living quarters.',true);
}
function hostileSectorIndices(type){return game.rooms.map((r,i)=>r&&r.owner===type?i:-1).filter(i=>i>=0);}
function factionSupport(type){
 const tiles=hostileSectorIndices(type).map(i=>game.rooms[i]);
 const food=tiles.some(r=>r.type==='farm'&&!r.sealed),water=tiles.some(r=>r.type==='water'&&!r.sealed),medical=tiles.some(r=>r.type==='medbay'&&!r.sealed);
 return {food,water,medical};
}
function transfer(i,type){
 const r=game.rooms[i];if(!r)return false;
 r.owner=type;r.sealed=false;r.resistance=55+Math.floor(Math.random()*20);r.hp=clamp(r.hp-6,25,100);return true;
}
function beginHostile(type,forced=false){
 if(game.phase!=='vault')return;
 const own=game.rooms.map((r,i)=>owned(r)?i:-1).filter(i=>i>=0);
 if(!own.length)return;
 if(type==='rebels'){
  if(game.people.length<4){pushLog('At least four residents are required before a faction can organize an uprising.');return;}
  if(hostileSectorIndices('rebels').length){pushLog('Rebel cells are already active inside the vault.',true);return;}
  const candidates=own.filter(i=>i!==0&&[7,8,9,6,3,2,4,1].includes(i));
  if(!candidates.length)return;
  let chosen=candidates.filter(i=>staff(i)>0);
  const i=sample(chosen.length?chosen:candidates);
  const leader=[...game.people].sort((a,b)=>a.loyalty-b.loyalty)[0];
  game.factions.rebels={morale:72,leader:leader?leader.name:'Disaffected Workers'};
  transfer(i,'rebels');
  if(leader){
   leader.loyalty=clamp(leader.loyalty-10,0,100);
   const sympathizers=game.people.filter(p=>p.bond===leader.id&&p.loyalty<76);
   sympathizers.forEach(p=>{p.loyalty=clamp(p.loyalty-8,0,100);});
   if(sympathizers.length)pushLog(sympathizers.map(p=>p.name).join(', ')+' sympathized with the rebel leader.',true);
  }
  pushLog(game.factions.rebels.leader+' has led an internal uprising. '+TYPES[game.rooms[i].type].name+' is rebel territory!',true);
 }else{
  if(hostileSectorIndices('raiders').length){pushLog('Outside raiders are already occupying a sector.',true);return;}
  const surface=own.filter(i=>i<COLS);
  const i=surface.length?sample(surface.filter(j=>j!==0).length?surface.filter(j=>j!==0):surface):own[0];
  game.factions.raiders={morale:85,leader:'The Marauders'};
  transfer(i,'raiders');
  pushLog('OUTSIDE BREACH: Raiders have captured '+TYPES[game.rooms[i].type].name+'.',true);
 }
 if(forced)pushLog('Scenario test initiated from Overseer Operations.');
 checkLoss();commit();
}
function beginOutbreak(forced=false){
 if(game.phase!=='vault')return;
 const own=game.rooms.map((r,i)=>owned(r)&&r.type!=='medbay'&&!r.sealed&&!game.outbreaks[i]?i:-1).filter(i=>i>=0);
 if(!own.length){pushLog('No eligible sector for a new outbreak.');return;}
 const i=sample(own);
 game.outbreaks[i]={days:6,severity:1};
 pushLog('BIOHAZARD ALERT: An outbreak has begun in '+TYPES[game.rooms[i].type].name+'. Quarantine or treat the sector.',true);
 if(forced)pushLog('Scenario test initiated from Overseer Operations.');
 commit();
}
function tickOutbreaks(){
 const spread=[];
 Object.entries(game.outbreaks).forEach(([key,ill])=>{
  const i=+key,r=game.rooms[i];if(!owned(r)){delete game.outbreaks[i];return;}
  const victims=game.people.filter(p=>p.job===i);
  victims.forEach(p=>{p.health=clamp(p.health-(r.sealed?2:4)*ill.severity,0,100);p.loyalty=clamp(p.loyalty-1.2,0,100);});
  if(game.resources.meds>=2&&has('medbay')){game.resources.meds-=2;ill.days-=2;}else ill.days-=1;
  if(!r.sealed&&ill.days>0)adjacent(i).forEach(j=>{
   if(owned(game.rooms[j])&&!game.rooms[j].sealed&&!game.outbreaks[j]&&Math.random()<.12)spread.push(j);
  });
  if(ill.days<=0){delete game.outbreaks[i];pushLog('Medical teams cleared the infection in '+TYPES[r.type].name+'.');}
 });
 spread.forEach(i=>{if(!game.outbreaks[i]){game.outbreaks[i]={days:5,severity:1};pushLog('Outbreak has spread to '+TYPES[game.rooms[i].type].name+'.',true);}});
}
function tickEnemies(){
 for(const type of ['rebels','raiders']){
  const regions=hostileSectorIndices(type);
  if(!regions.length)continue;
  const f=game.factions[type],support=factionSupport(type),sufficient=support.food&&support.water;
  let drain=sufficient?.18:support.food||support.water?1.7:5.5;
  if(support.medical)drain*=.55;
  if(regions.every(i=>game.rooms[i].sealed))drain+=5;
  f.morale=clamp(f.morale-drain,0,100);
  for(const i of regions){
   const r=game.rooms[i];
   if(r.sealed){r.resistance=clamp(r.resistance-(r.type==='farm'||r.type==='water'?2.8:8.5)*(hasSkill('siege')?1.5:1),0,100);}
   else r.resistance=clamp(r.resistance+(sufficient?.8:-1.8),0,100);
   if(r.resistance<=0){recapture(i,'Siege succeeded: '+TYPES[r.type].name+' has surrendered.');}
  }
  if(!hostileSectorIndices(type).length)continue;
  if(f.morale<=4){hostileSectorIndices(type).forEach(i=>recapture(i,'Hostile forces abandoned '+TYPES[game.rooms[i].type].name+'.'));pushLog((type==='rebels'?'Rebellion':'Raider occupation')+' has collapsed.',false);continue;}
  if(game.day%4===0&&f.morale>18){
   const fronts=hostileSectorIndices(type).filter(i=>!game.rooms[i].sealed);
   const options=[];
   fronts.forEach(i=>adjacent(i).forEach(j=>{const r=game.rooms[j];if(owned(r)&&!r.sealed&&!options.includes(j))options.push(j);}));
   if(options.length&&Math.random()<(sufficient?.85:.58)){
    const target=sample(options);
    const guarded=adjacent(target).some(i=>owned(game.rooms[i])&&!game.rooms[i].sealed&&game.rooms[i].type==='security');
    if(guarded&&Math.random()<.7){pushLog('Security repelled a '+type+' assault near '+TYPES[game.rooms[target].type].name+'.');}
    else{transfer(target,type);f.morale=clamp(f.morale+9,0,100);pushLog((type==='rebels'?'Rebels':'Raiders')+' expanded into '+TYPES[game.rooms[target].type].name+'!',true);}
   }
  }
 }
}
function recapture(i,note){
 const r=game.rooms[i];if(!hostile(r))return;
 r.owner='vault';r.sealed=false;r.resistance=0;r.hp=clamp(r.hp-5,20,100);pushLog(note);
}
function tick(){
 if(!game||game.phase!=='vault')return;
 game.day++;
 earnXP(2,'time');
 applyProduction();
 tickOutbreaks();
 tickEnemies();
 if(game.phase==='vault'){
  if(!game.tutorial?.enabled&&game.people.length>=4&&game.day>=8&&game.day%5===0&&averageLoyalty()<51&&Math.random()<.48)beginHostile('rebels');
  else if(!game.tutorial?.enabled&&game.people.length>=4&&game.day>15&&game.day%11===0&&Math.random()<.25&&averageLoyalty()<75)beginHostile('rebels');
  if(!game.tutorial?.enabled&&game.day>=11&&game.day%9===0&&Math.random()<.4)beginHostile('raiders');
  if(!game.tutorial?.enabled&&game.people.length>=1&&game.day>=7&&game.day%8===0&&Math.random()<.35)beginOutbreak();
  if(!game.tutorial?.enabled&&game.day%7===0&&Math.random()<.52&&game.people.length<capacity()){
   const n=game.people.length,job=game.rooms.findIndex(r=>owned(r)&&r.type==='quarters');
   if(job>=0&&game.people.length>0){const p=resident(Math.max(...game.people.map(p=>p.id))+1,job,game.people);game.people.push(p);pushLog('A new survivor, '+p.name+', joined your vault.');earnXP(12,'arrival');}
  }
  if(game.day%9===0){game.resources.scrap+=12;pushLog('Scavenger delivery: +12 scrap recovered from the surface.');}
  checkLoss();
 }
 commit();
}
function checkLoss(){
 if(!game||game.phase!=='vault')return;
 const vault=secs(),total=game.rooms.filter(Boolean).length,command=game.rooms.find(r=>r&&r.type==='command');
 if(vault===0||(command&&command.owner!=='vault'&&vault<=Math.max(2,Math.floor(total*.2)))){
  game.phase=game.mode==='hardcore'?'gameover':'exile';
  game.history.push({name:game.name,day:game.day,cause:'overthrown'});
  pushLog('COMMAND LOST. The Overseer has been forced into exile.',true);
  speed=0;renderExile();
 }
}
function canBuild(i){return !game.rooms[i]&&adjacent(i).some(j=>owned(game.rooms[j])&&!game.rooms[j].sealed);}
function build(i,type){
 const t=TYPES[type];if(!t||!canBuild(i)||game.phase!=='vault')return;
 const cost=buildCost(t);if(game.resources.scrap<cost.scrap||game.resources.credits<cost.credits)return;
 game.resources.scrap-=cost.scrap;game.resources.credits-=cost.credits;game.rooms[i]=room(type);
 pushLog(t.name+' constructed in sector '+sector(i)+'.');earnXP(24,'construction');tutorialDone();commit();
}
function sector(i){return 'B'+(Math.floor(i/COLS)+1)+'-'+String((i%COLS)+1).padStart(2,'0');}
function manage(action){
 const r=game.rooms[selected];if(!r||game.phase!=='vault')return;
 const i=selected;
 if(action==='seal'){
  r.sealed=!r.sealed;
  pushLog(sector(i)+' blast doors '+(r.sealed?'SEALED. Supplies and movement halted.':'reopened.'),r.sealed);
 }else if(action==='upgrade'&&owned(r)&&r.level<3){
  const scrap=25*r.level,credits=15*r.level;
  if(game.resources.scrap<scrap||game.resources.credits<credits)return;
  game.resources.scrap-=scrap;game.resources.credits-=credits;r.level++;r.hp=100;
  pushLog(TYPES[r.type].name+' upgraded to level '+r.level+'.');earnXP(18,'upgrade');
 }else if(action==='repair'&&owned(r)&&r.hp<100&&game.resources.scrap>=12){
  game.resources.scrap-=12;r.hp=clamp(r.hp+40,0,100);pushLog(sector(i)+' structural damage repaired.');
 }else if(action==='storm'&&hostile(r)&&game.resources.power>=7&&game.resources.meds>=3){
  game.resources.power-=7;game.resources.meds-=3;
  const guards=game.people.filter(p=>owned(game.rooms[p.job])&&game.rooms[p.job].type==='security'&&!game.rooms[p.job].sealed&&p.health>25).length;
  const chance=clamp(.35+guards*.12+(r.sealed?.16:0)-(r.resistance/350)+(hasSkill('tactics')?.15:0),.16,.94);
  if(Math.random()<chance){
   recapture(i,'Security teams reclaimed '+TYPES[r.type].name+' after close-quarters fighting.');
  }else{
   r.resistance=clamp(r.resistance-18,0,100);
   const guard=game.people.find(p=>owned(game.rooms[p.job])&&game.rooms[p.job].type==='security');
   if(guard)guard.health=clamp(guard.health-14,0,100);
   pushLog('Assault on '+sector(i)+' failed. Defenders held their ground.',true);
   if(r.resistance<=0)recapture(i,'Enemy resistance broke in '+sector(i)+'.');
  }
 }else if(action==='negotiate'&&hostile(r)&&game.resources.credits>=24){
  game.resources.credits-=24;
  const chance=r.owner==='rebels'?clamp(.35+averageLoyalty()/350,.35,.65):.19;
  if(Math.random()<chance){recapture(i,'Peace agreement reached in '+sector(i)+'.');}
  else{r.resistance=clamp(r.resistance-10,0,100);pushLog('Negotiations for '+sector(i)+' collapsed. 24 credits spent.',true);}
 }else if(action==='treat'&&game.outbreaks[i]&&game.resources.meds>=8){
  game.resources.meds-=8;game.outbreaks[i].days=Math.max(0,game.outbreaks[i].days-4);
  pushLog('Emergency medical response deployed to '+sector(i)+'.');
 }else if(action==='assign'&&owned(r)&&selectedResident!==null){
  const p=game.people.find(p=>p.id===selectedResident);
  if(p){p.job=i;pushLog(p.name+' assigned to '+TYPES[r.type].name+'.');selectedResident=null;earnXP(10,'staffing');}
 }
 tutorialDone();checkLoss();commit();
}
function renderExile(){
 if(!game||game.phase==='vault'){$('exileOverlay').classList.add('hidden');return;}
 $('exileOverlay').classList.remove('hidden');
 $('exileTitle').innerHTML=game.phase==='gameover'?'DIRECTIVE<br><em>TERMINATED.</em>':'OVERSEER<br><em>OVERTHROWN.</em>';
 $('exileText').textContent=game.phase==='gameover'?'Your vault has fallen. Hardcore mode does not allow recovery. Begin a new civilization to try again.':'The command bunker is lost. Your people scattered. Loyal survivors are waiting for your next decision.';
 const loyalists=game.people.filter(p=>p.loyalty>=60).length;
 $('exileStats').textContent='DAY '+game.day+'   /   LOYALISTS '+loyalists+'   /   CONTROL '+secs()+' ROOMS';
 const actions=$('exileActions');actions.replaceChildren();
 const option=(label,detail,fn,enabled=true)=>{
  const b=document.createElement('button');b.type='button';b.className='outline';b.disabled=!enabled;
  const s=document.createElement('strong');s.textContent=label;const p=document.createElement('small');p.textContent=detail;b.append(s,p);b.addEventListener('click',fn);actions.append(b);
 };
 if(game.phase==='exile'){
  option('ORGANIZE A COUNTEROFFENSIVE','Spend 35 scrap and 10 medicine. Loyalists attempt to retake command.',()=>exileAction('assault'),game.resources.scrap>=35&&game.resources.meds>=10);
  option('NEGOTIATE A RETURN','Spend 35 credits to convince the new leadership to share control.',()=>exileAction('deal'),game.resources.credits>=35);
  option('FOUND A NEW VAULT','Take your surviving crew underground elsewhere. Your former home remains in the history.',()=>exileAction('rebuild'));
 }
 option('START A NEW RUN','Abandon this timeline and choose a new vault and game mode.',()=>{$('exileOverlay').classList.add('hidden');$('startOverlay').classList.remove('hidden');$('continueBtn').hidden=true;});
}
function exileAction(choice){
 if(game.phase!=='exile')return;
 const survivors=game.people.filter(p=>p.loyalty>=60).length;
 if(choice==='rebuild'){
  const old=game,number=(old.number||1)+1;
  game=fresh(old.name.replace(/\s+[IVX]+$/,'')+' II',old.mode,number);
  game.history=old.history.slice();
  game.resources.scrap=clamp(Math.floor(old.resources.scrap*.45),70,300);
  game.resources.credits=clamp(Math.floor(old.resources.credits*.45),60,300);
  game.tutorial={enabled:false,step:TUTORIAL.length,finished:true};
  game.research=JSON.parse(JSON.stringify(old.research));
  const loyal=old.people.filter(p=>p.loyalty>=60).slice(0,10);
  if(loyal.length)game.rooms[5]=room('quarters');
  game.people=loyal.map(p=>({...p,job:5}));
  game.people.forEach(p=>{if(!game.rooms[p.job])p.job=0;});
  pushLog('A new chapter begins. The fallen vault remains under enemy control.',true);
  game.phase='vault';speed=1;
 }else{
  if(choice==='assault'){game.resources.scrap-=35;game.resources.meds-=10;}
  if(choice==='deal')game.resources.credits-=35;
  const chance=choice==='assault'?clamp(.30+survivors*.047,.30,.86):clamp(.25+averageLoyalty()*.006,.25,.80);
  if(Math.random()<chance){
   const command=game.rooms.find(r=>r&&r.type==='command');
   if(command){command.owner='vault';command.sealed=false;command.hp=55;command.resistance=0;}
   const enemy=game.rooms.map((r,i)=>hostile(r)&&i!==0?i:-1).filter(i=>i>=0);
   if(enemy.length)recapture(sample(enemy),'Loyalists secured a supporting sector during the return.');
   game.phase='vault';speed=1;game.factions.rebels.morale=clamp(game.factions.rebels.morale-22,0,100);
   pushLog(choice==='assault'?'Counteroffensive succeeded. Overseer command restored!':'Negotiations succeeded. A fragile power-sharing arrangement is in place.');
  }else{
   game.day+=2;
   pushLog(choice==='assault'?'The counteroffensive failed. Your resistance must regroup.':'Negotiations failed. The new rulers rejected your offer.',true);
  }
 }
 $('exileOverlay').classList.toggle('hidden',game.phase==='vault');persist();render();if(game.phase!=='vault')renderExile();
}
function commit(){persist();render();}
function elem(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;}
function action(label,method,disabled=false,cls=''){
 const b=elem('button',cls,label);b.type='button';b.disabled=disabled;b.addEventListener('click',method);return b;
}
function render(){
 if(!game)return;
 const prod=production(),territory=game.rooms.filter(Boolean).length;
 $('vaultName').textContent=game.name.toUpperCase()+' / SECTOR '+game.number;
 $('day').textContent=String(game.day).padStart(3,'0');$('population').textContent=String(game.people.length).padStart(2,'0');
 $('loyalty').textContent=game.people.length?averageLoyalty()+'%':'—';$('control').textContent=territory?Math.round(secs()/territory*100)+'%':'0%';
 $('roomCount').textContent=String(territory).padStart(2,'0')+' SECTORS';
 $('statusChip').textContent=game.phase==='exile'?'OVERSEER EXILED':game.phase==='gameover'?'COMMAND TERMINATED':hostileSectorIndices('rebels').length||hostileSectorIndices('raiders').length?'ACTIVE HOSTILITIES':'OPERATIONS NORMAL';
 $('worldMessage').textContent=game.phase==='vault'?(Object.keys(game.outbreaks).length?'BIOHAZARD CONDITIONS':hostileSectorIndices('rebels').length||hostileSectorIndices('raiders').length?'SECTORS UNDER OCCUPATION':'ALL SYSTEMS REPORTING'):'COMMAND UNAVAILABLE';
 $('speedBtn').textContent=speed+'×';$('pauseBtn').textContent=speed===0?'▶':'Ⅱ';
 $('rosterCount').textContent=game.people.length;
 for(const k of ['power','food','water','meds','scrap','credits']){
  $('r-'+k).textContent=money(game.resources[k]);const node=$('r-'+k).closest('.resource');node.classList.toggle('critical',game.resources[k]<(k==='power'||k==='food'||k==='water'?20:0));
  if(['power','food','water','meds'].includes(k))$('d-'+k).textContent=(prod[k]>=0?'+':'')+prod[k].toFixed(1)+' / DAY';
 }
 $('intakeBtn').disabled=game.phase!=='vault'||!has('quarters')||!has('water')||!has('farm')||
    game.people.length>=capacity()||game.resources.food<5||game.resources.water<5||
    game.resources.credits<(game.people.length===0?0:12);
 $('intakeBtn').title=game.people.length===0?'Requires quarters, clean water, food production and 5 food/water supplies':'Invite a survivor: 12 credits, 3 food, 3 water (housing required)';
 renderTutorial();renderSkills();
 renderInspector();renderResidents();renderEvents();
 const actionsEnabled=game.phase==='vault';
 $('revoltBtn').disabled=!actionsEnabled||game.tutorial?.enabled||game.people.length<4;$('raidBtn').disabled=!actionsEnabled||game.tutorial?.enabled;$('outbreakBtn').disabled=!actionsEnabled||game.tutorial?.enabled;
}
function addInfo(body,label,value){
 const row=elem('div','info-line');row.append(elem('span','',label),elem('b','',value));body.append(row);
}
function renderInspector(){
 const r=game.rooms[selected],root=$('inspectorBody');root.replaceChildren();
 if(!r){
  $('inspectorTitle').textContent='UNEXCAVATED EARTH';
  const allowed=canBuild(selected);
  $('inspectorDescription').textContent='Sector '+sector(selected)+(allowed?' is connected. Select a room blueprint below.':' needs an adjoining controlled, unsealed room before construction.');
  root.append(elem('div','section-heading','AVAILABLE BLUEPRINTS'));
  const list=elem('div','build-list');
  Object.entries(TYPES).forEach(([key,t])=>{
   if(key==='command')return;
   const cost=buildCost(t);const b=elem('button','build-option');b.disabled=!allowed||game.phase!=='vault'||game.resources.scrap<cost.scrap||game.resources.credits<cost.credits;
   b.append(elem('span','b-icon',t.icon));
   const v=elem('span');v.append(elem('strong','',t.name),elem('small','',t.desc),elem('em','',cost.scrap+' SCRAP  /  '+cost.credits+' CREDITS'));b.append(v);
   b.addEventListener('click',()=>build(selected,key));list.append(b);
  });root.append(list);return;
 }
 $('inspectorTitle').textContent=TYPES[r.type].name.toUpperCase();
 const affected=!!game.outbreaks[selected];
 $('inspectorDescription').textContent=TYPES[r.type].desc;
 const id=elem('div','sector-id');
 const status=r.owner==='vault'?'VAULT':r.owner==='rebels'?'REBELLION':'RAIDERS';
 const statusRow=elem('div','sector-row');statusRow.append(elem('strong','',sector(selected)+' / LVL '+r.level),elem('strong',r.owner==='vault'?'':'warn',status));id.append(statusRow);
 id.append(elem('p','',affected?'BIOHAZARD: infection active. '+(r.sealed?'Quarantine in effect.':'Risk of spread.'):r.sealed?'Blast doors sealed. Supply access and staffing halted.':hostile(r)?'This sector is occupied. Enemy forces can expand into adjacent open rooms.':'Life support is connected. Sector fully operational.'));
 root.append(id);
 addInfo(root,'STRUCTURAL INTEGRITY',Math.round(r.hp)+'%');
 addInfo(root,'ROOM PERSONNEL',staff(selected)+' ASSIGNED');
 if(hostile(r)){
  const support=factionSupport(r.owner),f=game.factions[r.owner];
  addInfo(root,'DEFENDER RESOLVE',Math.round(r.resistance)+'%');
  addInfo(root,'FACTION MORALE',Math.round(f.morale)+'%');
  addInfo(root,'ENEMY SUPPLY',support.food&&support.water?'SUSTAINABLE':support.food||support.water?'LIMITED':'STARVING');
  addInfo(root,'MEDICAL SUPPORT',support.medical?'AVAILABLE':'NONE');
 }else if(r.type==='quarters')addInfo(root,'HOUSING',(hasSkill('housing')?15:10)*r.level+' CAPACITY');
 else addInfo(root,'OUTPUT',r.sealed?'SHUT DOWN':r.level>1?'BOOSTED':'NORMAL');
 const heading=elem('div','section-heading','SECTOR DIRECTIVES');heading.style.marginTop='22px';root.append(heading);
 const grid=elem('div','action-grid');
 if(hostile(r)){
  grid.append(action(r.sealed?'UNSEAL DOORS':'SEAL / BESIEGE',()=>manage('seal'),false,'gold'));
  grid.append(action('STORM SECTOR',()=>manage('storm'),game.resources.power<7||game.resources.meds<3,'danger'));
  grid.append(action('NEGOTIATE -24¤',()=>manage('negotiate'),game.resources.credits<24));
 }else{
  grid.append(action(r.sealed?'REOPEN DOORS':'SEAL SECTOR',()=>manage('seal'),false,'gold'));
  grid.append(action('UPGRADE LVL '+(r.level+1),()=>manage('upgrade'),r.level>=3||game.resources.scrap<25*r.level||game.resources.credits<15*r.level));
  grid.append(action('REPAIR -12⬡',()=>manage('repair'),r.hp>=100||game.resources.scrap<12));
  if(affected)grid.append(action('TREAT OUTBREAK',()=>manage('treat'),game.resources.meds<8));
  if(selectedResident!==null){
   const person=game.people.find(p=>p.id===selectedResident);
   if(person)grid.append(action('ASSIGN '+person.name.split(' ')[0].toUpperCase(),()=>manage('assign'),false,'gold'));
  }
 }
 root.append(grid);
 if(hostile(r)){
  const n=elem('p','placeholder','Siege strategy: sealed hostile sectors lose resistance faster. Captured food and water allow enemy groups to hold out much longer. Use security forces or diplomacy to reclaim rooms.');
  root.append(n);
 }else if(selectedResident!==null)root.append(elem('p','placeholder','Resident selected from the roster. Click ASSIGN to transfer them here.'));
}
function renderResidents(){
 const root=$('roster');root.replaceChildren();
 $('rosterHelp').textContent=game.people.length
  ? 'Select a resident, then select a friendly sector to reassign them. Housing: '+game.people.length+'/'+capacity()
  : 'No residents yet. Build quarters, water and food, then click + SURVIVOR to invite your first settler.';
 if(!game.people.length){root.append(elem('div','roster-empty','NO RESIDENTS YET · INTAKE OFFLINE'));return;}
 game.people.forEach(p=>{
  const card=elem('button','resident'+(selectedResident===p.id?' selected':''));card.type='button';
  const av=elem('span','avatar',p.name[0]);
  const name=elem('span');name.append(elem('span','resident-name',p.name),elem('span','resident-trait',p.trait+' · '+Math.round(p.health)+'% HP'));
  const loyalty=elem('span','resident-loyalty'+(p.loyalty<45?' low':''),Math.round(p.loyalty)+'%');
  const loc=elem('span','resident-location',sector(p.job));
  card.append(av,name,loyalty,loc);card.title='Personal bond: '+(p.bond!==null&&game.people[p.bond]?game.people[p.bond].name:'Unassigned');
  card.addEventListener('click',()=>{selectedResident=selectedResident===p.id?null:p.id;renderInspector();renderResidents();});root.append(card);
 });
}
function renderEvents(){
 const box=$('events');box.replaceChildren();
 game.events.slice(0,14).forEach(item=>{const row=elem('div','event'+(item.alarm?' alarm':''));row.append(elem('span','','DAY '+String(item.day).padStart(3,'0')),elem('p','',item.text));box.append(row);});
}
const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
function round(x,y,w,h,r,fill,stroke){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}
}
function line(x1,y1,x2,y2,color,width=1){
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}
function glow(x,y,r,c){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,c);g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function label(s,x,y,size=11,color='#d7ddd5',align='left'){
 ctx.textAlign=align;ctx.font='700 '+size+'px monospace';ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function backdrop(){
 const sky=ctx.createLinearGradient(0,0,0,195);sky.addColorStop(0,'#15282a');sky.addColorStop(1,'#48504a');rect(0,0,1200,195,sky);
 glow(875,33,230,'#dcc48b2a');
 ctx.fillStyle='#132327';ctx.beginPath();ctx.moveTo(0,157);
 for(let x=0;x<=1200;x+=30)ctx.lineTo(x,147+Math.sin(x*.009)*18+Math.sin(x*.036)*7);
 ctx.lineTo(1200,192);ctx.lineTo(0,192);ctx.fill();
 rect(0,181,1200,14,'#293c39');line(0,194,1200,194,'#b7b189',3);
 const earth=ctx.createLinearGradient(0,195,0,720);earth.addColorStop(0,'#2b3130');earth.addColorStop(.5,'#1f2728');earth.addColorStop(1,'#121e22');rect(0,195,1200,525,earth);
 for(let i=0;i<150;i++){
  const xx=(i*89+35)%1200,yy=205+((i*43+i*i*7)%510);
  ctx.globalAlpha=.1+(i%5)*.025;rect(xx,yy,9+(i%5)*8,i%4===0?3:1,i%3===0?'#a39476':'#718582');
 }
 ctx.globalAlpha=1;
 for(let j=0;j<10;j++){const y=230+j*55+Math.sin(j*7)*13;line(0,y,1200,y+Math.sin(j*4)*11,'#52645a35',2);}
 // Surface hatch, antenna, and floodlights
 rect(70,134,104,42,'#172328');rect(77,124,90,12,'#3e514e');rect(90,130,66,14,'#66746b');
 line(127,123,127,65,'#95a59a',5);line(127,73,103,92,'#647874',3);line(127,73,149,92,'#647874',3);
 glow(127,72,30,'#c4c78f31');rect(107,178,35,23,'#587b70');
 rect(174,178,35,5,'#9baf8b');line(192,155,192,178,'#869f8b',3);
 for(let i=0;i<5;i++){const x=X+i*(W+GAP)+W/2;rect(x-4,185,8,17,'#4f6d6d');}
 label('THE SURFACE  //  RESTRICTED ACCESS',240,86,12,'#acb8a6');
 label('GEOLOGICAL SUBLEVELS',20,220,10,'#b4a77b');
 for(let r=0;r<ROWS;r++)label('B'+(r+1),37,Y+r*(H+GAP)+51,18,'#b7a879');
 // power conduits behind room bays
 for(let r=0;r<ROWS;r++){
  const y=Y+r*(H+GAP)+H/2;
  line(X-8,y,1090,y,'#667b657a',5);line(X-8,y+4,1090,y+4,'#1a2529',2);
 }
}
function drawFixture(t,x,y,w,h,i){
 const cx=x+w/2,base=y+h-16;
 // cross-room pipes, back panels and floor bolts
 rect(x+9,y+18,w-18,3,'#546565');rect(x+8,y+h-18,w-16,5,'#17242a');
 for(let k=0;k<4;k++){rect(x+23+k*39,y+h-15,3,2,'#9ca49a');}
 if(t==='command'){
  rect(x+18,y+30,150,20,'#253938');rect(x+27,y+28,36,22,'#638c88');rect(x+66,y+28,36,22,'#5f8c91');rect(x+105,y+28,36,22,'#627f78');
  for(let k=0;k<4;k++)line(x+30,y+34+k*4,x+57,y+34+k*4,k%2?'#90e0c5':'#2b514e');
  rect(x+20,y+56,149,7,'#5a6b66');rect(x+78,y+65,13,9,'#38484b');glow(cx,y+35,46,'#80d0a11c');
 }else if(t==='power'){
  for(const xx of [x+37,x+142]){rect(xx-13,y+30,26,36,'#4c6667');rect(xx-17,y+26,34,5,'#9ab8ac');}
  ctx.strokeStyle='#96e1d0';ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx,y+47,25,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#338778';ctx.lineWidth=8;ctx.beginPath();ctx.arc(cx,y+47,15,frame*.012,frame*.012+Math.PI*1.5);ctx.stroke();
  glow(cx,y+46,53,'#57e4b04b');rect(x+24,y+70,143,3,'#628c84');
 }else if(t==='water'){
  for(let k=0;k<3;k++){const xx=x+19+k*52;rect(xx,y+30,41,35,'#395e69');rect(xx+3,y+43,35,18,'#478fa0');rect(xx-3,y+27,47,5,'#7699a0');rect(xx+7,y+47,3,6,'#a5ece4');}
  const bubble=Math.sin(frame*.026+i)*5;round(x+85,y+39+bubble,5,5,3,'#93ded9');glow(cx,y+49,40,'#4dbad32b');
 }else if(t==='farm'){
  for(let k=0;k<4;k++){
   const xx=x+14+k*42;rect(xx,y+60,35,7,'#73664d');rect(xx+4,y+57,26,4,'#a68c60');
   for(let m=0;m<2;m++){const bx=xx+11+m*13;line(bx,y+56,bx,y+39,'#66a76d',2);ctx.fillStyle='#8cbe73';ctx.beginPath();ctx.ellipse(bx-5,y+42,7,3,-.4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(bx+5,y+47,7,3,.4,0,Math.PI*2);ctx.fill();}
  }
  rect(x+25,y+29,136,4,'#6f9c73');glow(cx,y+40,40,'#9fd57d22');
 }else if(t==='quarters'){
  for(let k=0;k<2;k++){
   const xx=x+19+k*82;rect(xx,y+35,69,5,'#8b8e80');rect(xx,y+59,69,6,'#898a79');
   rect(xx+5,y+29,58,6,'#a89a79');rect(xx+5,y+52,58,6,'#7a948f');
   rect(xx+5,y+27,13,3,'#d6d0b4');rect(xx+5,y+50,13,3,'#c4bb9e');
   line(xx,y+27,xx,y+68,'#a9b2a1',2);line(xx+69,y+27,xx+69,y+68,'#a9b2a1',2);
  }
 }else if(t==='medbay'){
  for(let k=0;k<2;k++){const xx=x+18+k*86;rect(xx,y+49,75,7,'#8da3a1');rect(xx+4,y+42,60,8,'#c6c4b5');rect(xx+3,y+39,14,4,'#e9e2c7');rect(xx+8,y+57,4,12,'#9eb3a9');}
  rect(x+77,y+28,33,17,'#477a77');label('+',x+87,y+42,18,'#f0ece1');glow(cx,y+35,46,'#9ee1c31e');
 }else if(t==='security'){
  rect(x+17,y+27,148,34,'#30414a');for(let k=0;k<4;k++){const xx=x+23+k*37;line(xx,y+32,xx,y+57,'#a3b8b1',3);line(xx-7,y+40,xx+8,y+40,'#899ba3',3);rect(xx-5,y+52,10,4,'#6a7f82');}
  rect(x+27,y+67,130,5,'#68767d');rect(x+74,y+25,38,7,'#b9a76d');
 }else if(t==='workshop'){
  rect(x+17,y+50,150,8,'#aa9776');rect(x+24,y+58,8,12,'#5e6460');rect(x+154,y+58,8,12,'#5e6460');
  for(let k=0;k<3;k++){const xx=x+31+k*52;rect(xx,y+37,37,12,'#866c4e');rect(xx+7,y+32,18,6,'#aba78c');}
  line(x+135,y+30,x+135,y+47,'#b9b8a0',4);line(x+125,y+47,x+146,y+47,'#8ac2ba',3);glow(x+138,y+38,35,'#ebbb6d24');
 }
}
function drawRoom(r,i,time){
 const {x,y}=positions(i),friendly=r.owner==='vault',enemy=!friendly,stroke=enemy?'#d16d69':r.sealed?'#cba464':'#748e80';
 rect(x-4,y-5,W+8,H+10,'#09161c');
 const g=ctx.createLinearGradient(x,y,x,y+H);g.addColorStop(0,enemy?'#3c2529':'#293d40');g.addColorStop(1,enemy?'#271e25':'#14262b');
 rect(x,y,W,H,g);
 for(let k=0;k<8;k++){rect(x+6+k*24,y+6,2,H-12,'#ffffff08');}
 ctx.save();ctx.beginPath();ctx.rect(x+5,y+18,W-10,H-24);ctx.clip();
 drawFixture(r.type,x,y,W,H,i);
 if(friendly&&!r.sealed){const people=game.people.filter(p=>p.job===i).slice(0,4);people.forEach((p,n)=>{
  const bx=x+20+n*38+Math.sin(time*.8+n*2.3+i)*3,by=y+H-16+Math.sin(time*2+n)*1.6;
  ctx.strokeStyle='#283435';ctx.lineWidth=2;line(bx-3,by-2,bx-4,by+4,'#181f26',2);line(bx+3,by-2,bx+5,by+4,'#181f26',2);
  rect(bx-6,by-20,12,16,n%2===0?'#b7b48c':'#7ca99e');
  round(bx-5,by-29,10,12,4,n%2?'#d9ab8a':'#ad876c');
  rect(bx-5,by-30,10,3,p.trait==='Ambitious'?'#342a29':'#544039');
 });}
 ctx.restore();
 rect(x,y,W,16,enemy?'#66363a':'#17292e');line(x,y+16,x+W,y+16,stroke,1.5);
 label(TYPES[r.type].label,x+11,y+12,10,enemy?'#ffd0bf':'#c9dcd1');
 label('L'+r.level,x+W-11,y+12,10,enemy?'#ffc1ae':'#819f95','right');
 for(let k=0;k<3;k++)rect(x+8+k*12,y+H-6,6,3,'#bdc1a26e');
 if(enemy){
  rect(x+2,y+17,W-4,H-20,'#aa333b44');
  line(x+5,y+H-28,x+W-5,y+H-28,'#e6836a',2);
  label(r.owner==='rebels'?'REBEL OCCUPATION':'RAIDER OCCUPATION',x+W/2,y+H-34,11,'#ffe3ce','center');
 }
 if(r.sealed){
  for(let k=-H;k<W;k+=16)line(x+k,y+H,x+k+H,y+16,'#efbc6a40',4);
  rect(x+25,y+38,W-50,21,'#1d2228c9');
  label('BLAST DOORS SEALED',x+W/2,y+53,11,'#e7be70','center');
 }
 if(game.outbreaks[i]){rect(x+2,y+17,W-4,H-20,'#e65b381e');glow(x+W/2,y+H/2,65,'#e84a2c33');label('BIOHAZARD',x+W-10,y+H-8,9,'#ff9f7b','right');}
 ctx.strokeStyle=selected===i?'#f7d28c':stroke;ctx.lineWidth=selected===i?3:1.5;ctx.strokeRect(x+1,y+1,W-2,H-2);
 if(selected===i){glow(x+W/2,y,34,'#ebbc6650');rect(x+W/2-14,y-3,28,3,'#f7d28c');}
}
function drawEarth(i){
 const {x,y}=positions(i),buildable=canBuild(i);
 rect(x-3,y-4,W+6,H+8,'#111d20');rect(x,y,W,H,buildable?'#263532':'#202b2b');
 for(let j=0;j<15;j++){const bx=x+7+((j*49+i*7)%174),by=y+5+((j*23+i*13)%78);rect(bx,by,4+j%5,1,j%3?'#53625b54':'#8a816643');}
 ctx.setLineDash([5,6]);ctx.lineWidth=buildable?1.3:.6;ctx.strokeStyle=buildable?'#8eae825e':'#536b5c55';ctx.strokeRect(x+9,y+9,W-18,H-18);ctx.setLineDash([]);
 if(selected===i){ctx.strokeStyle='#f7d28c';ctx.lineWidth=3;ctx.strokeRect(x+1,y+1,W-2,H-2);}
 label(buildable?'+ EXCAVATE':'BEDROCK',x+W/2,y+H/2,buildable?12:10,buildable?'#b5c99b':'#68776f','center');
}
function draw(time){
 frame++;ctx.clearRect(0,0,1200,720);backdrop();
 if(!game)return;
 for(let i=0;i<COUNT;i++){const r=game.rooms[i];if(r)drawRoom(r,i,time);else drawEarth(i);}
 // lift shafts along outer edges
 rect(X-14,Y,8,492,'#415b53');rect(X+COLS*(W+GAP)-GAP+5,Y,8,492,'#415b53');
 for(let i=0;i<ROWS;i++){const yy=Y+i*(H+GAP)+39;rect(X-12,yy,5,13,'#89aa87');}
 label('COMMAND • '+(game.phase==='vault'?'ACTIVE':'LOST'),1030,85,11,game.phase==='vault'?'#b9e2be':'#f1a196','right');
 label('TOTAL SECTORS: '+game.rooms.filter(Boolean).length,1030,107,10,'#aebcb3','right');
}
function clickCanvas(evt){
 if(!game||game.phase!=='vault')return;
 const bounds=canvas.getBoundingClientRect(),px=(evt.clientX-bounds.left)*canvas.width/bounds.width,py=(evt.clientY-bounds.top)*canvas.height/bounds.height;
 for(let i=0;i<COUNT;i++){const {x,y}=positions(i);if(px>=x&&px<x+W&&py>=y&&py<y+H){selected=i;renderInspector();return;}}
}
function loop(now){
 const dt=Math.min(150,now-lastStep);lastStep=now;
 if(game&&game.phase==='vault'&&speed>0){elapsed+=dt*speed;while(elapsed>=2200){elapsed-=2200;tick();}}
 draw(now/1000);requestAnimationFrame(loop);
}
$('intakeBtn').addEventListener('click',inviteSurvivor);
$('skillsBtn').addEventListener('click',()=>{$('skillsOverlay').classList.remove('hidden');renderSkills();});
$('closeSkillsBtn').addEventListener('click',()=>$('skillsOverlay').classList.add('hidden'));
$('tutorialFocusBtn').addEventListener('click',focusTutorial);
$('skipTutorialBtn').addEventListener('click',()=>{if(game?.tutorial?.enabled){game.tutorial.enabled=false;game.tutorial.finished=true;game.tutorial.step=TUTORIAL.length;pushLog('Overseer training skipped. You can now govern freely.');commit();}});
$('startBtn').addEventListener('click',()=>begin($('vaultInput').value,document.querySelector('input[name="mode"]:checked').value));
$('continueBtn').addEventListener('click',()=>{const s=saved();if(s)resume(s);});
$('helpBtn').addEventListener('click',()=>$('helpOverlay').classList.remove('hidden'));
$('closeHelpBtn').addEventListener('click',()=>$('helpOverlay').classList.add('hidden'));
$('dismissHelpBtn').addEventListener('click',()=>$('helpOverlay').classList.add('hidden'));
$('pauseBtn').addEventListener('click',()=>{speed=speed===0?1:0;render();});
$('speedBtn').addEventListener('click',()=>{speed=speed===0?1:speed===1?3:1;render();});
$('saveBtn').addEventListener('click',()=>{persist();$('saveBtn').textContent='SAVED';clearTimeout(saveNotice);saveNotice=setTimeout(()=>$('saveBtn').textContent='SAVE',1000);});
$('newBtn').addEventListener('click',()=>{if(confirm('Start over? Your existing vault will be replaced when you begin a new run.')){$('startOverlay').classList.remove('hidden');$('continueBtn').hidden=false;}});
$('revoltBtn').addEventListener('click',()=>beginHostile('rebels',true));
$('raidBtn').addEventListener('click',()=>beginHostile('raiders',true));
$('outbreakBtn').addEventListener('click',()=>beginOutbreak(true));
canvas.addEventListener('click',clickCanvas);
const previous=saved();$('continueBtn').hidden=!previous;
if(previous)$('continueBtn').textContent='CONTINUE '+previous.name.toUpperCase();
game=fresh('VAULT-01','standard');render();game=null;
requestAnimationFrame(loop);
})();