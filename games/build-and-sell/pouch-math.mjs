
export const VAN_ACCESS={x:-12,z:-23.5},VAN_REACH=3;
export const TOOLS=[
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
["pour","Concrete hose kit","Foundation","Collect at mixer · R move truck · hold LMB pour"],
["screed","Screed","Foundation","Hold LMB level"],
["wall","Framing hammer","Structure","LMB endpoints · T wall/door/window/sheathing/wrap/insulation · RMB remove"],
["drywall","Drywall installation kit","Structure","LMB close-up install · E exit · RMB remove"],
["finish","Drywall finishing kit","Structure","LMB close-up finish · hold LMB targets · E exit"],
["paint","Interior painting kit","Structure","T color · LMB close-up paint · hold LMB coverage · E exit"],
["joinery","Door & window installation kit","Structure","LMB close-up install · RMB uninstall · E interact when stowed"],
["siding","Exterior siding kit","Structure","T style · R/F color · LMB fit · RMB remove"],
["roof","Ceiling & roof construction kit","Structure","T stage · aim overhead · hold LMB install · RMB remove"],
["furniture","Furnishing placement kit","Structure","T item · R/F rotate · LMB place · RMB return to stock"],
["floor","Flooring installation kit","Structure","T material · hold LMB install · RMB remove"],
["electric","Box mounting kit","Electrical","T type · R/F height · LMB mount"],
["cable","Cable spool & drill","Electrical","T cable type · R/F height · hold LMB route"],
["outlet","Device wiring kit","Electrical","Outlets, switches & lights · hold to work · T mode/seat"],
["panel","Breaker panel kit","Electrical","T rating · R/F cable · LMB work"],
["heater","Water heater kit","Plumbing","LMB place/select/connect · T port · R disconnect"],
["fixture","Fixture installation kit","Plumbing","LMB place/select/connect · T type/port · R disconnect"],
["utility","Municipal service kit","Plumbing","T water/sewer/meter/valve · LMB install · RMB disconnect"]
].map(([id,name,category,controls])=>({id,name,category,controls}));
export function cleanPouch(input){const seen=new Set(),arr=Array.isArray(input)?input:[];return Array.from({length:3},(_,i)=>{const id=arr[i];if(!TOOLS.some(t=>t.id===id)||seen.has(id))return null;seen.add(id);return id;});}
export function putTool(pouch,slot,id){const p=cleanPouch(pouch);if(!Number.isInteger(slot)||slot<0||slot>2||id!==null&&!TOOLS.some(t=>t.id===id))return p;const previous=p.indexOf(id);if(id!==null&&previous>=0&&previous!==slot)p[previous]=p[slot];p[slot]=id;return p;}
export function nearVan(p){return !!p&&Math.hypot(p.x-VAN_ACCESS.x,p.z-VAN_ACCESS.z)<=VAN_REACH;}
