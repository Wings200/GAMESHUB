import {tileAt} from "./terrain.mjs";
import {upperFloorTarget} from "./upper-interior-math.mjs?v=94";

const contains=(r,p)=>!!r&&p.x>=r.x1&&p.x<r.x2&&p.z>=r.z1&&p.z<r.z2;
const has=(v,id)=>v instanceof Set?v.has(id):Array.isArray(v)&&v.includes(id);
const finish=k=>k==="hardwood"||k==="vinyl"?"wood":k==="carpet"?"carpet":k==="tile"?"concrete":null;
export function footSurface(p,sites,landscape=[]){
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return "dirt";
 if((p.levelY||0)>.025){
  const s=sites.find(s=>contains(s.storyPlan,p));
  if(s&&p.levelY>=s.storyPlan.height-.08){
   const tile=upperFloorTarget(s.storyPlan,p.x,p.z);
   return finish(s.upperFlooring?.find(f=>f.tile===tile)?.kind)||"wood";
  }
  return "wood";
 }
 for(const s of sites){
  const tile=tileAt(s.layout,p.x,p.z);
  if(tile===null)continue;
  if(has(s.poured,tile))return finish(s.flooring?.find(f=>f.tile===tile)?.kind)||"concrete";
  if(has(s.gravel,tile))return "gravel";
  return "dirt";
 }
 const land=landscape.find(f=>Math.floor(p.x)+.5===f.x&&Math.floor(p.z)+.5===f.z&&["grass","drive","paver"].includes(f.kind));
 return land?.kind==="grass"?"grass":land?"concrete":"dirt";
}
