import test from "node:test";
import assert from "node:assert/strict";
import {combatIntersections} from "./combat-raycast.js";

test("decorative box edges are never requested for bullet collision",()=>{
 const box={name:"box-one",children:[{type:"LineSegments",name:"decorative-edges"}]};
 const floor={name:"floor"};
 const target={name:"dummy",children:[{name:"head"}]};
 const calls=[];
 const raycaster={intersectObjects(objects,recursive){
  calls.push({objects,recursive});
  if(objects.includes(box))return [{object:box,distance:3,face:{normal:{x:0,y:0,z:1}}}];
  return [{object:target.children[0],distance:7,face:{normal:{x:0,y:0,z:1}}}];
 }};
 const result=combatIntersections(raycaster,[box,floor],[target]);
 assert.equal(result[0].object,box);
 assert.equal(result[1].object,target.children[0]);
 assert.deepEqual(calls.map(c=>c.recursive),[false,true]);
 assert.equal(calls[0].objects.includes(box.children[0]),false);
});
test("closest real surface wins even if target group raycast comes second",()=>{
 const wall={name:"wall"},head={name:"head"},line={name:"line"};
 const raycaster={intersectObjects(objects,recursive){
  return recursive?
   [{object:head,distance:2,face:{normal:{}}}]:
   [{object:wall,distance:3,face:{normal:{}}}];
 }};
 assert.deepEqual(combatIntersections(raycaster,[wall],[head]).map(h=>h.object),
  [head,wall]);
});
test("line segments and other faceless intersections cannot prevent decals",()=>{
 const line={name:"decorative-outline"},box={name:"box"};
 const hits=combatIntersections({
  intersectObjects(objects,recursive){
   return recursive?[]:[
    {object:line,distance:1}, // hypothetical legacy unfiltered outline
    {object:box,distance:1.5,face:{normal:{x:0,y:0,z:1}}}
   ];
  }
 },[line,box],[]);
 assert.deepEqual(hits.map(h=>h.object),[box]);
});
