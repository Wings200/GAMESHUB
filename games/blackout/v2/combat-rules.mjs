// Browser-independent checks for weapon actions. A click to capture the
// pointer is still a valid fire input; pointer lock is intentionally not a
// prerequisite for spending a round.
export function canFireInput({screen,paused,view,phase,interaction}) {
  return screen==='game'&&!paused&&view==='player'&&
    (phase==='action'||phase==='postplant')&&!interaction;
}

export function canFirePointerDown({button,...state}) {
  return button===0&&canFireInput(state);
}

export function spendRound({view,shotDelay,reloadDelay,ammo}) {
  if(view!=='player'||shotDelay>0||reloadDelay>0||ammo<=0)
    return {fired:false,ammo};
  return {fired:true,ammo:ammo-1};
}
