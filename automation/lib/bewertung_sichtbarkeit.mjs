/**
 * Wo verpufft echter Sozialbeweis? — Einordnung eines Produkts nach Bewertung UND Sichtbarkeit.
 *
 * WARUM (gemessen 2026-10-17 abends): Der Importer stellte 7 echte 5★-Bewertungen live. Beim
 * Nachsehen stand das Produkt mit den meisten davon — `m8-puls-4k-retro-game-console-956928`,
 * 12 Bewertungen, 4,75★ — als DRAFT im Shop und lieferte HTTP 404. Sterne, die niemand sieht,
 * verkaufen nichts. Eine Bewertung zu importieren ist also nur die halbe Arbeit; die andere
 * Hälfte ist zu prüfen, ob die Seite überhaupt erreichbar und beworben ist.
 *
 * ZWEITE LEHRE, die hier fest verdrahtet ist (04.10.): EIN DRAFT HAT MEISTENS EINEN GRUND.
 * Ein gut bewertetes Produkt einfach auf ACTIVE zu schalten hat schon einmal einen
 * Verlustverkauf erzeugt (Holzspiegel, VK 15.90 bei EK 33.62). Darum nennt diese Funktion
 * bei jedem Draft den Sperr-Tag, der ihn erklärt — und markiert nur ein Produkt OHNE jeden
 * solchen Tag als echten Kandidaten. Die Entscheidung bleibt beim Menschen.
 *
 * Reine Rechnung, kein Netz: testbar, und die Schwellen stehen an EINER Stelle.
 */

/**
 * Tags, die einen DRAFT erklären — jeder stammt aus einem dokumentierten Befund.
 *
 * KORREKTUR 17.10. spätabends: Die erste Fassung dieser Liste nannte nur die Gründe, die in
 * CLAUDE.md namentlich stehen. Der erste scharfe Lauf meldete daraufhin 32 „Kandidaten ohne
 * Sperr-Tag" — nachgesehen trug fast jeder einen ANDEREN, genauso triftigen Grund
 * (`auto-entwurf-0926`, `nicht-fit-elektronik-draft`, `duplikat-auto-draft`,
 * `bilder-geloescht-speicher`, `lizenz-nicht-bewerben`, `cj-entfernt`). Ein Messgerät mit
 * zu kurzer Liste erzeugt Arbeit, die es nicht gibt — dieselbe Klasse wie das zu breite
 * Sperrmuster im Merchant-Feed, nur in die andere Richtung. Darum zusätzlich MUSTER.
 */
export const SPERR_TAGS = [
  'marge-verlust-draft',        // VK unter EK (04.10.)
  'verlust-auto-draft',
  'cj-nicht-versendbar-ch',     // Lieferant versendet nicht in die Schweiz
  'ausverkauft-lieferant',
  'adult-nicht-bewerben',
  '18plus',
  'gmc-adult-pull',
  'compliance-pruefen',
  'medizinprodukt-pruefen',     // Insulin-Kühlbox (04.10.)
  'us-netzteil-110v',
  'verdeckte-ueberwachung',     // StGB Art. 179bis ff.
  'geprueft-gesperrt-0410',
  'nicht-live-moebel-sperrig',
  'niedrig-bewertet-nicht-bewerben',
  'lizenz-nicht-bewerben',       // Harry Potter/Pokémon u. a. = Grund für Kontosperren
];

/**
 * Muster für ganze Grund-FAMILIEN, die der Katalog laufend neu vergibt (Chargen-Namen mit
 * Datum). Absichtlich eng: jedes Muster endet auf einen Grund, nicht auf eine Charge —
 * `rueckhol-0907` etwa ist KEIN Sperrgrund (10'000+ aktive Produkte tragen ihn, Lehre 17.10.).
 */
export const SPERR_MUSTER = [
  /-draft$/,                 // auto-entwurf…-draft, nicht-fit-…-draft, duplikat-auto-draft
  /^auto-entwurf-/,          // Charge vom 26.09.: automatisch als Entwurf angelegt
  /^dublette/,               // dublette-bild, dublette-original-…
  /^duplikat/,
  /^bilder-geloescht/,       // Bilder wurden zum Sparen gelöscht → Seite ohne Bild
  /^bild-zu-klein$/,
  /^cj-entfernt/,            // Lieferant weg
  /^ohne-ek-/,               // kein Einkaufspreis bekannt → Marge unprüfbar
  /ausgelaufen$/,            // bigbuy-paket-ausgelaufen
  /^geprueft-gesperrt-/,
];

/** Alle Gründe, die gegen das Sichtbarmachen eines Produkts sprechen. */
export function sperrGruende(tags = []) {
  const liste = Array.isArray(tags) ? tags : [];
  return liste.filter(t => SPERR_TAGS.includes(t) || SPERR_MUSTER.some(m => m.test(t)));
}

/** Sterne aus dem Shopify-Metafeld `reviews.rating` (JSON-Text) lesen. */
export function sterneLesen(roh) {
  if (roh === null || roh === undefined || roh === '') return null;
  let o = roh;
  if (typeof roh === 'string') {
    try { o = JSON.parse(roh); } catch { const z = parseFloat(roh); return Number.isFinite(z) ? z : null; }
  }
  const z = parseFloat(o?.value ?? o?.rating ?? o);
  return Number.isFinite(z) ? z : null;
}

/**
 * @param {object} p  { status, imOnlineshop, sterne, stimmen, tags }
 * @param {object} [opt] { minStimmen=3, minSterne=4.0, schwachMax=3.8 }
 * @returns {{gruppe:string, sterne:number|null, stimmen:number, gruende:string[], kandidat:boolean}}
 */
export function einordnen(p = {}, opt = {}) {
  const minStimmen = opt.minStimmen ?? 3;
  const minSterne = opt.minSterne ?? 4.0;
  const schwachMax = opt.schwachMax ?? 3.8;

  const sterne = typeof p.sterne === 'number' ? p.sterne : sterneLesen(p.sterne);
  const stimmen = Number.parseInt(p.stimmen ?? 0, 10) || 0;
  const tags = Array.isArray(p.tags) ? p.tags : [];
  const gruende = sperrGruende(tags);
  const aktiv = String(p.status || '').toUpperCase() === 'ACTIVE';
  const sichtbar = aktiv && p.imOnlineshop === true;

  const leer = { sterne, stimmen, gruende, kandidat: false };
  if (sterne === null || stimmen === 0) return { ...leer, gruppe: 'keine-bewertung' };
  // Unter der Kartenschwelle: die Sterne EXISTIEREN, nur die Kachel zeigt sie nicht.
  if (stimmen < minStimmen) return { ...leer, gruppe: 'unter-schwelle' };
  if (sterne <= schwachMax) return { ...leer, gruppe: 'schwach' };
  if (sterne < minSterne) return { ...leer, gruppe: 'mittel' };

  // Ab hier: stark bewertet (>= minSterne, >= minStimmen Stimmen).
  if (!aktiv) return { ...leer, gruppe: 'stark-verschenkt-draft', kandidat: gruende.length === 0 };
  if (!sichtbar) return { ...leer, gruppe: 'stark-unsichtbar', kandidat: gruende.length === 0 };
  return { ...leer, gruppe: 'stark-sichtbar' };
}
