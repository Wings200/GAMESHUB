
import {FURNISHINGS} from "./furniture-math.mjs";
export const STORE={x:17,z:-23.3},STORE_REACH=3.5,START_CASH=25000;
export const GOODS=[
["gravel","Gravel","Foundation",100,45],["form","Form boards","Foundation",4,24],["barrier","Vapor barrier","Foundation",100,30],["rebar","Reinforcement","Foundation",100,85],["concrete","Concrete","Foundation",100,100],
["ceilingjoist","Ceiling framing units","Roofing",10,95],["roofrafter","Roof framing units","Roofing",10,130],["roofdeck","Roof decking","Roofing",10,90],["roofshingle","Roof shingles","Roofing",10,110],["ceilingpanel","Ceiling panels","Roofing",10,80],
["floorwood","Hardwood flooring","Flooring",10,145],["floortile","Ceramic tile","Flooring",10,95],["floorcarpet","Carpet","Flooring",10,65],["floorvinyl","Vinyl flooring","Flooring",10,80],
["joineryframe","Door & window frames","Openings",2,65],["doorunit","Door units","Openings",1,140],["windowunit","Window units","Openings",1,165],["joinerytrim","Trim & hardware packs","Openings",2,42],["baseboard","Baseboard lengths","Interior trim",10,45],["crowntrim","Crown molding lengths","Interior trim",10,70],
["sidingvinyl","Vinyl siding","Exterior",4,60],["sidingwood","Wood siding","Exterior",4,88],["sidingbrick","Brick veneer","Exterior",4,110],["sidingstucco","Stucco supplies","Exterior",4,72],
["lumber","Framing lumber","Structure",4,48],["opening","Opening framing supplies","Structure",1,22],["osb","OSB sheets","Structure",4,44],["wrap","House wrap","Structure",10,35],["insulation","Insulation","Structure",8,32],["drywall","Drywall sheets","Structure",4,36],["finish","Joint finishing supplies","Structure",12,24],["paint","Paint coverage units","Structure",24,38],
["drain","Drain pipe","Plumbing",5,30],["cold","Cold water pipe","Plumbing",5,19],["hot","Hot water pipe","Plumbing",5,19],["conduit","Conduit","Electrical",5,18],["box","Electrical boxes","Electrical",4,16],["cable","Cable","Electrical",5,30],["device","Electrical devices","Electrical",4,32],["coverplate","Device cover plates","Electrical",4,8],["panelcover","Panel cover","Electrical",1,22],["breaker","Breakers / service components","Electrical",2,38],["heater","Water heaters","Plumbing",1,380],["fixture","Fixture supplies","Plumbing",1,110],["utility","Utility connection supplies","Plumbing",4,50]
].map(([id,name,category,pack,price])=>({id,name,category,pack,price})).concat(FURNISHINGS.map(f=>({id:f.stock,name:f.name,category:"Furnishings",pack:1,price:f.price})));
export const nearStore=p=>!!p&&Math.hypot(p.x-STORE.x,p.z-STORE.z)<=STORE_REACH;
const validMoney=n=>Number.isSafeInteger(n)&&n>=0;
const projectKey=w=>typeof w?.foundationId==="string"?w.foundationId:"foundation-1";
export function readEconomy(w){const e=w?.economy||{},stock={};for(const g of GOODS)stock[g.id]=Number.isSafeInteger(e.stock?.[g.id])?Math.max(0,Math.min(1000000,e.stock[g.id])):0;const cash=validMoney(e.cash)?e.cash:START_CASH,revenue=validMoney(w?.business?.revenue)?w.business.revenue:0;
 const costs=Object.create(null);for(const [id,v] of Object.entries(e.projectCosts||{}).slice(0,32)){if(id.length<=80&&validMoney(v))costs[id]=v;}
 const purchases=Object.create(null);for(const g of GOODS)if(validMoney(e.purchases?.[g.id]))purchases[g.id]=e.purchases[g.id];
 return {cash,stock,purchaseTotal:Math.max(validMoney(e.purchaseTotal)?e.purchaseTotal:0,START_CASH+revenue-cash,0),projectCosts:costs,purchases,revision:Number.isSafeInteger(e.revision)&&e.revision>=0?e.revision:0};}
export function buyGoods(w,id,packs){const e=readEconomy(w),g=GOODS.find(g=>g.id===id);if(!g||!Number.isInteger(packs)||packs<1||packs>100)return {error:"Choose 1–100 packs"};const price=g.price*packs;if(e.cash<price)return {error:"Not enough project funds"};if(e.stock[id]+packs*g.pack>1000000)return {error:"Stock limit reached"};e.cash-=price;e.purchaseTotal+=price;e.purchases[id]=(e.purchases[id]||0)+price;e.stock[id]+=packs*g.pack;e.revision++;return {economy:e};}
export function spendGoods(w,cost){const e=readEconomy(w);let changed=false,cents=0;for(const [id,n] of Object.entries(cost)){if(!n)continue;const g=GOODS.find(g=>g.id===id);if(!g||!Number.isSafeInteger(n)||n<0)return {error:"Invalid supply cost"};if(e.stock[id]<n)return {error:"Need "+n+" "+g.name+" (have "+e.stock[id]+") · visit materials store"};e.stock[id]-=n;cents+=Math.round(n*g.price*100/g.pack);changed=true;}if(changed){const id=projectKey(w);e.projectCosts[id]=(e.projectCosts[id]||0)+cents;e.revision++;}return {economy:e};}
export const units=n=>Math.max(1,Math.ceil(n||1));

export function returnMaterial(e,w,id){const g=GOODS.find(v=>v.id===id);if(!g||e.stock[id]>=1000000)return false;e.stock[id]++;const key=projectKey(w);if(Object.hasOwn(e.projectCosts,key))e.projectCosts[key]=Math.max(0,e.projectCosts[key]-Math.round(g.price*100/g.pack));e.revision++;return true;}
export function inventoryValue(e){return Math.round(GOODS.reduce((n,g)=>n+(e?.stock?.[g.id]||0)*g.price/g.pack,0)*100)/100;}
