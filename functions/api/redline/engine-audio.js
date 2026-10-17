/*
 * REDLINE V12.1 — backwards-compatible audio link.
 *
 * The previous Pages Function proxied Wikimedia audio through a Cloudflare
 * subrequest, which returned HTTP 502 on the deployed preview. It must not
 * fetch binary media at runtime. Redirect to the original fixed, licensed
 * Commons file instead; HTMLAudioElement plays it directly in the browser.
 * This route accepts only the existing 'sample=v8' value.
 */
const SOURCE=
  "https://upload.wikimedia.org/wikipedia/commons/c/c6/Trophy_Truck_and_American_V8s.ogg";
export function onRequestGet({request}){
  const url=new URL(request.url);
  if(url.searchParams.get("sample")!=="v8")
    return new Response("Unknown audio sample",{
      status:404,headers:{"Cache-Control":"no-store"}});
  return new Response(null,{
    status:302,
    headers:{
      "Location":SOURCE,
      "Cache-Control":"no-store",
      "X-REDLINE-Audio":"direct-v12-1"
    }
  });
}
