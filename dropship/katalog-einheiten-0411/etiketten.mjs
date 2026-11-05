// Etiketten für das Katalogfenster «Selbst gestalten» (04.11.2026): EU-Schuhgrössen, ml/g statt oz.
// Reine Funktionen, kein Netz, kein Schreiben. Erzeugt Zeilen für assets/luxe-clothing-reference-gallery.json
// (Feld variants[].displaySizeCh, das der Katalogcode in displaySize() schon liest).
//
// Regeln (jede belegt, nichts aus dem Gedächtnis):
//  - Schuhe: nur die Printful-Grössentabelle «Europe» des jeweiligen Produkts (daten/schuh_eu_tabellen.json, abgerufen 04.11.2026).
//    Keine allgemeine Umrechnung: Marken und Leisten weichen um bis zu 1,5 Grössen ab.
//    Werte, bei denen Zweitquellen auseinanderliegen (UNSICHER), bekommen den Zusatz «(ca.)».
//  - oz: nur bei Getränkeware (Kategorie «Drinkware & coasters») nach ml und bei Kerzen («Candles») nach g.
//    Andere Produkte (Tiernapf) bleiben unverändert: dort ist nicht belegt, ob Volumen oder Gewicht gemeint ist.
//  - Nennt die Produktbeschreibung selbst «N oz (M ml|g)» und weicht M höchstens 3 % von der Rechnung ab, gilt der Herstellerwert
//    (Knopf und Beschreibung sagen dann dasselbe). Weicht M stärker ab, wird das Produkt NICHT umgerechnet (Widerspruch beim Hersteller,
//    z. B. 751: «16 oz. (590 ml)»).
//  - Stoffgewicht «oz./yd.²» kommt in den Grössen nicht vor und wird nie angefasst.

export const OZ_ML = 29.5735295625;   // 1 US fl oz in ml (aus 1 US gal = 3,785411784 l, durch 128)
export const OZ_G = 28.349523125;     // 1 oz (avoirdupois) in g (aus 1 lb = 453,59237 g, durch 16)
export const TOLERANZ_HERSTELLER = 0.03;

// Printful-Werte, bei denen Zweitquellen (Atoms, Converse, Vans, size.ly) auseinanderliegen oder Printful sich selbst widerspricht.
// Prüferbefund 04.11.2026: Herren US 11,5 und 12, Slides Damen US 6,5.
export const UNSICHER = {
  '513': ['11.5', '12'], '574': ['11.5', '12'], '578': ['11.5', '12'], '657': ['11.5', '12'],
  '597': ['11.5'],
  '598': ['6.5'],
};

// Englische Zusätze in Grössentexten (Prüferfund 04.11.2026) und Produkte, bei denen die Zahl kein Fassungsvermögen ist.
const ZUSATZ_UEBERSETZUNG = [[/ With Lid & Straw$/, ' mit Deckel und Strohhalm']];
// Can Cooler 764: «12 oz» ist die Grösse der passenden Dose, nicht das Fassungsvermögen des Coolers.
const ETIKETT_NACHBEARBEITUNG = { '764': (t) => t.replace(/^(Regular|Slim) (\d+ ml)$/, '$1 (für Dosen à $2)') };

const stripHtml = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const num = (s) => Number(String(s).replace(',', '.'));
const formatZahl = (n) => (Number.isInteger(n) ? String(n) : String(n).replace('.', ','));

export function ozKind(produkt) {
  const pfad = (produkt?.productType?.categoryPath || []).map((c) => c.title).join(' > ');
  if (/Drinkware & coasters/i.test(pfad)) return 'ml';
  if (/\bCandles\b/i.test(pfad)) return 'g';
  return null;
}

// Herstellerangaben «N oz (M ml|g)» aus der Beschreibung, als Liste {oz, wert, einheit}.
export function herstellerWerte(beschreibung) {
  const text = stripHtml(beschreibung);
  const out = [];
  for (const m of text.matchAll(/(\d+(?:[.,]\d+)?)\s*oz\.?\s*\(\s*(\d+(?:[.,]\d+)?)\s*(ml|g)\s*\)/gi)) out.push({ oz: num(m[1]), wert: num(m[2]), einheit: m[3].toLowerCase() });
  return out;
}

// Umrechnung einer Zahl in oz. Rückgabe {wert, einheit, quelle} oder {konflikt:{...}} oder null (unbekannte Art).
export function ozUmrechnen(oz, kind, hersteller = []) {
  if (!kind) return null;
  const rechnung = kind === 'ml' ? oz * OZ_ML : oz * OZ_G;
  const passende = hersteller.filter((h) => h.einheit === kind && Math.abs(h.oz - oz) < 1e-9);
  if (passende.length) {
    const abw = passende.map((h) => Math.abs(h.wert - rechnung) / rechnung);
    const ok = passende.find((h, i) => abw[i] <= TOLERANZ_HERSTELLER);
    if (ok) return { wert: ok.wert, einheit: kind, quelle: 'hersteller', rechnung: Math.round(rechnung) };
    return { konflikt: { oz, herstellerWert: passende[0].wert, rechnung: Math.round(rechnung), abweichung: Math.max(...abw) } };
  }
  return { wert: Math.round(rechnung), einheit: kind, quelle: 'rechnung', rechnung: Math.round(rechnung) };
}

// Ersetzt «N oz» (auch «9oz») in einem Grössentext durch den umgerechneten Wert, der Rest (z. B. «Regular », « With Lid & Straw») bleibt.
export function ozTextErsetzen(roh, kind, hersteller = []) {
  const m = String(roh).match(/(\d+(?:\.\d+)?)\s*oz\b/i);
  if (!m) return null;
  if (/oz\.?\s*\/\s*y/i.test(roh)) return null;           // Stoffgewicht: nie anfassen
  const r = ozUmrechnen(num(m[1]), kind, hersteller);
  if (!r) return { art: 'unbekannt' };
  if (r.konflikt) return { art: 'konflikt', ...r.konflikt };
  let text = String(roh).replace(m[0], `${formatZahl(r.wert)} ${r.einheit}`);
  for (const [muster, ersatz] of ZUSATZ_UEBERSETZUNG) text = text.replace(muster, ersatz);
  return { art: 'ok', text, quelle: r.quelle, rechnung: r.rechnung };
}

// Titel mit «N oz» (z. B. «Can-Shaped Glass (16 oz)»): gleiche Umrechnung wie bei den Grössen; bei Widerspruch oder unbekannter Art kein Titel.
export function titelMitEinheit(titel, kind, hersteller = []) {
  const m = String(titel).match(/(\d+(?:\.\d+)?)\s*oz\b/i);
  if (!m || /oz\.?\s*\/\s*y/i.test(titel)) return null;
  const r = ozUmrechnen(num(m[1]), kind, hersteller);
  if (!r || r.konflikt) return null;
  return String(titel).replace(m[0], `${formatZahl(r.wert)} ${r.einheit}`);
}

export function schuhLabel(produktId, roh, tabellen) {
  const eu = tabellen?.[String(produktId)]?.[String(roh)];
  if (eu == null) return null;
  const unsicher = (UNSICHER[String(produktId)] || []).includes(String(roh));
  return `EU ${formatZahl(Number(eu))}${unsicher ? ' (ca.)' : ''}`;
}

// katalog: Liste der Produkte (id, title, variants[{id,size}], description, productType); tabellen: {produktId:{roh:eu}}.
// Rückgabe: { produkte: {produktId:[{id,originalSize,displaySizeCh}]}, titel: {produktId: Titel mit ml/g}, protokoll: [...] }
export function bauen(katalog, tabellen) {
  const produkte = {}, protokoll = [], titel = {};
  for (const p of katalog) {
    const pid = String(p.id), eintraege = [];
    const hersteller = herstellerWerte(p.description);
    const kind = ozKind(p);
    for (const v of p.variants || []) {
      const roh = String(v.size ?? '');
      let label = null;
      if (tabellen?.[pid]) label = schuhLabel(pid, roh, tabellen);
      else if (/\boz\b|\d\s*oz\b/i.test(roh)) {
        const r = ozTextErsetzen(roh, kind, hersteller);
        if (r?.art === 'ok') label = ETIKETT_NACHBEARBEITUNG[pid] ? ETIKETT_NACHBEARBEITUNG[pid](r.text) : r.text;
        else if (r) protokoll.push({ produkt: pid, titel: p.title, variante: v.id, roh, art: r.art, ...(r.art === 'konflikt' ? { herstellerWert: r.herstellerWert, rechnung: r.rechnung } : {}) });
      }
      if (label && label !== roh) eintraege.push({ id: v.id, originalSize: roh, displaySizeCh: label });
      else if (tabellen?.[pid] && !label) protokoll.push({ produkt: pid, titel: p.title, variante: v.id, roh, art: 'schuh-ohne-eu' });
    }
    if (eintraege.length) produkte[pid] = eintraege;
    if (eintraege.length && !tabellen?.[pid]) { const t = titelMitEinheit(p.title, kind, hersteller); if (t && t !== p.title) titel[pid] = t; }
  }
  return { produkte, protokoll, titel };
}

// Fügt die Etiketten in die Galerie (Objekt mit products[]) ein: vorhandene Zeilen bleiben bis auf variants[] unverändert.
// Neue Zeilen tragen nur productId und variants (der Katalogcode liest alles andere mit ?. und list()).
export function inGalerieEinfuegen(galerie, produkte, titel = {}) {
  const out = JSON.parse(JSON.stringify(galerie));
  const stat = { verschmolzen: 0, neu: 0, ergaenzt: 0, ersetzt: 0, titel: 0 };
  for (const [pid, eintraege] of Object.entries(produkte)) {
    let zeile = out.products.find((z) => String(z.productId) === pid);
    if (!zeile) { zeile = { productId: pid, variants: [] }; out.products.push(zeile); stat.neu++; } else stat.verschmolzen++;
    if (!Array.isArray(zeile.variants)) zeile.variants = [];
    if (titel[pid] && !zeile.titleDe) { zeile.titleDe = titel[pid]; stat.titel++; }   // ein vorhandener titleDe bleibt immer
    for (const e of eintraege) {
      const vorhanden = zeile.variants.find((x) => String(x.id) === String(e.id));
      if (!vorhanden) { zeile.variants.push({ id: e.id, originalSize: e.originalSize, displaySizeCh: e.displaySizeCh }); stat.ergaenzt++; }
      else {
        if (vorhanden.originalSize !== e.originalSize) throw new Error(`Rohwert weicht ab: Produkt ${pid} Variante ${e.id}: ${vorhanden.originalSize} gegen ${e.originalSize}`);
        if (vorhanden.displaySizeCh !== e.displaySizeCh) { vorhanden.displaySizeCh = e.displaySizeCh; stat.ersetzt++; }
      }
    }
  }
  return { galerie: out, stat };
}
