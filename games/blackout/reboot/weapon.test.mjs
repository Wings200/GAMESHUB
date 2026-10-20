import test from "node:test";
import assert from "node:assert/strict";
import {WEAPON_SPEC,newWeaponState,stepWeapon} from "./weapon.js";

test("starts with a full carbine magazine and known reserve",()=>{
 const gun=newWeaponState();
 assert.equal(gun.ammo,30);assert.equal(gun.reserve,90);assert.equal(gun.reloading,0);
});
test("firing expends real ammo and obeys rate of fire",()=>{
 let gun=newWeaponState(),shots=0;
 for(let i=0;i<60;i++){
  const result=stepWeapon(gun,{fire:true},1/60);
  shots+=result.events.shots;gun=result.state;
 }
 assert.ok(shots>=9&&shots<=11);
 assert.equal(gun.ammo,30-shots);
 assert.equal(gun.shotsFired,shots);
 assert.ok(gun.recoil>=0);
});
test("reload has a timed lockout and returns only carried ammunition",()=>{
 let gun={...newWeaponState(),ammo:2,reserve:8};
 let r=stepWeapon(gun,{reload:true,fire:true},.016);
 assert.equal(r.events.shots,0);
 assert.equal(r.events.reloadStarted,true);
 gun=r.state;
 for(let i=0;i<50;i++){r=stepWeapon(gun,{fire:true},.04);gun=r.state; if(!gun.reloading)break;}
 assert.equal(gun.ammo,10);
 assert.equal(gun.reserve,0);
 assert.ok(r.events.reloadFinished);
});
test("cannot fire an empty magazine or begin a reload without reserve",()=>{
 const s={...newWeaponState(),ammo:0,reserve:0};
 let r=stepWeapon(s,{fire:true,reload:true},.05);
 assert.equal(r.events.shots,0);assert.equal(r.state.reloading,0);
});
test("aiming updates without changing ammunition and no fire without button",()=>{
 const s=newWeaponState();
 let r=stepWeapon(s,{ads:true},.05);
 assert.equal(r.state.aiming,true);
 assert.equal(r.state.ammo,s.ammo);
 assert.equal(r.events.shots,0);
});
