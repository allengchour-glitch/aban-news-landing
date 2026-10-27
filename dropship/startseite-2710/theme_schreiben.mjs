// node theme_schreiben.mjs <themeNummer> <wurzel> <datei...>   — schreibt NUR in einen Entwurf (Rolle != MAIN)
import { readFileSync } from 'node:fs';
import { shopifyGql } from '/home/user/aban-news-landing/automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '/home/user/aban-news-landing/automation/lib/shopify_secret.mjs';
const [nr, wurzel, ...dateien] = process.argv.slice(2);
const SHOP = process.env.SHOPIFY_SHOP;
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET), grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token;
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const id = `gid://shopify/OnlineStoreTheme/${nr}`;
const t = (await q(`query($id:ID!){ theme(id:$id){ id name role } }`, { id })).theme;
console.log('Theme', t.name, t.role);
if (!t || t.role === 'MAIN') { console.log('ABBRUCH: Live-Theme oder unbekannt'); process.exit(2); }
const files = dateien.map(f => ({ filename: f, body: { type: 'TEXT', value: readFileSync(`${wurzel}/${f}`, 'utf8') } }));
const u = (await q(`mutation($id:ID!,$f:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id, files:$f){ upsertedThemeFiles{ filename } userErrors{ filename code message } } }`, { id, f: files })).themeFilesUpsert;
console.log('geschrieben:', (u.upsertedThemeFiles || []).map(x => x.filename).join(', '));
if (u.userErrors?.length) { console.log('FEHLER', JSON.stringify(u.userErrors)); process.exit(3); }
