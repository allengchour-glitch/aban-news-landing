#!/usr/bin/env node
/**
 * bewertungen_sichtbar.mjs — misst, wo echter Sozialbeweis im Shop verpufft.
 *
 * Nur LESEN. Kostet KEINE CJ-Punkte (fragt ausschliesslich Shopify).
 *
 * Anlass (17.10. abends): der Review-Importer stellte 7 echte 5★-Bewertungen live — das
 * Produkt mit den meisten davon (12 Bewertungen, 4,75★) ist DRAFT und liefert 404.
 * Bewertungen zu importieren nützt nichts, solange die Seite nicht erreichbar ist.
 *
 * Der Bericht nennt je Gruppe die ZAHL (nie nur Beispiele — eine Stichprobe hat die
 * Kanalfrage am 17.10. um den Faktor 6 falsch beantwortet) und bei jedem starken Draft den
 * Sperr-Tag, der ihn erklärt. Produkte OHNE solchen Tag sind Kandidaten, aber dieses Skript
 * ändert NICHTS: ein Draft hat meistens einen Grund (04.10., Verlustverkauf Holzspiegel).
 *
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)
 *      SCAN=3000  PQUERY=''  SORT=UPDATED_AT  REVERSE=1  BERICHT=<Pfad.md>
 */
import fs from 'node:fs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { einordnen } from './lib/bewertung_sichtbarkeit.mjs';

const SHOP = process.env.SHOPIFY_SHOP || '', TOK_ST = process.env.SHOPIFY_ADMIN_TOKEN || '',
  CID = process.env.SHOPIFY_CLIENT_ID || '', CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '',
  SCAN = Math.min(parseInt(process.env.SCAN || '3000', 10), 20000),
  PQUERY = process.env.PQUERY || '', SORT = process.env.SORT || 'UPDATED_AT',
  REVERSE = process.env.REVERSE !== '0', BERICHT = process.env.BERICHT || '',
  FORTSCHRITT = process.env.FORTSCHRITT === '1', API = '2025-01';

async function token() {
  if (!(CID && CS) && TOK_ST) return TOK_ST;
  if (SHOP && CID && CS) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CID, client_secret: CS, grant_type: 'client_credentials' }) });
    const txt = await r.text();
    let j = {}; try { j = JSON.parse(txt); } catch {}
    // Ein Guard darf aussteigen, aber er muss den Grund nennen (Regel vom 17.10.).
    if (!j.access_token) console.log(`Token-Abruf fehlgeschlagen: HTTP ${r.status}, Antwort ${txt.slice(0, 120)} (Secret-Länge ${CS.length})`);
    return j.access_token || '';
  }
  return TOK_ST;
}

const ABFRAGE = `query($c:String,$q:String,$s:ProductSortKeys,$r:Boolean){
  products(first:50, after:$c, query:$q, sortKey:$s, reverse:$r){
    pageInfo{ hasNextPage endCursor }
    nodes{ id handle title status publishedAt tags
      r:metafield(namespace:"reviews",key:"rating"){ value }
      c:metafield(namespace:"reviews",key:"rating_count"){ value } } } }`;

async function main() {
  if (!SHOP) { console.log('no-op: kein SHOPIFY_SHOP gesetzt.'); return; }
  const tok = await token();
  if (!tok) { console.log('no-op: kein Shopify-Token — Grund siehe Zeile darüber.'); return; }

  const gruppen = {}, kandidaten = [], verschenkt = [], gruendeZahl = {};
  let gelesen = 0, cur = null, seiten = 0;
  while (gelesen < SCAN) {
    const d = await shopifyGql(SHOP, API, tok, ABFRAGE,
      { c: cur, q: PQUERY || null, s: SORT, r: REVERSE });
    const seite = d.products.nodes;
    for (const p of seite) {
      gelesen++;
      const e = einordnen({ status: p.status, imOnlineshop: !!p.publishedAt,
        sterne: p.r?.value ?? null, stimmen: p.c?.value ?? 0, tags: p.tags || [] });
      gruppen[e.gruppe] = (gruppen[e.gruppe] || 0) + 1;
      if (e.gruppe === 'stark-verschenkt-draft' || e.gruppe === 'stark-unsichtbar') {
        const z = { handle: p.handle, titel: p.title, status: p.status,
          sterne: e.sterne, stimmen: e.stimmen, gruende: e.gruende };
        verschenkt.push(z);
        for (const g of e.gruende) gruendeZahl[g] = (gruendeZahl[g] || 0) + 1;
        if (e.gruende.length === 0) gruendeZahl['(ohne Sperr-Tag)'] = (gruendeZahl['(ohne Sperr-Tag)'] || 0) + 1;
        if (e.kandidat) kandidaten.push(z);
      }
    }
    seiten++;
    if (FORTSCHRITT) console.error(`… Seite ${seiten}, ${gelesen} Produkte`);
    if (!d.products.pageInfo.hasNextPage) break;
    cur = d.products.pageInfo.endCursor;
  }

  const bewertet = gelesen - (gruppen['keine-bewertung'] || 0);
  const bericht = {
    ts: new Date().toISOString(), shop: SHOP,
    gelesen, teilmessung: gelesen >= SCAN,
    pquery: PQUERY || '(alle)', sort: SORT, reverse: REVERSE,
    bewertet, quote: gelesen ? +(100 * bewertet / gelesen).toFixed(1) : 0,
    gruppen,
    verschenktGesamt: verschenkt.length,
    gruende: gruendeZahl,
    kandidaten: kandidaten.sort((a, b) => b.stimmen - a.stimmen || b.sterne - a.sterne),
    // Die stärksten verschenkten Fälle, auch die mit Grund — damit der Mensch den Preis entscheiden kann.
    verschenktTop: verschenkt.sort((a, b) => b.stimmen - a.stimmen || b.sterne - a.sterne).slice(0, 25),
  };
  console.log(JSON.stringify(bericht, null, 2));

  if (BERICHT) {
    const z = [];
    z.push(`# Bewertungen: sichtbar oder verschenkt? (${bericht.ts.slice(0, 10)})`, '');
    z.push(`Gelesen: **${gelesen}** Produkte${bericht.teilmessung ? ' (Teilmessung, SCAN-Deckel erreicht)' : ''}`
      + ` · Filter \`${bericht.pquery}\` · Sortierung ${SORT}${REVERSE ? ' (neueste zuerst)' : ''}`, '');
    z.push(`Mit Bewertung: **${bewertet}** (${bericht.quote} %)`, '');
    z.push('| Gruppe | Produkte |', '|---|---|');
    for (const [g, n] of Object.entries(gruppen).sort((a, b) => b[1] - a[1])) z.push(`| ${g} | ${n} |`);
    z.push('', `## Verschenkter Sozialbeweis: ${verschenkt.length}`, '');
    z.push('| Grund | Produkte |', '|---|---|');
    for (const [g, n] of Object.entries(gruendeZahl).sort((a, b) => b[1] - a[1])) z.push(`| ${g} | ${n} |`);
    if (bericht.verschenktTop.length) {
      z.push('', '### Die stärksten Fälle', '', '| Produkt | Status | Sterne | Stimmen | Grund |', '|---|---|---|---|---|');
      for (const k of bericht.verschenktTop) {
        z.push(`| \`${k.handle}\` | ${k.status} | ${k.sterne}★ | ${k.stimmen} | ${k.gruende.join(', ') || '—'} |`);
      }
    }
    z.push('', `### Kandidaten ohne Sperr-Tag: ${kandidaten.length}`, '',
      kandidaten.length ? 'Diese könnten sichtbar werden — **Entscheid beim Menschen**, das Skript ändert nichts.'
        : 'Keine. Jeder verschenkte Fall hat einen dokumentierten Grund.', '');
    fs.writeFileSync(BERICHT, z.join('\n'));
    console.error(`Bericht: ${BERICHT}`);
  }
}
main().catch(e => { console.error('Fehler:', e.message); process.exit(1); });
