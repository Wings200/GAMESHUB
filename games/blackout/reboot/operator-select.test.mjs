import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createOperatorPicker} from "./operator-select.js";

class FakeElement{
 constructor(tag="div"){this.tagName=tag;this.children=[];this.textContent="";
  this.className="";this.attributes={};this.listeners=new Map();this.title="";
  this.classList={toggle:(key,on)=>{const classes=new Set(this.className.split(" ").filter(Boolean));
   if(on)classes.add(key);else classes.delete(key);this.className=[...classes].join(" ");}};
 }
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=[...items]}
 setAttribute(name,value){this.attributes[name]=String(value)}
 addEventListener(event,handler){this.listeners.set(event,handler)}
 click(){this.listeners.get("click")?.()}
}
function fixture(){
 const ids=["operator-attack","operator-defend","operator-roster","operator-name",
  "operator-role","operator-speed","operator-armor","operator-slots",
  "operator-playable-label","operator-plan-status","operator-current"];
 const elements=Object.fromEntries(ids.map(x=>[x,new FakeElement()]));
 // Real HTML: #operator-current is in #play OUTSIDE this root.
 return {elements,root:{querySelector(s){
  const id=s.slice(1);return id==="operator-current"?null:elements[id]||null;
 }}};
}
test("attacker screen initially shows six original concepts, only Striker is selectable",()=>{
 const old=globalThis.document;
 const {root,elements}=fixture();
 globalThis.document={createElement:tag=>new FakeElement(tag),
  getElementById:id=>id==="operator-current"?elements["operator-current"]:null};
 try{
  const selected=[];
  assert.equal(root.querySelector("#operator-current"),null,
   "regression: deploy name is NOT a descendant of the picker");
  const picker=createOperatorPicker(root,{onSelect:op=>selected.push(op.id)});
  assert.equal(picker.operator.id,"striker");
  assert.equal(elements["operator-roster"].children.length,6);
  assert.equal(elements["operator-roster"].children[0].tagName,"button");
  assert.ok(elements["operator-roster"].children.slice(1).every(e=>e.tagName==="div"));
  assert.equal(elements["operator-name"].textContent,"STRIKER");
  assert.equal(elements["operator-current"].textContent,"STRIKER");
  assert.equal(elements["operator-speed"].children.filter(e=>e.className.includes("filled")).length,2);
  assert.equal(elements["operator-armor"].children.filter(e=>e.className.includes("filled")).length,2);
  assert.equal(elements["operator-slots"].children.length,2);
  assert.equal(elements["operator-slots"].children[0].children[1].tagName,"select");
  assert.equal(elements["operator-slots"].children[0].children[1].children.length,7);
  assert.equal(elements["operator-slots"].children[0].children[2].textContent,
    "UNASSIGNED · GADGETS IN DEVELOPMENT");
  assert.match(elements["operator-plan-status"].textContent,/NO EQUIPMENT IS FIELD-READY/);
  assert.deepEqual(selected,[],"constructing UI must not trigger a gameplay selection");
 }finally{globalThis.document=old;}
});
test("defender tab switches active operator to Sentry, back to Striker without paywalls",()=>{
 const old=globalThis.document;
 const {root,elements}=fixture(),events=[];
 globalThis.document={createElement:tag=>new FakeElement(tag),
  getElementById:id=>id==="operator-current"?elements["operator-current"]:null};
 try{
  const picker=createOperatorPicker(root,{onSelect:op=>events.push(op)});
  elements["operator-defend"].click();
  assert.equal(picker.operator.id,"sentry");
  assert.equal(elements["operator-defend"].attributes["aria-pressed"],"true");
  assert.equal(elements["operator-roster"].children.length,6);
  assert.equal(elements["operator-roster"].children[0].tagName,"button");
  assert.equal(elements["operator-current"].textContent,"SENTRY");
  assert.equal(elements["operator-slots"].children.length,2);
  elements["operator-attack"].click();
  assert.equal(picker.operator.id,"striker");
  assert.deepEqual(events.map(op=>op.id),["sentry","striker"]);
  assert.equal(elements["operator-playable-label"].textContent,"PLAYABLE · FREE");
 }finally{globalThis.document=old;}
});
test("nonplayable specialist concept has no click handler and cannot activate gadget",()=>{
 const old=globalThis.document;
 const {root,elements}=fixture();
 globalThis.document={createElement:tag=>new FakeElement(tag),
  getElementById:id=>id==="operator-current"?elements["operator-current"]:null};
 try{
  const picker=createOperatorPicker(root);
  const planned=elements["operator-roster"].children[1];
  assert.equal(planned.tagName,"div");
  assert.match(planned.attributes["aria-label"],/not implemented/);
  planned.click();
  assert.equal(picker.operator.id,"striker");
  assert.equal(planned.listeners.size,0);
 }finally{globalThis.document=old;}
});

test("real page contract: DEPLOY label is outside operator selection section",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const sectionStart=html.indexOf('<section id="operator-selection"');
 const sectionEnd=html.indexOf('</section>',sectionStart);
 const current=html.indexOf('id="operator-current"');
 assert.ok(sectionStart>=0&&sectionEnd>sectionStart);
 assert.ok(current>sectionEnd,"the button is not a descendant of the picker");
 const picker=readFileSync(new URL("./operator-select.js",import.meta.url),"utf8");
 assert.ok(picker.includes('document.getElementById("operator-current")'),
  "picker must resolve out-of-panel DEPLOY label at document scope");
 assert.ok(!picker.includes('current=$("operator-current")'),
  "regression: a scoped root lookup will silently break all operator tabs");
});

test("two live dropdowns retain separate side plans without granting fake gadgets",()=>{
 const old=globalThis.document;
 const {root,elements}=fixture();
 globalThis.document={createElement:tag=>new FakeElement(tag),
  getElementById:id=>id==="operator-current"?elements["operator-current"]:null};
 try{
  const picker=createOperatorPicker(root);
  function changeSlot(i,id){
   const select=elements["operator-slots"].children[i].children[1];
   assert.equal(select.tagName,"select");
   select.value=id;
   select.listeners.get("change")();
  }
  changeSlot(0,"flash");
  changeSlot(1,"smoke");
  assert.deepEqual(picker.plans.striker,["flash","smoke"]);
  assert.equal(elements["operator-slots"].children[0].children[1].value,"flash");
  assert.match(elements["operator-plan-status"].textContent,/NOT YET USABLE IN GAME/);
  elements["operator-defend"].click();
  assert.equal(elements["operator-current"].textContent,"SENTRY");
  assert.equal(elements["operator-slots"].children[0].children[1].value,"");
  assert.equal(elements["operator-slots"].children[0].children[1].children.length,7);
  changeSlot(0,"barbed-wire");
  changeSlot(1,"c4");
  assert.deepEqual(picker.plans.sentry,["barbed-wire","c4"]);
  elements["operator-attack"].click();
  assert.equal(elements["operator-slots"].children[0].children[1].value,"flash");
  assert.equal(elements["operator-slots"].children[1].children[1].value,"smoke");
  assert.equal(elements["operator-current"].textContent,"STRIKER");
  elements["operator-defend"].click();
  assert.equal(elements["operator-slots"].children[0].children[1].value,"barbed-wire");
  assert.equal(elements["operator-slots"].children[1].children[1].value,"c4");
 }finally{globalThis.document=old;}
});
test("duplicate and enemy-side equipment never survives the planning UI",()=>{
 const old=globalThis.document;
 const {root,elements}=fixture();
 globalThis.document={createElement:tag=>new FakeElement(tag),
  getElementById:id=>id==="operator-current"?elements["operator-current"]:null};
 try{
  const picker=createOperatorPicker(root);
  const first=elements["operator-slots"].children[0].children[1];
  first.value="flash";first.listeners.get("change")();
  let second=elements["operator-slots"].children[1].children[1];
  second.value="flash";second.listeners.get("change")();
  assert.deepEqual(picker.plans.striker,["flash",null]);
  assert.equal(elements["operator-slots"].children[1].children[1].value,"");
  assert.match(elements["operator-plan-status"].textContent,/INVALID SELECTION/);
  second=elements["operator-slots"].children[1].children[1];
  second.value="c4";second.listeners.get("change")();
  assert.deepEqual(picker.plans.striker,["flash",null]);
  second=elements["operator-slots"].children[1].children[1];
  second.value="claymore";second.listeners.get("change")();
  assert.deepEqual(picker.plans.striker,["flash","claymore"]);
  const empty=elements["operator-slots"].children[0].children[1];
  empty.value="";empty.listeners.get("change")();
  assert.deepEqual(picker.plans.striker,[null,"claymore"]);
 }finally{globalThis.document=old;}
});
