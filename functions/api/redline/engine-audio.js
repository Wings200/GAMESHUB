/*
 * REDLINE V12 opt-in exterior engine recording relay.
 *
 * ONLY the fixed, licensed Commons V8 recording is allowed. This is a
 * cacheable public AUDIO asset, not the account/multiplayer relay.
 * No arbitrary URL, dynamic host, cookies, or user-selected upstream.
 */
const SOUND="https://upload.wikimedia.org/wikipedia/commons/c/c6/Trophy_Truck_and_American_V8s.ogg";
const headers={
  "Content-Type":"audio/ogg",
  "Cache-Control":"public, max-age=86400, s-maxage=604800",
  "X-Content-Type-Options":"nosniff",
  "X-REDLINE-Audio":"exterior-v8-goodwood-2009"
};
export async function onRequestGet({request}){
  const url=new URL(request.url);
  if(url.searchParams.get("sample")!=="v8")
    return new Response("Unknown audio sample",{status:404,headers:{"Cache-Control":"no-store"}});
  try{
    const upstream=await fetch(SOUND,{
      redirect:"follow",
      headers:{"Accept":"audio/ogg"},
      cf:{cacheEverything:true,cacheTtl:86400}
    });
    if(!upstream.ok || !(upstream.headers.get("content-type")||"").includes("audio"))
      return new Response("Recording not available; use V11.2 instead.",{
        status:502,headers:{"Cache-Control":"no-store"}});
    const size=Number(upstream.headers.get("content-length")||0);
    if(size>5_000_000)
      return new Response("Audio source exceeded size limit",{status:502});
    return new Response(upstream.body,{status:200,headers});
  }catch{
    return new Response("Recording unavailable; V11.2 fallback active",{
      status:503,headers:{"Cache-Control":"no-store"}});
  }
}
