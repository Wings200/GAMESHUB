// BLACKOUT V7 — actual selected bomb-site floor spawning and prep guarantees.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const dir=join(dirname(fileURLToPath(import.meta.url)),"..");
const source=readFileSync(join(dir,"src/round-spawns.js"),"utf8")
  .replace(/^export /gm,"");
const {targetFloor,isSafeDefenderInsertion,defenderSetupPositions,playerDefenderInsertion}=
  new Function(source+";return {targetFloor,isSafeDefenderInsertion,defenderSetupPositions,playerDefenderInsertion}")();
const original=JSON.parse(readFileSync(join(dir,
  "maps/consolate-clubhouse.blackout-map.json"),"utf8"));
const toSite=(key,site)=>({id:key,...site});
function createWorld(pair=original.sitePairs[0]){
  const bounds={minX:-43,maxX:5,minZ:-21.1,maxZ:1};
  const siteA=toSite("A",pair.A),siteB=toSite("B",pair.B);
  const colliders=original.elements.filter(p=>
    ["hardWall","softWall","reinforcedWall","cover","railing"].includes(p.type))
    .map(p=>{
      const turn=Math.abs(Math.sin(p.rotationY*Math.PI/180))>.7,
        w=turn?p.size.z:p.size.x,d=turn?p.size.x:p.size.z;
      return {minX:p.position.x-w/2,maxX:p.position.x+w/2,
        minZ:p.position.z-d/2,maxZ:p.position.z+d/2,
        minY:p.position.y,maxY:p.position.y+p.size.y};
    });
  const floors=original.elements.filter(p=>p.type==="floor");
  return {colliders,facility:{bounds,sites:{A:siteA,B:siteB},
    defendSpawns:original.elements.filter(e=>e.type==="defenderSpawn")
      .map(e=>e.position)},
    floorAt(x,z,footY=0){
      let level=0;
      for(const p of floors)if(p.position.y<=footY+.36&&p.position.y>level&&
        Math.abs(x-p.position.x)<p.size.x/2&&Math.abs(z-p.position.z)<p.size.z/2)
        level=p.position.y;
      return level;
    }};
}
test("ground-floor defender team uses supported site zones and remains on 1F",()=>{
  const world=createWorld(original.sitePairs[0]);
  const placements=defenderSetupPositions(world,5,"A");
  assert.equal(placements.length,5,"human + 4 AI safe 1F positions");
  assert.equal(placements.filter(p=>p.site==="A").length,3);
  assert.equal(placements.filter(p=>p.site==="B").length,2);
  for(const p of placements){
    assert.equal(p.y,0);
    assert.equal(world.floorAt(p.x,p.z,p.y+.29),0);
    assert.equal(isSafeDefenderInsertion(world,world.facility.sites[p.site],
      p,placements.filter(o=>o!==p)),true);
  }
});
test("selecting 2F pair spawns human and four teammates on the actual upstairs slab",()=>{
 const world=createWorld(original.sitePairs[1]);
 const positions=defenderSetupPositions(world,5,"A");
 assert.equal(positions.length,5,"requires 5 safe 2F spawns");
 for(const p of positions){
   assert.equal(p.y,4,"AI cannot spawn on ground for upstairs bomb");
   assert.equal(world.floorAt(p.x,p.z,p.y+.29),4,"actual upper floor support required");
 }
 const a=playerDefenderInsertion(world,"A");
 const b=playerDefenderInsertion(world,"B");
 assert.equal(a.y,4);assert.equal(b.y,4);
 assert.equal(a.site,"A");assert.equal(b.site,"B");
 assert.ok(Math.hypot(a.x-world.facility.sites.A.x,a.z-world.facility.sites.A.z)<11);
 assert.ok(Math.hypot(b.x-world.facility.sites.B.x,b.z-world.facility.sites.B.z)<11);
 assert.ok(positions.every(p=>p.y===4));
});
test("defender insertion refuses phantom upstairs floors, solids and teammates",()=>{
 const world=createWorld(original.sitePairs[1]);
 const site=world.facility.sites.A;
 assert.equal(isSafeDefenderInsertion(world,site,{x:site.x,y:0,z:site.z}),false);
 assert.equal(isSafeDefenderInsertion(world,site,{x:-70,y:4,z:-70}),false);
 const found=playerDefenderInsertion(world,"A");
 assert.ok(found);
 assert.equal(isSafeDefenderInsertion(world,site,found,[found]),false);
 world.colliders.push({minX:found.x-1,maxX:found.x+1,
   minZ:found.z-1,maxZ:found.z+1,minY:4,maxY:6});
 assert.equal(isSafeDefenderInsertion(world,site,found),false);
});
test("all map defenders (including enemy team during attacker prep) use site-floor planner",()=>{
 const objective=readFileSync(join(dir,"src/objective.js"),"utf8");
 const main=readFileSync(join(dir,"main.js"),"utf8");
 for(const excerpt of [
   'defenderSetupPositions(this.world,5,this.siteId)',
   'this.spawnBot(p.x,p.z,true,"enemy",p.site,p.y)',
   'this.spawnBot(p.x,p.z,true,"ally",p.site,p.y)',
   'bot.y=height;bot.group.position.y=height',
   'this.stagedAttackers=staged.map',
   'for(const position of this.stagedAttackers)',
   'this.prepAttackersDeployed=true'
 ])assert.ok(objective.includes(excerpt),excerpt);
 assert.ok(main.includes('playerDefenderInsertion(world,objectiveRound.siteId)'));
 assert.ok(main.includes('player.x=500;player.z=500;player.y=0'),
   "local attacker never physically sits in map during drone phase");
 assert.ok(main.includes('deployLocalAttacker()'),
   "human attacker deploys at action transition");
 assert.ok(main.includes('"DEFEND SITE A · "'));
 assert.ok(main.includes('"DEFEND SITE B · "'));
 assert.ok(!main.includes('world.facility.defendSpawns||[]'),
   "human must no longer trust ground-only markers for upstairs site");
});
