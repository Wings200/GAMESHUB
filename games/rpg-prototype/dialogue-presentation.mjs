// W21.02: Pure NPC conversation presentation and one-session barter checks.
// Mission branching remains in campaign.mjs and trade authority in vendors.mjs.
export const VENDOR_CONVERSATIONS=Object.freeze({
  arms:Object.freeze({greeting:'Need something that shoots straight? I can sell you a gun, but the ammunition is what keeps you breathing.',
    topic:'The caravans lose as much ammunition to rust as they do to Raiders. I inspect everything before it goes on the rack.'}),
  armor:Object.freeze({greeting:'The wasteland hits hard. Put on something solid before you go chasing trouble.',
    topic:'Plates do not make you immortal. If your gear leaves gaps, someone out there will find them.'}),
  medic:Object.freeze({greeting:'You look like you could use a moment off your feet. I have medicine, food, water and a few chems.',
    topic:'Untreated injuries slow you down, and radiation steals your maximum health. Keep supplies on you.'}),
  scavenger:Object.freeze({greeting:'Welcome to the junk pile. What looks worthless to you might keep the settlement running another day.',
    topic:'Fans, clocks and old appliances break down into real components. Store them at Haven and the benches will use what they need.'}),
  'dominion-quartermaster':Object.freeze({greeting:'Dominion equipment is issued on trust. Show me your credentials before you ask for armor.',
    topic:'Our power armor is recovered and repaired one plate at a time. You earn access through service, not promises.'}),
  'vultures-armorer':Object.freeze({greeting:'Good parts are hard to come by. Harder still to hold onto. We remember who helps keep our routes open.',
    topic:'Those plates came from fights worth remembering. I only trade with people who have proven themselves.'})
});

export const DIALOGUE_CHOICES_PER_PAGE=3;
export function dialoguePage(options,page=0){
  const list=Array.isArray(options)?options:[];
  const pages=Math.max(1,Math.ceil(list.length/DIALOGUE_CHOICES_PER_PAGE));
  const index=Number.isSafeInteger(page)?Math.max(0,Math.min(page,pages-1)):0;
  return {options:list.slice(index*DIALOGUE_CHOICES_PER_PAGE,
      (index+1)*DIALOGUE_CHOICES_PER_PAGE),page:index,pages,
    hasPrevious:index>0,hasNext:index+1<pages};
}

export function charismaCheck(score,required=6){
  const value=Number.isFinite(score)?Math.max(0,Math.floor(score)):0;
  return {passed:value>=required,actual:value,required};
}

export function negotiatedTradeModifiers(modifiers={},bonus=0){
  const factor=Math.max(0,Math.min(.12,Number.isFinite(bonus)?bonus:0));
  const buy=Number.isFinite(modifiers.barterBuyMultiplier)?modifiers.barterBuyMultiplier:1;
  const sell=Number.isFinite(modifiers.barterSellMultiplier)?modifiers.barterSellMultiplier:1;
  return {...modifiers,barterBuyMultiplier:Math.max(.5,buy*(1-factor)),
    barterSellMultiplier:Math.min(1.5,sell*(1+factor))};
}
