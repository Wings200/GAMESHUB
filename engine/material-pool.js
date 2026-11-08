import {getMaterialPreset,normalizeMaterialSettings} from './material-catalog.mjs';
import {createBuildingMaterial} from './material-factory.js';

// Reuse a single GPU material (and its color/normal/roughness textures) for
// hundreds of meshes with identical settings. Each lease counts as one use.
export class MaterialPool {
  constructor({factory=createBuildingMaterial}={}){
    this.factory=factory;
    this.entries=new Map();
    this.disposed=false;
  }
  acquire(id,overrides={}){
    if(this.disposed)throw new Error('Material pool has been disposed');
    const preset=getMaterialPreset(id);
    if(!preset)throw new TypeError('Unknown material preset: '+String(id));
    const settings=normalizeMaterialSettings(preset,overrides);
    const key=JSON.stringify([id,settings.color.toLowerCase(),settings.roughness,
      settings.metalness,settings.repeat,settings.detailStrength]);
    let entry=this.entries.get(key);
    if(!entry){
      const resource=this.factory(preset,settings);
      if(!resource?.material||typeof resource.dispose!=='function')
        throw new TypeError('Material factory must return {material, dispose()}');
      entry={key,resource,refs:0};
      this.entries.set(key,entry);
    }
    entry.refs++;
    let released=false;
    return {
      material:entry.resource.material,
      settings,
      release:()=>{
        if(released)return false;
        released=true;
        if(this.disposed)return false;
        entry.refs--;
        if(entry.refs===0){
          this.entries.delete(key);
          entry.resource.dispose();
        }
        return true;
      }
    };
  }
  get size(){return this.entries.size;}
  stats(){return {uniqueMaterials:this.entries.size,
    references:[...this.entries.values()].reduce((sum,item)=>sum+item.refs,0)};}
  dispose(){
    if(this.disposed)return;
    this.disposed=true;
    for(const entry of this.entries.values())entry.resource.dispose();
    this.entries.clear();
  }
}
