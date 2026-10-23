// BLACKOUT V0.9 — isolated, deterministic wooden barricade rules.
// Boards are independently damageable AND separately solid in the movement engine.
// A floor-level gap allows recon drones underneath intact wooden boards. 
// No arbitrary whole-door hit counter, and no changes to existing wall materials.
export const BARRICADE=Object.freeze({
 id:"door-station-01",x:-7,z:3,openingWidth:1.84,openingHeight:2.24,
 depth:.16,postWidth:.22,postHeight:2.58,boardCount:6,
 boardHeight:.255,firstCenter:.50,boardStep:.32,
 boardHP:2,installSeconds:2.2,interactRadius:2.6,
});
export function createBarricadeState(){
 return {boards:Array.from({length:BARRICADE.boardCount},()=>BARRICADE.boardHP),
  hits:0,broken:0,rebuilds:0,meleeHits:0};
}
export function boardBounds(index){
 if(!Number.isInteger(index)||index<0||index>=BARRICADE.boardCount)
  throw new RangeError("Invalid barricade board index");
 const center=BARRICADE.firstCenter+index*BARRICADE.boardStep;
 return {bottom:center-BARRICADE.boardHeight/2,
  top:center+BARRICADE.boardHeight/2,
  center};
}
export function barricadeDamage(state,index,points=1){
 if(!Number.isInteger(index)||index<0||index>=state.boards.length)
  return {state,changed:false,broken:false};
 if(state.boards[index]===0)return {state,changed:false,broken:false};
 const next={...state,boards:state.boards.slice()};
 const hp=Math.max(0,next.boards[index]-Math.max(0,Math.floor(points)));
 if(hp===next.boards[index])return {state,changed:false,broken:false};
 next.boards[index]=hp;
 next.hits++;
 const broken=hp===0;
 if(broken)next.broken++;
 return {state:next,changed:true,broken};
}
export function barricadeRebuild(state){
 if(state.boards.every(hp=>hp===BARRICADE.boardHP))return state;
 return {...state,boards:state.boards.map(()=>BARRICADE.boardHP),
  hits:0,broken:0,rebuilds:state.rebuilds+1,meleeHits:0};
}
export function barricadeBlockers(state){
 const b=BARRICADE,opening=b.openingWidth/2;
 const posts=[-1,1].map(side=>({
  id:b.id+"-frame-"+(side<0?"left":"right"),
  x:b.x+side*(opening+b.postWidth/2),z:b.z,
  width:b.postWidth,depth:b.depth+.12,height:b.postHeight,bottom:0
 }));
 const header={id:b.id+"-frame-header",x:b.x,z:b.z,
  width:b.openingWidth,depth:b.depth+.12,
  bottom:b.openingHeight,height:b.postHeight};
 const boards=[];
 state.boards.forEach((hp,i)=>{
  if(hp<=0)return;
  const bounds=boardBounds(i);
  boards.push({id:b.id+"-board-"+i,x:b.x,z:b.z,
    width:b.openingWidth,depth:b.depth,
    bottom:bounds.bottom,height:bounds.top});
 });
 return [...posts,header,...boards];
}
export function canInteractWithBarricade(player){
 const b=BARRICADE,dist=Math.hypot(player.x-b.x,player.z-b.z);
 if(dist>b.interactRadius)return false;
 // Refuse to rebuild over the character, which would trap them in solid boards.
 if(Math.abs(player.x-b.x)<b.openingWidth/2+.34 &&
    Math.abs(player.z-b.z)<b.depth/2+.34)return false;
 return true;
}
export function barricadeStatus(state){
 if(state.boards.every(v=>v===BARRICADE.boardHP))return "INTACT";
 if(state.boards.every(v=>v===0))return "OPEN";
 return "DAMAGED";
}

// Melee destroys the ENTIRE wood barricade after three close-range hits.
// Rifle fire remains independent per-board; this only applies to melee.
export const BARRICADE_MELEE_HITS=3;
export function barricadeMeleeDamage(state){
 if(state.boards.every(hp=>hp===0))
  return {state,handled:false,broken:false};
 const hits=Math.min(BARRICADE_MELEE_HITS,(state.meleeHits||0)+1);
 if(hits<BARRICADE_MELEE_HITS)
  return {state:{...state,meleeHits:hits},handled:true,broken:false,hits};
 const toBreak=state.boards.filter(hp=>hp>0).length;
 return {
  state:{...state,meleeHits:hits,boards:state.boards.map(()=>0),
   broken:state.broken+toBreak,hits:state.hits+toBreak},
  handled:true,broken:true,hits
 };
}
