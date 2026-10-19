// BLACKOUT Dev Map Studio V1 — stable, portable authored-map contract.
// All coordinates are in metres, Y is height. A/B are paired bomb sites.
export const MAP_FORMAT="blackout-editor-v1";
export const PART_TYPES=Object.freeze({
  floor:{name:"Floor / slab",size:[8,.28,8],color:0x566776},
  ceiling:{name:"Ceiling",size:[8,.25,8],color:0x3d4c5b},
  hardWall:{name:"Hard wall",size:[4,3.4,.3],color:0x68747e},
  softWall:{name:"Soft / reinforceable wall",size:[3.1,3,.2],color:0xb6a28d},
  reinforcedWall:{name:"Reinforced steel wall",size:[3.1,3,.25],color:0x57758b},
  door:{name:"Door opening / barricadable",size:[2.5,3.4,.36],color:0xd9a459},
  window:{name:"Window / barricadable",size:[2.3,2.0,.3],color:0x66b7d5},
  stairs:{name:"Walkable staircase",size:[3,4,7],color:0xb1b6ba},
  cover:{name:"Crate / cover",size:[2,1.4,2],color:0x95856c},
  railing:{name:"Safety railing",size:[4,1.05,.14],color:0xeab65d},
  attackerSpawn:{name:"Attacker spawn",size:[1,.12,1],color:0x5faefa},
  defenderSpawn:{name:"Defender spawn",size:[1,.12,1],color:0xffa168}
});
export const PART_KEYS=Object.freeze(Object.keys(PART_TYPES));
const num=(v,defaultValue,min,max)=>{
  const x=Number(v);
  return Number.isFinite(x)?Math.max(min,Math.min(max,x)):defaultValue;
};
const label=(v,max=64)=>String(v??"").replace(/[<>\x00-\x1F]/g,"").trim().slice(0,max);
const position=(p={})=>({
  x:num(p.x,0,-300,300),y:num(p.y,0,-12,90),z:num(p.z,0,-300,300)
});
export function createBlankMap(){
  return {
    format:MAP_FORMAT,
    name:"UNTITLED OPERATION",
    units:"meters",
    grid:1,
    elements:[{
      id:"floor-main",type:"floor",position:{x:0,y:0,z:0},
      size:{x:30,y:.25,z:30},rotationY:0
    }],
    sitePairs:[{
      id:"site-pair-1",name:"GROUND FLOOR",
      A:{x:-6,y:0,z:-5,plantRadius:4,defuseRange:2.25},
      B:{x:6,y:0,z:5,plantRadius:4,defuseRange:2.25}
    }],
    activeSitePair:"site-pair-1",
    notes:"Built with BLACKOUT Dev Map Studio. Bomb sites can be positioned independently."
  };
}
export function normalizeMap(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))
    throw Error("Map must be a JSON object.");
  if(raw.format!==MAP_FORMAT)
    throw Error("Unsupported map format. Expected "+MAP_FORMAT+".");
  if(!Array.isArray(raw.elements)||raw.elements.length>1200)
    throw Error("Map requires an elements array (maximum 1200).");
  if(!Array.isArray(raw.sitePairs)||raw.sitePairs.length<1||raw.sitePairs.length>12)
    throw Error("Include between 1 and 12 bomb-site pairs.");
  const ids=new Set();
  const elements=raw.elements.map((e,index)=>{
    if(!e||!Object.hasOwn(PART_TYPES,e.type))throw Error("Unknown piece at #"+(index+1));
    const id=label(e.id,56);
    if(!id||ids.has(id))throw Error("Map piece ID must be unique: "+id);
    ids.add(id);
    const def=PART_TYPES[e.type].size;
    return {
      id,type:e.type,position:position(e.position),
      size:{
        x:num(e.size?.x,def[0],.15,110),
        y:num(e.size?.y,def[1],.12,28),
        z:num(e.size?.z,def[2],.12,110)
      },
      rotationY:num(e.rotationY,0,-3600,3600),
      name:label(e.name,70)||PART_TYPES[e.type].name
    };
  });
  const pairIds=new Set();
  const sitePairs=raw.sitePairs.map((pair,i)=>{
    if(!pair||typeof pair!=="object")throw Error("Invalid bomb pair #"+(i+1));
    const id=label(pair.id,56);
    if(!id||pairIds.has(id))throw Error("Bomb pair IDs must be unique.");
    pairIds.add(id);
    const site=(key)=>{
      if(!pair[key]||typeof pair[key]!=="object")
        throw Error("Site "+key+" missing in "+id);
      return {
        ...position(pair[key]),
        plantRadius:num(pair[key].plantRadius,4,1,22),
        defuseRange:num(pair[key].defuseRange,2.25,.5,12)
      };
    };
    return {id,name:label(pair.name,75)||"BOMB PAIR "+(i+1),A:site("A"),B:site("B")};
  });
  const active=sitePairs.some(p=>p.id===raw.activeSitePair)?
    raw.activeSitePair:sitePairs[0].id;
  return {
    format:MAP_FORMAT,
    name:label(raw.name,80)||"UNTITLED OPERATION",
    units:"meters",
    grid:num(raw.grid,1,.25,4),
    elements,sitePairs,activeSitePair:active,
    notes:label(raw.notes,500)
  };
}
export function makePiece(type,x=0,y=0,z=0,id=""){
  if(!Object.hasOwn(PART_TYPES,type))throw Error("Unknown part: "+type);
  const [w,h,d]=PART_TYPES[type].size;
  return {id:id||"part-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7),
    type,position:{x,y,z},size:{x:w,y:h,z:d},rotationY:0,
    name:PART_TYPES[type].name};
}
// When a door/window is positioned on an aligned wall, remove the covered
// wall span and split the adjacent material into actual separate segments.
// This avoids the common "window painted on an unbroken concrete wall" bug.
export function cutOpeningInWall(elements,opening){
  if(!Array.isArray(elements)||!["door","window"].includes(opening.type))return false;
  const radians=opening.rotationY*Math.PI/180;
  const cos=Math.cos(radians),sin=Math.sin(radians);
  const allowable=["hardWall","softWall","reinforcedWall"];
  for(let i=elements.length-1;i>=0;i--){
    const wall=elements[i];
    if(!allowable.includes(wall.type))continue;
    const deltaAngle=Math.sin((wall.rotationY-opening.rotationY)*Math.PI/180);
    if(Math.abs(deltaAngle)>.035)continue;
    if(Math.abs(wall.position.y-opening.position.y)>.3)continue;
    const dx=opening.position.x-wall.position.x;
    const dz=opening.position.z-wall.position.z;
    const along=dx*cos-dz*sin,normal=dx*sin+dz*cos;
    if(Math.abs(normal)>.45+wall.size.z/2)continue;
    const limit=wall.size.x/2,half=opening.size.x/2;
    const left=Math.max(-limit,along-half);
    const right=Math.min(limit,along+half);
    if(right-left<Math.min(opening.size.x*.88,1.2))continue;
    if(left<-limit+.04&&right>limit-.04){
      elements.splice(i,1);
      return true;
    }
    const remaining=[];
    for(const [a,b,suffix] of [[-limit,left,"L"],[right,limit,"R"]]){
      if(b-a<.16)continue;
      const segment=JSON.parse(JSON.stringify(wall));
      const local=(a+b)/2;
      segment.id=wall.id+"-"+suffix+"-"+Math.random().toString(36).slice(2,7);
      segment.size.x=b-a;
      segment.position.x=wall.position.x+local*cos;
      segment.position.z=wall.position.z-local*sin;
      remaining.push(segment);
    }
    elements.splice(i,1,...remaining);
    return true;
  }
  return false;
}
export function mapAsJSON(map){
  return JSON.stringify(normalizeMap(map),null,2)+"\n";
}
export function siteBounds(site){
  const radius=num(site.plantRadius,4,1,22);
  return {minX:site.x-radius,maxX:site.x+radius,
    minZ:site.z-radius,maxZ:site.z+radius,y:site.y};
}
export function canPlantAt(site,player){
  return Math.hypot(player.x-site.x,player.z-site.z)<=site.plantRadius&&
    Math.abs(player.y-site.y)<=1.2;
}
export function canDefuseAt(site,defuser,player){
  return Math.hypot(player.x-defuser.x,player.z-defuser.z)<=site.defuseRange&&
    Math.abs(player.y-defuser.y)<=1.2;
}
