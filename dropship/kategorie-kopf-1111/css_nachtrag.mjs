// Zwei kleine Funde der Live-Nachmessung 15.11. (Urteil «mit Änderungen», beide «klein»):
// (a) Handy: Pfadzeile ist eine waagrecht scrollende Leiste ohne Hinweis, Versandtext mitten im Wort abgeschnitten -> rechts ausblenden (mask-image).
// (b) Handy: Zwischentitel in «Mehr anzeigen» (h2 36 px) grösser als der Seitentitel (h1 23 px) -> h2 1.2rem, h3 1.05rem.
// Je eine CSS-Zeile vor dem letzten </style> des Snippets. Trockenlauf Vorgabe · LIVE=1 schreibt (Sicherung, Rücklesen) · ZURUECK=1 LIVE=1 entfernt genau diese Zeilen.
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { shopifyGql } from '/home/user/aban-news-landing/automation/lib/shopify_gql.mjs';
import { shopifyClientSecret } from '/home/user/aban-news-landing/automation/lib/shopify_secret.mjs';
const W = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const md5 = s => createHash('md5').update(s).digest('hex');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
export const ZEILEN = {
  'snippets/lx-kopf-pfad.liquid': { basis: '430438e294e929cf1491455059e483a8', zeile: '/* lx-1511a */@media(max-width:749px){.lx-kp{-webkit-mask-image:linear-gradient(90deg,#000 86%,transparent);mask-image:linear-gradient(90deg,#000 86%,transparent)}}\n' },
  'snippets/lx-kopf-kompakt.liquid': { basis: '3b125c208666004d1236f51fdf711b7d', zeile: '/* lx-1511b */@media(max-width:749px){.lx-kk__rest h2{font-size:1.2rem!important;line-height:1.3!important}.lx-kk__rest h3{font-size:1.05rem!important;line-height:1.3!important}}\n' },
};
export function einfuegen(t, z) { const i = t.lastIndexOf('</style>'); if (i < 0) throw new Error('kein </style>'); if (t.includes(z)) throw new Error('Zeile schon drin'); return t.slice(0, i) + z + t.slice(i); }
export function entfernen(t, z) { if (t.split(z).length !== 2) throw new Error('Zeile nicht genau einmal da'); return t.replace(z, ''); }
if (process.argv[1] && process.argv[1].endsWith('css_nachtrag.mjs')) {
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const tok = (await (await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) })).json()).access_token;
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const th = (await q(`{themes(first:5,roles:[MAIN]){nodes{id name}}}`)).themes.nodes[0];
  console.log('MAIN', th.id, th.name);
  const F = Object.keys(ZEILEN);
  const lesen = async () => Object.fromEntries((await q(`query($id:ID!,$f:[String!]!){theme(id:$id){files(filenames:$f,first:5){nodes{filename body{... on OnlineStoreThemeFileBodyText{content}}}}}}`, { id: th.id, f: F })).theme.files.nodes.map(n => [n.filename, n.body?.content ?? null]));
  const ist = await lesen(); const soll = {};
  for (const f of F) {
    if (ist[f] == null) { console.error('ABBRUCH: fehlt', f); process.exit(2); }
    if (ZURUECK) soll[f] = entfernen(ist[f], ZEILEN[f].zeile);
    else { if (md5(ist[f]) !== ZEILEN[f].basis) { console.error('ABBRUCH:', f, 'md5', md5(ist[f]), 'statt', ZEILEN[f].basis); process.exit(5); } soll[f] = einfuegen(ist[f], ZEILEN[f].zeile); }
    console.log(f, ist[f].length, '->', soll[f].length, 'Zeichen, neue md5', md5(soll[f]));
  }
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben'); process.exit(0); }
  const ts = new Date().toISOString().replace(/[:.]/g, '-'); mkdirSync(W + '/sicherung', { recursive: true });
  for (const f of F) writeFileSync(`${W}/sicherung/${f.split('/').pop()}.css1511-vor-${ts}`, ist[f]);
  const r = await q(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){themeFilesUpsert(themeId:$id,files:$files){upsertedThemeFiles{filename} userErrors{filename message}}}`, { id: th.id, files: F.map(f => ({ filename: f, body: { type: 'TEXT', value: soll[f] } })) });
  if (r.themeFilesUpsert.userErrors.length) { console.error('FEHLER', JSON.stringify(r.themeFilesUpsert.userErrors)); process.exit(6); }
  for (let i = 0; i < 8; i++) { await new Promise(z => setTimeout(z, i ? 8000 : 3000)); const n = await lesen(); if (F.every(f => n[f] === soll[f])) { console.log(new Date().toISOString(), 'Ruecklesen GLEICH', F.join(', ')); process.exit(0); } console.log('Ruecklesen', i + 1, 'noch nicht gleich'); }
  process.exit(7);
}
