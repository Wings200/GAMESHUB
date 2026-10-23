// BLACKOUT V0.26.0 · original two-story house graybox.
// One source of truth for 3D walls, full-body physics, and the minimap.
// World Y values are absolute tops (matching physics.canOccupy).
export const HOUSE=Object.freeze({
 minX:-10,maxX:10,minZ:-20,maxZ:-2,
 floorHeight:3.2,wallHeight:3.08,
 stairs:Object.freeze({minX:.25,maxX:1.85,minZ:-12,maxZ:-5}),
 attackerSpawn:Object.freeze({x:0,z:8,yaw:0}),
 defenderSpawn:Object.freeze({x:-.9,z:-15.4,yaw:Math.PI})
});

const blocks=[];
let serial=0;
function piece(kind,x,z,width,depth,bottom,top,material="plaster"){
 if(width<=.01||depth<=.01||top<=bottom)return;
 blocks.push(Object.freeze({id:"house-"+(++serial),kind,material,
  x,z,width,depth,bottom,height:top}));
}
// Wall openings have real gaps. Door lintels are above player head level;
// windows have collidable sills and headers, not fake painted-on rectangles.
function wall(axis,where,start,end,level,openings=[],material="plaster"){
 const alongX=axis==="x",base=level*HOUSE.floorHeight;
 const thickness=material==="exterior"?.32:.20;
 const sorted=openings.map(o=>({...o,start:o.center-o.width/2,
  end:o.center+o.width/2})).sort((a,b)=>a.start-b.start);
 let cursor=start;
 function span(a,b,bottom,top,kind="wall"){
  if(b-a<.025)return;
  piece(kind,alongX?(a+b)/2:where,alongX?where:(a+b)/2,
   alongX?b-a:thickness,alongX?thickness:b-a,
   base+bottom,base+top,material);
 }
 for(const opening of sorted){
  const a=Math.max(cursor,Math.max(start,opening.start));
  const b=Math.min(end,opening.end);
  if(b<=a)continue;
  span(cursor,a,0,HOUSE.wallHeight);
  if(opening.kind==="window"){
   span(a,b,0,1.03,"window-sill");
   span(a,b,2.20,HOUSE.wallHeight,"window-lintel");
  }else if(opening.kind==="drone"){
   // Real under-wall opening: recon drone fits; standing operators do not.
   span(a,b,.44,HOUSE.wallHeight,"drone-lintel");
  }else span(a,b,2.30,HOUSE.wallHeight,"door-lintel");
  cursor=b;
 }
 span(cursor,end,0,HOUSE.wallHeight);
}
const door=(center,width=1.86)=>({center,width,kind:"door"});
const windowAt=(center,width=2.1)=>({center,width,kind:"window"});
const droneAt=(center,width=.90)=>({center,width,kind:"drone"});

for(const level of [0,1]){
 // Exterior: a proper front entrance, back exit, side service doors,
 // sightline windows, and load-bearing corners on both floors.
 wall("x",HOUSE.minZ,-10,10,level,
  level?[windowAt(-6),windowAt(6)]:[door(0,2.5),windowAt(-6),windowAt(6)],"exterior");
 wall("x",HOUSE.maxZ,-10,10,level,
  level?[windowAt(-6),windowAt(6)]:[door(0,2.6),windowAt(-6),windowAt(6)],"exterior");
 wall("z",HOUSE.minX,-20,-2,level,
  level?[windowAt(-16),windowAt(-6)]:[door(-16,1.95),droneAt(-12.6),windowAt(-6)],"exterior");
 wall("z",HOUSE.maxX,-20,-2,level,
  level?[windowAt(-16),windowAt(-6)]:[door(-16,1.95),droneAt(-12.6),windowAt(-6)],"exterior");
 // A full-length central corridor is the circulation spine. Four accessible
 // side doors connect rooms to it, plus inter-room paths for flanks.
 wall("z",-2,-20,-2,level,level?[door(-16),door(-9),door(-4.8)]:[door(-16),droneAt(-12.6),door(-9),door(-4.8)]);
 wall("z",2,-20,-2,level,level?[door(-16),door(-9),door(-4.8)]:[door(-16),droneAt(-12.6),door(-9),door(-4.8)]);
 if(level===0){
  wall("x",-10,-10,-2,level,[door(-6)]);
  wall("x",-10,2,10,level,[door(6)]);
  wall("x",-6,-10,-2,level,[door(-6)]);
  wall("x",-6,2,10,level,[door(6)]);
 }else{
  wall("x",-12,-10,-2,level,[door(-6)]);
  wall("x",-12,2,10,level,[door(6)]);
  wall("x",-7,-10,-2,level,[door(-6)]);
  wall("x",-7,2,10,level,[door(6)]);
 }
}

// Slab sectors preserve a continuous upstairs floor but expose a real
// 1.6 x 7m stairwell. The ground floor is supplied by the existing arena.
const levelY=HOUSE.floorHeight;
piece("slab",-4.925,-11,10.15,18,levelY-.16,levelY,"floor");
piece("slab",5.925,-11,8.15,18,levelY-.16,levelY,"floor");
// End the upper landing slab .8m beyond the top stair. The collision radius
// must clear the slab until the player's feet have reached the full 3.2m.
piece("slab",1.05,-16.4,1.6,7.2,levelY-.16,levelY,"floor");
piece("slab",1.05,-3.5,1.6,3,levelY-.16,levelY,"floor");
// Upper roof: sturdy overhead cover with a ceiling visible from the bedroom.
piece("roof",0,-11,20.5,18.5,levelY+2.95,levelY+3.22,"roof");

// Simple collidable furnishings make the rooms recognizable without filling
// the bomb zones or blocking the intended circulation routes.
const furniture=[
 [-7.6,-3.4,2.4,.85,.75,0,"sofa"],[-5.8,-8.4,1.3,.9,.8,0,"table"],
 [-8.2,-17.4,1.4,.65,.95,0,"shelf"],[8.0,-3.6,1.3,1.1,.82,0,"desk"],
 [8.0,-8.0,1.4,.8,.85,0,"counter"],[8.1,-17.5,1.4,.75,.85,0,"crate"],
 [-7.1,-16.2,2.3,2.0,.66,1,"bed"],[-7.7,-9.5,1.1,.6,.90,1,"sink"],
 [-7.3,-3.8,1.7,.8,.78,1,"table"],[7.0,-16.8,2.2,1.95,.65,1,"bed"],
 [7.8,-9.4,1.45,.75,.84,1,"desk"],[7.5,-4,1.8,.8,.74,1,"sofa"]
];
for(const [x,z,width,depth,h,level,material] of furniture){
 const base=level*levelY;
 piece("furniture",x,z,width,depth,base,base+h,material);
}

export const HOUSE_BLOCKERS=Object.freeze(blocks);
export function houseFloorAt(x,z,currentY=0){
 const s=HOUSE.stairs;
 if(x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ)
  return HOUSE.floorHeight*(s.maxZ-z)/(s.maxZ-s.minZ);
 const inside=x>=HOUSE.minX&&x<=HOUSE.maxX&&
  z>=HOUSE.minZ&&z<=HOUSE.maxZ;
 // Do not snap a player sideways onto 2F from halfway up the stairs.
 return inside&&currentY>HOUSE.floorHeight*.88?HOUSE.floorHeight:0;
}
export function houseRoomAt(player){
 const x=player?.x??0,z=player?.z??0;
 if(x<HOUSE.minX||x>HOUSE.maxX||z<HOUSE.minZ||z>HOUSE.maxZ)
  return "OUTSIDE · HOUSE";
 if(x>=HOUSE.stairs.minX&&x<=HOUSE.stairs.maxX&&
    z>=HOUSE.stairs.minZ&&z<=HOUSE.stairs.maxZ)return "CENTRAL STAIRCASE";
 const upper=(player?.y??0)>HOUSE.floorHeight*.52;
 if(x>-2&&x<2)return upper?"2F LANDING":"1F MAIN HALL";
 const side=x<0?"WEST":"EAST";
 if(upper)return side+" · "+(z<-12?"BEDROOM":z<-7?"BATH / STUDY":"GUEST ROOM");
 if(z<-10)return side+" · BOMB ROOM";
 return side+" · "+(z<-6?"DINING / GARAGE":"LIVING AREA");
}

export function drawHouseMinimap(ctx,player){
 if(!ctx)return;
 const w=ctx.canvas.width,h=ctx.canvas.height;
 const tx=x=>(x+30)/60*w,tz=z=>(z+30)/60*h;
 const upper=(player?.y??0)>HOUSE.floorHeight*.52;
 ctx.clearRect(0,0,w,h);
 ctx.fillStyle="#0b1a28";ctx.fillRect(0,0,w,h);
 ctx.fillStyle=upper?"#283f54":"#1f3d42";
 ctx.fillRect(tx(-10),tz(-20),tx(10)-tx(-10),tz(-2)-tz(-20));
 for(const b of HOUSE_BLOCKERS){
  if(b.kind==="furniture"||b.kind==="roof"||b.kind==="slab")continue;
  if(upper?b.bottom<HOUSE.floorHeight:b.bottom>=HOUSE.floorHeight)continue;
  ctx.fillStyle=b.kind.startsWith("window")?"#61b7c7":"#b3cbd0";
  ctx.fillRect(tx(b.x-b.width/2),tz(b.z-b.depth/2),
   Math.max(1,b.width/60*w),Math.max(1,b.depth/60*h));
 }
 ctx.fillStyle="#ffc476";ctx.font="bold 11px Arial";ctx.textAlign="left";
 ctx.fillText(upper?"2F · HOUSE":"1F · HOUSE",8,15);
 if(player){
  ctx.save();ctx.translate(tx(player.x),tz(player.z));ctx.rotate(player.yaw||0);
  ctx.fillStyle="#e8fffa";ctx.beginPath();
  ctx.moveTo(0,-7);ctx.lineTo(-4,5);ctx.lineTo(4,5);ctx.closePath();ctx.fill();
  ctx.restore();
 }
}
