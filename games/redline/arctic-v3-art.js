/*
 * ARCTIC RELAY V3 — geometry-first alpine scenery.
 * All landmarks share the original Catmull-Rom road and checkpoint frames.
 * No downloaded assets, gameplay controls, timer, or network changes.
 */
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function random(seed){let s=seed>>>0;return ()=>((s=Math.imul(1664525,s)+1013904223>>>0)/4294967296)}
function noise(x,z){
 return Math.sin(x*.015+Math.cos(z*.009)*2.2)*.42+
   Math.cos(z*.019+x*.006)*.30+
   Math.sin(x*.058+z*.041)*.13+
   Math.cos(z*.081-x*.092)*.08;
}
export function createRuggedMountainGeometry(THREE,radius,height,seed=1,dark=false){
 // Forty-eight radial faces and nineteen contour rings, with curved
 // lateral ridges and snow by altitude. Unlike cones, the skyline has
 // several offset peaks, asymmetric valleys, and exposed rock channels.
 const around=56,rings=20,pos=[],colors=[],indices=[];
 const rock=dark?[.225,.29,.34]:[.30,.36,.405];
 const snow=[.78,.88,.935],ridge=[.50,.59,.66];
 const rand=random(seed*7919+7);
 const phase=rand()*6.283,aspect=rand()*6.283;
 for(let j=0;j<=rings;j++){
   const t=j/rings,r=1-t;
   for(let k=0;k<=around;k++){
     const angle=k/around*Math.PI*2;
     const face=Math.sin(3*angle+phase)*.09+
       Math.sin(7*angle+aspect+t*6)*.045+
       Math.cos(11*angle+phase*.7-t*4)*.022;
     const twist=(Math.sin(t*4+phase)*.12+
       Math.sin(5*angle+t*7+phase)*.045)*(1-r);
     const rr=radius*(r+.004)*(1+face);
     const x=Math.cos(angle+twist)*rr+
       radius*.09*t*Math.sin(phase);
     const z=Math.sin(angle+twist)*rr+
       radius*.09*t*Math.cos(aspect);
     const channel=Math.abs(Math.sin(angle*5+phase+2.3*t));
     const peaks=Math.sin(angle*4.0+phase)*Math.sin(Math.PI*t)*.13+
       Math.cos(angle*7.0+aspect+1.8*t)*Math.sin(Math.PI*t)*.045;
     const h=clamp(Math.pow(t,1.43)+peaks,0,1);
     const y=-height*.42+height*h;
     pos.push(x,y,z);
     const snowLine=.58+.075*Math.sin(angle*5+phase)-
       .045*Math.cos(angle*8+t*7)+.03*channel;
     const ice=smooth(snowLine-.035,snowLine+.095,h);
     const rough=(Math.sin(angle*17+t*13+phase)*.5+.5)*.065;
     const rcolor=rock.map((c,i)=>c*(1+rough)+ridge[i]*.075*channel);
     colors.push(...rcolor.map((c,i)=>clamp(c*(1-ice)+snow[i]*ice,0,1)));
   }
 }
 for(let j=0;j<rings;j++)for(let k=0;k<around;k++){
   const a=j*(around+1)+k,b=a+around+1;
   // Outer-facing normals keep the shaded rock silhouette lit correctly.
   indices.push(a,b,a+1,b,b+1,a+1);
 }
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(pos,3));
 geo.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
 geo.setIndex(indices);
 geo.computeVertexNormals();
 return geo;
}
export function buildArcticV3Art({
 THREE,worldGroup,trackSamples,getFrameAt,roadHalf,sidewalkOuter,
 addCircleCollider,addBoxCollider,addRail,shortcut
}){
 const rng=random(738821);
 const coords=trackSamples.filter((_,i)=>i%5===0).map(
   frame=>[frame.point.x,frame.point.z]);
 const lakeFrame=getFrameAt(.420);
 const lakeCenter=lakeFrame.point.clone().addScaledVector(lakeFrame.normal,-52);
 const shortcutStart=shortcut?.start||null,shortcutEnd=shortcut?.end||null;
 const shortcutDistance=(x,z)=>{
   if(!shortcutStart||!shortcutEnd)return 1e9;
   const dx=shortcutEnd.x-shortcutStart.x,dz=shortcutEnd.z-shortcutStart.z;
   const t=clamp(((x-shortcutStart.x)*dx+(z-shortcutStart.z)*dz)/
     Math.max(.001,dx*dx+dz*dz),0,1);
   return Math.hypot(x-shortcutStart.x-t*dx,z-shortcutStart.z-t*dz);
 };
 function roadDistance(x,z){
   let best=Infinity;
   for(const [a,b] of coords){
     const d=(x-a)**2+(z-b)**2;
     if(d<best)best=d;
   }
   return Math.sqrt(best);
 }
 function heightAt(x,z,near=null){
   const dist=near===null?roadDistance(x,z):near;
   const lakeDist=Math.hypot(x-lakeCenter.x,z-lakeCenter.z);
   const safeDistance=Math.min(dist,shortcutDistance(x,z)+15);
   let elev=-.13+smooth(29,135,safeDistance)*
      (19+15*noise(x,z)+
        20*Math.pow(Math.sin(x*.0039-z*.0056),2));
   // The lake remains visible above its basin; shore emerges gradually.
   const bank=smooth(181,225,lakeDist);
   elev=-.20+(elev+.20)*bank;
   return Math.max(-.22,elev);
 }
 // Terrain beneath the route: road edge exactly at Y≈0; graded drifts
 // increase at a safe distance from roads, ramps, and shortcut corridors.
 const width=2450,depth=2250,segX=150,segZ=126;
 const terrainGeo=new THREE.PlaneGeometry(width,depth,segX,segZ);
 terrainGeo.rotateX(-Math.PI/2);
 const verts=terrainGeo.attributes.position;
 const shades=[];
 for(let i=0;i<verts.count;i++){
   const x=verts.getX(i),z=verts.getZ(i),d=roadDistance(x,z);
   const y=heightAt(x,z,d);
   verts.setY(i,y);
   const pale=smooth(2,42,y),val=clamp(noise(x,z)*.065,-.08,.08);
   shades.push(.70+.12*pale+val,.79+.10*pale+val,.85+.09*pale+val);
 }
 verts.needsUpdate=true;
 terrainGeo.setAttribute("color",new THREE.Float32BufferAttribute(shades,3));
 terrainGeo.computeVertexNormals();
 const terrain=new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({
   vertexColors:true,roughness:.98,metalness:0,side:THREE.DoubleSide
 }));
 terrain.receiveShadow=true;
 worldGroup.add(terrain);

 // Distant mountain ridges: protected by real road clearance. The old
 // game-play mountain colliders are not removed or shifted.
 const alpMat=new THREE.MeshStandardMaterial({
   vertexColors:true,roughness:.98,metalness:0,
   flatShading:false,side:THREE.DoubleSide
 });
 let distantPeaks=0;
 for(let i=0;i<32;i++){
   const t=(.025+i*.0309)%1,frame=getFrameAt(t);
   const side=i%2?1:-1,radius=55+(i%5)*18;
   let dist=side*(radius+100+(i%3)*22);
   const site=frame.point.clone().addScaledVector(frame.normal,dist);
   const nearest=roadDistance(site.x,site.z);
   const lane=Math.abs(shortcutDistance(site.x,site.z));
   if(nearest<radius+50||lane<radius+38)continue;
   const height=(125+(i%7)*21)*(0.86+.25*rng());
   const massif=new THREE.Mesh(createRuggedMountainGeometry(
     THREE,radius,height,i*73+11,i%3===0),alpMat);
   massif.position.set(site.x,height*.42+heightAt(site.x,site.z),site.z);
   massif.rotation.y=rng()*Math.PI*2;
   worldGroup.add(massif);
   distantPeaks++;
 }

 // Trees: 3 tiers of needles plus snowy branch shelves — still five draw
 // calls no matter how many trees we draw, suited to Chromebook GPUs.
 const trees=[];
 for(let i=0;i<trackSamples.length;i+=10){
   const frame=trackSamples[i];
   for(const side of [-1,1]){
     for(let depth=0;depth<4;depth++){
       const along=(rng()-.5)*19;
       const offset=side*(27+depth*20+rng()*9);
       const x=frame.point.x+frame.normal.x*offset+frame.tangent.x*along;
       const z=frame.point.z+frame.normal.z*offset+frame.tangent.z*along;
       const clear=roadDistance(x,z);
       if(clear<roadHalf+17||shortcutDistance(x,z)<19)continue;
       const lakeDist=Math.hypot(x-lakeCenter.x,z-lakeCenter.z);
       if(lakeDist<150)continue;
       const height=4.6+rng()*7;
       trees.push({x,z,y:heightAt(x,z,clear),height,angle:rng()*6.283,
         snowy:rng()>.21});
     }
   }
 }
 const dummy=new THREE.Object3D();
 const trunkGeo=new THREE.CylinderGeometry(.16,.26,1,7);
 const branchGeo=new THREE.ConeGeometry(1,1,9,1);
 const snowyGeo=new THREE.ConeGeometry(1,1,9,1);
 const trunkMat=new THREE.MeshStandardMaterial({color:0x55443a,roughness:1});
 const pineMat=new THREE.MeshStandardMaterial({color:0x244c47,roughness:1});
 const snowMat=new THREE.MeshStandardMaterial({color:0xe3f0f2,roughness:.94});
 const trunkMesh=new THREE.InstancedMesh(trunkGeo,trunkMat,trees.length);
 const pines=new THREE.InstancedMesh(branchGeo,pineMat,trees.length*3);
 const caps=new THREE.InstancedMesh(snowyGeo,snowMat,trees.length*2);
 let pineIndex=0,capIndex=0;
 for(let i=0;i<trees.length;i++){
   const tree=trees[i],h=tree.height;
   dummy.rotation.set(0,tree.angle,0);
   dummy.position.set(tree.x,tree.y+h*.16,tree.z);
   dummy.scale.set(1,h*.34,1);dummy.updateMatrix();
   trunkMesh.setMatrixAt(i,dummy.matrix);
   for(let layer=0;layer<3;layer++){
     const width=(.96-layer*.27)*h*.29;
     const layerHeight=(.48-layer*.10)*h;
     const y=tree.y+h*(.47+layer*.185);
     dummy.position.set(tree.x,y,tree.z);
     dummy.scale.set(width,layerHeight,width);
     dummy.updateMatrix();pines.setMatrixAt(pineIndex++,dummy.matrix);
   }
   for(let j=0;j<2;j++){
     dummy.position.set(tree.x,tree.y+h*(.60+j*.185),tree.z);
     const width=h*(.235-j*.066);
     dummy.scale.set(width,h*.22,width);
     dummy.updateMatrix();
     caps.setMatrixAt(capIndex++,dummy.matrix);
   }
   // Only tree trunks near accessible terrain are physical obstacles.
   if(roadDistance(tree.x,tree.z)<sidewalkOuter+27)
     addCircleCollider(new THREE.Vector3(tree.x,0,tree.z),.65,{
       maxY:h+1,bounce:.10,drag:.45,tag:"PINE"});
 }
 for(const mesh of [trunkMesh,pines,caps]){
   mesh.instanceMatrix.needsUpdate=true;
   mesh.frustumCulled=false;
   worldGroup.add(mesh);
 }

 // Ice-packed wheel ruts and irregular shoulder snowdrifts make the
 // continuous road feel used rather than looking like a flat dark ribbon.
 // Geometry hugs the exact spline, so no ghost lane markings appear.
 const rutMat=new THREE.MeshStandardMaterial({
   color:0x8598a5,roughness:.78,metalness:.015,
   transparent:true,opacity:.43,depthWrite:false
 });
 const rutSamples=trackSamples.filter((_,i)=>i%4===0);
 const ruts=new THREE.InstancedMesh(
   new THREE.BoxGeometry(.23,.018,2.15),rutMat,rutSamples.length*2);
 const roadDummy=new THREE.Object3D();
 let mark=0;
 for(const sample of rutSamples){
   for(const offset of [-1.58,1.58]){
     roadDummy.position.copy(sample.point).addScaledVector(
       sample.normal,offset);
     roadDummy.position.y=sample.point.y+.087;
     roadDummy.rotation.set(0,sample.rotationY,0);
     roadDummy.scale.set(.78+(mark%3)*.12,1,1.1+(mark%5)*.04);
     roadDummy.updateMatrix();
     ruts.setMatrixAt(mark++,roadDummy.matrix);
   }
 }
 ruts.instanceMatrix.needsUpdate=true;
 worldGroup.add(ruts);
 const crestMat=new THREE.MeshStandardMaterial({
   color:0xdbe8ec,roughness:.99
 });
 const banks=new THREE.InstancedMesh(
   new THREE.IcosahedronGeometry(1,1),crestMat,
   Math.ceil(trackSamples.length/9)*2);
 let bankCount=0;
 for(let i=0;i<trackSamples.length;i+=9){
   const frame=trackSamples[i];
   for(const side of [-1,1]){
     const offset=side*(sidewalkOuter+2.6);
     const x=frame.point.x+frame.normal.x*offset;
     const z=frame.point.z+frame.normal.z*offset;
     if(roadDistance(x,z)<roadHalf+4)continue;
     roadDummy.position.set(x,-.12,z);
     roadDummy.rotation.set(0,frame.rotationY,0);
     roadDummy.scale.set(1.5+rng()*.6,.27+rng()*.25,3.0+rng()*2);
     roadDummy.updateMatrix();
     banks.setMatrixAt(bankCount++,roadDummy.matrix);
   }
 }
 banks.count=bankCount;
 banks.instanceMatrix.needsUpdate=true;
 worldGroup.add(banks);
 // Emergency reflector poles indicate the road edges in snow and fog.
 const markerPosts=new THREE.InstancedMesh(
   new THREE.CylinderGeometry(.075,.12,1.4,7),
   new THREE.MeshStandardMaterial({color:0x7d97a6,metalness:.35,roughness:.62}),
   Math.ceil(trackSamples.length/20)*2);
 const markerReflectors=new THREE.InstancedMesh(
   new THREE.BoxGeometry(.31,.21,.16),
   new THREE.MeshBasicMaterial({color:0xffd69b}),
   Math.ceil(trackSamples.length/20)*2);
 let markerCount=0;
 for(let i=0;i<trackSamples.length;i+=20){
   const frame=trackSamples[i];
   for(const side of [-1,1]){
     const offset=side*(sidewalkOuter+2.4);
     const x=frame.point.x+frame.normal.x*offset;
     const z=frame.point.z+frame.normal.z*offset;
     if(roadDistance(x,z)<roadHalf+4.0)continue;
     roadDummy.position.set(x,.52,z);
     roadDummy.rotation.set(0,frame.rotationY,0);
     roadDummy.scale.set(1,1,1);roadDummy.updateMatrix();
     markerPosts.setMatrixAt(markerCount,roadDummy.matrix);
     roadDummy.position.y=1.03;
     roadDummy.updateMatrix();
     markerReflectors.setMatrixAt(markerCount,roadDummy.matrix);
     markerCount++;
   }
 }
 for(const mesh of [markerPosts,markerReflectors]){
   mesh.count=markerCount;
   mesh.instanceMatrix.needsUpdate=true;
   worldGroup.add(mesh);
 }

 // Ice/rock scatter, safely outside asphalt and secret jump lanes.
 const boulderMat=new THREE.MeshStandardMaterial({
   color:0x697f8b,roughness:.94,flatShading:false
 });
 const chunks=new THREE.InstancedMesh(
   new THREE.DodecahedronGeometry(1,1),boulderMat,310);
 let rockCount=0;
 for(let i=0;i<360&&rockCount<310;i++){
   const frame=trackSamples[Math.floor(rng()*trackSamples.length)];
   const side=rng()>.5?1:-1,d=side*(sidewalkOuter+12+rng()*94);
   const x=frame.point.x+frame.normal.x*d+
     frame.tangent.x*(rng()-.5)*24;
   const z=frame.point.z+frame.normal.z*d+
     frame.tangent.z*(rng()-.5)*24;
   const clear=roadDistance(x,z);
   if(clear<sidewalkOuter+11||shortcutDistance(x,z)<17)continue;
   const radius=1.1+rng()*3.4,y=heightAt(x,z,clear);
   dummy.position.set(x,y+radius*.37,z);
   dummy.rotation.set(rng(),rng()*6.28,rng()*.4);
   dummy.scale.set(radius*(.85+rng()*.3),radius*.65,radius*1.25);
   dummy.updateMatrix();chunks.setMatrixAt(rockCount++,dummy.matrix);
   if(clear<sidewalkOuter+25 && radius>2.1)
     addCircleCollider(new THREE.Vector3(x,0,z),radius*.58,{
       maxY:radius*1.6,bounce:.12,drag:.40,tag:"ROCK"});
 }
 chunks.count=rockCount;
 chunks.instanceMatrix.needsUpdate=true;
 chunks.frustumCulled=false;
 worldGroup.add(chunks);

 // Bridge guardrail structures track the spline continuously. Struts
 // sit outside the snow shoulder; their physics are registered exactly
 // where the visible rails run.
 const bridgeMat=new THREE.MeshStandardMaterial({
   color:0x748b99,roughness:.64,metalness:.42
 });
 const postMat=new THREE.MeshStandardMaterial({
   color:0xbccfd9,roughness:.70,metalness:.12
 });
 for(const [start,end] of [[.287,.317],[.761,.793]]){
   for(const side of [-1,1]){
     let prev=null;
     for(let k=0;k<=22;k++){
       const t=start+(end-start)*k/22,frame=getFrameAt(t);
       const at=frame.point.clone().addScaledVector(
         frame.normal,side*(sidewalkOuter+1.7));
       if(prev){
         const delta=at.clone().sub(prev);
         // Keep bridge rails out of the other approach whenever
         // nearby pieces of this very long spline double back.
         if(roadDistance(at.x,at.z)<roadHalf+3.5 ||
            roadDistance(prev.x,prev.z)<roadHalf+3.5){
           prev=at;continue;
         }
         const length=Math.hypot(delta.x,delta.z);
         const middle=at.clone().add(prev).multiplyScalar(.5);
         const rail=new THREE.Mesh(
           new THREE.BoxGeometry(.16,.34,delta.length()),bridgeMat);
         rail.position.set(middle.x,.94,middle.z);
         rail.rotation.order="YXZ";
         rail.rotation.y=Math.atan2(delta.x,delta.z);
         worldGroup.add(rail);
         addRail?.(new THREE.Vector2(prev.x,prev.z),
           new THREE.Vector2(at.x,at.z),0);
       }
       if(k%2===0){
         const post=new THREE.Mesh(
           new THREE.BoxGeometry(.16,1.0,.16),postMat);
         post.position.set(at.x,.55,at.z);worldGroup.add(post);
       }
       prev=at;
     }
   }
 }

 // Tunnel faces with rock-colored arched portals, safely outside the
 // road and high above the normal car envelope.
 const tunnelMat=new THREE.MeshStandardMaterial({
   color:0x697d86,roughness:.95
 });
 const iceMat=new THREE.MeshStandardMaterial({
   color:0xafdce7,roughness:.31,metalness:.10
 });
 for(const [a,b,ice] of [[.178,.218,false],[.855,.892,true]]){
   for(const t of [a,b]){
     const frame=getFrameAt(t),group=new THREE.Group();
     group.position.copy(frame.point);group.rotation.y=frame.rotationY;
     const span=sidewalkOuter+6;
     const points=[];
     for(let k=0;k<=18;k++){
       const u=k/18,angle=Math.PI*u;
       points.push(new THREE.Vector3(
         -span*Math.cos(angle),7.8+5.7*Math.sin(angle),0));
     }
     const arch=new THREE.Mesh(
       new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),36,.50,7,false),
       ice?iceMat:tunnelMat);
     group.add(arch);
     for(const x of [-span,span]){
       const post=new THREE.Mesh(
         new THREE.CylinderGeometry(.46,.61,7.6,9),ice?iceMat:tunnelMat);
       post.position.set(x,3.9,0);group.add(post);
     }
     worldGroup.add(group);
   }
 }

 // Scientific snow outposts, solar lamps, antennas and service hoppers.
 // Buildings are well off the shoulder to keep the first-race line clear.
 const metal=new THREE.MeshStandardMaterial({
   color:0x4c6474,roughness:.68,metalness:.25
 });
 const warm=new THREE.MeshBasicMaterial({color:0xffde9e});
 const roofs=new THREE.MeshStandardMaterial({color:0xd9e9ef,roughness:.93});
 for(const [t,side] of [[.018,-1],[.035,1],[.736,-1],[.913,1]]){
   const frame=getFrameAt(t);
   const camp=new THREE.Group();
   camp.position.copy(frame.point).addScaledVector(frame.normal,side*39);
   camp.rotation.y=frame.rotationY;
   const hut=new THREE.Mesh(new THREE.BoxGeometry(11,5,8),metal);
   hut.position.y=2.6;camp.add(hut);
   const roof=new THREE.Mesh(new THREE.BoxGeometry(12,1.2,9),roofs);
   roof.position.y=5.7;camp.add(roof);
   for(const x of [-3.3,3.3]){
     const windowMesh=new THREE.Mesh(new THREE.BoxGeometry(1.55,1.4,.09),warm);
     windowMesh.position.set(x,3.25,-4.08);camp.add(windowMesh);
   }
   const aerial=new THREE.Mesh(new THREE.CylinderGeometry(.06,.09,7,6),metal);
   aerial.position.set(3.6,9.5,1.2);camp.add(aerial);
   const bulb=new THREE.Mesh(new THREE.SphereGeometry(.25,6,5),
     new THREE.MeshBasicMaterial({color:0xf7cf94}));
   bulb.position.set(3.6,13.0,1.2);camp.add(bulb);
   worldGroup.add(camp);
   addBoxCollider?.(camp.position,5.5,4,camp.rotation.y,
     {minY:-1,maxY:7.2,bounce:.11,drag:.35,tag:"OUTPOST"});
 }
 return {terrain,treeCount:trees.length,rockCount,distantPeaks};
}
