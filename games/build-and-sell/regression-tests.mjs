
import {roofPlan,roofTiles,changeRoof} from "./roof-math.mjs";
import {slabTotal} from "./concrete-math.mjs";
import {changeFloor} from "./floor-math.mjs";
import {changeFurniture,wallHitsFurniture} from "./furniture-math.mjs";
import {readEconomy,buyGoods,spendGoods,returnMaterial,inventoryValue} from "./economy.mjs";
import {inspectProperty} from "./inspection-math.mjs";
import {propertyOffer,settleSale,companyStats} from "./sale-math.mjs";
const assert=(ok,label)=>{if(!ok)throw new Error(label);};
export function runRegression(){
 const now=1000,layout={x1:0,x2:10,z1:0,z2:10},points=[{x:1,z:1},{x:5,z:1},{x:5,z:5},{x:1,z:5}],walls=points.map((a,i)=>({id:"w"+i,a,b:points[(i+1)%4],height:2.5,openings:[],sheathing:[],wrap:[],insulation:[],drywall:[]}));
 const empty={layout:null,walls:[],supply:{cold:[],hot:[],conduit:[]},risers:{cold:[],hot:[],drain:[],conduit:[]},pipes:[],fixtures:[],heaters:[],utility:{},devices:[],cables:[],outlets:[],panels:[]};
 const disconnected=inspectProperty({...empty,devices:[{id:"lamp",kind:"light"}],outlets:[{deviceId:"lamp",kind:"light",cableId:"missing"}]},now);assert(!disconnected.rows.find(v=>v.name==="Lighting available").passed,"Reject installed but nonfunctional light");
 const start=inspectProperty(empty,now);assert(!start.passed&&start.area===0&&Number.isFinite(start.score),"Empty world inspection");
 const plan=roofPlan(layout,walls),tiles=roofTiles(layout,plan);assert(plan&&tiles.length===16&&!roofPlan(layout,walls.slice(0,3)),"Roof enclosure");
 const slab=Array.from({length:slabTotal(layout)},(_,n)=>n%10+48*Math.floor(n/10));
 let world={foundationId:"first",cureAt:1,screeded:slab},p={x:2,z:2};
 assert(changeRoof(world,layout,walls,tiles[0],"deck",false,p,now).error,"Reject skipped roof stage");
 for(const kind of ["joist","rafter","deck","shingle","ceiling"]){const x=changeRoof(world,layout,walls,tiles[0],kind,false,p,now);assert(!x.error,"Roof stage "+kind);world={...world,...x};}
 assert(world.roof[0].stage===5,"Roof completed");
 assert(changeFloor({...world,cureAt:now+1},layout,tiles[0],"tile",false,p,now).error,"Reject uncured floor");
 const floor=changeFloor(world,layout,tiles[0],"tile",false,p,now);assert(!floor.error,"Install flooring");
 assert(changeFloor({...world,...floor},layout,tiles[0],"vinyl",false,p,now).error,"Reject overlapping floor");
 world.flooring=tiles.map(tile=>({tile,kind:"tile"}));
 const change={operation:"add",kind:"bed",x:3.5,z:3.5,rotation:0};
 const placed=changeFurniture(world,layout,walls,change,p,now,"bed");assert(!placed.error,"Furniture placement");
 assert(changeFurniture({...world,...placed},layout,walls,change,p,now,"bed2").error,"Reject overlapping furniture");
 assert(wallHitsFurniture({a:{x:1,z:3.5},b:{x:5,z:3.5}},placed.furniture),"Reject new wall intersecting furniture");
 world.economy=buyGoods(world,"furn_bed",1).economy;assert(world.economy.cash===24650&&inventoryValue(world.economy)===350,"Buy shared stock");
 world.economy=spendGoods(world,{furn_bed:1}).economy;assert(world.economy.projectCosts.first===35000,"Record installed cost");assert(spendGoods(world,{furn_bed:1}).error,"Insufficient stock");
 assert(returnMaterial(world.economy,world,"furn_bed")&&inventoryValue(world.economy)===350&&world.economy.projectCosts.first===0,"Return inventory");
 world.economy=spendGoods(world,{furn_bed:1}).economy;
 const d={...empty,...world,layout,walls,roofPlan:plan,roof:tiles.map(tile=>({tile,stage:5})),furniture:placed.furniture};
 const report=inspectProperty(d,now);assert(!report.passed&&report.area===16&&report.foundationArea===100,"Enclosed area, not slab area");assert(report.rows.find(v=>v.name==="Roof and ceiling").passed,"Completed roof inspection");
 const blocked=propertyOffer(d,report);assert(blocked.base===9600&&!blocked.eligible,"Incomplete building valuation");
 assert(settleSale(world,"first",d,report,blocked.net,now).error,"Inspection blocks sale");
 // Isolate transaction logic; this synthetic report is not a claim of a completed simulated house.
 const pass={...report,passed:true,score:100},offer=propertyOffer(d,pass);
 assert(settleSale(world,"first",d,pass,offer.net+1,now).error,"Stale offer rejected");
 const sold=settleSale(world,"first",d,pass,offer.net,now);assert(!sold.error&&sold.economy.cash===24650+offer.net&&sold.sale.recordedCost===35000,"Atomic settlement math");
 assert(settleSale(sold,"first",d,pass,offer.net,now).error,"Duplicate sale rejected");assert(companyStats(sold.economy,sold.business).tier.sales===1,"Company rank");
 return {status:"passed",scope:"Construction and business math; no browser or live database"};
}
console.log(runRegression());
