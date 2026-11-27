
import {wallLength,SHEATH_WIDTH,sheathingRects,insulationBays,drywallComplete,drywallRecord,paintRects} from "./wall-math.mjs";
import {roofTiles} from "./roof-math.mjs";
import {slabTotal} from "./concrete-math.mjs";
import {calculatePower,serviceLive} from "./power-math.mjs";
import {waterState} from "./water-math.mjs";
import {SPECS} from "./fixture-math.mjs";
export function inspectProperty(d,now=Date.now()){
 const rows=[],add=(name,done,total,required,detail)=>{done=Math.max(0,Math.min(total,done));rows.push({name,done,total,required,passed:total>0&&done===total,detail});};
 const r=d.layout,walls=d.walls||[],plan=d.roofPlan,foundationArea=r?(r.x2-r.x1)*(r.z2-r.z1):0,area=plan?(plan.x2-plan.x1)*(plan.z2-plan.z1):0,tiles=slabTotal(r);
 add("Foundation cured",d.cureAt>0&&d.cureAt<=now&&tiles>0&&d.screeded?.length===tiles?1:0,1,true,"Complete and cure the entire slab.");
 add("Enclosed wall perimeter",plan?1:0,1,true,"Complete the rectangular wall perimeter.");
 let outside=0,exteriorDone=0,insulation=0,insulated=0,interior=0,finished=0,painted=0,openings=0,installed=0,doors=0;
 for(const w of walls){
 const side=plan?(()=>{const mid={x:(w.a.x+w.b.x)/2,z:(w.a.z+w.b.z)/2};const x=mid.x-(plan.x1+plan.x2)/2,z=mid.z-(plan.z1+plan.z2)/2;const dx=w.b.x-w.a.x,dz=w.b.z-w.a.z;if(Math.abs(w.a.x-plan.x1)<.18&&Math.abs(w.b.x-plan.x1)<.18||Math.abs(w.a.x-plan.x2)<.18&&Math.abs(w.b.x-plan.x2)<.18||Math.abs(w.a.z-plan.z1)<.18&&Math.abs(w.b.z-plan.z1)<.18||Math.abs(w.a.z-plan.z2)<.18&&Math.abs(w.b.z-plan.z2)<.18)return -dz*x+dx*z>=0?"+":"-";return null;})():null;
 if(side){insulation+=insulationBays(w).length;insulated+=(w.insulation||[]).length;}
 for(let i=0;i<Math.ceil(wallLength(w)/SHEATH_WIDTH);i++){if(!sheathingRects(w,i).length)continue;for(const face of ["+","-"]){const key=face+i;if(face===side){outside++;if(w.siding?.some(v=>v.key===key))exteriorDone++;}else{interior++;const rec=drywallRecord(w,key);if(drywallComplete(w,rec)&&rec.finish===4){finished++;if(paintRects(w,key).every((_,i)=>!!rec.paint?.[i]))painted++;}}}}
 for(const o of w.openings||[]){openings++;if(o.assembly===3){installed++;if(side&&o.kind==="door")doors++;}}
 }
 add("Exterior siding",exteriorDone,outside||1,true,"Cover exterior wall faces with siding.");add("Exterior insulation",insulated,insulation||1,true,"Fill exterior wall cavities.");
 add("Interior drywall finished",finished,interior||1,true,"Secure and finish interior wall faces.");add("Interior painting",painted,interior||1,false,"Paint all finished interior panels for a better score.");
 add("Doors and windows",installed,openings||1,true,"Complete every framed opening.");add("Exterior entrance",doors>0?1:0,1,true,"Install at least one exterior door.");
 const rt=roofTiles(r,plan),roof=new Map((d.roof||[]).map(v=>[v.tile,v.stage]));add("Roof and ceiling",rt.filter(id=>roof.get(id)===5).length,rt.length||1,true,"Finish all five overhead stages.");
 const floor=new Set((d.flooring||[]).map(v=>v.tile));add("Interior flooring",rt.filter(id=>floor.has(id)).length,rt.length||1,true,"Cover the interior footprint.");
 const devices=d.devices||[],cables=d.cables||[],outlets=d.outlets||[],panels=d.panels||[],power=calculatePower(devices,cables,outlets,panels);
 add("Electrical service",panels.some(serviceLive)?1:0,1,true,"Connect the simulated service and activate the panel.");
 const receptacles=devices.filter(v=>v.kind==="outlet"),lights=devices.filter(v=>v.kind==="light"),installedIds=new Set(outlets.map(v=>v.deviceId)),powered=new Set(power.powered);
 add("Electrical devices installed",devices.filter(v=>v.kind!=="panel"&&installedIds.has(v.id)).length,devices.filter(v=>v.kind!=="panel").length||1,true,"Finish all installed device boxes.");
 add("Powered outlets",receptacles.filter(v=>powered.has(v.id)).length,receptacles.length||1,true,"At least one outlet, with every outlet powered.");
 add("Lighting available",lights.length>0&&lights.every(v=>installedIds.has(v.id))?1:0,1,true,"Install lights; switches may be off during inspection.");
 add("Electrical fault check",Object.keys(power.faults).length===0&&panels.every(p=>p.breakers.every(b=>!b.trip))?1:0,1,true,"Resolve simulated circuit faults and tripped breakers.");
 const u=d.utility||{},fixtures=d.fixtures||[],heaters=d.heaters||[];
 add("Water and sewer service",Number(!!u.water&&u.meter&&u.valve)+Number(!!u.sewer),2,true,"Connect both municipal services.");
 const water=waterState({...d,lines:d.wallPipes||[],devices,cables,outlets,panels,fixtures,heaters,power},now);
 add("Water leak check",water.leaks.length===0&&water.pressure>0?1:0,1,true,"No open pressurized pipe ends.");
 const ready=f=>{const v=water.fixtures[f.id];return v&&SPECS[f.kind].ports.every(k=>!!v[k]);};
 add("Working bathroom fixtures",fixtures.filter(ready).length,fixtures.length||1,true,"All installed fixtures need their simulated supply and drain paths.");
 add("Bathroom essentials",["sink","toilet","shower"].filter(k=>fixtures.some(f=>f.kind===k&&ready(f))).length,3,true,"A working sink, toilet and shower.");
 add("Water heater",heaters.some(h=>water.heaters[h.id]?.ready)?1:0,1,true,"A connected, ready water heater.");
 const furnished=new Set((d.furniture||[]).map(f=>f.kind));add("Furnishing variety",Math.min(6,furnished.size),6,false,"Optional furnishing bonus.");
 const score=Math.round(100*rows.reduce((n,v)=>n+v.done/v.total*(v.required?2:1),0)/rows.reduce((n,v)=>n+(v.required?2:1),0));
 return {score,passed:rows.filter(v=>v.required).every(v=>v.passed),rows,area:Math.round(area*100)/100,foundationArea:Math.round(foundationArea*100)/100,requiredRemaining:rows.filter(v=>v.required&&!v.passed).length};
}
