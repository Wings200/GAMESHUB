
import {THREE} from "../../engine/core.js";
import {RoundedBoxGeometry} from "three/addons/geometries/RoundedBoxGeometry.js";

const V=(x,y,z=0)=>new THREE.Vector3(x,y,z);
const M=(c,m=0,r=.6)=>new THREE.MeshStandardMaterial({color:c,metalness:m,roughness:r});
const steel=M("#87969b",.55,.4),dark=M("#36454b",.35),black=M("#242c31"),silver=M("#cbd3d3",.8,.3),copper=M("#b58c5b",.55),cover=M("#b6c0c2",.45),wood=M("#a77e50"),paper=M("#e6e2d1"),red=M("#c95f4d"),yellow=M("#e9c05b"),white=M("#e7e7df"),ground=M("#73a482"),lead=M("#343e46"),blue=M("#587b9b"),rubber=M("#292f2d");
function mesh(p,g,m,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o}
function b(p,w,h,d,x,y,z,m){return mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z)}
function g(p,x=0,y=0,z=0){const o=new THREE.Group();o.position.set(x,y,z);p.add(o);return o}
function cy(p,r,l,x,y,z,m){return mesh(p,new THREE.CylinderGeometry(r,r,l,16),m,x,y,z)}
function tube(p,pts,mat,r=.006){const curve=new THREE.CatmullRomCurve3(pts.map(q=>V(...q)),false,"centripetal");return mesh(p,new THREE.TubeGeometry(curve,Math.max(16,pts.length*12),r,8,false),mat)}
function screw(p){const o=g(p);const head=cy(o,.009,.006,0,0,0,silver);head.rotation.x=Math.PI/2;b(o,.012,.002,.001,0,0,.004,dark);b(o,.002,.012,.001,0,0,.004,dark);return o}
function cabinet(p){const o=g(p);b(o,.43,.62,.025,0,0,.012,steel);for(const x of [-.205,.205])b(o,.02,.62,.10,x,0,.06,steel);for(const y of [-.30,.30])b(o,.43,.02,.10,0,y,.06,steel);b(o,.055,.48,.018,-.065,0,.035,dark);b(o,.025,.46,.025,.145,0,.038,copper);b(o,.028,.46,.025,-.15,0,.038,silver);for(let i=0;i<9;i++){for(const x of [-.15,.145]){const q=screw(o);q.position.set(x,-.195+i*.047,.058)}}return o}
function breaker(p){const o=g(p);b(o,.112,.061,.055,0,0,0,black);b(o,.039,.03,.015,.012,0,.031,steel);b(o,.019,.024,.014,.012,.006,.042,dark);return o}
function fitting(p){const o=g(p);cy(o,.017,.025,0,0,0,silver);cy(o,.010,.028,0,0,0,dark);return o}
function panelCover(p){const o=g(p);b(o,.43,.62,.018,0,0,0,cover);b(o,.29,.43,.012,-.015,0,.011,dark);b(o,.277,.42,.014,-.015,0,.020,steel);b(o,.013,.048,.022,.104,0,.035,silver);return o}
function note(p,txt,x,y,z){const c=document.createElement("canvas");c.width=256;c.height=96;const ctx=c.getContext("2d");ctx.fillStyle="#e7e2d3";ctx.fillRect(0,0,256,96);ctx.font="bold 24px sans-serif";ctx.fillStyle="#303a3d";ctx.textAlign="center";ctx.fillText(txt,128,57);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:t});m.userData.owned=true;const o=mesh(p,new THREE.PlaneGeometry(.092,.034),m,x,y,z);return o}
const toolOrange=M("#c77a36",.06,.52),toolRed=M("#b63730",.05,.6),toolBlack=M("#262b2e"),toolGray=M("#565d60",.4,.5),toolChrome=M("#c3c9cc",.82,.24),toolBlue=M("#386b9c",.05,.55);
function round(p,w,h,d,x,y,z,m,r=.008){return mesh(p,new RoundedBoxGeometry(w,h,d,3,Math.min(r,w*.22,h*.22,d*.22)),m,x,y,z)}
function rod(p,r1,r2,len,x,y,z,m){const o=mesh(p,new THREE.CylinderGeometry(r1,r2,len,18),m,x,y,z);o.rotation.x=Math.PI/2;return o}
function handle(p,x,y,z,color){const o=round(p,.024,.10,.026,x,y,z,color,.012);for(let i=0;i<5;i++)round(p,.025,.004,.027,x,y-.027+i*.011,z,toolBlack,.001);return o}
function handTool(parent,name){
 const o=g(parent),n=name.toLowerCase();
 if(/drill|impact/.test(n)){
  round(o,.059,.066,.125,0,-.045,.045,toolOrange,.016);
  round(o,.053,.053,.028,0,-.045,.119,toolBlack,.008);
  rod(o,.022,.017,.035,0,-.045,-.035,toolGray);rod(o,.014,.011,.035,0,-.045,-.064,toolBlack);
  rod(o,.004,.004,.07,0,-.045,-.109,toolChrome);
  for(let i=0;i<5;i++){const f=round(o,.008,.016,.006,.03,-.04,.018+i*.012,toolBlack,.001);}
  const grip=round(o,.039,.097,.05,0,-.109,.064,toolBlack,.012);grip.rotation.x=-.13;
  round(o,.075,.028,.083,0,-.165,.067,toolOrange,.006);round(o,.072,.012,.08,0,-.18,.067,toolBlack,.004);
  round(o,.016,.024,.024,0,-.077,.027,toolRed,.003);
 }else if(/strip|preparation|crimp|cutter|pliers|snip/.test(n)){
  const cut=/cut|snip/.test(n),len=.09;
  for(const s of [-1,1]){
   const arm=g(o,s*.008,0,0);arm.rotation.z=s*.23;
   round(arm,.020,.092,.022,s*.012,-.07,.008,toolRed,.008);
   round(arm,.012,.043,.009,0,-.007,0,toolChrome,.002);
   const jaw=round(arm,.024,cut?.047:.035,.012,s*.009,.029,0,toolChrome,.003);jaw.rotation.z=-s*.23;
   if(!cut)for(let i=0;i<3;i++)round(arm,.009,.004,.013,s*.003,.019+i*.008,0,toolBlack,.001);
  }
  const pivot=cy(o,.012,.009,0,0,.006,toolGray);pivot.rotation.x=Math.PI/2;
 }else if(/wrench|spanner/.test(n)){
  const q=round(o,.023,.14,.012,0,-.073,0,toolRed,.005);
  round(o,.052,.036,.017,0,.01,0,toolChrome,.004);
  for(const x of [-.021,.021]){round(o,.015,.037,.017,x,.038,0,toolChrome,.003);for(let i=0;i<4;i++)round(o,.016,.003,.019,x,.025+i*.007,0,toolGray,.001)}
  const adjust=cy(o,.012,.024,0,-.003,.012,toolGray);adjust.rotation.z=Math.PI/2;
 }else if(/tester|meter|gauge/.test(n)){
  round(o,.071,.104,.026,.016,-.06,.012,toolOrange,.012);round(o,.059,.086,.008,.016,-.06,.029,toolBlack,.006);
  round(o,.045,.027,.004,.016,-.036,.035,M("#a7c0a1"),.002);
  const dial=cy(o,.015,.009,.016,-.079,.035,toolGray);dial.rotation.x=Math.PI/2;
  for(const x of [-.003,.035]){const cableMat=x<0?toolRed:toolBlack;tube(o,[[x,-.11,.02],[x-.045,-.15,.04],[x-.067,-.07,.035],[x-.067,.018,.018]],cableMat,.003);round(o,.012,.054,.012,x-.067,.036,.018,cableMat,.004);round(o,.003,.023,.003,x-.067,.073,.018,toolChrome,.001)}
 }else if(/seal|caulk/.test(n)){
  rod(o,.028,.028,.13,0,-.045,.06,toolChrome);rod(o,.012,.003,.052,0,-.045,-.03,white);
  round(o,.03,.075,.03,0,-.095,.10,toolRed,.007);round(o,.013,.05,.018,0,-.105,.072,toolGray,.003);
 }else if(/level/.test(n)){
  round(o,.19,.031,.024,0,-.015,0,toolOrange,.005);round(o,.064,.014,.027,0,-.015,0,toolBlack,.004);round(o,.051,.008,.028,0,-.015,0,M("#a7d276"),.004);round(o,.009,.008,.03,0,-.015,0,white,.003);
 }else if(/pencil|mark/.test(n)){
  round(o,.012,.11,.012,0,-.048,.018,toolOrange,.002);const tip=mesh(o,new THREE.ConeGeometry(.007,.025,6),wood,0,.02,.018);mesh(o,new THREE.ConeGeometry(.003,.008,6),toolBlack,0,.036,.018);
 }else if(/lockout/.test(n)){
  round(o,.047,.044,.019,0,-.035,0,toolRed,.004);const sh=mesh(o,new THREE.TorusGeometry(.017,.003,8,18,Math.PI),toolChrome,0,-.005,0);round(o,.033,.06,.003,.033,-.055,.015,white,.002);
 }else if(/knockout/.test(n)){
  rod(o,.017,.017,.035,0,0,0,toolChrome);rod(o,.008,.008,.10,0,0,.064,toolGray);round(o,.022,.057,.022,0,-.03,.108,toolBlack,.004);
 }else {
  const isTorque=/torque/.test(n);
  rod(o,.004,.004,.095,0,0,-.035,toolChrome);rod(o,.012,.012,.020,0,0,.025,toolGray);
  rod(o,.019,.016,.076,0,0,.069,isTorque?toolBlue:toolRed);for(let i=0;i<6;i++)rod(o,.020,.020,.004,0,0,.042+i*.009,toolBlack);
  if(isTorque){rod(o,.022,.022,.016,0,0,.113,toolChrome);for(let i=0;i<8;i++)round(o,.003,.003,.003,0,.022,.105+i*.002,toolBlack,.001);}
 }
 return o;
}

const mounts=[[-.18,.263,.035],[.18,.263,.035],[-.18,-.263,.035],[.18,-.263,.035]];
const entries=[[-.125,.30,.067],[0,.30,.067],[.125,.30,.067]];
const slots=[[-.065,.164,.071],[-.065,.060,.071],[-.065,-.044,.071]];
const coverPoints=mounts.map(([x,y])=>[x,y,.154]);
const circuits=["LIGHTING","OUTLETS","UTILITY"];
const jacketPaths=entries.map(([x,y,z])=>[[x,.45,z],[x,.34,z],[x,.30,z],[x,.235,z]]);
const paths=slots.flatMap(([x,y,z],i)=>{
 const ex=entries[i][0],ry=.225-i*.016;
 return [{name:circuits[i]+" · branch lead",mat:lead,pts:[[ex,ry,.073],[.055+i*.014,ry,.086],[.055+i*.014,y,.086],[-.004,y,.085]]},
 {name:circuits[i]+" · neutral lead",mat:white,pts:[[ex,ry-.009,.075],[-.125+i*.012,ry-.012,.099],[-.15,.18-i*.065,.067]]},
 {name:circuits[i]+" · protective lead",mat:ground,pts:[[ex,ry-.018,.075],[.13+i*.005,ry-.021,.104],[.145,.18-i*.065,.067]]}];
});
const connections=paths.map(p=>p.pts[p.pts.length-1]);
function installed(parent,closed=true){const o=cabinet(parent);for(let i=0;i<3;i++){const f=fitting(o);f.position.set(...entries[i]);const q=breaker(o);q.position.set(...slots[i]);tube(o,jacketPaths[i],black,.012);note(o,circuits[i],.085,slots[i][1],.11)}for(const p of paths)tube(o,p.pts,p.mat,.004);for(const p of mounts){const q=screw(o);q.position.set(...p)}if(closed){const f=panelCover(o);f.position.z=.128;for(const p of coverPoints){const q=screw(o);q.position.set(...p)}}return o}
export function finishedBreaker(parent,side=1){const o=g(parent,0,1.45,.10*side);if(side<0)o.rotation.y=Math.PI;return installed(o)}
const stages=[
 {title:"Isolate the training circuit",tool:"Lockout tag",mode:"hold",targets:[[-.31,.32,.09]],hint:"Attach the lockout tag to the isolated game supply."},
 {title:"Verify the isolated work area",tool:"Voltage tester",mode:"hold",targets:[[-.31,.21,.09]],hint:"Touch the simulated verification point. The game supply is not connected to live power."},
 {title:"Mark enclosure mounting holes",tool:"Pencil",mode:"click",targets:mounts.map(p=>[p[0],p[1],.002]),hint:"Mark the four locations on the backing."},
 {title:"Prepare the mounting holes",tool:"Drill",mode:"hold",targets:mounts.map(p=>[p[0],p[1],.002]),hint:"Drill at the marked mounting locations."},
 {title:"Position the empty cabinet",tool:"Cabinet",mode:"drag",targets:[[0,0,.006]],sources:[[-.39,-.04,.11]],hint:"Drag the empty cabinet from the tool tray onto the marked wall."},
 {title:"Fasten the enclosure",tool:"Driver",mode:"hold",targets:mounts,hint:"Drive each cabinet mounting fastener."},
 {title:"Prepare cable entries",tool:"Knockout tool",mode:"hold",targets:entries,hint:"Open the designated factory entry points in the simulated enclosure."},
 {title:"Install entry fittings",tool:"Cable fittings",mode:"drag",targets:entries,sources:[[-.37,.13,.14],[-.37,.06,.14],[-.37,-.01,.14]],hint:"Drag each fitting into an entry opening."},
 {title:"Bring in branch cables",tool:"Cable",mode:"route",paths:jacketPaths,targets:jacketPaths.map(p=>p[0]),hint:"Pull each cable through its fitting and follow its marked route."},
 {title:"Prepare the branch cable ends",tool:"Cable preparation tool",mode:"hold",targets:jacketPaths.map(p=>p[p.length-1]),hint:"Use the simulated preparation tool on each cable end. No real cutting dimensions are modeled."},
 {title:"Fit the branch breakers",tool:"Breaker modules",mode:"drag",targets:slots,sources:[[-.36,.16,.14],[-.36,.06,.14],[-.36,-.04,.14]],hint:"Move the three branch modules onto their assigned mounting positions."},
 {title:"Dress branch conductors",tool:"Conductors",mode:"route",paths:paths.map(p=>p.pts),targets:paths.map(p=>p.pts[0]),hint:"Route the indicated conductor to its game terminal. The diagram models an isolated branch-panel trainer, not a universal wiring plan."},
 {title:"Secure terminal connections",tool:"Torque driver",mode:"hold",targets:connections,hint:"Secure each simulated termination with the virtual driver; no real torque values are provided."},
 {title:"Attach circuit identification",tool:"Labels",mode:"drag",targets:slots.map(p=>[.085,p[1],.112]),sources:[[-.36,.16,.14],[-.36,.06,.14],[-.36,-.04,.14]],hint:"Attach the branch identification labels beside the corresponding modules."},
 {title:"Check the isolated assembly",tool:"Inspection tester",mode:"hold",targets:slots.map(p=>[-.004,p[1],.085]),hint:"Run a simulated check on each isolated branch. No live testing."},
 {title:"Fit the protective cover",tool:"Cover",mode:"drag",targets:[[0,0,.128]],sources:[[-.39,-.04,.17]],hint:"Lift the protective cover into place."},
 {title:"Secure the cover",tool:"Driver",mode:"hold",targets:coverPoints,hint:"Secure all four cover fasteners."}
];

/* Each fixture is built from the same physical parts in work mode, preview and final scene.
   Electrical work is an isolated game simulation; no energized testing or real specification. */
const PT=(x,y,z=.12)=>[x,y,z];
const placeAt=(p,fac,xyz)=>{const o=fac(p);o.position.set(...xyz);return o};
const paint=(p,w,h,d,x,y,z,m)=>round(p,w,h,d,x,y,z,m,.006);
const porcelain=M("#e9e7df",.08,.27),chrome=M("#c3ccce",.8,.2),pvc=M("#d5d7d0"),hot=M("#ba7557",.45),cold=M("#7b9cb6",.35),gasket=M("#77736b"),cabwood=M("#aa9477"),duct=M("#8c9ea2",.5,.42);
const wallbox=p=>{const q=g(p);b(q,.095,.15,.025,0,0,.005,blue);for(const x of [-.045,.045])b(q,.006,.15,.065,x,0,.038,blue);for(const y of [-.072,.072])b(q,.095,.007,.065,0,y,.038,blue);return q};
const plate=p=>{const q=g(p);for(const x of [-.048,.048])round(q,.022,.186,.008,x,0,0,plastic,.003);for(const y of [-.079,.079])round(q,.074,.028,.008,0,y,0,plastic,.003);return q};
function receptacle(p){const q=g(p);round(q,.074,.13,.035,0,0,0,plastic,.008);for(const y of [-.033,.033]){round(q,.058,.054,.007,0,y,.021,white,.007);for(const x of [-.012,.012])b(q,.007,.016,.003,x,y+.006,.026,black);const a=cy(q,.004,.004,0,y-.015,.026,black);a.rotation.x=Math.PI/2;}return q}
function lightSwitch(p){const q=g(p);round(q,.07,.116,.028,0,0,0,plastic,.006);round(q,.039,.067,.016,0,0,.023,white,.006);b(q,.039,.003,.004,0,0,.033,dark);return q}
function bracket(p){const q=g(p);b(q,.10,.018,.035,0,0,0,steel);for(const x of [-.04,.04])placeAt(q,screw,[x,0,.025]);return q}
const support=p=>{const q=g(p);for(const x of [-.315,.315])b(q,.03,.035,.56,x,0,0,cabwood);for(const z of [-.265,.265])b(q,.60,.035,.03,0,0,z,cabwood);for(const x of [-.30,.30])for(const z of [-.25,.25])b(q,.035,.68,.035,x,-.35,z,cabwood);return q};
function basin(p){const q=g(p);const shape=new THREE.Shape();shape.moveTo(-.32,-.24);shape.lineTo(.32,-.24);shape.lineTo(.32,.24);shape.lineTo(-.32,.24);shape.closePath();const hole=new THREE.Path();hole.absellipse(0,0,.245,.175,0,Math.PI*2,true);shape.holes.push(hole);const rim=mesh(q,new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:3,steps:1}),chrome);rim.rotation.x=-Math.PI/2;const bowl=mesh(q,new THREE.SphereGeometry(.24,28,16,0,Math.PI*2,Math.PI/2,Math.PI/2),chrome,0,-.015,0);bowl.scale.set(1,.57,.72);return q}
function faucet(p){const q=g(p);cy(q,.024,.024,0,0,0,chrome);tube(q,[[0,0,0],[0,.13,0],[0,.16,.05],[0,.12,.12]],chrome,.013);for(const x of [-.065,.065]){cy(q,.018,.037,x,.012,0,chrome);b(q,.052,.01,.014,x,.034,0,chrome)}return q}
function drain(p){const q=g(p);cy(q,.035,.018,0,0,0,chrome);cy(q,.020,.019,0,.002,0,dark);for(let i=0;i<3;i++)b(q,.037,.002,.003,0,.013,-.013+i*.013,chrome);return q}
function trap(p){const q=g(p);tube(q,[[0,.16,0],[0,.03,0],[.045,-.045,0],[.11,.02,0],[.11,.07,-.10]],pvc,.022);return q}
function bowl(p){const q=g(p);const base=mesh(q,new THREE.SphereGeometry(.20,28,18),porcelain,0,.14,0);base.scale.set(.73,.78,1.10);const body=mesh(q,new THREE.SphereGeometry(.22,32,20),porcelain,0,.28,.05);body.scale.set(.85,.55,1.10);const ring=mesh(q,new THREE.TorusGeometry(.17,.043,12,36),porcelain,0,.37,.055);ring.rotation.x=-Math.PI/2;ring.scale.set(.93,1.24,.80);const inside=mesh(q,new THREE.SphereGeometry(.15,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),M("#7fa7b2",.15,.3),0,.358,.055);inside.scale.set(1,.3,1.20);return q}
function tank(p){const q=g(p);round(q,.36,.31,.17,0,0,0,porcelain,.035);round(q,.372,.042,.185,0,.161,0,porcelain,.012);round(q,.055,.017,.017,.1,.085,.095,chrome,.004);return q}
function flange(p){const q=g(p);cy(q,.11,.025,0,0,0,pvc);cy(q,.067,.028,0,.002,0,dark);return q}
function gasketRing(p){const q=g(p);const o=mesh(q,new THREE.TorusGeometry(.077,.018,10,32),gasket);o.rotation.x=-Math.PI/2;return q}
function seat(p){const q=g(p);const o=mesh(q,new THREE.TorusGeometry(.16,.022,12,32),porcelain);o.rotation.x=-Math.PI/2;o.scale.set(.94,1.25,1);return q}
function boot(p){const q=g(p);for(const x of [-.22,.22])b(q,.012,.10,.26,x,0,0,duct);for(const z of [-.13,.13])b(q,.45,.10,.012,0,0,z,duct);b(q,.45,.012,.26,0,-.045,0,dark);cy(q,.08,.08,0,-.085,0,duct);return q}
function grille(p){const q=g(p);round(q,.48,.024,.29,0,0,0,duct,.006);for(let i=0;i<9;i++)b(q,.42,.006,.009,0,.014,-.105+i*.026,dark);return q}
function collar(p){const q=g(p);cy(q,.105,.085,0,0,0,duct);cy(q,.086,.087,0,.005,0,dark);return q}
function handlerCab(p){const q=g(p);b(q,.66,.86,.55,0,0,-.025,duct);b(q,.57,.74,.015,0,.01,.258,dark);for(const x of [-.306,.306])b(q,.03,.85,.06,x,0,.25,duct);return q}
function fan(p){const q=g(p);const o=cy(q,.16,.065,0,0,0,dark);o.rotation.x=Math.PI/2;for(let i=0;i<7;i++){const blade=g(q);blade.rotation.z=i*Math.PI*2/7;const f=round(blade,.052,.113,.016,0,.075,.04,duct,.012);f.rotation.z=.32;}const hub=cy(q,.038,.09,0,0,.02,chrome);hub.rotation.x=Math.PI/2;return q}
function filter(p){const q=g(p);b(q,.48,.19,.024,0,0,0,white);for(let i=0;i<14;i++)b(q,.006,.16,.027,-.224+i*.034,0,.003,cabwood);for(const y of [-.09,.09])b(q,.49,.018,.032,0,y,0,duct);return q}
function access(p){const q=g(p);round(q,.66,.86,.025,0,0,0,duct,.007);for(let i=0;i<7;i++)b(q,.40,.013,.004,0,-.23+i*.045,.016,dark);round(q,.09,.017,.025,.18,.30,.025,black,.003);return q}
const stage=(title,tool,mode,targets,hint,extra={})=>({title,tool,mode,targets,hint,...extra});
const hold=(title,tool,targets,hint,after)=>stage(title,tool,"hold",targets,hint,{after});
const click=(title,tool,targets,hint,after)=>stage(title,tool,"click",targets,hint,{after});
const dragPart=(title,tool,targets,parts,hint,after,sources)=>stage(title,tool,"drag",targets,hint,{parts,sources:sources||targets.map((_,i)=>[-.48,.32-i*.13,.18]),after});
const route=(title,tool,paths,mats,hint,radii)=>stage(title,tool,"route",paths.map(p=>p[0]),hint,{paths,after:(q,i)=>tube(q,paths[i],mats[i],radii?.[i]||.006)});
const fasteners=(q,i,p)=>placeAt(q,screw,p);
const applyPart=(parts,targets)=>(q,i)=>placeAt(q,parts[i],targets[i]);
const put=(title,tool,targets,parts,hint,sources)=>dragPart(title,tool,targets,parts,hint,applyPart(parts,targets),sources);
const markHoles=(q,i,p)=>b(q,.013,.005,.003,p[0],p[1],p[2],black);
const mounted=(q,i,p)=>placeAt(q,screw,p);
function electricalSpec(id){
 const isThree=id==="three",isOutlet=id==="outlet",xs=isThree?[-.09,.09]:[0],device=isOutlet?receptacle:lightSwitch;
 const boxes=xs.map(x=>PT(x,0,.02)),screws=xs.flatMap(x=>[PT(x,.08,.072),PT(x,-.08,.072)]);
 const jacket=xs.map((x,i)=>[[x,.39,.04],[x,.21,.04],[x,.075,.05]]);
 const wiring=isThree?[
 [[-.19,.09,.06],[-.24,.24,.07],[.24,.24,.07],[.19,.065,.07]],
 [[-.19,-.07,.06],[-.24,-.20,.07],[.24,-.20,.07],[.19,-.065,.07]],
 [[-.39,.24,.04],[-.29,.15,.05],[-.22,.025,.07]],
 [[.39,.24,.04],[.29,.15,.05],[.22,.025,.07]]
 ]:isOutlet?[
 [[-.03,.085,.06],[-.06,.03,.075],[-.038,0,.085]],
 [[0,.085,.06],[.05,.04,.075],[.038,0,.085]],
 [[.03,.085,.06],[.07,-.06,.075],[0,-.07,.085]]
 ]:[
 [[-.04,.085,.06],[-.055,.035,.075],[-.035,.025,.085]],
 [[.04,.085,.06],[.055,-.03,.075],[.035,-.025,.085]]
 ];
 if(isThree)for(const path of wiring)for(const p of path)p[0]*=.09/.19;
 const terminals=wiring.map(p=>p.at(-1)),coverTargets=xs.map(x=>PT(x,0,.108));
 const backing=q=>{};
 const sequence=[
 hold("Isolate the simulated lighting/receptacle circuit","Lockout tag",[PT(-.32,.31,.04)],"Tag the isolated game circuit.",(q)=>note(q,"ISOLATED",-.32,.31,.05)),
 hold("Verify isolation","Voltage tester",[PT(-.32,.21,.04)],"Check the isolated simulation before work.",(q)=>note(q,"VERIFIED",-.32,.21,.05)),
 click("Mark the wall-box positions","Pencil",screws.map(p=>[p[0],p[1],.003]),"Mark the mounting positions.",markHoles),
 put(isThree?"Mount both switch boxes":"Position the wall box","Wall box",boxes,boxes.map(()=>wallbox),"Fit the wall box into the prepared framing."),
 hold("Fasten the box hardware","Impact driver",screws,"Secure the box to the support.",mounted),
 route(isThree?"Pull cable to both control stations":"Pull the cable into the box","Cable",jacket,jacket.map(()=>black),"Guide the cable through the marked route.",jacket.map(()=>.009)),
 hold("Prepare the isolated cable ends","Cable stripper",jacket.map(p=>p.at(-1)),"Use the virtual cable stripper; no real stripping dimensions.",(q,i,p)=>{for(let n=0;n<3;n++)tube(q,[p,[p[0]+(n-1)*.014,p[1]-.024,.07]],[lead,white,ground][n],.003)}),
 route(isThree?"Route the two-station control conductors":isOutlet?"Route receptacle conductors":"Route switch conductors","Needle-nose pliers",wiring,wiring.map((_,i)=>[lead,white,ground,red][i%4]),"Guide each lead along the fictional isolated circuit's highlighted path.",wiring.map(()=>.0035)),
 hold("Secure the simulated device terminals","Torque screwdriver",terminals,"Seat each connection with the virtual driver.",mounted),
 put(isThree?"Fit both control mechanisms":isOutlet?"Seat the duplex receptacle":"Seat the switch mechanism","Device",xs.map(x=>PT(x,0,.079)),xs.map(()=>device),"Fit the device into its own wall box."),
 hold("Secure device yokes","Screwdriver",screws,"Secure both mounting points for each device.",mounted),
 put("Fit the faceplates","Faceplate",coverTargets,xs.map(()=>plate),"Fit the plates flush over the boxes."),
 hold("Secure faceplate screws","Screwdriver",xs.flatMap(x=>[PT(x,.079,.118),PT(x,-.079,.118)]),"Fasten the cover plates.",mounted),
 hold(isThree?"Check both isolated control stations":isOutlet?"Check the isolated receptacle":"Check the isolated switch","Continuity tester",xs.map(x=>PT(x,0,.14)),"Run the game's simulated device check, with no live voltage.",()=>{})
 ];
 const final=q=>{for(let i=0;i<xs.length;i++){const x=xs[i];placeAt(q,wallbox,boxes[i]);placeAt(q,plate,coverTargets[i]);placeAt(q,device,[x,0,.079]);for(const y of [-.079,.079])placeAt(q,screw,[x,y,.121]);}jacket.forEach(p=>tube(q,p,black,.009));};
 return {id,stages:sequence,backing,final,height:isOutlet?.55:1.2,wall:true,distance:isThree?1.25:1.03,focus:[0,.06,.04],sourceX:-.48};
}
function sinkSpec(){
 const top=PT(0,.15,.0),fa=PT(0,.18,-.19),dr=PT(0,.00,.0);
 const seals=[[[-.32,.15,-.24],[-.32,.15,.24],[.32,.15,.24],[.32,.15,-.24],[-.32,.15,-.24]]];
 const lines=[[[ -.18,-.46,.03],[-.18,-.28,.03],[-.08,-.12,-.12],[-.065,.14,-.19]],[[.18,-.46,.03],[.18,-.28,.03],[.08,-.12,-.12],[.065,.14,-.19]]];
 const steps=[
 put("Set the vanity support","Cabinet", [PT(0,.10,0)],[support],"Position the support under the sink opening."),
 route("Apply the basin rim seal","Sealant gun",seals,[gasket],"Trace the rim seam continuously.",[.009]),
 put("Lower the basin into the counter","Basin",[top],[basin],"Set the actual basin into its support."),
 hold("Tighten the basin mounting clips","Screwdriver",[PT(-.27,.105,.20),PT(.27,.105,.20),PT(-.27,.105,-.20),PT(.27,.105,-.20)],"Secure all four clips.",(q,i,p)=>placeAt(q,bracket,p)),
 put("Fit the faucet and drain assembly","Faucet and drain",[fa,dr],[faucet,drain],"Seat faucet and drain in their openings."),
 put("Fit the waste trap","Trap",[PT(0,-.18,0)],[trap],"Position the curved waste assembly below the basin."),
 route("Route hot and cold supply lines","Supply hose",lines,[hot,cold],"Bring each simulated flexible supply to the fixture.",[.009,.009]),
 hold("Seat the fixture fittings","Basin wrench",[fa,dr,PT(-.18,-.46,.03),PT(.18,-.46,.03),PT(.11,-.16,-.1)],"Tighten each virtual plumbing connection.",(q,i,p)=>cy(q,.016,.022,...p,chrome)),
 hold("Inspect the completed sink","Inspection tester",[PT(-.12,.18,.04),PT(.12,.18,.04),PT(0,-.18,0)],"Run simulated flow and leak checks.",()=>{})
 ];
 const final=q=>{placeAt(q,support,[0,.10,0]);placeAt(q,basin,top);placeAt(q,faucet,fa);placeAt(q,drain,dr);placeAt(q,trap,[0,-.18,0]);lines.forEach((p,i)=>tube(q,p,[hot,cold][i],.009))};
 return {id:"sink",stages:steps,backing:()=>{},final,height:.68,wall:false,distance:1.75,focus:[0,-.02,.03],tilt:.40,sourceX:-.48};
}
function toiletSpec(){
 const base=PT(0,-.43,0),tankP=PT(0,.11,-.18),supply=[[[ -.31,-.40,-.09],[-.27,-.20,-.15],[-.16,-.06,-.18]]];
 const sequence=[
 put("Position the floor flange","Flange",[base],[flange],"Fit the flange at the drain opening."),
 hold("Secure the flange","Impact driver",[PT(-.08,-.43,0),PT(.08,-.43,0)],"Secure the virtual flange mounting points.",mounted),
 put("Set the gasket on the flange","Seal",[PT(0,-.405,0)],[gasketRing],"Place the gasket on the prepared flange."),
 put("Lower the bowl into position","Bowl",[PT(0,-.43,0)],[bowl],"Lower the bowl onto its mounting position."),
 hold("Secure the bowl base","Socket wrench",[PT(-.125,-.32,.03),PT(.125,-.32,.03)],"Seat the two virtual base fasteners.",mounted),
 put("Fit the tank assembly","Tank",[tankP],[tank],"Position the tank on the bowl."),
 hold("Secure the tank mounting hardware","Socket wrench",[PT(-.10,-.06,-.12),PT(.10,-.06,-.12)],"Secure the simulated tank fittings.",mounted),
 put("Fit the seat","Seat",[PT(0,-.025,.055)],[seat],"Seat the hinged assembly."),
 route("Route the fixture supply","Supply hose",supply,[cold],"Route the supply hose to the tank.",[.009]),
 hold("Seat the supply connection","Adjustable wrench",[supply[0][0],supply[0].at(-1)],"Secure both virtual supply fittings.",(q,i,p)=>cy(q,.014,.022,...p,chrome)),
 hold("Check fill and flush operation","Inspection tester",[PT(.10,.18,-.09),PT(0,-.02,.12),PT(-.23,-.3,-.1)],"Run the simulated fill, flush and leak checks.",()=>{})
 ];
 const final=q=>{placeAt(q,flange,base);placeAt(q,bowl,[0,-.43,0]);placeAt(q,tank,tankP);placeAt(q,seat,[0,-.025,.055]);tube(q,supply[0],cold,.009)};
 return {id:"toilet",stages:sequence,backing:()=>{},final,height:.45,wall:false,distance:1.65,focus:[0,-.03,0],tilt:.36};
}
function ventSpec(){
 // The local work face points upward; this is a floor supply register.
 // Convert physically horizontal parts to the work coordinate system.
 const flat=(factory)=>p=>{const q=g(p);const o=factory(q);o.rotation.x=Math.PI/2;return q};
 const reg=flat(grille),bo=flat(boot),co=flat(collar);
 const run=[[[-.46,-.18,-.07],[-.32,-.18,-.07],[-.25,0,-.07],[-.10,0,-.07]]];
 const seam=[[[-.22,-.13,.004],[.22,-.13,.004],[.22,.13,.004],[-.22,.13,.004],[-.22,-.13,.004]]];
 const seq=[
 click("Mark the floor opening","Pencil",[PT(-.24,-.145,.002),PT(.24,-.145,.002),PT(.24,.145,.002),PT(-.24,.145,.002)],"Mark the register footprint.",markHoles),
 hold("Prepare the register opening","Oscillating cutter",[PT(-.24,0,.003),PT(.24,0,.003),PT(0,-.145,.003),PT(0,.145,.003)],"Prepare the marked virtual opening.",(q,i,p)=>b(q,.022,.012,.005,p[0],p[1],p[2],black)),
 route("Route the supply branch","Duct",run,[duct],"Route the simulated duct toward the opening.",[.055]),
 put("Fit the boot and collar","Duct fitting",[PT(0,0,.015),PT(-.10,0,-.07)],[bo,co],"Seat the boot and connector."),
 route("Seal the register joint","Sealant gun",seam,[gasket],"Seal the entire joint perimeter.",[.006]),
 put("Fit the supply grille","Register",[PT(0,0,.075)],[reg],"Seat the grille over the boot."),
 hold("Secure register hardware","Screwdriver",[PT(-.20,0,.096),PT(.20,0,.096)],"Secure the grille fasteners.",mounted),
 hold("Verify simulated airflow","Airflow meter",[PT(0,0,.12)],"Check the virtual register airflow.",()=>{})
 ];
 const final=q=>{placeAt(q,reg,[0,0,.075]);};
 return {id:"vent",stages:seq,backing:()=>{},final,height:.045,wall:false,distance:1.10,focus:[0,0,0],floorFace:true};
}
function airSpec(){
 const pos=PT(0,0,0),fanP=PT(0,-.16,.29),filterP=PT(0,.19,.29),coverP=PT(0,0,.32);
 const collarPts=[PT(-.19,.47,-.02),PT(.19,.47,-.02)];
 const ducts=[[[-.19,.47,-.02],[-.19,.64,-.02],[-.38,.69,-.02]],[[.19,.47,-.02],[.19,.64,-.02],[.40,.69,-.02]]];
 const drainPath=[[[.27,-.34,.23],[.40,-.34,.23],[.40,-.48,.23],[.53,-.48,.12]]];
 const seq=[
 hold("Check the equipment support","Spirit level",[PT(-.21,-.46,.1),PT(.21,-.46,.1)],"Check both sides of the mounting base.",()=>{}),
 put("Position the air-handler cabinet","Cabinet",[pos],[handlerCab],"Set the enclosure on its base."),
 hold("Secure the cabinet supports","Impact driver",[PT(-.29,-.40,.26),PT(.29,-.40,.26)],"Secure the support hardware.",mounted),
 put("Install the blower assembly","Blower",[fanP],[fan],"Fit the fan assembly into the equipment opening."),
 put("Install the filter","Filter",[filterP],[filter],"Slide the filter into its frame."),
 put("Fit the supply and return collars","Collars",collarPts,[collar,collar],"Fit both round duct connections."),
 route("Route the supply and return ducts","Duct",ducts,[duct,duct],"Route both simulated ducts.",[.091,.091]),
 hold("Secure the duct fittings","Duct crimper",collarPts,"Secure the virtual duct connections.",(q,i,p)=>cy(q,.112,.02,...p,chrome)),
 route("Route the condensate drain","Drain pipe",drainPath,[pvc],"Route the virtual condensate drain.",[.014]),
 hold("Seat the drain fitting","Adjustable wrench",[drainPath[0][0]],"Seat the virtual drain fitting.",(q,i,p)=>cy(q,.020,.025,...p,pvc)),
 put("Fit the isolated control module","Control module",[PT(.23,.08,.30)],[p=>{const q=g(p);round(q,.10,.14,.025,0,0,0,blue,.006);for(let i=0;i<3;i++)b(q,.074,.012,.008,0,-.04+i*.04,.017,silver);return q}],"Seat the game controller."),
 hold("Check the isolated control and blower","Inspection tester",[PT(.23,.08,.34),PT(0,-.16,.33)],"Run isolated virtual controls and blower checks.",()=>{}),
 put("Fit the service access panel","Access panel",[coverP],[access],"Close the equipment housing."),
 hold("Secure service panel fasteners","Screwdriver",[PT(-.29,.38,.34),PT(.29,.38,.34),PT(-.29,-.38,.34),PT(.29,-.38,.34)],"Secure the service panel.",mounted),
 hold("Verify virtual airflow and drainage","Airflow meter",[PT(-.19,.57,.08),PT(.19,.57,.08),PT(.40,-.34,.23)],"Run the game's airflow and drain checks.",()=>{})
 ];
 const final=q=>{handlerCab(q);placeAt(q,fan,fanP);placeAt(q,filter,filterP);collarPts.forEach(p=>placeAt(q,collar,p));ducts.forEach(p=>tube(q,p,duct,.091));tube(q,drainPath[0],pvc,.014);placeAt(q,access,coverP)};
 return {id:"air",stages:seq,backing:()=>{},final,height:.48,wall:false,distance:2.25,focus:[0,.09,.05],tilt:.17};
}
const specs=Object.fromEntries([electricalSpec("outlet"),electricalSpec("switch"),electricalSpec("three"),sinkSpec(),toiletSpec(),ventSpec(),airSpec()].map(s=>[s.id,s]));
export const tradeStageCounts=Object.fromEntries(Object.entries(specs).map(([id,s])=>[id,s.stages.map(a=>a.targets.length)]));
export function tradeSpec(id){return specs[id]}
export function fixtureAssembly(parent,id){const q=g(parent);if(id==="breaker")installed(q);else specs[id].final(q);return q}
export function finishedTrade(parent,id,side=1){const s=specs[id];if(!s)return null;const q=g(parent,0,s.height,s.wall?.10*side:0);if(side<0&&s.wall)q.rotation.y=Math.PI;if(s.floorFace)q.rotation.x=-Math.PI/2;s.final(q);return q}

export const panelStageCounts=stages.map(s=>s.targets.length);
export function createPanelState(){return {stage:0,done:[]}}
export function panelAction(s,i){const a=stages[s.stage];if(!a||!Number.isInteger(i)||i<0||i>=a.targets.length||s.done.includes(i))return false;s.done.push(i);return true}
export function panelAdvance(s){const a=stages[s.stage];if(!a||s.done.length!==a.targets.length)return false;s.stage++;s.done=[];return true}
export function startPanelWork({id="breaker",engine,canvas,origin,orientation,scale,rotation=0,side=1,hud,onComplete,onCancel}){
 const spec=specs[id]||null,jobStages=spec?.stages||stages;
 const canAdvance=s=>{const a=jobStages[s.stage];if(!a||s.done.length!==a.targets.length)return false;s.stage++;s.done=[];return true};
 const perform=(s,i)=>{const a=jobStages[s.stage];if(!a||!Number.isInteger(i)||i<0||i>=a.targets.length||s.done.includes(i))return false;s.done.push(i);return true};
 const root=g(engine.scene,origin.x,origin.y,origin.z);if(orientation)root.quaternion.copy(orientation);else{root.rotation.y=rotation+(side<0?Math.PI:0);if(spec?.floorFace)root.rotation.x=-Math.PI/2;}if(scale)root.scale.copy(scale);root.updateMatrixWorld(true);
 const oldCamera=engine.camera.position.clone(),oldRotation=engine.camera.quaternion.clone();const state=createPanelState(),ray=new THREE.Raycaster(),plane=new THREE.Plane(),ndc=new THREE.Vector2();let live=true,stageRoot,markers=[],sources=[],active=null,hover=null,clock=0,raf=0;
 const hudText=hud.querySelector("[data-panel-text]"),progress=hud.querySelector("[data-panel-progress]"),tool=hud.querySelector("[data-panel-tool]"),bar=hud.querySelector("[data-panel-fill]"),cancel=hud.querySelector("[data-panel-cancel]");
 const glow=new THREE.MeshBasicMaterial({color:"#e9cf79",transparent:true,opacity:.8,depthTest:false});
 const doneGlow=new THREE.MeshBasicMaterial({color:"#9ee0a0",transparent:true,opacity:.7,depthTest:false});
 const guideMat=new THREE.LineDashedMaterial({color:"#e7d68a",dashSize:.013,gapSize:.009,depthTest:false,transparent:true,opacity:.8});
 let liveRoute=null;
 const cursor=new THREE.Mesh(new THREE.RingGeometry(.013,.016,24),glow);root.add(cursor);cursor.visible=false;cursor.renderOrder=12;
 const toolModel=g(root);toolModel.visible=false;
 function disposeObj(o){o.traverse(v=>{if(v.geometry)v.geometry.dispose();if(v.material?.userData.owned){v.material.map?.dispose();v.material.dispose()}});o.removeFromParent()}
 function place(factory,parent,p){const q=factory(parent);q.position.set(...p);return q}
 function localFromPointer(e){
 const r=canvas.getBoundingClientRect();ndc.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(ndc,engine.camera);
 const n=V(0,0,1).applyQuaternion(root.quaternion);plane.setFromNormalAndCoplanarPoint(n,root.localToWorld(V(0,0,.15)));const p=ray.ray.intersectPlane(plane,V());return p?root.worldToLocal(p):null
 }
 const markerPoint=p=>V(p[0],p[1],p[2]+.026);const screen=p=>{const v=root.localToWorld(p.clone()).project(engine.camera),r=canvas.getBoundingClientRect();return {x:(v.x+1)*r.width/2,y:(1-v.y)*r.height/2}};const pointer=e=>{const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}};const d2=(a,p)=>{const q=screen(markerPoint(p));return Math.hypot(a.x-q.x,a.y-q.y)};
 function nearest(a,pts,r,exclude=[]){let hit=-1,best=r;pts.forEach((p,i)=>{const d=d2(a,p);if(!exclude.includes(i)&&d<best){best=d;hit=i}});return hit}
 function ring(p,done=false,r=.015){const o=mesh(stageRoot,new THREE.RingGeometry(r*.66,r,28),done?doneGlow:glow,p[0],p[1],p[2]+.026);o.renderOrder=10;return o}
 function buildTool(name){for(const o of [...toolModel.children])disposeObj(o);handTool(toolModel,name)}
 function prior(n){return state.stage>n}
 function stageDone(n,i){return prior(n)||state.stage===n&&state.done.includes(i)}
 function draw(){
 if(stageRoot)disposeObj(stageRoot);stageRoot=g(root);markers=[];sources=[];
 const st=jobStages[state.stage];
 if(spec){spec.backing(stageRoot);for(let n=0;n<=state.stage;n++){const a=jobStages[n];if(a.after)for(let i=0;i<a.targets.length;i++)if(stageDone(n,i))a.after(stageRoot,i,a.targets[i]);}}else{
 // Backing exists in the room, not in a detached workbench.
 // Actual framed wall remains visible behind the cabinet.
 if(stageDone(0,0)){const t=b(stageRoot,.064,.088,.013,-.31,.32,.03,red);note(stageRoot,"LOCKED",-.31,.32,.039);}
 if(stageDone(1,0))note(stageRoot,"ISOLATED",-.31,.21,.037);
 if(!prior(4)){for(let i=0;i<mounts.length;i++){const [x,y]=mounts[i];if(stageDone(2,i))b(stageRoot,.012,.003,.002,x,y,.003,black);if(stageDone(3,i))cy(stageRoot,.006,.004,x,y,.005,dark).rotation.x=Math.PI/2;}}
 if(stageDone(4,0)){
 cabinet(stageRoot);
 for(let i=0;i<mounts.length;i++)if(stageDone(5,i))place(screw,stageRoot,mounts[i]);
 for(let i=0;i<entries.length;i++){const [x,y,z]=entries[i];if(stageDone(6,i))cy(stageRoot,.013,.005,x,y+.012,z,black);if(stageDone(7,i))place(fitting,stageRoot,entries[i]);if(stageDone(8,i))tube(stageRoot,jacketPaths[i],black,.012);if(stageDone(9,i)){const q=jacketPaths[i].at(-1);for(let j=0;j<3;j++)tube(stageRoot,[q,[q[0]+(j-1)*.012,q[1]-.023,.082]],[lead,white,ground][j],.004);}}
 for(let i=0;i<slots.length;i++)if(stageDone(10,i))place(breaker,stageRoot,slots[i]);
 paths.forEach((p,i)=>{if(stageDone(11,i))tube(stageRoot,p.pts,p.mat,.004);if(stageDone(12,i)){const q=screw(stageRoot);q.position.set(...connections[i]);q.position.z+=.012;}});
 for(let i=0;i<slots.length;i++)if(stageDone(13,i))note(stageRoot,circuits[i],.085,slots[i][1],.112);
 if(stageDone(15,0)){const o=panelCover(stageRoot);o.position.z=.128;for(let i=0;i<4;i++)if(stageDone(16,i))place(screw,stageRoot,coverPoints[i]);}
 }
 }
 if(st.mode==="drag"){
 st.sources.forEach((p,i)=>{if(state.done.includes(i))return;const fac=spec?st.parts[i]:state.stage===4?cabinet:state.stage===7?fitting:state.stage===10?breaker:state.stage===13?(q=>note(q,circuits[i],0,0,0)):panelCover;const o=place(fac,stageRoot,p);if(spec){o.scale.setScalar(.42)}else if(state.stage===4||state.stage===15)o.scale.setScalar(.45);sources[i]=o;ring(p,false,.022)});
 }
 if(st.mode==="route") {
 // Work one conductor at a time; overlapping starts cannot steal a different route.
 const i=st.targets.findIndex((_,n)=>!state.done.includes(n));if(i>=0){
 const pts=st.paths[i];const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p=>markerPoint(p))),guideMat);line.computeLineDistances();line.renderOrder=9;stageRoot.add(line);pts.forEach((p,n)=>ring(p,false,n===0?.018:.009));
 }
 } else st.targets.forEach((p,i)=>ring(p,state.done.includes(i),st.mode==="drag"?.022:.014));
 buildTool(st.tool);hudText.textContent=st.title+" — "+st.hint;tool.textContent=st.tool;progress.textContent=(state.stage+1)+" / "+jobStages.length+" · "+state.done.length+" / "+st.targets.length;bar.style.width=100*(state.stage+state.done.length/st.targets.length)/jobStages.length+"%";
 }
 function success(i){if(!perform(state,i))return;if(liveRoute){disposeObj(liveRoute);liveRoute=null;}active=null;toolModel.visible=false;cursor.visible=false;if(canAdvance(state)){if(state.stage===jobStages.length){cleanup();onComplete();return}}draw()}
 function stop(){if(liveRoute){disposeObj(liveRoute);liveRoute=null;}active=null;cancelAnimationFrame(raf);raf=0;toolModel.visible=false;cursor.visible=false}
 function down(e){if(!live||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();const st=jobStages[state.stage],p=localFromPointer(e),s=pointer(e);if(!p)return;const i=st.mode==="drag"?nearest(s,st.sources,52,state.done):st.mode==="route"?st.targets.findIndex((_,n)=>!state.done.includes(n)):nearest(s,st.targets,25,state.done);if(i<0||st.mode==="route"&&d2(s,st.paths[i][0])>30)return;
 canvas.setPointerCapture(e.pointerId);
 if(st.mode==="click"){success(i);return}
 active={i,pointer:e.pointerId,start:performance.now(),last:p.clone(),lastScreen:s,next:1};
 if(st.mode==="hold"){toolModel.visible=true;toolModel.position.set(st.targets[i][0],st.targets[i][1]-.02,.205);const loop=t=>{if(!live||!active)return;const f=Math.min(1,(t-active.start)/750);toolModel.rotation.z=Math.sin(f*30)*.15;if(f===1){success(i)}else raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop)}
 else if(st.mode==="drag"){active.obj=sources[i];active.original=active.obj.position.clone()}
 }
 function move(e){if(!live)return;e.stopImmediatePropagation();const st=jobStages[state.stage],p=localFromPointer(e);if(!p)return;cursor.visible=true;cursor.position.set(p.x,p.y,.21);
 if(!active)return;if(st.mode==="drag"){active.obj.position.set(p.x,p.y,.20)}
 else if(st.mode==="hold"&&d2(pointer(e),st.targets[active.i])>40)stop();
 else if(st.mode==="route"){const pts=st.paths[active.i],a=active.lastScreen,b=pointer(e);const len=Math.hypot(a.x-b.x,a.y-b.y);for(let j=1,n=Math.max(1,Math.ceil(len/5));j<=n;j++){const q={x:a.x+(b.x-a.x)*j/n,y:a.y+(b.y-a.y)*j/n};if(active.next<pts.length&&d2(q,pts[active.next])<19)active.next++}active.lastScreen=b;active.last=p.clone();if(liveRoute)disposeObj(liveRoute);const drawn=[...pts.slice(0,active.next).map(q=>[q[0],q[1],q[2]+.026]),[p.x,p.y,.15]];if(drawn.length>1&&drawn.some(q=>Math.hypot(q[0]-drawn[0][0],q[1]-drawn[0][1])>.002))liveRoute=tube(root,drawn,toolOrange,.005);if(active.next===pts.length){const i=active.i;success(i)}}
 }
 function up(e){if(!live)return;e.stopImmediatePropagation();if(!active)return;const st=jobStages[state.stage],a=active,p=localFromPointer(e);if(st.mode==="drag"){if(p&&d2(pointer(e),st.targets[a.i])<38){success(a.i);return}a.obj.position.copy(a.original)}stop()}
 function wheel(e){if(live){e.preventDefault();e.stopImmediatePropagation()}}
 function key(e){if(live&&e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();cleanup();onCancel()}}
 function cleanup(){if(!live)return;live=false;stop();for(const [n,f] of [["pointerdown",down],["pointermove",move],["pointerup",up],["pointercancel",up],["wheel",wheel]])canvas.removeEventListener(n,f,true);window.removeEventListener("keydown",key,true);disposeObj(root);glow.dispose();doneGlow.dispose();guideMat.dispose();hud.classList.add("hidden");engine.camera.position.copy(oldCamera);engine.camera.quaternion.copy(oldRotation);}
 for(const [n,f] of [["pointerdown",down],["pointermove",move],["pointerup",up],["pointercancel",up],["wheel",wheel]])canvas.addEventListener(n,f,{capture:true,passive:false});window.addEventListener("keydown",key,true);
 cancel.onclick=()=>{cleanup();onCancel()};hud.classList.remove("hidden");draw();
 function frame(){if(!live)return;root.updateMatrixWorld(true);const f=spec?.focus||[-.04,.015,.05],distance=(spec?.distance||1.18)*Math.max(1,1.15/engine.camera.aspect),tilt=spec?.tilt||0;const target=root.localToWorld(V(f[0],f[1]-.045,f[2]));const camera=root.localToWorld(V(f[0],f[1]+tilt*distance,f[2]+distance));engine.camera.position.copy(camera);engine.camera.lookAt(target);engine.camera.updateMatrixWorld(true)}
 frame();return {frame,dispose:cleanup,state};
}
