import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet,onRequestPut} from '../../functions/api/dev/settings.js';

function fakeStore(username='DynamiteDEV7392') {
  const state={version:0,changes:{},username};
  const db={
    prepare(sql) {
      let args=[];
      return {
        bind(...values){args=values;return this;},
        async first(){
          if (sql.includes('FROM sessions s'))
            return {id:'account-123',username:state.username};
          if (sql.includes('FROM developer_game_settings'))
            return {version:state.version,overrides:JSON.stringify(state.changes)};
          return null;
        },
        async run(){
          if (sql.startsWith('UPDATE developer_game_settings')) {
            if (state.version!==args[3])return {meta:{changes:0}};
            state.changes=JSON.parse(args[0]);state.version++;
            return {meta:{changes:1}};
          }
          return {meta:{changes:1}};
        }
      };
    }
  };
  return {db,state};
}
function context(method='GET', body=null, ids='account-123',username='DynamiteDEV7392') {
  const {db,state}=fakeStore(username);
  const options={method,headers:{'Cookie':'gh_session=real-session',
    'Origin':'https://example.test','Content-Type':'application/json'}};
  if (body) options.body=JSON.stringify(body);
  return {ctx:{env:{DB:db,DEV_ACCOUNT_IDS:ids},
    request:new Request('https://example.test/api/dev/settings',options)},state};
}
test('both named accounts require a real signed-in, pinned account ID',async()=>{
  for(const name of ['DynamiteDEV7392','DynamiteKid2000']){
    const permitted=context('GET',null,'account-123',name);
    assert.equal((await (await onRequestGet(permitted.ctx)).json()).admin,true);
    const denied=context('GET',null,'wrong-account-id',name);
    assert.equal((await (await onRequestGet(denied.ctx)).json()).admin,false);
  }
  const impersonator=context('GET',null,'account-123','SomeoneElse');
  assert.equal((await (await onRequestGet(impersonator.ctx)).json()).admin,false);
});
test('developer save publishes a version and prevents stale writes',async()=>{
  const {ctx,state}=context('PUT',{version:0,changes:{
    weapons:{'10mm-pistol':{damage:48,value:110}},
    scrap:{'material:steel':{value:9}}
  }});
  const secondRequest=ctx.request.clone();
  const first=await onRequestPut(ctx);
  assert.equal(first.status,200);
  assert.equal((await first.json()).version,1);
  assert.equal(state.changes.weapons['10mm-pistol'].damage,48);
  ctx.request=secondRequest;
  const again=await onRequestPut(ctx);
  assert.equal(again.status,409);
});
test('invalid variables and unbound accounts cannot publish',async()=>{
  const invalid=context('PUT',{version:0,changes:{weapons:{'10mm-pistol':{damage:-15}}}});
  assert.equal((await onRequestPut(invalid.ctx)).status,400);
  const unbound=context('PUT',{version:0,changes:{}},'');
  assert.equal((await onRequestPut(unbound.ctx)).status,403);
});
