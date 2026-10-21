import test from "node:test";
import assert from "node:assert/strict";
import {shotScreenPoint,labelShot,describeAim,describeShot} from "./shot-ray.js";

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

test("live aim preview distinguishes head, body, blocked obstacle and empty lane",()=>{
 const target={id:"dummy-2"};
 assert.equal(describeAim({kind:"target",target},"head"),"TARGET DUMMY-2 · HEAD");
 assert.equal(describeAim({kind:"target",target},"body"),"TARGET DUMMY-2 · BODY");
 assert.equal(describeAim({kind:"blocked",obstacle:"box-one"}),"BLOCKED BY BOX-ONE");
 assert.equal(describeAim({kind:"miss"}),"CLEAR · NO TARGET");
});
test("last-shot report accurately preserves the actual impact and ray source",()=>{
 assert.equal(describeShot({kind:"target"},{origin:"reticle"},12.49,"head"),
 "HEADSHOT · RETICLE · 12.5M");
 assert.equal(describeShot({kind:"blocked",obstacle:"wall-two"},{origin:"camera"},3.2),
 "SHOT BLOCKED · WALL-TWO · CAMERA · 3.2M");
});
