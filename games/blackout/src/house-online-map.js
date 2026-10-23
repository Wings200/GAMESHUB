// Server/client map adapter for the ORIGINAL BLACKOUT house. The coordinates
// come directly from Solo Custom; no second, hand-authored online building.
import {HOUSE,HOUSE_BLOCKERS} from "../reboot/house-layout.js";
import {BOMB_RULES} from "../reboot/bomb-round.js";

const surface=block=>{
 const width=block.width,depth=block.depth;
 const bottom=block.bottom,top=block.height;
 return Object.freeze({
  id:block.id,
  type:block.kind==="slab"?"floor":block.kind==="furniture"||
   block.kind==="roof"?"cover":"hardWall",
  material:block.material,
  position:Object.freeze({x:block.x,y:block.kind==="slab"?top:bottom,z:block.z}),
  size:Object.freeze({x:width,y:top-bottom,z:depth}),
  rotationY:0
 });
};

const stairs=HOUSE.stairs;
const elements=[
 Object.freeze({id:"house-ground",type:"floor",position:{x:0,y:0,z:0},
  size:{x:100,y:.2,z:100},rotationY:0}),
 ...HOUSE_BLOCKERS.map(surface),
 Object.freeze({id:"house-main-stairs",type:"stairs",
  position:{x:(stairs.minX+stairs.maxX)/2,y:0,
   z:(stairs.minZ+stairs.maxZ)/2},
  size:{x:stairs.maxX-stairs.minX,y:HOUSE.floorHeight,
   z:stairs.maxZ-stairs.minZ},
  // Server stair interpolation rises toward -Z, matching houseFloorAt.
  rotationY:180})
];
const sites=Object.fromEntries(BOMB_RULES.sites.map(site=>[site.id,
 Object.freeze({x:site.x,y:0,z:site.z,plantRadius:site.radius})]));

export const HOUSE_ONLINE_MAP=Object.freeze({
 id:"blackout-original-house",name:"ORIGINAL HOUSE",
 elements:Object.freeze(elements),
 sitePairs:Object.freeze([Object.freeze({id:"house-a-b",A:sites.A,B:sites.B})])
});

// These all lie on the house's real lower corridor / exterior spawn, not
// Ironvale's coordinate system. They are safe for a full five-player team.
export function houseOnlineSpawn(side,ordinal=0){
 const index=Math.max(0,Math.trunc(Number(ordinal)||0))%5;
 const original=side==="defender"?HOUSE.defenderSpawn:HOUSE.attackerSpawn;
 return {x:original.x+(index-2)*.44,y:0,z:original.z,yaw:original.yaw};
}
