// Illegal Chess V1 cinematic event helpers. Server-authored events only.
// Pure helpers keep replay, ordering, and shot/teleport presentation testable.
export const CINEMATIC_DURATIONS={
 "sniper-first-shot":1550,
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
