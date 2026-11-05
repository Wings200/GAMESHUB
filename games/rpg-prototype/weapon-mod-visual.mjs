// W20.59 — Real bolt-on geometry for the ten authored gun models.
// The additions mount on original model roots in BOTH first- and third-person.
// They never intercept gun rays or replace moving actions/hands.
import {MOD_SLOTS,WEAPON_MODS,selectedWeaponMod} from './weapon-mods.mjs';
import {sightMount} from './weapon-sights.mjs';

const MOUNTS={
  '10mm-pistol':{muzzle:[0,.08,-.55],magazine:[0,-.32,.18],stock:[0,-.19,.26],receiver:[0,.03,-.10]},
  'pipe-pistol':{muzzle:[0,.07,-.75],magazine:[-.21,-.06,-.07],stock:[0,-.18,.25],receiver:[0,.05,-.25]},
  'pipe-rifle':{muzzle:[0,.071,-1.23],magazine:[0,-.27,-.14],stock:[0,-.04,.60],receiver:[0,.08,-.25]},
  'laser-musket':{muzzle:[0,.061,-1.46],magazine:[0,-.30,-.13],stock:[0,-.03,.67],receiver:[0,.075,-.31]},
  'double-barrel-shotgun':{muzzle:[0,.12,-1.32],magazine:[0,-.09,-.45],stock:[0,-.05,.78],receiver:[0,.05,-.28]},
  'pump-action-shotgun':{muzzle:[0,.16,-1.43],magazine:[0,.02,-.63],stock:[0,-.04,.69],receiver:[0,.11,-.30]},
  'bolt-hunting-rifle':{muzzle:[0,.163,-1.72],magazine:[0,-.26,-.15],stock:[0,-.04,.78],receiver:[0,.12,-.20]},
  'iron-revolver':{muzzle:[0,.10,-1.15],magazine:[0,.10,-.36],stock:[0,-.20,.27],receiver:[0,.08,-.30]},
  'pipe-smg':{muzzle:[0,.142,-1.16],magazine:[-.18,-.12,-.15],stock:[0,-.01,.65],receiver:[0,.11,-.24]},
  'heavy-sniper':{muzzle:[0,.103,-2.067],magazine:[0,-.32,-.03],stock:[0,-.03,.82],receiver:[0,.10,-.31]}
};
const PISTOLS=new Set(['10mm-pistol','pipe-pistol','iron-revolver']);
const SHOTGUNS=new Set(['double-barrel-shotgun','pump-action-shotgun']);
const BLACK=0x29343a,STEEL=0x6f807c,COPPER=0xb38a59,LEATHER=0x594b39;
export function installPhysicalWeaponMods(THREE,model,weaponId,pack){
  const root=model?.root,mount=MOUNTS[weaponId];if(!root||!mount)return null;
  const old=root.getObjectByName('CraftedWeaponParts');
  if(old){
    old.removeFromParent();
    old.traverse(n=>{
      n.geometry?.dispose?.();
      if(n.material&&Array.isArray(n.material))n.material.forEach(m=>m.dispose?.());
      else n.material?.dispose?.();
    });
  }
  if(!model._modMuzzleBaseline){
    model._modMuzzleBaseline={
      glow:model.muzzleGlow?.position.z,flare:model.muzzleFlare?.position.z
    };
  }
  if(model.muzzleGlow&&Number.isFinite(model._modMuzzleBaseline.glow))
    model.muzzleGlow.position.z=model._modMuzzleBaseline.glow;
  if(model.muzzleFlare&&Number.isFinite(model._modMuzzleBaseline.flare))
    model.muzzleFlare.position.z=model._modMuzzleBaseline.flare;
  if(model.magazine)model.magazine.scale.y=1;
  const container=new THREE.Group();container.name='CraftedWeaponParts';root.add(container);
  const metal=new THREE.MeshStandardMaterial({color:BLACK,roughness:.58,metalness:.6});
  const bright=new THREE.MeshStandardMaterial({color:STEEL,roughness:.41,metalness:.8});
  const copper=new THREE.MeshStandardMaterial({color:COPPER,roughness:.52,metalness:.68});
  const leather=new THREE.MeshStandardMaterial({color:LEATHER,roughness:.83});
  const energy=new THREE.MeshStandardMaterial({color:0x7fbcca,emissive:0x127889,
    emissiveIntensity:.3,roughness:.25});
  function mesh(geometry,material,x,y,z,parent=container){
    const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);
    m.userData.ignoreSightProbe=true;
    parent.add(m);return m;
  }
  function box(w,h,d,mat,x,y,z,parent=container){
    return mesh(new THREE.BoxGeometry(w,h,d),mat,x,y,z,parent);
  }
  function tube(r,len,mat,x,y,z,parent=container){
    const m=mesh(new THREE.CylinderGeometry(r,r,len,14,1,true),mat,x,y,z,parent);
    m.rotation.x=Math.PI/2;return m;
  }
  function ring(r,mat,x,y,z,parent=container){
    return mesh(new THREE.TorusGeometry(r,.012,7,18),mat,x,y,z,parent);
  }
  const laser=weaponId==='laser-musket';
  const parts={};
  for(const slot of MOD_SLOTS)parts[slot]=WEAPON_MODS[selectedWeaponMod(pack,weaponId,slot)]||null;
  const r=mount.receiver,m=mount.magazine,s=mount.stock,t=mount.muzzle;
  if(parts.receiver){
    const calibrated=parts.receiver.slug==='calibrated';
    for(const side of [-1,1]){
      const plate=box(.018,calibrated?.21:.17,.25,calibrated?bright:metal,
        r[0]+side*.13,r[1],r[2]);
      plate.name='CraftedReceiverPlate';
      for(const dz of [-.085,.085])
        box(.010,.025,.035,copper,r[0]+side*.15,r[1]+.03,r[2]+dz);
    }
    if(laser){
      for(const z of [-.42,-.33,-.24])
        ring(calibrated?.107:.091,energy,0,r[1],z);
    }else box(.16,.027,.17,calibrated?bright:leather,0,r[1]+.16,r[2]-.03);
  }
  if(parts.barrel){
    const long=parts.barrel.slug==='long';
    const front=t[2]+.22;
    for(const z of [front,front-.09,front-.18]){
      ring(long?.083:.099,long?bright:metal,t[0],t[1],z);
      for(const side of [-1,1])box(.016,.038,.035,long?bright:copper,
        t[0]+side*.085,t[1],z);
    }
    if(long){
      // Barrel extension matches the existing bore axis; muzzle flash follows.
      const extra=.18;
      tube(laser?.055:.065,extra,laser?copper:bright,t[0],t[1],t[2]-extra*.5);
      ring(laser?.058:.067,metal,t[0],t[1],t[2]-extra);
      if(model.muzzleGlow)model.muzzleGlow.position.z-=extra;
      if(model.muzzleFlare)model.muzzleFlare.position.z-=extra;
    }else{
      for(let i=0;i<3;i++)box(.018,.043,.021,bright,
        t[0]+.077,t[1],front-i*.06);
    }
  }
  if(parts.magazine){
    const extended=['extended','expanded','overcharged','large','drum'].includes(parts.magazine.slug);
    const drum=parts.magazine.slug==='drum';
    if(weaponId==='iron-revolver'){
      for(const side of [-1,1])ring(.108,bright,side*.125,m[1],m[2]);
      box(.07,.08,.10,copper,.09,m[1]-.12,m[2]);
    }else if(SHOTGUNS.has(weaponId)){
      // A double barrel does not gain a fictional third chamber.
      const length=weaponId==='double-barrel-shotgun'?.27:extended?.60:.38;
      tube(.043,length,bright,0,m[1]-.18,m[2]-.18);
      for(const z of [m[2],m[2]-.23])
        box(.15,.024,.028,metal,0,m[1]-.18,z);
    }else if(laser){
      for(const side of [-1,1]){
        const coil=tube(.035,extended?.34:.21,energy,m[0]+side*.11,m[1],m[2]);
        coil.name='CraftedCapacitorCell';
      }
      box(.22,.038,.21,copper,m[0],m[1]-.19,m[2]);
    }else if(weaponId==='bolt-hunting-rifle'){
      box(.15,.19,.21,metal,m[0],m[1]-.12,m[2]);
      box(.16,.03,.22,bright,m[0],m[1]-.225,m[2]);
    }else{
      // The factory magazine still animates during reload. Extend its real
      // mesh, and attach a geared housing when a drum is installed.
      if(model.magazine)model.magazine.scale.y=drum?1.22:1.32;
      if(drum){
        const drumBody=mesh(new THREE.CylinderGeometry(.18,.18,.19,18),bright,
          m[0],m[1]-.17,m[2]);
        drumBody.rotation.z=Math.PI/2;
        for(const side of [-1,1])box(.02,.12,.12,metal,
          m[0]+side*.12,m[1]-.22,m[2]);
      }else box(.15,.055,.17,metal,m[0],m[1]-.30,m[2]);
    }
  }
  if(parts.stock){
    const tactical=parts.stock.slug==='tactical',pistol=PISTOLS.has(weaponId);
    if(pistol){
      for(const side of [-1,1])
        box(.028,.22,.16,tactical?metal:leather,
          s[0]+side*.077,s[1]-.09,s[2]);
      if(tactical)box(.145,.055,.09,bright,s[0],s[1]-.19,s[2]+.03);
    }else{
      box(tactical?.25:.22,.20,.072,tactical?metal:leather,
        s[0],s[1],s[2]);
      for(const side of [-1,1])
        box(.022,.13,.21,tactical?bright:copper,
          s[0]+side*.10,s[1],s[2]-.13);
    }
  }
  if(parts.muzzle){
    const precision=parts.muzzle.slug==='precision';
    if(laser){
      for(const z of [t[2]-.02,t[2]-.09,t[2]-.16])
        ring(precision?.09:.07,precision?energy:bright,t[0],t[1],z);
      tube(.049,precision?.23:.12,energy,t[0],t[1],t[2]-.12);
    }else if(precision&&!SHOTGUNS.has(weaponId)){
      tube(.10,.24,metal,t[0],t[1],t[2]-.09);
      for(const z of [t[2]+.03,t[2]-.20])ring(.103,bright,t[0],t[1],z);
    }else{
      tube(precision?.080:.085,.115,bright,t[0],t[1],t[2]-.035);
      for(const side of [-1,1])for(const z of [t[2]-.02,t[2]-.085])
        box(.015,.038,.019,metal,t[0]+side*.086,t[1],z);
    }
  }
  // Optic model is mounted at the same calibrated alignment reference as ADS.
  const opticId=pack?.equipment?.optics?.[weaponId]||'factory';
  const unlocked=pack?.unlockedOptics?.[weaponId]||[];
  if(opticId!=='factory'&&unlocked.includes(opticId)){
    const o=sightMount(weaponId);
    const scope=opticId.startsWith('scope-');
    if(scope){
      tube(.065,.26,metal,0,o.y,o.z-.02);
      for(const z of [o.z+.11,o.z-.15])ring(.072,bright,0,o.y,z);
    }else{
      const nato=opticId==='holo-a';
      box(.14,.027,.16,metal,0,o.y-.09,o.z);
      for(const side of [-1,1])
        box(.017,.11,.055,bright,side*(nato?.07:.057),o.y,o.z-.06);
      box(nato?.16:.135,.02,.03,metal,0,o.y+.06,o.z-.06);
      const red=new THREE.MeshBasicMaterial({color:0xff4932,depthWrite:false});
      const point=mesh(new THREE.SphereGeometry(.004,8,6),red,0,o.y,o.z-.07);
      point.userData.sightReference=true;
      if(nato)ring(.022,red,0,o.y,o.z-.07);
    }
  }
  return container;
}
