import test from "node:test";
import assert from "node:assert/strict";
import {SECONDARY_GADGETS,SECONDARY_SLOT_COUNT,gadgetById,secondaryOptions,
 newSecondaryPlans,plannedSecondaries,planSecondary,planIsFieldReady,
 SECONDARY_KEYBINDS,utilityHudRows,utilityKeyPreview}
 from "./secondary-loadout.js";
import {operatorById} from "./operators.js";

test("catalog has all requested six attacking and six defending gadgets",()=>{
 assert.equal(SECONDARY_SLOT_COUNT,2);
 assert.equal(SECONDARY_GADGETS.length,12);
 assert.equal(new Set(SECONDARY_GADGETS.map(g=>g.id)).size,12);
 assert.deepEqual(secondaryOptions("attack").map(g=>g.id),
  ["frag","flash","smoke","soft-breach","hard-breach","claymore"]);
 assert.deepEqual(secondaryOptions("defend").map(g=>g.id),
  ["c4","impact","observation-blocker","barbed-wire","proximity-alarm","deployable-shield"]);
 assert.equal(secondaryOptions("unknown").length,0);
 assert.equal(gadgetById("not-a-gadget"),null);
 assert.deepEqual(SECONDARY_GADGETS.filter(g=>g.implemented).map(g=>g.id),
  ["barbed-wire"],"only working physical gadget can be marked ready");
});
test("Striker and Sentry have independent two-slot plans; changes persist across team switches",()=>{
 const striker=operatorById("striker"),sentry=operatorById("sentry");
 let plans=newSecondaryPlans();
 assert.deepEqual(plannedSecondaries(plans,striker),[null,null]);
 plans=planSecondary(plans,striker,0,"flash");
 plans=planSecondary(plans,striker,1,"soft-breach");
 plans=planSecondary(plans,sentry,0,"barbed-wire");
 plans=planSecondary(plans,sentry,1,"c4");
 assert.deepEqual(plannedSecondaries(plans,striker),["flash","soft-breach"]);
 assert.deepEqual(plannedSecondaries(plans,sentry),["barbed-wire","c4"]);
 assert.equal(planIsFieldReady(plans,striker),false);
 assert.equal(planIsFieldReady(plans,sentry),false,"C4 is not implemented even though wire is");
 plans=planSecondary(plans,striker,1,null);
 assert.deepEqual(plannedSecondaries(plans,striker),["flash",null]);
 assert.deepEqual(plannedSecondaries(plans,sentry),["barbed-wire","c4"]);
});
test("two utility slots cannot duplicate items or steal opposite-side gadgets",()=>{
 const striker=operatorById("striker"),sentry=operatorById("sentry");
 let plans=newSecondaryPlans();
 plans=planSecondary(plans,striker,0,"flash");
 const saved=plans;
 for(const [op,slot,id] of [
  [striker,1,"flash"],[striker,1,"c4"],[striker,0,"barbed-wire"],
  [sentry,0,"frag"],[striker,2,"smoke"],[striker,-1,"smoke"],
  [striker,0,"invalid"],[striker,.5,"smoke"],[null,0,"flash"],
  [operatorById("volt"),0,"flash"]
 ])assert.equal(planSecondary(plans,op,slot,id),saved);
 assert.deepEqual(plannedSecondaries(plans,striker),["flash",null]);
 assert.deepEqual(plannedSecondaries(plans,operatorById("volt")),[]);
 assert.deepEqual(plannedSecondaries(plans,null),[]);
});
test("no new equipment, stocks, or combat actions are unlocked in the planning stage",()=>{
 const striker=operatorById("striker");
 let plans=newSecondaryPlans();
 assert.equal(planIsFieldReady(plans,striker),false);
 for(const g of secondaryOptions("attack")){
  const updated=planSecondary(plans,striker,0,g.id);
  assert.equal(planIsFieldReady(updated,striker),false);
  assert.equal(g.implemented,false);
 }
});

test("special middle-click and normal G reflect Striker plans without fake functionality",()=>{
 const striker=operatorById("striker");
 let plans=newSecondaryPlans();
 assert.deepEqual(SECONDARY_KEYBINDS,["MouseMiddle","KeyG"]);
 assert.deepEqual(utilityHudRows(plans,striker).map(s=>s.name),["EMPTY SLOT","EMPTY SLOT"]);
 assert.equal(utilityKeyPreview(plans,striker,"MouseMiddle"),
  "SPECIAL GADGET (MMB) · EMPTY SLOT · CHOOSE IN OPERATOR MENU");
 plans=planSecondary(plans,striker,0,"flash");
 plans=planSecondary(plans,striker,1,"soft-breach");
 const rows=utilityHudRows(plans,striker);
 assert.deepEqual(rows.map(s=>s.key),["MMB","G"]);
 assert.deepEqual(rows.map(s=>s.role),["SPECIAL","NORMAL"]);
 assert.deepEqual(rows.map(s=>s.name),["Flashbangs","Soft Breach Charge"]);
 assert.ok(rows.every(s=>s.fieldReady===false&&s.status.includes("NOT BUILT")));
 assert.equal(utilityKeyPreview(plans,striker,"MouseMiddle"),"FLASHBANGS · PLANNED ONLY · NOT BUILT YET");
 assert.equal(utilityKeyPreview(plans,striker,"KeyG"),"SOFT BREACH CHARGE · PLANNED ONLY · NOT BUILT YET");
 assert.equal(utilityKeyPreview(plans,striker,"Digit3"),null);
 assert.equal(utilityKeyPreview(plans,striker,"Digit4"),null);
 assert.equal(utilityKeyPreview(plans,striker,"Digit5"),null);
 assert.equal(utilityKeyPreview(plans,striker,"Digit6"),null);
});
test("HUD representation follows Sentry independently, never leaks enemy gadgets",()=>{
 const striker=operatorById("striker"),sentry=operatorById("sentry");
 let plans=newSecondaryPlans();
 plans=planSecondary(plans,striker,0,"flash");
 plans=planSecondary(plans,sentry,0,"c4");
 plans=planSecondary(plans,sentry,1,"barbed-wire");
 assert.deepEqual(utilityHudRows(plans,sentry).map(s=>s.name),["C4 / Nitro Cell","Barbed Wire"]);
 assert.deepEqual(utilityHudRows(plans,striker).map(s=>s.name),["Flashbangs","EMPTY SLOT"]);
 assert.deepEqual(utilityHudRows(plans,sentry).map(s=>s.fieldReady),[false,true]);
 plans=planSecondary(plans,sentry,1,null);
 assert.deepEqual(utilityHudRows(plans,sentry).map(s=>s.name),["C4 / Nitro Cell","EMPTY SLOT"]);
});

test("Sentry C4 is shown on scroll-wheel click; normal wire on G, not old 3/4",()=>{
 const sentry=operatorById("sentry");
 let plans=newSecondaryPlans();
 plans=planSecondary(plans,sentry,0,"c4");
 plans=planSecondary(plans,sentry,1,"barbed-wire");
 const rows=utilityHudRows(plans,sentry);
 assert.equal(rows[0].key,"MMB");assert.equal(rows[0].code,"MouseMiddle");
 assert.equal(rows[0].name,"C4 / Nitro Cell");
 assert.equal(rows[1].key,"G");assert.equal(rows[1].code,"KeyG");
 assert.equal(rows[1].name,"Barbed Wire");
 assert.equal(utilityKeyPreview(plans,sentry,"MouseMiddle"),
  "C4 / NITRO CELL · PLANNED ONLY · NOT BUILT YET");
 assert.equal(utilityKeyPreview(plans,sentry,"KeyG"),
  "BARBED WIRE · LIVE GADGET · USE IN RANGE");
 assert.equal(utilityKeyPreview(plans,sentry,"Digit3"),null);
 assert.equal(utilityKeyPreview(plans,sentry,"Digit4"),null);
 assert.ok(rows.every(row=>row.fieldReady===false));
});

test("single fully implemented barbed-wire slot is field-ready while C4 is not",()=>{
 const sentry=operatorById("sentry");
 let plans=newSecondaryPlans();
 plans=planSecondary(plans,sentry,1,"barbed-wire");
 assert.equal(planIsFieldReady(plans,sentry),true);
 const rows=utilityHudRows(plans,sentry);
 assert.equal(rows[1].status,"READY · LIVE GADGET");
 assert.equal(rows[1].fieldReady,true);
 assert.equal(rows[0].fieldReady,false);
 plans=planSecondary(plans,sentry,0,"c4");
 assert.equal(planIsFieldReady(plans,sentry),false);
 assert.equal(gadgetById("c4").implemented,false);
});
