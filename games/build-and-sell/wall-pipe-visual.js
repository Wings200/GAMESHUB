
import {THREE} from "../../engine/core.js";
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.55});
const materials={cold:mat(0x237dc6),hot:mat(0xc83b32)},brass=new THREE.MeshStandardMaterial({color:0xc09b55,metalness:.65,roughness:.38}),valid=new THREE.MeshBasicMaterial({color:0x90f6a6}),invalid=new THREE.MeshBasicMaterial({color:0xf5836e}),up=new THREE.Vector3(0,1,0);
function clear(g){for(const o of [...g.children]){o.removeFromParent();o.traverse(n=>n.geometry?.dispose());}}
function tube(g,a,b,r,m){const v=new THREE.Vector3(b.x-a.x,b.y-a.y,b.z-a.z);if(v.length()<.001)return;const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,v.length(),12),m);o.position.set((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);o.quaternion.setFromUnitVectors(up,v.normalize());o.castShadow=true;g.add(o);}
function ball(g,p,r,m){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),m);o.position.set(p.x,p.y,p.z);g.add(o);}
function draw(g,e,m){for(let i=1;i<e.points.length;i++){tube(g,e.points[i-1],e.points[i],.010,m);if(i<e.points.length-1)ball(g,e.points[i],.013,m);}for(const p of [e.points[0],e.points.at(-1)])ball(g,p,.014,m===valid||m===invalid?m:brass);}
export function makeWallPipeVisual(scene){const root=new THREE.Group(),preview=new THREE.Group();scene.add(root,preview);let key="",pk="";return {update(lines,draft,point,ok){const k=JSON.stringify(lines);if(k!==key){key=k;clear(root);for(const e of lines)draw(root,e,materials[e.kind]);}const q=JSON.stringify([draft,point,ok]);if(q!==pk){pk=q;clear(preview);if(draft)draw(preview,draft,ok?valid:invalid);if(point)ball(preview,point,.023,ok?valid:invalid);}},reset(){clear(root);clear(preview);key="";pk="";}};}
