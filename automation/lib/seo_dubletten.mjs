/**
 * Doppelte Seitentitel bei Sammlungen finden und auflösen (Sichtbarkeit bei Google).
 *
 * WARUM (28.10.2026, Messung über alle 1 101 Sammlungen): 68 Seitentitel kamen mehrfach vor, 147 Sammlungen waren betroffen. 50 davon sind Damen/Herren-Paare der Mode-Taxonomie,
 * deren Titel das Geschlecht nicht nennt («Jeans online kaufen | LuxeStyle CH» bei damen-jeans UND herren-jeans). Dazu kamen die frisch angelegten Rucksack-Chips («Wasserdicht» fünfmal).
 * Gleiche Titel auf mehreren Seiten schwächen jede davon bei Google; ein Indexierungsantrag auf eine Seite mit Dubletten-Titel verpufft zum Teil.
 *
 * Diese Datei ist rein (kein Netz, getestet in seo_dubletten_test.mjs):
 *  - `geschlechtsPlan(sammlungen)`: für Gruppen gleicher Titel, deren Mitglieder ein Geschlecht im Handle tragen (damen-/herren-/kinder-), wird der SEO-Titel zu «<Titel> für Damen|Herren|Kinder»
 *    (nur `seo.title`, die Überschrift der Seite bleibt). Eine Gruppe wird nur geändert, wenn danach KEIN Titel mehr doppelt ist; sonst steht sie unter `offen`.
 *  - `chipPlan(chips, sammlungen)`: Rucksack-Chips (Bereichsdatei rucksaecke.json) bekommen Titel, SEO-Titel und Beschreibung aus der Datei, wenn die Sammlung im Shop davon abweicht.
 */
import { seoTitel } from './bereich_taxonomie.mjs';

const MARKE = /\s*\|\s*LuxeStyle(?: CH| Schweiz)?\s*$/i;
const SUFFIX = /\s+online kaufen\s*$/i;

/** Der Titel ohne «online kaufen» und ohne Marke: «Jeans online kaufen | LuxeStyle CH» → «Jeans». */
export const grundTitel = t => String(t ?? '').replace(MARKE, '').replace(SUFFIX, '').trim();
/** Das Geschlecht aus dem Handle (damen-, herren-, kinder-, auch kinder-baby-); sonst null. */
export const geschlechtVon = handle => /^damen-/.test(handle) ? 'Damen' : /^herren-/.test(handle) ? 'Herren' : /^kinder-/.test(handle) ? 'Kinder' : null;
/** Der Titel, den Google zu sehen bekommt: der eigene SEO-Titel, sonst der Sammlungstitel. */
export const wirksamerTitel = c => (c.seo?.title || c.title || '').trim();
/** Vergleichsform: ohne Marke und «online kaufen», klein, ohne Emoji und Satzzeichen. */
export const norm = t => grundTitel(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/**
 * Titel, die sich aus dem Handle allein nicht auflösen lassen (gleiches Geschlecht, Titel ohne Oberbegriff: «Kurzarm» bei Poloshirts UND T-Shirts).
 * Nur der SEO-Titel wird gesetzt; die Überschrift der Seite («Kurzarm») bleibt, bis ein Mensch sie ändert.
 */
export const MANUELL = {
  'herren-poloshirts-kurzarm': 'Poloshirts kurzarm für Herren',
  'herren-poloshirts-langarm': 'Poloshirts langarm für Herren',
  'herren-t-shirts-kurzarm': 'T-Shirts kurzarm für Herren',
  'herren-t-shirts-langarm': 'T-Shirts langarm für Herren',
};

const mitProdukten = c => (c.productsCount?.count ?? c.produkte ?? 0) > 0;
/** Nennt der Titel das Geschlecht schon, auch als Wortteil («Herrenuhren», «Damenschuhe»)? Dann bekommt er keinen Zusatz «für …». */
const nennt = (titel, g) => new RegExp(g, 'iu').test(titel);

/** Gruppen gleicher wirksamer Titel (nur Sammlungen mit Produkten), mindestens zwei Mitglieder. @returns {Map<string, object[]>} */
export function dublettenGruppen(sammlungen) {
  const g = new Map();
  for (const c of sammlungen.filter(mitProdukten)) { const k = norm(wirksamerTitel(c)); if (k) (g.get(k) || g.set(k, []).get(k)).push(c); }
  return new Map([...g].filter(([, l]) => l.length > 1));
}

/**
 * @returns {{aenderungen: {handle:string, id:string, alt:string, neu:string, beschreibung:string|null}[], offen: {titel:string, handles:string[], grund:string}[]}}
 */
export function geschlechtsPlan(sammlungen) {
  const gruppen = dublettenGruppen(sammlungen);
  const alleTitel = new Map();
  for (const c of sammlungen.filter(mitProdukten)) { const k = norm(wirksamerTitel(c)); alleTitel.set(k, (alleTitel.get(k) || 0) + 1); }
  const aenderungen = [], offen = [];
  for (const [titelKey, l] of gruppen) {
    const mitG = l.filter(c => geschlechtVon(c.handle));
    if (!mitG.length) { offen.push({ titel: titelKey, handles: l.map(c => c.handle), grund: 'kein Mitglied trägt ein Geschlecht im Handle' }); continue; }
    const neu = new Map();
    for (const c of mitG) {
      const g = geschlechtVon(c.handle), basis = grundTitel(wirksamerTitel(c));
      neu.set(c.handle, MANUELL[c.handle] ? seoTitel(MANUELL[c.handle]) : nennt(basis, g) ? wirksamerTitel(c) : seoTitel(`${basis} für ${g}`));
    }
    // Danach darf in der Gruppe nichts mehr doppelt sein, und kein neuer Titel darf einen fremden, schon vorhandenen Titel treffen.
    const endgueltig = l.map(c => norm(neu.get(c.handle) ?? wirksamerTitel(c)));
    const doppelt = new Set(endgueltig).size !== endgueltig.length;
    const fremd = mitG.some(c => { const k = norm(neu.get(c.handle)); return k !== titelKey && (alleTitel.get(k) || 0) > 0; });
    if (doppelt || fremd) { offen.push({ titel: titelKey, handles: l.map(c => c.handle), grund: doppelt ? 'nach dem Zusatz bliebe ein Titel doppelt (gleiches Geschlecht mehrfach)' : 'der neue Titel gäbe es schon' }); continue; }
    for (const c of mitG) {
      const alt = wirksamerTitel(c), n = neu.get(c.handle);
      if (n !== alt) aenderungen.push({ handle: c.handle, id: c.id, alt, neu: n, beschreibung: c.seo?.description ?? null });
    }
  }
  return { aenderungen, offen };
}

/**
 * Chips der Bereichsdatei: gewünschte Felder (aus lib/bereich_taxonomie.mjs `baue()`) gegen den Shop.
 * @param chips        Engine-Einträge mit filter:true ({handle, titel, beschreibung, seoTitel, seoBeschreibung})
 * @param sammlungen   [{handle, id, title, descriptionHtml, seo:{title, description}}] aus dem Shop
 * @returns {{aenderungen: object[], fehlt: string[]}}
 */
/** HTML-Entities angleichen: Shopify gibt «&» in der Beschreibung als «&amp;» zurück; ein Vergleich der Rohtexte meldete 5 Chips fälschlich als abweichend. */
export const entschaerfe = t => String(t ?? '').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function chipPlan(chips, sammlungen) {
  const shop = new Map(sammlungen.map(c => [c.handle, c]));
  const aenderungen = [], fehlt = [];
  for (const k of chips) {
    const c = shop.get(k.handle);
    if (!c) { fehlt.push(k.handle); continue; }
    const soll = { title: k.titel, descriptionHtml: `<p>${k.beschreibung}</p>`, seoTitle: k.seoTitel, seoDescription: k.seoBeschreibung };
    const ist = { title: c.title, descriptionHtml: c.descriptionHtml ?? '', seoTitle: c.seo?.title ?? '', seoDescription: c.seo?.description ?? '' };
    const felder = Object.keys(soll).filter(f => entschaerfe(soll[f]) !== entschaerfe(ist[f]));
    if (felder.length) aenderungen.push({ handle: k.handle, id: c.id, felder, alt: ist, neu: soll });
  }
  return { aenderungen, fehlt };
}

/**
 * Gleiche SEO-BESCHREIBUNG bei Sammlungen (09.11.2026). Messung über 1 720 Sammlungen mit Produkten: 35 Gruppen mit gleicher Beschreibung, 75 Sammlungen; 23 Gruppen sind Damen-/Herren-/Kinder-Gruppen,
 * deren SEO-TITEL sich seit dem 28.10. unterscheiden («Hosen für Herren online kaufen»), deren Beschreibung aber die Vorlage «Hosen online kaufen. Lieferung …» geblieben ist (Audit-Werkzeuge zählen das als doppelte Meta-Beschreibung).
 * Regel: nur die Vorlage «<Gegenstand> online kaufen. <Rest>»; Mitglieder mit Geschlecht im Handle bekommen «<Gegenstand> für <Geschlecht> online kaufen. <Rest>».
 * Eine Gruppe wird nur geändert, wenn danach KEINE Beschreibung mehr doppelt ist (je Geschlecht höchstens ein Mitglied, höchstens ein Mitglied ohne Geschlecht), keine neue Beschreibung eine schon vorhandene trifft
 * und jede höchstens 160 Zeichen hat. Sonst steht die Gruppe unter `offen` und bleibt unberührt. Rein, getestet.
 */
export const BESCHR_VORLAGE = /^(.+?) online kaufen\.(\s.+)$/s;
export const MAX_BESCHR = 160;
const beschr = c => String(c.seo?.description ?? '');
const normB = t => String(t ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

/** @returns {{aenderungen: {handle:string, id:string, alt:string, neu:string, titel:string|null}[], offen: {beschreibung:string, handles:string[], grund:string}[]}} */
export function beschreibungsPlan(sammlungen) {
  const gruppen = new Map(), alle = new Map();
  for (const c of sammlungen.filter(mitProdukten)) {
    const k = normB(beschr(c)); if (!k) continue;
    alle.set(k, (alle.get(k) || 0) + 1);
    (gruppen.get(k) || gruppen.set(k, []).get(k)).push(c);
  }
  const aenderungen = [], offen = [];
  for (const l of gruppen.values()) {
    if (l.length < 2) continue;
    const handles = l.map(c => c.handle), nein = grund => offen.push({ beschreibung: beschr(l[0]), handles, grund });
    const mitG = l.filter(c => geschlechtVon(c.handle)), ohneG = l.length - mitG.length;
    if (!mitG.length) { nein('kein Mitglied trägt ein Geschlecht im Handle'); continue; }
    if (new Set(mitG.map(c => geschlechtVon(c.handle))).size !== mitG.length) { nein('gleiches Geschlecht mehrfach'); continue; }
    if (ohneG > 1) { nein('mehrere Mitglieder ohne Geschlecht blieben gleich'); continue; }
    const neu = new Map(), passt = mitG.map(c => BESCHR_VORLAGE.exec(beschr(c)));
    if (passt.some(m => !m)) { nein('Beschreibung nicht nach der Vorlage «… online kaufen. …»'); continue; }
    mitG.forEach((c, i) => { const g = geschlechtVon(c.handle), m = passt[i]; neu.set(c.handle, nennt(m[1], g) ? beschr(c) : `${m[1]} für ${g} online kaufen.${m[2]}`); });
    const endgueltig = l.map(c => normB(neu.get(c.handle) ?? beschr(c)));
    if (new Set(endgueltig).size !== endgueltig.length) { nein('nach dem Zusatz bliebe eine Beschreibung doppelt'); continue; }
    const geaendert = mitG.filter(c => neu.get(c.handle) !== beschr(c));
    if (geaendert.some(c => neu.get(c.handle).length > MAX_BESCHR)) { nein(`eine neue Beschreibung hätte über ${MAX_BESCHR} Zeichen`); continue; }
    if (geaendert.some(c => alle.has(normB(neu.get(c.handle))))) { nein('die neue Beschreibung gibt es schon bei einer anderen Sammlung'); continue; }
    for (const c of geaendert) aenderungen.push({ handle: c.handle, id: c.id, alt: beschr(c), neu: neu.get(c.handle), titel: c.seo?.title ?? null });
  }
  return { aenderungen, offen };
}
