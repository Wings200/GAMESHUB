
import {THREE} from "../../engine/core.js";
import {tileBounds} from "./terrain.mjs";
import {floorPieces} from "./upper-interior-math.mjs?v=94";
const mat=(c,r=.8)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const palette={hardwood:[0xb28a5c,0xc19a68,0xa27a4f,0xbc905c],tile:[0xd2d0c8,0xbebeb5,0xc9c8c0,0xd8d7d0],carpet:[0x777e75,0x80877e,0x777e75,0x80877e],vinyl:[0x9b9287,0xaaa094,0x8f877d,0xb6aca1]};
const mats=Object.fromEntries(Object.entries(palette).map(([k,cs])=>[k,cs.map(c=>mat(c,k==="tile"?.4:.82))]));
const guide=new THREE.MeshBasicMaterial({color:0x8fefae,transparent:true,opacity:.35,depthWrite:false}),bad=new THREE.MeshBasicMaterial({color:0xe48d75,transparent:true,opacity:.36,depthWrite:false});
function block(g,x,z,w,d,y,h,m){if(w<.001||d<.001)return;const a=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);a.position.set(x,y,z);a.receiveShadow=true;g.add(a);}
function square(g,b,kind,id){const w=b.x2-b.x1,d=b.z2-b.z1,cs=mats[kind];if(!cs)return;const nx=kind==="tile"?Math.ceil(w/.32):kind==="carpet"?1:Math.ceil(w/.18),nz=kind==="tile"?Math.ceil(d/.32):kind==="carpet"?1:2;for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const gap=kind==="carpet"?0:.004;block(g,b.x1+(i+.5)*w/nx,b.z1+(j+.5)*d/nz,w/nx-gap,d/nz-gap,.033,.024,cs[(id+i*13+j*7)%cs.length]);}}
function clear(g){for(const o of [...g.children]){o.removeFromParent();o.traverse(a=>a.geometry?.dispose());}}
export function makeFloorVisual(scene){const root=new THREE.Group(),draft=new THREE.Group();scene.add(root,draft);let key="",dk="";return {update(r,rows,target=null,blocked=false,hole=null){const k=JSON.stringify([r,rows,hole]);if(k!==key){key=k;clear(root);for(const row of rows||[]){const b=tileBounds(r,row.tile);for(const q of floorPieces(b,hole))square(root,q,row.kind,row.tile);}}const next=JSON.stringify([r,target,blocked,hole]);if(next!==dk){dk=next;clear(draft);const b=tileBounds(r,target);for(const q of floorPieces(b,hole))block(draft,(q.x1+q.x2)/2,(q.z1+q.z2)/2,q.x2-q.x1,q.z2-q.z1,.052,.012,blocked?bad:guide);}},reset(){key=dk="";clear(root);clear(draft);}};}
