import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const base=new URL('../games/vault-directive/',import.meta.url);
const modelSource=readFileSync(new URL('model.js',base),'utf8');
const artSource=readFileSync(new URL('art.js',base),'utf8');
const controllerSource=readFileSync(new URL('game-v4.js',base),'utf8');
const html=readFileSync(new URL('v4-index.html',base),'utf8');
const css=readFileSync(new URL('v4.css',base),'utf8');

function env() {
  const saved=new Map(),localStorage={
    getItem(k){return saved.get(k)||null;},
    setItem(k,v){saved.set(k,v);},
    removeItem(k){saved.delete(k);}
  };
  const window={devicePixelRatio:1,ResizeObserver:class{observe(){}},addEventListener(){}};
  new Function('window','localStorage',modelSource)(window,localStorage);
  new Function('window',artSource)(window);
  return {M:window.VaultModel,A:window.VaultArt,window,localStorage,saved};
}
const advance=(m,s,seconds)=>{for(let i=0;i<Math.ceil(seconds/.07);i++)m.tick(s,.07);};
function until(m,s,condition,seconds=160){
  for(let i=0;i<Math.ceil(seconds/.07)&&!condition();i++)m.tick(s,.07);
  assert.ok(condition(),'expected state not achieved in '+seconds+' simulated seconds');
}
function digAndBuild(m,s,type='generator',x=12){
  const d=m.dig(s,x,2,x+3,4);assert.equal(d.ok,true);
  until(m,s,()=>d.job.done,160);
  const b=m.build(s,type,x,2,4);assert.equal(b.ok,true);
  until(m,s,()=>b.job.done,160);
  return s.rooms.at(-1);
}
function allClear(m,s,x,top,w=4){
  for(let y=top;y<=top+2;y++)for(let xx=x;xx<x+w;xx++)s.terrain[y][xx]=0;
}
test('the reboot starts with three survivors, a hatch and ZERO constructed rooms',()=>{
  const {M}=env(),s=M.create();
  assert.equal(s.rooms.length,0);
  assert.equal(s.people.length,3);
  assert.equal(s.terrain[4][7],0);
  assert.equal(s.terrain[4][12],0);
  assert.equal(s.terrain[2][13],1);
  assert.equal(s.power.supply,0);
  assert.ok(s.res.scrap>0);
  assert.equal(s.tutorial,true);
});
test('food and water visibly deplete from one central clock',()=>{
  const {M}=env(),s=M.create(),f=s.res.food,w=s.res.water;
  advance(M,s,20);
  assert.ok(s.res.food<f-.5);
  assert.ok(s.res.water<w-.65);
  assert.ok(s.rates.food<0&&s.rates.water<0);
  assert.equal(s.rates.fuel,0);
  assert.ok(s.res.food>f-1);
});
test('an excavation is started by marking actual connected earth and an available worker automatically joins',()=>{
  const {M}=env(),s=M.create(),dig=M.dig(s,12,2,15,4);
  assert.equal(dig.ok,true);
  assert.equal(dig.job.kind,'dig');
  assert.deepEqual(dig.job.workers,[s.people[0].id]);
  until(M,s,()=>dig.job.done);
  assert.ok(dig.job.cells.every(c=>s.terrain[c.y][c.x]===0));
  assert.equal(s.tasks.dug,true);
});
test('the player cannot excavate isolated rock or arbitrarily large rectangles',()=>{
  const {M}=env(),s=M.create();
  assert.equal(M.dig(s,27,9,29,10).ok,false);
  assert.equal(M.dig(s,10,2,25,8).ok,false);
});
test('new rooms only exist after excavation, material payment and real construction work',()=>{
  const {M}=env(),s=M.create();
  assert.equal(M.build(s,'generator',12,2,4).ok,false);
  const old=s.res.scrap,room=digAndBuild(M,s);
  assert.equal(room.type,'generator');
  assert.equal(room.integrity,100);
  assert.equal(room.level,1);
  assert.equal(s.rooms.length,1);
  assert.equal(s.res.scrap,old-8);
  assert.equal(s.tasks.built,true);
});
test('room footprints reject overlaps with another room or original ladder shaft',()=>{
  const {M}=env(),s=M.create();
  digAndBuild(M,s);
  assert.equal(M.build(s,'water',12,2,4).ok,false);
  assert.equal(M.build(s,'bunks',7,2,4).ok,false);
});
test('generators burn finite fuel and physically staffed output increases',()=>{
  const {M}=env(),s=M.create(),r=digAndBuild(M,s);
  const first=M.power(s).supply;
  assert.equal(first,3);
  assert.equal(M.assign(s,s.people[0].id,r.id).ok,true);
  until(M,s,()=>s.people[0].state==='working',30);
  assert.ok(M.power(s).supply>first);
  const f=s.res.fuel;advance(M,s,9);
  assert.ok(s.res.fuel<f);
  s.res.fuel=0;
  assert.equal(M.power(s).supply,0);
});
test('room demand includes unpowered living quarters, food and water facilities',()=>{
  const {M}=env(),s=M.create();
  s.rooms.push({id:1,type:'generator',x:12,y:2,w:4,integrity:100,level:1,priority:2});
  s.rooms.push({id:2,type:'water',x:16,y:2,w:4,integrity:100,level:1,priority:2});
  s.rooms.push({id:3,type:'kitchen',x:20,y:2,w:4,integrity:100,level:1,priority:2});
  s.rooms.push({id:4,type:'bunks',x:24,y:2,w:4,integrity:100,level:1,priority:2});
  assert.equal(M.power(s).demand,6);
});
test('production needs both power and working residents; batches require collection',()=>{
  const {M}=env(),s=M.create();digAndBuild(M,s,'generator',12);
  const plant=digAndBuild(M,s,'water',16);
  assert.equal(M.powered(s,plant),true);
  advance(M,s,4);
  assert.equal(plant.ready,false);
  assert.equal(M.assign(s,s.people[1].id,plant.id).ok,true);
  until(M,s,()=>plant.ready,100);
  const before=s.res.water;
  assert.equal(M.collect(s,plant.id).ok,true);
  assert.ok(s.res.water>before);
  assert.equal(plant.ready,false);
  assert.equal(s.tasks.collected,true);
});
test('power shortage prioritizes essential facilities without inventing supply',()=>{
  const {M}=env(),s=M.create();
  for(let x=12;x<28;x++)allClear(M,s,x,2,1);
  s.rooms=[
    {id:201,type:'generator',x:12,y:2,w:4,level:1,integrity:100,priority:2},
    {id:202,type:'water',x:16,y:2,w:4,level:1,integrity:100,priority:1},
    {id:203,type:'kitchen',x:20,y:2,w:4,level:1,integrity:100,priority:3}
  ];
  const p=M.power(s);
  assert.equal(p.supply,3);
  assert.equal(p.demand,5);
  assert.equal(p.online.includes(202),true);
  assert.equal(p.online.includes(203),false);
});
test('new settlers wait at the hatch; the overseer must create beds and accept them',()=>{
  const {M}=env(),s=M.create(),candidate=M.createVisitor(s);
  assert.equal(s.people.length,3);
  assert.equal(M.admit(s,candidate.id).ok,false);
  s.rooms.push({id:25,type:'bunks',x:13,y:2,w:4,level:1,integrity:100,priority:2});
  assert.ok(M.capacity(s)>3);
  assert.equal(M.admit(s,candidate.id).ok,true);
  assert.equal(s.people.length,4);
  assert.equal(s.visitors.length,0);
  assert.equal(s.tasks.admitted,true);
});
test('room staffing respects capacity, and shifts affect whether a resident works',()=>{
  const {M}=env(),s=M.create(),r=digAndBuild(M,s);
  assert.equal(M.assign(s,s.people[0].id,r.id).ok,true);
  assert.equal(M.changeShift(s,s.people[0].id,'night').ok,true);
  advance(M,s,3);
  assert.equal(M.team(s,r).length,0);
  assert.equal(M.changeShift(s,s.people[0].id,'flex').ok,true);
  until(M,s,()=>M.team(s,r).length===1,30);
});
test('installing and closing a real blast door blocks routes and cuts isolated electricity',()=>{
  const {M}=env(),s=M.create(),room=digAndBuild(M,s);
  const path=M.route(s,{x:7,y:4},{x:14,y:4});
  assert.ok(path&&path.length>0);
  const d=M.installDoor(s,10,4);assert.equal(d.ok,true);
  assert.equal(M.toggleDoor(s,d.door.id).ok,true);
  assert.equal(M.route(s,{x:7,y:4},{x:14,y:4}),null);
  assert.ok(M.power(s).supply===0,'Generator past the blast door is electrically isolated');
  assert.equal(M.toggleDoor(s,d.door.id).ok,true);
  assert.ok(M.route(s,{x:7,y:4},{x:14,y:4}));
  assert.equal(s.tasks.door,true);
  assert.equal(room.integrity,100);
});
test('no magical vertical movement: manually excavate and connect ladder shafts',()=>{
  const {M}=env(),s=M.create();
  const d=M.dig(s,7,5,7,6);assert.equal(d.ok,true);
  until(M,s,()=>d.job.done,160);
  assert.equal(M.installLadder(s,7,5).ok,true);
  assert.equal(M.installLadder(s,7,6).ok,true);
  const deeper=M.dig(s,7,7,7,7);assert.equal(deeper.ok,true);
  until(M,s,()=>deeper.job.done,80);
  assert.equal(M.installLadder(s,7,7).ok,true);
  assert.equal(M.route(s,{x:7,y:4},{x:7,y:7})?.length,3);
});
test('manual rescue jobs require work and restore trapped survivors',()=>{
  const {M}=env(),s=M.create();
  const d=M.dig(s,12,2,15,4);until(M,s,()=>d.job.done);
  s.terrain[4][14]=3;
  s.people[1].trapped=true;s.people[1].x=14;s.people[1].y=4;
  const event={id:900,kind:'collapse',x:14,y:4,victims:[s.people[1].id],air:120,cleared:false};
  s.events.push(event);
  const rescue=M.rescue(s,event.id);assert.equal(rescue.ok,true);
  assert.equal(event.cleared,false);
  until(M,s,()=>event.cleared,150);
  assert.equal(s.people[1].trapped,false);
  assert.equal(s.terrain[4][14],0);
});
test('trapped survivors can conserve oxygen and sufficiently strong survivors can self-excavate',()=>{
  const {M}=env(),s=M.create(),person=s.people[0];
  s.events.push({id:905,kind:'collapse',x:12,y:4,victims:[person.id],air:120,cleared:false});
  s.terrain[4][12]=3;person.trapped=true;person.x=12;person.y=4;
  assert.equal(M.rescuerOrder(s,905,'conserve').ok,true);
  advance(M,s,14);assert.ok(s.events[0].air>116);
  assert.equal(M.rescuerOrder(s,905,'self').ok,true);
  until(M,s,()=>s.events[0].cleared,160);
  assert.equal(person.trapped,false);
});
test('surface scavenging has an actual journey, individual rooms, and finite loot',()=>{
  const {M}=env(),s=M.create();
  const e=M.startExpedition(s,'clinic',[s.people[0].id]);
  assert.equal(e.ok,true);assert.equal(s.expedition.phase,'travel');
  until(M,s,()=>s.expedition?.phase==='explore',20);
  assert.equal(M.searchSiteRoom(s,1).ok,true);
  until(M,s,()=>s.sites.find(q=>q.id==='clinic').searched[1],30);
  assert.ok(s.expedition.bag.meds>0);
  assert.equal(M.searchSiteRoom(s,1).ok,false);
  assert.equal(M.returnExpedition(s).ok,true);
  until(M,s,()=>s.expedition===null,20);
  assert.ok(s.res.meds>=4);
  assert.equal(s.tasks.expedition,true);
});
test('scavengers must explicitly fight or retreat from a hostile site room',()=>{
  const {M}=env(),s=M.create();
  s.sites.find(q=>q.id==='subway').seen=true;
  assert.equal(M.startExpedition(s,'subway',[s.people[0].id]).ok,true);
  until(M,s,()=>s.expedition.phase==='explore',20);
  assert.equal(M.searchSiteRoom(s,2).ok,true);
  until(M,s,()=>s.expedition.action?.phase==='encounter',15);
  assert.equal(s.sites.find(q=>q.id==='subway').searched[2],false);
  assert.equal(M.fight(s,false).ok,true);
  until(M,s,()=>s.sites.find(q=>q.id==='subway').searched[2],40);
  assert.ok(s.expedition.bag.parts>0);
  assert.ok(s.people[0].infection>0);
});
test('rescued civilians appear in the entrance waiting queue only when a team returns',()=>{
  const {M}=env(),s=M.create();
  s.sites.find(q=>q.id==='subway').seen=true;
  M.startExpedition(s,'subway',[s.people[0].id]);
  until(M,s,()=>s.expedition.phase==='explore',20);
  M.searchSiteRoom(s,3);
  until(M,s,()=>s.expedition.rescued>0,30);
  assert.equal(s.visitors.length,0);
  M.returnExpedition(s);
  until(M,s,()=>s.expedition===null,20);
  assert.ok(s.visitors.some(v=>v.rescued));
});
test('new survey sites are discovered first and their rooms stay persistently finite',()=>{
  const {M}=env(),s=M.create();
  assert.equal(M.startSurvey(s).ok,true);
  until(M,s,()=>s.discovered.length>0,40);
  const site=s.discovered[0],record=s.sites.find(q=>q.id===site.id);
  assert.ok(site.rooms.length===4);
  assert.deepEqual(record.searched,[false,false,false,false]);
});
test('medical treatment costs actual supplies and reduces infection',()=>{
  const {M}=env(),s=M.create(),p=s.people[0];
  p.hp=45;p.infection=70;
  const old=s.res.meds;
  assert.equal(M.medicine(s,p.id).ok,true);
  assert.equal(s.res.meds,old-1);
  assert.ok(p.hp>45&&p.infection<70);
});
test('defenders can repel raiders, rather than a scripted instant timer resolving them',()=>{
  const {M}=env(),s=M.create();
  digAndBuild(M,s);
  M.raid(s);
  assert.equal(M.dispatch(s,s.people[0].id).ok,true);
  assert.equal(M.dispatch(s,s.people[1].id).ok,true);
  assert.equal(M.dispatch(s,s.people[2].id).ok,true);
  assert.ok(s.threat.hp>0);
  until(M,s,()=>s.threat===null,180);
  assert.ok(s.people.some(p=>p.hp<100)||s.rooms.some(r=>r.integrity<100));
});
test('fire damages unstaffed rooms; responders reduce its severity',()=>{
  const {M}=env(),s=M.create(),r=digAndBuild(M,s);
  M.incident(s,'fire',r.id);const current=s.incidents[0].severity;
  advance(M,s,6);assert.ok(s.incidents[0].severity>current);
  assert.equal(M.respond(s,s.people[0].id).ok,true);
  until(M,s,()=>s.incidents.length===0,160);
  assert.ok(r.integrity<100);
});
test('fuel starvation turns generator output off; low oxygen and food become genuine hazards',()=>{
  const {M}=env(),s=M.create(),r=digAndBuild(M,s);
  s.res.fuel=0;assert.equal(M.power(s).supply,0);
  s.res.food=0;s.res.water=0;s.air=5;
  const hp=s.people[0].hp;advance(M,s,8);
  assert.ok(s.people[0].hp<hp);
});
test('power-dependent living quarters support family plans and dependent growth',()=>{
  const {M}=env(),s=M.create();
  allClear(M,s,12,2,8);
  s.rooms.push({id:501,type:'generator',x:12,y:2,w:4,level:1,integrity:100,priority:2});
  s.rooms.push({id:502,type:'bunks',x:16,y:2,w:4,level:1,integrity:100,priority:2});
  M.power(s);
  assert.equal(M.startFamily(s,s.people[0].id,s.people[1].id).ok,true);
  until(M,s,()=>s.family.length===0,180);
  const child=s.people.find(p=>p.child);
  assert.ok(child);
  assert.equal(M.assign(s,child.id,501).ok,false);
  until(M,s,()=>child.child===false,270);
  assert.equal(child.age,18);
});
test('room upgrades are physical work orders and make generators stronger',()=>{
  const {M}=env(),s=M.create(),r=digAndBuild(M,s);
  const old=M.power(s).supply;
  s.res.scrap=70;s.res.parts=15;
  const up=M.upgrade(s,r.id);assert.equal(up.ok,true);
  until(M,s,()=>up.job.done,150);
  assert.equal(r.level,2);
  assert.ok(M.power(s).supply>old);
});
test('rushing a staffed room is risk/reward, never a free click on an empty shell',()=>{
  const {M}=env(),s=M.create();
  digAndBuild(M,s,'generator',12);
  const water=digAndBuild(M,s,'water',16);
  assert.equal(M.rush(s,water.id).ok,false);
  M.assign(s,s.people[1].id,water.id);
  until(M,s,()=>M.team(s,water).length,30);
  const r=M.rush(s,water.id);assert.equal(r.ok,true);
  assert.ok(r.success?water.ready:s.incidents.length>0);
});
test('saves are separate from the previous alpha and retain excavations, residents and site depletion',()=>{
  const {M,localStorage,saved}=env(),s=M.create();
  const d=M.dig(s,12,2,15,4);assert.equal(d.ok,true);
  s.sites[0].searched[0]=true;
  assert.equal(M.save(s),true);assert.ok(saved.has(M.SAVE));
  const recovered=M.load();
  assert.equal(recovered.jobs.length,1);
  assert.equal(recovered.sites[0].searched[0],true);
  assert.ok(!M.SAVE.includes('foundation.v1'));
});
test('deaths and a lost shelter do not crash the renderer or leave phantom workers',()=>{
  const {M,A}=env(),s=M.create();
  const dig=M.dig(s,12,2,15,4);
  for(const p of s.people)p.hp=0;
  assert.doesNotThrow(()=>M.tick(s,.07));
  assert.equal(s.gameOver,true);
  assert.equal(M.live(s).length,0);
  const ctx=mockCanvas();
  assert.doesNotThrow(()=>A.render(ctx,s,{x:180,y:5,zoom:1},{width:1200,height:610},{mode:'inspect'},100));
});
function mockCanvas(){
  return new Proxy({
    createLinearGradient(){return{addColorStop(){}};},
    createRadialGradient(){return{addColorStop(){}};},
    measureText(){return{width:100};}
  },{get(target,key){return key in target?target[key]:()=>{};},set(target,key,value){target[key]=value;return true;}});
}
test('every major constructed room renders in original detailed art without exceptions',()=>{
  const {M,A}=env(),s=M.create();
  for(const [i,key] of Object.keys(M.ROOM).entries()){
    const x=(i%5)*6+2,y=2+3*Math.floor(i/5),r={id:600+i,type:key,x,y,w:4,
      integrity:100,priority:2,level:1,air:94,ready:i%3===0,progress:0};
    s.rooms.push(r);
    for(let yy=y;yy<y+3;yy++)for(let xx=x;xx<x+4;xx++)if(M.valid(xx,yy))s.terrain[yy][xx]=0;
  }
  M.power(s);
  assert.doesNotThrow(()=>A.render(mockCanvas(),s,{x:120,y:25,zoom:1},{width:1500,height:900},{mode:'inspect'},400));
});
test('all fixed UI element references exist in the actual game page',()=>{
  const ids=[...new Set([...controllerSource.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]))];
  const dynamic=new Set(['expeditionScene','siteDetails','parentA','parentB','residentJob','residentShift','roomPriority']);
  assert.deepEqual(ids.filter(id=>!html.includes('id="'+id+'"')&&!dynamic.has(id)),[]);
  assert.match(css,/\.resource-strip/);
  assert.match(html,/model\.js/);
  assert.match(html,/art\.js/);
  assert.match(html,/game-v4\.js/);
});
test('a mocked browser can boot the controller, start the tutorial and issue an actual dig order',()=>{
  const {M,A,window,localStorage}=env();
  const elements=new Map(),handlers={};
  const fake=mockCanvas();
  function elem(id){
    if(!elements.has(id)){
      const classes=new Set(['modal','inspector','buildTray','toast','alertBadge','visitorNotice'].includes(id)?['hidden']:[]);
      elements.set(id,{
        id,dataset:{},style:{},innerHTML:'',textContent:'',value:'',width:760,height:240,
        classList:{add(...v){v.forEach(x=>classes.add(x));},remove(...v){v.forEach(x=>classes.delete(x));},
          toggle(k,v){(v??!classes.has(k))?classes.add(k):classes.delete(k);},
          contains(v){return classes.has(v);}},
        addEventListener(k,f){(this.handlers??={})[k]=f;},getContext(){return fake;},
        getBoundingClientRect(){return{left:0,top:0,width:1200,height:610};},
        setPointerCapture(){},releasePointerCapture(){}
      });
    }return elements.get(id);
  }
  const document={
    getElementById:elem,activeElement:null,addEventListener(k,f){handlers[k]=f;},
    querySelectorAll(q){
      const options=q==='.command[data-tool]'?['inspect','dig','ladder','door'].map(tool=>({tool})):
        q==='[data-speed]'?[1,2,4].map(speed=>({speed:String(speed)})):[];
      return options.map(d=>Object.assign(elem(q+JSON.stringify(d)),{dataset:d}));
    }
  };
  const ResizeObserver=class{observe(){}};
  new Function('window','document','localStorage','requestAnimationFrame','performance',
    'clearTimeout','setTimeout','ResizeObserver',controllerSource)(
    window,document,localStorage,()=>{},{now:()=>100},()=>{},()=>1,ResizeObserver
  );
  const dbg=window.VaultGameDebug,s=dbg.state();
  assert.equal(s.rooms.length,0);
  elem('modalBody').handlers.click({target:{closest(sel){return sel==='[data-act]'?{dataset:{act:'start'}}:null;}}});
  assert.equal(s.seenIntro,true);
  elem('toolDig').handlers.click();
  const cam=dbg.camera(),point=(x,y)=>({button:0,pointerId:1,
    clientX:(x*78-cam.x)*cam.zoom,clientY:(y*78-cam.y)*cam.zoom,preventDefault(){}});
  elem('world').handlers.pointerdown(point(12.4,2.4));
  elem('world').handlers.pointermove(point(15.4,4.4));
  elem('world').handlers.pointerup(point(15.4,4.4));
  assert.equal(s.jobs.length,1);
  assert.equal(s.jobs[0].kind,'dig');
});
