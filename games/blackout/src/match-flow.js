// BLACKOUT V7.1 — offline first-to-four tactical series, not network ranked.
export class TacticalSeries{
  constructor(startRole="attacker"){this.reset(startRole)}
  reset(startRole="attacker"){
    this.startRole=startRole==="defender"?"defender":"attacker";
    this.yourWins=0;this.theirWins=0;this.history=[];this.lastRound=0;
    return this;
  }
  get round(){return this.history.length+1}
  get finished(){return this.yourWins>=4||this.theirWins>=4}
  get winner(){return this.finished?(this.yourWins>this.theirWins?"YOUR SQUAD":"OPPONENTS"):null}
  get nextRole(){
    // Half-time after 3 rounds. A tied 3-3 enters one final side-deciding round.
    const flip=this.history.length>=3&&this.history.length<6;
    return flip?(this.startRole==="attacker"?"defender":"attacker"):this.startRole;
  }
  record(roundNumber,won,role,reason=""){
    if(this.finished||roundNumber!==this.round||
      !["attacker","defender"].includes(role))return false;
    const expected=this.nextRole;
    if(role!==expected)return false;
    if(won)this.yourWins++;else this.theirWins++;
    this.history.push({number:roundNumber,won:Boolean(won),role,reason:String(reason)});
    this.lastRound=roundNumber;
    return true;
  }
  get snapshot(){return {
    round:this.round,finished:this.finished,winner:this.winner,
    yourWins:this.yourWins,theirWins:this.theirWins,
    startRole:this.startRole,nextRole:this.nextRole,history:[...this.history]
  }}
  get resultLine(){
    const r=this.history.at(-1);
    if(!r)return "ROUND 1 · FIRST TO FOUR";
    const progress="YOUR SQUAD "+this.yourWins+" : "+this.theirWins+" OPPONENTS";
    return this.finished?
      (this.winner==="YOUR SQUAD"?"MATCH WON":"MATCH LOST")+" · "+progress:
      "ROUND "+r.number+" "+(r.won?"WON":"LOST")+" · "+progress+
      " · NEXT: "+this.nextRole.toUpperCase();
  }
}
// Only a tiny grace period against defender spawn-peeks; it ends when the
// attacking operator leaves the insertion radius or fires. No protection
// is granted during prep or for defenders.
export const ENTRY_GRACE_MS=2300,ENTRY_RADIUS=3.0;
export function attackInsertionProtected({
  now,actionStartedAt,phase,team,position,insertion,firedAt=0
}){
  return (phase==="attack"||phase==="guard")&&team==="attacker"&&
    Number.isFinite(now)&&Number.isFinite(actionStartedAt)&&
    actionStartedAt>0&&now>=actionStartedAt&&
    now-actionStartedAt<ENTRY_GRACE_MS&&
    !(firedAt>=actionStartedAt)&&!!position&&!!insertion&&
    Math.hypot(position.x-insertion.x,position.z-insertion.z)<ENTRY_RADIUS&&
    Math.abs((position.y||0)-(insertion.y||0))<1;
}
