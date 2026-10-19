// BLACKOUT V1.0 — real bot-vs-bot squad combat for offline five-on-five drills.
// Five operators per side means one human + four friendly AI versus five hostiles.
// Do not misrepresent this as online multiplayer.
import {advanceTacticalBot} from "./bot-ai.js?v=blackout-v201-builder-drone-ai-final";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const live=list=>list.filter(x=>x.alive);
function visible(round,from,target){
  const origin=new round.THREE.Vector3(from.x,1.61,from.z);
  // Use the actual operator position; a remote-controlled drone must
  // not teleport the operator's hit/visibility origin across the map.
  const dest=new round.THREE.Vector3(target.x,
    target.isPlayer?1.55:1.62,target.z);
  const dir=dest.sub(origin),dist=dir.length();
  if(dist<.25||dist>26)return false;
  round.ray.set(origin,dir.normalize());
  round.ray.near=.06;round.ray.far=Math.max(.05,dist-.30);
  const occluders=round.world.shootables.filter(m=>{
    const u=m.userData||{};
    return (u.kind==="solid"||
      u.kind==="panel"&&!u.panel.destroyed||
      u.kind==="barricade"&&!u.plank.broken||
      u.kind==="shield"&&u.shield.group.parent)&&m.visible!==false;
  });
  return !round.ray.intersectObjects(occluders,false).length;
}
function chooseCover(round,bot,threat){
  const points=round.world.facility.coverPoints||[];
  let best=null,score=Infinity;
  for(const p of points){
    const d=distance(bot,p),enemyDist=distance(threat,p);
    if(d<.7||d>6.4||enemyDist<2.4)continue;
    // Choose safe adjacent cover while maintaining a useful firing lane.
    const candidate=d+Math.abs(enemyDist-7)*.28+
      Math.abs(bot.id%3-1)*.02;
    if(candidate<score){score=candidate;best=p;}
  }
  return best;
}
function assignedSite(round,bot){
  return bot.assignedSite||round.sites[bot.id%2===0?"B":"A"];
}
function desiredPosition(round,bot,player){
  const site=assignedSite(round,bot),isAttack=bot.team==="ally"?
    round.role==="attacker":round.role==="defender";
  if(round.phase==="planted"){
    if(isAttack){
      const p=round.plantPosition||round.site;
      return {x:p.x+(bot.id%2?2.5:-2.5),
        z:p.z+(bot.id%3-1)*2.2};
    }
    return round.plantPosition||round.site;
  }
  if(isAttack){
    // Five attackers enter from different directions and clear two sites.
    // One objective runner aims for the plant; the rest take flank/cover lanes.
    if(bot.carrier)return {x:site.x+(bot.id%2?.95:-.95),
      z:site.z+(bot.id%3-1)*1.1};
    return {x:site.x+(bot.id%2?1.9:-1.9),
      z:site.z+(bot.id%3-1)*2.4};
  }
  // Defenders anchor BOTH devices, patrol nearby angles and reposition
  // only when they have heard or seen an actual threat.
  return bot.anchor||{x:site.x+(bot.id%2?1.5:-1.5),z:site.z};
}
function maybeWorkDevice(round,bot,now,dt,notify){
  if(round.phase==="planted"){
    const isDefender=bot.team==="ally"?
      round.role==="defender":round.role==="attacker";
    if(!isDefender)return false;
    if(distance(bot,round.plantPosition)>1.85){bot.working=0;return false;}
    bot.working=(bot.working||0)+dt*1000;
    if(bot.working>=7000){
      bot.working=0;round.defuser.hide();
      round.end(bot.team==="ally","DEFUSER DISABLED BY "+(bot.team==="ally"?"SQUADMATE":"HOSTILES"),notify);
    }
    return true;
  }
  const isAttack=bot.team==="ally"?
    round.role==="attacker":round.role==="defender";
  if(!isAttack||round.phase!=="attack"&&round.phase!=="guard")return false;
  // Human attacker keeps the defuser unless eliminated. Enemy attackers
  // designate one objective carrier, while squadmates clear/cover.
  if(bot.team==="ally"&&round.role==="attacker"&&round.playerAlive)return false;
  if(!bot.carrier)return false;
  const site=round.siteAt(bot);
  if(!site){bot.working=0;return false;}
  const opponents=bot.team==="ally"?round.bots:round.allies;
  const nearbyOpponent=opponents.some(enemy=>enemy.alive&&distance(enemy,bot)<3.5);
  const playerThreat=bot.team==="enemy"&&round.role==="defender"&&
    round.playerAlive&&distance(round.playerRef,bot)<3.5;
  if(nearbyOpponent||playerThreat){bot.working=0;return false;}
  if(bot.working===0)notify("ATTACKER STARTED PLANTING · SITE "+site.id);
  bot.working=(bot.working||0)+dt*1000;
  if(bot.working>=5400){
    bot.working=0;round.chooseSite(site.id);
    round.phase="planted";round.bombEnd=now+35000;round.nextBeep=now+800;
    round.plantPosition={x:bot.x,z:bot.z};
    round.defuser.show(bot.x,bot.z,35,now,site.id);
    notify("DEFUSER PLANTED BY "+(bot.team==="ally"?"YOUR SQUAD":"HOSTILES")+" · SITE "+site.id,"plant");
  }
  return true;
}
function fireAt(round,bot,target,now,notify){
  if(now<bot.nextShot||!bot.sightCache)return;
  bot.nextShot=now+(bot.team==="ally"?650:830)+(bot.id%4)*75+Math.random()*190;
  bot.lastShotAt=now;
  notify(null,bot.team==="ally"?"ally-fire":"enemy-fire",bot);
  const range=distance(bot,target);
  const hitChance=clamp((bot.team==="ally"?.76:.64)-range*.017-
    (bot.movedLast>.2?.12:0),.26,.79);
  if(Math.random()>=hitChance)return;
  const damage=(bot.team==="ally"?20:15)+Math.floor(Math.random()*11);
  if(target.isPlayer){
    round.playerRef.takeDamage(damage);
    notify(null,"hurt");
    if(round.playerRef.health<=0)round.playerAlive=false;
  }else if(target.alive){
    const killed=target.damage(damage);
    target.hearing={x:bot.x,z:bot.z};target.hearingUntil=now+4500;
    if(killed&&bot.team==="ally")notify("SQUADMATE ELIMINATED HOSTILE · "+(round.bots.filter(x=>x.alive).length)+" REMAIN");
  }
}
export function updateSquadCombat(round,now,dt,player,notify=()=>{}){
  round.playerRef=player;
  round.playerAlive=player.health>0;
  // If an enemy defuser carrier is eliminated, the surviving attackers
  // recover the objective. Otherwise a single early kill would make the
  // entire attacking squad unable to plant for the rest of the round.
  if(round.role==="defender"&&round.phase==="guard"&&
     !round.bots.some(bot=>bot.alive&&bot.carrier)){
    const replacement=round.bots.find(bot=>bot.alive);
    if(replacement){replacement.carrier=true;notify("ATTACKERS RECOVERED THE DEFUSER");}
  }
  const combatants=[...round.bots,...round.allies];
  for(const bot of combatants){
    if(!bot.alive)continue;
    const opponents=bot.team==="ally"?round.bots:round.allies;
    const possible=live(opponents);
    if(bot.team==="enemy"&&round.playerAlive)
      possible.push({isPlayer:true,x:player.x,z:player.z,camera:player.camera,health:player.health});
    if(now>=(bot.nextSightAt||0)){
      bot.sightCache=false;bot.visibleTarget=null;
      possible.sort((a,b)=>distance(bot,a)-distance(bot,b));
      for(const candidate of possible.slice(0,4)){
        if(visible(round,bot,candidate)){
          bot.sightCache=true;bot.visibleTarget=candidate;
          bot.lastSeen={x:candidate.x,z:candidate.z,time:now};
          break;
        }
      }
      bot.nextSightAt=now+150+(bot.id%5)*31;
    }
    let target=bot.visibleTarget;
    if(target?.isPlayer&&!round.playerAlive)target=null;
    if(target&&!target.isPlayer&&!target.alive)target=null;
    const dst=target?distance(bot,target):Infinity;
    let goal=null;
    const isAttacker=bot.team==="ally"?
      round.role==="attacker":round.role==="defender";
    if(target){
      bot.state="engage";
      // Attackers contest angles instead of sprinting straight to the bomb.
      // Defenders rotate behind nearby hard cover when pressured.
      if(dst<15&&(!bot.coverGoal||now>bot.coverUntil)){
        bot.coverGoal=chooseCover(round,bot,target);
        bot.coverUntil=now+3500+bot.id*110;
      }
      if(isAttacker&&bot.carrier&&round.phase!=="planted"&&dst>8){
        // Objective carrier approaches a safe planting room instead of
        // being endlessly distracted by targets a corridor away.
        goal=desiredPosition(round,bot,player);
        bot.state="plant-approach";
      }else if(dst>13)goal={x:target.x,z:target.z};
      else if(bot.coverGoal&&distance(bot,bot.coverGoal)>.9)goal=bot.coverGoal;
      else if(dst>8.5&&isAttacker)goal={x:target.x,z:target.z};
    }else{
      bot.coverGoal=null;
      const site=assignedSite(round,bot);
      goal=desiredPosition(round,bot,player);
      if(bot.hearing&&bot.hearingUntil>now){
        // Sound investigation never permanently replaces the round objective.
        goal=bot.hearing;bot.state="investigate";
      }else bot.state=isAttacker?"clear-site":"hold-site";
      if(distance(bot,goal)<1.15)goal=null;
      if(!isAttacker&&bot.anchor&&distance(bot,bot.anchor)<1.2)goal=null;
    }
    const moved=goal?advanceTacticalBot(bot,goal,round.world,dt,now):0;
    bot.movedLast=moved;
    if(moved>.35){
      bot.moved+=moved*dt;
      if(bot.moved>2.45){bot.moved=0;notify(null,bot.team==="ally"?"ally-step":"enemy-step",bot);}
    }
    // Attackers physically break blocking wooden door planks, then proceed.
    const doors=round.world.barricades;
    const blockedDoor=bot.blockingBarricade;
    if(isAttacker&&blockedDoor&&doors?.hasBarricade(blockedDoor)&&now>=bot.nextShot){
      const plank=blockedDoor.planks.find(p=>!p.broken&&p.collider.maxY>.42&&p.collider.minY<1.6)||
        blockedDoor.planks.find(p=>!p.broken);
      if(plank){
        doors.hit(plank,34);bot.nextShot=now+410+(bot.id%4)*90;
        bot.lastShotAt=now;bot.state="breach";
        notify(null,bot.team==="ally"?"ally-fire":"enemy-fire",bot);
      }
    }
    // Planting can proceed when distant enemies remain on the map. Only
    // nearby immediate threats interrupt an objective interaction.
    const canWork=!target||dst>7;
    const working=canWork&&maybeWorkDevice(round,bot,now,dt,notify);
    if(target){
      bot.group.rotation.y=Math.atan2(bot.x-target.x,bot.z-target.z);
      fireAt(round,bot,target,now,notify);
    }
    bot.group.updateMatrixWorld(true);
    bot.animate(dt,now,moved);
    if(["won","lost"].includes(round.phase))return;
  }
}