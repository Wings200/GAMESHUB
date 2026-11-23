(() => {
  'use strict';
  const M=window.VaultModel,A=window.VaultArt;
  const $=id=>document.getElementById(id);
  const world=$('world'),stage=$('stage'),ctx=world.getContext('2d',{alpha:false});
  if(!ctx||!M||!A){console.error('VAULT DIRECTIVE: graphics or simulation failed to load.');return;}
  let s=M.load(),camera={x:0,y:0,zoom:1},width=900,height=550,deviceRatio=1,firstResize=true;
  let mode='inspect',roomType=null,selected=null,selectedWorker=null,drag=null,hover=null;
  let modalType=null,modalSignature='',selectedSite='clinic',crew=new Set();
  let inspectTime=0,hudTime=0,saveTime=0,lastFrame=performance.now(),noticeTimer=0,gameOverPresented=false;
  let toastTimer=null,uiClock=0;
  const cls=(el,name,truth)=>el.classList.toggle(name,!!truth);
  const num=v=>Math.floor(v||0),n1=v=>(v||0).toFixed(1),pct=v=>Math.max(0,Math.min(100,v||0));
  const ehtml=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function clock(){
    const min=Math.floor(s.time%1440),day=Math.floor(s.time/1440)+1;
    return 'DAY '+String(day).padStart(2,'0')+' · '+String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0');
  }
  function toast(text){
    const el=$('toast');el.textContent=text;el.classList.remove('hidden');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),3300);
  }
  function result(r){
    if(!r||!r.ok){toast(r?.msg||'This action could not be completed.');return false;}
    refresh();M.save(s);return true;
  }
  function syncGuidance(){renderGuide();renderRoster();renderHud();}
  function resize(){
    const box=stage.getBoundingClientRect(),oldW=width,oldH=height;
    width=Math.max(300,box.width);height=Math.max(260,box.height);deviceRatio=Math.min(2,window.devicePixelRatio||1);
    world.width=Math.round(width*deviceRatio);world.height=Math.round(height*deviceRatio);
    if(firstResize){camera.zoom=width<600?.95:width<950?.91:1.07;
      centerEntrance();firstResize=false;}
    else{camera.x+=(oldW-width)/camera.zoom/2;camera.y+=(oldH-height)/camera.zoom/2;limitCamera();}
  }
  function limitCamera(){
    camera.zoom=M.clamp(camera.zoom,.57,1.8);
    camera.x=M.clamp(camera.x,-55,M.W*M.TILE-width/camera.zoom+130);
    camera.y=M.clamp(camera.y,-75,M.H*M.TILE-height/camera.zoom+130);
  }
  function centerEntrance(){
    const tx=width<620?8.8:11,ty=width<620?3.9:4.1;
    camera.x=tx*M.TILE-width/(2*camera.zoom);
    camera.y=ty*M.TILE-height/(2*camera.zoom);
    limitCamera();
  }
  function centerOn(x,y){
    camera.x=(x+.5)*M.TILE-width/(2*camera.zoom);
    camera.y=(y+.5)*M.TILE-height/(2*camera.zoom);
    limitCamera();
  }
  function zoom(v,point={x:width/2,y:height/2}){
    const old=camera.zoom,wx=camera.x+point.x/old,wy=camera.y+point.y/old;
    camera.zoom=M.clamp(camera.zoom*v,.57,1.8);
    camera.x=wx-point.x/camera.zoom;camera.y=wy-point.y/camera.zoom;limitCamera();
  }
  function point(ev){
    const r=world.getBoundingClientRect();return{x:ev.clientX-r.left,y:ev.clientY-r.top};
  }
  function tile(pos){
    return {x:Math.floor((camera.x+pos.x/camera.zoom)/M.TILE),
      y:Math.floor((camera.y+pos.y/camera.zoom)/M.TILE)};
  }
  function setMode(next,type=null){
    mode=next;roomType=type;drag=null;
    cls(stage,'dig',mode==='dig');cls(stage,'build',mode==='build');cls(stage,'door',mode==='door');cls(stage,'ladder',mode==='ladder');
    for(const b of document.querySelectorAll('.command[data-tool]'))cls(b,'active',b.dataset.tool===mode);
    $('toolStatus').textContent=mode==='dig'?'DRAG ACROSS CONNECTED EARTH TO EXCAVATE':
      mode==='build'?'DRAG A CHAMBER 3–6 TILES WIDE · '+(M.ROOM[type]?.name||''):
      mode==='door'?'CLICK A CLEAR CORRIDOR BETWEEN TWO PASSAGES':
      mode==='ladder'?'CLICK A DUG SHAFT NEXT TO ANOTHER LADDER':
      selectedWorker?'CLICK A ROOM TO ASSIGN '+M.getPerson(s,selectedWorker)?.name.toUpperCase():
      'SELECT A RESIDENT, ROOM OR ACTION';
    $('worldTip').textContent=mode==='inspect'?'DRAG TO PAN · SCROLL TO ZOOM · CLICK A RESIDENT OR ROOM':
      mode==='dig'?'DRAG A RECTANGLE THROUGH ROCK · AN AVAILABLE WORKER STARTS AUTOMATICALLY':
      mode==='build'?'ROOMS REQUIRE A THREE-TILE-HIGH EXCAVATED CHAMBER':
      mode==='door'?'CLICK A CORRIDOR TO INSTALL A PHYSICAL BLAST-DOOR CHAMBER':
      'LADDERS MUST CONNECT VERTICALLY THROUGH A CLEAR SHAFT';
    closeBuild();
  }
  function openBuild(){cls($('buildTray'),'hidden',false);renderBuild();}
  function closeBuild(){cls($('buildTray'),'hidden',true);}
  function renderBuild(){
    const pop=M.live(s).length,root=$('buildChoices');
    root.innerHTML=Object.entries(M.ROOM).map(([id,r])=>{
      const locked=pop<r.at;
      return '<button class="room-choice '+(locked?'locked':'')+'" data-build="'+id+'" '+(locked?'disabled':'')+'>'+
        '<div class="room-icon">'+r.icon+'</div><div><strong>'+ehtml(r.name)+'</strong>'+
        '<small>'+r.cost[0]+' salvage · '+r.cost[1]+' parts'+(locked?' · '+r.at+' POP REQUIRED':'')+'</small></div></button>';
    }).join('');
  }
  function renderHud(){
    const p=M.power(s),res=s.res,rate=s.rates||{food:0,water:0,fuel:0};
    const set=(id,value)=>{$(id).textContent=value;};
    set('clock',clock());set('power',n1(p.supply)+' / '+p.demand);
    set('powerState',p.supply>=p.demand?'STABLE':'SHORTFALL');
    set('powerRate',p.supply>=p.demand?'ONLINE':'⚠ LOW');
    set('food',n1(res.food));set('water',n1(res.water));set('fuel',n1(res.fuel));
    set('scrap',num(res.scrap));set('parts',num(res.parts));
    set('pop',M.live(s).length+' / '+M.capacity(s));
    set('happiness','HAPPINESS '+Math.round(M.live(s).reduce((n,p)=>n+p.morale,0)/Math.max(1,M.live(s).length))+'%');
    set('foodRate',(rate.food>0?'+':'')+n1(rate.food)+'/m');
    set('waterRate',(rate.water>0?'+':'')+n1(rate.water)+'/m');
    set('fuelRate',(rate.fuel>0?'+':'')+n1(rate.fuel)+'/m');
    set('worldState',s.gameOver?'SETTLEMENT LOST':s.threat?'HOSTILE BREACH':s.rooms.length?'GROWING SETTLEMENT':'NO FACILITIES ONLINE');
    set('lastReport',s.lastMessage);
    const percent=(v,c)=>Math.max(0,Math.min(100,v/c*100))+'%';
    $('powerFill').style.width=percent(p.supply,Math.max(1,p.demand*1.4));
    $('powerNeed').style.left=percent(p.demand,Math.max(1,p.demand*1.4));
    $('foodFill').style.width=percent(res.food,M.resourceCap(s,'food'));
    $('waterFill').style.width=percent(res.water,M.resourceCap(s,'water'));
    $('fuelFill').style.width=percent(res.fuel,M.resourceCap(s,'fuel'));
    cls($('pause'),'selected',s.paused);
    $('pause').textContent=s.paused?'▶':'Ⅱ';
    for(const b of document.querySelectorAll('[data-speed]'))cls(b,'selected',Number(b.dataset.speed)===s.speed&&!s.paused);
    const trouble=s.threat||s.incidents.length||s.events.some(e=>!e.cleared)||s.air<25;
    cls($('alertBadge'),'hidden',!trouble);
    if(trouble){
      const x=s.threat?s.threat.kind==='feral'?'FERAL OUTBREAK':'RAIDERS INSIDE':
        s.events.some(e=>!e.cleared)?'CAVE-IN · RESCUE REQUIRED':
        s.incidents.length?'INCIDENT IN SHELTER':'OXYGEN CRITICAL';
      $('alertTitle').textContent='⚠ '+x;
    }
    cls($('visitorNotice'),'hidden',!s.visitors.length);
    if(s.visitors.length)$('visitorText').textContent=s.visitors.length+' awaiting your decision · '+M.live(s).length+'/'+M.capacity(s)+' beds';
    cls($('hideGuide'),'hidden',!s.tutorial);
  }
  function renderRoster(){
    const people=s.people.filter(p=>!p.left);
    $('rosterCards').innerHTML=people.map(p=>
      '<button class="resident-thumb '+(selectedWorker===p.id?'selected':'')+'" data-person="'+p.id+'" '+
      'style="--hp:'+pct(p.hp)+'" title="'+ehtml(p.name)+'">'+
      '<span class="portrait">'+(p.hp<=0?'✝':p.name.charAt(0))+'</span>'+
      '<strong>'+ehtml(p.name.split(' ')[0])+'</strong>'+
      '<small>'+ehtml(p.hp<=0?'DECEASED':p.away?'SCAVENGING':p.state.toUpperCase())+'</small></button>').join('');
  }
  const STEP=[
    ['inspected','Meet your people','Click a survivor to see their skills, needs, and job status.'],
    ['dug','Make room underground','Choose EXCAVATE and drag across the highlighted earth. A free worker will start digging.'],
    ['built','Switch the lights on','Build your first generator in the cleared chamber. Your builder will walk there and construct it.'],
    ['staffed','Assign your first job','Click the generator, then assign an available resident to operate it.'],
    ['collected','Secure essential supplies','Build a water plant or canteen, assign workers, and click the room when its resource bubble appears.'],
    ['expedition','Explore the wasteland','Open the WASTELAND MAP, send a scout, search rooms, and bring supplies home.'],
    ['admitted','Welcome a new survivor','Build living quarters to create beds, then admit a refugee waiting at the hatch.'],
    ['door','Prepare for trouble','Install a reinforced blast-door chamber in a connected corridor.']
  ];
  function currentStep(){return STEP.find(([key])=>!s.tasks[key]);}
  function renderGuide(){
    cls($('objective'),'hidden',!s.tutorial);
    if(!s.tutorial)return;
    const step=currentStep(),done=STEP.filter(([key])=>s.tasks[key]).length;
    $('objectiveCount').textContent=String(done+1).padStart(2,'0')+' / '+String(STEP.length).padStart(2,'0');
    $('objectiveTitle').textContent=step?step[1]:'The shelter is yours';
    $('objectiveText').textContent=step?step[2]:'Orientation complete. Keep growing, managing people, and exploring at your own pace.';
    $('objectiveGo').textContent=step?'SHOW ME ↗':'ALL OBJECTIVES COMPLETE ✓';
    $('objectiveGo').disabled=!step;
  }
  function guideAction(){
    const step=currentStep()?.[0];if(!step)return;
    if(step==='inspected'){openSelectPerson(s.people[0].id);return;}
    if(step==='dug'){setMode('dig');centerOn(12.5,3.5);toast('Drag across the glowing earth (all three rows).');return;}
    if(step==='built'){setMode('build','generator');centerOn(13,3.5);toast('Drag from one side of the cleared chamber to the other.');return;}
    if(step==='staffed'){const r=s.rooms.find(r=>r.type==='generator');if(r)openSelectRoom(r.id);else openBuild();return;}
    if(step==='collected'){const r=s.rooms.find(r=>r.ready);if(r)openSelectRoom(r.id);else openBuild();return;}
    if(step==='expedition'){openModal('map');return;}
    if(step==='admitted'){if(s.visitors.length)openModal('visitors');else{setMode('build','bunks');toast('Make living quarters first. Refugees arrive over time.');}return;}
    if(step==='door'){setMode('door');toast('Dig a connected corridor with space on both sides for a blast door.');}
  }
  function openSelectPerson(id){
    const p=M.getPerson(s,id);if(!p)return;
    selected={kind:'person',id};selectedWorker=id;s.tasks.inspected=true;
    if(!p.away)centerOn(p.x,p.y);
    renderInspector();renderRoster();renderGuide();
    $('toolStatus').textContent=p.name.toUpperCase()+' SELECTED · CLICK A ROOM TO ASSIGN';
  }
  function openSelectRoom(id){selected={kind:'room',id};renderInspector();}
  function openSelectJob(id){selected={kind:'job',id};renderInspector();}
  function openSelectDoor(id){selected={kind:'door',id};renderInspector();}
  function openSelectTrap(id){selected={kind:'trap',id};renderInspector();}
  function clearSelect(){selected=null;cls($('inspector'),'hidden',true);}
  function need(p,name,val){
    return '<div class="mini-progress"><span style="width:70px">'+name+'</span><div class="rail"><span style="width:'+pct(val)+
      '%;background:'+(val<30?'#dc947c':val<55?'#d9ba7e':'#91bd9c')+'"></span></div><em>'+Math.round(val)+'%</em></div>';
  }
  function skills(p){return '<div class="stats-grid">'+M.SKILLS.map(k=>'<span>'+k+'<b>'+p.skills[k]+'</b></span>').join('')+'</div>';}
  function renderInspector(){
    if(!selected){cls($('inspector'),'hidden',true);return;}
    cls($('inspector'),'hidden',false);
    const root=$('inspectorContent'),m=M,pick=selected;
    if(pick.kind==='person'){
      const p=m.getPerson(s,pick.id);if(!p){clearSelect();return;}
      const opts='<option value="none">Unassigned / General duty</option>'+s.rooms.filter(r=>m.ROOM[r.type].workers)
        .map(r=>'<option value="'+r.id+'" '+(r.id===p.roomId?'selected':'')+'>'+m.ROOM[r.type].name+' (level '+r.level+')</option>').join('');
      root.innerHTML='<div class="inspector-hero"><span class="inspector-badge">'+ehtml(p.role.toUpperCase())+'</span>'+
        '<h2>'+ehtml(p.name)+'</h2><p>LEVEL '+p.level+' · AGE '+p.age+' · '+ehtml(p.state.toUpperCase())+
        ' · DEFENCE '+p.weapon+'</p></div>'+
        skills(p)+need(p,'HEALTH',p.hp)+need(p,'ENERGY',p.energy)+need(p,'FOOD',p.hunger)+
        need(p,'WATER',p.thirst)+need(p,'MORALE',p.morale)+(p.infection?need(p,'INFECTION',p.infection):'')+
        '<div class="modal-divider"></div>'+
        '<span class="inspector-label">ASSIGNMENT</span><select id="residentJob" class="inspector-select" data-person="'+p.id+'" '+(p.child||p.hp<=0?'disabled':'')+'>'+opts+'</select>'+
        '<span class="inspector-label">SCHEDULE</span><select id="residentShift" class="inspector-select" data-person="'+p.id+'">'+
        ['flex','day','night'].map(v=>'<option value="'+v+'" '+(p.shift===v?'selected':'')+'>'+({flex:'Flexible',day:'Day shift',night:'Night shift'}[v])+'</option>').join('')+'</select>'+
        '<button class="inspector-button" data-action="medicine" data-id="'+p.id+'">✚ TREAT WITH MEDICINE (1)</button>'+
        '<button class="inspector-button" data-action="equip" data-id="'+p.id+'">⚒ UPGRADE WEAPON (3 METAL / 1 PART)</button>'+
        '<button class="inspector-button" data-action="defend" data-id="'+p.id+'">◇ ASSIGN TO DEFENCE</button>'+
        '<p class="inspector-subtle">Tip: select this resident, then click a room to assign them directly.</p>';
      return;
    }
    if(pick.kind==='room'){
      const r=m.getRoom(s,pick.id);if(!r){clearSelect();return;}
      const def=m.ROOM[r.type],crew=m.team(s,r),power=m.powered(s,r),workers=s.people.filter(p=>p.roomId===r.id&&p.hp>0);
      const eligible=m.live(s).filter(p=>!p.child&&!p.away);
      root.innerHTML='<div class="inspector-hero"><span class="inspector-badge">'+(r.captured?'HOSTILE OCCUPATION':power?'SYSTEM ONLINE':'UNPOWERED')+'</span>'+
        '<h2>'+ehtml(def.name)+'</h2><p>'+ehtml(def.desc)+'</p></div>'+
        '<div class="inspector-row"><span>Floor / level</span><b>'+Math.floor((r.y-2)/3+1)+' / '+r.level+'</b></div>'+
        '<div class="inspector-row"><span>Room power</span><b>'+def.draw+' load · '+(power?'ONLINE':'OFFLINE')+'</b></div>'+
        '<div class="inspector-row"><span>Assigned workers</span><b>'+workers.length+' / '+Math.min(def.workers||0,r.w)+'</b></div>'+
        need(r,'INTEGRITY',r.integrity)+need(r,'AIR',r.air)+
        (def.cycle?need(r,'PRODUCTION',r.ready?100:r.progress/(def.cycle/(1+.02*crew.reduce((n,p)=>n+p.skills[def.skill],0)+.16*(r.level-1)))*100):'')+
        (r.ready?'<button class="inspector-button primary" data-action="collect" data-id="'+r.id+'">◈ COLLECT SUPPLIES →</button>':'')+
        (def.workers?'<span class="inspector-label">ASSIGN A WORKER</span>'+
          eligible.map(p=>'<button class="inspector-button" data-action="staff" data-id="'+p.id+'" data-room="'+r.id+'">'+
          (p.roomId===r.id?'✓ ':'＋ ')+ehtml(p.name)+' · '+def.skill+' '+p.skills[def.skill]+'</button>').join(''):'')+
        (def.cycle?'<button class="inspector-button" data-action="rush" data-id="'+r.id+'">ϟ RUSH PRODUCTION · FIRE RISK</button>':'')+
        '<button class="inspector-button" data-action="upgrade" data-id="'+r.id+'" '+(r.level>=3?'disabled':'')+
          '>↑ UPGRADE FACILITY · LEVEL '+Math.min(3,r.level+1)+'</button>'+
        '<button class="inspector-button" data-action="repair" data-id="'+r.id+'">⚒ REPAIR / RECLAIM (3 METAL)</button>'+
        '<span class="inspector-label">POWER PRIORITY</span><select id="roomPriority" class="inspector-select" data-room="'+r.id+'">'+
        [1,2,3].map(v=>'<option value="'+v+'" '+(v===r.priority?'selected':'')+'>'+({1:'Critical',2:'Normal',3:'Low'}[v])+'</option>').join('')+'</select>'+
        (r.type==='bunks'?'<button class="inspector-button" data-action="family" data-id="'+r.id+'">♡ FAMILY PLANNING</button>':'')+
        (r.type==='workshop'?'<button class="inspector-button" data-action="workshop" data-id="'+r.id+'">⚒ OPEN CRAFTING BENCH</button>':'');
      return;
    }
    if(pick.kind==='job'){
      const j=s.jobs.find(j=>j.id===pick.id&&!j.done&&!j.cancelled);if(!j){clearSelect();return;}
      const pctJob=j.kind==='dig'?j.cells.filter(c=>s.terrain[c.y][c.x]===0).length/j.cells.length*100:j.progress/(j.required||20)*100;
      root.innerHTML='<div class="inspector-hero"><span class="inspector-badge">ACTIVE WORK ORDER</span>'+
        '<h2>'+ehtml(j.kind==='dig'?'EXCAVATION':j.kind==='rescue'?'EMERGENCY RESCUE':j.kind==='upgrade'?'ROOM UPGRADE':'CONSTRUCTION')+'</h2>'+
        '<p>Workers travel to the actual site, then complete this order physically.</p></div>'+
        need(j,'PROGRESS',pctJob)+
        '<p class="inspector-subtle">Assigned: '+(j.workers.map(id=>m.getPerson(s,id)?.name).filter(Boolean).join(', ')||'Nobody yet')+'</p>'+
        '<span class="inspector-label">ADD A WORKER</span>'+
        m.live(s).filter(p=>!p.child&&!p.away&&!p.trapped).map(p=>
          '<button class="inspector-button" data-action="jobworker" data-id="'+p.id+'" data-job="'+j.id+'">'+
          (j.workers.includes(p.id)?'✓ ':'＋ ')+ehtml(p.name)+' · STRENGTH '+p.skills.S+'</button>').join('')+
        '<button class="inspector-button danger" data-action="canceljob" data-id="'+j.id+'">CANCEL WORK ORDER</button>';
      return;
    }
    if(pick.kind==='door'){
      const d=s.doors.find(d=>d.id===pick.id);if(!d){clearSelect();return;}
      root.innerHTML='<div class="inspector-hero"><span class="inspector-badge">'+(d.closed?'SEALED':'OPEN')+'</span>'+
        '<h2>BLAST-DOOR CHAMBER</h2><p>Real steel walls separate real corridors. Only this doorway can seal this passage.</p></div>'+
        need(d,'DURABILITY',d.hp)+
        '<button class="inspector-button primary" data-action="toggle" data-id="'+d.id+'">'+(d.closed?'OPEN PASSAGE':'INITIATE LOCKDOWN')+'</button>'+
        '<button class="inspector-button" data-action="repair" data-id="'+d.id+'">⚒ REPAIR STRUCTURE (3 METAL)</button>'+
        '<p>Be careful: sealing a door can cut off residents, room electricity, and fresh air.</p>';
      return;
    }
    if(pick.kind==='trap'){
      const t=s.events.find(e=>e.id===pick.id&&!e.cleared);if(!t){clearSelect();return;}
      root.innerHTML='<div class="inspector-hero"><span class="inspector-badge">ACTIVE RESCUE</span><h2>CAVE-IN</h2>'+
        '<p>Someone is trapped beneath unstable ground. They need an accessible rescue team.</p></div>'+
        '<div class="inspector-row"><span>Oxygen remaining</span><strong>'+num(t.air)+' seconds</strong></div>'+
        '<div class="inspector-row"><span>Trapped</span><strong>'+t.victims.map(id=>ehtml(m.getPerson(s,id)?.name||'Unknown')).join(', ')+'</strong></div>'+
        '<button class="inspector-button primary" data-action="rescue" data-id="'+t.id+'">⚒ DISPATCH RESCUE TEAM</button>'+
        '<button class="inspector-button" data-action="conserve" data-id="'+t.id+'">♡ CONSERVE OXYGEN</button>'+
        '<button class="inspector-button" data-action="self" data-id="'+t.id+'">↗ ATTEMPT SELF-RESCUE</button>';
    }
  }
  function refresh(){renderHud();renderRoster();renderGuide();renderInspector();renderBuild();renderModalMaybe();}
  function openModal(type,info=null){
    modalType=type;modalSignature='';cls($('modal'),'hidden',false);
    renderModal(info);
  }
  function closeModal(){
    if(modalType==='intro'&&!s.seenIntro)return; // Start or skip from the opening, not close into a frozen game.
    modalType=null;cls($('modal'),'hidden',true);
  }
  function modalHead(kicker,title,body){
    $('modalKicker').textContent=kicker;$('modalTitle').textContent=title;
    $('modalBody').innerHTML=body;
  }
  function renderModal(info){
    if(!modalType)return;
    if(modalType==='intro'){
      modalHead('ASHFALL SETTLEMENT / DAY ZERO','THE WORLD ABOVE IS GONE',
        '<p class="modal-p">An old hatch. Three exhausted survivors. A little food, a little water, and nothing built beneath the earth. '+
        'You will dig the first rooms yourself. People will walk, work, eat, defend, explore, and sometimes need rescuing.</p>'+
        '<p class="modal-p">The shelter begins with <strong>zero functional rooms.</strong> No one else will build it for you.</p>'+
        '<div class="modal-choices"><button class="dialog-button primary" data-act="start">BEGIN THE FIRST DAY →</button>'+
        '<button class="dialog-button" data-act="startskip">SKIP TUTORIAL</button></div>'+
        '<p class="inspector-subtle">Original gameplay and art. Your previous Alpha 0.3 save stays untouched; this reboot uses its own save slot.</p>');
      return;
    }
    if(modalType==='visitors'){
      modalHead('THE SURFACE / PEOPLE SEEKING SHELTER','VISITORS AT THE HATCH',
        '<p class="modal-p">People cannot magically appear inside your settlement. They arrive at the entrance, ask for a place, and wait for your decision.</p>'+
        '<p class="inspector-subtle">Population '+M.live(s).length+' / '+M.capacity(s)+' beds. Build living quarters for more residents.</p>'+
        '<div class="modal-list">'+(s.visitors.length?s.visitors.map(v=>
          '<div class="modal-tile"><strong>♙ '+ehtml(v.name)+'</strong><p>'+ehtml(v.role)+' · Strongest attribute '+
          Object.entries(v.skills).sort((a,b)=>b[1]-a[1])[0].join(' ')+'</p>'+
          '<button class="dialog-button primary" data-act="admit" data-id="'+v.id+'" '+
          (M.live(s).length>=M.capacity(s)?'disabled':'')+'>WELCOME</button> '+
          '<button class="dialog-button" data-act="reject" data-id="'+v.id+'">TURN AWAY</button></div>').join(''):
          '<p class="modal-p">Nobody is waiting right now. Survivors may reach the hatch as time passes. A staffed radio station attracts them faster.</p>')+'</div>');
      return;
    }
    if(modalType==='map'){
      modalHead('WASTELAND SURVEY / REAL LOCATIONS','BEYOND THE HATCH',
        '<p class="modal-p">Pick an actual abandoned site. Search individual rooms, salvage machinery, fight or retreat, then bring your pack home. '+
        'Each room stays empty after it has been searched.</p>'+
        (s.expedition?'<div class="modal-choices"><button class="dialog-button primary" data-act="showexp">VIEW ACTIVE EXPEDITION →</button></div>':'')+
        '<div class="modal-list">'+M.LOCATIONS.concat(s.discovered).map(loc=>{
          const st=s.sites.find(q=>q.id===loc.id),known=st?.seen,cleared=st?.searched.filter(Boolean).length||0;
          return '<button class="modal-tile '+(selectedSite===loc.id?'active':'')+'" data-act="site" data-id="'+loc.id+'" '+(!known?'disabled':'')+'>'+
            '<strong>'+ehtml(loc.name)+'</strong><p>'+ehtml(loc.description)+'</p>'+
            '<small>'+(known?loc.risk+' RISK · '+cleared+' / 4 ROOMS SEARCHED':'NOT YET DISCOVERED')+'</small></button>';
        }).join('')+'</div><div class="modal-divider"></div>'+
        '<button class="dialog-button" data-act="survey" '+(s.survey||s.expedition?'disabled':'')+'>'+
          (s.survey?'SCOUT SURVEYING · '+num(s.survey.timer)+'s':'⌖ SEND SCOUT TO DISCOVER ANOTHER SITE (1 FOOD, 1 WATER)')+'</button>'+
        '<div class="modal-divider"></div><div id="siteDetails"></div>');
      renderSiteDetails();return;
    }
    if(modalType==='expedition'){
      const e=s.expedition,loc=M.getSite(s,e?.siteId),p=s.sites.find(st=>st.id===e?.siteId);
      if(!e||!loc){modalType='map';renderModal();return;}
      const bag=Object.entries(e.bag).filter(([,n])=>n>0).map(([k,n])=>n+' '+k).join(' · ')||'empty';
      const crewNames=e.crew.map(id=>M.getPerson(s,id)?.name).filter(Boolean).join(' + ');
      const stage=e.phase==='travel'?'TRAVELING TO SITE':e.phase==='return'?'RETURNING TO SHELTER':'EXPLORING THE BUILDING';
      const active=e.action?.phase==='encounter',fighting=e.action?.phase==='fighting';
      modalHead(stage,loc.name,
        '<p class="modal-p">'+ehtml(crewNames)+' · '+ehtml(loc.risk)+' RISK · Backpack: '+bag+'</p>'+
        '<canvas id="expeditionScene" class="expedition-view" width="760" height="240" aria-label="Wasteland scavenging location"></canvas>'+
        (e.phase==='explore'?
          '<p class="exp-log">'+ehtml(e.log)+'</p>'+
          '<div class="expedition-rooms">'+loc.rooms.map((r,i)=>
            '<button class="exp-room '+(p.searched[i]?'searched':'')+'" data-act="search" data-i="'+i+'" '+
            (p.searched[i]||e.action?'disabled':'')+'><strong>'+ehtml(r.name)+'</strong><small>'+
            (p.searched[i]?'CLEARED':r.enemy?'POTENTIAL THREAT':r.task==='salvage'?'SALVAGE':'SEARCH')+'</small></button>').join('')+'</div>'+
          (active?'<div class="modal-choices"><button class="dialog-button danger" data-act="fight">⚔ FIGHT HOSTILES</button>'+
            '<button class="dialog-button" data-act="retreat">← RETREAT WITH SUPPLIES</button></div>':'')+
          (fighting?'<p class="exp-log">Fighting hostiles · '+num(e.action.hp)+' enemy HP remaining</p>':'')+
          '<div class="modal-choices"><button class="dialog-button primary" data-act="return" '+(e.action?'disabled':'')+
          '>RETURN HOME WITH SUPPLIES →</button></div>':
          '<p class="exp-log">'+ehtml(e.log)+' · '+num(e.timer)+'/8 seconds traveled</p>'));
      return;
    }
    if(modalType==='people'){
      modalHead('SETTLEMENT POPULATION / INDIVIDUALS','RESIDENT ROSTER',
        '<p class="modal-p">Residents are individuals with skills, jobs, needs and relationships. Assign work where it matters. Stronger skills improve production.</p>'+
        '<div class="modal-list">'+s.people.filter(p=>!p.left).map(p=>
          '<button class="modal-tile" data-act="selectperson" data-id="'+p.id+'">'+
          '<strong>'+ehtml(p.name)+'</strong><p>'+ehtml(p.role)+' · '+ehtml(p.state)+' · Health '+num(p.hp)+'% · Morale '+num(p.morale)+'%</p>'+
          '<small>LEVEL '+p.level+' · S '+p.skills.S+' · P '+p.skills.P+' · I '+p.skills.I+'</small></button>').join('')+'</div>');
      return;
    }
    if(modalType==='crisis'){
      const threats=s.threat?'<div class="modal-tile"><strong>⚠ '+ehtml(s.threat.kind.toUpperCase())+'</strong>'+
        '<p>Hostiles: '+num(s.threat.hp)+' HP · '+s.threat.controlled.length+' captured rooms. Arm and assign residents before they reach your utilities.</p>'+
        '<div class="modal-choices">'+M.live(s).filter(p=>!p.away).map(p=>
          '<button class="dialog-button" data-act="defend" data-id="'+p.id+'">DEFEND: '+ehtml(p.name.split(' ')[0])+'</button>').join('')+'</div></div>':'';
      const fires=s.incidents.map(i=>{
        const r=M.getRoom(s,i.roomId);return '<div class="modal-tile"><strong>⚠ '+ehtml(i.kind.toUpperCase())+'</strong>'+
          '<p>'+ehtml(M.ROOM[r?.type]?.name||'Unknown room')+' · severity '+num(i.severity)+'. Send responders to contain the problem.</p>'+
          M.live(s).filter(p=>!p.away).map(p=>'<button class="dialog-button" data-act="respond" data-id="'+p.id+'">'+
            ehtml(p.name.split(' ')[0])+' RESPOND</button>').join('')+'</div>';
      }).join('');
      const trapped=s.events.filter(e=>!e.cleared).map(event=>'<div class="modal-tile"><strong>⚠ CAVE-IN</strong>'+
        '<p>Air remaining: '+num(event.air)+' seconds. A real rescue crew must walk to the collapsed sector.</p>'+
        '<button class="dialog-button primary" data-act="rescue" data-id="'+event.id+'">SEND RESCUERS</button>'+
        '<button class="dialog-button" data-act="conserve" data-id="'+event.id+'">CONSERVE AIR</button>'+
        '<button class="dialog-button" data-act="self" data-id="'+event.id+'">SELF-RESCUE</button></div>').join('');
      modalHead('OVERSEER RESPONSE / KEEP EVERYBODY SAFE','SECURITY & EMERGENCIES',
        '<p class="modal-p">Only physical blast doors can isolate sectors. Electricity and oxygen may also be cut when passages are sealed.</p>'+
        '<div class="modal-list">'+(threats+fires+trapped||
          '<div class="modal-tile"><strong>ALL SECTORS CLEAR</strong><p>No active hostile or structural emergencies.</p></div>')+'</div>'+
        '<div class="modal-divider"></div><p class="inspector-subtle">Blast doors: '+s.doors.length+
        ' · Air quality '+num(s.air)+'% · Available responders '+M.live(s).filter(p=>!p.away).length+'</p>');
      return;
    }
    if(modalType==='settings'){
      modalHead('OVERSEER CONTROL / PERSONALIZE YOUR GAME','OPTIONS & POLICIES',
        '<p class="modal-p">Use fewer interruptions. You can play entirely through the world, or open management controls when you need them.</p>'+
        '<div class="modal-choices"><button class="dialog-button" data-act="tutorial">'+(s.tutorial?'HIDE':'SHOW')+' OPTIONAL FIELD GUIDE</button>'+
        '<button class="dialog-button" data-act="save">SAVE PROGRESS NOW</button>'+
        '<button class="dialog-button" data-act="center">CENTER CAMERA</button></div>'+
        '<div class="modal-divider"></div><p class="small-label">SETTLEMENT POLICIES</p>'+
        '<label class="inspector-row"><span>Emergency rationing · saves supplies, hurts morale</span><input data-policy="rations" type="checkbox" '+(s.policies.rations?'checked':'')+'></label>'+
        '<label class="inspector-row"><span>Overtime shifts · faster work, lower morale</span><input data-policy="overtime" type="checkbox" '+(s.policies.overtime?'checked':'')+'></label>'+
        '<label class="inspector-row"><span>Automatic blast-door lockdown when raiders attack</span><input data-policy="autoLock" type="checkbox" '+(s.policies.autoLock?'checked':'')+'></label>'+
        '<div class="modal-divider"></div><button class="dialog-button danger" data-act="resetwarn">START A COMPLETELY NEW SHELTER</button>'+
        '<p class="inspector-subtle">The previous Alpha 0.3 save is kept separately. This version saves to your browser, not a cloud account.</p>');
      return;
    }
    if(modalType==='resetwarn'){
      modalHead('OVERSEER CONFIRMATION / PERMANENT','BEGIN A NEW SETTLEMENT?',
        '<p class="modal-p">This will erase only the current VAULT DIRECTIVE reboot save on this device. All other GAMESHUB games and the previous Alpha 0.3 save are unaffected.</p>'+
        '<div class="modal-choices"><button class="dialog-button" data-act="cancelreset">KEEP MY SHELTER</button>'+
        '<button class="dialog-button danger" data-act="resetnow">ERASE THIS SAVE & START AGAIN</button></div>');
      return;
    }
    if(modalType==='logs'){
      modalHead('OVERSEER LOGBOOK / INCIDENT HISTORY','FIELD REPORTS',
        '<div class="log-list">'+s.reports.map(r=>'<div class="log-line '+(r.urgent?'urgent':'')+'">'+
          '<small>DAY '+r.day+' · '+String(Math.floor(r.time/60)).padStart(2,'0')+':'+String(r.time%60).padStart(2,'0')+'</small>'+
          ehtml(r.text)+'</div>').join('')+'</div>');
      return;
    }
    if(modalType==='family'){
      modalHead('RESIDENTIAL SECTOR / COMMUNITY','START A FAMILY',
        '<p class="modal-p">Two willing adults in a functioning living area may choose to start a family. Children need care and time before they can work.</p>'+
        '<label class="inspector-label">FIRST PARENT</label><select id="parentA" class="inspector-select">'+
          M.live(s).filter(p=>!p.child).map(p=>'<option value="'+p.id+'">'+ehtml(p.name)+'</option>').join('')+'</select>'+
        '<label class="inspector-label">SECOND PARENT</label><select id="parentB" class="inspector-select">'+
          M.live(s).filter(p=>!p.child).map((p,i)=>'<option value="'+p.id+'" '+(i===1?'selected':'')+'>'+ehtml(p.name)+'</option>').join('')+'</select>'+
        '<button class="dialog-button primary" data-act="beginfamily">START FAMILY PLAN</button>');
      return;
    }
    if(modalType==='workshop'){
      modalHead('SURVIVAL ENGINEERING / CRAFTING','WORKSHOP BENCH',
        '<p class="modal-p">A functioning workshop with at least one resident can turn salvage into useful goods.</p>'+
        '<div class="modal-choices"><button class="dialog-button" data-act="craft" data-kind="fuel">♨ REFINE 4 FUEL · 5 SCRAP + 1 PART</button>'+
        '<button class="dialog-button" data-act="craft" data-kind="meds">✚ MAKE 2 MEDICINE · 4 SCRAP + 1 PART</button>'+
        '<button class="dialog-button" data-act="craft" data-kind="parts">⬡ RECOVER 2 COMPONENTS · 7 SCRAP</button></div>');
      return;
    }
    if(modalType==='gameover'){
      modalHead('ASHFALL RIDGE / FINAL REPORT','THE SHELTER HAS FALLEN',
        '<p class="modal-p">Every settlement tells a story, even the ones that end. You can inspect what remains or begin a new attempt.</p>'+
        '<div class="modal-choices"><button class="dialog-button" data-act="closegameover">VIEW THE RUINS</button>'+
        '<button class="dialog-button primary" data-act="resetwarn">BEGIN AGAIN</button></div>');
      return;
    }
  }
  function renderSiteDetails(){
    const slot=$('siteDetails');if(!slot)return;
    const loc=M.getSite(s,selectedSite),state=s.sites.find(q=>q.id===selectedSite);
    if(!loc||!state?.seen){slot.innerHTML='';return;}
    const choices=M.live(s).filter(p=>!p.away&&!p.trapped&&!p.child);
    if(!crew.size&&choices.length)crew.add(choices[0].id);
    slot.innerHTML='<h3 style="font:800 23px var(--display);margin:4px 0 9px">'+ehtml(loc.name.toUpperCase())+'</h3>'+
      '<p class="modal-p">Choose one or two scavengers to send into this location. They will move through its rooms instead of magically earning resources.</p>'+
      '<div class="modal-list">'+choices.map(p=>
        '<label class="modal-tile"><strong>'+ehtml(p.name)+'</strong><p>'+ehtml(p.role)+' · Health '+num(p.hp)+
        ' · Strength '+p.skills.S+' · Equipped weapon '+p.weapon+'</p>'+
        '<small><input type="checkbox" data-crew="'+p.id+'" '+(crew.has(p.id)?'checked':'')+'> SEND ON EXPEDITION</small></label>').join('')+'</div>'+
      '<div class="modal-choices"><button class="dialog-button primary" data-act="deploy">DEPLOY TO '+ehtml(loc.name.toUpperCase())+' →</button></div>';
  }
  function renderModalMaybe(){
    if(!modalType)return;
    const e=s.expedition,phase=e?.phase||'none',act=e?.action?.phase||'none',n=s.visitors.length;
    const signature=modalType+'|'+phase+'|'+act+'|'+(e?.action?.index??'')+'|'+s.sites.reduce((z,a)=>z+a.searched.filter(Boolean).length,0)+'|'+n+
      '|'+Math.round(s.survey?.timer||0)/5;
    if(signature!==modalSignature){modalSignature=signature;
      if(modalType==='expedition'||modalType==='visitors'||modalType==='crisis'||modalType==='map')renderModal();
    }
  }
  function executeAction(action,el){
    const id=Number(el.dataset.id),r=M.getRoom(s,id),p=M.getPerson(s,id);
    if(action==='start'||action==='startskip'){s.seenIntro=true;s.tutorial=action!=='startskip';closeModal();refresh();M.save(s);return;}
    if(action==='cancelreset'){openModal('settings');return;}
    if(action==='resetwarn'){openModal('resetwarn');return;}
    if(action==='resetnow'){
      M.erase();s=M.create();camera.zoom=1;centerEntrance();selected=null;selectedWorker=null;
      mode='inspect';roomType=null;crew.clear();gameOverPresented=false;
      openModal('intro');refresh();M.save(s);return;
    }
    if(action==='closegameover'){closeModal();return;}
    if(action==='tutorial'){s.tutorial=!s.tutorial;result({ok:true});renderModal();return;}
    if(action==='center'){centerEntrance();closeModal();return;}
    if(action==='save'){toast(M.save(s)?'Settlement saved in your browser.':'Browser storage unavailable.');return;}
    if(action==='admit'){if(result(M.admit(s,id))){renderModal();renderGuide();}return;}
    if(action==='reject'){M.reject(s,id);refresh();renderModal();return;}
    if(action==='site'){selectedSite=el.dataset.id;crew.clear();renderModal();return;}
    if(action==='survey'){if(result(M.startSurvey(s)))renderModal();return;}
    if(action==='deploy'){
      const expedition=M.startExpedition(s,selectedSite,Array.from(crew));
      if(result(expedition)){crew.clear();openModal('expedition');}return;
    }
    if(action==='showexp'){openModal('expedition');return;}
    if(action==='search'){if(result(M.searchSiteRoom(s,Number(el.dataset.i))))renderModal();return;}
    if(action==='fight'){if(result(M.fight(s,false)))renderModal();return;}
    if(action==='retreat'){if(result(M.fight(s,true)))renderModal();return;}
    if(action==='return'){if(result(M.returnExpedition(s)))renderModal();return;}
    if(action==='selectperson'){closeModal();openSelectPerson(id);return;}
    if(action==='defend'){result(M.dispatch(s,id));renderModal();return;}
    if(action==='respond'){result(M.respond(s,id));renderModal();return;}
    if(action==='rescue'){result(M.rescue(s,id));renderModal();return;}
    if(action==='conserve'){result(M.rescuerOrder(s,id,'conserve'));renderModal();return;}
    if(action==='self'){result(M.rescuerOrder(s,id,'self'));renderModal();return;}
    if(action==='beginfamily'){result(M.startFamily(s,Number($('parentA').value),Number($('parentB').value)));closeModal();return;}
    if(action==='craft'){craft(el.dataset.kind);return;}
  }
  function craft(kind){
    const working=s.rooms.find(r=>r.type==='workshop'&&M.powered(s,r)&&M.team(s,r).length);
    if(!working){toast('Build and staff a powered workshop first.');return;}
    const recipes={fuel:{scrap:5,parts:1,out:4},meds:{scrap:4,parts:1,out:2},parts:{scrap:7,parts:0,out:2}};
    const recipe=recipes[kind];if(!recipe)return;
    if(s.res.scrap<recipe.scrap||s.res.parts<recipe.parts){toast('Insufficient salvage or components.');return;}
    s.res.scrap-=recipe.scrap;s.res.parts-=recipe.parts;s.res[kind]+=recipe.out;
    M.message(s,'Workshop completed a '+kind+' crafting order.');refresh();M.save(s);renderModal();
  }
  function inspectorAction(action,el){
    const id=Number(el.dataset.id);
    if(action==='collect')result(M.collect(s,id));
    if(action==='staff'){result(M.assign(s,id,Number(el.dataset.room)));openSelectRoom(Number(el.dataset.room));}
    if(action==='jobworker')result(M.assignJob(s,Number(el.dataset.job),id));
    if(action==='medicine')result(M.medicine(s,id));
    if(action==='equip')result(M.equip(s,id));
    if(action==='defend')result(M.dispatch(s,id));
    if(action==='rush')result(M.rush(s,id));
    if(action==='upgrade'){if(result(M.upgrade(s,id))){const job=s.jobs.at(-1);openSelectJob(job.id);}}
    if(action==='repair')result(M.repair(s,id));
    if(action==='toggle')result(M.toggleDoor(s,id));
    if(action==='family')openModal('family');
    if(action==='workshop')openModal('workshop');
    if(action==='rescue')result(M.rescue(s,id));
    if(action==='conserve')result(M.rescuerOrder(s,id,'conserve'));
    if(action==='self')result(M.rescuerOrder(s,id,'self'));
    if(action==='canceljob'){
      const job=s.jobs.find(j=>j.id===id);if(!job)return;
      job.cancelled=true;
      for(const p of s.people)if(p.taskId===job.id){p.taskId=null;p.path=[];p.state='idle';}
      M.message(s,'Work order cancelled. Any already excavated ground remains cleared.');
      clearSelect();refresh();M.save(s);
    }
  }
  function stageClick(pos){
    const worldPos={x:camera.x+pos.x/camera.zoom,y:camera.y+pos.y/camera.zoom};
    // Detect heads, chest and feet, not just pixel-perfect center clicks.
    const p=s.people.find(p=>!p.away&&!p.left&&p.hp>0 &&
      Math.abs((p.x+.5)*M.TILE-worldPos.x)<24&&worldPos.y>=(p.y+1)*M.TILE-150&&
      worldPos.y<=(p.y+1)*M.TILE+7);
    if(p){openSelectPerson(p.id);return;}
    const t=tile(pos);if(!M.valid(t.x,t.y))return;
    const trap=s.events.find(e=>!e.cleared&&e.x===t.x&&e.y===t.y);
    if(trap){openSelectTrap(trap.id);return;}
    const door=M.doorAt(s,t.x,t.y);if(door){openSelectDoor(door.id);return;}
    const job=M.jobAt(s,t.x,t.y);if(job){openSelectJob(job.id);return;}
    const room=M.roomAt(s,t.x,t.y);
    if(room){
      if(selectedWorker&&M.getPerson(s,selectedWorker)&&!s.people.find(p=>p.id===selectedWorker)?.away&&
         M.ROOM[room.type].workers){
        if(result(M.assign(s,selectedWorker,room.id))){
          selectedWorker=null;openSelectRoom(room.id);renderRoster();
        }
        return;
      }
      if(room.ready){result(M.collect(s,room.id));openSelectRoom(room.id);return;}
      openSelectRoom(room.id);return;
    }
    clearSelect();
  }
  function attach(){
    for(const b of document.querySelectorAll('[data-speed]'))
      b.addEventListener('click',()=>{s.speed=Number(b.dataset.speed);s.paused=false;renderHud();M.save(s);});
    $('pause').addEventListener('click',()=>{s.paused=!s.paused;renderHud();});
    $('optionsBtn').addEventListener('click',()=>openModal('settings'));
    $('toolInspect').addEventListener('click',()=>setMode('inspect'));
    $('toolDig').addEventListener('click',()=>setMode('dig'));
    $('toolLadder').addEventListener('click',()=>setMode('ladder'));
    $('toolDoor').addEventListener('click',()=>setMode('door'));
    $('openBuild').addEventListener('click',()=>{openBuild();});
    $('openMap').addEventListener('click',()=>openModal(s.expedition?'expedition':'map'));
    $('closeBuild').addEventListener('click',closeBuild);
    $('buildChoices').addEventListener('click',ev=>{
      const target=ev.target.closest('[data-build]');if(!target)return;
      setMode('build',target.dataset.build);toast('Draw a room on cleared ground. Three tiles tall, 3–6 wide.');
    });
    $('rosterCards').addEventListener('click',ev=>{
      const b=ev.target.closest('[data-person]');if(b)openSelectPerson(Number(b.dataset.person));
    });
    $('manageResidents').addEventListener('click',()=>openModal('people'));
    $('alertBadge').addEventListener('click',()=>openModal('crisis'));
    $('visitorNotice').addEventListener('click',()=>openModal('visitors'));
    for(const id of ['alertBadge','visitorNotice'])
      $(id).addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();$(id).click();}});
    $('hideGuide').addEventListener('click',()=>{s.tutorial=false;renderGuide();M.save(s);});
    $('objectiveSkip').addEventListener('click',()=>{s.tutorial=false;renderGuide();M.save(s);});
    $('objectiveGo').addEventListener('click',guideAction);
    $('logBtn').addEventListener('click',()=>openModal('logs'));
    $('center').addEventListener('click',centerEntrance);
    $('zoomIn').addEventListener('click',()=>zoom(1.15));
    $('zoomOut').addEventListener('click',()=>zoom(1/1.15));
    $('closeInspector').addEventListener('click',clearSelect);
    $('inspectorContent').addEventListener('click',ev=>{
      const b=ev.target.closest('[data-action]');if(b)inspectorAction(b.dataset.action,b);
    });
    $('inspectorContent').addEventListener('change',ev=>{
      const el=ev.target;
      if(el.id==='residentJob'){
        const id=Number(el.dataset.person);
        if(el.value==='none'){M.unassign(s,id);result({ok:true});}
        else result(M.assign(s,id,Number(el.value)));
        renderInspector();
      }
      if(el.id==='residentShift')result(M.changeShift(s,Number(el.dataset.person),el.value));
      if(el.id==='roomPriority'){
        const r=M.getRoom(s,Number(el.dataset.room));
        if(r){r.priority=Number(el.value);M.power(s);M.save(s);toast('Room electricity priority updated.');}
      }
    });
    $('modalClose').addEventListener('click',closeModal);
    $('modal').addEventListener('click',ev=>{if(ev.target===$('modal'))closeModal();});
    $('modalBody').addEventListener('click',ev=>{
      const b=ev.target.closest('[data-act]');if(b)executeAction(b.dataset.act,b);
    });
    $('modalBody').addEventListener('change',ev=>{
      const b=ev.target;
      if(b.dataset.crew){
        const id=Number(b.dataset.crew);
        if(b.checked&&crew.size>=2){b.checked=false;toast('Only two scavengers can enter a site together.');return;}
        b.checked?crew.add(id):crew.delete(id);
      }
      if(b.dataset.policy){s.policies[b.dataset.policy]=b.checked;M.message(s,(b.dataset.policy==='rations'?'Rationing':b.dataset.policy==='overtime'?'Overtime':'Auto-lockdown')+' '+(b.checked?'enabled':'disabled')+'.');M.save(s);}
    });
    world.addEventListener('pointerdown',ev=>{
      if(modalType)return;
      if(ev.button!==0&&ev.button!==1)return;
      ev.preventDefault();const pos=point(ev),t=tile(pos);
      drag={a:t,b:t,start:pos,last:pos,moved:false,mode:ev.button===1?'pan':mode==='inspect'?'pan':mode,
        startCamera:{x:camera.x,y:camera.y},pointerId:ev.pointerId};
      try{world.setPointerCapture(ev.pointerId);}catch(e){}
    });
    world.addEventListener('pointermove',ev=>{
      const pos=point(ev);hover=tile(pos);
      if(!drag||drag.pointerId!==ev.pointerId)return;
      drag.b=tile(pos);drag.last=pos;
      if(Math.hypot(pos.x-drag.start.x,pos.y-drag.start.y)>5)drag.moved=true;
      if(drag.mode==='pan'){
        camera.x=drag.startCamera.x-(pos.x-drag.start.x)/camera.zoom;
        camera.y=drag.startCamera.y-(pos.y-drag.start.y)/camera.zoom;limitCamera();
      }
    });
    world.addEventListener('pointerup',ev=>{
      if(!drag||drag.pointerId!==ev.pointerId)return;
      const old=drag,at=point(ev);drag=null;
      try{world.releasePointerCapture(ev.pointerId);}catch(e){}
      if(old.mode==='dig'){
        const r=M.dig(s,old.a.x,old.a.y,old.b.x,old.b.y);
        if(result(r))openSelectJob(r.job.id);
        return;
      }
      if(old.mode==='build'){
        const x=Math.min(old.a.x,old.b.x),w=Math.abs(old.a.x-old.b.x)+1;
        const r=M.build(s,roomType,x,old.a.y,Math.max(3,w));
        if(result(r)){setMode('inspect');openSelectJob(r.job.id);}
        return;
      }
      if(old.mode==='door'){const t=tile(at),r=M.installDoor(s,t.x,t.y);
        if(result(r)){setMode('inspect');openSelectDoor(r.door.id);}return;}
      if(old.mode==='ladder'){const t=tile(at);result(M.installLadder(s,t.x,t.y));return;}
      if(old.mode==='pan'&&!old.moved)stageClick(at);
    });
    world.addEventListener('pointercancel',()=>{drag=null;});
    world.addEventListener('wheel',ev=>{ev.preventDefault();const at=point(ev);zoom(ev.deltaY<0?1.09:1/1.09,at);},{passive:false});
    window.addEventListener('keydown',ev=>{
      if(ev.key==='Escape'){if(modalType)closeModal();else if(!$('buildTray').classList.contains('hidden'))closeBuild();else{setMode('inspect');clearSelect();}return;}
      if(modalType||ev.target instanceof HTMLInputElement||ev.target instanceof HTMLSelectElement)return;
      if(ev.key===' '){ev.preventDefault();s.paused=!s.paused;renderHud();}
      const keys={ArrowLeft:[-1,0],a:[-1,0],ArrowRight:[1,0],d:[1,0],ArrowUp:[0,-1],w:[0,-1],ArrowDown:[0,1],s:[0,1]};
      if(keys[ev.key]){ev.preventDefault();camera.x+=keys[ev.key][0]*45/camera.zoom;camera.y+=keys[ev.key][1]*45/camera.zoom;limitCamera();}
      if(ev.key==='+'||ev.key==='=')zoom(1.1);
      if(ev.key==='-')zoom(1/1.1);
      if(ev.key==='1')setMode('inspect');
      if(ev.key==='2')setMode('dig');
      if(ev.key==='3')openBuild();
    });
    window.addEventListener('beforeunload',()=>M.save(s));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)M.save(s);});
    if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize',resize);
  }
  function loop(t){
    const dt=Math.min(.085,Math.max(0,(t-lastFrame)/1000));lastFrame=t;
    if(!modalType||!['settings','resetwarn','intro'].includes(modalType))M.tick(s,dt);
    A.render(ctx,s,camera,{width,height},{mode,roomType,selected,drag,hover},t);
    if(modalType==='expedition'&&$('expeditionScene')){
      const el=$('expeditionScene'),e=s.expedition,site=M.getSite(s,e?.siteId),record=s.sites.find(st=>st.id===e?.siteId);
      if(e&&site&&record)A.drawExpedition(el.getContext('2d'),site,e,record,el.width,el.height,t);
    }
    hudTime+=dt;inspectTime+=dt;saveTime+=dt;
    if(hudTime>.45){
      hudTime=0;renderHud();renderGuide();renderModalMaybe();
      const recent=s.lastMessage;
      if(modalType==='expedition'&&!s.expedition){modalType='map';renderModal();}
      if(s.gameOver&&!gameOverPresented){gameOverPresented=true;openModal('gameover');}
    }
    if(inspectTime>1.5){
      inspectTime=0;renderRoster();if(selected&&!(document.activeElement instanceof HTMLSelectElement))renderInspector();
    }
    if(saveTime>13){saveTime=0;M.save(s);}
    requestAnimationFrame(loop);
  }
  attach();resize();refresh();setMode('inspect');
  if(!s.seenIntro)openModal('intro');
  requestAnimationFrame(loop);
  window.VaultGameDebug={state:()=>s,mode:()=>mode,guide:()=>currentStep(),camera:()=>({...camera})};
})();