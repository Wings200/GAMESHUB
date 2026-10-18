// BLACKOUT V0.7 — distinct first-person rifle & handgun meshes with mechanical motion.
// Intentionally original weapon silhouettes; all meshes generated locally.
export function createWeaponView(T,gunRoot){
  const black=new T.MeshStandardMaterial({color:0x131c22,metalness:.63,roughness:.48});
  const receiver=new T.MeshStandardMaterial({color:0x3d4649,metalness:.78,roughness:.36});
  const edge=new T.MeshStandardMaterial({color:0x78868a,metalness:.82,roughness:.31});
  const grip=new T.MeshStandardMaterial({color:0x202c30,metalness:.09,roughness:.85});
  const tan=new T.MeshStandardMaterial({color:0x7b7064,metalness:.32,roughness:.70});
  const skin=new T.MeshStandardMaterial({color:0x856451,metalness:.0,roughness:.85});
  const casing=new T.MeshStandardMaterial({color:0xe8b55e,metalness:.92,roughness:.24});
  const rifle=new T.Group(),pistol=new T.Group(),interactionTool=new T.Group();
  gunRoot.add(rifle,pistol,interactionTool);interactionTool.visible=false;
  function block(parent,x,y,z,w,h,d,mat,rx=0,ry=0,rz=0){
    const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
    m.position.set(x,y,z);m.rotation.set(rx,ry,rz);parent.add(m);return m;
  }
  function tube(parent,x,y,z,r1,r2,length,mat,rotate=true){
    const m=new T.Mesh(new T.CylinderGeometry(r1,r2,length,12),mat);
    m.position.set(x,y,z);if(rotate)m.rotation.x=Math.PI/2;
    parent.add(m);return m;
  }
  // Modular 5.56-style carbine. Receiver, exposed ejection bolt, stock,
  // magazine and handguard have distinct geometry and material roughness.
  block(rifle,0,0,-.28,.176,.175,.46,receiver);
  block(rifle,0,.10,-.28,.186,.055,.50,black);
  block(rifle,0,.143,-.29,.16,.033,.59,edge);
  block(rifle,0,-.015,-.62,.152,.128,.42,black);
  for(let n=0;n<7;n++){
    const z=-.84+n*.078;
    block(rifle,0,.095,z,.185,.025,.019,edge);
    block(rifle,-.087,0,z,.017,.12,.017,receiver);
    block(rifle,.087,0,z,.017,.12,.017,receiver);
  }
  tube(rifle,0,-.016,-.935,.037,.038,.46,receiver);
  tube(rifle,0,-.016,-1.12,.043,.042,.12,black);
  for(const z of [-1.164,-1.126,-1.09])block(rifle,0,-.016,z,.092,.014,.014,edge);
  block(rifle,.092,.019,-.26,.012,.093,.17,black);
  block(rifle,.102,.030,-.31,.011,.049,.078,casing);
  block(rifle,0,-.118,-.125,.104,.26,.13,grip,-.20);
  block(rifle,0,-.076,.08,.174,.11,.40,black);
  block(rifle,0,-.067,.276,.215,.18,.165,tan);
  block(rifle,0,-.11,.35,.17,.09,.06,black);
  block(rifle,0,-.105,-.095,.12,.065,.10,black);
  const magazine=block(rifle,0,-.23,-.33,.105,.28,.135,black,.19);
  for(let n=0;n<5;n++)block(magazine,0,-.10+n*.045,-.070,.10,.008,.012,edge);
  block(rifle,-.103,-.006,-.35,.018,.055,.085,edge);
  block(rifle,.099,-.036,-.36,.023,.04,.12,edge);
  // Foregrip and sling loop.
  block(rifle,0,-.135,-.69,.075,.18,.071,grip,.12);
  tube(rifle,-.125,.008,.29,.025,.025,.09,edge,false);
  // Primary shoulder and hand shapes give viewmodel scale reference.
  block(rifle,.245,-.215,.15,.29,.35,.34,tan,-.26,0,-.19);
  block(rifle,.09,-.28,-.145,.165,.30,.23,skin,-.25);
  block(rifle,-.14,-.23,-.67,.164,.21,.25,skin,.12);
  block(rifle,-.145,-.18,-.60,.16,.09,.20,tan,.22);
  // Distinct compact handgun model and proper metal slide.
  block(pistol,0,.012,-.22,.13,.17,.46,black);
  block(pistol,0,.100,-.265,.133,.100,.42,receiver);
  block(pistol,0,.151,-.29,.11,.014,.44,edge);
  block(pistol,0,-.116,-.10,.092,.29,.145,grip,-.21);
  block(pistol,0,-.186,-.075,.102,.03,.156,edge,-.21);
  block(pistol,0,-.022,-.52,.09,.095,.19,black);
  tube(pistol,0,.065,-.625,.029,.028,.24,receiver);
  block(pistol,.072,.092,-.28,.011,.05,.16,black);
  for(const z of [-.22,-.17,-.12]){
    block(pistol,.07,.101,z,.012,.064,.008,edge);
    block(pistol,-.07,.101,z,.012,.064,.008,edge);
  }
  // Front post and notch aligned with ADS optical axis when pistol equipped.
  block(pistol,0,.215,-.61,.020,.070,.033,edge);
  block(pistol,0,.217,-.12,.113,.033,.034,black);
  block(pistol,-.044,.228,-.12,.021,.064,.032,edge);
  block(pistol,.044,.228,-.12,.021,.064,.032,edge);
  block(pistol,.18,-.245,.025,.33,.31,.28,tan,-.23,0,-.18);
  block(pistol,0,-.30,-.12,.15,.23,.16,skin,.05);
  const pistolMag=block(pistol,0,-.218,-.067,.083,.20,.118,black,-.22);
  // Visible handheld deploy/disarm equipment for the full hold-F interaction.
  const toolCase=block(interactionTool,0,-.04,-.30,.59,.14,.36,receiver,-.18);
  block(interactionTool,0,.03,-.34,.42,.023,.21,black,-.18);
  const toolScreen=new T.MeshBasicMaterial({color:0x69f0d8});
  block(interactionTool,-.06,.043,-.37,.22,.012,.12,toolScreen,-.18);
  for(let i=0;i<9;i++){
    block(interactionTool,.13+(i%3)*.052,.046,-.42+Math.floor(i/3)*.061,
      .032,.010,.034,i===8?casing:edge,-.18);
  }
  for(const sx of [-1,1]){
    block(interactionTool,sx*.32,-.14,-.16,.15,.22,.29,skin,-.20,0,sx*.18);
    block(interactionTool,sx*.30,-.23,.00,.20,.26,.29,tan,-.24,0,sx*.14);
  }
  // Shells fly from the bolt with gravity and rotate in camera space.
  let reloadInfo=null;const shells=[];
  function beginReload(now,slot,duration){reloadInfo={at:now,slot,duration:duration*1000};}
  function eject(slot="primary"){
    const shell=new T.Mesh(new T.CylinderGeometry(.016,.018,.052,8),casing);
    const isPistol=slot==="secondary";
    shell.position.set(.12,.035,isPistol?-.29:-.31);
    gunRoot.add(shell);
    shells.push({shell,xv:.7+Math.random()*.55,yv:.45+Math.random()*.22,zv:.15+Math.random()*.30,age:0});
    if(shells.length>22){
      const expired=shells.shift();gunRoot.remove(expired.shell);expired.shell.geometry.dispose();
    }
  }
  function update({now,dt,slot,aim,moving,step,sprinting,lean,interacting=false,interactionProgress=0}){
    rifle.visible=!interacting&&slot!=="secondary";
    pistol.visible=!interacting&&slot==="secondary";
    interactionTool.visible=interacting;
    if(interacting){
      const wobble=Math.sin(now*.013)*.006;
      interactionTool.position.set(.0,-.15+Math.sin(Math.PI*interactionProgress)*.105+wobble,-.29);
      interactionTool.rotation.x=-.08+Math.sin(now*.006)*.018;
      toolScreen.color.setHex(Math.floor(now/330)%2===0?0x71f7d9:0x24a79d);
    }
    const sway=moving?Math.sin(step)*.012*(sprinting?1.5:1):0;
    const float=moving?Math.cos(step*2)*.008:0;
    const focus=1-aim*.75;
    rifle.position.set(sway*focus,float*focus,-.005);
    pistol.position.set(sway*focus,float*focus,0);
    rifle.rotation.set(0,sway*.22,lean*.011);
    pistol.rotation.set(0,sway*.16,lean*.01);
    magazine.position.y=-.23;pistolMag.position.y=-.218;
    if(reloadInfo){
      const p=(now-reloadInfo.at)/reloadInfo.duration;
      if(p>=1)reloadInfo=null;
      else if(p>=0){
        const rig=reloadInfo.slot==="primary"?rifle:pistol;
        const mag=reloadInfo.slot==="primary"?magazine:pistolMag;
        const pull=p<.43?Math.sin(p/.43*Math.PI/2):
          p<.71?1:Math.max(0,1-(p-.71)/.29);
        mag.position.y-=pull*.29;
        mag.rotation.x=.19+pull*.48;
        rig.rotation.x-=Math.sin(Math.PI*p)*.34*(1-aim*.45);
        rig.rotation.z+=Math.sin(p*Math.PI)*.085;
      }
    }else{magazine.rotation.x=.19;pistolMag.rotation.x=-.22;}
    for(let i=shells.length-1;i>=0;i--){
      const s=shells[i];s.age+=dt;s.yv-=2.7*dt;
      s.shell.position.x+=s.xv*dt;s.shell.position.y+=s.yv*dt;
      s.shell.position.z+=s.zv*dt;s.shell.rotation.z+=dt*14;
      if(s.age>1.1){
        gunRoot.remove(s.shell);s.shell.geometry.dispose();shells.splice(i,1);
      }
    }
  }
  function reset(){reloadInfo=null;magazine.position.y=-.23;pistolMag.position.y=-.218;
    for(const e of shells){gunRoot.remove(e.shell);e.shell.geometry.dispose();}
    shells.length=0;
  }
  return {rifle,pistol,magazine,pistolMag,eject,beginReload,update,reset};
}
