#!/usr/bin/env node
/**
 * Auswahl-Scan: prüft aktive Produkte, die SCHON eine Variantenauswahl haben. NUR LESEN.
 *
 * WARUM (25.10.2026): Ein Produkt mit Farbauswahl kann trotzdem verwechseln lassen — wenn zwei Farben dasselbe Bild haben,
 * eine Farbe gar kein Bild hat (die Galerie springt nicht), die Werte englisch sind («Light Green») oder eine Abmessung
 * «Grösse» heisst und damit den Kleider-Hinweis «asiatisch konfektioniert … eine Nummer grösser» auslöst.
 *
 * Merkmale (aus Shopify-Daten):
 *   OHNE_BILD      Farb-/Modell-Option, mindestens die Hälfte der Varianten ohne eigenes Variantenbild
 *   BILD_DOPPELT   zwei verschiedene Werte der Farb-Option zeigen dasselbe Bild (nicht unterscheidbar)
 *   ENGLISCH       Optionswerte mit englischen Farb-/Grössenwörtern
 *   GROESSE_MASS   Option «Grösse»/«Size» mit Abmessungen (140 × 183 cm): löst den Kleider-Hinweis aus
 *   EINZELWERT     Option mit nur einem Wert (tote Auswahl)
 *   TITLE_MEHRERE  Option «Title» bei mehr als einer Variante
 *   PREIS_NULL     Variante mit Preis 0
 * Ein Treffer ist ein VERDACHT; die Behebung steht je Merkmal in dropship/AUSWAHL-PRUEFUNG-2510.md.
 *
 * Aufruf: PQUERY='status:active AND tag:cj-real' SORT=UPDATED_AT REVERSE=1 SCAN=2000 node automation/auswahl_scan.mjs
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { writeFileSync } from 'node:fs';
import { ENGLISCH_RE } from './farbwahl_scan.mjs';

const GROESSE_MASS_RE = /^\s*\d+(?:[.,]\d+)?\s*[x×*]\s*\d+(?:[.,]\d+)?(?:\s*[x×*]\s*\d+(?:[.,]\d+)?)?\s*(cm|mm|m)?\s*$/i;
const FARBNAME_RE = /^(farbe|color|colour|modell|ausf[üu]hrung|style|variante)$/i;

/** Reine Prüfung. @param p {options:[{name,values}], varianten:[{preis,bildId,werte:{Name:Wert}}]} */
export function pruefeAuswahl(p) {
  const flags = [];
  const optionen = p.options || [], vs = p.varianten || [];
  if (vs.length <= 1) return flags;
  if (optionen.some(o => /^title$/i.test(o.name))) flags.push('TITLE_MEHRERE');
  if (optionen.some(o => (o.values || []).length === 1)) flags.push('EINZELWERT');
  if (vs.some(v => Number(v.preis) === 0)) flags.push('PREIS_NULL');
  if (optionen.some(o => /gr[öo]sse|size/i.test(o.name) && (o.values || []).length && o.values.every(w => GROESSE_MASS_RE.test(String(w))))) flags.push('GROESSE_MASS');
  if (optionen.some(o => (o.values || []).some(w => ENGLISCH_RE.test(String(w))))) flags.push('ENGLISCH');

  const farb = optionen.find(o => FARBNAME_RE.test(o.name) && (o.values || []).length > 1);
  if (farb) {
    const ohne = vs.filter(v => !v.bildId).length;
    if (ohne / vs.length >= 0.5) flags.push('OHNE_BILD');
    else {
      // Wert → Menge der Bilder seiner Varianten. Doppelt = zwei Werte, deren Bildmengen sich vollständig decken (und nicht leer sind).
      const je = new Map();
      for (const v of vs) { const w = v.werte?.[farb.name]; if (w === undefined || !v.bildId) continue; (je.get(w) || je.set(w, new Set()).get(w)).add(v.bildId); }
      const werte = [...je.keys()];
      let doppelt = false;
      for (let i = 0; i < werte.length && !doppelt; i++) for (let j = i + 1; j < werte.length; j++) {
        const a = je.get(werte[i]), b = je.get(werte[j]);
        if (a.size === 1 && b.size === 1 && [...a][0] === [...b][0]) { doppelt = true; break; }
      }
      if (doppelt) flags.push('BILD_DOPPELT');
    }
  }
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
  const SCAN = Number(process.env.SCAN || 2000);
  const AUS = process.env.AUS || 'dropship/auswahl-scan.csv';
  const zeilen = [], zaehl = {}; let gelesen = 0, mitAuswahl = 0, abgeschnitten = 0, cursor = null;
  while (gelesen < SCAN) {
    const d = await q(`query($q:String,$c:String){products(first:15,after:$c,query:$q,sortKey:${SORT},reverse:${REVERSE}){
      nodes{handle title options{name values} variantsCount{count}
        variants(first:60){nodes{price image{id} selectedOptions{name value}}}}
      pageInfo{hasNextPage endCursor}}}`, { q: PQUERY, c: cursor });
    for (const n of d.products.nodes) {
      gelesen++;
      if (n.variantsCount.count <= 1) continue;
      mitAuswahl++;
      if (n.variantsCount.count > 60) abgeschnitten++;
      const vs = n.variants.nodes.map(v => ({ preis: v.price, bildId: v.image?.id || null, werte: Object.fromEntries(v.selectedOptions.map(o => [o.name, o.value])) }));
      const flags = pruefeAuswahl({ options: n.options, varianten: vs });
      for (const f of flags) zaehl[f] = (zaehl[f] || 0) + 1;
      if (flags.length) zeilen.push([n.handle, flags.join('+'), n.variantsCount.count, JSON.stringify(n.options.map(o => o.name + ':' + o.values.length)), n.title.replace(/[;\n]/g, ' ')]);
    }
    if (!d.products.pageInfo.hasNextPage) break;
    cursor = d.products.pageInfo.endCursor;
  }
  writeFileSync(AUS, 'handle;merkmale;varianten;optionen;titel\n' + zeilen.map(z => z.join(';')).join('\n') + '\n');
  console.log(JSON.stringify({ abfrage: PQUERY, sortierung: SORT + (REVERSE ? ' ab' : ' auf'), gelesen, mitAuswahl, davonUeber60Varianten: abgeschnitten, verdachtsfaelle: zeilen.length, je_merkmal: zaehl, datei: AUS }, null, 1));
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
