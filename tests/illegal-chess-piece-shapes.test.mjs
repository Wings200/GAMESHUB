import test from "node:test";
import assert from "node:assert/strict";
import {makePieceSVG,pieceColors,pieceShapeTypes} from "../games/illegal-chess/piece-shapes.mjs";

// Minimal DOM implementation: test the same generated SVG source on both teams.
const previousDocument=globalThis.document;
function withDOM(fn){
 globalThis.document={createElementNS(ns,tag){
  assert.equal(ns,"http://www.w3.org/2000/svg");assert.equal(tag,"svg");
  return {attributes:{},innerHTML:"",setAttribute(k,v){this.attributes[k]=v;}};
 }};
 try{return fn();}finally{globalThis.document=previousDocument;}
}
test("all six types exist and Black uses near-black opaque fill",()=>{
 assert.deepEqual([...pieceShapeTypes].sort(),["b","k","n","p","q","r"]);
 for(const type of pieceShapeTypes){
  const dark=pieceColors(type),ivory=pieceColors(type.toUpperCase());
  assert.equal(dark.fill,"#10161e");
  assert.equal(ivory.fill,"#f9f4e8");
  assert.notEqual(dark.fill,ivory.fill);
 }
});
test("each Black piece has identical SVG geometry to White",()=>withDOM(()=>{
 for(const type of pieceShapeTypes){
  const white=makePieceSVG(type.toUpperCase()),black=makePieceSVG(type);
  assert.equal(white.attributes.viewBox,black.attributes.viewBox);
  assert.equal(white.attributes.class,black.attributes.class);
  // Strip all color hexes: remaining paths and geometry must be identical.
  assert.equal(white.innerHTML.replace(/#[0-9a-f]{6}/gi,"#COLOR"),
    black.innerHTML.replace(/#[0-9a-f]{6}/gi,"#COLOR"));
  assert.match(black.innerHTML,/fill="#10161e"/);
  assert.match(white.innerHTML,/fill="#f9f4e8"/);
 }
}));
test("unknown chess pieces are rejected without unsafe markup",()=>withDOM(()=>{
 assert.equal(makePieceSVG("."),null);
 assert.equal(makePieceSVG("?"),null);
}));
