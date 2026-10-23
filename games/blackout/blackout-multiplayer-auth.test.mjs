import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {onRequestPost as issueTicket} from "../../functions/api/blackout-multiplayer-ticket.js";
import {onRequestPost as verifyTicket} from "../../functions/api/blackout-multiplayer-verify.js";

function fakeDb(usernameKey="dynamitedev7392"){
 const entries=new Map();
 const db={entries,prepare(sql){
   let bindings=[];
   return {
     bind(...vals){bindings=vals;return this},
     async run(){
       if(sql.includes("INSERT INTO blackout_multiplayer_tickets")){
         const [hash,id,username,expires]=bindings;
         entries.set(hash,{user_id:id,username,expires_at:expires,claimed_at:null});
       }
       return {meta:{changes:1}};
     },
     async first(){
       if(sql.includes("FROM sessions s JOIN users u"))
         return {id:"test-admin-id",username:"DEVELOPMENT",username_key:usernameKey};
       if(sql.includes("sqlite_master"))return null;
       if(sql.includes("UPDATE blackout_multiplayer_tickets")){
         const [claimedAt,hash,now]=bindings;
         const item=entries.get(hash);
         if(!item||item.claimed_at!==null||item.expires_at<=now)return null;
         item.claimed_at=claimedAt;return {user_id:item.user_id,username:item.username};
       }
       return null;
     }
   };
 }};
 return db;
}
const issueCtx=(db)=>({env:{DB:db},request:new Request("https://site.test/api/blackout-multiplayer-ticket",{
  method:"POST",headers:{Cookie:"gh_session=opaque-session"}
})});
const verifyCtx=(db,token)=>({env:{DB:db},request:new Request("https://site.test/api/blackout-multiplayer-verify",{
 method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})
})});
test("only approved BLACKOUT accounts can obtain multiplayer tickets",async()=>{
 const denied=await issueTicket(issueCtx(fakeDb("not-a-blackout-tester")));
 assert.equal(denied.status,403);
 const allowed=await issueTicket(issueCtx(fakeDb()));
 assert.equal(allowed.status,200);
 const body=await allowed.json();
 assert.match(body.token,/^[a-f0-9]{96}$/);
 assert.ok(body.expiresAt>Date.now());
});
test("BLACKOUT ticket can verify exactly once and cannot be replayed",async()=>{
 const db=fakeDb();
 const issued=await (await issueTicket(issueCtx(db))).json();
 const ticket=issued.token;
 assert.equal(db.entries.size,1);
 assert.ok(db.entries.has(createHash("sha256").update(ticket).digest("hex")));
 const verified=await verifyTicket(verifyCtx(db,ticket));
 assert.equal(verified.status,200);
 assert.equal((await verified.json()).id,"test-admin-id");
 const replay=await verifyTicket(verifyCtx(db,ticket));
 assert.equal(replay.status,401);
 const invalid=await verifyTicket(verifyCtx(db,"anything"));
 assert.equal(invalid.status,401);
});
test("room creation and WebSocket require verified tickets server-side",()=>{
 const file=path=>readFileSync(new URL(path,import.meta.url),"utf8");
 const worker=file("../../worker.js");
 const room=file("./multiplayer-room.js");
 const lobby=file("./reboot/network-lobby.js");
 assert.match(worker,/verifyBlackoutTicket\(body\?\.ticket\)/);
 assert.match(worker,/verifyBlackoutTicket\(url\.searchParams\.get\("ticket"\)\)/);
 assert.match(worker,/X-Blackout-Verified-User/);
 assert.match(room,/if\(!authenticatedId\)return reply/);
 assert.match(lobby,/requestTicket\(\)/);
 assert.match(lobby,/address\.searchParams\.set\("ticket",joinTicket\)/);
});
