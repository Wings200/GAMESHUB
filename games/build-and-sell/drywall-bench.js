
import {wallLength,SHEATH_WIDTH,sheathingRects,drywallTargets,drywallRecord,drywallComplete} from "./wall-math.mjs?v=45";
import {specs} from "./electrical-math.mjs";
import {wallPipeRadius} from "./wall-pipe-math.mjs?v=31";
const NS="http://www.w3.org/2000/svg";
const near=(a,b,r=22)=>Math.hypot(a.x-b.x,a.y-b.y)<=r;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const stages=["Measure","Mark","Cut","Position","Fasten"];
export function benchGeometry(w,key,devices=[],lines=[]){
 const start=Number(key.slice(1))*SHEATH_WIDTH,end=Math.min(start+SHEATH_WIDTH,wallLength(w)),width=end-start,height=w.height,side=key[0]==="+"?1:-1;
 const scale=Math.min(300/width,380/height),left=360-width*scale/2,top=266-height*scale/2;
 const xy=(t,y)=>({x:left+(side===1?t-start:end-t)*scale,y:top+(height-y)*scale});
 const rect=(a,b,d,t)=>{const A=xy(a,t),B=xy(b,d);return {x:Math.min(A.x,B.x),y:A.y,w:Math.abs(B.x-A.x),h:B.y-A.y};};
 const clips=[],add=(a,b,d,t,label)=>{a=Math.max(start,a);b=Math.min(end,b);d=Math.max(0,d);t=Math.min(height,t);if(b-a<.006||t-d<.006)return;const r=rect(a,b,d,t);if(clips.some(q=>Math.abs(q.x-r.x)+Math.abs(q.y-r.y)+Math.abs(q.w-r.w)+Math.abs(q.h-r.h)<1))return;clips.push({...r,label});};
 for(const o of w.openings||[])add(o.start,o.start+o.width,o.kind==="door"?0:.918,o.kind==="door"?2.04:2,o.kind);
 for(const d of devices){if(d.wallId!==w.id||d.side!==side||!specs[d.kind])continue;const s=specs[d.kind];add(d.t-s.w/2-.008,d.t+s.w/2+.008,d.y-s.h/2-.008,d.y+s.h/2+.008,d.kind);}
 const len=wallLength(w),ux=(w.b.x-w.a.x)/len,uz=(w.b.z-w.a.z)/len;
 for(const e of lines){if(e.a?.wallId!==w.id||e.kind==="vent"||!e.points?.length)continue;for(const p of [e.points[0],e.points.at(-1)]){const x=p.x-w.a.x,z=p.z-w.a.z,t=x*ux+z*uz,y=p.y-.02,r=wallPipeRadius(e.kind)*1.5+.018;if(Math.abs(-x*uz+z*ux)<=.12)add(t-r,t+r,y-r,y+r,e.kind+" pipe");}}
 const bounds={x:left,y:top,w:width*scale,h:height*scale},corners=r=>[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}];
 const marks=[];for(const r of [bounds,...clips])for(const p of corners(r))if(!marks.some(q=>near(p,q,5)))marks.push(p);
 const cuts=[];for(const r of clips){const ps=corners(r);for(let i=0;i<4;i++)if(!near(ps[i],ps[(i+1)%4],3))cuts.push([ps[i],ps[(i+1)%4]]);}
 if(!cuts.length){const a=corners(bounds);cuts.push([a[0],a[1]]);}
 return {width,height,bounds,clips,marks,cuts,rects:sheathingRects(w,Number(key.slice(1))).map(q=>rect(...q)),targets:drywallTargets(w,key).map(q=>xy(q.t,q.y))};
}
function el(tag,attrs={},parent){const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(parent)parent.append(n);return n;}
export function createDrywallBench({onClose,getState,onAction,format}){
 const root=document.getElementById("dryBench"),svg=document.getElementById("dryBoard"),hint=document.getElementById("dryHint"),status=document.getElementById("dryStatus"),steps=document.getElementById("drySteps"),exit=document.getElementById("dryExit"),title=document.getElementById("dryTitle"),meter=document.getElementById("dryMeter");
 let job=null,busy=false,stage=-1,stamp="",progress=new Set(),drag=null,raf=0,geo=null,visual=null,message="";
 const point=e=>{const m=svg.getScreenCTM();if(!m)return {x:-999,y:-999};const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const q=p.matrixTransform(m.inverse());return {x:q.x,y:q.y};};
 function line(a,b,color,width=2,dash=""){return el("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:color,"stroke-width":width,"stroke-dasharray":dash,"stroke-linecap":"round"},svg);}
 function dot(p,done=false,r=8){return el("circle",{cx:p.x,cy:p.y,r,fill:done?"#7bcba1":"#e8b960",stroke:"#172622","stroke-width":2},svg);}
 function rectangle(r,attrs={},parent=svg){return el("rect",{x:r.x,y:r.y,width:r.w,height:r.h,...attrs},parent);}
 function label(p,s,color="#dbe7dc",size=14){const n=el("text",{x:p.x,y:p.y,fill:color,"font-size":size,"text-anchor":"middle"},svg);n.textContent=s;return n;}
 function read(){return job?getState(job):null;}
 function abortDrag(){if(raf)cancelAnimationFrame(raf);raf=0;drag=null;visual=null;}
 function close(resume=true){abortDrag();job=null;busy=false;stage=-1;stamp="";root.classList.add("hidden");onClose(resume);}
 function open(info){job={...info};busy=false;stage=-1;stamp="";progress.clear();message="";root.classList.remove("hidden");refresh(true);}
 async function act(operation,screw){if(!job||busy)return;const current=job;busy=true;message="Saving…";render();let ok=false;try{ok=await onAction({...job,operation,...(screw===undefined?{}:{screw})});}catch(e){message=e.message||"Could not save this step.";}if(job!==current)return;busy=false;if(!ok){if(message==="Saving…")message="Step not saved. Try again.";progress.clear();}else message="";refresh(true);}
 function measurements(g){const b=g.bounds;return [[{x:b.x,y:b.y-24},{x:b.x+b.w,y:b.y-24}],[{x:b.x-25,y:b.y},{x:b.x-25,y:b.y+b.h}]];}
 function targetList(s,g){if(s===0)return measurements(g);if(s===2)return g.cuts;return [];}
 function refresh(force=false){if(!job)return;const d=read();if(!d||!d.wall){close(false);return;}const rec=drywallRecord(d.wall,job.key),s=rec?.stage||0,done=drywallComplete(d.wall,rec),g=benchGeometry(d.wall,job.key,d.devices,d.lines);const k=JSON.stringify([s,done,rec?.screws,g]);if(!force&&k===stamp)return;if(stage!==s){abortDrag();progress.clear();stage=s;}stamp=k;geo=g;render();}
 function render(){
 if(!job||!geo)return;const d=read();if(!d?.wall)return;const rec=drywallRecord(d.wall,job.key),done=drywallComplete(d.wall,rec),g=geo,b=g.bounds;svg.replaceChildren();svg.style.cursor=busy?"wait":stage===3?"grab":"crosshair";
 const bg=el("rect",{x:0,y:0,width:720,height:540,rx:10,fill:"#182823"},svg);for(let x=0;x<720;x+=24)line({x,y:0},{x,y:540},"#233a32",1);for(let y=0;y<540;y+=24)line({x:0,y},{x:720,y},"#233a32",1);
 const sheet=stage>=2?"#e6e3d8":"#9d8d73";rectangle(b,{fill:sheet,stroke:"#b9c5ad","stroke-width":2,rx:1});
 if(stage===0||stage===1){for(let i=1;i<5;i++)rectangle({x:b.x+b.w*i/5-3,y:b.y,w:6,h:b.h},{fill:"#79644b",opacity:.7});}
 for(const r of g.clips){rectangle(r,{fill:stage>=3?"#172622":"#694d46",stroke:"#e9b960","stroke-width":1.5,"stroke-dasharray":stage<=2?"5 4":""});}
 if(stage===0){const m=measurements(g);for(let i=0;i<m.length;i++){line(...m[i],progress.has(i)?"#7bcba1":"#e8b960",2,"5 3");dot(m[i][0],progress.has(i));dot(m[i][1],progress.has(i));}label({x:360,y:topSafe(b.y-42)},progress.has(0)?format(g.width):"WIDTH");label({x:360,y:b.y+b.h+30},progress.has(1)?format(g.height):"HEIGHT · drag the vertical guide");}
 if(stage===1)for(let i=0;i<g.marks.length;i++)dot(g.marks[i],progress.has(i),7);
 if(stage===2){const c=g.cuts;for(let i=0;i<c.length;i++){line(...c[i],progress.has(i)?"#7bcba1":i===progress.size?"#e8b960":"#b98d79",i===progress.size?3:2,"5 3");}const a=c[progress.size];if(a){dot(a[0]);dot(a[1]);}}
 if(stage===3){rectangle(b,{fill:"#20392f",stroke:"#7bcba1","stroke-width":3,"stroke-dasharray":"7 5"});const group=el("g",{transform:"translate(68 35)"},svg);rectangle(b,{fill:"#e6e3d8",stroke:"#bbb9a8","stroke-width":2,rx:1},group);for(const r of g.clips)rectangle(r,{fill:"#172622",stroke:"#8f8c7e"},group);visual=group;label({x:360,y:505},"Drag the sheet onto the green outline");}
 if(stage===4){for(let i=0;i<g.targets.length;i++){const p=g.targets[i],secured=rec?.screws.includes(i);dot(p,secured,secured?5:11);if(!secured)el("circle",{cx:p.x,cy:p.y,r:16,fill:"none",stroke:"#f6d18b","stroke-width":2},svg);}}
 steps.replaceChildren();for(let i=0;i<5;i++){const n=document.createElement("span");n.textContent=(i+1)+" · "+stages[i];n.className=done||i<stage?"complete":i===stage?"current":"";steps.append(n);}
 title.textContent=done?"SHEET INSTALLED":"DRYWALL WORKSTATION";
 const total=stage===0?2:stage===1?g.marks.length:stage===2?g.cuts.length:stage===3?1:g.targets.length,count=stage===4?(rec?.screws.length||0):progress.size;
 status.textContent=done?"All fastening targets secured":count+" / "+total+" tasks · "+format(g.width)+" × "+format(g.height);
 meter.style.width=(done?100:Math.min(100,(stage+count/Math.max(1,total))*20))+"%";
 hint.textContent=message||(done?"Installation saved. Return to the site.":busy?"Saving…":["Drag between the two ends of each measurement guide.","Click every highlighted marking point.","Drag from the start to the end of each highlighted cut guide, in order.","Drag the sheet into the green target outline.","Hold the mouse on each highlighted fastening point until it turns green."][stage]);
 exit.textContent=done?"Return to site":"Close · saved steps retained";exit.disabled=busy;
 }
 function topSafe(y){return Math.max(17,y);}
 function pointerDown(e){if(!job||busy||e.button!==0)return;const d=read(),rec=d&&drywallRecord(d.wall,job.key);if(!d||drywallComplete(d.wall,rec))return;const p=point(e);e.preventDefault();if(stage===1){const i=geo.marks.findIndex((q,i)=>!progress.has(i)&&near(p,q,13));if(i<0)return;progress.add(i);if(progress.size===geo.marks.length)act("dryMark");else render();return;}
 if(stage===0||stage===2){const list=targetList(stage,geo);const i=stage===2?progress.size:list.findIndex((q,i)=>!progress.has(i)&&q.some(v=>near(p,v)));if(i<0||!list[i])return;const [a,b]=list[i];if(!near(p,a)&&!near(p,b))return;drag={i,start:near(p,a)?a:b,end:near(p,a)?b:a};visual=line(drag.start,p,"#7bcba1",4);}
 else if(stage===3){const b=geo.bounds;if(p.x<b.x+68||p.x>b.x+b.w+68||p.y<b.y+35||p.y>b.y+b.h+35)return;drag={start:p,offset:{x:68,y:35}};}
 else if(stage===4){const i=geo.targets.findIndex((q,i)=>!rec?.screws.includes(i)&&near(p,q,19));if(i<0)return;drag={i,startTime:performance.now(),point:geo.targets[i]};const q=drag.point;visual=el("circle",{cx:q.x,cy:q.y,r:19,fill:"none",stroke:"#80edb1","stroke-width":5,"stroke-dasharray":"0 120",transform:"rotate(-90 "+q.x+" "+q.y+")"},svg);const tick=now=>{if(!drag||!job)return;const t=clamp((now-drag.startTime)/650,0,1);visual?.setAttribute("stroke-dasharray",(t*119.4)+" 120");if(t>=1){const i=drag.i;abortDrag();act("dryFasten",i);}else raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);}
 if(drag)try{svg.setPointerCapture(e.pointerId);}catch{}
 }
 function pointerMove(e){if(!drag)return;const p=point(e);if(stage===0||stage===2){visual?.setAttribute("x2",p.x);visual?.setAttribute("y2",p.y);}else if(stage===3){drag.offset={x:68+p.x-drag.start.x,y:35+p.y-drag.start.y};visual?.setAttribute("transform","translate("+drag.offset.x+" "+drag.offset.y+")");}else if(stage===4&&!near(p,drag.point,22)){abortDrag();render();}}
 function pointerUp(e){if(!drag)return;const q=drag,p=point(e);abortDrag();if(stage===0||stage===2){if(near(p,q.end,22)){progress.add(q.i);if(progress.size===targetList(stage,geo).length){act(stage===0?"dryMeasure":"dryCut");return;}}else message="Missed the end marker. Try that guide again.";}
 else if(stage===3){if(Math.hypot(q.offset.x,q.offset.y)<=20){act("dryPosition");return;}message="Align the sheet with the green outline.";}render();}
 svg.addEventListener("pointerdown",pointerDown);svg.addEventListener("pointermove",pointerMove);svg.addEventListener("pointerup",pointerUp);svg.addEventListener("pointercancel",()=>{abortDrag();if(job)render();});svg.addEventListener("lostpointercapture",()=>{if(drag){abortDrag();if(job)render();}});exit.onclick=()=>{if(!busy)close(true);};
 return {open,close,refresh,get active(){return !!job;},get busy(){return busy;}};
}
