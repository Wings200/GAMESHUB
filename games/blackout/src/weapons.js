// BLACKOUT V0.2 — independent offline weapon mechanics for test tuning.
// Gun statistics are GAMEPLAY values; no server-authoritative combat yet.
export const WEAPON_SPECS=Object.freeze({
  primary:{name:"KESTREL MK1",category:"CARBINE",magazine:30,reserve:120,rpm:710,
    reload:2.25,body:29,head:83,hipSpread:.019,adsSpread:.0025,recoil:.009,range:110},
  secondary:{name:"VIGIL P9",category:"SIDEARM",magazine:15,reserve:60,rpm:375,
    reload:1.55,body:42,head:110,hipSpread:.026,adsSpread:.0035,recoil:.017,range:75}
});
export class Weapons {
  constructor(){
    this.guns={};
    for(const [id,spec] of Object.entries(WEAPON_SPECS))
      this.guns[id]={...spec,ammo:spec.magazine,remaining:spec.reserve,reloadingUntil:0,nextShotAt:0};
    this.slot="primary";this.shots=0;this.hits=0;this.kills=0;
  }
  get current(){return this.guns[this.slot]}
  reset(){
    for(const [id,spec] of Object.entries(WEAPON_SPECS)){
      Object.assign(this.guns[id],{ammo:spec.magazine,remaining:spec.reserve,reloadingUntil:0,nextShotAt:0});
    }
    this.slot="primary";this.shots=this.hits=this.kills=0;
  }
  equip(slot){if(!this.guns[slot])return false;this.slot=slot;return true;}
  get reloading(){return this.current.reloadingUntil>0;}
  reload(now){
    const gun=this.current;
    if(gun.reloadingUntil||gun.ammo===gun.magazine||gun.remaining<=0)return false;
    gun.reloadingUntil=now+gun.reload*1000;
    return true;
  }
  tick(now){
    for(const gun of Object.values(this.guns)){
      if(gun.reloadingUntil&&now>=gun.reloadingUntil){
        const count=Math.min(gun.magazine-gun.ammo,gun.remaining);
        gun.ammo+=count;gun.remaining-=count;gun.reloadingUntil=0;
      }
    }
  }
  tryFire(now,ads,canFire=true){
    const gun=this.current;
    if(!canFire)return {ok:false,why:"blocked"};
    if(gun.reloadingUntil)return {ok:false,why:"reloading"};
    if(now<gun.nextShotAt)return {ok:false,why:"cooldown"};
    if(gun.ammo<=0){gun.nextShotAt=now+250;return {ok:false,why:"empty"};}
    gun.ammo--;gun.nextShotAt=now+60000/gun.rpm;
    this.shots++;
    const spread=ads?gun.adsSpread:gun.hipSpread;
    return {ok:true,gun:this.slot,damage:gun.body,headDamage:gun.head,
      recoil:gun.recoil,range:gun.range,spread,ads};
  }
  registerHit(kill=false){this.hits++;if(kill)this.kills++;}
  get stats(){return {shots:this.shots,hits:this.hits,kills:this.kills,
    accuracy:this.shots?Math.round(this.hits/this.shots*100):0};}
}
