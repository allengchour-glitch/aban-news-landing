/**
 * Google-Schaufenster: welche Produkte bleiben auf dem Vertriebskanal «Google & YouTube»?
 *
 * WARUM (Besitzer-Screenshot 28.10.2026, Merchant Center «Needs attention»):
 *   «Shopping ads quota limit reached (outside of CSS program)» und «Over capacity for Shopping ads
 *   (in CSS program)», je 236 000 Produkte (60 %). Produkte darüber sind «Limited» und laufen nicht in
 *   Anzeigen. QUELLE Google Merchant Center Help «Understanding quotas» (abgerufen 28.10.2026):
 *   Standardgrenze 150 000 Artikel je Bereich (Anzeigen in CSS-Ländern, Anzeigen ausserhalb, kostenlose
 *   Einträge); Erhöhung nur bei mindestens 80 % Auslastung, unter 20 % abgelehnten/ausstehenden
 *   Artikeln und ausreichender Leistung; Google nennt als Weg «remove products you no longer intend to
 *   sell or advertise». Ein Artikel ist eine VARIANTE.
 * GEMESSEN 28.10.2026 (Bulk-Abfrage, 56 618 aktive Produkte): 54 745 liegen auf dem Kanal «Google & YouTube»
 *   mit zusammen 514 931 Varianten; 20 433 davon tragen `excluded_destination = ["Shopping_ads"]` (207 114
 *   Varianten), 778 sind Fortura/CH-Lager. Die Auswahl-Läufe fügen jede Nacht Varianten hinzu: die Zahl
 *   wächst, ohne dass ein Produkt dazukommt.
 *
 * DIE REGEL: bleiben darf, was Google zeigen soll, bis die Zahl der Varianten unter dem Budget liegt.
 *   nie      zuerst: Sperrtag (`kanal_sperren.mjs`), keine Google-Kategorie, Lieferbarkeit/Bild negativ getaggt,
 *            offene Prüf-Tags (`PRUEF_TAGS`), Lizenzname im Titel (`LIZENZ` aus gmc_feed_item.mjs),
 *            Variantenzahl unbekannt (Unbekannt ist kein Befund: es wird nichts erfunden)
 *   Stufe 1  Fortura/CH-Lager (Schweizer Lager, Kostüme): immer, auch mit Ausschlussfeld
 *   Stufe 0  «bewährt»: bestellt (bezahlt, nicht storniert/erstattet) ODER mindestens BEWAEHRT_MIN_RATING Sterne bei mindestens
 *            BEWAEHRT_MIN_ANZAHL Bewertungen: immer, auch mit Ausschlussfeld, ohne Kategorie-Deckel (Prüfer 28.10.: ohne diese Stufe
 *            gingen 7 von 14 verkauften und 971 von 1 993 gut bewerteten Produkten vom Kanal)
 *   Stufe 2  Marge A oder B (Tags `mengenrabatt-a`/`-b`) ohne Ausschlussfeld: immer (GEMESSEN 28.10.: 4 424 Marge-Produkte tragen das Ausschlussfeld und gehen mit)
 *   Stufe 3  der Rest ohne Ausschlussfeld, bis das Budget voll ist; wenige Varianten zuerst (jede Variante
 *            kostet einen Platz), je Google-Kategorie (zwei Ebenen) höchstens KATEGORIE_DECKEL des Budgets
 *
 * GRENZEN: Das Werkzeug arbeitet NUR innerhalb dessen, was schon auf Google liegt, und nimmt ausschliesslich
 *   zurück, was es selbst abgewählt hat (Manifest). Ein Produkt, das nie auf Google war (Sperrtag, Policy),
 *   wird nie hinzugefügt. WER das Ausschlussfeld schreibt, ist unbekannt (siehe gmc_ausschluss.mjs); ob die
 *   Google-App es beachtet, ist unbelegt: die Regel hängt nicht davon ab, sie entfernt die Produkte vom Kanal.
 */
import { sperrTags } from './kanal_sperren.mjs';
import { LIZENZ } from './gmc_feed_item.mjs';

export const GOOGLE_PUBLICATION = 'gid://shopify/Publication/302872297857';
/** Wunschgrösse des Schaufensters in Varianten (SETZUNG: 60 000 Varianten Platz unter der Grenze von 150 000 für das Wachstum der nächtlichen Auswahl-Läufe bis zum nächsten Lauf). */
export const BUDGET_VARIANTEN = 90_000;
/** Darüber bricht ein Lauf ab (SETZUNG). */
export const HARTE_GRENZE = 140_000;
/** Darunter ist die Datenlage verdächtig (zum Beispiel fehlende Tags) und der Lauf bricht ab (SETZUNG). */
export const MIN_PRODUKTE = 500;
export const MIN_ZEILEN = 1000;
export const KATEGORIE_DECKEL = 0.15;
/** Unter diesem Budget (Varianten) schreibt das Werkzeug nie (SETZUNG; ein Tippfehler wie BUDGET=9000 würde fast alles abwählen). */
export const MIN_BUDGET = 40_000;
/** Mehr als dieser Anteil der Produkte auf Google soll abgewählt werden: der Plan ist verdächtig (SETZUNG; Erstlauf 28.10.: 51 %). */
export const MAX_ABWAHL_ANTEIL = 0.70;
/** Mehr als dieser Anteil ohne Google-Kategorie: die Lesung war lückenhaft (SETZUNG; gemessen 28.10.: 0,08 %). */
export const MAX_OHNE_KATEGORIE = 0.05;
/** Mehr als dieser Anteil unlesbarer Zeilen: der Lesevorgang war unvollständig, nichts schreiben. */
export const MAX_UNKLAR = 0.02;
/** Zusätzlich zu den Sperrtags (`cj-nicht-versendbar-ch` trifft schon das Muster `nicht-versendbar` in kanal_sperren.mjs). */
export const NEGATIV_TAGS = /^(cj-ausgelistet|bild-zu-klein)$/;
export const PRODUKT_GID = /^gid:\/\/shopify\/Product\/\d+$/;
/**
 * Offene Prüf- und Policy-Tags des Katalogs, die NICHT schon unter die Sperrtags von kanal_sperren.mjs fallen (Prüfer 28.10.: 59 Produkte mit
 * `stecker-unklar`, `versand-pruefen`, `lieferumfang-unklar`, `preis-pruefen-cj-spanne` blieben sonst auf Google). NICHT dabei: `auto-entwurf-0926`, die
 * Charge vom 26.09. ist die einzige Entwurfs-Familie OHNE harten Grund (dropship/BEWERTUNGEN-SICHTBARKEIT-1710.md); ihre 30 aktiven Produkte sind bewusst
 * freigegeben und verkaufen (GEMESSEN 28.10.: Hängematte, Midikleid und Blumenkleid aus Bestellungen #1011/#1013 tragen das Tag).
 * Quelle der Liste: AUSSCHLUSS_TAGS in lib/mengenrabatt.mjs; der Test hält beide gleich (ausser `fortura`/`kostuem`, die hier Stufe 1 sind).
 */
export const PRUEF_TAGS = /^(waffenzubehoer-nicht-verkaufen|stecker-nicht-ch|stecker-unklar|marken-pruefen|waffe-pruefen|versand-pruefen|google-policy-waffen|heilversprechen-risiko|google-kanal-markenware-unklar|lieferumfang-unklar|preis-pruefen-cj-spanne)$/;
/** «Bewährt» (SETZUNG): mindestens so viele Sterne bei mindestens so vielen Bewertungen. */
export const BEWAEHRT_MIN_RATING = 4;
export const BEWAEHRT_MIN_ANZAHL = 3;
/** Bestellungen in diesen Zuständen zählen als verkauft (nicht storniert, nicht Test). Vollständig erstattete und nicht bezahlte nicht. */
const BEZAHLT = new Set(['PAID', 'PARTIALLY_REFUNDED']);

/** `reviews.rating` ist JSON (`{"value":"4.5",…}`) oder eine Zahl; `reviews.rating_count` eine ganze Zahl als Text. Unlesbar → null. */
export function ratingAus(ratingWert, anzahlWert) {
  let r = ratingWert;
  if (typeof r === 'string' && r.trim().startsWith('{')) { try { r = JSON.parse(r).value; } catch { return null; } }
  const rating = Number.parseFloat(String(r ?? '')), anzahl = Number.parseInt(String(anzahlWert ?? ''), 10);
  if (!Number.isFinite(rating) || !Number.isFinite(anzahl) || rating <= 0 || anzahl < 1) return null;
  return { rating, anzahl };
}
/** Ist das Produkt bewährt? `p.bestellt` (true/false) und `p.rating`/`p.bewertungen` (Zahl oder null). */
export function bewaehrt(p) {
  if (p.bestellt === true) return true;
  return Number.isFinite(p.rating) && Number.isFinite(p.bewertungen) && p.rating >= BEWAEHRT_MIN_RATING && p.bewertungen >= BEWAEHRT_MIN_ANZAHL;
}
/**
 * Produkt-IDs aus bezahlten Bestellungen. `bestellungen`: [{test, cancelledAt, displayFinancialStatus, lineItems:{nodes:[{product:{id}}], pageInfo:{hasNextPage}}}].
 * Hat eine Bestellung mehr Positionen als gelesen, ist die Liste unvollständig (`vollstaendig:false`): wer sich darauf verlässt, schreibt nicht.
 */
export function bestellteIds(bestellungen) {
  const ids = new Set(); let vollstaendig = true;
  for (const b of bestellungen || []) {
    if (!b || b.test || b.cancelledAt || !BEZAHLT.has(b.displayFinancialStatus)) continue;
    if (b.lineItems?.pageInfo?.hasNextPage) vollstaendig = false;
    for (const n of b.lineItems?.nodes || []) { const id = n?.product?.id; if (PRODUKT_GID.test(String(id))) ids.add(id); }
  }
  return { ids, vollstaendig };
}

const hatTag = (p, t) => Array.isArray(p.tags) && p.tags.includes(t);

/**
 * Schliesst das Feld `excluded_destination` Shopping-Anzeigen aus? Nur eine Liste MIT «Shopping_ads» zählt; leer, «[]» und
 * andere Ziele (Local_inventory_ads, Free_listings) schliessen sie nicht aus (Prüfer 28.10., heute 0 Fälle). Ein unlesbarer
 * Wert gilt vorsichtshalber als Ausschluss (das Produkt bleibt dann vom Kanal, rückholbar).
 */
export function ausschlussGilt(wert) {
  if (wert === null || wert === undefined || String(wert).trim() === '') return false;
  try { const v = JSON.parse(String(wert)); return Array.isArray(v) ? v.includes('Shopping_ads') : true; } catch { return true; }
}
const katSchluessel = p => String(p.kategorie || '').split(' > ').slice(0, 2).join(' > ');

/** Stufe 0 bis 3 oder null (mit Grund). Reihenfolge ist Absicht: Sperren zuerst (auch vor Fortura und vor «bewährt»), dann Fortura, dann bewährt, dann das Ausschlussfeld. */
export function stufe(p) {
  const tags = Array.isArray(p.tags) ? p.tags : [];
  if (!p.kategorie) return { stufe: null, grund: 'keine-google-kategorie' };
  if (sperrTags(tags).length) return { stufe: null, grund: 'sperrtag' };
  if (tags.some(t => NEGATIV_TAGS.test(t))) return { stufe: null, grund: 'nicht-lieferbar-oder-bild' };
  if (tags.some(t => PRUEF_TAGS.test(t))) return { stufe: null, grund: 'pruef-tag' };
  if (p.titel && LIZENZ.test(String(p.titel))) return { stufe: null, grund: 'lizenz-titel' };
  if (hatTag(p, 'fortura') || hatTag(p, 'ch-lager')) return { stufe: 1 };
  if (bewaehrt(p)) return { stufe: 0 };
  if (ausschlussGilt(p.ausschluss)) return { stufe: null, grund: 'ausschluss-shopping-ads' };
  if (hatTag(p, 'mengenrabatt-a') || hatTag(p, 'mengenrabatt-b')) return { stufe: 2 };
  return { stufe: 3 };
}

/**
 * Wählt das Schaufenster. `zeilen`: [{id, handle, titel, tags, varianten, kategorie, ausschluss, bestellt, rating, bewertungen}].
 * @returns {{drin: Map<string, number>, draussen: Array<{id:string, grund:string}>, zahlen: object}}
 */
export function waehle(zeilen, opt = {}) {
  const budget = opt.budget ?? BUDGET_VARIANTEN;
  const deckel = Math.ceil((opt.katDeckel ?? KATEGORIE_DECKEL) * budget);
  const stufen = { 0: [], 1: [], 2: [], 3: [] };
  const draussen = [];
  for (const p of zeilen) {
    const v = Number(p.varianten);
    if (!Number.isFinite(v) || v < 1) { draussen.push({ id: p.id, grund: 'varianten-unbekannt' }); continue; }
    const s = stufe(p);
    if (s.stufe === null) { draussen.push({ id: p.id, grund: s.grund }); continue; }   // Stufe 0 ist gültig (und falsy)
    stufen[s.stufe].push({ ...p, v });
  }
  const drin = new Map();
  const proKat = new Map();
  const summen = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const nimm = (p, s) => {
    drin.set(p.id, s); summen[s] += p.v;
    const k = katSchluessel(p); proKat.set(k, (proKat.get(k) || 0) + p.v);
  };
  for (const s of [0, 1, 2]) for (const p of stufen[s]) nimm(p, s);
  const rest = stufen[3].sort((a, b) => a.v - b.v || String(a.handle).localeCompare(String(b.handle)) || String(a.id).localeCompare(String(b.id)));
  let gesamt = summen[0] + summen[1] + summen[2];
  for (const p of rest) {
    if (gesamt + p.v > budget) { draussen.push({ id: p.id, grund: 'budget' }); continue; }
    if ((proKat.get(katSchluessel(p)) || 0) + p.v > deckel) { draussen.push({ id: p.id, grund: 'kategorie-deckel' }); continue; }
    nimm(p, 3); gesamt += p.v;
  }
  return {
    drin, draussen,
    zahlen: {
      budget, katDeckel: deckel,
      produkte: { 0: stufen[0].length, 1: stufen[1].length, 2: stufen[2].length, 3: stufen[3].length },
      drin: { 0: [...drin.values()].filter(s => s === 0).length, 1: [...drin.values()].filter(s => s === 1).length, 2: [...drin.values()].filter(s => s === 2).length, 3: [...drin.values()].filter(s => s === 3).length },
      varianten: { 0: summen[0], 1: summen[1], 2: summen[2], 3: summen[3], gesamt },
    },
  };
}

/** Erste Zeilen einer Liste je Grund, damit eine Zahl nie ohne Beispiele steht. */
export function zaehleGruende(liste) {
  const m = {};
  for (const x of liste) m[x.grund] = (m[x.grund] || 0) + 1;
  return m;
}

/**
 * Der Plan: wer geht vom Kanal, wer darf zurück, und ob der Lauf überhaupt erlaubt ist.
 * `aufGoogle` muss true oder false sein; alles andere (null, undefined) ist «unklar» und wird nie angefasst.
 * `manifest`: Set der Produkt-IDs, die dieses Werkzeug früher abgewählt hat.
 */
export function plan(zeilen, manifest = new Set(), opt = {}) {
  const fehler = [];
  const { drin, draussen, zahlen } = waehle(zeilen, opt);
  const gruende = new Map(draussen.map(d => [d.id, d.grund]));
  // «Unklar» = nie anfassen: Kanalstatus nicht true/false, fremde ID oder unbekannte Variantenzahl (Unbekannt ist kein Befund, Prüfer 28.10.: 701 Zeilen ohne variantsCount wurden abgewählt)
  const klar = p => typeof p.aufGoogle === 'boolean' && PRODUKT_GID.test(String(p.id)) && Number.isFinite(Number(p.varianten)) && Number(p.varianten) >= 1;
  const unklar = zeilen.filter(p => !klar(p));
  const abwaehlen = [];
  const aufnehmen = [];
  const zuruecksetzen = [];
  for (const p of zeilen) {
    if (!klar(p)) continue;
    // Volle Rücknahme: alles, was wir (laut Manifest) abgewählt haben und das nicht mehr auf Google liegt, ausser mit Sperrtag
    if (p.aufGoogle === false && manifest.has(p.id) && !sperrTags(p.tags || []).length) zuruecksetzen.push({ id: p.id, handle: p.handle });
    if (p.aufGoogle === true && !drin.has(p.id)) abwaehlen.push({ id: p.id, handle: p.handle, grund: gruende.get(p.id) || 'unbekannt', varianten: Number(p.varianten) || 0 });
    if (p.aufGoogle === false && manifest.has(p.id) && drin.has(p.id)) aufnehmen.push({ id: p.id, handle: p.handle, stufe: drin.get(p.id) });
  }
  // Wie viele Varianten liegen NACH dem Lauf auf Google? (nur Produkte mit bekannter Variantenzahl)
  const nachher = zeilen.reduce((s, p) => {
    const v = Number(p.varianten);
    if (!Number.isFinite(v)) return s;
    const bleibt = p.aufGoogle === true && drin.has(p.id);
    const kommt = p.aufGoogle === false && manifest.has(p.id) && drin.has(p.id);
    return s + (bleibt || kommt ? v : 0);
  }, 0);
  const vorher = zeilen.reduce((s, p) => s + (p.aufGoogle === true && Number.isFinite(Number(p.varianten)) ? Number(p.varianten) : 0), 0);
  if (zeilen.length < MIN_ZEILEN) fehler.push(`zu-wenige-zeilen: ${zeilen.length} (Lesevorgang unvollständig?)`);
  if (zeilen.length && unklar.length / zeilen.length > MAX_UNKLAR) fehler.push(`zu-viele-unklare-zeilen: ${unklar.length} von ${zeilen.length}`);
  if (drin.size < MIN_PRODUKTE) fehler.push(`schaufenster-zu-klein: ${drin.size} Produkte (Mindestens ${MIN_PRODUKTE}; fehlen Tags?)`);
  if (nachher > HARTE_GRENZE) fehler.push(`schaufenster-zu-gross: ${nachher} Varianten nach dem Lauf (Grenze ${HARTE_GRENZE})`);
  const aufGoogleJetzt = zeilen.filter(p => klar(p) && p.aufGoogle === true).length;
  if (aufGoogleJetzt && abwaehlen.length / aufGoogleJetzt > MAX_ABWAHL_ANTEIL) fehler.push(`zu-viele-abwaehlen: ${abwaehlen.length} von ${aufGoogleJetzt} Produkten auf Google (Grenze ${Math.round(MAX_ABWAHL_ANTEIL * 100)} %; lückenhafte Lesung oder falsches BUDGET?)`);
  if (zeilen.length && zeilen.filter(p => !p.kategorie).length / zeilen.length > MAX_OHNE_KATEGORIE) fehler.push(`zu-viele-ohne-kategorie: ${zeilen.filter(p => !p.kategorie).length} von ${zeilen.length} Zeilen (Metafeld nicht gelesen?)`);
  return {
    ok: fehler.length === 0, fehler, abwaehlen, aufnehmen, zuruecksetzen, zahlen,
    varianten: { vorher, nachher },
    gruende: zaehleGruende(abwaehlen), unklar: unklar.length, drin, draussen,
  };
}

/** Teilt in Stücke zu n. */
export function stuecke(liste, n) {
  if (!Number.isInteger(n) || n < 1) throw new Error('n muss eine ganze Zahl >= 1 sein');
  const aus = [];
  for (let i = 0; i < liste.length; i += n) aus.push(liste.slice(i, i + n));
  return aus;
}

/** Mutation für ein Stück Produkte. Jede ID wird geprüft: sie landet im Text der Abfrage. */
export function mutation(ids, art) {
  if (art !== 'abwaehlen' && art !== 'aufnehmen') throw new Error(`unbekannte Art: ${art}`);
  const name = art === 'abwaehlen' ? 'publishableUnpublish' : 'publishablePublish';
  return 'mutation{ ' + ids.map((id, i) => {
    if (!PRODUKT_GID.test(String(id))) throw new Error(`ungültige Produkt-ID: ${id}`);
    return `a${i}: ${name}(id:"${id}", input:[{publicationId:"${GOOGLE_PUBLICATION}"}]){ userErrors{ field message } }`;
  }).join(' ') + ' }';
}

/** Antwort einer Mutation lesen: nur ein belegter Erfolg zählt (keine userErrors, Alias da). */
export function auswerten(antwort, ids, art) {
  const name = art === 'abwaehlen' ? 'publishableUnpublish' : 'publishablePublish';
  const ok = []; const fehlgeschlagen = [];
  ids.forEach((id, i) => {
    const e = antwort?.[`a${i}`];
    const ue = e?.userErrors;
    if (!e || !Array.isArray(ue)) fehlgeschlagen.push({ id, meldung: `${name}: keine Antwort` });
    else if (ue.length) fehlgeschlagen.push({ id, meldung: ue.map(u => u.message).join('; ').slice(0, 160) });
    else ok.push(id);
  });
  return { ok, fehlgeschlagen };
}

/**
 * Manifest lesen: eine JSON-Zeile je Aktion («ab-versucht» = Absicht VOR dem Aufruf, «ab» = belegt abgewählt,
 * «auf» = wieder aufgenommen). Die LETZTE Aktion je Produkt gilt; `ids` sind alle, deren letzte Aktion nicht «auf»
 * ist, also auch Produkte, bei denen ein Aufruf mitten im Stück abbrach (die Absicht steht vor dem Aufruf, nie danach;
 * ein Produkt, das trotzdem noch auf Google liegt, nimmt `plan` ohnehin nicht an). Kaputte Zeilen werden gezählt.
 */
export function parseManifest(text) {
  const letzte = new Map(); let kaputt = 0;
  for (const z of String(text || '').replace(/^\uFEFF/, '').split('\n')) {
    if (!z.trim()) continue;
    try {
      const o = JSON.parse(z);
      const aktion = o?.aktion ?? 'ab';
      if (o && PRODUKT_GID.test(String(o.id)) && (aktion === 'ab' || aktion === 'auf' || aktion === 'ab-versucht')) letzte.set(o.id, aktion); else kaputt++;
    } catch { kaputt++; }
  }
  return { ids: new Set([...letzte].filter(([, a]) => a !== 'auf').map(([id]) => id)), kaputt };
}
export const manifestZeile = (id, handle, datum, aktion = 'ab') => JSON.stringify({ id, handle, am: datum, aktion });
