import test from 'node:test';
import assert from 'node:assert/strict';
import {SCRAP_PISTOL,TEN_MM_PISTOL,PIPE_PISTOL,PIPE_RIFLE,ARSENAL,ARSENAL_IDS,getWeaponSpec,createArsenalStates,createWeaponState,setWeaponAim,startWeaponReload,cancelWeaponReload,updateWeapon,fireWeapon,createViewRecoilState,kickViewRecoil,recoverViewRecoil,shotSpreadDegrees} from './weapons.mjs';

test('Scrap pistol begins with a full magazine and fixed ammo reserve',()=>{
  const w=createWeaponState();
  assert.equal(w.magazine,12);
  assert.equal(w.reserve,48);
  assert.equal(w.reloadRemaining,0);
});
test('One shot consumes one round and cooldown stops extra rounds',()=>{
  const w=createWeaponState();
  assert.equal(fireWeapon(w,SCRAP_PISTOL,()=>.5).status,'fired');
  assert.equal(w.magazine,11);
  assert.equal(fireWeapon(w).status,'cooldown');
  assert.equal(w.magazine,11);
  updateWeapon(w,SCRAP_PISTOL.fireInterval);
  assert.equal(fireWeapon(w).status,'fired');
  assert.equal(w.magazine,10);
});
test('Empty pistol cannot shoot or magically create ammunition',()=>{
  const w=createWeaponState();w.magazine=0;w.reserve=0;
  assert.equal(fireWeapon(w).status,'empty');
  assert.equal(startWeaponReload(w),false);
  assert.equal(w.magazine,0);
});
test('Reload must complete and transfers only available reserve ammo',()=>{
  const w=createWeaponState();w.magazine=4;w.reserve=3;
  assert.equal(startWeaponReload(w),true);
  assert.equal(startWeaponReload(w),false);
  assert.equal(fireWeapon(w).status,'reloading');
  updateWeapon(w,1);
  assert.equal(w.magazine,4);
  updateWeapon(w,.66);
  assert.equal(w.magazine,7);assert.equal(w.reserve,0);
});
test('Cannot reload a full magazine or an already reloading weapon',()=>{
  const w=createWeaponState();
  assert.equal(startWeaponReload(w),false);
  w.magazine=11;
  assert.equal(startWeaponReload(w),true);
  assert.equal(startWeaponReload(w),false);
  updateWeapon(w,2);
  assert.equal(w.magazine,12);
  assert.equal(w.reserve,47);
});
test('Aiming down sights produces tighter spread than hipfiring',()=>{
  const hip=createWeaponState(),ads=createWeaponState();
  setWeaponAim(ads,true);
  const rng=()=>.5;
  const a=fireWeapon(hip,SCRAP_PISTOL,rng);
  const b=fireWeapon(ads,SCRAP_PISTOL,rng);
  assert.equal(a.status,'fired');assert.equal(b.status,'fired');
  assert.ok(Math.hypot(a.spreadX,a.spreadY)>Math.hypot(b.spreadX,b.spreadY));
});
test('Time-step cannot become negative or duplicate completed reload',()=>{
  const w=createWeaponState();w.magazine=5;
  startWeaponReload(w);
  updateWeapon(w,10);
  assert.equal(w.magazine,12);assert.equal(w.reserve,41);
  updateWeapon(w,10);
  assert.equal(w.reserve,41);
  assert.equal(w.reloadRemaining,0);
  assert.equal(w.cooldown,0);
});
test('Firing sequence cannot exceed current magazine capacity',()=>{
  const w=createWeaponState();let fired=0;
  for(let i=0;i<20;i++){
    if(fireWeapon(w).status==='fired')fired++;
    updateWeapon(w,.25);
  }
  assert.equal(fired,12);
  assert.equal(w.magazine,0);
  assert.equal(w.shotsFired,12);
});

test('Camera pitch-only recoil recovers to the original aim after one shot',()=>{
  const recoil=createViewRecoilState();const before=.2;
  let pitch=kickViewRecoil(recoil,before,SCRAP_PISTOL.recoilDegrees);
  assert.ok(pitch>before, 'Recoil must kick the camera upward, not down');
  for(let i=0;i<180;i++)pitch=recoverViewRecoil(recoil,pitch,1/60);
  assert.ok(Math.abs(pitch-before)<.00001);
  assert.equal(recoil.unrecovered,0);
});
test('Repeated rapid shots cannot create a permanent camera offset',()=>{
  const recoil=createViewRecoilState();const before=-.12;
  let pitch=before;
  for(let i=0;i<12;i++){
    pitch=kickViewRecoil(recoil,pitch,SCRAP_PISTOL.recoilDegrees);
    pitch=recoverViewRecoil(recoil,pitch,.08);
  }
  assert.ok(recoil.unrecovered>0 && recoil.unrecovered<=.08500001);
  for(let i=0;i<240;i++)pitch=recoverViewRecoil(recoil,pitch,1/60);
  assert.ok(Math.abs(pitch-before)<.00001);
  assert.equal(recoil.unrecovered,0);
});
test('Recoil handles extreme pitch without flipping the view and ignores bad delta time',()=>{
  const recoil=createViewRecoilState();const almostUp=Math.PI/2-.035;
  const kicked=kickViewRecoil(recoil,almostUp,1.25);
  assert.equal(kicked,almostUp);assert.equal(recoil.unrecovered,0);
  assert.equal(recoverViewRecoil(recoil,almostUp,-1),almostUp);
});

test('Planted ADS shots are zeroed; moving and jumping still increase spread',()=>{
  const aim=shotSpreadDegrees(SCRAP_PISTOL,true);
  const moving=shotSpreadDegrees(SCRAP_PISTOL,true,{speed:4.5});
  const jumping=shotSpreadDegrees(SCRAP_PISTOL,true,{speed:4.5,airborne:true});
  const crouching=shotSpreadDegrees(SCRAP_PISTOL,true,{crouched:true});
  assert.equal(aim,0,'A planted aimed shot must follow the visible reticle');
  assert.ok(moving>aim&&jumping>moving);
  assert.equal(crouching,0,'Crouching keeps the aimed sight zeroed');
  const w=createWeaponState();setWeaponAim(w,true);
  const f=fireWeapon(w,SCRAP_PISTOL,()=>.75,{speed:4.5,airborne:true});
  assert.equal(f.status,'fired');assert.equal(f.spreadDegrees,jumping);
});
test('Stationary approved hipfire remains identical and valid regardless of motion object',()=>{
  const w=createWeaponState();
  const shot=fireWeapon(w,SCRAP_PISTOL,()=>.5);
  assert.equal(shot.spreadDegrees,SCRAP_PISTOL.hipSpreadDegrees);
  assert.equal(w.magazine,11);
});

test('Nine weapon specifications have unique identities and different fire characteristics',()=>{
  assert.equal(ARSENAL.length,9);
  assert.equal(ARSENAL_IDS.length,9);
  assert.equal(new Set(ARSENAL_IDS).size,9);
  assert.strictEqual(getWeaponSpec(SCRAP_PISTOL.id),SCRAP_PISTOL);
  assert.throws(()=>getWeaponSpec('made-up'),/Unknown weapon/);
  for(const w of ARSENAL){
    assert.ok(w.magazineSize>0&&w.damage>0);
    assert.ok(w.fireInterval>0&&w.reloadSeconds>0&&w.startingReserve>0);
    assert.ok(w.adsSpreadDegrees<w.hipSpreadDegrees);
  }
  const damage=new Set(ARSENAL.map(w=>w.damage));
  assert.equal(damage.size,9);
  assert.ok(getWeaponSpec('pipe-smg').automatic);
  assert.ok(getWeaponSpec('service-carbine').automatic);
  assert.equal(getWeaponSpec('scrap-shotgun').pellets,8);
});
test('Individual weapons own independent magazines and reloading timers',()=>{
  const states=createArsenalStates();
  const revolver=getWeaponSpec('iron-revolver');
  const smg=getWeaponSpec('pipe-smg');
  fireWeapon(states[revolver.id],revolver,()=>.5);
  fireWeapon(states[smg.id],smg,()=>.5);
  assert.equal(states[revolver.id].magazine,5);
  assert.equal(states[smg.id].magazine,29);
  assert.equal(states[SCRAP_PISTOL.id].magazine,SCRAP_PISTOL.magazineSize);
  startWeaponReload(states[smg.id],smg);
  assert.ok(states[smg.id].reloadRemaining>0);
  assert.equal(states[revolver.id].reloadRemaining,0);
  updateWeapon(states[smg.id],smg.reloadSeconds,smg);
  assert.equal(states[smg.id].magazine,30);
  assert.equal(states[smg.id].reserve,149);
});
test('Shotgun fires eight distinct directions but consumes one shell',()=>{
  const spec=getWeaponSpec('scrap-shotgun'),state=createWeaponState(spec);
  let seed=0;
  const shot=fireWeapon(state,spec,()=>((++seed%11)+.5)/12);
  assert.equal(shot.status,'fired');
  assert.equal(state.magazine,spec.magazineSize-1);
  assert.equal(shot.directions.length,8);
  assert.ok(new Set(shot.directions.map(p=>p.spreadX.toFixed(6))).size>2);
  assert.equal(shot.damage,8);
  assert.equal(shot.recoilDegrees,spec.recoilDegrees);
  assert.equal(fireWeapon(state,spec).status,'cooldown');
});
test('Automatic weapons have meaningfully shorter cadence, heavy guns kick more',()=>{
  assert.ok(getWeaponSpec('pipe-smg').fireInterval<SCRAP_PISTOL.fireInterval);
  assert.ok(getWeaponSpec('hunting-rifle').recoilDegrees>SCRAP_PISTOL.recoilDegrees);
  const w=getWeaponSpec('hunting-rifle'),state=createWeaponState(w);
  setWeaponAim(state,true);
  const shot=fireWeapon(state,w,()=>.5);
  assert.equal(shot.damage,54);
  assert.ok(shot.spreadDegrees<.2);
});

test('Every single-projectile gun hits the exact sight center when planted in ADS',()=>{
  for(const spec of ARSENAL.filter(s=>(s.pellets||1)===1)){
    const state=createWeaponState(spec);setWeaponAim(state,true);
    const result=fireWeapon(state,spec,()=>.9,{speed:0});
    assert.equal(result.spreadDegrees,0,spec.id);
    assert.deepEqual(result.directions,[{spreadX:0,spreadY:0}],spec.id);
  }
  const shotgun=getWeaponSpec('scrap-shotgun'),state=createWeaponState(shotgun);
  setWeaponAim(state,true);
  const result=fireWeapon(state,shotgun,()=>.9,{speed:0});
  assert.deepEqual(result.directions[0],{spreadX:0,spreadY:0});
  assert.ok(result.directions.slice(1).some(p=>p.spreadX!==0||p.spreadY!==0));
});

test('Shell-fed reloads insert real rounds progressively, and a shot cancels the rest',()=>{
  for(const id of ['scrap-shotgun','hunting-rifle','iron-revolver']){
    const spec=getWeaponSpec(id),state=createWeaponState(spec);
    state.magazine=0;state.reserve=spec.magazineSize;
    assert.equal(startWeaponReload(state,spec),true,id);
    const duration=state.reloadDuration;
    assert.ok(duration>0&&duration<=spec.reloadSeconds);
    updateWeapon(state,duration*.62,spec);
    const loaded=state.magazine;
    assert.ok(loaded>=1&&loaded<spec.magazineSize,
      id+' must have usable partially loaded rounds');
    assert.equal(state.reserve,spec.magazineSize-loaded);
    const shot=fireWeapon(state,spec,()=>.5);
    assert.equal(shot.status,'fired',id+' can interrupt with a real shot');
    assert.equal(state.reloadRemaining,0);
    assert.equal(state.magazine,loaded-1);
    assert.equal(state.reserve,spec.magazineSize-loaded,
      'Interruption cannot duplicate ammunition');
    updateWeapon(state,20,spec);
    assert.equal(state.magazine,loaded-1,
      'Cancelled reload cannot add phantom rounds later');
  }
});
test('Single-round top-ups are faster and remaining shell count is accurate',()=>{
  const shotgun=getWeaponSpec('scrap-shotgun'),state=createWeaponState(shotgun);
  state.magazine=5;state.reserve=4;
  assert.equal(startWeaponReload(state,shotgun),true);
  assert.equal(state.reloadRounds,1);
  assert.ok(state.reloadDuration<shotgun.reloadSeconds*.6);
  updateWeapon(state,state.reloadDuration,shotgun);
  assert.equal(state.magazine,6);assert.equal(state.reserve,3);
  assert.equal(state.reloadRounds,0);
  assert.equal(startWeaponReload(state,shotgun),false);
});
test('Magazine swaps stay atomic and switching cancels without free ammo',()=>{
  const smg=getWeaponSpec('pipe-smg'),state=createWeaponState(smg);
  state.magazine=12;state.reserve=60;
  startWeaponReload(state,smg);
  updateWeapon(state,smg.reloadSeconds*.6,smg);
  assert.equal(state.magazine,12);
  assert.equal(cancelWeaponReload(state),true);
  assert.equal(state.magazine,12);assert.equal(state.reserve,60);
  assert.equal(startWeaponReload(state,smg),true);
  updateWeapon(state,smg.reloadSeconds,smg);
  assert.equal(state.magazine,30);assert.equal(state.reserve,42);
});

test('Recoil is restrained under bursts and settles quickly without pitching below the original view',()=>{
  const recoil=createViewRecoilState(),origin=-.25;
  let pitch=origin;
  for(let shot=0;shot<16;shot++)pitch=kickViewRecoil(recoil,pitch,5.2);
  assert.ok(pitch-origin<=.08500001,'Bursts must not force an eight-degree climb');
  let previous=pitch;
  for(let frame=0;frame<90;frame++){
    pitch=recoverViewRecoil(recoil,pitch,1/60);
    assert.ok(pitch<=previous+1e-9&&pitch>=origin-1e-8);
    previous=pitch;
  }
  assert.ok(Math.abs(pitch-origin)<.00001);
});

test('New 10mm pistol is semi-auto and performs a finite, atomic magazine reload',()=>{
  const spec=TEN_MM_PISTOL,state=createWeaponState(spec);
  assert.equal(spec.magazineSize,12);
  assert.equal(state.reserve,72);
  assert.equal(spec.automatic,false);
  const shot=fireWeapon(state,spec,()=>.5);
  assert.equal(shot.status,'fired');
  assert.equal(state.magazine,11);
  assert.equal(fireWeapon(state,spec).status,'cooldown');
  assert.equal(startWeaponReload(state,spec),true);
  updateWeapon(state,spec.reloadSeconds*.5,spec);
  assert.equal(state.magazine,11,'the physical magazine is still out');
  updateWeapon(state,spec.reloadSeconds*.5,spec);
  assert.equal(state.magazine,12);
  assert.equal(state.reserve,71);
  assert.equal(state.reloadRemaining,0);
});

test('New pipe pistol has distinct 8-round magazines and no phantom rounds',()=>{
  const spec=PIPE_PISTOL,state=createWeaponState(spec);
  assert.equal(spec.magazineSize,8);
  assert.equal(spec.kind,'pistol');
  assert.equal(state.reserve,64);
  assert.ok(spec.damage<TEN_MM_PISTOL.damage);
  assert.ok(spec.recoilDegrees>TEN_MM_PISTOL.recoilDegrees);
  assert.equal(fireWeapon(state,spec,()=>.5).status,'fired');
  assert.equal(state.magazine,7);
  assert.equal(fireWeapon(state,spec).status,'cooldown');
  assert.equal(startWeaponReload(state,spec),true);
  updateWeapon(state,spec.reloadSeconds*.5,spec);
  assert.equal(state.magazine,7);
  updateWeapon(state,spec.reloadSeconds*.5,spec);
  assert.equal(state.magazine,8);
  assert.equal(state.reserve,63);
});

test('New semi-auto pipe rifle uses 15-round detachable mags and real reserve',()=>{
  const spec=PIPE_RIFLE,state=createWeaponState(spec);
  assert.equal(spec.kind,'carbine');
  assert.equal(spec.automatic,false);
  assert.equal(spec.magazineSize,15);
  assert.equal(spec.startingReserve,90);
  assert.ok(spec.damage>PIPE_PISTOL.damage);
  assert.ok(spec.damage>TEN_MM_PISTOL.damage);
  assert.equal(fireWeapon(state,spec,()=>.5).status,'fired');
  assert.equal(state.magazine,14);
  assert.equal(fireWeapon(state,spec).status,'cooldown');
  assert.equal(startWeaponReload(state,spec),true);
  updateWeapon(state,spec.reloadSeconds/2,spec);
  assert.equal(state.magazine,14);
  updateWeapon(state,spec.reloadSeconds/2,spec);
  assert.equal(state.magazine,15);
  assert.equal(state.reserve,89);
  setWeaponAim(state,true);
  updateWeapon(state,spec.fireInterval,spec);
  assert.equal(shotSpreadDegrees(spec,true,{speed:0,airborne:false}),0);
});
