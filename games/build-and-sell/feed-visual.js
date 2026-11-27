import {THREE} from "../../engine/core.js";
const symbols=["triangle","circle","square"],colors={triangle:0xa988d4,circle:0x58b5a5,square:0xd2a36a};
const glyphs={triangle:"▲",circle:"●",square:"■"};
export function makeFeedVisual(canvas,callbacks){
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x14231f);
 const camera=new THREE.PerspectiveCamera(38,1,.1,30);camera.position.set(.25,.34,4.9);camera.lookAt(0,0,0);
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
 scene.add(new THREE.HemisphereLight(0xdceff4,0x344a3c,2.15));const light=new THREE.DirectionalLight(0xffefce,3.2);light.position.set(-3,4,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-3;light.shadow.camera.right=3;light.shadow.camera.top=3;light.shadow.camera.bottom=-3;scene.add(light);
 const mat=(color,metalness=0,roughness=.55)=>new THREE.MeshStandardMaterial({color,metalness,roughness}),shell=mat(0x4e5a57,.55),rim=mat(0x8b9890,.65),black=mat(0x222b29),silver=mat(0xbec6c0,.8),green=mat(0x5fba80,.2);
 const world=new THREE.Group();scene.add(world);const targets=[],parts={},ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let work=null,selected=null,hover=null,held=null,started=0,active=false,frame=0,previous=0;
 function mesh(g,geometry,material,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
 const box=(g,w,h,d,x,y,z,m)=>mesh(g,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 function cylinder(g,r,h,x,y,z,m){const o=mesh(g,new THREE.CylinderGeometry(r,r,h,24),m,x,y,z);o.rotation.x=Math.PI/2;return o;}
 function label(g,txt,x,y,z,w=.35,h=.14){const c=document.createElement("canvas");c.width=256;c.height=96;const ctx=c.getContext("2d");ctx.fillStyle="#1c2924";ctx.fillRect(0,0,256,96);ctx.font="bold 60px system-ui";ctx.textAlign="center";ctx.fillStyle="#e9e7d7";ctx.fillText(txt,128,69);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return mesh(g,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}),x,y,z);}
 function target(o,kind,k){o.userData.target={kind,k};targets.push(o);return o;}
 box(world,3.1,2.2,.17,0,0,-.19,shell);for(const x of [-1.55,1.55])box(world,.13,2.32,.27,x,0,-.1,rim);for(const y of [-1.13,1.13])box(world,3.22,.13,.27,0,y,-.1,rim);
 label(world,"FEED MODULE",0,.99,.025,1.22,.15);for(const x of [-1.39,1.39])for(const y of [-.95,.95])cylinder(world,.039,.022,x,y,.015,silver);
 for(const [i,k] of symbols.entries()){
 const sx=-1.02+i*1.02,tx=-1.02+((i+2)%3)*1.02,c=mat(colors[k],.08,.4),plug=new THREE.Group();world.add(plug);const plugBody=target(box(plug,.25,.29,.19,0,0,0,c),"cord",k);target(cylinder(plug,.095,.07,0,.14,.012,c),"cord",k);label(plug,glyphs[k],0,-.012,.104,.16,.15);
 const socket=new THREE.Group();world.add(socket);socket.position.set(tx,.57,.02);target(box(socket,.44,.40,.16,0,0,0,black),"socket",k);target(cylinder(socket,.145,.10,0,0,.10,c),"socket",k);label(socket,glyphs[k],0,0,.164,.20,.18);
 const fast=new THREE.Group();world.add(fast);fast.position.set(tx,.19,.09);const head=target(cylinder(fast,.075,.08,0,0,0,silver),"fastener",k);box(fast,.105,.014,.012,0,0,.049,black);const ring=mesh(world,new THREE.TorusGeometry(.105,.012,8,24),new THREE.MeshBasicMaterial({color:0xf2ca76}),tx,.19,.17);ring.visible=false;const cable=mesh(world,new THREE.BufferGeometry(),c);parts[k]={sx,tx,plug,socket,fast,head,ring,cable,material:c,plugBody};
 }
 const driver=new THREE.Group();world.add(driver);driver.visible=false;cylinder(driver,.043,.32,0,0,.24,silver);cylinder(driver,.080,.24,0,0,.48,mat(0xdab65a));for(let i=0;i<4;i++)cylinder(driver,.084,.015,0,0,.38+i*.055,black);
 function updateCord(k){const a=parts[k],matched=!!work?.matched[k],x=matched?a.tx:a.sx,y=matched?.42:-.43;const path=new THREE.CatmullRomCurve3([new THREE.Vector3(a.sx,-1.02,.02),new THREE.Vector3(a.sx,-.78,.24),new THREE.Vector3((a.sx+x)/2,-.58,.29),new THREE.Vector3(x,y-.16,.21)]);a.cable.geometry.dispose();a.cable.geometry=new THREE.TubeGeometry(path,32,.065,12,false);a.plug.position.set(x,y,.21);a.plug.visible=!matched;a.socket.scale.setScalar(selected===k?1.06:1);a.ring.visible=matched&&!work.secured.includes(k);a.head.material=work?.secured.includes(k)?green:silver;}
 function refresh(state,selection){work=state;selected=selection;if(work)for(const k of symbols)updateCord(k);}
 function find(e){const r=canvas.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);const hits=ray.intersectObjects(targets,false);return hits.find(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;})?.object.userData.target||null;}
 function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;if(w&&h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=camera.aspect<1.3?5.8:4.9;camera.updateProjectionMatrix();}}
 function stop(){held=null;started=0;driver.visible=false;}
 function tick(now){if(!active)return;frame=requestAnimationFrame(tick);if(held){const a=parts[held],progress=Math.min(1,(now-started)/750);driver.visible=true;driver.position.set(a.tx,.19,.15);driver.rotation.z=progress*Math.PI*6;driver.position.z=.15-.035*progress;callbacks.progress(progress);if(progress>=1){const k=held;stop();callbacks.secure(k);}}else callbacks.progress(0);if(now-previous>250){resize();previous=now;}renderer.render(scene,camera);}
 canvas.onpointermove=e=>{if(!active)return;hover=find(e);if(held&&(hover?.kind!=="fastener"||hover.k!==held))stop();canvas.style.cursor=hover?"pointer":"default";};
 canvas.onpointerdown=e=>{if(!active||e.button!==0||!work||callbacks.busy())return;e.preventDefault();const t=find(e);if(!t)return;if(t.kind==="cord"&&!work.matched[t.k])callbacks.select(t.k);else if(t.kind==="socket"&&!work.matched[t.k])callbacks.match(t.k);else if(t.kind==="fastener"&&work.matched[t.k]&&!work.secured.includes(t.k)){held=t.k;started=performance.now();canvas.setPointerCapture?.(e.pointerId);}};
 canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=stop;
 return {open(state,selection){refresh(state,selection);if(!active){active=true;resize();frame=requestAnimationFrame(tick);}},refresh,close(){active=false;stop();cancelAnimationFrame(frame);},dispose(){this.close();scene.traverse(o=>{o.geometry?.dispose();if(o.material?.map)o.material.map.dispose();o.material?.dispose();});renderer.dispose();}};
}
