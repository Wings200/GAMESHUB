// W09.11: small, autonomous fire teams plan from confirmed contact, not a live target.
// The director is pure game state and supports any number of NPCs.
import {AI_TUNING} from './enemy-ai.mjs';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const hashId=id=>[...String(id)].reduce((hash,char)=>(Math.imul(hash,31)+char.charCodeAt(0))|0,17);
const kindOf=unit=>unit.tactics?.kind||unit.kind||unit.id;
const combatReady=unit=>Math.max(0,unit.state?.health??unit.health??100)>0;
const ammoOf=unit=>(unit.tactics?.magazine??5)+(unit.tactics?.reserve??0);
const inBox=(point,box)=>point.x>box.minX-.45&&point.x<box.maxX+.45&&
  point.z>box.minZ-.45&&point.z<box.maxZ+.45;
const near=(a,b)=>distance(a,b)<.55;
const copy=p=>({x:p.x,z:p.z});

export function createSquadDirector(){return {clock:0,orders:new Map()};}
export function resetSquadDirector(director){
  director.clock=0;director.orders.clear();return director;
}
function assignedGoal(unit,contact,role,obstacles,serial){
  const dx=contact.x-unit.brain.x,dz=contact.z-unit.brain.z;
  const length=Math.max(.001,Math.hypot(dx,dz));
  const forward={x:dx/length,z:dz/length};
  const side={x:-forward.z,z:forward.x};
  const sign=(hashId(unit.id)+serial)%2===0?1:-1;
  const lateral=role==='flank'?5.4:role==='support'?2.8:0;
  const distanceShort=role==='flank'?1.8:role==='support'?3.8:0;
  const area=AI_TUNING.navigationArea;
  const candidate=(sideFactor,backFactor)=>({
    x:clamp(contact.x+side.x*lateral*sideFactor-forward.x*distanceShort*backFactor,
      area.minX+.6,area.maxX-.6),
    z:clamp(contact.z+side.z*lateral*sideFactor-forward.z*distanceShort*backFactor,
      area.minZ+.6,area.maxZ-.6)
  });
  // A planned waypoint must not live inside a solid crate or wall.
  for(const pair of [[sign,1],[-sign,1],[sign,1.7],[-sign,1.7]]){
    const goal=candidate(...pair);
    if(!obstacles.some(box=>inBox(goal,box)))return goal;
  }
  return null;
}
function groupsFor(units){
  const waiting=[...units].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  const groups=[];
  while(waiting.length){
    const first=waiting.shift(),group=[first];
    for(let i=0;i<waiting.length&&group.length<4;){
      const next=waiting[i];
      if(distance(first.brain.lastSeen,next.brain.lastSeen)<=13&&
        distance(first.brain,next.brain)<=30){
        group.push(next);waiting.splice(i,1);
      }else i++;
    }
    groups.push(group);
  }
  return groups;
}
function chooseRoles(group){
  const assigned=new Map();
  const remaining=[...group];
  const take=score=>{
    remaining.sort((a,b)=>score(b)-score(a)||
      String(a.id).localeCompare(String(b.id)));
    return remaining.shift();
  };
  if(group.length>1){
    const anchor=take(unit=>(kindOf(unit)==='enforcer'?10:0)+
      (kindOf(unit)==='scout'?-5:0)+
      ((unit.state?.health??unit.health??100)<35?2:0)+
      (ammoOf(unit)===0?2:0));
    assigned.set(anchor.id,'watch');
  }
  if(group.length>=3){
    const flanker=take(unit=>(kindOf(unit)==='scout'?10:0)+
      ((unit.state?.health??unit.health??100)>55?2:0)+
      (ammoOf(unit)>4?2:-4));
    assigned.set(flanker.id,'flank');
  }
  // At least one actor must investigate; additional actors support.
  if(remaining.length){
    const investigator=take(unit=>(kindOf(unit)==='raider'?4:0)+
      (ammoOf(unit)>0?2:0));
    assigned.set(investigator.id,'investigate');
  }
  for(const unit of remaining)assigned.set(unit.id,'support');
  return assigned;
}
/**
 * Returns a Map of order objects for enemies who are no longer visible.
 * Visible enemies make their own immediate combat choices. Hidden players
 * are intentionally not an input to this function.
 */
export function planSquadOrders(director,team,dt,obstacles=[]){
  director.clock+=clamp(Number.isFinite(dt)?dt:0,0,.1);
  const engaged=team.filter(unit=>combatReady(unit)&&
    unit.state?.alive!==false&&unit.visible===false&&
    unit.brain?.active!==false&&unit.brain?.lastSeen&&
    (unit.brain.memory>0||unit.brain.mode==='search'||unit.brain.mode==='investigate'));
  const activeIds=new Set(engaged.map(e=>e.id));
  for(const id of director.orders.keys())if(!activeIds.has(id))director.orders.delete(id);
  const result=new Map();
  for(const group of groupsFor(engaged)){
    const roles=chooseRoles(group);
    const signature=group.map(unit=>String(unit.id)).sort().join('|');
    for(const unit of group){
      const role=roles.get(unit.id);
      let order=director.orders.get(unit.id);
      // Keep an order committed until contact materially changes, the team
      // changes, or this enemy independently reacquires the player.
      if(!order||order.signature!==signature||
        distance(order.contact,unit.brain.lastSeen)>2.5){
        const contact=copy(unit.brain.lastSeen);
        order={type:role,contact,signature,
          goal:assignedGoal(unit,contact,role,obstacles,hashId(signature)),
          until:director.clock+(role==='watch'?2.4+Math.abs(hashId(unit.id)%11)*.12:0)};
        director.orders.set(unit.id,order);
      }
      // A watcher does not remain permanently glued to the corner.
      if(order.type==='watch'&&director.clock>=order.until){
        order.type='investigate';order.goal=null;
      }
      // A flanker/backup who reaches its offset starts checking the vicinity.
      if(order.goal&&near(unit.brain,order.goal)){
        order.type='investigate';order.goal=null;
      }
      result.set(unit.id,{type:order.type,
        contact:copy(order.contact),goal:order.goal&&copy(order.goal)});
    }
  }
  return result;
}
