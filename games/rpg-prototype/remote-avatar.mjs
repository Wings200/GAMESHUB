// W09.5: Multiplayer-facing character renderer. Camera mode is LOCAL ONLY.
// Every remote participant has an independent, world-space survivor model.
// This adapter accepts a future authoritative network snapshot but never
// accepts a first-/third-person visibility flag from another client.
import {createPlayerAvatar} from './player-avatar.mjs';

export function createRemotePlayerVisual(scene,playerId){
  if(typeof playerId!=='string'||!playerId.trim())
    throw Error('Remote character requires a stable player ID');
  const avatar=createPlayerAvatar(scene);
  avatar.root.name='RemotePlayer:'+playerId;
  function sync(snapshot={},dt=0){
    avatar.setArmor(snapshot.armor||{});
    avatar.update({
      dt,x:Number.isFinite(snapshot.x)?snapshot.x:0,
      z:Number.isFinite(snapshot.z)?snapshot.z:0,
      ground:Number.isFinite(snapshot.ground)?snapshot.ground:0,
      jump:Number.isFinite(snapshot.jump)?snapshot.jump:0,
      yaw:Number.isFinite(snapshot.yaw)?snapshot.yaw:0,
      pitch:Number.isFinite(snapshot.pitch)?snapshot.pitch:0,
      speed:Number.isFinite(snapshot.speed)?snapshot.speed:0,
      sprinting:!!snapshot.sprinting,crouched:!!snapshot.crouched,
      aiming:!!snapshot.aiming,alive:snapshot.alive!==false
    });
    // Only an authoritative disconnect/despawn hides a remote body.
    // Their own V key and our local camera NEVER control this flag.
    avatar.root.visible=snapshot.connected!==false;
  }
  return {
    root:avatar.root,sync,
    get state(){return {
      id:playerId,visible:avatar.root.visible,armor:avatar.armor,
      armorPieces:avatar.visibleArmorPieces,height:avatar.metrics.height
    };},
    dispose:()=>avatar.dispose()
  };
}
