(function(root){
"use strict";
const W=9,H=7,N=W*H,START=4;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a,pick=a=>a[rand(0,a.length-1)];
const ix=(x,y)=>x+y*W,xy=i=>[i%W,Math.floor(i/W)];
const adjacent=i=>{const [x,y]=xy(i);return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>a>=0&&a<W&&b>=0&&b<H).map(([a,b])=>ix(a,b));};
const ROOMS={
 quarters:{name:"Living Quarters",icon:"⌂",desc:"A place to sleep. Four resident beds.",cost:{wood:5,scrap:2},beds:4,type:"quarters"},
 power:{name:"Power Reactor",icon:"ϟ",desc:"Produces electricity with assigned engineers.",cost:{wood:1,scrap:8,stone:3},type:"power",output:20,cycle:12,skill:"engineering"},
 food:{name:"Hydroponic Garden",icon:"✿",desc:"Grow food for hungry settlers.",cost:{wood:6,scrap:3,stone:2},type:"food",output:18,cycle:14,skill:"farming"},
 water:{name:"Water Purifier",icon:"◈",desc:"Clean drinking water, essential to survival.",cost:{wood:2,scrap:6,stone:4},type:"water",output:18,cycle:14,skill:"engineering"},
 storage:{name:"Supply Depot",icon:"▤",desc:"Expand food, power and water storage.",cost:{wood:5,scrap:3},type:"storage"},
 recreation:{name:"Common Room",icon:"♫",desc:"Socializing increases morale.",cost:{wood:7,scrap:4,stone:1},type:"recreation"},
 medical:{name:"Medical Ward",icon:"✚",desc:"Staff with medics to cure sick residents.",cost:{wood:4,scrap:7,stone:3},type:"medical",skill:"medicine",unlock:"medical"},
 security:{name:"Security Post",icon:"⌖",desc:"Guards defend this post on their assigned shifts.",cost:{wood:3,scrap:8,stone:4},type:"security",skill:"combat",unlock:"security"}
};
const SUPPORTS={
 timber:{name:"Timber Frame",cost:{wood:2,stone:1},strength:1},
 stone:{name:"Stone Arch",cost:{stone:3,scrap:2},strength:2,unlock:"stone"},
 steel:{name:"Steel Shoring",cost:{wood:1,stone:1,scrap:5},strength:4,unlock:"steel"}
};
const TECH=[
 {id:"stone",name:"Stone Architecture",cost:8,desc:"Unlock stronger stone tunnel arches.",req:[]},
 {id:"steel",name:"Steel Foundations",cost:15,desc:"Construct reinforced steel tunnel shoring.",req:["stone"]},
 {id:"medical",name:"Field Medicine",cost:12,desc:"Unlock the Medical Ward.",req:[]},
 {id:"security",name:"Vault Defense",cost:12,desc:"Unlock the Security Post.",req:[]},
 {id:"survey",name:"Geotechnical Survey",cost:12,desc:"Reduce deep excavation collapse risk.",req:["stone"]},
 {id:"efficiency",name:"Industrial Planning",cost:16,desc:"Improve production efficiency.",req:[]}
];
const SITES=[
 {id:"grove",name:"Deadwood Grove",risk:0,duration:2.4,distance:"0.3 km",desc:"Timber, loose stone and old tools.",loot:{wood:[8,11],scrap:[2,4],stone:[1,2],food:[0,1],water:[0,1]}},
 {id:"road",name:"Abandoned Highway",risk:.1,duration:3.1,distance:"1.2 km",desc:"Vehicle parts, scrap metal and emergency rations.",loot:{wood:[1,3],scrap:[5,9],stone:[1,3],food:[1,3],water:[1,3]}},
 {id:"market",name:"Derelict Market",risk:.23,duration:4.2,distance:"2.7 km",desc:"Shelves of rations, medicine and discarded equipment.",loot:{wood:[2,4],scrap:[3,6],stone:[0,2],food:[6,10],water:[3,6],medicine:[0,2]}},
 {id:"reservoir",name:"Old Reservoir",risk:.33,duration:5.4,distance:"4.1 km",desc:"Lost infrastructure and water filtration parts.",loot:{wood:[0,2],scrap:[4,7],stone:[3,5],food:[0,1],water:[8,12]}},
 {id:"outpost",name:"Quarantine Outpost",risk:.48,duration:6.3,distance:"6.5 km",desc:"Rare supplies and military salvage. Dangerous.",loot:{wood:[0,2],scrap:[8,11],stone:[2,5],food:[1,4],water:[1,4],medicine:[1,3]}}
];
const FIRST=["Mara","Elias","Rowan","Nina","Owen","Sasha","Tessa","Micah","Iris","Jonah","Mira","Ash","Ellis","Lena","Kiran","Bea","Quinn","Arlo","Faye","Hugo","Dara","Noel","Theo","Cleo","Jade","Silas","Nora"];
const LAST=["Vale","Mercer","Kells","Rowe","Morrow","Hale","Briar","Voss","Nash","Sloane","Dunn","Kade","Rivers","Frost","Marsh","Tanner","West","Lin","Dawes"];
const TRAITS={
 kind:{label:"Compassionate",key:"medicine",plus:2,loyal:6},
 bold:{label:"Bold",key:"combat",plus:2,loyal:1},
 practical:{label:"Practical",key:"engineering",plus:2,loyal:4},
 curious:{label:"Curious",key:"science",plus:2,loyal:0},
 suspicious:{label:"Suspicious",key:"combat",plus:1,loyal:-9},
 calm:{label:"Calm",key:"medicine",plus:1,loyal:5},
 proud:{label:"Proud",key:"combat",plus:1,loyal:-7},
 social:{label:"Sociable",key:"farming",plus:1,loyal:4},
 patient:{label:"Patient",key:"engineering",plus:1,loyal:3}
};
const SHIRTS=["#93b39e","#98a9be","#c9a587","#aa9bb0","#8db6ac","#c0a178"],SKINS=["#efcaa8","#d8a480","#b88462","#8e5f48"],HAIRS=["#292726","#563f30","#896c49","#ad9060"];
const TUTORIAL=[
 ["SCAVENGE YOUR FIRST MATERIALS","You have no production, supplies or residents. Click SCAVENGE and search the Deadwood Grove.","surface"],
 ["DIG A PLACE TO BUILD","Select DIG and click two adjacent dirt tiles to the right of the hatch.","dig"],
 ["REINFORCE YOUR TUNNEL","Select SUPPORT. Install a timber frame inside your newly excavated corridor.","timber"],
 ["BUILD LIVING QUARTERS","Select BUILD, choose Living Quarters, then click the left tile of your supported two-tile chamber.","build"],
 ["SOMEONE IS KNOCKING","Open VISITORS and review your first arrival. You may admit or reject them.","visitors"],
 ["START REAL PRODUCTION","Scavenge, dig and reinforce more space, then construct Power, Food or Water rooms.","build"],
 ["PUT SOMEONE TO WORK","Select a resident, then assign them to a production room so it starts making resources.","roster"],
 ["YOUR CIVILIZATION BEGINS","Balance power, food and water. Grow the vault, guard against raids and keep your residents loyal.","roster"]
];
const blank=()=>({kind:"dirt",support:null,room:null});
function create(name){
 const grid=Array.from({length:N},blank);grid[START]={kind:"open",support:"steel",room:null};
 const s={version:3,name:String(name||"NEW HORIZON").trim().slice(0,25)||"NEW HORIZON",clock:480,day:1,elapsed:0,speed:1,grid,
 rooms:[],people:[],visitors:[],nextId:1,task:null,res:{power:0,food:0,water:0,scrap:0,wood:0,stone:0,medicine:0},
 unlocked:[],research:0,tool:"dig",buildType:"quarters",supportType:"timber",focus:null,selectedPerson:null,
 tutorial:0,skipTutorial:false,scavenges:0,digs:0,collapses:0,nextArrival:22,nextRaid:260,threat:null,
 expeditionHistory:[],lastExpedition:null,
 log:[],totals:{built:0,harvested:0,lost:0}};
 note(s,"The hatch is sealed. You have no rooms, no settlers and no source of supplies. Begin on the surface.");
 return s;
}
function valid(s){return !!(s&&s.version===3&&s.grid?.length===N&&Array.isArray(s.rooms)&&Array.isArray(s.people)&&s.res&&s.log);}
function time(s){const m=Math.floor(s.clock)%1440;return "DAY "+s.day+" · "+String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0");}
function night(s){const h=Math.floor((s.clock%1440)/60);return h<6||h>=21;}
function note(s,message,type="info"){s.log.unshift({when:time(s),message,type});s.log.length= Math.min(s.log.length,90);}
function capacity(s){return s.rooms.filter(r=>r.type==="quarters").length*4;}
function caps(s){const n=s.rooms.filter(r=>r.type==="storage").length;return {power:80+n*40,food:65+n*40,water:65+n*40};}
function morale(s){return s.people.length?Math.round(s.people.reduce((sum,p)=>sum+p.mood,0)/s.people.length):0;}
function afford(s,c){return Object.entries(c||{}).every(([k,v])=>(s.res[k]||0)>=v);}
function spend(s,c){for(const [k,v]of Object.entries(c||{}))s.res[k]-=v;}
function cost(c){return Object.entries(c||{}).filter(([,v])=>v).map(([k,v])=>v+" "+k).join(" · ")||"FREE";}
function access(s,i){
 if(i===START)return true;
 const seen=new Set([START]),queue=[START];
 for(let a=0;a<queue.length;a++)for(const n of adjacent(queue[a])){
  if(seen.has(n)||!["open","room","lift"].includes(s.grid[n].kind))continue;
  if(n===i)return true;seen.add(n);queue.push(n);
 }
 return false;
}
function canDig(s,i){
 if(i<0||i>=N||!["dirt","rubble"].includes(s.grid[i].kind))return false;
 const [x,y]=xy(i);
 const neighbors=adjacent(i).filter(n=>["open","lift","room"].includes(s.grid[n].kind)&&access(s,n));
 if(!neighbors.length)return false;
 if(y>0&&neighbors.every(n=>xy(n)[1]<y&&s.grid[n].kind!=="lift"))return false;
 return true;
}
function canFrame(s,i,type){
 const d=SUPPORTS[type];return !!(d&&(!d.unlock||s.unlocked.includes(d.unlock))&&i!==START&&s.grid[i]?.kind==="open"&&!s.grid[i].support&&access(s,i));
}
function canLift(s,i){return i!==START&&s.grid[i]?.kind==="open"&&!s.grid[i].support&&access(s,i);}
function roomCells(i){return i%W===W-1?[]:[i,i+1];}
function canRoom(s,i,type){
 const d=ROOMS[type],cells=roomCells(i);
 if(!d)return {ok:false,message:"Select a room design first."};
 if(d.unlock&&!s.unlocked.includes(d.unlock))return {ok:false,message:"Unlock this room in RESEARCH first."};
 if(cells.length!==2||cells.includes(START))return {ok:false,message:"Rooms need two adjacent tunnel tiles, not the hatch."};
 if(!cells.every(n=>s.grid[n].kind==="open"))return {ok:false,message:"Dig both neighboring tiles before placing a room."};
 if(!cells.some(n=>s.grid[n].support))return {ok:false,message:"Install at least one physical tunnel support first."};
 if(!access(s,cells[0]))return {ok:false,message:"The room must connect to the entrance."};
 if(!afford(s,d.cost))return {ok:false,message:"Not enough materials: "+cost(d.cost)};
 return {ok:true,cells};
}
function roomAt(s,i){return s.rooms.find(r=>r.cells.includes(i))||null;}
function risk(s,i){
 const depth=xy(i)[1];if(depth<2)return 0;
 let r=.06+(depth-2)*.075;
 for(const n of [i,...adjacent(i)])r-=(SUPPORTS[s.grid[n].support]?.strength||0)*.025;
 if(s.unlocked.includes("survey"))r*=.5;
 return clamp(r,0,.38);
}
function actor(name,s){
 const trait=pick(Object.keys(TRAITS)),def=TRAITS[trait];
 const skills={engineering:rand(1,5),farming:rand(1,5),combat:rand(1,5),medicine:rand(1,5),science:rand(1,5)};
 skills[def.key]=clamp(skills[def.key]+def.plus,1,10);
 return {id:s.nextId++,name:name||pick(FIRST)+" "+pick(LAST),age:rand(19,55),trait,skills,loyalty:clamp(rand(60,86)+def.loyal,5,100),
 mood:rand(63,82),health:rand(77,100),hunger:rand(60,95),thirst:rand(50,93),energy:rand(55,100),
 sick:Math.random()<.08,shirt:pick(SHIRTS),skin:pick(SKINS),hair:pick(HAIRS),job:null,shift:"day",weapon:0,armor:0,
 background:pick(["Former mechanic","Field researcher","Wandering courier","Rural farmer","Traveling merchant","Former medic","Shelter refugee","Factory worker","Guard for hire"]),
 covert:Math.random()<.14,rebel:false,checked:null,checks:0,waited:0,served:0};
}
function visitor(s){if(s.visitors.length>=3||s.people.length>=40)return;const p=actor(null,s);s.visitors.push(p);note(s,p.name+" is knocking at the vault hatch.","visitor");}
function check(s,id){
 const p=s.visitors.find(x=>x.id===id);if(!p)return {ok:false,message:"Visitor already left."};
 if(s.res.scrap<2)return {ok:false,message:"Background checks require 2 scrap."};
 s.res.scrap-=2;p.checks++;p.checked=Math.random()<.78?p.covert:!p.covert;
 note(s,p.name+": background review "+(p.checked?"FLAGGED":"CLEAR")+". Records are not always accurate.","warn");
 return {ok:true,message:p.checked?"Possible rebel affiliation detected.":"No problems found. Results can be wrong."};
}
function accept(s,id){
 const p=s.visitors.find(p=>p.id===id);if(!p)return {ok:false,message:"No such visitor."};
 if(s.people.length>=capacity(s))return {ok:false,message:"Build quarters first; no empty beds."};
 s.visitors=s.visitors.filter(v=>v.id!==id);s.people.push(p);note(s,p.name+" admitted as a resident. "+p.background+".","good");tutorial(s);
 return {ok:true,message:p.name+" joined. Select them to assign a job."};
}
function reject(s,id){const p=s.visitors.find(p=>p.id===id);if(!p)return {ok:false,message:"No such visitor."};s.visitors=s.visitors.filter(v=>v.id!==id);note(s,p.name+" was refused entry.");return {ok:true,message:"Visitor turned away."};}
function person(s,id){return s.people.find(p=>p.id===id);}
// One authoritative placement and routine for each resident. A sleeper never works.
// Rendering and resource production both read this function, preventing duplicated sprites.
function routine(s,p){
 if(!p||p.health<=0)return {phase:"absent",roomId:null,label:"Unavailable"};
 const quarters=s.rooms.filter(r=>r.type==="quarters");
 const bed=quarters.length?quarters[Math.max(0,s.people.findIndex(x=>x.id===p.id))%quarters.length]:null;
 const medical=s.rooms.find(r=>r.type==="medical");
 const lounge=s.rooms.find(r=>r.type==="recreation");
 const needsSleep=night(s)?p.shift==="day":p.shift==="night";
 if(s.threat){
  if(p.weapon>0&&!p.rebel){
   const post=s.rooms.find(r=>r.type==="security"&&r.workers.includes(p.id))||s.rooms.find(r=>r.type==="security");
   return {phase:"guarding",roomId:post?.id??null,label:"Responding to alarm"};
  }
  return {phase:"shelter",roomId:bed?.id??null,label:"Taking shelter"};
 }
 if(p.sick||p.health<25)return {phase:"sick",roomId:medical?.id??bed?.id??null,label:medical?"In medical care":"Resting while ill"};
 if(needsSleep)return {phase:"sleep",roomId:bed?.id??null,label:"Sleeping — "+p.shift+" shift"};
 if((p.hunger<22&&s.res.food>.25)||(p.thirst<22&&s.res.water>.25))return {phase:"meal",roomId:lounge?.id??bed?.id??null,label:"Eating or drinking"};
 const workplace=s.rooms.find(r=>r.id===p.job);
 if(workplace&&workplace.workers.includes(p.id)){
  return {phase:workplace.type==="security"?"guarding":"working",roomId:workplace.id,label:"On duty: "+ROOMS[workplace.type].name};
 }
 return {phase:lounge?"socializing":"idle",roomId:lounge?.id??bed?.id??null,label:lounge?"Socializing":"Off duty"};
}
function workersOnDuty(s,r){
 return r.workers.map(id=>person(s,id)).filter(p=>{
  if(!p)return false;
  const activity=routine(s,p);
  return activity.roomId===r.id&&["working","guarding"].includes(activity.phase);
 });
}
function residentsIn(s,r){
 return s.people.map(p=>({person:p,activity:routine(s,p)})).filter(v=>v.activity.roomId===r.id);
}
function assign(s,pid,rid){
 const p=person(s,pid),r=s.rooms.find(r=>r.id===rid);
 if(!p||!r)return {ok:false,message:"Select a valid resident and room."};
 if(["quarters","storage"].includes(r.type))return {ok:false,message:"This room needs no workers."};
 if(r.workers.length>= (r.type==="security"?3:2)&&!r.workers.includes(pid))return {ok:false,message:"This room is already fully staffed."};
 s.rooms.forEach(x=>x.workers=x.workers.filter(id=>id!==pid));r.workers.push(pid);p.job=rid;p.served++;
 note(s,p.name+" assigned to "+ROOMS[r.type].name+".");tutorial(s);
 return {ok:true,message:p.name+" assigned to "+ROOMS[r.type].name+"."};
}
function unassign(s,id){const p=person(s,id);if(!p)return {ok:false,message:"Missing resident."};s.rooms.forEach(x=>x.workers=x.workers.filter(j=>j!==id));p.job=null;return {ok:true,message:p.name+" is off duty."};}
function shift(s,id){const p=person(s,id);if(!p)return {ok:false,message:"Resident missing."};p.shift=p.shift==="day"?"night":"day";note(s,p.name+" changed to "+p.shift+" shift.");return {ok:true,message:"Shift updated."};}
function equip(s,id,k){const p=person(s,id);if(!p||!["weapon","armor"].includes(k))return {ok:false,message:"Invalid equipment."};
 const price=k==="weapon"?6:5;if(s.res.scrap<price)return {ok:false,message:"Need "+price+" scrap."};s.res.scrap-=price;p[k]=Math.min(3,p[k]+1);return {ok:true,message:"Equipment issued to "+p.name+"."};}
function research(s,id){
 const t=TECH.find(x=>x.id===id);if(!t)return {ok:false,message:"Unknown technology."};
 if(s.unlocked.includes(id))return {ok:false,message:"Already unlocked."};
 if(t.req.some(n=>!s.unlocked.includes(n)))return {ok:false,message:"Research prerequisites are missing."};
 if(s.research<t.cost)return {ok:false,message:"Need "+t.cost+" research."};
 s.research-=t.cost;s.unlocked.push(id);note(s,"Research complete: "+t.name+". Physically build the new structures.","good");
 return {ok:true,message:t.name+" unlocked."};
}
function collect(s,id){
 const r=s.rooms.find(r=>r.id===id);if(!r||!r.ready)return {ok:false,message:"Production is not ready."};
 const def=ROOMS[r.type],number=Math.round(def.output*(1+(r.workers.length*.12)+(s.unlocked.includes("efficiency")?.22:0)));
 const max=caps(s)[r.type],before=s.res[r.type];
 if(before>=max)return {ok:false,message:"Storage is full. Add a Supply Depot or use some "+r.type+" first."};
 s.res[r.type]=clamp(before+number,0,max);r.ready=false;r.progress=0;r.cycles++;
 const gain=Math.round((s.res[r.type]-before)*10)/10;
 note(s,def.name+" supplied "+gain+" "+r.type+".","good");s.totals.harvested++;
 return {ok:true,message:"Collected "+gain+" "+r.type+"."};
}
function start(s,type,i,meta){
 if(s.task)return {ok:false,message:"Your Overseer is already busy."};
 const t={type,i,meta,start:s.elapsed,duration:1};
 if(type==="dig"){if(!canDig(s,i))return {ok:false,message:"Dig from a reachable open tunnel. Descending requires a lift above."};t.duration=1.25;}
 else if(type==="support"){if(!canFrame(s,i,meta))return {ok:false,message:"This tile needs to be an empty connected tunnel. Advanced supports require research."};if(!afford(s,SUPPORTS[meta].cost))return {ok:false,message:"Need "+cost(SUPPORTS[meta].cost)};t.duration=.8;}
 else if(type==="room"){const test=canRoom(s,i,meta);if(!test.ok)return test;t.duration=1.9;}
 else if(type==="lift"){if(!canLift(s,i))return {ok:false,message:"Build a lift on an accessible open tile."};if(!afford(s,{wood:2,scrap:4}))return {ok:false,message:"Lift costs 2 wood and 4 scrap."};t.duration=1.4;}
 else if(type==="scavenge"){const site=SITES.find(x=>x.id===meta);if(!site)return {ok:false,message:"Unknown scavenging site."};t.duration=site.duration*3.5;t.phase="outbound";t.loot=null;note(s,"Overseer departed for "+site.name+". Traveling across the surface.","info");}
 else if(type==="remove"){if(i===START||!(s.grid[i]?.support||["room","lift"].includes(s.grid[i]?.kind)))return {ok:false,message:"Nothing removable here."};t.duration=.7;}
 else return {ok:false,message:"Unknown action."};
 s.task=t;return {ok:true,message:type==="scavenge"?"Scavenging in progress…":type==="dig"?"The Overseer is digging…":"Construction started…"};
}
function finish(s){
 const t=s.task;if(!t)return;s.task=null;
 const {type,i,meta}=t;
 if(type==="dig"){
  const old=s.grid[i].kind;s.grid[i].kind="open";s.grid[i].support=null;s.digs++;s.research+=old==="rubble"?1:2;
  if(old!=="rubble")s.res.stone++;
  note(s,(old==="rubble"?"Rubble cleared":"Tunnel excavated")+" at Level "+(xy(i)[1]+1)+", Bay "+(xy(i)[0]+1)+".");
  if(old!=="rubble"&&Math.random()<risk(s,i)){const weak=[i,...adjacent(i)].filter(j=>j!==START&&s.grid[j].kind==="open"&&!s.grid[j].support);if(weak.length){const j=pick(weak);s.grid[j].kind="rubble";s.collapses++;note(s,"CAVE-IN! The earth gave way. Clear the rubble.","danger");}}
 }else if(type==="support"){
  if(canFrame(s,i,meta)&&afford(s,SUPPORTS[meta].cost)){spend(s,SUPPORTS[meta].cost);s.grid[i].support=meta;s.research++;note(s,SUPPORTS[meta].name+" installed.","good");}
 }else if(type==="lift"){
  if(canLift(s,i)&&afford(s,{wood:2,scrap:4})){spend(s,{wood:2,scrap:4});s.grid[i].kind="lift";s.grid[i].support="steel";note(s,"Elevator installed. Dig downward from the shaft.");}
 }else if(type==="room"){
  const check=canRoom(s,i,meta);
  if(check.ok){const d=ROOMS[meta];spend(s,d.cost);const r={id:s.nextId++,type:meta,cells:check.cells,workers:[],progress:0,ready:false,cycles:0,health:100};
   s.rooms.push(r);for(const j of check.cells){s.grid[j].kind="room";s.grid[j].room=r.id;}
   s.totals.built++;s.research+=3;note(s,d.name+" constructed. Assign workers to operate it.","good");
   if(meta==="quarters"&&s.visitors.length===0)visitor(s);}
 }else if(type==="scavenge"){
  const site=SITES.find(x=>x.id===meta),hazard=Math.random()<site.risk;
  const gains=Object.entries(site.loot).map(([k,[lo,hi]])=>[k,hazard?Math.ceil(rand(lo,hi)*.5):rand(lo,hi)]);
  for(const [k,v]of gains)s.res[k]+=v;
  s.scavenges++;s.research+=2;
  s.lastExpedition={siteId:site.id,site:site.name,loot:Object.fromEntries(gains),hazard,day:s.day,time:time(s)};
  if(!Array.isArray(s.expeditionHistory))s.expeditionHistory=[];
  s.expeditionHistory.unshift(s.lastExpedition);s.expeditionHistory=s.expeditionHistory.slice(0,12);
  note(s,site.name+": "+gains.filter(([,v])=>v).map(([k,v])=>"+"+v+" "+k).join(", ")+(hazard?" (forced to retreat)":"")+"." ,hazard?"warn":"good");
  if(meta==="outpost"&&!hazard&&s.people.length){pick(s.people).weapon=1;note(s,"A salvaged firearm was assigned to one resident.");}
 }else if(type==="remove"){
  const r=roomAt(s,i);
  if(r){r.workers.forEach(id=>{const p=person(s,id);if(p)p.job=null;});r.cells.forEach(j=>{s.grid[j].kind="open";s.grid[j].room=null;});s.rooms=s.rooms.filter(x=>x.id!==r.id);
   const d=ROOMS[r.type];for(const [k,v]of Object.entries(d.cost))s.res[k]+=Math.floor(v/2);note(s,d.name+" dismantled. Some materials recovered.");}
  else if(s.grid[i].kind==="lift"){s.grid[i].kind="open";s.grid[i].support=null;s.res.scrap++;note(s,"Elevator dismantled.");}
  else if(s.grid[i].support){const d=SUPPORTS[s.grid[i].support];s.grid[i].support=null;if(d)for(const [k,v]of Object.entries(d.cost))s.res[k]+=Math.floor(v/2);note(s,"Support removed.");}
 }
 tutorial(s);
}
function tutorial(s){
 if(s.skipTutorial)return;
 if(s.tutorial===0&&s.scavenges>0)s.tutorial=1;
 if(s.tutorial===1&&s.digs>=2)s.tutorial=2;
 if(s.tutorial===2&&s.grid.some(c=>c.support==="timber"))s.tutorial=3;
 if(s.tutorial===3&&s.rooms.some(r=>r.type==="quarters"))s.tutorial=4;
 if(s.tutorial===4&&s.people.length)s.tutorial=5;
 if(s.tutorial===5&&s.rooms.some(r=>["power","food","water"].includes(r.type)))s.tutorial=6;
 if(s.tutorial===6&&s.people.some(p=>p.job))s.tutorial=7;
}
function die(s,p){s.people=s.people.filter(x=>x.id!==p.id);s.rooms.forEach(r=>r.workers=r.workers.filter(id=>id!==p.id));note(s,p.name+" has died. Death is permanent.","danger");s.totals.lost++;s.people.forEach(x=>x.mood=clamp(x.mood-10,0,100));}
function resolveThreat(s){
 if(!s.threat)return {ok:false,message:"No active emergency."};
 const armed=s.people.filter(p=>p.weapon&&!p.rebel);
 const guards=s.rooms.filter(r=>r.type==="security").flatMap(r=>r.workers.map(id=>person(s,id))).filter(Boolean);
 const defense=armed.reduce((v,p)=>v+p.weapon*3+p.armor*2+p.skills.combat*.4,0)+guards.reduce((v,p)=>v+5+p.skills.combat,0)+rand(0,5);
 const win=defense>=s.threat.force;
 if(win){note(s,"Defenders repelled the "+s.threat.name+".","good");if(armed.length&&Math.random()<.25)pick(armed).health-=rand(5,25);}
 else{const loss=Math.min(s.res.food,rand(3,8)),water=Math.min(s.res.water,rand(2,7));s.res.food-=loss;s.res.water-=water;note(s,s.threat.name+" breached defenses: -"+loss+" food, -"+water+" water.","danger");if(s.people.length){const p=pick(s.people);p.health-=rand(20,48);if(p.health<=0)die(s,p);}s.totals.lost++;}
 s.threat=null;s.nextRaid=s.elapsed+rand(160,260);return {ok:true,message:win?"Raid repelled!":"Raiders stole supplies."};
}
function simulate(s,seconds){
 if(!valid(s)||s.speed===0)return;
 const dt=clamp(seconds,0,3)*s.speed;s.elapsed+=dt;s.clock+=dt*6;
 if(s.clock>=1440){s.clock%=1440;s.day++;note(s,"Day "+s.day+" begins. Check your production and watch schedules.");}
 if(s.task&&s.task.type==="scavenge"){
  const progress=clamp((s.elapsed-s.task.start)/s.task.duration,0,1);
  const phase=progress<.35?"outbound":progress<.76?"searching":"returning";
  if(phase!==s.task.phase){
   const site=SITES.find(x=>x.id===s.task.meta);
   s.task.phase=phase;
   if(site&&phase==="searching")note(s,"Reached "+site.name+". Searching through the ruins.");
   if(site&&phase==="returning")note(s,"Leaving "+site.name+". Returning to the vault with salvage.");
  }
 }
 if(s.task&&s.elapsed>=s.task.start+s.task.duration)finish(s);
 if(s.elapsed>=s.nextArrival&&s.visitors.length<2){visitor(s);s.nextArrival=s.elapsed+rand(38,65);}
 s.visitors.forEach(p=>p.waited+=dt);
 for(const p of [...s.visitors])if(p.waited>245){reject(s,p.id);note(s,"A visitor got tired of waiting.","warn");}
 for(const p of [...s.people]){
  const needWater=dt*(p.thirst<30?.09:.042),needFood=dt*.032;
  if(s.res.water>=needWater){s.res.water-=needWater;p.thirst=clamp(p.thirst+dt*.44,0,100);}else p.thirst=clamp(p.thirst-dt*.27,0,100);
  if(s.res.food>=needFood){s.res.food-=needFood;p.hunger=clamp(p.hunger+dt*.30,0,100);}else p.hunger=clamp(p.hunger-dt*.20,0,100);
  const resting=night(s)?p.shift==="day":p.shift==="night";
  p.energy=clamp(p.energy+dt*(resting?1.7:-.4),0,100);
  const bad=p.hunger<35||p.thirst<35||p.energy<20;
  p.mood=clamp(p.mood+dt*(bad?-.19:p.job?.04:-.06),0,100);
  p.loyalty=clamp(p.loyalty+dt*(p.mood<25?-.08:p.mood>80?.014:0),0,100);
  if(p.sick)p.health=clamp(p.health-dt*.09,0,100);
  if(bad)p.health=clamp(p.health-dt*.12,0,100);
  if(p.health<=0){die(s,p);continue;}
  if(!p.rebel&&p.loyalty<18&&Math.random()<dt*.003){p.rebel=true;note(s,"Intelligence reports suggest a covert faction is recruiting residents.","warn");}
 }
 for(const r of s.rooms){
  const d=ROOMS[r.type];if(d.output&&!r.ready){
   const workers=workersOnDuty(s,r);
   if(workers.length&&(r.type==="power"||s.res.power>0)){
    const boost=workers.reduce((v,p)=>v+p.skills[d.skill]*.075,0);
    r.progress+=dt*100/d.cycle*(.6+.5*workers.length+boost)*(s.unlocked.includes("efficiency")?1.25:1);
    if(r.progress>=100){r.progress=100;r.ready=true;note(s,d.name+" finished production. Collect the resource bubble!","good");}
   }
  }
  if(r.type==="recreation")for(const p of s.people){if(routine(s,p).phase==="socializing"&&routine(s,p).roomId===r.id)p.mood=clamp(p.mood+dt*.12,0,100);}
  if(r.type==="medical"&&workersOnDuty(s,r).length)for(const p of s.people){if(p.sick&&s.res.medicine>=dt*.02){p.health=clamp(p.health+dt*.4,0,100);s.res.medicine=Math.max(0,s.res.medicine-dt*.02);if(p.health>80)p.sick=false;}}
 }
 s.res.power=clamp(s.res.power-dt*s.rooms.filter(r=>!["power","quarters","storage"].includes(r.type)).length*.045,0,caps(s).power);
 if(s.threat&&s.elapsed-s.threat.created>7)resolveThreat(s);
 if(s.people.length>=3&&s.elapsed>=s.nextRaid&&!s.threat){s.threat={name:s.people.some(p=>p.rebel)&&Math.random()<.3?"ARMED REBELLION":"SURFACE RAIDERS",force:10+s.people.length*3,created:s.elapsed};note(s,"ALARM! "+s.threat.name+" are attacking the entrance.","danger");}
 tutorial(s);
}
root.VDCore={W,H,N,START,ROOMS,SUPPORTS,TECH,SITES,TRAITS,TUTORIAL,clamp,rand,ix,xy,adjacent,create,valid,time,night,note,capacity,caps,morale,afford,spend,cost,access,canDig,canFrame,canLift,roomCells,canRoom,roomAt,risk,actor,visitor,check,accept,reject,person,routine,workersOnDuty,residentsIn,assign,unassign,shift,equip,research,collect,start,finish,tutorial,resolveThreat,simulate};
})(window);