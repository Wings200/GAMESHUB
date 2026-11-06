// W20.55 — A real-coordinate exploration map for the RPG systems field.
// This module knows nothing about Three.js, combat, or the inventory.
export const FIELD_BOUNDS=Object.freeze({minX:-62,maxX:62,minZ:-53,maxZ:53});
export const MAP_CELL_SIZE=5;
export const MAP_REVEAL_RADIUS=13;

export function mapCell(x,z,bounds=FIELD_BOUNDS,size=MAP_CELL_SIZE){
  if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  if(x<bounds.minX||x>=bounds.maxX||z<bounds.minZ||z>=bounds.maxZ)return null;
  const cx=Math.floor((x-bounds.minX)/size);
  const cz=Math.floor((z-bounds.minZ)/size);
  const cols=Math.ceil((bounds.maxX-bounds.minX)/size);
  const rows=Math.ceil((bounds.maxZ-bounds.minZ)/size);
  if(cx<0||cz<0||cx>=cols||cz>=rows)return null;
  return {cx,cz,key:`${cx}:${cz}`};
}

export function revealMapCells(previous,x,z,radius=MAP_REVEAL_RADIUS,bounds=FIELD_BOUNDS){
  const discovered=new Set(previous);
  const size=MAP_CELL_SIZE;
  const minX=Math.max(bounds.minX,x-radius),maxX=Math.min(bounds.maxX,x+radius);
  const minZ=Math.max(bounds.minZ,z-radius),maxZ=Math.min(bounds.maxZ,z+radius);
  for(let px=minX;px<=maxX;px+=size/2){
    for(let pz=minZ;pz<=maxZ;pz+=size/2){
      if(Math.hypot(px-x,pz-z)>radius)continue;
      const cell=mapCell(px,pz,bounds,size);
      if(cell)discovered.add(cell.key);
    }
  }
  const center=mapCell(x,z,bounds,size);
  if(center)discovered.add(center.key);
  return discovered;
}

export function isMapDiscovered(discovered,x,z){
  const cell=mapCell(x,z);
  return Boolean(cell&&discovered.has(cell.key));
}

export function createFieldMap({canvas,points=[],storage=globalThis.localStorage}){
  if(!canvas||!canvas.getContext)throw new Error('Map canvas is required');
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Map 2D renderer unavailable');
  const key='rpg-field-map-discovery-v1';
  const waypointKey='rpg-field-map-waypoint-v1';
  const allowedKeys=/^\d{1,2}:\d{1,2}$/;
  let discovered=new Set(),waypoint=null;
  try{
    const saved=JSON.parse(storage?.getItem(key)||'[]');
    if(Array.isArray(saved))discovered=new Set(saved.filter(v=>typeof v==='string'&&allowedKeys.test(v)).slice(0,700));
    const savedWaypoint=JSON.parse(storage?.getItem(waypointKey)||'null');
    if(savedWaypoint&&Number.isFinite(savedWaypoint.x)&&Number.isFinite(savedWaypoint.z)&&
       mapCell(savedWaypoint.x,savedWaypoint.z))waypoint={x:savedWaypoint.x,z:savedWaypoint.z};
  }catch{ /* A corrupt or disabled browser store never blocks the game. */ }
  const normalizedPoints=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)&&mapCell(p.x,p.z));
  const state={x:0,z:0,yaw:0};
  let zoom=1,center={x:0,z:0};
  let dragging=false,dragMoved=false,startPointer=null;
  let onUpdate=()=>{};
  const W=canvas.width,H=canvas.height;
  function scale(){return Math.min((W-75)/(FIELD_BOUNDS.maxX-FIELD_BOUNDS.minX),
    (H-75)/(FIELD_BOUNDS.maxZ-FIELD_BOUNDS.minZ))*zoom;}
  function screen(x,z){const k=scale();return{x:W/2+(x-center.x)*k,y:H/2+(z-center.z)*k};}
  function world(sx,sy){const k=scale();return{x:center.x+(sx-W/2)/k,z:center.z+(sy-H/2)/k};}
  function pointer(event){const r=canvas.getBoundingClientRect();return{
    x:(event.clientX-r.left)*W/r.width,y:(event.clientY-r.top)*H/r.height};}
  function persist(name,value){try{storage?.setItem(name,JSON.stringify(value));}catch{}}
  function summary(){
    const total=Math.ceil((FIELD_BOUNDS.maxX-FIELD_BOUNDS.minX)/MAP_CELL_SIZE)*
      Math.ceil((FIELD_BOUNDS.maxZ-FIELD_BOUNDS.minZ)/MAP_CELL_SIZE);
    return{discovered:discovered.size,total,x:state.x,z:state.z,zoom,waypoint,
      distance:waypoint?Math.round(Math.hypot(waypoint.x-state.x,waypoint.z-state.z)):null};
  }
  function notify(){onUpdate(summary());}
  function observe(x,z,yaw=state.yaw){
    if(!Number.isFinite(x)||!Number.isFinite(z))return;
    state.x=x;state.z=z;state.yaw=Number.isFinite(yaw)?yaw:state.yaw;
    const next=revealMapCells(discovered,x,z);
    if(next.size!==discovered.size){discovered=next;persist(key,[...discovered]);notify();}
  }
  function setWaypoint(x,z){
    if(!mapCell(x,z)||!isMapDiscovered(discovered,x,z))return false;
    waypoint={x:Math.round(x*10)/10,z:Math.round(z*10)/10};
    persist(waypointKey,waypoint);notify();render();return true;
  }
  function clearWaypoint(){waypoint=null;persist(waypointKey,null);notify();render();}
  function setZoom(next){zoom=Math.max(.8,Math.min(3.5,next));notify();render();}
  function pointLabel(point){return String(point.label||point.id||'LOCATION').toUpperCase();}
  function render(){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#081714';ctx.fillRect(0,0,W,H);
    const tl=screen(FIELD_BOUNDS.minX,FIELD_BOUNDS.minZ);
    const br=screen(FIELD_BOUNDS.maxX,FIELD_BOUNDS.maxZ);
    ctx.save();ctx.beginPath();ctx.rect(tl.x,tl.y,br.x-tl.x,br.y-tl.y);ctx.clip();
    ctx.fillStyle='#182b28';ctx.fillRect(tl.x,tl.y,br.x-tl.x,br.y-tl.y);
    // Draw terrain only where the player has physically explored. The canvas
    // does not derive landmark positions from guesses or hidden NPC locations.
    for(const key of discovered){
      const [cx,cz]=key.split(':').map(Number);
      const x=FIELD_BOUNDS.minX+cx*MAP_CELL_SIZE;
      const z=FIELD_BOUNDS.minZ+cz*MAP_CELL_SIZE;
      const a=screen(x,z),b=screen(x+MAP_CELL_SIZE,z+MAP_CELL_SIZE);
      ctx.fillStyle=(cx+cz)%3===0?'#315047':'#29453d';
      ctx.fillRect(a.x,a.y,b.x-a.x+1,b.y-a.y+1);
      ctx.strokeStyle='#6e8a6b18';ctx.lineWidth=.6;
      ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
    }
    // Terrain grid and the real physical test-ground perimeter.
    ctx.strokeStyle='#a8c9a52d';ctx.lineWidth=1;
    for(let x=-60;x<=60;x+=10){const a=screen(x,FIELD_BOUNDS.minZ),b=screen(x,FIELD_BOUNDS.maxZ);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    for(let z=-50;z<=50;z+=10){const a=screen(FIELD_BOUNDS.minX,z),b=screen(FIELD_BOUNDS.maxX,z);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    ctx.strokeStyle='#b5bc91';ctx.lineWidth=2.5;
    ctx.strokeRect(tl.x,tl.y,br.x-tl.x,br.y-tl.y);
    ctx.font='700 12px system-ui, sans-serif';ctx.textBaseline='middle';
    for(const point of normalizedPoints){
      if(!isMapDiscovered(discovered,point.x,point.z))continue;
      const p=screen(point.x,point.z),station=point.type==='station';
      ctx.fillStyle=station?'#e9c78c':'#9bdfbc';
      ctx.strokeStyle='#071713';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(p.x,p.y,station?5:6,0,Math.PI*2);ctx.fill();ctx.stroke();
      if(zoom>=1.18||!station){
        const text=pointLabel(point);ctx.strokeStyle='#102420';ctx.lineWidth=4;
        ctx.strokeText(text,p.x+9,p.y-8);ctx.fillText(text,p.x+9,p.y-8);
      }
    }
    if(waypoint){
      const p=screen(waypoint.x,waypoint.z);
      ctx.strokeStyle='#f5b66d';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(p.x,p.y-12);ctx.lineTo(p.x+10,p.y);
      ctx.lineTo(p.x,p.y+12);ctx.lineTo(p.x-10,p.y);ctx.closePath();ctx.stroke();
    }
    const player=screen(state.x,state.z);
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(-state.yaw);
    ctx.fillStyle='#e6f4d0';ctx.strokeStyle='#0c201b';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(9,10);ctx.lineTo(0,6);
    ctx.lineTo(-9,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    ctx.restore();
    ctx.strokeStyle='#4d6e5e';ctx.lineWidth=2;ctx.strokeRect(1,1,W-2,H-2);
    ctx.font='800 12px ui-monospace,monospace';ctx.fillStyle='#b5d1b5';
    ctx.fillText('N',W-25,25);ctx.beginPath();ctx.moveTo(W-19,33);
    ctx.lineTo(W-25,41);ctx.lineTo(W-31,33);ctx.strokeStyle='#b5d1b5';ctx.stroke();
    notify();
  }
  canvas.addEventListener('pointerdown',e=>{
    const p=pointer(e);dragging=true;dragMoved=false;startPointer=p;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove',e=>{
    if(!dragging||!startPointer)return;
    const p=pointer(e),dx=p.x-startPointer.x,dy=p.y-startPointer.y;
    if(Math.hypot(dx,dy)>2)dragMoved=true;
    center.x-=dx/scale();center.z-=dy/scale();startPointer=p;render();
  });
  canvas.addEventListener('pointerup',e=>{
    if(!dragging)return;dragging=false;
    if(!dragMoved){const p=pointer(e),pos=world(p.x,p.y);setWaypoint(pos.x,pos.z);}
    startPointer=null;
  });
  canvas.addEventListener('pointercancel',()=>{dragging=false;startPointer=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom*(e.deltaY<0?1.15:1/1.15));},{passive:false});
  function centerOnPlayer(){center={x:state.x,z:state.z};render();}
  return{observe,render,setZoom,centerOnPlayer,clearWaypoint,summary,
    setWaypoint,isDiscovered:(x,z)=>isMapDiscovered(discovered,x,z),
    set onUpdate(fn){onUpdate=typeof fn==='function'?fn:()=>{};},
    get zoom(){return zoom;}};
}
