/**
 * Schweizer Masse für «Selbst gestalten» (Printful-Katalog), 05.11.2026. Rein: kein Netz, keine Dateien.
 *
 * Ziel (Besitzer 05.11.): im Shop nie Zoll, oz, lb, ft, °F oder US-Grössen, sondern cm/mm/m, ml/l, g/kg, g/m², °C und EU-Grössen.
 *
 * Was umgerechnet wird (alle Faktoren sind Definitionen, keine Messwerte):
 *   1 Zoll = 2,54 cm · 1 ft = 30,48 cm · 1 US fl oz = 29,5735295625 ml · 1 oz (avoirdupois) = 28,349523125 g · 1 lb = 0,45359237 kg
 *   1 oz/yd² = 28,349523125 g / (0,9144 m)² = 33,9057… g/m² · 1 US gal = 3,785411784 l · °C = (°F − 32) × 5/9
 *
 * Was NICHT geraten wird:
 *   - «oz» ist Volumen (Getränke) ODER Gewicht (Kerzen) ODER unklar (Tiernapf). Die Art kommt aus dem Produktkontext (kontextAusKatalog); ist sie unklar, bleibt der Text
 *     unverändert und wird MARKIERT (markiert: true / Eintrag in `markiert`).
 *   - US-Schuhgrössen werden NIE allgemein umgerechnet (Marken und Leisten streuen um bis zu 1,5 Grössen, Prüfer 04.11.2026). Nur die produktgenaue Printful-Tabelle «Europe»
 *     (GET /products/<id>/sizes, im Katalog unter sizes.size_tables) zählt; ohne Tabelle bleibt die US-Grösse stehen und wird markiert. Werte, bei denen Zweitquellen
 *     auseinanderliegen (UNSICHER, übernommen aus katalog-einheiten-0411/etiketten.mjs), bekommen «(ca.)».
 *   - US-Bettgrössen (Twin, Queen, King …) und US-Schuhgrössen in Fliesstexten bleiben unverändert und werden markiert.
 *   - Bildschirmgrössen von Geräten (Laptop-Hülle «13″») sind keine Länge und in der Schweiz in Zoll üblich: «13 Zoll (33 cm)».
 *   - Kleidergrössen (XS–5XL), Kindergrössen (2T, 12M, 6Y) und Gerätenamen (iPhone 15 Pro) bleiben, wie sie sind (kein Mass).
 *
 * Steht im Herstellertext schon «3,8″ (9,6 cm)», gilt der Herstellerwert in Klammern (Printful rundet teils anders als die Rechnung, z. B. 15″ = 38,1 cm, Printful 39 cm);
 * weicht er um mehr als 5 % von der Rechnung ab, wird der Eintrag in `abweichungen` gemeldet.
 *
 * Dezimalzeichen in Anzeigetexten: Komma («7,6 cm»), wie im Shop (katalog-einheiten-0411). In Zahlenfeldern (JSON): Punkt.
 */

export const ZOLL_CM = 2.54;
export const FUSS_CM = 30.48;
export const OZ_ML = 29.5735295625;
export const OZ_G = 28.349523125;
export const LB_KG = 0.45359237;
export const YD_M = 0.9144;
export const OZ_YD2_G_M2 = OZ_G / (YD_M * YD_M);
export const GAL_L = 3.785411784;
export const TOLERANZ_HERSTELLER = 0.05;

// Printful-Schuhwerte, bei denen Zweitquellen auseinanderliegen (Prüferbefund 04.11.2026, katalog-einheiten-0411/etiketten.mjs UNSICHER): Produkt-ID → US-Grössen.
export const UNSICHER = {
  '513': ['11.5', '12'], '574': ['11.5', '12'], '578': ['11.5', '12'], '657': ['11.5', '12'],
  '597': ['11.5'],
  '598': ['6.5'],
};

// ISO-A-Formate in mm: Printful rundet die Zollwerte («A1 (23.3″×33.1″)»), das Papierformat ist aber genau 594 × 841 mm.
const ISO_A = { A0: [841, 1189], A1: [594, 841], A2: [420, 594], A3: [297, 420], A4: [210, 297], A5: [148, 210], A6: [105, 148] };

// ── Zahlen ──────────────────────────────────────────────────────────────────────────────────────
const BRUCH = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅐': 1 / 7, '⅑': 1 / 9, '⅒': 0.1, '⅓': 1 / 3, '⅔': 2 / 3, '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
const BRUCHZEICHEN = Object.keys(BRUCH).join('');

/** Liest «7», «.75», «1,5», «7 3/4», «7 3⁄4», «3 ⅛», «⅞», «7⁄8». Alles andere ergibt NaN. */
export function parseZahl(s) {
  if (typeof s === 'number') return Number.isFinite(s) ? s : NaN;
  const t = String(s ?? '').replace(/ /g, ' ').trim();
  if (!t) return NaN;
  let m;
  if ((m = t.match(/^(\d+)\s+(\d+)\s*[/⁄]\s*(\d+)$/))) return Number(m[3]) ? Number(m[1]) + Number(m[2]) / Number(m[3]) : NaN;
  if ((m = t.match(/^(\d+)\s*[/⁄]\s*(\d+)$/))) return Number(m[2]) ? Number(m[1]) / Number(m[2]) : NaN;
  if ((m = t.match(new RegExp(`^(\\d*)\\s*([${BRUCHZEICHEN}])$`)))) return Number(m[1] || 0) + BRUCH[m[2]];
  if (/^\d*[.,]\d+$/.test(t) || /^\d+$/.test(t)) return Number(t.replace(',', '.'));
  return NaN;
}

/** Zahl mit Komma als Dezimalzeichen, höchstens `dez` Stellen, ohne überflüssige Nullen («21,0» → «21»). */
export function schweizerZahl(n, dez = 1) {
  if (!Number.isFinite(n)) return String(n);
  const f = 10 ** dez;
  let r = Math.round((n + Number.EPSILON * Math.sign(n)) * f) / f;
  if (Object.is(r, -0)) r = 0;
  return String(r).replace('.', ',');
}

// ── Umrechnung (Zahlen) ─────────────────────────────────────────────────────────────────────────
export const zollNachCm = (z) => z * ZOLL_CM;
export const fussNachCm = (f) => f * FUSS_CM;
export const ozNachMl = (oz) => oz * OZ_ML;
export const ozNachG = (oz) => oz * OZ_G;
export const lbNachKg = (lb) => lb * LB_KG;
export const ozYd2NachGM2 = (v) => v * OZ_YD2_G_M2;
export const galNachL = (g) => g * GAL_L;
export const fahrenheitNachCelsius = (f) => (f - 32) * 5 / 9;

// ── Anzeige ─────────────────────────────────────────────────────────────────────────────────────
/** Länge aus cm: unter 1 cm in mm, sonst cm mit höchstens einer Stelle. */
export function anzeigeCm(cm) {
  if (!Number.isFinite(cm)) return String(cm);
  if (cm < 1) return `${schweizerZahl(cm * 10, 1)} mm`;
  return `${schweizerZahl(cm, 1)} cm`;
}
/** Länge einer Reihe (z. B. Breite × Höhe) in cm: gleiche Einheit für alle, «21 × 29,7 cm». */
export function anzeigeCmReihe(cms) {
  if (cms.length === 1) return anzeigeCm(cms[0]);
  if (cms.some((c) => c < 1)) return `${cms.map((c) => schweizerZahl(c * 10, 1)).join(' × ')} mm`;
  return `${cms.map((c) => schweizerZahl(c, 1)).join(' × ')} cm`;
}
/** Eine einzelne lange Strecke (ab 1 m) in Metern mit zwei Stellen: 182,88 cm → «1,83 m». */
export function anzeigeLaenge(cm) {
  if (Number.isFinite(cm) && cm >= 100) return `${schweizerZahl(cm / 100, 2)} m`;
  return anzeigeCm(cm);
}
export function anzeigeMl(ml) {
  if (!Number.isFinite(ml)) return String(ml);
  if (ml >= 1000) return `${schweizerZahl(ml / 1000, 2)} l`;
  return `${schweizerZahl(ml, 0)} ml`;
}
export function anzeigeG(g) {
  if (!Number.isFinite(g)) return String(g);
  if (g >= 1000) return `${schweizerZahl(g / 1000, 2)} kg`;
  return `${schweizerZahl(g, 0)} g`;
}
export function anzeigeKg(kg) {
  if (!Number.isFinite(kg)) return String(kg);
  if (kg < 1) return anzeigeG(kg * 1000);
  return `${schweizerZahl(kg, 1)} kg`;
}
export const anzeigeGM2 = (v) => `${schweizerZahl(v, 0)} g/m²`;
export const anzeigeC = (c) => `${schweizerZahl(c, 0)} °C`;

// ── Kontext eines Katalogprodukts ───────────────────────────────────────────────────────────────
const ES = (p) => String(p ?? '');
/**
 * Wofür steht «oz» in diesem Produkt? 'volumen' (Getränkegefässe), 'gewicht' (Kerzen), 'dose' (Dosenkühler: die Zahl ist die Dosengrösse), sonst null (nicht belegt).
 */
export function ozArt({ typ = '', titel = '' } = {}) {
  const t = `${ES(titel)}`.toLowerCase();
  if (/can cooler/.test(t)) return 'dose';
  if (typ === 'CANDLE' || /candle/.test(t)) return 'gewicht';
  if (typ === 'MUG' || typ === 'DRINKWARE' || /\b(mug|bottle|tumbler|glass|cup|pint|flask|goblet)\b/.test(t)) return 'volumen';
  return null;
}

/** Zeilen «Europe»/«EU» aus den Grössentabellen des Katalogs (sizes.size_tables) als { US-Grösse: EU-Wert }. Leer, wenn es keine gibt. */
export function euTabelleAusSizes(sizes) {
  const tab = {};
  for (const t of sizes?.size_tables ?? []) {
    for (const m of t.measurements ?? []) {
      if (!/^(europe|europa|eu)$/i.test(ES(m.type_label).trim())) continue;
      for (const v of m.values ?? []) {
        const wert = parseZahl(v.value);
        if (Number.isFinite(wert) && v.size !== undefined && v.size !== null) tab[String(v.size).trim()] = wert;
      }
    }
  }
  return tab;
}

/** Baut den Kontext für die Umrechnung aus einer Katalogdatei (<id>.json). */
export function kontextAusKatalog(katalog) {
  const p = katalog?.produkt ?? {};
  const typ = p.type ?? '';
  const titel = p.title ?? '';
  const istSchuh = typ === 'SHOES';
  const euTabelle = euTabelleAusSizes(katalog?.sizes);
  const geraetZoll = /\b(laptop|tablet|notebook sleeve)\b/i.test(ES(titel));
  return { produktId: String(katalog?.id ?? p.id ?? ''), typ, titel, ozArt: ozArt({ typ, titel }), istSchuh, geraetZoll, euTabelle: Object.keys(euTabelle).length ? euTabelle : null };
}

// ── Einzelne Grössenbezeichnungen (Variantenfeld «size») ────────────────────────────────────────
const ZUSATZ_DE = [[/\s+With Lid & Straw$/i, ' mit Deckel und Strohhalm']];
const US_BETT = /^(twin|twin xl|full|queen|king|california king)$/i;

function euSchuh(label, k) {
  const wert = k.euTabelle?.[String(label).trim()];
  if (!Number.isFinite(wert)) return null;
  const ca = (UNSICHER[k.produktId] ?? []).includes(String(label).trim()) ? ' (ca.)' : '';
  return { wert, anzeige: `EU ${schweizerZahl(wert, 1)}${ca}`, ca: Boolean(ca) };
}

/**
 * Schweizer Anzeige einer Grössenbezeichnung.
 * @returns {{original, anzeige, geaendert:boolean, markiert:boolean, art:string, grund?:string}}
 *   art: 'unveraendert' | 'laenge' | 'volumen' | 'gewicht' | 'dose' | 'schuh-eu' | 'markiert'
 */
export function groesseAnzeige(label, kontext = {}) {
  const k = { produktId: '', ozArt: null, istSchuh: false, geraetZoll: false, euTabelle: null, ...kontext };
  const orig = label;
  const gleich = (art = 'unveraendert') => ({ original: orig, anzeige: orig === null || orig === undefined ? null : String(orig), geaendert: false, markiert: false, art });
  if (orig === null || orig === undefined || ES(orig).trim() === '' || ES(orig).trim() === 'null') return gleich();
  const s = ES(orig).trim();

  // 1) Schuhe: nur die belegte Printful-Tabelle
  if (k.istSchuh && /^\d+(\.\d+)?$/.test(s)) {
    const eu = euSchuh(s, k);
    if (eu) return { original: orig, anzeige: eu.anzeige, geaendert: true, markiert: eu.ca, art: 'schuh-eu', ...(eu.ca ? { grund: 'Zweitquellen weichen ab (UNSICHER)' } : {}) };
    return { original: orig, anzeige: s, geaendert: false, markiert: true, art: 'markiert', grund: 'US-Schuhgrösse ohne belegte Printful-Tabelle «Europe»: unverändert' };
  }

  // 2) US-Bettgrössen: kein Schweizer Mass belegt
  if (US_BETT.test(s)) return { original: orig, anzeige: s, geaendert: false, markiert: true, art: 'markiert', grund: 'US-Bettgrösse ohne belegte Umrechnung: unverändert' };

  // 3) oz (Volumen/Gewicht/Dose)
  const oz = s.match(/^(?<pre>.*?)(?<n>\d+(?:\.\d+)?)\s*(?:fl\.?\s*)?oz\.?(?<suf>.*)$/i);
  if (oz && !/\/\s*yd/i.test(s)) {
    const n = Number(oz.groups.n);
    let pre = oz.groups.pre.trim();
    let suf = oz.groups.suf;
    for (const [re, de] of ZUSATZ_DE) suf = suf.replace(re, de);
    const mitRest = (kern) => `${pre ? `${pre} ` : ''}${kern}${suf}`;
    if (k.ozArt === 'volumen') return { original: orig, anzeige: mitRest(anzeigeMl(ozNachMl(n))), geaendert: true, markiert: false, art: 'volumen' };
    if (k.ozArt === 'gewicht') return { original: orig, anzeige: mitRest(anzeigeG(ozNachG(n))), geaendert: true, markiert: false, art: 'gewicht' };
    if (k.ozArt === 'dose') return { original: orig, anzeige: `${pre ? `${pre} ` : ''}(für Dosen à ${anzeigeMl(ozNachMl(n))})${suf}`, geaendert: true, markiert: false, art: 'dose' };
    return { original: orig, anzeige: s, geaendert: false, markiert: true, art: 'markiert', grund: '«oz»: Volumen oder Gewicht ist für dieses Produkt nicht belegt, unverändert' };
  }

  // 3b) Bildschirmgrösse eines Geräts (Laptop-Hülle «13″»): in der Schweiz üblich in Zoll, daneben die Länge in cm
  const geraet = s.match(/^(\d+(?:\.\d+)?)\s*(?:″|”|"|in)$/);
  if (k.geraetZoll && geraet) return { original: orig, anzeige: `${schweizerZahl(Number(geraet[1]), 1)} Zoll (${anzeigeCm(zollNachCm(Number(geraet[1])))})`, geaendert: true, markiert: false, art: 'geraet-zoll' };

  // 4) Längen in Zoll, auch mit Formatname «A1 (23.3″×33.1″)», Form «Oval 4″×2.6″», «Circular ⌀3 in»
  const t = umrechneText(s, { ...k, nurLaenge: true, zollOhneZeichen: true });
  if (t.text !== s) {
    let text = t.text;
    const a = s.match(/^(A[0-6])\s*\(/i);
    if (a && ISO_A[a[1].toUpperCase()]) {
      const [b, h] = ISO_A[a[1].toUpperCase()].map((mm) => mm / 10);
      const gemessen = [...s.matchAll(new RegExp(`(${ZAHL})\\s*(?:${ZOLLZEICHEN})`, 'g'))].map((m) => parseZahl(m[1]) * ZOLL_CM);
      if (gemessen.length === 2 && Math.abs(gemessen[0] - b) / b < 0.02 && Math.abs(gemessen[1] - h) / h < 0.02) text = `${a[1].toUpperCase()} (${anzeigeCmReihe([b, h])})`;
    }
    return { original: orig, anzeige: text, geaendert: true, markiert: t.markiert.length > 0, art: 'laenge', ...(t.markiert.length ? { grund: t.markiert.map((x) => x.grund).join('; ') } : {}) };
  }

  // 5) Fuss («6 ft.»)
  const ft = umrechneText(s, { ...k, nurLaenge: false });
  if (ft.text !== s) return { original: orig, anzeige: s.endsWith('.') ? ft.text.replace(/\.$/, '') : ft.text, geaendert: true, markiert: ft.markiert.length > 0, art: 'laenge' };

  return gleich();
}

// ── Freier Text ─────────────────────────────────────────────────────────────────────────────────
const ZAHL = String.raw`(?:\d+\s+\d+\s*[/⁄]\s*\d+|\d+\s*[/⁄]\s*\d+|\d*\s*[${BRUCHZEICHEN}]|\d*\.\d+|\d+)`;
const ZOLLZEICHEN = String.raw`(?:″|”|“|"|''|’’|′′)`;
const DEZ = String.raw`\d+(?:[.,]\d+)?`;
const METRIK_LAENGE = String.raw`${DEZ}(?:\s*[×x–-]\s*${DEZ})*\s*(?:cm|mm)`;
const KOMMA = (txt) => txt.replace(/(\d)\.(\d)/g, '$1,$2');

function metrikAnzeige(roh) {
  // Herstellerwert aus der Klammer, nur Dezimalpunkt → Komma, Einheit mit Leerzeichen
  return KOMMA(roh.trim()).replace(/(\d)\s*(cm|mm|m|kg|g|l|ml)\b/g, '$1 $2').replace(/g\s*\/\s*m\s*²/g, 'g/m²').replace(/\s+/g, ' ');
}
function erstesZahlenpaar(txt) {
  return [...String(txt).matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(',', '.')));
}
/** Erste Zahl einer Herstellerangabe in der Grundeinheit (cm, g, ml): «101 × 152 mm» → 10,1 cm; «1.75 kg» → 1750 g. */
function herstellerWert(roh, art) {
  const z = erstesZahlenpaar(roh)[0];
  const e = (String(roh).match(/(mm|cm|kg|ml|g\b|l\b)/) ?? [])[1];
  if (z === undefined) return null;
  if (art === 'laenge') return e === 'mm' ? z / 10 : z;
  if (art === 'gewicht') return e === 'kg' ? z * 1000 : z;
  if (art === 'volumen') return e === 'l' ? z * 1000 : z;
  return z;
}
function abweichung(rechnung, hersteller) {
  return hersteller ? Math.abs(rechnung - hersteller) / hersteller : 0;
}

/**
 * Wandelt Zoll, mil, oz/yd², oz, lb, ft, gal und °F in einem Text um.
 * Steht der Metrikwert schon daneben («3,8″ (9,6 cm)», «85 g (3 oz)»), gilt der Herstellerwert und die Klammer verschwindet.
 * Optionen (kontext): ozArt ('volumen'|'gewicht'|'dose'|null), nurLaenge (nur Zoll), zollOhneZeichen (auch «3 in» ohne Zeichen, für Grössenbezeichnungen).
 * «oz» ohne Metrikwert wird nur umgerechnet, wenn die Art belegt ist: «fl oz», ein Getränkegefäss als Wort danach («32 oz. bottle») oder ozArt aus dem Produktkontext.
 * @returns {{text:string, aenderungen:{von:string,nach:string,art:string,quelle:'rechnung'|'hersteller'}[], abweichungen:{von:string,nach:string,abweichung:number}[], markiert:{text:string,grund:string}[]}}
 */
export function umrechneText(text, kontext = {}) {
  const k = { ozArt: null, nurLaenge: false, zollOhneZeichen: false, ...kontext };
  let t = String(text ?? '');
  const aenderungen = [];
  const abweichungen = [];
  const merke = (von, nach, art, quelle) => aenderungen.push({ von: von.trim(), nach: nach.trim(), art, quelle });
  const pruefe = (all, nach, rechnung, rohMetrik, art) => {
    const a = abweichung(rechnung, herstellerWert(rohMetrik, art));
    if (a > TOLERANZ_HERSTELLER) abweichungen.push({ von: all.trim(), nach, abweichung: a });
  };

  // 0) Metrik zuerst, Imperial in Klammern danach: «85 g (3 oz)», «20 cm (8 in)»
  t = t.replace(new RegExp(String.raw`(?<![\w.])(?<m>${DEZ}\s*(?:kg|ml|cm|mm|g|l)\b)(?<klam>\s*\(\s*${ZAHL}\s*(?:(?:fl\.?\s*oz|oz|lbs?|ft|inch(?:es)?|in)\b|″|”|")\.?\s*\))`, 'g'), (all, ...r) => {
    const g = r[r.length - 1];
    const nach = metrikAnzeige(g.m);
    merke(all, nach, 'klammer', 'hersteller');
    return nach;
  });

  // a) Stoffgewicht oz/yd² (vor «oz», sonst würde es als Volumen gelesen); auch «oz/y²», «oz./yd.»
  if (!k.nurLaenge) {
    const re = new RegExp(String.raw`(?<n>${ZAHL})(?<tol>\s*\+\/-\s*(?<t2>${ZAHL}))?\s*oz\.?\s*\/\s*y(?:d|ds)?\.?\s*(?:²|2|\^2)?(?<klam>\s*\(\s*(?<m>[^()]*?g\s*\/\s*m\s*²[^()]*?)\s*\))?`, 'g');
    t = t.replace(re, (all, ...r) => {
      const g = r[r.length - 1];
      if (g.m) {
        const rech = ozYd2NachGM2(parseZahl(g.n));
        const nach = metrikAnzeige(g.m);
        pruefe(all, nach, rech, g.m, 'x');
        merke(all, nach, 'stoffgewicht', 'hersteller');
        return nach;
      }
      const n = ozYd2NachGM2(parseZahl(g.n));
      const nach = g.tol ? `${anzeigeGM2(n)} ± ${anzeigeGM2(ozYd2NachGM2(parseZahl(g.t2)))}` : anzeigeGM2(n);
      merke(all, nach, 'stoffgewicht', 'rechnung');
      return nach;
    });
  }

  // a2) mil = 1/1000 Zoll (Papierstärke «10.3 mil (0.26 mm)»)
  if (!k.nurLaenge) {
    t = t.replace(new RegExp(String.raw`(?<![\w.])(?<n>${ZAHL})\s*mil\b(?<klam>\s*\(\s*(?<m>${DEZ}\s*mm)\s*\))?`, 'g'), (all, ...r) => {
      const g = r[r.length - 1];
      if (g.m) { const nach = metrikAnzeige(g.m); merke(all, nach, 'laenge', 'hersteller'); return nach; }
      const nach = `${schweizerZahl(parseZahl(g.n) * ZOLL_CM * 10 / 1000, 2)} mm`;
      merke(all, nach, 'laenge', 'rechnung');
      return nach;
    });
  }

  // b) Zoll (mit und ohne Metrik in Klammern); Reihen «15″ × 15″», Bereiche «22″–24″»; «in» nur mit Metrik dahinter oder in Grössenbezeichnungen
  const wort = String.raw`inch(?:es)?\b|-inch\b|in\b(?=\s*\(\s*${METRIK_LAENGE}\s*\))`;
  const wortOhne = String.raw`inch(?:es)?\b|-inch\b|in\b\.?`;
  const marke = (alt) => String.raw`(?:${ZOLLZEICHEN}|\s*(?:${alt}))`;
  const einzel = `${ZAHL}\\s*${marke(k.zollOhneZeichen ? wortOhne : wort)}`;
  const reiheRe = new RegExp(`(?<![\\w.])(?<ausdruck>${einzel}(?:\\s*[×xX–-]\\s*${einzel})*)(?<klam>\\s*\\(\\s*(?<m>${METRIK_LAENGE})\\s*\\))?`, 'g');
  t = t.replace(reiheRe, (all, ...r) => {
    const g = r[r.length - 1];
    const teile = [...g.ausdruck.matchAll(new RegExp(`(${ZAHL})\\s*${marke(wortOhne)}`, 'g'))].map((x) => parseZahl(x[1]));
    const trenner = g.ausdruck.match(/[×xX]/) ? ' × ' : (/[–-]/.test(g.ausdruck.replace(new RegExp(ZAHL, 'g'), '')) ? '–' : ' × ');
    const cms = teile.map(zollNachCm);
    if (g.m) {
      const nach = metrikAnzeige(g.m);
      if (cms.length) pruefe(all, nach, cms[0], g.m, 'laenge');
      merke(all, nach, 'laenge', 'hersteller');
      return nach;
    }
    const nach = trenner === '–'
      ? `${cms.map((c) => schweizerZahl(c, 1)).join('–')} cm`
      : anzeigeCmReihe(cms);
    merke(all, nach, 'laenge', 'rechnung');
    return nach;
  });
  // «⌀3 in» (Durchmesser): das ⌀ bleibt, die Zahl wird Zentimeter
  if (k.zollOhneZeichen) t = t.replace(/⌀\s*(\d+(?:[.,]\d+)?)\s*cm/g, '⌀ $1 cm');

  if (k.nurLaenge) {
    return { text: t, aenderungen, abweichungen, markiert: markiere(t) };
  }

  // c) Fuss («6 ft. (1,83 m)»)
  t = t.replace(new RegExp(String.raw`(?<![\w.])(?<n>${ZAHL})\s*(?:ft|feet|foot)\b(?<pt>\.)?(?<klam>\s*\(\s*(?<m>${DEZ}\s*m)\s*\))?`, 'gi'), (all, ...r) => {
    const g = r[r.length - 1];
    if (g.m) { const nach = metrikAnzeige(g.m); merke(all, nach, 'laenge', 'hersteller'); return nach; }
    const nach = anzeigeLaenge(fussNachCm(parseZahl(g.n)));
    merke(all, nach, 'laenge', 'rechnung');
    return nach + (g.pt ? '.' : '');
  });

  // d) Pfund
  t = t.replace(new RegExp(String.raw`(?<![\w.])(?<n>${ZAHL})\s*(?:lbs?|pounds?)\b(?<pt>\.)?(?<klam>\s*\(\s*(?<m>${DEZ}\s*kg)\s*\))?`, 'gi'), (all, ...r) => {
    const g = r[r.length - 1];
    if (g.m) {
      const nach = metrikAnzeige(g.m);
      pruefe(all, nach, lbNachKg(parseZahl(g.n)) * 1000, g.m, 'gewicht');
      merke(all, nach, 'gewicht', 'hersteller');
      return nach;
    }
    const nach = anzeigeKg(lbNachKg(parseZahl(g.n)));
    merke(all, nach, 'gewicht', 'rechnung');
    return nach + (g.pt ? '.' : '');
  });

  // e) US-Gallonen
  t = t.replace(new RegExp(String.raw`(?<![\w.])(?<n>${ZAHL})\s*(?:US\s*)?(?:gal\b\.?|gallons?)(?<klam>\s*\(\s*(?<m>${DEZ}\s*l)\s*\))?`, 'gi'), (all, ...r) => {
    const g = r[r.length - 1];
    if (g.m) { const nach = metrikAnzeige(g.m); merke(all, nach, 'volumen', 'hersteller'); return nach; }
    const nach = anzeigeMl(galNachL(parseZahl(g.n)) * 1000);
    merke(all, nach, 'volumen', 'rechnung');
    return nach;
  });

  // f) oz: mit Metrikwert daneben gilt dieser; sonst Volumen bei «fl oz» oder Getränkegefäss danach, sonst nach Produktkontext, sonst unverändert (und markiert)
  t = t.replace(new RegExp(String.raw`(?<![\w.])(?<n>${ZAHL})(?:\s*-\s*|\s*)(?<fl>fl\.?\s*)?oz\b(?<pt>\.)?(?<klam>\s*\(\s*(?<m>${DEZ}\s*(?:ml|kg|g|l))\s*\))?(?<vol>\s+(?:bottles?|cups?|cans?|mugs?|glass(?:es)?|tumblers?)\b)?`, 'gi'), (all, ...r) => {
    const g = r[r.length - 1];
    const n = parseZahl(g.n);
    const nachVol = g.vol ?? '';
    if (g.m) {
      const mArt = /(ml|\bl\b)/.test(g.m) ? 'volumen' : 'gewicht';
      const nach = metrikAnzeige(g.m);
      pruefe(all, nach, mArt === 'volumen' ? ozNachMl(n) : ozNachG(n), g.m, mArt);
      merke(all, nach, mArt, 'hersteller');
      return nach + nachVol;
    }
    const art = g.fl || g.vol ? 'volumen' : k.ozArt;
    if (!art) return all; // bleibt, wird unten markiert
    const punkt = g.pt ? '.' : '';
    const nach = art === 'gewicht' ? anzeigeG(ozNachG(n)) : anzeigeMl(ozNachMl(n));
    merke(all, nach, art === 'gewicht' ? 'gewicht' : 'volumen', 'rechnung');
    return nach + punkt + nachVol;
  });

  // g) Fahrenheit («86°F (30°C)», «90°F / 30°C», «104°F»)
  t = t.replace(new RegExp(String.raw`(?<![\w.])(?<n>\d+(?:\.\d+)?)\s*°\s*F\b(?<c>\s*\(\s*(?<c1>\d+(?:\.\d+)?)\s*°\s*C\s*\)|\s*\/\s*(?<c2>\d+(?:\.\d+)?)\s*°\s*C)?`, 'g'), (all, ...r) => {
    const g = r[r.length - 1];
    const herst = g.c1 ?? g.c2;
    if (herst) { const nach = `${herst.replace('.', ',')} °C`; merke(all, nach, 'temperatur', 'hersteller'); return nach; }
    const nach = anzeigeC(fahrenheitNachCelsius(Number(g.n)));
    merke(all, nach, 'temperatur', 'rechnung');
    return nach;
  });

  return { text: t, aenderungen, abweichungen, markiert: markiere(t) };
}

/** Was nach der Umrechnung noch US-Mass ist, wird gemeldet (nie still gelassen). */
function markiere(t) {
  const m = [];
  for (const x of t.matchAll(/(?<![\w.])\d+(?:\.\d+)?(?:\s*-\s*|\s*)(?:fl\.?\s*)?oz\b\.?/gi)) m.push({ text: x[0], grund: '«oz»: Volumen oder Gewicht ist nicht belegt, unverändert' });
  for (const x of t.matchAll(/\bUS\s+(?:women|men|kids|youth|girls|boys)['’]?s?\s*\d[\d.\s–—-]*/gi)) m.push({ text: x[0].trim(), grund: 'US-Schuh-/Kleidergrösse ohne belegte Printful-Tabelle: unverändert' });
  for (const x of t.matchAll(/\b(?:Twin XL|Twin|Queen|King)\b/g)) m.push({ text: x[0], grund: 'US-Bettgrösse ohne belegte Umrechnung: unverändert' });
  return m;
}

// ── Grössentabellen ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_RE = /^(us\b|uk\b|eu\b|europe|europa|japan|women'?s us|men'?s us|us men|us women|(us|uk|eu)\s+(men|women)?\s*(shoe\s*)?size|(us|uk|eu)\s+(men|women))/i;
const GEWICHT_RE = /weight/i;

function systemName(label) {
  const l = label.toLowerCase();
  if (/europe|^eu\b|europa/.test(l)) return 'EU';
  if (/^uk\b/.test(l)) return 'UK';
  if (/japan/.test(l)) return 'JP';
  return 'US';
}

function werteInCm(v) {
  const z = (x) => parseZahl(String(x ?? '').trim());
  const out = { groesse: v.size };
  if (v.value !== undefined) { const n = z(v.value); out.wert = Number.isFinite(n) ? n : null; }
  if (v.min_value !== undefined) { const n = z(v.min_value); out.min = Number.isFinite(n) ? n : null; }
  if (v.max_value !== undefined) { const n = z(v.max_value); out.max = Number.isFinite(n) ? n : null; }
  return out;
}

/**
 * Grössentabellen des Katalogs (sizes.size_tables) in Schweizer Mass.
 * Zeilen mit einem Grössensystem (US, UK, Japan) bleiben UNVERÄNDERT und sind markiert, Zeilen «Europe»/«EU» sind Schweizer Grössen,
 * «Weight» (lb) wird kg, alles andere sind Zoll und wird cm.
 * @returns {{tabellen:{typ:string, einheitOriginal:string, messungen:{label:string, art:'laenge'|'gewicht'|'system', einheit:string, markiert:boolean, werte:object[]}[]}[]}}
 */
export function masstabelleSchweiz(sizes, kontext = {}) {
  const tabellen = [];
  for (const t of sizes?.size_tables ?? []) {
    const messungen = [];
    for (const m of t.measurements ?? []) {
      const label = ES(m.type_label).trim();
      const zeilen = (m.values ?? []).map(werteInCm);
      const system = t.unit === 'none' || SYSTEM_RE.test(label);
      let art, einheit, markiert = false, umr;
      if (system) {
        const sys = systemName(label);
        art = 'system'; einheit = sys; markiert = sys !== 'EU' && !/europe|^eu\b/i.test(label);
        umr = (n) => n;
      } else if (GEWICHT_RE.test(label)) {
        art = 'gewicht'; einheit = 'kg'; umr = (n) => Math.round(lbNachKg(n) * 10) / 10;
      } else {
        art = 'laenge'; einheit = 'cm'; umr = (n) => Math.round(zollNachCm(n) * 10) / 10;
      }
      const werte = zeilen.map((z) => {
        const o = { groesse: z.groesse, groesseAnzeige: groesseAnzeige(z.groesse, kontext).anzeige };
        for (const f of ['wert', 'min', 'max']) if (z[f] !== undefined) o[f] = z[f] === null ? null : umr(z[f]);
        const fmt = art === 'laenge' ? (n) => schweizerZahl(n, 1) : art === 'gewicht' ? (n) => schweizerZahl(n, 1) : (n) => schweizerZahl(n, 1);
        if (o.wert !== undefined && o.wert !== null) o.anzeige = `${fmt(o.wert)}${art === 'system' ? '' : ` ${einheit}`}`;
        else if (o.min !== undefined && o.max !== undefined && o.min !== null && o.max !== null) o.anzeige = `${fmt(o.min)}–${fmt(o.max)}${art === 'system' ? '' : ` ${einheit}`}`;
        else o.anzeige = null;
        return o;
      });
      messungen.push({ label, art, einheit, markiert, werte });
    }
    tabellen.push({ typ: t.type ?? null, einheitOriginal: t.unit ?? null, messungen });
  }
  return { tabellen };
}
