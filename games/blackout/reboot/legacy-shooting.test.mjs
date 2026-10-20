import test from "node:test";
import assert from "node:assert/strict";
import {Weapons} from "./legacy-weapons.js";
import {recoilFor} from "./legacy-ballistics.js";
import {legacyShotCone,cycleLegacyFire} from "./legacy-shooting.js";
import {GameAudio} from "./legacy-audio.js";

test("original BLACKOUT 710RPM, 30+1 chamber and old ballistic stats are restored",()=>{
 const w=new Weapons(),g=w.current;
 assert.equal(g.rpm,710);
 assert.equal(g.ammo,31);
 assert.equal(g.remaining,120);
 assert.equal(g.hipSpread,.18);
 assert.equal(g.adsSpread,.003);
 assert.equal(g.body,29);
 assert.equal(g.head,83);
});
test("original delayed trigger cycle catches up capped to three and respects RPM",()=>{
 const w=new Weapons();let fired=0;
 assert.equal(cycleLegacyFire(w,1000,{held:true,adsAligned:false},()=>fired++),1);
 assert.equal(cycleLegacyFire(w,1010,{held:true,adsAligned:false}),0);
 assert.equal(cycleLegacyFire(w,1260,{held:true,adsAligned:false},()=>fired++),3);
 assert.equal(fired,4);
 assert.equal(w.current.ammo,27);
 assert.ok(w.current.nextShotAt>1260);
});
test("original tactical reload retains +1 chamber and consumes actual reserve",()=>{
 const w=new Weapons();
 w.tryFire(1000,false);
 const g=w.current;
 assert.equal(g.ammo,30);
 assert.equal(w.reload(1100),true);
 assert.equal(g.reloadType,"tactical");
 assert.equal(g.reloadDurationMs,2250);
 assert.equal(w.tryFire(1200,false).ok,false);
 w.tick(3351);
 assert.equal(g.ammo,31);
 assert.equal(g.remaining,119);
});
test("original empty reload adds charging time and cannot produce phantom chamber",()=>{
 const w=new Weapons(),g=w.current;
 g.ammo=0;
 assert.equal(w.reload(1000),true);
 assert.equal(g.reloadType,"empty");
 assert.equal(g.reloadDurationMs,2690);
 w.tick(3690);
 assert.equal(g.ammo,30);
 assert.equal(g.remaining,90);
});
test("original recoil pattern is repeatable and more climb after follow-up shots",()=>{
 const a=recoilFor("primary",0,false),b=recoilFor("primary",1,false);
 const first=new Weapons().tryFire(1000,true);
 assert.equal(first.ok,true);
 assert.equal(first.kick.vertical,recoilFor("primary",0,true).vertical);
 assert.ok(b.vertical>a.vertical);
 assert.notEqual(a.horizontal,b.horizontal);
});
test("original hip cone is wide, stance affects it, fully aligned ADS shares optic ray",()=>{
 const shot={spread:.18};
 const standing=legacyShotCone(shot,{moving:true},()=>.5);
 const prone=legacyShotCone(shot,{prone:true},()=>.5);
 assert.ok(standing.spread>shot.spread);
 assert.ok(prone.spread<shot.spread);
 assert.deepEqual(legacyShotCone(shot,{aligned:true},()=>.5),{x:0,y:0,spread:0});
});
test("restored audio exposes the original layered gun/reload/click presets",()=>{
 const a=new GameAudio();
 assert.equal(a.ctx,null,"no eager audio context without a browser gesture");
 assert.equal(typeof a.gun,"function");
 assert.equal(typeof a.play,"function");
 assert.equal(typeof a.unlock,"function");
 const src=GameAudio.prototype.gun.toString();
 assert.match(src,/noise\(\.066/);
 assert.match(src,/noise\(\.28/);
 assert.match(src,/tone\(/);
});
