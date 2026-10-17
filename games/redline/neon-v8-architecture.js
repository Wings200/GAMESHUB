/*
 * REDLINE Neon V8: non-repetitive city architecture.
 *
 * Existing road-cleared building footprints and their original collision
 * heights remain authoritative. All massing is fully INSIDE those footprints,
 * built above their solid lower podiums. Nothing affects the racing road,
 * collision queries, multiplayer state, accounts, or performance upgrades.
 *
 * Low draw-call layout: shared instances for upper volumes, glass bands,
 * structural pilasters, roof crowns, and occasional rooftop antennas.
 */
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=v=>typeof v==="number"&&Number.isFinite(v);
const PROFILES=[
  "stepped_office","residential_slab","split_towers","glass_hotel",
  "cylindrical_crown"
];

/** Shared with neon-art.js so base buildings always meet rooftop volumes. */
export function neonV8BaseRatio(height,style=0){
  if(!finite(height)||height<17)return 1;
  return [0.64,0.76,0.63,0.72,0.70][Math.abs(style|0)%5];
}

export function buildNeonV8Architecture({
  THREE,worldGroup,innerLots=[],roadsideLots=[],horizonLots=[],
  innerMaterials=[],roadsideMaterials=[]
}={}){
  if(!THREE||!worldGroup)throw new Error("Neon V8 needs a Three.js world");
  const root=new THREE.Group();
  root.name="REDLINE_NEON_V8_ARCHITECTURE";
  worldGroup.add(root);
  const named={},groups=new Map();
  const unit=new THREE.BoxGeometry(1,1,1);
  const round=new THREE.CylinderGeometry(.5,.5,1,10,1,false);
  const glass=new THREE.MeshStandardMaterial({
    color:0x36546e,metalness:.54,roughness:.27,
    emissive:0x0b2235,emissiveIntensity:.23
  });
  const stone=new THREE.MeshStandardMaterial({
    color:0x465061,metalness:.17,roughness:.78
  });
  const trim=new THREE.MeshStandardMaterial({
    color:0x7a8da3,metalness:.65,roughness:.32
  });
  const dark=new THREE.MeshStandardMaterial({
    color:0x171d28,metalness:.29,roughness:.73
  });
  const amber=new THREE.MeshBasicMaterial({color:0xf8ba7b,toneMapped:false});
  const ice=new THREE.MeshBasicMaterial({color:0x64bfff,toneMapped:false});
  const violet=new THREE.MeshBasicMaterial({color:0xba91ff,toneMapped:false});
  const green=new THREE.MeshBasicMaterial({color:0x64dbba,toneMapped:false});
  const poolLights=[amber,ice,violet,green];

  const instances=(key,mat,geom=unit)=>{
    if(!groups.has(key))groups.set(key,{mat,geom,list:[]});
    return groups.get(key).list;
  };
  const put=(key,mat,x,y,z,w,h,d,rot=0,geom=unit)=>{
    if(![x,y,z,w,h,d,rot].every(finite)||w<=0||h<=0||d<=0)return;
    instances(key,mat,geom).push({x,y,z,w,h,d,rot});
  };
  let generated=0,upperVolumes=0,withinFootprint=true,roofPieces=0;
  const addLot=(lot,region,idx)=>{
    if(!lot)return;
    const pos=lot.position||lot;
    const x=pos.x,z=pos.z,height=lot.height??lot.h,w=lot.width??lot.w,d=lot.depth??lot.d;
    const rot=lot.rotationY??lot.rot??0;
    if(![x,z,height,w,d,rot].every(finite)||w<5||d<5||height<17)return;
    const style=Math.abs((lot.style??idx)|0)%5;
    const base=height*neonV8BaseRatio(height,style);
    const upper=height-base;
    if(upper<.35)return;
    const materials=region==="roadside"?roadsideMaterials:innerMaterials;
    const wall=materials[style%materials.length]||glass;
    const angle=Math.cos(rot),sin=Math.sin(rot);
    // Convert positions in building-local x/z to scene coordinates.
    const world=(u,v)=>({x:x+u*angle+v*sin,z:z-u*sin+v*angle});
    const tier=(key,mat,u,v,ww,dd,low,high,geo=unit)=>{
      const h=high-low;
      if(h<.10||ww<=0||dd<=0)return;
      if(Math.abs(u)+ww/2>w/2+.0001 ||
         Math.abs(v)+dd/2>d/2+.0001)withinFootprint=false;
      const p=world(u,v);
      put(key,mat,p.x,(low+high)*.5,p.z,ww,h,dd,rot,geo);
      upperVolumes++;
    };
    const rib=(key,mat,u,v,ww,dd,low,high)=>{
      tier(key,mat,u,v,ww,dd,low,high);
    };
    // Five genuinely different upper-floor silhouettes. They join the
    // solid, collision-sized base which neon-art renders below them.
    if(style===0){
      tier("office_lower",wall,0,0,w*.78,d*.78,base,height-upper*.43);
      tier("office_upper",wall,-w*.10,d*.06,w*.53,d*.58,height-upper*.43,height);
      rib("office_crown",trim,-w*.10,d*.06,w*.54,d*.59,height-.30,height);
    }else if(style===1){
      tier("apartment_tower",wall,0,0,w*.85,d*.64,base,height);
      tier("apartment_side",stone,w*.32,-d*.28,w*.23,d*.27,base,height-upper*.26);
      for(const f of [.21,.47,.73]){
        const y=base+upper*f;
        rib("balcony_edge",trim,0,-d*.306,w*.81,.065,y,y+.10);
        rib("balcony_edge",trim,0,d*.306,w*.81,.065,y,y+.10);
      }
    }else if(style===2){
      // Two separated upper towers on a shared podium.
      for(const side of [-1,1]){
        tier("twin_towers",wall,side*w*.25,0,w*.40,d*.74,base,
          height-upper*(side===1?.07:0));
        rib("twin_roof",dark,side*w*.25,0,w*.415,d*.76,
          height-upper*(side===1?.07:0)-.18,height-upper*(side===1?.07:0));
      }
    }else if(style===3){
      tier("hotel_tower",wall,0,0,w*.68,d*.85,base,height-upper*.08);
      tier("hotel_crown",glass,0,0,w*.52,d*.62,height-upper*.08,height);
      rib("hotel_top",trim,0,0,w*.54,d*.64,height-.18,height);
    }else{
      const p=world(0,0);
      const diam=Math.min(w,d)*.73;
      // This profile makes true faceted cylindrical rooftop towers.
      put("round_tower",wall,p.x,base+upper*.49,p.z,diam,upper*.98,diam,rot,round);
      upperVolumes++;
      rib("round_cap",trim,0,0,diam*.77,diam*.77,height-.21,height);
    }
    if(style!==4){
      // Façade columns are shallow and stay within their setback mass.
      const top=Math.min(height-.35,base+upper*.97);
      if(style===0||style===3){
        const span=style===0?w*.74:w*.65;
        for(const side of [-1,1]){
          rib("facade_pilasters",trim,side*span*.47,0,.085,
            d*(style===0?.75:.82),base+.08,top);
        }
      }
    }
    // Anchor rooftop equipment to actual upper mass, especially split
    // towers which have empty space at the midpoint of the original roof.
    const equipmentX=style===2?w*.25:style===0?-w*.10:0;
    const equipmentZ=style===0?d*.06:0;
    if((idx+style)%3===0){
      const q=world(equipmentX,equipmentZ);
      put("roof_access",dark,q.x,height-.11,q.z,w*.16,.22,d*.20,rot);
      roofPieces++;
    }
    if((idx+style)%8===0){
      const p=world(equipmentX,equipmentZ);
      put("antenna_mast",stone,p.x,height+1.6,p.z,.13,3.2,.13);
      put("antenna_light",poolLights[style%4],p.x,height+3.24,p.z,.25,.18,.25);
      roofPieces+=2;
    }
    if(region!=="horizon" && (idx+style)%2===0){
      const span=style===2?w*.76:style===4?w*.55:w*.53;
      const p=world(0,d*.05);
      const light=poolLights[style%4];
      put("upper_lighting_"+style,light,p.x,base+upper*.62,p.z,
          span,.058,.065,rot);
    }
    generated++;
    named[region]=(named[region]||0)+1;
  };
  innerLots.forEach((b,i)=>addLot(b,"inner",i));
  roadsideLots.forEach((b,i)=>addLot(b,"roadside",i));
  horizonLots.forEach((b,i)=>addLot(b,"horizon",i));
  const dummy=new THREE.Object3D();
  let batches=0,totalInstances=0;
  for(const [key,{mat,geom,list}] of groups){
    if(!list.length)continue;
    const mesh=new THREE.InstancedMesh(geom,mat,list.length);
    mesh.name="NEON_V8_"+key;
    list.forEach((p,i)=>{
      dummy.position.set(p.x,p.y,p.z);
      dummy.rotation.set(0,p.rot,0);
      dummy.scale.set(p.w,p.h,p.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
    mesh.frustumCulled=false;
    root.add(mesh);
    batches++;
    totalInstances+=list.length;
  }
  return {root,profiles:PROFILES,
    buildings:generated,upperVolumes,roofPieces,
    batches,instances:totalInstances,
    withinFootprint,
    regionCounts:named
  };
}
