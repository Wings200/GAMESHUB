import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {
 FOUNDATION_VERSION,TEST_OBSTACLES,STAND_HEIGHT,CROUCH_HEIGHT,PRONE_HEIGHT,SPEED,
 initialPlayer,isFinitePlayer,canOccupy,stepPlayer
} from "./physics.js";
const home=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(join(home,p),"utf8");

test("new foundation is version zero, and the default spawn is clear",()=>{
 assert.equal(FOUNDATION_VERSION,"0.3.0");
 const p=initialPlayer();
 assert.deepEqual([p.x,p.y,p.z],[0,0,8]);
 assert.equal(p.grounded,true);
 assert.equal(p.prone,false);
 assert.equal(canOccupy(p.x,p.y,p.z,STAND_HEIGHT),true);
 assert.equal(TEST_OBSTACLES.length,4);
});
test("walking is deterministic and frame-rate independent within step precision",()=>{
 let a=initialPlayer(),b=initialPlayer();
 for(let i=0;i<100;i++)a=stepPlayer(a,{forward:1},.01);
 for(let i=0;i<50;i++)b=stepPlayer(b,{forward:1},.02);
 assert.ok(Math.abs(a.z-b.z)<.002);
 assert.ok(Math.abs(a.z-3.8)<.01);
 assert.equal(a.x,0);
});
test("diagonal movement is normalized and cannot gain free speed",()=>{
 const start=initialPlayer();
 const straight=stepPlayer(start,{forward:1},.04);
 const diagonal=stepPlayer(start,{forward:1,right:1},.04);
 assert.ok(Math.abs(Math.hypot(straight.x,straight.z-8)-
   Math.hypot(diagonal.x,diagonal.z-8))<.001);
});
test("sprinting and crouching change actual movement, not camera-only appearance",()=>{
 const start=initialPlayer();
 const walk=stepPlayer(start,{forward:1},.05);
 const run=stepPlayer(start,{forward:1,sprint:true},.05);
 const duck=stepPlayer(start,{forward:1,crouch:true,sprint:true},.05);
 assert.ok(run.z<walk.z&&walk.z<duck.z);
 assert.equal(run.sprinting,true);
 assert.equal(duck.sprinting,false);
 assert.equal(duck.crouched,true);
 assert.deepEqual([SPEED.walk,SPEED.sprint,SPEED.crouch,SPEED.prone],[4.2,6.3,2.4,1.1]);
 assert.ok(CROUCH_HEIGHT<STAND_HEIGHT);
 assert.ok(PRONE_HEIGHT<CROUCH_HEIGHT);
});
test("prone overrides crouch and sprint, crawls slower, and prevents jumping",()=>{
 const start=initialPlayer();
 const walk=stepPlayer(start,{forward:1},.05);
 const crouch=stepPlayer(start,{forward:1,crouch:true},.05);
 const crawl=stepPlayer(start,{forward:1,crouch:true,prone:true,sprint:true,jump:true},.05);
 assert.equal(crawl.prone,true);
 assert.equal(crawl.crouched,false);
 assert.equal(crawl.sprinting,false);
 assert.equal(crawl.grounded,true);
 assert.equal(crawl.y,0);
 assert.equal(crawl.speed,SPEED.prone);
 assert.ok(walk.z<crouch.z&&crouch.z<crawl.z);
 assert.equal(stepPlayer(crawl,{crouch:true},.016).crouched,true);
 assert.equal(stepPlayer(crawl,{},.016).prone,false);
});
test("low ceilings force prone until the player has sufficient head clearance",()=>{
 const overhead=[{id:"low-beam",x:0,z:0,width:4,depth:4,bottom:.80,height:1.45}];
 const under={...initialPlayer(),x:0,z:0,prone:true};
 assert.equal(canOccupy(0,0,0,PRONE_HEIGHT,overhead),true);
 assert.equal(canOccupy(0,0,0,CROUCH_HEIGHT,overhead),false);
 let state=stepPlayer(under,{prone:true},.016,overhead);
 state=stepPlayer(state,{},.016,overhead);
 assert.equal(state.prone,true,"must not stand up into a solid ceiling");
 state=stepPlayer(state,{crouch:true},.016,overhead);
 assert.equal(state.prone,true,"must not crouch when the ceiling is too low");
 state=stepPlayer({...state,z:4}, {crouch:true},.016,overhead);
 assert.equal(state.crouched,true);
 assert.equal(state.prone,false);
 state=stepPlayer(state,{},.016,overhead);
 assert.equal(state.crouched,false);
});
test("Ctrl cannot enter prone while airborne",()=>{
 const airborne=stepPlayer(initialPlayer(),{jump:true},.016);
 const next=stepPlayer(airborne,{prone:true},.016);
 assert.equal(next.prone,false);
 assert.equal(next.grounded,false);
});
test("jump uses real gravity, lands without falling through the ground, no air double jump",()=>{
 let p=stepPlayer(initialPlayer(),{jump:true},.016);
 assert.ok(p.y>0&&!p.grounded);
 const vy=p.vy;
 p=stepPlayer(p,{jump:true},.016);
 assert.ok(p.vy<vy,"second Space must not refresh jump velocity in air");
 let highest=p.y;
 for(let i=0;i<120;i++){p=stepPlayer(p,{},.016);highest=Math.max(p.y,highest);}
 assert.ok(highest>.35);
 assert.equal(p.y,0);assert.equal(p.vy,0);assert.equal(p.grounded,true);
});
test("wall collision sweep cannot tunnel at low frame rate or faster sprint speed",()=>{
 // Run directly toward the relocated west-wall collision station.
 let player={...initialPlayer(),x:-18,z:0};
 for(let i=0;i<400;i++){
   player=stepPlayer(player,{forward:1,sprint:true},.05);
   assert.ok(!(!canOccupy(player.x,player.y,player.z,STAND_HEIGHT)),
     "physics body must not intersect any obstacle");
 }
 // West station stays solid; no object sits in the central target lane.
 assert.ok(player.z>=-7.48,"player must stop at west wall before crossing");
 assert.ok(player.z<0,"player still approaches the west collision station");
});
test("wall sliding allows one axis to advance when the other is blocked",()=>{
 const obstacles=[{id:"north-barrier",x:0,z:0,width:6,depth:.25,height:3.1}];
 let p={...initialPlayer(),x:2.5,z:1.0};
 for(let i=0;i<30;i++)p=stepPlayer(p,{forward:1,right:1},.04,obstacles);
 assert.ok(p.x>3.0,"slide past wall edge when strafing");
 assert.ok(canOccupy(p.x,p.y,p.z,STAND_HEIGHT,obstacles));
});
test("range boundary constrains player coordinates and invalid state is rejected",()=>{
 let p={...initialPlayer(),x:29,z:29};
 for(let i=0;i<200;i++)p=stepPlayer(p,{forward:-1,right:1,sprint:true},.05,[]);
 assert.ok(p.x<=29.66&&p.z<=29.66);
 assert.throws(()=>stepPlayer({...p,x:Infinity},{forward:1}),/Invalid player/);
});
test("reboot entry point contains no old game imports, operators, bots or networking",()=>{
 const html=read("index.html"),main=read("reboot/main.js"),
   css=read("reboot/style.css"),physics=read("reboot/physics.js");
 for(const src of ["./reboot/main.js?v=reboot-010",
   "./reboot/style.css?v=reboot-009"])assert.ok(html.includes(src));
 assert.ok(main.includes('from "./physics.js?v=reboot-008"'));
 assert.match(main,/requestPointerLock\(/);
 assert.match(main,/pointerlockchange/);
 assert.match(main,/stepPlayer\(player,input,dt\)/);
 assert.match(main,/advanceFootsteps/);
 assert.ok(main.includes('crouch:keys.has("KeyC")'));
 assert.ok(main.includes("prone:proneToggle"));
 assert.ok(main.includes('event.code==="KeyZ"'));
 assert.ok(main.includes("reloadPressed=true"));
 assert.ok(main.includes('event.code==="KeyP"'));
 assert.ok(html.includes('id="ammo"'));
 assert.ok(html.includes('id="target-hits"'));
 assert.ok(main.includes('from "./legacy-weapons.js?v=reboot-006"'));
 assert.ok(main.includes('from "./legacy-audio.js?v=reboot-006"'));
 assert.ok(main.includes('from "./legacy-shooting.js?v=reboot-006"'));
 assert.equal(main.includes('from "./weapon.js?v=reboot-004"'),false);
 assert.ok(main.includes('from "./weapon-view.js?v=reboot-010"'));
 assert.ok(main.includes("legacyShotCone(shot"));
 assert.ok(main.includes("cycleLegacyFire(weapons,now"));
 assert.ok(main.includes('shotAudio.play("fire")'));
 assert.ok(main.includes('shotAudio.play("reload")'));
 assert.ok(main.includes('weaponView.eject()'));
 assert.ok(main.includes('from "./lean.js?v=reboot-005"'));
 assert.ok(main.includes('toggleLean(leanTarget,event.code==="KeyQ"?-1:1)'));
 assert.ok(main.includes('camera.rotation.set(player.pitch,player.yaw,leanPose.roll,"YXZ")'));
 assert.ok(main.includes("aimState(aimHeld,aimMix).accurate"));
 assert.ok(main.includes('from "./aim-resolver.js?v=reboot-007"'));
 assert.ok(main.includes("firstHitType(intersections,activeTargets)"));
 assert.ok(main.includes('from "./shot-ray.js?v=reboot-009"'));
 assert.ok(main.includes('function updateAimProbe(now)'));
 assert.ok(main.includes('LIVE SIGHT: '));
 assert.ok(main.includes('LAST SHOT: '));
 assert.equal(main.includes('shotTraces.push('),false);
 assert.ok(main.includes('const aimRaycaster=new THREE.Raycaster()'));
 assert.ok(main.includes("shotScreenPoint("));
 assert.ok(main.includes("weaponView.reticle.getWorldPosition(opticWorld)"));
 assert.ok(main.includes("opticNdc.copy(opticWorld).project(camera)"));
 assert.ok(main.includes("raycaster.setFromCamera({x:screen.x+cone.x,y:screen.y+cone.y},camera)"));
 assert.ok(main.includes('weaponView.update(dt,aimMix,gunKick'));
 assert.ok(main.indexOf("weaponView.update(dt,aimMix,gunKick")<
    main.indexOf("const fired=cycleLegacyFire(weapons,now"));
 assert.ok(html.includes('id="ballistics-debug"'));
 // ADS bullet position is now projected from the actual rendered optic.
 assert.ok(main.includes("SHOT BLOCKED"));
 assert.ok(html.includes("BULLET HOLES PERSIST ON WALLS"));
 assert.ok(html.includes('id="lean-status"'));
 assert.ok(html.includes("CTRL/Z PRONE"));
 assert.ok(html.includes("Q/E LEAN"));
 assert.match(main,/FootstepAudio/);
 const view=read("reboot/weapon-view.js"),model=read("reboot/weapon-model.js");
 assert.ok(view.includes("buildBX7Model"));
 assert.ok(view.includes('from "./impact-decals.js?v=reboot-010"'));
 assert.ok(view.includes("return createImpactDecals(THREE,scene)"));
 const impact=read("reboot/impact-decals.js");
 assert.ok(impact.includes("new THREE.InstancedMesh"));
 assert.ok(impact.includes("decals.frustumCulled=false"));
 assert.ok(impact.includes("polygonOffset:true"));
 assert.ok(impact.includes("Deliberately permanent"));
 assert.ok(main.includes("shotEffects.clear()"));
 assert.ok(view.includes('from "./weapon-model.js?v=reboot-008"'));
 assert.ok(model.includes("OPTIC_CENTER"));
 assert.ok(model.includes("ExtrudeGeometry"));
 assert.match(physics,/export function canOccupy/);
 assert.match(css,/\.menu/);
 for(const old of ["./main.js?","./style.css?","./competitive-ui.css?",
   "./src/objective.js","./src/weapons.js","./src/network-client.js"]){
   assert.equal(html.includes(old),false,"outdated entry "+old);
   assert.equal(main.includes("import "+old),false,"legacy imported by reboot "+old);
 }
 assert.equal(html.includes("id=\"boCreateRoom\""),false);
 assert.equal(html.includes("id=\"operatorCards\""),false);
});
