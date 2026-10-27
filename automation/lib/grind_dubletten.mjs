/**
 * Dublettenindex für den CJ-Import «Grind 2.0»: darf ein CJ-Kandidat neu angelegt werden, oder ist es dieselbe Ware, die der Shop
 * (aktiv, Entwurf, archiviert) oder ein altes Ledger schon kennt? Rein und ohne Netz; getestet in grind_dubletten_test.mjs.
 * Futter: automation/grind_skus_lesen.mjs (Bulk-Abfrage aller Produkte mit allen Varianten-SKUs, nur lesen).
 *
 * WARUM (gemessen 27.10.2026, Stand skus.jsonl): der Shop hat 87 765 Produkte (56 620 aktiv, 30 984 Entwürfe, 161 archiviert), 598 996 Varianten.
 * Die alten Importwerkzeuge prüften höchstens ein eigenes pid-Ledger. cj_autopilot suchte `sku:<productSku>` ohne Platzhalter und fand nie etwas
 * (Präfixsuche ohne `*` liefert 0, import_audit.md M12). Im Shop liegen DIESELBEN CJ-Produkte schon doppelt: gleiche productSku, andere Titel,
 * einmal als `CJ-CJYD…01AZ`, einmal als blankes `CJYD…01AZ` (5 Paare allein unter den 2 235 bekannten Datenblättern).
 *
 * SCHLÜSSEL (harte Treffer: «nicht anlegen»):
 *   pid        CJ-pid als TEXT: 19 Ziffern (nie als Zahl: über 2^53 verliert Number Stellen) oder UUID. Im Shop steht sie nur als SKU `CJ-<pid>` / `CJ-<UUID>`
 *              (35 392 von 87 765 Produkten). Hat der Auswahl-Lauf die SKU durch echte variantSkus ersetzt, ist die pid dort WEG — dann trägt der nächste Schlüssel.
 *   variantSku exakt, normalisiert (GROSS, `CJ-` vor `CJ…` ab: `CJ-CJYD…` und `CJYD…` sind dieselbe SKU)
 *   productSku als Präfix der Shop-SKUs mit erlaubtem Rest: leer | `-Zusatz` | `01AZ`/`100AZ` (Ziffern + 2 Buchstaben) | `0001` (4 Ziffern).
 *              Gemessen an den 2 235 Produkten, deren CJ-Datenblatt im Zwischenspeicher liegt: alle 2 235 werden erkannt, 641 nur über die pid, 1 592 über
 *              productSku/variantSku (nie beides: ein Produkt trägt entweder die pid-SKU oder echte variantSkus). Die beiden Schlüssel ergänzen sich also.
 *   handle     geplanter Handle gegen alle Shop-Handles (ein Upsert mit gleichem Handle würde das Produkt ÜBERSCHREIBEN)
 *   Ledger     pids der alten Importe (cj_niche_done, cj_gaps_done, grind2_ledger) und Handles (cj_varianten_ledger u. a.). cj_top_ledger ist KEIN Import-Ledger, sondern ein
 *              Prüf-Ledger («lieferbar-ch», «keine-ch-fracht»): ein geprüftes Produkt ist keine Dublette, darum nicht in der Vorgabeliste (ledgerPidsAusText liest das Format trotzdem).
 * WARNUNGEN (nie allein ein «Nein»): Titelkern gleich / Jaccard ≥ 0,6 — fängt gleiche Ware unter anderem Wortlaut, NICHT gleiche Ware mit
 * völlig anderem Titel (24 aktive Produktpaare mit gleicher CJ-SKU: 20 haben Jaccard < 0,3, 3 zwischen 0,3 und 0,6, nur 1 ab 0,6; die fängt der SKU-Schlüssel). Auf dem ENGLISCHEN CJ-Titel ist der Titelkern
 * fast stumm — er gehört auf den deutschen Titel nach Stufe S3.
 * NICHT gebaut (nur dokumentiert): gleiches Hauptbild. Wäre der einzige Schlüssel gegen «gleiche Ware, anderer Titel UND andere SKU» (anderer Lieferant), kostet aber
 * einen Bild-Download je Shop-Produkt (87 765) und je Kandidat. Eine Byte-Prüfsumme taugt nicht (die Shopify-CDN kodiert neu); gebraucht wird ein Wahrnehmungs-Hash wie
 * `bildSig`/`gleichesBild` (curl + ffmpeg, cj_varianten_nachziehen.mjs, maxDh 3 / maxFarbe 8 nicht lockern). Die Bild-URL der Shop-Produkte käme billig aus der
 * Bulk-Abfrage (`featuredMedia`); der Aufwand (≈ 1–2 s je Bild, SCHÄTZUNG, ≈ 6 h mit 6 Arbeitern) ist der Grund, es erst nach einem Pilot zu entscheiden.
 */
import { existsSync, readFileSync } from 'node:fs';

export const PID_MIN = 15, PID_MAX = 20;       // «15-stellige Form»: strategien() in fakten_block.mjs nimmt \d{15,}; im Shop sind es immer 19
export const MIN_KERN = 3;                      // Titelkerne unter 3 Wörtern sagen zu wenig (Jaccard 1,0 aus zwei Wörtern ist Zufall)
export const SCHWELLE = 0.6;                    // wie in der Lückenanalyse (Titelkern, Jaccard ≥ 0,6; SETZUNG, dort BEHAUPTUNG)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ───────────────────────── Schlüssel normalisieren ─────────────────────────

/** pid → kanonischer TEXT oder null. Ziffern ohne führende Nullen (15–20 Stellen) | UUID in Grossbuchstaben. Zahlen nur, wenn exakt darstellbar. */
export function pidNorm(x) {
  if (x === null || x === undefined) return null;
  if (typeof x === 'number') return Number.isSafeInteger(x) && String(x).length >= PID_MIN ? String(x) : null;   // eine grosse Zahl hat schon Stellen verloren
  if (typeof x === 'bigint') x = x.toString();
  if (typeof x !== 'string') return null;
  let s = x.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/^['"`]+|['"`]+$/g, '');   // Tabellenkalkulation setzt gern ein Apostroph davor
  s = s.replace(/^(?:cj\s*:|pid\s*:|cj-)\s*/i, '');
  if (UUID_RE.test(s)) return s.toUpperCase();
  if (!/^\d+$/.test(s)) return null;                 // «2.6052E+18» (Tabellenkalkulation) ist unrettbar
  s = s.replace(/^0+/, '');
  return s.length >= PID_MIN && s.length <= PID_MAX ? s : null;
}

/** SKU → Vergleichsform: GROSS, Leerraum vereinheitlicht, `CJ-` nur vor `CJ…` entfernt (`CJ-<pid>` bleibt). Leer bei Unbrauchbarem. */
export function skuNorm(x) {
  if (x === null || x === undefined) return '';
  let s = String(x).normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  return s.replace(/^CJ-(?=CJ)/, '');
}

/** pid aus einer Shop-SKU: genau `CJ-<19 Ziffern>`, `<19 Ziffern>`, `CJ-<UUID>` oder `<UUID>`. Eingebettete Ziffernfolgen zählen NICHT (im Shop 0 solche). */
export function pidAusSku(sku) {
  const s = skuNorm(sku);
  const m = s.match(/^(?:CJ-)?(\d{15,20})$/);
  if (m) return pidNorm(m[1]);
  const u = s.match(/^(?:CJ-)?([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})$/);
  return u ? u[1] : null;
}

/**
 * Rest einer Varianten-SKU hinter der productSku: noch dieselbe Ware? Gemessen an den Shop-SKUs der 2 235 bekannten Produkte:
 * `-Zusatz` 2 498 · zwei Ziffern + zwei Buchstaben (`CJYD2926337` + `01AZ`) 11 745 · drei Ziffern + zwei Buchstaben ab Index 100 (`…100VE`, `…187EV`) 36 ·
 * leer 2. Vier Ziffern (`CJZJ2571866` + `0002`) steht in 640 Shop-SKUs; die Zugehörigkeit zur productSku ist am 27.10. an EINEM Beispiel bei CJ belegt (product/query?variantSku=CJZJ25718660002 → productSku CJZJ2571866).
 * Dreistellige Indizes nur mit 1 oder 2 vorn: sonst wäre eine um eine Ziffer kürzere FREMDE productSku (`CJYD292633` vor `CJYD292633701AZ`) ein Treffer.
 * voll=false (productSku in einer unbekannten Form, siehe FORM_BEKANNT): nur «leer» und «-Zusatz» — die Ziffernreste wären dort nicht sicher von einer
 * längeren fremden productSku zu unterscheiden.
 */
export function restOk(rest, voll = true) {
  if (rest === '' || rest[0] === '-') return true;
  return voll && (/^\d{2}[A-Z]{2}$/.test(rest) || /^[12]\d{2}[A-Z]{2}$/.test(rest) || /^\d{4}$/.test(rest));
}
/**
 * Die zwei Formen echter CJ-productSkus: `CJ` + 2 Buchstaben + 7 Ziffern (CJYD2926337, 1 645 der 2 235 Datenblätter, 893 Kopf-SKUs im Shop) und `CJ` + 6 Buchstaben
 * + 5 Ziffern (CJJJCWGY00594, 590 / 22 681). Keine productSku ist Präfix einer anderen (0 von 2 235). Nur bei diesen Formen gelten die Ziffernreste.
 */
export const FORM_BEKANNT = /^CJ(?:[A-Z]{2}\d{7}|[A-Z]{6}\d{5})$/;

/** Taugt eine productSku für die Präfixsuche? (Form `CJ` + Buchstaben/Ziffern, mindestens 8 Zeichen; keine pid, keine UUID.) */
export function produktSkuOk(ps) {
  return /^CJ[A-Z0-9]{6,}$/.test(ps) && !/^CJ\d{15,}$/.test(ps);
}

// ───────────────────────── Titelkern ─────────────────────────

const falte = s => String(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').toLowerCase();
/** Grobe Endungskappung (Kleider/Kleid, Armbänder/Armband, Smartwatches/Smartwatch). Nur für den Vergleich, nie zur Anzeige. */
function stamm(w) {
  if (w.length < 6) return w;
  const k = /(?:en|er|es|em)$/.test(w) ? w.slice(0, -2) : /[ens]$/.test(w) ? w.slice(0, -1) : w;
  return k.length >= 4 ? k : w;
}
const FUELL = ('fur mit und aus der die das den dem des ein eine einer eines zum zur von im in an auf bei als oder ohne nach uber unter pro ' +
  'set stuck stk teile teilig pcs pc piece pieces paar neu neue neues neuer new premium hochwertig hochwertige hochwertiges professionell professionelle ' +
  'universal universelle modern moderne stilvoll stilvolle elegant elegante praktisch praktische bequem bequeme klassisch klassische einfach einfache ' +
  'for with and the from your new hot sale ' +
  // Farben (DE/EN) — eine Farbvariante ist dieselbe Ware
  'schwarz weiss rot blau grun gelb rosa lila grau braun beige gold silber orange turkis bunt khaki marine navy creme dunkel hell farbe farben farbig mehrfarbig transparent rosegold ' +
  'black white red blue green yellow pink purple gray grey brown silver cyan ' +
  // Masse und Einheiten ohne Ziffern
  'cm mm ml kg gr zoll inch pack paket mah watt volt lumen liter meter gramm').split(' ');
const STOP = new Set(); for (const w of FUELL) { STOP.add(w); STOP.add(stamm(w)); }

/** Titel → Titelkern: sortierte, eindeutige Wörter. Klein, Umlaute/Akzente gefaltet, ohne Zahlen/Masse/Farben/Füllwörter, Wörter ≥ 3 Zeichen. */
export function titelKern(titel) {
  const out = new Set();
  for (const roh of falte(titel).replace(/[^a-z]+/g, ' ').split(' ')) {
    if (roh.length < 3 || STOP.has(roh)) continue;
    const w = stamm(roh);
    if (w.length >= 3 && !STOP.has(w)) out.add(w);
  }
  return [...out].sort();
}
/** Jaccard-Mass zweier sortierter Wortlisten. */
export function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const sb = new Set(b); let c = 0; for (const w of a) if (sb.has(w)) c++;
  return c / (a.length + b.length - c);
}

// ───────────────────────── Ledger lesen ─────────────────────────

const HANDLE_RE = /^[a-z0-9][a-z0-9-]*$/;
const NICHT_ANGELEGT = new Set(['UEBERSPRUNGEN', 'FEHLER', 'ZURUECK']);   // Grind-Ledger: diese Ausgänge legen nichts an; über sie entscheidet ledgerGedaechtnis()
const felder = z => z.split(' · ').map(f => f.trim());
const zeilenAus = text => String(text ?? '').split('\n').map(z => z.trim()).filter(z => z && !z.startsWith('#'));

/**
 * Ledger-Text → pids. Erkennt `cj:<pid>` (cj_niche_done), `pid:<pid>` (cj_gaps_done) und `<pid> · … · <Ausgang> · …` (grind2_ledger; auch cj_top_ledger hat dieses Format).
 * Zeilen mit Ausgang UEBERSPRUNGEN/FEHLER/ZURUECK zählen nicht (nichts angelegt; die Wiederholfrist regelt ledgerGedaechtnis).
 * Zeilen, die mit einem Handle statt einer pid beginnen (cj_varianten_ledger), gehören zu ledgerHandlesAusText.
 */
export function ledgerPidsAusText(text, quelle = '') {
  const out = []; let ungueltig = 0;
  for (const z of zeilenAus(text)) {
    const f = felder(z);
    const m = f[0].match(/^(?:cj|pid)\s*:\s*(.+)$/i);
    const pid = pidNorm(m ? m[1] : f[0]);
    if (!pid) { if (!HANDLE_RE.test(f[0])) ungueltig++; continue; }
    if (NICHT_ANGELEGT.has((f[2] || '').toUpperCase())) continue;
    out.push({ pid, quelle, detail: f.slice(1).join(' · ') });
  }
  out.ungueltig = ungueltig;
  return out;
}

/**
 * Ledger-Text → Handles. `<handle> · <ISO> · <Ausgang> · …` (cj_varianten_ledger, cj_variantenbilder_ledger, cj_sourcing_ledger, grind2_freigabe_ledger)
 * und die grind2-Zeile `<pid> · <ISO> · GESCHRIEBEN · <n> Varianten · <handle> · <gid>` (Handle = 5. Feld).
 */
export function ledgerHandlesAusText(text, quelle = '') {
  const out = [];
  for (const z of zeilenAus(text)) {
    const f = felder(z);
    if (pidNorm(f[0]) || /^(?:cj|pid)\s*:/i.test(f[0])) {
      if ((f[2] || '').toUpperCase() === 'GESCHRIEBEN' && HANDLE_RE.test(f[4] || '')) out.push({ handle: f[4], quelle, detail: f.slice(1).join(' · ') });
    } else if (HANDLE_RE.test(f[0])) out.push({ handle: f[0], quelle, detail: f.slice(1).join(' · ') });
  }
  return out;
}

// ───────────────────────── Bulk-Ausgabe lesen ─────────────────────────

/** Sammler für die Bulk-Ausgabe (JSONL): Produktzeilen und Variantenzeilen mit __parentId, Zeile für Zeile, ohne den ganzen Text im Speicher. */
export function bulkSammler() {
  const produkte = new Map();
  const waisen = new Map();
  const stat = { zeilen: 0, kaputt: 0, produkte: 0, varianten: 0, variantenOhneSku: 0, waisen: 0 };
  return {
    add(zeile) {
      const z = String(zeile ?? '').trim();
      if (!z) return;
      stat.zeilen++;
      let o;
      try { o = JSON.parse(z); } catch { stat.kaputt++; return; }
      if (o && o.__parentId) {
        stat.varianten++;
        const sku = String(o.sku ?? '').trim();
        if (!sku) { stat.variantenOhneSku++; return; }
        const p = produkte.get(o.__parentId);
        if (p) p.skus.push(sku);
        else { if (!waisen.has(o.__parentId)) waisen.set(o.__parentId, []); waisen.get(o.__parentId).push(sku); }
      } else if (o && o.id && o.handle !== undefined) {
        stat.produkte++;
        const alt = waisen.get(o.id);
        produkte.set(o.id, { id: o.id, handle: String(o.handle), title: String(o.title ?? ''), status: String(o.status ?? ''), skus: alt ? alt.splice(0) : [] });
        waisen.delete(o.id);
      }
    },
    ergebnis() {
      stat.waisen = [...waisen.values()].reduce((s, a) => s + a.length, 0);
      return { produkte: [...produkte.values()], stat: { ...stat } };
    },
  };
}
/** skus.jsonl (eine Zeile je Produkt, so schreibt es grind_skus_lesen.mjs) → Produktliste. Kaputte Zeilen werden gezählt, nicht verschluckt. */
export function produkteAusJsonl(text) {
  const produkte = []; let kaputt = 0;
  for (const z of String(text ?? '').split('\n')) {
    if (!z.trim()) continue;
    try { const p = JSON.parse(z); if (p && typeof p === 'object') produkte.push(p); else kaputt++; } catch { kaputt++; }
  }
  produkte.kaputt = kaputt;
  return produkte;
}

// ───────────────────────── Index ─────────────────────────

const kurz = p => ({ id: p.id ?? null, handle: p.handle ?? '', title: p.title ?? '', status: p.status ?? '' });
const push = (m, k, v) => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]); };
const untere = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; };

function eintragen(ix, p) {
  const idx = ix.produkte.length;
  ix.produkte.push(kurz(p));
  const skus = Array.isArray(p.skus) ? p.skus : (p.sku ? [p.sku] : []);
  for (const roh of skus) {
    const s = skuNorm(roh); if (!s) { ix.stat.skusLeer++; continue; }
    ix.stat.skus++;
    const alt = ix.skus.get(s);
    if (!alt) { ix.skus.set(s, [idx]); ix.neueSkus.push(s); } else if (alt[alt.length - 1] !== idx) alt.push(idx);
    const pid = pidAusSku(s); if (pid) push(ix.pids, pid, idx);
  }
  const pidEx = pidNorm(p.pid); if (pidEx) push(ix.pids, pidEx, idx);          // geplantes Produkt (fuegeHinzu) mit bekannter pid
  const psEx = skuNorm(p.productSku);
  if (psEx) { const alt = ix.skus.get(psEx); if (!alt) { ix.skus.set(psEx, [idx]); ix.neueSkus.push(psEx); } else alt.push(idx); }
  if (p.handle) { const h = String(p.handle).toLowerCase(); if (!ix.handles.has(h)) ix.handles.set(h, idx); }
  const kern = titelKern(p.title);
  ix.kerne[idx] = kern;
  if (kern.length >= MIN_KERN) {
    push(ix.kernGleich, kern.join(' '), idx);
    for (const w of kern) push(ix.woerter, w, idx);
  } else ix.stat.kernZuKurz++;
  return idx;
}

/**
 * Index bauen. produkte: [{id, handle, title, status, skus:[…]}] (alle Status!), ledgerPids: [pid | {pid, quelle, detail}], ledgerHandles: [handle | {handle, quelle, detail}].
 * Gibt einen Index zurück, den istDublette() liest. Unbrauchbare Ledger-Einträge werden gezählt (stat.ledgerUngueltig), nicht still verworfen.
 */
export function baueIndex({ produkte = [], ledgerPids = [], ledgerHandles = [] } = {}, opt = {}) {
  const ix = {
    version: 1, stand: opt.stand || null,
    produkte: [], skus: new Map(), pids: new Map(), handles: new Map(), kerne: [], kernGleich: new Map(), woerter: new Map(),
    ledgerPids: new Map(), ledgerHandles: new Map(), skuListe: [], neueSkus: [],
    stat: { skus: 0, skusLeer: 0, kernZuKurz: 0, ledgerUngueltig: 0, nachStatus: {} },
  };
  for (const p of produkte) { eintragen(ix, p); const st = String(p.status || '(ohne)'); ix.stat.nachStatus[st] = (ix.stat.nachStatus[st] || 0) + 1; }
  ix.skuListe = ix.neueSkus.sort(); ix.neueSkus = [];
  for (const e of ledgerPids) {
    const o = typeof e === 'object' && e !== null ? e : { pid: e };
    const pid = pidNorm(o.pid);
    if (!pid) { ix.stat.ledgerUngueltig++; continue; }
    if (!ix.ledgerPids.has(pid)) ix.ledgerPids.set(pid, { quelle: o.quelle || '', detail: o.detail || '' });
  }
  for (const e of ledgerHandles) {
    const o = typeof e === 'object' && e !== null ? e : { handle: e };
    const h = String(o.handle ?? '').trim().toLowerCase();
    if (!HANDLE_RE.test(h)) { ix.stat.ledgerUngueltig++; continue; }
    if (!ix.ledgerHandles.has(h)) ix.ledgerHandles.set(h, { quelle: o.quelle || '', detail: o.detail || '' });
  }
  return ix;
}

/** Ein Produkt nachträglich aufnehmen (der Lauf hat es gerade angelegt oder geplant — sonst sind zwei Kandidaten desselben Laufs füreinander unsichtbar). */
export function fuegeHinzu(ix, p) {
  eintragen(ix, p);
  if (ix.neueSkus.length) {
    for (const s of ix.neueSkus.sort()) ix.skuListe.splice(untere(ix.skuListe, s), 0, s);
    ix.neueSkus = [];
  }
  const st = String(p.status || '(ohne)'); ix.stat.nachStatus[st] = (ix.stat.nachStatus[st] || 0) + 1;
  return ix;
}

/** Kennzahlen des Index (für Berichte). */
export function indexKennzahlen(ix) {
  let pidZahl = 0, pidUuid = 0; for (const k of ix.pids.keys()) { if (k.includes('-')) pidUuid++; else pidZahl++; }
  return { produkte: ix.produkte.length, nachStatus: { ...ix.stat.nachStatus }, skus: ix.stat.skus, skusEindeutig: ix.skus.size, skusLeer: ix.stat.skusLeer,
    shopPids: ix.pids.size, shopPidsZiffern: pidZahl, shopPidsUuid: pidUuid, handles: ix.handles.size, titelkerneGleich: ix.kernGleich.size, kernZuKurz: ix.stat.kernZuKurz,
    ledgerPids: ix.ledgerPids.size, ledgerHandles: ix.ledgerHandles.size, ledgerUngueltig: ix.stat.ledgerUngueltig, stand: ix.stand };
}

/** Ist der Index frisch genug? (Wer auf einem Tage alten Index prüft, übersieht alles, was inzwischen angelegt wurde.) */
export function istFrisch(ix, maxStunden = 24, jetzt = Date.now()) {
  const t = Date.parse(ix?.stand || ''); if (!Number.isFinite(t)) return false;     // unbekannter Stand = nicht frisch
  return jetzt - t <= maxStunden * 3600 * 1000 && jetzt >= t;
}

// ───────────────────────── Prüfen ─────────────────────────

/** Rohes CJ-Produkt (product/list v1 oder v2, product/query) oder eigenes Objekt → einheitlicher Kandidat. */
export function kandidatAus(raw) {
  const r = raw || {};
  const vs = [...(Array.isArray(r.variantSkus) ? r.variantSkus : []), ...(Array.isArray(r.variants) ? r.variants.map(v => v?.variantSku ?? v?.sku) : [])];
  return {
    pid: pidNorm(r.pid ?? r.id ?? r.productId),
    productSku: skuNorm(r.productSku ?? r.sku),
    variantSkus: [...new Set(vs.map(skuNorm).filter(Boolean))],
    titel: String(r.titel ?? r.title ?? r.productNameEn ?? r.nameEn ?? ''),
    handle: String(r.handle ?? '').trim().toLowerCase(),
  };
}

/** Ähnlichste Shop-Produkte nach Titelkern (Jaccard ≥ schwelle). Beide Seiten brauchen ≥ MIN_KERN Wörter. */
export function naheTitel(ix, kern, { schwelle = SCHWELLE, ohne = -1, max = 5 } = {}) {
  if (kern.length < MIN_KERN) return [];
  const zaehl = new Map();
  for (const w of kern) for (const i of ix.woerter.get(w) || []) if (i !== ohne) zaehl.set(i, (zaehl.get(i) || 0) + 1);
  const gut = [];
  for (const [i, c] of zaehl) { const j = c / (kern.length + ix.kerne[i].length - c); if (j >= schwelle) gut.push({ idx: i, jaccard: Math.round(j * 1000) / 1000 }); }
  const rang = s => (s === 'ACTIVE' ? 0 : s === 'DRAFT' ? 1 : 2);
  gut.sort((a, b) => b.jaccard - a.jaccard || rang(ix.produkte[a.idx].status) - rang(ix.produkte[b.idx].status) || a.idx - b.idx);
  return gut.slice(0, max).map(g => ({ ...g, n: gut.length }));
}

const einzigartig = a => [...new Set(a)];
const TOP = 5;

/**
 * Ist der Kandidat eine Dublette? kandidat: {pid, productSku, variantSkus[], titel, handle} oder ein rohes CJ-Objekt.
 * → { dublette, warnung, grund, treffer[], geprueft[], fehlt[], hinweise[], unbekannt }
 *   dublette  true bei mindestens einem HARTEN Treffer (pid, variantSku, productSku, handle, Ledger). Titelkern allein macht nie eine Dublette.
 *   warnung   true bei Titelkern-Treffern (gleicher Kern / Jaccard ≥ Schwelle) — mit Trefferliste.
 *   unbekannt true, wenn KEIN harter Schlüssel prüfbar war (Kandidat ohne pid, productSku, variantSkus, handle): dann bedeutet «keine Dublette» nichts.
 *   fehlt     welche Schlüssel nicht geprüft werden konnten (z. B. productSku fehlt → nachgezogene Produkte, deren pid-SKU ersetzt wurde, bleiben unsichtbar).
 * opt: { ledgerGilt = true (false: Ledger-Treffer nur als Warnung), schwelle, max }
 */
export function istDublette(kandidat, ix, opt = {}) {
  const k = kandidatAus(kandidat);
  const ledgerGilt = opt.ledgerGilt !== false;
  const treffer = [], geprueft = [], fehlt = [], hinweise = [];
  const hart = (art, schluessel, idxs, extra = {}) => { const u = einzigartig(idxs); if (u.length) treffer.push({ art, staerke: 'hart', quelle: 'shop', schluessel, n: u.length, produkte: u.slice(0, TOP).map(i => ix.produkte[i]), ...extra }); };

  // 1. pid (Shop-SKU `CJ-<pid>` / UUID) und Ledger
  if (k.pid) {
    geprueft.push('pid');
    hart('pid', k.pid, ix.pids.get(k.pid) || []);
    const l = ix.ledgerPids.get(k.pid);
    if (l) treffer.push({ art: 'ledger-pid', staerke: ledgerGilt ? 'hart' : 'warnung', quelle: l.quelle, schluessel: k.pid, detail: l.detail });
  } else fehlt.push('pid');

  // 2. alle Varianten-SKUs exakt
  if (k.variantSkus.length) {
    geprueft.push('variantSku');
    const idxs = []; let treffN = 0, erste = '';
    for (const s of k.variantSkus) { const a = ix.skus.get(s); if (a) { treffN++; if (!erste) erste = s; idxs.push(...a); } }
    hart('variantSku', erste, idxs, { getroffen: treffN, von: k.variantSkus.length });
  } else fehlt.push('variantSku');

  // 3. productSku als Präfix mit erlaubtem Rest (findet auch Produkte, deren pid-SKU der Auswahl-Lauf durch variantSkus ersetzt hat)
  if (k.productSku && produktSkuOk(k.productSku)) {
    geprueft.push('productSku');
    const a = ix.skuListe, ps = k.productSku, voll = FORM_BEKANNT.test(ps), idxs = []; let erste = '', zahl = 0;
    if (!voll) hinweise.push(`productSku ${ps}: Form unbekannt — nur exakter Treffer und «-Zusatz» geprüft`);
    for (let i = untere(a, ps); i < a.length && a[i].startsWith(ps); i++) {
      if (!restOk(a[i].slice(ps.length), voll)) continue;
      if (!erste) erste = a[i]; zahl++; idxs.push(...ix.skus.get(a[i]));
    }
    hart('productSku', ps, idxs, { getroffen: zahl, beispielSku: erste });
  } else fehlt.push(k.productSku ? 'productSku (Form unbrauchbar)' : 'productSku');

  // 4. Handle
  if (k.handle) {
    geprueft.push('handle');
    const i = ix.handles.get(k.handle); if (i !== undefined) hart('handle', k.handle, [i]);
    const l = ix.ledgerHandles.get(k.handle);
    if (l) treffer.push({ art: 'ledger-handle', staerke: ledgerGilt ? 'hart' : 'warnung', quelle: l.quelle, schluessel: k.handle, detail: l.detail });
  }

  // 5. Titelkern (nur Warnung)
  const kern = titelKern(k.titel);
  if (kern.length >= MIN_KERN) {
    geprueft.push('titel');
    const gleich = ix.kernGleich.get(kern.join(' ')) || [];
    if (gleich.length) treffer.push({ art: 'titelkern-gleich', staerke: 'warnung', quelle: 'shop', schluessel: kern.join(' '), n: gleich.length, jaccard: 1, produkte: gleich.slice(0, TOP).map(i => ix.produkte[i]) });
    const nah = naheTitel(ix, kern, { schwelle: opt.schwelle ?? SCHWELLE, max: Infinity }).filter(g => g.jaccard < 1);   // kern-gleiche (1,0) stehen schon oben
    if (nah.length) treffer.push({ art: 'titel-aehnlich', staerke: 'warnung', quelle: 'shop', schluessel: kern.join(' '), n: nah.length, jaccard: nah[0].jaccard, produkte: nah.slice(0, opt.max ?? TOP).map(g => ({ ...ix.produkte[g.idx], jaccard: g.jaccard })) });
  } else if (k.titel) fehlt.push('titel (Kern unter ' + MIN_KERN + ' Wörtern)');

  const ordnung = ['pid', 'variantSku', 'productSku', 'handle', 'ledger-pid', 'ledger-handle', 'titelkern-gleich', 'titel-aehnlich'];
  treffer.sort((a, b) => (a.staerke === 'hart' ? 0 : 1) - (b.staerke === 'hart' ? 0 : 1) || ordnung.indexOf(a.art) - ordnung.indexOf(b.art));
  const harte = treffer.filter(t => t.staerke === 'hart'), weiche = treffer.filter(t => t.staerke === 'warnung');
  const hartGeprueft = geprueft.filter(g => g !== 'titel');
  return {
    dublette: harte.length > 0, warnung: weiche.length > 0,
    grund: grundText(harte, weiche, hartGeprueft, geprueft),
    treffer, geprueft, fehlt, hinweise, unbekannt: hartGeprueft.length === 0,
  };
}

function beschreibe(t) {
  const p = t.produkte?.[0];
  const wo = p ? `Shop-Produkt ${p.handle} (${p.status || 'Status unbekannt'}${t.n > 1 ? `, +${t.n - 1} weitere` : ''})` : '';
  switch (t.art) {
    case 'pid': return `pid ${t.schluessel} steht als SKU im ${wo}`;
    case 'variantSku': return `${t.getroffen} von ${t.von} Varianten-SKUs (z. B. ${t.schluessel}) stehen im ${wo}`;
    case 'productSku': return `productSku ${t.schluessel} ist Präfix von ${t.getroffen} SKUs im ${wo}`;
    case 'handle': return `Handle ${t.schluessel} gehört schon dem ${wo}`;
    case 'ledger-pid': return `pid ${t.schluessel} steht im Ledger ${t.quelle}${t.detail ? ` (${t.detail.slice(0, 60)})` : ''}`;
    case 'ledger-handle': return `Handle ${t.schluessel} steht im Ledger ${t.quelle}`;
    case 'titelkern-gleich': return `gleicher Titelkern wie ${t.n} Shop-Produkt(e), z. B. ${wo}`;
    default: return `ähnlicher Titel (Jaccard ${t.jaccard}) wie ${wo}`;
  }
}
function grundText(harte, weiche, hartGeprueft, geprueft) {
  if (harte.length) return `Dublette: ${beschreibe(harte[0])}${harte.length > 1 ? ` (+${harte.length - 1} weitere harte Treffer)` : ''}`;
  if (weiche.length) return `keine Dublette, aber Warnung: ${beschreibe(weiche[0])}${weiche.length > 1 ? ` (+${weiche.length - 1})` : ''}`;
  if (!hartGeprueft.length) return `nicht prüfbar: kein harter Schlüssel (pid, productSku, variantSku, handle) vorhanden${geprueft.length ? '' : ', auch kein brauchbarer Titel'}`;
  return `kein Treffer (geprüft: ${geprueft.join(', ')})`;
}

// ───────────────────────── Dateien laden ─────────────────────────

const DROPSHIP = new URL('../../dropship/', import.meta.url);
/** Vorgabe-Ledger (Pfad relativ zu dropship/). Fehlende Dateien werden im Bericht genannt, nicht still übergangen. */
export const LEDGER_PIDS = [['cj_niche_done.txt', 'niche'], ['cj_gaps_done.txt', 'gaps'], ['grind2_ledger.txt', 'grind2']];
export const LEDGER_HANDLES = [['cj_varianten_ledger.txt', 'varianten'], ['cj_variantenbilder_ledger.txt', 'variantenbilder'], ['cj_sourcing_ledger.txt', 'sourcing'],
  ['grind2_ledger.txt', 'grind2'], ['grind2_freigabe_ledger.txt', 'grind2-freigabe']];

/**
 * Index aus Dateien: skus.jsonl (grind_skus_lesen.mjs) plus die Ledger. → { index, bericht }.
 * opt: { skusDatei, ledgerDir (Vorgabe dropship/ im Repo), lies (Test-Attrappe) }
 */
export function ladeIndex(opt = {}) {
  const lies = opt.lies || (p => readFileSync(p, 'utf8'));
  const gibt = opt.existiert || existsSync;
  const skusDatei = opt.skusDatei || process.env.GRIND_SKUS_DATEI || '/tmp/grind2/bau/skus.jsonl';
  const dir = opt.ledgerDir || DROPSHIP.pathname;
  const bericht = { skusDatei, ledger: [], fehlend: [] };
  if (!gibt(skusDatei)) throw new Error(`Shop-SKU-Datei fehlt: ${skusDatei} (erst automation/grind_skus_lesen.mjs laufen lassen)`);
  const produkte = produkteAusJsonl(lies(skusDatei));
  let stand = null, meta = null;
  try { meta = JSON.parse(lies(skusDatei + '.meta.json')); stand = meta.stand || null; } catch { bericht.fehlend.push(skusDatei + '.meta.json (Stand unbekannt → istFrisch() sagt nein)'); }
  const luecken = [];
  if (meta && meta.vollstaendig === false) luecken.push('Meta: vollstaendig=false (Objektzahl passt nicht)');
  if (meta && (meta.waisen > 0 || meta.kaputteZeilen > 0)) luecken.push(`Meta: ${meta.waisen || 0} verwaiste, ${meta.kaputteZeilen || 0} kaputte Zeilen`);
  if (produkte.kaputt) luecken.push(`${produkte.kaputt} kaputte Zeilen in der Datei`);
  if (produkte.length < (opt.mindestProdukte ?? 0)) luecken.push(`nur ${produkte.length} Produkte (erwartet mindestens ${opt.mindestProdukte})`);
  if (luecken.length) { bericht.unvollstaendig = luecken; stand = null; }     // ohne Stand sagt istFrisch() nein → ein LIVE-Lauf bricht ab
  bericht.kaputteZeilen = produkte.kaputt;
  const pids = [], handles = [];
  const lese = (liste, ziel, feld, fn) => {
    for (const [name, quelle] of liste) {
      const pfad = dir.replace(/\/?$/, '/') + name;
      if (!gibt(pfad)) { bericht.fehlend.push(name); continue; }
      const text = lies(pfad); const e = fn(text, quelle);
      ziel.push(...e); bericht.ledger.push({ datei: name, art: feld, eintraege: e.length, ungueltig: e.ungueltig || 0 });
    }
  };
  lese(LEDGER_PIDS, pids, 'pid', ledgerPidsAusText);
  lese(LEDGER_HANDLES, handles, 'handle', ledgerHandlesAusText);
  return { index: baueIndex({ produkte, ledgerPids: pids, ledgerHandles: handles }, { stand }), bericht };
}
