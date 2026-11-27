
import {THREE} from "../../engine/core.js";
import {STORE} from "./economy.mjs";
const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.68});
const dark=mat(0x252a2b),metal=mat(0x9ea8ab),yellow=mat(0xe4b344),red=mat(0xb74637),blue=mat(0x346b9a),white=mat(0xe2e2d7),wood=mat(0xbb9564),green=mat(0x486e5f);
function mesh(g,geo,m,x,y,z){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
const box=(g,w,h,d,x,y,z,m)=>mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);
const cyl=(g,r,h,x,y,z,m)=>mesh(g,new THREE.CylinderGeometry(r,r,h,18),m,x,y,z);
function model(g,id){if(id==="paint"){cyl(g,.04,.23,0,.15,0,white).rotation.z=Math.PI/2;box(g,.018,.12,.02,.10,.09,0,metal);box(g,.11,.018,.02,.05,.04,0,metal);cyl(g,.026,.12,0,-.03,0,dark);}
else if(id==="siding"){box(g,.13,.09,.17,0,.14,-.025,yellow);box(g,.045,.15,.06,0,.035,0,dark);box(g,.12,.035,.09,0,-.04,0,metal);box(g,.04,.04,.09,0,.14,-.14,metal);}
else if(id==="roof"){box(g,.055,.19,.055,0,.035,0,wood);box(g,.23,.065,.085,0,.15,0,metal);box(g,.065,.065,.10,.08,.15,0,dark);}
else if(id==="joinery"){box(g,.32,.045,.045,0,.13,0,yellow);box(g,.05,.045,.055,0,.13,0,green);box(g,.04,.15,.035,0,.04,0,dark);}
else if(id==="floor"){box(g,.16,.07,.095,0,.13,0,metal);box(g,.035,.19,.035,0,.035,0,wood);box(g,.06,.055,.065,.06,.13,0,dark);}
else if(id==="finish"){box(g,.20,.09,.012,0,.14,0,metal);box(g,.035,.14,.032,0,.03,0,dark);}
else if(id==="drywall"){box(g,.055,.15,.065,0,-.035,0,dark);box(g,.09,.11,.15,0,.075,-.04,yellow);cyl(g,.025,.08,0,.075,-.14,metal).rotation.x=Math.PI/2;box(g,.08,.045,.09,0,-.11,0,yellow);}
else if(id==="layout"){box(g,.095,.14,.04,0,.06,0,yellow);box(g,.074,.10,.045,0,.065,.002,dark);box(g,.055,.025,.049,0,.02,.004,white);}
else if(id==="outlet"||id==="panel"){cyl(g,.023,.12,0,-.02,0,id==="outlet"?red:blue);cyl(g,.007,.14,0,.10,0,metal);}
else if(id==="fixture"||id==="heater"||id==="utility"){box(g,.035,.19,.035,0,.03,0,red);box(g,.11,.05,.035,0,.14,0,metal);box(g,.035,.07,.035,-.04,.17,0,metal);}}
export function makeSpecialTool(scene,builder){const root=new THREE.Group();scene.add(root);const hand=builder.model.model.getObjectByName("RightHand"),pos=new THREE.Vector3(),models={};for(const id of ["paint","finish","drywall","layout","outlet","panel","fixture","heater","utility","floor","joinery","roof","siding"]){const g=new THREE.Group();root.add(g);model(g,id);g.visible=false;models[id]=g;}root.visible=false;return {update(id,p){root.visible=!!models[id]&&!!hand;if(!root.visible)return;for(const k in models)models[k].visible=k===id;hand.getWorldPosition(pos);root.position.copy(pos);root.rotation.set(.12,p.yaw,-.15,"YXZ");},dispose(){root.removeFromParent();root.traverse(o=>o.geometry?.dispose());}};}
export function makeMaterialsStore(scene){const g=new THREE.Group();scene.add(g);g.position.set(STORE.x,0,-27);box(g,8,.18,5,0,.09,0,metal);box(g,8,3.4,.2,0,1.7,-2.5,green);for(const x of [-3.9,3.9])box(g,.2,3.4,5,x,1.7,0,green);box(g,8.3,.22,5.3,0,3.5,0,green);box(g,7.9,.6,.2,0,3.0,2.5,dark);for(const x of [-2.7,0,2.7]){box(g,2.3,.12,.9,x,.30,-1.6,wood);for(let i=0;i<4;i++)box(g,2,.18,.85,x,.45+i*.19,-1.6,i%2?wood:white);}box(g,7.6,.95,.55,0,.55,1.7,wood);const c=document.createElement("canvas");c.width=1024;c.height=256;const ctx=c.getContext("2d");ctx.fillStyle="#213d33";ctx.fillRect(0,0,1024,256);ctx.font="bold 85px system-ui";ctx.textAlign="center";ctx.fillStyle="#f4e8c7";ctx.fillText("MATERIALS DEPOT",512,158,970);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;mesh(g,new THREE.PlaneGeometry(7.4,.58),new THREE.MeshBasicMaterial({map:t}),0,3.0,2.63);return g;}
