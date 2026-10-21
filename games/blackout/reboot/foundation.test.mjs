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
 for(const src of ["./reboot/main.js?v=reboot-046",
   "./reboot/style.css?v=reboot-040"])assert.ok(html.includes(src));
 // Drone UI is now live; spectator camera remains intentionally hidden.
 assert.ok(html.includes('data-hud-mode="player"'));
 assert.ok(html.includes('id="drone-hud" class="device-hud device-hud-drone hidden"'));
 assert.ok(html.includes('id="camera-hud" class="device-hud device-hud-camera hidden"'));
 assert.ok(html.includes('data-hud-mode="drone"'));
 assert.ok(html.includes('data-hud-mode="camera"'));
 assert.ok(html.includes('class="device-nav"'));
 assert.ok(html.includes('class="device-view-toggle"'));
 assert.ok(html.includes('<kbd>Q</kbd>')&&html.includes('<kbd>E</kbd>'));
 assert.ok(html.includes('<kbd>CTRL</kbd>'));
 // Former placeholders must be replaced by TWO LIVE operator-specific rows.
 assert.equal(html.includes("NO GADGETS YET"),false);
 for(const id of ["utility-hud","utility-slot-special","utility-slot-normal",
  "utility-key-special","utility-key-normal","utility-name-special","utility-name-normal",
  "utility-status-special","utility-status-normal","utility-hud-note"])
  assert.ok(html.includes('id="'+id+'"'),"missing live utility HUD element "+id);
 assert.ok(html.includes('id="utility-key-special" title="Click the scroll wheel">MMB</kbd>'));
 assert.ok(html.includes('id="utility-key-normal">G</kbd>'));
 assert.equal(html.includes('id="utility-key-3"'),false);
 assert.equal(html.includes('id="utility-key-4"'),false);
 assert.ok(css.includes(".utility-hud-slot"));
 assert.ok(css.includes(".utility-hud-copy"));
 assert.ok(html.includes('id="health-current">125</b>'));
 assert.ok(html.includes('id="health-caption">TRAINING · GADGET BLASTS & ENEMY WIRE</small>'));
 assert.ok(main.includes('document.body.dataset.hudProfile=active?controlMode:"menu"'));
 // Verify the two future-mode shells aren't connected to fake gameplay modes.
 assert.equal(main.includes('document.getElementById("drone-hud").classList.remove("hidden")'),false);
 assert.equal(main.includes('document.getElementById("camera-hud").classList.remove("hidden")'),false);
 for(const selector of [".device-hud",".device-nav",".device-camera-switcher",
  ".device-view-toggle",".device-actions",".siege-quickslot"]){
  assert.ok(css.includes(selector),"missing visual profile "+selector);
 }
 // Screenshot-matched layout rather than the old multi-box debug HUD.
 for(const id of ["mission-check","round-clock","tactical-map","area-name",
  "heading","compass-arrow","fps","reserve-count","ammo","weapon-status",
  "target-hits","ballistics-debug"]){
  assert.ok(html.includes('id="'+id+'"'),"required live HUD element: "+id);
 }
 for(const hook of ["completedTargets.add(target.id)","compassHeading(player.yaw)",
  "drawTrainingMap(tacticalMapCtx,player,TEST_OBSTACLES,targets,BARRICADE,SOFT_WALL)",
  "drillClock(DRILL_LENGTH_SECONDS-drillElapsedSeconds)",
  'document.body.classList.toggle("range-active",locked)',
  "reserveCount.textContent=String(weapons.current.remaining)"]){
  assert.ok(main.includes(hook),"dynamic HUD hook "+hook);
 }
 for(const selector of [".siege-objective",".siege-minimap",".siege-round",
  ".siege-health",".siege-nav",".siege-gear",".siege-weapon-row.active",
  "body.range-active .topbar"]){
  assert.ok(css.includes(selector),"CSS class for reference HUD "+selector);
 }
 assert.equal(html.includes('class="hud-bottom"'),false,"old debug dashboard must be replaced");
 assert.ok(main.includes('from "./physics.js?v=reboot-028"'));
 assert.match(main,/requestPointerLock\(/);
 assert.match(main,/pointerlockchange/);
 assert.ok(main.includes("player=stepPlayer(player,input,dt,"));
 assert.match(main,/advanceFootsteps/);
 assert.ok(main.includes('crouch:keys.has("KeyC")'));
 assert.ok(main.includes("prone:proneToggle"));
 assert.ok(main.includes('event.code==="KeyZ"'));
 assert.ok(main.includes("reloadPressed=true"));
 assert.ok(main.includes('event.code==="KeyP"'));
 assert.ok(html.includes('id="ammo"'));
 assert.ok(html.includes('id="target-hits"'));
 assert.ok(main.includes('from "./legacy-weapons.js?v=reboot-006"'));
 assert.ok(main.includes('from "./legacy-audio.js?v=reboot-031"'));
 assert.ok(main.includes('from "./legacy-shooting.js?v=reboot-006"'));
 assert.equal(main.includes('from "./weapon.js?v=reboot-004"'),false);
 assert.ok(main.includes('from "./weapon-view.js?v=reboot-012"'));
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
 assert.ok(html.includes("Press <kbd>B</kbd> for ballistics diagnostics."));
 assert.ok(main.includes('from "./combat-raycast.js?v=reboot-012"'));
 assert.ok(main.includes('from "./tactical-hud.js?v=reboot-016"'));
 assert.ok(main.includes('combatIntersections(raycaster,'));
 assert.ok(main.includes('combatIntersections(aimRaycaster,'));
 assert.equal(main.includes('raycaster.intersectObjects(\n  [...shootableSolids'),false);
 const impact=read("reboot/impact-decals.js");
 assert.ok(impact.includes('poolForBox(surface)'));
 assert.ok(impact.includes('surface.add(mesh)'));
 assert.ok(impact.includes('box-face-bullet-holes'));
 assert.ok(html.includes('id="lean-status"'));
 assert.ok(main.includes('event.code==="KeyZ"'));
 assert.ok(main.includes('event.code==="KeyQ"'));
 assert.match(main,/FootstepAudio/);
 const view=read("reboot/weapon-view.js"),model=read("reboot/weapon-model.js");
 assert.ok(view.includes("buildBX7Model"));
 assert.ok(view.includes('from "./impact-decals.js?v=reboot-012"'));
 assert.ok(view.includes("return createImpactDecals(THREE,scene)"));
 assert.ok(impact.includes("new THREE.InstancedMesh"));
 assert.ok(impact.includes("decals.frustumCulled=false"));
 assert.ok(impact.includes("polygonOffset:true"));
 assert.ok(impact.includes("Deliberately permanent"));
 assert.ok(main.includes('from "./barricade.js?v=reboot-015"'));
 assert.ok(main.includes('from "./barricade-view.js?v=reboot-032"'));
 assert.ok(main.includes("createBarricadeStation(THREE,scene)"));
 assert.ok(main.includes("...barricade.blockers()"));
 assert.ok(main.includes("...softWall.blockers()"));
 assert.ok(main.includes("...softWall.shootables()"));
 assert.ok(main.includes("softWall.onHit(outcome.hit)"));
 assert.ok(main.includes("softWall.reset(player)"));
 assert.ok(main.includes('event.code==="KeyT"'));
 assert.ok(main.includes("softWall.tick(dt)"));
 // V0.11 metal reinforcement must be additive: preserve V0.9 and V0.10.
 assert.ok(main.includes('from "./reinforcement.js?v=reboot-046"'));
 assert.ok(main.includes('from "./reinforcement-view.js?v=reboot-046"'));
 assert.ok(main.includes("createReinforcementStation(THREE,scene)"));
 assert.ok(main.includes("...reinforcement.blockers()"));
 assert.ok(main.includes("...reinforcement.shootables()"));
 assert.ok(main.includes("reinforcement.steelImpact(outcome.hit)"));
 assert.ok(main.includes("reinforcement.step({"));
 assert.ok(main.includes("reinforcement.step({player,holding:false,dt:0})"),
  "pausing during installation must discard unfinished armor");
 assert.ok(main.includes("reinforcement.remove(player)"));
 assert.ok(main.includes('event.code==="KeyY"'));
 assert.ok(main.includes('keys.has("KeyF")'));
 assert.ok(main.includes("reinforcement.tick(dt)"));
 // V0.12: drone is a real separate controller, not decorative HUD toggling.
 assert.ok(main.includes('from "./drone-physics.js?v=reboot-019"'));
 assert.ok(main.includes('from "./drone-view.js?v=reboot-020"'));
 assert.ok(main.includes("createDroneView(THREE,scene)"));
 assert.ok(main.includes("throwDrone(clear.x,clear.z,player.yaw)"));
 assert.ok(main.includes('from "./drone-roster.js?v=reboot-020"'));
 // V0.13: 12 planned free operators; only two working generalists selectable.
 assert.ok(main.includes('from "./operators.js?v=reboot-025"'));
 assert.ok(main.includes('from "./operator-select.js?v=reboot-045"'));
 assert.ok(main.includes("createOperatorPicker("));
 assert.ok(main.includes('from "./secondary-loadout.js?v=reboot-045"'));
 assert.ok(main.includes('onPlanChange(){'));
 assert.ok(main.includes('refreshUtilityHud(); // Always reflect THIS operator\'s special/normal gadget plan.'));
 assert.ok(main.includes('utilityHudRows(operatorPicker.plans,activeOperator)'));
 assert.ok(main.includes('utilityName[i].textContent=row.name.toUpperCase()'));
 assert.ok(main.includes('utilityStatus[i].textContent=row.gadgetId==="barbed-wire"?'));
 assert.ok(main.includes('refreshUtilityHud();\nfunction resize(){'),
   "initial HUD must render before first player deployment");
 assert.ok(main.includes('startGadgetInput("KeyG")'));
 assert.ok(main.includes('startGadgetInput("MouseMiddle")'));
 assert.ok(main.includes('event.code==="KeyG"&&!event.repeat'));
 assert.ok(main.includes('if(event.button===1){'));
 assert.ok(main.includes('if(controlMode==="player"&&wireHealth.hp>0){'));
 assert.ok(main.includes('if(locked&&event.button===1)event.preventDefault()'));
 assert.ok(!main.includes('event.code==="Digit3"||event.code==="Digit4"'));
 assert.ok(read("reboot/secondary-loadout.js").includes('["MouseMiddle","KeyG"]'));
 assert.ok(main.includes('shotNoticeLeft=1.6;'));
 assert.ok(!main.includes("throwPlannedGadget("));
 // V0.14: design plans are distinct from functioning equipment.
 assert.ok(read("reboot/operator-select.js").includes("planSecondary(plans,op,index,value)"));
 assert.ok(html.includes('id="operator-plan-status"'));
 assert.ok(html.includes("Four gadget options still await physical implementation"));
 assert.ok(css.includes(".operator-gadget-select"));
 assert.ok(css.includes(".operator-plan-status"));
 assert.ok(main.includes('from "./operator-select.js?v=reboot-045"'));
 assert.equal(main.includes("throwPlannedGadget"),false,
  "planning UI must not invent gameplay for unimplemented gadget concepts");

 const operatorPickerSource=read("reboot/operator-select.js");
 assert.ok(operatorPickerSource.includes('document.getElementById("operator-current")'),
  "deployment button lives outside the operator selection root");
 assert.ok(!operatorPickerSource.includes('current=$("operator-current")'),
  "scoped lookup wrongly aborts all operator selection event registration");

 assert.ok(main.includes('activeOperator=operatorById("striker")'));
 assert.ok(main.includes("operatorHudName.textContent=operator.name"));
 // V0.13.2: every steel interaction must check the active faction.
 assert.ok(main.includes('import {operatorById,operatorLoadout,canUseReinforcement,canUseReconDrones}'));
 assert.ok(main.includes('const reinfNearby=canUseReinforcement(activeOperator)&&reinforcement.near(player)'));
 assert.ok(main.includes('player,holding:wireHealth.hp>0&&canUseReinforcement(activeOperator)&&keys.has("KeyF"),dt,'));
 assert.ok(main.includes('event.code==="KeyY"&&!event.repeat&&canUseReinforcement(activeOperator)'));
 assert.ok(main.includes('reinforcePrompt.classList.toggle("hidden",!reinfNearby)'));

 assert.ok(main.includes("operatorHudSide.textContent="));
 assert.ok(main.includes('speedMultiplier:operatorLoadout(activeOperator).speedMultiplier'));
 assert.ok(physics.includes("const operatorMultiplier=Number.isFinite(input.speedMultiplier)"));
 assert.ok(physics.includes(")*operatorMultiplier*terrainMultiplier"));
 for(const id of ["operator-selection","operator-roster","operator-attack","operator-defend",
   "operator-playable-label","operator-name","operator-role","operator-speed",
   "operator-armor","operator-slots","operator-current","operator-hud-name","operator-hud-side"])
  assert.ok(html.includes('id="'+id+'"'),"operator interface field missing "+id);
 assert.ok(css.includes(".operator-card"));
 assert.ok(css.includes(".operator-utility-slot"));
 assert.ok(css.includes(".operator-player-tag"));
 assert.ok(html.includes("2 PLAYABLE"));
 // UNASSIGNED is now the correct initial state of the LIVE operator utility HUD.
 assert.ok(html.includes('id="utility-name-special">EMPTY SLOT</strong>'));
 assert.ok(html.includes('id="utility-name-normal">EMPTY SLOT</strong>'));
 assert.equal(html.includes('id="utility-name-special">FLASHBANGS'),false,
  "dynamic gadget names must not be faked in static HTML");

 // V0.15: FIRST live physical gadget. Existing guns, drones, walls untouched.
 assert.ok(main.includes('from "./barbed-wire.js?v=reboot-030"'));
 assert.ok(main.includes('from "./barbed-wire-view.js?v=reboot-029"'));
 assert.ok(main.includes("placeWire(wireState,player,obstacles)"));
 assert.ok(main.includes("createWireView(THREE,scene,placement.device)"));
 assert.ok(main.includes('terrainMultiplier:wireTerrainMultiplier(wireState,player,activeOperator.side)'));
 assert.equal(main.includes("damageWire(wireState,wireId)"),false,
  "guns must never damage wire");
 assert.ok(main.includes("wireViews.get(selected.id)?.sync("));
 assert.ok(main.includes("...shootableWire()"));
 // V0.15.2 enemy-only damage. Wire appears ONLY in the punch ray,
 // never in both firearm and aim-probe raycasts.
 assert.equal(main.split("...shootableWire()").length-1,1);
 // V0.15.3: audible cues must be localized WORLD events, not synthetic UI text.
 assert.ok(main.includes('from "./wire-sound.js?v=reboot-031"'));
 assert.ok(main.includes('newWireSoundTracker()'));
 assert.ok(main.includes('stepWireSounds(wireSoundTracker,wireState,before,player,'));
 assert.ok(main.includes('wirePunchSound(result.destroyed,source)'));
 assert.ok(main.includes('shotAudio.playAt(cue.type,cue.x,cue.z,player.x,player.z,player.yaw)'));
 assert.ok(main.includes('shotAudio.playAt(wireCue.event.type,wireCue.event.x,wireCue.event.z,'));
 assert.ok(read("reboot/legacy-audio.js").includes('case "wire-rattle"'));
 assert.ok(read("reboot/legacy-audio.js").includes('case "wire-strike"'));
 assert.ok(read("reboot/legacy-audio.js").includes('case "wire-destroy"'));
 assert.ok(main.includes('wireSoundTracker=newWireSoundTracker()'));
 assert.ok(html.includes("enemy-only contact damage"));
 assert.ok(html.includes("EIGHT FUNCTIONAL SECONDARY GADGETS"));
 // V0.16: C4 must be real thrown, simulated, detonated, physically
 // changing model, HP, wooden boards and gypsum tiles.
 assert.ok(main.includes('from "./nitro.js?v=reboot-036"'));
 assert.ok(main.includes('from "./nitro-view.js?v=reboot-036"'));
 assert.ok(main.includes('from "./impact.js?v=reboot-036"'));
 assert.ok(main.includes('from "./impact-view.js?v=reboot-033"'));
 assert.ok(main.includes('from "./frag.js?v=reboot-036"'));
 assert.ok(main.includes('from "./frag-view.js?v=reboot-034"'));
 assert.ok(main.includes('fragState=newFragState()'));
 assert.ok(main.includes('throwFrag(fragState,player)'));
 assert.ok(main.includes('createFragView(THREE,scene,result.device)'));
 assert.ok(main.includes('tickFrag(fragState,dt,activeDroneObstacles())'));
 assert.ok(main.includes('applyGadgetBlast(blast,"FRAG")'));
 assert.ok(read("reboot/secondary-loadout.js").includes('role:"Timed explosive",implemented:true'));
 assert.ok(html.includes("Frag Grenades"));
 // V0.17: actual physical flash throws, fuse and camera-facing eyesight effect.
 assert.ok(main.includes('from "./flash.js?v=reboot-039"'));
 assert.ok(main.includes('from "./flash-view.js?v=reboot-037"'));
 assert.ok(main.includes('flashState=newFlashState()'));
 assert.ok(main.includes('throwFlash(flashState,player)'));
 assert.ok(main.includes('createFlashView(THREE,scene,result.device)'));
 assert.ok(main.includes('tickFlash(flashState,dt,activeDroneObstacles())'));
 assert.ok(main.includes('flashExposure(burst,{...player,eyeHeight:cameraEye},activeDroneObstacles())'));
 assert.ok(main.includes('flashEffect=applyFlashEffect(flashEffect,exposure)'));
 assert.ok(main.includes('flashOpacity(flashEffect)'));
 assert.ok(read("reboot/secondary-loadout.js").includes('role:"Sight disruption",implemented:true'));
 assert.ok(html.includes('id="flash-whiteout" class="flash-whiteout"'));
 assert.ok(css.includes(".flash-whiteout"));
 assert.ok(css.includes("background:#ffffff;"),"flash must be pure white");
 assert.equal(css.includes("background:radial-gradient(ellipse at center,#ffffff"),false,
  "flash may not leave translucent bluish edges");
 assert.ok(read("reboot/flash.js").includes("const strength=1"),
  "a valid flash must completely hide the scene, not scale whiteout by distance");
 assert.ok(read("reboot/legacy-audio.js").includes('case "gadget-flash"'));
 assert.ok(html.includes("FLASH 1.75S"));
 assert.ok(read("reboot/flash.js").includes("holdSeconds:2.2,fadeSeconds:3.8"));

 // V0.18: physical smoke throw, cloud lifetime and visual sightline denial.
 // V0.18.1 · hold-to-aim preview only for real physical throwable gadgets.
 assert.ok(main.includes('from "./throw-preview.js?v=reboot-041"'));
 assert.ok(main.includes('from "./throw-preview-view.js?v=reboot-041"'));
 assert.ok(main.includes('createThrowPreviewView(THREE,scene)'));
 assert.ok(main.includes('traceThrownGadget({...conf,player,obstacles:activeDroneObstacles()})'));
 assert.ok(main.includes('releaseGadgetInput("KeyG")'));
 assert.ok(main.includes('releaseGadgetInput("MouseMiddle")'));
 assert.ok(main.includes("throwPreviewView.update(row.gadgetId,trajectory)"));
 assert.ok(main.includes("cancelHeldThrow();"));
 assert.ok(main.includes("if(heldThrowCode)return"));
 assert.ok(html.includes("HOLD MMB/G TO AIM"));
 assert.ok(read("reboot/throw-preview-view.js").includes("THREE.LineDashedMaterial"));
 assert.ok(read("reboot/throw-preview.js").includes("stepper(state,frame,obstacles)"));
 assert.ok(read("reboot/throw-preview.js").includes('["frag","flash","smoke","impact","c4"]'));
 assert.ok(main.includes('from "./smoke.js?v=reboot-040"'));
 assert.ok(main.includes('from "./smoke-view.js?v=reboot-040"'));
 assert.ok(main.includes("smokeState=newSmokeState()"));
 assert.ok(main.includes('throwSmoke(smokeState,player)'));
 assert.ok(main.includes('createSmokeView(THREE,scene,result.device)'));
 assert.ok(main.includes('tickSmoke(smokeState,dt,activeDroneObstacles())'));
 assert.ok(main.includes('createSmokeCloudView(THREE,scene,cloud)'));
 assert.ok(main.includes('smokeCameraDensity(smokeState.clouds'));
 assert.ok(main.includes('smokeFog.style.opacity=String('));
 assert.ok(main.includes('view.dispose();smokeCloudViews.delete(id)'));
 assert.ok(read("reboot/secondary-loadout.js").includes('role:"Vision cover",implemented:true'));
 assert.ok(read("reboot/smoke-view.js").includes("depthWrite:true"));
 assert.ok(read("reboot/smoke-view.js").includes("new THREE.CanvasTexture(canvas)"));
 assert.ok(html.includes('id="smoke-fog" class="smoke-fog"'));
 assert.ok(css.includes(".smoke-fog"));
 assert.ok(html.includes("SMOKE 1.8S"));
 assert.ok(read("reboot/legacy-audio.js").includes('case "smoke-trigger"'));
 assert.ok(main.includes('impactState=newImpactState()'));
 assert.ok(main.includes('throwImpact(impactState,player)'));
 assert.ok(main.includes('createImpactView(THREE,scene,result.device)'));
 assert.ok(main.includes('tickImpact(impactState,dt,activeDroneObstacles())'));
 assert.ok(main.includes('applyGadgetBlast(blast,"IMPACT")'));
 assert.ok(read("reboot/secondary-loadout.js").includes('role:"Impact destruction",implemented:true'));
 assert.ok(html.includes("IMPACT ON CONTACT"));
 assert.ok(main.includes("nitroState=newNitroState()"));
 assert.ok(main.includes("throwNitro(nitroState,player)"));
 assert.ok(main.includes("createNitroView(THREE,scene,result.device)"));
 assert.ok(main.includes("nitroState=tickNitro(nitroState,dt,activeDroneObstacles())"));
 assert.ok(main.includes("detonateNitro(nitroState)"));
 assert.ok(main.includes("pickupNitro(nitroState,active.id,player)"));
 assert.ok(main.includes("view.pickupTarget,...shootableSolids"));
 assert.ok(main.includes("hits[0]?.object!==view.pickupTarget"));
 assert.ok(main.includes("keys.delete(\"KeyF\")"));
 assert.ok(main.includes("if(c4PickupKeyConsumed||softBreachPickupKeyConsumed||hardBreachPickupKeyConsumed)return"));
 assert.ok(main.includes("reinforcement.step({player,holding:false,dt:0})"));
 assert.ok(read("reboot/nitro-view.js").includes("pickupTarget.userData.c4PickupId=device.id"));
 assert.equal(read("reboot/impact.js").includes("radius:2.0"),true);
 // V0.18.3 · FRAG still splinters wood barricades but NEVER breaches gypsum.
 // V0.20.1: hard breach must create raised vault windows, not doorways.
 assert.ok(main.includes('from "./breach-vault.js?v=reboot-046"'));
 assert.ok(main.includes("beginBreachVault(player,opening,activeDroneObstacles())"));
 assert.ok(main.includes("stepBreachVault(player,breachVault,dt,obstacles)"));
 assert.ok(main.includes('keys.delete("Space")'));
 assert.ok(main.includes("breachVault=null,lastHardBreachOpening=null"));
 assert.ok(main.includes("reinforcement.state.breach:lastHardBreachOpening"));
 assert.ok(read("reboot/soft-wall-view.js").includes("function breachWindow(window)"));
 assert.ok(html.includes("PRESS SPACE AT SMALL HOLE TO VAULT"));
 // V0.20.0: reinforced walls have real cuttable, physical panels.
 assert.ok(main.includes('from "./hard-breach.js?v=reboot-045"'));
 assert.ok(main.includes('from "./hard-breach-view.js?v=reboot-045"'));
 assert.ok(main.includes("hardBreachState=newHardBreachState()"));
 assert.ok(main.includes("placeHardBreach(hardBreachState,player,{"));
 assert.ok(main.includes("reinforcementState:reinforcement.state"));
 assert.ok(main.includes("armHardBreach(hardBreachState)"));
 assert.ok(main.includes("tickHardBreach(hardBreachState,dt)"));
 assert.ok(main.includes("reinforcement.breachAt(blast)"));
 assert.ok(main.includes('applyGadgetBlast(blast,"HARD BREACH")'));
 assert.ok(main.includes("pickupHardBreach(hardBreachState,active.id,player)"));
 assert.ok(main.includes("tryPickupCurrentHardBreach()"));
 assert.ok(main.includes("hardBreachPickupKeyConsumed=true"));
 assert.ok(read("reboot/secondary-loadout.js").includes('role:"Reinforced wall breach (unprotected)",implemented:true'));
 assert.ok(read("reboot/reinforcement-view.js").includes("rebuildBreachMeshes()"));
 assert.ok(read("reboot/reinforcement.js").includes("hardBreachReinforcement(state,blast)"));
 assert.ok(read("reboot/reinforcement.js").includes('add("sill"'));
 assert.ok(read("reboot/reinforcement.js").includes('add("lintel"'));
 assert.ok(read("reboot/reinforcement.js").includes("bottom:.70,top:2.0"));
 assert.ok(html.includes("Look directly at the mounted charge and press F to pick it up"));
 assert.ok(html.includes("Four gadget options still await physical implementation"));
 // V0.19.0: physical soft breach charges with recoverable, mounted inventory.
 assert.ok(main.includes('from "./soft-breach.js?v=reboot-044"'));
 assert.ok(main.includes('from "./soft-breach-view.js?v=reboot-044"'));
 assert.ok(main.includes("softBreachState=newSoftBreachState()"));
 assert.ok(main.includes("placeSoftBreach(softBreachState,player,{"));
 assert.ok(main.includes("softState:softWall.state,barricadeState:barricade.state,"));
 assert.ok(main.includes("reinforced:reinforcement.installed"));
 assert.ok(main.includes("tickSoftBreach(softBreachState,dt)"));
 assert.ok(main.includes("detonateSoftBreach(softBreachState)"));
 assert.ok(main.includes('applyGadgetBlast(result.blast,"SOFT BREACH")'));
 assert.ok(main.includes("tryPickupCurrentSoftBreach()"));
 assert.ok(main.includes("pickupSoftBreach(softBreachState,active.id,player)"));
 assert.ok(main.includes("softBreachPickupKeyConsumed=true"));
 assert.ok(read("reboot/secondary-loadout.js").includes('role:"Soft wall destruction",implemented:true'));
 assert.ok(html.includes("F to recover and reuse"));
 assert.ok(html.includes("Four gadget options still await physical implementation"));
 assert.ok(main.includes('from "./blast-policy.js?v=reboot-045"'));
 assert.ok(main.includes("resolveStructuralBlast(label,{"));
 assert.ok(main.includes("woodBlast:()=>barricade.blastAt(blast)"));
 assert.ok(main.includes('label==="FRAG"?wood+" BOARDS · SOFT WALL INTACT"'));
 assert.ok(read("reboot/blast-policy.js").includes('["FRAG","IMPACT","C4","SOFT BREACH"]'));
 assert.ok(read("reboot/blast-policy.js").includes('["IMPACT","C4","SOFT BREACH","HARD BREACH"]'));
 assert.ok(html.includes("Frag Grenades splinter wooden barricades"));
 assert.ok(html.includes("but cannot damage gypsum walls"));
 assert.ok(main.includes("createNitroBlast(THREE,scene,blast)"));
 assert.ok(main.includes("barricade.blastAt(blast)"));
 assert.ok(main.includes('gypsumBlast:()=>label==="HARD BREACH"?'));
 assert.ok(main.includes("softWall.breachWindow(hardBreachWindow(blast)):softWall.blastAt(blast)"));
 assert.ok(main.includes("reinforced:reinforcement.installed"));
 assert.ok(main.includes("nitroBlastDamage(blast,{x:player.x"));
 assert.ok(main.includes("nitroBlastIsLethal(blast,{x:player.x"));
 assert.ok(main.includes("playerEliminated=wireHealth.hp===0"));
 assert.ok(main.includes("damageTaken=instantKill?wireHealth.hp"));
 assert.ok(main.includes("targetHits++;completedTargets.add(target.id);weapons.registerHit()"));
 assert.ok(read("reboot/barricade-view.js").includes("function blastAt(blast)"));
 assert.ok(read("reboot/soft-wall-view.js").includes("function blastAt(blast)"));
 assert.ok(read("reboot/secondary-loadout.js").includes('role:"Remote explosive",implemented:true'));
 assert.ok(html.includes("C4 REMOTE"));
 assert.ok(main.includes("newWireHealth()"));
 assert.ok(main.includes("tickWireHealth(wireHealth,wireState,player,activeOperator.side,dt)"));
 assert.ok(main.includes("wireHealth=newWireHealth()"));
 assert.ok(main.includes("if(wireHealth.hp>0)player=stepPlayer("));
 assert.ok(main.includes("ENEMY BARBED WIRE · -"));
 assert.ok(main.includes("healthNumber.textContent=String(wireHealth.hp)"));
 assert.ok(main.includes("healthCaption.textContent="));
 assert.ok(main.includes("if(wireHealth.hp===0&&event.code!==\"KeyP\")return"));
 for(const id of ["health-current","health-caption"])
  assert.ok(html.includes('id="'+id+'"'),"live HP HUD missing "+id);
 assert.ok(!html.includes("TRAINING · INVULNERABLE"));
 assert.ok(!main.includes('damageWire(wireState,wireId)'));

 assert.ok(main.includes("wireViews.get(d.id)?.shootables"));
 assert.ok(read("reboot/barbed-wire-view.js").includes("mesh.userData.wireId=device.id"));
 assert.ok(read("reboot/barbed-wire-view.js").includes("return {root,hitbox,shootables,sync}"));
 // V0.15.1 melee: enforce actual range/LOS, active animation and both
 // destruction pathways (not fake text-only prompts).
 assert.ok(main.includes('from "./melee.js?v=reboot-029"'));
 assert.ok(main.includes('from "./melee-view.js?v=reboot-029"'));
 assert.ok(main.includes("createMeleeView(THREE,camera)"));
 assert.ok(main.includes("event.code===\"KeyV\"&&!event.repeat"));
 assert.ok(main.includes("strikeMelee(performance.now())"));
 assert.ok(main.includes("meleeRaycaster.far=MELEE.range"));
 assert.ok(main.includes("selectedMeleeTarget(hits)"));
 assert.ok(main.includes("const result=damageWire(wireState,selected.id,2)"));
 assert.ok(main.includes("barricade.meleeHit(hits[0])"));
 assert.ok(main.includes('held:firing&&!meleeView.active'));
 assert.ok(main.includes("meleeView.update(dt)"));
 assert.ok(main.includes("meleeView.cancel()"));
 assert.ok(main.includes('event.code==="KeyH"'));
 assert.ok(html.includes("WIRE V TO BREAK"));
 assert.ok(html.includes("Four gadget options still await physical implementation"));
 assert.ok(read("reboot/barricade-view.js").includes("barricadeMeleeDamage(stateRef.current)"));

 assert.ok(main.includes('wireState.charges+"/"+WIRE.charges+" LEFT"'));
 assert.ok(main.includes('activeOperator.side==="defend"'));
 assert.ok(physics.includes('Math.max(.35,Math.min(1,input.terrainMultiplier))'));
 assert.equal(read("reboot/secondary-loadout.js").includes('name:"Barbed Wire",side:"defend",role:"Movement slowing",implemented:false'),false);
 assert.ok(html.includes("WIRE: GUNS CANNOT DESTROY IT"));
 assert.ok(main.includes("registerDrone(droneRoster,fresh,kind)"));
 assert.equal(main.includes('throwPhysicalDrone("initial",true)'),false,
  "5 must never automatically throw a drone");
 assert.ok(main.includes('throwPhysicalDrone(request.kind)'));
 assert.ok(main.includes('throwRequest(droneRoster,"range")'));
 assert.ok(main.includes("cameraRequest(droneRoster)"));
 assert.ok(main.includes("switchDroneCamera("));
 assert.ok(main.includes('newDroneRoster("range")'));
 assert.ok(main.includes('if(request.action==="open")'));
 assert.ok(main.includes('throwPhysicalDrone(request.kind)'));
 assert.ok(main.includes('setDroneCameraVisibility(droneViews,droneRoster.selected,'));
 assert.ok(main.includes('locked&&controlMode==="drone"'));
 assert.equal(main.includes('throw-first-and-open'),false,
   "5 must NEVER create a camera by throwing");
 assert.ok(html.includes('<small>DRONES <b id="spare-drone-count">2</b></small>'));
 assert.ok(html.includes('title="Throw carried drone"'));
 const droneView=read("reboot/drone-view.js");
 assert.ok(droneView.includes("export function setDroneCameraVisibility("));
 assert.ok(droneView.includes("views[i].root.visible=false"));
 
 assert.ok(main.includes('event.code==="Digit5"'));
 assert.ok(main.includes('event.code==="Digit6"'));
 // V0.13.3: defender can SEE physical attacker drones, but never own or use
 // them; recon quickbar and camera tip must not show on Sentry's HUD.
 assert.ok(main.includes('canUseReinforcement,canUseReconDrones'));
 assert.ok(main.includes('if(!canUseReconDrones(activeOperator))return false;'));
 assert.ok(main.includes('function openDroneCameras(){\n if(!canUseReconDrones(activeOperator))return;'));
 assert.ok(main.includes('if(controlMode!=="player"||!canUseReconDrones(activeOperator))return;'));
 assert.ok(main.includes('if(nextMode==="drone"&&!canUseReconDrones(activeOperator))nextMode="player"'));
 assert.ok(main.includes('droneEquipmentBar.classList.toggle("hidden",!hasRecon)'));
 assert.ok(main.includes('droneKeyTip.classList.toggle("hidden",!hasRecon)'));
 assert.ok(main.includes('defenderKeyTip.classList.toggle("hidden",hasRecon)'));
 assert.ok(main.includes('refreshDroneEquipment(); // Hide attack-only quickslots immediately on defense.'));
 for(const id of ["drone-equipment-bar","drone-key-tip","defender-key-tip"])
   assert.ok(html.includes('id="'+id+'"'),"side-gated HUD element absent: "+id);
 assert.ok(html.includes("NO RECON DRONES EQUIPPED"));

 assert.ok(main.includes('event.code==="KeyX"'));
 assert.ok(main.includes('controlMode==="drone"'));
 assert.ok(main.includes("tickDrone(drone,input,dt,activeDroneObstacles())"));
 assert.ok(main.includes("tickDrone(droneRoster.drones[i],{},dt,activeDroneObstacles())"),
 "parked drones must recharge and land while operator is active");
 assert.ok(main.includes('droneBoostPressed=true'));
 assert.ok(main.includes('droneJumpPressed=true'));
 assert.ok(main.includes('if(locked&&controlMode==="player")'));
 assert.ok(main.includes('hud.classList.toggle("hidden",!active||controlMode!=="player")'));
 assert.ok(main.includes('droneHud.classList.toggle("hidden",!active||controlMode!=="drone")'));
 assert.ok(main.includes("droneViews[i].update(droneRoster.drones[i],dt)"));
 assert.ok(main.includes("camera.position.set(drone.x,drone.y+DRONE.eye,drone.z)"));
 assert.ok(main.includes('drawTrainingMap(droneMapCtx,drone,TEST_OBSTACLES,targets,BARRICADE,SOFT_WALL)'));
 for(const id of ["drone-range-map","drone-charge-1","drone-charge-2",
    "drone-charge-3","drone-boost","drone-jump","drone-speed"])
   assert.ok(html.includes('id="'+id+'"'),"live drone field absent "+id);
 assert.ok(css.includes(".drone-commands"));
 assert.ok(css.includes(".drone-telemetry"));
 assert.ok(css.includes(".siege-equipment-bar"));
 for(const id of ["camera-drone-count","spare-drone-count","active-drone-number","total-drone-number"])
  assert.ok(html.includes('id="'+id+'"'),"dynamic camera or spare HUD missing: "+id);
 assert.ok(html.includes('class="siege-quickbar siege-equipment-bar"'));
 for(const oldLabel of ['title="Lean left"','title="Lean right"','title="Prone toggle"'])
  assert.equal(html.includes(oldLabel),false,"basic movement labels should leave bottom keybar");
 assert.ok(main.includes('droneCameraCount.textContent=String(info.cameras)'));
 assert.ok(main.includes('droneSpareCount.textContent=String(info.throwables)'));


 assert.ok(main.includes("if(outcome.hit&&!woodHit.handled&&!plasterHit.handled&&!metalHit)"));
 for(const id of ["reinforce-prompt","reinforce-status","reinforce-progress","reinforce-action"])
  assert.ok(html.includes('id="'+id+'"'),"reinforcement test UI absent: "+id);
 assert.ok(css.includes(".reinforce-prompt"));
 const shield=read("reboot/reinforcement-view.js");
 assert.ok(shield.includes("new THREE.BoxGeometry"));
 assert.ok(shield.includes("core.userData.reinforcementShield=true"));
 assert.ok(shield.includes("shootables:()=>state.installed?(state.breach?breachMeshes.slice():[core]):[]"));
 assert.ok(shield.includes("root.scale.y="));
 assert.ok(shield.includes("function steelImpact(hit)"));

 assert.ok(main.includes('from "./soft-wall.js?v=reboot-046"'));
 assert.ok(main.includes('from "./soft-wall-view.js?v=reboot-046"'));
 for(const id of ["soft-wall-readout","soft-wall-removed","soft-wall-status"]){
  assert.ok(html.includes('id="'+id+'"'),"soft-wall HUD absent: "+id);
 }
 assert.ok(css.includes(".soft-wall-readout"));
 const softView=read("reboot/soft-wall-view.js");
 assert.ok(softView.includes("new THREE.InstancedMesh"));
 assert.ok(softView.includes("instanceToCell[hit.instanceId]"));
 assert.ok(softView.includes("softWallRemove(state,index)"));
 assert.ok(softView.includes("canResetSoftWall(player)"));
 assert.ok(softView.includes("panel.count=count"));
 assert.ok(main.includes("...barricade.shootables()"));
 assert.ok(main.includes("barricade.hitBoard(outcome.hit)"));
 assert.ok(main.includes("barricade.rebuild()"));
 assert.ok(main.includes('keys.has("KeyF")'));
 assert.ok(main.includes('barricade.tick(dt)'));
 for(const id of ["barricade-prompt","barricade-progress","barricade-status","barricade-count"]){
   assert.ok(html.includes('id="'+id+'"'),"HUD barricade prompt missing "+id);
 }
 assert.ok(css.includes(".barricade-prompt"));
 const barrView=read("reboot/barricade-view.js");
 assert.ok(barrView.includes("function hitBoard(hit)"));
 assert.ok(barrView.includes("markDamage(boards[index],hit)"));
 assert.ok(barrView.includes("boards[index].visible=false"));
 assert.ok(barrView.includes("shards(boards[index])"));
  assert.ok(main.includes("shotEffects.clear()"));
 assert.ok(main.includes("shotEffects.lastFace"));
 assert.ok(main.includes("outcome.hit.point.y.toFixed(2)"));
 assert.ok(impact.includes("surface.worldToLocal(pos)"));
 assert.ok(impact.includes("matrix.premultiply(surface.matrixWorld)"));
 assert.ok(impact.includes("geometry.computeBoundingBox"));
 assert.ok(html.includes("Press <kbd>B</kbd> for ballistics diagnostics."));
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
