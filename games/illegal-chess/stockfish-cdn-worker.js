/* Stockfish 19 lite: same-origin classic worker shim. GPLv3 upstream engine.
 * The UCI engine itself is loaded unmodified from stockfish@19.0.1. The
 * WebAssembly file URL is supplied in the worker location hash as required
 * by stockfish.js's browser loader.
 *
 * This is only a transport fallback if the Cloudflare Pages Function cannot
 * proxy the large engine assets. No chess positions are transmitted to CDN.
 */
"use strict";
(function(){
 const variant=new URL(self.location.href).searchParams.get("cdn");
 const host=variant==="unpkg"
  ?"https://unpkg.com/stockfish@19.0.1/bin/"
  :"https://cdn.jsdelivr.net/npm/stockfish@19.0.1/bin/";
 const filename=variant==="asm"?"stockfish-19-asm.js":"stockfish-19-lite-single.js";
 try{
  importScripts(host+filename);
 }catch(error){
  self.postMessage("stockfish-loader-error: "+String(error?.message||error));
  throw error;
 }
})();
