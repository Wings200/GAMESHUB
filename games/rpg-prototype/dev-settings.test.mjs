import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet,onRequestPut} from '../../functions/api/dev/settings.js';

const DEV_ID = '51cb59ec-7c65-43ad-9431-236d9c7fcc17';
const KID_ID = '71a8cd8f-ef72-4770-83bf-e4da5085f316';
function fakeStore(username='DynamiteDEV7392',userId=DEV_ID) {
  const state={version:0,changes:{},username};
  const db={
    prepare(sql) {
      let args=[];
      return {
        bind(...values){args=values;return this;},
        async first(){
          if (sql.includes('FROM sessions s'))
            return {id:userId,username:state.username};
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
function context(method='GET', body=null, username='DynamiteDEV7392', userId=DEV_ID) {
  const {db,state}=fakeStore(username,userId);
  const options={method,headers:{'Cookie':'gh_session=real-session',
    'Origin':'https://example.test','Content-Type':'application/json'}};
  if (body) options.body=JSON.stringify(body);
  return {ctx:{env:{DB:db},
    request:new Request('https://example.test/api/dev/settings',options)},state};
}
test('both developer usernames are bound to their own stable account IDs',async()=>{
  for(const [username,id] of [['DynamiteDEV7392',DEV_ID],['DynamiteKid2000',KID_ID]]){
    const permitted=context('GET',null,username,id);
    assert.equal((await (await onRequestGet(permitted.ctx)).json()).admin,true);
    const wrongId=context('GET',null,username,'wrong-account-id');
    assert.equal((await (await onRequestGet(wrongId.ctx)).json()).admin,false);
  }
  for(const [username,id] of [['DynamiteDEV7392',KID_ID],['DynamiteKid2000',DEV_ID],
    ['SomeoneElse',DEV_ID],['SomeoneElse',KID_ID]]){
    const swapped=context('GET',null,username,id);
    assert.equal((await (await onRequestGet(swapped.ctx)).json()).admin,false);
  }
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
  const unbound=context('PUT',{version:0,changes:{}},'DynamiteDEV7392','unknown-account');
  assert.equal((await onRequestPut(unbound.ctx)).status,403);
});
