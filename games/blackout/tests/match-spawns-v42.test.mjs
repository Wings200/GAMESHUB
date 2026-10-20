// BLACKOUT V4.2: real pre-action staging and mobile AI movement simulations.
// node --test games/blackout/tests/*.test.mjs — no rendered browser verification.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>readFileSync(join(root,file),"utf8");
const load=(name,deps,returnExpression)=>{
  const source=read("src/"+name).replace(/^import .*$/gm,"").replace(/^export /gm,"");
  return new Function("document",...Object.keys(deps),source+";return "+returnExpression+";")(
    document,...Object.values(deps));
};
const context={clearRect(){},fillRect(){},fillText(){}};
const document={createElement:()=>({width:0,height:0,getContext:()=>context})};
class Vec{constructor(x=0,y=0,z=0){this.set(x,y,z)}set(x,y,z){Object.assign(this,{x,y,z});return this}}
class SceneNode{
  constructor(){this.position=new Vec();this.rotation={x:0,y:0,z:0};
    this.material={color:{setHex(){}}};this.children=[];this.visible=true}
  add(...v){this.children.push(...v)}
  remove(){}
  traverse(){}
}
class Mesh extends SceneNode{constructor(geo,mat){super();this.material=mat}}
class Material{constructor(spec={}){Object.assign(this,spec);this.color={setHex(){}}}}
const T=new Proxy({Group:SceneNode,Mesh,MeshBasicMaterial:Material,
  MeshStandardMaterial:Material,CanvasTexture:class {},
  Raycaster:class{},SRGBColorSpace:"srgb",DoubleSide:2},
 {get:(o,k)=>o[k]??class{}});
const ops=load("operators.js",{},"{OPERATORS,operatorsForSide}");
const rules=load("spawn-rules.js",{},
  "{ATTACK_INSERTIONS,ATTACK_SQUAD_SPAWNS,ENEMY_ATTACK_SPAWNS,attackSpawnFor,canDeployAttackers}");
function make(){
  const sites={
    A:{id:"A",x:-5,z:-43,name:"BOMB A",bounds:{minX:-10,maxX:-2,minZ:-49,maxZ:-37}},
    B:{id:"B",x:5,z:-29,name:"BOMB B",bounds:{minX:2,maxX:9,minZ:-34,maxZ:-23}}
  };
  const world={facility:{sites},colliders:[],shootables:[]};
  const scene=new SceneNode();
  const created=[];
  const makeTacticalBot=(T,scene,world,id,x,z,stationary,team)=>{
    const bot={id,x,z,alive:true,team,stationary,group:new SceneNode(),
      hitboxes:[],walkSpeed:2.2,health:100,healthMax:100,nextShot:0};
    created.push(bot);return bot;
  };
  const createDefuserModel=()=>({hide(){},show(){},update(){}});
  const createBombStations=()=>({items:{A:{},B:{}},update(){}});
  const roundSpawns=load("round-spawns.js",{},
    "{defenderSetupPositions,targetFloor}");
  const dependencies={...roundSpawns,createDefuserModel,createBombStations,makeTacticalBot,
    advanceTacticalBot:()=>0,updateSquadCombat:()=>{},
    updateDefenderPrep:()=>{},operatorsForSide:ops.operatorsForSide,
    ATTACK_SQUAD_SPAWNS:rules.ATTACK_SQUAD_SPAWNS,
    ENEMY_ATTACK_SPAWNS:rules.ENEMY_ATTACK_SPAWNS};
  const ObjectiveDrill=load("objective.js",dependencies,"ObjectiveDrill");
  return {round:new ObjectiveDrill(T,world,scene),world,created};
}
test("attacker prep stages a roster but has no allied operator meshes or shootable bots",()=>{
  const {round,world}=make();round.setOperator(ops.OPERATORS.sledge);
  round.start(1000);
  assert.equal(round.phase,"prep");
  assert.equal(round.bots.length,5,"defenders exist for prep and drone intel");
  assert.equal(round.allies.length,0,"attacker models are not exposed in preparation");
  assert.equal(round.stagedAttackers.length,4);
  assert.equal(round.prepAttackersDeployed,false);
  assert.equal(world.shootables.filter(o=>o.userData?.bot?.team==="ally").length,0);
  assert.equal(round.stagedAttackers.every(b=>b.staged&&b.operatorSpec.side==="attacker"),true);
  round.beginAction(46000);
  assert.equal(round.phase,"attack");
  assert.equal(round.allies.length,4);
  assert.equal(round.stagedAttackers.length,0);
  assert.equal(round.prepAttackersDeployed,true);
  assert.ok(round.allies.every(b=>b.z>=15));
  round.beginAction(50000);
  assert.equal(round.allies.length,4,"no duplicate deployments");
});
test("defender prep exposes four friendly defenders but no attacker bots until action",()=>{
  const {round}=make();
  round.reset("defender");round.setOperator(ops.OPERATORS.mute);
  round.start(1000);
  assert.equal(round.allies.length,4);
  assert.equal(round.bots.length,0,"attackers are not available for prep spawn peeks");
  round.beginAction(46000);
  assert.equal(round.bots.length,5);
  assert.ok(round.bots.every(b=>b.z>=15));
  assert.equal(round.bots.filter(b=>b.carrier).length,1);
});
test("all three selectable entry points remain exterior and cannot spawn inside a bomb site",()=>{
  const {round}=make();
  for(const [id,pos] of Object.entries(rules.ATTACK_INSERTIONS)){
    assert.ok(pos.z>=15,id+" must be a distant entry");
    assert.equal(round.siteAt(pos),null,id+" must not be a bomb-site spawn");
    assert.deepEqual(rules.attackSpawnFor(id),pos);
  }
  assert.equal(rules.attackSpawnFor("garbage"),rules.ATTACK_INSERTIONS.south);
  assert.equal(rules.canDeployAttackers("prep"),false);
  assert.equal(rules.canDeployAttackers("attack"),true);
});
test("attacking support AI cycles physically clear cover lanes after reaching them",()=>{
  const {assaultSweepPosition,chooseTacticalReposition}=load("squad-ai.js",
    {advanceTacticalBot:()=>0},"{assaultSweepPosition,chooseTacticalReposition}");
  const round={sites:{A:{id:"A",x:-5,z:-43}},
    world:{colliders:[],facility:{coverPoints:[]}},playerRef:null};
  const bot={id:3,x:-5,z:-43,carrier:false,assignedSite:round.sites.A};
  const first=assaultSweepPosition(round,bot,1000);
  assert.ok(Math.hypot(first.x-bot.x,first.z-bot.z)>1);
  const original=assaultSweepPosition(round,bot,1050);
  assert.deepEqual(original,first,"goal is stable between AI decision ticks");
  bot.x=first.x;bot.z=first.z;
  const next=assaultSweepPosition(round,bot,7000);
  assert.notDeepEqual(next,first,"reaching a waypoint triggers a new lane");
  const enemy={x:bot.x+6,z:bot.z};
  const strafe=chooseTacticalReposition(round,bot,enemy,8000);
  assert.ok(strafe&&Math.hypot(strafe.x-bot.x,strafe.z-bot.z)>=1.9);
  const follow=chooseTacticalReposition(round,bot,enemy,8100);
  assert.deepEqual(follow,strafe,"combat goal should persist; state="+JSON.stringify({
    bot:{x:bot.x,z:bot.z,id:bot.id,until:bot.repositionUntil,goal:bot.repositionGoal,cooldown:bot.repositionCooldown},
    target:enemy,strafe,follow
  }));
  const obstacles=[{minX:strafe.x-.8,maxX:strafe.x+.8,
    minZ:strafe.z-.8,maxZ:strafe.z+.8,minY:0,maxY:3}];
  round.world.colliders=obstacles;
  const changed=chooseTacticalReposition(round,bot,enemy,11000);
  assert.ok(!changed||changed.x!==strafe.x||changed.z!==strafe.z,
    "AI cannot choose occupied combat positions");
});
