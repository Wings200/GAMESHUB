import {createCombat3D} from "./sniper-3d.mjs?v=4";
// Visual-only cinematic director for server-confirmed Illegal Chess snapshots.
// Never mutates game state, reserves turns, pauses rescue timers, or predicts moves.
const PIECES={p:"PAWN",n:"KNIGHT",b:"BISHOP",r:"ROOK",q:"QUEEN",k:"KING"};
// Identical silhouettes across colors even on the non-WebGL fallback.
const GLYPHS={p:"♙",n:"♘",b:"♗",r:"♖",q:"♕",k:"♔",P:"♙",N:"♘",B:"♗",R:"♖",Q:"♕",K:"♔"};
const VALID_INDEX=n=>Number.isInteger(n)&&n>=0&&n<128&&(n&0x88)===0;
const NAME=p=>PIECES[p?.toLowerCase()]||"PIECE";
const COLOR=p=>p===p?.toUpperCase()?"w":"b";
const ENEMY=(a,b)=>a!=="."&&b!=="."&&COLOR(a)!==COLOR(b);
// Longer holds with 550–850 ms exit fades; reduced motion uses a short static notice.
export const DURATIONS={capture:2300,check:2500,rescue:2700,escape:2400,finish:3500};

// Read only what the server exposed to THIS player, so disguised pieces stay
// disguised and no hidden board/card information leaks through cinematics.
export function boardFromSnapshot(fen){
 if(typeof fen!=="string")return null;
 const rows=fen.split(" ")[0].split("/");
 if(rows.length!==8)return null;
 const board=[];
 for(const row of rows){
  let width=0;
  for(const ch of row){
   if(/^[1-8]$/.test(ch)){const count=Number(ch);width+=count;for(let i=0;i<count;i++)board.push(".");}
   else if(/^[prnbqkPRNBQK]$/.test(ch)){width++;board.push(ch);}
   else return null;
  }
  if(width!==8)return null;
 }
 return board.length===64?board:null;
}
const INDEX_TO_BOARD=n=>(7-(n>>4))*8+(n&7);
const AT=(board,n)=>VALID_INDEX(n)?board?.[INDEX_TO_BOARD(n)]||null:null;
const PIECE_INDEX=(board,piece)=>{const n=board?.indexOf(piece)??-1;return n<0?null:(7-Math.floor(n/8))*16+n%8;};
const threatenedKing=(current,board,finish=false)=>{
 const winner=current.status.winner;
 const color=finish&&["w","b"].includes(winner)?(winner==="w"?"b":"w"):current.turn;
 const kingPiece=color==="b"?"k":"K";
 return {kingPiece,kingSquare:PIECE_INDEX(board,kingPiece)};
};
function enPassantVictim(before,after,from,to,attacker){
 if(attacker?.toLowerCase()!=="p"||AT(before,to)!=="."||AT(after,to)!==attacker)return null;
 if(Math.abs((from&7)-(to&7))!==1||Math.abs((from>>4)-(to>>4))!==1)return null;
 const victimSquare=to+(COLOR(attacker)==="w"?-16:16);
 const victim=AT(before,victimSquare);
 return victim?.toLowerCase()==="p"&&ENEMY(attacker,victim)&&AT(after,victimSquare)==="."?victim:null;
}
function validView(view){
 return view&&typeof view.room==="string"&&Number.isInteger(view.moveCount)&&
  typeof view.fen==="string"&&view.status&&typeof view.status.text==="string";
}
export function cinematicCues(previous,current){
 if(!validView(previous)||!validView(current)||previous.room!==current.room||
  !previous.ready||!current.ready||current.moveCount<previous.moveCount)return [];
 const cues=[],before=boardFromSnapshot(previous.fen),after=boardFromSnapshot(current.fen);
 const nextMove=current.moveCount===previous.moveCount+1;
 // Sniper shots already have a dedicated server-authored 3D presentation.
 const sniper=(current.cinematics||[]).some(e=>e?.id===current.moveCount&&
  (e.kind==="sniper-first-shot"||e.kind==="sniper-teleport"));
 if(nextMove&&!sniper&&before&&after&&VALID_INDEX(current.last?.from)&&VALID_INDEX(current.last?.to)){
  const from=current.last.from,to=current.last.to,attacker=AT(before,from);
  const landed=AT(after,to),target=AT(before,to);
  // The previous director treated ANY occupied destination as a capture.
  // Require opposing colors, vacated origin, and a confirmed change of target.
  // Ignore retained last-move metadata on a card-only update.
  const staleLast=previous.last?.from===from&&previous.last?.to===to;
  const moved=AT(after,from)===".";
  const landingOkay=landed==="."||(landed&&landed!=="."&&COLOR(landed)===COLOR(attacker));
  const ordinary=!staleLast&&from!==to&&moved&&ENEMY(attacker,target)&&
   landingOkay&&landed!==target;
  const ep=!staleLast&&moved&&from!==to?enPassantVictim(before,after,from,to,attacker):null;
  if(ordinary||ep){
   const victim=ordinary?target:ep;
   const name=landed==="."?"DOUBLE KO":NAME(attacker)+" CAPTURE";
   cues.push({kind:"capture",title:name,detail:ep?"EN PASSANT":NAME(victim)+" ELIMINATED",
    attacker,victim,from,to,moveCount:current.moveCount});
  }
 }
 const wasRescue=!!previous.status.rescue,nowRescue=!!current.status.rescue;
 if(!previous.status.done&&current.status.done){
  const mate=/checkmate/i.test(current.status.text);
  cues.push({kind:"finish",title:mate?"CHECKMATE":current.status.winner?"MATCH COMPLETE":"DRAW",
   detail:current.status.text,...threatenedKing(current,after,true),moveCount:current.moveCount});
 }else if(nowRescue&&!wasRescue){
  cues.push({kind:"rescue",title:"LAST CHANCE",detail:"30-SECOND CARD RESCUE",
   ...threatenedKing(current,after),moveCount:current.moveCount});
 }else if(wasRescue&&!nowRescue&&nextMove){
  cues.push({kind:"escape",title:"ESCAPED",detail:"THE KING SURVIVES",
   ...threatenedKing(previous,before),moveCount:current.moveCount});
 }else if(nextMove&&!nowRescue&&!current.status.done&&/check/i.test(current.status.text)){
  cues.push({kind:"check",title:"CHECK",detail:"THE KING IS UNDER ATTACK",
   ...threatenedKing(current,after),moveCount:current.moveCount});
 }
 return cues;
}
function element(tag,className,text){
 const node=document.createElement(tag);node.className=className;
 if(text!==undefined)node.textContent=text;
 return node;
}
function coords(index,player){
 const file=index&7,rank=(index>>4)+1;
 // 10x10 board with a one-square sniper perimeter, viewed from the player.
 const col=player==="b"?8-file:file+1;
 const row=player==="b"?rank:9-rank;
 return {x:(col+.5)*10+"%",y:(row+.5)*10+"%"};
}
export function createCinematicDirector(board,getMode){
 const host=board.closest(".boardWrap");
 const root=element("div","combatDirector");
 root.hidden=true;root.setAttribute("aria-hidden","true");
 const bars=element("div","combatBars"),flash=element("div","combatFlash"),
  trail=element("div","combatTrail"),attacker=element("div","combatActor"),
  victim=element("div","combatVictim"),impact=element("div","combatImpact"),
  caption=element("div","combatCaption"),overline=element("span","combatEyebrow","ILLEGAL CHESS // CINEMATIC"),
  title=element("strong","combatHeadline"),detail=element("span","combatDetail");
 caption.append(overline,title,detail);
 const canvas=element("canvas","combat3DCanvas");
 canvas.setAttribute("aria-hidden","true");
 root.append(canvas,bars,flash,trail,attacker,victim,impact,caption);host.append(root);
 let renderer=null,rendererUnavailable=false;
 let timer=null,active=false,queue=[];
 function position(){
  const b=board.getBoundingClientRect(),h=host.getBoundingClientRect();
  root.style.left=b.left-h.left+"px";root.style.top=b.top-h.top+"px";
  root.style.width=b.width+"px";root.style.height=b.height+"px";
 }
 function stop(){
  if(timer!==null){clearTimeout(timer);timer=null;}
  renderer?.stop();
  root.hidden=true;root.className="combatDirector";active=false;
 }
 function reset(){queue=[];stop();}
 function next(){
  stop();
  if(!queue.length)return;
  if(document.hidden){queue=[];return;}
  const cue=queue.shift(),mode=getMode();
  if(mode==="off"){next();return;}
  const reduced=mode==="reduced"||window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ms=reduced?360:DURATIONS[cue.kind]||900;
  position();
  title.textContent=cue.title;detail.textContent=cue.detail;
  attacker.textContent=GLYPHS[cue.attacker]||"";
  victim.textContent=GLYPHS[cue.victim]||"";
  const from=VALID_INDEX(cue.from)?coords(cue.from,board.dataset.player):{x:"50%",y:"50%"};
  const to=VALID_INDEX(cue.to)?coords(cue.to,board.dataset.player):{x:"50%",y:"50%"};
  root.style.setProperty("--from-x",from.x);root.style.setProperty("--from-y",from.y);
  root.style.setProperty("--to-x",to.x);root.style.setProperty("--to-y",to.y);
  const piece=cue.attacker?.toLowerCase();
  root.style.setProperty("--combat-duration",ms+"ms");
  root.className="combatDirector kind-"+cue.kind+(reduced?" mode-reduced":"")+
   (PIECES[piece]?" piece-"+piece:"");
  // WebGL is initialized lazily and is visual-only. Fall back to CSS if
  // unavailable, including on low-powered devices or lost GPU contexts.
  if(!reduced&&!rendererUnavailable){
   if(!renderer){
    renderer=createCombat3D(canvas);
    if(!renderer)rendererUnavailable=true;
   }
   if(renderer?.play(cue,ms))root.classList.add("has3D");
  }
  root.hidden=false;active=true;
  // Restart the CSS timeline even when consecutive events share a kind.
  void root.offsetWidth;
  root.classList.add("isPlaying");
  timer=setTimeout(()=>{timer=null;next();},ms);
 }
 function enqueue(cues){
  if(!Array.isArray(cues)||!cues.length)return;
  // Do not pile up stale history when polls skip several turns.
  queue.push(...cues.slice(0,3));
  if(queue.length>4)queue=queue.slice(-4);
  if(!active)next();
 }
 return {enqueue,reset,stop,dispose(){reset();renderer?.dispose();renderer=null;root.remove();}};
}
