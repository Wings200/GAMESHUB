import test from "node:test";
import assert from "node:assert/strict";
import {createRemoteDrones} from "./remote-drones.js";
import {remoteObjectivePose} from "./remote-operators.js";
import {createRemoteObjectiveAudio} from "./remote-objective-audio.js";

class Vector{constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z}set(x,y,z){this.x=x;this.y=y;this.z=z}}
class Node{
 constructor(){this.children=[];this.position=new Vector();this.rotation={x:0,y:0,z:0};this.visible=true;this.userData={}}
 add(child){this.children.push(child)}
 traverse(fn){fn(this);for(const child of this.children)child.traverse(fn)}
}
class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true}}
class Resource{constructor(data){this.data=data}dispose(){}}
const THREE={Group:Node,Mesh,BoxGeometry:Resource,CylinderGeometry:Resource,
 TorusGeometry:Resource,MeshStandardMaterial:Resource};
function scene(){return {nodes:[],add(n){this.nodes.push(n)},remove(n){this.nodes=this.nodes.filter(x=>x!==n)}}}

test("defender renders remote attacker drone and its shootable owner ID",()=>{
 const world=scene(),remote=createRemoteDrones(THREE,world);
 const drone={x:2,y:0,z:5,yaw:0,deployed:true};
 remote.sync([{id:"att",side:"attacker",drones:[drone]},{id:"def",side:"defender",drones:[]}],"def");
 assert.equal(world.nodes.length,1);
 assert.equal(world.nodes[0].visible,true);
 assert.ok(remote.shootables().length>0);
 assert.ok(remote.shootables().every(mesh=>mesh.userData.onlineDroneOwnerId==="att"));
 remote.sync([{id:"att",side:"attacker",drones:[{...drone,deployed:false}]}],"def");
 assert.equal(world.nodes.length,0);
 assert.equal(remote.shootables().length,0);
 remote.clear();
});
test("a camera owner never gets a duplicate local network drone",()=>{
 const world=scene(),remote=createRemoteDrones(THREE,world);
 remote.sync([{id:"att",side:"attacker",drones:[{x:1,y:0,z:1,yaw:0,deployed:true}]}],"att");
 assert.equal(world.nodes.length,0);
});
test("network objective kneel/typing pose respects exact server duration",()=>{
 const now=100000;
 assert.equal(remoteObjectivePose({kind:"plant",startedAt:now,endsAt:now+7350},now).progress,0);
 assert.equal(remoteObjectivePose({kind:"disable",startedAt:now,endsAt:now+7000},now+3500).progress,.5);
 assert.equal(remoteObjectivePose({kind:"disable",startedAt:now,endsAt:now+7000},now+7000),null);
});
test("enemy hears nearby plant and defuse foley; stop when job ends or leaves radius",()=>{
 const clips=[];
 function makeAudio(src){
  const clip={src,paused:true,volume:0,playCount:0,pauseCount:0,duration:7.5,
   addEventListener(){},play(){this.paused=false;this.playCount++;return Promise.resolve()},
   pause(){this.paused=true;this.pauseCount++}};
  clips.push(clip);return clip;
 }
 const audio=createRemoteObjectiveAudio({plant:"plant.ogg",disable:"disable.ogg"},makeAudio);
 const now=100000;
 const s={mode:"active",id:"def",world:{interactions:{att:{kind:"plant",startedAt:now,
  endsAt:now+7350,x:0,y:0,z:1}}}};
 audio.sync(s,{x:0,y:0,z:0},now+1000);
 assert.equal(clips.length,1);assert.equal(clips[0].src,"plant.ogg");
 assert.equal(clips[0].playCount,1);assert.ok(clips[0].volume>0);
 s.world.interactions.att={kind:"disable",startedAt:now,endsAt:now+7000,x:0,y:0,z:1};
 audio.sync(s,{x:0,y:0,z:0},now+2000);
 assert.equal(clips.length,2);assert.equal(clips[0].paused,true);
 assert.equal(clips[1].src,"disable.ogg");
 audio.sync(s,{x:100,y:0,z:0},now+2100);
 assert.equal(clips[1].paused,true);
 audio.clear();
});
