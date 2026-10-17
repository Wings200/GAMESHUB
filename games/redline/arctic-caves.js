/*
 * Arctic caves V4. Continuous lofted excavated rock instead of a chain of
 * sphere blobs and unconnected ceiling slabs. The shortcut uses ONE true
 * manifold opening cut out of a wide grounded cliff face.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* Profile of a mountain with an open driveable arch. Coordinates are
   relative to the real road center. The polygon travels once around the
   solid material: outer rock surface, right skirt, inner cave, left skirt.
   There is no floor triangle covering the asphalt. */
export function arcticTunnelProfile(halfWidth,outerExtent=38){
 const inner=halfWidth,outer=outerExtent;
 const outline=[
   [-outer,-3.2],[-outer+1.3,5.0],[-outer+6,12],
   [-outer+11,21],[-outer+20,25.4],[-8,29.0],[1,30.2],
   [12,28.4],[outer-19,24.1],[outer-9,17.1],
   [outer-2,7.6],[outer,-3.2],
   [inner,-.7],[inner,5.6]
 ];
 for(let j=1;j<=12;j++){
   const angle=j/12*Math.PI;
   outline.push([inner*Math.cos(angle),5.6+10.4*Math.sin(angle)]);
 }
 outline.push([-inner,-.7]);
 return outline;
}
export function createContinuousCave({
 THREE,worldGroup,getFrameAt,startT,endT,sidewalkOuter,
 ice=false,registerCollider=()=>{}
}){
 const steps=34,half=sidewalkOuter+4.25;
 const profile=arcticTunnelProfile(half);
 const count=profile.length,positions=[],colors=[],indices=[];
 const rock=ice?[.35,.50,.58]:[.28,.34,.38];
 const snow=[.80,.87,.90];
 for(let step=0;step<=steps;step++){
   const t=startT+(endT-startT)*(step/steps);
   const frame=getFrameAt(t);
   const ripple=Math.sin(step*.43+startT*29)*1.3+
     Math.sin(step*.83+startT*14)*.65;
   for(let j=0;j<count;j++){
     const [x,y]=profile[j];
     const outside=j<12;
     const perturb=outside?
       Math.sin(j*2.1+step*.67)*.78+
       Math.cos(j*3.9-step*.27)*.42:0;
     const height=frame.point.y+y+
       (outside?perturb+(j>3&&j<10?ripple:0):0);
     positions.push(frame.point.x+frame.normal.x*x,height,
       frame.point.z+frame.normal.z*x);
     const frost=outside&&y>19
       ?clamp((y-19)/12,0,.76):0;
     const brightness=1+Math.sin(step*.35+j*1.17)*.045;
     const inRock=outside?rock:rock.map(c=>c*(ice?.83:.69));
     colors.push(...inRock.map((c,i)=>clamp(
       (c*(1-frost)+snow[i]*frost)*brightness,0,1)));
   }
 }
 for(let step=0;step<steps;step++){
   for(let j=0;j<count;j++){
     const k=(j+1)%count;
     const a=step*count+j,b=step*count+k;
     const c=(step+1)*count+j,d=(step+1)*count+k;
     indices.push(a,c,b,b,c,d);
   }
 }
 // Cap the stone ring at BOTH portals so it has genuine rock
 // thickness, not a thin one-sided mesh showing a hollow "roof".
 // This polygon covers only rock outside the interior opening.
 const cross=profile.map(([x,y])=>new THREE.Vector2(x,y));
 const faces=THREE.ShapeUtils.triangulateShape(cross,[]);
 for(const [a,b,c] of faces){
   indices.push(a,b,c);
   const back=steps*count;
   indices.push(back+a,back+c,back+b);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 const wall=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
   vertexColors:true,roughness:ice?.73:.97,metalness:ice?.025:0,
   side:THREE.DoubleSide
 }));
 worldGroup.add(wall);
 // Solid walls are registered on the actual cave edge. Cars can drive
 // through the open 26m interior; no invisible center-road collider.
 let colliderCount=0;
 for(let step=0;step<steps;step++){
   const a=getFrameAt(startT+(endT-startT)*step/steps);
   const b=getFrameAt(startT+(endT-startT)*(step+1)/steps);
   const mid=a.point.clone().add(b.point).multiplyScalar(.5);
   const length=a.point.distanceTo(b.point);
   const heading=Math.atan2(b.point.x-a.point.x,b.point.z-a.point.z);
   for(const side of [-1,1]){
     const wallMid=mid.clone().addScaledVector(
       a.normal,side*(half+1.15));
     registerCollider(wallMid,1.6,length*.5+.45,heading,{
       minY:-1,maxY:16,bounce:.11,drag:.39,tag:"CAVE WALL"
     });
     colliderCount++;
   }
 }
 return {mesh:wall,segments:steps,colliderCount,profile};
}

/* The elevated shortcut is a single pierced extruded mountain with a
   clear opening; no separate pillars, roof, or opaque back wall. All
   geometric coordinates of the opening match the proven landing flight. */
export function createShortcutMassif({
 THREE,worldGroup,hole,rotationY,holeHeight,
 width=14.5,openingHeight=8.5,depth=21
}){
 const half=width*.5;
 const bottom=holeHeight-openingHeight*.5;
 const top=holeHeight+openingHeight*.5;
 const shape=new THREE.Shape();
 const outline=[
  [-45,-5.5],[-46,2],[-43,11],[-38,22],[-33,34],
  [-25,46],[-15,55],[-6,63],[3,66],[13,63],
  [23,53],[32,39],[40,24],[45,10],[47,-5.5]
 ];
 shape.moveTo(...outline[0]);
 for(const [x,y] of outline.slice(1))shape.lineTo(x,y);
 shape.closePath();
 // Counterclockwise / clockwise winding is handled by ExtrudeGeometry;
 // the hole creates an actual opening through the entire massif.
 const opening=new THREE.Path();
 const contour=[
  [-half,bottom+.95],[-half+.7,bottom],[half-.7,bottom],
  [half,bottom+.95],[half,top-1.1],
  [half-1.2,top-.18],[half*.55,top+1.35],
  [0,top+1.75],[-half*.55,top+1.35],
  [-half+1.2,top-.18],[-half,top-1.1]
 ];
 opening.moveTo(...contour[0]);
 for(const [x,y] of contour.slice(1))opening.lineTo(x,y);
 opening.closePath();
 shape.holes.push(opening);
 const geometry=new THREE.ExtrudeGeometry(shape,{
   depth,steps:3,bevelEnabled:true,
   bevelSegments:2,bevelThickness:1,bevelSize:.7,
   curveSegments:6
 });
 geometry.translate(0,0,-depth*.5);
 // No single-texture "cardboard mountain": mix subtle rock/snow shades
 // over the full massif, while leaving arch vertices intact for clearance.
 const position=geometry.attributes.position;
 const verts=[];
 for(let i=0;i<position.count;i++){
   const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
   // An actual 3D fractured cliff, not a perfectly flat extrusion face.
   // Keep the entire flight opening UNDISTORTED (including both portals).
   // Only the solid outer rock flanks and upper peak get relief.
   const outsideX=Math.max(0,Math.abs(x)-(half+3));
   const outsideY=Math.max(0,y-(top+5));
   const relief=clamp(Math.max(outsideX,outsideY)/12,0,1);
   const strata=Math.sin(x*.19+y*.071+z*.35)*2.1+
       Math.sin(x*.41-y*.17-z*.29)*.9;
   position.setZ(i,z+relief*strata);
   const b=(.89+.065*Math.sin(x*.47+z*.30)+.045*Math.cos(y*.73-z*.35));
   const snow=clamp((y-48)/14,0,.92);
   const stone=[.28,.34,.39],powder=[.77,.86,.91];
   verts.push(...stone.map((c,j)=>clamp((c*(1-snow)+powder[j]*snow)*b,0,1)));
 }
 geometry.setAttribute("color",new THREE.Float32BufferAttribute(verts,3));
 position.needsUpdate=true;
 geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
   vertexColors:true,roughness:.96,metalness:0,
   side:THREE.DoubleSide
 }));
 mesh.position.set(hole.x,0,hole.z);
 mesh.rotation.y=rotationY;
 worldGroup.add(mesh);
 return {mesh,outline,contour,bottom,top};
}
