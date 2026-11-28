import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("./site-audio.js",import.meta.url),"utf8");
const instances=[];
class MockAudio{
 constructor(){this.paused=true;this.ended=false;this.dataset={};this.volume=1;this.listeners={};instances.push(this)}
 play(){this.paused=false;return Promise.resolve()}
 pause(){this.paused=true}
 addEventListener(n,f){this.listeners[n]=f}
}
const listeners={};const doc={hidden:false,addEventListener(n,f){listeners[n]=f}};
const build=new Function("Audio","document","window","localStorage",source.replace("export function","function")+"\nreturn createSiteAudio();");
const sound=build(MockAudio,doc,{}, {getItem(){return null},setItem(){}});
sound.unlock();sound.start();await Promise.resolve();
for(const name of ["click","fastener","rebar"])sound.one(name,.5);
for(const id of ["2192","1580","1108"])assert.ok(instances.some(a=>a.src?.endsWith(id+".mp3")&&!a.paused),"distinct "+id);
const click=instances.find(a=>a.src?.endsWith("2192.mp3"));click.listeners.error();assert.ok(click.src.endsWith("1588.mp3"));click.listeners.error();assert.ok(click.src.endsWith("footstep_concrete_000.ogg"));const last=click.src;click.listeners.error();assert.equal(click.src,last);
sound.setVolume(0);assert.ok(instances.every(a=>a.paused));
sound.setVolume(.65);await Promise.resolve();sound.one("click",.5);doc.hidden=true;listeners.visibilitychange();assert.ok(instances.every(a=>a.paused));
doc.hidden=false;await Promise.resolve();sound.one("metal",.5);sound.stop();assert.ok(instances.every(a=>a.paused));
console.log("Audio selection, fallback, mute, visibility and stop passed");
