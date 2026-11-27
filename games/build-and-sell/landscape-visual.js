
import {THREE} from "../../engine/core.js";
import {baseGroundHeight} from "./terrain.mjs";
const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide});
const green=mat(0x659b46),drive=mat(0xa6acae),pavers=[mat(0xb36b4f),mat(0xa65f47),mat(0xc18265)],mortar=mat(0x928d82),wood=mat(0xb58b5e),leaves=[mat(0x446d36),mat(0x628444),mat(0x77994d)];
const yes=new THREE.MeshBasicMaterial({color:0x8ff0a0,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false}),no=new THREE.MeshBasicMaterial({color:0xef8067,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false});
function box(g,w,h,d,x,y,z,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);}
function surface(g,x,z,w,d,y,m){
 const vs=[],n=2;
 const point=(i,j)=>{const a=x-w/2+w*i/n,b=z-d/2+d*j/n;return [a,baseGroundHeight(a,b)+y,b];};
 for(let j=0;j<n;j++)for(let i=0;i<n;i++)vs.push(...point(i,j),...point(i,j+1),...point(i+1,j),...point(i+1,j),...point(i,j+1),...point(i+1,j+1));
 const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(vs,3));geo.computeVertexNormals();const o=new THREE.Mesh(geo,m);o.receiveShadow=true;g.add(o);
}
function make(g,f,preview=null){
 const {x,z}=f,y=baseGroundHeight(x,z);
 if(f.kind==="grass"||f.kind==="drive"){surface(g,x,z,1,1,.023,preview||(f.kind==="grass"?green:drive));return;}
 if(f.kind==="paver"){
  surface(g,x,z,1,1,.025,preview||mortar);
  for(let j=0;j<4;j++)for(let i=0;i<3;i++)surface(g,x-.5+(i+.5)/3,z-.5+(j+.5)/4,1/3-.015,.25-.014,.037,preview||pavers[(i+j)%3]);return;
 }
 const o=new THREE.Group();o.position.set(x,y,z);o.rotation.y=f.rotation*Math.PI/2;g.add(o);
 if(f.kind==="fence"){
  for(const a of [-.45,.45])box(o,.10,1.15,.10,a,.575,0,preview||wood);
  for(const h of [.36,.79])box(o,.9,.085,.07,0,h,0,preview||wood);
  for(let i=0;i<6;i++)box(o,.105,.83,.045,-.36+i*.144,.56,.048,preview||wood);
 }else if(f.kind==="shrub"){
  for(const [a,b,c,r,m] of [[0,.34,0,.32,0],[-.18,.29,.1,.24,1],[.19,.31,.08,.24,2],[0,.48,-.08,.24,1]]){
   const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(r,2),preview||leaves[m]);mesh.position.set(a,b,c);mesh.castShadow=!preview;mesh.receiveShadow=true;o.add(mesh);
  }
 }
}
function clear(g){for(const o of [...g.children]){o.removeFromParent();o.traverse(a=>a.geometry?.dispose());}}
export function makeLandscapeVisual(scene){
 const root=new THREE.Group(),draft=new THREE.Group();scene.add(root,draft);let key="",dk="";
 return {update(rows,preview=null,blocked=false){const k=JSON.stringify(rows);if(k!==key){key=k;clear(root);for(const f of rows)make(root,f);}const d=JSON.stringify([preview,blocked]);if(d!==dk){dk=d;clear(draft);if(preview)make(draft,preview,blocked?no:yes);}},reset(){key=dk="";clear(root);clear(draft);}};
}
