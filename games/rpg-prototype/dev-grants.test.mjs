import test from 'node:test';
import assert from 'node:assert/strict';
import {DEV_ITEM_CATALOG,validateDeveloperGrant,applyDeveloperGrant,
  MAX_DEV_CAPS} from './dev-grants.mjs';
import {createBackpack,countItem,inventoryWeight} from './inventory.mjs';
import {onRequestPost} from '../../functions/api/dev/grant.js';

test('the grant search uses real item data and excludes archived weapons',()=>{
  assert.ok(DEV_ITEM_CATALOG.some(i=>i.id==='weapon:10mm-pistol'));
  assert.ok(DEV_ITEM_CATALOG.some(i=>i.id==='material:steel'));
  assert.ok(DEV_ITEM_CATALOG.some(i=>i.id==='power-plate:t45-head'));
  assert.ok(!DEV_ITEM_CATALOG.some(i=>i.id==='weapon:service-carbine'));
  assert.throws(()=>validateDeveloperGrant({action:'item',itemId:'weapon:service-carbine',quantity:1}));
});
test('rejects unknown IDs, fractional/negative/oversized quantities and invalid caps',()=>{
  for(const quantity of [0,-1,1.5,1000,Infinity,'5',null])
    assert.throws(()=>validateDeveloperGrant({action:'item',itemId:'weapon:10mm-pistol',quantity}));
  for(const amount of [0,-1,2.5,100000001,NaN,'100'])
    assert.throws(()=>validateDeveloperGrant({action:'caps',amount}));
  assert.throws(()=>validateDeveloperGrant({action:'item',itemId:'pretend:gun',quantity:1}));
  assert.throws(()=>validateDeveloperGrant({action:'delete-everything'}));
});
test('grants stacks, ammo, armor and a wallet without modifying input',()=>{
  const pack=createBackpack();
  let result=applyDeveloperGrant(pack,0,{action:'item',itemId:'weapon:10mm-pistol',quantity:1});
  assert.equal(result.added,1);
  assert.equal(countItem(pack,'weapon:10mm-pistol'),0);
  result=applyDeveloperGrant(result.pack,0,{action:'item',itemId:'material:steel',quantity:99});
  assert.equal(countItem(result.pack,'material:steel'),99);
  result=applyDeveloperGrant(result.pack,0,{action:'item',itemId:'ammo:10mm-pistol',quantity:45});
  assert.ok(countItem(result.pack,'ammo:10mm-pistol')>=45);
  result=applyDeveloperGrant(result.pack,0,{action:'item',itemId:'power-plate:t45-head',quantity:1});
  assert.equal(countItem(result.pack,'power-plate:t45-head'),1);
  const money=applyDeveloperGrant(result.pack,MAX_DEV_CAPS-5,{action:'caps',amount:100});
  assert.equal(money.added,5);
  assert.equal(money.caps,MAX_DEV_CAPS);
});
test('W20.95 developer grants keep real gear even when above carry capacity',()=>{
  const pack=createBackpack();
  let result=applyDeveloperGrant(pack,0,{action:'item',itemId:'weapon:10mm-pistol',quantity:70});
  assert.equal(result.added,70);
  assert.equal(result.leftover,0);
  assert.ok(inventoryWeight(result.pack)>230);
  result=applyDeveloperGrant(result.pack,0,{action:'item',itemId:'weapon:pipe-rifle',quantity:1});
  assert.equal(result.ok,true);
  assert.equal(countItem(result.pack,'weapon:pipe-rifle'),1);
  assert.equal(countItem(pack,'weapon:10mm-pistol'),0);
});
const db={prepare(){return {bind(){return {first:async()=>({id:'51cb59ec-7c65-43ad-9431-236d9c7fcc17',username:'DynamiteDEV7392'})}}}}};
function request(body,options={}){
  return {env:{DB:options.db??db},request:new Request('https://game.example/api/dev/grant',{
    method:'POST',headers:{'Content-Type':options.contentType??'application/json',
      ...(options.auth===false?{}:{Cookie:'gh_session=signed-in'}),
      ...(options.origin?{Origin:options.origin}:{})},body:JSON.stringify(body)})};
}
test('API validates grants only for a signed-in developer with a same-origin request',async()=>{
  const valid=await onRequestPost(request({action:'caps',amount:250}));
  assert.equal(valid.status,200);
  assert.deepEqual((await valid.json()).grant,{action:'caps',amount:250});
  assert.equal((await onRequestPost(request({action:'caps',amount:250},{auth:false}))).status,403);
  assert.equal((await onRequestPost(request({action:'caps',amount:250},{origin:'https://evil.example'}))).status,403);
  assert.equal((await onRequestPost(request({action:'item',itemId:'weapon:missing',quantity:2}))).status,400);
  assert.equal((await onRequestPost(request({action:'item',itemId:'weapon:10mm-pistol',quantity:1000}))).status,400);
});

