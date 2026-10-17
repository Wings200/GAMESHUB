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
 const paint=material(spec.body,.34,.28);
 const secondary=material(spec.accent,.43,.38);
 const glass=material(spec.glass,.15,.16);
 const dark=material(0x0a0e14,.8,.12);
 const metal=material(0x8997a6,.40,.52);
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
   wheelX=1.01;scale=1.15;front=2.05;back=-2.04;fy=.68;by=.64;
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
   wheelX=1.03;wheelFront=1.42;wheelBack=-1.48;scale=1.04;
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
   wheelX=1.10;wheelFront=1.34;wheelBack=-1.39;scale=1.04;
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
   wheelX=1.13;wheelFront=1.41;wheelBack=-1.43;scale=1.09;
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
