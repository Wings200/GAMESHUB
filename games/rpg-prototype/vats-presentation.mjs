// W20.94: Pure projected target layout for the real-time tactical HUD.
// The scene remains authoritative: the HUD only visualizes actual hitboxes.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function vatsScreenPoint(projected){
  if(!projected||![projected.x,projected.y,projected.z].every(Number.isFinite))
    return null;
  if(Math.abs(projected.x)>1||Math.abs(projected.y)>1||
    projected.z< -1||projected.z>1)return null;
  return {left:(projected.x+1)*50,top:(1-projected.y)*50};
}

export function vatsTargetFrame(points,padding=2){
  const visible=(Array.isArray(points)?points:[]).filter(point=>point&&
    Number.isFinite(point.left)&&Number.isFinite(point.top)&&
    point.left>=0&&point.left<=100&&point.top>=0&&point.top<=100);
  if(!visible.length)return null;
  const xs=visible.map(p=>p.left),ys=visible.map(p=>p.top);
  const margin=clamp(Number.isFinite(padding)?padding:2,0,10);
  const minX=Math.min(...xs),maxX=Math.max(...xs);
  const minY=Math.min(...ys),maxY=Math.max(...ys);
  const width=clamp(Math.max(8,maxX-minX+margin*2),8,96);
  const height=clamp(Math.max(17,maxY-minY+margin*2),17,96);
  const centerX=(minX+maxX)/2,centerY=(minY+maxY)/2;
  return {left:clamp(centerX-width/2,2,98-width),
    top:clamp(centerY-height/2,2,98-height),width,height};
}

export function vatsHealthPercent(health,maxHealth){
  if(!Number.isFinite(health)||!Number.isFinite(maxHealth)||maxHealth<=0)
    return 0;
  return Math.round(clamp(health/maxHealth,0,1)*100);
}
