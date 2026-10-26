/**
 * Auswahl für die zweite Trend-Zeile „✨ Neu entdeckt": coole Ware, die noch NICHT gekauft wurde.
 *
 * WARUM (Auftrag 25.10.2026): die Reihe „🔥 Gerade im Trend" (`hype-jetzt`, `BEST_SELLING`) zeigt
 * seit dem 24.10. nur die gemessenen Verkäufer. Für den Umsatz war das richtig, aber der
 * Besitzer wollte daneben eine Zeile mit ANDEREN Dingen — damit die Startseite nicht nur
 * zeigt, was schon gekauft wurde. Dieses Modul entscheidet, was in diese zweite Zeile darf.
 *
 * Alles hier ist reine Logik ohne Netzaufruf; die Messung (Shopify, CJ-Fracht) macht
 * automation/trend_entdecken.mjs. Eine Schranke gehört hierher, nicht in das Skript, damit ihre
 * Gegenprobe ein Test sein kann.
 *
 * WAS „COOL" HIER HEISST — und was nicht: es gibt KEIN Verkaufsurteil über diese Ware (sie wurde
 * ja nie gekauft). Die Reihenfolge stammt aus Markierungen früherer Sitzungen (`kunden-liebling`,
 * `nachfrage-liebling`, `such-boost`, `hype-jetzt`, `video-hit`, `viral`) plus Marge. Das ist ein
 * Vorschlag, keine Messung. Darum schreibt der Bericht nie „Bestseller" über diese Zeile.
 */
import { pruefeProdukt } from './gmc_feed_item.mjs';

/** Gewicht einer Markierung für die Reihenfolge. Unbekannte Tags zählen 0. */
export const TAG_GEWICHT = Object.freeze({
  'kunden-liebling': 3,
  'nachfrage-liebling': 3,
  'such-boost': 2,
  'hype-jetzt': 2,
  'video-hit': 1,
  'viral': 1,
  'trend': 0.5,
  'neuheit': 0.3,
});

/** Tags, die eine Ware aus der Zeile nehmen, obwohl sie aktiv ist (Lieferung nicht belegt). */
export const LIEFER_SPERRE = /cj-nicht-versendbar-ch|cj-ausgelistet|lieferbarkeit-geprueft/i;

/** Tags, aus denen sich eine Warengruppe für die Vielfalt ablesen lässt (wenn kein productType). */
const KATEGORIE_TAGS = ['elektronik', 'gadget', 'gaming', 'kleid', 'kleider', 'mode', 'schmuck',
  'haushalt', 'kueche', 'wohnen', 'deko', 'beleuchtung', 'beauty', 'sport', 'fitness', 'outdoor',
  'auto', 'haustier', 'reise', 'garten', 'spielzeug', 'tech', 'uhren', 'taschen'];

/**
 * Jahreszeit: Sommerware im Herbst (oder Winterware im Sommer) gehört nicht in eine Zeile, die
 * „Neu entdeckt" heisst — gemessen am Trockenlauf vom 25.10.: Sommerhut und Sommermütze standen unter
 * den ersten sechzehn. Ohne `monat` wird nicht geprüft. April und September sind Übergang (keine Sperre).
 */
const SOMMER_WORT = /sommer|strand|bikini|badeanzug|badehose|badeshort|sandale|flip[- ]?flop|sonnenhut|sonnencreme|wasserpistole/i;
const WINTER_WORT = /winter|weihnacht|schneeanzug|thermo|fleece|handschuh|skijacke|daunen/i;
export function jahreszeitSperre(p = {}, monat) {
  if (!Number.isInteger(monat)) return null;
  const text = `${p.title || ''} ${(p.tags || []).join(' ')}`;
  if (monat >= 10 || monat <= 3) return (text.match(SOMMER_WORT) || [])[0] || null;
  if (monat >= 5 && monat <= 8) return (text.match(WINTER_WORT) || [])[0] || null;
  return null;
}

/** Rohmarge ist nur ein Vorfilter; die Ware muss auch nach der Fracht noch etwas übrig lassen. */
export function nettoMarge({ preis, ekChf, frachtUsd, usdChf = 0.82435 }) {
  if (![preis, ekChf, frachtUsd, usdChf].every(Number.isFinite)) return null;
  return Math.round((preis - ekChf - frachtUsd * usdChf) * 100) / 100;
}

/**
 * Reihenfolge-Wert. Die Marge zählt gedeckelt mit: sonst gewinnt jede teure Ware mit dünner
 * Beschreibung gegen einen echten Liebling.
 */
export function trendScore(tags = [], marge = 0) {
  const t = tags.reduce((s, x) => s + (TAG_GEWICHT[x] || 0), 0);
  const m = Math.min(Math.max(Number(marge) || 0, 0), 40) / 20;   // höchstens +2
  return Math.round((t + m) * 100) / 100;
}

/** Warengruppe für die Vielfalt — nie leer, sonst teilen sich alle Unbekannten EINEN Platz. */
export function typSchluessel(p = {}) {
  const typ = String(p.productType || '').trim().toLowerCase();
  if (typ) return typ;
  const tags = p.tags || [];
  for (const t of tags) {
    const m = /^(?:kat|kategorie)-(.+)$/.exec(t);
    if (m) return m[1];
  }
  const bekannt = KATEGORIE_TAGS.find(k => tags.includes(k));
  if (bekannt) return bekannt;
  return `einzel:${p.handle || p.id || '?'}`;                     // unbekannt = eigene Gruppe
}

/**
 * Darf dieses Produkt in die Zeile? Gibt immer einen Grund zurück, damit der Bericht zählen kann,
 * woran die Kandidaten scheitern (eine Schranke ohne Zähler ist stumm).
 * @param p  { id, handle, title, tags, preis, ekChf, sku, bild, beschreibung }
 */
export function pruefeKandidat(p = {}, opt = {}) {
  const { gekauft = new Set(), ausschluss = new Set(), minPreis = 14.9, maxPreis = 100, minMarge = 12, monat } = opt;
  if (gekauft.has(p.handle)) return { ok: false, grund: 'schon gekauft' };
  // Ausschluss = Seiten mit nachweislich viel Besuch und KEINEM Warenkorb (Analytics): kein „cooles" Produkt,
  // sondern ein unwirksames. Mehr Platz auf der Startseite würde dort nur Besuche verbrennen.
  if (ausschluss.has(p.handle)) return { ok: false, grund: 'Besuch ohne Warenkorb' };
  const saison = jahreszeitSperre(p, monat);
  if (saison) return { ok: false, grund: `Jahreszeit (${saison})` };
  if (LIEFER_SPERRE.test((p.tags || []).join(' '))) return { ok: false, grund: 'Lieferung gesperrt' };
  if (!/^CJ/i.test(String(p.sku || ''))) return { ok: false, grund: 'keine CJ-Nummer (Fracht nicht messbar)' };
  if (!Number.isFinite(p.ekChf)) return { ok: false, grund: 'Einkaufspreis unbekannt' };
  if (!(p.preis >= minPreis)) return { ok: false, grund: 'Preis zu niedrig' };
  if (p.preis > maxPreis) return { ok: false, grund: 'Preis zu hoch' };
  // Auf Rappen runden: 21.90 − 9.90 ist in Gleitkomma 11.999…, und genau 12 CHF würde sonst fliegen.
  if (Math.round((p.preis - p.ekChf) * 100) / 100 < minMarge) return { ok: false, grund: 'Rohmarge zu dünn' };
  // Sperrtags, Lizenznamen, Marken-/Safety-Risiko, Bild, Preis: dieselbe Prüfung wie der Feed.
  const f = pruefeProdukt({ id: p.id, sku: p.sku, handle: p.handle, titel: p.title, tags: p.tags,
    preis: p.preis, bild: p.bild, link: `/products/${p.handle}`, beschreibung: p.beschreibung });
  if (!f.ok) return { ok: false, grund: f.grund };
  return { ok: true, grund: 'Kandidat' };
}

/**
 * Wählt von oben nach unten, höchstens `maxJeTyp` je Warengruppe — sonst besteht die Zeile aus
 * acht Ladekabeln. Die Eingabe muss schon nach Wert absteigend sortiert sein.
 */
export function waehleVielfalt(sortiert = [], { ziel = 16, maxJeTyp = 2 } = {}) {
  const je = new Map();
  const gewaehlt = [];
  const uebersprungen = [];
  for (const p of sortiert) {
    if (gewaehlt.length >= ziel) break;
    const k = typSchluessel(p);
    if ((je.get(k) || 0) >= maxJeTyp) { uebersprungen.push({ handle: p.handle, typ: k }); continue; }
    je.set(k, (je.get(k) || 0) + 1);
    gewaehlt.push(p);
  }
  return { gewaehlt, uebersprungen };
}
