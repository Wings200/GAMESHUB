// Server-authoritative Illegal Chess rules for Cloudflare Pages / D1.
// Only implemented cards may be dealt: the larger approved design catalog is a roadmap.
import {parseFen,START_FEN,clone,on,side,sq,idx,isSquare,legal,apply,inCheck,updateRights,stateStatus,fen,sniperFront} from "./engine.mjs";
import {gradeAnalystTurn,analystActive} from "./analyst.mjs";

export const CARDS=[
 {id:"pawn-sidestep",name:"Pawn Sidestep",rarity:"Common",mode:"two",description:"Slide a pawn sideways one empty square. Uses your turn."},
 {id:"pawn-ram",name:"Pawn Ram",rarity:"Common",mode:"two",description:"Push an opposing pawn facing your pawn one square backward into empty space. Your pawn stays put. Uses your turn."},
 {id:"friendly-fire",name:"Friendly Fire",rarity:"Uncommon",mode:"two",description:"Capture one of your own non-king pieces with another of your pieces using its normal capture movement. Uses your turn."},
 {id:"pawn-strike",name:"Pawn Strike",rarity:"Rare",mode:"instant",description:"Both sides' pawns stop advancing for one full round, but diagonal captures remain legal. Play your normal move afterward."},
 {id:"delayed-en-passant",name:"Delayed En Passant",rarity:"Uncommon",mode:"instant",description:"On your next turn after missing en passant, restore that capture for this turn if both pawns and its target square remain eligible. Bonus action."},
 {id:"promotion-recall",name:"Promotion Recall",rarity:"Rare",mode:"recall",description:"Instead of promoting your pawn on its final rank, recall a captured knight, bishop or rook onto an empty original home square."},
 {id:"time-capsule",name:"Time Capsule",rarity:"Epic",mode:"one-prep",description:"Mark your non-king piece's square before moving it. On your next turn you may spend the turn returning that piece to the marked square."},
 {id:"insurance-fraud",name:"Insurance Fraud",rarity:"Uncommon",mode:"one",description:"Insure a friendly non-king piece for two enemy turns. Capturing it freezes the capturer for their next turn."},
 {id:"prisoner-exchange",name:"Prisoner Exchange",rarity:"Uncommon",mode:"instant-turn",description:"If both sides lost a pawn, revive one pawn for each on the first empty pawn starting square. Uses your turn."},
 {id:"relocation-order",name:"Relocation Order",rarity:"Epic",mode:"relocate",description:"Select a legal capture of an enemy non-king piece; relocate it to an empty original starting square instead. Attacker stays."},
 {id:"voluntary-eviction",name:"Voluntary Eviction",rarity:"Common",mode:"one",description:"Remove one of your non-king pieces to clear space. Uses your turn."},
 {id:"colorblind-bishop",name:"Colorblind Bishop",rarity:"Uncommon",mode:"two",description:"Step your bishop one empty orthogonal square, changing square color."},
 {id:"knight-exchange",name:"Knight Exchange",rarity:"Uncommon",mode:"two",description:"Swap your knight and pawn a knight-jump apart."},
 {id:"parking-ticket",name:"Parking Ticket",rarity:"Rare",mode:"instant",description:"Freeze the enemy's last-moved piece for one turn. Play a chess move afterward."},
 {id:"bishop-sniper",name:"Bishop Sniper",rarity:"Epic",mode:"sniper",description:"Fire once from off-board, revealing your diagonal. The second shot captures and teleports the bishop onto its target."},
 {id:"reserved-parking",name:"Reserved Parking",rarity:"Rare",mode:"square",description:"Reserve one empty enemy landing square; then make your normal move."},
 {id:"ceasefire",name:"Ceasefire",rarity:"Rare",mode:"instant",description:"Declare no captures for your move and the opponent's reply."},
 {id:"double-ko",name:"Double KO",rarity:"Epic",mode:"two",description:"Capture, but both the attacking and captured pieces disappear."},
 {id:"hit-and-run",name:"Hit and Run",rarity:"Epic",mode:"two",description:"Make a legal knight capture without leaving the starting square."},
 {id:"queens-abdication",name:"Queen's Abdication",rarity:"Epic",mode:"transform",description:"Transform your queen into a knight or bishop in place."},
 {id:"black-market",name:"Black Market",rarity:"Legendary",mode:"market",description:"Exchange an unused card for another of the same rarity."},
 {id:"identity-theft",name:"Identity Theft",rarity:"Epic",mode:"two",description:"Exchange the appearances of two friendly non-king pieces for the opponent's next turn. Their real moves and attack rules remain unchanged."},
 {id:"objection",name:"Objection!",rarity:"Rare",mode:"reaction",description:"When your opponent activates a card, object to cancel it. Their card is retained and they must make a normal move."},
 {id:"classified-promotion",name:"Classified Promotion",rarity:"Rare",mode:"instant",description:"Arm your immediate pawn promotion. The new piece stays disguised to your opponent until it moves, captures, checks, or is captured."},
 {id:"counterfeit",name:"Counterfeit",rarity:"Legendary",mode:"copy",description:"On your next turn, copy the most recent non-reaction card your opponent activated. Copying consumes your full chess turn."},
 {id:"the-analyst",name:"The Analyst",rarity:"Legendary",mode:"passive",description:"PASSIVE: Uses real Stockfish 19 chess evaluation for ordinary moves, with circular feedback icons. Custom card positions are marked separately."}
];
// Tier-level odds keep Legendary cards scarce while allowing more Uncommon/Rare variety.
// The original 45% Common tier had only three cards, causing repeated hands.
const weights={Common:28,Uncommon:29,Rare:25,Epic:14,Legendary:4};
const rand=n=>{if(n<1)throw Error("Invalid random range");const a=new Uint32Array(1);const limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a)}while(a[0]>=limit);return a[0]%n};
const getCard=id=>CARDS.find(c=>c.id===id);
const current=s=>s.t===1?"w":"b";
export const CHECKMATE_RESCUE_MS=30_000;
function pickWeighted(pool,recent=new Set()){
 const tiers=Object.keys(weights).filter(t=>pool.some(c=>c.rarity===t));
 let n=rand(tiers.reduce((sum,t)=>sum+weights[t],0)),r=tiers[0];
 for(const t of tiers){n-=weights[t];if(n<0){r=t;break;}}
 // Prefer unseen cards only AFTER rarity is selected. Recency never increases
 // the probability of a Legendary or bypasses server-authoritative drawing.
 const options=pool.filter(c=>c.rarity===r),fresh=options.filter(c=>!recent.has(c.id));
 const choices=fresh.length?fresh:options;
 return choices[rand(choices.length)];
}
export function randomHand(recentIds=[],excludeIds=[]){
 const recent=new Set(recentIds),excluded=new Set(excludeIds);
 const pool=CARDS.filter(c=>!excluded.has(c.id)),hand=[];
 for(let i=0;i<3;i++){
  const card=pickWeighted(pool,recent);
  hand.push({id:card.id,used:false});
  pool.splice(pool.indexOf(card),1);
 }
 return hand;
}
export function newGame(room,whiteToken,recentCards=[]){const s=parseFen(START_FEN),snipers={w:null,b:null};s.sniperSignature=JSON.stringify(snipers);return {room,s,history:[s],snipers,players:{w:whiteToken,b:null},hands:{w:randomHand(recentCards),b:[]},effects:{freeze:null,reserved:null,ceasefire:0,pawnStrike:0,insurance:{w:null,b:null},delayedEp:null,timeCapsule:null},epWindows:{w:null,b:null},capturedPieces:{w:{n:0,b:0,r:0},b:{n:0,b:0,r:0}},capturedPawns:{w:0,b:0},identityTheft:null,classified:{w:null,b:null},copyOffers:{w:null,b:null},pendingReaction:null,cardBlocked:null,moveCount:0,swaps:0,rescue:null,pendingColorSwap:false,analystLog:[],analystLease:null,cinematics:[],last:null,log:[]};}
export function joinGame(g,blackToken,recentCards=[]){if(g.players.b)throw Error("Room is already full");g.players.b=blackToken;g.hands.b=randomHand(recentCards,g.hands.w.map(c=>c.id));}
export const stateFen=g=>fen(g.s);
export function available(g){
 const s=g.s,col=current(s);
 const extra=g.effects.delayedEp?.color===col?delayedEpMoves(g,col):[];
 const ordinary=[...legal(s,g.snipers),...extra];
 const capsule=g.effects.timeCapsule;
 const allowed=ordinary.filter(m=>{
  const capture=s.b[m[1]]!=="."||m[3]==="ep";
  if(capsule?.color===col&&capsule.stage==="armed"&&(m[0]!==idx(capsule.origin)||m[2]))return false;
  if(g.effects.classifiedArmed?.color===col&&!m[2])return false;
  if(g.effects.freeze?.color===col&&m[0]===g.effects.freeze.square)return false;
  if(g.effects.reserved?.color===col&&m[1]===g.effects.reserved.square)return false;
  if(g.effects.ceasefire>0&&capture)return false;
  if(g.effects.pawnStrike>0&&s.b[m[0]].toLowerCase()==="p"&&(m[0]&7)===(m[1]&7))return false;
  return true;
 });
 // An armed Classified Promotion and Pawn Strike must be enforced strictly.
 if(g.effects.classifiedArmed?.color===col)return allowed;
 // Pawn Strike forbids forward pawn moves without exception, even if the player has no other moves.
 // Preserve the old fallback for other legacy temporary modifiers.
 return g.effects.pawnStrike>0?allowed:(allowed.length||!ordinary.length?allowed:ordinary);
}
// Shot one removes a target but keeps the off-board bishop. Shot two lands the bishop
// on the captured square and deactivates the sniper. Both are alternative chess turns.
function sniperResult(g,color,to){
 const sniper=g.snipers[color],landing=sniper.shots>=1;
 const nextSnipers=landing?{...g.snipers,[color]:null}:g.snipers;
 const next=patch(g.s,{remove:[to],place:landing?[[to,color==="w"?"B":"b"]]:[],resetHalf:true},nextSnipers);
 return {next,nextSnipers,landing};
}
export function sniperShots(g,color){
 const sniper=g.snipers?.[color],front=sniperFront(g.s,sniper);
 if(!front||side(front.piece)!==(color==="w"?-1:1)||front.piece.toLowerCase()==="k"||g.effects.ceasefire>0)return [];
 try{sniperResult(g,color,sq(front.square));return [sq(front.square)];}
 catch{return [];}
}
// Every player with at least one unused card receives the same 30 seconds,
// including if the remaining cards cannot possibly rescue their king.
function startRescue(g,now=Date.now()){
 if(g.rescue||!g.players.b||available(g).length||!inCheck(g.s,g.s.t,g.snipers))return;
 const color=current(g.s);
 if(sniperShots(g,color).length||!(g.hands[color]||[]).some(c=>!c.used))return;
 g.rescue={color,deadline:now+CHECKMATE_RESCUE_MS};
 g.log.push({side:"system",text:(color==="w"?"White":"Black")+" has 30 seconds to escape checkmate using a card"});
}
function pauseRescue(g){
 if(g.rescue&&!g.rescue.pausedAt)g.rescue.pausedAt=Date.now();
}
function resumeRescue(g){
 if(g.rescue?.pausedAt){
  g.rescue.deadline+=Math.max(0,Date.now()-g.rescue.pausedAt);
  delete g.rescue.pausedAt;
 }
}
export function status(g,now=Date.now()){
 if(!g.players.b)return {done:false,text:"Waiting for opponent"};
 const moves=available(g),color=current(g.s),shots=sniperShots(g,color);
 if(!moves.length&&!shots.length&&inCheck(g.s,g.s.t,g.snipers)&&g.rescue?.color===color){
  const paused=!!g.rescue.pausedAt;
  const remainingMs=Math.max(0,g.rescue.deadline-(paused?g.rescue.pausedAt:now));
  if(paused||remainingMs>0)return {
   done:false,winner:null,text:(color==="w"?"White":"Black")+" faces checkmate — card rescue window",
   rescue:{remainingMs,paused}
  };
 }
 return stateStatus(g.s,g.history,moves.length?moves:shots,g.snipers);
}

// The player seeing a disguise receives only an apparent FEN. Actual piece
// identity, attack geometry and winner calculations always use the true board.
function visibleFen(g,viewer){
 const b=g.s.b.slice(),theft=g.identityTheft;
 if(theft&&theft.color!==viewer&&b[idx(theft.a)]===theft.pieceA&&b[idx(theft.b)]===theft.pieceB){
  b[idx(theft.a)]=theft.pieceB;
  b[idx(theft.b)]=theft.pieceA;
 }
 for(const mark of Object.values(g.classified||{})){
  if(mark&&mark.color!==viewer&&b[idx(mark.square)]===mark.piece)b[idx(mark.square)]=mark.color==="w"?"P":"p";
 }
 return fen({...g.s,b});
}
function publicEffects(g,viewer){
 const e=structuredClone(g.effects);
 // Piece-type fields are only used by server rules. Public modifiers need
 // square and countdown, never a private piece type or its hidden identity.
 for(const mark of Object.values(e.insurance||{}))if(mark&&mark.color!==viewer)delete mark.piece;
 if(e.timeCapsule&&e.timeCapsule.color!==viewer)delete e.timeCapsule.piece;
 return e;
}
function redactedLast(g,viewer){
 const last=g.last;if(!last)return null;
 for(const mark of Object.values(g.classified||{})){
  if(mark&&mark.color!==viewer&&last.to===idx(mark.square))return {...last,piece:mark.color==="w"?"P":"p"};
 }
 return last;
}
// Test direct attacks by the secretly promoted piece, not by unrelated
// allies; reveal the piece if it gives check.
function pieceGivesCheck(s,mark){
 if(s.b[idx(mark.square)]!==mark.piece)return false;
 const from=idx(mark.square),king=s.b.indexOf(mark.color==="w"?"k":"K");
 if(king<0)return false;
 const dx=(king&7)-(from&7),dy=(king>>4)-(from>>4);
 const x=Math.abs(dx),y=Math.abs(dy),piece=mark.piece.toLowerCase();
 if(piece==="n")return x===1&&y===2||x===2&&y===1;
 if(piece==="p")return x===1&&dy===(mark.color==="w"?-1:1);
 if(piece==="k")return Math.max(x,y)===1;
 if(piece==="b"&&x!==y||piece==="r"&&dx&&dy||piece==="q"&&!(x===y||!dx||!dy))return false;
 if(!["b","r","q"].includes(piece)||!x&&!y)return false;
 let cx=(from&7)+Math.sign(dx),cy=(from>>4)+Math.sign(dy);
 while(cx!==(king&7)||cy!==(king>>4)){
  if(s.b[cy*16+cx]!==".")return false;
  cx+=Math.sign(dx);cy+=Math.sign(dy);
 }
 return true;
}

export function playerView(g,color){
 const s=g.s,st=status(g),canAnalyze=analystActive(g,color);
 return {room:g.room,player:color,ready:!!g.players.b,publicRoom:!!g.public,turn:current(s),fen:visibleFen(g,color),status:st,moveCount:g.moveCount||0,swaps:g.swaps||0,
  hand:g.hands[color].map(c=>({...getCard(c.id),used:c.used})),
  opponent:g.hands[color==="w"?"b":"w"].map(c=>({...getCard(c.id),used:c.used})),
  effects:publicEffects(g,color),last:redactedLast(g,color),log:g.log.slice(-40),
  cinematics:(g.cinematics||[]).slice(-8),
  // The Analyst's ability belongs ONLY to a player holding the passive card.
  // Match-wide evaluation remains shared internally, but grade history,
  // move analysis inputs (beforeFen/uci) and worker info are private to owners.
  analyst:{active:canAnalyze,entries:canAnalyze?(g.analystLog||[]).slice(-32):[],
   worker:canAnalyze&&g.analystLease?.expires>Date.now()?{
    role:g.analystLease.hash===g.players[color]?"leader":"viewer",
    clientId:g.analystLease.id,quality:g.analystLease.quality,score:g.analystLease.score,readyAt:g.analystLease.readyAt
   }:null},
  pendingReaction:g.pendingReaction?{card:g.pendingReaction.card,name:getCard(g.pendingReaction.card)?.name||"Card",actor:g.pendingReaction.actor,defender:g.pendingReaction.defender,canReact:color===g.pendingReaction.defender}:null,
  counterfeitOffer:current(s)===color&&!g.cardBlocked&&g.copyOffers?.[color]?{...getCard(g.copyOffers[color].id)}:null,
  relocationChoices:!st.done&&current(s)===color&&g.hands[color].some(c=>!c.used&&(c.id==="relocation-order"||c.id==="counterfeit"&&g.copyOffers?.[color]?.id==="relocation-order"))?relocationChoices(g):[],
  recallChoices:!st.done&&current(s)===color&&g.hands[color].some(c=>!c.used&&(c.id==="promotion-recall"||c.id==="counterfeit"&&g.copyOffers?.[color]?.id==="promotion-recall"))?promotionRecallChoices(g):[],
  delayedEpTargets:!st.done&&current(s)===color&&g.hands[color].some(c=>!c.used&&(c.id==="delayed-en-passant"||c.id==="counterfeit"&&g.copyOffers?.[color]?.id==="delayed-en-passant"))?delayedEpMoves(g,color).map(m=>({from:sq(m[0]),to:sq(m[1])})):[],
  capsuleReturn:!st.done&&current(s)===color?capsuleReturn(g,color):null,
  sniper:{own:g.snipers?.[color]?{origin:g.snipers[color].origin,direction:g.snipers[color].direction,shots:g.snipers[color].shots||0}:null,
   opponentActive:!!g.snipers?.[color==="w"?"b":"w"],
   opponentRevealed:g.snipers?.[color==="w"?"b":"w"]?.revealed?{origin:g.snipers[color==="w"?"b":"w"].origin,direction:g.snipers[color==="w"?"b":"w"].direction}:null},
  sniperShots:st.done||g.pendingReaction||g.cardBlocked?.color===color||current(s)!==color?[]:sniperShots(g,color),
  legal:st.done||g.pendingReaction||current(s)!==color?[]:available(g).map(m=>({from:sq(m[0]),to:sq(m[1]),promotion:m[2]||"",capture:s.b[m[1]]!=="."||m[3]==="ep"}))};
}
function requireTurn(g,color){if(!g.players.b)throw Error("Wait for a second player");if(status(g).done)throw Error("Game is over");if(current(g.s)!==color)throw Error("Not your turn");}
function owned(g,color,id){const item=g.hands[color].find(x=>x.id===id&&!x.used);if(!item)throw Error("This card isn't available");return item;}
function tick(g,color){
 if(g.effects.freeze?.color===color)g.effects.freeze=null;
 if(g.effects.reserved?.color===color)g.effects.reserved=null;
 if(g.effects.ceasefire>0)g.effects.ceasefire--;
 if(g.effects.pawnStrike>0)g.effects.pawnStrike--;
 if(g.effects.delayedEp?.color===color)g.effects.delayedEp=null;
 if(g.effects.classifiedArmed?.color===color)g.effects.classifiedArmed=null;
}
function commit(g,color,next,label,last=null,effect=null){
 // The card is an automatic passive. Only grade completed, turn-consuming
 // actions; never rate canceled Objections or standalone bonus cards.
 let judgment=null;
 if(analystActive(g)){
  try{
   const rarities=Object.fromEntries(CARDS.map(c=>[c.id,c.rarity]));
   judgment=gradeAnalystTurn(g,color,next,label,last,{
    availableMoves:available(g),sniperTargets:sniperShots(g,color),cardRarities:rarities
   });
  }catch(error){
   console.error("Analyst estimate failed",error);
  }
 }
 const previous=g.s;
 // Disguises never modify the authoritative chessboard. The opponent's
 // next completed action ends Identity Theft, regardless of piece movement.
 if(g.identityTheft?.color!==color&&g.identityTheft)g.identityTheft=null;
 g.classified||={w:null,b:null};
 for(const c of ["w","b"]){
  const mark=g.classified[c];if(!mark)continue;
  if(next.b[idx(mark.square)]!==mark.piece||last?.from===idx(mark.square))g.classified[c]=null;
 }
 if(effect?.classified)g.classified[color]={color,square:effect.classified.square,piece:effect.classified.piece};
 for(const c of ["w","b"]){
  const mark=g.classified[c];
  if(mark&&pieceGivesCheck(next,mark))g.classified[c]=null;
 }
 if(g.cardBlocked?.color===color)g.cardBlocked=null;
 g.copyOffers||={w:null,b:null};
 g.copyOffers[color]=null;
 const insurance=g.effects.insurance||{w:null,b:null};
 // Track captured/lost pawns by the actual board delta, excluding promotions.
 g.capturedPawns||={w:0,b:0};
 g.capturedPieces||={w:{n:0,b:0,r:0},b:{n:0,b:0,r:0}};
 // Only opponent-caused removals count as captured pieces for Promotion Recall.
 const defeated=color==="w"?"b":"w";
 for(const type of ["n","b","r"]){
  const symbol=defeated==="w"?type.toUpperCase():type;
  const count=b=>b.b.reduce((n,p)=>n+(p===symbol),0);
  g.capturedPieces[defeated][type]+=Math.max(0,count(previous)-count(next));
 }
 for(const sideColor of ["w","b"]){
  const letter=sideColor==="w"?"P":"p";
  const count=board=>board.b.reduce((sum,p)=>sum+(p===letter?1:0),0);
  let loss=Math.max(0,count(previous)-count(next));
  if(effect?.promoted===sideColor)loss=Math.max(0,loss-1);
  g.capturedPawns[sideColor]+=loss;
 }
 const capsule=g.effects.timeCapsule;
 if(capsule){
  if(capsule.color===color&&capsule.stage==="armed"){
   if(last?.from!==idx(capsule.origin)||next.b[last.to]!==capsule.piece||last.to===last.from)throw Error("Time Capsule requires moving the selected non-king piece");
   capsule.square=last.to;
   capsule.stage="return";
  }else if(capsule.color===color&&capsule.stage==="return"){
   g.effects.timeCapsule=null;
  }else if(capsule.stage==="return"&&next.b[capsule.square]!==capsule.piece){
   g.effects.timeCapsule=null;
  }
 }
 tick(g,color);
 // Insurance follows ordinary piece movement; a real enemy capture freezes
 // the capturer on the landing square for their following turn.
 for(const protectedColor of ["w","b"]){
  const mark=insurance[protectedColor];
  if(!mark)continue;
  if(last?.color===protectedColor&&last.from===mark.square&&next.b[last.to]===mark.piece){
   mark.square=last.to;
  }else if(next.b[mark.square]!==mark.piece){
   const capture=last?.color!==protectedColor&&last?.to===mark.square&&side(next.b[mark.square])===(protectedColor==="w"?-1:1);
   if(capture)g.effects.freeze={color:last.color,square:mark.square};
   insurance[protectedColor]=null;
   continue;
  }
  if(color!==protectedColor&&--mark.remaining<=0)insurance[protectedColor]=null;
 }
 g.effects.insurance=insurance;next.sniperSignature=JSON.stringify(g.snipers||{w:null,b:null});g.s=next;g.history.push(next);g.last=last;g.log.push({side:color,text:label});
 if(judgment){
  g.analystLog||=[];
  g.analystLog.push(judgment);
  if(g.analystLog.length>80)g.analystLog=g.analystLog.slice(-60);
 }
 if(effect?.kind==="freeze")g.effects.freeze={color:color==="w"?"b":"w",square:effect.square};
 if(effect?.kind==="reserved")g.effects.reserved={color:color==="w"?"b":"w",square:effect.square};
 if(effect?.kind==="ceasefire")g.effects.ceasefire=2;
 if(effect?.kind==="insurance")g.effects.insurance[color]={color,square:effect.square,piece:effect.piece,remaining:2};
 if(effect?.kind==="prisoner-exchange"){
  g.capturedPawns.w--;
  g.capturedPawns.b--;
 }
 if(effect?.kind==="promotion-recall")g.capturedPieces[color][effect.into]--;
 if(effect?.kind==="time-capsule-copy")g.effects.timeCapsule={color,origin:effect.from,piece:effect.piece,stage:"return",square:effect.to};
 g.moveCount=(g.moveCount||0)+1;
 // Successful turn-consuming escapes clear the previous timer. A new clock
 // starts only for a fresh mating threat; bonus cards cannot reset the clock.
 g.rescue=null;
 startRescue(g);
 // Exactly one extra opportunity: on the eligible player's turn after one
 // opponent reply, not repeatedly. Both colors may have different windows.
 g.epWindows||={w:null,b:null};
 for(const c of ["w","b"])if(g.epWindows[c]&&(g.moveCount>g.epWindows[c].readyAt||next.b[idx(g.epWindows[c].victim)]!==(c==="w"?"p":"P")))g.epWindows[c]=null;
 // Change who controls each side after 20 turn-consuming actions. Pieces and
 // their active effects keep their colors; unused cards stay with each player.
 // Do not steal the defender's remaining rescue seconds with a scheduled
 // color swap. If a rescue starts on the twentieth move, swap only after a
 // successful escape. A timed-out mate never changes ownership.
 if(g.moveCount%20===0&&g.rescue)g.pendingColorSwap=true;
 if((g.moveCount%20===0||g.pendingColorSwap)&&!g.rescue&&!status(g).done){
  [g.players.w,g.players.b]=[g.players.b,g.players.w];
  [g.hands.w,g.hands.b]=[g.hands.b,g.hands.w];
  g.swaps=(g.swaps||0)+1;
  g.pendingColorSwap=false;
  g.log.push({side:"system",text:"COLOR SWAP — both players now control the opposite pieces"});
 }
 if(g.log.length>150)g.log=g.log.slice(-100);
}
function pass(s){return {...s,b:s.b.slice(),t:-s.t,ep:-1,half:s.half+1,full:s.full+(s.t===-1?1:0)};}
function patch(s,{remove=[],place=[],resetHalf=false},snipers=null){
 const nx=clone(s);
 for(const k of remove)nx.b[idx(k)]=".";
 for(const [k,p] of place)nx.b[idx(k)]=p;
 nx.t=-s.t;nx.ep=-1;nx.half=resetHalf?0:s.half+1;nx.full=s.full+(s.t===-1?1:0);
 for(const k of remove){const i=idx(k);nx.c=updateRights({...nx,c:nx.c},i,i,s.b[i],".");}
 if(inCheck(nx,s.t,snipers))throw Error("Your king would be in check");
 return nx;
}
// Original chess starting squares for the target's piece type, by target color.
function originalSquares(piece){
 const rank=side(piece)===1?"1":"8",pawnRank=side(piece)===1?"2":"7";
 return ({p:[..."abcdefgh"].map(f=>f+pawnRank),r:["a"+rank,"h"+rank],n:["b"+rank,"g"+rank],b:["c"+rank,"f"+rank],q:["d"+rank],k:[]})[piece.toLowerCase()]||[];
}
function relocationChoices(g){
 const s=g.s,out=[];
 if(g.effects.ceasefire>0)return out;
 for(const m of available(g)){
  const from=sq(m[0]),to=sq(m[1]),piece=s.b[m[1]];
  if(piece==="."||piece.toLowerCase()==="k"||m[3]==="ep"||m[2])continue;
  // Do not leak an enemy disguise's true type through the relocation home
  // squares; neither hidden identities nor Identity Theft can be probed.
  if(Object.values(g.classified||{}).some(mark=>mark&&mark.color!==current(s)&&idx(mark.square)===m[1]))continue;
  if(g.identityTheft&&g.identityTheft.color!==current(s)&&[g.identityTheft.a,g.identityTheft.b].some(k=>idx(k)===m[1]))continue;
  const homes=originalSquares(piece).filter(h=>s.b[idx(h)]===".").filter(h=>{
   try{patch(s,{remove:[to],place:[[h,piece]]},g.snipers);return true;}catch{return false;}
  });
  if(homes.length)out.push({from,to,homes});
 }
 return out;
}

// En-passant history remains server-side; ordinary FEN en passant expires on
// the very next move. This card adds exactly one later legal opportunity.
function delayedEpMoves(g,color){
 const w=g.epWindows?.[color],s=g.s;
 if(!w||current(s)!==color||g.moveCount!==w.readyAt)return [];
 if(s.b[idx(w.victim)]!==(color==="w"?"p":"P")||s.b[idx(w.target)]!==".")return [];
 return legal({...s,ep:idx(w.target)},g.snipers).filter(m=>m[3]==="ep"&&sq(m[1])===w.target);
}
function promotionRecallChoices(g){
 const s=g.s,color=current(s),pool=g.capturedPieces?.[color]||{},options=[];
 for(const m of available(g)){
  if(!m[2]||s.b[m[0]].toLowerCase()!=="p")continue;
  const from=sq(m[0]),to=sq(m[1]);
  const homes=[];
  for(const type of ["n","b","r"]){
   if(!(pool[type]>0))continue;
   const piece=color==="w"?type.toUpperCase():type;
   for(const home of originalSquares(piece)){
    if(home===to||s.b[idx(home)]!==".")continue;
    // Validate the complete alternative result, not a normal promoted piece.
    const nx=apply(s,m);nx.b[m[1]]=".";nx.b[idx(home)]=piece;
    if(!inCheck(nx,s.t,g.snipers))homes.push({into:type,home});
   }
  }
  if(homes.length)options.push({from,to,options:homes});
 }
 return options;
}
function capsuleReturn(g,color){
 const cap=g.effects.timeCapsule,s=g.s;
 if(!cap||cap.color!==color||cap.stage!=="return"||current(s)!==color)return null;
 if(s.b[cap.square]!==cap.piece||s.b[idx(cap.origin)]!==".")return null;
 if(g.effects.freeze?.color===color&&g.effects.freeze.square===cap.square)return null;
 if(g.effects.reserved?.color===color&&g.effects.reserved.square===idx(cap.origin))return null;
 try{
  patch(s,{remove:[sq(cap.square)],place:[[cap.origin,cap.piece]]},g.snipers);
  return {from:sq(cap.square),to:cap.origin};
 }catch{return null;}
}

function pair(req){if(!isSquare(req.from)||!isSquare(req.to))throw Error("Choose valid squares");}
const directions={NE:-15,NW:-17,SE:17,SW:15};
function sniperPosition(from,direction){const start=idx(from),delta=directions[direction];if(!delta)throw Error("Choose a valid diagonal");let edge=start;while(on(edge+delta))edge+=delta;return {origin:from,direction,edge,step:-delta};}
function jump(a,b){const dx=Math.abs((idx(a)&7)-(idx(b)&7)),dy=Math.abs((idx(a)>>4)-(idx(b)>>4));return dx===2&&dy===1||dx===1&&dy===2;}
// Geometry for a capture against a friendly piece. The ordinary move generator
// correctly rejects friendly targets, so verify movement here and validate the
// resulting board with patch() for all king/check/castling constraints.
function friendlyCaptureShape(s,a,b){
 const p=s.b[a].toLowerCase(),dx=(b&7)-(a&7),dy=(b>>4)-(a>>4);
 const ax=Math.abs(dx),ay=Math.abs(dy);
 if(p==="p")return ax===1&&dy===-s.t;
 if(p==="n")return ax===1&&ay===2||ax===2&&ay===1;
 if(p==="k")return Math.max(ax,ay)===1;
 if(p==="b"&&ax!==ay||p==="r"&&(dx!==0&&dy!==0)||p==="q"&&!(ax===ay||dx===0||dy===0))return false;
 if(!["b","r","q"].includes(p)||ax+ay===0)return false;
 const dirX=Math.sign(dx),dirY=Math.sign(dy);
 for(let x=(a&7)+dirX,y=(a>>4)+dirY;x!==(b&7)||y!==(b>>4);x+=dirX,y+=dirY){
  if(s.b[y*16+x]!==".")return false;
 }
 return true;
}
function rememberCard(g,color,id){
 if(id==="objection"||id==="counterfeit")return;
 g.copyOffers||={w:null,b:null};
 g.copyOffers[color==="w"?"b":"w"]={id};
}
export function act(g,color,req,options={}){
 if(!req||typeof req!=="object")throw Error("Invalid action");
 if(g.pendingReaction){
  const pending=g.pendingReaction;
  if(req.type!=="reaction"||color!==pending.defender)throw Error("Waiting for the opponent to answer Objection!");
  if(req.decision==="object"){
   owned(g,color,"objection").used=true;
   resumeRescue(g);
   g.pendingReaction=null;
   g.cardBlocked={color:pending.actor};
   g.log.push({side:color,text:"Objection! canceled "+getCard(pending.card).name+" — opposing card retained; normal move required"});
   return;
  }
  if(req.decision!=="allow")throw Error("Choose whether to object or allow this card");
  g.pendingReaction=null;
  resumeRescue(g);
  act(g,pending.actor,pending.action,{skipReaction:true});
  return;
 }
 requireTurn(g,color);
 if(g.cardBlocked?.color===color&&req.type!=="move")throw Error("Objection! requires a normal chess move");
 if(req.type==="card"&&req.card==="objection")throw Error("Objection! can only be used to react to an opposing card");
 if(req.type==="card"&&!options.skipReaction){
  const other=color==="w"?"b":"w";
  if(g.hands[other].some(c=>c.id==="objection"&&!c.used)){
   // Validate on a clone; directions/secret options never go to the defender.
   const simulated=structuredClone(g);
   act(simulated,color,req,{skipReaction:true});
   g.pendingReaction={actor:color,defender:other,card:req.card,action:structuredClone(req)};
   pauseRescue(g); // Opponent's reaction decision does not drain the clock.
   return;
  }
 }
 const s=g.s;g.snipers ||= {w:null,b:null};
 if(req.type==="time-capsule-return"){
  const cap=capsuleReturn(g,color);
  if(!cap)throw Error("Time Capsule return is no longer legal");
  const piece=s.b[idx(cap.from)];
  const next=patch(s,{remove:[cap.from],place:[[cap.to,piece]]},g.snipers);
  commit(g,color,next,"Time Capsule return: "+cap.from+" → "+cap.to,{color,from:idx(cap.from),to:idx(cap.to),square:idx(cap.to),piece});
  return;
 }
 if(g.effects.timeCapsule?.color===color&&g.effects.timeCapsule.stage==="armed"&&req.type!=="move")throw Error("Time Capsule requires moving its marked piece first");
 if(g.effects.classifiedArmed?.color===color&&req.type!=="move")throw Error("Classified Promotion requires your pawn promotion now");
 if(req.type==="sniper-shot"){
  if(!isSquare(req.to)||!sniperShots(g,color).includes(req.to))throw Error("That piece is not the first available sniper target");
  // A public, server-authored cinematic event is created ONLY after a
  // successful capture. Both players receive identical, ordered events.
  // The first shot publicly reveals the off-board sniper's diagonal; the
  // second shot teleports the bishop without replaying the rifle cinematic.
  const sniper=g.snipers[color],victim=s.b[idx(req.to)];
  const {next,nextSnipers,landing}=sniperResult(g,color,req.to);
  if(landing)g.snipers=nextSnipers;
  else {g.snipers[color].shots=1;g.snipers[color].revealed=true;}
  commit(g,color,next,landing?"Bishop Sniper second shot: "+req.to+" — bishop lands on target":"Bishop Sniper first shot: "+req.to+" — diagonal revealed",
   landing?{color,from:null,to:idx(req.to),square:idx(req.to),piece:color==="w"?"B":"b"}:null);
  g.cinematics||=[];
  g.cinematics.push({
   id:g.moveCount,
   kind:landing?"sniper-teleport":"sniper-first-shot",
   attacker:color,origin:sniper.origin,direction:sniper.direction,
   target:req.to,victim
  });
  if(g.cinematics.length>12)g.cinematics=g.cinematics.slice(-8);
  return;
 }
 if(req.type==="move"){
  pair(req);
  const promotion=req.promotion||"";
  const m=available(g).find(m=>sq(m[0])===req.from&&sq(m[1])===req.to&&m[2]===promotion);
  if(!m)throw Error("Illegal chess move");
  const nx=apply(s,m);
  const isClassified=!!promotion&&g.effects.classifiedArmed?.color===color;
  if(g.effects.classifiedArmed?.color===color&&!promotion)throw Error("Classified Promotion must promote this turn");
  const effect=promotion?{promoted:color,...(isClassified?{classified:{square:req.to,piece:nx.b[m[1]]}}:{})}:null;
  commit(g,color,nx,req.from+" → "+req.to+(isClassified?" · Classified Promotion":promotion?" = "+promotion.toUpperCase():""),
   {color,from:m[0],to:m[1],square:m[1],piece:nx.b[m[1]]},effect);
  if(s.b[m[0]].toLowerCase()==="p"&&Math.abs(m[1]-m[0])===32){
   g.epWindows||={w:null,b:null};
   g.epWindows[color==="w"?"b":"w"]={target:sq((m[0]+m[1])/2),victim:req.to,readyAt:g.moveCount+2};
  }
  return;
 }
 if(req.type!=="card")throw Error("Unknown action");
 const copying=req.card==="counterfeit",offer=copying?g.copyOffers?.[color]:null;
 if(copying&&(!offer||["counterfeit","objection"].includes(offer.id)))throw Error("Counterfeit has no eligible card to copy this turn");
 const card=getCard(copying?offer.id:req.card);if(!card)throw Error("Unknown card");
 if(card.id==="the-analyst")throw Error("The Analyst is passive and analyzes turns automatically");
 const token=owned(g,color,req.card);
 const bonus=(description)=>{
  token.used=true;
  if(copying){
   commit(g,color,pass(s),"Counterfeit copied "+card.name+" · "+description);
   if(card.id==="pawn-strike")g.effects.pawnStrike=2;
   if(card.id==="ceasefire")g.effects.ceasefire=2;
  }else{
   g.log.push({side:color,text:description});
   rememberCard(g,color,card.id);
  }
 };
 const own=p=>side(p)===s.t;
 let nx,label,last=null,effect=null;
 if(["pawn-sidestep","pawn-ram","friendly-fire","colorblind-bishop","knight-exchange","double-ko","hit-and-run"].includes(card.id))pair(req);
 if(card.id==="pawn-sidestep"){
  const a=idx(req.from),b=idx(req.to),p=s.b[a];
  if(p.toLowerCase()!=="p"||!own(p)||s.b[b]!=="."||(a>>4)!==(b>>4)||Math.abs((a&7)-(b&7))!==1)throw Error("Choose a pawn and an empty neighboring file");
  nx=patch(s,{remove:[req.from],place:[[req.to,p]],resetHalf:true},g.snipers);label="Pawn Sidestep: "+req.from+" → "+req.to;last={color,from:a,to:b};
 }else if(card.id==="pawn-ram"){
  const a=idx(req.from),b=idx(req.to),p=s.b[a],enemy=s.b[b],rear=b-16*s.t;
  if(!own(p)||p.toLowerCase()!=="p"||b!==a-16*s.t||enemy.toLowerCase()!=="p"||side(enemy)!==-s.t||!on(rear)||s.b[rear]!==".")throw Error("Pawn Ram needs two opposing pawns face-to-face with one empty square behind the enemy pawn");
  nx=patch(s,{remove:[req.to],place:[[sq(rear),enemy]],resetHalf:true},g.snipers);
  label="Pawn Ram: "+req.to+" → "+sq(rear);last=null;
 }else if(card.id==="identity-theft"){
  pair(req);
  const p=s.b[idx(req.from)],q=s.b[idx(req.to)];
  if(req.from===req.to||!own(p)||!own(q)||p.toLowerCase()==="k"||q.toLowerCase()==="k")throw Error("Choose two different friendly non-king pieces");
  nx=patch(s,{},g.snipers);
  g.identityTheft={color,a:req.from,b:req.to,pieceA:p,pieceB:q};
  label="Identity Theft: two allied pieces now look swapped to the opponent";
 }else if(card.id==="friendly-fire"){
  if(g.effects.ceasefire>0)throw Error("Ceasefire prevents captures, including Friendly Fire");
  const a=idx(req.from),b=idx(req.to),piece=s.b[a],target=s.b[b];
  if(!own(piece)||!own(target)||target.toLowerCase()==="k"||!friendlyCaptureShape(s,a,b))throw Error("Choose your attacking piece and a friendly non-king target in its normal capture path");
  nx=patch(s,{remove:[req.from,req.to],place:[[req.to,piece]],resetHalf:true},g.snipers);
  label="Friendly Fire: "+req.from+" x "+req.to;last={color,from:a,to:b,square:b,piece};
 }else if(card.id==="colorblind-bishop"){
  const a=idx(req.from),b=idx(req.to),p=s.b[a];
  if(p.toLowerCase()!=="b"||!own(p)||s.b[b]!=="."||Math.abs((a&7)-(b&7))+Math.abs((a>>4)-(b>>4))!==1)throw Error("Choose your bishop and one orthogonally adjacent empty square");
  nx=patch(s,{remove:[req.from],place:[[req.to,p]]},g.snipers);label="Colorblind Bishop: "+req.from+" → "+req.to;last={color,from:a,to:b};
 }else if(card.id==="knight-exchange"){
  const a=idx(req.from),b=idx(req.to);
  if(s.b[a].toLowerCase()!=="n"||!own(s.b[a])||s.b[b].toLowerCase()!=="p"||!own(s.b[b])||!jump(req.from,req.to))throw Error("Choose a friendly knight and pawn exactly one knight jump away");
  nx=patch(s,{remove:[req.from,req.to],place:[[req.to,s.b[a]],[req.from,s.b[b]]],resetHalf:true},g.snipers);label="Knight Exchange: "+req.from+" ↔ "+req.to;last={color,from:a,to:b};
 }else if(card.id==="double-ko"||card.id==="hit-and-run"){
  const a=idx(req.from),b=idx(req.to),p=s.b[a];
  const m=available(g).find(m=>m[0]===a&&m[1]===b&&!m[2]&&(s.b[b]!=="."||m[3]==="ep"));
  if(!m)throw Error("Choose a normal legal capture");
  if(card.id==="hit-and-run"&&p.toLowerCase()!=="n")throw Error("Hit and Run requires a knight");
  if(card.id==="double-ko"&&p.toLowerCase()==="k")throw Error("The king cannot use Double KO");
  const ep=m[3]==="ep"?[sq(b+16*s.t)]:[];
  nx=patch(s,{remove:card.id==="double-ko"?[req.from,req.to,...ep]:[req.to,...ep],resetHalf:true},g.snipers);
  label=card.name+": "+req.from+" x "+req.to;last={color,from:a,to:card.id==="hit-and-run"?a:b};
 }else if(card.id==="queens-abdication"){
  if(!isSquare(req.from)||!["b","n"].includes(req.into))throw Error("Select your queen and a new piece");
  const a=idx(req.from),p=s.b[a];
  if(p.toLowerCase()!=="q"||!own(p))throw Error("Select your queen");
  const transformed=s.t===1?req.into.toUpperCase():req.into;
  nx=patch(s,{remove:[req.from],place:[[req.from,transformed]]},g.snipers);label="Queen's Abdication: "+req.from+" → "+req.into.toUpperCase();last={color,from:a,to:a};
 }else if(card.id==="voluntary-eviction"){
  if(!isSquare(req.from)||!own(s.b[idx(req.from)])||s.b[idx(req.from)].toLowerCase()==="k")throw Error("Choose your own non-king piece");
  nx=patch(s,{remove:[req.from],resetHalf:true},g.snipers);label="Voluntary Eviction: "+req.from;
 }else if(card.id==="bishop-sniper"){
  if(!isSquare(req.from)||s.b[idx(req.from)].toLowerCase()!=="b"||!own(s.b[idx(req.from)]))throw Error("Choose one of your bishops");
  if(g.snipers[color])throw Error("You already have an off-board Bishop Sniper");
  const sniper=sniperPosition(req.from,req.direction);
  nx=patch(s,{remove:[req.from]},g.snipers);
  g.snipers[color]={...sniper,shots:0,revealed:false};
  label="Bishop Sniper deployed";last=null;
 }else if(card.id==="insurance-fraud"){
  if(!isSquare(req.from))throw Error("Choose a valid square");
  const a=idx(req.from),p=s.b[a];
  if(!own(p)||p.toLowerCase()==="k")throw Error("Choose a friendly non-king piece to insure");
  if(g.effects.insurance?.[color])throw Error("You already have an insured piece");
  nx=patch(s,{},g.snipers);
  effect={kind:"insurance",square:a,piece:p};
  label="Insurance Fraud: "+req.from+" is insured for two enemy turns";
 }else if(card.id==="prisoner-exchange"){
  if((g.capturedPawns?.w||0)<1||(g.capturedPawns?.b||0)<1)throw Error("Both colors must have lost a pawn");
  const white=[..."abcdefgh"].map(f=>f+"2").find(h=>s.b[idx(h)]==="."),
        black=[..."abcdefgh"].map(f=>f+"7").find(h=>s.b[idx(h)]===".");
  if(!white||!black)throw Error("Both colors need an empty original pawn square");
  nx=patch(s,{place:[[white,"P"],[black,"p"]],resetHalf:true},g.snipers);
  effect={kind:"prisoner-exchange"};
  label="Prisoner Exchange: revived White "+white+" and Black "+black;
 }else if(card.id==="relocation-order"){
  pair(req);
  if(!isSquare(req.dest))throw Error("Choose an original starting square");
  const choice=relocationChoices(g).find(m=>m.from===req.from&&m.to===req.to);
  if(!choice||!choice.homes.includes(req.dest))throw Error("Choose a legal capture target and an empty original starting square");
  const target=s.b[idx(req.to)];
  nx=patch(s,{remove:[req.to],place:[[req.dest,target]]},g.snipers);
  label="Relocation Order: "+req.to+" → "+req.dest;
 }else if(card.id==="delayed-en-passant"){
  const candidates=delayedEpMoves(g,color);
  if(!candidates.length)throw Error("No delayed en passant capture is available");
  if(copying){
   pair(req);
   const m=candidates.find(m=>sq(m[0])===req.from&&sq(m[1])===req.to);
   if(!m)throw Error("Choose an eligible delayed en passant capture");
   nx=apply({...s,ep:m[1]},m);
   label="Counterfeit: delayed en passant "+req.from+" x "+req.to;
   last={color,from:m[0],to:m[1],square:m[1],piece:nx.b[m[1]]};
  }else{
   g.effects.delayedEp={color};
   bonus("Delayed En Passant — one extra capture opportunity this turn");return;
  }
 }else if(card.id==="time-capsule"){
  if(!isSquare(req.from)||!own(s.b[idx(req.from)])||s.b[idx(req.from)].toLowerCase()==="k")throw Error("Choose your own non-king piece for Time Capsule");
  if(g.effects.timeCapsule)throw Error("A Time Capsule is already active");
  if(!available(g).some(m=>sq(m[0])===req.from&&!m[2]))throw Error("Marked piece has no legal non-promotion move");
  if(copying){
   pair(req);
   const m=available(g).find(m=>sq(m[0])===req.from&&sq(m[1])===req.to&&!m[2]);
   if(!m)throw Error("Choose a legal move for the copied Time Capsule piece");
   nx=apply(s,m);
   effect={kind:"time-capsule-copy",from:req.from,to:m[1],piece:nx.b[m[1]]};
   label="Counterfeit copied Time Capsule: "+req.from+" → "+req.to;
   last={color,from:m[0],to:m[1],square:m[1],piece:nx.b[m[1]]};
  }else{
   g.effects.timeCapsule={color,origin:req.from,piece:s.b[idx(req.from)],stage:"armed",square:null};
   bonus("Time Capsule armed at "+req.from+" — move this piece now");return;
  }
 }else if(card.id==="promotion-recall"){
  pair(req);
  if(!["n","b","r"].includes(req.into)||!isSquare(req.home))throw Error("Choose a captured piece and an empty home square");
  const choice=promotionRecallChoices(g).find(c=>c.from===req.from&&c.to===req.to);
  if(!choice?.options.some(o=>o.into===req.into&&o.home===req.home))throw Error("Promotion Recall requires a legal promotion and a captured piece's empty original square");
  const m=available(g).find(m=>sq(m[0])===req.from&&sq(m[1])===req.to&&m[2]==="q");
  if(!m)throw Error("A pawn must reach its promotion rank");
  nx=apply(s,m);
  nx.b[m[1]]=".";
  nx.b[idx(req.home)]=color==="w"?req.into.toUpperCase():req.into;
  if(inCheck(nx,s.t,g.snipers))throw Error("Your king would be in check");
  nx.half=0;
  label="Promotion Recall: "+req.from+" → "+req.to+" · "+req.into.toUpperCase()+" revived at "+req.home;
  last={color,from:m[0],to:m[1],square:m[1],piece:"."};
  effect={kind:"promotion-recall",promoted:color,into:req.into};
 }else if(card.id==="classified-promotion"){
  if(g.effects.classifiedArmed)throw Error("Classified Promotion is already armed");
  if(!available(g).some(m=>m[2]&&s.b[m[0]].toLowerCase()==="p"))throw Error("No legal pawn promotion is available");
  if(copying){
   pair(req);
   const m=available(g).find(m=>sq(m[0])===req.from&&sq(m[1])===req.to&&m[2]===req.promotion);
   if(!m||!m[2])throw Error("Choose a legal classified pawn promotion");
   nx=apply(s,m);
   effect={promoted:color,classified:{square:req.to,piece:nx.b[m[1]]}};
   last={color,from:m[0],to:m[1],square:m[1],piece:nx.b[m[1]]};
   label="Counterfeit copied Classified Promotion: "+req.from+" → "+req.to+" · hidden";
  }else{
   g.effects.classifiedArmed={color};
   bonus("Classified Promotion armed — promoted identity will remain secret");return;
  }
 }else if(card.id==="pawn-strike"){
  if(g.effects.pawnStrike>0&&!copying)throw Error("Pawn Strike is already active");
  g.effects.pawnStrike=2;
  bonus("Pawn Strike — both sides' pawns cannot advance for one round · bonus action");return;
 }else if(card.id==="parking-ticket"){
  if(!g.last||g.last.color===color||!on(g.last.to)||side(s.b[g.last.to])!==-s.t)throw Error("No eligible enemy last-moved piece");
  g.effects.freeze={color:color==="w"?"b":"w",square:g.last.to};
  bonus("Parking Ticket: "+sq(g.last.to)+" · bonus action");return;
 }else if(card.id==="reserved-parking"){
  if(!isSquare(req.to)||s.b[idx(req.to)]!==".")throw Error("Choose an empty square");
  g.effects.reserved={color:color==="w"?"b":"w",square:idx(req.to)};
  bonus("Reserved Parking: "+req.to+" · bonus action");return;
 }else if(card.id==="ceasefire"){
  if(inCheck(s,s.t,g.snipers))throw Error("Cannot use Ceasefire while in check");
  g.effects.ceasefire=2;
  bonus("Ceasefire · bonus action");return;
 }else if(card.id==="black-market"){
  if(inCheck(s))throw Error("Cannot skip a turn in check");
  if(!Number.isInteger(req.slot)||req.slot<0||req.slot>=3)throw Error("Choose another card slot");
  const selected=g.hands[color][req.slot];if(!selected||selected.used||selected.id==="black-market")throw Error("Choose another unused card");
  const pool=CARDS.filter(c=>c.rarity===getCard(selected.id).rarity&&c.id!==selected.id&&!g.hands[color].some(h=>h.id===c.id));
  if(!pool.length)throw Error("No card of the same rarity available to swap");
  const replacement=pool[rand(pool.length)].id;
  nx=pass(s);token.used=true;selected.id=replacement;
  commit(g,color,nx,"Black Market → "+getCard(replacement).name);if(!copying)rememberCard(g,color,card.id);return;
 }else throw Error("Not implemented");
 token.used=true;commit(g,color,nx,label,last,effect);if(!copying)rememberCard(g,color,card.id);
}
