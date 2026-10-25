#!/usr/bin/env node
/**
 * Farbwahl-Scan: findet aktive Produkte, bei denen Varianten-Auswahl und Inhalt nicht zusammenpassen.
 * NUR LESEN. Schreibt nichts in den Shop.
 *
 * WARUM (25.10.2026): Drei Kundenseiten zeigten dasselbe — ein Vorhang mit 3 Farben x 3 Grössen
 * bei CJ, im Shop eine einzige Variante («Default Title»); ein Heiz-Schal mit 9 Farben bei CJ, im Shop
 * eine; die Galerie zeigt Rosa, Blau, Gelb, Rot, der Kunde kann nichts wählen. Wer so bestellt, bekommt
 * irgendeine Farbe — Rücksendung vorprogrammiert.
 *
 * Merkmale (alle nur aus Shopify-Daten, ohne CJ-Punkte):
 *   EINZEL_TEXT   eine Variante, Beschreibung nennt mehrere Farben/Grössen
 *   EINZEL_GALERIE eine Variante, mindestens GALERIE (Vorgabe 6) Bilder
 *   FARBE_EINZELN  Option «Farbe» mit nur einem Wert, aber viele Bilder
 *   OPTION_ENGLISCH Optionswerte mit englischen Farbwörtern
 * Ein Treffer ist ein VERDACHT. Bestätigt wird er erst im Abgleich mit CJ (cj_varianten_nachziehen.mjs).
 *
 * Aufruf: PQUERY='status:active AND tag:cj-real' SORT=UPDATED_AT REVERSE=0 SCAN=3000 node automation/farbwahl_scan.mjs
 *   SCAN     Obergrenze gelesener Produkte (Vorgabe 3000)
 *   GALERIE  Bildzahl-Schwelle für EINZEL_GALERIE (Vorgabe 6)
 *   AUS      Ausgabedatei CSV (Vorvorgabe dropship/farbwahl-scan.csv)
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { writeFileSync } from 'node:fs';

export const FARBWOERTER_DE = ['rot', 'blau', 'gr[üu]n', 'gelb', 'rosa', 'schwarz', 'wei(ss|ß)', 'grau', 'braun', 'beige', 'lila', 'violett',
  'orange', 'pink', 'gold', 'silber', 'apricot', 'aprikose', 'creme', 'khaki', 'türkis', 'turkis', 'bordeaux', 'marine', 'navy', 'off-?white'];
const FARBEN_RE = new RegExp(`(^|[^a-zäöüß])(${FARBWOERTER_DE.join('|')})([^a-zäöüß]|$)`, 'gi');
// Nur Wörter, die im Deutschen NICHT vorkommen. Beige, Orange, Gold, Pink, Khaki, Apricot, Rose sind auch deutsch
// (die erste Fassung zählte sie mit und meldete rund ein Drittel des Katalogs als «englisch»).
export const ENGLISCH_RE = /\b(white|black|red|blue|green|yellow|gr[ae]y|brown|purple|light|dark|silver|colou?r|size)\b/i;
const ANGEBOT_RE = /(erh[äa]ltlich in|in den farben|verf[üu]gbar in|in \d+ farben|in mehreren farben|farben?:|gr[öo]ss?en?:|in \d+ gr[öo]ss?en|zur auswahl)/i;

/** Reine Entscheidung: welche Verdachtsmerkmale trägt ein Produkt? (testbar, ohne Netz) */
export function pruefeFarbwahl(p, opt = {}) {
  const galerie = opt.galerie ?? 6;
  const flags = [];
  const optionen = p.options || [];
  const anzahl = p.variantsCount ?? 0;
  const standard = anzahl === 1 && optionen.every(o => /^(title|variante)$/i.test(o.name) && (o.values || []).every(v => /^(default title|standard)$/i.test(v)));
  const text = String(p.beschreibung || '');
  const farbtreffer = new Set([...text.matchAll(FARBEN_RE)].map(m => m[2].toLowerCase()));
  if (standard && (ANGEBOT_RE.test(text) || farbtreffer.size >= 2)) flags.push('EINZEL_TEXT');
  if (standard && (p.mediaCount ?? 0) >= galerie) flags.push('EINZEL_GALERIE');
  const farbOpt = optionen.find(o => /^(farbe|color|colour)$/i.test(o.name));
  if (farbOpt && (farbOpt.values || []).length === 1 && (p.mediaCount ?? 0) >= 4) flags.push('FARBE_EINZELN');
  if (optionen.some(o => /^(farbe|color|colour)$/i.test(o.name) && (o.values || []).some(v => ENGLISCH_RE.test(v)))) flags.push('OPTION_ENGLISCH');
  return flags;
}

async function main() {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (query, variables) => shopifyGql(SHOP, '2025-01', tok, query, variables);

  const PQUERY = process.env.PQUERY || 'status:active AND tag:cj-real';
  const SORT = process.env.SORT || 'UPDATED_AT', REVERSE = process.env.REVERSE !== '0';
  const SCAN = Number(process.env.SCAN || 3000), GALERIE = Number(process.env.GALERIE || 6);
  const AUS = process.env.AUS || 'dropship/farbwahl-scan.csv';

  const zeilen = []; const zaehl = {}; let gelesen = 0, cursor = null, erstes = null, letztes = null;
  while (gelesen < SCAN) {
    const d = await q(`query($q:String,$c:String){products(first:40,after:$c,query:$q,sortKey:${SORT},reverse:${REVERSE}){
      nodes{handle title createdAt updatedAt options{name values} variantsCount{count} mediaCount{count} description(truncateAt:900)
        variants(first:1){nodes{sku}}}
      pageInfo{hasNextPage endCursor}}}`, { q: PQUERY, c: cursor });
    const pg = d.products;
    for (const n of pg.nodes) {
      gelesen++; erstes ??= n.createdAt; letztes = n.createdAt;
      const flags = pruefeFarbwahl({ options: n.options, variantsCount: n.variantsCount.count, mediaCount: n.mediaCount.count, beschreibung: n.description }, { galerie: GALERIE });
      for (const f of flags) zaehl[f] = (zaehl[f] || 0) + 1;
      if (flags.length) zeilen.push([n.handle, flags.join('+'), n.variantsCount.count, n.mediaCount.count, n.variants.nodes[0]?.sku || '', JSON.stringify(n.options.map(o => o.name + ':' + o.values.length)), n.title.replace(/[;\n]/g, ' ')]);
    }
    if (!pg.pageInfo.hasNextPage) break;
    cursor = pg.pageInfo.endCursor;
    if (gelesen % 400 === 0) console.log(`  … ${gelesen} gelesen, ${zeilen.length} Verdachtsfälle`);
  }
  writeFileSync(AUS, 'handle;merkmale;varianten;medien;sku;optionen;titel\n' + zeilen.map(z => z.join(';')).join('\n') + '\n');
  console.log(JSON.stringify({ abfrage: PQUERY, sortierung: SORT + (REVERSE ? ' absteigend' : ' aufsteigend'), gelesen, verdachtsfaelle: zeilen.length, je_merkmal: zaehl, erstesAngelegt: erstes, letztesAngelegt: letztes, datei: AUS }, null, 1));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
