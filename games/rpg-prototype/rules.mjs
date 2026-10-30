// Render-independent rules: no engine dependencies.
export const WORLD = 330;
export const LANDMARKS = Object.freeze({
  camp: {x:-95,z:-76,r:13},
  cabin: {x:-48,z:-37,r:10},
  cottage: {x:-7,z:11,r:10},
  farmhouse: {x:39,z:-23,r:11},
  garage: {x:54,z:59,r:11}
});
const rawHeight = (x,z) =>
  2.0*Math.sin(x*.023)*Math.cos(z*.024)+
  1.7*Math.sin(x*.012+z*.017)+
  .68*Math.sin(x*.074+z*.039)*Math.cos(z*.065);
const ease = (a,b,x) => {
  const t=Math.max(0,Math.min(1,(x-a)/(b-a)));
  return t*t*(3-2*t);
};
export function groundHeight(x,z) {
  let y=rawHeight(x,z);
  for (const area of Object.values(LANDMARKS)) {
    const d=Math.hypot(x-area.x,z-area.z);
    const influence=1-ease(area.r*.6,area.r*1.55,d);
    y=y*(1-influence)+rawHeight(area.x,area.z)*influence;
  }
  return y;
}
export function collision(x,z,boxes=[],trees=[],radius=.5,height=0) {
  if(Math.abs(x)>WORLD/2-3||Math.abs(z)>WORLD/2-3)return true;
  for(const b of boxes){
    if(Number.isFinite(b.top)&&height>=b.top+.03)continue;
    const px=Math.max(b.minX,Math.min(x,b.maxX));
    const pz=Math.max(b.minZ,Math.min(z,b.maxZ));
    if((x-px)**2+(z-pz)**2<radius**2)return true;
  }
  for(const t of trees)if(Math.hypot(x-t.x,z-t.z)<radius+t.r)return true;
  return false;
}
export function movePoint(pos,dx,dz,boxes,trees,height=0) {
  let x=pos.x,z=pos.z;
  if(!collision(x+dx,z,boxes,trees,.5,height))x+=dx;
  if(!collision(x,z+dz,boxes,trees,.5,height))z+=dz;
  return {x,z};
}
export function initialQuest(){return {started:false,collected:0,finished:false,credits:0};}
export function questStage(q){
  return q.finished?'finished':!q.started?'unknown':q.collected>=2?'return':'collect';
}
export function beginQuest(q){return {...q,started:true};}
export function collectCase(q){return {...q,collected:Math.min(2,q.collected+1)};}
export function finishQuest(q){
  if(!q.started||q.collected<2||q.finished)return q;
  return {...q,finished:true,credits:q.credits+20};
}
export function revealNearby(visited, x, z, grid=36) {
  const cell=WORLD/grid;
  const ix=Math.floor((x+WORLD/2)/cell);
  const iz=Math.floor((z+WORLD/2)/cell);
  let changed=false;
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++){
    if(Math.hypot(dx,dz)>2.25)continue;
    const col=ix+dx,row=iz+dz;
    if(col<0||col>=grid||row<0||row>=grid)continue;
    const key=row*grid+col;
    if(!visited.has(key)){visited.add(key);changed=true;}
  }
  return changed;
}
