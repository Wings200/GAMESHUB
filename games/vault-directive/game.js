/* VAULT DIRECTIVE 1.0 — browser presentation and interaction.
   Original DOM cutaway world: never depends on Canvas to display or accept input. */
(()=>{'use strict';
const D=window.VDCore;
const $=id=>document.getElementById(id);
const KEY='gameshub-vault-directive-rebuild-v3';
const CW=138,CH=122;
const safe=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const fmt=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString();
let s=null,panel='tutorial',panelId=null,modalType=null,zoom=1,last=performance.now(),lastPaint=0,lastSave=0,lastLog='',alerted=false;
let selectedSite='grove',surfaceOpen=false,sideScroll=0;
const residentNodes=new Map(),residentMotion=new Map();
let lastTerrainHtml='',lastRoomsHtml='',lastVisitorsHtml='',lastPinsHtml='',lastDetailsHtml='',lastSideContent='',lastSidePanel='';
if(!D){$('mapStatus').textContent='ERROR: GAME ENGINE DID NOT LOAD';$('bottomHint').textContent='Try refreshing. The data engine is missing.';return;}
function load(){try{const a=JSON.parse(localStorage.getItem(KEY));return D.valid(a)?a:null;}catch{return null;}}
function save(){if(!s)return;try{localStorage.setItem(KEY,JSON.stringify(s));}catch{}}
function toast(message,bad=false){
 const p=document.createElement('div');p.className='toast'+(bad?' bad':'');p.textContent=String(message||'');
 $('toasts').prepend(p);while($('toasts').children.length>4)$('toasts').lastElementChild.remove();
 setTimeout(()=>p.remove(),4200);
}
function tell(result){if(!result)return;if(result.message)toast(result.message,!result.ok);if(result.ok){renderAll();save();}}
function showIntro(){
 const old=load();
 $('welcome').classList.remove('hidden');
 $('continueRun').hidden=!old;
 if(old)$('continueRun').innerHTML='CONTINUE '+safe(old.name.toUpperCase())+' <span>→</span>';
}
function start(newVault){
 s=newVault;s.task=null;s.speed=1;panel='tutorial';panelId=null;modalType=null;last=performance.now();
 surfaceOpen=false;selectedSite='grove';residentNodes.forEach(n=>n.remove());residentNodes.clear();residentMotion.clear();
 lastTerrainHtml='';lastRoomsHtml='';lastVisitorsHtml='';lastPinsHtml='';lastDetailsHtml='';lastSideContent='';lastSidePanel='';
 if(!Array.isArray(s.expeditionHistory))s.expeditionHistory=[];
 if(!s.lastExpedition)s.lastExpedition=null;
 $('surfaceLayer').classList.add('hidden');
 $('welcome').classList.add('hidden');closeModal();renderAll();centerVault();save();
 toast('Entrance online. Open SCAVENGE to collect your first supplies.');
}
function centerVault(){
 const vp=$('viewport');vp.scrollLeft=Math.max(0,(D.START%9)*CW*zoom-vp.clientWidth/2+CW*zoom/2);
 vp.scrollTop=0;
}
function setZoom(newZoom){zoom=D.clamp(newZoom,.6,1.35);$('worldStage').style.zoom=zoom;$('zoomLabel').textContent=Math.round(zoom*100)+'%';}
function selectTool(tool){
 s.tool=tool;
 if(tool==='build')panel='build';
 else if(tool==='timber')panel='support';
 else if(tool==='inspect')panel='tutorial';
 else if(tool==='dig')panel='tutorial';
 else if(tool==='demolish')panel='demolish';
 document.querySelectorAll('.action[data-tool]').forEach(btn=>btn.classList.toggle('active',btn.dataset.tool===tool));
 $('bottomHint').textContent=tool==='dig'?'SHOVEL READY · CLICK CONNECTED DIRT TO EXCAVATE':
 tool==='timber'?'SUPPORT READY · CLICK A REACHABLE OPEN TILE':
 tool==='build'?'ROOM DESIGN SELECTED · CLICK THE LEFT TILE OF TWO OPEN BAYS':
 tool==='demolish'?'DISMANTLE · CLICK A ROOM OR SUPPORT TO SALVAGE PARTS':
 'INSPECT · CLICK PEOPLE OR ROOMS TO VIEW DETAILS';
 showPanel();
}
function personMarkup(p,kind='walk'){
 if(!p)return '';
 const cname=kind+(p.weapon>0?' guard':'');
 return '<span class="dweller '+cname+'" tabindex="0" role="button" title="'+safe(p.name)+'" data-command="person" data-id="'+p.id+'" style="--shirt:'+p.shirt+';--skin:'+p.skin+';--hair:'+p.hair+';--delay:'+((p.id%5)*-.4)+'s">'+
 '<span class="hair"></span><span class="face"></span><span class="body"></span><span class="arm left"></span><span class="arm right"></span><span class="leg left"></span><span class="leg right"></span><span class="dweller-name">'+safe(p.name)+'</span></span>';
}
function renderTerrain(){
 const parts=[];
 for(let i=0;i<D.N;i++){
  const c=s.grid[i],[x,y]=D.xy(i);
  const cls=c.kind==='dirt'?'dirt':c.kind==='rubble'?'rubble':c.kind==='room'?'roomtile':i===D.START?'entrance':'open';
  const near=s.tool==='dig'&&D.canDig(s,i)?' nearby':'';
  const target=(s.task&&s.task.i===i&&s.task.type!=='scavenge')||(!s.skipTutorial&&s.tutorial===1&&[5,6].includes(i)&&s.grid[i].kind==='dirt')?' target':'';
  parts.push('<button type="button" class="sector '+cls+near+target+'" data-index="'+i+'" title="Level '+(y+1)+' · Bay '+(x+1)+' · '+cls+'">'+
  (x===0?'<span class="depth">L'+String(y+1).padStart(2,'0')+'</span>':'')+
  (c.support?'<span class="frame '+c.support+'"></span>':'')+
  (c.kind==='lift'?'<span class="location-mark">⇳ LIFT</span>':'')+
  (c.kind==='rubble'?'<span class="location-mark">CLEAR</span>':'')+
  '</button>');
 }
 const html=parts.join('');if(lastTerrainHtml!==html){$('earth').innerHTML=html;lastTerrainHtml=html;}
}
function renderRooms(){
 let html='';
 for(const r of s.rooms){
  const [x,y]=D.xy(r.cells[0]),d=D.ROOMS[r.type];
  const noPower=!s.res.power&&r.type!=='power'&&!['quarters','storage'].includes(r.type);
  const machines=r.type==='food'||r.type==='storage'?3:2;
  const kind=r.type==='power'?'power':r.type;
  html+='<div class="room '+kind+(noPower?' unpowered':'')+'" data-room="'+r.id+'" style="left:'+(x*CW+2)+'px;top:'+(y*CH+2)+'px;width:'+(2*CW-4)+'px" title="'+safe(d.name)+'">'+
  '<div class="room-bg"></div><div class="room-wall"></div><div class="room-light"></div>'+
  '<span class="room-name">'+safe(d.name.toUpperCase())+'</span><span class="room-mark">'+d.icon+'</span>'+
  '<div class="room-art">'+Array.from({length:machines},()=>'<span class="machine"></span>').join('')+'</div>'+
  '<div class="room-people"></div><span class="room-nameplate">'+(r.type==='quarters'?'BEDS +4':r.workers.length?D.workersOnDuty(s,r).length+' ON DUTY / '+r.workers.length+' ASSIGNED':'NO STAFF')+'</span>'+
  '<div class="room-floor"></div><div class="room-progress"><i style="width:0%"></i></div>'+
  (r.ready?'<button type="button" class="collect" data-command="collect" data-id="'+r.id+'" title="Collect '+d.name+' resources">'+d.icon+'</button>':'')+
  (s.threat?'<span class="alarm">!</span>':'')+
  '</div>';
 }
 if(lastRoomsHtml!==html){$('roomLayer').innerHTML=html;lastRoomsHtml=html;}
}

// Residents are unique, persistent DOM nodes. This prevents duplicate people
// in rooms and gives each resident one actual destination at any moment.
function renderPeople(){
 const layer=$('peopleLayer');
 const found=new Set(),slots={};
 for(const p of s.people){
  const activity=D.routine(s,p);
  const room=s.rooms.find(r=>r.id===activity.roomId);
  const targetCell=room?room.cells[0]:D.START;
  const key=String(activity.roomId??'hatch');
  const spot=slots[key]||0;slots[key]=spot+1;
  let node=residentNodes.get(p.id);
  if(!node){
   node=document.createElement('span');
   node.dataset.command='person';node.dataset.id=String(p.id);
   node.dataset.residentId=String(p.id);
   node.style.cssText='--shirt:'+p.shirt+';--skin:'+p.skin+';--hair:'+p.hair+';--pants:#3f5a61;';
   node.innerHTML='<span class="hair"></span><span class="face"></span><span class="body"></span><span class="arm left"></span><span class="arm right"></span><span class="leg left"></span><span class="leg right"></span><span class="dweller-name">'+safe(p.name)+'</span>';
   layer.appendChild(node);residentNodes.set(p.id,node);
  }
  let movement=residentMotion.get(p.id);
  if(!movement){
   movement={cell:D.START,lastMove:s.elapsed};
   residentMotion.set(p.id,movement);
  }
  if(movement.cell!==targetCell&&s.elapsed-movement.lastMove>=.9){
   const route=D.path(s,movement.cell,targetCell);
   if(route&&route.length>1){
    movement.cell=route[1];movement.lastMove=s.elapsed;
   }
  }
  const arrived=movement.cell===targetCell;
  const phase=activity.phase;
  const spriteState=!arrived?'walk':phase==='sleep'?'sleep':phase==='sick'?'sick':phase==='working'||phase==='socializing'||phase==='meal'?'walk':phase==='guarding'?'guarding':'';
  node.className='dweller'+(spriteState?' '+spriteState:'')+(p.weapon?' guard':'');
  node.title=p.name+' — '+(arrived?activity.label:'Walking to '+activity.label.toLowerCase());
  node.dataset.state=arrived?activity.label:'Walking to '+activity.label.toLowerCase();
  const [x,y]=D.xy(movement.cell);
  const columns=4,offset=Math.min(spot,7);
  const restingPose=arrived&&room&&(phase==='sleep'||phase==='sick');
  node.style.left=(x*CW+(restingPose?58+(offset%columns)*45:arrived&&room?31+(offset%columns)*54:49+(p.id%3)*5))+'px';
  node.style.top=(y*CH+(arrived&&room?46+(offset>=4?-3:0):40))+'px';
  found.add(p.id);
 }
 for(const [id,node] of residentNodes){
  if(found.has(id))continue;
  node.remove();residentNodes.delete(id);residentMotion.delete(id);
 }
}
function updateTask(){
 const miner=$('miner');miner.classList.toggle('busy',!!s.task);
 if(s.task&&s.task.type==='scavenge'){miner.style.opacity='0';miner.style.top='112px';miner.style.left=(5*CW+65)+'px';}
 else if(s.task&&typeof s.task.i==='number'){miner.style.opacity='1';
  const [x,y]=D.xy(s.task.i);miner.style.top=(204+y*CH+33)+'px';miner.style.left=(x*CW+49)+'px';
 }else{
  miner.style.opacity='1';miner.style.top=(204+33)+'px';miner.style.left=(D.START*CW+49)+'px';
 }
 $('mapStatus').textContent=s.threat?'⚠ '+s.threat.name+' · DEFEND YOUR VAULT':s.task?'OVERSEER WORKING · '+s.task.type.toUpperCase():'VAULT NETWORK · '+(D.night(s)?'NIGHT SHIFT':'DAY SHIFT');
 $('hudTime').textContent=D.time(s);
 $('surfaceName').textContent=s.name.toUpperCase().slice(0,13);
 document.querySelector('.surface-scene').classList.toggle('night',D.night(s));
}
function updateHud(){
 if(!s)return;
 const cap=D.caps(s);
 for(const name of ['power','food','water']){
  const value=s.res[name]||0;
  $(name+'Count').textContent=fmt(value)+' / '+cap[name];
  $(name+'Bar').style.width=Math.min(100,Math.round(value/cap[name]*100))+'%';
  const danger=value<Math.max(4,s.people.length*1.5);
  $('stat'+name[0].toUpperCase()+name.slice(1)).classList.toggle('danger',danger&&s.people.length>0);
 }
 $('scrapCount').textContent=fmt(s.res.scrap);
 $('woodCount').textContent=fmt(s.res.wood);
 $('stoneCount').textContent=fmt(s.res.stone);
 $('peopleCount').textContent=s.people.length+' / '+D.capacity(s);
 $('moraleCount').textContent=s.people.length?D.morale(s)+'%':'—';
 $('moraleBar').style.width=D.morale(s)+'%';
 $('statPower').title='Each staffed reactor generates power. Build and assign an engineer.';
 $('statFood').title='Gardens generate food. Every resident eats.';
 $('statWater').title='Purifiers generate clean water. Dehydrated residents drink more.';
 $('visitorBadge').hidden=!s.visitors.length;
 $('visitorBadge').textContent=s.visitors.length;
 updateTask();updateSurfaceProgress();
 const c=s.rooms.filter(r=>r.ready).length;
 $('bottomHint').textContent=s.threat?'⚠ ALARM! ASSIGNED GUARDS ARE RESPONDING TO THE ATTACK.':
 s.task?s.task.type.toUpperCase()+' IN PROGRESS · '+Math.round(100*D.clamp((s.elapsed-s.task.start)/s.task.duration,0,1))+'%':
 c?'◈ '+c+' PRODUCTION ROOM'+(c===1?'':'S')+' READY · CLICK THE GLOWING RESOURCE BUBBLES':
 s.tool==='dig'?'⛏ CLICK A HIGHLIGHTED DIRT TILE TO DIG • WORK OUTWARD FROM THE HATCH':
 s.tool==='build'?'▣ CHOOSE A ROOM DESIGN ON THE RIGHT, THEN CLICK TWO SUPPORTED OPEN BAYS':
 s.tool==='timber'?'▥ SELECT A SUPPORT TYPE, THEN CLICK AN EMPTY EXCAVATED TILE':
 'CLICK ROOMS, PEOPLE AND CONSTRUCTION TILES TO INTERACT';
}
function renderVisitors(){
 const html=s.visitors.map(p=>'<div class="outside-applicant" title="'+safe(p.name)+' is waiting"><span class="bubble-talk">KNOCK!'+(p.checks?' ?':'')+'</span>'+personMarkup(p,'walk').replace('data-command="person"','data-command="visitors"')+'</div>').join('');
 if(lastVisitorsHtml!==html){$('outsidePeople').innerHTML=html;lastVisitorsHtml=html;}
}
function meter(label,value,red=false){
 return '<div class="metric-row"><span>'+safe(label)+'</span><b style="'+(red?'color:#efaa8f':'')+'">'+safe(value)+'</b></div>';
}
function button(cmd,text,id='',value='',style=''){
 return '<button class="panel-button '+style+'" data-command="'+cmd+'"'+(id!==''?' data-id="'+safe(id)+'"':'')+(value!==''?' data-value="'+safe(value)+'"':'')+'>'+text+'</button>';
}
function tutorialMarkup(){
 const step=D.TUTORIAL[Math.min(s.tutorial,7)];
 return '<div class="mission-card"><small>FOUNDATION TRAINING · '+(s.tutorial+1)+'/8</small><h3>'+step[0]+'</h3><p>'+step[1]+'</p><div class="mission-progress"><i style="width:'+Math.round(s.tutorial/8*100)+'%"></i></div>'+
 button('tutorial',s.tutorial===7?'OPEN RESIDENTS':'SHOW ME HOW →','','','primary')+
 '</div>'+ (s.skipTutorial?'<p class="panel-intro">Tutorial skipped. Free construction mode.</p>':'<p class="panel-intro">Tutorial progress updates automatically as you play. Your Overseer has no personal hunger or thirst bar; your residents do.</p>')+
 '<div class="panel-section">WHAT MAKES A VAULT SURVIVE?</div>'+
 meter('Power',fmt(s.res.power)+' units',s.res.power<4)+
 meter('Food',fmt(s.res.food)+' units',s.res.food<4)+
 meter('Water',fmt(s.res.water)+' units',s.res.water<4)+
 meter('Housing',s.people.length+' / '+D.capacity(s)+' beds')+
 meter('Research available',s.research+' pts')+
 (s.people.length?meter('Average morale',D.morale(s)+'%'):'')+
 '<div class="panel-section">QUICK ACTIONS</div>'+
 button('scavenge','☀ SCAVENGE OUTSIDE')+
 button('showBuild','▣ OPEN ROOM BLUEPRINTS')+
 button('visitors','♟ REVIEW WAITING SURVIVORS'+(s.visitors.length?' ('+s.visitors.length+')':''))+
 button('tech','✣ OPEN SKILL TREE')+
 (!s.skipTutorial&&s.tutorial<7?button('skip','HIDE GUIDED OBJECTIVES','','','small'):s.skipTutorial?button('resumeGuide','RESTORE GUIDED OBJECTIVES','','','small'):'');
}
function buildMarkup(){
 const selected=D.ROOMS[s.buildType];
 let html='<p class="panel-intro">Dig adjacent bays with the shovel, support at least one of them, then choose a blueprint and click the LEFT bay. Each new facility costs actual resources.</p>';
 if(selected){
  html+='<div class="mission-card"><small>ACTIVE CONSTRUCTION DESIGN</small><h3>'+selected.icon+' '+safe(selected.name.toUpperCase())+'</h3><p>'+safe(selected.desc)+'</p>'+
  '<div class="cost">'+D.cost(selected.cost)+'</div>'+button('activateBuild','SELECT BUILD TOOL →','','','primary')+'</div>';
 }else html+='<div class="mission-card"><small>ACTIVE DESIGN</small><h3>⇳ ELEVATOR SHAFT</h3><p>Enables access to deeper levels. Place on an open reachable tile.</p><div class="cost">2 wood · 4 scrap</div>'+button('activateBuild','SELECT ELEVATOR TOOL →','','','primary')+'</div>';
 const categories=[
  ['LIVING & STORAGE',['quarters','storage']],
  ['ESSENTIAL PRODUCTION',['power','food','water']],
  ['COMMUNITY & DEFENSE',['cafeteria','recreation','medical','security']]
 ];
 for(const [label,items] of categories){
  html+='<div class="panel-section">'+label+'</div><div class="room-list">';
  for(const key of items){
   const d=D.ROOMS[key],locked=d.unlock&&!s.unlocked.includes(d.unlock);
   const active=s.buildType===key;
   html+='<button class="room-small'+(active?' selected':'')+'" data-command="selectRoom" data-value="'+key+'">'+
    d.icon+' '+safe(d.name.toUpperCase())+' <span class="staff-label">'+(locked?'(RESEARCH FIRST)':D.cost(d.cost))+'</span>'+
    (active?' ✓':'')+'</button>';
  }
  html+='</div>';
 }
 html+='<div class="panel-section">EXCAVATION & SUPPORTS</div>'+
 button('showSupport','▥ CHOOSE A TUNNEL FRAME')+
 button('liftTool','⇳ BUILD AN ELEVATOR SHAFT');
 return html;
}
function supportMarkup(){
 let html='<p class="panel-intro">Dig first, then physically install structural frames. Deeper excavation is more dangerous without proper shoring.</p>';
 for(const [name,d]of Object.entries(D.SUPPORTS)){
  const locked=d.unlock&&!s.unlocked.includes(d.unlock);
  html+='<div class="build-card"><span class="badge'+(locked?' warn':'')+'">'+(locked?'RESEARCH REQUIRED':s.supportType===name?'SELECTED':'AVAILABLE')+'</span>'+
  '<h3>▥ '+safe(d.name.toUpperCase())+'</h3><p class="subtitle">Depth resistance: '+d.strength+'/4. Installing these supports costs real materials.</p>'+
  '<div class="cost '+(D.afford(s,d.cost)?'':'bad')+'">'+D.cost(d.cost)+'</div>'+
  button('selectSupport',locked?'RESEARCH TO UNLOCK':s.supportType===name?'✓ ACTIVE SUPPORT':'USE THIS SUPPORT','',name,locked?'':'primary')+'</div>';
 }
 return html;
}

const SURFACE_POINTS=[
 {x:28,y:56,icon:'♣'}, {x:45,y:34,icon:'▤'}, {x:62,y:65,icon:'⌂'},
 {x:77,y:27,icon:'◈'}, {x:89,y:55,icon:'⌖'}
];
function setSurface(open){
 if(!s)return;
 surfaceOpen=!!open;$('surfaceLayer').classList.toggle('hidden',!surfaceOpen);
 if(surfaceOpen){setPanel('explore');renderSurface();updateSurfaceProgress();}
}
function renderSurface(){
 if(!s||!surfaceOpen)return;
 let pins='';
 for(const [i,site] of D.SITES.entries()){
  const point=SURFACE_POINTS[i];
  pins+='<button type="button" class="site-pin'+(selectedSite===site.id?' active':'')+'" data-command="siteSelect" data-value="'+site.id+'" style="left:'+point.x+'%;top:'+point.y+'%">'+
  '<strong>'+point.icon+'</strong><span>'+safe(site.name.toUpperCase())+'</span><small>'+safe(site.distance)+'</small></button>';
 }
 const pinHost=$('surfaceSites');if(lastPinsHtml!==pins){pinHost.innerHTML=pins;lastPinsHtml=pins;}
 const target=D.SITES.find(x=>x.id===selectedSite)||D.SITES[0],busy=!!s.task;
 const active=s.task?.type==='scavenge'?D.SITES.find(x=>x.id===s.task.meta):null;
 let details;
 if(active){
  details='<div class="site-text"><h3>OVERSEER: '+safe(active.name.toUpperCase())+'</h3><p>Actually traveling through the wasteland. Watch the marker move to the destination, explore it and return with materials.</p></div>'+
  '<button type="button" disabled>EXPEDITION IN PROGRESS…</button>';
 }else{
  const last=s.lastExpedition;
  details='<div class="site-text"><h3>'+safe(target.name.toUpperCase())+'</h3><p>'+safe(target.desc)+' · '+safe(target.distance)+' away · '+Math.round(target.risk*100)+'% encounter risk</p>'+
  (last?'<span class="explore-report">LAST RETURN: '+safe(last.site)+' · '+Object.entries(last.loot).filter(([,v])=>v>0).map(([k,v])=>'+'+v+' '+k).join(', ')+(last.hazard?' · HAZARD ENCOUNTER':'')+'</span>':'')+'</div>'+
  '<button type="button" data-command="search" data-value="'+target.id+'" '+(busy?'disabled':'')+'>SEND OVERSEER →</button>';
 }
 const info=$('surfaceDetails');if(lastDetailsHtml!==details){info.innerHTML=details;lastDetailsHtml=details;}
 updateSurfaceProgress();
}
function updateSurfaceProgress(){
 if(!s||!surfaceOpen)return;
 const active=s.task?.type==='scavenge'?s.task:null;
 const target=D.SITES.find(x=>x.id===(active?.meta||selectedSite))||D.SITES[0];
 const point=SURFACE_POINTS[D.SITES.indexOf(target)]||SURFACE_POINTS[0];
 let percent=0,x=10,y=76,label='CHOOSE A DESTINATION';
 if(active){
  percent=D.clamp((s.elapsed-active.start)/active.duration,0,1);
  const stage=percent<.35?'TRAVELING OUTBOUND':percent<.76?'SEARCHING THE RUINS':'RETURNING TO THE VAULT';
  label=stage+' · '+target.name.toUpperCase();
  if(percent<.35){const t=percent/.35;x=10+(point.x-10)*t;y=76+(point.y-76)*t;}
  else if(percent<.76){x=point.x;y=point.y+(Math.sin(s.elapsed*7)*1.4);}
  else{const t=(percent-.76)/.24;x=point.x+(10-point.x)*t;y=point.y+(76-point.y)*t;}
 }else if(s.task)label='OVERSEER BUSY WITH '+s.task.type.toUpperCase();
 else if(s.lastExpedition)label='OVERSEER RETURNED · CARGO SECURED';
 const avatar=$('travelAvatar');avatar.style.left=x+'%';avatar.style.top=y+'%';
 avatar.classList.toggle('busy',!!active);
 $('travelStage').textContent=label;$('travelPercent').textContent=active?Math.round(percent*100)+'%':'READY';
 $('travelFill').style.width=Math.round(percent*100)+'%';
}
function renderCoach(){
 if(!s)return;
 const visible=!s.skipTutorial&&s.tutorial<7;
 $('coach').classList.toggle('hidden',!visible);
 if(!visible)return;
 const step=D.TUTORIAL[Math.min(s.tutorial,7)];
 $('coachProgress').textContent=String(s.tutorial+1).padStart(2,'0')+' / 08';
 $('coachTitle').textContent=step[0];
 $('coachText').textContent=step[1];
}
function suppliesMarkup(){
 const cap=D.caps(s);
 let html='<p class="panel-intro">Food, clean water and electricity are real stockpiles. Residents drink and eat automatically. Production requires workers on duty.</p>';
 for(const k of ['power','food','water']){
  const amount=s.res[k],capacity=cap[k];
  html+='<div class="build-card"><h3>'+({power:'ϟ ELECTRICITY',food:'✿ FOOD',water:'◈ CLEAN WATER'}[k])+'</h3>'+
  meter('Stored',Math.floor(amount)+' / '+capacity)+
  '<div class="room-timer"><i style="width:'+Math.round(amount/capacity*100)+'%"></i></div>'+
  meter('Production rooms',s.rooms.filter(r=>r.type===k).length)+
  meter('Ready to collect',s.rooms.filter(r=>r.type===k&&r.ready).length)+
  (k==='food'?meter('Resident consumption',(s.people.length*.032).toFixed(2)+' / sim second'):
   k==='water'?meter('Resident consumption',(s.people.reduce((v,p)=>v+(p.thirst<30?.09:.042),0)).toFixed(2)+' / sim second'):
   meter('Room usage',(s.rooms.filter(r=>!['power','quarters','storage'].includes(r.type)).length*.045).toFixed(2)+' / sim second'))+
   '</div>';
 }
 html+='<div class="panel-section">CONSTRUCTION MATERIALS</div>'+
 meter('Wood',fmt(s.res.wood))+meter('Scrap',fmt(s.res.scrap))+
 meter('Stone',fmt(s.res.stone))+meter('Medicine',fmt(s.res.medicine))+
 meter('Research points',s.research)+
 '<div class="panel-section">PRODUCTION STATUS</div>';
 const production=s.rooms.filter(r=>D.ROOMS[r.type].output);
 html+=production.length?production.map(r=>'<div class="build-card"><h3>'+D.ROOMS[r.type].icon+' '+safe(D.ROOMS[r.type].name)+'</h3>'+
 meter('On duty',D.workersOnDuty(s,r).length+' / '+r.workers.length+' assigned')+
 meter('Progress',r.ready?'READY':Math.round(r.progress)+'%')+
 button('inspectRoom',r.ready?'COLLECT / VIEW FACILITY →':'VIEW FACILITY →',r.id,'','small')+'</div>').join(''):'<div class="empty-msg">No production rooms built yet.</div>';
 html+=button('openSurface','☀ SCAVENGE FOR SUPPLIES','','','primary');
 return html;
}
function securityMarkup(){
 const guards=s.people.filter(p=>p.weapon>0);
 const posts=s.rooms.filter(r=>r.type==='security');
 let html='<p class="panel-intro">Guards defend assigned positions automatically during alarms, including at night. Unarmed settlers retreat to safety. Assign a guard to a Security Post and equip their weapons and armor.</p>'+
 '<div class="mission-card"><small>VAULT ALERT STATUS</small><h3>'+(s.threat?'⚠ '+safe(s.threat.name):'PERIMETER SECURE')+'</h3>'+
 '<p>'+(s.threat?'Armed residents are responding to the alarm.':'No active attack. Maintain strong morale to prevent internal rebellion.')+'</p>'+
 (s.threat?button('defend','RESOLVE CURRENT ATTACK','','','primary'):'')+'</div>'+
 meter('Armed residents',guards.length)+meter('Security posts',posts.length)+
 meter('Dissenting residents',s.people.filter(p=>p.rebel).length)+
 '<div class="panel-section">GUARD ROSTER</div>';
 html+=guards.length?guards.map(p=>'<div class="build-card"><h3>⌖ '+safe(p.name)+'</h3>'+
 meter('Weapons',p.weapon+' · Armor '+p.armor)+
 meter('Current routine',D.routine(s,p).label)+
 button('person','MANAGE GUARD →',p.id,'','small')+'</div>').join(''):
 '<div class="empty-msg">No armed residents yet. You can equip weapons in the People panel.</div>';
 html+='<div class="panel-section">DEFENSE POSITIONS</div>'+
 (posts.length?posts.map(r=>'<div class="build-card"><h3>⌖ SECURITY POST</h3>'+meter('Assigned',r.workers.length+' guards')+button('inspectRoom','MANAGE POST →',r.id,'','small')+'</div>').join(''):
 '<div class="panel-help"><strong>No security posts built.</strong> Research Vault Defense and build one to assign permanent guard positions.</div>')+
 button('researchPanel','✣ OPEN SECURITY RESEARCH')+
 button('peoplePanel','♟ MANAGE EQUIPMENT & SHIFTS');
 return html;
}
function exploreMarkup(){
 const trip=s.task?.type==='scavenge'?s.task:null;
 let html='<p class="panel-intro">Visit real locations outside the hatch. Your Overseer travels outward, searches, and returns with supplies. Risk increases with distance.</p>'+
 button('openSurface',surfaceOpen?'VIEW CURRENT OVERWORLD →':'OPEN OVERWORLD MAP →','','','primary');
 if(trip){
  const site=D.SITES.find(x=>x.id===trip.meta);
  html+='<div class="mission-card"><small>EXPEDITION UNDERWAY</small><h3>'+safe(site?.name||'OUTSIDE')+'</h3><p>'+safe(trip.phase||'outbound').toUpperCase()+' · '+Math.round(D.clamp((s.elapsed-trip.start)/trip.duration,0,1)*100)+'% complete. Watch your Overseer move on the map.</p></div>';
 }
 if(s.lastExpedition){
  const x=s.lastExpedition;
  html+='<div class="nav-report"><strong>LAST EXPEDITION: '+safe(x.site)+'</strong><p>'+Object.entries(x.loot).filter(([,n])=>n>0).map(([k,n])=>'+'+n+' '+k).join(' · ')+(x.hazard?'<br>⚠ A hazard reduced the salvage.':'')+'</p></div>';
 }
 html+='<div class="panel-section">SURFACE DESTINATIONS</div>';
 for(const t of D.SITES){
  html+='<button class="room-small'+(selectedSite===t.id?' selected':'')+'" data-command="siteSelect" data-value="'+t.id+'">'+
  '⌖ '+safe(t.name.toUpperCase())+' <span class="staff-label">'+safe(t.distance)+' · '+Math.round(t.risk*100)+'% risk</span></button>';
 }
 return html;
}
function researchMarkup(){
 let html='<p class="panel-intro">Earn research by digging, scavenging and construction. Unlocking a design lets you physically build it; existing rooms and supports are not automatically upgraded.</p>'+
 meter('Available research',s.research+' points');
 for(const t of D.TECH){
  const owned=s.unlocked.includes(t.id),missing=t.req.some(req=>!s.unlocked.includes(req));
  html+='<div class="research-card"><span class="badge'+(missing?' warn':'')+'">'+(owned?'UNLOCKED':missing?'PREREQUISITE':'COST '+t.cost+' RESEARCH')+'</span><h3>✣ '+safe(t.name.toUpperCase())+'</h3>'+
  '<p>'+safe(t.desc)+'</p>'+
  (missing?'<p class="cost">REQUIRES '+t.req.map(x=>safe(D.TECH.find(z=>z.id===x)?.name||x)).join(', ')+'</p>':'')+
  '<button class="panel-button'+(owned?' selected':' primary')+'" data-command="research" data-value="'+t.id+'"'+(owned||missing||s.research<t.cost?' disabled':'')+'>'+
  (owned?'✓ RESEARCHED':'UNLOCK NEW DESIGN →')+'</button></div>';
 }
 return html;
}
function journalMarkup(){
 return '<p class="panel-intro">The event log records construction, expeditions, production, visitors, emergencies and new discoveries.</p>'+
 s.log.slice(0,32).map(e=>'<div class="metric-row"><span>'+safe(e.when)+'<br>'+safe(e.message)+'</span><b style="color:'+(e.type==='danger'?'#efac92':'#dbcca6')+'">'+e.type.toUpperCase()+'</b></div>').join('');
}

function residentCard(p){
 const job=p.job?s.rooms.find(r=>r.id===p.job):null;
 return '<div class="resident-card"><div class="resident-portrait">'+personMarkup(p,'')+'</div><div class="bio"><h3>'+safe(p.name)+'</h3>'+
 '<div class="bio-line">'+D.TRAITS[p.trait].label+' · '+(job?D.ROOMS[job.type].name:'UNASSIGNED')+' · '+p.shift.toUpperCase()+'</div><span class="routine-tag">'+safe(D.routine(s,p).label)+'</span>'+
 '<div class="microstats"><span>HP '+fmt(p.health)+'</span><span>MOOD '+fmt(p.mood)+'</span><span>LOYAL '+fmt(p.loyalty)+'</span></div>'+
 button('person','VIEW PROFILE →',p.id,'','small')+'</div></div>';
}
function rosterMarkup(){
 return '<p class="panel-intro">Residents move between their jobs, quarters and off-duty areas. Assign them to production rooms. Everyone has individual needs, skills and loyalty.</p>'+
 (s.people.length?s.people.map(residentCard).join(''):'<div class="empty-msg">Nobody lives here yet.<br>Build quarters, then wait for a visitor to knock at the hatch.</div>')+
 button('visitors','REVIEW THE ENTRANCE'+(s.visitors.length?' · '+s.visitors.length+' WAITING':''),'','','primary');
}
function personMarkupPanel(p){
 const job=p.job?s.rooms.find(r=>r.id===p.job):null;
 const options=s.rooms.filter(r=>!['quarters','storage'].includes(r.type)).map(r=>{
  const locked=r.workers.length>=(r.type==='security'?3:2)&&!r.workers.includes(p.id);
  return '<button class="room-small" data-command="assign" data-id="'+p.id+'" data-value="'+r.id+'" '+(locked?'disabled':'')+'>'+safe(D.ROOMS[r.type].name)+' ('+r.workers.length+'/'+(r.type==='security'?3:2)+')</button>';
 }).join('');
 return '<div class="resident-card"><div class="resident-portrait">'+personMarkup(p,'')+'</div><div class="bio"><h3>'+safe(p.name)+'</h3><div class="bio-line">Age '+p.age+' · '+D.TRAITS[p.trait].label+'<br>'+safe(p.background)+'</div><span class="badge">'+(p.sick?'SICK':p.rebel?'DISSENTING':'RESIDENT')+'</span></div></div>'+
 meter('Health',fmt(p.health)+'% ',p.health<40)+meter('Hunger',fmt(p.hunger)+'%',p.hunger<35)+meter('Hydration',fmt(p.thirst)+'%',p.thirst<35)+meter('Energy',fmt(p.energy)+'%',p.energy<25)+meter('Morale',fmt(p.mood)+'%')+meter('Loyalty',fmt(p.loyalty)+'%')+
 '<div class="panel-section">SKILLS</div><div class="microstats">'+Object.entries(p.skills).map(([k,v])=>'<span>'+k.toUpperCase()+' '+v+'</span>').join('')+'</div>'+
 '<div class="panel-section">DAILY ROUTINE</div>'+meter('Current activity',D.routine(s,p).label)+meter('Assigned to',job?D.ROOMS[job.type].name:'None')+
 '<div class="panel-section">ASSIGNMENTS & EQUIPMENT</div>'+
 button('shift','SHIFT: '+p.shift.toUpperCase()+' (CLICK TO CHANGE)',p.id)+
 button('equip','ISSUE WEAPON · 6 SCRAP'+(p.weapon?' · LEVEL '+p.weapon:''),p.id,'weapon')+
 button('equip','ISSUE BODY ARMOR · 5 SCRAP'+(p.armor?' · LEVEL '+p.armor:''),p.id,'armor')+
 (p.job?button('unassign','REMOVE FROM CURRENT JOB',p.id):'')+
 '<div class="panel-section">ASSIGN TO ROOM</div>'+
 (options?'<div class="room-list">'+options+'</div>':'<div class="empty-msg">Build a production room before assigning workers.</div>')+
 button('roster','← ALL RESIDENTS','','','small');
}
function roomMarkupPanel(r){
 const d=D.ROOMS[r.type];
 const choices=s.people.filter(p=>!r.workers.includes(p.id));
 let html='<p class="panel-intro">'+safe(d.desc)+'</p>'+
 meter('Room type',d.name)+meter('Staff assigned',r.workers.length+' / '+(r.type==='security'?3:r.type==='quarters'?4:2))+meter('Currently on duty',D.workersOnDuty(s,r).length)+
 meter('Depth',D.xy(r.cells[0])[1]*4+4+' m')+
 meter('Condition',r.health+'%');
 if(d.output){
  html+=meter('Production',r.ready?'READY TO COLLECT':Math.round(r.progress)+'%')+
  '<div class="room-timer"><i style="width:'+Math.round(r.progress)+'%"></i></div>'+
  (r.ready?button('collect','◈ COLLECT '+d.type.toUpperCase(),r.id,'','primary'):'<p class="panel-intro">Assign workers to speed production. Production pauses while an assigned day worker sleeps at night.</p>');
 }
 if(r.type==='quarters')html+=meter('Beds supplied',4+' permanent');
 if(r.workers.length)html+='<div class="panel-section">ON DUTY / ASSIGNED</div>'+r.workers.map(id=>{const p=D.person(s,id);return p?residentCard(p):'';}).join('');
 if(s.selectedPerson&&!['quarters','storage'].includes(r.type)){
  const p=D.person(s,s.selectedPerson);
  if(p)html+='<div class="mission-card"><small>SELECTED RESIDENT</small><h3>'+safe(p.name)+'</h3>'+button('assign','ASSIGN TO THIS ROOM',p.id,r.id,'primary')+'</div>';
 }
 if(!['quarters','storage'].includes(r.type)){
  html+='<div class="panel-section">AVAILABLE RESIDENTS</div>';
  html+=choices.length?choices.map(p=>button('assign','ASSIGN '+safe(p.name),p.id,r.id,'small')).join(''):'<p class="panel-intro">There are no available residents to assign.</p>';
 }
 html+=button('showBuild','← VIEW ROOM BLUEPRINTS','','','small');
 return html;
}
function sideContent(){
 if(panel==='tutorial')return ['YOUR FIRST STEPS',tutorialMarkup()];
 if(panel==='build')return ['ROOM CONSTRUCTION',buildMarkup()];
 if(panel==='support')return ['TUNNEL SUPPORTS',supportMarkup()];
 if(panel==='roster')return ['PEOPLE & JOBS',rosterMarkup()];
 if(panel==='person'){const p=D.person(s,panelId);return p?[p.name.toUpperCase(),personMarkupPanel(p)]:['RESIDENT MISSING',rosterMarkup()];}
 if(panel==='room'){const r=s.rooms.find(r=>r.id===panelId);return r?[D.ROOMS[r.type].name.toUpperCase(),roomMarkupPanel(r)]:['ROOM MISSING',buildMarkup()];}
 if(panel==='supplies')return ['STOCKPILE & PRODUCTION',suppliesMarkup()];
 if(panel==='security')return ['SECURITY & GUARDS',securityMarkup()];
 if(panel==='explore')return ['SURFACE EXPLORATION',exploreMarkup()];
 if(panel==='research')return ['RESEARCH TREE',researchMarkup()];
 if(panel==='journal')return ['VAULT EVENT LOG',journalMarkup()];
 if(panel==='demolish')return ['DEMOLITION','<p class="panel-intro">Remove a built room or structural support by clicking it. Some materials are recovered. The hatch cannot be demolished.</p>'+button('showBuild','BACK TO BUILDING')];
 if(panel==='inspect')return ['SECTOR SURVEY','<p class="panel-intro">Click a tunnel, room or resident to inspect. Research and supports matter at greater depth.</p>'];
 return ['VAULT DIRECTIVE',tutorialMarkup()];
}
function showPanel(){
 if(!s)return;
 const [title,content]=sideContent();
 $('sideTitle').textContent=title;
 $('sideEyebrow').textContent=panel==='person'?'RESIDENT PERSONNEL FILE':panel==='room'?'FACILITY OPERATIONS':'OVERSEER TERMINAL';
 const body=$('sideContent'),same=body.dataset.panel===panel;
 const scroll=same?body.scrollTop:0;
 if(lastSideContent!==content||lastSidePanel!==panel){body.innerHTML=content;lastSideContent=content;lastSidePanel=panel;}
 body.dataset.panel=panel;
 body.scrollTop=scroll;
 const active=panel==='person'?'roster':['support','room','demolish'].includes(panel)?'build':panel==='inspect'?'tutorial':panel;
 for(const b of document.querySelectorAll('.panel-tab'))b.classList.toggle('active',b.dataset.panel===active);
}
function setPanel(type,id){panel=type;panelId=id??null;showPanel();}

function renderAll(){
 if(!s)return;
 renderTerrain();renderRooms();renderPeople();renderVisitors();updateHud();renderCoach();renderSurface();showPanel();save();
 if(s.log[0]?.message&&s.log[0].message!==lastLog){
  const event=s.log[0];
  // Normal activities already give inline feedback. Avoid doubling every
  // action with a toast; surface travel stages remain in the event log.
  if(lastLog&&['danger','visitor'].includes(event.type))toast(event.message,event.type==='danger');
  lastLog=event.message;
 }
}
function openModal(type){
 if(!s)return;
 if(type==='scavenge'){setSurface(true);return;}
 if(type==='tech'){setPanel('research');return;}
 modalType=type;const host=$('modalContents');let html='<button class="modal-x" data-command="closeModal" aria-label="Close">×</button>';
 if(type==='scavenge'){
  html+='<span class="eyebrow">SURFACE OPERATIONS</span><h2>SCAVENGE THE WASTELAND</h2>'+
  '<p>Without a functioning vault, the surface is your only supply line. Each location is farther away and more dangerous. Your Overseer can search one site at a time.</p><div class="modal-columns">'+
  D.SITES.map(site=>'<div class="modal-item"><span class="badge'+(site.risk>.2?' warn':'')+'">'+(site.risk*100).toFixed(0)+'% ENCOUNTER RISK · '+site.distance+'</span><h3>⌖ '+safe(site.name.toUpperCase())+'</h3><p>'+safe(site.desc)+'</p>'+
  '<button class="panel-button primary" data-command="search" data-value="'+site.id+'" '+(s.task?'disabled':'')+'>SEARCH THIS LOCATION →</button></div>').join('')+'</div>';
 }else if(type==='visitors'){
  html+='<span class="eyebrow">ENROLLMENT & SECURITY</span><h2>WHO IS AT THE HATCH?</h2>'+
  '<p>Survivors arrive on their own. Review their background, compare skills and decide whether to give them shelter. Even a background check can be wrong.</p>'+
  (s.visitors.length?s.visitors.map(p=>'<div class="modal-item"><h3>♟ '+safe(p.name)+'</h3><p>'+safe(p.background)+', age '+p.age+'. '+D.TRAITS[p.trait].label+'. Health '+Math.round(p.health)+'%. Primary skills: '+Object.entries(p.skills).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k,v])=>k+' '+v).join(', ')+'.</p>'+
  (p.checks?'<p><strong>BACKGROUND REVIEW: '+(p.checked?'SUSPICIOUS RECORD':'CLEAR')+'.</strong> Results are not guaranteed.</p>':'')+
  '<div class="minirow">'+button('check','CHECK RECORDS · 2 SCRAP',p.id)+button('accept','ADMIT TO VAULT',p.id)+button('reject','TURN AWAY',p.id,'','danger')+'</div></div>').join(''):'<div class="empty-msg">No visitors are waiting. Survivors may approach the hatch with time.</div>')+
  '<p><small>Available beds: '+Math.max(0,D.capacity(s)-s.people.length)+' · Waiting outside: '+s.visitors.length+'</small></p>';
 }else if(type==='tech'){
  html+='<span class="eyebrow">EXPERIMENTAL TECHNOLOGIES</span><h2>SKILL TREE</h2>'+
  '<p>Research points: <strong>'+s.research+'</strong>. New discoveries unlock structures you still have to build using your materials. Existing buildings do not magically improve.</p><div class="modal-columns">'+
  D.TECH.map(t=>'<div class="modal-item'+(t.req.some(k=>!s.unlocked.includes(k))?' locked':'')+'"><span class="badge">'+(s.unlocked.includes(t.id)?'RESEARCHED':t.cost+' RESEARCH')+'</span>'+
  '<h3>✣ '+safe(t.name.toUpperCase())+'</h3><p>'+safe(t.desc)+'</p>'+
  (t.req.length?'<small>Requires: '+t.req.join(', ')+'</small>':'')+
  '<button class="panel-button primary" data-command="research" data-value="'+t.id+'" '+(s.unlocked.includes(t.id)||t.req.some(k=>!s.unlocked.includes(k))||s.research<t.cost?'disabled':'')+'>'+(s.unlocked.includes(t.id)?'✓ UNLOCKED':'RESEARCH →')+'</button></div>').join('')+'</div>';
 }else if(type==='journal'){
  html+='<span class="eyebrow">VAULT HISTORICAL RECORD</span><h2>INCIDENT JOURNAL</h2><p>Events reflect the actual simulation, not scripted mission results.</p>'+
  s.log.slice(0,32).map(e=>'<div class="metric-row"><span>'+safe(e.when)+'<br>'+safe(e.message)+'</span><b style="color:'+(e.type==='danger'?'#efac92':'#dbcca6')+'">'+e.type.toUpperCase()+'</b></div>').join('');
 }else if(type==='menu'){
  html+='<span class="eyebrow">OVERSEER PREFERENCES</span><h2>GAME SETTINGS</h2>'+
  '<p>Your game saves automatically to this browser. The new Vault Directive starts with a fresh, independent save; older prototypes are not loaded.</p>'+
  button('save','SAVE NOW','','','primary')+button('pause','PAUSE / RESUME SIMULATION')+
  button('confirmNewPrompt','START A NEW VAULT','','','danger');
 }else if(type==='confirmNew'){
  html+='<span class="eyebrow">CONFIRM RESTART</span><h2>ABANDON THIS VAULT?</h2>'+
  '<p>This will replace your current Vault Directive rebuild save in this browser. The existing run cannot be restored without an exported copy.</p>'+
  button('confirmNew','YES — START OVER','','','danger')+button('closeModal','CANCEL','','','primary');
 }else if(type==='emergency'){
  html+='<span class="eyebrow">ALERT LEVEL RED</span><h2>⚠ '+safe(s.threat?.name||'ALARM')+'</h2>'+
  '<p>Guards with assigned posts and armed settlers automatically form the first line of defense. Equipment and training determine how effectively they repel attackers.</p>'+
  button('defend','SOUND THE ALARM &amp; RESOLVE DEFENSE','','','primary');
 }else return;
 host.innerHTML=html;$('modal').classList.remove('hidden');
}
function closeModal(){$('modal').classList.add('hidden');modalType=null;}
function handleTile(i){
 if(!s)return;
 if(s.task){toast('Overseer is already working. Wait for the current action.',true);return;}
 if(s.tool==='dig')tell(D.start(s,'dig',i));
 else if(s.tool==='timber')tell(D.start(s,'support',i,s.supportType));
 else if(s.tool==='build')tell(D.start(s,s.buildType==='lift'?'lift':'room',i,s.buildType==='lift'?null:s.buildType));
 else if(s.tool==='demolish')tell(D.start(s,'remove',i));
 else{
  const cell=s.grid[i],r=D.roomAt(s,i);
  if(r){setPanel('room',r.id);return;}
  setPanel('inspect');
  $('sideContent').innerHTML='<p class="panel-intro"><b>LEVEL '+(D.xy(i)[1]+1)+' · BAY '+(D.xy(i)[0]+1)+'</b></p>'+
  meter('Structure',cell.kind.toUpperCase())+meter('Reinforcement',cell.support||'None')+
  meter('Depth',(D.xy(i)[1]+1)*4+' meters')+meter('Cave-in risk',Math.round(D.risk(s,i)*100)+'%')+
  '<p class="panel-intro">Build stronger physical supports before digging deeper. Install lifts to descend.</p>';
 }
}
function onCommand(node){
 if(!s)return;
 const command=node.dataset.command,id=Number(node.dataset.id),value=node.dataset.value;
 if(command==='closeModal'){closeModal();return;}
 if(command==='tutorial'){
  const target=D.TUTORIAL[Math.min(s.tutorial,7)][2];
  if(target==='surface')setSurface(true);
  else if(target==='visitors')openModal('visitors');
  else if(target==='roster')setPanel('roster');
  else selectTool(target==='timber'?'timber':target);
  return;
 }
 if(command==='scavenge'||command==='openSurface'){setSurface(true);return;}
 if(command==='siteSelect'){if(D.SITES.some(x=>x.id===value)){selectedSite=value;setSurface(true);renderSurface();}return;}
 if(command==='resourcesPanel'){setPanel('supplies');return;}
 if(command==='researchPanel'){setPanel('research');return;}
 if(command==='peoplePanel'){setPanel('roster');return;}
 if(command==='showSupport'){selectTool('timber');setPanel('support');return;}
 if(command==='activateBuild'){selectTool('build');setPanel('build');return;}
 if(command==='inspectRoom'){setPanel('room',id);return;}
 if(command==='search'){
  const r=D.start(s,'scavenge',null,value);
  if(r.ok){selectedSite=value;setSurface(true);}tell(r);return;
 }
 if(command==='visitors'){openModal('visitors');return;}
 if(command==='check'){tell(D.check(s,id));openModal('visitors');return;}
 if(command==='accept'){const r=D.accept(s,id);tell(r);if(r.ok){closeModal();s.selectedPerson=id;setPanel('person',id);}else openModal('visitors');return;}
 if(command==='reject'){tell(D.reject(s,id));openModal('visitors');return;}
 if(command==='showBuild'){selectTool('build');return;}
 if(command==='selectRoom'){
  const d=D.ROOMS[value];if(d?.unlock&&!s.unlocked.includes(d.unlock)){openModal('tech');return;}
  s.buildType=value;selectTool('build');toast(d.name+' selected. Click the left tile of two connected open bays.');return;
 }
 if(command==='selectSupport'){
  const d=D.SUPPORTS[value];if(d?.unlock&&!s.unlocked.includes(d.unlock)){openModal('tech');return;}
  s.supportType=value;selectTool('timber');toast(d.name+' selected. Click an open tunnel tile.');return;
 }
 if(command==='liftTool'){s.buildType='lift';selectTool('build');toast('Elevator selected. Click a connected excavated bay.');return;}
 if(command==='roster'){setPanel('roster');return;}
 if(command==='person'){
  const p=D.person(s,id);if(!p)return;
  s.selectedPerson=p.id;setPanel('person',p.id);toast(p.name+' selected. Choose a room to assign them.');return;
 }
 if(command==='assign'){const previous=panel,r=D.assign(s,id,Number(value));tell(r);if(r.ok){s.selectedPerson=id;if(previous!=='room')setPanel('person',id);}return;}
 if(command==='unassign'){tell(D.unassign(s,id));setPanel('person',id);return;}
 if(command==='shift'){tell(D.shift(s,id));setPanel('person',id);return;}
 if(command==='equip'){tell(D.equip(s,id,value));setPanel('person',id);return;}
 if(command==='collect'){tell(D.collect(s,id));return;}
 if(command==='tech'){setPanel('research');return;}
 if(command==='research'){tell(D.research(s,value));setPanel('research');return;}
 if(command==='journal'){setPanel('journal');return;}
 if(command==='skip'){s.skipTutorial=true;toast('Guided objectives hidden. Reopen them in the GUIDE panel.');renderAll();return;}
 if(command==='resumeGuide'){s.skipTutorial=false;renderAll();toast('Guided objectives restored.');return;}
 if(command==='save'){save();toast('Vault safely saved on this device.');closeModal();return;}
 if(command==='pause'){s.speed=s.speed?0:1;closeModal();renderAll();return;}
 if(command==='confirmNewPrompt'){openModal('confirmNew');return;}
 if(command==='confirmNew'){closeModal();$('welcome').classList.remove('hidden');$('continueRun').hidden=true;return;}
 if(command==='defend'){tell(D.resolveThreat(s));closeModal();return;}
}
function bind(){
 document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-panel]');
  if(nav&&s){setPanel(nav.dataset.panel);return;}
  const cmd=e.target.closest('[data-command]');
  if(cmd){e.preventDefault();e.stopPropagation();onCommand(cmd);return;}
  const t=e.target.closest('.sector[data-index]');
  if(t){handleTile(Number(t.dataset.index));return;}
  const r=e.target.closest('.room[data-room]');
  if(r){setPanel('room',Number(r.dataset.room));return;}
 });
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeModal();return;}
  if(e.target.tagName==='INPUT')return;
  if(e.key>='1'&&e.key<='5'&&s){
   const tool=['dig','timber','build','inspect','demolish'][Number(e.key)-1];
   selectTool(tool);
  }
 });
 document.querySelectorAll('.action[data-tool]').forEach(btn=>btn.addEventListener('click',()=>{if(s)selectTool(btn.dataset.tool);}));
 $('newRun').addEventListener('click',()=>start(D.create($('vaultName').value)));
 $('continueRun').addEventListener('click',()=>{const old=load();if(old)start(old);else start(D.create($('vaultName').value));});
 $('surfaceBtn').addEventListener('click',()=>setSurface(true));
 $('returnVaultBtn').addEventListener('click',()=>setSurface(false));
 $('guideBtn').addEventListener('click',()=>setPanel('tutorial'));
 $('coachAction').addEventListener('click',()=>{if(s)onCommand({dataset:{command:'tutorial'}});});
 $('coachHide').addEventListener('click',()=>{if(s){s.skipTutorial=true;renderAll();save();}});
 $('materialsBtn').addEventListener('click',()=>setPanel('supplies'));
 $('visitorsBtn').addEventListener('click',()=>openModal('visitors'));
 $('hatch').addEventListener('click',()=>openModal('visitors'));
 $('hatch').addEventListener('keydown',e=>{if(e.key==='Enter')openModal('visitors');});
 $('techBtn').addEventListener('click',()=>setPanel('research'));
 $('rosterBtn').addEventListener('click',()=>setPanel('roster'));
 $('journalBtn').addEventListener('click',()=>openModal('journal'));
 $('menuBtn').addEventListener('click',()=>openModal('menu'));
 $('pauseBtn').addEventListener('click',()=>{if(!s)return;s.speed=s.speed?0:1;$('pauseBtn').classList.toggle('active',!s.speed);$('pauseBtn').textContent=s.speed?'Ⅱ':'▶';save();toast(s.speed?'Simulation resumed.':'Simulation paused.');});
 $('speedBtn').addEventListener('click',()=>{if(!s)return;s.speed=s.speed===1?2:s.speed===2?3:1;$('speedBtn').textContent=s.speed+'×';toast('Simulation speed: '+s.speed+'×');});
 $('soundBtn').addEventListener('click',()=>{toast('Sound effects are not yet available; no audio is being played.');});
 $('centerBtn').addEventListener('click',centerVault);
 $('zoomIn').addEventListener('click',()=>setZoom(zoom+.15));
 $('zoomOut').addEventListener('click',()=>setZoom(zoom-.15));
 $('sideClose').addEventListener('click',()=>setPanel('tutorial'));
 $('modal').addEventListener('click',e=>{if(e.target===$('modal'))closeModal();});
}
function loop(now){
 const dt=Math.min(1.2,Math.max(0,(now-last)/1000));last=now;
 if(!s)return;
 try{
  const beforeTask=!!s.task,previousVisitors=s.visitors.length,previousPeople=s.people.length,previousRooms=s.rooms.length,previousThreat=!!s.threat;
  const oldTutorial=s.tutorial,oldLog=s.log[0]?.message,previousNight=D.night(s);
  D.simulate(s,dt);
  updateHud();
  updateSurfaceProgress();
  if(s.threat&&!previousThreat&&!alerted){alerted=true;toast('⚠ HOSTILE ALERT — RESIDENTS IN DANGER',true);}
  if(!s.threat)alerted=false;
  if(beforeTask!==!!s.task||previousVisitors!==s.visitors.length||previousPeople!==s.people.length||
    previousRooms!==s.rooms.length||previousThreat!==!!s.threat||oldTutorial!==s.tutorial||
    oldLog!==s.log[0]?.message||previousNight!==D.night(s)||now-lastPaint>1400){
   renderAll();lastPaint=now;
  }
  for(const r of s.rooms){
   const node=document.querySelector('.room[data-room="'+r.id+'"] .room-progress i');
   if(node)node.style.width=Math.round(r.progress)+'%';
  }
  if(now-lastSave>4000){save();lastSave=now;}
 }catch(err){
  console.error('[Vault Directive] simulation error',err);
  $('mapStatus').textContent='SIMULATION INTERRUPTED · UI STILL AVAILABLE';
  if(!s._lastUiError||now-s._lastUiError>10000){toast('A simulation error occurred. Please report the browser console message.',true);s._lastUiError=now;}
 }
}
bind();showIntro();
setZoom(1);
setInterval(()=>loop(performance.now()),180);
})();