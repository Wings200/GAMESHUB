import {developerIdentity} from './settings.js';
import {validateDeveloperGrant} from '../../../games/rpg-prototype/dev-grants.mjs';

const headers={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
export async function onRequestPost(context){
  const origin=context.request.headers.get('Origin');
  if(origin&&origin!==new URL(context.request.url).origin)
    return reply({ok:false,error:'Invalid request origin.'},403);
  let admin;
  try{admin=await developerIdentity(context);}catch{
    return reply({ok:false,error:'Account verification failed.'},503);
  }
  if(!admin)return reply({ok:false,error:'Developer account required.'},403);
  if(!/^application\/json(?:;|$)/i.test(context.request.headers.get('Content-Type')||''))
    return reply({ok:false,error:'Expected JSON.'},415);
  const raw=await context.request.text();
  if(raw.length>2048)return reply({ok:false,error:'Request is too large.'},413);
  try{
    const grant=validateDeveloperGrant(JSON.parse(raw));
    // Gameplay state is stored in this browser's existing local saved game.
    // Only this server-approved command is handed to the game to apply.
    return reply({ok:true,grant});
  }catch(error){
    return reply({ok:false,error:String(error.message||'Invalid grant.')},400);
  }
}
