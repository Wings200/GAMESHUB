import {recoilFor} from "./legacy-ballistics.js?v=reboot-006";
// BLACKOUT V0.2 — independent offline weapon mechanics for test tuning.
// Gun statistics are GAMEPLAY values; no server-authoritative combat yet.
export const WEAPON_SPECS=Object.freeze({
  primary:{name:"CARBINE 556",category:"CARBINE",magazine:30,reserve:120,rpm:710,
    reload:2.25,body:29,head:83,hipSpread:.18,adsSpread:.003,recoil:.015,range:110},
  secondary:{name:"P9 SIDEARM",category:"SIDEARM",magazine:15,reserve:60,rpm:375,
    reload:1.55,body:42,head:110,hipSpread:.23,adsSpread:.005,recoil:.023,range:75}
});
// Explicit gun selection uses actual ballistics and magazine states, not UI-only labels.
export const WEAPON_VARIANTS=Object.freeze({
  primary:Object.freeze({
    carbine:WEAPON_SPECS.primary,
    smg:Object.freeze({name:"COMPACT-9 SMG",category:"SMG",magazine:32,reserve:128,rpm:885,
      reload:2.05,body:23,head:72,hipSpread:.14,adsSpread:.0037,recoil:.0165,range:77}),
    dmr:Object.freeze({name:"MR-20 MARKSMAN",category:"DMR",magazine:20,reserve:80,rpm:450,
      reload:2.55,body:46,head:115,hipSpread:.20,adsSpread:.002,recoil:.024,range:145})
  }),
  secondary:Object.freeze({
    p9:WEAPON_SPECS.secondary,
    compact:Object.freeze({name:"C12 COMPACT",category:"SIDEARM",magazine:12,reserve:60,rpm:440,
      reload:1.42,body:36,head:100,hipSpread:.19,adsSpread:.0042,recoil:.020,range:66})
  })
});
export class Weapons {
  constructor(){
    this.loadout={primary:"carbine",secondary:"p9"};
    this.guns={};
    for(const [id,spec] of Object.entries(WEAPON_SPECS))
      // A full detachable magazine plus one chambered round, not a
      // magically refillable magazine. Ammo remains retained in the reserve.
      this.guns[id]={...spec,ammo:spec.magazine+1,remaining:spec.reserve,
        chambered:true,reloadType:null,reloadDurationMs:0,
        reloadingUntil:0,nextShotAt:0,shotSequence:0,lastFiredAt:-Infinity};
    this.slot="primary";this.shots=0;this.hits=0;this.kills=0;
  }
  get current(){return this.guns[this.slot]}
  setLoadout(slot,id){
    if(!WEAPON_VARIANTS[slot]||!WEAPON_VARIANTS[slot][id])return false;
    this.loadout[slot]=id;
    const spec=WEAPON_VARIANTS[slot][id];
    this.guns[slot]={...spec,ammo:spec.magazine+1,remaining:spec.reserve,
      chambered:true,reloadType:null,reloadDurationMs:0,
      reloadingUntil:0,nextShotAt:0,shotSequence:0,lastFiredAt:-Infinity};
    return true;
  }
  reset(){
    for(const id of Object.keys(WEAPON_SPECS)){
      const spec=WEAPON_VARIANTS[id][this.loadout[id]];
      Object.assign(this.guns[id],{...spec,ammo:spec.magazine+1,remaining:spec.reserve,
        chambered:true,reloadType:null,reloadDurationMs:0,
        reloadingUntil:0,nextShotAt:0,shotSequence:0,lastFiredAt:-Infinity});
    }
    this.slot="primary";this.shots=this.hits=this.kills=0;
  }
  equip(slot){
    if(!this.guns[slot])return false;
    if(slot!==this.slot)this.guns[slot].shotSequence=0;
    this.slot=slot;return true;
  }
  get reloading(){return this.current.reloadingUntil>0;}
  reload(now){
    const gun=this.current;
    if(gun.reloadingUntil||gun.ammo>=gun.magazine+1||gun.remaining<=0)return false;
    gun.reloadType=gun.ammo>0?"tactical":"empty";
    gun.reloadDurationMs=gun.reload*1000+(gun.reloadType==="empty"?440:0);
    gun.reloadingUntil=now+gun.reloadDurationMs;
    return true;
  }
  tick(now){
    for(const gun of Object.values(this.guns)){
      if(gun.reloadingUntil&&now>=gun.reloadingUntil){
        // Tactical: keep one in chamber, replace the magazine, 30+1 max.
        // Empty: charge the weapon from a full magazine (no +1).
        const capacity=gun.magazine+(gun.reloadType==="tactical"?1:0);
        const count=Math.max(0,Math.min(capacity-gun.ammo,gun.remaining));
        gun.ammo+=count;gun.remaining-=count;
        gun.chambered=gun.ammo>0;
        gun.reloadingUntil=0;gun.reloadType=null;
      }
    }
  }
  tryFire(now,ads,canFire=true){
    const gun=this.current;
    if(!canFire)return {ok:false,why:"blocked"};
    if(gun.reloadingUntil)return {ok:false,why:"reloading"};
    if(now<gun.nextShotAt)return {ok:false,why:"cooldown"};
    if(gun.ammo<=0){gun.nextShotAt=now+250;return {ok:false,why:"empty"};}
    gun.ammo--;
    gun.chambered=gun.ammo>0;
    // Repeatable pattern so fire control is learnable, not coin-flip yaw.
    if(now-gun.lastFiredAt>290)gun.shotSequence=0;
    const baseKick=recoilFor(this.slot,gun.shotSequence++,ads);
    const recoilScale=gun.recoil/WEAPON_SPECS[this.slot].recoil;
    const kick={vertical:baseKick.vertical*recoilScale,horizontal:baseKick.horizontal*recoilScale};
    gun.lastFiredAt=now;
    // Schedule the next shot from the previous weapon-cycle deadline, not
    // the timestamp of whichever animation frame finally fired this round.
    // This prevents a 710-RPM rifle from slowing noticeably at 30-60 FPS.
    const cycle=60000/gun.rpm;
    const scheduled=gun.nextShotAt>0&&now-gun.nextShotAt<cycle*3?
      gun.nextShotAt:now;
    gun.nextShotAt=scheduled+cycle;
    this.shots++;
    const spread=ads?gun.adsSpread:gun.hipSpread;
    return {ok:true,gun:this.slot,damage:gun.body,headDamage:gun.head,
      recoil:gun.recoil,kick,range:gun.range,spread,ads};
  }
  registerHit(kill=false){this.hits++;if(kill)this.kills++;}
  get stats(){return {shots:this.shots,hits:this.hits,kills:this.kills,
    accuracy:this.shots?Math.round(this.hits/this.shots*100):0};}
}
