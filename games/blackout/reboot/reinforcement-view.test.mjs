import test from "node:test";
import assert from "node:assert/strict";
import {createReinforcementStation} from "./reinforcement-view.js";
import {REINFORCEMENT} from "./reinforcement.js";
import {SOFT_WALL} from "./soft-wall.js";
class V3{
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 copy(p){return this.set(p.x,p.y,p.z)}
 setScalar(s){this.x=s;this.y=s;this.z=s;return this}
 clone(){return new V3(this.x,this.y,this.z)}
}
class Group{
 constructor(){this.children=[];this.position=new V3();this.scale=new V3(1,1,1);
  this.rotation={x:0,y:0,z:0};this.userData={};this.visible=true}
 add(mesh){this.children.push(mesh);mesh.parent=this}
 remove(mesh){this.children=this.children.filter(x=>x!==mesh);}
}
class Mesh extends Group{
 constructor(geometry,material){super();this.geometry=geometry;this.material=material}
}
class Geometry{constructor(...values){this.dimensions=values}dispose(){}}
class Material{constructor(spec){this.properties=spec}}
const THREE={Group,Mesh,BoxGeometry:Geometry,CylinderGeometry:Geometry,
 SphereGeometry:Geometry,MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 DoubleSide:2};
function fixture(){
 const scene={children:[],add(x){this.children.push(x)},
  remove(x){this.children=this.children.filter(i=>i!==x)}};
 return {station:createReinforcementStation(THREE,scene),scene};
}
function player(){return {x:SOFT_WALL.x,z:SOFT_WALL.z+1.1}}
function finish(station){
 let installed=false;
 for(let i=0;i<60;i++){
  const event=station.step({player:player(),holding:true,dt:.05}).event;
  if(event==="installed")installed=true;
 }
 return installed?"installed":"incomplete";
}
test("original metal support art starts hidden and has no gun or player collision",()=>{
 const {station,scene}=fixture();
 assert.equal(scene.children.length,1);
 assert.equal(station.root.visible,false);
 assert.equal(station.shootables().length,0);
 assert.equal(station.blockers().length,0);
 assert.equal(station.installed,false);
 assert.equal(station.root.children.filter(m=>m.name==="real bulletproof metal").length,1);
 assert.ok(station.root.children.some(m=>m.name==="horizontal reinforcement rib"));
 assert.ok(station.root.children.some(m=>m.name==="steel rivet"));
});
test("holding F produces actual bottom-up steel construction; completing adds bulletproof mesh",()=>{
 const {station}=fixture();
 station.step({player:player(),holding:true,dt:.05});
 assert.equal(station.root.visible,true);
 assert.ok(station.root.scale.y>0&&station.root.scale.y<.03);
 assert.equal(station.shootables().length,0,"unfinished metal cannot stop bullets");
 assert.equal(station.blockers().length,0,"unfinished metal cannot trap people");
 assert.equal(finish(station),"installed");
 assert.equal(station.installed,true);
 assert.equal(station.root.scale.y,1);
 assert.equal(station.shootables().length,1);
 assert.equal(station.blockers().length,1);
 assert.equal(station.shootables()[0].userData.reinforcementShield,true);
 assert.equal(station.shootables()[0].userData.physicsObstacleId,REINFORCEMENT.id);
});
test("steel hit is handled without mutating original soft-wall tiles or opening metal",()=>{
 const {station}=fixture();finish(station);
 const core=station.shootables()[0];
 const before=station.blockers();
 const hit={object:core,point:new V3(SOFT_WALL.x,1.1,SOFT_WALL.z+.15)};
 assert.equal(station.steelImpact(hit),true);
 assert.equal(station.steelImpact({object:{},point:hit.point}),false);
 assert.deepEqual(station.blockers(),before);
 assert.equal(station.shootables().length,1);
 station.tick(.12);
 assert.equal(station.installed,true);
});
test("Y removes metal, preserves original drywall and allows repeat installations",()=>{
 const {station}=fixture();finish(station);
 assert.equal(station.remove({x:0,z:8}).removed,false);
 const result=station.remove(player());
 assert.equal(result.removed,true);
 assert.equal(station.root.visible,false);
 assert.equal(station.shootables().length,0);
 assert.deepEqual(station.blockers(),[]);
 assert.equal(finish(station),"installed");
 assert.equal(station.state.installs,2);
});

test("hard breach removes the original monolithic visible steel and leaves real shootable fragments",()=>{
 const {station}=fixture();finish(station);
 const original=station.shootables()[0];
 assert.equal(original.visible,true);
 const blast=station.breachAt({x:SOFT_WALL.x,y:1.35,z:SOFT_WALL.z});
 assert.equal(blast.opened,true);
 assert.equal(station.breached,true);
 assert.equal(station.status,"BREACHED");
 assert.equal(original.visible,false);
 assert.equal(station.shootables().length,3);
 assert.equal(station.blockers().length,3);
 assert.equal(station.root.children.some(x=>x.name==="horizontal reinforcement rib"&&x.visible),false);
 assert.equal(station.shootables().every(x=>x.userData.reinforcementShield===true),true);
 assert.equal(station.shootables().every(x=>x.userData.physicsObstacleId?.includes("metal-reinforcement")),true);
 const surviving=station.shootables()[0];
 const fakeHit={object:surviving,point:new V3(SOFT_WALL.x,1.0,SOFT_WALL.z)};
 assert.equal(station.steelImpact(fakeHit),true);
 assert.equal(station.steelImpact({object:original,point:fakeHit.point}),false);
 const removed=station.remove(player());
 assert.equal(removed.removed,true);
 assert.equal(station.shootables().length,0);
 assert.equal(station.breached,false);
 assert.equal(finish(station),"installed");
 assert.equal(station.shootables().length,1);
 assert.equal(station.shootables()[0],original);
 assert.equal(original.visible,true);
});
