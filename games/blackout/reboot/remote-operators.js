// Multiplayer peers in the ORIGINAL BLACKOUT scene. This does not create a second map.
// Match peer body language to the authoritative server clock.
export function remoteObjectivePose(job,now=Date.now()){
 if(!job||!["plant","disable"].includes(job.kind)||Number(job.endsAt)<=now)return null;
 const full=job.kind==="plant"?7350:7000;
 const start=Number(job.startedAt)>0?Number(job.startedAt):Number(job.endsAt)-full;
 return {kind:job.kind,progress:Math.max(0,Math.min(1,(now-start)/Math.max(1,Number(job.endsAt)-start)))};
}
export function createRemoteOperators(THREE,scene){
 const peers=new Map();
 function make(p){
   const root=new THREE.Group();
   root.name="BLACKOUT ONLINE · "+String(p.id);
   const body=new THREE.MeshStandardMaterial({color:p.side==="attacker"?0x537e86:0x94745b,roughness:.86});
   const armor=new THREE.MeshStandardMaterial({color:0x243947,roughness:.76});
   const skin=new THREE.MeshStandardMaterial({color:0x9a8d7c,roughness:.84});
   function part(w,h,d,x,y,z,mat){
     const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
     o.position.set(x,y,z);o.castShadow=true;o.userData.onlinePlayerId=String(p.id);
     root.add(o);return o;
   }
   const torso=part(.63,.83,.34,0,1.11,0,body);
   part(.67,.20,.39,0,1.49,0,armor);
   const head=part(.33,.34,.31,0,1.68,0,skin);
   const armL=part(.24,.65,.27,-.45,1.12,0,body);
   const armR=part(.24,.65,.27,.45,1.12,0,body);
   const left=part(.25,.8,.31,-.19,.43,0,armor);
   const right=part(.25,.8,.31,.19,.43,0,armor);
   const tablet=part(.40,.055,.26,0,.87,-.43,armor);
   tablet.visible=false;
   const caseProp=part(.48,.13,.32,0,.16,-.50,armor);
   caseProp.visible=false;
   scene.add(root);
   return {root,torso,head,left,right,armL,armR,tablet,caseProp,side:p.side,x:p.x,y:p.y,z:p.z,
      yaw:p.yaw,hitMeshes:root.children.filter(n=>n.isMesh)};
 }
 function sync(players,selfId,phase="action",world=null){
   const current=new Set();
   for(const p of players||[]){
     if(String(p.id)===String(selfId))continue;
     const id=String(p.id);current.add(id);
     let v=peers.get(id);
     if(!v){v=make(p);peers.set(id,v)}
     v.target=p;v.job=world?.interactions?.[id]||null;
     v.root.visible=p.alive!==false&&!(phase==="prep"&&p.side==="attacker");
   }
   for(const [id,v] of peers)if(!current.has(id)){scene.remove(v.root);peers.delete(id)}
 }
 function tick(dt){
   const rate=Math.min(1,Math.max(0,dt)*12);
   for(const v of peers.values()){
     const p=v.target;if(!p)continue;
     v.x+=(p.x-v.x)*rate;v.y+=(p.y-v.y)*rate;v.z+=(p.z-v.z)*rate;
     v.root.position.set(v.x,v.y,v.z);
     const difference=Math.atan2(Math.sin(p.yaw-v.yaw),Math.cos(p.yaw-v.yaw));
     v.yaw+=difference*rate;
     v.root.rotation.y=v.yaw;
     const action=remoteObjectivePose(v.job);
     const kneeling=Boolean(action);
     const crouch=kneeling ? 0.61 : p.crouched ? 0.69 : 1;
     v.torso.scale.y=crouch;
     v.torso.position.y=kneeling ? 0.94 : 1.11;
     v.head.position.y=kneeling?1.29:p.crouched?1.15:1.68;
     v.left.scale.y=crouch;v.right.scale.y=crouch;
     v.armL.position.set(-.45,kneeling ? 0.88 : 1.12,kneeling?-.25:0);
     v.armR.position.set(.45,kneeling?.88:1.12,kneeling?-.25:0);
     const typing=kneeling&&action.progress>(action.kind==="plant"?.17:.065);
     v.armR.position.y+=typing?Math.sin(action.progress*70)*.045:0;
     v.tablet.visible=kneeling&&action.kind==="disable";
     v.caseProp.visible=kneeling&&action.kind==="plant";
   }
 }
 function shootables(){
   return [...peers.values()].filter(v=>v.root.visible).flatMap(v=>v.hitMeshes);
 }
 function clear(){for(const v of peers.values())scene.remove(v.root);peers.clear()}
 return {sync,tick,shootables,clear};
}
