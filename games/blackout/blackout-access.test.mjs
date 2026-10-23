import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../../functions/_lib/blackout-access.js",import.meta.url),"utf8");
const access=await import("data:text/javascript;charset=utf-8,"+encodeURIComponent(source));

function makeContext(username,options={}){
  const user=username?{id:options.id||"user-123456789",username,username_key:username.toLowerCase()}:null;
  const db={
    prepare(sql){
      let params=[];
      return {
        bind(...values){params=values;return this},
        async first(){
          if(sql.includes("FROM sessions"))return user;
          if(sql.includes("sqlite_master")){
            const name=sql.includes("blackout_settings")?"blackout_settings":"blackout_testers";
            return options.tables?.includes(name)?{name}:null;
          }
          if(sql.includes("FROM blackout_testers"))return options.isTester?{user_id:params[0]}:null;
          if(sql.includes("FROM blackout_settings"))return {value:options.maintenance?"true":"false"};
          throw new Error("Unexpected DB query: "+sql);
        }
      };
    }
  };
  return {
    env:{DB:db,BLACKOUT_OWNER_USER_ID:options.ownerPin,BLACKOUT_SECOND_ADMIN_USER_ID:options.kidPin},
    request:new Request("https://example.com/games/blackout/",{
      headers:username?{Cookie:"gh_session=opaque-token; gh_access=active"}:{}
    })
  };
}

test("developer and second administrator have equal full access",async()=>{
  for(const username of ["DynamiteDEV7392","DynamiteKid2000"]){
    const context=makeContext(username);
    const account=await access.verifiedBlackoutAccount(context);
    assert.equal(access.blackoutIsAdmin(account,context.env),true);
    assert.equal(await access.blackoutRole(context,account),"admin");
  }
});

test("guests and unknown usernames remain locked",async()=>{
  const guest=makeContext(null);
  assert.equal(await access.verifiedBlackoutAccount(guest),null);
  assert.equal(await access.blackoutRole(guest,null),"locked");
  const outsider=makeContext("RandomPlayer");
  const user=await access.verifiedBlackoutAccount(outsider);
  assert.equal(await access.blackoutRole(outsider,user),"locked");
});

test("optional immutable account pin blocks a renamed imposter",async()=>{
  const context=makeContext("DynamiteKid2000",{kidPin:"someone-else"});
  const user=await access.verifiedBlackoutAccount(context);
  assert.equal(access.blackoutIsAdmin(user,context.env),false);
  assert.equal(await access.blackoutRole(context,user),"locked");
});

test("approved tester may play but loses access during maintenance",async()=>{
  const options={tables:["blackout_testers","blackout_settings"],isTester:true};
  const context=makeContext("Friend123",options);
  const user=await access.verifiedBlackoutAccount(context);
  assert.equal(await access.blackoutRole(context,user),"tester");
  const paused=makeContext("Friend123",{...options,maintenance:true});
  assert.equal(await access.blackoutRole(paused,await access.verifiedBlackoutAccount(paused)),"paused");
});

test("blackout URL normalization includes asset URLs but excludes similar names",()=>{
  assert.equal(access.blackoutGamePath("/games/blackout/"),true);
  assert.equal(access.blackoutGamePath("/games/BLACKOUT/admin.html"),true);
  assert.equal(access.blackoutGamePath("/games/blackout/%69ndex.html"),true);
  assert.equal(access.blackoutGamePath("/games/blackout-extra"),false);
  assert.equal(access.blackoutAdminPage("/games/blackout/admin.html"),true);
});
