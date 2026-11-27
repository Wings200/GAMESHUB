
import {wallLength,SHEATH_WIDTH,sheathingRects,drywallTargets,drywallRecord,drywallComplete} from "./wall-math.mjs?v=45";
import {specs} from "./electrical-math.mjs";
import {wallPipeRadius} from "./wall-pipe-math.mjs?v=31";
import {THREE} from "../../engine/core.js";
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

const unit=.01,origin={x:360,y:266};
const v=(p,z=0)=>new THREE.Vector3((p.x-origin.x)*unit,(origin.y-p.y)*unit,z);
const material=(c,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color:c,roughness,metalness});
const wood=material(0xb58d5c),woodEnd=material(0x98754d),paper=material(0xd9d8cc,.93),edge=material(0xa9a394),steel=material(0x69757a,.3,.75),black=material(0x252b2c),blue=material(0x3476ad),pink=material(0xd99ca6),yellow=material(0xd7ad4b,.55),floorMat=material(0x777f79);
const gold=new THREE.MeshBasicMaterial({color:0xffca65}),green=new THREE.MeshBasicMaterial({color:0x82e6a7}),faint=new THREE.MeshBasicMaterial({color:0xb38a6c}),ghost=new THREE.MeshBasicMaterial({color:0x7bcba1,transparent:true,opacity:.17,depthWrite:false});
function box(g,w,h,d,x,y,z,m){if(Math.min(w,h,d)<.00001)return null;const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function rectMesh(g,r,z,d,m){const p=v({x:r.x+r.w/2,y:r.y+r.h/2},z);return box(g,r.w*unit,r.h*unit,d,p.x,p.y,p.z,m);}
function beam(g,a,b,z,m,r=.012){const A=v(a,z),B=v(b,z),dir=B.clone().sub(A);if(dir.length()<.0001)return null;const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,dir.length(),8),m);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());g.add(o);return o;}
function disc(g,p,z,r,m){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.012,20),m);o.rotation.x=Math.PI/2;o.position.copy(v(p,z));g.add(o);return o;}
function ring(g,p,z,r,m){const o=new THREE.Mesh(new THREE.TorusGeometry(r,.012,8,30),m);o.position.copy(v(p,z));g.add(o);return o;}
function outline(g,r,z,m){const a={x:r.x,y:r.y},b={x:r.x+r.w,y:r.y},c={x:r.x+r.w,y:r.y+r.h},d={x:r.x,y:r.y+r.h};for(const [p,q] of [[a,b],[b,c],[c,d],[d,a]])beam(g,p,q,z,m,.009);}
function subtract(r,c){const a=Math.max(r.x,c.x),b=Math.min(r.x+r.w,c.x+c.w),d=Math.max(r.y,c.y),t=Math.min(r.y+r.h,c.y+c.h);if(a>=b||d>=t)return [r];return [{x:r.x,y:r.y,w:a-r.x,h:r.h},{x:b,y:r.y,w:r.x+r.w-b,h:r.h},{x:a,y:r.y,w:b-a,h:d-r.y},{x:a,y:t,w:b-a,h:r.y+r.h-t}].filter(q=>q.w>.08&&q.h>.08);}
function sheet(g,b,clips,z=0){let rects=[b];for(const c of clips)rects=rects.flatMap(r=>subtract(r,c));for(const r of rects)rectMesh(g,r,z,.065,[edge,edge,edge,edge,paper,paper]);}
function dispose(g){for(const n of [...g.children]){n.removeFromParent();n.traverse(o=>o.geometry?.dispose());}}
function tool(g,stage){
 const t=new THREE.Group();g.add(t);t.visible=false;
 if(stage===0){box(t,.24,.22,.12,.07,-.06,.10,yellow);box(t,.19,.05,.13,.07,-.14,.1,black);box(t,.025,.055,.05,-.05,.025,.055,steel);}
 else if(stage===1){box(t,.045,.31,.045,.06,-.14,.14,yellow).rotation.z=.38;box(t,.032,.06,.032,.005,-.005,.03,black).rotation.z=.38;}
 else if(stage===2){box(t,.15,.33,.10,.08,-.14,.16,black);box(t,.08,.22,.11,.08,-.10,.17,yellow);box(t,.04,.10,.035,.005,-.025,.06,steel);}
 else if(stage===4){box(t,.26,.18,.20,.12,-.02,.22,yellow);box(t,.15,.18,.14,.18,-.15,.24,black);box(t,.17,.08,.16,.18,-.23,.24,yellow);const chuck=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.14,16),steel);chuck.rotation.x=Math.PI/2;chuck.position.set(0,0,.14);t.add(chuck);box(t,.025,.025,.12,0,0,.048,steel);}
 return t;
}

export function createDrywallBench({getScene,getCamera,getPose,onClose,getState,onAction,format}){
 let job=null,busy=false,stage=-1,stamp="",progress=new Set(),held=null,geo=null,model=null,toolModel=null,moving=null,trace=null,message="",look=null,normal=null,center=null,scale=1,yaw=0,aim=null,now=0,focus=null,focusKey="",guideStart=null;
 const inv=new THREE.Matrix4(),ray=new THREE.Ray(),localPlane=new THREE.Plane(new THREE.Vector3(0,0,1),-.11),hit=new THREE.Vector3();
 const hud=id=>document.getElementById(id);
 function read(){return job?getState(job):null;}
 function cancelHold(){held=null;}
 function close(){cancelHold();if(model){dispose(model);model.removeFromParent();model=null;}const p=getPose();if(look&&p){p.yaw=look.yaw;p.pitch=look.pitch;}look=null;job=null;busy=false;stage=-1;stamp="";geo=null;focus=null;focusKey="";guideStart=null;onClose();}
 function open(info){if(job)close();job={...info};busy=false;stage=-1;stamp="";progress.clear();focus=null;focusKey="";guideStart=null;message="";const p=getPose();look={yaw:p.yaw,pitch:p.pitch};model=new THREE.Group();getScene().add(model);refresh(true);if(!job)return;p.yaw=yaw;p.pitch=0;p.vx=p.vz=p.speed=0;}
 function orient(w){const side=job.key[0]==="+"?1:-1,len=wallLength(w),ux=(w.b.x-w.a.x)/len,uz=(w.b.z-w.a.z)/len,t=Number(job.key.slice(1))*SHEATH_WIDTH+geo.width/2;
 normal=new THREE.Vector3(-uz*side,0,ux*side);center=new THREE.Vector3(w.a.x+ux*t,.02+w.height/2,w.a.z+uz*t).addScaledVector(normal,.085);yaw=Math.atan2(normal.x,normal.z);scale=geo.width/(geo.bounds.w*unit);model.position.copy(center);model.rotation.y=yaw;model.scale.setScalar(scale);model.updateMatrixWorld(true);}
 function focusTarget(){
 if(!geo)return null;const d=read(),rec=d&&drywallRecord(d.wall,job.key),b=geo.bounds;
 if(stage===0||stage===2){const list=targets(),i=list.findIndex((_,i)=>!progress.has(i));if(i<0)return null;const pair=list[i];return {key:stage+":"+i+":"+(guideStart?1:0),p:guideStart?pair[1]:pair[0],distance:stage===0?.50:.46};}
 if(stage===1){const i=geo.marks.findIndex((_,i)=>!progress.has(i));return i<0?null:{key:"mark:"+i,p:geo.marks[i],distance:.44};}
 if(stage===3)return {key:"position",p:{x:b.x+b.w/2+12,y:b.y+b.h/2+7},distance:.72};
 if(stage===4){const i=geo.targets.findIndex((_,i)=>!rec?.screws.includes(i));return i<0?null:{key:"fasten:"+i,p:geo.targets[i],distance:.42};}return null;
 }
 function camera(){if(!job||!center||!geo)return;const cam=getCamera(),p=getPose(),target=focusTarget();if(!target)return;
 if(target.key!==focusKey){focusKey=target.key;focus=target.p;p.yaw=yaw;p.pitch=0;}
 const local=v(focus||target.p,stage===3?.25:.11);local.x+=.045/scale;local.y+=.025/scale;model.localToWorld(local);
 cam.position.copy(local).addScaledVector(normal,target.distance);cam.rotation.set(p.pitch,p.yaw,0,"YXZ");cam.updateMatrixWorld(true);}

 function point(z=.11){if(!model)return null;const cam=getCamera();cam.updateMatrixWorld(true);model.updateMatrixWorld(true);inv.copy(model.matrixWorld).invert();cam.getWorldDirection(ray.direction);ray.origin.copy(cam.position);ray.applyMatrix4(inv);localPlane.constant=-z;if(!ray.intersectPlane(localPlane,hit))return null;return {x:hit.x/unit+origin.x,y:origin.y-hit.y/unit};}
 function measurements(g){const b=g.bounds;return [[{x:b.x,y:b.y-24},{x:b.x+b.w,y:b.y-24}],[{x:b.x-25,y:b.y},{x:b.x-25,y:b.y+b.h}]];}
 function targets(){return stage===0?measurements(geo):stage===2?geo.cuts:[];}
 function refresh(force=false){if(!job)return;const d=read();if(!d?.wall){close();return;}const rec=drywallRecord(d.wall,job.key),s=rec?.stage||0,g=benchGeometry(d.wall,job.key,d.devices,d.lines),k=JSON.stringify([s,rec?.screws,g]);if(!force&&k===stamp)return;if(stage!==s){cancelHold();progress.clear();guideStart=null;focusKey="";stage=s;}stamp=k;geo=g;orient(d.wall);render();}
 async function act(operation,screw){if(!job||busy)return;const current=job;busy=true;cancelHold();message="Saving…";updateHud();let ok=false;try{ok=await onAction({...job,operation,...(screw===undefined?{}:{screw})});}catch(e){message=e.message||"Could not save step.";}if(job!==current)return;busy=false;if(!ok){if(message==="Saving…")message="Step not saved. Try again.";progress.clear();guideStart=null;focusKey="";}else message="";refresh(true);const d=read();if(ok&&d&&drywallComplete(d.wall,drywallRecord(d.wall,job.key))){close();}}
 function render(){if(!job||!geo||!model)return;const d=read();if(!d?.wall)return;const rec=drywallRecord(d.wall,job.key),g=geo,b=g.bounds;dispose(model);moving=trace=null;
 // Actual framing, insulation and utilities are rendered by the shared world scene.
 if(stage===0){for(const [i,m] of measurements(g).entries()){beam(model,...m,.11,progress.has(i)?green:gold);for(let j=0;j<2;j++)ring(model,m[j],.11,.035,progress.has(i)||j===0&&guideStart?.i===i?green:gold);}}
 if(stage===1||stage===2){sheet(model,b,[],.035);outline(model,b,.11,faint);for(const c of g.clips)outline(model,c,.11,faint);}
 if(stage===1)for(let i=0;i<g.marks.length;i++)ring(model,g.marks[i],.11,.032,progress.has(i)?green:gold);
 if(stage===2){for(let i=0;i<g.cuts.length;i++)beam(model,...g.cuts[i],.11,progress.has(i)?green:i===progress.size?gold:faint,i===progress.size?.016:.007);const a=g.cuts[progress.size];if(a)for(let j=0;j<2;j++)ring(model,a[j],.11,.032,j===0&&guideStart?green:gold);}
 if(stage===3){outline(model,b,.11,green);moving=new THREE.Group();model.add(moving);sheet(moving,b,g.clips,.11);moving.position.set(.24,-.14,.14);const c={x:b.x+b.w/2,y:b.y+b.h/2};ring(moving,c,.14,.045,gold);ring(model,c,.25,.045,green);}
 // Once positioned, the real installed drywall mesh is visible, not a duplicate sheet.
 if(stage===4)for(let i=0;i<g.targets.length;i++){const p=g.targets[i],secured=rec?.screws.includes(i);if(!secured)ring(model,p,.11,.035,gold);}
 toolModel=tool(model,stage);updateHud();}
 function updateHud(){if(!job||!geo)return;const d=read();if(!d?.wall)return;const rec=drywallRecord(d.wall,job.key),done=drywallComplete(d.wall,rec),total=stage===0?2:stage===1?geo.marks.length:stage===2?geo.cuts.length:stage===3?1:geo.targets.length,count=stage===4?(rec?.screws.length||0):progress.size;
 hud("wallTitle").textContent="DRYWALL · "+stages[stage].toUpperCase()+" ("+(stage+1)+"/5)";hud("wallCount").textContent=count+" / "+total+" tasks";hud("wallMeasure").textContent=format(geo.width)+" × "+format(geo.height);hud("wallHint").textContent=message||(done?"Sheet secured · E exit":busy?"Saving…":[guideStart?"Click the second measurement marker.":"Click the highlighted measurement start.","Aim at the highlighted marker and click.",guideStart?"Click the highlighted cut endpoint.":"Click the highlighted cut start.","Hold LMB on the sheet handle and move to the green alignment marker.","Aim at the yellow target and hold LMB to secure it."][stage]);}
 function press(){if(!job||busy||!geo)return;const d=read(),rec=d&&drywallRecord(d.wall,job.key);if(!d)return;if(drywallComplete(d.wall,rec)){close();return;}const p=point(stage===3?.25:.11);if(!p)return;message="";
 if(stage===1){const i=geo.marks.findIndex((_,i)=>!progress.has(i));if(i>=0&&!near(p,geo.marks[i],8))return;if(i<0)return;progress.add(i);if(progress.size===geo.marks.length)act("dryMark");else render();return;}
 if(stage===0||stage===2){const list=targets(),i=list.findIndex((_,i)=>!progress.has(i));if(i<0)return;const [a,b]=list[i];if(!guideStart){if(!near(p,a,9))return;guideStart={i};render();return;}if(!near(p,b,9))return;guideStart=null;progress.add(i);if(progress.size===list.length){act(stage===0?"dryMeasure":"dryCut");return;}render();return;}
 else if(stage===3){const b=geo.bounds,h={x:b.x+b.w/2+24,y:b.y+b.h/2+14};if(!near(p,h,10))return;held={start:p,offset:{x:24,y:14}};}
 else if(stage===4){const i=geo.targets.findIndex((_,i)=>!rec?.screws.includes(i));if(i<0||!near(p,geo.targets[i],8))return;held={i,point:geo.targets[i],time:performance.now()};}
 }
 function release(){if(!held)return;const q=held,p=point(stage===3?.25:.11);cancelHold();if(!p){render();return;}if(stage===0||stage===2){if(near(p,q.end,20)){progress.add(q.i);if(progress.size===targets().length){act(stage===0?"dryMeasure":"dryCut");return;}}else message="Missed the end marker. Try again.";}else if(stage===3){const offset={x:24+p.x-q.start.x,y:14+p.y-q.start.y};if(Math.hypot(offset.x,offset.y)<=8){act("dryPosition");return;}message="Align the sheet with the green outline.";}render();}
 function tick(){if(!job)return;refresh();if(!job||!geo)return;now=performance.now();const p=point(stage===3?.25:.11);aim=p;if(toolModel){toolModel.visible=!!p&&stage!==3&&!busy&&p.x>=geo.bounds.x-45&&p.x<=geo.bounds.x+geo.bounds.w+45&&p.y>=geo.bounds.y-45&&p.y<=geo.bounds.y+geo.bounds.h+45;if(toolModel.visible){toolModel.position.copy(v(p,.16));toolModel.scale.setScalar(.75);toolModel.rotation.z=0;}}
 if(held&&p){if(stage===0||stage===2){if(trace){trace.removeFromParent();trace.geometry.dispose();}trace=beam(model,held.start,p,.14,green,.014);}else if(stage===3){held.offset={x:24+p.x-held.start.x,y:14+p.y-held.start.y};moving?.position.set(held.offset.x*unit,-held.offset.y*unit,.14);}else if(stage===4){if(!near(p,held.point,11)){cancelHold();message="Keep the crosshair on the target.";render();}else{const t=clamp((now-held.time)/650,0,1);if(toolModel){toolModel.position.copy(v(held.point,.16-.055*t));toolModel.rotation.z=Math.sin(now*.12)*.045;}if(t>=1){const i=held.i;cancelHold();act("dryFasten",i);}}}}updateHud();}
 return {open,close,refresh,camera,tick,press,release,cancelHold,get active(){return !!job;},get busy(){return busy;}};
}
