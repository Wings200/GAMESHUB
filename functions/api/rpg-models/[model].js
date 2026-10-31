// Serves a fixed allowlist of CC0 rigged preview GLBs from our own origin.
// No arbitrary remote URL input. Public asset source: Grab3D (CC0 1.0).
const SOURCES=Object.freeze({
  scout:'https://grab3d.com/m/soldier/rigged.glb',
  raider:'https://grab3d.com/m/cyborg/rigged.glb',
  enforcer:'https://grab3d.com/m/sci-fi-soldier/rigged.glb'
});
export async function onRequestGet({params}){
  const id=String(params.model||'');
  const source=Object.prototype.hasOwnProperty.call(SOURCES,id)?SOURCES[id]:null;
  if(!source)return new Response('Unknown model',{status:404});
  try{
    const upstream=await fetch(source,{
      cf:{cacheEverything:true,cacheTtl:86400}
    });
    if(!upstream.ok)return new Response('3D model source unavailable',{status:502});
    return new Response(upstream.body,{
      status:200,
      headers:{
        'Content-Type':'model/gltf-binary',
        'Cache-Control':'public, max-age=86400',
        'X-Content-Type-Options':'nosniff'
      }
    });
  }catch{
    return new Response('3D model source unavailable',{status:502});
  }
}
