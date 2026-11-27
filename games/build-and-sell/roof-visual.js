
import {THREE} from "../../engine/core.js";
import {roofTile,roofY,roofEdges,ROOF_DETAIL} from "./roof-math.mjs?v=89";
const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide});
const batt=mat(0xe6b1b9),battEdge=mat(0xc98e9a),wood=mat(0xc39b68),deck=mat(0xb89b72),ceiling=mat(0xe8e4d9),shingles=[mat(0x52585b),mat(0x62696a),mat(0x454b4f)],guide=new THREE.MeshBasicMaterial({color:0x8fefae,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}),bad=new THREE.MeshBasicMaterial({color:0xe48d75,transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false});
function box(g,w,h,d,x,y,z,m){if(Math.min(w,h,d)<.001)return;const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);}
function beam(g,a,b,m){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);if(d.length()<.001)return;const o=new THREE.Mesh(new THREE.BoxGeometry(.055,d.length(),.09),m);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());o.castShadow=true;o.receiveShadow=true;g.add(o);}
function split(b,p){if(p.style==="flat"||p.style==="shed")return [b];const mid=p.axis==="x"?(p.x1+p.x2)/2:(p.z1+p.z2)/2;return p.axis==="x"&&mid>b.x1&&mid<b.x2?[{...b,x2:mid},{...b,x1:mid}]:p.axis==="z"&&mid>b.z1&&mid<b.z2?[{...b,z2:mid},{...b,z1:mid}]:[b];}
function surface(g,b,p,off,m){for(const q of split(b,p)){const pts=[[q.x1,q.z1],[q.x2,q.z1],[q.x2,q.z2],[q.x1,q.z2]].map(([x,z])=>[x,roofY(p,x,z)+off,z]);const a=new THREE.BufferGeometry();a.setAttribute("position",new THREE.Float32BufferAttribute([0,2,1,0,3,2].flatMap(i=>pts[i]),3));a.computeVertexNormals();const o=new THREE.Mesh(a,m);o.castShadow=true;o.receiveShadow=true;g.add(o);}}
function roofEdge(b,p,amount){const e=.001;return {x1:b.x1-(Math.abs(b.x1-p.x1)<e?amount:0),x2:b.x2+(Math.abs(b.x2-p.x2)<e?amount:0),z1:b.z1-(Math.abs(b.z1-p.z1)<e?amount:0),z2:b.z2+(Math.abs(b.z2-p.z2)<e?amount:0)};}
function closure(g,b,p){const eps=.001,base=p.height+.004,edges=[];if(Math.abs(b.x1-p.x1)<eps)edges.push([[b.x1,b.z1],[b.x1,b.z2]]);if(Math.abs(b.x2-p.x2)<eps)edges.push([[b.x2,b.z1],[b.x2,b.z2]]);if(Math.abs(b.z1-p.z1)<eps)edges.push([[b.x1,b.z1],[b.x2,b.z1]]);if(Math.abs(b.z2-p.z2)<eps)edges.push([[b.x1,b.z2],[b.x2,b.z2]]);for(const [a,c] of edges){const mid=p.axis==="x"?(p.x1+p.x2)/2:(p.z1+p.z2)/2,i=p.axis==="x"?0:1,pts=[a];if((!p.style||p.style==="gable")&&a[i]<mid&&mid<c[i])pts.push(i===0?[mid,a[1]]:[a[0],mid]);pts.push(c);for(let j=0;j<pts.length-1;j++){const [x,z]=pts[j],[X,Z]=pts[j+1],y=roofY(p,x,z)+.002,Y=roofY(p,X,Z)+.002;const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute([x,base,z,X,base,Z,X,Y,Z,x,base,z,X,Y,Z,x,y,z],3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,deck);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);beam(g,[x,y,z],[X,Y,Z],wood);}}}
function tile(g,b,p,stage,id,insulated){const w=b.x2-b.x1,d=b.z2-b.z1,x=(b.x1+b.x2)/2,z=(b.z1+b.z2)/2,y=p.height+.06;if(stage>=1){for(const k of [.15,.5,.85])box(g,.045,.12,d,b.x1+w*k,y,z,wood);}if(stage>=2){for(const k of [.12,.55,.9])for(const q of split(b,p)){const x1=p.axis==="x"?q.x1:q.x1+(q.x2-q.x1)*k,x2=p.axis==="x"?q.x2:x1,z1=p.axis==="z"?q.z1:q.z1+(q.z2-q.z1)*k,z2=p.axis==="z"?q.z2:z1;beam(g,[x1,roofY(p,x1,z1)-.045,z1],[x2,roofY(p,x2,z2)-.045,z2],wood);}}if(stage>=3){surface(g,roofEdge(b,p,.09),p,.002,deck);closure(g,b,p);}if(stage>=4){const n=4,e=roofEdge(b,p,.09),W=e.x2-e.x1,D=e.z2-e.z1;for(let j=0;j<n;j++){const q=p.axis==="z"?{...e,z1:e.z1+D*j/n,z2:e.z1+D*(j+1)/n}:{...e,x1:e.x1+W*j/n,x2:e.x1+W*(j+1)/n};surface(g,q,p,.022,shingles[(id+j)%3]);}}if(insulated){for(const [a,c] of [[.02,.12],[.18,.47],[.53,.82],[.88,.98]]){box(g,w*(c-a),.105,d-.004,b.x1+w*(a+c)/2,p.height+.064,z,batt);for(let j=1;j<=3;j++)box(g,w*(c-a)*.95,.006,.008,b.x1+w*(a+c)/2,p.height+.12,b.z1+d*j/4,battEdge);}}if(stage>=5)box(g,w,.025,d,x,p.height+.005,z,ceiling);}
const fasciaMat=mat(0xe2e5e4),soffitMat=mat(0xc4c9c9),gutterMat=mat(0x6a747c,.48),gutterInside=mat(0x343c42,.62);
function edgeDetail(g,b,p,kind,preview=null){
 for(const e of roofEdges(b,p,kind)){
  const fixed=e.fixed+e.side*.09,len=e.hi-e.lo,mid=(e.lo+e.hi)/2;
  const pos=(u,v)=>e.axis==="x"?[fixed+e.side*v,u]:[u,fixed+e.side*v];
  const at=(u,v,y)=>{const [x,z]=pos(u,v);return [x,y,z];};
  const bar=(width,height,depth,u,v,y,m)=>{const [x,z]=pos(u,v);box(g,e.axis==="x"?depth:width,height,e.axis==="x"?width:depth,x,y,z,m);};
  if(kind==="fascia"){
   const ridge=p.axis==="x"?(p.x1+p.x2)/2:(p.z1+p.z2)/2;
   const ends=(!p.style||p.style==="gable")&&e.axis!==p.axis&&e.lo<ridge&&e.hi>ridge?[e.lo,ridge,e.hi]:[e.lo,e.hi];
   for(let j=1;j<ends.length;j++){
    const a=ends[j-1],c=ends[j],A=pos(a,0),C=pos(c,0),y=roofY(p,...A)+.019,Y=roofY(p,...C)+.019;
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute([...at(a,0,y-.13),...at(c,0,Y-.13),...at(c,0,Y),...at(a,0,y-.13),...at(c,0,Y),...at(a,0,y)],3));geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,preview||fasciaMat);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
   }
  }else if(kind==="soffit"){
   const y=p.height+.13;
   bar(len,.018,.095,mid,-.046,y,preview||soffitMat);
   for(let u=e.lo+.1;u<e.hi;u+=.18)bar(.012,.003,.075,u,-.046,y-.011,preview||gutterInside);
  }else if(kind==="gutter"){
   const y=p.height+.21;
   bar(len,.016,.115,mid,.059,y-.085,preview||gutterInside);
   for(const v of [.006,.112])bar(len,.09,.016,mid,v,y-.045,preview||gutterMat);
   bar(len,.018,.024,mid,.12,y+.004,preview||gutterMat);
  }
 }
}
const outlineMat=new THREE.LineBasicMaterial({color:0x83efac,transparent:true,opacity:.72});
function roofOutline(g,p){
 const e=roofEdge(p,p,.09);
 for(const b of split(e,p)){
  const corners=[[b.x1,b.z1],[b.x2,b.z1],[b.x2,b.z2],[b.x1,b.z2],[b.x1,b.z1]];
  const pts=corners.map(([x,z])=>new THREE.Vector3(x,roofY(p,x,z)+.03,z));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),outlineMat));
 }
}
function clear(g){for(const o of [...g.children]){o.removeFromParent();o.traverse(a=>a.geometry?.dispose());}}
export function makeRoofVisual(scene){const root=new THREE.Group(),draft=new THREE.Group();scene.add(root,draft);let k="",dk="";return {update(r,p,rows,target=null,blocked=false,detail=null,showOutline=false){const next=JSON.stringify([r,p,rows]);if(next!==k){k=next;clear(root);for(const a of rows||[]){const b=roofTile(r,p,a.tile);if(b){tile(root,b,p,a.stage,a.tile,a.insulated);for(const kind of ROOF_DETAIL)if(a[kind])edgeDetail(root,b,p,kind);}}}const d=JSON.stringify([r,p,target,blocked,detail,showOutline]);if(d!==dk){dk=d;clear(draft);if(showOutline&&p)roofOutline(draft,p);const b=roofTile(r,p,target);if(b&&detail)edgeDetail(draft,b,p,detail,blocked?bad:guide);else if(b)box(draft,b.x2-b.x1,.012,b.z2-b.z1,(b.x1+b.x2)/2,p.height-.035,(b.z1+b.z2)/2,blocked?bad:guide);}},reset(){k=dk="";clear(root);clear(draft);}};}
