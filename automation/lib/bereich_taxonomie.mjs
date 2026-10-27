/**
 * Bereichs-Taxonomie «Rest des Shops» (Schmuck, später Handy, Computer, Spielzeug …) als Kategorien der Engine in kategorien.mjs.
 *
 * Quelle der Regeln: eine Bereichsdatei dropship/taxonomie-2610-b/bereiche/<datei>.json (Aufbau und Regelsprache: dropship/taxonomie-2610-b/SPEC.md).
 * Die Auswertung ist dieselbe Funktion wie im Messwerkzeug (`passt` / `imUnterfilter` aus dropship/taxonomie-2610-b/kern.mjs): was messen.mjs zählt,
 * landet hier in der Kategorie. Anders als bei Mode (mode_taxonomie.mjs) gibt es kein Geschlecht und keine Google-Korrektur; die Sperr-Tags
 * (Erwachsene, Fortura, Lizenz …) schliesst kern.mjs aus, gehoertIn() zusätzlich.
 *
 * Zwei Ebenen wie bei Mode: Kategorie (Tag `sort-<handle>`, id `s-<handle>`) und Unterfilter (Tag `sort-<unterfilter-handle>`, `filter: true`,
 * `eltern_id`; wirkt NUR auf Produkte der Kategorie, Chip-Zeile auf der Kategorieseite).
 *
 * Auswahl: die Datei kennt «Gruppen» (Menüköpfe). Es werden nur die Kinder der gewählten Gruppen gebaut (ENV BEREICH_GRUPPEN, kommagetrennt;
 * Vorgabe: die 14 Schmuck-Gruppen). Nicht gebaut werden
 *   - Kinder, die in der Datei nicht unter «kategorien» stehen: das sind vorhandene Collections des Shops (sub-ringe, broschen-pins …),
 *     die nur im Baum eingeordnet werden. Ihre Regel und ihr Tag bleiben, wie sie sind (kategorien.mjs: BASIS_KATEGORIEN),
 *   - Kinder, die auch in einer NICHT gewählten Gruppe eines anderen Menüastes stehen (`menue_oben`, hier «Uhren»): sie gehören dem anderen Ast
 *     (herrenuhren steht in «Schmuck für Herren» UND «Uhren für Herren, Damen & Kinder»; der Schmuck-Ast zeigt keine Uhren).
 *
 * ENV: BEREICH_DATEI (Vorgabe schmuck-uhren) · BEREICH_GRUPPEN · BEREICH_PRAEFIX (Vorgabe s-, id-Präfix)
 * Eingebunden wird SCHMUCK in KATEGORIEN nur mit SCHMUCK=1 (kategorien.mjs); ohne den Schalter laufen alle bisherigen Läufe unverändert.
 */
import { readFileSync } from 'node:fs';
import { passt, imUnterfilter, normiere as normiereKern, HANDLE_RE } from '../../dropship/taxonomie-2610-b/kern.mjs';
import { bereinigeBeschreibung, seo } from './mode_taxonomie.mjs';

/** Standard-Bereichsdatei. Der Dateiname steht als Text im Modul, damit grind2.mjs (planDateien) die Datei zum Stand des Plans zählt und der Plan-Test sie mitkopiert. */
const STANDARD_DATEI = 'schmuck-uhren.json';

/** Die 14 Gruppen, die im Hauptmenü unter «Schmuck» hängen (die sechs uhren-*-Gruppen gehören zum Menüast «Uhren»). */
export const SCHMUCK_GRUPPEN = ['ringe-gruppe', 'ringe-form-gruppe', 'ohrringe-gruppe', 'ohrringe-material-gruppe', 'ketten-gruppe', 'ketten-material-gruppe',
  'armbaender-gruppe', 'armbaender-material-gruppe', 'schmuck-herren-gruppe', 'schmuck-personalisiert-gruppe', 'schmuck-motiv-gruppe', 'schmuck-stil-gruppe',
  'schmuck-zubehoer-gruppe', 'schmuck-sets-gruppe'];

export function ladeBereich(datei = STANDARD_DATEI) {
  const name = String(datei).replace(/\.json$/, '');
  if (!HANDLE_RE.test(name)) throw new Error(`Bereichsdatei «${datei}»: nur a-z, 0-9, Bindestrich`);
  return JSON.parse(readFileSync(new URL(`../../dropship/taxonomie-2610-b/bereiche/${name}.json`, import.meta.url), 'utf8'));
}

/**
 * Welche Kategorien der Datei werden für die gewählten Gruppen gebaut?
 * @returns {{gewaehlt: object[], bauen: object[], ausgelassen: {handle:string, grund:string}[], bestehend: string[]}}
 *   bauen = Datensätze aus `kategorien` (Reihenfolge der Gruppen, ohne Doppelte), bestehend = Kinder ohne eigenen Datensatz (vorhandene Collections)
 */
export function waehleKategorien(B, gruppen) {
  const alle = new Map((B.gruppen || []).map(g => [g.handle, g]));
  for (const h of gruppen) if (!alle.has(h)) throw new Error(`Gruppe «${h}» steht nicht in der Bereichsdatei «${B.bereich}»`);
  const gewaehlt = gruppen.map(h => alle.get(h));
  const oben = B.menue?.oben;
  const fremd = new Map();
  for (const g of B.gruppen || []) if (!gruppen.includes(g.handle) && g.menue_oben && g.menue_oben !== oben) for (const h of g.kinder) if (!fremd.has(h)) fremd.set(h, g.menue_oben);
  const kat = new Map((B.kategorien || []).map(k => [k.handle, k]));
  const bauen = [], ausgelassen = [], bestehend = [], gesehen = new Set();
  for (const g of gewaehlt) for (const h of g.kinder) {
    if (gesehen.has(h)) continue;
    gesehen.add(h);
    if (!kat.has(h)) bestehend.push(h);
    else if (fremd.has(h)) ausgelassen.push({ handle: h, grund: `gehört zum Menüast «${fremd.get(h)}»` });
    else bauen.push(kat.get(h));
  }
  return { gewaehlt, bauen, ausgelassen, bestehend };
}

/** Längster Suchmaschinen-Titel (Google kürzt darüber ab; Mode: höchstens 64). */
export const SEO_TITEL_MAX = 60;
/** «<Titel> online kaufen | LuxeStyle CH»; passt das nicht in SEO_TITEL_MAX Zeichen, entfällt erst die Marke, dann «online kaufen». */
export function seoTitel(titel) {
  for (const s of [`${titel} online kaufen | LuxeStyle CH`, `${titel} online kaufen`, titel]) if (s.length <= SEO_TITEL_MAX) return s;
  return titel;
}

function baue(B, datei, praefix, k) {
  const eigen = p => passt(k, normiereKern(p));
  const beschr = bereinigeBeschreibung(k.beschreibung) || `${k.titel} aus unserem Sortiment.`;
  const kat = { id: `${praefix}${k.handle}`, handle: k.handle, titel: k.titel, tag: `sort-${k.handle}`, min: 15, bestehend: false, aus_datei: datei, bereich: B.bereich,
    beschreibung: beschr, seoTitel: seoTitel(k.titel), seoBeschreibung: seo(k.titel, beschr), passt: eigen };
  const filter = (k.unterfilter || []).map(u => {
    // Der Chip-Titel trägt den Bezug zur Eltern-Kategorie selbst («Herz-Ringe», «Silber-Ohrstecker»): er ist zugleich Seitenüberschrift der Chip-Collection
    // und kommt höchstens zweimal vor (getestet). Die Chip-Zeile zeigt denselben Titel.
    const b = `${u.titel} aus unserer Auswahl «${k.titel}».`;
    return { id: `${praefix}${u.handle}`, handle: u.handle, titel: u.titel, tag: `sort-${u.handle}`, min: 15, bestehend: false, aus_datei: datei, filter: true, eltern_id: kat.id, bereich: B.bereich,
      beschreibung: b, seoTitel: seoTitel(u.titel), seoBeschreibung: seo(u.titel, ''),
      passt: p => { const q = normiereKern(p); return passt(k, q) && imUnterfilter(u, q); } };
  });
  return [kat, ...filter];
}

/** Das Orakel der Tests (Trefferzahl je Kategorie und Chip aus dem Messwerkzeug, Katalogstand 26.10.2026 20:14). */
export const ladeOrakel = () => JSON.parse(readFileSync(new URL('../../dropship/taxonomie-2610-b/orakel/schmuck-orakel.json', import.meta.url), 'utf8'));

/**
 * Vergleich frisch gezählter Mitglieder mit dem Orakel: wo hat sich der Katalog seit dem Schnappschuss verschoben?
 * Gegenlesung 27.10.2026: Das Orakel stammt aus demselben `kern.passt()` wie der Adapter und aus einem 26 Stunden alten Katalog; es fängt Verdrahtungsfehler, keinen Katalogdrift.
 * Vor jedem LIVE-Lauf zählt kategorien_anlegen.mjs (SCHMUCK=1) mit dem frischen Katalog und zeigt hier die Abweichungen.
 * @param {Record<string, number>} zahlen  { handle: frisch gezählte Mitglieder } für Kategorien und Chips
 * @returns {{handle:string, alt:number, neu:number, diff:number}[]}  nur Abweichungen über `prozent` UND `mindest` Produkte, grösste zuerst; Handles ohne Orakel-Eintrag fehlen
 */
export function orakelAbweichungen(zahlen, orakel, { prozent = 10, mindest = 3 } = {}) {
  const aus = [];
  for (const [handle, neu] of Object.entries(zahlen)) {
    const alt = orakel.kategorien?.[handle]?.n ?? orakel.unterfilter?.[handle];
    if (typeof alt !== 'number') continue;
    const diff = neu - alt;
    if (Math.abs(diff) >= mindest && Math.abs(diff) >= alt * prozent / 100) aus.push({ handle, alt, neu, diff });
  }
  return aus.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
}

const vorgabeDatei = () => (process.env.BEREICH_DATEI || STANDARD_DATEI).replace(/\.json$/, '');
const vorgabeGruppen = () => process.env.BEREICH_GRUPPEN ? process.env.BEREICH_GRUPPEN.split(',').map(s => s.trim()).filter(Boolean) : SCHMUCK_GRUPPEN;

/**
 * Bereichsdatei → Engine-Kategorien (Kategorie, direkt danach ihre Unterfilter).
 * @param {{datei?:string, gruppen?:string[], praefix?:string}} opt
 */
export function baueBereich({ datei = vorgabeDatei(), gruppen = vorgabeGruppen(), praefix = process.env.BEREICH_PRAEFIX || 's-' } = {}) {
  const B = ladeBereich(datei);
  return waehleKategorien(B, gruppen).bauen.flatMap(k => baue(B, datei, praefix, k));
}

/** Auswahl samt Auslassungen und vorhandenen Kindern (für Berichte und Tests): { B, gewaehlt, bauen, ausgelassen, bestehend }. */
export function bereichAuswahl({ datei = vorgabeDatei(), gruppen = vorgabeGruppen() } = {}) {
  const B = ladeBereich(datei);
  return { B, ...waehleKategorien(B, gruppen) };
}

export const SCHMUCK = baueBereich();
