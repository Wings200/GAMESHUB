// Original matching chess piece silhouettes: one SVG geometry per type.
// Black and White share exactly the same shape; only material colors change.
// Using SVG instead of font glyphs avoids platform-specific white-piece interiors.
const SHAPES={
 p:`<circle cx="50" cy="25" r="13"/><path d="M43 38h14l3 7c-1 12 10 20 12 31H28c2-11 13-19 12-31z"/><path d="M27 76h46v7H27z"/><path d="M20 84h60v6H20z"/>`,
 r:`<path d="M23 16h11v11h10V16h12v11h10V16h11v26H23z"/><path d="M30 42h40l-4 34H34z"/><path d="M25 76h50v8H25z"/><path d="M19 84h62v7H19z"/>`,
 n:`<path d="M29 80c4-9 7-21 4-34l-5-9 10-10 3-15 14 9c14 0 25 7 26 20l-4 13-17 3-13-5c-2 13 9 20 16 28z"/><path d="M23 80h54v8H23z"/><path d="M21 88h58v5H21z"/><path d="M56 39l7 2"/>`,
 b:`<path d="M50 14c-13 12-21 24-21 37 0 12 12 18 21 21 9-3 21-9 21-21 0-13-8-25-21-37z"/><path d="M59 27 41 55"/><path d="M38 69h24l6 8H32z"/><path d="M25 77h50v8H25z"/><path d="M19 85h62v6H19z"/>`,
 q:`<circle cx="20" cy="19" r="5"/><circle cx="35" cy="13" r="5"/><circle cx="50" cy="9" r="5"/><circle cx="65" cy="13" r="5"/><circle cx="80" cy="19" r="5"/><path d="M19 26l10 38h42l10-38-19 18-12-25-12 25z"/><path d="M29 66h42v9H29z"/><path d="M23 76h54v8H23z"/><path d="M18 85h64v6H18z"/>`,
 k:`<path d="M46 9h8v14h12v8H54v11h-8V31H34v-8h12z"/><path d="M38 43c-11 6-13 15-9 25l9 8h24l9-8c4-10 2-19-9-25z"/><path d="M31 75h38v9H31z"/><path d="M20 84h60v8H20z"/>`
};
const SVG_NS="http://www.w3.org/2000/svg";
export function pieceColors(piece){
 const black=piece===piece.toLowerCase();
 return black?{fill:"#10161e",stroke:"#8997ab",detail:"#3c4b60"}:
 {fill:"#f9f4e8",stroke:"#243348",detail:"#ddd3be"};
}
export function makePieceSVG(piece){
 const shape=SHAPES[piece?.toLowerCase()];
 if(!shape)return null;
 const {fill,stroke,detail}=pieceColors(piece);
 const svg=document.createElementNS(SVG_NS,"svg");
 svg.setAttribute("viewBox","0 0 100 100");
 svg.setAttribute("class","chessPieceSVG");
 svg.setAttribute("focusable","false");
 svg.setAttribute("aria-hidden","true");
 // Identical geometry on both teams. Solid fills make black genuinely black.
 svg.innerHTML=`<g fill="${fill}" stroke="${stroke}" stroke-width="2.9" stroke-linejoin="round" stroke-linecap="round">${shape}</g><path d="M31 81h38" fill="none" stroke="${detail}" stroke-width="2" opacity=".65"/>`;
 return svg;
}
export const pieceShapeTypes=Object.freeze(Object.keys(SHAPES));
