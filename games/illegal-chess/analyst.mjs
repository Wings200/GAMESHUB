// Illegal Chess: fast, deterministic, server-only, card-aware heuristic move estimator.
// This is NOT Stockfish, a solved search, or a promise of objectively best play.
// It compares the completed move to available ordinary moves and off-board sniper
// shots, while weighing cards, current modifiers, king safety and the color swap.
import {apply,legal,inCheck,side,on,idx,sq} from "./engine.mjs";

const values={p:100,n:320,b:340,r:510,q:940,k:0};
const cardValues={Common:10,Uncommon:18,Rare:25,Epic:38,Legendary:48};
const nextColor=c=>c==="w"?"b":"w";
export const ANALYST_GRADES=["Book","Best","Excellent","Good","Inaccuracy","Mistake","Blunder","Brilliant"];
export const analystActive=g=>["w","b"].some(c=>g.hands?.[c]?.some(card=>card.id==="the-analyst"&&!card.used));

// Use a conservative positional heuristic: material, center, king safety,
// pieces participating, and pawn advancement. Not a chess-engine eval.
function evaluate(g,s,pov,snipers=g.snipers){
 let score=0;
 for(let i=0;i<128;i++){
  if(!on(i))continue;
  const p=s.b[i];if(!p||p===".")continue;
  const sign=side(p)===(pov==="w"?1:-1)?1:-1,type=p.toLowerCase();
  const rank=8-(i>>4),file=i&7;
  const center=Math.max(0,5-(Math.abs(file-3.5)+Math.abs(rank-4.5))*.85);
  let bonus=type==="n"||type==="b"?center*5:type==="p"?center*1.8+((p==="P"?rank-2:7-rank)*2.4):type==="q"?center*1.1:0;
  if(type==="k"&&s.full<16)bonus-=center*2;
  score+=sign*(values[type]+bonus);
 }
 // Virtual off-board bishop is not represented in the board's FEN.
 for(const c of ["w","b"])if(snipers?.[c]){
  const sign=c===pov?1:-1;
  score+=sign*(335+(snipers[c].shots?25:0));
  const shooter=snipers[c],ray=[];for(let p=shooter.edge;on(p);p+=shooter.step){
   if(s.b[p]!=="."){ray.push(s.b[p]);break;}
  }
  if(ray.length&&side(ray[0])===(c==="w"?-1:1))score+=sign*Math.min(100,values[ray[0].toLowerCase()]*.15);
 }
 if(inCheck(s,pov==="w"?1:-1,snipers))score-=75;
 if(inCheck(s,pov==="w"?-1:1,snipers))score+=75;
 for(const c of ["w","b"]){
  const sign=c===pov?1:-1,hand=g.hands?.[c]||[];
  for(const h of hand)if(!h.used&&h.id!=="the-analyst"){
   const rarity=g.analystRarities?.[h.id]||"Uncommon";
   score+=sign*(cardValues[rarity]||18);
  }
  if(g.effects?.insurance?.[c])score+=sign*35;
  if(g.effects?.timeCapsule?.color===c)score+=sign*24;
  if(g.effects?.freeze?.color===c)score-=sign*40;
  if(g.effects?.reserved?.color===c)score-=sign*20;
  if(g.copyOffers?.[c]&&hand.some(h=>h.id==="counterfeit"&&!h.used))score+=sign*35;
 }
 const strike=g.effects?.pawnStrike||0;
 if(strike&&s.t===(pov==="w"?1:-1))score-=12*strike;
 return score;
}
function isMate(s,snipers){
 // Only check mate after a move gives check; avoid expensive generation otherwise.
 return inCheck(s,s.t,snipers)&&legal(s,snipers).length===0;
}
function scoreOutcome(g,s,color,snipers=g.snipers){
 const willSwap=(g.moveCount||0)%20===19;
 const mate=isMate(s,snipers);
 const humanColor=willSwap&&!mate?nextColor(color):color;
 return mate?(s.t===(color==="w"?-1:1)?40000:-40000):evaluate(g,s,humanColor,snipers);
}
// Minimax-lite: penalize the worst *immediate legal board reply*. Bounded,
// not a full variation search and intentionally avoids hidden card disclosure.
function responseScore(g,s,color,snipers){
 const base=scoreOutcome(g,s,color,snipers);
 if(isMate(s,snipers))return base;
 const replies=legal(s,snipers);
 if(!replies.length)return base;
 let worst=base;
 for(const m of replies){
  // Chess only here: card threats are reflected by resource/effect estimates.
  const n=apply(s,m);
  const reply=scoreOutcome(g,n,color,snipers);
  if(reply<worst)worst=reply;
 }
 return base*.68+worst*.32;
}
export function classifyAnalyst({gap,book=false,brilliant=false,mate=false}){
 if(mate)return "Best";
 if(book&&gap<=90)return "Book";
 if(brilliant&&gap<=50)return "Brilliant";
 if(gap<=14)return "Best";
 if(gap<=37)return "Excellent";
 if(gap<=80)return "Good";
 if(gap<=145)return "Inaccuracy";
 if(gap<=290)return "Mistake";
 return "Blunder";
}
const commonOpening=(g,last,label)=>{
 if((g.moveCount||0)>7||!last||!Number.isInteger(last.from)||!Number.isInteger(last.to))return false;
 if(label.includes(":")||Object.values(g.snipers||{}).some(Boolean)||g.effects?.ceasefire||g.effects?.pawnStrike)return false;
 const move=sq(last.from)+sq(last.to);
 return ["e2e4","d2d4","g1f3","c2c4","e7e5","e7e6","c7c5","g8f6","d7d5","g7g6","b8c6","f1c4","f8c5","b1c3"].includes(move);
};
function materialOf(s,color){
 let total=0;for(let i=0;i<128;i++){if(on(i)&&side(s.b[i])===(color==="w"?1:-1))total+=values[s.b[i].toLowerCase()];}
 return total;
}
const reasons={
 Book:"Familiar opening development; a reasonable first plan.",
 Best:"Among the strongest moves found by the local position estimate.",
 Excellent:"Very close to the top local alternative.",
 Good:"A useful move that keeps the position competitive.",
 Inaccuracy:"A stronger local alternative appears available.",
 Mistake:"This appears to give up meaningful positional or material value.",
 Blunder:"The estimate found a substantially better alternative.",
 Brilliant:"A promising material sacrifice with strong local compensation."
};
export function gradeAnalystTurn(g,color,next,label,last,{availableMoves=[],sniperTargets=[],cardRarities={}}={}){
 if(!analystActive(g))return null;
 // Do not send any hidden card/effect details in explanations or recommendations.
 const snapshot={...g,analystRarities:cardRarities};
 const options=[];
 for(const m of availableMoves){
  const s=apply(g.s,m);
  options.push(responseScore(snapshot,s,color,g.snipers));
 }
 const sniper=g.snipers?.[color];
 for(const target of sniperTargets){
  if(!sniper||typeof target!=="string")continue;
  const b=g.s.b.slice(),at=idx(target),landing=(sniper.shots||0)>=1;
  b[at]=landing?(color==="w"?"B":"b"):".";
  const sn=landing?{...g.snipers,[color]:null}:g.snipers;
  options.push(responseScore(snapshot,{...g.s,b,t:-g.s.t,ep:-1,half:0},color,sn));
 }
 const played=responseScore(snapshot,next,color,g.snipers);
 const best=options.length?Math.max(played,...options):played;
 const gap=Math.max(0,Math.round(best-played));
 const mate=isMate(next,g.snipers);
 const sac=materialOf(next,color)<materialOf(g.s,color)-270;
 const brilliant=sac&&!mate&&played>=best-50&&played>evaluate(snapshot,g.s,color,g.snipers)+20;
 const book=commonOpening(g,last,label);
 const grade=classifyAnalyst({gap,book,brilliant,mate});
 return {side:color,turn:(g.moveCount||0)+1,move:label,grade,reason:mate?"Checkmate ends the match.":reasons[grade],estimated:true};
}
