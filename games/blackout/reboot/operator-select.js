// BLACKOUT V0.14.2 · special MMB and normal G selected gadgets update live HUD.
// Every rendered card comes from operators.js. In-development concepts are
// visibly labeled as such; they are not purchasable or selectable yet.
import {newOperatorSelection,switchOperatorSide,pickOperator,selectedOperator,
 operatorsForSide,operatorLoadout,ARMOR_LABELS} from "./operators.js?v=reboot-025";
import {secondaryOptions,newSecondaryPlans,plannedSecondaries,
 planSecondary,gadgetById} from "./secondary-loadout.js?v=reboot-045";

export function createOperatorPicker(root,{onSelect=()=>{},onPlanChange=()=>{}}={}){
 if(!root)throw new Error("Operator selection root is required");
 const $=id=>root.querySelector("#"+id);
 const attackTab=$("operator-attack"),defendTab=$("operator-defend");
 const grid=$("operator-roster"),name=$("operator-name"),description=$("operator-role");
 const speed=$("operator-speed"),armor=$("operator-armor"),slots=$("operator-slots");
 const planStatus=$("operator-plan-status");
 // The deploy button lives outside #operator-selection. Looking for its
 // label through root.querySelector throws at startup and blocks both tabs.
 const stateLabel=$("operator-playable-label"),current=document.getElementById("operator-current");
 if([attackTab,defendTab,grid,name,description,speed,armor,slots,planStatus,stateLabel,current]
    .some(x=>!x))throw new Error("Operator picker markup is incomplete");
 let selection=newOperatorSelection();
 let plans=newSecondaryPlans();
 function statPips(container,level){
  container.replaceChildren();
  for(let i=1;i<=3;i++){
   const pip=document.createElement("span");
   pip.className="operator-pip"+(i<=level?" filled":"");
   pip.setAttribute("aria-hidden","true");
   container.append(pip);
  }
  container.setAttribute("aria-label",String(level)+" out of 3");
 }
 function render(){
  const op=selectedOperator(selection),loadout=operatorLoadout(op);
  const attacking=selection.side==="attack";
  attackTab.classList.toggle("active",attacking);
  defendTab.classList.toggle("active",!attacking);
  attackTab.setAttribute("aria-pressed",String(attacking));
  defendTab.setAttribute("aria-pressed",String(!attacking));
  grid.replaceChildren();
  for(const candidate of operatorsForSide(selection.side)){
   const playable=candidate.playable;
   const card=document.createElement(playable?"button":"div");
   if(playable)card.type="button";
   card.className="operator-card"+(playable?" selectable":" planned")+
    (candidate.id===op.id?" selected":"");
   const badge=document.createElement("span");
   badge.className="operator-card-mark";badge.textContent=candidate.portrait;
   const content=document.createElement("span");content.className="operator-card-copy";
   const label=document.createElement("strong");label.textContent=candidate.name;
   const sub=document.createElement("small");
   sub.textContent=playable?candidate.role:"IN DEVELOPMENT";
   content.append(label,sub);
   card.append(badge,content);
   if(playable){
    card.setAttribute("aria-pressed",String(candidate.id===op.id));
    card.addEventListener("click",()=>{
     selection=pickOperator(selection,candidate.id);
     render();
     onSelect(selectedOperator(selection));
    });
   }else{
    card.setAttribute("aria-label",candidate.name+" — unique gadget not implemented yet");
   }
   grid.append(card);
  }
  name.textContent=op.name;
  description.textContent=op.role+" · "+(attacking?"ATTACKER":"DEFENDER");
  current.textContent=op.name;
  stateLabel.textContent="PLAYABLE · FREE";
  statPips(speed,op.speed);statPips(armor,op.armor);
  armor.title=ARMOR_LABELS[op.armor];
  slots.replaceChildren();
  const picks=plannedSecondaries(plans,op);
  for(let index=0;index<loadout.slots.length;index++){
   const slot=loadout.slots[index];
   const el=document.createElement("div");el.className="operator-utility-slot";
   const label=document.createElement("strong");
   label.textContent=slot.type==="signature"?"SIGNATURE · FUTURE · MIDDLE CLICK":index===0?"SPECIAL GADGET · MIDDLE MOUSE CLICK":"NORMAL GADGET · G";
   el.append(label);
   if(slot.type==="secondary"&&op.playable){
    const select=document.createElement("select");
    select.className="operator-gadget-select";
    select.setAttribute("aria-label",op.name+" gadget plan slot "+(index+1));
    const empty=document.createElement("option");
    empty.value="";empty.textContent="— NONE PLANNED —";
    select.append(empty);
    for(const g of secondaryOptions(op.side)){
     const option=document.createElement("option");
     option.value=g.id;option.textContent=g.name+(g.implemented?" · READY":" · PLANNED");
     select.append(option);
    }
    select.value=picks[index]||"";
    select.addEventListener("change",()=>{
     const value=select.value||null;
     const next=planSecondary(plans,op,index,value);
     const rejected=next===plans&&value!==picks[index];
     if(!rejected)plans=next;
     render();
     if(!rejected)onPlanChange(selectedOperator(selection),plans);
     planStatus.textContent=rejected?
      "INVALID SELECTION · CHOOSE TWO DIFFERENT GADGETS FOR THIS SIDE":
      "PLAN SAVED FOR "+op.name+(["barbed-wire","c4","impact","frag","flash","smoke","soft-breach","hard-breach"].includes(value)?
        " · FUNCTIONING GADGET READY":" · OTHER GADGETS REMAIN PREVIEWS");
    });
    el.append(select);
   }
   const status=document.createElement("small");
   const planned=slot.type==="secondary"?gadgetById(picks[index]):null;
   status.textContent=planned?(planned.implemented?
    "LIVE GADGET · READY IN RANGE":"DESIGN PICK · NOT BUILT YET"):
    "UNASSIGNED · GADGETS IN DEVELOPMENT";
   el.append(status);slots.append(el);
  }
  planStatus.textContent=picks.some(id=>["barbed-wire","c4","impact","frag","flash","smoke","soft-breach","hard-breach"].includes(id))?
   "READY GADGET SELECTED · OTHER OPTIONS STILL PREVIEWS":
   "EIGHT GADGETS WORK · HARD / SOFT BREACH / SMOKE / FLASH / FRAG / C4 / IMPACT / WIRE";
 }
 attackTab.addEventListener("click",()=>{
  selection=switchOperatorSide(selection,"attack");
  render();onSelect(selectedOperator(selection));
 });
 defendTab.addEventListener("click",()=>{
  selection=switchOperatorSide(selection,"defend");
  render();onSelect(selectedOperator(selection));
 });
 render();
 return {
  get operator(){return selectedOperator(selection);},
  get selection(){return selection;},
  get plans(){return plans;},
  showSide(side){
   selection=switchOperatorSide(selection,side);
   render();onSelect(selectedOperator(selection));
  },
  render
 };
}
