import test from 'node:test';
import assert from 'node:assert/strict';
import {FIELD_BOUNDS,mapCell,revealMapCells,isMapDiscovered,
  createFieldMap} from './field-map.mjs';

test('field coordinates map to bounded grid cells',()=>{
  assert.deepEqual(mapCell(-62,-53),{cx:0,cz:0,key:'0:0'});
  assert.equal(mapCell(0,0)?.key,'12:10');
  assert.equal(mapCell(-64,0),null);
  assert.equal(mapCell(62,53),null);
  assert.equal(mapCell(NaN,1),null);
  assert.equal(FIELD_BOUNDS.maxX,62);
});

test('exploration reveals nearby space but not distant stations',()=>{
  const discovered=revealMapCells(new Set(),-51,-25);
  assert.ok(isMapDiscovered(discovered,-51,-25));
  assert.ok(!isMapDiscovered(discovered,30,42));
  const again=revealMapCells(discovered,-51,-25);
  assert.deepEqual(again,discovered);
});

test('waypoints are restricted to discovered ground and persist safely',()=>{
  const items=new Map();
  const storage={getItem:k=>items.get(k)||null,setItem:(k,v)=>items.set(k,v)};
  const ctx={fillRect(){},strokeRect(){},clearRect(){},beginPath(){},rect(){},clip(){},
    save(){},restore(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){},
    translate(){},rotate(){},closePath(){},fillText(){},strokeText(){},setTransform(){}};
  const listeners={};
  const canvas={width:900,height:620,getContext:()=>ctx,
    addEventListener:(name,fn)=>listeners[name]=fn,
    getBoundingClientRect:()=>({left:0,top:0,width:900,height:620})};
  const map=createFieldMap({canvas,storage,points:[{x:-51,z:-25,label:'Station 1'}]});
  map.observe(-51,-25,0);
  assert.equal(map.isDiscovered(-51,-25),true,'The HUD may identify locations the player has explored');
  assert.equal(map.isDiscovered(30,42),false,'The HUD must not reveal unexplored locations');
  assert.equal(map.setWaypoint(30,42),false);
  assert.equal(map.setWaypoint(-50,-25),true);
  assert.equal(map.summary().distance,1);
  // Tracked quests can point to an undiscovered destination without revealing
  // fog or overwriting the player's own saved waypoint.
  map.setQuestTarget({x:30,z:42,label:'BORDER WATCH'});
  assert.deepEqual(map.summary().questTarget,
    {x:30,z:42,label:'BORDER WATCH'});
  assert.equal(map.isDiscovered(30,42),false);
  assert.deepEqual(map.summary().waypoint,{x:-50,z:-25});
  map.render();
  const restored=createFieldMap({canvas,storage});
  assert.equal(restored.summary().waypoint.x,-50);
  assert.equal(restored.summary().questTarget,null,
    'Quest markers must follow current active missions, never persisted history');
  map.setQuestTarget(null);
  assert.equal(map.summary().questTarget,null);
  map.setQuestTarget({x:999,z:0});
  assert.equal(map.summary().questTarget,null);
  restored.clearWaypoint();
  assert.equal(restored.summary().waypoint,null);
});
