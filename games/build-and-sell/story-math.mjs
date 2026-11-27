
import {roofPlan} from "./roof-math.mjs";
export const STORY_DIRECTIONS=["East","South","West","North"];
export function storyPlan(r,walls,direction=0){
 const p=roofPlan(r,walls);
 if(!p||!Number.isInteger(direction)||direction<0||direction>3)return null;
 const axis=direction%2?"z":"x",cross=axis==="x"?"z":"x",sign=direction<2?1:-1;
 const run=Math.max(3.0,p.height*1.30),width=1.20,L=p[axis+"2"]-p[axis+"1"],W=p[cross+"2"]-p[cross+"1"];
 if(L<run+1.5||W<width+1.0)return null;
 const c=(p[cross+"1"]+p[cross+"2"])/2,start=(p[axis+"1"]+p[axis+"2"])/2-sign*run/2,end=start+sign*run;
 const hole=axis==="x"?{x1:Math.min(start,end),x2:Math.max(start,end),z1:c-width/2,z2:c+width/2}:{z1:Math.min(start,end),z2:Math.max(start,end),x1:c-width/2,x2:c+width/2};
 return {x1:p.x1,x2:p.x2,z1:p.z1,z2:p.z2,height:p.height+.12,axis,cross,sign,start,end,run,width,c,hole,direction};
}
const inside=(p,x,z,m=0)=>x>=p.x1+m&&x<=p.x2-m&&z>=p.z1+m&&z<=p.z2-m;
function crosses(b,w){
 let lo=0,hi=1;for(const axis of ["x","z"]){const a=w.a[axis],d=w.b[axis]-a,min=b[axis+"1"]-.12,max=b[axis+"2"]+.12;
 if(Math.abs(d)<1e-7){if(a<min||a>max)return false;}else{const u=(min-a)/d,v=(max-a)/d;lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));if(lo>hi)return false;}}return true;
}
export function storyCost(plan){return {upperdeck:Math.ceil((plan.x2-plan.x1)*(plan.z2-plan.z1)-(plan.run*plan.width)),stairkit:1};}
export function readStory(w,r,walls){
 const direction=w?.story?.direction,plan=storyPlan(r,walls,direction);
 return {story:Number.isInteger(direction)&&plan?{direction}:null,storyPlan:Number.isInteger(direction)?plan:null,storyRevision:Number.isSafeInteger(w?.storyRevision)&&w.storyRevision>=0?w.storyRevision:0};
}
export function changeStory(w,r,walls,direction,remove,p,now,furnitureBounds=[]){
 const old=readStory(w,r,walls);
 const plan=remove?old.storyPlan:storyPlan(r,walls,direction);
 if(!plan)return {error:"Choose a larger rectangular house or rotate the stairwell"};
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.hypot(Math.max(plan.x1-p.x,0,p.x-plan.x2),Math.max(plan.z1-p.z,0,p.z-plan.z2))>5)return {error:"Approach the house"};
 if((p.levelY||0)>.25)return {error:"Return to the ground floor first"};
 if(remove&&Array.isArray(w.upperRoof)&&w.upperRoof.length)return {error:"Remove upper roofing before removing the deck"};
 if(remove&&Array.isArray(w.upperWalls)&&w.upperWalls.length)return {error:"Remove upper walls before removing the deck"};
 if(remove)return old.story?{story:null}:{error:"No upper deck installed"};
 if(old.story)return {error:"Upper deck already installed"};
 if(!w.cureAt||now<w.cureAt)return {error:"Cured foundation required"};
 if(Array.isArray(w.roof)&&w.roof.length)return {error:"Remove existing roof construction first"};
 if(walls.some(v=>crosses(plan.hole,v)))return {error:"Clear walls from the stairwell"};
 if(furnitureBounds.some(b=>b&&b.x1<plan.hole.x2&&b.x2>plan.hole.x1&&b.z1<plan.hole.z2&&b.z2>plan.hole.z1))return {error:"Move furniture out of the stairwell"};
 return {story:{direction},cost:storyCost(plan)};
}
export function stairProgress(plan,x,z){return ((plan.axis==="x"?x:z)-plan.start)*plan.sign/plan.run;}
function stairSide(plan,x,z){return Math.abs((plan.cross==="x"?x:z)-plan.c);}
export function storySurface(p,previous,plans){
 const h=Math.max(0,p.levelY||0);
 const prevPlan=plans.find(q=>inside(q,previous.x,previous.z,-.06));
 const plan=plans.find(q=>inside(q,p.x,p.z,-.06));
 if(h>.01&&prevPlan){
  const q=prevPlan,t=stairProgress(q,p.x,p.z),oldT=stairProgress(q,previous.x,previous.z),side=stairSide(q,p.x,p.z),oldSide=stairSide(q,previous.x,previous.z);
  const onStair=h<q.height-.025;
  if(onStair){
   if(side>q.width/2-.15&&t>0&&t<1){p.x=previous.x;p.z=previous.z;return h;}
   return q.height*Math.max(0,Math.min(1,t));
  }
  if(!inside(q,p.x,p.z,.12)){p.x=previous.x;p.z=previous.z;return q.height;}
  if(t>0&&t<1&&side<q.width/2+.12){
   if(oldT>=1&&side<q.width/2-.15)return q.height*t;
   p.x=previous.x;p.z=previous.z;return q.height;
  }
  return q.height;
 }
 if(!plan)return 0;
 const t=stairProgress(plan,p.x,p.z),oldT=stairProgress(plan,previous.x,previous.z);
 return t>=0&&t<=.16&&oldT<=.16&&stairSide(plan,p.x,p.z)<plan.width/2-.15?plan.height*t:0;
}
