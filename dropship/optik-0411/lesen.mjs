// Liest Theme-Dateien des MAIN-Themes in einen Ordner (nur lesend). Aufruf: node dropship/optik-0411/lesen.mjs <Zielordner> <Datei> [<Datei> ...]
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { shopifyGql } from '../../automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '../../automation/lib/shopify_secret.mjs';
const [ziel, ...dateien] = process.argv.slice(2);
const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
const tok = (await r.json()).access_token; if (!tok) { console.error('Kein Token'); process.exit(1); }
const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
console.log('MAIN', th.id, th.name);
const n = (await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:10){nodes{filename size body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f: dateien })).theme.files.nodes;
for (const x of n) { const p = `${ziel}/${x.filename}`; mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, x.body?.content ?? ''); console.log(x.filename, x.size, createHash('md5').update(x.body?.content ?? '').digest('hex')); }
