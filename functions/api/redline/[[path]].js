/*
 * REDLINE account API same-origin relay.
 *
 * The multiplayer WebSocket remains directly connected to the Worker. The
 * account shop, wallet and upgrade requests pass through this Pages Function
 * so browser cross-origin/preflight errors cannot strand the Garage UI.
 *
 * Optional Pages service binding REDLINE_WORKER is the preferred transport.
 * When absent, use the published Worker URL and return JSON diagnostics on
 * unreachable upstream / malformed replies. Never cache account responses.
 */
const WORKER_ORIGIN="https://redline-multiplayer.guestuseonly0173.workers.dev";
const ALLOWED=new Set([
  "/health",
  "/api/stats/me",
  "/api/garage/purchase",
  "/api/garage/equip",
  "/api/dealership/purchase"
]);
const asJson=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-REDLINE-Proxy":"garage-v1"
  }
});
export async function onRequest(context){
  const incoming=new URL(context.request.url);
  const prefix="/api/redline";
  const target=incoming.pathname.slice(prefix.length);
  if(!ALLOWED.has(target))return asJson({ok:false,error:"Unknown REDLINE API route."},404);
  if(context.request.method!==(target==="/health"?"GET":"POST"))
    return asJson({ok:false,error:"Invalid request method."},405);
  const targetUrl=WORKER_ORIGIN+target;
  const bound=typeof context.env?.REDLINE_WORKER?.fetch==="function";
  try{
    const upstream=await (bound
      ?context.env.REDLINE_WORKER.fetch(targetUrl,{
        method:context.request.method,
        headers:target==="/health"?{}:{"Content-Type":"application/json"},
        body:target==="/health"?undefined:await context.request.text()
      })
      :fetch(targetUrl,{
        method:context.request.method,
        headers:target==="/health"?{}:{"Content-Type":"application/json"},
        body:target==="/health"?undefined:await context.request.text(),
        redirect:"manual"
      }));
    const text=await upstream.text();
    let data;try{data=JSON.parse(text)}catch{}
    if(!data || typeof data!=="object"){
      console.error("REDLINE Worker returned non-JSON",upstream.status);
      return asJson({ok:false,error:"REDLINE multiplayer Worker returned an invalid response ("+
        upstream.status+"). Check the Worker deployment and logs."},503);
    }
    if(!upstream.ok && !data.error)data.error="REDLINE Worker responded with HTTP "+upstream.status+".";
    return asJson(data,upstream.status);
  }catch(error){
    console.error("REDLINE Worker unreachable from Pages:",error);
    return asJson({ok:false,
      error:"REDLINE multiplayer Worker is unreachable. Check the Worker deployment and "+
        (bound?"service binding.":"Pages service binding REDLINE_WORKER (recommended).")},503);
  }
}
