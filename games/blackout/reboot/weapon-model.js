// BLACKOUT V0.5 · BX-7 Mk II: original modeled carbine.
// Detailed real THREE geometry: chamfered receiver, rail, slotted handguard,
// pistol grip, polymer stock, magazine, hardware and a mounted holographic optic.
// All components move with the camera-attached weapon (no screen-space gun art).
import {OPTIC_CENTER} from "./weapon-aim.js?v=reboot-005";

export function buildBX7Model(THREE,root){
 const mat={
  alloy:new THREE.MeshStandardMaterial({color:0x303b42,metalness:.72,roughness:.38}),
  upper:new THREE.MeshStandardMaterial({color:0x45525a,metalness:.68,roughness:.38}),
  edge:new THREE.MeshStandardMaterial({color:0x72838a,metalness:.68,roughness:.32}),
  polymer:new THREE.MeshStandardMaterial({color:0x19232a,metalness:.12,roughness:.83}),
  rubber:new THREE.MeshStandardMaterial({color:0x111a20,metalness:.02,roughness:.97}),
  recess:new THREE.MeshStandardMaterial({color:0x0d1216,metalness:.30,roughness:.68}),
  accent:new THREE.MeshStandardMaterial({color:0xb39567,metalness:.57,roughness:.42}),
  marking:new THREE.MeshBasicMaterial({color:0x8eb6ba,transparent:true,opacity:.77,depthWrite:false}),
  lens:new THREE.MeshPhysicalMaterial({color:0x67a7a4,metalness:0,roughness:.11,
   transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false}),
  reticle:new THREE.MeshBasicMaterial({color:0x5affdc,transparent:true,
   opacity:.96,depthTest:false,depthWrite:false,side:THREE.DoubleSide})
 };
 const part=(geometry,material,x,y,z,parent=root)=>{
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.set(x,y,z);
  mesh.castShadow=false;
  mesh.receiveShadow=false;
  parent.add(mesh);
  return mesh;
 };
 const box=(w,h,d,x,y,z,material=mat.alloy)=>part(new THREE.BoxGeometry(w,h,d),material,x,y,z);
 function chamfer(w,h,d,x,y,z,material=mat.alloy,cut=.022){
  const s=new THREE.Shape(),a=w/2,b=h/2,c=Math.min(cut,a*.5,b*.5);
  s.moveTo(-a+c,-b);s.lineTo(a-c,-b);s.lineTo(a,-b+c);
  s.lineTo(a,b-c);s.lineTo(a-c,b);s.lineTo(-a+c,b);
  s.lineTo(-a,b-c);s.lineTo(-a,-b+c);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{
   depth:d-.01,bevelEnabled:true,bevelSegments:2,steps:1,
   bevelThickness:.005,bevelSize:.005,curveSegments:2
  });
  return part(g,material,x,y,z-d/2+.005);
 }
 function cylinder(radius,depth,x,y,z,material=mat.alloy,segments=16){
  const g=new THREE.CylinderGeometry(radius,radius,depth,segments);
  const mesh=part(g,material,x,y,z);mesh.rotation.x=Math.PI/2;return mesh;
 }
 function bolt(x,y,z,material=mat.edge){
  const circle=part(new THREE.CylinderGeometry(.011,.011,.004,10),material,x,y,z);
  circle.rotation.z=Math.PI/2;return circle;
 }
 // Slim forged upper & lower receiver, with sloped outlines instead of a flat brick.
 chamfer(.236,.164,.40,0,-.073,-.193,mat.alloy,.033);
 chamfer(.216,.065,.44,0,.047,-.196,mat.upper,.022);
 chamfer(.174,.117,.20,0,-.158,-.121,mat.polymer,.024);
 chamfer(.22,.045,.74,0,.092,-.378,mat.upper,.012);
 // Rear adjustable stock: central buffer tube and skeletonized support pieces.
 cylinder(.044,.43,0,-.042,.273,mat.alloy);
 chamfer(.192,.122,.11,0,-.073,.415,mat.polymer,.024);
 chamfer(.232,.175,.052,0,-.097,.515,mat.rubber,.027);
 for(const side of [-1,1]){
  const brace=box(.024,.025,.27,side*.086,-.145,.330,mat.upper);
  brace.rotation.x=.22;
  box(.013,.056,.16,side*.102,-.074,.382,mat.rubber);
 }
 // Short magazine well, actual removable curved mag with side indentations.
 chamfer(.191,.087,.18,0,-.193,-.221,mat.alloy,.019);
 const magazine=chamfer(.154,.265,.155,0,-.307,-.266,mat.polymer,.022);
 magazine.rotation.x=-.12;
 for(let i=0;i<5;i++){
  for(const side of [-1,1])box(.004,.013,.115,side*.079,-.24-i*.041,-.274,
    i%2?mat.recess:mat.upper);
 }
 chamfer(.163,.028,.165,0,-.444,-.287,mat.rubber,.014);
 // Anatomical forward-raked pistol grip, distinct from magazine.
 const grip=chamfer(.099,.225,.123,0,-.267,-.006,mat.polymer,.022);
 grip.rotation.x=.22;
 for(let i=0;i<7;i++)box(.09,.006,.12,0,-.213-i*.023,-.009,mat.rubber);
 // Trigger guard and trigger, genuine depth rather than a flat decal.
 box(.017,.012,.158,-.006,-.209,.060,mat.upper);
 box(.017,.091,.014,.004,-.176,-.003,mat.edge).rotation.x=.18;
 // Ejection port, charging latch and selector.
 box(.008,.046,.153,.119,-.050,-.112,mat.recess);
 box(.011,.018,.135,.125,-.013,-.112,mat.edge);
 box(.026,.013,.045,.123,.056,.016,mat.upper);
 for(const x of [-.118,.118]){
  bolt(x,-.105,-.172);bolt(x,-.106,-.335);
 }
 cylinder(.020,.009,-.123,-.117,-.033,mat.accent,10);
 // Faceted slotted handguard with real rails and dark vent pockets.
 chamfer(.217,.143,.49,0,-.024,-.602,mat.polymer,.034);
 for(const side of [-1,1]){
  box(.022,.048,.42,side*.102,-.026,-.605,mat.alloy);
  for(let i=0;i<5;i++){
   const z=-.424-i*.073;
   box(.002,.016,.046,side*.115,-.011,z,mat.recess);
   box(.002,.009,.046,side*.115,-.041,z,mat.recess);
  }
 }
 // Floating barrel, gas block and vented muzzle device.
 cylinder(.029,.55,0,-.015,-.935,mat.upper);
 chamfer(.080,.085,.07,0,-.015,-.855,mat.alloy,.014);
 cylinder(.044,.096,0,-.015,-1.205,mat.alloy);
 cylinder(.022,.10,0,-.015,-1.26,mat.recess);
 for(const side of [-1,1])
  for(let i=0;i<3;i++)box(.004,.016,.014,side*.043,-.015,-1.170-i*.029,mat.recess);
 // Continuous top MIL-style rail with visibly separated ridges.
 box(.149,.021,.775,0,.118,-.432,mat.recess);
 for(let i=0;i<17;i++)box(.159,.016,.017,0,.134,-.073-i*.045,
    i%3?mat.edge:mat.alloy);
 // Small front gas/folding sight (clear of the main optic's view).
 chamfer(.062,.040,.035,0,.160,-.840,mat.alloy,.011);
 // Physical holographic optic on an integrated riser.
 chamfer(.181,.038,.183,0,.157,-.418,mat.polymer,.014);
 box(.162,.027,.076,0,.176,-.418,mat.upper);
 const support=[-.081,.081];
 for(const x of support){
  chamfer(.032,.142,.045,x,.240,-.418,mat.alloy,.010);
  box(.012,.118,.020,x,.237,-.417,mat.polymer);
 }
 chamfer(.196,.033,.057,0,.317,-.418,mat.alloy,.011);
 box(.15,.013,.033,0,.167,-.418,mat.edge);
 // Transparent lens immediately behind the hologram.
 box(.141,.115,.003,0,.242,-.433,mat.lens);
 // Physical plane holding center dot and ring directly on the optical axis.
 const sight=new THREE.Group();
 sight.position.set(OPTIC_CENTER.x,OPTIC_CENTER.y,OPTIC_CENTER.z);
 sight.name="BX-7 holographic reticle · calibrated on optical axis";
 root.add(sight);
 const ring=part(new THREE.TorusGeometry(.012,.00155,6,30),mat.reticle,0,0,0,sight);
 ring.renderOrder=8;
 const center=part(new THREE.SphereGeometry(.0019,8,6),mat.reticle,0,0,.001,sight);
 center.renderOrder=8;
 for(const [x,y,w,h] of [[0,.019,.002,.006],[0,-.019,.002,.006],
  [.019,0,.006,.002],[-.019,0,.006,.002]]){
  const mark=part(new THREE.PlaneGeometry(w,h),mat.reticle,x,y,.001,sight);
  mark.renderOrder=8;
 }
 // Distinctive cyan markings / bolt fittings. Original design, no brand IP.
 for(let i=0;i<3;i++)box(.004,.007,.020,.123,.016,-.214-i*.026,mat.marking);
 box(.009,.009,.048,-.125,.012,-.226,mat.accent);
 const flash=part(new THREE.SphereGeometry(.045,8,6),
  new THREE.MeshBasicMaterial({color:0xffe5aa,transparent:true,opacity:.85,
    depthWrite:false}),0,-.015,-1.289);
 flash.visible=false;
 return {reticle:sight,flash,magazine,materials:mat};
}
