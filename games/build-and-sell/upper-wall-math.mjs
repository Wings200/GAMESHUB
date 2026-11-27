
import {readWalls,addWall,removeWall,changeOpening,wallLength} from "./wall-math.mjs";
export const UPPER_MODES=["wall","door","window"];
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
 return {error:"Invalid upper wall operation"};
}
