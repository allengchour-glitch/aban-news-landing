// 301-Weiterleitungen für Entwurfs-Produkte, die in der Search Console Impressionen haben und heute 404 liefern.
// Aufruf: SHOPIFY_SHOP=… node weiterleitungen.mjs            (Trockenlauf, Vorgabe)
//         LIVE=1 node weiterleitungen.mjs                    (legt an, schreibt Ledger.json)
//         ZURUECK=1 LIVE=1 node weiterleitungen.mjs          (löscht NUR die im Ledger stehenden Weiterleitungen)
// Token: Datei /tmp/cj_shop_token.txt (Client-Credentials-Grant, siehe CLAUDE.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HIER = path.dirname(fileURLToPath(import.meta.url));
const LEDGER = path.join(HIER, 'ledger.json');
const shop = process.env.SHOPIFY_SHOP;
const tok = fs.readFileSync(process.env.TOKEN_DATEI || '/tmp/cj_shop_token.txt', 'utf8').trim();
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const gql = async (q, v) => { const r = await (await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': tok }, body: JSON.stringify({ query: q, variables: v }) })).json(); if (r.errors) throw new Error(JSON.stringify(r.errors).slice(0, 300)); return r.data; };

// Pfad → Ziel. Gründe stehen im README (Stand je Produkt aus dem Shop gelesen am 08.11.2026).
export const PLAN = [
  ['/products/polyester-aufbewahrungstasche-634900', '/products/polyester-aufbewahrungstasche-460096', 'CJ entfernt; Geschwisterprodukt aktiv; Google-Suche «gepolsterte tasche» Position 9,7'],
  ['/products/bartpflege-set-600400', '/products/bartpflege-set-mit-mikro-nadel-roller-d5add9', 'CJ nicht versendbar CH; ähnliches Bartpflege-Set aktiv'],
  ['/products/bartburste-540865', '/collections/herren-grooming', 'CJ nicht mehr verfügbar'],
  ['/products/mobelfolie-selbstklebend-mit-holzmaserung-772546', '/collections/wohnen-dekoration', 'CJ nicht versendbar CH'],
  ['/products/schwingerhose-fgahb2887ml', '/collections/ft-herrenkostuem', 'Fortura beim Lieferanten ausverkauft; 3 Klicks in 3 Monaten; bei Wiederkehr Weiterleitung löschen'],
  ['/products/recycelter-unisex-allover-hoodie-selbst-gestalten', '/collections/selbst-gestalten', 'Entwurf seit 05.11. (Druckdatei zu klein); bei Rückkehr Weiterleitung löschen'],
  ['/products/recycelte-allover-jogginghosen-selbst-gestalten', '/collections/selbst-gestalten', 'wie Hoodie'],
  ['/products/unisex-allover-bomberjacke-selbst-gestalten', '/collections/selbst-gestalten', 'wie Hoodie'],
  ['/products/kissen-zum-selbstgestalten', '/collections/selbst-gestalten', 'wie Hoodie'],
  ['/products/kuscheldecke-selbst-gestalten', '/collections/selbst-gestalten', 'wie Hoodie'],
];

const lies = () => (fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : []);
if (ZURUECK) {
  const l = lies(); console.log('Rücknahme:', l.length, 'Einträge', LIVE ? '(LIVE)' : '(Trockenlauf)');
  for (const e of l) { console.log(' ', e.path, '->', e.target); if (LIVE) { const d = await gql(`mutation($id:ID!){ urlRedirectDelete(id:$id){ deletedUrlRedirectId userErrors{message} } }`, { id: e.id }); console.log('   ', JSON.stringify(d.urlRedirectDelete)); } }
  if (LIVE) fs.writeFileSync(LEDGER, '[]\n');
  process.exit(0);
}
const ledger = lies(); let n = 0, fehler = 0;
for (const [pfad, ziel, grund] of PLAN) {
  // Quelle muss ein Produkt sein, das NICHT aktiv ist (sonst würden wir eine lebende Seite umlenken)
  const h = pfad.replace('/products/', '');
  const p = (await gql(`query($h:String!){ productByHandle(handle:$h){ status } }`, { h })).productByHandle;
  if (!p) { console.log('ÜBERSPRUNGEN (kein Produkt mit diesem Handle):', pfad); continue; }
  if (p.status === 'ACTIVE') { console.log('ÜBERSPRUNGEN (Produkt ist ACTIVE, nicht umlenken):', pfad); continue; }
  // Ziel muss existieren (Produkt ACTIVE oder Sammlung)
  const zh = ziel.split('/').pop();
  const zp = ziel.startsWith('/products/') ? (await gql(`query($h:String!){ productByHandle(handle:$h){ status } }`, { h: zh })).productByHandle : (await gql(`query($h:String!){ collectionByHandle(handle:$h){ id } }`, { h: zh })).collectionByHandle;
  if (!zp || zp.status === 'DRAFT' || zp.status === 'ARCHIVED') { console.log('ÜBERSPRUNGEN (Ziel fehlt oder nicht aktiv):', ziel); continue; }
  const vorhanden = (await gql(`query($q:String!){ urlRedirects(first:2, query:$q){ nodes{ id path target } } }`, { q: `path:${pfad}` })).urlRedirects.nodes.find(x => x.path === pfad);
  if (vorhanden) { console.log('BESTEHT SCHON:', pfad, '->', vorhanden.target); continue; }
  console.log((LIVE ? 'LEGE AN ' : 'WÜRDE ANLEGEN ') + pfad + ' -> ' + ziel + '  (' + grund + ')');
  if (!LIVE) continue;
  const r = (await gql(`mutation($r:UrlRedirectInput!){ urlRedirectCreate(urlRedirect:$r){ urlRedirect{ id path target } userErrors{ field message } } }`, { r: { path: pfad, target: ziel } })).urlRedirectCreate;
  if (r.userErrors?.length) { console.log('  FEHLER', JSON.stringify(r.userErrors)); fehler++; continue; }
  ledger.push({ id: r.urlRedirect.id, path: pfad, target: ziel, grund, angelegt: new Date().toISOString() }); n++;
  fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 1) + '\n');
}
console.log(LIVE ? `Angelegt: ${n}, Fehler: ${fehler}` : 'Trockenlauf beendet (nichts geschrieben).');
process.exit(fehler ? 1 : 0);
