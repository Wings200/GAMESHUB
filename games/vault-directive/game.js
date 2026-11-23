(() => {
  'use strict';

  // Foundation build: original single-player shelter survival loop.
  // All progress remains local to this browser. No account or server writes.
  const COLS = 52, ROWS = 19, TILE = 54;
  const T = TILE;
  const SAVE_KEY = 'gameshub.vault-directive.foundation.v1';
  const ROOM_TYPES = {
    generator: { name: 'Field generator', cost: { scrap: 9, parts: 2 }, power: 7, use: 0, color: '#d5ac63', glyph: 'ϟ' },
    bunks: { name: 'Sleeping quarters', cost: { scrap: 7, parts: 0 }, power: 0, use: 0, color: '#9ab0a0', glyph: '▥' },
    water: { name: 'Water treatment', cost: { scrap: 8, parts: 1 }, power: 0, use: 2, color: '#8acbd8', glyph: '◈' },
    garden: { name: 'Hydroponics', cost: { scrap: 8, parts: 1 }, power: 0, use: 2, color: '#8ac69b', glyph: '❈' },
    medbay: { name: 'Medical bay', cost: { scrap: 10, parts: 2 }, power: 0, use: 2, color: '#91c8b3', glyph: '✚' },
    radio: { name: 'Radio beacon', cost: { scrap: 12, parts: 2 }, power: 0, use: 2, color: '#b5a4d1', glyph: '⌁' },
    security: { name: 'Security post', cost: { scrap: 10, parts: 2 }, power: 0, use: 2, color: '#ccaa86', glyph: '◇' }
  };
  const SURVIVORS = [
    { id: 1, name: 'Mara Voss', role: 'Mechanic', strength: 7, skin: '#b68b6c', hair: '#312720', coat: '#779c8e', x: 8.2, y: 7, energy: 87, hunger: 88, thirst: 89, health: 100, morale: 74 },
    { id: 2, name: 'Eli Mercer', role: 'Surveyor', strength: 5, skin: '#e1b58b', hair: '#4b382e', coat: '#aa8971', x: 10, y: 7, energy: 85, hunger: 82, thirst: 91, health: 100, morale: 70 },
    { id: 3, name: 'Iris Chen', role: 'Medic', strength: 3, skin: '#c89c80', hair: '#222c30', coat: '#7c8eaa', x: 11.6, y: 7, energy: 86, hunger: 86, thirst: 86, health: 100, morale: 76 }
  ];
  const SITES = [
    { id: 'clinic', name: 'Abandoned clinic', icon: '✚', subtitle: 'Medicine, water and medical supplies', threat: 'LOW · UNSTABLE INTERIOR',
      rooms: [
        { name: 'Reception', icon: '▣', kind: 'Search', loot: { food: 2, water: 1, scrap: 1 }, danger: 0 },
        { name: 'Pharmacy', icon: '✚', kind: 'Search', loot: { food: 1, water: 3, meds: 2, parts: 1 }, danger: 0 },
        { name: 'Treatment', icon: '◇', kind: 'Search', loot: { water: 2, scrap: 3 }, danger: 6, hazard: 'infection' },
        { name: 'Backup plant', icon: 'ϟ', kind: 'Salvage', loot: { scrap: 6, parts: 2 }, danger: 0 }
      ] },
    { id: 'station', name: 'Roadside station', icon: '⌁', subtitle: 'Rations and usable hardware', threat: 'LOW · EXPOSED STRUCTURE',
      rooms: [
        { name: 'Shop front', icon: '▤', kind: 'Search', loot: { food: 4, water: 1 }, danger: 0 },
        { name: 'Stockroom', icon: '◫', kind: 'Search', loot: { food: 3, water: 2, scrap: 1 }, danger: 0 },
        { name: 'Garage', icon: '⚙', kind: 'Salvage', loot: { scrap: 6, parts: 1, fuel: 3 }, danger: 4, enemy: 'raiders' },
        { name: 'Workshop', icon: '⚒', kind: 'Salvage', loot: { scrap: 5, parts: 2 }, danger: 0 }
      ] },
    { id: 'depot', name: 'Freight depot', icon: '▥', subtitle: 'Metal and industrial components', threat: 'ELEVATED · FALLING DEBRIS',
      rooms: [
        { name: 'Gatehouse', icon: '⌑', kind: 'Search', loot: { water: 2, food: 1 }, danger: 0 },
        { name: 'Warehouse', icon: '▥', kind: 'Salvage', loot: { scrap: 8 }, danger: 7, enemy: 'raiders' },
        { name: 'Maintenance', icon: '⚙', kind: 'Salvage', loot: { scrap: 6, parts: 3, fuel: 2 }, danger: 0 },
        { name: 'Loading bay', icon: '◈', kind: 'Salvage', loot: { scrap: 7, parts: 1 }, danger: 9 }
      ] },
    { id: 'relay', name: 'Broken relay station', icon: '⌁', subtitle: 'Rescue a stranded survivor and recover communications gear', threat: 'ELEVATED · HOSTILE PRESENCE',
      rooms: [
        { name: 'Receiving hall', icon: '▣', kind: 'Search', loot: { food: 2, water: 1 }, danger: 0 },
        { name: 'Security desk', icon: '◇', kind: 'Search', loot: { scrap: 3, parts: 1 }, danger: 7, enemy: 'raiders' },
        { name: 'Control room', icon: '⌁', kind: 'Salvage', loot: { parts: 3, fuel: 2, scrap: 3 }, danger: 0 },
        { name: 'Locked shelter', icon: '♡', kind: 'Rescue', loot: { meds: 1 }, danger: 0, rescue:true }
      ] }
  ];

  const $ = id => document.getElementById(id);
  const canvas = $('world'), ctx = canvas && canvas.getContext('2d');
  if (!ctx) return;
  const worldWrap = $('worldWrap');
  let state, tool = 'inspect', buildType = null, selection = null;
  let chosenWorkers = new Set(), chosenCrew = new Set(), viewedSite = 'clinic';
  let drag = null, pointer = null, hoverCell = null, toastTimer = 0;
  let last = performance.now(), panelTime = 0, saveTime = 0, expeditionRepaintKey = '';
  let screenWidth = 900, screenHeight = 550;
  let camera = { x: 0, y: 0, zoom: 1.0 }, cameraInitialized = false;

  const bound = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const key = (x,y) => x + ',' + y;
  const valid = (x,y) => x >= 0 && x < COLS && y >= 0 && y < ROWS;
  const isProtected = (x,y) => x === 8 && y >= 3 && y <= 7 || y === 7 && x >= 7 && x <= 12;
  const hash = (x,y) => {
    let n = (Math.imul(x + 31, 1376312589) ^ Math.imul(y + 91, 817783)) | 0;
    n = Math.imul(n ^ n >>> 13, 1274126177);
    return ((n ^ n >>> 16) >>> 0) / 4294967295;
  };
  const fmt = n => Math.max(0, Math.floor(n));
  function timeString() {
    const mins = Math.floor(state.minutes % 1440);
    return 'DAY ' + String(Math.floor(state.minutes / 1440) + 1).padStart(2,'0') + ' · ' +
      String(Math.floor(mins / 60)).padStart(2,'0') + ':' + String(mins % 60).padStart(2,'0');
  }
  function makeNewGame() {
    const terrain = Array.from({length:ROWS},(_,y)=>Array.from({length:COLS},()=>y < 3 ? 0 : 1));
    for (let y = 3; y <= 7; y++) terrain[y][8] = 0;
    for (let x = 7; x <= 12; x++) terrain[7][x] = 0;
    return {
      version: 2, minutes: 480, speed: 1, paused: false, nextId: 1,
      terrain, digProgress: {}, rooms: [], projects: [],
      survivors: SURVIVORS.map(r=>({...r, taskId: null, state: 'idle', path: [], wait: 0})),
      resources: { food: 12, water: 14, scrap: 19, parts: 4 },
      tutorialEnabled: true, tutorialFlags: { inspect: false, dig: false, assign: false, build: false, scavenge: false },
      introSeen: false, productionTime: 0, expedition: null,
      sites: SITES.map(site=>({ id:site.id, rooms:site.rooms.map(()=>({searched:false})) })),
      logs: [{time:'DAY 01 · 08:00', text:'Three survivors reached the abandoned hatch. Shelter systems offline.', warning:false}]
    };
  }
  function loadGame() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const value = JSON.parse(raw);
        if ((value.version === 1 || value.version === 2) && Array.isArray(value.terrain) && value.terrain.length === ROWS &&
            Array.isArray(value.survivors) && value.survivors.length >= 1 &&
            value.resources && Array.isArray(value.sites)) {
          for (const r of value.survivors) { r.path = []; r.wait = 0; }
          return value;
        }
      }
    } catch (err) { console.warn('Local save unavailable', err); }
    return makeNewGame();
  }
  function saveGame(silent=true) {
    try {
      localStorage.setItem(SAVE_KEY,JSON.stringify(state));
      $('saveState').textContent='SAVED ON DEVICE';
      if (!silent) toast('Settlement saved on this device.');
    } catch (err) {
      $('saveState').textContent='SAVE UNAVAILABLE';
      if (!silent) toast('Browser storage unavailable. Your current session still works.');
    }
  }
  function report(text, warning=false) {
    state.logs.unshift({time:timeString(),text,warning});
    state.logs = state.logs.slice(0,18);
    $('statusText').textContent = text;
    drawLog();
  }
  function toast(text) {
    const t=$('toast'); t.textContent=text;t.classList.remove('hidden');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),3600);
  }
  function flag(k) { if (state.tutorialFlags && !state.tutorialFlags[k]) {state.tutorialFlags[k]=true;renderTutorial();} }
  function powerData() {
    const data=window.VDSystems.power(state);
    return {...data,online: data.generation>=data.demand,onlineRooms:data.online};
  }
  function roomActive(room) {
    return window.VDSystems.active(state,room);
  }
  function cellFree(x,y) {return valid(x,y) && state.terrain[y][x] === 0;}
  function walkable(x,y) {
    return cellFree(x,y) && (!isSurface(x,y));
  }
  function isSurface(x,y){return y < 3;}
  function movementAllowed(a,b) {
    if (!cellFree(b.x,b.y)) return false;
    if (state.doors.some(d=>d.closed && d.hp>0 && (d.x===b.x&&d.y===b.y || d.x===a.x&&d.y===a.y))) return false;
    if (a.y === b.y) return true;
    const verticalLadder = v => state.ladders.some(l=>l.x===v.x && l.y===v.y) ||
      (v.x===8 && v.y>=3 && v.y<=7);
    if(verticalLadder(a) && verticalLadder(b)) return true;
    // Residents cannot float up raw vertical excavations. The original entrance has a ladder.
    // More player-built vertical transport arrives in a later systems milestone.
    return a.x === 8 && b.x === 8 && a.y >= 3 && a.y <= 7 && b.y >= 3 && b.y <= 7;
  }
  function bfs(from, to) {
    const sx = Math.round(from.x), sy = Math.round(from.y);
    if (!valid(sx,sy) || !cellFree(sx,sy) || !cellFree(to.x,to.y)) return null;
    const q=[{x:sx,y:sy}], seen=new Set([key(sx,sy)]), parent={};
    for(let i=0;i<q.length;i++){
      const c=q[i];if(c.x===to.x&&c.y===to.y){
        const p=[];let k=key(c.x,c.y);
        while(k!==key(sx,sy)){const [x,y]=k.split(',').map(Number);p.unshift({x,y});k=parent[k];}
        return p;
      }
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const n={x:c.x+dx,y:c.y+dy}, nk=key(n.x,n.y);
        if(!seen.has(nk)&&movementAllowed(c,n)){seen.add(nk);parent[nk]=key(c.x,c.y);q.push(n);}
      }
    }
    return null;
  }
  function reachableFromEntrance() {
    const q=[{x:8,y:7}], set=new Set(['8,7']);
    for(let i=0;i<q.length;i++){
      const c=q[i];
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const n={x:c.x+dx,y:c.y+dy},nk=key(n.x,n.y);
        if(!set.has(nk)&&movementAllowed(c,n)){set.add(nk);q.push(n);}
      }
    }
    return set;
  }
  function neighbours(x,y) { return [{x:x-1,y},{x:x+1,y},{x,y:y-1},{x,y:y+1}].filter(p=>valid(p.x,p.y)); }
  function projectFor(id){return state.projects.find(p=>p.id===id && p.status!=='done' && p.status!=='cancelled');}
  function roomAt(x,y){return state.rooms.find(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+2);}
  function jobAt(x,y){return state.projects.find(p=>p.status!=='done'&&p.status!=='cancelled' && p.cells.some(c=>c.x===x&&c.y===y));}
  function nextId(){return state.nextId++;}
  function setTool(t, type=null){
    tool=t;buildType=type;
    document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===tool));
    document.querySelectorAll('.build-choice').forEach(b=>b.classList.toggle('active',tool==='build' && b.dataset.room===buildType));
    worldWrap.classList.toggle('tool-dig',tool==='dig');
    worldWrap.classList.toggle('tool-build',tool==='build'||tool==='door'||tool==='ladder');
    $('toolHint').textContent=tool==='dig'?'Click and drag across solid earth beside the existing passage. Confirm workers in the right panel.':
      tool==='build'?'Drag sideways across cleared space to place '+ROOM_TYPES[buildType].name+'. The preview snaps to a standard floor.':
      tool==='door'?'Click a cleared corridor tile with passages on both sides to build a reinforced blast-door chamber.':
      tool==='ladder'?'Click an excavated shaft tile beside another ladder tile to extend vertical access.':
      'Click a survivor, project or room to inspect. Drag empty space to pan the camera.';
    selection = null;chosenWorkers.clear();renderInspector();updateHud();
  }
  function rectangle(a,b) {
    const x0=Math.max(0,Math.min(a.x,b.x)),x1=Math.min(COLS-1,Math.max(a.x,b.x));
    const y0=Math.max(0,Math.min(a.y,b.y)),y1=Math.min(ROWS-1,Math.max(a.y,b.y));
    return {x:x0,y:y0,width:x1-x0+1,height:y1-y0+1};
  }
  function markZone(a,b){
    const rect=rectangle(a,b),cells=[];
    if(rect.width*rect.height>56){toast('Choose a smaller excavation zone (up to 56 tiles).');return;}
    for(let y=rect.y;y<rect.y+rect.height;y++)
      for(let x=rect.x;x<rect.x+rect.width;x++)
        if(y>=3 && state.terrain[y][x]===1 && !jobAt(x,y))cells.push({x,y});
    if(!cells.length){toast('Select untouched ground that is not already assigned.');return;}
    const access=reachableFromEntrance();
    const accessible=cells.some(c=>neighbours(c.x,c.y).some(n=>access.has(key(n.x,n.y))));
    if(!accessible){toast('Connect this ground to an accessible passage before excavating.');return;}
    const job={id:nextId(),kind:'dig',cells,status:'planned',workers:[],progress:0};
    state.projects.push(job);selection={kind:'project',id:job.id};chosenWorkers.clear();
    flag('dig'); report('Excavation zone marked: '+cells.length+' tiles. Assign your workers.');
    setToolKeepSelection('inspect');renderInspector();saveGame();
  }
  function setToolKeepSelection(t) {
    tool=t;buildType=null;
    document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));
    document.querySelectorAll('.build-choice').forEach(b=>b.classList.remove('active'));
    worldWrap.classList.remove('tool-dig','tool-build');
    $('toolHint').textContent='Select an assignment in the world to manage its crew, or choose a new tool.';
  }
  function placeRoom(a,b) {
    const type=buildType, def=ROOM_TYPES[type];if(!def)return;
    const x=Math.min(a.x,b.x),w=Math.abs(a.x-b.x)+1,y=a.y>=6?6+Math.floor((a.y-6)/3)*3:a.y;
    if(y<6 || (y-6)%3!==0){toast('Room floors begin on levels 06, 09, 12 and 15. Choose the upper room row.');return;}
    if(w<3||w>8){toast('Rooms must be 3–8 tiles wide. Drag sideways over cleared terrain.');return;}
    if(x<0||x+w>COLS||y+1>=ROWS){toast('That room does not fit inside the world.');return;}
    const cells=[];
    for(let dy=0;dy<2;dy++)for(let dx=0;dx<w;dx++){
      const cx=x+dx,cy=y+dy;
      if(!cellFree(cx,cy)||isProtected(cx,cy)||roomAt(cx,cy)||jobAt(cx,cy)){
        toast('This room requires two rows of clear, unused, excavated space.');return;
      }
      cells.push({x:cx,y:cy});
    }
    const access=reachableFromEntrance();
    if(!cells.some(c=>neighbours(c.x,c.y).some(n=>access.has(key(n.x,n.y))))){
      toast('This room needs an accessible connection to the shelter.');return;
    }
    const job={id:nextId(),kind:'build',roomType:type,x,y,width:w,cells,status:'planned',workers:[],progress:0};
    state.projects.push(job);selection={kind:'project',id:job.id};chosenWorkers.clear();
    report('Construction planned: '+def.name+'. Assign a builder to begin.');
    setToolKeepSelection('inspect');renderInspector();saveGame();
  }
  function selectResident(id) {
    selection={kind:'resident',id};flag('inspect');renderInspector();
  }
  function chooseWorker(id){
    if(chosenWorkers.has(id))chosenWorkers.delete(id);else chosenWorkers.add(id);
    renderInspector();
  }
  function startProject(id){
    const p=projectFor(id);if(!p)return;
    if(!chosenWorkers.size){toast('Choose at least one survivor to assign.');return;}
    if(p.kind==='build' && p.status==='planned'){
      const cost=ROOM_TYPES[p.roomType].cost;
      if(state.resources.scrap<cost.scrap || state.resources.parts<cost.parts){
        toast('Insufficient supplies. Explore the surface to gather more.');return;
      }
      state.resources.scrap-=cost.scrap;state.resources.parts-=cost.parts;
    }
    for(const resident of state.survivors){
      if(resident.taskId===p.id && !chosenWorkers.has(resident.id)){resident.taskId=null;resident.state='idle';resident.path=[];}
    }
    p.workers=Array.from(chosenWorkers);
    for(const id2 of p.workers){
      const r=state.survivors.find(s=>s.id===id2);if(!r)continue;
      const old=projectFor(r.taskId);
      if(old && old.id!==p.id)old.workers=old.workers.filter(w=>w!==r.id);
      r.taskId=p.id;r.jobRoom=null;r.defending=false;r.state='idle';r.path=[];r.workTarget=null;r.wait=0;
    }
    const newStart=p.status==='planned';p.status='active';
    if(p.kind==='dig'){flag('assign');report(p.workers.length+' survivor(s) assigned to the excavation zone.');}
    else if(p.kind==='rescue')report('Rescue team dispatched. They are clearing the rubble.');
    else report(p.workers.length+' survivor(s) assigned to build '+ROOM_TYPES[p.roomType].name+'.');
    if(!newStart)toast('Crew updated.');
    renderInspector();updateHud();saveGame();
  }
  function cancelProject(id){
    const p=projectFor(id);if(!p)return;
    if(p.kind==='build'&&p.status==='active'){
      // The materials remain with the building crew until dismantling is complete.
      const cost=ROOM_TYPES[p.roomType].cost;
      state.resources.scrap+=cost.scrap;state.resources.parts+=cost.parts;
    }
    for(const r of state.survivors)if(r.taskId===id){r.taskId=null;r.state='idle';r.path=[];r.workTarget=null;}
    p.workers=[];p.status='cancelled';
    selection=null;chosenWorkers.clear();report('Work order cancelled. Excavation progress remains in the earth.');
    renderInspector();saveGame();
  }
  function chooseDigTarget(r,p){
    let best=null,bestScore=Infinity;
    for(const c of p.cells){
      if(state.terrain[c.y][c.x]===0)continue;
      for(const n of neighbours(c.x,c.y)){
        if(!cellFree(n.x,n.y))continue;
        const path=bfs({x:Math.round(r.x),y:Math.round(r.y)},n);
        if(!path)continue;
        const score=path.length*10+(state.digProgress[key(c.x,c.y)]||0)*-.13+Math.abs(r.x-n.x);
        if(score<bestScore){best={cell:c,stand:n,path};bestScore=score;}
      }
    }
    return best;
  }
  function chooseBuildStand(r,p){
    let best=null,score=Infinity;
    // Builders stand on the accessible lower row of the room or an adjacent passage.
    for(let x=p.x;x<p.x+p.width;x++){
      const n={x,y:p.y+1};
      const path=bfs({x:Math.round(r.x),y:Math.round(r.y)},n);
      if(!path)continue;
      if(path.length<score){best={stand:n,path};score=path.length;}
    }
    if(!best){
      for(const c of p.cells)for(const n of neighbours(c.x,c.y)){
        if(!cellFree(n.x,n.y))continue;
        const path=bfs({x:Math.round(r.x),y:Math.round(r.y)},n);
        if(path&&path.length<score){best={stand:n,path};score=path.length;}
      }
    }
    return best;
  }
  function walkPath(r,path,dt) {
    if(!path.length)return true;
    const next=path[0],dx=next.x-r.x,dy=next.y-r.y,dist=Math.hypot(dx,dy);
    const speed=1.6*dt;
    if(dist<=speed){r.x=next.x;r.y=next.y;path.shift();}
    else{r.x+=dx/dist*speed;r.y+=dy/dist*speed;}
    r.state='walking';return path.length===0;
  }
  function completeProject(p){
    p.status='done';
    for(const r of state.survivors)if(r.taskId===p.id){r.taskId=null;r.state='idle';r.path=[];r.wait=0;}
    if(p.kind==='build'){
      state.rooms.push({id:nextId(),type:p.roomType,x:p.x,y:p.y,width:p.width,integrity:100,priority:p.roomType==='water'?1:2});
      flag('build');report(ROOM_TYPES[p.roomType].name+' construction complete. The room is now operational.');
      toast('ROOM CONSTRUCTED · '+ROOM_TYPES[p.roomType].name.toUpperCase());
    }else if(p.kind==='rescue'){
      report('Rubble cleared. Emergency rescue order completed.');
    }else{
      report('Excavation complete. '+p.cells.length+' terrain tiles cleared and ready for building.');
      toast('EXCAVATION COMPLETE');
    }
    if(selection && selection.kind==='project' && selection.id===p.id)selection=null;
    renderInspector();saveGame();
  }
  function updateProjectWorkers(dt){
    for(const r of state.survivors){
      if(state.expedition && state.expedition.crew.includes(r.id))continue;
      r.hunger=Math.max(0,r.hunger-dt*.047);
      r.thirst=Math.max(0,r.thirst-dt*.063);
      if(r.state!=='resting')r.energy=Math.max(0,r.energy-dt*(r.taskId?0.068:0.025));
      if(r.hunger<57 && state.resources.food>=.1){r.hunger=Math.min(100,r.hunger+36);report(r.name+' ate a ration.');}
      if(r.thirst<57 && state.resources.water>=.1){r.thirst=Math.min(100,r.thirst+39);report(r.name+' drank water.');}
      if((r.hunger<12||r.thirst<12)&&Math.random()<dt*.06){r.health=Math.max(0,r.health-1);r.morale=Math.max(0,r.morale-2);}
      if(r.energy<24 && r.state!=='resting'){r.state='resting';r.path=[];r.wait=0;report(r.name+' is taking an essential rest break.');}
      if(r.dead){
      ctx.fillStyle='#7f675e';ctx.fillRect(px-19,foot-13,30,9);
      ctx.fillStyle=r.skin;ctx.beginPath();ctx.arc(px-22,foot-12,6,0,Math.PI*2);ctx.fill();
    }else if(r.state==='resting'){
        const bunks=state.rooms.some(room=>room.type==='bunks');
        r.energy=Math.min(100,r.energy+dt*(bunks?2.7:1.1));
        if(r.energy>=80){r.state='idle';report(r.name+' is rested and returning to their assignment.');}
        continue;
      }
      if(r.dead){r.state='dead';r.path=[];continue;}
      if(r.trapped){r.state='trapped';r.path=[];continue;}
      if(r.defending){r.state='defending';continue;}
      const p=projectFor(r.taskId);
      if(!p||p.status!=='active'){
        r.taskId=null;
        if(r.jobRoom){
          const rm=state.rooms.find(q=>q.id===r.jobRoom);
          if(rm){
            const target={x:Math.min(rm.x+rm.width-1,Math.max(rm.x,rm.x+Math.floor(rm.width/2))),y:rm.y+1};
            if(Math.hypot(target.x-r.x,target.y-r.y)<.05){
              r.x=target.x;r.y=target.y;r.path=[];r.state='working';
            }else{
              if(!r.path||!r.path.length)r.path=bfs({x:Math.round(r.x),y:Math.round(r.y)},target)||[];
              if(r.path.length)walkPath(r,r.path,dt);else r.state='waiting';
            }
            continue;
          }
          r.jobRoom=null;
        }
        r.path=[];r.state='idle';continue;
      }
      if(p.kind==='rescue'){
        const event=state.traps.find(t=>t.id===p.rescueId&&!t.rescued);
        if(!event){completeProject(p);continue;}
        const candidates=neighbours(event.x,event.y).filter(c=>cellFree(c.x,c.y));
        let best=null;
        for(const c of candidates){const path=bfs({x:Math.round(r.x),y:Math.round(r.y)},c);
          if(path && (!best || path.length<best.path.length))best={c,path};}
        if(!best){r.state='waiting';continue;}
        if(Math.hypot(best.c.x-r.x,best.c.y-r.y)>.06){
          if(!r.path||!r.path.length)r.path=best.path;
          walkPath(r,r.path,dt);continue;
        }
        r.state='rescuing';r.x=best.c.x;r.y=best.c.y;
        p.progress+=dt*(.75+r.strength*.10);
        if(p.progress>=22){
          state.terrain[event.y][event.x]=0;window.VDSystems.finishRescue(state,p.rescueId,{report});
          completeProject(p);
        }
        continue;
      }
      if(p.kind==='dig'){
        if(r.path && r.path.length){walkPath(r,r.path,dt);continue;}
        let target=null;
        if(r.workTarget && state.terrain[r.workTarget.cell.y][r.workTarget.cell.x]===1 &&
           Math.hypot(r.workTarget.stand.x-r.x,r.workTarget.stand.y-r.y)<.08)
          target={cell:r.workTarget.cell,stand:r.workTarget.stand,path:[]};
        else {
          target=chooseDigTarget(r,p);
          r.workTarget=target?{cell:target.cell,stand:target.stand}:null;
        }
        if(!target){
          if(p.cells.every(c=>state.terrain[c.y][c.x]===0)){completeProject(p);}
          else {r.state='waiting';r.wait+=dt;if(r.wait>8){r.wait=0;toast('An excavation zone is not reachable. Extend a connected passage.');}}
          continue;
        }
        const dist=Math.hypot(target.stand.x-r.x,target.stand.y-r.y);
        if(dist>.035){r.path=target.path;walkPath(r,r.path,dt);continue;}
        r.x=target.stand.x;r.y=target.stand.y;r.path=[];r.state='digging';
        const k=key(target.cell.x,target.cell.y);
        const hardness=4.5+target.cell.y*.24+(hash(target.cell.x,target.cell.y)>0.81?2.3:0);
        state.digProgress[k]=(state.digProgress[k]||0)+dt*(0.78+r.strength*.20);
        if(state.digProgress[k]>=hardness){
          state.terrain[target.cell.y][target.cell.x]=0;
          delete state.digProgress[k];r.workTarget=null;r.energy=Math.max(0,r.energy-.3);
          if(target.cell.y>=11 && hash(target.cell.x+Math.floor(state.simSeconds),target.cell.y)>.993 &&
            !state.traps.some(t=>!t.rescued && t.people.includes(r.id))){
            state.terrain[target.cell.y][target.cell.x]=2;
            const incident=window.VDSystems.trap(state,r.id,target.cell.x,target.cell.y,{report});
            if(incident){const rescue=window.VDSystems.rescue(state,incident.id,{report});
              if(rescue.ok){selection={kind:'project',id:rescue.job.id};chosenWorkers.clear();renderInspector();}}
            continue;
          }
          if(p.cells.every(c=>state.terrain[c.y][c.x]===0)){completeProject(p);}
        }
      }else{
        if(r.path && r.path.length){walkPath(r,r.path,dt);continue;}
        const stand=chooseBuildStand(r,p);
        if(!stand){r.state='waiting';continue;}
        if(Math.hypot(stand.stand.x-r.x,stand.stand.y-r.y)>.035){
          r.path=stand.path;walkPath(r,r.path,dt);continue;
        }
        r.x=stand.stand.x;r.y=stand.stand.y;r.path=[];r.state='building';
        p.progress+=dt*(1+r.strength*.12);
        if(p.progress >= 13 + p.width*.6){completeProject(p);}
      }
    }
  }
  function updateExpedition(dt) {
    const e=state.expedition;if(!e)return;
    if(e.phase==='outbound'||e.phase==='returning'){
      e.travel+=dt;
      if(e.travel>=6){
        if(e.phase==='outbound'){e.phase='exploring';e.travel=0;e.message='Your team reached the site. Click a room in the building to explore it.';report('Scavenging team reached the '+siteById(e.site).name+'.');}
        else{
          for(const k of Object.keys(e.loot)){state.resources[k]=(state.resources[k]||0)+e.loot[k];}
          for(const id of e.crew){
            const r=state.survivors.find(s=>s.id===id);
            if(r){r.state='idle';r.x=8;r.y=7;r.taskId=null;r.path=[];}
          }
          const site=siteById(e.site);
          if(e.rescued){for(let k=0;k<e.rescued;k++)window.VDSystems.createArrival(state,'rescue');}
          state.expedition=null;expeditionRepaintKey='';
          flag('scavenge');report('Scavengers returned from '+site.name+' with '+lootString(e.loot)+'.');
          toast('EXPEDITION RETURNED · SUPPLIES DELIVERED');saveGame();
        }
        renderExpedition();
      }
      return;
    }
    if(e.action){
      const target=e.action.index+.5;
      if(e.action.phase==='walking'){
        e.position+=(Math.sign(target-e.position))*Math.min(Math.abs(target-e.position),dt*1.13);
        if(Math.abs(target-e.position)<.012){
          e.position=target;e.action.phase=e.action.enemy?'combat':'searching';
          if(e.action.enemy){
            e.message='HOSTILES: '+(e.action.enemy==='ferals'?'Feral infected':'Raiders')+
              ' block access to this room. Choose FIGHT or RETREAT.';
            renderExpedition();
          }
        }
      }else if(e.action.phase==='combat'){
        return;
      }else if(e.action.phase==='fighting'){
        const team=e.crew.map(id=>state.survivors.find(r=>r.id===id)).filter(r=>r&&!r.dead);
        const damage=team.reduce((v,r)=>v+(r.weapon||1)*1.4+(r.skills?.S||4)*.12,0);
        e.action.enemyHp=Math.max(0,e.action.enemyHp-damage*dt);
        for(const r of team){r.health=Math.max(1,r.health-dt*(e.action.enemy==='ferals'?.46:.36)/Math.max(1,team.length));}
        if(e.action.enemyHp<=0){
          e.message='Threat neutralized. The scavengers are clearing the room.';
          if(e.action.enemy==='ferals'&&team.length){
            team[0].infection=Math.min(100,(team[0].infection||0)+12);
            report(team[0].name+' was exposed to infection during the encounter.',true);
          }
          e.action.phase='searching';e.action.progress=0;renderExpedition();
        }
      }else{
        e.action.progress+=dt;
        if(e.action.progress>=e.action.duration){
          const site=siteById(e.site), room=site.rooms[e.action.index];
          const progress=state.sites.find(s=>s.id===e.site);
          progress.rooms[e.action.index].searched=true;
          for(const k of Object.keys(room.loot)){e.loot[k]=(e.loot[k]||0)+room.loot[k];}
          if(room.rescue){e.rescued=(e.rescued||0)+1;}
          if(room.danger){
            const r=state.survivors.find(s=>s.id===e.crew[0]);
            if(r){
              r.health=Math.max(1,r.health-room.danger);
              if(room.hazard==='infection'){r.infection=Math.min(100,(r.infection||0)+23);}
            }
            e.message=room.name+' cleared. Loose debris injured '+(r?r.name:'a survivor')+' (−'+room.danger+' health). Found '+lootString(room.loot)+'.';
          }else e.message=room.name+(room.rescue?' cleared. A stranded survivor has joined your return party!':
            ' searched. Found '+lootString(room.loot)+'.');
          e.action=null;report(e.message,!!room.danger);saveGame();renderExpedition();
        }
      }
    }
  }
  function tick(dt) {
    if(state.paused||state.loss)return;
    const step=dt*state.speed;
    state.minutes+=step*2.3;
    updateProjectWorkers(step);
    updateExpedition(step);
    window.VDSystems.tick(state,step,{report});
    window.VDSystems.tickRaid(state,step,{report},bfs);
  }
  function siteById(id){return SITES.find(s=>s.id===id);}
  function lootString(loot){
    const names={scrap:'salvage',parts:'components',food:'rations',water:'water',fuel:'fuel',meds:'medicine'};
    const entries=Object.entries(loot).filter(([,n])=>n>0).map(([k,n])=>n+' '+(names[k]||k));
    return entries.length?entries.join(', '):'no supplies';
  }
  function selectSite(id){viewedSite=id;renderExpedition();}
  function launchExpedition() {
    if(state.expedition){toast('A scavenging team is already deployed.');return;}
    const crew=Array.from(chosenCrew);
    if(!crew.length){toast('Choose at least one available survivor.');return;}
    if(crew.some(id=>{const r=state.survivors.find(s=>s.id===id);return !r||r.taskId||r.dead||r.trapped;})){toast('Assigned workers must finish or leave their current job first.');return;}
    state.expedition={site:viewedSite,crew,phase:'outbound',travel:0,position:0.16,action:null,loot:{food:0,water:0,scrap:0,parts:0,fuel:0,meds:0},message:'Traveling to the site. Arrival in approximately six seconds.'};
    for(const id of crew){const r=state.survivors.find(s=>s.id===id);r.state='expedition';r.path=[];}
    chosenCrew.clear();report('Scavenging team departed for '+siteById(viewedSite).name+'.');renderExpedition();saveGame();
  }
  function exploreRoom(index) {
    const e=state.expedition;if(!e||e.phase!=='exploring'||e.action)return;
    const siteState=state.sites.find(s=>s.id===e.site);
    if(!siteState||siteState.rooms[index].searched){toast('That section has already been searched.');return;}
    const room=siteById(e.site).rooms[index];
    e.action={index,phase:'walking',progress:0,duration:room.kind==='Salvage'?5:3,
      enemy:room.enemy||null,enemyHp:room.enemy?(room.enemy==='ferals'?24:35):0};
    e.message='Moving to '+room.name+' to '+room.kind.toLowerCase()+' the area.';
    renderExpedition();
  }
  function fightExpedition(){
    const e=state.expedition;
    if(!e||!e.action||e.action.phase!=='combat')return;
    e.action.phase='fighting';
    e.message='Combat underway. Your equipped scavengers are engaging the enemy.';
    report(e.message,true);renderExpedition();
  }
  function retreatExpedition(){
    const e=state.expedition;
    if(!e||!e.action||e.action.phase!=='combat')return;
    e.phase='returning';e.travel=0;e.action=null;
    e.message='Your team disengaged and is returning with collected supplies.';
    report(e.message,true);renderExpedition();
  }
  function recallExpedition() {
    const e=state.expedition;if(!e||e.phase!=='exploring'||e.action)return;
    e.phase='returning';e.travel=0;e.message='Returning to the shelter with everything collected.';
    report('Scavengers returning to the shelter.');renderExpedition();saveGame();
  }

  // Canvas world rendering. Terrain, rooms and people share one consistent camera.
  function resizeCanvas() {
    const rect=worldWrap.getBoundingClientRect();
    screenWidth=Math.max(300,rect.width);screenHeight=Math.max(280,rect.height);
    const dpr=Math.min(2,window.devicePixelRatio||1);
    canvas.width=Math.round(screenWidth*dpr);canvas.height=Math.round(screenHeight*dpr);
    if(!cameraInitialized){
      camera.x=10.5*T-screenWidth/(2*camera.zoom);
      camera.y=5*T-screenHeight/(2*camera.zoom);
      cameraInitialized=true;
    }
    clampCamera();
  }
  function clampCamera(){
    camera.x=bound(camera.x,-170,COLS*T-screenWidth/camera.zoom+190);
    camera.y=bound(camera.y,-110,ROWS*T-screenHeight/camera.zoom+170);
    $('zoomLabel').textContent=Math.round(camera.zoom*100)+'%';
  }
  function screenPosition(event) {
    const r=canvas.getBoundingClientRect();
    return {x:event.clientX-r.left,y:event.clientY-r.top};
  }
  function screenToWorld(s) {return {x:camera.x+s.x/camera.zoom,y:camera.y+s.y/camera.zoom};}
  function pointToTile(s){const p=screenToWorld(s);return {x:Math.floor(p.x/T),y:Math.floor(p.y/T)};}
  function panToHatch() {
    camera.x=9*T-screenWidth/(2*camera.zoom);
    camera.y=5.5*T-screenHeight/(2*camera.zoom);clampCamera();
  }
  function zoomAt(amount,x=screenWidth/2,y=screenHeight/2) {
    const old=camera.zoom,worldX=camera.x+x/old,worldY=camera.y+y/old;
    camera.zoom=bound(camera.zoom*amount,.6,1.85);
    camera.x=worldX-x/camera.zoom;camera.y=worldY-y/camera.zoom;clampCamera();
  }
  function screenClear() {
    const dpr=canvas.width/screenWidth;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#0e161c';ctx.fillRect(0,0,screenWidth,screenHeight);
    ctx.translate(-camera.x*camera.zoom,-camera.y*camera.zoom);
    ctx.scale(camera.zoom,camera.zoom);
  }
  function drawWorld(now) {
    screenClear();
    const startX=Math.max(0,Math.floor(camera.x/T)-1),endX=Math.min(COLS-1,Math.ceil((camera.x+screenWidth/camera.zoom)/T)+1);
    const startY=Math.max(0,Math.floor(camera.y/T)-1),endY=Math.min(ROWS-1,Math.ceil((camera.y+screenHeight/camera.zoom)/T)+1);
    const daylight=Math.max(.2,Math.sin((state.minutes%1440/1440)*Math.PI*2-Math.PI/2)*.5+.54);
    const worldWidth=COLS*T;
    const sky=ctx.createLinearGradient(0,0,0,T*3);
    sky.addColorStop(0,daylight>.55?'#41575d':'#121d2d');sky.addColorStop(1,daylight>.55?'#967d61':'#2d3343');
    ctx.fillStyle=sky;ctx.fillRect(-10000,-2000,worldWidth+20000,2000+T*3);
    ctx.fillStyle=daylight>.55?'#dec594':'#9fadc5';
    ctx.shadowBlur=daylight>.55?36:17;ctx.shadowColor=ctx.fillStyle;ctx.beginPath();ctx.arc(14*T,T*1.05,16,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle='#3a4240';ctx.beginPath();ctx.moveTo(-500,3*T);for(let x=-500;x<=worldWidth+500;x+=T*2.5)ctx.lineTo(x,T*(2.8+.20*Math.sin(x*.012)+.15*Math.cos(x*.019)));ctx.lineTo(worldWidth+500,3*T);ctx.fill();
    const dirt=ctx.createLinearGradient(0,T*3,0,ROWS*T);
    dirt.addColorStop(0,'#685342');dirt.addColorStop(.43,'#483b34');dirt.addColorStop(1,'#27363b');
    ctx.fillStyle=dirt;ctx.fillRect(0,T*3,worldWidth,(ROWS-3)*T);
    for(let y=Math.max(3,startY);y<=endY;y++)for(let x=startX;x<=endX;x++)drawTile(x,y);
    // Access to the world is deliberately limited by the original shaft, not prebuilt rooms.
    drawEntry();
    for(const p of state.projects){
      if(p.status==='done'||p.status==='cancelled')continue;
      if(p.kind==='dig'){
        for(const c of p.cells){
          if(!state.terrain[c.y][c.x])continue;
          ctx.fillStyle='rgba(242,186,91,.15)';ctx.fillRect(c.x*T+2,c.y*T+2,T-4,T-4);
          ctx.strokeStyle='rgba(234,188,108,.6)';ctx.setLineDash([5,4]);ctx.strokeRect(c.x*T+3,c.y*T+3,T-6,T-6);ctx.setLineDash([]);
          const amount=state.digProgress[key(c.x,c.y)]||0;
          if(amount>0){ctx.fillStyle='#edbf78';ctx.fillRect(c.x*T+8,(c.y+1)*T-10,(T-16)*bound(amount/(4.5+c.y*.24),0,1),3);}
        }
      }else if(p.kind==='rescue'){
        for(const cell of p.cells){
          ctx.strokeStyle='#f19e77';ctx.lineWidth=3;
          ctx.setLineDash([6,4]);ctx.strokeRect(cell.x*T+2,cell.y*T+2,T-4,T-4);ctx.setLineDash([]);
          ctx.fillStyle='#f5ad87';ctx.textAlign='center';ctx.font='bold 10px sans-serif';
          ctx.fillText('RESCUE',cell.x*T+T/2,cell.y*T-9);
        }
      }else drawBuildFrame(p);
    }
    for(const room of state.rooms)drawRoom(room,now);
    for(const ladder of state.ladders){
      const x=ladder.x*T,y=ladder.y*T;
      ctx.fillStyle='rgba(53,72,76,.62)';ctx.fillRect(x+14,y+2,T-28,T-4);
      ctx.strokeStyle='#b7ba9c';ctx.lineWidth=3;ctx.beginPath();
      ctx.moveTo(x+18,y+3);ctx.lineTo(x+18,y+T-3);
      ctx.moveTo(x+T-18,y+3);ctx.lineTo(x+T-18,y+T-3);
      for(let i=10;i<T;i+=12){ctx.moveTo(x+18,y+i);ctx.lineTo(x+T-18,y+i);}ctx.stroke();
    }
    for(const door of state.doors){
      const x=door.x*T,y=door.y*T;
      ctx.fillStyle=door.closed?'#5b6d6d':'#34494e';
      ctx.fillRect(x+3,y+3,T-6,T-6);
      ctx.strokeStyle=door.closed?'#e5b16c':'#8eb8a6';ctx.lineWidth=3;
      ctx.strokeRect(x+3,y+3,T-6,T-6);
      for(let i=0;i<3;i++){ctx.strokeStyle=door.closed?'#a5a99a':'#6c9388';
        ctx.beginPath();ctx.moveTo(x+8+i*15,y+8);ctx.lineTo(x+8+i*15,y+T-8);ctx.stroke();}
      if(!door.closed){ctx.fillStyle='#14262b';ctx.fillRect(x+21,y+3,12,T-6);}
      ctx.fillStyle=door.closed?'#e1b27a':'#b0d8c2';ctx.textAlign='center';ctx.font='bold 8px sans-serif';
      ctx.fillText(door.closed?'SEALED':'OPEN',x+T/2,y-5);
    }
    for(const incident of state.incidents){
      const rm=state.rooms.find(r=>r.id===incident.roomId);
      if(!rm)continue;
      const x=(rm.x+rm.width/2)*T,y=(rm.y+.8)*T;
      ctx.save();ctx.fillStyle=incident.kind==='fire'?'#e79a61':'#a2bb84';
      ctx.shadowBlur=14;ctx.shadowColor=ctx.fillStyle;ctx.font='bold 31px sans-serif';ctx.textAlign='center';
      ctx.fillText(incident.kind==='fire'?'♨':'◉',x,y+Math.sin(now*.008)*4);ctx.restore();
    }
    if(state.threat){
      const raid=state.threat;
      const x=(raid.x+.5)*T,y=(raid.y+.94)*T;
      ctx.fillStyle='#682f36';ctx.fillRect(x-14,y-35,27,33);
      ctx.fillStyle='#c6a48c';ctx.beginPath();ctx.arc(x,y-45,11,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#c9534c';ctx.fillRect(x-14,y-57,28,6);
      ctx.fillStyle='#f4c5b2';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(
        raid.kind==='ferals'?'FERALS':'RAIDERS',x,y-67);
      ctx.fillStyle='#e68b72';ctx.fillRect(x-20,y-61,40*bound(raid.hp/(raid.kind==='ferals'?72:95),0,1),3);
    }
    for(const r of state.survivors) {
      if(state.expedition && state.expedition.crew.includes(r.id))continue;
      drawSurvivor(r,now);
    }
    if(state.tutorialEnabled && !state.tutorialFlags.dig && !drag){
      const gx=13*T,gy=6*T;
      ctx.save();ctx.fillStyle='rgba(234,193,112,.055)';ctx.fillRect(gx,gy,4*T,2*T);
      ctx.strokeStyle='rgba(248,210,146,.86)';ctx.lineWidth=2;
      ctx.setLineDash([8,6]);ctx.lineDashOffset=-(now*.02)%14;
      ctx.strokeRect(gx+2,gy+2,4*T-4,2*T-4);ctx.setLineDash([]);
      ctx.fillStyle='#f7dcaa';ctx.textAlign='center';ctx.font='bold 10px sans-serif';
      ctx.fillText('SUGGESTED FIRST DIG',gx+2*T,gy-8);ctx.restore();
    }
    if(drag && drag.kind!=='pan')drawDragHighlight(drag.start,drag.current);
    if(hoverCell&&tool==='dig'&&valid(hoverCell.x,hoverCell.y)) {
      ctx.lineWidth=1.2;ctx.strokeStyle='#d6bc84';ctx.strokeRect(hoverCell.x*T+1,hoverCell.y*T+1,T-2,T-2);
    }
  }
  function drawTile(x,y) {
    const px=x*T,py=y*T,v=hash(x,y);
    if(state.terrain[y][x]===2){
      ctx.fillStyle='#4d4942';ctx.fillRect(px,py,T,T);
      ctx.fillStyle='#8c7061';
      for(let i=0;i<7;i++){
        const rx=px+4+hash(x*7+i,y)*42,ry=py+9+hash(x,y*8+i)*36;
        ctx.beginPath();ctx.moveTo(rx,ry-8);ctx.lineTo(rx+8,ry-3);ctx.lineTo(rx+11,ry+6);
        ctx.lineTo(rx-4,ry+7);ctx.closePath();ctx.fill();
      }
      ctx.strokeStyle='#d88f70';ctx.strokeRect(px+2,py+2,T-4,T-4);
    }else if(state.terrain[y][x]===1) {
      const rocky=y>=11;
      ctx.fillStyle=rocky?(v>.5?'#3c4546':'#41413c'):(v>.50?'#5a493c':'#624e3e');
      ctx.globalAlpha=rocky?.43:.32;ctx.fillRect(px,py,T,T);ctx.globalAlpha=1;
      ctx.fillStyle='rgba(8,12,14,.10)';ctx.fillRect(px,py+T-2,T,2);
      for(let i=0;i<4;i++){
        const s=hash(x*7+i,y*3+i),xx=px+4+s*(T-8),yy=py+4+hash(x+i+5,y*4)*(T-8);
        ctx.fillStyle=s>.5?'rgba(188,154,116,.14)':'rgba(20,24,27,.22)';
        ctx.fillRect(xx,yy,2+s*5,1.5+s*2);
      }
      if(v>.92&&y>=9){ctx.fillStyle='#9c8a6d';ctx.beginPath();ctx.moveTo(px+9,py+7);ctx.lineTo(px+29,py+20);ctx.lineTo(px+20,py+31);ctx.fill();}
    }else{
      ctx.fillStyle='#18252b';ctx.fillRect(px,py,T,T);
      ctx.fillStyle='rgba(67,95,99,.13)';ctx.fillRect(px,py+T-5,T,5);
      ctx.strokeStyle='rgba(120,160,144,.06)';ctx.strokeRect(px+.5,py+.5,T-1,T-1);
      for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]){
        if(valid(x+dx,y+dy)&&state.terrain[y+dy][x+dx]){
          ctx.fillStyle='#2a3331';
          if(dy===-1)ctx.fillRect(px,py,T,6);
          else if(dy===1){ctx.fillStyle='#465147';ctx.fillRect(px,py+T-7,T,7);}
          else if(dx===-1)ctx.fillRect(px,py,5,T);
          else ctx.fillRect(px+T-5,py,5,T);
        }
      }
    }
  }
  function drawEntry() {
    const x=8*T,y=2.68*T;
    ctx.fillStyle='#2a3b3b';ctx.fillRect(x-5,y,T+10,24);
    ctx.fillStyle='#7e938c';ctx.fillRect(x-5,y,T+10,7);
    ctx.strokeStyle='#cab28b';ctx.lineWidth=2;ctx.strokeRect(x-5,y,T+10,24);
    ctx.fillStyle='#abbbb0';ctx.fillRect(x+8,y-15,T-16,18);
    ctx.fillStyle='#c5a26c';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('01',x+T/2,y+14);
    for(let row=3;row<=7;row++){
      ctx.fillStyle='rgba(75,96,94,.37)';ctx.fillRect(x+9,row*T+8,T-18,T-6);
      ctx.strokeStyle='#a7a68a';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x+18,row*T+5);ctx.lineTo(x+18,row*T+T-5);ctx.moveTo(x+35,row*T+5);ctx.lineTo(x+35,row*T+T-5);
      for(let j=13;j<T;j+=12){ctx.moveTo(x+18,row*T+j);ctx.lineTo(x+35,row*T+j);}
      ctx.stroke();
    }
    ctx.fillStyle='rgba(240,206,134,.16)';ctx.fillRect(x+T/2-9,3*T,18,T*4.8);
    for(let x0=7;x0<=12;x0++){
      ctx.fillStyle='#7d8175';ctx.fillRect(x0*T,8*T-6,T,6);
      ctx.fillStyle='#4b5b59';ctx.fillRect(x0*T+3,7*T+6,T-6,3);
      if(x0%2===0){
        ctx.fillStyle='#deb977';ctx.beginPath();ctx.arc((x0+.5)*T,7*T+9,3.8,0,Math.PI*2);ctx.fill();
      }
    }
  }
  function drawRoom(room,now) {
    const def=ROOM_TYPES[room.type],x=room.x*T,y=room.y*T,w=room.width*T,h=2*T,online=roomActive(room);
    ctx.fillStyle=online?'#293b3f':'#222c34';ctx.fillRect(x+2,y+2,w-4,h-4);
    const wall=ctx.createLinearGradient(0,y,0,y+h);
    wall.addColorStop(0,online?'#3a4a49':'#313a3e');wall.addColorStop(1,'#1c2e33');
    ctx.fillStyle=wall;ctx.fillRect(x+5,y+9,w-10,h-21);
    ctx.fillStyle='#80948e';ctx.fillRect(x,y,w,9);ctx.fillStyle='#9fa394';ctx.fillRect(x,y+h-9,w,9);
    ctx.fillStyle='#233136';ctx.fillRect(x+3,y+12,4,h-22);ctx.fillRect(x+w-7,y+12,4,h-22);
    for(let j=0;j<room.width;j++){
      ctx.strokeStyle='rgba(173,198,182,.09)';ctx.strokeRect(x+j*T+2,y+11,T-4,h-22);
    }
    ctx.fillStyle=online?'rgba(244,203,128,.17)':'rgba(47,57,62,.14)';
    ctx.fillRect(x+13,y+14,w-26,h-31);
    ctx.fillStyle=online?'#e7d59a':'#667579';ctx.fillRect(x+w/2-14,y+10,28,3);
    if(online){ctx.shadowBlur=15;ctx.shadowColor='#e2bd78';ctx.fillRect(x+w/2-11,y+13,22,4);ctx.shadowBlur=0;}
    ctx.fillStyle=online?'#c8c5ab':'#80908b';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.fillText(def.name.toUpperCase(),x+13,y+22);
    if(room.type==='generator'){
      const cx=x+w/2,cy=y+h-36;
      ctx.fillStyle='#303f41';ctx.fillRect(cx-54,cy-21,108,40);ctx.strokeStyle='#998d77';ctx.lineWidth=3;ctx.strokeRect(cx-54,cy-21,108,40);
      for(let i=0;i<3;i++){
        const gx=cx-37+i*37;
        ctx.fillStyle='#687c76';ctx.beginPath();ctx.ellipse(gx,cy-2,12,17,0,0,7);ctx.fill();
        ctx.strokeStyle=def.color;ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle=online?'#d9b66d':'#8a8577';ctx.fillRect(gx-5,cy-7,10,9);
      }
      ctx.strokeStyle='#b79059';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-50,cy-22);ctx.lineTo(cx-50,y+35);ctx.lineTo(cx+42,y+35);ctx.stroke();
      if(online){ctx.fillStyle='#eec778';ctx.globalAlpha=.55+.25*Math.sin(now*.006);ctx.fillRect(cx-2,cy-10,4,14);ctx.globalAlpha=1;}
    }else if(room.type==='bunks'){
      const count=Math.max(2,Math.floor(room.width/2));
      for(let i=0;i<count;i++){
        const bx=x+18+i*((w-36)/count);
        ctx.fillStyle='#647c75';ctx.fillRect(bx,y+h-31,(w-44)/count,16);
        ctx.fillStyle='#b1b7a2';ctx.fillRect(bx,y+h-33,(w-44)/count,7);
        ctx.fillStyle='#d5c6ac';ctx.fillRect(bx+2,y+h-29,10,10);
        ctx.strokeStyle='#c5c8b2';ctx.strokeRect(bx,y+h-31,(w-44)/count,16);
      }
    }else if(room.type==='water'){
      const count=Math.max(2,Math.floor(room.width/2));
      for(let i=0;i<count;i++){
        const bx=x+18+i*((w-36)/count);
        ctx.fillStyle='#456e77';ctx.fillRect(bx,y+45,26,45);
        ctx.fillStyle='#6eacb7';ctx.fillRect(bx+4,y+57,18,28);
        ctx.strokeStyle='#b2d0ce';ctx.lineWidth=2;ctx.strokeRect(bx,y+45,26,45);
        ctx.fillStyle='#c6d0c8';ctx.fillRect(bx-3,y+39,32,6);
      }
    }else if(room.type==='garden'){
      for(let i=0;i<room.width;i++){
        const bx=x+i*T+8,by=y+h-28;
        ctx.fillStyle='#495a4a';ctx.fillRect(bx,by,T-16,16);
        ctx.fillStyle='#66824d';ctx.fillRect(bx+2,by+3,T-20,5);
        for(let j=0;j<3;j++){
          const gx=bx+8+j*10;ctx.strokeStyle='#8fbc7e';ctx.lineWidth=2;
          ctx.beginPath();ctx.moveTo(gx,by+3);ctx.lineTo(gx-2,by-11);ctx.stroke();
          ctx.fillStyle='#8dbb7a';ctx.beginPath();ctx.ellipse(gx-5,by-12,5,3,-.6,0,7);ctx.fill();
        }
      }
    }
    if(['medbay','radio','security'].includes(room.type)){
      const cx=x+w/2,cy=y+h-39;
      ctx.fillStyle='#2f4242';ctx.fillRect(cx-32,cy-26,64,46);
      ctx.strokeStyle=def.color;ctx.lineWidth=2;ctx.strokeRect(cx-32,cy-26,64,46);
      ctx.fillStyle=online?def.color:'#52646a';ctx.font='bold 35px sans-serif';ctx.textAlign='center';
      ctx.fillText(def.glyph,cx,cy+9);
      if(room.type==='radio'){
        ctx.strokeStyle='#b7c9b8';ctx.beginPath();ctx.moveTo(cx,cy-26);ctx.lineTo(cx,cy-52);ctx.stroke();
        ctx.beginPath();ctx.arc(cx,cy-47,7,Math.PI*1.1,Math.PI*1.9);ctx.stroke();
      }
    }
    if(room.captured){
      const surveillance=state.rooms.some(r=>r.type==='security'&&roomActive(r));
      ctx.fillStyle=surveillance?'rgba(65,19,24,.40)':'rgba(10,14,19,.80)';
      ctx.fillRect(x+8,y+12,w-16,h-24);
      ctx.fillStyle='#f1a18c';ctx.font='bold 11px sans-serif';ctx.textAlign='center';
      ctx.fillText(surveillance?'HOSTILE CONTROL':'SIGNAL LOST · HOSTILE CONTROL',x+w/2,y+h/2);
    }
    if(!online && room.type!=='generator'){
      ctx.fillStyle='rgba(3,7,11,.43)';ctx.fillRect(x+8,y+12,w-16,h-23);
      ctx.fillStyle='#e4a484';ctx.font='bold 10px sans-serif';ctx.fillText('NO POWER',x+15,y+h-19);
    }
    ctx.strokeStyle=room.captured?'#dc876e':def.color;ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
    if(room.integrity<99){ctx.fillStyle='#a65b4d';ctx.fillRect(x+10,y+h-11,(w-20)*bound(room.integrity/100,0,1),3);}
    if(selection&&selection.kind==='room'&&selection.id===room.id){ctx.lineWidth=3;ctx.strokeStyle='#f2d19b';ctx.strokeRect(x-3,y-3,w+6,h+6);}
  }
  function drawBuildFrame(p){
    const x=p.x*T,y=p.y*T,w=p.width*T,h=T*2;
    ctx.fillStyle='rgba(126,151,148,.18)';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle='#cdba8a';ctx.lineWidth=2;ctx.setLineDash([8,4]);ctx.strokeRect(x+2,y+2,w-4,h-4);ctx.setLineDash([]);
    for(let i=0;i<p.width;i++){ctx.strokeStyle='rgba(230,191,128,.15)';ctx.beginPath();ctx.moveTo(x+i*T+7,y+7);ctx.lineTo(x+(i+1)*T-5,y+h-7);ctx.stroke();}
    ctx.fillStyle='#e8d0a1';ctx.font='bold 12px sans-serif';ctx.textAlign='center';
    ctx.fillText(ROOM_TYPES[p.roomType].name.toUpperCase(),x+w/2,y+h/2-4);
    ctx.fillStyle='#d3b67d';ctx.fillRect(x+15,y+h/2+9,Math.max(5,(w-30)*bound(p.progress/(13+p.width*.6),0,1)),4);
  }
  function residentFloor(r) {
    // A room's lower tile is the walkable work level.
    return (r.y+.94)*T;
  }
  function drawSurvivor(r,now){
    const px=(r.x+.5)*T,foot=residentFloor(r),working=r.state==='digging'||r.state==='building';
    const swing=(r.state==='walking'?Math.sin(now*.016+r.id)*5:working?Math.sin(now*.013+r.id)*3:Math.sin(now*.002+r.id)*.7);
    const selected=selection&&selection.kind==='resident'&&selection.id===r.id;
    if(selected){ctx.strokeStyle='#f7d194';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(px,foot-2,20,7,0,0,7);ctx.stroke();}
    ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();ctx.ellipse(px,foot,12,4,0,0,7);ctx.fill();
    if(r.state==='resting'){
      ctx.fillStyle=r.coat;ctx.fillRect(px-17,foot-15,29,12);
      ctx.fillStyle=r.skin;ctx.beginPath();ctx.arc(px-19,foot-12,7,0,7);ctx.fill();
    }else{
      ctx.strokeStyle='#242e33';ctx.lineWidth=7;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(px-5,foot-21);ctx.lineTo(px-6-swing*.5,foot-2);
      ctx.moveTo(px+5,foot-21);ctx.lineTo(px+7+swing*.5,foot-2);ctx.stroke();
      const coat=ctx.createLinearGradient(px-11,0,px+11,0);
      coat.addColorStop(0,'#273e43');coat.addColorStop(.4,r.coat);coat.addColorStop(1,'#35464c');
      ctx.fillStyle=coat;ctx.beginPath();ctx.moveTo(px-12,foot-44);ctx.lineTo(px+12,foot-44);ctx.lineTo(px+9,foot-20);ctx.lineTo(px-9,foot-20);ctx.fill();
      ctx.strokeStyle=r.skin;ctx.lineWidth=6;ctx.beginPath();
      if(working){ctx.moveTo(px-10,foot-40);ctx.lineTo(px-18+swing,foot-28);
        ctx.moveTo(px+10,foot-40);ctx.lineTo(px+17+swing,foot-29);}
      else{ctx.moveTo(px-10,foot-40);ctx.lineTo(px-11-swing,foot-24);ctx.moveTo(px+10,foot-40);ctx.lineTo(px+11+swing,foot-24);}
      ctx.stroke();
      ctx.fillStyle=r.skin;ctx.beginPath();ctx.ellipse(px,foot-53,9.5,11,0,0,7);ctx.fill();
      ctx.fillStyle=r.hair;ctx.beginPath();ctx.ellipse(px,foot-61,10,5,0,Math.PI,Math.PI*2);ctx.fill();
      ctx.fillStyle='#263034';ctx.fillRect(px+3,foot-54,2,1);
      if(working){
        ctx.save();ctx.translate(px+16+swing,foot-31);ctx.rotate(.4+Math.sin(now*.012+r.id)*.6);
        ctx.strokeStyle='#b69a76';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(0,16);ctx.stroke();
        ctx.strokeStyle='#8b9795';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-14,-13);ctx.lineTo(9,-13);ctx.stroke();ctx.restore();
      }
    }
    if(camera.zoom>.67){
      ctx.textAlign='center';ctx.font='bold 10px Inter, sans-serif';
      ctx.fillStyle='#e6ede3';ctx.shadowBlur=4;ctx.shadowColor='#0b1619';ctx.fillText(r.name.split(' ')[0].toUpperCase(),px,foot-70);ctx.shadowBlur=0;
      if(r.state!=='idle'){ctx.font='8px sans-serif';ctx.fillStyle=r.state==='resting'?'#ebcc92':'#b2d3c6';ctx.fillText(r.state.toUpperCase(),px,foot-81);}
    }
    ctx.lineCap='butt';
  }
  function drawDragHighlight(a,b){
    if(!a||!b)return;
    let rect=rectangle(a,b);
    if(drag.kind==='build')rect={x:rect.x,y:a.y>=6?6+Math.floor((a.y-6)/3)*3:a.y,width:rect.width,height:2};
    if(rect.width>COLS||rect.height>ROWS)return;
    const x=rect.x*T,y=rect.y*T,w=rect.width*T,h=rect.height*T;
    ctx.fillStyle=drag.kind==='dig'?'rgba(232,186,106,.22)':'rgba(135,194,168,.19)';ctx.fillRect(x,y,w,h);
    ctx.strokeStyle=drag.kind==='dig'?'#f5cc84':'#a5e0ba';ctx.lineWidth=2;
    ctx.setLineDash([7,5]);ctx.strokeRect(x+1,y+1,w-2,h-2);ctx.setLineDash([]);
  }
  function drawScene(now){
    drawWorld(now);drawSiteScene(now);
  }

  function drawSiteScene(now) {
    const ec=$('expeditionScene'),e=state.expedition;
    if(!ec||!e||e.phase!=='exploring')return;
    const g=ec.getContext('2d');if(!g)return;
    const w=ec.width,h=ec.height;
    const site=siteById(e.site),progress=state.sites.find(s=>s.id===e.site);
    g.fillStyle='#1b2529';g.fillRect(0,0,w,h);
    const sky=g.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#35474a');sky.addColorStop(1,'#242b2e');
    g.fillStyle=sky;g.fillRect(0,0,w,37);
    const margin=16,rw=(w-margin*2)/4;
    for(let i=0;i<4;i++){
      const x=margin+i*rw, y=40;
      const searched=progress.rooms[i].searched;
      g.fillStyle=searched?'#27332f':'#3c4540';g.fillRect(x,y,rw-2,h-57);
      const shade=g.createLinearGradient(x,0,x+rw,0);shade.addColorStop(0,'#263136');shade.addColorStop(.5,'#4b554f');shade.addColorStop(1,'#25363a');
      g.fillStyle=shade;g.fillRect(x+4,y+5,rw-10,h-67);
      g.fillStyle='#87948a';g.fillRect(x,y,rw-2,7);g.fillRect(x,h-18,rw-2,7);
      g.fillStyle='#13252b';g.fillRect(x+rw-12,h-77,9,58);
      const room=site.rooms[i];
      g.font='bold 13px sans-serif';g.textAlign='center';g.fillStyle='#d6e2d8';g.fillText(room.name.toUpperCase(),x+rw/2,y+24);
      g.fillStyle=searched?'#6c827b':'#d3ae73';g.font='32px sans-serif';g.fillText(room.icon,x+rw/2,y+84);
      g.fillStyle=searched?'#90ae9d':'#dec48e';g.font='bold 10px sans-serif';g.fillText(searched?'CLEARED':room.kind.toUpperCase()+' · CLICK TO EXPLORE',x+rw/2,y+115);
      g.strokeStyle=searched?'#546c5e':'#8f8875';g.lineWidth=1;g.strokeRect(x+.5,y+.5,rw-3,h-57);
      if(e.action&&e.action.index===i&&e.action.phase==='searching'){
        g.fillStyle='#bda06b';g.fillRect(x+18,h-38,(rw-39)*bound(e.action.progress/e.action.duration,0,1),4);
      }
    }
    const pos=margin+e.position*rw;
    g.fillStyle='#171d1d';g.beginPath();g.ellipse(pos,h-17,14,4,0,0,7);g.fill();
    g.fillStyle='#b8a17a';g.beginPath();g.arc(pos,h-73,12,0,7);g.fill();
    g.fillStyle='#6e998b';g.fillRect(pos-11,h-59,22,29);
    g.strokeStyle='#b5b7a3';g.lineWidth=6;g.beginPath();g.moveTo(pos-6,h-30);g.lineTo(pos-8+Math.sin(now*.013)*3,h-19);g.moveTo(pos+6,h-30);g.lineTo(pos+7-Math.sin(now*.013)*3,h-19);g.stroke();
    g.fillStyle='#e5e9d8';g.font='bold 10px sans-serif';g.textAlign='center';g.fillText('SCAVENGING TEAM',pos,h-90);
  }

  // Sidebar, inspector and tutorial UI
  function drawLog(){
    $('eventLog').innerHTML=state.logs.slice(0,7).map(item=>
      '<div class="log-entry'+(item.warning?' warning':'')+'"><strong>'+item.time+'</strong>'+item.text+'</div>').join('');
  }
  function updateHud(){
    const r=state.resources,p=powerData(),systems=window.VDSystems;
    const count=systems.alive(state).length;
    $('popValue').textContent=count+' / '+systems.capacity(state);
    $('powerValue').textContent=p.generation+' / '+p.demand;
    $('foodValue').textContent=r.food.toFixed(1);
    $('waterValue').textContent=r.water.toFixed(1);
    $('fuelValue').textContent=r.fuel.toFixed(1);
    $('medsValue').textContent=r.meds.toFixed(1);
    $('scrapValue').textContent=fmt(r.scrap);
    $('partsValue').textContent=fmt(r.parts);
    const morale=state.survivors.reduce((a,v)=>a+v.morale,0)/Math.max(state.survivors.length,1);
    $('moraleValue').textContent=Math.round(morale)+'%';
    $('dayClock').textContent=timeString();
    const hour=Math.floor((state.minutes%1440)/60);
    $('dayPhase').textContent=hour>=7&&hour<19?'SURFACE DAYLIGHT':'SURFACE NIGHT';
    $('worldStatus').textContent=state.threat?'HOSTILE BREACH':state.rooms.length?'EXPANDING SHELTER':'UNDEVELOPED';
    $('worldSubStatus').textContent=state.rooms.length ? state.rooms.length+' BUILT ROOMS · '+state.projects.filter(p=>p.status==='active').length+
      ' WORK ORDERS' : 'NO FUNCTIONAL ROOMS';
    $('pauseBtn').textContent=state.paused?'▶':'Ⅱ';
    document.querySelectorAll('.speed').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===state.speed));
    $('worldLabel').textContent=state.rooms.length?'SECTOR 01 · DEVELOPING SHELTER':'SECTOR 01 · ABANDONED ENTRY';
    const rate=state.resourceRate||{food:0,water:0,fuel:0};
    const show=(v)=>((v>=0?'+':'')+Number(v).toFixed(1));
    $('ratesValue').textContent='Food '+show(rate.food)+'/min · Water '+show(rate.water)+
      '/min · Fuel '+show(rate.fuel)+'/min';
    $('powerDetails').textContent=p.lit?(p.spare>=0?'GRID STABLE · '+p.spare+' SPARE':'POWER DEFICIT · '+Math.abs(p.spare)+' SHORT'):
      'NO GRID POWER · INSTALL A GENERATOR';
    $('powerDetails').style.color=p.spare<0?'#f0ab82':'#bed0c5';
    renderArrivals();renderCrisisSummary();
    showLoss();
  }
  function renderTutorial(){
    const panel=$('tutorialPanel');
    panel.classList.toggle('hidden',!state.tutorialEnabled);
    const steps=[
      ['inspect','Meet your team','Inspect a survivor',
       'You have three people, each with different skills. Open the right panel to see who can help.'],
      ['dig','Clear a safe room','Excavate ground',
       'Choose EXCAVATE and drag across the glowing ground next to the entrance. The walls are real, so you must dig them out.'],
      ['assign','Send a worker','Assign a digger',
       'Select your excavation order. Pick Mara, Eli or Iris and press CONFIRM & ASSIGN CREW. They will physically walk to the work.'],
      ['build','Build your first facility','Construct a room',
       'Once the area is clear, choose a generator, drag sideways across two clear rows, and assign a builder.'],
      ['staff','Put somebody to work','Staff a facility',
       'Click the new room, then assign someone to run it. An unstaffed generator makes only emergency power.'],
      ['scavenge','Resupply the shelter','Explore a location',
       'Open the WASTELAND MAP, send a free resident, search rooms, then bring your supplies home.'],
      ['recruit','Welcome a survivor','Accept a visitor',
       'Build sleeping quarters to create beds. When somebody reaches the hatch, decide whether to admit them.']
    ];
    const done=steps.filter(row=>state.tutorialFlags[row[0]]).length;
    $('tutorialTasks').innerHTML=steps.map(([k,label],i)=>
      '<div class="tutorial-task'+(state.tutorialFlags[k]?' done':'')+'"><strong>'+(state.tutorialFlags[k]?'✓':String(i+1).padStart(2,'0'))+'</strong><span>'+label+'</span></div>').join('');
    const next=steps.find(row=>!state.tutorialFlags[row[0]]);
    if(next){
      $('objectiveFocus').innerHTML='<span class="eyebrow">NEXT STEP / '+(done+1)+' OF '+steps.length+
        '</span><strong>'+next[1]+'</strong><p>'+next[3]+'</p>';
      $('tutorialNote').textContent='Only this objective needs your attention right now. Everything else can wait.';
      $('tutorialAction').classList.remove('hidden');
      $('tutorialAction').textContent=next[0]==='recruit'?'SHOW VISITORS / HOUSING →':"TAKE ME TO THIS STEP →";
    }else{
      $('objectiveFocus').innerHTML='<strong>YOU HAVE THE CONTROLS.</strong><p>All initial tasks completed. Expand or explore at your own pace. You can still reopen this guide.</p>';
      $('tutorialNote').textContent='Orientation completed · '+steps.length+' / '+steps.length;
      $('tutorialAction').classList.add('hidden');
    }
    const target=next?next[0]:null;
    document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('tutorial-highlight',state.tutorialEnabled &&
      ((target==='inspect'&&b.dataset.tool==='inspect')||(target==='dig'&&b.dataset.tool==='dig'))));
    document.querySelectorAll('.build-choice').forEach(b=>b.classList.toggle('tutorial-highlight',state.tutorialEnabled &&
      ((target==='build'&&b.dataset.room==='generator')||(target==='recruit'&&b.dataset.room==='bunks'))));
    $('expeditionsBtn').classList.toggle('tutorial-highlight',state.tutorialEnabled&&target==='scavenge');
    $('peopleBtn').classList.toggle('tutorial-highlight',state.tutorialEnabled&&target==='staff');
  }
  function guideNext(){
    const order=['inspect','dig','assign','build','staff','scavenge','recruit'];
    const next=order.find(k=>!state.tutorialFlags[k]);
    if(!next)return;
    if(next==='inspect'){selection=null;renderInspector();toast('Click a survivor on the right to inspect their skills.');}
    if(next==='dig'){setTool('dig');panToHatch();toast('Drag across the golden glowing earth just right of the entrance.');}
    if(next==='assign'){
      const p=state.projects.find(p=>p.kind==='dig' && (p.status==='planned'||p.status==='active'));
      if(p){selection={kind:'project',id:p.id};chosenWorkers=new Set(p.workers);renderInspector();}
      else {setTool('dig');toast('First select some ground to dig.');}
    }
    if(next==='build'){setTool('build','generator');panToHatch();toast('Drag across an excavated space, then assign a builder.');}
    if(next==='staff'){
      const room=state.rooms[0];
      if(room){selection={kind:'room',id:room.id};renderInspector();}
      else {setTool('build','generator');toast('Construct a room first.');}
    }
    if(next==='scavenge')openExpedition();
    if(next==='recruit'){
      if(state.arrivals.length){renderArrivals();toast('Choose whether to welcome the person at the hatch.');}
      else {setTool('build','bunks');toast('Build sleeping quarters, then watch for arrivals at the hatch.');}
    }
  }
  function bar(value,label){
    return '<div class="stat"><div class="stat-header"><span>'+label+'</span><strong>'+Math.round(value)+'%</strong></div>'+
      '<div class="meter '+(value<40?'warning':'healthy')+'"><i style="width:'+bound(value,0,100)+'%"></i></div></div>';
  }
  function detailSummary(s){
    return '<div class="detail-card"><div class="small-head">'+s.name+'</div><span class="pill">'+s.role.toUpperCase()+'</span>'+
      '<p class="inspector-info">Strength '+s.strength+' / 10 · '+s.state.toUpperCase()+'</p>'+
      bar(s.health,'Health')+bar(s.energy,'Energy')+bar(s.hunger,'Hunger')+bar(s.thirst,'Hydration')+bar(s.morale,'Morale')+
      '<button class="secondary-btn" data-action="focus-resident" data-id="'+s.id+'">⌖ FOLLOW SURVIVOR</button>'+
      '<button class="secondary-btn" data-action="back" type="button">← ALL SURVIVORS</button></div>';
  }
  function renderInspector(){
    const body=$('inspectorBody'),systems=window.VDSystems;
    const residentButtons=state.survivors.map(s=>{
      const dead=s.dead?' · DEAD':'';
      return '<div class="survivor-card'+(s.dead?' dead':'')+'" role="button" tabindex="0" data-action="inspect-resident" data-id="'+s.id+'">'+
        '<div class="avatar">'+s.name[0]+'</div><div><div class="resident-title">'+s.name+dead+'</div>'+
        '<div class="resident-sub">'+s.role+' · LV '+s.level+' · STR '+s.skills.S+'</div>'+
        '<div class="mini-state">'+(s.jobRoom?('WORKING · '+(ROOM_TYPES[systems.room(state,s.jobRoom)?.type]?.name||'Assigned')):s.state.toUpperCase())+
        ' · HP '+Math.ceil(s.health)+'</div></div></div>';
    }).join('');
    if(!selection){
      $('inspectorTitle').textContent='Your residents';
      $('inspectorSubtitle').textContent=systems.alive(state).length+' living · '+systems.capacity(state)+' bed capacity · Manage individually';
      const jobs=state.projects.filter(p=>p.status==='active'||p.status==='planned');
      const working=state.survivors.filter(r=>r.jobRoom&&!r.dead).length;
      body.innerHTML='<p class="small-head">RESIDENT ROSTER</p>'+residentButtons+
        '<p class="inspector-info">Staffed facilities: '+working+' assigned. Click a resident to change their job, shift, equipment or medical care.</p>'+
        '<div class="divider"></div><p class="small-head">OPEN WORK ORDERS</p>'+
        (jobs.length?jobs.map(p=>'<button class="worker-choice" data-action="inspect-project" data-id="'+p.id+'"><span>'+
          (p.kind==='dig'?'⚒ Excavation':p.kind==='rescue'?'⚠ Rescue':'▣ '+ROOM_TYPES[p.roomType].name)+
          '</span><small>'+p.status.toUpperCase()+'</small></button>').join(''):
          '<p class="helper">No work orders. You can dig a new room, explore the wasteland or manage your staff.</p>');
      return;
    }
    if(selection.kind==='resident'){
      const r=systems.get(state,selection.id);
      if(!r){selection=null;renderInspector();return;}
      $('inspectorTitle').textContent=r.name;
      $('inspectorSubtitle').textContent='Level '+r.level+' · '+r.role+' · '+r.state;
      const jobOptions='<option value="">Unassigned / general duty</option>'+state.rooms.map(room=>
        '<option value="'+room.id+'"'+(r.jobRoom===room.id?' selected':'')+'>'+
        ROOM_TYPES[room.type].name+' · '+systems.getRoomWorkers(state,room.id).length+' active</option>').join('');
      const statLabels={S:'Strength',P:'Perception',E:'Endurance',C:'Charisma',I:'Intelligence',A:'Agility',L:'Luck'};
      const skills='<div class="attribute-grid">'+Object.entries(statLabels).map(([k,label])=>
        '<div title="'+label+'"><span>'+k+'</span><strong>'+r.skills[k]+'</strong></div>').join('')+'</div>';
      body.innerHTML='<div class="detail-card"><div class="small-head">'+r.name+'</div>'+
        '<span class="pill '+(r.dead||r.trapped?'warn':'')+'">'+(r.dead?'DECEASED':r.trapped?'TRAPPED':r.state.toUpperCase())+'</span>'+
        '<p class="inspector-info">Level '+r.level+' · Defence '+r.weapon+' · Loyalty '+Math.round(r.loyalty)+'% · Shift '+r.shift+'</p>'+skills+
        bar(r.health,'Health')+bar(r.energy,'Energy')+bar(r.hunger,'Hunger')+bar(r.thirst,'Hydration')+
        bar(r.morale,'Morale')+(r.infection?bar(r.infection,'Infection level'):'')+
        '<div class="divider"></div><label class="management-label" for="residentJob">WORK ASSIGNMENT</label>'+
        '<select class="management-select" id="residentJob" data-resident="'+r.id+'" '+(r.dead?'disabled':'')+'>'+jobOptions+'</select>'+
        '<label class="management-label" for="residentShift">WORK SCHEDULE</label>'+
        '<select class="management-select" id="residentShift" data-resident="'+r.id+'" '+(r.dead?'disabled':'')+'>'+
        ['flex','day','night'].map(v=>'<option value="'+v+'" '+(r.shift===v?'selected':'')+'>'+({flex:'Flexible / any time',day:'Day shift',night:'Night shift'}[v])+'</option>').join('')+'</select>'+
        '<button class="management-control" data-action="equip" data-id="'+r.id+'" '+(r.dead?'disabled':'')+'>⚒ Upgrade defensive gear · 3 salvage, 1 component</button>'+
        '<button class="management-control" data-action="heal" data-id="'+r.id+'" '+(r.dead?'disabled':'')+'>✚ Medical treatment · 1 medicine</button>'+
        (r.dead?'<button class="management-control" data-action="revive" data-id="'+r.id+'">✚ Revive in medical bay · 3 medicine</button>':
          '<button class="management-control" data-action="'+(r.defending?'stand-down':'defend')+'" data-id="'+r.id+'">'+
          (r.defending?'◌ Stand down from defence':'◇ Assign to emergency defence')+'</button>')+
        '<button class="secondary-btn" data-action="focus-resident" data-id="'+r.id+'">⌖ LOCATE IN WORLD</button>'+
        '<button class="secondary-btn" data-action="back">← ALL RESIDENTS</button></div>';return;
    }
    if(selection.kind==='room'){
      const rm=systems.room(state,selection.id);
      if(!rm){selection=null;renderInspector();return;}
      const def=ROOM_TYPES[rm.type],data=powerData(),crew=state.survivors.filter(r=>r.jobRoom===rm.id&&!r.dead);
      $('inspectorTitle').textContent=def.name;
      $('inspectorSubtitle').textContent='Level '+rm.y+' · '+rm.width+' tiles wide · '+crew.length+' assigned';
      const descriptions={
        generator:'Generates 3 emergency power automatically; staff residents to increase output. Consumes fuel continuously.',
        bunks:'Expands capacity and allows exhausted residents to recover faster when electricity is available.',
        water:'Staff with high-Perception residents to turn electricity into clean drinking water.',
        garden:'Staff with high-Agility residents to grow steady food supplies.',
        medbay:'Staff with high-Intelligence residents to produce medical supplies and treat injuries.',
        radio:'Staff with high-Charisma residents to attract more surface refugees.',
        security:'Equip defenders and monitor the settlement. Powered security posts enable surveillance in hostile sectors.'
      };
      body.innerHTML='<div class="detail-card"><p class="small-head">ROOM OPERATIONS</p>'+
        '<span class="pill '+(!roomActive(rm)?'warn':'')+'">'+
        (rm.captured?'OCCUPIED BY HOSTILES':roomActive(rm)?'POWERED':'OFFLINE / SHED FROM GRID')+'</span>'+
        '<p class="helper">'+descriptions[rm.type]+'</p>'+bar(rm.integrity,'Structural integrity')+
        '<p class="small-econ">Consumes '+(systems.ROOMS[rm.type].draw||'fuel')+' power · Grid '+data.generation+'/'+data.demand+
        ' · '+crew.length+' assigned</p>'+
        '<p class="small-head">ASSIGN A RESIDENT</p>'+
        state.survivors.filter(r=>!r.dead).map(r=>
          '<button class="worker-choice" data-action="assign-room" data-id="'+r.id+'" data-room="'+rm.id+'">'+
          '<span>'+(r.jobRoom===rm.id?'✓ ':'○ ')+r.name+'</span><small>'+systems.ROOMS[rm.type].skill+' '+r.skills[systems.ROOMS[rm.type].skill]+'</small></button>').join('')+
        '<label class="management-label">POWER PRIORITY</label>'+
        '<select class="management-select" id="roomPriority" data-room="'+rm.id+'">'+
        [1,2,3].map(v=>'<option value="'+v+'" '+((rm.priority||2)===v?'selected':'')+'>'+({1:'Critical',2:'Normal',3:'Low'}[v])+'</option>').join('')+'</select>'+
        '<button class="secondary-btn" data-action="repair" data-id="'+rm.id+'">⚒ REPAIR / RECLAIM (3 SALVAGE)</button>'+
        '<button class="secondary-btn" data-action="back">← SETTLEMENT</button></div>';return;
    }
    if(selection.kind==='door'){
      const door=state.doors.find(d=>d.id===selection.id);
      if(!door){selection=null;renderInspector();return;}
      $('inspectorTitle').textContent='Blast-door chamber';
      $('inspectorSubtitle').textContent='Physical security checkpoint';
      body.innerHTML='<div class="detail-card"><p class="small-head">'+(door.closed?'SEALED':'OPEN')+
        ' · INTEGRITY '+Math.ceil(door.hp)+'</p>'+bar(door.hp,'Door durability')+
        '<p class="helper">A closed door blocks residents and intruders. Make sure you do not trap your own people in the wrong sector.</p>'+
        '<button class="primary-btn" data-action="toggle-door" data-id="'+door.id+'">'+(door.closed?'OPEN DOOR':'LOCK DOWN DOOR')+'</button>'+
        '<button class="secondary-btn" data-action="repair" data-id="'+door.id+'">REPAIR DOOR · 3 SALVAGE</button>'+
        '<button class="secondary-btn" data-action="back">← SETTLEMENT</button></div>';return;
    }
    if(selection.kind==='project'){
      const p=projectFor(selection.id);
      if(!p){selection=null;renderInspector();return;}
      const rescue=p.kind==='rescue';
      $('inspectorTitle').textContent=rescue?'Emergency rescue':p.kind==='dig'?'Excavation order':'Construction order';
      $('inspectorSubtitle').textContent=rescue?'Manual crew rescue · trapped survivors need oxygen':p.kind==='dig'?
        'Manual digging · progress is saved':ROOM_TYPES[p.roomType].name+' · '+p.width+' tiles wide';
      const done=p.kind==='dig'?p.cells.filter(c=>!state.terrain[c.y][c.x]).length:0;
      const progress=rescue?p.progress/22*100:p.kind==='dig'?done/Math.max(p.cells.length,1)*100:p.progress/(13+p.width*.6)*100;
      if(p.status==='planned'&&!chosenWorkers.size&&p.workers.length)chosenWorkers=new Set(p.workers);
      const workers=state.survivors.filter(r=>!r.dead).map(r=>{
        const assigned=chosenWorkers.has(r.id),busy=r.taskId&&r.taskId!==p.id,
          away=state.expedition&&state.expedition.crew.includes(r.id);
        return '<button class="worker-choice '+(assigned?'chosen':'')+'" data-action="choose-worker" data-id="'+r.id+'"'+(away||r.trapped?' disabled':'')+'>'+
          '<span>'+(assigned?'✓ ':'○ ')+r.name+(busy?' · REASSIGN':'')+'</span><small>STR '+r.strength+'</small></button>';
      }).join('');
      const costs=p.kind==='build'?ROOM_TYPES[p.roomType].cost:null;
      body.innerHTML='<div class="detail-card"><span class="pill '+(p.status==='planned'?'warn':'')+'">'+p.status.toUpperCase()+'</span>'+
        '<p class="small-head" style="margin-top:14px">'+(rescue?'TRAPPED PERSON / RUBBLE CLEARANCE':p.kind==='dig'?p.cells.length+' EARTH TILES':ROOM_TYPES[p.roomType].name.toUpperCase())+'</p>'+
        '<p class="helper">'+(rescue?'Rescuers must access the collapsed area and clear rubble before the trapped resident runs out of air.':
          p.kind==='dig'?'Workers travel along accessible passages and physically dig reachable earth.':
          'Builders walk to the cleared room, carrying the required salvage and components.')+'</p>'+
        '<div class="stat"><div class="stat-header"><span>Progress</span><strong>'+Math.round(progress)+'%</strong></div>'+
        '<div class="progress-track"><div class="progress-fill" style="width:'+bound(progress,0,100)+'%"></div></div></div>'+
        (costs?'<p class="inspector-info">Cost: '+costs.scrap+' salvage'+(costs.parts?', '+costs.parts+' components':'')+'</p>':'')+
        '<p class="small-head">SELECT YOUR WORK CREW</p>'+workers+
        '<button class="primary-btn" data-action="start-project" data-id="'+p.id+'">'+(p.status==='planned'?'CONFIRM & ASSIGN CREW':'UPDATE WORK CREW')+' →</button>'+
        '<button class="secondary-btn" data-action="cancel-project" data-id="'+p.id+'">CANCEL WORK ORDER</button>'+
        '<button class="secondary-btn" data-action="back">← RETURN TO SETTLEMENT</button></div>';return;
    }
  }
  function applySystem(result){
    if(!result?.ok){toast(result?.error||'This action is unavailable.');return false;}
    updateHud();renderInspector();renderArrivals();renderSecurity();saveGame();return true;
  }
  function renderArrivals(){
    const dock=$('arrivalDock');
    if(!state.arrivals.length){dock.innerHTML='';return;}
    const room=window.VDSystems.capacity(state),pop=window.VDSystems.alive(state).length;
    dock.innerHTML='<strong>♙ '+state.arrivals.length+' PERSON'+(state.arrivals.length===1?'':'S')+' WAITING AT THE HATCH</strong>'+
      '<p>New survivors do not join automatically. Review them and choose what happens next. Beds: '+pop+' / '+room+'.</p>'+
      state.arrivals.map(a=>'<div class="visitor">'+a.candidate.name+' · '+a.candidate.role+
        ' · Skilled in '+Object.entries(a.candidate.skills).sort((a,b)=>b[1]-a[1])[0][0]+
        '<div class="arrival-actions"><button data-visitor="admit" data-id="'+a.id+'" '+(pop>=room?'disabled':'')+'>WELCOME SURVIVOR</button>'+
        '<button data-visitor="reject" data-id="'+a.id+'">TURN AWAY</button></div></div>').join('')+
      (pop>=room?'<p class="warning-message">No free beds. Build sleeping quarters before admitting anyone else.</p>':'');
  }
  function renderCrisisSummary(){
    const root=$('crisisSummary'),threat=state.threat,events=state.incidents,traps=state.traps.filter(t=>!t.rescued);
    if(!threat&&!events.length&&!traps.length){root.innerHTML='';return;}
    root.innerHTML='<strong>⚠ ACTIVE EMERGENCY</strong>'+
      '<p>'+(threat?(threat.kind==='ferals'?'FERAL OUTBREAK':'RAIDERS AT THE GATE')+' · '+
        Math.ceil(threat.hp)+' attacker strength · ':'')+
        (events.length?events.length+' interior incident(s) · ':'')+
        (traps.length?traps.length+' trapped area(s)':'')+'</p>'+
      '<button id="openCrisis" type="button">OPEN RESPONSE CENTER →</button>';
  }
  function renderSecurity(){
    if($('securityModal').classList.contains('hidden'))return;
    const dom=$('securityContent'),systems=window.VDSystems;
    const raid=state.threat,incidents=state.incidents,traps=state.traps.filter(t=>!t.rescued);
    const responders=systems.alive(state);
    dom.innerHTML='<div class="security-list">'+
      '<div class="security-item '+(raid?'warning':'')+'"><h3>External threats</h3>'+
      (raid?'<p>'+raid.kind.toUpperCase()+' · HP '+Math.ceil(raid.hp)+' · '+raid.phase+
        ' · '+raid.controlled.length+' rooms captured.</p>':
        '<p>No raiders currently inside the shelter. Security remains your responsibility.</p>')+
      '<p>Defenders with upgraded gear provide stronger resistance. They can be ordered to stand down after the alarm.</p>'+
      (raid?responders.map(r=>'<button data-security="defend" data-id="'+r.id+'">'+
        (r.defending?'✓ ':'◇ ')+r.name+'</button>').join(''):'')+
      '<label style="display:flex;align-items:center;gap:10px;font-size:11px;margin-top:10px"><input id="autoLockdown" type="checkbox" '+
        (state.autoLockdown?'checked':'')+'>Automatically close all installed doors during raids</label></div>'+
      '<div class="security-item"><h3>Blast-door chambers · '+state.doors.length+'</h3>'+
      (state.doors.length?state.doors.map(d=>
        '<p>Checkpoint '+d.x+','+d.y+' · '+(d.closed?'SEALED':'OPEN')+' · '+Math.ceil(d.hp)+'% integrity'+
        ' <button data-security="door" data-id="'+d.id+'">'+(d.closed?'OPEN':'SEAL')+'</button>'+
        ' <button data-security="repair" data-id="'+d.id+'">REPAIR</button></p>').join(''):
        '<p>None installed. Use the BLAST DOOR tool to build a chamber inside a two-sided corridor. It costs 7 salvage and 2 components.</p>')+'</div>'+
      '<div class="security-item '+(incidents.length?'warning':'')+'"><h3>Internal emergencies</h3>'+
      (incidents.length?incidents.map(e=>{
        const r=systems.room(state,e.roomId);
        return '<p>'+e.kind.toUpperCase()+' in '+(r?ROOM_TYPES[r.type].name:'Unknown room')+
          ' · Severity '+Math.ceil(e.severity)+'. Assign someone to the affected room to contain it.</p>'+
          responders.map(p=>'<button data-security="contain" data-id="'+p.id+'">'+p.name+'</button>').join('');
      }).join(''):'<p>All rooms clear of fire and vermin.</p>')+'</div>'+
      '<div class="security-item '+(traps.length?'warning':'')+'"><h3>Excavation rescue</h3>'+
      (traps.length?traps.map(t=>'<p>Collapse at '+t.x+','+t.y+' · Oxygen '+Math.ceil(t.air)+'% · Survivor(s) '+
        t.people.map(id=>systems.get(state,id)?.name||'Unknown').join(', ')+
        '</p><button data-security="rescue" data-id="'+t.id+'">PLAN MANUAL RESCUE</button>').join(''):
        '<p>No trapped residents. Deep excavations are more dangerous; keep a spare digger ready.</p>')+'</div>'+
      '<div class="security-item"><h3>Settlement conditions</h3>'+
      '<p>'+state.rooms.filter(r=>r.captured).length+' rooms occupied · '+
        state.survivors.filter(r=>r.infection>0&&!r.dead).length+' residents infected · '+
        state.survivors.filter(r=>r.dead).length+' dead · '+
        state.rooms.filter(r=>r.integrity<100).length+' damaged rooms.</p></div></div>';
  }
  function guideDoor(x,y){
    const action=window.VDSystems.door(state,x,y,{report});
    if(action.ok){selection={kind:'door',id:action.door.id};setToolKeepSelection('inspect');renderInspector();}
    applySystem(action);
  }
  function guideLadder(x,y){
    if(!valid(x,y) || !cellFree(x,y) || y<7 || y>=ROWS-1 || state.ladders.some(l=>l.x===x&&l.y===y)){
      toast('Use a cleared shaft tile below the entrance, without an existing ladder.');return;
    }
    if(state.resources.scrap<2){toast('You need 2 salvage to build a ladder extension.');return;}
    const vertical=neighbours(x,y).some(n=>n.x===x && (state.ladders.some(l=>l.x===n.x&&l.y===n.y) ||
      (n.x===8&&n.y>=3&&n.y<=7)));
    if(!vertical){toast('Ladder segments must connect vertically to an existing ladder.');return;}
    state.resources.scrap-=2;state.ladders.push({x,y});
    report('Ladder segment installed. The new vertical route is accessible.');
    toast('LADDER CONNECTED');updateHud();saveGame();
  }
  function useSecurityCommand(action,id){
    const systems=window.VDSystems;
    let result;
    if(action==='defend'){const r=systems.get(state,id);result=r?.defending?systems.standDown(state,id,{report}):systems.defend(state,id,{report});}
    else if(action==='contain')result=systems.contain(state,id,{report});
    else if(action==='door')result=systems.toggleDoor(state,id,{report});
    else if(action==='repair')result=systems.repair(state,id,{report});
    else if(action==='rescue'){
      result=systems.rescue(state,id,{report});
      if(result.ok){
        selection={kind:'project',id:result.job.id};
        chosenWorkers.clear();renderInspector();$('securityModal').classList.add('hidden');
        toast('Rescue planned. Select your rescuers in the right panel.');
      }
    }
    if(result)applySystem(result);
  }
  function showLoss(){
    if(!state.loss)return;
    if(!$('lossModal').classList.contains('hidden'))return;
    $('lossReason').textContent=state.loss.reason+' You can inspect the remains, or start a new settlement.';
    $('lossModal').classList.remove('hidden');
  }
    function showIntro() {$('introModal').classList.toggle('hidden',state.introSeen);}
  function openExpedition(){
    $('expeditionModal').classList.remove('hidden');
    viewedSite=state.expedition?state.expedition.site:viewedSite;
    renderExpedition();
  }
  function closeExpedition(){$('expeditionModal').classList.add('hidden');}
  function renderExpedition(){
    if($('expeditionModal').classList.contains('hidden'))return;
    const root=$('expeditionContent');
    if(!state.expedition){
      $('expeditionTitle').textContent='Surface survey';
      $('expeditionDescription').textContent='Select an abandoned location, choose your scavengers, then inspect rooms and recover supplies. Explored rooms stay empty.';
      const site=siteById(viewedSite),progress=state.sites.find(s=>s.id===site.id);
      root.innerHTML='<div class="site-grid">'+SITES.map(s=>{
        const spent=state.sites.find(a=>a.id===s.id).rooms.filter(r=>r.searched).length;
        return '<button class="site-card '+(viewedSite===s.id?'active':'')+'" data-site="'+s.id+'">'+
          '<span class="site-tag">'+s.threat+'</span><strong>'+s.icon+' &nbsp; '+s.name+'</strong><small>'+s.subtitle+
          '<br><br>'+spent+' / 4 SECTIONS EXPLORED</small></button>';
      }).join('')+'</div><div class="detail-card"><p class="small-head">DEPLOY TO '+site.name.toUpperCase()+'</p>'+
        '<p class="helper">'+(4-progress.rooms.filter(r=>r.searched).length)+' unexplored sectors remain. Your team will physically search each accessible room. Salvaging machinery takes longer than searching cabinets.</p>'+
        '<p class="small-head">CHOOSE SCAVENGERS (UP TO 2)</p>'+
        state.survivors.map(r=>{
          const active=chosenCrew.has(r.id),busy=!!r.taskId||!!r.dead||!!r.trapped;
          return '<label class="expedition-avatar '+(active?'active':'')+'"><span>'+r.name+' · '+r.role+(busy?' · UNAVAILABLE':'')+'</span>'+
            '<input type="checkbox" data-crew="'+r.id+'" '+(active?'checked ':'')+(busy?'disabled':'')+'></label>';
        }).join('')+
        '<button class="primary-btn" id="launchExpedition" type="button">DEPLOY SCAVENGING TEAM →</button></div>';
    }else{
      const e=state.expedition,site=siteById(e.site);
      $('expeditionTitle').textContent=site.name;
      $('expeditionDescription').textContent=site.threat+' · '+e.crew.map(id=>state.survivors.find(r=>r.id===id).name).join(' & ');
      const progress=state.sites.find(s=>s.id===e.site);
      if(e.phase==='exploring'){
        root.innerHTML='<p class="expedition-progress">INTERACTIVE SITE VIEW · Click a room to send your scavengers inside. Empty rooms cannot be looted again.</p>'+
          '<canvas id="expeditionScene" width="760" height="225" aria-label="Four explorable rooms at the wasteland site" style="display:block;width:100%;height:auto;border:1px solid #5c6b60;border-radius:5px;cursor:crosshair"></canvas>'+
          '<div class="site-rooms">'+site.rooms.map((r,i)=>'<button class="site-room '+(progress.rooms[i].searched?'searched':'')+
          '" data-explore="'+i+'" '+(progress.rooms[i].searched||e.action?'disabled':'')+'>'+
          '<span class="room-icon">'+r.icon+'</span><strong>'+r.name+'</strong><small>'+(progress.rooms[i].searched?'SEARCHED':'CLICK TO '+r.kind.toUpperCase())+'</small></button>').join('')+'</div>'+
          '<div id="expeditionMessage" class="site-log">'+e.message+'</div>'+
          '<p class="inspector-info">BACKPACK: '+lootString(e.loot)+(e.rescued?' · '+e.rescued+' PERSON RESCUED':'')+'</p>'+
          (e.action&&e.action.phase==='combat'?
            '<div class="expedition-toolbar"><button class="primary-btn" id="fightExpedition">⚔ FIGHT HOSTILES</button>'+
              '<button class="secondary-btn" id="retreatExpedition">RETREAT WITH SUPPLIES</button></div>':'')+
          (e.action&&e.action.phase==='fighting'?
            '<div class="expedition-progress">DEFENDING TEAM ENGAGED · ENEMY HP '+Math.ceil(e.action.enemyHp)+'</div>':'')+
          '<button class="primary-btn" id="returnExpedition" '+(e.action?'disabled':'')+' type="button">RETURN TO SHELTER WITH SUPPLIES →</button>';
        const scene=$('expeditionScene');
        scene.addEventListener('click',ev=>{
          const r=scene.getBoundingClientRect(),nx=(ev.clientX-r.left)/r.width;
          exploreRoom(bound(Math.floor((nx*760-16)/((760-32)/4)),0,3));
        });
      }else{
        root.innerHTML='<div class="expedition-mission"><span class="eyebrow">'+(e.phase==='outbound'?'OUTBOUND / TRAVELING':'INBOUND / RETURNING')+'</span>'+
          '<p class="helper">'+e.message+'</p><div class="progress-track"><div id="travelProgress" class="progress-fill" style="width:'+bound(e.travel/6*100,0,100)+'%"></div></div>'+
          '<p class="inspector-info">Backpack: '+lootString(e.loot)+'</p></div>';
      }
    }
    expeditionRepaintKey=state.expedition?(state.expedition.phase+'|'+(state.expedition.action?state.expedition.action.index:'none')):'survey';
  }
  function updateExpeditionProgressUi(){
    if($('expeditionModal').classList.contains('hidden')||!state.expedition)return;
    const e=state.expedition;
    const t=$('travelProgress');if(t)t.style.width=bound(e.travel/6*100,0,100)+'%';
    const m=$('expeditionMessage');if(m && m.textContent!==e.message)m.textContent=e.message;
  }

  // All controls call real gameplay systems. No browser-native confirm prompts.
  function attachEvents(){
    document.querySelectorAll('.tool').forEach(btn=>btn.addEventListener('click',()=>setTool(btn.dataset.tool)));
    document.querySelectorAll('.build-choice').forEach(btn=>btn.addEventListener('click',()=>setTool('build',btn.dataset.room)));
    document.querySelectorAll('.speed').forEach(btn=>btn.addEventListener('click',()=>{
      state.speed=Number(btn.dataset.speed);state.paused=false;updateHud();saveGame();
    }));
    $('pauseBtn').addEventListener('click',()=>{state.paused=!state.paused;updateHud();});
    $('saveBtn').addEventListener('click',()=>saveGame(false));
    $('resetBtn').addEventListener('click',()=>{$('confirmModal').classList.remove('hidden');});
    $('cancelReset').addEventListener('click',()=>{$('confirmModal').classList.add('hidden');});
    $('confirmReset').addEventListener('click',()=>{
      try{localStorage.removeItem(SAVE_KEY);}catch(err){}
      state=window.VDSystems.normalize(makeNewGame());tool='inspect';buildType=null;selection=null;chosenWorkers.clear();
      cameraInitialized=false;resizeCanvas();$('confirmModal').classList.add('hidden');showIntro();renderAll();saveGame();
    });
    $('startWithTutorial').addEventListener('click',()=>{
      state.introSeen=true;state.tutorialEnabled=true;$('introModal').classList.add('hidden');renderTutorial();saveGame();
    });
    $('startWithoutTutorial').addEventListener('click',()=>{
      state.introSeen=true;state.tutorialEnabled=false;$('introModal').classList.add('hidden');renderTutorial();saveGame();
    });
    $('skipTutorial').addEventListener('click',()=>{
      state.tutorialEnabled=false;renderTutorial();toast('Tutorial hidden. You can reopen it anytime.');saveGame();
    });
    $('helpBtn').addEventListener('click',()=>{
      state.tutorialEnabled=!state.tutorialEnabled;renderTutorial();
      if(state.tutorialEnabled)toast('Optional orientation restored. Continue in any order.');saveGame();
    });
    $('centerBtn').addEventListener('click',panToHatch);
    $('zoomIn').addEventListener('click',()=>zoomAt(1.18));
    $('zoomOut').addEventListener('click',()=>zoomAt(1/1.18));
    $('expeditionsBtn').addEventListener('click',openExpedition);
    $('tutorialAction').addEventListener('click',guideNext);
    $('peopleBtn').addEventListener('click',()=>{selection=null;chosenWorkers.clear();renderInspector();toast('Choose a resident to assign a job or schedule.');});
    $('securityBtn').addEventListener('click',()=>{$('securityModal').classList.remove('hidden');renderSecurity();});
    $('closeSecurity').addEventListener('click',()=>{$('securityModal').classList.add('hidden');});
    $('crisisSummary').addEventListener('click',ev=>{if(ev.target.closest('#openCrisis')){
      $('securityModal').classList.remove('hidden');renderSecurity();}});
    $('arrivalDock').addEventListener('click',ev=>{
      const b=ev.target.closest('[data-visitor]');if(!b)return;
      const cmd=b.dataset.visitor,id=b.dataset.id;
      applySystem(cmd==='admit'?window.VDSystems.admit(state,id,{report}):
        window.VDSystems.reject(state,id,{report}));
      renderTutorial();
    });
    $('securityContent').addEventListener('click',ev=>{
      const b=ev.target.closest('[data-security]');if(!b)return;
      useSecurityCommand(b.dataset.security,Number(b.dataset.id));
    });
    $('securityContent').addEventListener('change',ev=>{
      if(ev.target.id==='autoLockdown'){
        state.autoLockdown=ev.target.checked;report('Automatic security lockdown '+(state.autoLockdown?'enabled':'disabled')+'.');saveGame();
      }
    });
    $('lossClose').addEventListener('click',()=>{$('lossModal').classList.add('hidden');});
    $('lossRestart').addEventListener('click',()=>{
      $('lossModal').classList.add('hidden');$('confirmModal').classList.remove('hidden');
    });
    $('closeExpedition').addEventListener('click',closeExpedition);
    $('expeditionContent').addEventListener('click',ev=>{
      const site=ev.target.closest('[data-site]');
      if(site){selectSite(site.dataset.site);return;}
      const explore=ev.target.closest('[data-explore]');
      if(explore){exploreRoom(Number(explore.dataset.explore));return;}
      if(ev.target.closest('#launchExpedition'))launchExpedition();
      if(ev.target.closest('#returnExpedition'))recallExpedition();
      if(ev.target.closest('#fightExpedition'))fightExpedition();
      if(ev.target.closest('#retreatExpedition'))retreatExpedition();
    });
    $('expeditionContent').addEventListener('change',ev=>{
      const c=ev.target.closest('[data-crew]');if(!c)return;
      const id=Number(c.dataset.crew);
      if(c.checked){if(chosenCrew.size>=2){c.checked=false;toast('Maximum two scavengers in this expedition.');return;}chosenCrew.add(id);}
      else chosenCrew.delete(id);
      renderExpedition();
    });
    $('inspectorBody').addEventListener('click',ev=>{
      const el=ev.target.closest('[data-action]');if(!el)return;
      const action=el.dataset.action,id=Number(el.dataset.id);
      if(action==='inspect-resident'){selectResident(id);}
      else if(action==='inspect-project'){selection={kind:'project',id};const p=projectFor(id);chosenWorkers=new Set(p?p.workers:[]);renderInspector();}
      else if(action==='choose-worker')chooseWorker(id);
      else if(action==='start-project')startProject(id);
      else if(action==='cancel-project')cancelProject(id);
      else if(action==='assign-room'){
        applySystem(window.VDSystems.assignment(state,id,Number(el.dataset.room),{report}));
        flag('staff');renderTutorial();
      }
      else if(action==='heal')applySystem(window.VDSystems.heal(state,id,{report}));
      else if(action==='revive')applySystem(window.VDSystems.revive(state,id,{report}));
      else if(action==='equip')applySystem(window.VDSystems.equip(state,id,{report}));
      else if(action==='defend')applySystem(window.VDSystems.defend(state,id,{report}));
      else if(action==='stand-down')applySystem(window.VDSystems.standDown(state,id,{report}));
      else if(action==='toggle-door')applySystem(window.VDSystems.toggleDoor(state,id,{report}));
      else if(action==='repair')applySystem(window.VDSystems.repair(state,id,{report}));
      else if(action==='focus-resident'){
        const r=state.survivors.find(s=>s.id===id);
        if(r){camera.x=(r.x+.5)*T-screenWidth/camera.zoom/2;camera.y=(r.y+.5)*T-screenHeight/camera.zoom/2;clampCamera();}
      }
      else if(action==='back'){selection=null;chosenWorkers.clear();renderInspector();}
    });
    $('inspectorBody').addEventListener('change',ev=>{
      const el=ev.target;
      if(el.id==='residentJob'){
        const id=Number(el.dataset.resident),roomId=Number(el.value);
        const result=roomId?window.VDSystems.assignment(state,id,roomId,{report}):
          window.VDSystems.unassign(state,id,{report});
        if(applySystem(result)&&roomId){flag('staff');renderTutorial();}
      }
      if(el.id==='residentShift')applySystem(window.VDSystems.shift(state,Number(el.dataset.resident),el.value,{report}));
      if(el.id==='roomPriority'){
        const room=state.rooms.find(r=>r.id===Number(el.dataset.room));
        if(room){room.priority=Number(el.value);report('Power priority updated.');updateHud();saveGame();}
      }
    });
    $('inspectorBody').addEventListener('keydown',ev=>{
      if((ev.key==='Enter'||ev.key===' ')&&ev.target.dataset.action==='inspect-resident'){
        ev.preventDefault();selectResident(Number(ev.target.dataset.id));
      }
    });
    worldWrap.addEventListener('pointerdown',ev=>{
      if(ev.target!==canvas)return;
      ev.preventDefault();
      const p=screenPosition(ev),tile=pointToTile(p);
      if(ev.button!==0&&ev.button!==1)return;
      drag={kind:ev.button===1||tool==='inspect'?'pan':tool,start:tile,current:tile,startScreen:p,origin:{x:camera.x,y:camera.y},moved:false};
      pointer=ev.pointerId;canvas.setPointerCapture(pointer);
    });
    worldWrap.addEventListener('pointermove',ev=>{
      const p=screenPosition(ev);hoverCell=pointToTile(p);
      if(!drag||pointer!==ev.pointerId)return;
      drag.current=pointToTile(p);
      const distance=Math.hypot(p.x-drag.startScreen.x,p.y-drag.startScreen.y);
      if(distance>5)drag.moved=true;
      if(drag.kind==='pan'){
        camera.x=drag.origin.x-(p.x-drag.startScreen.x)/camera.zoom;
        camera.y=drag.origin.y-(p.y-drag.startScreen.y)/camera.zoom;clampCamera();
      }
    });
    function finishPointer(ev){
      if(!drag||pointer!==ev.pointerId)return;
      const old=drag;drag=null;pointer=null;
      try{if(canvas.hasPointerCapture(ev.pointerId))canvas.releasePointerCapture(ev.pointerId);}catch(err){}
      if(old.kind==='dig')markZone(old.start,old.current);
      else if(old.kind==='build')placeRoom(old.start,old.current);
      else if(old.kind==='door')guideDoor(old.current.x,old.current.y);
      else if(old.kind==='ladder')guideLadder(old.current.x,old.current.y);
      else if(!old.moved){
        const pt=screenToWorld(screenPosition(ev));
        const click=pointToTile(screenPosition(ev));
        const blast=state.doors.find(d=>d.x===click.x&&d.y===click.y);
        if(blast){selection={kind:'door',id:blast.id};renderInspector();return;}
        const trapped=state.traps.find(t=>!t.rescued&&t.x===click.x&&t.y===click.y);
        if(trapped){
          const p=state.projects.find(p=>p.kind==='rescue'&&p.rescueId===trapped.id&&p.status!=='cancelled');
          if(p){selection={kind:'project',id:p.id};chosenWorkers=new Set(p.workers);renderInspector();}
          else useSecurityCommand('rescue',trapped.id);
          return;
        }
        const resident=state.survivors.find(r=>
          !(state.expedition&&state.expedition.crew.includes(r.id)) &&
          Math.hypot((r.x+.5)*T-pt.x,(r.y+.6)*T-pt.y)<30);
        if(resident){selectResident(resident.id);return;}
        const cell=pointToTile(screenPosition(ev));
        if(!valid(cell.x,cell.y))return;
        const pj=jobAt(cell.x,cell.y),room=roomAt(cell.x,cell.y);
        if(pj){selection={kind:'project',id:pj.id};chosenWorkers=new Set(pj.workers);renderInspector();}
        else if(room){selection={kind:'room',id:room.id};renderInspector();}
        else {selection=null;renderInspector();}
      }
    }
    canvas.addEventListener('pointerup',finishPointer);
    canvas.addEventListener('pointercancel',()=>{drag=null;pointer=null;});
    canvas.addEventListener('wheel',ev=>{
      ev.preventDefault();const p=screenPosition(ev);
      zoomAt(ev.deltaY<0?1.09:1/1.09,p.x,p.y);
    },{passive:false});
    window.addEventListener('keydown',ev=>{
      if(ev.key==='Escape'){
        if(!$('confirmModal').classList.contains('hidden'))$('confirmModal').classList.add('hidden');
        else if(!$('securityModal').classList.contains('hidden'))$('securityModal').classList.add('hidden');
        else if(!$('lossModal').classList.contains('hidden'))$('lossModal').classList.add('hidden');
        else if(!$('expeditionModal').classList.contains('hidden'))closeExpedition();
        else if(!drag){setTool('inspect');}
        return;
      }
      if(!$('introModal').classList.contains('hidden') || !$('expeditionModal').classList.contains('hidden'))return;
      if(ev.target instanceof HTMLInputElement)return;
      if(ev.key===' '){ev.preventDefault();state.paused=!state.paused;updateHud();return;}
      const map={ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0],ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1]};
      if(map[ev.key]){ev.preventDefault();camera.x+=map[ev.key][0]*42/camera.zoom;camera.y+=map[ev.key][1]*42/camera.zoom;clampCamera();}
      if(ev.key==='+'||ev.key==='=')zoomAt(1.12);
      if(ev.key==='-')zoomAt(1/1.12);
    });
    window.addEventListener('beforeunload',()=>saveGame());
    document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame();});
    if(window.ResizeObserver)new ResizeObserver(resizeCanvas).observe(worldWrap);
    else window.addEventListener('resize',resizeCanvas);
  }
  function renderAll(){renderTutorial();renderInspector();updateHud();drawLog();renderArrivals();renderCrisisSummary();}
  function frame(now){
    const dt=Math.min(.065,(now-last)/1000);last=now;
    tick(dt);drawScene(now);
    panelTime+=dt;saveTime+=dt;
    if(panelTime>.45){
      panelTime=0;updateHud();updateExpeditionProgressUi();
      if(!$('securityModal').classList.contains('hidden'))renderSecurity();
      if(selection&&selection.kind==='project')renderInspector();
      if(selection&&selection.kind==='resident')renderInspector();
      const e=state.expedition;
      if(e&&!$('expeditionModal').classList.contains('hidden')){
        const k=e.phase+'|'+(e.action?e.action.index:'none');
        if(expeditionRepaintKey!==k)renderExpedition();
      }
    }
    if(saveTime>14){saveTime=0;saveGame();}
    requestAnimationFrame(frame);
  }

  state=window.VDSystems.normalize(loadGame());
  for(const site of SITES){
    if(!state.sites.find(p=>p.id===site.id))
      state.sites.push({id:site.id,rooms:site.rooms.map(()=>({searched:false}))});
  }
  attachEvents();resizeCanvas();renderAll();showIntro();
  requestAnimationFrame(frame);
})();