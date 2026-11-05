import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet,onRequestPut} from '../../functions/api/dev/settings.js';
const DEV_ID='51cb59ec-7c65-43ad-9431-236d9c7fcc17';
const KID_ID='71a8cd8f-ef72-4770-83bf-e4da5085f316';
function fakeStore(username='DynamiteDEV7392',userId=DEV_ID,{
  oldSchema=false,existingChanges={}
}={}){
  const state={version:0,changes:existingChanges,defaults:{},
    username,hasBaselineColumn:!oldSchema,migrations:0};
  const db={
    prepare(sql){
      let args=[];
      return {
        bind(...values){args=values;return this;},
        async first(){
          if(sql.includes('FROM sessions s'))
            return {id:userId,username:state.username};
          if(sql.includes('FROM developer_game_settings'))
            return {version:state.version,overrides:JSON.stringify(state.changes),
              baselines:state.hasBaselineColumn?JSON.stringify(state.defaults):undefined};
          return null;
        },
        async all(){
          if(sql.startsWith('PRAGMA table_info'))
            return {results:[{name:'version'},{name:'overrides'},
              ...(state.hasBaselineColumn?[{name:'baselines'}]:[])]};
          return {results:[]};
        },
        async run(){
          if(sql.startsWith('ALTER TABLE')){
            state.hasBaselineColumn=true;state.migrations++;
          }
          if(sql.startsWith('UPDATE developer_game_settings')){
            if(state.version!==args[4])return {meta:{changes:0}};
            state.changes=JSON.parse(args[0]);
            state.defaults=JSON.parse(args[1]);
            state.version++;
            return {meta:{changes:1}};
          }
          return {meta:{changes:1}};
        }
      };
    }
  };
  return {db,state};
}
function context(method='GET',body=null,username='DynamiteDEV7392',userId=DEV_ID,opts={}){
  const {db,state}=fakeStore(username,userId,opts);
  const init={method,headers:{'Cookie':'gh_session=real-session',
    'Origin':'https://example.test','Content-Type':'application/json'}};
  if(body)init.body=JSON.stringify(body);
  return {ctx:{env:{DB:db},request:new Request('https://example.test/api/dev/settings',init)},state};
}
function put(ctx,changes,action='publish',extra={}){
  ctx.request=new Request('https://example.test/api/dev/settings',{
    method:'PUT',headers:{'Cookie':'gh_session=real-session',
      'Origin':'https://example.test','Content-Type':'application/json'},
    body:JSON.stringify({version:extra.version??0,changes,action,...extra})
  });
  return onRequestPut(ctx);
}
test('both usernames MUST match their own stable account UUID',async()=>{
  for(const [username,id] of [['DynamiteDEV7392',DEV_ID],['DynamiteKid2000',KID_ID]]){
    assert.equal((await (await onRequestGet(context('GET',null,username,id).ctx)).json()).admin,true);
    assert.equal((await (await onRequestGet(context('GET',null,username,'wrong-id').ctx)).json()).admin,false);
  }
  for(const [username,id] of [['DynamiteDEV7392',KID_ID],['DynamiteKid2000',DEV_ID],
    ['SomeoneElse',DEV_ID],['SomeoneElse',KID_ID]]){
    assert.equal((await (await onRequestGet(context('GET',null,username,id).ctx)).json()).admin,false);
  }
});
test('old persisted settings migrate without deleting the original edits',async()=>{
  const {ctx,state}=context('GET',null,'DynamiteDEV7392',DEV_ID,{
    oldSchema:true,existingChanges:{scrap:{'material:steel':{value:9}},
      healing:{'supply:medkit':{heal:80}}}});
  const response=await (await onRequestGet(ctx)).json();
  assert.equal(response.ok,true);
  assert.equal(response.changes.resources['material:steel'].buyPrice,12);
  assert.equal(response.changes.resources['material:steel'].sellPrice,4);
  assert.equal(response.changes.consumables['supply:medkit'].heal,80);
  assert.deepEqual(response.defaults,{});
  assert.equal(state.migrations,1);
  assert.deepEqual(state.changes.scrap,{'material:steel':{value:9}},
    'historical raw edits are not overwritten until next publish');
});
test('developer publish saves all changes and rejects a stale version',async()=>{
  const {ctx,state}=context('PUT',{version:0,action:'publish',changes:{
    weapons:{'10mm-pistol':{damage:48,value:110}},
    resources:{'material:steel':{buyPrice:22,sellPrice:9}}
  }});
  const duplicate=ctx.request.clone();
  const first=await onRequestPut(ctx);
  assert.equal(first.status,200);
  assert.equal((await first.json()).version,1);
  assert.equal(state.changes.weapons['10mm-pistol'].damage,48);
  assert.equal(state.changes.resources['material:steel'].sellPrice,9);
  ctx.request=duplicate;
  assert.equal((await onRequestPut(ctx)).status,409);
});
test('setting a component as the new default is persistent and exact',async()=>{
  const {ctx,state}=context();
  const drum='mod:pipe-smg:magazine:drum';
  const base={weapons:{[drum]:{magazineBonus:75,cost_steel:8}}};
  const first=await put(ctx,base,'set-default',{category:'weapons',id:drum});
  assert.equal(first.status,200);
  assert.equal(state.version,1);
  assert.deepEqual(state.defaults.weapons[drum],base.weapons[drum]);
  const temporary={weapons:{[drum]:{magazineBonus:150,cost_steel:1}}};
  assert.equal((await put(ctx,temporary,'publish',{version:1})).status,200);
  assert.equal(state.changes.weapons[drum].magazineBonus,150);
  assert.equal(state.defaults.weapons[drum].magazineBonus,75);
  assert.equal((await put(ctx,state.defaults,'publish',{version:2})).status,200);
  assert.equal(state.changes.weapons[drum].magazineBonus,75);
  assert.equal((await (await onRequestGet({...ctx,request:new Request(
    'https://example.test/api/dev/settings',{headers:{Cookie:'gh_session=real-session'}}
  )})).json()).defaults.weapons[drum].cost_steel,8);
});
test('unknown IDs, invalid cost, wrong special settings and unbound accounts fail closed',async()=>{
  for(const changes of [
    {weapons:{'10mm-pistol':{damage:-1}}},
    {weapons:{'10mm-pistol':{maxCharges:20}}},
    {weapons:{'mod:fake:barrel:long':{damageBonus:5}}},
    {weapons:{'mod:pipe-smg:magazine:drum':{cost_steel:-2}}},
    {armor:{'fantasy-dragon':{points:999}}},
    {junk:{'junk:desk-fan':{value:99}}},
    {resources:{'material:steel':{damage:5}}}
  ]){
    assert.equal((await put(context().ctx,changes)).status,400,JSON.stringify(changes));
  }
  assert.equal((await put(context('GET',null,'DynamiteDEV7392','wrong-id').ctx,
    {},'set-default',{category:'weapons',id:'pipe-smg'})).status,403);
  assert.equal((await put(context().ctx,{},'set-default',{category:'weapons',
    id:'mod:not-implemented'})).status,400);
});
