// GAMESHUB Illegal Chess: legal chess rules shared by Pages Functions and browser tools.
// 0x88 board; kings cannot be captured, checks and castling are validated.
export const START_FEN="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
export const on=i=>i>=0&&i<128&&!(i&0x88);
export const side=p=>!p||p==="."?0:p===p.toUpperCase()?1:-1;
export const sq=i=>"abcdefgh"[i&7]+(8-(i>>4));
export const idx=s=>(8-Number(s[1]))*16+"abcdefgh".indexOf(s[0]);
export const isSquare=s=>typeof s==="string"&&/^[a-h][1-8]$/.test(s);
const dirs={n:[-33,-31,-18,-14,14,18,31,33],b:[-17,-15,15,17],r:[-16,-1,1,16],k:[-17,-16,-15,-1,1,15,16,17]};
const rookBits={119:1,112:2,7:4,0:8};
export function parseFen(fen=START_FEN){
 const f=fen.trim().split(/\s+/),rows=f[0]?.split("/"),b=Array(128).fill(".");
 if(rows?.length!==8||!["w","b"].includes(f[1])||!/^(?:-|K?Q?k?q?)$/.test(f[2])||!/^(?:-|[a-h][36])$/.test(f[3]))throw Error("Invalid FEN");
 rows.forEach((row,r)=>{let c=0;for(const p of row){if(/^[1-8]$/.test(p))c+=Number(p);else{if(!/^[prnbqkPRNBQK]$/.test(p)||c>=8)throw Error("Bad FEN rank");b[r*16+c++]=p;}}if(c!==8)throw Error("Bad FEN width");});
 if(b.filter(p=>p==="K").length!==1||b.filter(p=>p==="k").length!==1)throw Error("Must have one king each");
 return {b,t:f[1]==="w"?1:-1,c:(f[2].includes("K")?1:0)|(f[2].includes("Q")?2:0)|(f[2].includes("k")?4:0)|(f[2].includes("q")?8:0),ep:f[3]==="-"?-1:idx(f[3]),half:Number(f[4]||0),full:Number(f[5]||1)};
}
export function fen(s){
 let rows=[];
 for(let r=0;r<8;r++){let line="",empty=0;for(let c=0;c<8;c++){const p=s.b[r*16+c];if(p===".")empty++;else{if(empty)line+=empty;empty=0;line+=p;}}if(empty)line+=empty;rows.push(line);}
 const cast=(s.c&1?"K":"")+(s.c&2?"Q":"")+(s.c&4?"k":"")+(s.c&8?"q":"");
 return rows.join("/")+" "+(s.t===1?"w":"b")+" "+(cast||"-")+" "+(s.ep<0?"-":sq(s.ep))+" "+s.half+" "+s.full;
}
export const clone=s=>({...s,b:s.b.slice()});
export function attacked(s,target,by){
 for(let f=0;f<128;f++){if(!on(f)||side(s.b[f])!==by)continue;
  const p=s.b[f].toLowerCase();
  if(p==="p"){if(target===f-16*by-1||target===f-16*by+1)return true;continue;}
  for(const d of dirs[p]||dirs.k)for(let t=f+d;on(t);t+=d){if(t===target)return true;if(s.b[t]!=="."||p==="n"||p==="k")break;}
 }return false;
}
export const inCheck=(s,c=s.t)=>attacked(s,s.b.indexOf(c===1?"K":"k"),-c);
export function updateRights(s,f,t,piece,captured){
 let c=s.c;if(piece==="K")c&=~3;if(piece==="k")c&=~12;
 if(piece?.toLowerCase()==="r")c&=~(rookBits[f]||0);
 if(captured?.toLowerCase()==="r")c&=~(rookBits[t]||0);
 return c;
}
export function apply(s,m){
 const [f,t,promo,flag]=m,b=s.b.slice(),piece=b[f],captured=b[t];let c=updateRights(s,f,t,piece,captured);
 b[f]=".";b[t]=promo?(s.t===1?promo.toUpperCase():promo):piece;
 if(flag==="ep")b[t+16*s.t]=".";
 if(flag==="castle"){const rf=t>f?f+3:f-4,rt=t>f?f+1:f-1;b[rt]=b[rf];b[rf]=".";}
 return {b,t:-s.t,c,ep:piece.toLowerCase()==="p"&&Math.abs(t-f)===32?(t+f)/2:-1,half:piece.toLowerCase()==="p"||captured!=="."||flag==="ep"?0:s.half+1,full:s.full+(s.t===-1?1:0)};
}
export function pseudo(s){
 const out=[];
 for(let f=0;f<128;f++){
  if(!on(f)||side(s.b[f])!==s.t)continue;
  const p=s.b[f].toLowerCase();
  const add=(t,flag="")=>{if(s.b[t].toLowerCase()==="k")return;if(p==="p"&&((t>>4)===0||(t>>4)===7))for(const q of ["q","r","b","n"])out.push([f,t,q,flag]);else out.push([f,t,"",flag]);};
  if(p==="p"){
   const t=f-16*s.t;
   if(on(t)&&s.b[t]==="."){add(t);const u=t-16*s.t;if((f>>4)===(s.t===1?6:1)&&s.b[u]===".")add(u);}
   for(const d of [-1,1]){const u=t+d;if(!on(u))continue;if(side(s.b[u])===-s.t)add(u);else if(u===s.ep&&s.b[u]==="."&&s.b[u+16*s.t]===(s.t===1?"p":"P"))add(u,"ep");}
  }else{
   for(const d of dirs[p]||dirs.k)for(let t=f+d;on(t);t+=d){if(side(s.b[t])===s.t)break;add(t);if(s.b[t]!=="."||p==="n"||p==="k")break;}
   const home=s.t===1?116:4,rook=s.t===1?"R":"r",bits=s.t===1?[1,2]:[4,8];
   if(p==="k"&&f===home&&!inCheck(s)){
    if((s.c&bits[0])&&s.b[f+3]===rook&&s.b[f+1]==="."&&s.b[f+2]==="."&&!attacked(s,f+1,-s.t)&&!attacked(s,f+2,-s.t))add(f+2,"castle");
    if((s.c&bits[1])&&s.b[f-4]===rook&&s.b[f-1]==="."&&s.b[f-2]==="."&&s.b[f-3]==="."&&!attacked(s,f-1,-s.t)&&!attacked(s,f-2,-s.t))add(f-2,"castle");
   }
  }
 }return out;
}
export const legal=s=>pseudo(s).filter(m=>!inCheck(apply(s,m),s.t));
export function positionKey(s){return s.b.join("")+":"+s.t+":"+s.c+":"+(s.ep>=0&&legal(s).some(m=>m[3]==="ep")?s.ep:-1);}
export function insufficient(s){
 const p=[];for(let i=0;i<128;i++)if(on(i)&&s.b[i]!=="."&&s.b[i].toLowerCase()!=="k")p.push([s.b[i].toLowerCase(),((i>>4)+(i&7))%2]);
 return !p.length||(p.length===1&&["b","n"].includes(p[0][0]))||(p.every(x=>x[0]==="b")&&new Set(p.map(x=>x[1])).size===1);
}
export function stateStatus(s,history=[s],moveList=legal(s)){
 if(!moveList.length)return {done:true,text:inCheck(s)?(s.t===1?"Black":"White")+" wins by checkmate":"Draw by stalemate"};
 if(insufficient(s))return {done:true,text:"Draw by insufficient material"};
 const repeats=history.filter(p=>positionKey(p)===positionKey(s)).length;
 if(s.half>=150)return {done:true,text:"Draw by 75-move rule"};
 if(repeats>=5)return {done:true,text:"Draw by fivefold repetition"};
 return {done:false,text:(s.t===1?"White":"Black")+" to move"+(inCheck(s)?" · CHECK":"")};
}
