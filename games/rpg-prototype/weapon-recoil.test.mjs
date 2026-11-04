import test from 'node:test';
import assert from 'node:assert/strict';
import {TEN_MM_PISTOL,PIPE_PISTOL,PIPE_RIFLE,LASER_MUSKET,
  DOUBLE_BARREL_SHOTGUN,PUMP_ACTION_SHOTGUN,BOLT_HUNTING_RIFLE,
  IRON_REVOLVER,PIPE_SMG} from './weapons.mjs';
import {WEAPON_RECOIL_PROFILES,weaponRecoilProfile,
  createWeaponRecoilState,resetWeaponRecoil,applyWeaponRecoil,
  countersteerWeaponRecoil,stepWeaponRecoil} from './weapon-recoil.mjs';

const arsenal=[TEN_MM_PISTOL,PIPE_PISTOL,PIPE_RIFLE,LASER_MUSKET,
  DOUBLE_BARREL_SHOTGUN,PUMP_ACTION_SHOTGUN,BOLT_HUNTING_RIFLE,
  IRON_REVOLVER,PIPE_SMG];
test('all nine rebuilt firearms have distinct authored recoil profiles',()=>{
  for(const gun of arsenal)assert.ok(WEAPON_RECOIL_PROFILES[gun.id],gun.id);
  assert.equal(new Set(arsenal.map(g=>JSON.stringify(weaponRecoilProfile(g)))).size,9);
});
test('every first shot kicks upward with a finite view and visibly moving model',()=>{
  for(const gun of arsenal){
    const state=createWeaponRecoilState();
    const before=.01;
    const shot=applyWeaponRecoil(state,before,.1,gun,{aiming:true});
    assert.ok(shot.pitch>before,gun.id);
    assert.ok(Number.isFinite(shot.yaw),gun.id);
    assert.ok(state.modelPitch>0&&state.modelBack>0,gun.id);
    assert.equal(shot.shotInBurst,1);
  }
});
test('all gun types retain distinct camera recoil magnitudes and stance effects',()=>{
  const impulse=(gun,opts)=>{
    const s=createWeaponRecoilState();
    return applyWeaponRecoil(s,0,0,gun,opts).pitch;
  };
  assert.ok(impulse(DOUBLE_BARREL_SHOTGUN,{})>impulse(TEN_MM_PISTOL,{}));
  assert.ok(impulse(BOLT_HUNTING_RIFLE,{})>impulse(PIPE_RIFLE,{}));
  assert.ok(impulse(PIPE_RIFLE,{})>impulse(LASER_MUSKET,{}));
  assert.ok(impulse(PIPE_SMG,{})<impulse(TEN_MM_PISTOL,{}));
  assert.ok(impulse(PIPE_PISTOL,{aiming:true})<impulse(PIPE_PISTOL,{}));
  assert.ok(impulse(PIPE_PISTOL,{crouched:true})<impulse(PIPE_PISTOL,{}));
  assert.ok(impulse(PIPE_PISTOL,{multiplier:1.2})>impulse(PIPE_PISTOL,{}));
});
test('SMG sustained fire accumulates view climb beyond legacy five-degree cap',()=>{
  const s=createWeaponRecoilState();let pitch=0,yaw=0;
  for(let i=0;i<15;i++){
    const hit=applyWeaponRecoil(s,pitch,yaw,PIPE_SMG,{aiming:true});
    pitch=hit.pitch;yaw=hit.yaw;
    for(let j=0;j<5;j++){
      const next=stepWeaponRecoil(s,pitch,yaw,.019,PIPE_SMG);
      pitch=next.pitch;yaw=next.yaw;
    }
  }
  assert.ok(pitch>.085,'15 rounds should have noticeable upward climb');
  assert.ok(pitch<.58,'bounded even for sustained spray');
  assert.ok(Math.abs(yaw)<.095,'horizontal drift remains bounded');
});
test('camera recovery is gradual, and never forces a downward firing kick',()=>{
  for(const gun of arsenal){
    const s=createWeaponRecoilState();
    let {pitch,yaw}=applyWeaponRecoil(s,0,0,gun,{});
    const first=stepWeaponRecoil(s,pitch,yaw,.016,gun);
    assert.equal(first.pitch,pitch,'initial impulse holds briefly');
    let previous=first.pitch;
    for(let i=0;i<250;i++){
      const next=stepWeaponRecoil(s,pitch,yaw,.016,gun);
      pitch=next.pitch;yaw=next.yaw;
      assert.ok(pitch>=-1e-7,'no downward overshoot');
      assert.ok(pitch<=previous+1e-7,'only downward return after kick');
      previous=pitch;
    }
    assert.ok(pitch<.001,gun.id);
    assert.ok(Math.abs(yaw)<.001,gun.id);
  }
});
test('mouse countersteer consumes pitch debt without overriding manual aim',()=>{
  const s=createWeaponRecoilState();
  let {pitch,yaw}=applyWeaponRecoil(s,.12,0,PIPE_RIFLE,{});
  const owed=s.pitchDebt;
  countersteerWeaponRecoil(s,0,owed/.002);
  assert.equal(s.pitchDebt,0);
  for(let i=0;i<100;i++){
    const next=stepWeaponRecoil(s,pitch,yaw,.016,PIPE_RIFLE);
    assert.equal(next.pitch,pitch);
    yaw=next.yaw;
  }
});
test('reset clears old gun pattern and both camera and model recoil debts',()=>{
  const s=createWeaponRecoilState();
  applyWeaponRecoil(s,0,0,PIPE_PISTOL,{});
  resetWeaponRecoil(s);
  assert.deepEqual(s,createWeaponRecoilState());
});
test('recoil respects steep camera-pitch limits without accumulating phantom debt',()=>{
  const s=createWeaponRecoilState();
  const almostVertical=Math.PI/2-.035-.001;
  const hit=applyWeaponRecoil(s,almostVertical,0,DOUBLE_BARREL_SHOTGUN,{});
  assert.ok(hit.pitch<=Math.PI/2-.035+1e-9);
  assert.ok(s.pitchDebt<=.0010001);
});

test('W20.38 each rebuilt gun has a distinctly forceful ADS kick',()=>{
  const minimumDegrees={
    '10mm-pistol':2.6,
    'pipe-pistol':4.2,
    'pipe-rifle':4.9,
    'laser-musket':3.0,
    'double-barrel-shotgun':9.0,
    'pump-action-shotgun':8.7,
    'bolt-hunting-rifle':8.2,
    'iron-revolver':6.8,
    'pipe-smg':1.15
  };
  for(const spec of arsenal){
    const recoil=createWeaponRecoilState();
    const shot=applyWeaponRecoil(recoil,0,0,spec,{aiming:true});
    assert.ok(shot.pitch*180/Math.PI>minimumDegrees[spec.id],
      spec.id+' recoil should visibly move the camera, even in ADS');
  }
});
test('W20.38 model movement grows with the heavier recoil without losing finite bounds',()=>{
  for(const gun of arsenal){
    const s=createWeaponRecoilState();
    const hit=applyWeaponRecoil(s,0,0,gun,{});
    assert.ok(Number.isFinite(hit.pitch)&&Number.isFinite(hit.yaw));
    assert.ok(s.modelPitch>0&&s.modelPitch<=.38);
    assert.ok(s.modelBack>0&&s.modelBack<=.16);
    assert.ok(s.pitchDebt<=.58);
  }
});
