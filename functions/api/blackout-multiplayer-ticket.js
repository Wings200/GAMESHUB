// One-use credentials for the BLACKOUT Worker. A Pages session is not
// a Worker identity: issue tickets only to users with active BLACKOUT access.
import {verifiedBlackoutAccount,blackoutRole,blackoutJson}
  from "../_lib/blackout-access.js";

const TTL=90_000;
async function digest(token){
 const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
 return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export async function onRequestPost(context){
 try{
   const user=await verifiedBlackoutAccount(context);
   const role=await blackoutRole(context,user);
   if(!user||!["admin","tester"].includes(role))
     return blackoutJson({ok:false,error:"BLACKOUT access required"},403);
   if(!context.env.DB)return blackoutJson({ok:false,error:"Account store unavailable"},503);
   await context.env.DB.prepare(`
     CREATE TABLE IF NOT EXISTS blackout_multiplayer_tickets(
       token_hash TEXT PRIMARY KEY,
       user_id TEXT NOT NULL,
       username TEXT NOT NULL,
       expires_at INTEGER NOT NULL,
       claimed_at INTEGER
     )`).run();
   const token=Array.from({length:3},()=>crypto.randomUUID().replaceAll("-","")).join("");
   const now=Date.now(),expiresAt=now+TTL;
   await context.env.DB.prepare(`
     INSERT INTO blackout_multiplayer_tickets
       (token_hash,user_id,username,expires_at,claimed_at)
     VALUES(?,?,?,?,NULL)`).bind(await digest(token),String(user.id),
     String(user.username||"Operator"),expiresAt).run();
   return blackoutJson({ok:true,token,expiresAt});
 }catch(error){
   console.error("BLACKOUT ticket issue failed",error);
   return blackoutJson({ok:false,error:"Could not authorize multiplayer"},503);
 }
}
export function onRequestGet(){return blackoutJson({ok:false,error:"Use POST"},405)}
