// Lightweight graphics selection for the WebGL testing field. These are
// browser hints, not promises about GPU speed; the manual quality control
// always takes precedence once used.
export function preferLowGraphics({reducedRenderer=false,deviceMemory,
  hardwareConcurrency}={}){
  if(reducedRenderer)return true;
  if(Number.isFinite(deviceMemory)&&deviceMemory>0&&deviceMemory<=4)return true;
  if(Number.isFinite(hardwareConcurrency)&&hardwareConcurrency>0&&
    hardwareConcurrency<=4)return true;
  return false;
}

// A few stutter frames should never force a quality change. Two consecutive
// sustained low-FPS windows trigger a single reduction; background-tab gaps
// and manually chosen quality are deliberately ignored.
export function createFrameBudgetGovernor({windowSeconds=3,
  minimumFps=28,consecutiveWindows=2}={}){
  let frames=0,seconds=0,slowWindows=0,degraded=false;
  function reset(){frames=0;seconds=0;slowWindows=0;}
  return {
    observe(elapsed,{highQuality=true,manual=false,visible=true}={}){
      if(degraded||!highQuality||manual||!visible||!Number.isFinite(elapsed)||
        elapsed<=0||elapsed>1.5){reset();return false;}
      seconds+=elapsed;frames++;
      if(seconds<windowSeconds)return false;
      const fps=frames/seconds;
      frames=0;seconds=0;
      slowWindows=fps<minimumFps?slowWindows+1:0;
      if(slowWindows<consecutiveWindows)return false;
      degraded=true;
      return true;
    },
    reset
  };
}
