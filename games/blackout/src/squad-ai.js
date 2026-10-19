// BLACKOUT V1.0 — real bot-vs-bot squad combat for offline five-on-five drills.
// Five operators per side means one human + four friendly AI versus five hostiles.
// Do not misrepresent this as online multiplayer.
import {advanceTacticalBot} from "./bot-ai.js?v=blackout-v320-ballistics-breakable-walls";

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
function canStand(round,p,r=.43){
  return !round.world.colliders.some(c=>
    c.maxY>.48&&c.minY<1.65&&p.x>c.minX-r&&p.x<c.maxX+r&&
    p.z>c.minZ-r&&p.z<c.maxZ+r);
}
function chooseCover(round,bot,threat){
  // Cover must conceal the operator from the threat and be physically
  // reachable. Don't pick the nearest random desk regardless of its angle.
  const points=round.world.facility.coverPoints||[];
  let choice=null,best=Infinity;
  for(const p of points){
    const d=distance(bot,p),enemyDist=distance(threat,p);
    if(d<.7||d>7.5||enemyDist<2.8||!canStand(round,p))continue;
    const sheltered=!visible(round,p,threat);
    const score=d+(sheltered?-3.1:2)+Math.abs(enemyDist-7)*.12+
      (bot.id%3)*.07;
    if(score<best){choice=p;best=score;}
  }
  return choice;
}
function isAttacking(round,bot){
  return bot.team==="ally"?round.role==="attacker":round.role==="defender";
}
function nearestLiving(list,pos){
  let chosen=null,dist=Infinity;
  for(const unit of list){
    if(!unit.alive)continue;
    const d=distance(unit,pos);
    if(d<dist){chosen=unit;dist=d;}
  }
  return chosen;
}
function attackingCarrier(round){
  const list=round.role==="attacker"?round.allies:round.bots;
  return list.find(b=>b.alive&&b.carrier)||null;
}
function designatedDefuser(round){
  if(round.phase!=="planted"||!round.plantPosition)return null;
  const defenders=round.role==="defender"?round.allies:round.bots;
  // Lock the selection so bots don't constantly reassign the defuse task
  // while approaching. Reassign only if the designated operator dies.
  const current=defenders.find(b=>b.alive&&b.id===round.defuseOperatorId);
  if(current)return current;
  const replacement=nearestLiving(defenders,round.plantPosition);
  round.defuseOperatorId=replacement?.id||null;
  return replacement;
}
function assignedSite(round,bot){
  return bot.assignedSite||round.sites[bot.id%2===0?"B":"A"];
}
function desiredPosition(round,bot,player){
  const site=assignedSite(round,bot),isAttack=isAttacking(round,bot);
  if(round.phase==="planted"){
    const p=round.plantPosition||round.site;
    if(isAttack){
      // Crossfire around the placed device: attackers take different
      // positions instead of stacking directly on the defuser.
      return {x:p.x+([-3,3,-1.5,1.5,0][bot.id%5]),
        z:p.z+([-1,1,2.8,-2.8,3.4][bot.id%5])};
    }
    if(bot===designatedDefuser(round))return p;
    // One defender disables the device, survivors suppress/cover flanks.
    return {x:p.x+(bot.id%2?2.9:-2.9),
      z:p.z+(bot.id%3-1)*3.0};
  }
  if(isAttack){
    // Five attackers enter from different directions and clear two sites.
    // One objective runner aims for the plant; the rest take flank/cover lanes.
    if(bot.carrier)return {x:site.x+(bot.id%2?.85:-.85),
      z:site.z+(bot.id%3-1)*.85};
    // Entry pair fans out to clear corners; support covers crossfire lanes.
    const flank=bot.id%4;
    return {x:site.x+[-2.6,2.6,-1.4,1.4][flank],
      z:site.z+[-3.2,2.7,3.2,-2.7][flank]};
  }
  // Defenders anchor BOTH devices, patrol nearby angles and reposition
  // only when they have heard or seen an actual threat.
  return bot.patrolGoal||bot.anchor||{x:site.x+(bot.id%2?1.5:-1.5),z:site.z};
}
function maybeWorkDevice(round,bot,now,dt,notify){
  if(round.phase==="planted"){
    const isDefender=!isAttacking(round,bot);
    if(!isDefender||bot!==designatedDefuser(round))return false;
    if(distance(bot,round.plantPosition)>1.85){bot.working=0;return false;}
    const threats=bot.team==="ally"?round.bots:round.allies;
    const playerClose=bot.team==="enemy"&&round.playerAlive&&
      distance(round.playerRef,bot)<4.1&&visible(round,bot,round.playerRef);
    // Don't ignore enemies standing on top of the defuser unless the timer
    // is about to expire and a risky last-second attempt is justified.
    const urgent=round.bombEnd-now<9000;
    if(!urgent&&(threats.some(x=>x.alive&&distance(bot,x)<3.3&&
       visible(round,bot,x))||playerClose)){
      bot.working=0;return false;
    }
    bot.working=(bot.working||0)+dt*1000;
    if(bot.working>=7000){
      bot.working=0;round.defuser.hide();
      round.end(bot.team==="ally","DEFUSER DISABLED BY "+(bot.team==="ally"?"SQUADMATE":"HOSTILES"),notify);
    }
    return true;
  }
  const isAttack=isAttacking(round,bot);
  if(!isAttack||round.phase!=="attack"&&round.phase!=="guard")return false;
  // Human attacker keeps the defuser unless eliminated. Enemy attackers
  // designate one objective carrier, while squadmates clear/cover.
  if(bot.team==="ally"&&round.role==="attacker"&&round.playerAlive)return false;
  if(!bot.carrier)return false;
  const site=round.siteAt(bot);
  // Don't plant on the threshold the moment a boot barely enters the
  // painted site rectangle. Reach an actual secure interior planting
  // position first, several metres beyond the outside doorway.
  const safePlant=desiredPosition(round,bot,round.playerRef);
  if(!site||distance(bot,safePlant)>1.75||!canStand(round,bot,.19)){
    bot.working=0;return false;
  }
  const opponents=bot.team==="ally"?round.bots:round.allies;
  const nearbyOpponent=opponents.some(enemy=>enemy.alive&&
    distance(enemy,bot)<3.5&&visible(round,bot,enemy));
  const playerThreat=bot.team==="enemy"&&round.role==="defender"&&
    round.playerAlive&&distance(round.playerRef,bot)<3.5&&
    visible(round,bot,round.playerRef);
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
  if((bot.blindedUntil||0)>now||now<bot.nextShot||!bot.sightCache)return;
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
const PREP_POSITIONS={
  A:[{x:-7,z:-45},{x:-3,z:-42},{x:-7,z:-40},{x:-5,z:-49}],
  B:[{x:3,z:-32},{x:7,z:-30},{x:3,z:-24},{x:6,z:-26}]
};
function patrolPosition(round,bot,now){
  const site=assignedSite(round,bot),pts=PREP_POSITIONS[site.id]||[];
  if(!pts.length)return bot.anchor||site;
  if(!bot.patrolGoal||now>=(bot.patrolNext||0)||
      distance(bot,bot.patrolGoal)<.9){
    // Each operator cycles through staggered patrol routes around its room.
    // Never request a point inside the bomb cabinet or a solid desk.
    for(let k=0;k<pts.length;k++){
      bot.patrolIndex=((bot.patrolIndex??(bot.id%pts.length))+1)%pts.length;
      const p=pts[bot.patrolIndex];
      if(canStand(round,p,.38)&&distance(bot,p)>1.2){
        bot.patrolGoal=p;break;
      }
    }
    bot.patrolNext=now+5200+(bot.id%4)*900;
  }
  return bot.patrolGoal||bot.anchor||site;
}
export function updateDefenderPrep(round,now,dt,notify=()=>{}){
  const defenders=round.role==="defender"?round.allies:round.bots;
  const gadgets=round.world.gadgets,doors=round.world.barricades;
  for(let i=0;i<defenders.length;i++){
    const bot=defenders[i];if(!bot.alive)continue;
    if(!bot.setupTask){
      const spec=bot.operatorSpec?.id;
      const openings=doors?.openings||[];
      const west=openings.find(o=>o.id==="west-hall");
      const east=openings.find(o=>o.id==="east-hall");
      // Actual task ownership: special equipment has priority. Other
      // defenders board distinct hall entrances or set proximity sensors.
      let kind="sensor",opening=null,goal=bot.assignedSite;
      if(spec==="mute")kind="jammer";
      else if(spec==="castle"){kind="armor";opening=east||west;}
      else if(spec==="doc"||spec==="pulse")kind="sensor";
      else if(i%4===0){kind="board";opening=west;}
      else if(i%4===1){kind="board";opening=east;}
      else if(spec==="smoke")kind="sensor";
      else if(i%4===2)kind="jammer";
      if((kind==="board"||kind==="armor")&&opening){
        // Install FROM the room the operator defends. Never barricade a
        // door behind yourself and become permanently trapped outside.
        const side=bot.assignedSite.id==="A"?-1:1;
        goal={x:opening.x+(opening.axis==="z"?0:opening.x<0?.85:-.85),
          z:opening.z+(opening.axis==="z"?side*1.12:0)};
      }else if(kind==="jammer"){
        // Portable Mute equipment can be installed directly at a safe
        // operator position; don't path into the adjacent desk to set it.
        goal={x:bot.x,z:bot.z};
      }else{
        const loc=PREP_POSITIONS[bot.assignedSite.id]||[];
        const ordered=[loc[i%loc.length],...loc].filter(Boolean);
        const spot=ordered.find(p=>canStand(round,p,.44))||bot.anchor||
          bot.assignedSite;
        goal={x:spot.x,z:spot.z};
      }
      bot.setupTask={kind,opening,goal,placed:false,progress:0};
    }
    const task=bot.setupTask;
    if(task.placed){
      // A designated support operator reinforces the physical soft wall
      // after deploying its primary gadget. This uses the same panel
      // reinforcement animation/state and collider as the human player.
      const helper=defenders.find(b=>b.alive&&b.operatorSpec?.id==="doc")||
        defenders.find(b=>b.alive&&b.operatorSpec?.id==="pulse")||
        defenders[defenders.length-1];
      const panel=round.world.panels?.find(p=>p.x===0&&p.z===-37);
      if(bot===helper&&panel&&!panel.destroyed&&!panel.reinforced&&
         gadgets?.action?.panel!==panel){
        if(!bot.extraSetup){
          const possibilities=[{x:2.1,z:-35.5},{x:-2.1,z:-38.3},
            {x:3.1,z:-35.3},{x:-3.1,z:-38.5}];
          const goal=possibilities.filter(p=>canStand(round,p,.39)).
            sort((a,b)=>distance(bot,a)-distance(bot,b))[0];
          if(goal)bot.extraSetup={goal,progress:0,placed:false};
        }
        const extra=bot.extraSetup;
        if(extra&&!extra.placed){
          bot.allowBreach=false;
          if(distance(bot,extra.goal)>1.4){
            const speed=advanceTacticalBot(bot,extra.goal,round.world,dt,now);
            bot.state="reinforce-approach";bot.animate(dt,now,speed);
          }else{
            extra.progress+=dt*1000;
            bot.state="install-reinforcement";
            bot.setupProgress=Math.min(1,extra.progress/3000);
            panel.previewReinforcement(bot.setupProgress);
            bot.animate(dt,now,0);
            if(extra.progress>=3000){
              extra.placed=true;bot.setupProgress=0;
              panel.previewReinforcement(1);
              const ok=panel.reinforce();
              if(ok)notify("DEFENDER "+(bot.operatorSpec?.name||bot.id)+
                " · CENTRAL WALL REINFORCED","click",bot);
            }
          }
        }
      }
      continue;
    }
    bot.allowBreach=false;
    if(distance(bot,task.goal)>1.35){
      const speed=advanceTacticalBot(bot,task.goal,round.world,dt,now);
      // If a placement point becomes inaccessible, place portable devices
      // at the operator's nearest clear location after a real approach
      // attempt. Never teleport a barricade to a doorway.
      task.stall= speed<.20?(task.stall||0)+dt:0;
      if(task.stall>3.5&&
         (task.kind==="jammer"||task.kind==="sensor")&&canStand(round,bot,.45)){
        task.goal={x:bot.x,z:bot.z};task.stall=0;
      }
      bot.state="setup-approach";
      bot.animate(dt,now,speed);
      continue;
    }
    bot.state=task.kind==="armor"?"deploy-armor":
      task.kind==="board"?"install-barricade":
      task.kind==="jammer"?"deploy-jammer":"place-sensor";
    task.progress+=dt*1000;
    bot.setupProgress=clamp(task.progress/1700,0,1);
    bot.animate(dt,now,0);
    if(task.progress<1700)continue;
    task.placed=true;bot.setupProgress=0;
    if((task.kind==="armor"||task.kind==="board")&&task.opening){
      if(!doors?.hasBarricade(task.opening))doors?.place(task.opening,task.kind==="armor");
    }else if(task.kind==="jammer"&&gadgets){
      gadgets.deployJammer(task.goal.x,task.goal.z,
        bot.team==="ally"?"ally":"enemy");
    }else if(task.kind==="sensor"&&gadgets){
      gadgets.deployBotSensor?.(task.goal.x,task.goal.z,
        bot.team==="ally"?"ally":"enemy");
    }
    notify("DEFENDER "+(bot.operatorSpec?.name||bot.id)+" · "+
      task.kind.toUpperCase().replace("-"," ")+" SET","click",bot);
  }
}
// Tactical squad brain. Each bot can share *last known* enemy positions,
// but only unobstructed line of sight authorizes firing.
export function updateSquadCombat(round,now,dt,player,notify=()=>{}){
  round.playerRef=player;
  round.playerAlive=player.health>0;
  if(!round.teamIntel)round.teamIntel={ally:null,enemy:null};
  // Dropped carrier recovery is meaningful for the defending player:
  // another living attacker actually takes over the defuser role.
  if(round.role==="defender"&&round.phase==="guard"&&
     !round.bots.some(b=>b.alive&&b.carrier)){
    const successor=round.bots.find(b=>b.alive);
    if(successor){successor.carrier=true;notify("ATTACKERS RECOVERED THE DEFUSER");}
  }
  const combatants=[...round.bots,...round.allies];
  // Save this once per decision frame: all teammates need the same
  // disarm specialist, even while that operator is walking towards it.
  if(round.phase==="planted")designatedDefuser(round);
  for(const bot of combatants){
    if(!bot.alive)continue;
    const isAttack=isAttacking(round,bot);
    bot.allowBreach=isAttack;
    const enemies=bot.team==="ally"?round.bots:round.allies;
    const targets=live(enemies);
    if(bot.team==="enemy"&&round.playerAlive)
      targets.push({isPlayer:true,x:player.x,z:player.z,
        health:player.health});
    if(now>=(bot.nextSightAt||0)){
      bot.visibleTarget=null;bot.sightCache=false;
      if((bot.blindedUntil||0)>now){bot.nextSightAt=now+200;continue;}
      targets.sort((a,b)=>distance(bot,a)-distance(bot,b));
      // Do not waste frame time raycasting across the whole compound.
      for(const target of targets){
        if(distance(bot,target)>26)break;
        if(visible(round,bot,target)){
          bot.visibleTarget=target;bot.sightCache=true;
          bot.lastSeen={x:target.x,z:target.z,time:now};
          round.teamIntel[bot.team]={x:target.x,z:target.z,
            until:now+3900,siteId:round.siteAt(target)?.id||null};
          break;
        }
      }
      bot.nextSightAt=now+155+(bot.id%5)*34;
    }
    let target=bot.visibleTarget;
    if(target?.isPlayer&&!round.playerAlive)target=null;
    else if(target&&!target.isPlayer&&!target.alive)target=null;
    const dst=target?distance(bot,target):Infinity;
    const intel=round.teamIntel[bot.team];
    const sharedIntel=intel&&intel.until>now?intel:null;
    const home=assignedSite(round,bot);
    const anchor=bot.anchor||home;
    const gadgets=round.world.gadgets;
    const op=bot.operatorSpec?.id;
    if(!isAttack&&gadgets){
      // Operator-specific defender support continues AFTER prep. The bot
      // actually spends a limited gadget charge and the device stays in
      // the world for player/drone collision, detection and damage.
      if(op==="smoke"&&target&&dst<8&&now>=(bot.gadgetAt||0)&&
        (bot.gadgetUses||0)<2){
        const pos={x:bot.x+(target.x-bot.x)*.64,
          z:bot.z+(target.z-bot.z)*.64};
        gadgets.deployBotGas(pos.x,pos.z,bot.team,now);
        bot.gadgetUses=(bot.gadgetUses||0)+1;bot.gadgetAt=now+15000;
        bot.state="throw-gas";bot.lastShotAt=now;
        notify("SMOKE DEPLOYED GAS TO HOLD "+home.id,"click",bot);
      }
      if(op==="doc"&&now>=(bot.gadgetAt||0)&&
        (bot.gadgetUses||0)<3){
        const friends=(bot.team==="ally"?round.allies:round.bots).
          filter(b=>b.alive&&b.health<b.healthMax-30&&distance(bot,b)<3.5).
          sort((a,b)=>a.health-b.health);
        const patient=friends[0];
        if(patient){
          patient.health=Math.min(patient.healthMax,patient.health+48);
          bot.gadgetUses=(bot.gadgetUses||0)+1;bot.gadgetAt=now+5200;
          bot.state="stim-heal";bot.setupProgress=1;
          bot.lastShotAt=now;
          notify("DOC HEALED "+(patient.operatorSpec?.name||"SQUADMATE"),"click",bot);
        }
      }
      if(op==="pulse"&&now>=(bot.gadgetAt||0)){
        const enemy=targets.find(t=>distance(t,bot)<12.5);
        if(enemy){
          round.teamIntel[bot.team]={x:enemy.x,z:enemy.z,
            siteId:round.siteAt(enemy)?.id||null,until:now+3800};
          bot.state="heartbeat-scan";bot.lastShotAt=now;
        }
        bot.gadgetAt=now+6800;
      }
    }
    if(!isAttack&&round.phase!=="planted"){
      // A defender isn't a stationary turret. Patrol cover and doors
      // around its own site, then rotate when an actual contact arrives.
      patrolPosition(round,bot,now);
    }
    let goal=null,working=false;
    const defusing=round.phase==="planted"&&
      !isAttack&&bot===designatedDefuser(round);
    const planting=isAttack&&bot.carrier&&round.phase!=="planted";
    const dangerous=target&&dst<5.2;
    const pinned=(bot.suppressedUntil||0)>now||
      bot.health<bot.healthMax*.43;
    if(target){
      bot.state="engage";
      bot.group.rotation.y=Math.atan2(bot.x-target.x,bot.z-target.z);
      const shouldCover=!defusing&&!planting&&(dangerous||pinned);
      if(shouldCover&&(!bot.coverGoal||now>(bot.coverUntil||0))){
        bot.coverGoal=chooseCover(round,bot,target);
        bot.coverUntil=now+3100+(bot.id%4)*160;
      }
      if(defusing){
        // Disarm specialists head for the planted device while their
        // teammates engage. If a hostile is standing on it, clear first.
        goal=dst<4.1?null:round.plantPosition;
        bot.state=dst<4.1?"clear-defuser":"retake";
      }else if(planting){
        // Defuser carrier advances behind the entry pair, contesting an
        // immediate threat without aimlessly chasing every spotted enemy.
        if(dst<=5.4)goal=null;
        else goal=desiredPosition(round,bot,player);
        bot.state=dst<=5.4?"cover-carrier":"plant-approach";
      }else if(bot.coverGoal&&distance(bot,bot.coverGoal)>.78)
        {goal=bot.coverGoal;bot.state="seek-cover";}
      else if(isAttack&&dst>10.5){
        // Flank towards a side of the threat rather than rush its muzzle.
        const side=bot.id%2?1:-1;
        goal={x:target.x+side*2.3,z:target.z+(bot.id%3-1)*1.5};
        bot.state="flank";
      }else if(!isAttack&&distance(anchor,bot)>7.5){
        goal=anchor;bot.state="fallback";
      }else{
        // If no attacker is inside firing range, cycle positions instead
        // of spending the whole action phase rooted at the spawn.
        goal=!isAttack&&dst>6?patrolPosition(round,bot,now):null;
        bot.state=goal?"site-patrol":"hold-angle";
      }
    }else{
      bot.coverGoal=null;
      goal=desiredPosition(round,bot,player);
      bot.state=isAttack?"clear-site":"anchor";
      if(sharedIntel&&!defusing&&!planting){
        const withinHome=distance(anchor,sharedIntel)<8.8;
        if(isAttack&&distance(bot,sharedIntel)<17){
          const side=bot.id%2?1:-1;
          goal={x:sharedIntel.x+side*1.5,z:sharedIntel.z+(bot.id%3-1)*1.6};
          bot.state="team-flank";
        }else if(!isAttack&&withinHome&&distance(bot,sharedIntel)<10){
          goal={x:sharedIntel.x+(bot.id%2?1:-1)*2.0,
            z:sharedIntel.z+(bot.id%3-1)*1.2};
          bot.state="site-response";
        }
      }else if(bot.hearing&&bot.hearingUntil>now&&!planting&&!defusing){
        if(isAttack&&distance(bot,bot.hearing)<12||
           !isAttack&&distance(anchor,bot.hearing)<7){
          goal=bot.hearing;bot.state="investigate";
        }
      }
      if(goal&&distance(bot,goal)<1.0){
        if(!isAttack&&round.phase!=="planted"){
          bot.patrolNext=now;bot.patrolGoal=null;
        }
        goal=null;
      }
      if(!isAttack&&round.phase!=="planted"&&distance(bot,anchor)>9){
        goal=anchor;bot.state="return-to-site";
      }
    }
    // Keep the designated plant/disarm operator stationary during its
    // actual interaction. Teammates may keep shooting and covering.
    if(planting||defusing){
      const activity=maybeWorkDevice(round,bot,now,dt,notify);
      if(activity&&bot.working>0){
        goal=null;working=true;
        bot.state=planting?"planting":"disarming";
      }
    }
    if(["won","lost"].includes(round.phase))return;
    if(!working&&goal&&bot.recoveryGoal&&now<bot.recoveryUntil){
      goal=bot.recoveryGoal;bot.state="unstuck";
    }
    const moved=!working&&goal?
      advanceTacticalBot(bot,goal,round.world,dt,now):0;
    bot.movedLast=moved;
    if(moved>.34){
      bot.moved=(bot.moved||0)+moved*dt;
      bot.stuckFor=0;
      if(bot.moved>2.55){
        bot.moved=0;notify(null,bot.team==="ally"?"ally-step":"enemy-step",bot);
      }
    }else if(goal&&!working&&!bot.blockingBarricade&&distance(bot,goal)>1.3){
      // Release bots from tight corners/blocked destinations instead of
      // staring at the same stuck path forever.
      bot.stuckFor=(bot.stuckFor||0)+dt;
      if(bot.stuckFor>2.8){
        bot.stuckFor=0;bot.path=[];bot.lastGoal=null;
        bot.repathAt=now+120;
        const sign=(bot.id+Math.floor(now/2700))%2?1:-1;
        const dx=goal.x-bot.x,dz=goal.z-bot.z,len=Math.hypot(dx,dz)||1;
        const retreat={x:bot.x-sign*dz/len*1.5,
          z:bot.z+sign*dx/len*1.5};
        if(canStand(round,retreat)){
          bot.recoveryGoal=retreat;bot.recoveryUntil=now+1700;
        }else{
          bot.recoveryGoal=null;bot.recoveryUntil=0;
        }
      }
    }else bot.stuckFor=0;
    const door=bot.blockingBarricade;
    const barriers=round.world.barricades;
    if(isAttack&&door&&barriers?.hasBarricade(door)&&now>=bot.nextShot){
      const plank=door.planks.find(p=>!p.broken&&
        p.collider.maxY>.42&&p.collider.minY<1.6)||
        door.planks.find(p=>!p.broken);
      if(plank){
        barriers.hit(plank,34);
        bot.nextShot=now+450+(bot.id%4)*85;
        bot.lastShotAt=now;bot.state="breaching";
        notify(null,bot.team==="ally"?"ally-fire":"enemy-fire",bot);
      }
    }
    // A squad member may fire only at a target it ACTUALLY sees, never
    // solely because another bot shared a last-known position.
    if(target&&!working){
      bot.group.rotation.y=Math.atan2(bot.x-target.x,bot.z-target.z);
      fireAt(round,bot,target,now,notify);
    }
    bot.group.updateMatrixWorld(true);
    bot.animate(dt,now,moved);
  }
}
