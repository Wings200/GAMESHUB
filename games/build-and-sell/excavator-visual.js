
import {THREE} from "../../engine/core.js";
import {baseGroundHeight,groundHeight,PIT_Y,tileAt} from "./terrain.mjs";
const mat=(c,r=.78,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const gold=mat(0xe8a82d,.55),dark=mat(0x252a2a),steel=mat(0x656c69,.45,.45),rubber=mat(0x272b29),glass=new THREE.MeshStandardMaterial({color:0x9fd2dc,transparent:true,opacity:.15,depthWrite:false,roughness:.2,side:THREE.DoubleSide}),dirt=mat(0x916b43),tooth=mat(0x515955,.6,.45);
const up=new THREE.Vector3(0,1,0),vec=new THREE.Vector3();
function mesh(p,g,m,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o;}
const box=(p,w,h,d,m,x=0,y=0,z=0)=>mesh(p,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const cyl=(p,r,h,m,x=0,y=0,z=0)=>mesh(p,new THREE.CylinderGeometry(r,r,h,12),m,x,y,z);
function link(o,a,b){vec.subVectors(b,a);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=vec.length();o.quaternion.setFromUnitVectors(up,vec.normalize());}
export function makeExcavator(scene){
 const root=new THREE.Group(),tracks=new THREE.Group(),turret=new THREE.Group();scene.add(root);root.add(tracks,turret);root.visible=false;
 for(const x of [-.84,.84]){box(tracks,.48,.52,2.55,rubber,x,.30,0);for(let i=0;i<15;i++){const z=-1.14+i*.162;box(tracks,.52,.045,.07,steel,x,.58,z);box(tracks,.52,.045,.07,steel,x,.025,z);}for(let i=0;i<5;i++){const w=cyl(tracks,.22,.49,steel,x,.29,-.92+i*.46);w.rotation.z=Math.PI/2;}}
 box(tracks,1.6,.30,1.92,dark,0,.66,0);cyl(tracks,.64,.25,steel,0,.89,0);
 box(turret,1.78,.49,2.05,gold,0,1.10,.10);box(turret,1.78,.55,.75,gold,0,1.52,.75);
 for(let i=0;i<6;i++)box(turret,.74,.025,.035,dark,.36,1.80,.50+i*.065);
 const cabin=new THREE.Group();turret.add(cabin);cabin.position.set(-.49,1.34,-.14);
 box(cabin,.84,.10,1.08,dark,0,0,0);box(cabin,.87,.11,1.15,gold,0,1.20,0);
 for(const x of [-.39,.39])for(const z of [-.49,.49])box(cabin,.055,1.15,.055,dark,x,.60,z);
 box(cabin,.025,1.03,.89,glass,-.40,.60,0);box(cabin,.75,1.03,.025,glass,0,.60,.50);
 box(cabin,.40,.12,.38,dark,0,.27,.08);box(cabin,.40,.42,.11,dark,0,.50,.24);
 for(const x of [-.25,.25]){box(cabin,.13,.24,.35,steel,x,.17,-.14);const control=cyl(cabin,.025,.22,dark,x,.39,-.24);control.rotation.x=.25;}
 box(turret,.16,.12,.24,dark,.4,1.42,-.89);box(turret,.16,.09,.03,mat(0xf4e9b9),.4,1.44,-1.02);
 const arm=new THREE.Group();turret.add(arm);const boom=box(arm,.24,1,.29,gold),stick=box(arm,.19,1,.21,gold),hyd1=cyl(arm,.055,1,steel),hyd2=cyl(arm,.045,1,steel),joint=cyl(arm,.15,.34,dark),joint2=cyl(arm,.12,.28,steel);joint.rotation.z=joint2.rotation.z=Math.PI/2;
 const bucket=new THREE.Group();arm.add(bucket);box(bucket,.64,.09,.63,steel,0,-.16,-.10);box(bucket,.64,.42,.09,steel,0,.01,.22);for(const x of [-.30,.30])box(bucket,.055,.36,.53,steel,x,.015,-.08);for(let i=0;i<5;i++)box(bucket,.085,.075,.16,tooth,-.25+i*.125,-.16,-.46);
 const load=box(bucket,.53,.19,.40,dirt,0,-.025,-.08);load.visible=false;
 const aim=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:0x9cf4ae,transparent:true,opacity:.40,depthWrite:false,side:THREE.DoubleSide}));aim.rotation.x=-Math.PI/2;aim.visible=false;scene.add(aim);
 const border=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,z])=>new THREE.Vector3(x,0,z))),new THREE.LineBasicMaterial({color:0xd2ffcf}));scene.add(border);border.visible=false;
 return {root,update(machine,target,anim,now,visible=true,viewYaw=null){
  root.visible=visible;if(!visible){aim.visible=border.visible=false;return;}const y=groundHeight(machine.x,machine.z);root.position.set(machine.x,y,machine.z);tracks.rotation.y=machine.yaw;
  const active=anim&&now-anim.start<800?anim:null,focus=active?.target||target;turret.rotation.y=focus?Math.atan2(-(focus.x-machine.x),-(focus.z-machine.z)):viewYaw??machine.yaw;
  const dist=focus?Math.hypot(focus.x-machine.x,focus.z-machine.z):3.2,t=active?Math.max(0,Math.min(1,(now-active.start)/800)):0;
  const dip=active?Math.sin(Math.PI*t):0,reach=Math.max(1.45,Math.min(6.5,dist));
  const A=new THREE.Vector3(.45,1.48,-.72),C=new THREE.Vector3(.0,active?Math.max(PIT_Y-y+.22,.9-1.55*dip):1.03,-reach);
  if(active&&t>.52){C.y+=Math.sin((t-.52)/.48*Math.PI)*1.1;C.z+=Math.sin((t-.52)/.48*Math.PI)*.52;}
  const B=A.clone().lerp(C,.52);B.y+=Math.max(.58,1.65-reach*.14);
  link(boom,A,B);link(stick,B,C);joint.position.copy(B);joint2.position.copy(C);link(hyd1,A.clone().add(new THREE.Vector3(0,-.18,.10)),B.clone().add(new THREE.Vector3(0,-.16,.10)));link(hyd2,B.clone().add(new THREE.Vector3(0,.18,.06)),C.clone().lerp(B,.35));bucket.position.copy(C);bucket.rotation.x=active?-.2+Math.sin(Math.PI*t)*1.2:.12;load.visible=!!active&&t>.45&&t<.91;
  aim.visible=border.visible=!!target;if(target){const x=(target.x1+target.x2)/2,z=(target.z1+target.z2)/2,sy=baseGroundHeight(x,z)+.09;aim.position.set(x,sy,z);aim.scale.set(target.x2-target.x1,target.z2-target.z1,1);border.position.set(x,sy+.015,z);border.scale.set(target.x2-target.x1,1,target.z2-target.z1);}
 }};
}
export function rebuildTerrain(mesh,rect,ids){
 const dug=new Set(ids),xs=[],zs=[];for(let i=-24;i<=24;i+=.5){xs.push(i);zs.push(i);}if(rect){for(let x=rect.x1;x<rect.x2;x+=1)xs.push(x);xs.push(rect.x2);for(let z=rect.z1;z<rect.z2;z+=1)zs.push(z);zs.push(rect.z2);}
 const sorted=a=>[...new Set(a.map(v=>Math.round(v*10000)/10000))].sort((a,b)=>a-b),X=sorted(xs),Z=sorted(zs),vertices=[],colors=[];
 const isDug=(x,z)=>dug.has(tileAt(rect,x,z));
 const top=new THREE.Color(0xb39d7d),floor=new THREE.Color(0x987451),wall=new THREE.Color(0x755337);
 function tri(a,b,c,color){for(const p of [a,b,c]){vertices.push(...p);colors.push(color.r,color.g,color.b);}}
 function quad(a,b,c,d,col){tri(a,b,c,col);tri(a,c,d,col);}
 for(let j=0;j<Z.length-1;j++)for(let i=0;i<X.length-1;i++){const x=X[i],xx=X[i+1],z=Z[j],zz=Z[j+1],mx=(x+xx)/2,mz=(z+zz)/2,cut=isDug(mx,mz),h=(x,z)=>cut?PIT_Y:baseGroundHeight(x,z);
  quad([x,h(x,z),z],[x,h(x,zz),zz],[xx,h(xx,zz),zz],[xx,h(xx,z),z],cut?floor:top);
  if(!cut)continue;
  const edge=(ax,az,bx,bz,ox,oz)=>{if(!isDug(ox,oz))quad([ax,PIT_Y,az],[bx,PIT_Y,bz],[bx,baseGroundHeight(bx,bz),bz],[ax,baseGroundHeight(ax,az),az],wall);};
  edge(x,z,x,zz,x-.00001,mz);edge(xx,zz,xx,z,xx+.00001,mz);edge(xx,z,x,z,mx,z-.00001);edge(x,zz,xx,zz,mx,zz+.00001);
 }
 const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));g.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();mesh.geometry.dispose();mesh.geometry=g;
}
