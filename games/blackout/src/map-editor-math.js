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
      // A wall 60 metres down the road must not magnetically influence
      // a new wall just because its X coordinate happens to match.
      const across=axis==="x"?"z":"x";
      if(Math.abs(p[across]-other.position[across])>
         (extent(piece,across,swapped)+extent(other,across,otherSwap))/2+
         threshold)continue;
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


const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sqGrid=(grid)=>Number.isFinite(grid)&&grid>0?grid:0;
const axisDirection=(rotationY,axis)=>{
  const a=(rotationY||0)*Math.PI/180;
  return axis==="x"?{x:Math.cos(a),z:-Math.sin(a)}:
    {x:Math.sin(a),z:Math.cos(a)};
};
// Align physical PIECE EDGES to grid intersections rather than the centre.
// E.g. a 3m wall on a 1m grid has a half-grid centre, with both ends exact.
export function alignPieceToGrid(piece,grid){
  const step=sqGrid(grid),item={...piece,position:{...piece.position}};
  if(!step)return item;
  const p=item.position;
  const rot=((item.rotationY||0)%180+180)%180;
  const swap=rot>45&&rot<135;
  if(item.type==="floor"||item.type==="ceiling"){
    const w=swap?item.size.z:item.size.x;
    const d=swap?item.size.x:item.size.z;
    p.x=snapNumber(p.x-w/2,step)+w/2;
    p.z=snapNumber(p.z-d/2,step)+d/2;
  }else if(["hardWall","softWall","reinforcedWall","door","window","railing"].includes(item.type)){
    const parallel=swap?"z":"x";
    const normal=swap?"x":"z";
    p[parallel]=snapNumber(p[parallel]-item.size.x/2,step)+item.size.x/2;
    p[normal]=snapNumber(p[normal],step);
  }else{
    p.x=snapNumber(p.x,step);p.z=snapNumber(p.z,step);
  }
  p.x=Math.round(p.x*10000)/10000;
  p.z=Math.round(p.z*10000)/10000;
  return item;
}
export function resizeFromEdge(piece,{axis,side,delta,grid=0,snap=true}){
  if(!["x","y","z"].includes(axis)||![-1,1].includes(side))throw Error("Invalid resize edge");
  const size={...piece.size},position={...piece.position};
  const step=snap?sqGrid(grid):0;
  const minimum=axis==="y"?.12:.15;
  if(axis==="y"){
    // Snap CHANGES to storey height rather than the absolute dimensions:
    // 3.75m walls stay 3.75m with a 1m grid until intentionally resized.
    const verticalStep=step?Math.min(step,.25):0;
    const travel=snapNumber(delta,verticalStep);
    if(piece.type==="floor"){
      // Moving the underside downward increases slab thickness; its
      // top walking surface remains fixed at position.y.
      size.y=clamp(piece.size.y-travel,.12,28);
    }else{
      // Walls and doorframes grow upward from a fixed ground-level bottom.
      size.y=clamp(piece.size.y+travel,.12,28);
    }
  }else{
    const dir=axisDirection(piece.rotationY,axis);
    const origin=position.x*dir.x+position.z*dir.z;
    const fixed=origin-side*piece.size[axis]/2;
    const moving=origin+side*piece.size[axis]/2;
    let target=snapNumber(moving+delta,step);
    let newSize=side*(target-fixed);
    newSize=clamp(newSize,minimum,110);
    if(step>0)newSize=Math.max(minimum,Math.round(newSize*10000)/10000);
    const movement=side*(newSize-piece.size[axis])/2;
    position.x+=dir.x*movement;position.z+=dir.z*movement;
    size[axis]=newSize;
  }
  position.x=Math.round(position.x*10000)/10000;
  position.z=Math.round(position.z*10000)/10000;
  size[axis]=Math.round(size[axis]*10000)/10000;
  return {...piece,position,size};
}
export function alignStoryWalls(map,grid=1){
  // Optional one-click repair for existing editor V1 geometry. Retains IDs,
  // Y floors, bomb pairs and custom materials. Do not auto-edit on load.
  const result=JSON.parse(JSON.stringify(map));
  const step=grid>0?grid:1;
  const floors=result.elements.filter(e=>e.type==="floor");
  const isWall=e=>["hardWall","softWall","reinforcedWall","door","window"].includes(e.type);
  const adjusted=[];
  for(let i=0;i<result.elements.length;i++){
    let part=result.elements[i];
    if(!["floor","ceiling","hardWall","softWall","reinforcedWall","door","window","railing"].includes(part.type))continue;
    if(part.type==="floor"||part.type==="ceiling"){
      for(const axis of ["x","z"])
        part.size[axis]=Math.max(step,snapNumber(part.size[axis],step));
    }else{
      part.size.x=Math.max(step,snapNumber(part.size.x,step));
    }
    part=alignPieceToGrid(part,step);
    if(isWall(part)){
      const above=floors.filter(f=>f.position.y>part.position.y+.5&&
        Math.abs(f.position.x-part.position.x)<f.size.x/2+.15&&
        Math.abs(f.position.z-part.position.z)<f.size.z/2+.15)
        .sort((a,b)=>a.position.y-b.position.y)[0];
      const target=above?
        above.position.y-above.size.y-part.position.y:4-.25;
      if(target>.4&&target<=28&&Math.abs(part.size.y-target)>.025&&part.type!=="window")
        part.size.y=Math.round(target*10000)/10000;
    }
    if(JSON.stringify(part)!==JSON.stringify(result.elements[i]))adjusted.push(part.id);
    result.elements[i]=part;
  }
  return {map:result,adjusted};
}
