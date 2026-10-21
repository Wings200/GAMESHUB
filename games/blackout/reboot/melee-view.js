// BLACKOUT V0.15.1 · actual first-person melee glove/arm animation.
// Camera-mounted, only visible for 0.32 seconds after V. No texture files.
import {MELEE} from "./melee.js?v=reboot-029";
export function createMeleeView(THREE,camera){
 const root=new THREE.Group();
 root.name="BLACKOUT original first-person gloved melee strike";
 camera.add(root);
 root.visible=false;
 const glove=new THREE.MeshStandardMaterial({color:0x1b252d,roughness:.94});
 const trim=new THREE.MeshStandardMaterial({color:0x566976,roughness:.65,metalness:.17});
 const cloth=new THREE.MeshStandardMaterial({color:0x314047,roughness:.97});
 const part=(w,h,d,x,y,z,mat)=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z);root.add(mesh);return mesh;
 };
 part(.17,.17,.24,0,0,-.11,glove);
 part(.16,.16,.32,.01,-.12,.04,cloth);
 part(.18,.055,.14,0,-.11,-.04,trim);
 for(let i=0;i<4;i++)
  part(.04,.055,.12,-.063+i*.042,.07,-.16,glove);
 part(.08,.09,.13,-.12,-.04,-.10,glove);
 let timer=0;
 function trigger(){
  if(timer>0)return false;
  timer=MELEE.animationSeconds;root.visible=true;return true;
 }
 function update(dt){
  if(timer<=0){root.visible=false;return;}
  timer=Math.max(0,timer-Math.max(0,Math.min(dt,.05)));
  const t=1-timer/MELEE.animationSeconds;
  const power=Math.sin(Math.PI*t);
  root.position.set(.28-.19*power,-.42+.15*power,-.44-.66*power);
  root.rotation.set(-.4*power,.19*power,-.3*power);
  root.visible=timer>0;
 }
 function cancel(){timer=0;root.visible=false;}
 return {root,trigger,update,cancel,get active(){return timer>0;}};
}
