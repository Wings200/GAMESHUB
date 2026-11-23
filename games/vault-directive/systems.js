/* VAULT DIRECTIVE / FOUNDATION SYSTEMS v0.2
   Original mechanics and balancing. Engine and DOM are kept separate so each
   system can be tested and audited without touching other GAMESHUB games. */
(() => {
  'use strict';
  const ROOMS = {
    generator: { draw:0, supply:9, skill:'S', label:'Generator', work:true },
    bunks: { draw:1, supply:0, skill:'C', label:'Sleeping quarters', work:false },
    water: { draw:2, supply:0, skill:'P', label:'Water treatment', work:true },
    garden: { draw:2, supply:0, skill:'A', label:'Hydroponics', work:true },
    medbay: { draw:2, supply:0, skill:'I', label:'Medical bay', work:true },
    radio: { draw:2, supply:0, skill:'C', label:'Radio beacon', work:true },
    security: { draw:2, supply:0, skill:'E', label:'Security post', work:true },
    storage: { draw:1, supply:0, skill:'E', label:'Storage depot', work:false },
    ventilation: { draw:2, supply:0, skill:'I', label:'Air-handling plant', work:true },
    training: { draw:2, supply:0, skill:'I', label:'Training center', work:true },
    workshop: { draw:3, supply:0, skill:'S', label:'Workshop', work:true }
  };
  const NAMES = [
    ['Nora','Vale'],['Jonah','Price'],['Sylvie','Reed'],['Tomas','Gale'],
    ['Amina','Cross'],['Theo','Morrow'],['June','Keller'],['Cass','Dawson'],
    ['Noah','Foster'],['Liv','Shaw'],['Rhea','Park'],['Leon','Mills'],
    ['Dara','Wells'],['Owen','Hayes'],['Sana','Rook'],['Evan','Stone']
  ];
  const DEFAULT_SKILLS = {S:4,P:4,E:4,C:4,I:4,A:4,L:4};
  const max = Math.max, min = Math.min;
  const clamp = (v,a,b) => min(b,max(a,v));
  const round = v => Math.round(v*10)/10;
  const get = (state,id) => state.survivors.find(s=>s.id===id);
  const room = (state,id) => state.rooms.find(r=>r.id===id);
  const alive = state => state.survivors.filter(s=>!s.dead);
  const emit = (hooks, text, warning=false) => { if(hooks && hooks.report)hooks.report(text,warning); };
  const nextRand = state => {
    state.randomSeed = (Math.imul(1664525, state.randomSeed>>>0)+1013904223)>>>0;
    return state.randomSeed/4294967296;
  };
  const getRoomWorkers = (state, id) => alive(state).filter(s=>{
    const target=room(state,id);
    return !!target && s.jobRoom===id && s.state==='working' &&
      s.x>=target.x-.1 && s.x<target.x+target.width+.1 &&
      Math.abs(s.y-(target.y+1))<.1 && !s.taskId && s.state!=='resting' &&
    s.state!=='expedition' && s.state!=='trapped' && s.state!=='defending' && s.state!=='dead' &&
    (!s.shift || s.shift==='flex' || ((state.minutes % 1440 < 1200 && state.minutes % 1440 >= 480) === (s.shift==='day')));
  });
  function normalize(state) {
    state.version=2;
    state.simSeconds=Number.isFinite(state.simSeconds)?state.simSeconds:0;
    state.productionTime=Number.isFinite(state.productionTime)?state.productionTime:0;
    state.randomSeed=Number.isFinite(state.randomSeed)?state.randomSeed:739177;
    state.resources.fuel=Number.isFinite(state.resources.fuel)?state.resources.fuel:9;
    state.resources.meds=Number.isFinite(state.resources.meds)?state.resources.meds:2;
    state.resourceRate={food:0,water:0,fuel:0};
    state.airQuality=state.airQuality??95;
    state.policy=state.policy||{rationing:false,overtime:false};
    state.doors=state.doors||[];
    state.ladders=state.ladders||[];
    state.arrivals=state.arrivals||[];
    state.threat=state.threat||null;
    state.incidents=state.incidents||[];
    state.traps=state.traps||[];
    state.nextArrival=Number.isFinite(state.nextArrival)?state.nextArrival:95;
    state.nextIncident=Number.isFinite(state.nextIncident)?state.nextIncident:245;
    state.nextRaid=Number.isFinite(state.nextRaid)?state.nextRaid:330;
    state.loss=state.loss||null;
    state.threatId=Number.isFinite(state.threatId)?state.threatId:1;
    state.lastShortage=Number.isFinite(state.lastShortage)?state.lastShortage:-9999;
    state.reminder=Number.isFinite(state.reminder)?state.reminder:0;
    state.autoLockdown=!!state.autoLockdown;
    state.tutorialFlags=state.tutorialFlags||{};
    state.tutorialFlags.recruit=!!state.tutorialFlags.recruit;
    state.tutorialFlags.staff=!!state.tutorialFlags.staff;
    state.tutorialFlags.power=!!state.tutorialFlags.power;
    for (const r of state.survivors) {
      if(!r.skills) {
        r.skills={...DEFAULT_SKILLS,S:r.strength||4,P:r.role==='Surveyor'?7:4,
          I:r.role==='Medic'?7:4,A:r.role==='Medic'?5:4};
      }
      r.strength=r.skills.S;
      r.jobRoom=r.jobRoom||null;
      r.shift=r.shift||'flex';
      r.weapon=r.weapon??1;
      r.loyalty=r.loyalty??75;
      r.level=r.level||1;
      r.xp=r.xp||0;
      r.infection=r.infection||0;
      r.trainingProgress=r.trainingProgress||{};
      r.striking=!!r.striking;
      r.dead=!!r.dead;
      r.recoverable=r.recoverable??true;
      r.trapped=!!r.trapped;
      r.defending=!!r.defending;
      r.hunger=r.hunger??85;r.thirst=r.thirst??85;
      r.morale=r.morale??70;
    }
    for(const room of state.rooms){
      room.integrity=room.integrity??100;room.captured=!!room.captured;room.priority=room.priority??2;
      room.stock=room.stock??0;room.air=room.air??95;room.focus=room.focus||'S';
      room.level=room.level||1;room.rushAttempts=room.rushAttempts||0;
    }
    return state;
  }
  function capacity(state) {
    return 3 + state.rooms.filter(r=>r.type==='bunks' && r.integrity>0 && !r.captured).reduce((sum,r)=>sum+max(2,Math.floor(r.width/2))*2,0);
  }
  function power(state) {
    const generation=state.rooms.filter(r=>r.type==='generator'&&r.integrity>0&&!r.captured).reduce((sum,r)=>{
      if(state.resources.fuel<=0)return sum;
      const crew=getRoomWorkers(state,r.id).length;
      return sum+(crew?ROOMS.generator.supply + min(3,crew-1)*2+((r.level||1)-1)*3:3+((r.level||1)-1));
    },0);
    // The entrance requires a unit for lights and the basic air pump.
    const demand=1+state.rooms.reduce((sum,r)=>sum+(ROOMS[r.type]?.draw??1)+(r.type==='generator'?0:Math.max(0,(r.level||1)-1)),0);
    let remaining=generation;
    const prioritized=state.rooms.slice().sort((a,b)=>(a.priority??2)-(b.priority??2) ||
      Number(b.type==='water')-Number(a.type==='water') || a.id-b.id);
    const online=new Set();
    if(remaining>=1)remaining-=1;
    for(const r of prioritized) {
      if(r.integrity<=0||r.captured||r.type==='generator')continue;
      const draw=(ROOMS[r.type]?.draw??1)+Math.max(0,(r.level||1)-1);
      if(remaining>=draw){online.add(r.id);remaining-=draw;}
    }
    return {generation,demand,online,spare:generation-demand,lit:generation>0};
  }
  function active(state,r,p=power(state)) {
    if(!r||r.integrity<=0||r.captured)return false;
    if(r.type==='generator')return state.resources.fuel>0;
    return p.online.has(r.id);
  }
  function assignment(state,residentId,roomId,hooks) {
    const r=get(state,residentId),dest=room(state,roomId);
    if(!r||r.dead||r.trapped||!dest){return {ok:false,error:'Resident or room unavailable.'};}
    const cap=max(2,Math.floor(dest.width/2));
    const used=alive(state).filter(s=>s.jobRoom===roomId&&s.id!==residentId).length;
    if(used>=cap)return {ok:false,error:'This room has no available worker positions.'};
    if(r.taskId) {
      const job=state.projects.find(p=>p.id===r.taskId);
      if(job)job.workers=job.workers.filter(id=>id!==r.id);
      r.taskId=null;r.path=[];r.workTarget=null;
    }
    r.defending=false;r.jobRoom=roomId;r.state='idle';r.path=[];
    emit(hooks,r.name+' assigned to '+(ROOMS[dest.type]?.label||dest.type)+'.');
    return {ok:true};
  }
  function unassign(state,residentId,hooks){
    const r=get(state,residentId);if(!r)return {ok:false,error:'Resident unavailable.'};
    r.jobRoom=null;r.defending=false;r.state='idle';r.path=[];
    emit(hooks,r.name+' returned to general duties.');return {ok:true};
  }
  function shift(state,residentId,value,hooks){
    if(!['flex','day','night'].includes(value))return {ok:false,error:'Unknown shift.'};
    const r=get(state,residentId);if(!r)return {ok:false,error:'Resident unavailable.'};
    r.shift=value;emit(hooks,r.name+' scheduled for '+value+' work.');return {ok:true};
  }
  function createArrival(state,source='refugee') {
    const pair=NAMES[Math.floor(nextRand(state)*NAMES.length)];
    const index=state.survivors.length + state.arrivals.length;
    const name=pair[0]+' '+pair[1] + (state.survivors.some(s=>s.name===pair.join(' '))?' '+(index+1):'');
    const skills={...DEFAULT_SKILLS};
    const specialize=['S','P','E','C','I','A','L'][Math.floor(nextRand(state)*7)];
    skills[specialize]=5+Math.floor(nextRand(state)*4);
    const seed={name,role:'Survivor',skills,source,health:76+Math.floor(nextRand(state)*24),
      strength:skills.S,energy:73,hunger:65,thirst:70,morale:65,loyalty:68,
      skin:['#bd9274','#d1ad8c','#966b59','#ddbf9f'][index%4],
      hair:['#282828','#4d3529','#302621','#726455'][index%4],
      coat:['#8ba69c','#8595b1','#927e72','#818b7f'][index%4]};
    const item={id:'arrival-'+(++state.threatId),candidate:seed,since:state.simSeconds};
    state.arrivals.push(item);return item;
  }
  function admit(state,id,hooks) {
    const item=state.arrivals.find(a=>a.id===id);
    if(!item)return {ok:false,error:'No such visitor.'};
    if(alive(state).length>=capacity(state))return {ok:false,error:'No available sleeping capacity. Build quarters first.'};
    const s={...item.candidate,id:state.survivors.reduce((v,r)=>max(v,r.id),0)+1,
      x:8,y:7,level:1,xp:0,weapon:1,jobRoom:null,taskId:null,shift:'flex',state:'idle',path:[],wait:0,
      infection:0,dead:false,trapped:false,defending:false,recoverable:true,trainingProgress:{},striking:false};
    state.survivors.push(s);
    state.arrivals=state.arrivals.filter(a=>a.id!==id);
    state.tutorialFlags.recruit=true;
    emit(hooks,s.name+' was welcomed into the settlement. Population '+alive(state).length+'/'+capacity(state)+'.');
    return {ok:true,resident:s};
  }
  function reject(state,id,hooks){
    const item=state.arrivals.find(a=>a.id===id);if(!item)return {ok:false,error:'Visitor not found.'};
    state.arrivals=state.arrivals.filter(a=>a.id!==id);
    emit(hooks,item.candidate.name+' was turned away at the surface entrance.');
    return {ok:true};
  }
  function heal(state,residentId,hooks){
    const r=get(state,residentId);
    if(!r||r.dead)return {ok:false,error:'This resident cannot be treated.'};
    if(state.resources.meds<1)return {ok:false,error:'No medicine available. Scavenge a clinic or staff a medical bay.'};
    state.resources.meds-=1;
    const success=state.rooms.some(room=>room.type==='medbay'&&active(state,room));
    r.health=min(100,r.health+(success?55:34));
    r.infection=max(0,r.infection-(success?70:30));
    emit(hooks,r.name+' treated with medical supplies.');
    return {ok:true};
  }
  function revive(state,residentId,hooks){
    const r=get(state,residentId);
    if(!r||!r.dead||!r.recoverable)return {ok:false,error:'Revival is unavailable.'};
    if(state.resources.meds<3)return {ok:false,error:'Reviving this survivor requires three medical supplies.'};
    const med=state.rooms.some(room=>room.type==='medbay'&&active(state,room));
    if(!med)return {ok:false,error:'An operational medical bay is required for revival.'};
    state.resources.meds-=3;r.dead=false;r.health=35;r.energy=40;r.infection=0;r.trapped=false;r.jobRoom=null;
    r.state='resting';emit(hooks,r.name+' revived in the medical bay.');
    state.loss=null;return {ok:true};
  }
  function equip(state,residentId,hooks){
    const r=get(state,residentId);if(!r||r.dead)return {ok:false,error:'Resident unavailable.'};
    if(state.resources.parts<1||state.resources.scrap<3)return {ok:false,error:'Requires 3 salvage and 1 component.'};
    if(r.weapon>=4)return {ok:false,error:'Weapon has already reached its current maximum.'};
    state.resources.parts-=1;state.resources.scrap-=3;r.weapon+=1;
    emit(hooks,r.name+' was equipped with improved defensive gear.');
    return {ok:true};
  }
  function door(state,x,y,hooks){
    if(!state.terrain[y]||state.terrain[y][x]!==0||y<6 || state.doors.some(d=>d.x===x&&d.y===y))
      return {ok:false,error:'Blast doors require an empty, accessible tunnel tile.'};
    if(state.rooms.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<=r.y+1))
      return {ok:false,error:'Install blast doors in corridors, not inside production rooms.'};
    const horizontal=state.terrain[y]?.[x-1]===0 && state.terrain[y]?.[x+1]===0;
    if(!horizontal)return {ok:false,error:'A blast-door chamber needs a corridor on both sides.'};
    if(state.resources.scrap<7||state.resources.parts<2)return {ok:false,error:'Blast-door chamber costs 7 salvage and 2 components.'};
    state.resources.scrap-=7;state.resources.parts-=2;
    const obj={id:10000+(++state.threatId),x,y,hp:100,closed:false,priority:1};
    state.doors.push(obj);emit(hooks,'Blast-door chamber installed at '+x+', '+y+'.');
    return {ok:true,door:obj};
  }
  function toggleDoor(state,id,hooks){
    const d=state.doors.find(d=>d.id===id);if(!d)return {ok:false,error:'Door not found.'};
    if(d.hp<=0)return {ok:false,error:'Door destroyed. Repair it first.'};
    d.closed=!d.closed;emit(hooks,'Blast door '+(d.closed?'sealed':'opened')+'.');
    return {ok:true};
  }
  function repair(state,id,hooks) {
    const d=state.doors.find(d=>d.id===id);
    if(d){
      if(state.resources.scrap<3)return {ok:false,error:'Requires 3 salvage.'};
      state.resources.scrap-=3;d.hp=min(100,d.hp+45);emit(hooks,'Security chamber reinforced.');return {ok:true};
    }
    const r=room(state,id);if(!r)return {ok:false,error:'Structure not found.'};
    if(state.resources.scrap<3)return {ok:false,error:'Requires 3 salvage.'};
    state.resources.scrap-=3;r.integrity=min(100,r.integrity+40);r.captured=false;
    emit(hooks,(ROOMS[r.type]?.label||r.type)+' repaired.');return {ok:true};
  }
  function negotiate(state,id,hooks){
    const person=get(state,id);
    if(!person||person.dead)return {ok:false,error:'Resident unavailable.'};
    if(state.resources.food<1||state.resources.water<1)return {ok:false,error:'A sincere offer needs at least 1 ration and 1 water.'};
    state.resources.food-=1;state.resources.water-=1;
    person.morale=min(100,person.morale+28);person.loyalty=min(100,person.loyalty+15);
    person.striking=false;if(person.state==='strike')person.state='idle';
    emit(hooks,person.name+' accepted a fair settlement and returned to the community.');
    return {ok:true};
  }
  function setPolicy(state,key,value,hooks){
    if(!['rationing','overtime'].includes(key))return {ok:false,error:'Unknown policy.'};
    state.policy[key]=!!value;emit(hooks,(key==='rationing'?'Emergency rationing':'Overtime shifts')+
      (value?' enabled. People will notice.':' disabled.'));return {ok:true};
  }
  function upgradeCost(r){return {scrap:6+(r.level||1)*4,parts:(r.level||1)};}
  function rushRisk(state,id){
    const target=room(state,id);if(!target)return 1;
    const crew=getRoomWorkers(state,id);
    const luck=crew.length?crew.reduce((a,r)=>a+(r.skills?.L||4),0)/crew.length:0;
    return clamp(.30+(target.rushAttempts||0)*.10-luck*.024,.09,.79);
  }
  function rush(state,id,hooks){
    const target=room(state,id);if(!target)return {ok:false,error:'Room not found.'};
    if(!['garden','water','medbay'].includes(target.type))
      return {ok:false,error:'Only supply-producing rooms may be rushed.'};
    if(!active(state,target))return {ok:false,error:'The room is offline.'};
    if(!getRoomWorkers(state,id).length)return {ok:false,error:'Assign workers before rushing production.'};
    const risk=rushRisk(state,id),roll=nextRand(state);
    target.rushAttempts=(target.rushAttempts||0)+1;
    if(roll<risk){
      if(!state.incidents.some(e=>e.roomId===id))
        state.incidents.push({id:++state.threatId,kind:'fire',roomId:id,severity:24,seconds:0});
      emit(hooks,'RUSH FAILED! Equipment overheated and caused a fire in '+ROOMS[target.type].label+'.',true);
      return {ok:true,success:false,risk};
    }
    const amount=2+(target.level||1)*2;
    const type=target.type==='garden'?'food':target.type==='water'?'water':'meds';
    state.resources[type]+=amount;
    emit(hooks,'RUSH SUCCESS: '+amount+' '+type+' collected immediately.');
    return {ok:true,success:true,risk};
  }
  function craft(state,kind,hooks){
    const workshop=state.rooms.find(r=>r.type==='workshop'&&active(state,r));
    if(!workshop)return {ok:false,error:'Build and power a workshop before crafting.'};
    const crew=getRoomWorkers(state,workshop.id);
    if(!crew.length)return {ok:false,error:'Assign a resident to the workshop first.'};
    const recipes={
      medicine:{cost:{scrap:3,parts:1},output:{meds:2}},
      fuel:{cost:{scrap:4,parts:1},output:{fuel:3}},
      components:{cost:{scrap:7},output:{parts:2}}
    };
    const recipe=recipes[kind];
    if(!recipe)return {ok:false,error:'Unknown recipe.'};
    for(const [r,n] of Object.entries(recipe.cost))if(state.resources[r]<n)
      return {ok:false,error:'Not enough '+r+' to craft '+kind+'.'};
    for(const [r,n] of Object.entries(recipe.cost))state.resources[r]-=n;
    for(const [r,n] of Object.entries(recipe.output))state.resources[r]+=n;
    emit(hooks,'Workshop produced '+kind+' using recovered materials.');return {ok:true};
  }
  function createRaid(state,hooks,kind='raiders'){
    if(state.threat||state.rooms.length===0)return false;
    state.threat={id:++state.threatId,kind,remaining:kind==='ferals'?3:4,
      hp:kind==='ferals'?72:95,phase:'breach',x:8,y:7,targetRoom:null,
      attackClock:0,raidClock:0,taken:0,controlled:[],lastRoom:null};
    if(state.autoLockdown)state.doors.forEach(d=>{if(d.hp>0)d.closed=true;});
    emit(hooks,'EMERGENCY: '+(kind==='ferals'?'FERAL INFECTED':'RAIDER')+' BREACH DETECTED. Secure corridors or assign defenders!',true);
    return true;
  }
  function defend(state,id,hooks){
    const r=get(state,id);if(!r||r.dead||r.trapped)return {ok:false,error:'Resident is unavailable.'};
    if(r.taskId){const p=state.projects.find(p=>p.id===r.taskId);if(p)p.workers=p.workers.filter(w=>w!==r.id);r.taskId=null;}
    r.jobRoom=null;r.state='defending';r.defending=true;r.path=[];
    emit(hooks,r.name+' assigned to emergency defence.');
    return {ok:true};
  }
  function standDown(state,id,hooks){
    const r=get(state,id);if(!r)return {ok:false,error:'Resident unavailable.'};
    r.defending=false;r.state='idle';emit(hooks,r.name+' stood down from defence.');return {ok:true};
  }
  function triggerFire(state,hooks,type='fire'){
    const candidate=state.rooms.filter(r=>r.integrity>0);
    if(!candidate.length)return null;
    const target=candidate[Math.floor(nextRand(state)*candidate.length)];
    if(state.incidents.some(e=>e.roomId===target.id))return null;
    const incident={id:++state.threatId,kind:type,roomId:target.id,severity:24,seconds:0};
    state.incidents.push(incident);
    emit(hooks,(type==='fire'?'FIRE':'VERMIN')+' ALERT in '+(ROOMS[target.type]?.label||target.type)+'. Send residents to contain it!',true);
    return incident;
  }
  function contain(state,id,hooks){
    const r=get(state,id);if(!r||r.dead)return {ok:false,error:'Resident unavailable.'};
    const incident=state.incidents[0];
    if(!incident)return {ok:false,error:'No active incident.'};
    return assignment(state,id,incident.roomId,hooks);
  }
  function tick(state,dt,hooks){
    if(state.loss)return;
    const p=power(state);
    state.simSeconds+=dt;
    const residents=alive(state);
    const consuming=residents.length;
    // Consumption is continuous; both visible stocks and rates update immediately.
    const rationFactor=state.policy.rationing?.70:1;
    const foodOut=consuming*.0034*dt*rationFactor;
    const waterOut=consuming*.0043*dt*rationFactor;
    state.resources.food=max(0,state.resources.food-foodOut);
    state.resources.water=max(0,state.resources.water-waterOut);
    const gennies=state.rooms.filter(r=>r.type==='generator'&&r.integrity>0).length;
    const fuelOut=p.generation>0?gennies*.0042*dt:0;
    state.resources.fuel=max(0,state.resources.fuel-fuelOut);
    let foodIn=0,waterIn=0,medIn=0,ventilation=0;
    for(const r of state.rooms){
      if(!active(state,r,p))continue;
      const crew=getRoomWorkers(state,r.id);
      const skill=ROOMS[r.type]?.skill;
      const effectiveness=crew.reduce((v,c)=>v+(c.skills?.[skill]??4),0);
      if(r.type==='water'&&crew.length)waterIn+=dt*(.010+.004*effectiveness)*(1+((r.level||1)-1)*.35);
      if(r.type==='garden'&&crew.length)foodIn+=dt*(.009+.004*effectiveness)*(1+((r.level||1)-1)*.35);
      if(r.type==='medbay'&&crew.length)medIn+=dt*(.0018+.0004*effectiveness)*(1+((r.level||1)-1)*.35);
      if(r.type==='ventilation')ventilation+=dt*(crew.length?.13:.05);
      if(r.type==='training'&&crew.length){
        for(const person of crew){
          const focus=r.focus||'S';
          person.trainingProgress[focus]=(person.trainingProgress[focus]||0)+dt*(.15+.02*(person.skills.I||4));
          if(person.trainingProgress[focus]>=100 && person.skills[focus]<10){
            person.trainingProgress[focus]=0;person.skills[focus]++;
            person.strength=person.skills.S;
            emit(hooks,person.name+' improved '+focus+' to '+person.skills[focus]+' through training.');
          }
        }
      }
      if(r.type==='radio'&&crew.length)state.nextArrival-=dt*(.12+effectiveness*.028);
      if(r.rushAttempts>0)r.rushAttempts=Math.max(0,r.rushAttempts-dt/220);
      if(crew.length && ['generator','water','garden','medbay','radio','security','ventilation','training','workshop'].includes(r.type)){
        for(const c of crew){c.xp=(c.xp||0)+dt*.10;
          if(c.xp>=80+c.level*20){c.xp=0;c.level++;c.health=min(100,c.health+12);emit(hooks,c.name+' advanced to level '+c.level+'.');}
        }
      }
    }
    const storage=state.rooms.filter(r=>r.type==='storage'&&r.integrity>0&&!r.captured).length;
    state.resources.food=min(26+storage*32,state.resources.food+foodIn);
    state.resources.water=min(28+storage*32,state.resources.water+waterIn);
    state.resources.meds=min(8+storage*8,state.resources.meds+medIn);
    state.resources.scrap=min(150+storage*150,state.resources.scrap);
    state.resources.parts=min(60+storage*35,state.resources.parts);
    state.resources.fuel=min(26+storage*24,state.resources.fuel);
    state.airQuality=clamp(state.airQuality+dt*(p.lit?.035:-.11)+ventilation-
      consuming*.0008*dt,0,100);
    if(state.airQuality<24){
      for(const resident of residents){resident.health=max(0,resident.health-dt*.04);}
      if(state.simSeconds-state.lastShortage>40){
        emit(hooks,'AIR QUALITY CRITICAL: Supply ventilation or restore grid power.',true);
        state.lastShortage=state.simSeconds;
      }
    }
    const access=hooks?.accessible?.();
    if(access){
      for(const rm of state.rooms){
        rm.air=Number.isFinite(rm.air)?rm.air:95;
        const connected=Array.from({length:rm.width},(_,i)=>access.has((rm.x+i)+','+(rm.y+1))).some(Boolean);
        if(!connected){
          rm.air=clamp(rm.air-dt*(.21-(rm.type==='ventilation'&&active(state,rm,p)?.16:0)),0,100);
          if(rm.air<20)for(const resident of residents){
            if(resident.y>=rm.y&&resident.y<=rm.y+1&&resident.x>=rm.x&&resident.x<rm.x+rm.width)
              resident.health=max(0,resident.health-dt*.20);
          }
        }else rm.air=clamp(rm.air+dt*.30,0,state.airQuality);
      }
    }
    state.resourceRate={food:0,water:0,fuel:0};
    state.resourceRate.food=round((foodIn-foodOut)/dt*60);
    state.resourceRate.water=round((waterIn-waterOut)/dt*60);
    state.resourceRate.fuel=round(-fuelOut/dt*60);
    if(state.resources.food<1||state.resources.water<1){
      if(state.simSeconds-state.lastShortage>40){
        emit(hooks,'WARNING: Critical supply shortage. Residents are becoming weak. Scavenge or staff production rooms.',true);
        state.lastShortage=state.simSeconds;
      }
      for(const r of residents){
        if(state.resources.food<1)r.hunger=max(0,r.hunger-dt*.16);
        if(state.resources.water<1)r.thirst=max(0,r.thirst-dt*.24);
      }
    }
    if(!p.lit && state.rooms.length){
      for(const r of residents)if(r.y>=9)r.energy=max(0,r.energy-dt*.06);
    }
    if(state.resources.fuel<=0 && gennies && state.simSeconds-state.lastShortage>50){
      emit(hooks,'Generator fuel exhausted. Scavenge fuel from the surface.',true);
      state.lastShortage=state.simSeconds;
    }
    // Refugees don't automatically enter. A player chooses whom to admit.
    state.nextArrival-=dt;
    if(state.nextArrival<=0){
      if(state.arrivals.length<3){
        const next=createArrival(state);
        emit(hooks,'SURFACE VISITOR: '+next.candidate.name+' requests shelter. Choose Admit or Turn Away.');
      }
      state.nextArrival=185+nextRand(state)*75;
    }
    state.nextIncident-=dt;
    if(state.nextIncident<=0){
      triggerFire(state,hooks,nextRand(state)>.45?'fire':'vermin');
      state.nextIncident=200+nextRand(state)*150;
    }
    state.nextRaid-=dt;
    if(state.nextRaid<=0){
      if(state.rooms.length>=2)createRaid(state,hooks);
      state.nextRaid=280+nextRand(state)*130;
    }
    for(const incident of state.incidents.slice()){
      const rm=room(state,incident.roomId);if(!rm){state.incidents=state.incidents.filter(e=>e!==incident);continue;}
      incident.seconds+=dt;
      const crew=getRoomWorkers(state,rm.id);
      const capability=crew.reduce((n,r)=>n+(r.skills?.E||4)+r.weapon*2,0);
      incident.severity+=dt*(crew.length?-(capability*.3):1.4);
      if(!crew.length)rm.integrity=max(0,rm.integrity-dt*.28);
      for(const r of crew)if(incident.severity>6)r.health=max(0,r.health-dt*.15);
      if(incident.severity<=0){
        state.incidents=state.incidents.filter(e=>e!==incident);
        emit(hooks,(incident.kind==='fire'?'Fire':'Vermin')+' contained in '+(ROOMS[rm.type]?.label||rm.type)+'.');
      }
      if(incident.severity>100){
        incident.severity=35;
        const close=state.rooms.find(r=>r.id!==rm.id&&Math.abs(r.x-rm.x)<10&&Math.abs(r.y-rm.y)<=3&&
          !state.incidents.some(e=>e.roomId===r.id)&&(!hooks?.roomRoute||hooks.roomRoute(rm,r)));
        if(close)state.incidents.push({id:++state.threatId,kind:incident.kind,roomId:close.id,severity:18,seconds:0});
        emit(hooks,'Incident spreading through the settlement. Dispatch workers!',true);
      }
    }
    for(const r of residents){
      if(state.policy.rationing)r.morale=max(0,r.morale-dt*.018);
      else if(state.resources.food>1&&state.resources.water>1&&r.morale<72)r.morale=min(72,r.morale+dt*.007);
      if(state.policy.overtime){r.energy=max(0,r.energy-dt*.045);r.morale=max(0,r.morale-dt*.009);}
      if(r.morale<18&&r.loyalty<30&&!r.striking&&!r.trapped){
        if(r.taskId){const job=state.projects.find(p=>p.id===r.taskId);if(job)job.workers=job.workers.filter(id=>id!==r.id);}
        r.striking=true;r.jobRoom=null;r.taskId=null;r.state='strike';
        emit(hooks,r.name+' has joined a strike over poor living conditions. Address their needs or negotiate.',true);
      }
      if(r.striking&&r.morale>=47){r.striking=false;r.state='idle';emit(hooks,r.name+' returned to duty.');}
      if(r.infection>0){
        r.infection=min(110,r.infection+dt*.045);
        if(r.infection>58){
          for(const peer of residents){
            if(peer.id!==r.id&&!peer.dead&&peer.infection<100 && Math.abs(peer.x-r.x)<2.5 &&
              Math.abs(peer.y-r.y)<1.5){
              const protection=state.rooms.some(room=>room.type==='ventilation'&&active(state,room,p))?.45:1;
              peer.infection=min(100,peer.infection+dt*.009*protection);
            }
          }
        }
        if(r.infection>60)r.morale=max(0,r.morale-dt*.02);
        if(r.infection>=100){
          r.dead=true;r.state='dead';r.recoverable=false;r.jobRoom=null;r.taskId=null;r.defending=false;
          emit(hooks,r.name+' succumbed to infection. Feral activity reported.',true);
          createRaid(state,hooks,'ferals');
        }
      }
      if(r.health<=0 && !r.dead){
        if(r.taskId){const job=state.projects.find(p=>p.id===r.taskId);if(job)job.workers=job.workers.filter(id=>id!==r.id);}
        r.dead=true;r.state='dead';r.jobRoom=null;r.taskId=null;r.defending=false;
        emit(hooks,r.name+' has died. Medical revival may be possible.',true);
      }
      if(r.morale<12){
        r.loyalty=max(0,r.loyalty-dt*.035);
        if(r.loyalty<=1){
          r.dead=true;r.recoverable=false;r.state='deserted';
          emit(hooks,r.name+' abandoned the settlement after prolonged deprivation.',true);
        }
      }
    }
    for(const trap of state.traps) {
      if(!trap.rescued){
        trap.air=max(0,trap.air-dt*.14);
        for(const id of trap.people){
          const resident=get(state,id);
          if(!resident||resident.dead)continue;
          if(trap.air<25)resident.health=max(0,resident.health-dt*.20);
        }
      }
    }
    if(!alive(state).length && state.arrivals.length===0){
      state.loss={reason:'The last surviving resident is gone. The underground settlement has fallen.',at:state.minutes};
      emit(hooks,'VAULT LOST: No survivors remain.',true);
    }
  }
  // A separate model keeps raiders and defend/door effects deterministic and testable.
  function tickRaid(state,dt,hooks,pathToRoom) {
    const raid=state.threat;if(!raid)return;
    raid.raidClock+=dt;
    const targets=state.rooms.filter(r=>r.integrity>0&&!r.captured);
    if(!targets.length){raid.hp=0;}
    if(raid.hp>0){
      const target=room(state,raid.targetRoom)||targets[0];
      if(target && (!raid.targetRoom||target.captured)){
        const nearest=targets.sort((a,b)=>(Math.abs(a.x-raid.x)+Math.abs(a.y-raid.y))-
          (Math.abs(b.x-raid.x)+Math.abs(b.y-raid.y)))[0];
        raid.targetRoom=nearest?.id||null;
      }
      const next=room(state,raid.targetRoom);
      if(next) {
        const origin={x:Math.round(raid.x),y:Math.round(raid.y)};
        const goal={x:next.x+Math.floor(next.width/2),y:next.y+1};
        const ideal=pathToRoom?pathToRoom(origin,goal,true):null;
        const barrierStep=ideal?.find(pt=>state.doors.some(d=>d.closed&&d.hp>0&&d.x===pt.x&&d.y===pt.y));
        const barrier=barrierStep?state.doors.find(d=>d.closed&&d.hp>0&&d.x===barrierStep.x&&d.y===barrierStep.y):null;
        if(barrier){
          raid.phase='blocked';
          const near=Math.abs(barrier.x-raid.x)+Math.abs(barrier.y-raid.y)<=1.15;
          if(near){
            barrier.hp=max(0,barrier.hp-dt*1.1);
            if(barrier.hp===0){barrier.closed=false;emit(hooks,'A blast door was breached!',true);}
          }else{
            const first=ideal?.[0];
            // Rounding to a tile during animation must never strand an attacker
            // halfway between a corridor tile and its closed blast door.
            const p=first?.x===barrier.x&&first?.y===barrier.y?origin:first;
            if(p){
              const dx=p.x-raid.x,dy=p.y-raid.y,dist=Math.hypot(dx,dy),step=min(dist,dt*.56);
              if(dist>.002){raid.x+=dx/dist*step;raid.y+=dy/dist*step;}
            }
          }
        }else{
          raid.phase='inside';
          const path=pathToRoom?pathToRoom(origin,goal):null;
          if(path?.length){
            const p=path[0],dx=p.x-raid.x,dy=p.y-raid.y,dist=Math.hypot(dx,dy),step=min(dist,dt*.56);
            if(dist>.002){raid.x+=dx/dist*step;raid.y+=dy/dist*step;}
          }else{
            // Solid ground and unconnected floors cannot be crossed by invaders.
            raid.phase='seeking-access';
          }
        }
        const defenders=alive(state).filter(r=>r.defending||r.jobRoom===next.id && r.weapon>1)
          .filter(r=>Math.abs(r.x-raid.x)<5 || r.jobRoom===next.id);
        const defense=defenders.reduce((n,r)=>n+(r.weapon+(.07*(r.skills?.S||4)))*dt*2.6,0);
        raid.hp-=defense;
        if(!barrier && Math.abs(raid.x-goal.x)<1.8 && Math.abs(raid.y-goal.y)<1.5) {
            next.integrity=max(0,next.integrity-dt*(defenders.length?.25:1.4));
            for(const defender of defenders){defender.health=max(0,defender.health-dt*.34);}
            raid.attackClock+=dt;
            if(raid.attackClock>10){
              raid.attackClock=0;
              if(next.integrity<=20){
                next.captured=true;raid.controlled.push(next.id);
                emit(hooks,'HOSTILE CONTROL: '+(ROOMS[next.type]?.label||next.type)+' has been captured.',true);
                raid.targetRoom=null;
              }
              if(state.resources.food>0)state.resources.food=max(0,state.resources.food-.5);
              if(state.resources.water>0)state.resources.water=max(0,state.resources.water-.5);
              raid.taken+=1;
            }
          }
      }
    }
    if(raid.hp<=0){
      const wasLost=raid.controlled.length;
      emit(hooks,raid.kind==='ferals'?'Feral threat eliminated.':'Raiders repelled. Check damaged sectors.');
      if(wasLost)emit(hooks,wasLost+' room(s) remain under hostile occupation. Repair to reclaim them.',true);
      state.threat=null;
      for(const r of alive(state)){if(r.defending){r.defending=false;r.state='idle';}}
    }
    if(state.rooms.length>0 && state.rooms.every(r=>r.captured||r.integrity<=0) && raid.raidClock>60){
      state.loss={reason:'Hostile forces captured or destroyed every functional room.',at:state.minutes};
      emit(hooks,'THE SHELTER HAS FALLEN: Hostile occupation is total.',true);
      return;
    }
    if(raid.raidClock>165){
      emit(hooks,'Hostiles withdrew after looting the shelter.',true);state.threat=null;
      for(const r of alive(state)){if(r.defending){r.defending=false;r.state='idle';}}
    }
  }
  function trap(state,residentId,x,y,hooks){
    const r=get(state,residentId);
    if(!r||r.dead||r.trapped)return null;
    const event={id:++state.threatId,x,y,people:[residentId],air:100,rescued:false};
    state.traps.push(event);
    r.trapped=true;r.state='trapped';r.path=[];r.taskId=null;
    emit(hooks,'CAVE-IN! '+r.name+' is trapped behind unstable rubble. Organize a rescue!',true);
    return event;
  }
  function rescue(state,trapId,hooks){
    const event=state.traps.find(e=>e.id===trapId&&!e.rescued);
    if(!event)return {ok:false,error:'Rescue no longer available.'};
    if(state.projects.some(p=>p.rescueId===trapId&&p.status==='active'))return {ok:false,error:'Rescue already underway.'};
    const job={id:state.nextId++,kind:'rescue',rescueId:trapId,cells:[{x:event.x,y:event.y}],workers:[],status:'planned',progress:0};
    state.projects.push(job);emit(hooks,'Rescue order prepared. Assign residents to clear the rubble.');return {ok:true,job};
  }
  function finishRescue(state,trapId,hooks){
    const event=state.traps.find(e=>e.id===trapId);
    if(!event||event.rescued)return;
    event.rescued=true;for(const id of event.people){const r=get(state,id);
      if(r&&!r.dead){r.trapped=false;r.state='resting';r.energy=min(r.energy,35);r.taskId=null;}}
    emit(hooks,'RESCUE COMPLETE! Trapped survivors have been recovered.',false);
  }
  window.VDSystems={
    ROOMS,normalize,capacity,power,active,getRoomWorkers,assignment,unassign,shift,
    createArrival,admit,reject,heal,revive,equip,door,toggleDoor,repair,
    createRaid,defend,standDown,triggerFire,contain,tick,tickRaid,trap,rescue,finishRescue,negotiate,setPolicy,craft,upgradeCost,rushRisk,rush,alive,get,room
  };
})();