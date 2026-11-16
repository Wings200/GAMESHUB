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
