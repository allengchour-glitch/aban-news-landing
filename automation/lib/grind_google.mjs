/**
 * Google-Kategorie und Taxonomie-Tags für NEUE Produkte («Grind 2.0»). Rein, ohne Netz; die Daten stehen in grind_google_daten.json.
 *
 * WARUM (27.10.2026): Die Taxonomie des Shops (Tags `sort-…`, Collections) hängt am Metafeld `mm-google-shopping.google_product_category`
 * (offizielle Google-Pfade, englisch). CJ liefert keine Google-Kategorie, und kein Altwerkzeug schreibt sie. Aus dem CJ-Blatt allein folgt sie
 * auch nicht: von 79 Blättern mit mindestens 5 Produkten bestimmen nur 17 den Pfad zu ≥ 90 % allein (Audit M15). «Home Office Storage» verteilt
 * sich auf 56 Google-Kategorien. Darum drei Quellen, strikt getrennt und mit eigener Sicherheit:
 *
 *   'tabelle'  Das CJ-Blatt (categoryId, nie der Name) ist REIN: ≥ 90 % von mindestens 5 Shop-Produkten tragen denselben Pfad. Gilt nur, wenn der
 *              Titel nicht klar etwas anderes sagt (CJ ordnet selbst falsch ein: Staubsauger in «Pet Beds», Ventilator in «Power Bank»).
 *   'titel'    Das Blatt ist unrein oder unbekannt, aber der Titel nennt die Warenart: erst handgeschriebene Regeln (titel_muss/titel_nicht
 *              wie in dropship/taxonomie-2610-b/kern.mjs; titel_muss gegen die Kernphrase, also die Ware vor «für/mit/aus …»), dann das Kopfwort-Lexikon
 *              (das letzte Wort der Kernphrase, auch als Endung eines Kompositums: «Fressnapf» → «napf»). Lexikon-Einträge stammen aus dem Mining
 *              (≥ 3 Shop-Produkte, ≥ 90 % derselbe Pfad) oder sind von Hand gelesen und bestätigt (`quelle: 'gelesen'`, ≥ 4 Produkte, ≥ 50 %). In jedem
 *              Fall hat ein Mensch die Einträge gelesen; was dabei herausflog, steht mit Grund in `lexikon_verworfen`. `vertrauen` ist die gemessene Übereinstimmung
 *              mit dem Shop (null = Regel ohne Shop-Beleg).
 *   'unklar'   Keine Quelle trägt, oder zwei Quellen widersprechen sich. Der Orchestrator legt dieses Produkt NICHT an. Es wird nie geraten.
 *
 * Jeder ausgegebene Pfad steht in Googles offizieller Taxonomie (Version in der Datei, 5 595 Pfade). Das wird beim Laden geprüft und wirft sonst:
 * ein Tippfehler in der Datendatei darf nie bis in den Shop kommen. Ist die Originaldatei (gtax.txt) erreichbar, wird zusätzlich gegen sie geprüft.
 *
 * Die Referenz der Messung ist der Pfad, den die Feed-App im Shop schon gesetzt hat. Sie ist KEINE Wahrheit: sie ordnet z. B. ein Katzenklettergerüst
 * unter «Pet Bowls» ein. Die Trefferquote misst deshalb die Übereinstimmung mit dem Shop, nicht die Richtigkeit; die Handprüfung steht in `meta.messung`.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { KATEGORIEN, gehoertIn } from './kategorien.mjs';

// ───────────────────────── Schwellen (die Zahlen stehen auch in meta.schwellen der Datendatei) ─────────────────────────
/** Ein CJ-Blatt gilt als REIN, wenn der häufigste Google-Pfad mindestens so viele der Shop-Produkte trägt … */
export const REIN_MIN = 0.90;
/** … und das Blatt mindestens so viele Shop-Produkte hat (darunter ist die Zahl nicht beurteilbar). */
export const REIN_MIN_N = 5;
/** Lexikon: Schlüssel aus mindestens so vielen Produkten, mit mindestens diesem Anteil am häufigsten Pfad. */
export const LEXIKON_MIN_N = 3;
export const LEXIKON_REIN = 0.90;
/** Längster Lexikon-Schlüssel (Endung des Kopfworts). */
const SCHLUESSEL_MAX = 24;
/** Wörter am Ende der Kernphrase, die keine Warenart nennen («Pinsel-Set», «Zubehör-Kit», Masseinheiten): das Kopfwort ist dann das Wort davor. */
/** Reihenfolge, in der das Lexikon nach der Warenart im Titel sucht (siehe kopfKandidaten). */
export const STRATEGIEN = Object.freeze(['kopf']);   // 'erstes' und 'ende' sind wählbar (googlePfad(…, { strategien })), aber nicht Vorgabe: gemessen 82 % bzw. 48–62 % Treffer bei den zusätzlichen Entscheidungen
export const GENERISCH = Object.freeze(new Set(['set', 'sets', 'kit', 'kits', 'bundle', 'paket', 'pakete', 'pack', 'packung', 'stück', 'stk', 'teile', 'teilig',
  'zubehör', 'accessoires', 'artikel', 'produkt', 'variante', 'modell', 'serie', 'edition', 'kollektion', 'combo', 'komplett',
  // Masseinheiten, die hinter einer Zahl stehen («Powerbank 10000 mAh», «Rucksack 19 Zoll»)
  'mah', 'zoll', 'inch', 'watt', 'volt', 'pcs', 'liter', 'meter', 'gramm', 'kilo']));

const WORT = /[\p{L}\p{N}]+/gu;
const klein = s => String(s ?? '').toLowerCase();
const wortliste = s => klein(s).match(WORT) || [];

// ───────────────────────── Titel: Kernphrase und Kopfwort ─────────────────────────
/** Ab hier beginnt im Titel die Beschreibung, nicht mehr die Ware: «Langleine FÜR grosse Hunde», «Kleid MIT Rüschen», «Nagel-Ornamente: 20er-Set». */
const TRENNER = /\s(?:für|fuer|mit|aus|ohne|in|im|zum|zur|von|bei|inkl\.?|incl\.?|und|oder|sowie|wie|auf|an|gegen|zu)\s|[,:;|(+]|\s[-–—]\s|\s&\s/i;

/** Der Teil des Titels vor dem ersten Trenner = die Ware. Gibt es vorne nichts («Für Hunde: Leine»), gilt der ganze Titel. */
export function kernPhrase(titel) {
  // «Futter- und Wasserspender», «Hunde- & Katzenbett»: der Bindestrich vor und/oder/& heisst «das Wort geht rechts weiter», nicht «hier endet die Ware».
  const t = String(titel ?? '').replace(/-\s+(?:und|oder|sowie|&)\s+/gi, ' ').trim();
  const gepolstert = ' ' + t + ' ';
  const m = TRENNER.exec(gepolstert);
  const kern = (m ? gepolstert.slice(0, m.index) : t).trim();
  return kern || t;
}

/** Das Wort, das die Warenart nennt: das letzte Wort der Kernphrase, ohne Zahlen/Grössen (≤ 2 Zeichen) und ohne generische Wörter («Set»). */
export function kopfwort(titel) {
  return kopfKandidaten(titel, ['kopf'])[0]?.wort ?? null;
}

/** Wörter der Kernphrase, die als Warenart in Frage kommen (ohne Zahlen, Grössen, generische Wörter), in Lesereihenfolge. */
function warenWoerter(phrase) {
  return wortliste(phrase).filter(w => !(/^\p{N}/u.test(w) || w.length <= 2 || GENERISCH.has(w)));
}
/**
 * Mögliche Warenwörter eines Titels in Reihenfolge der Strategien. 'kopf' = letztes Wort der Kernphrase («Fressnapf aus Edelstahl» → fressnapf),
 * 'erstes' = erstes Wort der Kernphrase («Bratpfanne 28 cm Antihaft», «Computermaus kabellos»: die Ware steht vorn, Eigenschaften folgen),
 * 'ende' = letztes Wort des ganzen Titels («Verstellbare, rutschfeste Hunde-Outdoorschuhe»: das Komma trennt hier Adjektive, keine Beschreibung).
 */
export function kopfKandidaten(titel, strategien = STRATEGIEN) {
  const aus = [], sehe = new Set();
  for (const st of strategien) {
    const ws = st === 'ende' ? warenWoerter(String(titel ?? '')) : warenWoerter(kernPhrase(titel));
    const w = st === 'erstes' ? ws[0] : ws[ws.length - 1];
    if (w && !sehe.has(w)) { sehe.add(w); aus.push({ wort: w, strategie: st }); }
  }
  return aus;
}
/** Endungen des Kopfworts, längste zuerst. Unter 4 Zeichen nur das ganze Wort («uhr», «wok»): kurze Endungen sind Zufall («ohne» in «Drohne»). */
function endungen(wort) {
  const aus = [];
  for (let l = Math.min(wort.length, SCHLUESSEL_MAX); l >= 3; l--) if (l >= 4 || l === wort.length) aus.push(wort.slice(-l));
  return aus;
}

// ───────────────────────── Pfade ─────────────────────────
const EBENEN = p => String(p).split(' > ');
/** Liegt `unten` auf oder unter `oben`? («Apparel & Accessories > Shoes» liegt auf «Apparel & Accessories».) */
export const liegtUnter = (unten, oben) => unten === oben || String(unten).startsWith(oben + ' > ');
/** Familie = die ersten n Ebenen. */
export const familie = (pfad, n = 2) => EBENEN(pfad).slice(0, n).join(' > ');

/**
 * Mehrere Treffer mit verschiedenen Pfaden: liegen alle auf EINER Kette (jeder ist Vorfahr des tiefsten), gewinnt der tiefste; sonst Widerspruch (null).
 */
export function einigePfade(pfade) {
  const einzig = [...new Set(pfade)];
  if (einzig.length === 0) return null;
  const tiefster = einzig.reduce((a, b) => (EBENEN(b).length > EBENEN(a).length ? b : a));
  return einzig.every(p => liegtUnter(tiefster, p)) ? tiefster : null;
}

// ───────────────────────── CJ-Blatt: Name und Tabelle ─────────────────────────
/**
 * CJ schreibt dieselbe Kategorie in bis zu 22 Schreibweisen («Home, Garden & Furniture» / «Home & Garden， Furniture», «Bag & Shoes» / «Bags & Shoes»,
 * «Womens» / «Women's»). Die categoryId ist der Schlüssel; der Name dient nur als Rückfall und zur Anzeige. Schlüssel eines Namens = letztes Segment,
 * Wörter auf den Stamm gekürzt und sortiert (so ist die Reihenfolge der Wörter gleichgültig).
 */
export function normiereKategorieName(name) {
  return String(name ?? '').normalize('NFKC').replace(/\s*(?:>|\/|›|»)\s*/g, ' > ').replace(/\s+/g, ' ').trim();
}
const stamm = w => w.replace(/'/g, '').replace(/ies$/, 'y').replace(/(?<=\p{L}{3})s$/u, '');
export function blattSchluessel(name) {
  const segmente = normiereKategorieName(name).split(' > ').filter(Boolean);
  const blatt = segmente[segmente.length - 1] || '';
  const ws = (blatt.toLowerCase().replace(/[’`´]/g, "'").replace(/'/g, '').match(/[\p{L}\p{N}]+/gu) || []).filter(w => w !== 'and').map(stamm);
  return ws.length ? ws.sort().join(' ') : '';
}

/**
 * Aus Paaren (Blatt → Google-Pfad der Shop-Produkte) die Tabelle bauen. Rein; die Datendatei wird damit erzeugt und die Tests prüfen es.
 * @param {{cid:string, name?:string, pfad:string}[]} paare
 * @returns {Object<string,{name:string,n:number,pfad:string,anteil:number,kand:[string,number][],tabelle:boolean}>}
 */
export function blattTabelle(paare, { reinMin = REIN_MIN, minN = REIN_MIN_N, kandMax = 8 } = {}) {
  const roh = new Map();
  for (const p of paare) {
    if (!p?.cid || !p.pfad) continue;
    let e = roh.get(p.cid);
    if (!e) { e = { name: p.name || '', n: 0, pfade: new Map() }; roh.set(p.cid, e); }
    e.n++; if (!e.name && p.name) e.name = p.name;
    e.pfade.set(p.pfad, (e.pfade.get(p.pfad) || 0) + 1);
  }
  const aus = {};
  for (const [cid, e] of [...roh].sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))) {
    const kand = [...e.pfade].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const [pfad, c] = kand[0];
    const anteil = Math.round((c / e.n) * 1000) / 1000;
    // Ein Pfad nur aus der obersten Ebene («Electronics») sagt nichts: so ein Blatt ist nie «rein».
    aus[cid] = { name: e.name, n: e.n, pfad, anteil, kand: kand.slice(0, kandMax), tabelle: e.n >= minN && c / e.n >= reinMin && pfad.includes(' > ') };
  }
  return aus;
}

// ───────────────────────── Lexikon (Kopfwort-Endung → Pfad) ─────────────────────────
/**
 * Lexikon-Kandidaten aus Beispielen (Titel + Pfad der Shop-Produkte) mining. Rein.
 *  1. Kopfwort jedes Titels; als Schlüssel zählen das ganze Wort und jede Endung ≥ 4 Zeichen, die selbst als ganzes Kopfwort mindestens 2-mal vorkommt
 *     (so entstehen «napf», «leine», «kleid», aber keine Wortfetzen wie «huhe» oder «ohne» aus «Drohne»).
 *  2. Ein Schlüssel gilt ab `minN` Beispielen, wenn der häufigste Pfad ≥ `rein` aller Beispiele trägt.
 *  3. Hat eine kürzere Endung desselben Wortes denselben Pfad, ist der längere Schlüssel überflüssig (der Treffer ist ohnehin der längste).
 *  4. `verworfen` (von Hand gelesen und abgelehnt) fällt heraus, und zwar VOR Schritt 3: wer «bank» (Powerbank, aber auch Sitzbank) verwirft, bekommt «powerbank» zurück.
 *  5. `schutz` hängt einem Schlüssel Bedingungen an (`muss`: mindestens ein Treffer, `nicht`: kein Treffer, beides Regexe gegen den ganzen Titel).
 * @param {{titel:string, pfad:string}[]} beispiele
 * @returns {{k:string, pfad:string, n:number, rein:number, bsp:string[]}[]}
 */
export function lexikonBauen(beispiele, { minN = LEXIKON_MIN_N, rein = LEXIKON_REIN, verworfen = [], schutz = {} } = {}) {
  const koepfe = beispiele.map(b => ({ ...b, w: kopfwort(b.titel) })).filter(b => b.w);
  const kopfZahl = new Map();
  for (const b of koepfe) kopfZahl.set(b.w, (kopfZahl.get(b.w) || 0) + 1);
  const m = new Map();
  for (const b of koepfe) {
    for (const k of endungen(b.w)) {
      if (k !== b.w && (kopfZahl.get(k) || 0) < 2) continue;
      let e = m.get(k); if (!e) { e = { n: 0, pfade: new Map(), bsp: [] }; m.set(k, e); }
      e.n++; e.pfade.set(b.pfad, (e.pfade.get(b.pfad) || 0) + 1);
      if (e.bsp.length < 2 && !e.bsp.includes(b.titel)) e.bsp.push(b.titel);
    }
  }
  const lex = new Map();
  const weg = new Set(verworfen);
  for (const [k, e] of m) {
    if (e.n < minN || weg.has(k)) continue;
    const [pfad, c] = [...e.pfade].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    if (!pfad.includes(' > ')) continue;                                  // nur die oberste Ebene («Luggage & Bags») ist zu allgemein für einen Schlüssel
    if (c / e.n >= rein) lex.set(k, { k, pfad, n: e.n, rein: Math.round((c / e.n) * 1000) / 1000, ...(schutz[k] || {}), bsp: e.bsp });
  }
  for (const [k, v] of [...lex]) {
    for (let l = 4; l < k.length; l++) { const kurz = lex.get(k.slice(-l)); if (kurz && kurz.pfad === v.pfad) { lex.delete(k); break; } }   // nur Endungen ≥ 4: ein 3-Buchstaben-Schlüssel gilt nur für das ganze Wort
  }
  return [...lex.values()].sort((a, b) => a.pfad.localeCompare(b.pfad) || b.n - a.n || a.k.localeCompare(b.k));
}

/** Untergrenzen für Einträge, die von Hand gelesen und bestätigt wurden (`quelle: 'gelesen'`): die Feed-App ist im Shop nicht durchgehend einig. */
export const GELESEN_MIN_N = 4;
export const GELESEN_MIN_REIN = 0.5;

/**
 * Zweite Stufe des Lexikons: Schlüssel, die der Miner wegen zu uneinheitlicher Shop-Pfade (zwischen 50 und 90 %) nicht übernimmt, die ein Mensch aber gelesen
 * und als eindeutige Warenart bestätigt hat («Hundehalsband», «Lockenstab», «Tischlampe»). Der Pfad kommt aus `spec` oder, wenn dort `pfad` fehlt, aus der Shop-Mehrheit.
 * Zahl und Anteil werden an den Beispielen gemessen (mit `muss`/`nicht` des Eintrags) und gespeichert, damit man sieht, wie eindeutig der Shop selbst ist.
 * @param {object[]} lexikon  Ergebnis von lexikonBauen
 * @param {{titel:string,pfad:string}[]} beispiele
 * @param {{k:string, pfad?:string, muss?:string[], nicht?:string[]}[]} spec
 * @returns {{lexikon:object[], uebersprungen:{k:string,grund:string}[]}}
 */
export function lexikonErgaenzen(lexikon, beispiele, spec) {
  const koepfe = beispiele.map(b => ({ ...b, w: kopfwort(b.titel) })).filter(b => b.w);
  const neu = [], uebersprungen = [];
  for (const sp of spec) {
    // Ein Schlüssel darf mehrfach vorkommen, wenn JEDER Eintrag eine Bedingung trägt (muss/nicht): «jacke» für Hunde und für Katzen. Ohne Bedingung nur einmal.
    const schonDa = [...lexikon, ...neu].filter(e => e.k === sp.k);
    if (schonDa.length && (!(sp.muss?.length || sp.nicht?.length) || schonDa.some(e => !(e.muss?.length || e.nicht?.length)))) { uebersprungen.push({ k: sp.k, grund: 'steht schon im Lexikon' }); continue; }
    // Nur Beispiele, bei denen DIESER Schlüssel der längste Treffer wäre: «wandteppich» (Wandbehang) soll «teppich» nicht den Pfad vorgeben.
    const laenger = lexikon.filter(e => e.k.length > sp.k.length && e.k.endsWith(sp.k)).map(e => e.k);
    const treffer = koepfe.filter(b => (b.w === sp.k || (sp.k.length >= 4 && b.w.endsWith(sp.k))) && !laenger.some(l => b.w.endsWith(l))
      && (!sp.muss?.length || sp.muss.some(x => R(x).test(b.titel))) && !(sp.nicht || []).some(x => R(x).test(b.titel)));
    const zaehl = new Map();
    for (const b of treffer) zaehl.set(b.pfad, (zaehl.get(b.pfad) || 0) + 1);
    const top = [...zaehl].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const pfad = sp.pfad || top?.[0];
    if (!pfad) { uebersprungen.push({ k: sp.k, grund: 'keine Beispiele' }); continue; }
    // Treffer auf dem Pfad ODER einem seiner Vorfahren/Nachfahren zählen als Übereinstimmung (Throw Pillows vs. Pillows bleiben getrennt, Tools vs. Tools > Pliers nicht)
    const verwandt = [...zaehl].filter(([p]) => liegtUnter(p, pfad) || liegtUnter(pfad, p)).reduce((a, [, c]) => a + c, 0);
    const n = treffer.length, rein = n ? Math.round((verwandt / n) * 1000) / 1000 : 0;
    if (n < GELESEN_MIN_N || rein < GELESEN_MIN_REIN) { uebersprungen.push({ k: sp.k, grund: `zu wenig Beleg: n=${n}, Anteil ${rein}` }); continue; }
    const bsp = [...new Set(treffer.filter(b => b.pfad === pfad).map(b => b.titel))].slice(0, 2);
    neu.push({ k: sp.k, pfad, n, rein, quelle: 'gelesen', ...(sp.muss ? { muss: sp.muss } : {}), ...(sp.nicht ? { nicht: sp.nicht } : {}), bsp });
  }
  return { lexikon: [...lexikon, ...neu].sort((a, b) => a.pfad.localeCompare(b.pfad) || b.n - a.n || a.k.localeCompare(b.k)), uebersprungen };
}

// ───────────────────────── Taxonomie und Datenprüfung ─────────────────────────
/** «ID - Pfad»-Zeilen der Originaldatei (gtax.txt) → Menge der Pfade. */
export function taxonomieAusText(text) {
  const pfade = new Set();
  for (const z of String(text).split('\n')) {
    if (!z.trim() || z.startsWith('#')) continue;
    const m = /^\d+ - (.+)$/.exec(z.trim());
    if (m) pfade.add(m[1]);
  }
  return pfade;
}
export const taxonomieHash = pfade => createHash('sha256').update([...pfade].sort().join('\n')).digest('hex');

const rxCache = new Map();
const R = s => { let r = rxCache.get(s); if (!r) { r = new RegExp(s, 'i'); rxCache.set(s, r); } return r; };

/**
 * Prüft die Datendatei; wirft mit allen Funden auf einmal. Rein (die Taxonomie wird übergeben).
 * @param {object} daten
 * @param {Set<string>} taxonomie  alle gültigen Google-Pfade
 */
export function pruefeDaten(daten, taxonomie) {
  const fehler = [];
  const pfadOk = (pfad, wo) => {
    if (typeof pfad !== 'string' || !pfad) { fehler.push(`${wo}: kein Pfad`); return; }
    if (!taxonomie.has(pfad)) fehler.push(`${wo}: «${pfad}» steht nicht in Googles Taxonomie`);
    else if (!pfad.includes(' > ')) fehler.push(`${wo}: «${pfad}» ist nur die oberste Ebene (zu allgemein)`);
  };
  for (const [cid, b] of Object.entries(daten.blaetter || {})) {
    if (b.tabelle) pfadOk(b.pfad, `blaetter.${cid}`); else if (!taxonomie.has(b.pfad)) fehler.push(`blaetter.${cid}: «${b.pfad}» steht nicht in Googles Taxonomie`);
    for (const [p] of b.kand || []) if (!taxonomie.has(p)) fehler.push(`blaetter.${cid}.kand: «${p}» steht nicht in Googles Taxonomie`);
    if (b.tabelle && !(b.n >= (daten.meta?.schwellen?.rein_min_n ?? REIN_MIN_N) && b.anteil >= (daten.meta?.schwellen?.rein_min ?? REIN_MIN))) fehler.push(`blaetter.${cid}: als rein markiert, aber n=${b.n} / Anteil ${b.anteil} reicht nicht`);
    if (!b.tabelle && b.n >= REIN_MIN_N && b.anteil >= REIN_MIN) fehler.push(`blaetter.${cid}: rein (n=${b.n}, ${b.anteil}), aber nicht als Tabelle markiert`);
  }
  const ids = new Set();
  for (const r of daten.regeln || []) {
    pfadOk(r.pfad, `regeln.${r.id}`);
    if (ids.has(r.id)) fehler.push(`regeln.${r.id}: doppelte Kennung`); ids.add(r.id);
    if (!Array.isArray(r.titel_muss) || !r.titel_muss.length) fehler.push(`regeln.${r.id}: titel_muss fehlt`);
    if (r.bereich !== undefined && !['kern', 'titel'].includes(r.bereich)) fehler.push(`regeln.${r.id}: bereich muss 'kern' oder 'titel' sein`);
    for (const s of [...(r.titel_muss || []), ...(r.titel_nicht || [])]) { try { R(s); } catch (e) { fehler.push(`regeln.${r.id}: Regex «${s}» ungültig`); } }
  }
  const keys = new Set();
  for (const e of daten.lexikon || []) {
    pfadOk(e.pfad, `lexikon.${e.k}`);
    const bedingt = !!(e.muss?.length || e.nicht?.length);
    if (keys.has(e.k) && (!bedingt || (daten.lexikon || []).some(x => x !== e && x.k === e.k && !(x.muss?.length || x.nicht?.length)))) fehler.push(`lexikon.${e.k}: doppelter Schlüssel (mehrere Einträge sind nur mit Bedingung erlaubt)`); keys.add(e.k);
    if (!/^[\p{L}]{3,}$/u.test(e.k) || e.k !== klein(e.k)) fehler.push(`lexikon.${e.k}: Schlüssel muss ein kleingeschriebenes Wort aus Buchstaben sein`);
    const gelesen = e.quelle === 'gelesen';
    if (e.quelle !== undefined && !gelesen) fehler.push(`lexikon.${e.k}: unbekannte quelle «${e.quelle}»`);
    if (gelesen ? !(e.rein >= GELESEN_MIN_REIN && e.n >= GELESEN_MIN_N) : !(e.rein >= LEXIKON_REIN && e.n >= LEXIKON_MIN_N)) fehler.push(`lexikon.${e.k}: n=${e.n} / rein=${e.rein} unter der Schwelle`);
    for (const s of [...(e.muss || []), ...(e.nicht || [])]) { try { R(s); } catch (x) { fehler.push(`lexikon.${e.k}: Regex «${s}» ungültig`); } }
  }
  if (fehler.length) throw new Error(`grind_google_daten.json ungültig (${fehler.length} Funde):\n  ` + fehler.slice(0, 40).join('\n  '));
}

// ───────────────────────── Daten laden ─────────────────────────
/** GRIND_GOOGLE_DATEN: andere Datendatei (für das Werkzeug, das die Datei erst erzeugt, und für Tests). Vorgabe: die Datei neben diesem Modul. */
const DATEI = process.env.GRIND_GOOGLE_DATEN || new URL('./grind_google_daten.json', import.meta.url);
const EXTERN = process.env.GOOGLE_TAXONOMIE_DATEI || '/tmp/grind2/gtax.txt';

function ladeDaten(roh) {
  const d = roh;
  const eingebettet = new Set(d.taxonomie?.pfade || []);
  if (taxonomieHash(eingebettet) !== d.taxonomie?.sha256) throw new Error('grind_google_daten.json: die eingebettete Taxonomie passt nicht zu taxonomie.sha256 (Datei verändert?)');
  pruefeDaten(d, eingebettet);
  // Ist die Originaldatei erreichbar, gilt SIE (auch wenn jemand die eingebettete Liste mitgeändert hat).
  let extern = null;
  if (existsSync(EXTERN)) { extern = taxonomieAusText(readFileSync(EXTERN, 'utf8')); pruefeDaten(d, extern); }
  return { daten: d, taxonomie: extern || eingebettet, geprueftGegen: extern ? 'original' : 'eingebettet' };
}
const GELADEN = ladeDaten(JSON.parse(readFileSync(DATEI, 'utf8')));
export const DATEN = GELADEN.daten;
export const TAXONOMIE = GELADEN.taxonomie;
/** Woher die Taxonomie-Prüfung beim Laden kam: 'original' (gtax.txt erreichbar) oder 'eingebettet' (Kopie in der Datendatei, per Hash gesichert). */
export const TAXONOMIE_GEPRUEFT_GEGEN = GELADEN.geprueftGegen;
export const istGooglePfad = pfad => TAXONOMIE.has(pfad);

/** Index der Daten für die Auswertung (aus einer Datendatei gebaut; Tests übergeben eigene). */
export function indexiere(daten) {
  const lex = new Map();
  for (const e of daten.lexikon || []) { if (!lex.has(e.k)) lex.set(e.k, []); lex.get(e.k).push(e); }
  const nachName = new Map();
  for (const [cid, b] of Object.entries(daten.blaetter || {})) {
    const s = blattSchluessel(b.name);
    if (!s) continue;
    if (!nachName.has(s)) nachName.set(s, []);
    nachName.get(s).push(cid);
  }
  return { daten, lex, nachName };
}
export const INDEX = indexiere(DATEN);

// ───────────────────────── Auswertung ─────────────────────────
/**
 * Handgeschriebene Regeln: alle Treffer. `titel_muss` wird gegen die KERNPHRASE geprüft (die Ware), `titel_nicht` gegen den ganzen Titel.
 * Grund: «Smartwatch mit Taschenlampe» ist eine Uhr, «Webcam mit LED-Ringlicht» eine Webcam, «Reisetasche mit Laptopfach» eine Reisetasche. Regeln, deren
 * Gegenstand erst nach dem Trenner genannt wird («Hülle FÜR iPhone»), tragen `bereich: 'titel'` und prüfen `titel_muss` gegen den ganzen Titel.
 */
export function regelTreffer(titel, regeln) {
  const t = String(titel ?? '');
  const kern = kernPhrase(t);
  return (regeln || []).filter(r => {
    const basis = r.bereich === 'titel' ? t : kern;
    return r.titel_muss.some(s => R(s).test(basis)) && !(r.titel_nicht || []).some(s => R(s).test(t));
  });
}

/** Längster Lexikon-Treffer auf dem Kopfwort, sonst null. */
export function lexikonTreffer(titel, lex = INDEX.lex, strategien = STRATEGIEN) {
  const t = String(titel);
  for (const { wort: w, strategie } of kopfKandidaten(t, strategien)) {
    for (const k of endungen(w)) {
      for (const e of lex.get(k) || []) {
        if (e.muss?.length && !e.muss.some(s => R(s).test(t))) continue;   // Schutz: ohne den Hinweis im Titel gilt der Eintrag nicht («pullover» nur mit «Hund»)
        if (e.nicht?.some(s => R(s).test(t))) continue;                     // Schutz: «nägel» nicht bei Stahlnägeln
        return { ...e, kopfwort: w, schluessel: k, strategie };
      }
    }
  }
  return null;
}

/**
 * Was sagt der TITEL? Handregeln zuerst (sie sind für die gesuchten Warenarten geschrieben und messbar), dann das Lexikon.
 * @returns {null | {pfad:string, quelle:'regel'|'lexikon', regel?:string[], schluessel?:string, n?:number, rein?:number} | {konflikt:true, pfade:string[], regel:string[]}}
 */
export function titelUrteil(titel, index = INDEX, strategien = STRATEGIEN) {
  if (!String(titel ?? '').trim()) return null;
  const rt = regelTreffer(titel, index.daten.regeln);
  if (rt.length) {
    const pfad = einigePfade(rt.map(r => r.pfad));
    if (!pfad) return { konflikt: true, pfade: [...new Set(rt.map(r => r.pfad))], regel: rt.map(r => r.id) };
    return { pfad, quelle: 'regel', regel: rt.filter(r => liegtUnter(pfad, r.pfad)).map(r => r.id) };
  }
  const lt = lexikonTreffer(titel, index.lex, strategien);
  if (lt) return { pfad: lt.pfad, quelle: 'lexikon', schluessel: lt.schluessel, kopfwort: lt.kopfwort, strategie: lt.strategie, n: lt.n, rein: lt.rein };
  return null;
}

/** Was weiss die Tabelle über das Blatt? Zuerst die categoryId; ohne sie (oder unbekannt) der Name, wenn er genau ein Blatt trifft. */
export function blattUrteil(categoryId, categoryName, index = INDEX) {
  const id = categoryId == null ? '' : String(categoryId).trim();
  let cid = id && index.daten.blaetter?.[id] ? id : null;
  let ueber = 'id';
  if (!cid && categoryName) {
    const s = blattSchluessel(categoryName);
    const treffer = s ? index.nachName.get(s) || [] : [];
    if (treffer.length === 1 && !id) { cid = treffer[0]; ueber = 'name'; }   // Name nur, wenn gar keine id da ist: eine fremde id ist ein Befund, kein Anlass zu raten
  }
  if (!cid) return { bekannt: false, id: id || null };
  const b = index.daten.blaetter[cid];
  return { bekannt: true, id: cid, ueber, name: b.name, n: b.n, pfad: b.pfad, anteil: b.anteil, rein: !!b.tabelle, kand: b.kand };
}

const proz = x => `${Math.round(x * 100)} %`;

/** Gemessene Übereinstimmung des Titelurteils mit dem Shop: Lexikon → `rein`; Regeln → Anteil der Shop-Treffer mit passendem Pfad (nur ab 5 Treffern, sonst null = kein Beleg). */
function titelVertrauen(tu, index) {
  if (!tu || tu.konflikt) return null;
  if (tu.quelle === 'lexikon') return tu.rein;
  const quoten = (tu.regel || []).map(id => index.daten.regeln.find(r => r.id === id)?.beleg).filter(b => b && b.n >= 5).map(b => Math.round((b.gleich / b.n) * 1000) / 1000);
  return quoten.length ? Math.min(...quoten) : null;
}

/**
 * Die Google-Kategorie eines Kandidaten.
 * @param {{categoryId?:string|number, categoryName?:string, titel?:string}} k
 * @param {{index?:object, blattPruefung?:boolean}} [opt]  blattPruefung: bei einem BEKANNTEN, unreinen Blatt muss der Titelpfad zu einem
 *        der dort beobachteten Pfade passen (gleiche ersten zwei Ebenen), sonst 'unklar'.
 * @returns {{pfad:string|null, sicherheit:'tabelle'|'titel'|'unklar', vertrauen:number|null, grund:string, quelle:string|null, blatt:object|null, titel:object|null}}
 */
export function googlePfad(k, { index = INDEX, blattPruefung = true, strategien = STRATEGIEN } = {}) {
  const titel = typeof k?.titel === 'string' ? k.titel : '';
  const bl = blattUrteil(k?.categoryId, k?.categoryName, index);
  const tu = titelUrteil(titel, index, strategien);
  const blattInfo = bl.bekannt ? { id: bl.id, name: bl.name, n: bl.n, anteil: bl.anteil, rein: bl.rein, ueber: bl.ueber } : null;
  const aus = (pfad, sicherheit, vertrauen, grund, quelle) => ({ pfad, sicherheit, vertrauen, grund, quelle, blatt: blattInfo, titel: tu && !tu.konflikt ? tu : null });
  const unklar = grund => ({ pfad: null, sicherheit: 'unklar', vertrauen: null, grund, quelle: null, blatt: blattInfo, titel: tu });

  if (tu?.konflikt) return unklar(`Titelregeln widersprechen sich (${tu.pfade.join(' | ')}; Regeln ${tu.regel.join(', ')})`);

  if (bl.bekannt && bl.rein) {
    if (!tu) return aus(bl.pfad, 'tabelle', bl.anteil, `Blatt «${bl.name}» ist rein: ${proz(bl.anteil)} von ${bl.n} Shop-Produkten tragen diesen Pfad`, 'blatt');
    if (liegtUnter(tu.pfad, bl.pfad) || liegtUnter(bl.pfad, tu.pfad)) {
      return aus(bl.pfad, 'tabelle', bl.anteil, `Blatt «${bl.name}» ist rein (${proz(bl.anteil)} von ${bl.n}) und der Titel bestätigt es (${tu.quelle})`, 'blatt');
    }
    return unklar(`Titel (${tu.pfad}) widerspricht dem reinen Blatt «${bl.name}» (${bl.pfad}): vermutlich falsch eingeordnete Ware`);
  }
  if (!tu) {
    return unklar(bl.bekannt
      ? `Blatt «${bl.name}» ist unrein (häufigster Pfad nur ${proz(bl.anteil)} von ${bl.n}) und der Titel nennt keine bekannte Warenart`
      : 'Blatt unbekannt und der Titel nennt keine bekannte Warenart');
  }
  if (bl.bekannt && blattPruefung && !bl.kand.some(([p]) => familie(p) === familie(tu.pfad))) {
    return unklar(`Titel (${tu.pfad}) passt zu keinem der beobachteten Pfade des Blatts «${bl.name}» (${bl.kand.slice(0, 3).map(c => c[0]).join(' | ')} …)`);
  }
  const wie = tu.quelle === 'regel' ? `Regel ${tu.regel.join(', ')}` : `Kopfwort «${tu.kopfwort}» (Schlüssel «${tu.schluessel}», ${tu.n} Beispiele, ${proz(tu.rein)})`;
  return aus(tu.pfad, 'titel', titelVertrauen(tu, index), `${wie}; Blatt ${bl.bekannt ? `«${bl.name}» ist unrein` : 'unbekannt'}`, tu.quelle);
}

// ───────────────────────── Taxonomie-Tags ─────────────────────────
/**
 * Die `sort-…`-Tags, die die Taxonomie-Regeln einem Produkt geben würden. Rein: nutzt `gehoertIn` aus kategorien.mjs (Basis, verengte und Mode-Kategorien).
 * `produkt.g` ist der Google-Pfad (z. B. aus googlePfad). Sperr-Tags am Produkt schliessen jede Kategorie aus (wie im Shop).
 * Weitere Kategorien (z. B. die Bereichsdateien der Rest-Taxonomie) übergibt man als `kategorien`: Objekte mit `tag` und `passt(produkt)`.
 * @returns {string[]} sortiert, ohne Doppelte
 */
let ohneHandle = 0;
export function taxTags(produkt, { kategorien = KATEGORIEN } = {}) {
  // Die Mode-Regeln merken sich das Geschlecht je HANDLE (mode_taxonomie.mjs, Zwischenspeicher): ohne Handle würden alle Produkte denselben Eintrag teilen und
  // das Ergebnis hinge von der Reihenfolge der Aufrufe ab. Darum bekommt ein Produkt ohne Handle ein einmaliges. Wer ein Handle übergibt, übergibt ein STABILES (gleiches Handle = gleicher Titel).
  const p = {
    title: produkt?.title ?? produkt?.titel ?? '', tags: produkt?.tags || [], g: produkt?.g ?? produkt?.pfad ?? '',
    productType: produkt?.productType ?? '', handle: produkt?.handle || `__grind_google_${++ohneHandle}`,
  };
  const tags = new Set();
  for (const kat of kategorien) if (kat.tag && gehoertIn(kat, p)) tags.add(kat.tag);
  return [...tags].sort();
}

/**
 * Bereichsdatei (dropship/taxonomie-2610-b/bereiche/*.json) → Kategorie-Objekte für taxTags. Die Auswertung wird übergeben
 * (`passt`/`imUnterfilter` aus kern.mjs), damit diese Datei nicht von einem noch entstehenden Ordner abhängt.
 */
export function bereichKategorien(bereich, { passt, imUnterfilter, normiere = x => x }) {
  const aus = [];
  for (const k of bereich.kategorien || []) {
    aus.push({ id: k.handle, handle: k.handle, titel: k.titel, tag: `sort-${k.handle}`, passt: p => passt(k, normiere(p)) });
    for (const u of k.unterfilter || []) aus.push({ id: u.handle, handle: u.handle, titel: u.titel, tag: `sort-${u.handle}`, passt: p => passt(k, normiere(p)) && imUnterfilter(u, normiere(p)) });
  }
  return aus;
}

/**
 * Alles für einen Kandidaten in einem Aufruf: Pfad, Sicherheit, die Tags der Taxonomie. `anlegen` ist die Mindestbedingung des Besitzers
 * («in die passende Kategorie»): ein Pfad UND mindestens ein sort-Tag. Der Orchestrator darf strenger sein, nie lockerer.
 */
export function kategorieFuer(k, opt = {}) {
  const g = googlePfad(k, opt);
  const tags = g.pfad ? taxTags({ title: k?.titel, g: g.pfad, tags: k?.tags, productType: k?.productType, handle: k?.handle }, opt) : [];
  return { ...g, tags, anlegen: g.sicherheit !== 'unklar' && tags.length > 0 };
}
