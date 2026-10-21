import test from "node:test";
import assert from "node:assert/strict";
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
  "operator-playable-label","operator-current"];
 const elements=Object.fromEntries(ids.map(x=>[x,new FakeElement()]));
 return {elements,root:{querySelector(s){return elements[s.slice(1)]||null}}};
}
test("attacker screen initially shows six original concepts, only Striker is selectable",()=>{
 const old=globalThis.document;
 globalThis.document={createElement:tag=>new FakeElement(tag)};
 try{
  const {root,elements}=fixture(),selected=[];
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
  assert.equal(elements["operator-slots"].children[0].children[1].textContent,
    "UNASSIGNED · GADGETS NEXT STAGE");
  assert.deepEqual(selected,[],"constructing UI must not trigger a gameplay selection");
 }finally{globalThis.document=old;}
});
test("defender tab switches active operator to Sentry, back to Striker without paywalls",()=>{
 const old=globalThis.document;globalThis.document={createElement:tag=>new FakeElement(tag)};
 try{
  const {root,elements}=fixture(),events=[];
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
 const old=globalThis.document;globalThis.document={createElement:tag=>new FakeElement(tag)};
 try{
  const {root,elements}=fixture();
  const picker=createOperatorPicker(root);
  const planned=elements["operator-roster"].children[1];
  assert.equal(planned.tagName,"div");
  assert.match(planned.attributes["aria-label"],/not implemented/);
  planned.click();
  assert.equal(picker.operator.id,"striker");
  assert.equal(planned.listeners.size,0);
 }finally{globalThis.document=old;}
});
