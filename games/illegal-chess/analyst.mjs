// Authoritative, privacy-safe Stockfish review input for Illegal Chess.
// The browser runs real Stockfish 19 lite via a same-origin engine worker.
// The multiplayer server never invents a "Best" grade and never sends
// hidden piece identities or active sniper directions as analysis FENs.
import {legal,apply,fen,sq,on,side} from "./engine.mjs";

export const ANALYST_GRADES=["Book","Best","Excellent","Good","Inaccuracy","Mistake","Blunder","Brilliant"];
export const ANALYST_SYMBOLS={Book:"▤",Best:"★",Excellent:"👍",Good:"✓",Inaccuracy:"?!",Mistake:"?",Blunder:"??",Brilliant:"!!",Great:"!",MissedWin:"✕",Custom:"✦"};
export const analystActive=g=>["w","b"].some(c=>g.hands?.[c]?.some(card=>card.id==="the-analyst"&&!card.used));

function stockfishSafe(g){
 if(Object.values(g.snipers||{}).some(Boolean))return false;
 if(g.identityTheft)return false;
 if(Object.values(g.classified||{}).some(Boolean))return false;
 const e=g.effects||{};
 if(e.freeze||e.reserved||e.ceasefire||e.pawnStrike||e.timeCapsule||e.delayedEp||e.classifiedArmed)return false;
 if(Object.values(e.insurance||{}).some(Boolean))return false;
 return true;
}
export function gradeAnalystTurn(g,color,next,label,last){
 if(!analystActive(g))return null;
 const piece=Number.isInteger(last?.to)&&on(last.to)?next.b[last.to]:".";
 const square=piece!=="."&&side(piece)===(color==="w"?1:-1)?sq(last.to):null;
 const common={side:color,turn:(g.moveCount||0)+1,move:label,square,estimated:false};
 const custom={...common,status:"custom",grade:"Custom Rule",symbol:ANALYST_SYMBOLS.Custom,
  reason:"Custom card rules or hidden pieces are active. Stockfish only evaluates standard chess moves.",square:null};
 if(!stockfishSafe(g)||!last||!Number.isInteger(last.from)||!Number.isInteger(last.to))return custom;
 // A card can alter the board using a legal-looking move. Only the literal
 // normal chess move route is eligible, and its resulting FEN must match
 // the standard move generator exactly (including castling, ep, promotion).
 if(!label.startsWith(sq(last.from)+" → "+sq(last.to)))return custom;
 const possible=legal(g.s).find(m=>{
  if(m[0]!==last.from||m[1]!==last.to)return false;
  try{return fen(apply(g.s,m))===fen(next);}catch{return false;}
 });
 if(!possible||!square)return custom;
 return {...common,status:"pending",grade:"Analyzing",symbol:null,
  reason:"Stockfish 19 is comparing this move with the engine's preferred move.",
  beforeFen:fen(g.s),uci:sq(possible[0])+sq(possible[1])+(possible[2]||"")};
}

// Retained for compatibility with historical tests/readers; actual ratings
// are now computed using Stockfish, not this threshold function.
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
