
import {readWalls,addWall,removeWall,changeOpening,wallLength,projectWall,sheathingSide,changeSheathing,changeWrap,changeInsulation,changeDrywall,finishDrywall,paintDrywall,changeAssembly,changeSiding,changeTrim,SIDING_TYPES,TRIM_TYPES} from "./wall-math.mjs";
export const UPPER_MODES=["wall","door","window","joinery","sheathing","wrap","insulation","drywall","finish","paint","siding","trim"];
export function upperReady(plan,p){
 return !!plan&&!!p&&Number.isFinite(p.levelY)&&Math.abs(p.levelY-plan.height)<.08&&p.x>=plan.x1&&p.x<=plan.x2&&p.z>=plan.z1&&p.z<=plan.z2;
}
export function stairClear(plan,w){
 const b={...plan.hole};
 if(plan.sign>0)b[plan.axis+"2"]+=.55;else b[plan.axis+"1"]-=.55;
 let lo=0,hi=1;
 for(const axis of ["x","z"]){const a=w.a[axis],d=w.b[axis]-a,min=b[axis+"1"]-.13,max=b[axis+"2"]+.13;
 if(Math.abs(d)<1e-7){if(a<min||a>max)return true;}
 else{const u=(min-a)/d,v=(max-a)/d;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));if(lo>hi)return true;}}
 return false;
}
export function readUpperWalls(w,plan){
 return plan?readWalls({walls:w?.upperWalls},plan).walls.filter(v=>stairClear(plan,v)):[];
}
export function changeUpperWall(plan,rows,b,p,id="preview"){
 if(!upperReady(plan,p))return {error:"Stand on the active upper deck first"};
 if(b.operation==="add"){
  const result=addWall(plan,rows,b.a,b.b,b.height,p,id);
  if(result.error)return result;
  if(!stairClear(plan,result.wall))return {error:"Keep the stairwell and landing clear"};
  return {upperWalls:result.walls,cost:{lumber:Math.max(1,Math.ceil(wallLength(result.wall)))}};
 }
 if(b.operation==="remove"){
  const next=removeWall(rows,b.wallId,p);
  return next?{upperWalls:next}:{error:"Approach an uncovered upper wall"};
 }
 if(b.operation==="opening"||b.operation==="removeOpening"){
  const result=changeOpening(rows,b.wallId,b.opening,p,b.operation==="removeOpening");
  return result.error?result:{upperWalls:result.walls,cost:b.operation==="opening"?{opening:1}:{}};
 }
 const w=rows.find(v=>v.id===b.wallId);
 if(!w||projectWall(w,p).d>3.6)return {error:"Approach an upper wall"};
 // Game-only access to the exterior face from the upper deck, without a scaffold.
 let actor=p;
 if(b.opposite===true&&["sheetAdd","sheetRemove","wrapAdd","wrapRemove","sidingAdd","sidingRemove"].includes(b.operation)){
  const q=projectWall(w,p).point,L=wallLength(w),side=sheathingSide(w,p)==="+"?-1:1;
  actor={...p,x:q.x-(w.b.z-w.a.z)/L*side*.24,z:q.z+(w.b.x-w.a.x)/L*side*.24};
 }
 const op=b.operation,key=b.key,remove=op.endsWith("Remove"),id0=w.id;
 let result,cost={};
 if(["sheetAdd","sheetRemove"].includes(op)){result=changeSheathing(rows,id0,key,actor,remove);if(!remove)cost={osb:1};}
 else if(["wrapAdd","wrapRemove"].includes(op)){result=changeWrap(rows,id0,key,actor,remove);if(!remove)cost={wrap:1};}
 else if(["insulate","uninsulate"].includes(op)){result=changeInsulation(rows,id0,key,p,op==="uninsulate");if(op==="insulate")cost={insulation:1};}
 else if(["dryMeasure","dryMark","dryCut","dryPosition","dryFasten","dryRemove"].includes(op)){result=changeDrywall(rows,id0,key,op,p,b.screw);if(op==="dryPosition")cost={drywall:1};}
 else if(["finishTape","finishCoat","finishSmooth","finishFinal"].includes(op)){result=finishDrywall(rows,id0,key,op,p);if(op!=="finishSmooth")cost={finish:1};}
 else if(op==="paintPatch"){result=paintDrywall(rows,id0,key,p,b.screw,b.color);cost={paint:1};}
 else if(["openingFrame","openingFit","openingFinish","openingUninstall","openingToggle"].includes(op)){result=changeAssembly(rows,id0,b.start,op,p);cost=op==="openingFrame"?{joineryframe:1}:op==="openingFit"?{[result.kind==="door"?"doorunit":"windowunit"]:1}:op==="openingFinish"?{joinerytrim:1}:{};}
 else if(["sidingAdd","sidingRemove"].includes(op)){result=changeSiding(rows,id0,key,b.kind,b.color,actor,remove);if(!remove)cost={[SIDING_TYPES.find(t=>t.id===b.kind)?.stock||"invalid"]:1};}
 else if(["trimAdd","trimRemove"].includes(op)){result=changeTrim(rows,id0,key,b.kind,b.color,p,remove);if(!remove)cost={[TRIM_TYPES.find(t=>t.id===b.kind)?.stock||"invalid"]:1};}
 else return {error:"Invalid upper wall operation"};
 return result.error?result:{upperWalls:result.walls,cost};
}
