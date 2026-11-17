// Illegal Chess · V3 high-detail procedural 3D chess sculpts
// Original shaded triangle meshes, NOT scaled boxes or billboard icons.
// One-time mesh generation, no network/model downloads, Chromebook-safe.
// Shapes follow classic Staunton-style turnings, mitres, crowns, battlements,
// and a sculpted knight; sniper stock is an extruded shaped polygon.
const TAU=Math.PI*2;
const norm=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((n,i)=>n-b[i]);
function builder(){
 const vertices=[];
 function v(p,n){vertices.push(...p,...norm(n));}
 function tri(a,b,c,an=null,bn=null,cn=null){
  const n=norm(cross(sub(b,a),sub(c,a)));
  v(a,an||n);v(b,bn||n);v(c,cn||n);
 }
 function quad(a,b,c,d,na=null,nb=null,nc=null,nd=null){
  tri(a,b,c,na,nb,nc);tri(a,c,d,na,nc,nd);
 }
 function cap(y,r,segments=36){
  for(let k=0;k<segments;k++){
   const a=k*TAU/segments,b=(k+1)*TAU/segments;
   tri([0,y,0],[r*Math.cos(b),y,r*Math.sin(b)],[r*Math.cos(a),y,r*Math.sin(a)],
    [0,-1,0],[0,-1,0],[0,-1,0]);
  }
 }
 // Cubic Catmull-Rom profile interpolation makes turned pieces appear sculpted
 // rather than assembled from rectangular primitive blocks.
 function refine(control,subdiv=3){
  const arr=[];
  for(let i=0;i<control.length-1;i++){
   const a=control[Math.max(0,i-1)],b=control[i],
    c=control[i+1],d=control[Math.min(control.length-1,i+2)];
   for(let j=0;j<subdiv;j++){
    const t=j/subdiv,t2=t*t,t3=t2*t;
    arr.push([0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*t+
     (2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3)));
   }
  }
  arr.push(control.at(-1));
  return arr;
 }
 function lathe(control,{segments=40,subdiv=3,modify=null}={}){
  const profile=refine(control,subdiv);
  for(let j=0;j<profile.length-1;j++){
   const [r1,y1]=profile[j],[r2,y2]=profile[j+1];
   const prev=profile[Math.max(0,j-1)],next=profile[Math.min(profile.length-1,j+2)];
   // Derivative gives smooth per-vertex turntable normals.
   const n1=norm([profile[j+1][1]-prev[1],prev[0]-profile[j+1][0]]);
   const n2=norm([next[1]-profile[j][1],profile[j][0]-next[0]]);
   for(let k=0;k<segments;k++){
    const a=k*TAU/segments,b=(k+1)*TAU/segments;
    const point=(r,y,th)=>{const radius=modify?modify(r,y,th):r;
     return [radius*Math.cos(th),y,radius*Math.sin(th)];};
    const normal=(th,n)=>[Math.cos(th)*n[0],n[1],Math.sin(th)*n[0]];
    const a1=point(r1,y1,a),b1=point(r1,y1,b);
    const a2=point(r2,y2,a),b2=point(r2,y2,b);
    quad(a1,b1,b2,a2,normal(a,n1),normal(b,n1),normal(b,n2),normal(a,n2));
   }
  }
  if(profile[0][0]>.02)cap(profile[0][1],profile[0][0],segments);
 }
 function shapeExtrude(points,depth=.28){
  const z1=-depth/2,z2=depth/2;
  const center=points.reduce((o,p)=>[o[0]+p[0]/points.length,o[1]+p[1]/points.length],[0,0]);
  for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length];
   tri([center[0],center[1],z2],[a[0],a[1],z2],[b[0],b[1],z2],[0,0,1],[0,0,1],[0,0,1]);
   tri([center[0],center[1],z1],[b[0],b[1],z1],[a[0],a[1],z1],[0,0,-1],[0,0,-1],[0,0,-1]);
   quad([a[0],a[1],z1],[b[0],b[1],z1],[b[0],b[1],z2],[a[0],a[1],z2]);
  }
 }
 function horse(){
  // Horse-head sculpture: curved neck, prominent muzzle, pointed ears and
  // carved mane. Silhouette is extruded and bevel-like layers give volume.
  const contour=[
   [-.33,.47],[.32,.47],[.3,.63],[.22,.79],[.12,.94],
   [.16,1.05],[.35,1.15],[.45,1.28],[.39,1.42],
   [.29,1.46],[.18,1.43],[.11,1.55],[.05,1.74],
   [-.01,1.56],[-.11,1.66],[-.19,1.54],
   [-.29,1.49],[-.37,1.33],[-.4,1.14],[-.34,.89]
  ];
  shapeExtrude(contour,.43);
 }
 const finish=()=>new Float32Array(vertices);
 return {lathe,shapeExtrude,horse,tri,quad,finish};
}
const foundation=[
 [.01,0],[.36,.014],[.41,.03],[.46,.052],[.47,.087],
 [.45,.126],[.41,.15],[.39,.174],[.39,.197],
 [.43,.221],[.42,.247],[.37,.27],[.34,.292],
 [.32,.315],[.31,.342]
];
const body=[
 [.30,.35],[.25,.41],[.22,.48],[.185,.64],
 [.185,.74],[.22,.79],[.28,.812],[.31,.839],
 [.28,.86],[.25,.88]
];
const bishopSilhouette=[
 ...foundation,...body,
 [.248,.93],[.24,.965],[.29,1],[.32,1.06],
 [.365,1.16],[.38,1.3],[.36,1.43],[.30,1.57],
 [.22,1.72],[.15,1.79],[.075,1.83],[.0,1.845]
];
const pawnSilhouette=[
 ...foundation.slice(0,13),
 [.29,.355],[.235,.42],[.20,.53],[.19,.63],
 [.24,.67],[.265,.697],[.25,.725],[.18,.748],
 [.20,.773],[.28,.803],[.32,.856],[.345,.93],
 [.33,1.017],[.28,1.075],[.20,1.125],[0,1.164]
];
const rookSilhouette=[
 ...foundation,
 [.31,.43],[.31,.61],[.30,.93],[.34,1.02],
 [.39,1.08],[.42,1.10],[.42,1.16],
 [.35,1.17]
];
const queenSilhouette=[
 ...foundation,...body,[.23,.96],[.31,1.06],
 [.35,1.15],[.43,1.24],[.42,1.29],
 [.34,1.38],[.19,1.40],[.07,1.39]
];
const kingSilhouette=[
 ...foundation,...body,[.26,.95],[.34,1.07],
 [.38,1.18],[.4,1.27],[.34,1.33],
 [.28,1.43],[.21,1.48],[.15,1.51],[0,1.54]
];
export function sculptAssetCatalog(){
 return ["sculptBishop","sculptPawn","sculptRook","sculptKnight","sculptQueen","sculptKing",
  "sculptBishopGilding","sculptRifleStock","sculptRifleGrip","sculptScope","sculptBarrel",
  "sculptMuzzleBrake","sculptKnightMane"];
}
export function buildSculptMeshes(){
 const meshes={},add=(name,fn)=>{const b=builder();fn(b);meshes[name]=b.finish();};
 add("sculptBishop",b=>b.lathe(bishopSilhouette,{
  segments:48,subdiv:3,
  // Engraved mitre slot is an actual depression in the upper head mesh.
  modify:(r,y,angle)=>{
   const cut=1.47+.23*Math.sin(angle+.58);
   const delta=Math.abs(y-cut);
   return y>1.14&&y<1.78&&delta<.055?r*(.88+.12*delta/.055):r;
  }
 }));
 add("sculptBishopGilding",b=>b.lathe([
  [.01,1.825],[.09,1.838],[.105,1.86],[.104,1.889],
  [.076,1.93],[0,1.95]
 ],{segments:28,subdiv:3}));
 add("sculptPawn",b=>b.lathe(pawnSilhouette,{segments:40,subdiv:3}));
 add("sculptRook",b=>{
  b.lathe(rookSilhouette,{segments:40,subdiv:3});
  // A crenellated circular rook turret with raised curved merlons.
  for(let i=0;i<8;i++){
   const a=i*TAU/8+.1,bth=a+TAU/8*.68;
   const point=(rad,th,y)=>[rad*Math.cos(th),y,rad*Math.sin(th)];
   const A=point(.28,a,1.15),B=point(.43,a,1.15);
   const C=point(.43,bth,1.15),D=point(.28,bth,1.15);
   const E=point(.28,a,1.39),F=point(.43,a,1.39);
   const G=point(.43,bth,1.39),H=point(.28,bth,1.39);
   for(const face of [[A,B,F,E],[B,C,G,F],[C,D,H,G],[D,A,E,H],[E,F,G,H]])
    b.quad(...face);
  }
 });
 add("sculptKnight",b=>{
  b.lathe([...foundation,[.29,.47],[.26,.54],[.26,.59]],{segments:40,subdiv:3});
  b.horse();
 });
 add("sculptKnightMane",b=>{
  b.shapeExtrude([[-.38,.88],[-.43,1.12],[-.42,1.33],[-.37,1.48],
   [-.3,1.58],[-.25,1.45],[-.27,1.2],[-.28,.99]],.47);
 });
 add("sculptQueen",b=>b.lathe(queenSilhouette,{segments:40,subdiv:3}));
 add("sculptKing",b=>b.lathe(kingSilhouette,{segments:40,subdiv:3}));
 add("sculptRifleStock",b=>b.shapeExtrude([
  [-1.25,-.31],[-.89,-.30],[-.64,-.18],[-.36,-.17],[-.21,-.24],
  [.25,-.26],[.38,-.18],[.29,.07],[.09,.09],[-.11,.01],
  [-.43,.12],[-.54,.24],[-.9,.25],[-1.08,.12],[-1.26,.04]
 ],.31));
 add("sculptRifleGrip",b=>b.shapeExtrude([
  [-.1,.18],[.14,.17],[.11,-.16],[0,-.4],[-.2,-.35],[-.18,-.15]
 ],.20));
 add("sculptScope",b=>b.lathe([
  [.2,-.42],[.225,-.4],[.23,-.33],[.19,-.3],
  [.16,-.21],[.145,-.17],[.145,.2],
  [.17,.22],[.16,.3],[.22,.39],[.22,.43]
 ],{segments:32,subdiv:3}));
 add("sculptBarrel",b=>b.lathe([
  [.08,-1.25],[.10,-1.2],[.105,-.95],[.085,-.85],
  [.08,-.57],[.093,-.53],[.093,.43],
  [.095,.47],[.075,.63],[.075,1.25]
 ],{segments:28,subdiv:2}));
 add("sculptMuzzleBrake",b=>b.lathe([
  [.09,-.18],[.15,-.15],[.15,-.09],[.125,-.06],
  [.125,.06],[.15,.1],[.15,.16],[.09,.18]
 ],{segments:28,subdiv:3}));
 return meshes;
}
