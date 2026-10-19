// Authored two-level navigation, retaining the western spawn approaches.
const MINX=-78,MINZ=-78,WIDTH=131,HEIGHT=130;
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const xy=(p)=>({x:clamp(Math.round(p.x-MINX),0,WIDTH-1),
  z:clamp(Math.round(p.z-MINZ),0,HEIGHT-1)});
const point=(x,z)=>({x:MINX+x,z:MINZ+z});
const hash=(x,z)=>z*WIDTH+x;
const memo=new WeakMap();
function occupancy(world,level,ignoreDoors){
  const revision=world.collisionRevision;
  let saved=memo.get(world);
  if(!saved||saved.revision!==revision){saved={revision};memo.set(world,saved)}
  const key=level+"-"+ignoreDoors;
  if(saved[key])return saved[key];
  const blockers=world.colliders.filter(c=>
    c.maxY>level+.42&&c.minY<level+1.6&&
    !(ignoreDoors&&c.tag==="barricade"&&c.barricade?.kind==="door"));
  const grid=new Uint8Array(WIDTH*HEIGHT);
  for(let z=0;z<HEIGHT;z++)for(let x=0;x<WIDTH;x++){
    const p=point(x,z);
    grid[hash(x,z)]=Number(level>0&&Math.abs(world.floorAt(p.x,p.z,level)-level)>.7||
      blockers.some(c=>p.x>=c.minX-.33&&p.x<=c.maxX+.33&&
        p.z>=c.minZ-.33&&p.z<=c.maxZ+.33));
  }
  saved[key]=grid;return grid;
}
function route(world,a,b,level,ignoreDoors){
  const blocked=occupancy(world,level,ignoreDoors),start=xy(a),goal=xy(b);
  const startKey=hash(start.x,start.z),endKey=hash(goal.x,goal.z);
  if(startKey===endKey)return [{x:b.x,z:b.z,y:level}];
  const cost=new Float32Array(blocked.length);cost.fill(Infinity);
  const parents=new Int32Array(blocked.length);parents.fill(-1);
  const seen=new Uint8Array(blocked.length);
  const heap=[{...start,id:startKey,f:0}];cost[startKey]=0;
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]];
  let visited=0,found=false;
  while(heap.length&&visited++<14500){
    let index=0;
    for(let i=1;i<heap.length;i++)if(heap[i].f<heap[index].f)index=i;
    const u=heap.splice(index,1)[0];if(seen[u.id])continue;
    if(u.id===endKey){found=true;break}seen[u.id]=1;
    for(const [dx,dz] of dirs){
      const x=u.x+dx,z=u.z+dz;
      if(x<0||z<0||x>=WIDTH||z>=HEIGHT)continue;
      const id=hash(x,z);
      if(seen[id]||(blocked[id]&&id!==endKey))continue;
      if(dx&&dz&&(blocked[hash(u.x+dx,u.z)]||blocked[hash(u.x,u.z+dz)]))continue;
      const next=cost[u.id]+(dx&&dz?1.414:1);
      if(next>=cost[id])continue;
      cost[id]=next;parents[id]=u.id;
      heap.push({x,z,id,f:next+Math.hypot(goal.x-x,goal.z-z)});
    }
  }
  if(!found)return [];
  const points=[{x:b.x,z:b.z,y:level}];
  let cur=endKey;
  while(cur!==startKey&&parents[cur]>=0){
    cur=parents[cur];
    if(cur!==startKey)points.push({...point(cur%WIDTH,Math.floor(cur/WIDTH)),y:level});
    if(points.length>500)break;
  }
  return points.reverse();
}
export function findClubhousePath(world,from,to,ignoreDoors=true){
  const fromLevel=(from.y||0)>=2.15?4:0,toLevel=(to.y||0)>=2.15?4:0;
  if(fromLevel===toLevel)return route(world,from,to,fromLevel,ignoreDoors);
  let best=null,score=Infinity;
  for(const connector of world.facility.stairConnectors||[]){
    const start=fromLevel===0?connector.bottom:connector.top;
    const end=fromLevel===0?connector.top:connector.bottom;
    const approach=route(world,from,start,fromLevel,ignoreDoors);
    const exit=route(world,end,to,toLevel,ignoreDoors);
    if(!approach.length||!exit.length)continue;
    const rating=approach.length+exit.length;
    if(rating>=score)continue;
    const climb=[];
    for(let i=1;i<=32;i++){
      const t=i/32;
      climb.push({x:start.x+(end.x-start.x)*t,
        z:start.z+(end.z-start.z)*t,y:start.y+(end.y-start.y)*t});
    }
    best=[...approach,...climb,...exit];score=rating;
  }
  return best||[];
}
