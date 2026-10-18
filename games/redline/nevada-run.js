/*
 * REDLINE V21 — NEVADA RUN (legacy internal ID "canyon")
 * Original fictional, Nevada-inspired secret test range.
 * No depiction of actual Area 51 buildings or access roads.
 * Game module is also shared by V20 solo Time Trials.
 *
 * The server already recognizes "canyon" for room selection, stats and
 * leaderboards. Keeping that ID avoids a breaking Worker migration.
 */
export const NEVADA_TRACK=Object.freeze({
  id:"canyon",name:"NEVADA RUN",
  description:"Nevada Run · golden-hour highway, red-rock switchbacks, dry lakebed, restricted blacksite, active runway and fast canyon escape. Watch moving hazards.",
  sampleCount:900,laps:1,background:0x5b4251,fogNear:550,fogFar:1900,
  controlPoints:[
    [-940,195,5],[-745,253,5],[-535,265,7],[-345,310,11],
    [-245,400,20],[-110,350,28],[25,445,31],[208,453,22],
    [358,347,13],[463,218,5],[535,40,1],[490,-165,1],
    [355,-325,2],[165,-433,2],[-40,-472,4],[-240,-449,6],
    [-449,-395,10],[-642,-333,14],[-783,-235,18],
    [-900,-105,31],[-1020,4,23],[-1016,119,9]
  ],
  checkpoints:Array.from({length:20},(_,i)=>Math.round((.035+i*.049)*10000)/10000),
  crosswalks:[],barriers:[
    {start:.14,end:.30,side:1},{start:.14,end:.30,side:-1},
   {start:.82,end:.97,side:1},{start:.82,end:.97,side:-1}
  ],
  obstacles:[], // V21 uses genuine movable/contact hazards, not box spam.
  boosts:[
    {t:.075,offset:0},{t:.335,offset:2.4},{t:.525,offset:-2.2},
    {t:.705,offset:1.9},{t:.91,offset:0}
  ],
  pickups:[
    {t:.11,offset:-2.4,type:"nitro"},
    {t:.27,offset:2.1,type:"overdrive"},
    {t:.435,offset:-2.2,type:"nitro"},
    {t:.585,offset:2.0,type:"nitro"},
    {t:.74,offset:-1.5,type:"overdrive"},
    {t:.915,offset:2.3,type:"nitro"}
  ],
  ramps:[
    {t:.215,offset:-1.4,strength:5.2,secret:false},
    {t:.536,offset:-5.6,strength:8.6,secret:true,
      targetT:.558,landingLead:6,shortcutSpeed:76,minSpeed:26},
    {t:.735,offset:5.7,strength:8.7,secret:true,
      targetT:.756,landingLead:5,shortcutSpeed:78,minSpeed:27},
    {t:.91,offset:-1.4,strength:4.4,secret:false}
  ]
});
const TWO_PI=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function makeMaterial(THREE,color,metalness=0){
 return new THREE.MeshStandardMaterial({color,roughness:.92,metalness});
}
function shape(THREE,parent,kind,x,y,z,w,h,d,color,rot=0){
 const geo=kind==="cylinder"?
  new THREE.CylinderGeometry(w,w,h,8):
  kind==="sphere"?new THREE.SphereGeometry(w,10,7):
  kind==="cone"?new THREE.ConeGeometry(w,h,6):
  new THREE.BoxGeometry(w,h,d);
 const mesh=new THREE.Mesh(geo,makeMaterial(THREE,color));
 mesh.position.set(x,y,z);mesh.rotation.y=rot;parent.add(mesh);return mesh;
}
function billboard(THREE,parent,text,back="#453022",front="#f8d5a0",size=10){
 const canvas=document.createElement("canvas");canvas.width=768;canvas.height=144;
 const c=canvas.getContext("2d");c.fillStyle=back;c.fillRect(0,0,768,144);
 c.strokeStyle="#d9b37d";c.lineWidth=7;c.strokeRect(5,5,758,134);
 c.fillStyle=front;c.font="bold 52px Arial";c.textAlign="center";
 c.textBaseline="middle";c.fillText(text,384,73,735);
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size*144/768),
  new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide}));
 parent.add(mesh);return mesh;
}
function seeded(i){const x=Math.sin(i*127.131+31.7)*43758.5453;return x-Math.floor(x)}
// Stratified, weathered sandstone instead of obviously polygonal cones.
// Shared color bands mimic real sedimentary rock and varied erosion layers.
function sandstoneMesa(THREE,radius,height,seed){
 const rings=15,segments=36,verts=[],cols=[],indices=[];
 const color=new THREE.Color();
 const widths=Array.from({length:rings},(_,i)=>{
  const t=i/(rings-1),terraces=.026*Math.sin(t*31+seed*1.7);
  const slope=t<.18?1-.07*t:t<.70?.97-(t-.18)*.56:.68-(t-.70)*.62;
  return Math.max(.35,slope+terraces);
 });
 for(let ring=0;ring<rings;ring++){
  const y=height*ring/(rings-1);
  for(let seg=0;seg<segments;seg++){
   const a=seg/segments*TWO_PI;
   const wobble=.89+.14*seeded(seed*52+seg*13)+
    .055*Math.sin(a*5+seed)+.022*Math.sin(a*11+ring*.92);
   const r=radius*widths[ring]*wobble;
   verts.push(Math.cos(a)*r,y,Math.sin(a)*r);
   const tones=[0x79513e,0x895c44,0xa47150,0xaf7d5a,0xb78660,0xa87451,0x81513e,0x9b694e];
   color.setHex(tones[Math.floor(ring*tones.length/rings)]);
   const light=.80+.28*seeded(seed+ring*20+seg);
   cols.push(color.r*light,color.g*light,color.b*light);
   if(ring>0){
    const first=(ring-1)*segments+seg;
    const next=(ring-1)*segments+(seg+1)%segments;
    const upper=ring*segments+seg;
    const upperNext=ring*segments+(seg+1)%segments;
    indices.push(first,next,upper,next,upperNext,upper);
   }
  }
 }
 // Eroded plateau rather than a pointed artificial summit.
 const topCenter=verts.length/3;
 verts.push(0,height*.99,0);
 color.setHex(0x987051);cols.push(color.r,color.g,color.b);
 for(let k=0;k<segments;k++)
  indices.push(topCenter,(rings-1)*segments+k,(rings-1)*segments+(k+1)%segments);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
 geometry.setAttribute("color",new THREE.Float32BufferAttribute(cols,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
  vertexColors:true,roughness:1,metalness:0,flatShading:true,side:THREE.DoubleSide
 }));
}
export function createNevadaWorld({
 THREE,worldGroup,scene,trackSamples,getFrameAt,addBoxCollider,addCircleCollider,
 roadHalf=6.6,addRoadBarrier
}){
 const root=new THREE.Group();worldGroup.add(root);
 const staticMats={sand:makeMaterial(THREE,0xa57b55),rock:makeMaterial(THREE,0x936748),
  cliff:makeMaterial(THREE,0x704938),metal:makeMaterial(THREE,0x48535b,.38),
  concrete:makeMaterial(THREE,0x555c5e),light:makeMaterial(THREE,0xf9bb76)};
 const props=new THREE.Group();root.add(props);
 // The original V21 terrain used one giant seven-column mesh ACROSS the
 // pavement. At switchbacks its diagonals rose through the road and showed
 // as enormous tan/purple triangles. Build a safe low ground plane and only
 // TWO OUTSIDE embankments; never draw earth across the actual asphalt.
 const ground=new THREE.PlaneGeometry(3500,3000,62,52);
 ground.rotateX(-Math.PI/2);
 const points=ground.attributes.position;
 const colors=[];
 const col=new THREE.Color();
 const baseHeight=(x,z)=>-3.8+.28*Math.sin(x*.009)*Math.cos(z*.010)
     +.24*Math.sin(x*.018+z*.012);
 for(let i=0;i<points.count;i++){
   const x=points.getX(i),z=points.getZ(i);
   points.setY(i,baseHeight(x,z));
   const shade=.82+.18*seeded(i+400);
   col.setHex(i%7===0?0x9f7953:0xb38d62);
   colors.push(col.r*shade,col.g*shade,col.b*shade);
 }
 points.needsUpdate=true;
 ground.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
 ground.computeVertexNormals();
 // Fine procedural gravel repeats across the desert and embankments,
 // giving the flat, featureless tan ground visible surface grain.
 const gritCanvas=document.createElement("canvas");
 gritCanvas.width=128;gritCanvas.height=128;
 const gritContext=gritCanvas.getContext("2d");
 for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2){
  const noise=seeded(y*501+x*17+83);
  const channel=Math.floor(209+noise*42);
  gritContext.fillStyle=`rgb(${channel},${Math.floor(channel*.96)},${Math.floor(channel*.87)})`;
  gritContext.fillRect(x,y,2,2);
 }
 const desertTexture=new THREE.CanvasTexture(gritCanvas);
 desertTexture.wrapS=THREE.RepeatWrapping;
 desertTexture.wrapT=THREE.RepeatWrapping;
 desertTexture.repeat.set(25,22);
 desertTexture.colorSpace=THREE.SRGBColorSpace;
 const terrain=new THREE.Mesh(ground,new THREE.MeshStandardMaterial({
   vertexColors:true,map:desertTexture,roughness:1,side:THREE.DoubleSide
 }));
 root.add(terrain);
 // Follow an exact continuous cross-section without running triangles
 // across the asphalt. Shoulder is at 9.2m; the bank starts at 9.45m.
 // Limit the outside span to reduce ribbon self-overlaps on switchbacks.
 const bankDistances=[9.45,13.5,21,32];
 const roadsideHeight=(frame,offset)=>{
   const d=Math.abs(offset);
   const p=frame.point,n=frame.normal;
   const x=p.x+n.x*offset,z=p.z+n.z*offset;
   const valley=baseHeight(x,z);
   if(d<=bankDistances[0])return p.y-.12;
   if(d<=bankDistances[1]){
     const f=(d-bankDistances[0])/(bankDistances[1]-bankDistances[0]);
     return p.y-.12-1.25*f;
   }
   if(d<=bankDistances[2]){
     const f=(d-bankDistances[1])/(bankDistances[2]-bankDistances[1]);
     return (p.y-1.37)*(1-f)+(p.y*.48+valley*.52)*f;
   }
   if(d<=bankDistances[3]){
     const f=(d-bankDistances[2])/(bankDistances[3]-bankDistances[2]);
     return (p.y*.48+valley*.52)*(1-f)+(valley-.05)*f;
   }
   return valley;
 };
 const n=trackSamples.length;
 // Exclude big geometry from all main/secret road corridors, irrespective
 // of relative height; otherwise a mountain can fill the entire camera view.
 const clearOfRoad=(position,radius=12)=>{
  const safe=roadHalf+radius+3;
  for(let i=0;i<n;i+=2){
   const p=trackSamples[i].point,dx=p.x-position.x,dz=p.z-position.z;
   if(dx*dx+dz*dz<safe*safe)return false;
  }
  for(const [from,to,offset] of [
   [.395,.420,-10],[.532,.562,-18],[.688,.712,10],[.834,.858,-18]
  ])for(let k=0;k<=24;k++){
   const f=getFrameAt(from+(to-from)*k/24);
   const c=f.point.clone().addScaledVector(f.normal,offset*Math.sin(Math.PI*k/24));
   const dx=c.x-position.x,dz=c.z-position.z;
   if(dx*dx+dz*dz<(radius+6)*(radius+6))return false;
  }
  return true;
 };
 // Suppress embankment triangles that would project onto a distinct road
 // section at a switchback. Valley ground still fills the space below.
 const bankWouldCoverRoad=(x,z,y,index)=>{
  const d=roadHalf+2;
  for(let k=0;k<n;k+=2){
   const gap=Math.abs(k-index);
   if(Math.min(gap,n-gap)<21)continue;
   const q=trackSamples[k].point,dx=x-q.x,dz=z-q.z;
   if(Math.abs(dx)>d||Math.abs(dz)>d)continue;
   if(dx*dx+dz*dz<d*d&&y>=q.y-2.5)return true;
  }
  return false;
 };
 for(const side of [-1,1]){
   const v=[],rgb=[],tri=[],uv=[],strips=bankDistances;
   for(let i=0;i<=n;i++){
     const frame=trackSamples[i%n],p=frame.point,normal=frame.normal;
     for(let j=0;j<strips.length;j++){
       const off=side*strips[j];
       const y=roadsideHeight(frame,off);
       v.push(p.x+normal.x*off,y,p.z+normal.z*off);
       uv.push(i/n*115,Math.abs(off)/16);
       col.setHex(j<2?0x93704e:j===2?0xa27b53:0x99724b);
       const tone=.90+seeded(i*5+j+7)*.18;
       rgb.push(col.r*tone,col.g*tone,col.b*tone);
     }
     if(i===0)continue;
     for(let j=0;j<strips.length-1;j++){
      const a=(i-1)*strips.length+j,b=i*strips.length+j;
      const x=(v[a*3]+v[(b+1)*3])*.5;
      const y=(v[a*3+1]+v[(b+1)*3+1])*.5;
      const z=(v[a*3+2]+v[(b+1)*3+2])*.5;
      const hits=[a+1,b+1].some(q=>
       bankWouldCoverRoad(v[q*3],v[q*3+2],v[q*3+1],i%n));
      if(hits||bankWouldCoverRoad(x,z,y,i%n))continue;
      if(side===1)tri.push(a,b,a+1,b,b+1,a+1);
      else tri.push(a,a+1,b,b,a+1,b+1);
     }
   }
   const bankGeo=new THREE.BufferGeometry();
   bankGeo.setAttribute("position",new THREE.Float32BufferAttribute(v,3));
   bankGeo.setAttribute("color",new THREE.Float32BufferAttribute(rgb,3));
   bankGeo.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));
   bankGeo.setIndex(tri);
   bankGeo.computeVertexNormals();
   root.add(new THREE.Mesh(bankGeo,new THREE.MeshStandardMaterial({
     vertexColors:true,map:desertTexture,roughness:.98,side:THREE.DoubleSide,
     polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1
   })));
 }
 // Distant ridgelines of varying shape, kept well clear of drivable lanes.
 for(let i=0;i<92;i++){
  const theta=i/92*TWO_PI,dist=720+seeded(i+4)*350;
  const x=Math.cos(theta)*dist-250,z=Math.sin(theta)*dist;
  const h=24+seeded(i+40)*65;
  const radius=32+seeded(i+3)*30;
  const scaleZ=.65+seeded(i+6);
  // Account for the WORST-CASE stretched, eroded mesh. The prior simple
  // nominal-radius check could still allow a stretched rock over asphalt.
  const footprint=radius*Math.max(1.32,scaleZ*1.28)+7;
  if(!clearOfRoad({x,z},footprint))continue;
  const mountain=sandstoneMesa(THREE,radius,h,i+181);
  mountain.position.set(x,-3,z);
  mountain.rotation.y=seeded(i+50)*TWO_PI;
  mountain.scale.z=scaleZ;
  root.add(mountain);
  addCircleCollider(mountain.position,radius*Math.max(1,scaleZ)*.87,{
   minY:-6,maxY:h+6,drag:.28,bounce:.06,tag:"SANDSTONE MESA"
  });
 }
 // A low-draw-call field of actual irregular gravel boulders. Every
 // instance is outside main/secret pavement and has matching physical
 // collision. Do not scatter these as fake obstacles into the racing lanes.
 const boulderGeo=new THREE.DodecahedronGeometry(1,1);
 const boulderPalette=[0x8e6a50,0x9e7454,0x705747];
 const boulderDummy=new THREE.Object3D();
 for(let band=0;band<3;band++){
  const instances=new THREE.InstancedMesh(boulderGeo,
   new THREE.MeshStandardMaterial({
    color:boulderPalette[band],roughness:1,flatShading:true
   }),70);
  let placed=0;
  for(let i=0;i<70;i++){
   const id=i*3+band,t=((id+.5)/210+.012*seeded(id+301))%1;
   const frame=getFrameAt(t);
   const side=id%2?1:-1;
   const offset=side*(25+seeded(id+188)*55);
   const c=frame.point.clone().addScaledVector(frame.normal,offset);
   c.y=roadsideHeight(frame,offset);
   const size=.9+seeded(id+605)*2.5;
   if(!clearOfRoad(c,size+2))continue;
   boulderDummy.position.copy(c);
   boulderDummy.position.y+=size*.40;
   boulderDummy.rotation.set(seeded(id+3)*.3,
    seeded(id+14)*TWO_PI,seeded(id+55)*.35);
   boulderDummy.scale.set(size*1.25,size*.61,size*.86);
   boulderDummy.updateMatrix();
   instances.setMatrixAt(placed++,boulderDummy.matrix);
   addCircleCollider(c,size*.68,{
    minY:c.y-.1,maxY:c.y+size*1.6,drag:.52,
    tag:"DESERT BOULDER"
   });
  }
  instances.count=placed;
  instances.instanceMatrix.needsUpdate=true;
  root.add(instances);
 }
 // Dark lakebed fractures and a salt-crust drainage field. These patches
 // visibly match the reduced-grip zone in the car physics (t=.325-.485).
 for(let i=0;i<46;i++){
  const t=.326+i/46*.158,f=getFrameAt(t);
  const offset=(seeded(i+811)-.5)*11;
  const fracture=new THREE.Group();
  fracture.position.copy(f.point).addScaledVector(f.normal,offset);
  fracture.position.y+=.11;
  fracture.rotation.y=f.rotationY+seeded(i+88)*.8;
  root.add(fracture);
  const length=2+seeded(i+14)*5;
  const crack=shape(THREE,fracture,"box",0,0,0,.10,.022,length,0x433a35);
  const branch=shape(THREE,fracture,"box",1.0,0,0,.065,.019,length*.46,0x4f4039);
  branch.rotation.y=.6+seeded(i+40);
 }
 // Actual multilayer strata / slot canyons alongside the winding section.
 for(let i=0;i<16;i++){
  const t=.155+i*.0091,f=getFrameAt(t),side=i%2?1:-1;
  const distance=33+(i%4)*9;
  const rock=new THREE.Group();
  rock.position.copy(f.point).addScaledVector(f.normal,side*distance);
  rock.position.y=roadsideHeight(f,side*distance)-.4;
  if(!clearOfRoad(rock.position,15.5))continue;
  root.add(rock);
  const h=10+seeded(i+188)*23;
  const cliff=sandstoneMesa(THREE,13.4,h,i+401);
  cliff.rotation.y=f.rotationY;rock.add(cliff);
  addBoxCollider(rock.position,12,12,f.rotationY,{
   minY:rock.position.y-.4,maxY:rock.position.y+h+2,
   tag:"CANYON CLIFF"
  });
 }
 // Sunset disk near horizon. Changes with deterministic ambient time, not
 // actual day/night cycles that could darken the track into invisibility.
 const sunsetLight=new THREE.DirectionalLight(0xffb578,1.40);
 sunsetLight.position.set(-850,240,-480);root.add(sunsetLight);
 const desertFill=new THREE.HemisphereLight(0xffcf9e,0x6f5140,.55);
 root.add(desertFill);
 const sun=new THREE.Mesh(new THREE.SphereGeometry(47,20,14),
  new THREE.MeshBasicMaterial({
   color:0xffbd76,fog:false,transparent:true,opacity:1
  }));
 sun.position.set(-970,170,-1450);root.add(sun);
 // Road-side details: signs, power poles, desert scrub and reflective markers.
 const signData=[
  [.04,"US 93 · NEVADA RUN"],[.146,"RED ROCK PASS"],[.329,"DRY LAKE BED"],
  [.49,"WARNING · RESTRICTED RANGE"],[.625,"BLACKSITE PERIMETER"],
  [.748,"ACTIVE AIRSTRIP"],[.852,"CAUTION · STEEP DESCENT"]
 ];
 const placeFrame=(t,offset,height=0)=>{
  const f=getFrameAt(t),v=f.point.clone().addScaledVector(f.normal,offset);
  v.y=roadsideHeight(f,offset)+height;
  return {f,p:v};
 };
 for(const [t,text] of signData){
  // Close enough to the road to remain readable on steep raised grades.
  const {f,p}=placeFrame(t,10.7,0);
  const group=new THREE.Group();group.position.copy(p);group.rotation.y=f.rotationY;root.add(group);
  shape(THREE,group,"box",0,3.1,0,.27,6.1,.27,0x616568);
  const label=billboard(THREE,group,text,"#3e2a25","#ffe3a2",8.4);
  label.position.y=6.1;
  // Face approaching traffic, not across the road or backwards.
  label.rotation.y=Math.PI;
  addCircleCollider(p,.30,{minY:p.y-.5,maxY:p.y+6.5,tag:"DESERT SIGNPOST"});
 }
 for(let i=0;i<110;i++){
  const t=i/110,p=placeFrame(t,18+(i%2)*6);
  const tree=new THREE.Group();tree.position.copy(p.p);root.add(tree);
  const h=.9+seeded(i+90)*2.5;
  shape(THREE,tree,"cylinder",0,h*.5,0,.06,h,.07,0x5d6352);
  for(let b=0;b<3;b++)
   shape(THREE,tree,"box",(b-1)*.55,h*(.25+b*.15),0,.5,.13,.17,0x77704f);
  if(i%4===0){
   const pole=placeFrame(t,-22).p;
   shape(THREE,root,"cylinder",pole.x,pole.y+5,pole.z,.14,10,.2,0x54443b);
   shape(THREE,root,"box",pole.x,pole.y+9.4,pole.z,3,.19,.19,0x695943);
   addCircleCollider(pole,.35,{minY:pole.y,maxY:pole.y+10,tag:"DESERT POWER POLE"});
  }
 }
 // Groom Lake-inspired fictional runway: a long parallel taxiway with
 // real markings and a visible crossing warning near the racing highway.
 // It is OFF the racing centerline, not a floating slab across the road.
 const airstrip=getFrameAt(.747);
 const runway=new THREE.Group();
 runway.rotation.y=airstrip.rotationY;
 // Search outward for the closest safe airstrip location; a long slab
 // can cross the neighboring curve even though its midpoint is off-road.
 let runwayOffset=-43;
 for(const testOffset of [-43,-59,-78,-102,-135]){
  const candidate=airstrip.point.clone().addScaledVector(
   airstrip.normal,testOffset);
  const co=Math.cos(runway.rotation.y),si=Math.sin(runway.rotation.y);
  const collides=trackSamples.some(sample=>{
   const dx=sample.point.x-candidate.x,dz=sample.point.z-candidate.z;
   const x=dx*co-dz*si,z=dx*si+dz*co;
   return Math.abs(x)<15+roadHalf+3&&Math.abs(z)<84+roadHalf+3;
  });
  if(!collides){runwayOffset=testOffset;break;}
  runwayOffset=testOffset;
 }
 runway.position.copy(airstrip.point).addScaledVector(
  airstrip.normal,runwayOffset);
 runway.position.y=roadsideHeight(airstrip,runwayOffset)+.05;
 root.add(runway);
 shape(THREE,runway,"box",0,0,0,30,.12,168,0x555b60);
 for(let i=-6;i<=6;i++){
   if(i===0)continue;
   shape(THREE,runway,"box",0,.09,i*11,0.45,.025,5,0xe8dfc6);
   for(const side of [-1,1]){
     const lamp=shape(THREE,runway,"box",side*14.2,.20,i*11,.28,.23,.55,0xffd9a1);
     lamp.material.emissive=new THREE.Color(0xffbd74);
     lamp.material.emissiveIntensity=.45;
     const yaw=runway.rotation.y,cx=side*14.2,cz=i*11;
     const px=runway.position.x+cx*Math.cos(yaw)+cz*Math.sin(yaw);
     const pz=runway.position.z-cx*Math.sin(yaw)+cz*Math.cos(yaw);
     addCircleCollider({x:px,z:pz},.25,{
      minY:runway.position.y-.3,maxY:runway.position.y+1.2,
      tag:"RUNWAY EDGE LIGHT",drag:.75
     });
   }
 }
 for(const side of [-1,1])
   shape(THREE,runway,"box",side*13.2,.11,0,.24,.025,160,0xe4dbc8);
 const runwayLabel=billboard(THREE,runway,"RUNWAY 51 · FLIGHT TEST",
   "#393c43","#f2e5ce",19);
 runwayLabel.position.set(0,2.1,72);
 runwayLabel.rotation.y=Math.PI;
 // A detailed fictional test facility outside the raceway.
 const buildings=[{t:.56,side:-1,w:28,d:54,h:16,name:"HANGAR 07"},
   {t:.615,side:-1,w:32,d:62,h:19,name:"EXPERIMENTAL SYSTEMS"},
   {t:.69,side:1,w:22,d:37,h:12,name:"RANGE CONTROL"},
   {t:.76,side:-1,w:38,d:70,h:23,name:"AIRCRAFT STORAGE"}];
 for(let j=0;j<buildings.length;j++){
  const b=buildings[j],o=placeFrame(b.t,b.side*53);
  // Hangars must not hang into a different switchback lane.
  if(!clearOfRoad(o.p,Math.hypot(b.w*.5,b.d*.5)+2))continue;
  const place=new THREE.Group();place.position.copy(o.p);place.rotation.y=o.f.rotationY;
  root.add(place);
  shape(THREE,place,"box",0,b.h/2,0,b.w,b.h,b.d,0x566168);
  shape(THREE,place,"box",0,b.h+.35,0,b.w+1,.7,b.d+1,0x343d46);
  shape(THREE,place,"box",0,b.h*.35,b.d*.501,b.w*.72,b.h*.61,.17,0x2f424d);
  // Dimensional panels, support ribs and rooftop machinery rather than
  // untextured rectangular blacksite buildings.
  for(const side of [-1,1]){
   for(let rib=0;rib<7;rib++){
    const zz=-b.d*.44+rib*b.d*.146;
    shape(THREE,place,"box",side*(b.w*.5+.13),
     b.h*.55,zz,.26,b.h*.88,.24,0x77858a);
   }
   shape(THREE,place,"box",side*b.w*.42,b.h+.60,0,
    .75,.54,b.d*.90,0x889397);
   shape(THREE,place,"box",side*b.w*.29,b.h+1.18,
    b.d*.1,4.2,1.2,5.6,0x5a666a);
   shape(THREE,place,"box",side*b.w*.29,b.h+1.89,
    b.d*.1,4.6,.2,5.9,0x2e373a);
  }
  for(let door=0;door<5;door++){
   const x=(door-2)*b.w*.135;
   shape(THREE,place,"box",x,b.h*.33,b.d*.514,
    .12,b.h*.60,.26,0x91a0a1);
  }
  shape(THREE,place,"box",0,b.h*.64,b.d*.519,
   b.w*.69,.18,.32,0xc6a251);
  shape(THREE,place,"box",0,.09,b.d*.56,
   b.w*.79,.16,b.d*.11,0x62676a);
  const tag=billboard(THREE,place,b.name,"#21323b","#ffe6aa",b.w*.7);
  tag.position.set(0,b.h*.78,b.d*.515);
  for(let i=0;i<4;i++)shape(THREE,place,"box",-b.w*.38+i*b.w*.25,
   b.h-2,b.d*.51,.8,1,.1,0xffd69d);
  addBoxCollider(place.position,b.w*.5,b.d*.5,place.rotation.y,{
   minY:place.position.y-2,maxY:place.position.y+b.h+3,tag:b.name
  });
 }
 // Connected restricted-perimeter fence. Formerly: 4.7m fence slats
 // separated by 40m gaps, with physics only on every third panel.
 // Openings intentionally preserve the side roads and broken-fence jump.
 const fenceOpenings=[
  {side:-1,start:.525,end:.571},
  {side:1,start:.681,end:.719},
  {side:-1,start:.725,end:.763},
  {side:1,start:.729,end:.759}
 ];
 const fenceSections=120,fenceStart=.48,fenceStep=.30/fenceSections;
 const chainMeshMat=new THREE.MeshStandardMaterial({
  color:0x839997,roughness:.88,metalness:.32,side:THREE.DoubleSide,
  wireframe:true,transparent:true,opacity:.76
 });
 for(let i=0;i<fenceSections;i++){
  const ta=fenceStart+i*fenceStep,tb=ta+fenceStep,mid=(ta+tb)*.5;
  const fa=getFrameAt(ta),fb=getFrameAt(tb);
  for(const side of [-1,1]){
   if(fenceOpenings.some(open=>open.side===side&&
     mid>=open.start&&mid<=open.end))continue;
   const p=fa.point.clone().addScaledVector(fa.normal,side*17.4);
   const q=fb.point.clone().addScaledVector(fb.normal,side*17.4);
   p.y=roadsideHeight(fa,side*17.4);
   q.y=roadsideHeight(fb,side*17.4);
   const dx=q.x-p.x,dz=q.z-p.z,length=Math.hypot(dx,dz);
   if(length<.1)continue;
   const c=p.clone().add(q).multiplyScalar(.5);
   if(bankWouldCoverRoad(c.x,c.z,c.y,Math.floor(mid*n)%n))
    continue;
   const group=new THREE.Group();group.position.copy(c);
   group.rotation.y=Math.atan2(dx,dz);root.add(group);
   const fence=new THREE.Mesh(new THREE.PlaneGeometry(length,3.45,
    Math.max(3,Math.round(length/1.3)),4),chainMeshMat);
   fence.rotation.y=Math.PI/2;fence.position.y=2.05;group.add(fence);
   shape(THREE,group,"box",0,4,0,.13,.14,length,0x5f7776);
   if(i%3===0||i===0||i===fenceSections-1)
    shape(THREE,group,"box",0,2,-length*.48,.22,4.1,.22,0x3f5658);
   addBoxCollider(c,.18,length*.5,group.rotation.y,{
    minY:Math.min(p.y,q.y)-.4,maxY:Math.max(p.y,q.y)+4.4,
    tag:"RESTRICTED PERIMETER FENCE"
   });
  }
 }
 // Two surveillance towers with active moving searchlight beams.
 const searchlights=[];
 for(const [t,offset] of [[.535,-26],[.665,26],[.745,-29]]){
  const {p}=placeFrame(t,offset);
  if(!clearOfRoad(p,5))continue;
  const g=new THREE.Group();g.position.copy(p);root.add(g);
  shape(THREE,g,"box",0,8.5,0,3,17,3,0x6b6261);
  const cabin=shape(THREE,g,"box",0,17,0,7,4,7,0x2f4756);
  // Actual spotlight pan: the beam tilts forward from the tower and
  // rotates WITH the lamp, rather than spinning a vertical cone in place.
  const pivot=new THREE.Group();pivot.position.y=16;g.add(pivot);
  const beam=new THREE.Mesh(new THREE.ConeGeometry(9.5,19,24,1,true),
   new THREE.MeshBasicMaterial({color:0xffe5a8,transparent:true,
    opacity:.14,depthWrite:false,side:THREE.DoubleSide}));
  beam.position.y=-9.5;
  beam.rotation.x=-.46;
  pivot.add(beam);
  shape(THREE,pivot,"sphere",0,0,0,1.4,1,1,0xffefbe);
  const spotlight=new THREE.SpotLight(0xffe5aa,5,75,.35,.8,2);
  spotlight.position.set(0,0,0);
  spotlight.target.position.set(0,-19,10);
  pivot.add(spotlight,spotlight.target);
  searchlights.push({g,pivot,beam,t,offset});
  addBoxCollider(p,2,2,0,{minY:p.y,maxY:p.y+19,tag:"WATCHTOWER"});
 }
 // Floodlights make blacksite readable even after full twilight.
 const floodLights=[];
 for(const [t,side] of [[.492,-1],[.56,-1],[.645,1],[.715,1],[.78,-1]]){
  const {p}=placeFrame(t,side*20);
  const lamp=new THREE.Group();lamp.position.copy(p);root.add(lamp);
  shape(THREE,lamp,"cylinder",0,5,0,.13,10,.13,0x7e847c);
  const box=shape(THREE,lamp,"box",0,10,0,1.8,.7,1.2,0xffd39c);
  box.material.emissive=new THREE.Color(0xffb765);
  box.material.emissiveIntensity=.25;
  const light=new THREE.PointLight(0xffc788,2.7,46,2);
  light.position.set(0,9.9,0);lamp.add(light);
  floodLights.push({light,box});
 }
 // Radar arrays and masts.
 for(const t of [.577,.698,.784]){
  const {p}=placeFrame(t,65);
  if(!clearOfRoad(p,6))continue;
  const group=new THREE.Group();group.position.copy(p);root.add(group);
  shape(THREE,group,"cylinder",0,9,0,.7,18,1,0x75827f);
  const antenna=new THREE.Mesh(new THREE.SphereGeometry(5,12,5,0,Math.PI),
   makeMaterial(THREE,0xb9c2ba,.35));
  antenna.rotation.x=Math.PI/2;antenna.position.y=19;group.add(antenna);
  addCircleCollider(p,1.5,{minY:p.y,maxY:p.y+22,tag:"RADAR"});
 }
 // 3D tunnel structure and drainage shortcuts with real drivable pavement.
 const shortcutLabels=[
  [.395,.420,-10,"DRAINAGE CHANNEL"],
  [.532,.562,-18,"RESTRICTED SERVICE TUNNEL"],
  [.688,.712,10,"HANGAR MAINTENANCE"],
  [.834,.858,-18,"RIDGE CAVE PASSAGE"]
 ];
 const shortcuts=[];
 for(const [from,to,offset,name] of shortcutLabels){
  const path=new THREE.Group();root.add(path);
  const vertices=[],uvs=[],indices=[],steps=18,centers=[];
  // Match both the visible tunnel and its physical walls to the actual
  // offset corridor's heading instead of the adjacent main highway.
  for(let k=0;k<=steps;k++){
   const f=getFrameAt(from+(to-from)*k/steps);
   const side=offset*Math.sin(Math.PI*k/steps);
   const c=f.point.clone().addScaledVector(f.normal,side);
   c.y=roadsideHeight(f,side)+.24;
   centers.push(c);
  }
  for(let k=0;k<=steps;k++){
   const c=centers[k],prev=centers[Math.max(0,k-1)];
   const next=centers[Math.min(steps,k+1)];
   const tangent=next.clone().sub(prev).setY(0).normalize();
   const normal=new THREE.Vector3(-tangent.z,0,tangent.x);
   const yaw=Math.atan2(tangent.x,tangent.z);
   for(const w of [-3.6,3.6]){
    vertices.push(c.x+normal.x*w,c.y+.10,c.z+normal.z*w);
    uvs.push(w>0?1:0,k/3);
   }
   if(k>0){const j=k*2;indices.push(j-2,j-1,j,j-1,j+1,j);}
   const enclosed=name.includes("TUNNEL")||name.includes("CAVE");
   if(enclosed&&k>=4&&k<=steps-4){
    const group=new THREE.Group();group.position.copy(c);
    group.rotation.y=yaw;root.add(group);
    const length=(next.distanceTo(c)+prev.distanceTo(c))*.5+1.2;
    const color=name.includes("CAVE")?0x80553d:0x4c5155;
    shape(THREE,group,"box",0,5.9,0,9.4,.8,length,color);
    for(const sign of [-1,1]){
     shape(THREE,group,"box",sign*4.6,3,0,.8,5.8,length,color);
     // Local +X under Y-rotation points toward negative normal.
     const wall=c.clone().addScaledVector(normal,-sign*4.6);
     addBoxCollider(wall,.48,length*.5,yaw,{
      minY:c.y-.1,maxY:c.y+6.1,tag:name
     });
    }
   }else if(!enclosed&&(k===6||k===12)){
    const arch=new THREE.Group();arch.position.copy(c);arch.rotation.y=yaw;
    root.add(arch);
    shape(THREE,arch,"box",-4.2,2.5,0,.8,5,.8,0x755039);
    shape(THREE,arch,"box",4.2,2.5,0,.8,5,.8,0x755039);
    shape(THREE,arch,"box",0,5.2,0,9,.8,.9,0x715244);
   }
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
  geo.setAttribute("uv",new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(indices);geo.computeVertexNormals();
  root.add(new THREE.Mesh(geo,makeMaterial(THREE,0x4a3e38)));
  const a=placeFrame(from,.0,0),sign=new THREE.Group();
  sign.position.copy(a.p).addScaledVector(a.f.normal,offset<0?-11:11);
  sign.rotation.y=a.f.rotationY;root.add(sign);
  const label=billboard(THREE,sign,name,"#40372c","#e5cda2",6.8);
  label.rotation.y=Math.PI;label.position.y=3.0;
  shortcuts.push({from,to,offset,name});
 }
 const outpost=placeFrame(.855,47);
 const outpostGroup=new THREE.Group();outpostGroup.position.copy(outpost.p);
 outpostGroup.rotation.y=outpost.f.rotationY;root.add(outpostGroup);
 for(let i=0;i<4;i++){
  const side=(i-1.5)*7;
  shape(THREE,outpostGroup,"box",side,2.5,0,5,5,7,0x765e4c);
  // Abandoned buildings must be physical as well as visible.
  const center=outpost.p.clone().addScaledVector(outpost.f.normal,-side);
  addBoxCollider(center,2.5,3.5,outpostGroup.rotation.y,{
    minY:outpost.p.y-1,maxY:outpost.p.y+5.3,tag:"OUTPOST SHACK"
  });
 }
 const opLabel=billboard(THREE,outpostGroup,"ABANDONED OUTPOST","#43392f","#f7e1b3",15);
 opLabel.position.y=6;opLabel.rotation.y=Math.PI/2;
 // Sand gust particles: fixed small count and one shared material.
 const particles=[],dustMat=new THREE.MeshBasicMaterial({
  color:0xc5aa7c,transparent:true,opacity:.3,depthWrite:false
 });
 for(let i=0;i<80;i++){
  const t=(i%20)/20,frame=getFrameAt(.31+t*.23);
  const side=(i%2?1:-1)*(6+seeded(i+240)*25);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.3+seeded(i)*1.4,.6),dustMat);
  mesh.position.copy(frame.point).addScaledVector(frame.normal,side);
  mesh.position.y=roadsideHeight(frame,side)+1+seeded(i+333)*4;
  mesh.rotation.y=seeded(i+84)*6;
  root.add(mesh);
  particles.push({mesh,base:mesh.position.clone(),phase:seeded(i+50)*TWO_PI});
 }
 // Actual moving hazards, moved from one consistent clock across clients.
 const hazards=[];
 function hazardGroup(type,t,side,radius,speedPeriod,phase=0){
  const g=new THREE.Group();root.add(g);
  const h={type,t,side,radius,period:speedPeriod,phase,mesh:g,lastImpact:-1e9};
  hazards.push(h);return h;
 }
 for(const [j,t] of [.085,.325,.598].entries()){
  const h=hazardGroup(j===1?"tanker":"convoy",t,-2.4+(j%2)*4.4,
    j===1?4.5:4.1,16+j*5,j*.36);
  const g=h.mesh,base=h.type==="tanker"?0x7e8883:0x515e4c;
  shape(THREE,g,"box",0,1.3,0,4.5,2.3,8.4,base);
  shape(THREE,g,"box",0,2.7,2.0,3.4,1.8,2.7,0x343e3a);
  if(h.type==="tanker"){
   const tank=shape(THREE,g,"cylinder",0,3.0,-1,1.5,5.3,1.5,0xa5a9a2);
   tank.rotation.x=Math.PI/2;
  }
  for(const x of [-2.1,2.1])for(const z of [-2.5,2.5]){
   const wheel=shape(THREE,g,"cylinder",x,.66,z,.8,.5,.8,0x1c2124);
   wheel.rotation.z=Math.PI/2;
  }
  shape(THREE,g,"box",0,1.25,4.25,2.3,.3,.1,0xffdca8);
 }
 for(const [j,t] of [.505,.68,.845].entries()){
  // Occupy ONE lane at a time; a checkpoint should never be sealed.
  const h=hazardGroup("gate",t,j%2?3.5:-3.5,3.5,12+j*2,j*.26);
  const g=h.mesh;
  for(const s of [-1,1]){
   shape(THREE,g,"box",s*3.45,2.6,0,.55,5.2,.85,0x5a6263);
   shape(THREE,g,"sphere",s*3.45,5.6,0,.45,.45,.45,0xff4932);
  }
  h.bar=shape(THREE,g,"box",0,6.3,0,6.6,.35,.50,0xe7d8c0);
  for(let x=-3;x<=3;x+=1.5)shape(THREE,h.bar,"box",x,0,0,.52,.42,.54,0xd44836);
 }
 // Physical gate pillars remain solid while the arm is open.
 for(const gate of hazards.filter(h=>h.type==="gate")){
  const f=getFrameAt(gate.t);
  const base=f.point.clone().addScaledVector(f.normal,gate.side);
  for(const side of [-1,1]){
   const p=base.clone().addScaledVector(f.normal,side*3.45);
   addCircleCollider(p,.34,{
    minY:p.y-.4,maxY:p.y+6.3,drag:.52,
    tag:"SECURITY GATE SUPPORT"
   });
  }
 }
 for(const [j,t] of [.57,.90].entries()){
  const h=hazardGroup("blastdoor",t,j%2?-3.55:3.55,3.5,19+j*4,.4+j*.3);
  const g=h.mesh;
  for(const side of [-1,1])shape(THREE,g,"box",side*3.5,4,0,1.0,8,2.7,0x4e5150);
  shape(THREE,g,"box",0,8.2,0,8,1.7,3.0,0x565a56);
  h.bar=shape(THREE,g,"box",0,9.2,0,6.4,5.4,1.1,0x61645f);
  for(let x=-2.5;x<=2.5;x+=1)shape(THREE,h.bar,"box",x,0,.58,.24,4.1,.07,0xe8bf59);
 }
 // Readable fifteen-meter sand funnels, not tiny transparent spheres.
 // The physical gust radius matches the visible cloud footprint.
 const dustConeGeo=new THREE.CylinderGeometry(.65,5.7,16,24,8,true);
 const dustConeInnerGeo=new THREE.CylinderGeometry(.35,3.3,15,20,6,true);
 const dustPuffGeo=new THREE.SphereGeometry(.70,7,5);
 const dustPuffMat=new THREE.MeshBasicMaterial({
  color:0xd5b48a,transparent:true,opacity:.27,depthWrite:false,
  side:THREE.DoubleSide
 });
 for(let j=0;j<3;j++){
  const h=hazardGroup("dust",.35+j*.065,j%2?-2.2:2.2,
   10.8,12+j*3,j*.4);
  const g=h.mesh;
  const shell=new THREE.Mesh(dustConeGeo,new THREE.MeshBasicMaterial({
   color:0xc8a67e,transparent:true,opacity:.27,depthWrite:false,
   side:THREE.DoubleSide
  }));
  shell.position.y=8.3;g.add(shell);h.shell=shell;
  const inner=new THREE.Mesh(dustConeInnerGeo,new THREE.MeshBasicMaterial({
   color:0x907056,transparent:true,opacity:.18,depthWrite:false,
   side:THREE.DoubleSide
  }));
  inner.position.y=7.9;g.add(inner);h.inner=inner;
  h.puffs=[];
  for(let i=0;i<48;i++){
   const puff=new THREE.Mesh(dustPuffGeo,dustPuffMat);
   puff.scale.set(.75+seeded(i+j*70)*1.7,
    .55+seeded(i+j*34)*1.15,.75+seeded(i+j*70)*1.7);
   g.add(puff);h.puffs.push(puff);
  }
 }
 for(let j=0;j<2;j++){
  const h=hazardGroup("aircraft",.728+j*.036,0,8.2,23+j*11,j*.48);
  const g=h.mesh;
  shape(THREE,g,"box",0,2.7,0,3,2,17,0xaeb5b3);
  shape(THREE,g,"box",0,2.8,-1,17,.34,3.2,0x707e7e);
  shape(THREE,g,"box",0,4.2,-7,7,3,.9,0x697781);
  shape(THREE,g,"sphere",0,3.2,7.7,1.3,1.2,1.2,0xb9c9c3);
 }
 for(let j=0;j<14;j++){
  const h=hazardGroup("debris",.10+j*.056,((j%3)-1)*3.0,
    j%4===0?1.5:.7,8+j*.12,j*.14);
  const g=h.mesh;
  if(j%3===0){
   const tire=shape(THREE,g,"cylinder",0,.55,0,.68,.5,.7,0x282829);
   tire.rotation.z=Math.PI/2;
  }else shape(THREE,g,"box",0,.45,0,1,.7,1.2,j%2?0x756257:0x414443);
 }
 const active={lastCall:0,warning:0,hitCount:0,discovered:new Set()};
 const sunsetColor=new THREE.Color(0xd99365);
 const eveningColor=new THREE.Color(0x8a6680);
 const nightColor=new THREE.Color(0x343449);
 const skyColor=new THREE.Color();
 function update(delta,nowMs,car,carState,popup,raceStartAt=null){
  const sec=nowMs*.001;
  // Race-relative sunset to night, approximately four minutes. All clients
  // use the same Worker raceStartAt, so their twilight stage is identical.
  const passed=Number.isFinite(raceStartAt)?
   Math.max(0,nowMs-raceStartAt):0;
  const nightProgress=clamp(passed/145000,0,1);
  skyColor.copy(sunsetColor);
  if(nightProgress<.48)
   skyColor.lerp(eveningColor,nightProgress/.48);
  else skyColor.copy(eveningColor).lerp(nightColor,(nightProgress-.48)/.52);
  scene.background?.copy?.(skyColor);
  scene.fog?.color?.copy?.(skyColor);
  sun.material.opacity=1-nightProgress;
  sunsetLight.intensity=1.40*(1-nightProgress)+.025;
  desertFill.intensity=.55-.24*nightProgress;
  for(const f of floodLights){
   f.light.intensity=2.2+nightProgress*2.1;
   f.box.material.emissiveIntensity=.25+nightProgress*1.65;
  }
  for(const light of searchlights){
   light.pivot.rotation.y=Math.sin(sec*.46+light.t*12)*1.25;
   light.beam.material.opacity=.105+.045*Math.sin(sec*2.2+light.t*40);
  }
  for(const p of particles){
   p.mesh.position.set(
    p.base.x+Math.sin(sec*.7+p.phase)*1.8,
    p.base.y+Math.sin(sec*1.9+p.phase)*.7,
    p.base.z+Math.cos(sec*.48+p.phase)*2.1
   );
   p.mesh.rotation.y+=delta*.7;
  }
  // Keep last frame's location to detect crossing a closed barrier at speed.
  // Teleport/respawn movement is excluded.
  const lastCar=car&&carState?active.lastCarPosition:null;
  const sweptCar=lastCar&&
   Math.hypot(car.position.x-lastCar.x,car.position.z-lastCar.z)<15?
   lastCar:null;
  for(const h of hazards){
   const time=sec/h.period+h.phase;
   const phase=((time%1)+1)%1;
   // Convoys really travel along ~280 m of track per cycle. They do not
   // just rub back and forth against one spot on the road.
   // Ping-pong prevents instantly teleporting hundreds of meters.
   const travel=h.type==="convoy"||h.type==="tanker"?
     (.5-.5*Math.cos(phase*TWO_PI))*.052:0;
   const f=getFrameAt((h.t+travel)%1);
   const oscillation=Math.sin(phase*TWO_PI);
   const n=f.normal;
   const lateral=h.type==="convoy"||h.type==="tanker"?
     h.side+oscillation*2.9:
     h.type==="aircraft"?oscillation*16:
     h.type==="debris"?h.side+oscillation*1.25:
     h.side;
   h.mesh.position.copy(f.point).addScaledVector(n,lateral);
   h.mesh.rotation.y=f.rotationY;
   if(h.type==="gate"||h.type==="blastdoor"){
    const open=Math.sin(TWO_PI*phase)>-.08;
    h.open=open;
    // Previous arms floated 3m above the car yet hit its front bumper.
    // Closed gates now actually sit at bumper/windshield height;
    // open barriers lift visibly rather than instantly disappearing.
    const closedY=h.type==="gate"?1.15:2.7;
    const raisedY=h.type==="gate"?6.3:9.2;
    const targetY=open?raisedY:closedY;
    h.bar.position.y+=(targetY-h.bar.position.y)*
      Math.min(1,delta*5.8);
    h.bar.visible=true;
    h.mesh.children.forEach((part,i)=>{
      if(i<4&&part.material?.color?.getHex?.()===0xff4932){
       part.material.emissive?.setHex?.(0xff2417);
       part.material.emissiveIntensity=h.open?.12:
        (Math.sin(sec*8)>0?1.9:.25);
      }
    });
   }else if(h.type==="dust"){
    h.mesh.rotation.y=sec*.20+h.phase;
    h.shell.rotation.y=-sec*1.8;
    h.inner.rotation.y=sec*2.6;
    h.shell.material.opacity=.25+.05*Math.sin(sec*1.8+h.phase);
    h.puffs.forEach((p,i)=>{
     const rise=((sec*.17+i/48+h.phase)%1+1)%1;
     const a=i*2.39996+sec*(2.9-rise*1.2)+h.phase;
     const radius=1.2+rise*4.4+seeded(i+h.phase*10)*1.1;
     p.position.set(Math.cos(a)*radius, .4+rise*15.8,
      Math.sin(a)*radius);
    });
   }else if(h.type==="aircraft"){
    h.mesh.position.addScaledVector(f.tangent,3*Math.sin(sec*.31+h.phase));
    h.mesh.rotation.y+=.08*Math.sin(sec*.45);
   }else if(h.type==="convoy"||h.type==="tanker"){
    h.mesh.rotation.y=f.rotationY+
      (Math.sin(phase*TWO_PI)<0?Math.PI:0);
   }
   if(!car||!carState||!carState.velocity)continue;
   // Only collide once the actual 3D moving arm drops to car height.
   if((h.type==="gate"||h.type==="blastdoor")&&
      h.bar.position.y>(h.type==="gate"?2.6:5.1))continue;
   const dx=car.position.x-h.mesh.position.x,dz=car.position.z-h.mesh.position.z;
   const dist=Math.hypot(dx,dz);
   const across=dx*f.normal.x+dz*f.normal.z;
   const along=dx*f.tangent.x+dz*f.tangent.z;
   const isBarrier=h.type==="gate"||h.type==="blastdoor";
   let previousAlong=along,crossedBarrier=false;
   if(isBarrier&&sweptCar){
    const px=sweptCar.x-h.mesh.position.x,pz=sweptCar.z-h.mesh.position.z;
    previousAlong=px*f.tangent.x+pz*f.tangent.z;
    const previousAcross=px*f.normal.x+pz*f.normal.z;
    if(previousAlong*along<=0&&Math.abs(previousAlong-along)>.001){
     const t=previousAlong/(previousAlong-along);
     const crossingAcross=previousAcross+(across-previousAcross)*t;
     crossedBarrier=t>=0&&t<=1&&Math.abs(crossingAcross)<3.75;
    }
   }
   // Include car width and prevent fast cars skipping a 1-frame barrier.
   // Swept disk prevents moving aircraft, tankers and thin scrap
   // jumping between frames at 150–200 mph.
   let sweptCircle=false,hitNormalX=dx,hitNormalZ=dz;
   if(!isBarrier&&sweptCar){
    const ox=sweptCar.x-h.mesh.position.x,oz=sweptCar.z-h.mesh.position.z;
    const vx=dx-ox,vz=dz-oz,len=vx*vx+vz*vz;
    const t=len>1e-8?clamp(-(ox*vx+oz*vz)/len,0,1):0;
    const px=ox+vx*t,pz=oz+vz*t;
    sweptCircle=px*px+pz*pz<(h.radius+1)*(h.radius+1);
    if(sweptCircle&&dist>h.radius+1){
     hitNormalX=ox;hitNormalZ=oz;
    }
   }
   const blocked=isBarrier?
    (Math.abs(across)<3.75&&Math.abs(along)<2.45)||crossedBarrier:
    dist<h.radius+1.0||sweptCircle;
   if(!blocked||Math.abs(car.position.y-f.point.y)>3.2)continue;
   if(h.type==="dust"){
    // Vortex force is independent of RPM/accelerator, and the wake stays
    // slippery briefly after exiting. A 180 mph pass now gets a meaningful
    // sideways velocity change instead of the previous invisible 3.2m/s².
    const reach=h.radius+1,weight=clamp((reach-dist)/reach,.20,1);
    const inv=1/Math.max(1,dist);
    const circulation=h.phase%1>.5?-1:1;
    const tx=-dz*inv*circulation,tz=dx*inv*circulation;
    const wind=weight*delta;
    carState.velocity.x+=(tx*39+dx*inv*12+n.x*9)*wind;
    carState.velocity.z+=(tz*39+dz*inv*12+n.z*9)*wind;
    if(!carState.airborne)car.rotation.y+=
     (tx*n.x+tz*n.z)*.52*wind;
    carState.nevadaDustGripTimer=Math.max(
     carState.nevadaDustGripTimer||0,.85);
    carState.cameraShake=Math.max(carState.cameraShake,.38+weight*.36);
    if(sec-h.lastImpact>1.65){
     popup?.("DUST DEVIL · STRONG CROSSWIND · LOW GRIP",1050);
     h.lastImpact=sec;
    }
    continue;
   }
   let normal;
   if(isBarrier){
    // Keep the driver on the approaching side throughout hit cooldown.
    const side=(crossedBarrier?previousAlong:along)>=0?1:-1;
    normal=f.tangent.clone().setY(0).normalize().multiplyScalar(side);
    car.position.addScaledVector(f.tangent,side*2.5-along);
   }else{
    const hitDist=Math.max(.001,Math.hypot(hitNormalX,hitNormalZ));
    normal=new THREE.Vector3(hitNormalX/hitDist,0,hitNormalZ/hitDist);
    if(sweptCircle&&dist>h.radius+1)
     car.position.copy(sweptCar);
    else car.position.addScaledVector(normal,
     Math.max(0,h.radius+1.1-dist));
   }
   const into=carState.velocity.dot(normal);
   if(into<0)carState.velocity.addScaledVector(normal,-into);
   if(sec-h.lastImpact<1.25)continue;
   h.lastImpact=sec;active.hitCount++;
   carState.velocity.multiplyScalar(h.type==="blastdoor"?.25:
    h.type==="aircraft"?.30:.46);
   carState.impactPulse=1;
   carState.cameraShake=Math.max(carState.cameraShake,.72);
   popup?.(h.type==="gate"?"SECURITY GATE!":
     h.type==="blastdoor"?"BLAST DOOR!":
     h.type==="aircraft"?"RUNWAY INCURSION!":
     h.type==="debris"?"DEBRIS STRIKE!":"CONVOY COLLISION!",750);
  }
  // Discoverable alternate routes: physically reach the midpoint of
  // the *side path*, not merely the checkpoint on the main road.
  if(car&&carState&&carState.velocity){
   for(const route of shortcuts){
    if(active.discovered.has(route.name))continue;
    const mid=(route.from+route.to)*.5,f=getFrameAt(mid);
    const off=route.offset;
    const p=f.point.clone().addScaledVector(f.normal,off);
    // This passage is below the main highway in the hillside.
    p.y=roadsideHeight(f,off)+.25;
    if(Math.hypot(car.position.x-p.x,car.position.z-p.z)<6.3&&
       Math.abs(car.position.y-p.y)<3){
      active.discovered.add(route.name);
      carState.nitro=Math.min(100,(carState.nitro||0)+12);
      popup?.("SECRET FOUND · "+route.name+" · NITRO +12",1200);
    }
   }
  }
  // Spotlight alarm has a small legitimate gameplay consequence.
  if(car&&carState&&carState.velocity&&sec-active.warning>3){
   for(const l of searchlights){
    const dx=car.position.x-l.g.position.x,dz=car.position.z-l.g.position.z;
    const dist=Math.hypot(dx,dz);
    const heading=Math.atan2(dx,dz);
    const sweeping=l.pivot.rotation.y;
    if(dist<27&&Math.abs(Math.atan2(Math.sin(heading-sweeping),
        Math.cos(heading-sweeping)))<.42){
      active.warning=sec;
      carState.nitro=Math.max(0,(carState.nitro||0)-4);
      popup?.("SEARCHLIGHT LOCK · NITRO JAM",850);break;
    }
   }
  }
  active.lastCarPosition=car&&carState?car.position.clone():null;
 }
 // worldGroup's normal disposer owns all geometries and materials; do not
 // detach the root before it has traversed and released their resources.
 return {update,hazards,shortcuts,roadsideHeight,stats:active,dispose(){}};
}
