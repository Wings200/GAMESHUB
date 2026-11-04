import * as THREE from 'three';
import {buildWastelandSet} from '../wasteland-setdress.mjs';
import {projectileNearMiss} from '../combat-suppression.mjs';
import {createImpactEffects} from '../combat-effects.mjs';
import {CAMPAIGN_FACTIONS,CAMPAIGN_QUESTS,CAMPAIGN_NODES,
  initialCampaignState,safeCampaignSnapshot,startCampaignQuest,
  advanceCampaignEvent,resolveCampaignQuest,trackCampaignQuest,campaignJournal
} from '../campaign.mjs';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { stepMovement, requestJump, toggleCrouch, resetMotion, MOVE_TUNING, setEndurance, maximumStamina, ENDURANCE_TUNING, staminaRecoveryRate } from '../movement.mjs';
import { SCRAP_PISTOL, TEN_MM_PISTOL, PIPE_PISTOL, PIPE_RIFLE, LASER_MUSKET, DOUBLE_BARREL_SHOTGUN, PUMP_ACTION_SHOTGUN, BOLT_HUNTING_RIFLE, IRON_REVOLVER, PIPE_SMG, HEAVY_SNIPER, ARSENAL, ARSENAL_IDS, getWeaponSpec, createArsenalStates,
  createWeaponState, setWeaponAim, startWeaponReload, cancelWeaponReload, updateWeapon, fireWeapon,
  shotSpreadDegrees } from '../weapons.mjs?v=W20.44';
import {createWeaponRecoilState,resetWeaponRecoil,applyWeaponRecoil,
  countersteerWeaponRecoil,stepWeaponRecoil} from '../weapon-recoil.mjs?v=W20.44';
import { reloadVisualState, reloadPoseForWeapon, slideTravel, createCasingState, stepCasing, CASING_TUNING } from '../weapon-handling.mjs?v=W20.44';
import { sightMount, adsWeaponPosition, sightForOptic, OPTIC_MODS,
  compatibleOptics } from '../weapon-sights.mjs?v=W20.44';
import { WeaponAudio, getImpactMaterial, footstepStrideMeters } from '../weapon-audio.mjs?v=W20.44';
import {POWER_ARMOR_SLOTS,POWER_ARMOR_PLATES,POWER_ARMOR_RECIPES,
  createPowerArmorState,getPowerPlate,plateCondition,powerArmorIndicatorStatus,setPowerPlate,
  removePowerPlate,repairPowerPlate,damagePowerPlate,
  installFusionCore,ejectFusionCore,stepFusionCore,hasFusionPower,powerArmorMobility,
  beginPowerArmorTransition,stepPowerArmor,
  POWER_ARMOR_TRANSITION_SECONDS,powerArmorProtection,powerArmorEyeHeight,safePowerArmorSnapshot,
  POWER_ARMOR_VISUAL_SCALE,POWER_ARMOR_STAND_HEIGHT,POWER_ARMOR_CROUCH_HEIGHT,
  FUSION_CORE_CAPACITY} from '../power-armor.mjs';
import {buildPowerArmorVisual,buildPowerArmorCockpit} from '../power-armor-visual.mjs?v=W20.16';
import {createNpcAvatar} from '../npc-avatar.mjs?v=W20.45';
import {WORLD_WEAPON_GRIPS} from '../weapon-grip-ik.mjs?v=W20.44';
import {createTenMillimeterPistol} from '../tenmm-pistol.mjs?v=W20.23';
import {createPipePistol} from '../pipe-pistol.mjs?v=W20.23';
import {createPipeRifle} from '../pipe-rifle.mjs?v=W20.25';
import {createLaserMusket} from '../laser-musket.mjs?v=W20.26';
import {createDoubleBarrelShotgun} from '../double-barrel-shotgun.mjs?v=W20.28';
import {doubleBarrelPelletDamage} from '../double-barrel-ballistics.mjs?v=W20.28';
import {createPumpActionShotgun} from '../pump-action-shotgun.mjs?v=W20.29';
import {pumpCyclePose,pumpPelletDamage,PUMP_ACTION_TUNING} from '../pump-action-mechanics.mjs?v=W20.29';
import {createHuntingRifle} from '../hunting-rifle.mjs?v=W20.31';
import {createWornRevolver} from '../worn-revolver.mjs?v=W20.33';
import {createPipeSMG} from '../pipe-smg.mjs?v=W20.34';
import {createHeavySniper} from '../heavy-sniper.mjs?v=W20.44';
import {HEAVY_SNIPER_TUNING,heavySniperBoltCyclePose} from '../heavy-sniper-mechanics.mjs?v=W20.44';
import {huntingBoltCyclePose,HUNTING_RIFLE_TUNING} from '../hunting-rifle-mechanics.mjs?v=W20.30';
import {ensureLaserState,startLaserCrank,cancelLaserCrank,updateLaserCrank,laserCrankProgress,fireChargedLaser,LASER_MUSKET_TUNING} from '../laser-musket-mechanics.mjs?v=W20.27';
import {createLaserTrails} from '../laser-musket-trails.mjs?v=W20.26';
import {createPlayerAvatar} from '../player-avatar.mjs?v=W20.36';
import {createRemotePlayerVisual} from '../remote-avatar.mjs';
import { AI_TUNING, createEnemyBrain, stepEnemyBrain, alertEnemy, hearEnemyGunshot,
  resetEnemyBrain, hasSight, visibleTargetHeight, enemyAimPitch } from '../enemy-ai.mjs?v=W20.45';
import { ENEMY_PROFILES, makeEnemyTactics, resetEnemyTactics,
  markEnemyThreat,markEnemySuppressed,tickEnemyTactics, attemptEnemyShot,
  chooseEnemyWeapon,getEnemyWeapon,equipEnemyWeapon } from '../enemy-tactics.mjs?v=W20.45';
import {createSquadIntel,clearSquadIntel,reportSquadContact,
  stepSquadIntel,shareSquadContact,squadSeparation,
  occupiedSquadCover} from '../enemy-squad.mjs';
import {createSquadDirector,resetSquadDirector,planSquadOrders} from '../enemy-squad-director.mjs';
import { createPlayerHealth, hitPlayer, resetPlayerHealth, canEnemyFire,
  firstSolidHit, ENEMY_ATTACK } from '../player-combat.mjs';
import {calculateIncomingShot} from '../player-ballistics.mjs';
import { isArenaActive,shouldRaycastEnemy,combatRuntimeStatus } from '../arena-activation.mjs';
import {BACKPACK_LIMIT,RARITIES,getItem,createBackpack,addItem,removeItem,
  equipFromInventory,unequipWearable,useSupply,playerArmorReduction,createLootBag,
  takeFromBag,takeAllFromBag,generateEnemyLoot,safeBackpackSnapshot,
  totalInventoryValue,installWeaponOptic,installedWeaponOptic,countItem,
  INVENTORY_CATEGORIES,inventorySection,displayAmmoCount,ammoReserve} from '../inventory.mjs?v=W20.44';
import { ARMOR_SLOTS, ARMOR_SLOT_LABELS, ARMOR_ITEMS, getArmorPiece, createLoadout,
  createDummy, equipArmor, armorPointsForSlot, damageReductionForPoints,
  enemyArmorForRound,
  applyDamage, resetDummy } from '../combat.mjs';

import {SPECIAL_ATTRIBUTES,SPECIAL_PERKS,createSpecialState,safeSpecialSnapshot,
  allocateSpecialPoint,purchaseSpecialPerk,gainSpecialXP,specialBonuses,
  xpForNextLevel,discountedMaterials} from '../special.mjs';

const $ = id => document.getElementById(id);
// W20.19: Only the newly built 10mm sidearm is player-equipable.
// Legacy player guns stay disabled. Only the raider holds a test Pipe Rifle.
const WEAPON_REBUILD_MODE=true;
// TEMPORARY Station 8 test-lab convenience only. Remove this switch and its
// panel control before the finite-core survival economy ships beyond testing.
const TEMP_TEST_CORE_REFILL_ENABLED=true;
const NPC_GUN_TRIAL_ROLE='raider';
const NEW_WEAPON_ID=TEN_MM_PISTOL.id;
const REBUILT_WEAPON_IDS=Object.freeze([TEN_MM_PISTOL.id,PIPE_PISTOL.id,PIPE_RIFLE.id,LASER_MUSKET.id,DOUBLE_BARREL_SHOTGUN.id,PUMP_ACTION_SHOTGUN.id,BOLT_HUNTING_RIFLE.id,IRON_REVOLVER.id,PIPE_SMG.id,HEAVY_SNIPER.id]);
const playerGunEnabled=()=>REBUILT_WEAPON_IDS.includes(activeWeaponId);
if(WEAPON_REBUILD_MODE)document.body.classList.add('weapon-rebuild');
let campaignState=initialCampaignState();
try{
  const saved=JSON.parse(localStorage.getItem('rpg-lab-campaign-v1')||'null');
  if(saved)campaignState=safeCampaignSnapshot(saved);
}catch{}
let questPanelOpen=false,dialogueOpen=false;
let questFromField=false,dialogueFromField=false,activeDialogueNode=null;
function saveCampaign(){
  try{localStorage.setItem('rpg-lab-campaign-v1',JSON.stringify(campaignState));}catch{}
}

let specialState=createSpecialState();
try{
  const saved=JSON.parse(localStorage.getItem('rpg-lab-special-v1')||'null');
  if(saved)specialState=safeSpecialSnapshot(saved);
  else{
    // One-time migration from the old free-adjustment Endurance lab setting.
    const legacy=Number(localStorage.getItem('rpg-lab-endurance'));
    if(Number.isInteger(legacy)&&legacy>=1&&legacy<=10)
      specialState.attributes.endurance=legacy;
  }
}catch{}
let specialModifiers=specialBonuses(specialState);
let specialOpen=false,specialFromField=false;
function saveSpecialState(){
  try{localStorage.setItem('rpg-lab-special-v1',JSON.stringify(specialState));}catch{}
}
function updateSpecialBonuses(){
  specialModifiers=specialBonuses(specialState);
  saveSpecialState();
  refreshSpecialUI();
  if(typeof player!=='undefined')adjustEndurance(0);
}
function awardSpecialExperience(amount,source='combat'){
  const result=gainSpecialXP(specialState,amount,source);
  saveSpecialState();
  refreshSpecialUI();
  if(result.levels)showShotNotice('LEVEL '+result.level+' · +'+result.levels+
    ' PERK POINT'+(result.levels===1?'':'S')+' · OPEN SPECIAL WITH L');
  return result;
}
function refreshSpecialUI(){
  $('specialLevel').textContent='LEVEL '+specialState.level;
  $('fieldLevel').textContent='LVL '+specialState.level;
  $('specialXp').textContent=specialState.level>=50?'MAX LEVEL':
    specialState.xp+' / '+xpForNextLevel(specialState.level)+' XP';
  $('specialXpFill').style.width=(specialState.level>=50?100:
    100*specialState.xp/xpForNextLevel(specialState.level)).toFixed(1)+'%';
  $('specialStatPoints').textContent=specialState.statPoints;
  $('specialPerkPoints').textContent=specialState.perkPoints;
  const grid=$('specialGrid');grid.replaceChildren();
  for(const a of SPECIAL_ATTRIBUTES){
    const stat=specialState.attributes[a.id];
    const card=document.createElement('section');
    card.className='special-branch';
    card.style.setProperty('--stat-color',a.color);
    const header=document.createElement('header');header.className='special-branch-head';
    const letter=document.createElement('div');letter.className='special-letter';
    letter.textContent=a.letter;
    const identity=document.createElement('div');identity.className='special-identity';
    const name=document.createElement('h3');name.textContent=a.name;
    const value=document.createElement('p');value.textContent='ATTRIBUTE '+stat+' / 10';
    identity.append(name,value);
    const upgrade=document.createElement('button');upgrade.type='button';
    upgrade.className='special-upgrade';upgrade.textContent='+';
    upgrade.setAttribute('aria-label','Increase '+a.name);
    upgrade.disabled=specialState.statPoints===0||stat>=10;
    upgrade.addEventListener('click',()=>{
      const result=allocateSpecialPoint(specialState,a.id);
      if(result.ok){
        $('specialFeedback').textContent=a.name+' INCREASED TO '+result.value+
          ' · '+result.remaining+' ATTRIBUTE POINTS LEFT';
        updateSpecialBonuses();
      }
    });
    header.append(letter,identity,upgrade);card.append(header);
    const desc=document.createElement('p');desc.className='special-stat-desc';
    desc.textContent=a.description;card.append(desc);
    const track=document.createElement('div');track.className='special-stat-track';
    const fill=document.createElement('span');fill.style.width=(stat*10)+'%';
    track.append(fill);card.append(track);
    for(const p of SPECIAL_PERKS.filter(p=>p.stat===a.id)){
      const rank=specialState.perks[p.id]||0;
      const locked=stat<p.required;
      const maxed=rank>=p.maxRank;
      const node=document.createElement('button');node.type='button';
      node.className='special-perk'+(locked?' locked':'')+(rank?' unlocked':'');
      node.disabled=locked||maxed||specialState.perkPoints<=0;
      const title=document.createElement('strong');
      title.textContent=p.name.toUpperCase();
      const ranks=document.createElement('span');ranks.className='special-ranks';
      ranks.textContent=rank+' / '+p.maxRank;
      const label=document.createElement('small');
      label.textContent=p.description;
      const requirement=document.createElement('em');
      requirement.textContent=maxed?'MAXED':locked?'REQUIRES '+a.letter+' '+p.required:
        'REQUIRES '+a.letter+' '+p.required+' · 1 PERK POINT';
      node.append(title,ranks,label,requirement);
      node.addEventListener('click',()=>{
        const result=purchaseSpecialPerk(specialState,p.id);
        if(result.ok){
          $('specialFeedback').textContent=p.name.toUpperCase()+' RANK '+result.rank+
            ' UNLOCKED · '+result.remaining+' PERK POINTS LEFT';
          updateSpecialBonuses();
        }
      });
      card.append(node);
    }
    grid.append(card);
  }
}
function openSpecialPanel(){
  if(specialOpen||powerUIOpen||workbenchOpen||lootOpen||inventoryOpen)return;
  specialFromField=controls.isLocked;
  specialOpen=true;
  $('specialPanel').classList.remove('hidden');
  $('menu').classList.add('hidden');
  refreshSpecialUI();
  if(controls.isLocked)controls.unlock();
}
function closeSpecialPanel(){
  specialOpen=false;
  $('specialPanel').classList.add('hidden');
  if(specialFromField){
    specialFromField=false;controls.lock();
  }else $('menu').classList.remove('hidden');
}
$('specialOpen').addEventListener('click',openSpecialPanel);
$('specialClose').addEventListener('click',closeSpecialPanel);
refreshSpecialUI();
const canvas = $('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7b8788);
scene.fog = new THREE.FogExp2(0x8c8980, .0064);
const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, .08, 270);
// PointerLockControls uses YXZ yaw/pitch. Keep the camera's Euler in that
// same order: an XYZ pitch applied at non-zero yaw causes sideways tilt/roll.
camera.rotation.order = 'YXZ';
scene.add(camera); // the held weapon is a camera-relative 3D child
const controls = new PointerLockControls(camera, document.body);
const thirdPersonCamera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.08,270);
const thirdPersonRay=new THREE.Raycaster();
const viewHeading=new THREE.Vector3(),viewRight=new THREE.Vector3();
const viewFocus=new THREE.Vector3(),viewDesired=new THREE.Vector3();
// Prefer the standard WebGL 2 context so browsers may choose their own GPU
// or software-backed implementation. Retry with fewer framebuffer demands
// on systems where multisampling or the preferred adapter is unavailable.
let renderer;
let reducedRenderer=false;
try{
  renderer=new THREE.WebGLRenderer({
    canvas,antialias:true,powerPreference:'default',
    failIfMajorPerformanceCaveat:false
  });
}catch(primaryError){
  try{
    renderer=new THREE.WebGLRenderer({
      canvas,antialias:false,powerPreference:'low-power',
      failIfMajorPerformanceCaveat:false
    });
    reducedRenderer=true;
  }catch(fallbackError){
    throw new Error('WebGL 2 context unavailable in this browser (hardware or software). '
      +(fallbackError?.message||primaryError?.message||'Context creation failed'));
  }
}
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,reducedRenderer?1:1.6));
renderer.shadowMap.enabled = !reducedRenderer;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.13;
scene.add(new THREE.HemisphereLight(0xc1d0da,0x746454,1.92));
const sun = new THREE.DirectionalLight(0xffd3a4,2.8);
sun.position.set(-48,46,19);
sun.castShadow = true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left = -80;sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;sun.shadow.camera.bottom = -80;
sun.shadow.normalBias = .025;
scene.add(sun);
function mat(color,roughness=.9){return new THREE.MeshStandardMaterial({color,roughness});}
const concrete=mat(0x26353d), floorPaint=mat(0x516a74), pale=mat(0xe7c588), dark=mat(0x13242e), orange=mat(0xc1784f), blue=mat(0x468fa8), green=mat(0x6b9b77);
const worldGeometry=[];
const targetMeshes=[];
const impactEffects=createImpactEffects(scene,THREE);
const laserTrails=createLaserTrails(scene,THREE);
function box(x,y,z,w,h,d,material,receive=true){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  o.position.set(x,y,z);
  o.castShadow=true;o.receiveShadow=receive;scene.add(o);worldGeometry.push(o);return o;
}
// Hand-authored procedural cracked soil rather than a featureless lab slab.
// The low-resolution repeating canvas is GPU-light and works without assets.
const soilCanvas=document.createElement('canvas');
soilCanvas.width=256;soilCanvas.height=256;
const soil=soilCanvas.getContext('2d');
soil.fillStyle='#555149';soil.fillRect(0,0,256,256);
let soilSeed=0x4ae9d;
const soilRandom=()=>{soilSeed=(Math.imul(soilSeed,1664525)+1013904223)>>>0;
  return soilSeed/4294967296;};
const soilPalette=['#605b4f','#504f48','#6a5f4f','#444a47','#746753'];
for(let i=0;i<410;i++){
  const x=soilRandom()*256,y=soilRandom()*256;
  soil.fillStyle=soilPalette[Math.floor(soilRandom()*soilPalette.length)];
  soil.fillRect(x,y,2+soilRandom()*23,1+soilRandom()*10);
}
soil.strokeStyle='rgba(21,26,24,.38)';soil.lineWidth=1.2;
for(let i=0;i<18;i++){
  let x=soilRandom()*256,y=soilRandom()*256;
  soil.beginPath();soil.moveTo(x,y);
  for(let j=0;j<6;j++){
    x+=soilRandom()*17-8;y+=soilRandom()*14-4;soil.lineTo(x,y);
  }
  soil.stroke();
}
const soilTexture=new THREE.CanvasTexture(soilCanvas);
soilTexture.colorSpace=THREE.SRGBColorSpace;
soilTexture.wrapS=soilTexture.wrapT=THREE.RepeatWrapping;
soilTexture.repeat.set(27,23);
soilTexture.magFilter=THREE.NearestFilter;
const groundMaterial=new THREE.MeshStandardMaterial({map:soilTexture,
  color:0x9b998d,roughness:1,metalness:0});
const floor=box(0,-.35,0,124,.7,106,groundMaterial);
const grid = new THREE.GridHelper(124,62,0x465251,0x394647);
grid.position.y=.015;grid.visible=false;scene.add(grid);
const bounds=[];
function collider(x,z,w,d,material=dark,height=2.8){
  box(x,height/2,z,w,height,d,material);
  bounds.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,height});
}
collider(0,-53,124,1.7);collider(0,53,124,1.7);
collider(-62,0,1.7,106);collider(62,0,1.7,106);
for(let x=-58;x<60;x+=6){box(x,.05,-50,.15,.1,2,pale);box(x,.05,50,.15,.1,2,pale);}
const stations=[
  {title:'01 · Sprint lane',info:'Walk with W, then hold Shift. Read your actual speed, and test diagonal movement.',x:-51,z:-25,tag:'01 / SPEED',color:0xe7c588},
  {title:'02 · Jump hurdles',info:'Jump with Space to clear the low concrete barriers. Collision should stop you if you walk into one.',x:-45,z:0,tag:'02 / JUMP',color:0xc1784f},
  {title:'03 · Collision maze',info:'Press against walls and corners. Movement should slide along obstacles and never pass through them.',x:-47,z:26,tag:'03 / COLLISION',color:0x468fa8},
  {title:'04 · Ramp ascent',info:'Walk and sprint uphill, then back down. Watch the ground-height readout.',x:15,z:-27,tag:'04 / SLOPES',color:0x6b9b77},
  {title:'05 · Stairs and steps',info:'Walk up each short step and turn around. Check for snagging, jumping, or floating.',x:15,z:16,tag:'05 / STEPS',color:0xe7c588},
  {title:'06 · Low-clearance tunnel',info:'Press C to crouch, then walk under the roof. Try standing inside, and check whether you stand back up after leaving.',x:-52,z:42,tag:'06 / CROUCH',color:0x9ba5bf},
  {title:'07 · Weapon firing lane',info:'W02: aim, move and crouch to compare accuracy; fire to watch brass eject; R reloads the animated magazine and slide. F restocks. Targets and material sounds remain.',x:-52,z:-42,tag:'07 / WEAPONS',color:0xd39e63},
  {title:'08 · Rear-entry power-armor frame',info:'The power frame has mechanical limbs and six equipment mounts. Tap E to configure it; walk behind the frame and hold E to enter. Hold E to exit. The purple cache nearby has starter parts and fusion cores.',x:-46,z:-12,tag:'08 / ARMOR',color:0xe2b078},
  {title:'09 · Live enemy arena',info:'W20.39: Three raiders patrol, flank, retreat to solid cover and peek. Shoot or approach to provoke reactions. Weapons stay disabled during model testing. H heals, J resets bots, K freezes AI.',x:30,z:42,tag:'09 / AI TEST',color:0xe77d68}
];
function markLane(z,accent){
  box(0,.03,z-6,110,.06,.12,accent);box(0,.03,z+6,110,.06,.12,accent);
}
function textSign(label,x,z,color){
  const c=document.createElement('canvas');c.width=512;c.height=160;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#13232c';ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillRect(0,0,12,160);
  ctx.fillStyle='#e8f0e8';ctx.font='bold 45px Arial';ctx.fillText(label,34,94);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(8,2.5),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));
  mesh.position.set(x,3,z);scene.add(mesh);
  box(x,1.4,z,.1,2.8,.1,dark);
}
for(const s of stations)textSign(s.tag,s.x+5,s.z-8,s.color);
// Beyond the solid perimeter: original shacks, wrecks, aerials, water towers,
// skyline, patinated ground, flags and atmospheric dust.
const wastelandArt=buildWastelandSet(scene,THREE,{highQuality:!reducedRenderer});

// W18.0 story contacts: physical, discoverable terminals and faction beacons.
// They're prototypes for future settlement NPCs, not invisible quest buttons.
const campaignMarkers=[];
const campaignResidents=[];
const questPostGeometry=new THREE.CylinderGeometry(.035,.035,1.8,8);
for(const node of CAMPAIGN_NODES){
  const shell=new THREE.MeshStandardMaterial({color:0x33454b,metalness:.62,roughness:.76});
  const light=new THREE.MeshStandardMaterial({color:node.color,emissive:node.color,
    emissiveIntensity:.48,metalness:.30,roughness:.40});
  const steel=new THREE.MeshStandardMaterial({color:0x58615a,metalness:.7,roughness:.62});
  const copper=new THREE.MeshStandardMaterial({color:0x9d7254,metalness:.75,roughness:.52});
  // World-mounted instruments, not billboard NPC names floating through walls.
  box(node.x,.50,node.z,.92,1.0,.70,shell);
  box(node.x,1.04,node.z,.94,.12,.74,light);
  box(node.x,1.22,node.z,.52,.25,.18,light);
  box(node.x,1.24,node.z-.39,.71,.06,.055,copper);
  for(const side of [-1,1]){
    box(node.x+side*.39,.73,node.z-.38,.045,.70,.035,steel);
    box(node.x+side*.33,.47,node.z-.39,.055,.08,.042,copper);
  }
  if(node.id==='relay'||node.id==='courier'){
    const mast=new THREE.Mesh(questPostGeometry,steel);
    mast.position.set(node.x,2.14,node.z+.27);scene.add(mast);
    box(node.x,2.98,node.z+.27,.46,.11,.11,steel);
    const dish=new THREE.Mesh(new THREE.TorusGeometry(.26,.045,6,12),copper);
    dish.position.set(node.x,2.68,node.z+.29);dish.rotation.x=.32;
    scene.add(dish);
  }
  if(node.id==='pump'||node.id==='water'){
    for(const side of [-1,1]){
      const tube=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,1.23,10),copper);
      tube.position.set(node.x+side*.55,.62,node.z+.12);scene.add(tube);
    }
    box(node.x,.80,node.z-.46,.52,.38,.10,steel);
  }
  if(node.id==='generator'){
    // Open coils, copper feed pipes and ventilated engine casing read as a
    // machine that can actually be surveyed and repaired in the quest.
    box(node.x,1.67,node.z,.98,.48,1.10,shell);
    for(let i=0;i<5;i++){
      box(node.x-.38+i*.19,1.99,node.z,.085,.20,1.05,steel);
      box(node.x-.38+i*.19,1.69,node.z-.58,.055,.31,.055,copper);
    }
    const motor=new THREE.Mesh(new THREE.CylinderGeometry(.31,.31,.96,12),steel);
    motor.rotation.z=Math.PI/2;motor.position.set(node.x,1.64,node.z+.75);scene.add(motor);
  }
  campaignMarkers.push({id:node.id,indicator:light});
  bounds.push({minX:node.x-.46,maxX:node.x+.46,
    minZ:node.z-.38,maxZ:node.z+.38,top:1.22});
  if(['dispatch','dominion','foreman'].includes(node.id)){
    // These contacts are real jointed survivor models with idle breathing;
    // their bodies stay cosmetic and do not alter damage or combat targeting.
    const avatar=createPlayerAvatar(scene,{
      variant:node.id==='dominion'?'enforcer':'survivor',heldWeaponEnabled:false});
    avatar.root.name='QuestResident_'+node.id;
    const x=node.x+1.54,z=node.z+1.25;
    campaignResidents.push({avatar,x,z,yaw:.8});
    bounds.push({minX:x-.28,maxX:x+.28,minZ:z-.28,maxZ:z+.28,top:1.85});
  }
}
const havenPowerLamp=new THREE.PointLight(0xffdb91,0,9,2);
havenPowerLamp.position.set(-25,2.7,-16);scene.add(havenPowerLamp);
const havenStreetLamp=new THREE.PointLight(0xffce8d,0,8,2);
havenStreetLamp.position.set(-38,3.1,-18);scene.add(havenStreetLamp);
const liveCable=new THREE.MeshStandardMaterial({color:0x493c34,metalness:.3,
  roughness:.86,emissive:0xf8b25f,emissiveIntensity:0});
const powerPath=new THREE.CatmullRomCurve3([
  new THREE.Vector3(-25,2.25,-16),new THREE.Vector3(-30,3.4,-16.2),
  new THREE.Vector3(-34,3.25,-17.0),new THREE.Vector3(-38,2.8,-18)]);
const powerCable=new THREE.Mesh(new THREE.TubeGeometry(powerPath,24,.038,6,false),liveCable);
scene.add(powerCable);
markLane(-25,pale);
for(let x=-47;x<55;x+=5){
  box(x,.065,-25,.14,.13,4,floorPaint);
  if((x+47)%20===0)box(x,.07,-25,.35,.14,9,pale);
}
box(0,.085,-25,112,.04,.06,pale);
// Solid optics bench next to Station 7, reachable with E.
const opticBench={x:-55,z:-43};
box(opticBench.x,.47,opticBench.z,2,.94,.82,dark);
box(opticBench.x,.99,opticBench.z,2.2,.12,1.04,mat(0x886e54,.65));
textSign('OPTICS BENCH · E',-61,-39,0xe4c38b);
markLane(0,orange);
for(let i=0;i<5;i++){
  const x=-31+i*13,h=.65+(i%3)*.11;
  box(x,h/2,0,1.6,h,7,orange);
  bounds.push({minX:x-.8,maxX:x+.8,minZ:-3.5,maxZ:3.5,top:h});
}
markLane(26,blue);
const maze=[
  [-25,19,2,9],[-18,32,2,9],[-9,21,2,8],
  [0,32,2,9],[11,21,2,8],[-15,25,8,1.5],
  [-1,27,8,1.5],[20,31,2,10]
];
for(const a of maze)collider(a[0],a[1],a[2],a[3],blue,2.5);
// Dedicated crouch station: a real low ceiling that blocks upright bodies.
const ceilings=[{minX:-43,maxX:-12,minZ:36,maxZ:46,bottom:1.32}];
box(-27.5,1.48,41,31,.32,10,blue); // roof underside at 1.32 metres
collider(-27.5,41-4.95,31,.3,dark,1.3);
collider(-27.5,41+4.95,31,.3,dark,1.3);
for(const x of [-42.7,-12.3]){
  box(x,.72,36.2,.35,1.44,.35,pale);
  box(x,.72,45.8,.35,1.44,.35,pale);
}

// West-to-east ramp: level ground to a raised platform, then a descending run.
const rampStart=22,rampEnd=43,rampTop=2.3;
function rampHeight(x,z){
  if(z<-34||z>-18||x<rampStart||x>56)return 0;
  if(x<=rampEnd)return (x-rampStart)/(rampEnd-rampStart)*rampTop;
  if(x<=49)return rampTop;
  return Math.max(0,rampTop*(56-x)/7);
}
function rampSurface(x0,x1,z0,z1){
  const h0=rampHeight(x0,(z0+z1)/2),h1=rampHeight(x1,(z0+z1)/2);
  const verts=new Float32Array([x0,h0,z0,x1,h1,z0,x1,h1,z1,x0,h0,z0,x1,h1,z1,x0,h0,z1]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(verts,3));g.computeVertexNormals();
  const surface=green.clone();surface.side=THREE.DoubleSide;const m=new THREE.Mesh(g,surface);m.receiveShadow=true;scene.add(m);
}
rampSurface(22,43,-34,-18);rampSurface(43,49,-34,-18);rampSurface(49,56,-34,-18);
box(39,.045,-18,34,.09,.2,pale);box(39,.045,-34,34,.09,.2,pale);
// Stair height uses the same piecewise rise as the visible mesh.
const stairStart=22,stairWidth=2.8,stairCount=8,stairRise=.25;
function stairsHeight(x,z){
  if(z<9||z>23||x<stairStart||x>stairStart+stairWidth*stairCount+7)return 0;
  if(x<stairStart+stairWidth*stairCount){
    return Math.min(stairCount,Math.floor((x-stairStart)/stairWidth)+1)*stairRise;
  }
  return 2;
}
for(let n=0;n<stairCount;n++){
  const x=stairStart+n*stairWidth+stairWidth/2;
  const top=(n+1)*stairRise;
  box(x,top/2,16,stairWidth,top,13,floorPaint);
  box(stairStart+n*stairWidth+.025,top+.014,16,.05,.025,12,pale);
}
box(22+stairWidth*stairCount+3,1,16,6,2,13,floorPaint);

// Weapons test lane: five original targets spaced across a clear firing lane.
// All meshes are real raycastable geometry, not screen-space hitboxes.
const targetData=new Map();
const sound=new WeaponAudio();
function soundCaption(){
  $('soundToggle').textContent=sound.enabled?'SOUND: ON · N TO MUTE':'SOUND: MUTED · N TO UNMUTE';
  $('soundToggle').setAttribute('aria-pressed',String(sound.enabled));
}
function toggleSound(){
  sound.setEnabled(!sound.enabled);
  soundCaption();
}
$('soundToggle').addEventListener('click',toggleSound);
soundCaption();

// Small, persistent raycast decals. Decal meshes are NOT included in the
// raycast array, so consecutive shots can still hit the surface beneath them.
const impactMarks=[];
const IMPACT_MARK_LIMIT=140;
const impactGeometry=new THREE.PlaneGeometry(1,1);
const impactNormalMatrix=new THREE.Matrix3();
const impactWorldNormal=new THREE.Vector3();
const decalFacing=new THREE.Vector3(0,0,1);
function impactTexture(paperSurface){
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  const cx=64,cy=64;
  const ring=ctx.createRadialGradient(cx,cy,5,cx,cy,57);
  ring.addColorStop(0,paperSurface?'rgba(28,25,23,1)':'rgba(10,13,13,1)');
  ring.addColorStop(.20,'rgba(18,20,21,1)');
  ring.addColorStop(.32,paperSurface?'rgba(93,73,53,.95)':'rgba(58,54,48,.95)');
  ring.addColorStop(.57,paperSurface?'rgba(156,126,89,.55)':'rgba(51,51,50,.50)');
  ring.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=ring;
  ctx.beginPath();ctx.arc(cx,cy,57,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=paperSurface?'rgba(70,49,33,.6)':'rgba(20,19,18,.8)';
  ctx.lineWidth=2.5;
  for(let k=0;k<12;k++){
    const angle=k*Math.PI*2/12;
    const inner=16+(k%3)*3;
    const outer=24+(k%4)*4;
    ctx.beginPath();
    ctx.moveTo(cx+Math.cos(angle)*inner,cy+Math.sin(angle)*inner);
    ctx.lineTo(cx+Math.cos(angle+.06)*outer,cy+Math.sin(angle+.06)*outer);
    ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
const impactMaterials={
  paper:new THREE.MeshBasicMaterial({
    map:impactTexture(true),transparent:true,alphaTest:.035,
    depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2
  }),
  solid:new THREE.MeshBasicMaterial({
    map:impactTexture(false),transparent:true,alphaTest:.035,
    depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2
  })
};
function markBulletHole(hit,isPaper,followSurface=false){
  if(!hit.face)return;
  hit.object.updateWorldMatrix(true,false);
  impactNormalMatrix.getNormalMatrix(hit.object.matrixWorld);
  impactWorldNormal.copy(hit.face.normal).applyMatrix3(impactNormalMatrix).normalize();
  if(impactWorldNormal.dot(shotVector)>0)impactWorldNormal.negate();
  const mesh=new THREE.Mesh(impactGeometry,isPaper?impactMaterials.paper:impactMaterials.solid);
  const size=isPaper?.22:.16;
  mesh.scale.set(size,size,1);
  mesh.position.copy(hit.point).addScaledVector(impactWorldNormal,.022);
  mesh.quaternion.setFromUnitVectors(decalFacing,impactWorldNormal);
  mesh.renderOrder=2;
  if(followSurface){
    const worldRotation=hit.object.getWorldQuaternion(new THREE.Quaternion());
    hit.object.worldToLocal(mesh.position);
    mesh.quaternion.premultiply(worldRotation.invert());
    hit.object.add(mesh);
  } else scene.add(mesh);
  impactMarks.push(mesh);
  if(impactMarks.length>IMPACT_MARK_LIMIT){
    const oldest=impactMarks.shift();
    oldest.parent?.remove(oldest);
  }
}
function clearBulletHoles(){
  for(const mesh of impactMarks)mesh.parent?.remove(mesh);
  impactMarks.length=0;
}

const paper=mat(0xe9e2c8), black=mat(0x202c2e), bull=mat(0xd85e51);
function makeTarget(id,x,z){
  const support=box(x,.82,z,.16,1.65,.19,dark);
  support.userData.impactMaterial='metal';
  const stand=box(x,.07,z,1.1,.14,.8,floorPaint);
  stand.userData.impactMaterial='concrete';
  const group=new THREE.Group();
  group.position.set(x,1.82,z);
  group.rotation.y=-Math.PI/2; // face the player looking along +X
  scene.add(group);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.35),paper.clone());
  back.material.side=THREE.DoubleSide;
  back.userData.targetId=id;
  back.userData.impactMaterial='paper';
  back.material.emissive=new THREE.Color(0x000000);
  group.add(back);
  targetMeshes.push(back);
  const disk=(radius,color,zdepth)=>{
    const mesh=new THREE.Mesh(new THREE.CircleGeometry(radius,32),color.clone());
    mesh.position.z=zdepth;mesh.userData.targetId=id;
    mesh.userData.impactMaterial='paper';
    mesh.material.side=THREE.DoubleSide;group.add(mesh);targetMeshes.push(mesh);
  };
  disk(.68,black,.015);disk(.43,paper,.025);disk(.18,bull,.036);
  targetData.set(id,{back,hits:0});
}
const targetPositions=[[-27,-42],[-12,-39],[4,-44],[20,-40],[36,-46]];
targetPositions.forEach(([x,z],i)=>makeTarget(i+1,x,z));

// Three distinct material samples along the edge of station 7. All three
// have collider geometry and explicit impact tags, so the player can compare
// sounds without having to guess what a random scenery prop is made from.
const materialSamples=[
  {name:'WOOD',x:-25,material:mat(0x866447),impact:'wood'},
  {name:'METAL',x:-8,material:mat(0x6b7e8b,.38),impact:'metal'},
  {name:'CONCRETE',x:9,material:concrete,impact:'concrete'}
];
for(const sample of materialSamples){
  const z=-48.2;
  const plate=box(sample.x,1.33,z,2.65,2.5,.42,sample.material);
  plate.userData.impactMaterial=sample.impact;
  bounds.push({minX:sample.x-1.325,maxX:sample.x+1.325,minZ:z-.21,maxZ:z+.21});
  const c=document.createElement('canvas');c.width=512;c.height=128;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#101d23';ctx.fillRect(0,0,512,128);
  ctx.font='bold 52px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#e8d5ad';ctx.fillText(sample.name,256,68);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
  const label=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.6),
    new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  label.position.set(sample.x,2.89,z+.29);
  scene.add(label);
}


// W03.1 modular armor lab. Six independently raycastable and equipable slots.
const dummies=new Map(),dummyHitMeshes=[],damagePopups=[];
const dummyKinds=[
  {id:'none',label:'UNARMORED',x:-28,z:-8.7,body:0x7e6e55},
  {id:'light',label:'FIELD KIT',x:-9,z:-15.2,body:0x6b795b},
  {id:'heavy',label:'CITADEL',x:12,z:-9,body:0x495a69}
];
const popupsMax=16;
function makeDummyLabel(dummy){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false});
  const sprite=new THREE.Sprite(material);
  sprite.position.set(dummy.position.x,2.96,dummy.position.z);
  sprite.scale.set(3.2,1.02,1);
  scene.add(sprite);
  return {canvas,ctx,texture,sprite};
}
function updateDummyLabel(dummy){
  const {ctx,canvas,texture}=dummy.labelVisual,s=dummy.state;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(9,23,28,.91)';ctx.fillRect(4,4,504,151);
  ctx.strokeStyle=s.alive?'#bfcdba':'#d25f53';ctx.lineWidth=5;ctx.strokeRect(4,4,504,151);
  ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.font='bold 29px system-ui';ctx.fillStyle='#f1d9ac';
  ctx.fillText(dummy.title,22,33);
  ctx.font='bold 25px system-ui';ctx.fillStyle=s.alive?'#e9f6df':'#e98d7a';
  ctx.fillText(s.alive?Math.ceil(s.health)+' / '+s.maxHealth+' HP':'DOWN · Y RESET',22,73);
  ctx.fillStyle='#273b39';ctx.fillRect(21,95,470,17);
  ctx.fillStyle=s.health>40?'#93c89c':'#cb7567';
  ctx.fillRect(21,95,470*s.health/s.maxHealth,17);
  const rating=ARMOR_SLOTS.reduce((sum,slot)=>sum+armorPointsForSlot(s,slot),0);
  ctx.font='bold 21px system-ui';ctx.fillStyle='#cbd3df';
  ctx.fillText('EQUIPPED RATING: '+rating+' AP · NO WEAR',22,136);
  texture.needsUpdate=true;
}
function makeDummy(entry){
  const group=new THREE.Group();
  group.position.set(entry.x,0,entry.z);
  group.rotation.y=-Math.PI/2;
  scene.add(group);
  const dummy={id:entry.id,title:entry.label,state:createDummy(entry.id),group,
    position:{x:entry.x,z:entry.z},pieces:[],armorMeshes:[],
    flash:0,impulse:0};
  const wooden=new THREE.MeshStandardMaterial({color:entry.body,roughness:.85});
  const darkJoint=new THREE.MeshStandardMaterial({color:0x343c3d,roughness:.94});
  function part(geometry,material,x,y,z,slot,armor=false){
    const mesh=new THREE.Mesh(geometry,material.clone());
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.userData={dummyId:dummy.id,hitZone:slot,
      impactMaterial:armor?'metal':'wood'};
    group.add(mesh);
    dummy.pieces.push(mesh);dummyHitMeshes.push(mesh);
    if(armor)dummy.armorMeshes.push(mesh);
    return mesh;
  }
  dummy.part=part;
  part(new THREE.BoxGeometry(.64,.80,.32),wooden,0,1.34,0,'chest');
  part(new THREE.BoxGeometry(.12,.16,.15),darkJoint,0,1.83,0,'chest');
  part(new THREE.SphereGeometry(.217,16,12),wooden,0,2.07,0,'head');
  for(const [side,sideName] of [[-1,'left'],[1,'right']]){
    part(new THREE.BoxGeometry(.19,.73,.22),wooden,side*.49,1.39,0,sideName+'Arm');
    part(new THREE.CylinderGeometry(.12,.14,1.01,10),wooden,side*.20,.52,0,sideName+'Leg');
  }
  const base=box(entry.x,.07,entry.z,1.55,.14,1.25,dark);
  base.userData.impactMaterial='metal';
  bounds.push({minX:entry.x-.39,maxX:entry.x+.39,minZ:entry.z-.39,maxZ:entry.z+.39});
  dummy.labelVisual=makeDummyLabel(dummy);
  dummies.set(dummy.id,dummy);
  rebuildDummyArmor(dummy);
  updateDummyLabel(dummy);
  return dummy;
}
function rebuildDummyArmor(dummy){
  for(const mesh of dummy.armorMeshes){
    mesh.parent?.remove(mesh);
    const partIndex=dummy.pieces.indexOf(mesh);
    if(partIndex!==-1)dummy.pieces.splice(partIndex,1);
    const hitIndex=dummyHitMeshes.indexOf(mesh);
    if(hitIndex!==-1)dummyHitMeshes.splice(hitIndex,1);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  dummy.armorMeshes.length=0;
  for(const slot of ARMOR_SLOTS){
    const item=getArmorPiece(slot,dummy.state.loadout[slot]);
    if(item.points===0)continue;
    const p=item.points/110;
    const metallic=['plate','shell','mesh'].includes(item.style);
    const base=new THREE.MeshStandardMaterial({color:item.color,
      metalness:metallic?.73:.18,roughness:metallic?.53:.87});
    const dark=new THREE.MeshStandardMaterial({color:0x232e34,
      metalness:.35,roughness:.76});
    const side=slot.startsWith('left')?-1:1;
    if(slot==='chest'){
      dummy.part(new THREE.BoxGeometry(.70+p*.12,.69+p*.13,.35+p*.13),
        base,0,1.37,.07,'chest',true);
      // Higher-tier chest pieces have an extra central reinforcement plate.
      if(p>.3)dummy.part(new THREE.BoxGeometry(.23,.49,.06),
        dark,0,1.40,.30+p*.065,'chest',true);
      if(p>.55)for(const s of [-1,1])dummy.part(new THREE.BoxGeometry(.18,.21,.10),
        base,s*.22,1.64,.23,'chest',true);
    }else if(slot==='head'){
      dummy.part(new THREE.SphereGeometry(.225+p*.06,14,10,0,Math.PI*2,
        0,Math.PI*.67),base,0,2.10,0,'head',true);
      if(p>.28)dummy.part(new THREE.BoxGeometry(.35,.11,.15),
        dark,0,2.10,.21+p*.02,'head',true);
      if(p>.6)dummy.part(new THREE.BoxGeometry(.28,.07,.12),
        base,0,2.27,.07,'head',true);
    }else if(slot.endsWith('Arm')){
      dummy.part(new THREE.BoxGeometry(.22+p*.13,.57+p*.10,.27+p*.12),
        base,side*.49,1.39,.04,slot,true);
      if(p>.43)dummy.part(new THREE.BoxGeometry(.24+p*.10,.16,.30),
        dark,side*.49,1.69,.08,slot,true);
    }else{
      dummy.part(new THREE.CylinderGeometry(.135+p*.042,.145+p*.06,
        .81+p*.1,10),base,side*.20,.52,.02,slot,true);
      if(p>.36)dummy.part(new THREE.BoxGeometry(.25,.18,.26+p*.11),
        dark,side*.20,.83,.06,slot,true);
    }
  }
  updateDummyLabel(dummy);
}
dummyKinds.forEach(makeDummy);

// W12.0: connected skeletal, rear-entry chassis at Station 8, independent of
// normal player armor and of the static test-dummy equipment.
const powerArmorBay={x:-49,z:-12};
let powerArmorState=createPowerArmorState();
try{
  const raw=JSON.parse(localStorage.getItem('rpg-lab-powered-chassis')||'null');
  if(raw)powerArmorState=safePowerArmorSnapshot(raw);
}catch{}
const poweredSuit=buildPowerArmorVisual(scene,powerArmorBay,powerArmorState);
// Power-armor transitions now show the SAME original survivor as third person.
// No photorealistic Raider GLB is mounted for the player anymore.
const pilotAvatar=createPlayerAvatar(poweredSuit.pilot,{heldWeaponEnabled:false});
poweredSuit.useOriginalPilot();
textSign('POWER FRAME · TAP E TO CONFIGURE',-55,-6,0x8fbba4);
textSign('REAR HATCH · HOLD E TO ENTER',-43,-6,0x8fbba4);
textSign('SALVAGE CACHE · E TO SEARCH',-54,-8,0xd7b4ee);
const poweredCockpit=buildPowerArmorCockpit(camera);
poweredSuit.root.visible=!powerArmorState.occupied;
poweredCockpit.visible=powerArmorState.occupied;
let poweredArmorTime=0,powerUIOpen=false,powerUIFromField=false,lastFusionSave=0;
const POWER_HOLD_MS=650;
let powerHoldTimer=null,powerHoldPending=false,powerHoldTriggered=false,powerHoldStartedAt=0;
function cancelPowerHold(){
  if(powerHoldTimer!==null)clearTimeout(powerHoldTimer);
  powerHoldTimer=null;powerHoldPending=false;powerHoldTriggered=false;powerHoldStartedAt=0;
}
function beginPowerHold(){
  if(powerHoldPending||powerArmorState.phase!=='idle')return;
  powerHoldPending=true;powerHoldTriggered=false;powerHoldStartedAt=performance.now();
  powerHoldTimer=setTimeout(()=>{
    powerHoldTimer=null;
    if(!powerHoldPending||!controls.isLocked||powerUIOpen||
       powerArmorState.phase!=='idle'||
       (!powerArmorState.occupied&&!nearPoweredSuit()))return;
    powerHoldPending=false;powerHoldTriggered=true;
    togglePoweredSuit();
  },POWER_HOLD_MS);
}
function finishPowerHold(){
  if(!powerHoldPending&&!powerHoldTriggered)return false;
  const tap=powerHoldPending&&!powerHoldTriggered;
  if(powerHoldTimer!==null)clearTimeout(powerHoldTimer);
  powerHoldTimer=null;powerHoldPending=false;powerHoldTriggered=false;
  if(tap&&controls.isLocked&&powerArmorState.phase==='idle'){
    // Short press = contextual pickup/search even while wearing armor.
    // Long press = enter/exit. Never lose the long-press exit gesture.
    const bag=nearestLootBag();
    if(bag){beginLootOverlay(bag.id);return true;}
    if(benchWithinReach()){beginWorkbench();return true;}
    if(powerArmorState.occupied)showShotNotice('HOLD E TO EXIT THE FRAME');
    else if(nearPoweredSuit())openPowerArmorBay();
  }
  return true;
}
let powerCinematic=null;
let powerCinematicFadeLeft=0;
const powerCameraUp=new THREE.Vector3(0,1,0);
function powerEase(a,b,value){
  const v=Math.min(1,Math.max(0,(value-a)/(b-a)));
  return v*v*(3-2*v);
}
// See the human-scale pilot climb inside from a cinematic third-person camera.
// Restore the normal first-person camera only after the hatch latches.
function updatePowerCinematic(progress){
  if(!powerCinematic)return;
  const p=Math.min(1,Math.max(0,progress));
  // View the actual survivor outside the suit during the whole climb.
  // DO NOT translate the camera through the back plate. The final POV
  // changes only once, while the screen is dark after the hatch latches.
  poweredSuit.root.updateMatrixWorld(true);
  const exterior=poweredSuit.root.localToWorld(
    new THREE.Vector3(1.55,1.95,-3.70));
  const focus=poweredSuit.pilot.getWorldPosition(new THREE.Vector3())
    .add(new THREE.Vector3(0,.86,0));
  camera.position.copy(exterior);
  camera.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().lookAt(exterior,focus,powerCameraUp));
  $('powerTransitionFade').style.opacity=
    String(powerEase(.91,1,p));
}
function savePowerArmor(){
  try{localStorage.setItem('rpg-lab-powered-chassis',JSON.stringify(powerArmorState));}catch{}
}
function nearPoweredSuit(){
  return Math.hypot(player.x-poweredSuit.root.position.x,
    player.z-poweredSuit.root.position.z)<3.8;
}
function nearRearHatch(){
  // A radius check alone also accepted players standing in FRONT of the
  // suit. Entry is legal only in the clear rear lane behind its hatch.
  const local=poweredSuit.root.worldToLocal(
    new THREE.Vector3(player.x,0,player.z));
  return Math.abs(local.x)<1.55&&local.z<=-1.30&&local.z>=-3.55;
}
// W20.13 · The power-armor overlay uses functional analog gauges instead
// of boxed screen widgets. Geometry is generated once, values update in place.
const VISOR_SVG_NS='http://www.w3.org/2000/svg';
const visorNeedles=new Map();
const visorCompassMarks=[];
const visorDialPoint=(angle,radius)=>{
  const rad=angle*Math.PI/180;
  return {x:100+Math.cos(rad)*radius,y:100+Math.sin(rad)*radius};
};
function buildVisorDial(key,id,{tickCount=20,majorEvery=2,maxValue=100,labelSize=12}={}){
  const svg=$(id);
  const start=150,end=390;
  const node=(tag,attributes)=>{
    const element=document.createElementNS(VISOR_SVG_NS,tag);
    for(const [name,value] of Object.entries(attributes))
      element.setAttribute(name,String(value));
    return element;
  };
  const first=visorDialPoint(start,94),last=visorDialPoint(end,94);
  svg.appendChild(node('path',{class:'gauge-arc',
    d:'M '+first.x+' '+first.y+' A 94 94 0 1 1 '+last.x+' '+last.y}));
  for(let i=0;i<=tickCount;i++){
    const angle=start+(end-start)*i/tickCount;
    const major=i%majorEvery===0;
    const inside=visorDialPoint(angle,major?76:84);
    const outside=visorDialPoint(angle,94);
    svg.appendChild(node('line',{class:'gauge-tick',x1:inside.x,
      y1:inside.y,x2:outside.x,y2:outside.y,
      'stroke-width':major?2.5:1.3}));
    if(major){
      const where=visorDialPoint(angle,61);
      const number=node('text',{class:'gauge-number',x:where.x,
        y:where.y+labelSize*.35,'text-anchor':'middle','font-size':labelSize});
      number.textContent=Math.round(i*maxValue/tickCount);
      svg.appendChild(number);
    }
  }
  const needle=node('line',{class:'gauge-needle',x1:100,y1:100,x2:100,y2:100});
  svg.appendChild(needle);
  svg.appendChild(node('circle',{class:'gauge-hub',cx:100,cy:100,r:3.8}));
  visorNeedles.set(key,{needle,start,end});
}
function setVisorDial(key,percent){
  const gauge=visorNeedles.get(key);
  if(!gauge)return;
  const value=Math.max(0,Math.min(100,Number.isFinite(percent)?percent:0));
  const end=visorDialPoint(gauge.start+(gauge.end-gauge.start)*value/100,78);
  gauge.needle.setAttribute('x2',end.x.toFixed(2));
  gauge.needle.setAttribute('y2',end.y.toFixed(2));
}
function buildVisorCompass(){
  const names=['N','NE','E','SE','S','SW','W','NW'];
  const target=$('visorCompassTicks');
  for(let i=0;i<24;i++){
    const major=i%3===0;
    const element=document.createElement('span');
    element.className='compass-tick'+(major?' major':'');
    element.textContent=major?names[i/3]:'';
    target.appendChild(element);
    visorCompassMarks.push({bearing:i*15,element});
  }
}
function updateVisorCompass(heading){
  for(const mark of visorCompassMarks){
    const delta=((mark.bearing-heading+540)%360)-180;
    const visible=Math.abs(delta)<=75;
    mark.element.style.display=visible?'block':'none';
    if(visible)mark.element.style.left=(50+delta*.6).toFixed(2)+'%';
  }
}
function updateVisorObjectiveMarker(heading){
  const marker=$('visorCompassWaypoint');
  const quest=CAMPAIGN_QUESTS[campaignState.tracked];
  const stage=quest?.stages[campaignState.quests[campaignState.tracked]?.stage];
  const target=stage?.node==='arena'?{x:45,z:40}:
    CAMPAIGN_NODES.find(node=>node.id===stage?.node);
  if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z)){
    marker.style.display='none';return;
  }
  const towards=((Math.atan2(target.x-player.x,-(target.z-player.z))*
    180/Math.PI)+360)%360;
  const delta=((towards-heading+540)%360)-180;
  marker.style.display=Math.abs(delta)<=75?'block':'none';
  if(Math.abs(delta)<=75)marker.style.left=(50+delta*.6).toFixed(2)+'%';
}
buildVisorDial('hp','visorHpGauge',{tickCount:20,majorEvery:2,labelSize:12});
buildVisorDial('rads','visorRadsGauge',{tickCount:10,majorEvery:2,maxValue:10,labelSize:15});
buildVisorDial('core','visorCoreGauge',{tickCount:10,majorEvery:5,labelSize:16});
buildVisorDial('ap','visorApGauge',{tickCount:20,majorEvery:4,labelSize:12});
buildVisorCompass();
setVisorDial('rads',0); // Radiation gameplay is not implemented yet.
setVisorDial('hp',100);
setVisorDial('ap',100);
updateVisorCompass(0);

function refreshPowerArmorHUD(){
  // The obsolete plate-count widget is gone. Only core status appears while
  // WEARING the frame; six-slot condition lives in the E service interface.
  const visorActive=powerArmorState.occupied&&powerArmorState.phase==='idle';
  const cinematic=powerArmorState.phase!=='idle';
  $('powerArmorHud').classList.toggle('hidden',!visorActive);
  $('fieldHud').classList.toggle('hidden',visorActive||cinematic);
  $('powerVisorHud').classList.toggle('hidden',!visorActive);
  document.body.classList.toggle('in-power-armor',visorActive);
  document.body.classList.toggle('power-transition',cinematic);
  const status=$('powerArmorStatus');
  const powered=hasFusionPower(powerArmorState);
  const charge=Math.max(0,Number(powerArmorState.coreCharge)||0);
  $('visorCoreNumber').textContent=powerArmorState.coreCharge===null?
    '--':String(Math.ceil(charge)).padStart(2,'0');
  $('visorCoreFill').style.width=charge+'%';
  setVisorDial('core',charge);
  $('powerVisorHud').classList.toggle('low-core',charge<=15);
  const indicatorDescriptions=[];
  for(const slot of POWER_ARMOR_SLOTS){
    const part=powerArmorIndicatorStatus(powerArmorState,slot);
    const shape=$('visorArmor-'+slot);
    const visualClass='armor-segment '+part.status;
    if(shape.getAttribute('class')!==visualClass)
      shape.setAttribute('class',visualClass);
    indicatorDescriptions.push(ARMOR_SLOT_LABELS[slot]+' '+
      (part.status==='empty'?'dark':part.percentage+'%'));
  }
  const indicatorLabel='Power armor condition: '+indicatorDescriptions.join(', ');
  if($('visorArmorIndicator').getAttribute('aria-label')!==indicatorLabel)
    $('visorArmorIndicator').setAttribute('aria-label',indicatorLabel);
  const conditions=POWER_ARMOR_SLOTS.map(slot=>plateCondition(powerArmorState,slot))
    .filter(piece=>piece.tier!=='none');
  const integrity=conditions.length?Math.round(100*conditions.reduce((sum,piece)=>
    sum+piece.current/piece.max,0)/conditions.length):0;
  const broken=conditions.filter(piece=>piece.broken).length;
  $('visorIntegrity').textContent=integrity+'%';
  $('visorIntegrityFill').style.width=integrity+'%';
  $('visorWarning').textContent=!powered?'CORE OFFLINE · LIMP MODE':
    broken?broken+' ARMOR MODULE'+(broken===1?'':'S')+' BROKEN':
      charge<=15?'LOW FUSION CORE · SEEK REPLACEMENT':'HYDRAULICS ONLINE · FRAME STABLE';
  status.textContent=powerArmorState.phase==='entering'?'ENTERING CHASSIS…':
    powerArmorState.phase==='exiting'?'EXITING CHASSIS…':
    powerArmorState.occupied?(powered?'POWER ARMOR · POWERED':
      'POWER ARMOR · CORE DEPLETED · LIMP MODE'):
    'FRAME PARKED · TAP E TO CONFIGURE · HOLD E TO ENTER';
  const core=powerArmorState.coreCharge;
  $('powerArmorDetail').textContent=core===null?'NO FUSION CORE':
    Math.ceil(core)+'% FUSION CORE'+(core<=0?' · REPLACE AT FRAME':'');
}
function powerServiceAvailable(){
  if(powerArmorState.phase!=='idle'||powerArmorState.occupied){
    $('powerServiceFeedback').textContent='EXIT THE SUIT BEFORE SERVICING PARTS OR CORES';
    return false;
  }
  if(!nearPoweredSuit()){
    $('powerServiceFeedback').textContent='STAND BY THE FRAME AT STATION 8 TO SERVICE IT';
    return false;
  }
  return true;
}
function refreshPowerArmorUI(){
  for(const slot of POWER_ARMOR_SLOTS){
    const current=plateCondition(powerArmorState,slot);
    const picker=$('power-'+slot);picker.replaceChildren();
    const fitted=document.createElement('option');
    fitted.value='installed';fitted.textContent=current.tier==='none'?
      'EMPTY · SELECT A COLLECTED PART':
      getPowerPlate(slot,current.tier).name+' · INSTALLED';
    picker.append(fitted);
    if(current.tier!=='none'){
      const remove=document.createElement('option');
      remove.value='remove';remove.textContent='REMOVE TO BACKPACK';picker.append(remove);
    }
    for(const entry of backpack.items){
      const item=getItem(entry.itemId);
      if(item.category!=='power-plate'||item.slot!==slot)continue;
      const option=document.createElement('option');option.value=entry.uid;
      option.textContent=item.name+' · '+Math.ceil(entry.condition)+' / '+
        item.maxDurability+' DURABILITY'+(entry.condition<=0?' · BROKEN':'');
      picker.append(option);
    }
    picker.value='installed';
    const spec=getPowerPlate(slot,current.tier);
    $('power-rating-'+slot).textContent=current.tier==='none'?'EMPTY SLOT':
      spec.points+' AP · '+Math.ceil(current.current)+' / '+current.max+
      ' DURABILITY'+(current.broken?' · BROKEN / 0 PLATE AP':'');
    $('power-repair-'+slot).disabled=current.tier==='none'||
      current.current>=current.max||powerArmorState.occupied;
  }
  const corePicker=$('powerCoreChoice');corePicker.replaceChildren();
  let available=0;
  for(const entry of backpack.items){
    if(entry.itemId!=='supply:fusion-core')continue;
    const option=document.createElement('option');option.value=entry.uid;
    option.textContent='FUSION CORE · '+Math.ceil(entry.charge)+'%'+
      (entry.charge<=0?' · SPENT':'');
    corePicker.append(option);available++;
  }
  if(!available){
    const empty=document.createElement('option');empty.value='';
    empty.textContent='NO STORED CORES';corePicker.append(empty);
  }
  $('powerCoreStatus').textContent=powerArmorState.coreCharge===null?
    'REACTOR EMPTY · NO CORE INSTALLED':
    'REACTOR CORE · '+Math.ceil(powerArmorState.coreCharge)+'% CHARGE'+
    (hasFusionPower(powerArmorState)?'':' · DEPLETED');
  $('powerInsertCore').disabled=!available||powerArmorState.occupied||
    powerArmorState.coreCharge!==null;
  $('powerEjectCore').disabled=powerArmorState.coreCharge===null||
    powerArmorState.occupied;
  $('powerTestCoreRefill').hidden=!TEMP_TEST_CORE_REFILL_ENABLED;
  $('powerTestCoreRefill').disabled=!TEMP_TEST_CORE_REFILL_ENABLED||
    powerArmorState.phase!=='idle'||powerArmorState.occupied;
  $('powerMaterialStatus').textContent=
    'SALVAGE '+countItem(backpack,'supply:salvage')+
    ' · OPTIC GLASS '+countItem(backpack,'supply:optic-glass')+
    ' · BACKPACK '+backpack.items.length+'/'+BACKPACK_LIMIT;
  $('powerArmorControl').textContent='DONE CONFIGURING · HOLD E BY THE FRAME TO ENTER';
  refreshPowerArmorHUD();
}
function openPowerArmorBay(){
  powerUIFromField=controls.isLocked;
  if(powerUIFromField)controls.unlock();
  powerUIOpen=true;
  $('powerArmorPanel').classList.remove('hidden');
  $('menu').classList.add('hidden');
  refreshPowerArmorUI();
}
function closePowerArmorBay(){
  powerUIOpen=false;$('powerArmorPanel').classList.add('hidden');
  if(powerUIFromField){powerUIFromField=false;controls.lock();}
  else $('menu').classList.remove('hidden');
}
function togglePoweredSuit(){
  if(powerArmorState.phase!=='idle')return;
  if(!powerArmorState.occupied&&!nearPoweredSuit()){
    showShotNotice('GET CLOSER TO THE POWER ARMOR FRAME AT STATION 8');return;
  }
  if(!powerArmorState.occupied&&!nearRearHatch()){
    showShotNotice('MOVE BEHIND THE FRAME · ENTER THROUGH THE REAR HATCH');return;
  }
  const exiting=powerArmorState.occupied;
  poweredSuit.root.updateMatrixWorld(true);
  const arrival=exiting?null:poweredSuit.root.worldToLocal(
    new THREE.Vector3(player.x,0,player.z));
  const origin=exiting?{x:0,z:-.28,yaw:Math.PI}:{
    x:arrival.x,z:arrival.z,
    yaw:camera.rotation.y-poweredSuit.root.rotation.y
  };
  if(exiting){
    // The shell is worn at the player location and then parks there.
    poweredSuit.root.position.set(player.x,0,player.z);
    poweredSuit.root.rotation.y=camera.rotation.y+Math.PI;
    poweredSuit.root.visible=true;
  }
  const result=beginPowerArmorTransition(powerArmorState);
  if(!result.ok)return;
  const offset=exiting?-2.32:0;
  const target=poweredSuit.root.localToWorld(new THREE.Vector3(0,0,offset));
  const destY=groundHeight(target.x,target.z)+powerArmorEyeHeight(
    {occupied:!exiting},exiting?player.eyeHeight:MOVE_TUNING.eyeHeight);
  const endPosition=new THREE.Vector3(target.x,destY,target.z);
  // The installed pilot looks through the FRONT visor (+Z in suit space).
  // World-space look-at must not multiply the eye height by suit scale.
  const lookPoint=endPosition.clone().add(
    poweredSuit.root.localToWorld(new THREE.Vector3(0,0,exiting?-2:2))
      .sub(poweredSuit.root.position));
  const endingRotation=new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(endPosition,lookPoint,powerCameraUp));
  powerCinematic={from:camera.position.clone(),fromRotation:camera.quaternion.clone(),
    origin,to:endPosition,toRotation:endingRotation};
  powerCinematicFadeLeft=0;
  $('powerTransitionFade').style.opacity='0';
  keys.clear();triggerHeld=false;changeAim(false);
  weaponVisuals.get(activeWeaponId).root.visible=false;
  sound.powerArmorTransition(result.phase==='entering',POWER_ARMOR_TRANSITION_SECONDS);
  showShotNotice(result.phase==='entering'?'HYDRAULICS OPEN · ENTERING CHASSIS':
    'RELEASING LOCKS · EXITING CHASSIS');
  refreshPowerArmorHUD();
}
function savePowerService(){
  poweredSuit.updatePlates(powerArmorState);
  poweredSuit.updateCore(powerArmorState);
  savePowerArmor();saveBackpack();
  refreshPowerArmorUI();refreshInventoryUI();
}
function spendPowerMaterials(cost){
  for(const [itemId,needed] of [['supply:salvage',cost.salvage||0],
    ['supply:optic-glass',cost.glass||0]]){
    let remaining=needed;
    for(const entry of [...backpack.items]){
      if(entry.itemId!==itemId||!remaining)continue;
      remaining-=removeItem(backpack,entry.uid,remaining).removed;
    }
  }
}
for(const slot of POWER_ARMOR_SLOTS){
  const picker=$('power-'+slot);
  picker.addEventListener('change',()=>{
    if(!powerServiceAvailable()){refreshPowerArmorUI();return;}
    const choice=picker.value;
    if(choice==='installed')return;
    const current=plateCondition(powerArmorState,slot);
    if(choice==='remove'){
      if(backpack.items.length>=BACKPACK_LIMIT){
        $('powerServiceFeedback').textContent='BACKPACK FULL · FREE A SLOT FIRST';
        refreshPowerArmorUI();return;
      }
      const removed=removePowerPlate(powerArmorState,slot);
      if(removed.ok)addItem(backpack,'power-plate:'+removed.tier+'-'+slot,1,
        {condition:removed.current});
      $('powerServiceFeedback').textContent='REMOVED '+getPowerPlate(slot,current.tier).name+
        ' · CONDITION PRESERVED';
      savePowerService();return;
    }
    const owned=backpack.items.find(entry=>entry.uid===choice);
    const item=owned&&getItem(owned.itemId);
    if(!item||item.category!=='power-plate'||item.slot!==slot){
      refreshPowerArmorUI();return;
    }
    const taken=removeItem(backpack,owned.uid,1);
    if(current.tier!=='none'){
      const returned=addItem(backpack,'power-plate:'+current.tier+'-'+slot,1,
        {condition:current.current});
      if(!returned.added){
        addItem(backpack,taken.itemId,1,{condition:taken.condition});
        $('powerServiceFeedback').textContent='BACKPACK FULL · INSTALL ABORTED';
        refreshPowerArmorUI();return;
      }
    }
    setPowerPlate(powerArmorState,slot,item.tier,taken.condition);
    $('powerServiceFeedback').textContent='INSTALLED '+item.name.toUpperCase()+
      (taken.condition<=0?' · BROKEN UNTIL REPAIRED':' · SECURED TO FRAME');
    savePowerService();
  });
  $('power-repair-'+slot).addEventListener('click',()=>{
    if(!powerServiceAvailable())return;
    const available=countItem(backpack,'supply:salvage');
    const result=repairPowerPlate(powerArmorState,slot,available,specialModifiers.repairDiscount);
    if(!result.ok){
      $('powerServiceFeedback').textContent=result.reason==='materials'?
        'REPAIR NEEDS '+result.cost+' SALVAGED PARTS':'NO REPAIR NEEDED';
      return;
    }
    spendPowerMaterials({salvage:result.cost});
    $('powerServiceFeedback').textContent=slot.toUpperCase()+
      ' REPAIRED · '+result.durability+' DURABILITY · -'+result.cost+' PARTS';
    savePowerService();
  });
}
// Non-destructive teardown: return the actual six durable pieces to
// the backpack. Necessary for older saves whose rig starts pre-armoured.
$('powerStripAll').addEventListener('click',()=>{
  if(!powerServiceAvailable())return;
  const fitted=POWER_ARMOR_SLOTS.filter(slot=>
    powerArmorState.plates[slot]!=='none');
  if(!fitted.length){
    $('powerServiceFeedback').textContent='FRAME ALREADY BARE · ALL SIX SLOTS EMPTY';
    return;
  }
  if(backpack.items.length+fitted.length>BACKPACK_LIMIT){
    $('powerServiceFeedback').textContent='BACKPACK NEEDS '+
      fitted.length+' FREE SLOTS TO REMOVE ALL PARTS';return;
  }
  for(const slot of fitted){
    const removed=removePowerPlate(powerArmorState,slot);
    if(removed.ok)addItem(backpack,'power-plate:'+removed.tier+'-'+slot,1,
      {condition:removed.current});
  }
  $('powerServiceFeedback').textContent='BARE FRAME READY · '+fitted.length+
    ' PARTS RETURNED TO BACKPACK · CONDITION PRESERVED';
  savePowerService();
});
$('powerInsertCore').addEventListener('click',()=>{
  if(!powerServiceAvailable())return;
  const uid=$('powerCoreChoice').value;
  const entry=backpack.items.find(v=>v.uid===uid);
  if(!entry||entry.itemId!=='supply:fusion-core')return;
  const fitted=installFusionCore(powerArmorState,entry.charge);
  if(!fitted.ok){
    $('powerServiceFeedback').textContent=fitted.reason==='spent-core'?
      'THAT CORE IS SPENT · FIND A CHARGED ONE':'EJECT THE EXISTING CORE FIRST';
    return;
  }
  removeItem(backpack,uid,1);
  $('powerServiceFeedback').textContent='FUSION CORE INSERTED · '+
    Math.ceil(fitted.charge)+'% · POWER SYSTEMS ONLINE';
  savePowerService();
});
$('powerEjectCore').addEventListener('click',()=>{
  if(!powerServiceAvailable())return;
  if(backpack.items.length>=BACKPACK_LIMIT){
    $('powerServiceFeedback').textContent='BACKPACK FULL · CANNOT EJECT';return;
  }
  const result=ejectFusionCore(powerArmorState);
  if(result.ok)addItem(backpack,'supply:fusion-core',1,{charge:result.charge});
  $('powerServiceFeedback').textContent='CORE EJECTED · '+
    Math.ceil(result.charge)+'% REMAINING';
  savePowerService();
});
// Temporary testing control: charge the parked frame directly without
// generating collectible cores, altering salvage, or changing RPG loot.
$('powerTestCoreRefill').addEventListener('click',()=>{
  if(!TEMP_TEST_CORE_REFILL_ENABLED||!powerServiceAvailable())return;
  if(powerArmorState.coreCharge===null)
    installFusionCore(powerArmorState,FUSION_CORE_CAPACITY);
  else powerArmorState.coreCharge=FUSION_CORE_CAPACITY;
  $('powerServiceFeedback').textContent=
    'TEMP TEST REFILL · REACTOR 100% · NO FUSION CORE CONSUMED';
  savePowerService();
});
$('powerCraftButton').addEventListener('click',()=>{
  if(!powerServiceAvailable())return;
  const tier=$('powerCraftTier').value,slot=$('powerCraftSlot').value;
  const recipe=POWER_ARMOR_RECIPES[tier];
  if(!recipe||!POWER_ARMOR_SLOTS.includes(slot))return;
  const cost=discountedMaterials(recipe,specialModifiers.craftDiscount);
  if(countItem(backpack,'supply:salvage')<cost.salvage||
     countItem(backpack,'supply:optic-glass')<cost.glass){
    $('powerServiceFeedback').textContent='MISSING MATERIALS · NEED '+
      cost.salvage+' SALVAGE AND '+cost.glass+' OPTIC GLASS';
    return;
  }
  if(backpack.items.length>=BACKPACK_LIMIT){
    $('powerServiceFeedback').textContent='BACKPACK FULL · MAKE ROOM TO CRAFT';return;
  }
  spendPowerMaterials(cost);
  addItem(backpack,'power-plate:'+tier+'-'+slot,1);
  $('powerServiceFeedback').textContent='CRAFTED '+getPowerPlate(slot,tier).name+
    ' · '+slot.toUpperCase()+' · FULL DURABILITY';
  savePowerService();
});
$('powerBayOpen').addEventListener('click',()=>{
  resetPlayer(7);
  sound.unlock();
  controls.lock();
  showShotNotice('FRAME AT STATION 8 · TAP E TO CONFIGURE · HOLD E TO ENTER');
});
$('powerBayClose').addEventListener('click',closePowerArmorBay);
$('powerArmorControl').addEventListener('click',closePowerArmorBay);
refreshPowerArmorHUD();
function resetAllDummies(){
  for(const dummy of dummies.values()){
    resetDummy(dummy.state);dummy.impulse=0;dummy.flash=0;dummy.group.rotation.z=0;
    for(const mesh of dummy.pieces)mesh.material.emissive.setHex(0);
    updateDummyLabel(dummy);
  }
  clearBulletHoles();
  $('damageReport').textContent='ALL DUMMIES RESET · ARMOR LOADOUTS PRESERVED';
  showShotNotice('DUMMIES RESET · EQUIPMENT UNCHANGED');
}
function spawnDamagePopup(point,result){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.font='bold 55px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='#081011';ctx.shadowBlur=10;
  ctx.lineWidth=7;ctx.strokeStyle='#09151c';
  const text=(result.critical?'★ ':'')+'-'+Math.ceil(result.damage);
  ctx.strokeText(text,128,60);
  ctx.fillStyle=result.critical?'#f6cf7b':result.blocked>0?'#a5d7f3':'#e8f3eb';
  ctx.fillText(text,128,60);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false});
  const sprite=new THREE.Sprite(material);
  sprite.position.copy(point).add(new THREE.Vector3(0,.45,0));
  sprite.scale.set(1.0,.5,1);
  scene.add(sprite);
  damagePopups.push({sprite,texture,material,age:0});
  if(damagePopups.length>popupsMax)removeDamagePopup(damagePopups.shift());
}
function removeDamagePopup(popup){
  scene.remove(popup.sprite);popup.material.dispose();popup.texture.dispose();
}
function updateCombatVisuals(dt){
  for(const dummy of dummies.values()){
    const target=dummy.state.alive?0:-1.22;
    const shake=dummy.state.alive?Math.sin(dummy.flash*29)*dummy.impulse*.08:0;
    dummy.group.rotation.z+=(target+shake-dummy.group.rotation.z)*(1-Math.exp(-9*dt));
    dummy.impulse=Math.max(0,dummy.impulse-dt*3);
    dummy.flash=Math.max(0,dummy.flash-dt);
    if(dummy.flash===0){
      for(const mesh of dummy.pieces)mesh.material.emissive.setHex(0);
    }
  }
  for(let i=damagePopups.length-1;i>=0;i--){
    const p=damagePopups[i];p.age+=dt;
    p.sprite.position.y+=dt*.6;
    p.material.opacity=Math.max(0,1-p.age/.9);
    if(p.age>=.9){damagePopups.splice(i,1);removeDamagePopup(p);}
  }
}

// W03.1 armory UI: change all six independent parts on any dummy.
// Open from the pause menu or press B in the lab. No drag-and-drop needed.
let armoryFromField=false;
function selectedDummy(){return dummies.get($('armoryDummy').value);}
function refreshArmory(){
  const dummy=selectedDummy();
  if(!dummy)return;
  let total=0;
  for(const slot of ARMOR_SLOTS){
    const item=getArmorPiece(slot,dummy.state.loadout[slot]);
    $('armor-'+slot).value=item.id;
    $('rating-'+slot).textContent=item.points+' AP · '+
      Math.round(damageReductionForPoints(item.points)*100)+'% blocked';
    total+=item.points;
  }
  $('armoryTotal').textContent=total+' AP equipped · no armor durability / no breakage';
  $('armoryHP').textContent=Math.ceil(dummy.state.health)+' / '+dummy.state.maxHealth+' HP';
}
function openArmory(){
  armoryFromField=controls.isLocked;
  if(controls.isLocked)controls.unlock();
  $('armory').classList.remove('hidden');
  refreshArmory();
}
function closeArmory(){
  $('armory').classList.add('hidden');
  if(armoryFromField){
    armoryFromField=false;controls.lock();
  }
}
for(const dummy of dummyKinds){
  const opt=document.createElement('option');opt.value=dummy.id;
  opt.textContent=dummy.label;$('armoryDummy').append(opt);
}
$('armoryDummy').addEventListener('change',refreshArmory);
function saveArmorLoadouts(){
  try{
    localStorage.setItem('rpg-lab-armor-loadouts',
      JSON.stringify(Object.fromEntries([...dummies].map(([id,d])=>[id,d.state.loadout]))));
  }catch{}
}
try{
  const saved=JSON.parse(localStorage.getItem('rpg-lab-armor-loadouts')||'{}');
  for(const [id,dummy] of dummies){
    if(saved[id]){
      dummy.state.loadout=createLoadout(saved[id]);
      rebuildDummyArmor(dummy);
    }
  }
}catch{ /* Ignore malformed or blocked storage. */ }
for(const slot of ARMOR_SLOTS){
  const control=$('armor-'+slot);
  for(const item of ARMOR_ITEMS[slot]){
    const opt=document.createElement('option');opt.value=item.id;
    opt.textContent=item.name+' — '+item.points+' AP';
    control.append(opt);
  }
  control.addEventListener('change',()=>{
    const dummy=selectedDummy();
    equipArmor(dummy.state,slot,control.value);
    clearBulletHoles();
    rebuildDummyArmor(dummy);
    saveArmorLoadouts();
    refreshArmory();
    $('damageReport').textContent=dummy.title+' · '+ARMOR_SLOT_LABELS[slot].toUpperCase()+
      ' · '+getArmorPiece(slot,control.value).points+' AP · PERMANENT';
  });
}
$('armoryOpen').addEventListener('click',openArmory);
$('armoryClose').addEventListener('click',closeArmory);
$('armoryReset').addEventListener('click',()=>{
  const dummy=selectedDummy();
  const preset=$('armoryPreset').value;
  dummy.state.loadout=createLoadout(preset);
  clearBulletHoles();
  rebuildDummyArmor(dummy);
  saveArmorLoadouts();
  refreshArmory();
});


// W04.0: an isolated, deliberately modest test arena in the northeast.
// Patrol/spot/chase/search is separate from cover/fire/AI-player-damage passes.
const aiObstacles=[];
function aiCrate(x,z,w,d,h,material){
  const mesh=box(x,h/2,z,w,h,d,material);
  mesh.userData.impactMaterial='metal';
  const collider={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,height:h};
  aiObstacles.push(collider);bounds.push(collider);
  return mesh;
}
const rustySteel=mat(0x62686b,.74);
aiCrate(39.5,38.0,2.6,2.3,1.45,rustySteel);
aiCrate(49.0,44.2,2.8,1.8,1.85,dark);
aiCrate(53.0,37.0,2.3,2.2,1.6,rustySteel);
for(let x=34;x<=57;x+=4.6)box(x,.08,33.6,.14,.16,.8,orange);
const enemies=new Map(),enemyHitMeshes=[];
// Invisible mannequin collision surfaces are never on the camera render layer.
const ENEMY_COLLISION_LAYER=29;
const lootBags=new Map();
let lootSerial=0,selectedLootId=null,lootOverlayFromField=false;
let inventoryOpen=false,lootOpen=false,workbenchOpen=false,workbenchFromField=false;
let inventoryCategory='all';
let backpack=createBackpack();
try{
  const saved=JSON.parse(localStorage.getItem('rpg-lab-player-inventory')||'null');
  if(saved)backpack=safeBackpackSnapshot(saved);
}catch{ /* Storage may be unavailable or corrupted. */ }
let enemyAIEnabled=true;
const squadIntel=createSquadIntel();
const squadDirector=createSquadDirector();
const enemySpecs=[
  {id:'scout',label:'SCOUT',x:39,z:42,
    color:0x8d7761,patrol:[{x:39,z:42},{x:44,z:42}]},
  {id:'raider',label:'RAIDER',x:43,z:46,
    color:0x66775c,patrol:[{x:43,z:46},{x:47,z:46}]},
  {id:'enforcer',label:'ENFORCER',x:46,z:36.8,
    color:0x4d6075,patrol:[{x:46,z:36.8},{x:51,z:37}]}
];
// Unmissable station-9 locator: visible from the teleport spawn even if
// individual low-poly characters are hidden by a browser graphics issue.
const locatorCanvas=document.createElement('canvas');
locatorCanvas.width=768;locatorCanvas.height=160;
const locatorCtx=locatorCanvas.getContext('2d');
const locatorTex=new THREE.CanvasTexture(locatorCanvas);
locatorTex.colorSpace=THREE.SRGBColorSpace;
const locator=new THREE.Sprite(new THREE.SpriteMaterial({
  map:locatorTex,transparent:true,depthTest:true,depthWrite:false}));
locator.position.set(39,4.2,42);
locator.scale.set(6.1,1.28,1);
scene.add(locator);
function updateArenaSign(){
  const alive=[...enemies.values()].filter(e=>e.state.alive).length;
  locatorCtx.clearRect(0,0,locatorCanvas.width,locatorCanvas.height);
  locatorCtx.fillStyle='rgba(22,31,37,.92)';
  locatorCtx.fillRect(0,0,768,160);
  locatorCtx.strokeStyle='#ffa65f';locatorCtx.lineWidth=9;
  locatorCtx.strokeRect(4,4,760,152);
  locatorCtx.font='bold 58px system-ui';locatorCtx.fillStyle='#ffdb93';
  locatorCtx.fillText('RAIDERS ALIVE · '+alive+' / '+enemies.size,27,99);
  locatorTex.needsUpdate=true;
}
// The old permanent orange spawn pads stayed behind after a kill.
// Each living enemy now owns its own ground marker, which disappears on death.
function enemyMaterial(color,metallic=false){
  return new THREE.MeshStandardMaterial({color,
    roughness:metallic?.45:.88,metalness:metallic?.67:.05});
}
function createEnemy(spec){
  const brain=createEnemyBrain({x:spec.x,z:spec.z,
    yaw:-Math.PI/2,patrol:spec.patrol});
  const root=new THREE.Group();root.position.set(spec.x,0,spec.z);
  scene.add(root);
  // Crouching lowers the ACTUAL head/torso/arm hitboxes. It is not
  // just a cosmetic mesh squash; the player's raycaster uses these meshes.
  const upperBody=new THREE.Group();root.add(upperBody);
  // This entire old mannequin is hitboxes only: no duplicate body, even if
  // a child material or armor loadout later becomes renderable by mistake.
  upperBody.visible=false;
  const state=createDummy(enemyArmorForRound(spec.id,0));
  const enemy={id:spec.id,label:spec.label,brain,root,state,
    meshes:[],limbs:[],armorMeshes:new Map(),flash:0,shake:0,walkPhase:0,statusText:'',
    tactics:makeEnemyTactics(spec.id),gunGlow:0,radarAlertSeconds:0,
    deathTimer:0,upperBody,crouchBlend:0,combatPose:0,reloadPose:0,
    recoilPose:0,rigged:null,modelStatus:'original'};
  const flesh=enemyMaterial(spec.color);
  const darkCloth=enemyMaterial(0x29353b);
  const hitParts={};
  function part(parent,geometry,material,x,y,z,slot,armored=false){
    const mesh=new THREE.Mesh(geometry,material.clone());
    mesh.position.set(x,y,z);
    // This is a physics-only hitbox, never a second renderable body.
    // The player raycaster intersects these directly even when hidden.
    mesh.visible=false;mesh.castShadow=false;mesh.receiveShadow=false;
    // Crucial: legacy LEGS are parented to root, not upperBody. Assign the
    // non-rendering layer to every collision mesh individually.
    mesh.layers.set(ENEMY_COLLISION_LAYER);
    mesh.material.visible=false;mesh.material.colorWrite=false;
    mesh.userData={enemyId:spec.id,hitZone:slot,equipped:true,
      impactMaterial:armored?'metal':'wood'};
    parent.add(mesh);enemy.meshes.push(mesh);enemyHitMeshes.push(mesh);
    return mesh;
  }
  hitParts.chest=part(upperBody,new THREE.BoxGeometry(.70,.74,.46),flesh,0,1.34,0,'chest');
  hitParts.head=part(upperBody,new THREE.SphereGeometry(.225,14,10),flesh,0,2.03,0,'head');
  // Fill the former gap between chest and skull with a physical neck.
  // Treat this as chest damage so helmets keep their existing balance.
  hitParts.neck=part(upperBody,new THREE.CylinderGeometry(.13,.15,.16,10),
    flesh,0,1.76,0,'chest');
  // Build all six armor meshes once, then show/hide and recolor them
  // from the same actual loadout used by damage and loot rules.
  enemy.armorMeshes.set('chest',part(upperBody,new THREE.BoxGeometry(.72,.76,.5),
    enemyMaterial(0x647363,true),0,1.37,.055,'chest',true));
  enemy.armorMeshes.set('head',part(upperBody,
    new THREE.SphereGeometry(.241,14,10,0,Math.PI*2,0,Math.PI*.68),
    enemyMaterial(0x647363,true),0,2.075,0,'head',true));
  for(const side of [-1,1]){
    const name=side<0?'left':'right';
    const armPivot=new THREE.Group();
    armPivot.position.set(side*.43,1.65,0);upperBody.add(armPivot);
    enemy.limbs.push({pivot:armPivot,side,kind:'arm'});
    hitParts[name+'Arm']=part(armPivot,new THREE.BoxGeometry(.25,.72,.29),
      flesh,0,-.35,0,name+'Arm');
    enemy.armorMeshes.set(name+'Arm',part(armPivot,new THREE.BoxGeometry(.25,.54,.30),
      enemyMaterial(0x647363,true),0,-.32,.02,name+'Arm',true));
    const legPivot=new THREE.Group();
    legPivot.position.set(side*.19,.97,0);root.add(legPivot);
    enemy.limbs.push({pivot:legPivot,side,kind:'leg'});
    hitParts[name+'Leg']=part(legPivot,new THREE.CylinderGeometry(.155,.15,.80,10),
      darkCloth,0,-.46,0,name+'Leg');
    enemy.armorMeshes.set(name+'Leg',part(legPivot,new THREE.CylinderGeometry(.16,.17,.75,10),
      enemyMaterial(0x647363,true),0,-.45,.025,name+'Leg',true));
  }
  // Original game-world scrap-rifle silhouette (visual prop only in W04.0).
  const rifle=new THREE.Group();rifle.position.set(.19,1.38,.33);
  upperBody.add(rifle);enemy.rifleVisual=rifle;
  const stock=new THREE.Mesh(new THREE.BoxGeometry(.10,.15,.48),rustySteel);
  rifle.add(stock);
  const muzzle=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.56,8),darkCloth);
  muzzle.rotation.x=Math.PI/2;muzzle.position.z=.32;rifle.add(muzzle);
  const muzzleLight=new THREE.PointLight(0xffa65f,0,2.2);
  muzzleLight.position.set(.19,1.38,.68);
  upperBody.add(muzzleLight);enemy.muzzleLight=muzzleLight;
  // High-contrast visible identification beacons, even when the character
  // model is small or fogged against the scenery.
  const beacon=new THREE.Mesh(new THREE.TorusGeometry(.55,.065,6,22),
    new THREE.MeshBasicMaterial({color:0xf19668,depthTest:true,depthWrite:true}));
  beacon.rotation.x=-Math.PI/2;
  beacon.position.y=.085;root.add(beacon);enemy.beacon=beacon;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=132;
  const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const labelMesh=new THREE.Sprite(new THREE.SpriteMaterial({
    map:texture,transparent:true,depthTest:true,depthWrite:false}));
  // Smaller contextual tags: the old billboards filled a quarter of the
  // screen when the player was near an NPC.
  labelMesh.scale.set(1.85,.51,1);
  labelMesh.position.set(spec.x,2.84,spec.z);
  scene.add(labelMesh);
  enemy.billboard={canvas,ctx,texture,mesh:labelMesh};
  enemies.set(spec.id,enemy);
  // ONE visible character. Primitive body and armor meshes remain physics-only
  // and cannot render, including after reset or a changed armor loadout.
  enemy.rigged=createNpcAvatar(root,spec.id);
  // W20.23: COLLIDERS FOLLOW THE VISIBLE SKELETON.
  // The old standalone mannequin's 2.03 m skull overlapped the new scaled
  // NPC's visible face (~1.56-1.72 m), so legitimate face shots hit chest.
  // Reparent existing authoritative meshes beneath the *same animated joints*
  // that render the head, torso and limbs; their armor IDs stay untouched.
  const joints=enemy.rigged.hitJoints;
  function remountHitbox(mesh,joint,x,y,z){
    mesh.removeFromParent();
    joint.add(mesh);
    mesh.position.set(x,y,z);
  }
  remountHitbox(hitParts.head,joints.head,0,.035,0);
  remountHitbox(enemy.armorMeshes.get('head'),joints.head,0,.075,.02);
  remountHitbox(hitParts.chest,joints.torso,0,.33,0);
  remountHitbox(enemy.armorMeshes.get('chest'),joints.torso,0,.33,.025);
  remountHitbox(hitParts.neck,joints.neck,0,.02,0);
  for(const side of [-1,1]){
    const name=side<0?'left':'right';
    const arm=joints.arms.find(limb=>limb.side===side);
    const leg=joints.legs.find(limb=>limb.side===side);
    remountHitbox(hitParts[name+'Arm'],arm.shoulder,0,-.35,0);
    remountHitbox(enemy.armorMeshes.get(name+'Arm'),arm.shoulder,0,-.32,.02);
    remountHitbox(hitParts[name+'Leg'],leg.hip,0,-.39,0);
    remountHitbox(enemy.armorMeshes.get(name+'Leg'),leg.hip,0,-.38,.025);
  }
  if(WEAPON_REBUILD_MODE&&spec.id!==NPC_GUN_TRIAL_ROLE)enemy.rigged.disarm();
  // Old primitive body serves *only* precise zone hit-testing, never visuals.
  // Its separate render layer makes duplicate limbs impossible even if a
  // saved loadout mistakenly re-enables a mesh or its material.
  upperBody.traverse(object=>object.layers.set(ENEMY_COLLISION_LAYER));
  equipEnemyWeapon(enemy.tactics,
    WEAPON_REBUILD_MODE&&spec.id===NPC_GUN_TRIAL_ROLE?'pipe-rifle':
      chooseEnemyWeapon(spec.id,0).id);
  enemy.rigged.setWeapon(enemy.tactics.weaponId);
  for(const hitbox of enemy.meshes)hitbox.visible=false;
  enemy.rifleVisual.visible=false;
  refreshEnemyArmorVisuals(enemy);
  refreshEnemyLabel(enemy,'PATROL');
  return enemy;
}
function refreshEnemyArmorVisuals(enemy){
  // Appearance follows the SAME six-slot loadout used for damage and loot.
  enemy.rigged?.setArmor(enemy.state.loadout);
  for(const slot of ARMOR_SLOTS){
    const mesh=enemy.armorMeshes.get(slot);
    const piece=getArmorPiece(slot,enemy.state.loadout[slot]);
    // The old armor hitbox is never visible. Equipment determines whether
    // it participates in hit detection; cosmetic armor is on enemy.rigged.
    mesh.userData.equipped=piece.points>0;
    mesh.visible=false;
    if(piece.points)mesh.material.color.setHex(piece.color);
  }
}
function refreshEnemyLabel(enemy,mode){
  // Overhead tags may identify a hostile, but must NEVER expose its
  // decision, upcoming move, reload state, or weapon magazine to the player.
  const current=enemy.label+'-'+Math.ceil(enemy.state.health);
  if(current===enemy.statusText)return;
  enemy.statusText=current;
  const {ctx,canvas,texture}=enemy.billboard;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(10,20,28,.92)';ctx.fillRect(3,3,506,126);
  ctx.strokeStyle=enemy.state.alive?'#d7a77d':'#df685d';
  ctx.lineWidth=4;ctx.strokeRect(3,3,506,126);
  ctx.fillStyle='#f3dec0';ctx.textAlign='left';
  ctx.font='bold 28px system-ui';ctx.fillText(enemy.label,18,42);
  ctx.fillStyle='#f4e2cf';ctx.font='bold 22px system-ui';
  ctx.fillText(Math.ceil(enemy.state.health)+' HP',18,79);
  ctx.fillStyle='#263c47';ctx.fillRect(18,93,480,14);
  ctx.fillStyle='#a6c58e';ctx.fillRect(18,93,480*enemy.state.health/100,14);
  texture.needsUpdate=true;
}
let arenaRound=-1;
enemySpecs.forEach(createEnemy);
updateArenaSign();
$('engineStatus').textContent='ENGINE READY · '+enemies.size+' RAIDERS LOADED';
$('engineStatus').style.color='#abddb2';
function resetEnemies(){
  arenaRound++;
  clearBulletHoles();clearSquadIntel(squadIntel);resetSquadDirector(squadDirector);
  // Each J round produces fresh, singular loot drops. Inventory persists.
  for(const [id,drop] of lootBags){
    if(drop.source==='power-cache')continue; // the salvage cache is finite
    scene.remove(drop.mesh);disposeLootMarker(drop.mesh);lootBags.delete(id);
  }
  selectedLootId=null;
  if(lootOpen)closeLootOverlay();
  for(const enemy of enemies.values()){
    enemy.state.loadout=enemyArmorForRound(enemy.id,arenaRound);
    resetDummy(enemy.state);resetEnemyBrain(enemy.brain);
    refreshEnemyArmorVisuals(enemy);
    enemy.root.position.set(enemy.brain.x,0,enemy.brain.z);
    enemy.root.rotation.set(0,enemy.brain.yaw,0);
    enemy.root.visible=true;enemy.billboard.mesh.visible=true;
    enemy.beacon.visible=true;
    enemy.deathTimer=0;enemy.crouchBlend=0;enemy.upperBody.position.y=0;
    enemy.radarAlertSeconds=0;
    enemy.upperBody.rotation.set(0,0,0);
    enemy.combatPose=0;enemy.reloadPose=0;enemy.recoilPose=0;
    for(const {pivot,kind,side} of enemy.limbs){
      if(kind==='leg'){pivot.position.y=.97;pivot.scale.y=1;}
      pivot.rotation.x=0;
    }
    enemy.flash=0;enemy.shake=0;enemy.statusText='';
    resetEnemyTactics(enemy.tactics);
    equipEnemyWeapon(enemy.tactics,
      WEAPON_REBUILD_MODE&&enemy.id===NPC_GUN_TRIAL_ROLE?'pipe-rifle':
        chooseEnemyWeapon(enemy.id,arenaRound).id);
    enemy.rigged?.setWeapon(enemy.tactics.weaponId);
    enemy.gunGlow=0;enemy.muzzleLight.intensity=0;
    for(const mesh of enemy.meshes)mesh.material.emissive.setHex(0);
    refreshEnemyLabel(enemy,'PATROL');
  }
  updateArenaSign();
  $('damageReport').textContent='AI BOTS RESET · NEW MIXED ARMOR LOADOUTS';
  showShotNotice('ENEMIES RESET · PATROL RESTARTED');
}
// World loot is independent of the enemy corpse. A downed bot fades after
// 0.7s, but its searchable bag remains until looted or J resets the arena.
function disposeLootMarker(root){
  root.traverse(obj=>{
    if(obj.isMesh){obj.geometry.dispose();obj.material.dispose();}
    if(obj.isSprite){obj.material.map?.dispose();obj.material.dispose();}
  });
}
function makeLootMarker(bag){
  const group=new THREE.Group();
  group.position.set(bag.x,0,bag.z);
  const rarest=bag.items.reduce((a,b)=>
    (['common','uncommon','rare','epic'].indexOf(getItem(b.itemId).rarity)>
     ['common','uncommon','rare','epic'].indexOf(a)?getItem(b.itemId).rarity:a),'common');
  const tint={common:0xaba991,uncommon:0x71c68d,rare:0x80b4ee,epic:0xc498f3}[rarest];
  const base=new THREE.Mesh(new THREE.BoxGeometry(.65,.38,.47),
    new THREE.MeshStandardMaterial({color:0x3f4c44,roughness:.88,
      emissive:tint,emissiveIntensity:.12}));
  base.position.y=.3;group.add(base);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(.67,.075,.48),
    new THREE.MeshBasicMaterial({color:tint}));
  strip.position.y=.44;group.add(strip);
  const sign=document.createElement('canvas');sign.width=256;sign.height=64;
  const ctx=sign.getContext('2d');
  ctx.fillStyle='rgba(7,18,27,.93)';ctx.fillRect(0,0,256,64);
  ctx.font='bold 24px system-ui';ctx.fillStyle='#f4e7cb';
  ctx.textAlign='center';ctx.fillText(bag.source==='power-cache'?
    'POWER CACHE · E':'LOOT · E TO SEARCH',128,40);
  const texture=new THREE.CanvasTexture(sign);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
    map:texture,depthTest:true,transparent:true}));
  sprite.position.y=1.18;sprite.scale.set(2.45,.61,1);group.add(sprite);
  scene.add(group);
  return group;
}
function spawnWorldLoot(contents,x,z,source='world'){
  // Retire ALL legacy gun/ammo drops, not just enemy inventories.
  // Preserve armor, medicine, quest items, fusion cores and supplies.
  const available=WEAPON_REBUILD_MODE?(contents||[]).filter(entry=>{
    const category=getItem(entry.itemId).category;
    return (category!=='weapon'&&category!=='ammo')||
      (category==='ammo'&&REBUILT_WEAPON_IDS.includes(entry.itemId.slice(5)));
  }):contents;
  const bag=createLootBag('bag-'+(++lootSerial),x,z,available,source);
  if(!bag.items.length)return null;
  const marker=makeLootMarker(bag);
  lootBags.set(bag.id,{...bag,mesh:marker});
  return bag.id;
}
// W10.0: finite test-world salvage cache, persistent even across J resets.
// The future open world will distribute these pieces through exploration and quests.
const POWER_CACHE_KEY='rpg-lab-power-salvage-cache-v1';
const STARTER_POWER_CACHE=[
  // Every T-45 section is a separate object in the finite test cache.
  // A brand-new chassis is empty until the player installs these parts.
  {itemId:'power-plate:t45-head',quantity:1,condition:80},
  {itemId:'power-plate:t45-chest',quantity:1,condition:80},
  {itemId:'power-plate:t45-leftArm',quantity:1,condition:75},
  {itemId:'power-plate:t45-rightArm',quantity:1,condition:55},
  {itemId:'power-plate:t45-leftLeg',quantity:1,condition:75},
  {itemId:'power-plate:t45-rightLeg',quantity:1,condition:75},
  {itemId:'power-plate:t60-head',quantity:1,condition:105},
  {itemId:'power-plate:t01-rightLeg',quantity:1,condition:75},
  {itemId:'supply:fusion-core',quantity:1,charge:100},
  {itemId:'supply:fusion-core',quantity:1,charge:80},
  {itemId:'supply:salvage',quantity:16},
  {itemId:'supply:optic-glass',quantity:6}
];
function savePowerCache(contents){
  try{localStorage.setItem(POWER_CACHE_KEY,JSON.stringify(contents));}catch{}
}
let powerCacheContents=STARTER_POWER_CACHE;
try{
  const stored=JSON.parse(localStorage.getItem(POWER_CACHE_KEY)||'null');
  if(Array.isArray(stored))powerCacheContents=stored.filter(e=>{
    try{return getItem(e.itemId)&&Number.isFinite(e.quantity)&&e.quantity>0;}
    catch{return false;}
  });
}catch{}
if(powerCacheContents.length)
  spawnWorldLoot(powerCacheContents,-53,-9,'power-cache');
function spawnEnemyLoot(enemy){
  const generated=generateEnemyLoot(enemy.id,arenaRound,enemy.state.loadout);
  const drops=WEAPON_REBUILD_MODE?generated.filter(entry=>{
    const item=getItem(entry.itemId);
    return (item?.category!=='weapon'&&item?.category!=='ammo')||
      REBUILT_WEAPON_IDS.includes(entry.itemId.slice(5));
  }):generated;
  return spawnWorldLoot(drops,enemy.brain.x,
    enemy.brain.z,'enemy-'+enemy.id);
}
function markEnemyDefeated(enemy){
  enemy.brain.active=false;
  enemy.deathTimer=0;
  enemy.flash=0;enemy.shake=0;
  for(const mesh of enemy.meshes)mesh.material.emissive.setHex(0);
  enemy.beacon.visible=false;
  enemy.billboard.mesh.visible=false;
  enemy.muzzleLight.intensity=0;
  enemy.gunGlow=0;
  spawnEnemyLoot(enemy);
  if(enemy.id==='raider'){
    recordCampaignObjective('raider-defeated');
    recordCampaignObjective('haven-defense');
  }
  awardSpecialExperience(({scout:45,raider:70,enforcer:105})[enemy.id]||45,'combat');
  updateArenaSign();
}
function discardEmptyLootBags(){
  for(const [id,bag] of lootBags){
    if(bag.items.length)continue;
    scene.remove(bag.mesh);disposeLootMarker(bag.mesh);
    lootBags.delete(id);
    if(selectedLootId===id)selectedLootId=null;
  }
}
function nearestLootBag(){
  let best=null,meters=2.7;
  for(const bag of lootBags.values()){
    const d=Math.hypot(player.x-bag.x,player.z-bag.z);
    if(d<meters){meters=d;best=bag;}
  }
  return best;
}
function syncAmmoToWeapons(){
  for(const spec of ARSENAL)arsenalStates[spec.id].reserve=ammoReserve(backpack,spec.id);
ensureLaserState(arsenalStates[LASER_MUSKET.id]);
}
function saveBackpack(){
  // Reserve counts are owned by live weapons during reloads and shooting.
  // Synchronize before persistence so reloading a save cannot restore spent ammo.
  for(const spec of ARSENAL)backpack.ammoReserves[spec.id]=arsenalStates[spec.id].reserve;
  try{localStorage.setItem('rpg-lab-player-inventory',JSON.stringify(backpack));}catch{}
}
function inventoryLine(item){
  const row=document.createElement('div');
  row.className='loot-entry';
  row.style.borderLeftColor=RARITIES[item.rarity].color;
  const summary=document.createElement('div');summary.className='loot-description';
  const name=document.createElement('strong');name.textContent=item.name;
  name.style.color=RARITIES[item.rarity].color;
  const detail=document.createElement('small');
  detail.textContent=RARITIES[item.rarity].label+' · '+inventorySection(item).toUpperCase()+
    ' · '+item.value+' CAPS';
  summary.append(name,detail);row.append(summary);
  return row;
}
function lootButton(row,label,callback){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  b.className='loot-action';b.addEventListener('click',callback);row.append(b);
  return b;
}
function refreshInventoryUI(){
  $('inventoryCapacity').textContent=backpack.items.length+' / '+BACKPACK_LIMIT+' SLOTS';
  $('inventoryValue').textContent=totalInventoryValue(backpack)+' CAPS VALUE';
  $('inventoryWeapon').textContent=playerGunEnabled()?
    activeSpec.name.toUpperCase()+' · REBUILT WEAPON':
    WEAPON_REBUILD_MODE?'UNARMED · OLD GUNS ARCHIVED':getWeaponSpec(backpack.equipment.weapon).name;
  const wear=backpack.equipment.clothing||{head:'none',back:'none'};
  $('inventoryClothing').textContent='HAT: '+(wear.head==='none'?'NONE':'FIELD CAP')+
    ' · BACKPACK: '+(wear.back==='none'?'NONE':'CANVAS FIELD PACK');
  const ordinary=playerArmorReduction(backpack,'chest');
  const powered=calculateIncomingShot(100,ordinary.points,powerArmorState,'chest');
  $('inventoryArmor').textContent='CHEST '+ordinary.points+' AP · '+
    Math.round(powered.combinedReduction*100)+'% BALLISTIC BLOCK'+
    (powerArmorState.occupied?' · POWER ARMOR ACTIVE':'');
  const nav=$('inventoryCategories');nav.replaceChildren();
  if(WEAPON_REBUILD_MODE&&inventoryCategory==='weapon')inventoryCategory='all';
  const areas=(WEAPON_REBUILD_MODE?INVENTORY_CATEGORIES.filter(category=>category.id!=='weapon'):INVENTORY_CATEGORIES).map(category=>({
    ...category,count:backpack.items.filter(e=>
      (!WEAPON_REBUILD_MODE||getItem(e.itemId)?.category!=='weapon')&&
      (category.id==='all'||inventorySection(getItem(e.itemId))===category.id)).length
  }));
  for(const category of areas){
    const button=document.createElement('button');
    button.type='button';button.className='inventory-category';
    button.dataset.category=category.id;
    button.setAttribute('aria-pressed',String(inventoryCategory===category.id));
    const name=document.createElement('span');name.textContent=category.label;
    const count=document.createElement('b');count.textContent=String(category.count);
    button.append(name,count);
    if(inventoryCategory===category.id)button.classList.add('selected');
    button.addEventListener('click',()=>{
      inventoryCategory=category.id;refreshInventoryUI();
    });
    nav.append(button);
  }
  const chosen=areas.find(c=>c.id===inventoryCategory)||areas[0];
  $('inventorySectionTitle').textContent=chosen.label.toUpperCase();
  $('inventorySectionCount').textContent=chosen.count+' ITEM SLOTS';
  const visibleEntries=backpack.items.filter(entry=>
    (!WEAPON_REBUILD_MODE||getItem(entry.itemId)?.category!=='weapon')&&
    (inventoryCategory==='all'||inventorySection(getItem(entry.itemId))===inventoryCategory));
  const area=$('inventoryItems');area.replaceChildren();
  if(!visibleEntries.length){
    const empty=document.createElement('p');empty.className='inventory-empty';
    empty.textContent=inventoryCategory==='quest'?
      'NO QUEST ITEMS YET · MISSION ITEMS WILL APPEAR HERE.':
      inventoryCategory==='weapon'?'NO LOOSE WEAPONS · YOUR STARTING PISTOL IS EQUIPPED.':
      'NOTHING IN THIS SECTION YET · SEARCH LOOT WITH E.';
    area.append(empty);
  }
  $('inventoryAmmo').replaceChildren();
  if(inventoryCategory==='weapon'){
    const heading=document.createElement('h3');heading.textContent='AMMO RESERVES · AUTO-STORED';
    $('inventoryAmmo').append(heading);
    for(const spec of ARSENAL){
      const row=document.createElement('div');row.className='inventory-ammo-line';
      const name=document.createElement('span');name.textContent=spec.name;
      const amount=document.createElement('strong');
      amount.textContent=displayAmmoCount(arsenalStates[spec.id].reserve);
      row.append(name,amount);$('inventoryAmmo').append(row);
    }
  }
  const copyNumbers=new Map();
  for(const entry of visibleEntries){
    const item=getItem(entry.itemId),row=inventoryLine(item);
    const count=document.createElement('span');
    const duplicateCount=(item.category==='weapon'||item.category==='armor'||item.category==='clothing')?
      countItem(backpack,item.id):0;
    const copy=(copyNumbers.get(item.id)||0)+1;
    copyNumbers.set(item.id,copy);
    count.textContent=item.category==='power-plate'?
      Math.ceil(entry.condition)+' / '+item.maxDurability+' DUR':
      item.category==='fusion-core'?Math.ceil(entry.charge)+'% CORE':
      duplicateCount>1?'COPY '+copy+' / '+duplicateCount:
      '×'+entry.quantity;
    count.className='loot-quantity';row.append(count);
    if(item.category==='armor'||item.category==='weapon'||item.category==='clothing'){
      const currentlyEquipped=item.category==='armor'?
        backpack.equipment.armor[item.slot]===item.key:
        item.category==='clothing'?
          backpack.equipment.clothing?.[item.slot]===item.key:
          backpack.equipment.weapon===item.key;
      if(currentlyEquipped&&item.category!=='weapon'){
        lootButton(row,'UNEQUIP',()=>{
          const outcome=unequipWearable(backpack,item.category,item.slot);
          if(outcome.ok){saveBackpack();refreshInventoryUI();}
        });
      }else{
        lootButton(row,'EQUIP',()=>{
          const result=equipFromInventory(backpack,entry.uid);
          if(!result.ok)return;
          if(result.category==='weapon')selectWeapon(result.key);
          saveBackpack();refreshInventoryUI();
        });
      }
    }
    if(item.id==='supply:medkit'){
      lootButton(row,'USE',()=>{
        const used=useSupply(backpack,entry.uid,playerHealth);
        if(!used.ok){showShotNotice('MEDKIT · HEALTH MUST BE BELOW 100');return;}
        refreshPlayerHealth();showShotNotice('HEALED · +'+Math.ceil(used.restored)+' HP');
        saveBackpack();refreshInventoryUI();refreshWeaponHUD();
      });
    }
    // Each entry is a physical stack. Let the player choose an exact count
    // without affecting copies in other slots or silently dropping everything.
    let dropAmount=null;
    if(entry.quantity>1){
      const quantityLabel=document.createElement('label');
      quantityLabel.className='drop-quantity';
      quantityLabel.textContent='QTY';
      dropAmount=document.createElement('input');
      dropAmount.className='drop-amount';
      dropAmount.type='number';dropAmount.min='1';
      dropAmount.max=String(entry.quantity);dropAmount.step='1';
      dropAmount.value='1';
      dropAmount.setAttribute('aria-label','Drop quantity for '+item.name);
      quantityLabel.append(dropAmount);row.append(quantityLabel);
      lootButton(row,'MAX',()=>{dropAmount.value=String(entry.quantity);});
    }
    lootButton(row,'DROP',()=>{
      const amount=dropAmount?Number(dropAmount.value):1;
      if(!Number.isSafeInteger(amount)||amount<1||amount>entry.quantity){
        showShotNotice('CHOOSE A DROP QUANTITY FROM 1 TO '+entry.quantity);
        dropAmount?.focus();return;
      }
      const dropped=removeItem(backpack,entry.uid,amount);
      if(!dropped.removed)return;
      const item=getItem(dropped.itemId);
      if(item.category==='weapon'&&
        backpack.equipment.weapon===item.key&&
        !backpack.items.some(e=>e.itemId===item.id)){
        backpack.equipment.weapon='scrap-pistol';selectWeapon('scrap-pistol');
      }
      if(item.category==='armor'&&backpack.equipment.armor[item.slot]===item.key&&
         !backpack.items.some(e=>e.itemId===item.id))
        backpack.equipment.armor[item.slot]='none';
      if(item.category==='clothing'&&backpack.equipment.clothing?.[item.slot]===item.key&&
         !backpack.items.some(e=>e.itemId===item.id))
        backpack.equipment.clothing[item.slot]='none';
      spawnWorldLoot([{itemId:dropped.itemId,quantity:dropped.removed,
        ...(Number.isFinite(dropped.condition)?{condition:dropped.condition}:{}),
        ...(Number.isFinite(dropped.charge)?{charge:dropped.charge}:{})}],
        player.x+Math.sin(camera.rotation.y)*.8,player.z-.8,'player-drop');
      saveBackpack();refreshInventoryUI();
    });
    area.append(row);
  }
}
function refreshLootUI(){
  const bag=lootBags.get(selectedLootId),area=$('lootItems');
  area.replaceChildren();
  $('lootTitle').textContent=bag?'SEARCH · '+bag.source.toUpperCase():'LOOT BAG EMPTY';
  if(!bag){const p=document.createElement('p');p.textContent='NO ITEMS REMAINING';area.append(p);return;}
  for(let i=0;i<bag.items.length;i++){
    const entry=bag.items[i],item=getItem(entry.itemId),row=inventoryLine(item);
    const count=document.createElement('span');
    count.textContent=item.category==='power-plate'?
      Math.ceil(entry.condition)+' / '+item.maxDurability+' DUR':
      item.category==='fusion-core'?Math.ceil(entry.charge)+'% CORE':'×'+entry.quantity;
    count.className='loot-quantity';row.append(count);
    lootButton(row,'TAKE',()=>{
      const result=takeFromBag(backpack,bag,i);
      if(result.added&&bag.source==='power-cache')savePowerCache(bag.items);
      if(result.added&&bag.source.startsWith('enemy-')&&!bag.xpGranted){
        bag.xpGranted=true;awardSpecialExperience(15,'loot');
        if(Math.random()<specialModifiers.salvageChance)
          addItem(backpack,'supply:salvage',1);
      }
      if(!result.added){
        $('lootFeedback').textContent='BACKPACK FULL · '+backpack.items.length+
          ' / '+BACKPACK_LIMIT+' SLOTS. DROP SOMETHING TO MAKE ROOM.';
        return;
      }
      if(item.category==='ammo')syncAmmoToWeapons();
      const total=countItem(backpack,entry.itemId);
      $('lootFeedback').textContent=item.category==='ammo'?
        'AUTO-STORED · +'+result.added+' '+item.name.toUpperCase()+
        ' · RESERVE '+displayAmmoCount(total):
        'TAKEN · '+item.name.toUpperCase()+' ×'+result.added+' · NOW OWN '+total+
        (total===1?' COPY':' COPIES');
      saveBackpack();refreshWeaponHUD();discardEmptyLootBags();
      refreshLootUI();refreshInventoryUI();
    });
    area.append(row);
  }
}
function beginLootOverlay(id=null){
  const fromField=controls.isLocked;
  if(fromField)controls.unlock();
  lootOverlayFromField=fromField;
  if(id){
    selectedLootId=id;lootOpen=true;inventoryOpen=false;
    $('lootFeedback').textContent='DUPLICATE WEAPONS AND ARMOR ARE ALLOWED · 30 SLOTS MAX';
    $('inventoryPanel').classList.add('hidden');
    $('lootPanel').classList.remove('hidden');
    refreshLootUI();
  }else{
    lootOpen=false;inventoryOpen=true;
    $('lootPanel').classList.add('hidden');
    $('inventoryPanel').classList.remove('hidden');
    refreshInventoryUI();
  }
  $('menu').classList.add('hidden');
}
function closeLootOverlay(){
  lootOpen=false;inventoryOpen=false;selectedLootId=null;
  $('inventoryPanel').classList.add('hidden');
  $('lootPanel').classList.add('hidden');
  if(lootOverlayFromField){
    lootOverlayFromField=false;controls.lock();
  }else $('menu').classList.remove('hidden');
}
$('inventoryOpen').addEventListener('click',()=>beginLootOverlay());
$('inventoryClose').addEventListener('click',closeLootOverlay);
$('lootClose').addEventListener('click',closeLootOverlay);
$('lootTakeAll').addEventListener('click',()=>{
  const bag=lootBags.get(selectedLootId);if(!bag)return;
  const result=takeAllFromBag(backpack,bag);
  if(result.added>0&&bag.source.startsWith('enemy-')&&!bag.xpGranted){
    bag.xpGranted=true;awardSpecialExperience(15,'loot');
    if(Math.random()<specialModifiers.salvageChance)addItem(backpack,'supply:salvage',1);
  }
  if(bag.source==='power-cache')savePowerCache(bag.items);
  syncAmmoToWeapons();refreshWeaponHUD();
  $('lootFeedback').textContent=result.remaining?
    'BACKPACK FULL · '+result.remaining+' ITEMS LEFT IN BAG · DROP ITEMS FOR SPACE':
    'TAKEN ALL · DUPLICATE GEAR KEPT AS SEPARATE INVENTORY COPIES';
  saveBackpack();discardEmptyLootBags();refreshLootUI();refreshInventoryUI();
});


function benchWithinReach(){return Math.hypot(player.x-opticBench.x,player.z-opticBench.z)<3.8;}
function refreshWorkbenchUI(){
  const weaponId=$('benchWeapon').value;
  const attached=installedWeaponOptic(backpack,weaponId);
  $('benchMaterials').textContent='SALVAGED PARTS '+countItem(backpack,'supply:salvage')+
    ' · OPTIC GLASS '+countItem(backpack,'supply:optic-glass');
  const area=$('benchOptics');area.replaceChildren();
  for(const id of compatibleOptics(weaponId)){
    const mod=OPTIC_MODS[id],row=document.createElement('div');
    row.className='loot-entry';
    const detail=document.createElement('div');detail.className='loot-description';
    const title=document.createElement('strong');title.textContent=mod.name;
    const owned=id==='factory'||backpack.unlockedOptics?.[weaponId]?.includes(id);
    const requirements=document.createElement('small');
    requirements.textContent=owned?'OWNED · NO MATERIAL COST':
      'CRAFT · '+mod.cost.salvage+' SALVAGED PARTS + '+mod.cost.glass+' OPTIC GLASS';
    detail.append(title,requirements);row.append(detail);
    if(id===attached){
      const equipped=document.createElement('strong');equipped.textContent='INSTALLED';
      equipped.style.color='#a8e9bd';row.append(equipped);
    }else{
      lootButton(row,owned?'INSTALL':'CRAFT + INSTALL',()=>{
        const outcome=installWeaponOptic(backpack,weaponId,id);
        if(!outcome.ok){
          showShotNotice(outcome.reason==='materials'?'NOT ENOUGH WORKBENCH MATERIALS':
            'SIGHT INCOMPATIBLE');return;
        }
        // Rebuild only this weapon's 3D optic; everything else stays mounted.
        if(weaponId!=='scrap-pistol'){
          const old=weaponVisuals.get(weaponId);
          camera.remove(old.root);
          const replacement=buildArsenalView(getWeaponSpec(weaponId));
          replacement.root.visible=weaponId===activeWeaponId;
          weaponVisuals.set(weaponId,replacement);
          if(weaponId===activeWeaponId&&aimHeld)alignActiveSight();
        }
        saveBackpack();refreshWorkbenchUI();refreshInventoryUI();refreshWeaponHUD();
        showShotNotice((outcome.crafted?'CRAFTED + INSTALLED · ':'INSTALLED · ')+
          mod.name.toUpperCase());
      });
    }
    area.append(row);
  }
}
function beginWorkbench(){
  if(WEAPON_REBUILD_MODE){showShotNotice('WORKBENCH OFFLINE · NEW WEAPONS COMING');return;}
  if(inventoryOpen||lootOpen)closeLootOverlay();
  workbenchFromField=controls.isLocked;
  if(workbenchFromField)controls.unlock();
  workbenchOpen=true;
  $('benchWeapon').value=activeWeaponId;
  refreshWorkbenchUI();
  $('workbenchPanel').classList.remove('hidden');
  $('menu').classList.add('hidden');
}
function closeWorkbench(){
  workbenchOpen=false;$('workbenchPanel').classList.add('hidden');
  if(workbenchFromField){workbenchFromField=false;controls.lock();}
  else $('menu').classList.remove('hidden');
}
for(const spec of ARSENAL){
  const option=document.createElement('option');
  option.value=spec.id;option.textContent=spec.name;
  $('benchWeapon').append(option);
}
$('benchWeapon').addEventListener('change',refreshWorkbenchUI);
$('workbenchOpen').addEventListener('click',beginWorkbench);
$('benchClose').addEventListener('click',closeWorkbench);

// Combat is available in Station 9 AND when physically entering the
// arena on foot from another station. Keep Station 9 alive on roaming.
function inAIArena(){return isArenaActive(stationIndex,player);}
const playerHealth=createPlayerHealth();
let playerHitFlash=0;
const enemyTracers=[];
const tracerMat=new THREE.LineBasicMaterial({color:0xffa760,transparent:true,opacity:.92});
function enemyTracer(from,to){
  const geo=new THREE.BufferGeometry().setFromPoints([from,to]);
  const line=new THREE.Line(geo,tracerMat);scene.add(line);
  enemyTracers.push({line,time:.15});
  if(enemyTracers.length>12){
    const old=enemyTracers.shift();scene.remove(old.line);old.line.geometry.dispose();
  }
}
function refreshPlayerHealth(){
  const fraction=playerHealth.health/playerHealth.maxHealth;
  $('fieldHealth').textContent=Math.ceil(playerHealth.health);
  $('fieldHealthFill').style.width=(fraction*100).toFixed(1)+'%';
  $('fieldHud').classList.toggle('critical',fraction<=.35);
  $('visorHealth').textContent=Math.ceil(playerHealth.health)+' / '+
    playerHealth.maxHealth+' HP';
  setVisorDial('hp',fraction*100);
  $('healthReadout').textContent=Math.ceil(playerHealth.health)+' / '+playerHealth.maxHealth+' HP';
  $('healthFill').style.width=(fraction*100).toFixed(1)+'%';
  $('healthFill').classList.toggle('low',fraction<=.35);
  $('healthStatus').textContent=!playerHealth.alive?'DOWN · H TO RESPAWN':
    fraction<=.35?'CRITICAL · H TO HEAL':'H TO HEAL / RESET';
}
function healPlayer(){
  resetPlayerHealth(playerHealth);playerHitFlash=0;
  refreshPlayerHealth();
  if(inAIArena())resetPlayer(8);
  showShotNotice('HEALTH RESTORED · 100 HP');
}
refreshPlayerHealth();
// Combat radar only reveals enemies who have detected or engaged the
// player. Contacts linger briefly after sight breaks to prevent UI flicker.
const enemyRadarDots=new Map();
function updateEnemyRadar(){
  const radar=$('enemyRadar');
  const visible=controls.isLocked&&powerArmorState.phase==='idle'&&playerHealth.alive;
  radar.classList.toggle('hidden',!visible);
  if(!visible)return;
  const heading=(((-camera.rotation.y*180/Math.PI)%360)+360)%360;
  const track=$('enemyRadarTrack');
  let shown=0;
  for(const enemy of enemies.values()){
    let dot=enemyRadarDots.get(enemy.id);
    if(!dot){
      dot=document.createElement('span');dot.className='enemy-radar-dot';
      dot.setAttribute('role','img');track.append(dot);
      enemyRadarDots.set(enemy.id,dot);
    }
    const alerted=enemy.state.alive&&enemy.radarAlertSeconds>0;
    dot.style.display=alerted?'block':'none';
    if(!alerted)continue;
    shown++;
    const towards=((Math.atan2(enemy.brain.x-player.x,
      -(enemy.brain.z-player.z))*180/Math.PI)+360)%360;
    const delta=((towards-heading+540)%360)-180;
    dot.style.left=(50+delta/180*47).toFixed(2)+'%';
    dot.classList.toggle('rear',Math.abs(delta)>90);
    const meters=Math.round(Math.hypot(enemy.brain.x-player.x,
      enemy.brain.z-player.z));
    dot.setAttribute('aria-label',enemy.label+' · '+meters+' metres');
    dot.title=enemy.label+' · '+meters+' m';
  }
  radar.setAttribute('aria-label',shown+' alerted enemies shown as red dots on a 360 degree compass');
}
// Pass a real 3D target silhouette to enemy perception. The base player
// object stores horizontal coordinates, so the old NPCs never learned that
// power armor (or a raised platform) puts the shootable body above a crate.
function playerCombatSilhouette(){
  const height=powerArmorState.occupied?
    (player.crouched?POWER_ARMOR_CROUCH_HEIGHT:POWER_ARMOR_STAND_HEIGHT):
    (player.crouched?1.22:1.76);
  const feet=groundHeight(player.x,player.z)+player.jump;
  return {x:player.x,z:player.z,aimY:feet+height*.76,
    headY:feet+height*.94};
}
function enemySightBody(enemy){
  return {...enemy.brain,eyeY:1.53-.82*enemy.crouchBlend};
}
function updateEnemies(dt,elapsed=dt){
  // A confirmed hit outside the arena wakes combat while the enemy still
  // remembers the shooter. Otherwise other mechanics stations stay safe.
  const active=inAIArena()||[...enemies.values()].some(e=>
    e.state.alive&&e.brain.memory>0);
  const ticking=active&&controls.isLocked&&enemyAIEnabled;
  // Patrol, hit reactions and death cleanup update even at long range.
  // Actual attacks remain inside an active arena encounter.
  const simulating=controls.isLocked&&enemyAIEnabled;
  const statuses=[];
  let aliveCount=0;
  stepSquadIntel(squadIntel,dt,ticking&&playerHealth.alive);
  const roster=[...enemies.values()];
  const playerSilhouette=playerCombatSilhouette();
  const perceptions=new Map(roster.map(e=>[e.id,
    e.state.alive&&hasSight(enemySightBody(e),playerSilhouette,bounds)]));
  // Assign independent orders BEFORE updating individual brains. The director
  // receives confirmed observations only, never the hidden player's position.
  const lostContactOrders=planSquadOrders(squadDirector,ticking?roster.map(e=>({
    id:e.id,brain:e.brain,tactics:e.tactics,state:e.state,
    visible:perceptions.get(e.id)})):[],dt,aiObstacles);
  for(const enemy of enemies.values()){
    // Trial gun gate belongs to the entire enemy loop, including status and
    // dead-NPC cleanup. Never declare this only inside the alive branch.
    const liveNpcGun=!WEAPON_REBUILD_MODE||
      (enemy.id===NPC_GUN_TRIAL_ROLE&&enemy.tactics.weaponId==='pipe-rifle');
    // Keep living NPCs rendered across the lab. On death show only a brief
    // collapse, then remove every body part; J restores the original actor.
    enemy.root.visible=enemy.state.alive||enemy.deathTimer<.7;
    enemy.billboard.mesh.visible=enemy.state.alive;
    enemy.beacon.visible=enemy.state.alive;
    if(active&&enemy.state.alive)aliveCount++;
    if(enemy.state.alive){
      const wasSpotted=enemy.brain.spotted;
      // Keep tactical decisions on last-seen intel when a wall hides us.
      // Feeding the live player to an investigating NPC is wallhack tracking.
      const directlyVisible=perceptions.get(enemy.id);
      const lostContactOrder=lostContactOrders.get(enemy.id);
       const tacticalTarget=directlyVisible?playerSilhouette:
        (enemy.brain.lastSeen||{x:enemy.brain.x,z:enemy.brain.z});
      tickEnemyTactics(enemy.tactics,enemy.brain,tacticalTarget,dt,aiObstacles,
        {enabled:simulating&&playerHealth.alive,
          targetVisible:directlyVisible,lostContactOrder,
          area:AI_TUNING.navigationArea,
          lowHealth:enemy.state.health<35,
          occupiedCover:occupiedSquadCover(roster,enemy.id),
          separation:squadSeparation(enemy.brain,roster)});
      const tactic=enemy.tactics;
      // Perception must include every solid lab wall, not just arena crates.
      stepEnemyBrain(enemy.brain,{x:player.x,z:player.z},dt,bounds,
        {enabled:simulating&&playerHealth.alive,playerInArena:active,
          targetVisible:directlyVisible,area:AI_TUNING.navigationArea,
          lostContactOrder,combatGoal:tactic.goal,
          combatHold:tactic.phase==='hold'||tactic.phase==='peek'||
            tactic.phase==='stand-fight'||tactic.phase==='suppress-long',
          combatCoverCommitted:tactic.coverCommit>0&&
            ['cover','reload','hold','peek','peek-move'].includes(tactic.phase),
          neighbors:roster.filter(other=>other.id!==enemy.id&&
            other.state.alive).map(other=>other.brain),
          combatFacePlayer:true,
          combatSpeed:ENEMY_PROFILES[enemy.id].moveSpeed*enemy.tactics.pace});
      // First confirmed enemy contact unlocks the red marker. During a
      // brief LOS break it persists for only 3 seconds; passive patrols,
      // unheard enemies and mere gunshot investigations stay unmarked.
      if(enemyAIEnabled&&enemy.brain.spotted)enemy.radarAlertSeconds=3;
      else enemy.radarAlertSeconds=Math.max(0,enemy.radarAlertSeconds-dt);
      if(ticking&&playerHealth.alive&&enemy.brain.spotted&&!wasSpotted)
        reportSquadContact(squadIntel,enemy.id,player);
      enemy.root.position.x=enemy.brain.x;enemy.root.position.z=enemy.brain.z;
      // Visibly duck behind low cover, with consistent LOWERED hitboxes.
      // ~0.82 m of crouch travel keeps the head under the 1.45 m crate.
      const wantedCrouch=enemy.tactics.crouching?1:0;
      enemy.crouchBlend+=(wantedCrouch-enemy.crouchBlend)*
        (1-Math.exp(-13*dt));
      enemy.upperBody.position.y=-.82*enemy.crouchBlend;
      // Animated ready pose, short lean while peeking, rifle dip while
      // reloading, and a quick shoulder kick after actual shots.
      const shouldAim=liveNpcGun&&directlyVisible&&
        (enemy.brain.mode==='chase'||enemy.brain.retaliationTime>0)&&
        !enemy.tactics.crouching&&enemy.tactics.reloadRemaining===0;
      enemy.combatPose+=(Number(shouldAim)-enemy.combatPose)*
        (1-Math.exp(-7*dt));
      enemy.reloadPose+=(Number(enemy.tactics.reloadRemaining>0)-enemy.reloadPose)*
        (1-Math.exp(-10*dt));
      enemy.recoilPose=Math.max(0,enemy.recoilPose-dt*6);
      const peeking=enemy.tactics.phase==='peek'||enemy.tactics.phase==='peek-move';
      enemy.upperBody.rotation.z+=( (peeking?.11*enemy.tactics.strafeSign:0)-
        enemy.upperBody.rotation.z)*(1-Math.exp(-8*dt));
      enemy.upperBody.rotation.x=-.16*enemy.reloadPose+
        .08*enemy.recoilPose;
      enemy.walkPhase+=dt*(enemy.brain.moving?9*Math.max(.65,enemy.tactics.pace):0);
      const move=enemy.brain.moving?1:0;
      for(const {pivot,side,kind} of enemy.limbs){
        pivot.rotation.x=Math.sin(enemy.walkPhase+side*Math.PI/2)*
          (kind==='leg'?.38:.23)*move+
          (kind==='arm'?(.20*enemy.combatPose-.38*enemy.reloadPose):0);
        if(kind==='leg'){
          pivot.position.y=.97-.30*enemy.crouchBlend;
          pivot.scale.y=1-.34*enemy.crouchBlend;
          pivot.rotation.z=side*.25*enemy.crouchBlend;
        }
      }
      // Apply the actual facing before computing torso turns, then animate
      // from measured velocity so blocked NPCs never run in place.
      enemy.root.rotation.y=enemy.brain.yaw;
       // Recheck after locomotion: the guard may have just reached the edge
       // of a wall. This exact visible height drives both the gun and tracer.
       const aimedHeight=directlyVisible?
         visibleTargetHeight(enemySightBody(enemy),playerSilhouette,bounds):null;
       const aimPitch=aimedHeight===null?0:enemyAimPitch(enemy.brain,
         {x:player.x,z:player.z,y:aimedHeight},
         1.43-.82*enemy.crouchBlend);
      enemy.rigged?.update(dt,{
        moving:enemy.brain.moving,
        speed:enemy.brain.actualSpeed,
        crouched:enemy.tactics.crouching,
         aiming:shouldAim,aimPitch,
         reloading:liveNpcGun&&enemy.tactics.reloadRemaining>0,
        reloadProgress:enemy.tactics.reloadRemaining>0?1-
          enemy.tactics.reloadRemaining/
          (getEnemyWeapon(enemy.tactics.weaponId)?.reloadSeconds||2):0,
        recoil:enemy.recoilPose,hit:enemy.flash/.22,
        alive:enemy.state.alive
      });
      enemy.root.rotation.z=Math.sin(enemy.flash*30)*enemy.shake*.045;
      enemy.shake=Math.max(0,enemy.shake-dt*3);
      enemy.flash=Math.max(0,enemy.flash-dt);
      if(enemy.flash===0)for(const mesh of enemy.meshes)mesh.material.emissive.setHex(0);
      const attack=getEnemyWeapon(enemy.tactics.weaponId)||ENEMY_ATTACK[enemy.id];
      if(ticking&&playerHealth.alive&&liveNpcGun){
        // A shot is only attempted when the NPC can see the player and has
        // a clear trajectory; mags, reloads and accuracy are authoritative.
        if(enemy.brain.aimLockSeconds>=
            ENEMY_PROFILES[enemy.tactics.kind].reactionSeconds&&
           directlyVisible&&aimedHeight!==null&&
           canEnemyFire(enemySightBody(enemy),playerSilhouette,bounds,attack.range)&&
           Math.abs((enemy.rigged?.getAimPitch?.()??0)-aimPitch)<.13&&
          !enemy.tactics.crouching&&enemy.tactics.reloadRemaining===0){
          const shot=attemptEnemyShot(enemy.tactics,
            Math.hypot(enemy.brain.x-player.x,enemy.brain.z-player.z),
            enemy.brain.moving,Math.random);
          if(shot.fired){
            enemy.gunGlow=.11;enemy.recoilPose=1;
            sound.gunshot(attack.soundKind||'rifle');
            // Match the visible rifle muzzle rather than firing from a
            // fixed point in the centre of the NPC's chest.
            const origin=enemy.rigged?.getMuzzleWorldPosition()||
              new THREE.Vector3(enemy.brain.x,1.43,enemy.brain.z);
             const target=new THREE.Vector3(player.x,aimedHeight,player.z);
            if(!shot.hit){
              // Miss tracers visibly pass beside the player rather than
              // striking the exact position yet dealing zero damage.
              const side=enemy.tactics.strafeSign;
              target.x+=side*(1.8+(1-shot.accuracy)*2.0);
              target.y+=.4;
              target.z+=side*.9;
            }
            // Even a missed tracer must stop where it meets a solid wall.
            // Damage is applied only if the actual 3D segment is unobstructed.
            const obstruction=firstSolidHit(origin,target,bounds);
            const endpoint=obstruction?
              new THREE.Vector3(obstruction.point.x,obstruction.point.y,
                obstruction.point.z):target;
            enemyTracer(origin,endpoint);
            if(shot.hit&&!obstruction){
              const bodySlots=['chest','chest','chest','head','leftArm',
                'rightArm','leftLeg','rightLeg'];
              const zone=bodySlots[Math.floor(Math.random()*bodySlots.length)];
              const armor=playerArmorReduction(backpack,zone);
              const incoming=calculateIncomingShot(attack.damage,armor.points,
                powerArmorState,zone);
              const result=hitPlayer(playerHealth,incoming.damage*specialModifiers.damageTakenMultiplier);
              if(powerArmorState.occupied){
                const wear=damagePowerPlate(powerArmorState,zone,attack.damage);
                if(wear.worn>0){
                  savePowerArmor();
                  if(wear.broken)poweredSuit.updatePlates(powerArmorState);
                }
              }
              if(result.applied){
                if(!playerHealth.alive)keys.clear();
                refreshPlayerHealth();playerHitFlash=.48;
                const blocked=(attack.damage-result.damage).toFixed(1);
                showShotNotice(playerHealth.alive?
                  enemy.label+' HIT · -'+result.damage.toFixed(1)+
                  ' HP · '+blocked+' BLOCKED':
                  'YOU ARE DOWN · PRESS H TO RESPAWN');
              }
            }
          }
        }
      }
    }else{
      // Death cleanup must follow actual elapsed time under slow software rendering.
      enemy.deathTimer+=Math.max(0,elapsed);
      enemy.rigged?.update(dt,{alive:false,moving:false,hit:0,recoil:0});
      // One short fall, then despawn: no permanent corpse/ring clutter.
      enemy.root.rotation.z+=(-1.18-enemy.root.rotation.z)*(1-Math.exp(-10*dt));
      if(enemy.deathTimer>=.7)enemy.root.visible=false;
    }
    enemy.gunGlow=Math.max(0,enemy.gunGlow-dt);
    enemy.muzzleLight.intensity=enemy.gunGlow>0?5:0;
    const mode=!enemy.state.alive?'DOWN':
      !enemyAIEnabled?'PAUSED':!playerHealth.alive?'PLAYER DOWN':
        enemy.tactics.reloadRemaining>0?'RELOAD':
        enemy.tactics.crouching?'CROUCHED':
        enemy.tactics.phase==='peek'?'PEEK & FIRE':
        enemy.tactics.phase==='peek-move'?'PEEKING':
        enemy.tactics.phase==='cover'?'SEEK COVER':
        enemy.tactics.phase==='guard-angle'?'HOLDING LAST ANGLE':
        enemy.tactics.phase==='flank-search'?'SEARCHING FLANK':
        enemy.tactics.phase==='support-search'?'COVERING APPROACH':
        enemy.tactics.phase==='flank'?'FLANKING':
        enemy.tactics.phase==='suppress-long'?'LONG-RANGE SUPPRESSION':
        enemy.tactics.phase==='suppress'?'SUPPRESSING':
        enemy.tactics.phase==='strafe'?'STRAFE':
        enemy.tactics.phase==='stand-fight'?'STANDING AND FIRING':
        enemy.brain.mode.toUpperCase();
    refreshEnemyLabel(enemy,mode);
    enemy.billboard.mesh.position.set(enemy.brain.x,
      2.72-.78*enemy.crouchBlend,enemy.brain.z);
    statuses.push(!liveNpcGun?enemy.label+': UNARMED':
      enemy.label+': '+mode+' ['+
      enemy.tactics.magazine+'/'+(getEnemyWeapon(enemy.tactics.weaponId)?.magazine||
        ENEMY_PROFILES[enemy.id].magazine)+']');
  }
  if(ticking&&playerHealth.alive)
    shareSquadContact(squadIntel,[...enemies.values()],bounds,player);
  for(let i=enemyTracers.length-1;i>=0;i--){
    const t=enemyTracers[i];t.time-=dt;
    if(t.time<=0){scene.remove(t.line);t.line.geometry.dispose();enemyTracers.splice(i,1);}
  }
  playerHitFlash=Math.max(0,playerHitFlash-dt);
  $('playerDamageFlash').style.opacity=(playerHitFlash*.52).toFixed(2);
  updateEnemyRadar();
  $('enemyHud').classList.toggle('hidden',!active);
  if(active){
    const surviving=[...enemies.values()].filter(e=>e.state.alive);
    const nearest=surviving.length?Math.min(...surviving.map(e=>
      Math.hypot(e.brain.x-player.x,e.brain.z-player.z))):null;
    $('enemyCount').textContent=aliveCount+' / '+enemies.size+' RAIDERS ALIVE'+
      (nearest===null?' · ALL ELIMINATED':' · NEAREST '+nearest.toFixed(1)+' m');
    $('enemyList').textContent=statuses.join('  ·  ');
    $('enemyMode').textContent=WEAPON_REBUILD_MODE?'PIPE RIFLE TRIAL · ONLY RAIDER ARMED':combatRuntimeStatus({
      active,locked:controls.isLocked,aiEnabled:enemyAIEnabled,
      playerAlive:playerHealth.alive,aliveCount
    });
  }
}

// Recognisable first-person makeshift pistol rather than a HUD-only crosshair.
// All meshes are viewmodel geometry; the shared weapons.mjs owns the rules.
const arsenalStates=createArsenalStates();
for(const spec of ARSENAL)arsenalStates[spec.id].reserve=ammoReserve(backpack,spec.id);
let activeWeaponId=TEN_MM_PISTOL.id;
let activeSpec=TEN_MM_PISTOL;
let weaponState=arsenalStates[activeWeaponId];
let triggerHeld=false,aimHeld=false;
let infiniteAmmo=false; // test-only cheat, always starts OFF
const preInfiniteAmmo=new Map();
// The dry-fire click is a trigger-edge event, NOT a frame-loop sound.
let emptyClickLatched=false;
let dryFireClicks=0;
const viewRecoil=createWeaponRecoilState();
const pistol=new THREE.Group();
camera.add(pistol);
pistol.position.set(.32,-.31,-.77);
const metal=mat(0x676b65,.52),receiver=mat(0x38464a,.5),
  rust=mat(0x855b45,.87),wood=mat(0x75583e,.86),sights=mat(0x111a1e,.55);
function gunPart(geometry,material,x,y,z,parent=pistol){
  const part=new THREE.Mesh(geometry,material);
  part.position.set(x,y,z);parent.add(part);return part;
}
gunPart(new THREE.BoxGeometry(.19,.14,.37),receiver,0,.015,.02);
// The entire top slide and its sights move when the action cycles.
const slideGroup=new THREE.Group();pistol.add(slideGroup);
gunPart(new THREE.BoxGeometry(.21,.105,.24),metal,0,.097,-.065,slideGroup);
const barrel=gunPart(new THREE.CylinderGeometry(.043,.053,.43,12),rust,0,.057,-.35);
barrel.rotation.x=-Math.PI/2;
const muzzle=gunPart(new THREE.TorusGeometry(.050,.012,8,16),sights,0,.057,-.57);
gunPart(new THREE.BoxGeometry(.14,.27,.12),wood,0,-.19,.16).rotation.x=-.18;
gunPart(new THREE.TorusGeometry(.08,.014,8,20),metal,0,-.12,.017);
// Narrow rear notch: the front blade is framed, not lost between wide posts.
for(const side of [-1,1])gunPart(new THREE.BoxGeometry(.018,.055,.035),
  sights,.043*side,.1795,.10,slideGroup);
const pistolFrontSight=gunPart(new THREE.BoxGeometry(.028,.060,.040),
  sights,0,.177,-.42,slideGroup);
pistolFrontSight.userData.sightReference=true;
// Layered slide, detailed grip and ejection port, keeping W02 animations.
gunPart(new THREE.BoxGeometry(.205,.026,.31),metal,0,.119,-.13,slideGroup);
for(const side of [-1,1]){
  gunPart(new THREE.BoxGeometry(.013,.085,.26),rust,side*.11,.036,-.10);
  gunPart(new THREE.BoxGeometry(.011,.21,.095),wood,side*.081,-.25,.155).rotation.x=-.17;
  for(let z=-.29;z<-.18;z+=.038)
    gunPart(new THREE.BoxGeometry(.007,.05,.009),sights,side*.115,.12,z,slideGroup);
}
gunPart(new THREE.BoxGeometry(.017,.045,.102),sights,.109,.102,-.115,slideGroup);
gunPart(new THREE.BoxGeometry(.13,.065,.13),rust,.005,.065,.19);
gunPart(new THREE.BoxGeometry(.09,.06,.12),wood,.14,-.19,.14);
// Visible inserted magazine and procedural gloved hands (no skeletal rig yet).
const magazine=gunPart(new THREE.BoxGeometry(.10,.19,.095),metal,0,-.34,.17);
const magazineBase=gunPart(new THREE.BoxGeometry(.125,.025,.115),sights,0,-.445,.17);
const glove=mat(0x313b40,.95),seam=mat(0x69716b,.92);
gunPart(new THREE.BoxGeometry(.165,.175,.18),glove,.09,-.26,.21);
gunPart(new THREE.BoxGeometry(.09,.035,.16),seam,.135,-.18,.21);
const reloadHand=new THREE.Group();pistol.add(reloadHand);
gunPart(new THREE.SphereGeometry(.095,10,8),glove,0,0,0,reloadHand);
gunPart(new THREE.BoxGeometry(.11,.14,.17),glove,-.07,-.075,.06,reloadHand);
reloadHand.visible=false;
const muzzleGlow=new THREE.PointLight(0xffaa58,0,1.8,2);
muzzleGlow.position.set(0,.057,-.57);pistol.add(muzzleGlow);
// Screen-facing, textured flare at the actual 3D barrel tip.
const flareCanvas=document.createElement('canvas');
flareCanvas.width=flareCanvas.height=128;
const flareCtx=flareCanvas.getContext('2d');
const flareGradient=flareCtx.createRadialGradient(64,64,4,64,64,63);
flareGradient.addColorStop(0,'rgba(255,255,235,1)');
flareGradient.addColorStop(.22,'rgba(255,230,116,.95)');
flareGradient.addColorStop(.55,'rgba(255,128,31,.62)');
flareGradient.addColorStop(1,'rgba(255,90,0,0)');
flareCtx.fillStyle=flareGradient;flareCtx.fillRect(0,0,128,128);
const flareTex=new THREE.CanvasTexture(flareCanvas);
flareTex.colorSpace=THREE.SRGBColorSpace;
const muzzleFlare=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),
  new THREE.MeshBasicMaterial({map:flareTex,transparent:true,depthWrite:false,
    blending:THREE.AdditiveBlending,side:THREE.DoubleSide}));
muzzleFlare.position.set(0,.057,-.595);
muzzleFlare.visible=false;muzzleFlare.userData.ignoreSightProbe=true;
pistol.add(muzzleFlare);

// Six visually distinct 3D models; the approved pistol model stays intact.
// Each non-pistol model owns a muzzle, moving magazine and reload hand.
const weaponVisuals=new Map();
weaponVisuals.set(SCRAP_PISTOL.id,{
  root:pistol,slideGroup,magazine,magazineBase,reloadHand,muzzleGlow,muzzleFlare,
  magBaseY:-.34,magFootY:-.445,flashScale:1,defaultX:.32,
  sightLocal:new THREE.Vector3(0,.207,-.16),
  ejectionLocal:new THREE.Vector3(.12,.12,-.115)
});
// W05.1: upgraded original low-poly procedural weapon models.
// All mounted sights are ACTUAL in-world geometry using weapon-sights.mjs.
// The optic center is exactly on the camera -Z firing ray during ADS.
function buildArsenalView(spec){
  const mount=sightMount(spec.id);
  const opticId=installedWeaponOptic(backpack,spec.id);
  const opticKind=sightForOptic(spec.id,opticId).optic;
  const root=new THREE.Group();camera.add(root);
  root.position.set(.29,-.27,-.77);
  const rifle=['carbine','rifle','shotgun'].includes(spec.kind);
  const revolver=spec.kind==='revolver',smg=spec.kind==='smg';
  const shotgun=spec.kind==='shotgun',scoped=spec.kind==='rifle';
  const length=scoped?.85:shotgun?.79:spec.kind==='carbine'?.72:smg?.51:.40;
  const base=mat(spec.kind==='carbine'?0x414f53:spec.kind==='rifle'?0x5b5650:
    spec.kind==='shotgun'?0x50575a:smg?0x596363:0x696059,.59);
  const steel=mat(0x2a363b,.43),oxide=mat(0x8c7660,.79),
    walnut=mat(0x6b4c35,.84),trim=mat(0xa09b85,.5),
    polymer=mat(0x34413e,.76),black=mat(0x101b20,.3);
  const part=(geometry,material,x,y,z,parent=root)=>{
    const mesh=new THREE.Mesh(geometry,material);
    mesh.position.set(x,y,z);mesh.castShadow=false;
    parent.add(mesh);return mesh;
  };
  const box=(w,h,d,material,x,y,z,parent=root)=>part(
    new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);
  const cylinder=(radius,depth,material,x,y,z,parent=root)=>{
    const mesh=part(new THREE.CylinderGeometry(radius,radius,depth,12),
      material,x,y,z,parent);mesh.rotation.x=Math.PI/2;return mesh;
  };
  // Extruded, chamfered receiver silhouette — unlike the previous plain box,
  // this produces a stepped, shaped housing with angled shoulders.
  function receiver(points,width,material){
    const outline=new THREE.Shape();
    outline.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)outline.lineTo(points[i][0],points[i][1]);
    outline.closePath();
    const geo=new THREE.ExtrudeGeometry(outline,{depth:width,
      steps:1,bevelEnabled:true,bevelSize:.009,bevelThickness:.007,
      bevelSegments:1,curveSegments:2});
    const mesh=part(geo,material,width/2,0,0);
    mesh.rotation.y=-Math.PI/2;
    return mesh;
  }
  receiver([[-.36,.10],[-.31,.145],[-.09,.145],[.12,.11],
    [.15,-.085],[-.13,-.08],[-.34,-.04]],rifle?.19:.16,base);
  // Different grip angles and grip scales create legible silhouettes.
  const grip=box(.125,.33,.165,revolver?walnut:polymer,0,-.18,.13);
  grip.rotation.x=-.27;
  for(const side of [-1,1]){
    box(.009,.20,.13,revolver?oxide:black,side*.07,-.19,.145);
    const screw=part(new THREE.CylinderGeometry(.012,.012,.007,8),
      trim,side*.078,-.17,.14);
    screw.rotation.z=Math.PI/2;
  }
  const trigger=part(new THREE.TorusGeometry(.087,.011,7,16,Math.PI*1.25),
    steel,0,-.14,-.01);
  trigger.rotation.z=-.35;
  const triggerBlade=box(.016,.095,.028,trim,0,-.13,-.065);
  triggerBlade.rotation.x=.25;
  // Long-gun stocks do not attach to thin pistol grips like a generic block.
  if(rifle){
    receiver([[.10,.03],[.28,.028],[.43,-.025],[.43,-.17],
      [.17,-.18],[.10,-.09]],.16,scoped||shotgun?walnut:polymer);
    box(.18,.16,.032,black,0,-.08,.44);
  }else if(smg){
    box(.14,.10,.29,steel,0,.005,.31);
    box(.17,.18,.04,polymer,0,-.035,.46);
  }else{
    box(.12,.15,.12,walnut,0,-.22,.20);
  }
  // Barrel, fore-end and distinct furniture, shaped per archetype.
  let pumpGrip=null,cylinderBody=null,cylinderYoke=null,
    cylinderSpinGroup=null,boltHandle=null;
  const boreY=.045;
  const barrelZ=-.27-length*.38,barrelEnd=-.27-length*.84;
  cylinder(shotgun?.052:scoped?.037:revolver?.052:.036,
    length*.78,black,0,boreY,barrelZ);
  cylinder(shotgun?.057:scoped?.043:.044,.04,trim,0,boreY,barrelEnd);
  if(shotgun){
    cylinder(.028,length*.72,oxide,0,-.025,barrelZ);
    pumpGrip=box(.24,.125,.25,walnut,0,.012,-.34);
    pumpGrip.rotation.x=.02;
    for(const side of [-1,1])for(let z=-.43;z<-.24;z+=.042)
      box(.008,.05,.016,black,side*.124,.012,z);
  }else if(scoped){
    box(.205,.125,.30,walnut,0,.055,-.33);
    for(const side of [-1,1]){
      box(.018,.018,.26,trim,side*.106,.12,-.32);
      for(let z=-.42;z<-.20;z+=.073)box(.018,.04,.017,steel,side*.105,.073,z);
    }
    // The bolt handle and knob are ONE articulated assembly, so the
    // shooter can lift, draw, chamber rounds, and lock it shut.
    boltHandle=new THREE.Group();boltHandle.position.set(.11,.084,-.035);
    root.add(boltHandle);
    const bolt=box(.10,.038,.06,trim,0,0,0,boltHandle);
    bolt.rotation.z=.14;
    part(new THREE.SphereGeometry(.037,9,7),black,.08,-.039,.015,boltHandle);
  }else if(spec.kind==='carbine'){
    const handguard=box(.25,.18,.39,polymer,0,.06,-.41);
    for(const side of [-1,1]){
      for(let z=-.54;z<-.25;z+=.072)
        box(.015,.06,.037,black,side*.13,.075,z);
      box(.021,.025,.29,trim,side*.125,.15,-.41);
    }
    box(.20,.035,.48,steel,0,.17,-.28);
    for(let z=-.55;z<.03;z+=.085)box(.14,.013,.035,black,0,.189,z);
  }else if(smg){
    const guard=box(.21,.17,.26,steel,0,.075,-.22);
    for(let z=-.32;z<-.11;z+=.065)
      box(.15,.016,.022,oxide,0,.166,z);
    box(.10,.12,.14,polymer,0,-.04,-.35);
  }else if(revolver){
    // Cylinder axis is along the barrel (-Z), not across the frame (X).
    // The ACTUAL six-shot cylinder swings left on its yoke. Previously a
    // fake second cylinder appeared while the real one vanished.
    cylinderYoke=new THREE.Group();
    cylinderYoke.position.set(-.13,.036,-.10);root.add(cylinderYoke);
    cylinderSpinGroup=new THREE.Group();
    cylinderSpinGroup.position.x=.13;cylinderYoke.add(cylinderSpinGroup);
    const drum=part(new THREE.CylinderGeometry(.099,.099,.182,12),oxide,
      0,0,0,cylinderSpinGroup);
    drum.rotation.x=Math.PI/2;cylinderBody=drum;
    for(let i=0;i<6;i++){
      const angle=i*Math.PI/3;
      part(new THREE.SphereGeometry(.017,8,6),black,
        Math.sin(angle)*.069,Math.cos(angle)*.069,-.101,cylinderSpinGroup);
    }
    // The old .065-high top button peaked at y=.1645 (the ADS sight is
    // y=.165) and completely blocked the notch. Real low top-strap here.
    box(.15,.035,.25,trim,0,.106,-.23);
    // Put the cylinder release latch to the left of the sight line.
    box(.028,.044,.058,steel,-.126,.12,-.055);
  }
  for(const side of [-1,1]){
    // Ejection-port and asymmetrical bolt panels.
    if(side===1&& !revolver)box(.014,.055,.12,black,.108,.087,-.035);
    if(rifle||smg)box(.016,.028,.18,oxide,side*.109,-.01,-.16);
  }
  // W19.1: salvaged receivers, seams and mismatched fittings. Each
  // firearm has unique side furniture, without blocking calibrated ADS.
  const chip=mat(0xa18b71,.81),tape=mat(0x50584b,.94),
    copper=mat(0x9e6847,.53);
  for(const side of [-1,1]){
    const panel=box(.014,.12,rifle?.34:.22,
      side<0?oxide:base,side*.117,.013,-.15);
    panel.rotation.z=side*.045;
    for(let n=0;n<4;n++){
      const pin=part(new THREE.SphereGeometry(.011,7,6),chip,
        side*.129,.064-n*.030,-.26+(n%2)*.17);
      pin.userData.gunDetail=true;
    }
    const wristBand=box(.018,.05,.18,tape,
      side*(rifle?.122:.105),-.056,-.34);
    wristBand.rotation.y=side*.06;
  }
  if(smg){
    for(let i=0;i<5;i++){
      const coil=part(new THREE.TorusGeometry(.048,.007,5,16),
        copper,0,.048,-.49+i*.053);
      coil.userData.gunDetail=true;
    }
    box(.028,.12,.16,chip,.135,.043,-.15).rotation.z=-.17;
  }else if(shotgun){
    for(let i=0;i<3;i++){
      const shell=cylinder(.018,.088,i===1?copper:rust,0,-.03,.21+i*.07);
      shell.rotation.z=.12;
    }
    box(.23,.028,.12,tape,0,.075,-.38);
  }else if(scoped){
    for(let i=0;i<3;i++){
      box(.017,.025,.18,copper,.124,-.005,-.28-i*.09);
      box(.018,.014,.15,tape,-.12,.050,-.34-i*.065);
    }
    box(.048,.045,.21,chip,-.135,.04,.11).rotation.z=-.18;
  }else if(spec.kind==='carbine'){
    for(let z=-.52;z<-.27;z+=.059){
      box(.255,.018,.017,copper,0,-.002,z);
    }
    box(.024,.16,.20,oxide,.137,.025,-.09);
    box(.020,.13,.23,tape,-.143,.020,-.12);
  }else if(revolver){
    for(const sign of [-1,1]){
      box(.018,.14,.17,walnut,sign*.077,-.20,.13);
      for(let j=0;j<3;j++)
        part(new THREE.SphereGeometry(.009,7,6),chip,
          sign*.092,-.25+j*.04,.20);
    }
  }
  const slideGroup=new THREE.Group();root.add(slideGroup);
  if(!revolver)box(.12,.022,.095,trim,0,.124,-.055,slideGroup);
  // Actual optic centres have the exact calibrated y from SIGHT_MOUNTS.
  // No tall fake scopes or rotated ring planes.
  if(opticKind==='scope'){
    // Hollow scope tube: open at BOTH ends so the player can see through.
    const scopeBody=part(new THREE.CylinderGeometry(.069,.069,.40,18,1,true),
      new THREE.MeshStandardMaterial({color:0x202d33,metalness:.45,
        roughness:.46,side:THREE.DoubleSide}),0,mount.y,mount.z);
    scopeBody.rotation.x=Math.PI/2;
    for(const z of [mount.z+.198,mount.z-.198]){
      part(new THREE.TorusGeometry(.069,.014,9,22),black,0,mount.y,z);
      part(new THREE.TorusGeometry(.052,.005,6,22),trim,0,mount.y,z);
    }
    // Two very low scope clamps, not a 30cm tall scope mount.
    for(const z of [mount.z+.11,mount.z-.11]){
      box(.10,.046,.028,steel,0,mount.y-.085,z);
      box(.17,.018,.038,black,0,mount.y-.113,z);
    }
    // Four thin semi-transparent reticle arms. The old 0.026 m center
    // gap swallowed distant targets. New 0.006 m gap stays zeroed without
    // covering the exact point of impact.
    const crosshair=new THREE.MeshBasicMaterial({
      color:0xcbe2d6,transparent:true,opacity:.66,depthWrite:false
    });
    for(const side of [-1,1]){
      const horizontal=box(.034,.0018,.001,crosshair,
        side*.020,mount.y,mount.z-.197);
      const vertical=box(.0018,.034,.001,crosshair,
        0,mount.y+side*.020,mount.z-.197);
      horizontal.userData.sightReference=true;
      vertical.userData.sightReference=true;
    }
  }else if(opticKind==='holo'||opticKind==='reflex'){
    if(opticId==='holo-a'||opticId==='holo-b'){
      // Two separate 1x housings based on the recognizable Siege layouts:
      // A: NATO rectangular protective hood and circle-dot.
      // B: low-profile Russian trapezoid and open-top circle crosshair.
      // Reticles sit inside the real 3D aperture, not an overlay on the HUD.
      const nato=opticId==='holo-a',front=mount.z-.075;
      const mark=box(nato?.181:.155,.022,.145,black,0,mount.y-.088,mount.z);
      mark.userData.opticVariant=opticId;
      // Picatinny clamp, side adjustment and a rear-to-front optic body.
      box(nato?.142:.125,.018,.159,steel,0,mount.y-.113,mount.z);
      const dial=part(new THREE.CylinderGeometry(.020,.020,.022,14),
        oxide,nato?.103:.088,mount.y-.040,mount.z+.018);
      dial.rotation.z=Math.PI/2;
      const frame=mat(nato?0x30383a:0x353b38,.62);
      if(nato){
        // Squared EOTech-style shroud with generous straight-sided window.
        for(const x of [-.092,.092]){
          box(.020,.158,.046,frame,x,mount.y+.002,front);
          box(.012,.095,.12,steel,x,mount.y-.025,mount.z);
        }
        box(.199,.024,.051,frame,0,mount.y+.089,front);
        box(.182,.019,.053,frame,0,mount.y-.080,front);
        for(const x of [-.064,.064])
          box(.024,.012,.037,oxide,x,mount.y+.078,front);
      }else{
        // Russian-style thinner, sloped side frame and shallow rounded roof.
        for(const side of [-1,1]){
          const sideRail=box(.015,.137,.038,frame,
            side*.074,mount.y+.001,front);
          sideRail.rotation.z=side*.24;
          box(.012,.093,.10,steel,side*.078,mount.y-.030,mount.z);
        }
        box(.126,.016,.041,frame,0,mount.y+.078,front);
        box(.142,.018,.045,frame,0,mount.y-.075,front);
      }
      // Faint glass pane preserves the readable opening and doesn't block ADS.
      const glass=part(new THREE.PlaneGeometry(nato?.15:.115,.119),
        new THREE.MeshBasicMaterial({color:0x83b8a8,transparent:true,
          opacity:.055,depthWrite:false,side:THREE.DoubleSide}),
        0,mount.y+.001,front-.004);
      glass.userData.ignoreSightProbe=true;
      const reticleMat=new THREE.MeshBasicMaterial({
        color:0xff5847,depthTest:true,depthWrite:false
      });
      const reticleZ=front-.013;
      const circle=part(new THREE.TorusGeometry(nato?.021:.019,.0016,5,48,
        nato?Math.PI*2:Math.PI*1.50),reticleMat,0,mount.y,reticleZ);
      if(!nato)circle.rotation.z=3*Math.PI/4; // Holo B's missing top arc
      circle.userData.sightReference=true;
      const dot=part(new THREE.SphereGeometry(nato?.0036:.0025,10,8),
        reticleMat,0,mount.y,reticleZ+.001);
      dot.userData.sightReference=true;
      if(nato){
        for(const angle of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
          const tick=box(.006,.0018,.001,reticleMat,
            Math.cos(angle)*.025,mount.y+Math.sin(angle)*.025,reticleZ);
          tick.rotation.z=angle;
          tick.userData.sightReference=true;
        }
      }else{
        for(const side of [-1,1]){
          const tick=box(.010,.0015,.001,reticleMat,
            side*.027,mount.y-.003,reticleZ);
          tick.userData.sightReference=true;
        }
      }
    }else{
      // Factory reflex/holographic optics keep their original housing.
      const holo=opticKind==='holo';
      box(holo?.13:.105,.035,.15,black,0,mount.y-.074,mount.z);
      for(const x of [-.065,.065])
        box(.013,.11,.043,steel,x,mount.y-.008,mount.z);
      part(new THREE.TorusGeometry(holo?.069:.052,.009,8,22),
        trim,0,mount.y,mount.z-.07);
      const redDot=part(new THREE.SphereGeometry(.008,8,8),
        new THREE.MeshBasicMaterial({color:0xea5e42,depthTest:true}),
        0,mount.y,mount.z-.073);
      redDot.userData.sightReference=true;
    }
  }else{
    // Matched-height iron front and rear sights.
    // Open notch with the front blade tip precisely at the ADS line.
    // Rear posts never overlap x=0; the centre stays clear.
    box(.11,.022,.038,steel,0,mount.y-.041,.115);
    for(const side of [-1,1])
      box(.017,.055,.032,trim,side*.042,mount.y-.0275,.115);
    const frontBlade=box(.025,.052,.026,trim,0,
      mount.y-.026,barrelEnd-.02,slideGroup);
    frontBlade.userData.sightReference=true;
    // Iron front tip and rear notch are at equal world-space height.
  }
  // Revolvers use a cylinder and shotguns feed through a tube, not a
  // pistol-style bottom box magazine. Keep an animated shell/loader prop
  // for the shared reload UI while hiding the irrelevant mag assembly.
  const enclosed=revolver||shotgun;
  const magBaseY=enclosed?-.235:-.275;
  const magFootY=magBaseY-.132;
  const magLength=scoped?.15:smg?.31:.24;
  const magZ=smg?-.01:.03;
  const magazine=box(.126,magLength,.13,oxide,0,magBaseY,magZ);
  const magazineBase=box(.145,.028,.15,black,0,magFootY,magZ);
  magazine.visible=!enclosed;
  magazineBase.visible=!enclosed;
  const reloadHand=new THREE.Group();root.add(reloadHand);
  part(new THREE.SphereGeometry(.094,10,8),glove,0,0,0,reloadHand);
  box(.12,.15,.14,glove,-.045,-.09,.04,reloadHand);
  reloadHand.visible=false;
  // A visible cylinder release (revolver) or shell-port (shotgun) moves
  // during reload; firearm-specific rather than a floating pistol mag.
  const reloadAction=new THREE.Group();root.add(reloadAction);
  if(revolver||shotgun||scoped){
    // One authored cartridge cycles through the loading port, with its
    // progress repeated six times for revolver/shotgun or five for rifle.
    const loadingShell=part(new THREE.CylinderGeometry(.023,.023,.09,9),
      oxide,0,0,0,reloadAction);
    loadingShell.rotation.x=Math.PI/2;
    const primer=part(new THREE.CylinderGeometry(.024,.024,.009,8),
      trim,0,0,.05,reloadAction);
    primer.rotation.x=Math.PI/2;
  }
  reloadAction.visible=false;
  // The camera's arms are now articulated meshes attached to the actual
  // weapon, with wrists and separated fingers. The support arm pulls away
  // during a reload instead of leaving a third floating hand on the gun.
  const sleeve=mat(0x526052,.95),gloveRubber=mat(0x242e30,.91),
    gloveSeam=mat(0x7c806e,.79);
  function forearm(parent,a,b,r=.092){
    const delta=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const mid=new THREE.Vector3(...a).addScaledVector(delta,.5);
    const partMesh=part(new THREE.CylinderGeometry(r*.83,r,delta.length(),10),
      sleeve,mid.x,mid.y,mid.z,parent);
    partMesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0,1,0),delta.normalize());
    return partMesh;
  }
  function gauntlet(parent,x,y,z,side){
    part(new THREE.SphereGeometry(.105,10,8),gloveRubber,
      x,y,z,parent);
    const cuff=box(.19,.105,.18,sleeve,x,y-.11,z+.055,parent);
    cuff.rotation.x=-.24;
    for(let f=0;f<4;f++){
      const finger=part(new THREE.CapsuleGeometry(.024,.12,3,6),
        gloveRubber,x+(f-1.5)*.042,y-.11,z-.067,parent);
      finger.rotation.x=-.43;
    }
    box(.22,.023,.09,gloveSeam,x,y+.04,z-.034,parent);
    const thumb=part(new THREE.CapsuleGeometry(.030,.093,3,6),
      gloveRubber,x+side*.09,y-.065,z-.013,parent);
    thumb.rotation.z=side*.55;
  }
  const gripHand=new THREE.Group();root.add(gripHand);
  forearm(gripHand,[.32,-.67,.46],[.17,-.29,.16],.105);
  gauntlet(gripHand,.13,-.24,.135,-1);
  const supportHand=new THREE.Group();root.add(supportHand);
  const supportZ=shotgun?-.39:scoped?-.46:smg?-.25:revolver?-.15:-.38;
  forearm(supportHand,[-.34,-.64,.18],[-.19,-.20,supportZ],.10);
  gauntlet(supportHand,-.15,-.15,supportZ,-1);
  supportHand.visible=true;
  const muzzleGlow=new THREE.PointLight(0xffa55a,0,2,2);
  muzzleGlow.position.set(0,boreY,barrelEnd-.02);root.add(muzzleGlow);
  const modelFlare=new THREE.Mesh(new THREE.PlaneGeometry(.3,.3),
    muzzleFlare.material.clone());
  modelFlare.position.set(0,boreY,barrelEnd-.036);
  modelFlare.visible=false;modelFlare.userData.ignoreSightProbe=true;
  root.add(modelFlare);
  root.visible=false;
  return {root,slideGroup,magazine,magazineBase,reloadHand,
    muzzleGlow,muzzleFlare:modelFlare,magBaseY,magFootY,
    flashScale:shotgun?1.65:scoped?1.25:1,
    defaultX:rifle?.23:.34,reloadAction,pumpGrip,cylinderBody,
    cylinderYoke,cylinderSpinGroup,boltHandle,gripHand,supportHand,
    ejectionLocal:new THREE.Vector3(revolver?.11:.14,.08,-.08),
    sightLocal:new THREE.Vector3(mount.x,mount.y,mount.z)};
}

// No legacy viewmodels are built in the live reset. Their mesh factory stays
// available in source until the staged new-gun rollout is complete.
if(!WEAPON_REBUILD_MODE)for(const spec of ARSENAL)
  if(spec.id!==SCRAP_PISTOL.id&&!REBUILT_WEAPON_IDS.includes(spec.id))
    weaponVisuals.set(spec.id,buildArsenalView(spec));
// The new 10mm is a different authored mesh; it does not reuse the scrap pistol.
weaponVisuals.set(NEW_WEAPON_ID,createTenMillimeterPistol(THREE,camera,{flareTexture:flareTex}));
const pipePistolVisual=createPipePistol(THREE,camera,{flareTexture:flareTex});
pipePistolVisual.root.visible=false;
weaponVisuals.set(PIPE_PISTOL.id,pipePistolVisual);
const pipeRifleVisual=createPipeRifle(THREE,camera,{flareTexture:flareTex});
pipeRifleVisual.root.visible=false;
weaponVisuals.set(PIPE_RIFLE.id,pipeRifleVisual);
const laserMusketVisual=createLaserMusket(THREE,camera,{flareTexture:flareTex});
laserMusketVisual.root.visible=false;
weaponVisuals.set(LASER_MUSKET.id,laserMusketVisual);
const doubleBarrelVisual=createDoubleBarrelShotgun(THREE,camera,{flareTexture:flareTex});
doubleBarrelVisual.root.visible=false;
weaponVisuals.set(DOUBLE_BARREL_SHOTGUN.id,doubleBarrelVisual);
const pumpActionVisual=createPumpActionShotgun(THREE,camera,{flareTexture:flareTex});
pumpActionVisual.root.visible=false;
weaponVisuals.set(PUMP_ACTION_SHOTGUN.id,pumpActionVisual);
const huntingRifleVisual=createHuntingRifle(THREE,camera,{flareTexture:flareTex});
huntingRifleVisual.root.visible=false;
weaponVisuals.set(BOLT_HUNTING_RIFLE.id,huntingRifleVisual);
const wornRevolverVisual=createWornRevolver(THREE,camera,{flareTexture:flareTex});
wornRevolverVisual.root.visible=false;
weaponVisuals.set(IRON_REVOLVER.id,wornRevolverVisual);
const pipeSMGVisual=createPipeSMG(THREE,camera,{flareTexture:flareTex});
pipeSMGVisual.root.visible=false;
weaponVisuals.set(PIPE_SMG.id,pipeSMGVisual);
const heavySniperVisual=createHeavySniper(THREE,camera,{flareTexture:flareTex});
heavySniperVisual.root.visible=false;
weaponVisuals.set(HEAVY_SNIPER.id,heavySniperVisual);
// Retire all legacy viewmodels, keeping only newly authored weapons.
if(WEAPON_REBUILD_MODE)for(const [id,visual] of weaponVisuals){
  if(REBUILT_WEAPON_IDS.includes(id))continue;
  visual.root.visible=false;
  visual.root.removeFromParent();
}
// ADS is calibrated to the actual sight, never an approximate common offset.
function alignActiveSight(){
  const anchor=adsWeaponPosition(activeWeaponId);
  const visual=weaponVisuals.get(activeWeaponId);
  visual.root.position.set(anchor.x,anchor.y,anchor.z);
  visual.root.rotation.set(0,0,0);
}
function changeAim(enabled){
  if(WEAPON_REBUILD_MODE&&!playerGunEnabled())enabled=false;
  aimHeld=!!enabled;
  setWeaponAim(weaponState,aimHeld);
  if(aimHeld&&weaponState.reloadRemaining<=0)alignActiveSight();
}
// These values must exist BEFORE restoring a saved non-default weapon.
// selectWeapon() updates recoil, notice and HUD state during page startup.
let lastShotDebug=null;
let totalHits=0,shotNoticeTime=0,recoilKick=0,mouseSway=0,muzzleFlash=0;
let slideCycle=0,handlingTime=0,weaponMotion={speed:0},reloadAnimWasActive=false;
let shotgunPendingEjections=0,pumpPendingEjection=false,huntingPendingEjection=false,heavySniperPendingEjection=false,revolverPendingEjections=0;
let groundedStepProgress=0;
function selectWeapon(id){
  if(WEAPON_REBUILD_MODE&&!REBUILT_WEAPON_IDS.includes(id))return; // only rebuilt guns allowed
  const spec=getWeaponSpec(id);
  if(id===activeWeaponId)return;
  // Switching guns cancels unfinished motion; seated loose rounds stay loaded.
  cancelWeaponReload(weaponState);
  shotgunPendingEjections=0;pumpPendingEjection=false;huntingPendingEjection=false;heavySniperPendingEjection=false;revolverPendingEjections=0;
  if(activeWeaponId===LASER_MUSKET.id)cancelLaserCrank(weaponState);
  weaponVisuals.get(activeWeaponId).root.visible=false;
  activeWeaponId=id;activeSpec=spec;
  weaponState=arsenalStates[id];
  if(infiniteAmmo)weaponState.magazine=activeSpec.magazineSize;
  setWeaponAim(weaponState,aimHeld);
  weaponVisuals.get(id).root.visible=true;
  backpack.equipment.weapon=id;
  saveBackpack();
  if(aimHeld&&weaponState.reloadRemaining<=0)alignActiveSight();
  $('weaponSelect').value=id;
  // Weapon switch prevents a held mouse from continuing its old burst.
  triggerHeld=false;emptyClickLatched=false;
  slideCycle=0;muzzleFlash=0;recoilKick=0;
  resetWeaponRecoil(viewRecoil);
  showShotNotice('EQUIPPED · '+spec.name.toUpperCase());
  refreshWeaponHUD();
}
function cycleWeapon(direction){
  const ids=WEAPON_REBUILD_MODE?REBUILT_WEAPON_IDS:ARSENAL_IDS;
  const i=ids.indexOf(activeWeaponId);
  selectWeapon(ids[(i+direction+ids.length)%ids.length]);
}
for(const spec of ARSENAL){
  if(WEAPON_REBUILD_MODE&&!REBUILT_WEAPON_IDS.includes(spec.id))continue;
  const option=document.createElement('option');option.value=spec.id;
  option.textContent=spec.name+' · '+spec.damage+' DMG'+
    ((spec.pellets||1)>1?' × '+spec.pellets:'');
  $('weaponSelect').append(option);
}
$('weaponSelect').value=activeWeaponId;
$('weaponSelect').addEventListener('change',()=>{
  selectWeapon($('weaponSelect').value);
  backpack.equipment.weapon=activeWeaponId;
  saveBackpack();
});
if(WEAPON_REBUILD_MODE){
  if(REBUILT_WEAPON_IDS.includes(backpack.equipment.weapon))
    selectWeapon(backpack.equipment.weapon);
  else{
    backpack.equipment.weapon=NEW_WEAPON_ID;
    saveBackpack();
  }
}else if(backpack.equipment.weapon!=='scrap-pistol'){
  selectWeapon(backpack.equipment.weapon);
}

// Reusable low-poly brass casing geometry and limited world-space physics.
const casingGeometry=new THREE.CylinderGeometry(.029,.029,.105,8);
const casingCapGeometry=new THREE.CylinderGeometry(.031,.031,.008,8);
const brass=mat(0xc9a559,.36),brassCap=mat(0x86682e,.6);
const casings=[];
const casingRight=new THREE.Vector3(),casingForward=new THREE.Vector3(),
  casingOrigin=new THREE.Vector3(),worldAxis=new THREE.Vector3();
function clearCasings(){
  while(casings.length)scene.remove(casings.pop().mesh);
}
function ejectCasing(){
  // Brass comes from the *equipped receiver*, never a universal pistol
  // position in camera coordinates. Revolvers keep spent brass until reload.
  if(activeSpec.kind==='revolver')return;
  const visual=weaponVisuals.get(activeWeaponId);
  visual.root.updateWorldMatrix(true,false);
  casingOrigin.copy(visual.ejectionLocal).applyMatrix4(visual.root.matrixWorld);
  casingRight.set(1,0,0).applyQuaternion(camera.quaternion);
  casingForward.set(0,0,-1).applyQuaternion(camera.quaternion);
  const state=createCasingState(casingOrigin,casingRight,casingForward);
  const body=new THREE.Group();
  body.add(new THREE.Mesh(casingGeometry,brass));
  const cap=new THREE.Mesh(casingCapGeometry,brassCap);
  cap.position.y=.055;body.add(cap);
  body.position.copy(casingOrigin);body.rotation.z=Math.PI/2;
  scene.add(body);
  casings.push({mesh:body,state});
  if(casings.length>CASING_TUNING.maxVisible)scene.remove(casings.shift().mesh);
}
const shotgunHullGeometry=new THREE.CylinderGeometry(.046,.046,.145,12);
const shotgunPrimerGeometry=new THREE.CylinderGeometry(.048,.048,.019,12);
const shotgunHullMat=mat(0x992d31,.88),shotgunPrimerMat=mat(0xc0a064,.55);
function ejectDoubleBarrelHulls(count){
  const gun=weaponVisuals.get(DOUBLE_BARREL_SHOTGUN.id);
  if(!gun?.hingeGroup)return;
  gun.hingeGroup.updateWorldMatrix(true,false);
  casingRight.set(1,0,0).applyQuaternion(camera.quaternion);
  casingForward.set(0,0,-1).applyQuaternion(camera.quaternion);
  for(let i=0;i<Math.min(2,count);i++){
    const side=i===0?-1:1;
    const origin=new THREE.Vector3(side*.079,.138,.090)
      .applyMatrix4(gun.hingeGroup.matrixWorld);
    const state=createCasingState(origin,casingRight,casingForward);
    state.vy+=.65;
    const mesh=new THREE.Group();
    const hull=new THREE.Mesh(shotgunHullGeometry,shotgunHullMat);
    mesh.add(hull);
    const primer=new THREE.Mesh(shotgunPrimerGeometry,shotgunPrimerMat);
    primer.position.y=.077;mesh.add(primer);
    mesh.position.copy(origin);mesh.rotation.z=Math.PI/2;
    scene.add(mesh);casings.push({mesh,state});
    if(casings.length>CASING_TUNING.maxVisible)
      scene.remove(casings.shift().mesh);
  }
}
function ejectPumpActionHull(){
  const gun=weaponVisuals.get(PUMP_ACTION_SHOTGUN.id);
  if(!gun?.root)return;
  gun.root.updateWorldMatrix(true,false);
  const origin=gun.ejectionLocal.clone().applyMatrix4(gun.root.matrixWorld);
  casingRight.set(1,0,0).applyQuaternion(camera.quaternion);
  casingForward.set(0,0,-1).applyQuaternion(camera.quaternion);
  const state=createCasingState(origin,casingRight,casingForward);
  state.vy+=.49;
  const hull=new THREE.Mesh(shotgunHullGeometry,shotgunHullMat);
  const primer=new THREE.Mesh(shotgunPrimerGeometry,shotgunPrimerMat);
  primer.position.y=.077;
  const mesh=new THREE.Group();mesh.add(hull,primer);
  mesh.position.copy(origin);mesh.rotation.z=Math.PI/2;
  scene.add(mesh);casings.push({mesh,state});
  if(casings.length>CASING_TUNING.maxVisible)
    scene.remove(casings.shift().mesh);
}
const rifleCaseGeometry=new THREE.CylinderGeometry(.020,.024,.129,12);
const rifleCaseNeckGeometry=new THREE.CylinderGeometry(.014,.020,.038,12);
const rifleCaseMat=mat(0xb9a05e,.64);
function ejectHuntingRifleCasing(){
  const gun=weaponVisuals.get(BOLT_HUNTING_RIFLE.id);
  if(!gun?.root)return;
  gun.root.updateWorldMatrix(true,false);
  const origin=gun.ejectionLocal.clone().applyMatrix4(gun.root.matrixWorld);
  casingRight.set(1,0,0).applyQuaternion(camera.quaternion);
  casingForward.set(0,0,-1).applyQuaternion(camera.quaternion);
  const state=createCasingState(origin,casingRight,casingForward);
  state.vy+=.56;
  const mesh=new THREE.Group();
  const body=new THREE.Mesh(rifleCaseGeometry,rifleCaseMat);
  const neck=new THREE.Mesh(rifleCaseNeckGeometry,rifleCaseMat);
  neck.position.y=.075;
  mesh.add(body,neck);mesh.position.copy(origin);mesh.rotation.z=Math.PI/2;
  scene.add(mesh);casings.push({mesh,state});
  if(casings.length>CASING_TUNING.maxVisible)
    scene.remove(casings.shift().mesh);
}
// The heavy sniper extracts a larger bottleneck brass case at the bolt port.
function ejectHeavySniperCasing(){
  const gun=weaponVisuals.get(HEAVY_SNIPER.id);
  if(!gun?.root)return;
  gun.root.updateWorldMatrix(true,false);
  const origin=gun.ejectionLocal.clone().applyMatrix4(gun.root.matrixWorld);
  casingRight.set(1,0,0).applyQuaternion(camera.quaternion);
  casingForward.set(0,0,-1).applyQuaternion(camera.quaternion);
  const state=createCasingState(origin,casingRight,casingForward);
  state.vy+=.75;
  const mesh=new THREE.Group();
  const body=new THREE.Mesh(rifleCaseGeometry,rifleCaseMat);
  const neck=new THREE.Mesh(rifleCaseNeckGeometry,rifleCaseMat);
  body.scale.set(1.28,1.17,1.28);
  neck.position.y=.082;neck.scale.setScalar(1.18);
  mesh.add(body,neck);mesh.position.copy(origin);mesh.rotation.z=Math.PI/2;
  scene.add(mesh);casings.push({mesh,state});
  if(casings.length>CASING_TUNING.maxVisible)
    scene.remove(casings.shift().mesh);
}
const revolverCaseGeometry=new THREE.CylinderGeometry(.025,.025,.090,10);
const revolverCaseMat=mat(0xb9a56c,.68);
function ejectRevolverCasings(count){
  const gun=weaponVisuals.get(IRON_REVOLVER.id);
  if(!gun?.cylinderSpinGroup)return;
  gun.cylinderSpinGroup.updateWorldMatrix(true,false);
  casingRight.set(-1,0,0).applyQuaternion(camera.quaternion);
  casingForward.set(0,0,-1).applyQuaternion(camera.quaternion);
  for(let i=0;i<Math.min(6,count);i++){
    const theta=i*Math.PI/3;
    const origin=new THREE.Vector3(Math.cos(theta)*.071,
      Math.sin(theta)*.071,.164)
      .applyMatrix4(gun.cylinderSpinGroup.matrixWorld);
    const state=createCasingState(origin,casingRight,casingForward);
    state.vy+=.30+i*.13;state.vx*=.62;state.vz*=.62;
    const mesh=new THREE.Mesh(revolverCaseGeometry,revolverCaseMat);
    mesh.position.copy(origin);mesh.rotation.x=Math.PI/2;
    scene.add(mesh);casings.push({mesh,state});
    if(casings.length>CASING_TUNING.maxVisible)
      scene.remove(casings.shift().mesh);
  }
}
function updateCasings(dt){
  for(let i=casings.length-1;i>=0;i--){
    const {state,mesh}=casings[i];
    const floorLevel=groundHeight(state.x,state.z);
    stepCasing(state,dt,floorLevel);
    mesh.position.set(state.x,state.y,state.z);
    if(!state.settled)mesh.rotation.set(state.rx,state.ry,state.rz);
    if(state.age>CASING_TUNING.maxLife){
      scene.remove(mesh);casings.splice(i,1);
    }
  }
}
const firingRaycaster=new THREE.Raycaster();
// Cast into both visible world surfaces and non-rendering enemy hitboxes.
firingRaycaster.layers.enable(ENEMY_COLLISION_LAYER);
firingRaycaster.far=105;
// Runtime ADS sanity check: only raycast against the visible viewmodel,
// ignoring intentionally centered front blades and reticle dots.
const sightProbe=new THREE.Raycaster();
sightProbe.near=.05;sightProbe.far=2.5;
const sightProbeOrigin=new THREE.Vector3();
const sightProbeDirection=new THREE.Vector3();
let sightProbeTime=0;
function inspectSightClearance(){
  const visual=weaponVisuals.get(activeWeaponId);
  camera.updateWorldMatrix(true,true);
  camera.getWorldPosition(sightProbeOrigin);
  camera.getWorldDirection(sightProbeDirection);
  sightProbe.set(sightProbeOrigin,sightProbeDirection);
  const hits=sightProbe.intersectObject(visual.root,true);
  const obstruction=hits.find(h=>!h.object.userData.sightReference&&
    !h.object.userData.ignoreSightProbe);
  const output=$('weaponSightCheck');
  output.textContent=obstruction?'ADS BLOCKED · MODEL OBSTRUCTION':'ADS SIGHT LINE CLEAR';
  output.style.color=obstruction?'#ffa27d':'#abd8ae';
}
const shotVector=new THREE.Vector3();

function showShotNotice(message){
  $('shotNotice').textContent=message;
  $('shotNotice').classList.add('visible');
  shotNoticeTime=.8;
}
function refreshWeaponHUD(){
  const ammoToggle=$('infiniteAmmoToggle');
  const toggleLabel=infiniteAmmo?'INFINITE AMMO: ON · M':'INFINITE AMMO: OFF · M';
  if(ammoToggle.textContent!==toggleLabel)ammoToggle.textContent=toggleLabel;
  const pressed=String(infiniteAmmo);
  if(ammoToggle.getAttribute('aria-pressed')!==pressed)
    ammoToggle.setAttribute('aria-pressed',pressed);
  const ammoMode=$('infiniteAmmoStatus');
  const ammoLabel=infiniteAmmo?
    '∞ AMMO ACTIVE · M TO DISABLE':'NORMAL AMMO · M TO ENABLE';
  if(ammoMode.textContent!==ammoLabel)ammoMode.textContent=ammoLabel;
  if(WEAPON_REBUILD_MODE&&!playerGunEnabled()){
    $('fieldAmmo').textContent='--';
    $('visorAmmo').textContent='UNARMED';
    $('visorAmmoLoaded').textContent='---';
    $('visorAmmoReserve').textContent='---';
    $('fieldWeaponName').textContent='UNARMED';
    $('visorWeaponName').textContent='UNARMED';
    $('fieldWeaponState').textContent='WEAPON REBUILD';
    $('weaponAmmo').textContent='--';
    $('weaponState').textContent='UNARMED';
    $('targetHits').textContent=totalHits;
    $('weaponName').textContent='UNARMED';
    $('weaponStats').textContent='LEGACY FIREARMS REMOVED · NEXT: NEW GUNS';
    $('weaponOptic').textContent='NO OPTIC';
    $('weaponAccuracy').textContent='NO WEAPON EQUIPPED';
    $('reloadProgress').style.width='0%';
    document.body.classList.remove('ads-active');
    return;
  }
  const laserEquipped=activeWeaponId===LASER_MUSKET.id;
  const laserLevel=laserEquipped?ensureLaserState(weaponState).laserCharge:0;
  const cellCount=infiniteAmmo?'∞':weaponState.magazine;
  const loaded=laserEquipped?
    laserLevel+'/6 CHARGE · '+cellCount+'/'+(infiniteAmmo?'∞':displayAmmoCount(weaponState.reserve))+' CELLS':
    infiniteAmmo?'∞ / ∞':weaponState.magazine+' / '+displayAmmoCount(weaponState.reserve);
  $('fieldAmmo').textContent=loaded;
  $('visorAmmo').textContent=loaded;
  $('visorAmmoLoaded').textContent=laserEquipped?String(laserLevel).padStart(3,'0'):
    infiniteAmmo?'INF':String(weaponState.magazine).padStart(3,'0');
  const reserveDisplay=displayAmmoCount(weaponState.reserve);
  $('visorAmmoReserve').textContent=infiniteAmmo?'INF':String(reserveDisplay).padStart(3,'0');
  $('fieldWeaponName').textContent=activeSpec.name.toUpperCase();
  $('visorWeaponName').textContent=activeSpec.name.toUpperCase();
  const laserStatus=laserEquipped?weaponState.reloadRemaining>0?'RELOADING CELLS':
    weaponState.crankRemaining>0?'CRANKING · '+laserLevel+'/6':
    laserLevel>0?'CHARGED · '+laserLevel+'/6':
    weaponState.magazine<=0&&!infiniteAmmo?'NO CELLS · R TO RELOAD':
    'UNCHARGED · R TO CRANK':null;
  $('fieldWeaponState').textContent=laserStatus??(weaponState.reloadRemaining>0?'RELOADING':
    weaponState.magazine===0?'EMPTY · R TO RELOAD':
    weaponState.aiming?'ADS':activeWeaponId===HEAVY_SNIPER.id?'BOLT · READY':
    activeSpec.automatic?'AUTO · READY':'SEMI · READY');
  document.body.classList.toggle('ads-active',!!weaponState.aiming);
  $('weaponAmmo').textContent=loaded;
  $('weaponState').textContent=laserStatus??(weaponState.reloadRemaining>0?'RELOADING':
    weaponState.magazine===0?'EMPTY · R TO RELOAD':weaponState.aiming?'AIMING':'READY');
  $('targetHits').textContent=totalHits;
  $('weaponName').textContent=activeSpec.name.toUpperCase();
  $('weaponStats').textContent=(laserEquipped?(activeSpec.damage+'–'+Math.round(activeSpec.damage*(1+.40*5))+' CHARGE DAMAGE'):activeSpec.damage+' DAMAGE')+
    ((activeSpec.pellets||1)>1?' × '+activeSpec.pellets+' PELLETS':'')+
    (laserEquipped?' · R CRANK · CLICK FIRE':
      ' · '+(activeWeaponId===HEAVY_SNIPER.id?'BOLT ACTION':activeSpec.automatic?'AUTOMATIC':'SEMI-AUTO')+
      ' · '+(1/activeSpec.fireInterval).toFixed(1)+' ROUNDS/SEC');
  $('weaponOptic').textContent=activeWeaponId===HEAVY_SNIPER.id?'FACTORY 6× SNIPER SCOPE · FIXED ZERO':
    REBUILT_WEAPON_IDS.includes(activeWeaponId)?'FACTORY IRON SIGHTS · MODS LATER':
    'SIGHT · '+OPTIC_MODS[installedWeaponOptic(backpack,activeWeaponId)].name.toUpperCase();
  $('weaponAccuracy').textContent='SPREAD '+shotSpreadDegrees(activeSpec,
    weaponState.aiming,weaponMotion).toFixed(2)+'°'+
    (weaponMotion.airborne?' · AIRBORNE':weaponMotion.crouched?' · CROUCHED':
      weaponMotion.speed>2?' · MOVING':' · STEADY');
  $('reloadProgress').style.width=(laserEquipped&&weaponState.crankRemaining>0?
    100*laserCrankProgress(weaponState):weaponState.reloadRemaining>0?
    100*(1-weaponState.reloadRemaining/(weaponState.reloadDuration||activeSpec.reloadSeconds)):0).toFixed(1)+'%';
}
function shoot(){
  if(WEAPON_REBUILD_MODE&&!playerGunEnabled())return;
  // Infinite mode supplies a full test magazine without spending saved ammo.
  // Cooldown, recoil, damage, shot sounds and projectile calculations remain.
  if(infiniteAmmo){
    cancelWeaponReload(weaponState);
    weaponState.magazine=activeSpec.magazineSize;
  }
  const laserActive=activeWeaponId===LASER_MUSKET.id;
  const result=laserActive?
    fireChargedLaser(weaponState,activeSpec,Math.random,weaponMotion):
    fireWeapon(weaponState,activeSpec,Math.random,weaponMotion);
  if(infiniteAmmo&&result.status==='fired')
    weaponState.magazine=activeSpec.magazineSize;
  if(result.status==='empty'){
    // Automatic guns call shoot() every animation frame while the trigger
    // is held. Without this latch, sound.dryFire() was called 60+ times
    // per second, creating the reported loud continuous buzzing.
    if(!emptyClickLatched){
      emptyClickLatched=true;
      dryFireClicks++;
      sound.dryFire();
      showShotNotice('EMPTY · PRESS R');
    }
    return;
  }
  if(result.status==='uncharged'){
    if(!emptyClickLatched){showShotNotice('LASER MUSKET · PRESS R TO CRANK');sound.dryFire();emptyClickLatched=true;}
    return;
  }
  if(result.status!=='fired')return;
  if(activeSpec.kind==='revolver'){
    const gun=weaponVisuals.get(activeWeaponId);
    gun.previousChamberIndex=weaponState.shotsFired-1;
    gun.chamberIndex=weaponState.shotsFired;
  }
  emptyClickLatched=false;
  if(laserActive)sound.laserBlast(result.chargeLevel);
  else sound.gunshot(activeWeaponId===PIPE_SMG.id?'pipe-smg':
    activeWeaponId===HEAVY_SNIPER.id?'heavy-sniper':
    activeWeaponId===BOLT_HUNTING_RIFLE.id?'hunting-bolt':
    activeWeaponId===PUMP_ACTION_SHOTGUN.id?'pump-action':
    activeWeaponId===DOUBLE_BARREL_SHOTGUN.id?'double-barrel':
    activeWeaponId===TEN_MM_PISTOL.id?'10mm':
    activeWeaponId===PIPE_PISTOL.id?'pipe':
    activeWeaponId===PIPE_RIFLE.id?'pipe-rifle':activeSpec.kind||'pistol');
  // Hearing is not sight: unalerted guards investigate the last shot with
  // positional uncertainty, and never aim at a hidden moving player.
  for(const enemy of enemies.values())
    if(enemy.state.alive)
      hearEnemyGunshot(enemy.brain,{x:player.x,z:player.z},bounds);
  // First-person recoil displacement is driven by the same per-gun impulse
  // as the camera; do not add a second generic kick here.
  muzzleFlash=.085;
  slideCycle=laserActive||activeWeaponId===DOUBLE_BARREL_SHOTGUN.id?0:
    activeWeaponId===IRON_REVOLVER.id?.26:
    activeWeaponId===PUMP_ACTION_SHOTGUN.id?PUMP_ACTION_TUNING.cycleSeconds:
    activeWeaponId===HEAVY_SNIPER.id?HEAVY_SNIPER_TUNING.cycleSeconds:
    activeWeaponId===BOLT_HUNTING_RIFLE.id?HUNTING_RIFLE_TUNING.cycleSeconds:
    activeWeaponId===IRON_REVOLVER.id?.26:
    activeWeaponId===PIPE_SMG.id?.095:
    activeWeaponId===PIPE_RIFLE.id?.23:
    activeSpec.kind==='shotgun'?.48:
    activeSpec.kind==='rifle'?.52:.13;
  if(activeWeaponId===PUMP_ACTION_SHOTGUN.id){
    pumpPendingEjection=true;
    sound.pumpActionCycle(PUMP_ACTION_TUNING.cycleSeconds);
  }else if(activeWeaponId===HEAVY_SNIPER.id){
    heavySniperPendingEjection=true;
    sound.boltActionCycle(HEAVY_SNIPER_TUNING.cycleSeconds);
  }else if(activeWeaponId===BOLT_HUNTING_RIFLE.id){
    huntingPendingEjection=true;
    sound.boltActionCycle(HUNTING_RIFLE_TUNING.cycleSeconds);
  }else if(!laserActive&&activeWeaponId!==DOUBLE_BARREL_SHOTGUN.id&&activeWeaponId!==IRON_REVOLVER.id)ejectCasing();
  // Determine the projectile direction from the pre-recoil sight orientation.
  // Applying recoil before raycasting incorrectly shifts the bullet off target.
  let enemyDamageHits=0;
  let totalEnemyDamage=0;
  // Refresh the animated skeleton's world transforms before raycasting.
  // Otherwise a click between render frames can hit a head's LAST pose.
  for(const enemy of enemies.values())
    if(enemy.state.alive)enemy.rigged?.root.updateWorldMatrix(true,true);
  for(const pellet of result.directions){
    // Sight and shot are both derived from the camera's current world-space
    // orientation, including the same yaw and pitch used to render the reticle.
    camera.updateWorldMatrix(true,false);
    shotVector.set(pellet.spreadX*specialModifiers.aimSpreadMultiplier,
      pellet.spreadY*specialModifiers.aimSpreadMultiplier,-1)
      .normalize().applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
  firingRaycaster.set(camera.position,shotVector);
  // Downed dummies remain visible but no longer block shots behind them.
  const livingParts=dummyHitMeshes.filter(mesh=>dummies.get(mesh.userData.dummyId).state.alive);
  // NEVER remove enemy hitboxes based on a stale station selection.
  // The old condition made enemies invulnerable when approaching on foot.
  // Intentionally raycast explicit invisible collision meshes. Their visibility
  // is not a gameplay or armor state and cannot turn old mannequin limbs on.
  const enemyParts=enemyHitMeshes.filter(mesh=>mesh.userData.equipped!==false&&
    shouldRaycastEnemy(enemies.get(mesh.userData.enemyId)));
  const hits=firingRaycaster.intersectObjects(
    [...worldGeometry,...targetMeshes,...livingParts,...enemyParts],false);
  const first=hits[0];
  // Suppression is earned by an actual close bullet pass. The nearest solid
  // impact truncates the ray, so shots stopped by walls cannot scare guards
  // hiding behind them. Engaged NPCs seek cover and briefly lose accuracy.
  for(const enemy of enemies.values()){
    if(!enemy.state.alive||enemy.brain.mode==='patrol'||
       enemy.id===first?.object.userData.enemyId)continue;
    if(projectileNearMiss(camera.position,shotVector,
      {x:enemy.brain.x,y:1.25,z:enemy.brain.z},
      {blockDistance:first?.distance??90,radius:1.55,range:90}))
      markEnemySuppressed(enemy.tactics,activeSpec.kind==='shotgun'?.13:.37);
  }
  if(new URLSearchParams(location.search).get('smoke')==='1'){
    lastShotDebug={
      when:performance.now(),selectedWeapon:activeSpec.id,
      ray:{x:shotVector.x,y:shotVector.y,z:shotVector.z},
      origin:{x:camera.position.x,y:camera.position.y,z:camera.position.z},
      first:first?{distance:first.distance,id:first.object.userData.enemyId||null,
        target:first.object.userData.targetId||null,
        material:first.object.userData.impactMaterial||null,
        point:{x:first.point.x,y:first.point.y,z:first.point.z}}:null,
      hits:hits.slice(0,5).map(h=>({
        distance:h.distance,enemyId:h.object.userData.enemyId||null,
        targetId:h.object.userData.targetId||null,
        point:{x:h.point.x,y:h.point.y,z:h.point.z}
      }))
    };
  }
  if(laserActive){
    const origin=new THREE.Vector3();
    const muzzle=thirdPersonActive?heldLaserMusket.muzzleGlow:
      weaponVisuals.get(LASER_MUSKET.id).muzzleGlow;
    muzzle.getWorldPosition(origin);
    const destination=first?.point||camera.position.clone().addScaledVector(shotVector,85);
    laserTrails.spawn(origin,destination,result.chargeLevel);
  }
  const damageThisPellet=activeWeaponId===DOUBLE_BARREL_SHOTGUN.id?
    doubleBarrelPelletDamage(result.damage,first?.distance??105):
    activeWeaponId===PUMP_ACTION_SHOTGUN.id?
      pumpPelletDamage(result.damage,first?.distance??105):result.damage;
  let impactMaterial=null;
  if(first){
    impactMaterial=getImpactMaterial(first);
    impactEffects.spawn(first.point,
      first.object.userData.enemyId?'flesh':impactMaterial);
    const isPaper=impactMaterial==='paper';
    markBulletHole(first,isPaper,
      !!(first.object.userData.dummyId||first.object.userData.enemyId));
    // AudioContext scheduling creates an audible gap after the gunshot.
    // A little extra distance adds a subtle travel-time effect.
    sound.impact(impactMaterial,.15+Math.min(.11,first.distance*.0017));
  }
  if(first&&first.object.userData.enemyId){
    const enemy=enemies.get(first.object.userData.enemyId);
    const critical=Math.random()<specialModifiers.critChance;
    const zone=first.object.userData.hitZone;
    const boostedDamage=damageThisPellet*specialModifiers.gunDamageMultiplier*
      (zone==='head'?specialModifiers.headshotMultiplier:1)*
      (critical?specialModifiers.critDamageMultiplier:1);
    const hit=applyDamage(enemy.state,boostedDamage,zone);
    if(hit.applied){
      enemyDamageHits++;
      totalEnemyDamage+=hit.damage;
      enemy.flash=.22;enemy.shake=1;
      for(const mesh of enemy.meshes)mesh.material.emissive.setHex(0x633724);
      if(hit.killed){
        markEnemyDefeated(enemy);
      }else{
        alertEnemy(enemy.brain,{x:player.x,z:player.z});
        enemy.radarAlertSeconds=3; // player hit this target: already engaged
        markEnemyThreat(enemy.tactics);
        reportSquadContact(squadIntel,enemy.id,player);
      }
      enemy.statusText='';
      refreshEnemyLabel(enemy,hit.killed?'DOWN':enemy.brain.mode.toUpperCase());
      spawnDamagePopup(first.point,hit);
      $('damageReport').textContent=enemy.label+' · '+ARMOR_SLOT_LABELS[hit.zone].toUpperCase()+
        ' · '+Math.ceil(hit.damage)+' HP · '+hit.points+' AP · '+
        Math.ceil(hit.blocked)+' BLOCKED'+(hit.killed?' · DOWN':'');
      showShotNotice(hit.killed?'ENEMY DOWN · '+enemy.label:
        'ENEMY HIT · '+ARMOR_SLOT_LABELS[hit.zone].toUpperCase()+
        ' · -'+Math.ceil(hit.damage)+' HP');
    }
  }else if(first&&first.object.userData.dummyId){
    const dummy=dummies.get(first.object.userData.dummyId);
    const dummyDamage=applyDamage(dummy.state,damageThisPellet,first.object.userData.hitZone);
    if(dummyDamage.applied){
      dummy.flash=.2;dummy.impulse=1;
      for(const mesh of dummy.pieces)mesh.material.emissive.setHex(0x553d20);
      updateDummyLabel(dummy);
      spawnDamagePopup(first.point,dummyDamage);
      $('damageReport').textContent=dummy.title+' · '+ARMOR_SLOT_LABELS[dummyDamage.zone].toUpperCase()+
        ' · '+Math.ceil(dummyDamage.damage)+' HP'+
        (dummyDamage.blocked>0?' · '+Math.ceil(dummyDamage.blocked)+' BLOCKED':'')+
        ' · '+dummyDamage.points+' AP · '+Math.round(dummyDamage.reduction*100)+'% REDUCTION'+
        (dummyDamage.killed?' · DOWN':'');
      showShotNotice(dummyDamage.killed?'DUMMY DOWN · '+dummy.title:
        (dummyDamage.critical?'HEADSHOT':'HIT '+ARMOR_SLOT_LABELS[dummyDamage.zone].toUpperCase())+
        ' · -'+Math.ceil(dummyDamage.damage)+' HP'+
        (dummyDamage.blocked>0?' · '+Math.ceil(dummyDamage.blocked)+' BLOCKED':''));
      if($('armory').classList.contains('hidden')===false)refreshArmory();
    }
  } else if(first&&first.object.userData.targetId){
    const target=targetData.get(first.object.userData.targetId);
    target.hits++;totalHits++;
    target.back.material.emissive.setHex(0x956c2f);
    target.back.material.emissiveIntensity=.75;
    target.back.userData.flash=.22;
    showShotNotice('TARGET HIT · +'+result.damage+' DAMAGE · PAPER');
  } else if(first)showShotNotice(impactMaterial.toUpperCase()+' IMPACT');
  else showShotNotice('MISS');
  } // all projectiles from one round
  // Shotguns fire eight pellets: the LAST pellet might miss even after a
  // previous pellet dealt damage, so never announce a false overall MISS.
  if(enemyDamageHits>0){
    showShotNotice('AI DAMAGE CONFIRMED · '+enemyDamageHits+
      ' HIT'+(enemyDamageHits!==1?'S':'')+' · -'+
      Math.ceil(totalEnemyDamage)+' HP');
  }
  // All pellets have already fired along the pre-kick sight ray.
  // The camera rises and receives a small authored horizontal pattern AFTER the shot.
  const kick=applyWeaponRecoil(viewRecoil,camera.rotation.x,camera.rotation.y,
    activeSpec,{aiming:weaponState.aiming,crouched:!!player.crouched,
      multiplier:specialModifiers.recoilMultiplier});
  camera.rotation.x=kick.pitch;camera.rotation.y=kick.yaw;
  refreshWeaponHUD();
}
function reload(){
  if(WEAPON_REBUILD_MODE&&!playerGunEnabled())return;
  if(activeWeaponId===LASER_MUSKET.id){
    const action=startLaserCrank(weaponState,{infiniteAmmo});
    if(action.status==='started'){
      emptyClickLatched=false;
      sound.laserCrank(action.level);
      showShotNotice('CRANKING FUSION CHARGE '+action.level+'/'+LASER_MUSKET_TUNING.maxCharges);
      if(!infiniteAmmo)saveBackpack();
      refreshWeaponHUD();return;
    }
    if(action.status==='fully-charged'){
      showShotNotice('MAX CHARGE · FIRE THE LASER');return;
    }
    if(action.status==='no-cells'){
      if(startWeaponReload(weaponState,activeSpec)){
        sound.reload('laser-musket',weaponState.reloadDuration/
          Math.max(.85,Math.min(1.6,specialModifiers.reloadSpeedMultiplier||1)));
        showShotNotice('LOADING FUSION CELLS');refreshWeaponHUD();
      }else showShotNotice('NO FUSION CELLS · PRESS F TO RESTOCK');
    }
    return;
  }
  if(infiniteAmmo){showShotNotice('INFINITE AMMO · RELOAD NOT REQUIRED');return;}
  if(activeWeaponId===DOUBLE_BARREL_SHOTGUN.id){
    const missing=activeSpec.magazineSize-weaponState.magazine;
    if(startWeaponReload(weaponState,activeSpec)){
      shotgunPendingEjections=missing;
      sound.breakActionReload(missing,weaponState.reloadDuration/
        Math.max(.85,Math.min(1.6,specialModifiers.reloadSpeedMultiplier||1)));
      emptyClickLatched=false;slideCycle=0;
      showShotNotice('BREAK ACTION · '+missing+' SHELL'+(missing===1?'':'S'));
      refreshWeaponHUD();
    }else if(weaponState.magazine<2&&weaponState.reserve===0)
      showShotNotice('NO SHOTGUN SHELLS · F TO RESTOCK');
    return;
  }
  if(activeWeaponId===PUMP_ACTION_SHOTGUN.id){
    if(slideCycle>.001){
      showShotNotice('PUMP CYCLING · WAIT FOR BOLT TO CLOSE');return;
    }
    const missing=Math.min(activeSpec.magazineSize-weaponState.magazine,
      weaponState.reserve);
    if(startWeaponReload(weaponState,activeSpec)){
      sound.pumpActionReload(missing,weaponState.reloadDuration/
        Math.max(.85,Math.min(1.6,specialModifiers.reloadSpeedMultiplier||1)));
      emptyClickLatched=false;
      showShotNotice('TUBE LOADING · '+missing+' SHELL'+(missing===1?'':'S'));
      refreshWeaponHUD();
    }else if(weaponState.magazine<activeSpec.magazineSize&&weaponState.reserve===0)
      showShotNotice('NO SHOTGUN SHELLS · F TO RESTOCK');
    return;
  }
  if(activeWeaponId===PIPE_SMG.id){
    if(startWeaponReload(weaponState,activeSpec)){
      emptyClickLatched=false;slideCycle=0;
      sound.pipeSMGReload(weaponState.reloadDuration/
        Math.max(.85,Math.min(1.6,specialModifiers.reloadSpeedMultiplier||1)));
      showShotNotice('SIDE MAGAZINE · RELEASE / INSERT / CHARGE');
      refreshWeaponHUD();
    }else if(weaponState.magazine<activeSpec.magazineSize&&weaponState.reserve===0)
      showShotNotice('NO SMG AMMO · F TO RESTOCK');
    return;
  }
  if(activeWeaponId===IRON_REVOLVER.id){
    const missing=Math.min(activeSpec.magazineSize-weaponState.magazine,weaponState.reserve);
    if(startWeaponReload(weaponState,activeSpec)){
      revolverPendingEjections=activeSpec.magazineSize-weaponState.magazine;
      sound.revolverReload(missing,weaponState.reloadDuration/
        Math.max(.85,Math.min(1.6,specialModifiers.reloadSpeedMultiplier||1)));
      slideCycle=0;emptyClickLatched=false;
      showShotNotice('CYLINDER OPEN · LOADING '+missing+' CARTRIDGE'+(missing===1?'':'S'));
      refreshWeaponHUD();
    }else if(weaponState.magazine<activeSpec.magazineSize&&weaponState.reserve===0)
      showShotNotice('NO REVOLVER CARTRIDGES · F TO RESTOCK');
    return;
  }
  if(activeWeaponId===HEAVY_SNIPER.id&&slideCycle>.001){
    showShotNotice('CYCLE SNIPER BOLT BEFORE RELOADING');return;
  }
  if(activeWeaponId===BOLT_HUNTING_RIFLE.id){
    if(slideCycle>.001){
      showShotNotice('CYCLE BOLT BEFORE LOADING');return;
    }
    const missing=Math.min(activeSpec.magazineSize-weaponState.magazine,
      weaponState.reserve);
    if(startWeaponReload(weaponState,activeSpec)){
      sound.boltActionReload(missing,weaponState.reloadDuration/
        Math.max(.85,Math.min(1.6,specialModifiers.reloadSpeedMultiplier||1)));
      emptyClickLatched=false;
      showShotNotice('BOLT OPEN · INSERTING '+missing+' ROUND'+(missing===1?'':'S'));
      refreshWeaponHUD();
    }else if(weaponState.magazine<activeSpec.magazineSize&&weaponState.reserve===0)
      showShotNotice('NO RIFLE ROUNDS · F TO RESTOCK');
    return;
  }
  if(startWeaponReload(weaponState,activeSpec)){
    emptyClickLatched=false;
    slideCycle=0;
    sound.reload(activeWeaponId===TEN_MM_PISTOL.id?'10mm':
      activeWeaponId===PIPE_PISTOL.id?'pipe':
      activeWeaponId===PIPE_RIFLE.id?'pipe-rifle':activeSpec.kind||'pistol',
      weaponState.reloadDuration/
      Math.max(.85,Math.min(1.6,specialModifiers.reloadSpeedMultiplier||1)));
    showShotNotice('RELOADING');refreshWeaponHUD();
  }
}
function resupply(){
  if(WEAPON_REBUILD_MODE&&!playerGunEnabled()){showShotNotice('NO AMMUNITION NEEDED · UNARMED');return;}
  if(activeWeaponId===LASER_MUSKET.id)cancelLaserCrank(weaponState);
  shotgunPendingEjections=0;pumpPendingEjection=false;huntingPendingEjection=false;revolverPendingEjections=0;
  const fresh=createWeaponState(activeSpec);
  Object.assign(weaponState,fresh);
  if(activeWeaponId===LASER_MUSKET.id)ensureLaserState(weaponState);
  saveBackpack();
  emptyClickLatched=false;
  showShotNotice('TEST AMMO RESTOCKED');
  // Do not leave the old reload hand suspended if F is used mid-reload.
  slideCycle=0;
  refreshWeaponHUD();
}
function toggleInfiniteAmmo(){
  shotgunPendingEjections=0;pumpPendingEjection=false;huntingPendingEjection=false;revolverPendingEjections=0;
  infiniteAmmo=!infiniteAmmo;
  if(infiniteAmmo){
    preInfiniteAmmo.clear();
    for(const id of REBUILT_WEAPON_IDS){
      const state=arsenalStates[id];
      if(id===LASER_MUSKET.id)cancelLaserCrank(state);
      preInfiniteAmmo.set(id,{magazine:state.magazine,reserve:state.reserve,
        laserCharge:id===LASER_MUSKET.id?ensureLaserState(state).laserCharge:undefined});
      cancelWeaponReload(state);
      state.magazine=getWeaponSpec(id).magazineSize;
    }
    emptyClickLatched=false;
  }else{
    for(const [id,ammo] of preInfiniteAmmo){
      const state=arsenalStates[id];
      if(id===LASER_MUSKET.id)cancelLaserCrank(state,{refund:false});
      state.magazine=ammo.magazine;
      state.reserve=ammo.reserve;
      if(id===LASER_MUSKET.id)state.laserCharge=ammo.laserCharge??0;
      cancelWeaponReload(state);
    }
    preInfiniteAmmo.clear();
  }
  refreshWeaponHUD();
  showShotNotice(infiniteAmmo?'INFINITE AMMO ENABLED · M TO DISABLE':
    'NORMAL AMMO RESTORED · M TO ENABLE');
}
$('infiniteAmmoToggle').addEventListener('click',toggleInfiniteAmmo);
refreshWeaponHUD();
function groundHeight(x,z){return Math.max(rampHeight(x,z),stairsHeight(x,z));}
const player={x:stations[0].x,z:stations[0].z,jump:0,vertical:0};
const playerAvatar=createPlayerAvatar(scene);
// Old survivor-held model stays hidden. Third-person renders the same new
// 10mm geometry attached to the animated hand socket.
playerAvatar.setHeldWeapon(null);
const heldTenMM=createTenMillimeterPistol(THREE,playerAvatar.weaponSocket,{thirdPerson:true});
const heldPipePistol=createPipePistol(THREE,playerAvatar.weaponSocket,{thirdPerson:true});
const heldPipeRifle=createPipeRifle(THREE,playerAvatar.weaponSocket,{thirdPerson:true});
const heldLaserMusket=createLaserMusket(THREE,playerAvatar.weaponSocket,{thirdPerson:true});
const heldDoubleBarrel=createDoubleBarrelShotgun(THREE,playerAvatar.weaponSocket,{thirdPerson:true});
const heldPumpShotgun=createPumpActionShotgun(THREE,playerAvatar.weaponSocket,{thirdPerson:true});
const heldHuntingRifle=createHuntingRifle(THREE,playerAvatar.weaponSocket,{thirdPerson:true});
const heldWornRevolver=createWornRevolver(THREE,playerAvatar.weaponSocket,{thirdPerson:true});
const heldPipeSMG=createPipeSMG(THREE,playerAvatar.weaponSocket,{thirdPerson:true});
const heldHeavySniper=createHeavySniper(THREE,playerAvatar.weaponSocket,{thirdPerson:true});
// Each rebuilt gun has two named sockets mounted *inside* its grip surfaces.
// One arm takes the trigger, the other supports the front wood/receiver.
// Nothing is spawned as a loose hand-shaped prop behind the character.
const heldWorldModels=new Map([
  [TEN_MM_PISTOL.id,heldTenMM],[PIPE_PISTOL.id,heldPipePistol],
  [PIPE_RIFLE.id,heldPipeRifle],[LASER_MUSKET.id,heldLaserMusket],
  [DOUBLE_BARREL_SHOTGUN.id,heldDoubleBarrel],
  [PUMP_ACTION_SHOTGUN.id,heldPumpShotgun],
  [BOLT_HUNTING_RIFLE.id,heldHuntingRifle],
  [IRON_REVOLVER.id,heldWornRevolver],[PIPE_SMG.id,heldPipeSMG],
  [HEAVY_SNIPER.id,heldHeavySniper]
]);
const heldWorldGrips=new Map();
for(const [id,model] of heldWorldModels){
  const positions=WORLD_WEAPON_GRIPS[id];
  if(!positions)throw new Error('World handholds missing for '+id);
  const right=new THREE.Group(),left=new THREE.Group();
  right.name=id+'_TriggerGrip';
  left.name=id+'_SupportGrip';
  right.position.set(...positions.right);
  left.position.set(...positions.left);
  model.root.add(right,left);
  if(positions.holdOffsetZ)model.root.position.z+=positions.holdOffsetZ;
  heldWorldGrips.set(id,{right,left});
}
playerAvatar.root.visible=false;
// Independent world-space survivor: a two-character visibility and armor
// preview at Station 8. This is NOT a networked player or a combat hitbox.
const remotePreview=createRemotePlayerVisual(scene,'station8-preview');
const remotePreviewArmor={
  head:'ranger-head',chest:'citadel-chest',
  leftArm:'scrap-leftArm',rightArm:'militia-rightArm',
  leftLeg:'ranger-leftLeg',rightLeg:'citadel-rightLeg'
};
const remotePreviewPose={x:-57,z:-9,ground:0,yaw:.62,speed:0,alive:true};
remotePreview.sync({...remotePreviewPose,armor:remotePreviewArmor},.016);
let thirdPersonEnabled=false,thirdPersonActive=false;
let labEndurance=specialState.attributes.endurance;
setEndurance(player,labEndurance);
function adjustEndurance(change=0){
  if(change>0){
    const outcome=allocateSpecialPoint(specialState,'endurance');
    if(outcome.ok)updateSpecialBonuses();
    else showShotNotice(outcome.reason==='no-stat-points'?
      'NO SPECIAL POINTS · EARN LEVELS FOR MORE':'ENDURANCE IS MAXED');
  }
  if(change<0)showShotNotice('ENDURANCE IS PERMANENT · OPEN SPECIAL WITH L');
  labEndurance=setEndurance(player,specialState.attributes.endurance);
  $('enduranceValue').textContent=String(labEndurance);
  $('enduranceHUD').textContent=String(labEndurance);
  $('sprintTime').textContent=maximumStamina(labEndurance)+' sec sprint · '+
    (maximumStamina(labEndurance)/staminaRecoveryRate(labEndurance)).toFixed(1)+
    ' sec full recovery';
  $('staminaFill').style.width=(100*player.stamina/maximumStamina(labEndurance)).toFixed(1)+'%';
  $('staminaNumber').textContent=Math.round(100*player.stamina/maximumStamina(labEndurance))+'%';
}
$('endDown').disabled=true;
$('endUp').addEventListener('click',()=>adjustEndurance(1));
adjustEndurance(0);
const keys=new Set();
const forward=new THREE.Vector3();
const clock=new THREE.Clock();
let stationIndex=0,qualityHigh=!reducedRenderer;
$('quality').textContent='QUALITY: '+(qualityHigh?'HIGH':'LOW');
function resetPlayer(i){
  const previousStation=stationIndex;
  stationIndex=i;const s=stations[i];
  if(i===8&&previousStation!==8){
    enemyAIEnabled=true;
    resetPlayerHealth(playerHealth);
    refreshPlayerHealth();
    // Ensure a clear, repeatable view of every enemy on first entry.
    resetEnemies();
  }
  player.x=s.x;player.z=s.z;player.jump=0;player.vertical=0;player.supported=false;
  resetMotion(player);
  // Reset both the view direction and the unrecovered weapon kick.
  resetWeaponRecoil(viewRecoil);
  // Face the enemy rather than relying on a hard-coded lab bearing.
  // Three.js camera forward after yaw is (-sin(yaw), 0, -cos(yaw)).
  // Snap toward the scout on station 9, even if future spawns move.
  const scout=enemies.get('scout');
  const lookYaw=i===8&&scout?
    Math.atan2(-(scout.brain.x-player.x),-(scout.brain.z-player.z)):
    -Math.PI/2;
  camera.rotation.set(0,lookYaw,0);
  $('stationName').textContent=s.title;$('stationInfo').textContent=s.info;
  camera.position.set(player.x,groundHeight(player.x,player.z)+player.eyeHeight,player.z);
}
resetPlayer(0);
if(new URLSearchParams(location.search).get('station')==='9')resetPlayer(8);
// Read-only smoke instrumentation. Active ONLY with ?smoke=1 so CI can
// check actual Three.js gameplay rather than matching code strings.
if(new URLSearchParams(location.search).get('smoke')==='1'){
  // CI-only ammo fixture: makes the empty-trigger regression test fast on
  // software WebGL, without wasting many slow render frames on a full mag.
  window.__rpgSmokeVisitCampaignNode=id=>{
    const node=CAMPAIGN_NODES.find(node=>node.id===id);
    if(!node)return false;
    player.x=node.x+1.4;player.z=node.z;
    player.jump=0;player.vertical=0;resetMotion(player);
    return nearCampaignNode()?.id===id;
  };
  window.__rpgSmokeCampaignGrantSalvage=(quantity=2)=>{
    const result=addItem(backpack,'supply:salvage',quantity);
    saveBackpack();refreshInventoryUI();return result.added;
  };
  window.__rpgSmokeTeleportToPowerBay=()=>{
    resetPlayer(7);
    return nearPoweredSuit();
  };
  // Visual QA only: park a free observer at the actual rear/front of the rig.
  // This never runs in the public game without ?smoke=1.
  window.__rpgSmokePreviewPowerFrame=(front=false)=>{
    stationIndex=7;
    poweredSuit.root.updateMatrixWorld(true);
    const position=poweredSuit.root.localToWorld(
      new THREE.Vector3(0,0,front?3.2:-2.90));
    player.x=position.x;player.z=position.z;
    player.jump=0;player.vertical=0;resetMotion(player);
    camera.position.set(player.x,1.82,player.z);
    const look=poweredSuit.root.localToWorld(
      new THREE.Vector3(0,1.62,0));
    camera.lookAt(look);
    // The inspection capture must show the ENTIRE chest/leg silhouette;
    // a weapon drawn across its middle hid the defects in earlier QA.
    weaponVisuals.get(activeWeaponId).root.visible=false;
    return {rear:nearRearHatch(),front};
  };
  // Snapshot-only visual QA fixture: gives screenshot tests a deterministic
  // complete T-45 / T-60 / T-01 suit without minting save items, consuming
  // loot, or changing public gameplay. Only installed with ?smoke=1.
  window.__rpgSmokePowerVisualLoadout=(tier='none')=>{
    if(!['none','t45','t60','t01'].includes(tier))return false;
    if(powerArmorState.phase!=='idle'||powerArmorState.occupied)return false;
    for(const slot of POWER_ARMOR_SLOTS)
      setPowerPlate(powerArmorState,slot,tier);
    poweredSuit.updatePlates(powerArmorState);
    return true;
  };
  // Real 3D QA for the long-standing "enemies shoot backwards" report.
  // Place the viewer on the model's intended front axis with combat frozen.
  // Screenshot and world-forward vector must both show a facing rifle.
  window.__rpgSmokePreviewEnemy=(id='scout')=>{
    const target=enemies.get(id);
    if(!target?.state.alive)return null;
    enemyAIEnabled=false;
    stationIndex=8;
    player.x=target.brain.x;
    player.z=target.brain.z-6.0;
    player.jump=0;player.vertical=0;resetMotion(player);
    target.brain.yaw=Math.atan2(player.x-target.brain.x,
      player.z-target.brain.z);
    target.root.rotation.y=target.brain.yaw;
    target.rigged?.root.updateMatrixWorld(true);
    camera.position.set(player.x,1.70,player.z);
    camera.lookAt(target.brain.x,1.62,target.brain.z);
    weaponVisuals.get(activeWeaponId).root.visible=false;
    const aim=target.rigged?.getWorldForward();
    const expected=new THREE.Vector3(player.x-target.brain.x,0,
      player.z-target.brain.z).normalize();
    return {id,yaw:target.brain.yaw,
      frontDot:aim?.dot(expected)??null,
      muzzle:target.rigged?.getMuzzleWorldPosition()?.toArray()||null};
  };
  window.__rpgSmokeApproachPowerCache=()=>{
    player.x=-53;player.z=-9;player.jump=0;player.vertical=0;resetMotion(player);
    return nearestLootBag()?.source==='power-cache';
  };
  // Hold the exact phase during visual smoke checks, independent of GPU frame rate.
  window.__rpgSmokeReloadHold=null;
  window.__rpgSmokeSetReloadAnimation=(id,progress=.5)=>{
    if(!ARSENAL_IDS.includes(id))return false;
    selectWeapon(id);
    const spec=getWeaponSpec(id),state=arsenalStates[id];
    state.magazine=Math.min(state.magazine,spec.magazineSize-1);
    state.reserve=Math.max(state.reserve,spec.magazineSize);
    cancelWeaponReload(state);
    state.reloadDuration=spec.reloadSeconds;
    state.reloadRemaining=spec.reloadSeconds*(1-Math.max(.01,Math.min(.98,progress)));
    window.__rpgSmokeReloadHold={id,remaining:state.reloadRemaining};
    return true;
  };
  window.__rpgSmokeReloadGeometry=()=>{
    const visual=weaponVisuals.get(activeWeaponId);
    return {id:activeWeaponId,
      magazineVisible:visual.magazine.visible,
      magazineOffset:visual.magBaseY-visual.magazine.position.y,
      cylinderOpen:visual.cylinderYoke?.rotation.y||0,
      roundVisible:visual.reloadAction?.visible||false,
      boltOffset:visual.boltHandle?.position.z||0,
      pumpOffset:visual.pumpGrip?.position.z||0,
      supportArmPieces:visual.supportHand?.children.length||0,
      supportHandVisible:visual.supportHand?.visible??null,
      state:reloadPoseForWeapon(activeWeaponId,
        weaponState.reloadRemaining,weaponState.reloadDuration||activeSpec.reloadSeconds,
        weaponState.reloadRounds||null)};
  };
  window.__rpgSmokePowerTransition=()=>togglePoweredSuit();
  window.__rpgSmokeSetPowerProgress=(fraction)=>{
    if(powerArmorState.phase!=='idle')
      powerArmorState.elapsed=Math.min(POWER_ARMOR_TRANSITION_SECONDS-.01,
        Math.max(0,fraction*POWER_ARMOR_TRANSITION_SECONDS));
  };
  window.__rpgSmokePowerVisual=()=>({
    rearHatchOpenAngle:poweredSuit.doors.left.rotation.y,
    rearHatch:true,
    frameFeatures:{...poweredSuit.frameFeatures},
    rearHatchInReach:nearRearHatch(),
    helmetOpenAngle:poweredSuit.helmetPivot.rotation.x,
    visiblePlates:Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>
      [slot,poweredSuit.plateMeshes[slot].filter(mesh=>mesh.visible).length])),
    moduleSections:Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>
      [slot,poweredSuit.moduleMeshes[slot].filter(mesh=>mesh.visible).length])),
    plateAppearance:Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>{
      const tier=powerArmorState.plates[slot];
      const shell=poweredSuit.plateMeshes[slot][0];
      const face=shell?.userData.tierFaces?.[tier];
      return [slot,{tier,color:face?.material.color.getHex()??null,
        contour:face?.geometry.type??null}];
    })),
    modelContours:{...poweredSuit.plateMeshes.head[0].userData.profileOutlines},
    plateRoles:Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>
      [slot,poweredSuit.plateMeshes[slot].map(mesh=>
        mesh.userData.plateRole)])),
    modelDetails:Object.fromEntries(POWER_ARMOR_SLOTS.map(slot=>
      [slot,Object.fromEntries(['t45','t60','t01'].map(tier=>
        [tier,poweredSuit.plateMeshes[slot].some(shell=>
          shell.userData.modelDetails?.[tier]?.visible===true)]))])),
    pilotVisible:poweredSuit.pilot.visible,
    pilotModel:pilotAvatar.root.name,
    pilotArmor:pilotAvatar.armor,
    pilotDepth:poweredSuit.pilot.position.z,
    pilotFacing:poweredSuit.pilot.rotation.y,
    pilotFloorHeight:poweredSuit.pilot.position.y,
    pilotStride:poweredSuit.pilot.userData.entryPose?.step||0,
    pilotStrideDistance:poweredSuit.pilot.userData.entryPose?.distance||0,
    pilotLegJoints:pilotAvatar.root.userData.boardingJointAngles,
    pilotLegIK:pilotAvatar.root.userData.boardingLegIK,
    pilotGripDistances:pilotAvatar.root.userData.boardingGripDistances||null,
    pilotFootTargets:poweredSuit.pilot.userData.entryPose?.footTargets||null,
    pilotStage:poweredSuit.pilot.userData.entryPose?.stage||'parked',
    pilotFootLifts:poweredSuit.pilot.userData.entryPose?.footLifts||[0,0],
    stepsDeployed:{lowerZ:poweredSuit.steps.lowerTread.position.z,
      upperZ:poweredSuit.steps.upperTread.position.z},
    dorsalHatchAngle:poweredSuit.spineHatch.parent.rotation.y,
    cameraFade:Number($('powerTransitionFade').style.opacity||0),
    jointRig:{
      arms:poweredSuit.rig.arms.map(a=>({
        shoulder:a.shoulder.rotation.z,elbow:a.elbow.rotation.x,
        wrist:a.wrist.rotation.x,fingers:a.fingerJoints.length
      })),
      legs:poweredSuit.rig.legs.map(a=>({
        hip:a.hip.rotation.x,knee:a.knee.rotation.x,
        ankle:a.ankle.rotation.x,toe:a.toeHinge.rotation.x
      })),
      activePistons:poweredSuit.rig.actuators.filter(a=>
        Number.isFinite(a.shaft.scale.y)&&a.shaft.scale.y>.01).length
    },
    pilotWalking:poweredSuit.pilot.userData.entryPose?.walking||false,
    cameraHeightAboveGround:camera.position.y-groundHeight(player.x,player.z),
    chassisHeight:poweredSuit.size.y,
    chassisWidth:poweredSuit.size.x,
    cinematic:powerCinematic!==null,
    cameraDistanceToHero:camera.position.distanceTo(
      poweredSuit.root.localToWorld(new THREE.Vector3(1.55,1.95,-3.70)))
  });
  window.__rpgSmokeCompletePowerTransition=()=>{
    if(powerArmorState.phase!=='idle')
      powerArmorState.elapsed=POWER_ARMOR_TRANSITION_SECONDS-.001;
  };
  window.__rpgSmokeShotBlock=(from,to)=>firstSolidHit(from,to,bounds);
  window.__rpgSmokeIncomingDamage=(weaponId='heavy-rifle',armorTier='aegis',
    powered=false)=>{
    const gun=getEnemyWeapon(weaponId);
    if(!gun)return null;
    const slot='chest';
    const armor=getArmorPiece(slot,armorTier==='none'?'none':armorTier+'-'+slot);
    const suit=createPowerArmorState();
    suit.occupied=!!powered;
    for(const s of POWER_ARMOR_SLOTS)suit.plates[s]='citadel';
    return calculateIncomingShot(gun.damage,armor.points,suit,slot);
  };
  // W09.10 browser regression: changing the position of a hidden player
  // must not steer or freeze an alerted bot on its way to a last sighting.
  window.__rpgSmokeOccludedPursuit=()=>{
    const wall={minX:39,maxX:41,minZ:38,maxZ:42,height:2.8};
    const e=createEnemyBrain({x:45,z:40,yaw:-Math.PI/2,
      patrol:[{x:45,z:40}]});
    const t=makeEnemyTactics('raider');
    alertEnemy(e,{x:43,z:40});markEnemyThreat(t);
    let nearest=Infinity,hiddenFrames=0,stuckHolds=0;
    for(let i=0;i<70;i++){
      const hidden={x:36,z:i%2===0?39:41};
      const visible=hasSight(e,hidden,[wall]);
      if(!visible)hiddenFrames++;
      const known=visible?hidden:e.lastSeen;
      tickEnemyTactics(t,e,known,.05,[wall],{targetVisible:visible});
      if(!visible&&(t.crouching||t.goal||t.phase==='hold'))stuckHolds++;
      stepEnemyBrain(e,hidden,.05,[wall],{targetVisible:visible,
        area:AI_TUNING.navigationArea,combatGoal:t.goal,
        combatHold:t.phase==='hold',combatFacePlayer:true});
      nearest=Math.min(nearest,Math.hypot(e.x-43,e.z-40));
      if(nearest<.7)break;
    }
    return {nearest,hiddenFrames,stuckHolds,lastSeen:e.lastSeen,
      mode:e.mode,finalX:e.x};
  };
  window.__rpgSmokeGiveAmmo=(weaponId='scrap-pistol',amount=1000)=>{
    const result=addItem(backpack,'ammo:'+weaponId,amount);
    syncAmmoToWeapons();saveBackpack();refreshInventoryUI();refreshWeaponHUD();
    return result;
  };
  window.__rpgSmokeGiveBenchMaterials=()=>{
    addItem(backpack,'supply:salvage',30);
    addItem(backpack,'supply:optic-glass',15);
    saveBackpack();return true;
  };
  window.__rpgSmokeSightVisual=(weaponId=activeWeaponId)=>{
    const root=weaponVisuals.get(weaponId)?.root;
    const variants=[];
    root?.traverse(object=>{
      if(object.userData.opticVariant)variants.push(object.userData.opticVariant);
    });
    return {variant:variants[0]||'factory',count:variants.length};
  };
  window.__rpgSmokeAimAtScout=()=>{
    const target=enemies.get('scout');
    const dx=target.brain.x-camera.position.x;
    const dz=target.brain.z-camera.position.z;
    camera.rotation.y=Math.atan2(-dx,-dz);
    // Sight a real solid chest hitbox, avoiding the narrow gap between
    // the chest and head at the player's default 1.7 m eye height.
    camera.rotation.x=-Math.atan2(camera.position.y-1.34,Math.hypot(dx,dz));
    resetWeaponRecoil(viewRecoil);
  };
  window.__rpgSmokeFinishReload=()=>{
    // Run the real reload-completion path on the next update, without
    // waiting for 60 slow software-WebGL animation frames in CI.
    if(weaponState.reloadRemaining>0)weaponState.reloadRemaining=.001;
  };
  window.__rpgSmokeSetRemotePreviewArmor=(slot,id)=>{
    if(!Object.prototype.hasOwnProperty.call(remotePreviewArmor,slot))return false;
    remotePreviewArmor[slot]=id;
    remotePreview.sync({...remotePreviewPose,armor:remotePreviewArmor},.016);
    return true;
  };
  window.__rpgSmokeSetMagazine=(count)=>{
    weaponState.magazine=Math.max(0,Math.min(activeSpec.magazineSize,
      Math.floor(Number.isFinite(count)?count:0)));
    weaponState.cooldown=0;
  };
  window.__rpgSmokeSpawnLoot=(enemyId='scout')=>{
    // CI-only fixture exercises the very same spawn routine used by an
    // actual enemy death, without another 30 seconds of headless shooting.
    return spawnEnemyLoot(enemies.get(enemyId));
  };
  // Aim a diagnostic ray at the REAL animated joint, never an old,
  // hard-coded 2.03m mannequin head that overlaps the new chest.
  window.__rpgSmokeHitZone=(id='scout',slot='head')=>{
    const enemy=enemies.get(id);
    if(!enemy||!['head','neck','chest'].includes(slot))return null;
    enemy.root.updateWorldMatrix(true,true);
    const joints=enemy.rigged.hitJoints;
    const anchor=slot==='head'?joints.head:
      slot==='neck'?joints.neck:joints.torso;
    const offset=slot==='head'?.035:slot==='neck'?.02:.33;
    const target=anchor.localToWorld(new THREE.Vector3(0,offset,0));
    const ray=new THREE.Raycaster(target.clone().add(new THREE.Vector3(0,0,3)),
      new THREE.Vector3(0,0,-1),0,6);
    ray.layers.enable(ENEMY_COLLISION_LAYER);
    const equipped=enemy.meshes.filter(mesh=>mesh.userData.equipped!==false);
    return {expected:slot==='head'?'head':'chest',
      actual:ray.intersectObjects(equipped,false)[0]?.object.userData.hitZone||null,
      targetY:target.y};
  };
  window.__rpgSmokeNeckHit=()=>window.__rpgSmokeHitZone('scout','neck')?.actual;
  window.__rpgSmokeMoveOutsideArena=()=>{
    stationIndex=0;player.x=8;player.z=8;
    camera.position.set(8,player.eyeHeight,8);
    return !inAIArena();
  };
  window.__rpgSmokeDownEnemy=(id='scout')=>{
    const enemy=enemies.get(id);
    const hit=applyDamage(enemy.state,100000,'chest');
    if(hit.killed)markEnemyDefeated(enemy);
    return hit.killed;
  };
  window.__rpgSmokeSetThirdPerson=enabled=>{
    thirdPersonEnabled=!!enabled;return thirdPersonEnabled;
  };
  window.__rpgSmokeLongRangeEngage=()=>{
    resetEnemies();
    stationIndex=0;player.x=16;player.z=46;
    resetMotion(player);camera.position.set(16,1.7,46);
    const raider=enemies.get('raider');
    alertEnemy(raider.brain,{x:player.x,z:player.z});
    raider.tactics.cooldown=0; // CI fixture skips initial no-fire grace period
    return {distance:Math.hypot(raider.brain.x-player.x,raider.brain.z-player.z),
      insideArena:inAIArena(),memory:raider.brain.memory};
  };
  window.__rpgSmokeApproachLoot=(bagId)=>{
    const bag=bagId?lootBags.get(bagId):[...lootBags.values()].find(b=>b.source!=='power-cache');
    if(!bag)return false;
    player.x=bag.x+.75;player.z=bag.z+.25;
    camera.position.x=player.x;camera.position.z=player.z;
    return !!nearestLootBag();
  };
  window.__rpgSmokeState=()=>({
    stationIndex,arenaActive:inAIArena(),locked:controls.isLocked,
    worldArt:wastelandArt.metrics,impactEffects:impactEffects.metrics,
    shot: lastShotDebug,weaponShots:weaponState.shotsFired,
    weapon:{id:activeSpec.id,magazine:weaponState.magazine,
      reserve:weaponState.reserve,reloadRemaining:weaponState.reloadRemaining,
      reloadDuration:weaponState.reloadDuration,reloadRounds:weaponState.reloadRounds,
      reloadLoaded:weaponState.reloadLoaded,
      cooldown:weaponState.cooldown},
    triggerHeld,emptyClickLatched,dryFireClicks,
    squad:{remaining:squadIntel.remaining,source:squadIntel.source,
      alerts:squadIntel.alerts},
    workbenchOpen,optic:installedWeaponOptic(backpack,activeWeaponId),
    special:{...specialState,attributes:{...specialState.attributes},
      perks:{...specialState.perks},bonuses:{...specialModifiers},open:specialOpen},
    campaign:{...safeCampaignSnapshot(campaignState),journal:campaignJournal(campaignState),
      panelOpen:questPanelOpen,dialogueOpen,
      worldPowered:havenPowerLamp.intensity>0,residents:campaignResidents.length},
    scopedFOV:camera.fov,
    hud:{mode:document.body.classList.contains('in-power-armor')?'visor':'field',
      fieldVisible:!$('fieldHud').classList.contains('hidden'),
      visorVisible:!$('powerVisorHud').classList.contains('hidden'),
      debug:document.body.classList.contains('debug-hud'),
      fieldAmmo:$('fieldAmmo').textContent,visorAmmo:$('visorAmmo').textContent,
      core:$('visorCoreNumber').textContent,integrity:$('visorIntegrity').textContent},
    powerArmor:{occupied:powerArmorState.occupied,phase:powerArmorState.phase,
      plates:{...powerArmorState.plates},plateDurability:{...powerArmorState.plateDurability},
      coreCharge:powerArmorState.coreCharge,mobility:powerArmorMobility(powerArmorState),
      visible:poweredSuit.root.visible,
      cockpit:poweredCockpit.visible},
    inventory:{slots:backpack.items.length,
      items:backpack.items.map(e=>({...e})),
      ammoReserves:{...backpack.ammoReserves},
      armor:{...backpack.equipment.armor},
      clothing:{...backpack.equipment.clothing},
      equippedWeapon:backpack.equipment.weapon},
    loot:[...lootBags.values()].map(b=>({id:b.id,x:b.x,z:b.z,
      source:b.source,items:b.items.map(i=>({...i}))})),
    lootOpen,inventoryOpen,
    remotePreview:remotePreview.state,
    camera:{x:camera.position.x,y:camera.position.y,z:camera.position.z,
      yaw:camera.rotation.y,pitch:camera.rotation.x},
    playerVisual:{thirdPersonEnabled,thirdPersonActive,
      visible:playerAvatar.root.visible,
      height:playerAvatar.metrics.height,
      pose:playerAvatar.metrics.pose,
      heldWeapon:playerAvatar.metrics.heldWeapon,
      landing:playerAvatar.metrics.land,
      recoil:playerAvatar.metrics.recoil,
      crouch:playerAvatar.metrics.crouched,
      armor:playerAvatar.armor,
      armorPieces:playerAvatar.visibleArmorPieces,
      clothing:playerAvatar.clothing,
      visibleClothing:playerAvatar.visibleClothing,
      name:playerAvatar.root.name},
    aiEnabled:enemyAIEnabled,playerHealth:playerHealth.health,
    player:{x:player.x,z:player.z,crouched:!!player.crouched,
      crouchToggle:!!player.crouchToggle,eyeHeight:player.eyeHeight},
    enemies:[...enemies.values()].map(e=>({
      id:e.id,x:e.brain.x,z:e.brain.z,
      mode:e.brain.mode,health:e.state.health,alive:e.state.alive,
      visible:e.root.visible,deathTimer:e.deathTimer,flash:e.flash,
      armor:{...e.state.loadout},
      modelHeight:e.rigged?.metrics.height??null,
      modelRepairs:e.rigged?.metrics.repairs??0,
      originalVisual:e.rigged?.state??null,
      // Report the ACTUAL visible cosmetic armor, never ghost hitboxes.
      armorVisible:Object.fromEntries(ARMOR_SLOTS.map(slot=>
        [slot,(e.rigged?.state?.armorPieces?.[slot]||0)>0])),
      legacyRenderMeshes:e.meshes.filter(m=>m.visible||
        m.material.visible||m.castShadow).length,
      legacyGroupVisible:e.upperBody.visible,
      visualLocalYaw:e.rigged?.root.rotation.y??null,
      frontVector:e.rigged?.getWorldForward()?.toArray()||null,
      muzzlePosition:e.rigged?.getMuzzleWorldPosition()?.toArray()||null,
      avatarRoots:e.root.children.filter(child=>child===e.rigged?.root).length,
      tacticalPhase:e.tactics.phase,enemyShots:e.tactics.shots,
      measuredSpeed:e.brain.actualSpeed,coverCommit:e.tactics.coverCommit,
      coverGoal:e.tactics.coverPoint,navWaypoints:e.brain.route.length,
      weaponId:e.tactics.weaponId,burstCount:e.tactics.burstCount,
      weaponRpm:getEnemyWeapon(e.tactics.weaponId)?.rpm||null,
      fireCooldown:e.tactics.cooldown,
       modelStatus:e.modelStatus,
      crouching:e.tactics.crouching,pace:e.tactics.pace,
      decision:e.tactics.decisionReason,
      squadOrder:squadDirector.orders.get(e.id)?.type||null,
      aimLockSeconds:e.brain.aimLockSeconds,
      yaw:e.brain.yaw,lastSeen:e.brain.lastSeen,
      seesPlayer:hasSight(e.brain,player,bounds),
      coverPoint:e.tactics.coverPoint,stuckEvents:e.tactics.stuckEvents
    }))
  });
}
// W18.0 playable campaign: no quest rewards or reputations live in the DOM.
const CAMPAIGN_DIALOGUE={
  dispatch:'The relay woke up after years of silence. Its records could rebuild the region—or put it under martial law.',
  relay:'An old encrypted uplink is pulsing through the dead network. Its memory banks are still intact.',
  water:'Haven Junction has families waiting on clean water. Our pump is missing critical components.',
  pump:'The purifier motor is seized. Two units of salvage can rebuild the drive coupling.',
  dominion:'Supply convoys are being attacked. An armed Raider is operating in the eastern combat sector.',
  courier:'The courier was carrying infrastructure plans and proof that the old military command lied about what happened to the frontier. Both could save lives—or start another war.',
  foreman:'I am the last electrician left in Haven Junction. The old generator is burned out, the crew is terrified, and everybody has a different idea of who should own the lights.',
  generator:'The junction bus is blackened. A cracked regulator leaks power, and the intake coils need fresh copper. Four units of salvage should restore it.'
};
let selectedCampaignQuest=null;
function nearCampaignNode(){
  let best=null,range=2.8;
  for(const node of CAMPAIGN_NODES){
    const d=Math.hypot(player.x-node.x,player.z-node.z);
    if(d<range){best=node;range=d;}
  }
  return best;
}
function refreshCampaignUI(){
  const journal=campaignJournal(campaignState);
  const tracked=journal.find(q=>q.tracked);
  $('questTracker').classList.toggle('hidden',!tracked);
  $('questTrackerTitle').textContent=tracked?.title.toUpperCase()||'';
  $('questTrackerObjective').textContent=tracked?.objective||'';
  $('campaignCaps').textContent=campaignState.caps+' CAPS';
  const rep=$('campaignReputation');rep.replaceChildren();
  for(const [id,faction] of Object.entries(CAMPAIGN_FACTIONS)){
    const row=document.createElement('div');row.className='campaign-faction';
    const name=document.createElement('span');name.textContent=faction.name;
    const score=document.createElement('b');const value=campaignState.reputation[id];
    score.textContent=(value>=0?'+':'')+value;
    score.style.color=value<0?'#f2a38e':faction.color;
    row.append(name,score);rep.append(row);
  }
  const visible=journal.filter(q=>q.status!=='available');
  const list=$('campaignQuestList');list.replaceChildren();
  if(!visible.length){
    const hint=document.createElement('p');hint.className='campaign-hint';
    hint.textContent='No quests discovered. Talk to RELAY DISPATCH at Station 7, or explore the colored world terminals.';
    list.append(hint);
  }
  if(!visible.some(q=>q.id===selectedCampaignQuest))
    selectedCampaignQuest=tracked?.id||visible[0]?.id||null;
  for(const quest of visible){
    const button=document.createElement('button');button.type='button';
    button.className='campaign-quest'+(selectedCampaignQuest===quest.id?' selected':'');
    const heading=document.createElement('strong');heading.textContent=quest.title;
    const meta=document.createElement('small');
    meta.textContent=quest.type.toUpperCase()+' · '+quest.status.toUpperCase();
    button.append(heading,meta);
    button.addEventListener('click',()=>{
      selectedCampaignQuest=quest.id;refreshCampaignUI();
    });
    list.append(button);
  }
  const selected=visible.find(q=>q.id===selectedCampaignQuest);
  $('campaignQuestTitle').textContent=selected?.title||'NO ACTIVE QUEST';
  $('campaignQuestDescription').textContent=selected?.description||
    'Investigate the terminals at the testing stations to begin the story.';
  $('campaignQuestObjective').textContent=selected?.objective||'EXPLORE THE FRONTIER';
  $('campaignQuestReward').textContent=selected?.reward||'';
  $('campaignTrack').disabled=!selected||selected.status!=='active'||selected.tracked;
  $('campaignTrack').textContent=selected?.tracked?'TRACKING':'TRACK QUEST';
  // Consequences are physical and persistent, not just numbers in a menu.
  const powered=campaignState.quests['haven-first-light']?.status==='completed';
  const cleanWater=campaignState.quests['water-debt']?.status==='completed';
  havenPowerLamp.intensity=powered?(qualityHigh?2.3:.9):0;
  havenStreetLamp.intensity=powered?(qualityHigh?1.6:.6):0;
  liveCable.emissiveIntensity=powered?.68:0;
  const relayOutcome=campaignState.quests['dead-signals']?.outcome;
  for(const marker of campaignMarkers){
    if(marker.id==='relay'&&relayOutcome){
      const c=relayOutcome==='dominion'?0x83bbff:0x8be9b1;
      marker.indicator.color.setHex(c);marker.indicator.emissive.setHex(c);
    }
    marker.indicator.emissiveIntensity=marker.id==='generator'&&powered?1.65:
      marker.id==='pump'&&cleanWater?1.3:.48;
  }
}
function applyCampaignResult(result){
  if(!result.changed)return false;
  campaignState=result.state;
  saveCampaign();
  if(result.type==='completed'){
    awardSpecialExperience(result.xp,'quest');
    const title=CAMPAIGN_QUESTS[result.questId].title.toUpperCase();
    showShotNotice('QUEST COMPLETE · '+title+' · +'+result.xp+' XP · +'+result.caps+' CAPS');
  }else if(result.type==='started'){
    showShotNotice('NEW QUEST · '+CAMPAIGN_QUESTS[result.questId].title.toUpperCase()+' · Q JOURNAL');
  }else if(result.advanced?.length){
    showShotNotice('OBJECTIVE UPDATED · '+CAMPAIGN_QUESTS[result.advanced[0]].title.toUpperCase());
  }
  refreshCampaignUI();
  return true;
}
function recordCampaignObjective(event){
  return applyCampaignResult(advanceCampaignEvent(campaignState,event));
}
function consumeCampaignSalvage(amount){
  if(countItem(backpack,'supply:salvage')<amount)return false;
  let remaining=amount;
  for(const stack of [...backpack.items]){
    if(stack.itemId!=='supply:salvage'||remaining<=0)continue;
    const result=removeItem(backpack,stack.uid,remaining);
    remaining-=result.removed;
  }
  saveBackpack();refreshInventoryUI();return remaining===0;
}
function closeCampaignDialogue(){
  if(!dialogueOpen)return;
  dialogueOpen=false;activeDialogueNode=null;
  $('campaignDialogue').classList.add('hidden');
  if(dialogueFromField){dialogueFromField=false;controls.lock();}
  else $('menu').classList.remove('hidden');
}
function closeCampaignJournal(){
  if(!questPanelOpen)return;
  questPanelOpen=false;$('campaignPanel').classList.add('hidden');
  if(questFromField){questFromField=false;controls.lock();}
  else $('menu').classList.remove('hidden');
}
function openCampaignJournal(){
  if(questPanelOpen||dialogueOpen||specialOpen||powerUIOpen||
    lootOpen||inventoryOpen||workbenchOpen)return;
  questFromField=controls.isLocked;questPanelOpen=true;
  $('campaignPanel').classList.remove('hidden');
  $('menu').classList.add('hidden');refreshCampaignUI();
  if(controls.isLocked)controls.unlock();
}
function campaignConversationText(node){
  const q=id=>campaignState.quests[id];
  if(node.id==='foreman'){
    const quest=q('haven-first-light');
    if(quest?.status==='completed')return quest.outcome==='settlers'?
      'The school lights came back on first. We finally own something that no army can switch off. You gave this place a future.':
      'We have electricity, but Dominion guards now hold the keys. I hope their protection is worth what we signed away.';
    if(quest?.stage===3)return 'The crew made it. The junction is stable. Now the Dominion is offering guards if they get permanent control. The settlers want to run it ourselves. You decide.';
    if(quest?.stage===2)return 'The generator is ready but a Raider knows we have new parts. Unless someone stops him, the repair crew will not risk switching it on.';
    if(quest?.stage===1)return 'The regulator is ruined, just like I feared. Salvage four decent parts and I can splice the bus together.';
  }
  if(node.id==='courier'&&q('last-broadcast')?.stage===2)
    return 'The orders are genuine. The brass knew the evacuation route was full of civilians. Publishing this will give the region the truth—and make us enemies.';
  if(node.id==='water'&&q('water-debt')?.status==='completed')
    return 'The filters are running again. Children are carrying clean water home instead of spending all day searching for it.';
  if(node.id==='dispatch'&&q('dead-signals')?.status==='completed')
    return q('dead-signals').outcome==='settlers'?
      'The settlement engineers have already started decoding the archive. Maybe we can rebuild something that belongs to everybody.':
      'The Dominion seized the archive at dawn. They promised to share the findings, but their radios went quiet.';
  return CAMPAIGN_DIALOGUE[node.id]||'An unfamiliar voice crackles over the battered terminal.';
}
function renderCampaignDialogue(){
  const node=activeDialogueNode;
  if(!node)return;
  $('campaignDialogueTitle').textContent=node.name;
  $('campaignDialogueBody').textContent=campaignConversationText(node);
  const choices=$('campaignDialogueChoices');choices.replaceChildren();
  function choice(label,action,disabled=false){
    const button=document.createElement('button');
    button.type='button';button.textContent=label;
    button.disabled=disabled;
    button.addEventListener('click',()=>{
      if(disabled)return;
      action();
      if(dialogueOpen)renderCampaignDialogue();
    });
    choices.append(button);
  }
  function progress(id){return campaignState.quests[id];}
  function accept(id){
    const result=startCampaignQuest(campaignState,id);
    applyCampaignResult(result);
  }
  function finish(id,outcome){
    const result=resolveCampaignQuest(campaignState,id,outcome);
    applyCampaignResult(result);
  }
  switch(node.id){
    case 'dispatch':{
      const q=progress('dead-signals');
      if(!q)choice('ACCEPT · Dead Signals',()=>accept('dead-signals'));
      else if(q.status==='active'&&q.stage===1){
        choice('Give records to FREE SETTLEMENTS',()=>finish('dead-signals','settlers'));
        choice('Deliver records to IRON DOMINION',()=>finish('dead-signals','dominion'));
      }else if(q.status==='active')
        choice('Relay coordinates logged · investigate Station 6',()=>{},true);
      else choice('Dead Signals · CONTRACT COMPLETE',()=>{},true);
      break;
    }
    case 'relay':{
      const main=progress('dead-signals'),courier=progress('lost-courier');
      if(main?.status==='active'&&main.stage===0)
        choice('DOWNLOAD · Military relay records',()=>recordCampaignObjective('relay-scanned'));
      if(courier?.status==='active'&&courier.stage===0)
        choice('RECOVER · Courier transmission',()=>recordCampaignObjective('courier-evidence'));
      const broadcast=progress('last-broadcast');
      if(broadcast?.status==='active'&&broadcast.stage===0)
        choice('DECRYPT · Pre-war emergency broadcast',()=>recordCampaignObjective('blackout-log'));
      if((!main||main.stage!==0)&&(!courier||courier.stage!==0)&&
        (!broadcast||broadcast.stage!==0))
        choice('No active signals to recover · Check Q',()=>{},true);
      break;
    }
    case 'water':{
      const q=progress('water-debt');
      if(!q)choice('ACCEPT · Water Debt',()=>accept('water-debt'));
      else if(q.status==='active'&&q.stage===1){
        choice('Give the repaired pump to the settlement',()=>finish('water-debt','help'));
        choice('Demand extra caps for the work',()=>finish('water-debt','charge'));
      }else if(q.status==='active')
        choice('Repair the purifier at Station 2',()=>{},true);
      else choice('Water Debt · CONTRACT COMPLETE',()=>{},true);
      break;
    }
    case 'pump':{
      const q=progress('water-debt'),salvage=countItem(backpack,'supply:salvage');
      if(q?.status==='active'&&q.stage===0)
        choice('REPAIR · Spend 2 salvage ('+salvage+' owned)',()=>{
          if(consumeCampaignSalvage(2))recordCampaignObjective('pump-repaired');
        },salvage<2);
      else choice('A damaged filtration pump · Talk to the water coordinator',()=>{},true);
      break;
    }
    case 'dominion':{
      const q=progress('border-watch');
      if(!q)choice('ACCEPT · Border Watch',()=>accept('border-watch'));
      else if(q.status==='active'&&q.stage===1)
        choice('REPORT · Raider eliminated',()=>finish('border-watch','report'));
      else if(q.status==='active')
        choice('Eliminate the Raider at Station 9',()=>{},true);
      else choice('Border Watch · CONTRACT COMPLETE',()=>{},true);
      const broadcast=progress('last-broadcast');
      if(broadcast?.status==='active'&&broadcast.stage===1)
        choice('COMPARE · Archived Dominion orders',()=>recordCampaignObjective('orders-verified'));
      break;
    }
    case 'courier':{
      const q=progress('lost-courier');
      if(!q)choice('INVESTIGATE · The Missing Courier',()=>accept('lost-courier'));
      else if(q.status==='active'&&q.stage===1){
        choice('Share the plans with FREE SETTLEMENTS',()=>finish('lost-courier','settlers'));
        choice('Sell the plans to THE DIRECTORATE',()=>finish('lost-courier','directorate'));
      }else if(q.status==='active')
        choice('Find the courier recording at the relay',()=>{},true);
      else choice('The Missing Courier · CONTRACT COMPLETE',()=>{},true);
      const broadcast=progress('last-broadcast');
      if(!broadcast)choice('INVESTIGATE · The Last Broadcast',()=>accept('last-broadcast'));
      else if(broadcast.status==='active'&&broadcast.stage===2){
        choice('BROADCAST · Warn every settlement',()=>finish('last-broadcast','publish'));
        choice('BURY · Sell the evidence to the Directorate',()=>finish('last-broadcast','bury'));
      }else if(broadcast.status==='active')
        choice('Decrypt the relay, then verify military orders',()=>{},true);
      else choice('The Last Broadcast · COMPLETE',()=>{},true);
      break;
    }
    case 'foreman':{
      const q=progress('haven-first-light');
      if(!q)choice("ACCEPT · Haven's First Light",()=>accept('haven-first-light'));
      else if(q.status==='active'&&q.stage===3){
        choice('POWER TO THE PEOPLE · Community owns the grid',()=>finish('haven-first-light','settlers'));
        choice('DOMINION SECURITY · Exchange control for protection',()=>finish('haven-first-light','dominion'));
      }else if(q.status==='active')
        choice('Survey, repair and defend the generator before returning',()=>{},true);
      else choice('Haven Junction is powered · Decisions remembered',()=>{},true);
      break;
    }
    case 'generator':{
      const q=progress('haven-first-light');
      if(q?.status==='active'&&q.stage===0)
        choice('SURVEY · Inspect destroyed bus and regulator',()=>recordCampaignObjective('power-surveyed'));
      else if(q?.status==='active'&&q.stage===1){
        const salvage=countItem(backpack,'supply:salvage');
        choice('REBUILD · Spend 4 salvage ('+salvage+' owned)',()=>{
          if(consumeCampaignSalvage(4))recordCampaignObjective('power-repaired');
        },salvage<4);
      }else if(q?.status==='active'&&q.stage===2)
        choice('Repair complete · Defend the crew from a Raider (J resets the encounter)',()=>{},true);
      else if(q?.status==='completed')
        choice('Junction generator stable · Powered',()=>{},true);
      else choice('The generator is dead · Find the Haven foreman',()=>{},true);
      break;
    }
  }
  choice('LEAVE CONVERSATION',closeCampaignDialogue);
}
function openCampaignDialogue(node){
  if(!node||questPanelOpen||dialogueOpen||specialOpen||powerUIOpen||
    lootOpen||inventoryOpen||workbenchOpen)return;
  activeDialogueNode=node;dialogueOpen=true;
  dialogueFromField=controls.isLocked;
  $('campaignDialogue').classList.remove('hidden');
  $('menu').classList.add('hidden');
  renderCampaignDialogue();
  if(controls.isLocked)controls.unlock();
}
$('campaignClose').addEventListener('click',closeCampaignJournal);
$('campaignTrack').addEventListener('click',()=>{
  if(!selectedCampaignQuest)return;
  applyCampaignResult(trackCampaignQuest(campaignState,selectedCampaignQuest));
  refreshCampaignUI();
});
$('campaignDialogueClose').addEventListener('click',closeCampaignDialogue);

$('enterAI').addEventListener('click',()=>{
  resetPlayer(8);
  sound.unlock();
  controls.lock();
});
$('start').addEventListener('click',()=>{
  // The audio engine is unlocked only after the player initiates playback.
  sound.unlock();
  controls.lock();
});
canvas.addEventListener('click',()=>{if(!$('menu').classList.contains('hidden'))return;controls.lock();});
controls.addEventListener('lock',()=>{$('menu').classList.add('hidden');});
controls.addEventListener('unlock',()=>{
  cancelPowerHold();
  if(!inventoryOpen&&!lootOpen&&!workbenchOpen&&!powerUIOpen&&!specialOpen&&
    !questPanelOpen&&!dialogueOpen)$('menu').classList.remove('hidden');
  keys.clear();
  triggerHeld=false;emptyClickLatched=false;
  changeAim(false);
});
$('quality').addEventListener('click',()=>{
  qualityHigh=!qualityHigh;
  renderer.setPixelRatio(Math.min(devicePixelRatio,qualityHigh?1.6:1));
  sun.castShadow=qualityHigh;
  renderer.shadowMap.enabled=qualityHigh;
  $('quality').textContent='QUALITY: '+(qualityHigh?'HIGH':'LOW');
  wastelandArt.setQuality(qualityHigh);
  refreshCampaignUI();
});
window.addEventListener('keydown',e=>{
  if(e.code==='Escape'&&dialogueOpen){closeCampaignDialogue();return;}
  if(e.code==='Escape'&&questPanelOpen){closeCampaignJournal();return;}
  if(e.code==='Escape'&&specialOpen){closeSpecialPanel();return;}
  if(e.code==='Escape'&&powerUIOpen){closePowerArmorBay();return;}
  if(e.code==='Escape'&&workbenchOpen){closeWorkbench();return;}
  if(e.code==='Escape'&&(inventoryOpen||lootOpen)){closeLootOverlay();return;}
  if(e.code==='F3'&&!e.repeat){
    e.preventDefault();
    document.body.classList.toggle('debug-hud');
    grid.visible=document.body.classList.contains('debug-hud');
    showShotNotice(document.body.classList.contains('debug-hud')?
      'LAB DIAGNOSTICS SHOWN · F3 TO HIDE':'FIELD HUD · DIAGNOSTICS HIDDEN');
    return;
  }
  if(e.code==='KeyQ'&&!e.repeat){
    e.preventDefault();if(questPanelOpen)closeCampaignJournal();else openCampaignJournal();return;
  }
  if(e.code==='KeyL'&&!e.repeat){
    e.preventDefault();if(specialOpen)closeSpecialPanel();else openSpecialPanel();return;
  }
  if(e.code==='KeyI'&&!e.repeat){
    if(inventoryOpen||lootOpen)closeLootOverlay();
    else beginLootOverlay();
    return;
  }
  if(powerUIOpen||workbenchOpen||inventoryOpen||lootOpen||specialOpen||
    questPanelOpen||dialogueOpen)return;
  if(e.code==='KeyV'&&!e.repeat&&controls.isLocked){
    thirdPersonEnabled=!thirdPersonEnabled;
    showShotNotice(thirdPersonEnabled?'THIRD-PERSON CHARACTER VIEW · V TO RETURN':
      'FIRST-PERSON VIEW · V TO TOGGLE');
    return;
  }
  if(e.code==='KeyU'&&!e.repeat&&controls.isLocked){beginWorkbench();return;}
  if(e.code==='KeyE'&&!e.repeat&&controls.isLocked){
    e.preventDefault();
    // The power-frame hold also recognizes a short contextual tap on keyup.
    // This lets suited players loot nearby bodies/crates without exiting.
    const contact=nearCampaignNode();
    if(contact){openCampaignDialogue(contact);return;}
    if(powerArmorState.phase==='idle'&&
       (powerArmorState.occupied||nearPoweredSuit())){
      beginPowerHold();return;
    }
    const bag=nearestLootBag();
    if(bag)beginLootOverlay(bag.id);
    else if(benchWithinReach())beginWorkbench();
    else showShotNotice('NO INTERACTION WITHIN REACH');
    return;
  }
  if(e.code==='BracketLeft'||e.code==='BracketRight'){
    e.preventDefault();if(!e.repeat)adjustEndurance(e.code==='BracketRight'?1:-1);return;
  }
  if(e.code==='KeyZ'&&!e.repeat&&controls.isLocked){cycleWeapon(-1);return;}
  if(e.code==='KeyX'&&!e.repeat&&controls.isLocked){cycleWeapon(1);return;}
  if(e.code==='KeyN'&&!e.repeat){
    toggleSound();return;
  }
  if(e.code==='KeyM'&&!e.repeat&&controls.isLocked){
    toggleInfiniteAmmo();return;
  }
  if(e.code==='KeyC'&&!e.repeat&&controls.isLocked){toggleCrouch(player);return;}
  if(e.code==='Space'&&e.repeat){e.preventDefault();return;}
  if(e.code.startsWith('Digit')&&Number(e.code.slice(5))>=1&&Number(e.code.slice(5))<=9){
    resetPlayer(Number(e.code.slice(5))-1);return;
  }
  if(e.code==='KeyR'&&!e.repeat&&controls.isLocked){reload();return;}
  if(e.code==='KeyF'&&!e.repeat&&controls.isLocked){resupply();return;}
  if(e.code==='KeyY'&&!e.repeat&&controls.isLocked){resetAllDummies();return;}
  if(e.code==='KeyB'&&!e.repeat&&controls.isLocked){openArmory();return;}
  if(e.code==='KeyJ'&&!e.repeat&&controls.isLocked){resetEnemies();return;}
  if(e.code==='KeyH'&&!e.repeat&&controls.isLocked){healPlayer();return;}
  if(e.code==='KeyK'&&!e.repeat&&controls.isLocked){
    enemyAIEnabled=!enemyAIEnabled;
    showShotNotice(enemyAIEnabled?'ENEMY AI RESUMED':'ENEMY AI FROZEN');
    return;
  }
  if(e.code==='KeyT'&&!e.repeat){
    clearBulletHoles();
    clearCasings();
    resetPlayer(stationIndex);return;
  }
  if(e.code==='Space'){e.preventDefault();
    if(controls.isLocked&&powerArmorMobility(powerArmorState).canJump)requestJump(player);
    else if(controls.isLocked&&powerArmorState.occupied)showShotNotice('NO CORE · HYDRAULICS CANNOT JUMP');}
  keys.add(e.code);
});
window.addEventListener('keyup',e=>{
  if(e.code==='KeyE'&&finishPowerHold()){e.preventDefault();return;}
  keys.delete(e.code);
});
window.addEventListener('blur',cancelPowerHold);
window.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('mousedown',e=>{
  if(!controls.isLocked)return;
  if(e.button===0&&powerArmorState.phase==='idle'){
    if(WEAPON_REBUILD_MODE&&!playerGunEnabled())showShotNotice('UNARMED · NO GUN EQUIPPED');
    else {triggerHeld=true;shoot();}
  }
  if(e.button===2&&(!WEAPON_REBUILD_MODE||playerGunEnabled()))changeAim(true);
});
window.addEventListener('mouseup',e=>{
  if(e.button===0){triggerHeld=false;emptyClickLatched=false;}
  if(e.button===2)changeAim(false);
});
window.addEventListener('mousemove',e=>{
  if(controls.isLocked){
    mouseSway=Math.max(-.08,Math.min(.08,mouseSway+e.movementX*.00025));
    // Player mouse compensation must cancel recoil debt rather than allowing
    // recovery to pull the sights below their deliberately corrected aim.
    countersteerWeaponRecoil(viewRecoil,e.movementX,e.movementY);
  }
});
window.addEventListener('blur',()=>{
  keys.clear();triggerHeld=false;emptyClickLatched=false;changeAim(false);
});
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  thirdPersonCamera.aspect=innerWidth/innerHeight;
  thirdPersonCamera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
function updateHUD(info){
  const staminaPct=Math.max(0,Math.round(info.staminaFraction*100));
  $('fieldStamina').textContent=staminaPct+'%';
  $('fieldStaminaFill').style.width=staminaPct+'%';
  // The normal field HUD is hidden inside power armor, so mirror the same
  // live stamina value in the visor. Fusion-core charge is a separate resource.
  const visorSprintAvailable=powerArmorMobility(powerArmorState).canSprint;
  $('visorStamina').textContent=staminaPct+'%';
  $('visorStaminaFill').style.width=staminaPct+'%';
  $('visorStaminaTrack').setAttribute('aria-valuenow',String(staminaPct));
  $('visorStaminaTrack').classList.toggle('empty',info.exhausted);
  $('visorStaminaTrack').classList.toggle('unavailable',!visorSprintAvailable);
  setVisorDial('ap',staminaPct);
  $('visorApDial').classList.toggle('exhausted',info.exhausted);
  $('visorApDial').classList.toggle('core-offline',!visorSprintAvailable);
  $('visorStaminaState').textContent=!visorSprintAvailable?'CORE OFFLINE':
    info.exhausted?'EXHAUSTED':info.sprinting?'DRAINING':
    info.recovering?'RECOVERING':'READY';
  $('fieldLocation').textContent=stations[stationIndex].title.toUpperCase();
  const bearing=(((-camera.rotation.y*180/Math.PI)%360)+360)%360;
  const cardinal=['N','NE','E','SE','S','SW','W','NW'][
    Math.round(bearing/45)%8];
  $('fieldHeading').textContent=cardinal+' · '+Math.round(bearing).toString().padStart(3,'0')+'°';
  updateVisorCompass(bearing);
  updateVisorObjectiveMarker(bearing);
  const threat=inAIArena();
  $('fieldThreat').textContent=threat?(WEAPON_REBUILD_MODE?'NPC MOVEMENT TEST':'LIVE FIRE'):'EXPLORATION';
  $('fieldThreat').classList.toggle('danger',threat);
  $('speed').textContent=info.speed.toFixed(1)+' m/s';
  $('state').textContent=info.airborne?'JUMP':info.crouched?'CROUCH':info.moving?(info.sprinting?'SPRINT':'WALK'):'IDLE';
  $('height').textContent=(info.ground+player.jump).toFixed(1)+' m';
  $('staminaFill').style.width=(info.staminaFraction*100).toFixed(1)+'%';
  $('staminaNumber').textContent=Math.round(info.staminaFraction*100)+'%';
  $('staminaState').textContent=info.exhausted?'EXHAUSTED':info.sprinting?'DRAINING':info.recovering?'RECOVERING':'READY';
  $('staminaFill').classList.toggle('empty',info.exhausted);
}
let questNavigationClock=0;
function frame(){
  requestAnimationFrame(frame);
  const elapsed=clock.getDelta();
  const dt=Math.min(.036,elapsed);
  wastelandArt.update(dt);
  impactEffects.update(dt);
  laserTrails.update(dt); // the red beam holds briefly, then dissolves over .66s
  let ammoSpentOnReload=false;
  for(const spec of ARSENAL){
    const state=arsenalStates[spec.id],before=state.reserve;
    updateWeapon(state,dt,spec,{reloadSpeedMultiplier:specialModifiers.reloadSpeedMultiplier});
    if(state.reserve!==before)ammoSpentOnReload=true;
  }
  if(ammoSpentOnReload)saveBackpack();
  const chargeUpdate=updateLaserCrank(arsenalStates[LASER_MUSKET.id],dt);
  if(chargeUpdate.completed&&activeWeaponId===LASER_MUSKET.id)
    showShotNotice('CHARGE STORED · '+chargeUpdate.charge+'/6 · R AGAIN OR FIRE');
  if(window.__rpgSmokeReloadHold?.id===activeWeaponId)
    weaponState.reloadRemaining=window.__rpgSmokeReloadHold.remaining;
  // Weapon-specific impulse hold, camera recovery and viewmodel spring.
  // The gun's muzzle rises; fired bullets already left before this response.
  const recoilStep=stepWeaponRecoil(viewRecoil,camera.rotation.x,camera.rotation.y,
    elapsed,activeSpec);
  camera.rotation.x=recoilStep.pitch;camera.rotation.y=recoilStep.yaw;
  recoilKick=viewRecoil.modelPitch;
  mouseSway*=Math.exp(-9*dt);
  muzzleFlash=Math.max(0,muzzleFlash-dt);
  slideCycle=Math.max(0,slideCycle-dt);
  const visual=weaponVisuals.get(activeWeaponId);
  visual.muzzleGlow.intensity=muzzleFlash>0?5.5:0;
  visual.muzzleFlare.visible=muzzleFlash>0;
  if(visual.muzzleFlare.visible){
    const q=muzzleFlash/.085;
    visual.muzzleFlare.scale.setScalar((.65+q*.8)*visual.flashScale);
    visual.muzzleFlare.material.opacity=q;
  }
  const handling=reloadPoseForWeapon(activeWeaponId,
    weaponState.reloadRemaining,weaponState.reloadDuration||activeSpec.reloadSeconds,
    weaponState.reloadRounds||null);
  const cycleDuration=activeWeaponId===LASER_MUSKET.id||activeWeaponId===DOUBLE_BARREL_SHOTGUN.id?0:
    activeWeaponId===PUMP_ACTION_SHOTGUN.id?PUMP_ACTION_TUNING.cycleSeconds:
    activeWeaponId===HEAVY_SNIPER.id?HEAVY_SNIPER_TUNING.cycleSeconds:
    activeWeaponId===BOLT_HUNTING_RIFLE.id?HUNTING_RIFLE_TUNING.cycleSeconds:
    activeWeaponId===IRON_REVOLVER.id?.26:
    activeWeaponId===PIPE_SMG.id?.095:
    activeWeaponId===PIPE_RIFLE.id?.23:
    activeSpec.kind==='shotgun'?.48:
    activeSpec.kind==='rifle'?.52:.13;
  const cycling=slideTravel(slideCycle,cycleDuration);
  visual.slideGroup.position.z=cycling+handling.slideOffset+
    (activeWeaponId===NEW_WEAPON_ID&&weaponState.magazine===0&&
      weaponState.reloadRemaining<=0?.095:0);
  if(visual.trigger)visual.trigger.rotation.x=-.24-recoilKick*.7;
  if(visual.crankPivot){
    const activeCrank=weaponState.crankRemaining>0;
    visual.crankPivot.rotation.x=activeCrank?-Math.PI*2*laserCrankProgress(weaponState):0;
    visual.chargeHand.visible=activeCrank;
    visual.capacitor.material.emissiveIntensity=.18+
      (weaponState.laserCharge||0)*.27+(activeCrank?.7:0);
  }
  if(activeWeaponId===PIPE_SMG.id){
    // Detachable 30-round stick slides out of its real side-mounted dock.
    const travel=handling.magazineOffset;
    visual.magazine.position.set(visual.magBaseX-travel*.72,
      visual.magBaseY-travel*.40,visual.magBaseZ);
    visual.magazine.rotation.z=handling.magazineAngle;
    visual.magazineBase.visible=false;
  }else if(activeWeaponId===PIPE_PISTOL.id){
    // Side-fed pipe magazine pulls OUTWARD from receiver, never through grip.
    visual.magazine.position.x=visual.magBaseX-handling.magazineOffset;
    visual.magazineBase.position.x=visual.magFootX-handling.magazineOffset;
    visual.magazine.position.y=visual.magBaseY;
    visual.magazineBase.position.y=visual.magFootY;
    visual.magazine.rotation.z=-.11+handling.magazineAngle;
    visual.magazineBase.rotation.z=handling.magazineAngle;
  }else{
    visual.magazine.position.y=visual.magBaseY-handling.magazineOffset;
    visual.magazineBase.position.y=visual.magFootY-handling.magazineOffset;
    visual.magazine.rotation.z=handling.magazineAngle;
    visual.magazineBase.rotation.z=handling.magazineAngle;
  }
  const detachable=[...REBUILT_WEAPON_IDS,'scrap-pistol','pipe-smg','service-carbine']
    .includes(activeWeaponId)&&
    ![DOUBLE_BARREL_SHOTGUN.id,PUMP_ACTION_SHOTGUN.id,BOLT_HUNTING_RIFLE.id,IRON_REVOLVER.id].includes(activeWeaponId);
  visual.magazine.visible=detachable&&handling.magazineVisible;
  visual.magazineBase.visible=detachable&&handling.magazineVisible;
  visual.reloadHand.visible=handling.handVisible;
  if(visual.supportHand){
    visual.supportHand.visible=!handling.handVisible&&!(weaponState.crankRemaining>0);
    visual.supportHand.rotation.z=Math.sin(handlingTime*2.1)*.009;
  }
  visual.reloadHand.position.set(handling.handX,handling.handY,handling.handZ);
  if(visual.hingeGroup){
    visual.hingeGroup.rotation.x=-handling.breakAngle;
    visual.ejector.position.z=handling.ejector;
    for(let i=0;i<visual.shellDisplays.length;i++)
      visual.shellDisplays[i].visible=handling.active&&handling.breakAngle>.18&&
        i>=2-weaponState.magazine;
    if(activeWeaponId===DOUBLE_BARREL_SHOTGUN.id&&
       shotgunPendingEjections>0&&handling.progress>.31){
      ejectDoubleBarrelHulls(shotgunPendingEjections);
      shotgunPendingEjections=0;
    }
  }
  if(visual.pumpGroup){
    const pump=pumpCyclePose(slideCycle);
    visual.pumpGroup.position.z=pump.forendOffset;
    visual.boltGroup.position.z=pump.boltOffset;
    if(pumpPendingEjection&&(pump.ejectNow||slideCycle===0)){
      ejectPumpActionHull();
      pumpPendingEjection=false;
    }
  }
  if(visual.boltAssembly){
    const heavy=activeWeaponId===HEAVY_SNIPER.id;
    const cycle=heavy?heavySniperBoltCyclePose(slideCycle):huntingBoltCyclePose(slideCycle);
    const lift=handling.active?handling.boltHandleLift:cycle.handleLift;
    const offset=handling.active?handling.boltOffset:cycle.boltOffset;
    visual.boltAssembly.rotation.z=lift;
    visual.boltAssembly.position.z=(visual.boltBaseZ??-.135)+offset;
    visual.boltCycleHand.visible=!handling.active&&cycle.active&&
      cycle.progress>.08&&cycle.progress<.94;
    visual.gripHand.visible=!visual.boltCycleHand.visible&&!handling.active;
    if(heavy&&heavySniperPendingEjection&&(cycle.ejectNow||slideCycle===0)){
      ejectHeavySniperCasing();
      heavySniperPendingEjection=false;
    }
    if(!heavy&&huntingPendingEjection&&(cycle.ejectNow||slideCycle===0)){
      ejectHuntingRifleCasing();
      huntingPendingEjection=false;
    }
  }
  if(visual.pumpGrip)
    visual.pumpGrip.position.z=-.34+cycling*1.5+handling.pumpOffset;
  if(visual.cylinderYoke){
    // Cylinder is attached to the yoke. During the swing-out the actual
    // chambers, loaded cartridge heads and ejector star travel together.
    const opening=handling.active?handling.cylinderOpen:0;
    visual.cylinderYoke.rotation.y=opening*1.12;
    visual.cylinderYoke.position.x=-.12-.15*opening;
    const shotPhase=Math.min(1,Math.max(0,1-slideCycle/.26));
    const spinEase=shotPhase*shotPhase*(3-2*shotPhase);
    const chamber=(visual.chamberIndex||0);
    const previous=visual.previousChamberIndex??chamber;
    visual.cylinderSpinGroup.rotation.z=
      (slideCycle>0?previous+spinEase*(chamber-previous):chamber)*Math.PI/3+
      (handling.active?handling.cylinderSpin:0);
    if(visual.hammerPivot)
      visual.hammerPivot.rotation.x=handling.active?-.18:
        slideCycle>0?-.85*Math.sin(Math.PI*shotPhase):0;
    if(visual.ejectorGroup)
      visual.ejectorGroup.position.z=handling.ejector||0;
    if(visual.gripHand)visual.gripHand.visible=!handling.active;
    if(activeWeaponId===IRON_REVOLVER.id&&handling.active&&
       revolverPendingEjections>0&&handling.progress>.32){
      ejectRevolverCasings(revolverPendingEjections);
      revolverPendingEjections=0;
    }
  }
  if(visual.boltHandle){
    visual.boltHandle.position.z=-.035+handling.boltOffset+cycling*.85;
    visual.boltHandle.rotation.z=handling.boltHandleLift*.65+cycling*.9;
  }
  if(visual.reloadAction){
    const action=visual.reloadAction;
    action.visible=handling.roundVisible;
    if(activeWeaponId===DOUBLE_BARREL_SHOTGUN.id){
      // Approach the open breech from behind and meet the actual chamber.
      // The insertion axis rotates with the hinge, not a free-floating tube.
      const a=handling.breakAngle;
      const chamberY=-.065+.138*Math.cos(a)+.034*Math.sin(a);
      const chamberZ=-.427-.138*Math.sin(a)+.034*Math.cos(a);
      const travel=1-handling.shellProgress;
      action.position.set(handling.roundIndex===0?-.079:.079,
        chamberY-.12*travel,chamberZ+.18*travel);
      action.rotation.x=-a;
    }else if(activeWeaponId===PUMP_ACTION_SHOTGUN.id){
      const travel=handling.shellProgress;
      action.position.set(.038,-.323+.123*travel,.065-.202*travel);
      action.rotation.x=-.10;
    }else if(activeWeaponId===BOLT_HUNTING_RIFLE.id){
      const travel=handling.shellProgress;
      action.position.set(.037,.449-.208*travel,.065-.220*travel);
      action.rotation.x=-.14;
    }else if(activeWeaponId===IRON_REVOLVER.id){
      // Transform the chosen rear cylinder chamber into the gun's coordinates,
      // then bring a single live cartridge in from the loading hand.
      const angle=(handling.roundIndex>=0?handling.roundIndex:0)*Math.PI/3;
      const port=new THREE.Vector3(.071*Math.cos(angle),
        .071*Math.sin(angle),.156);
      visual.cylinderSpinGroup.localToWorld(port);
      visual.root.worldToLocal(port);
      const travel=1-handling.shellProgress;
      action.position.set(port.x-.105*travel,
        port.y+.075*travel,port.z+.160*travel);
      action.rotation.x=0;
    }else if(activeWeaponId==='scrap-shotgun'){
      action.position.set(.065,-.09-.11*handling.shellProgress,
        .04-.16*handling.shellProgress);
    }else if(activeWeaponId==='hunting-rifle'){
      action.position.set(.075,.19-.12*handling.shellProgress,
        -.07-.10*handling.shellProgress);
    }
  }
  // Distinct idle/ADS movement sway, with substantially steadier sights in ADS.
  handlingTime+=dt;
  const moving=Math.min(1,(weaponMotion.speed||0)/4.5);
  const steadiness=weaponState.aiming?.22:1;
  const swayX=Math.sin(handlingTime*(2.1+moving*6))*(.0035+moving*.011)*steadiness;
  const swayY=Math.cos(handlingTime*(2.7+moving*5))*(.0025+moving*.008)*steadiness;
  if(weaponState.aiming&&!handling.active){
    // The actual optic is centered on the camera's -Z hitscan line.
    // Keep the reticle on the shot line; recoil raises the CAMERA and
    // draws the sight slightly toward the eye, without misaligning it.
    alignActiveSight();
    visual.root.position.z+=viewRecoil.modelBack*.46;
  }else{
    const desired=new THREE.Vector3(visual.defaultX,
      visual.defaultY??-.31,visual.defaultZ??-.77);
    desired.x+=swayX;desired.y+=swayY;
    desired.z+=viewRecoil.modelBack; // brisk backward recoil from the stock
    if(weaponMotion.sprinting)desired.y-=.10;
    if(handling.active){desired.x+=.045;desired.y-=.04;}
    visual.root.position.lerp(desired,1-Math.exp(-16*dt));
    visual.root.rotation.x=recoilKick+handling.tilt;
    visual.root.rotation.y=mouseSway*steadiness;
    visual.root.rotation.z=mouseSway*.28*steadiness;
  }
  const targetFOV=weaponState.aiming?
    sightForOptic(activeWeaponId,installedWeaponOptic(backpack,activeWeaponId)).fov:76;
  camera.fov+=(targetFOV-camera.fov)*(1-Math.exp(-16*dt));
  camera.updateProjectionMatrix();
  // Genuine magnified camera aim, with a fine mil reticle. A circular
  // opaque scope housing masks peripheral vision; hip fire stays unobscured.
  const throughSniperScope=controls.isLocked&&
    activeWeaponId===HEAVY_SNIPER.id&&weaponState.aiming&&
    powerArmorState.phase==='idle';
  $('sniperScope').classList.toggle('active',throughSniperScope);
  $('sniperScope').setAttribute('aria-hidden',String(!throughSniperScope));
  $('crosshair').classList.toggle('hidden',weaponState.aiming);
  const sightCheck=$('weaponSightCheck');
  sightCheck.style.display=weaponState.aiming&&!handling.active?'block':'none';
  sightProbeTime-=dt;
  if(sightCheck.style.display==='block'&&sightProbeTime<=0){
    inspectSightClearance();
    sightProbeTime=.20;
  }
  for(const {back} of targetData.values()){
    const flash=back.userData.flash||0;
    if(flash>0){
      back.userData.flash=Math.max(0,flash-dt);
      if(back.userData.flash===0)back.material.emissiveIntensity=0;
    }
  }
  if(shotNoticeTime>0){shotNoticeTime-=dt;if(shotNoticeTime<=0)$('shotNotice').classList.remove('visible');}
  updateCasings(dt);
  updateCombatVisuals(dt);
  if(controls.isLocked&&triggerHeld&&activeSpec.automatic&&powerArmorState.phase==='idle')
    shoot();
  refreshWeaponHUD();
  const readyModels=[...enemies.values()].filter(e=>e.modelStatus==='original').length;
  const modelLabel='ORIGINAL PIXEL NPCs · '+readyModels+'/3 READY · '+
    'SCOUT / RAIDER / ENFORCER · 6 ARMOR SLOTS';
  if($('riggedStatus').textContent!==modelLabel)$('riggedStatus').textContent=modelLabel;
  // Entrance / exit is a physical, timed chest-door and hydraulic animation.
  poweredArmorTime+=dt;
  const powerStep=stepPowerArmor(powerArmorState,dt);
  poweredSuit.animate(powerStep.phase,powerStep.progress,poweredArmorTime,
    powerCinematic?.origin);
  // Cosmetic inventory visuals are driven by the same six real armor slots
  // in third-person play and while entering/exiting powered armor.
  playerAvatar.setArmor(backpack.equipment.armor);
  pilotAvatar.setArmor(backpack.equipment.armor);
  playerAvatar.setClothing(backpack.equipment.clothing);
  pilotAvatar.setClothing(backpack.equipment.clothing);
  const pilotChoreography=poweredSuit.pilot.userData.entryPose;
  if(pilotChoreography&&powerStep.phase!=='idle'){
    // Resolve ACTUAL moving handhold positions in the pilot's local space,
    // so an animated hand can grab a real rail instead of reaching toward
    // an approximate fixed angle. Sorting after inversion handles turning.
    poweredSuit.root.updateMatrixWorld(true);
    const grips=poweredSuit.serviceHandles.map(handle=>
      poweredSuit.pilot.worldToLocal(handle.localToWorld(
        new THREE.Vector3(0,-.05,-.84))));
    grips.sort((a,b)=>a.x-b.x);
    pilotChoreography.handTargets=grips.map(point=>point.toArray());
  }
  // The frame is scaled down while the human pilot remains life-sized.
  // Convert tread contacts into the pilot's world-sized IK coordinate frame.
  const boardingIK=pilotChoreography?{
    ...pilotChoreography,
    y:pilotChoreography.y*POWER_ARMOR_VISUAL_SCALE,
    z:pilotChoreography.z*POWER_ARMOR_VISUAL_SCALE,
    plantedHeight:pilotChoreography.plantedHeight*POWER_ARMOR_VISUAL_SCALE,
    footTargets:pilotChoreography.footTargets?.map(target=>target?{
      y:target.y*POWER_ARMOR_VISUAL_SCALE,
      z:target.z*POWER_ARMOR_VISUAL_SCALE}:null)
  }:null;
  pilotAvatar.update({dt,x:0,z:0,ground:0,yaw:0,
    speed:pilotChoreography?.walkSpeed||0,
    sprinting:false,crouched:false,aiming:false,alive:true,
    bracing:pilotChoreography?.brace>.25,
    boardingPose:powerStep.phase!=='idle'?boardingIK:null});
  poweredSuit.root.visible=powerArmorState.phase!=='idle'||!powerArmorState.occupied;
  poweredCockpit.visible=powerArmorState.occupied&&powerArmorState.phase==='idle';
  if(powerStep.phase!=='idle')updatePowerCinematic(powerStep.progress);
  // Heavy servo gait is visible in the pilot's visor: steps have a strong
  // vertical impact and subtle counter-roll, unlike an unpowered walk.
  const poweredGait=powerArmorState.occupied?Math.min(1,weaponMotion.speed/5):0;
  const poweredStepPhase=poweredArmorTime*(weaponMotion.sprinting?9.2:6.3);
  poweredCockpit.position.y=poweredGait*
    (-.010*Math.abs(Math.sin(poweredStepPhase))+.006*Math.cos(poweredStepPhase*2));
  poweredCockpit.rotation.z=poweredGait*Math.sin(poweredStepPhase)*.006;
  poweredCockpit.rotation.x=poweredGait*Math.cos(poweredStepPhase)*.003;
  if(powerStep.completed){
    if(powerCinematic){
      player.x=powerCinematic.to.x;player.z=powerCinematic.to.z;
      player.jump=0;player.vertical=0;resetMotion(player);
      camera.position.copy(powerCinematic.to);
      camera.quaternion.copy(powerCinematic.toRotation);
      powerCinematic=null;
      powerCinematicFadeLeft=.34;
      $('powerTransitionFade').style.opacity='1';
    }
    if(!WEAPON_REBUILD_MODE||playerGunEnabled())weaponVisuals.get(activeWeaponId).root.visible=true;
    savePowerArmor();refreshPowerArmorHUD();refreshInventoryUI();
    showShotNotice(powerArmorState.occupied?'POWER ARMOR LOCKED · READY':
      'POWER ARMOR PARKED · STEP CLEAR');
  }
  if(powerCinematicFadeLeft>0&&powerStep.phase==='idle'){
    powerCinematicFadeLeft=Math.max(0,powerCinematicFadeLeft-elapsed);
    $('powerTransitionFade').style.opacity=String(Math.min(
      1,powerCinematicFadeLeft/.27));
  }
  if(controls.isLocked&&powerArmorState.phase==='idle'){
    controls.getDirection(forward);
    const mobility=powerArmorMobility(powerArmorState);
    const info=stepMovement(player,keys,{x:forward.x,z:forward.z},dt,
      {boxes:bounds,trees:[],ceilings,groundHeight,
        speedMultiplier:mobility.factor*specialModifiers.speedMultiplier,
        staminaDrainMultiplier:specialModifiers.staminaDrainMultiplier,
        allowSprint:mobility.canSprint,
        bodyHeight:powerArmorState.occupied?POWER_ARMOR_STAND_HEIGHT:undefined,
        crouchHeight:powerArmorState.occupied?POWER_ARMOR_CROUCH_HEIGHT:undefined});
    weaponMotion={speed:info.speed,sprinting:info.sprinting,airborne:info.airborne,crouched:info.crouched};
    if(info.speed>.55&&!info.airborne){
      groundedStepProgress+=info.speed*dt;
      const strideLength=footstepStrideMeters({sprinting:info.sprinting,
        crouched:info.crouched,powerArmor:powerArmorState.occupied});
      if(groundedStepProgress>=strideLength){
        groundedStepProgress%=strideLength;
        sound.footstep(powerArmorState.occupied);
      }
    }else groundedStepProgress=Math.min(.20,groundedStepProgress);
    const core=stepFusionCore(powerArmorState,dt,
      {moving:info.speed>.2,sprinting:info.sprinting});
    if(core.drained>0&&poweredArmorTime-lastFusionSave>3){
      lastFusionSave=poweredArmorTime;savePowerArmor();
    }
    if(core.drained>0&&core.depleted){
      poweredSuit.updateCore(powerArmorState);
      savePowerArmor();
      showShotNotice('FUSION CORE DEPLETED · LIMP MODE · SWAP AT FRAME');
    }
    const eye=powerArmorEyeHeight(powerArmorState,info.eyeHeight);
    camera.position.set(player.x,info.ground+eye+info.cameraBob+player.jump,player.z);
    updateHUD(info);
  }
  updateEnemies(dt,elapsed);
  // Quest residents use the same articulated rig as the player, but never
  // enter the hostile hit list. They watch approaching visitors naturally.
  for(const resident of campaignResidents){
    const dx=player.x-resident.x,dz=player.z-resident.z;
    const distance=Math.hypot(dx,dz);
    if(distance<7){
      const target=Math.atan2(-dx,-dz);
      const difference=Math.atan2(Math.sin(target-resident.yaw),Math.cos(target-resident.yaw));
      resident.yaw+=Math.max(-dt*1.4,Math.min(dt*1.4,difference));
    }
    resident.avatar.update({dt,x:resident.x,z:resident.z,
      ground:groundHeight(resident.x,resident.z),yaw:resident.yaw,speed:0});
  }
  questNavigationClock+=dt;
  if(questNavigationClock>.42){
    questNavigationClock=0;
    const trackedId=campaignState.tracked;
    const quest=CAMPAIGN_QUESTS[trackedId];
    const stage=quest?.stages[campaignState.quests[trackedId]?.stage];
    if(stage){
      const point=stage.node==='arena'?{x:45,z:40}:
        CAMPAIGN_NODES.find(node=>node.id===stage.node);
      const meters=point?Math.round(Math.hypot(player.x-point.x,player.z-point.z)):null;
      $('questTrackerObjective').textContent=stage.text+
        (meters!==null?' · '+meters+' m':'');
    }
  }
  refreshPowerArmorHUD();
  // Loot prompt follows world-space proximity; it does not require
  // the target enemy body to stay rendered after defeat.
  const nearby=nearestLootBag();
  const questContact=nearCampaignNode();
  const frameInReach=powerArmorState.phase==='idle'&&
    (powerArmorState.occupied||nearPoweredSuit());
  const promptAvailable=frameInReach||!!questContact||!!nearby;
  $('lootPrompt').classList.toggle('hidden',
    !controls.isLocked||inventoryOpen||lootOpen||workbenchOpen||powerUIOpen||
    questPanelOpen||dialogueOpen||!promptAvailable);
  if(questContact){
    $('lootPrompt').textContent='E · '+
      (['dispatch','dominion','foreman'].includes(questContact.id)?'SPEAK WITH ':'USE ')+
      questContact.name+' · Q JOURNAL';
  }else if(frameInReach){
    $('lootPrompt').textContent=nearby?
      'TAP E · SEARCH '+nearby.source.toUpperCase()+'     HOLD E · '+
        (powerArmorState.occupied?'EXIT POWER ARMOR':'ENTER POWER ARMOR'):
      powerArmorState.occupied?
        'HOLD E · EXIT POWER ARMOR':
        nearRearHatch()?'TAP E · CONFIGURE FRAME     HOLD E · ENTER FROM REAR':
          'TAP E · CONFIGURE FRAME     MOVE BEHIND FRAME TO ENTER';
    if(powerHoldPending){
      const pct=Math.min(99,Math.floor(
        (performance.now()-powerHoldStartedAt)/POWER_HOLD_MS*100));
      $('lootPrompt').textContent='HOLD E · '+pct+'% TO '+
        (powerArmorState.occupied?'EXIT':'ENTER');
    }
  }else if(nearby)$('lootPrompt').textContent='E · SEARCH '+
    nearby.source.toUpperCase()+' · '+nearby.items.length+' ITEM TYPES';
  // Cosmetic player body and the inspection camera are separate from the FPS
  // movement, hitboxes, weapon ADS and authoritative hitscan camera.
  const playerGround=groundHeight(player.x,player.z);
  playerAvatar.setHeldWeapon(WEAPON_REBUILD_MODE?null:activeWeaponId);
  heldTenMM.root.visible=activeWeaponId===TEN_MM_PISTOL.id;
  heldPipePistol.root.visible=activeWeaponId===PIPE_PISTOL.id;
  heldPipeRifle.root.visible=activeWeaponId===PIPE_RIFLE.id;
  heldLaserMusket.root.visible=activeWeaponId===LASER_MUSKET.id;
  heldDoubleBarrel.root.visible=activeWeaponId===DOUBLE_BARREL_SHOTGUN.id;
  heldPumpShotgun.root.visible=activeWeaponId===PUMP_ACTION_SHOTGUN.id;
  heldHuntingRifle.root.visible=activeWeaponId===BOLT_HUNTING_RIFLE.id;
  heldWornRevolver.root.visible=activeWeaponId===IRON_REVOLVER.id;
  heldPipeSMG.root.visible=activeWeaponId===PIPE_SMG.id;
  heldHeavySniper.root.visible=activeWeaponId===HEAVY_SNIPER.id;
  heldPipeSMG.slideGroup.position.z=heldPipeSMG.root.visible?
    slideTravel(slideCycle,.095)+handling.slideOffset:0;
  if(heldPipeSMG.root.visible){
    const travel=handling.magazineOffset;
    heldPipeSMG.magazine.position.set(-.182-travel*.72,.060-travel*.40,-.153);
    heldPipeSMG.magazine.rotation.z=handling.magazineAngle;
  }
  if(heldWornRevolver.root.visible){
    const open=handling.active?handling.cylinderOpen:0;
    heldWornRevolver.cylinderYoke.rotation.y=open*1.12;
    heldWornRevolver.cylinderYoke.position.x=-.12-.15*open;
    const shotPhase=Math.min(1,Math.max(0,1-slideCycle/.26));
    const ease=shotPhase*shotPhase*(3-2*shotPhase);
    const chamber=weaponVisuals.get(IRON_REVOLVER.id).chamberIndex||0;
    const previous=weaponVisuals.get(IRON_REVOLVER.id).previousChamberIndex??chamber;
    heldWornRevolver.cylinderSpinGroup.rotation.z=
      (slideCycle>0?previous+ease*(chamber-previous):chamber)*Math.PI/3+
      (handling.active?handling.cylinderSpin:0);
    heldWornRevolver.hammerPivot.rotation.x=handling.active?-.18:
      slideCycle>0?-.85*Math.sin(Math.PI*shotPhase):0;
    heldWornRevolver.ejectorGroup.position.z=handling.ejector||0;
    heldWornRevolver.reloadAction.visible=handling.roundVisible;
    if(heldWornRevolver.reloadAction.visible){
      const index=Math.max(0,handling.roundIndex),theta=index*Math.PI/3;
      const port=new THREE.Vector3(.071*Math.cos(theta),
        .071*Math.sin(theta),.156);
      heldWornRevolver.cylinderSpinGroup.localToWorld(port);
      heldWornRevolver.root.worldToLocal(port);
      const travel=1-handling.shellProgress;
      heldWornRevolver.reloadAction.position.set(port.x-.105*travel,
        port.y+.075*travel,port.z+.160*travel);
    }
  }else heldWornRevolver.reloadAction.visible=false;
  if(heldHeavySniper.root.visible){
    heldHeavySniper.magazine.position.y=heldHeavySniper.magBaseY-handling.magazineOffset;
    heldHeavySniper.magazine.rotation.z=handling.magazineAngle;
    heldHeavySniper.magazineBase.position.y=heldHeavySniper.magFootY-handling.magazineOffset;
    const cycle=heavySniperBoltCyclePose(handling.active?0:slideCycle);
    heldHeavySniper.boltAssembly.rotation.z=
      handling.active?handling.boltHandleLift:cycle.handleLift;
    heldHeavySniper.boltAssembly.position.z=heldHeavySniper.boltBaseZ+
      (handling.active?handling.boltOffset:cycle.boltOffset);
  }
  const worldBolt=huntingBoltCyclePose(activeWeaponId===BOLT_HUNTING_RIFLE.id?slideCycle:0);
  heldHuntingRifle.boltAssembly.rotation.z=activeWeaponId===BOLT_HUNTING_RIFLE.id&&handling.active?
    handling.boltHandleLift:worldBolt.handleLift;
  heldHuntingRifle.boltAssembly.position.z=-.135+
    (activeWeaponId===BOLT_HUNTING_RIFLE.id&&handling.active?handling.boltOffset:worldBolt.boltOffset);
  heldHuntingRifle.reloadAction.visible=activeWeaponId===BOLT_HUNTING_RIFLE.id&&handling.roundVisible;
  if(heldHuntingRifle.reloadAction.visible){
    const t=handling.shellProgress;
    heldHuntingRifle.reloadAction.position.set(.037,.449-.208*t,.065-.220*t);
    heldHuntingRifle.reloadAction.rotation.x=-.14;
  }
  const worldPump=pumpCyclePose(activeWeaponId===PUMP_ACTION_SHOTGUN.id?slideCycle:0);
  heldPumpShotgun.pumpGroup.position.z=worldPump.forendOffset;
  heldPumpShotgun.boltGroup.position.z=worldPump.boltOffset;
  heldPumpShotgun.reloadAction.visible=activeWeaponId===PUMP_ACTION_SHOTGUN.id&&
    handling.roundVisible;
  if(heldPumpShotgun.reloadAction.visible){
    const travel=handling.shellProgress;
    heldPumpShotgun.reloadAction.position.set(.038,
      -.323+.123*travel,.065-.202*travel);
    heldPumpShotgun.reloadAction.rotation.x=-.10;
  }
  heldDoubleBarrel.hingeGroup.rotation.x=activeWeaponId===DOUBLE_BARREL_SHOTGUN.id?
    -handling.breakAngle:0;
  for(let i=0;i<heldDoubleBarrel.shellDisplays.length;i++)
    heldDoubleBarrel.shellDisplays[i].visible=activeWeaponId===DOUBLE_BARREL_SHOTGUN.id&&
      handling.active&&handling.breakAngle>.18&&i>=2-weaponState.magazine;
  heldLaserMusket.crankPivot.rotation.x=activeWeaponId===LASER_MUSKET.id&&
    weaponState.crankRemaining>0?-Math.PI*2*laserCrankProgress(weaponState):0;
  heldLaserMusket.capacitor.material.emissiveIntensity=.18+
    (arsenalStates[LASER_MUSKET.id].laserCharge||0)*.27;
  const grips=heldWorldGrips.get(activeWeaponId);
  playerAvatar.setWeaponGripTargets(grips?.right,grips?.left);
  playerAvatar.update({dt,x:player.x,z:player.z,ground:playerGround,jump:player.jump,
    yaw:camera.rotation.y,pitch:camera.rotation.x,speed:weaponMotion.speed,
    sprinting:weaponMotion.sprinting,crouched:!!player.crouched,
    aiming:!!weaponState.aiming,alive:playerHealth.alive,
    airborne:Math.abs(player.jump)>.045||Math.abs(player.vertical)>.1,
    reloading:weaponState.reloadRemaining>0,
    reloadStyle:activeWeaponId,
    reloadProgress:weaponState.reloadRemaining>0?
      1-weaponState.reloadRemaining/(weaponState.reloadDuration||activeSpec.reloadSeconds):0,
    reloadRounds:weaponState.reloadRounds,
    recoil:Math.min(1,Math.max(muzzleFlash/.085,viewRecoil.modelPitch/.16)),
    hit:Math.min(1,playerHitFlash/.48)});
  // Remote bodies update independently of local V / ADS / camera mode.
  remotePreview.sync({...remotePreviewPose,armor:remotePreviewArmor},dt);
  thirdPersonActive=thirdPersonEnabled&&powerArmorState.phase==='idle'&&
    !powerArmorState.occupied&&!weaponState.aiming;
  playerAvatar.root.visible=thirdPersonActive;
  for(const [id,weapon] of weaponVisuals)
    weapon.root.visible=(!WEAPON_REBUILD_MODE||REBUILT_WEAPON_IDS.includes(id))&&
      id===activeWeaponId&&!thirdPersonActive&&powerArmorState.phase==='idle'&&
      !(id===HEAVY_SNIPER.id&&weaponState.aiming);
  if(thirdPersonActive){
    controls.getDirection(viewHeading);
    viewHeading.y=0;
    if(viewHeading.lengthSq()<.0001)viewHeading.set(0,0,-1);
    viewHeading.normalize();
    viewRight.set(-viewHeading.z,0,viewHeading.x);
    viewFocus.set(player.x,playerGround+player.jump+1.18-(player.crouched?0.23:0),player.z);
    viewDesired.copy(viewFocus).addScaledVector(viewHeading,-3.1)
      .addScaledVector(viewRight,.60);
    viewDesired.y+=.72;
    const offset=viewDesired.clone().sub(viewFocus);
    const distance=offset.length();
    thirdPersonRay.set(viewFocus,offset.normalize());thirdPersonRay.far=distance;
    const obstructed=thirdPersonRay.intersectObjects(worldGeometry,false)
      .find(hit=>hit.distance>.23);
    if(obstructed)viewDesired.copy(viewFocus).addScaledVector(offset,
      Math.max(.55,obstructed.distance-.20));
    thirdPersonCamera.position.copy(viewDesired);
    thirdPersonCamera.fov=camera.fov;thirdPersonCamera.updateProjectionMatrix();
    thirdPersonCamera.lookAt(viewFocus.clone().addScaledVector(viewHeading,.55));
    renderer.render(scene,thirdPersonCamera);
  }else renderer.render(scene,camera);
}
refreshCampaignUI();
frame();
