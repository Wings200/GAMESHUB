
import {tileAt,tileBounds} from "./terrain.mjs";
import {readFloor,changeFloor,FLOOR_TYPES} from "./floor-math.mjs";
import {readFurnish,changeFurniture,checkFurniture,footprint,furnishSpec} from "./furniture-math.mjs";
import {upperReady} from "./upper-wall-math.mjs";
const overlaps=(a,b)=>!!a&&!!b&&a.x1<b.x2-.001&&a.x2>b.x1+.001&&a.z1<b.z2-.001&&a.z2>b.z1+.001;
export function floorPieces(b,h){
 if(!b)return [];
 if(!overlaps(b,h))return [b];
 const a=Math.max(b.x1,h.x1),c=Math.min(b.x2,h.x2),d=Math.max(b.z1,h.z1),e=Math.min(b.z2,h.z2);
 return [{...b,x2:a},{...b,x1:c},{x1:a,x2:c,z1:b.z1,z2:d},{x1:a,x2:c,z1:e,z2:b.z2}].filter(q=>q.x2-q.x1>.001&&q.z2-q.z1>.001);
}
export function upperTiles(deck){
 const ids=[];if(!deck)return ids;
 for(let z=0;z<Math.ceil(deck.z2-deck.z1);z++)for(let x=0;x<Math.ceil(deck.x2-deck.x1);x++){const id=z*48+x;if(floorPieces(tileBounds(deck,id),deck.hole).length)ids.push(id);}
 return ids;
}
export function upperFloorTarget(deck,x,z){
 if(!deck||x>=deck.hole.x1&&x<deck.hole.x2&&z>=deck.hole.z1&&z<deck.hole.z2)return null;
 return tileAt(deck,x,z);
}
export function landing(deck){const b={...deck.hole};if(deck.sign>0)b[deck.axis+"2"]+=.65;else b[deck.axis+"1"]-=.65;return b;}
export function readUpperInterior(w,deck){
 if(!deck)return {upperFlooring:[],upperFurniture:[]};
 const allowed=new Set(upperTiles(deck));
 return {upperFlooring:readFloor({flooring:w?.upperFlooring},deck).flooring.filter(f=>allowed.has(f.tile)),upperFurniture:readFurnish({furniture:w?.upperFurniture},deck).furniture.filter(f=>!overlaps(footprint(f),landing(deck)))};
}
export function checkUpperFurniture(deck,rows,walls,f,p,flooring){
 if(!upperReady(deck,p))return "Stand on the active upper deck first";
 if(overlaps(footprint(f||{}),landing(deck)))return "Keep stairwell and landing clear";
 return checkFurniture(deck,rows,walls,f,p,flooring);
}
export function changeUpperInterior(w,deck,walls,b,p,now,id){
 if(!upperReady(deck,p))return {error:"Stand on the active upper deck first"};
 const f=readUpperInterior(w,deck),tiles=upperTiles(deck),state={cureAt:w.cureAt,screeded:tiles,flooring:f.upperFlooring,furniture:f.upperFurniture};
 if(b.job==="floor"){
  if(!tiles.includes(b.tile))return {error:"Choose a deck square outside the stairwell"};
  if(b.remove===true&&f.upperFurniture.some(v=>overlaps(footprint(v),tileBounds(deck,b.tile))))return {error:"Remove furniture before flooring"};
  const next=changeFloor(state,deck,b.tile,b.kind,b.remove===true,p,now);
  return next.error?next:{upperFlooring:next.flooring,cost:b.remove===true?{}:{[FLOOR_TYPES.find(v=>v.id===b.kind).stock]:1}};
 }
 if(b.job==="furniture"){
  if(b.operation==="add"&&overlaps(footprint(b),landing(deck)))return {error:"Keep stairwell and landing clear"};
  const next=changeFurniture(state,deck,walls,b,p,now,id);
  if(next.error)return next;
  if(next.furniture.some(v=>overlaps(footprint(v),landing(deck))))return {error:"Keep stairwell and landing clear"};
  return {upperFurniture:next.furniture,returned:next.returned,cost:b.operation==="add"?{[furnishSpec(b.kind).stock]:1}:{}};
 }
 return {error:"Invalid upper interior job"};
}
