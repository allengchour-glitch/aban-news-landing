/**
 * Schlanke Karte für den Editor v6: aus einer Printful-Katalogdatei (katalog/<id>.json) die Modellkarte bauen (modellkarte.mjs) und auf das
 * reduzieren, was lspod-designer-v6.js liest. Die volle Karte eines T-Shirts hat 197 KB (628 Varianten, Grössentabellen, Beschreibung), die schlanke
 * rund 6 KB und passt als <script type="application/json" id="lspod-karte"> in die Produktbeschreibung.
 * Rein: kein Netz, keine Schreibzugriffe (die Kommandozeile schreibt nur auf die Standardausgabe).
 *
 * Neu gegenüber der Modellkarte (die dort nicht stehen, Vorschlag siehe README «Offene Punkte»):
 *   minDpi         Mindestauflösung aus katalog.templates.min_dpi (modellkarte.mjs wirft sie weg); der Editor nimmt 100, wenn sie fehlt
 *   aufpreisChf    Aufpreis je Platzierung in CHF aus preisformel.aufpreisChf (aufgerundet auf 10 Rappen)
 *   shop.varianten Zuordnung Shopify-Variante → Printful-Variante (aus dem Shop gelesen, hier nur durchgereicht)
 */
import { modellkarteBauen } from '../../../dropship/selbst-gestalten-fertig-0511/werkzeuge/modellkarte.mjs';
import { aufpreisChf } from '../../../dropship/selbst-gestalten-fertig-0511/werkzeuge/preisformel.mjs';

/** Hinweis-Codes, zu denen der Editor eigene Kundentexte hat (Quelle: HINWEIS_TEXTE in lspod-designer-v6.js, ein Test hält beides gleich). */
export const BEKANNTE_HINWEIS_CODES = Object.freeze(['stickerei', 'gestrickt', 'allover_einzeldatei', 'kappe', 'tasche', 'rundumdruck']);

/**
 * @param {object} katalog   geparste Katalogdatei
 * @param {{shopVarianten?: Record<string, number>}} [opt]   Shopify-Varianten-ID → Printful-Variante
 */
export function karteFuerEditor(katalog, opt = {}) {
  const k = modellkarteBauen(katalog);
  const minDpi = Number(katalog.templates?.min_dpi);
  const gruppenAnzahl = k.druckdateiGruppen.length;
  const platzierungen = k.platzierungen.map((p) => {
    const aufUsd = typeof p.aufpreisUsd === 'number' && p.aufpreisUsd > 0 ? p.aufpreisUsd : 0;
    const o = {
      id: p.id, dateiTyp: p.dateiTyp, titelDe: p.titelDe, titelEn: p.titelEn, art: p.art, technik: p.technik,
      printfile: { printfileId: p.printfile.printfileId, breitePx: p.printfile.breitePx, hoehePx: p.printfile.hoehePx, dpi: p.printfile.dpi },
      vorlage: p.vorlage,
      aufpreisUsd: aufUsd || null, aufpreisChf: aufUsd ? aufpreisChf(aufUsd) : 0,
      kollidiertMit: p.kollidiertMitImEditor,
    };
    if (p.geometrien.length > 1) o.geometrien = p.geometrien;
    return o;
  });
  const druckdateien = {};
  const gebraucht = new Set(platzierungen.flatMap((p) => [p.printfile.printfileId, ...(p.geometrien ?? []).map((g) => g.printfileId)]));
  for (const [id, d] of Object.entries(k.druckdateien)) if (gebraucht.has(Number(id))) druckdateien[id] = { printfileId: d.printfileId, breitePx: d.breitePx, hoehePx: d.hoehePx, dpi: d.dpi };
  const karte = {
    schema: 1, printfulProductId: k.printfulProductId, typ: k.typ, titelEn: k.titelEn, klasse: k.klasse, standardTechnik: k.standardTechnik,
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
  if (opt.shopVarianten && Object.keys(opt.shopVarianten).length) karte.shop = { varianten: { ...opt.shopVarianten } };
  return karte;
}

// Kommandozeile: node karte_fuer_editor.mjs <katalogdatei> [shop-varianten.json]  → Karte als JSON auf die Standardausgabe
if (import.meta.url === `file://${process.argv[1]}`) {
  const { readFileSync } = await import('node:fs');
  const [datei, shopDatei] = process.argv.slice(2);
  if (!datei) { console.error('Aufruf: node karte_fuer_editor.mjs <katalog/ID.json> [shop-varianten.json]'); process.exit(2); }
  const shop = shopDatei ? JSON.parse(readFileSync(shopDatei, 'utf8')) : undefined;
  process.stdout.write(JSON.stringify(karteFuerEditor(JSON.parse(readFileSync(datei, 'utf8')), { shopVarianten: shop })) + '\n');
}
