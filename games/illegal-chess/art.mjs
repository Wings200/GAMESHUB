// Original illustrated SVG artwork for all live Illegal Chess cards.
// SVGs are rendered as actual image assets inside the cards; no external asset host.
const cache=new Map();
const palettes={Common:["#aebed4","#203b5c"],Uncommon:["#6ce0b4","#134a42"],Rare:["#81b2ff","#263d7b"],Epic:["#d29bff","#563079"],Legendary:["#ffd17c","#7b5224"]};
function mark(id,accent){
 const glyph=(c,x,y,size=112,stroke="#0c1628")=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="DejaVu Sans, Segoe UI Symbol,serif" font-size="${size}" fill="#fcf6e7" stroke="${stroke}" stroke-width="3" paint-order="stroke">${c}</text>`;
 const ray=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${accent}" stroke-width="8" stroke-linecap="round" filter="url(#glow)"/>`;
 switch(id){
  case "pawn-sidestep":return glyph("♙",170,177)+`<path d="M104 192h-58m0 0 20-20m-20 20 20 20M236 192h58m0 0-20-20m20 20-20 20" stroke="${accent}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  case "pawn-ram":return glyph("♙",125,199,113)+glyph("♟",222,118,91)+`<path d="M174 144L220 85m0 0-30 11m30-11-4 30" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M69 203l204-146" stroke="${accent}" stroke-opacity=".34" stroke-width="5" stroke-dasharray="10 7"/>`;
  case "friendly-fire":return glyph("♖",111,192,124)+glyph("♙",236,170,105)+`<path d="M174 56l22 43-44-11 33 38-46 11 49 11-13 49 34-35 29 35-11-48 48-14-50-12 21-42-40 22Z" fill="${accent}" opacity=".8"/>`;
  case "pawn-strike":return glyph("♙",110,190,109)+glyph("♟",233,190,109)+`<rect x="57" y="93" width="226" height="61" rx="12" fill="#0d1427" stroke="${accent}" stroke-width="6"/><text x="170" y="138" text-anchor="middle" font-size="40" font-weight="900" font-family="system-ui" fill="${accent}">ON STRIKE</text>`;

  case "voluntary-eviction":return glyph("♟",170,169)+`<path d="M82 185l176 0-22 15-22-6-28 16-29-16-27 16-29-15Z" fill="#08111e"/>`+ray(110,194,235,224);
  case "colorblind-bishop":return`<rect x="106" y="55" width="128" height="128" fill="#eef1e9" opacity=".9"/><rect x="106" y="55" width="64" height="64" fill="#172336"/><rect x="170" y="119" width="64" height="64" fill="#172336"/>`+glyph("♗",170,177,126);
  case "knight-exchange":return glyph("♞",106,169,91)+glyph("♙",237,169,85)+`<path d="M146 84h52l-12-13m12 13-12 14M194 196h-51l12-13m-12 13 12 13" stroke="${accent}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  case "parking-ticket":return`<g transform="rotate(-13 171 127)"><rect x="104" y="49" width="133" height="161" rx="12" fill="#f6eed8" stroke="${accent}" stroke-width="5"/><path d="M118 88h104M118 180h104" stroke="#b4abc0" stroke-width="3" stroke-dasharray="7 6"/><text x="170" y="150" text-anchor="middle" font-size="73" font-weight="900" font-family="system-ui" fill="#243252">P</text></g>`;
  case "reserved-parking":return`<g transform="rotate(6 170 128)"><rect x="101" y="53" width="138" height="153" rx="15" fill="#09182f" stroke="${accent}" stroke-width="9"/><text x="170" y="170" text-anchor="middle" font-size="120" font-weight="950" fill="#f1f5ff" font-family="system-ui">P</text></g>`;
  case "ceasefire":return`<path d="M125 62v159M212 70v151" stroke="#eaf3ff" stroke-width="6"/><path d="M127 67q38-30 72 0v66q-41-30-72 0Z" fill="${accent}"/><path d="M213 75q-42-27-71 5v69q34-34 71-5Z" fill="#f8fcff"/><path d="M106 214h130" stroke="${accent}" stroke-width="6" stroke-linecap="round"/>`;
  case "double-ko":return glyph("♘",120,170,97)+glyph("♝",225,170,97)+`<path d="M176 62l10 45 41-32-21 44 51 6-48 21 24 38-47-20-17 43-10-45-43 23 27-41-43-18 52-10-13-48Z" fill="${accent}" opacity=".86"/>`;
  case "hit-and-run":return`<path d="M36 83h115M21 117h102M42 159h97" stroke="${accent}" stroke-width="9" stroke-linecap="round" opacity=".9"/>`+glyph("♞",216,183,140);
  case "queens-abdication":return glyph("♕",169,183,131)+`<path d="M95 62l33 25 13-40 29 38 30-38 14 40 30-25-25 70H117Z" stroke="${accent}" stroke-width="5" fill="${accent}" fill-opacity=".33"/>`;
  case "black-market":return`<g transform="rotate(-17 140 125)"><rect x="80" y="64" width="121" height="138" rx="12" fill="#111d32" stroke="${accent}" stroke-width="6"/>${glyph("♜",139,168,90)}</g><g transform="rotate(15 215 127)"><rect x="165" y="50" width="115" height="139" rx="12" fill="#2b1b24" stroke="#fff4d7" stroke-width="5"/>${glyph("♞",222,157,83)}</g><path d="M115 217h116l-22-17m22 17-22 16" stroke="${accent}" stroke-width="6" stroke-linecap="round" fill="none"/>`;
  case "insurance-fraud":return glyph("♘",161,183,128)+`<path d="M169 30L251 65V127Q246 192 169 218Q92 193 87 127V65Z" stroke="${accent}" fill="#08152a" fill-opacity=".2" stroke-width="8"/><path d="M169 51L228 77V128Q221 175 169 192Q117 174 111 128V77Z" stroke="#fff3dc" fill="none" stroke-width="4" opacity=".67"/><text x="269" y="82" font-family="system-ui" font-size="46" font-weight="900" fill="${accent}">$</text>`;
  case "prisoner-exchange":return glyph("♙",110,170,118)+glyph("♟",238,170,116)+`<path d="M125 64h93l-22-18m22 18-22 18M224 205h-94l22-18m-22 18 22 18" stroke="${accent}" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M170 70v142" stroke="#fff3dd" stroke-width="3" stroke-dasharray="9 8" opacity=".45"/>`;
  case "relocation-order":return glyph("♜",100,182,118)+glyph("♞",244,172,107)+`<path d="M120 78Q171 13 236 83" stroke="${accent}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M238 52l4 37-33-16" stroke="${accent}" stroke-width="7" fill="none" stroke-linejoin="round"/><rect x="146" y="103" width="45" height="45" stroke="#fff4df" stroke-width="4" fill="#101c30" opacity=".8" transform="rotate(13 170 125)"/>`;
  case "delayed-en-passant":return glyph("♙",107,175,118)+glyph("♟",227,180,112)+`<circle cx="166" cy="114" r="55" stroke="${accent}" stroke-width="8" stroke-dasharray="10 9" fill="none"/><path d="M165 63v52l30 18" stroke="#fff1dc" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M95 204L235 64l-2 38m2-38-38 1" stroke="${accent}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  case "promotion-recall":return glyph("♙",101,184,125)+glyph("♖",240,171,118)+`<path d="M125 206Q185 221 232 120" stroke="${accent}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M229 151l5-34-30 16" stroke="${accent}" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="239" cy="84" r="44" fill="#081424" stroke="#fff4d9" stroke-dasharray="7 8" stroke-width="4"/><path d="M217 84h45m-23-22v45" stroke="${accent}" stroke-width="9" stroke-linecap="round"/>`;
  case "time-capsule":return glyph("♘",169,186,132)+`<rect x="69" y="35" width="203" height="167" rx="24" fill="none" stroke="${accent}" stroke-width="9"/><circle cx="168" cy="120" r="89" fill="none" stroke="#fff4d9" stroke-dasharray="11 11" stroke-width="5" opacity=".75"/><path d="M167 38v32m0 100v34M79 120h33m111 0h35" stroke="${accent}" stroke-width="7" stroke-linecap="round"/><path d="M135 58Q80 79 116 121l-26-4m26 4 1-27" stroke="#fff6df" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  case "identity-theft":return glyph("♘",102,179,119)+glyph("♗",239,172,124)+`<path d="M110 55Q177 8 236 60m0 0-32-9m32 9-13 30M236 203Q171 251 105 200m0 0 35 9m-35-9 14-28" stroke="${accent}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M139 98l64 61m-64 0 64-61" stroke="#fef1db" stroke-width="5" opacity=".55"/>`;
  case "objection":return`<g transform="rotate(-11 170 115)"><rect x="91" y="51" width="158" height="134" rx="12" fill="#1b2039" stroke="${accent}" stroke-width="7"/><text x="170" y="112" font-family="system-ui" font-weight="900" text-anchor="middle" font-size="35" fill="#fff1da">OBJECTION!</text><path d="M110 141h121M110 158h121" stroke="#fff2dd" stroke-opacity=".6" stroke-width="5"/></g><path d="M180 192v31M118 222h124M169 193l62-51" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>`;
  case "classified-promotion":return glyph("♙",119,175,128)+`<rect x="148" y="57" width="139" height="138" rx="12" fill="#121a2e" stroke="${accent}" stroke-width="7"/><path d="M167 99h91M167 122h76M167 145h88" stroke="#a7b4ce" stroke-width="9" stroke-linecap="round" opacity=".7"/><text x="218" y="182" text-anchor="middle" font-size="49" font-weight="900" font-family="system-ui" fill="#fff3d3">?</text><path d="M174 38l93 174" stroke="${accent}" stroke-width="5" stroke-dasharray="10 9"/></g>`.replace("</g>",""); 
  case "counterfeit":return`<rect x="60" y="47" width="134" height="163" rx="12" fill="#192341" stroke="${accent}" stroke-width="8" transform="rotate(-11 127 130)"/><rect x="151" y="47" width="134" height="163" rx="12" fill="#2c1b38" stroke="#fff0ca" stroke-width="7" transform="rotate(12 219 130)"/>`+glyph("♕",119,176,102)+glyph("♕",220,178,98)+`<path d="M139 73h71m-17-16 17 16-17 16" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>`;
  case "bishop-sniper":return`<circle cx="254" cy="86" r="38" stroke="${accent}" stroke-width="3" fill="none"/><circle cx="254" cy="86" r="16" stroke="#ffb6bb" stroke-width="3" fill="none"/><path d="M254 33v106M201 86h106" stroke="#ffb6bb" stroke-width="2" opacity=".8"/>`+glyph("♗",110,206,132)+ray(134,148,252,85)+`<path d="M140 156L267 78" stroke="#fff4df" stroke-width="3" stroke-dasharray="14 8"/>`;
  default:return glyph("♟",170,174);
 }
}
export function cardImage(id,rarity="Common"){
 const key=id+":"+rarity;if(cache.has(key))return cache.get(key);
 const [accent,deep]=palettes[rarity]||palettes.Common;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="680" height="480" viewBox="0 0 340 240" aria-hidden="true">
 <defs>
 <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b1728"/><stop offset=".54" stop-color="${deep}"/><stop offset="1" stop-color="#070c18"/></linearGradient>
 <radialGradient id="aura"><stop stop-color="${accent}" stop-opacity=".32"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
 <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse" patternTransform="skewX(-18)"><path d="M32 0H0V32" stroke="#e0eaff" opacity=".14" fill="none"/></pattern>
 <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 </defs>
 <rect width="340" height="240" fill="url(#bg)"/>
 <ellipse cx="170" cy="112" rx="175" ry="135" fill="url(#aura)"/>
 <path d="M0 145L340 69V240H0Z" fill="url(#grid)" opacity=".7"/>
 <circle cx="170" cy="126" r="105" stroke="${accent}" stroke-opacity=".18" fill="none"/>
 <path d="M-30 218L360 19" stroke="${accent}" stroke-opacity=".19" stroke-width="9"/>
 <path d="M30 0L0 30M310 240l30-30" stroke="${accent}" stroke-width="3" opacity=".6"/>
 ${mark(id,accent)}
 <rect x="1.5" y="1.5" width="337" height="237" rx="6" fill="none" stroke="${accent}" stroke-opacity=".55" stroke-width="3"/>
 </svg>`;
 const url="data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg);
 cache.set(key,url);return url;
}
