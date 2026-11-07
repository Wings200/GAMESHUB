// W20.78: Haven Junction workshop construction. Pure rules and saved data;
// the browser is responsible for rendering, input and world collision lists.
import {addItem,countItem,spendMaterial} from './inventory.mjs';

export const HAVEN_BUILD_AREA=Object.freeze({minX:-55,maxX:-20,minZ:-35,maxZ:-7});
export const BUILD_LIMIT=120;
const component=key=>'material:'+key;
const part=(x,y,z,w,h,d,material,solid=false)=>
  Object.freeze({x,y,z,w,h,d,material,solid});

export const SETTLEMENT_BLUEPRINTS=Object.freeze([
  Object.freeze({id:'foundation',name:'Timber Foundation',category:'STRUCTURE',
    width:3,depth:3,cost:Object.freeze({[component('wood')]:5,[component('concrete')]:1}),
    parts:Object.freeze([
      part(0,.11,0,3,.22,3,'wood'),
      ...[-1.05,-.52,0,.52,1.05].map(x=>part(x,.24,0,.045,.025,3,'trim'))
    ])}),
  Object.freeze({id:'wall',name:'Scrap Wall',category:'STRUCTURE',
    width:3,depth:.28,cost:Object.freeze({[component('wood')]:4,[component('steel')]:2}),
    parts:Object.freeze([
      part(0,1.35,0,3,2.7,.2,'wood',true),
      part(-1.34,1.37,-.14,.14,2.74,.13,'steel'),
      part(1.34,1.37,-.14,.14,2.74,.13,'steel'),
      part(0,2.54,-.16,3.1,.14,.15,'trim')
    ])}),
  Object.freeze({id:'doorway',name:'Open Doorframe',category:'STRUCTURE',
    width:3,depth:.3,cost:Object.freeze({[component('wood')]:5,[component('steel')]:3}),
    parts:Object.freeze([
      part(-1.34,1.30,0,.3,2.6,.26,'wood',true),
      part(1.34,1.30,0,.3,2.6,.26,'wood',true),
      part(0,2.48,0,3,.38,.26,'steel',true),
      part(0,2.72,-.18,3.12,.12,.12,'trim')
    ])}),
  Object.freeze({id:'roof',name:'Corrugated Roof',category:'STRUCTURE',
    width:3.1,depth:3.1,cost:Object.freeze({[component('wood')]:4,[component('steel')]:2}),
    needsSupport:true,parts:Object.freeze([
      part(0,2.81,0,3.15,.22,3.15,'steel',true),
      ...[-1.1,-.55,0,.55,1.1].map(x=>part(x,2.95,0,.08,.08,3.18,'trim'))
    ])}),
  Object.freeze({id:'bed',name:'Settler Bed',category:'FURNITURE',
    width:1.3,depth:2.1,cost:Object.freeze({[component('steel')]:2,[component('cloth')]:4}),
    parts:Object.freeze([
      part(0,.28,0,1.28,.42,2.05,'steel',true),
      part(0,.52,.05,1.16,.15,1.65,'cloth'),
      part(0,.66,-.71,1.03,.14,.37,'pillow'),
      part(0,.75,-1,.09,.74,.12,'trim')
    ])}),
  Object.freeze({id:'barricade',name:'Defense Barricade',category:'DEFENSE',
    width:2.6,depth:.48,cost:Object.freeze({[component('steel')]:4,[component('wood')]:2}),
    parts:Object.freeze([
      part(0,.6,0,2.6,1.2,.42,'steel',true),
      part(0,.95,-.23,2.65,.16,.1,'trim'),
      part(0,.34,-.23,2.65,.15,.1,'trim')
    ])}),
  Object.freeze({id:'lantern',name:'Standing Lantern',category:'LIGHTING',
    width:.7,depth:.7,cost:Object.freeze({[component('steel')]:2,[component('copper')]:1,[component('glass')]:1}),
    parts:Object.freeze([
      part(0,.16,0,.60,.3,.60,'steel',true),
      part(0,1.15,0,.10,1.9,.10,'steel',true),
      part(0,2.13,0,.36,.46,.36,'glass'),
      part(0,2.42,0,.48,.16,.48,'trim')
    ])})
]);
export const SETTLEMENT_BY_ID=Object.freeze(Object.fromEntries(
  SETTLEMENT_BLUEPRINTS.map(plan=>[plan.id,plan])));
const finite=Number.isFinite;
const rotateQuarter=(x,z,rotation)=>{
  switch(((rotation%4)+4)%4){
    case 1:return {x:z,z:-x};
    case 2:return {x:-x,z:-z};
    case 3:return {x:-z,z:x};
    default:return {x,z};
  }
};
export function snappedBuildPosition(x,z,snap=true){
  return {x:snap?Math.round(x*2)/2:x,z:snap?Math.round(z*2)/2:z};
}
export function buildWorldBoxes(placement,{onlySolid=false}={}){
  const plan=SETTLEMENT_BY_ID[placement?.type];
  if(!plan)return [];
  const rotated=placement.rotation%2!==0;
  return plan.parts.filter(piece=>!onlySolid||piece.solid).map(piece=>{
    const p=rotateQuarter(piece.x,piece.z,placement.rotation);
    const w=rotated?piece.d:piece.w,d=rotated?piece.w:piece.d;
    return {minX:placement.x+p.x-w/2,maxX:placement.x+p.x+w/2,
      minZ:placement.z+p.z-d/2,maxZ:placement.z+p.z+d/2,
      bottom:piece.y-piece.h/2,top:piece.y+piece.h/2};
  });
}
function overlaps(a,b){
  const bottom=finite(b.bottom)?b.bottom:0;
  const top=finite(b.top)?b.top:finite(b.height)?bottom+b.height:Infinity;
  return a.minX<b.maxX-.025&&a.maxX>b.minX+.025&&
    a.minZ<b.maxZ-.025&&a.maxZ>b.minZ+.025&&
    a.bottom<top-.025&&a.top>bottom+.025;
}
export function initialSettlementBuildState(){return {version:1,nextId:1,snap:true,structures:[]};}
export function safeSettlementBuildSnapshot(raw){
  const state=initialSettlementBuildState();
  if(!raw||typeof raw!=='object')return state;
  state.snap=raw.snap!==false;
  if(!Array.isArray(raw.structures))return state;
  const seen=new Set();
  for(const item of raw.structures.slice(0,BUILD_LIMIT)){
    if(!item||!SETTLEMENT_BY_ID[item.type]||!finite(item.x)||!finite(item.z)||
      !Number.isInteger(item.rotation)||!Number.isInteger(item.id)||item.id<1||
      seen.has(item.id))continue;
    const placement={id:item.id,type:item.type,x:item.x,z:item.z,
      rotation:((item.rotation%4)+4)%4};
    if(!isWithinHavenBuildArea(placement)||
      validateBuildPlacement(state,placement).ok===false)continue;
    state.structures.push(placement);seen.add(placement.id);
  }
  state.nextId=Math.max(1,...state.structures.map(s=>s.id+1));
  return state;
}
export function isWithinHavenBuildArea(placement){
  const plan=SETTLEMENT_BY_ID[placement?.type];
  if(!plan)return false;
  const swap=placement.rotation%2!==0;
  const w=swap?plan.depth:plan.width,d=swap?plan.width:plan.depth;
  return placement.x-w/2>=HAVEN_BUILD_AREA.minX&&
    placement.x+w/2<=HAVEN_BUILD_AREA.maxX&&
    placement.z-d/2>=HAVEN_BUILD_AREA.minZ&&
    placement.z+d/2<=HAVEN_BUILD_AREA.maxZ;
}
export function validateBuildPlacement(state,placement,staticObstacles=[],player=null){
  const plan=SETTLEMENT_BY_ID[placement?.type];
  if(!plan||!finite(placement.x)||!finite(placement.z)||
    !Number.isInteger(placement.rotation))return {ok:false,reason:'UNKNOWN BLUEPRINT'};
  if(!isWithinHavenBuildArea(placement))return {ok:false,reason:'OUTSIDE HAVEN BUILD AREA'};
  if(state.structures.length>=BUILD_LIMIT)return {ok:false,reason:'SETTLEMENT BUILD LIMIT REACHED'};
  if(placement.type==='foundation'){
    const floor=buildWorldBoxes(placement)[0];
    if(state.structures.some(s=>s.type==='foundation'&&
      overlaps(floor,buildWorldBoxes(s)[0])))
      return {ok:false,reason:'FOUNDATION ALREADY OCCUPIES THIS SPACE'};
  }
  if(plan.needsSupport&&!state.structures.some(s=>
    (s.type==='wall'||s.type==='doorway')&&
    Math.hypot(s.x-placement.x,s.z-placement.z)<2.6))
    return {ok:false,reason:'ROOF NEEDS A NEARBY WALL OR DOORFRAME'};
  const solids=buildWorldBoxes(placement,{onlySolid:true});
  const occupied=[...staticObstacles,...state.structures.flatMap(s=>
    buildWorldBoxes(s,{onlySolid:true}))];
  if(solids.some(a=>occupied.some(b=>overlaps(a,b))))
    return {ok:false,reason:'STRUCTURE WOULD OVERLAP AN OBSTACLE'};
  if(player&&solids.some(b=>b.bottom<1.9&&b.top>.3&&
    player.x>b.minX-.4&&player.x<b.maxX+.4&&
    player.z>b.minZ-.4&&player.z<b.maxZ+.4))
    return {ok:false,reason:'MOVE OUT OF THE PLACEMENT AREA'};
  return {ok:true};
}
export function missingBuildingMaterials(backpack,type){
  const plan=SETTLEMENT_BY_ID[type];
  return plan?Object.entries(plan.cost).filter(([id,amount])=>
    countItem(backpack,id)<amount).map(([id,amount])=>({
    id,needed:amount,owned:countItem(backpack,id)})):[];
}
export function placeSettlementStructure(state,backpack,placement,staticObstacles=[],player=null){
  const result=validateBuildPlacement(state,placement,staticObstacles,player);
  if(!result.ok)return result;
  const missing=missingBuildingMaterials(backpack,placement.type);
  if(missing.length)return {ok:false,reason:'NOT ENOUGH SALVAGED MATERIALS',missing};
  const plan=SETTLEMENT_BY_ID[placement.type];
  for(const [id,amount] of Object.entries(plan.cost))spendMaterial(backpack,id,amount);
  const saved={id:state.nextId++,type:placement.type,x:placement.x,
    z:placement.z,rotation:placement.rotation};
  state.structures.push(saved);
  return {ok:true,structure:saved};
}
export function storeSettlementStructure(state,backpack,id){
  const index=state.structures.findIndex(s=>s.id===id);
  if(index<0)return {ok:false,reason:'NO SETTLEMENT STRUCTURE SELECTED'};
  const last=state.structures[index];
  const remaining=state.structures.filter(s=>s.id!==id);
  if((last.type==='wall'||last.type==='doorway')&&remaining.some(roof=>
    roof.type==='roof'&&!remaining.some(s=>
      (s.type==='wall'||s.type==='doorway')&&
      Math.hypot(s.x-roof.x,s.z-roof.z)<2.6)))
    return {ok:false,reason:'STORE THE UNSUPPORTED ROOF FIRST'};
  state.structures.splice(index,1);
  for(const [id,amount] of Object.entries(SETTLEMENT_BY_ID[last.type].cost))
    addItem(backpack,id,amount);
  return {ok:true,structure:last};
}
export function undoLastSettlementStructure(state,backpack){
  if(!state.structures.length)return {ok:false,
    reason:'NO SETTLEMENT STRUCTURES TO UNDO'};
  return storeSettlementStructure(state,backpack,
    state.structures[state.structures.length-1].id);
}
