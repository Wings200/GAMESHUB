import {cardImage} from "./art.mjs";

const $=id=>document.getElementById(id);
const glyph={K:"♔",Q:"♕",R:"♖",B:"♗",N:"♘",P:"♙",k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟︎"};
const tierColors={Common:"#adb9cc",Uncommon:"#71e0ae",Rare:"#8bafff",Epic:"#d4a4fa",Legendary:"#ffd382"};
let session=null,game=null,selected=null,selectedCard=null,cardFrom=null,sniperSelected=false,busy=false,poll=null,modalOpen=false,lastState="";
const invite=room=>location.origin+"/games/illegal-chess/?room="+encodeURIComponent(room);
const own=p=>p&&p!=="."&&((game?.player||session?.player)==="w"?p===p.toUpperCase():p===p.toLowerCase());
const myTurn=()=>game?.ready&&!game?.status?.done&&!game?.pendingReaction&&game?.turn===game?.player;
const toSquare=i=>"abcdefgh"[i&7]+(8-(i>>4));
function boardFromFen(fen){
 const out=[];for(const row of fen.split(" ")[0].split("/"))for(const char of row){
  if(/[1-8]/.test(char))out.push(...Array(Number(char)).fill("."));
  else out.push(char);
 }return out;
}
function flash(message){const bar=$("toast");bar.textContent=message;bar.hidden=false;clearTimeout(flash.timer);flash.timer=setTimeout(()=>bar.hidden=true,3200);}
function clearSelection(){selected=null;selectedCard=null;cardFrom=null;sniperSelected=false;}
async function api(method,payload){
 const response=await fetch("/api/illegal-chess/"+method,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload||{})});
 let json;try{json=await response.json();}catch{throw Error("The game server returned an unexpected response.");}
 if(!response.ok)throw Error(json.error||"The game server rejected this action.");
 return json;
}

// Every decision belongs to the GAMESHUB interface. Never use alert/prompt/confirm.
function modal({tag="CONFIRM ACTION",title,description,choices=[],link=""}){
 const shade=$("modalShade"),actions=$("modalActions"),linkField=$("modalLink");
 const focusBefore=document.activeElement;
 modalOpen=true;shade.hidden=false;$("modalTag").textContent=tag;$("modalTitle").textContent=title;
 $("modalBody").textContent=description||"";actions.replaceChildren();
 linkField.hidden=!link;
 if(link){linkField.value=link;queueMicrotask(()=>{linkField.focus();linkField.select();});}
 return new Promise(resolve=>{
  function close(value){
   if(!modalOpen)return;
   modalOpen=false;shade.hidden=true;shade.removeEventListener("click",outside);document.removeEventListener("keydown",escape);
   $("modalClose").onclick=null;focusBefore?.focus?.();resolve(value);
  }
  function outside(event){if(event.target===shade)close(null);}
  function escape(event){if(event.key==="Escape"){event.preventDefault();close(null);}}
  shade.addEventListener("click",outside);document.addEventListener("keydown",escape);
  $("modalClose").onclick=()=>close(null);
  for(const choice of choices){
   const button=document.createElement("button");button.type="button";
   button.className="btn "+(choice.kind||"ghost");button.textContent=choice.label;
   button.addEventListener("click",()=>{
    if(choice.value==="__copy"){
     linkField.focus();linkField.select();try{if(document.execCommand("copy"))flash("Invite link copied");else flash("Link selected — press Ctrl+C to copy.");}
     catch{flash("Link selected — press Ctrl+C to copy.");}
     return;
    }
    close(choice.value);
   });
   actions.append(button);
  }
  if(!link)queueMicrotask(()=>actions.querySelector("button")?.focus());
 });
}
function done(message){flash(message||"Card activated. You can still make your chess move.");}
async function send(action){
 if(busy||!session)return;
 const activeSession=session;
 busy=true;try{
  const result=await api("action",{...activeSession,action});
  if(session!==activeSession)return;
  game=result.view;lastState=JSON.stringify(game);clearSelection();render();
  if(myTurn()&&action.type==="card")done();
 }catch(error){flash(error.message);}
 finally{busy=false;void refresh();}
}
async function refresh(){
 if(!session||busy||modalOpen)return;
 const activeSession=session;
 try{
  const data=await api("state",activeSession);
  if(session!==activeSession)return;
  $("connection").textContent="CONNECTED";$("connection").classList.remove("offline");
  const serial=JSON.stringify(data);
  if(serial!==lastState){game=data;lastState=serial;render();}
 }catch(e){$("connection").textContent="RECONNECTING";$("connection").classList.add("offline");}
}
async function begin(s){
 session=s;sessionStorage.setItem("gameshub-illegal-chess",JSON.stringify(s));
 history.replaceState({}, "",invite(s.room));
 $("lobby").hidden=true;$("match").hidden=false;$("room").textContent=s.room;
 if(poll)clearInterval(poll);
 await refresh();poll=setInterval(refresh,1500);
}
function putImage(parent,card,alt){
 const img=document.createElement("img");img.src=cardImage(card.id,card.rarity);
 img.alt=alt;img.loading="lazy";parent.append(img);return img;
}
function renderLobby(){
 const art=$("lobbyArtwork");art.replaceChildren();
 for(const id of ["bishop-sniper","black-market"]){
  const card=id==="bishop-sniper"?{id,name:"BISHOP SNIPER",rarity:"Epic"}:{id,name:"BLACK MARKET",rarity:"Legendary"};
  const shell=document.createElement("div");shell.className="previewCard";
  putImage(shell,card,card.name+" illustrated card artwork");
  const title=document.createElement("strong");title.textContent=card.name;
  const rarity=document.createElement("small");rarity.textContent=card.rarity.toUpperCase()+" · ILLEGAL CHESS";
  shell.append(title,rarity);art.append(shell);
 }
}

const diagonals={NE:[1,1],NW:[-1,1],SE:[1,-1],SW:[-1,-1]};
// The player's own invisible-to-opponent sniper sits one full square beyond
// the playable 8x8 board, and its normal diagonal extends back into the board.
function sniperVision(sniper=game?.sniper?.own,stopAtBlock=true){
 if(!sniper)return null;
 const delta=diagonals[sniper.direction];
 if(!delta)return null;
 const [dx,dy]=delta;
 let file="abcdefgh".indexOf(sniper.origin[0]),rank=Number(sniper.origin[1]);
 if(file<0||!rank)return null;
 while(file+dx>=0&&file+dx<8&&rank+dy>=1&&rank+dy<=8){file+=dx;rank+=dy;}
 const outside={file:file+dx,rank:rank+dy};
 const pieces=boardFromFen(game.fen),ray=new Set();
 let blocker=null;
 for(let f=file,r=rank;f>=0&&f<8&&r>=1&&r<=8;f-=dx,r-=dy){
  const square="abcdefgh"[f]+r,piece=pieces[(8-r)*8+f];
  ray.add(square);
  if(piece!=="."){if(!blocker)blocker={square,piece};if(stopAtBlock)break;}
 }
 return {outside,ray,blocker,direction:sniper.direction};
}
function renderBoard(){
 const pieces=boardFromFen(game.fen),board=$("board"),isBlack=game.player==="b",vision=sniperVision(),enemyVision=sniperVision(game.sniper?.opponentRevealed,false);
 const frag=document.createDocumentFragment();
 // An actual ten-by-ten visual grid: the inner 8x8 is playable chess;
 // the outer ring is off-board. Only the owner sees their bishop there.
 for(let n=0;n<100;n++){
  const visualRank=Math.floor(n/10),visualFile=n%10;
  const rank=isBlack?visualRank:9-visualRank;
  const file=isBlack?8-visualFile:visualFile-1;
  const inside=file>=0&&file<8&&rank>=1&&rank<=8;
  if(!inside){
   const ghost=document.createElement("div");ghost.className="square outside";
   ghost.setAttribute("aria-hidden","true");
   if(vision?.outside.file===file&&vision?.outside.rank===rank){
    ghost.classList.add("offboardSniper");
    if(sniperSelected)ghost.classList.add("selected");
    const icon=document.createElement("span");icon.className="piece "+(isBlack?"black":"white");
    icon.textContent=isBlack?"♝":"♗";ghost.append(icon);
    const pin=document.createElement("span");pin.className="sniperPin";pin.textContent="⌖";ghost.append(pin);
    ghost.removeAttribute("aria-hidden");ghost.setAttribute("role","button");ghost.setAttribute("tabindex","0");
    ghost.setAttribute("aria-label","Your off-board bishop, aim down the "+vision.direction+" diagonal");
    const aim=()=>{if(!myTurn()||modalOpen)return;const next=!sniperSelected;clearSelection();sniperSelected=next;render();};
    ghost.addEventListener("click",aim);
    ghost.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();aim();}});
   }
   frag.append(ghost);continue;
  }
  const i=(8-rank)*8+file,piece=pieces[i],name="abcdefgh"[file]+rank;
  const cell=document.createElement("button");cell.type="button";
  cell.className="square "+(((rank+file)%2)?"dark":"light");
  cell.setAttribute("aria-label",name+" "+(piece==="."?"empty":piece));
  if(name===selected||name===cardFrom)cell.classList.add("selected");
  if(!selectedCard&&selected&&game.legal.some(m=>m.from===selected&&m.to===name)){
   cell.classList.add(piece==="."?"hint":"capture");
  }
  if(vision?.ray.has(name)){
   cell.classList.add("sniperRay");
   cell.classList.add((vision.direction==="NE"||vision.direction==="SW")?"slopeUp":"slopeDown");
   if(vision.blocker?.square===name&&!game.sniperShots?.includes(name))cell.classList.add("sniperBlocked");
  }
  if(enemyVision?.ray.has(name)){
    cell.classList.add("enemySniperRay");
    cell.classList.add((enemyVision.direction==="NE"||enemyVision.direction==="SW")?"slopeUp":"slopeDown");
   }
   if(game.sniperShots?.includes(name))cell.classList.add("shot");
  if(game.effects?.freeze?.square===((8-rank)*16+file))cell.classList.add("freezeTarget");
  if(game.effects?.reserved?.square===((8-rank)*16+file))cell.classList.add("reservedTarget");
   const cap=game.effects?.timeCapsule;
   if(cap?.origin===name)cell.classList.add("capsuleOrigin");
   if(cap?.square===((8-rank)*16+file))cell.classList.add("capsuleTracked");
   if(Object.values(game.effects?.insurance||{}).some(mark=>mark?.square===((8-rank)*16+file)))cell.classList.add("insuredTarget");
  if(game.status.text.includes("CHECK")&&((game.turn==="w"&&piece==="K")||(game.turn==="b"&&piece==="k")))cell.classList.add("inCheck");
  if(game.last&&(game.last.from===((8-rank)*16+file)||game.last.to===((8-rank)*16+file)))cell.classList.add("lastMove");
  if(piece!=="."){
   const symbol=document.createElement("span");symbol.className="piece "+(piece===piece.toUpperCase()?"white":"black");
   symbol.textContent=glyph[piece]||"?";cell.append(symbol);
  }
  if(file===0){const label=document.createElement("span");label.className="coord";label.textContent=rank;cell.append(label);}
  if(rank===1){const label=document.createElement("span");label.className="coord file";label.textContent="abcdefgh"[file];cell.append(label);}
  cell.addEventListener("click",()=>selectSquare(name,piece));frag.append(cell);
 }
 board.replaceChildren(frag);
}
function addUsedOverlay(card,opponent=false){
 const used=document.createElement("div");used.className=opponent?"usedMark":"cardUsed";
 const text=document.createElement("span");text.textContent="USED";used.append(text);card.append(used);
}
function renderHand(){
 const target=$("hand"),opponent=$("otherhand");target.replaceChildren();opponent.replaceChildren();
 $("remaining").textContent=game.hand.filter(card=>!card.used).length+" REMAINING";
 for(const card of game.hand){
  const button=document.createElement("button");button.type="button";
  button.className="card"+(selectedCard?.id===card.id?" active":"");button.style.setProperty("--tier",tierColors[card.rarity]||"#bcc8df");
  button.disabled=card.used||!myTurn()||busy||card.id==="objection"||(card.id==="counterfeit"&&!game.counterfeitOffer)||(game.effects?.timeCapsule?.color===game.player&&game.effects.timeCapsule.stage==="armed");
  const image=putImage(button,card,card.name+" card illustration");image.className="art";
  const stripe=document.createElement("span");stripe.className="rarityLine";button.append(stripe);
  const content=document.createElement("span");content.className="cardContent";
  const name=document.createElement("span");name.className="cardName";name.textContent=card.name;content.append(name);
  const tier=document.createElement("span");tier.className="cardTier";tier.textContent=card.rarity;content.append(tier);
  const description=document.createElement("span");description.className="cardDesc";description.textContent=card.id==="counterfeit"&&game.counterfeitOffer?"COPY AVAILABLE: "+game.counterfeitOffer.name+" · uses your full turn":card.description;content.append(description);
  button.append(content);if(card.used)addUsedOverlay(button);
  button.addEventListener("click",()=>selectCard(card));target.append(button);
 }
 for(const card of game.opponent){
  const shell=document.createElement("div");shell.className="opCard";
  shell.style.setProperty("--tier",tierColors[card.rarity]||"#bcc8df");
  putImage(shell,card,card.name+" opponent card artwork");
  const name=document.createElement("strong");name.textContent=card.name;shell.append(name);
  if(card.used)addUsedOverlay(shell,true);opponent.append(shell);
 }
 if(!game.opponent.length){const waiting=document.createElement("span");waiting.className="muted";waiting.textContent="Waiting for an opponent to join.";opponent.append(waiting);}
}
function renderSniper(){
 const own=game.sniper?.own,box=$("sniperBox"),actions=$("sniperActions");actions.replaceChildren();
 box.hidden=!own&&!game.sniper?.opponentActive;
 if(own){
  $("sniperTitle").textContent="YOUR BISHOP IS OFF-BOARD";
  $("sniperDetail").textContent=(own.shots?"SECOND SHOT — your bishop will teleport onto the captured square. The enemy sees your diagonal.":"FIRST SHOT — your bishop stays off-board, then your diagonal is revealed.")+" Click the bishop to aim. Direction: "+own.direction+".";
  if(myTurn())for(const target of game.sniperShots||[]){
   const btn=document.createElement("button");btn.className="btn slim primary";btn.textContent="⌖ FIRE AT "+target.toUpperCase();
   btn.addEventListener("click",()=>fire(target));actions.append(btn);
  }
 }else{
  $("sniperTitle").textContent="ENEMY BISHOP SNIPER ACTIVE";
  $("sniperDetail").textContent=game.sniper?.opponentRevealed?"DIAGONAL REVEALED · "+game.sniper.opponentRevealed.direction+" · visible on your board":"Direction unknown until the first shot · pieces can block the firing line";
 }
}
function renderExtras(){
 const fx=$("effects");fx.replaceChildren();
 const list=[],e=game.effects;
 if(e.freeze)list.push("🎫 Parking Ticket · "+toSquare(e.freeze.square));
 if(e.reserved)list.push("🅿 Reserved square · "+toSquare(e.reserved.square));
 if(e.ceasefire)list.push("⚑ Ceasefire · "+e.ceasefire+" move(s)");
 if(e.pawnStrike)list.push("✊ Pawn Strike · pawns cannot advance · "+e.pawnStrike+" turn(s)");
 for(const mark of Object.values(e.insurance||{}))if(mark)list.push("🛡 Insured "+toSquare(mark.square)+" · "+mark.remaining+" enemy turn(s)");
 const capsule=e.timeCapsule;
 if(e.delayedEp)list.push("↘ Delayed En Passant · available this turn");
 if(capsule)list.push("⏳ Time Capsule · "+capsule.origin.toUpperCase()+(capsule.stage==="armed"?" · MOVE MARKED PIECE":" · return next turn"));
 if(game.sniper?.own)list.push("⌖ Your Bishop Sniper · "+game.sniper.own.direction);
 if(game.sniper?.opponentActive)list.push(game.sniper.opponentRevealed?"⌖ Enemy Sniper · diagonal revealed":"⌖ Enemy Sniper · hidden");
 for(const value of list){const chip=document.createElement("span");chip.className="effect";chip.textContent=value;fx.append(chip);}
 if(game.counterfeitOffer&&game.hand.some(c=>c.id==="counterfeit"&&!c.used))list.push("🎭 Counterfeit ready to copy "+game.counterfeitOffer.name);
 if(game.capsuleReturn&&myTurn()){
  const btn=document.createElement("button");btn.type="button";btn.className="btn slim primary";
  btn.textContent="⏳ RETURN "+game.capsuleReturn.from.toUpperCase()+" → "+game.capsuleReturn.to.toUpperCase();
  btn.addEventListener("click",async()=>{
   const cap=game.capsuleReturn;
   const allowed=await modal({tag:"TIME CAPSULE · TURN ACTION",title:"Return your marked piece?",description:"Teleport the surviving piece back to "+cap.to.toUpperCase()+". This spends your chess turn; the marked origin must be empty.",choices:[{label:"RETURN PIECE",value:true,kind:"primary"}]});
   if(allowed)await send({type:"time-capsule-return"});
  });
  fx.append(btn);
 }
 if(!list.length){const none=document.createElement("span");none.className="muted";none.textContent="No active effects";fx.append(none);}
 const log=$("log");log.replaceChildren();
 for(const event of [...game.log].reverse()){
  const row=document.createElement("div");row.className="logRow";
  const label=document.createElement("b");label.textContent=event.side==="w"?"WHITE":event.side==="b"?"BLACK":"EVENT";row.append(label,document.createTextNode(event.text));log.append(row);
 }
 if(!game.log.length){const empty=document.createElement("span");empty.className="muted";empty.textContent="The first move starts your story.";log.append(empty);}
}
function render(){
 if(!game)return;
 const black=game.player==="b";
 $("selfIcon").textContent=black?"♚":"♔";$("enemyIcon").textContent=black?"♔":"♚";
 $("selfIcon").classList.toggle("dark",black);$("enemyIcon").classList.toggle("dark",!black);
 $("selfLabel").textContent=(black?"BLACK":"WHITE")+" · YOU";
 $("enemyLabel").textContent=(black?"WHITE":"BLACK")+" · OPPONENT";
 $("selfState").textContent=game.status.text;
 $("matchTitle").textContent=game.testMode?"Bishop Sniper · test match":"The board has no mercy.";
 const left=20-(game.moveCount||0)%20;
 $("swapCounter").textContent=game.status.done?"MATCH FINISHED":"COLOR SWAP IN "+left+" TURN"+(left===1?"":"S")+" · "+(game.swaps||0)+" SWAPS";
 const reaction=game.pendingReaction,box=$("reactionBox");
 box.hidden=!reaction;
 if(reaction){
  $("reactionTitle").textContent=reaction.canReact?"OBJECTION! — YOUR RESPONSE":"AWAITING OBJECTION!";
  $("reactionText").textContent=reaction.canReact?
   "Your opponent is playing "+reaction.name+". Allow it, or use Objection! to cancel the card and force a normal move.":
   "Your opponent is deciding whether to allow "+reaction.name+". The board is paused until they respond.";
  $("reactionActions").hidden=!reaction.canReact;
 }
 const result=$("gameResult");
 result.hidden=!game.status.done;
 if(game.status.done){
  const winner=game.status.winner;
  const headline=winner===null?"DRAW":winner===game.player?"VICTORY":"DEFEAT";
  $("gameResultTitle").textContent=headline;
  $("gameResultDetail").textContent=game.status.text+" · The match is finished; moves and cards are now locked.";
  result.classList.toggle("victory",headline==="VICTORY");
  result.classList.toggle("defeat",headline==="DEFEAT");
 }
 $("enemyState").textContent=!game.ready?"Invite someone to join":game.status.done?"Match complete":myTurn()?"Waiting for your move":"Choosing a move…";
 $("selfTurn").hidden=!myTurn();$("enemyTurn").hidden=!game.ready||game.status.done||myTurn();
 if(selectedCard&&!game.hand.some(c=>c.id===selectedCard.id&&!c.used)){clearSelection();}
 renderBoard();renderHand();renderSniper();renderExtras();
 let hint;
 if(!game.ready)hint="Send a room invite to your opponent. Your cards are already dealt.";
 else if(game.status.done)hint=game.status.text;
 else if(game.pendingReaction)hint=game.pendingReaction.canReact?"Choose ALLOW or OBJECTION! to resolve the pending card.":"Waiting for the opponent to respond to your card.";
 else if(!myTurn())hint="Opponent's turn. Study their hand while you plan your next move.";
 else if(selectedCard)hint=selectedCard.mode==="sniper"?"Select your bishop, then choose a secret diagonal."
  :selectedCard.mode==="two"?(cardFrom?selectedCard.id==="friendly-fire"?"Select the friendly non-king piece to capture.":selectedCard.id==="pawn-ram"?"Select the directly opposing pawn to push backward.":"Select the destination square.":"Select the starting piece.")
   :selectedCard.mode==="one"?(selectedCard.id==="insurance-fraud"?"Select a friendly non-king piece to insure for two enemy turns.":"Select your own non-king piece to remove.")
   :selectedCard.mode==="relocate"?(cardFrom?"Select an enemy piece your selected piece could legally capture.":"Select one of your attacking pieces.")
    :selectedCard.mode==="instant-turn"?"Confirm the card to consume your turn."
   :selectedCard.mode==="one-prep"?"Select the non-king piece you want to move and mark its starting square."
   :selectedCard.mode==="recall"?(cardFrom?"Select a legal promotion destination to recall a captured piece.":"Select a pawn that can promote now.")
  :selectedCard.mode==="square"?"Select an empty target square."
  :selectedCard.mode==="transform"?"Select your queen, then a new piece."
  :"Choose a target.";
 else if(game.effects?.timeCapsule?.color===game.player&&game.effects.timeCapsule.stage==="armed")hint="Time Capsule armed at "+game.effects.timeCapsule.origin.toUpperCase()+". Move that marked piece now.";
  else if(game.capsuleReturn)hint="You can return your Time Capsule piece using the RETURN button in Active Effects, or make an ordinary move.";
  else if(sniperSelected)hint=game.sniperShots?.length?"Click the highlighted enemy piece to fire your off-board bishop.":"Your bishop is aimed, but its diagonal is blocked or has no legal target.";
 else if(selected)hint="Select a highlighted destination, or another friendly piece.";
 else if(game.sniperShots?.length)hint="It's your turn. You can fire your hidden bishop or move another piece.";
 else hint="Your turn. Select a piece, or play a tactical card before you move.";
 $("helpText").textContent=hint;
}
async function fire(target){
 if(!myTurn())return;
 const option=await modal({tag:"BISHOP SNIPER",title:"Take the shot?",description:"Your bishop will capture "+target.toUpperCase()+". "+(game.sniper?.own?.shots?"SECOND SHOT: it teleports onto the captured square and leaves sniper mode.":"FIRST SHOT: it stays off-board, but your diagonal is revealed to the opponent.")+" This uses your chess turn.",choices:[{label:"FIRE · "+target.toUpperCase(),value:true,kind:"danger"}]});
 if(option)await send({type:"sniper-shot",to:target});
}
async function selectCard(card){
 if(!myTurn()||busy||card.used)return;
 if(selectedCard?.id===card.id){clearSelection();render();return;}
 selected=null;selectedCard=card;cardFrom=null;render();
 if(card.mode==="instant"&&card.id==="delayed-en-passant"&&!game.delayedEpTargets?.length){
  clearSelection();render();flash("No delayed en passant is available: the extra window may have expired.");return;
 }
 if(card.mode==="recall"&&!game.recallChoices?.length){
  clearSelection();render();flash("No valid Promotion Recall: you need a pawn about to promote and a captured piece with an empty home square.");return;
 }
 if(card.mode==="instant"){
  const choice=await modal({tag:"TACTICAL CARD · BONUS ACTION",title:"Play "+card.name+"?",description:card.description+" Your chess move will remain available this turn.",choices:[{label:"ACTIVATE CARD",kind:"primary",value:true}]});
  if(choice)await send({type:"card",card:card.id});else{clearSelection();render();}
  }else if(card.mode==="instant-turn"){
   const choice=await modal({tag:"PRISONER EXCHANGE · TURN ACTION",title:"Revive one pawn for each side?",description:card.description+" This consumes your chess turn and restores a pawn to both sides if each has lost one.",choices:[{label:"EXCHANGE PRISONERS",kind:"primary",value:true}]});
   if(choice)await send({type:"card",card:card.id});else{clearSelection();render();}
  }else if(card.mode==="market"){
  const options=game.hand.map((c,i)=>({...c,slot:i})).filter(c=>!c.used&&c.id!=="black-market").map(c=>({label:c.name+" · "+c.rarity,value:c.slot,kind:"ghost"}));
  const slot=await modal({tag:"BLACK MARKET",title:"Trade an unused card",description:"Black Market consumes your chess turn. Select an unused card; it will be replaced by a random card of the SAME rarity.",choices:options});
  if(slot!==null)await send({type:"card",card:card.id,slot});else{clearSelection();render();}
 }
}
async function selectSquare(name,piece){
 if(!myTurn()||busy||modalOpen)return;
 if(selectedCard){
  const card=selectedCard;
  if(card.mode==="square"){
   if(piece!=="."){flash("Select an empty square.");return;}
   const approved=await modal({tag:"TACTICAL CARD · BONUS ACTION",title:"Reserve "+name.toUpperCase()+"?",description:"Your opponent cannot end their next move on "+name.toUpperCase()+". You can still make a normal chess move now.",choices:[{label:"RESERVE SQUARE",value:true,kind:"primary"}]});
   if(approved)await send({type:"card",card:card.id,to:name});return;
  }
  if(card.mode==="one-prep"){
    if(!own(piece)||piece.toLowerCase()==="k"){flash("Select your own non-king piece.");return;}
    if(!game.legal.some(m=>m.from===name&&!m.promotion)){flash("That piece has no legal move to use with Time Capsule.");return;}
    const approved=await modal({tag:"TIME CAPSULE · BONUS ACTION",title:"Mark "+name.toUpperCase()+"?",description:"You must move this piece now. On your next turn you may spend that turn returning the same surviving piece to "+name.toUpperCase()+" if the square is empty and the return is king-safe.",choices:[{label:"MARK THIS SQUARE",value:true,kind:"primary"}]});
    if(approved)await send({type:"card",card:card.id,from:name});return;
   }
   if(card.mode==="recall"){
    if(!cardFrom){
     if(!own(piece)||piece.toLowerCase()!=="p"||!game.recallChoices.some(c=>c.from===name)){flash("Select a pawn with a legal Promotion Recall.");return;}
     cardFrom=name;render();return;
    }
    if(name===cardFrom){cardFrom=null;render();return;}
    const option=game.recallChoices.find(c=>c.from===cardFrom&&c.to===name);
    if(!option){flash("That is not a valid Promotion Recall destination.");return;}
    const items=option.options.map(o=>({label:({n:"♞ KNIGHT",b:"♗ BISHOP",r:"♜ ROOK"})[o.into]+" → "+o.home.toUpperCase(),value:o.into+":"+o.home,kind:"ghost"}));
    const choice=await modal({tag:"PROMOTION RECALL",title:"Revive a captured piece",description:"Your pawn disappears upon reaching "+name.toUpperCase()+". Choose which captured piece to return to an empty original square instead of ordinary promotion.",choices:items});
    if(choice){const [into,home]=choice.split(":");await send({type:"card",card:card.id,from:cardFrom,to:name,into,home});}
    return;
   }
   if(card.mode==="one"){
   if(!own(piece)||piece.toLowerCase()==="k"){flash("Choose one of your non-king pieces.");return;}
   const insuring=card.id==="insurance-fraud";
    const approved=await modal({tag:insuring?"INSURANCE FRAUD":"VOLUNTARY EVICTION",title:insuring?"Insure "+name.toUpperCase()+"?":"Evict the piece on "+name.toUpperCase()+"?",description:insuring?"The selected piece is visibly insured for two enemy turns. If an enemy captures it, that attacker cannot move on its owner's next turn. This consumes your current turn.":"This permanently removes your own "+piece.toUpperCase()+" from the game and consumes your chess turn. You cannot undo this.",choices:[{label:insuring?"INSURE PIECE":"YES, REMOVE IT",value:true,kind:insuring?"primary":"danger"}]});
   if(approved)await send({type:"card",card:card.id,from:name});return;
  }
  if(card.mode==="transform"){
   if(!own(piece)||piece.toLowerCase()!=="q"){flash("Select your own queen.");return;}
   const into=await modal({tag:"QUEEN'S ABDICATION",title:"Change your queen",description:"Your queen will permanently become a different piece without moving. This consumes your chess turn.",choices:[{label:"♞ KNIGHT",value:"n"},{label:"♗ BISHOP",value:"b"}]});
   if(into)await send({type:"card",card:card.id,from:name,into});return;
  }
  if(card.mode==="sniper"){
   if(!own(piece)||piece.toLowerCase()!=="b"){flash("Select one of your bishops.");return;}
   const direction=await modal({tag:"CLASSIFIED DEPLOYMENT · HIDDEN",title:"Deploy Bishop Sniper",description:"Your bishop vanishes completely off-board. Choose its secret outward diagonal; it can later shoot inward, but the first occupied square blocks everything behind it. Your opponent sees the disappearance, not the direction.",choices:[
    {label:"↗ NORTH-EAST",value:"NE"},{label:"↖ NORTH-WEST",value:"NW"},{label:"↘ SOUTH-EAST",value:"SE"},{label:"↙ SOUTH-WEST",value:"SW"}]});
   if(direction)await send({type:"card",card:card.id,from:name,direction});return;
  }
  if(card.mode==="relocate"){
    if(!cardFrom){if(!own(piece)){flash("Choose one of your attacking pieces first.");return;}cardFrom=name;render();return;}
    if(name===cardFrom){cardFrom=null;render();return;}
    const option=(game.relocationChoices||[]).find(c=>c.from===cardFrom&&c.to===name);
    if(!option){flash("That piece cannot be legally relocated by your attacker.");return;}
    const dest=await modal({tag:"RELOCATION ORDER",title:"Relocate the enemy at "+name.toUpperCase(),description:"Your "+cardFrom.toUpperCase()+" attacker remains in place. Choose an empty original starting square for the enemy piece. This consumes your turn.",choices:option.homes.map(h=>({label:h.toUpperCase(),value:h,kind:"ghost"}))});
    if(dest)await send({type:"card",card:card.id,from:cardFrom,to:name,dest});
    return;
   }
   if(card.mode==="two"){
   if(!cardFrom){if(!own(piece)){flash("Select one of your pieces first.");return;}cardFrom=name;render();return;}
   if(name===cardFrom){cardFrom=null;render();return;}
   await send({type:"card",card:card.id,from:cardFrom,to:name});return;
  }
  return;
 }
 if(!selectedCard&&(sniperSelected||!selected)&&game.sniperShots?.includes(name)){await fire(name);return;}
 if(sniperSelected){sniperSelected=false;render();flash("There is no legal sniper shot on that square.");return;}
 if(selected){
  if(selected===name){selected=null;render();return;}
  if(own(piece)){selected=name;render();return;}
  const candidates=game.legal.filter(m=>m.from===selected&&m.to===name);
  if(!candidates.length){flash("That isn't a legal move.");return;}
  let promotion="";
  if(candidates.some(m=>m.promotion)){
   promotion=await modal({tag:"PAWN PROMOTION",title:"Choose your promotion",description:"Your pawn has reached the final rank. Choose its new identity.",choices:[
    {label:"♕ QUEEN",value:"q"},{label:"♜ ROOK",value:"r"},{label:"♗ BISHOP",value:"b"},{label:"♞ KNIGHT",value:"n"}]});
   if(!promotion)return;
  }
  await send({type:"move",from:selected,to:name,promotion});return;
 }
 if(own(piece)){sniperSelected=false;selected=name;render();}
 else flash("Select your own piece first.");
}
$("create").addEventListener("click",async()=>{
 const button=$("create");button.disabled=true;$("lobbyError").textContent="";
 try{await begin(await api("create",{}));}catch(error){$("lobbyError").textContent=error.message;}finally{button.disabled=false;}
});
$("sniperTest").addEventListener("click",async()=>{
 const button=$("sniperTest");button.disabled=true;$("lobbyError").textContent="";
 try{await begin(await api("create",{mode:"sniper-test"}));}catch(error){$("lobbyError").textContent=error.message;}finally{button.disabled=false;}
});
$("join").addEventListener("click",async()=>{
 const button=$("join");button.disabled=true;$("lobbyError").textContent="";
 try{await begin(await api("join",{room:$("code").value}));}catch(error){$("lobbyError").textContent=error.message;}finally{button.disabled=false;}
});
$("code").addEventListener("keydown",event=>{if(event.key==="Enter")$("join").click();});
$("leave").addEventListener("click",async()=>{
 const accept=await modal({tag:"LEAVE PRIVATE ROOM",title:"Leave this match?",description:"This closes your current player session in this tab. Your opponent's room remains saved, but you won't be able to act in it without the session token.",choices:[{label:"LEAVE ROOM",value:true,kind:"danger"}]});
 if(!accept)return;
 sessionStorage.removeItem("gameshub-illegal-chess");session=null;game=null;lastState="";
 if(poll){clearInterval(poll);poll=null;}clearSelection();
 history.replaceState({}, "", "/games/illegal-chess/");
 $("match").hidden=true;$("lobby").hidden=false;$("connection").textContent="CONNECTING";$("connection").classList.add("offline");
});

$("copy").addEventListener("click",async()=>{
 const url=invite(session.room);
 await modal({tag:"PRIVATE ROOM INVITATION",title:"Invite your opponent",description:"Copy the private room link below and send it to a friend. No browser pop-ups required.",link:url,choices:[{label:"SELECT & COPY LINK",value:"__copy",kind:"primary"}]});
});
renderLobby();
const wanted=new URL(location.href).searchParams.get("room");if(wanted)$("code").value=wanted.toUpperCase();
try{const saved=JSON.parse(sessionStorage.getItem("gameshub-illegal-chess")||"null");if(saved?.room&&saved?.token&&(!wanted||saved.room===wanted.toUpperCase()))begin(saved);}catch{}
