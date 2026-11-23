(() => {
  'use strict';
  // VAULT DIRECTIVE V4: original simulation model, with one clock and one source of truth.
  // No browser DOM is used here. The controller and cutaway renderer are separate.
  const W=40, H=20, TILE=78, SAVE='gameshub.vault-directive.cutaway.v4';
  const SKILLS=['S','P','E','C','I','A','L'];
  const ROOM={
    generator:{name:'Generator',icon:'ϟ',cost:[8,2],draw:0,gen:3,skill:'S',workers:3,desc:'Burns fuel to power the entire shelter.',color:'#d8b477',at:0},
    water:{name:'Water treatment',icon:'◈',cost:[7,1],draw:2,cycle:23,yield:7,resource:'water',skill:'P',workers:3,desc:'Purifies drinking water for every resident.',color:'#8fcad0',at:0},
    kitchen:{name:'Canteen',icon:'◒',cost:[7,1],draw:2,cycle:23,yield:7,resource:'food',skill:'A',workers:3,desc:'Prepares meals and emergency rations.',color:'#d7ab7c',at:0},
    bunks:{name:'Living quarters',icon:'▥',cost:[6,0],draw:1,skill:'C',workers:0,desc:'Beds for new settlers and a place to recover.',color:'#a6c8a7',at:0},
    storage:{name:'Storage bay',icon:'▤',cost:[6,0],draw:1,workers:0,skill:'E',desc:'Increases shelter storage capacity.',color:'#aeb6b9',at:4},
    air:{name:'Air filtration',icon:'≋',cost:[9,2],draw:2,workers:2,skill:'I',desc:'Improves shelter oxygen and sealed-sector survival.',color:'#90c5b0',at:5},
    medbay:{name:'Medical station',icon:'✚',cost:[9,2],draw:2,cycle:35,yield:2,resource:'meds',workers:3,skill:'I',desc:'Produces medicine and treats injured people.',color:'#a2d0c1',at:5},
    security:{name:'Security office',icon:'◇',cost:[10,2],draw:2,workers:3,skill:'E',desc:'Improves defence, surveillance, and incident response.',color:'#d4a58e',at:6},
    radio:{name:'Radio station',icon:'⌁',cost:[11,2],draw:2,workers:2,skill:'C',desc:'Broadcasts a safe haven to stranded survivors.',color:'#b1b4d6',at:7},
    workshop:{name:'Workshop',icon:'⚒',cost:[10,2],draw:3,workers:3,skill:'S',desc:'Converts salvaged junk into useful equipment.',color:'#d1b78d',at:8},
    training:{name:'Training hall',icon:'⌘',cost:[8,2],draw:2,workers:3,skill:'I',desc:'Improves resident abilities during assigned shifts.',color:'#bba6d3',at:8},
    greenhouse:{name:'Greenhouse',icon:'❈',cost:[12,3],draw:2,cycle:18,yield:10,resource:'food',workers:3,skill:'A',desc:'Efficient food production deep underground.',color:'#93cb93',at:10}
  };
  const LOCATIONS=[
    {id:'clinic',name:'Derelict clinic',risk:'LOW',description:'Medicine, bottled water and spare instruments.',
      rooms:[{name:'Waiting room',icon:'▣',loot:{water:2,food:1,scrap:1}}, {name:'Supply closet',icon:'✚',loot:{meds:2,parts:1,water:2}},
        {name:'Treatment ward',icon:'◇',loot:{meds:1,scrap:3},hazard:'infection'}, {name:'Backup generator',icon:'ϟ',loot:{scrap:5,parts:2,fuel:4},task:'salvage'}]},
    {id:'market',name:'Collapsed market',risk:'LOW',description:'Old food stores and hardware in damaged buildings.',
      rooms:[{name:'Storefront',icon:'▤',loot:{food:4,water:2}}, {name:'Stockroom',icon:'▥',loot:{food:5,parts:1}},
        {name:'Workshop',icon:'⚙',loot:{scrap:5,parts:2},task:'salvage'}, {name:'Loading bay',icon:'◈',loot:{fuel:3,scrap:4},enemy:'raider'}]},
    {id:'subway',name:'Abandoned transit hub',risk:'MEDIUM',description:'A dangerous route through the buried railway.',
      rooms:[{name:'Platform',icon:'▣',loot:{water:2,scrap:2}}, {name:'Service tunnel',icon:'⌁',loot:{scrap:7,parts:1},task:'salvage'},
        {name:'Signal room',icon:'⚙',loot:{parts:3,fuel:3},enemy:'feral'}, {name:'Collapsed carriage',icon:'♡',loot:{food:1,meds:1},rescue:true}]},
    {id:'relay',name:'Old relay station',risk:'HIGH',description:'Communications hardware, armed scavengers and stranded people.',
      rooms:[{name:'Security gate',icon:'◇',loot:{scrap:4},enemy:'raider'}, {name:'Transmitter',icon:'⌁',loot:{parts:4,fuel:2},task:'salvage'},
        {name:'Generator hall',icon:'ϟ',loot:{fuel:7,scrap:6},enemy:'raider'}, {name:'Shelter pod',icon:'♡',loot:{meds:2,parts:1},rescue:true}]}
  ];
  const INITIAL_PEOPLE=[
    {name:'Mara Voss',role:'Engineer',skin:'#c9a083',hair:'#423127',coat:'#799c8d',skills:{S:7,P:5,E:5,C:3,I:6,A:4,L:4}},
    {name:'Eli Mercer',role:'Scout',skin:'#edc4a0',hair:'#6a4c3b',coat:'#ae8467',skills:{S:5,P:7,E:5,C:4,I:4,A:6,L:5}},
    {name:'Iris Chen',role:'Medic',skin:'#cfa48c',hair:'#252c2d',coat:'#879ab3',skills:{S:3,P:6,E:4,C:7,I:8,A:5,L:4}}
  ];
  const FIRST=['Nora','Jonah','Sylvie','Tomas','Amina','Theo','June','Cass','Liv','Owen','Rhea','Kai'];
  const LAST=['Vale','Price','Reed','Gale','Cross','Morrow','Keller','Dawson','Shaw','Hayes','Park','Stone'];
  const clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
  const cell=(x,y)=>x+','+y;
  const valid=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
  const isFloor=y=>y>=4 && (y-4)%3===0; // rooms are two tiles high; third row is traversable floor
  const rowTop=y=>2+3*Math.floor((Math.max(2,y)-2)/3);
  const getRoom=(s,id)=>s.rooms.find(r=>r.id===id);
  const getPerson=(s,id)=>s.people.find(p=>p.id===id);
  const live=s=>s.people.filter(p=>p.hp>0&&!p.left);
  const inWorld=p=>p.hp>0&&!p.left&&!p.away;
  const rand=s=>{s.seed=(Math.imul(s.seed>>>0,1664525)+1013904223)>>>0;return s.seed/4294967296;};
  const choice=(s,a)=>a[Math.floor(rand(s)*a.length)];
  function message(s,text,urgent=false){
    s.reports.unshift({day:Math.floor(s.time/1440)+1,time:Math.floor(s.time%1440),text,urgent});
    s.reports=s.reports.slice(0,45);
    s.lastMessage=text;
    if(urgent)s.lastUrgent=text;
  }
  function bornResident(s,details){
    const id=++s.nextId;
    return {id,name:details.name,role:details.role||'Resident',
      skin:details.skin||'#d1aa85',hair:details.hair||'#44332a',coat:details.coat||'#78998f',
      skills:{...details.skills},hp:100,hunger:87,thirst:87,energy:88,morale:76,loyalty:74,
      x:8+((id-1)%3),y:4,goalX:null,goalY:null,path:[],taskId:null,roomId:null,
      state:'idle',weapon:1,shift:'flex',infection:0,level:1,xp:0,away:false,stunned:0,
      trapped:false,left:false,child:false,age:22+(id%11),growth:0};
  }
  function fresh(){
    const terrain=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>y<2?0:(y>=11?2:1)));
    // The entry shaft and a modest mined access passage are NOT constructed rooms.
    for(let y=1;y<=4;y++)terrain[y][7]=0;
    for(let x=7;x<=12;x++)terrain[4][x]=0;
    for(let x=8;x<=11;x++)terrain[3][x]=0;
    const s={version:4,time:475,elapsed:0,speed:1,paused:false,seed:92641,
      nextId:100,terrain,rooms:[],jobs:[],doors:[],ladders:[],events:[],visitors:[],
      people:[],selectedWorker:null,discovered:[],sites:LOCATIONS.map(l=>({id:l.id,seen:l.id==='clinic'||l.id==='market',
        searched:l.rooms.map(()=>false)})),expedition:null,survey:null,
      res:{food:24,water:26,fuel:20,scrap:22,parts:8,meds:2},
      rates:{food:0,water:0,fuel:0},air:96,power:{supply:0,demand:1,online:[],connected:[]},
      stage:'survival',threat:null,incidents:[],nextVisitor:70,nextIncident:240,nextRaid:365,
      lastTickFood:24,policies:{rations:false,overtime:false,autoLock:false},
      tasks:{inspected:false,dug:false,built:false,staffed:false,collected:false,expedition:false,admitted:false,door:false},
      rewards:[],tutorial:true,seenIntro:false,gameOver:false,saveAge:0,
      reports:[],lastMessage:'The hatch opens. Nothing else works yet.',lastUrgent:null};
    for(const details of INITIAL_PEOPLE)s.people.push(bornResident(s,details));
    s.nextId=Math.max(s.nextId,...s.people.map(p=>p.id));
    message(s,'Three survivors reached the abandoned ridge. There is no settlement yet.');
    return s;
  }
  function safeLoad(){
    try{
      const text=localStorage.getItem(SAVE);
      if(!text)return fresh();
      const s=JSON.parse(text);
      if(s.version!==4||!Array.isArray(s.terrain)||s.terrain.length!==H||!Array.isArray(s.people))return fresh();
      if(!s.discovered)s.discovered=[];
      s.rooms||=[];s.jobs||=[];s.events||=[];s.incidents||=[];s.ladders||=[];s.doors||=[];
      s.visitors||=[];s.reports||=[];s.survey||=null;s.expedition||=null;
      s.policies||={rations:false,overtime:false,autoLock:false};s.tasks||={};
      for(const k of ['inspected','dug','built','staffed','collected','expedition','admitted','door'])s.tasks[k]??=false;
      for(const p of s.people){p.path=[];p.goalX=null;p.goalY=null;p.infection??=0;p.weapon??=1;p.shift||='flex';}
      for(const r of s.rooms){r.integrity??=100;r.air??=95;r.level??=1;r.priority??=2;r.progress??=0;r.ready??=false;}
      for(const l of LOCATIONS)if(!s.sites.some(st=>st.id===l.id))s.sites.push({id:l.id,seen:false,searched:l.rooms.map(()=>false)});
      s.speed=1;s.paused=false;return s;
    }catch(e){console.warn('Vault save could not be restored.',e);return fresh();}
  }
  function save(s){try{localStorage.setItem(SAVE,JSON.stringify(s));return true;}catch(e){return false;}}
  function erase(){try{localStorage.removeItem(SAVE);}catch(e){}}
  const terrainClear=(s,x,y)=>valid(x,y)&&s.terrain[y][x]===0;
  const doorAt=(s,x,y)=>s.doors.find(d=>d.x===x&&d.y===y);
  const roomAt=(s,x,y)=>s.rooms.find(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+3);
  const jobAt=(s,x,y)=>s.jobs.find(j=>!j.done&&!j.cancelled && j.cells.some(c=>c.x===x&&c.y===y));
  const ladderAt=(s,x,y)=>s.ladders.some(l=>l.x===x&&l.y===y)||(x===7&&y>=1&&y<=4);
  function walkable(s,x,y,openDoors=false){
    if(!terrainClear(s,x,y))return false;
    if(!isFloor(y) && !ladderAt(s,x,y))return false;
    const d=doorAt(s,x,y);
    return !(d&&d.closed&&d.hp>0&&!openDoors);
  }
  function route(s,from,to,openDoors=false){
    const a={x:Math.round(from.x),y:Math.round(from.y)},dest={x:Math.round(to.x),y:Math.round(to.y)};
    if(!walkable(s,a.x,a.y,openDoors)||!walkable(s,dest.x,dest.y,openDoors))return null;
    const q=[a],vis=new Set([cell(a.x,a.y)]),back=new Map();
    for(let i=0;i<q.length;i++){
      const t=q[i];if(t.x===dest.x&&t.y===dest.y){
        const path=[];let k=cell(t.x,t.y);
        while(k!==cell(a.x,a.y)){const [x,y]=k.split(',').map(Number);path.unshift({x,y});k=back.get(k);}
        return path;
      }
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const v={x:t.x+dx,y:t.y+dy},k=cell(v.x,v.y);
        if(vis.has(k)||!walkable(s,v.x,v.y,openDoors))continue;
        if(dy!==0 && !(ladderAt(s,t.x,t.y)&&ladderAt(s,v.x,v.y)))continue;
        vis.add(k);back.set(k,cell(t.x,t.y));q.push(v);
      }
    }
    return null;
  }
  function connected(s,openDoors=false){
    const q=[{x:7,y:4}],vis=new Set(['7,4']);
    for(let i=0;i<q.length;i++){
      const a=q[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const x=a.x+dx,y=a.y+dy,k=cell(x,y);
        if(vis.has(k)||!walkable(s,x,y,openDoors))continue;
        if(dy!==0&&!(ladderAt(s,a.x,a.y)&&ladderAt(s,x,y)))continue;
        vis.add(k);q.push({x,y});
      }
    }return vis;
  }
  function roomConnected(s,r,reach){
    for(let x=r.x;x<r.x+r.w;x++)if(reach.has(cell(x,r.y+2)))return true;
    return false;
  }
  function team(s,r){return live(s).filter(p=>p.roomId===r.id&&!p.taskId&&!p.away&&!p.trapped&&
    p.state==='working'&&Math.abs(p.y-(r.y+2))<.15&&p.x>=r.x-.1&&p.x<r.x+r.w+.1&&
    (p.shift==='flex'||(p.shift==='day'?s.time%1440>=420&&s.time%1440<1200:
      !(s.time%1440>=420&&s.time%1440<1200))));}
  function capacity(s){return 3+s.rooms.filter(r=>r.type==='bunks'&&r.integrity>0&&!r.captured).reduce((n,r)=>n+Math.max(3,r.w)*(r.level||1),0);}
  function power(s){
    const reach=connected(s);
    let supply=0,demand=1;const online=[];
    const generators=s.rooms.filter(r=>r.type==='generator'&&r.integrity>0&&!r.captured&&roomConnected(s,r,reach));
    for(const r of generators)if(s.res.fuel>0)supply+=ROOM.generator.gen+(team(s,r).length?team(s,r).reduce((n,p)=>n+p.skills.S/2+1,0):0)+(r.level-1)*3;
    for(const r of s.rooms){if(r.type!=='generator')demand+=(ROOM[r.type]?.draw??1);}
    let remain=Math.max(0,supply-1);
    const sorted=s.rooms.filter(r=>r.type!=='generator').slice().sort((a,b)=>a.priority-b.priority||
      (a.type==='water'?-1:b.type==='water'?1:0)||a.id-b.id);
    for(const r of sorted){
      const need=ROOM[r.type].draw;
      if(r.integrity>0&&!r.captured&&roomConnected(s,r,reach)&&remain>=need){remain-=need;online.push(r.id);}
    }
    s.power={supply:Math.round(supply*10)/10,demand,online,connected:Array.from(reach)};
    return s.power;
  }
  function powered(s,r){return r&&r.integrity>0&&!r.captured&&(r.type==='generator'?s.res.fuel>0:s.power.online.includes(r.id));}
  function assign(s,personId,roomId){
    const p=getPerson(s,personId),r=getRoom(s,roomId);
    if(!p||!r||!inWorld(p)||p.trapped||p.child)return {ok:false,msg:'That survivor cannot take this assignment.'};
    if(!ROOM[r.type].workers)return {ok:false,msg:'This room does not require a work crew.'};
    if(live(s).filter(q=>q.roomId===roomId&&q.id!==personId).length>=Math.min(ROOM[r.type].workers,r.w))
      return {ok:false,msg:'That room is fully staffed.'};
    if(p.taskId){const old=s.jobs.find(j=>j.id===p.taskId);if(old)old.workers=old.workers.filter(id=>id!==p.id);}
    p.taskId=null;p.roomId=r.id;p.path=[];p.state='walking';s.tasks.staffed=true;
    message(s,p.name+' assigned to '+ROOM[r.type].name+'.');return {ok:true};
  }
  function unassign(s,id){
    const p=getPerson(s,id);if(!p)return;
    p.roomId=null;p.taskId=null;p.path=[];p.state='idle';message(s,p.name+' returned to general duties.');
  }
  function selectWorkerFor(s,job){
    const available=live(s).filter(p=>inWorld(p)&&!p.child&&!p.trapped&&!p.away&&!p.taskId);
    const specialists=available.sort((a,b)=>(b.skills.S||0)-(a.skills.S||0));
    if(!specialists.length)return null;
    const p=specialists[0];
    if(p.roomId)p.roomId=null;
    p.taskId=job.id;p.path=[];job.workers.push(p.id);
    return p;
  }
  function assignJob(s,jobId,personId){
    const job=s.jobs.find(j=>j.id===jobId&&!j.done&&!j.cancelled),p=getPerson(s,personId);
    if(!job||!p||!inWorld(p)||p.trapped||p.child)return {ok:false,msg:'Worker unavailable.'};
    if(p.taskId){const old=s.jobs.find(j=>j.id===p.taskId);if(old)old.workers=old.workers.filter(id=>id!==p.id);}
    p.taskId=job.id;p.roomId=null;p.path=[];p.state='walking';
    if(!job.workers.includes(p.id))job.workers.push(p.id);
    message(s,p.name+' joined the '+job.kind+' team.');return {ok:true};
  }
  function dig(s,ax,ay,bx,by){
    const x0=clamp(Math.min(ax,bx),0,W-1),x1=clamp(Math.max(ax,bx),0,W-1);
    const y0=clamp(Math.min(ay,by),2,H-1),y1=clamp(Math.max(ay,by),2,H-1);
    if((x1-x0+1)*(y1-y0+1)>48)return {ok:false,msg:'Select a smaller excavation area (48 tiles maximum).'};
    const cells=[];for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)
      if(s.terrain[y][x]>0&&!jobAt(s,x,y))cells.push({x,y,progress:0});
    if(!cells.length)return {ok:false,msg:'Choose untouched earth next to your shelter.'};
    const reach=connected(s);
    if(!cells.some(c=>[[-1,0],[1,0],[0,1],[0,-1]].some(([dx,dy])=>reach.has(cell(c.x+dx,c.y+dy)))))
      return {ok:false,msg:'Start by excavating beside a reachable corridor, not deep inside solid rock.'};
    const job={id:++s.nextId,kind:'dig',cells,workers:[],progress:0,done:false,cancelled:false};
    s.jobs.push(job);
    const p=selectWorkerFor(s,job);
    s.tasks.dug=true;
    message(s,'Excavation marked: '+cells.length+' tiles'+(p?' · '+p.name+' is on the way.':'. Assign a worker from the roster.') );
    return {ok:true,job};
  }
  function build(s,type,x,y,w){
    const def=ROOM[type];if(!def)return {ok:false,msg:'Unknown facility.'};
    if(live(s).length<def.at)return {ok:false,msg:'Requires a population of '+def.at+' to unlock.'};
    const top=rowTop(y);w=clamp(w,3,6);
    if(top<2||top+2>=H||x<0||x+w>W)return {ok:false,msg:'There is not enough ground for this room.'};
    if(s.res.scrap<def.cost[0]||s.res.parts<def.cost[1])return {ok:false,msg:'Not enough salvage or components. Explore the surface.'};
    for(let yy=top;yy<=top+2;yy++)for(let xx=x;xx<x+w;xx++){
      if(!terrainClear(s,xx,yy)||roomAt(s,xx,yy)||jobAt(s,xx,yy)||doorAt(s,xx,yy)||ladderAt(s,xx,yy))
        return {ok:false,msg:'Dig all three rows of this chamber first. Avoid shafts, doors and other rooms.'};
    }
    const reach=connected(s);
    if(!Array.from({length:w},(_,i)=>reach.has(cell(x+i,top+2))).some(Boolean))
      return {ok:false,msg:'This room needs a connected, walkable floor.'};
    s.res.scrap-=def.cost[0];s.res.parts-=def.cost[1];
    const job={id:++s.nextId,kind:'build',type,x,y:top,w,
      cells:Array.from({length:w},(_,i)=>({x:x+i,y:top+2})),workers:[],
      progress:0,required:8+w*1.1,done:false,cancelled:false};
    s.jobs.push(job);
    const p=selectWorkerFor(s,job);
    message(s,def.name+' construction started'+(p?' · '+p.name+' assigned.':'. Choose a builder.'));
    return {ok:true,job};
  }
  function upgrade(s,id){
    const r=getRoom(s,id);if(!r||r.level>=3)return {ok:false,msg:'This facility cannot be upgraded further.'};
    const price=4+r.level*5,parts=r.level+1;
    if(s.res.scrap<price||s.res.parts<parts)return {ok:false,msg:'Need '+price+' salvage and '+parts+' components.'};
    if(s.jobs.some(j=>!j.done&&!j.cancelled&&j.roomId===id))return {ok:false,msg:'The facility is already under construction.'};
    s.res.scrap-=price;s.res.parts-=parts;
    const job={id:++s.nextId,kind:'upgrade',roomId:id,x:r.x,y:r.y,w:r.w,
      cells:[{x:r.x+Math.floor(r.w/2),y:r.y+2}],workers:[],
      progress:0,required:14+r.level*6,done:false,cancelled:false};
    s.jobs.push(job);selectWorkerFor(s,job);
    message(s,'Upgrade underway for '+ROOM[r.type].name+'.');return {ok:true,job};
  }
  function installLadder(s,x,y){
    if(!terrainClear(s,x,y)||!valid(x,y)||s.ladders.some(l=>l.x===x&&l.y===y)||roomAt(s,x,y)||jobAt(s,x,y))
      return {ok:false,msg:'First dig a clear vertical shaft tile.'};
    if(s.res.scrap<2)return {ok:false,msg:'A ladder needs 2 salvage.'};
    if(![[0,1],[0,-1]].some(([dx,dy])=>ladderAt(s,x+dx,y+dy)))
      return {ok:false,msg:'Connect the new ladder vertically to an existing ladder.'};
    s.res.scrap-=2;s.ladders.push({x,y});
    message(s,'A new ladder section connects the lower shaft.');return {ok:true};
  }
  function installDoor(s,x,y){
    if(!terrainClear(s,x,y)||!isFloor(y)||doorAt(s,x,y)||roomAt(s,x,y)||jobAt(s,x,y))
      return {ok:false,msg:'Build blast doors inside empty, walkable corridors.'};
    if(!terrainClear(s,x-1,y)||!terrainClear(s,x+1,y))
      return {ok:false,msg:'A blast-door chamber must connect passages on both sides.'};
    if(s.res.scrap<6||s.res.parts<1)return {ok:false,msg:'Requires 6 salvage and 1 component.'};
    s.res.scrap-=6;s.res.parts--;
    const d={id:++s.nextId,x,y,closed:false,hp:100};
    s.doors.push(d);s.tasks.door=true;
    message(s,'Reinforced blast door installed. It can isolate an entire sector.');
    return {ok:true,door:d};
  }
  function toggleDoor(s,id){
    const d=s.doors.find(d=>d.id===id);
    if(!d||d.hp<=0)return {ok:false,msg:'Door destroyed. Repair the chamber first.'};
    d.closed=!d.closed;
    if(d.closed)for(const p of s.people)p.path=[];
    message(s,'Blast-door chamber '+(d.closed?'SEALED':'OPENED')+'.');
    return {ok:true,door:d};
  }
  function repair(s,id){
    if(s.res.scrap<3)return {ok:false,msg:'Repairs require 3 salvage.'};
    const obj=s.doors.find(x=>x.id===id)||getRoom(s,id);
    if(!obj)return {ok:false,msg:'Nothing to repair.'};
    s.res.scrap-=3;obj.hp=obj.hp===undefined?undefined:clamp(obj.hp+45,0,100);
    if(obj.integrity!==undefined){obj.integrity=clamp(obj.integrity+45,0,100);obj.captured=false;}
    message(s,'Damaged equipment repaired and secured.');return {ok:true};
  }
  function createVisitor(s,rescued=false){
    const n=FIRST[Math.floor(rand(s)*FIRST.length)]+' '+LAST[Math.floor(rand(s)*LAST.length)];
    const stat={S:3,P:3,E:3,C:3,I:3,A:3,L:3};
    const strong=choice(s,SKILLS);stat[strong]=6+Math.floor(rand(s)*3);
    const visitor={id:++s.nextId,name:n,role:rescued?'Rescued wanderer':'Wasteland refugee',
      skills:stat,skin:choice(s,['#d9af90','#a27a62','#bd9279','#efc9a3']),hair:choice(s,['#322e2a','#614735','#1c2829']),
      coat:choice(s,['#929b7f','#b08f79','#70938d','#7d8caa']),rescued};
    s.visitors.push(visitor);
    message(s,visitor.name+' is waiting at the hatch'+(rescued?' after being rescued.':'.'),false);
    return visitor;
  }
  function admit(s,id){
    const v=s.visitors.find(v=>v.id===id);
    if(!v)return {ok:false,msg:'Visitor is no longer waiting.'};
    if(live(s).length>=capacity(s))return {ok:false,msg:'No available beds. Build living quarters first.'};
    const p=bornResident(s,v);p.name=v.name;p.role=v.role;p.hp=v.rescued?65:92;p.morale=v.rescued?59:72;
    s.people.push(p);s.visitors=s.visitors.filter(v=>v.id!==id);s.tasks.admitted=true;
    message(s,v.name+' joined the settlement. Population '+live(s).length+'/'+capacity(s)+'.');return {ok:true,person:p};
  }
  function reject(s,id){const v=s.visitors.find(v=>v.id===id);if(!v)return;
    s.visitors=s.visitors.filter(v=>v.id!==id);message(s,v.name+' was turned away from the entrance.');}
  function medicine(s,id){
    const p=getPerson(s,id);if(!p||!s.res.meds)return {ok:false,msg:'Medicine unavailable.'};
    s.res.meds--;p.hp=clamp(p.hp+42,0,100);p.infection=clamp(p.infection-45,0,100);
    message(s,p.name+' treated with precious medical supplies.');return {ok:true};
  }
  function equip(s,id){
    const p=getPerson(s,id);
    if(!p||p.child||s.res.scrap<3||s.res.parts<1)return {ok:false,msg:'Defensive equipment requires 3 salvage and 1 component.'};
    if(p.weapon>=4)return {ok:false,msg:'Weapon equipment is already at maximum.'};
    s.res.scrap-=3;s.res.parts--;p.weapon++;message(s,p.name+' equipped with stronger defensive gear.');return {ok:true};
  }
  function dispatch(s,id){
    const p=getPerson(s,id);if(!p||!inWorld(p)||p.child||p.trapped)return {ok:false,msg:'Defender unavailable.'};
    if(p.taskId){const j=s.jobs.find(j=>j.id===p.taskId);if(j)j.workers=j.workers.filter(x=>x!==p.id);}
    p.taskId=null;p.roomId=null;p.path=[];p.state='defending';message(s,p.name+' assigned to armed defence.');return {ok:true};
  }
  function changeShift(s,id,shift){
    const p=getPerson(s,id);if(!p||!['flex','day','night'].includes(shift))return {ok:false,msg:'Shift is unavailable.'};
    p.shift=shift;message(s,p.name+' scheduled for '+shift+' shift.');return {ok:true};
  }
  function rush(s,id){
    const r=getRoom(s,id),def=ROOM[r?.type];
    if(!r||!def.cycle||!powered(s,r)||!team(s,r).length)return {ok:false,msg:'This room needs power and at least one worker to rush production.'};
    const risk=clamp(.30+r.rush*0.09-team(s,r).reduce((n,p)=>n+p.skills.L,0)*.014,.08,.85);
    r.rush++;
    if(rand(s)<risk){
      s.incidents.push({id:++s.nextId,kind:'fire',roomId:r.id,severity:31});
      message(s,'A failed production rush caused a fire in the '+def.name+'!',true);
      return {ok:true,success:false,risk};
    }
    r.progress=def.cycle;r.ready=true;
    message(s,def.name+' production rushed successfully!');return {ok:true,success:true,risk};
  }
  function collect(s,id){
    const r=getRoom(s,id),def=ROOM[r?.type];
    if(!r||!r.ready||!def.resource)return {ok:false,msg:'No supplies are ready to collect yet.'};
    const amount=def.yield+(r.level-1)*3+Math.max(0,team(s,r).length-1);
    const cap=resourceCap(s,def.resource);
    const actual=Math.min(amount,Math.max(0,cap-s.res[def.resource]));
    s.res[def.resource]+=actual;r.ready=false;r.progress=0;s.tasks.collected=true;
    message(s,'Collected '+actual.toFixed(1)+' '+def.resource+' from '+def.name+'.');return {ok:true,amount:actual};
  }
  function resourceCap(s,type){
    const extra=s.rooms.filter(r=>r.type==='storage'&&powered(s,r)).reduce((n,r)=>n+28*r.level,0);
    return ({food:45,water:45,fuel:40,meds:14,scrap:150,parts:40}[type]||100)+extra;
  }
  function move(s,p,to,dt){
    if(!to||!inWorld(p))return false;
    if(Math.hypot(p.x-to.x,p.y-to.y)<.035){p.x=to.x;p.y=to.y;p.path=[];return true;}
    if(!p.path?.length||p.goalX!==to.x||p.goalY!==to.y){
      p.path=route(s,{x:p.x,y:p.y},to)||[];p.goalX=to.x;p.goalY=to.y;
    }
    if(!p.path.length)return false;
    const n=p.path[0],dx=n.x-p.x,dy=n.y-p.y,dist=Math.hypot(dx,dy),step=dt*(1.55+p.skills.A*.04);
    if(dist<=step){p.x=n.x;p.y=n.y;p.path.shift();}
    else{p.x+=dx/dist*step;p.y+=dy/dist*step;}
    return Math.hypot(p.x-to.x,p.y-to.y)<.035;
  }
  function findDigWork(s,p,job){
    const reach=connected(s);
    let best=null,score=Infinity;
    for(const c of job.cells){
      if(s.terrain[c.y][c.x]===0)continue;
      for(let xx=c.x-1;xx<=c.x+1;xx++){
        for(let yy=Math.max(4,c.y-2);yy<=Math.min(H-1,c.y+2);yy++){
          if(!(isFloor(yy)||ladderAt(s,xx,yy))||!reach.has(cell(xx,yy)))continue;
          const path=route(s,{x:p.x,y:p.y},{x:xx,y:yy});if(!path)continue;
          const v=path.length*3+Math.hypot(c.x-xx,c.y-yy)+c.y*.07;
          if(v<score){score=v;best={tile:c,stand:{x:xx,y:yy}};}
        }
      }
    }
    return best;
  }
  function finishJob(s,j){
    j.done=true;
    for(const p of s.people)if(p.taskId===j.id){p.taskId=null;p.path=[];p.state='idle';}
    if(j.kind==='dig')message(s,'Excavation cleared. The chamber is ready for construction.');
    if(j.kind==='build'){
      s.rooms.push({id:++s.nextId,type:j.type,x:j.x,y:j.y,w:j.w,level:1,integrity:100,air:95,
        progress:0,ready:false,priority:2,captured:false,rush:0});
      s.tasks.built=true;message(s,ROOM[j.type].name+' built. Assign a worker to operate it.');
    }
    if(j.kind==='upgrade'){const r=getRoom(s,j.roomId);if(r){r.level++;r.integrity=100;message(s,ROOM[r.type].name+' upgraded to level '+r.level+'.');}}
    if(j.kind==='rescue'){
      const trap=s.events.find(e=>e.id===j.trapId);
      if(trap){trap.cleared=true;s.terrain[trap.y][trap.x]=0;
        for(const id of trap.victims){const p=getPerson(s,id);if(p&&p.hp>0){p.trapped=false;p.energy=35;p.state='resting';}}}
      message(s,'RESCUE COMPLETE! Trapped residents brought back alive.');
    }
  }
  function work(s,p,dt){
    const j=s.jobs.find(j=>j.id===p.taskId&&!j.done&&!j.cancelled);
    if(!j){p.taskId=null;return;}
    let target=null,stand=null;
    if(j.kind==='dig'){
      const f=findDigWork(s,p,j);
      if(!f){if(j.cells.every(c=>s.terrain[c.y][c.x]===0))finishJob(s,j);else p.state='waiting';return;}
      target=f.tile;stand=f.stand;
    }else if(j.kind==='rescue'){
      const event=s.events.find(e=>e.id===j.trapId&&!e.cleared);
      if(!event){finishJob(s,j);return;}
      const spots=[{x:event.x-1,y:event.y},{x:event.x+1,y:event.y},{x:event.x,y:event.y+1}].filter(t=>walkable(s,t.x,t.y));
      stand=spots.find(t=>route(s,p,t))||null;
      if(!stand){p.state='waiting';return;}
    }else{
      stand={x:j.x+Math.floor(j.w/2),y:j.y+2};
      if(!walkable(s,stand.x,stand.y)){p.state='waiting';return;}
    }
    if(!move(s,p,stand,dt)){p.state='walking';return;}
    p.state=j.kind==='dig'?'digging':j.kind==='rescue'?'rescuing':'building';
    const rate=dt*(.65+p.skills.S*.145)*(s.policies.overtime?1.25:1);
    p.energy=clamp(p.energy-dt*.06,0,100);
    if(j.kind==='dig'){
      const hardness=s.terrain[target.y][target.x]===2?2.5:1;
      target.progress+=rate/hardness;
      if(target.progress>=2.3){
        s.terrain[target.y][target.x]=0;target.progress=2.3;
        if(target.y>=10&&rand(s)<.018){ // deep collapses are rare but physical
          s.terrain[target.y][target.x]=3;
          p.trapped=true;p.taskId=null;p.state='trapped';j.workers=j.workers.filter(id=>id!==p.id);
          const event={id:++s.nextId,kind:'collapse',x:target.x,y:target.y,victims:[p.id],air:120,cleared:false};
          s.events.push(event);
          message(s,'CAVE-IN! '+p.name+' is trapped behind unstable rock.',true);
        }
        if(j.cells.every(c=>s.terrain[c.y][c.x]===0))finishJob(s,j);
      }
    }else{
      j.progress+=rate;
      if(j.progress>=(j.required||20))finishJob(s,j);
    }
  }
  function rescue(s,eventId){
    const event=s.events.find(e=>e.id===eventId&&!e.cleared);
    if(!event)return {ok:false,msg:'There is no active rescue here.'};
    if(s.jobs.some(j=>j.kind==='rescue'&&j.trapId===eventId&&!j.done&&!j.cancelled))
      return {ok:false,msg:'Rescue crew already mobilized.'};
    const job={id:++s.nextId,kind:'rescue',trapId:eventId,cells:[{x:event.x,y:event.y}],workers:[],
      progress:0,required:22,done:false,cancelled:false};
    s.jobs.push(job);const worker=selectWorkerFor(s,job);
    message(s,'Rescue team '+(worker?'mobilized for '+event.x+','+event.y+'.':'awaiting a free worker.'),true);
    return {ok:true,job};
  }
  function rescuerOrder(s,eventId,mode){
    const e=s.events.find(e=>e.id===eventId&&!e.cleared);
    if(!e)return {ok:false,msg:'The collapse is no longer active.'};
    if(!['conserve','self'].includes(mode))return {ok:false,msg:'Unknown survival order.'};
    const p=getPerson(s,e.victims[0]);
    if(mode==='self'&&(!p||p.skills.S<5))return {ok:false,msg:'That survivor needs a stronger helper to move the rock.'};
    e.mode=mode;message(s,mode==='conserve'?'Trapped people conserving oxygen.':'Trapped survivor trying to dig free.');
    return {ok:true};
  }
  function incident(s,kind,roomId){
    const r=getRoom(s,roomId);
    if(!r||s.incidents.some(i=>i.roomId===r.id))return;
    s.incidents.push({id:++s.nextId,kind,roomId:r.id,severity:30});
    message(s,(kind==='fire'?'FIRE':'INFESTATION')+' in '+ROOM[r.type].name+'! Assign emergency responders.',true);
  }
  function respond(s,id){
    const p=getPerson(s,id);if(!p||!inWorld(p)||p.child)return {ok:false,msg:'That resident cannot respond.'};
    p.state='responding';p.taskId=null;p.roomId=null;p.path=[];message(s,p.name+' is responding to the emergency.');
    return {ok:true};
  }
  function raid(s,feral=false,x=7,y=4){
    if(s.threat)return;
    s.threat={kind:feral?'feral':'raiders',x,y,hp:feral?55:85,max:feral?55:85,
      targetId:null,controlled:[],time:0,number:feral?2:3};
    if(s.policies.autoLock)s.doors.forEach(d=>d.closed=true);
    message(s,feral?'FERAL OUTBREAK INSIDE THE SHELTER!':'RAIDERS ARE BREACHING THE HATCH!',true);
  }
  function tickRaid(s,dt){
    const h=s.threat;if(!h)return;
    h.time+=dt;
    const targets=s.rooms.filter(r=>r.integrity>0&&!r.captured);
    if(!targets.length&&s.rooms.length){s.gameOver=true;message(s,'Hostile forces captured every functioning sector.',true);return;}
    const target=targets.find(r=>r.id===h.targetId)||
      targets.sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x))[0];
    if(target){
      h.targetId=target.id;
      const to={x:target.x+Math.floor(target.w/2),y:target.y+2};
      const path=route(s,{x:h.x,y:h.y},to,true);
      const step=path?.[0];
      const closed=step&&s.doors.find(d=>d.closed&&d.hp>0&&d.x===step.x&&d.y===step.y)||
        path?.map(v=>doorAt(s,v.x,v.y)).find(d=>d&&d.closed&&d.hp>0);
      if(closed){
        if(Math.abs(h.x-closed.x)+Math.abs(h.y-closed.y)<=1.15){
          closed.hp=clamp(closed.hp-dt*.8,0,100);
          if(!closed.hp){closed.closed=false;message(s,'A blast door was breached!',true);}
        }else if(step&&!(step.x===closed.x&&step.y===closed.y)){
          const dx=step.x-h.x,dy=step.y-h.y,dist=Math.hypot(dx,dy),v=dt*.48;
          h.x+=dx/dist*Math.min(dist,v);h.y+=dy/dist*Math.min(dist,v);
        }
      }else if(step){
        const dx=step.x-h.x,dy=step.y-h.y,dist=Math.hypot(dx,dy),v=dt*.48;
        if(dist>.001){h.x+=dx/dist*Math.min(dist,v);h.y+=dy/dist*Math.min(dist,v);}
      }
      const guards=live(s).filter(p=>p.state==='defending'||p.roomId===target.id&&p.weapon>1)
        .filter(p=>Math.hypot(p.x-h.x,p.y-h.y)<4.6&&inWorld(p));
      const strength=guards.reduce((n,p)=>n+(p.weapon*1.9+p.skills.S*.13),0);
      h.hp-=strength*dt*.7;
      for(const p of guards)if(Math.hypot(p.x-h.x,p.y-h.y)<2.2)p.hp=clamp(p.hp-dt*.19,0,100);
      if(Math.hypot(to.x-h.x,to.y-h.y)<1.7&&!closed){
        target.integrity=clamp(target.integrity-dt*(guards.length?.20:1.1),0,100);
        if(target.integrity<15){target.captured=true;h.controlled.push(target.id);h.targetId=null;message(s,ROOM[target.type].name+' was CAPTURED by hostile forces!',true);}
        s.res.food=clamp(s.res.food-dt*.014,0,999);
      }
    }
    if(h.hp<=0){
      message(s,h.kind==='feral'?'The feral attackers have been stopped.':'The raiders have been repelled.');
      s.threat=null;for(const p of s.people)if(p.state==='defending')p.state='idle';
    }else if(h.time>=175){
      message(s,'The attackers withdrew, leaving damage behind.',true);
      s.threat=null;for(const p of s.people)if(p.state==='defending')p.state='idle';
    }
  }
  function tickIncidents(s,dt){
    for(const i of s.incidents.slice()){
      const r=getRoom(s,i.roomId);if(!r){s.incidents=s.incidents.filter(j=>j!==i);continue;}
      const responders=live(s).filter(p=>p.state==='responding'&&Math.hypot(p.x-(r.x+r.w/2),p.y-(r.y+2))<4);
      const rate=responders.reduce((n,p)=>n+p.skills.E*.2+p.weapon,0);
      i.severity+=dt*(rate?-(rate*.45):1.1);
      if(!rate)r.integrity=clamp(r.integrity-dt*.22,0,100);
      if(i.severity<=0){
        s.incidents=s.incidents.filter(j=>j!==i);
        for(const p of responders)p.state='idle';
        message(s,(i.kind==='fire'?'Fire':'Infestation')+' contained at '+ROOM[r.type].name+'.');
      }
      if(i.severity>100){
        i.severity=30;
        const next=s.rooms.find(a=>a.id!==r.id&&Math.abs(a.x-r.x)<r.w+3&&Math.abs(a.y-r.y)<=3&&!s.incidents.some(j=>j.roomId===a.id));
        if(next)incident(s,i.kind,next.id);
      }
    }
  }
  function tickPopulation(s,dt){
    s.nextVisitor-=dt;
    const staffedRadio=s.rooms.find(r=>r.type==='radio'&&powered(s,r)&&team(s,r).length);
    if(staffedRadio)s.nextVisitor-=dt*.5;
    if(s.nextVisitor<=0){
      if(s.visitors.length<2)createVisitor(s);
      s.nextVisitor=135+rand(s)*90;
    }
    for(const p of live(s)){
      if(p.away)continue;
      p.hunger=clamp(p.hunger-dt*(s.res.food>0?.005:.12),0,100);
      p.thirst=clamp(p.thirst-dt*(s.res.water>0?.006:.18),0,100);
      const hard=['digging','building','working','defending','rescuing'].includes(p.state);
      p.energy=clamp(p.energy+dt*(hard?-(s.policies.overtime?.065:.042):.025),0,100);
      if(p.energy<12&&p.state!=='resting'&&!p.trapped){p.state='resting';p.taskId=null;p.roomId=null;}
      if(p.state==='resting'){
        const bunks=s.rooms.some(r=>r.type==='bunks'&&powered(s,r));
        p.energy=clamp(p.energy+dt*(bunks?.45:.25),0,100);
        if(p.energy>75)p.state='idle';
      }
      if(s.res.food<1)p.hp=clamp(p.hp-dt*.05,0,100);
      if(s.res.water<1)p.hp=clamp(p.hp-dt*.10,0,100);
      if(s.air<22)p.hp=clamp(p.hp-dt*.055,0,100);
      if(p.infection>0){
        p.infection=clamp(p.infection+dt*.11,0,100);
        if(p.infection>50){
          for(const other of live(s))if(other.id!==p.id&&!other.away&&Math.hypot(p.x-other.x,p.y-other.y)<2){
            other.infection=clamp(other.infection+dt*.023,0,100);
          }
        }
        if(p.infection>=100){
          p.hp=0;p.state='feral';message(s,p.name+' succumbed to infection and turned feral!',true);
          raid(s,true,p.x,p.y);
        }
      }
      if(s.policies.rations)p.morale=clamp(p.morale-dt*.028,0,100);
      else if(s.res.food>2&&s.res.water>2)p.morale=clamp(p.morale+dt*.006,0,86);
      if(s.policies.overtime)p.morale=clamp(p.morale-dt*.016,0,100);
      if(p.morale<18){p.loyalty=clamp(p.loyalty-dt*.065,0,100);
        if(p.loyalty<15&&p.state!=='striking'){p.state='striking';p.roomId=null;p.taskId=null;message(s,p.name+' is refusing to work. Morale has collapsed.',true);}
        if(p.loyalty===0){p.left=true;message(s,p.name+' deserted the shelter.',true);}
      }
      if(p.hp<=0){p.roomId=null;p.taskId=null;p.state='dead';}
      if(p.child){
        p.growth=Math.max(0,p.growth-dt);
        if(p.growth===0){p.child=false;p.age=18;p.role='Resident';message(s,p.name+' reached adulthood and can take a job.');}
      }
    }
    if(!live(s).length&&!s.visitors.length){s.gameOver=true;message(s,'The last resident is gone. The colony has fallen.',true);}
  }
  function tickProduction(s,dt){
    const pwr=power(s),generation=s.rooms.filter(r=>r.type==='generator'&&powered(s,r));
    s.rates.food=-(live(s).length)*(s.policies.rations?.008:.012)*60;
    s.rates.water=-(live(s).length)*(s.policies.rations?.009:.014)*60;
    s.rates.fuel=-generation.length*.012*60;
    s.res.food=clamp(s.res.food+dt*s.rates.food/60,0,resourceCap(s,'food'));
    s.res.water=clamp(s.res.water+dt*s.rates.water/60,0,resourceCap(s,'water'));
    s.res.fuel=clamp(s.res.fuel+dt*s.rates.fuel/60,0,resourceCap(s,'fuel'));
    let ventilation=pwr.supply>0?.02:-.11;
    for(const r of s.rooms){
      if(!powered(s,r))continue;
      const def=ROOM[r.type],crew=team(s,r);
      if(r.type==='air')ventilation+=.06+crew.length*.025;
      if(def.cycle&&!r.ready&&crew.length){
        const skill=crew.reduce((n,p)=>n+(p.skills[def.skill]||4),0);
        const cycle=def.cycle/(1+.02*skill+.16*(r.level-1));
        r.progress+=dt*(s.policies.overtime?1.25:1);
        if(r.progress>=cycle){r.progress=cycle;r.ready=true;message(s,def.name+' has a full production batch ready to collect.');}
      }
      if(r.type==='training'&&crew.length){
        for(const member of crew){member.xp+=dt*.12;
          if(member.xp>=100){member.xp-=100;const key=choice(s,SKILLS);
            member.skills[key]=clamp(member.skills[key]+1,1,10);member.level++;
            message(s,member.name+' improved '+key+' through training.');}
        }
      }
    }
    s.air=clamp(s.air+dt*ventilation-dt*live(s).length*.003,0,100);
    const reach=new Set(pwr.connected);
    for(const r of s.rooms){
      if(!roomConnected(s,r,reach))r.air=clamp(r.air-dt*(powered(s,r)&&r.type==='air'?.05:.16),0,100);
      else r.air=clamp(r.air+dt*.20,0,s.air);
      if(r.air<12)for(const person of live(s))if(person.x>=r.x&&person.x<r.x+r.w&&person.y===r.y+2)
        person.hp=clamp(person.hp-dt*.16,0,100);
    }
  }
  function tickJobs(s,dt){
    for(const p of s.people){
      if(!inWorld(p)||p.trapped||p.child||p.state==='striking')continue;
      if(p.taskId){work(s,p,dt);continue;}
      if(p.state==='defending'){
        if(s.threat){
          const hostile={x:Math.round(s.threat.x),y:Math.round(s.threat.y)};
          let destination=hostile;
          if(!walkable(s,destination.x,destination.y)){
            const alternatives=[[1,0],[-1,0],[0,1],[0,-1]]
              .map(([dx,dy])=>({x:hostile.x+dx,y:hostile.y+dy}))
              .filter(c=>walkable(s,c.x,c.y)&&route(s,p,c));
            destination=alternatives.sort((a,b)=>
              Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]||null;
          }
          if(destination && Math.hypot(p.x-s.threat.x,p.y-s.threat.y)>1.4)move(s,p,destination,dt);
        }
        continue;
      }
      if(p.state==='responding'){
        const i=s.incidents[0],r=getRoom(s,i?.roomId);
        if(r){move(s,p,{x:r.x+Math.floor(r.w/2),y:r.y+2},dt);continue;}
        p.state='idle';
      }
      if(p.state==='resting')continue;
      if(p.roomId){
        const r=getRoom(s,p.roomId);if(!r){p.roomId=null;p.state='idle';continue;}
        const day=s.time%1440>=420&&s.time%1440<1200;
        if((p.shift==='day'&&!day)||(p.shift==='night'&&day)){p.state='off-duty';continue;}
        const spot={x:r.x+Math.floor(r.w/2),y:r.y+2};
        if(move(s,p,spot,dt))p.state='working';else p.state='walking';
      }else if(p.state!=='resting'){
        if(Math.hypot(p.x-7,p.y-4)>5&&p.state!=='idle')p.state='idle';
        if(p.state!=='idle')p.state='idle';
      }
    }
  }
  function tickTraps(s,dt){
    for(const e of s.events.filter(e=>e.kind==='collapse'&&!e.cleared)){
      e.air=clamp(e.air-dt*(e.mode==='conserve'?.14:e.mode==='self'?.45:.28),0,120);
      if(e.mode==='self'){
        const survivor=getPerson(s,e.victims[0]);if(survivor?.hp>0&&survivor.skills.S>=5){
          e.self=(e.self||0)+dt*(survivor.skills.S*.12);
          if(e.self>25){e.cleared=true;s.terrain[e.y][e.x]=0;survivor.trapped=false;survivor.state='resting';message(s,survivor.name+' broke free of the collapse.');}
        }
      }
      if(e.air<=0){for(const id of e.victims){const p=getPerson(s,id);if(p?.hp>0)p.hp=clamp(p.hp-dt*.38,0,100);}}
    }
  }
  function startExpedition(s,siteId,crew){
    const site=s.sites.find(st=>st.id===siteId&&st.seen),people=crew.map(id=>getPerson(s,id));
    if(!site||s.expedition)return {ok:false,msg:'Select an available explored location.'};
    if(!crew.length||crew.length>2||people.some(p=>!p||!inWorld(p)||p.taskId||p.child||p.trapped))
      return {ok:false,msg:'Choose one or two available adult residents.'};
    s.expedition={siteId,crew:crew.slice(),phase:'travel',timer:0,pos:0,action:null,
      bag:{food:0,water:0,fuel:0,scrap:0,parts:0,meds:0},rescued:0,log:'Your team is traveling toward the site.'};
    for(const p of people){p.away=true;p.state='scavenging';p.roomId=null;p.taskId=null;}
    message(s,people.map(p=>p.name).join(' and ')+' departed for '+getSite(s,siteId).name+'.');
    return {ok:true};
  }
  function getSite(s,id){return LOCATIONS.concat(s.discovered).find(q=>q.id===id);}
  function searchSiteRoom(s,index){
    const e=s.expedition,site=getSite(s,e?.siteId),record=s.sites.find(x=>x.id===e?.siteId);
    if(!e||e.phase!=='explore'||e.action||!site?.rooms[index]||record.searched[index])
      return {ok:false,msg:'That part of the building is already cleared or the team is busy.'};
    const loc=site.rooms[index];
    e.action={index,phase:'walking',progress:0,duration:loc.task==='salvage'?6:4,hp:loc.enemy?35:0};
    e.log='Your team is moving to the '+loc.name+'.';return {ok:true};
  }
  function fight(s,retreat=false){
    const e=s.expedition;if(!e||e.action?.phase!=='encounter')return {ok:false,msg:'There is no active encounter.'};
    if(retreat){e.action=null;e.phase='return';e.timer=0;e.log='Team retreating with everything collected.';return {ok:true};}
    e.action.phase='fighting';e.log='The team is fighting its way through the hostiles.';return {ok:true};
  }
  function returnExpedition(s){
    const e=s.expedition;if(!e||e.phase!=='explore'||e.action)return {ok:false,msg:'Wait until the team finishes its current action.'};
    e.phase='return';e.timer=0;e.log='Heading home through the wasteland.';return {ok:true};
  }
  function tickExpedition(s,dt){
    const e=s.expedition;if(!e)return;
    const site=getSite(s,e.siteId);if(!site){s.expedition=null;return;}
    if(e.phase==='travel'||e.phase==='return'){
      e.timer+=dt;if(e.timer<8)return;
      if(e.phase==='travel'){e.phase='explore';e.timer=0;e.log='Team arrived. Select a room in the building to investigate.';
        message(s,'Scavengers entered '+site.name+'.');}
      else{
        for(const [key,n] of Object.entries(e.bag))s.res[key]=(s.res[key]||0)+n;
        for(const id of e.crew){const p=getPerson(s,id);if(p){p.away=false;p.x=7;p.y=4;p.state='idle';p.path=[];}}
        for(let j=0;j<e.rescued;j++)createVisitor(s,true);
        s.tasks.expedition=true;message(s,'Scavengers returned from '+site.name+' with their recovered supplies.');
        s.expedition=null;
      }return;
    }
    if(!e.action)return;
    const a=e.action,loc=site.rooms[a.index];
    if(a.phase==='walking'){
      const goal=a.index+.5,delta=goal-e.pos;
      e.pos+=Math.sign(delta)*Math.min(Math.abs(delta),dt*.58);
      if(Math.abs(e.pos-goal)<.01){
        e.pos=goal;a.phase=loc.enemy?'encounter':'searching';
        if(loc.enemy)e.log='HOSTILES in '+loc.name+'. Fight or retreat with supplies.';
      }
      return;
    }
    if(a.phase==='encounter')return;
    if(a.phase==='fighting'){
      const crew=e.crew.map(id=>getPerson(s,id)).filter(Boolean);
      a.hp-=dt*crew.reduce((n,p)=>n+p.weapon*1.6+p.skills.S*.22,0);
      for(const p of crew)p.hp=clamp(p.hp-dt*.16,1,100);
      if(a.hp<=0){a.phase='searching';a.progress=0;e.log='The immediate threat is clear. Searching '+loc.name+'.';
        if(loc.enemy==='feral'){crew[0].infection=clamp(crew[0].infection+16,0,100);}
      }
      return;
    }
    if(a.phase==='searching'){
      a.progress+=dt;
      if(a.progress<a.duration)return;
      for(const [key,n] of Object.entries(loc.loot||{}))e.bag[key]=(e.bag[key]||0)+n;
      if(loc.hazard==='infection'){const p=getPerson(s,e.crew[0]);if(p)p.infection=clamp(p.infection+23,0,100);}
      if(loc.rescue)e.rescued++;
      s.sites.find(st=>st.id===e.siteId).searched[a.index]=true;
      e.log=loc.name+' cleared. '+(loc.rescue?'Someone was rescued. ':'')+'Supplies added to the expedition pack.';
      e.action=null;message(s,e.log);
    }
  }
  function startSurvey(s){
    if(s.survey||s.expedition)return {ok:false,msg:'Finish the active field operation first.'};
    if(s.res.food<1||s.res.water<1)return {ok:false,msg:'Send a scout with 1 ration and 1 water.'};
    const scout=live(s).filter(p=>inWorld(p)&&!p.taskId&&!p.child).sort((a,b)=>b.skills.P-a.skills.P)[0];
    if(!scout)return {ok:false,msg:'You need an available scout to survey new territory.'};
    s.res.food--;s.res.water--;scout.away=true;scout.state='survey';
    s.survey={personId:scout.id,timer:24};message(s,scout.name+' is surveying the unexplored wasteland.');
    return {ok:true};
  }
  function tickSurvey(s,dt){
    if(!s.survey)return;
    s.survey.timer-=dt;if(s.survey.timer>0)return;
    const scout=getPerson(s,s.survey.personId);if(scout){scout.away=false;scout.state='idle';scout.x=7;scout.y=4;}
    const index=s.discovered.length+1,source=LOCATIONS[index%LOCATIONS.length];
    const names=['Old pumping works','Worn rail depot','Ruined housing estate','Abandoned bunker','Northern service garage'];
    const found={id:'site-'+index,name:names[(index-1)%names.length]+' '+Math.ceil(index/names.length),
      risk:source.risk,description:'A newly discovered building with untouched rooms.',
      rooms:source.rooms.map(r=>({...r,loot:{...r.loot}}))};
    s.discovered.push(found);s.sites.push({id:found.id,seen:true,searched:found.rooms.map(()=>false)});
    s.survey=null;message(s,'NEW SITE DISCOVERED: '+found.name+'.');return found;
  }
  function startFamily(s,parentA,parentB){
    const a=getPerson(s,parentA),b=getPerson(s,parentB);
    if(!a||!b||a.id===b.id||a.child||b.child||a.hp<=0||b.hp<=0)
      return {ok:false,msg:'Choose two different healthy adults.'};
    if(a.morale<50||b.morale<50)return {ok:false,msg:'Both people need good morale to start a family.'};
    if(live(s).length>=capacity(s)||!s.rooms.some(r=>r.type==='bunks'&&powered(s,r)))
      return {ok:false,msg:'Build powered living quarters with an available bed.'};
    s.family||=[];if(s.family.some(f=>f.parents.includes(parentA)||f.parents.includes(parentB)))
      return {ok:false,msg:'One parent already has a family on the way.'};
    s.family.push({id:++s.nextId,parents:[parentA,parentB],timer:170});
    message(s,a.name+' and '+b.name+' are preparing to raise a family.');return {ok:true};
  }
  function tickFamily(s,dt){
    s.family||=[];
    for(const f of s.family.slice()){
      f.timer-=dt;if(f.timer>0)continue;
      if(live(s).length>=capacity(s)){f.timer=40;continue;}
      const a=getPerson(s,f.parents[0]),b=getPerson(s,f.parents[1]);
      if(!a||!b){s.family=s.family.filter(q=>q.id!==f.id);continue;}
      const kid=bornResident(s,{name:choice(s,FIRST)+' '+a.name.split(' ').at(-1),
        role:'Dependent',skin:a.skin,hair:b.hair,coat:a.coat,skills:{...a.skills}});
      kid.child=true;kid.age=0;kid.growth=220;kid.weapon=0;
      const r=s.rooms.find(r=>r.type==='bunks');if(r){kid.x=r.x+1;kid.y=r.y+2;}
      s.people.push(kid);s.family=s.family.filter(q=>q.id!==f.id);
      message(s,'A child was welcomed into the family. They will grow before joining the workforce.');
    }
  }
  function tick(s,dt){
    if(s.paused||s.gameOver)return;
    dt=clamp(dt,0,.08)*s.speed;s.elapsed+=dt;s.time+=dt*2.5;
    tickJobs(s,dt);tickProduction(s,dt);tickPopulation(s,dt);
    tickTraps(s,dt);tickIncidents(s,dt);tickRaid(s,dt);tickExpedition(s,dt);tickSurvey(s,dt);tickFamily(s,dt);
    s.nextIncident-=dt;s.nextRaid-=dt;
    if(s.nextIncident<=0){
      const options=s.rooms.filter(r=>r.integrity>0);
      if(options.length>=2)incident(s,rand(s)>.5?'fire':'vermin',choice(s,options).id);
      s.nextIncident=210+rand(s)*170;
    }
    if(s.nextRaid<=0){
      if(s.rooms.length>=3)raid(s);
      s.nextRaid=330+rand(s)*180;
    }
  }
  window.VaultModel={
    W,H,TILE,SAVE,ROOM,LOCATIONS,SKILLS,create:fresh,load:safeLoad,save,erase,valid,cell,isFloor,rowTop,clamp,
    terrainClear,ladderAt,doorAt,roomAt,jobAt,walkable,route,connected,roomConnected,getRoom,getPerson,
    live,team,capacity,power,powered,resourceCap,assign,unassign,assignJob,dig,build,upgrade,installLadder,installDoor,toggleDoor,
    repair,createVisitor,admit,reject,medicine,equip,dispatch,changeShift,rush,collect,rescue,rescuerOrder,incident,respond,raid,
    getSite,startExpedition,searchSiteRoom,fight,returnExpedition,startSurvey,startFamily,tick,message
  };
})();