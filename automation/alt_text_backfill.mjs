#!/usr/bin/env node
/* alt_text_backfill.mjs — setzt fehlende Bild-Alt-Texte (Bild-SEO + Accessibility) auf Massen-Importe.
 * Alt = "<Produkttitel> – Bild N | LuxeStyle". Nur Bilder OHNE Alt werden angefasst (idempotent).
 * ENV: SHOPIFY_CLIENT_ID/SECRET · [LIMIT=1500 Produkte/Lauf] · [DRY=1]
 * Resumierbar via Cursor-Datei dropship/_alt_backfill_cursor.txt.
 *
 * ⚠️ DIESER LAUF ERREICHT NEUE PRODUKTE NIE (erkannt 20.08.2026). Er sortiert CREATED_AT
 * ABSTEIGEND und hält einen Cursor fest. Neu angelegte Ware entsteht aber genau VORNE in
 * dieser Sortierung — also hinter dem Cursor, der dort längst vorbeigelaufen ist. Ein
 * Neuestes-zuerst-Sweep mit Cursor ist damit blind für alles, was nach seinem Start
 * entsteht. Am 18.08. um 23:41 hat er ausserdem «FERTIG: Katalog-Ende erreicht» ins Log
 * geschrieben; `fixer_keepalive.sh` überspringt jeden Node-Lauf, dessen Log mit ^FERTIG
 * beginnt — dauerhaft. Beides zusammen hiess: ab dem 18.08. füllte niemand mehr Alt-Texte,
 * obwohl der CJ-Grind täglich ~2'000 Produkte nachlegte. Ergebnis waren 5'739 aktive
 * Produkte mit je EINEM Alt-Text statt sechs bis acht.
 * Für den historischen Katalog ist dieser Lauf richtig und tatsächlich durch. Die laufende
 * Abdeckung NEUER Ware macht `automation/alt_texte_nachziehen.py` (Zeitfenster gegen LIVE,
 * täglich im Aufseher) — und seit dem 20.08. setzt `cj_category_fill.mjs` die Alt-Texte
 * schon beim Anlegen, für ALLE Bilder und erst, nachdem das Hauptbild feststeht.
 * Wer hier das ^FERTIG aus /tmp/alt_text_backfill.log löscht, startet einen vollen
 * 41'000-Produkte-Sweep neu — das ist nur nach einer REGEL-Änderung sinnvoll (neues Schema,
 * neue Felder), denn dann ist das alte Erledigt-Zeichen ohnehin wertlos.
 */
import fs from 'node:fs';
const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const LIMIT = parseInt(process.env.LIMIT || '1500', 10);
const DRY = process.env.DRY === '1';
const CURSOR_F = 'dropship/_alt_backfill_cursor.txt';
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function shTok() {
  // Fallback (16.08.2026): Die Session hat keine Client-Secrets im Env — die Runner pflegen
  // aber ein frisches Admin-Token in /tmp/cj_shop_token.txt. Damit läuft der Backfill autonom.
  if (!CID || !CSEC) {
    try { const t = fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8').trim(); if (t) return t; } catch {}
  }
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST',
    headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) });
  return (await r.json()).access_token;
}
async function gql(t, query, variables) {
  for (let a = 0; a < 5; a++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
      body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(45000) });
    const j = await r.json().catch(() => ({}));
    if (j.errors && JSON.stringify(j.errors).includes('THROTTLED')) { await sleep(3500); continue; }
    return j.data;
  }
  return null;
}

const t = await shTok();
if (!t) { console.error('Kein Token.'); process.exit(1); }
let cursor = fs.existsSync(CURSOR_F) ? fs.readFileSync(CURSOR_F, 'utf8').trim() || null : null;
let prods = 0, imgs = 0;

while (prods < LIMIT) {
  const d = await gql(t, `query($c:String){ products(first:40,query:"status:active",sortKey:CREATED_AT,reverse:true,after:$c){
    pageInfo{hasNextPage endCursor}
    edges{node{id title media(first:20){edges{node{... on MediaImage{id alt}}}}}} }}`, { c: cursor });
  const page = d?.products; if (!page) break;
  for (const e of page.edges) {
    if (prods >= LIMIT) break;
    const n = e.node; prods++;
    const missing = n.media.edges.map(m => m.node).filter(m => m.id && !(m.alt || '').trim());
    if (!missing.length) continue;
    const files = missing.slice(0, 12).map((m, i) => ({ id: m.id, alt: `${n.title.slice(0, 90)} – Bild ${i + 1} | LuxeStyle` }));
    if (DRY) { console.log(`[DRY] ${files.length} Alts für ${n.title.slice(0, 40)}`); imgs += files.length; continue; }
    const r = await gql(t, `mutation($files:[FileUpdateInput!]!){ fileUpdate(files:$files){ userErrors{message} } }`, { files });
    const errs = r?.fileUpdate?.userErrors || [];
    if (errs.length) { console.log('✗', n.title.slice(0, 30), JSON.stringify(errs).slice(0, 60)); continue; }
    imgs += files.length;
    if (prods % 100 === 0) console.log(`Fortschritt: ${prods} Produkte, ${imgs} Alt-Texte gesetzt`);
    await sleep(400);
  }
  cursor = page.pageInfo.endCursor;
  fs.writeFileSync(CURSOR_F, cursor || '');
  if (!page.pageInfo.hasNextPage) {
    fs.writeFileSync(CURSOR_F, '');
    // Nur HIER ist wirklich Schluss — der Aufseher stoppt bei ^FERTIG dauerhaft.
    console.log(`FERTIG: Katalog-Ende erreicht (${prods} Produkte, ${imgs} Alt-Texte in diesem Lauf).`);
    process.exit(0);
  }
}
// Batch fertig, Katalog noch nicht: PAUSE, damit der Aufseher den nächsten Batch startet.
console.log(`PAUSE (Cursor gespeichert): ${prods} Produkte geprüft, ${imgs} Alt-Texte gesetzt — nächster Batch folgt.`);
