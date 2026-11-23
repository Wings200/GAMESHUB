(() => {
'use strict';
const WIDTH=19,HEIGHT=10,CELL=43,STEP=45,OX=134,OY=217;
const ENTRANCE=9;
const SAVE_KEY='gameshub-vault-foundations-v1';
const $=id=>document.getElementById(id);
const canvas=$('world'),ctx=canvas.getContext('2d');
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const ix=(x,y)=>y*WIDTH+x;
const xy=i=>({x:i%WIDTH,y:Math.floor(i/WIDTH)});
const neighbors=i=>{const {x,y}=xy(i);return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>a>=0&&a<WIDTH&&b>=0&&b<HEIGHT).map(([a,b])=>ix(a,b));};
const money=n=>Math.floor(n).toLocaleString();
const SITES=[
 {id:'woods',name:'SCRUBLAND',desc:'Dead trees and scattered wooden debris. Safe, nearby, reliable timber.',risk:0,distance:'0.4 KM',color:'#9eb68c'},
 {id:'road',name:'SERVICE ROAD',desc:'Rusting maintenance vehicles. Salvage bolts, wire and timber.',risk:.08,distance:'1.1 KM',color:'#b8ab8b'},
 {id:'depot',name:'RUINED DEPOT',desc:'Abandoned workshop. More metal, but scavengers may already be here.',risk:.24,distance:'2.6 KM',color:'#c19e79'},
 {id:'crater',name:'FAR RIDGE',desc:'A dangerous wreck site with rare scrap and loose stone.',risk:.44,distance:'5.8 KM',color:'#c17f6d'}
];
const TECH=[
 {id:'stone',name:'STONE SHORING',icon:'▣',cost:9,needs:[],desc:'Learn to construct stone-braced tunnels. You still need to place them physically.'},
 {id:'steel',name:'STEEL STRUCTURES',icon:'▦',cost:15,needs:['stone'],desc:'Unlock hardened steel tunnel supports for deep excavation.'},
 {id:'survey',name:'GROUND SURVEYING',icon:'⌖',cost:8,needs:['stone'],desc:'Read soil pressure more accurately and reduce excavation collapse risk.'}
];
const SUPPORTS={
 timber:{name:'Timber Frame',wood:2,stone:1,scrap:0,stability:1},
 stone:{name:'Stone Brace',wood:0,stone:2,scrap:2,stability:2},
 steel:{name:'Steel Support',wood:1,stone:0,scrap:3,stability:3}
};
const ROOMS={
 quarters:{name:'LIVING QUARTERS',icon:'⌂',wood:4,scrap:2,stone:0,kind:'housing',color:'#bba785'},
 storage:{name:'STORAGE',icon:'▤',wood:3,scrap:2,stone:0,kind:'stores',color:'#a48e6c'},
 water:{name:'WATERWORKS',icon:'◈',wood:0,scrap:3,stone:3,kind:'utilities',color:'#7db2b7'},
 farm:{name:'GROW ROOM',icon:'✿',wood:3,scrap:0,stone:3,kind:'agriculture',color:'#92ad72'}
};
const TUTORIAL=[
 {title:'SCAVENGE FOR SUPPLIES',body:'You have no resource income. Switch to SURFACE and search SCRUBLAND for wood and SERVICE ROAD for scrap. Stockpile at least 8 wood and 2 scrap.',hint:'Click locations on the surface to send your character automatically.',action:'GO TO SURFACE',type:'scavenge'},
 {title:'RETURN TO THE ENTRANCE',body:'Good. Now return underground. Your hatch is the single open cell. Everything around it is untouched dirt.',hint:'Use UNDERGROUND to return to your shovel.',action:'GO UNDERGROUND',type:'return'},
 {title:'DIG A 2 × 2 CHAMBER',body:'Select SHOVEL and click the four highlighted dirt cells just right of your entrance. Your character walks over and digs each block.',hint:'Each dig produces stone and research. Only connected earth can be dug.',action:'SELECT SHOVEL',type:'dig'},
 {title:'BRACE YOUR EARTH',body:'Select TIMBER FRAME and reinforce two excavated blocks inside the highlighted square. Wood frames help prevent cave-ins.',hint:'You will need 4 wood and 2 stone for the two supports.',action:'SELECT TIMBER',type:'support'},
 {title:'BUILD YOUR FIRST QUARTERS',body:'Choose QUARTERS and click the upper-left block of your supported 2 × 2 space. Dig first; then reinforce; then build.',hint:'Room modules need a complete 2×2 excavated footprint and two supporting frames.',action:'SELECT QUARTERS',type:'room'},
 {title:'LEARN STRONGER FOUNDATIONS',body:'Open TUNNEL TECHNOLOGY and spend research on STONE SHORING. This unlocks a new tunnel type you can physically construct later.',hint:'A skill unlock does not upgrade existing structures.',action:'OPEN RESEARCH',type:'tech'}
];
const TARGET=[ix(10,0),ix(11,0),ix(10,1),ix(11,1)];
let g=null,tool='dig',pending=null,hover=-1,view='underground',frame=0,lastFrame=0,toastUntil=0,shade=0;
const blank=()=>({kind:'dirt',support:null,roomId:null});
const openCell=c=>c&&(c.kind==='open'||c.kind==='room');
function fresh(name){
 const cells=Array.from({length:WIDTH*HEIGHT},blank);
 cells[ENTRANCE]={kind:'open',support:'steel',roomId:null};
 return {
  schema:1,name:(name||'VAULT-01').trim().slice(0,25)||'VAULT-01',
  cells,rooms:[],wood:0,scrap:0,stone:0,research:0,tech:[],
  digs:0,scavenges:0,collapses:0,minutes:0,actor:ENTRANCE,
  tutorial:{step:0,skipped:false,done:false},
  log:[{when:'DAY 01',text:'Entrance hatch secured. Nothing has been built below the surface.',danger:false}]
 };
}
const valid=d=>d&&d.schema===1&&Array.isArray(d.cells)&&d.cells.length===WIDTH*HEIGHT&&d.cells.every(c=>c&&['dirt','open','rubble','room'].includes(c.kind))&&Array.isArray(d.rooms)&&Array.isArray(d.tech)&&Array.isArray(d.log)&&d.tutorial&&Number.isFinite(d.minutes);
function load(){try{const d=JSON.parse(localStorage.getItem(SAVE_KEY));return valid(d)?d:null;}catch{return null;}}
function persist(){if(!g)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(g));}catch{}}
function timeDay(){return 1+Math.floor((g.minutes+480)/1440);}
function hour(){return !g ? 8 : Math.floor(((g.minutes+480)%1440)/60);}
function clock(){const m=(g.minutes+480)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function log(text,danger=false){if(!g)return;g.log.unshift({when:'DAY '+String(timeDay()).padStart(2,'0'),text,danger});g.log=g.log.slice(0,45);}
function toast(text,warning=false){const n=$('floatingToast');n.textContent=text;n.style.borderColor=warning?'#d67b69':'#bc9b60';n.style.color=warning?'#ffc0b0':'#e2d39f';n.classList.add('show');toastUntil=performance.now()+2600;}
function status(text){$('worldStatus').textContent=text;}
function advanced(id){return g?.tech.includes(id);}
function depth(i){return xy(i).y+1;}
function riskAt(i){
 const d=depth(i);
 if(d<=2)return 0;
 const area=[i,...neighbors(i)];
 const shield=area.reduce((v,j)=>v+(SUPPORTS[g.cells[j].support]?.stability||0),0);
 let risk=.028+(d-3)*.046;
 risk-=shield*.028;
 if(advanced('survey'))risk*=.6;
 return clamp(risk,0,.4);
}
function costEnough(cost){return ['wood','scrap','stone'].every(k=>(g[k]||0)>=(cost[k]||0));}
function pay(cost){for(const k of ['wood','scrap','stone'])g[k]-=cost[k]||0;}
function describeCost(cost){return ['wood','scrap','stone'].filter(k=>cost[k]).map(k=>cost[k]+' '+k).join(', ');}
function gainXP(n){g.research+=n;}
function chooseTool(next){
 if((next==='stone'&&!advanced('stone'))||(next==='steel'&&!advanced('steel'))){toast('Unlock this support design in TUNNEL TECHNOLOGY.',true);openTech();return false;}
 tool=next;
 for(const b of document.querySelectorAll('[data-tool]'))b.classList.toggle('selected',b.dataset.tool===tool);
 const desc={
 dig:['HAND SHOVEL','Click a dirt tile bordering an accessible corridor. Your character walks over and digs it. Collapsed tunnels become rubble you can clear.'],
 inspect:['SECTOR SURVEY','Click any tile to read its depth, stability and risk, or investigate a room.'],
 timber:['TIMBER FRAMES','Click an open block to physically install a wooden support. Basic framing is dangerous at great depth.'],
 stone:['STONE BRACES','Click an empty excavated block to build stone reinforcement. Requires the Stone Shoring research unlock.'],
 steel:['STEEL SUPPORTS','Click an excavated block to install strong steel supports. Requires Steel Structures research.'],
 remove:['DISMANTLE','Click a framed tunnel to dismantle its support, or a room to dismantle its entire 2 × 2 module. Some material is salvaged.'],
 quarters:['LIVING QUARTERS','First dig a 2 × 2 space and brace at least two blocks, then click its upper-left block to place a quarters shell.'],
 storage:['STORAGE ROOM','A place for future supplies. Build a reinforced 2 × 2 footprint first.'],
 water:['WATERWORKS','A future water production facility. Build a reinforced 2 × 2 footprint first.'],
 farm:['GROW ROOM','A future food production room. Build a reinforced 2 × 2 footprint first.']
 };
 const d=desc[next]||desc.dig;
 $('toolTitle').textContent=d[0];$('toolDescription').textContent=d[1];
 render();return true;
}
function bfs(from,target){
 if(from===target)return [from];
 if(!openCell(g.cells[from])||!openCell(g.cells[target]))return null;
 const prior=Array(WIDTH*HEIGHT).fill(-1),q=[from];prior[from]=from;
 for(let p=0;p<q.length;p++){
  const i=q[p];if(i===target)break;
  for(const n of neighbors(i)){
   if(prior[n]!==-1||!openCell(g.cells[n]))continue;
   prior[n]=i;q.push(n);
  }
 }
 if(prior[target]===-1)return null;
 const result=[target];let at=target;while(at!==from){at=prior[at];result.push(at);}return result.reverse();
}
function approach(target,standOnTile=false){
 const candidates=standOnTile?[target]:neighbors(target);
 let best=null;
 for(const c of candidates){
  const route=bfs(g.actor,c);if(route&&(!best||route.length<best.length))best=route;
 }
 return best;
}
function cellsForRoom(at){
 const {x,y}=xy(at);if(x>=WIDTH-1||y>=HEIGHT-1)return [];
 return [at,at+1,at+WIDTH,at+WIDTH+1];
}
function validRoom(at){
 const arr=cellsForRoom(at);
 if(arr.length!==4)return {ok:false,reason:'Room modules require a complete 2 × 2 footprint.'};
 if(arr.includes(ENTRANCE))return {ok:false,reason:'The entrance hatch cannot become a room.'};
 if(!arr.every(i=>g.cells[i].kind==='open'))return {ok:false,reason:'Dig out all four tiles before building a room.'};
 if(arr.filter(i=>!!g.cells[i].support).length<2)return {ok:false,reason:'Install at least two tunnel supports inside the 2 × 2 footprint.'};
 return {ok:true,arr};
}
function canDig(i){
 const c=g.cells[i];
 if(!c||!['dirt','rubble'].includes(c.kind))return false;
 return !!approach(i);
}
function canFrame(i){
 return i!==ENTRANCE&&g.cells[i]?.kind==='open'&&!!approach(i,true);
}
function queue(op,target,site){
 if(pending){toast('Finish the current task first.',true);return false;}
 let route=null;
 if(op==='scavenge'){
  if(view!=='surface')return false;
  pending={op,target:site.id,site,elapsed:0,duration:2450,route:null};
  status('TRAVELLING TO '+site.name);toast('Scavenging: '+site.name);
  return true;
 }
 const stand=op==='timber'||op==='stone'||op==='steel'||op==='remove'||op==='room';
 route=approach(target,stand);
 if(op==='remove'&&g.cells[target]?.kind==='room')route=approach(target,true);
 if(!route){toast('No safe path to that tile. Connect it to the entrance first.',true);return false;}
 const duration=op==='dig'?770:op==='room'?1450:op==='remove'?650:680;
 pending={op,target,elapsed:0,duration,route,routeIndex:0,site:null};
 status(op==='dig'?'DIGGING REQUEST QUEUED':'CONSTRUCTION REQUEST QUEUED');
 return true;
}
function digAt(i){
 const c=g.cells[i];const wasRubble=c.kind==='rubble';
 c.kind='open';c.support=null;c.roomId=null;
 g.digs++;
 const reward=wasRubble?0:1;
 g.stone+=reward;gainXP(wasRubble?1:2);g.minutes+=wasRubble?30:45;
 log(wasRubble?'Cleared collapsed rubble at '+sector(i)+'.':'Excavated '+sector(i)+'. +1 stone; +2 research.');
 if(!wasRubble&&Math.random()<riskAt(i)){
  const vulnerable=[i,...neighbors(i)].filter(j=>j!==ENTRANCE&&g.cells[j]?.kind==='open'&&!g.cells[j].support);
  if(vulnerable.length){
   const broken=vulnerable[Math.floor(Math.random()*vulnerable.length)];
   g.cells[broken].kind='rubble';g.collapses++;
   if(g.actor===broken)g.actor=ENTRANCE;
   log('CAVE-IN: Loose soil collapsed at '+sector(broken)+'. Clear it with your shovel.',true);
   toast('TUNNEL COLLAPSE — '+sector(broken),true);
  }
 }else toast('EXCAVATED '+sector(i)+(reward?' • +1 STONE':''));
}
function supportAt(i,type){
 const cost=SUPPORTS[type];if(!cost||g.cells[i].kind!=='open')return;
 if(g.cells[i].support){toast('This tunnel already has a support. Dismantle it first.',true);return;}
 if(!costEnough(cost)){toast('Need '+describeCost(cost),true);return;}
 pay(cost);g.cells[i].support=type;g.minutes+=35;gainXP(1);
 log(cost.name+' installed at '+sector(i)+'.');toast('SUPPORT BUILT • '+sector(i));
}
function buildRoom(at,type){
 const r=validRoom(at),def=ROOMS[type];if(!r.ok){toast(r.reason,true);return;}
 if(!costEnough(def)){toast('Need '+describeCost(def),true);return;}
 pay(def);
 const id=g.rooms.reduce((v,item)=>Math.max(v,item.id),0)+1;
 for(const i of r.arr){g.cells[i].kind='room';g.cells[i].roomId=id;}
 g.rooms.push({id,type,at});g.minutes+=85;gainXP(4);
 log(def.name+' constructed at '+sector(at)+'. This is a physical room shell, not an instant upgrade.');
 toast(def.name+' BUILT!');
}
function removeAt(i){
 const c=g.cells[i];
 if(c.kind==='room'){
  const r=g.rooms.find(r=>r.id===c.roomId);if(!r)return;
  const def=ROOMS[r.type];
  for(const tile of cellsForRoom(r.at)){g.cells[tile].kind='open';g.cells[tile].roomId=null;}
  g.rooms=g.rooms.filter(item=>item.id!==r.id);
  g.wood+=Math.floor(def.wood/2);g.scrap+=Math.floor(def.scrap/2);g.stone+=Math.floor(def.stone/2);
  g.minutes+=50;log(def.name+' dismantled. Some material recovered.');toast('ROOM REMOVED');
 }else if(c.support&&i!==ENTRANCE){
  const def=SUPPORTS[c.support];g.wood+=Math.floor(def.wood/2);g.scrap+=Math.floor(def.scrap/2);g.stone+=Math.floor(def.stone/2);
  c.support=null;g.minutes+=20;
  log('Removed support from '+sector(i)+'. Unbraced tunnels are vulnerable.');toast('SUPPORT REMOVED',true);
 }else toast('No removable structure here.',true);
}
function scavenge(site){
 const rolls={
  woods:{wood:5+Math.floor(Math.random()*3),scrap:0,stone:0},
  road:{wood:2,scrap:3+Math.floor(Math.random()*2),stone:0},
  depot:{wood:1,scrap:5+Math.floor(Math.random()*3),stone:1},
  crater:{wood:0,scrap:8+Math.floor(Math.random()*3),stone:3}
 };
 const loot=rolls[site.id]||rolls.woods;
 const danger=Math.random()<site.risk;
 if(danger){
  // The Overseer has no personal health/needs meters; danger means damaged or lost salvage.
  for(const key of ['wood','scrap','stone'])loot[key]=Math.max(0,Math.floor(loot[key]*.5));
  log('A hazardous encounter at '+site.name+' forced an early retreat. Some salvage was lost.',true);
  toast('HAZARD: RETREATED WITH PARTIAL SUPPLIES',true);
 }else toast('SCAVENGING COMPLETE • SUPPLIES RECOVERED');
 for(const key of ['wood','scrap','stone'])g[key]+=loot[key];
 g.scavenges++;g.minutes+=site.id==='woods'?90:site.id==='road'?120:site.id==='depot'?170:225;gainXP(2);
 log(site.name+': +'+loot.wood+' wood, +'+loot.scrap+' scrap, +'+loot.stone+' stone.');
}
function finish(){
 if(!pending)return;
 const a=pending;pending=null;
 if(a.op==='scavenge')scavenge(a.site);
 else{
  g.actor=(a.route&&a.route.length)?a.route[a.route.length-1]:g.actor;
  if(a.op==='dig')digAt(a.target);
  else if(SUPPORTS[a.op])supportAt(a.target,a.op);
  else if(ROOMS[a.op])buildRoom(a.target,a.op);
  else if(a.op==='room')buildRoom(a.target,a.roomType);
  else if(a.op==='remove')removeAt(a.target);
 }
 tutorialProgress();persist();render();status('AWAITING DIRECTIVE');
}
function requestAt(i){
 if(!g||pending||view!=='underground')return;
 const c=g.cells[i];hover=i;
 if(tool==='inspect'){inspect(i);return;}
 if(tool==='dig'){
  if(!canDig(i)){toast(openCell(c)?'Already excavated. Select another tool.':'Dig only dirt reachable from an open corridor.',true);return;}
  queue('dig',i);return;
 }
 if(SUPPORTS[tool]){
  if(!canFrame(i)){toast('Supports require a reachable excavated tunnel tile.',true);return;}
  if(c.support){toast('Dismantle the old support before replacing it.',true);return;}
  if(!costEnough(SUPPORTS[tool])){toast('Need '+describeCost(SUPPORTS[tool]),true);return;}
  queue(tool,i);return;
 }
 if(ROOMS[tool]){
  const validity=validRoom(i);
  if(!validity.ok){toast(validity.reason,true);return;}
  if(!costEnough(ROOMS[tool])){toast('Need '+describeCost(ROOMS[tool]),true);return;}
  const path=approach(i,true);
  if(!path){toast('No path to this room footprint.',true);return;}
  queue(tool,i);return;
 }
 if(tool==='remove'){
  if(!(c.kind==='room'||(c.support&&i!==ENTRANCE))){toast('There is nothing to dismantle here.',true);return;}
  queue('remove',i);
 }
}
function sector(i){const {x,y}=xy(i);return 'D'+(y+1)+'-'+String(x+1).padStart(2,'0');}
function inspect(i){
 const c=g.cells[i],d=depth(i),risk=Math.round(riskAt(i)*100),r=g.rooms.find(r=>r.id===c.roomId);
 const name=r?ROOMS[r.type].name:c.kind==='dirt'?'UNEXCAVATED EARTH':c.kind==='rubble'?'COLLAPSED RUBBLE':c.kind==='room'?'ROOM':c.support?(SUPPORTS[c.support]?.name||'STRUCTURE').toUpperCase():i===ENTRANCE?'ENTRANCE HATCH':'UNBRACED TUNNEL';
 $('detailTitle').textContent=sector(i)+' // '+name;
 $('detailText').textContent='Depth '+(d*4)+' m. '+(c.kind==='dirt'?'Estimated collapse risk after digging: '+risk+'%.':c.kind==='rubble'?'Click with SHOVEL to clear collapsed material.':c.kind==='room'?'Built room shell. Future infrastructure and residents will be planned next.':'Reinforcement: '+(c.support||'none')+'. Nearby pressure risk: '+risk+'%.');
}
function tutorialProgress(){
 if(!g||g.tutorial.done||g.tutorial.skipped)return;
 const t=g.tutorial;
 while(t.step<TUTORIAL.length){
  const type=TUTORIAL[t.step].type;
  const met=type==='scavenge'?g.wood>=8&&g.scrap>=2:
    type==='return'?view==='underground':
    type==='dig'?TARGET.every(i=>g.cells[i].kind==='open'||g.cells[i].kind==='room'):
    type==='support'?TARGET.filter(i=>g.cells[i].support).length>=2:
    type==='room'?g.rooms.some(r=>r.type==='quarters'):
    advanced('stone');
  if(!met)break;
  log('TUTORIAL OBJECTIVE COMPLETE: '+TUTORIAL[t.step].title+'.');t.step++;
 }
 if(t.step>=TUTORIAL.length){t.done=true;log('FOUNDATION TRAINING COMPLETE. Keep digging, scavenging and building!');toast('TUTORIAL COMPLETE • FOUNDATION READY');}
}
function tutorialAction(){
 const item=TUTORIAL[g.tutorial.step];if(!item)return;
 if(item.type==='scavenge'){setView('surface');}
 else if(item.type==='return'){setView('underground');}
 else if(item.type==='dig'){setView('underground');chooseTool('dig');}
 else if(item.type==='support'){setView('underground');chooseTool('timber');}
 else if(item.type==='room'){setView('underground');chooseTool('quarters');}
 else if(item.type==='tech')openTech();
}
function renderTutorial(){
 const panel=$('tutorialPanel'),t=g.tutorial;
 const visible=!t.done&&!t.skipped;
 panel.hidden=!visible;if(!visible)return;
 const s=TUTORIAL[t.step];
 $('tutStep').textContent='FOUNDATION TRAINING // STEP '+(t.step+1)+' OF '+TUTORIAL.length;
 $('tutTitle').textContent=s.title;$('tutBody').textContent=s.body;
 $('tutAction').textContent=s.action+' →';$('tutHint').textContent=s.hint;
 $('tutTrack').style.width=Math.round(t.step/TUTORIAL.length*100)+'%';
}
function unlockTech(id){
 if(!g)return;
 const node=TECH.find(t=>t.id===id);
 if(!node||advanced(id))return;
 if(node.needs.some(req=>!advanced(req))){toast('Research the required technology first.',true);return;}
 if(g.research<node.cost){toast('Not enough research. Dig, scavenge or build to earn more.',true);return;}
 g.research-=node.cost;g.tech.push(id);g.minutes+=30;
 log('RESEARCHED '+node.name+'. This tunnel design is now available to BUILD.');
 toast('TECHNOLOGY UNLOCKED: '+node.name);tutorialProgress();persist();render();
}
function openTech(){$('techOverlay').classList.remove('hidden');renderTech();}
function renderTech(){
 if(!g)return;
 $('techPool').textContent=g.research;
 const list=$('techList');list.replaceChildren();
 for(const tech of TECH){
  const learned=advanced(tech.id),lock=tech.needs.some(dep=>!advanced(dep));
  const entry=document.createElement('div');entry.className='tech-entry'+(learned?' learned':lock?' locked':'');
  const icon=document.createElement('span');icon.className='tech-icon';icon.textContent=tech.icon;
  const center=document.createElement('div');const title=document.createElement('strong');title.textContent=tech.name;
  const desc=document.createElement('small');desc.textContent=tech.desc;
  center.append(title,desc);
  if(tech.needs.length){const prereq=document.createElement('small');prereq.textContent='REQUIRES: '+tech.needs.map(d=>TECH.find(k=>k.id===d)?.name||d).join(', ');center.append(prereq);}
  const button=document.createElement('button');button.type='button';button.textContent=learned?'UNLOCKED':lock?'LOCKED':tech.cost+' POINTS';button.disabled=learned||lock||g.research<tech.cost;
  button.addEventListener('click',()=>unlockTech(tech.id));
  entry.append(icon,center,button);list.append(entry);
 }
}
function renderEvents(){
 const out=$('events');out.replaceChildren();
 for(const entry of g.log.slice(0,10)){
  const row=document.createElement('div');row.className='event'+(entry.danger?' warning':'');
  const when=document.createElement('span');when.textContent=entry.when;
  const note=document.createElement('p');note.textContent=entry.text;
  row.append(when,note);out.append(row);
 }
}
function render(){
 if(!g)return;
 $('vaultTitle').textContent=g.name.toUpperCase();
 $('dayText').textContent=String(timeDay()).padStart(2,'0');
 $('timeText').textContent=clock();
 $('depthText').textContent=(Math.max(0,...g.cells.map((c,i)=>openCell(c)?depth(i)*4:0)))+'m';
 for(const key of ['wood','scrap','stone'])$(key+'Val').textContent=money(g[key]);
 $('researchVal').textContent=money(g.research);
 $('roomVal').textContent=money(g.rooms.length);
 for(const b of document.querySelectorAll('[data-tool]')){
  b.classList.toggle('selected',b.dataset.tool===tool);
  const lock=(b.dataset.tool==='stone'&&!advanced('stone'))||(b.dataset.tool==='steel'&&!advanced('steel'));
  b.classList.toggle('locked',lock);
  b.setAttribute('aria-pressed',String(b.dataset.tool===tool));
 }
 $('surfaceBtn').classList.toggle('active',view==='surface');
 $('undergroundBtn').classList.toggle('active',view==='underground');
 renderTutorial();renderTech();renderEvents();
}
function setView(next){
 if(!g)return;
 view=next;$('surfaceBtn').classList.toggle('active',view==='surface');
 $('undergroundBtn').classList.toggle('active',view==='underground');
 $('hoverInfo').textContent=view==='surface'?'CLICK A SCAVENGE SITE TO WALK THERE AND COLLECT MATERIAL':'CLICK DIRT TO DIG • TUNNELS MUST CONNECT TO THE ENTRANCE';
 tutorialProgress();persist();render();status(view==='surface'?'SURFACE SCAVENGING READY':'UNDERGROUND EXCAVATION READY');
}
function begin(name){g=fresh(name);tool='dig';pending=null;hover=-1;view='underground';$('startOverlay').classList.add('hidden');log('Overseer arrived at the hatch with a shovel. Surface scavenging is necessary before construction.');persist();chooseTool('dig');render();}
function resume(d){g=d;tool='dig';pending=null;hover=-1;view='underground';$('startOverlay').classList.add('hidden');chooseTool('dig');render();}
function clickCanvas(e){
 if(!g||pending)return;
 const bounds=canvas.getBoundingClientRect(),x=(e.clientX-bounds.left)*canvas.width/bounds.width,y=(e.clientY-bounds.top)*canvas.height/bounds.height;
 if(view==='surface'){for(const site of SITES){const r=surfaceCardBounds(site.id);if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h){queue('scavenge',null,site);return;}}return;}
 const col=Math.floor((x-OX)/STEP),row=Math.floor((y-OY)/STEP);
 if(col<0||row<0||col>=WIDTH||row>=HEIGHT||x>OX+col*STEP+CELL||y>OY+row*STEP+CELL)return;
 requestAt(ix(col,row));
}
function point(i){const {x,y}=xy(i);return {x:OX+x*STEP+CELL/2,y:OY+y*STEP+CELL/2};}
function actorPoint(){
 if(!g)return {x:0,y:0};
 if(pending?.route?.length>0&&pending.op!=='scavenge'){
  const k=Math.min(pending.routeIndex||0,pending.route.length-1);
  const from=pending.route[Math.max(0,k-1)],to=pending.route[k];
  const a=point(from),b=point(to),part=clamp((pending.elapsed-(k-1)*250)/250,0,1);
  return {x:a.x+(b.x-a.x)*part,y:a.y+(b.y-a.y)*part};
 }
 return point(g.actor);
}
const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
function line(x1,y1,x2,y2,c,w=1){ctx.beginPath();ctx.strokeStyle=c;ctx.lineWidth=w;ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function text(s,x,y,font='13px monospace',color='#dfe6db',align='left'){ctx.font=font;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(s,x,y);}
function round(x,y,w,h,r,color,border){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();
 if(border){ctx.strokeStyle=border;ctx.lineWidth=1;ctx.stroke();}
}
function sky(){
 const z=ctx.createLinearGradient(0,0,0,205);z.addColorStop(0,'#183234');z.addColorStop(1,'#687066');rect(0,0,1130,205,z);
 const night=hour()<6||hour()>=19;if(night){rect(0,0,1130,205,'#081922b9');for(let k=0;k<34;k++){rect((k*101+7)%1130,(k*53)%135,2,2,'#aec6b7');}}
 else {const grad=ctx.createRadialGradient(950,15,8,950,15,230);grad.addColorStop(0,'#d8cd945c');grad.addColorStop(1,'#00000000');rect(720,0,410,210,grad);}
 ctx.fillStyle='#192e2d';ctx.beginPath();ctx.moveTo(0,165);
 for(let x=0;x<=1130;x+=28)ctx.lineTo(x,160+Math.sin(x*.017)*17+Math.cos(x*.041)*8);
 ctx.lineTo(1130,205);ctx.lineTo(0,205);ctx.fill();
 rect(0,197,1130,10,'#655d4e');line(0,208,1130,208,'#98866e',3);
 // Hatch complex, the only starting infrastructure
 rect(OX+9*STEP-18,151,78,50,'#273539');rect(OX+9*STEP-24,149,90,9,'#879181');
 rect(OX+9*STEP+8,160,41,37,'#3f5e5e');rect(OX+9*STEP+13,166,32,27,'#192e32');
 rect(OX+9*STEP+21,171,15,17,'#9aa9a1');
 line(OX+9*STEP+23,148,OX+9*STEP+23,105,'#bac8b1',3);
 text('SEALED ENTRY HATCH',OX+9*STEP+80,172,'700 11px monospace','#c9d8c0');
}
function earth(){
 const gr=ctx.createLinearGradient(0,208,0,700);gr.addColorStop(0,'#333b35');gr.addColorStop(.6,'#202c29');gr.addColorStop(1,'#101f23');rect(0,208,1130,492,gr);
 for(let k=0;k<150;k++){
  const x=(k*89+22)%1130,y=210+((k*121+k*k)%482);
  rect(x,y,4+(k%4)*4,1,k%3?'#9d99711e':'#b4bf9831');
 }
 for(let row=0;row<HEIGHT;row++)text(String((row+1)*4)+'m',OX-21,OY+row*STEP+25,'700 10px monospace','#a9ad8c','right');
}
function tile(i,now){
 const c=g.cells[i],{x,y}=xy(i),left=OX+x*STEP,top=OY+y*STEP,selected=hover===i;
 const target=g.tutorial&&!g.tutorial.done&&!g.tutorial.skipped&&g.tutorial.step>=2&&g.tutorial.step<=4&&TARGET.includes(i);
 if(c.kind==='dirt'){
  const shades=['#4c5043','#454a40','#39473e','#37423e','#313e3c','#2a3837','#253537','#233337','#203137','#1c2c32'];
  rect(left,top,CELL,CELL,shades[y]||'#263435');
  for(let k=0;k<6;k++){
   const xx=left+5+((i*13+k*17)%32),yy=top+6+((i*7+k*11)%33);
   rect(xx,yy,(k%4)+2,2,k%2?'#b7a57a36':'#c8c8a526');
  }
 }else if(c.kind==='rubble'){
  rect(left,top,CELL,CELL,'#242d2c');
  for(let k=0;k<9;k++){
   const xx=left+3+((k*17+i*4)%32),yy=top+13+((k*7+i*3)%24);
   ctx.fillStyle=k%2?'#94816a':'#6b786b';ctx.beginPath();ctx.moveTo(xx,yy+6);ctx.lineTo(xx+10,yy+5);ctx.lineTo(xx+5,yy-3);ctx.fill();
  }
  text('!',left+CELL/2,top+14,'800 16px monospace','#f6a185','center');
 }else {
  rect(left,top,CELL,CELL,'#101e23');
  rect(left+2,top+CELL-6,CELL-4,4,'#4d6460');
  rect(left+4,top+4,CELL-8,3,'#273d41');
  if(c.support)drawSupport(left,top,c.support);
  if(c.kind==='room')rect(left+1,top+1,CELL-2,CELL-2,'#35535135');
 }
 if(target){ctx.strokeStyle=(Math.sin(now*.004)>0?'#e1b97c':'#b8ac7f');ctx.lineWidth=2;ctx.strokeRect(left+2,top+2,CELL-4,CELL-4);}
 else if(selected){ctx.strokeStyle='#e8cb8e';ctx.lineWidth=2;ctx.strokeRect(left+1,top+1,CELL-2,CELL-2);}
 if(c.kind==='dirt'&&tool==='dig'&&canDig(i)){
  rect(left+CELL-11,top+4,6,6,'#9cbf9c8f');
 }
}
function drawSupport(x,y,type){
 const color=type==='timber'?'#b28a56':type==='stone'?'#99a1a1':'#9bbab7';
 if(type==='timber'){rect(x+3,y+5,5,CELL-9,color);rect(x+CELL-8,y+5,5,CELL-9,color);rect(x+4,y+4,CELL-8,5,'#d1ab78');line(x+8,y+36,x+CELL-9,y+11,'#87704c',4);}
 else if(type==='stone'){rect(x+2,y+3,9,CELL-5,'#89918e');rect(x+CELL-11,y+3,9,CELL-5,'#89918e');rect(x+7,y+4,CELL-14,9,'#c2c0b5');for(let k=0;k<3;k++)line(x+8,y+12+k*10,x+CELL-8,y+12+k*10,'#727f80',1);}
 else {rect(x+2,y+2,5,CELL-4,'#9eadaa');rect(x+CELL-7,y+2,5,CELL-4,'#9eadaa');rect(x+4,y+2,CELL-8,7,'#b3c9c3');line(x+7,y+CELL-8,x+CELL-7,y+8,'#729d99',3);round(x+2,y+CELL-9,8,8,1,'#cfd5c4');}
}
function drawRooms(now){
 for(const r of g.rooms){
  const {x,y}=xy(r.at),px=OX+x*STEP,py=OY+y*STEP,w=2*STEP-2,h=2*STEP-2;
  const def=ROOMS[r.type];rect(px+1,py+1,w,h,'#172b31');
  const grad=ctx.createLinearGradient(px,py,px,py+h);grad.addColorStop(0,'#29444b');grad.addColorStop(1,'#152a30');
  rect(px+5,py+18,w-10,h-24,grad);
  rect(px+3,py+3,w-4,15,'#23373c');rect(px+4,py+18,4,h-20,'#7d9990');rect(px+w-8,py+18,4,h-20,'#7d9990');
  rect(px+11,py+24,w-22,4,'#627a76');rect(px+9,py+h-15,w-18,5,'#7b8e83');
  if(r.type==='quarters'){
   for(let k=0;k<2;k++){const bx=px+17+k*39;rect(bx,py+48,33,7,'#a9977e');rect(bx+1,py+42,31,6,'#829f96');rect(bx+3,py+39,9,4,'#c7bfab');rect(bx+4,py+55,3,17,'#657c75');}
  }else if(r.type==='storage'){
   for(let k=0;k<3;k++){const bx=px+13+k*23;rect(bx,py+40,20,29,'#85765d');rect(bx+3,py+37,14,5,'#b4a27a');line(bx+2,py+49,bx+18,py+49,'#514e49',1);}
  }else if(r.type==='water'){
   for(let k=0;k<2;k++){const bx=px+16+k*34;rect(bx,py+40,27,28,'#527e83');rect(bx+4,py+53,19,12,'#63aab7');rect(bx-3,py+38,33,5,'#a7bbbb');}
   rect(px+22,py+28,51,4,'#9cc7c8');text('◈',px+57,py+72,'700 20px serif','#c3e4df','center');
  }else if(r.type==='farm'){
   for(let k=0;k<3;k++){const bx=px+15+k*24;rect(bx,py+59,21,6,'#8f7650');line(bx+10,py+58,bx+10,py+39,'#7ca76a',3);line(bx+10,py+47,bx+4,py+42,'#a5c283',4);line(bx+10,py+51,bx+16,py+46,'#aac988',4);}
  }
  rect(px+1,py+1,w-2,17,'#233b3a');text(def.name,px+8,py+14,'700 11px monospace','#e3d1a2');
  ctx.strokeStyle=hover!==-1&&cellsForRoom(r.at).includes(hover)?'#e5c78d':'#6c9188';ctx.lineWidth=2;ctx.strokeRect(px+1,py+1,w-2,h-2);
 }
}
function drawAvatar(x,y,now){
 // Small animated overseer sprite. Player never has hunger or thirst meters.
 const walking=!!pending;
 ctx.save();ctx.translate(x,y+8);
 const bob=walking?Math.sin(now*.016)*2:Math.sin(now*.002)*.5;
 rect(-4,-18+bob,8,11,'#d6bd7e');rect(-6,-22+bob,12,6,'#354b51');
 rect(-4,-26+bob,8,8,'#d8a383');rect(-6,-27+bob,12,3,'#766953');
 line(-3,-6,walking?-5:-3,2,'#202a30',3);line(3,-6,walking?5:3,2,'#202a30',3);
 line(4,-14,12,-5,'#a8a28a',3);rect(9,-14,3,13,'#b5a585');rect(7,-16,8,4,'#8c8e85');
 ctx.restore();
}
function drawingUnderground(now){
 sky();earth();
 if(!g)return;
 for(let i=0;i<g.cells.length;i++)tile(i,now);
 drawRooms(now);
 // Hatch shaft bridge
 line(OX+9*STEP+CELL/2,205,OX+9*STEP+CELL/2,OY+CELL/2,'#acc2b0',4);
 const actor=actorPoint();drawAvatar(actor.x,actor.y,now);
 if(pending&&pending.op==='dig'){
  const a=point(pending.target);
  if(pending.elapsed>Math.max(0,(pending.route.length-1)*240)){
   line(actor.x+10,actor.y-5,a.x,a.y,'#d6bf80',2);
   ctx.strokeStyle='#e8c67f';ctx.lineWidth=3;ctx.beginPath();ctx.arc(a.x,a.y,10+Math.sin(now*.03)*3,0,Math.PI*1.6);ctx.stroke();
  }
 }
 const night=hour()<6||hour()>=19;
 if(night)rect(0,0,1130,700,'#06121e27');
 text('SUBSURFACE • UNSURVEYED TERRITORY',19,45,'700 13px monospace','#ced6b4');
 text('CLICK DIRT BLOCKS TO EXCAVATE',19,66,'700 10px monospace','#98b6a8');
 text('DEPTH PRESSURE INCREASES BELOW 8m',1110,45,'700 11px monospace','#d1bd90','right');
}
function surfaceCardBounds(id){
 const j=SITES.findIndex(s=>s.id===id),w=238,gap=26;
 return {x:48+j*(w+gap),y:322,w,h:248};
}
function drawingSurface(now){
 const gradient=ctx.createLinearGradient(0,0,0,700);gradient.addColorStop(0,'#344b4e');gradient.addColorStop(.54,'#849084');gradient.addColorStop(1,'#4f5649');rect(0,0,1130,700,gradient);
 const night=hour()<6||hour()>=19;
 if(night){rect(0,0,1130,700,'#091e32a6');for(let k=0;k<35;k++)rect((k*89+5)%1130,(k*61)%190,2,2,'#d3dfcd');}
 const haze=ctx.createRadialGradient(940,85,10,940,85,270);haze.addColorStop(0,'#f0d89e73');haze.addColorStop(1,'#ffffff00');rect(650,0,480,400,haze);
 ctx.fillStyle='#293e40';ctx.beginPath();ctx.moveTo(0,300);
 for(let x=0;x<=1130;x+=24)ctx.lineTo(x,280+Math.sin(x*.011)*22+Math.cos(x*.035)*8);
 ctx.lineTo(1130,700);ctx.lineTo(0,700);ctx.fill();
 rect(0,278,1130,20,'#6f7365');rect(0,298,1130,402,'#383e39');
 rect(0,606,1130,94,'#2f3330');
 for(let k=0;k<19;k++)rect(k*70,615,42,3,'#a69a7a52');
 text('SURFACE // YOUR FIRST RESOURCE NETWORK',49,59,'800 20px monospace','#f4e7c8');
 text('CLICK A LOCATION TO SEND YOUR OVERSEER. THE FURTHER YOU GO, THE GREATER THE RISK.',49,85,'700 11px monospace','#d6d8c7');
 // Four original 2D illustrated scavenging destinations
 for(const site of SITES){
  const j=SITES.indexOf(site),b=surfaceCardBounds(site.id);
  round(b.x,b.y,b.w,b.h,5,'#132329db','#a2ac8e');
  ctx.save();ctx.beginPath();ctx.rect(b.x+2,b.y+2,b.w-4,132);ctx.clip();
  rect(b.x+2,b.y+2,b.w-4,132,j===0?'#34514b':j===1?'#54615d':j===2?'#51514a':'#664d48');
  rect(b.x+2,b.y+99,b.w-4,35,'#253b36');
  if(j===0){
   for(let k=0;k<4;k++){const bx=b.x+24+k*55;rect(bx,b.y+43,9,78,'#584f40');ctx.fillStyle='#7e9675';ctx.beginPath();ctx.arc(bx+6,b.y+45,27,0,Math.PI*2);ctx.fill();rect(bx+22,b.y+96,32,14,'#907e60');}
  }else if(j===1){
   rect(b.x+23,b.y+76,176,35,'#66746a');rect(b.x+48,b.y+57,100,22,'#8b887b');for(const bx of [b.x+57,b.x+160]){ctx.fillStyle='#273536';ctx.beginPath();ctx.arc(bx,b.y+110,18,0,Math.PI*2);ctx.fill();}
   line(b.x+25,b.y+45,b.x+210,b.y+45,'#c4bd9b',3);
  }else if(j===2){
   rect(b.x+25,b.y+54,169,61,'#5a625c');rect(b.x+15,b.y+49,194,10,'#9c9d87');rect(b.x+92,b.y+73,52,40,'#1e2e33');
   for(let k=0;k<4;k++)rect(b.x+30+k*35,b.y+115,29,11,'#a08e69');
  }else{
   ctx.fillStyle='#6d4b42';ctx.beginPath();ctx.moveTo(b.x+10,b.y+121);ctx.lineTo(b.x+72,b.y+51);ctx.lineTo(b.x+113,b.y+115);ctx.lineTo(b.x+175,b.y+30);ctx.lineTo(b.x+233,b.y+124);ctx.fill();
   rect(b.x+43,b.y+104,145,17,'#a1886c');rect(b.x+105,b.y+72,12,56,'#88877a');
  }
  ctx.restore();
  rect(b.x+2,b.y+134,b.w-4,112,'#122127');
  text(site.name,b.x+15,b.y+161,'800 18px monospace','#e8e5cd');
  text('DISTANCE '+site.distance,b.x+15,b.y+181,'700 11px monospace','#a9b5a3');
  text(site.risk===0?'RISK: SAFE':site.risk<.1?'RISK: LOW':site.risk<.3?'RISK: MODERATE':'RISK: HIGH',b.x+15,b.y+200,'700 11px monospace',site.risk>.2?'#ecaa95':'#b4d2b1');
  round(b.x+13,b.y+215,b.w-26,25,2,'#456351','#a6c1a0');text('SEARCH FOR MATERIALS',b.x+b.w/2,b.y+232,'700 11px monospace','#f3e9c7','center');
  if(j===hover){ctx.strokeStyle='#f3d59b';ctx.lineWidth=3;ctx.strokeRect(b.x,b.y,b.w,b.h);}
 }
 if(g){
  round(32,210,155,57,4,'#182c2be0','#729084');
  text('YOUR VAULT HATCH',46,231,'700 10px monospace','#cfdbbd');
  text('⬡ ENTRY POINT',46,252,'700 13px monospace','#e1c88d');
  const pct=pending?.op==='scavenge'?clamp(pending.elapsed/pending.duration,0,1):0;
  const x=115+pct*825,y=282-Math.sin(pct*Math.PI)*52;drawAvatar(x,y,now);
  if(pending?.op==='scavenge')text('SCAVENGING '+Math.round(pct*100)+'%',1130/2,142,'800 17px monospace','#f6e4b9','center');
 }
}
function drawing(now){
 if(view==='surface')drawingSurface(now);else drawingUnderground(now);
}
function advance(dt){
 if(!pending)return;
 const a=pending;
 a.elapsed+=dt;
 const travel=a.route?(a.route.length-1)*250:0;
 if(a.route)a.routeIndex=Math.min(a.route.length-1,Math.ceil(a.elapsed/250));
 if(a.elapsed>=travel+a.duration)finish();
}
function frameLoop(now){
 const dt=Math.min(100,Math.max(0,now-lastFrame));lastFrame=now;
 frame++;if(g)advance(dt);
 drawing(now);
 if(toastUntil&&now>toastUntil){$('floatingToast').classList.remove('show');toastUntil=0;}
 requestAnimationFrame(frameLoop);
}
function pointer(e){
 if(!g||pending)return;
 const rect=canvas.getBoundingClientRect(),px=(e.clientX-rect.left)*canvas.width/rect.width,py=(e.clientY-rect.top)*canvas.height/rect.height;
 if(view==='surface'){hover=SITES.findIndex(site=>{const r=surfaceCardBounds(site.id);return px>=r.x&&px<=r.x+r.w&&py>=r.y&&py<=r.y+r.h;});}
 else{const x=Math.floor((px-OX)/STEP),y=Math.floor((py-OY)/STEP);hover=x>=0&&x<WIDTH&&y>=0&&y<HEIGHT?ix(x,y):-1;}
 if(hover>=0&&view==='underground'&&tool==='inspect')inspect(hover);
}
function handleKey(e){
 if(!g||$('startOverlay').classList.contains('hidden')===false)return;
 if(e.key==='Escape'){
  $('techOverlay').classList.add('hidden');$('helpOverlay').classList.add('hidden');return;
 }
 if(document.activeElement?.tagName==='INPUT')return;
 const keys={Digit1:'dig',Digit2:'timber',Digit3:'stone',Digit4:'steel',Digit5:'quarters',Digit6:'storage',Digit7:'water',Digit8:'farm'};
 if(keys[e.code])chooseTool(keys[e.code]);
}
function newGame(){
 if(!g||confirm('Start a new Foundation test? Your current prototype save will be replaced when you begin a new run.')){
  pending=null;$('startOverlay').classList.remove('hidden');$('continueBtn').hidden=!load();
 }
}
for(const b of document.querySelectorAll('[data-tool]'))b.addEventListener('click',()=>chooseTool(b.dataset.tool));
$('surfaceBtn').addEventListener('click',()=>setView('surface'));
$('undergroundBtn').addEventListener('click',()=>setView('underground'));
$('world').addEventListener('click',clickCanvas);
$('world').addEventListener('pointermove',pointer);
$('world').addEventListener('pointerleave',()=>hover=-1);
$('techBtn').addEventListener('click',openTech);
$('closeTech').addEventListener('click',()=>$('techOverlay').classList.add('hidden'));
$('helpBtn').addEventListener('click',()=>$('helpOverlay').classList.remove('hidden'));
$('closeHelp').addEventListener('click',()=>$('helpOverlay').classList.add('hidden'));
$('helpOk').addEventListener('click',()=>$('helpOverlay').classList.add('hidden'));
$('skipBtn').addEventListener('click',()=>{if(g){g.tutorial.skipped=true;log('Tutorial skipped. You may scavenge and dig freely.');persist();render();}});
$('tutAction').addEventListener('click',tutorialAction);
$('startBtn').addEventListener('click',()=>begin($('nameInput').value));
$('continueBtn').addEventListener('click',()=>{const d=load();if(d)resume(d);});
$('newBtn').addEventListener('click',newGame);
$('saveBtn').addEventListener('click',()=>{persist();toast('FOUNDATION SAVED');});
document.addEventListener('keydown',handleKey);
const previous=load();
$('continueBtn').hidden=!previous;
if(previous)$('continueBtn').textContent='CONTINUE '+previous.name.toUpperCase();
chooseTool('dig');
requestAnimationFrame(frameLoop);
})();