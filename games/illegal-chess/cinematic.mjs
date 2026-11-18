// Illegal Chess V2 cinematic event helpers. Server-authored events only.
// Pure helpers keep replay, ordering, and shot/teleport presentation testable.
export const CINEMATIC_DURATIONS={
 "sniper-first-shot":4900,
 "sniper-teleport":680
};
const validSquare=s=>typeof s==="string"&&/^[a-h][1-8]$/.test(s);
const validEvent=e=>e&&Number.isInteger(e.id)&&e.id>=1&&
 Object.hasOwn(CINEMATIC_DURATIONS,e.kind)&&
 (e.attacker==="w"||e.attacker==="b")&&
 validSquare(e.target)&&validSquare(e.origin)&&
 ["NE","NW","SE","SW"].includes(e.direction)&&
 typeof e.victim==="string"&&/^[prnbqkPRNBQK]$/.test(e.victim);
// Joining/reloading an existing game should not replay past cinematics.
// After initialization, advance only when a NEW server event arrives.
export function nextCinematic(events,lastSeen){
 const latest=Array.isArray(events)?events.filter(validEvent).at(-1):null;
 if(lastSeen===null)return {seen:latest?.id||0,event:null};
 if(!latest||latest.id<=lastSeen)return {seen:lastSeen,event:null};
 return {seen:latest.id,event:latest};
}
export function cinematicCaption(e){
 if(!validEvent(e))return null;
 return {
  title:e.kind==="sniper-first-shot"?"BISHOP SNIPER":"SNIPER EXTRACTION",
  eyebrow:e.kind==="sniper-first-shot"?"FIRST SHOT · PRECISION ELIMINATION":"SECOND SHOT · SHADOW TELEPORT",
  detail:e.origin.toUpperCase()+" · "+e.direction+" · TARGET "+e.target.toUpperCase(),
  victim:e.victim,
  duration:CINEMATIC_DURATIONS[e.kind],
  fullScreen:e.kind==="sniper-first-shot"
 };
}


// Detect only freshly spent cards in authoritative multiplayer room snapshots.
// Both players see the same public hands. We match by board color (not local
// perspective) because a 20-turn color swap changes which side each player owns.
// This is purely visual: no locally predicted card effects or extra server data.
const coloredHands=view=>{
 if(!view||!["w","b"].includes(view.player)||
    !Array.isArray(view.hand)||!Array.isArray(view.opponent))return null;
 return view.player==="w"?
  {w:view.hand,b:view.opponent}:{w:view.opponent,b:view.hand};
};
export function newCardCasts(previous,current){
 const before=coloredHands(previous),after=coloredHands(current);
 if(!before||!after||previous.room!==current.room)return [];
 const casts=[];
 for(const color of ["w","b"]){
  const unused=new Set(before[color].filter(card=>card?.used===false).map(card=>card.id));
  const alreadySpent=new Map();
  for(const card of before[color])if(card?.used===true)alreadySpent.set(card.id,(alreadySpent.get(card.id)||0)+1);
  for(const card of after[color]){
   if(card?.used!==true)continue;
   const oldCount=alreadySpent.get(card.id)||0;
   if(oldCount>0){alreadySpent.set(card.id,oldCount-1);continue;}
   if(!unused.has(card.id)||typeof card.id!=="string"||!/^[a-z0-9-]+$/.test(card.id)||
      typeof card.name!=="string"||!["Common","Uncommon","Rare","Epic","Legendary"].includes(card.rarity))continue;
   casts.push({color,id:card.id,name:card.name,rarity:card.rarity});
  }
 }
 return casts;
}
