
import {THREE} from "../../engine/core.js";
import {moduleSpec,modulePoint} from "./upper-service-math.mjs?v=98";
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.65});
const shell=mat(0x414f5a),edge=mat(0xd4d8d6),idle=mat(0x9e8452),linked=mat(0x7295c9),done=new THREE.MeshStandardMaterial({color:0x8de3a4,emissive:0x397f49,emissiveIntensity:.65});
const yes=new THREE.MeshBasicMaterial({color:0x89edac,transparent:true,opacity:.45}),bad=new THREE.MeshBasicMaterial({color:0xe17765,transparent:true,opacity:.45});
function clear(g){for(const o of [...g.children]){o.removeFromParent();o.traverse(v=>{v.geometry?.dispose();if(v.userData.symbol){v.material.map?.dispose();v.material.dispose();}});}}
function make(g,w,r,preview=null){
 const q=modulePoint(w,r.t),o=new THREE.Group();g.add(o);o.position.set(q.x,1.35,q.z);o.rotation.y=-Math.atan2(w.b.z-w.a.z,w.b.x-w.a.x);
 const box=(a,b,c,x,y,z,m)=>{const v=new THREE.Mesh(new THREE.BoxGeometry(a,b,c),preview||m);v.position.set(x,y,z);o.add(v);};
 box(.29,.29,.20,0,0,0,shell);
 for(const side of [-1,1]){box(.24,.24,.035,0,0,side*.108,edge);box(.17,.028,.012,0,-.085,side*.133,r.stage===3?done:r.stage===2?linked:idle);
 if(!preview){const c=document.createElement("canvas");c.width=c.height=128;const ctx=c.getContext("2d");ctx.fillStyle="#263641";ctx.fillRect(0,0,128,128);ctx.font="bold 86px system-ui";ctx.fillStyle="#f7e8a3";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(moduleSpec(r.kind).symbol,64,64);const tex=new THREE.CanvasTexture(c);const v=new THREE.Mesh(new THREE.PlaneGeometry(.145,.145),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));v.position.set(0,.025,side*.133);if(side<0)v.rotation.y=Math.PI;v.userData.symbol=true;o.add(v);}
 }
}
export function makeUpperServiceVisual(scene){const root=new THREE.Group(),draft=new THREE.Group();scene.add(root,draft);let k="",d="";return {update(walls,rows,preview=null,blocked=false){const a=JSON.stringify([walls,rows]);if(a!==k){k=a;clear(root);for(const r of rows){const w=walls.find(v=>v.id===r.wallId);if(w)make(root,w,r);}}const b=JSON.stringify([preview,blocked]);if(b!==d){d=b;clear(draft);const w=preview&&walls.find(v=>v.id===preview.wallId);if(w)make(draft,w,preview,blocked?bad:yes);}},reset(){k=d="";clear(root);clear(draft);}};}
