import test from 'node:test';
import assert from 'node:assert/strict';
import {WORLD_WEAPON_GRIPS,solveWeaponArmReach,GRIP_ARM_LENGTHS} from './weapon-grip-ik.mjs';
const worldRootOffsets=Object.freeze({
  '10mm-pistol':[0,-.065,0],'pipe-pistol':[0,-.067,0],
  'pipe-rifle':[0,-.085,.045],'laser-musket':[0,-.085,.045],
  'double-barrel-shotgun':[0,-.085,.045],
  'pump-action-shotgun':[0,-.09,.038],
  'bolt-hunting-rifle':[0,-.075,.033],
  'iron-revolver':[0,-.035,.03],'pipe-smg':[0,-.05,.02]
});
const socket=[.025,.50,-.20];
const toShoulder=(id,hand)=>{
  const p=WORLD_WEAPON_GRIPS[id],point=p[hand],offset=worldRootOffsets[id];
  const side=hand==='left'?-1:1;
  return [
    socket[0]+offset[0]+point[0]*p.scale-side*.392,
    socket[1]+offset[1]+point[1]*p.scale-.53,
    socket[2]+offset[2]+(p.holdOffsetZ||0)+point[2]*p.scale
  ];
};
test('Every rebuilt weapon has two physical grip markers and true world scale',()=>{
  assert.equal(Object.keys(WORLD_WEAPON_GRIPS).length,9);
  for(const [id,g] of Object.entries(WORLD_WEAPON_GRIPS)){
    assert.ok(worldRootOffsets[id],id);
    assert.equal(g.right.length,3);assert.equal(g.left.length,3);
    assert.ok(g.scale>=.64&&g.scale<=.80);
    for(const hand of [g.right,g.left])hand.forEach(n=>assert.ok(Number.isFinite(n)));
  }
});
test('All nine gun models put left and right wrist within the real two-bone reach',()=>{
  for(const id of Object.keys(WORLD_WEAPON_GRIPS)){
    for(const [hand,side] of [['left',-1],['right',1]]){
      const solution=solveWeaponArmReach(toShoulder(id,hand),side);
      assert.ok(solution.distance<.755,id+' '+hand+' unreachable '+solution.distance);
      assert.ok(solution.excessReach<.000001);
      assert.ok(solution.upperError<1e-8,id+' '+hand+' upper bone');
      assert.ok(solution.lowerError<1e-8,id+' '+hand+' lower bone');
    }
  }
});
test('Pistols extend in front of the torso but long-gun stocks stay against it',()=>{
  for(const id of ['10mm-pistol','pipe-pistol','iron-revolver'])
    assert.ok(WORLD_WEAPON_GRIPS[id].holdOffsetZ<=-.18);
  for(const id of ['pipe-rifle','laser-musket','double-barrel-shotgun','pump-action-shotgun','bolt-hunting-rifle','pipe-smg'])
    assert.equal(WORLD_WEAPON_GRIPS[id].holdOffsetZ,undefined);
});
test('SMG support hand meets wood and revolver support hand cups shared grip',()=>{
  const smg=WORLD_WEAPON_GRIPS['pipe-smg'];
  assert.ok(smg.left[2]>-.80&&smg.left[2]<-.30);
  const revolver=WORLD_WEAPON_GRIPS['iron-revolver'];
  assert.ok(Math.abs(revolver.left[2]-revolver.right[2])<.02);
});
test('Reach solver clamps impossible targets instead of stretching upper or lower arm',()=>{
  const far=solveWeaponArmReach([3,.4,-2],-1);
  assert.ok(far.excessReach>0);
  assert.ok(far.reach<=GRIP_ARM_LENGTHS.upper+GRIP_ARM_LENGTHS.lower);
  assert.ok(far.upperError<1e-8&&far.lowerError<1e-8);
  const near=solveWeaponArmReach([0,0,0],1);
  assert.ok(near.upperError<1e-8&&near.lowerError<1e-8);
  assert.ok(near.elbow.every(Number.isFinite));
});
test('NPC foregrip and trigger grip also stay reachable using the same player arm rig',()=>{
  const npcGunOffset=[0,-.06,-.04],npcGrips={right:[.075,-.19,-.025],left:[-.085,-.055,-.355]};
  for(const [hand,side] of [['right',1],['left',-1]]){
    const p=npcGrips[hand],v=[
      socket[0]+npcGunOffset[0]+p[0]-side*.392,
      socket[1]+npcGunOffset[1]+p[1]-.53,
      socket[2]+npcGunOffset[2]+p[2]
    ];
    const pose=solveWeaponArmReach(v,side);
    assert.ok(pose.distance<.755);
    assert.ok(pose.upperError<1e-8&&pose.lowerError<1e-8);
  }
});
