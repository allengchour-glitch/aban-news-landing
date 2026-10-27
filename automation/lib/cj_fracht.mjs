/**
 * Fracht und Lieferbarkeit CN→CH aus `logistic/freightCalculate` (Baustein von «Grind 2.0», dem breiten CJ-Import).
 *
 * WARUM EIN EIGENES MODUL: dieselbe `fracht()` steht dreimal im Repo (cj_varianten_nachziehen, cj_sourcing_pruefen, cj_top_produkte), jedes Mal anders —
 * nachziehen und top_produkte lesen nur die ZAHL der Linien (top_produkte schluckt dabei jeden Fehler als `null`), sourcing_pruefen rechnet «günstigste» über ALLE Linien. Kein altes
 * Anlege-Werkzeug prüft die Lieferbarkeit überhaupt (Audit 26.10.2026), und «Sourcing Succeeded» heisst nicht lieferbar (13 von 17 Treffern ohne CH-Linie, 24.10.).
 *
 * WAS CJ ANTWORTET (GEMESSEN 26.10.2026, Rohantworten /tmp/grind2/raw/21…36 und /tmp/mr/pruefung/cj_phase2.json; 10 Punkte je Aufruf):
 *   · Linien:        `{code:200, result:true, data:[{logisticName, logisticPrice (USD, Zahl), logisticAging "5-12", totalPostageFee, taxesFee, …}]}`
 *   · KEINE Linien:  `{code:200, result:true, data:[]}`  — Erfolg mit leerer Liste, KEIN Fehler. Das ist der einzige sichere Negativfall (Luftkühler: 0 Linien).
 *   · Fehler:        HTTP 200, `{code:1602000, result:false, data:null, message:"Variant not found, vid: …"}`.
 *   · Mehrere Produkte in EINER Anfrage: ein einziges nicht lieferbares macht die GANZE Antwort leer, man erfährt nicht welches → immer EINE vid je Anfrage.
 *   · Die Linienzahl hängt am Gewicht (Bett 320 g: 16 Linien, 1250 g: 16, 3600 g: 11; Warenkorb 1250 g + 2 × 420 g: 11), die Kosten stark an der Variante
 *     (günstigste normale Linie 8.79 / 19.99 / 47.45 USD, am 27.10. nachgemessen) → für Lieferbarkeit reicht eine Variante, für die Landekosten braucht es die SCHWERSTE.
 *   · «Sensitive»/«Liquid»: nach dem Auftrag des Besitzers sind das die Linien für Batterie und Flüssigkeit. GEMESSEN ist nur das Bild: Lötpaste (3 Linien, alle Sensitive/Liquid)
 *     und ein ferngesteuerter Roboter (7 Linien, davon nur PostNL und Postal ohne Sonderkennzeichen) haben KEINE «Ordinary»-Linie; ob Akku oder Flüssigkeit der Grund ist, wurde
 *     am Datenblatt NICHT geprüft. Normale Ware sieht dieselben Sonderlinien auch, nur teurer (Bett: EQ Sensitive 23.13 gegen Ordinary VIP 19.99).
 *     Darum werden sie GETRENNT ausgewiesen und fliessen nicht in `guenstigsteUsd` ein.
 *   · Zoll und Mehrwertsteuer für CH stehen NICHT darin (`taxesFee` 0, `clearanceOperationFee` 0) — ob CJ sie je füllt, ist unbekannt. Füllt CJ `totalPostageFee`
 *     höher als `logisticPrice`, gilt der höhere Wert (in allen 159 gemessenen Linien aus 13 Antworten sind beide gleich).
 *
 * DIE REGEL (Audit, Lieferbarkeit):
 *   lieferbar        = Antwort in Ordnung UND mindestens eine brauchbare Linie
 *   nicht lieferbar  = Antwort in Ordnung UND `data` ist eine LEERE Liste
 *   unbekannt        = JEDES andere: HTTP-Fehler, Drosselung, Punkte erschöpft, API-Code, kaputtes Format, `data: null`, Linien ohne Namen/Preis.
 *   Ein `unbekannt` ist NIE lieferbar (nie anlegen) und NIE «nicht lieferbar» (nie sperren, nie 14 Tage merken). Wer es als Ausgang festhält, schreibt
 *   «vorläufig» in die Ledger-Zeile (20 Stunden Ruhe, `ledgerGrund()`): im Auswahl-Lauf stand ein Produkt wegen eines kurzen Frachtausfalls sonst 14 Tage lang als
 *   «nicht bewiesen» da. Genauso zählt eine Linie ohne Preis NIE als Preis 0 (`Number(null)` ist 0 — die alte Falle).
 *
 * AUSFÄLLE WERDEN WEITERGEREICHT (wie in cj_varianten_nachziehen): Punkte erschöpft → `CJ_QUOTA`, CJ drosselt dauerhaft → `CJ_THROTTLED`, Reserve unterschritten →
 * `CJ_RESERVE` werden GEWORFEN, nicht als Produktergebnis zurückgegeben. Der Lauf soll warten/enden (Exitcode 3), nicht hundert Produkte als «unbekannt» abhaken.
 * Alles, was nur dieses eine Produkt betrifft (Netz, JSON, HTTP, API-Code, Format), kommt als `unbekannt` zurück.
 *
 * KEIN NETZ HIER, AUSSER ÜBER `frachtHolen`/`frachtProdukt` MIT ÜBERGEBENER fetch-Funktion; alles andere ist rein.
 */
import { cjFetch } from './cj_fetch.mjs';
import { lieferurteil } from './lieferbarkeit.mjs';
import { VORLAEUFIG } from './varianten_sicherheit.mjs';

export const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
export const FRACHT_URL = `${CJ_BASE}/logistic/freightCalculate`;
/** Derselbe Kurs wie `lib/cj_varianten.mjs → preisFuer()` und `lib/auswahl_abgleich.mjs → USD_CHF` (der Test hält die drei gleich). */
export const USD_CHF = 0.82435;
/** Punkte je Fracht-Aufruf (GEMESSEN: cj_api.md 14 kleine Aufrufe à 10, Ausreisser 30 und −10 sind Fremdverbrauch auf demselben Konto; 27.10.2026: alle 5 Abstände zwischen 6 Fracht-Aufrufen genau 10, auch der Aufruf mit Fehler 1602000). */
export const FRACHT_PUNKTE = 10;
/** Pause NACH jedem Aufruf (CJ erlaubt ~1 Abfrage je Sekunde; Start-zu-Start gemessen mindestens 1,2 s ohne Drosselung). */
export const PAUSE_MS = 1200;
/** Linienname gilt als Sonderlinie (laut Auftrag: Batterie, Flüssigkeit): GEMESSEN «… Sensitive», «… Sensitive Pro», «CJPacket Liquid Line». Alles andere ist normal. */
export const SENSITIV_RE = /sensitive|liquid/i;
/** Fehlerklassen, die den ganzen Lauf betreffen, nicht ein Produkt. */
export const LAUF_FEHLER_RE = /^CJ_(?:QUOTA|THROTTLED|RESERVE)\b/;

const QUOTA_RE = /insufficient api points|daily.*(?:quota|limit)|points.*exhaust/i;   // wie lib/cj_fetch.mjs
const VID_RE = /^[0-9A-Za-z][0-9A-Za-z-]{5,63}$/;                                      // CJ-vid: Ziffernfolge (19 Stellen) oder UUID

/** Strenge Zahl: nur echte endliche Zahlen und reine Dezimalzahl-Texte. `null`, '', true, [] sind KEINE Zahl (Number(null) wäre 0). */
function zahl(x) {
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x === 'string' && /^\s*-?\d+(?:\.\d+)?\s*$/.test(x)) return Number(x);
  return null;
}
const cent = n => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- Anfrage
/**
 * Körper für EINE Variante. Wirft bei allem, was die Antwort verfälschen würde: eine Liste von vids (nie bündeln), eine Zahl als vid
 * (ab 16 Stellen verliert JSON-Zahl Ziffern), eine ungültige Menge.
 */
export function frachtAnfrage({ vid, menge = 1, start = 'CN', ziel = 'CH' } = {}) {
  if (typeof vid !== 'string' || !VID_RE.test(vid.trim())) {
    throw new Error(`frachtAnfrage: vid muss EINE Zeichenkette sein (nie bündeln, nie als Zahl — ab 16 Stellen gehen Ziffern verloren), war ${Array.isArray(vid) ? 'eine Liste' : typeof vid}`);
  }
  if (!Number.isInteger(menge) || menge < 1 || menge > 999) throw new Error(`frachtAnfrage: Menge muss eine ganze Zahl von 1 bis 999 sein, war ${menge}`);
  for (const [name, land] of [['start', start], ['ziel', ziel]]) {
    if (typeof land !== 'string' || !/^[A-Z]{2}$/.test(land)) throw new Error(`frachtAnfrage: ${name} muss ein Ländercode aus zwei Grossbuchstaben sein, war ${land}`);
  }
  return { startCountryCode: start, endCountryCode: ziel, products: [{ quantity: menge, vid: vid.trim() }] };
}

// ---------------------------------------------------------------- Auswertung (rein)
/** «5-12» → {min:5, max:12}; «7» → {min:7, max:7}; alles andere → null (nie raten). */
export function parseTage(text) {
  const m = String(text ?? '').trim().match(/^(\d{1,3})(?:\s*[-–~]\s*(\d{1,3}))?$/);
  if (!m) return null;
  const min = Number(m[1]), max = m[2] === undefined ? min : Number(m[2]);
  return max >= min ? { min, max } : null;
}

export const linienArt = name => (SENSITIV_RE.test(String(name ?? '')) ? 'sensitiv' : 'normal');

function linieLesen(l) {
  if (!l || typeof l !== 'object') return null;
  const name = typeof l.logisticName === 'string' ? l.logisticName.trim() : '';
  const preis = zahl(l.logisticPrice);
  if (!name || preis === null || preis <= 0) return null;             // ohne Namen oder Preis keine Linie — und nie Preis 0
  const gesamt = zahl(l.totalPostageFee);
  const preisUsd = cent(gesamt !== null && gesamt > preis ? gesamt : preis);   // Gebühren, falls CJ sie je einrechnet: der höhere Wert gilt
  const tage = parseTage(l.logisticAging);
  return { name, preisUsd, ...(tage ? { tage } : {}), art: linienArt(name) };
}

const LEER = { lieferbar: false, urteil: 'unbekannt', unbekannt: true, tag: null, linien: [], guenstigsteUsd: null, guenstigsteLinie: null,
  guenstigsteSensitivUsd: null, nurSensitiv: false, verworfen: 0 };
const unbekannt = (fehler, grund) => ({ ...LEER, fehler, grund });

/**
 * Urteil über EINE Antwort von freightCalculate (eine Variante).
 * @param {object|null} antwort  der gelesene JSON-Körper (oder null, wenn nicht lesbar)
 * @param {{status?:number, vid?:string}} [opt]  HTTP-Status, falls bekannt; vid der Anfrage
 * @returns {{lieferbar:boolean, urteil:'lieferbar'|'nicht_lieferbar'|'unbekannt', unbekannt:boolean, fehler?:string, grund:string, tag:string|null,
 *   linien:{name:string, preisUsd:number, tage?:{min:number,max:number}, art:'normal'|'sensitiv'}[], guenstigsteUsd:number|null, guenstigsteLinie:string|null,
 *   guenstigsteSensitivUsd:number|null, nurSensitiv:boolean, verworfen:number}}
 *   `guenstigsteUsd` = günstigste NORMALE Linie (Ordinary, Eub, Postal, PostNL, DHL …); `guenstigsteSensitivUsd` = günstigste Sonderlinie; `nurSensitiv` = es gibt
 *   Linien, aber keine einzige normale (Batterie/Flüssigkeit): dann ist `guenstigsteUsd` null und der Aufrufer entscheidet über `frachtFuerKosten`.
 */
export function frachtAuswerten(antwort, { status, vid } = {}) {
  if (QUOTA_RE.test(String(antwort?.message ?? ''))) return unbekannt('quota', 'CJ-Tagespunkte erschöpft — sagt nichts über das Produkt');
  if (status !== undefined && status !== null && !(status >= 200 && status < 300)) {
    return unbekannt(status === 429 ? 'drosselung' : `http-${status}`, `HTTP ${status} — sagt nichts über das Produkt`);
  }
  if (!antwort || typeof antwort !== 'object' || Array.isArray(antwort)) return unbekannt('format-antwort', 'Antwort nicht lesbar');
  if (antwort.result !== true) {
    const code = String(antwort.code ?? 'unbekannt').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 40);
    return unbekannt(code === '1600200' ? 'drosselung' : `api-${code}`, `CJ meldet Fehler ${code} — sagt nichts über die Lieferbarkeit`);
  }
  if (Number(antwort.code) !== 200) return unbekannt('format-code', `Erfolgsantwort mit Code ${String(antwort.code).slice(0, 20)} statt 200 — nicht auswertbar`);
  if (!Array.isArray(antwort.data)) return unbekannt('format-data', '`data` ist keine Liste (null ist KEINE leere Liste) — nicht auswertbar');

  const linien = antwort.data.map(linieLesen).filter(Boolean)
    .sort((a, b) => a.preisUsd - b.preisUsd || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const verworfen = antwort.data.length - linien.length;
  if (antwort.data.length > 0 && linien.length === 0) return unbekannt('format-linien', `${antwort.data.length} Linie(n) ohne Namen oder Preis — nicht auswertbar`);

  // Das eigentliche Urteil bleibt bei lib/lieferbarkeit.mjs (eine Quelle für Wortlaut und Tag). Die Anfrage nannte eine vid; wäre sie CJ unbekannt, käme 1602000 (oben).
  const u = lieferurteil({ cjCode: 200, vid: vid || 'angefragt', linien: linien.length });
  const normal = linien.filter(l => l.art === 'normal'), sonder = linien.filter(l => l.art === 'sensitiv');
  return {
    lieferbar: u.urteil === 'lieferbar', urteil: u.urteil, unbekannt: u.urteil === 'unbekannt', grund: u.grund, tag: u.tag,
    linien, guenstigsteUsd: normal[0]?.preisUsd ?? null, guenstigsteLinie: normal[0]?.name ?? null,
    guenstigsteSensitivUsd: sonder[0]?.preisUsd ?? null, nurSensitiv: linien.length > 0 && normal.length === 0, verworfen,
  };
}

/** `pointsInfo` jeder CJ-Antwort → {total, usedToday, remaining} oder null. Massgeblich ist `remaining` (`usedToday` liegt über `total` und springt zurück). */
export function punkteStand(antwort) {
  const p = antwort?.pointsInfo;
  const remaining = zahl(p?.remaining);
  if (remaining === null) return null;
  return { total: zahl(p.total), usedToday: zahl(p.usedToday), remaining };
}

/** Schreibt den neuesten Stand in das gemeinsame Zustandsobjekt des Laufs (damit die Reserve auch über Produkte hinweg gilt). */
export function punkteMerken(stand, antwort) {
  const p = punkteStand(antwort);
  if (p && stand && typeof stand === 'object') Object.assign(stand, p);
  return p;
}

/**
 * Welche Frachtzahl geht in die Landekosten? Standard: nur die günstigste NORMALE Linie. Batterie-/Flüssigware kann nur Sonderlinien haben (gemessen: Lötpaste): dann null (Aufrufer
 * stellt zurück), ausser er erlaubt ausdrücklich den Ausweg über die Sonderlinie. Unbekannt und nicht lieferbar liefern nie eine Zahl.
 *
 * LIEFERZEIT (`maxTage`, Prüfung 27.10.2026): die günstigste Linie ist oft die langsamste (GEMESSEN: CJPacket Eub und Postal 12–50 Tage, PostNL 15–45, Sensitive Pro 15–35, dagegen
 * CJPacket Ordinary VIP 7–10, EQ 5–9). Die Produktseite verspricht «Lieferung ca. 10–20 Tage» (so auch die Saison-Fenster in grind2.mjs): gepreist wird darum mit der günstigsten Linie,
 * deren LÄNGSTE Laufzeit höchstens `maxTage` beträgt. Eine Linie ohne lesbare Laufzeit gilt als unbekannt, nicht als schnell. Gibt es normale Linien, aber keine schnelle, ist das Ergebnis
 * null (zurückstellen) — auch mit `sensitivAlsAusweg` springt dann keine Sonderlinie ein: wer Batterieware schnell versenden will, entscheidet das ausdrücklich (Besitzer), nicht hier.
 * Ohne normale Linie und mit `sensitivAlsAusweg` zählt die günstigste SCHNELLE Sonderlinie. `maxTage = null` (Vorgabe) ist das alte Verhalten ohne Laufzeitprüfung.
 */
export function frachtFuerKosten(r, { sensitivAlsAusweg = false, maxTage = null } = {}) {
  if (!r || r.unbekannt || !r.lieferbar) return null;
  if (maxTage != null && Array.isArray(r.linien)) {
    const schnell = l => !!l.tage && l.tage.max <= maxTage;          // linien sind nach Preis sortiert
    const normal = r.linien.filter(l => l.art === 'normal');
    if (normal.length) return normal.find(schnell)?.preisUsd ?? null;
    return sensitivAlsAusweg ? (r.linien.filter(l => l.art === 'sensitiv').find(schnell)?.preisUsd ?? null) : null;
  }
  if (typeof r.guenstigsteUsd === 'number') return r.guenstigsteUsd;
  return sensitivAlsAusweg && typeof r.guenstigsteSensitivUsd === 'number' ? r.guenstigsteSensitivUsd : null;
}

/** Warum liefert frachtFuerKosten keine Zahl? Klartext für Kontaktbogen und Ledger (nur aufrufen, wenn das Ergebnis null ist). */
export function frachtKeineZahlGrund(r, { sensitivAlsAusweg = false, maxTage = null } = {}) {
  if (!r || r.unbekannt) return 'Fracht unbekannt';
  if (!r.lieferbar) return 'keine Versandlinie CN→CH';
  const normal = (r.linien || []).filter(l => l.art === 'normal');
  if (maxTage != null && normal.length) {
    return `keine normale Versandlinie CN→CH mit höchstens ${maxTage} Tagen Lieferzeit (Linien: ${normal.slice(0, 4).map(l => `${l.name} ${l.tage ? l.tage.min + '-' + l.tage.max : '?'}`).join(', ')})`;
  }
  return sensitivAlsAusweg && maxTage != null ? `keine Sonderlinie CN→CH mit höchstens ${maxTage} Tagen Lieferzeit` : 'nur Sonderlinien (Sensitive/Liquid) nach CH, keine normale Linie';
}

/** Projektformel (im Shop gemessen): Kosten je Stück = (EK + Fracht) × Kurs, auf Rappen. Fehlt oder irrt eine Angabe → null, nie 0. */
export function landekostenChf(frachtUsd, ekUsd, kurs = USD_CHF) {
  const f = zahl(frachtUsd), e = zahl(ekUsd), k = zahl(kurs);
  if (f === null || e === null || k === null || f < 0 || e <= 0 || k <= 0) return null;
  return cent((e + f) * k);
}

/**
 * Welche Varianten werden gemessen? Die SCHWERSTE (Landekosten-Obergrenze, zugleich Lieferbarkeitsprobe) und die LEICHTESTE (falls die schwerste keine Linie hat).
 * Gewicht aus `gewichtG` oder CJs `variantWeight` (Gramm). Varianten ohne verwertbare vid fallen weg; ohne jedes Gewicht entscheidet die erste (gewichtUnbekannt).
 */
export function waehleMessvarianten(varianten) {
  const alle = (Array.isArray(varianten) ? varianten : [])
    .map(v => ({ vid: typeof v?.vid === 'string' ? v.vid.trim() : '', gewichtG: zahl(v?.gewichtG ?? v?.variantWeight) }))
    .filter(v => VID_RE.test(v.vid));
  if (!alle.length) return { schwerste: null, leichteste: null, gewichtUnbekannt: false, ohneGewicht: 0 };
  const mitG = alle.filter(v => v.gewichtG !== null && v.gewichtG > 0);
  if (!mitG.length) return { schwerste: alle[0], leichteste: alle[0], gewichtUnbekannt: true, ohneGewicht: alle.length };
  const schwerste = mitG.reduce((a, b) => (b.gewichtG > a.gewichtG ? b : a));
  const leichteste = mitG.reduce((a, b) => (b.gewichtG < a.gewichtG ? b : a));
  return { schwerste, leichteste, gewichtUnbekannt: false, ohneGewicht: alle.length - mitG.length };
}

/**
 * Welche Gewichte werden gemessen, wenn mehrere Gewichtsklassen gelten? Die LEICHTESTE und die SCHWERSTE immer, dazu bis zu `max - 2` Zwischenstufen (gleichmässig nach Rang unter den
 * VERSCHIEDENEN Gewichten). Höchstens `max` Gewichte. Bis `max` verschiedene Gewichte werden alle gemessen.
 * @param {number[]} gewichte Gramm (Werte ≤ 0 und Nicht-Zahlen fallen weg)  @returns {number[]} aufsteigend
 */
export function messKlassen(gewichte, max = 4) {
  const g = [...new Set((Array.isArray(gewichte) ? gewichte : []).map(x => zahl(x)).filter(x => x !== null && x > 0))].sort((a, b) => a - b);
  if (g.length <= max) return g;
  const aus = new Set([g[0], g[g.length - 1]]);
  for (let i = 1; i <= max - 2; i++) aus.add(g[Math.round(i * (g.length - 1) / (max - 1))]);
  return [...aus].sort((a, b) => a - b);
}

/**
 * Messplan für ein Produkt: Welche Varianten werden gemessen (je EINE vid pro Gewichtsklasse)? Spannt das Gewicht weniger als `spanneFaktor` (Vorgabe 2), genügt die SCHWERSTE
 * (wie bisher: ihre Fracht gilt für alle, leichtere sind dann eher zu teuer als zu billig). Sonst die Klassen aus `messKlassen`.
 * Ohne Gewicht bei allen Varianten (gewichtUnbekannt) wird nur eine gemessen. @returns {{vid:string, gewichtG:number}[]} aufsteigend nach Gewicht, die schwerste zuletzt
 */
export function messPlan(varianten, { klassenMax = 1, spanneFaktor = 2 } = {}) {
  const w = waehleMessvarianten(varianten);
  if (!w.schwerste) return [];
  if (w.gewichtUnbekannt || klassenMax <= 1 || !(w.schwerste.gewichtG > w.leichteste.gewichtG * spanneFaktor)) return [{ vid: w.schwerste.vid, gewichtG: w.schwerste.gewichtG }];
  const alle = (Array.isArray(varianten) ? varianten : [])
    .map(v => ({ vid: typeof v?.vid === 'string' ? v.vid.trim() : '', gewichtG: zahl(v?.gewichtG ?? v?.variantWeight) })).filter(v => VID_RE.test(v.vid) && v.gewichtG !== null && v.gewichtG > 0);
  return messKlassen(alle.map(v => v.gewichtG), klassenMax).map(g => ({ vid: (g === w.schwerste.gewichtG ? w.schwerste : alle.find(v => v.gewichtG === g)).vid, gewichtG: g }));
}

/**
 * Fracht je Variante aus den gemessenen Gewichtsklassen: jede Variante bekommt die Fracht der NÄCHST SCHWEREREN gemessenen Klasse (konservativ: nie zu billig), ohne Gewicht die der
 * schwersten. `klassen` = [{gewichtG, r}] mit r = Ergebnis von frachtAuswerten. Das Ergebnis je Variante: {vid, klasseG, frachtUsd|null, grund?}. null = diese Klasse hat keine Zahl
 * (nicht lieferbar, unbekannt, keine schnelle Linie): die Variante wird NICHT verkauft (nie raten). Ohne jede gemessene Klasse null (nichts zu verteilen).
 * @returns {{vid:string, gewichtG:number|null, klasseG:number, frachtUsd:number|null, grund?:string}[]|null}
 */
export function frachtJeVariante(varianten, klassen, opt = {}) {
  const k = (Array.isArray(klassen) ? klassen : []).filter(x => Number.isFinite(x?.gewichtG) && x.gewichtG > 0 && x.r).sort((a, b) => a.gewichtG - b.gewichtG);
  if (!k.length) return null;
  const schwerste = k[k.length - 1];
  return (Array.isArray(varianten) ? varianten : []).map(v => {
    const g = zahl(v?.gewichtG ?? v?.variantWeight);
    const kl = g !== null && g > 0 ? (k.find(x => x.gewichtG >= g) || schwerste) : schwerste;
    const usd = frachtFuerKosten(kl.r, opt);
    return { vid: v.vid, gewichtG: g, klasseG: kl.gewichtG, frachtUsd: usd, ...(usd == null ? { grund: frachtKeineZahlGrund(kl.r, opt) } : {}) };
  });
}

/**
 * Text für die Ledger-Zeile (`<handle> · <Zeit> · UEBERSPRUNGEN · <Grund>`) oder null, wenn nichts zu überspringen ist.
 * nicht lieferbar → endgültiger Grund (lib/varianten_sicherheit.mjs: 14 Tage Ruhe). unbekannt → «vorläufig:» (20 Stunden), NIE 14 Tage.
 */
export function ledgerGrund(r) {
  if (!r || r.unbekannt || r.urteil === 'unbekannt' || (!r.lieferbar && r.urteil !== 'nicht_lieferbar')) {
    return `${VORLAEUFIG}: Fracht unbekannt (${r?.fehler ?? 'nicht gemessen'})`;
  }
  return r.urteil === 'nicht_lieferbar' ? 'keine Versandlinie CN→CH' : null;
}

// ---------------------------------------------------------------- Netz (dünn, fetch wird übergeben)
const schlaf = ms => new Promise(r => setTimeout(r, ms));

/** Fehler aus cjFetch → Klasse für `unbekannt.fehler` (und ob der ganze Lauf betroffen ist). */
function fehlerKlasse(e) {
  const m = String(e?.message ?? e);
  if (/^CJ_QUOTA/.test(m)) return { fehler: 'quota', lauf: true };
  if (/^CJ_API.*code=16900500\b/.test(m)) return { fehler: 'quota', lauf: true };      // Punkte leer, als HTTP 200 mit result:false gemeldet
  if (/^CJ_THROTTLED/.test(m)) return { fehler: 'drosselung', lauf: true };
  if (/^CJ_API.*code=1600200\b/.test(m)) return { fehler: 'drosselung', lauf: true };
  if (/^CJ_NETZ/.test(m)) return { fehler: 'netz', lauf: false };
  if (/^CJ_JSON/.test(m)) return { fehler: 'json', lauf: false };
  const h = m.match(/^CJ_HTTP: HTTP (\d+)/);
  if (h) return { fehler: `http-${h[1]}`, lauf: false };
  const a = m.match(/^CJ_API.*code=([0-9A-Za-z_-]+)/);
  if (a) return { fehler: `api-${a[1]}`, lauf: false };
  if (/^CJ_DATA/.test(m)) return { fehler: 'format-data', lauf: false };
  return { fehler: 'unerwartet', lauf: false };
}

/**
 * EINE Fracht-Anfrage für EINE Variante (10 Punkte).
 * @param {object} o
 * @param {string} o.vid       CJ-Variantenkennung als Zeichenkette
 * @param {string} o.token     CJ-Zugangsmarke (lib/cj_token.mjs → cjToken())
 * @param {number} [o.menge=1]
 * @param {Function} [o.fetch] Netzfunktion (Tests: Attrappe); Vorgabe globales fetch
 * @param {Function} [o.warte] Wartefunktion (Tests: ohne Warten); {@link PAUSE_MS} nach dem Aufruf
 * @param {object} [o.stand]   gemeinsames Punkte-Zustandsobjekt des Laufs, wird mit `pointsInfo` aktualisiert
 * @param {number} [o.reserve=0] Punkte, die für andere Läufe (Auswahl-Lauf) übrig bleiben müssen; unterschritten → wirft CJ_RESERVE VOR dem Aufruf. 0 = keine Prüfung
 * @returns {Promise<ReturnType<typeof frachtAuswerten> & {vid:string, menge:number, punkte:object|null, reserveUnterschritten:boolean}>}
 * @throws CJ_QUOTA | CJ_THROTTLED | CJ_RESERVE (betreffen den Lauf, nicht das Produkt)
 */
export async function frachtHolen({ vid, token, menge = 1, start = 'CN', ziel = 'CH', fetch: fetchFn, warte, pauseMs = PAUSE_MS, stand, reserve = 0,
  versuche, basisMs, context = 'Fracht' } = {}) {
  if (!token) throw new Error('frachtHolen: kein CJ-Token übergeben');
  const nachher = (r, punkte) => ({ ...r, vid, menge, punkte, reserveUnterschritten: reserve > 0 && !!punkte && punkte.remaining < reserve });
  let body;
  try { body = frachtAnfrage({ vid, menge, start, ziel }); }
  catch (e) { return nachher(unbekannt('anfrage', e.message), null); }   // schlechte Eingabe: nichts gesendet, keine Punkte, kein Urteil über CJ

  if (reserve > 0 && Number.isFinite(stand?.remaining) && stand.remaining - FRACHT_PUNKTE < reserve) {
    throw new Error(`CJ_RESERVE: nur noch ${stand.remaining} Punkte, Reserve ${reserve} bleibt unangetastet (${context})`);
  }
  const wartet = warte ?? schlaf;
  let antwort, fehlerErgebnis;
  try {
    antwort = await cjFetch(FRACHT_URL, {
      context, headers: { 'CJ-Access-Token': token, 'Content-Type': 'application/json' },
      init: { method: 'POST', body: JSON.stringify(body) }, fetch: fetchFn, warte, versuche, basisMs,
    });
  } catch (e) {
    const k = fehlerKlasse(e);
    if (k.lauf) {
      await wartet(pauseMs);
      throw LAUF_FEHLER_RE.test(String(e.message)) ? e : new Error(`${k.fehler === 'quota' ? 'CJ_QUOTA' : 'CJ_THROTTLED'}: ${String(e.message).slice(0, 200)}`);
    }
    fehlerErgebnis = unbekannt(k.fehler, `${String(e.message).slice(0, 160)} — sagt nichts über die Lieferbarkeit`);
  }
  await wartet(pauseMs);
  const r = fehlerErgebnis ?? frachtAuswerten(antwort, { status: 200, vid: body.products[0].vid });
  return nachher(r, punkteMerken(stand, antwort));
}

/**
 * Fracht für EIN Produkt, jede Anfrage mit genau einer Variante:
 *   1. die schwerste Variante (Obergrenze der Landekosten, zugleich Lieferbarkeitsprobe);
 *   2. nur wenn die schwerste KEINE Linie hat: die leichteste — ein Produkt gilt nicht als nicht lieferbar, bloss weil die schwerste Variante zu schwer ist.
 *   3. nur mit `klassenMax` > 1 UND wenn die schwerste lieferbar ist UND das Gewicht um mehr als `spanneFaktor` (2) spannt: die übrigen Gewichtsklassen (messPlan: leichteste und bis zu
 *      `klassenMax - 2` Zwischenstufen). Grund (GEMESSEN 27.10.2026, Lichterkette mit 170 bis 3770 g): 6.77 / 9.17 / 21.59 / 49.44 USD — die Fracht der schwersten Variante für alle machte
 *      die 170-g-Variante von 14.90 auf 61.90 CHF und das ganze Produkt für den Shop unverkäuflich. Kosten: bis `klassenMax` × 10 statt 10 Punkte.
 * Fehler bei der ersten Anfrage → unbekannt, keine weitere (kostet nur Punkte); ein unbekanntes Ergebnis einer weiteren Klasse macht das ganze Produkt unbekannt und beendet die Messung.
 * @returns Ergebnis von frachtAuswerten für die MASSGEBLICHE Variante + `schwerste`, `leichteste?`, `gemessen` (vids), `teilweise` (schwerste nicht, leichteste doch
 *   lieferbar: die schweren Varianten gehören weg), `klassen` ([{gewichtG, vid, r}] aufsteigend, die schwerste zuletzt; für frachtJeVariante) + `punkte`, `reserveUnterschritten`.
 */
export async function frachtProdukt({ varianten, stand = {}, klassenMax = 1, spanneFaktor = 2, ...opt } = {}) {
  const w = waehleMessvarianten(varianten);
  if (!w.schwerste) {
    return { ...unbekannt('keine-variante', 'Produkt ohne verwertbare Variante (vid) — nichts gemessen'), schwerste: null, gemessen: [], teilweise: false, klassen: [], punkte: null, reserveUnterschritten: false };
  }
  const kurz = (r, v) => ({ vid: v.vid, gewichtG: v.gewichtG, urteil: r.urteil, lieferbar: r.lieferbar, guenstigsteUsd: r.guenstigsteUsd, ...(r.fehler ? { fehler: r.fehler } : {}) });
  const rs = await frachtHolen({ ...opt, stand, vid: w.schwerste.vid });
  const gemessen = [w.schwerste.vid];
  const klassen = [{ gewichtG: w.schwerste.gewichtG, vid: w.schwerste.vid, r: rs }];
  let massgeblich = rs, letzte = rs, leichteste, teilweise = false;
  if (rs.urteil === 'nicht_lieferbar' && w.leichteste.vid !== w.schwerste.vid) {
    const rl = await frachtHolen({ ...opt, stand, vid: w.leichteste.vid });
    gemessen.push(w.leichteste.vid);
    letzte = rl;
    leichteste = kurz(rl, w.leichteste);
    if (rl.urteil === 'lieferbar') { massgeblich = rl; teilweise = true; }
    else if (rl.unbekannt) massgeblich = rl;                     // nicht bewiesen → unbekannt, nicht «nicht lieferbar»
  } else if (rs.urteil === 'lieferbar' && klassenMax > 1) {
    for (const m of messPlan(varianten, { klassenMax, spanneFaktor }).filter(x => x.vid !== w.schwerste.vid)) {
      const rk = await frachtHolen({ ...opt, stand, vid: m.vid });
      gemessen.push(m.vid); letzte = rk;
      klassen.unshift({ gewichtG: m.gewichtG, vid: m.vid, r: rk });
      if (m.gewichtG === w.leichteste.gewichtG) leichteste = kurz(rk, m);
      if (rk.unbekannt) { massgeblich = rk; break; }            // nicht bewiesen → das ganze Produkt ist unbekannt (vorläufig), weitere Messungen wären verlorene Punkte
    }
    klassen.sort((x, y) => x.gewichtG - y.gewichtG);
  }
  return { ...massgeblich, schwerste: kurz(rs, w.schwerste), ...(leichteste ? { leichteste } : {}), gemessen, teilweise, klassen,
    gewichtUnbekannt: w.gewichtUnbekannt, ohneGewicht: w.ohneGewicht, punkte: letzte.punkte, reserveUnterschritten: letzte.reserveUnterschritten };
}
