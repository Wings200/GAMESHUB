// BLACKOUT V4.0 source/game-logic regression tests.
// node --test games/blackout/tests/*.test.mjs
// Does not replace a deployed live-browser visual smoke test.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";
const base=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=name=>readFileSync(join(base,name),"utf8");

test("all original gameplay HUD/controller ids survive competitive UI replacement",()=>{
  const html=read("index.html"),js=read("main.js");
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size,"HTML must have unique ids");
  const refs=[...js.matchAll(/\$\("([a-zA-Z][\w-]*)"\)/g)].map(m=>m[1]);
  assert.deepEqual([...new Set(refs)].filter(id=>!ids.includes(id)),[]);
  for(const page of ["home","play","operators","loadout","settings"])
    assert.match(html,new RegExp('data-bo-screen="'+page+'"'));
  for(const id of ["boFindMatch","boLockOperator","start","operatorCards","sightSelect",
      "primaryWeaponSelect","secondaryWeaponSelect","droneOverlay","healthHud","ammoCount"])
    assert.ok(ids.includes(id),id+" must be rendered");
  assert.match(html,/OFFLINE AI/);
  assert.match(html,/NO ONLINE MATCHMAKING YET/);
});

function loadWeapons(){
  const source=read("src/weapons.js")
    .replace(/^import .*$/gm,"").replace(/^export /gm,"");
  const recoilFor=(slot,shotIndex,ads)=>({vertical:.013,horizontal:shotIndex*.002});
  return new Function("recoilFor",source+";return {Weapons,WEAPON_VARIANTS};")(recoilFor);
}
test("loadout variants change live damage, RPM, magazine size and reset consistently",()=>{
  const {Weapons,WEAPON_VARIANTS}=loadWeapons();
  const w=new Weapons();
  assert.equal(w.current.name,"CARBINE 556");
  assert.equal(w.current.ammo,31);
  assert.equal(w.setLoadout("primary","invalid"),false);
  assert.equal(w.setLoadout("primary","smg"),true);
  assert.equal(w.current.name,WEAPON_VARIANTS.primary.smg.name);
  assert.equal(w.current.ammo,33);
  let shot=w.tryFire(1000,false);
  assert.equal(shot.ok,true);
  assert.equal(shot.damage,23);
  assert.equal(w.current.rpm,885);
  assert.equal(w.current.ammo,32);
  w.reset();
  assert.equal(w.current.ammo,33,"reset preserves chosen SMG and 32+1 magazine");
  w.setLoadout("primary","dmr");
  assert.equal(w.current.ammo,21);
  shot=w.tryFire(2000,true);
  assert.equal(shot.damage,46);
  w.setLoadout("secondary","compact");
  w.equip("secondary");
  assert.equal(w.current.name,"C12 COMPACT");
  assert.equal(w.current.ammo,13);
  assert.equal(w.tryFire(3000,true).ok,true);
  w.reset();
  assert.equal(w.guns.secondary.ammo,13);
  assert.equal(w.loadout.primary,"dmr");
  assert.equal(w.loadout.secondary,"compact");
});

function makeControl(dataset={},classNames=[]){
  const classes=new Set(classNames),events={};
  const el={
    dataset,innerHTML:"",textContent:"",value:"",disabled:false,
    classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),
      contains:x=>classes.has(x),toggle:(x,value)=>{
        if(value===undefined)value=!classes.has(x);
        if(value)classes.add(x);else classes.delete(x);
        return value;
      }},
    addEventListener:(type,fn)=>(events[type]??=[]).push(fn),
    dispatch:(type)=>(events[type]||[]).forEach(fn=>fn({type})),
    click(){el.dispatch("click");},
    setAttribute(){},
    closest(q){return el.isNav&&q===".bo-nav-links"?{}:null}
  };
  return el;
}
test("offline matchmaking flow navigates home/play/operator/loadout and can cancel",()=>{
  const navs=["home","play","operators","loadout","settings"].map(page=>{
    const button=makeControl({boNav:page});button.isNav=true;return button;
  });
  const screens=["home","play","operators","loadout","settings"].map(page=>
    makeControl({boScreen:page}));
  const controls=new Map();
  for(const id of ["boQueue","boQueueStatus","boFindMatch","boCancelQueue","boReadyOperator",
    "boLockOperator","attackRole","defendRole","operatorCards","operatorSelect",
    "boPrimaryName","boSecondaryName","boSquadSelected","primaryWeaponSelect","secondaryWeaponSelect"]){
    controls.set("#"+id,makeControl());
  }
  controls.get("#boQueue").classList.add("hidden");
  controls.get("#attackRole").classList.add("active");
  const sight=makeControl();sight.value="holo-a";
  let scheduled=null;
  const window={addEventListener(){}};
  const src=read("src/competitive-ui.js").replace(/^export /gm,"");
  const create=new Function("window","setTimeout","clearTimeout","Event",
    src+";return initCompetitiveUI;")(window,fn=>(scheduled=fn,1),()=>scheduled=null,
      class Event{constructor(type){this.type=type;}});
  sight.dispatchEvent=e=>sight.dispatch(e.type);
  const menu={
    dataset:{},querySelector:s=>controls.get(s)||null,
    querySelectorAll:s=>s==="[data-bo-screen]"?screens:s==="[data-bo-nav]"?navs:
      s==="[data-bo-optic]"?[]:[]
  };
  const start=makeControl(),status=makeControl();
  const ui=create({menu,start,status,sightSelect:sight,getOperator:()=>({name:"SLEDGE"}),
    getRole:()=>"attacker",getGunName:slot=>slot==="primary"?"CARBINE 556":"P9 SIDEARM"});
  assert.equal(ui.page,"home");
  navs[1].click();
  assert.equal(ui.page,"play");
  controls.get("#boFindMatch").click();
  assert.equal(controls.get("#boQueue").classList.contains("hidden"),false);
  assert.equal(status.textContent,"CREATING LOCAL OFFLINE TRAINING SESSION");
  assert.equal(typeof scheduled,"function");
  controls.get("#boCancelQueue").click();
  assert.equal(controls.get("#boQueue").classList.contains("hidden"),true);
  assert.equal(ui.page,"play");
  controls.get("#boFindMatch").click();
  scheduled();
  assert.equal(ui.page,"operators");
  controls.get("#boLockOperator").click();
  assert.equal(ui.page,"loadout");
  assert.equal(controls.get("#boReadyOperator").textContent,"SLEDGE");
  assert.equal(controls.get("#boPrimaryName").textContent,"CARBINE 556");
});

test("round briefing, 3D optics, health and drone HUD remain connected",()=>{
  const main=read("main.js"),audio=read("src/audio.js"),
    shell=read("src/competitive-ui.js"),css=read("competitive-ui.css");
  assert.match(main,/playTacticalPhaseAnnouncement\(\{phase,role,roundNumber:round.roundNumber,audio\}\)/);
  assert.match(audio,/case "tactical-cue"/);
  assert.match(shell,/window\.SpeechSynthesisUtterance/);
  assert.match(main,/gunOptics\.selectSight\(value\)/);
  assert.match(main,/--bo-hp-angle/);
  assert.match(css,/--bo-hp-angle/);
  assert.match(main,/droneOverlay\.classList\.toggle/);
  assert.match(main,/weaponView\.setModelVariant/);
});
