
export const WORK_TOOLS=["upperpower","upperwater","upperwall","story","wall","drywall","finish","paint","joinery","siding","trim","roof","floor","furniture","landscape","electric","cable","outlet","panel","heater","fixture","utility","gravel","form","drain","cold","hot","conduit","barrier","rebar","pour","screed","layout"];
export const WORK_LABELS={upperpower:"Installing upper power module",upperwater:"Installing upper water module",upperwall:"Framing upstairs",story:"Building upper deck",wall:"Framing",drywall:"Installing drywall",finish:"Finishing drywall",paint:"Painting",joinery:"Fitting door or window",siding:"Fitting siding",trim:"Fitting trim",roof:"Roof construction",floor:"Installing flooring",furniture:"Furnishing",landscape:"Landscaping",electric:"Device installation",cable:"Electrical work",outlet:"Device installation",panel:"Panel work",heater:"Installing equipment",fixture:"Installing fixture",utility:"Utility work",gravel:"Spreading gravel",form:"Formwork",drain:"Plumbing work",cold:"Plumbing work",hot:"Plumbing work",conduit:"Service work",barrier:"Foundation preparation",rebar:"Foundation preparation",pour:"Pouring concrete",screed:"Leveling concrete",layout:"Marking foundation"};
export function cleanWork(raw){
 if(!raw||!WORK_TOOLS.includes(raw.tool)||!["working","placing"].includes(raw.state)||!Number.isSafeInteger(raw.seq)||raw.seq<0||raw.seq>2147483647)return null;
 return {tool:raw.tool,state:raw.state,seq:raw.seq};
}
export function workMatches(w,p){
 if(!w||!p||p.driving||p.plateOperating)return false;
 const tool=w.tool;
 if(["drywall","finish","paint","joinery","siding","trim"].includes(tool))return p.wallMode===tool;
 if(tool==="wall")return ["wall","door","window","sheathing","wrap","insulation"].includes(p.wallMode);
 if(["upperpower","upperwater","upperwall","story","roof","floor","furniture","landscape","outlet","panel","heater","fixture","utility","gravel","form","cable"].includes(tool))return p[tool+"Mode"]===true;
 if(tool==="electric")return !!p.electricMode;
 if(["drain","cold","hot","conduit"].includes(tool))return p.pipeMode===true&&p.pipeKind===tool;
 if(["barrier","rebar"].includes(tool))return p.prepMode===tool;
 if(["pour","screed"].includes(tool))return p.concreteMode===tool;
 return tool==="layout"&&p.layoutMode===true;
}
export function workPulse(work,elapsed){
 if(!work)return 0;
 if(work.state==="placing"){const t=Math.max(0,Math.min(1,elapsed/850));return Math.sin(Math.PI*t);}
 return .5+.5*Math.sin(Math.max(0,elapsed)*.010);
}
