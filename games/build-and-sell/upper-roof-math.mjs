
import {readRoof,roofPlan,changeRoof,changeRoofStyle,cleanRoofStyle} from "./roof-math.mjs";
import {upperReady} from "./upper-wall-math.mjs";
const state=w=>({cureAt:w?.cureAt,roof:w?.upperRoof,roofStyle:w?.upperRoofStyle});
export function upperRoofPlan(r,deck,walls,style="gable"){
 if(!deck)return null;
 const p=roofPlan(r,walls,style);
 return p?{...p,height:p.height+deck.height}:null;
}
export function readUpperRoof(w,r,deck,walls){
 const style=cleanRoofStyle(w?.upperRoofStyle);
 const p=deck?readRoof(state(w),r,walls):{roof:[]};
 return {upperRoof:p.roof,upperRoofStyle:style,upperRoofPlan:upperRoofPlan(r,deck,walls,style)};
}
export function changeUpperRoof(w,r,deck,walls,b,p,now){
 if(!upperReady(deck,p))return {error:"Stand on the active upper deck first"};
 if(!upperRoofPlan(r,deck,walls,cleanRoofStyle(w?.upperRoofStyle)))return {error:"Complete a rectangular equal-height upper wall perimeter"};
 if(b.operation==="style"){
  const next=changeRoofStyle(state(w),r,walls,b.style,p,now);
  return next.error?next:{upperRoofStyle:next.roofStyle};
 }
 if(b.operation!=="stage")return {error:"Invalid upper roof operation"};
 const next=changeRoof(state(w),r,walls,b.tile,b.kind,b.remove===true,p,now);
 return next.error?next:{upperRoof:next.roof};
}
