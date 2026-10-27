/**
 * Preis und Marge für NEUE Produkte («Grind 2.0»). Reine Funktionen: kein Netz, kein Shop, kein CJ.
 *
 * WARUM (27.10.2026): Die Altwerkzeuge des CJ-Imports haben vier verschiedene, untereinander unverträgliche Preisregeln
 * (EK × 2,4…1,85 gestaffelt · EK × 0,90 × 3,2 · EK × 2,8 × 0,88 · «relativ zum bisherigen Preis»), und keine davon rechnet die
 * Fracht ein. Im Shop gilt aber `unitCost = (EK + Fracht) × Kurs` (Audit M16): bei einer 44-g-Taschenlampe frisst die Fracht
 * allein 5,12 CHF, der Einkauf ist 1,37 CHF. Hier gibt es EINE Regel, gerechnet auf dem Einstand.
 *
 *   Einstand (CHF) = (EK_USD + Fracht_USD) × Kurs, auf Rappen
 *   Preis          = aufrunden90( max( PREIS_MIN, Einstand × AUFSCHLAG ) )
 *   Marge          = (Preis − Einstand) / Preis        — unter MARGE_WARN gibt es eine WARNUNG, nie eine stille Anpassung
 *
 * Mehrere Varianten (`preiseFuerVarianten`) nutzen dieselbe Preislogik wie der Auswahl-Lauf: `preisFuer()` aus
 * `cj_varianten.mjs` — die günstigste Variante bekommt den Preis der Einzelregel und ist zugleich der Mindestpreis, jede teurere
 * bekommt den Aufschlag mit demselben Verhältnis Preis/Kosten, der Preis steigt monoton mit dem Einstand.
 * EINE Abweichung, bewusst und gemessen: steht die günstigste Variante auf der Untergrenze, vererbt sie ihr aufgeblähtes Verhältnis nicht (Vorgabe `verhaeltnis:'regel'`;
 * das wörtliche Verhalten des Auswahl-Laufs bleibt als `verhaeltnis:'basis'` wählbar — Begründung und Zahlen an `preiseFuerVarianten`).
 *
 * Grundsatz des Repos: Unbekanntes bleibt UNBEKANNT. Ein fehlender, nicht lesbarer oder unsinniger Betrag ergibt
 * `{ ok:false, grund }` und NIE einen geratenen Preis. Fehler in der KONFIGURATION (Aufschlag, Untergrenze, …) werfen.
 *
 * Nicht Sache dieses Moduls (bleibt beim Orchestrator): Obergrenze/Plausibilität gegen den Marktpreis (dafür `preisProStueck`),
 * Zahlungsgebühren, Mehrwertsteuer und Einfuhrabgaben — die Marge hier ist die BRUTTOMARGE auf den Einstand von CJ.
 */
import { aufrunden90, preisFuer } from './cj_varianten.mjs';

// ───────────────────────── SETZUNGEN (vom Besitzer zu bestätigen — keine Messwerte) ─────────────────────────

/**
 * SETZUNG: Preis = Einstand × 1,45 (Bruttomarge 31,0 % vor dem Aufrunden).
 * Zum Vergleich GEMESSEN 27.10.2026 an 53 718 CJ-Produkten des Shops (Preis / unitCost der kleinsten Variante): Median 1,29 · 25 % ≤ 1,26 · 75 % ≤ 1,65.
 * Die Mengenrabatt-Stufen setzen 37 % (b) bzw. 45 % (a) Marge voraus, das verlangt Aufschlag ≥ 1,59 bzw. ≥ 1,82: mit 1,45 erreichen sie nur Produkte, bei denen das Aufrunden
 * auf x.90 oder die Untergrenze die Marge hebt (gemessen: 6,3 % der Varianten, auf dem heutigen Einstand gerechnet).
 */
export const AUFSCHLAG = 1.45;
/**
 * SETZUNG: kein Produkt unter CHF 14.90 (Zahlungsgebühren; CHF 7 Versand erhebt der Shop nur unter der Gratis-Schwelle von CHF 50).
 * Der Audit fand im Shop daneben 16.90 für Bekleidung/Schuhe: dafür `preisMin` pro Aufruf setzen.
 */
export const PREIS_MIN = 14.90;
/** SETZUNG: unter 30 % Bruttomarge wird gewarnt (Flagge `marge_unter_30`). Der Standard-Aufschlag 1,45 kann sie nicht unterschreiten (31,03 %). */
export const MARGE_WARN = 0.30;
/**
 * Marge-Schwellen der Mengenrabatt-Stufen: KOPIE aus `automation/lib/mengenrabatt.mjs` (STUFEN.a/b.margeMin; dort noch nicht in `main`, Stand 27.10.2026).
 * Ändern sich die Schwellen dort, hier mitziehen. Gerechnet wird mit der kleinsten Marge über alle Varianten.
 */
export const MENGENRABATT_MARGE = { a: 0.45, b: 0.37 };
/** Der Kurs USD → CHF, den `cj_varianten.mjs` (preisFuer), `trend_auswahl.mjs` und `auswahl_abgleich.mjs` heute fest verwenden. Wird NICHT als Vorgabe eingesetzt: `kurs` ist Pflicht. */
export const USD_CHF = 0.82435;
/** Ein Kurs ausserhalb dieser Spanne ist verdächtig (z. B. verdreht: CHF je USD statt USD je CHF) und bekommt die Flagge `kurs_ungewoehnlich`. */
export const KURS_PLAUSIBEL = { min: 0.6, max: 1.2 };

/**
 * Gleitkomma-Toleranz an den Grenzen: (20 − 11) / 20 soll genau 45 % sein, nicht 44,999….
 * Eine Marge aus ganzen Rappen liegt bei Preisen bis CHF 10 000 mindestens 1e-8 neben einer Schwelle in ganzen Prozent, wenn sie nicht genau darauf liegt: 1e-9 trennt sauber.
 */
const EPS = 1e-9;

/** Klartext zu den Flaggen (für Ledger und Berichte). */
export const FLAGGEN_TEXT = {
  marge_unter_30: 'Bruttomarge unter 30 %',
  fracht_dominiert: 'Fracht höher als der Einkauf (Kleinware): Preis hängt an der Frachtschätzung',
  fracht_null: 'Fracht ist 0: prüfen, ob sie wirklich gemessen wurde (unbekannt ist nicht null)',
  spanne: 'EK oder Fracht kam als Spanne: gerechnet wurde mit dem Rand laut Option `spanne`',
  kurs_ungewoehnlich: 'Kurs ausserhalb 0,6–1,2: verdreht oder veraltet?',
};

// ───────────────────────── Zahlen lesen ─────────────────────────

const TEIL_RE = /^\d+(?:\.\d+)?$/;
const KOMMA_RE = /^\d+,\d{1,2}$/;                    // «4,34»; «1,234» bleibt mehrdeutig (Tausender?) und wird abgelehnt
const TRENNER_RE = /\s*(?:--|–|—|-)\s*/;             // CJ: «4.34 -- 5.44» (Liste), «3.44-17.01» (Detail), «18.75 - 240.51» (Vorschlag)

function einTeil(s) {
  if (TEIL_RE.test(s)) return Number(s);
  if (KOMMA_RE.test(s)) return Number(s.replace(',', '.'));
  return NaN;
}

/**
 * Liest einen CJ-Betrag: Zahl, Zahl als Text oder Spanne («4.34 -- 5.44», «3.44-17.01», «18.75 - 240.51»).
 * Nur nichtnegative, endliche Beträge; alles andere ist `ok:false` (nie raten, kein Währungszeichen, keine Exponentenschreibweise, keine verkehrte Spanne).
 * @returns {{ok:true, min:number, max:number, spanne:boolean} | {ok:false, grund:string}}  `spanne` ist nur wahr, wenn min < max.
 */
export function parseSpanne(wert) {
  if (typeof wert === 'number') {
    if (!Number.isFinite(wert)) return { ok: false, grund: 'keine endliche Zahl' };
    if (wert < 0) return { ok: false, grund: 'negativ' };
    return { ok: true, min: wert, max: wert, spanne: false };
  }
  if (typeof wert !== 'string') return { ok: false, grund: wert == null ? 'leer' : `Typ ${typeof wert}` };
  const s = wert.trim();
  if (!s) return { ok: false, grund: 'leer' };
  const teile = s.split(TRENNER_RE);
  if (teile.length > 2) return { ok: false, grund: 'mehr als zwei Zahlen' };
  const zahlen = teile.map(einTeil);
  if (zahlen.some(z => !Number.isFinite(z))) return { ok: false, grund: `nicht lesbar: «${s}»` };
  if (zahlen.length === 1) return { ok: true, min: zahlen[0], max: zahlen[0], spanne: false };
  if (zahlen[0] > zahlen[1]) return { ok: false, grund: `Spanne verkehrt: «${s}»` };
  return { ok: true, min: zahlen[0], max: zahlen[1], spanne: zahlen[0] < zahlen[1] };
}

/** Auf Rappen runden (halbe Rappen auf), mit Toleranz gegen 1.005 → 1.00. */
export const runde2 = x => Math.round((x + EPS) * 100) / 100;

/** (Preis − Kosten) / Preis, nicht gerundet. null bei unsinnigen Eingaben. */
export function margeVon(preis, kosten) {
  const p = Number(preis), k = Number(kosten);
  if (!Number.isFinite(p) || !Number.isFinite(k) || p <= 0) return null;
  return (p - k) / p;
}

/** Hat die Marge die Grenze erreicht? Mit Toleranz: exakt 45 % ist 45 %. */
export const margeErreicht = (marge, grenze) => marge != null && Number.isFinite(marge) && marge >= grenze - EPS;

/** Mengenrabatt-Stufe, für die diese Marge reicht: 'a' (ab 45 %), 'b' (ab 37 %) oder null. */
export function mengenrabattStufe(marge) {
  if (margeErreicht(marge, MENGENRABATT_MARGE.a)) return 'a';
  if (margeErreicht(marge, MENGENRABATT_MARGE.b)) return 'b';
  return null;
}

// ───────────────────────── Konfiguration ─────────────────────────

const istZahl = x => typeof x === 'number' && Number.isFinite(x);

/** Prüft die Optionen (Programmierfehler → wirft) und setzt die Vorgaben. */
function konfig(opt) {
  opt = opt ?? {};
  const aufschlag = opt.aufschlag ?? AUFSCHLAG, preisMin = opt.preisMin ?? PREIS_MIN, stueck = opt.stueck ?? 1;
  const spanne = opt.spanne ?? 'max', verhaeltnis = opt.verhaeltnis ?? 'regel';
  if (!istZahl(aufschlag) || aufschlag < 1) throw new RangeError(`aufschlag muss eine Zahl ≥ 1 sein (unter 1 verkauft unter Einstand), war: ${String(aufschlag)}`);
  if (!istZahl(preisMin) || preisMin <= 0) throw new RangeError(`preisMin muss eine Zahl > 0 sein, war: ${String(preisMin)}`);
  if (!Number.isInteger(stueck) || stueck < 1) throw new RangeError(`stueck muss eine ganze Zahl ≥ 1 sein, war: ${String(stueck)}`);
  if (spanne !== 'max' && spanne !== 'min') throw new RangeError(`spanne muss 'max' oder 'min' sein, war: ${String(spanne)}`);
  if (verhaeltnis !== 'regel' && verhaeltnis !== 'basis') throw new RangeError(`verhaeltnis muss 'regel' oder 'basis' sein, war: ${String(verhaeltnis)}`);
  return { aufschlag, preisMin, stueck, spanne, verhaeltnis };
}

const leer = grund => ({ ok: false, grund, kosten: null, preis: null, marge: null, regel: null, mengenrabatt: null, preisProStueck: null, flaggen: [] });

/** Betrag lesen: leer → «unbekannt», unlesbar → «ungültig»; Spanne → Rand laut `spanne`. */
function betrag(wert, name, spanne) {
  if (wert == null || (typeof wert === 'string' && !wert.trim())) return { ok: false, grund: `${name} unbekannt` };
  const s = parseSpanne(wert);
  if (!s.ok) return { ok: false, grund: `${name} ungültig (${s.grund})` };
  return { ok: true, wert: spanne === 'min' ? s.min : s.max, spanne: s.spanne };
}

// ───────────────────────── Preis aus Kosten ─────────────────────────

/**
 * Kern der Regel: Preis aus dem Einstand in CHF (so wie ihn der Shop als `unitCost` führt — auch als Text «13.05»).
 * @returns {{ok:true, kosten:number, preis:number, regel:'aufschlag'|'untergrenze'} | {ok:false, grund:string}}
 *   `regel` = 'untergrenze', wenn Einstand × Aufschlag die Untergrenze nicht übersteigt.
 */
export function preisAusKosten(kostenChf, opt) {
  const k = konfig(opt);
  const b = betrag(kostenChf, 'Kosten', 'max');
  if (!b.ok) return b;
  if (b.spanne) return { ok: false, grund: 'Kosten als Spanne' };
  const kosten = runde2(b.wert);
  if (!(kosten >= 0.01)) return { ok: false, grund: 'Kosten unter einem Rappen' };
  const roh = kosten * k.aufschlag;
  const regel = roh <= k.preisMin + EPS ? 'untergrenze' : 'aufschlag';
  return { ok: true, kosten, preis: aufrunden90(Math.max(k.preisMin, roh)), regel };
}

/** Rechnet EINE Variante/ein Produkt aus EK und Fracht (USD). Daten ungültig → ok:false; Konfiguration `k` ist schon geprüft. */
function rechne({ ekUsd, frachtUsd, kurs }, k) {
  const ek = betrag(ekUsd, 'EK', k.spanne);
  if (!ek.ok) return leer(ek.grund);
  if (!(ek.wert > 0)) return leer('EK nicht positiv');
  const fr = betrag(frachtUsd, 'Fracht', k.spanne);
  if (!fr.ok) return leer(fr.grund);
  if (kurs == null || (typeof kurs === 'string' && !kurs.trim())) return leer('Kurs unbekannt');
  if (!istZahl(kurs) || kurs <= 0) return leer(`Kurs ungültig: ${String(kurs)}`);

  const einstandUsd = ek.wert + fr.wert;
  const p = preisAusKosten(einstandUsd * kurs, { aufschlag: k.aufschlag, preisMin: k.preisMin });
  if (!p.ok) return leer(p.grund);
  const marge = margeVon(p.preis, p.kosten);

  const flaggen = [];
  if (!margeErreicht(marge, MARGE_WARN)) flaggen.push('marge_unter_30');
  if (fr.wert > ek.wert + EPS) flaggen.push('fracht_dominiert');
  if (fr.wert <= EPS) flaggen.push('fracht_null');
  if (ek.spanne || fr.spanne) flaggen.push('spanne');
  if (kurs < KURS_PLAUSIBEL.min || kurs > KURS_PLAUSIBEL.max) flaggen.push('kurs_ungewoehnlich');

  return {
    ok: true, kosten: p.kosten, preis: p.preis, marge, regel: p.regel, mengenrabatt: mengenrabattStufe(marge),
    preisProStueck: runde2(p.preis / k.stueck), stueck: k.stueck,
    ekUsd: ek.wert, frachtUsd: fr.wert, einstandUsd, frachtAnteil: fr.wert / einstandUsd, flaggen,
  };
}

/**
 * Preis für ein NEUES Produkt (oder eine einzelne Variante) aus EK und Fracht.
 * @param {object} a
 * @param {number|string} a.ekUsd      CJ-Einkaufspreis in USD (Zahl, Text oder Spanne «4.34 -- 5.44»)
 * @param {number|string} a.frachtUsd  gemessene Fracht CN → CH in USD (Pflicht: unbekannt = ok:false; 0 ist erlaubt, trägt aber die Flagge fracht_null)
 * @param {number} a.kurs              CHF je USD (Pflicht, keine versteckte Vorgabe; siehe USD_CHF)
 * @param {number} [a.aufschlag=AUFSCHLAG]  @param {number} [a.preisMin=PREIS_MIN]  (die Untergrenze wird wie jeder Preis auf x.90 aufgerundet: 16 → 16.90)
 * @param {number} [a.stueck=1]        Stück im Angebot (Set/Packung): `preisProStueck` = Preis / stueck, für den Marktvergleich des Orchestrators
 * @param {'max'|'min'} [a.spanne='max']  Rand einer Spanne; 'max' ist die sichere Wahl (kein Verlust bei der teuersten Ausführung)
 * @returns {{ok:true, kosten:number, preis:number, marge:number, regel:'aufschlag'|'untergrenze', mengenrabatt:'a'|'b'|null,
 *   preisProStueck:number, stueck:number, ekUsd:number, frachtUsd:number, einstandUsd:number, frachtAnteil:number, flaggen:string[]}
 *   (kosten = unitCost, wie ihn der Shop führt · ekUsd/frachtUsd = die verwendeten Werte, bei einer Spanne der Rand · frachtAnteil = Fracht / Einstand)
 *   | {ok:false, grund:string, kosten:null, preis:null, marge:null, regel:null, mengenrabatt:null, preisProStueck:null, flaggen:[]}}
 */
export function preisNeu(a) {
  return rechne(a ?? {}, konfig(a));
}

// ───────────────────────── Mehrere Varianten ─────────────────────────

/**
 * Preise für alle Varianten eines neuen Produkts, mit derselben Logik wie der Auswahl-Lauf (`preisFuer` aus cj_varianten.mjs):
 *  - Basis ist die Variante mit dem kleinsten Einstand (EK + Fracht). Ihr Preis ist der der Einzelregel (`preisNeu`) und der Mindestpreis.
 *  - Jede andere Variante: `preisFuer({ basisPreis, basisKostenChf, ekBasisUsd, ekUsd })` — gleiches Verhältnis Preis/Kosten wie die Basis;
 *    ein Mehr-Einstand bis 5 Rappen kostet nichts extra. Übergeben wird der EINSTAND in USD (EK + Fracht), damit auch unterschiedliche Fracht je Variante zählt.
 *  - Der Preis steigt monoton mit dem Einstand; keine Variante ist billiger als die Basis.
 *
 * `opt.verhaeltnis` — welches Verhältnis Preis/Kosten die Basis weitergibt:
 *  - 'regel' (Vorgabe): das der Basis, ausser sie liegt auf der Untergrenze. Dann zählt das der Regel (Aufschlag), nicht das durch die Untergrenze aufgeblähte.
 *    Grund (GEMESSEN 27.10.2026 an 25 532 Shop-Produkten mit mehreren Varianten): liegt die billigste Variante auf der Untergrenze (Einstand 5–9 CHF → Preis 14.90 =
 *    Verhältnis 1,7–2,8), erbt jede teurere Variante dieses Verhältnis — Festplatten-Programmer: Variante mit Einstand 256.60 würde 544.90 statt 372.90 (Einzelregel).
 *    Liegt die Basis über der Untergrenze, ist das Ergebnis mit 'basis' IDENTISCH.
 *  - 'basis': das tatsächliche Verhältnis der Basis, genau wie der Auswahl-Lauf es für ein bestehendes Produkt rechnet.
 *
 * @param {{vid?:string, ekUsd?:number|string, variantSellPrice?:number|string, frachtUsd?:number|string}[]} varianten
 *   EK aus `ekUsd`, sonst aus dem CJ-Feld `variantSellPrice`; Fracht aus `frachtUsd`, sonst aus `opt.frachtUsd` (gemeinsam für das Produkt).
 * @param {object} opt  `kurs` (Pflicht), `frachtUsd`, `aufschlag`, `preisMin`, `stueck`, `spanne`, `verhaeltnis`
 * @returns {{ok:boolean, grund?:string, basisIndex:number|null, minPreis:number|null, maxPreis:number|null, margeMin:number|null, mengenrabatt:'a'|'b'|null,
 *   flaggen:string[], ungueltig:number[], varianten:object[]}}
 *   Je Variante zusätzlich `regelPreis` (was die Einzelregel allein gäbe) und `regel`: 'aufschlag'/'untergrenze' (nur die Basis), 'verhaeltnis' oder 'mindestpreis'.
 *   `ok` nur, wenn JEDE Variante gepreist werden konnte; sonst stehen die gültigen trotzdem darin (der Aufrufer entscheidet: weglassen oder verwerfen).
 */
export function preiseFuerVarianten(varianten, opt) {
  opt = opt ?? {};
  const k = konfig(opt);
  const zu = (grund, rows = []) => ({ ok: false, grund, basisIndex: null, minPreis: null, maxPreis: null, margeMin: null, mengenrabatt: null, flaggen: [], ungueltig: rows.map(r => r.index), varianten: rows });
  if (!Array.isArray(varianten) || !varianten.length) return zu('keine Varianten');

  const rows = varianten.map((v, index) => {
    const einzel = rechne({ ekUsd: v?.ekUsd ?? v?.variantSellPrice, frachtUsd: v?.frachtUsd ?? opt.frachtUsd, kurs: opt.kurs }, k);
    return { index, vid: v?.vid ?? null, ...einzel };
  });
  const gut = rows.filter(r => r.ok);
  if (!gut.length) return zu(`keine Variante preisbar: ${rows[0].grund}`, rows);

  // Basis = kleinster Einstand; bei Gleichstand die erste.
  const basis = gut.reduce((b, r) => (r.einstandUsd < b.einstandUsd - EPS ? r : b), gut[0]);
  // Verhältnis Preis/Kosten, das die Basis weitergibt (siehe Doku): auf der Untergrenze nur mit Vorgabe 'basis' das aufgeblähte
  const verhaeltnisPreis = (k.verhaeltnis === 'basis' || basis.regel !== 'untergrenze') ? basis.preis : basis.kosten * k.aufschlag;
  for (const r of gut) {
    r.regelPreis = r.preis;                                            // was die Einzelregel allein gäbe (für den Vergleich)
    if (r === basis) { r.basis = true; continue; }
    const f = preisFuer({ basisPreis: verhaeltnisPreis, basisKostenChf: basis.kosten, ekBasisUsd: basis.einstandUsd, ekUsd: r.einstandUsd, usdChf: opt.kurs });
    if (!f.ok) throw new Error(`preisFuer lehnt die Basis ab: ${f.grund}`);   // kann bei geprüften Eingaben nicht vorkommen
    r.preis = Math.max(basis.preis, f.preis);                          // Mindestpreis = Preis der Basis (fängt auch den ungerundeten Rückgabewert bei ≤ 5 Rappen Mehr-Einstand ab)
    r.regel = r.preis === basis.preis ? 'mindestpreis' : 'verhaeltnis';
    r.marge = margeVon(r.preis, r.kosten);
    r.mengenrabatt = mengenrabattStufe(r.marge);
    r.preisProStueck = runde2(r.preis / k.stueck);
    r.flaggen = r.flaggen.filter(x => x !== 'marge_unter_30');
    if (!margeErreicht(r.marge, MARGE_WARN)) r.flaggen.unshift('marge_unter_30');
  }

  const preise = gut.map(r => r.preis), margeMin = Math.min(...gut.map(r => r.marge));
  const ungueltig = rows.filter(r => !r.ok).map(r => r.index);
  return {
    ok: !ungueltig.length,
    ...(ungueltig.length ? { grund: `${ungueltig.length} von ${rows.length} Varianten ohne gültigen Einstand` } : {}),
    basisIndex: basis.index, minPreis: Math.min(...preise), maxPreis: Math.max(...preise),
    margeMin, mengenrabatt: mengenrabattStufe(margeMin),
    flaggen: [...new Set(gut.flatMap(r => r.flaggen))], ungueltig, varianten: rows,
  };
}
