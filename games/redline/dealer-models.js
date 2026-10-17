/*
 * REDLINE dealer-original visual car bodies.
 * The new cars each have a distinct 3D silhouette. Driving physics are
 * from car-catalog.js, NOT derived from the appearance or paint.
 */
export function buildDealerModel(root,pivot,spec,api) {
 const {THREE,material,addMesh,createWedgeGeometry,
    addWheel,addLights,addNitroFlames}=api;
 const model=spec.model;
 if(!["bayside","aurora","ironclad","cirrus","obsidian","phantom"].includes(model))
   return false;
 // Factory metallic paint catches city light without loading external
 // textures or introducing new assets / customization state.
 const paint=new THREE.MeshPhysicalMaterial({
   color:spec.body,roughness:.26,metalness:.31,
   clearcoat:.75,clearcoatRoughness:.15
 });
 const secondary=material(spec.accent,.43,.38);
 const glass=new THREE.MeshPhysicalMaterial({
   color:spec.glass,roughness:.11,metalness:.12,
   clearcoat:.88,clearcoatRoughness:.08
 });
 const dark=material(0x0a0e14,.8,.12);
 const metal=material(0x8997a6,.40,.52);
 const neon=new THREE.MeshBasicMaterial({color:spec.accent});
 const headlamp=new THREE.MeshBasicMaterial({color:0xdcf4ff});
 const parts=(geom,mat,x,y,z)=>addMesh(pivot,geom,mat,x,y,z);
 const box=(w,h,d,mat,x,y,z)=>parts(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 const wedge=(w,l,h,shoulder,bevel,mat,x,y,z)=>
   parts(createWedgeGeometry(w,l,h,shoulder,bevel),mat,x,y,z);
 let wheelX=1,wheelFront=1.28,wheelBack=-1.30,scale=1.04;
 let front=2.08,back=-2.10,fy=.58,by=.55;
 if(model==="bayside"){
   // Compact late-night tuner: square nose, fastback and twin deck lip.
   wedge(1.98,4.10,.39,.48,.88,paint,0,.33,0);
   wedge(1.78,1.62,.53,.58,.77,glass,0,.73,-.16);
   wedge(1.86,1.15,.18,.23,.91,paint,0,.68,1.32);
   box(1.75,.08,.32,secondary,0,1.09,-1.81);
   box(1.90,.13,.35,dark,0,.35,-2.06);
   box(.72,.12,.20,secondary,0,.60,2.04);
   for(const x of [-.77,.77])box(.48,.10,.11,dark,x,.57,2.03);
   // Street tuner: oversized rear deck, roof antenna, exposed exhausts,
   // offset intake and bright underbody rails. Not the generic stock coupe.
   box(1.83,.12,.64,paint,0,.94,-1.61);
   box(1.94,.09,.43,dark,0,.24,2.11);
   box(.76,.065,.72,dark,-.29,.83,1.14);
   for(const x of [-.83,.83]){
     box(.10,.10,2.65,neon,x,.25,-.05);
     box(.22,.16,.20,metal,x,.27,-2.22);
   }
   parts(new THREE.CylinderGeometry(.025,.025,.50,6),dark,.48,1.32,-.49);
   wheelX=1.02;scale=1.01;
 } else if(model==="aurora"){
   // Rally AWD, raised roof, dual fog lamps, roof rack and skid guards.
   wedge(1.92,3.97,.49,.56,.94,paint,0,.40,0);
   wedge(1.63,1.81,.72,.71,.79,glass,0,.88,-.20);
   wedge(1.80,1.02,.21,.25,.92,secondary,0,.68,1.34);
   box(1.98,.21,.35,dark,0,.31,1.98);
   box(1.70,.11,1.20,dark,0,1.55,-.23);
   for(const x of [-.75,.75]) {
     box(.09,.22,1.32,metal,x,1.58,-.23);
     box(.23,.18,.20,secondary,x,.55,2.08);
   }
   box(1.84,.09,.36,secondary,0,1.38,-1.70);
   // Lifted rally vehicle: wheel arches, bullbar, exposed roof lamps and
   // rally box. The high square roof separates it from low supercars.
   box(1.63,.19,1.07,paint,0,1.33,-.36);
   box(1.83,.10,.17,metal,0,.54,2.18);
   for(const x of [-.83,.83]){
     box(.17,.31,.18,metal,x,.36,2.03);
     box(.40,.08,1.08,dark,x,.33,-.04);
     box(.32,.15,.20,headlamp,x,1.56,.35);
     box(.18,.19,.43,secondary,x,.71,-1.90);
   }
   box(.10,.16,1.83,metal,0,1.69,-.24);
   wheelX=1.08;scale=1.22;front=2.05;back=-2.04;fy=.68;by=.64;
 } else if(model==="ironclad"){
   // Classic muscle proportions: long bonnet, short cabin, broad haunches.
   wedge(2.13,4.55,.47,.48,.91,paint,0,.37,0);
   wedge(1.75,1.56,.54,.62,.82,glass,0,.82,-.64);
   wedge(1.88,1.93,.15,.20,.92,paint,0,.77,1.02);
   box(.89,.16,.64,dark,0,.92,1.13);
   box(1.98,.10,.30,secondary,0,.60,-1.96);
   for(const x of [-.83,.83]){
     box(.12,.17,2.02,secondary,x,.52,.13);
   }
   box(2.08,.25,.26,dark,0,.28,2.28);
   // V8 muscle: tall exposed blower, triple intake slots, raised rear
   // haunches, side exhausts and a thick front chin.
   box(.94,.26,.81,metal,0,1.02,1.14);
   box(.84,.24,.52,dark,0,1.24,1.18);
   for(const x of [-.27,0,.27])box(.16,.08,.45,metal,x,1.40,1.23);
   for(const x of [-1.03,1.03]){
     box(.19,.32,1.01,paint,x,.69,-1.17);
     box(.18,.14,.64,metal,x,.34,-.60);
   }
   box(2.18,.17,.50,dark,0,.25,2.37);
   wheelX=1.08;wheelFront=1.36;wheelBack=-1.49;scale=1.12;
   front=2.30;back=-2.30;fy=.59;by=.57;
 } else if(model==="cirrus"){
   // Long-wheelbase grand tourer, sweeping glass and a restrained rear lip.
   wedge(2.05,4.60,.37,.51,.91,paint,0,.34,0);
   wedge(1.72,2.09,.47,.66,.82,glass,0,.76,-.40);
   wedge(1.88,1.76,.13,.25,.95,paint,0,.65,1.16);
   box(1.85,.065,.18,metal,0,.90,-1.74);
   for(const x of [-.86,.86])box(.085,.085,3.0,secondary,x,.48,.07);
   box(1.88,.12,.31,dark,0,.32,2.34);
   // Premium grand tourer: much longer glasshouse, chrome bumper /
   // grille treatment, split rear light bar and panoramic upper roof.
   wedge(1.76,2.10,.10,.50,.94,paint,0,1.06,-.35);
   box(1.96,.13,.13,metal,0,.49,2.38);
   box(1.66,.10,.12,metal,0,.53,-2.27);
   box(1.61,.07,1.32,glass,0,1.13,-.34);
   for(const x of [-.90,.90]){
     box(.11,.13,3.15,metal,x,.45,-.02);
     box(.18,.13,.18,headlamp,x,.66,2.36);
   }
   wheelX=1.04;wheelFront=1.50;wheelBack=-1.55;scale=1.07;
   front=2.33;back=-2.33;
 } else if(model==="obsidian"){
   // Track supercar: extremely low cabin, splitter, canards and high wing.
   wedge(2.23,4.25,.25,.38,.89,paint,0,.22,0);
   wedge(1.65,1.46,.33,.44,.73,glass,0,.58,-.25);
   wedge(2.02,1.60,.10,.20,.91,secondary,0,.45,1.18);
   box(2.28,.075,.62,dark,0,.16,2.13);
   box(2.35,.12,.44,secondary,0,1.15,-1.92);
   for(const x of [-1.06,1.06]){
     box(.15,.53,.23,secondary,x,.85,-1.87);
     box(.34,.09,.67,dark,x,.33,1.72);
   }
   // Race-track machine: large double-plane GT wing with risers, tall
   // diffuser, aggressive front splitters and open fender vents.
   box(2.41,.095,.52,dark,0,1.34,-2.02);
   for(const x of [-1.04,1.04]){
     box(.18,.70,.18,secondary,x,.93,-1.97);
     box(.30,.12,.96,dark,x,.18,1.76);
     box(.27,.085,.75,neon,x,.43,.18);
   }
   box(2.21,.13,.29,neon,0,.22,2.25);
   box(2.31,.30,.18,dark,0,.32,-2.20);
   wheelX=1.15;wheelFront=1.34;wheelBack=-1.44;scale=1.07;
   front=2.18;back=-2.17;fy=.46;by=.42;
 } else if(model==="phantom"){
   // Hypercar: narrow teardrop cockpit, broad carbon rear and split fins.
   wedge(2.23,4.65,.24,.34,.88,paint,0,.20,0);
   wedge(1.38,2.00,.35,.48,.67,glass,0,.54,-.14);
   wedge(2.02,1.71,.10,.21,.90,secondary,0,.39,1.35);
   box(2.35,.075,.65,dark,0,.15,2.38);
   for(const x of [-.78,.78]){
     wedge(.42,1.88,.13,.15,.68,secondary,x,.54,-1.03);
     box(.12,.22,.68,secondary,x,.75,-1.94);
   }
   box(2.29,.10,.32,secondary,0,.94,-2.01);
   box(.24,.18,1.90,dark,0,.74,-.68);
   // Hypercar: narrow teardrop cockpit, twin rear aero channels, wide
   // rear diffuser, central shark fin and triangular side intakes.
   wedge(.19,2.82,.43,.42,.65,secondary,0,1.01,-.78);
   for(const x of [-1.02,1.02]){
     wedge(.39,1.20,.34,.34,.66,dark,x,.37,.05);
     box(.20,.19,.90,neon,x,.59,-1.56);
     box(.23,.25,1.31,paint,x,.51,1.11);
     box(.20,.16,.33,headlamp,x,.42,2.39);
   }
   box(2.47,.17,.66,dark,0,.19,-2.44);
   box(2.50,.10,.53,secondary,0,1.09,-2.10);
   wheelX=1.15;wheelFront=1.44;wheelBack=-1.49;scale=1.10;
   front=2.39;back=-2.39;fy=.41;by=.40;
 }
 addLights(pivot,front,back,fy,by);
 addNitroFlames(pivot,back-.17,.32,.48);
 addWheel(root,-wheelX,wheelFront,true,scale);
 addWheel(root,wheelX,wheelFront,true,scale);
 addWheel(root,-wheelX,wheelBack,false,scale);
 addWheel(root,wheelX,wheelBack,false,scale);
 return true;
}
