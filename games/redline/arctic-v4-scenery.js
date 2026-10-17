/*
 * REDLINE ARCTIC V4 — snow/rock texture, secondary forests, ice cracks
 * and cave accent lighting. Decorative geometry only.
 *
 * Consumes the SAME terrain height and road/shortcut clearance samplers
 * as Arctic V3. No new obstacles, colliders, rail segments, gameplay
 * events, physics state, or network packets.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mulberry=(seed)=>()=>{
 let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);
 t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;
};
function batch(THREE,root,geometry,mat,items,name){
 if(!items.length)return null;
 const inst=new THREE.InstancedMesh(geometry,mat,items.length);
 inst.name="ARCTIC_V4_"+name;
 const ob=new THREE.Object3D();
 items.forEach((p,i)=>{
   ob.position.set(p.x,p.y,p.z);
   ob.rotation.set(p.rx||0,p.rot||0,p.rz||0);
   ob.scale.set(p.w,p.h,p.d);
   ob.updateMatrix();inst.setMatrixAt(i,ob.matrix);
 });
 inst.instanceMatrix.needsUpdate=true;
 inst.frustumCulled=false;
 root.add(inst);
 return inst;
}
function makeMicrotexture(THREE){
 const canvas=document.createElement("canvas");
 canvas.width=canvas.height=256;
 const ctx=canvas.getContext("2d");
 const rng=mulberry(154971);
 ctx.fillStyle="#e4ebed";
 ctx.fillRect(0,0,256,256);
 // Fine gravel dust and wind-compressed ice. Light enough to retain the
 // original mountain vertex snow line and soft night-time atmosphere.
 for(let i=0;i<13500;i++){
   const x=Math.floor(rng()*256),y=Math.floor(rng()*256);
   const bright=rng()>.54,shade=bright?243:188+Math.floor(rng()*32);
   ctx.fillStyle="rgba("+shade+","+Math.min(255,shade+5)+","+
     Math.min(255,shade+10)+","+(bright?.20:.16)+")";
   ctx.fillRect(x,y,1+rng()*2,1);
 }
 for(let i=0;i<380;i++){
   const x=rng()*256,y=rng()*256;
   ctx.fillStyle="rgba(90,110,131,"+(.055+rng()*.09)+")";
   ctx.fillRect(x,y,2+rng()*19,.45+rng()*.75);
 }
 const t=new THREE.CanvasTexture(canvas);
 t.wrapS=t.wrapT=THREE.RepeatWrapping;
 t.repeat.set(26,24);
 t.colorSpace=THREE.SRGBColorSpace;
 t.anisotropy=2;
 return t;
}
/** @param {Object} scene V3's returned terrain sampling and mesh data */
export function buildArcticV4Scenery({
  THREE,worldGroup,trackSamples,getFrameAt,roadHalf,sidewalkOuter,
  scene,shortcut=null,originalMountains=[]
}={}){
 if(!THREE||!worldGroup||!trackSamples?.length||!scene?.terrain||
    !scene.heightAt||!scene.roadDistance||!scene.shortcutDistance)
   throw new Error("Arctic V4 needs the original terrain/track samplers");
 const root=new THREE.Group();
 root.name="REDLINE_ARCTIC_V4_SCENERY";
 worldGroup.add(root);
 const rng=mulberry(41782);
 const heightAt=scene.heightAt,roadDistance=scene.roadDistance;
 const shortcutDistance=scene.shortcutDistance;
 const lakeCenter=scene.lakeCenter;
 const isSafe=(x,z,minimumRoad=sidewalkOuter+23)=>{
   const d=roadDistance(x,z);
   if(d<minimumRoad||shortcutDistance(x,z)<32)return false;
   if(lakeCenter&&Math.hypot(x-lakeCenter.x,z-lakeCenter.z)<175)return false;
   for(const peak of originalMountains){
     if(!peak?.mesh?.position)continue;
     // Avoid decorative saplings inside the old mountain's collision ring.
     const radius=peak.height*.45+7;
     const dx=x-peak.mesh.position.x,dz=z-peak.mesh.position.z;
     if(dx*dx+dz*dz<radius*radius)return false;
   }
   return true;
 };
 const tex=makeMicrotexture(THREE);
 // Very subtle surface breakup on the existing sculpted snow, never
 // replace a physical terrain geometry or raise its road-edge heights.
 const terrainMat=scene.terrain.material;
 terrainMat.map=tex;
 terrainMat.color?.set?.(0xffffff);
 terrainMat.roughness=.985;
 terrainMat.bumpMap=tex;
 terrainMat.bumpScale=.085;
 terrainMat.needsUpdate=true;
 // Mountain meshes keep their original rocky vertex colors; the bump
 // texture only breaks the otherwise perfectly smooth sculpted surfaces.
 const rocks=[
   ...originalMountains.map(x=>x.mesh).filter(Boolean),
   ...(scene.distantMeshes||[])
 ];
 let texturedMountains=0;
 for(const mesh of rocks){
   if(!mesh.material||!mesh.geometry?.attributes?.uv)continue;
   mesh.material.bumpMap=tex;
   mesh.material.bumpScale=.27;
   mesh.material.roughness=.96;
   mesh.material.needsUpdate=true;
   texturedMountains++;
 }
 const darkPine=new THREE.MeshStandardMaterial({
   color:0x294d48,roughness:1,metalness:0
 });
 const brightPine=new THREE.MeshStandardMaterial({
   color:0x345a54,roughness:1,metalness:0
 });
 const snowy=new THREE.MeshStandardMaterial({
   color:0xddeaf0,roughness:.98,metalness:0
 });
 const wood=new THREE.MeshStandardMaterial({
   color:0x544b49,roughness:.99,metalness:0
 });
 const trunks=[],lower=[],upper=[],powder=[],snags=[];
 const treeSites=[];
 // Secondary forests fill the empty gaps between V3's large pine groups,
 // without touching the road, lake, shortcuts or mountain collision rings.
 for(let i=0;i<1350&&treeSites.length<380;i++){
   const frame=trackSamples[Math.floor(rng()*trackSamples.length)];
   if(!frame?.point||!frame.normal||!frame.tangent)continue;
   const side=rng()>.5?1:-1;
   const offset=side*(sidewalkOuter+34+rng()*150);
   const along=(rng()-.5)*45;
   const x=frame.point.x+frame.normal.x*offset+frame.tangent.x*along;
   const z=frame.point.z+frame.normal.z*offset+frame.tangent.z*along;
   if(!isSafe(x,z))continue;
   const ground=heightAt(x,z),h=3.2+rng()*10.1;
   const shade=rng(),angle=rng()*Math.PI*2;
   treeSites.push({x,y:ground,z,h,angle,shade});
   trunks.push({x,y:ground+h*.20,z,w:.36+rng()*.20,h:h*.40,d:.36+rng()*.20,rot:angle});
   if(shade<.07){
     snags.push({x,y:ground+h*.61,z,w:.13,h:h*.75,d:.13,rot:angle});
     continue;
   }
   lower.push({x,y:ground+h*.44,z,w:h*.27,h:h*.58,d:h*.27,rot:angle});
   upper.push({x,y:ground+h*.70,z,w:h*.21,h:h*.43,d:h*.21,rot:angle});
   if(shade>.26)
     powder.push({x,y:ground+h*.72,z,w:h*.19,h:h*.12,d:h*.19,rot:angle});
 }
 batch(THREE,root,new THREE.CylinderGeometry(.5,.7,1,7),wood,trunks,"forest_trunks");
 batch(THREE,root,new THREE.ConeGeometry(.5,1,9),darkPine,lower,"forest_pine_lower");
 batch(THREE,root,new THREE.ConeGeometry(.5,1,9),brightPine,upper,"forest_pine_upper");
 batch(THREE,root,new THREE.ConeGeometry(.5,1,9),snowy,powder,"forest_snow_caps");
 batch(THREE,root,new THREE.CylinderGeometry(.5,.9,1,6),wood,snags,"old_tree_snags");

 // Layered wind-packed shoulder drifts and small uneven rock chips are
 // *all* decorative and not on the original driving line.
 const drift=[],stones=[];
 for(let i=0;i<920&&drift.length<470;i++){
   const frame=trackSamples[Math.floor(rng()*trackSamples.length)];
   if(!frame?.point||!frame.normal||!frame.tangent)continue;
   const offset=(rng()>.5?1:-1)*(sidewalkOuter+14+rng()*125);
   const along=(rng()-.5)*31;
   const x=frame.point.x+frame.normal.x*offset+frame.tangent.x*along;
   const z=frame.point.z+frame.normal.z*offset+frame.tangent.z*along;
   if(!isSafe(x,z,sidewalkOuter+13))continue;
   const ground=heightAt(x,z),radius=.45+rng()*1.85;
   const stone=rng()<.28;
   const list=stone?stones:drift;
   list.push({x,y:ground+(stone?.15:.08),z,w:radius*(1.1+rng()*.8),
     h:stone?.25+rng()*.25:.10+rng()*.23,
     d:radius*(.65+rng()*.9),rot:rng()*Math.PI*2});
 }
 const stoneMat=new THREE.MeshStandardMaterial({
   color:0x748794,roughness:.92,metalness:.02
 });
 batch(THREE,root,new THREE.IcosahedronGeometry(1,1),snowy,drift,"wind_drifts");
 batch(THREE,root,new THREE.DodecahedronGeometry(1,0),stoneMat,stones,"scattered_scree");

 // Cracked ice near, but never on, the lake crossing. Sparse broken
 // lines rather than billboard textures, all slightly above lake water.
 const crackVertices=[];
 let cracks=0;
 if(lakeCenter){
   for(let i=0;i<180;i++){
     const angle=rng()*Math.PI*2,radius=Math.sqrt(rng())*159;
     let x=lakeCenter.x+Math.cos(angle)*radius;
     let z=lakeCenter.z+Math.sin(angle)*radius;
     if(roadDistance(x,z)<roadHalf+16 || shortcutDistance(x,z)<20)continue;
     let direction=rng()*Math.PI*2;
     for(let j=0;j<3;j++){
       direction+=(rng()-.5)*.9;
       const len=1.4+rng()*4.1;
       const nx=x+Math.cos(direction)*len,nz=z+Math.sin(direction)*len;
       if(Math.hypot(nx-lakeCenter.x,nz-lakeCenter.z)>166||
          roadDistance(nx,nz)<roadHalf+14)break;
       crackVertices.push(x,.019,z,nx,.019,nz);
       x=nx;z=nz;cracks++;
     }
   }
 }
 if(crackVertices.length){
   const g=new THREE.BufferGeometry();
   g.setAttribute("position",new THREE.Float32BufferAttribute(crackVertices,3));
   const cracksMesh=new THREE.LineSegments(g,new THREE.LineBasicMaterial({
     color:0x91d5e7,transparent:true,opacity:.51,depthWrite:false
   }));
   cracksMesh.name="ARCTIC_V4_LAKE_CRACKS";
   root.add(cracksMesh);
 }
 // Cave-side guide LEDs stay attached to the EXISTING continuous tunnel
 // curvature. They are outside the 6.6m asphalt racing half-width,
 // flush with the excavated wall, and do not add colliders.
 const tunnelSegments=[
   [.178,.218,false],
   [.605,.648,true],
   [.855,.892,true]
 ];
 const sideLights=[],iceLights=[],portals=[];
 for(const [start,end,ice] of tunnelSegments){
   const N=24;
   for(let j=0;j<N;j++){
     const t=start+(j+.5)/N*(end-start);
     const f=getFrameAt(t);
     const p=f.point;
     const length=j<N-1?Math.max(.30,(
       ()=>{const n=getFrameAt(start+(j+1)/N*(end-start));
         return Math.hypot(n.point.x-p.x,n.point.z-p.z)})()):2.9;
     for(const side of [-1,1]){
       const offset=side*(sidewalkOuter+3.90);
       const x=p.x+f.normal.x*offset,z=p.z+f.normal.z*offset;
       const strip={x,y:p.y+6.25,z,w:.095,h:.08,
         d:Math.min(7,Math.max(.9,length)),rot:f.rotationY};
       (ice?iceLights:sideLights).push(strip);
     }
   }
   for(const t of [start+.0002,end-.0002]){
     const f=getFrameAt(t);
     for(const side of [-1,1]){
       const offset=side*(sidewalkOuter+5.5);
       portals.push({x:f.point.x+f.normal.x*offset,
         y:f.point.y+2.1,z:f.point.z+f.normal.z*offset,
         w:.18,h:3.9,d:.19,rot:f.rotationY});
     }
   }
 }
 batch(THREE,root,new THREE.BoxGeometry(1,1,1),
   new THREE.MeshBasicMaterial({color:0xffdfab}),
   sideLights,"north_pass_warm_lights");
 batch(THREE,root,new THREE.BoxGeometry(1,1,1),
   new THREE.MeshBasicMaterial({color:0x81cfee}),
   iceLights,"ice_cave_blue_lights");
 batch(THREE,root,new THREE.BoxGeometry(1,1,1),
   new THREE.MeshBasicMaterial({color:0xb2ddec}),
   portals,"cave_portal_markers");
 return {
   root,secondaryTrees:treeSites.length,drifts:drift.length,
   scree:stones.length,cracks,lights:sideLights.length+iceLights.length,
   portalMarkers:portals.length,texturedMountains,
   // Testable invariant: these placement lists stay outside the
   // original drivable asphalt and the dangerous shortcut corridors.
   visualSites:[...treeSites.map(v=>({x:v.x,z:v.z,type:"tree"})),
     ...drift.map(v=>({x:v.x,z:v.z,type:"drift"})),
     ...stones.map(v=>({x:v.x,z:v.z,type:"stone"}))]
 };
}
