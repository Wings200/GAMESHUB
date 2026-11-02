// W09.12: deterministic waypoint-graph navigation around solid rectangular cover.
// Movement decisions are made from world geometry, not the hidden player's position.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function inside(p,b,pad=0){
  return p.x>=b.minX-pad&&p.x<=b.maxX+pad&&
    p.z>=b.minZ-pad&&p.z<=b.maxZ+pad;
}
function crossing(a,b,rect,pad){
  let entry=0,exit=1;
  for(const [s,e,lo,hi] of [[a.x,b.x,rect.minX-pad,rect.maxX+pad],
    [a.z,b.z,rect.minZ-pad,rect.maxZ+pad]]){
    const delta=e-s;
    if(Math.abs(delta)<1e-9){if(s<lo||s>hi)return false;continue;}
    let t0=(lo-s)/delta,t1=(hi-s)/delta;
    if(t0>t1)[t0,t1]=[t1,t0];
    entry=Math.max(entry,t0);exit=Math.min(exit,t1);
    if(entry>exit)return false;
  }
  return exit>=0&&entry<=1;
}
export const pathClear=(a,b,obstacles=[],radius=.34)=>
  !obstacles.some(box=>crossing(a,b,box,radius));

export function planNavigationRoute(start,target,obstacles=[],area={
  minX:-60.5,maxX:60.5,minZ:-51.5,maxZ:51.5},radius=.34){
  if(!start||!target||![start.x,start.z,target.x,target.z].every(Number.isFinite))
    return [];
  const end={x:clamp(target.x,area.minX+.2,area.maxX-.2),
    z:clamp(target.z,area.minZ+.2,area.maxZ-.2)};
  if(pathClear(start,end,obstacles,radius))return [end];
  const clearance=radius+.22;
  const nodes=[{x:start.x,z:start.z},end];
  for(const b of obstacles){
    for(const x of [b.minX-clearance,b.maxX+clearance])
      for(const z of [b.minZ-clearance,b.maxZ+clearance]){
        const pt={x,z};
        if(x<=area.minX+.1||x>=area.maxX-.1||
          z<=area.minZ+.1||z>=area.maxZ-.1)continue;
        if(obstacles.some(box=>inside(pt,box,radius+.015)))continue;
        nodes.push(pt);
      }
  }
  const best=Array(nodes.length).fill(Infinity);
  const parent=Array(nodes.length).fill(-1);
  const used=Array(nodes.length).fill(false);best[0]=0;
  // Dense Dijkstra is inexpensive in the small combat-testing arena.
  for(let k=0;k<nodes.length;k++){
    let current=-1;
    for(let i=0;i<nodes.length;i++)
      if(!used[i]&&(current===-1||best[i]<best[current]))current=i;
    if(current===-1||!Number.isFinite(best[current]))break;
    if(current===1)break;
    used[current]=true;
    for(let i=1;i<nodes.length;i++){
      if(used[i]||i===current||!pathClear(nodes[current],nodes[i],obstacles,radius))continue;
      const score=best[current]+dist(nodes[current],nodes[i]);
      if(score<best[i]){
        best[i]=score;parent[i]=current;
      }
    }
  }
  if(!Number.isFinite(best[1]))return [];
  const route=[];
  for(let i=1;i!==0&&i!==-1;i=parent[i])route.unshift(nodes[i]);
  return route;
}
