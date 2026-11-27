
import {THREE} from "../../engine/core.js";
import {furnishSpec} from "./furniture-math.mjs";
const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const oak=mat(0xb28c62),dark=mat(0x343b40),cloth=mat(0x6e827d),cream=mat(0xe6dfcf),blue=mat(0x647b98),steel=mat(0xa8afb0,.34,.65),black=mat(0x171d22,.25),white=mat(0xe5e8e7),gold=mat(0xbb9968);
const yes=new THREE.MeshBasicMaterial({color:0x8fe7a9,transparent:true,opacity:.28,depthWrite:false}),no=new THREE.MeshBasicMaterial({color:0xe47f6e,transparent:true,opacity:.28,depthWrite:false});
function box(g,w,h,d,x,y,z,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function legs(g,w,d,h,m=oak){for(const x of [-w/2+.07,w/2-.07])for(const z of [-d/2+.07,d/2-.07])box(g,.065,h,.065,x,h/2,z,m);}
function make(g,f){const s=furnishSpec(f.kind),{w,d,h}=s;g.position.set(f.x,.045,f.z);g.rotation.y=f.rotation*Math.PI/2;const B=(W,H,D,x,y,z,m)=>box(g,W,H,D,x,y,z,m);
switch(f.kind){
case "bed":legs(g,w,d,.18);B(w,.19,d,0,.25,0,oak);B(w-.06,.23,d-.06,0,.45,0,cream);B(w,.75,.10,0,.52,-d/2+.06,oak);B(w-.1,.09,d*.65,0,.60,d*.16,blue);for(const x of [-w*.24,w*.24])B(w*.43,.13,.36,x,.61,-d*.31,white);break;
case "sofa":B(w,.28,d,0,.26,0,dark);B(w,.55,.19,0,.58,-d/2+.10,cloth);for(const x of [-w/2+.10,w/2-.10])B(.20,.48,d,x,.45,0,cloth);for(let i=0;i<3;i++){B((w-.42)/3-.015,.18,d-.23,(i-1)*(w-.42)/3,.47,.08,cloth);B((w-.42)/3-.025,.36,.17,(i-1)*(w-.42)/3,.65,-d*.29,cloth);}break;
case "table":case "desk":legs(g,w,d,h-.055);B(w,.055,d,0,h-.0275,0,oak);if(f.kind==="desk")B(.30,.25,d*.85,w*.31,h-.18,0,oak);break;
case "chair":legs(g,w,d,.43);B(w,.08,d,0,.45,0,oak);B(w,.43,.065,0,.70,-d/2+.035,oak);B(w-.06,.045,d-.06,0,.515,0,cream);break;
case "dresser":case "cabinet":B(w,h,d,0,h/2,0,oak);B(w+.02,.04,d+.02,0,h-.02,0,f.kind==="cabinet"?cream:oak);for(let i=0;i<3;i++){const y=(i+.5)*(h-.08)/3;B(w-.04,(h-.08)/3-.012,.025,0,y,d/2,oak);B(.15,.025,.04,0,y,d/2+.025,steel);}break;
case "fridge":B(w,h,d,0,h/2,0,steel);for(const [y,H] of [[.61,1.2],[1.51,.51]]){B(w-.025,H,.035,0,y,d/2,white);B(.035,H*.5,.05,-w*.34,y,d/2+.04,dark);}break;
case "range":B(w,h,d,0,h/2,0,steel);B(w,.04,d,0,h-.02,0,black);for(const x of [-w*.25,w*.25])for(const z of [-d*.23,d*.23]){const o=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.009,22),dark);o.position.set(x,h+.005,z);g.add(o);}B(w-.08,.38,.03,0,.43,d/2,black);B(w-.13,.035,.055,0,.67,d/2+.02,steel);break;
case "washer":B(w,h,d,0,h/2,0,white);const o=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.045,32),dark);o.rotation.x=Math.PI/2;o.position.set(0,.47,d/2+.025);g.add(o);const q=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.05,32),black);q.rotation.x=Math.PI/2;q.position.set(0,.47,d/2+.035);g.add(q);B(w-.08,.095,.025,0,.83,d/2,steel);break;
case "tv":B(w,.43,d,0,.24,0,oak);B(.11,.12,.18,0,.52,0,dark);B(w-.12,.58,.065,0,.85,0,black);B(w-.18,.52,.006,0,.85,.036,mat(0x23313c,.3));break;
case "bookshelf":B(.055,h,d,-w/2+.027,h/2,0,oak);B(.055,h,d,w/2-.027,h/2,0,oak);B(w,h,.035,0,h/2,-d/2,oak);for(let j=0;j<5;j++)B(w,.045,d,0,.035+j*(h-.07)/4,0,oak);for(let j=0;j<3;j++)for(let i=0;i<7;i++)B(.065,.20+(i%3)*.025,.19,-w/2+.09+i*.08,.15+j*(h-.07)/4,.025,[blue,cloth,cream,gold][(i+j)%4]);break;
}}
function clear(g){for(const o of [...g.children]){o.removeFromParent();o.traverse(a=>a.geometry?.dispose());}}
export function makeFurnitureVisual(scene){const root=new THREE.Group(),draft=new THREE.Group();scene.add(root,draft);let key="",dk="";return {update(rows,preview=null,blocked=false){const k=JSON.stringify(rows);if(k!==key){key=k;clear(root);for(const f of rows||[]){if(!furnishSpec(f.kind))continue;const g=new THREE.Group();root.add(g);make(g,f);}}const d=JSON.stringify([preview,blocked]);if(d!==dk){dk=d;clear(draft);if(preview){const g=new THREE.Group();draft.add(g);make(g,preview);g.traverse(o=>{if(o.isMesh){o.material=blocked?no:yes;o.castShadow=false;}});}}},reset(){key=dk="";clear(root);clear(draft);}};}
