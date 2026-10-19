// BLACKOUT Map Studio V2. Pure transform calculations shared with tests.
// Y is a surface anchor for floors, so scaling a floor grows downward
// without silently lifting/lowering its walkable top surface.
export const SNAP_CHOICES=Object.freeze([0,.25,.5,1,2,4]);
export const snapNumber=(value,grid)=>{
  const n=Number(value),step=Number(grid);
  if(!Number.isFinite(n))return 0;
  if(!Number.isFinite(step)||step<=0)return Math.round(n*10000)/10000;
  return Math.round(Math.round(n/step)*step*10000)/10000;
};
export const snapPoint=(point,grid)=>{
  return {
    x:snapNumber(point.x,grid),
    y:snapNumber(point.y,grid),
    z:snapNumber(point.z,grid)
  };
};
export function applyGizmoToPiece(piece,transform,{grid=0,snap=true}={}){
  const step=snap?grid:0;
  const signedRotation=Number(transform.rotationY);
  const scale=transform.scale||{x:1,y:1,z:1};
  const next={
    ...piece,
    position:{
      x:snapNumber(transform.position.x,step),
      y:snapNumber(transform.position.y,step),
      z:snapNumber(transform.position.z,step)
    },
    size:{
      x:Math.max(.15,snapNumber(piece.size.x*Math.abs(scale.x),step)),
      y:Math.max(.12,snapNumber(piece.size.y*Math.abs(scale.y),step)),
      z:Math.max(.12,snapNumber(piece.size.z*Math.abs(scale.z),step))
    },
    rotationY:Number.isFinite(signedRotation)?signedRotation:piece.rotationY
  };
  next.position.x=Math.max(-300,Math.min(300,next.position.x));
  next.position.z=Math.max(-300,Math.min(300,next.position.z));
  next.position.y=Math.max(-12,Math.min(90,next.position.y));
  for(const key of ["x","z"])next.size[key]=Math.min(110,next.size[key]);
  next.size.y=Math.min(28,next.size.y);
  return next;
}
// Place centered walls and slabs at snapped origins. For floors, the Y
// position is always their walkable upper surface. Upper floors create
// ceiling surfaces automatically from their slab underside.
export function floorUndersideY(piece){
  if(piece.type!=="floor")return null;
  return piece.position.y-piece.size.y;
}
