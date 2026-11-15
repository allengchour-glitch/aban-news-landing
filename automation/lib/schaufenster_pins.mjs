/**
 * Schaufenster-Pins: handverlesene Produkte, die auf einer Kategorieseite auf den Plätzen 1 bis 4 stehen sollen (Weihnachts-Schaufenster 11.11.2026).
 * Liest und prüft die Pin-Datei (Vorgabe dropship/kategorie-schaufenster-pins.json, Umgebungsvariable PINS). Getestet: schaufenster_pins_test.mjs.
 * Dazu zwei kleine Abfragen für die Sichtbarkeit im Onlineshop (onlineStoreId, unsichtbarePins; q wird übergeben, kein eigenes Netz).
 *
 * Format: { version: 1, kategorien: { <handle>: { modus: 'reihenfolge' | 'kopf', produkte: [{ id: 'gid://shopify/Product/…', handle, … }], datum, grund } } }
 *   · modus «reihenfolge»: verfuegbar_zuerst.mjs und bewertung_zuerst.mjs halten die Produkte vorn (Rechnung in verfuegbar_rang.mjs).
 *   · modus «kopf»: nur ein Vorschlag für das Collection-Metafeld luxe.kopf_produkte (Kopf-Fotos); die Sortierskripte lassen diese Kategorie, wie sie ist.
 *
 * Fehlt die Datei, verhalten sich die Skripte wie vorher (fehlt: true, keine Fehler). Ist sie unlesbar oder ein Eintrag fehlerhaft, steht das in `fehler`;
 * ein fehlerhafter Eintrag wird NICHT verwendet (lieber kein Pin als ein falscher). Mehr als MAX_PINS Produkte in einem Eintrag sind ein Fehler, kein Abschneiden:
 * eine Liste mit 10 Produkten ist ein Versehen, kein Wunsch.
 */
import { readFileSync, existsSync } from 'node:fs';

export const MAX_PINS = 4;
export const PIN_STANDARD = 'dropship/kategorie-schaufenster-pins.json';
export const MODI = ['reihenfolge', 'kopf'];
const PRODUKT_GID = /^gid:\/\/shopify\/Product\/\d+$/;

/** Prüft das eingelesene Objekt. Rein. Liefert { reihenfolge: Map<handle, id[]>, kopf: Map<handle, id[]>, fehler: string[] }. */
export function pinsAus(obj) {
  const reihenfolge = new Map(), kopf = new Map(), fehler = [];
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { reihenfolge, kopf, fehler: ['Pin-Datei: kein JSON-Objekt'] };
  if (obj.version !== 1) fehler.push(`Pin-Datei: version ${JSON.stringify(obj.version)} unbekannt (erwartet 1)`);
  const k = obj.kategorien;
  if (!k || typeof k !== 'object' || Array.isArray(k)) { fehler.push('Pin-Datei: «kategorien» fehlt oder ist kein Objekt'); return { reihenfolge, kopf, fehler }; }
  if (fehler.length) return { reihenfolge, kopf, fehler };
  for (const [handle, e] of Object.entries(k)) {
    const f = [];
    if (!handle.trim()) f.push('leerer Handle');
    if (!e || typeof e !== 'object' || Array.isArray(e)) { fehler.push(`${handle}: Eintrag ist kein Objekt`); continue; }
    if (!MODI.includes(e.modus)) f.push(`modus ${JSON.stringify(e.modus)} unbekannt (erlaubt: ${MODI.join(', ')})`);
    if (!Array.isArray(e.produkte) || e.produkte.length === 0) f.push('keine Produkte');
    else {
      if (e.produkte.length > MAX_PINS) f.push(`${e.produkte.length} Produkte, höchstens ${MAX_PINS}`);
      const ids = e.produkte.map(p => (p && typeof p === 'object') ? p.id : p);
      ids.forEach((id, i) => { if (typeof id !== 'string' || !PRODUKT_GID.test(id)) f.push(`Produkt ${i + 1}: ID ${JSON.stringify(id)} ist keine Produkt-GID`); });
      const doppelt = ids.filter((id, i) => ids.indexOf(id) !== i);
      if (doppelt.length) f.push(`doppelt: ${[...new Set(doppelt)].join(', ')}`);
    }
    if (f.length) { for (const x of f) fehler.push(`${handle}: ${x}`); continue; }
    (e.modus === 'reihenfolge' ? reihenfolge : kopf).set(handle, e.produkte.map(p => p.id));
  }
  return { reihenfolge, kopf, fehler };
}

/**
 * Sichtbarkeit (15.11.2026): ID des Kanals «Online Store» oder null (dann wird die Sichtbarkeit der Pins nicht geprüft; das Skript sagt es).
 * q = Abfrage-Funktion (query, variables) → data. Netzfehler werden NICHT geschluckt, der Aufrufer entscheidet.
 */
export async function onlineStoreId(q) {
  const ps = (await q(`query{publications(first:50){nodes{id name}}}`)).publications.nodes;
  return (ps.find(p => p.name === 'Online Store') || {}).id || null;
}

/** Gepinnte Produkte, die NICHT im Onlineshop veröffentlicht sind (Set der IDs). Ohne Kanal-ID oder ohne Pins: leeres Set, keine Abfrage. */
export async function unsichtbarePins(q, pins, osId) {
  if (!osId || !pins.length) return new Set();
  const n = (await q(`query($ids:[ID!]!,$p:ID!){nodes(ids:$ids){... on Product{id publishedOnPublication(publicationId:$p)}}}`, { ids: pins, p: osId })).nodes;
  return new Set(n.filter(p => p && p.publishedOnPublication === false).map(p => p.id));
}

/**
 * Liest die Pin-Datei. Fehlt sie: { fehlt: true, … leer, fehler: [] } — Verhalten wie ohne Pins.
 * Unlesbar oder kein JSON: { fehlt: false, … leer, fehler: [Grund] }.
 */
export function ladePins(pfad = PIN_STANDARD, { lesen = readFileSync, gibtEs = existsSync } = {}) {
  if (!gibtEs(pfad)) return { pfad, fehlt: true, reihenfolge: new Map(), kopf: new Map(), fehler: [] };
  let obj;
  try { obj = JSON.parse(lesen(pfad, 'utf8')); } catch (e) { return { pfad, fehlt: false, reihenfolge: new Map(), kopf: new Map(), fehler: [`Pin-Datei ${pfad} unlesbar: ${e.message}`] }; }
  return { pfad, fehlt: false, ...pinsAus(obj) };
}
