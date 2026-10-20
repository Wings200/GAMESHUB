// BLACKOUT V7: floor-correct, collision-checked defensive setup spawns.
// The site pair defines the defender level. Authored generic defender
// spawn markers are reference points, NEVER overrides for a 2F bomb.
const DIST=.98,PLAYER_RADIUS=.39;
const sq=(v)=>v*v;
export function targetFloor(site){return Number.isFinite(Number(site?.y))?Number(site.y):0}
export function isSafeDefenderInsertion(world,site,point,chosen=[]){
  const level=targetFloor(site);
  if(!Number.isFinite(point.x+point.z)||Math.abs(point.y-level)>.12)return false;
  // Upstairs requires a real supported walkable slab, not an empty coordinate.
  if(level>.2&&Math.abs(world.floorAt(point.x,point.z,level+.29)-level)>.35)
    return false;
  if(world.facility?.bounds&&
    (point.x<world.facility.bounds.minX+.45||
      point.x>world.facility.bounds.maxX-.45||
      point.z<world.facility.bounds.minZ+.45||
      point.z>world.facility.bounds.maxZ-.45))
    return false;
  if(world.colliders?.some(c=>c.maxY>level+.43&&c.minY<level+1.95&&
    point.x>c.minX-PLAYER_RADIUS&&point.x<c.maxX+PLAYER_RADIUS&&
    point.z>c.minZ-PLAYER_RADIUS&&point.z<c.maxZ+PLAYER_RADIUS))return false;
  if(chosen.some(p=>Math.abs(p.y-level)<.4&&
    Math.hypot(p.x-point.x,p.z-point.z)<DIST))return false;
  return true;
}
function candidates(site,seed=0){
  const centers=[{x:site.x,z:site.z},...(site.plantZones||[])
    .map(z=>({x:z.x,z:z.z}))];
  const angles=Array.from({length:16},(_,i)=>i*Math.PI/8+seed*.27);
  const out=[];
  for(const center of centers){
    for(const radius of [1.5,2.15,2.95,3.75,4.5,5.5,6.7,8.2,10.2]){
      for(const angle of angles)
        out.push({x:center.x+Math.cos(angle)*radius,
          z:center.z+Math.sin(angle)*radius,y:targetFloor(site)});
    }
  }
  return out;
}
export function defenderSetupPositions(world,count=5,focusSiteId="A"){
  const sites=world.facility.sites||{};
  const primary=sites[focusSiteId==="B"?"B":"A"]||sites.A;
  if(!primary)return [];
  const alternate=sites[focusSiteId==="B"?"A":"B"]||primary;
  const spots=[];
  for(let i=0;i<count;i++){
    // Defend both bombs, but keep the focus site staffed more heavily.
    const site=i%2===0?primary:alternate;
    const siteId=site===sites.B?"B":"A";
    const wanted=candidates(site,i);
    const markerRefs=(world.facility.defendSpawns||[])
      .filter(p=>Math.abs((p.y||0)-targetFloor(site))<.35)
      .map(p=>({x:p.x,y:targetFloor(site),z:p.z}));
    // Existing markers are a preference ONLY on their proper floor, and
    // should not override room-adjacent positions or site occupancy.
    const options=[...wanted,...markerRefs];
    const found=options.find(p=>isSafeDefenderInsertion(world,site,p,spots));
    if(!found){
      // Do not put defenders at Y=0 or inside walls as a silent fallback.
      // No spawn is safer than an incorrect-floor body.
      continue;
    }
    spots.push({...found,site:siteId,siteId,assignedSite:site});
  }
  return spots;
}
export function playerDefenderInsertion(world,siteId="A"){
  const site=world.facility.sites?.[siteId==="B"?"B":"A"];
  if(!site)return null;
  const choices=defenderSetupPositions(world,5,siteId);
  const own=choices.find(p=>p.site===siteId)||choices[0];
  return own?{...own,y:targetFloor(site),yaw:0}:null;
}
