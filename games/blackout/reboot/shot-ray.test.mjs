import test from "node:test";
import assert from "node:assert/strict";
import {shotScreenPoint,labelShot} from "./shot-ray.js";

test("an active 3D reticle is the source of the ADS bullet pixel",()=>{
 const projected={x:.16,y:-.08,z:.92};
 assert.deepEqual(shotScreenPoint({aiming:true,reticleVisible:true,reticleProjection:projected}),
  {x:.16,y:-.08,origin:"reticle"});
});
test("center-camera fire is maintained before optic appears, while hipfiring and for invalid optics",()=>{
 assert.deepEqual(shotScreenPoint({aiming:true,reticleVisible:false,reticleProjection:{x:.6,y:.2}}),
  {x:0,y:0,origin:"camera"});
 assert.deepEqual(shotScreenPoint({aiming:false,reticleVisible:true,reticleProjection:{x:.6,y:.2}}),
  {x:0,y:0,origin:"camera"});
 assert.equal(shotScreenPoint({aiming:true,reticleVisible:true,
  reticleProjection:{x:Infinity,y:0}}).origin,"camera");
});
test("shot diagnostics distinguish actual solids and actual target heads",()=>{
 assert.equal(labelShot({kind:"blocked",obstacle:"wall-two"}),"SHOT BLOCKED · WALL-TWO");
 assert.equal(labelShot({kind:"target"},"head"),"HEADSHOT");
 assert.equal(labelShot({kind:"miss"}),"SHOT MISSED");
});
