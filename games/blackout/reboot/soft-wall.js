// BLACKOUT V0.10 · destructible drywall geometry/physics, independently testable.
// A single shot carves a 12cm opening. Removed cells are genuinely absent from
// both the THREE hit-scan instances and the physical wall collision spans.
// There is NO cumulative "wall HP" or arbitrary full-wall disappearance.
export const SOFT_WALL=Object.freeze({
 id:"soft-wall-station-01",x:7,z:3,
 columns:32,rows:20,cell:.12,depth:.15,
 postWidth:.16,postHeight:2.65,interactRadius:4,
});
export const SOFT_WALL_TOTAL=SOFT_WALL.columns*SOFT_WALL.rows;
export function newSoftWall(){
 return {solid:Array(SOFT_WALL_TOTAL).fill(1),removed:0,shots:0};
}
export function softWallIndex(column,row){
 if(!Number.isInteger(column)||!Number.isInteger(row)||
    column<0||column>=SOFT_WALL.columns||row<0||row>=SOFT_WALL.rows)return -1;
 return row*SOFT_WALL.columns+column;
}
export function softWallCell(index){
 if(!Number.isInteger(index)||index<0||index>=SOFT_WALL_TOTAL)return null;
 return {column:index%SOFT_WALL.columns,
  row:Math.floor(index/SOFT_WALL.columns)};
}
export function softWallWorld(index){
 const cell=softWallCell(index);if(!cell)return null;
 const spec=SOFT_WALL;
 return {x:spec.x-spec.columns*spec.cell/2+(cell.column+.5)*spec.cell,
  y:(cell.row+.5)*spec.cell,z:spec.z};
}
export function softWallRemove(state,index){
 if(!softWallCell(index)||!state.solid[index])return {state,removed:false};
 const solid=state.solid.slice();solid[index]=0;
 return {state:{solid,removed:state.removed+1,shots:state.shots+1},
  removed:true,index};
}
// Hard breach replaces only the gypsum cells inside the steel vault window,
// never the whole wall. Uses the SAME immutable cell state as hits/physics.
export function softWallBreachWindow(state,window){
 if(!state?.solid||!window||
  ![window.left,window.right,window.bottom,window.top].every(Number.isFinite)||
  window.right<=window.left||window.top<=window.bottom)
  return {state,removed:0};
 let current=state,removed=0;
 for(let i=0;i<SOFT_WALL_TOTAL;i++){
  if(!current.solid[i])continue;
  const p=softWallWorld(i),half=SOFT_WALL.cell/2;
  if(p.x+half<=window.left||p.x-half>=window.right||
     p.y+half<=window.bottom||p.y-half>=window.top)continue;
  const result=softWallRemove(current,i);
  if(result.removed){current=result.state;removed++;}
 }
 return {state:current,removed};
}
export function softWallReset(state){
 if(state.removed===0)return state;
 return newSoftWall();
}
export function softWallFrame(){
 const s=SOFT_WALL,half=s.columns*s.cell/2;
 const yTop=s.rows*s.cell;
 return [
  {id:s.id+"-post-left",x:s.x-half-s.postWidth/2,z:s.z,
   width:s.postWidth,depth:s.depth+.12,bottom:0,height:s.postHeight},
  {id:s.id+"-post-right",x:s.x+half+s.postWidth/2,z:s.z,
   width:s.postWidth,depth:s.depth+.12,bottom:0,height:s.postHeight},
  {id:s.id+"-beam",x:s.x,z:s.z,width:s.columns*s.cell,
   depth:s.depth+.12,bottom:yTop,height:s.postHeight},
 ];
}
export function softWallBlockers(state){
 const s=SOFT_WALL,out=softWallFrame();
 for(let row=0;row<s.rows;row++){
  let start=-1;
  for(let c=0;c<=s.columns;c++){
   const filled=c<s.columns&&Boolean(state.solid[softWallIndex(c,row)]);
   if(filled&&start<0)start=c;
   if(!filled&&start>=0){
    const count=c-start;
    out.push({
     id:s.id+"-strip-"+row+"-"+start,
     x:s.x-s.columns*s.cell/2+(start+count/2)*s.cell,z:s.z,
     width:count*s.cell,depth:s.depth,
     bottom:row*s.cell,height:(row+1)*s.cell
    });
    start=-1;
   }
  }
 }
 return out;
}
export function canResetSoftWall(player){
 const s=SOFT_WALL,halfWidth=s.columns*s.cell/2;
 // Restoring drywall through the player would trap them. Require the player to
 // stand safely clear of its plane (or outside its lateral extent).
 return Math.abs(player.z-s.z)>s.depth/2+.37||
  Math.abs(player.x-s.x)>halfWidth+.37;
}
export function softWallStatus(state){
 if(state.removed===0)return "INTACT";
 if(state.removed===SOFT_WALL_TOTAL)return "EMPTY";
 return "PENETRATED";
}
