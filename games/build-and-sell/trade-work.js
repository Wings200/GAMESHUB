
/* Equipment-specific simulated trade workflows. No live electrical, gas or pressurized work. */
const pick=(title,hint,options,answer)=>({kind:"pick",title,hint,options,answer});
const align=(title,hint,labels)=>({kind:"align",title,hint,labels});
const mark=(title,hint,points)=>({kind:"mark",title,hint,points});
const fasten=(title,hint,points)=>({kind:"fasten",title,hint,points});
const drag=(title,hint,parts)=>({kind:"drag",title,hint,parts});
const trace=(title,hint,paths)=>({kind:"trace",title,hint,paths});
const gauge=(title,hint,label)=>({kind:"gauge",title,hint,label});
const test=(title,hint,checks)=>({kind:"test",title,hint,checks});
const label=(title,hint,labels)=>({kind:"label",title,hint,labels});
const P=(x,y)=>[x,y];
const piece=(name,x,y,tx,ty,color="#a8bbc1")=>({name,x,y,tx,ty,color});
const path=(name,color,pts)=>({name,color,pts});
const modules=[piece("LIGHTS",95,100,330,127),piece("RECEPTACLES",95,160,330,181),piece("UTILITY",95,220,330,235),piece("SPARE",95,280,330,289)];
const circuits=["LIGHTS","RECEPTACLES","UTILITY"];
const enclosurePoints=[P(267,76),P(473,76),P(267,328),P(473,328)];
const two=[P(370,75),P(370,326)];
export const workflows={
 breaker:[
  pick("Review the panel work order","Choose the enclosure that matches the fictional job sheet: four branch positions and an indoor mount.",["Two-position outdoor box","Four-position indoor panel","Control relay cabinet"],1),
  test("Establish an isolated work area","Complete the simulated safety verification before handling any components.",["Supply isolated","Isolation tagged","Game tester self-check","Work area verified isolated"]),
  align("Set out enclosure position","Center the panel between framing members and level it before marking.",["Horizontal alignment","Level"]),
  mark("Mark the mounting locations","Transfer all four mounting locations onto the framing.",enclosurePoints),
  fasten("Prepare the mounting holes","Work through each marked location with the drill tool.",enclosurePoints),
  drag("Place the empty enclosure","Lift the cabinet onto the prepared mounting outline.",[piece("EMPTY CABINET",100,200,370,203,"#9ba9ac")]),
  fasten("Secure the cabinet","Seat each mounting fastener using the driver interaction.",enclosurePoints),
  mark("Prepare cable-entry openings","Select only the marked entry positions specified by this simulated enclosure.",[P(300,62),P(370,62),P(440,62)]),
  drag("Fit cable-entry hardware","Install each game fitting into its indicated opening.",[piece("A",80,100,300,62),piece("B",80,175,370,62),piece("C",80,250,440,62)]),
  trace("Bring branch cables into the enclosure","Route the three labeled game cables through their marked paths. Keep paths tidy.",[
    path("Lighting cable","#e5b66b",[P(300,28),P(300,70),P(288,112),P(288,152)]),
    path("Receptacle cable","#8fbde1",[P(370,28),P(370,70),P(385,112),P(385,175)]),
    path("Utility cable","#9dd19f",[P(440,28),P(440,70),P(453,134),P(453,209)])]),
  gauge("Prepare the simulated cable ends","Use the preparation tool and stop inside the marked game tolerance. The meter is fictional, not a real stripping dimension.","Preparation"),
  drag("Install the branch modules","Fit each module in its assigned game-board slot.",modules),
  trace("Dress the internal cable paths","Guide the abstract circuit leads along the enclosure's indicated channels.",[
    path("L circuit","#e5b66b",[P(288,152),P(301,152),P(301,127),P(330,127)]),
    path("R circuit","#8fbde1",[P(385,175),P(402,175),P(402,181),P(330,181)]),
    path("U circuit","#9dd19f",[P(453,209),P(443,235),P(330,235)])]),
  drag("Seat the isolated circuit connections","Use the supplied fictional terminal IDs. This is a game connector map, not a service-panel wiring diagram.",[piece("L1",120,105,330,127,"#e5b66b"),piece("R2",120,175,330,181,"#8fbde1"),piece("U3",120,245,330,235,"#9dd19f"),piece("B4",120,310,410,289,"#b9c9c6")]),
  gauge("Check connection seating","Rotate the virtual driver into the indicated acceptance band. The gauge uses game units.","Connection seating"),
  label("Make the circuit directory","Label each installed branch with its work-order circuit name.",circuits),
  test("Inspect the isolated assembly","Verify all four simulated inspection items.",["All connectors seated","Cable paths clear","Branch modules secured","Directory matches work order"]),
  drag("Fit the protective cover","Place the cover over the finished assembly.",[piece("PANEL COVER",100,200,370,203,"#a2b3b8")]),
  fasten("Secure the protective cover","Finish each indicated cover fastener.",[P(279,88),P(461,88),P(279,316),P(461,316)]),
  test("Commission the virtual panel","Run each virtual branch test. No live energization is simulated.",["Lighting branch test","Receptacle branch test","Utility branch test","Simulated protective-device test"])
 ],
 outlet:[
  pick("Review the outlet work order","Choose the specified game fixture: duplex receptacle for a framed wall.",["Duplex receptacle","Single light switch","Air grille"],0),
  test("Verify isolation","Check the game's isolated circuit.",["Isolation confirmed","Tester check"]),
  align("Position the wall box","Align the box with the chosen wall surface.",["Box alignment","Level"]),
  drag("Install the box",[ "Position the box in the mounting outline." ].join(""),[piece("BOX",100,200,370,200)]),
  fasten("Secure the box","Fasten the mounting points.",two),
  trace("Route the simulated cable","Follow the marked path through the wall to the box.",[path("Cable","#d7b16e",[P(120,45),P(230,45),P(230,180),P(310,180)])]),
  gauge("Prepare connector ends","Stop the game preparation gauge inside the target band.","Preparation"),
  drag("Fit the isolated device connectors","Match the three fictional socket IDs from the work order.",[piece("A",105,105,330,145,"#d9b36e"),piece("B",105,190,410,190,"#bdc9ce"),piece("C",105,275,330,245,"#80c89f")]),
  drag("Seat the receptacle","Place the device into the box.",[piece("DEVICE",110,200,370,200,"#e1e3d5")]),
  fasten("Install the cover plate","Secure the two indicated plate fasteners.",two),
  test("Test the virtual receptacle","Run game continuity and device checks.",["Connector continuity","Protective path check","Virtual receptacle test"])
 ],
 switch:[
  pick("Select the lighting control","The work order calls for one light controlled from one location.",["Two-location controller","Single switch","Duplex outlet"],1),
  test("Verify isolation","Check the isolated game circuit.",["Isolation confirmed","Tester check"]),
  align("Set the switch box","Align the box with the wall.",["Box position","Level"]),
  fasten("Secure the box","Install both mounting points.",two),
  trace("Route the lighting-control cable","Follow the route from the game light to its control.",[path("Lighting path","#d8b06c",[P(110,70),P(245,70),P(245,200),P(330,200)])]),
  drag("Connect the control mechanism","Fit the abstract input and output connectors.",[piece("IN",100,110,330,150),piece("OUT",100,260,410,245)]),
  drag("Fit the switch and plate","Seat the switch assembly into its box.",[piece("SWITCH",110,200,370,200,"#e4e5d8")]),
  fasten("Secure the plate","Finish the indicated fasteners.",two),
  test("Check switch operation","Verify that the virtual lamp changes state.",["Lamp off with switch off","Lamp on with switch on","Repeated switching check"])
 ],
 three:[
  pick("Review the two-location lighting job","Select the pair of controls specified for one shared lamp.",["One standard switch","Two-location switch set","Receptacle pair"],1),
  test("Isolate the simulated lighting system","Verify the isolated work area.",["Isolation confirmed","Tester check"]),
  align("Align both switch boxes","Match the mounting positions for the two stations.",["Station A","Station B"]),
  drag("Mount both boxes","Place the two boxes at their respective stations.",[piece("BOX A",100,125,300,200),piece("BOX B",100,265,440,200)]),
  trace("Route the inter-switch paths","Guide the two abstract traveler paths between the game switches.",[path("Traveler A","#e5b66b",[P(290,145),P(290,90),P(450,90),P(450,145)]),path("Traveler B","#8ebbe0",[P(290,245),P(290,307),P(450,307),P(450,245)])]),
  drag("Fit station A connections","Match the simulated connector IDs at the first station.",[piece("A1",100,100,280,150),piece("T1",100,200,300,200),piece("T2",100,300,320,250)]),
  drag("Fit station B connections","Match the second station's fictional connector IDs.",[piece("B1",100,100,420,150),piece("T1",100,200,440,200),piece("T2",100,300,460,250)]),
  drag("Seat both controls","Place each control into its own box.",[piece("SWITCH A",100,125,300,200),piece("SWITCH B",100,265,440,200)]),
  fasten("Fit both cover plates","Secure both plates.",[P(300,100),P(300,300),P(440,100),P(440,300)]),
  test("Test both switching locations","Exercise every virtual switch combination.",["A0 / B0","A1 / B0","A1 / B1","A0 / B1"])
 ],
 sink:[
  pick("Review the sink work order","Select the basin and faucet assembly specified for the cabinet.",["Wall grille","Single-basin sink","Toilet tank"],1),
  align("Align the sink opening","Center the basin in the counter template.",["Left/right fit","Front/back fit"]),
  trace("Apply the virtual rim seal","Trace the entire marked rim without leaving gaps.",[path("Rim seal","#c9d6b1",[P(245,115),P(450,115),P(450,285),P(245,285),P(245,115)])]),
  drag("Seat the basin","Lower the basin into the counter.",[piece("BASIN",100,200,370,200,"#c5d1d2")]),
  fasten("Secure the basin clips","Fit the clips around the rim.",[P(245,115),P(450,115),P(450,285),P(245,285)]),
  drag("Install the faucet assembly","Fit faucet and drain hardware into their indicated openings.",[piece("FAUCET",100,100,370,90),piece("DRAIN",100,260,370,220)]),
  trace("Fit the supply and waste routes","Trace the hot, cold and waste game paths separately.",[path("Hot","#e59080",[P(150,100),P(250,100),P(250,160),P(325,160)]),path("Cold","#83b8e4",[P(150,230),P(275,230),P(275,160),P(415,160)]),path("Waste","#b4b9b6",[P(370,220),P(370,310),P(510,310)])]),
  gauge("Check fitting seating","Stop in the simulated fitting tolerance.","Joint seating"),
  test("Run sink checks","Verify the virtual flow and drain results.",["Hot flow","Cold flow","Drain clears","Leak inspection"])
 ],
 toilet:[
  pick("Review the toilet work order","Select the floor-mounted fixture specified by the plan.",["Floor-mounted toilet","Basin","Air handler"],0),
  align("Align the fixture base","Line up the base with the game floor opening.",["Centering","Orientation"]),
  drag("Fit the base seal and hardware","Place the gasket and both mounting pieces.",[piece("SEAL",100,100,370,236,"#ceb995"),piece("LEFT MOUNT",100,190,286,236),piece("RIGHT MOUNT",100,285,454,236)]),
  drag("Lower the bowl into position","Seat the bowl over the prepared opening.",[piece("BOWL",100,200,370,236,"#e4e8dc")]),
  gauge("Level and secure the base","Check the game base-seating gauge.","Base seating"),
  drag("Assemble the tank","Fit the tank and its abstract internal components.",[piece("TANK",100,100,370,100,"#dfe5d8"),piece("FILL MODULE",100,190,330,135),piece("FLUSH MODULE",100,280,410,135)]),
  trace("Connect the fixture supply","Follow the marked simulated supply path.",[path("Supply","#82b5df",[P(155,310),P(220,310),P(220,150),P(290,150)])]),
  test("Run the flush and leak checks","Test the fill, flush and refill cycle.",["Tank fills","Flush cycle","Tank refills","Base leak check"])
 ],
 vent:[
  pick("Select the room terminal","This work order calls for a supply register, not a return grille.",["Return grille","Supply register","Filter cabinet"],1),
  align("Set the register opening","Center and align the grille with the opening.",["Opening alignment","Orientation"]),
  trace("Route the supply branch","Follow the marked duct centerline to the terminal.",[path("Duct","#aabdc8",[P(120,80),P(240,80),P(240,185),P(370,185)])]),
  drag("Fit the boot and connector","Seat the duct boot in the prepared opening.",[piece("BOOT",95,130,370,185),piece("COLLAR",95,260,300,185)]),
  trace("Seal the joint perimeter","Trace the virtual connection seam.",[path("Seal","#dbc48b",[P(265,130),P(475,130),P(475,260),P(265,260),P(265,130)])]),
  drag("Install the register","Fit the grille over the boot.",[piece("GRILLE",100,200,370,200)]),
  fasten("Secure the register","Fasten the two indicated mounting points.",[P(250,200),P(490,200)]),
  gauge("Set the game airflow balance","Adjust the virtual register to the requested airflow band.","Airflow"),
  test("Check room terminal operation","Verify airflow and noise results in the simulation.",["Airflow check","Joint leak check","Grille secure"])
 ],
 air:[
  pick("Review the air-handler work order","Choose the specified game unit and matching filter cabinet.",["Room register","Indoor air handler","Electrical enclosure"],1),
  align("Prepare the equipment base","Level the equipment mounting surface.",["Side-to-side level","Front-to-back level"]),
  drag("Set the equipment on its base","Position the virtual air handler.",[piece("UNIT",100,200,370,200,"#a5b7ba")]),
  fasten("Secure the support points","Fit the indicated support hardware.",[P(270,310),P(470,310)]),
  drag("Fit return and supply collars","Seat the two labeled duct connections.",[piece("RETURN",100,115,300,85),piece("SUPPLY",100,270,440,85)]),
  trace("Route supply and return ducts","Follow each marked duct route.",[path("Return","#9bb7ca",[P(120,100),P(200,100),P(200,85),P(300,85)]),path("Supply","#b9cbd4",[P(440,85),P(530,85),P(530,255),P(625,255)])]),
  trace("Seal the duct connections","Trace both seam outlines.",[path("Return seal","#d0c49a",[P(260,70),P(340,70),P(340,105),P(260,105),P(260,70)]),path("Supply seal","#d0c49a",[P(400,70),P(480,70),P(480,105),P(400,105),P(400,70)])]),
  drag("Fit the filter and condensate module","Install the replaceable filter and simulated drain component.",[piece("FILTER",100,120,370,150),piece("DRAIN",100,280,370,295)]),
  trace("Route the condensate drain","Follow the designated game drain route.",[path("Drain","#8eb4ce",[P(370,295),P(440,295),P(440,335),P(580,335)])]),
  drag("Fit the isolated control connector","Connect the virtual controller to its marked port.",[piece("CONTROL",100,200,445,205,"#d1b17e")]),
  gauge("Balance simulated air delivery","Adjust the virtual fan control to the target range.","Fan output"),
  test("Commission the air system","Run each independent system check.",["Fan operation","Filter fitted","Supply airflow","Return airflow","Drain check"])
 ]
};
export function createWork(id){if(!workflows[id])throw Error("Unknown work order");return {id,index:0,done:[],values:[],message:"",passed:[]}}
export function stageReady(st){
 const p=workflows[st.id][st.index];if(!p)return false;
 if(p.kind==="pick")return st.values[0]===p.answer;
 if(p.kind==="align")return p.labels.every((_,i)=>Math.abs((st.values[i]??0)-50)<=4);
 if(p.kind==="gauge")return Math.abs((st.values[0]??0)-50)<=5;
 if(p.kind==="label")return p.labels.every((v,i)=>(st.values[i]||"").trim().toUpperCase()===v);
 const n=p.points?.length??p.parts?.length??p.paths?.length??p.checks?.length??0;
 return n>0&&Array.from({length:n},(_,i)=>i).every(i=>st.done.includes(i));
}
export function advance(st){if(!stageReady(st))return false;st.passed.push(st.index);st.index++;st.done=[];st.values=[];st.message="";return true}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const line=(pts)=>pts.map((p,i)=>(i?"L":"M")+p[0]+" "+p[1]).join(" ");
const closeTo=(p,q,r=30)=>Math.hypot(p[0]-q[0],p[1]-q[1])<=r;
function art(id,st){
 const passed=workflows[id].slice(0,st.index).map(x=>x.title);
 const has=(q)=>passed.some(x=>x.toLowerCase().includes(q));
 const current=workflows[id][st.index];
 let svg='<rect width="740" height="390" rx="12" fill="#172322"/><path d="M0 40 H740 M0 350 H740" stroke="#2b413d"/>';
 if(id==="breaker"){
 svg+='<rect x="225" y="42" width="290" height="304" rx="6" fill="#605e4d"/><rect x="238" y="42" width="19" height="304" fill="#ae895e"/><rect x="483" y="42" width="19" height="304" fill="#ae895e"/>';
 const mounted=has("empty enclosure")||st.index>=6;
 svg+='<rect x="259" y="56" width="222" height="285" rx="7" fill="'+(mounted?"#6d8086":"#263732")+'" stroke="#9eb1ad" stroke-width="3" '+(!mounted?'stroke-dasharray="7 6"':'')+'/>';
 if(mounted){
 svg+='<rect x="277" y="91" width="185" height="231" rx="4" fill="#26373e"/><rect x="310" y="106" width="42" height="205" fill="#536469"/><rect x="398" y="106" width="28" height="205" fill="#697d7e"/>';
 [127,181,235,289].forEach((y,i)=>{svg+='<rect x="313" y="'+(y-17)+'" width="68" height="34" rx="4" fill="'+(has("branch modules")?"#39444a":"#28383e")+'" stroke="#9fadaf" '+(!has("branch modules")?'stroke-dasharray="4 4"':'')+'/>';if(has("branch modules"))svg+='<rect x="337" y="'+(y-9)+'" width="22" height="18" rx="3" fill="#151f24"/><text x="370" y="'+(y+4)+'" fill="#dce4df" font-size="8">'+(i+1)+'</text>';});
 if(has("cable-entry hardware"))[300,370,440].forEach(x=>svg+='<circle cx="'+x+'" cy="62" r="10" fill="#bbc8c5" stroke="#4b6263" stroke-width="5"/>');
 if(has("branch cables"))for(const p of workflows.breaker[9].paths)svg+='<path d="'+line(p.pts)+'" fill="none" stroke="'+p.color+'" stroke-width="5" stroke-linejoin="round"/>';
 if(has("internal cable paths"))for(const p of workflows.breaker[12].paths)svg+='<path d="'+line(p.pts)+'" fill="none" stroke="'+p.color+'" stroke-width="4" stroke-linejoin="round"/>';
 if(has("circuit directory"))svg+='<rect x="433" y="260" width="30" height="53" fill="#e2e0ce"/>'+circuits.map((c,i)=>'<text x="435" y="'+(272+i*14)+'" fill="#343d38" font-size="4.6">'+c+'</text>').join("");
 if(has("protective cover")&&st.index>=18)svg+='<rect x="259" y="56" width="222" height="285" rx="6" fill="#99a8ac" stroke="#d2dcdb" stroke-width="3"/><rect x="309" y="107" width="77" height="205" fill="#46565c"/><rect x="430" y="264" width="31" height="51" fill="#e2e0ce"/>';
 }
 }else if(id==="outlet"||id==="switch"||id==="three"){
 const xs=id==="three"?[300,440]:[370];
 for(const x of xs){svg+='<rect x="'+(x-58)+'" y="72" width="116" height="260" rx="9" fill="#536b6c" stroke="#8aa2a0" stroke-width="4"/><rect x="'+(x-39)+'" y="100" width="78" height="205" rx="6" fill="#c6cbbd"/>';
 if(id==="outlet"){for(const y of [145,244])svg+='<rect x="'+(x-30)+'" y="'+(y-36)+'" width="60" height="72" rx="16" fill="#eee9d5"/><path d="M'+(x-10)+' '+(y-14)+' v20 M'+(x+10)+' '+(y-14)+' v20" stroke="#34423d" stroke-width="6"/><circle cx="'+x+'" cy="'+(y+17)+'" r="4" fill="#34423d"/>';}
 else svg+='<rect x="'+(x-20)+'" y="152" width="40" height="94" rx="5" fill="#f1eddb"/><path d="M'+(x-20)+' 200 h40" stroke="#839187" stroke-width="3"/>';}
 }else if(id==="sink"){
 svg+='<rect x="215" y="80" width="310" height="250" rx="20" fill="#9d8d72"/><rect x="235" y="105" width="270" height="190" rx="42" fill="#c1d0ce" stroke="#eef2e6" stroke-width="5"/><rect x="256" y="124" width="228" height="149" rx="34" fill="#638284"/><circle cx="370" cy="220" r="17" fill="#354a4e" stroke="#c9d7d2" stroke-width="5"/><path d="M370 116 V78 Q370 53 394 53 Q417 53 417 89" fill="none" stroke="#d4dfdb" stroke-width="14" stroke-linecap="round"/>';
 }else if(id==="toilet"){
 svg+='<rect x="286" y="53" width="168" height="111" rx="14" fill="#d6dacf" stroke="#a6bab3" stroke-width="4"/><ellipse cx="370" cy="237" rx="99" ry="100" fill="#e9ece0" stroke="#a6bab3" stroke-width="5"/><ellipse cx="370" cy="237" rx="68" ry="71" fill="#9dbdc3"/><ellipse cx="370" cy="241" rx="40" ry="48" fill="#688f9b"/>';
 }else if(id==="vent"){
 svg+='<rect x="230" y="105" width="280" height="185" rx="8" fill="#819399" stroke="#cad6d3" stroke-width="5"/>'+Array.from({length:10},(_,i)=>'<rect x="253" y="'+(125+i*15)+'" width="234" height="8" rx="3" fill="#35464c"/>').join("");
 }else{
 svg+='<rect x="245" y="65" width="250" height="265" rx="7" fill="#8fa2a5" stroke="#d6e0da" stroke-width="4"/><rect x="267" y="105" width="207" height="195" fill="#30454d"/><circle cx="370" cy="200" r="75" fill="#546a70"/>'+[0,90,180,270].map(a=>'<path d="M370 200 Q409 135 421 181 Q419 205 370 200" fill="#afbfbc" transform="rotate('+a+' 370 200)"/>').join("")+'<circle cx="370" cy="200" r="12" fill="#263b43"/>';
 }
 // Current operation name on the physical workbench.
 return svg+'<text x="18" y="24" fill="#c2d6c9" font-size="11" letter-spacing="2">'+esc(id.toUpperCase())+' / '+esc(current.kind.toUpperCase())+'</text>';
}
export function openTradeWork({id,container,render,finish,cancel}){
 const st=createWork(id),steps=workflows[id];let alive=true;
 const el=q=>container().querySelector(q);
 const feedback=msg=>{st.message=msg;const f=el("[data-feedback]");if(f)f.textContent=msg;};
 const update=()=>{const b=el("[data-next]");if(b)b.disabled=!stageReady(st)};
 const markDone=(i)=>{if(!st.done.includes(i))st.done.push(i);feedback("Completed · "+st.done.length);draw()};
 function draw(){
 if(!alive)return;const p=steps[st.index],svgBase=art(id,st);let svg=svgBase,controls="";
 if(p.kind==="mark"||p.kind==="fasten")svg+=p.points.map(([x,y],i)=>'<g data-point="'+i+'" class="jobTarget"><circle cx="'+x+'" cy="'+y+'" r="17" fill="'+(st.done.includes(i)?"#518b65":"#35484b")+'" stroke="'+(st.done.includes(i)?"#a6e8b4":"#edc676")+'" stroke-width="3"/><path d="M'+(x-8)+' '+y+' h16 M'+x+' '+(y-8)+' v16" stroke="#f2ead8" stroke-width="3" pointer-events="none"/></g>').join("");
 if(p.kind==="drag")svg+=p.parts.map((a,i)=>'<g><rect x="'+(a.tx-28)+'" y="'+(a.ty-15)+'" width="56" height="30" rx="5" fill="'+(st.done.includes(i)?a.color:"#354a48")+'" stroke="#edc676" stroke-dasharray="'+(st.done.includes(i)?"0":"5 4")+'"/><text x="'+a.tx+'" y="'+(a.ty+4)+'" text-anchor="middle" fill="'+(st.done.includes(i)?"#26332d":"#e2e8da")+'" font-size="9">'+esc(a.name)+'</text></g>'+(st.done.includes(i)?"":'<g class="jobTarget" data-part="'+i+'"><rect x="'+(a.x-48)+'" y="'+(a.y-17)+'" width="96" height="34" rx="5" fill="'+a.color+'" stroke="#d6e3d9" stroke-width="2"/><text x="'+a.x+'" y="'+(a.y+4)+'" font-size="10" text-anchor="middle" fill="#1d3030" pointer-events="none">'+esc(a.name)+'</text></g>')).join("")+'<g id="floatingPart" pointer-events="none" opacity="0"><rect x="-40" y="-15" width="80" height="30" rx="5" fill="#c5d2bd"/><text id="floatingLabel" text-anchor="middle" y="4" font-size="10" fill="#21332a"></text></g>';
 if(p.kind==="trace")svg+=p.paths.map((a,i)=>'<path d="'+line(a.pts)+'" stroke="'+a.color+'" stroke-width="'+(st.done.includes(i)?7:3)+'" stroke-dasharray="'+(st.done.includes(i)?"0":"6 6")+'" fill="none" opacity="'+(st.done.includes(i)?1:.7)+'" stroke-linejoin="round"/>'+(!st.done.includes(i)?a.pts.map(([x,y],n)=>'<circle cx="'+x+'" cy="'+y+'" r="'+(n===0?13:6)+'" fill="'+a.color+'" stroke="#1a2927" stroke-width="2" '+(n===0?'data-route="'+i+'" class="jobTarget"':'')+'/>').join(""):'')).join("")+'<path id="activeRoute" stroke="#f4e0a6" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none" pointer-events="none"/>';
 if(p.kind==="pick")controls='<div class="jobChoices">'+p.options.map((o,i)=>'<button data-choice="'+i+'" class="'+(st.values[0]===i?"active":"")+'">'+esc(o)+'</button>').join("")+'</div>';
 if(p.kind==="align"||p.kind==="gauge"){const labels=p.labels||[p.label];controls=labels.map((name,i)=>'<label class="jobGauge"><span>'+esc(name)+' <output data-value="'+i+'">'+(st.values[i]??0)+'</output></span><div class="gaugeTrack"><i></i><input type="range" min="0" max="100" value="'+(st.values[i]??0)+'" data-range="'+i+'"></div><small>Align the indicator with the green tolerance band.</small></label>').join("")}
 if(p.kind==="label")controls=p.labels.map((v,i)=>'<label class="jobLabel">Branch '+(i+1)+' · Work order: '+esc(v)+'<input data-label="'+i+'" placeholder="Enter circuit name" value="'+esc(st.values[i]||"")+'"></label>').join("");
 if(p.kind==="test")controls='<div class="jobChecks">'+p.checks.map((v,i)=>'<button data-test="'+i+'" '+(st.done.includes(i)?"disabled":"")+'>'+esc(v)+'<span>'+(st.done.includes(i)?"PASS":"RUN TEST")+'</span></button>').join("")+'</div>';
 const instructions={mark:"Click each marked point.",fasten:"Hold the virtual driver on each fastener until seated.",drag:"Drag each component to its outlined destination.",trace:"Drag from a colored start through every waypoint to finish the route.",pick:"Select the matching work-order component.",align:"Adjust both sliders until they are inside the tolerance band.",gauge:"Move the indicator into the green band.",label:"Type the circuit directory entries.",test:"Run each individual simulated check."};
 render('<div class="tag">TRADE WORK / '+(st.index+1)+' OF '+steps.length+'</div><h2>'+esc(p.title)+'</h2><p>'+esc(p.hint)+'</p><div class="jobStageBar">'+steps.map((v,i)=>'<i title="'+esc(v.title)+'" class="'+(i<st.index?"done":i===st.index?"current":"")+'"></i>').join("")+'</div><div class="workbench"><svg id="tradeSvg" viewBox="0 0 740 390" width="100%" style="display:block;touch-action:none;user-select:none">'+svg+'</svg><div class="workProgress"><i data-hold></i></div></div><p class="muted">'+instructions[p.kind]+'</p>'+controls+'<p data-feedback role="status">'+esc(st.message||"Complete the current operation.")+'</p><div class="actions"><button data-cancel>Cancel work</button><button class="primary" data-next '+(stageReady(st)?"":"disabled")+'>'+(st.index===steps.length-1?"Complete installation":"Next operation")+'</button></div><details><summary>Full work order · '+st.index+'/'+steps.length+' completed</summary><ol>'+steps.map((x,i)=>'<li style="color:'+(i<st.index?"#a2d9a5":i===st.index?"#e9d69f":"#a9bcb2")+'">'+esc(x.title)+'</li>').join("")+'</ol></details><p class="muted">Fictional isolated training equipment; not a real installation or commissioning procedure.</p>');
 const root=container(),board=el("#tradeSvg");
 root.querySelectorAll("[data-choice]").forEach(b=>b.onclick=()=>{st.values[0]=Number(b.dataset.choice);st.message=stageReady(st)?"Work-order component verified.":"Does not match the work order.";draw()});
 root.querySelectorAll("[data-range]").forEach(b=>b.oninput=()=>{const i=Number(b.dataset.range);st.values[i]=Number(b.value);el('[data-value="'+i+'"]').textContent=b.value;feedback(stageReady(st)?"Within game tolerance.":"Adjust to the indicated tolerance.");update()});
 root.querySelectorAll("[data-label]").forEach(b=>b.oninput=()=>{st.values[Number(b.dataset.label)]=b.value;update()});
 root.querySelectorAll("[data-test]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.test);b.disabled=true;b.querySelector("span").textContent="TESTING…";setTimeout(()=>{if(!alive||!board.isConnected)return;markDone(i)},450)});
 el("[data-cancel]").onclick=()=>{alive=false;cancel()};
 el("[data-next]").onclick=()=>{if(!advance(st))return;if(st.index===steps.length){alive=false;finish();}else draw()};
 let active=null,holdFrame=0;
 const pos=e=>{const q=board.createSVGPoint();q.x=e.clientX;q.y=e.clientY;const v=q.matrixTransform(board.getScreenCTM().inverse());return [v.x,v.y]};
 function stop(){cancelAnimationFrame(holdFrame);holdFrame=0;active=null;}
 board.onpointerdown=e=>{
 const item=e.target.closest("[data-point],[data-part],[data-route]");if(!item)return;
 const i=Number(item.dataset.point??item.dataset.part??item.dataset.route);if(st.done.includes(i))return;
 if(p.kind==="mark"){markDone(i);return;}
 board.setPointerCapture(e.pointerId);const start=pos(e);
 if(p.kind==="fasten"){active={i,start:performance.now()};const loop=t=>{if(!active||!alive||!board.isConnected)return;const n=Math.min(1,(t-active.start)/720);el("[data-hold]").style.width=n*100+"%";if(n===1){stop();markDone(i)}else holdFrame=requestAnimationFrame(loop)};holdFrame=requestAnimationFrame(loop)}
 else if(p.kind==="drag"){active={i};el("#floatingPart").setAttribute("opacity","1");el("#floatingPart").setAttribute("transform","translate("+start.join(" ")+")");el("#floatingLabel").textContent=p.parts[i].name}
 else if(p.kind==="trace"){active={i,next:1,pts:[p.paths[i].pts[0]],last:start};el("#activeRoute").setAttribute("d",line(active.pts))}
 };
 board.onpointermove=e=>{if(!active)return;const v=pos(e);
 if(p.kind==="drag"){el("#floatingPart").setAttribute("transform","translate("+v.join(" ")+")")}
 if(p.kind==="trace"){const route=p.paths[active.i].pts;const prev=active.last;const distance=Math.hypot(v[0]-prev[0],v[1]-prev[1]);const count=Math.max(1,Math.ceil(distance/7));for(let k=1;k<=count;k++){const q=[prev[0]+(v[0]-prev[0])*k/count,prev[1]+(v[1]-prev[1])*k/count];if(active.next<route.length&&closeTo(q,route[active.next],24)){active.pts.push(route[active.next]);active.next++}}active.last=v;el("#activeRoute").setAttribute("d",line([...active.pts,v]));if(active.next===route.length){const i=active.i;stop();markDone(i)}}
 };
 board.onpointerup=e=>{if(!active)return;const i=active.i,v=pos(e);
 if(p.kind==="drag"){const a=p.parts[i];stop();if(closeTo(v,[a.tx,a.ty],35))markDone(i);else{el("#floatingPart").setAttribute("opacity","0");feedback("Component not seated. Try its marked location.")}}
 else if(p.kind==="trace"){stop();el("#activeRoute").removeAttribute("d");feedback("Route incomplete. Follow each waypoint in order.")}
 else{stop();el("[data-hold]").style.width="0%"}};
 board.onpointercancel=()=>{stop();draw()};
 }
 draw();return {state:st,dispose(){alive=false}};
}
