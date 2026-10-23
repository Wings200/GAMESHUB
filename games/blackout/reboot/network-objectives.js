// BLACKOUT multiplayer objective adapter.
// Read-only presentation of the authoritative Durable Object state.
// Never advance the round or grant damage/defuser authority in the browser.
import {BOMB_RULES} from "./bomb-round.js";
const clamp=(n,low,high)=>Math.min(high,Math.max(low,Number(n)||0));
const secondsUntil=(when,now)=>Math.max(0,(Number(when||0)-now)/1000);
export function onlineBombView(snapshot,now=Date.now()){
 if(!snapshot||snapshot.mode!=="active"||!snapshot.world?.bomb)return null;
 const b=snapshot.world.bomb;
 const planted=b.phase==="planted";
 const completed=b.phase==="disabled";
 const phase=completed?"ended":planted?"postplant":
   snapshot.phase==="prep"?"prep":"action";
 const deadline=planted?b.expiresAt:snapshot.phaseEndsAt;
 const point=b.position&&Number.isFinite(b.position.x)&&
   Number.isFinite(b.position.z)?b.position:null;
 const status=planted?"planted":b.phase==="dropped"?"ground":"carried";
 const job=snapshot.world.interactions?.[snapshot.id]||null;
 const plantProgress=job?.kind==="plant"?
   clamp(BOMB_RULES.plantSeconds-secondsUntil(job.endsAt,now),0,BOMB_RULES.plantSeconds):0;
 const disableProgress=job?.kind==="disable"?
   clamp(BOMB_RULES.disableSeconds-secondsUntil(job.endsAt,now),0,BOMB_RULES.disableSeconds):0;
 const self=snapshot.self;
 return {
   mode:"bomb",map:"house",round:snapshot.round||1,
   phase,time:secondsUntil(deadline,now),score:{attack:0,defend:0},
   winner:null,reason:"",events:[],
   selectedSite:b.site||null,
   plantProgress,disableProgress,dropProgress:0,
   carrierId:b.carrierId||null,localCarrier:b.carrierId!=null&&
     String(b.carrierId)===String(snapshot.id),
   defuser:{status,carrier:b.carrierId||null,
     x:point?.x??0,y:point?.y??0,z:point?.z??0,
     yaw:Number(point?.yaw)||0,site:b.site||null},
   side:self?.side||null,
   interactionKind:job?.kind||null
 };
}
export function onlineInteractPrompt(view,side,player){
 if(!view)return "";
 const isAttack=side==="attack";
 if(view.phase==="prep")return isAttack?
   "PREPARATION · DRONE THE HOUSE · OPERATOR SPAWNS AT ACTION":
   "PREPARATION · SET UP DEFENSE";
 if(view.phase==="postplant")return isAttack?
   "DEFUSER ACTIVE · PROTECT UNTIL DETONATION":
   "DEFUSER PLANTED · HOLD F NEAR THE CASE TO DISABLE";
 if(view.phase==="ended")return "ROUND FINISHED";
 if(view.defuser.status==="ground")return isAttack?
   "DROPPED DEFUSER · PRESS F TO PICK UP":"DEFUSER DROPPED";
 if(isAttack&&view.localCarrier)return "CARRYING DEFUSER · HOLD X TO DROP · HOLD F IN A/B TO PLANT";
 if(isAttack)return "TEAMMATE CARRYING DEFUSER · COVER THEM";
 return "DEFEND THE BOMB SITES · PREVENT THE PLANT";
}
export function onlineObjectiveInteraction(snapshot){
 const job=snapshot?.world?.interactions?.[snapshot?.id];
 return job?.kind==="plant"||job?.kind==="disable"?job.kind:null;
}
