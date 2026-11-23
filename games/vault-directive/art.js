(() => {
'use strict';
const M=()=>window.VaultModel, T=78;
const P={iron:'#657a70',light:'#ecd09c',cream:'#f4e3c6',ink:'#172627',deep:'#0e1e22'};
const hash=(x,y,n=0)=>{const a=Math.sin(x*127.1+y*311.7+n*67.9)*43758.5453;return a-Math.floor(a);};
const paint=(ctx,a,b,c,d,col)=>{ctx.fillStyle=col;ctx.fillRect(a,b,c,d);};
function rr(ctx,x,y,w,h,r=6){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function gradient(ctx,x,y,w,h,colors,vertical=true){
  const g=ctx.createLinearGradient(x,y,vertical?x:x+w,vertical?y+h:y);
  colors.forEach(([stop,c])=>g.addColorStop(stop,c));return g;
}
function txt(ctx,text,x,y,size=13,color='#f3e7cb',align='left',weight=700){
  ctx.font=weight+' '+size+'px "Barlow Condensed",sans-serif';ctx.fillStyle=color;ctx.textAlign=align;
  ctx.shadowColor='#06131a9b';ctx.shadowBlur=3;ctx.fillText(String(text),x,y);ctx.shadowBlur=0;
}
function glow(ctx,x,y,r,color,a=.25){
  ctx.save();const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');
  ctx.globalAlpha=a;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
}
function line(ctx,x1,y1,x2,y2,color,width=2){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}
function ellipse(ctx,x,y,rx,ry,color,rot=0){
  ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);ctx.fill();
}
function noise(x,y,n=0){return hash(Math.floor(x),Math.floor(y),n);}
function sky(ctx,s,t){
  const daylight=Math.sin(s.time%1440/1440*Math.PI*2-Math.PI*.5)*.5+.52;
  const warm=daylight>.45;
  const grad=gradient(ctx,-600,-120,5000,280,[
    [0,warm?'#294e5a':'#0e1e2e'],[.55,warm?'#677977':'#304052'],[1,warm?'#a89e7b':'#5b5763']]);
  paint(ctx,-1000,-1000,7000,1156,grad);
  const sx=17*T,sy=37+(1-daylight)*45;
  glow(ctx,sx,sy,190,warm?'#f8c884':'#b0bfd6',warm?.29:.13);
  ellipse(ctx,sx,sy,22,22,warm?'#f5d69c':'#d1d7da');
  // Decaying skyline layers and intermittent antennae, all original procedural shapes.
  for(let layer=0;layer<3;layer++){
    const baseline=2*T+5+layer*12;
    for(let i=-4;i<66;i++){
      const wx=i*87+layer*23,ht=36+noise(i,layer)*90/(layer+1);
      ctx.fillStyle=['#2a454b','#3b4a47','#4f5247'][layer];
      ctx.fillRect(wx,baseline-ht,45+noise(i,13+layer)*39,ht);
      if(layer===0) {
        line(ctx,wx+15,baseline-ht,wx+15,baseline-ht-15,'#41575a',2);
        for(let a=0;a<3;a++)if(hash(i,a,17)>.35)
          paint(ctx,wx+9+a*11,baseline-ht+12,4,6,'#5d7269');
      }
    }
  }
  // Dirt horizon with soft hill slopes.
  ctx.fillStyle='#827459';ctx.beginPath();ctx.moveTo(-800,T*2);
  for(let x=-800;x<4100;x+=26)ctx.lineTo(x,T*(1.93+.16*Math.sin(x*.01)+.08*Math.sin(x*.034)));
  ctx.lineTo(4100,T*2+120);ctx.lineTo(-800,T*2+120);ctx.fill();
  paint(ctx,-500,T*2-2,6000,7,'#87765c');
  for(let i=0;i<80;i++){
    const x=(i*73+33)%(40*T),y=T*(1.9+.05*Math.sin(x*.01));
    if(i%6===0){line(ctx,x,y,x-5,y-9,'#4a5942',2);line(ctx,x,y,x+5,y-6,'#435644',1);}
    if(i%11===0)ellipse(ctx,x,y-2,6,2,'#4b4940');
  }
}
function soil(ctx,s,v, bounds){
  const {x0,x1,y0,y1}=bounds;
  // layered painted strata, cracks and rocks, with carved cells revealed underneath
  const earth=gradient(ctx,0,T*2,0,T*18,[
    [0,'#645340'],[.28,'#504638'],[.53,'#47453f'],[.73,'#344044'],[1,'#24363b']]);
  paint(ctx,0,T*2,M().W*T,(M().H-2)*T,earth);
  for(let y=Math.max(2,y0);y<=Math.min(M().H-1,y1);y++){
    for(let x=Math.max(0,x0);x<=Math.min(M().W-1,x1);x++){
      const val=s.terrain[y][x],px=x*T,py=y*T,n=noise(x,y);
      if(val===0){
        paint(ctx,px,py,T,T,y%3===1?'#1b3034':'#1b3036');
        if(y%3===1)paint(ctx,px,py+T-11,T,11,'#3d4840');
        else {
          line(ctx,px+4,py+5,px+T-4,py+5,'#3e5752',3);
          line(ctx,px+4,py+T-5,px+T-4,py+T-5,'#1b282d',2);
        }
        // jagged edges cast shadows into the excavated chamber.
        if(y>1&&s.terrain[y-1][x]!==0){
          paint(ctx,px,py,T,8,'#344340');line(ctx,px,py+8,px+T,py+8,'#a08c665c',2);
        }
        if(x>0&&s.terrain[y][x-1]!==0)paint(ctx,px,py,6,T,'#343f3c');
        if(x<M().W-1&&s.terrain[y][x+1]!==0)paint(ctx,px+T-6,py,6,T,'#35413e');
        continue;
      }
      const shade=val===2?'#3c4340':val===3?'#685d4e':n>.5?'#5e4e3e':'#635140';
      ctx.globalAlpha=val===2?.46:.39;paint(ctx,px,py,T,T,shade);ctx.globalAlpha=1;
      for(let z=0;z<7;z++){
        const rx=px+4+noise(x,z,y)*70,ry=py+5+noise(y,z,x+3)*67;
        ellipse(ctx,rx,ry,1+noise(z,x,y)*3,.6+noise(z,y,x)*2,val===2?'#78817a45':'#b29a6c36',
          noise(x+z,y)*3);
      }
      if(n>.83){
        ctx.strokeStyle=val===2?'#18292c72':'#2b29276b';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.moveTo(px+13,py+6);ctx.lineTo(px+23,py+28);
        ctx.lineTo(px+14,py+41);ctx.lineTo(px+33,py+63);ctx.stroke();
      }
      if(val===3){
        for(let i=0;i<8;i++){
          const xx=px+5+hash(x,y,i)*60,yy=py+12+hash(y,x,i+3)*50;
          ctx.fillStyle=i%2?'#867764':'#a38a6e';ctx.beginPath();
          ctx.moveTo(xx-9,yy+8);ctx.lineTo(xx-1,yy-6);ctx.lineTo(xx+11,yy-3);ctx.lineTo(xx+14,yy+9);
          ctx.closePath();ctx.fill();
        }
      }
    }
  }
}
function bolt(ctx,x,y){ellipse(ctx,x,y,2.2,2.2,'#8cafa0');ellipse(ctx,x-.5,y-.5,.8,.8,'#d7e3be');}
function pipe(ctx,x,y,w,h,col='#67847e'){
  paint(ctx,x,y,w,h,'#26363a');paint(ctx,x,y+1,w,Math.max(2,h-4),col);
  paint(ctx,x,y+h-3,w,2,'#193138');
  for(let xx=x+12;xx<x+w;xx+=T){paint(ctx,xx,y-3,6,h+6,'#9eaa99');bolt(ctx,xx+3,y+h/2);}
}
function roomFrame(ctx,s,r,t){
  const def=M().ROOM[r.type],pwr=M().powered(s,r),x=r.x*T,y=r.y*T,w=r.w*T,h=3*T;
  const palette=gradient(ctx,x,y,w,h,[[0,pwr?'#344848':'#283136'],[.5,pwr?'#3a4d49':'#273537'],[1,'#1d3235']]);
  paint(ctx,x+4,y+6,w-8,h-18,palette);
  // Back wall panels, vertical seams and recessed hanging cable rails.
  for(let i=0;i<r.w;i++){
    const tx=x+i*T;
    paint(ctx,tx+5,y+23,T-10,h-43,'#dce0b112');
    line(ctx,tx+T-5,y+21,tx+T-5,y+h-20,'#152b2c86',2);
    if(i%2===0){
      paint(ctx,tx+24,y+52,31,49,'#243b3ba8');
      ctx.strokeStyle='#73918755';ctx.strokeRect(tx+24,y+52,31,49);
      line(ctx,tx+25,y+70,tx+54,y+70,'#b1ba8b35',2);
    }
  }
  // Recessed chamber interior with rear-to-front shadows.
  paint(ctx,x+12,y+7,w-24,10,'#131c20');
  paint(ctx,x+12,y+h-21,w-24,13,'#2c4441');
  ctx.strokeStyle='#8ea19462';ctx.lineWidth=2;
  for(let px=x+18;px<x+w-8;px+=37)line(ctx,px,y+h-13,px+18,y+h-13,'#aeb89e60',1);
  // Steel vertical frame, lateral lip and brass connector bolts.
  paint(ctx,x,y,w,12,'#87978a');paint(ctx,x,y+12,w,4,'#1e2e32');
  paint(ctx,x,y+h-17,w,9,'#a2a493');
  paint(ctx,x,y+h-8,w,8,'#414c43');
  for(let i=0;i<=r.w;i++){
    const tx=x+i*T-5;
    paint(ctx,tx,y+8,10,h-18,'#51665f');
    paint(ctx,tx+2,y+10,2,h-23,'#a5aa9170');
    bolt(ctx,tx+5,y+19);bolt(ctx,tx+5,y+h-25);
  }
  // Lights are part of the actual electrical grid, not an overlay pretending to work.
  for(let i=0;i<r.w;i+=2){
    const lx=x+(i+1)*T,ly=y+18;
    paint(ctx,lx-21,ly-5,42,7,'#1b2729');
    paint(ctx,lx-17,ly-1,34,3,pwr?'#f5dc9d':'#536568');
    if(pwr)glow(ctx,lx,ly+12,115,'#ffdea6',.18);
  }
  // Interior door on right and left, with actual depth beyond the frame.
  paint(ctx,x+11,y+h-115,24,96,'#122a2b');
  paint(ctx,x+w-34,y+h-115,24,96,'#122a2b');
  ctx.strokeStyle='#9f9d7e';ctx.lineWidth=3;
  ctx.strokeRect(x+11,y+h-115,24,96);
  ctx.strokeRect(x+w-34,y+h-115,24,96);
  // Identification plaques look integrated into the wall.
  paint(ctx,x+24,y+27,Math.min(w-48,197),27,'#1c3134e0');
  paint(ctx,x+24,y+27,4,27,def.color);
  txt(ctx,def.name.toUpperCase(),x+35,y+46,15,'#eee0c3','left',800);
  txt(ctx,'LV '+r.level,x+w-23,y+44,11,'#b4c1b6','right');
  if(r.captured){
    const observed=s.rooms.some(cam=>cam.type==='security'&&M().powered(s,cam)&&M().team(s,cam).length>0);
    paint(ctx,x+6,y+18,w-12,h-37,observed?'#562e32a0':'#070d14dc');
    txt(ctx,observed?'HOSTILE CONTROL · CAM ONLINE':'NO SURVEILLANCE',
      x+w/2,y+h/2,20,'#f4b5a2','center');
  }else if(!pwr&&r.type!=='generator'){
    paint(ctx,x+7,y+20,w-14,h-40,'#0a1319aa');
    txt(ctx,'NO POWER',x+w/2,y+h*.64,17,'#c8a78f','center');
  }
  if(r.integrity<100){
    const percent=r.integrity/100;
    paint(ctx,x+20,y+h-23,w-40,3,'#673c37');
    paint(ctx,x+20,y+h-23,(w-40)*percent,3,'#bfa37b');
  }
}
function gear(ctx,x,y,r,color='#8fa29a',t=0){
  ctx.save();ctx.translate(x,y);ctx.rotate(t);
  ctx.fillStyle=color;
  for(let i=0;i<10;i++){ctx.rotate(Math.PI/5);ctx.fillRect(-4,-r-5,8,10);}
  ellipse(ctx,0,0,r,r,color);ellipse(ctx,0,0,r*.5,r*.5,'#203236');
  bolt(ctx,-r*.1,-r*.1);ctx.restore();
}
function machine(ctx,x,y,w,h,color='#5c817b',accent='#e7c38f'){
  paint(ctx,x+3,y+5,w,h,'#17282b');paint(ctx,x,y,w,h-5,color);
  paint(ctx,x+3,y+4,w-6,6,'#bdd2b65b');paint(ctx,x+9,y+18,w-18,h-35,'#2a4143');
  paint(ctx,x+13,y+25,w-26,10,'#0e2026');
  paint(ctx,x+14,y+26,Math.max(8,(w-29)*.7),8,accent);
  for(let i=0;i<3;i++){paint(ctx,x+12+i*(w-24)/3,y+h-22,9,5,'#a4aaa0');}
  bolt(ctx,x+7,y+9);bolt(ctx,x+w-7,y+h-13);
}
function props(ctx,s,r,t){
  const x=r.x*T,y=r.y*T,w=r.w*T,h=3*T;const on=M().powered(s,r);
  ctx.save();
  ctx.beginPath();ctx.rect(x+8,y+20,w-16,h-40);ctx.clip();
  const c=M().ROOM[r.type].color;
  const base=y+h-33;
  switch(r.type){
    case 'generator':{
      pipe(ctx,x+28,base-151,w-55,10,'#9c7c59');
      for(let i=0;i<Math.min(3,r.w);i++){
        const xx=x+45+i*(w-97)/Math.min(3,r.w);
        machine(ctx,xx,base-102,Math.min(74,(w-85)/3),94,'#647574','#d0a15f');
        gear(ctx,xx+26,base-57,15,'#87968a',t*.0007*(on?1:0));
        paint(ctx,xx+6,base-18,58,5,'#c5a56e');
      }
      glow(ctx,x+w/2,base-55,110,'#e1b570',on?.17:.02);
      break;
    }
    case 'water':{
      pipe(ctx,x+16,base-141,w-32,11,'#75afbd');
      for(let i=0;i<Math.max(2,Math.floor(r.w/2));i++){
        const xx=x+30+i*(w-85)/Math.max(2,Math.floor(r.w/2));
        paint(ctx,xx,base-108,52,93,'#536a69');
        paint(ctx,xx+4,base-102,44,87,'#38758ac9');
        paint(ctx,xx+7,base-74,38,56,'#61acbdaa');
        ellipse(ctx,xx+26,base-107,26,6,'#b9c1ab');
        paint(ctx,xx-4,base-25,60,9,'#adb7a6');
        if(on)glow(ctx,xx+26,base-48,40,'#91daec',.15);
      }
      break;
    }
    case 'kitchen':{
      for(let i=0;i<r.w;i++){
        const xx=x+i*T+18;
        paint(ctx,xx,base-67,T-34,52,'#65716d');paint(ctx,xx+4,base-61,T-42,35,'#c0a782');
        paint(ctx,xx+8,base-53,T-50,24,'#9d684d');
        paint(ctx,xx,base-17,T-34,6,'#b5a58e');
      }
      pipe(ctx,x+33,base-115,w-66,12,'#a58f70');
      for(let i=0;i<3;i++)ellipse(ctx,x+w/2+i*43-43,base-98,18,6,'#ddc49d');
      break;
    }
    case 'bunks':{
      for(let i=0;i<Math.min(r.w,4);i++){
        const xx=x+24+i*(w-59)/Math.min(r.w,4);
        const ww=Math.min(76,(w-65)/Math.min(r.w,4));
        paint(ctx,xx,base-100,ww,10,'#a0b6a0');
        paint(ctx,xx+5,base-97,ww-10,22,'#789e8c');
        paint(ctx,xx+8,base-95,Math.min(26,ww-12),16,'#c1cfc0');
        paint(ctx,xx,base-40,ww,10,'#a0b6a0');
        paint(ctx,xx+5,base-37,ww-10,22,'#789e8c');
        paint(ctx,xx+8,base-35,Math.min(26,ww-12),16,'#c1cfc0');
        line(ctx,xx+ww-7,base-100,xx+ww-7,base-13,'#aab69d',4);
      }
      break;
    }
    case 'storage':{
      for(let i=0;i<r.w;i++){
        const bx=x+17+i*(w-33)/r.w;
        paint(ctx,bx,base-102,Math.min(67,T-16),96,'#667d70');
        for(let j=0;j<3;j++){
          paint(ctx,bx+4,base-93+j*29,T-24,23,j%2?'#8f8169':'#a59574');
          line(ctx,bx+5,base-90+j*29,bx+T-22,base-70+j*29,'#d6c29f44',1);
        }
      }
      break;
    }
    case 'air':{
      pipe(ctx,x+16,base-153,w-32,15,'#739e96');
      for(let i=0;i<Math.max(2,Math.floor(r.w/2));i++){
        const xx=x+35+i*(w-93)/Math.max(2,Math.floor(r.w/2));
        machine(ctx,xx,base-110,60,93,'#71878b','#b8ccbb');
        ellipse(ctx,xx+30,base-67,23,23,'#273e44');
        for(let j=0;j<5;j++){
          ctx.save();ctx.translate(xx+30,base-67);ctx.rotate(j*Math.PI*2/5+(on?t*.004:0));
          ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(14,-13,17,-5);ctx.quadraticCurveTo(10,9,0,0);
          ctx.fillStyle='#a2bebb';ctx.fill();ctx.restore();
        }
      }
      break;
    }
    case 'medbay':{
      for(let i=0;i<r.w-1;i+=2){
        const bx=x+26+i*T;
        paint(ctx,bx,base-56,116,27,'#9fb4a5');
        paint(ctx,bx+7,base-54,103,20,'#6c97a1');
        paint(ctx,bx+9,base-51,26,16,'#e1d9bd');
        for(const offset of [10,106])line(ctx,bx+offset,base-29,bx+offset,base-11,'#c9ccae',4);
      }
      machine(ctx,x+w-93,base-150,61,83,'#718d83','#9ac9bd');
      txt(ctx,'+',x+w-62,base-118,42,'#d8e3d1','center');
      break;
    }
    case 'quarantine':{
      for(let i=0;i<r.w-1;i++){
        const bx=x+19+i*83;
        paint(ctx,bx,base-144,73,126,'#a0d5c94a');
        ctx.strokeStyle='#9ac4b8';ctx.lineWidth=4;
        ctx.strokeRect(bx,base-144,73,126);
        line(ctx,bx+36,base-141,bx+36,base-20,'#a3ccbe88',2);
        paint(ctx,bx+8,base-61,58,17,'#a9c6b6');
        paint(ctx,bx+13,base-57,50,12,'#7aada3');
        paint(ctx,bx+12,base-48,45,12,'#dee1c0');
        txt(ctx,'ISOLATE',bx+37,base-128,13,'#e7f4da','center');
      }
      pipe(ctx,x+20,base-151,w-40,8,'#a4bfad');
      break;
    }
    case 'radio':{
      pipe(ctx,x+27,base-150,w-50,9,'#939b99');
      for(let i=0;i<r.w-1;i++){
        const bx=x+22+i*74;
        machine(ctx,bx,base-87,63,76,'#6e7a86','#9cb9b0');
        ellipse(ctx,bx+32,base-47,20,20,'#28363b');
        gear(ctx,bx+32,base-47,10,'#b9b99c',t*.0008);
      }
      line(ctx,x+w/2,base-154,x+w/2,base-190,'#a5b7aa',4);
      glow(ctx,x+w/2,base-188,52,'#c0dfff',on?.16:0);
      break;
    }
    case 'security':{
      paint(ctx,x+24,base-145,w-48,21,'#3e5858');
      for(let i=0;i<r.w;i++){
        const bx=x+22+i*(w-45)/r.w;
        paint(ctx,bx,base-122,T-25,69,'#1b2c34');
        paint(ctx,bx+5,base-117,T-35,58,on?'#39726c':'#344247');
        line(ctx,bx+10,base-82,bx+45,base-82,'#b7cfaa',1);
        txt(ctx,'CAM '+(i+1),bx+11,base-103,11,on?'#c1ebc3':'#829c94');
      }
      break;
    }
    case 'workshop':{
      for(let i=0;i<r.w-1;i++){
        const bx=x+20+i*81;
        paint(ctx,bx,base-72,72,15,'#c2ae8c');
        paint(ctx,bx+8,base-56,7,42,'#88998a');
        paint(ctx,bx+56,base-56,7,42,'#88998a');
        gear(ctx,bx+35,base-114,19,'#9a9f8d',t*.001);
      }
      break;
    }
    case 'training':{
      for(let i=0;i<r.w;i++){
        const bx=x+24+i*(w-45)/r.w;
        line(ctx,bx+12,base-126,bx+12,base-16,'#9eb7a2',4);
        for(let z=0;z<4;z++)paint(ctx,bx-1,base-118+z*27,28,8,'#c6a77b');
        ellipse(ctx,bx+12,base-110,13,6,'#52685b');
      }
      break;
    }
    case 'greenhouse':{
      for(let i=0;i<r.w;i++){
        const bx=x+20+i*(w-42)/r.w;
        paint(ctx,bx,base-39,T-31,25,'#7b7552');
        paint(ctx,bx+3,base-36,T-37,10,'#4a654d');
        for(let j=0;j<3;j++){
          const ax=bx+12+j*16;
          line(ctx,ax,base-38,ax+2,base-96,'#73a373',3);
          ellipse(ctx,ax-9,base-80,12,5,'#81b97c',-.6);
          ellipse(ctx,ax+11,base-71,10,5,'#83b97d',.5);
          ellipse(ctx,ax+4,base-95,7,11,'#9bc98b');
        }
      }
      glow(ctx,x+w/2,base-115,130,'#a8df96',on?.13:.01);
      break;
    }
  }
  ctx.restore();
}
function doorway(ctx,x,y,h){
  paint(ctx,x-1,y,29,h,'#2b4241');paint(ctx,x+4,y+9,20,h-18,'#111e26');
  ctx.strokeStyle='#a0a995';ctx.lineWidth=3;ctx.strokeRect(x+3,y+5,22,h-12);
  for(let i=13;i<h-12;i+=17)line(ctx,x+8,y+i,x+21,y+i,'#425d57',2);
}
function hatch(ctx,s,t){
  const x=7*T,y=T*1.55;
  // Surface door and original access ladder, with a rusty lampshade.
  paint(ctx,x-18,y-2,T+36,43,'#303d3b');
  paint(ctx,x-21,y-11,T+42,12,'#a4a088');
  paint(ctx,x+2,y-26,T-4,16,'#515b52');
  paint(ctx,x+8,y-36,T-16,11,'#b2ad94');
  for(let i=0;i<6;i++)bolt(ctx,x-15+i*19,y+5);
  txt(ctx,'ENTRY 01',x+T/2,y+23,15,'#d9c59c','center',800);
  // Ladder is the only built piece of the old site.
  for(let r=2;r<=4;r++){
    const ly=r*T;
    paint(ctx,x+24,ly+4,29,T-7,'#3045438c');
    line(ctx,x+28,ly+5,x+28,ly+T-4,'#c3b69b',4);
    line(ctx,x+47,ly+5,x+47,ly+T-4,'#c3b69b',4);
    for(let q=13;q<T;q+=14)line(ctx,x+28,ly+q,x+47,ly+q,'#c7c4a9',3);
  }
  // Fleeting emergency light at the sealed-off, decaying entrance.
  glow(ctx,x+T/2,4.4*T,110,'#ebd29c',.16);
  paint(ctx,x+T/2-14,4.05*T,28,8,'#a1a58c');
  paint(ctx,x+T/2-9,4.05*T+8,18,5,'#e0bd81');
  // Caution stripes and wires on the unbuilt service corridor.
  for(let k=7;k<13;k++){
    const xx=k*T;
    paint(ctx,xx,5*T-11,T,10,'#797a68');
    for(let i=0;i<4;i++){
      line(ctx,xx+i*22,5*T-11,xx+i*22+10,5*T-1,'#494539',3);
    }
    if(k%2===0)paint(ctx,xx+T/2-5,4*T+T-20,10,4,'#ddbc7899');
  }
}
function drawLadder(ctx,s,l){
  const x=l.x*T,y=l.y*T;
  paint(ctx,x+22,y+4,34,T-7,'#38504c');
  line(ctx,x+26,y+4,x+26,y+T-5,'#bdc5a7',4);line(ctx,x+52,y+4,x+52,y+T-5,'#bdc5a7',4);
  for(let a=13;a<T-2;a+=14)line(ctx,x+26,y+a,x+52,y+a,'#d0ccad',3);
}
function blast(ctx,s,d,t){
  const x=d.x*T,y=d.y*T,closed=d.closed&&d.hp>0;
  paint(ctx,x+7,y+2,T-14,T-7,'#4b5c53');
  paint(ctx,x+12,y+6,T-24,T-17,'#203438');
  paint(ctx,x+14,y+8,T-28,10,'#9cac98');
  if(closed){
    paint(ctx,x+16,y+15,T-32,T-27,'#6a7e78');
    for(let z=0;z<5;z++)paint(ctx,x+21+z*8,y+17,4,T-30,'#354e4e');
    paint(ctx,x+26,y+29,T-52,17,'#9e9983');
    txt(ctx,'×',x+T/2,y+43,28,'#dac194','center');
  }else{
    paint(ctx,x+14,y+15,12,T-27,'#6f887d');
    paint(ctx,x+T-26,y+15,12,T-27,'#6f887d');
    paint(ctx,x+28,y+15,T-56,T-27,'#13272b');
  }
  paint(ctx,x+T/2-6,y+7,12,7,closed?'#db8b70':'#9ecab0');
  if(closed)glow(ctx,x+T/2,y+8,35,'#ff8f6e',.14);
  if(d.hp<100){paint(ctx,x+14,y+T-13,T-28,3,'#7c3f3e');paint(ctx,x+14,y+T-13,(T-28)*d.hp/100,3,'#c6ad84');}
}
function human(ctx,p,t,chosen=false){
  if(!p||p.away||p.left)return;
  const x=(p.x+.5)*T,feet=(p.y+1)*T-13;
  const walking=['walking','scavenging'].includes(p.state);
  const working=['digging','building','rescuing'].includes(p.state);
  const pulse=Math.sin(t*.006+p.id),leg=walking?Math.sin(t*.018+p.id)*9:0,arm=working?Math.sin(t*.025+p.id)*15:walking?-leg*.75:pulse*1.4;
  ctx.save();ctx.translate(x,feet);
  if(p.child)ctx.scale(.64,.64);
  ellipse(ctx,0,1,25,6,'#111d20a8');
  if(chosen){
    ctx.strokeStyle='#e8c276';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,27,9,0,0,Math.PI*2);ctx.stroke();
    glow(ctx,0,-60,55,'#f4d19a',.15);
  }
  if(p.hp<=0){
    paint(ctx,-20,-12,32,11,p.coat);ellipse(ctx,-25,-10,11,10,p.skin);ctx.restore();return;
  }
  // Feet and trousers with natural stepping separation.
  ctx.lineCap='round';ctx.strokeStyle='#202e30';ctx.lineWidth=12;
  ctx.beginPath();ctx.moveTo(-9,-45);ctx.lineTo(-11-leg*.65,-4);
  ctx.moveTo(9,-45);ctx.lineTo(11+leg*.65,-4);ctx.stroke();
  ctx.strokeStyle='#0e1b20';ctx.lineWidth=7;
  line(ctx,-12-leg*.65,-3,-22-leg*.6,-3,'#182324',8);
  line(ctx,12+leg*.65,-3,22+leg*.6,-3,'#182324',8);
  // Backpack, if returning from surface work.
  if(p.state==='defending'||p.weapon>=3) {
    rr(ctx,-24,-91,16,44,5);ctx.fillStyle='#516456';ctx.fill();
    line(ctx,-18,-85,-18,-54,'#a08b70',3);
  }
  // Coat silhouette, shoulder and chest seams.
  const jacket=gradient(ctx,-22,-100,44,65,[[0,'#172729'],[.25,p.coat],[.75,p.coat],[1,'#203a3b']],false);
  ctx.fillStyle=jacket;ctx.beginPath();ctx.moveTo(-16,-96);ctx.quadraticCurveTo(0,-108,16,-96);
  ctx.lineTo(23,-46);ctx.lineTo(-21,-46);ctx.closePath();ctx.fill();
  paint(ctx,-5,-91,10,42,'#c7b39332');
  paint(ctx,-18,-59,36,5,'#223234');
  // Sleeves and hands remain animated in work mode.
  ctx.strokeStyle=p.coat;ctx.lineWidth=14;
  ctx.beginPath();ctx.moveTo(-16,-91);ctx.lineTo(-23-arm*.36,-59+arm*.33);
  ctx.moveTo(16,-91);ctx.lineTo(24+arm*.5,-59-arm*.28);ctx.stroke();
  ellipse(ctx,-23-arm*.36,-59+arm*.33,6,7,p.skin);
  ellipse(ctx,24+arm*.5,-59-arm*.28,6,7,p.skin);
  // Neck and head, hairline, ears, highlights.
  paint(ctx,-5,-104,10,13,p.skin);
  ellipse(ctx,0,-119,19,23,p.skin);
  ellipse(ctx,-18,-117,4.2,7,p.skin);ellipse(ctx,18,-117,4.2,7,p.skin);
  ellipse(ctx,-7,-121,2.4,2.9,'#233134');ellipse(ctx,8,-121,2.4,2.9,'#233134');
  line(ctx,-4,-108,6,-108,'#9a675c',1.5);
  ctx.fillStyle=p.hair;ctx.beginPath();ctx.moveTo(-19,-125);
  ctx.quadraticCurveTo(-22,-144,-2,-143);ctx.quadraticCurveTo(19,-149,21,-126);
  ctx.lineTo(13,-129);ctx.quadraticCurveTo(3,-138,-12,-127);ctx.closePath();ctx.fill();
  paint(ctx,-17,-119,4,12,p.hair);
  // A subtle metal buckled belt and a shoulder light.
  paint(ctx,-4,-56,8,6,'#d4c1a1');
  if(working){
    const swing=Math.sin(t*.024+p.id)*.45;
    ctx.save();ctx.translate(30+arm*.5,-57-arm*.28);ctx.rotate(swing+.5);
    line(ctx,0,-23,0,27,'#c9b18e',4);line(ctx,-18,-21,15,-21,'#a4b5a7',7);
    ctx.restore();
    for(let i=0;i<4;i++){
      const a=hash(p.id,i,Math.floor(t/110))*Math.PI;
      ellipse(ctx,36+Math.sin(a)*24,-54+Math.cos(a)*25,1+hash(i,p.id)*2,1,'#d4b47d9c');
    }
  }
  if(p.weapon>1&&p.state==='defending'){
    ctx.save();ctx.translate(22,-64);ctx.rotate(-.15);paint(ctx,0,0,38,8,'#3d4544');
    paint(ctx,7,-10,12,12,'#657267');paint(ctx,32,-1,15,4,'#a8a996');ctx.restore();
  }
  if(p.trapped)txt(ctx,'!',0,-156,27,'#f59d80','center');
  if(chosen||p.state==='defending'||p.trapped){
    txt(ctx,p.name.split(' ')[0].toUpperCase(),0,-155,12,chosen?'#f5d8a1':'#e6c4b2','center');
  }
  ctx.restore();
}
function dust(ctx,s,t,view){
  const start=Math.max(2,Math.floor(view.y/T)),end=Math.min(M().H,Math.ceil((view.y+view.h)/T));
  ctx.save();
  for(let i=0;i<95;i++){
    const x=hash(i,8)*M().W*T;
    const y=2*T+hash(i,7)*(M().H-2)*T;
    if(y<start*T||y>end*T)continue;
    const sway=Math.sin(t*.0005+i*11)*4;
    ellipse(ctx,x+sway,y+Math.sin(t*.00045+i)*10,hash(i,10)*1.7+.4,.7,'#ddc8aa28');
  }
  ctx.restore();
}
function drawJobs(ctx,s,t){
  for(const j of s.jobs){
    if(j.done||j.cancelled)continue;
    if(j.kind==='dig'){
      for(const c of j.cells){
        if(!s.terrain[c.y][c.x])continue;
        const x=c.x*T,y=c.y*T;
        paint(ctx,x+3,y+3,T-6,T-6,'#ecc27820');
        ctx.strokeStyle='#e5ba6eab';ctx.lineWidth=1.4;ctx.setLineDash([7,5]);
        ctx.strokeRect(x+5,y+5,T-10,T-10);ctx.setLineDash([]);
        if(c.progress>0){
          paint(ctx,x+9,y+T-9,T-18,3,'#382a23');paint(ctx,x+9,y+T-9,(T-18)*Math.min(1,c.progress/2.3),3,'#e5c081');
        }
      }
    }else if(j.kind==='door'||j.kind==='repair'){
      const x=j.x*T,y=(j.isDoor||j.kind==='door'?j.y:j.y+2)*T;
      paint(ctx,x+4,y+5,T-8,T-10,'#a4cab042');
      ctx.strokeStyle='#ecc28f';ctx.lineWidth=3;ctx.setLineDash([7,5]);
      ctx.strokeRect(x+5,y+6,T-10,T-13);ctx.setLineDash([]);
      txt(ctx,j.kind==='door'?'GATE':'REPAIR',x+T/2,y+T/2,16,'#f8dbaf','center');
      paint(ctx,x+7,y+T-10,T-14,4,'#273633');
      paint(ctx,x+7,y+T-10,(T-14)*Math.min(1,j.progress/j.required),4,'#e9c38d');
    }else{
      const x=j.x*T,y=j.y*T,w=j.w*T,h=3*T;
      paint(ctx,x+3,y+3,w-6,h-8,'#8db2a22c');
      ctx.strokeStyle='#dcb579';ctx.lineWidth=3;ctx.setLineDash([11,7]);
      ctx.strokeRect(x+5,y+5,w-10,h-14);ctx.setLineDash([]);
      for(let i=1;i<j.w;i++){line(ctx,x+i*T,y+13,x+i*T,y+h-20,'#d4c39966',2);}
      txt(ctx,j.kind==='upgrade'?'UPGRADING':'CONSTRUCTING',x+w/2,y+h/2,21,'#fae0ae','center');
      paint(ctx,x+35,y+h/2+17,w-70,6,'#283b3c');
      paint(ctx,x+35,y+h/2+17,(w-70)*Math.min(1,j.progress/j.required),6,'#e7bd7a');
    }
  }
}
function drawIncidents(ctx,s,t){
  for(const event of s.incidents){
    const r=M().getRoom(s,event.roomId);if(!r)continue;
    const x=(r.x+r.w*.5)*T,y=(r.y+1.8)*T;
    if(event.kind==='fire'){
      for(let i=0;i<5;i++){
        const xx=x+(i-2)*22,yy=y+Math.sin(t*.006+i)*8;
        ctx.fillStyle=i%2?'#da6d4c':'#f8ca7b';
        ctx.beginPath();ctx.moveTo(xx-12,yy+22);ctx.quadraticCurveTo(xx-9,yy-22,xx+3,yy-30-Math.sin(t*.01+i)*7);
        ctx.quadraticCurveTo(xx+20,yy+4,xx+10,yy+20);ctx.closePath();ctx.fill();
        glow(ctx,xx,yy,75,'#e99455',.12);
      }
      txt(ctx,'FIRE!',x,y-42,19,'#ffb183','center');
    }else{
      for(let i=0;i<7;i++){
        const xx=x+(i-3)*14,yy=y+12+Math.sin(t*.008+i)*8;
        ellipse(ctx,xx,yy,7,4,'#8caa79');
      }
      txt(ctx,'INFESTATION',x,y-35,17,'#d8cb8e','center');
    }
  }
  for(const ev of s.events.filter(e=>!e.cleared)){
    if(ev.kind==='collapse'){
      const x=ev.x*T,y=ev.y*T;
      paint(ctx,x+4,y+3,T-8,T-6,'#463b37a3');
      ctx.strokeStyle='#e4a078';ctx.lineWidth=3;ctx.strokeRect(x+3,y+3,T-6,T-6);
      txt(ctx,'HELP',x+T/2,y+35,17,'#ffad88','center');
      txt(ctx,Math.ceil(ev.air)+'s',x+T/2,y+53,12,'#f4dcc6','center');
    }
  }
  const h=s.threat;
  if(h){
    const x=(h.x+.5)*T,y=(h.y+1)*T-12;
    ellipse(ctx,x,y,20,5,'#071113');
    paint(ctx,x-23,y-92,46,83,h.kind==='feral'?'#485a47':'#673e38');
    ellipse(ctx,x,y-107,18,20,h.kind==='feral'?'#91aa7d':'#aa8073');
    for(let i of [-7,8])ellipse(ctx,x+i,y-109,3,3,'#c35f47');
    txt(ctx,h.kind==='feral'?'FERALS':'RAIDERS',x,y-143,17,'#f6b0a0','center');
    paint(ctx,x-23,y-132,46,4,'#3d2727');
    paint(ctx,x-23,y-132,46*Math.max(0,h.hp/h.max),4,'#d58a74');
  }
}
function roomBubbles(ctx,s,t){
  for(const r of s.rooms){
    if(!r.ready||r.captured)continue;
    const def=M().ROOM[r.type],x=(r.x+r.w*.5)*T,y=r.y*T+34+Math.sin(t*.004+r.id)*4;
    glow(ctx,x,y,52,'#f3dc9b',.18);
    ellipse(ctx,x,y,27,24,'#203d3d');
    ctx.strokeStyle='#d6bb7e';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y,27,24,0,0,Math.PI*2);ctx.stroke();
    txt(ctx,def.icon,x,y+11,30,'#f7e0ae','center');
    txt(ctx,'COLLECT',x,y+38,11,'#f6e3af','center');
  }
}
function tutorial(ctx,s,t){
  if(!s.tutorial||s.tasks.dug)return;
  const x=12*T,y=2*T,w=4*T,h=3*T;
  paint(ctx,x,y,w,h,'#e9be7620');
  ctx.strokeStyle='#f7d58c';ctx.lineWidth=3;ctx.setLineDash([11,8]);
  ctx.lineDashOffset=-t*.022%19;ctx.strokeRect(x+4,y+4,w-8,h-8);ctx.setLineDash([]);
  txt(ctx,'START DIGGING HERE',x+w/2,y-12,18,'#fce3a5','center');
}
function overlay(ctx,s,input,t){
  if(input?.drag&&input.drag.mode!=='pan'){
    const a=input.drag.a,b=input.drag.b;let x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x)+1,h=Math.abs(b.y-a.y)+1;
    if(input.drag.mode==='build'){y=M().rowTop(a.y);h=3;w=Math.max(3,w);}
    paint(ctx,x*T+2,y*T+2,w*T-4,h*T-4,input.drag.mode==='dig'?'#f3c4772c':'#a3d6b131');
    ctx.strokeStyle=input.drag.mode==='dig'?'#f5ca82':'#b7e7c5';ctx.lineWidth=3;ctx.setLineDash([10,5]);
    ctx.strokeRect(x*T+4,y*T+4,w*T-8,h*T-8);ctx.setLineDash([]);
    txt(ctx,input.drag.mode==='dig'?'EXCAVATION':'ROOM FOOTPRINT',x*T+w*T/2,y*T-10,15,'#f5e0b9','center');
  }
  if(input?.hover&&input.mode==='dig'){
    const x=input.hover.x,y=input.hover.y;if(M().valid(x,y)){ctx.strokeStyle='#f5d593';ctx.lineWidth=2;
      ctx.strokeRect(x*T+2,y*T+2,T-4,T-4);}
  }
  if(input?.selected?.kind==='room'){
    const r=M().getRoom(s,input.selected.id);
    if(r){ctx.strokeStyle='#fce0aa';ctx.lineWidth=3;ctx.strokeRect(r.x*T-3,r.y*T-3,r.w*T+6,3*T+6);}
  }
}
function render(ctx,s,camera,screen,input,t){
  const dpr=Math.min(2,window.devicePixelRatio||1);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  paint(ctx,0,0,screen.width,screen.height,'#0f2125');
  ctx.save();
  ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);
  const bounds={
    x0:Math.max(0,Math.floor(camera.x/T)-1),
    x1:Math.min(M().W-1,Math.ceil((camera.x+screen.width/camera.zoom)/T)+1),
    y0:Math.max(0,Math.floor(camera.y/T)-1),
    y1:Math.min(M().H-1,Math.ceil((camera.y+screen.height/camera.zoom)/T)+1)
  };
  sky(ctx,s,t);soil(ctx,s,t,bounds);
  hatch(ctx,s,t);
  // Rooms are physically within rock, never pasted into the GUI.
  for(const r of s.rooms){roomFrame(ctx,s,r,t);props(ctx,s,r,t);}
  for(const l of s.ladders)drawLadder(ctx,s,l);
  for(const d of s.doors)blast(ctx,s,d,t);
  drawJobs(ctx,s,t);
  roomBubbles(ctx,s,t);
  drawIncidents(ctx,s,t);
  for(const p of s.people)human(ctx,p,t,input?.selected?.kind==='person'&&input.selected.id===p.id);
  tutorial(ctx,s,t);dust(ctx,s,t,{x:camera.x,y:camera.y,w:screen.width/camera.zoom,h:screen.height/camera.zoom});
  overlay(ctx,s,input,t);
  ctx.restore();
}
function drawExpedition(ctx,site,e,progress,width,height,t){
  ctx.setTransform(1,0,0,1,0,0);
  const g=gradient(ctx,0,0,0,height,[[0,'#40504e'],[1,'#182729']]);
  paint(ctx,0,0,width,height,g);
  const gap=8,margin=13,unit=(width-margin*2-gap*3)/4;
  for(let i=0;i<site.rooms.length;i++){
    const room=site.rooms[i],xx=margin+i*(unit+gap),yy=20;
    const seen=progress.searched[i];
    const shaded=gradient(ctx,xx,yy,unit,height-45,[[0,seen?'#2a3838':'#46534a'],[1,'#1b2c33']]);
    paint(ctx,xx,yy,unit,height-45,shaded);
    ctx.strokeStyle=seen?'#54635b':'#8fa393';ctx.lineWidth=4;ctx.strokeRect(xx,yy,unit,height-45);
    for(let p=0;p<4;p++){paint(ctx,xx+7+p*(unit-16)/4,yy+38,3,height-120,'#a3b49d25');}
    txt(ctx,room.name.toUpperCase(),xx+unit/2,yy+24,Math.min(16,unit/10),'#ecddbb','center');
    txt(ctx,room.icon,xx+unit/2,yy+106,Math.min(52,unit/2),seen?'#788e84':'#d9bb85','center');
    txt(ctx,seen?'CLEARED':room.enemy?'DANGER':room.task==='salvage'?'SALVAGE':'SEARCH',
      xx+unit/2,height-36,12,seen?'#82978a':room.enemy?'#e6a088':'#d2c8a9','center');
  }
  const x=margin+(e.pos+.06)*(unit+gap);
  ellipse(ctx,x,height-29,21,5,'#0c1a1d');
  ellipse(ctx,x,height-95,17,19,'#c6a084');
  paint(ctx,x-16,height-78,32,46,'#719588');paint(ctx,x-13,height-33,7,18,'#283b3b');paint(ctx,x+6,height-33,7,18,'#283b3b');
  txt(ctx,'SCAVENGERS',x,height-119,14,'#f3e3c0','center');
  if(e.action&&e.action.phase==='searching'){
    const i=e.action.index,xx=margin+i*(unit+gap);
    paint(ctx,xx+20,height-52,unit-40,4,'#142b2e');
    paint(ctx,xx+20,height-52,(unit-40)*Math.min(1,e.action.progress/e.action.duration),4,'#ddb77a');
  }
}
window.VaultArt={render,drawExpedition};
})();