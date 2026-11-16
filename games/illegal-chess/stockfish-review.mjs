// Real Stockfish 19 lite (GPL-3.0) UCI review for ordinary chess positions.
// The engine runs in a Web Worker, not on the multiplayer request path.
// Its JS and WASM assets are served unchanged from the pinned stockfish npm
// package through GAMESHUB's same-origin asset proxy.
// https://github.com/nmrugg/stockfish.js · https://github.com/official-stockfish/Stockfish
export const ENGINE_WORKER="/api/illegal-chess/stockfish-19-lite-single.js";

export const MOVE_COINS={
 Book:{name:"Book Move",symbol:"▤",tone:"book"},
 Brilliant:{name:"Brilliant",symbol:"!!",tone:"brilliant"},
 Great:{name:"Great Move",symbol:"!",tone:"great"},
 Best:{name:"Best Move",symbol:"★",tone:"best"},
 Excellent:{name:"Excellent",symbol:"👍",tone:"excellent"},
 Good:{name:"Good",symbol:"✓",tone:"good"},
 Inaccuracy:{name:"Inaccuracy",symbol:"?!",tone:"inaccuracy"},
 Mistake:{name:"Mistake",symbol:"?",tone:"mistake"},
 Blunder:{name:"Blunder",symbol:"??",tone:"blunder"},
 MissedWin:{name:"Missed Win",symbol:"✕",tone:"missed-win"},
 Custom:{name:"Custom Rule",symbol:"✦",tone:"custom"},
 Unavailable:{name:"Stockfish Unavailable",symbol:"—",tone:"custom"}
};

export function parseUciInfo(line){
 if(!/\binfo\b/.test(line)||!/\bscore\s+(cp|mate)\s+-?\d+/.test(line))return null;
 const value=line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/);
 const depth=Number(line.match(/\bdepth\s+(\d+)/)?.[1]||0);
 const pv=line.match(/\bpv\s+(\S+)/)?.[1]||null;
 return {kind:value[1],value:Number(value[2]),depth,pv};
}
function centipawns(result){
 return result.kind==="mate"?Math.sign(result.value)*(32000-Math.min(120,Math.abs(result.value))*150):result.value;
}
function bookMove(entry){
 // This is an intentionally tiny opening recognizer, not an opening database.
 const book={
  1:["e2e4","d2d4","c2c4","g1f3"],
  2:["e7e5","c7c5","e7e6","c7c6","d7d5","g8f6"],
  3:["g1f3","d2d4","b1c3","f1c4","c2c4"],
  4:["b8c6","g8f6","d7d6","e7e6","c7c5"],
  5:["b1c3","f1c4","f1b5","d2d4","g1f3"]
 };
 return !!book[entry.turn]?.includes(entry.uci);
}
export function classifyStockfish(entry,best,played){
 if(!best||!played||!best.score||!played.score)throw Error("Stockfish returned no completed evaluation");
 if(played.bestmove==="(none)")throw Error("Stockfish cannot legally evaluate this custom move");
 const chosen=entry.uci.toLowerCase();
 const matchesBest=best.bestmove?.toLowerCase()===chosen;
 const b=centipawns(best.score),p=centipawns(played.score);
 const loss=Math.max(0,Math.round(b-p));
 let grade;
 if(best.score.kind==="mate"&&best.score.value>0&&!(played.score.kind==="mate"&&played.score.value>0)){
  grade="MissedWin";
 }else if(matchesBest||loss<=8){
  grade=bookMove(entry)?"Book":"Best";
 }else if(loss<=25){
  grade="Excellent";
 }else if(loss<=65){
  grade="Good";
 }else if(loss<=130){
  grade="Inaccuracy";
 }else if(loss<=260){
  grade="Mistake";
 }else grade="Blunder";
 // A Great Move or Brilliant requires tactical context beyond one root score:
 // don't invent those prestigious labels without sufficient evidence.
 const coin=MOVE_COINS[grade];
 return {...entry,status:"done",grade,symbol:coin.symbol,name:coin.name,
  engine:"Stockfish 19 lite",estimated:false,loss,
  depth:Math.min(best.score.depth,played.score.depth),
  reason:grade==="MissedWin"?"Stockfish found a forced mate that this move misses.":
   grade==="Book"?"Known opening development, supported by Stockfish's preferred line.":
   grade==="Best"?"Stockfish's preferred chess move at this search depth.":
   "Stockfish estimates roughly "+loss+" centipawns lost compared with its preferred chess move."};
}

export function createStockfishReviewer({workerFactory=url=>new Worker(url),url=ENGINE_WORKER}={}){
 let worker=null,boot=null,active=null,queue=Promise.resolve(),broken=false;
 function fail(error){
  broken=true;
  if(active){clearTimeout(active.timer);active.reject(error);active=null;}
  if(worker){worker.terminate();worker=null;}
 }
 function handleLine(line){
  if(line==="uciok"||line.endsWith("\nuciok")){worker?.postMessage("setoption name Hash value 16");worker?.postMessage("isready");return;}
  if(line==="readyok"){boot?.resolve();boot=null;return;}
  if(!active)return;
  const info=parseUciInfo(line);
  if(info&&(!active.score||info.depth>=active.score.depth))active.score=info;
  const move=line.match(/^bestmove\s+(\S+)/);
  if(move){
   const job=active;active=null;clearTimeout(job.timer);
   job.resolve({score:job.score,bestmove:move[1]});
  }
 }
 async function ready(){
  if(broken)throw Error("Stockfish worker unavailable");
  if(worker)return;
  worker=workerFactory(url);
  const booted=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{fail(Error("Stockfish engine initialization timed out"));reject(Error("Stockfish startup timeout"));},18000);
   boot={resolve:()=>{clearTimeout(timer);resolve();},
    reject:error=>{clearTimeout(timer);reject(error);}};
  });
  worker.onmessage=event=>{
   for(const line of String(event.data||"").split(/\r?\n/))if(line.trim())handleLine(line.trim());
  };
  worker.onerror=()=>{
   const error=Error("Stockfish engine failed to load");
   boot?.reject(error);boot=null;
   fail(error);
  };
  worker.postMessage("uci");
  await booted;
 }
 async function search(fen,move){
  await ready();
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{fail(Error("Stockfish search timed out"));reject(Error("Stockfish search timed out"));},12000);
   active={resolve,reject,timer,score:null};
   worker.postMessage("position fen "+fen);
   worker.postMessage("go depth 13 movetime 380"+(move?" searchmoves "+move:""));
  });
 }
 function analyze(entry){
  const task=queue.then(async()=>{
   if(entry.status!=="pending"||!entry.beforeFen||!entry.uci)throw Error("Position cannot be sent to Stockfish");
   const best=await search(entry.beforeFen,null);
   const played=await search(entry.beforeFen,entry.uci);
   return classifyStockfish(entry,best,played);
  });
  queue=task.catch(()=>{});
  return task;
 }
 function dispose(){
  broken=true;
  if(boot){boot.reject(Error("Stockfish reviewer closed"));boot=null;}
  if(active){clearTimeout(active.timer);active.reject(Error("Stockfish reviewer closed"));active=null;}
  if(worker)worker.terminate();
  worker=null;
 }
 return {analyze,dispose};
}
