/**
 * Schlanke Karte für den Editor v6: aus einer Printful-Katalogdatei (katalog/<id>.json) die Modellkarte bauen (modellkarte.mjs) und auf das
 * reduzieren, was lspod-designer-v6.js liest. Die volle Karte eines T-Shirts hat 197 KB (628 Varianten, Grössentabellen, Beschreibung), die schlanke
 * rund 11 KB (GEMESSEN: Modell 71 mit 8 Platzierungen 10,5 KB) und passt als <script type="application/json" id="lspod-karte"> in die Produktbeschreibung.
 * Rein: kein Netz, keine Schreibzugriffe (die Kommandozeile schreibt nur auf die Standardausgabe und Warnungen auf die Fehlerausgabe).
 *
 * Neu gegenüber der Modellkarte (die dort nicht stehen, Vorschlag siehe README «Offene Punkte»):
 *   minDpi         Mindestauflösung aus katalog.templates.min_dpi (modellkarte.mjs wirft sie weg); der Editor nimmt 100, wenn sie fehlt
 *   aufpreisChf    Aufpreis je Platzierung in CHF aus preisformel.aufpreisChf (aufgerundet auf 10 Rappen)
 *   shop.varianten Zuordnung Shopify-Variante → Printful-Variante (aus dem Shop gelesen, hier nur durchgereicht und GEPRÜFT: jede Printful-Variante muss im Katalog stehen)
 *
 * EIN SHOP-PRODUKT, MEHRERE PRINTFUL-MODELLE (GEMESSEN 05.11.: das T-Shirt-Produkt besteht aus den Modellen 71, 456 und 586, der Hoodie aus 145 und 821, das Poster aus
 * 3, 171, 268 und 304, die iPhone-Hülle aus 181, 601 und 798): kartenbuendelFuerEditor() baut ein KARTENBÜNDEL { schema:1, modelle:{ "<Modell>": Karte }, shop:{ varianten:{ "<Shopify-Id>": {pv, m} } } },
 * aus dem der Editor nach der gewählten Variante die Karte des richtigen Modells nimmt. Eine einzelne Karte (karteFuerEditor) ist nur für Produkte mit EINEM Modell zulässig.
 *
 * Optionen (alle aus «offene Punkte» der README):
 *   ohneAufpreis   Platzierungen mit Aufpreis weglassen (solange der Aufpreis im Warenkorb nicht abgerechnet wird, Entscheid 1)
 *   ohneEtiketten  Etiketten-Platzierungen (art «etikett») weglassen
 *   panelErlauben  Rundum-Druck (Klasse PANEL) zulassen; ohne diese Option bricht der Bau ab (die Masse sind die des Druckbogens, nicht des Schnittteils)
 *   lieferbarCh    Die Lieferung in die Schweiz ist für dieses Modell GEMESSEN (POST /shipping/rates je Variante, Beleg beim Aufrufer). Die Modellkarte stuft
 *                  ein Modell ohne EU-Lager als UNGEEIGNET ein (Annahme «die Schweiz wird aus der EU beliefert»). Mit dieser Option gilt stattdessen die
 *                  technische Klasse (nur Druckgeometrie). Sie hebt NUR den Liefergrund auf: ein technisch ungeeignetes Modell bleibt UNGEEIGNET, PANEL braucht weiter panelErlauben.
 */
import { modellkarteBauen } from '../../../dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs';
import { aufpreisChf } from '../../../dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs';

/** Hinweis-Codes, zu denen der Editor eigene Kundentexte hat (Quelle: HINWEIS_TEXTE in lspod-designer-v6.js, ein Test hält beides gleich). */
export const BEKANNTE_HINWEIS_CODES = Object.freeze(['stickerei', 'gestrickt', 'allover_einzeldatei', 'kappe', 'tasche', 'rundumdruck']);
/** Längster Wert einer Warenkorb-Eigenschaft (QUELLE: Dritt-Anleitungen zu Shopify-Line-Item-Properties, nicht an Shopify gemessen) und Obergrenze der Druckdatei im Editor. */
export const POD_KARTE_MAX = 255;
export const MAX_PIXEL_STANDARD = 16777216;
/** Klassen, die der Editor zeichnen kann (technische Klasse der Modellkarte). UNGEEIGNET gehört nie dazu. */
const KLASSEN_ZEICHENBAR = Object.freeze(['FLACH', 'FLACH_MIT_HINWEIS', 'PANEL']);

/** Shopify-Variante → Printful-Variante prüfen und normalisieren: Schlüssel «123» oder «gid://shopify/ProductVariant/123», Wert eine ganze Zahl > 0. Wirft bei Unsinn. */
export function shopVariantenNormalisieren(roh) {
  const aus = {};
  const probleme = [];
  for (const [k, v] of Object.entries(roh ?? {})) {
    const m = String(k).trim().match(/^(?:gid:\/\/shopify\/ProductVariant\/)?(\d+)$/);
    const pv = typeof v === 'object' && v !== null ? Number(v.pv ?? v.printfulVariantId) : Number(v);
    if (!m) { probleme.push(`Shopify-Variante «${k}» ist keine Zahl und keine ProductVariant-GID`); continue; }
    if (!Number.isInteger(pv) || pv <= 0) { probleme.push(`Shopify-Variante ${m[1]}: Printful-Variante «${JSON.stringify(v)}» ist keine ganze Zahl`); continue; }
    if (m[1] in aus && aus[m[1]] !== pv) { probleme.push(`Shopify-Variante ${m[1]} kommt doppelt mit verschiedenen Printful-Varianten vor`); continue; }
    aus[m[1]] = pv;
  }
  if (probleme.length) throw new Error('Zuordnung Shopify → Printful unbrauchbar:\n  ' + probleme.join('\n  '));
  return aus;
}

/** IDs der Printful-Varianten einer Katalogdatei. */
function variantenIds(katalog) {
  return new Set((katalog.varianten ?? []).map((v) => Number(v.id ?? v.printfulVariantId)).filter(Number.isFinite));
}

/** Karte EINES Modells ohne Shop-Zuordnung. */
function modellKarte(katalog, opt) {
  const k = modellkarteBauen(katalog);
  // Klasse der Karte: mit gemessener Schweizer Lieferbarkeit zählt die Druckgeometrie, sonst die Einstufung der Modellkarte (mit EU-Lagerregel)
  const klasse = opt.lieferbarCh && k.klasse === 'UNGEEIGNET' && KLASSEN_ZEICHENBAR.includes(k.technischeKlasse) ? k.technischeKlasse : k.klasse;
  if (klasse === 'PANEL' && !opt.panelErlauben) {
    throw new Error(`Modell ${k.printfulProductId}: Klasse PANEL (Rundum-Druck). Die Masse im Editor wären die des Druckbogens, nicht die des Schnittteils (Gegenleser 2, F8). Nur mit panelErlauben nach Prüfung an einem Muster.`);
  }
  const minDpi = Number(katalog.templates?.min_dpi);
  const gruppenAnzahl = k.druckdateiGruppen.length;
  let roh = k.platzierungen;
  if (opt.ohneAufpreis) roh = roh.filter((p) => !(typeof p.aufpreisUsd === 'number' && p.aufpreisUsd > 0));
  if (opt.ohneEtiketten) roh = roh.filter((p) => p.art !== 'etikett');
  if (!roh.length) throw new Error(`Modell ${k.printfulProductId}: nach den Filtern (ohneAufpreis/ohneEtiketten) bleibt keine Platzierung`);
  const bleibt = new Set(roh.map((p) => p.id));
  const platzierungen = roh.map((p) => {
    const aufUsd = typeof p.aufpreisUsd === 'number' && p.aufpreisUsd > 0 ? p.aufpreisUsd : 0;
    const o = {
      id: p.id, dateiTyp: p.dateiTyp, titelDe: p.titelDe, titelEn: p.titelEn, art: p.art, technik: p.technik,
      printfile: { printfileId: p.printfile.printfileId, breitePx: p.printfile.breitePx, hoehePx: p.printfile.hoehePx, dpi: p.printfile.dpi },
      vorlage: p.vorlage,
      aufpreisUsd: aufUsd || null, aufpreisChf: aufUsd ? aufpreisChf(aufUsd) : 0,
      kollidiertMit: p.kollidiertMitImEditor.filter((q) => bleibt.has(q)),
    };
    if (p.geometrien.length > 1) o.geometrien = p.geometrien;
    return o;
  });
  const druckdateien = {};
  const gebraucht = new Set(platzierungen.flatMap((p) => [p.printfile.printfileId, ...(p.geometrien ?? []).map((g) => g.printfileId)]));
  for (const [id, d] of Object.entries(k.druckdateien)) if (gebraucht.has(Number(id))) druckdateien[id] = { printfileId: d.printfileId, breitePx: d.breitePx, hoehePx: d.hoehePx, dpi: d.dpi };
  const karte = {
    schema: 1, printfulProductId: k.printfulProductId, typ: k.typ, titelEn: k.titelEn, klasse, standardTechnik: k.standardTechnik,
    minDpi: Number.isFinite(minDpi) && minDpi > 0 ? minDpi : null,
    platzierungen, druckdateien,
    hinweise: k.hinweise.filter((h) => h.art === 'einschraenkung' || BEKANNTE_HINWEIS_CODES.includes(h.code))
      .map((h) => (BEKANNTE_HINWEIS_CODES.includes(h.code) ? { code: h.code, art: h.art } : { code: h.code, art: h.art, text: h.text })),
  };
  // Farbe je Variante (nur bei mehreren Farben): { "#rrggbb": [Printful-Variante, …] }, damit die Vorlage in der gewählten Farbe erscheint
  const farben = {};
  for (const v of k.varianten) if (/^#[0-9a-f]{6}$/i.test(v.farbeHex ?? '')) (farben[v.farbeHex.toLowerCase()] ??= []).push(v.printfulVariantId);
  if (Object.keys(farben).length > 1) karte.farben = farben;
  if (gruppenAnzahl > 1) {
    karte.druckdateiGruppen = k.druckdateiGruppen;
    karte.varianten = k.varianten.map((v) => ({ printfulVariantId: v.printfulVariantId, druckdateiGruppe: v.druckdateiGruppe }));
  }
  return karte;
}

/**
 * Karte für ein Shop-Produkt mit EINEM Printful-Modell.
 * @param {object} katalog   geparste Katalogdatei
 * @param {{shopVarianten?: Record<string, number>, ohneAufpreis?: boolean, ohneEtiketten?: boolean, panelErlauben?: boolean, lieferbarCh?: boolean}} [opt]   Shopify-Varianten-ID → Printful-Variante
 * @throws wenn eine zugeordnete Printful-Variante nicht zum Modell gehört (Tippfehler, Variante eines anderen Modells: dafür gibt es das Kartenbündel)
 */
export function karteFuerEditor(katalog, opt = {}) {
  const karte = modellKarte(katalog, opt);
  if (opt.shopVarianten && Object.keys(opt.shopVarianten).length) {
    const zuordnung = shopVariantenNormalisieren(opt.shopVarianten);
    const ids = variantenIds(katalog);
    const fremd = Object.entries(zuordnung).filter(([, pv]) => !ids.has(pv));
    if (fremd.length) {
      throw new Error(`Modell ${karte.printfulProductId}: ${fremd.length} Printful-Variante(n) gehören nicht zu diesem Modell: ${fremd.slice(0, 8).map(([sv, pv]) => `Shopify ${sv} → ${pv}`).join(', ')}`
        + ' (Hat das Shop-Produkt mehrere Modelle, braucht es ein Kartenbündel: kartenbuendelFuerEditor)');
    }
    karte.shop = { varianten: zuordnung };
  }
  return karte;
}

/**
 * Kartenbündel für ein Shop-Produkt aus mehreren Printful-Modellen.
 * @param {object[]} kataloge   geparste Katalogdateien aller Modelle des Produkts
 * @param {Record<string, number>} shopVarianten   Shopify-Variante → Printful-Variante, für JEDE verkaufte Variante des Shop-Produkts
 * @throws wenn eine Printful-Variante in keinem oder in mehr als einem Katalog steht, oder wenn ein Modell doppelt vorkommt
 */
export function kartenbuendelFuerEditor(kataloge, shopVarianten, opt = {}) {
  if (!Array.isArray(kataloge) || !kataloge.length) throw new Error('Kartenbündel: keine Katalogdatei');
  const zuordnung = shopVariantenNormalisieren(shopVarianten);
  if (!Object.keys(zuordnung).length) throw new Error('Kartenbündel: keine Zuordnung Shopify → Printful');
  const modelle = {}, besitzer = new Map();
  for (const kat of kataloge) {
    const karte = modellKarte(kat, opt);
    const pid = String(karte.printfulProductId);
    if (modelle[pid]) throw new Error(`Kartenbündel: Modell ${pid} kommt doppelt vor`);
    modelle[pid] = karte;
    for (const id of variantenIds(kat)) { if (besitzer.has(id)) throw new Error(`Printful-Variante ${id} steht in den Katalogen von ${besitzer.get(id)} und ${pid}`); besitzer.set(id, pid); }
  }
  const varianten = {}, fehlt = [];
  for (const [sv, pv] of Object.entries(zuordnung)) {
    const m = besitzer.get(pv);
    if (!m) { fehlt.push(`Shopify ${sv} → ${pv}`); continue; }
    varianten[sv] = { pv, m: Number(m) };
  }
  if (fehlt.length) throw new Error(`Kartenbündel: ${fehlt.length} Printful-Variante(n) stehen in keinem der Kataloge (${Object.keys(modelle).join(', ')}): ${fehlt.slice(0, 8).join(', ')}`);
  // Nur Modelle, die wirklich verkauft werden, kommen in das Bündel (die Karte soll klein bleiben)
  const gebraucht = new Set(Object.values(varianten).map((x) => String(x.m)));
  for (const pid of Object.keys(modelle)) if (!gebraucht.has(pid)) delete modelle[pid];
  return { schema: 1, modelle, shop: { varianten } };
}

/**
 * Länge der längsten möglichen `_pod_karte` einer Karte, wenn der Kunde ALLE Platzierungen belegt (Shopify-Variante 14 Stellen, Printful-Variante 6 Stellen angenommen).
 * Der Editor lehnt längere Werte als 255 Zeichen ab («Zu viele Druckflächen auf einmal»); hier lässt sich vorher sehen, bei welchen Modellen das möglich ist.
 */
export function podKarteGroesstmoeglich(karte) {
  const p = karte.platzierungen;
  const o = { v: 6, m: karte.printfulProductId, pv: 999999, sv: '12345678901234', pl: p.map((x) => x.id) };
  const dt = {};
  for (const x of p) if (x.dateiTyp && x.dateiTyp !== x.id) dt[x.id] = x.dateiTyp;
  if (Object.keys(dt).length) o.dt = dt;
  // px steht nur, wenn eine Druckdatei durch die Obergrenze kleiner als das Printfile wird (gleiche Rechnung wie renderGroesse im Editor)
  const gross = (x) => x.printfile.breitePx * x.printfile.hoehePx > MAX_PIXEL_STANDARD;
  if (p.some(gross)) {
    o.px = p.map((x) => {
      if (!gross(x)) return `${x.printfile.breitePx}x${x.printfile.hoehePx}`;
      const k = Math.sqrt(MAX_PIXEL_STANDARD / (x.printfile.breitePx * x.printfile.hoehePx));
      return `${Math.max(1, Math.floor(x.printfile.breitePx * k))}x${Math.max(1, Math.floor(x.printfile.hoehePx * k))}`;
    });
  }
  o.ap = p.reduce((s, x) => s + (x.aufpreisChf || 0), 0);
  return JSON.stringify(o).length;
}

/** Warnungen zu einer Karte oder einem Bündel (Text; leer = nichts aufgefallen). */
export function kartenWarnungen(karteOderBuendel) {
  const modelle = karteOderBuendel.modelle ? Object.values(karteOderBuendel.modelle) : [karteOderBuendel];
  const w = [];
  for (const k of modelle) {
    const laenge = podKarteGroesstmoeglich(k);
    if (laenge > POD_KARTE_MAX) w.push(`Modell ${k.printfulProductId}: Belegt der Kunde alle ${k.platzierungen.length} Platzierungen, wird _pod_karte ${laenge} Zeichen lang (über ${POD_KARTE_MAX}); der Editor lehnt das ab`);
    if (k.klasse === 'PANEL') w.push(`Modell ${k.printfulProductId}: Rundum-Druck, die Masse sind die des Druckbogens`);
  }
  return w;
}

// Kommandozeile:
//   node karte_fuer_editor.mjs <katalogdatei>[,<katalogdatei2>,…] [shop-varianten.json] [--ohne-aufpreis] [--ohne-etiketten] [--panel] [--lieferbar-ch]
// Eine Katalogdatei → Einzelkarte, mehrere (mit Komma) → Kartenbündel (dann ist shop-varianten.json Pflicht). Ausgabe: JSON auf der Standardausgabe, Warnungen auf der Fehlerausgabe.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import('node:fs');
  const args = process.argv.slice(2);
  const flags = args.filter((a) => a.startsWith('--'));
  const [dateien, shopDatei] = args.filter((a) => !a.startsWith('--'));
  if (!dateien) { console.error('Aufruf: node karte_fuer_editor.mjs <katalog/ID.json>[,<katalog/ID2.json>…] [shop-varianten.json] [--ohne-aufpreis] [--ohne-etiketten] [--panel]'); process.exit(2); }
  const opt = { ohneAufpreis: flags.includes('--ohne-aufpreis'), ohneEtiketten: flags.includes('--ohne-etiketten'), panelErlauben: flags.includes('--panel'), lieferbarCh: flags.includes('--lieferbar-ch') };
  const liste = dateien.split(',').map((d) => JSON.parse(readFileSync(d, 'utf8')));
  const shop = shopDatei ? JSON.parse(readFileSync(shopDatei, 'utf8')) : undefined;
  try {
    let ergebnis;
    if (liste.length > 1) {
      if (!shop) throw new Error('Mehrere Katalogdateien brauchen shop-varianten.json (Kartenbündel)');
      ergebnis = kartenbuendelFuerEditor(liste, shop, opt);
    } else ergebnis = karteFuerEditor(liste[0], { ...opt, shopVarianten: shop });
    for (const w of kartenWarnungen(ergebnis)) console.error('WARNUNG: ' + w);
    process.stdout.write(JSON.stringify(ergebnis) + '\n');
  } catch (e) { console.error('FEHLER: ' + e.message); process.exit(1); }
}
