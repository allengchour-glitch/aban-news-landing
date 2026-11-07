// Audit 07.11.2026: Produkt-Handles mit Emoji/®/Sonderzeichen auf reines ASCII bringen; die alte Adresse leitet per 301 um (redirectNewHandle).
// Trockenlauf Vorgabe; LIVE=1 schreibt (ONLY=<n> begrenzt auf die ersten n); ZURUECK=1 LIVE=1 stellt die alten Handles wieder her (Karte handles_vor.json).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const HIER = dirname(fileURLToPath(import.meta.url));
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const TOKEN_DATEI = process.env.TOKEN_DATEI || '/tmp/cj_shop_token.txt';
const KATALOG = process.env.KATALOG;
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const KARTE = join(HIER, 'handles_vor.json');

export const ASCII_RE = /^[a-z0-9-]+$/;
export function sauber(handle) {
  return handle.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}
export function plan(produkte) {
  const belegt = new Set(produkte.map(p => p.handle));
  const neue = new Set();
  const liste = [];
  for (const p of produkte) {
    if (ASCII_RE.test(p.handle)) continue;
    let neu = sauber(p.handle), n = 2;
    if (!neu) { liste.push({ id: p.id, alt: p.handle, neu: null, grund: 'leer' }); continue; }
    while ((belegt.has(neu) && neu !== p.handle) || neue.has(neu)) neu = `${sauber(p.handle)}-${n++}`;
    neue.add(neu);
    liste.push({ id: p.id, alt: p.handle, neu, titel: p.title });
  }
  return liste;
}
async function gql(q, v) {
  const tok = readFileSync(TOKEN_DATEI, 'utf8').trim();
  const r = await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, variables: v || {} }) });
  const j = await r.json(); if (j.errors) throw new Error(JSON.stringify(j.errors)); return j.data;
}
const M = 'mutation($i:ProductInput!){productUpdate(input:$i){product{id handle} userErrors{field message}}}';

if (import.meta.url === `file://${process.argv[1]}`) {
  let arbeit;
  if (ZURUECK) arbeit = JSON.parse(readFileSync(KARTE, 'utf8')).map(e => ({ id: e.id, alt: e.neu, neu: e.alt }));
  else {
    if (!KATALOG) throw new Error('KATALOG=<katalog.json> setzen');
    // ®-Handles (zwei iPhone-Hüllen) bleiben: Editor-Daten und Werkzeuge adressieren sie nach Handle (MIT_MARKEN=1 hebt das auf)
    arbeit = plan(JSON.parse(readFileSync(KATALOG, 'utf8')).produkte).filter(e => process.env.MIT_MARKEN === '1' || !e.alt.includes('®'));
  }
  console.log(arbeit.length, 'Produkte', LIVE ? '[LIVE]' : '[Trockenlauf]', ZURUECK ? '[ZURUECK]' : '');
  for (const e of arbeit) console.log(' ', e.alt, '→', e.neu ?? '(leer, übersprungen)');
  if (!LIVE) process.exit(0);
  if (!ZURUECK) writeFileSync(KARTE, JSON.stringify(arbeit.filter(e => e.neu), null, 1));
  const n = Number(process.env.ONLY || arbeit.length);
  let fehler = 0;
  for (const e of arbeit.filter(e => e.neu).slice(0, n)) {
    const d = await gql(M, { i: { id: e.id, handle: e.neu, redirectNewHandle: true } });
    const u = d.productUpdate.userErrors;
    if (u.length) { fehler++; console.log('FEHLER', e.alt, JSON.stringify(u)); continue; }
    const g = d.productUpdate.product.handle;
    console.log(g === e.neu ? 'OK    ' : 'ANDERS', e.alt, '→', g);
    if (g !== e.neu) fehler++;
    await new Promise(r => setTimeout(r, 400));
  }
  process.exit(fehler ? 2 : 0);
}
