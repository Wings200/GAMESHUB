// BLACKOUT V3.2 - reproducible mechanics tests (not a browser renderer).
// node --test games/blackout/tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const ctx=new Proxy({},{get:(obj,key)=>obj[key]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const document={createElement:()=>({getContext:()=>ctx})};
class Vec{constructor(x=0,y=0,z=0){this.set(x,y,z)}set(x,y,z){Object.assign(this,{x,y,z});return this}}
class Node{
 constructor(){this.position=new Vec();this.rotation={set(){},order:"YXZ"};
   this.scale={set(){},setScalar(){}};this.children=[];this.userData={};this.visible=true}
 add(...items){for(const x of items){x.parent=this;this.children.push(x)}}
 remove(x){this.children=this.children.filter(y=>y!==x)}
 traverse(f){f(this);for(const x of this.children)x.traverse?.(f)}
}
class Mesh extends Node{constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true}}
class Material{constructor(props={}){Object.assign(this,props);this.color={setHex(){}}}dispose(){}}
class Geo{dispose(){}}
class Texture{constructor(){this.repeat={set(){}}}}
const T=new Proxy({
 Group:Node,Mesh,GridHelper:Mesh,MeshStandardMaterial:Material,
 MeshBasicMaterial:Material,CanvasTexture:Texture,
 HemisphereLight:Node,DirectionalLight:Node,PointLight:Node,
 Color:class{},FogExp2:class{},DoubleSide:2,
 RepeatWrapping:100,SRGBColorSpace:"srgb"
},{get:(o,k)=>o[k]??Geo});
function load(path,deps,out){
 const source=readFileSync(join(root,"src",path),"utf8")
   .replace(/^import .*$/gm,"").replace(/^export /gm,"");
 return new Function("document",...Object.keys(deps),
   source+";return "+out+";")(document,...Object.values(deps));
}
const ballistics=load("material-ballistics.js",{},
  "{MATERIALS,materialStats,accumulatedBreach,recoilFor}");
const fac=load("facility.js",{},"buildFacility");
const build=load("world.js",{buildFacility:fac,...ballistics},"buildRange");
const {collides}=load("player.js",{},"{collides}");
const Weapons=load("weapons.js",{recoilFor:ballistics.recoilFor},"Weapons");
const {findTacticalPath}=load("bot-ai.js",{},"{findTacticalPath}");
function make(){return build(T,new Node())}
test("five materials include drywall, plywood, glass, and reinforced steel",()=>{
 const w=make();
 assert.deepEqual(w.panels.map(p=>p.materialType),
   ["drywall","steel","plywood","glass","drywall"]);
 const values=Object.values(ballistics.MATERIALS).map(m=>m.through);
 assert.equal(values.length,4);
 assert.ok(values.includes(0));
});
test("repeated shots grow local damage and create physically passable opening",()=>{
 const w=make(),wall=w.panels[0],prevRevision=w.collisionRevision;
 assert.ok(collides(w,-12,-29,0,1.73,.34));
 for(let n=0;n<12;n++)wall.hitBullet({x:-12,y:1.10,z:-29});
 assert.equal(wall.openingWidth,0);
 assert.ok(w.colliders.includes(wall.collider));
 assert.ok(wall.holes.length>=1);
 for(let n=0;n<26;n++)wall.hitBullet({x:-12,y:1.10,z:-29});
 assert.ok(wall.openingWidth>=1.0);
 assert.equal(w.colliders.includes(wall.collider),false);
 assert.ok(!collides(w,-12,-29,0,1.73,.34));
 assert.ok(collides(w,-13.3,-29,0,1.73,.34));
 assert.equal(wall.rails[0].visible,false);
 assert.ok(w.collisionRevision>prevRevision);
 const path=findTacticalPath(w,{x:-12,z:-32},{x:-12,z:-25});
 assert.ok(path.length>0);
 w.reset();
 assert.ok(collides(w,-12,-29,0,1.73,.34));
 assert.equal(wall.openingWidth,0);
 assert.equal(wall.rails[0].visible,true);
});
test("different materials reduce shot damage by different amounts",()=>{
 const w=make(),dry=w.panels[0],wood=w.panels[2],
   glass=w.panels[3],steel=w.panels[1];
 const hit=p=>p.hitBullet({x:p.x,y:1.2,z:p.z});
 const a=hit(dry),b=hit(wood),c=hit(glass),d=hit(steel);
 assert.ok(a.passed&&b.passed&&c.passed);
 assert.ok(c.attenuation>a.attenuation);
 assert.ok(a.attenuation>b.attenuation);
 assert.equal(d.passed,false);
 assert.equal(d.attenuation,0);
 assert.equal(steel.holes.length,0);
});
test("hard breach still destroys non-reinforced panels and reset restores samples",()=>{
 const w=make(),p=w.panels[0],steel=w.panels[1];
 assert.equal(steel.reinforced,true);
 assert.equal(steel.damage(500,true),false);
 assert.equal(p.damage(500,true),true);
 assert.equal(w.colliders.includes(p.collider),false);
 w.reset();
 assert.equal(p.destroyed,false);
 assert.ok(w.colliders.includes(p.collider));
 assert.equal(steel.reinforced,true);
});
test("gun recoil patterns are repeatable but differ by weapon",()=>{
 const primary=Array.from({length:9},(_,i)=>ballistics.recoilFor("primary",i,true));
 const again=Array.from({length:9},(_,i)=>ballistics.recoilFor("primary",i,true));
 const pistol=Array.from({length:9},(_,i)=>ballistics.recoilFor("secondary",i,true));
 assert.deepEqual(primary,again);
 assert.notDeepEqual(primary,pistol);
 const gun=new Weapons();
 const first=gun.tryFire(100,true);
 const second=gun.tryFire(200,true);
 assert.ok(first.ok&&second.ok);
 assert.notDeepEqual(first.kick,second.kick);
 const resetShot=gun.tryFire(650,true);
 assert.deepEqual(resetShot.kick,first.kick);
 assert.ok(first.spread<.01);
});
