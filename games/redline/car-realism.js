/*
 * REDLINE V6 factory vehicle detailing.
 *
 * Pure Three.js visuals: no race physics, network, wallet or customization.
 * Every model uses the immutable colors and body identity in car-catalog.js.
 * Keep meshes modest for Chromebook / up to eight multiplayer ghost cars.
 */
const DIMENSIONS=Object.freeze({
 gt:{width:1.94,front:1.96,rear:-1.96,cabin:.85,roof:1.25,type:"coupe"},
 vortex:{width:2.10,front:2.13,rear:-2.13,cabin:.85,roof:1.03,type:"super"},
 apex:{width:1.85,front:1.80,rear:-1.80,cabin:.86,roof:1.29,type:"track"},
 bayside:{width:1.98,front:2.08,rear:-2.10,cabin:.88,roof:1.13,type:"tuner"},
 aurora:{width:1.92,front:2.05,rear:-2.04,cabin:.92,roof:1.58,type:"rally"},
 ironclad:{width:2.13,front:2.30,rear:-2.30,cabin:1.0,roof:1.36,type:"muscle"},
 cirrus:{width:2.05,front:2.33,rear:-2.33,cabin:.92,roof:1.14,type:"tourer"},
 obsidian:{width:2.23,front:2.18,rear:-2.17,cabin:.88,roof:.94,type:"race"},
 phantom:{width:2.23,front:2.39,rear:-2.39,cabin:.83,roof:.98,type:"hyper"}
});

const makeMaterial=(THREE,color,roughness=.4,metalness=.15)=>
  new THREE.MeshStandardMaterial({color,roughness,metalness});
const luminous=(THREE,color,intensity=1)=>
  new THREE.MeshStandardMaterial({
    color,emissive:color,emissiveIntensity:intensity,
    roughness:.35,metalness:.1
  });

export function buildDetailedWheel(THREE,spin,scale=1,side=1,model="gt",lowDetail=false){
 const premium=["obsidian","phantom","vortex","cirrus"].includes(model);
 const rally=model==="aurora";
 const muscle=model==="ironclad";
 const rubber=makeMaterial(THREE,0x080a0e,.95,.0);
 const tread=makeMaterial(THREE,0x151a20,.88,.03);
 const alloy=makeMaterial(THREE,premium?0xa9bccd:0x798798,.23,.76);
 const darkAlloy=makeMaterial(THREE,0x303942,.32,.58);
 const brake=makeMaterial(THREE,0x5b6873,.5,.63);
 const center=makeMaterial(THREE,premium?0x0b1521:0x1d2732,.3,.58);
 const add=(geom,mat,x=0,y=0,z=0)=>{
   const m=new THREE.Mesh(geom,mat);
   m.position.set(x,y,z);spin.add(m);return m;
 };
 const r=(rally ? .356 : muscle ? .345 : .326)*scale;
 // Cylindrical shoulder + rounded sidewall; ring axis is the wheel axle X.
 const outer=add(new THREE.CylinderGeometry(r,r,.205*scale,20),rubber);
 outer.rotation.z=Math.PI/2;
 if(!lowDetail) for(const x of [-.080,.080]){
   const shoulder=add(new THREE.TorusGeometry((r-.055*scale),.055*scale,7,20),tread,x*scale);
   shoulder.rotation.y=Math.PI/2;
 }
 const face=side*.118*scale;
 const rim=add(new THREE.CylinderGeometry(r*.66,r*.66,.023*scale,18),alloy,face);
 rim.rotation.z=Math.PI/2;
 const inner=add(new THREE.CylinderGeometry(r*.51,r*.51,.028*scale,18),darkAlloy,face+side*.014*scale);
 inner.rotation.z=Math.PI/2;
 if(!lowDetail){
   const disc=add(new THREE.CylinderGeometry(r*.44,r*.44,.018*scale,18),brake,face+side*.032*scale);
   disc.rotation.z=Math.PI/2;
 }
 // Five / six / seven spokes, with a shared wheel origin for animated spin.
 const count=lowDetail?5:(premium?7:rally?6:5);
 for(let i=0;i<count;i++){
   const a=i*2*Math.PI/count;
   const spoke=add(new THREE.BoxGeometry(.030*scale,.205*scale,
     (muscle?.095:.065)*scale),alloy,
     face+side*.052*scale,.106*scale*Math.cos(a),.106*scale*Math.sin(a));
   spoke.rotation.x=a;
 }
 const hub=add(new THREE.CylinderGeometry(r*.115,r*.115,.055*scale,12),
   center,face+side*.070*scale);
 hub.rotation.z=Math.PI/2;
 return spin;
}

export function addFactoryCarDetails(pivot,spec,{THREE,wheelPivots=[],lowDetail=false}={}){
 const d=DIMENSIONS[spec?.model]||DIMENSIONS.gt;
 const isPremium=["obsidian","phantom","cirrus","vortex"].includes(spec?.model);
 const isRace=["obsidian","phantom","apex"].includes(spec?.model);
 const metallic=makeMaterial(THREE,0x738396,.24,.72);
 const carbon=makeMaterial(THREE,0x101820,.66,.20);
 const trim=makeMaterial(THREE,0x18212b,.54,.27);
 const paint=makeMaterial(THREE,spec.body,.24,.43);
 const accent=makeMaterial(THREE,spec.accent,.30,.45);
 const darkGlass=makeMaterial(THREE,spec.glass,.16,.21);
 const lights=luminous(THREE,isRace?0xff3b40:0xf43547,1.2);
 const white=luminous(THREE,0xe0f4ff,.82);
 const marker=luminous(THREE,0xffa53b,.48);
 const add=(geo,material,x,y,z)=>{
   const mesh=new THREE.Mesh(geo,material);
   mesh.position.set(x,y,z);
   pivot.add(mesh);return mesh;
 };
 const box=(w,h,l,material,x,y,z)=>add(new THREE.BoxGeometry(w,h,l),material,x,y,z);
 const cylinder=(radius,depth,mat,x,y,z,segments=12)=>{
   const m=add(new THREE.CylinderGeometry(radius,radius,depth,segments),mat,x,y,z);
   m.rotation.z=Math.PI/2;return m;
 };
 const half=d.width/2;
 const front=d.front, rear=d.rear;
 const fenderY=spec.model==="aurora" ? .49 :
   (spec.model==="obsidian"||spec.model==="phantom") ? .34 : .40;
 const doorTop=Math.min(.95,d.roof-.22);
 // Layered lower body: rocker panels and aerodynamic undertray.
 for(const side of [-1,1]){
   box(.07,.105,(front-rear)*.61,carbon,
     side*(half-.06),.24,.02);
   box(.07,.045,(front-rear)*.35,accent,
     side*(half-.018),.29,.11);
   // Mirrors: separate mount/stem and shaped housing, factory paint.
   box(.19,.055,.12,trim,side*(d.cabin+.01),doorTop,.45);
   box(.26,.12,.25,paint,side*(d.cabin+.13),doorTop+.055,.44);
   box(.025,.064,.19,darkGlass,side*(d.cabin+.274),doorTop+.052,.44);
   // Door panel crease and inset door handle, visible from a side view.
   box(.026,.018,.66,metallic,side*(half+.015),.70,-.13);
   box(.031,.032,.26,carbon,side*(half+.019),.77,-.36);
   box(.018,.025,.23,accent,side*(half+.025),.79,-.36);
   // Turn signals on front outer shoulders.
   box(.12,.06,.025,marker,side*(half-.17),.54,front+.014);
 }
 // Grille with upper and lower bumper inserts; slats use one combined mesh
 // per tier so the total detail remains reasonable for multiplayer ghosts.
 box(d.width*.65,.19,.055,carbon,0,.39,front+.032);
 for(let i=0;i<3;i++){
   box(d.width*.60,.021,.061,isPremium?metallic:trim,
     0,.33+i*.055,front+.066);
 }
 box(d.width*.77,.050,.16,trim,0,.19,front+.08);
 // Individual lamp brows, with bright headlight strips in front of the
 // existing headlamp boxes. Neither requires realtime shadow casting.
 for(const side of [-1,1]){
   const lampX=side*(half-.33);
   box(.48,.075,.045,trim,lampX,.65,front+.065);
   box(.39,.035,.064,white,lampX,.637,front+.098);
 }
 // Rear: reflector bar, plate recess, diffuser, and real exhaust outlets.
 box(d.width*.59,.052,.058,lights,0,.55,rear-.056);
 box(.66,.20,.055,carbon,0,.36,rear-.075);
 box(.42,.085,.063,metallic,0,.36,rear-.112);
 box(d.width*.78,.12,.24,carbon,0,.18,rear-.08);
 for(const side of [-1,1]){
   const x=side*(half-.34);
   cylinder(.092,.15,metallic,x,.26,rear-.16);
   cylinder(.060,.16,carbon,x,.26,rear-.245);
 }
 // Ghost racers use factory bodies and lighting, but omit the tiny close-up
 // accents and wheel arch geometry to protect low-end multiplayer frame rate.
 if(lowDetail)return pivot;
 // Two shallow body character lines following the factory silhouette.
 for(const side of [-1,1]){
   box(.034,.034,(front-rear)*.39,paint,
     side*(half*.78),.68,.15);
   // Side windows use tiny tinted sections so the painted door/cabin seam
   // is still distinct even with the original sculpted window body.
   box(.028,.14,.53,darkGlass,side*(d.cabin*.81),doorTop+.17,-.20);
 }
 // Wheel arches are semicircular sculpted trim over the actual wheel center.
 // Their geometry is parented to bodyPivot, while the wheels spin on root.
 for(const wp of wheelPivots){
   if(!wp?.position)continue;
   const side=Math.sign(wp.position.x)||1;
   const radius=(spec.model==="aurora"?.388:.352);
   const arch=add(new THREE.TorusGeometry(radius,.024,6,18,Math.PI),
     spec.model==="aurora"?carbon:paint,
     side*(half-.005),fenderY,wp.position.z);
   arch.rotation.y=Math.PI/2;
 }
 // Factory-specific detailing. These are silhouettes, not paint options.
 switch(spec.model){
   case "aurora":
     // Rally roof-mounted driving lamps and underbody skid plate.
     for(const x of [-.54,-.18,.18,.54])
       box(.26,.11,.10,white,x,1.66,.49);
     box(d.width*.69,.045,.68,metallic,0,.18,front-.35);
     break;
   case "ironclad":
     // Classic vented hood and oversized muscle exhaust tips.
     for(const x of [-.49,.49])
       box(.33,.035,.73,trim,x,1.0,1.05);
     break;
   case "cirrus":
     // GT chrome trim and full-width rear lighting.
     box(d.width*.87,.024,.05,metallic,0,.61,rear-.065);
     box(d.width*.63,.058,.060,lights,0,.64,rear-.09);
     break;
   case "obsidian":
     // Front race canards and rear diffuser fins.
     for(const side of [-1,1]){
       box(.39,.042,.57,carbon,side*(half-.09),.24,front-.22);
       box(.04,.21,.43,carbon,side*.71,.22,rear+.07);
     }
     break;
   case "phantom":
     // Split front intakes, central rear exhaust and active-aero blade.
     for(const side of [-1,1])
       box(.45,.15,.09,carbon,side*.62,.36,front+.08);
     cylinder(.14,.16,metallic,0,.32,rear-.15);
     box(d.width*.86,.065,.38,accent,0,1.14,rear+.36);
     break;
   case "bayside":
     // Flush tuner side skirts and rear tow hooks.
     for(const side of [-1,1]){
       box(.10,.05,.53,accent,side*.65,.31,rear-.04);
       box(.17,.10,.20,trim,side*.69,.74,front-.24);
     }
     break;
   case "vortex":
     box(d.width*.90,.066,.37,carbon,0,.22,front+.04);
     break;
   case "apex":
     for(const side of [-1,1])
       box(.32,.035,.39,trim,side*(half-.12),.25,front+.04);
     break;
   default:
     box(.65,.03,.24,metallic,0,.70,front-.16);
 }
 return pivot;
}
