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
    garden: { name: 'Hydroponics', cost: { scrap: 8, parts: 1 }, power: 0, use: 2, color: '#8ac69b', glyph: '❈' }
  };
  const SURVIVORS = [
    { id: 1, name: 'Mara Voss', role: 'Mechanic', strength: 7, skin: '#b68b6c', hair: '#312720', coat: '#779c8e', x: 8.2, y: 7, energy: 87, hunger: 88, thirst: 89, health: 100, morale: 74 },
    { id: 2, name: 'Eli Mercer', role: 'Surveyor', strength: 5, skin: '#e1b58b', hair: '#4b382e', coat: '#aa8971', x: 10, y: 7, energy: 85, hunger: 82, thirst: 91, health: 100, morale: 70 },
    { id: 3, name: 'Iris Chen', role: 'Medic', strength: 3, skin: '#c89c80', hair: '#222c30', coat: '#7c8eaa', x: 11.6, y: 7, energy: 86, hunger: 86, thirst: 86, health: 100, morale: 76 }
  ];
  const SITES = [
    { id: 'clinic', name: 'Abandoned clinic', icon: '✚', subtitle: 'Medicine, water and supplies', threat: 'LOW · UNSTABLE INTERIOR',
      rooms: [
        { name: 'Reception', icon: '▣', kind: 'Search', loot: { food: 2, water: 1, scrap: 1 }, danger: 0 },
        { name: 'Pharmacy', icon: '✚', kind: 'Search', loot: { food: 1, water: 3, parts: 1 }, danger: 0 },
        { name: 'Treatment', icon: '◇', kind: 'Search', loot: { water: 2, scrap: 3 }, danger: 6 },
        { name: 'Backup plant', icon: 'ϟ', kind: 'Salvage', loot: { scrap: 6, parts: 2 }, danger: 0 }
      ] },
    { id: 'station', name: 'Roadside station', icon: '⌁', subtitle: 'Rations and usable hardware', threat: 'LOW · EXPOSED STRUCTURE',
      rooms: [
        { name: 'Shop front', icon: '▤', kind: 'Search', loot: { food: 4, water: 1 }, danger: 0 },
        { name: 'Stockroom', icon: '◫', kind: 'Search', loot: { food: 3, water: 2, scrap: 1 }, danger: 0 },
        { name: 'Garage', icon: '⚙', kind: 'Salvage', loot: { scrap: 6, parts: 1 }, danger: 4 },
        { name: 'Workshop', icon: '⚒', kind: 'Salvage', loot: { scrap: 5, parts: 2 }, danger: 0 }
      ] },
    { id: 'depot', name: 'Freight depot', icon: '▥', subtitle: 'Metal and industrial components', threat: 'ELEVATED · FALLING DEBRIS',
      rooms: [
        { name: 'Gatehouse', icon: '⌑', kind: 'Search', loot: { water: 2, food: 1 }, danger: 0 },
        { name: 'Warehouse', icon: '▥', kind: 'Salvage', loot: { scrap: 8 }, danger: 7 },
        { name: 'Maintenance', icon: '⚙', kind: 'Salvage', loot: { scrap: 6, parts: 3 }, danger: 0 },
        { name: 'Loading bay', icon: '◈', kind: 'Salvage', loot: { scrap: 7, parts: 1 }, danger: 9 }
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
      version: 1, minutes: 480, speed: 1, paused: false, nextId: 1,
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
        if (value.version === 1 && Array.isArray(value.terrain) && value.terrain.length === ROWS &&
            Array.isArray(value.survivors) && value.survivors.length === 3 &&
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
    const generation = state.rooms.filter(r=>r.type==='generator').length * ROOM_TYPES.generator.power;
    const demand = state.rooms.reduce((n,r)=>n+ROOM_TYPES[r.type].use,0);
    return {generation,demand,online:generation>0 && generation>=demand};
  }
  function roomActive(room) {
    return room.type === 'generator' || room.type === 'bunks' || powerData().online;
  }
  function cellFree(x,y) {return valid(x,y) && state.terrain[y][x] === 0;}
  function walkable(x,y) {
    return cellFree(x,y) && (!isSurface(x,y));
  }
  function isSurface(x,y){return y < 3;}
  function movementAllowed(a,b) {
    if (!cellFree(b.x,b.y)) return false;
    if (a.y === b.y) return true;
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
    worldWrap.classList.toggle('tool-build',tool==='build');
    $('toolHint').textContent=tool==='dig'?'Click and drag across solid earth beside the existing passage. Confirm workers in the right panel.':
      tool==='build'?'Drag sideways across cleared space to place '+ROOM_TYPES[buildType].name+'. The preview snaps to a standard floor.':
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
      r.taskId=p.id;r.state='idle';r.path=[];r.wait=0;
    }
    const newStart=p.status==='planned';p.status='active';
    if(p.kind==='dig'){flag('assign');report(p.workers.length+' survivor(s) assigned to the excavation zone.');}
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
    for(const r of state.survivors)if(r.taskId===id){r.taskId=null;r.state='idle';r.path=[];}
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
      state.rooms.push({id:nextId(),type:p.roomType,x:p.x,y:p.y,width:p.width});
      flag('build');report(ROOM_TYPES[p.roomType].name+' construction complete. The room is now operational.');
      toast('ROOM ONLINE · '+ROOM_TYPES[p.roomType].name.toUpperCase());
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
      if(r.hunger<57 && state.resources.food>0){state.resources.food--;r.hunger=Math.min(100,r.hunger+36);report(r.name+' ate a ration.');}
      if(r.thirst<57 && state.resources.water>0){state.resources.water--;r.thirst=Math.min(100,r.thirst+39);report(r.name+' drank water.');}
      if((r.hunger<12||r.thirst<12)&&Math.random()<dt*.06){r.health=Math.max(0,r.health-1);r.morale=Math.max(0,r.morale-2);}
      if(r.energy<24 && r.state!=='resting'){r.state='resting';r.path=[];r.wait=0;report(r.name+' is taking an essential rest break.');}
      if(r.state==='resting'){
        const bunks=state.rooms.some(room=>room.type==='bunks');
        r.energy=Math.min(100,r.energy+dt*(bunks?2.7:1.1));
        if(r.energy>=80){r.state='idle';report(r.name+' is rested and returning to their assignment.');}
        continue;
      }
      const p=projectFor(r.taskId);
      if(!p||p.status!=='active'){r.taskId=null;r.path=[];r.state='idle';continue;}
      if(p.kind==='dig'){
        if(r.path && r.path.length){walkPath(r,r.path,dt);continue;}
        const target=chooseDigTarget(r,p);
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
          delete state.digProgress[k];r.energy=Math.max(0,r.energy-.3);
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
        if(Math.abs(target-e.position)<.012){e.position=target;e.action.phase='searching';}
      }else{
        e.action.progress+=dt;
        if(e.action.progress>=e.action.duration){
          const site=siteById(e.site), room=site.rooms[e.action.index];
          const progress=state.sites.find(s=>s.id===e.site);
          progress.rooms[e.action.index].searched=true;
          for(const k of Object.keys(room.loot)){e.loot[k]=(e.loot[k]||0)+room.loot[k];}
          if(room.danger){
            const r=state.survivors.find(s=>s.id===e.crew[0]);
            if(r){r.health=Math.max(1,r.health-room.danger);}
            e.message=room.name+' cleared. Loose debris injured '+(r?r.name:'a survivor')+' (−'+room.danger+' health). Found '+lootString(room.loot)+'.';
          }else e.message=room.name+' searched. Found '+lootString(room.loot)+'.';
          e.action=null;report(e.message,!!room.danger);saveGame();renderExpedition();
        }
      }
    }
  }
  function tick(dt) {
    if(state.paused)return;
    const step=dt*state.speed;
    state.minutes+=step*2.3;
    updateProjectWorkers(step);
    updateExpedition(step);
    state.productionTime+=step;
    if(state.productionTime>=14){
      state.productionTime-=14;
      if(powerData().online){
        const water=state.rooms.filter(r=>r.type==='water').length;
        const garden=state.rooms.filter(r=>r.type==='garden').length;
        if(water){state.resources.water+=water*2;report('Water treatment produced '+water*2+' clean water.');}
        if(garden){state.resources.food+=garden*2;report('Hydroponics harvested '+garden*2+' rations.');}
      }
      const avg=state.survivors.reduce((v,r)=>v+r.morale,0)/3;
      if(state.resources.food===0||state.resources.water===0)
        state.survivors.forEach(r=>r.morale=Math.max(4,r.morale-.6));
      else if(avg<75)state.survivors.forEach(r=>r.morale=Math.min(82,r.morale+.2));
    }
  }
  function siteById(id){return SITES.find(s=>s.id===id);}
  function lootString(loot){
    const names={scrap:'salvage',parts:'components',food:'rations',water:'water'};
    const entries=Object.entries(loot).filter(([,n])=>n>0).map(([k,n])=>n+' '+(names[k]||k));
    return entries.length?entries.join(', '):'no supplies';
  }
  function selectSite(id){viewedSite=id;renderExpedition();}
  function launchExpedition() {
    if(state.expedition){toast('A scavenging team is already deployed.');return;}
    const crew=Array.from(chosenCrew);
    if(!crew.length){toast('Choose at least one available survivor.');return;}
    if(crew.some(id=>{const r=state.survivors.find(s=>s.id===id);return !r||r.taskId;})){toast('Assigned workers must finish or leave their current job first.');return;}
    state.expedition={site:viewedSite,crew,phase:'outbound',travel:0,position:0.16,action:null,loot:{food:0,water:0,scrap:0,parts:0},message:'Traveling to the site. Arrival in approximately six seconds.'};
    for(const id of crew){const r=state.survivors.find(s=>s.id===id);r.state='expedition';r.path=[];}
    chosenCrew.clear();report('Scavenging team departed for '+siteById(viewedSite).name+'.');renderExpedition();saveGame();
  }
  function exploreRoom(index) {
    const e=state.expedition;if(!e||e.phase!=='exploring'||e.action)return;
    const siteState=state.sites.find(s=>s.id===e.site);
    if(!siteState||siteState.rooms[index].searched){toast('That section has already been searched.');return;}
    const room=siteById(e.site).rooms[index];
    e.action={index,phase:'walking',progress:0,duration:room.kind==='Salvage'?5:3};
    e.message='Moving to '+room.name+' to '+room.kind.toLowerCase()+' the area.';
    renderExpedition();
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
      }else drawBuildFrame(p);
    }
    for(const room of state.rooms)drawRoom(room,now);
    for(const r of state.survivors) {
      if(state.expedition && state.expedition.crew.includes(r.id))continue;
      drawSurvivor(r,now);
    }
    if(drag && drag.kind!=='pan')drawDragHighlight(drag.start,drag.current);
    if(hoverCell&&tool==='dig'&&valid(hoverCell.x,hoverCell.y)) {
      ctx.lineWidth=1.2;ctx.strokeStyle='#d6bc84';ctx.strokeRect(hoverCell.x*T+1,hoverCell.y*T+1,T-2,T-2);
    }
  }
  function drawTile(x,y) {
    const px=x*T,py=y*T,v=hash(x,y);
    if(state.terrain[y][x]===1) {
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
    ctx.fillStyle='#c8c5ab';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.fillText(def.name.toUpperCase(),x+13,y+22);
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
    if(!online && room.type!=='generator'){
      ctx.fillStyle='rgba(3,7,11,.43)';ctx.fillRect(x+8,y+12,w-16,h-23);
      ctx.fillStyle='#e4a484';ctx.font='bold 10px sans-serif';ctx.fillText('NO POWER',x+15,y+h-19);
    }
    ctx.strokeStyle=def.color;ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,w-2,h-2);
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
    const r=state.resources,p=powerData();
    $('popValue').textContent=state.survivors.length+' / '+state.survivors.length;
    $('powerValue').textContent=p.generation+' / '+p.demand;
    $('foodValue').textContent=fmt(r.food);
    $('waterValue').textContent=fmt(r.water);
    $('scrapValue').textContent=fmt(r.scrap);
    $('partsValue').textContent=fmt(r.parts);
    const morale=state.survivors.reduce((a,v)=>a+v.morale,0)/state.survivors.length;
    $('moraleValue').textContent=Math.round(morale)+'%';
    $('dayClock').textContent=timeString();
    const hour=Math.floor((state.minutes%1440)/60);
    $('dayPhase').textContent=hour>=7&&hour<19?'SURFACE DAYLIGHT':'SURFACE NIGHT';
    $('worldStatus').textContent=state.rooms.length?'EXPANDING SHELTER':'UNDEVELOPED';
    $('worldSubStatus').textContent=state.rooms.length ? state.rooms.length+' BUILT ROOMS · '+state.projects.filter(p=>p.status==='active').length+' WORK ORDERS' : 'NO FUNCTIONAL ROOMS';
    $('pauseBtn').textContent=state.paused?'▶':'Ⅱ';
    document.querySelectorAll('.speed').forEach(b=>b.classList.toggle('active',Number(b.dataset.speed)===state.speed));
    $('worldLabel').textContent=state.rooms.length?'SECTOR 01 · DEVELOPING SHELTER':'SECTOR 01 · ABANDONED ENTRY';
    const tutorialComplete=Object.values(state.tutorialFlags).every(Boolean);
    if(tutorialComplete&&state.tutorialEnabled){$('tutorialNote').textContent='Orientation complete. The shelter is yours to develop. You can hide this guide anytime.';}
  }
  function renderTutorial(){
    const panel=$('tutorialPanel');
    panel.classList.toggle('hidden',!state.tutorialEnabled);
    const steps=[
      ['inspect','Inspect a survivor'],
      ['dig','Mark an excavation'],
      ['assign','Assign a digger'],
      ['build','Finish your first room'],
      ['scavenge','Return from scavenging']
    ];
    $('tutorialTasks').innerHTML=steps.map(([k,label],i)=>
      '<div class="tutorial-task'+(state.tutorialFlags[k]?' done':'')+'"><strong>'+(state.tutorialFlags[k]?'✓':String(i+1).padStart(2,'0'))+'</strong><span>'+label+'</span></div>').join('');
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
    const body=$('inspectorBody');
    if(!selection){
      $('inspectorTitle').textContent='Your survivors';
      $('inspectorSubtitle').textContent='Three people. All shelter work is physical.';
      const jobs=state.projects.filter(p=>p.status==='active'||p.status==='planned');
      body.innerHTML=state.survivors.map(s=>
        '<div class="survivor-card" role="button" tabindex="0" data-action="inspect-resident" data-id="'+s.id+'">'+
        '<div class="avatar">'+s.name[0]+'</div><div><div class="resident-title">'+s.name+'</div>'+
        '<div class="resident-sub">'+s.role+' · STR '+s.strength+'</div><div class="mini-state">'+s.state.toUpperCase()+'</div></div></div>').join('')+
        '<div class="divider"></div><p class="small-head">Active work orders</p>'+
        (jobs.length?jobs.map(p=>'<button class="worker-choice" data-action="inspect-project" data-id="'+p.id+'"><span>'+(p.kind==='dig'?'⚒ Excavation':'▣ '+ROOM_TYPES[p.roomType].name)+'</span><small>'+p.status.toUpperCase()+'</small></button>').join(''):'<p class="helper">No active work orders. Start by marking an excavation area.</p>');
      return;
    }
    if(selection.kind==='resident'){
      const s=state.survivors.find(r=>r.id===selection.id);
      if(!s){selection=null;renderInspector();return;}
      $('inspectorTitle').textContent=s.name;
      $('inspectorSubtitle').textContent='Personal condition · '+s.role;
      body.innerHTML=detailSummary(s);return;
    }
    if(selection.kind==='room'){
      const room=state.rooms.find(r=>r.id===selection.id);
      if(!room){selection=null;renderInspector();return;}
      const def=ROOM_TYPES[room.type];
      $('inspectorTitle').textContent=def.name;
      $('inspectorSubtitle').textContent='Constructed · level '+room.y+' · '+room.width+' tiles wide';
      const p=powerData();
      body.innerHTML='<div class="detail-card"><p class="small-head">ROOM OPERATIONS</p>'+
        '<span class="pill '+(!roomActive(room)?'warn':'')+'">'+(roomActive(room)?'OPERATIONAL':'OFFLINE · NO POWER')+'</span>'+
        '<p class="helper">'+(room.type==='generator'?'Provides '+def.power+' grid power.':
          room.type==='bunks'?'Improves resident recovery while resting.':
          room.type==='water'?'Produces 2 water every production cycle while powered.':
          'Produces 2 rations every production cycle while powered.')+'</p>'+
        '<p class="inspector-info">Grid '+p.generation+' generated / '+p.demand+' required</p>'+
        '<button class="secondary-btn" data-action="back">← SETTLEMENT</button></div>';return;
    }
    if(selection.kind==='project'){
      const p=projectFor(selection.id);
      if(!p){selection=null;renderInspector();return;}
      $('inspectorTitle').textContent=p.kind==='dig'?'Excavation order':'Construction order';
      $('inspectorSubtitle').textContent=p.kind==='dig'?'Manual digging · partial progress is saved':ROOM_TYPES[p.roomType].name+' · '+p.width+' tiles wide';
      const done=p.kind==='dig'?p.cells.filter(c=>!state.terrain[c.y][c.x]).length:0;
      const progress=p.kind==='dig'?done/Math.max(p.cells.length,1)*100:p.progress/(13+p.width*.6)*100;
      if(p.status==='planned' && !chosenWorkers.size && p.workers.length)chosenWorkers=new Set(p.workers);
      const workers=state.survivors.map(r=>{
        const assigned=chosenWorkers.has(r.id);
        const busy=r.taskId&&r.taskId!==p.id;
        const away=state.expedition&&state.expedition.crew.includes(r.id);
        return '<button class="worker-choice '+(assigned?'chosen':'')+'" data-action="choose-worker" data-id="'+r.id+'"'+(away?' disabled':'')+'>'+
          '<span>'+(assigned?'✓ ':'○ ')+r.name+(busy?' · REASSIGN':'')+'</span><small>STR '+r.strength+'</small></button>';
      }).join('');
      const costs=p.kind==='build'?ROOM_TYPES[p.roomType].cost:null;
      body.innerHTML='<div class="detail-card"><span class="pill '+(p.status==='planned'?'warn':'')+'">'+p.status.toUpperCase()+'</span>'+
        '<p class="small-head" style="margin-top:14px">'+(p.kind==='dig'?p.cells.length+' EARTH TILES':ROOM_TYPES[p.roomType].name.toUpperCase())+'</p>'+
        '<p class="helper">'+(p.kind==='dig'?'Residents physically move along accessible passages, dig reachable terrain, and keep partial progress after breaks.':
          'Workers must walk to the cleared construction area before assembling equipment.')+'</p>'+
        '<div class="stat"><div class="stat-header"><span>Progress</span><strong>'+Math.round(progress)+'%</strong></div>'+
        '<div class="progress-track"><div class="progress-fill" style="width:'+bound(progress,0,100)+'%"></div></div></div>'+
        (costs?'<p class="inspector-info">Cost: '+costs.scrap+' salvage'+(costs.parts?', '+costs.parts+' components':'')+
          (p.status==='active'?' · RESERVED':' · DUE ON CONFIRM')+'</p>':'')+
        '<p class="small-head">ASSIGN SPECIFIC RESIDENTS</p>'+workers+
        '<button class="primary-btn" data-action="start-project" data-id="'+p.id+'">'+(p.status==='planned'?'CONFIRM & ASSIGN CREW':'UPDATE WORK CREW')+' →</button>'+
        '<button class="secondary-btn" data-action="cancel-project" data-id="'+p.id+'">CANCEL WORK ORDER</button>'+
        '<button class="secondary-btn" data-action="back">← RETURN TO SETTLEMENT</button></div>';return;
    }
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
          const active=chosenCrew.has(r.id),busy=!!r.taskId;
          return '<label class="expedition-avatar '+(active?'active':'')+'"><span>'+r.name+' · '+r.role+(busy?' · ON DUTY':'')+'</span>'+
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
          '<p class="inspector-info">BACKPACK: '+lootString(e.loot)+'</p>'+
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
      state=makeNewGame();tool='inspect';buildType=null;selection=null;chosenWorkers.clear();
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
    $('closeExpedition').addEventListener('click',closeExpedition);
    $('expeditionContent').addEventListener('click',ev=>{
      const site=ev.target.closest('[data-site]');
      if(site){selectSite(site.dataset.site);return;}
      const explore=ev.target.closest('[data-explore]');
      if(explore){exploreRoom(Number(explore.dataset.explore));return;}
      if(ev.target.closest('#launchExpedition'))launchExpedition();
      if(ev.target.closest('#returnExpedition'))recallExpedition();
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
      else if(action==='focus-resident'){
        const r=state.survivors.find(s=>s.id===id);
        if(r){camera.x=(r.x+.5)*T-screenWidth/camera.zoom/2;camera.y=(r.y+.5)*T-screenHeight/camera.zoom/2;clampCamera();}
      }
      else if(action==='back'){selection=null;chosenWorkers.clear();renderInspector();}
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
      else if(!old.moved){
        const pt=screenToWorld(screenPosition(ev));
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
  function renderAll(){renderTutorial();renderInspector();updateHud();drawLog();}
  function frame(now){
    const dt=Math.min(.065,(now-last)/1000);last=now;
    tick(dt);drawScene(now);
    panelTime+=dt;saveTime+=dt;
    if(panelTime>.45){
      panelTime=0;updateHud();updateExpeditionProgressUi();
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

  state=loadGame();
  attachEvents();resizeCanvas();renderAll();showIntro();
  requestAnimationFrame(frame);
})();