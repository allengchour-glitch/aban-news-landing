#!/usr/bin/env node
/* LuxeStyle — fix_homepage_dedup.mjs  (Startseite: doppelte Bestseller-Sektion ersetzen)
 *
 * Die Startseite hatte 2 fast identische Bestseller-Sektionen (⭐ Top 10 Bestseller + 🔥 Bestseller).
 * Dieses Skript liest templates/index.json des MAIN-Themes LIVE, ersetzt programmatisch die 4. Produkt-
 * Liste (Header „🔥 Bestseller" → „🎁 Geschenkideen", Collection bestseller-shop → premium-geschenke) und
 * schreibt sie per themeFilesUpsert zurück. Idempotent (no-op, wenn schon ersetzt). No-op ohne Creds. DRY_RUN=1.
 *
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · SHOPIFY_SHOP · [DRY_RUN=1]
 */
const ADMIN_TOKEN = (process.env.SHOPIFY_ADMIN_TOKEN || '').trim();
const CID = (process.env.SHOPIFY_CLIENT_ID || '').trim();
const CSEC = (process.env.SHOPIFY_CLIENT_SECRET || '').trim();
const DRY = process.env.DRY_RUN === '1';
let SHOP = (process.env.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
if (!/myshopify\.com$/.test(SHOP)) SHOP = 'au3j0y-hq.myshopify.com';
const API = '2025-01';

if (!ADMIN_TOKEN && !(CID && CSEC)) { console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

async function gql(tok, q, v) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) });
  return r.json();
}
async function works(t) { try { const r = await gql(t, '{shop{name}}'); return !!r?.data?.shop?.name; } catch { return false; } }
async function cc() { const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: CID, client_secret: CSEC, grant_type: 'client_credentials' }) }); const j = await r.json().catch(() => ({})); return j.access_token || null; }
async function token() { if (ADMIN_TOKEN && await works(ADMIN_TOKEN)) return ADMIN_TOKEN; if (CID && CSEC) { const t = await cc(); if (t && await works(t)) return t; } return null; }

const Q_THEME = `{ themes(first:5, roles:[MAIN]){ nodes{ id name } } }`;
const Q_FILE = `query($id:ID!){ theme(id:$id){ files(first:1, filenames:["templates/index.json"]){ nodes{ filename body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }`;
const M_UPSERT = `mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id, files:$files){ upsertedThemeFiles{ filename } userErrors{ field message } } }`;

const tok = await token();
if (!tok) { console.error('❌ Auth fehlgeschlagen'); process.exit(0); }

const themeId = (await gql(tok, Q_THEME))?.data?.themes?.nodes?.[0]?.id;
if (!themeId) { console.error('❌ Kein MAIN-Theme'); process.exit(1); }
console.log('MAIN-Theme:', themeId);

let content = (await gql(tok, Q_FILE, { id: themeId }))?.data?.theme?.files?.nodes?.[0]?.body?.content;
if (!content) { console.error('❌ index.json nicht lesbar'); process.exit(1); }

// Idempotente Ersetzungen (jede greift nur, wenn der „von"-String noch vorhanden ist):
const REPL = [
  ['<h3>🔥 Bestseller</h3>', '<h3>🎁 Geschenkideen</h3>'],        // doppelte Bestseller-Sektion → Geschenkideen
  ['"collection": "bestseller-shop"', '"collection": "premium-geschenke"'],
  ['"name": "✨ CJ Neuheiten 2026"', '"name": "✨ Neuheiten 2026"'], // letzter interner „CJ"-Rest (Editor-Label)
];
let changed = 0;
for (const [from, to] of REPL) { if (content.includes(from)) { content = content.split(from).join(to); changed++; } }
if (changed === 0) { console.log('= Nichts zu ersetzen → No-op.'); process.exit(0); }
console.log(`Ersetzungen: ${changed}/${REPL.length}`);

// Sicherheit: muss valides JSON bleiben (Kommentar-Header oben abtrennen)
try { JSON.parse(content.replace(/^\/\*[\s\S]*?\*\/\s*/, '')); } catch (e) { console.error('❌ Ergebnis kein valides JSON → Abbruch:', e.message); process.exit(1); }

if (DRY) { console.log('[DRY] würde index.json schreiben.'); process.exit(0); }
const up = await gql(tok, M_UPSERT, { id: themeId, files: [{ filename: 'templates/index.json', body: { type: 'TEXT', value: content } }] });
const errs = up?.data?.themeFilesUpsert?.userErrors || [];
if (errs.length) { console.error('❌ Upsert-Fehler:', JSON.stringify(errs)); process.exit(1); }
console.log('✅ Startseite aktualisiert:', JSON.stringify(up?.data?.themeFilesUpsert?.upsertedThemeFiles || []));
