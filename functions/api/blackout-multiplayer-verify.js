// Consume a BLACKOUT-only ticket exactly once. Worker calls this through
// a server-to-server POST; the anonymous room endpoints never receive a
// trusted identity from a browser-supplied username/header.
import {blackoutJson} from "../_lib/blackout-access.js";
async function digest(token){
 const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
 return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
export async function onRequestPost(context){
 try{
   const {token}=await context.request.json().catch(()=>({}));
   if(typeof token!=="string"||!/^[a-f0-9]{96}$/i.test(token))
     return blackoutJson({ok:false,error:"Invalid ticket"},401);
   if(!context.env.DB)return blackoutJson({ok:false,error:"Account store unavailable"},503);
   // UPDATE RETURNING prevents one ticket being accepted by concurrent rooms.
   const account=await context.env.DB.prepare(`
      UPDATE blackout_multiplayer_tickets
      SET claimed_at=?
      WHERE token_hash=? AND claimed_at IS NULL AND expires_at>?
      RETURNING user_id,username
   `).bind(Date.now(),await digest(token),Date.now()).first();
   if(!account?.user_id)
     return blackoutJson({ok:false,error:"Expired or used ticket"},401);
   return blackoutJson({ok:true,id:String(account.user_id),
     username:String(account.username||"Operator")});
 }catch(error){
   console.error("BLACKOUT ticket verification failed",error);
   return blackoutJson({ok:false,error:"Could not verify ticket"},503);
 }
}
export function onRequestGet(){return blackoutJson({ok:false,error:"Use POST"},405)}
