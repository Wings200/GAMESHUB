
export const VAN_ACCESS={x:-12,z:-23.5},VAN_REACH=3;
export const TASKS=[
["tape","Tape measure","Survey","LMB anchor · RMB retract"],
["laser","Rotary laser","Survey","LMB set up · RMB retrieve"],
["rod","Grade rod","Survey","Walk to read elevations"],
["layout","Layout kit","Survey","LMB new foundation corners · T switch · G snap"],
["gravel","Gravel shovel","Foundation","Hold LMB spread"],
["form","Formwork hammer","Foundation","LMB install · RMB remove"],
["drain","Drain & vent kit","Plumbing","T waste/vent in framing · G snap · LMB route"],
["cold","Cold PEX kit","Plumbing","T mode · R/F height · G snap"],
["hot","Hot PEX kit","Plumbing","T mode · R/F height · G snap"],
["conduit","Conduit kit","Electrical","T mode · R/F height · G snap"],
["barrier","Vapor barrier","Foundation","Hold LMB place · RMB remove"],
["rebar","Rebar kit","Foundation","Hold LMB place · RMB remove"],
["pour","Concrete hose kit","Foundation","Collect at mixer · E at cab drive · hold LMB pour"],
["screed","Screed","Foundation","Hold LMB level"],
["wall","Framing hammer","Structure","LMB endpoints · T wall/door/window/sheathing/wrap/insulation · RMB remove"],
["drywall","Drywall installation kit","Structure","LMB close-up install · E exit · RMB remove"],
["finish","Drywall finishing kit","Structure","LMB close-up finish · hold LMB targets · E exit"],
["trim","Interior trim kit","Structure","T type · R/F finish · LMB install · RMB remove"],
["paint","Interior painting kit","Structure","T color · LMB close-up paint · hold LMB coverage · E exit"],
["joinery","Door & window installation kit","Structure","LMB close-up install · RMB uninstall · E interact when stowed"],
["siding","Exterior siding kit","Structure","T style · R/F color · LMB fit · RMB remove"],
["upperpower","Upper power modules","Electrical","T module · LMB install/link/test · RMB remove"],["upperwater","Upper water modules","Plumbing","T module · LMB install/link/test · RMB remove"],
["upperwall","Upper wall & finish kit","Structure","T job · R/F size or color · G face / trim type · Shift+G siding type · LMB work · RMB remove"],
["story","Upper deck & stairs","Structure","R/F rotate staircase · LMB build · RMB remove"],
["roof","Ceiling & roof construction kit","Structure","T stage · R/F shape before building · use on top floor · hold LMB install · RMB remove"],
["landscape","Landscaping kit","Interiors","T type · R/F rotate fence · LMB install · RMB remove"],
["furniture","Furnishing placement kit","Structure","T item · R/F rotate · LMB place · RMB return to stock"],
["floor","Flooring installation kit","Structure","T material · hold LMB install · RMB remove"],
["electric","Box mounting kit","Electrical","T type · R/F height · LMB mount"],
["cable","Cable spool & drill","Electrical","T cable type · R/F height · hold LMB route"],
["outlet","Device wiring kit","Electrical","LMB device/cover · RMB remove · T mode/seat · E switch"],
["panel","Breaker panel kit","Electrical","T rating · R/F cable · LMB work · G fit/remove cover"],
["heater","Water heater kit","Plumbing","LMB place/select/connect · T port · R disconnect"],
["fixture","Fixture installation kit","Plumbing","LMB place/select/connect · T type/port · R disconnect"],
["utility","Municipal service kit","Plumbing","T water/sewer/meter/valve · LMB install · RMB disconnect"]
].map(([id,name,category,controls])=>({id,name,category,controls}));
export const TOOLS=[
 {id:"surveyKit",name:"Survey kit",category:"Planning",modes:["layout","tape","laser","rod"]},
 {id:"foundationKit",name:"Foundation kit",category:"Construction",modes:["gravel","form","barrier","rebar","pour","screed"]},
 {id:"structureKit",name:"Structure kit",category:"Construction",modes:["wall","joinery","roof","siding","story","upperwall"]},
 {id:"finishKit",name:"Interior finish kit",category:"Construction",modes:["drywall","finish","paint","floor","trim"]},
 {id:"electricalKit",name:"Electrical kit",category:"Services",modes:["electric","conduit","cable","outlet","panel","upperpower"]},
 {id:"plumbingKit",name:"Plumbing kit",category:"Services",modes:["drain","cold","hot","utility","heater","fixture","upperwater"]},
 {id:"furnitureKit",name:"Furnishing kit",category:"Interiors",modes:["furniture","landscape"]}
].map(k=>({...k,controls:k.modes.map(id=>TASKS.find(t=>t.id===id).name).join(" · ")}));
export const kitFor=id=>TOOLS.find(k=>k.id===id||k.modes.includes(id))||null;
export function readKitModes(input,prior={}){const result={};for(const k of TOOLS){const saved=prior?.[k.id];const legacy=(Array.isArray(input)?input:[]).find(id=>k.modes.includes(id));result[k.id]=k.modes.includes(saved)?saved:legacy||k.modes[0];}return result;}
export function cleanPouch(input){const seen=new Set(),arr=Array.isArray(input)?input:[];return Array.from({length:3},(_,i)=>{const id=kitFor(arr[i])?.id;if(!id||seen.has(id))return null;seen.add(id);return id;});}
export function putTool(pouch,slot,id){const p=cleanPouch(pouch);if(!Number.isInteger(slot)||slot<0||slot>2||id!==null&&!TOOLS.some(t=>t.id===id))return p;const previous=p.indexOf(id);if(id!==null&&previous>=0&&previous!==slot)p[previous]=p[slot];p[slot]=id;return p;}
export function nearVan(p){return !!p&&Math.hypot(p.x-VAN_ACCESS.x,p.z-VAN_ACCESS.z)<=VAN_REACH;}
