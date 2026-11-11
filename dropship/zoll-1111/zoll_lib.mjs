// Zoll-Werte in Optionswerten auf Deutsch bringen (11.11.2026). Rein, ohne Netz; Test: zoll_test.mjs.
//
// Regel: «15.6inch» → «15,6 Zoll»; wo die Grösse ein Gegenstand ist (Teller, Armband, Lampe, Rahmen), zusätzlich
// die gerundeten Zentimeter: «7inch» → «7 Zoll (18 cm)». Bei Bildschirm-, Laptop-, Koffer- und Velogrössen bleibt es bei
// Zoll (so wird im Handel gemessen). Masse mit «x»: «6x 4 Inches» → «6 × 4 Zoll (15 × 10 cm)».
// Ein Wert, in dem danach noch englische Wörter stehen («flat pan», «headset», «of new dry roses»), wird NICHT angefasst
// (Urteil von Hand), ebenso Werte mit Fuss (FT) oder ohne Zahl vor «inch».

const NUM = String.raw`\d+(?:\.\d+)?`;
const EINHEIT = String.raw`\s*(?:inches|inch)\b\.?`;
const MASS = new RegExp(String.raw`(${NUM})\s*[x×X]\s*(${NUM})(?:\s*[x×X]\s*(${NUM}))?${EINHEIT}`, 'gi');
const MASS_JE = new RegExp(String.raw`(${NUM})${EINHEIT}\s*[xX×]\s*(${NUM})${EINHEIT}(?:\s*[xX×]\s*(${NUM})${EINHEIT})?`, 'gi');
const EINZEL = new RegExp(String.raw`(${NUM})${EINHEIT}`, 'gi');
const ZOLL_NUR = /laptop|notebook|business|rucksack|backpack|koffer|reisegep|trolley|gepack|velo|bildschirm|navigator|tastatur|tablet|sportuhr|tv-|reifenheber|monitor/i;
// Englische Wörter, die nach dem Ersetzen auf ein Urteil von Hand hinweisen (Liste aus den 119 Produkten vom 11.11.)
const ENGLISCH = new Set(['of', 'the', 'new', 'with', 'and', 'to', 'screen', 'flat', 'pan', 'deep', 'dish', 'hat', 'bowl', 'headset', 'pants', 'fleece',
  'composite', 'hook', 'no', 'meters', 'meter', 'plane', 'times', 'magnification', 'sliver', 'silver', 'blue', 'bell', 'black', 'frame', 'first',
  'generat', 'generation', 'original', 'pear', 'dry', 'roses', 'nine', 'size', 'small', 'large', 'pcs', 'xl', 'xxl']);

const de = (n) => String(n).replace('.', ',');
const cm = (n) => Math.round(Number(n) * 2.54);

export function zollWert(wert, handle = '', titel = '') {
  const nurZoll = ZOLL_NUR.test(handle);
  if (/\bft\b|\d\s*ft\b/i.test(wert)) return { neu: null, grund: 'Fuss-Angabe' };
  if (/\d\s*cm\b/i.test(wert)) return { neu: null, grund: 'Wert nennt schon cm' };
  if (/\d\s+\d+(?:\.\d+)?\s*inch/i.test(wert)) return { neu: null, grund: 'zwei Zahlen vor «inch» (Spanne oder Mass unklar)' };
  if (!nurZoll && /\b\d{1,3}\s*cm\b/i.test(titel)) return { neu: null, grund: 'Titel nennt schon cm' };
  let neu = wert.replace(/-(?=\s*\d+(?:\.\d+)?\s*inch)/gi, ', ').replace(/(inch(?:es)?)\s*-\s*/gi, '$1, '), treffer = false;
  const mass = (zahlen) => { treffer = true; const z = zahlen.filter(Boolean); return `${z.map(de).join(' × ')} Zoll${nurZoll ? '' : ` (${z.map(cm).join(' × ')} cm)`}`; };
  neu = neu.replace(MASS_JE, (_, a, b, c) => mass([a, b, c]));
  neu = neu.replace(MASS, (_, a, b, c) => mass([a, b, c]));
  neu = neu.replace(EINZEL, (_, a) => mass([a]));
  if (!treffer) return { neu: null, grund: 'keine Zahl vor «inch»' };
  neu = neu.replace(/\s+,/g, ',').replace(/,(?=[^\s\d])/g, ', ').replace(/\s{2,}/g, ' ').replace(/,\s*,/g, ',').replace(/^[,\s]+|[,\s]+$/g, '').trim();
  const rest = neu.replace(/\([^)]*\)/g, ' ').toLowerCase().match(/[a-zäöü]{2,}/g) || [];
  const fremd = rest.filter((w) => ENGLISCH.has(w));
  if (fremd.length) return { neu: null, grund: `englische oder unklare Wörter: ${[...new Set(fremd)].join(', ')}` };
  if (/inch/i.test(neu)) return { neu: null, grund: 'Rest «inch»' };
  if (neu.length > 60) return { neu: null, grund: 'zu lang' };
  return { neu, grund: null };
}

/** Plan je Produkt: {handle, aenderungen:[{option, optionId, valueId, alt, neu}], offen:[{option, alt, grund}]} */
export function zollPlan(produkt) {
  const aenderungen = [], offen = [];
  for (const o of produkt.options) {
    const ziel = new Map(o.optionValues.map((v) => [v.id, v.name]));
    const gewaehlt = [];
    for (const v of o.optionValues) {
      if (!/(?<![a-zäöüß])inch(?:es)?(?![a-zäöüß])/i.test(v.name)) continue;
      const r = zollWert(v.name, produkt.handle, produkt.title || '');
      if (!r.neu) { offen.push({ option: o.name, alt: v.name, grund: r.grund }); continue; }
      gewaehlt.push({ option: o.name, optionId: o.id, valueId: v.id, alt: v.name, neu: r.neu }); ziel.set(v.id, r.neu);
    }
    const zaehler = new Map(); for (const n of ziel.values()) zaehler.set(n, (zaehler.get(n) || 0) + 1);
    for (const g of gewaehlt) { if (zaehler.get(g.neu) > 1) offen.push({ option: g.option, alt: g.alt, grund: `würde mit «${g.neu}» verschmelzen` }); else aenderungen.push(g); }
  }
  return { handle: produkt.handle, aenderungen, offen };
}
