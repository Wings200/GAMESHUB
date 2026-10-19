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
export function applyGizmoToPiece(piece,transform,{grid=0,snap=true,mode="both"}={}){
  const step=snap?grid:0;
  const signedRotation=Number(transform.rotationY);
  const scale=transform.scale||{x:1,y:1,z:1};
  // Translating must NEVER secretly resize a .25m wall slab into a 1m slab;
  // resizing must NEVER shift an upper floor down to the nearest whole metre.
  const move=mode==="translate"||mode==="both";
  const resize=mode==="scale"||mode==="both";
  const next={
    ...piece,
    position:move?{
      x:snapNumber(transform.position.x,step),
      y:snapNumber(transform.position.y,step),
      z:snapNumber(transform.position.z,step)
    }:{...piece.position},
    size:resize?Object.fromEntries(["x","y","z"].map(axis=>{
      const factor=Math.abs(Number(scale[axis])||1);
      const unchanged=Math.abs(factor-1)<1e-5;
      // Don't round a .25m floor slab thickness to ZERO when its WIDTH
      // was the only dimension being scaled with a 1m grid.
      const dimensionStep=(axis==="y"&&["floor","ceiling"].includes(piece.type))?
        Math.min(step||.25,.25):step;
      const raw=piece.size[axis]*factor;
      return [axis,unchanged?piece.size[axis]:
        Math.max(axis==="y"?.12:.15,snapNumber(raw,dimensionStep))];
    })):{...piece.size},
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

// Magnetic edge alignment is applied AFTER integer grid snapping, so
// differently sized modules (e.g. a 3.1m soft wall beside a 4m hard wall)
// join flush without leaving visible cracks. Shift temporarily bypasses it.
export function magnetizeEdges(piece,elements,threshold=.7){
  if(!["floor","hardWall","softWall","reinforcedWall","ceiling"].includes(piece.type))
    return piece;
  const original={...piece,position:{...piece.position}};
  const p=original.position;
  const eligible=new Set(piece.type==="floor"?["floor"]:
    piece.type==="ceiling"?["ceiling"]:
      ["hardWall","softWall","reinforcedWall"]);
  let best={x:Infinity,z:Infinity};
  for(const other of elements){
    if(other.id===piece.id||!eligible.has(other.type)||
      Math.abs(other.position.y-piece.position.y)>.25)continue;
    const a=(((piece.rotationY||0)%180)+180)%180;
    const b=(((other.rotationY||0)%180)+180)%180;
    if(Math.abs(a-b)>1.5)continue;
    const swapped=Math.abs(Math.sin(piece.rotationY*Math.PI/180))>.7;
    const otherSwap=Math.abs(Math.sin((other.rotationY||0)*Math.PI/180))>.7;
    const extent=(item,axis,flip)=>{
      if(flip)return axis==="x"?item.size.z:item.size.x;
      return axis==="x"?item.size.x:item.size.z;
    };
    for(const axis of ["x","z"]){
      const otherHalf=extent(other,axis,otherSwap)/2;
      const selfHalf=extent(piece,axis,swapped)/2;
      // Both butt joints and matched ends/centres are valid connections.
      const candidates=[
        other.position[axis],
        other.position[axis]+otherHalf+selfHalf,
        other.position[axis]-otherHalf-selfHalf,
        other.position[axis]+otherHalf-selfHalf,
        other.position[axis]-otherHalf+selfHalf
      ];
      for(const value of candidates){
        const d=Math.abs(p[axis]-value);
        if(d<=threshold&&d<best[axis]){
          p[axis]=value;best[axis]=d;
        }
      }
    }
  }
  p.x=Math.round(p.x*10000)/10000;
  p.z=Math.round(p.z*10000)/10000;
  return original;
}
