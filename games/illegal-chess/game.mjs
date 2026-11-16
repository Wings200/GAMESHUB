// Server-authoritative Illegal Chess rules for Cloudflare Pages / D1.
// Only implemented cards may be dealt: the larger approved design catalog is a roadmap.
import {parseFen,START_FEN,clone,on,side,sq,idx,isSquare,legal,apply,inCheck,updateRights,stateStatus,fen,sniperFront} from "./engine.mjs";

export const CARDS=[
 {id:"pawn-sidestep",name:"Pawn Sidestep",rarity:"Common",mode:"two",description:"Slide a pawn sideways one empty square. Uses your turn."},
 {id:"voluntary-eviction",name:"Voluntary Eviction",rarity:"Common",mode:"one",description:"Remove one of your non-king pieces to clear space. Uses your turn."},
 {id:"colorblind-bishop",name:"Colorblind Bishop",rarity:"Uncommon",mode:"two",description:"Step your bishop one empty orthogonal square, changing square color."},
 {id:"knight-exchange",name:"Knight Exchange",rarity:"Uncommon",mode:"two",description:"Swap your knight and pawn a knight-jump apart."},
 {id:"parking-ticket",name:"Parking Ticket",rarity:"Rare",mode:"instant",description:"Freeze the enemy's last-moved piece for one turn. Play a chess move afterward."},
 {id:"bishop-sniper",name:"Bishop Sniper",rarity:"Epic",mode:"sniper",description:"Send a bishop secretly off-board along a diagonal. Later, snipe inward through an unblocked ray."},
 {id:"reserved-parking",name:"Reserved Parking",rarity:"Rare",mode:"square",description:"Reserve one empty enemy landing square; then make your normal move."},
 {id:"ceasefire",name:"Ceasefire",rarity:"Rare",mode:"instant",description:"Declare no captures for your move and the opponent's reply."},
 {id:"double-ko",name:"Double KO",rarity:"Epic",mode:"two",description:"Capture, but both the attacking and captured pieces disappear."},
 {id:"hit-and-run",name:"Hit and Run",rarity:"Epic",mode:"two",description:"Make a legal knight capture without leaving the starting square."},
 {id:"queens-abdication",name:"Queen's Abdication",rarity:"Epic",mode:"transform",description:"Transform your queen into a knight or bishop in place."},
 {id:"black-market",name:"Black Market",rarity:"Legendary",mode:"market",description:"Exchange an unused card for another of the same rarity."}
];
const weights={Common:45,Uncommon:30,Rare:15,Epic:8,Legendary:2};
const rand=n=>{if(n<1)throw Error("Invalid random range");const a=new Uint32Array(1);const limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a)}while(a[0]>=limit);return a[0]%n};
const getCard=id=>CARDS.find(c=>c.id===id);
const current=s=>s.t===1?"w":"b";
function pickWeighted(pool){const tiers=Object.keys(weights).filter(t=>pool.some(c=>c.rarity===t));let n=rand(tiers.reduce((sum,t)=>sum+weights[t],0)),r=tiers[0];for(const t of tiers){n-=weights[t];if(n<0){r=t;break;}}const options=pool.filter(c=>c.rarity===r);return options[rand(options.length)];}
export function randomHand(){const pool=CARDS.slice(),hand=[];for(let i=0;i<3;i++){const card=pickWeighted(pool);hand.push({id:card.id,used:false});pool.splice(pool.indexOf(card),1);}return hand;}
export function newGame(room,whiteToken){const s=parseFen(START_FEN),snipers={w:null,b:null};s.sniperSignature=JSON.stringify(snipers);return {room,s,history:[s],snipers,players:{w:whiteToken,b:null},hands:{w:randomHand(),b:[]},effects:{freeze:null,reserved:null,ceasefire:0},last:null,log:[]};}
export function joinGame(g,blackToken){if(g.players.b)throw Error("Room is already full");g.players.b=blackToken;g.hands.b=randomHand();}
export const stateFen=g=>fen(g.s);
export function available(g){
 const s=g.s,col=current(s),ordinary=legal(s,g.snipers);
 const allowed=ordinary.filter(m=>{
  const capture=s.b[m[1]]!=="."||m[3]==="ep";
  if(g.effects.freeze?.color===col&&m[0]===g.effects.freeze.square)return false;
  if(g.effects.reserved?.color===col&&m[1]===g.effects.reserved.square)return false;
  if(g.effects.ceasefire>0&&capture)return false;
  return true;
 });
 // Temporary restrictions cannot artificially force stalemate/checkmate.
 return allowed.length||!ordinary.length?allowed:ordinary;
}
// A sniper shot is an alternative chess turn. An available shot can prevent stalemate.
export function sniperShots(g,color){
 const sniper=g.snipers?.[color],front=sniperFront(g.s,sniper);
 if(!front||side(front.piece)!==(color==="w"?-1:1)||front.piece.toLowerCase()==="k"||g.effects.ceasefire>0)return [];
 try{patch(g.s,{remove:[sq(front.square)],resetHalf:true},g.snipers);return [sq(front.square)];}
 catch{return [];} 
}
export function status(g){
 if(!g.players.b)return {done:false,text:"Waiting for opponent"};
 const moves=available(g),color=current(g.s),shots=sniperShots(g,color);
 return stateStatus(g.s,g.history,moves.length?moves:shots,g.snipers);
}
export function playerView(g,color){
 const s=g.s,st=status(g);
 return {room:g.room,player:color,ready:!!g.players.b,turn:current(s),fen:stateFen(g),status:st,
  hand:g.hands[color].map(c=>({...getCard(c.id),used:c.used})),
  opponent:g.hands[color==="w"?"b":"w"].map(c=>({...getCard(c.id),used:c.used})),
  effects:structuredClone(g.effects),last:g.last,log:g.log.slice(-40),
  sniper:{own:g.snipers?.[color]?{origin:g.snipers[color].origin,direction:g.snipers[color].direction}:null,opponentActive:!!g.snipers?.[color==="w"?"b":"w"]},
  sniperShots:st.done||current(s)!==color?[]:sniperShots(g,color),
  legal:st.done||current(s)!==color?[]:available(g).map(m=>({from:sq(m[0]),to:sq(m[1]),promotion:m[2]||"",capture:s.b[m[1]]!=="."||m[3]==="ep"}))};
}
function requireTurn(g,color){if(!g.players.b)throw Error("Wait for a second player");if(status(g).done)throw Error("Game is over");if(current(g.s)!==color)throw Error("Not your turn");}
function owned(g,color,id){const item=g.hands[color].find(x=>x.id===id&&!x.used);if(!item)throw Error("This card isn't available");return item;}
function tick(g,color){if(g.effects.freeze?.color===color)g.effects.freeze=null;if(g.effects.reserved?.color===color)g.effects.reserved=null;if(g.effects.ceasefire>0)g.effects.ceasefire--;}
function commit(g,color,next,label,last=null,effect=null){
 tick(g,color);next.sniperSignature=JSON.stringify(g.snipers||{w:null,b:null});g.s=next;g.history.push(next);g.last=last;g.log.push({side:color,text:label});
 if(effect?.kind==="freeze")g.effects.freeze={color:color==="w"?"b":"w",square:effect.square};
 if(effect?.kind==="reserved")g.effects.reserved={color:color==="w"?"b":"w",square:effect.square};
 if(effect?.kind==="ceasefire")g.effects.ceasefire=2;
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
function pair(req){if(!isSquare(req.from)||!isSquare(req.to))throw Error("Choose valid squares");}
const directions={NE:-15,NW:-17,SE:17,SW:15};
function sniperPosition(from,direction){const start=idx(from),delta=directions[direction];if(!delta)throw Error("Choose a valid diagonal");let edge=start;while(on(edge+delta))edge+=delta;return {origin:from,direction,edge,step:-delta};}
function jump(a,b){const dx=Math.abs((idx(a)&7)-(idx(b)&7)),dy=Math.abs((idx(a)>>4)-(idx(b)>>4));return dx===2&&dy===1||dx===1&&dy===2;}
export function act(g,color,req){
 requireTurn(g,color);if(!req||typeof req!=="object")throw Error("Invalid action");
 const s=g.s;g.snipers ||= {w:null,b:null};
 if(req.type==="sniper-shot"){
  if(!isSquare(req.to)||!sniperShots(g,color).includes(req.to))throw Error("That piece is not the first available sniper target");
  const next=patch(s,{remove:[req.to],resetHalf:true},g.snipers);
  commit(g,color,next,"Bishop Sniper shot: "+req.to,null);return;
 }
 if(req.type==="move"){
  pair(req);
  const promotion=req.promotion||"";
  const m=available(g).find(m=>sq(m[0])===req.from&&sq(m[1])===req.to&&m[2]===promotion);
  if(!m)throw Error("Illegal chess move");
  const nx=apply(s,m);
  commit(g,color,nx,req.from+" → "+req.to+(promotion?" = "+promotion.toUpperCase():""),{color,from:m[0],to:m[1],square:m[1],piece:nx.b[m[1]]});
  return;
 }
 if(req.type!=="card")throw Error("Unknown action");
 const card=getCard(req.card);if(!card)throw Error("Unknown card");
 const token=owned(g,color,card.id);
 const own=p=>side(p)===s.t;
 let nx,label,last=null,effect=null;
 if(["pawn-sidestep","colorblind-bishop","knight-exchange","double-ko","hit-and-run"].includes(card.id))pair(req);
 if(card.id==="pawn-sidestep"){
  const a=idx(req.from),b=idx(req.to),p=s.b[a];
  if(p.toLowerCase()!=="p"||!own(p)||s.b[b]!=="."||(a>>4)!==(b>>4)||Math.abs((a&7)-(b&7))!==1)throw Error("Choose a pawn and an empty neighboring file");
  nx=patch(s,{remove:[req.from],place:[[req.to,p]],resetHalf:true},g.snipers);label="Pawn Sidestep: "+req.from+" → "+req.to;last={color,from:a,to:b};
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
  g.snipers[color]=sniper;
  label="Bishop Sniper deployed";last=null;
 }else if(card.id==="parking-ticket"){
  if(!g.last||g.last.color===color||!on(g.last.to)||side(s.b[g.last.to])!==-s.t)throw Error("No eligible enemy last-moved piece");
  g.effects.freeze={color:color==="w"?"b":"w",square:g.last.to};
  token.used=true;g.log.push({side:color,text:"Parking Ticket: "+sq(g.last.to)+" · bonus action"});return;
 }else if(card.id==="reserved-parking"){
  if(!isSquare(req.to)||s.b[idx(req.to)]!==".")throw Error("Choose an empty square");
  g.effects.reserved={color:color==="w"?"b":"w",square:idx(req.to)};
  token.used=true;g.log.push({side:color,text:"Reserved Parking: "+req.to+" · bonus action"});return;
 }else if(card.id==="ceasefire"){
  if(inCheck(s,s.t,g.snipers))throw Error("Cannot use Ceasefire while in check");
  g.effects.ceasefire=2;
  token.used=true;g.log.push({side:color,text:"Ceasefire · bonus action"});return;
 }else if(card.id==="black-market"){
  if(inCheck(s))throw Error("Cannot skip a turn in check");
  if(!Number.isInteger(req.slot)||req.slot<0||req.slot>=3)throw Error("Choose another card slot");
  const selected=g.hands[color][req.slot];if(!selected||selected.used||selected.id==="black-market")throw Error("Choose another unused card");
  const pool=CARDS.filter(c=>c.rarity===getCard(selected.id).rarity&&c.id!==selected.id&&!g.hands[color].some(h=>h.id===c.id));
  if(!pool.length)throw Error("No card of the same rarity available to swap");
  const replacement=pool[rand(pool.length)].id;
  nx=pass(s);token.used=true;selected.id=replacement;
  commit(g,color,nx,"Black Market → "+getCard(replacement).name);return;
 }else throw Error("Not implemented");
 token.used=true;commit(g,color,nx,label,last,effect);
}
