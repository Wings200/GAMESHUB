import {THREE} from './core.js';

// A conservative ground-contact assist for an imported character. It moves
// only the visual model, never the player collider or camera. It deliberately
// does not pretend to implement two-bone IK or remove all foot sliding.
export class FootGrounding {
  constructor(root,placement,{clearance=.075,maxCorrection=.14,smoothing=12}={}){
    if(!root?.isObject3D||!placement?.isObject3D)
      throw new TypeError('FootGrounding needs a character root and visual placement');
    if(!Number.isFinite(clearance)||clearance<0||clearance>.5||
      !Number.isFinite(maxCorrection)||maxCorrection<0||maxCorrection>.6||
      !Number.isFinite(smoothing)||smoothing<=0)
      throw new TypeError('Invalid foot-grounding settings');
    this.root=root;
    this.placement=placement;
    this.clearance=clearance;
    this.maxCorrection=maxCorrection;
    this.smoothing=smoothing;
    this.offset=0;
    this.feet=[];
    this.footWorld=new THREE.Vector3();
    root.traverse(node=>{
      if(node.isBone&&/^(left|right)(foot|ankle)$/i.test(node.name))
        this.feet.push(node);
    });
  }
  get available(){return this.feet.length>=2;}
  update(dt,{grounded=true,groundHeight=0}={}){
    if(!Number.isFinite(dt)||dt<0||!Number.isFinite(groundHeight))
      throw new TypeError('Foot-grounding update requires a valid time and ground height');
    let target=0;
    if(grounded&&this.available){
      this.root.updateMatrixWorld(true);
      let footMin=Infinity;
      for(const foot of this.feet){
        foot.getWorldPosition(this.footWorld);
        // Remove last frame's visual offset before sampling the new pose.
        footMin=Math.min(footMin,this.footWorld.y-this.offset);
      }
      target=THREE.MathUtils.clamp(groundHeight+this.clearance-footMin,
        -this.maxCorrection,this.maxCorrection);
    }
    this.offset=THREE.MathUtils.lerp(this.offset,target,1-Math.exp(-dt*this.smoothing));
    this.placement.position.y=this.offset;
    return this.offset;
  }
  reset(){this.offset=0;this.placement.position.y=0;}
}
