// «Selbst gestalten»: Schweizer Masse in Produkttexten und Optionswerten (rein, ohne Netz).
// Regel (Besitzer 05.11.2026: «auf schweizer masse … bei jedem selbstgestalten produkt»): kein Zoll, oz, lb, US gal; cm, ml, g, kg.
//  - Metrisch steht schon da, Imperial in Klammern daneben  → Klammer weg.
//  - Imperial steht vorn, Metrisch in Klammern dahinter     → nur das Metrische.
//  - Nur Tassengrössen in oz (11/15/20)                     → ml (Printful: 1 US fl oz = 29,5735 ml: 325 / 444 / 591 ml).
//  - Laptop-Grössen 13″/15″ (Bildschirmdiagonale)           → «13 Zoll»/«15-Zoll-Laptop» (Laptops heissen auch in der Schweiz nach der Zoll-Diagonale; kein Mass der Ware).
// Es werden nur Textstellen angefasst, nie Tags/Attribute (Bild-Adressen, data-Attribute).

const FRAC = '⅛¼⅜½⅝¾⅞';
const ZAHL = `(?:\\d+(?:[.,]\\d+)?[${FRAC}]?|[${FRAC}])`;
const ZOLLZEICHEN = '(?:″|”|"|\\u2033)';
// Klammer, in der NUR Imperiales steht (Zahlen, Bruchzeichen, Bereichsstriche, Leerzeichen, × und danach eine Imperial-Einheit)
const IMP_KLAMMER = new RegExp(`\\s*\\((?:[\\d.,\\s×x\\-–${FRAC}]+)\\s?(?:oz\\.?(?:\\/yd\\.?²?)?|lbs?\\.?|US\\s?gal|Zoll|inch(?:es)?|${ZOLLZEICHEN})(?![A-Za-zÄÖÜäöü])[^)]*\\)`, 'g');
const REGELN = [
  // 1. Imperial vorn, Metrisch in Klammern: «32 oz. (950 ml)» → «950 ml»
  { name: 'oz-vorn', re: new RegExp(`${ZAHL}\\s?(?:fl\\.?\\s?)?oz\\.?\\s*\\((${ZAHL}\\s?(?:ml|l|g|kg))\\)`, 'g'), ers: '$1' },
  // «9,92″ (25,2 cm)» → «25,2 cm»
  { name: 'zoll-vorn', re: new RegExp(`${ZAHL}\\s?${ZOLLZEICHEN}\\s*\\((${ZAHL}\\s?cm)\\)`, 'g'), ers: '$1' },
  // «5,9 oz./yd.² (200 g/m²)» → «200 g/m²»
  { name: 'stoffgewicht-vorn', re: new RegExp(`${ZAHL}\\s?oz\\.?\\/yd\\.?²?\\s*\\((${ZAHL}\\s?g\\/m²)\\)`, 'g'), ers: '$1' },
  // «5,5 × 8,5 Zoll (14 × 21,6 cm)» → «14 × 21,6 cm»
  { name: 'format-zoll-vorn', re: new RegExp(`${ZAHL}\\s?[×x]\\s?${ZAHL}\\s?(?:Zoll|${ZOLLZEICHEN})\\s*\\((${ZAHL}\\s?[×x]\\s?${ZAHL}\\s?cm)\\)`, 'g'), ers: '$1' },
  // Poster: «Zollformate: 12×16″ ≈ 30×40 cm, …» → «Formate: 30×40 cm, …»
  { name: 'poster-zollformate', re: new RegExp(`${ZAHL}\\s?[×x]\\s?${ZAHL}\\s?${ZOLLZEICHEN}\\s?≈\\s?`, 'g'), ers: '' },
  { name: 'poster-wort', re: /Zollformate:/g, ers: 'Formate:' },
  // 2. Metrisch steht schon da, Imperiales in Klammern: Klammer weg
  { name: 'imperial-klammer', re: IMP_KLAMMER, ers: '' },
  // 3. Tassen
  { name: 'tasse-11', re: /\b11 oz\b(?!\.?\/)/g, ers: '325 ml' },
  { name: 'tasse-15', re: /\b15 oz\b(?!\.?\/)/g, ers: '444 ml' },
  { name: 'tasse-20', re: /\b20 oz\b(?!\.?\/)/g, ers: '591 ml' },
  // 4. Laptop-Hüllen
  { name: 'laptop-bindestrich', re: new RegExp(`\\b(1[1-7])\\s?${ZOLLZEICHEN}\\s?-\\s?Laptop`, 'g'), ers: '$1-Zoll-Laptop' },
  { name: 'laptop-zoll', re: new RegExp(`\\b(1[1-7])\\s?${ZOLLZEICHEN}`, 'g'), ers: '$1 Zoll' },
];
// Strenger Melder: was nach der Bereinigung noch imperial aussieht (nur Textstellen). «Zoll» allein zählt nur mit Zahl davor und ohne «cm (» davor.
const REST = new RegExp(`(?:${ZAHL}\\s?(?:fl\\.?\\s?)?oz\\b|${ZAHL}\\s?(?:lbs?)\\b|${ZAHL}\\s?US\\s?gal\\b|(?<![\\d.,„“«»])${ZAHL}\\s?${ZOLLZEICHEN}|${ZAHL}\\s?(?:Zoll|inch(?:es)?)\\b(?!\\)))`, 'gi');

/** Wendet die Regeln auf eine Textstelle (ohne Tags) an. */
export function bereinigeText(s) {
  let out = String(s ?? ''), treffer = [];
  for (const r of REGELN) {
    const n = (out.match(r.re) || []).length;
    if (n) { treffer.push(`${r.name}×${n}`); out = out.replace(r.re, r.ers); }
  }
  return { text: out, treffer };
}

/** HTML: nur Textknoten bereinigen (Tags und Attribute bleiben Byte für Byte). */
export function bereinigeHtml(html) {
  const teile = String(html ?? '').split(/(<[^>]*>)/);
  const treffer = [];
  const neu = teile.map((t, i) => {
    if (i % 2 === 1) return t;                       // Tag
    const r = bereinigeText(t);
    treffer.push(...r.treffer);
    return r.text;
  });
  return { html: neu.join(''), treffer };
}

/** Optionswert (Anzeigename) bereinigen; null, wenn unverändert. */
export function bereinigeWert(wert) {
  const r = bereinigeText(wert);
  const neu = r.text.replace(/\s{2,}/g, ' ').trim();
  return neu !== wert ? neu : null;
}

/** Was nach der Bereinigung noch imperial aussieht (Textknoten). */
export function restImperial(html) {
  const rest = [];
  String(html ?? '').split(/(<[^>]*>)/).forEach((t, i) => {
    if (i % 2 === 1) return;
    for (const m of t.matchAll(REST)) { if (/^1[1-7]\s?Zoll$/.test(m[0]) && (/Laptop/i.test(t) || t.trim() === m[0])) continue; rest.push(t.slice(Math.max(0, m.index - 25), m.index + m[0].length + 25).trim()); }
  });
  return rest;
}
