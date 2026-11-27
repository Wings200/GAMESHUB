
import {THREE} from "../../engine/core.js";
import {storyCost} from "./story-math.mjs?v=90";
const mat=(color)=>new THREE.MeshStandardMaterial({color,roughness:.88});
const wood=mat(0xc29c70),deck=mat(0xb58b5b),rail=mat(0xe0ded4),dark=mat(0x755c43);
const yes=new THREE.MeshBasicMaterial({color:0x91edb2,transparent:true,opacity:.27,depthWrite:false}),no=new THREE.MeshBasicMaterial({color:0xe27e70,transparent:true,opacity:.27,depthWrite:false});
function box(g,w,h,d,x,y,z,m){if(Math.min(w,h,d)<.001)return;const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);}
function build(g,p,preview=null){
 const H=.02+p.height,b=p.hole;
 const rects=[[p.x1,b.x1,p.z1,p.z2],[b.x2,p.x2,p.z1,p.z2],[b.x1,b.x2,p.z1,b.z1],[b.x1,b.x2,b.z2,p.z2]];
 for(const [x,X,z,Z] of rects){if(X-x<.001||Z-z<.001)continue;box(g,X-x,.12,Z-z,(x+X)/2,H-.06,(z+Z)/2,preview||deck);for(let u=x+.15;u<X;u+=.40)box(g,.045,.10,Z-z,u,H-.13,(z+Z)/2,preview||wood);}
 const n=Math.ceil(p.height/.17),step=p.run/n;
 const at=(u,v)=>p.axis==="x"?[p.start+p.sign*u,p.c+v]:[p.c+v,p.start+p.sign*u];
 for(let i=0;i<n;i++){const [x,z]=at((i+.5)*step,0),h=p.height*(i+1)/n;box(g,p.axis==="x"?step:p.width,h,p.axis==="x"?p.width:step,x,.02+h/2,z,preview||dark);box(g,p.axis==="x"?step:p.width,.035,p.axis==="x"?p.width:step,x,.02+h-.0175,z,preview||wood);}
 function guard(x1,z1,x2,z2){
  const L=Math.hypot(x2-x1,z2-z1);if(L<.02)return;
  const alongX=Math.abs(x2-x1)>Math.abs(z2-z1),m=preview||rail;
  box(g,alongX?L:.065,.07,alongX?.065:L,(x1+x2)/2,H+.82,(z1+z2)/2,m);
  const n=Math.max(1,Math.ceil(L/.55));for(let i=0;i<=n;i++){const f=i/n;box(g,.065,.82,.065,x1+(x2-x1)*f,H+.41,z1+(z2-z1)*f,m);}
 }
 guard(p.x1,p.z1,p.x2,p.z1);guard(p.x1,p.z2,p.x2,p.z2);guard(p.x1,p.z1,p.x1,p.z2);guard(p.x2,p.z1,p.x2,p.z2);
 if(p.axis==="x"){guard(b.x1,b.z1,b.x2,b.z1);guard(b.x1,b.z2,b.x2,b.z2);const x=p.start;guard(x,b.z1,x,b.z2);}
 else{guard(b.x1,b.z1,b.x1,b.z2);guard(b.x2,b.z1,b.x2,b.z2);const z=p.start;guard(b.x1,z,b.x2,z);}
}
function clear(g){for(const o of [...g.children]){o.removeFromParent();o.traverse(v=>v.geometry?.dispose());}}
export function makeStoryVisual(scene){const root=new THREE.Group(),draft=new THREE.Group();scene.add(root,draft);let k="",d="";return {update(plan,preview=null,blocked=false){const a=JSON.stringify(plan);if(a!==k){k=a;clear(root);if(plan)build(root,plan);}const b=JSON.stringify([preview,blocked]);if(b!==d){d=b;clear(draft);if(preview&&!plan)build(draft,preview,blocked?no:yes);}},reset(){k=d="";clear(root);clear(draft);}};}
