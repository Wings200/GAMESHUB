import { TacticalWorld } from './world.mjs';
import { DURATIONS, newMatch, advanceClock, nearestSite, completePlant,
  cancelPlant, completeDefuse, eliminationResult, formatTime } from './rules.mjs';

const $ = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const canvas = $('world');
let world;
try { world = new TacticalWorld(canvas); }
catch(error) {
  console.error('BLACKOUT renderer could not start', error);
  $('toast').textContent = '3D rendering is unavailable. Try enabling WebGL in your browser.';
  $('toast').classList.add('show');
  throw error;
}

const state = {
  screen:'home', mode:'ai', side:'attack', operator:'specter', spawn:'west',
  tab:'profile', difficulty:'recruit', match:null, confirmed:false,
  keys:new Set(), pause:false, uiReady:false, lastTime:performance.now(),
  interaction:null, interactionProgress:0, lastKnown:null, ping:null,
  score:{attack:0,defense:0}, testTools:false, audio:null, toastUntil:0,
  lean:0, running:true, firedOnce:false
};

function toast(message, seconds=2.6) {
  $('toast').textContent=message;
  $('toast').classList.add('show');state.toastUntil=performance.now()+seconds*1000;
}
function showScreen(name) {
  state.screen=name;
  all('.screen').forEach(el=>el.classList.toggle('active',el.id===name));
  $('hud').classList.toggle('hidden',name!=='game');
  $('roundResult').classList.toggle('hidden',name!=='result');
  $('pause').classList.toggle('hidden',!state.pause);
  $('topbar').classList.toggle('hidden',name==='game'||name==='result');
  document.querySelector('.cinematic-grade').classList.toggle('in-game',name==='game');
  if(name!=='game'&&document.pointerLockElement)document.exitPointerLock();
}
function saveLoadout() {
  try { localStorage.setItem('blackout-p0-loadout-'+state.operator,JSON.stringify({sight:$('sight').value,barrel:$('barrel').value})); }
  catch(error) { console.warn('Local loadout saving disabled',error); }
}
function loadLoadout() {
  let config={sight:'holo',barrel:'standard'};
  try { const raw=localStorage.getItem('blackout-p0-loadout-'+state.operator); if(raw) config={...config,...JSON.parse(raw)}; }
  catch(error) { console.warn('Loadout read skipped',error); }
  $('sight').value=['holo','reflex','iron'].includes(config.sight)?config.sight:'holo';
  $('barrel').value=['standard','suppressor'].includes(config.barrel)?config.barrel:'standard';
}
function updateOperator() {
  const defender=state.operator==='warden';
  $('selectedName').textContent=defender?'WARDEN':'SPECTER';
  $('selectedDescription').textContent=defender
    ?'Defensive anchor. Heavy armor, reliable weapons, and a sealed tactical mask.'
    :'Recon specialist. Fast, lightly armored, and equipped for coordinated entry.';
  $('armorRating').textContent=defender?'● ● ●':'● ● ○';
  $('speedRating').textContent=defender?'● ● ○':'● ● ●';
  all('[data-operator]').forEach(btn=>{
    btn.classList.toggle('selected',btn.dataset.operator===state.operator);
    btn.disabled=btn.dataset.operator!==(state.side==='attack'?'specter':'warden');
  });
  $('heroName').textContent=defender?'WARDEN':'SPECTER';world.setHero(state.operator);loadLoadout();
}
function setTab(tab) {
  state.tab=tab;
  all('[data-tab]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.tab===tab));
  all('.tab-content').forEach(p=>p.classList.toggle('active',p.id===tab));
}
function openSetup(mode) {
  state.mode=mode;state.side='attack';state.operator='specter';state.spawn='west';
  $('setupTitle').innerHTML=mode==='testing'?'TESTING <em>SETUP</em>':'AI <em>ENCOUNTER</em>';
  all('[data-side]').forEach(btn=>btn.classList.toggle('selected',btn.dataset.side==='attack'));
  $('difficulty').disabled=mode==='testing';
  showScreen('setup');
}
function beginSelection() {
  state.difficulty=$('difficulty').value;
  state.operator=state.side==='attack'?'specter':'warden';
  state.match=newMatch(state.side,state.mode);
  state.confirmed=false;state.interaction=null;state.interactionProgress=0;
  state.lastKnown=null;state.ping=null;state.lean=0;
  $('selectionTime').textContent=state.mode==='testing'?'P0':formatTime(state.match.remaining);
  $('selectSide').textContent=state.side.toUpperCase()+' / ROUND 01';
  $('position').querySelector('.small-label').textContent=state.side==='attack'?'SELECT YOUR SPAWN':'ACTIVE DEFENDER SITE PAIR';
  $('position').querySelector('.choices').classList.toggle('hidden',state.side==='defense');
  $('selectStatus').textContent=state.mode==='testing'
    ?'CONFIRM TO ENTER FREE TRAINING — NO ROUND TIMER.'
    :'SELECTION AUTO-ADVANCES WHEN THE TIMER EXPIRES.';
  $('confirmSelect').innerHTML=state.mode==='testing'?'ENTER TRAINING <b>→</b>':'CONFIRM SELECTION <b>✓</b>';
  updateOperator();setTab('profile');showScreen('selection');
}
function confirmSelection() {
  state.confirmed=true;
  if(state.mode==='testing') {
    state.match.phase='action';state.match.remaining=Infinity;
    enterGame();return;
  }
  $('selectStatus').textContent='SELECTION CONFIRMED · AWAITING PHASE TRANSITION';
  toast('Operator locked. Preparation starts automatically.');
}
function enterGame() {
  world.start(state.side,state.spawn,state.operator);
  world.setLoadout($('sight').value,$('barrel').value);
  world.botAlive=state.mode!=='testing';world.enemy.visible=world.botAlive;
  if(state.match.phase==='preparation'&&state.side==='attack')world.setView('drone');
  else world.setView('player');
  state.keys.clear();state.interaction=null;state.interactionProgress=0;
  showScreen('game');
  if(state.match.phase==='preparation') {
    toast(state.side==='attack'?'Preparation: control your reconnaissance drone.':'Preparation: reinforce and defend both sites.',3.5);
  } else toast('Training: click the scene to capture your mouse. ESC to pause.',4);
}
function phaseChanged(before,after) {
  if(after==='preparation'&&before==='selection') {enterGame();return;}
  if(after==='action'&&before==='preparation') {
    world.setView('player');
    toast(state.side==='attack'?'ACTION PHASE · FIND AND PLANT THE DEFUSER':'ACTION PHASE · DEFEND BOTH BOMB SITES',3.4);
    signal(540,.11);
  }
  if(after==='postplant') {
    toast('DEFUSER PLANTED · 45 SECONDS REMAIN');signal(820,.22);
  }
  if(after==='result') endRound();
}
function endRound() {
  if(state.screen==='result')return;
  state.keys.clear();state.interaction=null;
  if(state.match.winner)state.score[state.match.winner]++;
  const won=state.match.winner===state.side;
  $('resultHeading').textContent=won?'ROUND WON':'ROUND LOST';
  $('resultHeading').style.color=won?'#e7f8ff':'#ffaab4';
  $('resultWhy').textContent=state.match.reason;
  $('resultScore').textContent=state.score.attack+' — '+state.score.defense;
  showScreen('result');signal(won?740:220,.32);
}
function updatePhase(dt) {
  const match=state.match;if(!match||match.phase==='result')return;
  if(state.mode==='testing'&&match.phase==='action')return;
  const was=match.phase;
  const before=match.remaining;
  const planting=state.interaction==='plant'&&state.interactionProgress>0;
  state.match=advanceClock(match,dt,planting);
  if(was==='selection')$('selectionTime').textContent=formatTime(state.match.remaining);
  if(was!==state.match.phase)phaseChanged(was,state.match.phase);
  else if(before>0&&state.match.remaining===0&&state.match.overtimePlant)toast('OVERTIME PLANT · DO NOT RELEASE F',1.8);
}
function finishInteraction() {
  const kind=state.interaction;
  state.interaction=null;state.interactionProgress=0;
  if(kind==='reinforce') {
    if(world.reinforced<10&&world.reinforceClosest()){toast('Wall reinforced · '+(10-world.reinforced)+' team reinforcements left.');signal(440,.16);}
    return;
  }
  if(kind==='plant') {
    const player=world.getPosition();const site=nearestSite(player.x,player.z);
    if(!site)return;
    const before=state.match.phase;state.match=completePlant(state.match,site.id);
    world.placeDefuser(site.id);phaseChanged(before,state.match.phase);
  }
  if(kind==='defuse') {
    state.match=completeDefuse(state.match);endRound();
  }
}
function availableInteraction() {
  const m=state.match;if(!m||world.player.health<=0||world.view!=='player')return null;
  if(m.phase==='preparation'&&state.side==='defense'&&world.reinforced<10&&world.nearWall())return {kind:'reinforce',duration:DURATIONS.reinforce,label:'HOLD F TO REINFORCE',hint:'TEAM POOL '+(10-world.reinforced)+'/10'};
  const player=world.getPosition();
  if(m.phase==='action'&&state.side==='attack'&&nearestSite(player.x,player.z))return {kind:'plant',duration:DURATIONS.plant,label:'HOLD F TO PLANT DEFUSER',hint:'7 SECONDS · STAY IN THE BOMB SITE'};
  if(m.phase==='postplant'&&state.side==='defense'&&world.defuser.visible&&Math.hypot(player.x-world.defuser.position.x,player.z-world.defuser.position.z)<2.2)return {kind:'defuse',duration:DURATIONS.defuse,label:'HOLD F TO DISABLE',hint:'7 SECONDS · DO NOT RELEASE'};
  return null;
}
function updateInteraction(dt) {
  const available=availableInteraction();
  if(available){
    $('interact').classList.remove('hidden');
    $('interactTitle').textContent=available.label;
    $('interactHint').textContent=available.hint;
    if(state.keys.has('f')) {
      if(state.interaction!==available.kind){state.interaction=available.kind;state.interactionProgress=0;signal(490,.07);}
      state.interactionProgress+=dt;
      if(state.interactionProgress>=available.duration){finishInteraction();return;}
    } else if(state.interaction){
      state.interaction=null;state.interactionProgress=0;
      if(state.match.overtimePlant){state.match=cancelPlant(state.match);endRound();}
    }
    $('interactFill').style.width=(state.interaction?Math.min(100,state.interactionProgress/available.duration*100):0)+'%';
  } else {
    $('interact').classList.add('hidden');
    if(state.interaction){
      state.interaction=null;state.interactionProgress=0;
      if(state.match.overtimePlant){state.match=cancelPlant(state.match);endRound();}
    }
  }
}
function updateHud() {
  const m=state.match;if(!m)return;
  $('hudSide').textContent=m.side==='attack'?'ATTACK':'DEFENSE';
  $('hudPhase').textContent=m.phase==='preparation'?'PREPARATION':m.phase==='postplant'?'DEFUSER ACTIVE':m.phase==='action'?'ACTION':'SELECTION';
  $('hudTime').textContent=state.mode==='testing'?'∞':formatTime(m.remaining);
  $('score').textContent=state.score.attack+' — '+state.score.defense;
  $('health').textContent=world.player.health;
  $('bullets').textContent=world.player.ammo;$('reserve').textContent=world.player.reserve;
  $('droneBanner').classList.toggle('hidden',world.view!=='drone');
  $('crosshair').classList.toggle('hidden',world.view==='drone'||world.ads);
  $('compass').textContent=heading(world.view==='drone'?world.drone.yaw:world.player.yaw);
  if(m.phase==='preparation')$('missionText').textContent=m.side==='attack'?'LOCATE THE BOMBS / SCOUT DEFENDERS':'FORTIFY THE ACTIVE SITES';
  else if(m.phase==='postplant')$('missionText').textContent=m.side==='attack'?'PROTECT THE DEFUSER':'RETAKE THE SITE / DISABLE';
  else $('missionText').textContent=m.side==='attack'?'PLANT AT SITE A OR SITE B':'PREVENT THE PLANT';
  $('controlsText').textContent=world.view==='drone'?'WASD DRIVE · SPACE JUMP · E SCAN · MMB PING':'WASD MOVE · Q/E LEAN · C CROUCH · SHIFT SPRINT · RMB ADS · LMB FIRE · R RELOAD';
  drawRadar();
}
function heading(yaw) {
  const deg=(((-yaw*180/Math.PI)%360)+360)%360;
  const dirs=['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round(deg/45)%8]+' / '+String(Math.round(deg)).padStart(3,'0')+'°';
}
function drawRadar() {
  const radar=$('radar'),ctx=radar.getContext('2d'),size=180;
  ctx.clearRect(0,0,size,size);ctx.fillStyle='#0b1d2acc';ctx.fillRect(0,0,size,size);
  const toX=x=>(x+17)/34*size,toY=z=>(z+14)/28*size;
  const data=world.getRadar();ctx.strokeStyle='#62879d';ctx.lineWidth=2;
  for(const wall of data.walls){ctx.strokeRect(toX(wall.x-wall.w/2),toY(wall.z-wall.d/2),wall.w/34*size,wall.d/28*size)}
  for(const site of [{x:-8,z:-6,id:'A'},{x:8,z:-6,id:'B'}]){
    ctx.strokeStyle='#53b8ef';ctx.beginPath();ctx.arc(toX(site.x),toY(site.z),19,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#b9e9ff';ctx.font='bold 12px Inter';ctx.fillText(site.id,toX(site.x)-4,toY(site.z)-8);
  }
  if(state.lastKnown&&state.lastKnown.until>performance.now()){
    ctx.fillStyle='#fb6972';ctx.fillRect(toX(state.lastKnown.x)-4,toY(state.lastKnown.z)-4,8,8);
  }
  if(state.ping&&state.ping.until>performance.now()){
    ctx.fillStyle='#ffd06a';ctx.beginPath();ctx.arc(toX(state.ping.x),toY(state.ping.z),4,0,Math.PI*2);ctx.fill();
  }
  const p=data.player;ctx.fillStyle='#f7f9ff';ctx.beginPath();ctx.arc(toX(p.x),toY(p.z),5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(toX(p.x),toY(p.z));ctx.lineTo(toX(p.x)-Math.sin(p.yaw)*15,toY(p.z)-Math.cos(p.yaw)*15);ctx.stroke();
}
function signal(frequency=540,length=.14) {
  try {
    if(!state.audio)state.audio=new (window.AudioContext||window.webkitAudioContext)();
    if(state.audio.state==='suspended')state.audio.resume();
    const o=state.audio.createOscillator(),g=state.audio.createGain();
    o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(.04,state.audio.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,state.audio.currentTime+length);
    o.connect(g).connect(state.audio.destination);o.start();o.stop(state.audio.currentTime+length);
  }catch(error){ /* Audio is optional; never block the game. */ }
}
function onWorldClick(event) {
  if(state.screen!=='game'||state.pause)return;
  if(document.pointerLockElement!==canvas){canvas.requestPointerLock?.();toast('Mouse captured · ESC to release / pause');return;}
  if(event.button===0&&['action','postplant'].includes(state.match.phase)) {
    const shot=world.shoot();
    if(shot.fired){signal(world.barrel==='suppressor'?170:100,.07);if(shot.hitBot)toast('TARGET HIT',.5);if(shot.enemyDead){state.match=eliminationResult(state.match,state.side==='attack'?'defense':'attack');endRound();}}
    else if(world.player.ammo===0)toast('MAGAZINE EMPTY · PRESS R');
  }
}
canvas.addEventListener('pointerdown',event=>{
  if(event.button===2)world.ads=true;
  if(event.button===1&&state.screen==='game'&&world.view==='drone'){
    event.preventDefault();const d=world.drone;state.ping={x:d.x-Math.sin(d.yaw)*6,z:d.z-Math.cos(d.yaw)*6,until:performance.now()+8000};toast('YELLOW LOCATION PING');signal(600,.06);
  }
  if(event.button===0)onWorldClick(event);
});
window.addEventListener('pointerup',event=>{if(event.button===2)world.ads=false;});
window.addEventListener('contextmenu',event=>event.preventDefault());
window.addEventListener('mousemove',event=>{
  if(state.screen==='game'&&!state.pause&&document.pointerLockElement===canvas)world.look(event.movementX,event.movementY);
});
window.addEventListener('keydown',event=>{
  const k=event.key.toLowerCase();
  if(k==='escape'){
    if(state.screen==='game'){state.pause=!state.pause;showScreen('game');if(state.pause&&document.pointerLockElement)document.exitPointerLock();}
    else if(['play','setup','selection','info'].includes(state.screen))showScreen('home');
    return;
  }
  if(state.screen!=='game'||state.pause)return;
  if([' ','tab'].includes(k))event.preventDefault();
  state.keys.add(k===' '?'space':k);
  if(event.repeat)return;
  if(k==='r'&&world.reload())toast('RELOADING...');
  if(k==='q'){state.lean=state.lean===-1?0:-1;}
  if(k==='e'){
    if(world.view==='drone'){
      if(world.enemyInSight()){
        state.lastKnown={x:world.enemy.position.x,z:world.enemy.position.z,until:performance.now()+8000};
        toast('ENEMY SCANNED · LAST KNOWN POSITION');signal(780,.1);
      }else toast('NO TARGET IN SIGHT',.7);
    } else state.lean=state.lean===1?0:1;
  }
  if(k===' '&&world.view==='drone'&&world.drone.jump<=0)world.drone.jump=.63;
});
window.addEventListener('keyup',event=>state.keys.delete(event.key.toLowerCase()===' '?'space':event.key.toLowerCase()));
window.addEventListener('blur',()=>{state.keys.clear();world.ads=false;});

all('[data-open]').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.open)));
all('[data-close]').forEach(btn=>btn.addEventListener('click',()=>showScreen('home')));
all('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>openSetup(btn.dataset.mode)));
all('[data-side]').forEach(btn=>btn.addEventListener('click',()=>{
  state.side=btn.dataset.side;all('[data-side]').forEach(b=>b.classList.toggle('selected',b===btn));
}));
$('beginSelection').addEventListener('click',beginSelection);
all('[data-operator]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.disabled)return;state.operator=btn.dataset.operator;updateOperator();}));
all('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.tab)));
all('[data-spawn]').forEach(btn=>btn.addEventListener('click',()=>{state.spawn=btn.dataset.spawn;all('[data-spawn]').forEach(b=>b.classList.toggle('selected',b===btn));}));
for(const id of ['sight','barrel'])$(id).addEventListener('change',saveLoadout);
$('confirmSelect').addEventListener('click',confirmSelection);
$('retry').addEventListener('click',()=>{state.score={attack:0,defense:0};beginSelection();});
$('backHome').addEventListener('click',()=>showScreen('home'));
$('resume').addEventListener('click',()=>{state.pause=false;showScreen('game');toast('Click the 3D view to capture your mouse.');});
$('quit').addEventListener('click',()=>{state.pause=false;showScreen('home');});
$('toggleDev').addEventListener('click',()=>{state.testTools=!state.testTools;$('devActions').classList.toggle('hidden',!state.testTools);});
$('skipPhase').addEventListener('click',()=>{
  if(!state.match)return;
  if(state.screen==='selection'&&state.mode==='testing'){confirmSelection();return;}
  const was=state.match.phase;
  if(['selection','preparation'].includes(was)){
    state.match.remaining=.01;
    toast('DEV: advancing '+was+' phase');
  } else if(was==='action') {
    world.player.x=-8;world.player.z=-6;
    toast('DEV: moved to Site A. Hold F to plant.');
  } else if(was==='postplant')state.match.remaining=8;
});
$('resetSession').addEventListener('click',()=>{state.match=null;state.score={attack:0,defense:0};state.pause=false;showScreen('home');toast('Test session reset.');});

const infoPages={
  settings:'<h3>DISPLAY & CONTROLS</h3><p>BLACKOUT P0 automatically limits rendering resolution for Chromebook performance. Mouse look: pointer lock. Press ESC to pause.</p><ul><li>WASD / Shift — Move / Sprint</li><li>Mouse / Left Click — Look / Shoot</li><li>Right Mouse — Aim down sights</li><li>Q / E — Toggle lean (prototype)</li><li>C / R — Crouch / Reload</li><li>F (hold) — Plant, defuse or reinforce</li><li>Drone: WASD, Space jump, E scan, Middle Click ping</li></ul>',
  faq:'<h3>WHAT IS THIS BUILD?</h3><p>A small, connected first-playable prototype of BLACKOUT 2.0. It includes the menu, operator and loadout selection, preparation, basic drone scouting, first-person weapons, an AI opponent, two sites, plant/defuse and round results.</p><h3>IS THIS REAL 5V5?</h3><p>No. P0 runs locally against one simple bot. Cooperative AI, ten-player servers, shared cameras and advanced gadgets are future milestones, not simulated features.</p>',
  credits:'<h3>PROJECT BLACKOUT</h3><p>Created collaboratively for GAMESHUB. Gameplay direction, tactical requirements and art direction by DynamiteDEV7392. Prototype engineering and interaction design with ChatGPT.</p><p>Original geometric operator models, prototype map and interface. No Rainbow Six Siege artwork or character assets are used.</p>',
  fixes:'<h3>P0 BUILD NOTES</h3><p>Initial clean-slate vertical slice. BLACKOUT 1.0 remains preserved at its existing route.</p><ul><li>One integrated round state machine for timers, plant and defuse.</li><li>7-second interaction timing; 45-second post-plant.</li><li>Last-second plant overtime rules.</li><li>Physical operator mesh shared with the home-screen preview.</li><li>Explicitly disabled online/custom modes until implemented.</li></ul><p>Known P0 limits: local-only simulation, one basic bot, no multiplayer synchronization, placeholder models and map materials, no full gadget set or co-op team AI.</p>'
};
all('[data-info]').forEach(btn=>btn.addEventListener('click',()=>{
  const key=btn.dataset.info;$('infoTitle').textContent=key==='fixes'?'BUG FIXES':key.toUpperCase();$('infoContent').innerHTML=infoPages[key];showScreen('info');
}));

function frame(now) {
  const dt=Math.min(.05,Math.max(0,(now-state.lastTime)/1000));state.lastTime=now;
  if(state.toastUntil&&now>state.toastUntil){$('toast').classList.remove('show');state.toastUntil=0;}
  if(state.screen==='home') {
    const featured=Math.floor(now/17000)%2?'warden':'specter';
    if(world.hero.userData.role!==featured){world.setHero(featured);$('heroName').textContent=featured.toUpperCase();}
  }
  if(state.screen==='selection'&&!state.pause&&state.match&&state.mode==='ai')updatePhase(dt);
  if(state.screen==='game'&&!state.pause&&state.match){
    const input={w:state.keys.has('w'),s:state.keys.has('s'),a:state.keys.has('a'),d:state.keys.has('d'),c:state.keys.has('c'),shift:state.keys.has('shift'),leanLeft:state.lean===-1,leanRight:state.lean===1};
    const events=world.update(dt,input,state.match.phase,state.difficulty);
    if(events.playerHit){$('damageFlash').classList.add('active');setTimeout(()=>$('damageFlash').classList.remove('active'),130);signal(120,.08);}
    if(events.botPlanted&&state.match.phase==='action'){
      const previous=state.match.phase;state.match={...state.match,phase:'postplant',remaining:DURATIONS.postplant,planted:true,plantedSite:events.botPlanted};
      world.placeDefuser(events.botPlanted);phaseChanged(previous,state.match.phase);
    }
    if(events.botDefused&&state.match.phase==='postplant'){
      state.match={...state.match,phase:'result',winner:'defense',reason:'DEFUSER DISABLED'};
      endRound();
    }
    if(events.playerDead){
      if(state.match.phase==='postplant'&&state.side==='attack') {
        toast('YOU ARE ELIMINATED · DEFUSER REMAINS ACTIVE');world.setView('spectator');
      } else {state.match=eliminationResult(state.match,state.side);endRound();}
    }
    if(state.screen==='game')updateInteraction(dt);
    if(state.screen==='game')updatePhase(dt);
    if(state.screen==='game')updateHud();
  }
  world.render(state.screen==='game',now);
  requestAnimationFrame(frame);
}
updateOperator();
try {
  const pictures=world.captureModeArtwork();
  all('.mode-card').forEach((card,index)=>{
    if(pictures[index])card.style.backgroundImage='linear-gradient(90deg,rgba(7,18,29,.96) 0%,rgba(8,22,35,.83) 53%,rgba(9,24,39,.3) 100%),url("'+pictures[index]+'")';
    card.style.backgroundSize='cover';card.style.backgroundPosition='center';
  });
}catch(error){console.warn('Mode-card scene captures unavailable; using gradient fallback',error);}
requestAnimationFrame(frame);
