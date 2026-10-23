import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createOnlineWorld,interactStart,interactStop,resolveInteractions,
 meleeWorld,wallParts,droneObstacles,placeCharge,detonateCharge,dropDefuser}
 from "../online-world.js";
import {canDroneOccupy} from "./drone-physics.js";
const map=JSON.parse(readFileSync(new URL("../maps/ironvale-operations.blackout-map.json",import.meta.url),"utf8"));
function sample(side="attacker",operator="thermite",x=8,z=8){
 return {id:side==="attacker"?"1":"2",side,operator,x,z,y:0,yaw:0,alive:true};
}
test("multiplayer plant is held for full timer, cancels safely, and defender disable awards result",()=>{
 const attacker=sample(),defender=sample("defender","mute",8,8);
 const world=createOnlineWorld(map,[attacker,defender],1000);
 assert.equal(world.bomb.carrierId,"1");
 assert.match(interactStart(map,world,attacker,[attacker,defender],1000),/PLANTING/);
 assert.deepEqual(resolveInteractions(map,world,[attacker,defender],7000),[]);
 interactStop(world,"1");
 assert.deepEqual(resolveInteractions(map,world,[attacker,defender],9000),[]);
 assert.equal(world.bomb.phase,"carried");
 interactStart(map,world,attacker,[attacker,defender],10000);
 assert.equal(resolveInteractions(map,world,[attacker,defender],18000)[0].kind,"planted");
 assert.equal(world.bomb.phase,"planted");
 assert.match(interactStart(map,world,defender,[attacker,defender],18500),/DISABLING/);
 assert.equal(resolveInteractions(map,world,[attacker,defender],26000)[0].winner,"defender");
 assert.equal(world.bomb.phase,"disabled");
});
test("full barricade blocks players but allows grounded drone underneath, three melees remove it",()=>{
 const door=map.elements.find(e=>e.type==="door");
 const defender=sample("defender","mute",door.position.x,door.position.z+1);
 defender.yaw=0;
 const world=createOnlineWorld(map,[defender],0);
 assert.match(interactStart(map,world,defender,[defender],1000),/BARRICADING/);
 assert.equal(resolveInteractions(map,world,[defender],4000)[0].kind,"barricaded");
 assert.equal(world.barricades[door.id],3);
 assert.ok(wallParts(map,world).some(e=>e.id==="barricade:"+door.id));
 const barriers=droneObstacles(map,world);
 const wooden=barriers.find(e=>e.x===door.position.x&&
   e.z===door.position.z&&e.bottom===door.position.y+.34);
 assert.ok(wooden);
 assert.equal(canDroneOccupy(door.position.x,door.position.y,door.position.z,[wooden],90),true);
 const attacker=sample("attacker","sledge",door.position.x,door.position.z+1);
 attacker.yaw=0;
 for(let i=0;i<3;i++)assert.ok(meleeWorld(map,world,attacker));
 assert.equal(world.barricades[door.id],undefined);
});
test("separate hard breach charges make separate permanent map holes; operators gated",()=>{
 const walls=map.elements.filter(e=>e.type==="softWall");
 const attacker=sample("attacker","thermite",walls[0].position.x,walls[0].position.z+1);
 const world=createOnlineWorld(map,[attacker],0);
 assert.equal(placeCharge(map,world,attacker)?.target,walls[0].id);
 assert.equal(detonateCharge(map,world,attacker)?.target,walls[0].id);
 assert.equal(world.walls[walls[0].id],"open");
 attacker.x=walls[1].position.x;attacker.z=walls[1].position.z+1;
 assert.equal(placeCharge(map,world,attacker)?.target,walls[1].id);
 assert.equal(detonateCharge(map,world,attacker)?.target,walls[1].id);
 assert.equal(world.walls[walls[0].id],"open");
 assert.equal(world.walls[walls[1].id],"open");
 assert.equal(placeCharge(map,world,attacker),null);
});
test("defuser can be dropped and picked up by the same team in range",()=>{
 const p=sample(),world=createOnlineWorld(map,[p],0);
 assert.equal(dropDefuser(world,p),true);
 assert.equal(world.bomb.phase,"dropped");
 assert.match(interactStart(map,world,p,[p],1000),/PICKED UP/);
 assert.equal(world.bomb.phase,"carried");
});
