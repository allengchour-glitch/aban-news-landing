/**
 * Mode-Taxonomie (Damen / Herren / Kinder & Baby, später Schuhe & Accessoires) als Kategorien der Engine in kategorien.mjs.
 *
 * Quelle der Regeln: dropship/mode-taxonomie-2610/ALLES.json (vier Abteilungsdateien, zusammengeführt und gegeneinander geprüft —
 * Bericht PRUEFBERICHT.md). Die Auswertung ist dieselbe Funktion wie in der Prüfung (`passt` aus pruef_kern.mjs), das Geschlecht kommt aus
 * EINER gemeinsamen Regel (geschlecht_gemeinsam.mjs): die drei Bekleidungs-Regeln widersprachen sich vorher bei 92 von 11 901 Produkten.
 *
 * Zwei Ebenen: Kategorie (Tag `sort-<handle>`) und Unterfilter (Tag `sort-<unterfilter-handle>`, nur Produkte der Kategorie).
 * Google-Kategorie-Korrekturen (g_korrekturen.json: 41 Produkte mit falscher Google-Kategorie) wirken NUR in dieser Auswertung, nicht im Shop.
 *
 * ENV: MODE_BEREICHE=bekleidung (Vorgabe; weitere: schuhe,taschen,accessoires)
 */
import { readFileSync } from 'node:fs';
import { passt, imUnterfilter } from '../../dropship/mode-taxonomie-2610/pruef_kern.mjs';
import { GEN_JE_DATEI } from '../../dropship/mode-taxonomie-2610/geschlecht_gemeinsam.mjs';

const lies = n => JSON.parse(readFileSync(new URL(`../../dropship/mode-taxonomie-2610/${n}`, import.meta.url), 'utf8'));
export const ALLES = lies('ALLES.json');
const G_KORR = lies('g_korrekturen.json');

/** Handles, die im Shop schon mit anderem Inhalt leben (Prüfbericht §4): Handle behalten, Regel auf den Tag umstellen. */
export const KOLLISIONEN = new Set(ALLES.kollisionen_mit_vorhandenen_collections.map(k => k.handle));

/** Produkt in die Form bringen, die die Taxonomie erwartet (`type` statt `productType`, korrigierte Google-Kategorie). */
export const normiere = p => {
  const k = G_KORR[p.handle];
  return { ...p, type: p.type ?? p.productType ?? '', tags: p.tags || [], g: k?.g ?? p.g ?? '' };
};

const cache = new Map();
const geschlecht = (datei, p) => {
  const key = datei + '|' + p.handle;
  if (!cache.has(key)) cache.set(key, GEN_JE_DATEI[datei.replace(/\.json$/, '')](p));
  return cache.get(key);
};

const ABTEILUNG = { damen: 'Damen', herren: 'Herren', kinder: 'Kinder', partner: 'Paare', unisex: 'alle', alle: 'alle' };
const FUSS = ' Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.';

/** Beschreibungen der Taxonomie nennen Filter, die es im Shop (noch) nicht gibt, und siezen teils → Satz weglassen, Anrede vermeiden. */
export function bereinigeBeschreibung(text) {
  const saetze = String(text).match(/[^.!?]+[.!?]*/g) || [];
  return saetze.map(s => s.trim()).filter(s => s && !/filter/i.test(s) && !/\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem)\b/.test(s)).join(' ');
}
export const seo = (titel, beschreibung) => {
  const t = `${titel} online kaufen.`, rest = (beschreibung ? ' ' + beschreibung : '') + FUSS;
  const voll = t + rest;
  return voll.length <= 160 ? voll : (t + FUSS).slice(0, 160);
};

function baue(k) {
  const datei = k.quelle_datei;
  const eigen = p => passt(k, p, geschlecht(datei, p));
  const beschr = bereinigeBeschreibung(k.beschreibung) || `${k.titel} für ${ABTEILUNG[k.abteilung] || 'alle'}.`;
  const kat = { id: `m-${k.handle}`, handle: k.handle, titel: k.titel, tag: `sort-${k.handle}`, min: 15, bestehend: KOLLISIONEN.has(k.handle), mode: true, bereich: k.bereich,
    beschreibung: beschr, seoBeschreibung: seo(k.titel, beschr), aktualisiere: KOLLISIONEN.has(k.handle),
    passt: p => eigen(normiere(p)) };
  const filter = (k.unterfilter || []).map(u => {
    const b = `${u.titel} aus unserer Auswahl «${k.titel}» für ${ABTEILUNG[k.abteilung] || 'alle'}.`;
    return { id: `m-${u.handle}`, handle: u.handle, titel: u.titel, tag: `sort-${u.handle}`, min: 15, bestehend: false, mode: true, filter: true, eltern_id: kat.id, bereich: k.bereich,
      beschreibung: b, seoBeschreibung: seo(`${u.titel} für ${ABTEILUNG[k.abteilung] || 'alle'}`, ''),
      passt: p => { const q = normiere(p); return eigen(q) && imUnterfilter(u, q); } };
  });
  return [kat, ...filter];
}

export function baueMode(bereiche = (process.env.MODE_BEREICHE || 'bekleidung').split(',').map(s => s.trim())) {
  return ALLES.kategorien.filter(k => bereiche.includes(k.bereich)).flatMap(baue);
}

export const MODE = baueMode();

/** Menü-Baum der Taxonomie → flache Pfadliste je oberster Ebene (Gruppen werden aufgelöst: im Shop-Menü gibt es keine Knoten ohne Link). */
export function menueEintraege(top) {
  const t = ALLES.menue.find(m => m.titel === top);
  const aus = (n, ziel) => { for (const u of n.unterpunkte || []) { if (u.handle) ziel.push({ handle: u.handle, titel: u.titel, verweis: !!u.verweis, vorhanden: !!u.vorhanden, unterfilter: u.unterfilter || [] }); else aus(u, ziel); } return ziel; };
  return t ? aus(t, []) : [];
}
